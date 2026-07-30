let adminPassword = '';

document.getElementById('unlock').addEventListener('click', () => {
  adminPassword = document.getElementById('password').value;
  if (!adminPassword) return;
  // Nota: qui non verifichiamo la password (non abbiamo un vero "login").
  // La verifica avviene lato server ad ogni pubblicazione: se è sbagliata,
  // la pubblicazione fallirà con un messaggio d'errore chiaro.
  document.getElementById('gate').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  document.getElementById('date').valueAsDate = new Date();
});

document.querySelectorAll('.toolbar button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.execCommand(btn.dataset.cmd, false, btn.dataset.value || null);
    document.getElementById('editor').focus();
  });
});

let coverBase64 = '';
let coverExt = 'jpg';

document.getElementById('cover').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  coverExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const reader = new FileReader();
  reader.onload = () => {
    coverBase64 = reader.result.split(',')[1];
    const preview = document.getElementById('preview');
    preview.src = reader.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

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

  statusEl.textContent = 'Pubblicazione in corso…';
  statusEl.className = 'status';

  try {
    const res = await fetch('/.netlify/functions/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: adminPassword,
        title, excerpt,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        body,
        cover: coverBase64 || null,
        coverExt
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore sconosciuto');

    statusEl.textContent = `Pubblicato ✓ — il sito si aggiornerà in circa un minuto.`;
    statusEl.className = 'status ok';
    document.getElementById('title').value = '';
    document.getElementById('excerpt').value = '';
    document.getElementById('editor').innerHTML = '';
    document.getElementById('preview').style.display = 'none';
    coverBase64 = '';
  } catch (err) {
    statusEl.textContent = 'Errore: ' + err.message;
    statusEl.className = 'status err';
  }
});
