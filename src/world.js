// ============================================================
//  FUTUREME — generazione procedurale dei mondi
// ============================================================
import * as THREE from "three";
import { CITIES, ITEMS } from "./data.js";

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
export function makeMonster(kind, x, z) {
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
  g.position.set(x, 0, z);
  g.userData = { kind: "monster", type: kind, head, speed: rand(1.6, 2.8), baseY: 0, hp: 2 };
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
        o.material.emissive = new THREE.Color(0xff1030);
        o.material.emissiveIntensity = 0.4;
        o.material.color.multiplyScalar(0.55);
      }
    }
  });
  clone.userData = { kind: "alter", evil };
  return clone;
}

// ============================================================
//  Costruzione di una dimensione completa
// ============================================================
export function buildDimension(dimId, level) {
  const root = new THREE.Group();
  const objects = { items: [], portals: [], npcs: [], monsters: [], colliders: [] };
  const SIZE = 60;

  let groundColor, cityName = null;
  if (dimId === "earth") {
    const city = CITIES[(level - 1) % CITIES.length];
    cityName = city.name;
    groundColor = city.ground;
    buildCity(root, city, objects, SIZE);
  } else if (dimId === "moon") {
    groundColor = 0x1a1a2e;
    buildMoon(root, objects, SIZE, level);
  } else {
    groundColor = 0xf4e2a8;
    buildSun(root, objects, SIZE, level);
  }

  // Suolo
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(SIZE, 48),
    stdMat(groundColor, { rough: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // Bordo (confine invisibile visualizzato)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(SIZE, 0.6, 8, 64),
    stdMat(dimId === "moon" ? 0x3a3a6a : 0xffffff, { emissive: dimId === "moon" ? 0x2a2a5a : 0x000000, ei: 0.4 })
  );
  rim.rotation.x = -Math.PI / 2;
  root.add(rim);

  return { root, objects, cityName, size: SIZE };
}

function addBuilding(root, colliders, x, z, w, h, d, color, emissive) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(color, { rough: 0.8, emissive: emissive || 0x000000, ei: emissive ? 0.25 : 0 }));
  b.position.set(x, h / 2, z);
  b.castShadow = true; b.receiveShadow = true;
  root.add(b);
  colliders.push({ x, z, r: Math.max(w, d) * 0.62 });
  // finestre luminose (di sera)
  if (emissive) {
    for (let i = 0; i < 6; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.8 }));
      win.position.set(x + rand(-w / 2 + 0.4, w / 2 - 0.4), rand(1, h - 1), z + d / 2 + 0.01);
      root.add(win);
    }
  }
  return b;
}

function buildCity(root, city, objects, SIZE) {
  const emissive = ["tokyo", "newyork"].includes(city.id);
  // grid di edifici
  for (let i = 0; i < 40; i++) {
    const a = rand(0, Math.PI * 2);
    const r = rand(8, SIZE - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = rand(3, city.id === "newyork" ? 16 : 9);
    const w = rand(2.5, 4.5), d = rand(2.5, 4.5);
    addBuilding(root, objects.colliders, x, z, w, h, d, city.building, emissive ? 0x333355 : null);
  }
  // landmark centrale
  buildLandmark(root, objects.colliders, city.landmark, city.building);
}

function buildLandmark(root, colliders, type, color) {
  if (type === "eiffel") {
    const t = new THREE.Mesh(new THREE.ConeGeometry(2.4, 14, 4, 1, true), stdMat(0x8a6b3a, { metal: 0.4, rough: 0.5 }));
    t.position.set(0, 7, -18); root.add(t);
    colliders.push({ x: 0, z: -18, r: 2.6 });
  } else if (type === "colosseo") {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 4, 24, 1, true), stdMat(0xcaa46b, { rough: 0.9 }));
    t.material.side = THREE.DoubleSide;
    t.position.set(0, 2, -18); root.add(t);
    colliders.push({ x: 0, z: -18, r: 4.4 });
  } else if (type === "pyramid") {
    const t = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 4), stdMat(0xd8b878, { rough: 1 }));
    t.position.set(0, 4, -18); root.add(t);
    colliders.push({ x: 0, z: -18, r: 6 });
  } else if (type === "tower") {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 16, 8), stdMat(0xff5a5a, { emissive: 0xff3030, ei: 0.3 }));
    t.position.set(0, 8, -18); root.add(t);
    colliders.push({ x: 0, z: -18, r: 1.4 });
  } else if (type === "canal") {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), stdMat(0x2f6f8f, { metal: 0.6, rough: 0.2 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, -14); root.add(water);
  } else { // skyscraper
    const t = new THREE.Mesh(new THREE.BoxGeometry(4, 22, 4), stdMat(0x5a6478, { emissive: 0x333355, ei: 0.25 }));
    t.position.set(0, 11, -18); root.add(t);
    colliders.push({ x: 0, z: -18, r: 3 });
  }
}

function buildMoon(root, objects, SIZE, level) {
  // rocce e strutture cupe
  for (let i = 0; i < 24; i++) {
    const a = rand(0, Math.PI * 2), r = rand(8, SIZE - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = rand(2, 7);
    addBuilding(root, objects.colliders, x, z, rand(2, 4), h, rand(2, 4), 0x2a2a44, 0x2a2a5a);
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
    addBuilding(root, objects.colliders, x, z, rand(2.5, 4), rand(3, 7), rand(2.5, 4), pick(happy), null);
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
  for (const n of objects.npcs) {
    n.position.y = Math.sin(t * 2 + n.position.x) * 0.05;
    if (n.userData.mark) n.userData.mark.position.y = 1.95 + Math.sin(t * 3) * 0.1;
  }
}
