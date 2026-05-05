export const RAW_CHARSETS = {
  common: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  minimal: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  dots: ' ·∘○◉●',
  hatching: ' ─━═╬+#@',
  geometric: ' ○●◐◑◒◓◔◕◖◗◘◙□■▢▣▤▥▦▧▨▩◇◆◊◈△▲▽▼◁◀▷▶◂◃▸▹◯◉◎',
  braille: ' ⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿',
  lineart: ' .,:;i|/\\()[]{}tfjl!-_+=xXYZO0#%@',
  edges: ' .-+|/\\xX#@',
  binary: '01',
  numbers: ' 1732456908',
  scanlines: ' ─━═╌╍║│├┤┬┴┼╫╪',
  circuit: ' .·+×╋┼├┤╠╣╦╩╬○●◎',
  japanese: ' ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
  math: ' +-×÷=≠≈≤≥±∞αβγδεθλμπσφωΑΒΓΔΕΘΛΠΣΦΩ∑∏√∫∆∇∂∅∈∉∋∌∧∨∩∪∴∵∼∽≅≃≄≆⊂⊃⊆⊇⊊⊋⊕⊗⊙⊖',
  shadows: ' ░▒▓█▉▊▋▌▍▎▏',
  box_drawing: ' ─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬━┃┏┓┗┛┣┫┳┻╋╭╮╰╯╱╲╳╴╵╶╷',
  block_elements: ' █▇▆▅▄▃▂▁▀▓▒░▔▕▖▗▘▙▚▛▜▝▞▟▌▍▎▏▐▉▊▋',
  stars: ' ☆★✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾✿❀❁❂❃❄❅❆❇❈❉❊❋',
  arrows: ' ←↑→↓↔↕↖↗↘↙⇐⇑⇒⇓⇔⇕⇖⇗⇘⇙⇦⇧⇨⇩➔➘➙➚➛➜➝➞➟➠➡➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱',
  cards: ' ♠♣♥♦♤♧♡♢🂡🂢🂣🂤🂥🂦🂧🂨🂩🂪🂫🂭🂮',
  misc: ' ☺☻•◦‣⁃⁌⁍·⋅☀☁☂☃☄☎☏☐☑☒☓☖☗☘☙☚☛☜☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☰☱☲☳☴☵☶☷☸☹☼☽☾☿♀♂♁⚢⚣⚤⚥⚦⚧⚨⚩⚬⚭⚮⚯⚰⚱⚲⚳⚴⚵⚶⚷⚸⚹⚺⚻⚼⚿⛀⛁⛂⛃⛆⛇⛈⛉⛊⛋⛌⛍⛏⛐⛑⛒⛓⛕⛖⛗⛘⛙⛚⛛⛜⛝⛞⛟⛠⛡⛢⛣⛤⛥⛦⛧⛨⛩⛫⛬⛭⛮⛯⛰⛱⛴⛶⛷⛸⛻⛼⛾⛿',
  full: ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
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
const _rasterCache = new Map();

export function rasterizeCharset(chars, simW = 8, simH = 12, outputFont = 'monospace') {
  const key = `${chars}_${simW}_${simH}_${outputFont}`;
  if (_rasterCache.has(key)) return _rasterCache.get(key);

  if (_rasterCache.size > 20) _rasterCache.clear();

  const canvas = new OffscreenCanvas(simW, simH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rasterList = [];

  for (const char of chars) {
    ctx.clearRect(0, 0, simW, simH);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, simW, simH);
    ctx.fillStyle = 'white';
    ctx.font = `${simH}px ${outputFont}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(char, simW / 2, 0);

    const imgData = ctx.getImageData(0, 0, simW, simH).data;
    const luma = new Float32Array(simW * simH);
    let sum = 0;
    for (let i = 0; i < simW * simH; i++) {
      luma[i] = imgData[i * 4] / 255;
      sum += luma[i];
    }

    const gx = new Float32Array(simW * simH);
    const gy = new Float32Array(simW * simH);
    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = y * simW + x;
        gx[i] = (luma[i + 1] - luma[i - 1]);
        gy[i] = (luma[i + simW] - luma[i - simW]);
      }
    }

    rasterList.push({
      char,
      luma,
      gx,
      gy,
      density: sum / (simW * simH)
    });
  }

  _rasterCache.set(key, rasterList);
  return rasterList;
}

export function retinexNormalization(b, w, h) {
  const logB = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) logB[i] = Math.log(1 + b[i]);

  const radius = 8;
  const blurred = new Float32Array(b.length);
  const temp = new Float32Array(b.length);

  for (let y = 0; y < h; y++) {
    let sum = 0, count = 0;
    for (let x = 0; x < Math.min(radius - 1, w); x++) { sum += logB[y * w + x]; count++; }
    for (let x = 0; x < w; x++) {
      if (x + radius < w) { sum += logB[y * w + x + radius]; count++; }
      if (x - radius - 1 >= 0) { sum -= logB[y * w + x - radius - 1]; count--; }
      temp[y * w + x] = sum / count;
    }
  }

  for (let x = 0; x < w; x++) {
    let sum = 0, count = 0;
    for (let y = 0; y < Math.min(radius - 1, h); y++) { sum += temp[y * w + x]; count++; }
    for (let y = 0; y < h; y++) {
      if (y + radius < h) { sum += temp[(y + radius) * w + x]; count++; }
      if (y - radius - 1 >= 0) { sum -= temp[(y - radius - 1) * w + x]; count--; }
      blurred[y * w + x] = sum / count;
    }
  }

  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) {
    const reflectance = logB[i] - blurred[i];

    out[i] = Math.max(0, Math.min(255, reflectance * 64 + 128));
  }
  return out;
}

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

function _makeLCG(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xFFFFFFFF;
  };
}

function _randomPoolFromChars(chars) {
  const stripped = chars.replace(/\s/g, '');
  if (stripped === '01' || stripped === '10') return ['0', '1'];
  if (/^[0-9]+$/.test(stripped)) return [...stripped];
  return [...stripped];
}

export function randomOverlayChars(brightness, w, h, chars, invert = false, seed = 42) {
  const pool = _randomPoolFromChars(chars);
  const rng = _makeLCG(seed);

  // Fill every cell with a random character from the pool
  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      row.push(pool[Math.floor(rng() * pool.length)]);
    }
    grid.push(row);
  }

  /* ── Advanced opacity computation ── */
  const processedBright = retinexNormalization(brightness, w, h);

  // 1) Edge detection for outline emphasis
  const { gx, gy } = sobel(processedBright, w, h);
  const edgeMag = new Float32Array(w * h);
  let maxM = 0;
  for (let i = 0; i < edgeMag.length; i++) {
    edgeMag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    if (edgeMag[i] > maxM) maxM = edgeMag[i];
  }
  if (maxM > 0) for (let i = 0; i < edgeMag.length; i++) edgeMag[i] /= maxM;

  // 2) Local contrast (standard deviation in a 7×7 window)
  //    Areas with high local contrast = detail/texture → boost opacity
  const localContrast = new Float32Array(w * h);
  let maxLC = 0;
  const r = 3; // half-window
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, sumSq = 0, count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const v = processedBright[yy * w + xx];
          sum += v; sumSq += v * v; count++;
        }
      }
      const mean = sum / count;
      const std = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
      localContrast[y * w + x] = std;
      if (std > maxLC) maxLC = std;
    }
  }
  if (maxLC > 0) for (let i = 0; i < localContrast.length; i++) localContrast[i] /= maxLC;

  // 3) Percentile-based stretching for better dynamic range
  //    Instead of assuming 0-255, find the actual 2nd and 98th percentile
  const sorted = Array.from(processedBright).sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const range = hi - lo || 1;

  // 4) Compute opacities with adaptive S-curve
  const opacities = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    // Stretch to [0, 1] using percentile bounds
    let luma = Math.max(0, Math.min(1, (processedBright[i] - lo) / range));
    if (invert) luma = 1 - luma;

    // S-curve (smooth Hermite) — pushes darks darker and brights brighter
    // Double-applied for sharper separation
    let t = luma * luma * (3 - 2 * luma);        // smoothstep #1
    t = t * t * (3 - 2 * t);                      // smoothstep #2 — steeper

    // Boost edges strongly (outlines should always be visible)
    const edgeBoost = edgeMag[i] * 0.5;

    // Boost areas with high local contrast (detail/texture)
    const detailBoost = localContrast[i] * 0.25;

    let opacity = t + edgeBoost + detailBoost;

    // Clamp and apply a subtle floor (0.02 so darkest areas have a faint hint)
    opacities[i] = Math.min(1, Math.max(0.02, opacity));
  }

  return { charGrid: grid, opacities };
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

export function cleanupBinaryGrid(grid, w, h) {
  const getVal = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    const c = grid[y][x];
    return (c !== ' ' && c !== '') ? 1 : 0;
  };
  const newGrid = grid.map(row => [...row]);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const self = getVal(x, y);
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          neighbors += getVal(x + dx, y + dy);
        }
      }
      if (self === 1 && neighbors <= 1) newGrid[y][x] = ' ';
      if (self === 0 && neighbors >= 7) newGrid[y][x] = grid[y][x - 1] || '1';
    }
  }
  return newGrid;
}

export function brightnessToChars(brightness, w, h, chars, invert = false, edgeMag = null, fullResData = null) {
  const n = chars.length - 1;
  const stripped = chars.replace(/\s/g, '');
  const isBinary = stripped === '01' || stripped === '10';
  const isNumbers = /^[0-9]+$/.test(stripped);

  const gentleCurve = (t) => Math.pow(t, 0.92);
  const sCurve = (t) => t * t * (3 - 2 * t);

  if (fullResData) {
    const simW = 8, simH = 12;
    const rasters = rasterizeCharset(chars, simW, simH);
    const rasterMap = new Map(rasters.map(r => [r.char, r]));
    const srcW = fullResData.w, srcH = fullResData.h;
    const data = fullResData.data;

    const grid = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      const sy0 = Math.floor((y / h) * srcH), sy1 = Math.floor(((y + 1) / h) * srcH);
      for (let x = 0; x < w; x++) {
        const sx0 = Math.floor((x / w) * srcW), sx1 = Math.floor(((x + 1) / w) * srcW);

        const patch = new Float32Array(simW * simH);
        const pgx = new Float32Array(simW * simH);
        const pgy = new Float32Array(simW * simH);
        for (let py = 0; py < simH; py++) {
          for (let px = 0; px < simW; px++) {
            const srcX = Math.min(srcW - 1, sx0 + (sx1 > sx0 ? Math.floor((px / simW) * (sx1 - sx0)) : 0));
            const srcY = Math.min(srcH - 1, sy0 + (sy1 > sy0 ? Math.floor((py / simH) * (sy1 - sy0)) : 0));
            let val = data[srcY * srcW + srcX] / 255;
            if (invert) val = 1 - val;
            patch[py * simW + px] = isBinary ? sCurve(val) : gentleCurve(val);
          }
        }
        for (let i = simW + 1; i < patch.length - simW - 1; i++) {
          pgx[i] = patch[i + 1] - patch[i - 1];
          pgy[i] = patch[i + simW] - patch[i - simW];
        }

        const idx = y * w + x;
        const patchWeight = 1.0 + (edgeMag ? edgeMag[idx] * 4.0 : 0);

        let bestChar = chars[0], minErr = Infinity;
        for (const r of rasters) {
          let err = 0;
          for (let i = 0; i < patch.length; i++) {
            const dLuma = patch[i] - r.luma[i];
            const dGx = pgx[i] - r.gx[i];
            const dGy = pgy[i] - r.gy[i];

            err += dLuma * dLuma + (dGx * dGx + dGy * dGy) * 0.5 * patchWeight;
          }

          if (x > 0) {
            const prevR = rasterMap.get(row[x - 1]);
            if (prevR) {
              const densityDiff = Math.abs(r.density - prevR.density);
              err += densityDiff * 0.15;
            }
          }

          if (err < minErr) {
            minErr = err;
            bestChar = r.char;
          }
        }
        row.push(bestChar);
      }
      grid.push(row);
    }
    return isBinary ? cleanupBinaryGrid(grid, w, h) : grid;
  }

  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      let norm = brightness[y * w + x] / 255;
      if (invert) norm = 1 - norm;
      if (isNumbers) {
        if (norm < 0.06) { row.push(' '); }
        else {
          const curved = Math.pow((norm - 0.06) / 0.94, 0.92);
          row.push(chars[Math.max(0, Math.min(n, Math.round(curved * n)))]);
        }
      } else {
        const curved = Math.pow(norm, 0.92);
        row.push(chars[Math.max(0, Math.min(n, Math.round(curved * n)))]);
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

  let salMap = null;
  try {
    const internalModel = _mlSaliencyModel.model;

    /* ── Multi-scale feature extraction ──
       Pick an early, mid, and late layer to combine coarse semantic
       understanding with fine spatial detail. */
    const candidates = [];
    for (const layer of internalModel.layers) {
      const s = layer.outputShape;
      if (Array.isArray(s) && s.length === 4 && s[1] > 1 && s[2] > 1 && s[3] >= 16) {
        candidates.push({ layer, spatialH: s[1], spatialW: s[2], channels: s[3] });
      }
    }

    // Sort by spatial resolution (largest first)
    candidates.sort((a, b) => (b.spatialH * b.spatialW) - (a.spatialH * a.spatialW));

    // Pick 3 layers: early (high-res), mid, and late (low-res, semantic)
    const picks = [];
    if (candidates.length >= 3) {
      picks.push(candidates[0]);                                    // early — fine detail
      picks.push(candidates[Math.floor(candidates.length / 2)]);    // mid
      picks.push(candidates[candidates.length - 1]);                // late — semantic
    } else {
      picks.push(...candidates.slice(0, candidates.length));
    }

    if (picks.length > 0) {
      const featureModel = tf.model({
        inputs: internalModel.inputs,
        outputs: picks.map(p => p.layer.output),
      });
      const featureOutputs = featureModel.predict(inputTensor);
      const featureList = Array.isArray(featureOutputs) ? featureOutputs : [featureOutputs];

      // Combine all layers into a single saliency map at the target resolution
      const combined = new Float32Array(cols * rows);
      // Weight: semantic layers get more weight, spatial layers add detail
      const weights = featureList.length === 3 ? [0.2, 0.35, 0.45] : featureList.length === 2 ? [0.35, 0.65] : [1.0];

      for (let fi = 0; fi < featureList.length; fi++) {
        const feat = featureList[fi];
        // Channel-wise activation: take the L2 norm across channels for richer saliency
        const l2 = tf.tidy(() => {
          const sq = feat.square();
          const summed = sq.sum(3);       // [1, H, W]
          const sqrtMap = summed.sqrt();
          return sqrtMap.squeeze([0]);     // [H, W]
        });
        const mapData = await l2.array();
        tf.dispose(l2);

        const fH = mapData.length, fW = mapData[0].length;

        // Normalize this layer's map to [0,1]
        let fMin = Infinity, fMax = -Infinity;
        for (let y = 0; y < fH; y++) for (let x = 0; x < fW; x++) {
          if (mapData[y][x] < fMin) fMin = mapData[y][x];
          if (mapData[y][x] > fMax) fMax = mapData[y][x];
        }
        const fRange = fMax - fMin || 1;

        // Bilinear interpolation to target grid + accumulate
        const w = weights[fi];
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const fy = Math.max(0, (y / Math.max(1, rows - 1)) * (fH - 1));
            const fx = Math.max(0, (x / Math.max(1, cols - 1)) * (fW - 1));
            const y0 = Math.floor(fy), y1 = Math.min(fH - 1, y0 + 1);
            const x0 = Math.floor(fx), x1 = Math.min(fW - 1, x0 + 1);
            const wy = fy - y0, wx = fx - x0;
            const raw =
              mapData[y0][x0] * (1 - wx) * (1 - wy) +
              mapData[y0][x1] * wx * (1 - wy) +
              mapData[y1][x0] * (1 - wx) * wy +
              mapData[y1][x1] * wx * wy;
            combined[y * cols + x] += ((raw - fMin) / fRange) * w;
          }
        }
      }

      tf.dispose(featureList);
      tf.dispose(featureModel);

      // Apply center-prior: slightly bias saliency towards center of image
      const cx = cols / 2, cy = rows / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const dx = (x - cx) / cx, dy = (y - cy) / cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const centerWeight = 1.0 - dist * 0.25;  // mild center bias
          combined[y * cols + x] *= centerWeight;
        }
      }

      // Gaussian blur the saliency map for smoother transitions (3x3 box blur, 2 passes)
      for (let pass = 0; pass < 2; pass++) {
        const tmp = new Float32Array(combined);
        for (let y = 1; y < rows - 1; y++) {
          for (let x = 1; x < cols - 1; x++) {
            tmp[y * cols + x] = (
              combined[(y-1)*cols+x-1] + combined[(y-1)*cols+x]*2 + combined[(y-1)*cols+x+1] +
              combined[y*cols+x-1]*2     + combined[y*cols+x]*4     + combined[y*cols+x+1]*2 +
              combined[(y+1)*cols+x-1] + combined[(y+1)*cols+x]*2 + combined[(y+1)*cols+x+1]
            ) / 16;
          }
        }
        combined.set(tmp);
      }

      // Final normalization to [0, 1]
      let cMin = Infinity, cMax = -Infinity;
      for (let i = 0; i < combined.length; i++) {
        if (combined[i] < cMin) cMin = combined[i];
        if (combined[i] > cMax) cMax = combined[i];
      }
      const cRange = cMax - cMin || 1;
      for (let i = 0; i < combined.length; i++) {
        combined[i] = (combined[i] - cMin) / cRange;
      }

      salMap = combined;
    }
  } catch (e) {
    console.warn('Multi-scale feature extraction failed:', e);
  }
  tf.dispose(inputTensor);

  if (!salMap) return _computeGradientSaliency(rgba, srcW, srcH, cols, rows);
  return salMap;
}

function _computeGradientSaliency(rgba, srcW, srcH, cols, rows) {
  const bright = computeBrightness(rgba, srcW, srcH);
  const small = resizeGray(bright, srcW, srcH, cols, rows);
  const { gx, gy } = sobel(small, cols, rows);

  // Combine edge magnitude + local intensity variance for richer fallback
  const mag = new Float32Array(cols * rows);
  let maxM = 0;
  for (let i = 0; i < mag.length; i++) {
    mag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    if (mag[i] > maxM) maxM = mag[i];
  }

  // Local variance (5x5 window) captures texture interest
  const variance = new Float32Array(cols * rows);
  let maxV = 0;
  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      let sum = 0, sumSq = 0, count = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const v = small[(y+dy) * cols + (x+dx)];
          sum += v; sumSq += v * v; count++;
        }
      }
      const mean = sum / count;
      variance[y * cols + x] = sumSq / count - mean * mean;
      if (variance[y * cols + x] > maxV) maxV = variance[y * cols + x];
    }
  }

  // Combine: 60% edges + 40% texture variance
  const out = new Float32Array(cols * rows);
  for (let i = 0; i < mag.length; i++) {
    const edgeNorm = maxM > 0 ? mag[i] / maxM : 0;
    const varNorm = maxV > 0 ? variance[i] / maxV : 0;
    out[i] = edgeNorm * 0.6 + varNorm * 0.4;
  }

  // Center-prior bias
  const cx = cols / 2, cy = rows / 2;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = (x - cx) / cx, dy = (y - cy) / cy;
      out[y * cols + x] *= 1.0 - Math.sqrt(dx * dx + dy * dy) * 0.2;
    }
  }

  // Normalize
  let oMax = 0;
  for (let i = 0; i < out.length; i++) if (out[i] > oMax) oMax = out[i];
  if (oMax > 0) for (let i = 0; i < out.length; i++) out[i] /= oMax;

  return out;
}

export function renderToCanvas(charGrid, brightness, colourData, opts, opacities = null) {
  const { rows, cols, fgHex, bgHex, bgTransparent, fontSize, attenuation, colourMode, outputFont, charset, charAspect } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const safeCharset = String(charset || '');
  const safeCustom = String(opts.customCharset || '');
  const strippedChars = (charset === 'custom' && safeCustom) ? safeCustom.replace(/\s/g, '') : safeCharset.replace(/\s/g, '');
  const isBinary = strippedChars === '01' || strippedChars === '10' || charset === 'binary';

  const hGap = opts.horizontalGap !== undefined ? opts.horizontalGap : (isBinary ? 1.0 : 0.3);
  const lHeight = opts.verticalGap !== undefined ? opts.verticalGap : (isBinary ? 1.10 : 1.15);

  const baseCharW = fontSize * (charAspect || 0.6);
  const charW = baseCharW + hGap;
  const charH = fontSize * lHeight;
  const w = cols * charW;
  const h = rows * charH;

  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d', { alpha: !!bgTransparent });
  ctx.scale(dpr, dpr);
  if (!bgTransparent) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.font = `${fontSize}px ${outputFont}`;
  ctx.textBaseline = 'top';

  if (!colourMode && attenuation === 0 && !opacities) {
    ctx.fillStyle = fgHex;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = charGrid[y][x];
        if (ch === ' ') continue;
        ctx.fillText(ch, x * charW, y * charH);
      }
    }
    return canvas;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = charGrid[y][x];
      if (ch === ' ') continue;

      const idx = y * cols + x;
      const luma = brightness[idx] / 255;

      let pr, pg, pb;
      if (colourMode && colourData) {
        const ci = idx * 4;
        pr = colourData.data[ci];
        pg = colourData.data[ci + 1];
        pb = colourData.data[ci + 2];
      } else {
        pr = Math.round(fr * luma + br * (1 - luma));
        pg = Math.round(fg * luma + bg * (1 - luma));
        pb = Math.round(fb * luma + bb * (1 - luma));
      }

      let alpha;
      if (opacities) {
        alpha = opacities[idx];
      } else {
        alpha = attenuation > 0
          ? Math.max(0.08, Math.min(1, luma * attenuation + (1 - attenuation)))
          : 1;
      }

      ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha.toFixed(3)})`;
      ctx.fillText(ch, x * charW, y * charH);
    }
  }

  return canvas;
}

export function renderToHTML(charGrid, brightness, colourData, opts, opacities = null) {
  const { rows, cols, fgHex, bgHex, bgTransparent, fontSize, attenuation, colourMode, outputFont, charset, charAspect } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const safeCharset = String(charset || '');
  const safeCustom = String(opts.customCharset || '');
  const isBinary = charset === 'binary' || (charset === 'custom' && safeCustom.replace(/\s/g, '') === '01');
  const hGap = opts.horizontalGap !== undefined ? `${opts.horizontalGap}px` : (isBinary ? '1px' : '0.3px');
  const lHeight = opts.verticalGap !== undefined ? opts.verticalGap : (isBinary ? '1.1' : '1.15');

  const lines = [];
  for (let y = 0; y < rows; y++) {
    const parts = [];
    for (let x = 0; x < cols; x++) {
      const ch = charGrid[y][x];
      const idx = y * cols + x;
      const luma = brightness[idx] / 255;

      let pr, pg, pb;
      if (colourMode && colourData) {
        const ci = idx * 4;
        pr = colourData.data[ci]; pg = colourData.data[ci + 1]; pb = colourData.data[ci + 2];
      } else {
        pr = Math.round(fr * luma + br * (1 - luma));
        pg = Math.round(fg * luma + bg * (1 - luma));
        pb = Math.round(fb * luma + bb * (1 - luma));
      }

      let alpha;
      if (opacities) {
        alpha = opacities[idx];
      } else {
        alpha = attenuation > 0
          ? Math.max(0.08, Math.min(1, luma * attenuation + (1 - attenuation)))
          : 1;
      }

      const esc = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
      parts.push(`<span style="color:rgba(${pr},${pg},${pb},${alpha.toFixed(2)})">${esc}</span>`);
    }
    lines.push(parts.join(''));
  }

  return `<div style="background:${bgHex};padding:16px;border-radius:10px;overflow:auto;border:1px solid #222;">` +
    `<pre style="font-family:${outputFont};font-size:${fontSize}px;line-height:${lHeight};margin:0;letter-spacing:${hGap};">${lines.join('\n')}</pre></div>`;
}

export function renderToSVG(charGrid, brightness, colourData, opts, opacities = null) {
  const { rows, cols, fgHex, bgHex, bgTransparent, fontSize, attenuation, colourMode, outputFont, charset, charAspect } = opts;
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);

  const safeCharset = String(charset || '');
  const safeCustom = String(opts.customCharset || '');
  const strippedChars = (charset === 'custom' && safeCustom) ? safeCustom.replace(/\s/g, '') : safeCharset.replace(/\s/g, '');
  const isBinary = strippedChars === '01' || strippedChars === '10' || charset === 'binary';
  const hGap = opts.horizontalGap !== undefined ? opts.horizontalGap : (isBinary ? 1.0 : 0.3);
  const lHeight = opts.verticalGap !== undefined ? opts.verticalGap : (isBinary ? 1.10 : 1.15);

  const baseCw = fontSize * (charAspect || 0.6);
  const cw = baseCw + hGap;
  const ch = fontSize * lHeight;
  const svgW = cols * cw;
  const svgH = rows * ch;

  const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=IBM+Plex+Mono&family=Fira+Mono&family=Source+Code+Pro&family=Roboto+Mono&family=JetBrains+Mono&family=Inconsolata&family=Oxygen+Mono&family=Share+Tech+Mono&display=swap');`;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW.toFixed(1)}" height="${svgH.toFixed(1)}" viewBox="0 0 ${svgW.toFixed(1)} ${svgH.toFixed(1)}">`,
    bgTransparent ? '' : `<rect width="100%" height="100%" fill="${bgHex}"/>`,
    `<style><![CDATA[${fontImport} text{font-family:${outputFont};font-size:${fontSize}px;white-space:pre;letter-spacing:${hGap}px;}]]></style>`,
  ];

  for (let y = 0; y < rows; y++) {
    const ty = y * ch + fontSize * 0.85;
    const spans = [];
    for (let x = 0; x < cols; x++) {
      const ch_ = charGrid[y][x];
      const idx = y * cols + x;
      const luma = brightness[idx] / 255;

      let pr, pg, pb;
      if (colourMode && colourData) {
        const ci = idx * 4;
        pr = colourData.data[ci]; pg = colourData.data[ci + 1]; pb = colourData.data[ci + 2];
      } else {
        pr = Math.round(fr * luma + br * (1 - luma));
        pg = Math.round(fg * luma + bg * (1 - luma));
        pb = Math.round(fb * luma + bb * (1 - luma));
      }

      let alpha;
      if (opacities) {
        alpha = opacities[idx];
      } else {
        alpha = attenuation > 0
          ? Math.max(0.08, Math.min(1, luma * attenuation + (1 - attenuation)))
          : 1;
      }
      const esc = ch_ === '&' ? '&amp;' : ch_ === '<' ? '&lt;' : ch_ === '>' ? '&gt;' : ch_ === '"' ? '&quot;' : ch_ === "'" ? '&apos;' : ch_;
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

/* ── Font embedding for self-contained SVG exports ──────── */
let _fontCache = {};

async function _fetchAsBase64(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise(resolve => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

async function embedFontsInSVG(svgString) {
  const importMatch = svgString.match(/@import\s+url\(['"]?(.*?)['"]?\)/);
  if (!importMatch) return svgString;

  const cssUrl = importMatch[1];

  try {
    // Check cache
    if (!_fontCache[cssUrl]) {
      const resp = await fetch(cssUrl);
      let css = await resp.text();

      // Find all font file URLs and replace with base64
      const urlMatches = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)];
      for (const m of urlMatches) {
        const fontUrl = m[1];
        const b64 = await _fetchAsBase64(fontUrl);
        css = css.replace(fontUrl, b64);
      }
      _fontCache[cssUrl] = css;
    }

    // Replace @import with inlined @font-face rules
    return svgString.replace(/@import\s+url\([^)]+\);?\s*/, _fontCache[cssUrl] + '\n');
  } catch (e) {
    console.warn('Font embedding failed, using fallback:', e);
    return svgString;
  }
}

export async function renderToPNG(svgString) {
  const embeddedSvg = await embedFontsInSVG(svgString);
  const svgBase64 = btoa(unescape(encodeURIComponent(embeddedSvg)));
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * dpr;
      canvas.height = img.naturalHeight * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
      canvas.toBlob(b => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to rasterize SVG — the image could not be decoded'));
    img.src = dataUrl;
  });
}

export async function renderToPDF(svgString) {
  if (!window.jspdf) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
  const { jsPDF } = window.jspdf;

  const embeddedSvg = await embedFontsInSVG(svgString);
  const svgBase64 = btoa(unescape(encodeURIComponent(embeddedSvg)));
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Failed to rasterize SVG for PDF'));
    i.src = dataUrl;
  });

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * dpr;
  canvas.height = img.naturalHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [img.naturalWidth, img.naturalHeight],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, img.naturalWidth, img.naturalHeight);
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
    colourMode, attenuation,
    multiscale, multiscaleBoost,
    saliencyAware, saliencyBoost,
    bgTransparent,
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

  if (saliencyAware && !showMask) {
    const salMap = await computeMLSaliency(sharpened, srcW, srcH, gridCols, rows);

    // Compute global mean brightness for contrast modulation
    let globalMean = 0;
    for (let i = 0; i < bright.length; i++) globalMean += bright[i];
    globalMean /= bright.length;

    const boost = saliencyBoost || 0.5;

    for (let i = 0; i < bright.length; i++) {
      const sal = salMap[i];       // 0 = unimportant, 1 = most salient

      // Contrast modulation: amplify deviation from mean in salient areas
      // sal=1 → contrast multiplier up to 1.0 + boost*2.0 (e.g. 2.2x at boost=0.6)
      // sal=0 → compress contrast towards mean (fade the background)
      const contrastFactor = 1.0 + (sal - 0.3) * boost * 3.0;
      const deviation = bright[i] - globalMean;
      let newVal = globalMean + deviation * Math.max(0.3, contrastFactor);

      // Also add a direct brightness lift for salient areas
      newVal += sal * boost * 60;

      bright[i] = Math.max(0, Math.min(255, newVal));
    }
  }

  /* ── Matrix Fill: random chars + opacity-modulated image (binary always uses this) ── */
  if (isBinaryCharset) {
    const seed = gridCols * rows + srcW * 31 + srcH * 17;
    const { charGrid: rGrid, opacities } = randomOverlayChars(
      bright, gridCols, rows, chars, invert, seed
    );
    return {
      charGrid: rGrid,
      brightness: rawBright,
      colourData: colourResized ? colourResized.data : null,
      rows,
      cols: gridCols,
      opacities,
    };
  }
  let charGrid;
  let opacities = null;

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
    let edgeMag = null;
    let fullResData = null;

    const processedBright = retinexNormalization(bright, gridCols, rows);

    const { gx, gy } = sobel(processedBright, gridCols, rows);
    edgeMag = new Float32Array(gridCols * rows);
    let maxM = 0;
    for (let i = 0; i < edgeMag.length; i++) {
      edgeMag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
      if (edgeMag[i] > maxM) maxM = edgeMag[i];
    }
    if (maxM > 0) for (let i = 0; i < edgeMag.length; i++) edgeMag[i] /= maxM;
    if (multiscale) {
      for (let i = 0; i < bright.length; i++) {
        const edge = edgeMag[i];
        if (edge > 0.4) {
          const boost = 1.0 + (multiscaleBoost - 1.0) * edge;
          bright[i] = Math.max(0, Math.min(255, (bright[i] - 128) * boost + 128));
        }
      }
    }

    if (charset === 'full' || charset === 'lineart' || charset === 'edges') {
      fullResData = {
        data: computeBrightness(sharpened, srcW, srcH),
        w: srcW,
        h: srcH
      };
    }

    let brightForChars = processedBright;
    if (dither && !fullResData) {
      brightForChars = floydSteinberg(processedBright, gridCols, rows, chars.length);
    }
    if (attenuation > 0) {
      for (let i = 0; i < brightForChars.length; i++) {
        brightForChars[i] = Math.max(0, Math.min(255, brightForChars[i] * (1 - attenuation * 0.5)));
      }
    }

    charGrid = brightnessToChars(brightForChars, gridCols, rows, chars, invert, edgeMag, fullResData);
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

  return { charGrid, brightness: rawBright, colourData: colourResized ? colourResized.data : null, rows, cols: gridCols, opacities };
}