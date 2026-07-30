// Questa funzione gira sul server di Netlify (gratis), MAI nel browser.
// È l'unico posto in cui il token GitHub esiste: il pannello admin non lo
// vede mai. Il pannello admin manda solo i dati dell'articolo + la password;
// questa funzione verifica la password e scrive i file nel repository GitHub
// tramite l'API di GitHub. Ogni commit fa ripubblicare automaticamente il sito.

const GITHUB_API = 'https://api.github.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Metodo non consentito' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return response(400, { error: 'Corpo della richiesta non valido' });
  }

  const { password, title, excerpt, date, body, cover, coverExt } = payload;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return response(401, { error: 'Password non corretta' });
  }
  if (!title || !body) {
    return response(400, { error: 'Titolo e testo sono obbligatori' });
  }

  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return response(500, { error: 'Configurazione del server incompleta (variabili GitHub mancanti)' });
  }
  const branch = GITHUB_BRANCH || 'main';
  const slug = slugify(title) + '-' + Date.now().toString(36);

  try {
    let coverPath = '';
    if (cover) {
      coverPath = `content/images/${slug}.${coverExt || 'jpg'}`;
      await putFile(GITHUB_REPO, coverPath, cover, branch, `Aggiungi immagine per "${title}"`, true);
    }

    const article = {
      slug,
      title,
      excerpt: excerpt || '',
      date: date || new Date().toISOString(),
      cover: coverPath ? `/${coverPath}` : '',
      body
    };
    const articlePath = `content/articles/${slug}.json`;
    await putFile(
      GITHUB_REPO,
      articlePath,
      Buffer.from(JSON.stringify(article, null, 2)).toString('base64'),
      branch,
      `Pubblica articolo "${title}"`,
      false
    );

    await prependToIndex(GITHUB_REPO, slug, branch);

    return response(200, { ok: true, slug });
  } catch (err) {
    return response(500, { error: err.message || 'Errore durante la pubblicazione' });
  }
};

async function prependToIndex(repo, slug, branch) {
  const path = 'content/index.json';
  let sha = null;
  let list = [];
  try {
    const existing = await githubGet(repo, path, branch);
    sha = existing.sha;
    list = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8'));
  } catch {
    // il file non esiste ancora: lo creiamo al primo articolo pubblicato
  }
  list = [slug, ...list.filter(s => s !== slug)];
  await putFile(
    repo,
    path,
    Buffer.from(JSON.stringify(list, null, 2)).toString('base64'),
    branch,
    `Aggiorna indice articoli`,
    false,
    sha
  );
}

async function githubGet(repo, path, branch) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`File non trovato: ${path}`);
  return res.json();
}

async function putFile(repo, path, base64Content, branch, message, alreadyBase64, knownSha) {
  let sha = knownSha;
  if (sha === undefined) {
    try {
      const existing = await githubGet(repo, path, branch);
      sha = existing.sha;
    } catch {
      sha = undefined;
    }
  }
  const body = {
    message,
    content: alreadyBase64 ? base64Content : base64Content,
    branch
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Errore GitHub su ${path}: ${errText}`);
  }
  return res.json();
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json'
  };
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function response(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
