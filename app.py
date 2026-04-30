from __future__ import annotations

import io
import os
import base64
import tempfile

from flask import Flask, request, jsonify, send_from_directory
from PIL import Image
import numpy as np

import cairosvg

from engine import image_to_ascii, image_to_ascii_txt, image_to_ascii_svg, THEMES, RAW_CHARSETS

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB upload limit

UPLOAD_FOLDER = tempfile.mkdtemp(prefix="ascii_art_")


# ── helpers ────────────────────────────────────────────────────

def _load_image(file_storage) -> np.ndarray:
    data = file_storage.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.asarray(img, dtype=np.uint8)


def _params_from_request() -> dict:
    f = request.form
    theme_key = f.get("theme", "noir")
    bg, fg, colour_mode, _ = THEMES.get(theme_key, THEMES["noir"])
    # Allow colour pickers to override theme colours
    bg = f.get("bg_hex", bg)
    fg = f.get("fg_hex", fg)
    return dict(
        cols=int(f.get("cols", 120)),
        charset=f.get("charset", "full"),
        contrast=float(f.get("contrast", 1.2)),
        gamma=float(f.get("gamma", 0.8)),
        edge_weight=float(f.get("edge_weight", 0.25)),
        sharpen=float(f.get("sharpen", 0.3)),
        vignette=float(f.get("vignette", 0.4)),
        grain=float(f.get("grain", 0.05)),
        equalize=f.get("equalize", "true").lower() == "true",
        dither=f.get("dither", "true").lower() == "true",
        invert=f.get("invert", "false").lower() == "true",
        char_aspect=float(f.get("char_aspect", 0.45)),
        attenuation=float(f.get("attenuation", 0.7)),
        colour_mode=colour_mode,
        fg_hex=fg,
        bg_hex=bg,
        font_size=int(f.get("font_size", 6)),
        output_font=f.get("output_font", "'Courier New',Courier,monospace"),

        # ★ glyph matching
        glyph_match=f.get("glyph_match", "false").lower() == "true",
        glyph_font_size=int(f.get("glyph_font_size", 13)),
        # ★ frequency-aware
        freq_aware=f.get("freq_aware", "false").lower() == "true",
        coherence_thresh=float(f.get("coherence_thresh", 0.45)),
        energy_thresh=float(f.get("energy_thresh", 0.10)),
        # ★ glyph matching perceptual options
        use_ssim=f.get("use_ssim", "false").lower() == "true",
        ssim_weight=float(f.get("ssim_weight", 0.3)),
        use_fft=f.get("use_fft", "false").lower() == "true",
        fft_weight=float(f.get("fft_weight", 0.3)),
        # ★ charset pruning
        charset_prune=f.get("charset_prune", "false").lower() == "true",
        charset_prune_k=int(f.get("charset_prune_k", 32)),
        # ★ adaptive coherence
        adaptive_coherence=f.get("adaptive_coherence", "false").lower() == "true",
        adaptive_alpha=float(f.get("adaptive_alpha", 0.5)),
        glyph_err_diff=f.get("glyph_err_diff", "false").lower() == "true",
        ged_font_size=int(f.get("ged_font_size", 13)),
        # ★ adaptive local charset
        adaptive_charset=f.get("adaptive_charset", "false").lower() == "true",
        # ★ saliency-aware
        saliency_aware=f.get("saliency_aware", "false").lower() == "true",
        saliency_boost=float(f.get("saliency_boost", 0.6)),
        # ★ multi-scale
        multiscale=f.get("multiscale", "false").lower() == "true",
        multiscale_boost=float(f.get("multiscale_boost", 1.2)),
        # ★ V6 Fusion
        fusion_v6=f.get("fusion_v6", "false").lower() == "true",
    )

# ── routes ─────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("templates", "index.html")


@app.route("/themes")
def get_themes():
    return jsonify({k: {"bg": v[0], "fg": v[1], "colour": v[2], "label": v[3]}
                    for k, v in THEMES.items()})


@app.route("/charsets")
def get_charsets():
    return jsonify(list(RAW_CHARSETS.keys()))


@app.route("/render", methods=["POST"])
def render():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    try:
        img_arr = _load_image(request.files["image"])
        params = _params_from_request()
        html = image_to_ascii(img_arr, **params)
        return jsonify({"html": html})
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/save_html", methods=["POST"])
def save_html():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    try:
        img_arr = _load_image(request.files["image"])
        params = _params_from_request()
        html_inner = image_to_ascii(img_arr, **params)
        full = (
            "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
            "<title>ASCII Art</title></head>"
            f"<body style='margin:0;background:{params['bg_hex']};'>"
            f"{html_inner}</body></html>"
        )
        encoded = base64.b64encode(full.encode("utf-8")).decode("ascii")
        return jsonify({"data": encoded, "filename": "ascii_art.html"})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/save_txt", methods=["POST"])
def save_txt():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    try:
        img_arr = _load_image(request.files["image"])
        p = _params_from_request()
        for k in ["attenuation", "colour_mode", "fg_hex", "bg_hex", "font_size"]:
            p.pop(k, None)
        txt = image_to_ascii_txt(img_arr, **p)
        encoded = base64.b64encode(txt.encode("utf-8")).decode("ascii")
        return jsonify({"data": encoded, "filename": "ascii_art.txt"})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/save_png", methods=["POST"])
def save_png():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    try:
        img_arr = _load_image(request.files["image"])
        p = _params_from_request()
        svg_str = image_to_ascii_svg(img_arr, **p)
        png_bytes = cairosvg.svg2png(bytestring=svg_str.encode("utf-8"))
        encoded = base64.b64encode(png_bytes).decode("ascii")
        return jsonify({"data": encoded, "filename": "ascii_art.png"})
    except Exception as exc:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/save_svg", methods=["POST"])
def save_svg():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    try:
        img_arr = _load_image(request.files["image"])
        p = _params_from_request()
        svg_str = image_to_ascii_svg(img_arr, **p)
        encoded = base64.b64encode(svg_str.encode("utf-8")).decode("ascii")
        return jsonify({"data": encoded, "filename": "ascii_art.svg"})
    except Exception as exc:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/save_pdf", methods=["POST"])
def save_pdf():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    try:
        img_arr = _load_image(request.files["image"])
        p = _params_from_request()
        svg_str = image_to_ascii_svg(img_arr, **p)
        pdf_bytes = cairosvg.svg2pdf(bytestring=svg_str.encode("utf-8"))
        encoded = base64.b64encode(pdf_bytes).decode("ascii")
        return jsonify({"data": encoded, "filename": "ascii_art.pdf"})
    except Exception as exc:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    print("🚀  ASCII Art Web UI  →  http://localhost:5000")
    app.run(debug=True, port=5000)
