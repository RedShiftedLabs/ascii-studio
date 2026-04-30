import sys

with open("src/engine.js", "r") as f:
    content = f.read()

NEW_CODE = """
// ══════════════════════════════════════════════════════════════
//  ★ NEW: PERCEPTUAL RENDERING (S-TIER & V6 FUSION)
// ══════════════════════════════════════════════════════════════

// ── Glyph Atlas Cache ──────────────────────────────────────
const _glyphAtlasCache = new Map();

function _buildGlyphAtlas(chars, fontSize = 13) {
  const key = chars + '_' + fontSize;
  if (_glyphAtlasCache.has(key)) return _glyphAtlasCache.get(key);

  // Measure font bounding box approx
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

// ── Gradient Direction ─────────────────────────────────────
const _DIR_CHARS = ['-', '/', '|', '\\'];

export function applyGradientDirection(charGrid, brightness, w, h, threshold = 0.25) {
  const { gx, gy } = sobel(brightness, w, h);
  const mag = new Float32Array(w * h);
  let mx = 0;
  for (let i = 0; i < w * h; i++) {
    mag[i] = Math.sqrt(gx[i]*gx[i] + gy[i]*gy[i]);
    if (mag[i] > mx) mx = mag[i];
  }
  if (mx === 0) return charGrid;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mag[i] / mx > threshold) {
        let angle = Math.atan2(gy[i], gx[i]) * 180 / Math.PI;
        if (angle < 0) angle += 180;
        const bin = Math.floor(angle / 45.0) % 4;
        charGrid[y][x] = _DIR_CHARS[bin];
      }
    }
  }
  return charGrid;
}

// ── Glyph Match (SSD) ──────────────────────────────────────
export function glyphMatchChars(imgArray, srcW, srcH, chars, cols, charAspect = 0.45, fontSize = 13, invert = false) {
  const { atlas, cw, ch } = _buildGlyphAtlas(chars, fontSize);
  const rows = Math.max(1, Math.round(cols * (srcH / srcW) * charAspect));
  
  // Resize to pixel grid
  const bright = computeBrightness(imgArray, srcW, srcH);
  const grayResized = resizeGray(bright, srcW, srcH, cols * cw, rows * ch);
  
  const charGrid = [];
  const P = cw * ch;
  
  // Precompute atlas sums
  const G2 = new Float32Array(chars.length);
  for (let i = 0; i < chars.length; i++) {
    let sum = 0;
    for (let p = 0; p < P; p++) sum += atlas[i][p] * atlas[i][p];
    G2[i] = sum;
  }

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      // Extract patch
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
      
      // Find best SSD
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

// ── Structure Tensor & Frequency Aware ─────────────────────
const _FAM_H    = '-_=~─━';
const _FAM_V    = '|Il!1';
const _FAM_D1   = '/';
const _FAM_D2   = '\\\\';
const _FAM_ISO  = '@#%&WMm*8B';
const _FAM_FLAT = ' .·`';

function _cellStructureTensor(imgArray, srcW, srcH, rows, cols) {
  const cellH = Math.max(4, Math.floor(srcH / rows));
  const cellW = Math.max(4, Math.floor(srcW / cols));
  const targetH = rows * cellH;
  const targetW = cols * cellW;
  
  const bright = computeBrightness(imgArray, srcW, srcH);
  const grayHi = resizeGray(bright, srcW, srcH, targetW, targetH);
  
  // Scale to 0-1
  for(let i=0; i<grayHi.length; i++) grayHi[i] /= 255.0;
  
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
      const disc = Math.sqrt(Math.max(0, (trace * 0.5)*(trace * 0.5) - det));
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
  // Baseline grid
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
        // Flat
        const cIdx = Math.max(0, Math.min(_FAM_FLAT.length - 1, Math.round(luma * (_FAM_FLAT.length - 1))));
        charGrid[y][x] = _FAM_FLAT[cIdx];
      } else if (coh[idx] < cohThresh) {
        // Isotropic
        const cIdx = Math.max(0, Math.min(_FAM_ISO.length - 1, Math.round(luma * (_FAM_ISO.length - 1))));
        charGrid[y][x] = _FAM_ISO[cIdx];
      } else {
        // Directional
        const bin = Math.floor(ori[idx] / 45.0) % 4;
        charGrid[y][x] = dirChars[bin];
      }
    }
  }
  return charGrid;
}

// ── Glyph Space Error Diffusion ────────────────────────────
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
          if (x + 1 < cols && cx === cw - 1) err[(py + cy) * errW + (px + cw)] += res * 7/16;
          if (y + 1 < rows && cy === ch - 1) {
            if (x > 0 && cx === 0) err[(py + ch) * errW + (px - 1)] += res * 3/16;
            err[(py + ch) * errW + (px + cx)] += res * 5/16;
            if (x + 1 < cols && cx === cw - 1) err[(py + ch) * errW + (px + cw)] += res * 1/16;
          }
        }
      }
    }
    charGrid.push(row);
  }
  return charGrid;
}

// ── V6 Fusion ──────────────────────────────────────────────
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

"""

idx = content.find("// ── HTML renderer ──────────────────────────────────────────")
if idx == -1:
    print("Could not find insertion point!")
    sys.exit(1)

new_content = content[:idx] + NEW_CODE + content[idx:]
with open("src/engine.js", "w") as f:
    f.write(new_content)
print("engine.js patched successfully.")
