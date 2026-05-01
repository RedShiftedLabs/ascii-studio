# ASCII Studio

A high-performance, client-side workstation for advanced ASCII synthesis. ASCII Studio leverages computer vision and machine learning to transform images into high-fidelity character-based art, operating entirely within the browser environment.

**[Launch Live Application](https://redshiftedlabs.github.io/ascii-studio/)**

---

## Core Technologies

### V6 Perceptual Fusion Engine
The V6 engine represents our most sophisticated rendering pipeline. It utilizes multi-scale Laplacian decomposition to isolate high-frequency textures from structural edges. This allows for the simultaneous preservation of fine details (such as hair or typography) and sharp contours, even at extreme downsampling ratios.

### Neural Background Isolation
Integrated subject isolation via `@imgly/background-removal`. This feature provides one-click foreground extraction powered by local WASM and ONNX execution. Users can isolate complex subjects and render them into ASCII while maintaining a clean, noise-free composition.

### S-Tier Glyph Mapping
Moving beyond traditional luminance-based lookup, our S-Tier engine implements pixel-level SSD (Sum of Squared Differences) and NCC (Normalized Cross-Correlation) matching. By comparing image patches against a pre-rendered glyph atlas, the system identifies characters that match the geometric topology of the source, rather than just its brightness.

### Frequency-Aware Synthesis
Utilizing local structure tensors to calculate orientation and coherence. The engine dynamically switches between specialized character families—directional strokes (`/`, `\`, `|`, `-`) for edges, and high-entropy characters for textured regions—resulting in a significantly more "readable" and artistic output.

---

## Features & Capabilities

### Rendering Specification
| Category | Features |
| :--- | :--- |
| **Tone Mapping** | CLAHE (Local Contrast), Gamma Correction, Exposure Bias, Edge Accentuation |
| **Aesthetics** | Floyd-Steinberg Dithering, Simulated Film Grain, Dynamic Vignetting, Attenuation |
| **Advanced** | Saliency-Aware Focal Rendering, Glyph-Space Error Diffusion, Multi-Scale Detail Boost |

### Asset Library
> [!TIP]
> Use the **Custom Charset** feature to input any string of symbols. The engine will automatically measure their optical density and integrate them into the rendering pipeline.

- **Standard Sets**: Full Density, Minimalist, Blocks, Braille (Hi-Res), Line Art
- **Specialized Sets**: Scanlines, Circuitry, Japanese (Katakana), Mathematical, Shadow Gradients
- **Color Themes**: Classic Noir, Amber Terminal, Matrix Green, Ice Blue CRT, Vintage Sepia, Full Color

---

## Technical Architecture

ASCII Studio is built on a zero-dependency core designed for low-latency execution and high memory efficiency.

- **Frontend**: Vanilla ECMAScript (ES6+) Modules
- **Graphics**: HTML5 Canvas with High-DPR (Retina) support
- **ML Infrastructure**: WebAssembly + ONNX Runtime
- **Algorithms**: Custom Sobel operators, Laplacian Pyramids, and Bilinear Interpolation for real-time previewing.

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
