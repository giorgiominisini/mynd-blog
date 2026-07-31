// Genera un'immagine 1080x1920 (formato storia Instagram) con foto di copertina,
// titolo dell'articolo e il nome del blog. Instagram non permette la pubblicazione
// automatica di storie da un sito esterno senza un'app Business approvata da Meta,
// quindi il flusso realistico è: generiamo l'immagine pronta, la scarichiamo,
// e copiamo il link — tu la carichi a mano su Instagram in pochi secondi.

async function generateInstagramStory(article, articleUrl) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // sfondo
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#14161F');
  grad.addColorStop(1, '#1B1E29');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // foto di copertina, se presente
  const photoTop = 160, photoH = 1000, margin = 64;
  if (article.cover) {
    try {
      const img = await loadImage(article.cover);
      drawImageCover(ctx, img, margin, photoTop, W - margin * 2, photoH, 24);
    } catch {
      // se l'immagine non si carica (es. CORS), si prosegue senza bloccare la generazione
      ctx.fillStyle = '#242838';
      roundRect(ctx, margin, photoTop, W - margin * 2, photoH, 24);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#242838';
    roundRect(ctx, margin, photoTop, W - margin * 2, photoH, 24);
    ctx.fill();
  }

  // eyebrow
  ctx.fillStyle = '#A9A79E';
  ctx.font = '500 30px "IBM Plex Mono", monospace';
  ctx.fillText('SPORT & PSICOLOGIA', margin, 100);

  // titolo (wrap manuale)
  ctx.fillStyle = '#EDEAE1';
  ctx.font = '500 64px Georgia, serif';
  wrapText(ctx, article.title, margin, photoTop + photoH + 100, W - margin * 2, 74);

  // wordmark + hint in basso
  ctx.fillStyle = '#C9A24B';
  ctx.font = 'italic 500 46px Georgia, serif';
  ctx.fillText('mynd', margin, H - 110);

  ctx.fillStyle = '#A9A79E';
  ctx.font = '400 28px "IBM Plex Mono", monospace';
  ctx.fillText('- oltre il risultato', margin, H - 64);

  // scarica l'immagine
  canvas.toBlob(async (blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mynd-storia-${article.slug || 'articolo'}.png`;
    link.click();

    try {
      await navigator.clipboard.writeText(articleUrl);
      showToast('Immagine scaricata e link copiato — pronta per Instagram');
    } catch {
      showToast('Immagine scaricata — copia il link a mano');
    }
  }, 'image/png');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// disegna un'immagine dentro un rettangolo, ritagliandola come "object-fit: cover"
function drawImageCover(ctx, img, x, y, w, h, radius) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word + ' ';
    } else {
      line = test;
    }
  }
  lines.push(line);
  lines = lines.slice(0, 4); // non oltre 4 righe
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, y + i * lineHeight));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
