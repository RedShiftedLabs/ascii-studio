// Grainrad-inspired Visual Effects Engine
// Dithering, Halftone, Matrix Rain, Wave Lines, Pixel Sort, Contour, Crosshatch, Blockify, Threshold, CRT/VHS

import { findNearestColor, getParsedPalette } from './palettes.js';

// Bayer 8x8 matrix normalized 0..63
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

// Helper: draw source image to internal canvas with brightness/contrast/gamma
export function prepareSourceCanvas(img, targetW, targetH, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const brightness = (opts.brightness || 0); // -100..100
  const contrast = (opts.contrast !== undefined ? opts.contrast : 1.0); // 0.5..3.0
  const gamma = (opts.gamma !== undefined ? opts.gamma : 1.0);

  // If img is already an ImageData or HTMLImageElement or Canvas or Video
  if (img.data && img.w && img.h) {
    const tmp = document.createElement('canvas');
    tmp.width = img.w;
    tmp.height = img.h;
    const tctx = tmp.getContext('2d');
    tctx.putImageData(img.data, 0, 0);
    ctx.drawImage(tmp, 0, 0, targetW, targetH);
  } else if (img.tagName === 'VIDEO' || img.tagName === 'IMG' || img.tagName === 'CANVAS') {
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const d = imgData.data;

  // Apply tone mapping in-place
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = d[i + c];
      if (brightness !== 0) v += brightness * 2.55;
      if (contrast !== 1.0) v = (v - 128) * contrast + 128;
      if (gamma !== 1.0) v = 255 * Math.pow(Math.max(0, Math.min(255, v)) / 255, gamma);
      d[i + c] = Math.max(0, Math.min(255, v));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { canvas, ctx, imgData };
}

/* ── 1. DITHERING (Bayer 8x8 / Atkinson / Floyd-Steinberg + Retro Palettes) ── */
export function renderDithering(img, opts = {}) {
  const scale = opts.scale || 3;
  const w = Math.max(40, Math.round((opts.outputWidth || 480) / scale));
  const aspect = (img.h && img.w) ? (img.h / img.w) : ((img.videoHeight && img.videoWidth) ? (img.videoHeight / img.videoWidth) : 0.75);
  const h = Math.max(30, Math.round(w * aspect));

  const { imgData } = prepareSourceCanvas(img, w, h, opts);
  const src = imgData.data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w * scale;
  outCanvas.height = h * scale;
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;

  const palRgb = getParsedPalette(opts.palette || 'gameboy');
  const method = opts.ditherMethod || 'bayer8x8'; // 'bayer8x8', 'floyd', 'atkinson'
  const isMono = opts.colorMode === 'mono';

  // Float working buffer
  const work = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    if (isMono) {
      const luma = 0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];
      work[i * 3 + 0] = luma;
      work[i * 3 + 1] = luma;
      work[i * 3 + 2] = luma;
    } else {
      work[i * 3 + 0] = src[i * 4];
      work[i * 3 + 1] = src[i * 4 + 1];
      work[i * 3 + 2] = src[i * 4 + 2];
    }
  }

  const resultData = new Uint8ClampedArray(w * h * 4);

  if (method === 'bayer8x8') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const bShift = (BAYER_8X8[y % 8][x % 8] / 64 - 0.5) * 56;
        const r = Math.max(0, Math.min(255, work[i * 3 + 0] + bShift));
        const g = Math.max(0, Math.min(255, work[i * 3 + 1] + bShift));
        const b = Math.max(0, Math.min(255, work[i * 3 + 2] + bShift));

        const nearest = findNearestColor(r, g, b, palRgb);
        resultData[i * 4 + 0] = nearest[0];
        resultData[i * 4 + 1] = nearest[1];
        resultData[i * 4 + 2] = nearest[2];
        resultData[i * 4 + 3] = 255;
      }
    }
  } else if (method === 'atkinson') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const oldR = work[i * 3 + 0];
        const oldG = work[i * 3 + 1];
        const oldB = work[i * 3 + 2];

        const nearest = findNearestColor(oldR, oldG, oldB, palRgb);
        resultData[i * 4 + 0] = nearest[0];
        resultData[i * 4 + 1] = nearest[1];
        resultData[i * 4 + 2] = nearest[2];
        resultData[i * 4 + 3] = 255;

        const errR = (oldR - nearest[0]) / 8;
        const errG = (oldG - nearest[1]) / 8;
        const errB = (oldB - nearest[2]) / 8;

        const distribute = (dx, dy) => {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const ni = (ny * w + nx) * 3;
            work[ni + 0] += errR;
            work[ni + 1] += errG;
            work[ni + 2] += errB;
          }
        };

        distribute(1, 0); distribute(2, 0);
        distribute(-1, 1); distribute(0, 1); distribute(1, 1);
        distribute(0, 2);
      }
    }
  } else {
    // Floyd-Steinberg
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const oldR = work[i * 3 + 0];
        const oldG = work[i * 3 + 1];
        const oldB = work[i * 3 + 2];

        const nearest = findNearestColor(oldR, oldG, oldB, palRgb);
        resultData[i * 4 + 0] = nearest[0];
        resultData[i * 4 + 1] = nearest[1];
        resultData[i * 4 + 2] = nearest[2];
        resultData[i * 4 + 3] = 255;

        const errR = oldR - nearest[0];
        const errG = oldG - nearest[1];
        const errB = oldB - nearest[2];

        const addErr = (dx, dy, factor) => {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const ni = (ny * w + nx) * 3;
            work[ni + 0] += errR * factor;
            work[ni + 1] += errG * factor;
            work[ni + 2] += errB * factor;
          }
        };

        addErr(1, 0, 7 / 16);
        addErr(-1, 1, 3 / 16);
        addErr(0, 1, 5 / 16);
        addErr(1, 1, 1 / 16);
      }
    }
  }

  // Draw scaled pixel art
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = w;
  smallCanvas.height = h;
  const sctx = smallCanvas.getContext('2d');
  sctx.putImageData(new ImageData(resultData, w, h), 0, 0);

  outCtx.drawImage(smallCanvas, 0, 0, w * scale, h * scale);
  return outCanvas;
}

/* ── 2. HALFTONE (Screenprinted CMYK or Monochrome dots) ── */
export function renderHalftone(img, opts = {}) {
  const targetW = opts.outputWidth || 720;
  const aspect = (img.h && img.w) ? (img.h / img.w) : 0.75;
  const targetH = Math.round(targetW * aspect);

  const { ctx: srcCtx } = prepareSourceCanvas(img, targetW, targetH, opts);
  const src = srcCtx.getImageData(0, 0, targetW, targetH).data;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const bgColor = opts.bgColor || '#0a0a08';
  const fgColor = opts.fgColor || '#ffffff';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, targetW, targetH);

  const spacing = Math.max(4, opts.spacing || 8);
  const dotScale = opts.dotScale || 1.1;
  const angleRad = ((opts.angle !== undefined ? opts.angle : 45) * Math.PI) / 180;
  const isColor = opts.colorMode === 'color';

  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  for (let y = spacing / 2; y < targetH; y += spacing) {
    for (let x = spacing / 2; x < targetW; x += spacing) {
      const idx = (Math.floor(y) * targetW + Math.floor(x)) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const radius = (spacing / 2) * (1 - luma) * dotScale;

      if (radius > 0.5) {
        ctx.fillStyle = isColor ? `rgb(${r},${g},${b})` : fgColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return canvas;
}

/* ── 3. WAVE LINES (Joy Division Unknown Pleasures Pulsar Waves) ── */
export function renderWaveLines(img, opts = {}) {
  const targetW = opts.outputWidth || 720;
  const aspect = (img.h && img.w) ? (img.h / img.w) : 0.75;
  const targetH = Math.round(targetW * aspect);

  const { ctx: srcCtx } = prepareSourceCanvas(img, targetW, targetH, opts);
  const src = srcCtx.getImageData(0, 0, targetW, targetH).data;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const bgColor = opts.bgColor || '#050505';
  const fgColor = opts.fgColor || '#ffffff';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, targetW, targetH);

  const lineCount = Math.max(15, opts.lineCount || 55);
  const lineSpacing = targetH / lineCount;
  const amplitude = opts.amplitude !== undefined ? opts.amplitude : 28;
  const lineThickness = opts.lineThickness || 1.4;
  const isColor = opts.colorMode === 'color';
  const time = opts.time || 0;

  ctx.lineWidth = lineThickness;

  for (let l = 2; l < lineCount - 1; l++) {
    const baseY = l * lineSpacing;
    ctx.beginPath();
    let first = true;

    for (let x = 0; x < targetW; x += 3) {
      const idx = (Math.floor(baseY) * targetW + Math.floor(x)) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const wave = Math.sin(x * 0.04 + time) * 3;
      const y = baseY - luma * amplitude + wave * (luma * 0.5);

      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = isColor ? '#00ffaa' : fgColor;
    ctx.stroke();
  }

  return canvas;
}

/* ── 4. PIXEL SORT (Glitch Art Luminance Sorting Streaks) ── */
export function renderPixelSort(img, opts = {}) {
  const targetW = opts.outputWidth || 640;
  const aspect = (img.h && img.w) ? (img.h / img.w) : 0.75;
  const targetH = Math.round(targetW * aspect);

  const { ctx: srcCtx } = prepareSourceCanvas(img, targetW, targetH, opts);
  const imgData = srcCtx.getImageData(0, 0, targetW, targetH);
  const d = imgData.data;

  const threshold = (opts.threshold !== undefined ? opts.threshold : 0.35) * 255;
  const direction = opts.direction || 'horizontal'; // 'horizontal' or 'vertical'

  const getLuma = (idx) => 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];

  if (direction === 'horizontal') {
    for (let y = 0; y < targetH; y++) {
      let x = 0;
      while (x < targetW) {
        const idx = (y * targetW + x) * 4;
        if (getLuma(idx) > threshold) {
          let spanEnd = x;
          while (spanEnd < targetW && getLuma((y * targetW + spanEnd) * 4) > threshold && (spanEnd - x) < 140) {
            spanEnd++;
          }
          if (spanEnd > x + 1) {
            // Sort pixels in this span by luminance
            const span = [];
            for (let px = x; px < spanEnd; px++) {
              const pi = (y * targetW + px) * 4;
              span.push({ r: d[pi], g: d[pi + 1], b: d[pi + 2], a: d[pi + 3], luma: getLuma(pi) });
            }
            span.sort((a, b) => a.luma - b.luma);
            for (let px = x; px < spanEnd; px++) {
              const pi = (y * targetW + px) * 4;
              const sp = span[px - x];
              d[pi] = sp.r; d[pi + 1] = sp.g; d[pi + 2] = sp.b; d[pi + 3] = sp.a;
            }
          }
          x = spanEnd;
        } else {
          x++;
        }
      }
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/* ── 5. CONTOUR (Topographic Isoline Elevation Map) ── */
export function renderContour(img, opts = {}) {
  const targetW = opts.outputWidth || 720;
  const aspect = (img.h && img.w) ? (img.h / img.w) : 0.75;
  const targetH = Math.round(targetW * aspect);

  const { ctx: srcCtx } = prepareSourceCanvas(img, targetW, targetH, opts);
  const src = srcCtx.getImageData(0, 0, targetW, targetH).data;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const bgColor = opts.bgColor || '#0a0a10';
  const lineColor = opts.lineColor || '#00ffc8';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, targetW, targetH);

  const outData = ctx.getImageData(0, 0, targetW, targetH);
  const out = outData.data;

  const levels = Math.max(3, opts.levels || 10);
  const [lr, lg, lb] = [
    parseInt(lineColor.slice(1, 3), 16) || 0,
    parseInt(lineColor.slice(3, 5), 16) || 255,
    parseInt(lineColor.slice(5, 7), 16) || 200
  ];

  const getLuma = (x, y) => {
    const i = (y * targetW + x) * 4;
    return (0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]) / 255;
  };

  for (let y = 1; y < targetH - 1; y++) {
    for (let x = 1; x < targetW - 1; x++) {
      const cLuma = Math.floor(getLuma(x, y) * levels);
      const rLuma = Math.floor(getLuma(x + 1, y) * levels);
      const bLuma = Math.floor(getLuma(x, y + 1) * levels);

      if (cLuma !== rLuma || cLuma !== bLuma) {
        const oi = (y * targetW + x) * 4;
        out[oi] = lr;
        out[oi + 1] = lg;
        out[oi + 2] = lb;
        out[oi + 3] = 255;
      }
    }
  }

  ctx.putImageData(outData, 0, 0);
  return canvas;
}

/* ── 6. CROSSHATCH (Fine Pen & Ink Technical Engraving) ── */
export function renderCrosshatch(img, opts = {}) {
  const targetW = opts.outputWidth || 720;
  const aspect = (img.h && img.w) ? (img.h / img.w) : 0.75;
  const targetH = Math.round(targetW * aspect);

  const { ctx: srcCtx } = prepareSourceCanvas(img, targetW, targetH, opts);
  const src = srcCtx.getImageData(0, 0, targetW, targetH).data;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const bgColor = opts.bgColor || '#f4eee0'; // Cream paper
  const inkColor = opts.inkColor || '#181614'; // Archival black ink
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, targetW, targetH);

  const density = opts.density || 7;
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 0.9;

  for (let y = 0; y < targetH; y += density) {
    for (let x = 0; x < targetW; x += density) {
      const i = (y * targetW + x) * 4;
      const luma = (0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]) / 255;
      const darkness = 1 - luma;

      // Tier 1: 45° diagonal hatch
      if (darkness > 0.25) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + density, y + density);
        ctx.stroke();
      }
      // Tier 2: 135° cross hatch
      if (darkness > 0.50) {
        ctx.beginPath();
        ctx.moveTo(x + density, y);
        ctx.lineTo(x, y + density);
        ctx.stroke();
      }
      // Tier 3: Horizontal hatch
      if (darkness > 0.70) {
        ctx.beginPath();
        ctx.moveTo(x, y + density / 2);
        ctx.lineTo(x + density, y + density / 2);
        ctx.stroke();
      }
      // Tier 4: Vertical hatch for deep shadows
      if (darkness > 0.88) {
        ctx.beginPath();
        ctx.moveTo(x + density / 2, y);
        ctx.lineTo(x + density / 2, y + density);
        ctx.stroke();
      }
    }
  }

  return canvas;
}

/* ── 7. MATRIX RAIN (Cascading Katakana + Alphanumerics) ── */
const MATRIX_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF$#@*';

export function renderMatrixRain(img, opts = {}) {
  const targetW = opts.outputWidth || 720;
  const aspect = (img.h && img.w) ? (img.h / img.w) : 0.75;
  const targetH = Math.round(targetW * aspect);

  const { ctx: srcCtx } = prepareSourceCanvas(img, targetW, targetH, opts);
  const src = srcCtx.getImageData(0, 0, targetW, targetH).data;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.bgColor || '#020702';
  ctx.fillRect(0, 0, targetW, targetH);

  const cellSize = opts.cellSize || 11;
  const cols = Math.floor(targetW / cellSize);
  const rows = Math.floor(targetH / cellSize);
  const time = opts.time || 0;

  ctx.font = `bold ${cellSize - 2}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rainColor = opts.rainColor || '#00ff41';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = Math.min(targetW - 1, Math.floor((c + 0.5) * cellSize));
      const py = Math.min(targetH - 1, Math.floor((r + 0.5) * cellSize));
      const idx = (py * targetW + px) * 4;

      const red = src[idx];
      const green = src[idx + 1];
      const blue = src[idx + 2];
      const luma = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

      if (luma < 0.05) continue;

      // Matrix stream drop calculation
      const streamOffset = (c * 7 + Math.floor(time * 8)) % (rows + 15);
      const isLead = (r === streamOffset);
      const isTrail = (r < streamOffset && r > streamOffset - 12);

      const ch = MATRIX_CHARS[(c * 17 + r * 31 + Math.floor(time * 3)) % MATRIX_CHARS.length];

      if (isLead) {
        ctx.fillStyle = '#ffffff'; // White glowing tip of falling rain
      } else if (opts.colorMode === 'original') {
        ctx.fillStyle = `rgba(${red},${green},${blue},${Math.min(1, luma * 1.2)})`;
      } else {
        const alpha = Math.min(1, Math.max(0.15, luma));
        ctx.fillStyle = rainColor === '#00ff41' ? `rgba(0, 255, 65, ${alpha})` : rainColor;
      }

      ctx.fillText(ch, (c + 0.5) * cellSize, (r + 0.5) * cellSize);
    }
  }

  return canvas;
}

/* ── 8. BLOCKIFY (8-bit Chunky Lo-Fi Pixel Mosaic) ── */
export function renderBlockify(img, opts = {}) {
  const targetW = opts.outputWidth || 640;
  const aspect = (img.h && img.w) ? (img.h / img.w) : 0.75;
  const targetH = Math.round(targetW * aspect);

  const blockSize = Math.max(4, opts.blockSize || 10);
  const cols = Math.floor(targetW / blockSize);
  const rows = Math.floor(targetH / blockSize);

  const { ctx: srcCtx } = prepareSourceCanvas(img, cols, rows, opts);
  const smallData = srcCtx.getImageData(0, 0, cols, rows).data;

  const canvas = document.createElement('canvas');
  canvas.width = cols * blockSize;
  canvas.height = rows * blockSize;
  const ctx = canvas.getContext('2d');

  const showGrid = opts.showGrid !== undefined ? opts.showGrid : true;
  const palRgb = opts.palette ? getParsedPalette(opts.palette) : null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 4;
      let red = smallData[idx];
      let green = smallData[idx + 1];
      let blue = smallData[idx + 2];

      if (palRgb) {
        const nearest = findNearestColor(red, green, blue, palRgb);
        red = nearest[0]; green = nearest[1]; blue = nearest[2];
      }

      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);

      if (showGrid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * blockSize, r * blockSize, blockSize, blockSize);
      }
    }
  }

  return canvas;
}

/* ── 9. POST-PROCESSING: CRT / VHS SCANLINES & CHROMATIC ABERRATION ── */
export function applyCRTPostProcessing(canvas, opts = {}) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');

  // Chromatic Aberration
  if (opts.chromaticAberration) {
    const shift = Math.max(1, Math.round(opts.chromaticShift || 3));
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const copy = new Uint8ClampedArray(d);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const leftX = Math.max(0, x - shift);
        const rightX = Math.min(w - 1, x + shift);
        const leftI = (y * w + leftX) * 4;
        const rightI = (y * w + rightX) * 4;

        d[i] = copy[leftI]; // Red from left
        // Green stays at center
        d[i + 2] = copy[rightI + 2]; // Blue from right
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Scanlines Overlay
  if (opts.scanlines) {
    const scanOpacity = opts.scanlineOpacity || 0.18;
    ctx.fillStyle = `rgba(0, 0, 0, ${scanOpacity})`;
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  // CRT Curvature & Vignette
  if (opts.crtCurve) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  return canvas;
}
