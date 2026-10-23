// Answer values, export (YAML / JSON / Markdown) and import.
//
// Answer shape: answers[sectionKey][slotKey] =
//   text      -> "string"
//   choice    -> "Option"            (or { choice, note } when the prompt has a note part)
//   grid      -> [ { columnKey: value, ... }, ... ]
//   checklist -> { itemKey: true|false }

import { dump, load } from '../vendor/js-yaml.mjs';
import { blockToMarkdown, tableToMarkdown } from './markdown.js';
import { initialRows, rowSpecs } from './template.js';

export const APP_ID = 'ip-requirements-app';
export const FORMAT_VERSION = 1;

export function getValue(answers, section, slot) {
  const v = answers?.[section.key]?.[slot.key];
  if (v !== undefined) return v;
  if (slot.kind === 'grid') return initialRows(slot.item);
  if (slot.kind === 'checklist') return Object.fromEntries(slot.item.options.map((o) => [o.key, !!o.checked]));
  if (slot.kind === 'choice' && slot.item.input.note) return { choice: '', note: '' };
  return '';
}

export function choiceText(v) {
  if (v && typeof v === 'object') return [v.choice, v.note].filter((x) => x && String(x).trim()).join('; ');
  return v ?? '';
}

export function filledCell(v) {
  return v && typeof v === 'object' ? !!(v.choice || (v.note && v.note.trim())) : !!String(v ?? '').trim();
}

export function isFilled(slot, v) {
  if (slot.kind === 'grid') {
    const fixedFirst = new Set(Object.keys(slot.item.presets));
    return Array.isArray(v) && v.some((row) => slot.item.columns.some((c, i) => {
      if (i === 0 && fixedFirst.has(row[c.key])) return false; // preset label, not an answer
      if (i === slot.item.idColumn) return false;
      return filledCell(row[c.key]);
    }));
  }
  if (slot.kind === 'checklist') return v && Object.values(v).some(Boolean);
  return filledCell(v);
}

export function progress(tpl, answers) {
  return tpl.sections.map((s) => {
    const total = s.slots.length;
    const done = s.slots.filter((sl) => isFilled(sl, getValue(answers, s, sl))).length;
    return { key: s.key, total, done };
  });
}

/** Template-ordered answers, including empty ones, plus any keys the template doesn't know. */
export function normalizeAnswers(tpl, answers = {}) {
  const out = {};
  for (const s of tpl.sections) {
    if (!s.slots.length) continue;
    const sec = {};
    for (const sl of s.slots) sec[sl.key] = clone(getValue(answers, s, sl));
    for (const [k, v] of Object.entries(answers[s.key] || {})) if (!(k in sec)) sec[k] = clone(v);
    out[s.key] = sec;
  }
  for (const [k, v] of Object.entries(answers)) if (!(k in out)) out[k] = clone(v);
  return out;
}

/** Answers present in a document that the template doesn't define. */
export function unknownAnswers(tpl, answers = {}) {
  const extra = {};
  const secs = Object.fromEntries(tpl.sections.map((s) => [s.key, s]));
  for (const [k, v] of Object.entries(answers)) {
    const s = secs[k];
    if (!s) { extra[k] = v; continue; }
    const slotKeys = new Set(s.slots.map((x) => x.key));
    for (const [fk, fv] of Object.entries(v || {})) if (!slotKeys.has(fk)) (extra[k] ||= {})[fk] = fv;
  }
  return extra;
}

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function buildDocument(tpl, answers, meta = {}) {
  return {
    template: { id: tpl.id, title: tpl.title, version: tpl.version, source: tpl.path },
    meta: { app: APP_ID, format_version: FORMAT_VERSION, exported_at: new Date().toISOString(), ...meta },
    answers: normalizeAnswers(tpl, answers),
  };
}

export function toYAML(doc) {
  const head = `# ${doc.template?.title || 'Answers'}\n# Answers collected with the Informatics Platform requirements app.\n`;
  return head + dump(doc, { lineWidth: -1, noRefs: true });
}

export function toJSON(doc) {
  return JSON.stringify(doc, null, 2) + '\n';
}

export function parseDocument(text) {
  let doc;
  try { doc = load(text); } catch (e) { throw new Error(`Not a valid YAML/JSON file: ${e.message.split('\n')[0]}`); }
  if (!doc || typeof doc !== 'object' || !doc.answers || typeof doc.answers !== 'object') {
    throw new Error('This file does not look like an answers file (no "answers" section).');
  }
  doc.template ||= {};
  doc.meta ||= {};
  return doc;
}

// ---------- Markdown export (the template, filled in) ----------

export function toMarkdown(tpl, answers, meta = {}) {
  const out = [`# ${tpl.title}`];
  const stamp = [`Template \`${tpl.id}\` (version ${tpl.version})`];
  if (meta.submitted_by?.name) stamp.push(`submitted by ${meta.submitted_by.name}`);
  stamp.push(`exported ${new Date().toISOString().slice(0, 10)}`);
  out.push(`<!-- ${stamp.join(', ')} -->`);
  for (const b of tpl.intro) out.push(blockToMarkdown(b));
  for (const s of tpl.sections) {
    out.push(`## ${s.title}`);
    const slotOf = (key) => s.slots.find((x) => x.key === key);
    for (const it of s.items) {
      if (it.type === 'content') out.push(blockToMarkdown(it.block));
      else if (it.type === 'subheading') out.push(`${'#'.repeat(it.level)} ${it.text}`);
      else if (it.type === 'field') {
        const v = choiceText(getValue(answers, s, slotOf(it.key)));
        const shown = v.trim() ? v.replace(/\r?\n/g, '  \n') : it.raw;
        out.push(it.source === 'list' ? `- **${it.label}:** ${shown}` : `**${it.label}:** ${shown}`);
      } else if (it.type === 'kv') {
        out.push(tableToMarkdown(it.header, it.rows.map((r) => {
          if (!r.field) return [r.label, r.value];
          const v = choiceText(getValue(answers, s, slotOf(r.field.key)));
          return [r.label, v.trim() ? v : r.field.raw];
        })));
      } else if (it.type === 'grid') {
        const sl = slotOf(it.key);
        const rows = getValue(answers, s, sl);
        out.push(isFilled(sl, rows)
          ? tableToMarkdown(it.header, rows.map((r) => it.columns.map((c) => choiceText(r[c.key]))))
          : tableToMarkdown(it.header, it.rawRows));
      } else if (it.type === 'checklist') {
        const v = getValue(answers, s, slotOf(it.key));
        out.push(it.options.map((o) => `- [${v[o.key] ? 'x' : ' '}] ${o.label}`).join('\n'));
      }
    }
  }
  return out.join('\n\n') + '\n';
}

export { rowSpecs };
