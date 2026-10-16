"""zoom-cr: the microscope, the direction circle, no mirror (station: derivative).

Beats, in the order of media/narration/videos/zoom-cr.json: intro, ring, move, quotient, mirror, cr, abs2.
Design: docs/designs/iter-2/i2-videos-ch2.md. Colours come only from lib.palette. Set BEATS=ids,comma,separated to render a subset
while iterating (a filtered run leaves a partial .vtt: finish with the full render; move and quotient reuse the panels of the beat before them,
so filter ring,move or ring,quotient, not move alone)."""
import cmath
import math
import os

import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, INPUT, OUTPUT, SEAM, T0, T1, WARN, OK, mix, ramp

ARROW_W = 0.5        # direction arrows: (1 - w) * base + w * ramp(phi mod pi) so INPUT green and OUTPUT pink stay readable
DOT_W = 0.6          # quotient dots: 0.7 read as lavender, 0.6 keeps OUTPUT pink and the dark-to-light shading
BOX_W, BOX_H = 6.2, 5.2
LEFT_C, RIGHT_C = (-3.75, -0.2), (3.75, -0.2)
Y_TITLE, Y_FOOT = 2.72, -3.45
Z0 = complex(0.5, 0.5)            # the point under the microscope
ZOOM = 20.0                       # screen units per unit in the microscope panels
RING_R = 1.0                      # screen radius of the ring of directions
RHO = RING_R / ZOOM               # 0.05
LIMIT_RHO = 1e-3                  # the difference quotients drawn as dots use this rho: the limit, so opposite directions coincide
N_DIR = 24
PHIS = [2 * math.pi * k / N_DIR for k in range(N_DIR)]


# ---------------------------------------------------------------- the maths (A = move part, B = mirror part)
def f_zz(z):                       # z^2 + z   (3.1.1): A = 2z + 1, B = 0
    return z * z + z


def f_conj(z):                     # conj z: A = 0, B = 1
    return np.conj(z) if isinstance(z, np.ndarray) else complex(z).conjugate()


def f_abs2(z):                     # |z|^2 (3.1.2): A = conj z0, B = z0
    return (np.abs(z) ** 2).astype(complex) if isinstance(z, np.ndarray) else complex(abs(z) ** 2)


def f_re(z):                       # Re z (P6): A = B = 1/2
    return np.real(z).astype(complex) if isinstance(z, np.ndarray) else complex(z.real)


def AB(f, z0, h=1e-6):
    """A = (f_x - i f_y)/2, B = (f_x + i f_y)/2 from the two partials of f at z0."""
    fx = (f(z0 + h) - f(z0 - h)) / (2 * h)
    fy = (f(z0 + 1j * h) - f(z0 - 1j * h)) / (2 * h)
    return (fx - 1j * fy) / 2, (fx + 1j * fy) / 2


def quotient(f, z0, rho, phi):
    """(f(z0 + rho e^{i phi}) - f(z0)) / (rho e^{i phi}); tends to A + B e^{-2 i phi} as rho -> 0."""
    h = rho * cmath.exp(1j * phi)
    return (f(z0 + h) - f(z0)) / h


def tex_half(x):
    """A multiple of 1/2 as TeX: 1 -> '1', 1/2 -> '\\tfrac12'."""
    n = round(2 * x)
    assert abs(2 * x - n) < 1e-6
    return str(n // 2) if n % 2 == 0 else (r"\tfrac12" if n == 1 else rf"\tfrac{{{n}}}{{2}}")


def check_numbers():
    for z0 in (Z0, 1.2 + 0.9j, -0.3 + 0.8j):
        A, B = AB(f_conj, z0); assert abs(A) < 1e-6 and abs(B - 1) < 1e-6
        A, B = AB(f_zz, z0); assert abs(A - (2 * z0 + 1)) < 1e-6 and abs(B) < 1e-6
        A, B = AB(f_abs2, z0); assert abs(A - z0.conjugate()) < 1e-6 and abs(B - z0) < 1e-6
        A, B = AB(f_re, z0); assert abs(A - 0.5) < 1e-6 and abs(B - 0.5) < 1e-6
        for phi in PHIS:
            for f in (f_conj, f_zz, f_abs2, f_re):
                A, B = AB(f, z0)
                assert abs(quotient(f, z0, 1e-6, phi) - (A + B * cmath.exp(-2j * phi))) < 1e-4
    x, y = Z0.real, Z0.imag                                            # Jacobian of z^2 + z at Z0 = [[2, -1], [1, 2]]
    assert (2 * x + 1, -2 * y, 2 * y, 2 * x + 1) == (2.0, -1.0, 1.0, 2.0)
    assert abs(f_zz(Z0) - complex(0.5, 1.0)) < 1e-12
    assert abs(abs(2 * Z0 + 1) - math.sqrt(5)) < 1e-12 and abs(math.degrees(cmath.phase(2 * Z0 + 1)) - 26.565051177) < 1e-6


# ---------------------------------------------------------------- planes and helpers
class Plane:
    def __init__(self, centre, focus=0j, scale=1.0, box=(BOX_W, BOX_H)):
        self.cx, self.cy = centre
        self.focus = complex(focus)
        self.scale = scale
        self.w, self.h = box

    def pt(self, z):
        z = complex(z)
        return np.array([self.cx + (z.real - self.focus.real) * self.scale, self.cy + (z.imag - self.focus.imag) * self.scale, 0.0])

    def pts(self, zs):
        zs = np.asarray(zs, dtype=complex)
        return np.stack([self.cx + (zs.real - self.focus.real) * self.scale, self.cy + (zs.imag - self.focus.imag) * self.scale, np.zeros(zs.shape)], axis=-1)

    def frame(self):
        return Rectangle(width=self.w, height=self.h, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.8,
                         fill_color=SURFACE, fill_opacity=0.55).move_to([self.cx, self.cy, 0])

    def axes(self):
        g = VGroup(self.frame())
        hx, hy = self.w / 2 / self.scale, self.h / 2 / self.scale
        x0, x1 = self.focus.real - hx, self.focus.real + hx
        y0, y1 = self.focus.imag - hy, self.focus.imag + hy
        s = next((s for s in (1, 2, 5, 10, 20) if s * self.scale >= 0.85), 50)
        for k in range(math.ceil(x0 / s), math.floor(x1 / s) + 1):
            x = k * s
            p = self.pt(complex(x, y0))
            if x != 0 and abs(p[0] - self.cx) < self.w / 2 - 0.35:
                g.add(Line(self.pt(complex(x, y0)), self.pt(complex(x, y1)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(str(x).replace("-", "\u2212"), font_size=18, color=MUTED).move_to(p + np.array([0, 0.17, 0])))
        for k in range(math.ceil(y0 / s), math.floor(y1 / s) + 1):
            y = k * s
            p = self.pt(complex(x0, y))
            if y != 0 and abs(p[1] - self.cy) < self.h / 2 - 0.35:
                g.add(Line(self.pt(complex(x0, y)), self.pt(complex(x1, y)), stroke_color=MUTED, stroke_width=1, stroke_opacity=0.18))
                g.add(Text(f"{y}i".replace("-", "\u2212"), font_size=18, color=MUTED).move_to(p + np.array([0.27, 0, 0])))
        if x0 < 0 < x1:
            g.add(Line(self.pt(complex(0, y0)), self.pt(complex(0, y1)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        if y0 < 0 < y1:
            g.add(Line(self.pt(complex(x0, 0)), self.pt(complex(x1, 0)), stroke_color=MUTED, stroke_width=2, stroke_opacity=0.75))
        return g


def runs(P, plane, pad=0.03):
    """Split an (n, 3) array of screen points into the runs that stay inside the plane's box."""
    ok = (np.abs(P[:, 0] - plane.cx) <= plane.w / 2 - pad) & (np.abs(P[:, 1] - plane.cy) <= plane.h / 2 - pad) & np.isfinite(P).all(axis=1)
    out, cur = [], []
    for p, o in zip(P, ok):
        if o:
            cur.append(p)
        elif cur:
            out.append(np.array(cur)); cur = []
    if cur:
        out.append(np.array(cur))
    return [r for r in out if len(r) >= 2]


def polyline(P, color, width=3, opacity=1.0):
    m = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity, fill_opacity=0)
    m.set_points_as_corners(P)
    return m


def grid_image(plane, f, z0, zoom, n=3, opacity=0.8, samples=161, faint=False):
    """Image under f of the lines Re z = x0 + j/zoom and Im z = y0 + j/zoom (j = -n..n), clipped to the plane's box."""
    d = 1.0 / zoom
    s = np.linspace(-3.6 * d, 3.6 * d, samples)
    g = VGroup()
    for j in range(-n, n + 1):
        wid, op = (4, opacity) if (j == 0 and not faint) else (2.2 if not faint else 1.2, opacity * (0.7 if not faint else 0.3))
        for z in (complex(z0.real + j * d, z0.imag) + 1j * s, complex(z0.real, z0.imag + j * d) + s):
            for r in runs(plane.pts(f(z)), plane):
                g.add(polyline(r, CART, wid, op))
    return g


def ramp_dir(base, phi, w=ARROW_W):
    """A direction is a line through z0: phi and phi + pi get the same shade (the quotient cannot tell them apart)."""
    return ramp(base, (phi % math.pi) / math.pi, w)


def live_number(tex, fn, pos, decimals=2, font_size=36, color=INK):
    """A MathTex label (compiled once) followed by a DecimalNumber that tracks fn(); no LaTeX is run per frame."""
    label = MathTex(tex, font_size=font_size, color=color)
    num = DecimalNumber(fn(), num_decimal_places=decimals, font_size=font_size, color=color)
    num.add_updater(lambda m: m.set_value(fn()))
    return VGroup(label, num).arrange(RIGHT, buff=0.15).move_to(pos)


def headline(main, sub=None):
    g = VGroup(Text(main, font_size=34, color=INK).move_to([-6.85, 3.55, 0], aligned_edge=LEFT))
    if sub:
        g.add(Text(sub, font_size=24, color=MUTED).move_to([6.85, 3.5, 0], aligned_edge=RIGHT))
    return g


def two_columns(cart_tex, polar_tex, y=-3.42):
    c = VGroup(Text("Cartesian", font_size=26, color=CART), MathTex(cart_tex, font_size=34, color=CART)).arrange(DOWN, buff=0.12).move_to([LEFT_C[0], y, 0])
    p = VGroup(Text("polar", font_size=26, color=POLAR), MathTex(polar_tex, font_size=34, color=POLAR)).arrange(DOWN, buff=0.12).move_to([RIGHT_C[0], y, 0])
    return c, p


SLOT_Z = {"left": 0, "right": 0, "lx": 2, "rx": 2, "over": 5, "head": 6, "foot": 6, "foot2": 6}


class Stage:
    """Named slots; put(slot=group, ...) fades each slot's old group out and its new group in together, in one play."""

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
    narration_id = "zoom-cr"

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
        if self.on("ring"):
            with self.beat("ring") as t:
                self.beat_ring(t)
        if self.on("move"):
            with self.beat("move") as t:
                self.beat_move(t)
        if self.on("quotient"):
            with self.beat("quotient") as t:
                self.beat_quotient(t)
        if self.on("mirror"):
            with self.beat("mirror") as t:
                self.beat_mirror(t)
        if self.on("cr"):
            with self.beat("cr") as t:
                self.beat_cr(t)
        if self.on("abs2"):
            with self.beat("abs2") as t:
                self.beat_abs2(t)

    # ------------------------------------------------------------ the two microscope panels (shared by ring, move, quotient)
    def micro_left(self):
        L = Plane(LEFT_C, focus=Z0, scale=ZOOM)
        d = 1.0 / ZOOM
        hv, hh = (BOX_H / 2 - 0.02) / ZOOM, (BOX_W / 2 - 0.02) / ZOOM
        grid = VGroup()
        for j in range(-3, 4):
            grid.add(Line(L.pt(Z0 + complex(j * d, -hv)), L.pt(Z0 + complex(j * d, hv)), stroke_color=CART, stroke_width=1.2, stroke_opacity=0.25))
            if abs(j) <= 2:
                grid.add(Line(L.pt(Z0 + complex(-hh, j * d)), L.pt(Z0 + complex(hh, j * d)), stroke_color=CART, stroke_width=1.2, stroke_opacity=0.25))
        ring = Circle(radius=RING_R, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.5).move_to(L.pt(Z0))
        arrows = VGroup(*[Arrow(L.pt(Z0), L.pt(Z0 + RHO * cmath.exp(1j * p)), buff=0, color=ramp_dir(INPUT, p), stroke_width=3.5,
                                tip_length=0.16, max_tip_length_to_length_ratio=0.35) for p in PHIS])
        lab_pos = L.pt(Z0) + np.array([-1.7, -1.25, 0])
        lead = Line(L.pt(Z0) + np.array([-0.08, -0.08, 0]), lab_pos + np.array([0.3, 0.17, 0]), stroke_color=MUTED, stroke_width=1.2, stroke_opacity=0.7)
        lab = MathTex(r"z_0", font_size=34, color=INK).move_to(lab_pos)
        title = MathTex(r"z = z_0 + \Delta z", font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0])
        zoom = Text(f"zoom \u00d7{ZOOM:.0f}", font_size=22, color=MUTED).move_to([LEFT_C[0] + 2.2, -2.4, 0])
        return L, VGroup(L.frame(), grid, ring, arrows, lead, Dot(L.pt(Z0), radius=0.09, color=INK), lab, title, zoom)

    def micro_right(self, f=f_zz):
        W0 = f(Z0)
        R = Plane(RIGHT_C, focus=W0, scale=ZOOM)
        d = 1.0 / ZOOM
        grid = grid_image(R, f, Z0, ZOOM, samples=81, faint=True)
        tips = [f(Z0 + RHO * cmath.exp(1j * p)) for p in PHIS]
        arrows = VGroup(*[Arrow(R.pt(W0), R.pt(w), buff=0, color=ramp_dir(OUTPUT, p), stroke_width=3.5, tip_length=0.16, max_tip_length_to_length_ratio=0.35)
                          for p, w in zip(PHIS, tips)])
        closed = polyline(R.pts(np.array([f(Z0 + RHO * cmath.exp(1j * q)) for q in np.linspace(0, 2 * math.pi, 121)])), OUTPUT, 1.5, 0.5)
        lab_pos = R.pt(W0) + np.array([-2.35, -2.0, 0])
        lead = Line(R.pt(W0) + np.array([-0.08, -0.08, 0]), lab_pos + np.array([0.5, 0.2, 0]), stroke_color=MUTED, stroke_width=1.2, stroke_opacity=0.7)
        lab = MathTex(r"f(z_0)", font_size=34, color=INK).move_to(lab_pos)
        title = MathTex(r"w = f(z_0 + \Delta z)", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])
        return R, VGroup(R.frame(), grid, closed, arrows, lead, Dot(R.pt(W0), radius=0.09, color=INK), lab, title)

    # ------------------------------------------------------------ intro: the zoom
    def beat_intro(self, t):
        k = ValueTracker(0.0)                      # log10 of the zoom
        W0 = f_zz(Z0)
        L = lambda: Plane(LEFT_C, focus=Z0, scale=10 ** k.get_value())
        R = lambda: Plane(RIGHT_C, focus=W0, scale=10 ** k.get_value())
        left = always_redraw(lambda: grid_image(L(), lambda z: z, Z0, 10 ** k.get_value()))
        right = always_redraw(lambda: grid_image(R(), f_zz, Z0, 10 ** k.get_value()))
        l_dot = VGroup(Dot(L().pt(Z0), radius=0.1, color=INK), MathTex(r"z_0", font_size=34, color=INK).move_to(L().pt(Z0) + np.array([-0.32, -0.3, 0])))
        r_dot = VGroup(Dot(R().pt(W0), radius=0.1, color=INK), MathTex(r"f(z_0)", font_size=34, color=INK).move_to(R().pt(W0) + np.array([-0.85, 0.15, 0])))   # in the wedge between the two thick grid lines
        z_read = always_redraw(lambda: Text(f"zoom \u00d7{10 ** k.get_value():.0f}", font_size=30, color=INK).move_to([0, Y_FOOT, 0]))
        foot = MathTex(r"f(z) = z^2 + z", font_size=38, color=INK).move_to([LEFT_C[0], Y_FOOT, 0])
        self.st.place(head=headline("Zoom in", "up close, the bending goes away"),
                    left=VGroup(L().frame(), left, l_dot, MathTex(r"z", font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0])),
                    right=VGroup(R().frame(), right, r_dot, MathTex(r"w = f(z)", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])),
                    foot=VGroup(foot, z_read))
        self.play(k.animate.set_value(math.log10(ZOOM)), run_time=0.6 * t, rate_func=smooth)
        self.st.put(run=0.1 * t, rx=VGroup(Text("turned and stretched", font_size=28, color=POLAR).move_to([RIGHT_C[0], Y_FOOT, 0])))

    # ------------------------------------------------------------ ring: where does f send each step?
    def beat_ring(self, t):
        L, lg = self.micro_left()
        R, rg = self.micro_right()
        phi = ValueTracker(0.0)
        hl = always_redraw(lambda: Arrow(L.pt(Z0), L.pt(Z0 + RHO * cmath.exp(1j * phi.get_value())), buff=0, color=INK, stroke_width=8, tip_length=0.22))
        hr = always_redraw(lambda: Arrow(R.pt(f_zz(Z0)), R.pt(f_zz(Z0 + RHO * cmath.exp(1j * phi.get_value()))), buff=0, color=INK, stroke_width=8, tip_length=0.22))
        arc = always_redraw(lambda: Arc(radius=0.55, start_angle=0, angle=max(phi.get_value(), 1e-3), color=POLAR, stroke_width=4).move_arc_center_to(L.pt(Z0)))
        foot = VGroup(MathTex(r"\Delta z = ", r"\rho\, e^{i\varphi}", r"\qquad \varphi \in \arg \Delta z", font_size=38, color=INK))
        foot[0][1].set_color(POLAR); foot[0][2].set_color(MUTED)
        foot.move_to([LEFT_C[0] + 1.0, Y_FOOT, 0])
        self.st.put(head=headline("A ring of directions", "where does f send each step?"),
                    left=lg, right=rg, lx=VGroup(hl, arc), rx=VGroup(hr), foot=foot)
        self.play(phi.animate.set_value(2 * math.pi), run_time=0.6 * t, rate_func=linear)

    # ------------------------------------------------------------ move: one turn, one stretch
    def beat_move(self, t):
        fprime = 2 * Z0 + 1
        W0 = f_zz(Z0)
        L, R = Plane(LEFT_C, focus=Z0, scale=ZOOM), Plane(RIGHT_C, focus=W0, scale=ZOOM)
        e_in = VGroup(Arrow(L.pt(Z0), L.pt(Z0 + RHO), buff=0, color=INK, stroke_width=8, tip_length=0.22),
                      MathTex(r"\rho", font_size=32, color=INK).move_to(L.pt(Z0) + np.array([0.55, 0.3, 0])))
        e_out = Arrow(R.pt(W0), R.pt(f_zz(Z0 + RHO)), buff=0, color=INK, stroke_width=8, tip_length=0.22)
        base = DashedLine(R.pt(W0), R.pt(W0) + np.array([2.4, 0, 0]), color=POLAR, stroke_width=2.5)
        turn = Arc(radius=1.0, start_angle=0, angle=cmath.phase(fprime), color=POLAR, stroke_width=5).move_arc_center_to(R.pt(W0))
        turn_lab = MathTex(r"\mathrm{Arg}\,f' = 26.6^\circ", font_size=28, color=POLAR).move_to(R.pt(W0) + np.array([2.1, 2.25, 0]))   # top-right corner, clear of the ring
        stretch_lab = MathTex(r"|f'|\,\rho = \sqrt5\,\rho", font_size=32, color=POLAR).move_to(R.pt(W0) + np.array([-1.95, 2.25, 0]))
        cart, pol = two_columns(r"f'(z_0) = u_x + i\,v_x = 2 + i", r"f'(z_0) = \sqrt5\, e^{i\,26.6^\circ}")
        self.st.put(head=headline("One move up close", "multiply by f prime of z zero"),
                    lx=VGroup(e_in), rx=VGroup(e_out, base, turn, turn_lab, stretch_lab), foot=None, foot2=None)
        self.wait(0.1 * t)
        self.play(Indicate(turn, color=POLAR, scale_factor=1.05), run_time=0.1 * t)
        self.wait(0.43 * t)
        self.st.put(run=0.05 * t, foot=VGroup(cart))
        self.wait(0.15 * t)
        self.st.put(run=0.05 * t, foot2=VGroup(pol))

    # ------------------------------------------------------------ quotient: one dot per direction, a circle
    def beat_quotient(self, t):
        A, B = AB(f_abs2, Z0)                     # A = conj z0 = 0.5 - 0.5i, B = z0
        Q = Plane(RIGHT_C, focus=complex(0.5, -0.5), scale=2.6)
        L = Plane(LEFT_C, focus=Z0, scale=ZOOM)
        phi = ValueTracker(0.0)
        dots = VGroup(*[Dot(Q.pt(quotient(f_abs2, Z0, LIMIT_RHO, p)), radius=0.085, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=2) for p in PHIS])
        circle = DashedVMobject(Circle(radius=abs(B) * Q.scale, stroke_color=POLAR, stroke_width=3).move_to(Q.pt(A)), num_dashes=48)
        centre = VGroup(Dot(Q.pt(A), radius=0.07, color=POLAR), MathTex(r"A", font_size=36, color=POLAR).move_to(Q.pt(A) + np.array([0.0, -0.34, 0])))
        rad = VGroup(Line(Q.pt(A), Q.pt(A + abs(B)), color=WARN, stroke_width=4), MathTex(r"|B|", font_size=32, color=WARN).move_to(Q.pt(A + abs(B) * 0.5) + np.array([0, 0.3, 0])))
        hl = always_redraw(lambda: VGroup(Arrow(L.pt(Z0), L.pt(Z0 + RHO * cmath.exp(1j * phi.get_value())), buff=0, color=INK, stroke_width=8, tip_length=0.22),
                                          Arrow(L.pt(Z0), L.pt(Z0 - RHO * cmath.exp(1j * phi.get_value())), buff=0, color=INK, stroke_width=8, tip_length=0.22)))
        hd = always_redraw(lambda: Dot(Q.pt(quotient(f_abs2, Z0, LIMIT_RHO, phi.get_value())), radius=0.15, color=INK))
        title = MathTex(r"\Delta w / \Delta z", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])
        foot = MathTex(r"\frac{\Delta w}{\Delta z} \to ", "A", "+", "B", r"e^{-2i\varphi}", font_size=40, color=INK)
        foot[1].set_color(POLAR); foot[3].set_color(WARN); foot[4].set_color(POLAR)
        foot.move_to([RIGHT_C[0], Y_FOOT, 0])
        note = Text("opposite arrows, same dot", font_size=24, color=MUTED).move_to([LEFT_C[0], Y_FOOT, 0])
        self.st.put(head=headline("One dot per direction", "the dots trace a circle"),
                    right=VGroup(Q.axes(), title), lx=VGroup(hl), rx=VGroup(circle, dots, centre, rad, hd), foot=VGroup(foot, note), foot2=None)
        self.play(phi.animate.set_value(2 * math.pi), run_time=0.6 * t, rate_func=linear)

    # ------------------------------------------------------------ mirror: conj never shrinks, z^2 + z does
    def beat_mirror(self, t):
        rho = ValueTracker(0.1)
        A0 = 2 * Z0 + 1
        QL, QR = Plane(LEFT_C, focus=0.25, scale=2.0), Plane(RIGHT_C, focus=A0, scale=2.0)
        title_r = MathTex(r"z^2 + z:\ A = 2z + 1,\ B = 0", font_size=34, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])

        A_c, B_c = AB(f_conj, Z0)                 # A = 0, B = 1: the circle has centre A and radius |B|, taken from AB
        A_r, B_r = AB(f_re, Z0)                   # A = B = 1/2

        def conj_panel():
            dots = VGroup(*[Dot(QL.pt(quotient(f_conj, Z0, 0.1, p)), radius=0.085, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=2) for p in PHIS])
            circle = DashedVMobject(Circle(radius=abs(B_c) * QL.scale, stroke_color=POLAR, stroke_width=3).move_to(QL.pt(A_c)), num_dashes=48)
            rad = VGroup(Line(QL.pt(A_c), QL.pt(A_c + abs(B_c)), color=WARN, stroke_width=4),
                         MathTex(r"|B| = " + tex_half(abs(B_c)), font_size=32, color=WARN).move_to(QL.pt(A_c + abs(B_c) / 2) + np.array([0, 0.3, 0])))
            return VGroup(circle, dots, rad, Text("never shrinks", font_size=26, color=WARN).move_to([LEFT_C[0], Y_FOOT, 0]),
                          MathTex(r"\bar z:\ A = 0,\ B = 1", font_size=34, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]))

        def re_panel():
            dots = VGroup(*[Dot(QL.pt(quotient(f_re, Z0, 0.1, p)), radius=0.085, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=2) for p in PHIS])
            circle = DashedVMobject(Circle(radius=abs(B_r) * QL.scale, stroke_color=POLAR, stroke_width=3).move_to(QL.pt(A_r)), num_dashes=40)
            rad = VGroup(Line(QL.pt(A_r), QL.pt(A_r + abs(B_r)), color=WARN, stroke_width=4),
                         MathTex(r"|B| = " + tex_half(abs(B_r)), font_size=32, color=WARN).move_to(QL.pt(A_r + 1j * (abs(B_r) + 0.24))))
            return VGroup(circle, dots, rad, Text("Re z: never shrinks either", font_size=26, color=WARN).move_to([LEFT_C[0], Y_FOOT, 0]),
                          MathTex(r"\mathrm{Re}\,z:\ A = \tfrac12,\ B = \tfrac12", font_size=34, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]))

        dr = always_redraw(lambda: VGroup(*[Dot(QR.pt(quotient(f_zz, Z0, rho.get_value(), p)), radius=0.07, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=1.5) for p in PHIS]))
        cr_ = always_redraw(lambda: Circle(radius=max(rho.get_value() * QR.scale, 0.02), stroke_color=POLAR, stroke_width=2.5).move_to(QR.pt(A0)))
        point = VGroup(Dot(QR.pt(A0), radius=0.06, color=OK), MathTex(r"f' = 2z + 1", font_size=34, color=OK).move_to(QR.pt(A0) + np.array([0.0, 0.62, 0])))
        read = always_redraw(lambda: Text(f"\u03c1 = {rho.get_value():.2f}", font_size=30, color=INK).move_to([RIGHT_C[0], Y_FOOT, 0]))
        self.st.put(head=headline("B is the mirror part", "no mirror, no circle"),
                    left=VGroup(QL.axes()), right=VGroup(QR.axes(), title_r), lx=conj_panel(), rx=VGroup(cr_, dr, point),
                    foot=VGroup(read), foot2=None)
        self.play(rho.animate.set_value(0.06), run_time=0.4 * t, rate_func=linear)
        self.st.put(run=0.1 * t, lx=re_panel())
        self.play(rho.animate.set_value(0.02), run_time=0.4 * t, rate_func=linear)

    # ------------------------------------------------------------ cr: no mirror, the matrix is a move
    def beat_cr(self, t):
        eqs = VGroup(MathTex(r"u_x = v_y", font_size=60, color=CART), MathTex(r"u_y = -v_x", font_size=60, color=CART)).arrange(DOWN, buff=0.4)
        no_mirror = Text("no mirror part", font_size=30, color=OK)
        mat = MathTex(r"\begin{pmatrix} u_x & u_y \\ v_x & v_y \end{pmatrix} = \begin{pmatrix} a & -b \\ b & a \end{pmatrix}", font_size=44, color=CART)
        left = VGroup(eqs, no_mirror, mat).arrange(DOWN, buff=0.45).move_to([LEFT_C[0], -0.15, 0])
        P = Plane(RIGHT_C, focus=complex(0.4, 1.4), scale=1.15)
        s = ValueTracker(0.0)
        sq = [0j, 1 + 0j, 1 + 1j, 0 + 1j]
        J = lambda z: complex(2 * z.real - 1 * z.imag, 1 * z.real + 2 * z.imag)        # [[2, -1], [1, 2]] = [[a, -b], [b, a]] with a = 2, b = 1
        start = VGroup(*[Line(P.pt(sq[i]), P.pt(sq[(i + 1) % 4]), color=INPUT, stroke_width=4) for i in range(4)])
        img = always_redraw(lambda: Polygon(*[P.pt((1 - s.get_value()) * z + s.get_value() * J(z)) for z in sq], color=OUTPUT, stroke_width=5, fill_color=OUTPUT, fill_opacity=0.18))
        arc = always_redraw(lambda: Arc(radius=0.8, start_angle=0, angle=max(s.get_value() * cmath.phase(2 + 1j), 1e-3), color=POLAR, stroke_width=4).move_arc_center_to(P.pt(0)))
        lab = MathTex(r"a = 2,\ b = 1", font_size=34, color=CART).move_to(P.pt(complex(2.0, -0.35)))
        title = MathTex(r"\text{a tiny square}", font_size=34, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])
        cart, pol = two_columns(r"f'(z_0) = u_x + i\,v_x = 2 + i", r"f'(z_0) = \sqrt5\, e^{i\,26.6^\circ}")
        self.st.put(head=headline("Cauchy-Riemann", "no mirror: one turn, one stretch"),
                    left=left, lx=None, right=VGroup(P.axes(), title), rx=VGroup(start, img, arc, lab), foot=None, foot2=None)
        self.wait(0.4 * t)
        self.play(s.animate.set_value(1.0), run_time=0.35 * t, rate_func=smooth)
        self.st.put(run=0.05 * t, foot=VGroup(cart))
        self.wait(0.05 * t)
        self.st.put(run=0.05 * t, foot2=VGroup(pol))

    # ------------------------------------------------------------ abs2: |z|^2 is differentiable at one point only
    def beat_abs2(self, t):
        z_start = complex(1.2, 0.9)
        u = ValueTracker(0.0)                                  # 0 at z_start, 1 at 0
        z0 = lambda: z_start * (1 - u.get_value())
        L = Plane(LEFT_C, focus=z_start / 2, scale=1.7)
        Q = Plane(RIGHT_C, focus=z_start.conjugate() / 2, scale=1.25)
        path = DashedLine(L.pt(z_start), L.pt(0), color=MUTED, stroke_width=2)
        zlab = MathTex(r"z_0", font_size=34, color=INK)
        zdot = VGroup(Dot(L.pt(z_start), radius=0.11, color=INK), zlab)
        zdot[0].add_updater(lambda m: m.move_to(L.pt(z0())))
        zlab.add_updater(lambda m: m.move_to(L.pt(z0()) + np.array([0.45, -0.32, 0])))      # off the dashed path, which runs up and to the right
        zero = VGroup(Circle(radius=0.13, stroke_color=INK, stroke_width=3).move_to(L.pt(0)), Text("0", font_size=24, color=INK).move_to(L.pt(0) + np.array([-0.3, -0.05, 0])))
        circ = always_redraw(lambda: DashedVMobject(Circle(radius=max(abs(z0()) * Q.scale, 0.03), stroke_color=POLAR, stroke_width=3).move_to(Q.pt(z0().conjugate())), num_dashes=48))
        dots = always_redraw(lambda: VGroup(*[Dot(Q.pt(quotient(f_abs2, z0(), LIMIT_RHO, p)), radius=0.075, color=ramp_dir(OUTPUT, p, DOT_W), stroke_color=BG, stroke_width=1.5) for p in PHIS]))
        alab = MathTex(r"A = \bar z_0", font_size=32, color=POLAR)
        centre = VGroup(Dot(Q.pt(z_start.conjugate()), radius=0.07, color=POLAR), alab)
        centre[0].add_updater(lambda m: m.move_to(Q.pt(z0().conjugate())))
        alab.add_updater(lambda m: m.move_to(Q.pt(z0().conjugate()) + np.array([0.0, max(0.42, abs(z0()) * Q.scale + 0.32), 0])))     # above the circle: clear of the dots
        read = live_number(r"|B| = |z_0| =", lambda: abs(z0()), [RIGHT_C[0], Y_FOOT, 0], color=WARN)
        self.st.put(head=headline("Absolute value squared", "the circle shrinks to 0"),
                    left=VGroup(L.axes(), MathTex(r"z", font_size=36, color=INK).move_to([LEFT_C[0], Y_TITLE, 0]), path, zero),
                    right=VGroup(Q.axes(), MathTex(r"\Delta w / \Delta z", font_size=36, color=INK).move_to([RIGHT_C[0], Y_TITLE, 0])),
                    lx=VGroup(zdot), rx=VGroup(circ, dots, centre),
                    foot=VGroup(read, MathTex(r"f(z) = |z|^2", font_size=38, color=INK).move_to([LEFT_C[0], Y_FOOT, 0])), foot2=None)
        self.play(u.animate.set_value(1.0), run_time=0.65 * t, rate_func=linear)
        done = VGroup(Dot(Q.pt(0), radius=0.08, color=OK), MathTex(r"f'(0) = 0", font_size=36, color=OK).move_to(Q.pt(0) + np.array([1.05, 0.5, 0])))   # right of the v-axis
        self.st.put(run=0.1 * t, rx=done)
