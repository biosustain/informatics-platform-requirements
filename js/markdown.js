// Minimal Markdown block parser + inline renderer.
// Supports what questionnaire templates need: front matter, headings, paragraphs,
// blockquotes, lists (incl. task lists), pipe tables, code fences, rules, HTML comments.
// No dependencies, so it also runs in Node (scripts/build-template-index.mjs).

export function parseFrontMatter(src) {
  const text = String(src).replace(/^﻿/, '');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return { data, body: text.slice(m[0].length) };
}

const RE = {
  heading: /^(#{1,6})\s+(.*?)\s*#*\s*$/,
  fence: /^\s*```/,
  hr: /^\s*([-*_])(\s*\1){2,}\s*$/,
  table: /^\s*\|/,
  tableSep: /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/,
  quote: /^\s*>/,
  list: /^\s*([-*+]|\d+[.)])\s+/,
  comment: /^\s*<!--/,
};

export function parseBlocks(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if (RE.comment.test(line)) {
      while (i < lines.length && !/-->/.test(lines[i])) i++;
      i++; continue;
    }
    if (RE.fence.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !RE.fence.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    if ((m = line.match(RE.heading))) {
      blocks.push({ type: 'heading', level: m[1].length, text: m[2] });
      i++; continue;
    }
    if (RE.hr.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }
    if (RE.table.test(line) && i + 1 < lines.length && RE.tableSep.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && RE.table.test(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    if (RE.quote.test(line)) {
      const buf = [];
      while (i < lines.length && RE.quote.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push({ type: 'quote', text: buf.join('\n').trim() });
      continue;
    }
    if (RE.list.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items = [];
      while (i < lines.length && (RE.list.test(lines[i]) || (items.length && /^\s{2,}\S/.test(lines[i])))) {
        if (RE.list.test(lines[i])) items.push(lines[i].replace(RE.list, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      blocks.push({
        type: 'list', ordered,
        items: items.map((t) => {
          const tm = t.match(/^\[( |x|X)\]\s+(.*)$/);
          return tm ? { text: tm[2], task: true, checked: tm[1] !== ' ' } : { text: t };
        }),
      });
      continue;
    }
    const buf = [];
    while (
      i < lines.length && lines[i].trim() &&
      !RE.heading.test(lines[i]) && !RE.table.test(lines[i]) && !RE.quote.test(lines[i]) &&
      !RE.list.test(lines[i]) && !RE.fence.test(lines[i]) && !RE.comment.test(lines[i])
    ) buf.push(lines[i++].trim());
    blocks.push({ type: 'para', text: buf.join(' ') });
  }
  return blocks;
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  let inCode = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '\\' && s[k + 1] === '|') { cur += '|'; k++; continue; }
    if (c === '`') inCode = !inCode;
    if (c === '|' && !inCode) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

// ---------- rendering ----------

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function safeUrl(u) {
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null; // block javascript:, data:, ...
  return u; // relative
}

/** Inline Markdown -> HTML. Bracketed placeholders get a `ph` span. */
export function inline(md) {
  const codes = [];
  let s = String(md ?? '').replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, t, u) => {
    const url = safeUrl(u.replace(/&amp;/g, '&'));
    return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${t}</a>` : t;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w])_([^_\s][^_]*)_(?=[^\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\](?!\()/g, '<span class="ph">[$1]</span>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => `<code>${esc(codes[n])}</code>`);
  return s;
}

/** Plain text (strip inline Markdown). */
export function plain(md) {
  return String(md ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^*\w])\*([^*]+)\*/g, '$1$2')
    .trim();
}

export function renderBlock(b) {
  switch (b.type) {
    case 'heading': return `<h${Math.min(6, b.level + 1)}>${inline(b.text)}</h${Math.min(6, b.level + 1)}>`;
    case 'para': return `<p>${inline(b.text)}</p>`;
    case 'quote': return `<blockquote>${b.text.split(/\n\s*\n/).map((p) => `<p>${inline(p.replace(/\n/g, ' '))}</p>`).join('')}</blockquote>`;
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      return `<${tag}>${b.items.map((it) => `<li>${it.task ? `<input type="checkbox" disabled${it.checked ? ' checked' : ''}> ` : ''}${inline(it.text)}</li>`).join('')}</${tag}>`;
    }
    case 'table':
      return `<div class="table-wrap"><table><thead><tr>${b.header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'code': return `<pre><code>${esc(b.text)}</code></pre>`;
    case 'hr': return '<hr>';
    default: return '';
  }
}

// ---------- serialising (for Markdown export) ----------

export function mdCell(v) {
  return String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

export function tableToMarkdown(header, rows) {
  const line = (cells) => `| ${cells.map(mdCell).join(' | ')} |`;
  return [line(header), `| ${header.map(() => '---').join(' | ')} |`, ...rows.map(line)].join('\n');
}

export function blockToMarkdown(b) {
  switch (b.type) {
    case 'heading': return `${'#'.repeat(b.level)} ${b.text}`;
    case 'para': return b.text;
    case 'quote': return b.text.split('\n').map((l) => `> ${l}`.trimEnd()).join('\n');
    case 'list': return b.items.map((it, n) => `${b.ordered ? `${n + 1}.` : '-'} ${it.task ? `[${it.checked ? 'x' : ' '}] ` : ''}${it.text}`).join('\n');
    case 'table': return tableToMarkdown(b.header, b.rows);
    case 'code': return '```\n' + b.text + '\n```';
    case 'hr': return '---';
    default: return '';
  }
}
