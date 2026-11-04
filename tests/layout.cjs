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
vm.runInContext(source + '\nthis.View = DiaryStreamView;', context);
function fixture(width, narrow, days = []) {
  const heat = { clientWidth: width, dataset: {}, innerHTML: '' };
  const view = Object.create(context.View.prototype);
  view.root = { querySelector: () => heat, classList: { contains: () => narrow } };
  view.plugin = { data: { settings: { dayStartHour: 4 } } };
  view.S = { date: null };
  view.days = () => days;
  return { view, heat };
}
test('heat map uses available card width and larger mobile cells', () => {
  for (const [width, narrow, weeks] of [[210, false, 13], [340, true, 18], [270, true, 14]]) {
    const { view } = fixture(width, narrow);
    assert.equal(view.heatWeeks(), weeks);
  }
  assert.ok(fixture(340, false).view.heatWeeks() > fixture(340, true).view.heatWeeks());
});
test('hidden cards have a fallback and visible ranges stay bounded', () => {
  for (const [width, expected] of [[0, 12], [30, 8], [2000, 26]]) {
    assert.equal(fixture(width, true).view.heatWeeks(), expected);
  }
});
test('changing heat width renders complete weeks and preserves selected dates and source data', () => {
  const days = [{ date: '2050-11-04', size: 1234 }];
  const original = JSON.stringify(days);
  const { view, heat } = fixture(340, true, days);
  view.S.date = days[0].date;
  for (const [width, weeks] of [[340, 18], [270, 14], [210, 11]]) {
    heat.clientWidth = width;
    view.renderHeat();
    assert.equal(heat.dataset.weeks, String(weeks));
    assert.equal((heat.innerHTML.match(/<button /g) || []).length, weeks * 7);
    assert.ok(heat.innerHTML.includes(`近 ${weeks} 周`));
    assert.match(heat.innerHTML, /class="ds-hc l1 is-sel" data-date="2050-11-04"/);
    const dates = [...heat.innerHTML.matchAll(/aria-label="(\d{4}-\d{2}-\d{2})/g)].map(m => m[1]);
    assert.equal(new Date(dates[0] + 'T12:00:00').getDay(), 0);
    assert.equal(new Date(dates.at(-1) + 'T12:00:00').getDay(), 6);
    assert.equal(new Set(dates).size, weeks * 7);
  }
  assert.equal(view.S.date, '2050-11-04');
  assert.equal(JSON.stringify(days), original);
});
