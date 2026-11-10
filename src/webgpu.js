/**
 * ASCII Studio - High-Performance WebGPU Rendering Pipeline
 * Inspired by Grainrad's WGSL shader architecture.
 * Provides blazing-fast 60 FPS character-atlas rendering, retro CRT post-processing,
 * and faint colored static background noise.
 */

export function isWebGPUSupported() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

// Fullscreen Quad Vertex Shader (0-vertex buffer, triangle covering NDC [-1, 3])
const VERTEX_SHADER = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  var uv = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.texCoord = uv[vertexIndex];
  return output;
}
`;

// ASCII Fragment Shader with Character Atlas & Faint Colored Static Noise
const ASCII_FRAGMENT_SHADER = /* wgsl */ `
struct AsciiUniforms {
  sourceSize: vec2f,          // 0..8
  outputSize: vec2f,          // 8..16
  cellSize: vec2f,            // 16..24
  atlasSize: vec2f,           // 24..32
  atlasCharSize: vec2f,       // 32..40
  atlasCols: f32,             // 40..44
  charsetLength: f32,         // 44..48
  brightness: f32,            // 48..52 (-100 to 100)
  contrast: f32,              // 52..56 (-100 to 100)
  invert: f32,                // 56..60 (0 or 1)
  useOriginalColors: f32,     // 60..64 (0 or 1)
  customColorR: f32,          // 64..68
  customColorG: f32,          // 68..72
  customColorB: f32,          // 72..76
  spacing: f32,               // 76..80
  gamma: f32,                 // 80..84 (0.1 to 3.0)
  backgroundColorR: f32,      // 84..88
  backgroundColorG: f32,      // 88..92
  backgroundColorB: f32,      // 92..96
  staticNoise: f32,           // 96..100 (0.0 to 1.0 faint colored static noise floor)
  time: f32,                  // 100..104 (seconds)
  ditherStrength: f32,        // 104..108 (0.0 to 1.0)
  edgeWeight: f32,            // 108..112 (0.0 to 1.0)
  _pad1: f32,                 // 112..116
  _pad2: f32,                 // 116..120
  _pad3: f32,                 // 120..124
  _pad4: f32,                 // 124..128
}

@group(0) @binding(0) var sourceSampler: sampler;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var fontAtlas: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: AsciiUniforms;

fn hash2d(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn chromaticHash(p: vec2f) -> vec3f {
  let r = hash2d(p + vec2f(1.7, 9.2));
  let g = hash2d(p + vec2f(4.3, 2.1));
  let b = hash2d(p + vec2f(8.9, 5.6));
  return vec3f(r, g, b);
}

// 4x4 Bayer Dither Matrix
fn bayer4x4(p: vec2f) -> f32 {
  let bayer = array<f32, 16>(
    0.0 / 16.0,  8.0 / 16.0,  2.0 / 16.0, 10.0 / 16.0,
   12.0 / 16.0,  4.0 / 16.0, 14.0 / 16.0,  6.0 / 16.0,
    3.0 / 16.0, 11.0 / 16.0,  1.0 / 16.0,  9.0 / 16.0,
   15.0 / 16.0,  7.0 / 16.0, 13.0 / 16.0,  5.0 / 16.0
  );
  let x = u32(p.x) % 4u;
  let y = u32(p.y) % 4u;
  return bayer[y * 4u + x];
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let invCellSize = 1.0 / uniforms.cellSize;
  let pixelPos = texCoord * uniforms.outputSize;
  let cellPos = floor(pixelPos * invCellSize);
  let cellUV = fract(pixelPos * invCellSize);

  // Spacing / Gaps
  let gapRatio = uniforms.spacing * 0.5;
  let charArea = max(0.001, 1.0 - gapRatio);
  let halfGap = gapRatio * 0.5;
  let inGap = cellUV.x < halfGap || cellUV.x > (1.0 - halfGap) ||
              cellUV.y < halfGap || cellUV.y > (1.0 - halfGap);
  let clampedCellUV = clamp((cellUV - halfGap) / charArea, vec2f(0.0), vec2f(1.0));

  // Map cell position to source texture UV
  let numCells = max(vec2f(1.0), floor(uniforms.outputSize * invCellSize));
  let sourceUV = clamp((cellPos + 0.5) / numCells, vec2f(0.0), vec2f(1.0));
  var sourceColor = textureSample(sourceTexture, sourceSampler, sourceUV);

  // Luminance calculation
  var luma = dot(sourceColor.rgb, vec3f(0.299, 0.587, 0.114));

  // Contrast, Brightness, Gamma
  let invGamma = 1.0 / max(0.05, uniforms.gamma);
  luma = pow(clamp(luma, 0.0, 1.0), invGamma);
  let contrastFactor = (uniforms.contrast + 100.0) * 0.01;
  let brightnessOffset = uniforms.brightness * 0.005;
  luma = clamp((luma - 0.5) * contrastFactor + 0.5 + brightnessOffset, 0.0, 1.0);

  // Dithering adjustment
  if (uniforms.ditherStrength > 0.0) {
    let ditherVal = (bayer4x4(cellPos) - 0.5) * uniforms.ditherStrength * 0.18;
    luma = clamp(luma + ditherVal, 0.0, 1.0);
  }

  if (uniforms.invert > 0.5) {
    luma = 1.0 - luma;
  }

  // Edge enhancement if requested
  if (uniforms.edgeWeight > 0.0) {
    let texel = 1.0 / uniforms.sourceSize;
    let sL = textureSample(sourceTexture, sourceSampler, sourceUV - vec2f(texel.x, 0.0)).rgb;
    let sR = textureSample(sourceTexture, sourceSampler, sourceUV + vec2f(texel.x, 0.0)).rgb;
    let sT = textureSample(sourceTexture, sourceSampler, sourceUV - vec2f(0.0, texel.y)).rgb;
    let sB = textureSample(sourceTexture, sourceSampler, sourceUV + vec2f(0.0, texel.y)).rgb;
    let edge = length(sR - sL) + length(sB - sT);
    luma = clamp(luma + edge * uniforms.edgeWeight * 0.5, 0.0, 1.0);
  }

  // --- FAINT COLORED STATIC NOISE FLOOR (Grainrad Aesthetic) ---
  // When pixels are in deep shadow / background (luma < 0.22), instead of empty black,
  // render faint low-density glyphs with subtle chromatic RGB static!
  let staticAmount = uniforms.staticNoise;
  var isNoiseZone = (luma < 0.24) && (staticAmount > 0.01);
  var charIndex: u32 = 0u;
  var noiseTint = vec3f(1.0);
  var glyphOpacity: f32 = 1.0;

  let cellSeed = cellPos + vec2f(uniforms.time * 0.05, 0.0);
  let cellRand = hash2d(cellSeed);

  if (isNoiseZone) {
    // Pick a low-density / punctuation glyph deterministically from charset
    let charPick = hash2d(cellPos * 11.17 + vec2f(2.4, 8.1));
    // Range between index 1 and min(charsetLength - 1, 28)
    let maxNoiseIdx = max(1.0, min(uniforms.charsetLength * 0.65, 28.0));
    charIndex = u32(clamp(charPick * maxNoiseIdx + 1.0, 1.0, uniforms.charsetLength - 1.0));

    // Chromatic RGB noise (warm copper, terracotta, sage green, and slate)
    let cNoise = chromaticHash(cellPos * 7.31 + vec2f(3.9, 1.7));
    noiseTint = vec3f(
      0.22 + cNoise.r * 0.35,
      0.16 + cNoise.g * 0.26,
      0.14 + cNoise.b * 0.28
    );

    // Visible atmospheric opacity (0.22 to 0.55), scaling with staticNoise slider
    let baseOpacity = 0.22 + hash2d(cellPos + vec2f(4.4, 4.4)) * 0.32;
    glyphOpacity = min(0.85, baseOpacity * (staticAmount * 1.8));
  } else {
    // Normal subject character mapping
    let charF = clamp(luma, 0.0, 0.9999) * uniforms.charsetLength;
    charIndex = u32(charF);
    glyphOpacity = max(0.20, luma);
  }

  // Atlas sampling
  let atlasColsU = u32(uniforms.atlasCols);
  let atlasCol = f32(charIndex % atlasColsU);
  let atlasRow = f32(charIndex / atlasColsU);

  let invAtlasSize = 1.0 / uniforms.atlasSize;
  let atlasCharUV = vec2f(
    (atlasCol + clampedCellUV.x) * uniforms.atlasCharSize.x,
    (atlasRow + clampedCellUV.y) * uniforms.atlasCharSize.y
  ) * invAtlasSize;

  let atlasSample = textureSample(fontAtlas, sourceSampler, atlasCharUV);
  var charIntensity = atlasSample.r;
  if (inGap && uniforms.spacing > 0.01) {
    charIntensity = 0.0;
  }

  // Color determination
  var finalFg = vec3f(uniforms.customColorR, uniforms.customColorG, uniforms.customColorB);
  if (uniforms.useOriginalColors > 0.5) {
    finalFg = sourceColor.rgb;
  }

  if (isNoiseZone) {
    charIntensity = charIntensity * glyphOpacity;
    finalFg = mix(finalFg, noiseTint, 0.82);
  }

  let finalBg = vec3f(uniforms.backgroundColorR, uniforms.backgroundColorG, uniforms.backgroundColorB);
  let outputColor = mix(finalBg, finalFg, charIntensity);

  return vec4f(outputColor, 1.0);
}
`;

// CRT & Grain Post-Processing Shader (Grainrad Shader 2)
const POSTPROCESS_FRAGMENT_SHADER = /* wgsl */ `
struct PostProcessUniforms {
  resolution: vec2f,        // 0..8
  time: f32,                // 8..12
  scanlinesEnabled: u32,    // 12..16
  scanlinesOpacity: f32,    // 16..20
  scanlinesSpacing: f32,    // 20..24
  chromaticEnabled: u32,    // 24..28
  chromaticOffset: f32,     // 28..32
  crtEnabled: u32,          // 32..36
  crtAmount: f32,           // 36..40
  vignetteEnabled: u32,     // 40..44
  vignetteIntensity: f32,   // 44..48
  vignetteRadius: f32,      // 48..52
  grainEnabled: u32,        // 52..56
  grainIntensity: f32,      // 56..60
  _pad1: f32,               // 60..64
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: PostProcessUniforms;

fn hash1(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn crtDistort(uv: vec2f, amount: f32) -> vec2f {
  let centered = uv - 0.5;
  let dist = dot(centered, centered);
  return centered * (1.0 + dist * amount) + 0.5;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  let pixelSize = 1.0 / uniforms.resolution;

  let crtActive = uniforms.crtEnabled == 1u && uniforms.crtAmount > 0.0;
  let uv = select(texCoord, crtDistort(texCoord, uniforms.crtAmount), crtActive);
  let outOfBounds = crtActive && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0);

  var color = textureSample(inputTexture, texSampler, clamp(uv, vec2f(0.0), vec2f(1.0)));

  // Chromatic Aberration RGB split
  if (uniforms.chromaticEnabled == 1u && uniforms.chromaticOffset > 0.0) {
    let offset = uniforms.chromaticOffset * pixelSize.x;
    let r = textureSample(inputTexture, texSampler, vec2f(uv.x - offset, uv.y)).r;
    let b = textureSample(inputTexture, texSampler, vec2f(uv.x + offset, uv.y)).b;
    color.r = r;
    color.b = b;
  }

  // Scanlines
  if (uniforms.scanlinesEnabled == 1u) {
    let fragY = uv.y * uniforms.resolution.y;
    let scanline = fragY % (uniforms.scanlinesSpacing * 2.0);
    if (scanline < uniforms.scanlinesSpacing) {
      color = vec4f(color.rgb * (1.0 - uniforms.scanlinesOpacity), color.a);
    }
  }

  // Film Grain
  if (uniforms.grainEnabled == 1u) {
    let noise = (hash1(uv * uniforms.resolution + uniforms.time * 12.0) - 0.5) * uniforms.grainIntensity * 0.15;
    color = vec4f(color.rgb + noise, color.a);
  }

  // Vignette
  if (uniforms.vignetteEnabled == 1u) {
    let dist = length(uv - 0.5) * 2.0;
    let vig = 1.0 - smoothstep(uniforms.vignetteRadius, 1.0, dist) * uniforms.vignetteIntensity;
    color = vec4f(color.rgb * vig, color.a);
  }

  let finalColor = select(color, vec4f(0.0, 0.0, 0.0, 1.0), outOfBounds);
  return clamp(finalColor, vec4f(0.0), vec4f(1.0));
}
`;

/**
 * Creates and uploads a font atlas texture from a character string.
 */
function createFontAtlasTexture(device, charset, fontSize = 24) {
  const chars = charset || '@$B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ';
  const cols = 16;
  const rows = Math.ceil(chars.length / cols);
  const charWidth = Math.ceil(fontSize * 0.6);
  const charHeight = fontSize;
  const atlasWidth = cols * charWidth;
  const atlasHeight = rows * charHeight;

  const canvas = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(atlasWidth, atlasHeight)
    : document.createElement('canvas');
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, atlasWidth, atlasHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px "JetBrains Mono", "SF Mono", "Fira Code", monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  for (let i = 0; i < chars.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.fillText(chars[i], col * charWidth, row * charHeight);
  }

  const texture = device.createTexture({
    size: [atlasWidth, atlasHeight, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source: canvas },
    { texture },
    [atlasWidth, atlasHeight]
  );

  return {
    texture,
    atlasWidth,
    atlasHeight,
    charWidth,
    charHeight,
    cols,
    rows,
    length: chars.length,
  };
}

function hexToRgb01(hex) {
  const clean = (hex || '#ffffff').replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [isNaN(r) ? 1 : r, isNaN(g) ? 1 : g, isNaN(b) ? 1 : b];
}

/**
 * WebGPURenderer Class
 */
export class WebGPURenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.device = null;
    this.context = null;
    this.format = null;
    this.sampler = null;

    this.asciiPipeline = null;
    this.postPipeline = null;

    this.asciiUniformBuffer = null;
    this.postUniformBuffer = null;

    this.fontAtlas = null;
    this.currentCharset = '';

    this.sourceTexture = null;
    this.intermediateTexture = null;

    this.initialized = false;
  }

  async init(charset = '') {
    if (!navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu');
      if (!this.context) return false;

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'opaque',
      });

      this.sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });

      // Ascii Render Pipeline
      const asciiShader = this.device.createShaderModule({
        code: VERTEX_SHADER + ASCII_FRAGMENT_SHADER,
      });

      this.asciiPipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: asciiShader, entryPoint: 'vertexMain' },
        fragment: {
          module: asciiShader,
          entryPoint: 'fragmentMain',
          targets: [{ format: 'rgba8unorm' }],
        },
        primitive: { topology: 'triangle-list' },
      });

      // Post-Processing Pipeline
      const postShader = this.device.createShaderModule({
        code: VERTEX_SHADER + POSTPROCESS_FRAGMENT_SHADER,
      });

      this.postPipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: postShader, entryPoint: 'vertexMain' },
        fragment: {
          module: postShader,
          entryPoint: 'fragmentMain',
          targets: [{ format: this.format }],
        },
        primitive: { topology: 'triangle-list' },
      });

      this.asciiUniformBuffer = this.device.createBuffer({
        size: 128,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.postUniformBuffer = this.device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.updateCharset(charset);
      this.initialized = true;
      return true;
    } catch (err) {
      console.warn('WebGPU init failed, using fallback:', err);
      return false;
    }
  }

  updateCharset(charset) {
    if (this.currentCharset === charset && this.fontAtlas) return;
    this.currentCharset = charset;
    if (this.fontAtlas && this.fontAtlas.texture) {
      this.fontAtlas.texture.destroy();
    }
    this.fontAtlas = createFontAtlasTexture(this.device, charset, 24);
  }

  _ensureSourceTexture(width, height) {
    if (this.sourceTexture && this.sourceTexture.width === width && this.sourceTexture.height === height) {
      return this.sourceTexture;
    }
    if (this.sourceTexture) this.sourceTexture.destroy();
    this.sourceTexture = this.device.createTexture({
      size: [width, height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return this.sourceTexture;
  }

  _ensureIntermediateTexture(width, height) {
    if (this.intermediateTexture && this.intermediateTexture.width === width && this.intermediateTexture.height === height) {
      return this.intermediateTexture;
    }
    if (this.intermediateTexture) this.intermediateTexture.destroy();
    this.intermediateTexture = this.device.createTexture({
      size: [width, height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return this.intermediateTexture;
  }

  render(sourceElement, params = {}) {
    if (!this.initialized || !this.device) return false;

    // Detect source dimensions
    const srcW = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width || 640;
    const srcH = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height || 480;

    // Canvas output dimensions
    const cols = params.cols || 120;
    const charAspect = params.charAspect || 0.45;
    const fontSize = params.fontSize || 6.0;
    const hGap = params.horizontalGap !== undefined ? params.horizontalGap : 0.3;
    const vGap = params.verticalGap !== undefined ? params.verticalGap : 1.15;

    const cellW = Math.max(1, fontSize * charAspect + hGap);
    const cellH = Math.max(1, fontSize * vGap);

    const aspect = srcW / srcH;
    const rows = Math.max(1, Math.round(cols / (aspect / (charAspect || 0.45))));

    const outW = Math.round(cols * cellW);
    const outH = Math.round(rows * cellH);

    if (this.canvas.width !== outW || this.canvas.height !== outH) {
      this.canvas.width = outW;
      this.canvas.height = outH;
      this.canvas.style.width = `${outW}px`;
      this.canvas.style.height = `${outH}px`;
    }

    // Copy source element to GPU texture
    const srcTex = this._ensureSourceTexture(srcW, srcH);
    this.device.queue.copyExternalImageToTexture(
      { source: sourceElement },
      { texture: srcTex },
      [srcW, srcH]
    );

    // Ensure intermediate texture for CRT pass
    const intermediateTex = this._ensureIntermediateTexture(outW, outH);

    // Update charset atlas if changed
    const rawChars = params.customCharset || params.charsetChars || '';
    if (rawChars && rawChars !== this.currentCharset) {
      this.updateCharset(rawChars);
    }

    // Upload Ascii Uniforms
    const [fgR, fgG, fgB] = hexToRgb01(params.fgHex || '#ffffff');
    const [bgR, bgG, bgB] = hexToRgb01(params.bgHex || '#0a0a0a');

    const asciiUniforms = new Float32Array([
      srcW, srcH,                                       // 0, 1: sourceSize
      outW, outH,                                       // 2, 3: outputSize
      cellW, cellH,                                     // 4, 5: cellSize
      this.fontAtlas.atlasWidth, this.fontAtlas.atlasHeight, // 6, 7: atlasSize
      this.fontAtlas.charWidth, this.fontAtlas.charHeight,   // 8, 9: atlasCharSize
      this.fontAtlas.cols,                              // 10: atlasCols
      this.fontAtlas.length,                            // 11: charsetLength
      (params.exposure ? (params.exposure - 1.0) * 100 : 0) + (params.brightness || 0), // 12: brightness
      (params.contrast !== undefined ? (params.contrast - 1.0) * 100 : 20),             // 13: contrast
      params.invert ? 1.0 : 0.0,                        // 14: invert
      params.colourMode ? 1.0 : 0.0,                    // 15: useOriginalColors
      fgR, fgG, fgB,                                    // 16, 17, 18: customColor
      params.spacing || 0.0,                            // 19: spacing
      params.gamma || 0.8,                              // 20: gamma
      bgR, bgG, bgB,                                    // 21, 22, 23: backgroundColor
      params.staticNoise !== undefined ? params.staticNoise : 0.35, // 24: staticNoise (colored background noise floor)
      (performance.now() * 0.001),                      // 25: time
      params.dither ? 1.0 : 0.0,                        // 26: ditherStrength
      params.edgeWeight || 0.25,                        // 27: edgeWeight
      0, 0, 0, 0                                        // padding
    ]);

    this.device.queue.writeBuffer(this.asciiUniformBuffer, 0, asciiUniforms);

    // Upload PostProcess Uniforms
    const postUniforms = new ArrayBuffer(64);
    const postView = new DataView(postUniforms);
    postView.setFloat32(0, outW, true);
    postView.setFloat32(4, outH, true);
    postView.setFloat32(8, performance.now() * 0.001, true);
    postView.setUint32(12, params.crtScanlines ? 1 : 0, true);
    postView.setFloat32(16, 0.30, true);               // scanlinesOpacity
    postView.setFloat32(20, 2.0, true);                // scanlinesSpacing
    postView.setUint32(24, params.chromaticAberration ? 1 : 0, true);
    postView.setFloat32(28, 2.5, true);                // chromaticOffset
    postView.setUint32(32, params.crtCurve ? 1 : 0, true);
    postView.setFloat32(36, 0.06, true);               // crtAmount
    postView.setUint32(40, (params.vignette && params.vignette > 0) ? 1 : 0, true);
    postView.setFloat32(44, params.vignette || 0.40, true); // vignetteIntensity
    postView.setFloat32(48, 0.75, true);               // vignetteRadius
    postView.setUint32(52, (params.grain && params.grain > 0) ? 1 : 0, true);
    postView.setFloat32(56, (params.grain || 0.05) * 100, true); // grainIntensity
    this.device.queue.writeBuffer(this.postUniformBuffer, 0, postUniforms);

    // Create Bind Groups
    const asciiBindGroup = this.device.createBindGroup({
      layout: this.asciiPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: srcTex.createView() },
        { binding: 2, resource: this.fontAtlas.texture.createView() },
        { binding: 3, resource: { buffer: this.asciiUniformBuffer } },
      ],
    });

    const postBindGroup = this.device.createBindGroup({
      layout: this.postPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: intermediateTex.createView() },
        { binding: 2, resource: { buffer: this.postUniformBuffer } },
      ],
    });

    // Execute Passes
    const commandEncoder = this.device.createCommandEncoder();

    // 1. Ascii pass -> intermediate texture
    const asciiPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: intermediateTex.createView(),
        clearValue: { r: bgR, g: bgG, b: bgB, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    asciiPass.setPipeline(this.asciiPipeline);
    asciiPass.setBindGroup(0, asciiBindGroup);
    asciiPass.draw(3);
    asciiPass.end();

    // 2. Post-processing CRT pass -> Canvas Swapchain
    const canvasTexture = this.context.getCurrentTexture();
    const postPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: canvasTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    postPass.setPipeline(this.postPipeline);
    postPass.setBindGroup(0, postBindGroup);
    postPass.draw(3);
    postPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
    return true;
  }
}
