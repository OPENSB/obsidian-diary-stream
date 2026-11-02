const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = readFileSync(require('node:path').join(__dirname, '..', 'main.js'), 'utf8');
const core = source.split('// src/core.ts\n')[1].split('// src/render.ts')[0];
const ctx = vm.createContext({});
vm.runInContext(core + '\nthis.api={logicalDate,entryTime,parseDay,planAppend,planEdit,planDelete,refOf,sectionTimeLabel,sectionLines,ConflictError};', ctx);
const a = ctx.api;
const stamp = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min);
const entry = (when, body = '凌晨测试', sub = '测试副标题') => ({...a.entryTime(when, 4), body, sub, tags:['测试']});
const textAt = (when) => a.planAppend(null, a.logicalDate(when,4), entry(when));
const parse = (text, date='2026-11-01') => a.parseDay(`日记/${date}.md`,text);
test('02:00 stays in previous diary, writes actual full date, reads correct label', () => {
 const when=stamp(2026,11,2,2), text=textAt(when), day=parse(text);
 assert.equal(a.logicalDate(when,4),'2026-11-01');
 assert.match(text,/^## 2026-11-02 02:00｜测试副标题$/m);
 const s=day.sections[0];
 assert.equal(s.date,'2026-11-01'); assert.equal(s.recordedDate,'2026-11-02');
 assert.equal(s.time,'02:00'); assert.equal(s.sub,'测试副标题');
 assert.equal(a.sectionTimeLabel(s),'11月2日 02:00'); assert.equal(s.late,true);
});
test('04:00 boundary and daytime keep ordinary time headings', () => {
 for (const [h,min,date,prefix] of [[0,0,'2026-11-01','2026-11-02 00:00'],[3,59,'2026-11-01','2026-11-02 03:59'],[4,0,'2026-11-02','04:00'],[14,0,'2026-11-02','14:00']]) {
  const w=stamp(2026,11,2,h,min), text=textAt(w), s=parse(text,date).sections[0];
  assert.equal(a.logicalDate(w,4),date); assert.ok(text.includes(`## ${prefix}｜`));
  assert.equal(s.late,h<4); assert.equal(s.timeDate,h<4?'2026-11-02':null);
 }
});
test('month, year and leap-day rollovers use calendar dates', () => {
 for (const [w,logical,actual,label] of [[stamp(2026,11,1,2),'2026-10-31','2026-11-01','11月1日 02:00'],[stamp(2027,1,1,2),'2026-12-31','2027-01-01','2027年1月1日 02:00'],[stamp(2028,3,1,2),'2028-02-29','2028-03-01','3月1日 02:00']]) {
  assert.equal(a.logicalDate(w,4),logical);
  const s=parse(textAt(w),logical).sections[0]; assert.equal(s.recordedDate,actual); assert.equal(a.sectionTimeLabel(s),label);
 }
});
test('legacy bare 02:00 displays next calendar date without rewriting source', () => {
 for (const [logical,actual] of [['2026-11-01','2026-11-02'],['2026-12-31','2027-01-01'],['2028-02-29','2028-03-01']]) {
  const text=`# ${logical}\n\n## 2:00｜旧记录\n原始正文\n`;
  const s=parse(text,logical).sections[0]; assert.equal(s.recordedDate,actual); assert.equal(s.timeDate,null);
  const edited=a.planEdit(text,a.refOf(s),{body:'编辑后的正文',sub:'新副标题',tags:[]});
  assert.match(edited,/^## 02:00｜新副标题$/m); assert.ok(!edited.includes(`## ${actual}`));
 }
});
test('editing body or subtitle preserves explicit timestamp and neighboring entries', () => {
 const text=textAt(stamp(2026,11,2,2))+'\n## 03:00｜相邻记录\n保持这段正文\n';
 const s=parse(text).sections[0];
 for(const sub of ['测试副标题','更新副标题']) {
  const edited=a.planEdit(text,a.refOf(s),{body:'新正文',sub,tags:['新标签']});
  assert.ok(edited.includes(`## 2026-11-02 02:00｜${sub}`));
  assert.ok(edited.endsWith('\n## 03:00｜相邻记录\n保持这段正文\n'));
  const reread=parse(edited).sections[0]; assert.equal(reread.recordedDate,'2026-11-02'); assert.equal(reread.sub,sub);
  assert.ok(a.sectionLines({time:reread.time,timeDate:reread.timeDate,sub,body:reread.content,tags:reread.tagLine}).join('\n').startsWith(`## 2026-11-02 02:00｜${sub}`));
 }
});
test('explicit date remains stable when day boundary setting changes', () => {
 const text=textAt(stamp(2026,11,2,2));
 const s=a.parseDay('日记/2026-11-01.md',text,1).sections[0];
 assert.equal(s.recordedDate,'2026-11-02'); assert.equal(a.sectionTimeLabel(s),'11月2日 02:00');
 assert.equal(a.logicalDate(stamp(2026,11,2,0,59),1),'2026-11-01');
 assert.equal(a.logicalDate(stamp(2026,11,2,1),1),'2026-11-02');
});
test('dated sections remain deletable with conflict checks', () => {
 const text=textAt(stamp(2026,11,2,2))+'\n## 14:00｜保留\n保留正文\n';
 const s=parse(text).sections[0], result=a.planDelete(text,a.refOf(s));
 assert.ok(!result.text.includes('凌晨测试')); assert.ok(result.text.includes('保留正文'));
 assert.ok(result.removed.startsWith('## 2026-11-02 02:00'));
 assert.throws(()=>a.planEdit(text.replace('凌晨测试','另一处的新内容'),a.refOf(s),{body:'覆盖',sub:s.sub,tags:[]}),e=>e.name==='ConflictError');
});
test('CRLF line endings survive dated-heading subtitle edit', () => {
 const text=textAt(stamp(2026,11,2,2)).replace(/\n/g,'\r\n');
 const s=parse(text).sections[0], edited=a.planEdit(text,a.refOf(s),{body:s.content,sub:'新副标题',tags:s.tagLine});
 assert.ok(!/(?<!\r)\n/.test(edited)); assert.match(edited,/## 2026-11-02 02:00｜新副标题\r\n/);
});
