// GitHub access: list/read submissions in the repo, and submit through the relay.
// Reading works without a token for public repositories (60 API requests/hour per IP).
// For a private submissions repository, staff paste a read-only fine-grained token.

const API = 'https://api.github.com';

function headers(token, raw = false) {
  const h = { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

async function explain(r, token) {
  if (r.status === 404) return token ? 'Repository, branch or folder not found, or the token has no access to it.' : 'Not found. If the submissions repository is private, add a read token below.';
  if (r.status === 401) return 'The token was rejected (expired or mistyped?).';
  if (r.status === 403 || r.status === 429) {
    const reset = r.headers.get('x-ratelimit-reset');
    const when = reset ? ` Try again after ${new Date(+reset * 1000).toLocaleTimeString()}.` : '';
    return `GitHub refused the request (rate limit or permissions).${when} Adding a token raises the limit.`;
  }
  return `GitHub returned HTTP ${r.status}.`;
}

export async function listSubmissions(cfg, token) {
  const { owner, repo, branch } = cfg.submissions.repo;
  const folder = cfg.submissions.folder.replace(/\/+$/, '');
  const r = await fetch(`${API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: headers(token), cache: 'no-cache' });
  if (!r.ok) throw new Error(await explain(r, token));
  const j = await r.json();
  return (j.tree || [])
    .filter((e) => e.type === 'blob' && e.path.startsWith(folder + '/') && /\.(ya?ml|json)$/i.test(e.path))
    .map((e) => {
      const rel = e.path.slice(folder.length + 1).split('/');
      const name = rel[rel.length - 1];
      const date = (name.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2})(\d{2}))?/) || []);
      return {
        path: e.path, name, size: e.size,
        group: rel.length > 1 ? rel[0] : '',
        date: date[1] ? `${date[1]}${date[2] ? ` ${date[2]}:${date[3]}` : ''}` : '',
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

export async function fetchSubmission(cfg, path, token) {
  const { owner, repo, branch } = cfg.submissions.repo;
  const r = await fetch(`${API}/repos/${owner}/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(branch)}`, { headers: headers(token, true), cache: 'no-cache' });
  if (!r.ok) throw new Error(await explain(r, token));
  return r.text();
}

export function submissionUrl(cfg, path) {
  const { owner, repo, branch } = cfg.submissions.repo;
  return `https://github.com/${owner}/${repo}/blob/${encodeURIComponent(branch)}/${encPath(path)}`;
}

/** List templates via the API — fallback when templates/index.json is missing. */
export async function listTemplatesFromRepo(cfg) {
  const { owner, repo, branch } = cfg.github;
  const r = await fetch(`${API}/repos/${owner}/${repo}/contents/templates?ref=${encodeURIComponent(branch)}`, { headers: headers() });
  if (!r.ok) throw new Error(await explain(r));
  return (await r.json())
    .filter((f) => f.type === 'file' && /\.md$/i.test(f.name) && !/^readme\.md$/i.test(f.name))
    .map((f) => ({ id: f.name.replace(/\.md$/i, ''), title: f.name.replace(/\.md$/i, ''), description: '', file: `templates/${f.name}` }));
}

export async function submit(cfg, payload) {
  const url = cfg.submissions.relayUrl;
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {
    throw new Error('Could not reach the submission service. Check your connection, or download the file and email it instead.');
  }
  let j = {};
  try { j = await r.json(); } catch { /* ignore */ }
  if (!r.ok || !j.ok) throw new Error(j.error || `Submission failed (HTTP ${r.status}).`);
  return j; // { ok, path, url }
}
