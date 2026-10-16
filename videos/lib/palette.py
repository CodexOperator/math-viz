"""Colours for the manim videos. These are the DARK theme tokens of css/theme.css under the mapping in docs/ARCHITECTURE.md 11.4
(BG --bg, SURFACE --surface, INK --text, MUTED --text-muted, CART --cart, POLAR --polar, INPUT --input, OUTPUT --output,
SEAM --seam, T0 --t0, T1 --t1, WARN --danger, OK --ok). tests/unit/i2-media-core.test.mjs compares every constant with the
`:root[data-theme="dark"]` block; change both together."""

import math

BG = "#0d121c"        # --bg: background
SURFACE = "#151c2b"   # --surface: panels, cards, label backing
INK = "#e9edf5"       # --text: main text and the point z
MUTED = "#a6b0c3"     # --text-muted: secondary text, faint grid
CART = "#62adf2"      # --cart: everything Cartesian: x, y, Re, Im, drop lines, the slide of addition, grid lines
POLAR = "#ff9d5c"     # --polar: everything polar: r, theta, arg, the ray, the arc, circles, rays, the spin-and-stretch
INPUT = "#3fd0a0"     # --input: the z-plane stroke
OUTPUT = "#e48fd2"    # --output: the w-plane image
SEAM = "#8e99b0"      # --seam: the negative real axis / the cut, dashed
T0 = "#5c7498"        # --t0: start of the time ramp
T1 = "#f3f6fb"        # --t1: end of the time ramp
WARN = "#ff8178"      # --danger: cuts, failures, discontinuities
OK = "#63d08a"        # --ok: agreement checks


def _rgb(h):
    """'#rrggbb' (either case) -> [r, g, b] as ints."""
    s = str(h).strip().lstrip("#")
    return [int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)]


def _hex(v):
    """Three floats -> '#rrggbb'. Each channel is floor(x + 0.5) clamped to 0..255 (JavaScript Math.round for x >= 0)."""
    return "#" + "".join("%02x" % max(0, min(255, int(math.floor(x + 0.5)))) for x in v)


def _clamp01(t):
    """0.0 for a non-finite t, else t clamped to 0..1."""
    try:
        t = float(t)
    except (TypeError, ValueError):
        return 0.0
    return min(1.0, max(0.0, t)) if math.isfinite(t) else 0.0


def mix(a, b, t):
    """sRGB channel-wise linear mix of two '#rrggbb' colours, t clamped to 0..1 (js/core/plane.js mixColor)."""
    k = _clamp01(t)
    A, B = _rgb(a), _rgb(b)
    return _hex([A[i] + (B[i] - A[i]) * k for i in range(3)])


def ramp(base, t, weight=0.4):
    """The site's time ramp (js/core/plane.js rampMix): (1 - weight) * base + weight * mix(T0, T1, t). weight 0 is the plain
    base colour, weight 1 the pure ramp. Keep the operation order: it is the plane.js order."""
    k = _clamp01(t)
    try:
        w = float(weight)
        w = _clamp01(w) if math.isfinite(w) else 0.4
    except (TypeError, ValueError):
        w = 0.4
    B, C0, C1 = _rgb(base), _rgb(T0), _rgb(T1)
    return _hex([B[i] * (1 - w) + (C0[i] + (C1[i] - C0[i]) * k) * w for i in range(3)])
