const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const context = vm.createContext({
  module: { exports: {} },
  require: () => ({ ItemView: class {}, Plugin: class {}, PluginSettingTab: class {} })
});
vm.runInContext(readFileSync(join(__dirname, '..', 'main.js'), 'utf8') + '\nthis.View = DiaryStreamView; this.Composer = Composer;', context);
function fixture() {
  const view = new context.View(null, {}), queued = [], closed = [];
  view.root = {
    querySelector: selector => ({ contains: target => target.scope === selector }),
    ownerDocument: { defaultView: { clearTimeout() {}, setTimeout(fn) { queued.push(fn); return queued.length; } } }
  };
  view.S.searchOpen = true;
  view.toggleSearch = (...args) => closed.push(args);
  return { view, queued, closed };
}
test('result controls, filters, confirmation and lightbox keep search active', () => {
  const { view, queued } = fixture();
  view.lightbox = { el: { contains: target => target.scope === 'lightbox' } };
  for (const scope of ['.ds-main', '.ds-side', '.ds-calbtn', '.ds-confirm', '.ds-toast', 'lightbox']) view.onSearchOutside({ target: { scope } });
  assert.equal(queued.length, 0);
});
test('a true outside click closes without reclaiming focus', () => {
  const { view, queued, closed } = fixture();
  view.onSearchOutside({ target: { scope: 'outside' } });
  assert.equal(queued.length, 1);
  queued[0]();
  assert.deepEqual(closed, [[false, false]]);
});
test('editing, confirmation and desktop modal prevent accidental outside exit', () => {
  for (const state of ['editing', 'confirm', 'modal']) {
    const { view, queued } = fixture();
    if (state === 'modal') view.searchModal = { open: true };
    else view.S[state] = '日记/2026-11-04.md#0';
    view.onSearchOutside({ target: { scope: 'outside' } });
    assert.equal(queued.length, 0, state);
  }
});
test('an editor opened during the click cancels a pending outside exit', () => {
  const { view, queued, closed } = fixture();
  view.onSearchOutside({ target: { scope: 'outside' } });
  view.S.editing = '日记/2026-11-04.md#0';
  queued[0]();
  assert.equal(closed.length, 0);
});
function editorFixture() {
  const editor = Object.create(context.Composer.prototype);
  const pendingTag = { value: '' };
  Object.assign(editor, { mode: 'edit', ta: { value: '原来的正文' }, tags: ['求职'], sub: '', atts: [], rec: null, q: () => pendingTag });
  editor.initialEditState = editor.editSignature();
  return { editor, pendingTag };
}
test('unsaved body, subtitle, tags, pending tags and attachments all require a decision', () => {
  const changes = [
    ({ editor }) => { editor.ta.value += '\n新增内容'; },
    ({ editor }) => { editor.sub = '副标题'; },
    ({ editor }) => { editor.tags.push('生活'); },
    ({ pendingTag }) => { pendingTag.value = '尚未确认的标签'; },
    ({ editor }) => { editor.atts.push({ kind: 'img', ext: 'png', url: 'blob:new-image' }); },
    ({ editor }) => { editor.rec = {}; }
  ];
  for (const change of changes) {
    const fixture = editorFixture();
    assert.equal(fixture.editor.isDirty(), false);
    change(fixture);
    assert.equal(fixture.editor.isDirty(), true);
  }
});
test('reverting an edit does not prompt, and new diary drafts use their existing flow', () => {
  const { editor } = editorFixture();
  editor.ta.value += '\n临时改动';
  assert.equal(editor.isDirty(), true);
  editor.ta.value = '原来的正文';
  assert.equal(editor.isDirty(), false);
  editor.mode = 'new';
  editor.ta.value = '新日记草稿';
  assert.equal(editor.isDirty(), false);
});
