# ASCII Studio 🎨

A professional, high-performance ASCII art workstation that runs 100% in your browser. No servers, no data uploads—just pure client-side processing using advanced computer vision and machine learning.

**[Try the Live Demo](https://redshiftedlabs.github.io/ascii-studio/)**

---

## 🚀 Key Highlights

### 1. V6 Perceptual Fusion Engine
Our most advanced rendering pipeline yet. It uses multi-scale Laplacian enhancement to separate texture from structure, ensuring that fine details (like hair or text) are preserved even at low resolutions.

### 2. Local AI Background Removal
Integrated subject isolation using `@imgly/background-removal`. One-click masking powered by local WASM/ONNX models. Isolate your subject and render them into ASCII while keeping the composition clean.

### 3. S-Tier Glyph Matching
Beyond simple brightness mapping. Our S-Tier engine performs pixel-level SSD (Sum of Squared Differences) and NCC (Normalized Cross-Correlation) matching against a glyph atlas to find the character that *actually* fits the shape, not just the light.

### 4. Frequency-Aware Mapping
Using structure tensors to detect local orientation and coherence. The engine automatically selects directional characters (`/`, `\`, `|`, `-`) for edges and high-energy textures for detailed areas.

---

## ✨ Features

### 🛠 Rendering Pipeline
- **Local Contrast (CLAHE)**: Contrast-Limited Adaptive Histogram Equalization prevents highlights from washing out and preserves mid-tone detail.
- **Saliency-Aware Rendering**: Automatically detects the most "interesting" parts of your image and allocates more detail/contrast to them.
- **Glyph-Space Dithering**: Perceptual error diffusion that operates in the glyph matching space for ultra-high fidelity results.
- **Tone Control**: Professional-grade gamma, exposure, and edge accentuation sliders.

### 🎨 Customization & Aesthetics
- **Custom Character Sets**: Type any string of characters; the engine automatically measures their optical density and sorts them for perfect rendering.
- **16+ Built-in Charsets**: Blocks, Braille, Japanese (Katakana), Circuitry, Math symbols, Scanlines, and more.
- **8 Dynamic Themes**: From "Matrix Green" and "Amber Terminal" to "Full Colour" and "Ice Blue CRT".
- **Film Aesthetics**: Adjustable vignette and simulated film grain for a retro feel.

### 📦 Pro Export Options
- **HTML**: Responsive, CSS-styled output for websites.
- **SVG**: Infinite resolution vector output, perfect for print.
- **PNG**: High-quality raster export.
- **PDF**: Ready-to-print vector documents.
- **TXT**: Plain-text output for terminals and code comments.

---

## 🛠 Technical Details

- **Language**: Vanilla JavaScript (ES6+ Modules)
- **Rendering**: HTML5 Canvas (High-DPR supported)
- **AI Engine**: WebAssembly + ONNX (via `@imgly/background-removal`)
- **Math**: Custom implementations of Sobel operators, Structure Tensors, and Laplacian Pyramids.
- **Zero-Dependency Core**: All rendering logic is hand-rolled in `engine.js` for maximum performance.

---

## 🏗 Setup & Hosting

Since ASCII Studio is entirely static, it can be hosted anywhere for free.

1. Clone the repository.
2. Open `index.html` in any modern browser.
3. (Optional) Host on GitHub Pages by enabling it in your repository settings.

---

*Built with ❤️ by [RedShifted Labs](https://github.com/RedShiftedLabs)*
