import { THEMES } from './engine.js';

export const DEFAULT_PARAMS = {
  cols: 120,
  charset: 'full',
  charAspect: 0.45,
  sharpen: 0.30,
  contrast: 1.20,
  gamma: 0.80,
  edgeWeight: 0.25,
  equalize: true,
  dither: true,
  invert: false,
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
  glyphMatch: false,
  glyphErrDiff: false,
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
  bindSelect('charset', 'charset');
  bindSlider('char_aspect', 'charAspect');
  bindSlider('sharpen', 'sharpen');

  bindSlider('contrast', 'contrast');
  bindSlider('gamma', 'gamma');
  bindSlider('edge_weight', 'edgeWeight');
  bindCheckbox('equalize', 'equalize');
  bindCheckbox('dither', 'dither');
  bindCheckbox('invert', 'invert');
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
      // Force reflow to restart animation
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

  document.getElementById('bg_hex').addEventListener('input', e => {
    state.bgHex = e.target.value; onChange(state);
  });
  document.getElementById('fg_hex').addEventListener('input', e => {
    state.fgHex = e.target.value; onChange(state);
  });

  bindCheckbox('saliency_aware', 'saliencyAware', 'saliency-sub');
  bindSlider('saliency_boost', 'saliencyBoost');

  // Advanced render modes are mutually exclusive — only one can be active at a time.
  const _advancedModes = [
    { id: 'fusion_v6',    key: 'fusionV6' },
    { id: 'freq_aware',   key: 'freqAware' },
    { id: 'glyph_match',  key: 'glyphMatch' },
    { id: 'glyph_err_diff', key: 'glyphErrDiff' },
  ];

  _advancedModes.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = state[key];
    el.addEventListener('change', () => {
      if (el.checked) {
        // Uncheck all other exclusive modes
        _advancedModes.forEach(m => {
          if (m.id !== id) {
            state[m.key] = false;
            const other = document.getElementById(m.id);
            if (other) other.checked = false;
          }
        });
      }
      state[key] = el.checked;
      onChange(state);
    });
  });

  bindSlider('font_size', 'fontSize', v => v);
  const fontSelect = document.getElementById('output_font');
  fontSelect.addEventListener('change', () => {
    state.outputFont = fontSelect.value;
    updateFontPreview(fontSelect.value);
    onChange(state);
  });
  updateFontPreview(state.outputFont);

  document.querySelectorAll('.section-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.section').classList.toggle('open');
    });
  });

  // Open IMAGE and TONE sections by default
  document.getElementById('sec-image').classList.add('open');
  document.getElementById('sec-tone').classList.add('open');

  const t = THEMES['noir'];
  document.getElementById('bg_hex').value = t.bg;
  document.getElementById('fg_hex').value = t.fg;
  updateThemeSwatch(t);

  // ── Gamma + equalize warning ───────────────────────────
  const gammaWarn = document.getElementById('gamma-warn');
  function updateGammaWarn() {
    if (!gammaWarn) return;
    const warn = state.equalize && state.gamma > 1.4;
    gammaWarn.style.display = warn ? 'inline' : 'none';
  }
  // Patch gamma and equalize bindings to also trigger warning
  document.getElementById('gamma').addEventListener('input', () => {
    state.gamma = parseFloat(document.getElementById('gamma').value);
    updateGammaWarn();
  });
  document.getElementById('equalize').addEventListener('change', updateGammaWarn);
  updateGammaWarn();

  // ── Reset to defaults ──────────────────────────────────
  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(state, DEFAULT_PARAMS);
    // Re-sync all DOM elements
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
    document.getElementById('edge_weight').value = DEFAULT_PARAMS.edgeWeight;
    document.getElementById('val-edge_weight').textContent = DEFAULT_PARAMS.edgeWeight.toFixed(2);
    document.getElementById('attenuation').value = DEFAULT_PARAMS.attenuation;
    document.getElementById('val-attenuation').textContent = DEFAULT_PARAMS.attenuation.toFixed(2);
    document.getElementById('vignette').value = DEFAULT_PARAMS.vignette;
    document.getElementById('val-vignette').textContent = DEFAULT_PARAMS.vignette.toFixed(2);
    document.getElementById('grain').value = DEFAULT_PARAMS.grain;
    document.getElementById('val-grain').textContent = DEFAULT_PARAMS.grain.toFixed(2);
    document.getElementById('multiscale_boost').value = DEFAULT_PARAMS.multiscaleBoost;
    document.getElementById('val-multiscale_boost').textContent = DEFAULT_PARAMS.multiscaleBoost.toFixed(2);
    document.getElementById('saliency_boost').value = DEFAULT_PARAMS.saliencyBoost;
    document.getElementById('val-saliency_boost').textContent = DEFAULT_PARAMS.saliencyBoost.toFixed(2);
    document.getElementById('font_size').value = DEFAULT_PARAMS.fontSize;
    document.getElementById('val-font_size').textContent = DEFAULT_PARAMS.fontSize;
    ['equalize','dither','invert','multiscale','saliency_aware',
      'fusion_v6','freq_aware','glyph_match','glyph_err_diff'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = !!DEFAULT_PARAMS[id.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    });
    document.getElementById('charset').value = DEFAULT_PARAMS.charset;
    document.getElementById('theme').value = DEFAULT_PARAMS.theme;
    const defTheme = THEMES[DEFAULT_PARAMS.theme];
    document.getElementById('bg_hex').value = defTheme.bg;
    document.getElementById('fg_hex').value = defTheme.fg;
    document.getElementById('multiscale-sub').style.display = 'none';
    document.getElementById('saliency-sub').style.display = 'none';
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

