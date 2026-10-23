// Sphere and height, in the same Three.js build the rest of the site uses.
// The renderer paints only when asked. WebXR is entered from here and left again.

import { curvatureInk } from './field.js';
import { starField } from './stars.js';
import { planeFromSphere, orbitOnSphere } from './sphere.js';

const NAVY = 0x0d121c;

export async function createScene(host, hooks) {
  const THREE = await import('../../vendor/three/three.module.min.js');
  const canvas = document.createElement('canvas');
  canvas.className = 'pg-three';
  host.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(NAVY, 1);
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
  let placed = false;
  let hitSource = null;
  const clock = { reveal: 1, reduced: false };

  function resize() {
    const w = host.clientWidth || 2;
    const h = host.clientHeight || 2;
    renderer.setPixelRatio(session ? 0.5 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function frameCamera() {
    if (mode === 'height') {
      camera.up.set(0, 1, 0);
      camera.position.set(1.5, 1.35, 1.7);
    } else {
      camera.up.set(0, 0, 1);
      camera.position.set(0, 2.55, 0.02);
    }
    camera.lookAt(0, 0, 0);
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
      new THREE.SphereGeometry(0.045, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff9d5c }),
    );
    pole.position.set(0, 1.04, 0);
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
    const left = result.reason === 'escape';
    const samples = orbitOnSphere(result.points, left);
    if (samples.length < 2) {
      render();
      return;
    }
    const pos = new Float32Array(samples.length * 3);
    const col = new Float32Array(samples.length * 3);
    samples.forEach((p, i) => {
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      const orange = p.pole;
      col[i * 3] = orange ? 1 : 0.25;
      col[i * 3 + 1] = orange ? 0.62 : 0.82;
      col[i * 3 + 2] = orange ? 0.36 : 0.63;
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
      new THREE.MeshBasicMaterial({ color: left ? 0xff9d5c : 0x3fd0a0 }),
    );
    marker.position.set(tip.x, tip.y, tip.z);
    marker.renderOrder = 3;
    group.add(marker);
    render();
  }

  function hitPlane(clientX, clientY) {
    if (!mesh || mode !== 'sphere') return null;
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    mesh.updateWorldMatrix(true, false);
    const hits = ray.intersectObject(mesh, false);
    if (!hits.length) return null;
    const local = mesh.worldToLocal(hits[0].point.clone());
    return planeFromSphere(local.x, local.y, local.z);
  }

  function showHeight(grid, ink, colour) {
    dropMesh();
    mode = 'height';
    const n = grid.w;
    const geo = new THREE.PlaneGeometry(2.2, 2.2, n - 1, n - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const ns = new Float32Array(pos.count);
    const H = grid.curv;
    for (let i = 0; i < pos.count; i++) {
      const gy = Math.floor(i / n);
      const gx = i - gy * n;
      const src = gy * n + gx;
      const g = grid.G[src] || 0;
      pos.setY(i, Math.min(g, 2) * 0.6);
      ns[i] = grid.nNorm[src] || 0;
      let col;
      if (colour === 'curvature' && H) col = curvatureInk(H.H[src] || 0, H.clamp, ink);
      else if (grid.rgb) col = [grid.rgb[src * 3], grid.rgb[src * 3 + 1], grid.rgb[src * 3 + 2]];
      else col = ink.cart;
      colors[i * 3] = (col[0] || 0) / 255;
      colors[i * 3 + 1] = (col[1] || 0) / 255;
      colors[i * 3 + 2] = (col[2] || 0) / 255;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aN', new THREE.BufferAttribute(ns, 1));
    geo.computeVertexNormals();
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
        varying float vN;
        varying vec3 vCol;
        varying vec3 vNrm;
        void main() {
          vN = aN;
          vCol = color;
          vNrm = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uReveal;
        uniform float uReduced;
        varying float vN;
        varying vec3 vCol;
        varying vec3 vNrm;
        float smooth01(float e0, float e1, float x) {
          float u = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
          return u*u*(3.0 - 2.0*u);
        }
        void main() {
          float a = uReduced > 0.5 ? clamp(uReveal, 0.0, 1.0) : (uReveal <= 0.0 ? 0.0 : smooth01(vN * 0.72, vN * 0.72 + 0.22, uReveal));
          float lam = 0.38 + 0.62 * clamp(dot(normalize(vNrm), normalize(vec3(0.3, 1.0, 0.35))), 0.0, 1.0);
          gl_FragColor = vec4(vCol * lam * a, a);
        }`,
    });
    mesh = new THREE.Mesh(geo, material);
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
    try { renderer.setClearColor(new THREE.Color(color), 1); }
    catch { renderer.setClearColor(night ? NAVY : 0xf6f3ec, 1); }
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

  async function enterXR(prefer) {
    if (!navigator.xr || !renderer.xr) return false;
    const mode = prefer === 'ar' ? 'immersive-ar' : 'immersive-vr';
    let supported = false;
    try { supported = await navigator.xr.isSessionSupported(mode); } catch { supported = false; }
    if (!supported) return false;
    let sess = null;
    try {
      const features = mode === 'immersive-ar'
        ? { requiredFeatures: ['hit-test'], optionalFeatures: ['local-floor', 'hand-tracking'] }
        : { optionalFeatures: ['local-floor', 'hand-tracking'] };
      sess = await navigator.xr.requestSession(mode, features);
      session = sess;
      placed = false;
      renderer.xr.enabled = true;
      try { renderer.xr.setReferenceSpaceType('local-floor'); } catch { /* the session picks the space */ }
      await renderer.xr.setSession(sess);
    const kindNow = hooks.kind();
    const scale = kindNow === 'height' ? 0.14 : kindNow === 'sphere' || kindNow === 'split-sphere' ? 0.15 : 0.22;
    group.scale.setScalar(scale);
    group.position.set(0, 0, -0.8);
    try {
      const viewer = await sess.requestReferenceSpace('viewer');
      hitSource = await sess.requestHitTestSource({ space: viewer });
    } catch { hitSource = null; }
    const grip0 = renderer.xr.getController(0);
    const grip1 = renderer.xr.getController(1);
    const onSelect = () => hooks.onTouch();
    grip0.addEventListener('select', onSelect);
    grip1.addEventListener('select', onSelect);
    scene.add(grip0, grip1);
    renderer.setAnimationLoop((t, frame) => {
      if (frame && hitSource && !placed && (hooks.kind() === 'sphere' || hooks.kind() === 'height' || hooks.gesture() === 'ar-place')) {
        const ref = renderer.xr.getReferenceSpace();
        const hits = frame.getHitTestResults(hitSource);
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
    sess.addEventListener('end', () => {
      renderer.setAnimationLoop(null);
      renderer.xr.enabled = false;
      session = null;
      hitSource = null;
      group.scale.setScalar(1);
      group.position.set(0, 0, 0);
      group.quaternion.identity();
      flipped = false;
      frameCamera();
      hooks.onLeave();
    });
    return true;
    } catch {
      try { if (sess) sess.end(); } catch { /* already closed */ }
      try {
        renderer.setAnimationLoop(null);
        renderer.xr.enabled = false;
      } catch { /* no session to leave */ }
      session = null;
      hitSource = null;
      group.scale.setScalar(1);
      group.position.set(0, 0, 0);
      group.quaternion.identity();
      return false;
    }
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
    orbit,
    flip,
    render,
    resize,
    enterXR,
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
