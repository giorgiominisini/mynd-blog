function getSlug() {
  return new URLSearchParams(window.location.search).get('slug');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

let currentArticle = null;

async function loadArticle() {
  const slug = getSlug();
  if (!slug) {
    document.getElementById('title').textContent = 'Articolo non trovato';
    return;
  }
  try {
    const res = await fetch(`content/articles/${slug}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('not found');
    const a = await res.json();
    currentArticle = a;

    document.title = `${a.title} — Mynd`;
    document.getElementById('page-title').textContent = `${a.title} — Mynd`;
    document.getElementById('page-desc').setAttribute('content', a.excerpt || '');
    document.getElementById('og-title').setAttribute('content', a.title);
    document.getElementById('og-desc').setAttribute('content', a.excerpt || '');
    document.getElementById('og-image').setAttribute('content', a.cover || '');

    document.getElementById('date').textContent = new Date(a.date).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    document.getElementById('title').textContent = a.title;
    document.getElementById('body').innerHTML = a.body || '';

    if (a.cover) {
      const cover = document.getElementById('cover');
      cover.src = a.cover;
      cover.style.display = 'block';
    }
  } catch (err) {
    document.getElementById('title').textContent = 'Articolo non trovato';
  }
}

document.getElementById('btn-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast('Link copiato negli appunti');
  } catch {
    showToast('Copia manuale: ' + window.location.href);
  }
});

document.getElementById('btn-story').addEventListener('click', () => {
  if (!currentArticle) return;
  generateInstagramStory(currentArticle, window.location.href);
});

loadArticle();
