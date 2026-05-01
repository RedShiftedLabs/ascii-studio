import {
  imageToRGBA,
  loadImageFromFile,
  renderToCanvas,
  renderToHTML,
  renderToPDF,
  renderToPNG,
  renderToSVG,
  renderToTxt,
  runPipeline,
  THEMES,
} from './engine.js';

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

export async function render(params) {
  if (!currentImg) throw new Error('No image loaded');
  const theme = THEMES[params.theme] || THEMES.noir;
  const enriched = {
    cols: params.cols,
    charset: params.charset,
    charAspect: params.charAspect,
    sharpen: params.sharpen,
    contrast: params.contrast,
    gamma: params.gamma,
    exposure: params.exposure,
    edgeWeight: params.edgeWeight,
    equalize: params.equalize,
    dither: params.dither,
    invert: params.invert,
    showMask: params.showMask,
    alphaThreshold: params.alphaThreshold,
    vignette: params.vignette,
    grain: params.grain,
    attenuation: params.attenuation,
    colourMode: theme.colour,
    fgHex: params.fgHex || theme.fg,
    bgHex: params.bgHex || theme.bg,
    fontSize: params.fontSize,
    outputFont: params.outputFont,
    multiscale: params.multiscale,
    multiscaleBoost: params.multiscaleBoost,
    saliencyAware: params.saliencyAware,
    saliencyBoost: params.saliencyBoost,
    fusionV6: params.fusionV6,
    freqAware: params.freqAware,
    freqAwareCohThresh: params.freqAwareCohThresh,
    freqAwareEngThresh: params.freqAwareEngThresh,
    glyphMatch: params.glyphMatch,
    glyphErrDiff: params.glyphErrDiff,
    customCharset: params.customCharset || '',
  };

  lastResult = runPipeline(currentImg, enriched);
  lastParams = enriched;

  return renderToCanvas(lastResult.charGrid, lastResult.brightness, lastResult.colourData, {
    rows: lastResult.rows,
    cols: lastResult.cols,
    ...enriched,
  });
}

export function exportHTML() {
  if (!lastResult || !lastParams) return null;
  return renderToHTML(lastResult.charGrid, lastResult.brightness, lastResult.colourData, {
    rows: lastResult.rows, cols: lastResult.cols, ...lastParams,
  });
}

export function exportSVG() {
  if (!lastResult || !lastParams) return null;
  return renderToSVG(lastResult.charGrid, lastResult.brightness, lastResult.colourData, {
    rows: lastResult.rows, cols: lastResult.cols, ...lastParams,
  });
}

export function exportTXT() {
  if (!lastResult) return null;
  return renderToTxt(lastResult.charGrid);
}

export async function exportPNG() {
  const svg = exportSVG();
  if (!svg) return null;
  return renderToPNG(svg);
}

export async function exportPDF() {
  const svg = exportSVG();
  if (!svg) return null;
  return renderToPDF(svg);
}

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