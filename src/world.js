// ============================================================
//  FUTUREME — generazione procedurale dei mondi
// ============================================================
import * as THREE from "three";
import { CITIES, ITEMS, POWERUPS } from "./data.js";

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function stdMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.rough ?? 0.9, metalness: opts.metal ?? 0.05,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1,
  });
}

// ---------- Collectible pickup ----------
export function makeItem(type, x, z) {
  const def = ITEMS[type];
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 0),
    stdMat(def.color, { metal: 0.4, rough: 0.3, emissive: def.color, ei: 0.5 })
  );
  g.add(core);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.5, 20),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.35;
  g.add(halo);
  g.position.set(x, 0.9, z);
  g.userData = { kind: "item", type, core, halo, baseY: 0.9, spin: rand(0.5, 1.5) };
  return g;
}

// ---------- Power-up (bonus a tempo) ----------
export function makePowerup(type, x, z) {
  const def = POWERUPS[type] || { color: 0xffffff };
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34, 0),
    stdMat(def.color, { metal: 0.5, rough: 0.2, emissive: def.color, ei: 0.7 })
  );
  g.add(core);
  const cage = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.05, 8, 20),
    stdMat(def.color, { emissive: def.color, ei: 0.8 })
  );
  g.add(cage);
  const light = new THREE.PointLight(def.color, 0.8, 6);
  g.add(light);
  g.position.set(x, 1.1, z);
  g.userData = { kind: "powerup", type, core, cage, baseY: 1.1, spin: 1.4 };
  return g;
}

// ---------- Sfera del Veggente (rivela i mostri) ----------
export function makeSphere(x, z, energy = 100) {
  const g = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0x9be0ff, emissive: 0x2aa0ff, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85 })
  );
  g.add(orb);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  g.add(core);
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.12, 0.03, 8, 28), new THREE.MeshBasicMaterial({ color: 0x4df3ff }));
    ring.rotation.x = i === 0 ? Math.PI / 2 : 0;
    g.add(ring);
  }
  g.add(new THREE.PointLight(0x4df3ff, 1.0, 8));
  g.position.set(x, 1.2, z);
  g.userData = { kind: "sphere", energy, orb, rings: g.children.filter((c) => c.geometry && c.geometry.type === "TorusGeometry"), baseY: 1.2 };
  return g;
}

export function makeSphereCharge(x, z) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    new THREE.MeshStandardMaterial({ color: 0x4df3ff, emissive: 0x2aa0ff, emissiveIntensity: 0.9, roughness: 0.2 })
  );
  g.add(c);
  g.position.set(x, 1.0, z);
  g.userData = { kind: "charge", core: c, baseY: 1.0 };
  return g;
}

// Piccolo faro luminoso da mettere sopra un mostro quando la Sfera è attiva
export function makeBeacon() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), new THREE.MeshBasicMaterial({ color: 0xff4d6d }));
  cone.rotation.x = Math.PI; cone.position.y = 2.4; g.add(cone);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2, 6),
    new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.4 })
  );
  beam.position.y = 3.4; g.add(beam);
  return g;
}

// ---------- Portal ----------
export function makePortal(x, z, color, locked) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.16, 12, 32),
    stdMat(color, { metal: 0.6, rough: 0.2, emissive: color, ei: locked ? 0.3 : 1.1 })
  );
  ring.position.y = 1.3;
  g.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.98, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: locked ? 0.15 : 0.4, side: THREE.DoubleSide })
  );
  disc.position.y = 1.3;
  g.add(disc);
  const light = new THREE.PointLight(color, locked ? 0.4 : 1.4, 8);
  light.position.y = 1.3;
  g.add(light);
  g.position.set(x, 0, z);
  g.userData = { kind: "portal", ring, disc, locked, color, baseColor: color };
  return g;
}

// ---------- NPC (persone strane) ----------
export function makeNPC(x, z, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 8), stdMat(color, { rough: 0.6 }));
  body.position.y = 0.85;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), stdMat(0xf0d0b0));
  head.position.y = 1.5;
  g.add(head);
  // cappuccio/segno misterioso
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 8), stdMat(color, { emissive: color, ei: 0.3 }));
  hood.position.y = 1.72;
  g.add(hood);
  const mark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0x4df3ff }));
  mark.position.set(0, 1.95, 0);
  g.add(mark);
  g.position.set(x, 0, z);
  g.userData = { kind: "npc", mark, baseY: 0 };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Monster (Luna) ----------
export function makeMonster(kind, x, z, elite = false) {
  const g = new THREE.Group();
  let bodyColor = 0x5a7a4a, headColor = 0x8ab06a;
  if (kind === "zombie") { bodyColor = 0x4a6b3a; headColor = 0x7fa05a; }
  if (kind === "vampire") { bodyColor = 0x1c1420; headColor = 0xe8e0e8; }
  if (kind === "werewolf") { bodyColor = 0x3a2f28; headColor = 0x5a4a3a; }

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 8), stdMat(bodyColor, { rough: 0.9 }));
  body.position.y = 0.9;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), stdMat(headColor, { rough: 0.85 }));
  head.position.y = 1.6;
  g.add(head);
  // occhi rossi luminosi
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    eye.position.set(sx * 0.1, 1.62, 0.24);
    g.add(eye);
  }
  if (kind === "werewolf") {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), stdMat(headColor));
      ear.position.set(sx * 0.14, 1.82, 0);
      g.add(ear);
    }
  }
  if (kind === "vampire") {
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), stdMat(0x5a0f1a, { rough: 0.5 }));
    cape.material.side = THREE.DoubleSide;
    cape.position.set(0, 1.1, -0.25);
    g.add(cape);
  }
  // Élite: più grande, più veloce, aura minacciosa
  if (elite) {
    g.scale.setScalar(1.35);
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 20),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    aura.rotation.x = -Math.PI / 2; aura.position.y = 0.05; g.add(aura);
    g.add(new THREE.PointLight(0xff2020, 0.6, 6));
  }
  g.position.set(x, 0, z);
  g.userData = { kind: "monster", type: kind, head, speed: elite ? rand(3.0, 3.8) : rand(1.6, 2.8), baseY: 0, hp: 2, elite };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Caricatore: stalka lento, poi carica in scatto ----------
export function makeCharger(x, z, elite = false) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 6), stdMat(0x8a1a2a, { rough: 0.6, emissive: 0x5a0a1a, ei: 0.3 }));
  body.position.y = 0.9; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), stdMat(0xc02a3a, { rough: 0.6 }));
  head.position.y = 1.7; g.add(head);
  for (const sx of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), stdMat(0xffe0a0));
    horn.position.set(sx * 0.16, 2.0, 0.1); horn.rotation.z = sx * 0.4; g.add(horn);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    eye.position.set(sx * 0.11, 1.72, 0.26); g.add(eye);
  }
  if (elite) { g.scale.setScalar(1.35); g.add(new THREE.PointLight(0xff3020, 0.5, 6)); }
  g.position.set(x, 0, z);
  g.userData = { kind: "monster", type: "charger", behavior: "charge", speed: elite ? 1.8 : 1.4, chargeTimer: rand(1.5, 3), charging: 0, cvx: 0, cvz: 0, baseY: 0, hp: 1, elite };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Slime: si divide in due quando lo respingi ----------
export function makeSlime(x, z, mini = false) {
  const g = new THREE.Group();
  const s = mini ? 0.5 : 1;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 14, 12), stdMat(0x3fbf6a, { rough: 0.4, metal: 0.1, emissive: 0x1a5a2a, ei: 0.3, }));
  body.material.transparent = true; body.material.opacity = 0.85;
  body.scale.y = 0.7; body.position.y = 0.3 * s; g.add(body);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 8), new THREE.MeshBasicMaterial({ color: 0x0a1a0a }));
    eye.position.set(sx * 0.14 * s, 0.36 * s, 0.3 * s); g.add(eye);
  }
  g.position.set(x, 0, z);
  g.userData = { kind: "monster", type: "slime", behavior: "slime", speed: mini ? 2.6 : 1.7, splits: mini ? 0 : 2, baseY: 0, hp: 1, blob: body, mini };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Nemico volante: pipistrello ----------
export function makeBat(x, z, elite = false) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), stdMat(0x1a1420, { rough: 0.7 }));
  body.scale.set(1, 0.9, 1.3); g.add(body);
  // occhi rossi
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
    eye.position.set(sx * 0.08, 0.05, 0.2); g.add(eye);
  }
  // orecchie
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 4), stdMat(0x1a1420));
    ear.position.set(sx * 0.09, 0.24, 0); g.add(ear);
  }
  // ali
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.16, 0, 0);
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), stdMat(0x2a1020, { rough: 0.6 }));
    wing.material.side = THREE.DoubleSide;
    wing.position.x = sx * 0.28; wing.rotation.y = sx * 0.2;
    pivot.add(wing); g.add(pivot); wings.push({ pivot, sx });
  }
  if (elite) { g.scale.setScalar(1.4); g.add(new THREE.PointLight(0xff2020, 0.5, 5)); }
  const hover = rand(2.2, 3.4);
  g.position.set(x, hover, z);
  g.userData = { kind: "monster", type: "bat", flying: true, hover, wings, speed: elite ? rand(3.2, 4.2) : rand(2.4, 3.4), baseY: hover, hp: 1, elite };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Boss finale (Luna) ----------
export function makeBoss(x, z, variant = "guardian") {
  if (variant === "vampire") return makeVampireLord(x, z);
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.4, 6, 12), stdMat(0x2a1035, { rough: 0.7, emissive: 0x3a0a3a, ei: 0.3 }));
  body.position.y = 1.5; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), stdMat(0x1a0a20, { rough: 0.6, emissive: 0x5a0a2a, ei: 0.4 }));
  head.position.y = 2.9; g.add(head);
  // corona
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), stdMat(0xff3366, { emissive: 0xff3366, ei: 0.8 }));
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.45, 3.35, Math.sin(a) * 0.45);
    g.add(spike);
  }
  // occhi
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    eye.position.set(sx * 0.2, 2.95, 0.45); g.add(eye);
  }
  // braccia artigliate
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 4, 8), stdMat(0x2a1035));
    arm.position.set(sx * 0.8, 1.7, 0); arm.rotation.z = sx * 0.5; g.add(arm);
  }
  const light = new THREE.PointLight(0xff2060, 1.2, 12);
  light.position.y = 2.5; g.add(light);
  g.position.set(x, 0, z);
  g.userData = { kind: "boss", variant: "guardian", name: "GUARDIANO DELLA LUNA", hp: 6, maxHp: 6, speed: 1.9, baseY: 0, attackTimer: 4 };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Secondo boss: il Signore dei Vampiri (più veloce, si teletrasporta)
function makeVampireLord(x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.4, 6, 12), stdMat(0x1a0a12, { rough: 0.5, emissive: 0x3a0010, ei: 0.3 }));
  body.position.y = 1.5; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), stdMat(0xe8dfe0, { rough: 0.5 }));
  head.position.y = 2.85; g.add(head);
  // occhi rossi ardenti
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1030 }));
    eye.position.set(sx * 0.18, 2.9, 0.42); g.add(eye);
  }
  // zanne
  for (const sx of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), stdMat(0xffffff));
    fang.position.set(sx * 0.1, 2.62, 0.42); fang.rotation.x = Math.PI; g.add(fang);
  }
  // colletto alto del mantello
  const collar = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 12, 1, true), stdMat(0x6a0010, { rough: 0.4, emissive: 0x3a0008, ei: 0.3 }));
  collar.material.side = THREE.DoubleSide; collar.position.y = 2.6; g.add(collar);
  // ali da pipistrello
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), stdMat(0x2a0010, { rough: 0.6 }));
    wing.material.side = THREE.DoubleSide;
    wing.position.set(sx * 1.4, 2.0, -0.3); wing.rotation.y = sx * 0.9; g.add(wing);
  }
  const light = new THREE.PointLight(0xff1040, 1.4, 14);
  light.position.y = 2.5; g.add(light);
  g.position.set(x, 0, z);
  g.userData = { kind: "boss", variant: "vampire", name: "SIGNORE DEI VAMPIRI", hp: 7, maxHp: 7, speed: 2.6, baseY: 0, teleTimer: 3, summonTimer: 5 };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Alternate self ----------
export function makeAlterEgo(avatarGroup, evil) {
  const clone = avatarGroup.clone(true);
  clone.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      if (evil) {
        // solo i materiali standard hanno l'uniform "emissive" nello shader:
        // impostarla su un MeshBasicMaterial (es. l'aura) romperebbe il rendering
        if (o.material.isMeshStandardMaterial) {
          o.material.emissive = new THREE.Color(0xff1030);
          o.material.emissiveIntensity = 0.4;
        }
        if (o.material.color) o.material.color.multiplyScalar(0.55);
      }
    }
  });
  clone.userData = { kind: "alter", evil };
  return clone;
}

// ============================================================
//  Costruzione di una dimensione completa
// ============================================================
const DIM_THEMES = {
  moon: { skyTop: 0x05060f, skyBottom: 0x1a1a3a, fog: 0x0a0a1e, fogNear: 18, fogFar: 78, ambient: 0.25, sunColor: 0x8ea2ff, sunInt: 0.35, night: true, stars: true, bigMoon: true },
  sun:  { skyTop: 0x2aa0ff, skyBottom: 0xffe9a0, fog: 0xffe9b0, fogNear: 55, fogFar: 160, ambient: 0.62, sunColor: 0xfff4c0, sunInt: 1.45, night: false, stars: false, bigSun: true },
};

export function buildDimension(dimId, level) {
  const root = new THREE.Group();
  const objects = { items: [], portals: [], npcs: [], monsters: [], colliders: [] };
  const SIZE = 62;

  let groundColor, cityName = null, theme, city = null;
  if (dimId === "earth") {
    city = CITIES[(level - 1) % CITIES.length];
    cityName = city.name;
    groundColor = city.ground;
    theme = city.theme;
    (CITY_BUILDERS[city.id] || buildGenericCity)(root, objects, SIZE, city);
  } else if (dimId === "moon") {
    groundColor = 0x1a1a2e; theme = DIM_THEMES.moon;
    buildMoon(root, objects, SIZE, level);
  } else {
    groundColor = 0xf4e2a8; theme = DIM_THEMES.sun;
    buildSun(root, objects, SIZE, level);
  }

  // Suolo con texture procedurale (griglia/strade → profondità e non "piatto")
  const gMat = new THREE.MeshStandardMaterial({
    color: groundColor, roughness: 1, metalness: 0,
    map: groundTexture(dimId, groundColor),
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(SIZE, 64), gMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // Skyline di sfondo: torri alte verso il bordo, per dare profondità 3D
  if (dimId === "earth") addSkylineRing(root, SIZE, city, theme.night);

  // Bordo del mondo
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(SIZE, 0.6, 8, 64),
    stdMat(theme.night ? 0x3a3a6a : 0xffffff, { emissive: theme.night ? 0x2a2a5a : 0x000000, ei: 0.4 })
  );
  rim.rotation.x = -Math.PI / 2;
  root.add(rim);

  return { root, objects, cityName, city, size: SIZE, theme };
}

// ------------------------------------------------------------
//  Helper condivisi per costruire elementi urbani
// ------------------------------------------------------------
function winMat(color = 0xffe9a0, op = 0.85) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op });
}

// Texture procedurale del suolo: griglia di strade (Terra), crateri (Luna),
// dune sabbiose (Sole). Dà profondità ed evita il pavimento "piatto".
function groundTexture(dimId, baseColor) {
  const S = 512;
  const c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  const hex = "#" + (baseColor >>> 0).toString(16).padStart(6, "0").slice(-6);
  g.fillStyle = hex; g.fillRect(0, 0, S, S);
  let repeat = 6;
  if (dimId === "earth") {
    // isolati con strade più scure e marciapiedi chiari
    const tiles = 4, step = S / tiles, road = 26;
    g.fillStyle = "rgba(0,0,0,0.28)";
    for (let i = 0; i < tiles; i++) {
      g.fillRect(i * step + step / 2 - road / 2, 0, road, S);
      g.fillRect(0, i * step + step / 2 - road / 2, S, road);
    }
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2;
    g.setLineDash([10, 12]);
    for (let i = 0; i < tiles; i++) {
      g.beginPath(); g.moveTo(i * step + step / 2, 0); g.lineTo(i * step + step / 2, S); g.stroke();
      g.beginPath(); g.moveTo(0, i * step + step / 2); g.lineTo(S, i * step + step / 2); g.stroke();
    }
    g.setLineDash([]);
    repeat = 5;
  } else if (dimId === "moon") {
    // crateri
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = 6 + Math.random() * 28;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
      g.fillStyle = "rgba(0,0,0,0.22)"; g.fill();
      g.beginPath(); g.arc(x - r * 0.2, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
      g.fillStyle = "rgba(255,255,255,0.06)"; g.fill();
    }
    repeat = 4;
  } else {
    // dune sabbiose: bande morbide
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(180,140,60,${0.05 + Math.random() * 0.08})`;
      g.lineWidth = 2 + Math.random() * 5;
      g.beginPath();
      const y = Math.random() * S;
      g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + 20, S * 0.6, y - 20, S, y + 10); g.stroke();
    }
    repeat = 5;
  }
  // grana leggera comune
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.045})`;
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

// Anello di torri alte verso il bordo: crea uno skyline e senso di profondità.
function addSkylineRing(root, SIZE, city, night) {
  const base = (city && city.building) || 0x6a7488;
  const N = 46;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rand(-0.05, 0.05);
    const r = SIZE - rand(1, 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const w = rand(2.4, 4.2), h = rand(10, 26), d = rand(2.4, 4.2);
    const shade = new THREE.Color(base).multiplyScalar(rand(0.7, 1.05));
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      stdMat(shade.getHex(), { rough: 0.9, emissive: night ? 0x111a33 : 0x000000, ei: night ? 0.25 : 0 }));
    b.position.set(x, h / 2, z);
    b.castShadow = false; b.receiveShadow = false;
    root.add(b);
    // qualche finestra accesa di notte (economico: pochi piani)
    if (night && Math.random() < 0.8) {
      const lit = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.8),
        winMat(0xffe9a0, 0.5));
      lit.position.set(x, h * 0.5, z + d / 2 + 0.03);
      root.add(lit);
    }
  }
}

// Edificio con file di finestre (di notte diventano neon)
function addBuilding(root, colliders, x, z, w, h, d, color, opts = {}) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(color, {
    rough: opts.rough ?? 0.85, metal: opts.metal ?? 0.05,
    emissive: opts.glow || 0x000000, ei: opts.glow ? 0.2 : 0,
  }));
  b.position.set(x, h / 2, z);
  b.castShadow = true; b.receiveShadow = true;
  root.add(b);
  if (colliders) colliders.push({ x, z, r: Math.max(w, d) * 0.62 });
  // finestre a griglia sulla facciata frontale e laterale
  if (opts.windows !== false) {
    const wc = opts.winColor || 0xffe9a0;
    const rows = Math.max(1, Math.floor(h / 1.4));
    const cols = Math.max(1, Math.floor(w / 1.1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < (opts.winDensity ?? 0.55)) continue;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.6), winMat(wc, opts.night ? 0.9 : 0.35));
        const wx = -w / 2 + 0.7 + c * (w - 1.2) / Math.max(1, cols - 1 || 1);
        const wy = 0.9 + r * (h - 1.4) / Math.max(1, rows - 1 || 1);
        win.position.set(x + (isNaN(wx) ? 0 : wx), wy, z + d / 2 + 0.02);
        root.add(win);
      }
    }
  }
  return b;
}

function cypress(root, colliders, x, z, s = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), stdMat(0x6b4a2a));
  trunk.position.set(x, 0.4, z); root.add(trunk);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 3.4 * s, 8), stdMat(0x2f5a35, { rough: 1 }));
  body.position.set(x, 0.8 + 1.7 * s, z); body.castShadow = true; root.add(body);
  if (colliders) colliders.push({ x, z, r: 0.5 });
}

function palm(root, colliders, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 4, 7), stdMat(0x9a6b3a));
  trunk.position.set(x, 2, z); trunk.castShadow = true; root.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 4), stdMat(0x3fbf5a, { rough: 0.9 }));
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(x + Math.cos(a) * 0.9, 4.1, z + Math.sin(a) * 0.9);
    frond.rotation.z = Math.cos(a) * 0.9; frond.rotation.x = Math.sin(a) * 0.9;
    root.add(frond);
  }
  if (colliders) colliders.push({ x, z, r: 0.4 });
}

function neonSign(root, x, y, z, color) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, rand(1, 2.4), rand(0.6, 1.4)),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.4 }));
  s.position.set(x, y, z); root.add(s);
  const l = new THREE.PointLight(color, 0.5, 8); l.position.set(x, y, z + 1); root.add(l);
}

function taxi(root, x, z) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 2.4), stdMat(0xffd21e, { rough: 0.5, metal: 0.3 }));
  body.position.y = 0.4; car.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 1.2), stdMat(0xffd21e, { rough: 0.5 }));
  cab.position.set(0, 0.85, -0.1); car.add(cab);
  for (const [sx, sz] of [[-0.55, 0.8], [0.55, 0.8], [-0.55, -0.8], [0.55, -0.8]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 10), stdMat(0x111111));
    w.rotation.z = Math.PI / 2; w.position.set(sx, 0.22, sz); car.add(w);
  }
  car.position.set(x, 0, z); car.rotation.y = rand(0, Math.PI * 2);
  car.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.add(car);
}

function gondola(root, x, z, t0) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 2.0, 4, 8), stdMat(0x1a1a1a, { rough: 0.4 }));
  hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 0.5); hull.position.y = 0.2; g.add(hull);
  const prow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), stdMat(0xd8c090, { metal: 0.5 }));
  prow.position.set(1.1, 0.5, 0); g.add(prow);
  g.position.set(x, 0.15, z);
  g.userData = { kind: "gondola", baseX: x, baseZ: z, phase: t0 };
  root.add(g);
  return g;
}

// ------------------------------------------------------------
//  Costruttori specifici per ogni città reale
// ------------------------------------------------------------
function ringOfBuildings(root, objects, SIZE, city, count, hMin, hMax, opts = {}) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2), r = rand(9, SIZE - 7);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    // lascia libero il centro davanti al monumento
    if (Math.abs(x) < 6 && z < -8 && z > -26) continue;
    addBuilding(root, objects.colliders, x, z, rand(2.4, 4.4), rand(hMin, hMax), rand(2.4, 4.4),
      opts.color || city.building, opts);
  }
}

// ROMA — il Colosseo, colonne, cipressi, fontana
function buildRoma(root, objects, SIZE, city) {
  ringOfBuildings(root, objects, SIZE, city, 26, 3, 8, { color: 0xd9b271, winColor: 0xffe9c0, winDensity: 0.6 });
  // Colosseo: due anelli di archi
  const cx = 0, cz = -19;
  for (const [rad, hgt] of [[5.2, 5], [4.4, 3.4]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, hgt, 28, 1, true), stdMat(0xcaa46b, { rough: 0.95 }));
    ring.material.side = THREE.DoubleSide; ring.position.set(cx, hgt / 2, cz); ring.castShadow = true; root.add(ring);
    // archi (buchi simulati con colonnine)
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, hgt, 8), stdMat(0xb8935a));
      col.position.set(cx + Math.cos(a) * rad, hgt / 2, cz + Math.sin(a) * rad); root.add(col);
    }
  }
  objects.colliders.push({ x: cx, z: cz, r: 5.6 });
  // colonne romane sparse
  for (let i = 0; i < 6; i++) {
    const a = rand(0, Math.PI * 2), r = rand(10, SIZE - 12);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, rand(3, 5), 12), stdMat(0xe8e0d0, { rough: 0.9 }));
    col.position.set(x, col.geometry.parameters.height / 2, z); col.castShadow = true; root.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1), stdMat(0xe8e0d0));
    cap.position.set(x, col.geometry.parameters.height + 0.2, z); root.add(cap);
    objects.colliders.push({ x, z, r: 0.5 });
  }
  for (let i = 0; i < 8; i++) cypress(root, objects.colliders, rand(-SIZE + 12, SIZE - 12), rand(-SIZE + 12, SIZE - 12));
}

// TOKYO — Tokyo Tower, torii, grattacieli neon
function buildTokyo(root, objects, SIZE, city) {
  ringOfBuildings(root, objects, SIZE, city, 34, 5, 16, { color: 0x24283f, night: true, winColor: 0x9ad0ff, winDensity: 0.35, glow: 0x1a2340 });
  // Tokyo Tower (traliccio rosso/bianco)
  const cx = 0, cz = -20;
  const tower = new THREE.Group();
  const legMat = stdMat(0xff5540, { emissive: 0xff3a1a, ei: 0.7, metal: 0.4 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 14, 6), legMat);
    leg.position.set(sx * 1.4, 7, sz * 1.4); leg.rotation.x = -sz * 0.16; leg.rotation.z = sx * 0.16;
    tower.add(leg);
  }
  // struttura centrale luminosa
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 14, 8), stdMat(0xff5540, { emissive: 0xff3a1a, ei: 0.6 }));
  core.position.y = 7; tower.add(core);
  for (const [yy, rr] of [[3, 1.6], [6.5, 1.1], [10, 0.7]]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.14, 6, 16), stdMat(0xffffff, { emissive: 0xffe9c0, ei: 0.9 }));
    band.rotation.x = Math.PI / 2; band.position.set(0, yy, 0); tower.add(band);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 6, 6), legMat);
  antenna.position.set(0, 16, 0); tower.add(antenna);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  beacon.position.set(0, 19.2, 0); tower.add(beacon);
  tower.position.set(cx, 0, cz); tower.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.add(tower);
  const towerLight = new THREE.PointLight(0xff5a4a, 2.2, 40); towerLight.position.set(cx, 11, cz); root.add(towerLight);
  objects.colliders.push({ x: cx, z: cz, r: 2.6 });
  // torii rosso
  const tx = 12, tz = 6;
  const torii = new THREE.Group();
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4, 8), stdMat(0xd62828, { emissive: 0x6a0a0a, ei: 0.2 }));
    p.position.set(sx * 1.4, 2, 0); torii.add(p);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 0.5), stdMat(0xd62828));
  top.position.set(0, 4.1, 0); torii.add(top);
  const top2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 0.4), stdMat(0x111111));
  top2.position.set(0, 3.5, 0); torii.add(top2);
  torii.position.set(tx, 0, tz); root.add(torii);
  objects.colliders.push({ x: tx, z: tz, r: 1.6 });
  // insegne neon
  const neon = [0xff2d95, 0x2dd4ff, 0xffe600, 0x8a2dff, 0x39ff88];
  for (let i = 0; i < 14; i++) neonSign(root, rand(-SIZE + 14, SIZE - 14), rand(2, 9), rand(-SIZE + 14, SIZE - 14), pick(neon));
}

// NEW YORK — grattacieli, Statua della Libertà, taxi
function buildNewYork(root, objects, SIZE, city) {
  ringOfBuildings(root, objects, SIZE, city, 40, 8, 22, { color: 0x6a7488, winColor: 0xdfeeff, winDensity: 0.5, metal: 0.2 });
  // Empire State-like: torre a gradoni
  const ex = -14, ez = -14;
  let hAcc = 0;
  for (const [w, h] of [[5, 10], [3.6, 8], [2.4, 6]]) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), stdMat(0x7a8498, { metal: 0.3, rough: 0.6 }));
    seg.position.set(ex, hAcc + h / 2, ez); seg.castShadow = true; root.add(seg); hAcc += h;
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.4, 5, 8), stdMat(0xcfd8e8, { metal: 0.6 }));
  spire.position.set(ex, hAcc + 2.5, ez); root.add(spire);
  objects.colliders.push({ x: ex, z: ez, r: 3 });
  // Statua della Libertà
  const sx = 0, sz = -22;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 3, 8), stdMat(0x8a7a5a));
  base.position.set(sx, 1.5, sz); root.add(base);
  const bodyMat = stdMat(0x5fbf9a, { rough: 0.8 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.6, 8), bodyMat);
  body.position.set(sx, 4.8, sz); root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), bodyMat);
  head.position.set(sx, 6.9, sz); root.add(head);
  // corona a raggi
  for (let i = 0; i < 7; i++) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 4), bodyMat);
    const a = (i / 7) * Math.PI - Math.PI / 2;
    ray.position.set(sx + Math.cos(a) * 0.5, 7.4, sz + Math.sin(a) * 0.5); ray.rotation.z = -a + Math.PI / 2;
    root.add(ray);
  }
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2, 8), bodyMat);
  arm.position.set(sx + 0.8, 6.6, sz); arm.rotation.z = -0.7; root.add(arm);
  const torch = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xffd35c, emissive: 0xffb000, emissiveIntensity: 1 }));
  torch.position.set(sx + 1.5, 7.7, sz); root.add(torch);
  root.add(new THREE.PointLight(0xffcf6b, 0.7, 14).translateX(sx + 1.5).translateY(7.7).translateZ(sz));
  objects.colliders.push({ x: sx, z: sz, r: 2 });
  // taxi gialli
  for (let i = 0; i < 6; i++) taxi(root, rand(-SIZE + 16, SIZE - 16), rand(-SIZE + 16, SIZE - 16));
}

// VENEZIA — Canal Grande, Campanile di San Marco, gondole, ponti
function buildVenezia(root, objects, SIZE, city) {
  // acqua al centro (canale)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 2, 16), stdMat(0x2f6f8f, { metal: 0.7, rough: 0.15 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.06, -6); root.add(water);
  // edifici colorati (Burano) ai lati del canale
  const colors = [0xd66a4a, 0xe0b04a, 0x6aa9c0, 0xc06a9a, 0xe0d0a0, 0x7ab06a];
  for (let i = 0; i < 30; i++) {
    const a = rand(0, Math.PI * 2), r = rand(11, SIZE - 8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z + 6) < 8) continue; // non nell'acqua
    addBuilding(root, objects.colliders, x, z, rand(2.6, 4), rand(3, 7), rand(2.6, 4), pick(colors), { winColor: 0xfff0c0, winDensity: 0.6 });
  }
  // Campanile di San Marco
  const cx = -16, cz = -16;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12, 2.2), stdMat(0xb54a3a, { rough: 0.9 }));
  shaft.position.set(cx, 6, cz); shaft.castShadow = true; root.add(shaft);
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 2.6), stdMat(0xe0d0b0));
  belfry.position.set(cx, 13, cz); root.add(belfry);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3, 4), stdMat(0x3a7a5a, { metal: 0.3 }));
  roof.position.set(cx, 15.5, cz); roof.rotation.y = Math.PI / 4; root.add(roof);
  objects.colliders.push({ x: cx, z: cz, r: 1.8 });
  // ponte arcuato sul canale
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(3, 0.5, 8, 16, Math.PI), stdMat(0xd8c9a8));
  bridge.position.set(6, 0.1, -6); bridge.rotation.y = Math.PI / 2; root.add(bridge);
  // gondole animate
  objects.gondolas = [];
  for (let i = 0; i < 5; i++) objects.gondolas.push(gondola(root, rand(-18, 18), -6 + rand(-4, 4), rand(0, 6)));
  // pali da ormeggio
  for (let i = 0; i < 8; i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), stdMat(0x6b4a2a));
    pole.position.set(rand(-20, 20), 0.8, -6 + rand(-6, 6)); root.add(pole);
  }
}

// PARIGI — Torre Eiffel a 4 gambe, Arco di Trionfo, palazzi Haussmann
function buildParigi(root, objects, SIZE, city) {
  ringOfBuildings(root, objects, SIZE, city, 30, 5, 8, { color: 0xd8cdb6, winColor: 0xffe9c0, winDensity: 0.55 });
  // Torre Eiffel
  const cx = 0, cz = -20;
  const tower = new THREE.Group();
  const mat = stdMat(0x8a6b3a, { metal: 0.5, rough: 0.5 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.5, 9, 6), mat);
    leg.position.set(dx * 1.7, 4.4, dz * 1.7); leg.rotation.x = -dz * 0.22; leg.rotation.z = dx * 0.22;
    tower.add(leg);
  }
  const plat1 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), mat); plat1.position.y = 8.6; tower.add(plat1);
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.2, 6, 6), mat); mid.position.y = 12; tower.add(mid);
  const plat2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2), mat); plat2.position.y = 15; tower.add(plat2);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.4, 5, 6), mat); top.position.y = 18; tower.add(top);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  beacon.position.y = 20.8; tower.add(beacon);
  tower.position.set(cx, 0, cz); tower.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(tower);
  objects.colliders.push({ x: cx, z: cz, r: 3 });
  // Arco di Trionfo
  const ax = 15, az = 8;
  const arch = new THREE.Group();
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.6), stdMat(0xe0d6c0)); p.position.set(sx * 1.6, 2, 0); arch.add(p); }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 1.6), stdMat(0xe0d6c0)); lintel.position.set(0, 4.7, 0); arch.add(lintel);
  arch.position.set(ax, 0, az); arch.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(arch);
  objects.colliders.push({ x: ax, z: az, r: 2.4 });
}

// IL CAIRO — Piramidi di Giza, Sfinge, palme, dune
function buildCairo(root, objects, SIZE, city) {
  // 3 piramidi
  const pyr = [[0, -22, 8, 10], [11, -16, 6, 7.5], [-11, -17, 5, 6]];
  for (const [x, z, base, h] of pyr) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(base, h, 4), stdMat(0xdcc07f, { rough: 1 }));
    p.rotation.y = Math.PI / 4; p.position.set(x, h / 2, z); p.castShadow = true; root.add(p);
    objects.colliders.push({ x, z, r: base * 0.8 });
  }
  // Sfinge (corpo + testa)
  const sbx = 6, sbz = -8;
  const bodyS = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 1.6), stdMat(0xd8b878));
  bodyS.position.set(sbx, 0.7, sbz); bodyS.rotation.y = -0.5; root.add(bodyS);
  const headS = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 1.1), stdMat(0xe0c088));
  headS.position.set(sbx + 1.4, 1.7, sbz - 0.8); headS.rotation.y = -0.5; root.add(headS);
  objects.colliders.push({ x: sbx, z: sbz, r: 2 });
  // basse case di arenaria + palme + dune
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), r = rand(12, SIZE - 8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z < -8) continue;
    addBuilding(root, objects.colliders, x, z, rand(2.5, 4), rand(2, 4), rand(2.5, 4), pick([0xd8b878, 0xc9a860, 0xe0c68a]), { winColor: 0xffe0a0, winDensity: 0.7 });
  }
  for (let i = 0; i < 10; i++) palm(root, objects.colliders, rand(-SIZE + 12, SIZE - 12), rand(-SIZE + 12, SIZE - 12));
  // dune (cupole appiattite)
  for (let i = 0; i < 8; i++) {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(rand(3, 6), 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stdMat(0xe3c98a, { rough: 1 }));
    dune.scale.y = 0.35; dune.position.set(rand(-SIZE + 8, SIZE - 8), 0, rand(-SIZE + 8, SIZE - 8)); root.add(dune);
  }
}

function buildGenericCity(root, objects, SIZE, city) {
  ringOfBuildings(root, objects, SIZE, city, 34, 3, 12, { color: city.building });
}

const CITY_BUILDERS = {
  roma: buildRoma, tokyo: buildTokyo, newyork: buildNewYork,
  venezia: buildVenezia, parigi: buildParigi, cairo: buildCairo,
};

function buildMoon(root, objects, SIZE, level) {
  // rocce e strutture cupe
  for (let i = 0; i < 24; i++) {
    const a = rand(0, Math.PI * 2), r = rand(8, SIZE - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = rand(2, 7);
    addBuilding(root, objects.colliders, x, z, rand(2, 4), h, rand(2, 4), 0x2a2a44, { night: true, glow: 0x2a2a5a, winColor: 0x8ea2ff, winDensity: 0.5 });
  }
  // grandi lapidi
  for (let i = 0; i < 10; i++) {
    const a = rand(0, Math.PI * 2), r = rand(6, SIZE - 8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(1.2, rand(1.5, 2.5), 0.4), stdMat(0x3a3a4a));
    stone.position.set(x, 1.2, z); stone.castShadow = true; root.add(stone);
  }
  // nebbia bassa (piani semitrasparenti)
  for (let i = 0; i < 6; i++) {
    const fog = new THREE.Mesh(new THREE.CircleGeometry(rand(6, 12), 24), new THREE.MeshBasicMaterial({ color: 0x5060a0, transparent: true, opacity: 0.06 }));
    fog.rotation.x = -Math.PI / 2; fog.position.set(rand(-SIZE / 2, SIZE / 2), 0.4, rand(-SIZE / 2, SIZE / 2)); root.add(fog);
  }
}

function buildSun(root, objects, SIZE, level) {
  // palme e strutture allegre
  for (let i = 0; i < 16; i++) {
    const a = rand(0, Math.PI * 2), r = rand(8, SIZE - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 4, 8), stdMat(0x9a6b3a));
    trunk.position.set(x, 2, z); trunk.castShadow = true; root.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), stdMat(0x3fbf5a, { rough: 0.8 }));
    leaves.position.set(x, 4.2, z); leaves.scale.y = 0.6; root.add(leaves);
    objects.colliders.push({ x, z, r: 0.6 });
  }
  // edifici colorati e allegri
  const happy = [0xff9f43, 0x28c0d0, 0xff6b9d, 0xffd35c, 0x7fd66a];
  for (let i = 0; i < 18; i++) {
    const a = rand(0, Math.PI * 2), r = rand(10, SIZE - 8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    addBuilding(root, objects.colliders, x, z, rand(2.5, 4), rand(3, 7), rand(2.5, 4), pick(happy), { winColor: 0xffffff, winDensity: 0.7 });
  }
  // grande sole
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  sun.position.set(0, 22, -30); root.add(sun);
}

// Animazione ambientale generica
export function animateWorldObjects(objects, t, dt) {
  for (const it of objects.items) {
    it.rotation.y += it.userData.spin * dt;
    it.position.y = it.userData.baseY + Math.sin(t * 2 + it.position.x) * 0.15;
    if (it.userData.halo) it.userData.halo.rotation.z = t;
  }
  for (const p of objects.portals) {
    p.userData.ring.rotation.z = t * (p.userData.locked ? 0.3 : 1.2);
  }
  if (objects.powerups) {
    for (const pu of objects.powerups) {
      pu.userData.core.rotation.y += pu.userData.spin * dt;
      pu.userData.core.rotation.x += pu.userData.spin * 0.5 * dt;
      pu.userData.cage.rotation.z = t * 2;
      pu.position.y = pu.userData.baseY + Math.sin(t * 3 + pu.position.x) * 0.2;
    }
  }
  if (objects.spheres) {
    for (const s of objects.spheres) {
      s.rotation.y = t;
      s.position.y = s.userData.baseY + Math.sin(t * 2 + s.position.x) * 0.15;
      if (s.userData.rings) s.userData.rings.forEach((r, i) => { r.rotation.z = t * (i ? -1.2 : 1.2); });
    }
  }
  if (objects.charges) {
    for (const c of objects.charges) {
      c.userData.core.rotation.y += dt * 2;
      c.position.y = c.userData.baseY + Math.sin(t * 3 + c.position.z) * 0.15;
    }
  }
  for (const n of objects.npcs) {
    n.position.y = Math.sin(t * 2 + n.position.x) * 0.05;
    if (n.userData.mark) n.userData.mark.position.y = 1.95 + Math.sin(t * 3) * 0.1;
  }
  if (objects.gondolas) {
    for (const g of objects.gondolas) {
      g.position.x = g.userData.baseX + Math.sin(t * 0.3 + g.userData.phase) * 6;
      g.position.y = 0.15 + Math.sin(t * 1.5 + g.userData.phase) * 0.08;
      g.rotation.y = Math.sin(t * 0.5 + g.userData.phase) * 0.1;
    }
  }
}
