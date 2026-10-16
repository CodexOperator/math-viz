"""motion-time: a function is a motion with a clock (station: mappings).

Beats, in the order of media/narration/videos/motion-time.json: intro, stroke, linear, square, recip, paper.
Design: docs/designs/iter-2/i2-videos-ch2.md. Colours come only from lib.palette. Set BEATS=ids,comma,separated to render a subset
while iterating (a filtered run leaves a partial .vtt: finish with the full render)."""
import cmath
import math
import os

import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, INPUT, OUTPUT, SEAM, T0, T1, WARN, OK, mix, ramp

RAMP_W = 0.45        # strokes: (1 - w) * base + w * ramp(t); the site's plane.js uses 0.4
DOT_W = 0.85         # clock dots and arrow tips: nearly the pure ramp so the clock reads
BOX_W, BOX_H = 6.2, 5.2
LEFT_C, RIGHT_C = (-3.75, -0.2), (3.75, -0.2)
CLOCK_TS = (0.0, 0.25, 0.5, 0.75, 1.0)
Y_TITLE, Y_FOOT = 2.72, -3.45
LINE_Y, PAPER_Y = 2.2, 1.4        # the line x = 2 runs from y = -LINE_Y to LINE_Y (linear, square); PAPER_Y in the small planes of paper


# ---------------------------------------------------------------- the numbers of the story (asserted once, at the top of construct)
def check_numbers():
    for y in np.linspace(-3, 3, 13):
        w = complex(2, y) ** 2                                         # 2.1.2: x = 2 under z^2
        assert abs(w.real - (4 - y * y)) < 1e-9 and abs(w.imag - 4 * y) < 1e-9
        assert abs(w.real - (4 - w.imag ** 2 / 16)) < 1e-9             # u = 4 - v^2/16, focus 0
        w = 1j * complex(2, y) - 2j                                    # 2.1.3: x = 2 under iz - 2i lands on v = 0
        assert abs(w.imag) < 1e-12 and abs(w.real + y) < 1e-12
    for th in np.linspace(-1.5, 1.5, 13):
        z = 2 * math.cos(th) * cmath.exp(1j * th)                      # 2.5.1: |z - 1| = 1
        assert abs(abs(z - 1) - 1) < 1e-9
        assert abs((1 / z).real - 0.5) < 1e-9 and abs((1 / z).imag + 0.5 * math.tan(th)) < 1e-9   # Re w = 1/2
    z = 2.5 * cmath.exp(1j * math.radians(30))                         # polar: r -> r^2, theta -> 2 theta
    assert abs(abs(z * z) - 6.25) < 1e-9 and abs(cmath.phase(z * z) - math.radians(60)) < 1e-9
    assert (2 - 5 * 1.0, 1 - 4 * 1.0) == (-3.0, -3.0)                  # 1.5.1: z(t) = (2 - 5t) + i(1 - 4t) ends at -3 - 3i


# ---------------------------------------------------------------- a framed complex plane
class Plane:
    """`focus` (a complex number) sits at the centre of a box of BOX_W x BOX_H scene units; `scale` screen units per unit."""

    def __init__(self, centre, focus=0j, scale=1.0, box=(BOX_W, BOX_H)):
        self.cx, self.cy = centre
        self.focus = complex(focus)
        self.scale = scale
        self.w, self.h = box

    def pt(self, z):
        z = complex(z)
        return np.array([self.cx + (z.real - self.focus.real) * self.scale, self.cy + (z.imag - self.focus.imag) * self.scale, 0.0])

    def inside(self, z, pad=0.0):
        p = self.pt(z)
        return abs(p[0] - self.cx) <= self.w / 2 - pad and abs(p[1] - self.cy) <= self.h / 2 - pad

    def axes(self):
        """Frame, axes through 0 when visible, integer (or nice-step) ticks with labels kept 0.35 clear of the corners."""
        g = VGroup(Rectangle(width=self.w, height=self.h, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.8,
                             fill_color=SURFACE, fill_opacity=0.55).move_to([self.cx, self.cy, 0]))
        hx, hy = self.w / 2 / self.scale, self.h / 2 / self.scale
        x0, x1 = self.focus.real - hx, self.focus.real + hx
        y0, y1 = self.focus.imag - hy, self.focus.imag + hy
        s = next((s for s in (1, 2, 5, 10, 20) if s * self.scale >= 0.85), 50)
        for k in range(math.ceil(x0 / s), math.floor(x1 / s) + 1):
            x = k * s
            p = self.pt(complex(x, y0))
            if x != 0 and abs(p[0] - self.cx) < self.w / 2 - 0.35:
                g.add(Line(self.pt(complex(x, y0)), self.pt(complex(x, y1)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(str(x).replace("-", "−"), font_size=18, color=MUTED).move_to(p + np.array([0, 0.17, 0])))
        for k in range(math.ceil(y0 / s), math.floor(y1 / s) + 1):
            y = k * s
            p = self.pt(complex(x0, y))
            if y != 0 and abs(p[1] - self.cy) < self.h / 2 - 0.35:
                g.add(Line(self.pt(complex(x0, y)), self.pt(complex(x1, y)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(f"{y}i".replace("-", "−"), font_size=18, color=MUTED).move_to(p + np.array([0.27, 0, 0])))
        if x0 < 0 < x1:
            g.add(Line(self.pt(complex(0, y0)), self.pt(complex(0, y1)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        if y0 < 0 < y1:
            g.add(Line(self.pt(complex(x0, 0)), self.pt(complex(x1, 0)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        return g


def ramped(plane, zs, base, width=6.0, weight=RAMP_W):
    """A stroke as short round-capped segments coloured ramp(base, t), t = (k + 1/2)/(n - 1); segments with an end outside the box are skipped."""
    g = VGroup()
    n = len(zs)
    P = [plane.pt(z) for z in zs]
    for k in range(n - 1):
        if plane.inside(zs[k], 0.03) and plane.inside(zs[k + 1], 0.03):
            g.add(Line(P[k], P[k + 1], stroke_width=width, color=ramp(base, (k + 0.5) / (n - 1), weight), cap_style=CapStyleType.ROUND))
    return g


def clock_dots(plane, zfun, base, ts=CLOCK_TS):
    g = VGroup()
    for t in ts:
        z = zfun(t)
        if plane.inside(z, 0.06):
            g.add(Dot(plane.pt(z), radius=0.085, color=ramp(base, t, DOT_W), stroke_color=BG, stroke_width=2))
    return g


def end_tip(plane, zfun, base, t=1.0):
    d = zfun(t) - zfun(t - 0.01)
    return Triangle(fill_color=ramp(base, 1.0, DOT_W), fill_opacity=1, stroke_width=0).scale(0.13).rotate(math.atan2(d.imag, d.real) - PI / 2).move_to(plane.pt(zfun(t)))


def cursor(plane, zfun, clock, clamp=None):
    c = VGroup(Circle(radius=0.17, stroke_color=INK, stroke_width=3), Dot(radius=0.08, color=INK))

    def follow(m):
        p = plane.pt(zfun(clock.get_value()))
        if clamp is not None:
            p[1] = max(plane.cy - clamp, min(plane.cy + clamp, p[1]))
        m.move_to(p)
    c.add_updater(follow)
    follow(c)
    return c


def link(a, b):
    return always_redraw(lambda: DashedLine(a.get_center(), b.get_center(), color=MUTED, stroke_width=1.5, stroke_opacity=0.6, dash_length=0.12))


def clock_bar(tracker, centre=(3.25, Y_FOOT), width=3.8):
    n = 48
    cx, cy = centre
    bar = VGroup(*[Rectangle(width=width / n + 0.005, height=0.17, stroke_width=0, fill_opacity=1, fill_color=mix(T0, T1, (i + 0.5) / n))
                   .move_to([cx - width / 2 + (i + 0.5) * width / n, cy, 0]) for i in range(n)])
    labs = VGroup(Text("t", font_size=26, color=INK).move_to([cx - width / 2 - 0.35, cy, 0]),
                  Text("0", font_size=20, color=MUTED).move_to([cx - width / 2, cy - 0.27, 0]),
                  Text("1", font_size=20, color=MUTED).move_to([cx + width / 2, cy - 0.27, 0]))
    marker = always_redraw(lambda: Triangle(fill_color=INK, fill_opacity=1, stroke_width=0).scale(0.1).rotate(PI)
                           .move_to([cx - width / 2 + tracker.get_value() * width, cy + 0.21, 0]))
    read = always_redraw(lambda: Text(f"t = {tracker.get_value():.2f}", font_size=26, color=INK).move_to([cx + width / 2 + 0.95, cy, 0]))
    return VGroup(bar, labs, marker, read)


def plane_titles(left=r"z = x + iy", right=r"w = u + iv"):
    return (MathTex(left, font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]),
            MathTex(right, font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0]))


def whole(x):
    """x rounded to a whole number, as text with a real minus sign and never '-0' (a tiny negative angle reads 0)."""
    n = int(round(x))
    return str(abs(n) if n == 0 else n).replace("-", "\u2212")


def headline(main, sub=None):
    g = VGroup(Text(main, font_size=34, color=INK).move_to([-6.85, 3.55, 0], aligned_edge=LEFT))
    if sub:
        g.add(Text(sub, font_size=24, color=MUTED).move_to([6.85, 3.5, 0], aligned_edge=RIGHT))
    return g


# Draw order of the slots (manim sorts by z_index): frames below curves below overlays below labels below cursors below the rest.
SLOT_Z = {"left": 0, "right": 0, "mid": 1, "cards": 1, "data_l": 1, "data_r": 1, "lab": 3, "focus": 3, "cur": 4,
          "over": 5, "over2": 5, "polar": 5, "ring": 5, "head": 6, "foot": 6}


class Stage:
    """Named slots. put(slot=group, ...) fades the old group of each slot out and the new one in, together, in one play.
    A group is faded in and out as a whole and nothing else ever adds to or fades a member of it separately."""

    def __init__(self, scene):
        self.scene = scene
        self.slots = {}

    def put(self, run=0.3, **kw):
        anims = []
        for name, new in kw.items():
            old = self.slots.get(name)
            if old is not None:
                for m in old.get_family():
                    m.clear_updaters()
                anims.append(FadeOut(old))
            if new is not None:
                new.set_z_index(SLOT_Z.get(name, 2))
                anims.append(FadeIn(new))
            self.slots[name] = new
        if anims:
            self.scene.play(*anims, run_time=run)

    def place(self, **kw):
        """Put groups on the stage at once, with no transition. Only the first beat of a film uses it, so that frame 0 is the intro card:
        the poster frame a browser shows before the student presses play."""
        for name, new in kw.items():
            new.set_z_index(SLOT_Z.get(name, 2))
            self.scene.add(new)
            self.slots[name] = new

    def cut(self, run=0.3, **kw):
        """Like put, but every slot not named is cleared: a beat starts from a clean stage."""
        names = set(self.slots) | set(kw)
        self.put(run=run, **{n: kw.get(n) for n in names})

    def freeze(self, name):
        if self.slots.get(name) is not None:
            for m in self.slots[name].get_family():
                m.clear_updaters()


class Main(NarratedScene):
    narration_id = "motion-time"

    def setup(self):
        super().setup()
        self.camera.background_color = BG
        self.st = Stage(self)
        self.only = {s for s in os.environ.get("BEATS", "").split(",") if s}

    def on(self, beat_id):
        return not self.only or beat_id in self.only

    def construct(self):
        check_numbers()
        if self.on("intro"):
            with self.beat("intro") as t:
                self.beat_intro(t)
        if self.on("stroke"):
            with self.beat("stroke") as t:
                self.beat_stroke(t)
        if self.on("linear"):
            with self.beat("linear") as t:
                self.beat_linear(t)
        if self.on("square"):
            with self.beat("square") as t:
                self.beat_square(t)
        if self.on("recip"):
            with self.beat("recip") as t:
                self.beat_recip(t)
        if self.on("paper"):
            with self.beat("paper") as t:
                self.beat_paper(t)

    # ------------------------------------------------------------ intro: every point is carried
    def beat_intro(self, t):
        L = Plane(LEFT_C, focus=1.0, scale=1.0)
        R = Plane(RIGHT_C, focus=0.0, scale=0.5)
        pts = [complex(x, y) for x in (0.5, 1.0, 1.5) for y in (-1.5, -0.75, 0.0, 0.75, 1.5)]
        f = lambda z: z * z
        d_in = VGroup(*[Dot(L.pt(z), radius=0.09, color=INPUT) for z in pts])
        ghosts = VGroup(*[Dot(L.pt(z), radius=0.09, color=INPUT) for z in pts])      # they leave the input dots green and turn pink on the way
        arrow = Arrow([-0.45, 0.2, 0], [0.45, 0.2, 0], buff=0, color=MUTED, stroke_width=4)
        f_lab = MathTex(r"f", font_size=40, color=INK).next_to(arrow, UP, buff=0.05)
        a, b = plane_titles()
        self.st.place(head=headline("A function is a motion", "it picks up every point"),
                    left=VGroup(L.axes(), a, d_in), right=VGroup(R.axes(), b),
                    mid=VGroup(arrow, f_lab, ghosts),
                    foot=VGroup(MathTex(r"f(z) = z^2", font_size=40, color=INK).move_to([0, Y_FOOT, 0])))
        targets = [Dot(R.pt(f(z)), radius=0.09, color=OUTPUT) for z in pts]
        self.play(LaggedStart(*[Transform(g, tg, path_arc=-0.7) for g, tg in zip(ghosts, targets)], lag_ratio=0.05), run_time=0.35 * t)
        arcs = VGroup(*[ArcBetweenPoints(L.pt(z) + np.array([0.12, 0, 0]), R.pt(f(z)) - np.array([0.12, 0, 0]), angle=-0.7, stroke_color=MUTED, stroke_width=1.2, stroke_opacity=0.45) for z in pts])
        self.st.put(run=0.15 * t, over=arcs)

    # ------------------------------------------------------------ stroke: the clock
    def beat_stroke(self, t):
        zin = lambda s: complex(0.5 + 2.0 * s, 1.4 * math.sin(2 * math.pi * s))
        zout = lambda s: zin(s) ** 2
        L = Plane(LEFT_C, focus=1.5, scale=1.0)
        R = Plane(RIGHT_C, focus=complex(2.6, -1.4), scale=0.55)
        ts = np.linspace(0, 1, 241)
        clock = ValueTracker(0.0)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock)
        a, b = plane_titles()
        self.st.cut(head=headline("A stroke carries a clock", "the image keeps the clock"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT), end_tip(L, zin, INPUT)),
                    data_r=VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT), end_tip(R, zout, OUTPUT)),
                    mid=VGroup(link(cz, cw)), cur=VGroup(cz, cw),
                    foot=VGroup(MathTex(r"z(t),\ 0 \le t \le 1", font_size=36, color=INK).move_to([LEFT_C[0], Y_FOOT, 0]), clock_bar(clock)))
        self.play(clock.animate.set_value(1.0), run_time=0.8 * t, rate_func=linear)

    # ------------------------------------------------------------ linear: one turn, one slide
    def beat_linear(self, t):
        zin = lambda s: complex(2, -LINE_Y + 2 * LINE_Y * s)
        L = Plane(LEFT_C, scale=1.0)
        R = Plane(RIGHT_C, scale=1.0)
        ts = np.linspace(0, 1, 101)
        a, b = plane_titles()
        lab_in = MathTex(r"x = 2", font_size=34, color=INPUT).move_to(L.pt(complex(2.6, 2.1)))
        e1 = Arrow(R.pt(0), R.pt(1), buff=0, color=CART, stroke_width=5, max_tip_length_to_length_ratio=0.3)
        e2 = Arrow(R.pt(0), R.pt(1j), buff=0, color=CART, stroke_width=5, max_tip_length_to_length_ratio=0.3)
        mover = VGroup(ramped(R, [zin(s) for s in ts], OUTPUT), clock_dots(R, zin, OUTPUT), end_tip(R, zin, OUTPUT), e1, e2,
                       Circle(radius=0.12, stroke_color=INK, stroke_width=3).move_to(R.pt(0)))
        self.st.cut(head=headline("Linear: one turn, one slide", "lines stay lines"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT), end_tip(L, zin, INPUT)),
                    data_r=VGroup(mover), lab=VGroup(lab_in),
                    foot=VGroup(MathTex(r"w = iz - 2i = i(z - 2)", font_size=36, color=INK).move_to([LEFT_C[0], Y_FOOT, 0])))
        turn = MathTex(r"\text{turn: }\times i", font_size=36, color=POLAR).move_to([RIGHT_C[0], Y_FOOT, 0])
        slide = MathTex(r"\text{slide: }-2i", font_size=36, color=CART).move_to([RIGHT_C[0], Y_FOOT, 0])
        end = MathTex(r"x = 2 \;\mapsto\; v = 0", font_size=36, color=OUTPUT).move_to([RIGHT_C[0] + 1.0, 1.7, 0])
        self.wait(0.2 * t)
        self.st.put(run=0.03 * t, over=VGroup(turn))
        self.play(Rotate(mover, angle=PI / 2, about_point=R.pt(0), rate_func=smooth), run_time=0.15 * t)
        self.st.put(run=0.03 * t, over=VGroup(slide))
        self.play(mover.animate.shift(DOWN * 2.0 * R.scale), run_time=0.13 * t, rate_func=smooth)
        self.st.put(run=0.05 * t, over2=VGroup(end))

    # ------------------------------------------------------------ square: the line bends, polar explains
    def beat_square(self, t):
        zin = lambda s: complex(2, -LINE_Y + 2 * LINE_Y * s)
        zout = lambda s: zin(s) ** 2
        L = Plane(LEFT_C, focus=0.8, scale=1.0)
        R = Plane(RIGHT_C, focus=0.0, scale=0.25)
        ts = np.linspace(0, 1, 241)
        clock = ValueTracker(0.0)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock)
        a, b = plane_titles()
        focus = VGroup(Circle(radius=0.1, stroke_color=INK, stroke_width=3).move_to(R.pt(0)),
                       Text("focus 0", font_size=22, color=INK).move_to(R.pt(0) + np.array([-0.05, -0.38, 0])))
        lab_in = MathTex(r"x = 2", font_size=34, color=INPUT).move_to(L.pt(complex(2.7, 2.1)))
        lab_out = MathTex(r"u = 4 - v^2/16", font_size=34, color=OUTPUT).move_to(R.pt(0) + np.array([1.55, 2.1, 0]))
        data_l = VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT), end_tip(L, zin, INPUT))
        data_r = VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT), end_tip(R, zout, OUTPUT))
        foot = VGroup(MathTex(r"w = z^2", font_size=40, color=INK).move_to([LEFT_C[0], Y_FOOT, 0]), clock_bar(clock))
        self.st.cut(head=headline("z squared: a line bends", "x = 2 becomes a parabola"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b), data_l=data_l, data_r=data_r, lab=VGroup(lab_in, lab_out),
                    mid=VGroup(link(cz, cw)), cur=VGroup(cz, cw), focus=focus, foot=foot)
        self.play(clock.animate.set_value(1.0), run_time=0.38 * t, rate_func=linear)
        # the polar act: a ray and a circle, r -> r^2 and theta -> 2 theta
        theta = ValueTracker(math.radians(20))
        r_in, r_out = 2.5, 6.25
        ray_z = always_redraw(lambda: Line(L.pt(0), L.pt(r_in * cmath.exp(1j * theta.get_value())), color=POLAR, stroke_width=5))
        ray_w = always_redraw(lambda: Line(R.pt(0), R.pt(r_out * cmath.exp(2j * theta.get_value())), color=POLAR, stroke_width=5))
        arc_z = always_redraw(lambda: Arc(radius=0.9, start_angle=0, angle=theta.get_value(), color=POLAR, stroke_width=4).move_arc_center_to(L.pt(0)))
        arc_w = always_redraw(lambda: Arc(radius=0.9, start_angle=0, angle=2 * theta.get_value(), color=POLAR, stroke_width=4).move_arc_center_to(R.pt(0)))
        circ_z = Arc(radius=r_in * L.scale, start_angle=-0.2, angle=1.9, color=POLAR, stroke_width=3, stroke_opacity=0.7).move_arc_center_to(L.pt(0))
        circ_w = Circle(radius=r_out * R.scale, color=POLAR, stroke_width=3, stroke_opacity=0.7).move_to(R.pt(0))
        dz = always_redraw(lambda: Dot(L.pt(r_in * cmath.exp(1j * theta.get_value())), radius=0.1, color=POLAR))
        dw = always_redraw(lambda: Dot(R.pt(r_out * cmath.exp(2j * theta.get_value())), radius=0.1, color=POLAR))
        whole_theta = lambda: int(round(math.degrees(theta.get_value())))       # rounded once: the second readout is exactly twice the first
        th = always_redraw(lambda: Text(f"\u03b8 = Arg z = {whole_theta()}\u00b0", font_size=28, color=POLAR).move_to([LEFT_C[0], Y_FOOT, 0]))
        tw = always_redraw(lambda: Text(f"2\u03b8 = Arg w = {2 * whole_theta()}\u00b0", font_size=28, color=POLAR).move_to([RIGHT_C[0], Y_FOOT, 0]))
        rr = VGroup(MathTex(r"r = 2.5", font_size=30, color=POLAR).move_to(L.pt(complex(1.2, -2.0))),            # clear of the dimmed line x = 2
                    MathTex(r"r^2 = 6.25", font_size=30, color=POLAR).move_to(R.pt(complex(5.0, -7.4))))      # clear of the dimmed parabola
        self.st.freeze("cur")
        self.st.put(run=0.06 * t, cur=None, mid=None, lab=None, foot=VGroup(th, tw), polar=VGroup(ray_z, ray_w, arc_z, arc_w, circ_z, circ_w, dz, dw, rr))
        self.play(data_l.animate.set_opacity(0.2), data_r.animate.set_opacity(0.2), run_time=0.04 * t)
        self.play(theta.animate.set_value(math.radians(42)), run_time=0.3 * t, rate_func=smooth)
        self.play(data_l.animate.set_opacity(1.0), data_r.animate.set_opacity(1.0), run_time=0.06 * t)

    # ------------------------------------------------------------ recip: a circle opens into a line
    def beat_recip(self, t):
        zin = lambda s: (lambda th: 2 * math.cos(th) * cmath.exp(1j * th))(-PI / 2 + PI * s)
        zout = lambda s: 1 / zin(s)
        L = Plane(LEFT_C, focus=1.0, scale=1.3)
        R = Plane(RIGHT_C, focus=0.5, scale=1.3)
        ts = np.linspace(0.004, 0.996, 301)
        marks = (0.1, 0.25, 0.5, 0.75, 0.9)
        clock = ValueTracker(0.05)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock, clamp=BOX_H / 2 - 0.2)
        a, b = plane_titles()
        zero = VGroup(Circle(radius=0.11, stroke_color=INK, stroke_width=3).move_to(L.pt(0)),
                      Text("0", font_size=24, color=INK).move_to(L.pt(0) + np.array([-0.3, -0.05, 0])))
        up = VGroup(Arrow(R.pt(complex(0.5, 1.40)), R.pt(complex(0.5, 1.65)), buff=0, color=OUTPUT, stroke_width=5, max_tip_length_to_length_ratio=0.8),
                    Text("to infinity", font_size=22, color=OUTPUT).move_to(R.pt(complex(1.35, 1.55))))
        dn = VGroup(Arrow(R.pt(complex(0.5, -1.40)), R.pt(complex(0.5, -1.65)), buff=0, color=OUTPUT, stroke_width=5, max_tip_length_to_length_ratio=0.8),
                    Text("to infinity", font_size=22, color=OUTPUT).move_to(R.pt(complex(1.35, -1.55))))
        lab_in = MathTex(r"|z - 1| = 1", font_size=34, color=INPUT).move_to(L.pt(complex(2.45, 1.7)))
        lab_out = MathTex(r"\mathrm{Re}\,w = \tfrac12", font_size=34, color=OUTPUT).move_to(R.pt(complex(1.95, 0.45)))   # above the u-axis, so the axis does not strike through the label

        def readout():
            z = zin(clock.get_value())
            r, ang = abs(z), math.degrees(cmath.phase(z))
            return VGroup(Text(f"r = |z| = {r:.2f}   \u2192   1/r = {1 / r:.2f}", font_size=24, color=POLAR),
                          Text(f"\u03b8 = Arg z = {whole(ang)}\u00b0   \u2192   \u2212\u03b8 = {whole(-ang)}\u00b0", font_size=24, color=POLAR)
                          ).arrange(DOWN, aligned_edge=LEFT, buff=0.12).move_to([LEFT_C[0] - 0.2, Y_FOOT, 0])
        self.st.cut(head=headline("1/z: a circle opens into a line", "zero goes to infinity"),
                    left=VGroup(L.axes(), a), right=VGroup(R.axes(), b),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT, marks), zero),
                    data_r=VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT, marks), up, dn),
                    lab=VGroup(lab_in, lab_out), mid=VGroup(link(cz, cw)), cur=VGroup(cz, cw), foot=VGroup(always_redraw(readout), clock_bar(clock)))
        self.play(clock.animate.set_value(0.95), run_time=0.8 * t, rate_func=linear)

    # ------------------------------------------------------------ paper: parametrize, push forward, eliminate
    def beat_paper(self, t):
        zin = lambda s: complex(2, -PAPER_Y + 2 * PAPER_Y * s)      # |y| <= 1.4: the cursor ring stays under the plane titles, the end dot clears the tick label
        zout = lambda s: zin(s) ** 2
        PL, PR, box = (-3.75, 0.9), (3.75, 0.9), (6.2, 3.6)
        L = Plane(PL, focus=0.8, scale=1.0, box=box)
        R = Plane(PR, focus=0.0, scale=0.25, box=box)
        ts = np.linspace(0, 1, 201)
        clock = ValueTracker(0.0)
        cz, cw = cursor(L, zin, clock), cursor(R, zout, clock)
        titles = VGroup(MathTex(r"z = x + iy", font_size=32, color=INK).move_to([PL[0], 2.88, 0]),
                        MathTex(r"w = u + iv", font_size=32, color=INK).move_to([PR[0], 2.88, 0]))
        specs = [("1  Parametrize", [(r"z = 2 + iy", CART, 34), (r"z(t) = a + t(b - a)", MUTED, 26)]),
                 ("2  Push forward", [(r"u = 4 - y^2", CART, 34), (r"v = 4y", CART, 34)]),
                 ("3  Eliminate y", [(r"y = v/4", CART, 32), (r"u = 4 - v^2/16", CART, 32)])]
        cards = VGroup()
        for i, (title, lines) in enumerate(specs):
            box_ = Rectangle(width=4.35, height=2.3, stroke_color=MUTED, stroke_width=2, fill_color=SURFACE, fill_opacity=0.8)
            head = Text(title, font_size=26, color=INK).move_to(box_.get_top() + np.array([0, -0.33, 0]))
            ms = VGroup(*[MathTex(s, font_size=fs, color=c) for s, c, fs in lines]).arrange(DOWN, buff=0.2).next_to(head, DOWN, buff=0.28)
            cards.add(VGroup(box_, head, ms).move_to([-4.7 + 4.7 * i, -2.5, 0]))
        ring = lambda i: SurroundingRectangle(cards[i], color=POLAR, buff=0.04, stroke_width=4)
        self.st.cut(head=headline("On paper: three steps", "parametrize, push forward, eliminate"),
                    left=VGroup(L.axes(), titles[0]), right=VGroup(R.axes(), titles[1]),
                    data_l=VGroup(ramped(L, [zin(s) for s in ts], INPUT), clock_dots(L, zin, INPUT)),
                    data_r=VGroup(ramped(R, [zout(s) for s in ts], OUTPUT), clock_dots(R, zout, OUTPUT),
                                  Circle(radius=0.1, stroke_color=INK, stroke_width=3).move_to(R.pt(0))),
                    cur=VGroup(cz, cw), cards=cards, ring=VGroup(ring(0)))
        self.wait(0.27 * t)
        self.st.put(run=0.06 * t, ring=VGroup(ring(1)))
        self.play(clock.animate.set_value(1.0), run_time=0.15 * t, rate_func=linear)
        self.st.put(run=0.06 * t, ring=VGroup(ring(2)))
        self.wait(0.25 * t)
        self.st.put(run=0.06 * t, ring=VGroup(ring(0), ring(1), ring(2)))
