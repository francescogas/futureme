// ============================================================
//  FUTUREME — meteo dinamico (pioggia, neve, nebbia, sabbia)
// ============================================================
import * as THREE from "three";

const rand = (a, b) => a + Math.random() * (b - a);

// Meteo possibili per ogni città/dimensione, con pesi (probabilità relative)
const WEATHER_TABLE = {
  roma:    [["clear", 6], ["cloudy", 2], ["rain", 1]],
  tokyo:   [["clear", 3], ["rain", 4], ["fog", 2]],
  newyork: [["clear", 4], ["rain", 2], ["snow", 2], ["fog", 1]],
  venezia: [["clear", 4], ["fog", 3], ["rain", 2]],
  parigi:  [["clear", 4], ["rain", 3], ["cloudy", 2]],
  cairo:   [["clear", 6], ["sand", 3]],
  moon:    [["fog", 4], ["clear", 2], ["rain", 1]],
  sun:     [["clear", 8], ["cloudy", 1]],
};

const LABELS = {
  clear:  { emoji: "☀️", name: "Sereno" },
  cloudy: { emoji: "⛅", name: "Nuvoloso" },
  rain:   { emoji: "🌧️", name: "Pioggia" },
  snow:   { emoji: "❄️", name: "Neve" },
  fog:    { emoji: "🌫️", name: "Nebbia" },
  sand:   { emoji: "🌪️", name: "Tempesta di sabbia" },
};

// Effetti sul gameplay: moveMul = velocità del giocatore, monsterRangeMul = raggio
// con cui i mostri ti individuano; hint = frase mostrata all'arrivo.
const MODS = {
  clear:  { moveMul: 1.0,  monsterRangeMul: 1.0,  hint: "" },
  cloudy: { moveMul: 1.0,  monsterRangeMul: 1.0,  hint: "" },
  rain:   { moveMul: 0.95, monsterRangeMul: 0.85, hint: "La pioggia attutisce i tuoi passi." },
  snow:   { moveMul: 0.78, monsterRangeMul: 1.0,  hint: "La neve rallenta i tuoi movimenti." },
  fog:    { moveMul: 1.0,  monsterRangeMul: 0.55, hint: "Nella nebbia i mostri ti vedono a fatica." },
  sand:   { moveMul: 0.75, monsterRangeMul: 0.7,  hint: "La sabbia rallenta e riduce la visibilità." },
};

function weightedPick(table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of table) { if ((r -= w) <= 0) return k; }
  return table[0][0];
}

export class Weather {
  // key = id città o dimensione; worldRoot = gruppo pulito a ogni cambio scena
  constructor(scene, worldRoot, key, theme) {
    this.scene = scene;
    this.type = weightedPick(WEATHER_TABLE[key] || WEATHER_TABLE.sun);
    this.particles = null;
    this.velocities = null;
    this.night = !!theme.night;
    this._build(worldRoot, theme);
  }

  get label() { return LABELS[this.type]; }
  get mods() { return MODS[this.type] || MODS.clear; }

  _build(worldRoot, theme) {
    // nebbia: intensifica la nebbia della scena
    if (this.type === "fog") {
      if (this.scene.fog) { this.scene.fog.near = 6; this.scene.fog.far = Math.min(this.scene.fog.far, 42); }
      this._addFogPlanes(worldRoot);
      return;
    }
    if (this.type === "sand") {
      if (this.scene.fog) { this.scene.fog.near = 8; this.scene.fog.far = Math.min(this.scene.fog.far, 55); this.scene.fog.color.setHex(0xd9b46a); }
      this._addParticles(worldRoot, { count: 1400, color: 0xe3c98a, size: 0.4, fallY: -2, driftX: 14, box: 70, op: 0.55 });
      return;
    }
    if (this.type === "rain") {
      this._addParticles(worldRoot, { count: 2200, color: this.night ? 0xaec4ff : 0x9fb4cc, size: 0.22, fallY: -30, driftX: 1.5, box: 60, op: 0.75 });
      return;
    }
    if (this.type === "snow") {
      this._addParticles(worldRoot, { count: 1000, color: 0xffffff, size: 0.35, fallY: -3.5, driftX: 2.5, box: 60, op: 0.9, sway: true });
      return;
    }
    if (this.type === "cloudy") {
      this._addClouds(worldRoot);
    }
    // clear: niente
  }

  _addParticles(worldRoot, o) {
    const n = o.count;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-o.box, o.box);
      pos[i * 3 + 1] = rand(0, 45);
      pos[i * 3 + 2] = rand(-o.box, o.box);
      vel[i] = rand(0.7, 1.3);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: o.color, size: o.size, transparent: true, opacity: o.op,
      depthWrite: false, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    worldRoot.add(pts);
    this.particles = pts;
    this.velocities = vel;
    this.opts = o;
    this.box = o.box;
  }

  _addFogPlanes(worldRoot) {
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(
        new THREE.PlaneGeometry(rand(14, 26), rand(14, 26)),
        new THREE.MeshBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.05, depthWrite: false })
      );
      p.rotation.x = -Math.PI / 2;
      p.position.set(rand(-40, 40), rand(1, 5), rand(-40, 40));
      worldRoot.add(p);
    }
  }

  _addClouds(worldRoot) {
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(rand(3, 6), 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 1, transparent: true, opacity: 0.75 })
      );
      cloud.scale.set(1.6, 0.5, 1.2);
      cloud.position.set(rand(-45, 45), rand(26, 36), rand(-45, 45));
      worldRoot.add(cloud);
    }
  }

  update(dt, t) {
    if (!this.particles) return;
    const o = this.opts;
    const arr = this.particles.geometry.attributes.position.array;
    const n = this.velocities.length;
    for (let i = 0; i < n; i++) {
      const iy = i * 3 + 1;
      arr[iy] += o.fallY * this.velocities[i] * dt;
      if (o.driftX) arr[i * 3] += (o.sway ? Math.sin(t * 2 + i) : 1) * o.driftX * dt * 0.2;
      if (arr[iy] < 0) { // ricicla in cima
        arr[iy] = rand(38, 45);
        arr[i * 3] = rand(-this.box, this.box);
        arr[i * 3 + 2] = rand(-this.box, this.box);
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }
}
