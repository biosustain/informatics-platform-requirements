# Informatics Platform – Requirements Questionnaires

A small static web app for collecting project requirements from clients of the DTU Biosustain
Informatics Platform. Questionnaires are plain Markdown templates; clients answer them section by
section, review their answers, and send the exported file to the team by email.

- **Questionnaire style** – one step per `##` section, progress per section, autosave in the browser.
- **Export and view** – YAML (canonical), JSON, or the Markdown template filled in. Any exported
  file can be opened in the app again to view, edit or re-export.
- **Multiple templates** – drop a `.md` file into [`templates/`](templates/) and it shows up on the
  start page.
- **Send your answers** – downloads the YAML and points the client at `contactEmail`.

Everything runs in the browser. There is no server, no account and no network call beyond loading
the site itself: answers never leave the client's machine until they choose to send the file.

No build step and no framework: HTML, CSS and ES modules, plus a vendored copy of
[js-yaml](https://github.com/nodeca/js-yaml) (MIT).

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

Set `contactEmail` in `config.json` before going live — it is the only way a client is told where
to send their answers.

Share a direct link to one questionnaire with `?template=<id>`, for example
`https://biosustain.github.io/informatics-platform-requirements/?template=requirements`.

## Receiving answers

The app never sends anything anywhere. When a client finishes, **Send your answers** downloads the
YAML and offers a `mailto:` link to `contactEmail`; the client attaches that file to the email.

To read an answers file, open the site and use **Open an answers file** on the start page. It
renders the YAML or JSON against its template as a document, which you can export as Markdown, or
load into your own draft with **Edit a copy** to refine together with the client.

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
# Project Data Strategy and Requirements
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
