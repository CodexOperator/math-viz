"""shadows-4d: the graph of w = f(z) needs four numbers; every picture on the site is one of its shadows.

Beats (the narration segment ids, in order): intro, side, domain, surfaces, riemann, sphere, close.
Render: node tools/videos/render.mjs --only shadows-4d --quality l   (480p15 check)  or  --quality m  (720p30 deliverable).

The file has two halves. Everything above the marker comment before `from manim import *` is pure maths (math and numpy only, no
manim): tests/unit/i2-videos-4d.test.mjs executes that half under python3 and compares it with js/core/three-view.js and
js/core/domaincolor.js. Everything below it is the manim scene.
"""
import math

import numpy as np

TAU = 2 * math.pi

# ============================ pure maths (math + numpy only) ============================


def stereographic(re, im):
    if not (math.isfinite(re) and math.isfinite(im)):
        return (0.0, 0.0, 1.0)
    h = math.hypot(re, im)
    if h > 1e7:
        q = 1.0 / h
        d = 1.0 + q * q
        return (2 * (re / h) * q / d, 2 * (im / h) * q / d, (1 - q * q) / d)
    s = re * re + im * im
    return (2 * re / (s + 1), 2 * im / (s + 1), (s - 1) / (s + 1))


def inverse_stereographic(X, Y, Z):
    d = 1.0 - Z
    if not d > 0:
        return (math.inf, math.inf)
    return (X / d, Y / d)


def rotate_uv(p, alpha):
    x, y, u, v = p
    c, s = math.cos(alpha), math.sin(alpha)
    return (x, y, u * c - v * s, u * s + v * c)


def rot_x(p, a):
    X, Y, Z = p
    c, s = math.cos(a), math.sin(a)
    return (X, Y * c - Z * s, Y * s + Z * c)


def square_fn(x, y):
    return (x * x - y * y, 2 * x * y)


def riemann_point(r, theta, n=3, part="im"):
    rho = r ** (1.0 / n)
    a = theta / n
    re, im = rho * math.cos(a), rho * math.sin(a)
    return (r * math.cos(theta), r * math.sin(theta), re if part == "re" else im, im if part == "re" else re)


def hue_of(re, im):
    h = math.atan2(im, re) / TAU
    if h < 0:
        h += 1
    if h >= 1:
        h = 0.0
    return h


def lightness_of(re, im):
    """1 - 1 / (1 + sqrt|w|): 0 at 0, 0.5 at |w| = 1, towards 1 at infinity (domaincolor.js lightnessOf)."""
    return 1 - 1 / (1 + math.sqrt(math.hypot(re, im)))


def domain_rgb(re, im, rings=True):
    m2 = re * re + im * im
    if m2 == 0:
        return (0, 0, 0)
    m = math.sqrt(m2)
    l = 1 - 1 / (1 + math.sqrt(m))
    if rings:
        lg = math.log2(m)
        l *= 0.88 + 0.12 * (lg - math.floor(lg))
    h = hue_of(re, im)
    a = 0.8 * min(l, 1 - l)
    h12 = h * 12
    out = []
    for n in (0, 8, 4):
        k = (n + h12) % 12
        out.append(int(math.floor(255 * (l - a * max(-1, min(k - 3, 9 - k, 1))) + 0.5)))
    return tuple(out)


def domain_image(f, half=2.0, px=600, rings=True, mask_radius=None):
    xs = np.linspace(-half, half, px)
    ys = np.linspace(half, -half, px)
    X, Y = np.meshgrid(xs, ys)
    W = f(X + 1j * Y)
    mod = np.abs(W)
    with np.errstate(divide="ignore", invalid="ignore"):
        l = 1 - 1 / (1 + np.sqrt(mod))
        if rings:
            lg = np.log2(np.where(mod > 0, mod, 1.0))
            l = l * (0.88 + 0.12 * (lg - np.floor(lg)))
    h = (np.angle(W) / TAU) % 1.0
    a = 0.8 * np.minimum(l, 1 - l)
    chans = []
    for n in (0, 8, 4):
        k = (n + h * 12) % 12
        chans.append(l - a * np.maximum(-1, np.minimum(np.minimum(k - 3, 9 - k), 1)))
    rgb = np.stack(chans, axis=-1)
    rgb = np.where((mod == 0)[..., None], 0.0, rgb)
    rgb = np.floor(np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)
    alpha = np.full((px, px, 1), 255, dtype=np.uint8)
    if mask_radius is not None:
        alpha = ((X ** 2 + Y ** 2) <= mask_radius ** 2).astype(np.uint8)[..., None] * 255
    return np.concatenate([rgb, alpha], axis=-1)


HIDDEN_STOPS = [(0.0, (68, 1, 84)), (0.25, (59, 82, 139)), (0.5, (33, 145, 140)), (0.75, (94, 201, 98)), (1.0, (253, 231, 37))]


def hidden_ramp(t):
    if t != t:
        t = 0.5
    t = min(1.0, max(0.0, t))
    s = 4 * t
    i = min(3, int(math.floor(s)))
    f = s - i
    a, b = HIDDEN_STOPS[i][1], HIDDEN_STOPS[i + 1][1]
    return tuple((a[k] + (b[k] - a[k]) * f) / 255 for k in range(3))


def hsl_to_rgb(h, s, l):
    h = h - math.floor(h)
    c = (1 - abs(2 * l - 1)) * s
    h6 = h * 6
    x = c * (1 - abs((h6 % 2) - 1))
    m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(math.floor(h6)) % 6]
    return (r + m, g + m, b + m)


def side_stroke(t):
    """The stroke of the side beat: the vertical line x = 1, y from -1.4 to 1.4, as (x, y)."""
    return (1.0, -1.4 + 2.8 * t)


def side_image(t):
    return square_fn(*side_stroke(t))


def circle_z(t):
    """z(t) = 1 + e^{i(pi + 2 pi t)}: the circle |z - 1| = 1, starting and ending at 0, as (x, y)."""
    return (1 - math.cos(TAU * t), -math.sin(TAU * t))


def recip(x, y):
    d = x * x + y * y
    return (x / d, -y / d) if d > 0 else (math.inf, math.inf)


def arg_color(re, im):
    return hsl_to_rgb(math.atan2(im, re) / TAU, 0.8, 0.5)


# ---- scene: manim below this line (tests/unit/i2-videos-4d.test.mjs executes only what is above) ----
from manim import *  # noqa: E402,F401,F403

from lib.narrated import NarratedScene, WORDS_PER_SECOND, PAD_SECONDS, MIN_BEAT_SECONDS  # noqa: E402
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, INPUT, OUTPUT, SEAM, WARN, OK, mix, ramp  # noqa: E402


def rgb_col(rgb):
    return rgb_to_color([float(c) for c in rgb])


def sgn(x, nd=2):
    """'1.25' or '−0.59' (a real minus sign)"""
    return f"{x:.{nd}f}".replace("-", "−")


def cplx(x, y, nd=2):
    return f"{sgn(x, nd)} {'−' if y < 0 else '+'} {abs(y):.{nd}f}i"


def rgb255(rgb):
    return rgb_to_color([c / 255 for c in rgb])


def axis_letter(ch, size=32, color=CART):
    """x, y, u, v as the same italic maths letters the chips and formulas use (MathTex), not an upright Text."""
    return MathTex(ch, font_size=size, color=color)


def stable_label(s, size, color, at):
    """A Text whose line box is the same for every string, so labels sit on one baseline. Two helper glyphs ('d' for an ascender, 'g' for a
    descender) are laid out with the string and then dropped: Text centres on its ink, and without them 'root staircase' (no descender)
    would sit 2 or 3 px lower than 'side by side'. `at` is where the centre of the full line goes; the letters are centred on at[0]."""
    full = Text("dg" + s, font_size=size, color=color).move_to(at)
    vis = VGroup(*full[2:])
    vis.shift(RIGHT * (at[0] - vis.get_center()[0]))
    return vis


def line_half(size):
    """half the height of the line box stable_label uses at this font size"""
    return Text("dg", font_size=size).height / 2


class Clock:
    """Absolute cues inside a beat, in the seconds of the silent estimate; scales when audio changes the beat length."""

    def __init__(self, scene, t, est):
        self.s, self.t0, self.k = scene, scene.renderer.time, t / est

    def now(self):
        return (self.s.renderer.time - self.t0) / self.k

    def until(self, sec):
        d = (sec - self.now()) * self.k
        if d >= 1.0 / config.frame_rate:
            self.s.wait(d)

    def rt(self, secs):
        return max(secs * self.k, 1.0 / config.frame_rate)


class Main(NarratedScene, ThreeDScene):
    narration_id = "shadows-4d"

    # ------------------------------------------------------------ helpers
    def construct(self):
        self.camera.background_color = BG
        self.camera.should_apply_shading = False
        self.set_camera_orientation(phi=0, theta=-90 * DEGREES)
        self.tag_mob = None
        self.stage = []
        self.snaps = {}
        self.beat_intro()
        self.beat_side()
        self.beat_domain()
        self.beat_surfaces()
        self.beat_riemann()
        self.beat_sphere()
        self.beat_close()

    def est(self, seg_id):
        words = len(self.segments[seg_id]["text"].split())
        return max(MIN_BEAT_SECONDS, words / WORDS_PER_SECOND) + PAD_SECONDS

    def put_tag(self, text):
        new = Text(text, font_size=24, color=MUTED).to_corner(UL, buff=0.3)
        if self.tag_mob is not None:
            self.remove(self.tag_mob)
            self.remove_fixed_in_frame_mobjects(self.tag_mob)
        self.add_fixed_in_frame_mobjects(new)
        self.tag_mob = new

    def fixed(self, *mobs):
        self.add_fixed_in_frame_mobjects(*mobs)
        self.remove(*mobs)
        return mobs

    def clear_stage(self, run_time=0.3):
        mobs = list(self.stage)
        if mobs:
            self.play(*[FadeOut(m) for m in mobs], run_time=run_time)
            self.remove(*mobs)
            self.remove_fixed_in_frame_mobjects(*mobs)
            self.remove_fixed_orientation_mobjects(*mobs)
        self.stage = []

    def snap(self, name, box):
        x0, y0, x1, y1 = box
        arr = np.array(self.renderer.camera.pixel_array)
        H, W = arr.shape[:2]
        fw, fh = config.frame_width, config.frame_height
        px0, px1 = int(round((x0 + fw / 2) / fw * W)), int(round((x1 + fw / 2) / fw * W))
        py0, py1 = int(round((fh / 2 - y1) / fh * H)), int(round((fh / 2 - y0) / fh * H))
        self.snaps[name] = np.ascontiguousarray(arr[py0:py1, px0:px1, :])

    def ramp_stroke(self, pts, base, width=6, opacity=1.0):
        n = len(pts) - 1
        cap = CapStyleType.ROUND if opacity >= 1 else CapStyleType.AUTO     # round caps hide the seams of an opaque stroke
        return VGroup(*[Line(pts[i], pts[i + 1], color=ramp(base, (i + 0.5) / n), stroke_width=width, stroke_opacity=opacity, cap_style=cap) for i in range(n)])

    def make_plane(self, center, side, rx, ry=None):
        ry = ry or rx
        p = NumberPlane(
            x_range=[rx[0], rx[1], 1], y_range=[ry[0], ry[1], 1], x_length=side * (rx[1] - rx[0]) / (ry[1] - ry[0]), y_length=side,
            background_line_style={"stroke_color": MUTED, "stroke_width": 1, "stroke_opacity": 0.28},
            axis_config={"stroke_color": MUTED, "stroke_width": 2, "stroke_opacity": 0.9},
        )
        p.move_to(center)
        return p

    # ------------------------------------------------------------ 1 intro
    def beat_intro(self):
        with self.beat("intro") as t:
            c = Clock(self, t, self.est("intro"))
            self.put_tag("one object, five shadows")
            title = MathTex(r"w=f(z)", color=INK).scale(1.5).move_to(UP * 3.0)
            zp = self.make_plane(LEFT * 4.0 + UP * 0.7, 3.4, (-2, 2))
            wp = self.make_plane(RIGHT * 4.0 + UP * 0.7, 3.4, (-4, 4))
            f_arrow = Arrow(LEFT * 1.4 + UP * 0.7, RIGHT * 1.4 + UP * 0.7, color=INK, buff=0, stroke_width=4)
            f_lab = MathTex(r"f", color=INK).next_to(f_arrow, UP, buff=0.1)
            axl = VGroup(
                axis_letter("x").next_to(zp.c2p(2, 0), DOWN, buff=0.06),
                axis_letter("y").next_to(zp.c2p(0, 2), LEFT, buff=0.08),
                axis_letter("u").next_to(wp.c2p(4, 0), DOWN, buff=0.06),
                axis_letter("v").next_to(wp.c2p(0, 4), LEFT, buff=0.08),
            )
            zt = MathTex(r"z", color=INPUT).next_to(zp, UP, buff=0.12).align_to(zp, LEFT)
            wt = MathTex(r"w", color=OUTPUT).next_to(wp, UP, buff=0.12).align_to(wp, LEFT)
            planes = VGroup(zp, wp, f_arrow, f_lab, axl, zt, wt)
            self.play(FadeIn(title), run_time=c.rt(0.6))
            self.play(FadeIn(planes), run_time=c.rt(0.8))
            self.stage = [title, planes]
            c.until(3.0)
            dz = Dot(zp.c2p(1, 1), radius=0.1, color=INPUT)
            dw = Dot(wp.c2p(0, 2), radius=0.1, color=OUTPUT)
            self.play(FadeIn(dz), FadeIn(dw), run_time=c.rt(0.5))
            self.stage += [dz, dw]
            vals = [("x", "1", 4.4), ("y", "1", 5.8), ("u", "0", 7.2), ("v", "2", 8.6)]
            chips = VGroup(*[
                MathTex(a, "=", b, font_size=40, color=CART)      # one baseline for x, y, u, v
                for a, b, _ in vals
            ]).arrange(RIGHT, buff=0.7).move_to(DOWN * 2.0)
            for ch in chips:
                ch[2].set_color(INK)
            for ch in chips:      # arrange() centres each chip on its ink, and the descender of y lowers its box: line up the = signs (identical glyphs)
                ch.shift(UP * (chips[0][1].get_center()[1] - ch[1].get_center()[1]))
            self.stage += [chips]
            for ch, (_, _, at) in zip(chips, vals):
                c.until(at)
                self.play(FadeIn(ch, shift=UP * 0.2), run_time=c.rt(0.5))
            c.until(9.3)
            brace = Brace(chips, DOWN, color=INK)
            btxt = Text("four numbers", font_size=30, color=INK).next_to(brace, DOWN, buff=0.1)
            self.play(GrowFromCenter(brace), FadeIn(btxt), run_time=c.rt(0.5))
            self.stage += [brace, btxt]
            # nobody can draw four dimensions
            c.until(10.0)
            self.play(FadeOut(planes), FadeOut(dz), FadeOut(dw), FadeOut(brace), FadeOut(btxt), chips.animate.move_to(UP * 2.0), run_time=c.rt(0.5))
            o = DOWN * 0.5
            ax = VGroup(
                Arrow(o, o + RIGHT * 1.6, buff=0, color=CART, stroke_width=4),
                Arrow(o, o + UP * 1.3, buff=0, color=CART, stroke_width=4),
                Arrow(o, o + (LEFT * 1.0 + DOWN * 0.7), buff=0, color=CART, stroke_width=4),
                DashedLine(o, o + (RIGHT * 1.0 + DOWN * 0.9), color=WARN, stroke_width=4),
            )
            labs = VGroup(
                axis_letter("x", 34).move_to(o + RIGHT * 1.95),
                axis_letter("y", 34).move_to(o + UP * 1.6),
                axis_letter("u", 34).move_to(o + LEFT * 1.3 + DOWN * 0.95),
                MathTex(r"v\,?", font_size=34, color=WARN).move_to(o + RIGHT * 1.5 + DOWN * 1.2),
            )
            self.play(FadeIn(ax), FadeIn(labs), run_time=c.rt(0.6))
            self.stage += [ax, labs]
            c.until(12.0)
            names = ["side by side", "painted plane", "real and imaginary", "root staircase", "sphere"]
            self.play(FadeOut(ax), FadeOut(labs), run_time=c.rt(0.4))
            boxes = []
            for i, n in enumerate(names):          # names at 20 pt; each box is as wide as its name needs, so the row still fits the frame
                name = stable_label(n, 20, INK, DOWN * 0.17)
                num = Text(str(i + 1), font_size=22, color=MUTED).move_to(UP * 0.25)
                rect = RoundedRectangle(corner_radius=0.12, width=max(1.6, name.width + 0.62), height=1.3, stroke_color=SEAM, stroke_width=2, fill_color=SURFACE, fill_opacity=1)
                boxes.append(VGroup(rect, num, name))
            boxes = VGroup(*boxes).arrange(RIGHT, buff=0.26).move_to(DOWN * 0.8)     # a gap clearly wider than the 4 percent pulse of "Here are five": the 2-3 pair closes by 0.02 x (w2 + w3) = 0.12 of 0.26
            fan = VGroup(*[Line(chips.get_bottom() + DOWN * 0.1, b.get_top(), color=MUTED, stroke_width=2, stroke_opacity=0.6) for b in boxes])
            self.stage += [boxes, fan]
            for i, (b, ln) in enumerate(zip(boxes, fan)):
                c.until(12.6 + 1.2 * i)
                self.play(FadeIn(b, shift=DOWN * 0.15), FadeIn(ln), run_time=c.rt(0.4))
            c.until(19.2)
            self.play(*[b.animate.scale(1.04) for b in boxes], run_time=c.rt(0.3))
            self.play(*[b.animate.scale(1 / 1.04) for b in boxes], run_time=c.rt(0.3))
            c.until(20.3)
            self.clear_stage()

    # ------------------------------------------------------------ 2 side
    def beat_side(self):
        with self.beat("side") as t:
            c = Clock(self, t, self.est("side"))
            self.put_tag("1 of 5 · side by side")
            zp = self.make_plane(LEFT * 3.8 + UP * 0.35, 4.8, (-2, 2))
            wp = self.make_plane(RIGHT * 3.8 + UP * 0.35, 4.8, (-4, 4))
            labs = VGroup(
                axis_letter("x").next_to(zp.c2p(2, 0), DOWN, buff=0.06),
                axis_letter("y").next_to(zp.c2p(0, 1.7), RIGHT, buff=0.08),
                axis_letter("u").next_to(wp.c2p(4, 0), DOWN, buff=0.06),
                axis_letter("v").next_to(wp.c2p(0, 3.4), RIGHT, buff=0.08),
                MathTex(r"z=x+iy", color=INPUT).scale(0.8).next_to(zp, UP, buff=0.12).align_to(zp, LEFT),
                MathTex(r"w=z^{2}=u+iv", color=OUTPUT).scale(0.8).next_to(wp, UP, buff=0.12).align_to(wp, LEFT),
            )
            N = 40
            zs = self.ramp_stroke([zp.c2p(*side_stroke(i / N)) for i in range(N + 1)], INPUT)
            ws = self.ramp_stroke([wp.c2p(*side_image(i / N)) for i in range(N + 1)], OUTPUT)
            tt = [0, 0.25, 0.5, 0.75, 1]
            zd = VGroup(*[Dot(zp.c2p(*side_stroke(a)), radius=0.085, color=ramp(INPUT, a, 0.6)) for a in tt])
            wd = VGroup(*[Dot(wp.c2p(*side_image(a)), radius=0.085, color=ramp(OUTPUT, a, 0.6)) for a in tt])
            tl = ["0", "¼", "½", "¾", "1"]
            zl = VGroup(*[Text(x, font_size=20, color=MUTED).next_to(d, LEFT, buff=0.3) for x, d in zip(tl, zd)])
            # on the w plane the labels sit outside the parabola: left of the two ends, right of the three between
            wl = VGroup(*[Text(x, font_size=20, color=MUTED).next_to(d, LEFT if i in (0, 4) else RIGHT, buff=0.3) for i, (x, d) in enumerate(zip(tl, wd))])
            for lb in (zl[2], wl[2]):       # the dot at t = 1/2 sits on the x and u axes: lift its label clear of the axis line, which struck through the 1 of the half
                lb.shift(UP * 0.24)
            arrow = Arrow(LEFT * 1.0 + UP * 0.35, RIGHT * 1.0 + UP * 0.35, color=INK, buff=0, stroke_width=4)
            flab = MathTex(r"f", color=INK).next_to(arrow, UP, buff=0.08)
            clk = Text("t: 0 → 1", font_size=22, color=MUTED).next_to(arrow, DOWN, buff=0.1)
            tr = ValueTracker(0)
            ring_z = Circle(radius=0.2, color=INK, stroke_width=3).move_to(zp.c2p(*side_stroke(0)))
            ring_w = Circle(radius=0.2, color=INK, stroke_width=3).move_to(wp.c2p(*side_image(0)))
            ring_z.add_updater(lambda m: m.move_to(zp.c2p(*side_stroke(tr.get_value()))))
            ring_w.add_updater(lambda m: m.move_to(wp.c2p(*side_image(tr.get_value()))))
            pic = VGroup(zp, wp, labs, zs, ws, zd, wd, zl, wl, arrow, flab, clk, ring_z, ring_w)
            self.play(FadeIn(pic), run_time=0.4)
            self.stage = [pic]
            c.until(3.6)
            self.play(tr.animate.set_value(1), run_time=c.rt(6.0), rate_func=linear)          # 3.6 -> 9.6
            c.until(10.8)
            for i, a in enumerate(tt):                                                         # 10.8 -> 15.2
                self.play(tr.animate.set_value(a), run_time=c.rt(0.35), rate_func=smooth)
                c.until(10.8 + 0.9 * (i + 1))
            self.play(tr.animate.set_value(0.25), run_time=c.rt(0.4), rate_func=smooth)
            self.snap("side", (-6.5, -2.3, 6.5, 3.4))
            c.until(15.6)
            # make room: shrink the pair towards the top, then open the microscope
            self.play(pic.animate.scale(0.8, about_point=UP * 3.0), run_time=c.rt(0.5))
            z0 = side_stroke(0.25)
            w0 = square_fn(*z0)
            rho, M = 0.1, 2.0
            cL, cR = LEFT * 2.9 + DOWN * 2.65, RIGHT * 2.9 + DOWN * 2.65
            discL = Circle(radius=1.1, color=MUTED, stroke_width=2, fill_color=SURFACE, fill_opacity=1).move_to(cL)
            discR = Circle(radius=1.1, color=MUTED, stroke_width=2, fill_color=SURFACE, fill_opacity=1).move_to(cR)
            cs = [(z0[0] - rho, z0[1] - rho), (z0[0] + rho, z0[1] - rho), (z0[0] + rho, z0[1] + rho), (z0[0] - rho, z0[1] + rho)]
            outline = []
            for i in range(4):
                p, q = cs[i], cs[(i + 1) % 4]
                outline += [(p[0] + (q[0] - p[0]) * j / 8, p[1] + (q[1] - p[1]) * j / 8) for j in range(8)]
            sqL = Polygon(*[np.array([(p[0] - z0[0]) * M, (p[1] - z0[1]) * M, 0]) + cL for p in outline], color=INPUT, stroke_width=3, fill_color=INPUT, fill_opacity=0.25)
            sqR = Polygon(*[np.array([(q[0] - w0[0]) * M, (q[1] - w0[1]) * M, 0]) + cR for q in (square_fn(*p) for p in outline)], color=OUTPUT, stroke_width=3, fill_color=OUTPUT, fill_opacity=0.25)
            fpr = (2 * z0[0], 2 * z0[1])
            aL = Arrow(cL, cL + RIGHT * 0.4, buff=0, color=INK, stroke_width=4, max_tip_length_to_length_ratio=0.35)
            aR = Arrow(cR, cR + np.array([(fpr[0] * 0.2) * M, (fpr[1] * 0.2) * M, 0]), buff=0, color=INK, stroke_width=4, max_tip_length_to_length_ratio=0.35)
            cap1 = Text("up close:", font_size=22, color=INK).move_to(DOWN * 2.2)
            cap2 = MathTex(r"f'(z)=2z", color=INK).scale(0.8).move_to(DOWN * 2.75)
            cap3 = Text("stretch 2.44, turn −35°", font_size=20, color=POLAR).move_to(DOWN * 3.3)
            mic = VGroup(discL, discR, sqL, sqR, cap1)
            self.play(FadeIn(mic), run_time=c.rt(0.5))
            self.stage += [mic, aL, aR, cap2, cap3]
            c.until(19.6)
            self.play(FadeIn(aL), FadeIn(aR), run_time=c.rt(0.8))
            c.until(21.4)
            self.play(FadeIn(cap2), FadeIn(cap3), run_time=c.rt(0.6))
            c.until(self.est("side") - 0.45)
            ring_z.clear_updaters()
            ring_w.clear_updaters()
            self.clear_stage()

    # ------------------------------------------------------------ 3 domain
    def beat_domain(self):
        with self.beat("domain") as t:
            c = Clock(self, t, self.est("domain"))
            self.put_tag("2 of 5 · painted plane")
            side = 4.8
            cp = LEFT * 4.2 + DOWN * 0.1
            unit = side / 4.0
            img = ImageMobject(domain_image(lambda z: z * z, 2.0, 600)).scale_to_fit_height(side).move_to(cp)
            frame = Square(side_length=side, color=MUTED, stroke_width=2).move_to(cp)
            ax = VGroup(
                Line(cp + LEFT * side / 2, cp + RIGHT * side / 2, color=INK, stroke_width=1.5, stroke_opacity=0.5),
                Line(cp + DOWN * side / 2, cp + UP * side / 2, color=INK, stroke_width=1.5, stroke_opacity=0.5),
                axis_letter("x").next_to(cp + RIGHT * side / 2, RIGHT, buff=0.1),
                axis_letter("y").next_to(cp + UP * side / 2, UP, buff=0.08),
                MathTex(r"z", color=INPUT).next_to(frame, UP, buff=0.1).align_to(frame, LEFT),
            )
            self.play(FadeIn(img), FadeIn(frame), FadeIn(ax), run_time=0.4)
            self.stage = [img, frame, ax]
            c.until(0.8)
            # arrange() centres each Text on its ink, and the descender and ascenders of "place: x, y" lifted its baseline 2 to 3 px over "colour: w":
            # both labels are stable_label lines (the same line box), side by side with 0.5 between, centred under the frame
            how_a, how_b = stable_label("place: x, y", 22, CART, ORIGIN), stable_label("colour: w", 22, OUTPUT, ORIGIN)
            how_w = how_a.width + 0.5 + how_b.width
            how_y = cp[1] - side / 2 - 0.2 - line_half(22)
            how_a.shift(RIGHT * (cp[0] - how_w / 2 + how_a.width / 2) + UP * how_y)
            how_b.shift(RIGHT * (cp[0] + how_w / 2 - how_b.width / 2) + UP * how_y)
            how = VGroup(how_a, how_b)
            self.play(FadeIn(how), run_time=c.rt(0.5))
            self.stage += [how]

            def zpos(x, y):
                return cp + RIGHT * x * unit + UP * y * unit

            wp = self.make_plane(RIGHT * 0.3 + UP * 1.2, 3.0, (-2, 2))
            wlab = MathTex(r"w=z^{2}", color=OUTPUT).scale(0.8).next_to(wp, UP, buff=0.1)
            wheel = ImageMobject(domain_image(lambda z: z, 2.0, 300, mask_radius=2.0)).scale_to_fit_height(1.5).move_to(RIGHT * 2.6 + UP * 1.7)
            hue_txt = Text("hue: its angle", font_size=20, color=POLAR)
            bri_txt = Text("brightness: its length", font_size=20, color=POLAR)
            VGroup(hue_txt, bri_txt).arrange(DOWN, aligned_edge=LEFT, buff=0.15).next_to(wheel, RIGHT, buff=0.25)    # each line fades in at its cue, at full contrast
            ph = ValueTracker(math.atan2(0.5, 1.0))
            rr = ValueTracker(math.hypot(1.0, 0.5))

            def zc():
                a, r = ph.get_value(), rr.get_value()
                return r * math.cos(a), r * math.sin(a)

            def build_probe():
                x, y = zc()
                p = zpos(x, y)
                dl = VGroup(DashedLine(zpos(x, 0), p, color=CART, stroke_width=3, dash_length=0.08),
                            DashedLine(zpos(0, y), p, color=CART, stroke_width=3, dash_length=0.08))
                dot = Dot(p, radius=0.11, color=INK).set_stroke(BG, 2)
                return VGroup(dl, dot)

            def build_wprobe():
                u, v = square_fn(*zc())
                q = wp.c2p(u, v)
                ang = math.atan2(v, u)
                ray = Line(wp.c2p(0, 0), q, color=POLAR, stroke_width=4)
                arc = Arc(radius=0.45, start_angle=0, angle=ang if abs(ang) > 1e-6 else 1e-6, arc_center=wp.c2p(0, 0), color=POLAR, stroke_width=4)
                wdot = Dot(q, radius=0.11, color=rgb255(domain_rgb(u, v))).set_stroke(INK, 2)
                return VGroup(ray, arc, wdot)

            def build_readout():
                x, y = zc()
                u, v = square_fn(x, y)
                a = Text(f"z = {cplx(x, y)}    Cartesian: x = {sgn(x)}, y = {sgn(y)}", font_size=20, color=CART)
                b = Text(f"w = {cplx(u, v)}    polar: r = {math.hypot(u, v):.2f}, θ = {sgn(math.degrees(math.atan2(v, u)), 1)}°", font_size=20, color=POLAR)
                return VGroup(a, b).arrange(DOWN, aligned_edge=LEFT, buff=0.12).move_to(np.array([-1.2, -1.75, 0]), aligned_edge=LEFT)

            probe = always_redraw(build_probe)
            readout = always_redraw(build_readout)
            c.until(5.6)
            self.add(probe, readout)
            self.stage += [probe, readout]
            c.until(9.2)
            wprobe = always_redraw(build_wprobe)
            self.play(FadeIn(wp), FadeIn(wlab), FadeIn(wheel), run_time=c.rt(0.6))
            self.add(wprobe)
            self.stage += [wp, wlab, wheel, wprobe]
            c.until(12.8)
            self.play(FadeIn(hue_txt), run_time=c.rt(0.4))
            self.stage += [hue_txt]
            c.until(14.4)
            self.play(FadeIn(bri_txt), run_time=c.rt(0.4))
            self.stage += [bri_txt]
            c.until(16.0)
            def key(col, text, y):
                sw = Square(side_length=0.22, stroke_color=INK, stroke_width=1.5, fill_color=col, fill_opacity=1)
                tx = Text(text, font_size=20, color=INK)
                return VGroup(sw, tx).arrange(RIGHT, buff=0.15).move_to(np.array([-1.2, -y, 0]), aligned_edge=LEFT)
            k_red = key(rgb255(domain_rgb(1.0, 0.0)), "red: w on the positive real axis", 2.6)
            axis_hi = DashedLine(cp + LEFT * side / 2, cp + RIGHT * side / 2, color=INK, stroke_width=3, dash_length=0.1)
            self.play(FadeIn(k_red), FadeIn(axis_hi), run_time=c.rt(0.4))
            self.stage += [k_red, axis_hi]
            c.until(18.8)
            k_blk = key(rgb255(domain_rgb(0.0, 0.0)), "black: w = 0", 3.05)
            zero_ring = Circle(radius=0.16, color=INK, stroke_width=3).move_to(cp)
            self.play(FadeIn(k_blk), FadeIn(zero_ring), FadeOut(axis_hi), run_time=c.rt(0.4))
            self.stage += [k_blk, zero_ring]
            c.until(20.0)
            self.play(ph.animate.set_value(math.atan2(0.5, 1.0) + TAU), rr.animate.set_value(1.2), run_time=c.rt(3.0), rate_func=linear)
            self.snap("domain", (-6.8, -2.6, -1.4, 2.9))
            probe.clear_updaters()
            readout.clear_updaters()
            wprobe.clear_updaters()
            c.until(self.est("domain") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 4 surfaces
    def surface_at(self, alpha, n=20):
        k_xy, k_h, half = 1.5, 0.36, 1.5

        def func(x, y):
            u, v = square_fn(x, y)
            return np.array([k_xy * x, k_xy * y, k_h * rotate_uv((x, y, u, v), alpha)[2]])

        s = Surface(func, u_range=[-half, half], v_range=[-half, half], resolution=(n, n), fill_opacity=1,
                    checkerboard_colors=False, stroke_color=BG, stroke_width=0.4)
        for face in s.list_of_faces:
            xm, ym = (face.u1 + face.u2) / 2, (face.v1 + face.v2) / 2
            u, v = square_fn(xm, ym)
            hid = rotate_uv((xm, ym, u, v), alpha)[3]
            face.set_fill(rgb_col(hidden_ramp(0.5 + 0.5 * hid / 4.5)), 1)
        return s

    def beat_surfaces(self):
        with self.beat("surfaces") as t:
            c = Clock(self, t, self.est("surfaces"))
            self.put_tag("3 of 5 · real and imaginary")
            self.set_camera_orientation(phi=58 * DEGREES, theta=-60 * DEGREES)
            surf = self.surface_at(0.0)
            floor = VGroup(*[Line(np.array([-2.25, k * 0.75, -1.85]), np.array([2.25, k * 0.75, -1.85]), color=MUTED, stroke_width=1, stroke_opacity=0.35) for k in range(-3, 4)],
                           *[Line(np.array([k * 0.75, -2.25, -1.85]), np.array([k * 0.75, 2.25, -1.85]), color=MUTED, stroke_width=1, stroke_opacity=0.35) for k in range(-3, 4)])
            # A Line is not shaded in 3D, and the camera draws everything that is not shaded last, on top of the surface: the grid ghosted through the
            # lower right of the saddle. The floor is under every point of the surface and the camera looks down on it, so it is always the farthest
            # thing: shade it in 3D and give every line the depth key of a point far below, so the grid is drawn first and the surface covers it.
            far_below = Point(np.array([0.0, 0.0, -30.0]))
            floor.set_shade_in_3d(True)
            for ln in floor:
                ln.z_index_group = far_below
            cx = RIGHT * 4.3

            def cap(text, size, color, y):
                return Text(text, font_size=size, color=color).move_to(cx + UP * y)

            cap_r, sub_r = cap("real surface", 34, INK, 3.2), cap("height u, colour v", 22, MUTED, 2.65)
            cap_t, sub_t = cap("real → imaginary", 34, INK, 3.2), cap("turning in the u–v plane", 22, MUTED, 2.65)
            cap_i, sub_i = cap("imaginary surface", 34, INK, 3.2), cap("height v, colour −u", 22, MUTED, 2.65)
            bar = Rectangle(width=0.3, height=2.4, stroke_color=SEAM, stroke_width=1.5)
            bar.set_fill(color=[rgb_col(hidden_ramp(1)), rgb_col(hidden_ramp(0.5)), rgb_col(hidden_ramp(0))], opacity=1)
            bar.set(sheen_direction=DOWN)
            bar.move_to(RIGHT * 6.3 + DOWN * 0.4)
            bl = Text("colour", font_size=22, color=MUTED).next_to(bar, UP, buff=0.1)
            self.fixed(cap_r, sub_r, cap_t, sub_t, cap_i, sub_i, bar, bl)
            self.play(FadeIn(surf), FadeIn(floor), FadeIn(cap_r), FadeIn(sub_r), FadeIn(bar), FadeIn(bl), run_time=0.4)
            self.stage = [surf, floor, cap_r, sub_r, bar, bl]

            def turn(a0, a1, secs, extra=()):
                """rotate4 with uv from a0 to a1 (degrees), linear in time; extra animations run alongside"""
                self.play(UpdateFromAlphaFunc(surf, lambda m, a: m.become(self.surface_at(math.radians(a0 + (a1 - a0) * a)))), *extra,
                          run_time=c.rt(secs), rate_func=linear)

            c.until(3.2)
            # the quarter turn: rotate4's u-v rotation from 0 to -90 degrees (25 degrees per second), so the end is exactly (x, y, v)
            turn(0, -7.5, 0.3, [FadeOut(cap_r), FadeOut(sub_r), FadeIn(cap_t), FadeIn(sub_t)])      # 3.2 -> 3.5
            turn(-7.5, -82.5, 3.0)                                                                 # 3.5 -> 6.5
            turn(-82.5, -90, 0.3, [FadeOut(cap_t), FadeOut(sub_t), FadeIn(cap_i), FadeIn(sub_i)])   # 6.5 -> 6.8
            self.stage += [cap_t, sub_t, cap_i, sub_i]
            self.snap("surfaces", (-3.4, -3.0, 3.4, 2.3))
            c.until(12.8)
            turn(-90, -86, 0.3, [FadeOut(cap_i), FadeOut(sub_i), FadeIn(cap_t), FadeIn(sub_t)])     # trades places: back to the real surface
            turn(-86, -4, 2.2)
            turn(-4, 0, 0.3, [FadeOut(cap_t), FadeOut(sub_t), FadeIn(cap_r), FadeIn(sub_r)])
            c.until(15.6)
            self.move_camera(theta=-30 * DEGREES, run_time=c.rt(2.5))
            c.until(self.est("surfaces") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 5 riemann
    def beat_riemann(self):
        with self.beat("riemann") as t:
            c = Clock(self, t, self.est("riemann"))
            self.put_tag("4 of 5 · root staircase")
            self.set_camera_orientation(phi=68 * DEGREES, theta=-58 * DEGREES)
            RMAX, kxy = 1.8, 1.5
            R3 = RMAX ** (1 / 3)

            def P(r, th):
                x, y, h, _ = riemann_point(r, th, 3, "im")
                return np.array([kxy * x, kxy * y, 1.35 * h])

            SOLID, SEETHROUGH = 0.9, 0.5     # sheet opacity: solid by default, see-through while the three values are pointed out

            def sheet(v0, v1, res_v):
                # 12 faces out along r and one face per 7.5 degrees of theta: the painter's sort works on face centres, so small faces
                # keep the boundary between two overlapping sheets from stair-stepping
                sf = Surface(lambda s_, th: P(s_ ** 3, th), u_range=[0.0, R3], v_range=[v0, v1], resolution=(12, res_v), fill_opacity=SOLID,
                             checkerboard_colors=False, stroke_color=BG, stroke_width=0.3)
                for face in sf.list_of_faces:
                    face.set_fill(rgb_col(hsl_to_rgb(((face.v1 + face.v2) / 2) / (6 * PI), 0.8, 0.5)), SOLID)
                return sf

            s0, s12 = sheet(0, 2 * PI, 48), sheet(2 * PI, 6 * PI, 96)
            cx = RIGHT * 4.3
            cap = VGroup(Text("height: Im of the cube root", font_size=24, color=INK), Text("colour: angle of the root", font_size=24, color=INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.12).move_to(cx + UP * 3.1)
            self.fixed(cap)
            self.play(FadeIn(s0), FadeIn(s12), FadeIn(cap), run_time=0.4)
            self.stage = [s0, s12, cap]
            c.until(1.6)
            th0 = PI / 3
            F = P(1.0, th0) * np.array([1, 1, 0])
            hs = [P(1.0, th0 + TAU * k) for k in range(3)]
            line = DashedLine(F + OUT * (min(h[2] for h in hs) - 0.15), F + OUT * (max(h[2] for h in hs) + 0.15), color=CART, stroke_width=3)
            # The three values are drawn as flat dots at the screen position of each root (the camera is still while they show), so no
            # sheet can hide them: INK with a BG rim, bigger than the old 3D dots, whatever sheet they sit on.
            scr = [self.camera.project_point(h)[:2] for h in hs]
            fx, fy = self.camera.project_point(F)[:2]
            floor_dot = Dot(np.array([fx, fy, 0.0]), radius=0.09, color=CART).set_stroke(BG, 2)     # the point of the plane, flat too: a 3D dot sat behind the see-through sheet and went grey
            pts = [Dot(np.array([x_, y_, 0.0]), radius=0.13, color=INK).set_stroke(BG, 3) for x_, y_ in scr]
            labs = [MathTex(r"w_%d" % (k + 1), color=INK).scale(0.8).next_to(pts[k], RIGHT, buff=0.14) for k in range(3)]
            for lb in labs:
                lb.set_stroke(BG, 5, background=True)           # a BG halo, so a label over a coloured sheet stays readable
            self.fixed(floor_dot, *pts, *labs)
            self.play(FadeIn(floor_dot), Create(line), s0.animate.set_opacity(SEETHROUGH), s12.animate.set_opacity(SEETHROUGH), run_time=c.rt(1.0))
            self.stage += [floor_dot, line]
            for k in range(3):
                c.until(3.0 + 0.6 * k)
                self.play(FadeIn(pts[k]), FadeIn(labs[k]), run_time=c.rt(0.3))
                self.stage += [pts[k], labs[k]]
            self.snap("riemann", (-3.4, -3.0, 3.4, 2.3))
            c.until(7.6)
            self.play(*[FadeOut(m) for m in [floor_dot, line, *pts, *labs]], s0.animate.set_opacity(SOLID), s12.animate.set_opacity(SOLID), run_time=c.rt(0.3))
            th = ValueTracker(0.001)
            FLOOR = np.array([1, 1, 0])

            def flat(p3):
                """The screen position of a 3D point as a flat point for a fixed-in-frame mark. The camera keeps its rotation matrix from the last drawn
                frame, so refresh it first (an updater runs before the frame is drawn) and project: the camera goes from theta -58 to -35 degrees
                while the walker walks, so this is done again on every frame."""
                self.camera.reset_rotation_matrix()
                x_, y_ = self.camera.project_point(p3)[:2]
                return np.array([x_, y_, 0.0])

            # The walker's marks are flat fixed-in-frame Dot and DashedLine objects rebuilt every frame at the projected position, like the three
            # values above and the lap label: 3D marks are sorted face by face against the 0.9 opaque sheets and the sheets in front hid them, while
            # the trail (not sorted, drawn on top) did not. Order of drawing: trail, drop line, floor dot, walker dot (on top, with a BG rim).
            trail = always_redraw(lambda: ParametricFunction(lambda a: P(1.0, a), t_range=[0, max(th.get_value(), 0.02)], color=INK, stroke_width=4))

            def drop_line(n=8):
                """The drop line as n dashes (a fixed count: always_redraw's become() cannot follow a DashedLine whose number of dashes changes with its
                length, it split the first near-zero-length pair and left a few specks); each dash is half of its n-th of the line."""
                a, b = flat(P(1.0, th.get_value()) * FLOOR), flat(P(1.0, th.get_value()))
                return VGroup(*[Line(a + (b - a) * (i / n), a + (b - a) * ((i + 0.5) / n), color=CART, stroke_width=3) for i in range(n)]).set_stroke(BG, 6, background=True)

            drop = always_redraw(drop_line)
            fl = always_redraw(lambda: Dot(flat(P(1.0, th.get_value()) * FLOOR), radius=0.09, color=CART).set_stroke(BG, 2))
            marker = always_redraw(lambda: Dot(flat(P(1.0, th.get_value())), radius=0.12, color=INK).set_stroke(BG, 3))
            lap = always_redraw(lambda: Text(f"lap {min(3, int(th.get_value() / TAU) + 1)} of 3", font_size=26, color=INK).move_to(cx + UP * 2.1))
            self.add(trail)
            self.add_fixed_in_frame_mobjects(drop, fl, marker, lap)
            self.stage += [trail, drop, fl, marker, lap]
            c.until(7.9)
            self.move_camera(theta=-35 * DEGREES, added_anims=[th.animate.set_value(6 * PI)], run_time=c.rt(6.5), rate_func=linear)   # 7.9 -> 14.4
            for m in (trail, drop, fl, marker, lap):
                m.clear_updaters()
            # "A branch is one sheet" (14.4): the walker leaves in the same play as sheets 1 and 2 fade, so the cue is on time
            self.play(*[FadeOut(m) for m in (marker, drop, fl, trail, lap)], s12.animate.set_opacity(0.1), run_time=c.rt(0.8))
            # the branch 0 < theta < 2 pi: the cut sits over the positive real axis, the negative real axis is inside the sheet
            c.until(16.4)
            low = ParametricFunction(lambda s_: P(s_ ** 3, 0.0), t_range=[0.0, R3], color=WARN, stroke_width=5)
            high = ParametricFunction(lambda s_: P(s_ ** 3, 2 * PI), t_range=[0.0, R3], color=WARN, stroke_width=5)
            jump = DashedLine(P(RMAX, 0.0), P(RMAX, 2 * PI), color=WARN, stroke_width=4)
            for m, halo in ((low, 9), (high, 9), (jump, 8)):          # a BG outline under the salmon, which is low in contrast on the red part of sheet 0
                m.set_stroke(BG, halo, background=True)
            cut_lab = Text("the cut: positive real axis", font_size=24, color=WARN).move_to(cx + UP * 2.1)
            self.fixed(cut_lab)
            self.play(Create(low), Create(high), FadeIn(jump), FadeIn(cut_lab), run_time=c.rt(1.4))
            self.stage += [low, high, jump, cut_lab]
            c.until(18.8)
            neg = ParametricFunction(lambda s_: P(s_ ** 3, PI), t_range=[0.0, R3], color=OK, stroke_width=6)
            neg_lab = Text("negative real axis: smooth", font_size=24, color=OK).move_to(cx + UP * 1.6)
            form = MathTex(r"f(z)=r^{1/3}e^{i\theta/3},\ 0<\theta<2\pi", color=INK).scale(0.8).move_to(cx + LEFT * 0.4 + DOWN * 3.1)
            self.fixed(neg_lab, form)
            self.play(Create(neg), FadeIn(neg_lab), run_time=c.rt(1.2))
            c.until(20.4)
            self.play(FadeIn(form), run_time=c.rt(0.6))
            self.stage += [neg, neg_lab, form]
            c.until(self.est("riemann") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 6 sphere
    def beat_sphere(self):
        with self.beat("sphere") as t:
            c = Clock(self, t, self.est("sphere"))
            self.put_tag("5 of 5 · sphere")
            self.set_camera_orientation(phi=68 * DEGREES, theta=-30 * DEGREES)
            Rs = 2.0
            sph = Sphere(radius=Rs, resolution=(16, 32), u_range=[0.001, TAU - 0.001], v_range=[0.001, PI - 0.001], checkerboard_colors=False)
            sph.set_fill(SURFACE, 0.35)
            sph.set_stroke(MUTED, 0.6, opacity=0.5)
            eq = ParametricFunction(lambda a: np.array([Rs * math.cos(a), Rs * math.sin(a), 0]), t_range=[0, TAU], color=SEAM, stroke_width=3)
            N = 48

            def curve_pts(a):
                return [np.array(rot_x(stereographic(*circle_z(i / N)), a)) * Rs * 1.012 for i in range(N + 1)]

            def curve(a, base, opacity=1.0):
                return self.ramp_stroke(curve_pts(a), base, width=6, opacity=opacity)

            def curve_dots(a, base):
                return VGroup(*[Dot3D(point=np.array(rot_x(stereographic(*circle_z(tt)), a)) * Rs * 1.012, radius=0.06, color=ramp(base, tt, 0.6)) for tt in (0, 0.25, 0.5, 0.75)])

            c_in = curve(0.0, INPUT)
            d_in = curve_dots(0.0, INPUT)
            npole = Dot3D(point=np.array([0, 0, Rs]), radius=0.07, color=INK)
            spole = Dot3D(point=np.array([0, 0, -Rs]), radius=0.07, color=INK)
            lab_inf = MathTex(r"\infty", color=INK).move_to(np.array([0.0, 0.0, Rs + 0.4]))
            lab_zero = MathTex(r"0", color=INK).scale(0.9).move_to(np.array([0.0, 0.0, -Rs - 0.35]))
            self.add_fixed_orientation_mobjects(lab_inf, lab_zero)
            self.play(FadeIn(sph), FadeIn(eq), FadeIn(c_in), FadeIn(d_in), FadeIn(npole), FadeIn(spole), FadeIn(lab_inf), FadeIn(lab_zero), run_time=0.4)
            self.stage = [sph, eq, c_in, d_in, npole, spole, lab_inf, lab_zero]
            c.until(0.8)
            ph = ValueTracker(0.02)
            trav = always_redraw(lambda: Dot3D(point=np.array([math.sin(ph.get_value()), 0, -math.cos(ph.get_value())]) * Rs * 1.02, radius=0.08, color=INK))
            zval = always_redraw(lambda: Text(f"z = {math.tan(ph.get_value() / 2):.1f}" if ph.get_value() < 2.9 else "z → ∞", font_size=26, color=INK).move_to(RIGHT * 5.0 + UP * 3.0))
            self.add(trav)
            self.add_fixed_in_frame_mobjects(zval)
            self.stage += [trav, zval]
            self.play(ph.animate.set_value(3.1), run_time=c.rt(4.4), rate_func=smooth)           # 0.8 -> 5.2
            trav.clear_updaters(); zval.clear_updaters()
            c.until(6.4)
            self.play(FadeOut(trav), FadeOut(zval), run_time=c.rt(0.3))
            ip = self.make_plane(RIGHT * 4.9 + UP * 0.4, 3.2, (-1, 3), (-2, 2))
            it = MathTex(r"|z-1|=1", color=INPUT).scale(0.8).next_to(ip, UP, buff=0.3)       # clear of the infinity sign at the top of the line
            icirc = self.ramp_stroke([ip.c2p(*circle_z(i / 48)) for i in range(49)], INPUT, width=5)
            idots = VGroup(*[Dot(ip.c2p(*circle_z(tt)), radius=0.07, color=ramp(INPUT, tt, 0.6)) for tt in (0, 0.25, 0.5, 0.75)])
            inset = VGroup(ip, it, icirc, idots)
            self.fixed(inset)
            self.play(FadeIn(inset), run_time=c.rt(0.5))
            self.stage += [inset]
            c.until(9.6)
            self.play(Indicate(spole, scale_factor=2.0, color=INK), run_time=c.rt(0.8))
            c.until(12.8)
            axis = DashedLine(np.array([-Rs * 1.3, 0, 0]), np.array([Rs * 1.3, 0, 0]), color=INK, stroke_width=3)
            l1 = MathTex(r"1", color=INK).scale(0.8).move_to(np.array([Rs * 1.3 + 0.7, 0, 0]))
            lm1 = MathTex(r"-1", color=INK).scale(0.8).move_to(np.array([-Rs * 1.3 - 0.7, 0, 0]))
            self.add_fixed_orientation_mobjects(l1, lm1)
            self.play(Create(axis), FadeIn(l1), FadeIn(lm1), run_time=c.rt(0.8))
            self.stage += [axis, l1, lm1]
            ghost = curve(0.0, INPUT, opacity=0.35)
            self.add(ghost)
            self.remove(c_in, d_in)
            self.stage += [ghost]
            s_ = ValueTracker(0)
            moving = always_redraw(lambda: VGroup(curve(s_.get_value() * PI, mix(INPUT, OUTPUT, s_.get_value())), curve_dots(s_.get_value() * PI, OUTPUT)))
            self.add(moving)
            self.stage += [moving]
            c.until(14.0)
            self.play(s_.animate.set_value(1), run_time=c.rt(4.0), rate_func=smooth)             # 14.0 -> 18.0
            moving.clear_updaters()
            self.snap("sphere", (-3.2, -3.0, 3.2, 3.0))
            c.until(18.8)
            swap = Text("1/z swaps 0 and ∞", font_size=24, color=INK).move_to(DOWN * 3.5)
            self.fixed(swap)
            self.play(FadeIn(swap), run_time=c.rt(0.5))
            self.stage += [swap]
            c.until(20.4)
            line = DoubleArrow(ip.c2p(0.5, -1.9), ip.c2p(0.5, 1.9), buff=0, color=OUTPUT, stroke_width=5, tip_length=0.2)
            wdots = VGroup(*[Dot(ip.c2p(0.5, vv), radius=0.07, color=ramp(OUTPUT, tt, 0.6)) for tt, vv in ((0.25, 0.5), (0.5, 0.0), (0.75, -0.5))])
            wlab = MathTex(r"\mathrm{Re}\,w=\tfrac12", color=OUTPUT).scale(0.8).next_to(ip.c2p(0.5, -1.5), RIGHT, buff=0.15)
            infs = VGroup(MathTex(r"\infty", color=OUTPUT).scale(0.6).next_to(ip.c2p(0.5, 1.9), UP, buff=0.05), MathTex(r"\infty", color=OUTPUT).scale(0.6).next_to(ip.c2p(0.5, -1.9), DOWN, buff=0.05))
            res = VGroup(line, wdots, wlab, infs)
            self.fixed(res)
            self.play(FadeIn(res), run_time=c.rt(1.2))
            self.stage += [res]
            c.until(self.est("sphere") - 0.45)
            self.clear_stage()

    # ------------------------------------------------------------ 7 close
    def beat_close(self):
        with self.beat("close") as t:
            c = Clock(self, t, self.est("close"))
            self.set_camera_orientation(phi=0, theta=-90 * DEGREES)
            self.put_tag("five pictures, one object")
            names = ["side by side", "painted plane", "real and imaginary", "root staircase", "sphere"]
            keys = ["side", "domain", "surfaces", "riemann", "sphere"]
            widths = [3.9, 2.05, 2.05, 2.05, 2.05]       # the wide side-by-side picture gets the wide tile
            tiles = Group()
            for nm, k, w in zip(names, keys, widths):
                im = ImageMobject(self.snaps[k])
                box = RoundedRectangle(corner_radius=0.12, width=w, height=2.3, stroke_color=SEAM, stroke_width=2, fill_color=BG, fill_opacity=1)   # BG like the snapshot: one frame, not two
                if im.width / im.height > (w - 0.2) / 2.1:
                    im.scale_to_fit_width(w - 0.2)
                else:
                    im.scale_to_fit_height(2.1)
                im.move_to(box.get_center())
                lab = stable_label(nm, 20, INK, box.get_bottom() + DOWN * (0.12 + line_half(20)))
                tiles.add(Group(box, im, lab))
            tiles.arrange(RIGHT, buff=0.16).move_to(DOWN * 0.5)
            for g in tiles:                                                  # a label with a descender makes its tile taller: put every box on one line
                g.shift(UP * (tiles[0][0].get_center()[1] - g[0].get_center()[1]))
            obj = MathTex(r"\{(x,y,u,v)\;:\;w=f(z)\}", color=INK).scale(1.1).move_to(UP * 2.9)
            fan = VGroup(*[Line(obj.get_bottom() + DOWN * 0.05, g[0].get_top(), color=MUTED, stroke_width=2, stroke_opacity=0.6) for g in tiles])
            self.play(FadeIn(tiles), FadeIn(obj), FadeIn(fan), run_time=0.4)
            self.stage = [tiles, obj, fan]
            boxes = [g[0] for g in tiles]
            for k, at in enumerate([2.4, 4.8, 6.0, 8.0, 8.8]):
                c.until(at)
                self.play(*[b.animate.set_stroke(INK if i == k else SEAM, 4 if i == k else 2) for i, b in enumerate(boxes)], run_time=c.rt(0.25))
            c.until(9.6)
            self.play(*[b.animate.set_stroke(INK if i == 0 else SEAM, 4 if i == 0 else 2) for i, b in enumerate(boxes)], run_time=c.rt(0.25))
            cap_a = Text("a question about the image of a shape: read this one", font_size=24, color=INK).move_to(DOWN * 3.2)
            self.play(FadeIn(cap_a), run_time=c.rt(0.4))
            self.stage += [cap_a]
            c.until(15.6)
            cap_b = Text("turn the object, and all five are there", font_size=24, color=INK).move_to(DOWN * 3.2)
            self.play(*[b.animate.set_stroke(INK, 4) for b in boxes], FadeOut(cap_a), FadeIn(cap_b), *[ln.animate.set_stroke(INK, 2, 1.0) for ln in fan], run_time=c.rt(0.5))
            self.stage += [cap_b]
            c.until(self.est("close") - 0.1)
