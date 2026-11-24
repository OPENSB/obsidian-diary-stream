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
  source + '\nthis.api = { resolveInlineImages, extractCardImages, sectionCopyText, countDiaryChars, PALETTES, DEFAULT_SETTINGS, Composer, DiaryStreamView, parseDay, planAppend, entryTime };',
  context
);
const { resolveInlineImages, extractCardImages, sectionCopyText, countDiaryChars, PALETTES, DEFAULT_SETTINGS, Composer, DiaryStreamView, parseDay, planAppend, entryTime } = context.api;

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
  assert.match(css, /body\s+\.modal-container\.ds-sheet-modal-wrap\s+\.modal-close-button/);
  assert.match(css, /\.modal-container\.ds-sheet-modal-wrap\.is-write-modal[\s\S]*align-items:\s*flex-start/);
  assert.match(css, /\.is-mobile\s+\.modal-container\.ds-sheet-modal-wrap\.is-write-modal[\s\S]*inset:\s*0\s*!important/);
  assert.match(css, /\.ds-kb-probe[\s\S]*padding-top:\s*var\(--keyboard-height/);
  assert.match(css, /\.is-mobile\s+\.modal-container\.ds-sheet-modal-wrap\.is-write-modal\s+\.ds-write-sheet[\s\S]*padding-bottom:\s*var\(--ds-write-kb-inset/);
  assert.match(css, /\.is-mobile\s+\.modal-container\.ds-sheet-modal-wrap\.is-write-modal\s+\.ds-blocks[\s\S]*flex:\s*1\s+1\s+auto[\s\S]*max-height:\s*none/);
  assert.ok(!css.includes('calc(50dvh - 110px)'), 'mobile write blocks must not be capped at 50dvh');
  assert.match(css, /\.ds-root:not\(\.is-search-open\)\s+\.ds-entry\s*\{\s*display:\s*none/);
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
  assert.equal(props['--ds-write-kb-inset'], '340px');
  assert.equal(classes.has('is-kb-open'), true);
});

test('syncViewport follows Obsidian Android edge-to-edge --safe-area-inset-bottom, leaf shrink, and avoids adjustResize double-counting', () => {
  const mkHost = (extraClasses = [], rectFn = () => ({ top: 0, bottom: 891, height: 891 })) => {
    const props = {};
    const cls = new Set(extraClasses);
    return {
      props,
      cls,
      style: { setProperty: (k, v) => { props[k] = v; } },
      classList: {
        toggle: (k, on) => on ? cls.add(k) : cls.delete(k),
        contains: (k) => cls.has(k)
      },
      getBoundingClientRect: rectFn
    };
  };

  let winH = 891;
  let vvH = 891;
  let modalH = 891;
  let leafRect = { top: 88, bottom: 891, height: 803 };
  let probeStyle = { paddingTop: '0px', paddingRight: '14.86px', paddingBottom: '0px', paddingLeft: '14.86px' };
  const probeEl = { tag: 'probe' };
  const doc = {
    body: { classList: { contains: (c) => c === 'is-mobile' } },
    documentElement: {},
    querySelector: (sel) => sel === '.mobile-navbar' ? { getBoundingClientRect: () => ({ top: 820, height: 56 }) } : null,
    defaultView: {
      innerWidth: 412,
      get innerHeight() { return winH; },
      visualViewport: { offsetTop: 0, get height() { return vvH; } },
      getComputedStyle: (el) => el === probeEl ? probeStyle : { paddingBottom: '0px', getPropertyValue: () => '' }
    }
  };

  const view = new DiaryStreamView(null, {});
  const root = mkHost();
  root.ownerDocument = doc;
  root.querySelector = (sel) => sel === '.ds-kb-probe' ? probeEl : null;
  const modalHost = mkHost(['ds-sheet-modal-wrap', 'is-write-modal'], () => ({ top: 0, bottom: modalH, height: modalH }));
  view.root = root;
  view.sheetModal = { containerEl: modalHost };
  view.containerEl = { closest: () => ({ getBoundingClientRect: () => leafRect }) };

  // 1. Keyboard closed: clears gesture bar only
  view.syncViewport();
  assert.equal(modalHost.props['--ds-write-kb-inset'], '15px');
  assert.equal(modalHost.cls.has('is-kb-open'), false);

  // 2. Android edge-to-edge: innerHeight & visualViewport stay 891, --safe-area-inset-bottom jumps to 378.67px
  probeStyle = { paddingTop: '363.81px', paddingRight: '378.67px', paddingBottom: '0px', paddingLeft: '14.86px' };
  view.syncViewport();
  assert.equal(modalHost.props['--ds-write-kb-inset'], '379px');
  assert.equal(modalHost.cls.has('is-kb-open'), true);

  // 3. Android adjustResize: modal container itself already shrank by 364px -> must NOT double-count
  winH = 527;
  vvH = 527;
  modalH = 527;
  leafRect = { top: 88, bottom: 527, height: 439 };
  view.syncViewport();
  assert.equal(modalHost.props['--ds-write-kb-inset'], '0px');
  assert.equal(modalHost.cls.has('is-kb-open'), true);

  // 4. Fallback via workspace leaf shrink when CSS variables & visualViewport report 0
  winH = 891;
  vvH = 891;
  modalH = 891;
  probeStyle = { paddingTop: '0px', paddingRight: '14.86px', paddingBottom: '0px', paddingLeft: '14.86px' };
  leafRect = { top: 88, bottom: 512, height: 424 };
  view.syncViewport();
  assert.equal(modalHost.props['--ds-write-kb-inset'], '379px');
  assert.equal(modalHost.cls.has('is-kb-open'), true);

  // 5. Keyboard closes again: restores gesture bar clearance
  leafRect = { top: 88, bottom: 891, height: 803 };
  view.syncViewport();
  assert.equal(modalHost.props['--ds-write-kb-inset'], '15px');
  assert.equal(modalHost.cls.has('is-kb-open'), false);
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

test('card menu includes copy button, sectionCopyText formats clean text, and expand button is arrow-only', () => {
  assert.equal(sectionCopyText({ sub: '', buji: false, content: '第一段\n\n第二段', raw: '' }), '第一段\n\n第二段');
  assert.equal(sectionCopyText({ sub: '看电影', buji: false, content: '东京奏鸣曲很震撼', raw: '' }), '看电影\n\n东京奏鸣曲很震撼');
  assert.equal(sectionCopyText({ sub: '补记 · 昨天散步', buji: true, content: '走了五公里', raw: '' }), '昨天散步\n\n走了五公里');
  assert.equal(sectionCopyText({ sub: '补记', buji: true, content: '补一条', raw: '' }), '补一条');

  const view = new DiaryStreamView(null, { data: { settings: { dayStartHour: 4 } } });
  view.plugin.store = { resolve: () => null };
  const s = {
    idx: 0,
    date: '2026-11-24',
    path: '日记/2026-11-24.md',
    time: '19:08',
    sub: '',
    content: '长日记正文'.repeat(50),
    text: '长日记正文'.repeat(50),
    tagLine: ['生活'],
    tags: ['生活'],
    late: false,
    buji: false,
    hasImg: false,
    hasVoice: false
  };
  view.S.menu = '日记/2026-11-24.md#0';
  const html = view.card(s);
  assert.match(html, /data-copykey="日记\/2026-11-24\.md#0"[^>]*><span data-icon="copy"><\/span>复制<\/button>/);
  assert.match(html, /class="ds-more"[^>]*aria-expanded="false"><span class="ds-more-ic" data-icon="chevron-down"><\/span><span class="ds-sr-only ds-more-sr">展开<\/span><\/button>/);
  assert.ok(!html.includes('ds-more-txt'), 'expand button should not render visible 展开 text');
});

test('dayHeadHtml omits redundant month and syncVisibleMonth updates sticky top bar on scroll', () => {
  const css = readFileSync(join(__dirname, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.ds-mhead\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*0;/);

  const view = new DiaryStreamView(null, { data: { settings: { dayStartHour: 4 } } });
  const hToday = view.dayHeadHtml({ date: '2026-11-24', sections: [{}] }, '2026-11-24');
  assert.ok(hToday.includes('>24<'));
  assert.ok(hToday.includes('星期二'));
  assert.ok(hToday.includes('今天'));
  assert.ok(!hToday.includes('11月'), 'day header should not repeat month');

  const hOther = view.dayHeadHtml({ date: '2026-11-23', sections: [{}] }, '2026-11-24');
  assert.ok(hOther.includes('>23<'));
  assert.ok(hOther.includes('星期一'));
  assert.ok(!hOther.includes('11月'), 'day header should not repeat month');

  const mt = { textContent: '' };
  const ms = { textContent: '' };
  let tops = [60, 420, 900];
  const dayEls = [
    { dataset: { date: '2026-11-24' }, getBoundingClientRect: () => ({ top: tops[0] }) },
    { dataset: { date: '2026-10-31' }, getBoundingClientRect: () => ({ top: tops[1] }) },
    { dataset: { date: '2025-12-30' }, getBoundingClientRect: () => ({ top: tops[2] }) }
  ];
  view.root = {
    querySelector: (sel) => sel === '.ds-month-title' ? mt
      : sel === '.ds-month-sub' ? ms
      : sel === '.ds-mhead' ? { getBoundingClientRect: () => ({ bottom: 48, height: 48 }) }
      : null,
    querySelectorAll: (sel) => sel === '.ds-stream > .ds-day[data-date]' ? dayEls : []
  };

  // At top -> November 2026
  view.syncVisibleMonth();
  assert.equal(mt.textContent, '11月');
  assert.equal(ms.textContent, '2026');
  assert.equal(view.visibleMonth, '2026-11');

  // Scrolled into October 2026
  tops = [-320, 40, 520];
  view.syncVisibleMonth();
  assert.equal(mt.textContent, '10月');
  assert.equal(ms.textContent, '2026');
  assert.equal(view.visibleMonth, '2026-10');

  // Scrolled into December 2025
  tops = [-820, -460, 20];
  view.syncVisibleMonth();
  assert.equal(mt.textContent, '12月');
  assert.equal(ms.textContent, '2025');
  assert.equal(view.visibleMonth, '2025-12');
});

test('countDiaryChars ignores whitespace and inline image tokens, and draft persists per vault with FAB indicator', () => {
  assert.equal(countDiaryChars(''), 0);
  assert.equal(countDiaryChars('今天  心情\n不错\n\n[[DS_IMG:img_2]]'), 6);

  const storage = new Map();
  const fabCls = new Set();
  const fab = { classList: { toggle: (c, on) => on ? fabCls.add(c) : fabCls.delete(c), contains: (c) => fabCls.has(c) } };
  const view = new DiaryStreamView(null, {});
  view.app = { vault: { getName: () => '我的日记库' } };
  view.root = {
    querySelector: (sel) => sel === '.ds-fab' ? fab : null,
    ownerDocument: {
      defaultView: {
        localStorage: {
          getItem: (k) => storage.has(k) ? storage.get(k) : null,
          setItem: (k, v) => storage.set(k, v),
          removeItem: (k) => storage.delete(k)
        },
        setTimeout: () => 1,
        clearTimeout() {}
      }
    }
  };
  let restored = null;
  let draftState = { body: '半篇草稿', sub: '副标题', tags: ['生活'], when: null, buji: false };
  view.composer = {
    empty: () => !draftState,
    exportDraft: () => draftState,
    restoreDraft: (d) => { restored = d; draftState = d; return true; }
  };

  view.saveDraft();
  view.syncDraftIndicator();
  assert.ok(storage.has('ds-draft:我的日记库'));
  assert.equal(fabCls.has('has-draft'), true);

  draftState = null;
  assert.equal(view.loadDraft(), true);
  assert.equal(restored.body, '半篇草稿');
  assert.equal(fabCls.has('has-draft'), true);

  draftState = null;
  view.clearDraft();
  assert.equal(storage.has('ds-draft:我的日记库'), false);
  assert.equal(fabCls.has('has-draft'), false);
});

test('tapping clamped card body expands without collapsing on second tap or breaking text selection', async () => {
  let selectionCollapsed = false;
  const expandedCalls = [];
  const view = new DiaryStreamView(null, {});
  view.root = {
    ownerDocument: {
      defaultView: {
        getSelection: () => ({ isCollapsed: selectionCollapsed })
      }
    }
  };
  view.toggleCardExpand = (card, forceOpen) => expandedCalls.push({ card, forceOpen });
  const fakeCard = { id: 'card-1' };
  const clampedWrap = { closest: (sel) => sel === '.ds-card' ? fakeCard : null };
  const makeTarget = () => ({
    closest: (sel) => {
      if (sel === '.ds-body-wrap.is-clamped') return clampedWrap;
      return null;
    }
  });

  // Active non-collapsed text selection -> must NOT trigger expand
  await view.onClick({ target: makeTarget() });
  assert.equal(expandedCalls.length, 0);

  // Collapsed selection (plain tap) -> expands with forceOpen = true (never collapses)
  selectionCollapsed = true;
  await view.onClick({ target: makeTarget() });
  assert.deepEqual(expandedCalls, [{ card: fakeCard, forceOpen: true }]);
});

test('FAB dims while scrolling down and restores on scroll up or idle; maybeLoadMore auto-extends near bottom', () => {
  const fabCls = new Set();
  const fab = {
    classList: {
      add: (c) => fabCls.add(c),
      remove: (c) => fabCls.delete(c),
      contains: (c) => fabCls.has(c)
    }
  };
  let idleCb = null;
  const view = new DiaryStreamView(null, {});
  view.root = {
    querySelector: (sel) => sel === '.ds-fab' ? fab : null,
    ownerDocument: {
      defaultView: {
        setTimeout: (fn) => { idleCb = fn; return 42; },
        clearTimeout() { idleCb = null; }
      }
    }
  };

  // Scroll down -> dims FAB
  view.syncFabScroll(120, 25);
  assert.equal(fabCls.has('is-reading'), true);
  assert.equal(typeof idleCb, 'function');

  // Idle timeout fires -> restores FAB
  idleCb();
  assert.equal(fabCls.has('is-reading'), false);

  // Scroll down again then scroll up -> immediately restores FAB
  view.syncFabScroll(200, 30);
  assert.equal(fabCls.has('is-reading'), true);
  view.syncFabScroll(180, -20);
  assert.equal(fabCls.has('is-reading'), false);

  // Auto-load more when near bottom
  let rendered = 0;
  view.hasMoreDays = true;
  view.contentEl = { scrollTop: 700, clientHeight: 500, scrollHeight: 1400 };
  view.renderStream = () => { rendered++; };
  view.maybeLoadMore();
  assert.equal(view.S.limit, 60);
  assert.equal(rendered, 1);

  // Does not auto-load while card menu is open
  view.S.menu = 'a#0';
  view.maybeLoadMore();
  assert.equal(view.S.limit, 60);
});

test('mobile edit sheet shares full-screen keyboard CSS and keeps background card intact while editing', () => {
  const css = readFileSync(join(__dirname, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.ds-edit-sheet[\s\S]*padding-bottom:\s*var\(--ds-write-kb-inset/);
  assert.match(css, /\.ds-fab\.is-reading:not\(\.is-hidden\)/);
  assert.match(css, /\.ds-fab\.has-draft::after/);
  assert.match(css, /\.ds-wc\s*\{/);

  const view = new DiaryStreamView(null, { data: { settings: { dayStartHour: 4 } } });
  view.plugin.store = { resolve: () => null };
  const s = {
    idx: 0,
    date: '2026-11-24',
    path: '日记/2026-11-24.md',
    time: '19:08',
    sub: '',
    content: '原正文',
    text: '原正文',
    tagLine: [],
    tags: [],
    late: false,
    buji: false,
    hasImg: false,
    hasVoice: false
  };
  view.S.editing = '日记/2026-11-24.md#0';
  view.S.sheet = 'edit';
  const html = view.card(s);
  assert.ok(!html.includes('ds-edhost'), 'background card stays rendered normally while mobile edit sheet is open');
  assert.ok(html.includes('原正文'));
});
