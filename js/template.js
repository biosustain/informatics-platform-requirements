// Turns a Markdown template into a questionnaire model.
//
// Conventions (see README "Writing templates"):
//   # Title                      -> template title (or `title:` in front matter)
//   ## Heading                   -> a questionnaire section (one step)
//   ### Heading                  -> sub-heading inside a section
//   **Label:** [prompt]          -> a free-text question
//   2-column table, [prompt] in 2nd column        -> one question per row
//   3+ column table with a [prompt] row           -> repeatable records (add/remove rows)
//   - [ ] item                   -> checkbox
//   [A / B / C]                  -> single choice (pills); [A / B; note] adds a note box
//   [P0-P3]                      -> single choice P0, P1, P2, P3
//   [Date] or [YYYY-MM-DD]       -> date picker
//   [a, b, c, d, or e]           -> free text with clickable suggestions
// Everything else (paragraphs, quotes, lists, tables without prompts) is shown as guidance.

import { parseFrontMatter, parseBlocks, plain } from './markdown.js';

const PH_RE = /\[([^\]]+)\](?!\()/g;
const hasPh = (s) => /\[[^\]]+\](?!\()/.test(String(s));
const phText = (s) => plain(String(s).replace(PH_RE, '$1'));
const ID_RE = /^([A-Za-z][A-Za-z0-9]*-)(\d+)$/;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function slug(s) {
  return plain(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Interpret the text inside a [placeholder] as an input specification. */
export function interpret(prompt) {
  const p = plain(prompt).trim();
  let m = p.match(/^([A-Za-z]+)(\d+)\s*[-–]\s*\1?(\d+)$/);
  if (m) {
    const a = +m[2], b = +m[3];
    if (b > a && b - a <= 10) return { kind: 'choice', options: Array.from({ length: b - a + 1 }, (_, k) => m[1] + (a + k)), note: null, prompt: p };
  }
  const [head, ...rest] = p.split(';');
  const note = rest.join(';').trim();
  const parts = head.split(/\s+\/\s+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.length <= 7 && parts.every((x) => x.length <= 30 && !x.includes(','))) {
    return { kind: 'choice', options: parts.map(cap), note: note || null, prompt: p };
  }
  if (/^(date|yyyy-mm-dd)$/i.test(p)) return { kind: 'date', prompt: p };
  let suggestions = null;
  if (/,\s*(or\s+\S+|other)\s*$/i.test(head)) {
    const items = head.split(',').map((x) => x.trim().replace(/^(or|and)\s+/i, '').replace(/[.?]$/, '')).filter(Boolean);
    if (items.length >= 4 && items.every((x) => x.split(/\s+/).length <= 3)) suggestions = items;
  }
  return { kind: 'text', long: p.length > 40, suggestions, prompt: p };
}

export function buildTemplate(src, { id, path } = {}) {
  const { data: fm, body } = parseFrontMatter(src);
  const blocks = parseBlocks(body);
  const tpl = {
    id: fm.id || id || 'template',
    path: path || '',
    title: fm.title || '',
    description: fm.description || '',
    version: fm.version || hash(src),
    intro: [],
    sections: [],
  };

  let section = null;
  let sub = null;
  const newSection = (title) => {
    const used = new Set();
    section = { key: uniqueKey(slug(title), tpl._sectionKeys ||= new Set()), title: plain(title), items: [], slots: [], _used: used };
    tpl.sections.push(section);
    sub = null;
  };
  const key = (label) => uniqueKey(slug(label), section._used);

  let seenH1 = false;
  for (const b of blocks) {
    if (b.type === 'heading' && b.level === 1 && !seenH1 && !section) {
      seenH1 = true;
      if (!tpl.title) tpl.title = plain(b.text);
      continue;
    }
    if (b.type === 'heading' && b.level <= 2) { newSection(b.text); continue; }
    if (!section) {
      if (b.type === 'quote' && !tpl.description) tpl.description = plain(b.text.replace(/\n/g, ' ')).replace(/^\S+\.\s+/, '');
      tpl.intro.push(b);
      continue;
    }
    if (b.type === 'heading') { sub = plain(b.text); section.items.push({ type: 'subheading', level: b.level, text: b.text }); continue; }
    section.items.push(...toItems(b, section, sub, key));
  }

  if (!tpl.sections.length) { // template without ## headings: one section
    newSection(tpl.title || 'Questions');
    for (const b of tpl.intro.splice(0)) section.items.push(...toItems(b, section, null, key));
  }
  for (const s of tpl.sections) delete s._used;
  delete tpl._sectionKeys;
  if (!tpl.title) tpl.title = tpl.id;
  return tpl;
}

function uniqueKey(base, used) {
  let k = base, n = 2;
  while (used.has(k)) k = `${base}_${n++}`;
  used.add(k);
  return k;
}

function toItems(b, section, sub, key) {
  // **Label:** [prompt]
  if (b.type === 'para') {
    const m = b.text.match(/^\*\*([^*]+?)\*\*\s*:?\s*(.*)$/);
    if (m && hasPh(m[2])) return [field(section, key, m[1].replace(/:\s*$/, ''), m[2], 'para')];
    if (/^\s*\[[^\]]+\]\s*$/.test(b.text)) return [field(section, key, sub || section.title, b.text, 'para')];
    return [{ type: 'content', block: b }];
  }
  if (b.type === 'list') {
    if (b.items.every((it) => it.task)) {
      const item = { type: 'checklist', key: key(sub || section.title + ' checklist'), label: sub || '', options: [] };
      const used = new Set();
      item.options = b.items.map((it) => ({ key: uniqueKey(slug(it.text), used), label: it.text, checked: it.checked }));
      section.slots.push({ kind: 'checklist', key: item.key, item });
      return [item];
    }
    const parsed = b.items.map((it) => it.text.match(/^\*\*([^*]+?)\*\*\s*:?\s*(.*)$/));
    if (parsed.every((m) => m && hasPh(m[2]))) return parsed.map((m) => field(section, key, m[1].replace(/:\s*$/, ''), m[2], 'list'));
    return [{ type: 'content', block: b }];
  }
  if (b.type === 'table') {
    const anyPh = b.rows.some((r) => r.some(hasPh));
    if (!anyPh) return [{ type: 'content', block: b }];
    const twoCol = b.header.length === 2 && b.rows.every((r) => !hasPh(r[0] || ''));
    return twoCol ? [kvTable(b, section, key)] : [grid(b, section, sub, key)];
  }
  return [{ type: 'content', block: b }];
}

function field(section, key, label, raw, source) {
  const f = { type: 'field', key: key(label), label: plain(label), raw, input: interpret(phText(raw)), source };
  section.slots.push({ kind: f.input.kind === 'choice' ? 'choice' : 'text', key: f.key, item: f });
  return f;
}

function kvTable(b, section, key) {
  const item = { type: 'kv', header: b.header, rows: [] };
  for (const r of b.rows) {
    const label = r[0] || '';
    const val = r[1] || '';
    if (hasPh(val)) {
      const f = { type: 'field', key: key(label), label: plain(label), raw: val, input: interpret(phText(val)), source: 'table' };
      section.slots.push({ kind: f.input.kind === 'choice' ? 'choice' : 'text', key: f.key, item: f });
      item.rows.push({ label, field: f });
    } else {
      item.rows.push({ label, value: val });
    }
  }
  return item;
}

function grid(b, section, sub, key) {
  const used = new Set();
  const columns = b.header.map((h) => ({ key: uniqueKey(slug(h), used), label: plain(h) }));
  const rowSpec = (r) => columns.map((c, i) => {
    const cell = r[i] ?? '';
    if (hasPh(cell)) return { input: interpret(phText(cell)) };
    const idm = plain(cell).match(ID_RE);
    if (idm) return { id: { prefix: idm[1], width: idm[2].length }, value: plain(cell) };
    return { fixed: plain(cell) };
  });
  const rows = b.rows.filter((r) => r.some(hasPh)).map(rowSpec);
  // A row whose first cell is a placeholder or an ID (REQ-01) is a repeatable "template row".
  const repeat = [...rows].reverse().find((r) => r[0].input || r[0].id) || null;
  // Column defaults for rows added by the user (or rows that don't match a preset).
  const defaults = columns.map((c, i) => {
    if (repeat) return repeat[i];
    const specs = rows.map((r) => r[i]).filter((s) => s.input);
    const same = specs.length && specs.every((s) => JSON.stringify(s.input) === JSON.stringify(specs[0].input));
    return same ? specs[0] : { input: { kind: 'text', long: false, prompt: c.label } };
  }).map((s, i) => (s.fixed !== undefined ? { input: { kind: 'text', long: false, prompt: columns[i].label } } : s));
  // Preset rows keyed by their fixed first cell (e.g. "Project lead").
  const presets = {};
  for (const r of rows) if (r[0].fixed) presets[r[0].fixed] = r;
  const item = {
    type: 'grid',
    key: key(sub || section.title),
    label: sub || section.title,
    header: b.header,
    rawRows: b.rows,
    columns,
    rows,
    defaults,
    presets,
    idColumn: columns.findIndex((c, i) => defaults[i].id),
  };
  section.slots.push({ kind: 'grid', key: item.key, item });
  return item;
}

/** Specs for one answer row: preset row if the first column matches, else column defaults. */
export function rowSpecs(grid, row) {
  const first = row?.[grid.columns[0].key];
  const preset = first && grid.presets[first];
  return grid.columns.map((c, i) => {
    const s = preset ? preset[i] : grid.defaults[i];
    if (s.fixed !== undefined || s.id) return { kind: s.id ? 'id' : 'text', long: false, prompt: c.label };
    return s.input;
  });
}

export function initialRows(grid) {
  const rows = grid.rows.length ? grid.rows : [grid.defaults];
  return rows.map((r) => Object.fromEntries(grid.columns.map((c, i) => [c.key, r[i].fixed ?? r[i].value ?? ''])));
}

export function newRow(grid, existing) {
  const row = Object.fromEntries(grid.columns.map((c) => [c.key, '']));
  if (grid.idColumn >= 0) {
    const col = grid.columns[grid.idColumn];
    const { prefix, width } = grid.defaults[grid.idColumn].id;
    const max = existing.reduce((mx, r) => {
      const m = String(r[col.key] || '').match(ID_RE);
      return m && m[1] === prefix ? Math.max(mx, +m[2]) : mx;
    }, 0);
    row[col.key] = prefix + String(max + 1).padStart(width, '0');
  }
  return row;
}

// ---------- loading ----------

export async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Could not load ${url} (HTTP ${r.status})`);
  return r.text();
}

export async function loadTemplate(entry) {
  const src = await fetchText(entry.file);
  return buildTemplate(src, { id: entry.id, path: entry.file });
}
