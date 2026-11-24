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
var INLINE_IMG_RE = /\[\[DS_IMG:([a-zA-Z0-9_-]+)\]\]/g;
function resolveInlineImages(body, atts, pathFor) {
  let out = body || "";
  const remaining = [];
  for (let i = 0; i < atts.length; i++) {
    const a = atts[i];
    const token = a.id ? `[[DS_IMG:${a.id}]]` : "";
    const embed = `![[${pathFor(a, i)}]]`;
    if (token && out.includes(token)) {
      out = out.split(token).join(`\n\n${embed}\n\n`);
    } else {
      remaining.push(embed);
    }
  }
  out = out.replace(INLINE_IMG_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  return [out, ...remaining].filter(Boolean).join("\n");
}
var Composer = class {
  constructor(parent, host, mode, init) {
    this.host = host;
    this.mode = mode;
    __publicField(this, "el");
    __publicField(this, "box");
    __publicField(this, "ta");
    __publicField(this, "tags", []);
    __publicField(this, "atts", []);
    __publicField(this, "blocks", [{ id: "b0", type: "text", text: "" }]);
    __publicField(this, "activeBlockId", "b0");
    __publicField(this, "activeCaret", 0);
    __publicField(this, "nextBlockUid", 1);
    __publicField(this, "sub", "");
    __publicField(this, "when", null);
    __publicField(this, "buji", false);
    __publicField(this, "subOpen", false);
    __publicField(this, "tagsOpen", false);
    __publicField(this, "busy", false);
    __publicField(this, "rec", null);
    __publicField(this, "inline", !!init?.inline);
    __publicField(this, "initialEditState", null);
    __publicField(this, "revealAnimation", null);
    __publicField(this, "onDocClick", (e) => {
      const target = this.box.contains(e.target) ? e.target : null;
      const keep = target?.closest('.ds-fld-sub,[data-a="sub"]') ? "sub"
        : target?.closest('.ds-fld-tags,.ds-tagpop,.ds-qtags,[data-a="tags"]') ? "tags"
        : target?.closest('.ds-timepop,[data-a="time"]') ? "time"
        : target?.closest('.ds-preview,[data-a="pv"]') ? "pv" : null;
      this.dismissTools(keep);
    });
    this.el = parent;
    if (init) {
      this.sub = init.sub;
      this.tags = [...init.tags];
      this.subOpen = !!init.sub && !this.inline;
      this.blocks = [{ id: "b0", type: "text", text: init.body || "" }];
    }
    this.build(init);
    if (this.mode === "edit") this.initialEditState = this.editSignature();
    this.el.ownerDocument.addEventListener("click", this.onDocClick, true);
  }
  destroy() {
    this.revealAnimation?.cancel();
    this.el.ownerDocument.removeEventListener("click", this.onDocClick, true);
    this.stopRec(true);
    this.atts.forEach((a) => URL.revokeObjectURL(a.url));
    this.el.empty?.();
    this.el.innerHTML = "";
  }
  ib(a, ic, label, text = "") {
    return `<button type="button" class="ds-ib clickable-icon" data-a="${a}"><span data-icon="${ic}"></span>${text ? `<span class="ds-ib-txt">${esc(text)}</span>` : `<span class="ds-sr-only">${esc(label)}</span>`}</button>`;
  }
  build(init) {
    const isNew = this.mode === "new";
    this.el.innerHTML = `<div class="ds-cbox${isNew ? "" : " is-open is-edit"}${this.inline ? " ds-inline-editor" : ""}">
      ${isNew ? `<div class="ds-sheet-write-head"><button type="button" class="ds-write-back" data-a="close"><span data-icon="arrow-left"></span><span class="ds-sr-only">\u8FD4\u56DE</span></button><button type="button" class="ds-meta" data-a="time"></button><span class="ds-sp"></span><button type="button" class="ds-send" data-a="send" disabled>\u4FDD\u5B58</button></div>` : this.inline ? "" : `<div class="ds-ed-head">\u7F16\u8F91 \xB7 ${esc(init.timeLabel)}</div>`}
      ${isNew ? `<div class="ds-pop ds-timepop" hidden><div class="ds-time-presets"><button type="button" class="ds-tp-chip" data-a="now">\u73B0\u5728</button><button type="button" class="ds-tp-chip" data-a="preset-yest">\u8865\u8BB0\u6628\u5929</button><button type="button" class="ds-tp-chip" data-a="preset-prev2">\u8865\u8BB0\u524D\u5929</button></div><div class="ds-time-row"><label class="ds-sr-only" for="ds-when-inp">\u5199\u5165\u65F6\u95F4</label><input id="ds-when-inp" type="datetime-local" class="ds-when"><button type="button" class="ds-buji-toggle" data-a="togglebuji">\u6807\u8BB0\u4E3A\u8865\u8BB0</button></div><div class="ds-row"><span class="ds-hint"></span></div></div>` : ""}
      <div class="ds-blocks"></div>
      ${this.inline ? '<div class="ds-edit-controls">' : ""}
      <div class="ds-att"></div>
      <div class="ds-fields"></div>
      ${isNew ? '<div class="ds-qtags"></div>' : ""}
      <div class="ds-bar">
        ${init && !init.hasHeader ? "" : this.ib("sub", "heading", "\u526F\u6807\u9898", isNew ? "\u6807\u9898" : "")}${this.ib("tags", "hash", "\u6807\u7B7E", isNew ? "\u6807\u7B7E" : "")}${this.ib("img", "image", "\u63D2\u5165\u56FE\u7247", isNew ? "\u63D2\u56FE" : "")}${this.ib("rec", "mic", "\u5F55\u97F3")}
        <span class="ds-sp"></span>
        ${this.ib("pv", "file-text", "\u9884\u89C8\u5C06\u5199\u5165\u7684\u5185\u5BB9")}
        ${isNew ? "" : '<button type="button" class="ds-ghost" data-a="cancel">\u53D6\u6D88</button><button type="button" class="ds-send" data-a="send" disabled>\u4FDD\u5B58</button>'}
      </div>
      <div class="ds-preview" hidden></div>
      ${this.inline ? "</div>" : ""}
      <input type="file" accept="image/*" multiple class="ds-fileinput" hidden>
    </div>`;
    this.box = this.el.querySelector(".ds-cbox");
    this.renderBlocks();
    this.box.querySelectorAll("[data-icon]").forEach((b) => icon(b, b.dataset.icon));
    this.bind();
    this.renderFields();
    this.renderQuickTags();
    this.autosize();
    this.update();
    if (this.inline && !this.el.ownerDocument.defaultView.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const controls = this.q(".ds-edit-controls");
      controls.style.overflow = "hidden";
      this.revealAnimation = controls.animate([{ height: "0px", opacity: 0, transform: "translateY(-6px)" }, { height: `${controls.getBoundingClientRect().height}px`, opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.22,.68,.18,1)" });
      this.revealAnimation.onfinish = () => { controls.style.overflow = ""; };
    }
  }
  q(s) {
    return this.box.querySelector(s);
  }
  hasInlineImages() {
    return Array.isArray(this.blocks) && this.blocks.some((b) => b.type === "img");
  }
  renderBlocks(focusBlockId = null, caret = null) {
    const wrap = this.q(".ds-blocks");
    if (!wrap) return;
    const isNew = this.mode === "new";
    const isSolo = this.blocks.length === 1;
    wrap.innerHTML = this.blocks.map((b, idx) => {
      if (b.type === "text") {
        const ph = isNew ? (idx === 0 ? "\u76F4\u63A5\u8BF4\u51FA\u6216\u5199\u4E0B\u6B64\u523B\u7684\u60F3\u6CD5\u2026" : "\u5728\u56FE\u7247\u4E0B\u65B9\u7EE7\u7EED\u5199\u2026") : "";
        return `<textarea class="ds-body${isSolo ? " is-solo" : ""}" data-block-id="${esc(b.id)}" rows="1" placeholder="${ph}">${esc(b.text)}</textarea>`;
      }
      const att = this.atts.find((a) => a.id === b.attId);
      if (!att) return "";
      return `<div class="ds-inline-att" data-img-block="${esc(b.id)}"><img alt="" src="${esc(att.url)}"><button type="button" class="ds-ax" data-a="rmimgblock" data-bid="${esc(b.id)}"><span data-icon="x"></span><span class="ds-sr-only">\u79FB\u9664\u56FE\u7247</span></button></div>`;
    }).join("");
    wrap.querySelectorAll("[data-icon]").forEach((b) => icon(b, b.dataset.icon));
    const tas = [...wrap.querySelectorAll("textarea.ds-body")];
    this.ta = tas.find((t) => t.dataset.blockId === this.activeBlockId) || tas[0];
    this.autosize();
    if (focusBlockId) {
      const target = tas.find((t) => t.dataset.blockId === focusBlockId);
      if (target) {
        target.focus({ preventScroll: false });
        if (caret != null) target.setSelectionRange(caret, caret);
        target.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
      }
    }
  }
  normalizeBlocks() {
    const out = [];
    for (const b of this.blocks) {
      if (b.type === "text" && out.length && out[out.length - 1].type === "text") {
        const prev = out[out.length - 1];
        prev.text = [prev.text, b.text].filter(Boolean).join("\n\n");
      } else {
        out.push(b);
      }
    }
    if (!out.length || out[0].type !== "text") out.unshift({ id: "b" + (++this.nextBlockUid), type: "text", text: "" });
    if (out[out.length - 1].type !== "text") out.push({ id: "b" + (++this.nextBlockUid), type: "text", text: "" });
    this.blocks = out;
    if (!this.blocks.some((b) => b.id === this.activeBlockId && b.type === "text")) {
      const firstText = this.blocks.find((b) => b.type === "text");
      this.activeBlockId = firstText.id;
      this.activeCaret = firstText.text.length;
    }
  }
  insertInlineImages(files) {
    if (!files.length) return;
    let idx = this.blocks.findIndex((b) => b.id === this.activeBlockId && b.type === "text");
    if (idx < 0) idx = this.blocks.length - 1;
    const blk = this.blocks[idx];
    const pos = Math.max(0, Math.min(this.activeCaret ?? blk.text.length, blk.text.length));
    const before = blk.text.slice(0, pos).replace(/\s+$/, "");
    const after = blk.text.slice(pos).replace(/^\s+/, "");
    const inserted = [];
    for (const f of files) {
      const ext = (f.name.match(/\.([a-z0-9]+)$/i)?.[1] || (f.type.split("/")[1] || "jpg")).toLowerCase().replace("jpeg", "jpg");
      const id = "img_" + (++this.nextBlockUid);
      this.atts.push({ kind: "img", id, inline: true, blob: f, ext, url: URL.createObjectURL(f), name: f.name });
      inserted.push({ id: "bi_" + this.nextBlockUid, type: "img", attId: id });
    }
    const nextTextId = "b" + (++this.nextBlockUid);
    blk.text = before;
    this.blocks.splice(idx + 1, 0, ...inserted, { id: nextTextId, type: "text", text: after });
    this.activeBlockId = nextTextId;
    this.activeCaret = 0;
    this.renderBlocks(nextTextId, 0);
    this.renderAtts();
    this.update();
    this.box.classList.add("is-open");
  }
  serializeBlocks() {
    if (!this.hasInlineImages()) return this.ta?.value || "";
    const parts = [];
    for (const b of this.blocks) {
      if (b.type === "text") {
        if (b.text.trim()) parts.push(b.text.trim());
      } else {
        parts.push(`[[DS_IMG:${b.attId}]]`);
      }
    }
    return parts.join("\n\n");
  }
  setBackdate(ymdStr) {
    if (!ymdStr) {
      this.when = null;
      this.buji = false;
    } else {
      const [y, m, d] = ymdStr.split("-").map(Number);
      this.when = new Date(y, m - 1, d, 21, 30);
      this.buji = true;
    }
    const tp = this.q(".ds-timepop");
    if (tp) tp.hidden = true;
    this.renderQuickTags();
    this.update();
  }
  renderQuickTags() {
    const qel = this.q(".ds-qtags");
    if (!qel || this.mode !== "new") return;
    if (!this.tagsOpen) {
      qel.innerHTML = "";
      qel.hidden = true;
      return;
    }
    const top = this.host.tagCounts().slice(0, 8).map(([t]) => t);
    const merged = dedupe([...this.tags, ...top]);
    if (!merged.length) {
      qel.innerHTML = "";
      qel.hidden = true;
      return;
    }
    qel.hidden = false;
    qel.innerHTML = merged.map((t) => `<button type="button" class="ds-qtag${this.tags.includes(t) ? " is-on" : ""}" data-a="qtag" data-t="${esc(t)}">#${esc(t)}</button>`).join("");
  }
  dismissTools(keep = null) {
    let dismissed = false, fieldsChanged = false;
    const pendingTag = this.q(".ds-taginput")?.value || "";
    if (this.inline && this.subOpen && keep !== "sub") {
      this.subOpen = false;
      fieldsChanged = dismissed = true;
    }
    if ((this.inline || this.mode === "new") && this.tagsOpen && keep !== "tags") {
      const tag = normTag(pendingTag);
      if (okTag(tag) && !this.tags.includes(tag)) this.tags.push(tag);
      this.tagsOpen = false;
      fieldsChanged = dismissed = true;
    }
    for (const [tool, selector] of [["tags", ".ds-tagpop"], ["time", ".ds-timepop"], ["pv", ".ds-preview"]]) {
      const panel = this.q(selector);
      if (tool !== keep && panel && !panel.hidden) {
        panel.hidden = true;
        dismissed = true;
      }
    }
    if (keep !== "pv") this.q('[data-a="pv"]')?.classList.remove("is-active");
    if (fieldsChanged) {
      this.renderFields();
      this.renderQuickTags();
      if (keep === "tags" && this.q(".ds-taginput")) this.q(".ds-taginput").value = pendingTag;
      this.update();
    }
    return dismissed;
  }
  empty() {
    const txt = this.hasInlineImages() ? this.serializeBlocks() : (this.ta?.value || "");
    return !txt.trim() && !this.tags.length && !this.atts.length && !this.sub.trim();
  }
  bind() {
    const b = this.box;
    b.addEventListener("focusin", (e) => {
      b.classList.add("is-open");
      if (e.target.matches("textarea.ds-body")) {
        this.ta = e.target;
        this.activeBlockId = e.target.dataset.blockId || this.activeBlockId;
        this.activeCaret = e.target.selectionStart ?? e.target.value.length;
      }
    });
    ["keyup", "mouseup"].forEach((ev) => b.addEventListener(ev, (e) => {
      if (e.target.matches("textarea.ds-body")) {
        this.ta = e.target;
        this.activeBlockId = e.target.dataset.blockId || this.activeBlockId;
        this.activeCaret = e.target.selectionStart ?? e.target.value.length;
      }
    }));
    b.addEventListener("focusout", () => window.setTimeout(() => {
      if (this.mode === "new" && !b.contains(document.activeElement) && this.empty() && !this.rec) b.classList.remove("is-open");
    }, 150));
    b.addEventListener("mousedown", (e) => {
      if (e.target.closest(".ds-tagpop button")) e.preventDefault();
    });
    b.addEventListener("input", (e) => {
      const t = e.target;
      if (t.matches("textarea.ds-body")) {
        this.ta = t;
        const blk = this.blocks.find((x) => x.id === t.dataset.blockId);
        if (blk) blk.text = t.value;
        this.activeBlockId = t.dataset.blockId || this.activeBlockId;
        this.activeCaret = t.selectionStart ?? t.value.length;
        this.autosize(t);
      }
      if (t.classList.contains("ds-taginput")) {
        if (/[\s,，]$/.test(t.value)) this.addTag(t.value);
        else this.tagAC();
      }
      if (t.classList.contains("ds-subinput")) this.sub = t.value;
      if (t.classList.contains("ds-when")) {
        this.when = t.value ? new Date(t.value) : null;
        if (this.when) {
          const todayLog = logicalDate(/* @__PURE__ */ new Date(), this.host.dayStartHour());
          if (logicalDate(this.when, this.host.dayStartHour()) < todayLog) this.buji = true;
        }
      }
      this.update();
    });
    b.addEventListener("keydown", (e) => {
      const t = e.target;
      if (e.key === "Escape" && !e.isComposing) {
        const dismissed = this.dismissTools();
        if (dismissed || this.mode === "edit") {
          e.preventDefault();
          e.stopPropagation();
          if (dismissed) this.ta?.focus({ preventScroll: true });
          else this.host.cancel?.();
          return;
        }
      }
      const pop = this.q(".ds-tagpop");
      const items = pop && !pop.hidden ? [...pop.querySelectorAll("button")] : [];
      if (items.length && ["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(e.key) && t.classList.contains("ds-taginput")) {
        const cur = items.findIndex((i) => i.classList.contains("is-on"));
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
          this.renderQuickTags();
          this.update();
        }
      }
      if (t.classList.contains("ds-subinput") && e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        this.dismissTools();
        this.ta?.focus();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void this.send();
      }
    });
    b.addEventListener("click", (e) => {
      const t = e.target.closest("[data-a]");
      if (!t) {
        if (e.target.classList?.contains("ds-blocks")) {
          const tas = [...b.querySelectorAll("textarea.ds-body")];
          const last = tas[tas.length - 1] || this.ta;
          if (last) {
            last.focus({ preventScroll: true });
            const end = last.value.length;
            last.setSelectionRange?.(end, end);
          }
        }
        return;
      }
      const a = t.dataset.a;
      if (a === "sub") {
        if (this.inline && this.subOpen) {
          this.dismissTools();
          this.ta?.focus({ preventScroll: true });
        } else {
          this.dismissTools("sub");
          this.subOpen = !this.subOpen || !!this.sub;
          this.renderFields();
          this.q(".ds-subinput")?.focus();
        }
      }
      if (a === "tags") {
        if ((this.inline || this.mode === "new") && this.tagsOpen) {
          this.dismissTools();
          this.ta?.focus({ preventScroll: true });
        } else {
          this.dismissTools("tags");
          this.tagsOpen = true;
          this.renderFields();
          this.renderQuickTags();
          this.q(".ds-taginput")?.focus();
          this.tagAC();
        }
      }
      if (a === "qtag") {
        const tag = t.dataset.t;
        if (this.tags.includes(tag)) this.tags = this.tags.filter((x) => x !== tag);
        else this.tags.push(tag);
        this.renderFields();
        this.renderQuickTags();
        this.update();
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
        this.renderQuickTags();
        this.update();
        this.ta?.focus();
      }
      if (a === "rmtag") {
        this.tags = this.tags.filter((x) => x !== t.dataset.t);
        this.renderFields(true);
        this.renderQuickTags();
        this.update();
      }
      if (a === "pick") {
        this.addTag(t.dataset.t);
      }
      if (a === "rmatt") {
        const idx = +t.dataset.i;
        const [x] = this.atts.splice(idx, 1);
        if (x) {
          URL.revokeObjectURL(x.url);
          if (x.id) {
            this.blocks = this.blocks.filter((blk) => blk.attId !== x.id);
            this.normalizeBlocks();
            this.renderBlocks();
          }
        }
        this.renderAtts();
        this.update();
      }
      if (a === "rmimgblock") {
        const bid = t.dataset.bid;
        const blk = this.blocks.find((x) => x.id === bid);
        if (blk?.attId) {
          const idx = this.atts.findIndex((x) => x.id === blk.attId);
          if (idx >= 0) {
            URL.revokeObjectURL(this.atts[idx].url);
            this.atts.splice(idx, 1);
          }
        }
        this.blocks = this.blocks.filter((x) => x.id !== bid);
        this.normalizeBlocks();
        this.renderBlocks();
        this.renderAtts();
        this.update();
      }
      if (a === "img") this.q(".ds-fileinput").click();
      if (a === "rec") void this.toggleRec();
      if (a === "time") {
        this.dismissTools("time");
        const p = this.q(".ds-timepop");
        if (!p) return;
        p.hidden = !p.hidden;
        if (!p.hidden) this.syncTimeInput();
      }
      if (a === "now") {
        this.when = null;
        this.buji = false;
        const p = this.q(".ds-timepop");
        if (p) p.hidden = true;
        this.update();
      }
      if (a === "preset-yest" || a === "preset-prev2") {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - (a === "preset-yest" ? 1 : 2));
        d.setHours(21, 30, 0, 0);
        this.when = d;
        this.buji = true;
        this.syncTimeInput();
        this.update();
      }
      if (a === "togglebuji") {
        this.buji = !this.buji;
        this.update();
      }
      if (a === "pv") {
        this.dismissTools("pv");
        const p = this.q(".ds-preview");
        p.hidden = !p.hidden;
        t.classList.toggle("is-active", !p.hidden);
        this.update();
      }
      if (a === "close") this.host.close?.();
      if (a === "cancel") this.host.cancel?.();
      if (a === "send") void this.send();
    });
    this.q(".ds-fileinput").addEventListener("change", (ev) => {
      const inp = ev.target;
      const files = Array.from(inp.files || []);
      inp.value = "";
      this.insertInlineImages(files);
    });
  }
  syncTimeInput() {
    const w = this.q(".ds-when");
    if (!w) return;
    const d = new Date((this.when || /* @__PURE__ */ new Date()).getTime());
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    w.value = d.toISOString().slice(0, 16);
  }
  autosize(only = null) {
    const list = only ? [only] : [...(this.box?.querySelectorAll("textarea.ds-body") || [])];
    for (const ta of list) {
      ta.style.height = "auto";
      const minH = ta.classList.contains("is-solo") && this.mode === "new" ? 130 : 34;
      ta.style.height = Math.max(ta.scrollHeight, minH) + "px";
    }
  }
  /* ---- 副标题 / 标签字段（点图标才出现） ---- */
  renderFields(keepFocus = false) {
    const f = this.q(".ds-fields");
    let h = "";
    if (this.subOpen || this.sub && !this.inline) h += `<span class="ds-fld ds-fld-sub"><span class="ds-lbl" data-icon="heading"></span><input class="ds-subinput" placeholder="\u526F\u6807\u9898" value="${esc(this.sub)}"><button type="button" class="ds-x" data-a="closefield" data-f="sub"><span data-icon="x"></span><span class="ds-sr-only">\u53BB\u6389\u526F\u6807\u9898</span></button></span>`;
    if (this.tagsOpen || this.tags.length && !this.inline && this.mode === "edit") h += `<span class="ds-fld ds-fld-tags"><span class="ds-lbl" data-icon="hash"></span>${this.tags.map((t) => `<span class="ds-tchip">#${esc(t)}<button type="button" data-a="rmtag" data-t="${esc(t)}"><span data-icon="x"></span><span class="ds-sr-only">\u79FB\u9664</span></button></span>`).join("")}<input class="ds-taginput" placeholder="${this.tags.length ? "" : "\u8F93\u5165\u65B0\u6807\u7B7E"}" autocomplete="off" enterkeyhint="done"></span><div class="ds-pop ds-tagpop" hidden></div>`;
    else if (this.mode === "new" && this.tags.length) h += `<div class="ds-picked-tags">${this.tags.map((t) => `<span class="ds-tchip">#${esc(t)}<button type="button" data-a="rmtag" data-t="${esc(t)}"><span data-icon="x"></span><span class="ds-sr-only">\u79FB\u9664</span></button></span>`).join("")}</div>`;
    f.innerHTML = h;
    f.querySelectorAll("[data-icon]").forEach((b) => icon(b, b.dataset.icon));
    this.q("[data-a=sub]")?.classList.toggle("is-active", !!(this.subOpen || this.sub && !this.inline));
    this.q("[data-a=tags]")?.classList.toggle("is-active", !!(this.tagsOpen || this.tags.length && !this.inline));
    this.q("[data-a=sub]")?.setAttribute("aria-expanded", String(!!this.subOpen));
    this.q("[data-a=tags]")?.setAttribute("aria-expanded", String(!!this.tagsOpen));
    if (keepFocus) this.q(".ds-taginput")?.focus();
  }
  tagAC() {
    const inp = this.q(".ds-taginput"), pop = this.q(".ds-tagpop");
    if (!inp || !pop) return;
    const q = normTag(inp.value).toLowerCase();
    if (this.mode === "new" && !q) {
      pop.hidden = true;
      return;
    }
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
    this.renderQuickTags();
    const p = this.q(".ds-tagpop");
    if (p) p.hidden = true;
    this.update();
  }
  /* ---- 附件（非行内附件，如语音条） ---- */
  renderAtts() {
    const el = this.q(".ds-att");
    const nonInline = this.atts.map((a, i) => ({ a, i })).filter(({ a }) => !a.inline);
    el.innerHTML = nonInline.map(({ a, i }) => a.kind === "img" ? `<span class="ds-a ds-a-img"><img alt="" src="${a.url}"><button type="button" class="ds-ax" data-a="rmatt" data-i="${i}"><span data-icon="x"></span><span class="ds-sr-only">\u79FB\u9664</span></button></span>` : `<span class="ds-a ds-a-voice"><audio src="${a.url}" preload="metadata"></audio><button type="button" class="ds-aplay"><span data-icon="play"></span><span class="ds-sr-only">\u8BD5\u542C</span></button>\u8BED\u97F3 ${fmtDur(a.dur || 0)}<button type="button" class="ds-ax" data-a="rmatt" data-i="${i}"><span data-icon="x"></span><span class="ds-sr-only">\u79FB\u9664</span></button></span>`).join("");
    el.querySelectorAll("[data-icon]").forEach((b) => icon(b, b.dataset.icon));
    el.querySelectorAll(".ds-aplay").forEach((btn) => btn.addEventListener("click", () => {
      const au = btn.parentElement.querySelector("audio");
      const ic = btn.querySelector("[data-icon]") || btn;
      if (au.paused) {
        void au.play();
        icon(ic, "pause");
        au.onended = () => icon(ic, "play");
      } else {
        au.pause();
        icon(ic, "play");
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
      btn.innerHTML = '<span data-icon="mic"></span><span class="ds-sr-only">\u5F55\u97F3</span>';
      icon(btn.querySelector("[data-icon]"), "mic");
    }
  }
  /* ---- 状态 ---- */
  state() {
    let body = (this.hasInlineImages() ? this.serializeBlocks() : (this.ta?.value || "")).replace(/\s+$/, "");
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
    let sub = this.sub.trim();
    if (this.mode === "new" && this.buji && !/补记/.test(sub)) {
      sub = sub ? `\u8865\u8BB0 \xB7 ${sub}` : "\u8865\u8BB0";
    }
    return { body, sub, tags, when: this.when, atts: this.atts };
  }
  editSignature() {
    const state = this.state();
    return JSON.stringify({ body: state.body, sub: state.sub, tags: state.tags, atts: state.atts.map((attachment) => ({ kind: attachment.kind, ext: attachment.ext, url: attachment.url })) });
  }
  isDirty() {
    return this.mode === "edit" && (this.editSignature() !== this.initialEditState || !!this.rec);
  }
  update() {
    const st = this.state(), w = st.when || /* @__PURE__ */ new Date(), hour = this.host.dayStartHour();
    this.host.onChange?.(st);
    const date = logicalDate(w, hour), actualDate = ymd(w), today = ymd(/* @__PURE__ */ new Date());
    const y = parseYmd(today);
    y.setDate(y.getDate() - 1);
    const late = w.getHours() < hour;
    const dayTxt = actualDate === today ? "\u4ECA\u5929" : actualDate === ymd(y) ? "\u6628\u5929" : recordDateLabel(actualDate, date);
    const meta = this.q(".ds-meta");
    if (meta) {
      const prefix = this.buji ? "\u8865\u8BB0 \xB7 " : "";
      const txt = late ? `${prefix}${recordDateLabel(actualDate, date)} ${hm(w)}` : `${prefix}${dayTxt} ${hm(w)}`;
      meta.innerHTML = `<span data-icon="clock"></span><span>${esc(txt)}</span><span data-icon="chevron-down"></span>`;
      meta.querySelectorAll("[data-icon]").forEach((el) => icon(el, el.dataset.icon));
      meta.classList.toggle("is-late", late || this.buji);
    }
    const bujiBtn = this.q(".ds-buji-toggle");
    if (bujiBtn) {
      bujiBtn.classList.toggle("is-on", this.buji);
      bujiBtn.textContent = this.buji ? "\u2713 \u6807\u8BB0\u4E3A\u8865\u8BB0" : "\u6807\u8BB0\u4E3A\u8865\u8BB0";
    }
    this.box.classList.toggle("is-late", late);
    const hint = this.q(".ds-hint");
    if (hint) hint.textContent = late ? `\u51CC\u6668 ${hour} \u70B9\u524D\uFF0C\u8BB0\u5230 ${+date.slice(5, 7)}\u6708${+date.slice(8)}\u65E5` : "";
    const send = this.q(".ds-send");
    if (send) send.disabled = this.busy || !st.body.trim() && !st.tags.length && !st.sub && !st.atts.length;
    const pv = this.q(".ds-preview");
    if (pv && !pv.hidden) {
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
      this.ta?.focus();
      return;
    }
    this.busy = true;
    this.update();
    try {
      await this.host.submit(st);
      if (this.mode === "new") {
        this.tags = [];
        this.atts.forEach((a) => URL.revokeObjectURL(a.url));
        this.atts = [];
        this.blocks = [{ id: "b" + (++this.nextBlockUid), type: "text", text: "" }];
        this.activeBlockId = this.blocks[0].id;
        this.activeCaret = 0;
        this.sub = "";
        this.when = null;
        this.buji = false;
        this.subOpen = this.tagsOpen = false;
        this.renderBlocks();
        this.renderAtts();
        this.renderFields();
        this.renderQuickTags();
        this.autosize();
        const pv = this.q(".ds-preview");
        if (pv) pv.hidden = true;
        const tp = this.q(".ds-timepop");
        if (tp) tp.hidden = true;
        this.q("[data-a=pv]")?.classList.remove("is-active");
        this.box.classList.remove("is-open");
      }
      return true;
    } catch (e) {
      new import_obsidian.Notice("\u5199\u5165\u5931\u8D25\uFF1A" + (e.message || e));
      return false;
    } finally {
      this.busy = false;
      if (this.box.isConnected) this.update();
    }
  }
};

// src/lightbox.ts
var import_obsidian2 = require("obsidian");
var Lightbox = class {
  constructor(parent, openOriginal, onToggle = null) {
    this.openOriginal = openOriginal;
    this.onToggle = onToggle;
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
    this.onToggle?.(true);
  }
  close() {
    this.el.hidden = true;
    this.img.removeAttribute("src");
    this.zoom(1);
    this.onToggle?.(false);
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
var PALETTES = [
  ["auto", "\u8DDF\u968F Obsidian \u4E3B\u9898\u8272\uFF08\u9ED8\u8BA4\uFF09"],
  ["mono", "\u6781\u7B80\u66DC\u77F3\u9ED1"],
  ["blue", "\u6674\u7A7A\u94B4\u84DD"],
  ["green", "\u6668\u96FE\u62B9\u8336"],
  ["violet", "\u4E01\u9999\u66AE\u7D2B"],
  ["coral", "\u6696\u674F\u9676\u6A59"]
];
function extractCardImages(html) {
  const imgs = [];
  const re = /<figure class="ds-img"><img\b[^>]*\bsrc="([^"]+)"[^>]*\bdata-path="([^"]*)"[^>]*><\/figure>/g;
  let m;
  while ((m = re.exec(html))) imgs.push({ url: m[1], path: m[2] });
  return imgs;
}
var CLAMP_PX = 166;
var VIEW_TYPE = "diary-stream-view";
var BaseModal = import_obsidian3.Modal || null;
var DiarySheetModal = BaseModal ? class extends BaseModal {
  constructor(app, view, sheetEl, opts = {}) {
    super(app);
    this.view = view;
    this.sheetEl = sheetEl;
    this.opts = opts;
    this.placeholder = null;
    this.onContainerClick = (e) => {
      if (e.target === this.containerEl || e.target === this.modalEl || e.target.classList?.contains("modal-bg")) {
        this.close();
        return;
      }
      void this.view.onClick(e);
    };
  }
  onOpen() {
    const { containerEl, modalEl, contentEl } = this;
    if (!containerEl || !modalEl || !contentEl) return;
    containerEl.classList.add("ds-root", "ds-scope", "ds-sheet-modal-wrap");
    if (this.opts.modalClass) containerEl.classList.add(this.opts.modalClass);
    if (this.view.root?.classList.contains("is-narrow")) containerEl.classList.add("is-narrow");
    if (this.view.root?.classList.contains("is-compact")) containerEl.classList.add("is-compact");
    const pal = this.view.settings?.palette || "auto";
    containerEl.classList.add("ds-pal-" + pal);
    modalEl.classList.add("ds-sheet-modal");
    contentEl.classList.add("ds-sheet-modal-content");
    const hideNativeChrome = () => {
      for (const ch of Array.from(modalEl.children || [])) {
        if (ch !== contentEl) {
          ch.hidden = true;
          ch.style?.setProperty?.("display", "none", "important");
        }
      }
      for (const ch of Array.from(containerEl.children || [])) {
        if (ch !== modalEl && !ch.classList?.contains("modal-bg")) {
          ch.hidden = true;
          ch.style?.setProperty?.("display", "none", "important");
        }
      }
      containerEl.querySelectorAll?.(".modal-close-button")?.forEach((btn) => {
        btn.hidden = true;
        btn.style?.setProperty?.("display", "none", "important");
      });
    };
    hideNativeChrome();
    this.view.syncKbObservers?.(true);
    this.view.syncViewport?.(containerEl);
    if (this.sheetEl && this.sheetEl.parentNode) {
      this.placeholder = this.sheetEl.ownerDocument.createComment("ds-sheet-placeholder");
      this.sheetEl.parentNode.insertBefore(this.placeholder, this.sheetEl);
      contentEl.appendChild(this.sheetEl);
    }
    containerEl.addEventListener("click", this.onContainerClick);
    this.scope?.register([], "Escape", () => {
      if (this.opts.onEscape?.() === false) return false;
      this.close();
      return false;
    });
    const win = containerEl.ownerDocument.defaultView;
    win.requestAnimationFrame(() => {
      hideNativeChrome();
      this.sheetEl?.classList.add("is-open");
      this.opts.onShown?.();
    });
  }
  onClose() {
    this.containerEl?.removeEventListener("click", this.onContainerClick);
    if (this.sheetEl) {
      const ae = this.sheetEl.ownerDocument?.activeElement;
      if (ae && this.sheetEl.contains(ae)) ae.blur?.();
      this.sheetEl.classList.remove("is-open", "is-dragging", "is-input-focused");
      this.sheetEl.style.transform = "";
    }
    if (this.placeholder?.parentNode && this.sheetEl) {
      this.placeholder.parentNode.insertBefore(this.sheetEl, this.placeholder);
      this.placeholder.remove();
    }
    this.placeholder = null;
    this.view.nativeKbH = 0;
    this.view.syncKbObservers?.(false);
    this.opts.onClosed?.();
  }
} : null;
var DiaryStreamView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    __publicField(this, "root");
    __publicField(this, "composer", null);
    __publicField(this, "editComposer", null);
    __publicField(this, "S", { q: "", filter: "", tag: null, date: null, month: null, editing: null, menu: null, confirm: null, limit: 30, showCal: false, sheet: null, searchOpen: false });
    __publicField(this, "pending", false);
    __publicField(this, "off", null);
    __publicField(this, "ro", null);
    __publicField(this, "vvHandler", null);
    __publicField(this, "onWinResize", null);
    __publicField(this, "onTitleClick", null);
    __publicField(this, "onSheetKeydown", null);
    __publicField(this, "sheetModal", null);
    __publicField(this, "overlayScope", null);
    __publicField(this, "baseViewportH", 0);
    __publicField(this, "baseLeafH", 0);
    __publicField(this, "nativeKbH", 0);
    __publicField(this, "lastViewportW", 0);
    __publicField(this, "focusOutTimer", 0);
    __publicField(this, "kbCheckTimers", []);
    __publicField(this, "kbEventHandler", null);
    __publicField(this, "kbMo", null);
    __publicField(this, "kbMoRaf", 0);
    __publicField(this, "toastTimer", 0);
    __publicField(this, "lightbox", null);
    __publicField(this, "toTopBtn", null);
    __publicField(this, "searchOutsideTimer", 0);
    __publicField(this, "searchAnimations", []);
    __publicField(this, "searchMotionId", 0);
    __publicField(this, "searchModal", null);
    __publicField(this, "searchModalClosing", false);
    __publicField(this, "searchSelected", null);
    __publicField(this, "searchResults", []);
    __publicField(this, "searchSnapshot", null);
    __publicField(this, "editExitDialog", null);
    __publicField(this, "editExitBusy", false);
    __publicField(this, "onSearchOutside", (e) => {
      if (!this.S.searchOpen || this.searchModal?.open || this.S.editing || this.S.confirm || this.isSearchInteraction(e.target)) return;
      const win = this.root.ownerDocument.defaultView;
      win.clearTimeout(this.searchOutsideTimer);
      this.searchOutsideTimer = win.setTimeout(() => {
        this.searchOutsideTimer = 0;
        if (this.S.searchOpen && !this.S.editing && !this.S.confirm) this.toggleSearch(false, false);
      }, 0);
    });
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
  q(sel) {
    return this.root?.querySelector(sel) || this.sheetModal?.containerEl?.querySelector(sel) || null;
  }
  applyPalette() {
    if (!this.root) return;
    const pal = this.settings.palette || "auto";
    for (const host of [this.root, this.sheetModal?.containerEl]) {
      if (!host?.classList) continue;
      for (const [key] of PALETTES) host.classList.remove("ds-pal-" + key);
      host.classList.add("ds-pal-" + pal);
    }
  }
  readKeyboardMetrics(doc, win) {
    const num = (v) => {
      const n = parseFloat(v || "0");
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const csBody = win.getComputedStyle?.(doc.body);
    const csRoot = doc.documentElement ? win.getComputedStyle?.(doc.documentElement) : null;
    const probe = this.root?.querySelector?.(".ds-kb-probe");
    const csProbe = probe ? win.getComputedStyle?.(probe) : null;
    const obsKbH = Math.max(
      num(csProbe?.paddingTop),
      num(csBody?.getPropertyValue?.("--keyboard-height")),
      num(csRoot?.getPropertyValue?.("--keyboard-height"))
    );
    const obsSafeB = Math.max(
      num(csProbe?.paddingRight),
      num(csBody?.getPropertyValue?.("--safe-area-inset-bottom")),
      num(csRoot?.getPropertyValue?.("--safe-area-inset-bottom"))
    );
    const envKbH = num(csProbe?.paddingBottom);
    const envSafeB = num(csProbe?.paddingLeft);
    const bodyPadB = num(csBody?.paddingBottom);
    return { obsKbH, obsSafeB, envKbH, envSafeB, bodyPadB };
  }
  syncKbObservers(active) {
    const doc = this.root?.ownerDocument;
    const win = doc?.defaultView;
    if (this.kbMo) {
      this.kbMo.disconnect();
      this.kbMo = null;
    }
    if (this.kbMoRaf && win?.cancelAnimationFrame) {
      win.cancelAnimationFrame(this.kbMoRaf);
      this.kbMoRaf = 0;
    }
    if (!active || !doc || !win || typeof win.MutationObserver !== "function") return;
    const mo = new win.MutationObserver(() => {
      if (this.kbMoRaf) return;
      this.kbMoRaf = win.requestAnimationFrame(() => {
        this.kbMoRaf = 0;
        this.syncViewport();
      });
    });
    const targets = [doc.body, doc.documentElement, doc.querySelector?.(".app-container")].filter(Boolean);
    for (const t of targets) {
      mo.observe(t, { attributes: true, attributeFilter: ["style", "class"] });
    }
    this.kbMo = mo;
  }
  syncViewport(extraTarget = null) {
    const doc = this.root?.ownerDocument;
    const win = doc?.defaultView;
    if (!doc || !win) return;
    const vv = win.visualViewport;
    const winW = win.innerWidth || 0;
    const winH = win.innerHeight || 0;
    const vvH = vv?.height || winH;
    const vvTop = vv?.offsetTop || 0;
    const vvBottom = vv ? vvTop + vvH : winH;
    if (winW && Math.abs(winW - this.lastViewportW) > 40) {
      this.lastViewportW = winW;
      this.baseViewportH = 0;
      this.baseLeafH = 0;
    }
    this.baseViewportH = Math.max(this.baseViewportH, winH, vvH);
    const { obsKbH, obsSafeB, envKbH, envSafeB, bodyPadB } = this.readKeyboardMetrics(doc, win);
    const isMobile = !!doc.body?.classList?.contains("is-mobile");
    const modalHost = this.sheetModal?.containerEl || (extraTarget?.classList?.contains?.("ds-sheet-modal-wrap") ? extraTarget : null);
    const mr = modalHost?.getBoundingClientRect?.();
    const refH = mr && mr.height > 120 ? mr.height : winH;
    const refBottom = mr && mr.bottom > 120 ? mr.bottom : winH;
    const layoutShrink = Math.max(0, this.baseViewportH - refH);
    const vvOverlap = Math.max(0, refBottom - vvBottom);
    const rawKbVar = Math.max(obsKbH, envKbH, bodyPadB > 100 ? bodyPadB : 0);
    const safeKbVar = obsSafeB > 100 ? obsSafeB : 0;
    let varInset = 0;
    if (layoutShrink > 100) {
      const netKb = Math.max(rawKbVar, safeKbVar > envSafeB ? safeKbVar - envSafeB : safeKbVar);
      varInset = Math.max(0, netKb - layoutShrink);
    } else {
      varInset = Math.max(rawKbVar, safeKbVar);
    }
    let leafKbInset = 0;
    if (isMobile) {
      const leafEl = this.containerEl?.closest?.(".workspace-leaf") || this.containerEl;
      const lr = leafEl?.getBoundingClientRect?.();
      if (lr && lr.height > 120) {
        this.baseLeafH = Math.max(this.baseLeafH, lr.height);
        const leafShrink = Math.max(0, this.baseLeafH - lr.height);
        if (leafShrink > 100 && refBottom > lr.bottom + 4) {
          leafKbInset = Math.round(refBottom - lr.bottom);
        }
      }
    }
    const primaryOccluded = Math.max(vvOverlap, varInset, leafKbInset);
    const fallbackNative = layoutShrink <= 100 && primaryOccluded <= 0 && this.nativeKbH > 80 ? this.nativeKbH : 0;
    const kbOccluded = Math.round(Math.max(primaryOccluded, fallbackNative));
    const kbOpen = layoutShrink > 100
      || kbOccluded > 100
      || !!doc.body?.classList?.contains("is-keyboard-open")
      || bodyPadB > 120;
    const candidates = [
      winH,
      vvH,
      kbOccluded > 0 && refH > kbOccluded + 120 ? refH - kbOccluded : 0,
      bodyPadB > 100 ? winH - bodyPadB : 0
    ].filter((n) => n > 120);
    const visH = candidates.length ? Math.round(Math.min(...candidates)) : 0;
    const safeBottomClosed = Math.max(envSafeB, obsSafeB < 100 ? obsSafeB : 0);
    const writeKbInset = kbOpen ? kbOccluded : Math.round(safeBottomClosed);
    let navBottom = 0;
    if (isMobile && !kbOpen) {
      const nav = doc.querySelector(".mobile-navbar");
      const nr = nav?.getBoundingClientRect?.();
      if (nr && nr.height > 0 && visH > 0 && nr.top < visH) {
        navBottom = Math.max(0, Math.ceil(visH - nr.top) + 4);
      } else {
        navBottom = 78;
      }
    }
    for (const host of [this.root, this.sheetModal?.containerEl, extraTarget]) {
      if (!host?.style) continue;
      if (visH > 0) host.style.setProperty("--ds-vvh", `${visH}px`);
      host.style.setProperty("--ds-nav-bottom", `${navBottom}px`);
      host.style.setProperty("--ds-write-kb-inset", `${writeKbInset}px`);
      host.classList?.toggle("is-kb-open", kbOpen);
      if (host.classList?.contains("ds-sheet-modal-wrap")) {
        const hmr = host.getBoundingClientRect?.();
        const kbLift = kbOpen && hmr && hmr.bottom > 120
          ? Math.round(Math.max(
            visH > 0 && hmr.bottom > visH + 4 ? hmr.bottom - visH : 0,
            kbOccluded
          ))
          : 0;
        host.style.setProperty("--ds-kb-lift", `${kbLift}px`);
      }
    }
  }
  scheduleKbChecks() {
    const win = this.root?.ownerDocument?.defaultView;
    if (!win) return;
    this.kbCheckTimers.forEach((id) => win.clearTimeout(id));
    this.kbCheckTimers = [60, 180, 360, 560].map((ms) => win.setTimeout(() => this.syncViewport(), ms));
  }
  handleBackAction() {
    if (this.lightbox?.isOpen) {
      this.lightbox.close();
      return true;
    }
    if (this.S.confirm) {
      this.S.confirm = null;
      this.renderConfirm();
      if (this.pending) this.renderAll();
      this.syncOverlayScope();
      return true;
    }
    if (this.S.menu) {
      this.S.menu = null;
      this.renderStream();
      this.syncOverlayScope();
      return true;
    }
    if (this.S.sheet) {
      if (this.S.sheet === "write" && this.composer?.dismissTools()) return true;
      this.setSheet(null);
      return true;
    }
    if (this.S.editing) {
      this.requestEditExit("edit");
      return true;
    }
    if (this.S.searchOpen && !this.searchModal?.open) {
      this.toggleSearch(false);
      return true;
    }
    return false;
  }
  syncOverlayScope() {
    const needs = !this.sheetModal && !!(this.S.menu || this.S.confirm || (this.S.searchOpen && !this.searchModal?.open) || this.lightbox?.isOpen || this.S.editing);
    if (needs && !this.overlayScope && import_obsidian3.Scope && this.app?.keymap) {
      const scope = new import_obsidian3.Scope(this.app.scope);
      scope.register([], "Escape", () => this.handleBackAction() ? false : void 0);
      this.overlayScope = scope;
      this.app.keymap.pushScope(scope);
    } else if (!needs && this.overlayScope) {
      this.app?.keymap?.popScope(this.overlayScope);
      this.overlayScope = null;
    }
  }
  setSheet(next) {
    const prev = this.S.sheet;
    if (prev === next) return;
    if (this.sheetModal) {
      const oldModal = this.sheetModal;
      this.sheetModal = null;
      oldModal.close();
    }
    this.S.sheet = next;
    this.S.showCal = next === "cal";
    this.root?.toggleClass?.("show-cal", next === "cal");
    this.root?.toggleClass?.("has-sheet", !!next);
    this.root?.querySelector(".ds-fab")?.classList.toggle("is-hidden", !!next);
    if (!next) {
      this.root?.querySelector(".ds-backdrop")?.classList.remove("is-open");
      [".ds-write-sheet", ".ds-side", ".ds-filter-sheet"].forEach((sel) => {
        const el = this.q(sel);
        el?.classList.remove("is-open", "is-dragging", "is-input-focused");
        if (el) el.style.transform = "";
      });
      this.syncOverlayScope();
      return;
    }
    if (next === "write") this.composer?.renderQuickTags();
    const sheetSel = next === "write" ? ".ds-write-sheet" : next === "cal" ? ".ds-side" : ".ds-filter-sheet";
    const sheetEl = this.q(sheetSel);
    const onShown = () => {
      if (next === "cal") {
        this.root?.ownerDocument?.defaultView?.requestAnimationFrame(() => this.renderHeat());
      }
      if (next === "write") {
        this.syncViewport();
        this.root?.ownerDocument?.defaultView?.setTimeout(() => {
          if (this.S.sheet !== "write") return;
          this.composer?.autosize();
          this.composer?.ta?.focus({ preventScroll: true });
          this.scheduleKbChecks();
        }, 220);
      }
    };
    if (DiarySheetModal && this.app && sheetEl) {
      const modal = new DiarySheetModal(this.app, this, sheetEl, {
        modalClass: next === "write" ? "is-write-modal" : "is-bottom-modal",
        onEscape: () => {
          if (next === "write" && this.composer?.dismissTools()) return false;
          return true;
        },
        onShown,
        onClosed: () => {
          if (this.sheetModal !== modal) return;
          this.sheetModal = null;
          this.S.sheet = null;
          this.S.showCal = false;
          this.root?.toggleClass?.("show-cal", false);
          this.root?.toggleClass?.("has-sheet", false);
          this.root?.querySelector(".ds-fab")?.classList.remove("is-hidden");
          this.syncOverlayScope();
        }
      });
      this.sheetModal = modal;
      this.syncOverlayScope();
      modal.open();
    } else {
      this.root?.querySelector(".ds-backdrop")?.classList.add("is-open");
      [".ds-write-sheet", ".ds-side", ".ds-filter-sheet"].forEach((sel) => {
        this.root?.querySelector(sel)?.classList.toggle("is-open", sel === sheetSel);
      });
      onShown();
      this.syncOverlayScope();
    }
  }
  bindSheetDrag(sheet) {
    if (!sheet) return;
    let startY = 0, dy = 0, dragging = false;
    sheet.addEventListener("pointerdown", (e) => {
      if (!sheet.classList.contains("is-open")) return;
      if (!e.target.closest(".ds-sheet-handle,.ds-sheet-head,.ds-sheet-write-head") || e.target.closest("button,input")) return;
      dragging = true;
      startY = e.clientY;
      dy = 0;
      sheet.classList.add("is-dragging");
      sheet.setPointerCapture?.(e.pointerId);
    });
    sheet.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = dy ? `translateY(${dy}px)` : "";
    });
    const finish = () => {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove("is-dragging");
      sheet.style.transform = "";
      if (dy > 80) this.setSheet(null);
    };
    sheet.addEventListener("pointerup", finish);
    sheet.addEventListener("pointercancel", finish);
  }
  async onOpen() {
    const c = this.contentEl;
    c.empty();
    c.addClass("ds-view");
    this.root = c.createDiv({ cls: "ds-root ds-scope" });
    this.applyPalette();
    this.root.innerHTML = `
      <div class="ds-wrap">
        <div class="ds-mhead">
          <button type="button" class="ds-calbtn ds-month-trigger" data-act="togglecal"><span class="ds-month-title"></span><span class="ds-month-sub"></span><span class="ds-month-chev" data-icon="chevron-down"></span></button>
          <div class="ds-head-actions">
            <div class="ds-search-slot"><div class="ds-searchbox"><button type="button" class="ds-searchbtn" data-act="togglesearch" aria-expanded="false"><span data-icon="search"></span><span class="ds-sr-only">\u641C\u7D22\u65E5\u8BB0</span></button><div class="ds-searchfield" aria-hidden="true"><label class="ds-search-label"><span class="ds-sr-only">\u641C\u7D22\u5185\u5BB9\u3001\u526F\u6807\u9898\u6216\u6807\u7B7E</span><input type="search" class="ds-q" placeholder="\u641C\u7D22\u65E5\u8BB0\u2026" enterkeyhint="search" disabled></label><button type="button" class="ds-searchclear" data-act="clearsearch" disabled hidden><span data-icon="x"></span><span class="ds-sr-only">\u6E05\u7A7A\u641C\u7D22</span></button></div></div></div>
            <button type="button" class="ds-icon-btn ds-filter-trigger ds-only-narrow" data-act="togglefilter"><span data-icon="sliders-horizontal"></span><span class="ds-sr-only">\u7B5B\u9009\u4E0E\u6807\u7B7E</span></button>
          </div>
        </div>
        <aside class="ds-side ds-sheet-mobile">
          <div class="ds-sheet-handle ds-only-narrow"></div>
          <div class="ds-sheet-head ds-only-narrow"><span class="ds-sheet-title">\u65F6\u5149\u8DB3\u8FF9</span><button type="button" class="ds-sheet-close" data-act="closesheet"><span data-icon="x"></span><span class="ds-sr-only">\u5173\u95ED</span></button></div>
          <div class="ds-side-body">
            <div class="ds-box"><div class="ds-stats"></div><div class="ds-heat"></div></div>
            <div class="ds-box"><div class="ds-mcal"></div></div>
            <div class="ds-box ds-only-wide"><h5>\u7B5B\u9009</h5><div class="ds-chips ds-filterlist"></div></div>
            <div class="ds-box ds-only-wide"><h5>\u6807\u7B7E</h5><div class="ds-taglist"></div></div>
          </div>
        </aside>
        <main class="ds-main">
          <div class="ds-entry"><div class="ds-search-dock" hidden></div></div>
          <div class="ds-anchor"></div>
          <div class="ds-sticky"><div class="ds-filterbar" hidden></div></div>
          <div class="ds-stream-home"><div class="ds-stream"></div></div>
        </main>
      </div>
      <button type="button" class="ds-fab" data-act="openwrite"><span data-icon="pen-line"></span><span class="ds-sr-only">\u5199\u65E5\u8BB0</span></button>
      <div class="ds-backdrop" data-act="closesheet"></div>
      <section class="ds-sheet ds-write-sheet" role="dialog" aria-modal="true" aria-label="\u5199\u65E5\u8BB0">
        <div class="ds-sheet-handle"></div>
        <div class="ds-composer"></div>
      </section>
      <section class="ds-sheet ds-filter-sheet" role="dialog" aria-modal="true" aria-label="\u7B5B\u9009\u4E0E\u6807\u7B7E">
        <div class="ds-sheet-handle"></div>
        <div class="ds-sheet-head"><span class="ds-sheet-title">\u7B5B\u9009\u4E0E\u6807\u7B7E</span><button type="button" class="ds-sheet-close" data-act="closesheet"><span data-icon="x"></span><span class="ds-sr-only">\u5173\u95ED</span></button></div>
        <div class="ds-sheet-body"><div class="ds-sheet-sec"><h5>\u6309\u65F6\u95F4\u4E0E\u7C7B\u578B</h5><div class="ds-chips ds-mfilterlist"></div></div><div class="ds-sheet-sec"><h5>\u5E38\u7528\u6807\u7B7E</h5><div class="ds-taglist ds-mtaglist"></div></div></div>
      </section>
      <div class="ds-toast" hidden></div>
      <div class="ds-confirm" hidden></div>
      <div class="ds-kb-probe" aria-hidden="true"></div>`;
    this.icons(this.root);
    this.containerEl.addClass("ds-leaf");
    this.toTopBtn = this.containerEl.createEl("button", { cls: "ds-totop", attr: { type: "button" } });
    (0, import_obsidian3.setIcon)(this.toTopBtn, "arrow-up");
    this.toTopBtn.createSpan({ cls: "ds-sr-only", text: "\u56DE\u5230\u9876\u90E8" });
    this.toTopBtn.addEventListener("click", () => {
      this.contentEl.scrollTo({ top: 0, behavior: "smooth" });
    });
    const headerTitle = this.containerEl.querySelector(".view-header-title");
    if (headerTitle) {
      this.onTitleClick = () => {
        if (this.contentEl.scrollTop > 0) this.contentEl.scrollTo({ top: 0, behavior: "smooth" });
      };
      headerTitle.addEventListener("click", this.onTitleClick);
    }
    this.contentEl.addEventListener("scroll", this.onScroll, { passive: true });
    this.lightbox = new Lightbox(this.containerEl, (path) => {
      const f = this.store.fileAt(path);
      if (f) void this.app.workspace.getLeaf("tab").openFile(f);
    }, () => this.syncOverlayScope());
    this.composer = new Composer(this.root.querySelector(".ds-composer"), {
      tagCounts: () => this.tagCounts(),
      dayStartHour: () => this.settings.dayStartHour,
      previewFor: (st) => this.previewNew(st),
      close: () => this.setSheet(null),
      submit: async (st) => {
        const wasBuji = this.composer?.buji;
        const r = await this.store.append(st.when || /* @__PURE__ */ new Date(), { sub: st.sub, body: st.body, tags: st.tags }, st.atts);
        this.S.date = null;
        this.S.filter = "";
        this.S.tag = null;
        this.S.q = "";
        this.root.querySelector(".ds-q").value = "";
        this.setSheet(null);
        this.renderAll();
        this.toast(`${wasBuji ? "\u5DF2\u8865\u8BB0\u5230" : "\u5DF2\u5199\u5165"} ${r.path}${r.created ? "\uFF08\u65B0\u5EFA\uFF09" : ""}`);
        this.flash(r.path);
      }
    }, "new");
    const writeSheet = this.root.querySelector(".ds-write-sheet");
    if (writeSheet) {
      writeSheet.addEventListener("focusin", (e) => {
        if (!e.target?.matches?.("textarea,input")) return;
        const win = this.root?.ownerDocument?.defaultView;
        win?.clearTimeout(this.focusOutTimer);
        writeSheet.classList.add("is-input-focused");
        this.syncViewport();
        this.scheduleKbChecks();
      });
      writeSheet.addEventListener("focusout", () => {
        const win = this.root?.ownerDocument?.defaultView;
        win?.clearTimeout(this.focusOutTimer);
        this.focusOutTimer = win ? win.setTimeout(() => {
          const ae = this.root?.ownerDocument?.activeElement;
          if (!ae || !writeSheet.contains(ae) || !ae.matches?.("textarea,input")) {
            writeSheet.classList.remove("is-input-focused");
            this.nativeKbH = 0;
            this.syncViewport();
            this.scheduleKbChecks();
          }
        }, 140) : 0;
      });
    }
    [".ds-write-sheet", ".ds-side", ".ds-filter-sheet"].forEach((sel) => this.bindSheetDrag(this.root.querySelector(sel)));
    const q = this.root.querySelector(".ds-q");
    q.addEventListener("input", () => {
      this.S.q = q.value;
      this.S.limit = 30;
      this.renderStream();
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !e.isComposing) {
        e.preventDefault();
        e.stopPropagation();
        if (this.S.confirm) {
          this.S.confirm = null;
          this.renderConfirm();
          this.syncOverlayScope();
          return;
        }
        this.toggleSearch(false);
      }
    });
    this.onSheetKeydown = (e) => {
      if (e.key === "Escape" && !e.isComposing && !this.sheetModal && this.S.sheet && !this.S.editing && !this.S.confirm) {
        if (this.S.sheet === "write" && this.composer?.dismissTools()) return;
        e.preventDefault();
        this.setSheet(null);
      }
    };
    this.root.ownerDocument.addEventListener("keydown", this.onSheetKeydown);
    const win = this.root.ownerDocument.defaultView;
    const vv = win?.visualViewport;
    this.vvHandler = () => this.syncViewport();
    if (vv) {
      vv.addEventListener("resize", this.vvHandler);
      vv.addEventListener("scroll", this.vvHandler);
    }
    this.onWinResize = () => this.syncViewport();
    win?.addEventListener("resize", this.onWinResize);
    this.kbEventHandler = (e) => {
      if (e?.type === "keyboardWillHide" || e?.type === "keyboardDidHide") {
        this.nativeKbH = 0;
      } else if (typeof e?.keyboardHeight === "number" && e.keyboardHeight > 0) {
        const winH = win?.innerHeight || 0;
        const dpr = win?.devicePixelRatio || 1;
        let h = e.keyboardHeight;
        if (winH > 0 && h > winH * 0.65 && dpr > 1.25) h = h / dpr;
        if (h > 80 && (!winH || h < winH * 0.75)) this.nativeKbH = Math.round(h);
      }
      this.syncViewport();
      this.scheduleKbChecks();
    };
    ["keyboardWillShow", "keyboardDidShow", "keyboardWillHide", "keyboardDidHide"].forEach((ev) => win?.addEventListener(ev, this.kbEventHandler));
    this.syncViewport();
    this.root.addEventListener("click", (e) => this.onClick(e));
    this.root.ownerDocument.addEventListener("click", this.onSearchOutside, true);
    const updateWidth = () => {
      const narrow = this.root.clientWidth < 760;
      this.root.toggleClass("is-narrow", narrow);
      this.root.toggleClass("is-compact", this.root.clientWidth < 480);
      this.containerEl.toggleClass("is-narrow", narrow);
      if (this.sheetModal?.containerEl) {
        this.sheetModal.containerEl.classList.toggle("is-narrow", narrow);
        this.sheetModal.containerEl.classList.toggle("is-compact", this.root.clientWidth < 480);
      }
      if (!narrow && this.S.sheet === "cal") this.setSheet(null);
      const heat = this.q(".ds-heat");
      if (heat?.clientWidth && heat.dataset.weeks !== String(this.heatWeeks())) this.renderHeat();
      this.syncViewport();
    };
    this.ro = new ResizeObserver(updateWidth);
    this.ro.observe(this.root);
    if (this.containerEl) this.ro.observe(this.containerEl);
    this.ro.observe(this.root.querySelector(".ds-heat"));
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
    const win = this.root?.ownerDocument?.defaultView;
    win?.clearTimeout(this.focusOutTimer);
    this.kbCheckTimers.forEach((id) => win?.clearTimeout(id));
    this.kbCheckTimers = [];
    if (this.sheetModal) {
      const m = this.sheetModal;
      this.sheetModal = null;
      m.close();
    }
    if (this.overlayScope) {
      this.app?.keymap?.popScope(this.overlayScope);
      this.overlayScope = null;
    }
    this.editExitDialog?.close();
    this.editExitDialog?.remove();
    this.root?.querySelectorAll("audio").forEach((audio) => audio.pause());
    this.searchMotionId++;
    this.searchAnimations.forEach((animation) => animation.cancel());
    this.searchModal?.close();
    this.searchModal?.remove();
    if (this.onSheetKeydown) this.root.ownerDocument.removeEventListener("keydown", this.onSheetKeydown);
    const vv = win?.visualViewport;
    if (vv && this.vvHandler) {
      vv.removeEventListener("resize", this.vvHandler);
      vv.removeEventListener("scroll", this.vvHandler);
    }
    if (win && this.onWinResize) win.removeEventListener("resize", this.onWinResize);
    if (win && this.kbEventHandler) {
      ["keyboardWillShow", "keyboardDidShow", "keyboardWillHide", "keyboardDidHide"].forEach((ev) => win.removeEventListener(ev, this.kbEventHandler));
    }
    this.syncKbObservers(false);
    if (this.onTitleClick) this.containerEl?.querySelector(".view-header-title")?.removeEventListener("click", this.onTitleClick);
    this.root.ownerDocument.removeEventListener("click", this.onSearchOutside, true);
    win?.clearTimeout(this.searchOutsideTimer);
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
      if (!x.querySelector("svg") || x.classList.contains("ds-vplay")) (0, import_obsidian3.setIcon)(x, n);
    });
  }
  /* ---------------- 数据 ---------------- */
  isSearchInteraction(target) {
    return [".ds-main", ".ds-side", ".ds-calbtn", ".ds-filter-trigger", ".ds-filter-sheet", ".ds-write-sheet", ".ds-fab", ".ds-confirm", ".ds-toast"].some((selector) => this.root.querySelector(selector)?.contains(target)) || !!this.sheetModal?.containerEl?.contains(target) || !!this.searchModal?.contains(target) || !!this.lightbox?.el.contains(target);
  }
  toggleSearch(open, restoreFocus = true) {
    if (!open && this.S.editing) {
      this.requestEditExit("search");
      return;
    }
    if (!open && this.S.confirm) return;
    if (open && this.S.sheet) this.setSheet(null);
    if (this.searchModal?.open || open && !this.root.classList.contains("is-narrow")) {
      this.toggleDesktopSearch(open, restoreFocus);
      return;
    }
    if (open === this.S.searchOpen) return;
    this.root.ownerDocument.defaultView.clearTimeout(this.searchOutsideTimer);
    this.searchOutsideTimer = 0;
    const box = this.root.querySelector(".ds-searchbox");
    const entry = this.root.querySelector(".ds-entry");
    const dock = this.root.querySelector(".ds-search-dock");
    const slot = this.root.querySelector(".ds-search-slot");
    const input = this.root.querySelector(".ds-q");
    const button = this.root.querySelector(".ds-searchbtn");
    const win = this.root.ownerDocument.defaultView;
    const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.searchAnimations.forEach((animation) => animation.cancel());
    this.searchAnimations = [];
    const motionId = ++this.searchMotionId;
    this.S.searchOpen = open;
    if (open) {
      const from = box.getBoundingClientRect();
      const fromHeight = entry.getBoundingClientRect().height;
      button.disabled = true;
      this.root.toggleClass("is-search-open", true);
      box.classList.add("is-open");
      dock.hidden = false;
      dock.appendChild(box);
      entry.style.height = "";
      input.disabled = false;
      this.root.querySelector(".ds-searchclear").disabled = false;
      this.root.querySelector(".ds-searchfield").setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
      button.classList.add("is-on");
      input.focus({ preventScroll: true });
      if (!reduced) {
        const to = box.getBoundingClientRect();
        const toHeight = entry.getBoundingClientRect().height;
        const options = { duration: 260, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
        entry.style.height = `${toHeight}px`;
        const surface = box.animate([
          { transform: `translate(${from.left - to.left}px,${from.top - to.top}px)`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: "999px" },
          { transform: "translate(0,0)", width: `${to.width}px`, height: `${to.height}px`, borderRadius: "999px" }
        ], options);
        const layout = entry.animate([{ height: `${fromHeight}px` }, { height: `${toHeight}px` }], options);
        this.searchAnimations = [surface, layout];
        layout.onfinish = () => {
          if (motionId !== this.searchMotionId) return;
          entry.style.height = "";
          this.searchAnimations = [];
        };
      }
      this.syncOverlayScope();
      return;
    }
    // 收起搜索：先在原位淡出并收起高度，完成后再把 36x36 搜索壳归位到顶栏，彻底避免挤压「11月 2026」闪动
    const fromHeight = entry.getBoundingClientRect().height;
    input.disabled = true;
    this.root.querySelector(".ds-searchclear").disabled = true;
    this.root.querySelector(".ds-searchfield").setAttribute("aria-hidden", "true");
    button.setAttribute("aria-expanded", "false");
    button.classList.remove("is-on");
    if (this.S.q) {
      this.S.q = "";
      this.S.limit = 30;
      input.value = "";
      this.renderStream();
    }
    const finishClose = () => {
      if (motionId !== this.searchMotionId) return;
      box.classList.remove("is-open");
      dock.hidden = true;
      slot.appendChild(box);
      this.root.toggleClass("is-search-open", false);
      entry.style.height = "";
      button.disabled = false;
      this.searchAnimations = [];
      if (restoreFocus) button.focus({ preventScroll: true });
    };
    if (reduced || fromHeight <= 0) {
      finishClose();
    } else {
      const options = { duration: 180, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
      entry.style.height = `${fromHeight}px`;
      const fade = box.animate([
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-4px)" }
      ], options);
      const collapse = entry.animate([{ height: `${fromHeight}px` }, { height: "0px" }], options);
      this.searchAnimations = [fade, collapse];
      collapse.onfinish = finishClose;
    }
    this.syncOverlayScope();
  }
  toggleDesktopSearch(open, restoreFocus = true) {
    if (this.searchModalClosing || open === this.S.searchOpen) return;
    const doc = this.root.ownerDocument, win = doc.defaultView;
    const box = this.root.querySelector(".ds-searchbox"), input = this.root.querySelector(".ds-q"), button = this.root.querySelector(".ds-searchbtn");
    const stream = this.root.querySelector(".ds-stream");
    const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    win.clearTimeout(this.searchOutsideTimer);
    this.searchOutsideTimer = 0;
    if (open) {
      this.S.searchOpen = true;
      this.searchSelected = null;
      const modal = doc.createElement("dialog");
      modal.className = "ds-search-modal";
      const labelId = `ds-search-${Math.random().toString(36).slice(2)}`;
      modal.setAttribute("aria-labelledby", labelId);
      modal.innerHTML = `<header class="ds-modal-head"><h2 class="ds-sr-only" id="${labelId}">\u641C\u7D22\u65E5\u8BB0</h2><div class="ds-modal-input"></div><button type="button" class="ds-modal-dismiss" data-act="closesearch">Esc<span class="ds-sr-only"> \u5173\u95ED\u641C\u7D22</span></button></header><div class="ds-modal-body"><div class="ds-modal-results" role="listbox" aria-labelledby="${labelId}"></div><section class="ds-modal-preview"></section></div><footer class="ds-modal-foot"><span class="ds-modal-count" aria-live="polite"></span><span>\u2191 \u2193 \u9009\u62E9\u65E5\u8BB0</span></footer>`;
      this.searchModal = modal;
      this.searchSnapshot = stream.cloneNode(true);
      this.searchSnapshot.className = "ds-search-snapshot";
      this.searchSnapshot.inert = true;
      stream.parentElement.insertBefore(this.searchSnapshot, stream);
      this.root.appendChild(modal);
      [".ds-confirm", ".ds-toast"].forEach((selector) => modal.appendChild(this.root.querySelector(selector)));
      if (this.lightbox) modal.appendChild(this.lightbox.el);
      modal.querySelector(".ds-modal-input").appendChild(box);
      modal.querySelector(".ds-modal-preview").appendChild(stream);
      this.root.classList.add("is-search-modal");
      box.classList.add("is-open");
      button.disabled = true;
      button.setAttribute("aria-expanded", "true");
      input.disabled = false;
      this.root.querySelector(".ds-searchclear").disabled = false;
      this.root.querySelector(".ds-searchfield").setAttribute("aria-hidden", "false");
      modal.addEventListener("cancel", (event) => {
        if (event.target !== modal) return;
        event.preventDefault();
        if (this.S.confirm) {
          this.S.confirm = null;
          this.renderConfirm();
          return;
        }
        if (this.S.editing) {
          if (this.editComposer?.dismissTools()) this.editComposer.ta.focus({ preventScroll: true });
          else this.requestEditExit("edit");
          return;
        }
        this.toggleSearch(false);
      });
      modal.addEventListener("click", (event) => {
        if (event.target !== modal) return;
        const r = modal.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) this.toggleSearch(false);
      });
      modal.addEventListener("keydown", (event) => {
        if (event.isComposing || event.target !== input || !["ArrowDown", "ArrowUp"].includes(event.key) || !this.searchResults.length || this.S.editing) return;
        event.preventDefault();
        const current = this.searchResults.findIndex((section) => `${section.path}#${section.idx}` === this.searchSelected);
        const next = current < 0 ? event.key === "ArrowDown" ? 0 : this.searchResults.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + this.searchResults.length) % this.searchResults.length;
        const section = this.searchResults[next];
        this.searchSelected = `${section.path}#${section.idx}`;
        this.renderStream();
        modal.querySelector(".ds-result.is-on")?.scrollIntoView({ block: "nearest" });
      });
      modal.showModal();
      this.renderStream();
      input.focus({ preventScroll: true });
      if (!reduced) this.searchAnimations = [modal.animate([{ opacity: 0, transform: "translateY(10px) scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.22,.68,.18,1)" })];
      return;
    }
    const modal = this.searchModal;
    if (!modal) return;
    this.searchModalClosing = true;
    input.disabled = true;
    const finish = () => {
      modal.close();
      this.S.searchOpen = false;
      this.S.q = "";
      input.value = "";
      this.searchModal = null;
      this.searchModalClosing = false;
      this.searchSelected = null;
      this.searchResults = [];
      this.searchSnapshot?.remove();
      this.searchSnapshot = null;
      this.root.querySelector(".ds-search-slot").appendChild(box);
      this.root.querySelector(".ds-stream-home").appendChild(stream);
      [".ds-confirm", ".ds-toast"].forEach((selector) => this.root.appendChild(modal.querySelector(selector)));
      if (this.lightbox) this.containerEl.appendChild(this.lightbox.el);
      modal.remove();
      this.root.classList.remove("is-search-modal");
      box.classList.remove("is-open");
      button.disabled = false;
      button.setAttribute("aria-expanded", "false");
      this.root.querySelector(".ds-searchfield").setAttribute("aria-hidden", "true");
      this.searchAnimations = [];
      this.renderAll();
      if (restoreFocus) button.focus({ preventScroll: true });
    };
    this.searchAnimations.forEach((animation) => animation.cancel());
    if (reduced) finish();
    else {
      const animation = modal.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(5px) scale(.99)" }], { duration: 140, easing: "ease-out" });
      this.searchAnimations = [animation];
      animation.onfinish = finish;
    }
  }
  renderDesktopResults(days) {
    this.searchResults = days.flatMap((day) => day.sections);
    if (!this.searchResults.some((section) => `${section.path}#${section.idx}` === this.searchSelected)) {
      const first = this.S.q.trim() ? this.searchResults[0] : null;
      this.searchSelected = first ? `${first.path}#${first.idx}` : null;
    }
    const label = (text) => highlight(`>${esc(text)}<`, this.S.q).slice(1, -1);
    this.searchModal.querySelector(".ds-modal-results").innerHTML = days.length ? days.map((day) => `<div class="ds-results-day">${this.dayLabel(day.date)}</div>${day.sections.map((section) => {
      const key = `${section.path}#${section.idx}`, text = section.text.replace(/\s+/g, " ").trim(), title = section.sub || text.slice(0, 30) || "\u65E5\u8BB0", excerpt = section.sub ? text.slice(0, 110) : text.slice(30, 125);
      return `<button type="button" class="ds-result${key === this.searchSelected ? " is-on" : ""}" role="option" aria-selected="${key === this.searchSelected}" data-resultkey="${esc(key)}"><span class="ds-result-title">${label(title)}</span><time>${esc(sectionTimeLabel(section))}</time>${excerpt ? `<span class="ds-result-excerpt">${label(excerpt)}</span>` : ""}</button>`;
    }).join("")}`).join("") : '<div class="ds-results-empty">\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u65E5\u8BB0<br><span>\u6362\u4E2A\u5173\u952E\u8BCD\u8BD5\u8BD5</span></div>';
    this.searchModal.querySelector(".ds-modal-count").textContent = `${this.searchResults.length} \u6761\u65E5\u8BB0`;
    return this.searchResults.find((section) => `${section.path}#${section.idx}` === this.searchSelected) || null;
  }
  endEditing() {
    this.S.editing = null;
    if (this.pending) this.renderAll();
    else this.renderStream();
    this.syncOverlayScope();
  }
  requestEditExit(intent = "edit") {
    const editor = this.editComposer;
    if (!this.S.editing || !editor || editor.busy || this.editExitDialog?.open) return;
    const complete = () => {
      if (intent === "search") this.toggleSearch(false);
      else {
        const card = this.root.querySelector(".ds-stream .ds-card");
        if (card) { card.tabIndex = -1; card.focus({ preventScroll: true }); }
      }
    };
    if (!editor.isDirty()) {
      this.endEditing();
      complete();
      return;
    }
    const doc = this.root.ownerDocument, previousFocus = doc.activeElement;
    const dialog = doc.createElement("dialog");
    dialog.className = "ds-edit-exit";
    const titleId = `ds-edit-exit-${Math.random().toString(36).slice(2)}`;
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.innerHTML = `<h3 id="${titleId}">\u8981\u4FDD\u5B58\u8FD9\u6B21\u4FEE\u6539\u5417\uFF1F</h3><p>\u8FD9\u6761\u65E5\u8BB0\u6709\u5C1A\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\u3002</p><p class="ds-edit-exit-error" role="alert" hidden></p><div class="ds-edit-exit-actions"><button type="button" data-edit-choice="continue">\u7EE7\u7EED\u7F16\u8F91</button><button type="button" data-edit-choice="discard">\u653E\u5F03\u4FEE\u6539</button><button type="button" data-edit-choice="save">\u4FDD\u5B58\u66F4\u6539</button></div>`;
    (this.searchModal || this.root).appendChild(dialog);
    this.editExitDialog = dialog;
    const close = (refocus) => {
      dialog.close();
      dialog.remove();
      this.editExitDialog = null;
      this.editExitBusy = false;
      if (refocus) (previousFocus?.isConnected ? previousFocus : editor.ta).focus({ preventScroll: true });
    };
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.editExitBusy) close(true);
    });
    dialog.addEventListener("click", async (event) => {
      const choice = event.target.closest("[data-edit-choice]")?.dataset.editChoice;
      if (!choice || this.editExitBusy) return;
      event.stopPropagation();
      if (choice === "continue") { close(true); return; }
      if (choice === "discard") { close(false); this.endEditing(); complete(); return; }
      this.editExitBusy = true;
      dialog.querySelectorAll("button").forEach((button) => button.disabled = true);
      const saved = await editor.send();
      if (saved) { close(false); complete(); }
      else {
        this.editExitBusy = false;
        dialog.querySelectorAll("button").forEach((button) => button.disabled = false);
        const error = dialog.querySelector(".ds-edit-exit-error");
        error.textContent = "\u4FDD\u5B58\u6CA1\u6709\u6210\u529F\uFF0C\u4FEE\u6539\u4ECD\u7136\u4FDD\u7559\u3002\u4F60\u53EF\u4EE5\u91CD\u8BD5\u6216\u7EE7\u7EED\u7F16\u8F91\u3002";
        error.hidden = false;
      }
    });
    dialog.showModal();
    dialog.querySelector('[data-edit-choice="continue"]').focus();
    if (!doc.defaultView.matchMedia("(prefers-reduced-motion: reduce)").matches) dialog.animate([{ opacity: 0, transform: "translateY(5px) scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 160, easing: "ease-out" });
  }
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
    const body = resolveInlineImages(st.body, st.atts, (a, i) => `${this.store.attFolder}/${a.kind === "img" ? "IMG" : "\u5F55\u97F3"}_\u2026${i ? "_" + i : ""}.${a.ext}`);
    const entry = { ...entryTime(w, this.settings.dayStartHour), sub: st.sub, body, tags: st.tags };
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
    this.composer?.renderQuickTags();
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
    const st = this.q(".ds-stats");
    if (st) st.innerHTML = `<div class="ds-stats-summary"><span>\u5DF2\u5199\u4E0B <b>${days.length}</b> \u5929 \xB7 <b>${all.length}</b> \u7BC7</span><span>\u8FDE\u7EED <b>${streak}</b> \u5929</span></div>`;
  }
  renderChips() {
    const all = this.allSections(), tc = this.tagCounts();
    const chip = (f) => `<button type="button" class="ds-chip${this.S.filter === f.key ? " is-on" : ""}" data-chip="${f.key}">${esc(f.label)}${f.key ? `<i>${all.filter(f.fn).length}</i>` : ""}</button>`;
    const tchip = ([t, n]) => `<button type="button" class="ds-chip ds-tagchip${this.S.tag === t ? " is-on" : ""}" data-tagchip="${esc(t)}">#${esc(t)}<i>${n}</i></button>`;
    const filterHtml = this.filters().map(chip).join("");
    const tagHtml = tc.length ? tc.map(tchip).join("") : '<span class="ds-muted">\u8FD8\u6CA1\u6709\u6807\u7B7E\u3002\u5199\u65E5\u8BB0\u65F6\u70B9 # \u6DFB\u52A0\u3002</span>';
    const fl = this.q(".ds-filterlist"), tl = this.q(".ds-taglist");
    if (fl) fl.innerHTML = filterHtml;
    if (tl) tl.innerHTML = tagHtml;
    const mfl = this.q(".ds-mfilterlist"), mtl = this.q(".ds-mtaglist");
    if (mfl) mfl.innerHTML = filterHtml;
    if (mtl) mtl.innerHTML = tagHtml;
    this.root.querySelector(".ds-filter-trigger")?.classList.toggle("has-dot", !!(this.S.filter || this.S.tag || this.S.date));
  }
  heatWeeks() {
    const heat = this.q(".ds-heat");
    const width = heat?.clientWidth || 0;
    if (!width) return 12;
    const cell = this.root.classList.contains("is-narrow") ? 16 : 13;
    return Math.max(8, Math.min(26, Math.floor((width + 3) / (cell + 3))));
  }
  renderHeat() {
    const by = {};
    const days = this.days();
    days.forEach((d) => by[d.date] = d.size);
    const sizes = days.map((d) => d.size).sort((a, b) => a - b);
    const Q = (p) => sizes[Math.floor((sizes.length - 1) * p)] || 0;
    const lv = (n) => n === 0 ? 0 : n <= Q(0.33) ? 1 : n <= Q(0.7) ? 2 : 3;
    const today = logicalDate(/* @__PURE__ */ new Date(), this.settings.dayStartHour);
    const end = parseYmd([today, days[0]?.date || today].sort().pop()), weeks = this.heatWeeks();
    const start = new Date(end);
    start.setDate(end.getDate() - end.getDay() - 7 * (weeks - 1));
    const last = new Date(end);
    last.setDate(end.getDate() + (6 - end.getDay()));
    let cells = "";
    for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
      const k2 = ymd(d), n = by[k2] || 0;
      cells += `<button type="button" class="ds-hc l${lv(n)}${this.S.date === k2 ? " is-sel" : ""}${k2 === today ? " is-today" : ""}" ${n ? `data-date="${k2}"` : "disabled"} aria-label="${k2}${n ? " \xB7 " + (n / 1024).toFixed(1) + "KB" : ""}" title="${k2}"></button>`;
    }
    const heat = this.q(".ds-heat");
    if (!heat) return;
    heat.dataset.weeks = String(weeks);
    heat.innerHTML = `<div class="ds-hgrid" style="--ds-heat-weeks:${weeks}">${cells}</div><div class="ds-hlegend"><span>\u8FD1 ${weeks} \u5468</span><span class="ds-sp"></span><span>\u5C11</span><i class="ds-hc l0"></i><i class="ds-hc l1"></i><i class="ds-hc l2"></i><i class="ds-hc l3"></i><span>\u591A</span></div>`;
  }
  renderMonth() {
    const days = this.days();
    if (!this.S.month) this.S.month = (days[0]?.date || ymd(/* @__PURE__ */ new Date())).slice(0, 7);
    const [y, m] = this.S.month.split("-").map(Number), first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate();
    const mt = this.root.querySelector(".ds-month-title"), ms = this.root.querySelector(".ds-month-sub");
    if (mt) mt.textContent = `${m}\u6708`;
    if (ms) ms.textContent = String(y);
    const has = new Set(days.map((d) => d.date));
    let h = `<div class="ds-mhd"><button type="button" class="clickable-icon" data-mnav="-1"><span data-icon="chevron-left"></span><span class="ds-sr-only">\u4E0A\u4E2A\u6708</span></button><b>${y} \u5E74 ${m} \u6708</b><button type="button" class="clickable-icon" data-mnav="1"><span data-icon="chevron-right"></span><span class="ds-sr-only">\u4E0B\u4E2A\u6708</span></button></div><div class="ds-mgrid">`;
    h += "\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D".split("").map((w) => `<span class="ds-w">${w}</span>`).join("");
    for (let i = 0; i < first.getDay(); i++) h += "<span></span>";
    for (let d = 1; d <= n; d++) {
      const k2 = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      h += has.has(k2) ? `<button type="button" class="ds-md is-has${this.S.date === k2 ? " is-sel" : ""}" data-date="${k2}">${d}</button>` : `<span class="ds-md">${d}</span>`;
    }
    const el = this.q(".ds-mcal");
    if (!el) return;
    el.innerHTML = h + "</div>";
    this.icons(el);
  }
  /** dayTags：当天只在属性里的标签，放在这一天最下面那张卡片里（不放在卡片外面） */
  card(s, dayTags = []) {
    const key = `${s.path}#${s.idx}`;
    const long = s.text.length > 150 || s.hasImg && s.text.length > 75 || s.content.split("\n").length > 8;
    const when = s.time ? `<span class="ds-t">${esc(sectionTimeLabel(s))}</span>${s.late ? '<span class="ds-late">\u51CC\u6668</span>' : ""}${s.buji ? '<span class="ds-buji-mark">\xB7 \u8865\u8BB0</span>' : ""}` : "";
    const subClean = s.buji ? s.sub.replace(/^\u8865\u8BB0\s*[·|｜:\uFF1A-]?\s*/, "") : s.sub;
    const sub = subClean ? `<h3 class="ds-sub">${highlight(`>${esc(subClean)}<`, this.S.q).slice(1, -1)}</h3>` : "";
    const ctx = { resolve: (l) => this.store.resolve(l, s.path) };
    const extra = s.tags.filter((t) => !s.tagLine.includes(t));
    const own = [...s.tagLine, ...extra];
    const tags = [...own, ...dayTags.filter((t) => !own.includes(t))];
    if (this.S.editing === key) {
      if (this.searchModal?.open) return `<article class="ds-card is-editing ds-inline-edit" data-key="${esc(key)}"><header class="ds-chead">${when}</header>${sub}<div class="ds-tags">${tags.map((tag) => `<span class="ds-tag">#${esc(tag)}</span>`).join("")}</div><div class="ds-edhost"></div></article>`;
      return `<article class="ds-card is-editing" data-key="${esc(key)}"><div class="ds-edhost"></div></article>`;
    }
    const rendered = highlight(renderMarkdown(s.content, ctx), this.S.q);
    const cardImgs = long && !this.searchModal?.open ? extractCardImages(rendered) : [];
    let stripHtml = "";
    if (cardImgs.length) {
      const shown = cardImgs.slice(0, 3);
      const extraCnt = cardImgs.length - 3;
      stripHtml = `<div class="ds-collapsed-strip cnt-${shown.length}">${shown.map((img, i) => `<button type="button" class="ds-strip-thumb" data-strip-idx="${i}"><img loading="lazy" decoding="async" alt="" src="${img.url}" data-path="${img.path}">${i === 2 && extraCnt > 0 ? `<span class="ds-strip-more">+${extraCnt}</span>` : ""}</button>`).join("")}</div>`;
    }
    const showClamp = long && !this.searchModal?.open;
    const hasFoot = tags.length || showClamp;
    return `<article class="ds-card${s.buji ? " is-buji" : ""}" data-key="${esc(key)}">
      <header class="ds-chead">${when}<span class="ds-badges">${s.hasVoice ? '<span data-icon="mic"></span>' : ""}</span>
        <button type="button" class="ds-kebab clickable-icon" data-menu="${esc(key)}"><span data-icon="more-horizontal"></span><span class="ds-sr-only">\u66F4\u591A</span></button>
        ${this.S.menu === key ? `<div class="ds-menu" role="menu"><button type="button" data-editkey="${esc(key)}"><span data-icon="pencil"></span>\u7F16\u8F91</button><button type="button" data-delkey="${esc(key)}" class="mod-warning"><span data-icon="trash-2"></span>\u5220\u9664</button><button type="button" data-openkey="${esc(key)}"><span data-icon="file-text"></span>\u6253\u5F00\u6E90\u6587\u4EF6</button></div>` : ""}
      </header>
      ${sub}
      <div class="ds-body-wrap${showClamp ? " is-clamped" : ""}"${showClamp ? ` style="max-height:${CLAMP_PX}px"` : ""}><div class="ds-body">${rendered}</div></div>
      ${stripHtml}
      ${hasFoot ? `<footer class="ds-card-foot"><div class="ds-tags">${tags.map((t) => `<button type="button" class="ds-tag${own.includes(t) ? "" : " ds-dtag"}${this.S.tag === t ? " is-on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</div>${showClamp ? '<button type="button" class="ds-more"><span class="ds-more-txt">\u5C55\u5F00</span><span class="ds-more-ic" data-icon="chevron-down"></span></button>' : ""}</footer>` : ""}
    </article>`;
  }
  dayLabel(d) {
    const dt = parseYmd(d);
    return `${dt.getMonth() + 1}\u6708${dt.getDate()}\u65E5<span class="ds-wd"> \xB7 \u661F\u671F${"\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D"[dt.getDay()]}</span>`;
  }
  dayHeadHtml(d, todayLog) {
    const dt = parseYmd(d.date);
    const isToday = d.date === todayLog;
    const dayNum = String(dt.getDate()).padStart(2, "0");
    const wd = `\u661F\u671F${"\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D"[dt.getDay()]}`;
    return `<div class="ds-day-head"><span class="ds-day-num">${dayNum}</span><div class="ds-day-meta"><span class="ds-day-sub">${dt.getMonth() + 1}\u6708${isToday ? '<span class="ds-today-dot">\u4ECA\u5929</span>' : ""}</span><span class="ds-wd">${wd}</span></div><div class="ds-day-right">${!isToday ? `<button type="button" class="ds-day-buji" data-bujiday="${d.date}">+ \u8865\u8BB0</button>` : ""}<span class="ds-dcount">${d.sections.length} \u7BC7</span></div></div>`;
  }
  renderStream() {
    const all = this.visibleDays(), days = all.slice(0, this.S.limit), el = this.root.querySelector(".ds-stream");
    const todayLog = logicalDate(/* @__PURE__ */ new Date(), this.settings.dayStartHour);
    el.querySelectorAll("audio").forEach((a) => a.pause());
    if (this.searchModal?.open) {
      const selected = this.renderDesktopResults(all);
      el.innerHTML = selected ? `<div class="ds-modal-date">${this.dayLabel(selected.date)}</div>${this.card(selected)}` : '<div class="ds-preview-empty">\u9009\u62E9\u4E00\u6761\u65E5\u8BB0\u67E5\u770B\u5168\u6587</div>';
    }
    else if (!this.store.loaded) el.innerHTML = '<div class="ds-empty">\u8BFB\u53D6\u4E2D\u2026</div>';
    else if (!this.days().length) el.innerHTML = `<div class="ds-empty">\u300C${esc(this.store.folder)}\u300D\u91CC\u8FD8\u6CA1\u6709\u65E5\u8BB0\u3002<br>\u70B9\u53F3\u4E0B\u89D2\u6309\u94AE\u5199\u4E0B\u7B2C\u4E00\u6761\u5427\u3002</div>`;
    else if (!all.length) el.innerHTML = '<div class="ds-empty">\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u65E5\u8BB0</div>';
    else el.innerHTML = days.map((d) => `<section class="ds-day" data-date="${d.date}">${this.dayHeadHtml(d, todayLog)}${d.sections.map((s, i) => this.card(s, i === d.sections.length - 1 ? d.dayTags || [] : [])).join("")}</section>`).join("") + (all.length > days.length ? `<button type="button" class="ds-loadmore" data-act="more">\u52A0\u8F7D\u66F4\u65E9\u7684\u65E5\u8BB0\uFF08\u8FD8\u6709 ${all.length - days.length} \u5929\uFF09</button>` : "");
    this.icons(el);
    this.wireMedia(el);
    const n = all.reduce((a, d) => a + d.sections.length, 0);
    const f = this.root.querySelector(".ds-filterbar");
    this.root.querySelector(".ds-q").disabled = !this.S.searchOpen || !!this.S.editing;
    this.root.querySelector(".ds-searchclear").disabled = !this.S.searchOpen || !!this.S.editing;
    const dismiss = this.searchModal?.querySelector(".ds-modal-dismiss");
    if (dismiss) dismiss.disabled = false;
    const searchHint = this.searchModal?.querySelector(".ds-modal-foot>span:last-child");
    if (searchHint) searchHint.textContent = this.S.editing ? "\u4FDD\u5B58\u6216\u53D6\u6D88\u7F16\u8F91\u540E\u7EE7\u7EED\u641C\u7D22" : "\u2191 \u2193 \u9009\u62E9\u65E5\u8BB0";
    const parts = [];
    if (this.S.date) parts.push(this.fmtDate(this.S.date));
    if (this.S.filter) parts.push(this.fdef(this.S.filter).label);
    if (this.S.tag) parts.push("#" + this.S.tag);
    if (this.S.q) parts.push("\u201C" + this.S.q + "\u201D");
    f.hidden = !parts.length;
    this.root.toggleClass("has-filters", !!parts.length);
    this.root.querySelector(".ds-searchclear").hidden = !this.S.q;
    f.innerHTML = parts.length ? `<div class="ds-filter-pills">${parts.map((p) => `<span class="ds-active-pill">${esc(p)}</span>`).join("")}</div><span class="ds-active-count">${n} \u7BC7</span><button type="button" data-act="clear">\u6E05\u9664</button>` : "";
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
        onChange: (state) => {
          if (!this.searchModal?.open) return;
          const card = host.closest(".ds-inline-edit");
          if (!card) return;
          card.querySelector(".ds-chead").innerHTML = `${s.time ? `<span class="ds-t">${esc(sectionTimeLabel(s))}</span>` : ""}`;
          let subEl = card.querySelector("h3.ds-sub");
          if (state.sub) {
            if (!subEl) {
              subEl = card.ownerDocument.createElement("h3");
              subEl.className = "ds-sub";
              card.querySelector(".ds-chead").after(subEl);
            }
            subEl.textContent = state.sub;
          } else subEl?.remove();
          const tags = dedupe([...state.tags, ...scanTags(state.body)]);
          const list = card.querySelector(".ds-tags");
          list.innerHTML = tags.map((tag) => `<span class="ds-tag">#${esc(tag)}</span>`).join("");
          list.hidden = !tags.length;
        },
        tagCounts: () => this.tagCounts(),
        dayStartHour: () => this.settings.dayStartHour,
        previewFor: (st) => {
          const text = this.store.texts.get(s.path);
          if (text == null) return null;
          try {
            const body = resolveInlineImages(st.body, st.atts, (a, i) => `${this.store.attFolder}/${a.kind === "img" ? "IMG" : "\u5F55\u97F3"}_\u2026${i ? "_" + i : ""}.${a.ext}`);
            const out = planEdit(text, refOf(s), { sub: st.sub, body, tags: st.tags }, this.settings.dayStartHour, this.store.ownedFor(s.path));
            return { path: s.path, created: false, text: out, mark: sectionLines({ time: s.time, timeDate: s.timeDate, sub: st.sub || (s.time ? "" : s.sub), body, tags: st.tags }, !s.hdr).join("\n") };
          } catch {
            return null;
          }
        },
        submit: async (st) => {
          await this.store.edit(s, { sub: st.sub, body: st.body, tags: st.tags }, st.atts);
          this.S.editing = null;
          this.renderAll();
          this.toast("\u5DF2\u4FDD\u5B58");
        },
        cancel: () => {
          this.requestEditExit("edit");
        }
      }, "edit", { body: s.content, sub: s.sub, tags: s.tagLine, timeLabel: `${sectionTimeLabel(s) || "\u65E0\u65F6\u95F4"} \xB7 ${this.fmtDate(s.date)}`, hasHeader: !!s.hdr, inline: !!this.searchModal?.open });
      const ta = host.querySelector("textarea");
      if (ta) {
        ta.focus({ preventScroll: !!this.searchModal?.open });
        const caret = this.searchModal?.open ? 0 : ta.value.length;
        ta.setSelectionRange(caret, caret);
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
    if (this.S.editing) {
      if (target.closest('[data-act="closesearch"]')) this.requestEditExit("search");
      return;
    }
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
    const stripThumb = target.closest(".ds-strip-thumb");
    if (stripThumb) {
      const card = stripThumb.closest(".ds-card");
      const imgs = card ? [...card.querySelectorAll(".ds-body .ds-img img")] : [];
      if (imgs.length) {
        const items = imgs.map((x) => ({ url: x.src, path: x.dataset.path || "" }));
        this.lightbox?.open(items, Math.max(0, Number(stripThumb.dataset.stripIdx) || 0));
      }
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
    const backdrop = target.closest(".ds-backdrop");
    if (backdrop) {
      this.setSheet(null);
      return;
    }
    const t = target.closest("button");
    if (this.S.menu && !(t && (t.dataset.menu || t.closest(".ds-menu")))) {
      this.S.menu = null;
      this.renderStream();
      this.syncOverlayScope();
    }
    if (!t) return;
    const act = t.dataset.act;
    if (act === "openwrite") {
      if (this.composer?.empty()) this.composer.setBackdate(null);
      this.setSheet("write");
      return;
    }
    if (act === "closesheet") {
      this.setSheet(null);
      return;
    }
    if (act === "togglefilter") {
      this.setSheet(this.S.sheet === "filter" ? null : "filter");
      return;
    }
    if (t.dataset.bujiday) {
      this.composer?.setBackdate(t.dataset.bujiday);
      this.setSheet("write");
      return;
    }
    if (t.dataset.resultkey) {
      this.searchSelected = t.dataset.resultkey;
      this.S.menu = null;
      this.renderStream();
      return;
    }
    if (act === "closesearch") {
      this.toggleSearch(false);
      return;
    }
    if (t.classList.contains("ds-more")) {
      const card = t.closest(".ds-card");
      const wrap = card?.querySelector(".ds-body-wrap");
      const strip = card?.querySelector(".ds-collapsed-strip");
      if (!wrap) return;
      const reduced = this.root.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const willOpen = wrap.classList.contains("is-clamped");
      const lbl = t.querySelector(".ds-more-txt");
      if (willOpen) {
        const startH = wrap.getBoundingClientRect().height;
        if (!reduced) wrap.style.maxHeight = `${startH}px`;
        wrap.classList.remove("is-clamped");
        wrap.classList.add("is-expanded");
        if (strip) strip.hidden = true;
        if (reduced) {
          wrap.style.maxHeight = "none";
        } else {
          const endH = wrap.scrollHeight;
          window.requestAnimationFrame(() => {
            wrap.style.maxHeight = `${endH}px`;
          });
          const onEnd = (ev) => {
            if (ev.propertyName !== "max-height") return;
            wrap.style.maxHeight = "none";
            wrap.removeEventListener("transitionend", onEnd);
          };
          wrap.addEventListener("transitionend", onEnd);
        }
        t.classList.add("is-open");
        if (lbl) lbl.textContent = "\u6536\u8D77";
      } else {
        if (!reduced) {
          wrap.style.maxHeight = `${wrap.getBoundingClientRect().height}px`;
          void wrap.offsetHeight;
        }
        wrap.classList.remove("is-expanded");
        wrap.classList.add("is-clamped");
        wrap.style.maxHeight = `${CLAMP_PX}px`;
        if (strip) strip.hidden = false;
        t.classList.remove("is-open");
        if (lbl) lbl.textContent = "\u5C55\u5F00";
      }
      return;
    }
    if (t.dataset.menu) {
      this.S.menu = this.S.menu === t.dataset.menu ? null : t.dataset.menu;
      this.renderStream();
      this.syncOverlayScope();
      return;
    }
    if (t.dataset.editkey) {
      this.S.menu = null;
      this.S.editing = t.dataset.editkey;
      this.renderStream();
      this.syncOverlayScope();
      return;
    }
    if (t.dataset.delkey) {
      this.S.menu = null;
      this.S.confirm = t.dataset.delkey;
      this.renderStream();
      this.renderConfirm();
      this.syncOverlayScope();
      return;
    }
    if (t.dataset.openkey) {
      const s = this.section(t.dataset.openkey);
      this.S.menu = null;
      this.renderStream();
      this.syncOverlayScope();
      const f = s && this.store.fileAt(s.path);
      if (f) await this.app.workspace.getLeaf("tab").openFile(f, { eState: { line: s.start } });
      return;
    }
    if (act === "cf-cancel") {
      this.S.confirm = null;
      this.renderConfirm();
      this.syncOverlayScope();
      if (this.pending) this.renderAll();
      return;
    }
    if (act === "cf-ok") {
      const s = this.S.confirm ? this.section(this.S.confirm) : null;
      this.S.confirm = null;
      this.renderConfirm();
      this.syncOverlayScope();
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
      if (this.root.classList.contains("is-narrow")) {
        this.setSheet(this.S.sheet === "cal" ? null : "cal");
      } else {
        this.root.classList.toggle("is-side-collapsed");
      }
      return;
    }
    if (act === "togglesearch") {
      this.toggleSearch(!this.S.searchOpen);
      return;
    }
    if (act === "clearsearch") {
      this.S.q = "";
      this.S.limit = 30;
      const input = this.root.querySelector(".ds-q");
      input.value = "";
      this.renderStream();
      input.focus({ preventScroll: true });
      return;
    }
    if (t.dataset.chip !== void 0) {
      this.S.filter = t.dataset.chip;
      this.S.limit = 30;
      if (this.S.sheet === "filter") this.setSheet(null);
      this.renderAll();
      this.toTop();
      return;
    }
    if (t.dataset.tagchip !== void 0 || t.dataset.tag) {
      const v = t.dataset.tagchip ?? t.dataset.tag;
      this.S.tag = this.S.tag === v ? null : v;
      this.S.limit = 30;
      if (this.S.sheet === "filter") this.setSheet(null);
      this.renderAll();
      this.toTop();
      return;
    }
    if (t.dataset.date) {
      this.S.date = this.S.date === t.dataset.date ? null : t.dataset.date;
      this.S.limit = 30;
      if (this.S.sheet === "cal") this.setSheet(null);
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
    if (!atts.length) return { ...input, body: (input.body || "").replace(INLINE_IMG_RE, "") };
    const paths = [];
    for (let i = 0; i < atts.length; i++) paths.push(await this.saveAttachment(atts[i], when, i));
    const body = resolveInlineImages(input.body, atts, (_a, i) => paths[i]);
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
  sourceValue: "memos",
  palette: "auto"
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
    new import_obsidian5.Setting(containerEl).setName("\u5916\u89C2\u8272\u8C03").setDesc("\u9009\u62E9\u65E5\u8BB0\u6D41\u7684\u67D4\u96FE\u8F6F\u5361\u8272\u8C03\u65B9\u6848\uFF0C\u6D45\u8272\u548C\u6DF1\u8272\u6A21\u5F0F\u5747\u5373\u65F6\u751F\u6548\u3002").addDropdown((d) => {
      for (const [key, label] of PALETTES) d.addOption(key, label);
      d.setValue(s.palette || "auto").onChange(async (v) => {
        s.palette = v;
        await save();
        this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => l.view.applyPalette?.());
      });
    });
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
