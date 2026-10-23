# Submission relay

`worker.js` receives submissions from the questionnaire site and commits each one as a new YAML
file under `client_submission/` through the GitHub Contents API. The GitHub token stays here,
never in the public site.

It accepts only `POST` requests from the origins you list. It checks that the body looks like an
answers file (≤ 256 KB) and needs a name and email. It creates new files only, never overwrites,
and builds the file path itself.

## Deploy on Cloudflare Workers

```bash
cd relay
npx wrangler login
# edit wrangler.toml: GITHUB_REPO (use a private repo for submissions), ALLOWED_ORIGINS
npx wrangler secret put GITHUB_TOKEN      # fine-grained PAT: this repo only, Contents read & write
npx wrangler secret put ACCESS_CODE       # optional
npx wrangler deploy
```

Wrangler prints a URL such as `https://ip-requirements-relay.<account>.workers.dev`. Put it in
the site's `config.json`:

```json
"submissions": { "relayUrl": "https://ip-requirements-relay.<account>.workers.dev", ... }
```

`ALLOWED_ORIGINS` is the scheme and host only, without the path, for example
`https://biosustain.github.io`. Add `http://localhost:8000` while testing locally.

## Other hosts

The handler is a standard `fetch(request, env)` function. To run it elsewhere (Azure Functions,
Deno Deploy, Vercel or Netlify edge functions), wrap it so that `env` holds the same variables.

## Request and response

```
POST { templateId, templateTitle, slugHint, content, submitter: {name, email}, accessCode, website }
201  { ok: true, path: "client_submission/requirements/2026-10-22T1530Z-my-project-1a2b3c.yaml", url }
4xx  { ok: false, error: "message shown to the user" }
```
