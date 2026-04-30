# ASCII Studio

A fully client-side ASCII art converter that runs 100% in the browser.  
**No server needed — host for free on GitHub Pages forever.**

## Live Demo
`https://YOUR_USERNAME.github.io/ascii-studio`

## Features
- Full ASCII pipeline: contrast, gamma, dithering, vignette, grain
- 11 charsets: full, blocks, braille, dots, geometric, edges, binary…
- 8 colour themes: noir, amber, matrix, ice, sepia, rose, colour, colour-warm
- Multi-scale enhancement + saliency-aware rendering
- Export: HTML · TXT · SVG · PNG · PDF

## Deploy to GitHub Pages (3 steps)

```bash
# 1. Clone / fork this repo
git clone https://github.com/YOUR_USERNAME/ascii-studio.git
cd ascii-studio

# 2. Push to GitHub
git add .
git commit -m "init"
git push origin main

# 3. Enable GitHub Pages
# → Repo Settings → Pages → Source: Deploy from branch → main → / (root)
```

Your app will be live at `https://YOUR_USERNAME.github.io/ascii-studio` in ~60 seconds.

## Project Structure

```
ascii-studio/
├── index.html          # App shell — HTML only, no logic
├── styles/
│   ├── main.css        # Layout, tokens, topbar, buttons, toast
│   ├── sidebar.css     # Sidebar shell and header
│   ├── controls.css    # Accordion sections, sliders, toggles
│   └── preview.css     # Drop zone and result area
└── src/
    ├── engine.js       # Core ASCII pipeline (port of engine.py)
    ├── controls.js     # Sidebar state and DOM binding
    ├── renderer.js     # Ties engine to UI, handles export
    └── main.js         # App entry point — wires everything
```

## No build step needed
Pure ES modules — just open `index.html` in a browser or serve with any static host.

```bash
# Local dev (any static server works)
npx serve .
# or
python3 -m http.server 8080
```
