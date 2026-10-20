"""Visualizer Assistant spin on manim-hyperframes-matrix: three complex-number films for math-viz.
Pages follow the HF page contract (M0.1h: #root, data-duration, ONE paused timeline on window.__tl).
Every moving value is a pure function of the timeline time t (one tween 0..D whose onUpdate calls draw(t)),
so a seek from the site's clock, a render and a scrub all agree. Numbers are computed (Python or JS), never typed.
The site, not the page, owns play/pause: pages ship WITHOUT controls.js (see notes/INTEGRATION.md).
Beats are GSAP labels (tl.addLabel) so a reduced-motion reader can step between finished frames.
Readouts carry data-readout; the site mirrors them as text under the film (legible on a phone)."""
import cmath, json, math, os, sys
SKILL = "/home/box/agent-data/workflows/manim-hyperframes-matrix"
sys.path.insert(0, os.path.join(SKILL, "snippets", "hf"))
try:
    import hfkit  # read-only import: page(), esc()
except ImportError:
    hfkit = None

def local_page(D, body, js, css, tag, title, cite):
    """Same shell as hfkit.page when the matrix skill is not on this machine."""
    return (
        '<!doctype html><html lang="en"><head><meta charset="UTF-8"/>\n'
        '<link rel="stylesheet" href="shared/house.css"/><script src="shared/gsap.min.js"></script>\n'
        f'<style>\n{css}\n</style></head><body><div id="root" data-duration="{D}">'
        f'<div class="chrome-label"><span class="n">{tag}</span><span class="t">{title}</span></div>\n'
        f'{body}\n<div class="cite">{cite}</div></div>\n<script>\n'
        f'const tl=gsap.timeline({{paused:true}});tl.set({{}},{{}},{D});\n{js}\n'
        'window.__tl=tl;</script></body></html>'
    )

def page_of(D, body, js, css, tag, title, cite):
    if hfkit is not None:
        return hfkit.page(D, body, js=js, css=css, tag=tag, title=title, cite=cite, bar=False)
    return local_page(D, body, js, css, tag, title, cite)

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "pages")
os.makedirs(OUT, exist_ok=True)

# site teaching colours, both themes, from css/theme.css. The page style wins over house.css.
CSS = """
:root{--bg:#0d121c;--panel:#151c2b;--fg:#e9edf5;--muted:#a6b0c3;--line:#2b3650;--rule:#2b3650;--y:#e3b341;
 --cart:#62adf2;--polar:#ff9d5c;--input:#3fd0a0;--output:#e48fd2;--grid:#2b3650;--axis:#7480a0;--ghost:.35}
html[data-theme=light]{--bg:#f6f3ec;--panel:#ffffff;--fg:#1a2230;--muted:#515b6c;--line:#d8d2c4;--rule:#d8d2c4;
 --cart:#0b63ad;--polar:#a84300;--input:#006e53;--output:#9d3a8a;--grid:#e6e0d3;--axis:#757d8d;--y:#845b00}
.ln2{position:absolute;left:560px;width:684px;font:26px/1.25 "DV";white-space:nowrap;color:var(--fg)}
.ln2.m{color:var(--muted)} .ln2.s{font-size:24px}
.lbl{position:absolute;font:24px/1 "DVM";white-space:nowrap;color:var(--fg);transform:translate(-50%,-50%)}
.in{color:var(--input)} .out{color:var(--output)} .po{color:var(--polar)} .ca{color:var(--cart)}
svg.plane{position:absolute;left:0;top:0;width:1280px;height:720px;overflow:visible}
"""

def plane_svg(x0, y0, w, h, xmin, xmax, ymin, ymax, step=1.0, circle=None):
    X = lambda x: x0 + (x - xmin) / (xmax - xmin) * w
    Y = lambda y: y0 + (ymax - y) / (ymax - ymin) * h
    s = [f'<clipPath id="pc"><rect x="{x0}" y="{y0}" width="{w}" height="{h}"/></clipPath>',
         f'<g id="grid" clip-path="url(#pc)">']
    k = math.ceil(xmin / step)
    while k * step <= xmax + 1e-9:
        s.append(f'<line x1="{X(k*step):.1f}" y1="{y0}" x2="{X(k*step):.1f}" y2="{y0+h}" stroke="var(--grid)" stroke-width="1.5"/>'); k += 1
    k = math.ceil(ymin / step)
    while k * step <= ymax + 1e-9:
        s.append(f'<line x1="{x0}" y1="{Y(k*step):.1f}" x2="{x0+w}" y2="{Y(k*step):.1f}" stroke="var(--grid)" stroke-width="1.5"/>'); k += 1
    s.append(f'<line x1="{x0}" y1="{Y(0):.1f}" x2="{x0+w}" y2="{Y(0):.1f}" stroke="var(--axis)" stroke-width="2"/>')
    s.append(f'<line x1="{X(0):.1f}" y1="{y0}" x2="{X(0):.1f}" y2="{y0+h}" stroke="var(--axis)" stroke-width="2"/>')
    if circle:
        r = circle / (xmax - xmin) * w
        s.append(f'<circle cx="{X(0):.1f}" cy="{Y(0):.1f}" r="{r:.1f}" fill="none" stroke="var(--axis)" stroke-width="2" stroke-dasharray="6 6"/>')
    s.append('</g>')
    return "\n".join(s), X, Y

JS_COMMON = """
const PL=%s;
const X=x=>PL.x0+(x-PL.xmin)/(PL.xmax-PL.xmin)*PL.w, Y=y=>PL.y0+(PL.ymax-y)/(PL.ymax-PL.ymin)*PL.h, U=PL.w/(PL.xmax-PL.xmin);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), ramp=(t,a,b)=>clamp((t-a)/(b-a),0,1), ease=u=>u*u*(3-2*u);
const $=id=>document.getElementById(id);
const op=(id,v)=>{const e=$(id); if(!e) return; e.style.opacity=String(Math.round(v*1000)/1000); e.classList.toggle('off', v<0.04);};
const num=(v,d=3)=>{let r=Math.round(v*Math.pow(10,d))/Math.pow(10,d); if(Object.is(r,-0)||Math.abs(r)<Math.pow(10,-d)/2) r=0; let s=r.toFixed(d); if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\\.$/,''); return s.replace('-','\\u2212');};
const deg=a=>num(a*180/Math.PI,1)+'\\u00b0';
const cz=(re,im,d=3)=>{const a=num(re,d), b=num(Math.abs(im),d), neg=im<0&&b!=='0'; const ip=b==='1'?'i':b+'i';
  if(b==='0') return a; if(a==='0') return (neg?'\\u2212':'')+ip; return a+(neg?' \\u2212 ':' + ')+ip;};
const setLine=(id,x1,y1,x2,y2)=>{const e=$(id); e.setAttribute('x1',X(x1)); e.setAttribute('y1',Y(y1)); e.setAttribute('x2',X(x2)); e.setAttribute('y2',Y(y2));};
const setDot=(id,x,y)=>{const e=$(id); e.setAttribute('cx',X(x)); e.setAttribute('cy',Y(y));};
const setLbl=(id,x,y,dx,dy)=>{const e=$(id); if(!e) return; const pad=window.__planePad; if(document.documentElement.dataset.layout==='portrait'&&pad){e.style.left=((X(x)+dx-pad.vx)/pad.vw*100)+'%'; e.style.top=((Y(y)+dy-pad.vy)/pad.vh*100)+'%';}else{e.style.left=(X(x)+dx)+'px'; e.style.top=(Y(y)+dy)+'px';}};
const arc=(id,r,a0,a1)=>{const e=$(id); if(Math.abs(a1-a0)<1e-6){e.setAttribute('d','');return;} const n=Math.max(2,Math.ceil(Math.abs(a1-a0)/0.05)); let d='';
  for(let k=0;k<=n;k++){const a=a0+(a1-a0)*k/n; d+=(k?'L':'M')+X(r*Math.cos(a)).toFixed(1)+' '+Y(r*Math.sin(a)).toFixed(1);} e.setAttribute('d',d);};
const txt=(id,s)=>{const e=$(id); if(e.textContent!==s) e.textContent=s;};
"""

def finish(dur, labels, draw_js):
    """one tween 0..D drives draw(t); beats are labels. Returns the page's timeline js."""
    lab = "".join(f"tl.addLabel({json.dumps(n)},{t});" for n, t in labels)
    return (f"{draw_js}\nconst T={{t:0}};tl.to(T,{{t:{dur},duration:{dur},ease:'none',onUpdate:()=>draw(T.t)}},0);{lab}"
            f"draw({dur});window.__beats={json.dumps([t for _, t in labels])};"
            "window.__shownT=Number(document.getElementById('root').dataset.duration)||0;"
            "const __draw=draw;draw=function(t){window.__shownT=t;__draw(t)};"
            "window.__redraw=function(){__draw(window.__shownT)};"
            "if(window.__filmFit)window.__filmFit(PL);")

def esc(text):
    if hfkit is not None:
        return hfkit.esc(text)
    return (str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

def ln(id_, y, text="", cls="", ro=False):
    return f'<div id="{id_}" class="ln2 {cls}" style="top:{y}px"{" data-readout" if ro else ""}>{esc(text)}</div>'

# ---------------------------------------------------------------- A. multiply: turn, then stretch
def film_multiply():
    z = complex(math.sqrt(3), 1); w = complex(1, 1); zw = z * w
    rz, az = abs(z), cmath.phase(z); rw, aw = abs(w), cmath.phase(w)
    PL = dict(x0=40, y0=80, w=470, h=460, xmin=-1.0, xmax=3.3, ymin=-0.9, ymax=3.3)
    grid, X, Y = plane_svg(**PL)
    D = 10.0
    svg = f'''<svg class="plane" viewBox="0 0 1280 720">{grid}
<path id="aZ" fill="none" stroke="var(--polar)" stroke-width="3"/>
<path id="aW" fill="none" stroke="var(--polar)" stroke-width="3" stroke-dasharray="7 6"/>
<line id="vW" stroke="var(--input)" stroke-width="3" stroke-dasharray="10 7" stroke-linecap="round"/>
<line id="vZ" stroke="var(--input)" stroke-width="4" stroke-linecap="round"/>
<line id="vM" stroke="var(--output)" stroke-width="5" stroke-linecap="round"/>
<circle id="dW" r="8" fill="var(--input)"/><circle id="dZ" r="8" fill="var(--input)"/><circle id="dM" r="10" fill="var(--output)"/>
<circle id="ring" r="16" fill="none" stroke="var(--output)" stroke-width="3"/></svg>'''
    f = lambda v: f"{v:.3f}".rstrip("0").rstrip(".")
    body = svg + "".join([
        '<div id="lz" class="lbl in">z</div><div id="lw" class="lbl in">w</div><div id="lm" class="lbl out">zw</div>',
        ln("l1", 92, f"z = \u221a3 + i: length {f(rz)}, angle {f(math.degrees(az))}\u00b0", "in"),
        ln("l2", 132, f"w = 1 + i: length {f(rw)}, angle {f(math.degrees(aw))}\u00b0", "in"),
        f'<div data-xfade="step">{ln("s1", 200, "1. Turn by the angle of w", "po")}</div>',
        f'<div data-xfade="step">{ln("s2", 200, "2. Stretch by the length of w", "po")}</div>',
        f'<div data-xfade="step">{ln("s3", 200, "3. Land on zw", "out")}</div>',
        ln("r1", 248, "", "", True), ln("r2", 288, "", "", True),
        ln("f1", 370, f"zw = {f(zw.real)} + {f(zw.imag)}i", "out", True),
        ln("f2", 410, f"lengths multiply: {f(rz)} \u00d7 {f(rw)} = {f(abs(zw))}", "", True),
        ln("f3", 450, f"angles add: {f(math.degrees(az))}\u00b0 + {f(math.degrees(aw))}\u00b0 = {f(math.degrees(cmath.phase(zw)))}\u00b0", "", True),
        ln("f4", 494, "check: (\u221a3 + i)(1 + i) = (\u221a3 \u2212 1) + (\u221a3 + 1)i", "m s", True),
    ])
    js = JS_COMMON % json.dumps(PL) + f"""
const RZ={rz!r},AZ={az!r},RW={rw!r},AW={aw!r};
function draw(t){{
  const a=ramp(t,0,.6); op('grid',a);
  const zin=ramp(t,.3,.8), win=ramp(t,.8,1.3); op('vZ',zin); op('dZ',zin); op('lz',zin); op('l1',zin); op('vW',win); op('dW',win); op('lw',win); op('l2',win);
  setLine('vZ',0,0,RZ*Math.cos(AZ),RZ*Math.sin(AZ)); setDot('dZ',RZ*Math.cos(AZ),RZ*Math.sin(AZ)); setLbl('lz',RZ*Math.cos(AZ),RZ*Math.sin(AZ),26,14);
  setLine('vW',0,0,RW*Math.cos(AW),RW*Math.sin(AW)); setDot('dW',RW*Math.cos(AW),RW*Math.sin(AW)); setLbl('lw',RW*Math.cos(AW),RW*Math.sin(AW),-24,-22);
  const phi=AW*ease(ramp(t,1.9,4.3)), k=1+(RW-1)*ease(ramp(t,4.9,7.0));
  const ang=AZ+phi, r=RZ*k, mx=r*Math.cos(ang), my=r*Math.sin(ang), mv=ramp(t,1.6,1.9);
  op('vM',mv); op('dM',mv); op('lm',ramp(t,7.0,7.4)); setLine('vM',0,0,mx,my); setDot('dM',mx,my); setLbl('lm',mx,my,-34,-20);
  if(t>=1.6){{ op('vZ',zin*(1-.65*mv)); op('dZ',zin*(1-.65*mv)); }}
  // Radius follows |z|. A fraction of the view swallows the short arrows when zw is long.
  const span=Math.max(PL.xmax-PL.xmin,PL.ymax-PL.ymin); const px=v=>v*span/PL.w;
  const inner=Math.min(Math.max(0.34*RZ, px(22)), 0.48*RZ);
  const outer=Math.min(Math.max(0.62*RZ, inner+px(12)), 0.78*RZ);
  arc('aZ',inner,0,AZ); op('aZ',zin); arc('aW',outer,AZ,ang); op('aW',mv);
  const s1=ramp(t,1.5,1.8)*(1-ramp(t,4.5,4.8)), s2=ramp(t,4.5,4.8)*(1-ramp(t,7.1,7.4)), s3=ramp(t,7.1,7.4);
  op('s1',s1); op('s2',s2); op('s3',s3);
  txt('r1','angle: '+deg(AZ)+' + '+deg(phi)+' = '+deg(ang)); txt('r2','length: '+num(RZ)+' \\u00d7 '+num(k)+' = '+num(r));
  op('r1',mv); op('r2',mv);
  op('f1',ramp(t,7.5,7.9)); op('f2',ramp(t,7.9,8.3)); op('f3',ramp(t,8.3,8.7)); op('f4',ramp(t,8.7,9.1));
  const fl=ramp(t,9.1,9.4)*(1-ramp(t,9.6,10)); op('ring',fl); setDot('ring',mx,my);
}}
""" + finish(D, [("start", 0), ("turn", 1.6), ("stretch", 4.5), ("land", 7.1), ("end", D)], "")
    cite = "Howell & Mathews, Complex Analysis \u00a71.4, Equation (1.4.10). Figure 1.4.13 is the book pair, a special case. CC BY 4.0"
    return "multiply", hfkit.page(D, body, js=js, css=CSS, tag="\u00a71.4", title="Multiply: turn, then stretch", cite=cite, bar=False)

# ---------------------------------------------------------------- B. roots of unity: divide the staircase
def film_unity(n=5):
    PL = dict(x0=50, y0=80, w=460, h=460, xmin=-1.5, xmax=1.5, ymin=-1.5, ymax=1.5)
    grid, X, Y = plane_svg(**PL, step=0.5, circle=2.0)
    D = 1.4 + (n + 1) * 1.5 + 1.2
    dots = "".join(f'<circle id="d{k}" r="10" fill="var(--output)"/>' for k in range(n))
    svg = f'''<svg class="plane" viewBox="0 0 1280 720">{grid}
<path id="arc" fill="none" stroke="var(--polar)" stroke-width="3"/>
<line id="ray" stroke="var(--polar)" stroke-width="4" stroke-linecap="round"/>{dots}
<circle id="ring" r="18" fill="none" stroke="var(--output)" stroke-width="3"/></svg>'''
    labels = "".join(f'<div id="k{k}" class="lbl out">{k}</div>' for k in range(n))
    stairs = []
    for k in range(n + 1):
        lab = "0" if k == 0 else ("2\u03c0" if k == 1 else f"{2*k}\u03c0")
        stairs.append(f'<div id="st{k}" class="ln2 po" style="left:{600+k*104}px;width:96px;top:{450-k*44}px;'
                      f'border-top:3px solid var(--polar);padding-top:4px;text-align:center">{lab}</div>')
    body = svg + labels + "".join(stairs) + "".join([
        ln("l1", 92, f"z\u2075 = 1: the angles of 1 are 0, 2\u03c0, 4\u03c0, \u2026"),
        ln("l2", 132, f"Divide by {n}: the multiply turn, backwards.", "m"),
        f'<div data-xfade="end">{ln("r1", 180, "", "po", True)}</div>',
        ln("r2", 506, "", "out", True),
        f'<div data-xfade="end">{ln("e1", 180, f"Step {n} lands on step 0: only {n} roots.", "out", True)}</div>',
    ])
    js = JS_COMMON % json.dumps(PL) + f"""
const N={n}, T0=1.4, DT=1.5, SW=.9;
const ANG=k=>2*Math.PI*k/N;
const STEP=k=>k===0?'0':(k===1?'2\\u03c0':(2*k)+'\\u03c0');
function draw(t){{
  op('grid',ramp(t,0,.6)); op('l1',ramp(t,.2,.6)); op('l2',ramp(t,.5,.9));
  for(let k=0;k<=N;k++) op('st'+k,ramp(t,.6+k*.08,.9+k*.08)*(.45+.55*((t>=T0+k*DT&&t<T0+(k+1)*DT)?1:0)));
  let k=Math.floor((t-T0)/DT); k=clamp(k,-1,N); const u=k<0?0:ease(ramp(t-(T0+k*DT),0,SW));
  const a0=k<=0?0:ANG(k-1), a=k<0?0:a0+(ANG(k)-a0)*u;
  op('ray',k<0?0:1); op('arc',k<0?0:1); setLine('ray',0,0,Math.cos(a),Math.sin(a)); arc('arc',.35,0,a);
  for(let j=0;j<N;j++){{ const on=ramp(t,T0+j*DT+SW,T0+j*DT+SW+.25); op('d'+j,on); op('k'+j,on); setDot('d'+j,Math.cos(ANG(j)),Math.sin(ANG(j))); setLbl('k'+j,1.24*Math.cos(ANG(j)),1.24*Math.sin(ANG(j)),0,0); }}
  const end=ramp(t,T0+N*DT+SW,T0+N*DT+SW+.3);
  if(k>=0){{ txt('r1','k = '+k+': '+STEP(k)+' \\u00f7 '+N+' = '+deg(ANG(k)));
    const kk=k%N; txt('r2','root '+kk+': cos '+deg(ANG(kk))+' + i sin '+deg(ANG(kk))+' = '+cz(Math.cos(ANG(kk)),Math.sin(ANG(kk)))); }}
  op('r1',(k<0?0:ramp(t,T0,T0+.2))*(1-end)); op('e1',end); op('r2',k<0?0:ramp(t,T0+SW,T0+SW+.2));
  const fl=end*(1-ramp(t,D-.5,D)); op('ring',fl); setDot('ring',1,0);
}}
const D={D};
""" + finish(D, [("start", 0)] + [(f"k{k}", round(1.4 + k * 1.5, 3)) for k in range(n + 1)] + [("end", D)], "")
    cite = "Howell & Mathews, Complex Analysis \u00a71.5, Equation (1.5.5), roots of unity. CC BY 4.0"
    return "unity", hfkit.page(round(D, 3), body, js=js, css=CSS, tag="\u00a71.5", title=f"Roots of unity: divide the staircase by {n}", cite=cite, bar=False)

# ---------------------------------------------------------------- C. the orbit of 0: square, then slide
def orbit(c, steps):
    z = [0j]
    for _ in range(steps): z.append(z[-1] ** 2 + c)
    return z

def film_orbit():
    c1, n1 = 1j, 4
    c2, n2 = 0.3 + 0j, 13
    o1, o2 = orbit(c1, n1), orbit(c2, n2)
    PL = dict(x0=50, y0=80, w=460, h=460, xmin=-2.4, xmax=2.4, ymin=-2.4, ymax=2.4)
    grid, X, Y = plane_svg(**PL)
    A0, S1, R1 = 1.2, 1.1, 0.9          # phase 1: start, seconds per square, per slide
    P1 = A0 + n1 * (S1 + R1)
    B0 = P1 + 1.6                         # phase 2 start
    S2 = 0.42
    D = round(B0 + n2 * S2 + 1.6, 3)
    trail = "".join(f'<circle id="t{k}" r="7" fill="var(--cart)"/>' for k in range(max(n1, n2) + 1))
    svg = f'''<svg class="plane" viewBox="0 0 1280 720">{grid}
<g clip-path="url(#pc)">{trail}
<path id="sq" fill="none" stroke="var(--muted)" stroke-width="3" stroke-dasharray="7 6"/>
<line id="sl" stroke="var(--fg)" stroke-width="3" stroke-linecap="round"/>
<rect id="cm" width="18" height="18" fill="none" stroke="var(--fg)" stroke-width="3"/>
<circle id="plant" r="12" fill="none" stroke="var(--input)" stroke-width="3"/>
<circle id="cur" r="10" fill="var(--cart)"/></g></svg>'''
    body = svg + "".join([
        '<div id="lc" class="lbl">c</div>',
        ln("l1", 92, "f(z) = z\u00b2 + c: square, then slide by c"),
        f'<div data-xfade="c">{ln("c1", 132, "c = i  (Example 4.2.12)")}</div>',
        f'<div data-xfade="c">{ln("c2", 132, "c = 0.3  (Exercise 8: real, above 1/4)")}</div>',
    ] + [ln(f"o{j}", 182 + 40 * j, "", "", True) for j in range(6)] + [
        ln("st", 430, "", "m", True),
        f'<div data-xfade="v">{ln("v1", 490, "", "ca", True)}</div>',
        f'<div data-xfade="v">{ln("v2", 490, "", "po", True)}</div>',
    ])
    pts = lambda o: json.dumps([[z.real, z.imag] for z in o])
    js = JS_COMMON % json.dumps(PL) + f"""
const O1={pts(o1)}, O2={pts(o2)}, C1=[{c1.real},{c1.imag}], C2=[{c2.real},{c2.imag}];
const A0={A0},S1={S1},R1={R1},B0={B0},S2={S2},N1={n1},N2={n2},P1={P1};
const SUB=n=>String(n).split('').map(d=>'\\u2080\\u2081\\u2082\\u2083\\u2084\\u2085\\u2086\\u2087\\u2088\\u2089'[+d]).join('');
const sqp=(z,s)=>{{const r=Math.hypot(z[0],z[1]); if(r===0) return [0,0]; const th=Math.atan2(z[1],z[0]); const R=Math.pow(r,1+s), A=th*(1+s); return [R*Math.cos(A),R*Math.sin(A)];}};
function sqPath(z,s){{let d=''; const n=24; for(let k=0;k<=n;k++){{const p=sqp(z,s*k/n); d+=(k?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1);}} return d;}}
function phase(t){{ // which orbit, which step, and where inside the step
  if(t<B0-.8){{const k=clamp(Math.floor((t-A0)/(S1+R1)),-1,N1); const u=t-(A0+k*(S1+R1)); return {{O:O1,C:C1,N:N1,k,sq:ease(ramp(u,0,S1*.85)),sl:ease(ramp(u,S1,S1+R1*.85)),p:1}};}}
  const k=clamp(Math.floor((t-B0)/S2),-1,N2); const u=t-(B0+k*S2); return {{O:O2,C:C2,N:N2,k,sq:ease(ramp(u,0,S2*.5)),sl:ease(ramp(u,S2*.5,S2*.95)),p:2}};
}}
function draw(t){{
  op('grid',ramp(t,0,.6)); op('l1',ramp(t,.2,.6));
  const sw=ramp(t,B0-.8,B0-.4);
  op('c1',ramp(t,.4,.8)*(1-sw)); op('c2',sw);
  const P=phase(t), O=P.O, C=P.C, k=P.k, on=P.p===1?ramp(t,.4,.8):ramp(t,B0-.4,B0-.1);
  const rc=(P.p===1?C1:C2); const cmE=$('cm'); cmE.setAttribute('x',X(rc[0])-9); cmE.setAttribute('y',Y(rc[1])-9); op('cm',on); op('lc',on); setLbl('lc',rc[0],rc[1],22,22);
  const done=k<0?0:(k>=P.N?P.N:k);           // points z_0..z_done are on the trail
  for(let j=0;j<=Math.max(N1,N2);j++){{ const show=j<O.length&&j<=done?on:0; op('t'+j,show*.55); if(j<O.length) setDot('t'+j,O[j][0],O[j][1]); }}
  let cur=O[0], sqOp=0, slOp=0, status='';
  if(k>=0&&k<P.N){{ const z=O[k], q=sqp(z,P.sq), q2=sqp(z,1);
    if(P.sl<=0){{cur=q; sqOp=1; const r=Math.hypot(z[0],z[1]);
      status=r===0?'square: 0\\u00b2 = 0':'square: angle '+deg(Math.atan2(z[1],z[0]))+' \\u2192 '+deg(2*Math.atan2(z[1],z[0]))+', length '+num(r)+' \\u2192 '+num(r*r);}}
    else {{cur=[q2[0]+C[0]*P.sl,q2[1]+C[1]*P.sl]; slOp=1; status='slide by c = '+cz(C[0],C[1]);}}
    $('sq').setAttribute('d',sqPath(z,P.sq)); setLine('sl',q2[0],q2[1],cur[0],cur[1]);
  }} else if(k>=P.N){{ cur=O[P.N]; status='The square is the multiply turn.'; }}
  const col=P.p===1?'var(--cart)':'var(--polar)'; $('cur').setAttribute('fill',col); for(let j=0;j<=Math.max(N1,N2);j++) $('t'+j).setAttribute('fill',col);
  setDot('plant',0,0); op('plant',on);
  op('sq',sqOp*on); op('sl',slOp*on); setDot('cur',cur[0],cur[1]); op('cur',on);
  txt('st',status); op('st',status?on:0);
  const last=k<0?0:Math.min(k,P.N), first=Math.max(0,last-5);
  for(let j=0;j<6;j++){{ const i=first+j; if(i<=last){{ const z=O[i]; txt('o'+j,'z'+SUB(i)+' = '+cz(z[0],z[1])+',  |z'+SUB(i)+'| = '+num(Math.hypot(z[0],z[1]))); op('o'+j,on);}} else {{txt('o'+j,''); op('o'+j,0);}} }}
  const e1=ramp(t,P1+.1,P1+.5)*(1-sw), z2=O2[N2];
  txt('v1','The walk cycles: '+cz(O1[2][0],O1[2][1])+', '+cz(O1[3][0],O1[3][1])+', \\u2026 It stays.'); op('v1',e1);
  txt('v2','|z'+SUB(N2)+'| = '+num(Math.hypot(z2[0],z2[1]))+': the walk leaves.'); op('v2',ramp(t,B0+N2*S2+.1,B0+N2*S2+.5));
}}
""" + finish(D, [("start", 0)] + [(f"i{k}", round(A0 + k * (S1 + R1), 3)) for k in range(n1)] + [("cycle", round(P1 + .1, 3)), ("c03", round(B0, 3)), ("leaves", round(B0 + n2 * S2 + .1, 3)), ("end", D)], "")
    cite = "Howell & Mathews \u00a74.2: Theorem 4.2.11, Example 4.2.12, Exercise 8. CC BY 4.0"
    return "orbit", hfkit.page(D, body, js=js, css=CSS, tag="\u00a74.2", title="The orbit of 0: square, then slide", cite=cite, bar=False)

def write_page(name, html):
    html = html.replace(
        '<script src="shared/gsap.min.js"></script>',
        '<script src="shared/gsap.min.js"></script><script src="shared/fit.js"></script>',
        1)
    p = os.path.join(OUT, f"film-{name}.html")
    open(p, "w", encoding="utf-8").write(html)
    print(p, len(html))

# Live films: draw(t) reads window.__filmParams (the station's current numbers) and a step quantum.
# The four below are generated here. The original three stay in films/ and gain the same hook in draw.

def live_css():
    return CSS

def live_finish(D, labels, draw_js):
    return finish(D, labels, draw_js)

def film_seam():
    PL = dict(x0=40, y0=80, w=470, h=460, xmin=-2.2, xmax=2.2, ymin=-2.2, ymax=2.2)
    grid, X, Y = plane_svg(**PL, step=1.0, circle=2.0)
    D = 8.0
    svg = f'''<svg class="plane" viewBox="0 0 1280 720">{grid}
<line id="seam" stroke="var(--axis)" stroke-width="2" stroke-dasharray="7 6"/>
<path id="arc" fill="none" stroke="var(--polar)" stroke-width="4"/>
<line id="ray" stroke="var(--polar)" stroke-width="4" stroke-linecap="round"/>
<line id="legx" stroke="var(--cart)" stroke-width="3" stroke-dasharray="6 5"/>
<line id="legy" stroke="var(--cart)" stroke-width="3" stroke-dasharray="6 5"/>
<circle id="dot" r="9" fill="var(--input)"/></svg>'''
    body = svg + "".join([
        '<div id="lz" class="lbl in">z</div>',
        ln("l1", 92, "Walk once around 0. The point is smooth. Arg z jumps."),
        ln("r1", 150, "", "po", True),
        ln("r2", 198, "", "ca", True),
        ln("r3", 246, "", "", True),
        ln("r4", 320, "", "out", True),
    ])
    js = JS_COMMON.replace("%s", json.dumps(PL)) + r"""
const D=8;
function pw(){
  const P=window.__filmParams||{};
  const r=Number.isFinite(+P.r)?Math.min(2,Math.max(0.35,+P.r)):1.15;
  const step=Math.min(1,Math.max(1e-5,Number.isFinite(+P.step)?+P.step:0.2));
  return {r, step};
}
function argOf(a){ let x=a; const T=2*Math.PI; x=((x+Math.PI)%T+T)%T-Math.PI; return x===-Math.PI?Math.PI:x; }
function draw(t){
  const {r, step}=pw();
  op('grid',1); op('l1',1);
  setLine('seam',-2.1,0,0,0);
  const target=(t/D)*2*Math.PI;
  const n=Math.floor(target/step+1e-9);
  const ang=n*step;
  const x=r*Math.cos(ang), y=r*Math.sin(ang);
  const home=argOf(ang);
  setLine('ray',0,0,x,y); setLine('legx',0,0,x,0); setLine('legy',x,0,x,y);
  setDot('dot',x,y); setLbl('lz',x,y,16,-16);
  arc('arc',0.55,0,home);
  const jumped=Math.abs(ang-home)>0.2;
  txt('r1','angle walked: '+deg(ang));
  txt('r2','Arg z = '+deg(home)+(jumped?'  (jumped by a full turn)':''));
  txt('r3','step '+num(step,5));
  txt('r4', jumped?'The point did not jump. The name did.':'Still on the home step.');
  op('r1',1); op('r2',1); op('r3',1); op('r4',1);
}
""" + live_finish(D, [("start", 0), ("seam", 3.9), ("jump", 4.2), ("end", D)], "")
    cite = "Howell &amp; Mathews, Complex Analysis &sect;1.4, Arg z. CC BY 4.0. PDF number not checked."
    return "seam", page_of(D, body, js, live_css(), "§1.4", "Arg z jumps at the seam", cite)

def film_settle():
    PL = dict(x0=40, y0=70, w=480, h=470, xmin=-1.4, xmax=1.4, ymin=-1.4, ymax=1.4)
    grid, X, Y = plane_svg(**PL, step=0.5, circle=1.0)
    D = 8.0
    dots = "".join(f'<circle id="d{k}" r="7" fill="var(--cart)"/>' for k in range(9))
    svg = f'''<svg class="plane" viewBox="0 0 1280 720">{grid}
<circle id="unit" r="1" fill="none"/>{dots}
<circle id="cur" r="10" fill="var(--input)"/></svg>'''
    # unit circle is drawn in JS so the radius is in plane units
    body = svg + "".join([
        ln("l1", 88, "z^n. Watch the terms land."),
        ln("r1", 140, "", "in", True),
        ln("r2", 188, "", "", True),
        ln("r3", 236, "", "out", True),
        ln("r4", 300, "", "", True),
    ])
    js = JS_COMMON.replace("%s", json.dumps(PL)) + r"""
const D=8;
function pw(){
  const P=window.__filmParams||{};
  const re=Number.isFinite(+P.re)?+P.re:0.5;
  const im=Number.isFinite(+P.im)?+P.im:0.25;
  const step=Math.min(1,Math.max(1e-5,Number.isFinite(+P.step)?+P.step:0.25));
  return {re, im, step};
}
function draw(t){
  const {re, im, step}=pw();
  op('grid',1); op('l1',1);
  const uR=U; $('unit').setAttribute('cx',X(0)); $('unit').setAttribute('cy',Y(0)); $('unit').setAttribute('r',uR);
  $('unit').setAttribute('fill','none'); $('unit').setAttribute('stroke','var(--axis)'); $('unit').setAttribute('stroke-dasharray','6 6');
  const target=Math.min(8,(t/D)*8);
  const shown=Math.floor(target/step+1e-9)*step;
  let x=1, y=0;
  const pts=[[1,0]];
  for(let k=1;k<=8;k++){ const nx=x*re-y*im, ny=x*im+y*re; x=nx; y=ny; pts.push([x,y]); }
  for(let k=0;k<=8;k++){
    const on=k<=shown+1e-9?1:0;
    op('d'+k,on*0.85); setDot('d'+k,pts[k][0],pts[k][1]);
  }
  const i=Math.min(8,Math.floor(shown));
  const f=Math.min(1,shown-i);
  const cx=pts[i][0]+(pts[Math.min(8,i+1)][0]-pts[i][0])*f;
  const cy=pts[i][1]+(pts[Math.min(8,i+1)][1]-pts[i][1])*f;
  setDot('cur',cx,cy); op('cur',1);
  const mod=Math.hypot(re,im);
  txt('r1','z = '+cz(re,im)+',  |z| = '+num(mod));
  txt('r2','terms shown: '+num(shown,4)+'    step '+num(step,5));
  txt('r3','|z^n| = '+num(Math.hypot(cx,cy)));
  txt('r4', mod<1-1e-6?'Settles at 0. The modulus is |z|^n.':(Math.abs(mod-1)<1e-6?'Stays. The modulus is 1, so it does not settle.':'Leaves. The modulus is bigger than 1.'));
  op('r1',1); op('r2',1); op('r3',1); op('r4',1);
}
""" + live_finish(D, [("start", 0), ("mid", 4), ("end", D)], "")
    cite = "Howell &amp; Mathews, Complex Analysis &sect;4.1, Definition 4.1.1. CC BY 4.0. PDF Definition 4.1."
    return "settle", page_of(D, body, js, live_css(), "§4.1", "A sequence settles, or it does not", cite)

def film_approach():
    PL = dict(x0=36, y0=78, w=420, h=420, xmin=-1.8, xmax=1.8, ymin=-1.8, ymax=1.8)
    grid, X, Y = plane_svg(**PL, step=0.5)
    D = 8.0
    svg = f'''<svg class="plane" viewBox="0 0 1280 720">{grid}
<path id="trail" fill="none" stroke="var(--input)" stroke-width="3"/>
<path id="image" fill="none" stroke="var(--output)" stroke-width="3"/>
<circle id="dot" r="9" fill="var(--input)"/>
<circle id="w" r="9" fill="var(--output)"/></svg>'''
    body = svg + "".join([
        ln("l1", 86, "Walk toward 0. g(z) = z^2 / |z|^2."),
        ln("r1", 140, "", "in", True),
        ln("r2", 188, "", "out", True),
        ln("r3", 250, "", "", True),
        ln("r4", 310, "", "po", True),
    ])
    js = JS_COMMON.replace("%s", json.dumps(PL)) + r"""
const D=8, TMIN=0.012, R0=1.6;
function pw(){
  const P=window.__filmParams||{};
  const path=(P.path==='vertical'||P.path==='parabola'||P.path==='spiral')?P.path:'line';
  const m=Number.isFinite(+P.m)?+P.m:1;
  const step=Math.min(1,Math.max(1e-5,Number.isFinite(+P.step)?+P.step:0.02));
  return {path, m, step};
}
function at(path, m, s){
  if(path==='vertical') return {re:0, im:R0*s};
  if(path==='parabola'){ const x=1.2*s; return {re:x, im:x*x}; }
  if(path==='spiral'){ const th=4*Math.log(1/s); return {re:R0*s*Math.cos(th), im:R0*s*Math.sin(th)}; }
  const a=Math.atan(m); return {re:R0*s*Math.cos(a), im:R0*s*Math.sin(a)};
}
function draw(t){
  const {path, m, step}=pw();
  op('grid',1); op('l1',1);
  const u=t/D;
  const span=1-TMIN;
  const raw=1-u*span;
  const s=Math.max(TMIN, quant(raw, step));
  function quant(v, q){ const n=Math.round((1-v)/q); return Math.max(TMIN, 1-n*q); }
  let dZ='', dW='';
  const N=48;
  for(let k=0;k<=N;k++){
    const sk=Math.max(TMIN, 1-(1-s)*k/N);
    const z=at(path,m,sk);
    dZ+=(k?'L':'M')+X(z.re).toFixed(1)+' '+Y(z.im).toFixed(1);
    const r2=z.re*z.re+z.im*z.im;
    const wr=(z.re*z.re-z.im*z.im)/r2, wi=(2*z.re*z.im)/r2;
    dW+=(k?'L':'M')+X(wr*0.9).toFixed(1)+' '+Y(wi*0.9).toFixed(1);
  }
  $('trail').setAttribute('d',dZ); $('image').setAttribute('d',dW);
  const z=at(path,m,s);
  const r2=z.re*z.re+z.im*z.im;
  const wr=(z.re*z.re-z.im*z.im)/r2, wi=(2*z.re*z.im)/r2;
  setDot('dot',z.re,z.im); setDot('w',wr*0.9,wi*0.9);
  op('dot',1); op('w',1); op('trail',1); op('image',1);
  txt('r1','z = '+cz(z.re,z.im)+'   along '+path);
  txt('r2','g(z) = '+cz(wr,wi));
  txt('r3','step '+num(step,5)+'    distance parameter '+num(s,5));
  txt('r4', path==='spiral'?'The angle never settles, so g(z) keeps turning.':'A straight arrival locks g(z) to one direction.');
  op('r1',1); op('r2',1); op('r3',1); op('r4',1);
}
""" + live_finish(D, [("start", 0), ("near", 6.5), ("end", D)], "")
    cite = "Howell &amp; Mathews, Complex Analysis &sect;2.3, Definition 2.3.1. CC BY 4.0. PDF number not checked."
    return "approach", page_of(D, body, js, live_css(), "§2.3", "Every direction must agree", cite)

def film_newton_walk():
    PL = dict(x0=40, y0=80, w=470, h=460, xmin=-1.3, xmax=1.3, ymin=-0.4, ymax=1.6)
    grid, X, Y = plane_svg(**PL, step=0.5)
    D = 8.0
    dots = "".join(f'<circle id="d{k}" r="8" fill="var(--input)"/>' for k in range(6))
    svg = f'''<svg class="plane" viewBox="0 0 1280 720">{grid}
<circle id="root" r="11" fill="var(--cart)"/>{dots}
<circle id="cur" r="10" fill="var(--output)"/></svg>'''
    body = svg + "".join([
        '<div id="lr" class="lbl ca">i</div>',
        ln("l1", 88, "z^2 + 1. One Newton step, then again."),
        ln("r1", 140, "", "in", True),
        ln("r2", 188, "", "", True),
        ln("r3", 250, "", "ca", True),
        ln("r4", 310, "", "", True),
    ])
    js = JS_COMMON.replace("%s", json.dumps(PL)) + r"""
const D=8;
function pw(){
  const P=window.__filmParams||{};
  const re=Number.isFinite(+P.re)?+P.re:0.25;
  const im=Number.isFinite(+P.im)?+P.im:0.25;
  const step=Math.min(1,Math.max(1e-5,Number.isFinite(+P.step)?+P.step:0.2));
  return {re, im, step};
}
function newton(z){
  const d=z.re*z.re+z.im*z.im;
  if(d<1e-16) return {re:z.re, im:z.im};
  const inv={re:z.re/d, im:-z.im/d};
  return {re:(z.re-inv.re)/2, im:(z.im-inv.im)/2};
}
function draw(t){
  const {re, im, step}=pw();
  op('grid',1); op('l1',1);
  const pts=[{re:re, im:im}];
  for(let k=0;k<5;k++) pts.push(newton(pts[k]));
  const target=Math.min(5,(t/D)*5);
  const shown=Math.floor(target/step+1e-9)*step;
  const i=Math.min(5,Math.floor(shown));
  const f=Math.min(1, Math.max(0, shown-i));
  const a=pts[i], b=pts[Math.min(5,i+1)];
  const cx=a.re+(b.re-a.re)*f, cy=a.im+(b.im-a.im)*f;
  for(let k=0;k<=5;k++){ op('d'+k, k<=i?1:0); setDot('d'+k, pts[k].re, pts[k].im); }
  setDot('root',0,1); setLbl('lr',0,1,16,-14); op('root',1); op('lr',1);
  setDot('cur',cx,cy); op('cur',1);
  txt('r1','start '+cz(re,im));
  txt('r2','step '+num(step,5)+'    through step '+num(shown,4));
  txt('r3','now '+cz(cx,cy));
  const landed=Math.hypot(cx, cy-1)<0.02;
  txt('r4', landed?'Landed on i.':'Not landed yet.');
  op('r1',1); op('r2',1); op('r3',1); op('r4',1);
}
""" + live_finish(D, [("start", 0), ("step1", 1.6), ("land", 6.4), ("end", D)], "")
    cite = "Howell &amp; Mathews, Complex Analysis &sect;4.2, Example 4.2.1. CC BY 4.0. PDF Example 4.7."
    return "newton-walk", page_of(D, body, js, live_css(), "§4.2", "Five Newton steps land on i", cite)

if hfkit is not None:
    for name, html in (film_multiply(), film_unity(), film_orbit()):
        write_page(name, html)
for name, html in (film_seam(), film_settle(), film_approach(), film_newton_walk()):
    write_page(name, html)
