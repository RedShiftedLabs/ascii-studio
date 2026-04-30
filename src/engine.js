export const RAW_CHARSETS = {
  full: ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  minimal: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  dots: ' ·∘○◉●',
  hatching: ' ─━═╬+#@',
  geometric: ' ▪▫◆◇■□▲△●',
  braille: ' ⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿',
  lineart: ' .,:;i|/\\()[]{}tfjl!-_+=xXYZO0#%@',
  edges: ' .-+|/\\xX#@',
  binary: ' 01',
  numbers: ' 1732456908',
};

export const THEMES = {
  noir: { bg: '#0a0a0a', fg: '#c8c8c8', colour: false, label: 'Classic Noir' },
  amber: { bg: '#0f0900', fg: '#ffb347', colour: false, label: 'Amber Terminal' },
  matrix: { bg: '#000300', fg: '#00ff41', colour: false, label: 'Matrix Green' },
  ice: { bg: '#020810', fg: '#a8d8f0', colour: false, label: 'Ice Blue CRT' },
  sepia: { bg: '#1a1209', fg: '#c8a97a', colour: false, label: 'Vintage Sepia' },
  rose: { bg: '#0d0508', fg: '#e8a0b4', colour: false, label: 'Rose Terminal' },
  colour: { bg: '#0a0a0a', fg: '#ffffff', colour: true, label: 'Full Colour' },
  colour_amber: { bg: '#0f0900', fg: '#ffb347', colour: true, label: 'Colour Warm' },
};

const _densityCache = new Map();

export function measureCharDensity(chars, size = 16) {
  const key = chars + '_' + size;
  if (_densityCache.has(key)) return _densityCache.get(key);

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.font = `${size}px monospace`;

  const densities = {};
  for (const ch of chars) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#fff';
    ctx.fillText(ch, 1, size - 2);
    const data = ctx.getImageData(0, 0, size, size).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += data[i]; // R channel
    densities[ch] = 1 - sum / (size * size * 255);
  }

  const sorted = [...chars].sort((a, b) => densities[a] - densities[b]).join('');
  _densityCache.set(key, sorted);
  return sorted;
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function imageToRGBA(img, maxDim = 1200) {
  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > maxDim) {
    const s = maxDim / Math.max(w, h);
    w = Math.round(w * s); h = Math.round(h * s);
  }
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h), w, h };
}

export function computeBrightness(rgba, w, h) {
  // BT.709 luma
  const out = new Float32Array(w * h);
  const d = rgba.data;
  for (let i = 0; i < w * h; i++) {
    out[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  }
  return out;
}

export function resizeGray(src, srcW, srcH, dstW, dstH) {
  const canvas = new OffscreenCanvas(srcW, srcH);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(srcW, srcH);
  for (let i = 0; i < srcW * srcH; i++) {
    const v = Math.round(src[i]);
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const dst = new OffscreenCanvas(dstW, dstH);
  const dctx = dst.getContext('2d');
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';
  dctx.drawImage(canvas, 0, 0, dstW, dstH);
  const out = dctx.getImageData(0, 0, dstW, dstH).data;
  const result = new Float32Array(dstW * dstH);
  for (let i = 0; i < dstW * dstH; i++) result[i] = out[i * 4];
  return result;
}

export function resizeForAscii(brightness, srcW, srcH, cols, charAspect = 0.45) {
  const rows = Math.max(1, Math.round(cols * (srcH / srcW) * charAspect));
  return { small: resizeGray(brightness, srcW, srcH, cols, rows), rows, cols };
}

export function resizeColour(rgba, srcW, srcH, cols, charAspect = 0.45) {
  const rows = Math.max(1, Math.round(cols * (srcH / srcW) * charAspect));
  const canvas = new OffscreenCanvas(srcW, srcH);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(rgba, 0, 0);
  const dst = new OffscreenCanvas(cols, rows);
  const dctx = dst.getContext('2d');
  dctx.imageSmoothingEnabled = true;
  dctx.drawImage(canvas, 0, 0, cols, rows);
  return { data: dctx.getImageData(0, 0, cols, rows), rows, cols };
}

// ── Histogram equalization ─────────────────────────────────
export function equalizeHistogram(b) {
  const out = new Float32Array(b.length);
  const hist = new Int32Array(256);
  for (let i = 0; i < b.length; i++) hist[Math.min(255, Math.max(0, b[i] | 0))]++;
  const cdf = new Int32Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];
  const cdfMin = cdf.find(v => v > 0);
  const n = b.length;
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) lut[i] = Math.round((cdf[i] - cdfMin) / Math.max(n - cdfMin, 1) * 255);
  for (let i = 0; i < b.length; i++) out[i] = lut[Math.min(255, Math.max(0, b[i] | 0))];
  return out;
}

// ── Gamma ──────────────────────────────────────────────────
export function applyGamma(b, gamma) {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = Math.pow(Math.max(0, Math.min(1, b[i] / 255)), gamma) * 255;
  return out;
}

// ── Contrast ───────────────────────────────────────────────
export function applyContrast(b, factor) {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = Math.max(0, Math.min(255, factor * (b[i] - 128) + 128));
  return out;
}

// ── Vignette ───────────────────────────────────────────────
export function applyVignette(b, w, h, strength) {
  if (strength === 0) return b;
  const out = new Float32Array(b.length);
  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2 - 1;
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2 - 1;
      const mask = 1 - strength * Math.min(1, nx * nx + ny * ny);
      out[y * w + x] = Math.max(0, Math.min(255, b[y * w + x] * mask));
    }
  }
  return out;
}

export function applyFilmGrain(b, amount) {
  if (amount === 0) return b;
  const out = new Float32Array(b.length);
  let seed = 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  for (let i = 0; i < b.length; i++) {
    const noise = (rng() - 0.5) * 2 * amount * 18;
    out[i] = Math.max(0, Math.min(255, b[i] + noise));
  }
  return out;
}

export function sobel(b, w, h) {
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      gx[i] = (
        -b[(y - 1) * w + (x - 1)] + b[(y - 1) * w + (x + 1)]
        - 2 * b[y * w + (x - 1)] + 2 * b[y * w + (x + 1)]
        - b[(y + 1) * w + (x - 1)] + b[(y + 1) * w + (x + 1)]
      );
      gy[i] = (
        -b[(y - 1) * w + (x - 1)] - 2 * b[(y - 1) * w + x] - b[(y - 1) * w + (x + 1)]
        + b[(y + 1) * w + (x - 1)] + 2 * b[(y + 1) * w + x] + b[(y + 1) * w + (x + 1)]
      );
    }
  }
  return { gx, gy };
}

export function edgeBiasedBrightness(b, w, h, edgeWeight) {
  if (edgeWeight === 0) return b;
  const { gx, gy } = sobel(b, w, h);
  let maxMag = 0;
  const mag = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    if (mag[i] > maxMag) maxMag = mag[i];
  }
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const edgeMag = maxMag > 0 ? (mag[i] / maxMag) * 255 : 0;
    out[i] = Math.max(0, Math.min(255, (1 - edgeWeight) * (255 - b[i]) + edgeWeight * edgeMag));
  }
  return out;
}

export function floydSteinberg(b, w, h, nLevels) {
  const img = new Float64Array(b);
  const step = 255 / Math.max(nLevels - 1, 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = img[i];
      const newVal = Math.round(old / step) * step;
      const err = old - newVal;
      img[i] = newVal;
      if (x + 1 < w) img[y * w + (x + 1)] += err * 7 / 16;
      if (y + 1 < h) {
        if (x - 1 >= 0) img[(y + 1) * w + (x - 1)] += err * 3 / 16;
        img[(y + 1) * w + x] += err * 5 / 16;
        if (x + 1 < w) img[(y + 1) * w + (x + 1)] += err * 1 / 16;
      }
    }
  }
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.max(0, Math.min(255, img[i]));
  return out;
}

export function sharpenImage(rgba, w, h, strength) {
  if (strength === 0) return rgba;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(rgba, 0, 0);
  const blurred = new OffscreenCanvas(w, h);
  const bctx = blurred.getContext('2d');
  bctx.filter = `blur(${Math.round(strength * 2)}px)`;
  bctx.drawImage(canvas, 0, 0);
  const orig = rgba.data;
  const blur = bctx.getImageData(0, 0, w, h).data;
  const result = new ImageData(w, h);
  const s = strength * 2;
  for (let i = 0; i < orig.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      result.data[i + c] = Math.max(0, Math.min(255, orig[i + c] + s * (orig[i + c] - blur[i + c])));
    }
    result.data[i + 3] = orig[i + 3];
  }
  return result;
}

export function brightnessToChars(brightness, w, h, chars, invert = false) {
  const n = chars.length - 1;
  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      let norm = brightness[y * w + x] / 255;
      if (invert) norm = 1 - norm;
      const idx = Math.max(0, Math.min(n, Math.round(norm * n)));
      row.push(chars[idx]);
    }
    grid.push(row);
  }
  return grid;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function applyMultiscaleEnhancement(bright, w, h, boost) {
  if (boost <= 0) return { base: bright, d0: new Float32Array(w * h), d1: new Float32Array(w * h), d2: new Float32Array(w * h) };

  const gaussianBlur = (src, sigma) => {
    const radius = Math.max(1, Math.round(sigma * 2));
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(w - 1, Math.max(0, x + dx));
          sum += src[y * w + nx]; count++;
        }
        tmp[y * w + x] = sum / count;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = Math.min(h - 1, Math.max(0, y + dy));
          sum += tmp[ny * w + x]; count++;
        }
        out[y * w + x] = sum / count;
      }
    }
    return out;
  };

  const g1 = gaussianBlur(bright, 1.0);
  const g2 = gaussianBlur(bright, 2.0);
  const g3 = gaussianBlur(bright, 4.0);
  const d0 = new Float32Array(w * h);
  const d1 = new Float32Array(w * h);
  const d2 = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    d0[i] = bright[i] - g1[i];
    d1[i] = g1[i] - g2[i];
    d2[i] = g2[i] - g3[i];
  }

  const std = (arr) => {
    let mean = 0;
    for (let i = 0; i < arr.length; i++) mean += arr[i];
    mean /= arr.length;
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += (arr[i] - mean) ** 2;
    return Math.sqrt(s / arr.length) + 1e-6;
  };

  const s0 = std(d0), s1 = std(d1), s2 = std(d2);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    out[i] = g3[i] + d2[i] * (1 + boost * 0.5) + d1[i] * (1 + boost) + d0[i] * (1 + boost * 1.5);
  }

  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < out.length; i++) { if (out[i] < mn) mn = out[i]; if (out[i] > mx) mx = out[i]; }
  const range = mx - mn + 1e-8;
  for (let i = 0; i < out.length; i++) out[i] = ((out[i] - mn) / range) * 255;

  return { base: out, d0, d1, d2 };
}

export function computeSaliency(bright, cols, rows) {
  const sal = new Float32Array(cols * rows);
  const cellArea = Math.max(1, bright.length / (cols * rows));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = bright[y * cols + x] / 255;
      const gy = (y / (rows - 1)) * 2 - 1;
      const gx = (x / (cols - 1)) * 2 - 1;
      const centre = Math.exp(-(gx * gx + gy * gy) * 1.5);
      sal[y * cols + x] = Math.min(1, 0.65 * v + 0.35 * centre);
    }
  }
  return sal;
}

export function applySaliencyToBrightness(bright, sal, w, h, boost) {
  const out = new Float32Array(w * h);
  let mean = 0;
  for (let i = 0; i < w * h; i++) mean += bright[i];
  mean /= (w * h);
  for (let i = 0; i < w * h; i++) {
    const scale = 1 + boost * (sal[i] - 0.5) * 2;
    out[i] = Math.max(0, Math.min(255, mean + (bright[i] - mean) * scale));
  }
  return out;
}

const _glyphAtlasCache = new Map();

function _buildGlyphAtlas(chars, fontSize = 13) {
  const key = chars + '_' + fontSize;
  if (_glyphAtlasCache.has(key)) return _glyphAtlasCache.get(key);

  const canvas = new OffscreenCanvas(fontSize * 2, fontSize * 2);
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px monospace`;
  const m = ctx.measureText('M');
  const cw = Math.max(1, Math.ceil(m.width));
  const ch = Math.max(1, Math.ceil(fontSize * 1.15));

  const atlas = [];
  for (let i = 0; i < chars.length; i++) {
    const c = new OffscreenCanvas(cw, ch);
    const cx = c.getContext('2d');
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, cw, ch);
    cx.fillStyle = '#fff';
    cx.font = `${fontSize}px monospace`;
    cx.textBaseline = 'top';
    cx.fillText(chars[i], 0, 0);
    const data = cx.getImageData(0, 0, cw, ch).data;
    const f32 = new Float32Array(cw * ch);
    for (let j = 0; j < cw * ch; j++) f32[j] = data[j * 4] / 255.0;
    atlas.push(f32);
  }

  const result = { atlas, cw, ch };
  _glyphAtlasCache.set(key, result);
  return result;
}

export function glyphMatchChars(imgArray, srcW, srcH, chars, cols, charAspect = 0.45, fontSize = 13, invert = false) {
  const { atlas, cw, ch } = _buildGlyphAtlas(chars, fontSize);
  const rows = Math.max(1, Math.round(cols * (srcH / srcW) * charAspect));

  const bright = computeBrightness(imgArray, srcW, srcH);
  const grayResized = resizeGray(bright, srcW, srcH, cols * cw, rows * ch);

  const charGrid = [];
  const P = cw * ch;

  const G2 = new Float32Array(chars.length);
  for (let i = 0; i < chars.length; i++) {
    let sum = 0;
    for (let p = 0; p < P; p++) sum += atlas[i][p] * atlas[i][p];
    G2[i] = sum;
  }

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const patch = new Float32Array(P);
      let py = y * ch, px = x * cw;
      let X2 = 0;
      for (let cy = 0; cy < ch; cy++) {
        for (let cx = 0; cx < cw; cx++) {
          let v = grayResized[(py + cy) * (cols * cw) + (px + cx)] / 255.0;
          if (invert) v = 1.0 - v;
          patch[cy * cw + cx] = v;
          X2 += v * v;
        }
      }

      let bestSSD = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < chars.length; i++) {
        let XG = 0;
        const G = atlas[i];
        for (let p = 0; p < P; p++) XG += patch[p] * G[p];
        const ssd = X2 - 2 * XG + G2[i];
        if (ssd < bestSSD) { bestSSD = ssd; bestIdx = i; }
      }
      row.push(chars[bestIdx]);
    }
    charGrid.push(row);
  }
  return charGrid;
}

const _FAM_H = '-_=~─━';
const _FAM_V = '|Il!1';
const _FAM_D1 = '/';
const _FAM_D2 = '\\';
const _FAM_ISO = '@#%&WMm*8B';
const _FAM_FLAT = ' .·`';

function _cellStructureTensor(imgArray, srcW, srcH, rows, cols) {
  const cellH = Math.max(4, Math.floor(srcH / rows));
  const cellW = Math.max(4, Math.floor(srcW / cols));
  const targetH = rows * cellH;
  const targetW = cols * cellW;

  const bright = computeBrightness(imgArray, srcW, srcH);
  const grayHi = resizeGray(bright, srcW, srcH, targetW, targetH);

  for (let i = 0; i < grayHi.length; i++) grayHi[i] /= 255.0;

  const { gx: Ix, gy: Iy } = sobel(grayHi, targetW, targetH);

  const coh = new Float32Array(rows * cols);
  const ori = new Float32Array(rows * cols);
  const eng = new Float32Array(rows * cols);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let Sx = 0, Sy = 0, Sxy = 0;
      let py = r * cellH, px = c * cellW;
      for (let cy = 0; cy < cellH; cy++) {
        for (let cx = 0; cx < cellW; cx++) {
          const idx = (py + cy) * targetW + (px + cx);
          const ix = Ix[idx], iy = Iy[idx];
          Sx += ix * ix; Sy += iy * iy; Sxy += ix * iy;
        }
      }
      const trace = Sx + Sy;
      const det = Sx * Sy - Sxy * Sxy;
      const disc = Math.sqrt(Math.max(0, (trace * 0.5) * (trace * 0.5) - det));
      const lam1 = trace * 0.5 + disc;
      const lam2 = trace * 0.5 - disc;

      const idx = r * cols + c;
      coh[idx] = (lam1 - lam2) / (lam1 + lam2 + 1e-8);
      let angle = Math.atan2(2 * Sxy, Sx - Sy) * 0.5 * 180 / Math.PI;
      if (angle < 0) angle += 180;
      ori[idx] = angle;
      eng[idx] = lam1 + lam2;
    }
  }
  return { coh, ori, eng };
}

export function frequencyAwareChars(imgArray, srcW, srcH, chars, cols, rows, charAspect = 0.45, invert = false, cohThresh = 0.45, engThresh = 0.10) {
  const bright = computeBrightness(imgArray, srcW, srcH);
  let small = resizeGray(bright, srcW, srcH, cols, rows);
  const rawSmall = new Float32Array(small);
  small = equalizeHistogram(small);
  small = applyGamma(small, 0.8);

  const charGrid = brightnessToChars(small, cols, rows, chars, invert);
  const { coh, ori, eng } = _cellStructureTensor(imgArray, srcW, srcH, rows, cols);

  let mxEng = 0;
  for (let i = 0; i < eng.length; i++) if (eng[i] > mxEng) mxEng = eng[i];

  const dirChars = [_FAM_H[0], _FAM_D1[0], _FAM_V[0], _FAM_D2[0]];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const engN = eng[idx] / (mxEng + 1e-8);
      let luma = rawSmall[idx] / 255.0;
      if (invert) luma = 1.0 - luma;

      if (engN < engThresh) {
        const cIdx = Math.max(0, Math.min(_FAM_FLAT.length - 1, Math.round(luma * (_FAM_FLAT.length - 1))));
        charGrid[y][x] = _FAM_FLAT[cIdx];
      } else if (coh[idx] < cohThresh) {
        const cIdx = Math.max(0, Math.min(_FAM_ISO.length - 1, Math.round(luma * (_FAM_ISO.length - 1))));
        charGrid[y][x] = _FAM_ISO[cIdx];
      } else {
        const bin = Math.floor(ori[idx] / 45.0) % 4;
        charGrid[y][x] = dirChars[bin];
      }
    }
  }
  return charGrid;
}

export function glyphSpaceErrorDiffusion(imgArray, srcW, srcH, chars, cols, rows, charAspect = 0.45, fontSize = 13, invert = false) {
  const { atlas, cw, ch } = _buildGlyphAtlas(chars, fontSize);
  const bright = computeBrightness(imgArray, srcW, srcH);
  const grayResized = resizeGray(bright, srcW, srcH, cols * cw, rows * ch);

  const err = new Float32Array((rows * ch + ch) * (cols * cw + cw));
  const errW = cols * cw + cw;
  const P = cw * ch;

  const G2 = new Float32Array(chars.length);
  for (let i = 0; i < chars.length; i++) {
    let sum = 0;
    for (let p = 0; p < P; p++) sum += atlas[i][p] * atlas[i][p];
    G2[i] = sum;
  }

  const charGrid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      let py = y * ch, px = x * cw;
      const patch = new Float32Array(P);
      let X2 = 0;

      for (let cy = 0; cy < ch; cy++) {
        for (let cx = 0; cx < cw; cx++) {
          let v = grayResized[(py + cy) * (cols * cw) + (px + cx)] / 255.0;
          if (invert) v = 1.0 - v;
          v += err[(py + cy) * errW + (px + cx)];
          if (v < 0) v = 0; if (v > 1) v = 1;
          patch[cy * cw + cx] = v;
          X2 += v * v;
        }
      }

      let bestSSD = Infinity, bestIdx = 0;
      for (let i = 0; i < chars.length; i++) {
        let XG = 0; const G = atlas[i];
        for (let p = 0; p < P; p++) XG += patch[p] * G[p];
        const ssd = X2 - 2 * XG + G2[i];
        if (ssd < bestSSD) { bestSSD = ssd; bestIdx = i; }
      }

      row.push(chars[bestIdx]);

      const bestG = atlas[bestIdx];
      for (let cy = 0; cy < ch; cy++) {
        for (let cx = 0; cx < cw; cx++) {
          const res = patch[cy * cw + cx] - bestG[cy * cw + cx];
          if (x + 1 < cols && cx === cw - 1) err[(py + cy) * errW + (px + cw)] += res * 7 / 16;
          if (y + 1 < rows && cy === ch - 1) {
            if (x > 0 && cx === 0) err[(py + ch) * errW + (px - 1)] += res * 3 / 16;
            err[(py + ch) * errW + (px + cx)] += res * 5 / 16;
            if (x + 1 < cols && cx === cw - 1) err[(py + ch) * errW + (px + cw)] += res * 1 / 16;
          }
        }
      }
    }
    charGrid.push(row);
  }
  return charGrid;
}

export function fusedV6Chars(bright, rawBright, msCtx, cols, rows, chars, invert = false) {
  const d0 = msCtx.d0, d1 = msCtx.d1, d2 = msCtx.d2;
  const n = chars.length - 1;
  const charGrid = [];

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const E_tex = Math.abs(d0[idx]);
      const E_edge = Math.abs(d1[idx]);
      const E_struct = Math.abs(d2[idx]);
      const E_sum = E_tex + E_edge + E_struct + 1e-8;
      const w_tex = E_tex / E_sum;
      const w_edge = E_edge / E_sum;
      const w_struct = E_struct / E_sum;

      let luma = bright[idx] / 255.0;
      if (invert) luma = 1.0 - luma;

      const idxBase = Math.round(luma * n);
      const texIdx = Math.max(0, Math.min(n, Math.round(idxBase + w_tex * 3)));
      const structIdx = Math.max(0, Math.min(n, Math.round(idxBase - w_struct * 2)));

      let finalIdx = Math.round(idxBase * (1 - w_edge) + texIdx * w_tex + structIdx * w_struct);
      finalIdx = Math.max(0, Math.min(n, finalIdx));

      row.push(chars[finalIdx]);
    }
    charGrid.push(row);
  }
  return charGrid;
}

export function renderToHTML(charGrid, brightness, colourData, opts) {
  const { rows, cols, fgHex, bgHex, fontSize, attenuation, colourMode, outputFont } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const lines = [];
  for (let y = 0; y < rows; y++) {
    const parts = [];
    for (let x = 0; x < cols; x++) {
      const ch = charGrid[y][x];
      const luma = brightness[y * cols + x] / 255;
      let pr, pg, pb;
      if (colourMode && colourData) {
        const ci = (y * cols + x) * 4;
        pr = colourData.data[ci]; pg = colourData.data[ci + 1]; pb = colourData.data[ci + 2];
      } else {
        pr = Math.round(fr * luma + br * (1 - luma));
        pg = Math.round(fg * luma + bg * (1 - luma));
        pb = Math.round(fb * luma + bb * (1 - luma));
      }
      const alpha = attenuation > 0 ? Math.max(0.08, Math.min(1, luma * attenuation + (1 - attenuation))) : 1;
      const esc = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
      parts.push(`<span style="color:rgba(${pr},${pg},${pb},${alpha.toFixed(2)})">${esc}</span>`);
    }
    lines.push(parts.join(''));
  }

  return `<div style="background:${bgHex};padding:16px;border-radius:10px;overflow:auto;border:1px solid #222;">` +
    `<pre style="font-family:${outputFont};font-size:${fontSize}px;line-height:1.15;margin:0;letter-spacing:0.3px;">${lines.join('\n')}</pre></div>`;
}

export function renderToSVG(charGrid, brightness, colourData, opts) {
  const { rows, cols, fgHex, bgHex, fontSize, attenuation, colourMode, outputFont } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const cw = fontSize * 0.601 + 0.3;
  const ch = fontSize * 1.15;
  const svgW = cols * cw;
  const svgH = rows * ch;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW.toFixed(1)}" height="${svgH.toFixed(1)}" viewBox="0 0 ${svgW.toFixed(1)} ${svgH.toFixed(1)}">`,
    `<rect width="100%" height="100%" fill="${bgHex}"/>`,
    `<style>text{font-family:${outputFont};font-size:${fontSize}px;white-space:pre;letter-spacing:0.3px;}</style>`,
  ];

  for (let y = 0; y < rows; y++) {
    const ty = y * ch + fontSize * 0.85;
    const spans = [];
    for (let x = 0; x < cols; x++) {
      const ch_ = charGrid[y][x];
      const luma = brightness[y * cols + x] / 255;
      let pr, pg, pb;
      if (colourMode && colourData) {
        const ci = (y * cols + x) * 4;
        pr = colourData.data[ci]; pg = colourData.data[ci + 1]; pb = colourData.data[ci + 2];
      } else {
        pr = Math.round(fr * luma + br * (1 - luma));
        pg = Math.round(fg * luma + bg * (1 - luma));
        pb = Math.round(fb * luma + bb * (1 - luma));
      }
      const alpha = attenuation > 0 ? Math.max(0.08, Math.min(1, luma * attenuation + (1 - attenuation))) : 1;
      const esc = ch_ === '&' ? '&amp;' : ch_ === '<' ? '&lt;' : ch_ === '>' ? '&gt;' : ch_;
      spans.push(`<tspan fill="rgba(${pr},${pg},${pb},${alpha.toFixed(2)})">${esc}</tspan>`);
    }
    parts.push(`<text x="0" y="${ty.toFixed(1)}">${spans.join('')}</text>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}

export function renderToTxt(charGrid) {
  return charGrid.map(row => row.join('')).join('\n');
}

export async function renderToPNG(svgString) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => resolve(b), 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function renderToPDF(svgString) {
  if (!window.jspdf) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
  const { jsPDF } = window.jspdf;
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  canvas.getContext('2d').drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: img.width > img.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [img.width, img.height],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, img.width, img.height);
  return pdf.output('blob');
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

export function runPipeline(img, params) {
  const {
    cols, charset, contrast, gamma, edgeWeight, sharpen,
    vignette, grain, equalize, dither, invert, charAspect,
    colourMode, attenuation, fgHex, bgHex, fontSize, outputFont,
    multiscale, multiscaleBoost,
    saliencyAware, saliencyBoost,
    fusionV6, freqAware, glyphMatch, glyphErrDiff,
  } = params;

  const { data: rgba, w: srcW, h: srcH } = img;
  const sharpened = sharpenImage(rgba, srcW, srcH, sharpen);

  let bright = computeBrightness(sharpened, srcW, srcH);
  const { small: resized, rows, cols: gridCols } = resizeForAscii(bright, srcW, srcH, cols, charAspect);
  bright = resized;

  let msCtx = null;
  if (multiscale || fusionV6) {
    msCtx = applyMultiscaleEnhancement(bright, gridCols, rows, multiscaleBoost);
    if (!fusionV6 || multiscale) bright = msCtx.base; // Only apply base enhancement if explicitly multiscale
  }

  const colourResized = colourMode ? resizeColour(sharpened, srcW, srcH, gridCols, charAspect) : null;

  const rawBright = new Float32Array(bright);
  if (equalize) bright = equalizeHistogram(bright);
  bright = applyGamma(bright, gamma);
  bright = applyContrast(bright, contrast);
  bright = applyVignette(bright, gridCols, rows, vignette);
  bright = applyFilmGrain(bright, grain);
  bright = edgeBiasedBrightness(bright, gridCols, rows, edgeWeight);

  if (saliencyAware) {
    const sal = computeSaliency(bright, gridCols, rows);
    bright = applySaliencyToBrightness(bright, sal, gridCols, rows, saliencyBoost);
  }

  const chars = measureCharDensity(RAW_CHARSETS[charset] || RAW_CHARSETS.full);
  let charGrid;

  if (freqAware) {
    charGrid = frequencyAwareChars(sharpened, srcW, srcH, chars, gridCols, rows, charAspect, invert);
  } else if (glyphMatch) {
    charGrid = glyphMatchChars(sharpened, srcW, srcH, chars, gridCols, charAspect, fontSize, invert);
  } else if (glyphErrDiff) {
    charGrid = glyphSpaceErrorDiffusion(sharpened, srcW, srcH, chars, gridCols, rows, charAspect, fontSize, invert);
  } else if (fusionV6 && msCtx) {
    charGrid = fusedV6Chars(bright, rawBright, msCtx, gridCols, rows, chars, invert);
  } else {
    let processedBright = bright;
    if (dither) processedBright = floydSteinberg(bright, gridCols, rows, chars.length);
    charGrid = brightnessToChars(processedBright, gridCols, rows, chars, invert);
  }

  return {
    charGrid, rows, cols: gridCols,
    brightness: rawBright,
    colourData: colourResized ? colourResized.data : null,
  };
}

