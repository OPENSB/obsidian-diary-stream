const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = readFileSync(join(__dirname, '..', 'main.js'), 'utf8');
const context = vm.createContext({
  module: { exports: {} },
  require: () => ({ ItemView: class {}, Plugin: class {}, PluginSettingTab: class {} })
});
vm.runInContext(
  source + '\nthis.api = { resolveInlineImages, extractCardImages, PALETTES, DEFAULT_SETTINGS, Composer, DiaryStreamView, parseDay, planAppend, entryTime };',
  context
);
const { resolveInlineImages, extractCardImages, PALETTES, DEFAULT_SETTINGS, Composer, DiaryStreamView, parseDay, planAppend, entryTime } = context.api;

test('resolveInlineImages places inline images between paragraphs and appends voice notes at end', () => {
  const body = '第一段文字\n\n[[DS_IMG:img_2]]\n\n第二段文字\n\n[[DS_IMG:img_3]]\n\n第三段文字';
  const atts = [
    { kind: 'img', id: 'img_2', inline: true, ext: 'jpg' },
    { kind: 'img', id: 'img_3', inline: true, ext: 'png' },
    { kind: 'voice', ext: 'm4a' }
  ];
  const paths = ['附件/IMG_1.jpg', '附件/IMG_2.png', '附件/录音_1.m4a'];
  const out = resolveInlineImages(body, atts, (_a, i) => paths[i]);
  assert.equal(
    out,
    '第一段文字\n\n![[附件/IMG_1.jpg]]\n\n第二段文字\n\n![[附件/IMG_2.png]]\n\n第三段文字\n![[附件/录音_1.m4a]]'
  );
});

test('Composer inline block serialization and normalization merge text cleanly on removal', () => {
  const c = Object.create(Composer.prototype);
  Object.assign(c, {
    mode: 'new',
    blocks: [
      { id: 'b0', type: 'text', text: '上一段' },
      { id: 'bi1', type: 'img', attId: 'img_1' },
      { id: 'b2', type: 'text', text: '下一段' }
    ],
    atts: [{ kind: 'img', id: 'img_1', inline: true, ext: 'jpg', url: 'blob:1' }],
    tags: ['散步'],
    sub: '',
    when: null,
    buji: false,
    nextBlockUid: 5,
    activeBlockId: 'b2',
    activeCaret: 0,
    ta: { value: '上一段' },
    q: () => null
  });
  const st = c.state();
  assert.equal(st.body, '上一段\n\n[[DS_IMG:img_1]]\n\n下一段');

  // Remove the inline image and verify blocks merge cleanly
  c.blocks = c.blocks.filter((b) => b.type !== 'img');
  c.normalizeBlocks();
  assert.equal(c.blocks.length, 1);
  assert.equal(c.blocks[0].text, '上一段\n\n下一段');
});

test('Composer backdate (buji) toggle marks entry so core parseDay detects buji without duplicating prefix', () => {
  const mk = (sub, buji) => {
    const c = Object.create(Composer.prototype);
    Object.assign(c, { mode: 'new', blocks: [{ id: 'b0', type: 'text', text: '补记内容' }], atts: [], tags: [], sub, when: new Date(2026, 10, 21, 21, 30), buji, ta: { value: '补记内容' }, q: () => null });
    return c.state();
  };
  const s1 = mk('', true);
  assert.equal(s1.sub, '补记');
  const s2 = mk('昨天散步', true);
  assert.equal(s2.sub, '补记 · 昨天散步');
  const s3 = mk('补记昨天', true);
  assert.equal(s3.sub, '补记昨天');

  const md = planAppend(null, '2026-11-21', { ...entryTime(s2.when, 4), sub: s2.sub, body: s2.body, tags: [] }, 'memos', 4);
  const parsed = parseDay('日记/2026-11-21.md', md, 4);
  assert.equal(parsed.sections[0].buji, true);
});

test('extractCardImages collects resolved figure images in exact order for collapsed strip', () => {
  const html = '<p>段落1</p><figure class="ds-img"><img loading="lazy" decoding="async" alt="a.jpg" src="app://local/a.jpg" data-path="附件/a.jpg"></figure><p>段落2</p><figure class="ds-img"><img loading="lazy" decoding="async" alt="b.png" src="app://local/b.png" data-path="附件/b.png"></figure>';
  const imgs = extractCardImages(html);
  assert.deepEqual(JSON.parse(JSON.stringify(imgs)), [
    { url: 'app://local/a.jpg', path: '附件/a.jpg' },
    { url: 'app://local/b.png', path: '附件/b.png' }
  ]);
});

test('palette settings include all 6 options and applyPalette swaps classes cleanly', () => {
  assert.equal(DEFAULT_SETTINGS.palette, 'auto');
  assert.equal(PALETTES.length, 6);
  const classes = new Set();
  const view = Object.create(DiaryStreamView.prototype);
  view.plugin = { data: { settings: { palette: 'coral' } } };
  view.root = { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } };
  view.applyPalette();
  assert.ok(classes.has('ds-pal-coral'));
  view.plugin.data.settings.palette = 'blue';
  view.applyPalette();
  assert.ok(classes.has('ds-pal-blue'));
  assert.ok(!classes.has('ds-pal-coral'));
});

test('search outside click does not break on new mobile sheet controls', () => {
  const view = new DiaryStreamView(null, {});
  view.root = {
    querySelector: (sel) => ({ contains: (t) => t.scope === sel }),
    ownerDocument: { defaultView: { clearTimeout() {}, setTimeout() { return 1; } } }
  };
  for (const scope of ['.ds-filter-trigger', '.ds-filter-sheet', '.ds-write-sheet', '.ds-fab']) {
    assert.equal(view.isSearchInteraction({ scope }), true, scope);
  }
});

test('icons() renders icons even when sibling sr-only text exists and no button combines data-icon with sr-only', () => {
  assert.doesNotMatch(
    source,
    /<button[^>]*data-icon="[^"]+"[^>]*><span class="ds-sr-only">/,
    'data-icon should live on an inner span rather than a button with sr-only child'
  );
  const rendered = [];
  const ctx2 = vm.createContext({
    module: { exports: {} },
    require: () => ({
      ItemView: class {},
      Plugin: class {},
      PluginSettingTab: class {},
      setIcon: (el, name) => rendered.push(name)
    })
  });
  vm.runInContext(source + '\nthis.View = DiaryStreamView;', ctx2);
  const view = Object.create(ctx2.View.prototype);
  const fakeEl = {
    querySelectorAll: () => [
      { dataset: { icon: 'more-horizontal' }, firstChild: { tagName: 'SPAN' }, querySelector: () => null, classList: { contains: () => false } },
      { dataset: { icon: 'x' }, firstChild: null, querySelector: () => ({ tagName: 'svg' }), classList: { contains: () => false } }
    ]
  };
  view.icons(fakeEl);
  assert.deepEqual(rendered, ['more-horizontal']);
});

test('CSS avoids zero-specificity button reset, wrap transform trap, clip-path morph, and mobile to-top button', () => {
  const css = readFileSync(join(__dirname, '..', 'styles.css'), 'utf8');
  assert.ok(!css.includes(':where(.ds-root button)'), 'must not use zero-specificity :where() for button reset');
  assert.ok(!css.includes('.ds-root.is-narrow.has-sheet .ds-wrap'), 'must not transform .ds-wrap and break fixed sheets');
  assert.ok(!css.includes('clip-path: inset(var(--ox-t)'), 'must not use clip-path morph on write sheet');
  assert.match(css, /\.is-mobile\s+\.ds-leaf\s+\.ds-totop[\s\S]*display:\s*none\s*!important/);
  assert.match(css, /\.ds-scope\.ds-root\s+\.ds-menu\s+button/);
});

test('handleBackAction and overlay Scope dismiss overlays in strict priority order', () => {
  const pushed = [], popped = [];
  class MockScope {
    constructor(parent) { this.parent = parent; this.handlers = []; }
    register(mods, key, cb) { this.handlers.push({ mods, key, cb }); }
  }
  const ctx2 = vm.createContext({
    module: { exports: {} },
    require: () => ({ ItemView: class {}, Plugin: class {}, PluginSettingTab: class {}, Scope: MockScope })
  });
  vm.runInContext(source + '\nthis.View = DiaryStreamView;', ctx2);
  const view = new ctx2.View(null, {});
  const closed = [];
  view.app = { scope: {}, keymap: { pushScope: (s) => pushed.push(s), popScope: (s) => popped.push(s) } };
  view.lightbox = { isOpen: true, close() { this.isOpen = false; closed.push('lightbox'); } };
  view.S.confirm = 'a#0';
  view.S.menu = 'a#0';
  view.S.sheet = 'write';
  view.S.searchOpen = true;
  view.composer = { dismissed: false, dismissTools() { if (this.dismissed) return false; this.dismissed = true; closed.push('tools'); return true; } };
  view.renderConfirm = () => closed.push('renderConfirm');
  view.renderStream = () => closed.push('renderStream');
  view.setSheet = (v) => { view.S.sheet = v; closed.push('sheet:' + v); };
  view.toggleSearch = (v) => { view.S.searchOpen = v; closed.push('search:' + v); };

  view.syncOverlayScope();
  assert.equal(pushed.length, 1);
  // Trigger Escape through the registered Scope handler
  assert.equal(pushed[0].handlers[0].cb(), false); // closes lightbox
  assert.equal(view.handleBackAction(), true); // closes confirm
  assert.equal(view.handleBackAction(), true); // closes menu
  assert.equal(view.handleBackAction(), true); // dismisses composer tools
  assert.equal(view.handleBackAction(), true); // closes write sheet
  assert.equal(view.handleBackAction(), true); // closes mobile search
  assert.equal(view.handleBackAction(), false); // nothing left -> hand back to Obsidian
  view.syncOverlayScope();
  assert.equal(popped.length, 1);
  assert.deepEqual(closed, ['lightbox', 'renderConfirm', 'renderStream', 'tools', 'sheet:null', 'search:false']);
});

test('syncViewport detects keyboard shrink and clears mobile navbar offset', () => {
  const props = {};
  const classes = new Set();
  const makeHost = () => ({
    style: { setProperty: (k, v) => { props[k] = v; } },
    classList: {
      toggle: (k, on) => on ? classes.add(k) : classes.delete(k),
      contains: (k) => classes.has(k)
    }
  });
  const view = new DiaryStreamView(null, {});
  let vvHeight = 840;
  const doc = {
    body: { classList: { contains: (c) => c === 'is-mobile' } },
    querySelector: (sel) => sel === '.mobile-navbar' ? { getBoundingClientRect: () => ({ top: 766, height: 54 }) } : null,
    defaultView: {
      innerWidth: 390,
      innerHeight: 840,
      visualViewport: { get height() { return vvHeight; } },
      getComputedStyle: () => ({ paddingBottom: '0px' })
    }
  };
  view.root = Object.assign(makeHost(), { ownerDocument: doc });

  // Keyboard closed: navbar clearance is calculated
  view.syncViewport();
  assert.equal(props['--ds-vvh'], '840px');
  assert.equal(props['--ds-nav-bottom'], '78px');
  assert.equal(classes.has('is-kb-open'), false);

  // Keyboard opens: visualViewport shrinks to 500px
  vvHeight = 500;
  view.syncViewport();
  assert.equal(props['--ds-vvh'], '500px');
  assert.equal(props['--ds-nav-bottom'], '0px');
  assert.equal(classes.has('is-kb-open'), true);
});

test('DiarySheetModal hosts sheet in Obsidian Modal and restores DOM + clears state on close', () => {
  const mkEl = (tag) => {
    const cls = new Set();
    const listeners = {};
    const el = {
      tag,
      children: [],
      parentNode: null,
      style: { setProperty() {}, transform: '' },
      classList: {
        add: (...cs) => cs.forEach((c) => cls.add(c)),
        remove: (...cs) => cs.forEach((c) => cls.delete(c)),
        toggle: (c, on) => on === undefined ? (cls.has(c) ? cls.delete(c) : cls.add(c)) : (on ? cls.add(c) : cls.delete(c)),
        contains: (c) => cls.has(c)
      },
      appendChild(child) {
        if (child.parentNode) child.parentNode.children = child.parentNode.children.filter((x) => x !== child);
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      insertBefore(node, ref) {
        if (node.parentNode) node.parentNode.children = node.parentNode.children.filter((x) => x !== node);
        node.parentNode = this;
        const idx = this.children.indexOf(ref);
        if (idx >= 0) this.children.splice(idx, 0, node);
        else this.children.push(node);
        return node;
      },
      remove() {
        if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this);
        this.parentNode = null;
      },
      addEventListener(ev, fn) { listeners[ev] = fn; },
      removeEventListener(ev) { delete listeners[ev]; },
      querySelector() { return null; },
      contains() { return false; },
      ownerDocument: null
    };
    return el;
  };
  const doc = {
    createComment: (t) => mkEl('#comment:' + t),
    activeElement: null,
    defaultView: { requestAnimationFrame: (fn) => fn(), setTimeout: () => 1, clearTimeout() {} }
  };
  let lastModal = null;
  class MockModal {
    constructor(app) {
      this.app = app;
      this.containerEl = mkEl('modal-container');
      this.modalEl = mkEl('modal');
      this.contentEl = mkEl('modal-content');
      this.containerEl.ownerDocument = this.modalEl.ownerDocument = this.contentEl.ownerDocument = doc;
      this.scope = { handlers: [], register(m, k, cb) { this.handlers.push({ m, k, cb }); } };
      lastModal = this;
    }
    open() { this.onOpen(); }
    close() { this.onClose(); }
  }
  const ctx2 = vm.createContext({
    module: { exports: {} },
    require: () => ({ ItemView: class {}, Plugin: class {}, PluginSettingTab: class {}, Modal: MockModal })
  });
  vm.runInContext(source + '\nthis.View = DiaryStreamView;', ctx2);
  const view = new ctx2.View(null, { data: { settings: { palette: 'coral' } } });
  view.app = { scope: {}, keymap: { pushScope() {}, popScope() {} } };
  const root = mkEl('root');
  root.ownerDocument = doc;
  root.toggleClass = (c, on) => root.classList.toggle(c, on);
  root.classList.add('is-narrow');
  const wrap = mkEl('wrap');
  wrap.ownerDocument = doc;
  const side = mkEl('aside');
  side.ownerDocument = doc;
  const fab = mkEl('fab');
  fab.ownerDocument = doc;
  wrap.appendChild(side);
  root.appendChild(wrap);
  root.appendChild(fab);
  root.querySelector = (sel) => sel === '.ds-side' ? (wrap.children.includes(side) ? side : null) : sel === '.ds-fab' ? fab : null;
  view.root = root;
  view.syncViewport = () => {};
  view.renderHeat = () => {};

  // Open calendar sheet -> moves .ds-side into Modal, hides FAB, registers Escape
  view.setSheet('cal');
  assert.equal(view.S.sheet, 'cal');
  assert.equal(side.parentNode, lastModal.contentEl);
  assert.ok(lastModal.containerEl.classList.contains('ds-sheet-modal-wrap'));
  assert.ok(lastModal.containerEl.classList.contains('ds-pal-coral'));
  assert.ok(side.classList.contains('is-open'));
  assert.ok(fab.classList.contains('is-hidden'));
  assert.equal(lastModal.scope.handlers.length, 1);

  // Trigger Escape (Android back / Esc) -> closes modal, restores .ds-side back into .ds-wrap, unhides FAB
  assert.equal(lastModal.scope.handlers[0].cb(), false);
  assert.equal(view.S.sheet, null);
  assert.equal(side.parentNode, wrap);
  assert.ok(!side.classList.contains('is-open'));
  assert.ok(!fab.classList.contains('is-hidden'));
});
