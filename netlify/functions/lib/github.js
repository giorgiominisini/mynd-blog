// Funzioni di appoggio per parlare con l'API di GitHub. Usate solo lato
// server (dentro netlify/functions), mai esposte al browser.

const GITHUB_API = 'https://api.github.com';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json'
  };
}

async function githubGet(repo, path, branch) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    const err = new Error(`File non trovato: ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function putFile(repo, path, base64Content, branch, message, knownSha) {
  let sha = knownSha;
  if (sha === undefined) {
    try {
      const existing = await githubGet(repo, path, branch);
      sha = existing.sha;
    } catch {
      sha = undefined;
    }
  }
  const body = { message, content: base64Content, branch };
  if (sha) body.sha = sha;

  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Errore GitHub su ${path}: ${await res.text()}`);
  }
  return res.json();
}

async function deleteFile(repo, path, branch, message) {
  let sha;
  try {
    const existing = await githubGet(repo, path, branch);
    sha = existing.sha;
  } catch {
    return; // il file non esiste già: niente da cancellare
  }
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'DELETE',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha, branch })
  });
  if (!res.ok) {
    throw new Error(`Errore GitHub cancellando ${path}: ${await res.text()}`);
  }
}

async function readJson(repo, path, branch, fallback) {
  try {
    const existing = await githubGet(repo, path, branch);
    return {
      data: JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8')),
      sha: existing.sha
    };
  } catch {
    return { data: fallback, sha: undefined };
  }
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

module.exports = { githubGet, putFile, deleteFile, readJson, slugify, GITHUB_API };
