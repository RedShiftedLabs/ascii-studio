import { THEMES, PORTRAIT_BINARY_DEFAULTS } from './engine.js';

export const DEFAULT_PARAMS = {
  cols: 120,
  charset: 'full',
  charAspect: 0.45,
  sharpen: 0.30,
  contrast: 1.20,
  gamma: 0.80,
  exposure: 1.0,
  edgeWeight: 0.25,
  equalize: true,
  dither: true,
  invert: false,
  showMask: false,
  alphaThreshold: 0.5,
  multiscale: false,
  multiscaleBoost: 1.2,
  attenuation: 0.70,
  vignette: 0.40,
  grain: 0.05,
  theme: 'noir',
  bgHex: '#0a0a0a',
  fgHex: '#c8c8c8',
  colourMode: false,
  fontSize: 6,
  outputFont: "'Courier New',Courier,monospace",
  saliencyAware: false,
  saliencyBoost: 0.60,
  fusionV6: false,
  freqAware: false,
  freqAwareCohThresh: 0.25,
  freqAwareEngThresh: 0.02,
  glyphMatch: false,
  glyphErrDiff: false,
  randomOverlay: false,
};

export function initControls(onChange) {
  const state = { ...DEFAULT_PARAMS };

  const themeSelect = document.getElementById('theme');
  for (const [k, v] of Object.entries(THEMES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    themeSelect.appendChild(opt);
  }
  themeSelect.value = 'noir';

  function bindSlider(id, key, fmt = v => parseFloat(v).toFixed(2)) {
    const el = document.getElementById(id);
    const lbl = document.getElementById('val-' + id);
    if (!el) return;
    el.value = state[key];
    if (lbl) lbl.textContent = fmt(state[key]);
    el.addEventListener('input', () => {
      state[key] = parseFloat(el.value);
      if (lbl) lbl.textContent = fmt(el.value);
      onChange(state);
    });
  }

  function bindSelect(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = state[key];
    el.addEventListener('change', () => { state[key] = el.value; onChange(state); });
  }

  function bindCheckbox(id, key, subCtrlId = null) {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = state[key];
    const sub = subCtrlId ? document.getElementById(subCtrlId) : null;
    if (sub) sub.style.display = state[key] ? '' : 'none';
    el.addEventListener('change', () => {
      state[key] = el.checked;
      if (sub) sub.style.display = el.checked ? '' : 'none';
      onChange(state);
    });
  }

  bindSlider('cols', 'cols', v => v);

  const charsetEl = document.getElementById('charset');
  const customRow = document.getElementById('custom-charset-row');
  const customInput = document.getElementById('custom_charset');
  charsetEl.value = state.charset;
  const toggleCustomRow = () => {
    customRow.style.display = state.charset === 'custom' ? '' : 'none';
  };
  toggleCustomRow();
  charsetEl.addEventListener('change', () => {
    state.charset = charsetEl.value;
    toggleCustomRow();
    onChange(state);
  });
  let customDebounce = null;
  customInput.addEventListener('input', () => {
    const val = customInput.value.trim();
    if (!val || val.length < 2) return;
    state.customCharset = val;
    clearTimeout(customDebounce);
    customDebounce = setTimeout(() => onChange(state), 500);
  });

  bindSlider('char_aspect', 'charAspect');
  bindSlider('sharpen', 'sharpen');
  bindSlider('contrast', 'contrast');
  bindSlider('gamma', 'gamma');
  bindSlider('exposure', 'exposure');
  bindSlider('edge_weight', 'edgeWeight');
  bindCheckbox('equalize', 'equalize');
  bindCheckbox('dither', 'dither');
  bindCheckbox('invert', 'invert');
  bindCheckbox('show_mask', 'showMask');
  bindSlider('alpha_threshold', 'alphaThreshold');
  bindCheckbox('multiscale', 'multiscale', 'multiscale-sub');
  bindSlider('multiscale_boost', 'multiscaleBoost');

  function updateThemeSwatch(theme) {
    const swBg = document.getElementById('swatch-bg');
    const swFg = document.getElementById('swatch-fg');
    const swLbl = document.getElementById('swatch-label');
    if (swBg) swBg.style.background = theme.bg;
    if (swFg) swFg.style.background = theme.fg;
    if (swLbl) swLbl.textContent = `${theme.bg} / ${theme.fg}`;
  }

  function flashColorPickers() {
    ['bg_hex', 'fg_hex'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('color-flash');
      void el.offsetWidth;
      el.classList.add('color-flash');
    });
  }

  themeSelect.addEventListener('change', () => {
    const t = THEMES[themeSelect.value];
    if (!t) return;
    state.theme = themeSelect.value;
    state.colourMode = t.colour;
    state.bgHex = t.bg;
    state.fgHex = t.fg;
    document.getElementById('bg_hex').value = t.bg;
    document.getElementById('fg_hex').value = t.fg;
    updateThemeSwatch(t);
    flashColorPickers();
    onChange(state);
  });

  bindSlider('attenuation', 'attenuation');
  bindSlider('vignette', 'vignette');
  bindSlider('grain', 'grain');

  document.getElementById('fg_hex').addEventListener('input', e => {
    state.fgHex = e.target.value; onChange(state);
  });
  document.getElementById('bg_hex').addEventListener('input', e => {
    state.bgHex = e.target.value; onChange(state);
  });

  bindSlider('saliency_boost', 'saliencyBoost');

  // Advanced render modes — mutually exclusive
  const _advancedModes = [
    { id: 'fusion_v6',      key: 'fusionV6' },
    { id: 'freq_aware',     key: 'freqAware', subCtrlId: 'freq-aware-sub' },
    { id: 'glyph_match',    key: 'glyphMatch' },
    { id: 'glyph_err_diff', key: 'glyphErrDiff' },
    { id: 'random_overlay', key: 'randomOverlay' },
    { id: 'saliency_aware', key: 'saliencyAware', subCtrlId: 'saliency-sub' },
  ];

  _advancedModes.forEach(({ id, key, subCtrlId }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = state[key];
    const sub = subCtrlId ? document.getElementById(subCtrlId) : null;
    if (sub) sub.style.display = state[key] ? '' : 'none';
    el.addEventListener('change', () => {
      if (el.checked) {
        _advancedModes.forEach(m => {
          if (m.id !== id) {
            state[m.key] = false;
            const other = document.getElementById(m.id);
            if (other) other.checked = false;
            if (m.subCtrlId) {
              const subEl = document.getElementById(m.subCtrlId);
              if (subEl) subEl.style.display = 'none';
            }
          }
        });
      }
      state[key] = el.checked;
      if (sub) sub.style.display = el.checked ? '' : 'none';
      onChange(state);
    });
  });

  bindSlider('freq_aware_coh_thresh', 'freqAwareCohThresh');
  bindSlider('freq_aware_eng_thresh', 'freqAwareEngThresh');

  bindSlider('font_size', 'fontSize', v => v);
  const fontSelect = document.getElementById('output_font');
  if (fontSelect) {
    fontSelect.value = state.outputFont;
    fontSelect.addEventListener('change', () => {
      state.outputFont = fontSelect.value;
      updateFontPreview(fontSelect.value);
      onChange(state);
    });
    updateFontPreview(state.outputFont);
  }

  document.querySelectorAll('.section-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.section').classList.toggle('open');
    });
  });

  document.getElementById('sec-image').classList.add('open');
  document.getElementById('sec-tone').classList.add('open');

  const t = THEMES['noir'];
  document.getElementById('bg_hex').value = t.bg;
  document.getElementById('fg_hex').value = t.fg;
  updateThemeSwatch(t);

  const gammaWarn = document.getElementById('gamma-warn');
  function updateGammaWarn() {
    if (!gammaWarn) return;
    const warn = state.equalize && state.gamma > 1.4;
    gammaWarn.style.display = warn ? 'inline' : 'none';
  }
  document.getElementById('gamma').addEventListener('input', () => {
    state.gamma = parseFloat(document.getElementById('gamma').value);
    updateGammaWarn();
  });
  document.getElementById('equalize').addEventListener('change', updateGammaWarn);
  updateGammaWarn();

  const TONE_PRESETS = {
    default: { contrast: 1.20, gamma: 0.80, exposure: 1.0, edgeWeight: 0.25, sharpen: 0.30, equalize: true },
    high_contrast: { contrast: 2.0, gamma: 0.70, exposure: 1.1, edgeWeight: 0.50, sharpen: 0.50, equalize: true },
    muted: { contrast: 0.80, gamma: 1.20, exposure: 1.0, edgeWeight: 0.10, sharpen: 0.10, equalize: false },
    dark: { contrast: 1.50, gamma: 0.50, exposure: 0.80, edgeWeight: 0.80, sharpen: 0.60, equalize: true },
    bright: { contrast: 1.10, gamma: 1.50, exposure: 1.30, edgeWeight: 0.20, sharpen: 0.30, equalize: false },
    portrait_binary: PORTRAIT_BINARY_DEFAULTS,
  };

  const presetDropdown = document.getElementById('tone_preset');
  if (presetDropdown) {
    presetDropdown.addEventListener('change', (e) => {
      const preset = TONE_PRESETS[e.target.value];
      if (!preset) return;
      Object.assign(state, preset);

      ['contrast', 'gamma', 'exposure', 'edgeWeight', 'sharpen', 'cols', 'charAspect', 'fontSize', 'attenuation', 'vignette', 'grain', 'mlSaliencyBoost'].forEach(k => {
        if (preset[k] === undefined) return;
        const domId = k === 'edgeWeight' ? 'edge_weight' : k === 'mlSaliencyBoost' ? 'ml_saliency_boost' : k === 'charAspect' ? 'char_aspect' : k === 'fontSize' ? 'font_size' : k;
        const el = document.getElementById(domId);
        if (el) {
          el.value = preset[k];
          const lbl = document.getElementById(`val-${domId}`);
          if (lbl) lbl.textContent = k === 'fontSize' ? preset[k] : preset[k].toFixed(2);
        }
      });

      ['equalize', 'dither', 'invert', 'showMask', 'multiscale', 'saliencyAware'].forEach(k => {
        if (preset[k] === undefined) return;
        const domId = k === 'saliencyAware' ? 'saliency_aware' : k.replace(/([A-Z])/g, "_$1").toLowerCase();
        const el = document.getElementById(domId);
        if (el) el.checked = preset[k];
      });

      if (preset.charset) {
        document.getElementById('charset').value = preset.charset;
        document.getElementById('custom-charset-row').style.display = preset.charset === 'custom' ? '' : 'none';
      }

      updateGammaWarn();
      onChange(state);
    });
  }

  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(state, DEFAULT_PARAMS);

    document.getElementById('cols').value = DEFAULT_PARAMS.cols;
    document.getElementById('val-cols').textContent = DEFAULT_PARAMS.cols;
    document.getElementById('char_aspect').value = DEFAULT_PARAMS.charAspect;
    document.getElementById('val-char_aspect').textContent = DEFAULT_PARAMS.charAspect;
    document.getElementById('sharpen').value = DEFAULT_PARAMS.sharpen;
    document.getElementById('val-sharpen').textContent = DEFAULT_PARAMS.sharpen.toFixed(2);
    document.getElementById('contrast').value = DEFAULT_PARAMS.contrast;
    document.getElementById('val-contrast').textContent = DEFAULT_PARAMS.contrast.toFixed(2);
    document.getElementById('gamma').value = DEFAULT_PARAMS.gamma;
    document.getElementById('val-gamma').textContent = DEFAULT_PARAMS.gamma.toFixed(2);
    document.getElementById('exposure').value = DEFAULT_PARAMS.exposure;
    document.getElementById('val-exposure').textContent = DEFAULT_PARAMS.exposure.toFixed(2);
    document.getElementById('edge_weight').value = DEFAULT_PARAMS.edgeWeight;
    document.getElementById('val-edge_weight').textContent = DEFAULT_PARAMS.edgeWeight.toFixed(2);
    document.getElementById('alpha_threshold').value = DEFAULT_PARAMS.alphaThreshold;
    document.getElementById('val-alpha_threshold').textContent = DEFAULT_PARAMS.alphaThreshold.toFixed(2);
    document.getElementById('attenuation').value = DEFAULT_PARAMS.attenuation;
    document.getElementById('val-attenuation').textContent = DEFAULT_PARAMS.attenuation.toFixed(2);
    document.getElementById('vignette').value = DEFAULT_PARAMS.vignette;
    document.getElementById('val-vignette').textContent = DEFAULT_PARAMS.vignette.toFixed(2);
    document.getElementById('grain').value = DEFAULT_PARAMS.grain;
    document.getElementById('val-grain').textContent = DEFAULT_PARAMS.grain.toFixed(2);
    document.getElementById('multiscale_boost').value = DEFAULT_PARAMS.multiscaleBoost;
    document.getElementById('val-multiscale_boost').textContent = DEFAULT_PARAMS.multiscaleBoost.toFixed(2);
    document.getElementById('ml_saliency_boost').value = DEFAULT_PARAMS.saliencyBoost;
    document.getElementById('val-ml_saliency_boost').textContent = DEFAULT_PARAMS.saliencyBoost.toFixed(2);
    document.getElementById('font_size').value = DEFAULT_PARAMS.fontSize;
    document.getElementById('val-font_size').textContent = DEFAULT_PARAMS.fontSize;

    ['equalize', 'dither', 'invert', 'show_mask', 'multiscale', 'saliency_aware',
     'fusion_v6','freq_aware','glyph_match','glyph_err_diff','random_overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = !!DEFAULT_PARAMS[id.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    });

    document.getElementById('charset').value = DEFAULT_PARAMS.charset;
    document.getElementById('theme').value = DEFAULT_PARAMS.theme;
    document.getElementById('output_font').value = DEFAULT_PARAMS.outputFont;
    document.getElementById('tone_preset').value = 'default';

    const defTheme = THEMES[DEFAULT_PARAMS.theme];
    document.getElementById('bg_hex').value = defTheme.bg;
    document.getElementById('fg_hex').value = defTheme.fg;
    document.getElementById('multiscale-sub').style.display = 'none';
    document.getElementById('saliency-sub').style.display = 'none';
    document.getElementById('freq-aware-sub').style.display = 'none';
    updateThemeSwatch(defTheme);
    flashColorPickers();
    updateGammaWarn();
    onChange(state);
  });

  return state;
}

function updateFontPreview(font) {
  const el = document.getElementById('font-preview');
  if (el) el.style.fontFamily = font;
}