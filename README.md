# Informatics Platform – Requirements Questionnaires

A small static web app for collecting project requirements from clients of the BRIGHT
Informatics Platform. Questionnaires are plain Markdown templates; clients answer them section by
section, review their answers, and send the exported file to the team by email.

- **Questionnaire style** – one step per `##` section, progress per section, autosave in the browser.
- **Export and view** – YAML (canonical), JSON, or the Markdown template filled in. Any exported
  file can be opened in the app again to view, edit or re-export.
- **Multiple templates** – drop a `.md` file into [`templates/`](templates/) and it shows up on the
  start page.
- **Several questionnaires at once** – one template can be answered many times over, one per
  project. Each is listed under **In progress** with its own progress and last-saved time.
- **Send your answers** – downloads the YAML and lets the client pick which team member to email
  it to.

Everything runs in the browser. There is no server, no account and no network call beyond loading
the site itself: answers never leave the client's machine until they choose to send the file.

No build step and no framework: HTML, CSS and ES modules, plus a vendored copy of
[js-yaml](https://github.com/nodeca/js-yaml) (MIT).

The application code in this repository was written by an AI model under human direction — see
[How this app was built](#how-this-app-was-built).

## Repository layout

```
index.html, css/, js/        the app
  js/markdown.js             Markdown parser (no dependencies)
  js/template.js             Markdown template -> questionnaire model
  js/answers.js              answer model, YAML/JSON/Markdown export, import
  js/app.js                  views and routing
vendor/js-yaml.mjs           js-yaml 4.2.0
config.json                  site settings (title, organisation, contact email)
templates/                   questionnaire templates (*.md) + generated index.json
scripts/build-template-index.mjs   regenerates templates/index.json
.github/workflows/pages.yml  deploys the site to GitHub Pages
LICENSE                      MIT
```

## Run locally

```bash
node scripts/build-template-index.mjs   # after adding/editing templates
python3 -m http.server 8000             # any static server works
# open http://localhost:8000
```

Opening `index.html` straight from disk does not work, because browsers block `fetch` and modules
on `file://`.

## Publish on GitHub Pages

The repository is `biosustain/informatics-platform-requirements`.

1. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow rebuilds `templates/index.json` and deploys the site to
   `https://biosustain.github.io/informatics-platform-requirements/`.

> GitHub Actions minutes are billed for private repositories, and a Pages site built from a private
> repository on the organisation's Team plan is still publicly reachable — access-controlled Pages
> needs GitHub Enterprise Cloud. Since this repository holds no client answers, publishing it as a
> **public** repository is the simpler option: free Actions minutes and free Pages.

Fill in `contacts` in `config.json` before going live — it is the only way a client is told where to
send their answers:

```json
"contacts": [
  { "name": "Ding He", "email": "dinghe@dtu.dk" },
  { "name": "Lea Sommer", "email": "lemad@dtu.dk" }
]
```

List one contact and the dialog names them directly; list several and the client picks whoever they
are working with. A single `"contactEmail": "..."` is still honoured as a fallback.

Share a direct link to one questionnaire with `?template=<id>`, for example
`https://biosustain.github.io/informatics-platform-requirements/?template=requirements`.

## Several questionnaires at once

The start page lists everything **In progress**, newest first, and **Start** on a template card
always begins a new one — so the same questionnaire can be filled in separately for Project A and
Project B without the two colliding.

Each is labelled automatically from its first answered question (usually the project name) and can
be renamed from the `⋯` menu, on the start page or in the questionnaire toolbar. The same menu
duplicates or deletes one. **Edit a copy**, on an opened answers file, always starts a new
questionnaire rather than overwriting anything.

Drafts live in the browser's `localStorage` under `ipreq.q.<id>`, one entry each. That means they
are **per browser and per device**: they are not shared between people, do not follow you to another
machine, and are lost if the browser's site data is cleared. Export a copy to keep anything that
matters.

## Receiving answers

The app never sends anything anywhere. When a client finishes, **Send your answers** downloads the
YAML and offers a `mailto:` link per entry in `contacts`, pre-filled with the questionnaire's name;
the client attaches that file to the email.

To read an answers file, open the site and use **Open an answers file** on the start page. It
renders the YAML or JSON against its template as a document, which you can export as Markdown, or
open as a new questionnaire of your own with **Edit a copy** to refine together with the client.

If the template has changed since the answers were made, answers are matched by question key, and
anything that no longer matches is listed under "Other answers", so nothing is lost.

## Writing templates

A template is an ordinary Markdown document that also reads well on GitHub. The app infers the
questions from a few conventions:

| In the Markdown | In the app |
| --- | --- |
| Optional front matter: `id`, `title`, `description`, `order`, `version`, `hidden` | Start-page card and template identity |
| `# Title` | Questionnaire title |
| Text before the first `##` | Intro shown at the top of the first section |
| `## Section` | One step of the questionnaire |
| `### Sub-heading` | Heading inside a step; also names a table below it |
| `**Label:** [prompt]` (paragraph or list item) | Text question; the prompt becomes the placeholder |
| 2-column table, `[prompt]` in the second column | One question per row (first column = label) |
| 3+ column table with a row of `[prompt]` cells | Repeatable records with **Add** / **Remove** |
| …first cell like `REQ-01` | Auto-numbered ID (REQ-02, REQ-03, …) |
| …first cell plain text (e.g. `Project lead`) | Preset row with that label |
| `[A / B / C]` | Single choice |
| `[A / B; note]` | Single choice plus a note box |
| `[P0-P3]` | Choice P0, P1, P2, P3 |
| `[Date]` or `[YYYY-MM-DD]` | Date picker |
| `[a, b, c, d, or e]` (4+ short items) | Text with clickable suggestions |
| `- [ ] item` | Checkbox |
| Anything else (paragraphs, quotes, lists, tables without prompts) | Guidance text, shown read-only |

Answer keys come from the section headings and labels (`## Document Control` + `Project / campaign`
→ `document_control.project_campaign`). Renaming a heading or label therefore changes its key.
Older answer files still open, but the renamed answers appear under "Other answers".

To add a template:

1. Copy `templates/requirements.md` to `templates/<id>.md` and edit it.
2. Run `node scripts/build-template-index.mjs` to preview locally (CI does this on deploy).
3. Commit and push.

## Answer file format

```yaml
# Project Data Requirements
template:
  id: requirements
  title: Project Data Strategy and Requirements
  version: 7ca7bc7e            # hash of the template file (or front-matter `version`)
  source: templates/requirements.md
meta:
  app: ip-requirements-app
  format_version: 1
  exported_at: '2026-10-22T15:22:02.350Z'
  submitted_at: '…'            # on submission
  submitted_by: { name: …, email: … }
answers:
  document_control:
    project_campaign: Pioreactor fleet consolidation (PRJ-042)
    status: In review
  requirements:
    requirements:
      - id: REQ-01
        requirement: The service shall ingest Pioreactor exports nightly.
        priority: P1
        status: Proposed
  acceptance_and_review:
    acceptance_and_review:
      - reviewer: Informatics Platform
        decision_comments: { choice: Investigate, note: Check data lake quota }
```

Unanswered questions are exported as empty strings, so open items stay visible.

## How this app was built

This repository is openly an AI-assisted build, and it is worth being precise about who did what.

**Ding He** (<dinghe@dtu.dk>) directed the work: set the requirements, made the design decisions,
reviewed the output and decided what shipped. **Claude Opus 5** (model id `claude-opus-5`), running
in [Claude Code](https://claude.com/claude-code), wrote the application code — the HTML, CSS and
JavaScript under `index.html`, `css/` and `js/`, the build script and the Pages workflow — across a
short series of sessions in October 2026.

The split that matters for anyone reading or reusing this:

- **Questionnaire content is human-authored.** The Markdown templates in [`templates/`](templates/)
  — the questions, the guidance, the structure of a requirements conversation — are the Informatics
  Platform team's domain work, not generated within this web app implementation phase.
- **Application code is model-generated.** Architecture choices (browser-local
  drafts, no backend, YAML as the canonical format, dropping the submission relay) were made by a
  human (Ding He) and implemented by the model.

Treat the code as you would any contribution you did not write yourself: read it before trusting
it, and verify behaviour rather than assuming it. It is deliberately small, dependency-free and
commented, so it can be read end to end in one sitting — about 1,300 lines of JavaScript across
four modules.

If you change it, you are under no obligation to keep using an AI to do so ;)

## License

[MIT](LICENSE) — © 2026 BRIGHT Informatics Platform, Technical University of Denmark (DTU).

Use it, fork it, adapt it for your own group; just keep the copyright and permission notice. The
questionnaire templates in [`templates/`](templates/) are covered by the same license, so you are
free to reuse and adapt the questions as well as the code.

The one piece of third-party code is [js-yaml](https://github.com/nodeca/js-yaml) 4.2.0, vendored
at [`vendor/js-yaml.mjs`](vendor/js-yaml.mjs) and also MIT; its notice is kept alongside it in
[`vendor/js-yaml.LICENSE`](vendor/js-yaml.LICENSE) and must stay there in any redistribution.
