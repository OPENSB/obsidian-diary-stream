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
