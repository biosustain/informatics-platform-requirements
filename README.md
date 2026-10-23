# Informatics Platform – Requirements Questionnaires

A small static web app for collecting project requirements from clients of the DTU Biosustain
Informatics Platform. Questionnaires are plain Markdown templates; clients answer them section by
section, review their answers, and submit. Submissions are stored as YAML in
[`client_submission/`](client_submission/) and can be viewed in the app.

- **Questionnaire style** – one step per `##` section, progress per section, autosave in the browser.
- **Export and view** – YAML (canonical), JSON, or the Markdown template filled in. Any exported
  file can be opened in the app again to view, edit or re-export.
- **Multiple templates** – drop a `.md` file into [`templates/`](templates/) and it shows up on the
  start page.
- **Submit** – sends the YAML to a small relay that commits it to `client_submission/`.
- **Submissions view** – lists the files in `client_submission/` and renders each one against its
  template.

No build step and no framework: HTML, CSS and ES modules, plus a vendored copy of
[js-yaml](https://github.com/nodeca/js-yaml) (MIT).

## Repository layout

```
index.html, css/, js/        the app
  js/markdown.js             Markdown parser (no dependencies)
  js/template.js             Markdown template -> questionnaire model
  js/answers.js              answer model, YAML/JSON/Markdown export, import
  js/github.js               submissions list/read (GitHub API) and submit (relay)
  js/app.js                  views and routing
vendor/js-yaml.mjs           js-yaml 4.2.0
config.json                  site settings (repo, relay URL, contact email)
templates/                   questionnaire templates (*.md) + generated index.json
client_submission/           submitted answers, one YAML per submission
relay/                       submission relay (Cloudflare Worker)
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

1. Create the repository in the Biosustain organisation (for example `biosustain/ip-requirements`)
   and push this folder.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow rebuilds `templates/index.json` and deploys the site to
   `https://biosustain.github.io/ip-requirements/`.

The workflow publishes only the app files. `client_submission/` and `relay/` are not part of the
site, and commits that touch only those folders do not trigger a redeploy.

Adjust `config.json` if the repository name or branch differs, and set `contactEmail` so clients
know where to send files if online submission is not set up.

Share a direct link to one questionnaire with `?template=<id>`, for example
`https://biosustain.github.io/ip-requirements/?template=requirements`.

## Set up submissions

GitHub Pages only serves static files, so it can't write to the repository by itself. A write
token embedded in a public page could be copied and used by anyone. **Submit** therefore posts to
a small relay that keeps the token on the server and can only create new files under
`client_submission/`.

1. Create a **fine-grained personal access token** (or a GitHub App) with access to *only* the
   submissions repository and the permission **Contents: Read and write**.
2. Deploy the relay; see [`relay/README.md`](relay/README.md). It takes about five minutes on
   Cloudflare Workers' free tier.
3. Put the relay URL in `config.json` → `submissions.relayUrl` and push.

Each submission becomes a commit adding
`client_submission/<template-id>/<YYYY-MM-DDTHHMM>Z-<project>-<random>.yaml`.

Until `relayUrl` is set, **Submit** tells clients to download the YAML and email it
(to `contactEmail`, if one is set).

Optional hardening:

- **Access code:** set the relay secret `ACCESS_CODE` and `submissions.requireAccessCode: true`.
  Clients then enter a code you give them.
- Hidden honeypot field (built in) and origin allow-list (`ALLOWED_ORIGINS`).
- Cloudflare rate-limiting rules on the relay route.

### Privacy of submissions

**Everything in a public repository is public**, including `client_submission/`. Answers can
contain unpublished project plans, names and email addresses. Recommended setup:

- Keep the **app** in a public repository so Pages can serve it.
- Store **submissions in a separate private repository** (for example
  `biosustain/ip-requirements-submissions`). Point the relay's `GITHUB_REPO` and
  `config.json → submissions.repo` at it.
- Staff view submissions in the app by pasting a fine-grained token with read-only **Contents**
  access into the box on the Submissions page. The token is kept for that browser tab only.

If you do keep submissions in the public app repository, the Submissions page works without a
token. Be aware that anyone can read the files.

## Viewing answers

- **Submissions** (top navigation) lists `client_submission/` grouped by template. Click one to see
  it rendered as a document, export it as Markdown, or **Edit a copy**, which loads it into your
  own draft so you can refine it with the client.
- **Open an answers file** on the start page views any YAML/JSON exported from the app.
- If the template has changed since the answers were made, answers are matched by question key,
  and anything that no longer matches is listed under "Other answers", so nothing is lost.

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
