"""Video 2, staircase-roots: one dot, many names for its angle. Station: staircase.

Narration: media/narration/videos/staircase-roots.json. Nine beats, one per segment, in the JSON's order.
The picture is one stage seen by a camera that can look straight down (the plane: only the dot) or from the
side (the staircase of names rises above the dot). Every beat opens on its own picture within half a second,
then re-enacts the construction on top of it. Colours come only from lib.palette: POLAR for names, angles and
roots, CART for Cartesian addresses, INK for the point, SEAM and WARN for the seam and the jump.
"""
import numpy as np
from manim import *

from lib.narrated import NarratedScene
from lib.palette import BG, SURFACE, INK, MUTED, CART, POLAR, SEAM, WARN, OK

S3 = 3 ** 0.5
S2 = 2 ** 0.5
TAU = 2 * np.pi
RS = 2.3                                   # screen radius of the circle of interest (always the same size)
HT = 1.35                                  # screen height of one full turn, times the cosine of the elevation
PHI_TOP, PHI_TILT = 90.0, 38.0             # camera elevation in degrees: straight down / from the side
H0 = 1.0                                   # turns: the floor is the level of angle -360, so the steps -240, 120, 480 ... stand above the dot
POLE = (-0.2, 3.6)                         # the staircase pole, in turns above the floor
PANEL_C = np.array([-3.4, -0.1, 0.0])
PANEL_W, PANEL_H = 7.0, 7.2
CARD_X, CARD_W, CARD_H = 3.75, 6.4, 7.2
CY_TOP, CY_TILT = -0.2, -1.15              # screen y of the floor centre when looking down / from the side


def wrap_to(deg, lo):
    """The name of the same turn that lies in the window (lo, lo + 360]."""
    r = (deg - lo) % 360.0
    return lo + (360.0 if r < 1e-9 else r)


def hgt(deg):
    """Height, in turns above the floor, of the step named deg."""
    return deg / 360.0 + H0


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
    narration_id = "staircase-roots"

    # ------------------------------------------------------------------ state and projection
    def init_state(self):
        self.phi = ValueTracker(PHI_TOP)       # camera elevation in degrees
        self.ang = ValueTracker(120.0)         # the dot's continuous angle in degrees (not wrapped)
        self.sig = ValueTracker(-180.0)        # the seam: the window of names is (sig, sig + 360]
        self.lw = 2.0                          # the length drawn at screen radius RS
        self.kspan = (-3, 3)                   # which steps of the staircase are drawn
        self.home_on = False                   # highlight the step inside the window
        self.last_jump = -10.0                 # scene time of the last jump of the home name
        self.vis = {k: ValueTracker(0.0) for k in ("floor", "seam", "stairs", "window", "dot", "arcs")}
        self.emph = [ValueTracker(0.0) for _ in range(3)]

    def v(self, name):
        return self.vis[name].get_value()

    def show(self, name, on=1.0):
        return self.vis[name].animate.set_value(on)

    def tilted(self):
        return self.phi.get_value() < 80

    def cy(self):
        return CY_TOP + (CY_TILT - CY_TOP) * (PHI_TOP - self.phi.get_value()) / (PHI_TOP - PHI_TILT)

    def proj(self, x, y, h=0.0):
        """Plane point (x, y), h turns above the floor, as a screen point. x and y are in the units of self.lw."""
        ph = np.radians(self.phi.get_value())
        k = RS / self.lw
        return np.array([PANEL_C[0] + k * x, self.cy() + k * y * np.sin(ph) + h * HT * np.cos(ph), 0.0])

    def fp(self, r, deg, h=0.0):
        """Point at radius r (units of lw) and angle deg on the floor, h turns up."""
        a = np.radians(deg)
        return self.proj(r * np.cos(a), r * np.sin(a), h)

    # ------------------------------------------------------------------ the always-redrawn stage
    # Every part reads the trackers each frame; fading a part means animating its entry of self.vis.
    def make_floor(self):
        def disk():
            pts = [self.fp(1.55 * self.lw, d) for d in np.linspace(0, 360, 73)]
            return Polygon(*pts, stroke_width=0, fill_color=MUTED, fill_opacity=0.07 * self.v("floor"))

        def axes():
            e = 1.55 * self.lw
            m = VGroup(Line(self.proj(-e, 0), self.proj(e, 0)), Line(self.proj(0, -e), self.proj(0, e)))
            return m.set_stroke(color=MUTED, width=2, opacity=0.75 * self.v("floor"))

        def circle():
            m = ParametricFunction(lambda a: self.fp(self.lw, np.degrees(a)), t_range=[0, TAU, 0.05])
            return m.set_stroke(color=POLAR, width=2.5, opacity=0.5 * self.v("floor"))

        def seam():
            m = DashedLine(self.proj(0, 0), self.fp(1.55 * self.lw, self.sig.get_value()), color=SEAM, stroke_width=5, dash_length=0.14)
            return m.set_stroke(opacity=self.v("seam"))

        seam_label = words("seam", SEAM, 32)

        def place_seam_label(m):
            """On the left-hand side of the seam as seen from the pole: below the negative real axis, right of the negative imaginary axis,
            above the positive real axis. The home bar and the window labels lie on the other side."""
            c = self.proj(0, 0)
            e = self.fp(0.55 * self.lw, self.sig.get_value()) - c                       # from the pole to the label's spot on the seam
            d = e / max(np.linalg.norm(e), 1e-9)
            n = np.array([-d[1], d[0], 0.0])                                            # the left-hand normal, in screen space
            m.move_to(c + e + n * (0.36 + 0.3 * abs(n[0]))).set_opacity(self.v("seam")).set_z_index(8)
        seam_label.add_updater(place_seam_label)
        return [always_redraw(f) for f in (disk, axes, circle, seam)] + [seam_label]

    def make_stairs(self):
        def pole():
            m = Line(self.proj(0, 0, POLE[0]), self.proj(0, 0, POLE[1]), color=MUTED, stroke_width=3)
            return m.set_stroke(opacity=0.8 * self.v("stairs") * (1 if self.tilted() else 0))

        def bars():
            a, lw, sg = self.ang.get_value(), self.lw, self.sig.get_value()
            vis = self.v("stairs")
            g = VGroup()
            for k in range(self.kspan[0], self.kspan[1] + 1):
                th = a + 360 * k                                   # the k-th name of the dot's angle
                h = hgt(th)
                base, tip = self.proj(0, 0, h), self.fp(lw, th, h)
                home = self.home_on and sg + 1e-6 < th <= sg + 360 + 1e-6
                g.add(Line(base, tip, color=POLAR, stroke_width=7 if home else 3, stroke_opacity=(1.0 if home else 0.5) * vis))
                g.add(Dot(tip, radius=0.17 if home else 0.09, color=POLAR).set_opacity((1.0 if home else 0.6) * vis))
                if home:
                    g.add(Circle(radius=0.29, color=INK, stroke_width=3.5).move_to(tip).set_stroke(opacity=vis))
            return g

        def helix():
            a = self.ang.get_value()
            lo, hi = a + 360 * (self.kspan[0] - 0.4), a + 360 * (self.kspan[1] + 0.4)
            m = ParametricFunction(lambda p: self.fp(self.lw, p, hgt(p)), t_range=[lo, hi, 4.0])
            return m.set_stroke(color=POLAR, width=2.2, opacity=0.16 * self.v("stairs"))

        def tether():
            a, lw = self.ang.get_value(), self.lw
            lo, hi = a + 360 * self.kspan[0], a + 360 * self.kspan[1]
            m = DashedLine(self.fp(lw, a, hgt(lo)), self.fp(lw, a, hgt(hi)), color=POLAR, stroke_width=2, dash_length=0.1)
            return m.set_stroke(opacity=0.5 * self.v("stairs"))

        return [always_redraw(f) for f in (helix, tether, pole, bars)]

    def make_window(self):
        def window():
            s = self.sig.get_value()
            vis = self.v("window") * (1 if self.tilted() else 0)
            p1, p2 = self.proj(0, 0, hgt(s)), self.proj(0, 0, hgt(s) + 1.0)
            fill = Rectangle(width=0.5, height=max(0.01, p2[1] - p1[1]), stroke_width=0, fill_color=POLAR, fill_opacity=0.28 * vis).move_to((p1 + p2) / 2)
            top = Line(p2 + LEFT * 0.4, p2 + RIGHT * 0.4, color=POLAR, stroke_width=5, stroke_opacity=vis)             # solid: included
            bot = DashedLine(p1 + LEFT * 0.4, p1 + RIGHT * 0.4, color=POLAR, stroke_width=5, dash_length=0.1).set_stroke(opacity=vis)   # dashed: left out
            return VGroup(fill, top, bot)

        def flash():
            age = self.renderer.time - self.last_jump
            s = self.sig.get_value()
            op = max(0.0, 1 - age / 0.9) * self.v("window")
            return VGroup(*[Circle(radius=0.3 + 0.7 * min(age, 0.9), color=WARN, stroke_width=4).move_to(self.proj(0, 0, hh)).set_stroke(opacity=op)
                            for hh in (hgt(s), hgt(s) + 1.0)]).set_z_index(9)

        return [always_redraw(window), always_redraw(flash)]

    def make_dot(self):
        def dot():
            return Dot(self.fp(self.lw, self.ang.get_value()), radius=0.14, color=INK).set_z_index(8).set_opacity(self.v("dot"))

        def zlab():
            m = tex("z", INK, 48).move_to(self.fp(self.lw, self.ang.get_value()) + np.array([-0.32, -0.4, 0]))
            return m.set_opacity(self.v("dot")).set_z_index(8)

        return [always_redraw(dot), always_redraw(zlab)]

    def floor_arc(self, r, start_deg, end_deg, idx=None, width=6, alpha=1.0, spiral=0.0, dashed=False, color=POLAR):
        """An arc on the floor from start_deg to end_deg (a spiral if the radius grows by `spiral` per turn); idx pulses it."""
        def f():
            n = max(8, int(abs(end_deg - start_deg) / 4))
            pts = [self.fp(r + spiral * (d - start_deg) / 360.0, d) for d in np.linspace(start_deg, end_deg, n)]
            m = VMobject().set_points_smoothly(pts)
            e = self.emph[idx].get_value() if idx is not None else 0.0
            m.set_stroke(color=color, width=width + 5 * e, opacity=alpha * self.v("arcs"))
            return DashedVMobject(m, num_dashes=26) if dashed else m
        return always_redraw(f)

    def floor_ray(self, deg, r=1.0, color=POLAR, width=6, alpha=1.0, dashed=False):
        def f():
            ln = (DashedLine if dashed else Line)(self.proj(0, 0), self.fp(r, deg), color=color, stroke_width=width)
            return ln.set_stroke(opacity=alpha * self.v("arcs"))
        return always_redraw(f)

    # ------------------------------------------------------------------ the card
    def card_title(self, text, color):
        m = words(text, color, 36, BOLD)
        if m.width > CARD_W - 0.8:
            m.scale_to_fit_width(CARD_W - 0.8)
        return m.move_to([CARD_X - CARD_W / 2 + 0.4, 3.0, 0], aligned_edge=LEFT).set_z_index(21)

    def card_line(self, mob, row):
        if mob.width > CARD_W - 0.8:
            mob.scale_to_fit_width(CARD_W - 0.8)
        mob.set_z_index(21)
        return mob.move_to([CARD_X - CARD_W / 2 + 0.4, 2.0 - 1.0 * row, 0], aligned_edge=LEFT)

    def dial(self, deg, center):
        """A small circle with one radius at angle deg: the direction a number points."""
        c = Circle(radius=0.3, color=POLAR, stroke_width=2.5, stroke_opacity=0.6).move_to(center)
        ln = Line(center, center + 0.3 * np.array([np.cos(np.radians(deg)), np.sin(np.radians(deg)), 0]), color=POLAR, stroke_width=6)
        return VGroup(c, ln, Dot(center, radius=0.04, color=POLAR)).set_z_index(21)

    def pulse(self, point=None, radius=0.55):
        p = self.fp(self.lw, self.ang.get_value()) if point is None else point
        return Flash(p, color=INK, flash_radius=radius, line_length=0.18)

    # ------------------------------------------------------------------ the film
    def construct(self):
        self.camera.background_color = BG
        self.init_state()
        panel = Rectangle(width=PANEL_W, height=PANEL_H, fill_color=SURFACE, fill_opacity=0.6, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to(PANEL_C)
        hole = Rectangle(width=PANEL_W, height=PANEL_H).move_to(PANEL_C)
        mask = Cutout(Rectangle(width=16, height=9), hole, fill_color=BG, fill_opacity=1, stroke_width=0).set_z_index(10)
        card = RoundedRectangle(corner_radius=0.2, width=CARD_W, height=CARD_H, fill_color=SURFACE, fill_opacity=1, stroke_color=MUTED, stroke_width=1.5, stroke_opacity=0.4).move_to([CARD_X, PANEL_C[1], 0]).set_z_index(20)
        self.add(panel, mask, card, *self.make_floor(), *self.make_stairs(), *self.make_window(), *self.make_dot())
        with self.beat("intro") as t:
            self.intro(t)
        with self.beat("names") as t:
            self.names(t)
        with self.beat("set") as t:
            self.set_beat(t)
        with self.beat("home") as t:
            self.home(t)
        with self.beat("jump") as t:
            self.jump(t)
        with self.beat("power") as t:
            self.power(t)
        with self.beat("roots") as t:
            self.roots(t)
        with self.beat("principal") as t:
            self.principal(t)
        with self.beat("branch") as t:
            self.branch(t)

    # ------------------------------------------------------------------ beats
    def intro(self, t):
        b = Shots(self, t)
        title = self.card_title("One dot", INK)
        cart = self.card_line(tex(r"\text{Cartesian: }(-1,\ \sqrt{3})", CART, 44), 0)
        pol = self.card_line(tex(r"\text{polar: length }2,\ \text{angle }?", POLAR, 44), 1.2)
        names = self.card_line(tex(r"120^\circ,\ 480^\circ,\ -240^\circ,\ \dots", POLAR, 48), 2.3)
        use = self.card_line(words("roots, branches, half the test", MUTED, 30), 3.6)
        ray = self.floor_ray(120.0, 2.0)
        a1 = self.floor_arc(0.7, 0, 120)
        a2 = self.floor_arc(0.95, 0, 480, alpha=0.6, spiral=0.35)
        lab = tex(r"120^\circ", POLAR, 44).move_to(self.fp(1.1, 55))
        q = tex(r"?", WARN, 60).move_to(self.fp(1.5, 160))
        self.add(ray, a1, a2)
        b.pop(self.show("floor"), self.show("dot"), FadeIn(title), FadeIn(cart))
        b.go(0.12, 0.1, self.show("arcs"), FadeIn(lab))
        b.go(0.3, 0.12, FadeIn(pol))
        b.go(0.5, 0.18, FadeIn(q), FadeIn(names))
        b.go(0.78, 0.12, FadeIn(use))
        self.intro_stuff = VGroup(title, cart, pol, names, use, lab, q)
        self.intro_arcs = (ray, a1, a2)

    def names(self, t):
        b = Shots(self, t)
        for m in self.intro_arcs:
            self.remove(m)
        title = self.card_title("Three names, one dot", POLAR)
        r1 = self.card_line(tex(r"\theta=120^\circ", POLAR, 48), 0)
        r2 = self.card_line(tex(r"\theta=480^\circ=120^\circ+360^\circ", POLAR, 44), 1.1)
        r3 = self.card_line(tex(r"\theta=-240^\circ=120^\circ-360^\circ", POLAR, 44), 2.2)
        same = self.card_line(words("the same dot every time", INK, 32), 3.4)
        ray = self.floor_ray(120.0, 2.0)
        a1 = self.floor_arc(0.55, 0, 120, idx=0)                                       # 120: solid
        a2 = self.floor_arc(1.0, 0, 480, idx=1, spiral=0.3, alpha=0.9)                 # 480: a lap and a third, as a spiral
        a3 = self.floor_arc(0.78, 0, -240, idx=2, dashed=True, alpha=0.95)             # -240: clockwise, dashed
        self.add(ray, a1, a2, a3)
        b.pop(FadeOut(self.intro_stuff), FadeIn(title), FadeIn(r1), FadeIn(r2), FadeIn(r3))
        for i, (frac, row) in enumerate(((0.08, r1), (0.30, r2), (0.55, r3))):         # the arc and its row pulse as the voice names it
            b.go(frac, 0.1, self.emph[i].animate.set_value(1.0), Indicate(row, color=INK, scale_factor=1.05))
            b.go(frac + 0.12, 0.06, self.emph[i].animate.set_value(0.0))
        b.go(0.78, 0.1, FadeIn(same), self.pulse())
        self.kspan = (-2, 2)
        b.go(0.88, 0.09, self.phi.animate.set_value(PHI_TILT), self.show("stairs"))   # the camera lowers; the rows stay up while the voice sums them up
        self.names_stuff = VGroup(title, r1, r2, r3, same)
        self.names_arcs = (ray, a1, a2, a3)

    def set_beat(self, t):
        b = Shots(self, t)
        for m in self.names_arcs:
            self.remove(m)
        self.vis["arcs"].set_value(0.0)
        title = self.card_title("arg z: the whole set", POLAR)
        s1 = self.card_line(tex(r"\arg z=\{\,120^\circ+360^\circ k\,\}", POLAR, 48), 0)
        s2 = self.card_line(tex(r"k=\dots,-2,-1,0,1,2,\dots", POLAR, 42), 1.1)
        s3 = self.card_line(words("one step for every full turn", POLAR, 32), 2.2)
        s4 = self.card_line(words("the dot stays on the floor", INK, 32), 3.2)
        labels = VGroup()
        for k in range(-1, 2):                                                          # the labelled steps: -240, 120, 480
            th = 120 + 360 * k
            lb = tex(f"{th}^\\circ", POLAR, 42)
            lb.move_to(self.fp(self.lw, th, hgt(th)) + np.array([-0.9, 0.0, 0]))
            labels.add(lb)
        b.pop(FadeOut(self.names_stuff), FadeIn(title), FadeIn(s1), FadeIn(labels))
        b.go(0.15, 0.2, FadeIn(s2), LaggedStart(*[Indicate(m, color=INK, scale_factor=1.2) for m in labels], lag_ratio=0.5))
        b.go(0.55, 0.12, FadeIn(s3))
        b.go(0.7, 0.12, FadeIn(s4), self.pulse())
        self.set_stuff = VGroup(title, s1, s2, s3, s4)
        self.set_labels = labels

    def home(self, t):
        b = Shots(self, t)
        title = self.card_title("Arg z: the home step", POLAR)
        h1 = self.card_line(MathTex(r"\operatorname{Arg} z\in(-180^\circ,\,180^\circ]", font_size=46, color=POLAR), 0)
        h2 = self.card_line(MathTex(r"\operatorname{Arg} z=120^\circ", font_size=52, color=POLAR), 1.1)
        h3 = self.card_line(MathTex(r"\operatorname{Arg} z", r"\text{ is one number}", font_size=42, color=INK), 2.2)
        h4 = self.card_line(MathTex(r"\arg z", r"\text{ is all of them}", font_size=42, color=INK), 3.1)
        h5 = self.card_line(words("z: the place they all point to", INK, 32), 4.0)
        for m in (h3, h4):
            m[0].set_color(POLAR)
            m[1].set_color(INK)
        top = tex(r"180^\circ\ ]", POLAR, 40).move_to(self.proj(0, 0, hgt(180)) + np.array([1.1, 0.0, 0]))
        bot = tex(r"-180^\circ\ (", POLAR, 40).move_to(self.proj(0, 0, hgt(-180)) + np.array([1.25, 0.0, 0]))
        keep = self.set_labels[1]                                                       # the 120 label stays; the others go
        others = VGroup(self.set_labels[0], self.set_labels[2])
        self.home_on = True
        b.pop(FadeOut(self.set_stuff), FadeOut(others), self.show("window"), self.show("seam"), FadeIn(title), FadeIn(h1), FadeIn(top), FadeIn(bot))
        b.go(0.3, 0.12, FadeIn(h2), Indicate(keep, color=INK))
        b.go(0.52, 0.1, FadeIn(h3))
        b.go(0.64, 0.1, FadeIn(h4))
        b.go(0.78, 0.12, FadeIn(h5), self.pulse())
        self.home_stuff = VGroup(title, h1, h2, h3, h4, h5, top, bot, keep)

    def jump(self, t):
        b = Shots(self, t)
        title = self.card_title("The home step jumps", POLAR)
        lab1 = MathTex(r"\text{name that keeps climbing}", font_size=36, color=POLAR)
        n1 = DecimalNumber(120, num_decimal_places=0, unit=r"^\circ", font_size=58, color=POLAR)
        lab2 = MathTex(r"\operatorname{Arg} z\ (\text{the home name})", font_size=36, color=INK)
        n2 = DecimalNumber(120, num_decimal_places=0, unit=r"^\circ", font_size=58, color=INK)
        g1 = VGroup(lab1, n1).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        g2 = VGroup(lab2, n2).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        VGroup(g1, g2).arrange(DOWN, aligned_edge=LEFT, buff=0.7).move_to([CARD_X - CARD_W / 2 + 0.4, 0.9, 0], aligned_edge=LEFT)
        for g in (g1, g2):
            g.set_z_index(21)
        # a DecimalNumber builds new digits on every update, so each update puts them back above the card
        n1.add_updater(lambda m: m.set_value(round(self.ang.get_value())).set_z_index(21))
        n2.add_updater(lambda m: m.set_value(round(wrap_to(self.ang.get_value(), -180.0))).set_z_index(21))
        note = self.card_line(words("a name that keeps climbing cannot stay home", MUTED, 30), 4.6)
        self._prev = wrap_to(self.ang.get_value(), -180.0)

        def watch(_):                                                                   # a jump of the home name triggers the red ring
            cur = wrap_to(self.ang.get_value(), -180.0)
            if abs(cur - self._prev) > 180:
                self.last_jump = self.renderer.time
            self._prev = cur
        w = Mobject()
        w.add_updater(watch)
        self.add(w)
        b.pop(FadeOut(self.home_stuff), FadeIn(title), FadeIn(g1), FadeIn(g2))
        b.go(0.0, 0.10, self.ang.animate.set_value(200.0), rate_func=linear)           # across the seam once, early
        b.go(0.15, 0.1, self.ang.animate.set_value(165.0), rate_func=linear)           # and back
        b.go(0.27, 0.1, self.ang.animate.set_value(200.0), rate_func=linear)           # and across again, slowly
        b.go(0.4, 0.4, self.ang.animate.set_value(560.0), rate_func=linear)            # then one whole lap: one jump
        b.go(0.82, 0.05, FadeIn(note))
        self.remove(w)
        n1.clear_updaters()
        n2.clear_updaters()
        self.jump_stuff = VGroup(title, g1, g2, note)

    def power(self, t):
        b = Shots(self, t)
        self.ang.set_value(30.0)                                                        # cut to the test's own number: root three plus i = 2 e^{i 30 deg}
        self.kspan = (-2, 2)
        self.home_on = False
        self.vis["window"].set_value(0.0)
        self.vis["seam"].set_value(0.0)
        title = self.card_title("Powers ignore the name", POLAR)
        r0 = self.card_line(MathTex(r"z=", r"\sqrt{3}+i", r"=", r"2\,e^{i\,30^\circ}", font_size=46, color=INK), 0)
        r0[1].set_color(CART)
        r0[3].set_color(POLAR)
        x0 = CARD_X - CARD_W / 2 + 0.75
        rows = []
        for txt, row in ((r"30^\circ\cdot 10=300^\circ", 1.15), (r"390^\circ\cdot 10=3900^\circ=300^\circ+3600^\circ", 2.15), (r"-330^\circ\cdot 10=-3300^\circ=300^\circ-3600^\circ", 3.15)):
            m = tex(txt, POLAR, 38)
            m.scale_to_fit_width(min(m.width, CARD_W - 1.9))
            m.set_z_index(21).move_to([x0 + 0.65, 2.0 - row, 0], aligned_edge=LEFT)
            rows.append((m, self.dial(300, np.array([x0, 2.0 - row, 0.0]))))           # all three dials point the same way: 300 degrees
        res1 = self.card_line(MathTex(r"z^{10}=1024\,e^{-i\,60^\circ}", font_size=46, color=POLAR), 4.3)
        res2 = self.card_line(MathTex(r"=512-512\sqrt{3}\,i", font_size=46, color=CART), 5.2)
        labels = VGroup()
        for k in (-1, 0, 1):
            th = 30 + 360 * k
            lb = tex(f"{th}^\\circ", POLAR, 42)
            lb.move_to(self.fp(self.lw, th, hgt(th)) + np.array([0.95, 0.0, 0]))
            labels.add(lb)
        ray = self.floor_ray(-60.0, 1.45, dashed=True, width=5)
        arc = self.floor_arc(0.45, 0, -60, width=5)
        lray = tex(r"z^{10}:\ \text{length }1024", POLAR, 36).move_to(self.fp(1.0, -60) + np.array([0.0, -0.75, 0]))
        lang = tex(r"-60^\circ", POLAR, 38).move_to(self.fp(0.75, -22))
        lray.add_updater(lambda m: m.move_to(self.fp(1.0, -60) + np.array([0.0, -0.75, 0])))              # the labels follow the camera while it rises
        lang.add_updater(lambda m: m.move_to(self.fp(0.75, -22)))
        self.add(ray, arc)
        b.pop(FadeOut(self.jump_stuff), FadeIn(title), FadeIn(r0), FadeIn(labels))
        b.go(0.14, 0.12, FadeIn(rows[0][0]), FadeIn(rows[0][1]), self.pulse())
        b.go(0.40, 0.12, FadeIn(rows[1][0]), FadeIn(rows[1][1]))
        b.go(0.54, 0.12, FadeIn(rows[2][0]), FadeIn(rows[2][1]))
        b.go(0.7, 0.12, self.show("arcs"), FadeIn(lray), FadeIn(lang), FadeIn(res1))
        b.go(0.84, 0.06, FadeIn(res2))
        b.go(0.9, 0.07, self.phi.animate.set_value(PHI_TOP), self.show("stairs", 0.0), self.show("dot", 0.0), FadeOut(labels))   # the camera rises to look straight down; the answer's ray stays
        for m in (ray, arc, lray, lang):                                                # freeze the ray and its labels where they are: roots changes lw, which they must not follow
            m.clear_updaters()
        self.power_stuff = VGroup(title, r0, res1, res2, *[m for pair in rows for m in pair], ray, arc, lray, lang)

    def roots(self, t):
        b = Shots(self, t)
        self.lw = 1.0                                                                   # the unit circle is drawn at the usual size
        deg5 = [72 * k for k in range(5)]
        O = self.proj(0, 0)
        title = self.card_title("Roots need every name", POLAR)
        n0 = self.card_line(tex(r"\arg 1=\{0^\circ,\,360^\circ,\,720^\circ,\dots\}", POLAR, 42), 0)
        n1 = self.card_line(tex(r"\div 5:\ 0,\ 72,\ 144,\ 216,\ 288\ (^\circ)", POLAR, 42), 1.1)
        n2 = self.card_line(tex(r"\text{step }5:\ 360^\circ=0^\circ\ \text{again}", POLAR, 42), 2.2)
        n3 = self.card_line(tex(r"\sqrt[4]{-16}:\ 2\,e^{i(45^\circ+90^\circ k)}", POLAR, 42), 3.6)
        n4 = self.card_line(tex(r"=\pm\sqrt{2}\pm\sqrt{2}\,i", CART, 42), 4.6)
        dots = VGroup(*[Dot(self.fp(1.0, d), radius=0.14, color=INK).set_z_index(8) for d in deg5])
        rays = VGroup(*[Line(O, self.fp(1.0, d), color=POLAR, stroke_width=3, stroke_opacity=0.55) for d in deg5])
        pent = Polygon(*[self.fp(1.0, d) for d in deg5], color=POLAR, stroke_width=2, stroke_opacity=0.4, fill_opacity=0)
        arcs = VGroup(*[Arc(radius=0.62 if i % 2 == 0 else 0.84, start_angle=np.radians(d), angle=np.radians(72), arc_center=O, color=POLAR, stroke_width=4)
                        for i, d in enumerate(deg5)])
        a72 = VGroup(*[tex(r"72^\circ", POLAR, 32).move_to(self.fp(0.5, d + 36)) for d in deg5])
        names = VGroup(*[tex(f"{d}^\\circ", POLAR, 40).move_to(self.fp(1.0, d) + 0.68 * np.array([np.cos(np.radians(d)), np.sin(np.radians(d)), 0])) for d in deg5])
        wrap = CurvedArrow(self.fp(1.0, 288) + np.array([0.45, -0.25, 0]), self.fp(1.0, 360) + np.array([0.5, -0.35, 0]),
                           angle=-TAU / 6, color=OK, stroke_width=4, tip_length=0.22).set_z_index(9)
        self.lw = 2.0                                                                   # the four roots of -16 have length 2: same circle, new label
        four_d = [45, 135, 225, 315]
        four = VGroup(*[Dot(self.fp(2.0, d), radius=0.14, color=INK).set_z_index(8) for d in four_d],
                      *[Line(O, self.fp(2.0, d), color=POLAR, stroke_width=3, stroke_opacity=0.55) for d in four_d],
                      *[tex(f"{d}^\\circ", POLAR, 40).move_to(self.fp(2.0, d) + 0.68 * np.array([np.cos(np.radians(d)), np.sin(np.radians(d)), 0])) for d in four_d],
                      tex(r"\text{length }2", POLAR, 40).move_to(self.fp(2.0, 90) + np.array([1.05, 0.15, 0])))
        self.lw = 1.0
        b.pop(FadeOut(self.power_stuff), FadeIn(title), FadeIn(n0), FadeIn(a72), FadeIn(rays), FadeIn(dots), FadeIn(pent), FadeIn(arcs), self.show("floor"))
        b.go(0.07, 0.2, LaggedStart(*[Indicate(m, color=INK, scale_factor=1.6) for m in dots], lag_ratio=0.3))
        b.go(0.34, 0.16, FadeIn(n1), LaggedStart(*[FadeIn(m) for m in names], lag_ratio=0.35))
        b.go(0.54, 0.16, FadeIn(n2), Create(wrap))
        b.go(0.74, 0.08, FadeOut(dots), FadeOut(rays), FadeOut(pent), FadeOut(arcs), FadeOut(a72), FadeOut(names), FadeOut(wrap))
        self.lw = 2.0
        b.go(0.82, 0.12, FadeIn(four), FadeIn(n3), FadeIn(n4))
        self.roots_stuff = VGroup(title, n0, n1, n2, n3, n4, four)

    def principal(self, t):
        b = Shots(self, t)
        self.lw = 2.0
        O = self.proj(0, 0)
        title = self.card_title("The principal root", POLAR)
        p0 = self.card_line(MathTex(r"w=2i:\ |w|=2,\ \operatorname{Arg} w=90^\circ", font_size=42, color=POLAR), 0)
        p1 = self.card_line(MathTex(r"\sqrt{2}\ \text{at}\ 90^\circ/2=45^\circ", font_size=46, color=POLAR), 1.2)
        p2 = self.card_line(MathTex(r"\sqrt{2}\,e^{i\,45^\circ}=1+i", font_size=48, color=INK), 2.3)
        p3 = self.card_line(MathTex(r"\sqrt{2}\,e^{i\,225^\circ}=-1-i", font_size=44, color=INK), 3.6)
        p4 = self.card_line(words("225 degrees is (90 + 360) / 2", MUTED, 30), 4.5)
        w = Dot(self.fp(2.0, 90), radius=0.14, color=INK).set_z_index(8)
        wl = tex(r"w=2i", CART, 46).move_to(self.fp(2.0, 90) + np.array([0.9, 0.2, 0]))
        wray = Line(O, self.fp(2.0, 90), color=POLAR, stroke_width=4, stroke_opacity=0.7)
        warc = Arc(radius=0.95, start_angle=0, angle=np.radians(90), arc_center=O, color=POLAR, stroke_width=5)
        ring = DashedVMobject(Circle(radius=RS * S2 / 2, arc_center=O, color=POLAR, stroke_width=2.5, stroke_opacity=0.6), num_dashes=40)
        pr, gr = self.fp(S2, 45), self.fp(S2, 225)
        prin = Dot(pr, radius=0.18, color=INK).set_z_index(8)                           # the principal root: emphasised
        prin_ring = Circle(radius=0.3, color=POLAR, stroke_width=4).move_to(pr).set_z_index(8)
        prin_l = VGroup(tex(r"1+i", CART, 46), tex(r"\sqrt{2}\ \text{at}\ 45^\circ", POLAR, 30)).arrange(DOWN, buff=0.08).move_to(pr + np.array([1.3, 0.62, 0]))
        ghost = Dot(gr, radius=0.14, color=INK).set_opacity(0.4).set_z_index(8)         # the other root: ghosted
        ghost_l = tex(r"-1-i", CART, 42).set_opacity(0.55).move_to(gr + np.array([-0.9, -0.2, 0]))
        harc = Arc(radius=0.65, start_angle=0, angle=np.radians(45), arc_center=O, color=INK, stroke_width=5)
        garc = DashedVMobject(Arc(radius=0.45, start_angle=0, angle=np.radians(225), arc_center=O, color=POLAR, stroke_width=4, stroke_opacity=0.6), num_dashes=22)
        tp = ValueTracker(0.0)                                                          # w travels to the root: length 2 to root two, angle 90 to 45
        tracer = always_redraw(lambda: Dot(self.fp(2.0 + (S2 - 2.0) * tp.get_value(), 90 - 45 * tp.get_value()), radius=0.11, color=INK).set_stroke(INK, 3).set_z_index(9))
        b.pop(FadeOut(self.roots_stuff), FadeIn(title), FadeIn(p0), FadeIn(w), FadeIn(wl), FadeIn(wray), FadeIn(warc), FadeIn(ring),
              FadeIn(prin), FadeIn(prin_ring), FadeIn(prin_l), FadeIn(ghost), FadeIn(ghost_l), FadeIn(harc))
        self.add(tracer)
        b.go(0.2, 0.28, tp.animate.set_value(1.0), rate_func=smooth)
        b.go(0.5, 0.1, FadeIn(p1), self.pulse(pr))
        b.go(0.6, 0.1, FadeIn(p2))
        b.go(0.74, 0.09, FadeIn(garc), FadeIn(p3))
        b.go(0.85, 0.04, FadeIn(p4))
        self.remove(tracer)
        pmap = VGroup(w, wl, wray, warc, ring, prin, prin_ring, prin_l, ghost, ghost_l, harc, garc)
        self.lw, self.kspan, self.home_on = 1.0, (-3, 3), True                          # set up the branch: the test point is -1, length 1
        self.ang.set_value(165.0)
        self.sig.set_value(-180.0)
        b.go(0.89, 0.08, FadeOut(pmap), self.phi.animate.set_value(PHI_TILT), self.show("stairs"), self.show("dot"), self.show("window"), self.show("seam"))
        self.principal_stuff = VGroup(title, p0, p1, p2, p3, p4)

    def branch(self, t):
        b = Shots(self, t)
        self.vis["arcs"].set_value(0.0)
        title = self.card_title("Branch of the cube root", POLAR)
        lab1 = MathTex(r"\text{name in the window}", font_size=36, color=POLAR)
        n1 = DecimalNumber(165, num_decimal_places=0, unit=r"^\circ", font_size=56, color=POLAR)
        lab2 = MathTex(r"\text{cube root: angle}\ \div 3", font_size=36, color=INK)
        n2 = DecimalNumber(55, num_decimal_places=0, unit=r"^\circ", font_size=56, color=INK)
        g1 = VGroup(lab1, n1).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        g2 = VGroup(lab2, n2).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        VGroup(g1, g2).arrange(DOWN, aligned_edge=LEFT, buff=0.6).move_to([CARD_X - CARD_W / 2 + 0.4, 1.4, 0], aligned_edge=LEFT)
        for g in (g1, g2):
            g.set_z_index(21)

        def name():                                                                     # the name the branch uses: the one in (sig, sig + 360]
            return wrap_to(self.ang.get_value(), self.sig.get_value())
        n1.add_updater(lambda m: m.set_value(round(name())).set_z_index(21))
        n2.add_updater(lambda m: m.set_value(round(name() / 3.0)).set_z_index(21))
        wtop = DecimalNumber(180, num_decimal_places=0, unit=r"^\circ", font_size=40, color=POLAR)
        wbot = DecimalNumber(-180, num_decimal_places=0, unit=r"^\circ", font_size=40, color=POLAR)
        wtop.add_updater(lambda m: m.set_value(round(self.sig.get_value() + 360)).move_to(self.proj(0, 0, hgt(self.sig.get_value()) + 1) + np.array([1.9, 0.0, 0]), aligned_edge=LEFT).set_z_index(9))
        wbot.add_updater(lambda m: m.set_value(round(self.sig.get_value())).move_to(self.proj(0, 0, hgt(self.sig.get_value())) + np.array([1.9, 0.0, 0]), aligned_edge=LEFT).set_z_index(9))
        fin = self.card_line(MathTex(r"(-1)^{1/3}=e^{i\,60^\circ}=\tfrac12+\tfrac{\sqrt{3}}{2}\,i", font_size=42, color=INK), 3.9)
        fin2 = self.card_line(words("seam on the positive real axis: continuous at -1", MUTED, 28), 4.9)

        def root_mark():                                                                # the cube root: angle = name / 3, on the same circle
            p, vv = self.fp(self.lw, name() / 3.0), self.v("arcs")
            ring = Circle(radius=0.26, color=INK, stroke_width=3.5, fill_opacity=0).move_to(p).set_stroke(opacity=vv)
            return VGroup(Dot(p, radius=0.13, color=POLAR).set_opacity(vv), ring).set_z_index(8)
        root = always_redraw(root_mark)
        self._prev = name()

        def watch(_):
            cur = name()
            if abs(cur - self._prev) > 180:
                self.last_jump = self.renderer.time
            self._prev = cur
        w = Mobject()
        w.add_updater(watch)
        self.add(w, root, wtop, wbot)
        b.pop(FadeOut(self.principal_stuff), FadeIn(title), FadeIn(g1), FadeIn(g2), self.show("arcs"))
        b.go(0.0, 0.12, self.sig.animate.set_value(-90.0), rate_func=smooth)           # the seam moves at once: down to the negative imaginary axis
        b.go(0.13, 0.1, self.sig.animate.set_value(-180.0), rate_func=smooth)          # and back to the negative real axis
        b.go(0.25, 0.1, self.ang.animate.set_value(195.0), rate_func=linear)           # the dot crosses the principal seam: the name jumps
        b.go(0.36, 0.07, self.ang.animate.set_value(165.0), rate_func=linear)
        b.go(0.43, 0.21, self.sig.animate.set_value(0.0), rate_func=smooth)            # slide the seam to the positive real axis: the window climbs the pole
        b.go(0.65, 0.09, self.ang.animate.set_value(195.0), rate_func=linear)          # the same crossing is now continuous
        b.go(0.75, 0.05, self.ang.animate.set_value(180.0), rate_func=linear)          # park on -1
        b.go(0.80, 0.1, FadeIn(fin), FadeIn(fin2))
        self.remove(w)
        for m in (n1, n2, wtop, wbot):
            m.clear_updaters()
