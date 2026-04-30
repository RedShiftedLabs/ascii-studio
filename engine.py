from __future__ import annotations

import io
import warnings
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from scipy.ndimage import sobel

warnings.filterwarnings("ignore")

RAW_CHARSETS: dict[str, str] = {
    "full":      ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    "minimal":   ' .:-=+*#%@',
    "blocks":    ' ░▒▓█',
    "dots":      ' ·∘○◉●',
    "hatching":  ' ─━═╬+#@',
    "geometric": ' ▪▫◆◇■□▲△●',
    "braille":   (' ⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟'
                  '⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿'),
    "lineart":   ' .,:;i|/\\()[]{}tfjl!-_+=xXYZO0#%@',
    "edges":     ' .-+|/\\xX#@',
    "binary":    ' 01',
    "numbers":   ' 1732456908',
}

THEMES: dict[str, tuple] = {
    "noir":         ("#0a0a0a", "#c8c8c8", False, "Classic black & white"),
    "amber":        ("#0f0900", "#ffb347", False, "Warm amber terminal"),
    "matrix":       ("#000300", "#00ff41", False, "Green phosphor"),
    "ice":          ("#020810", "#a8d8f0", False, "Cool blue CRT"),
    "sepia":        ("#1a1209", "#c8a97a", False, "Vintage sepia"),
    "rose":         ("#0d0508", "#e8a0b4", False, "Rose gold terminal"),
    "colour":       ("#0a0a0a", "#ffffff", True,  "Full colour (pixel RGB)"),
    "colour_amber": ("#0f0900", "#ffb347", True,  "Colour tinted warm"),
}

_density_cache: dict = {}
_glyph_atlas_cache: dict = {}

def measure_char_density(chars: str, size: int = 16) -> str:
    key = (chars, size)
    if key in _density_cache:
        return _density_cache[key]
    font = _load_mono_font(size)
    densities: dict[str, float] = {}
    for ch in chars:
        canvas = Image.new("L", (size, size), 255)
        ImageDraw.Draw(canvas).text((1, 1), ch, fill=0, font=font)
        densities[ch] = 1.0 - np.asarray(canvas, dtype=np.float32).mean() / 255.0
    sorted_chars = "".join(sorted(densities, key=lambda c: densities[c]))
    _density_cache[key] = sorted_chars
    return sorted_chars


def compute_brightness(img_array: np.ndarray) -> np.ndarray:
    """ITU-R BT.709 perceptual luminance."""
    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
    return (0.2126 * r + 0.7152 * g + 0.0722 * b).astype(np.float32)


def sharpen_image(img_array: np.ndarray, strength: float) -> np.ndarray:
    if strength == 0:
        return img_array
    pil = Image.fromarray(img_array)
    return np.asarray(ImageEnhance.Sharpness(pil).enhance(1.0 + strength * 3.0), dtype=np.uint8)


def resize_for_ascii(brightness: np.ndarray, cols: int, char_aspect: float = 0.45) -> np.ndarray:
    h, w = brightness.shape
    rows = max(1, int(cols * (h / w) * char_aspect))
    return np.asarray(Image.fromarray(brightness).resize((cols, rows), Image.Resampling.LANCZOS), dtype=np.float32)


def resize_colour(img_array: np.ndarray, cols: int, char_aspect: float = 0.45) -> np.ndarray:
    h, w = img_array.shape[:2]
    rows = max(1, int(cols * (h / w) * char_aspect))
    return np.asarray(Image.fromarray(img_array).resize((cols, rows), Image.Resampling.LANCZOS), dtype=np.uint8)


class MultiScaleContext:
    def __init__(self, base: np.ndarray, d0: np.ndarray, d1: np.ndarray, d2: np.ndarray):
        self.base = base
        self.d0 = d0
        self.d1 = d1
        self.d2 = d2

def apply_multiscale_enhancement(bright: np.ndarray, boost: float) -> MultiScaleContext:
    if boost <= 0:
        zero_d = np.zeros_like(bright)
        return MultiScaleContext(bright, zero_d, zero_d, zero_d)
        
    from scipy.ndimage import gaussian_filter, uniform_filter, sobel
    

    # 1. Gaussian Pyramid

    g1 = gaussian_filter(bright, sigma=1.0)
    g2 = gaussian_filter(bright, sigma=2.0)
    g3 = gaussian_filter(bright, sigma=4.0)
    
    d0 = bright - g1
    
    # Noise-aware damping & scale-dependent sharpening for fine detail
    noise_floor = np.percentile(np.abs(d0), 30)
    d0 = d0 * (np.abs(d0) > noise_floor)
    d0 = gaussian_filter(d0, sigma=0.5)
    
    d1 = g1 - g2
    d2 = g2 - g3
    

    # 2. Normalize (preserve relative energy!)

    def safe_norm(d):
        return d / (np.std(d) + 1e-6)
        
    d0_n = safe_norm(d0)
    d1_n = safe_norm(d1)
    d2_n = safe_norm(d2)
    
    # Restore relative magnitudes
    scale0 = np.std(d0)
    scale1 = np.std(d1)
    scale2 = np.std(d2)
    d0 = d0_n * scale0
    d1 = d1_n * scale1
    d2 = d2_n * scale2
    

    # 3. Content-aware weighting

    mean = uniform_filter(bright, size=5)
    local_var = uniform_filter((bright - mean)**2, size=5)
    var_n = local_var / (local_var.max() + 1e-8)
    

    # 4. Edge-aware weighting

    sx = sobel(bright, axis=1)
    sy = sobel(bright, axis=0)
    edge = np.hypot(sx, sy)
    edge_n = edge / (edge.max() + 1e-8)
    
    # Combine variance + edge → adaptive importance map
    var_mean = var_n.mean()
    edge_mean = edge_n.mean()
    alpha = var_mean / (var_mean + edge_mean + 1e-8)
    importance = np.clip(alpha * var_n + (1 - alpha) * edge_n, 0, 1)
    

    # 5. Frequency weights (adaptive)

    w0 = 1.0 + boost * 1.5 * importance
    w1 = 1.0 + boost * 1.0 * importance
    w2 = 1.0 + boost * 0.5 * importance
    
    # Preserve base structure (do NOT suppress it)
    base_weight = 1.0 + 0.2 * (1.0 - importance)
    

    # 6. Recombine

    out = (
        g3 * base_weight +
        d2 * w2 +
        d1 * w1 +
        d0 * w0
    )
    

    # 7. Contrast normalization (CRITICAL)

    out_min, out_max = out.min(), out.max()
    p_low, p_high = np.percentile(out, (1, 99))
    if p_high > p_low:
        out = np.clip((out - p_low) / (p_high - p_low + 1e-8), 0, 1) * 255.0
    return MultiScaleContext(out.astype(np.float32), d0, d1, d2)


def equalize_brightness(b: np.ndarray) -> np.ndarray:
    flat = np.clip(b, 0, 255).astype(np.uint8).flatten()
    hist, _ = np.histogram(flat, bins=256, range=(0, 256))
    cdf = hist.cumsum()
    cdf_min = cdf[cdf > 0].min()
    lut = np.round((cdf - cdf_min) / max(b.size - cdf_min, 1) * 255).astype(np.uint8)
    return lut[np.clip(b, 0, 255).astype(np.uint8)].astype(np.float32)


def apply_gamma(b: np.ndarray, gamma: float) -> np.ndarray:
    return np.power(np.clip(b / 255.0, 0, 1), gamma) * 255.0


def apply_contrast(b: np.ndarray, factor: float) -> np.ndarray:
    return np.clip(factor * (b - 128) + 128, 0, 255)


def apply_vignette(b: np.ndarray, strength: float) -> np.ndarray:
    if strength == 0:
        return b
    h, w = b.shape
    y = np.linspace(-1, 1, h)[:, None]
    x = np.linspace(-1, 1, w)[None, :]
    mask = 1.0 - strength * np.clip(x ** 2 + y ** 2, 0, 1)
    return np.clip(b * mask, 0, 255).astype(np.float32)


def apply_film_grain(b: np.ndarray, amount: float) -> np.ndarray:
    if amount == 0:
        return b
    noise = np.random.default_rng(42).normal(0, amount * 18, b.shape).astype(np.float32)
    return np.clip(b + noise, 0, 255)


def edge_biased_brightness(b: np.ndarray, edge_weight: float) -> np.ndarray:
    if edge_weight == 0:
        return b
    sx = sobel(b, axis=1);  sy = sobel(b, axis=0)
    edge_mag = np.hypot(sx, sy)
    mx = edge_mag.max()
    if mx > 0:
        edge_mag = (edge_mag / mx) * 255.0
    return np.clip((1 - edge_weight) * (255.0 - b) + edge_weight * edge_mag, 0, 255)


# ══════════════════════════════════════════════════════════════
#  FLOYD-STEINBERG DITHERING
# ══════════════════════════════════════════════════════════════

def floyd_steinberg(b: np.ndarray, n_levels: int) -> np.ndarray:
    img = b.copy().astype(np.float64)
    h, w = img.shape
    step = 255.0 / max(n_levels - 1, 1)
    for y in range(h):
        for x in range(w):
            old = img[y, x]
            new = round(old / step) * step
            err = old - new
            img[y, x] = new
            if x + 1 < w:              img[y,   x + 1] += err * 7 / 16
            if y + 1 < h:
                if x - 1 >= 0:         img[y + 1, x - 1] += err * 3 / 16
                img[y + 1, x]         += err * 5 / 16
                if x + 1 < w:          img[y + 1, x + 1] += err * 1 / 16
    return np.clip(img, 0, 255).astype(np.float32)


# ══════════════════════════════════════════════════════════════
#  ★ NEW: GRADIENT-DIRECTION GLYPH MAPPING
#
#  Strong edges → directional chars that match the edge angle:
#    ~0°  (horizontal) → -
#    ~45° (diagonal)   → /
#    ~90° (vertical)   → |
#    ~135°(diagonal)   → \
#  Replaces the brightness-chosen char only where edge is strong.
# ══════════════════════════════════════════════════════════════

_DIR_CHARS = np.array(['-', '/', '|', '\\'])   # bins 0-3

def apply_gradient_direction(
    char_grid: np.ndarray,          # 2-D char array (will be mutated copy)
    brightness: np.ndarray,         # same shape, pre-pipeline luma
    threshold: float = 0.25,        # fraction of max edge mag to trigger
) -> np.ndarray:
    """
    Replace chars at strong edges with orientation-matched glyphs.
    threshold: 0 = replace everything, 1 = only the very sharpest edges.
    """
    sx = sobel(brightness, axis=1)
    sy = sobel(brightness, axis=0)
    mag = np.hypot(sx, sy)
    mx  = mag.max()
    if mx == 0:
        return char_grid

    # Quantize angle [0°, 180°) → 4 bins, each 45° wide
    angle = np.degrees(np.arctan2(sy, sx)) % 180          # 0..180
    bins  = (np.floor(angle / 45.0).astype(int)) % 4      # 0,1,2,3

    result = char_grid.copy()
    mask   = (mag / mx) > threshold
    result[mask] = _DIR_CHARS[bins[mask]]
    return result


# ══════════════════════════════════════════════════════════════
#  HTML RENDERERS
# ══════════════════════════════════════════════════════════════

def hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def brightness_attenuated_html(
    char_grid: np.ndarray,
    brightness: np.ndarray,
    colour_arr: np.ndarray | None,
    fg_hex: str,
    bg_hex: str,
    font_size: int,
    attenuation: float,
    colour_mode: bool,
    output_font: str = "'Courier New',Courier,monospace",
) -> str:
    fg_r, fg_g, fg_b = hex_to_rgb(fg_hex)
    h, w = char_grid.shape
    rows_html: list[str] = []
    for y in range(h):
        row_parts: list[str] = []
        for x in range(w):
            ch   = char_grid[y, x]
            luma = float(brightness[y, x]) / 255.0
            if colour_mode and colour_arr is not None:
                pr, pg, pb = int(colour_arr[y, x, 0]), int(colour_arr[y, x, 1]), int(colour_arr[y, x, 2])
            else:
                t = luma
                bg_r, bg_g, bg_b = hex_to_rgb(bg_hex)
                pr = int(fg_r * t + bg_r * (1 - t))
                pg = int(fg_g * t + bg_g * (1 - t))
                pb = int(fg_b * t + bg_b * (1 - t))
            if attenuation > 0:
                alpha = max(0.08, min(1.0, luma * attenuation + (1 - attenuation)))
            else:
                alpha = 1.0
            color_css = f"rgba({pr},{pg},{pb},{alpha:.2f})"
            escaped   = ch.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            row_parts.append(f'<span style="color:{color_css}">{escaped}</span>')
        rows_html.append("".join(row_parts))
    inner = "\n".join(rows_html)
    return (
        f'<div style="background:{bg_hex};padding:16px;border-radius:10px;overflow:auto;border:1px solid #222;">'
        f'<pre style="font-family:{output_font};font-size:{font_size}px;'
        f'line-height:1.15;margin:0;letter-spacing:0.3px;">{inner}</pre></div>'
    )


def flat_html(lines: list, bg: str, fg: str, font_size: int, output_font: str = "'Courier New',Courier,monospace") -> str:
    body = "\n".join(lines).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        f'<div style="background:{bg};padding:16px;border-radius:10px;overflow:auto;border:1px solid #222;">'
        f'<pre style="font-family:{output_font};font-size:{font_size}px;'
        f'line-height:1.15;color:{fg};margin:0;letter-spacing:0.3px;">{body}</pre></div>'
    )


# ══════════════════════════════════════════════════════════════
#  CORE CHARACTER MAPPING
# ══════════════════════════════════════════════════════════════

def brightness_to_chars(brightness: np.ndarray, chars: str, invert: bool = False) -> np.ndarray:
    n = len(chars) - 1
    norm = brightness / 255.0
    if invert:
        norm = 1.0 - norm
    idx = np.clip(np.round(norm * n).astype(int), 0, n)
    return np.vectorize(lambda i: chars[i])(idx)


# ══════════════════════════════════════════════════════════════
#  ★ S-TIER: GLYPH IMAGE MATCHING
#
#  For every image patch, pick the character whose rendered
#  bitmap minimises SSD (sum of squared differences).
#  Uses fully vectorised numpy — no Python loops over patches.
# ══════════════════════════════════════════════════════════════

def _build_glyph_atlas(chars: str, font_size: int = 13) -> tuple:
    """Render all chars to bitmaps. Returns (atlas, cell_w, cell_h). Cached."""
    key = (chars, font_size)
    if key in _glyph_atlas_cache:
        return _glyph_atlas_cache[key]
    font = _load_mono_font(font_size)
    try:
        bbox = font.getbbox('M')
        cw = max(1, bbox[2] - bbox[0] + 1)
        ch = max(1, bbox[3] - bbox[1] + 2)
    except Exception:
        cw, ch = font_size, font_size + 4
    N = len(chars)
    atlas = np.zeros((N, ch, cw), dtype=np.float32)
    for i, c in enumerate(chars):
        canvas = Image.new('L', (cw, ch), 0)
        ImageDraw.Draw(canvas).text((0, 0), c, fill=255, font=font)
        atlas[i] = np.asarray(canvas, dtype=np.float32) / 255.0
    result = (atlas, cw, ch)
    _glyph_atlas_cache[key] = result
    return result


# ══════════════════════════════════════════════════════════════
#  PERCEPTUAL HELPERS
# ══════════════════════════════════════════════════════════════

def _ssim_matrix(
    X:  np.ndarray,   # (N_patches, P)
    G:  np.ndarray,   # (N_glyphs, P)
    C1: float = 0.01 ** 2,
    C2: float = 0.03 ** 2,
) -> np.ndarray:
    """
    Fully vectorised SSIM between every patch and every glyph.
    Returns (N_patches, N_glyphs) in [-1, 1]  (higher = more similar).
    """
    P   = X.shape[1]
    muX = X.mean(axis=1, keepdims=True)          # (N_p, 1)
    muG = G.mean(axis=1, keepdims=True)          # (N_g, 1)
    sigX2 = X.var(axis=1)                         # (N_p,)
    sigG2 = G.var(axis=1)                         # (N_g,)
    # Cross-covariance: E[XG] - muX*muG
    sigXG = (X @ G.T) / P - muX * muG.T          # (N_p, N_g)
    muX2  = (muX ** 2).squeeze(1)                 # (N_p,)
    muG2  = (muG ** 2).squeeze(1)                 # (N_g,)
    numer = (2.0 * muX * muG.T + C1) * (2.0 * sigXG + C2)
    denom = (muX2[:, None] + muG2[None, :] + C1) * (sigX2[:, None] + sigG2[None, :] + C2)
    return numer / (denom + 1e-10)               # (N_p, N_g)


def optimize_charset(
    img_array:   np.ndarray,
    chars:        str,
    cols:         int   = 120,
    char_aspect:  float = 0.45,
    top_k:        int   = 32,
    font_size:    int   = 13,
) -> str:
    """
    Greedy charset pruning: keep the top_k glyphs most frequently
    chosen as best SSD match across the image patches.
    Returns a shorter charset string still suitable for measure_char_density.
    """
    atlas, cw, ch = _build_glyph_atlas(chars, font_size)
    h, w = img_array.shape[:2]
    rows = max(1, int(cols * (h / w) * char_aspect))

    gray = compute_brightness(img_array)
    pil  = Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8)).resize(
        (cols * cw, rows * ch), Image.Resampling.LANCZOS
    )
    img_grid = np.asarray(pil, dtype=np.float32) / 255.0
    patches  = img_grid.reshape(rows, ch, cols, cw).transpose(0, 2, 1, 3)

    N_g = len(chars)
    P   = ch * cw
    G   = atlas.reshape(N_g, P)
    X   = patches.reshape(rows * cols, P)
    X2  = (X ** 2).sum(axis=1, keepdims=True)
    G2  = (G ** 2).sum(axis=1)
    ssd = X2 - 2 * (X @ G.T) + G2

    best   = ssd.argmin(axis=1)                    # (N_patches,)
    counts = np.bincount(best, minlength=N_g)
    k      = min(top_k, N_g)
    top_idx = np.argsort(-counts)[:k].tolist()
    # Always include space (index 0 in density-sorted chars) if available
    top_idx = sorted(set(top_idx))                 # keep stable order
    return ''.join(chars[i] for i in top_idx)

def glyph_match_chars(
    img_array:    np.ndarray,    # RGB uint8 original image
    chars:        str,
    cols:         int   = 120,
    char_aspect:  float = 0.45,
    font_size:    int   = 13,
    invert:       bool  = False,
    # ★ Perceptual loss options
    use_ssim:     bool  = False,  # blend SSD with SSIM
    ssim_weight:  float = 0.3,    # weight of (1-SSIM) in final score
    use_fft:      bool  = False,  # blend SSD with FFT-space SSD
    fft_weight:   float = 0.3,
) -> np.ndarray:
    """
    Match each image patch to the visually closest glyph.
    Score = (1-α-β)·SSD + α·(1-SSIM) + β·FFT_SSD  (all normalised).
    Returns a (rows, cols) char array.
    """
    atlas, cw, ch = _build_glyph_atlas(chars, font_size)
    h, w = img_array.shape[:2]
    rows = max(1, int(cols * (h / w) * char_aspect))

    gray = compute_brightness(img_array)
    if invert:
        gray = 255.0 - gray
    pil = Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8)).resize(
        (cols * cw, rows * ch), Image.Resampling.LANCZOS
    )
    img_grid = np.asarray(pil, dtype=np.float32) / 255.0

    patches = img_grid.reshape(rows, ch, cols, cw).transpose(0, 2, 1, 3)

    N_g = len(chars)
    P   = ch * cw
    G   = atlas.reshape(N_g, P)
    X   = patches.reshape(rows * cols, P)

    # ── baseline SSD ────────────────────────────────────
    X2  = (X ** 2).sum(axis=1, keepdims=True)
    G2  = (G ** 2).sum(axis=1)
    XG  = X @ G.T
    ssd = X2 - 2 * XG + G2
    score = ssd / (ssd.max() + 1e-8)

    # ── SSIM blend ──────────────────────────────────────
    if use_ssim:
        sim  = _ssim_matrix(X, G)               # (N_p, N_g) in [-1, 1]
        dsim = (1.0 - sim) * 0.5                # dissimilarity → [0, 1]
        dsim /= (dsim.max() + 1e-8)
        score = (1.0 - ssim_weight) * score + ssim_weight * dsim

    # ── FFT-space SSD blend ──────────────────────────────
    if use_fft:
        freq_size = ch * (cw // 2 + 1)
        Xf  = np.abs(np.fft.rfft2(X.reshape(-1, ch, cw))).reshape(-1, freq_size)
        Gf  = np.abs(np.fft.rfft2(G.reshape(-1, ch, cw))).reshape(-1, freq_size)
        Xf /= (Xf.max() + 1e-8);  Gf /= (Gf.max() + 1e-8)
        Xf2 = (Xf ** 2).sum(axis=1, keepdims=True)
        Gf2 = (Gf ** 2).sum(axis=1)
        ssd_fft = Xf2 - 2 * (Xf @ Gf.T) + Gf2
        ssd_fft /= (ssd_fft.max() + 1e-8)
        score = (1.0 - fft_weight) * score + fft_weight * ssd_fft

    best     = score.argmin(axis=1)
    char_arr = np.array(list(chars), dtype=object)
    return char_arr[best].reshape(rows, cols)


# ══════════════════════════════════════════════════════════════
#  ★ S-TIER: FREQUENCY-AWARE GLYPH SELECTION (STRUCTURE TENSOR)
#
#  Per ASCII cell, build the structure tensor:
#    S = [[sum(Ix²), sum(IxIy)],
#         [sum(IxIy), sum(Iy²)]]
#  Eigenvalues λ1 ≥ λ2 give:
#    coherence  = (λ1-λ2)/(λ1+λ2+ε)  -- 1=linear edge, 0=isotropic
#    orientation= atan2(2·IxIy, Ix²-Iy²)/2  -- dominant direction
#    energy     = λ1 + λ2                     -- total gradient power
#  Map cells to glyph families:
#    flat       (λ low)  → space / dots
#    isotropic  (low C)  → @#%&WM
#    horizontal (C↑, θ≈00°) → -_=
#    vertical   (C↑, θ≈90°) → |Il
#    diag-fwd   (C↑, θ≈45°) → /
#    diag-bwd   (C↑, θ≈135°) → \
# ══════════════════════════════════════════════════════════════

# Glyph families: characters that visually embody each texture type
_FAM_H    = '-_=~─━'          # horizontal lines
_FAM_V    = '|Il!1'             # vertical lines
_FAM_D1   = '/'                 # forward diagonal
_FAM_D2   = '\\'               # backward diagonal
_FAM_ISO  = '@#%&WMm*8B'        # isotropic / complex texture
_FAM_FLAT = ' .·`'             # flat / dark


def _cell_structure_tensor(
    img_array:   np.ndarray,
    rows:        int,
    cols:        int,
    char_aspect: float = 0.45,
) -> tuple:
    """
    Vectorised per-cell structure tensor.
    Returns (coherence, orientation_deg, energy)  each shape (rows, cols).
    """
    h, w = img_array.shape[:2]
    # Use a generous cell size so we capture real texture
    cell_h = max(4, h // rows)
    cell_w = max(4, w // cols)
    target_h, target_w = rows * cell_h, cols * cell_w

    gray = compute_brightness(img_array)
    pil  = Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8))
    gray_hi = np.asarray(
        pil.resize((target_w, target_h), Image.Resampling.LANCZOS), dtype=np.float32
    ) / 255.0                                    # (rows*cell_h, cols*cell_w)

    Ix  = sobel(gray_hi, axis=1)
    Iy  = sobel(gray_hi, axis=0)
    Ix2 = Ix * Ix
    Iy2 = Iy * Iy
    Ixy = Ix * Iy

    # Sum over each cell block: reshape → (rows, cell_h, cols, cell_w) → sum dims 1,3
    def cell_sum(a):
        return a.reshape(rows, cell_h, cols, cell_w).sum(axis=(1, 3))  # (rows, cols)

    Sx  = cell_sum(Ix2)
    Sy  = cell_sum(Iy2)
    Sxy = cell_sum(Ixy)

    # Eigenvalues of symmetric 2×2: trace/2 ± sqrt((trace/2)² - det)
    trace = Sx + Sy
    det   = Sx * Sy - Sxy * Sxy
    disc  = np.sqrt(np.maximum((trace * 0.5) ** 2 - det, 0.0))
    lam1  = trace * 0.5 + disc
    lam2  = trace * 0.5 - disc

    eps         = 1e-8
    coherence   = (lam1 - lam2) / (lam1 + lam2 + eps)          # [0, 1]
    orientation = np.degrees(np.arctan2(2 * Sxy, Sx - Sy) * 0.5) % 180  # [0, 180)
    energy      = lam1 + lam2                                   # total gradient power

    return coherence, orientation, energy


def frequency_aware_chars(
    img_array:         np.ndarray,
    chars:             str,
    cols:              int   = 120,
    char_aspect:       float = 0.45,
    invert:            bool  = False,
    coherence_thresh:  float = 0.45,   # above → directional glyph
    energy_thresh:     float = 0.10,   # below → flat glyph
    # ★ Adaptive coherence threshold
    adaptive_coherence: bool  = False,
    adaptive_alpha:     float = 0.5,   # thresh = mean + α·std
) -> np.ndarray:
    """
    Structure-tensor frequency-aware glyph selection.
    Returns (rows, cols) char array.
    """
    # ── baseline brightness char grid ────────────────────────
    bright = compute_brightness(img_array)
    small  = resize_for_ascii(bright, cols, char_aspect)
    raw_small = small.copy()
    small  = equalize_brightness(small)
    small  = apply_gamma(small, 0.8)
    chars_sorted = measure_char_density(chars)
    n     = len(chars_sorted) - 1
    norm  = np.clip(small / 255.0, 0, 1)
    if invert:
        norm = 1.0 - norm
    idx   = np.clip(np.round(norm * n).astype(int), 0, n)
    char_grid = np.vectorize(lambda i: chars_sorted[i])(idx)    # baseline

    # ── per-cell structure tensor ─────────────────────────────
    rows, _ = char_grid.shape
    coh, ori, eng = _cell_structure_tensor(img_array, rows, cols, char_aspect)

    # ★ Adaptive coherence threshold: mean + α·std
    if adaptive_coherence:
        coherence_thresh = float(coh.mean() + adaptive_alpha * coh.std())
    # Normalise energy to [0, 1]
    emx = eng.max()
    eng_n = eng / (emx + 1e-8)

    # ── map cells to glyph families ──────────────────────────
    # Quantise orientation to 4 bins: H / D1 / V / D2
    bins = (np.floor(ori / 45.0).astype(int)) % 4   # 0=H, 1=D/, 2=V, 3=D\
    dir_chars = np.array([_FAM_H[0], _FAM_D1[0], _FAM_V[0], _FAM_D2[0]])

    # Per-cell luma for family-internal selection
    luma = np.clip(raw_small / 255.0, 0, 1)          # (rows, cols)

    result = char_grid.copy()

    # 1. Flat regions (very low energy)
    flat_mask = eng_n < energy_thresh
    flat_idx  = np.clip((luma[flat_mask] * (len(_FAM_FLAT) - 1)).astype(int), 0, len(_FAM_FLAT)-1)
    result[flat_mask] = np.array(list(_FAM_FLAT))[flat_idx]

    # 2. Isotropic texture (high energy, low coherence)
    iso_mask = (~flat_mask) & (coh < coherence_thresh)
    iso_idx  = np.clip((luma[iso_mask] * (len(_FAM_ISO) - 1)).astype(int), 0, len(_FAM_ISO)-1)
    result[iso_mask] = np.array(list(_FAM_ISO))[iso_idx]

    # 3. Directional (high coherence) → pick from dir family
    dir_mask = (~flat_mask) & (coh >= coherence_thresh)
    result[dir_mask] = dir_chars[bins[dir_mask]]

    return result


# ══════════════════════════════════════════════════════════════
#  ★ S-TIER: GLYPH-SPACE ERROR DIFFUSION
#
#  Like pixel Floyd-Steinberg, but the error is the residual
#  between the image patch and the chosen glyph bitmap.
#  That residual is diffused to neighbouring cells → ASCII halftoning.
# ══════════════════════════════════════════════════════════════

def glyph_space_error_diffusion(
    img_array:    np.ndarray,
    chars:        str,
    cols:         int   = 120,
    char_aspect:  float = 0.45,
    font_size:    int   = 13,
    invert:       bool  = False,
) -> np.ndarray:
    """
    Floyd-Steinberg error diffusion in glyph space.
    Returns (rows, cols) char array.
    NOTE: has a Python double-loop over cells — marked 'slow' in UI.
    """
    atlas, cw, ch = _build_glyph_atlas(chars, font_size)
    h, w = img_array.shape[:2]
    rows = max(1, int(cols * (h / w) * char_aspect))

    gray = compute_brightness(img_array)
    if invert:
        gray = 255.0 - gray
    pil = Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8)).resize(
        (cols * cw, rows * ch), Image.Resampling.LANCZOS
    )
    img_grid = np.asarray(pil, dtype=np.float32) / 255.0  # (rows*ch, cols*cw)

    # Error buffer (padded to avoid bounds checks)
    err = np.zeros((rows * ch + ch, cols * cw + cw), dtype=np.float32)

    N_g = len(chars)
    G   = atlas.reshape(N_g, -1)         # (N_g, P)
    G2  = (G ** 2).sum(axis=1)           # precomputed ||G||²

    char_arr  = np.array(list(chars), dtype=object)
    char_grid = np.full((rows, cols), ' ', dtype=object)

    for y in range(rows):
        for x in range(cols):
            py, px = y * ch, x * cw
            patch     = img_grid[py:py+ch, px:px+cw]
            patch_err = np.clip(patch + err[py:py+ch, px:px+cw], 0.0, 1.0)

            X   = patch_err.ravel()                  # (P,)
            XG  = G @ X                              # (N_g,)
            ssd = G2 - 2.0 * XG + (X * X).sum()    # (N_g,)
            best = int(ssd.argmin())
            char_grid[y, x] = char_arr[best]

            # Residual and Floyd-Steinberg diffusion
            res = (patch_err - atlas[best])           # (ch, cw)
            if x + 1 < cols:
                err[py:py+ch,      px+cw:px+2*cw] += res * (7/16)
            if y + 1 < rows:
                if x > 0:
                    err[py+ch:py+2*ch, px-cw:px  ] += res * (3/16)
                err[py+ch:py+2*ch, px   :px+cw ] += res * (5/16)
                if x + 1 < cols:
                    err[py+ch:py+2*ch, px+cw:px+2*cw] += res * (1/16)

    return char_grid


# ══════════════════════════════════════════════════════════════
#  ★ V6-TIER: PERCEPTUAL MULTI-SCALE FUSION
# ══════════════════════════════════════════════════════════════

def fused_v6_chars(
    bright:       np.ndarray,
    raw_bright:   np.ndarray,
    ms_context:   MultiScaleContext,
    cols:         int,
    char_aspect:  float,
    invert:       bool  = False,
) -> np.ndarray:
    """
    V6 Fusion: Softly blends glyph behavior based on aligned frequency bands.
    """
    # 1. Detail bands are already in cell space
    d0_c = ms_context.d0
    d1_c = ms_context.d1
    d2_c = ms_context.d2
    
    # 2. Extract Perceptual Energies
    E_tex    = np.abs(d0_c)
    E_edge   = np.abs(d1_c)
    E_struct = np.abs(d2_c)
    
    E_sum = E_tex + E_edge + E_struct + 1e-8
    w_tex    = E_tex / E_sum
    w_edge   = E_edge / E_sum
    w_struct = E_struct / E_sum
    
    # 3. Base brightness index
    chars = measure_char_density(RAW_CHARSETS["full"])
    char_len = len(chars) - 1
    
    # Use inverted/non-inverted luma
    luma = np.clip(bright / 255.0, 0, 1)
    if invert:
        luma = 1.0 - luma
        
    idx_base = (luma * char_len).astype(int)
    
    # 4. Perceptual modulation
    texture_idx = np.clip(idx_base + (w_tex * 3).astype(int), 0, char_len)
    structure_idx = np.clip(idx_base - (w_struct * 2).astype(int), 0, char_len)
    
    # 5. Fused index
    final_idx = (
        idx_base * (1 - w_edge) +
        texture_idx * w_tex +
        structure_idx * w_struct
    ).astype(int)
    final_idx = np.clip(final_idx, 0, char_len)
    
    # Map to characters
    base_char_grid = np.array(list(chars), dtype=object)[final_idx]
    
    
    return base_char_grid


# ══════════════════════════════════════════════════════════════
#  ★ A-TIER: ADAPTIVE LOCAL CHARSETS
#
#  Split image into regions by local content; assign distinct
#  glyph sub-families to each region for richer tonal vocabulary:
#    flat/dark   → sparse set  (' .,·')
#    smooth/mid  → mid set     (',:;+=-')
#    textured    → full charset
#    sharp edges → structural  ('|/-\#@')
# ══════════════════════════════════════════════════════════════

def adaptive_charset_chars(
    img_array:    np.ndarray,
    cols:         int   = 120,
    char_aspect:  float = 0.45,
    invert:       bool  = False,
) -> np.ndarray:
    """
    Adaptive local charset selection.
    Returns (rows, cols) char array.
    """
    bright  = compute_brightness(img_array)
    small   = resize_for_ascii(bright, cols, char_aspect)
    raw     = small.copy()
    small   = equalize_brightness(small)
    small   = apply_gamma(small, 0.8)

    rows, _ = small.shape
    Ix  = sobel(raw, axis=1);  Iy = sobel(raw, axis=0)
    mag = np.hypot(Ix, Iy)

    # Per-cell statistics via uniform_filter (fast box sums)
    from scipy.ndimage import uniform_filter, generic_filter
    local_var = generic_filter(raw, np.var, size=3)
    local_mag = uniform_filter(mag, size=3)

    # Normalise
    vmx = local_var.max(); mmx = local_mag.max()
    var_n = local_var / (vmx + 1e-8)
    mag_n = local_mag / (mmx + 1e-8)
    luma  = np.clip(small / 255.0, 0, 1)
    if invert:
        luma = 1.0 - luma

    # Region masks (cells)
    flat_mask  = (var_n < 0.05) & (mag_n < 0.10)
    edge_mask  = mag_n > 0.45
    tex_mask   = (~flat_mask) & (~edge_mask) & (var_n > 0.15)
    mid_mask   = (~flat_mask) & (~edge_mask) & (~tex_mask)

    _FAM_SPARSE = list(' .,·`')
    _FAM_MID    = list(' .,:;+=-~')
    _FAM_STRUCT = list('|/-\\#@!Il')
    _FAM_RICH   = list(' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$')

    def pick(fam, luma_vals):
        fam_arr = np.array(fam, dtype=object)
        idx = np.clip((luma_vals * (len(fam) - 1)).astype(int), 0, len(fam)-1)
        return fam_arr[idx]

    result = np.full(small.shape, ' ', dtype=object)
    result[flat_mask]  = pick(_FAM_SPARSE, luma[flat_mask])
    result[mid_mask]   = pick(_FAM_MID,    luma[mid_mask])
    result[tex_mask]   = pick(_FAM_RICH,   luma[tex_mask])
    result[edge_mask]  = pick(_FAM_STRUCT, luma[edge_mask])
    return result


# ══════════════════════════════════════════════════════════════
#  ★ A-TIER: SALIENCY-AWARE RENDERING
#
#  Important regions (high local variance + centre weight)
#  get boosted contrast → more of the charset's tonal range used.
#  Background regions are flattened → fewer, softer chars.
# ══════════════════════════════════════════════════════════════

def _compute_saliency(
    img_array:   np.ndarray,
    rows:        int,
    cols:        int,
    char_aspect: float = 0.45,
) -> np.ndarray:
    """Per-cell saliency in [0, 1]:  local variance  + soft centre weight."""
    h, w  = img_array.shape[:2]
    cell_h = max(4, h // rows)
    cell_w = max(4, w // cols)
    th, tw = rows * cell_h, cols * cell_w

    gray = compute_brightness(img_array)
    pil  = Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8))
    g    = np.asarray(pil.resize((tw, th), Image.Resampling.LANCZOS), np.float32) / 255.0

    blocks = g.reshape(rows, cell_h, cols, cell_w)
    var    = blocks.var(axis=(1, 3))                    # (rows, cols)
    var    = var / (var.max() + 1e-8)

    gy = np.linspace(-1, 1, rows)[:, None]
    gx = np.linspace(-1, 1, cols)[None, :]
    centre = np.exp(-(gy ** 2 + gx ** 2) * 1.5)

    sal = np.clip(0.65 * var + 0.35 * centre, 0, 1)
    return sal


def apply_saliency_to_brightness(
    bright:     np.ndarray,    # (rows, cols) 0-255
    saliency:   np.ndarray,    # (rows, cols) 0-1
    boost:      float = 0.6,   # how strongly to amplify salient cells
) -> np.ndarray:
    """
    Stretch contrast in salient cells; compress in flat ones.
    Modulates the per-cell brightness range without changing the mean.
    """
    mean   = bright.mean()
    delta  = bright - mean
    scale  = 1.0 + boost * (saliency - 0.5) * 2.0   # in [1-boost, 1+boost]
    return np.clip(mean + delta * scale, 0, 255).astype(np.float32)


# ══════════════════════════════════════════════════════════════
#  FULL PIPELINE
# ══════════════════════════════════════════════════════════════

def image_to_ascii(
    img_array:      np.ndarray,
    cols:           int   = 120,
    charset:        str   = "full",
    contrast:       float = 1.2,
    gamma:          float = 0.8,
    edge_weight:    float = 0.25,
    sharpen:        float = 0.3,
    vignette:       float = 0.4,
    grain:          float = 0.05,
    equalize:       bool  = True,
    dither:         bool  = True,
    invert:         bool  = False,
    char_aspect:    float = 0.45,
    attenuation:    float = 0.7,
    colour_mode:    bool  = False,
    fg_hex:         str   = "#c8c8c8",
    bg_hex:         str   = "#0a0a0a",
    font_size:      int   = 6,
    output_font:    str   = "'Courier New',Courier,monospace",
    glyph_match:       bool  = False,
    glyph_font_size:   int   = 13,
    use_ssim:          bool  = False,
    ssim_weight:       float = 0.3,
    use_fft:           bool  = False,
    fft_weight:        float = 0.3,
    charset_prune:     bool  = False,
    charset_prune_k:   int   = 32,
    freq_aware:        bool  = False,
    coherence_thresh:  float = 0.45,
    energy_thresh:     float = 0.10,
    adaptive_coherence: bool = False,
    adaptive_alpha:    float = 0.5,
    glyph_err_diff:    bool  = False,
    ged_font_size:     int   = 13,
    adaptive_charset:  bool  = False,
    saliency_aware:    bool  = False,
    saliency_boost:    float = 0.6,
    multiscale:        bool  = False,
    multiscale_boost:  float = 1.2,
    fusion_v6:         bool  = False,
) -> str:
    """Convert an RGB uint8 numpy array to a ready-to-display HTML string."""
    char_grid, raw_bright, colour_arr = _run_pipeline(
        img_array, cols, charset, contrast, gamma, edge_weight, sharpen,
        vignette, grain, equalize, dither, invert, char_aspect,
        colour_mode,
        glyph_match=glyph_match, glyph_font_size=glyph_font_size,
        use_ssim=use_ssim, ssim_weight=ssim_weight,
        use_fft=use_fft, fft_weight=fft_weight,
        charset_prune=charset_prune, charset_prune_k=charset_prune_k,
        freq_aware=freq_aware, coherence_thresh=coherence_thresh, energy_thresh=energy_thresh,
        adaptive_coherence=adaptive_coherence, adaptive_alpha=adaptive_alpha,
        glyph_err_diff=glyph_err_diff, ged_font_size=ged_font_size,
        adaptive_charset=adaptive_charset,
        saliency_aware=saliency_aware, saliency_boost=saliency_boost,
        multiscale=multiscale, multiscale_boost=multiscale_boost,
        fusion_v6=fusion_v6,
    )

    use_spans = (attenuation > 0.01) or colour_mode
    if use_spans:
        return brightness_attenuated_html(
            char_grid=char_grid, brightness=raw_bright, colour_arr=colour_arr,
            fg_hex=fg_hex, bg_hex=bg_hex, font_size=font_size,
            attenuation=attenuation, colour_mode=colour_mode,
            output_font=output_font,
        )
    else:
        return flat_html(["".join(row) for row in char_grid], bg_hex, fg_hex, font_size, output_font)


def image_to_ascii_txt(
    img_array:      np.ndarray,
    cols:           int   = 120,
    charset:        str   = "full",
    contrast:       float = 1.2,
    gamma:          float = 0.8,
    edge_weight:    float = 0.25,
    sharpen:        float = 0.3,
    vignette:       float = 0.4,
    grain:          float = 0.05,
    equalize:       bool  = True,
    dither:         bool  = True,
    invert:         bool  = False,
    char_aspect:    float = 0.45,
    glyph_match:       bool  = False,
    glyph_font_size:   int   = 13,
    use_ssim:          bool  = False,
    ssim_weight:       float = 0.3,
    use_fft:           bool  = False,
    fft_weight:        float = 0.3,
    charset_prune:     bool  = False,
    charset_prune_k:   int   = 32,
    freq_aware:        bool  = False,
    coherence_thresh:  float = 0.45,
    energy_thresh:     float = 0.10,
    adaptive_coherence: bool = False,
    adaptive_alpha:    float = 0.5,
    glyph_err_diff:    bool  = False,
    ged_font_size:     int   = 13,
    adaptive_charset:  bool  = False,
    saliency_aware:    bool  = False,
    saliency_boost:    float = 0.6,
    multiscale:   bool  = False,
    multiscale_boost: float = 1.2,
    fusion_v6:    bool  = False,
) -> str:
    """Return plain-text ASCII art."""
    char_grid, _, _ = _run_pipeline(
        img_array, cols, charset, contrast, gamma, edge_weight, sharpen,
        vignette, grain, equalize, dither, invert, char_aspect,
        colour_mode=False,
        glyph_match=glyph_match, glyph_font_size=glyph_font_size,
        use_ssim=use_ssim, ssim_weight=ssim_weight,
        use_fft=use_fft, fft_weight=fft_weight,
        charset_prune=charset_prune, charset_prune_k=charset_prune_k,
        freq_aware=freq_aware, coherence_thresh=coherence_thresh, energy_thresh=energy_thresh,
        adaptive_coherence=adaptive_coherence, adaptive_alpha=adaptive_alpha,
        glyph_err_diff=glyph_err_diff, ged_font_size=ged_font_size,
        adaptive_charset=adaptive_charset,
        saliency_aware=saliency_aware, saliency_boost=saliency_boost,
        multiscale=multiscale, multiscale_boost=multiscale_boost,
        fusion_v6=fusion_v6,
    )
    return "\n".join("".join(row) for row in char_grid)


# ══════════════════════════════════════════════════════════════
#  SHARED HELPERS FOR IMAGE/VECTOR EXPORT
# ══════════════════════════════════════════════════════════════

_MONO_FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    "/Library/Fonts/Courier New.ttf",
    "/System/Library/Fonts/Monaco.ttf",
    "cour.ttf",
]


def _load_mono_font(size: int):
    for p in _MONO_FONT_PATHS:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def _make_color_grid(
    raw_bright: np.ndarray,
    colour_arr: np.ndarray | None,
    fg_hex: str,
    bg_hex: str,
    attenuation: float,
    colour_mode: bool,
) -> np.ndarray:
    """Vectorized RGBA color grid  →  shape (H, W, 4) uint8."""
    luma = raw_bright / 255.0                                   # (H, W)
    fg   = np.array(hex_to_rgb(fg_hex), dtype=np.float32)      # (3,)
    bg   = np.array(hex_to_rgb(bg_hex), dtype=np.float32)      # (3,)

    if colour_mode and colour_arr is not None:
        rgb = colour_arr.astype(np.float32)                     # (H, W, 3)
    else:
        t   = luma[:, :, None]                                  # (H, W, 1)
        rgb = fg * t + bg * (1.0 - t)                          # (H, W, 3)

    if attenuation > 0:
        alpha = np.clip(luma * attenuation + (1 - attenuation), 0.08, 1.0)
    else:
        alpha = np.ones_like(luma)

    rgba = np.concatenate([rgb, (alpha * 255)[:, :, None]], axis=2)
    return np.clip(rgba, 0, 255).astype(np.uint8)


def _run_pipeline(
    img_array, cols, charset, contrast, gamma, edge_weight, sharpen,
    vignette, grain, equalize, dither, invert, char_aspect,
    colour_mode,
    glyph_match=False, glyph_font_size=13,
    use_ssim=False, ssim_weight=0.3,
    use_fft=False, fft_weight=0.3,
    charset_prune=False, charset_prune_k=32,
    freq_aware=False, coherence_thresh=0.45, energy_thresh=0.10,
    adaptive_coherence=False, adaptive_alpha=0.5,
    glyph_err_diff=False, ged_font_size=13,
    adaptive_charset=False,
    saliency_aware=False, saliency_boost=0.6,
    multiscale=False, multiscale_boost=1.2,
    fusion_v6=False,
):
    """Run the full ASCII pipeline; return (char_grid, raw_bright, colour_arr)."""
    img_sharp  = sharpen_image(img_array, sharpen)
    bright     = compute_brightness(img_sharp)
    bright     = resize_for_ascii(bright, cols, char_aspect)
    
    ms_context = None
    if multiscale:
        ms_context = apply_multiscale_enhancement(bright, multiscale_boost)
        bright = ms_context.base
        
    colour_arr = resize_colour(img_array, cols, char_aspect) if colour_mode else None
    
    raw_bright = bright.copy()
    if equalize:  bright = equalize_brightness(bright)
    bright = apply_gamma(bright, gamma)
    bright = apply_contrast(bright, contrast)
    bright = apply_vignette(bright, vignette)
    bright = apply_film_grain(bright, grain)
    bright = edge_biased_brightness(bright, edge_weight)
    
    # ★ Saliency: modulate per-cell brightness before char mapping
    if saliency_aware:
        rows_n, _ = bright.shape
        sal = _compute_saliency(img_array, rows_n, cols, char_aspect)
        bright = apply_saliency_to_brightness(bright, sal, boost=saliency_boost)
    
    if fusion_v6 and ms_context is not None:
        char_grid = fused_v6_chars(bright, raw_bright, ms_context, cols, char_aspect, invert)
    elif glyph_match or charset_prune:
        raw_charset = RAW_CHARSETS.get(charset, RAW_CHARSETS["full"])
        if charset_prune:
            raw_charset = optimize_charset(
                img_array, raw_charset,
                cols=cols, char_aspect=char_aspect,
                top_k=charset_prune_k, font_size=glyph_font_size,
            )
        if glyph_match:
            char_grid = glyph_match_chars(
                img_array, raw_charset,
                cols=cols, char_aspect=char_aspect,
                font_size=glyph_font_size, invert=invert,
                use_ssim=use_ssim, ssim_weight=ssim_weight,
                use_fft=use_fft, fft_weight=fft_weight,
            )
        else:
            # charset_prune only
            chars_s = measure_char_density(raw_charset)
            if dither:
                bright = floyd_steinberg(bright, n_levels=len(chars_s))
            char_grid = brightness_to_chars(bright, chars_s, invert)
    elif glyph_err_diff:
        raw_charset = RAW_CHARSETS.get(charset, RAW_CHARSETS["full"])
        char_grid = glyph_space_error_diffusion(
            img_array, raw_charset,
            cols=cols, char_aspect=char_aspect,
            font_size=ged_font_size, invert=invert,
        )
    elif adaptive_charset:
        char_grid = adaptive_charset_chars(
            img_array, cols=cols, char_aspect=char_aspect, invert=invert,
        )
    elif freq_aware:
        raw_charset = RAW_CHARSETS.get(charset, RAW_CHARSETS["full"])
        char_grid = frequency_aware_chars(
            img_array, raw_charset,
            cols=cols, char_aspect=char_aspect, invert=invert,
            coherence_thresh=coherence_thresh,
            energy_thresh=energy_thresh,
            adaptive_coherence=adaptive_coherence,
            adaptive_alpha=adaptive_alpha,
        )
    else:
        chars  = measure_char_density(RAW_CHARSETS.get(charset, RAW_CHARSETS["full"]))
        if dither: bright = floyd_steinberg(bright, n_levels=len(chars))
        char_grid = brightness_to_chars(bright, chars, invert)
            
    return char_grid, raw_bright, colour_arr


# ══════════════════════════════════════════════════════════════
#  ★ PNG EXPORT
# ══════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════
#  ★ SVG EXPORT
# ══════════════════════════════════════════════════════════════

def image_to_ascii_svg(
    img_array:      np.ndarray,
    cols:           int   = 120,
    charset:        str   = "full",
    contrast:       float = 1.2,
    gamma:          float = 0.8,
    edge_weight:    float = 0.25,
    sharpen:        float = 0.3,
    vignette:       float = 0.4,
    grain:          float = 0.05,
    equalize:       bool  = True,
    dither:         bool  = True,
    invert:         bool  = False,
    char_aspect:    float = 0.45,
    attenuation:    float = 0.7,
    colour_mode:    bool  = False,
    fg_hex:         str   = "#c8c8c8",
    bg_hex:         str   = "#0a0a0a",
    font_size:      int   = 12,  # renamed from svg_font_size for consistency
    output_font:    str   = "'Courier New',Courier,monospace",
    glyph_match:       bool  = False,
    glyph_font_size:   int   = 13,
    use_ssim:          bool  = False,
    ssim_weight:       float = 0.3,
    use_fft:           bool  = False,
    fft_weight:        float = 0.3,
    charset_prune:     bool  = False,
    charset_prune_k:   int   = 32,
    freq_aware:        bool  = False,
    coherence_thresh:  float = 0.45,
    energy_thresh:     float = 0.10,
    adaptive_coherence: bool = False,
    adaptive_alpha:    float = 0.5,
    glyph_err_diff:    bool  = False,
    ged_font_size:     int   = 13,
    adaptive_charset:  bool  = False,
    saliency_aware:    bool  = False,
    saliency_boost:    float = 0.6,
    multiscale:     bool  = False,
    multiscale_boost: float = 1.2,
    fusion_v6:      bool  = False,
) -> str:
    """Render ASCII art to SVG string."""
    char_grid, raw_bright, colour_arr = _run_pipeline(
        img_array, cols, charset, contrast, gamma, edge_weight, sharpen,
        vignette, grain, equalize, dither, invert, char_aspect,
        colour_mode,
        glyph_match=glyph_match, glyph_font_size=glyph_font_size,
        use_ssim=use_ssim, ssim_weight=ssim_weight,
        use_fft=use_fft, fft_weight=fft_weight,
        charset_prune=charset_prune, charset_prune_k=charset_prune_k,
        freq_aware=freq_aware, coherence_thresh=coherence_thresh, energy_thresh=energy_thresh,
        adaptive_coherence=adaptive_coherence, adaptive_alpha=adaptive_alpha,
        glyph_err_diff=glyph_err_diff, ged_font_size=ged_font_size,
        adaptive_charset=adaptive_charset,
        saliency_aware=saliency_aware, saliency_boost=saliency_boost,
        multiscale=multiscale, multiscale_boost=multiscale_boost,
        fusion_v6=fusion_v6,
    )
    colors = _make_color_grid(raw_bright, colour_arr, fg_hex, bg_hex, attenuation, colour_mode)

    rows, grid_w = char_grid.shape
    # Match the HTML preview's CSS letter-spacing and line-height
    cw  = font_size * 0.601 + 0.3       # monospace char width + 0.3px letter spacing
    ch  = font_size * 1.15             # line height = 1.15
    svgw = grid_w * cw
    svgh = rows  * ch

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{svgw:.1f}" height="{svgh:.1f}" '
        f'viewBox="0 0 {svgw:.1f} {svgh:.1f}">',
        f'<rect width="100%" height="100%" fill="{bg_hex}"/>',
        f'<style>text{{font-family:{output_font};'
        f'font-size:{font_size}px;white-space:pre;letter-spacing:0.3px;}}</style>',
    ]

    for y in range(rows):
        tx = 0.0
        # Text y-coordinate is the baseline; offset by roughly 0.85 of the line height
        ty = y * ch + (font_size * 0.85)
        spans = []
        for x in range(grid_w):
            r, g, b, a = colors[y, x]
            af = a / 255.0
            ch_ = char_grid[y, x]
            esc = ch_.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            col = f"rgba({r},{g},{b},{af:.2f})"
            spans.append(f'<tspan fill="{col}">{esc}</tspan>')
        parts.append(f'<text x="0" y="{ty:.1f}">{"".join(spans)}</text>')

    parts.append("</svg>")
    return "\n".join(parts)
