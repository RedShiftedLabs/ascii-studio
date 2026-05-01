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
  scanlines: ' ─━═╌╍║│├┤┬┴┼╫╪',
  circuit: ' .·+×╋┼├┤╠╣╦╩╬○●◎',
  japanese: ' ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
  math: ' ·∘∙○◦+×÷=≠≈∞∑∏∫∂√∇∆',
  shadows: ' ░▒▓█▉▊▋▌▍▎▏',
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
    for (let i = 0; i < data.length; i += 4) sum += data[i];
    densities[ch] = 1 - sum / (size * size * 255);
  }

  const sorted = [...chars].sort((a, b) => densities[a] - densities[b]).join('');
  _densityCache.set(key, sorted);
  return sorted;
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(blobUrl); reject(e); };
    img.src = blobUrl;
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









export function equalizeHistogram(b, w, h) {
  const useLocal = w !== undefined && h !== undefined && w > 0 && h > 0;
  const n = b.length;
  const out = new Float32Array(n);

  const hist = new Int32Array(256);
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.max(0, b[i] | 0))]++;
  const cdf = new Int32Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

  const clipLow = n * 0.01;
  const clipHigh = n * 0.99;
  let cdfMin = cdf[0], cdfMax = cdf[255];
  for (let i = 0; i < 256; i++) { if (cdf[i] >= clipLow) { cdfMin = cdf[i]; break; } }
  for (let i = 255; i >= 0; i--) { if (cdf[i] <= clipHigh) { cdfMax = cdf[i]; break; } }
  const globalRange = Math.max(cdfMax - cdfMin, 1);
  const globalLut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    globalLut[i] = Math.round(Math.max(0, Math.min(255, (cdf[i] - cdfMin) / globalRange * 255)));
  }

  if (!useLocal) {
    for (let i = 0; i < n; i++) out[i] = globalLut[Math.min(255, Math.max(0, b[i] | 0))];
    return out;
  }

  const tileW = Math.max(4, Math.round(w / 8));
  const tileH = Math.max(4, Math.round(h / 8));
  const tilesX = Math.ceil(w / tileW);
  const tilesY = Math.ceil(h / tileH);

  const tileLuts = [];
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileW, y0 = ty * tileH;
      const x1 = Math.min(x0 + tileW, w);
      const y1 = Math.min(y0 + tileH, h);

      const th = new Int32Array(256);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          th[Math.min(255, Math.max(0, b[y * w + x] | 0))]++;
        }
      }
      const tc = new Int32Array(256);
      tc[0] = th[0];
      for (let i = 1; i < 256; i++) tc[i] = tc[i - 1] + th[i];
      const tMin = tc.find(v => v > 0) || 0;
      const tN = (x1 - x0) * (y1 - y0);
      const tRange = Math.max(tN - tMin, 1);
      const lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(Math.max(0, Math.min(255, (tc[i] - tMin) / tRange * 255)));
      }
      tileLuts.push(lut);
    }
  }

  const BLEND = 0.6; 
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.min(255, Math.max(0, b[y * w + x] | 0));

      const tx = Math.max(0, Math.min(tilesX - 1, Math.floor((x - tileW / 2) / tileW)));
      const ty = Math.max(0, Math.min(tilesY - 1, Math.floor((y - tileH / 2) / tileH)));
      const tx2 = Math.min(tilesX - 1, tx + 1);
      const ty2 = Math.min(tilesY - 1, ty + 1);

      const fx = ((x - tileW / 2) / tileW) - tx;
      const fy = ((y - tileH / 2) / tileH) - ty;
      const wx = Math.max(0, Math.min(1, fx));
      const wy = Math.max(0, Math.min(1, fy));

      const v00 = tileLuts[ty * tilesX + tx][v];
      const v10 = tileLuts[ty * tilesX + tx2][v];
      const v01 = tileLuts[ty2 * tilesX + tx][v];
      const v11 = tileLuts[ty2 * tilesX + tx2][v];
      const localVal = v00 * (1 - wx) * (1 - wy) + v10 * wx * (1 - wy)
        + v01 * (1 - wx) * wy + v11 * wx * wy;

      const globalVal = globalLut[v];
      out[y * w + x] = Math.round(localVal * BLEND + globalVal * (1 - BLEND));
    }
  }
  return out;
}

export function applyGamma(b, gamma) {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = Math.pow(Math.max(0, Math.min(1, b[i] / 255)), gamma) * 255;
  return out;
}

export function applyContrast(b, factor) {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = Math.max(0, Math.min(255, factor * (b[i] - 128) + 128));
  return out;
}

export function applyExposure(b, multiplier) {
  if (multiplier === 1) return b;
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = Math.max(0, Math.min(255, b[i] * multiplier));
  return out;
}

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

















const _BINARY_DENSITY = [
  '     ',      
  '    0',      
  '   00',      
  '  000',      
  ' 0000',      
  '00000',      
  '00001',      
  '00010',      
  '00100',      
  '00011',      
  '00101',      
  '001001',     
  '00110',      
  '01001',      
  '010010',     
  '01010',      
  '010101',     
  '01011',      
  '101010',     
  '01101',      
  '10110',      
  '011011',     
  '01110',      
  '10111',      
  '011101',     
  '11011',      
  '110110',     
  '11101',      
  '111011',     
  '11110',      
  '111101',     
  '11111',      
  '111110',     
  '1111110',    
  '11111110',   
  '111111111',  
  '1111111111', 
];


function cellOffset(x, y) {
  return ((x * 6 + y * 11) >>> 0) % 7;
}











export function brightnessToChars(brightness, w, h, chars, invert = false) {
  const n = chars.length - 1;
  const stripped = chars.replace(/\s/g, '');
  const isBinary = stripped === '01' || stripped === '10';
  const isNumbers = /^[0-9]+$/.test(stripped);

  const gentleCurve = (t) => Math.pow(t, 0.92);

  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      let norm = brightness[y * w + x] / 255;
      if (invert) norm = 1 - norm;

      if (isBinary) {
        const curved = norm < 0.05 ? 0 : Math.pow(norm, 0.85);
        const patIdx = Math.max(0, Math.min(
          _BINARY_DENSITY.length - 1,
          Math.round(curved * (_BINARY_DENSITY.length - 1))
        ));
        const pat = _BINARY_DENSITY[patIdx];
        const pos = (x + cellOffset(x, y)) % pat.length;
        row.push(pat[pos]);
      } else if (isNumbers) {
        if (norm < 0.06) {
          row.push(' ');
        } else {
          const curved = gentleCurve((norm - 0.06) / 0.94);
          const charIdx = Math.round(curved * n);
          row.push(chars[Math.max(0, Math.min(n, charIdx))]);
        }
      } else {
        const curved = gentleCurve(norm);
        const idx = Math.max(0, Math.min(n, Math.round(curved * n)));
        row.push(chars[idx]);
      }
    }
    grid.push(row);
  }
  return grid;
}

















export const PORTRAIT_BINARY_DEFAULTS = {
  cols: 160,          
  charset: 'binary',
  charAspect: 0.46,   
  contrast: 1.05,     
  gamma: 1.0,         
  exposure: 1.0,
  edgeWeight: 0,      
  sharpen: 0.1,       
  vignette: 0,
  grain: 0,
  equalize: true,
  dither: false,      
  invert: false,
  fontSize: 7,        
};



export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}







let _tfReady = false;
let _mlSaliencyModel = null;
let _mlSaliencyStatus = 'idle'; 

export function getMLSaliencyStatus() { return _mlSaliencyStatus; }

async function _loadMLSaliencyModel() {
  if (_mlSaliencyModel) return _mlSaliencyModel;
  if (_mlSaliencyStatus === 'loading') return null;
  _mlSaliencyStatus = 'loading';
  try {
    const tf = await import('https://esm.sh/@tensorflow/tfjs@4.20.0');
    await tf.ready();
    _tfReady = true;
    const mobilenet = await import('https://esm.sh/@tensorflow-models/mobilenet@2.1.1');
    _mlSaliencyModel = await mobilenet.load({ version: 2, alpha: 0.5 });
    _mlSaliencyStatus = 'ready';
    return _mlSaliencyModel;
  } catch (e) {
    _mlSaliencyStatus = 'failed';
    console.warn('ML saliency model failed to load:', e);
    return null;
  }
}


_loadMLSaliencyModel();


export async function computeMLSaliency(rgba, srcW, srcH, cols, rows) {
  if (_mlSaliencyStatus === 'ready' && _mlSaliencyModel) {
    try {
      return await _computeNeuralSaliency(rgba, srcW, srcH, cols, rows);
    } catch (e) {
      console.warn('Neural saliency inference failed, falling back:', e);
    }
  }
  return _computeGradientSaliency(rgba, srcW, srcH, cols, rows);
}

async function _computeNeuralSaliency(rgba, srcW, srcH, cols, rows) {
  const tf = await import('https://esm.sh/@tensorflow/tfjs@4.20.0');

  const INPUT_SIZE = 224;
  const srcCanvas = new OffscreenCanvas(srcW, srcH);
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.putImageData(rgba, 0, 0);

  const inputCanvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const inputCtx = inputCanvas.getContext('2d');
  inputCtx.drawImage(srcCanvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const inputData = inputCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  const inputTensor = tf.tidy(() => {
    const pixels = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
    for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
      pixels[i * 3 + 0] = (inputData.data[i * 4 + 0] / 127.5) - 1;
      pixels[i * 3 + 1] = (inputData.data[i * 4 + 1] / 127.5) - 1;
      pixels[i * 3 + 2] = (inputData.data[i * 4 + 2] / 127.5) - 1;
    }
    return tf.tensor4d(pixels, [1, INPUT_SIZE, INPUT_SIZE, 3]);
  });

  let salMap;
  try {
    const internalModel = _mlSaliencyModel.model;
    let targetLayer = null;
    for (const layer of internalModel.layers) {
      const outShape = layer.outputShape;
      if (Array.isArray(outShape) && outShape.length === 4 &&
        outShape[1] > 1 && outShape[2] > 1 && outShape[3] >= 32) {
        targetLayer = layer;
      }
    }

    if (targetLayer) {
      const featureModel = tf.model({
        inputs: internalModel.inputs,
        outputs: targetLayer.output,
      });
      const features = featureModel.predict(inputTensor); 
      const averaged = tf.mean(features, 3); 
      const squeezed = averaged.squeeze([0]); 
      const relu = tf.relu(squeezed);
      const minV = relu.min();
      const maxV = relu.max();
      const normalised = relu.sub(minV).div(maxV.sub(minV).add(1e-8));
      salMap = await normalised.array(); 
      tf.dispose([features, averaged, squeezed, relu, normalised, minV, maxV, featureModel]);
    }
  } catch (e) {
    console.warn('Feature extraction failed:', e);
  }
  tf.dispose(inputTensor);

  if (!salMap) return _computeGradientSaliency(rgba, srcW, srcH, cols, rows);

  const fH = salMap.length;
  const fW = salMap[0].length;
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const fy = (y / (rows - 1)) * (fH - 1);
      const fx = (x / (cols - 1)) * (fW - 1);
      const y0 = Math.floor(fy), y1 = Math.min(fH - 1, y0 + 1);
      const x0 = Math.floor(fx), x1 = Math.min(fW - 1, x0 + 1);
      const wy = fy - y0, wx = fx - x0;
      out[y * cols + x] =
        salMap[y0][x0] * (1 - wx) * (1 - wy) +
        salMap[y0][x1] * wx * (1 - wy) +
        salMap[y1][x0] * (1 - wx) * wy +
        salMap[y1][x1] * wx * wy;
    }
  }
  return out;
}

function _computeGradientSaliency(rgba, srcW, srcH, cols, rows) {
  const bright = computeBrightness(rgba, srcW, srcH);
  const small = resizeGray(bright, srcW, srcH, cols, rows);
  const { gx, gy } = sobel(small, cols, rows);
  const mag = new Float32Array(cols * rows);
  let maxM = 0;
  for (let i = 0; i < mag.length; i++) {
    mag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    if (mag[i] > maxM) maxM = mag[i];
  }
  const out = new Float32Array(cols * rows);
  for (let i = 0; i < mag.length; i++) out[i] = maxM > 0 ? mag[i] / maxM : 0;
  return out;
}


export function applyMLSaliencyToChars(charGrid, salMap, cols, rows, chars, boost = 0.6) {
  const n = chars.length - 1;
  const newGrid = charGrid.map(r => [...r]);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sal = salMap[y * cols + x]; 
      const currentChar = charGrid[y][x];
      const currentIdx = chars.indexOf(currentChar);
      if (currentIdx < 0) continue;
      const shift = Math.round((sal - 0.5) * 2 * boost * (n * 0.15));
      const newIdx = Math.max(0, Math.min(n, currentIdx + shift));
      newGrid[y][x] = chars[newIdx];
    }
  }
  return newGrid;
}

export function renderToCanvas(charGrid, brightness, colourData, opts) {
  const { rows, cols, fgHex, bgHex, fontSize, attenuation, colourMode, outputFont, charset } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const strippedChars = (charset === 'custom' && opts.customCharset) ? opts.customCharset.replace(/\s/g, '') : (charset || '').replace(/\s/g, '');
  const isBinary = strippedChars === '01' || strippedChars === '10' || charset === 'binary';

  const hGap = isBinary ? 1.0 : 0.3;
  const lHeight = isBinary ? 1.10 : 1.15;

  const charW = fontSize * 0.601 + hGap;
  const charH = fontSize * lHeight;
  const w = cols * charW;
  const h = rows * charH;

  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(dpr, dpr);

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.font = `${fontSize}px ${outputFont}`;
  ctx.textBaseline = 'top';

  if (isBinary && 'letterSpacing' in ctx) {
    ctx.letterSpacing = '1px';
  } else if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${hGap}px`;
  }

  if (!colourMode && attenuation === 0) {
    ctx.fillStyle = fgHex;
    for (let y = 0; y < rows; y++) {
      const rowStr = charGrid[y].join('');
      if (!rowStr.trim()) continue;
      ctx.fillText(rowStr, 0, y * charH);
    }
  } else {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = charGrid[y][x];
        if (ch === ' ') continue;

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
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
        ctx.fillText(ch, x * charW, y * charH);
      }
    }
  }

  return canvas;
}

export function renderToHTML(charGrid, brightness, colourData, opts) {
  const { rows, cols, fgHex, bgHex, fontSize, attenuation, colourMode, outputFont, charset } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const isBinary = charset === 'binary' || (charset === 'custom' && opts.customCharset && opts.customCharset.replace(/\s/g, '') === '01');
  const hGap = isBinary ? '1px' : '0.3px';
  const lHeight = isBinary ? '1.1' : '1.15';

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
    `<pre style="font-family:${outputFont};font-size:${fontSize}px;line-height:${lHeight};margin:0;letter-spacing:${hGap};">${lines.join('\n')}</pre></div>`;
}

export function renderToSVG(charGrid, brightness, colourData, opts) {
  const { rows, cols, fgHex, bgHex, fontSize, attenuation, colourMode, outputFont } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const strippedChars = (charset === 'custom' && opts.customCharset) ? opts.customCharset.replace(/\s/g, '') : (charset || '').replace(/\s/g, '');
  const isBinary = strippedChars === '01' || strippedChars === '10' || charset === 'binary';
  const hGap = isBinary ? 1.0 : 0.3;
  const lHeight = isBinary ? 1.10 : 1.15;

  const cw = fontSize * 0.601 + hGap;
  const ch = fontSize * lHeight;
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

export async function runPipeline(img, params) {
  const {
    cols, charset, contrast, gamma, exposure, edgeWeight, sharpen,
    vignette, grain, equalize, dither, invert, showMask, alphaThreshold, charAspect,
    colourMode, attenuation, fgHex, bgHex, fontSize, outputFont,
    multiscale, multiscaleBoost,
    mlSaliency, mlSaliencyBoost,
  } = params;

  const { data: rgba, w: srcW, h: srcH } = img;
  const sharpened = sharpenImage(rgba, srcW, srcH, sharpen);

  let bright = computeBrightness(sharpened, srcW, srcH);
  const { small: resized, rows, cols: gridCols } = resizeForAscii(bright, srcW, srcH, cols, charAspect);
  bright = resized;

  const alphaRaw = new Float32Array(srcW * srcH);
  let hasAlpha = false;
  for (let i = 0; i < srcW * srcH; i++) {
    alphaRaw[i] = rgba.data[i * 4 + 3];
    if (alphaRaw[i] < 255) hasAlpha = true;
  }
  const alphaResized = hasAlpha ? resizeForAscii(alphaRaw, srcW, srcH, cols, charAspect).small : null;

  const colourResized = colourMode ? resizeColour(sharpened, srcW, srcH, gridCols, charAspect) : null;

  const rawBright = new Float32Array(bright);
  if (equalize) bright = equalizeHistogram(bright, gridCols, rows);
  bright = applyExposure(bright, exposure || 1.0);
  bright = applyGamma(bright, gamma);
  bright = applyContrast(bright, contrast);
  bright = applyVignette(bright, gridCols, rows, vignette);
  bright = edgeBiasedBrightness(bright, gridCols, rows, edgeWeight);
  bright = applyFilmGrain(bright, grain);

  const rawChars = charset === 'custom' && params.customCharset
    ? params.customCharset
    : (RAW_CHARSETS[charset] || RAW_CHARSETS.full);
  const chars = measureCharDensity(rawChars);

  const strippedChars = chars.replace(/\s/g, '');
  const isBinaryCharset = strippedChars === '01' || strippedChars === '10';

  let charGrid;

  if (showMask) {
    charGrid = [];
    const t = (alphaThreshold || 0) * 255;
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < gridCols; x++) {
        const a = alphaResized ? alphaResized[y * gridCols + x] : 255;
        row.push(a >= t ? chars[chars.length - 1] : ' ');
      }
      charGrid.push(row);
    }
  } else {
    let processedBright = bright;
    if (dither && !isBinaryCharset) processedBright = floydSteinberg(bright, gridCols, rows, chars.length);
    charGrid = brightnessToChars(processedBright, gridCols, rows, chars, invert);
  }

  if (mlSaliency && !showMask) {
    const salMap = await computeMLSaliency(sharpened, srcW, srcH, gridCols, rows);
    charGrid = applyMLSaliencyToChars(charGrid, salMap, gridCols, rows, chars, mlSaliencyBoost);
  }

  if (!showMask && hasAlpha) {
    const t = (alphaThreshold || 0) * 255;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < gridCols; x++) {
        if (alphaResized[y * gridCols + x] < t) {
          charGrid[y][x] = ' ';
        }
      }
    }
  }

  return { charGrid, brightness: rawBright, colourData: colourResized ? colourResized.data : null, rows, cols: gridCols };
}