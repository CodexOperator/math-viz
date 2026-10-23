// Sphere and height, in the same Three.js build the rest of the site uses.
// The renderer paints only when asked. WebXR is entered from here and left again.

import { curvatureInk, chartPoint } from './field.js';
import { starField } from './stars.js';
import { planeFromSphere, orbitOnSphere } from './sphere.js';
import { requestImmersive, bindSelect } from './xr.js';

const NAVY = 0x0d121c;

export async function createScene(host, hooks) {
  const THREE = await import('../../vendor/three/three.module.min.js');
  const canvas = document.createElement('canvas');
  canvas.className = 'pg-three';
  host.append(canvas);
  // Transparent inline, so the sheet sits in the same void as the plane. An opaque
  // clear was crushing the night sky to black and boxing the surface in a card.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', premultipliedAlpha: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  canvas.style.background = 'transparent';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 80);
  const group = new THREE.Group();
  scene.add(group);
  const stars = starPoints(THREE, hooks.seed || 1);
  scene.add(stars);
  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(0.6, 1.4, 0.4);
  scene.add(amb, dir);
  let mesh = null;
  let material = null;
  let pole = null;
  let orbitLine = null;
  let marker = null;
  let mode = 'none';
  let flipped = false;
  let session = null;
  // Teaching colours. Dark-theme tokens until the page hands over the live ones.
  let colours = { polar: 0xff9d5c, walk: 0x3fd0a0 };
  let placed = false;
  let hitSource = null;
  let sky = NAVY;
  let skyNight = true;
  let presentedMode = '';
  const clock = { reveal: 1, reduced: false };
  stars.visible = false;

  function applyClear() {
    const immersive = presentedMode === 'immersive-vr';
    renderer.setClearColor(immersive ? sky : 0x000000, immersive ? 1 : 0);
    stars.visible = immersive;
  }

  function resize() {
    const w = host.clientWidth || 2;
    const h = host.clientHeight || 2;
    renderer.setPixelRatio(session ? 0.5 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    if (session) return;
    if (mode === 'sphere') placeSphereCamera();
    else if (mode === 'height') frameHeightCamera();
  }

  // North is +Y and it has to read as the top of the ball, including in a narrow pane.
  // Distance follows the tighter field of view so the whole sphere stays in frame.
  function placeSphereCamera() {
    camera.up.set(0, 1, 0);
    const aspect = Math.max(0.2, camera.aspect || 1);
    const vFov = camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const radius = 1.22;
    const dist = Math.max(
      radius / Math.sin(vFov / 2),
      radius / Math.sin(Math.max(0.08, hFov / 2)),
    );
    const lift = dist * 0.22;
    const z = Math.sqrt(Math.max(dist * dist - lift * lift, 0.25));
    camera.position.set(0, lift, z);
    camera.lookAt(0, 0, 0);
  }

  // High enough to read as the same window as the plane, close enough that the sheet
  // fills the pane. A grazing fit left a ribbon and hid the distance.
  function frameHeightCamera() {
    camera.up.set(0, 1, 0);
    const hw = (mesh && mesh.userData && mesh.userData.halfW) || 1.1;
    const hd = (mesh && mesh.userData && mesh.userData.halfD) || 1.1;
    const maxH = (mesh && mesh.userData && mesh.userData.maxH) || 0.8;
    const pitch = 1.15;
    const targetY = maxH * 0.4;
    const scratch = frameHeightCamera.v || (frameHeightCamera.v = new THREE.Vector3());
    const signs = frameHeightCamera.s || (frameHeightCamera.s = [-1, 1]);
    let lo = 0.4;
    let hi = 16;
    for (let i = 0; i < 16; i++) {
      const dist = (lo + hi) * 0.5;
      camera.position.set(0, targetY + Math.sin(pitch) * dist, Math.cos(pitch) * dist);
      camera.lookAt(0, targetY, 0);
      camera.updateMatrixWorld(true);
      let ndc = 0;
      let behind = false;
      for (const sx of signs) {
        for (const sz of signs) {
          for (const y of [0, maxH]) {
            scratch.set(sx * hw, y, sz * hd).project(camera);
            if (!Number.isFinite(scratch.x) || scratch.z < -1 || scratch.z > 1) behind = true;
            else ndc = Math.max(ndc, Math.abs(scratch.x), Math.abs(scratch.y));
          }
        }
      }
      if (behind || ndc > 0.9) lo = dist;
      else hi = dist;
    }
    camera.position.set(0, targetY + Math.sin(pitch) * hi, Math.cos(pitch) * hi);
    camera.lookAt(0, targetY, 0);
  }

  function frameCamera() {
    if (mode === 'height') frameHeightCamera();
    else placeSphereCamera();
  }

  function setInk(next) {
    if (!next) return;
    colours = { polar: next.polar >>> 0, walk: next.walk >>> 0 };
    if (pole && pole.material && pole.material.color) pole.material.color.setHex(colours.polar);
  }

  function resetTurn() {
    flipped = false;
    group.quaternion.identity();
    group.position.set(0, 0, 0);
    group.scale.setScalar(1);
  }

  function dropObject(obj) {
    if (!obj) return;
    group.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }

  function dropOrbit() {
    dropObject(orbitLine);
    dropObject(marker);
    orbitLine = null;
    marker = null;
  }

  function dropMesh() {
    dropOrbit();
    dropObject(pole);
    pole = null;
    if (!mesh) return;
    group.remove(mesh);
    mesh.geometry.dispose();
    if (mesh.material) {
      const m = mesh.material;
      if (m.uniforms && m.uniforms.uMap && m.uniforms.uMap.value) m.uniforms.uMap.value.dispose();
      m.dispose();
    }
    mesh = null;
    material = null;
  }

  function addPole() {
    dropObject(pole);
    pole = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 18, 14),
      new THREE.MeshBasicMaterial({ color: colours.polar }),
    );
    pole.position.set(0, 1.045, 0);
    pole.renderOrder = 3;
    group.add(pole);
  }

  function shaderMat(tex) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uMap: { value: tex },
        uReveal: { value: clock.reveal },
        uReduced: { value: clock.reduced ? 1 : 0 },
      },
      vertexShader: `
        varying vec3 vPos;
        varying vec3 vN;
        void main() {
          vPos = position;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uMap;
        uniform float uReveal;
        uniform float uReduced;
        varying vec3 vPos;
        varying vec3 vN;
        float smooth01(float e0, float e1, float x) {
          float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
          return u*u*(3.0 - 2.0*u);
        }
        void main() {
          vec3 p = normalize(vPos);
          float phi = acos(clamp(p.y, -1.0, 1.0));
          float theta = atan(p.z, p.x);
          float u = fract(theta / 6.28318530718 + 0.5);
          float v = 1.0 - phi / 3.14159265359;
          vec4 t = texture2D(uMap, vec2(u, v));
          float n = t.a;
          float a = uReduced > 0.5 ? clamp(uReveal, 0.0, 1.0) : (uReveal <= 0.0 ? 0.0 : smooth01(n * 0.72, n * 0.72 + 0.22, uReveal));
          float lam = 0.42 + 0.58 * clamp(dot(normalize(vN), normalize(vec3(0.35, 0.85, 0.25))), 0.0, 1.0);
          gl_FragColor = vec4(t.rgb * lam * a, a);
        }`,
    });
  }

  function showSphere(image) {
    dropMesh();
    mode = 'sphere';
    const tex = new THREE.DataTexture(image.data, image.w, image.h, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.flipY = false;
    tex.colorSpace = THREE.NoColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    material = shaderMat(tex);
    mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), material);
    group.add(mesh);
    addPole();
    frameCamera();
    resize();
  }

  function showOrbit(result) {
    dropOrbit();
    if (!result || !result.points || result.points.length < 2) {
      render();
      return;
    }
    const left = result.reason === 'escape' || result.reason === 'cusp';
    const samples = orbitOnSphere(result.points, left);
    if (samples.length < 2) {
      render();
      return;
    }
    const pos = new Float32Array(samples.length * 3);
    const col = new Float32Array(samples.length * 3);
    const walk = [
      ((colours.walk >> 16) & 255) / 255,
      ((colours.walk >> 8) & 255) / 255,
      (colours.walk & 255) / 255,
    ];
    const poleCol = [
      ((colours.polar >> 16) & 255) / 255,
      ((colours.polar >> 8) & 255) / 255,
      (colours.polar & 255) / 255,
    ];
    samples.forEach((p, i) => {
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      const tone = p.pole ? poleCol : walk;
      col[i * 3] = tone[0];
      col[i * 3 + 1] = tone[1];
      col[i * 3 + 2] = tone[2];
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    orbitLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
    orbitLine.renderOrder = 2;
    group.add(orbitLine);
    const tip = samples[samples.length - 1];
    marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 10),
      new THREE.MeshBasicMaterial({ color: left ? colours.polar : colours.walk }),
    );
    marker.position.set(tip.x, tip.y, tip.z);
    marker.renderOrder = 3;
    group.add(marker);
    render();
  }

  function heightPoint(local) {
    const data = mesh && mesh.userData;
    const win = data && data.window;
    if (!data || !win || !(data.halfW > 0) || !(data.halfD > 0)) return null;
    if (Math.abs(local.x) > data.halfW * 1.12 || Math.abs(local.z) > data.halfD * 1.12) return null;
    if (data.chordal) {
      const nu = Math.max(-1, Math.min(1, local.x / data.halfW));
      const nv = Math.max(-1, Math.min(1, -local.z / data.halfD));
      const hit = chartPoint(nu, nv, data.span || win.span);
      return { re: hit.re, im: hit.im, pole: !!hit.pole };
    }
    if (Math.abs(local.x) > data.halfW * 1.04 || Math.abs(local.z) > data.halfD * 1.04) return null;
    const aspect = data.aspect || 1;
    return {
      re: win.cx + (local.x / (data.halfW * 2)) * win.span * aspect,
      im: win.cy - (local.z / (data.halfD * 2)) * win.span,
    };
  }

  function hitPlane(clientX, clientY) {
    if (!mesh || (mode !== 'sphere' && mode !== 'height')) return null;
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    mesh.updateWorldMatrix(true, false);
    if (mode === 'sphere') {
      const hits = ray.intersectObject(mesh, false);
      if (!hits.length) return null;
      const local = mesh.worldToLocal(hits[0].point.clone());
      return planeFromSphere(local.x, local.y, local.z);
    }
    const hits = ray.intersectObject(mesh, false);
    if (hits.length) {
      const onSurface = heightPoint(mesh.worldToLocal(hits[0].point.clone()));
      if (onSurface) return onSurface;
    }
    // A tap in the margin still names the point on the window, not a miss that flashes.
    const inv = mesh.matrixWorld.clone().invert();
    const origin = ray.ray.origin.clone().applyMatrix4(inv);
    const dir = ray.ray.direction.clone().transformDirection(inv);
    if (Math.abs(dir.y) < 1e-6) return null;
    const t = -origin.y / dir.y;
    if (t < 0) return null;
    return heightPoint(origin.add(dir.multiplyScalar(t)));
  }

  function showHeight(grid, ink, colour) {
    dropMesh();
    mode = 'height';
    const n = grid.w;
    const aspect = Number.isFinite(grid.aspect) && grid.aspect > 0.05 ? grid.aspect : 1;
    const depth = 2.2;
    const width = 2.2 * aspect;
    const geo = new THREE.PlaneGeometry(width, depth, n - 1, n - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const ns = new Float32Array(pos.count);
    const poles = new Float32Array(pos.count);
    const H = grid.curv;
    let maxH = 0;
    for (let i = 0; i < pos.count; i++) {
      const gy = Math.floor(i / n);
      const gx = i - gy * n;
      const src = gy * n + gx;
      const g = grid.G[src] || 0;
      const hgt = Math.min(g, 2) * 0.6;
      if (hgt > maxH) maxH = hgt;
      pos.setY(i, hgt);
      ns[i] = grid.nNorm[src] || 0;
      poles[i] = grid.pole && grid.pole[src] ? 1 : 0;
      let col;
      if (poles[i]) col = ink.polar;
      else if (colour === 'curvature' && H) col = curvatureInk(H.H[src] || 0, H.clamp, ink);
      else if (grid.rgb) col = [grid.rgb[src * 3], grid.rgb[src * 3 + 1], grid.rgb[src * 3 + 2]];
      else col = ink.cart;
      colors[i * 3] = (col[0] || 0) / 255;
      colors[i * 3 + 1] = (col[1] || 0) / 255;
      colors[i * 3 + 2] = (col[2] || 0) / 255;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aN', new THREE.BufferAttribute(ns, 1));
    geo.setAttribute('aPole', new THREE.BufferAttribute(poles, 1));
    geo.computeVertexNormals();
    const win = grid.window || (hooks.window ? hooks.window() : null);
    geo.userData = {
      chordal: !!grid.chordal,
      window: win,
      span: grid.span || (win && win.span) || 3.2,
      aspect,
      halfW: width / 2,
      halfD: depth / 2,
      maxH,
    };
    material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      vertexColors: true,
      uniforms: {
        uReveal: { value: clock.reveal },
        uReduced: { value: clock.reduced ? 1 : 0 },
      },
      vertexShader: `
        attribute float aN;
        attribute float aPole;
        varying float vN;
        varying float vPole;
        varying vec3 vCol;
        varying vec3 vNrm;
        void main() {
          vN = aN;
          vPole = aPole;
          vCol = color;
          vNrm = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uReveal;
        uniform float uReduced;
        varying float vN;
        varying float vPole;
        varying vec3 vCol;
        varying vec3 vNrm;
        float smooth01(float e0, float e1, float x) {
          float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
          return u*u*(3.0 - 2.0*u);
        }
        void main() {
          float a = uReduced > 0.5 ? clamp(uReveal, 0.0, 1.0) : (uReveal <= 0.0 ? 0.0 : smooth01(vN * 0.72, vN * 0.72 + 0.22, uReveal));
          float lam = 0.38 + 0.62 * clamp(dot(normalize(vNrm), normalize(vec3(0.3, 1.0, 0.35))), 0.0, 1.0);
          // The pole is a colour, not a lit surface. It has to match the plane's corners.
          float lit = mix(lam, 1.0, clamp(vPole, 0.0, 1.0));
          gl_FragColor = vec4(vCol * lit * a, a);
        }`,
    });
    mesh = new THREE.Mesh(geo, material);
    mesh.userData = geo.userData;
    group.add(mesh);
    frameCamera();
    resize();
  }

  function showCard(image) {
    dropMesh();
    mode = 'card';
    const tex = new THREE.DataTexture(image.data, image.w, image.h, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.flipY = true;
    tex.colorSpace = THREE.NoColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: tex },
        uReveal: { value: clock.reveal },
        uReduced: { value: clock.reduced ? 1 : 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uMap;
        uniform float uReveal;
        uniform float uReduced;
        varying vec2 vUv;
        float smooth01(float e0, float e1, float x) {
          float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
          return u*u*(3.0 - 2.0*u);
        }
        void main() {
          vec4 t = texture2D(uMap, vUv);
          float n = t.a;
          float a = uReduced > 0.5 ? clamp(uReveal, 0.0, 1.0) : (uReveal <= 0.0 ? 0.0 : smooth01(n * 0.72, n * 0.72 + 0.22, uReveal));
          gl_FragColor = vec4(t.rgb * a, a);
        }`,
    });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.05), material);
    group.add(mesh);
    camera.up.set(0, 1, 0);
    camera.position.set(0, 0, 2.15);
    camera.lookAt(0, 0, 0);
    resize();
  }

  function setSky(color, night) {
    skyNight = !!night;
    try { sky = new THREE.Color(color).getHex(); }
    catch { sky = night ? NAVY : 0xf6f3ec; }
    applyClear();
    stars.material.color.set(night ? 0xffffff : 0x1a2230);
    stars.material.vertexColors = !!night;
    stars.material.opacity = night ? 0.85 : 0.55;
    stars.material.needsUpdate = true;
  }

  function setReveal(u, reduced) {
    clock.reveal = u;
    clock.reduced = !!reduced;
    if (material && material.uniforms) {
      material.uniforms.uReveal.value = u;
      material.uniforms.uReduced.value = reduced ? 1 : 0;
    }
    render();
  }

  function orbit(dx, dy) {
    group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -dx * 0.005);
    group.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), dy * 0.004);
    render();
  }

  function flip() {
    flipped = !flipped;
    group.rotateX(Math.PI);
    render();
  }

  function render() {
    if (session) return;
    if (!host.clientWidth) return;
    resize();
    renderer.render(scene, camera);
    hooks.onDraw();
  }

  let unbindSelect = () => {};

  function leaveXR() {
    unbindSelect();
    unbindSelect = () => {};
    try { renderer.setAnimationLoop(null); } catch { /* no loop */ }
    try { renderer.xr.enabled = false; } catch { /* no xr manager */ }
    session = null;
    hitSource = null;
    presentedMode = '';
    applyClear();
    group.scale.setScalar(1);
    group.position.set(0, 0, 0);
    group.quaternion.identity();
    flipped = false;
    frameCamera();
  }

  async function presentSession(sess) {
    if (typeof XRWebGLLayer !== 'function' || !renderer.xr) return false;
    renderer.xr.enabled = true;
    try { renderer.xr.setReferenceSpaceType('local-floor'); } catch { /* the session picks the space */ }
    await renderer.xr.setSession(sess);
    const kindNow = hooks.kind();
    const scale = kindNow === 'height' || kindNow === 'chordal' ? 0.14 : kindNow === 'sphere' || kindNow === 'split-sphere' || kindNow === 'split-chordal' ? 0.15 : 0.22;
    group.scale.setScalar(scale);
    group.position.set(0, 0, -0.8);
    try {
      const viewer = await sess.requestReferenceSpace('viewer');
      hitSource = await sess.requestHitTestSource({ space: viewer });
    } catch { hitSource = null; }
    const grip0 = renderer.xr.getController(0);
    const grip1 = renderer.xr.getController(1);
    scene.add(grip0, grip1);
    applyClear();
    renderer.setAnimationLoop((t, frame) => {
      if (frame && hitSource && !placed && (hooks.kind() === 'sphere' || hooks.kind() === 'height' || hooks.kind() === 'chordal' || hooks.gesture() === 'ar-place')) {
        const ref = renderer.xr.getReferenceSpace();
        const hits = ref ? frame.getHitTestResults(hitSource) : [];
        if (hits.length && ref) {
          const pose = hits[0].getPose(ref);
          if (pose) {
            group.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            group.quaternion.set(
              pose.transform.orientation.x, pose.transform.orientation.y,
              pose.transform.orientation.z, pose.transform.orientation.w,
            );
            placed = true;
          }
        }
      }
      renderer.render(scene, camera);
      hooks.onDraw();
    });
    return true;
  }

  async function enterXR(prefer) {
    const opened = await requestImmersive(typeof navigator !== 'undefined' ? navigator.xr : null, prefer === 'ar' ? 'ar' : 'vr');
    if (!opened.ok || !opened.session) return false;
    const sess = opened.session;
    session = sess;
    placed = false;
    const fallback = () => {
      const win = hooks.window ? hooks.window() : null;
      return win ? [win.cx, win.cy] : [0, 0];
    };
    unbindSelect = bindSelect(sess, (point) => {
      if (hooks.onSelect) hooks.onSelect(point);
      else hooks.onTouch();
    }, fallback);
    presentedMode = opened.mode;
    let presented = false;
    try { presented = await presentSession(sess); } catch { presented = false; }
    if (!presented) {
      presentedMode = '';
      try { renderer.xr.enabled = false; } catch { /* inline session keeps the void */ }
      try { renderer.setAnimationLoop(null); } catch { /* none */ }
    }
    applyClear();
    const onEnd = () => {
      sess.removeEventListener('end', onEnd);
      leaveXR();
      hooks.onLeave(opened.mode);
    };
    sess.addEventListener('end', onEnd);
    if (hooks.onEnter) hooks.onEnter(opened.mode, presented);
    return opened.mode;
  }

  const obs = new ResizeObserver(() => { if (!session) resize(); });
  obs.observe(host);

  return {
    canvas,
    showSphere,
    showHeight,
    showCard,
    showOrbit,
    hitPlane,
    setReveal,
    setSky,
    setInk,
    resetTurn,
    orbit,
    flip,
    render,
    resize,
    enterXR,
    endXR() {
      if (session && typeof session.end === 'function') return session.end();
      leaveXR();
      hooks.onLeave();
      return Promise.resolve();
    },
    get active() { return !!mesh; },
    dispose() {
      obs.disconnect();
      dropMesh();
      renderer.dispose();
      canvas.remove();
    },
  };
}

function starPoints(THREE, seed) {
  const field = starField(seed, 1200);
  const pos = new Float32Array(field.length * 3);
  const col = new Float32Array(field.length * 3);
  field.forEach((s, i) => {
    const theta = s.x * Math.PI * 2;
    const phi = Math.acos(1 - 2 * s.y);
    const r = 18 + s.r;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const tone = s.tone === 'white' ? [0.85, 0.88, 0.95] : [0.7, 0.75, 0.9];
    col[i * 3] = tone[0];
    col[i * 3 + 1] = tone[1];
    col[i * 3 + 2] = tone[2];
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85 });
  return new THREE.Points(geo, mat);
}
