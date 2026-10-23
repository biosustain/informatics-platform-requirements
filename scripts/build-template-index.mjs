#!/usr/bin/env node
// Regenerates templates/index.json from the Markdown files in templates/.
// Usage: node scripts/build-template-index.mjs   (no dependencies; Node 18+)
// Runs automatically in the GitHub Pages workflow, so adding a template is just
// committing a new .md file. Run it locally when previewing with a local server.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTemplate } from '../js/template.js';
import { parseFrontMatter } from '../js/markdown.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'templates');
const entries = [];
const ids = new Set();

for (const name of readdirSync(dir).sort()) {
  if (!name.endsWith('.md') || /^readme\.md$/i.test(name)) continue;
  const src = readFileSync(join(dir, name), 'utf8');
  const fm = parseFrontMatter(src).data;
  if (String(fm.hidden).toLowerCase() === 'true') continue;
  const tpl = buildTemplate(src, { id: basename(name, '.md'), path: `templates/${name}` });
  if (ids.has(tpl.id)) throw new Error(`Duplicate template id "${tpl.id}" (${name})`);
  ids.add(tpl.id);
  entries.push({
    id: tpl.id,
    title: tpl.title,
    description: tpl.description,
    file: `templates/${name}`,
    version: tpl.version,
    sections: tpl.sections.length,
    questions: tpl.sections.reduce((n, s) => n + s.slots.length, 0),
    order: Number(fm.order ?? 100),
  });
}

entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
writeFileSync(join(dir, 'index.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(`templates/index.json: ${entries.length} template(s)`);
for (const e of entries) console.log(`  - ${e.id}: ${e.title} (${e.sections} sections, ${e.questions} questions)`);
