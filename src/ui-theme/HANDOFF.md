# HERO brochure theme: handoff

## Integrate (one line, main agent)
In `src/main.tsx`, add this line directly **after** `import './styles.css';`:

```ts
import './ui-theme/hero-theme.css';
```

The theme overrides existing classes with equal specificity, so it must load after `styles.css`. No markup changes are required.

## Files
- `hero-theme.css`: the theme (CSS only, no assets, no font package).
- `preview.html` / `preview.ts`: a dev-only preview that renders the real app with the theme applied (`/src/ui-theme/preview.html`). Not part of the build. It can be deleted after integration.

## What it does
- Brand tokens are defined as `--hero-*` custom properties. The base stylesheet's `--bg/--panel/--text/--muted/--teal/--blue` are remapped onto them.
- Background: black, with a faint burnt-orange radial glow at the lower left and a dark-brown glow at the upper right (CSS gradients, fixed, no motion). Panels are about 94% opaque `#121212`.
- Text is warm white; secondary text is muted gray. Panel titles have an orange accent bar. Primary buttons are orange with black text; `.btn-accent` (Run A/B) is an orange outline. Hover, disabled, `aria-pressed` and `aria-selected` states are all styled, and focus uses a global `:focus-visible` orange outline.
- Readings use large tabular numerals. The overflow "Venting" state is highlighted in red.
- The scene keeps the photo's natural colours (no filter). The container gets a thin border, and the Photo/3D toggle is themed with `!important` because its styles are inline.
- Charts: the grid, axes, ticks, legend and tooltip are darkened. Series are recoloured with CSS attribute selectors on the colours `ChartsPanel` passes:
  - pressure/inlet `#1f5fa8` → sky `#7fb8ff`
  - CO₂ bulk `#d9822b` → orange `#f8532b`
  - inspired-CO₂ markers `#c0392b` → warm white diamonds
  - O₂/maintenance `#0f8a8a` → mint `#4fd1b0`
  - overflow `#7b4fb0` → lilac `#e0a8ff`, dotted
  - threshold line and label → amber `#ffc857`; parameter-change lines → dark gray

## Recommended follow-up (optional, not required)
The chart recolouring depends on the hex values in `ChartsPanel.tsx` `const C` and `TimeChart.tsx`. If those change, the overrides silently stop matching. Cleaner long term: set `C` in `ChartsPanel.tsx` to
`{ teal: '#4fd1b0', blue: '#7fb8ff', orange: '#f8532b', red: '#f4f1eb', purple: '#e0a8ff', grey: '#aaa7a1' }`, and in `TimeChart.tsx` set the grid stroke to `rgba(244,241,235,0.07)`, the threshold stroke/fill to `#ffc857` and the event stroke to `#6e6b66`. The CSS will keep working after that change, but the attribute-selector block becomes redundant.

## Limitations
- Poppins is not installed on this machine and no font package was added. The stack falls back to Segoe UI / system-ui (SF Pro on macOS). To get Poppins, self-host it or have the main agent add a pinned font package.
- The 3D view's canvas keeps its own light clear colour (owned by `src/scene`); the theme doesn't change it.
- SVG overlay labels inside the photo keep the scene agent's light styling, which is intentional on the white photo.
