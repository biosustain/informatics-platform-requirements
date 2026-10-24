import { inline, esc, renderBlock, plain } from './markdown.js';
import { loadTemplate, fetchText, rowSpecs, newRow, slug } from './template.js';
import * as A from './answers.js';

// ---------------------------------------------------------------- config & state

const DEFAULT_CONFIG = {
  title: 'Informatics Platform · Requirements',
  organization: 'DTU Biosustain',
  contactEmail: '',
  templatesIndex: 'templates/index.json',
};

const state = {
  config: DEFAULT_CONFIG,
  index: [],
  templates: new Map(), // id -> Promise<template>
  drafts: new Map(),    // id -> { answers, updatedAt }
  opened: null,         // { doc, tpl, name }
};

const app = document.getElementById('app');

// ---------------------------------------------------------------- tiny DOM helper

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const md = (s, tag = 'span', cls) => h(tag, { class: cls, html: inline(s) });

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function toast(msg, kind = 'info') {
  const t = h('div', { class: `toast toast-${kind}`, role: 'status' }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

function autosize(root = document) {
  requestAnimationFrame(() => root.querySelectorAll('textarea.input').forEach(grow));
}
function grow(el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px`; }

// ---------------------------------------------------------------- boot & routing

async function boot() {
  try {
    const cfg = JSON.parse(await fetchText('config.json'));
    state.config = { ...DEFAULT_CONFIG, ...cfg };
  } catch { /* defaults */ }
  document.querySelector('[data-brand-title]').textContent = state.config.title;
  document.querySelector('[data-org]').textContent = state.config.organization;

  try {
    state.index = JSON.parse(await fetchText(state.config.templatesIndex));
  } catch { state.index = []; }

  const q = new URLSearchParams(location.search).get('template');
  if (q && !location.hash) location.replace(`#/t/${encodeURIComponent(q)}`);
  window.addEventListener('hashchange', route);
  route();
}

function getTemplate(id) {
  if (!state.templates.has(id)) {
    const entry = state.index.find((t) => t.id === id) || { id, file: `templates/${id}.md` };
    const p = loadTemplate(entry);
    p.catch(() => state.templates.delete(id));
    state.templates.set(id, p);
  }
  return state.templates.get(id);
}

async function route() {
  flushSave?.();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [view, a, b] = parts;
  window.scrollTo(0, 0);
  try {
    if (view === 't' && a) {
      const tpl = await getTemplate(a);
      if (b === 'review') return renderDraftReview(tpl);
      return renderForm(tpl, Math.max(0, parseInt(b || '0', 10) || 0));
    }
    if (view === 'view') return state.opened ? renderOpened() : (location.hash = '#/');
    return renderHome();
  } catch (e) {
    console.error(e);
    mount(h('div', { class: 'page narrow' }, h('div', { class: 'card error' },
      h('h2', {}, 'Something went wrong'), h('p', {}, e.message || String(e)), h('a', { class: 'btn', href: '#/' }, 'Back to templates'))));
  }
}

function mount(...nodes) {
  app.replaceChildren(...nodes);
  autosize(app);
  app.querySelector('h1')?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- drafts

const draftKey = (id) => `ipreq.draft.${id}`;

function getDraft(tpl) {
  if (!state.drafts.has(tpl.id)) {
    let d = null;
    try { d = JSON.parse(store.get(draftKey(tpl.id)) || 'null'); } catch { d = null; }
    state.drafts.set(tpl.id, d && d.answers ? d : { answers: {}, updatedAt: null });
  }
  return state.drafts.get(tpl.id);
}
function peekDraft(id) {
  if (state.drafts.has(id)) return state.drafts.get(id);
  try { return JSON.parse(store.get(draftKey(id)) || 'null'); } catch { return null; }
}

let saveTimer = null;
function saveDraft(tpl, draft, immediate = false) {
  draft.updatedAt = new Date().toISOString();
  draft.version = tpl.version;
  clearTimeout(saveTimer);
  const doSave = () => {
    const ok = store.set(draftKey(tpl.id), JSON.stringify(draft));
    const el = document.querySelector('[data-save-status]');
    if (el) el.textContent = ok ? `Saved in this browser · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved (browser storage unavailable) — export to keep your answers';
  };
  flushSave = () => { clearTimeout(saveTimer); doSave(); flushSave = null; };
  immediate ? flushSave() : (saveTimer = setTimeout(flushSave, 350));
}
let flushSave = null;
window.addEventListener('pagehide', () => flushSave?.());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave?.(); });

function clearDraft(tpl) {
  state.drafts.set(tpl.id, { answers: {}, updatedAt: null });
  store.del(draftKey(tpl.id));
}
const hasContent = (tpl, d) => d && A.progress(tpl, d.answers).some((p) => p.done > 0);

// ---------------------------------------------------------------- home

function renderHome() {
  const cfg = state.config;
  const fileInput = h('input', { type: 'file', accept: '.yaml,.yml,.json', class: 'visually-hidden', id: 'open-file', onChange: (e) => openFile(e.target.files[0]) });
  const cards = state.index.length
    ? state.index.map((t) => {
      const d = peekDraft(t.id);
      const started = d && d.updatedAt;
      return h('article', { class: 'card tpl-card' },
        h('div', { class: 'tpl-card-body' },
          h('h2', {}, t.title),
          t.description ? h('p', { class: 'muted' }, t.description) : null,
          h('p', { class: 'tpl-meta' },
            t.sections ? `${t.sections} sections` : null,
            t.questions ? ` · ${t.questions} questions` : null,
            started ? h('span', { class: 'badge' }, `Draft · ${fmtTime(d.updatedAt)}`) : null)),
        h('div', { class: 'tpl-card-actions' },
          h('a', { class: 'btn primary', href: `#/t/${encodeURIComponent(t.id)}` }, started ? 'Continue' : 'Start'),
          started ? h('a', { class: 'btn ghost', href: `#/t/${encodeURIComponent(t.id)}/review` }, 'Review') : null));
    })
    : [h('div', { class: 'card' }, h('p', {}, 'No templates found. Add a Markdown file to ', h('code', {}, 'templates/'), ' and list it in ', h('code', {}, 'templates/index.json'), '.'))];

  mount(h('div', { class: 'page' },
    h('section', { class: 'hero' },
      h('p', { class: 'eyebrow' }, cfg.organization),
      h('h1', { tabindex: '-1' }, 'Tell us what your project needs'),
      h('p', { class: 'lede' }, 'Pick a questionnaire and answer it section by section. Your answers are saved in this browser as you go, so you can stop and come back. When you are done, review your answers and send them to us, or export a copy as YAML or Markdown.')),
    h('h2', { class: 'label-heading' }, 'Questionnaires'),
    h('div', { class: 'tpl-grid' }, cards),
    h('div', { class: 'card open-card' },
      h('div', {},
        h('h2', {}, 'Open an answers file'),
        h('p', { class: 'muted' }, 'View a YAML or JSON file exported from this app, then edit it or export it in another format.')),
      h('label', { class: 'btn', for: 'open-file' }, 'Choose file…'), fileInput)));
}

async function openFile(file) {
  if (!file) return;
  try {
    const doc = A.parseDocument(await file.text());
    const tpl = doc.template.id ? await getTemplate(doc.template.id).catch(() => null) : null;
    state.opened = { doc, tpl, name: file.name };
    if (location.hash === '#/view') renderOpened(); else location.hash = '#/view';
  } catch (e) { toast(e.message, 'error'); }
}

// ---------------------------------------------------------------- questionnaire

function renderForm(tpl, idx) {
  if (idx >= tpl.sections.length) { location.hash = `#/t/${encodeURIComponent(tpl.id)}/review`; return; }
  const draft = getDraft(tpl);
  const section = tpl.sections[idx];
  const base = `#/t/${encodeURIComponent(tpl.id)}`;

  const onChange = (sectionKey, key, value) => {
    (draft.answers[sectionKey] ||= {})[key] = value;
    saveDraft(tpl, draft);
    updateProgress(tpl, draft);
  };

  const stepper = h('nav', { class: 'stepper', 'aria-label': 'Sections' },
    h('ol', {}, tpl.sections.map((s, i) => h('li', {},
      h('a', { href: `${base}/${i}`, class: i === idx ? 'current' : '', 'aria-current': i === idx ? 'step' : null, 'data-step': s.key },
        h('span', { class: 'step-num' }, String(i + 1)),
        h('span', { class: 'step-title' }, s.title),
        h('span', { class: 'step-count', 'data-count': s.key }, ''))))),
    h('a', { href: `${base}/review`, class: 'step-review' }, 'Review & send →'));

  const importInput = h('input', { type: 'file', accept: '.yaml,.yml,.json', class: 'visually-hidden', id: 'import-file', onChange: (e) => importInto(tpl, e.target.files[0]) });

  const toolbar = h('div', { class: 'toolbar' },
    h('div', { class: 'toolbar-title' },
      h('a', { href: '#/', class: 'crumb' }, 'Questionnaires'), h('span', { class: 'crumb-sep' }, '/'),
      h('strong', {}, tpl.title)),
    h('div', { class: 'toolbar-progress' }, h('div', { class: 'bar' }, h('span', { 'data-overall': '' })), h('span', { class: 'small muted', 'data-overall-text': '' })),
    h('div', { class: 'toolbar-actions' },
      h('a', { class: 'btn ghost', href: `${base}/review` }, 'Review'),
      exportMenu(() => ({ tpl, answers: draft.answers, meta: {} })),
      h('details', { class: 'menu' },
        h('summary', { class: 'btn ghost icon', 'aria-label': 'More actions' }, '⋯'),
        h('div', { class: 'menu-list' },
          h('label', { for: 'import-file', class: 'menu-item' }, 'Load answers from file…'),
          h('button', { class: 'menu-item', type: 'button', onClick: () => copyLink(tpl) }, 'Copy link to this questionnaire'),
          h('button', { class: 'menu-item danger', type: 'button', onClick: () => { if (confirm('Clear all answers for this questionnaire in this browser?')) { clearDraft(tpl); renderForm(tpl, 0); toast('Answers cleared'); } } }, 'Start over'))),
      importInput));

  const body = h('div', { class: 'section-body' });
  if (idx === 0 && tpl.intro.length) body.append(h('div', { class: 'guidance intro', html: tpl.intro.map(renderBlock).join('') }));
  for (const it of section.items) body.append(renderItem(tpl, section, it, draft, onChange));
  if (!section.slots.length) body.prepend(h('p', { class: 'note' }, 'This section is for reference — nothing to fill in.'));

  const nav = h('div', { class: 'section-nav' },
    idx > 0 ? h('a', { class: 'btn', href: `${base}/${idx - 1}` }, '← ', tpl.sections[idx - 1].title) : h('span'),
    idx < tpl.sections.length - 1
      ? h('a', { class: 'btn primary', href: `${base}/${idx + 1}` }, tpl.sections[idx + 1].title, ' →')
      : h('a', { class: 'btn primary', href: `${base}/review` }, 'Review & send →'));

  mount(toolbar, h('div', { class: 'page form-layout' },
    h('aside', {}, stepper),
    h('main', { class: 'form-main' },
      h('header', { class: 'section-head' },
        h('p', { class: 'eyebrow' }, `Section ${idx + 1} of ${tpl.sections.length}`),
        h('h1', { tabindex: '-1' }, section.title),
        h('p', { class: 'small muted', 'data-save-status': '' }, draft.updatedAt ? `Saved in this browser · ${fmtTime(draft.updatedAt)}` : 'Answers are saved in this browser as you type')),
      body, nav)));
  updateProgress(tpl, draft);
}

function updateProgress(tpl, draft) {
  const prog = A.progress(tpl, draft.answers);
  let done = 0, total = 0;
  for (const p of prog) {
    done += p.done; total += p.total;
    const el = document.querySelector(`[data-count="${p.key}"]`);
    if (!el) continue;
    el.textContent = p.total ? `${p.done}/${p.total}` : 'Info';
    el.closest('a').classList.toggle('complete', p.total > 0 && p.done === p.total);
  }
  const pct = total ? Math.round((100 * done) / total) : 0;
  const bar = document.querySelector('[data-overall]');
  if (bar) bar.style.width = `${pct}%`;
  const txt = document.querySelector('[data-overall-text]');
  if (txt) txt.textContent = `${done} of ${total} answered`;
}

function renderItem(tpl, section, it, draft, onChange) {
  const slot = (key) => section.slots.find((s) => s.key === key);
  const val = (key) => A.getValue(draft.answers, section, slot(key));
  switch (it.type) {
    case 'content': return h('div', { class: 'guidance', html: renderBlock(it.block) });
    case 'subheading': return h('h2', { class: 'subheading' }, plain(it.text));
    case 'field': return fieldBlock(section, it, val(it.key), (v) => onChange(section.key, it.key, v));
    case 'kv': return h('div', { class: 'kv' }, it.rows.map((r) => (r.field
      ? fieldBlock(section, r.field, val(r.field.key), (v) => onChange(section.key, r.field.key, v))
      : h('div', { class: 'field readonly' }, md(r.label, 'div', 'field-label'), md(r.value, 'div')))));
    case 'grid': return gridEditor(section, it, val(it.key), (v) => onChange(section.key, it.key, v));
    case 'checklist': {
      const cur = { ...val(it.key) };
      return h('fieldset', { class: 'field checklist' },
        it.label ? h('legend', { class: 'field-label' }, it.label) : null,
        it.options.map((o) => h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: cur[o.key] ? true : null, onChange: (e) => { cur[o.key] = e.target.checked; onChange(section.key, it.key, { ...cur }); } }),
          md(o.label))));
    }
    default: return h('div');
  }
}

function fieldBlock(section, f, value, onValue) {
  const id = `f-${section.key}-${f.key}`;
  return h('div', { class: `field ${f.input.long ? 'long' : ''}` },
    h('label', { class: 'field-label', for: id, id: `${id}-label` }, f.label),
    inputFor(id, f.input, value, onValue));
}

function inputFor(id, spec, value, onValue) {
  if (spec.kind === 'choice') return choiceInput(id, spec, value, onValue);
  if (spec.kind === 'date') {
    return h('input', { type: 'date', id, class: 'input date', value: value || '', onInput: (e) => onValue(e.target.value) });
  }
  const ta = h('textarea', {
    id, class: `input${spec.kind === 'id' ? ' mono' : ''}`, rows: spec.long ? 3 : 1, placeholder: spec.prompt || '', value: value || '',
    onInput: (e) => { grow(e.target); onValue(e.target.value); },
  });
  if (!spec.suggestions) return ta;
  const chips = h('div', { class: 'suggest', 'aria-label': 'Suggestions' },
    h('span', { class: 'small muted' }, 'Suggestions:'),
    spec.suggestions.map((s) => h('button', {
      type: 'button', class: 'chip',
      onClick: () => {
        const parts = ta.value.split(/\s*,\s*/).filter(Boolean);
        const i = parts.findIndex((p) => p.toLowerCase() === s.toLowerCase());
        if (i >= 0) parts.splice(i, 1); else parts.push(s);
        ta.value = parts.join(', '); grow(ta); onValue(ta.value); ta.focus();
      },
    }, s)));
  return h('div', {}, ta, chips);
}

function choiceInput(id, spec, value, onValue) {
  const cur = value && typeof value === 'object' ? { choice: value.choice || '', note: value.note || '' } : { choice: value || '', note: '' };
  const options = [...spec.options];
  if (cur.choice && !options.includes(cur.choice)) options.push(cur.choice); // keep imported/custom values visible
  const emit = () => onValue(spec.note ? { ...cur } : cur.choice);
  const group = h('div', { class: 'pills', role: 'radiogroup', 'aria-labelledby': `${id}-label`, id });
  const sync = () => group.querySelectorAll('.pill').forEach((p) => p.setAttribute('aria-checked', String(p.dataset.v === cur.choice)));
  options.forEach((opt) => group.append(h('button', {
    type: 'button', class: 'pill', role: 'radio', 'data-v': opt, 'aria-checked': String(opt === cur.choice),
    onClick: () => { cur.choice = cur.choice === opt ? '' : opt; sync(); emit(); },
  }, opt)));
  if (!spec.note) return group;
  return h('div', { class: 'choice-note' }, group,
    h('textarea', { class: 'input', rows: 1, placeholder: cap(spec.note), 'aria-label': spec.note, value: cur.note, onInput: (e) => { grow(e.target); cur.note = e.target.value; emit(); } }));
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function gridEditor(section, grid, value, onValue) {
  const rows = (Array.isArray(value) ? value : []).map((r) => ({ ...r }));
  const list = h('div', { class: 'records' });
  const commit = () => onValue(rows.map((r) => ({ ...r })));
  const firstKey = grid.columns[0].key;

  const titleOf = (row, i) => {
    const v = A.choiceText(row[firstKey]);
    return v.trim() ? v : `${grid.columns[0].label} ${i + 1}`;
  };

  function card(row, i) {
    const specs = rowSpecs(grid, row);
    const preset = !!grid.presets[row[firstKey]];
    const title = h('span', { class: 'record-title' }, titleOf(row, i));
    const fields = grid.columns.map((c, ci) => {
      if (ci === 0 && preset) return null; // preset label is the card title
      const id = `g-${section.key}-${grid.key}-${i}-${c.key}`;
      const spec = specs[ci];
      return h('div', { class: `field ${spec.long ? 'long' : ''} ${spec.kind === 'id' ? 'compact' : ''}` },
        h('label', { class: 'field-label', for: id, id: `${id}-label` }, c.label),
        inputFor(id, spec, row[c.key], (v) => {
          row[c.key] = v;
          if (ci === 0) title.textContent = titleOf(row, i);
          commit();
        }));
    });
    return h('article', { class: 'record' },
      h('header', { class: 'record-head' }, title,
        h('button', {
          type: 'button', class: 'btn ghost small', 'aria-label': `Remove ${titleOf(row, i)}`,
          onClick: () => {
            if (A.isFilled({ kind: 'grid', item: grid }, [row]) && !confirm(`Remove “${titleOf(row, i)}”?`)) return;
            rows.splice(i, 1); commit(); redraw();
          },
        }, 'Remove')),
      h('div', { class: 'record-fields' }, fields));
  }
  function redraw() {
    list.replaceChildren(...(rows.length ? rows.map(card) : [h('p', { class: 'muted small empty' }, 'No entries yet.')]));
    autosize(list);
  }
  redraw();
  return h('div', { class: 'grid-editor' }, list,
    h('button', {
      type: 'button', class: 'btn add',
      onClick: () => {
        rows.push(newRow(grid, rows)); commit(); redraw();
        list.lastElementChild?.querySelector('textarea, input, button.pill')?.focus();
      },
    }, '+ Add ', grid.idColumn >= 0 ? 'another' : 'row'));
}

async function importInto(tpl, file) {
  if (!file) return;
  try {
    const doc = A.parseDocument(await file.text());
    if (doc.template.id && doc.template.id !== tpl.id && !confirm(`This file was made with “${doc.template.title || doc.template.id}”, not “${tpl.title}”. Load matching answers anyway?`)) return;
    const draft = getDraft(tpl);
    if (hasContent(tpl, draft) && !confirm('Replace your current answers with the ones in this file?')) return;
    draft.answers = doc.answers;
    saveDraft(tpl, draft, true);
    toast('Answers loaded');
    route();
  } catch (e) { toast(e.message, 'error'); }
}

function copyLink(tpl) {
  const url = `${location.origin}${location.pathname}?template=${encodeURIComponent(tpl.id)}`;
  navigator.clipboard?.writeText(url).then(() => toast('Link copied'), () => prompt('Copy this link:', url));
}

// ---------------------------------------------------------------- export menu

function exportMenu(get) {
  const fileBase = () => {
    const { tpl, answers } = get();
    const first = tpl.sections.flatMap((s) => s.slots.map((sl) => A.choiceText(A.getValue(answers, s, sl)))).find((v) => typeof v === 'string' && v.trim());
    return [tpl.id, first ? slug(first).slice(0, 40) : null, new Date().toISOString().slice(0, 10)].filter(Boolean).join('-');
  };
  const run = (fmt) => {
    const { tpl, answers, meta } = get();
    const doc = A.buildDocument(tpl, answers, meta);
    if (fmt === 'yaml') download(`${fileBase()}.yaml`, A.toYAML(doc), 'application/yaml');
    if (fmt === 'json') download(`${fileBase()}.json`, A.toJSON(doc), 'application/json');
    if (fmt === 'md') download(`${fileBase()}.md`, A.toMarkdown(tpl, answers, meta), 'text/markdown');
    if (fmt === 'copy') navigator.clipboard?.writeText(A.toYAML(doc)).then(() => toast('YAML copied to clipboard'));
  };
  const close = (e) => e.target.closest('details')?.removeAttribute('open');
  return h('details', { class: 'menu' },
    h('summary', { class: 'btn ghost' }, 'Export ▾'),
    h('div', { class: 'menu-list' },
      [['yaml', 'YAML (.yaml)'], ['md', 'Markdown — filled template (.md)'], ['json', 'JSON (.json)'], ['copy', 'Copy YAML to clipboard']]
        .map(([k, label]) => h('button', { type: 'button', class: 'menu-item', onClick: (e) => { run(k); close(e); } }, label))));
}

document.addEventListener('click', (e) => {
  document.querySelectorAll('details.menu[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); });
});

// ---------------------------------------------------------------- review / document view

function renderDraftReview(tpl) {
  const draft = getDraft(tpl);
  const base = `#/t/${encodeURIComponent(tpl.id)}`;
  const prog = A.progress(tpl, draft.answers);
  const done = prog.reduce((a, p) => a + p.done, 0), total = prog.reduce((a, p) => a + p.total, 0);
  const actions = [
    h('a', { class: 'btn', href: base }, '← Keep editing'),
    exportMenu(() => ({ tpl, answers: draft.answers, meta: {} })),
    h('button', { class: 'btn primary', type: 'button', onClick: () => openSendDialog(tpl, draft) }, 'Send your answers'),
  ];
  const banner = done < total
    ? h('p', { class: 'note' }, `${total - done} of ${total} questions are still open. You can send your answers anyway; open items stay visible as unresolved.`)
    : null;
  mount(docView({ tpl, answers: draft.answers, title: tpl.title, status: 'Your answers', subtitle: `${done} of ${total} answered${draft.updatedAt ? ` · last saved ${fmtTime(draft.updatedAt)}` : ''}`, actions, banner, editBase: base }));
}

function renderOpened() {
  const { doc, tpl, name } = state.opened;
  const meta = doc.meta || {};
  const who = meta.submitted_by ? [meta.submitted_by.name, meta.submitted_by.email].filter(Boolean).join(' · ') : '';
  const when = meta.submitted_at || meta.exported_at;
  const subtitle = [who && `From ${who}`, when && fmtTime(when), name].filter(Boolean).join(' · ');
  const actions = [
    h('a', { class: 'btn', href: '#/' }, '← Back'),
  ];
  if (tpl) {
    actions.push(exportMenu(() => ({ tpl, answers: doc.answers, meta })));
    actions.push(h('button', {
      class: 'btn primary', type: 'button',
      onClick: () => {
        const d = getDraft(tpl);
        if (hasContent(tpl, d) && !confirm(`Replace your current draft of “${tpl.title}” with these answers?`)) return;
        d.answers = JSON.parse(JSON.stringify(doc.answers));
        saveDraft(tpl, d, true);
        location.hash = `#/t/${encodeURIComponent(tpl.id)}`;
      },
    }, 'Edit a copy'));
  } else {
    actions.push(h('button', { class: 'btn', type: 'button', onClick: () => download(name, A.toYAML(doc)) }, 'Download'));
  }

  let banner = null;
  if (!tpl) banner = h('p', { class: 'note' }, `The template “${doc.template.id || 'unknown'}” is not available here, so answers are shown as recorded.`);
  else if (doc.template.version && doc.template.version !== tpl.version) banner = h('p', { class: 'note' }, 'These answers were made with an earlier version of the template. Answers are matched by question; anything that no longer matches is listed at the end.');

  mount(tpl
    ? docView({ tpl, answers: doc.answers, title: doc.template.title || tpl.title, status: 'Answers file', subtitle, actions, banner })
    : h('div', { class: 'page narrow doc' }, docHeader(doc.template.title || 'Answers', 'Answers file', subtitle, actions), banner, genericValue(doc.answers)));
}

function docHeader(title, status, subtitle, actions) {
  return h('header', { class: 'doc-head' },
    h('div', {}, h('p', { class: 'eyebrow' }, status), h('h1', { tabindex: '-1' }, title), subtitle ? h('p', { class: 'muted small' }, subtitle) : null),
    h('div', { class: 'doc-actions' }, actions));
}

function docView({ tpl, answers, title, status, subtitle, actions, banner, editBase }) {
  const sections = tpl.sections.filter((s) => s.slots.length).map((s) => {
    const idx = tpl.sections.indexOf(s);
    return h('section', { class: 'doc-section' },
      h('div', { class: 'doc-section-head' }, h('h2', {}, s.title),
        editBase ? h('a', { class: 'small', href: `${editBase}/${idx}` }, 'Edit') : null),
      s.items.map((it) => reviewItem(s, it, answers)).filter(Boolean));
  });
  const extra = A.unknownAnswers(tpl, answers);
  if (Object.keys(extra).length) sections.push(h('section', { class: 'doc-section' }, h('h2', {}, 'Other answers'), genericValue(extra)));
  return h('div', { class: 'page narrow doc' }, docHeader(title, status, subtitle, actions), banner, sections);
}

const unanswered = () => h('span', { class: 'unanswered' }, 'Not answered');

function valueNode(v) {
  if (v && typeof v === 'object' && 'choice' in v) {
    if (!A.filledCell(v)) return unanswered();
    return h('span', {}, v.choice ? h('span', { class: 'tag' }, v.choice) : null, v.note ? h('span', { class: 'pre' }, ' ', v.note) : null);
  }
  const s = String(v ?? '');
  return s.trim() ? h('span', { class: 'pre' }, s) : unanswered();
}

function choiceValueNode(spec, v) {
  if (spec?.kind === 'choice' && typeof v === 'string' && v) return h('span', { class: 'tag' }, v);
  return valueNode(v);
}

function reviewItem(s, it, answers) {
  const slot = (key) => s.slots.find((x) => x.key === key);
  if (it.type === 'subheading') return h('h3', {}, plain(it.text));
  const dl = (pairs) => h('dl', { class: 'answers' }, pairs.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
  if (it.type === 'field') return dl([[it.label, choiceValueNode(it.input, A.getValue(answers, s, slot(it.key)))]]);
  if (it.type === 'kv') return dl(it.rows.map((r) => (r.field ? [r.label ? plain(r.label) : r.field.label, choiceValueNode(r.field.input, A.getValue(answers, s, slot(r.field.key)))] : [plain(r.label), md(r.value)])));
  if (it.type === 'checklist') {
    const v = A.getValue(answers, s, slot(it.key));
    return h('ul', { class: 'checks' }, it.options.map((o) => h('li', { class: v[o.key] ? 'on' : '' }, v[o.key] ? '☑ ' : '☐ ', md(o.label))));
  }
  if (it.type === 'grid') {
    const sl = slot(it.key);
    const rows = A.getValue(answers, s, sl);
    if (!A.isFilled(sl, rows)) return h('p', {}, unanswered());
    const firstKey = it.columns[0].key;
    return h('div', { class: 'review-records' },
      rows.map((row, i) => {
        const specs = rowSpecs(it, row);
        return h('article', { class: 'record' },
          h('header', { class: 'record-head' }, h('span', { class: 'record-title' }, A.choiceText(row[firstKey]) || `${it.columns[0].label} ${i + 1}`)),
          dl(it.columns.slice(1).map((c, ci) => [c.label, choiceValueNode(specs[ci + 1], row[c.key])])));
      }));
  }
  return null;
}

function genericValue(v) {
  if (Array.isArray(v)) return h('div', { class: 'review-records' }, v.map((x, i) => h('article', { class: 'record' }, h('header', { class: 'record-head' }, h('span', { class: 'record-title' }, `#${i + 1}`)), genericValue(x))));
  if (v && typeof v === 'object') return h('dl', { class: 'answers' }, Object.entries(v).map(([k, x]) => [h('dt', {}, k.replace(/_/g, ' ')), h('dd', {}, x && typeof x === 'object' && !('choice' in x) ? genericValue(x) : valueNode(x))]));
  return valueNode(v);
}

// ---------------------------------------------------------------- send

function openSendDialog(tpl, draft) {
  const cfg = state.config;
  const doc = () => A.buildDocument(tpl, draft.answers, {});
  const dlg = h('dialog', { class: 'dialog', 'aria-labelledby': 'send-title' });
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('cancel', () => setTimeout(() => dlg.remove(), 0));

  const mail = cfg.contactEmail ? `mailto:${cfg.contactEmail}?subject=${encodeURIComponent(`Requirements: ${tpl.title}`)}&body=${encodeURIComponent('Please find my answers attached.')}` : null;
  dlg.append(h('div', { class: 'dialog-body' },
    h('h2', { id: 'send-title' }, 'Send your answers'),
    h('p', {}, 'Download your answers as a file, then email it to the Informatics Platform team', cfg.contactEmail ? [' at ', h('a', { href: mail }, cfg.contactEmail)] : null, '.'),
    h('p', { class: 'small muted' }, 'Keep the file — you can load it back into this questionnaire later with “Load answers from file”.'),
    h('div', { class: 'dialog-actions' },
      h('button', { class: 'btn', type: 'button', onClick: close }, 'Close'),
      h('button', { class: 'btn primary', type: 'button', onClick: () => { download(`${tpl.id}-${new Date().toISOString().slice(0, 10)}.yaml`, A.toYAML(doc()), 'application/yaml'); } }, 'Download YAML'))));
  document.body.append(dlg);
  dlg.showModal();
}

boot();
