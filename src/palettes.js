// Retro & Artistic Color Palettes inspired by Grainrad & vintage computing hardware

export const PALETTES = {
  original: {
    name: 'Original Colors',
    category: 'Full Color',
    colors: [], // Pass-through
  },
  gameboy: {
    name: 'Nintendo GameBoy',
    category: 'Retro Gaming',
    colors: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
  },
  cga: {
    name: 'IBM CGA (16-color)',
    category: 'Retro Gaming',
    colors: [
      '#000000', '#0000AA', '#00AA00', '#00AAAA',
      '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
      '#555555', '#5555FF', '#55FF55', '#55FFFF',
      '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
    ],
  },
  pico8: {
    name: 'PICO-8 (16-color)',
    category: 'Retro Gaming',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
    ],
  },
  c64: {
    name: 'Commodore 64 (16-color)',
    category: 'Retro Gaming',
    colors: [
      '#000000', '#FFFFFF', '#68372B', '#70A4B2',
      '#6F3D86', '#588D43', '#352879', '#B8C76F',
      '#6F4F25', '#433900', '#9A6759', '#444444',
      '#6C6C6C', '#9AD284', '#6C5EB5', '#959595',
    ],
  },
  apple2: {
    name: 'Apple II (16-color)',
    category: 'Retro Gaming',
    colors: [
      '#000000', '#E31E60', '#604EBD', '#FF44FD',
      '#00A360', '#9C9C9C', '#14CFFD', '#D0C3FF',
      '#607203', '#FF6A3C', '#9C9C9C', '#FFA0D0',
      '#14F53C', '#D0DD8D', '#72FFD0', '#FFFFFF',
    ],
  },
  macintosh: {
    name: 'Macintosh System 7 (16-color)',
    category: 'Retro Gaming',
    colors: [
      '#FFFFFF', '#FCF305', '#FF6402', '#DD0806',
      '#F20884', '#4600A5', '#0000D4', '#02ABEA',
      '#1FB714', '#006411', '#562C05', '#90713A',
      '#C0C0C0', '#808080', '#404040', '#000000',
    ],
  },
  cyberpunk: {
    name: 'Cyberpunk Neon (6-color)',
    category: 'Artistic',
    colors: ['#0D0221', '#0F084B', '#26081C', '#FF2A6D', '#05D9E8', '#D1F7FF'],
  },
  sepia: {
    name: 'Vintage Sepia (5-color)',
    category: 'Artistic',
    colors: ['#704214', '#8B6914', '#C19A6B', '#EFDCC3', '#FFF8DC'],
  },
  risograph: {
    name: 'Risograph Print (5-color)',
    category: 'Print',
    colors: ['#FF48B0', '#FFE800', '#00D4B2', '#004CE5', '#1A1A1A'],
  },
  newspaper: {
    name: 'Newsprint (2-color)',
    category: 'Print',
    colors: ['#1A1815', '#F5EFEB'],
  },
  vt320: {
    name: 'DEC VT320 Amber CRT',
    category: 'Terminal',
    colors: ['#0A0A08', '#664400', '#996A00', '#FFB000', '#FFCC40'],
  },
  cassette: {
    name: 'Matrix Cyber Green',
    category: 'Terminal',
    colors: ['#000000', '#003300', '#00802B', '#00FF41', '#66FF66'],
  },
};

// Pre-parse hex colors to RGB arrays for ultra-fast distance queries
const _parsedPalettes = new Map();

export function getParsedPalette(key) {
  if (_parsedPalettes.has(key)) return _parsedPalettes.get(key);
  const pal = PALETTES[key];
  if (!pal || !pal.colors || pal.colors.length === 0) return null;

  const rgbList = pal.colors.map(hex => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  });

  _parsedPalettes.set(key, rgbList);
  return rgbList;
}

// Find closest color in palette using perceptual weights (fast squared Euclidean)
export function findNearestColor(r, g, b, paletteRgb) {
  if (!paletteRgb || paletteRgb.length === 0) return [r, g, b];
  let minD = Infinity;
  let best = paletteRgb[0];

  for (let i = 0; i < paletteRgb.length; i++) {
    const p = paletteRgb[i];
    // Perceptually weighted color difference: red=0.30, green=0.59, blue=0.11
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const d = 0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
    if (d < minD) {
      minD = d;
      best = p;
    }
  }
  return best;
}
