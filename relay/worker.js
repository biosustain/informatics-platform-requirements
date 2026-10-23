// Submission relay: receives answers from the static questionnaire site and commits
// them as YAML files into the repository folder `client_submission/`.
//
// Why a relay? GitHub Pages is static. Writing to a repo needs a token, and a token
// shipped inside a public web page can be copied by anyone. The relay keeps the token
// server-side and only ever writes new files under one folder.
//
// Deploy as a Cloudflare Worker (see relay/README.md). The handler only uses standard
// fetch/Request/Response APIs, so it ports to Deno Deploy, Vercel/Netlify edge functions
// or an Azure Function with minor changes.
//
// Environment (secrets/vars):
//   GITHUB_TOKEN     required  fine-grained PAT (or GitHub App token) with Contents: read & write
//                              on the submissions repository only
//   GITHUB_REPO      required  "owner/repo", e.g. "biosustain/ip-requirements"
//   GITHUB_BRANCH    optional  default "main"
//   FOLDER           optional  default "client_submission"
//   ALLOWED_ORIGINS  required  comma-separated, e.g. "https://biosustain.github.io"
//   ACCESS_CODE      optional  if set, submitters must enter this code (set
//                              submissions.requireAccessCode: true in config.json)

const MAX_BYTES = 256 * 1024;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const originOk = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : allowed[0] || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
    if (!originOk) return json({ ok: false, error: 'Origin not allowed' }, 403);
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return json({ ok: false, error: 'Relay is not configured' }, 500);

    const raw = await request.text();
    if (raw.length > MAX_BYTES) return json({ ok: false, error: 'Submission is too large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

    if (body.website) return json({ ok: true, path: '' }); // honeypot: pretend success for bots
    if (env.ACCESS_CODE && String(body.accessCode || '').trim() !== env.ACCESS_CODE) {
      return json({ ok: false, error: 'The access code is not correct.' }, 401);
    }

    const content = String(body.content || '');
    if (!content.trim() || !/^template:\s*$/m.test(content) || !/^answers:/m.test(content)) {
      return json({ ok: false, error: 'This does not look like a questionnaire answers file.' }, 400);
    }
    const name = String(body.submitter?.name || '').trim();
    const email = String(body.submitter?.email || '').trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: 'Please give your name and a valid email address.' }, 400);
    }

    const slug = (s, n) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n);
    const template = slug(body.templateId, 60) || 'unknown';
    const hint = slug(body.slugHint, 40) || 'submission';
    const now = new Date();
    const stamp = now.toISOString().slice(0, 16).replace(':', ''); // 2026-10-22T1530
    const rand = crypto.randomUUID().slice(0, 6);
    const folder = String(env.FOLDER || 'client_submission').replace(/^\/+|\/+$/g, '');
    const path = `${folder}/${template}/${stamp}Z-${hint}-${rand}.yaml`;

    const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ip-requirements-relay',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add submission for ${template} (${hint})`,
        content: toBase64(content),
        branch: env.GITHUB_BRANCH || 'main',
      }),
    });
    if (!res.ok) {
      console.log('GitHub error', res.status, await res.text());
      return json({ ok: false, error: 'Could not store the submission. Please try again later or email your file.' }, 502);
    }
    const out = await res.json();
    return json({ ok: true, path, url: out.content?.html_url || '' }, 201);
  },
};

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
