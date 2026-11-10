import {
  imageToRGBA,
  loadImageFromFile,
  renderToCanvas,
  renderToHTML,
  renderToSVG,
  renderToTxt,
  runPipeline,
  THEMES,
} from './engine.js';
import { DEFAULT_PARAMS } from './controls.js';

let currentImg = null;
let lastResult = null;
let lastParams = null;

export function setCurrentImage(img) { currentImg = img; }
export function getCurrentImage() { return currentImg; }

export async function loadFile(file) {
  const imgEl = await loadImageFromFile(file);
  currentImg = imageToRGBA(imgEl);
  return currentImg;
}

function _buildOpts(params = {}) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const theme = THEMES[merged.theme] || THEMES.noir;
  return {
    ...merged,
    colourMode: merged.colourMode !== undefined ? merged.colourMode : theme.colour,
    fgHex: merged.fgHex || theme.fg,
    bgHex: merged.bgHex || theme.bg,
  };
}

export async function render(params) {
  if (!currentImg) throw new Error('No image loaded');
  const enriched = _buildOpts(params);

  lastResult = await runPipeline(currentImg, enriched);
  lastParams = enriched;

  return renderToCanvas(
    lastResult.charGrid,
    lastResult.brightness,
    lastResult.colourData,
    { rows: lastResult.rows, cols: lastResult.cols, ...enriched },
    lastResult.opacities || null,
  );
}

/* ── Canvas-based export (WYSIWYG — matches preview exactly) ── */

function _getExportCanvas(scaleFactor = 2) {
  if (!lastResult || !lastParams) return null;
  // Render at higher font size for crisp export
  const exportOpts = {
    rows: lastResult.rows,
    cols: lastResult.cols,
    ...lastParams,
    fontSize: lastParams.fontSize * scaleFactor,
    horizontalGap: (lastParams.horizontalGap !== undefined ? lastParams.horizontalGap : 0.3) * scaleFactor,
  };
  return renderToCanvas(
    lastResult.charGrid,
    lastResult.brightness,
    lastResult.colourData,
    exportOpts,
    lastResult.opacities || null,
  );
}

/* ── Text-format exports (SVG / HTML / TXT) ── */

export function exportHTML() {
  if (!lastResult || !lastParams) return null;
  return renderToHTML(lastResult.charGrid, lastResult.brightness, lastResult.colourData, {
    rows: lastResult.rows, cols: lastResult.cols, ...lastParams,
  }, lastResult.opacities || null);
}

export function exportSVG() {
  if (!lastResult || !lastParams) return null;
  return renderToSVG(lastResult.charGrid, lastResult.brightness, lastResult.colourData, {
    rows: lastResult.rows, cols: lastResult.cols, ...lastParams,
  }, lastResult.opacities || null);
}

export function exportTXT() {
  if (!lastResult) return null;
  return renderToTxt(lastResult.charGrid);
}

/* ── Raster exports (PNG / PDF from canvas — true WYSIWYG) ── */

export async function exportPNG() {
  const canvas = _getExportCanvas(3);
  if (!canvas) return null;
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('PNG: canvas.toBlob returned null'));
    }, 'image/png');
  });
}

export async function exportPDF() {
  if (!window.jspdf) {
    await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
  const { jsPDF } = window.jspdf;
  const canvas = _getExportCanvas(3);
  if (!canvas) return null;

  const imgData = canvas.toDataURL('image/png');
  const w = canvas.width;
  const h = canvas.height;
  const pdf = new jsPDF({
    orientation: w > h ? 'landscape' : 'portrait',
    unit: 'px',
    format: [w, h],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, w, h);
  return pdf.output('blob');
}

function _loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

/* ── Download helpers ── */

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerDownloadText(text, filename, mime = 'text/plain') {
  triggerDownload(new Blob([text], { type: mime }), filename);
}