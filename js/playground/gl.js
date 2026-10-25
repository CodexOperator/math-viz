// WebGL2 fractal. One bake writes colour in RGB and escape time in A.
// Each frame of the roll only composites that texture, so the iteration is not repeated.

import { newtonRoots } from './field.js';

const VERT = `#version 300 es
layout(location=0) in vec2 a;
out vec2 vUv;
void main() {
  vUv = a * 0.5 + 0.5;
  gl_Position = vec4(a, 0.0, 1.0);
}`;

const BAKE = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform vec4 u_win;
uniform vec4 u_win2;
uniform vec2 u_c;
uniform vec2 u_r0;
uniform vec2 u_r1;
uniform vec2 u_r2;
uniform float u_iter;
uniform float u_iter2;
uniform float u_d;
uniform int u_kind;
uniform int u_colour;
uniform int u_split;
uniform int u_diary;
uniform vec3 u_navy;
uniform vec3 u_cart;
uniform vec3 u_polar;
uniform vec3 u_input;
uniform vec3 u_output;
out vec4 o;
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cpow(vec2 z, float n) {
  vec2 r = vec2(1.0, 0.0);
  for (int i = 0; i < 8; i++) { if (float(i) >= n) break; r = cmul(r, z); }
  return r;
}
vec2 cdiv(vec2 a, vec2 b) {
  float m = dot(b, b);
  if (m < 1e-20) return vec2(1e8, 0.0);
  return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / m;
}
float smooth01(float e0, float e1, float x) {
  float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return u*u*(3.0 - 2.0*u);
}
vec3 pal(float t) {
  float x = clamp(t, 0.0, 1.0);
  vec3 c = mix(u_cart, u_polar, smooth01(0.0, 0.48, x));
  c = mix(c, u_output, smooth01(0.32, 0.88, x));
  return c;
}
vec2 coord(vec2 frag, vec2 res, vec4 win) {
  vec2 p = frag / res;
  float aspect = res.x / res.y;
  return vec2(win.x + (p.x - 0.5) * win.z * aspect, win.y + (p.y - 0.5) * win.z);
}
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 res = u_res;
  int kind = u_kind;
  vec2 c = u_c;
  vec4 win = u_win;
  bool right = false;
  bool ring = false;
  float budget = u_iter;
  bool juliaSide = false;
  if (u_diary == 1) {
    kind = 2;
    ring = true;
  } else if (u_diary == 5) {
    // The cascade. The left pane is the real orbit, drawn by the overlay
    // on a still field. The right pane is the Julia set, on its own budget,
    // so a pinch of the set of c cannot retint it.
    bool second = frag.x >= u_res.x * 0.5;
    res.x *= 0.5;
    if (second) {
      frag.x -= u_res.x * 0.5;
      kind = 0;
      win = u_win2;
      juliaSide = true;
      budget = u_iter2 > 0.0 ? u_iter2 : u_iter;
    } else {
      o = vec4(u_navy, 1.0);
      return;
    }
  } else if (u_diary == 2 || u_diary == 3 || u_diary == 4) {
    // 4 is the bulbs picture: side by side, and no bake ring. The overlay
    // draws that ring with the period numerals. A second ring sat under it.
    bool side = u_diary != 3;
    bool second = side ? frag.x >= u_res.x * 0.5 : frag.y < u_res.y * 0.5;
    if (side) {
      res.x *= 0.5;
      if (second) frag.x -= u_res.x * 0.5;
    } else {
      float midY = u_res.y * 0.5;
      res.y = midY;
      if (!second) frag.y -= midY;
    }
    if (second) {
      kind = 0;
      win = u_win2;
      juliaSide = true;
      budget = u_iter2 > 0.0 ? u_iter2 : u_iter;
    } else {
      kind = 2;
      ring = u_diary != 4;
    }
  } else {
    right = u_split == 1 && frag.x >= res.x * 0.5;
    if (right) {
      frag.x -= res.x * 0.5;
      res.x *= 0.5;
      kind = 2;
      win = u_win2;
    } else if (u_split == 1) {
      res.x *= 0.5;
    }
  }
  vec2 z0 = coord(frag, res, win);
  vec2 z = z0;
  if (kind == 2) { c = z0; z = vec2(0.0); }
  float bail = u_colour == 1 ? 2.0 : u_colour == 2 ? 64.0 : 256.0;
  if (kind == 3) bail = 1e8;
  float trap = min(length(z), min(abs(z.x), abs(z.y)));
  float nStop = 0.0;
  bool escaped = false;
  int root = -1;
  vec2 last = z;
  for (int i = 0; i < 4096; i++) {
    // The Julia pane names u_iter2 itself. A local copy of the budget was
    // enough for the count, and the driver still rewrote that pane when the
    // other uniform changed.
    if (juliaSide) {
      if (float(i) >= u_iter2) break;
    } else if (float(i) >= u_iter) break;
    float n = float(i + 1);
    if (kind == 3) {
      vec2 z2 = cmul(z, z);
      vec2 z3 = cmul(z2, z);
      vec2 cm1 = vec2(c.x - 1.0, c.y);
      vec2 dp = vec2(3.0 * z2.x + cm1.x, 3.0 * z2.y + cm1.y);
      vec2 pz = z3 + cmul(cm1, z) - c;
      z = z - cdiv(pz, dp);
      trap = min(trap, min(length(z), min(abs(z.x), abs(z.y))));
      float d0 = dot(z - u_r0, z - u_r0);
      float d1 = dot(z - u_r1, z - u_r1);
      float d2 = dot(z - u_r2, z - u_r2);
      float md = d0; root = 0;
      if (d1 < md) { md = d1; root = 1; }
      if (d2 < md) { md = d2; root = 2; }
      last = z;
      if (md < 1e-12) { nStop = n; break; }
    } else {
      vec2 zd = u_d < 2.5 ? cmul(z, z) : cpow(z, u_d);
      z = zd + c;
      trap = min(trap, min(length(z), min(abs(z.x), abs(z.y))));
      last = z;
      if (length(z) > bail) { nStop = n; escaped = true; break; }
    }
    nStop = n;
    if (length(z) > 1e8) { escaped = true; break; }
  }
  if (nStop < 1.0) nStop = juliaSide ? u_iter2 : u_iter;
  float mag = max(length(last), 1e-8);
  float nu = nStop;
  if (escaped && mag > 1.0) nu = nStop + 1.0 - log(log(mag)) / log(max(u_d, 2.0));
  vec3 rgb;
  if (u_colour == 3) {
    vec3 hue = root == 0 ? u_cart : root == 1 ? u_polar : root == 2 ? u_output : u_navy;
    float v = clamp(1.0 - nStop / 40.0, 0.0, 1.0);
    rgb = mix(u_navy, hue, 0.28 + 0.72 * v);
  } else if (u_colour == 2) {
    rgb = mix(u_navy, u_input, exp(-8.0 * min(trap, 8.0)));
  } else if (!escaped && kind != 3) {
    rgb = mix(u_navy, u_cart, 0.82);
  } else if (u_colour == 1) {
    rgb = pal(mod(nStop, 16.0) / 16.0);
  } else {
    rgb = pal(clamp(nu / 32.0, 0.0, 1.0));
  }
  if (right || ring) {
    vec2 delta = (z0 - u_c) / win.z * vec2(res.y, res.y);
    float dist = length(delta);
    if (dist > 5.0 && dist < 9.0) { rgb = u_polar; nStop = 0.0; }
  }
  o = vec4(rgb, clamp(1.0 - exp(-max(nStop - 1.0, 0.0) / 8.0), 0.0, 1.0));
}`;

const SHADE = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_reveal;
uniform float u_reduced;
in vec2 vUv;
out vec4 o;
float smooth01(float e0, float e1, float x) {
  float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return u*u*(3.0 - 2.0*u);
}
void main() {
  vec4 t = texture(u_tex, vUv);
  float n = t.a;
  float a = u_reduced > 0.5 ? clamp(u_reveal, 0.0, 1.0) : (u_reveal <= 0.0 ? 0.0 : smooth01(n * 0.72, n * 0.72 + 0.22, u_reveal));
  o = vec4(t.rgb * a, a);
}`;

const LAT = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform vec2 u_c;
uniform vec2 u_r0;
uniform vec2 u_r1;
uniform vec2 u_r2;
uniform float u_iter;
uniform float u_d;
uniform int u_kind;
uniform int u_colour;
uniform vec3 u_navy;
uniform vec3 u_cart;
uniform vec3 u_polar;
uniform vec3 u_input;
uniform vec3 u_output;
out vec4 o;
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cpow(vec2 z, float n) {
  vec2 r = vec2(1.0, 0.0);
  for (int i = 0; i < 8; i++) { if (float(i) >= n) break; r = cmul(r, z); }
  return r;
}
vec2 cdiv(vec2 a, vec2 b) {
  float m = dot(b, b);
  if (m < 1e-20) return vec2(1e8, 0.0);
  return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / m;
}
float smooth01(float e0, float e1, float x) {
  float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return u*u*(3.0 - 2.0*u);
}
vec3 pal(float t) {
  float x = clamp(t, 0.0, 1.0);
  vec3 c = mix(u_cart, u_polar, smooth01(0.0, 0.48, x));
  c = mix(c, u_output, smooth01(0.32, 0.88, x));
  return c;
}
void main() {
  vec2 p = gl_FragCoord.xy / u_res;
  float theta = p.x * 6.28318530718 - 3.14159265359;
  float phi = (1.0 - p.y) * 3.14159265359;
  float y = cos(phi);
  float s = sin(phi);
  vec3 sp = vec3(s * cos(theta), y, s * sin(theta));
  float den = 1.0 - sp.y;
  vec2 z0 = den > 1e-4 ? vec2(sp.x / den, sp.z / den) : vec2(1e6, 0.0);
  int kind = u_kind;
  vec2 c = u_c;
  vec2 z = z0;
  if (kind == 2) { c = z0; z = vec2(0.0); }
  float bail = u_colour == 1 ? 2.0 : u_colour == 2 ? 64.0 : 256.0;
  if (kind == 3) bail = 1e8;
  float trap = min(length(z), min(abs(z.x), abs(z.y)));
  float nStop = 0.0;
  bool escaped = false;
  int root = -1;
  vec2 last = z;
  for (int i = 0; i < 4096; i++) {
    if (float(i) >= u_iter) break;
    float n = float(i + 1);
    if (kind == 3) {
      vec2 z2 = cmul(z, z);
      vec2 z3 = cmul(z2, z);
      vec2 cm1 = vec2(c.x - 1.0, c.y);
      vec2 dp = vec2(3.0 * z2.x + cm1.x, 3.0 * z2.y + cm1.y);
      z = z - cdiv(z3 + cmul(cm1, z) - c, dp);
      trap = min(trap, min(length(z), min(abs(z.x), abs(z.y))));
      float md = dot(z - u_r0, z - u_r0); root = 0;
      float d1 = dot(z - u_r1, z - u_r1);
      float d2 = dot(z - u_r2, z - u_r2);
      if (d1 < md) { md = d1; root = 1; }
      if (d2 < md) { md = d2; root = 2; }
      last = z;
      if (md < 1e-12) { nStop = n; break; }
    } else {
      vec2 zd = u_d < 2.5 ? cmul(z, z) : cpow(z, u_d);
      z = zd + c;
      trap = min(trap, min(length(z), min(abs(z.x), abs(z.y))));
      last = z;
      if (length(z) > bail) { nStop = n; escaped = true; break; }
    }
    nStop = n;
  }
  if (nStop < 1.0) nStop = u_iter;
  float mag = max(length(last), 1e-8);
  float nu = nStop;
  if (escaped && mag > 1.0) nu = nStop + 1.0 - log(log(mag)) / log(max(u_d, 2.0));
  vec3 rgb;
  if (u_colour == 3) {
    vec3 hue = root == 0 ? u_cart : root == 1 ? u_polar : root == 2 ? u_output : u_navy;
    float v = clamp(1.0 - nStop / 40.0, 0.0, 1.0);
    rgb = mix(u_navy, hue, 0.28 + 0.72 * v);
  } else if (u_colour == 2) {
    rgb = mix(u_navy, u_input, exp(-8.0 * min(trap, 8.0)));
  } else if (!escaped && kind != 3) {
    rgb = mix(u_navy, u_cart, 0.82);
  } else if (u_colour == 1) {
    rgb = pal(mod(nStop, 16.0) / 16.0);
  } else {
    rgb = pal(clamp(nu / 32.0, 0.0, 1.0));
  }
  o = vec4(rgb, clamp(1.0 - exp(-max(nStop - 1.0, 0.0) / 8.0), 0.0, 1.0));
}`;

// Basins of z^d − 1, and on the split the set of c for z^d + c. Degree 4 and 5
// stripe the extra roots: one root, two inks. The power pane stays smooth.
const UNITY = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform vec4 u_win;
uniform vec4 u_win2;
uniform vec2 u_c;
uniform float u_iter;
uniform float u_d;
uniform int u_colour;
uniform int u_split;
uniform int u_stack;
uniform vec3 u_navy;
uniform vec3 u_cart;
uniform vec3 u_polar;
uniform vec3 u_input;
uniform vec3 u_output;
out vec4 o;
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cpow(vec2 z, float n) {
  vec2 r = vec2(1.0, 0.0);
  for (int i = 0; i < 8; i++) { if (float(i) >= n) break; r = cmul(r, z); }
  return r;
}
vec2 cdiv(vec2 a, vec2 b) {
  float m = dot(b, b);
  if (m < 1e-20) return vec2(1e8, 0.0);
  return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / m;
}
float smooth01(float e0, float e1, float x) {
  float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return u*u*(3.0 - 2.0*u);
}
vec3 pal(float t) {
  float x = clamp(t, 0.0, 1.0);
  vec3 c = mix(u_cart, u_polar, smooth01(0.0, 0.48, x));
  c = mix(c, u_output, smooth01(0.32, 0.88, x));
  return c;
}
vec2 coord(vec2 frag, vec2 res, vec4 win) {
  vec2 p = frag / res;
  float aspect = res.x / res.y;
  return vec2(win.x + (p.x - 0.5) * win.z * aspect, win.y + (p.y - 0.5) * win.z);
}
vec2 unityRoot(int k) {
  float th = 6.28318530718 * float(k) / u_d;
  return vec2(cos(th), sin(th));
}
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 res = u_res;
  vec4 win = u_win;
  bool power = false;
  if (u_stack == 1) {
    float midY = u_res.y * 0.5;
    power = frag.y < midY;
    res.y = midY;
    if (!power) frag.y -= midY;
  } else if (u_split == 1) {
    power = frag.x >= u_res.x * 0.5;
    res.x *= 0.5;
    if (power) frag.x -= u_res.x * 0.5;
  }
  if (power) win = u_win2;
  vec2 z0 = coord(frag, res, win);
  vec2 z = power ? vec2(0.0) : z0;
  vec2 c = power ? z0 : u_c;
  float trap = min(length(z), min(abs(z.x), abs(z.y)));
  float nStop = 0.0;
  bool escaped = false;
  int root = -1;
  vec2 last = z;
  float deg = max(u_d, 3.0);
  for (int i = 0; i < 4096; i++) {
    if (float(i) >= u_iter) break;
    float n = float(i + 1);
    if (power) {
      vec2 zd = deg < 2.5 ? cmul(z, z) : cpow(z, deg);
      z = zd + c;
      trap = min(trap, min(length(z), min(abs(z.x), abs(z.y))));
      last = z;
      if (length(z) > 256.0) { nStop = n; escaped = true; break; }
    } else {
      vec2 zm = cpow(z, deg - 1.0);
      vec2 dp = zm * deg;
      vec2 zd = cmul(zm, z);
      z = z - cdiv(zd - vec2(1.0, 0.0), dp);
      trap = min(trap, min(length(z), min(abs(z.x), abs(z.y))));
      float best = 1e20;
      root = -1;
      for (int k = 0; k < 5; k++) {
        if (float(k) >= deg) break;
        vec2 r = unityRoot(k);
        float d2 = dot(z - r, z - r);
        if (d2 < best) { best = d2; root = k; }
      }
      last = z;
      if (best < 1e-12 || length(z) > 1e6) { nStop = n; break; }
    }
    nStop = n;
    if (length(z) > 1e8) { escaped = true; break; }
  }
  if (nStop < 1.0) nStop = u_iter;
  float mag = max(length(last), 1e-8);
  float nu = nStop;
  if (escaped && mag > 1.0) nu = nStop + 1.0 - log(log(mag)) / log(max(deg, 2.0));
  vec3 rgb;
  if (power) {
    if (!escaped) rgb = mix(u_navy, u_cart, 0.82);
    else rgb = pal(clamp(nu / 32.0, 0.0, 1.0));
    vec2 delta = (z0 - u_c) / win.z * vec2(res.y, res.y);
    float dist = length(delta);
    if (dist > 5.0 && dist < 9.0) { rgb = u_polar; nStop = 0.0; }
  } else if (u_colour == 2) {
    rgb = mix(u_navy, u_input, exp(-8.0 * min(trap, 8.0)));
  } else {
    float period = max(8.0, floor(min(res.x, res.y) / 8.0 + 0.5));
    float phase = mod(floor((frag.x + frag.y) / period), 2.0);
    vec3 hue = u_navy;
    if (root == 0) hue = u_cart;
    else if (root == 1) hue = u_polar;
    else if (root == 2) hue = u_output;
    else if (root == 3) hue = phase < 0.5 ? u_cart : u_polar;
    else if (root >= 4) hue = phase < 0.5 ? u_polar : u_output;
    float v = clamp(1.0 - nStop / 40.0, 0.0, 1.0);
    rgb = mix(u_navy, hue, 0.28 + 0.72 * v);
  }
  o = vec4(rgb, clamp(1.0 - exp(-max(nStop - 1.0, 0.0) / 8.0), 0.0, 1.0));
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function program(gl, vs, fs) {
  const a = compile(gl, gl.VERTEX_SHADER, vs);
  const b = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!a || !b) return null;
  const p = gl.createProgram();
  gl.attachShader(p, a);
  gl.attachShader(p, b);
  gl.linkProgram(p);
  gl.deleteShader(a);
  gl.deleteShader(b);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

const KIND = { julia: 0, poly: 1, mandel: 2, newton: 3 };
const COLOUR = { smooth: 0, escape: 1, trap: 2, basin: 3, curvature: 0 };

function rgb(c) {
  return [c[0] / 255, c[1] / 255, c[2] / 255];
}

function inkOf(data) {
  if (!data) return false;
  for (let i = 0; i < data.length; i += 16) {
    if ((data[i] + data[i + 1] + data[i + 2]) > 24 || data[i + 3] > 8) return true;
  }
  return false;
}

// Any throw in here is a missing or broken GPU. The page paints on the CPU.
export function createGL(canvas) {
  try { return createGLNow(canvas); } catch { return null; }
}

function createGLNow(canvas) {
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true,
    });
  } catch { gl = null; }
  if (!gl) return null;
  const fail = () => {
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return null;
  };
  const prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!prec || prec.precision < 16) return fail();
  const bakeProg = program(gl, VERT, BAKE);
  const shadeProg = program(gl, VERT, SHADE);
  const latProg = program(gl, VERT, LAT);
  const unityProg = program(gl, VERT, UNITY);
  if (!bakeProg || !shadeProg || !latProg) return fail();
  let renderer = '';
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
  } catch { renderer = ''; }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  let tex = null;
  let fbo = null;
  let bw = 0;
  let bh = 0;
  let latTex = null;
  let latFbo = null;
  let lw = 0;
  let lh = 0;

  function alloc(w, h) {
    // The same size is already a good framebuffer. A bare return is undefined, and the probe
    // would count every frame after the first as a failure, so the tier would stay 0.
    if (tex && w === bw && h === bh) return true;
    if (tex) gl.deleteTexture(tex);
    if (fbo) gl.deleteFramebuffer(fbo);
    bw = w; bh = h;
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
    return true;
  }

  function allocLat(w, h) {
    if (latTex && w === lw && h === lh) return true;
    if (latTex) gl.deleteTexture(latTex);
    if (latFbo) gl.deleteFramebuffer(latFbo);
    lw = w; lh = h;
    latTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, latTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    latFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, latFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, latTex, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  }

  function uniforms(prog, spec) {
    const ink = spec.ink;
    gl.uniform2f(gl.getUniformLocation(prog, 'u_c'), spec.c[0], spec.c[1]);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_r0'), spec.roots[0][0], spec.roots[0][1]);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_r1'), spec.roots[1][0], spec.roots[1][1]);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_r2'), spec.roots[2][0], spec.roots[2][1]);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_iter'), spec.iter);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_iter2'), spec.iter2 > 0 ? spec.iter2 : spec.iter);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_d'), spec.d);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_kind'), spec.kind);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_colour'), spec.colour);
    const put = (name, col) => gl.uniform3f(gl.getUniformLocation(prog, name), col[0], col[1], col[2]);
    put('u_navy', rgb(ink.navy));
    put('u_cart', rgb(ink.cart));
    put('u_polar', rgb(ink.polar));
    put('u_input', rgb(ink.input));
    put('u_output', rgb(ink.output));
  }

  function drawQuad() {
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    renderer,
    probe() {
      try { return this.probeNow(); } catch { return 1e9; }
    },
    probeNow() {
      const w = 512;
      const h = 512;
      if (!alloc(w, h)) return 1e9;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, w, h);
      gl.useProgram(bakeProg);
      gl.uniform2f(gl.getUniformLocation(bakeProg, 'u_res'), w, h);
      gl.uniform4f(gl.getUniformLocation(bakeProg, 'u_win'), 0, 0, 3.2, 0);
      gl.uniform4f(gl.getUniformLocation(bakeProg, 'u_win2'), 0, 0, 3.2, 0);
      gl.uniform1i(gl.getUniformLocation(bakeProg, 'u_split'), 0);
      gl.uniform1i(gl.getUniformLocation(bakeProg, 'u_diary'), 0);
      uniforms(bakeProg, {
        c: [-0.75, 0], roots: [[1, 0], [-0.5, 0.866], [-0.5, -0.866]], iter: 256, d: 2, kind: 0, colour: 0,
        ink: { navy: [13, 18, 28], cart: [98, 173, 242], polar: [255, 157, 92], input: [63, 208, 160], output: [228, 143, 210] },
      });
      const t0 = performance.now();
      drawQuad();
      gl.finish();
      return performance.now() - t0;
    },
    bake(spec) {
      try { return this.bakeNow(spec); } catch { return false; }
    },
    bakeNow(spec) {
      const w = spec.w | 0;
      const h = spec.h | 0;
      if (!alloc(w, h)) return false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      // The roll composites with blending. A later bake must replace the
      // texture. Left on, a low escape-alpha blends with the previous
      // picture and the Julia pane brightens when the other pane is pinched.
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, w, h);
      gl.useProgram(bakeProg);
      gl.uniform2f(gl.getUniformLocation(bakeProg, 'u_res'), w, h);
      gl.uniform4f(gl.getUniformLocation(bakeProg, 'u_win'), spec.win[0], spec.win[1], spec.win[2], 0);
      gl.uniform4f(gl.getUniformLocation(bakeProg, 'u_win2'), spec.win2[0], spec.win2[1], spec.win2[2], 0);
      gl.uniform1i(gl.getUniformLocation(bakeProg, 'u_split'), spec.split ? 1 : 0);
      gl.uniform1i(gl.getUniformLocation(bakeProg, 'u_diary'), spec.diary | 0);
      uniforms(bakeProg, spec);
      drawQuad();
      return true;
    },
    bakeUnity(spec) {
      try { return this.bakeUnityNow(spec); } catch { return false; }
    },
    bakeUnityNow(spec) {
      if (!unityProg) return false;
      const w = spec.w | 0;
      const h = spec.h | 0;
      if (!alloc(w, h)) return false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, w, h);
      gl.useProgram(unityProg);
      gl.uniform2f(gl.getUniformLocation(unityProg, 'u_res'), w, h);
      gl.uniform4f(gl.getUniformLocation(unityProg, 'u_win'), spec.win[0], spec.win[1], spec.win[2], 0);
      gl.uniform4f(gl.getUniformLocation(unityProg, 'u_win2'), spec.win2[0], spec.win2[1], spec.win2[2], 0);
      gl.uniform2f(gl.getUniformLocation(unityProg, 'u_c'), spec.c[0], spec.c[1]);
      gl.uniform1f(gl.getUniformLocation(unityProg, 'u_iter'), spec.iter);
      gl.uniform1f(gl.getUniformLocation(unityProg, 'u_d'), spec.d);
      gl.uniform1i(gl.getUniformLocation(unityProg, 'u_colour'), spec.colour);
      gl.uniform1i(gl.getUniformLocation(unityProg, 'u_split'), spec.split ? 1 : 0);
      gl.uniform1i(gl.getUniformLocation(unityProg, 'u_stack'), spec.stack ? 1 : 0);
      const ink = spec.ink;
      const put = (name, col) => gl.uniform3f(gl.getUniformLocation(unityProg, name), col[0], col[1], col[2]);
      put('u_navy', rgb(ink.navy));
      put('u_cart', rgb(ink.cart));
      put('u_polar', rgb(ink.polar));
      put('u_input', rgb(ink.input));
      put('u_output', rgb(ink.output));
      drawQuad();
      return true;
    },
    bakeLat(spec) {
      try { return this.bakeLatNow(spec); } catch { return null; }
    },
    bakeLatNow(spec) {
      const w = spec.w | 0;
      const h = spec.h | 0;
      if (!allocLat(w, h)) return null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, latFbo);
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, w, h);
      gl.useProgram(latProg);
      gl.uniform2f(gl.getUniformLocation(latProg, 'u_res'), w, h);
      uniforms(latProg, spec);
      drawQuad();
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return { data: buf, w, h };
    },
    upload(rgba, w, h) {
      if (!alloc(w, h)) return false;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      return true;
    },
    read() {
      if (!tex || !bw || !bh) return null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      const data = new Uint8Array(bw * bh * 4);
      gl.readPixels(0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return { data, w: bw, h: bh };
    },
    shade(reveal, reduced, w, h) {
      try { return this.shadeNow(reveal, reduced, w, h); } catch { return false; }
    },
    shadeNow(reveal, reduced, w, h) {
      const dw = w || canvas.width;
      const dh = h || canvas.height;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, dw, dh);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, dw, dh);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
      gl.useProgram(shadeProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(shadeProg, 'u_tex'), 0);
      gl.uniform1f(gl.getUniformLocation(shadeProg, 'u_reveal'), reveal);
      gl.uniform1f(gl.getUniformLocation(shadeProg, 'u_reduced'), reduced ? 1 : 0);
      drawQuad();
      return true;
    },
    // The viewport sits at the bottom of the drawing buffer. readPixels is bottom-up.
    readScreen(w, h) {
      try {
        const dw = w | 0;
        const dh = h | 0;
        if (dw < 1 || dh < 1) return null;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const raw = new Uint8Array(dw * dh * 4);
        gl.readPixels(0, 0, dw, dh, gl.RGBA, gl.UNSIGNED_BYTE, raw);
        const out = new Uint8ClampedArray(dw * dh * 4);
        const row = dw * 4;
        for (let y = 0; y < dh; y++) {
          out.set(raw.subarray((dh - 1 - y) * row, (dh - y) * row), y * row);
        }
        return { data: out, w: dw, h: dh };
      } catch { return null; }
    },
    // 'draw' copies the WebGL canvas. 'read' is for a browser that leaves that
    // copy blank (iOS Safari, a canvas that never joined the document). 'dead'
    // means the GPU picture has no pixels either way, so the page bakes on the CPU.
    compositeMode() {
      try {
        const w = 32;
        const h = 32;
        const baked = this.bake({
          w, h,
          win: [0, 0, 3.2], win2: [0, 0, 3.2],
          c: [-0.75, 0],
          roots: [[1, 0], [-0.5, 0.866], [-0.5, -0.866]],
          iter: 48, d: 2, kind: 0, colour: 0, split: false, diary: 0,
          ink: {
            navy: [13, 18, 28], cart: [98, 173, 242], polar: [255, 157, 92],
            input: [63, 208, 160], output: [228, 143, 210],
          },
        });
        if (baked !== true) return 'dead';
        if (this.shade(1, true, w, h) === false) return 'dead';
        const read = this.readScreen(w, h);
        const readInk = read ? inkOf(read.data) : false;
        const c2 = document.createElement('canvas');
        c2.width = w;
        c2.height = h;
        const ctx = c2.getContext('2d');
        if (!ctx) return readInk ? 'read' : 'dead';
        ctx.drawImage(canvas, 0, Math.max(0, canvas.height - h), w, h, 0, 0, w, h);
        const drawn = inkOf(ctx.getImageData(0, 0, w, h).data);
        if (drawn) return 'draw';
        if (readInk) return 'read';
        return 'dead';
      } catch { return 'dead'; }
    },
    dispose() {
      if (tex) gl.deleteTexture(tex);
      if (fbo) gl.deleteFramebuffer(fbo);
      if (latTex) gl.deleteTexture(latTex);
      if (latFbo) gl.deleteFramebuffer(latFbo);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    },
  };
}

function juliaPane(comp) {
  const k = comp.view.kind;
  if (k === 'diary' || k === 'split-diary' || k === 'twins' || k === 'bulbs' || k === 'cascade' || k === 'rays' || k === 'pole' || k === 'join') {
    const j = comp.view.julia;
    const span = (k === 'twins' || k === 'bulbs' || k === 'cascade' || k === 'rays' || k === 'pole' || k === 'join') ? 2.6 : 3.2;
    if (j && Number.isFinite(j.cx) && Number.isFinite(j.cy) && Number.isFinite(j.span)) return [j.cx, j.cy, j.span];
    return [0, 0, span];
  }
  return [-0.6, 0, 3.2];
}

export function glSpec(comp, ink, iter, w, h, iter2) {
  const kind = KIND[comp.map.kind] ?? 0;
  const colour = COLOUR[comp.colour] ?? 0;
  const roots = comp.map.kind === 'newton' ? newtonRoots(comp.map.c) : [[1, 0], [-0.5, 0.8660254], [-0.5, -0.8660254]];
  const view = comp.view.kind;
  const diary = view === 'diary' ? 1
    : (view === 'cascade' || view === 'pole') ? 5
    : (view === 'bulbs' || view === 'rays' || view === 'join') ? 4
    : (view === 'split-diary' || view === 'twins') ? 2
    : 0;
  return {
    w, h, ink, iter, iter2: iter2 > 0 ? iter2 : iter, kind, colour, d: comp.map.d, c: comp.map.c,
    roots,
    win: [comp.view.window.cx, comp.view.window.cy, comp.view.window.span],
    win2: juliaPane(comp),
    split: view === 'split-param',
    diary,
  };
}
