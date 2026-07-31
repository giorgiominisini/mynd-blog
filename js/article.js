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

    if (a.mid) insertMidImage(a.mid);

    setShareLinks(a, window.location.href);
  } catch (err) {
    document.getElementById('title').textContent = 'Articolo non trovato';
  }
}

// Inserisce la foto centrale subito dopo il paragrafo di metà articolo.
// Se il testo non ha paragrafi diretti (solo titoli, o struttura insolita),
// la mette in fondo al corpo dell'articolo invece di non mostrarla.
function insertMidImage(midSrc) {
  const bodyEl = document.getElementById('body');
  const paragraphs = Array.from(bodyEl.children).filter(el => el.tagName === 'P');

  const img = document.createElement('img');
  img.src = midSrc;
  img.alt = '';
  img.loading = 'lazy';
  img.className = 'mid-image';

  if (paragraphs.length > 0) {
    const middleIndex = Math.floor((paragraphs.length - 1) / 2);
    paragraphs[middleIndex].after(img);
  } else {
    bodyEl.appendChild(img);
  }
}

function setShareLinks(article, url) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(article.title);

  document.getElementById('btn-x').href =
    `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  document.getElementById('btn-facebook').href =
    `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  document.getElementById('btn-linkedin').href =
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
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
