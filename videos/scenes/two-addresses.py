"""Video 1, two-addresses: one dot, reached two ways (a slide and a move). Station: addresses.

Narration: media/narration/videos/two-addresses.json. Eight beats, one per segment, in the JSON's order.
Every beat opens on its own picture within half a second (so a still taken at the cue start shows it), then
re-enacts the construction on top of that picture. Colours come only from lib.palette: CART for everything
Cartesian, POLAR for everything polar, INK for the point z.
"""
import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, OK

S3 = 3 ** 0.5
S2 = 2 ** 0.5
TAU = 2 * np.pi
Z = (-1.0, S3)                     # the dot: -1 + i sqrt(3) = 2 e^{i 2 pi / 3}
U = 1.0                            # screen units per plane unit (intro to mul)
UE = 1.55                          # the same in the euler beat (zoomed in on the unit circle)
O = np.array([-3.3, -0.4, 0.0])    # screen position of the origin
PANEL_W, PANEL_H = 6.9, 6.0
CARD_X, CARD_W, CARD_H = 3.75, 6.3, 6.0


def P(x, y=0.0, u=U):
    """Plane point (x, y) as a screen point."""
    return O + u * np.array([x, y, 0.0])


def polar_pt(r, deg, u=U):
    a = np.radians(deg)
    return P(r * np.cos(a), r * np.sin(a), u)


def tex(s, color=INK, size=44, **kw):
    return MathTex(s, color=color, font_size=size, **kw)


def words(s, color=INK, size=32, weight=NORMAL):
    return Text(s, color=color, font_size=size, weight=weight)


class Shots:
    """Schedules the shots of one beat as fractions of the beat's length t (in seconds)."""

    def __init__(self, scene, t):
        self.s, self.t, self.t0 = scene, t, scene.renderer.time

    def elapsed(self):
        return self.s.renderer.time - self.t0

    def at(self, frac):
        """Idle until the beat is `frac` of the way through (never more than half a beat at once)."""
        gap = frac * self.t - self.elapsed()
        if gap > 0.1:
            self.s.wait(min(gap, 0.5 * self.t))

    def go(self, frac, length, *anims, **kw):
        """Start a shot at `frac` of the beat and let it last `length` of the beat."""
        assert 0 < length and frac + length <= 0.97, "a shot must end before the last 3% of its beat"
        self.at(frac)
        self.s.play(*anims, run_time=length * self.t, **kw)

    def pop(self, *anims):
        """The opening picture of the beat: on screen within 0.3 s."""
        self.s.play(*anims, run_time=min(0.3, 0.02 * self.t))


class Main(NarratedScene):
    narration_id = "two-addresses"

    # ------------------------------------------------------------------ the plane and the card
    def stage(self, u=U):
        grid = VGroup(
            *[Line(P(x, -3, u), P(x, 3, u)) for x in range(-5, 6) if x != 0],
            *[Line(P(-5, y, u), P(5, y, u)) for y in range(-4, 5) if y != 0],
        ).set_stroke(color=MUTED, width=1.2, opacity=0.2)
        axes = VGroup(Line(P(-5, 0, u), P(5, 0, u)), Line(P(0, -4, u), P(0, 4, u))).set_stroke(color=MUTED, width=2.5, opacity=0.9)
        return grid, axes

    def setup_stage(self):
        c = O + np.array([0.0, 0.2, 0.0])
        self.panel = Rectangle(width=PANEL_W, height=PANEL_H, fill_color=SURFACE, fill_opacity=0.6, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to(c)
        hole = Rectangle(width=PANEL_W, height=PANEL_H).move_to(c)
        # everything that slides or grows past the panel is hidden by this frame (BG with a hole)
        self.mask = Cutout(Rectangle(width=16, height=9), hole, fill_color=BG, fill_opacity=1, stroke_width=0).set_z_index(10)
        self.grid, self.axes = self.stage()
        self.axis_names = VGroup(words("Re", MUTED, 30).move_to(P(2.9, -0.35)), words("Im", MUTED, 30).move_to(P(0.4, 2.7)))
        self.card = RoundedRectangle(corner_radius=0.2, width=CARD_W, height=CARD_H, fill_color=SURFACE, fill_opacity=1, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to([CARD_X, c[1], 0]).set_z_index(20)
        self.kicker = words("One point, two addresses", MUTED, 30).move_to([-3.3, 3.45, 0]).set_z_index(21)
        self.dot = Dot(P(*Z), radius=0.13, color=INK).set_z_index(8)
        self.zlab = tex("z", INK, 48).next_to(self.dot, UP, buff=0.12).shift(LEFT * 0.15).set_z_index(8)

    def card_title(self, text, color):
        m = words(text, color, 36, BOLD)
        if m.width > CARD_W - 0.8:
            m.scale_to_fit_width(CARD_W - 0.8)
        return m.move_to([CARD_X - CARD_W / 2 + 0.4, 2.35, 0], aligned_edge=LEFT).set_z_index(21)

    def card_line(self, mob, row):
        """Left-aligned line `row` of the card (row 0 is just under the title); wider lines are shrunk to fit."""
        if mob.width > CARD_W - 0.8:
            mob.scale_to_fit_width(CARD_W - 0.8)
        mob.set_z_index(21)
        return mob.move_to([CARD_X - CARD_W / 2 + 0.4, 1.45 - 0.98 * row, 0], aligned_edge=LEFT)

    # ------------------------------------------------------------------ marks
    def cart_marks(self):
        drops = VGroup(DashedLine(P(*Z), P(Z[0], 0), color=CART, stroke_width=4, dash_length=0.12),
                       DashedLine(P(*Z), P(0, Z[1]), color=CART, stroke_width=4, dash_length=0.12))
        labels = VGroup(tex(r"x=-1", CART, 44).next_to(P(Z[0], 0), DOWN, buff=0.12),
                        tex(r"y=\sqrt{3}", CART, 44).next_to(P(0, Z[1]), RIGHT, buff=0.15))
        return drops, labels

    def polar_marks(self):
        ray = Line(O, P(*Z), color=POLAR, stroke_width=6)
        arc = Arc(radius=0.9, start_angle=0, angle=TAU / 3, arc_center=O, color=POLAR, stroke_width=6)
        th = tex(r"\theta=\tfrac{2\pi}{3}=120^\circ", POLAR, 42).move_to(P(1.55, 1.15)).set_z_index(8)
        r = tex(r"r=2", POLAR, 44).move_to(P(-1.62, 0.55)).set_z_index(8)
        return VGroup(ray, arc), VGroup(th, r)

    def polar_grid(self, rings=(1, 2), reach=2.6, skip=()):
        rs = VGroup(*[Circle(radius=r * U, arc_center=O, color=POLAR, stroke_width=1.6, stroke_opacity=0.35) for r in rings])
        ys = VGroup(*[Line(O, polar_pt(reach, a), color=POLAR, stroke_width=1.2, stroke_opacity=0.22) for a in range(0, 360, 30) if a not in skip])
        return VGroup(rs, ys)

    # ------------------------------------------------------------------ the film
    def construct(self):
        self.camera.background_color = BG
        self.setup_stage()
        with self.beat("intro") as t:
            self.intro(t)
        with self.beat("cart") as t:
            self.cart(t)
        with self.beat("polar") as t:
            self.polar(t)
        with self.beat("same") as t:
            self.same(t)
        with self.beat("add") as t:
            self.add_beat(t)
        with self.beat("mul") as t:
            self.mul(t)
        with self.beat("rule") as t:
            self.rule(t)
        with self.beat("euler") as t:
            self.euler(t)

    # ------------------------------------------------------------------ beats
    def intro(self, t):
        b = Shots(self, t)
        title = self.card_title("One dot", INK)
        zeq = self.card_line(tex(r"z=-1+i\sqrt{3}", INK, 58), 0)
        q1 = self.card_line(words("Where is it?", MUTED, 34), 1.5)
        chip_c = RoundedRectangle(corner_radius=0.15, width=5.4, height=0.9, stroke_color=CART, stroke_width=3, fill_opacity=0).move_to([CARD_X, -0.65, 0]).set_z_index(21)
        chip_p = RoundedRectangle(corner_radius=0.15, width=5.4, height=0.9, stroke_color=POLAR, stroke_width=3, fill_opacity=0).move_to([CARD_X, -1.85, 0]).set_z_index(21)
        tc = words("Cartesian address", CART, 32, BOLD).move_to(chip_c).set_z_index(22)
        tp = words("polar address", POLAR, 32, BOLD).move_to(chip_p).set_z_index(22)
        b.pop(FadeIn(self.panel), FadeIn(self.mask), FadeIn(self.grid), FadeIn(self.axes), FadeIn(self.axis_names), FadeIn(self.dot),
              FadeIn(self.zlab), FadeIn(self.card), FadeIn(self.kicker), FadeIn(title), FadeIn(zeq))
        b.go(0.25, 0.20, Flash(self.dot, color=INK, flash_radius=0.5), Indicate(self.dot, scale_factor=1.8, color=INK))
        b.go(0.48, 0.14, FadeIn(q1))
        b.go(0.66, 0.12, Create(chip_c), FadeIn(tc))
        b.go(0.78, 0.12, Create(chip_p), FadeIn(tp))
        self.intro_mobs = VGroup(title, zeq, q1, chip_c, chip_p, tc, tp)

    def cart(self, t):
        b = Shots(self, t)
        drops, labels = self.cart_marks()
        title = self.card_title("Cartesian address", CART)
        pair = self.card_line(tex(r"(x,\,y)=\left(-1,\ \sqrt{3}\right)", CART, 48), 0)
        a1 = Arrow(P(0, 0), P(Z[0], 0), buff=0, color=CART, stroke_width=9, tip_length=0.28, max_tip_length_to_length_ratio=0.5).set_z_index(7)
        a2 = Arrow(P(Z[0], 0), P(*Z), buff=0, color=CART, stroke_width=9, tip_length=0.28).set_z_index(7)
        l1 = words("left 1", CART, 32).move_to(P(-0.4, 0.3))
        l2 = words("up √3", CART, 32).move_to(P(-1.85, 0.95))
        z_line = self.card_line(tex(r"z=x+iy=-1+i\sqrt{3}", CART, 46), 1)
        slide = self.card_line(words("a slide: left 1, then up √3", CART, 32), 2)
        legend = self.card_line(words("blue = Cartesian: drop lines, axes, grid", CART, 28), 3.4)
        b.pop(FadeOut(self.intro_mobs), FadeIn(title), FadeIn(pair), Create(drops), FadeIn(labels),
              self.axes.animate.set_stroke(color=CART), self.grid.animate.set_stroke(color=CART, opacity=0.24))
        b.go(0.16, 0.12, Create(a1))
        b.go(0.29, 0.14, FadeIn(l1), Create(a2), FadeIn(l2))
        b.go(0.45, 0.2, Write(z_line))
        b.go(0.62, 0.14, FadeIn(slide))
        b.go(0.78, 0.12, FadeIn(legend))
        self.cart_drops, self.cart_labels = drops, labels
        self.cart_group = VGroup(drops, labels)
        self.cart_card = VGroup(title, pair, z_line, slide, legend)
        self.cart_tracers = VGroup(a1, a2, l1, l2)

    def polar(self, t):
        b = Shots(self, t)
        ray_arc, labels = self.polar_marks()
        pgrid = self.polar_grid(skip=(120,))                     # the solid orange ray already lies on 120 degrees; a faint one would run through the z label
        title = self.card_title("polar address", POLAR)
        pair = self.card_line(tex(r"(r,\,\theta)=\left(2,\ \tfrac{2\pi}{3}\right)", POLAR, 48), 0)
        l_turn = self.card_line(tex(r"\text{turn }\theta=120^\circ", POLAR, 44), 1)
        l_str = self.card_line(tex(r"\text{stretch to }r=2", POLAR, 44), 2)
        legend = self.card_line(words("orange = polar: ray, arc, circles", POLAR, 28), 3.4)
        ang, ln = ValueTracker(0.0), ValueTracker(1.0)          # the unit move: turn (degrees), then stretch (length)
        vec = always_redraw(lambda: Arrow(O, O + U * ln.get_value() * np.array([np.cos(np.radians(ang.get_value())), np.sin(np.radians(ang.get_value())), 0]),
                                          buff=0, color=INK, stroke_width=9, tip_length=0.26, max_tip_length_to_length_ratio=0.45).set_z_index(9))
        b.pop(FadeOut(self.cart_card), FadeOut(self.cart_tracers), FadeIn(title), FadeIn(pair),
              FadeOut(self.cart_labels), self.cart_drops.animate.set_opacity(0.2), self.axes.animate.set_stroke(color=MUTED, opacity=0.9), self.grid.animate.set_stroke(color=MUTED, opacity=0.14),
              FadeIn(pgrid), Create(ray_arc), FadeIn(labels), FadeIn(vec))
        b.go(0.2, 0.23, ang.animate.set_value(120.0), FadeIn(l_turn))
        b.go(0.45, 0.17, ln.animate.set_value(2.0), FadeIn(l_str))
        b.go(0.64, 0.05, FadeOut(vec))
        b.go(0.78, 0.12, FadeIn(legend))
        self.remove(vec)
        self.polar_group = VGroup(ray_arc, labels, pgrid)
        self.polar_card = VGroup(title, pair, l_turn, l_str, legend)

    def same(self, t):
        b = Shots(self, t)
        title = self.card_title("Same dot", INK)
        rc = self.card_line(tex(r"(x,\,y)=\left(-1,\ \sqrt{3}\right)", CART, 46), 0)
        rp = self.card_line(tex(r"(r,\,\theta)=\left(2,\ \tfrac{2\pi}{3}\right)", POLAR, 46), 1)
        ex = self.card_line(MathTex(r"-1", r"=", r"2\cos 120^\circ", font_size=46, color=INK), 2.1)
        ex[0].set_color(CART)
        ex[2].set_color(POLAR)
        ey = self.card_line(MathTex(r"\sqrt{3}", r"=", r"2\sin 120^\circ", font_size=46, color=INK), 3.0)
        ey[0].set_color(CART)
        ey[2].set_color(POLAR)
        ok = self.card_line(words("one dot, two addresses, they agree", OK, 30), 4.0)
        b.pop(FadeOut(self.polar_card), FadeIn(title), FadeIn(rc), FadeIn(rp), self.cart_drops.animate.set_opacity(1), FadeIn(self.cart_labels))
        b.go(0.09, 0.11, Indicate(self.dot, scale_factor=1.8, color=INK))
        b.go(0.21, 0.13, Indicate(self.cart_group, color=CART, scale_factor=1.0))
        b.go(0.36, 0.17, Indicate(self.polar_group, color=POLAR, scale_factor=1.0))
        b.go(0.55, 0.12, Write(ex))
        b.go(0.67, 0.12, Write(ey))
        b.go(0.82, 0.1, FadeIn(ok))
        self.same_card = VGroup(title, rc, rp, ex, ey, ok)

    def add_beat(self, t):
        b = Shots(self, t)
        w = (2.0, -1.0)                                           # the slide: 2 - i
        zn = (Z[0] + w[0], Z[1] + w[1])
        title = self.card_title("Add: a slide", CART)
        l1 = self.card_line(tex(r"(-1+i\sqrt{3})+(2-i)", CART, 44), 0)
        l2 = self.card_line(tex(r"=(-1+2)+(\sqrt{3}-1)\,i", CART, 44), 1)
        l3 = self.card_line(tex(r"=1+(\sqrt{3}-1)\,i\approx 1+0.73i", CART, 44), 2)
        hint = self.card_line(words("in polar: r ≈ 1.24, θ ≈ 36.2°, no tidy rule", POLAR, 28), 3.4)
        lattice = VGroup(*[Dot(P(x, y), radius=0.05, color=CART).set_opacity(0.6) for x in range(-5, 6) for y in range(-4, 5)])
        ghost = Dot(P(*Z), radius=0.13, color=INK).set_opacity(0.4)
        arrow = Arrow(P(*Z), P(*zn), buff=0.13, color=CART, stroke_width=8, tip_length=0.26).set_z_index(7)
        wl = tex(r"+(2-i)", CART, 42).next_to(arrow.get_center(), UP, buff=0.3).shift(RIGHT * 0.4).set_z_index(8)     # the shaft slopes down to the right: a label above its middle has to sit right of it
        zl = tex(r"z+(2-i)", INK, 40).move_to(P(zn[0] + 0.1, zn[1]) + np.array([0.95, 0.35, 0]))
        b.pop(FadeOut(self.same_card), FadeOut(self.cart_group), FadeOut(self.polar_group), FadeOut(self.zlab),
              self.grid.animate.set_stroke(color=CART, opacity=0.2), self.axes.animate.set_stroke(color=CART, opacity=0.9),
              FadeIn(title), FadeIn(l1), FadeIn(lattice), FadeIn(ghost), Create(arrow), FadeIn(wl))
        carried = VGroup(lattice, self.dot)
        b.go(0.1, 0.3, carried.animate.shift(U * np.array([w[0], w[1], 0.0])), FadeOut(wl))
        b.go(0.4, 0.04, FadeIn(zl))
        b.go(0.43, 0.12, Write(l2))
        b.go(0.57, 0.1, Write(l3))
        b.go(0.72, 0.12, FadeIn(hint))
        self.add_stuff = VGroup(title, l1, l2, l3, hint, lattice, ghost, arrow, zl)

    def mul(self, t):
        b = Shots(self, t)
        res = (-1 - S3, S3 - 1)                                   # z (1 + i) = (-1 - sqrt 3) + (sqrt 3 - 1) i
        rr = 2 * S2
        res_pt = polar_pt(rr, 165)
        title = self.card_title("Multiply: a move", POLAR)
        l1 = self.card_line(tex(r"\times(1+i)=\sqrt{2}\,e^{i\,45^\circ}", POLAR, 44), 0)
        l2 = self.card_line(tex(r"120^\circ+45^\circ=165^\circ", POLAR, 44), 1)
        l3 = self.card_line(tex(r"2\cdot\sqrt{2}=2\sqrt{2}", POLAR, 44), 2)
        l4 = self.card_line(tex(r"z(1+i)\approx-2.73+0.73i", CART, 44), 3.1)
        lat = self.polar_grid(rings=(1, 2), reach=2.7)
        tile = Square(side_length=0.64, color=POLAR, stroke_width=3, fill_opacity=0.25).move_to(P(*Z)).set_z_index(5)      # its image (side 0.64 root 2, turned 45 degrees) reaches 0.64 left of the product: inside the panel
        target = Square(side_length=0.64 * S2, color=POLAR, stroke_width=2.5, fill_opacity=0.12).rotate(np.radians(45)).move_to(res_pt).set_z_index(5)
        z0 = Dot(P(*Z), radius=0.13, color=INK).set_opacity(0.45).set_z_index(6)
        zl0 = tex("z", INK, 44).set_opacity(0.55).next_to(P(*Z), UP, buff=0.12).shift(LEFT * 0.15)
        prod = Dot(res_pt, radius=0.13, color=INK).set_z_index(8)
        prod_l = tex(r"z(1+i)", INK, 42).move_to(P(res[0] + 1.05, -0.5))                 # inside the dashed ring, below the real axis
        a1 = Arc(radius=0.62, start_angle=0, angle=np.radians(120), arc_center=O, color=POLAR, stroke_width=6)
        a2 = Arc(radius=0.95, start_angle=np.radians(120), angle=np.radians(45), arc_center=O, color=POLAR, stroke_width=6)
        a3 = Arc(radius=1.3, start_angle=0, angle=np.radians(165), arc_center=O, color=POLAR, stroke_width=3, stroke_opacity=0.7)
        t1 = tex(r"120^\circ", POLAR, 36).move_to(polar_pt(0.92, 55))
        t2 = tex(r"+45^\circ", POLAR, 36).move_to(polar_pt(1.32, 143))
        t3 = tex(r"165^\circ", POLAR, 38).move_to(polar_pt(1.75, 85))
        ring = DashedVMobject(Circle(radius=rr * U, arc_center=O, color=POLAR, stroke_width=2.5, stroke_opacity=0.7), num_dashes=48)
        b.pop(FadeOut(self.add_stuff), FadeOut(self.dot), FadeIn(title), FadeIn(l1),
              self.grid.animate.set_stroke(color=MUTED, opacity=0.14), self.axes.animate.set_stroke(color=MUTED, opacity=0.9),
              FadeIn(lat), FadeIn(tile), FadeIn(target), FadeIn(z0), FadeIn(zl0), FadeIn(prod), FadeIn(prod_l),
              Create(a1), Create(a2), Create(a3), FadeIn(t1), FadeIn(t2), FadeIn(t3), Create(ring))
        self.remove(self.dot)
        carried = VGroup(lat, tile, Dot(P(*Z), radius=0.13, color=INK).set_opacity(0.6).set_z_index(7))
        b.go(0.1, 0.22, Rotate(carried, np.radians(45), about_point=O), FadeIn(l2))          # turn the whole plane by 45 degrees
        b.go(0.34, 0.2, carried.animate.scale(S2, about_point=O), FadeIn(l3))                 # then stretch it by root two
        b.go(0.58, 0.12, FadeIn(l4))
        b.go(0.74, 0.1, FadeOut(carried[0]))
        self.mul_stuff = VGroup(title, l1, l2, l3, l4, z0, zl0, prod, prod_l, a1, a2, a3, t1, t2, t3, ring, carried, target)

    def rule(self, t):
        b = Shots(self, t)
        head = words("Which address makes this easy?", INK, 44, BOLD).move_to([0, 3.3, 0]).set_z_index(22)
        box_c = RoundedRectangle(corner_radius=0.2, width=6.5, height=3.3, stroke_color=CART, stroke_width=4, fill_color=SURFACE, fill_opacity=1).move_to([-3.65, 1.0, 0]).set_z_index(20)
        box_p = RoundedRectangle(corner_radius=0.2, width=6.5, height=3.3, stroke_color=POLAR, stroke_width=4, fill_color=SURFACE, fill_opacity=1).move_to([3.65, 1.0, 0]).set_z_index(20)
        tc = words("Cartesian: a slide", CART, 38, BOLD).move_to([-3.65, 2.2, 0]).set_z_index(22)
        tp = words("polar: a move", POLAR, 38, BOLD).move_to([3.65, 2.2, 0]).set_z_index(22)
        ic = VGroup(tex(r"z_1+z_2,\quad z_1-z_2", CART, 44), tex(r"|z_1-z_2|\ \text{(distance)}", CART, 42)).arrange(DOWN, buff=0.4).move_to([-3.65, 0.8, 0]).set_z_index(22)
        ip = VGroup(tex(r"z_1z_2,\quad z_1/z_2", POLAR, 44), tex(r"z^n,\quad \sqrt[n]{z}", POLAR, 44)).arrange(DOWN, buff=0.4).move_to([3.65, 0.8, 0]).set_z_index(22)
        back = CurvedDoubleArrow(box_c.get_bottom() + DOWN * 0.1 + RIGHT * 1.2, box_p.get_bottom() + DOWN * 0.1 + LEFT * 1.2,
                                 angle=TAU / 7, color=INK, stroke_width=4, tip_length=0.2).set_z_index(22)
        back_l = words("do the work there, then translate back", INK, 30).move_to([0, -1.55, 0]).set_z_index(22)
        ex_h = words("small whole numbers: either way", MUTED, 28).move_to([0, -2.15, 0]).set_z_index(22)
        ex_c = tex(r"(3-2i)(-1+4i)=5+14i", CART, 42).move_to([-3.65, -2.9, 0]).set_z_index(22)
        ex_p = tex(r"\sqrt{13}\cdot\sqrt{17}=\sqrt{221}=|5+14i|", POLAR, 38).move_to([3.65, -2.9, 0]).set_z_index(22)
        old = VGroup(self.panel, self.mask, self.grid, self.axes, self.axis_names, self.card, self.kicker, self.mul_stuff, self.cart_group, self.polar_group)
        b.pop(FadeOut(old), FadeIn(head), FadeIn(box_c), FadeIn(box_p), FadeIn(tc), FadeIn(tp))
        b.go(0.27, 0.18, FadeIn(ic))
        b.go(0.48, 0.18, FadeIn(ip))
        b.go(0.68, 0.14, Create(back), FadeIn(back_l))
        b.go(0.82, 0.12, FadeIn(ex_h), FadeIn(ex_c), FadeIn(ex_p))
        self.rule_stuff = VGroup(head, box_c, box_p, tc, tp, ic, ip, back, back_l, ex_c, ex_p, ex_h)

    def euler(self, t):
        b = Shots(self, t)
        ang, rad = ValueTracker(40.0), ValueTracker(1.0)          # the point e^{i theta}: angle in degrees, then stretched to length 2

        def ppt():
            a = np.radians(ang.get_value())
            return P(rad.get_value() * np.cos(a), rad.get_value() * np.sin(a), UE)

        def foot():
            return P(rad.get_value() * np.cos(np.radians(ang.get_value())), 0, UE)

        grid, axes = self.stage(UE)
        grid.set_stroke(color=MUTED, opacity=0.16)
        circ = Circle(radius=UE, arc_center=O, color=POLAR, stroke_width=4)
        circ2 = DashedVMobject(Circle(radius=2 * UE, arc_center=O, color=POLAR, stroke_width=2, stroke_opacity=0.5), num_dashes=60)
        dot = always_redraw(lambda: Dot(ppt(), radius=0.13, color=INK).set_z_index(8))
        hleg = always_redraw(lambda: Line(O, foot(), color=CART, stroke_width=8).set_z_index(6))
        vleg = always_redraw(lambda: DashedLine(foot(), ppt(), color=CART, stroke_width=5, dash_length=0.1).set_z_index(6) if abs(ppt()[1] - foot()[1]) > 0.05 else VMobject())
        arc = always_redraw(lambda: Arc(radius=0.55, start_angle=0, angle=np.radians(ang.get_value()), arc_center=O, color=POLAR, stroke_width=5).set_z_index(6))
        ray = always_redraw(lambda: Line(O, ppt(), color=POLAR, stroke_width=3.5, stroke_opacity=0.8).set_z_index(5))
        th = always_redraw(lambda: tex(r"\theta", POLAR, 44).move_to(O + 0.9 * np.array([np.cos(np.radians(ang.get_value()) / 2), np.sin(np.radians(ang.get_value()) / 2), 0])).set_z_index(8))

        def leg_labels(prefix=None):
            """The labels of the two legs. On the unit circle the legs are cos and sin; stretched to length r they are r cos and r sin
            (prefix 'r', then the number 2 at the end), so a leg is never called by a name that is not its length."""
            pair = []
            for trig in (r"\cos\theta", r"\sin\theta"):
                m = MathTex(*([prefix] if prefix else []), trig, font_size=40, color=CART)
                if prefix:
                    m[0].set_color(POLAR)
                pair.append(m)
            pair[0].add_updater(lambda m: m.move_to(O + (foot() - O) / 2 + DOWN * 0.4).set_z_index(8), call_updater=True)
            pair[1].add_updater(lambda m: m.move_to(foot() + np.array([(0.2 + m.width / 2) * (1 if foot()[0] >= O[0] else -1), (ppt()[1] - foot()[1]) / 2, 0])).set_z_index(8), call_updater=True)
            return pair
        clab, slab = leg_labels()
        clab_r, slab_r = leg_labels(r"r\,")
        clab_2, slab_2 = leg_labels(r"2\,")
        title = self.card_title("Euler's formula", INK)
        f1 = self.card_line(MathTex(r"e^{i\theta}", r"=", r"\cos\theta+i\sin\theta", font_size=60, color=INK), 0.1)
        f1[0].set_color(POLAR)
        f1[2].set_color(CART)
        f2 = self.card_line(MathTex(r"\theta=120^\circ:\ e^{i\theta}=-\tfrac12+\tfrac{\sqrt3}{2}\,i", font_size=40, color=INK), 1.3)
        f3 = self.card_line(MathTex(r"2\,e^{i\,120^\circ}=-1+i\sqrt{3}", font_size=48, color=INK), 2.4)
        badge = self.card_line(words("unit circle: length 1", POLAR, 30), 3.5)
        badge2 = self.card_line(words("stretch to length 2", POLAR, 30), 3.5)
        b.pop(FadeIn(self.panel), FadeIn(self.mask), FadeIn(grid), FadeIn(axes), FadeIn(self.axis_names), FadeIn(self.card), FadeIn(self.kicker),
              FadeOut(self.rule_stuff), FadeIn(circ), FadeIn(dot), FadeIn(hleg), FadeIn(vleg), FadeIn(arc), FadeIn(ray), FadeIn(th), FadeIn(clab), FadeIn(slab),
              FadeIn(title), FadeIn(f1), FadeIn(badge))
        b.go(0.1, 0.4, ang.animate.set_value(120.0), rate_func=smooth)                        # sweep theta from 40 to 120 degrees
        b.go(0.52, 0.04, FadeIn(f2))
        b.go(0.57, 0.03, FadeOut(clab), FadeOut(slab), FadeIn(clab_r), FadeIn(slab_r), FadeOut(badge), FadeIn(badge2))   # the legs are about to grow: they become r cos theta and r sin theta
        b.go(0.6, 0.18, rad.animate.set_value(2.0), FadeIn(circ2))                            # stretch to length 2
        b.go(0.78, 0.02, FadeOut(clab_r), FadeOut(slab_r), FadeIn(clab_2), FadeIn(slab_2))    # at length 2 the legs are 2 cos 120 = -1 and 2 sin 120 = root 3
        b.go(0.8, 0.08, Write(f3))
        b.go(0.89, 0.07, Flash(dot, color=INK, flash_radius=0.5))
