/* 日记流 diary-stream — 把日记库当数据库的 memos 式前端 */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => DiaryStreamPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/view.ts
var import_obsidian3 = require("obsidian");

// src/core.ts
var WD = ["\u5468\u65E5", "\u5468\u4E00", "\u5468\u4E8C", "\u5468\u4E09", "\u5468\u56DB", "\u5468\u4E94", "\u5468\u516D"];
var IMG_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg|avif)$/i;
var AUD_EXT = /\.(m4a|mp3|wav|aac|ogg|oga|opus|webm|amr|flac|3gp)$/i;
var EMBED_RE = /!\[\[([^\]|#^]+)(?:[#^][^\]|]*)?(?:\|[^\]]*)?\]\]/g;
var TAG_CHARS = "[\\p{L}\\p{N}_\\-\\/]";
var TAG_RE = new RegExp(`(^|[\\s\\u3000-\\u303f\\uff00-\\uffef(\uFF08\\[\u3010])#(${TAG_CHARS}+)`, "gu");
var TAG_LINE_RE = new RegExp(`^\\s*(#${TAG_CHARS}+\\s*)+$`, "u");
var pad2 = (n) => String(n).padStart(2, "0");
var ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
var hm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
var parseYmd = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
var weekday = (date) => WD[parseYmd(date).getDay()];
function logicalDate(d, dayStartHour = 4) {
  const x = new Date(d.getTime());
  if (x.getHours() < dayStartHour) x.setDate(x.getDate() - 1);
  return ymd(x);
}
function entryTime(when, dayStartHour) {
  const actualDate = ymd(when);
  return { time: hm(when), timeDate: actualDate === logicalDate(when, dayStartHour) ? null : actualDate };
}
function recordDateLabel(actualDate, diaryDate) {
  const year = actualDate.slice(0, 4) === diaryDate.slice(0, 4) ? "" : `${actualDate.slice(0, 4)}年`;
  return `${year}${+actualDate.slice(5, 7)}月${+actualDate.slice(8)}日`;
}
function sectionTimeLabel(section) {
  return section.recordedDate && section.recordedDate !== section.date
    ? `${recordDateLabel(section.recordedDate, section.date)} ${section.time}`
    : section.time || "";
}
var okTag = (t) => !!t && !/^[\d\/_-]+$/.test(t);
var normTag = (t) => t.trim().replace(/^#+/, "").replace(/[\s,，;；]+/g, "-").replace(/^-+|-+$/g, "");
function isTagLine(l) {
  if (/^#{1,6}\s/.test(l) || !TAG_LINE_RE.test(l)) return false;
  return scanTags(l).length > 0;
}
function scanTags(text) {
  const out = [];
  let fence = false;
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence || /^#{1,6}\s/.test(line)) continue;
    const clean = line.replace(/`[^`]*`/g, " ");
    for (const m of clean.matchAll(TAG_RE)) if (okTag(m[2]) && !out.includes(m[2])) out.push(m[2]);
  }
  return out;
}
function splitLines(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] !== "\n" && s[j] !== "\r") j++;
    const eol = j >= s.length ? "" : s[j] === "\r" && s[j + 1] === "\n" ? "\r\n" : s[j];
    out.push({ text: s.slice(i, j), eol });
    i = j + eol.length;
  }
  return out;
}
var joinLines = (ls) => ls.map((l) => l.text + l.eol).join("");
function detectEol(s) {
  const m = s.match(/\r\n|\n|\r/);
  return m ? m[0] : "\n";
}
var DEFAULT_TAG = "\u65E5\u8BB0";
function normFmTags(v) {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,，\s]+/) : v == null ? [] : [v];
  return dedupe(raw.filter((x) => typeof x === "string" || typeof x === "number").map((x) => String(x).trim().replace(/^#+/, "").trim()).filter(Boolean));
}
function withFmTags(day, extra = []) {
  const fmTags = dedupe([...day.fmTags, ...normFmTags(extra)]);
  const entry = new Set(day.sections.flatMap((s) => s.tags));
  const fileLevel = fmTags.filter((t) => t !== DEFAULT_TAG);
  const dayTags = fileLevel.filter((t) => !entry.has(t));
  for (const s of day.sections) s.allTags = dedupe([...s.tags, ...dayTags]);
  return { ...day, fmTags, dayTags };
}
function parseFrontmatter(lines) {
  const fm = {};
  if (!lines.length || lines[0].text.trim() !== "---") return { fm, end: 0, has: false };
  let j = -1;
  for (let i = 1; i < lines.length; i++) if (/^(---|\.\.\.)\s*$/.test(lines[i].text)) {
    j = i;
    break;
  }
  if (j < 0) return { fm, end: 0, has: false };
  let listKey = null;
  for (const { text } of lines.slice(1, j)) {
    const li = text.match(/^\s*-(?:\s+(.*))?$/);
    if (li && listKey) {
      const v2 = unq((li[1] || "").trim());
      if (v2) fm[listKey].push(v2);
      continue;
    }
    const kv = text.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) {
      listKey = null;
      continue;
    }
    const v = kv[2].trim();
    if (v === "") {
      fm[kv[1]] = [];
      listKey = kv[1];
      continue;
    }
    listKey = null;
    if (/^\[.*\]$/.test(v)) fm[kv[1]] = v.slice(1, -1).split(",").map((x) => unq(x.trim())).filter(Boolean);
    else if (/^[[{|>]/.test(v)) continue;
    else fm[kv[1]] = unq(v);
  }
  return { fm, end: j + 1, has: true };
}
var unq = (s) => s.replace(/^["']|["']$/g, "");
var HDR_TIME = /^(?:(\d{4}-\d{2}-\d{2})\s+)?(\d{1,2}:\d{2})\s*(?:[｜|]\s*)?(.*)$/;
function parseDay(path, text, dayStartHour = 4) {
  const lines = splitLines(text);
  const { fm, end: fmEnd, has } = parseFrontmatter(lines);
  const date = (typeof fm.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fm.date) ? fm.date : (path.match(/(\d{4}-\d{2}-\d{2})/) || [])[1]) || "";
  const raws = [];
  let cur = { hdr: null, start: fmEnd, end: lines.length };
  let seenTitle = false, fence = false, sawContent = false;
  for (let i = fmEnd; i < lines.length; i++) {
    const l = lines[i].text;
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (!fence && !seenTitle && !sawContent && /^#\s/.test(l)) {
      seenTitle = true;
      cur.start = i + 1;
      continue;
    }
    if (!fence && /^##\s+/.test(l)) {
      cur.end = i;
      raws.push(cur);
      cur = { hdr: l, start: i, end: lines.length };
      sawContent = true;
      continue;
    }
    if (l.trim()) sawContent = true;
  }
  cur.end = lines.length;
  raws.push(cur);
  const occ = /* @__PURE__ */ new Map();
  const sections = [];
  for (const r of raws) {
    const bodyStart = r.hdr ? r.start + 1 : r.start;
    let ce = r.end;
    while (ce > bodyStart && !lines[ce - 1].text.trim()) ce--;
    if (!r.hdr && ce <= bodyStart) continue;
    if (!r.hdr) {
      while (r.start < ce && !lines[r.start].text.trim()) r.start++;
    }
    const body = lines.slice(r.hdr ? bodyStart : r.start, ce).map((l) => l.text);
    const tagLine = [];
    let k2 = body.length;
    while (k2 > 0 && (isTagLine(body[k2 - 1]) || !body[k2 - 1].trim())) {
      if (body[k2 - 1].trim()) tagLine.unshift(...scanTags(body[k2 - 1]));
      k2--;
    }
    const content = body.slice(0, k2).join("\n").replace(/^\s*\n/, "").trimEnd();
    let time = null, timeDate = null, sub = "";
    if (r.hdr) {
      const h = r.hdr.replace(/^##\s+/, "").trim();
      const t = h.match(HDR_TIME);
      if (t) {
        timeDate = t[1] || null;
        time = t[2].padStart(5, "0");
        sub = t[3].trim();
      } else sub = h;
    }
    let recordedDate = time ? timeDate || date : null;
    if (time && !timeDate && date && +time.slice(0, 2) < dayStartHour) {
      const actual = parseYmd(date);
      actual.setDate(actual.getDate() + 1);
      recordedDate = ymd(actual);
    }
    const key = r.hdr ?? "\0";
    const o = occ.get(key) ?? 0;
    occ.set(key, o + 1);
    const embeds = [...content.matchAll(EMBED_RE)].map((m) => m[1].trim());
    const inlineTags = scanTags(content);
    sections.push({
      idx: sections.length,
      date,
      path,
      time,
      timeDate,
      recordedDate,
      sub,
      hdr: r.hdr,
      occ: o,
      start: r.start,
      end: r.end,
      contentEnd: ce,
      raw: lines.slice(r.start, ce).map((l) => l.text).join("\n"),
      content,
      tagLine: dedupe(tagLine),
      tags: dedupe([...tagLine, ...inlineTags]),
      allTags: [],
      late: !!(time && +time.slice(0, 2) < dayStartHour),
      buji: /补记/.test(sub),
      embeds,
      hasImg: embeds.some((e) => IMG_EXT.test(e)),
      hasVoice: embeds.some((e) => AUD_EXT.test(e)),
      text: content.replace(EMBED_RE, " ").replace(/^#+\s*/gm, "")
    });
  }
  return withFmTags({ path, date, fm, fmEnd, hasFm: has, size: utf8Len(text), sections, fmTags: normFmTags(fm.tags ?? fm.tag), dayTags: [] });
}
function dedupe(a) {
  return [...new Set(a)];
}
var utf8Len = (s) => {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    n += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
  }
  return n;
};
var ConflictError = class extends Error {
  constructor() {
    super("\u8FD9\u4E00\u6761\u5728\u522B\u5904\u88AB\u6539\u8FC7\u4E86\uFF0C\u8BF7\u5237\u65B0\u540E\u518D\u8BD5");
    this.name = "ConflictError";
  }
};
var refOf = (s) => ({ hdr: s.hdr, occ: s.occ, raw: s.raw });
var cleanSub = (s) => s.replace(/[\r\n]+/g, " ").replace(/[｜|]/g, "\uFF0F").trim();
function headerFor(time, sub, timeDate = null) {
  const s = cleanSub(sub);
  return time ? `## ${timeDate ? timeDate + " " : ""}${time}${s ? "\uFF5C" + s : ""}` : `## ${s || "\uFF08\u8865\u8BB0\uFF09"}`;
}
function sectionLines(e, headless = false) {
  const out = [];
  if (!headless) out.push(headerFor(e.time, e.sub, e.timeDate));
  const body = e.body.replace(/\r\n|\r/g, "\n").replace(/\s+$/, "");
  if (body) out.push(...body.split("\n"));
  const tags = dedupe(e.tags.map(normTag).filter(okTag));
  if (tags.length) {
    if (body) out.push("");
    out.push(tags.map((t) => "#" + t).join(" "));
  }
  return out;
}
function newFileText(date, source = "memos", eol = "\n") {
  return ["---", `date: "${date}"`, `source: "${source}"`, 'tags: ["\u65E5\u8BB0"]', "---", `# ${date} ${weekday(date)}`, ""].join(eol);
}
function appendSection(text, e) {
  const eol = detectEol(text);
  const m = text.match(/(\r\n|\n|\r)*$/);
  const trailing = (m[0].match(/\r\n|\n|\r/g) || []).length;
  const sep = text.length === 0 ? "" : trailing === 0 ? eol + eol : trailing === 1 ? eol : "";
  return text + sep + sectionLines(e).join(eol) + eol;
}
function locate(text, ref, dayStartHour) {
  const day = parseDay("", text, dayStartHour);
  const s = day.sections.find((x) => x.hdr === ref.hdr && x.occ === ref.occ);
  if (!s || s.raw !== ref.raw) throw new ConflictError();
  return { lines: splitLines(text), s, day };
}
function replaceSection(text, ref, e, dayStartHour = 4) {
  const { lines, s } = locate(text, ref, dayStartHour);
  const eol = detectEol(text);
  const old = lines.slice(s.start, s.contentEnd).map((l) => l.text);
  const out = [];
  const bodyStartOff = s.hdr ? 1 : 0;
  if (s.hdr) out.push(cleanSub(e.sub) === s.sub ? s.hdr : headerFor(s.time, e.sub || (s.time ? "" : s.sub), s.timeDate));
  let k2 = old.length;
  while (k2 > bodyStartOff && (isTagLine(old[k2 - 1]) || !old[k2 - 1].trim())) k2--;
  const oldBodyLines = old.slice(bodyStartOff, k2);
  const newBody = e.body.replace(/\r\n|\r/g, "\n").replace(/\s+$/, "");
  const bodyLines = newBody === s.content ? oldBodyLines : newBody ? newBody.split("\n") : [];
  out.push(...bodyLines);
  const tags = dedupe(e.tags.map(normTag).filter(okTag));
  const sameTags = tags.length === s.tagLine.length && tags.every((t, i) => t === s.tagLine[i]);
  if (sameTags && s.tagLine.length && newBody === s.content) out.push(...old.slice(k2));
  else if (tags.length) {
    if (bodyLines.length) out.push("");
    out.push(tags.map((t) => "#" + t).join(" "));
  }
  if (!s.hdr && !out.length) out.push("");
  const repl = out.map((t) => ({ text: t, eol }));
  const lastOld = lines[s.contentEnd - 1];
  if (repl.length && lastOld) repl[repl.length - 1].eol = lastOld.eol;
  return joinLines([...lines.slice(0, s.start), ...repl, ...lines.slice(s.contentEnd)]);
}
function removeSection(text, ref, dayStartHour = 4) {
  const { lines, s } = locate(text, ref, dayStartHour);
  let from = s.start;
  const to = s.end;
  const fmEnd = parseFrontmatter(lines).end;
  if (to >= lines.length) while (from > fmEnd && !lines[from - 1].text.trim()) from--;
  const removed = joinLines(lines.slice(s.start, s.contentEnd)).replace(/(\r\n|\n|\r)$/, "");
  const kept = [...lines.slice(0, from), ...lines.slice(to)];
  const out = joinLines(kept);
  return { text: out, removed, emptyAfter: parseDay("", out, dayStartHour).sections.length === 0 };
}
function entryTagUnion(text, dayStartHour = 4) {
  return dedupe(parseDay("", text, dayStartHour).sections.flatMap((s) => s.tags));
}
function fmTagList(text) {
  const r = readTagsKey(splitLines(text));
  return r && r.ok ? r.cur.map(k) : [];
}
var k = (t) => t.replace(/^#+/, "").trim();
function readTagsKey(lines) {
  const { end, has } = parseFrontmatter(lines);
  if (!has) return null;
  let ti = -1, tEnd = -1;
  for (let i = 1; i < end - 1; i++) if (/^tags:/.test(lines[i].text)) {
    ti = i;
    tEnd = i + 1;
    while (tEnd < end - 1 && /^\s*-(\s|$)/.test(lines[tEnd].text)) tEnd++;
    break;
  }
  const r = { ok: true, end, ti, tEnd, style: "none", cur: [], indent: "  " };
  if (ti < 0) return r;
  if (tEnd < end - 1 && /^\s+\S/.test(lines[tEnd].text) && !/^\s*-(\s|$)/.test(lines[tEnd].text)) r.ok = false;
  const v = lines[ti].text.replace(/^tags:\s*/, "").trim();
  if (/^\[.*\]$/.test(v)) {
    r.style = "flow";
    r.cur = v.slice(1, -1).split(",").map((x) => unq(x.trim())).filter(Boolean);
    if (tEnd > ti + 1) r.ok = false;
  } else if (v === "") {
    r.style = "block";
    r.cur = lines.slice(ti + 1, tEnd).map((l) => unq(l.text.replace(/^\s*-\s*/, "").trim())).filter(Boolean);
    const m = lines[ti + 1]?.text.match(/^(\s*-\s*)/);
    if (m) r.indent = m[1].replace(/-\s*$/, "");
  } else if (/^[[{|>&*!]/.test(v) || /["']/.test(v.slice(1, -1)) || tEnd > ti + 1) r.ok = false;
  else {
    r.style = "scalar";
    r.cur = v.split(/[,\s]+/).map(unq).filter(Boolean);
  }
  return r;
}
function syncFmTags(before, after, dayStartHour = 4, owned = []) {
  const lines = splitLines(after);
  const r = readTagsKey(lines);
  if (!r || !r.ok) return after;
  const eol = detectEol(after);
  const u0 = before == null ? [] : entryTagUnion(before, dayStartHour);
  const u1 = entryTagUnion(after, dayStartHour);
  const curK = r.cur.map(k);
  const removable = new Set(owned.map(k).filter((t) => t !== DEFAULT_TAG && u0.includes(t) && !u1.includes(t)));
  const keepIdx = r.cur.map((_, i) => !removable.has(curK[i]));
  const kept = r.cur.filter((_, i) => keepIdx[i]);
  const keptK = kept.map(k);
  const prepend = keptK.includes(DEFAULT_TAG) ? [] : [DEFAULT_TAG];
  const add = u1.filter((t) => !keptK.includes(t) && !prepend.includes(t));
  const removedAny = keepIdx.includes(false);
  if (r.style !== "none" && !removedAny && !prepend.length && !add.length) return after;
  const q = (t) => JSON.stringify(t);
  let repl;
  if (r.style === "block") {
    const old = lines.slice(r.ti + 1, r.tEnd).filter((l) => l.text.replace(/^\s*-\s*/, "").trim());
    const keptLines = old.filter((_, i) => keepIdx[i]).map((l) => ({ text: l.text, eol }));
    repl = [{ text: lines[r.ti].text, eol }, ...prepend.map((t) => ({ text: `${r.indent}- ${t}`, eol })), ...keptLines, ...add.map((t) => ({ text: `${r.indent}- ${t}`, eol }))];
    if (r.tEnd - r.ti - 1 !== old.length || old.length !== r.cur.length) return after;
  } else if (r.style === "flow" && !removedAny && !prepend.length) {
    const t = lines[r.ti].text, a = t.indexOf("["), z = t.lastIndexOf("]");
    const inner = t.slice(a + 1, z).replace(/[\s,]*$/, "");
    repl = [{ text: t.slice(0, a + 1) + (inner.trim() ? inner + ", " : inner) + add.map(q).join(", ") + t.slice(z), eol }];
  } else {
    repl = [{ text: `tags: [${[...prepend.map(q), ...kept.map(q), ...add.map(q)].join(", ")}]`, eol }];
  }
  if (r.ti >= 0) {
    repl[repl.length - 1].eol = lines[r.tEnd - 1].eol;
    return joinLines([...lines.slice(0, r.ti), ...repl, ...lines.slice(r.tEnd)]);
  }
  return joinLines([...lines.slice(0, r.end - 1), ...repl, ...lines.slice(r.end - 1)]);
}
function planAppend(existing, date, e, source = "memos", dayStartHour = 4, owned = []) {
  const base = existing ?? newFileText(date, source);
  return syncFmTags(existing ?? base, appendSection(base, e), dayStartHour, owned);
}
function planEdit(text, ref, e, dayStartHour = 4, owned = []) {
  return syncFmTags(text, replaceSection(text, ref, e, dayStartHour), dayStartHour, owned);
}
function planDelete(text, ref, dayStartHour = 4, owned = []) {
  const r = removeSection(text, ref, dayStartHour);
  return { ...r, text: r.emptyAfter ? r.text : syncFmTags(text, r.text, dayStartHour, owned) };
}

// src/render.ts
var esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var EMBED_LINE = /^!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]$/;
function inline(src, ctx) {
  return esc(src).split(/(`[^`]+`)/).map((part, i) => {
    if (i % 2) return `<code>${part.slice(1, -1)}</code>`;
    return part.replace(/!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_m, p) => embed(unesc(p), ctx, true)).replace(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_m, p, a) => `<a class="internal-link" data-href="${p}">${a || p}</a>`).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="external-link" href="$2" target="_blank" rel="noopener">$1</a>').replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>").replace(/~~(.+?)~~/g, "<del>$1</del>").replace(/==(.+?)==/g, '<mark class="ds-hl">$1</mark>').replace(TAG_RE, (m, pre, t) => okTag(t) ? `${pre}<a class="ds-itag" data-tag="${t}">#${t}</a>` : m);
  }).join("");
}
var unesc = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function embed(link, ctx, inlineMode = false) {
  const name = link.split("/").pop() || link;
  const r = ctx.resolve(link.trim());
  if (IMG_EXT.test(link)) {
    if (!r) return `<span class="ds-missing">\u9644\u4EF6\u7F3A\u5931\uFF1A${esc(name)}</span>`;
    return `<figure class="ds-img"><img loading="lazy" decoding="async" alt="${esc(name)}" src="${esc(r.url)}" data-path="${esc(r.path)}"></figure>`;
  }
  if (AUD_EXT.test(link)) {
    if (!r) return `<span class="ds-missing">\u5F55\u97F3\u7F3A\u5931\uFF1A${esc(name)}</span>`;
    return `<span class="ds-voice" data-path="${esc(r.path)}"><button type="button" class="ds-vplay" aria-label="\u64AD\u653E" data-icon="play"></button><span class="ds-vlabel">\u8BED\u97F3</span><span class="ds-vbar"><i></i></span><span class="ds-vdur">--:--</span><audio preload="metadata" src="${esc(r.url)}"></audio></span>`;
  }
  return `<a class="internal-link ds-file" data-href="${esc(link)}">\u{1F4CE} ${esc(name)}</a>`;
}
function renderMarkdown(src, ctx) {
  const out = [];
  let list = null, code = null, para = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map((l) => inline(l, ctx)).join("<br>")}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const close = () => {
    flushPara();
    closeList();
  };
  for (const raw of src.split("\n")) {
    const l = raw.replace(/\s+$/, "");
    let m;
    if (code) {
      if (/^\s*(```|~~~)/.test(l)) {
        out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
        code = null;
      } else code.push(raw);
      continue;
    }
    if (/^\s*(```|~~~)/.test(l)) {
      close();
      code = [];
      continue;
    }
    if (!l.trim()) {
      close();
      continue;
    }
    if (m = l.match(EMBED_LINE)) {
      close();
      out.push(embed(m[1], ctx));
      continue;
    }
    if (m = l.match(/^(#{1,6})\s+(.*)/)) {
      close();
      out.push(`<h4 class="ds-h">${inline(m[2], ctx)}</h4>`);
      continue;
    }
    if (m = l.match(/^>\s?(.*)/)) {
      close();
      out.push(`<blockquote>${inline(m[1], ctx)}</blockquote>`);
      continue;
    }
    if (m = l.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)/)) {
      flushPara();
      if (list !== "ul") {
        closeList();
        out.push('<ul class="ds-task">');
        list = "ul";
      }
      out.push(`<li class="${m[1] === " " ? "" : "done"}"><span class="ds-cb"></span>${inline(m[2], ctx)}</li>`);
      continue;
    }
    if (m = l.match(/^\s*[-*+]\s+(.*)/)) {
      flushPara();
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(m[1], ctx)}</li>`);
      continue;
    }
    if (m = l.match(/^\s*\d+[.)]\s+(.*)/)) {
      flushPara();
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(m[1], ctx)}</li>`);
      continue;
    }
    closeList();
    para.push(l);
  }
  if (code) out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
  close();
  return out.join("");
}
function highlight(html, q) {
  q = q.trim();
  if (!q) return html;
  const re = new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return html.replace(/>([^<]+)</g, (_m, t) => ">" + t.replace(re, (x) => `<mark class="ds-search">${x}</mark>`) + "<");
}

// src/composer.ts
var import_obsidian = require("obsidian");
var VOICE_TYPES = [["audio/mp4", "m4a"], ["audio/webm;codecs=opus", "webm"], ["audio/webm", "webm"], ["audio/ogg;codecs=opus", "ogg"]];
function pickVoiceType() {
  const MR = window.MediaRecorder;
  if (!MR) return null;
  return VOICE_TYPES.find(([t]) => {
    try {
      return MR.isTypeSupported(t);
    } catch {
      return false;
    }
  }) || ["", "webm"];
}
var icon = (el, name) => {
  if (el) (0, import_obsidian.setIcon)(el, name);
};
var fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
var Composer = class {
  constructor(parent, host, mode, init) {
    this.host = host;
    this.mode = mode;
    __publicField(this, "el");
    __publicField(this, "box");
    __publicField(this, "ta");
    __publicField(this, "tags", []);
    __publicField(this, "atts", []);
    __publicField(this, "sub", "");
    __publicField(this, "when", null);
    __publicField(this, "subOpen", false);
    __publicField(this, "tagsOpen", false);
    __publicField(this, "busy", false);
    __publicField(this, "rec", null);
    __publicField(this, "onDocClick", (e) => {
      if (!this.box.contains(e.target)) {
        this.hidePops();
      }
    });
    this.el = parent;
    if (init) {
      this.sub = init.sub;
      this.tags = [...init.tags];
      this.subOpen = !!init.sub;
    }
    this.build(init);
    document.addEventListener("click", this.onDocClick, true);
  }
  destroy() {
    document.removeEventListener("click", this.onDocClick, true);
    this.stopRec(true);
    this.atts.forEach((a) => URL.revokeObjectURL(a.url));
    this.el.empty?.();
    this.el.innerHTML = "";
  }
  ib(a, ic, title) {
    return `<button type="button" class="ds-ib clickable-icon" data-a="${a}" data-icon="${ic}" aria-label="${title}" title="${title}"></button>`;
  }
  build(init) {
    const isNew = this.mode === "new";
    this.el.innerHTML = `<div class="ds-cbox${isNew ? "" : " is-open is-edit"}">
      ${isNew ? "" : `<div class="ds-ed-head">\u7F16\u8F91 \xB7 ${esc(init.timeLabel)}</div>`}
      <textarea class="ds-body" rows="1" placeholder="${isNew ? "\u6B64\u523B\u5728\u60F3\u4EC0\u4E48\u2026" : ""}"></textarea>
      <div class="ds-att"></div>
      <div class="ds-fields"></div>
      <div class="ds-bar">
        ${init && !init.hasHeader ? "" : this.ib("sub", "heading", "\u526F\u6807\u9898")}${this.ib("tags", "hash", "\u6807\u7B7E")}${this.ib("img", "image", "\u63D2\u5165\u56FE\u7247")}${this.ib("rec", "mic", "\u5F55\u97F3")}${isNew ? this.ib("time", "clock", "\u5199\u5165\u65F6\u95F4") : ""}
        <span class="ds-sp"></span>
        ${this.ib("pv", "file-text", "\u9884\u89C8\u5C06\u5199\u5165\u7684\u5185\u5BB9")}
        ${isNew ? '<button type="button" class="ds-meta" data-a="time"></button>' : '<button type="button" class="ds-ghost" data-a="cancel">\u53D6\u6D88</button>'}
        <button type="button" class="ds-send mod-cta" data-a="send" disabled>${isNew ? "\u53D1\u9001" : "\u4FDD\u5B58"}</button>
        <div class="ds-pop ds-timepop" hidden><label>\u5199\u5165\u65F6\u95F4<input type="datetime-local" class="ds-when"></label><div class="ds-row"><span class="ds-hint"></span><button type="button" data-a="now">\u73B0\u5728</button></div></div>
      </div>
      <div class="ds-preview" hidden></div>
      <input type="file" accept="image/*" multiple class="ds-fileinput" hidden>
    </div>`;
    this.box = this.el.querySelector(".ds-cbox");
    this.ta = this.box.querySelector(".ds-body");
    if (init) this.ta.value = init.body;
    this.box.querySelectorAll("[data-icon]").forEach((b) => icon(b, b.dataset.icon));
    this.bind();
    this.renderFields();
    this.autosize();
    this.update();
  }
  q(s) {
    return this.box.querySelector(s);
  }
  hidePops() {
    this.box.querySelectorAll(".ds-pop").forEach((p) => p.hidden = true);
  }
  empty() {
    return !this.ta.value.trim() && !this.tags.length && !this.atts.length && !this.sub.trim();
  }
  bind() {
    const b = this.box;
    b.addEventListener("focusin", () => b.classList.add("is-open"));
    b.addEventListener("focusout", () => window.setTimeout(() => {
      if (this.mode === "new" && !b.contains(document.activeElement) && this.empty() && !this.rec) b.classList.remove("is-open");
    }, 150));
    b.addEventListener("mousedown", (e) => {
      if (e.target.closest(".ds-tagpop button")) e.preventDefault();
    });
    b.addEventListener("input", (e) => {
      const t = e.target;
      if (t === this.ta) this.autosize();
      if (t.classList.contains("ds-taginput")) {
        if (/[\s,，]$/.test(t.value)) this.addTag(t.value);
        else this.tagAC();
      }
      if (t.classList.contains("ds-subinput")) this.sub = t.value;
      if (t.classList.contains("ds-when")) this.when = t.value ? new Date(t.value) : null;
      this.update();
    });
    b.addEventListener("keydown", (e) => {
      const t = e.target;
      const pop = this.q(".ds-tagpop");
      const items = pop && !pop.hidden ? [...pop.querySelectorAll("button")] : [];
      if (items.length && ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key) && t.classList.contains("ds-taginput")) {
        const cur = items.findIndex((i) => i.classList.contains("is-on"));
        if (e.key === "Escape") {
          pop.hidden = true;
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          items.forEach((i) => i.classList.remove("is-on"));
          items[(cur + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].classList.add("is-on");
          return;
        }
        if ((e.key === "Enter" || e.key === "Tab") && cur >= 0 && t.value) {
          e.preventDefault();
          this.addTag(items[cur].dataset.t);
          return;
        }
      }
      if (t.classList.contains("ds-taginput")) {
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          this.addTag(t.value);
        }
        if (e.key === "Backspace" && !t.value && this.tags.length) {
          this.tags.pop();
          this.renderFields(true);
          this.update();
        }
      }
      if (t.classList.contains("ds-subinput") && e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        this.ta.focus();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void this.send();
      }
      if (e.key === "Escape" && this.mode === "edit") this.host.cancel?.();
    });
    b.addEventListener("click", (e) => {
      const t = e.target.closest("[data-a]");
      if (!t) return;
      const a = t.dataset.a;
      if (a === "sub") {
        this.subOpen = !this.subOpen || !!this.sub;
        this.renderFields();
        this.q(".ds-subinput")?.focus();
      }
      if (a === "tags") {
        this.tagsOpen = true;
        this.renderFields();
        this.q(".ds-taginput")?.focus();
        this.tagAC();
      }
      if (a === "closefield") {
        if (t.dataset.f === "sub") {
          this.sub = "";
          this.subOpen = false;
        } else {
          this.tagsOpen = false;
          this.tags = [];
        }
        this.renderFields();
        this.update();
        this.ta.focus();
      }
      if (a === "rmtag") {
        this.tags = this.tags.filter((x) => x !== t.dataset.t);
        this.renderFields(true);
        this.update();
      }
      if (a === "pick") {
        this.addTag(t.dataset.t);
      }
      if (a === "rmatt") {
        const [x] = this.atts.splice(+t.dataset.i, 1);
        if (x) URL.revokeObjectURL(x.url);
        this.renderAtts();
        this.update();
      }
      if (a === "img") this.q(".ds-fileinput").click();
      if (a === "rec") void this.toggleRec();
      if (a === "time") {
        const p = this.q(".ds-timepop");
        p.hidden = !p.hidden;
        if (!p.hidden) {
          const w = this.q(".ds-when");
          const d = new Date((this.when || /* @__PURE__ */ new Date()).getTime());
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          w.value = d.toISOString().slice(0, 16);
        }
      }
      if (a === "now") {
        this.when = null;
        this.q(".ds-timepop").hidden = true;
        this.update();
      }
      if (a === "pv") {
        const p = this.q(".ds-preview");
        p.hidden = !p.hidden;
        t.classList.toggle("is-active", !p.hidden);
        this.update();
      }
      if (a === "cancel") this.host.cancel?.();
      if (a === "send") void this.send();
    });
    this.q(".ds-fileinput").addEventListener("change", (ev) => {
      const inp = ev.target;
      for (const f of Array.from(inp.files || [])) {
        const ext = (f.name.match(/\.([a-z0-9]+)$/i)?.[1] || (f.type.split("/")[1] || "jpg")).toLowerCase().replace("jpeg", "jpg");
        this.atts.push({ kind: "img", blob: f, ext, url: URL.createObjectURL(f), name: f.name });
      }
      inp.value = "";
      this.renderAtts();
      this.update();
      this.box.classList.add("is-open");
    });
  }
  autosize() {
    this.ta.style.height = "auto";
    this.ta.style.height = Math.max(this.ta.scrollHeight, 0) + "px";
  }
  /* ---- 副标题 / 标签字段（点图标才出现） ---- */
  renderFields(keepFocus = false) {
    const f = this.q(".ds-fields");
    let h = "";
    if (this.subOpen || this.sub) h += `<span class="ds-fld ds-fld-sub"><span class="ds-lbl" data-icon="heading"></span><input class="ds-subinput" placeholder="\u526F\u6807\u9898" value="${esc(this.sub)}"><button type="button" class="ds-x" data-a="closefield" data-f="sub" aria-label="\u53BB\u6389\u526F\u6807\u9898" data-icon="x"></button></span>`;
    if (this.tagsOpen || this.tags.length) h += `<span class="ds-fld ds-fld-tags"><span class="ds-lbl" data-icon="hash"></span>${this.tags.map((t) => `<span class="ds-tchip">#${esc(t)}<button type="button" data-a="rmtag" data-t="${esc(t)}" aria-label="\u79FB\u9664" data-icon="x"></button></span>`).join("")}<input class="ds-taginput" placeholder="${this.tags.length ? "" : "\u6807\u7B7E"}" autocomplete="off" enterkeyhint="done"></span><div class="ds-pop ds-tagpop" hidden></div>`;
    f.innerHTML = h;
    f.querySelectorAll("[data-icon]").forEach((b) => icon(b, b.dataset.icon));
    this.q("[data-a=sub]")?.classList.toggle("is-active", !!(this.subOpen || this.sub));
    this.q("[data-a=tags]")?.classList.toggle("is-active", !!(this.tagsOpen || this.tags.length));
    if (keepFocus) this.q(".ds-taginput")?.focus();
  }
  tagAC() {
    const inp = this.q(".ds-taginput"), pop = this.q(".ds-tagpop");
    if (!inp || !pop) return;
    const q = normTag(inp.value).toLowerCase();
    const all = this.host.tagCounts();
    const items = all.filter(([t]) => !this.tags.includes(t) && (!q || t.toLowerCase().includes(q))).slice(0, 6);
    let h = `<div class="ds-ph">${q ? "\u6807\u7B7E" : "\u5E38\u7528\u6807\u7B7E"}</div>` + items.map(([t, n], i) => `<button type="button" class="${i === 0 ? "is-on" : ""}" data-a="pick" data-t="${esc(t)}">#${esc(t)}<i>${n}</i></button>`).join("");
    const nq = normTag(inp.value);
    if (nq && okTag(nq) && !all.some(([t]) => t === nq)) h += `<button type="button" class="${items.length ? "" : "is-on"}" data-a="pick" data-t="${esc(nq)}">\u65B0\u5EFA #${esc(nq)}</button>`;
    if (!items.length && !nq) {
      pop.hidden = true;
      return;
    }
    pop.innerHTML = h;
    pop.hidden = false;
  }
  addTag(raw) {
    const t = normTag(raw);
    if (okTag(t) && !this.tags.includes(t)) this.tags.push(t);
    this.tagsOpen = true;
    this.renderFields(true);
    const p = this.q(".ds-tagpop");
    if (p) p.hidden = true;
    this.update();
  }
  /* ---- 附件 ---- */
  renderAtts() {
    const el = this.q(".ds-att");
    el.innerHTML = this.atts.map((a, i) => a.kind === "img" ? `<span class="ds-a ds-a-img"><img alt="" src="${a.url}"><button type="button" class="ds-ax" data-a="rmatt" data-i="${i}" aria-label="\u79FB\u9664" data-icon="x"></button></span>` : `<span class="ds-a ds-a-voice"><audio src="${a.url}" preload="metadata"></audio><button type="button" class="ds-aplay" data-icon="play" aria-label="\u8BD5\u542C"></button>\u8BED\u97F3 ${fmtDur(a.dur || 0)}<button type="button" class="ds-ax" data-a="rmatt" data-i="${i}" aria-label="\u79FB\u9664" data-icon="x"></button></span>`).join("");
    el.querySelectorAll("[data-icon]").forEach((b) => icon(b, b.dataset.icon));
    el.querySelectorAll(".ds-aplay").forEach((btn) => btn.addEventListener("click", () => {
      const au = btn.parentElement.querySelector("audio");
      if (au.paused) {
        void au.play();
        icon(btn, "pause");
        au.onended = () => icon(btn, "play");
      } else {
        au.pause();
        icon(btn, "play");
      }
    }));
  }
  async toggleRec() {
    const btn = this.q("[data-a=rec]");
    if (this.rec) {
      this.stopRec(false);
      return;
    }
    const vt = pickVoiceType();
    if (!vt || !navigator.mediaDevices?.getUserMedia) {
      new import_obsidian.Notice("\u8FD9\u53F0\u8BBE\u5907\u4E0D\u652F\u6301\u5F55\u97F3");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      new import_obsidian.Notice("\u65E0\u6CD5\u4F7F\u7528\u9EA6\u514B\u98CE\uFF1A\u8BF7\u5728\u7CFB\u7EDF\u8BBE\u7F6E\u91CC\u5141\u8BB8 Obsidian \u4F7F\u7528\u9EA6\u514B\u98CE");
      return;
    }
    const mr = vt[0] ? new MediaRecorder(stream, { mimeType: vt[0] }) : new MediaRecorder(stream);
    const rec = { mr, chunks: [], t0: Date.now(), timer: 0, stream, ext: vt[1], type: vt[0] };
    mr.ondataavailable = (e) => {
      if (e.data.size) rec.chunks.push(e.data);
    };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (rec.discard) return;
      const type = mr.mimeType || rec.type || "audio/webm";
      const ext = /mp4|m4a|aac/.test(type) ? "m4a" : /ogg/.test(type) ? "ogg" : "webm";
      const blob = new Blob(rec.chunks, { type });
      this.atts.push({ kind: "voice", blob, ext, url: URL.createObjectURL(blob), dur: (Date.now() - rec.t0) / 1e3 });
      this.renderAtts();
      this.update();
    };
    mr.start(500);
    this.rec = rec;
    btn.classList.add("is-rec");
    btn.innerHTML = '<span class="ds-dot"></span><span class="ds-rt">0:00</span><span class="ds-stop" data-icon="square"></span>';
    icon(btn.querySelector(".ds-stop"), "square");
    btn.setAttribute("aria-label", "\u7ED3\u675F\u5F55\u97F3");
    rec.timer = window.setInterval(() => {
      const s = btn.querySelector(".ds-rt");
      if (s) s.textContent = fmtDur((Date.now() - rec.t0) / 1e3);
    }, 500);
  }
  stopRec(discard) {
    const r = this.rec;
    if (!r) return;
    this.rec = null;
    window.clearInterval(r.timer);
    r.discard = discard;
    try {
      r.mr.stop();
    } catch {
      r.stream.getTracks().forEach((t) => t.stop());
    }
    const btn = this.q("[data-a=rec]");
    if (btn) {
      btn.classList.remove("is-rec");
      btn.innerHTML = "";
      icon(btn, "mic");
      btn.setAttribute("aria-label", "\u5F55\u97F3");
    }
  }
  /* ---- 状态 ---- */
  state() {
    let body = this.ta.value.replace(/\s+$/, "");
    const lines = body.split("\n");
    const tags = [...this.tags];
    while (lines.length && isTagLine(lines[lines.length - 1])) {
      for (const t of lines.pop().match(/#[^\s#]+/g) || []) {
        const n = normTag(t);
        if (okTag(n) && !tags.includes(n)) tags.push(n);
      }
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    }
    body = lines.join("\n");
    const pending = normTag(this.q(".ds-taginput")?.value || "");
    if (okTag(pending) && !tags.includes(pending)) tags.push(pending);
    return { body, sub: this.sub.trim(), tags, when: this.when, atts: this.atts };
  }
  update() {
    const st = this.state(), w = st.when || /* @__PURE__ */ new Date(), hour = this.host.dayStartHour();
    const date = logicalDate(w, hour), actualDate = ymd(w), today = ymd(/* @__PURE__ */ new Date());
    const y = parseYmd(today);
    y.setDate(y.getDate() - 1);
    const late = w.getHours() < hour;
    const dayTxt = actualDate === today ? "\u4ECA\u5929" : actualDate === ymd(y) ? "\u6628\u5929" : recordDateLabel(actualDate, date);
    const meta = this.q(".ds-meta");
    if (meta) {
      meta.innerHTML = late ? `${recordDateLabel(actualDate, date)} ${hm(w)}` : `<span class="ds-full">${dayTxt} </span>${hm(w)}`;
      meta.classList.toggle("is-late", late);
      meta.setAttribute("aria-label", "\u5199\u5165\u65F6\u95F4\uFF0C\u70B9\u51FB\u4FEE\u6539");
    }
    this.box.classList.toggle("is-late", late);
    const hint = this.q(".ds-hint");
    if (hint) hint.textContent = late ? `\u51CC\u6668 ${hour} \u70B9\u524D\uFF0C\u8BB0\u5230 ${+date.slice(5, 7)}\u6708${+date.slice(8)}\u65E5` : "";
    const send = this.q(".ds-send");
    send.disabled = this.busy || !st.body.trim() && !st.tags.length && !st.sub && !st.atts.length;
    const pv = this.q(".ds-preview");
    if (!pv.hidden) {
      const p = this.host.previewFor(st);
      if (!p) {
        pv.innerHTML = '<div class="ds-pv-h">\u65E0\u6CD5\u9884\u89C8</div>';
        return;
      }
      const mark = p.mark.split("\n");
      const lines = p.text.split(/\r\n|\n|\r/);
      let hit = -1;
      for (let i = 0; i <= lines.length - mark.length && hit < 0; i++) if (mark.every((m, j) => lines[i + j] === m)) hit = i;
      pv.innerHTML = `<div class="ds-pv-h">\u5C06\u5199\u5165 <b>${esc(p.path)}</b>${p.created ? "\uFF08\u65B0\u5EFA\u6587\u4EF6\uFF09" : this.mode === "new" ? "\uFF08\u672B\u5C3E\u8FFD\u52A0\uFF09" : "\uFF08\u53EA\u6539\u8FD9\u4E00\u6761\uFF09"}${st.atts.length ? `\uFF0C\u53E6\u5B58 ${st.atts.length} \u4E2A\u9644\u4EF6\u5230\u9644\u4EF6\u6587\u4EF6\u5939` : ""}</div><pre>${lines.map((l, i) => `<span class="ds-ln${l && hit >= 0 && i >= hit && i < hit + mark.length ? " is-add" : ""}">${esc(l)}</span>`).join("\n")}</pre>`;
      const pre = pv.querySelector("pre"), a = pre.querySelector(".is-add");
      if (a) pre.scrollTop = Math.max(0, a.offsetTop - 24);
    }
  }
  async send() {
    if (this.busy || this.rec) {
      if (this.rec) new import_obsidian.Notice("\u5148\u7ED3\u675F\u5F55\u97F3");
      return;
    }
    const st = this.state();
    if (!st.body.trim() && !st.tags.length && !st.sub && !st.atts.length) {
      this.ta.focus();
      return;
    }
    this.busy = true;
    this.update();
    try {
      await this.host.submit(st);
      if (this.mode === "new") {
        this.ta.value = "";
        this.tags = [];
        this.atts.forEach((a) => URL.revokeObjectURL(a.url));
        this.atts = [];
        this.sub = "";
        this.when = null;
        this.subOpen = this.tagsOpen = false;
        this.renderAtts();
        this.renderFields();
        this.autosize();
        const pv = this.q(".ds-preview");
        if (pv) pv.hidden = true;
        this.q("[data-a=pv]")?.classList.remove("is-active");
        this.box.classList.remove("is-open");
      }
    } catch (e) {
      new import_obsidian.Notice("\u5199\u5165\u5931\u8D25\uFF1A" + (e.message || e));
    } finally {
      this.busy = false;
      if (this.box.isConnected) this.update();
    }
  }
};

// src/lightbox.ts
var import_obsidian2 = require("obsidian");
var Lightbox = class {
  constructor(parent, openOriginal) {
    this.openOriginal = openOriginal;
    __publicField(this, "el");
    __publicField(this, "img");
    __publicField(this, "items", []);
    __publicField(this, "i", 0);
    __publicField(this, "scale", 1);
    __publicField(this, "tx", 0);
    __publicField(this, "ty", 0);
    __publicField(this, "touch", null);
    __publicField(this, "lastTap", 0);
    __publicField(this, "onKey", (e) => {
      if (this.el.hidden) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.go(1);
      }
    });
    this.el = document.createElement("div");
    this.el.className = "ds-lb";
    this.el.hidden = true;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", "\u67E5\u770B\u56FE\u7247");
    this.el.innerHTML = `<div class="ds-lb-stage"><img class="ds-lb-img" alt=""></div>
      <div class="ds-lb-top"><span class="ds-lb-count"></span><span class="ds-sp"></span>
        <button type="button" class="ds-lb-btn" data-lb="orig" aria-label="\u6253\u5F00\u539F\u56FE\u6587\u4EF6" title="\u6253\u5F00\u539F\u56FE\u6587\u4EF6" data-icon="external-link"></button>
        <button type="button" class="ds-lb-btn" data-lb="close" aria-label="\u5173\u95ED" title="\u5173\u95ED\uFF08Esc\uFF09" data-icon="x"></button></div>
      <button type="button" class="ds-lb-btn ds-lb-nav ds-lb-prev" data-lb="prev" aria-label="\u4E0A\u4E00\u5F20" data-icon="chevron-left"></button>
      <button type="button" class="ds-lb-btn ds-lb-nav ds-lb-next" data-lb="next" aria-label="\u4E0B\u4E00\u5F20" data-icon="chevron-right"></button>`;
    this.el.querySelectorAll("[data-icon]").forEach((b) => (0, import_obsidian2.setIcon)(b, b.dataset.icon));
    this.img = this.el.querySelector(".ds-lb-img");
    parent.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lb]");
      if (b) {
        e.stopPropagation();
        const a = b.dataset.lb;
        if (a === "close") this.close();
        if (a === "prev") this.go(-1);
        if (a === "next") this.go(1);
        if (a === "orig") {
          const it = this.items[this.i];
          this.close();
          if (it) this.openOriginal(it.path);
        }
        return;
      }
      if (e.target === this.img) {
        const now = Date.now();
        if (now - this.lastTap < 300) {
          this.zoom(this.scale > 1 ? 1 : 2.5);
          this.lastTap = 0;
        } else this.lastTap = now;
        return;
      }
      if (this.scale === 1) this.close();
    });
    this.el.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        this.zoom(this.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      }
    }, { passive: false });
    this.el.addEventListener("touchstart", (e) => this.ts(e), { passive: false });
    this.el.addEventListener("touchmove", (e) => this.tm(e), { passive: false });
    this.el.addEventListener("touchend", (e) => this.te(e));
    document.addEventListener("keydown", this.onKey, true);
  }
  destroy() {
    document.removeEventListener("keydown", this.onKey, true);
    this.el.remove();
  }
  get isOpen() {
    return !this.el.hidden;
  }
  open(items, i) {
    if (!items.length) return;
    this.items = items;
    this.i = Math.max(0, Math.min(i, items.length - 1));
    this.el.hidden = false;
    this.el.classList.toggle("is-single", items.length === 1);
    this.show();
  }
  close() {
    this.el.hidden = true;
    this.img.removeAttribute("src");
    this.zoom(1);
  }
  go(d) {
    if (this.items.length < 2) return;
    this.i = (this.i + d + this.items.length) % this.items.length;
    this.show();
  }
  show() {
    this.zoom(1);
    this.img.src = this.items[this.i].url;
    this.img.alt = this.items[this.i].path.split("/").pop() || "";
    this.el.querySelector(".ds-lb-count").textContent = this.items.length > 1 ? `${this.i + 1} / ${this.items.length}` : "";
  }
  zoom(s) {
    this.scale = Math.max(1, Math.min(5, s));
    if (this.scale === 1) {
      this.tx = 0;
      this.ty = 0;
    }
    this.apply();
  }
  apply() {
    this.img.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    this.el.classList.toggle("is-zoomed", this.scale > 1);
  }
  /* ---- 触摸：单指左右滑切换（未缩放时）/ 拖动（已缩放时）；双指缩放 ---- */
  dist(e) {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
  ts(e) {
    const t = e.touches[0];
    this.touch = { x: t.clientX, y: t.clientY, t: Date.now(), px: t.clientX, py: t.clientY, tx0: this.tx, ty0: this.ty };
    if (e.touches.length === 2) {
      this.touch.d0 = this.dist(e);
      this.touch.s0 = this.scale;
      e.preventDefault();
    }
  }
  tm(e) {
    if (!this.touch) return;
    if (e.touches.length === 2 && this.touch.d0) {
      e.preventDefault();
      this.scale = Math.max(1, Math.min(5, this.touch.s0 * this.dist(e) / this.touch.d0));
      this.apply();
      return;
    }
    const t = e.touches[0];
    if (this.scale > 1) {
      e.preventDefault();
      this.tx = this.touch.tx0 + t.clientX - this.touch.x;
      this.ty = this.touch.ty0 + t.clientY - this.touch.y;
      this.apply();
    } else {
      e.preventDefault();
      this.img.style.transform = `translateX(${t.clientX - this.touch.x}px)`;
    }
  }
  te(e) {
    if (!this.touch) return;
    const t = e.changedTouches[0], dx = t.clientX - this.touch.x, dy = t.clientY - this.touch.y;
    const pinch = !!this.touch.d0;
    this.touch = e.touches.length ? this.touch : null;
    if (pinch || this.scale > 1) {
      if (this.scale <= 1.02) this.zoom(1);
      return;
    }
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) this.go(dx < 0 ? 1 : -1);
    else {
      this.apply();
      if (Math.abs(dy) > 90) this.close();
    }
  }
};

// src/view.ts
var VIEW_TYPE = "diary-stream-view";
var DiaryStreamView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    __publicField(this, "root");
    __publicField(this, "composer", null);
    __publicField(this, "editComposer", null);
    __publicField(this, "S", { q: "", filter: "", tag: null, date: null, month: null, editing: null, menu: null, confirm: null, limit: 30, showCal: false });
    __publicField(this, "pending", false);
    __publicField(this, "off", null);
    __publicField(this, "ro", null);
    __publicField(this, "toastTimer", 0);
    __publicField(this, "lightbox", null);
    __publicField(this, "toTopBtn", null);
    __publicField(this, "onScroll", () => {
      const sc = this.contentEl, anchor = this.root?.querySelector(".ds-anchor");
      if (!anchor) return;
      this.root.toggleClass("is-stuck", sc.scrollTop > anchor.offsetTop + 4);
      this.toTopBtn?.toggleClass("is-shown", sc.scrollTop > sc.clientHeight * 0.9);
    });
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "\u65E5\u8BB0\u6D41";
  }
  getIcon() {
    return "book-open";
  }
  get store() {
    return this.plugin.store;
  }
  get settings() {
    return this.plugin.data.settings;
  }
  async onOpen() {
    const c = this.contentEl;
    c.empty();
    c.addClass("ds-view");
    this.root = c.createDiv({ cls: "ds-root" });
    this.root.innerHTML = `
      <div class="ds-wrap">
        <div class="ds-mhead"><div class="ds-brand"><span class="ds-logo" data-icon="book-open"></span>\u65E5\u8BB0</div><button type="button" class="ds-calbtn" data-act="togglecal"><span data-icon="calendar"></span>\u65E5\u5386</button></div>
        <aside class="ds-side">
          <div class="ds-brand ds-side-brand"><span class="ds-logo" data-icon="book-open"></span>\u65E5\u8BB0</div>
          <div class="ds-box"><div class="ds-stats"></div><div class="ds-heat"></div></div>
          <div class="ds-box"><div class="ds-mcal"></div></div>
          <div class="ds-box ds-only-wide"><h5>\u7B5B\u9009</h5><div class="ds-chips ds-filterlist"></div></div>
          <div class="ds-box ds-only-wide"><h5>\u6807\u7B7E</h5><div class="ds-taglist"></div></div>
        </aside>
        <main class="ds-main">
          <div class="ds-composer"></div>
          <div class="ds-anchor"></div>
          <div class="ds-sticky"><div class="ds-top"><label class="ds-search"><span data-icon="search"></span><input type="search" class="ds-q" placeholder="\u641C\u7D22\u5185\u5BB9\u3001\u526F\u6807\u9898\u3001#\u6807\u7B7E\u2026" enterkeyhint="search"></label>
            <div class="ds-chips ds-hscroll ds-only-narrow ds-mchips"></div></div>
          <div class="ds-filterbar" hidden></div></div>
          <div class="ds-stream"></div>
        </main>
      </div>
      <div class="ds-toast" hidden></div>
      <div class="ds-confirm" hidden></div>`;
    this.icons(this.root);
    this.containerEl.addClass("ds-leaf");
    this.toTopBtn = this.containerEl.createEl("button", { cls: "ds-totop", attr: { type: "button", "aria-label": "\u56DE\u5230\u9876\u90E8", title: "\u56DE\u5230\u9876\u90E8" } });
    (0, import_obsidian3.setIcon)(this.toTopBtn, "arrow-up");
    this.toTopBtn.addEventListener("click", () => {
      this.contentEl.scrollTo({ top: 0, behavior: "smooth" });
    });
    this.contentEl.addEventListener("scroll", this.onScroll, { passive: true });
    this.lightbox = new Lightbox(this.containerEl, (path) => {
      const f = this.store.fileAt(path);
      if (f) void this.app.workspace.getLeaf("tab").openFile(f);
    });
    this.composer = new Composer(this.root.querySelector(".ds-composer"), {
      tagCounts: () => this.tagCounts(),
      dayStartHour: () => this.settings.dayStartHour,
      previewFor: (st) => this.previewNew(st),
      submit: async (st) => {
        const r = await this.store.append(st.when || /* @__PURE__ */ new Date(), { sub: st.sub, body: st.body, tags: st.tags }, st.atts);
        this.S.date = null;
        this.S.filter = "";
        this.S.tag = null;
        this.S.q = "";
        this.root.querySelector(".ds-q").value = "";
        this.renderAll();
        this.toast(`\u5DF2\u5199\u5165 ${r.path}${r.created ? "\uFF08\u65B0\u5EFA\uFF09" : ""}`);
        this.flash(r.path);
      }
    }, "new");
    const q = this.root.querySelector(".ds-q");
    q.addEventListener("input", () => {
      this.S.q = q.value;
      this.S.limit = 30;
      this.renderStream();
    });
    this.root.addEventListener("click", (e) => this.onClick(e));
    const updateWidth = () => {
      this.root.toggleClass("is-narrow", this.root.clientWidth < 760);
      this.root.toggleClass("is-compact", this.root.clientWidth < 480);
    };
    this.ro = new ResizeObserver(updateWidth);
    this.ro.observe(this.root);
    updateWidth();
    this.off = this.store.onChange(() => {
      if (this.S.editing || this.S.confirm) {
        this.pending = true;
        return;
      }
      this.renderAll();
    });
    if (!this.store.loaded) await this.store.loadAll();
    this.renderAll();
  }
  async onClose() {
    this.contentEl.removeEventListener("scroll", this.onScroll);
    this.toTopBtn?.remove();
    this.lightbox?.destroy();
    this.off?.();
    this.ro?.disconnect();
    this.composer?.destroy();
    this.editComposer?.destroy();
    this.root?.querySelectorAll("audio").forEach((a) => a.pause());
  }
  icons(el) {
    el.querySelectorAll("[data-icon]").forEach((x) => {
      const n = x.dataset.icon;
      if (!x.firstChild || x.classList.contains("ds-vplay")) (0, import_obsidian3.setIcon)(x, n);
    });
  }
  /* ---------------- 数据 ---------------- */
  days() {
    return this.store.list();
  }
  allSections() {
    return this.days().flatMap((d) => d.sections);
  }
  tagCounts() {
    const c = {};
    this.allSections().forEach((s) => (s.allTags || s.tags).forEach((t) => c[t] = (c[t] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }
  filters() {
    const months = [...new Set(this.days().map((d) => d.date.slice(0, 7)))];
    const nowY = String((/* @__PURE__ */ new Date()).getFullYear());
    return [
      { key: "", label: "\u5168\u90E8", fn: () => true },
      ...months.slice(0, 6).map((m) => ({ key: "m:" + m, label: m.startsWith(nowY) ? `${+m.slice(5)}\u6708` : `${m.slice(2, 4)}\u5E74${+m.slice(5)}\u6708`, fn: (s) => s.date.startsWith(m) })),
      { key: "f:img", label: "\u6709\u56FE\u7247", fn: (s) => s.hasImg },
      { key: "f:voice", label: "\u6709\u8BED\u97F3", fn: (s) => s.hasVoice },
      { key: "f:buji", label: "\u8865\u8BB0", fn: (s) => s.buji }
    ];
  }
  fdef(k2) {
    return this.filters().find((f) => f.key === k2) || this.filters()[0];
  }
  visibleDays() {
    const q = this.S.q.trim().toLowerCase(), pass = this.fdef(this.S.filter).fn;
    const nf = this.settings.newestFirst;
    const ds = this.days().filter((d) => !this.S.date || d.date === this.S.date).map((d) => ({ ...d, sections: d.sections.filter((s) => pass(s) && (!this.S.tag || (s.allTags || s.tags).includes(this.S.tag)) && (!q || `${s.sub} ${s.text} ${(s.allTags || s.tags).map((t) => "#" + t).join(" ")}`.toLowerCase().includes(q))) })).filter((d) => d.sections.length);
    for (const d of ds) if (nf) d.sections = [...d.sections].reverse();
    return nf ? ds : ds.reverse();
  }
  section(key) {
    const i = key.lastIndexOf("#");
    const d = this.store.days.get(key.slice(0, i));
    return d?.sections[+key.slice(i + 1)] || null;
  }
  previewNew(st) {
    const w = st.when || /* @__PURE__ */ new Date();
    const date = logicalDate(w, this.settings.dayStartHour);
    const path = this.store.pathFor(date);
    const existing = this.store.texts.get(path) ?? null;
    const embeds = st.atts.map((a, i) => `![[${this.store.attFolder}/${a.kind === "img" ? "IMG" : "\u5F55\u97F3"}_\u2026${i ? "_" + i : ""}.${a.ext}]]`);
    const entry = { ...entryTime(w, this.settings.dayStartHour), sub: st.sub, body: [st.body, ...embeds].filter(Boolean).join("\n"), tags: st.tags };
    return { path, created: existing == null, text: planAppend(existing, date, entry, this.settings.sourceValue, this.settings.dayStartHour, this.store.ownedFor(path)), mark: sectionLines(entry).join("\n") };
  }
  /* ---------------- 渲染 ---------------- */
  renderAll() {
    this.pending = false;
    this.renderStats();
    this.renderChips();
    this.renderHeat();
    this.renderMonth();
    this.renderStream();
  }
  fmtDate(d) {
    const dt = parseYmd(d);
    return `${dt.getMonth() + 1}\u6708${dt.getDate()}\u65E5 ${WD[dt.getDay()]}`;
  }
  renderStats() {
    const all = this.allSections(), days = this.days();
    const set = new Set(days.map((d) => d.date));
    let streak = 0;
    for (let d = parseYmd(days[0]?.date || "1970-01-01"); set.has(ymd(d)); d.setDate(d.getDate() - 1)) streak++;
    this.root.querySelector(".ds-stats").innerHTML = `<div><b>${days.length}</b><span>\u5929</span></div><div><b>${all.length}</b><span>\u6761</span></div><div><b>${this.tagCounts().length}</b><span>\u6807\u7B7E</span></div><div><b>${streak}</b><span>\u8FDE\u7EED</span></div>`;
  }
  renderChips() {
    const all = this.allSections(), tc = this.tagCounts();
    const chip = (f) => `<button type="button" class="ds-chip${this.S.filter === f.key ? " is-on" : ""}" data-chip="${f.key}">${esc(f.label)}${f.key ? `<i>${all.filter(f.fn).length}</i>` : ""}</button>`;
    const tchip = ([t, n]) => `<button type="button" class="ds-chip ds-tagchip${this.S.tag === t ? " is-on" : ""}" data-tagchip="${esc(t)}">#${esc(t)}<i>${n}</i></button>`;
    this.root.querySelector(".ds-filterlist").innerHTML = this.filters().map(chip).join("");
    this.root.querySelector(".ds-taglist").innerHTML = tc.length ? tc.map(tchip).join("") : '<span class="ds-muted">\u8FD8\u6CA1\u6709\u6807\u7B7E\u3002\u5199\u65E5\u8BB0\u65F6\u70B9 # \u6DFB\u52A0\u3002</span>';
    this.root.querySelector(".ds-mchips").innerHTML = this.filters().map(chip).join("") + (tc.length ? '<span class="ds-sep"></span>' + tc.map(tchip).join("") : "");
  }
  renderHeat() {
    const by = {};
    const days = this.days();
    days.forEach((d) => by[d.date] = d.size);
    const sizes = days.map((d) => d.size).sort((a, b) => a - b);
    const Q = (p) => sizes[Math.floor((sizes.length - 1) * p)] || 0;
    const lv = (n) => n === 0 ? 0 : n <= Q(0.33) ? 1 : n <= Q(0.7) ? 2 : 3;
    const today = logicalDate(/* @__PURE__ */ new Date(), this.settings.dayStartHour);
    const end = parseYmd([today, days[0]?.date || today].sort().pop()), weeks = 12;
    const start = new Date(end);
    start.setDate(end.getDate() - end.getDay() - 7 * (weeks - 1));
    const last = new Date(end);
    last.setDate(end.getDate() + (6 - end.getDay()));
    let cells = "";
    for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
      const k2 = ymd(d), n = by[k2] || 0;
      cells += `<button type="button" class="ds-hc l${lv(n)}${this.S.date === k2 ? " is-sel" : ""}${k2 === today ? " is-today" : ""}" ${n ? `data-date="${k2}"` : "disabled"} aria-label="${k2}${n ? " \xB7 " + (n / 1024).toFixed(1) + "KB" : ""}" title="${k2}"></button>`;
    }
    this.root.querySelector(".ds-heat").innerHTML = `<div class="ds-hgrid">${cells}</div><div class="ds-hlegend"><span>\u8FD1 12 \u5468</span><span class="ds-sp"></span><span>\u5C11</span><i class="ds-hc l0"></i><i class="ds-hc l1"></i><i class="ds-hc l2"></i><i class="ds-hc l3"></i><span>\u591A</span></div>`;
  }
  renderMonth() {
    const days = this.days();
    if (!this.S.month) this.S.month = (days[0]?.date || ymd(/* @__PURE__ */ new Date())).slice(0, 7);
    const [y, m] = this.S.month.split("-").map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate();
    const has = new Set(days.map((d) => d.date));
    let h = `<div class="ds-mhd"><button type="button" class="clickable-icon" data-mnav="-1" data-icon="chevron-left" aria-label="\u4E0A\u4E2A\u6708"></button><b>${y} \u5E74 ${m} \u6708</b><button type="button" class="clickable-icon" data-mnav="1" data-icon="chevron-right" aria-label="\u4E0B\u4E2A\u6708"></button></div><div class="ds-mgrid">`;
    h += "\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D".split("").map((w) => `<span class="ds-w">${w}</span>`).join("");
    for (let i = 0; i < first.getDay(); i++) h += "<span></span>";
    for (let d = 1; d <= n; d++) {
      const k2 = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      h += has.has(k2) ? `<button type="button" class="ds-md is-has${this.S.date === k2 ? " is-sel" : ""}" data-date="${k2}">${d}</button>` : `<span class="ds-md">${d}</span>`;
    }
    const el = this.root.querySelector(".ds-mcal");
    el.innerHTML = h + "</div>";
    this.icons(el);
  }
  /** dayTags：当天只在属性里的标签，放在这一天最下面那张卡片里（不放在卡片外面） */
  card(s, dayTags = []) {
    const key = `${s.path}#${s.idx}`;
    if (this.S.editing === key) return `<article class="ds-card is-editing" data-key="${esc(key)}"><div class="ds-edhost"></div></article>`;
    const long = s.text.length > 160 || s.hasImg && s.text.length > 80 || s.content.split("\n").length > 9;
    const when = s.time ? `<span class="ds-t">${esc(sectionTimeLabel(s))}</span>${s.late ? '<span class="ds-late" title="\u51CC\u6668\u8BB0\u5F55\uFF0C\u5F52\u5230\u524D\u4E00\u5929">\u51CC\u6668</span>' : ""}${s.sub ? '<span class="ds-bar-sep" aria-hidden="true">|</span>' : ""}` : "";
    const sub = s.sub ? `<span class="ds-sub">${highlight(`>${esc(s.sub)}<`, this.S.q).slice(1, -1)}</span>` : "";
    const ctx = { resolve: (l) => this.store.resolve(l, s.path) };
    const extra = s.tags.filter((t) => !s.tagLine.includes(t));
    const own = [...s.tagLine, ...extra];
    const tags = [...own, ...dayTags.filter((t) => !own.includes(t))];
    return `<article class="ds-card${s.buji ? " is-buji" : ""}" data-key="${esc(key)}">
      <header class="ds-chead">${when}${sub}<span class="ds-badges">${s.hasVoice ? '<span data-icon="mic"></span>' : ""}${s.hasImg ? '<span data-icon="image"></span>' : ""}</span>
        <button type="button" class="ds-kebab clickable-icon" data-menu="${esc(key)}" aria-label="\u66F4\u591A" data-icon="more-horizontal"></button>
        ${this.S.menu === key ? `<div class="ds-menu" role="menu"><button type="button" data-editkey="${esc(key)}"><span data-icon="pencil"></span>\u7F16\u8F91</button><button type="button" data-delkey="${esc(key)}" class="mod-warning"><span data-icon="trash-2"></span>\u5220\u9664</button><button type="button" data-openkey="${esc(key)}"><span data-icon="file-text"></span>\u6253\u5F00\u6E90\u6587\u4EF6</button></div>` : ""}
      </header>
      ${tags.length ? `<div class="ds-tags">${tags.map((t) => `<button type="button" class="ds-tag${own.includes(t) ? "" : " ds-dtag"}${this.S.tag === t ? " is-on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>` : ""}
      <div class="ds-body${long ? " is-clamp" : ""}">${highlight(renderMarkdown(s.content, ctx), this.S.q)}</div>
      ${long ? '<button type="button" class="ds-more">\u5C55\u5F00\u5168\u6587 \u2193</button>' : ""}
    </article>`;
  }
  dayLabel(d) {
    const dt = parseYmd(d);
    return `${dt.getMonth() + 1}\u6708${dt.getDate()}\u65E5<span class="ds-wd"> \xB7 \u661F\u671F${"\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D"[dt.getDay()]}</span>`;
  }
  renderStream() {
    const all = this.visibleDays(), days = all.slice(0, this.S.limit), el = this.root.querySelector(".ds-stream");
    el.querySelectorAll("audio").forEach((a) => a.pause());
    if (!this.store.loaded) el.innerHTML = '<div class="ds-empty">\u8BFB\u53D6\u4E2D\u2026</div>';
    else if (!this.days().length) el.innerHTML = `<div class="ds-empty">\u300C${esc(this.store.folder)}\u300D\u91CC\u8FD8\u6CA1\u6709\u65E5\u8BB0\u3002<br>\u5728\u4E0A\u9762\u5199\u4E0B\u7B2C\u4E00\u6761\u5427\u3002</div>`;
    else if (!all.length) el.innerHTML = '<div class="ds-empty">\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u65E5\u8BB0</div>';
    else el.innerHTML = days.map((d) => `<section class="ds-day" data-date="${d.date}"><div class="ds-day-head"><span class="ds-dfull">${this.dayLabel(d.date)}</span><span class="ds-dcount">${d.sections.length} \u6761</span><span class="ds-dline"></span></div>${d.sections.map((s, i) => this.card(s, i === d.sections.length - 1 ? d.dayTags || [] : [])).join("")}</section>`).join("") + (all.length > days.length ? `<button type="button" class="ds-loadmore" data-act="more">\u52A0\u8F7D\u66F4\u65E9\u7684\u65E5\u8BB0\uFF08\u8FD8\u6709 ${all.length - days.length} \u5929\uFF09</button>` : "");
    this.icons(el);
    this.wireMedia(el);
    const n = all.reduce((a, d) => a + d.sections.length, 0);
    const f = this.root.querySelector(".ds-filterbar");
    const parts = [];
    if (this.S.date) parts.push(this.fmtDate(this.S.date));
    if (this.S.filter) parts.push(this.fdef(this.S.filter).label);
    if (this.S.tag) parts.push("#" + this.S.tag);
    if (this.S.q) parts.push("\u201C" + this.S.q + "\u201D");
    f.hidden = !parts.length;
    f.innerHTML = parts.length ? `<span>\u7B5B\u9009\uFF1A${parts.map(esc).join(" \xB7 ")}\uFF08${n} \u6761\uFF09</span><button type="button" data-act="clear">\u6E05\u9664</button>` : "";
    this.editComposer?.destroy();
    this.editComposer = null;
    const host = el.querySelector(".ds-edhost");
    if (host && this.S.editing) {
      const s = this.section(this.S.editing);
      if (!s) {
        this.S.editing = null;
        return;
      }
      this.editComposer = new Composer(host, {
        tagCounts: () => this.tagCounts(),
        dayStartHour: () => this.settings.dayStartHour,
        previewFor: (st) => {
          const text = this.store.texts.get(s.path);
          if (text == null) return null;
          try {
            const out = planEdit(text, refOf(s), { sub: st.sub, body: st.body, tags: st.tags }, this.settings.dayStartHour, this.store.ownedFor(s.path));
            const re = this.store.days.get(s.path);
            return { path: s.path, created: false, text: out, mark: sectionLines({ time: s.time, timeDate: s.timeDate, sub: st.sub || (s.time ? "" : s.sub), body: st.body, tags: st.tags }, !s.hdr).join("\n") };
          } catch {
            return null;
          }
        },
        submit: async (st) => {
          try {
            await this.store.edit(s, { sub: st.sub, body: st.body, tags: st.tags }, st.atts);
          } catch (e) {
            if (e instanceof ConflictError) {
              new import_obsidian3.Notice(e.message);
              this.S.editing = null;
              this.renderAll();
              return;
            }
            throw e;
          }
          this.S.editing = null;
          this.renderAll();
          this.toast("\u5DF2\u4FDD\u5B58");
        },
        cancel: () => {
          this.S.editing = null;
          if (this.pending) this.renderAll();
          else this.renderStream();
        }
      }, "edit", { body: s.content, sub: s.sub, tags: s.tagLine, timeLabel: `${sectionTimeLabel(s) || "\u65E0\u65F6\u95F4"} \xB7 ${this.fmtDate(s.date)}`, hasHeader: !!s.hdr });
      const ta = host.querySelector("textarea");
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }
  }
  wireMedia(el) {
    el.querySelectorAll(".ds-voice").forEach((v) => {
      const au = v.querySelector("audio"), btn = v.querySelector(".ds-vplay"), dur = v.querySelector(".ds-vdur"), bar = v.querySelector(".ds-vbar i");
      const fmt = (s) => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--";
      au.addEventListener("loadedmetadata", () => {
        dur.textContent = fmt(au.duration);
      });
      au.addEventListener("timeupdate", () => {
        if (au.duration) bar.style.width = `${au.currentTime / au.duration * 100}%`;
        dur.textContent = fmt(au.paused ? au.duration : au.currentTime);
      });
      au.addEventListener("ended", () => {
        (0, import_obsidian3.setIcon)(btn, "play");
        v.removeClass("is-playing");
        bar.style.width = "0";
        dur.textContent = fmt(au.duration);
      });
      au.addEventListener("error", () => {
        dur.textContent = "\u65E0\u6CD5\u64AD\u653E";
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (au.paused) {
          this.root.querySelectorAll(".ds-voice audio").forEach((o) => {
            if (o !== au) o.pause();
          });
          void au.play();
          (0, import_obsidian3.setIcon)(btn, "pause");
          v.addClass("is-playing");
        } else {
          au.pause();
          (0, import_obsidian3.setIcon)(btn, "play");
          v.removeClass("is-playing");
        }
      });
      au.addEventListener("pause", () => {
        (0, import_obsidian3.setIcon)(btn, "play");
        v.removeClass("is-playing");
      });
    });
  }
  /** 筛选变化后回到搜索框位置（不把撰写框也滚走，除非本来就在上面） */
  toTop() {
    const top = this.root.querySelector(".ds-anchor");
    const y = Math.max(0, top.offsetTop - 12);
    if (this.contentEl.scrollTop > y) this.contentEl.scrollTop = y;
  }
  toast(msg, action) {
    const t = this.root.querySelector(".ds-toast");
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" data-act="toastaction">${esc(action.label)}</button>` : ""}`;
    t.hidden = false;
    t._run = action?.run;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      t.hidden = true;
    }, action ? 8e3 : 2600);
  }
  flash(path) {
    window.setTimeout(() => {
      const d = this.store.days.get(path);
      if (!d) return;
      const key = `${path}#${d.sections.length - 1}`;
      const el = this.root.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (el) {
        el.addClass("is-flash");
        el.scrollIntoView({ block: "nearest" });
      }
    }, 30);
  }
  renderConfirm() {
    const el = this.root.querySelector(".ds-confirm");
    const s = this.S.confirm ? this.section(this.S.confirm) : null;
    if (!s) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    const d = this.store.days.get(s.path);
    const last = d && d.sections.length === 1;
    el.hidden = false;
    el.innerHTML = `<div class="ds-cf" role="dialog" aria-modal="true"><h4>\u5220\u9664\u8FD9\u6761\u65E5\u8BB0\uFF1F</h4>
      <p>\u5C06\u4ECE <code>${esc(s.path)}</code> \u4E2D\u5220\u9664\u300C${esc(s.hdr ? s.hdr.replace(/^##\s+/, "") : "\u8FD9\u4E00\u5929\u7684\u5185\u5BB9")}\u300D${last ? "\u3002\u8FD9\u662F\u5F53\u5929\u552F\u4E00\u4E00\u6761\uFF0C\u6574\u4E2A\u6587\u4EF6\u4F1A\u79FB\u5230 Obsidian \u7684\u56DE\u6536\u7AD9\uFF08.trash\uFF09\u3002" : "\u8FD9\u4E00\u8282\uFF0C\u5176\u4ED6\u5185\u5BB9\u4E0D\u52A8\u3002"}\u9644\u4EF6\u6587\u4EF6\u4F1A\u4FDD\u7559\u3002\u5220\u9664\u540E\u51E0\u79D2\u5185\u53EF\u4EE5\u64A4\u9500\uFF0C\u4E5F\u80FD\u5728\u63D2\u4EF6\u8BBE\u7F6E\u7684\u300C\u6700\u8FD1\u5220\u9664\u300D\u91CC\u627E\u56DE\u3002</p>
      <div class="ds-cf-btns"><button type="button" data-act="cf-cancel">\u53D6\u6D88</button><button type="button" class="mod-warning" data-act="cf-ok">\u5220\u9664</button></div></div>`;
  }
  /* ---------------- 交互 ---------------- */
  async onClick(e) {
    const target = e.target;
    if (target.closest(".ds-composer") || target.closest(".ds-edhost")) return;
    const a = target.closest("a");
    if (a?.classList.contains("ds-itag")) {
      e.preventDefault();
      this.S.tag = this.S.tag === a.dataset.tag ? null : a.dataset.tag;
      this.renderAll();
      return;
    }
    if (a?.classList.contains("internal-link")) {
      e.preventDefault();
      const card = a.closest(".ds-card");
      const s = card ? this.section(card.dataset.key) : null;
      void this.app.workspace.openLinkText(a.dataset.href, s?.path || "", true);
      return;
    }
    const img = target.closest(".ds-img img");
    if (img) {
      const scope = img.closest(".ds-card") || img.closest(".ds-body") || this.root;
      const imgs = [...scope.querySelectorAll(".ds-img img")];
      const items = imgs.map((x) => ({ url: x.src, path: x.dataset.path || "" }));
      this.lightbox?.open(items, Math.max(0, imgs.indexOf(img)));
      return;
    }
    const t = target.closest("button");
    if (this.S.menu && !(t && (t.dataset.menu || t.closest(".ds-menu")))) {
      this.S.menu = null;
      this.renderStream();
    }
    if (!t) return;
    const act = t.dataset.act;
    if (t.classList.contains("ds-more")) {
      const b = t.previousElementSibling;
      const open = b.classList.toggle("is-open");
      t.textContent = open ? "\u6536\u8D77 \u2191" : "\u5C55\u5F00\u5168\u6587 \u2193";
      return;
    }
    if (t.dataset.menu) {
      this.S.menu = this.S.menu === t.dataset.menu ? null : t.dataset.menu;
      this.renderStream();
      return;
    }
    if (t.dataset.editkey) {
      this.S.menu = null;
      this.S.editing = t.dataset.editkey;
      this.renderStream();
      return;
    }
    if (t.dataset.delkey) {
      this.S.menu = null;
      this.S.confirm = t.dataset.delkey;
      this.renderStream();
      this.renderConfirm();
      return;
    }
    if (t.dataset.openkey) {
      const s = this.section(t.dataset.openkey);
      this.S.menu = null;
      this.renderStream();
      const f = s && this.store.fileAt(s.path);
      if (f) await this.app.workspace.getLeaf("tab").openFile(f, { eState: { line: s.start } });
      return;
    }
    if (act === "cf-cancel") {
      this.S.confirm = null;
      this.renderConfirm();
      if (this.pending) this.renderAll();
      return;
    }
    if (act === "cf-ok") {
      const s = this.S.confirm ? this.section(this.S.confirm) : null;
      this.S.confirm = null;
      this.renderConfirm();
      if (!s) return;
      try {
        const r = await this.store.remove(s);
        await this.plugin.rememberDelete(r);
        this.renderAll();
        this.toast(r.trashed ? "\u5DF2\u5220\u9664\uFF08\u5F53\u5929\u6587\u4EF6\u5DF2\u79FB\u5230\u56DE\u6536\u7AD9\uFF09" : "\u5DF2\u5220\u9664\u8FD9\u4E00\u6761", { label: "\u64A4\u9500", run: () => {
          void this.store.undo(r).then(() => {
            this.renderAll();
            this.toast("\u5DF2\u64A4\u9500\u5220\u9664");
          });
        } });
      } catch (err) {
        new import_obsidian3.Notice(err.message || String(err));
        this.renderAll();
      }
      return;
    }
    if (act === "toastaction") {
      const box = this.root.querySelector(".ds-toast");
      box.hidden = true;
      box._run?.();
      return;
    }
    if (act === "clear") {
      this.S.q = "";
      this.S.filter = "";
      this.S.tag = null;
      this.S.date = null;
      this.root.querySelector(".ds-q").value = "";
      this.renderAll();
      this.toTop();
      return;
    }
    if (act === "more") {
      this.S.limit += 30;
      this.renderStream();
      return;
    }
    if (act === "togglecal") {
      this.S.showCal = !this.S.showCal;
      this.root.toggleClass("show-cal", this.S.showCal);
      return;
    }
    if (t.dataset.chip !== void 0) {
      this.S.filter = t.dataset.chip;
      this.S.limit = 30;
      this.renderAll();
      this.toTop();
      return;
    }
    if (t.dataset.tagchip !== void 0 || t.dataset.tag) {
      const v = t.dataset.tagchip ?? t.dataset.tag;
      this.S.tag = this.S.tag === v ? null : v;
      this.S.limit = 30;
      this.renderAll();
      this.toTop();
      return;
    }
    if (t.dataset.date) {
      this.S.date = this.S.date === t.dataset.date ? null : t.dataset.date;
      this.S.limit = 30;
      this.renderAll();
      this.toTop();
      return;
    }
    if (t.dataset.mnav) {
      const [y, m] = this.S.month.split("-").map(Number);
      this.S.month = ymd(new Date(y, m - 1 + Number(t.dataset.mnav), 1)).slice(0, 7);
      this.renderMonth();
      return;
    }
  }
};

// src/store.ts
var import_obsidian4 = require("obsidian");
var DATE_FILE = /^\d{4}-\d{2}-\d{2}\.md$/;
var DiaryStore = class {
  constructor(app, settings, owned = memOwned()) {
    this.app = app;
    this.settings = settings;
    this.owned = owned;
    __publicField(this, "days", /* @__PURE__ */ new Map());
    __publicField(this, "texts", /* @__PURE__ */ new Map());
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "timer", null);
    __publicField(this, "loaded", false);
  }
  ownedFor(path) {
    return this.owned.get(path);
  }
  /** 写入前后对比 frontmatter tags：新增的记为「插件加的」，被去掉的从记录里删掉 */
  track(path, before, after) {
    const b = before == null ? [] : fmTagList(before), a = fmTagList(after);
    const add = a.filter((t) => !b.includes(t) && t !== DEFAULT_TAG), rm = b.filter((t) => !a.includes(t));
    if (!add.length && !rm.length) return;
    const cur = this.owned.get(path).filter((t) => !rm.includes(t));
    for (const t of add) if (!cur.includes(t)) cur.push(t);
    this.owned.set(path, cur);
  }
  get folder() {
    return (0, import_obsidian4.normalizePath)(this.settings().diaryFolder || "\u65E5\u8BB0");
  }
  get attFolder() {
    return (0, import_obsidian4.normalizePath)(this.settings().attachmentFolder || "\u9644\u4EF6");
  }
  get hour() {
    return this.settings().dayStartHour;
  }
  /** 只认 日记/ 根目录下的 YYYY-MM-DD.md（子文件夹、其他记录/ 都忽略） */
  isDiaryPath(path) {
    const f = this.folder + "/";
    return path.startsWith(f) && !path.slice(f.length).includes("/") && DATE_FILE.test(path.slice(f.length));
  }
  guard(path) {
    const p = (0, import_obsidian4.normalizePath)(path);
    if (!(p.startsWith(this.folder + "/") || p.startsWith(this.attFolder + "/"))) throw new Error(`\u62D2\u7EDD\u5199\u5165\u65E5\u8BB0/\u9644\u4EF6\u6587\u4EF6\u5939\u4EE5\u5916\u7684\u8DEF\u5F84\uFF1A${p}`);
    if (p.split("/").includes("..")) throw new Error("\u975E\u6CD5\u8DEF\u5F84");
    return p;
  }
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  emit() {
    if (this.timer != null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.listeners.forEach((f) => f());
    }, 120);
  }
  async loadAll() {
    this.days.clear();
    this.texts.clear();
    const files = this.app.vault.getMarkdownFiles().filter((f) => this.isDiaryPath(f.path));
    await Promise.all(files.map((f) => this.readFile(f)));
    this.loaded = true;
    this.emit();
  }
  async readFile(f) {
    const text = await this.app.vault.cachedRead(f);
    this.texts.set(f.path, text);
    let day = parseDay(f.path, text, this.hour);
    try {
      const fm = this.app.metadataCache.getFileCache?.(f)?.frontmatter;
      if (fm) day = withFmTags(day, normFmTags(fm.tags ?? fm.tag));
    } catch {
    }
    this.days.set(f.path, day);
    const own = this.owned.get(f.path), fmNow = fmTagList(text);
    if (own.length && own.some((t) => !fmNow.includes(t)) && text) this.owned.set(f.path, own.filter((t) => fmNow.includes(t)));
  }
  /* ---- vault 事件（含其他设备同步过来的修改） ---- */
  async onFileChanged(file) {
    if (file instanceof import_obsidian4.TFile && this.isDiaryPath(file.path)) {
      await this.readFile(file);
      this.emit();
    }
  }
  onFileDeleted(file) {
    if (this.days.delete(file.path)) {
      this.texts.delete(file.path);
      this.emit();
    }
  }
  async onFileRenamed(file, oldPath) {
    const had = this.days.delete(oldPath);
    this.texts.delete(oldPath);
    const own = this.owned.get(oldPath);
    if (own.length) {
      this.owned.set(oldPath, []);
      if (file instanceof import_obsidian4.TFile) this.owned.set(file.path, own);
    }
    if (file instanceof import_obsidian4.TFile && this.isDiaryPath(file.path)) await this.readFile(file);
    if (had || this.isDiaryPath(file.path)) this.emit();
  }
  list() {
    return [...this.days.values()].sort((a, b) => b.date.localeCompare(a.date));
  }
  pathFor(date) {
    return `${this.folder}/${date}.md`;
  }
  fileAt(path) {
    const f = this.app.vault.getAbstractFileByPath(path);
    return f instanceof import_obsidian4.TFile ? f : null;
  }
  resolve(link, sourcePath) {
    const clean = link.split("|")[0].replace(/[#^].*$/, "").trim();
    const mc = this.app.metadataCache;
    const base = clean.split("/").pop() || clean;
    const f = mc.getFirstLinkpathDest(clean, sourcePath) || this.fileAt((0, import_obsidian4.normalizePath)(clean)) || (base !== clean ? mc.getFirstLinkpathDest(base, sourcePath) : null);
    return f ? { url: this.app.vault.getResourcePath(f), path: f.path } : null;
  }
  async ensureFolder(folder) {
    const parts = (0, import_obsidian4.normalizePath)(folder).split("/");
    let cur = "";
    for (const p of parts) {
      cur = cur ? `${cur}/${p}` : p;
      const ex = this.app.vault.getAbstractFileByPath(cur);
      if (!ex) {
        try {
          await this.app.vault.createFolder(cur);
        } catch (e) {
          if (!(this.app.vault.getAbstractFileByPath(cur) instanceof import_obsidian4.TFolder)) throw e;
        }
      } else if (!(ex instanceof import_obsidian4.TFolder)) throw new Error(`${cur} \u4E0D\u662F\u6587\u4EF6\u5939`);
    }
  }
  /** 附件直接存到 附件/ 根目录（不建子文件夹），文件名带时间戳；重名就加后缀，绝不覆盖已有文件。返回库内路径 */
  async saveAttachment(a, when, n) {
    const d = new Date(when.getTime());
    const stamp = `${ymd(d).replace(/-/g, "")}_${hm(d).replace(":", "")}${pad2(d.getSeconds())}`;
    const dir = this.attFolder;
    await this.ensureFolder(dir);
    const base = a.kind === "img" ? `IMG_${stamp}` : `\u5F55\u97F3_${stamp}`;
    let path = this.guard(`${dir}/${base}${n ? "_" + n : ""}.${a.ext}`), k2 = 1;
    while (this.app.vault.getAbstractFileByPath(path)) path = this.guard(`${dir}/${base}_${n}-${k2++}.${a.ext}`);
    const buf = await a.blob.arrayBuffer();
    for (; ; ) {
      try {
        await this.app.vault.createBinary(path, buf);
        return path;
      } catch (e) {
        if (!this.app.vault.getAbstractFileByPath(path) || k2 > 50) throw e;
        path = this.guard(`${dir}/${base}_${n}-${k2++}.${a.ext}`);
      }
    }
  }
  async withAttachments(input, atts, when) {
    if (!atts.length) return input;
    const paths = [];
    for (let i = 0; i < atts.length; i++) paths.push(await this.saveAttachment(atts[i], when, i));
    const body = [input.body.replace(/\s+$/, ""), ...paths.map((p) => `![[${p}]]`)].filter(Boolean).join("\n");
    return { ...input, body };
  }
  /** 新写一条：按「凌晨 N 点前算前一天」找到文件；不存在就新建 */
  async append(when, input, atts = []) {
    const date = logicalDate(when, this.hour);
    const path = this.guard(this.pathFor(date));
    const entry = await this.withAttachments({ ...input, ...entryTime(when, this.hour) }, atts, when);
    const src = this.settings().sourceValue || "memos";
    let file = this.fileAt(path), created = false;
    if (!file) {
      await this.ensureFolder(this.folder);
      try {
        const out = planAppend(null, date, entry, src, this.hour);
        file = await this.app.vault.create(path, out);
        created = true;
        this.track(path, null, out);
      } catch (e) {
        file = this.fileAt(path);
        if (!file) throw e;
      }
    }
    if (!created) await this.process(file, (data) => planAppend(data, date, entry, src, this.hour, this.owned.get(path)));
    await this.readFile(this.fileAt(path));
    this.emit();
    return { path, created, date };
  }
  async edit(s, input, atts = []) {
    const file = this.fileAt(this.guard(s.path));
    if (!file) throw new Error("\u6587\u4EF6\u4E0D\u5B58\u5728\u4E86");
    const entry = await this.withAttachments(input, atts, /* @__PURE__ */ new Date());
    await this.process(file, (data) => planEdit(data, refOf(s), entry, this.hour, this.owned.get(file.path)));
    await this.readFile(file);
    this.emit();
  }
  async remove(s) {
    const file = this.fileAt(this.guard(s.path));
    if (!file) throw new Error("\u6587\u4EF6\u4E0D\u5B58\u5728\u4E86");
    const cur = await this.app.vault.read(file);
    const pre = planDelete(cur, refOf(s), this.hour, this.owned.get(file.path));
    if (pre.emptyAfter) {
      await this.app.vault.trash(file, false);
      this.onFileDeleted(file);
      return { path: file.path, before: cur, after: "", removed: pre.removed, trashed: true, header: s.hdr || "\uFF08\u65E0\u6807\u9898\u6BB5\u843D\uFF09" };
    }
    let res = null;
    await this.process(file, (data) => {
      const r = planDelete(data, refOf(s), this.hour, this.owned.get(file.path));
      res = { path: file.path, before: data, after: r.text, removed: r.removed, trashed: false, header: s.hdr || "\uFF08\u65E0\u6807\u9898\u6BB5\u843D\uFF09" };
      return r.text;
    });
    await this.readFile(file);
    this.emit();
    return res;
  }
  /** 撤销删除：文件没再被改过就原样恢复；否则把删掉的内容追加回文件末尾 */
  /** vault.process + 记录 frontmatter 标签变化 */
  async process(file, fn) {
    let before = null, after = "";
    await this.app.vault.process(file, (data) => {
      before = data;
      after = fn(data);
      return after;
    });
    if (before != null) this.track(file.path, before, after);
  }
  async undo(r) {
    const path = this.guard(r.path);
    const file = this.fileAt(path);
    if (!file) {
      await this.ensureFolder(this.folder);
      await this.app.vault.create(path, r.before);
    } else await this.process(file, (data) => data === r.after ? r.before : syncFmTags(data, restoreAppend(data, r.removed), this.hour));
    const f = this.fileAt(path);
    if (f) await this.readFile(f);
    this.emit();
  }
  async restore(path, removed) {
    path = this.guard(path);
    const file = this.fileAt(path);
    if (!file) {
      const date = (path.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || ymd(/* @__PURE__ */ new Date());
      await this.ensureFolder(this.folder);
      await this.app.vault.create(path, syncFmTags(null, newFileText(date, this.settings().sourceValue || "memos") + "\n" + removed + "\n", this.hour));
    } else await this.process(file, (data) => syncFmTags(data, restoreAppend(data, removed), this.hour));
    const f = this.fileAt(path);
    if (f) await this.readFile(f);
    this.emit();
  }
};
function restoreAppend(data, removed) {
  const eol = (data.match(/\r\n|\n|\r/) || ["\n"])[0];
  const trailing = ((data.match(/(\r\n|\n|\r)*$/) || [""])[0].match(/\r\n|\n|\r/g) || []).length;
  return data + (trailing === 0 ? eol + eol : trailing === 1 ? eol : "") + removed.replace(/\r\n|\n|\r/g, eol) + eol;
}
function memOwned() {
  const m = /* @__PURE__ */ new Map();
  return { get: (p) => m.get(p) || [], set: (p, t) => {
    m.set(p, t);
  } };
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  diaryFolder: "\u65E5\u8BB0",
  attachmentFolder: "\u9644\u4EF6",
  dayStartHour: 4,
  autoOpen: true,
  newestFirst: true,
  sourceValue: "memos"
};

// src/main.ts
var DiaryStreamPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "data", { settings: { ...DEFAULT_SETTINGS }, recentDeletes: [], fmOwned: {} });
    __publicField(this, "store");
  }
  async onload() {
    const saved = await this.loadData();
    this.data = { settings: { ...DEFAULT_SETTINGS, ...saved?.settings || {} }, recentDeletes: saved?.recentDeletes || [], fmOwned: saved?.fmOwned || {} };
    this.store = new DiaryStore(this.app, () => this.data.settings, {
      get: (p) => this.data.fmOwned[p] || [],
      set: (p, t) => {
        if (t.length) this.data.fmOwned[p] = t;
        else delete this.data.fmOwned[p];
        void this.saveAll();
      }
    });
    this.registerView(VIEW_TYPE, (leaf) => new DiaryStreamView(leaf, this));
    this.addRibbonIcon("book-open", "\u6253\u5F00\u65E5\u8BB0\u6D41", () => {
      void this.activateView();
    });
    this.addCommand({ id: "open-diary-stream", name: "\u6253\u5F00\u65E5\u8BB0\u6D41", callback: () => {
      void this.activateView();
    } });
    this.addSettingTab(new DiarySettingTab(this.app, this));
    this.registerEvent(this.app.vault.on("create", (f) => {
      void this.store.onFileChanged(f);
    }));
    this.registerEvent(this.app.vault.on("modify", (f) => {
      void this.store.onFileChanged(f);
    }));
    this.registerEvent(this.app.vault.on("delete", (f) => this.store.onFileDeleted(f)));
    this.registerEvent(this.app.vault.on("rename", (f, old) => {
      void this.store.onFileRenamed(f, old);
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (f) => {
      void this.store.onFileChanged(f);
    }));
    this.app.workspace.onLayoutReady(async () => {
      await this.store.loadAll();
      if (this.data.settings.autoOpen) await this.activateView();
    });
  }
  onunload() {
  }
  /** 打开（或切换到）日记流；已有就复用，没有就开在主区域，并设为当前标签页 */
  async activateView() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0] || null;
    if (!leaf) {
      const active = ws.getMostRecentLeaf?.() || null;
      leaf = active && active.view?.getViewType() === "empty" ? active : ws.getLeaf(import_obsidian5.Platform.isMobile ? false : "tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    ws.setActiveLeaf(leaf, { focus: true });
    await ws.revealLeaf(leaf);
  }
  async saveAll() {
    await this.saveData(this.data);
  }
  async rememberDelete(r) {
    this.data.recentDeletes.unshift({ path: r.path, removed: r.removed, at: Date.now(), header: r.header });
    this.data.recentDeletes = this.data.recentDeletes.slice(0, 50);
    await this.saveAll();
  }
};
var DiarySettingTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.data.settings;
    const save = async (reload = false) => {
      await this.plugin.saveAll();
      if (reload) await this.plugin.store.loadAll();
    };
    new import_obsidian5.Setting(containerEl).setName("\u65E5\u8BB0\u6587\u4EF6\u5939").setDesc("\u53EA\u8BFB\u5199\u8FD9\u4E2A\u6587\u4EF6\u5939\u6839\u76EE\u5F55\u4E0B\u7684 YYYY-MM-DD.md\uFF1B\u5B50\u6587\u4EF6\u5939\uFF08\u5982 \u5176\u4ED6\u8BB0\u5F55/\uFF09\u4E0D\u8BFB\u3002").addText((t) => t.setPlaceholder("\u65E5\u8BB0").setValue(s.diaryFolder).onChange(async (v) => {
      s.diaryFolder = v.trim() || "\u65E5\u8BB0";
      await save(true);
    }));
    new import_obsidian5.Setting(containerEl).setName("\u9644\u4EF6\u6587\u4EF6\u5939").setDesc("\u56FE\u7247\u548C\u5F55\u97F3\u76F4\u63A5\u4FDD\u5B58\u5230\u8FD9\u4E2A\u6587\u4EF6\u5939\uFF08\u4E0D\u5EFA\u5B50\u6587\u4EF6\u5939\uFF09\uFF0C\u6587\u4EF6\u540D\u5E26\u65F6\u95F4\u6233\u3001\u4E0D\u4F1A\u8986\u76D6\u5DF2\u6709\u6587\u4EF6\uFF1B\u6B63\u6587\u91CC\u7528 ![[...]] \u5D4C\u5165\u3002").addText((t) => t.setPlaceholder("\u9644\u4EF6").setValue(s.attachmentFolder).onChange(async (v) => {
      s.attachmentFolder = v.trim() || "\u9644\u4EF6";
      await save();
    }));
    new import_obsidian5.Setting(containerEl).setName("\u4E00\u5929\u4ECE\u51E0\u70B9\u5F00\u59CB").setDesc("\u8FD9\u4E2A\u949F\u70B9\u4E4B\u524D\u5199\u7684\uFF0C\u8BB0\u5230\u524D\u4E00\u5929\uFF08\u9ED8\u8BA4\u51CC\u6668 4 \u70B9\uFF09\u3002").addDropdown((d) => {
      for (let h = 0; h <= 6; h++) d.addOption(String(h), `${h}:00`);
      d.setValue(String(s.dayStartHour)).onChange(async (v) => {
        s.dayStartHour = +v;
        await save(true);
      });
    });
    new import_obsidian5.Setting(containerEl).setName("\u6253\u5F00\u5E93\u65F6\u81EA\u52A8\u663E\u793A\u65E5\u8BB0\u6D41").setDesc("\u7535\u8111\u548C\u624B\u673A\u90FD\u751F\u6548\u3002").addToggle((t) => t.setValue(s.autoOpen).onChange(async (v) => {
      s.autoOpen = v;
      await save();
    }));
    new import_obsidian5.Setting(containerEl).setName("\u6700\u65B0\u7684\u5728\u4E0A\u9762").setDesc("\u5173\u6389\u5219\u6309\u65F6\u95F4\u4ECE\u65E9\u5230\u665A\u6392\u5217\u3002").addToggle((t) => t.setValue(s.newestFirst).onChange(async (v) => {
      s.newestFirst = v;
      await save();
      this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => l.view.renderAll?.());
    }));
    new import_obsidian5.Setting(containerEl).setName("\u65B0\u5EFA\u6587\u4EF6\u7684 source").setDesc("\u65B0\u5EFA\u5F53\u5929\u6587\u4EF6\u65F6 frontmatter \u91CC source \u7684\u503C\uFF08\u9ED8\u8BA4 memos\uFF0C\u4E0E\u73B0\u6709\u65E5\u8BB0\u4E00\u81F4\uFF09\u3002").addText((t) => t.setValue(s.sourceValue).onChange(async (v) => {
      s.sourceValue = v.trim() || "memos";
      await save();
    }));
    containerEl.createEl("h3", { text: "\u6700\u8FD1\u5220\u9664" });
    const list = this.plugin.data.recentDeletes;
    if (!list.length) containerEl.createEl("p", { text: "\u6CA1\u6709\u5220\u9664\u8BB0\u5F55\u3002", cls: "setting-item-description" });
    list.forEach((r, i) => {
      const when = new Date(r.at);
      const desc = `${r.path} \xB7 ${when.toLocaleString()}`;
      new import_obsidian5.Setting(containerEl).setName(r.header.replace(/^##\s+/, "")).setDesc(desc).addButton((b) => b.setButtonText("\u590D\u5236").onClick(async () => {
        await navigator.clipboard.writeText(r.removed);
        new import_obsidian5.Notice("\u5DF2\u590D\u5236");
      })).addButton((b) => b.setButtonText("\u6062\u590D\u5230\u539F\u6587\u4EF6\u672B\u5C3E").onClick(async () => {
        await this.plugin.store.restore(r.path, r.removed);
        list.splice(i, 1);
        await this.plugin.saveAll();
        new import_obsidian5.Notice("\u5DF2\u6062\u590D");
        this.display();
      })).addExtraButton((b) => b.setIcon("x").setTooltip("\u4ECE\u5217\u8868\u79FB\u9664").onClick(async () => {
        list.splice(i, 1);
        await this.plugin.saveAll();
        this.display();
      }));
    });
  }
};
