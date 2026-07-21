// ============================================================
//  FUTUREME — orchestratore: schermate + creatore + gioco
// ============================================================
import * as THREE from "three";
import { Game } from "./game.js";
import { buildAvatar, animateAvatar } from "./character.js";
import { SPECIES, SEXES, OUTFITS, SKIN_COLORS, DIMENSIONS } from "./data.js";
import * as UI from "./ui.js";

const $ = (id) => document.getElementById(id);

// ---------- Config personaggio corrente ----------
const charConfig = {
  species: "human",
  sex: "male",
  outfit: "future",
  skin: "s1",
  name: "",
};

// ============================================================
//  Anteprima 3D del creatore
// ============================================================
class CreatorPreview {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.borderRadius = "20px";
    this.canvas.style.cursor = "grab";
    container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 1.6, 5);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 6, 4); key.castShadow = true; this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x4df3ff, 0.6);
    rim.position.set(-4, 3, -3); this.scene.add(rim);

    // piano
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x141a34, roughness: 0.6, metalness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.scene.add(floor);
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.4, 48),
      new THREE.MeshBasicMaterial({ color: 0x4df3ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = 0.01; this.scene.add(glowRing);

    this.avatarGroup = null;
    this.parts = null;
    this.rotY = 0.4;
    this.autoRotate = true;

    // drag per ruotare
    let dragging = false, lastX = 0;
    this.canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; this.autoRotate = false; this.canvas.style.cursor = "grabbing"; });
    window.addEventListener("pointerup", () => { dragging = false; this.canvas.style.cursor = "grab"; });
    window.addEventListener("pointermove", (e) => { if (dragging) { this.rotY += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });

    this.clock = new THREE.Clock();
    this._resize();
    window.addEventListener("resize", () => this._resize());
    this.active = false;
    this._loop();
  }

  _resize() {
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  rebuild() {
    if (this.avatarGroup) this.scene.remove(this.avatarGroup);
    const built = buildAvatar(charConfig);
    this.avatarGroup = built.group;
    this.parts = built.parts;
    this.scene.add(this.avatarGroup);
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    if (!this.active) return;
    const t = this.clock.getElapsedTime();
    if (this.autoRotate) this.rotY += 0.006;
    if (this.avatarGroup) {
      this.avatarGroup.rotation.y = this.rotY;
      animateAvatar(this.parts, t, 0.15); // leggero "respiro"
      this.avatarGroup.position.y = Math.sin(t * 1.5) * 0.03;
    }
    this.renderer.render(this.scene, this.camera);
  }

  setActive(v) { this.active = v; if (v) { this._resize(); this.rebuild(); } }
}

// ============================================================
//  Costruzione controlli del creatore
// ============================================================
function buildChips(containerId, list, current, onPick, renderLabel) {
  const c = $(containerId);
  c.innerHTML = "";
  for (const item of list) {
    const chip = document.createElement("div");
    chip.className = "chip" + (item.id === current() ? " active" : "");
    chip.innerHTML = renderLabel(item);
    chip.onclick = () => {
      onPick(item.id);
      [...c.children].forEach((ch) => ch.classList.remove("active"));
      chip.classList.add("active");
      preview.rebuild();
    };
    c.appendChild(chip);
  }
}

function buildColorChips() {
  const c = $("ctl-color");
  c.innerHTML = "";
  for (const col of SKIN_COLORS) {
    const chip = document.createElement("div");
    chip.className = "chip color-chip" + (col.id === charConfig.skin ? " active" : "");
    chip.style.background = "#" + col.value.toString(16).padStart(6, "0");
    chip.onclick = () => {
      charConfig.skin = col.id;
      [...c.children].forEach((ch) => ch.classList.remove("active"));
      chip.classList.add("active");
      preview.rebuild();
    };
    c.appendChild(chip);
  }
}

function setupCreatorControls() {
  buildChips("ctl-species", SPECIES, () => charConfig.species,
    (id) => (charConfig.species = id), (s) => `<span class="em">${s.emoji}</span>${s.label}`);
  buildChips("ctl-sex", SEXES, () => charConfig.sex,
    (id) => (charConfig.sex = id), (s) => `<span class="em">${s.emoji}</span>${s.label}`);
  buildChips("ctl-outfit", OUTFITS, () => charConfig.outfit,
    (id) => (charConfig.outfit = id), (o) => `<span class="em">${o.emoji}</span>${o.label}`);
  buildColorChips();
  $("ctl-name").value = charConfig.name;
  $("ctl-name").oninput = (e) => (charConfig.name = e.target.value);
}

// ============================================================
//  Selezione dimensione
// ============================================================
function buildDimensionCards() {
  const c = $("dim-cards");
  c.innerHTML = "";
  const cls = { earth: "earth", moon: "moon", sun: "sun" };
  for (const d of Object.values(DIMENSIONS)) {
    const card = document.createElement("div");
    card.className = "dim-card " + cls[d.id];
    card.innerHTML = `<span class="dim-emoji">${d.emoji}</span><h3>${d.name}</h3><p>${d.desc}</p>`;
    card.onclick = () => startGame(d.id);
    c.appendChild(card);
  }
}

// ============================================================
//  Gestione schermate
// ============================================================
const SCREENS = ["screen-title", "screen-howto", "screen-creator", "screen-dimension", "screen-death", "screen-victory", "screen-pause"];
function showScreen(id) {
  SCREENS.forEach((s) => UI.hide(s));
  if (id) UI.show(id);
  preview.setActive(id === "screen-creator");
}

// ============================================================
//  Avvio partita
// ============================================================
let game = null;

function startGame(startDim) {
  showScreen(null);
  UI.hide("screen-dimension");
  UI.show("hud");
  if (!game) {
    game = new Game($("scene"), {
      onDeath: (state) => onDeath(state),
      onVictory: (state) => onVictory(state),
      onStateChange: (state) => UI.updateHUD(state),
    });
  }
  game.start(charConfig);
  // se l'utente ha scelto una dimensione diversa dalla Terra, viaggia subito
  if (startDim && startDim !== "earth") {
    game.loadDimension(startDim, 1, `Inizi nella dimensione ${DIMENSIONS[startDim].name}`);
  }
  UI.updateHUD(game.state);
  UI.toast(`Benvenuto${charConfig.name ? ", " + charConfig.name : ""}! La tua avventura inizia.`, 3000);
}

function onDeath(state) {
  $("death-challenges").textContent = state.challenges;
  UI.updateHUD(state);
  const texts = [
    "I mondi vacillano... ma la tua storia non è finita.",
    "Sei caduto nell'oscurità. Rialzati e riprova.",
    "Il tuo io parallelo ha ancora bisogno di te.",
  ];
  $("death-text").textContent = texts[Math.floor(Math.random() * texts.length)];
  UI.hide("hud");
  showScreen("screen-death");
}

function onVictory(state) {
  UI.hide("hud");
  const name = charConfig.name || "Eroe";
  $("victory-text").innerHTML =
    `${name}, hai liberato il tuo io imprigionato sulla Luna e lo hai portato nella luce del Sole.<br><br>` +
    `I portali sono sigillati, l'implosione dei mondi è scongiurata.<br><br>` +
    `Morti: <b>${state.deaths}</b> · Portali sigillati: <b>${state.portalsClosed}</b> · Sfide rimaste: <b>${state.challenges}</b>`;
  showScreen("screen-victory");
}

// ============================================================
//  Wiring pulsanti
// ============================================================
let preview;

function init() {
  preview = new CreatorPreview($(".creator-right") || document.querySelector(".creator-right"));
  setupCreatorControls();
  buildDimensionCards();

  $("btn-start").onclick = () => showScreen("screen-creator");
  $("btn-howto").onclick = () => showScreen("screen-howto");
  $("btn-howto-back").onclick = () => showScreen("screen-title");
  $("btn-creator-back").onclick = () => showScreen("screen-title");
  $("btn-to-dimension").onclick = () => showScreen("screen-dimension");
  $("btn-dimension-back").onclick = () => showScreen("screen-creator");

  $("btn-respawn").onclick = () => { showScreen(null); UI.show("hud"); game.respawn(); };
  $("btn-restart").onclick = () => { showScreen("screen-creator"); };

  $("btn-pause").onclick = () => { game.pause(); UI.hide("hud"); showScreen("screen-pause"); };
  $("btn-resume").onclick = () => { showScreen(null); UI.show("hud"); game.resume(); };
  $("btn-quit").onclick = () => { game.pause(); UI.hide("hud"); showScreen("screen-title"); };

  // Esc = pausa
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && game && game.running) {
      game.pause(); UI.hide("hud"); showScreen("screen-pause");
    }
  });

  showScreen("screen-title");
}

init();
