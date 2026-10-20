# Films

`films/film-*.html` are HyperFrames pages made by `make_films.py`, a spin on the shared
manim-hyperframes-matrix skill (R0 page cells M0.1h, M0.3h crossfade, M0.6h page QA; the math is
written here because the trunk's math rows are Manim-only).

Rebuild and QA on the box:

```bash
PY=/workspace/agi-s3-report/.venv/bin/python     # any python; hfkit is imported read-only from the skill
$PY tools/films/make_films.py /workspace/matrix-out/visualizer/pages
# then bundle + per-frame QA through the matrix MCP (consumer form, render on):
#   bundle_page(html=<page>, page_name="film-<id>.html", controls=false, qa=true, qa_every=1)
# qa_clean must be true. Copy <out>/film-<id>/film-<id>.html into films/.
node tools/film-smoke.mjs
```

Rules the pages keep (tools/film-smoke.mjs checks them):
- one paused timeline on `window.__tl`, one tween 0..D whose onUpdate calls `draw(t)`; every value is a function of t;
- beats as `tl.addLabel`, listed in `window.__beats` (reduced motion steps to just before each beat, then the end);
- no `controls.js`, no `gsap.ticker`, no `requestAnimationFrame`/`setTimeout`: the site's film panel (js/core/film.js) is the clock;
- numbers are computed; readouts carry `data-readout` so the panel copies them under the film;
- labels are HTML, not SVG text, so the trunk's page QA measures them;
- the Test 1 and Test 2 colour keys (css/theme.css) are the page's colours, light and dark;
- one cite line at y 560; the panel shows design rows 0 to 600 only.
