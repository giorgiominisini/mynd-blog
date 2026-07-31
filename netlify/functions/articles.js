// Un solo endpoint per tutte le operazioni del pannello admin: pubblicare un
// nuovo articolo, modificarne uno esistente, eliminarlo, o cambiare l'ordine
// con cui compaiono in home. La password e il token GitHub restano sempre
// qui, mai nel browser.

const { putFile, deleteFile, readJson, slugify } = require('./lib/github');

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

  const { password, action } = payload;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return response(401, { error: 'Password non corretta' });
  }

  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return response(500, { error: 'Configurazione del server incompleta (variabili GitHub mancanti)' });
  }
  const repo = GITHUB_REPO;
  const branch = GITHUB_BRANCH || 'main';

  try {
    switch (action) {
      case 'update':
        return response(200, await updateArticle(repo, branch, payload));
      case 'delete':
        return response(200, await deleteArticle(repo, branch, payload));
      case 'reorder':
        return response(200, await reorderArticles(repo, branch, payload));
      default:
        return response(200, await createArticle(repo, branch, payload));
    }
  } catch (err) {
    return response(500, { error: err.message || 'Errore imprevisto' });
  }
};

async function createArticle(repo, branch, { title, excerpt, date, body, cover, coverExt, mid, midExt }) {
  if (!title || !body) throw new Error('Titolo e testo sono obbligatori');

  const slug = slugify(title) + '-' + Date.now().toString(36);

  let coverPath = '';
  if (cover) {
    coverPath = `content/images/${slug}-cover.${coverExt || 'jpg'}`;
    await putFile(repo, coverPath, cover, branch, `Aggiungi copertina per "${title}"`);
  }

  let midPath = '';
  if (mid) {
    midPath = `content/images/${slug}-mid.${midExt || 'jpg'}`;
    await putFile(repo, midPath, mid, branch, `Aggiungi foto centrale per "${title}"`);
  }

  const article = {
    slug, title, excerpt: excerpt || '',
    date: date || new Date().toISOString(),
    cover: coverPath ? `/${coverPath}` : '',
    mid: midPath ? `/${midPath}` : '',
    body
  };
  await putFile(
    repo, `content/articles/${slug}.json`,
    Buffer.from(JSON.stringify(article, null, 2)).toString('base64'),
    branch, `Pubblica articolo "${title}"`
  );

  const { data: list, sha } = await readJson(repo, 'content/index.json', branch, []);
  const newList = [slug, ...list.filter(s => s !== slug)];
  await putFile(
    repo, 'content/index.json',
    Buffer.from(JSON.stringify(newList, null, 2)).toString('base64'),
    branch, 'Aggiorna indice articoli', sha
  );

  return { ok: true, slug };
}

async function updateArticle(repo, branch, { slug, title, excerpt, date, body, cover, coverExt, mid, midExt }) {
  if (!slug) throw new Error('Slug mancante');
  const path = `content/articles/${slug}.json`;
  const { data: existing, sha } = await readJson(repo, path, branch, null);
  if (!existing) throw new Error('Articolo non trovato — potrebbe essere già stato eliminato');

  let coverPath = existing.cover ? existing.cover.replace(/^\//, '') : '';
  if (cover) {
    coverPath = `content/images/${slug}-cover.${coverExt || 'jpg'}`;
    await putFile(repo, coverPath, cover, branch, `Aggiorna copertina per "${title}"`);
  }

  let midPath = existing.mid ? existing.mid.replace(/^\//, '') : '';
  if (mid) {
    midPath = `content/images/${slug}-mid.${midExt || 'jpg'}`;
    await putFile(repo, midPath, mid, branch, `Aggiorna foto centrale per "${title}"`);
  }

  const updated = {
    ...existing,
    title: title || existing.title,
    excerpt: excerpt ?? existing.excerpt,
    date: date || existing.date,
    cover: coverPath ? `/${coverPath}` : existing.cover,
    mid: midPath ? `/${midPath}` : (existing.mid || ''),
    body: body || existing.body
  };
  await putFile(
    repo, path,
    Buffer.from(JSON.stringify(updated, null, 2)).toString('base64'),
    branch, `Modifica articolo "${updated.title}"`, sha
  );

  return { ok: true, slug };
}

async function deleteArticle(repo, branch, { slug }) {
  if (!slug) throw new Error('Slug mancante');
  const articlePath = `content/articles/${slug}.json`;

  const { data: existing } = await readJson(repo, articlePath, branch, null);
  if (existing && existing.cover) {
    await deleteFile(repo, existing.cover.replace(/^\//, ''), branch, `Elimina copertina di "${slug}"`);
  }
  if (existing && existing.mid) {
    await deleteFile(repo, existing.mid.replace(/^\//, ''), branch, `Elimina foto centrale di "${slug}"`);
  }
  await deleteFile(repo, articlePath, branch, `Elimina articolo "${slug}"`);

  const { data: list, sha } = await readJson(repo, 'content/index.json', branch, []);
  const newList = list.filter(s => s !== slug);
  await putFile(
    repo, 'content/index.json',
    Buffer.from(JSON.stringify(newList, null, 2)).toString('base64'),
    branch, 'Aggiorna indice articoli dopo eliminazione', sha
  );

  return { ok: true, slug };
}

async function reorderArticles(repo, branch, { order }) {
  if (!Array.isArray(order) || !order.length) throw new Error('Ordine non valido');
  const { sha } = await readJson(repo, 'content/index.json', branch, []);
  await putFile(
    repo, 'content/index.json',
    Buffer.from(JSON.stringify(order, null, 2)).toString('base64'),
    branch, 'Riordina articoli', sha
  );
  return { ok: true };
}

function response(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
