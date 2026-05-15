# Design System — arturojreal.github.io

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0a0a0a` | Page and canvas background |
| Primary Text | `#fffffc` | Headings, names, primary labels |
| Secondary Text | `#cccccc` | Body copy, descriptions |
| Accent | `#d8aa5a` | Links, tags, highlights (gold) |
| Model / Particles | `#ffffff` | 3D point-cloud color |

## Typography

- **Font stack**: Plus Jakarta Sans, Inter, system-ui, sans-serif
- **Name / H1**: large, bold, primary text color
- **Section headings (H2/H3)**: medium weight, primary text color
- **Body**: regular weight, secondary text color, comfortable line-height

## Navigation Patterns

### In-app section navigation (index.html SPA)
All in-page sections (Photography, Film, VFX, Projects, About, Connect) share a unified back button:

```html
<button class="back-btn" aria-label="Back to home" onclick="navigateToPage('home')">← Back</button>
```

- Label: **← Back** (no variation)
- Always calls `navigateToPage('home')`
- Uses `.back-btn` CSS class

### External page navigation (projects/, archivist/, etc.)
Standalone pages (separate HTML files served at their own URL) use a `nav-back` link:

```html
<a href="/" class="nav-back">
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 12L6 8l4-4"/>
  </svg>
  Arturo J. Real
</a>
```

- Label: **← Arturo J. Real** (links back to root)
- Uses `.nav-back` CSS class
- Styled per-page within each page's embedded `<style>` block

### Rule
Do not mix these two patterns on the same page. In-app sections → `back-btn`. Standalone pages → `nav-back`.

## Project Cards

Used in `projects/index.html` and within the in-app Projects section of `index.html`.

```html
<a class="project-card" href="/project-slug/">
  <div class="project-card-header" style="background: linear-gradient(...);">
    <!-- emoji icon -->
  </div>
  <div class="project-card-body">
    <div class="project-platform-tags">
      <span class="project-platform-tag">Platform</span>
    </div>
    <h3 class="project-card-name">Project Name</h3>
    <p class="project-card-desc">One-sentence description.</p>
    <span class="project-card-link" style="color: #accent;">
      View project
      <!-- external link arrow SVG -->
    </span>
  </div>
</a>
```

Each project uses a unique gradient and accent color in its card header and link.

## 3D Model / Particle System

- Model file: `ARTURO.ply` (point cloud)
- Particle color: **white** (`#ffffff`) — controlled by `customColor` / `particleColor` in `plyDefaults` (`app.js`)
- Interaction: mouse / touch disperses particles; they return via easing
- Debug panel: controlled by the `DEBUG_MODE` flag at the top of `app.js`. Set `true` locally to tune particle/model parameters; keep `false` in production.

## Debug Panel

The debug panel (`#particle-debug`) is gated by `const DEBUG_MODE = false` at the top of `app.js`. When `false`, the panel element is removed from the DOM at startup. The rendering pipeline (PLY loading, particle system, Three.js scene) runs independently of the debug panel and is not affected by this flag.

To use debug controls locally: set `DEBUG_MODE = true`, reload, and press **D** to toggle the panel.

## Page Structure

```
/                    → index.html   (SPA: home, about, photography, film, vfx, projects)
/projects/           → projects/index.html
/archivist/          → archivist/index.html
/snapbooth/          → snapbooth/index.html
/speranza_hub/       → speranza_hub/index.html
/oura-pebble/        → oura-pebble/index.html
```

Each standalone page is a self-contained HTML file with embedded CSS, no external stylesheet dependency.

## Glassmorphism / Card Style

Recurring pattern across project pages:

- Background: dark (`#080f0c` or `#0a0a0a`)
- Cards: `rgba(255,255,255,0.05–0.08)` fill, `backdrop-filter: blur(20px)`
- Border: `1px solid rgba(255,255,255,0.08–0.12)`
- Hover: slight background lift, subtle border brighten, `transform: translateY(-2px)`

## Content Editing

The following sections contain copy that should be edited directly in the HTML source before pushing to production:

- **About Me** — `index.html`, inside `<article class="about-text">` (around line 619)
- **Projects hub description** — `projects/index.html`, inside `.hero-description`
- **Per-project pages** — each project's `index.html` in its own directory (`archivist/`, `snapbooth/`, `speranza_hub/`, `oura-pebble/`)
