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

  themeSelect.addEventListener('change', () => {
    const t = THEMES[themeSelect.value];
    if (!t) return;
    state.theme = themeSelect.value;
    state.colourMode = t.colour;
    state.bgHex = t.bg;
    state.fgHex = t.fg;
    document.getElementById('bg_hex').value = t.bg;
    document.getElementById('fg_hex').value = t.fg;
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

  return state;
}

function updateFontPreview(font) {
  const el = document.getElementById('font-preview');
  if (el) el.style.fontFamily = font;
}

