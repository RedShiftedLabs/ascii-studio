import { THEMES, PORTRAIT_BINARY_DEFAULTS, RAW_CHARSETS } from './engine.js';
import { PALETTES } from './palettes.js';

export const DEFAULT_PARAMS = {
  effectMode: 'ascii',
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
  customCharset: '',
  // Grainrad effects & retro parameters
  palette: 'gameboy',
  ditherMethod: 'bayer8x8',
  crtScanlines: false,
  chromaticAberration: false,
  crtCurve: false,
  halftoneSpacing: 8,
  halftoneAngle: 45,
  waveLineCount: 50,
  pixelSortThreshold: 0.35,
  contourLevels: 8,
  crosshatchDensity: 7,
  blockifySize: 8,
};

export function initControls(onChange) {
  const state = { ...DEFAULT_PARAMS };

  // Populate Themes
  const themeSelect = document.getElementById('theme');
  if (themeSelect) {
    for (const [k, v] of Object.entries(THEMES)) {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = v.label;
      themeSelect.appendChild(opt);
    }
    themeSelect.value = state.theme;
  }

  // Populate Retro Palettes
  const palSelect = document.getElementById('palette');
  const palChips = document.getElementById('palette-chips');
  
  function updatePaletteChips(palKey) {
    if (!palChips) return;
    const p = PALETTES[palKey];
    palChips.innerHTML = '';
    if (!p || !p.colors || p.colors.length === 0) {
      palChips.innerHTML = '<span style="font-size:10px;color:var(--text-3);">Full RGB Spectrum</span>';
      return;
    }
    p.colors.slice(0, 16).forEach(c => {
      const chip = document.createElement('div');
      chip.style.cssText = `width:12px;height:12px;border-radius:2px;background:${c};border:1px solid rgba(255,255,255,0.15);`;
      chip.title = c;
      palChips.appendChild(chip);
    });
  }

  if (palSelect) {
    for (const [k, v] of Object.entries(PALETTES)) {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = `${v.name} (${v.category})`;
      palSelect.appendChild(opt);
    }
    palSelect.value = state.palette;
    updatePaletteChips(state.palette);

    palSelect.addEventListener('change', () => {
      state.palette = palSelect.value;
      updatePaletteChips(state.palette);
      onChange(state);
    });
  }

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

  // Effect Mode Selector (ASCII, Matrix, Dithering, Halftone, Wave Lines, Pixel Sort, Contour, Crosshatch, Blockify)
  const effectBtns = document.querySelectorAll('.effect-pill');
  effectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      effectBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.effectMode = btn.dataset.mode;

      // Adjust UI panel focus based on mode
      const secPalette = document.getElementById('sec-palette');
      const secImage = document.getElementById('sec-image');
      if (state.effectMode === 'ascii') {
        if (secImage) secImage.classList.add('open');
      } else {
        if (secPalette) secPalette.classList.add('open');
      }

      onChange(state);
    });
  });

  bindSlider('cols', 'cols', v => v);

  const charsetEl = document.getElementById('charset');
  const customRow = document.getElementById('custom-charset-row');
  const customInput = document.getElementById('custom_charset');
  const charsetPreview = document.getElementById('charset-preview');
  if (charsetEl) charsetEl.value = state.charset;

  const updateCharsetPreview = () => {
    if (!charsetPreview) return;
    if (state.charset === 'custom') {
      charsetPreview.textContent = state.customCharset || 'Enter custom characters...';
    } else {
      charsetPreview.textContent = (RAW_CHARSETS[state.charset] || '').trim();
    }
  };

  const toggleCustomRow = () => {
    if (customRow) customRow.style.display = state.charset === 'custom' ? '' : 'none';
  };

  if (charsetEl) {
    charsetEl.addEventListener('change', () => {
      state.charset = charsetEl.value;
      if (state.charset === 'binary') {
        state.dataFlood = true;
        const dfEl = document.getElementById('data_flood');
        if (dfEl) dfEl.checked = true;
      }
      toggleCustomRow();
      updateCharsetPreview();
      onChange(state);
    });
  }

  toggleCustomRow();
  updateCharsetPreview();

  if (customInput) {
    let customDebounce = null;
    customInput.addEventListener('input', () => {
      const val = customInput.value;
      state.customCharset = val;
      updateCharsetPreview();
      if (!val.trim() || val.trim().length < 2) return;
      clearTimeout(customDebounce);
      customDebounce = setTimeout(() => onChange(state), 400);
    });
  }

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

  // Grainrad Retro & Post-Processing Controls
  bindSelect('dither_method', 'ditherMethod');
  bindCheckbox('crt_scanlines', 'crtScanlines');
  bindCheckbox('chromatic_aberration', 'chromaticAberration');
  bindCheckbox('crt_curve', 'crtCurve');

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
      if (el) {
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 400);
      }
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      state.theme = themeSelect.value;
      const t = THEMES[state.theme];
      if (t) {
        state.bgHex = t.bg;
        state.fgHex = t.fg;
        state.colourMode = t.colour;
        const bgEl = document.getElementById('bg_hex');
        const fgEl = document.getElementById('fg_hex');
        if (bgEl) bgEl.value = t.bg;
        if (fgEl) fgEl.value = t.fg;
        updateThemeSwatch(t);
        flashColorPickers();
      }
      onChange(state);
    });
  }

  bindSlider('attenuation', 'attenuation');
  bindSlider('vignette', 'vignette');
  bindSlider('grain', 'grain');

  const bgHexEl = document.getElementById('bg_hex');
  const fgHexEl = document.getElementById('fg_hex');
  if (bgHexEl) {
    bgHexEl.addEventListener('input', () => {
      state.bgHex = bgHexEl.value;
      const swBg = document.getElementById('swatch-bg');
      if (swBg) swBg.style.background = state.bgHex;
      onChange(state);
    });
  }
  if (fgHexEl) {
    fgHexEl.addEventListener('input', () => {
      state.fgHex = fgHexEl.value;
      const swFg = document.getElementById('swatch-fg');
      if (swFg) swFg.style.background = state.fgHex;
      onChange(state);
    });
  }

  bindCheckbox('bg_transparent', 'bgTransparent');

  bindSlider('ml_saliency_boost', 'saliencyBoost');
  bindCheckbox('saliency_aware', 'saliencyAware', 'saliency-sub');

  bindSlider('font_size', 'fontSize', v => parseFloat(v).toFixed(2));
  
  // Gaps handling
  const vGapEl = document.getElementById('vertical_gap');
  const hGapEl = document.getElementById('horizontal_gap');
  const vGapLbl = document.getElementById('val-vertical_gap');
  const hGapLbl = document.getElementById('val-horizontal_gap');
  const btnLinkGaps = document.getElementById('btn-link-gaps');
  const iconLinkGaps = document.getElementById('icon-link-gaps');
  let gapRatio = state.verticalGap / (state.horizontalGap || 1);

  const updateLinkGapsUI = () => {
    if (!iconLinkGaps || !btnLinkGaps) return;
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

  // Section accordions
  document.querySelectorAll('.section-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.section').classList.toggle('open');
    });
  });

  document.getElementById('sec-image')?.classList.add('open');
  document.getElementById('sec-palette')?.classList.add('open');
  document.getElementById('sec-tone')?.classList.add('open');

  const t = THEMES[DEFAULT_PARAMS.theme] || THEMES['colour'];
  const bgElInit = document.getElementById('bg_hex');
  const fgElInit = document.getElementById('fg_hex');
  if (bgElInit) bgElInit.value = t.bg;
  if (fgElInit) fgElInit.value = t.fg;
  updateThemeSwatch(t);

  const gammaWarn = document.getElementById('gamma-warn');
  function updateGammaWarn() {
    if (!gammaWarn) return;
    const warn = state.equalize && state.gamma > 1.4;
    gammaWarn.style.display = warn ? 'inline' : 'none';
  }
  document.getElementById('gamma')?.addEventListener('input', () => {
    state.gamma = parseFloat(document.getElementById('gamma').value);
    updateGammaWarn();
  });
  document.getElementById('equalize')?.addEventListener('change', updateGammaWarn);
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

      if (preset.saliencyAware !== undefined) {
        const salSub = document.getElementById('saliency-sub');
        if (salSub) salSub.style.display = preset.saliencyAware ? '' : 'none';
      }
      if (preset.multiscale !== undefined) {
        const multiSub = document.getElementById('multiscale-sub');
        if (multiSub) multiSub.style.display = preset.multiscale ? '' : 'none';
      }

      if (preset.charset) {
        const csEl = document.getElementById('charset');
        if (csEl) csEl.value = preset.charset;
        toggleCustomRow();
        updateCharsetPreview();
      }

      updateGammaWarn();
      onChange(state);
    });
  }

  // Complete Reset Button
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Object.assign(state, DEFAULT_PARAMS);

      // Effect pills
      effectBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === DEFAULT_PARAMS.effectMode));

      // Reset all inputs & labels
      const resetVals = {
        cols: DEFAULT_PARAMS.cols,
        char_aspect: DEFAULT_PARAMS.charAspect,
        sharpen: DEFAULT_PARAMS.sharpen,
        contrast: DEFAULT_PARAMS.contrast,
        gamma: DEFAULT_PARAMS.gamma,
        exposure: DEFAULT_PARAMS.exposure,
        edge_weight: DEFAULT_PARAMS.edgeWeight,
        alpha_threshold: DEFAULT_PARAMS.alphaThreshold,
        attenuation: DEFAULT_PARAMS.attenuation,
        vignette: DEFAULT_PARAMS.vignette,
        grain: DEFAULT_PARAMS.grain,
        multiscale_boost: DEFAULT_PARAMS.multiscaleBoost,
        ml_saliency_boost: DEFAULT_PARAMS.saliencyBoost,
        font_size: DEFAULT_PARAMS.fontSize,
        vertical_gap: DEFAULT_PARAMS.verticalGap,
        horizontal_gap: DEFAULT_PARAMS.horizontalGap,
      };

      for (const [id, val] of Object.entries(resetVals)) {
        const el = document.getElementById(id);
        const lbl = document.getElementById('val-' + id);
        if (el) el.value = val;
        if (lbl) lbl.textContent = (id === 'cols' || id === 'font_size') ? val : Number(val).toFixed(2);
      }

      ['equalize', 'dither', 'invert', 'show_mask', 'multiscale', 'saliency_aware', 'data_flood', 'bg_transparent', 'crt_scanlines', 'chromatic_aberration', 'crt_curve'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = !!DEFAULT_PARAMS[id.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
      });

      if (charsetEl) charsetEl.value = DEFAULT_PARAMS.charset;
      if (customInput) customInput.value = '';
      if (themeSelect) themeSelect.value = DEFAULT_PARAMS.theme;
      if (palSelect) {
        palSelect.value = DEFAULT_PARAMS.palette;
        updatePaletteChips(DEFAULT_PARAMS.palette);
      }
      if (fontSelect) fontSelect.value = DEFAULT_PARAMS.outputFont;
      if (presetDropdown) presetDropdown.value = 'default';

      const defTheme = THEMES[DEFAULT_PARAMS.theme];
      if (bgElInit) bgElInit.value = defTheme.bg;
      if (fgElInit) fgElInit.value = defTheme.fg;

      const multiSub = document.getElementById('multiscale-sub');
      const salSub = document.getElementById('saliency-sub');
      if (multiSub) multiSub.style.display = DEFAULT_PARAMS.multiscale ? '' : 'none';
      if (salSub) salSub.style.display = DEFAULT_PARAMS.saliencyAware ? '' : 'none';

      state.linkGaps = false;
      updateLinkGapsUI();
      toggleCustomRow();
      updateCharsetPreview();
      updateThemeSwatch(defTheme);
      updateFontPreview(DEFAULT_PARAMS.outputFont);
      flashColorPickers();
      updateGammaWarn();
      onChange(state);
    });
  }

  return state;
}

function updateFontPreview(font) {
  const el = document.getElementById('font-preview');
  if (el) el.style.fontFamily = font;
}
