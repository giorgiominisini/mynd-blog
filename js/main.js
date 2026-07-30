document.getElementById('year').textContent = new Date().getFullYear();

async function loadArticles() {
  const listEl = document.getElementById('article-list');
  try {
    const res = await fetch('content/index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('index mancante');
    const slugs = await res.json();

    if (!slugs.length) {
      listEl.innerHTML = '<p class="empty">Nessun articolo pubblicato ancora.</p>';
      return;
    }

    const articles = await Promise.all(
      slugs.map(slug =>
        fetch(`content/articles/${slug}.json`, { cache: 'no-store' }).then(r => r.json())
      )
    );

    listEl.innerHTML = articles.map(a => `
      <a class="card" href="articolo.html?slug=${encodeURIComponent(a.slug)}">
        <img src="${a.cover || ''}" alt="" loading="lazy">
        <div>
          <p class="meta">${formatDate(a.date)}</p>
          <h3>${escapeHtml(a.title)}</h3>
          <p class="excerpt">${escapeHtml(a.excerpt || '')}</p>
        </div>
      </a>
    `).join('');
  } catch (err) {
    listEl.innerHTML = '<p class="empty">Nessun articolo pubblicato ancora.</p>';
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadArticles();
