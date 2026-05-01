# ASCII Studio

A high-performance, client-side workstation for advanced ASCII synthesis. ASCII Studio leverages computer vision and neural networks to transform images into high-fidelity character-based art, operating entirely within the browser environment.

**[Launch Live Application](https://redshiftedlabs.github.io/ascii-studio/)**

---

## Core Technologies

### Neural Saliency Synthesis
Utilizing TensorFlow.js and MobileNetV2 to perform semantic analysis of image content. The engine computes a real-time attention map to identify semantically important regions (such as faces or objects) and dynamically modulates character density. This ensures that the viewer's focus is naturally drawn to the most significant parts of the composition.

### Neural Background Isolation
Integrated subject isolation via `@imgly/background-removal`. This feature provides one-click foreground extraction powered by local WASM and ONNX execution. Users can isolate complex subjects and render them into ASCII while maintaining a clean, noise-free composition.

### Organic Binary Halftoning
Our specialized binary rendering engine moves beyond simple thresholding. It uses deterministic pattern rotation and variable-density 0/1 clusters to create an organic, structured look that mimics the clustered halftoning found in high-end digital print, providing a sophisticated "Matrix" aesthetic.

### Local Contrast Optimization
The engine implements a CLAHE-style (Contrast-Limited Adaptive Histogram Equalization) pipeline to ensure detail preservation across all luminance ranges. This prevents highlights from washing out and ensures deep shadows remain textured, providing a professional-grade dynamic range in the final ASCII output.

---

## Features & Capabilities

### Rendering Specification
| Category | Features |
| :--- | :--- |
| **Tone Mapping** | CLAHE (Local Contrast), Gamma Correction, Exposure Bias, Edge Accentuation |
| **Aesthetics** | Floyd-Steinberg Dithering, Simulated Film Grain, Dynamic Vignetting, Attenuation |
| **Advanced** | Neural Saliency Rendering, Organic Binary Synthesis, Multi-Scale Enhancement |

### Asset Library
> [!TIP]
> Use the **Custom Charset** feature to input any string of symbols. The engine will automatically measure their optical density and integrate them into the rendering pipeline.

- **Standard Sets**: Full Density, Minimalist, Blocks, Braille (Hi-Res), Line Art
- **Specialized Sets**: Scanlines, Circuitry, Japanese (Katakana), Mathematical, Shadow Gradients
- **Color Themes**: Classic Noir, Amber Terminal, Matrix Green, Ice Blue CRT, Vintage Sepia, Full Color

---

## Technical Architecture

ASCII Studio is built on a high-performance core designed for low-latency execution and high memory efficiency.

- **Frontend**: Vanilla ECMAScript (ES6+) Modules
- **Graphics**: HTML5 Canvas with High-DPR (Retina) support
- **ML Infrastructure**: TensorFlow.js (MobileNetV2) & ONNX Runtime (via `@imgly/background-removal`)
- **Algorithms**: Bilinear Tile-Interpolation, Sobel Gradient Analysis, and Deterministic Pattern Hashing.

> [!IMPORTANT]
> All processing is performed locally on your device. No image data is ever transmitted to a server, ensuring total privacy and offline capability.

---

## Deployment

As a fully static application, ASCII Studio can be deployed to any web server or static hosting provider.

1. Clone the repository.
2. Serve the directory via any local server (e.g., `npx serve .`).
3. Deploy to production via GitHub Pages, Vercel, or Netlify.

---

*Developed by RedShifted Labs*
