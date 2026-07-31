// Ritaglio immagini minimale: trascina per spostare, slider per ingrandire,
// tutto dentro una cornice con proporzioni fisse — così quello che vedi è
// esattamente quello che finirà nel blog. Nessuna libreria esterna.
//
// Uso: const c = createCropper({ frame, img, zoomSlider, aspectRatio });
//      await c.setImageFromFile(file)  oppure  await c.setImageFromUrl(url);
//      c.getCroppedBase64(outputWidth) -> stringa base64 (JPEG)
//      c.hasImage() -> true/false
//      c.reset()

function createCropper({ frame, img, zoomSlider, aspectRatio }) {
  let natW = 0, natH = 0;
  let scale = 1, minScale = 1, maxScale = 4;
  let offsetX = 0, offsetY = 0;
  let dragging = false, startX = 0, startY = 0, startOffX = 0, startOffY = 0;

  function frameSize() {
    return { w: frame.clientWidth, h: frame.clientHeight };
  }

  function prepare() {
    const { w, h } = frameSize();
    minScale = Math.max(w / natW, h / natH);
    scale = minScale;
    maxScale = minScale * 4;
    offsetX = 0;
    offsetY = 0;
    zoomSlider.min = minScale;
    zoomSlider.max = maxScale;
    zoomSlider.step = (maxScale - minScale) / 100 || 0.001;
    zoomSlider.value = scale;
    applyTransform();
  }

  function setImageFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          natW = img.naturalWidth;
          natH = img.naturalHeight;
          frame.style.display = 'block';
          prepare();
          resolve();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      img.onload = () => {
        natW = img.naturalWidth;
        natH = img.naturalHeight;
        frame.style.display = 'block';
        prepare();
        resolve();
      };
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  function clampOffsets() {
    const { w, h } = frameSize();
    const iw = natW * scale, ih = natH * scale;
    const maxX = Math.max(0, (iw - w) / 2);
    const maxY = Math.max(0, (ih - h) / 2);
    offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
    offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
  }

  function applyTransform() {
    if (!natW) return;
    clampOffsets();
    img.style.width = (natW * scale) + 'px';
    img.style.height = (natH * scale) + 'px';
    img.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;
  }

  zoomSlider.addEventListener('input', () => {
    scale = parseFloat(zoomSlider.value);
    applyTransform();
  });

  function pointerDown(e) {
    if (!natW) return;
    dragging = true;
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX; startY = p.clientY;
    startOffX = offsetX; startOffY = offsetY;
  }
  function pointerMove(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    offsetX = startOffX + (p.clientX - startX);
    offsetY = startOffY + (p.clientY - startY);
    applyTransform();
    if (e.cancelable) e.preventDefault();
  }
  function pointerUp() { dragging = false; }

  frame.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  frame.addEventListener('touchstart', pointerDown, { passive: true });
  frame.addEventListener('touchmove', pointerMove, { passive: false });
  frame.addEventListener('touchend', pointerUp);
  window.addEventListener('resize', () => { if (natW) prepare(); });

  function getCroppedBase64(outputWidth) {
    const { w: frameW } = frameSize();
    const outputHeight = Math.round(outputWidth / aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    const renderScale = outputWidth / frameW;
    const drawW = natW * scale * renderScale;
    const drawH = natH * scale * renderScale;
    const drawX = outputWidth / 2 - drawW / 2 + offsetX * renderScale;
    const drawY = outputHeight / 2 - drawH / 2 + offsetY * renderScale;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
  }

  function hasImage() { return natW > 0; }

  function reset() {
    natW = 0; natH = 0;
    img.removeAttribute('src');
    img.style.transform = '';
    frame.style.display = 'none';
  }

  return { setImageFromFile, setImageFromUrl, getCroppedBase64, hasImage, reset };
}
