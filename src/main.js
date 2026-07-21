// ============================================================
//  FUTUREME — orchestratore: schermate + creatore + gioco
// ============================================================
import * as THREE from "three";
import { Game } from "./game.js";
import { buildAvatar, animateAvatar } from "./character.js";
import { SPECIES, SEXES, OUTFITS, SKIN_COLORS, DIMENSIONS, TRAILS, OUTFIT_PRICES, ACHIEVEMENTS, FREE_OUTFITS } from "./data.js";
import { AudioManager } from "./audio.js";
import { Save } from "./save.js";
import { Profile } from "./progression.js";
import { setupTouch, isTouchDevice } from "./touch.js";
import * as UI from "./ui.js";

const $ = (id) => document.getElementById(id);
const audio = new AudioManager();
let touchUI = null;

// Storia raccontata nell'intro cinematografica
const STORY = [
  `Un tempo i tre mondi — <span class="accent">Terra</span>, <span class="accent">Luna</span> e <span class="sun">Sole</span> — vivevano in perfetto equilibrio, uniti da portali silenziosi.`,
  `Ma qualcosa si è incrinato. I portali si aprono da soli, e i mondi rischiano di <span class="warn">implodere</span> l'uno dentro l'altro.`,
  `Dalla <span class="accent">Luna</span>, dove regna la notte eterna, mostri e ombre premono per invadere la Terra.`,
  `E là, prigioniero, c'è il tuo <span class="accent">io parallelo</span>. Forse non è più te stesso... ma solo tu puoi salvarlo.`,
  `Attraversa le dimensioni, raccogli gli ingredienti della <span class="sun">pozione magica</span>, sconfiggi il Guardiano e riporta la luce.<br><br>La tua avventura comincia <b>ora</b>.`,
];
let storyIndex = 0;
const INTRO_KEY = "futureme_intro_seen";

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
  buildOutfitChips();
  buildColorChips();
  $("ctl-name").value = charConfig.name;
  $("ctl-name").oninput = (e) => (charConfig.name = e.target.value);
}

// Stili con lucchetto: quelli non posseduti mostrano il prezzo e si acquistano al volo
function buildOutfitChips() {
  const c = $("ctl-outfit");
  c.innerHTML = "";
  // se lo stile equipaggiato è bloccato, ripiega su uno gratuito
  if (!Profile.hasOutfit(charConfig.outfit)) charConfig.outfit = FREE_OUTFITS[0];
  for (const o of OUTFITS) {
    const owned = Profile.hasOutfit(o.id);
    const chip = document.createElement("div");
    chip.className = "chip" + (o.id === charConfig.outfit ? " active" : "") + (owned ? "" : " locked");
    chip.innerHTML = owned
      ? `<span class="em">${o.emoji}</span>${o.label}`
      : `<span class="em">${o.emoji}</span>${o.label} 🔒 ${OUTFIT_PRICES[o.id] || 0}`;
    chip.onclick = () => {
      if (!Profile.hasOutfit(o.id)) {
        const price = OUTFIT_PRICES[o.id] || 0;
        if (Profile.coins >= price) {
          UI.openDialog("Sblocca stile", `Vuoi sbloccare "${o.label}" per ${price} 🪙 monete?`, [
            { label: "Sblocca", primary: true, cb: () => { UI.closeDialog(); Profile.buyOutfit(o.id); charConfig.outfit = o.id; Profile.checkAchievements(); buildOutfitChips(); preview.rebuild(); UI.toast("Stile sbloccato!"); } },
            { label: "Annulla", cb: () => UI.closeDialog() },
          ]);
        } else {
          UI.toast(`Ti servono ${price} 🪙 — guadagna monete giocando!`, 2600);
        }
        return;
      }
      charConfig.outfit = o.id;
      buildOutfitChips();
      preview.rebuild();
    };
    c.appendChild(chip);
  }
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
const SCREENS = ["screen-title", "screen-intro", "screen-howto", "screen-creator", "screen-dimension", "screen-death", "screen-victory", "screen-pause", "screen-shop", "screen-achievements", "screen-leaderboard"];
function showScreen(id) {
  SCREENS.forEach((s) => UI.hide(s));
  if (id) UI.show(id);
  preview.setActive(id === "screen-creator");
}

// ============================================================
//  Avvio partita
// ============================================================
let game = null;

function ensureGame() {
  audio.init();
  audio.resume();
  if (!game) {
    game = new Game($("scene"), {
      onDeath: (state) => onDeath(state),
      onVictory: (state) => onVictory(state),
      onStateChange: (state) => { UI.updateHUD(state); Save.write(charConfig, state); },
      audio,
    });
    touchUI = setupTouch(game);
    window.__futuremeGame = game; // hook per debug/test
  }
  if (touchUI) { isTouchDevice() ? touchUI.show() : touchUI.hide(); }
}

function startGame(startDim) {
  showScreen(null);
  UI.hide("screen-dimension");
  UI.show("hud");
  ensureGame();
  UI.setQuest(null);
  game.start(charConfig);
  // se l'utente ha scelto una dimensione diversa dalla Terra, viaggia subito
  if (startDim && startDim !== "earth") {
    game.loadDimension(startDim, 1, `Inizi nella dimensione ${DIMENSIONS[startDim].name}`);
  }
  UI.updateHUD(game.state);
  UI.toast(`Benvenuto${charConfig.name ? ", " + charConfig.name : ""}! La tua avventura inizia.`, 3000);
}

function continueGame() {
  const save = Save.read();
  if (!save) return;
  Object.assign(charConfig, save.char);
  showScreen(null);
  UI.show("hud");
  ensureGame();
  UI.setQuest(null);
  game.start(charConfig, save.state);
  UI.updateHUD(game.state);
  UI.toast(`Bentornato${charConfig.name ? ", " + charConfig.name : ""}! Riprendi da ${DIMENSIONS[save.state.dim].name}.`, 3000);
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
  Save.clear();
  UI.hide("hud");
  const name = charConfig.name || "Eroe";
  $("victory-text").innerHTML =
    `${name}, hai liberato il tuo io imprigionato sulla Luna e lo hai portato nella luce del Sole.<br><br>` +
    `I portali sono sigillati, l'implosione dei mondi è scongiurata.`;
  drawShareCard(state);
  refreshTitleBar();
  showScreen("screen-victory");
}

// ============================================================
//  Wiring pulsanti
// ============================================================
let preview;

// ---------- Barra profilo (titolo) ----------
function refreshTitleBar() {
  $("tp-coins").textContent = Profile.coins;
  $("tp-rank").textContent = Profile.level;
  $("tp-ach").textContent = Profile.achievementsUnlockedCount();
  $("tp-ach-total").textContent = ACHIEVEMENTS.length;
  const b = Profile.profile.best;
  const parts = [];
  if (b.mostChallengesCleared > 0) parts.push(`Sfide completate (record): <b>${b.mostChallengesCleared}</b>`);
  if (b.fewestDeaths != null) parts.push(`Morti minime: <b>${b.fewestDeaths}</b>`);
  if (b.bestCombo > 0) parts.push(`Combo record: <b>x${b.bestCombo}</b>`);
  if (Profile.profile.victories > 0) parts.push(`Vittorie: <b>${Profile.profile.victories}</b>`);
  $("best-stats").innerHTML = parts.length ? "🏅 " + parts.join(" · ") : "";
}

// ---------- Negozio ----------
function buildShop() {
  $("shop-coins").textContent = Profile.coins;
  // Stili
  const og = $("shop-outfits");
  og.innerHTML = "";
  for (const o of OUTFITS) {
    const owned = Profile.hasOutfit(o.id);
    const price = OUTFIT_PRICES[o.id] || 0;
    const card = document.createElement("div");
    card.className = "shop-item";
    let btn;
    if (owned) btn = `<button class="owned">Sbloccato ✓</button>`;
    else if (Profile.coins >= price) btn = `<button data-buy-outfit="${o.id}">🪙 ${price}</button>`;
    else btn = `<button class="cant">🪙 ${price}</button>`;
    card.innerHTML = `<div class="si-emoji">${o.emoji}</div><div class="si-name">${o.label}</div>${btn}`;
    og.appendChild(card);
  }
  // Scie
  const tg = $("shop-trails");
  tg.innerHTML = "";
  for (const t of TRAILS) {
    const owned = Profile.hasTrail(t.id);
    const equipped = Profile.profile.equippedTrail === t.id;
    const card = document.createElement("div");
    card.className = "shop-item";
    const swatch = t.color != null
      ? `<div class="si-swatch" style="background:${t.rainbow ? "linear-gradient(90deg,#ff4d4d,#ffd35c,#4dd39a,#4df3ff,#b96bff)" : "#" + t.color.toString(16).padStart(6, "0")}"></div>`
      : `<div class="si-swatch" style="background:transparent;border:1px dashed #556"></div>`;
    let btn;
    if (equipped) btn = `<button class="equipped">Equipaggiata ✓</button>`;
    else if (owned) btn = `<button data-equip-trail="${t.id}">Equipaggia</button>`;
    else if (Profile.coins >= t.price) btn = `<button data-buy-trail="${t.id}">🪙 ${t.price}</button>`;
    else btn = `<button class="cant">🪙 ${t.price}</button>`;
    card.innerHTML = `<div class="si-name">${t.label}</div>${swatch}${btn}`;
    tg.appendChild(card);
  }
  // click handlers (delegati)
  og.querySelectorAll("[data-buy-outfit]").forEach((b) => b.onclick = () => {
    if (Profile.buyOutfit(b.dataset.buyOutfit)) { UI.toast("Stile sbloccato!"); afterPurchase(); }
  });
  tg.querySelectorAll("[data-buy-trail]").forEach((b) => b.onclick = () => {
    if (Profile.buyTrail(b.dataset.buyTrail)) { Profile.equipTrail(b.dataset.buyTrail); UI.toast("Scia sbloccata ed equipaggiata!"); afterPurchase(); }
  });
  tg.querySelectorAll("[data-equip-trail]").forEach((b) => b.onclick = () => {
    Profile.equipTrail(b.dataset.equipTrail); afterPurchase();
  });
}
function afterPurchase() {
  Profile.checkAchievements();
  buildShop(); refreshTitleBar();
  setupCreatorControls(); // aggiorna eventuali lucchetti
}

// ---------- Obiettivi ----------
function buildAchievements() {
  const grid = $("ach-grid");
  grid.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const unlocked = Profile.hasAchievement(a.id);
    const card = document.createElement("div");
    card.className = "ach-card " + (unlocked ? "unlocked" : "locked");
    card.innerHTML = `<div class="ac-icon">${unlocked ? a.icon : "🔒"}</div><div><div class="ac-name">${a.name}</div><div class="ac-desc">${a.desc}</div></div>`;
    grid.appendChild(card);
  }
}

// ---------- Classifica ----------
function buildLeaderboard() {
  const list = $("lb-list");
  list.innerHTML = "";
  const entries = Profile.leaderboard();
  if (!entries.length) { list.innerHTML = `<div class="lb-empty">Nessun risultato ancora. Gioca una partita per entrare in classifica!</div>`; return; }
  entries.forEach((e, i) => {
    const row = document.createElement("div");
    row.className = "lb-row" + (i === 0 ? " top" : "");
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
    row.innerHTML = `<div class="lb-rank">${medal}</div>
      <div class="lb-name">${e.name} ${e.won ? "🏆" : ""}<div class="lb-meta">Grado ${e.level} · ${e.date}</div></div>
      <div class="lb-score">${e.score} pt</div>`;
    list.appendChild(row);
  });
}

// ---------- Ricompensa giornaliera ----------
function maybeDailyReward() {
  if (!Profile.dailyAvailable()) return;
  const r = Profile.claimDaily();
  if (!r) return;
  refreshTitleBar();
  UI.openDialog("🎁 Ricompensa giornaliera",
    `Bentornato! Hai ricevuto ${r.coins} 🪙 monete.\nSerie di accessi: ${r.streak} ${r.streak > 1 ? "giorni" : "giorno"} di fila. Torna domani per una ricompensa più grande!`,
    [{ label: "Grazie!", primary: true, cb: () => UI.closeDialog() }]);
}

// ---------- Card condivisibile (vittoria) ----------
function drawShareCard(state) {
  const c = $("share-card"); if (!c) return;
  const ctx = c.getContext("2d");
  const W = c.width, H = c.height;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0a0f2a"); g.addColorStop(0.5, "#241046"); g.addColorStop(1, "#3a1030");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stelle
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 60; i++) { ctx.globalAlpha = Math.random(); ctx.fillRect(Math.random() * W, Math.random() * H * 0.7, 2, 2); }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.fillStyle = "#4df3ff"; ctx.font = "bold 20px 'Trebuchet MS', sans-serif";
  ctx.fillText("FUTUREME — Le Tre Dimensioni", W / 2, 44);
  ctx.fillStyle = "#ffd35c"; ctx.font = "900 40px 'Trebuchet MS', sans-serif";
  ctx.fillText("HO SALVATO I MONDI", W / 2, 100);
  ctx.fillStyle = "#eaf2ff"; ctx.font = "18px 'Trebuchet MS', sans-serif";
  const name = charConfig.name || "Un eroe";
  ctx.fillText(`${name} · Grado ${Profile.level}`, W / 2, 138);
  ctx.font = "22px 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#cfe0ff";
  const stats = [
    `💀 Morti: ${state.deaths}`,
    `🔒 Portali sigillati: ${state.portalsClosed}`,
    `👹 Guardiani sconfitti: ${Profile.profile.bossDefeats}`,
    `🪙 Monete: ${Profile.coins}`,
  ];
  stats.forEach((s, i) => ctx.fillText(s, W / 2, 186 + i * 30));
  ctx.fillStyle = "#8ea2d6"; ctx.font = "14px 'Trebuchet MS', sans-serif";
  ctx.fillText("Riesci a fare di meglio? #FUTUREME", W / 2, H - 18);
}

function downloadShareCard() {
  const c = $("share-card"); if (!c) return;
  try {
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = "futureme-vittoria.png";
    document.body.appendChild(a); a.click(); a.remove();
    UI.toast("Card salvata! Condividila con #FUTUREME");
  } catch (e) { UI.toast("Impossibile salvare la card qui."); }
}

function refreshContinueButton() {
  const btn = $("btn-continue");
  if (Save.has()) btn.classList.remove("hidden");
  else btn.classList.add("hidden");
}

// ---------- Intro cinematografica ----------
function showIntro() {
  storyIndex = 0;
  renderStorySlide();
  showScreen("screen-intro");
}
function renderStorySlide() {
  const slide = $("intro-slide");
  slide.innerHTML = STORY[storyIndex];
  slide.classList.remove("show"); void slide.offsetWidth; slide.classList.add("show");
  $("btn-intro-next").textContent = storyIndex >= STORY.length - 1 ? "Crea il tuo personaggio →" : "Avanti →";
  const dots = $("intro-dots");
  dots.innerHTML = "";
  for (let i = 0; i < STORY.length; i++) {
    const d = document.createElement("div");
    d.className = "dot" + (i === storyIndex ? " on" : "");
    dots.appendChild(d);
  }
}
function nextStorySlide() {
  if (storyIndex >= STORY.length - 1) { finishIntro(); return; }
  storyIndex++;
  renderStorySlide();
}
function finishIntro() {
  try { localStorage.setItem(INTRO_KEY, "1"); } catch (e) {}
  showScreen("screen-creator");
}

function init() {
  preview = new CreatorPreview($(".creator-right") || document.querySelector(".creator-right"));
  setupCreatorControls();
  buildDimensionCards();

  $("btn-start").onclick = () => {
    audio.init();
    // mostra l'intro solo la prima volta; poi si può rivedere con "La storia"
    let seen = false;
    try { seen = localStorage.getItem(INTRO_KEY) === "1"; } catch (e) {}
    if (seen) showScreen("screen-creator"); else showIntro();
  };
  $("btn-continue").onclick = () => continueGame();
  $("btn-story").onclick = () => { audio.init(); showIntro(); };
  $("btn-intro-next").onclick = () => nextStorySlide();
  $("btn-intro-skip").onclick = () => finishIntro();

  $("btn-mute").onclick = () => {
    const muted = audio.toggleMute();
    $("btn-mute").textContent = muted ? "🔇" : "🔊";
  };

  $("btn-shop").onclick = () => { buildShop(); showScreen("screen-shop"); };
  $("btn-shop-back").onclick = () => { showScreen("screen-title"); refreshTitleBar(); };
  $("btn-achievements").onclick = () => { buildAchievements(); showScreen("screen-achievements"); };
  $("btn-ach-back").onclick = () => showScreen("screen-title");
  $("btn-leaderboard").onclick = () => { buildLeaderboard(); showScreen("screen-leaderboard"); };
  $("btn-lb-back").onclick = () => showScreen("screen-title");
  $("btn-share").onclick = () => downloadShareCard();

  // mostra "Continua" se esiste un salvataggio
  refreshContinueButton();
  refreshTitleBar();
  maybeDailyReward();
  $("btn-howto").onclick = () => showScreen("screen-howto");
  $("btn-howto-back").onclick = () => showScreen("screen-title");
  $("btn-creator-back").onclick = () => showScreen("screen-title");
  $("btn-to-dimension").onclick = () => showScreen("screen-dimension");
  $("btn-dimension-back").onclick = () => showScreen("screen-creator");

  $("btn-respawn").onclick = () => { showScreen(null); UI.show("hud"); game.respawn(); };
  $("btn-restart").onclick = () => { showScreen("screen-creator"); };

  $("btn-pause").onclick = () => { game.pause(); UI.hide("hud"); showScreen("screen-pause"); };
  $("btn-resume").onclick = () => { showScreen(null); UI.show("hud"); audio.resume(); game.resume(); };
  $("btn-quit").onclick = () => { game.pause(); UI.hide("hud"); refreshContinueButton(); refreshTitleBar(); showScreen("screen-title"); };

  // Esc = pausa
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && game && game.running) {
      game.pause(); UI.hide("hud"); showScreen("screen-pause");
    }
  });

  showScreen("screen-title");
}

init();
