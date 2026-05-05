import { THEMES, PORTRAIT_BINARY_DEFAULTS, RAW_CHARSETS } from './engine.js';

export const DEFAULT_PARAMS = {
  cols: 120,
  charset: 'common',
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
  theme: 'colour',
  bgHex: '#0a0a0a',
  bgTransparent: false,
  fgHex: '#ffffff',
  colourMode: true,
  fontSize: 6.0,
  verticalGap: 1.10,
  horizontalGap: 0.30,
  linkGaps: false,
  outputFont: "'JetBrains Mono',monospace",
  saliencyAware: true,
  saliencyBoost: 0.60,
  dataFlood: false,
};

export function initControls(onChange) {
  const state = { ...DEFAULT_PARAMS };

  const themeSelect = document.getElementById('theme');
  for (const [k, v] of Object.entries(THEMES)) {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = v.label;
    themeSelect.appendChild(opt);
  }
  themeSelect.value = 'colour';

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
  const charsetPreview = document.getElementById('charset-preview');
  charsetEl.value = state.charset;

  const updateCharsetPreview = () => {
    if (!charsetPreview) return;
    if (state.charset === 'custom') {
      charsetPreview.textContent = state.customCharset || 'Enter custom characters...';
    } else {
      charsetPreview.textContent = (RAW_CHARSETS[state.charset] || '').trim();
    }
  };

  charsetEl.addEventListener('change', () => {
    state.charset = charsetEl.value;
    if (state.charset === 'binary' || state.charset === 'numbers') {
      state.dataFlood = true;
      const dfEl = document.getElementById('data_flood');
      if (dfEl) dfEl.checked = true;
    }
    toggleCustomRow();
    updateCharsetPreview();
    onChange(state);
  });

  const toggleCustomRow = () => {
    customRow.style.display = state.charset === 'custom' ? '' : 'none';
  };
  toggleCustomRow();
  updateCharsetPreview();
  let customDebounce = null;
  customInput.addEventListener('input', () => {
    const val = customInput.value;
    state.customCharset = val;
    updateCharsetPreview();
    if (!val.trim() || val.trim().length < 2) return;
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
  bindCheckbox('data_flood', 'dataFlood');

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
  document.getElementById('bg_transparent').addEventListener('change', e => {
    state.bgTransparent = e.target.checked; onChange(state);
  });

  bindSlider('ml_saliency_boost', 'saliencyBoost');

   
  const _advancedModes = [
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

  bindSlider('font_size', 'fontSize', v => parseFloat(v).toFixed(2));
  
  // Custom binding for gaps to handle linking
  const vGapEl = document.getElementById('vertical_gap');
  const hGapEl = document.getElementById('horizontal_gap');
  const vGapLbl = document.getElementById('val-vertical_gap');
  const hGapLbl = document.getElementById('val-horizontal_gap');
  const btnLinkGaps = document.getElementById('btn-link-gaps');
  const iconLinkGaps = document.getElementById('icon-link-gaps');
  let gapRatio = state.verticalGap / (state.horizontalGap || 1);

  const updateLinkGapsUI = () => {
    if (state.linkGaps) {
      iconLinkGaps.innerHTML = `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>`;
      btnLinkGaps.classList.add('active');
    } else {
      iconLinkGaps.innerHTML = `<path d="M18.84 12.61a5 5 0 0 0-7.54-7.54l-3 3a5 5 0 0 0 .54 7.54"></path><path d="M5.16 11.39a5 5 0 0 0 7.54 7.54l3-3a5 5 0 0 0-.54-7.54"></path><line x1="8" y1="2" x2="16" y2="22"></line>`;
      btnLinkGaps.classList.remove('active');
    }
  };

  if (vGapEl && hGapEl) {
    vGapEl.value = state.verticalGap;
    hGapEl.value = state.horizontalGap;
    if (vGapLbl) vGapLbl.textContent = state.verticalGap.toFixed(2);
    if (hGapLbl) hGapLbl.textContent = state.horizontalGap.toFixed(2);

    vGapEl.addEventListener('input', () => {
      state.verticalGap = parseFloat(vGapEl.value);
      if (vGapLbl) vGapLbl.textContent = state.verticalGap.toFixed(2);
      if (state.linkGaps && gapRatio !== 0 && !isNaN(gapRatio)) {
        state.horizontalGap = state.verticalGap / gapRatio;
        hGapEl.value = state.horizontalGap;
        if (hGapLbl) hGapLbl.textContent = state.horizontalGap.toFixed(2);
      }
      onChange(state);
    });

    hGapEl.addEventListener('input', () => {
      state.horizontalGap = parseFloat(hGapEl.value);
      if (hGapLbl) hGapLbl.textContent = state.horizontalGap.toFixed(2);
      if (state.linkGaps && gapRatio !== 0 && !isNaN(gapRatio)) {
        state.verticalGap = state.horizontalGap * gapRatio;
        vGapEl.value = state.verticalGap;
        if (vGapLbl) vGapLbl.textContent = state.verticalGap.toFixed(2);
      }
      onChange(state);
    });
  }

  if (btnLinkGaps) {
    updateLinkGapsUI();
    btnLinkGaps.addEventListener('click', () => {
      state.linkGaps = !state.linkGaps;
      if (state.linkGaps) {
        gapRatio = state.verticalGap / (state.horizontalGap || 1);
      }
      updateLinkGapsUI();
    });
  }
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
  document.getElementById('sec-display').classList.add('open');

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

      ['contrast', 'gamma', 'exposure', 'edgeWeight', 'sharpen', 'cols', 'charAspect', 'fontSize', 'attenuation', 'vignette', 'grain', 'saliencyBoost'].forEach(k => {
        if (preset[k] === undefined) return;
        const domId = k === 'edgeWeight' ? 'edge_weight' : k === 'saliencyBoost' ? 'ml_saliency_boost' : k === 'charAspect' ? 'char_aspect' : k === 'fontSize' ? 'font_size' : k;
        const el = document.getElementById(domId);
        if (el) {
          el.value = preset[k];
          const lbl = document.getElementById(`val-${domId}`);
          if (lbl) lbl.textContent = (k === 'fontSize' || k === 'cols') ? preset[k] : preset[k].toFixed(2);
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
    document.getElementById('val-char_aspect').textContent = DEFAULT_PARAMS.charAspect.toFixed(2);
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

    ['equalize', 'dither', 'invert', 'show_mask', 'multiscale', 'saliency_aware', 'random_overlay', 'bg_transparent'].forEach(id => {
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
    if (document.getElementById('multiscale-sub')) document.getElementById('multiscale-sub').style.display = 'none';
    if (document.getElementById('saliency-sub')) document.getElementById('saliency-sub').style.display = 'none';
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