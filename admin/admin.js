let adminPassword = '';
let editingSlug = null;
let currentOrder = [];

document.getElementById('show-pw').addEventListener('change', (e) => {
  document.getElementById('password').type = e.target.checked ? 'text' : 'password';
});

// ---- ritaglio immagini (copertina 16:9, foto centrale 4:3) ----

const coverCropper = createCropper({
  frame: document.getElementById('cover-frame'),
  img: document.getElementById('cover-img'),
  zoomSlider: document.getElementById('cover-zoom'),
  aspectRatio: 16 / 9
});
const midCropper = createCropper({
  frame: document.getElementById('mid-frame'),
  img: document.getElementById('mid-img'),
  zoomSlider: document.getElementById('mid-zoom'),
  aspectRatio: 4 / 3
});

document.getElementById('cover-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await coverCropper.setImageFromFile(file);
  document.getElementById('cover-zoom-row').style.display = 'flex';
  document.getElementById('cover-hint').style.display = 'block';
});

document.getElementById('mid-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await midCropper.setImageFromFile(file);
  document.getElementById('mid-zoom-row').style.display = 'flex';
  document.getElementById('mid-hint').style.display = 'block';
});

function hideCropperUi(prefix) {
  document.getElementById(prefix + '-zoom-row').style.display = 'none';
  document.getElementById(prefix + '-hint').style.display = 'none';
  document.getElementById(prefix + '-file').value = '';
}

document.getElementById('unlock').addEventListener('click', () => {
  adminPassword = document.getElementById('password').value;
  if (!adminPassword) return;
  document.getElementById('gate').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  document.getElementById('date').valueAsDate = new Date();
  loadManagerList();
});

document.querySelectorAll('.toolbar button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.execCommand(btn.dataset.cmd, false, btn.dataset.value || null);
    document.getElementById('editor').focus();
  });
});

// ---- lista di gestione (modifica / elimina / riordina) ----

async function loadManagerList() {
  const managerEl = document.getElementById('manager');
  managerEl.innerHTML = '<p class="empty">Caricamento...</p>';
  try {
    const res = await fetch('../content/index.json', { cache: 'no-store' });
    const slugs = res.ok ? await res.json() : [];
    currentOrder = slugs;

    if (!slugs.length) {
      managerEl.innerHTML = '<p class="empty">Nessun articolo pubblicato ancora.</p>';
      return;
    }

    const articles = await Promise.all(
      slugs.map(slug =>
        fetch('../content/articles/' + slug + '.json', { cache: 'no-store' }).then(r => r.json())
      )
    );

    renderManagerList(articles);
  } catch {
    managerEl.innerHTML = '<p class="empty">Impossibile caricare l\'elenco.</p>';
  }
}

function renderManagerList(articles) {
  const managerEl = document.getElementById('manager');
  managerEl.innerHTML = articles.map((a, i) => (
    '<div class="row" data-slug="' + a.slug + '">' +
      '<div class="info">' +
        '<div class="row-title">' + escapeHtml(a.title) + '</div>' +
        '<div class="row-date">' + formatDate(a.date) + '</div>' +
      '</div>' +
      '<div class="actions">' +
        '<button type="button" data-act="up" ' + (i === 0 ? 'disabled' : '') + '>Su</button>' +
        '<button type="button" data-act="down" ' + (i === articles.length - 1 ? 'disabled' : '') + '>Giu</button>' +
        '<button type="button" data-act="edit">Modifica</button>' +
        '<button type="button" data-act="delete" class="danger">Elimina</button>' +
      '</div>' +
    '</div>'
  )).join('');

  managerEl.querySelectorAll('.row').forEach(row => {
    const slug = row.dataset.slug;
    row.querySelector('[data-act="edit"]').addEventListener('click', () => startEdit(slug, articles));
    row.querySelector('[data-act="delete"]').addEventListener('click', () => {
      const art = articles.find(a => a.slug === slug);
      deleteArticle(slug, art ? art.title : slug);
    });
    const upBtn = row.querySelector('[data-act="up"]');
    const downBtn = row.querySelector('[data-act="down"]');
    if (upBtn) upBtn.addEventListener('click', () => moveArticle(slug, -1));
    if (downBtn) downBtn.addEventListener('click', () => moveArticle(slug, 1));
  });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function startEdit(slug, articles) {
  const article = articles.find(a => a.slug === slug);
  if (!article) return;
  editingSlug = slug;

  document.getElementById('form-title').textContent = 'modifica: ' + article.title;
  document.getElementById('title').value = article.title;
  document.getElementById('excerpt').value = article.excerpt || '';
  document.getElementById('date').value = (article.date || '').slice(0, 10);
  document.getElementById('editor').innerHTML = article.body || '';

  // ricarica le immagini esistenti nel ritaglio, cosi si possono ri-inquadrare
  coverCropper.reset();
  hideCropperUi('cover');
  if (article.cover) {
    await coverCropper.setImageFromUrl('../' + article.cover.replace(/^\//, ''));
    document.getElementById('cover-zoom-row').style.display = 'flex';
    document.getElementById('cover-hint').style.display = 'block';
  }

  midCropper.reset();
  hideCropperUi('mid');
  if (article.mid) {
    await midCropper.setImageFromUrl('../' + article.mid.replace(/^\//, ''));
    document.getElementById('mid-zoom-row').style.display = 'flex';
    document.getElementById('mid-hint').style.display = 'block';
  }

  document.getElementById('publish').textContent = 'Salva modifiche';
  document.getElementById('cancel-edit').style.display = 'inline-flex';
  document.getElementById('title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('cancel-edit').addEventListener('click', resetForm);

function resetForm() {
  editingSlug = null;
  document.getElementById('form-title').textContent = 'nuovo articolo';
  document.getElementById('title').value = '';
  document.getElementById('excerpt').value = '';
  document.getElementById('date').valueAsDate = new Date();
  document.getElementById('editor').innerHTML = '';
  coverCropper.reset();
  hideCropperUi('cover');
  midCropper.reset();
  hideCropperUi('mid');
  document.getElementById('publish').textContent = 'Pubblica articolo';
  document.getElementById('cancel-edit').style.display = 'none';
}

async function deleteArticle(slug, title) {
  if (!confirm('Eliminare definitivamente "' + title + '"? Non si puo annullare.')) return;
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Eliminazione in corso...';
  statusEl.className = 'status';
  try {
    const res = await callArticlesApi({ action: 'delete', slug: slug });
    if (!res.ok) throw new Error(res.data.error || 'Errore sconosciuto');
    statusEl.textContent = 'Eliminato';
    statusEl.className = 'status ok';
    if (editingSlug === slug) resetForm();
    loadManagerList();
  } catch (err) {
    statusEl.textContent = 'Errore: ' + err.message;
    statusEl.className = 'status err';
  }
}

async function moveArticle(slug, direction) {
  const idx = currentOrder.indexOf(slug);
  const swapWith = idx + direction;
  if (swapWith < 0 || swapWith >= currentOrder.length) return;
  const newOrder = currentOrder.slice();
  const tmp = newOrder[idx];
  newOrder[idx] = newOrder[swapWith];
  newOrder[swapWith] = tmp;
  currentOrder = newOrder;

  const statusEl = document.getElementById('status');
  try {
    const res = await callArticlesApi({ action: 'reorder', order: newOrder });
    if (!res.ok) throw new Error(res.data.error || 'Errore sconosciuto');
    loadManagerList();
  } catch (err) {
    statusEl.textContent = 'Errore nel riordino: ' + err.message;
    statusEl.className = 'status err';
  }
}

// ---- pubblica / salva ----

document.getElementById('publish').addEventListener('click', async () => {
  const title = document.getElementById('title').value.trim();
  const excerpt = document.getElementById('excerpt').value.trim();
  const date = document.getElementById('date').value;
  const body = document.getElementById('editor').innerHTML.trim();
  const statusEl = document.getElementById('status');

  if (!title || !body) {
    statusEl.textContent = 'Inserisci almeno titolo e testo.';
    statusEl.className = 'status err';
    return;
  }

  const isEditing = !!editingSlug;
  statusEl.textContent = isEditing ? 'Salvataggio in corso...' : 'Pubblicazione in corso...';
  statusEl.className = 'status';

  try {
    const payload = {
      action: isEditing ? 'update' : 'create',
      title: title, excerpt: excerpt,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      body: body
    };
    // le immagini vengono ritagliate ed esportate solo se e' stata caricata
    // una nuova foto in questa sessione; altrimenti quella esistente resta invariata
    if (coverCropper.hasImage()) {
      payload.cover = coverCropper.getCroppedBase64(1600);
      payload.coverExt = 'jpg';
    }
    if (midCropper.hasImage()) {
      payload.mid = midCropper.getCroppedBase64(1200);
      payload.midExt = 'jpg';
    }
    if (isEditing) payload.slug = editingSlug;

    const res = await callArticlesApi(payload);
    if (!res.ok) throw new Error(res.data.error || 'Errore sconosciuto');

    statusEl.textContent = isEditing
      ? 'Modifiche salvate - il sito si aggiornera in circa un minuto.'
      : 'Pubblicato - il sito si aggiornera in circa un minuto.';
    statusEl.className = 'status ok';
    resetForm();
    loadManagerList();
  } catch (err) {
    statusEl.textContent = 'Errore: ' + err.message;
    statusEl.className = 'status err';
  }
});

async function callArticlesApi(payload) {
  const res = await fetch('/.netlify/functions/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ password: adminPassword }, payload))
  });
  const data = await res.json();
  return { ok: res.ok, data: data };
}
