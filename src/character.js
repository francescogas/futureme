// ============================================================
//  FUTUREME — costruzione avatar 3D procedurale
//  Nessun modello esterno: tutto costruito da primitive Three.js
// ============================================================
import * as THREE from "three";
import { OUTFITS, SPECIES, SKIN_COLORS } from "./data.js";

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.7,
    metalness: opts.metal ?? 0.1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

/**
 * Costruisce un THREE.Group che rappresenta il personaggio.
 * config = { species, sex, outfit, skin, name }
 * Ritorna { group, parts } dove parts contiene riferimenti animabili.
 */
export function buildAvatar(config) {
  const species = SPECIES.find((s) => s.id === config.species) || SPECIES[0];
  const outfit = OUTFITS.find((o) => o.id === config.outfit) || OUTFITS[0];
  const skinColor = (SKIN_COLORS.find((s) => s.id === config.skin) || SKIN_COLORS[0]).value;
  const isFemale = config.sex === "female";

  const group = new THREE.Group();
  const parts = {};

  const skinMat = mat(skinColor, { rough: 0.85 });
  const torsoMat = mat(outfit.torso, { rough: 0.55, metal: 0.25 });
  const legMat = mat(outfit.legs, { rough: 0.6 });
  const accentMat = mat(outfit.accent, {
    rough: 0.4, metal: 0.4,
    emissive: outfit.glow, emissiveIntensity: outfit.glow ? 0.6 : 0,
  });
  const hairMat = mat(outfit.hair, { rough: 0.9 });

  // ---- Bacino / hips ----
  const hipW = isFemale ? 0.62 : 0.56;
  const hips = new THREE.Mesh(new THREE.BoxGeometry(hipW, 0.28, 0.34), legMat);
  hips.position.y = 0.98;
  group.add(hips);

  // ---- Torso ----
  const torsoW = isFemale ? 0.5 : 0.62;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW, 0.62, 0.34), torsoMat);
  torso.position.y = 1.42;
  group.add(torso);
  parts.torso = torso;

  // dettaglio accent sul petto (emblema tipo supereroe per il futuristico)
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.11, 6), accentMat);
  emblem.position.set(0, 1.5, 0.18);
  group.add(emblem);

  // ---- Spalline / shoulders (rock, punk, future) ----
  if (outfit.shoulders) {
    for (const sx of [-1, 1]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.36), accentMat);
      pad.position.set(sx * (torsoW / 2 + 0.02), 1.66, 0);
      group.add(pad);
    }
  }

  // ---- Mantello / cape (future) ----
  if (outfit.cape) {
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), mat(outfit.torso, { rough: 0.4, metal: 0.3 }));
    cape.material.side = THREE.DoubleSide;
    cape.position.set(0, 1.25, -0.2);
    cape.rotation.x = 0.12;
    group.add(cape);
    parts.cape = cape;
  }

  // ---- Braccia ----
  parts.arms = [];
  for (const sx of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(sx * (torsoW / 2 + 0.09), 1.68, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.34, 4, 8), torsoMat);
    upper.position.y = -0.22;
    armPivot.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), skinMat);
    hand.position.y = -0.46;
    armPivot.add(hand);
    group.add(armPivot);
    parts.arms.push(armPivot);
  }

  // ---- Gambe ----
  parts.legs = [];
  for (const sx of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(sx * 0.16, 0.9, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), legMat);
    leg.position.y = -0.32;
    legPivot.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), accentMat);
    foot.position.set(0, -0.62, 0.05);
    legPivot.add(foot);
    group.add(legPivot);
    parts.legs.push(legPivot);
  }

  // ---- Testa ----
  const head = new THREE.Group();
  head.position.y = 1.92;
  group.add(head);
  parts.head = head;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
  head.add(skull);

  // occhi
  for (const sx of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0xffffff, { rough: 0.3 }));
    eyeWhite.position.set(sx * 0.09, 0.03, 0.2);
    head.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), mat(0x101018));
    pupil.position.set(sx * 0.09, 0.03, 0.24);
    head.add(pupil);
  }

  // muso per animali
  if (species.muzzle) {
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), skinMat);
    muzzle.scale.set(1, 0.75, 1.1);
    muzzle.position.set(0, -0.05, 0.2);
    head.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mat(0x2a2a2a));
    nose.position.set(0, -0.03, 0.31);
    head.add(nose);
  }

  // orecchie
  if (species.ears === "cat") {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), skinMat);
      ear.position.set(sx * 0.13, 0.24, 0);
      head.add(ear);
    }
  } else if (species.ears === "dog") {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), skinMat);
      ear.position.set(sx * 0.2, 0.06, 0);
      ear.rotation.z = sx * 0.4;
      head.add(ear);
    }
  }

  // capelli (solo umani, o ciuffo)
  if (species.id === "human") {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 0.05;
    head.add(hair);
    if (isFemale) {
      const pony = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.35, 4, 8), hairMat);
      pony.position.set(0, -0.05, -0.22);
      head.add(pony);
    }
    // cresta punk
    if (config.outfit === "punk") {
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.34), mat(outfit.hair, { emissive: outfit.glow, emissiveIntensity: 0.5 }));
      crest.position.y = 0.24;
      head.add(crest);
    }
  }

  // ---- Coda per animali ----
  if (species.tail) {
    const tail = new THREE.Group();
    tail.position.set(0, 0.95, -0.2);
    const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), skinMat);
    t1.position.y = -0.2;
    t1.rotation.x = -0.5;
    tail.add(t1);
    group.add(tail);
    parts.tail = tail;
  }

  // aura al suolo per stili con glow
  if (outfit.glow) {
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 24),
      new THREE.MeshBasicMaterial({ color: outfit.glow, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.02;
    group.add(aura);
    parts.aura = aura;
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return { group, parts };
}

/**
 * Anima le membra del personaggio in base alla velocità (walk cycle).
 */
export function animateAvatar(parts, t, speed) {
  const swing = Math.sin(t * 9) * Math.min(speed * 2.4, 0.9);
  if (parts.legs) {
    parts.legs[0].rotation.x = swing;
    parts.legs[1].rotation.x = -swing;
  }
  if (parts.arms) {
    parts.arms[0].rotation.x = -swing * 0.8;
    parts.arms[1].rotation.x = swing * 0.8;
  }
  if (parts.tail) parts.tail.rotation.z = Math.sin(t * 4) * 0.2;
  if (parts.cape) parts.cape.rotation.x = 0.12 + Math.sin(t * 6) * 0.05 + speed * 0.4;
  if (parts.head) parts.head.rotation.z = Math.sin(t * 4.5) * 0.03;
  if (parts.aura) {
    parts.aura.rotation.z = t * 0.6;
    parts.aura.material.opacity = 0.25 + Math.sin(t * 3) * 0.1;
  }
}
