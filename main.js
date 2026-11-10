/*
 * BARE Magazine — hero 3D magazine (i38: Stained)
 * ------------------------------------------------
 * The real issue, page by page. Images live in assets/i38/:
 *   cover.jpg, back-cover.jpg, p02.jpg … p57.jpg  (single pages, exported from the InDesign PDF)
 *
 * Behaviour
 *  - Floats and slowly spins; drag to spin it yourself (with inertia).
 *  - Mouse hover: it turns toward you, opens, and flips through the issue.
 *  - Mouse click: goes to the issue page.  Touch tap: opens / closes it.
 *  - Respects prefers-reduced-motion (no auto-spin, no float, no auto page flips).
 *
 * To feature a new issue: export its pages the same way into assets/i<N>/ and
 * change ISSUE below.
 */
import * as THREE from 'three';

const ISSUE = {
  dir: 'assets/i38/',
  url: '/issues-individual/i38',
  firstPage: 2,   // first inside page (inside front cover)
  lastPage: 57,   // last inside page
  spineColor: 0x40261e, // sampled from the cover's left edge
};

const stage = document.getElementById('stage');
const canvas = document.getElementById('mag-canvas');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

init().catch((err) => {
  console.error(err);
  stage.classList.add('no-webgl');
});

async function init() {
  // ---------- Renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.25, 9);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfbf, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9c2, 1.2);
  rim.position.set(-4, 2, -4);
  scene.add(rim);

  // Soft contact shadow (blurred blob)
  const blob = document.createElement('canvas');
  blob.width = blob.height = 256;
  const bg = blob.getContext('2d');
  const grad = bg.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(40,28,20,0.55)');
  grad.addColorStop(0.5, 'rgba(40,28,20,0.18)');
  grad.addColorStop(1, 'rgba(40,28,20,0)');
  bg.fillStyle = grad; bg.fillRect(0, 0, 256, 256);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.85;
  scene.add(ground);

  // ---------- Textures ----------
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const prep = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; };
  // Load once, reuse; returns a promise
  const tex = (name) => {
    if (!cache.has(name)) {
      cache.set(name, new Promise((res, rej) => loader.load(ISSUE.dir + name, (t) => res(prep(t)), undefined, rej)));
    }
    return cache.get(name);
  };
  const page = (n) => tex(`p${String(n).padStart(2, '0')}.jpg`);

  // Mirrored copy of a texture, for the back side of a flipping leaf
  const mirrored = (t) => {
    const m = t.clone();
    m.wrapS = THREE.RepeatWrapping; m.repeat.x = -1; m.offset.x = 1;
    m.needsUpdate = true;
    return m;
  };

  // Stripy paper-edge texture for the sides of the page block
  const edgeTex = (vertical) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 2) {
      g.fillStyle = `rgba(90,78,62,${0.04 + Math.random() * 0.12})`;
      vertical ? g.fillRect(i, 0, 1, 256) : g.fillRect(0, i, 256, 1);
    }
    return prep(new THREE.CanvasTexture(c));
  };

  const [coverT, backT, insideT, firstT] = await Promise.all([
    tex('cover.jpg'), tex('back-cover.jpg'), page(ISSUE.firstPage), page(ISSUE.firstPage + 1),
  ]);

  // ---------- Geometry ----------
  // Letter-size proportions (8.5 × 11), matching the printed issue
  const H = 2.8, W = H * (8.5 / 11), T = 0.07, C = 0.008;
  const PW = W - 0.03, PH = H - 0.04; // page block is a hair smaller than the covers

  const m = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...opts });
  const coverEdge = m({ color: 0xece6db });
  const paper = m({ color: 0xf7f4ee, roughness: 0.9 });

  const mag = new THREE.Group();
  mag.visible = false;
  scene.add(mag);

  // Box material order: +x, -x, +y, -y, +z (front), -z (back)
  const firstPageMat = m({ map: firstT, roughness: 0.85 });
  const pages = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, T), [
    m({ map: edgeTex(true), roughness: 0.95 }), paper,
    m({ map: edgeTex(false), roughness: 0.95 }), m({ map: edgeTex(false), roughness: 0.95 }),
    firstPageMat, paper,
  ]);
  pages.position.x = -W / 2 + PW / 2;

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, C),
    [coverEdge, coverEdge, coverEdge, coverEdge, paper, m({ map: backT, roughness: 0.45 })]);
  back.position.z = -T / 2 - C / 2;

  // Saddle-stitched issue, so the spine is just the cover wrapping round
  const spineMat = m({ color: ISSUE.spineColor, roughness: 0.45 });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(C, H, T + 2 * C), spineMat);
  spine.position.x = -W / 2 - C / 2;

  // Front cover, hinged at the spine. Its inside face shows the current left page.
  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, 0, T / 2 + C / 2);
  const insideMat = m({ map: insideT, roughness: 0.85 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, C),
    [coverEdge, coverEdge, coverEdge, coverEdge, m({ map: coverT, roughness: 0.42 }), insideMat]);
  front.position.x = W / 2;
  hinge.add(front);

  // Flipping leaf: one bendable sheet, right page on the front, next left page on the back
  const leafGeo = new THREE.PlaneGeometry(PW, PH, 24, 1);
  leafGeo.translate(PW / 2, 0, 0); // pivot at the spine
  const leafBase = leafGeo.attributes.position.array.slice();
  const leafFrontMat = m({ roughness: 0.85, side: THREE.FrontSide });
  const leafBackMat = m({ roughness: 0.85, side: THREE.BackSide });
  const leaf = new THREE.Group();
  leaf.add(new THREE.Mesh(leafGeo, leafFrontMat), new THREE.Mesh(leafGeo, leafBackMat));
  leaf.position.set(-W / 2, 0, T / 2 + 0.002);
  leaf.visible = false;

  mag.add(pages, back, spine, hinge, leaf);

  const bendLeaf = (amount) => {
    const pos = leafGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = leafBase[i * 3] / PW; // 0 at spine → 1 at outer edge
      pos.array[i * 3 + 2] = amount * u * u * 0.5; // corner leads, like turning a page by hand
    }
    pos.needsUpdate = true;
    leafGeo.computeVertexNormals();
  };

  // ---------- Page flipping ----------
  // Spreads: left page = even number, right page = odd number (2|3, 4|5 … 56|57)
  const firstSpread = ISSUE.firstPage;
  let spreadLeft = firstSpread;   // left page number currently showing
  let flip = null;                // { p, nextLeft } while a flip is in progress
  let holdTimer = 0;
  const HOLD = 1.6, FLIP_TIME = 0.95;
  const nextOf = (left) => (left + 2 > ISSUE.lastPage - 1 ? firstSpread : left + 2);

  const startFlip = async () => {
    const nextLeft = nextOf(spreadLeft);
    flip = { p: 0, nextLeft, ready: false };
    const [curRight, nLeft, nRight] = await Promise.all([page(spreadLeft + 1), page(nextLeft), page(nextLeft + 1)]);
    leafFrontMat.map = curRight; leafFrontMat.needsUpdate = true;
    leafBackMat.map = mirrored(nLeft); leafBackMat.needsUpdate = true;
    firstPageMat.map = nRight; firstPageMat.needsUpdate = true; // revealed underneath
    leaf.visible = true;
    flip.ready = true;
    page(nextOf(nextLeft)); page(nextOf(nextLeft) + 1); // preload the one after
  };

  const endFlip = async () => {
    if (flip.ending) return;
    flip.ending = true;
    insideMat.map = await page(flip.nextLeft);
    insideMat.needsUpdate = true;
    spreadLeft = flip.nextLeft;
    leaf.visible = false;
    flip = null;
    holdTimer = 0;
  };

  // ---------- Sizing ----------
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = Math.max(9, 7 / camera.aspect); // keep the open spread in frame on phones
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- Interaction ----------
  const AUTO_SPIN = reduceMotion ? 0 : 0.32; // rad/s
  const PEEK_ANGLE = -0.45;  // magazine rotation that faces the open spread toward you
  const OPEN_ANGLE = -1.95;  // how far the cover swings open (radians)
  let rotY = -0.55, velY = AUTO_SPIN;
  let dragging = false, dragMoved = 0, lastX = 0, lastT = 0;
  let hovering = false, pinnedOpen = false;
  let lastMouse = null, hoverGrace = 0;
  const pointer = new THREE.Vector2();
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();

  const hitTest = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(mag, true).length > 0;
  };

  stage.addEventListener('pointerdown', (e) => {
    dragging = true; dragMoved = 0;
    lastX = e.clientX; lastT = performance.now();
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    if (dragging) {
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dt = Math.max((now - lastT) / 1000, 1 / 120);
      rotY += dx * 0.01;
      velY = THREE.MathUtils.clamp((dx * 0.01) / dt, -10, 10);
      dragMoved += Math.abs(dx);
      lastX = e.clientX; lastT = now;
    } else if (e.pointerType === 'mouse') {
      lastMouse = { clientX: e.clientX, clientY: e.clientY };
    }
  });

  stage.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('dragging');
    if (dragMoved >= 6 || !hitTest(e)) return;
    if (e.pointerType === 'mouse') window.location.href = ISSUE.url;
    else pinnedOpen = !pinnedOpen; // touch: tap to open / close
  });
  stage.addEventListener('pointercancel', () => { dragging = false; stage.classList.remove('dragging'); });
  stage.addEventListener('pointerleave', () => { lastMouse = null; pointer.set(0, 0); });

  let lastScroll = window.scrollY, scrollProg = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (!reduceMotion) rotY += (y - lastScroll) * 0.004;
    lastScroll = y;
    scrollProg = THREE.MathUtils.clamp(y / window.innerHeight, 0, 1);
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const damp = THREE.MathUtils.damp;
  let t = 0, coverAngle = 0, intro = reduceMotion ? 1 : 0;
  mag.visible = true;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    t += dt;

    // Hover is re-tested each frame (the magazine moves under a still cursor)
    if (!dragging && lastMouse && hitTest(lastMouse)) hoverGrace = 0.3; else hoverGrace -= dt;
    const nowHover = !dragging && !!lastMouse && hoverGrace > 0;
    if (nowHover !== hovering) { hovering = nowHover; stage.classList.toggle('hovering-mag', hovering); }
    const open = hovering || pinnedOpen;

    // Spin: auto-rotate with inertia, or turn to face the reader while open
    if (!dragging && open) {
      const TWO_PI = Math.PI * 2;
      const target = PEEK_ANGLE + Math.round((rotY - PEEK_ANGLE) / TWO_PI) * TWO_PI;
      rotY = damp(rotY, target, 3, dt);
      velY = 0;
    } else if (!dragging) {
      velY = damp(velY, AUTO_SPIN, 1.6, dt);
      rotY += velY * dt;
    }

    intro = Math.min(1, intro + dt / 1.6);
    const ease = 1 - Math.pow(1 - intro, 3);

    mag.rotation.y = rotY + (1 - ease) * -1.2;
    mag.rotation.x = damp(mag.rotation.x, (open ? 0 : pointer.y * 0.12) + scrollProg * 0.35 - 0.04, 4, dt);
    mag.rotation.z = damp(mag.rotation.z, open ? 0 : -0.06 - pointer.x * 0.05, 4, dt);
    const float = reduceMotion ? 0 : Math.sin(t * 1.1) * 0.06;
    mag.position.y = float + (1 - ease) * -0.5 - scrollProg * 0.5;
    mag.position.x = damp(mag.position.x, open ? W * 0.32 : 0, 3, dt); // re-centre the open spread
    mag.scale.setScalar(0.82 + 0.18 * ease);

    const lift = mag.position.y + 0.5;
    ground.position.x = mag.position.x;
    ground.scale.setScalar(1 - lift * 0.15);
    ground.material.opacity = THREE.MathUtils.clamp(1 - lift * 0.5, 0.3, 1) * ease;

    // Cover: breathes slightly when closed; swings open when hovered / tapped
    const breathe = reduceMotion ? 0 : -0.12 * Math.pow(0.5 - 0.5 * Math.cos(t * 0.7), 2);
    coverAngle = damp(coverAngle, open ? OPEN_ANGLE : -0.03 + breathe, open ? 4 : 3, dt);
    hinge.rotation.y = coverAngle;

    // Page flips: only while fully open; a flip in progress always finishes
    const fullyOpen = open && coverAngle < OPEN_ANGLE + 0.15;
    if (!flip && fullyOpen && !reduceMotion) {
      holdTimer += dt;
      if (holdTimer > HOLD) startFlip();
    }
    if (flip && flip.ready) {
      flip.p = Math.min(1, flip.p + dt / (open ? FLIP_TIME : 0.2));
      const e = flip.p < 0.5 ? 2 * flip.p * flip.p : 1 - Math.pow(-2 * flip.p + 2, 2) / 2; // ease in-out
      leaf.rotation.y = e * (coverAngle + 0.04); // land just in front of the open cover
      bendLeaf(Math.sin(e * Math.PI));
      if (flip.p >= 1) endFlip();
    }
    if (!open) holdTimer = 0;

    renderer.render(scene, camera);
  });
}
