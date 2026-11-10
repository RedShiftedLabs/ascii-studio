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
import {
  renderDithering,
  renderHalftone,
  renderMatrixRain,
  renderWaveLines,
  renderPixelSort,
  renderContour,
  renderCrosshatch,
  renderBlockify,
  applyCRTPostProcessing,
} from './effects.js';
import { isWebGPUSupported, WebGPURenderer } from './webgpu.js';

let currentImg = null;
let currentSourceElement = null;
let lastResult = null;
let lastParams = null;
let lastExportCanvas = null;

let webcamStream = null;
let webcamVideo = null;
let webcamAnimId = null;

let webgpuRenderer = null;
let webgpuCanvas = null;
let webgpuAvailable = false;
let useWebGPU = true;

export async function initWebGPU() {
  if (!isWebGPUSupported()) {
    webgpuAvailable = false;
    return false;
  }
  try {
    if (!webgpuCanvas) {
      webgpuCanvas = document.createElement('canvas');
    }
    webgpuRenderer = new WebGPURenderer(webgpuCanvas);
    const ok = await webgpuRenderer.init();
    webgpuAvailable = ok;
    return ok;
  } catch (err) {
    console.warn('WebGPU init exception, falling back:', err);
    webgpuAvailable = false;
    return false;
  }
}

export function isWebGPUActive() {
  return webgpuAvailable && useWebGPU;
}

export function setUseWebGPU(enabled) {
  useWebGPU = !!enabled;
}

export function getRendererType() {
  return isWebGPUActive() ? 'webgpu' : 'canvas2d';
}

export function setCurrentImage(img, element = null) {
  currentImg = img;
  currentSourceElement = element;
}

export function getCurrentImage() { return currentImg; }

export async function loadFile(file) {
  stopWebcam();
  const imgEl = await loadImageFromFile(file);
  currentImg = imageToRGBA(imgEl);
  currentSourceElement = imgEl;
  return currentImg;
}

export async function startWebcam(onFrame) {
  if (webcamStream) return webcamVideo;
  webcamVideo = document.createElement('video');
  webcamVideo.autoplay = true;
  webcamVideo.muted = true;
  webcamVideo.playsInline = true;

  webcamStream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
  });
  webcamVideo.srcObject = webcamStream;
  await new Promise(r => {
    webcamVideo.onloadedmetadata = () => {
      webcamVideo.play();
      r();
    };
  });

  currentImg = webcamVideo;
  currentSourceElement = webcamVideo;

  const loop = () => {
    if (!webcamStream) return;
    if (webcamVideo.readyState >= 2) {
      onFrame();
    }
    webcamAnimId = requestAnimationFrame(loop);
  };
  webcamAnimId = requestAnimationFrame(loop);
  return webcamVideo;
}

export function stopWebcam() {
  if (webcamAnimId) {
    cancelAnimationFrame(webcamAnimId);
    webcamAnimId = null;
  }
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
  if (webcamVideo) {
    webcamVideo.pause();
    webcamVideo.srcObject = null;
    webcamVideo = null;
  }
}

export function isWebcamActive() {
  return !!webcamStream;
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

function _rgbaToCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.w;
  c.height = img.h;
  const ctx = c.getContext('2d');
  ctx.putImageData(img.data, 0, 0);
  return c;
}

export async function render(params) {
  if (!currentImg && !currentSourceElement) throw new Error('No image loaded');
  const enriched = _buildOpts(params);
  lastParams = enriched;

  const mode = enriched.effectMode || 'ascii';

  let canvas;

  // 1. WebGPU Accelerated ASCII Rendering (60 FPS GPU Pipeline)
  if (mode === 'ascii' && isWebGPUActive() && webgpuRenderer) {
    try {
      const source = currentSourceElement || (currentImg ? _rgbaToCanvas(currentImg) : null);
      if (source) {
        const ok = webgpuRenderer.render(source, enriched);
        if (ok) {
          canvas = webgpuCanvas;
          lastExportCanvas = canvas;
          return canvas;
        }
      }
    } catch (gpuErr) {
      console.warn('WebGPU render error, falling back to Canvas 2D:', gpuErr);
    }
  }

  // 2. Generative Effects & Canvas 2D Engine
  if (mode === 'dithering') {
    canvas = renderDithering(currentImg, enriched);
  } else if (mode === 'halftone') {
    canvas = renderHalftone(currentImg, enriched);
  } else if (mode === 'matrixRain') {
    canvas = renderMatrixRain(currentImg, { ...enriched, time: performance.now() * 0.002 });
  } else if (mode === 'waveLines') {
    canvas = renderWaveLines(currentImg, { ...enriched, time: performance.now() * 0.002 });
  } else if (mode === 'pixelSort') {
    canvas = renderPixelSort(currentImg, enriched);
  } else if (mode === 'contour') {
    canvas = renderContour(currentImg, enriched);
  } else if (mode === 'crosshatch') {
    canvas = renderCrosshatch(currentImg, enriched);
  } else if (mode === 'blockify') {
    canvas = renderBlockify(currentImg, enriched);
  } else {
    // Standard ASCII Studio Engine
    lastResult = await runPipeline(currentImg, enriched);
    canvas = renderToCanvas(
      lastResult.charGrid,
      lastResult.brightness,
      lastResult.colourData,
      { rows: lastResult.rows, cols: lastResult.cols, ...enriched },
      lastResult.opacities || null,
    );
  }

  // Post-processing CRT & Grain overlays
  if (enriched.crtScanlines || enriched.chromaticAberration || enriched.crtCurve) {
    applyCRTPostProcessing(canvas, enriched);
  }

  lastExportCanvas = canvas;
  return canvas;
}

/* ── Canvas-based export (WYSIWYG — matches preview exactly) ── */

async function _getExportCanvas(scaleFactor = 2) {
  if (!lastParams) return null;
  const mode = lastParams.effectMode || 'ascii';

  if (mode !== 'ascii' && lastExportCanvas) {
    return lastExportCanvas;
  }

  if (!lastResult && currentImg) {
    lastResult = await runPipeline(currentImg, lastParams);
  }
  if (!lastResult) return null;

  const exportOpts = {
    rows: lastResult.rows,
    cols: lastResult.cols,
    ...lastParams,
    fontSize: lastParams.fontSize * scaleFactor,
    horizontalGap: (lastParams.horizontalGap !== undefined ? lastParams.horizontalGap : 0.3) * scaleFactor,
  };
  const canvas = renderToCanvas(
    lastResult.charGrid,
    lastResult.brightness,
    lastResult.colourData,
    exportOpts,
    lastResult.opacities || null,
  );

  if (lastParams.crtScanlines || lastParams.chromaticAberration || lastParams.crtCurve) {
    applyCRTPostProcessing(canvas, lastParams);
  }
  return canvas;
}

/* ── Text-format exports (SVG / HTML / TXT) ── */

export async function exportHTML() {
  if (!lastParams) return null;
  if (!lastResult && currentImg) {
    lastResult = await runPipeline(currentImg, lastParams);
  }
  if (!lastResult) return null;
  return renderToHTML(lastResult.charGrid, lastResult.brightness, lastResult.colourData, {
    rows: lastResult.rows, cols: lastResult.cols, ...lastParams,
  }, lastResult.opacities || null);
}

export async function exportSVG() {
  if (!lastParams) return null;
  if (!lastResult && currentImg) {
    lastResult = await runPipeline(currentImg, lastParams);
  }
  if (!lastResult) return null;
  return renderToSVG(lastResult.charGrid, lastResult.brightness, lastResult.colourData, {
    rows: lastResult.rows, cols: lastResult.cols, ...lastParams,
  }, lastResult.opacities || null);
}

export async function exportTXT() {
  if (!lastParams) return null;
  if (!lastResult && currentImg) {
    lastResult = await runPipeline(currentImg, lastParams);
  }
  if (!lastResult) return null;
  return renderToTxt(lastResult.charGrid);
}

/* ── Raster exports (PNG / PDF from canvas — true WYSIWYG) ── */

export async function exportPNG() {
  const canvas = await _getExportCanvas(3);
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
  const canvas = await _getExportCanvas(3);
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function triggerDownloadText(text, filename, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  triggerDownload(blob, filename);
}
