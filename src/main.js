import { DEFAULT_PARAMS, initControls } from './controls.js';
import {
  exportPDF,
  exportPNG,
  exportSVG, exportTXT,
  loadFile, render,
  triggerDownload, triggerDownloadText,
} from './renderer.js';

let currentFile = null;
let params = { ...DEFAULT_PARAMS };
let renderDebounce = null;
let isRendering = false;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const resultWrap = document.getElementById('result');
const resultInner = document.getElementById('result-inner');
const thumbWrap = document.getElementById('thumb-wrap');
const thumbImg = document.getElementById('thumb');
const thumbName = document.getElementById('thumb-name');
const thumbSize = document.getElementById('thumb-size');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const btnRender = document.getElementById('btn-render');
const btnLabel = document.getElementById('btn-label');
const btnSpinner = document.getElementById('render-spinner');
const btnIcon = document.getElementById('btn-icon');
const exportBtns = document.querySelectorAll('.export-btn');
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');

params = initControls((newParams) => {
  Object.assign(params, newParams);
  scheduleRender();
});

fileInput.addEventListener('change', () => onFile(fileInput.files[0]));
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) onFile(f);
});

document.getElementById('btn-open').addEventListener('click', () => fileInput.click());

async function onFile(file) {
  if (!file) return;
  currentFile = file;
  const reader = new FileReader();
  reader.onload = e => { thumbImg.src = e.target.result; };
  reader.readAsDataURL(file);

  thumbWrap.style.display = 'flex';
  thumbName.textContent = file.name.length > 30 ? file.name.slice(0, 27) + '…' : file.name;
  thumbSize.textContent = (file.size / 1024).toFixed(0) + ' KB';
  setStatus('Loading…', 'busy');

  try {
    await loadFile(file);
    setStatus('Loaded — ' + file.name, '');
    doRender();
  } catch (e) {
    setStatus('Failed to load image', 'err');
  }
}

function scheduleRender() {
  if (!currentFile) return;
  // Skip auto-render for slow glyph algorithms — user must click Render manually.
  if (params.glyphMatch || params.glyphErrDiff) {
    setStatus('Press Render to apply (slow mode active)', 'busy');
    return;
  }
  // Don't queue a new render while one is already running.
  if (isRendering) return;
  clearTimeout(renderDebounce);
  renderDebounce = setTimeout(doRender, 300);
}

async function doRender() {
  if (!currentFile) { setStatus('Drop an image to start', ''); return; }
  if (isRendering) return; // Prevent stacked renders
  isRendering = true;
  setBusy(true);
  setStatus('Rendering…', 'busy');

  await new Promise(r => setTimeout(r, 50));

  try {
    const html = await render(params);
    resultInner.innerHTML = html;
    dropzone.style.display = 'none';
    resultWrap.style.display = 'block';
    exportBtns.forEach(b => b.style.display = ''); // only show on success
    setStatus(`Done · ${params.cols} cols · ${params.theme}`, 'ok');
  } catch (e) {
    setStatus('Error: ' + e.message, 'err');
    console.error(e);
  }
  isRendering = false;
  setBusy(false);
}

btnRender.addEventListener('click', doRender);

document.getElementById('btn-html').addEventListener('click', async () => {
  const svg = exportSVG();
  if (!svg) return;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ASCII Art</title></head><body style="margin:0;background:${params.bgHex};">${resultInner.innerHTML}</body></html>`;
  triggerDownloadText(html, 'ascii_art.html', 'text/html');
  toast('HTML saved ✓');
});

document.getElementById('btn-txt').addEventListener('click', () => {
  const txt = exportTXT();
  if (!txt) return;
  triggerDownloadText(txt, 'ascii_art.txt');
  toast('TXT saved ✓');
});

document.getElementById('btn-svg').addEventListener('click', () => {
  const svg = exportSVG();
  if (!svg) return;
  triggerDownloadText(svg, 'ascii_art.svg', 'image/svg+xml');
  toast('SVG saved ✓');
});

document.getElementById('btn-png').addEventListener('click', async () => {
  setStatus('Generating PNG…', 'busy');
  try {
    const blob = await exportPNG();
    triggerDownload(blob, 'ascii_art.png');
    setStatus('PNG saved', 'ok');
    toast('PNG saved ✓');
  } catch (e) { setStatus('PNG error: ' + e.message, 'err'); }
});

document.getElementById('btn-pdf').addEventListener('click', async () => {
  setStatus('Generating PDF…', 'busy');
  try {
    const blob = await exportPDF();
    triggerDownload(blob, 'ascii_art.pdf');
    setStatus('PDF saved', 'ok');
    toast('PDF saved ✓');
  } catch (e) { setStatus('PDF error: ' + e.message, 'err'); }
});

function setStatus(msg, cls = '') {
  statusText.textContent = msg;
  statusDot.className = 'status-dot' + (cls ? ' ' + cls : '');
}

function setBusy(on) {
  btnSpinner.style.display = on ? 'block' : 'none';
  btnIcon.style.display = on ? 'none' : 'block';
  btnLabel.textContent = on ? 'Rendering…' : 'Render';
  progressBar.style.display = on ? 'block' : 'none';

  if (on) {
    clearInterval(btnRender._iv); // Clear any leaked interval from a previous call
    let w = 0;
    const iv = setInterval(() => {
      w = Math.min(w + Math.random() * 5, 88);
      progressFill.style.width = w + '%';
      if (w >= 88) clearInterval(iv);
    }, 100);
    btnRender._iv = iv;
  } else {
    clearInterval(btnRender._iv);
    progressFill.style.width = '100%';
    setTimeout(() => {
      progressBar.style.display = 'none';
      progressFill.style.width = '0%';
    }, 350);
  }
}

function toast(msg) {
  toastMsg.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
}


