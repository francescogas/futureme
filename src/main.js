// ============================================================
//  FUTUREME — orchestratore: schermate + creatore + gioco
// ============================================================
import * as THREE from "three";
import { Game } from "./game.js";
import { buildAvatar, animateAvatar } from "./character.js";
import { SPECIES, SEXES, OUTFITS, SKIN_COLORS, DIMENSIONS, TRAILS, OUTFIT_PRICES, ACHIEVEMENTS, FREE_OUTFITS, EMOTES, UPGRADES } from "./data.js";
import { AudioManager } from "./audio.js";
import { Save } from "./save.js";
import { Profile, todayChallenge } from "./progression.js";
import { setupTouch, isTouchDevice } from "./touch.js";
import { Net } from "./net.js";
import { t, LANGS, getLang, setLang, applyStaticTranslations } from "./i18n.js";
import * as UI from "./ui.js";

const $ = (id) => document.getElementById(id);
const audio = new AudioManager();
let touchUI = null;
let selectedDaily = null; // sfida del giorno scelta per la prossima partita
let selectedMode = null;  // null = avventura; "survival" = sopravvivenza

// ---------- Multiplayer ----------
let net = null;
function ensureNet() {
  if (net) return net;
  net = new Net({
    onStatus: (s, info) => {
      const el = $("mp-status");
      if (s === "connected") { el.textContent = "✅ Connesso!"; el.className = "mp-status ok"; $("btn-mp-connect").classList.add("hidden"); $("btn-mp-disconnect").classList.remove("hidden"); }
      else if (s === "disconnected") { el.textContent = "Disconnesso"; el.className = "mp-status"; $("btn-mp-connect").classList.remove("hidden"); $("btn-mp-disconnect").classList.add("hidden"); UI.showMultiplayerHud(false); }
      else { el.textContent = "⚠️ " + (info || "Errore di connessione"); el.className = "mp-status err"; }
    },
    onWelcome: (peers) => { if (game) game.onWelcome(peers); UI.setOnlineCount(peers.length + 1); UI.showMultiplayerHud(true); },
    onPeerJoin: (p) => { if (game) game.addRemote(p); UI.addChatMessage("", `${p.name} è entrato in questa dimensione`, true); },
    onPeerMove: (id, d) => { if (game) game.moveRemote(id, d); },
    onPeerLeave: (id) => { if (game) game.removeRemote(id); },
    onChat: (m) => { UI.addChatMessage(m.name, escapeHtml(m.text)); },
    onEmote: (m) => { if (game) game.showRemoteEmote(m.id, m.emote); },
    onCount: (n) => { UI.setOnlineCount(n); },
  });
  if (game) game.net = net;
  return net;
}
function escapeHtml(s) { return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// ---------- Tutorial guidato (prima partita) ----------
const TUTORIAL_KEY = "futureme_tutorial_seen";
const TUTORIAL_STEPS = [
  `👋 Benvenuto! Muoviti con <b>WASD</b> (o il joystick su mobile) e trascina il <b>mouse</b> per guardarti intorno.`,
  `🔑 Raccogli <b>chiavi</b> e 🛂 <b>passaporti</b>: brillano sul <b>radar</b> in basso a destra. Servono per aprire i portali.`,
  `🌀 Avvicinati a un <b>portale</b> luminoso e premi <b>E</b> per viaggiare in un altro mondo.`,
  `🌙 Sulla <b>Luna</b> difenditi dai mostri e cerca la <b>🔮 Sfera del Veggente</b> (tasto <b>Q</b>) per rivelarli. In alto puoi usare le <b>🙂 emote</b>. Buona avventura!`,
];
let tutStep = -1;
let tutPrevInv = 0, tutPrevDim = "earth";

function tutorialSeen() { try { return localStorage.getItem(TUTORIAL_KEY) === "1"; } catch (e) { return false; } }
function startTutorial() {
  if (tutorialSeen()) return;
  tutStep = 0; tutPrevInv = 0; tutPrevDim = "earth";
  renderTutorial();
}
function renderTutorial() {
  const el = $("tutorial-callout");
  if (tutStep < 0 || tutStep >= TUTORIAL_STEPS.length) { el.classList.add("hidden"); return; }
  $("tc-text").innerHTML = t(TUTORIAL_STEPS[tutStep]);
  $("tc-next").textContent = tutStep >= TUTORIAL_STEPS.length - 1 ? t("Ho capito!") : t("Avanti →");
  el.classList.remove("hidden");
}
function tutorialNext() {
  tutStep++;
  if (tutStep >= TUTORIAL_STEPS.length) endTutorial();
  else renderTutorial();
}
function endTutorial() {
  tutStep = -1;
  $("tutorial-callout").classList.add("hidden");
  try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch (e) {}
}
// auto-avanza in base alle azioni del giocatore
function tutorialOnState(state) {
  if (tutStep < 0) return;
  const invCount = Object.values(state.inventory || {}).reduce((a, b) => a + b, 0);
  if (tutStep === 1 && invCount > tutPrevInv) tutorialNext();
  if (tutStep === 2 && state.dim !== tutPrevDim) tutorialNext();
  tutPrevInv = invCount; tutPrevDim = state.dim;
}

// ---------- Impostazioni persistenti ----------
const SETTINGS_KEY = "futureme_settings_v1";
const settings = loadSettings();
function loadSettings() {
  const def = { volume: 50, sensitivity: 100, lowEffects: false };
  try { return { ...def, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch (e) { return def; }
}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }
function applySettings() {
  audio.setMasterVolume(settings.volume / 100);
  if (game) { game.setSensitivity(settings.sensitivity / 100); game.setLowEffects(settings.lowEffects); }
}

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
    card.innerHTML = `<span class="dim-emoji">${d.emoji}</span><h3>${t(d.name)}</h3><p>${t(d.desc)}</p>`;
    card.onclick = () => startGame(d.id);
    c.appendChild(card);
  }
}

// ============================================================
//  Gestione schermate
// ============================================================
const SCREENS = ["screen-title", "screen-intro", "screen-howto", "screen-creator", "screen-dimension", "screen-death", "screen-victory", "screen-pause", "screen-shop", "screen-achievements", "screen-leaderboard", "screen-settings", "screen-multiplayer", "screen-upgrades"];
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
      onStateChange: (state) => { UI.updateHUD(state); if (game && game.mode !== "survival") Save.write(charConfig, state); tutorialOnState(state); },
      audio,
    });
    touchUI = setupTouch(game);
    window.__futuremeGame = game; // hook per debug/test
  }
  if (net) game.net = net;
  applySettings();
  if (touchUI) { isTouchDevice() ? touchUI.show() : touchUI.hide(); }
}

function startGame(startDim) {
  showScreen(null);
  UI.hide("screen-dimension");
  UI.show("hud");
  ensureGame();
  UI.setQuest(null);
  game.start(charConfig, null, selectedDaily, selectedMode);
  // in avventura: se scelta una dimensione diversa dalla Terra, viaggia subito
  if (selectedMode !== "survival" && startDim && startDim !== "earth") {
    game.loadDimension(startDim, 1, `Inizi nella dimensione ${DIMENSIONS[startDim].name}`);
  }
  UI.updateHUD(game.state);
  if (selectedMode === "survival") {
    UI.setQuest("Sopravvivi al maggior numero di ondate!");
  } else if (selectedDaily) {
    UI.setQuest(`Sfida del Giorno: ${selectedDaily.goalDesc}`);
    UI.toast(`${selectedDaily.icon} Sfida del Giorno attiva: ${selectedDaily.name}!`, 3200);
  } else {
    UI.toast(`Benvenuto${charConfig.name ? ", " + charConfig.name : ""}! La tua avventura inizia.`, 3000);
    startTutorial();
  }
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
  UI.toast(t("Bentornato{name}! Riprendi da {dim}.", { name: charConfig.name ? ", " + charConfig.name : "", dim: t(DIMENSIONS[save.state.dim].name) }), 3000);
}

function onDeath(state) {
  if (game) game.closeMap();
  UI.updateHUD(state);
  UI.hide("hud");
  if (game && game.mode === "survival") {
    const wave = state.survivalWave || 0;
    $("death-text").textContent = t("Hai resistito fino all'ondata {n}! Il tuo punteggio è in classifica.", { n: wave });
    $("death-bignum").innerHTML = `🌊 ${wave} <span class="muted">${t("ondate")}</span>`;
    $("death-remain").classList.add("hidden");
    $("btn-respawn").textContent = t("🌊 Rigioca");
    refreshTitleBar();
  } else {
    $("death-challenges").textContent = state.challenges;
    $("death-bignum").innerHTML = `+100 <span class="muted">${t("sfide")}</span>`;
    $("death-remain").classList.remove("hidden");
    $("btn-respawn").textContent = t("Rialzati");
    const texts = [
      "I mondi vacillano... ma la tua storia non è finita.",
      "Sei caduto nell'oscurità. Rialzati e riprova.",
      "Il tuo io parallelo ha ancora bisogno di te.",
    ];
    $("death-text").textContent = t(texts[Math.floor(Math.random() * texts.length)]);
  }
  showScreen("screen-death");
}

function onVictory(state) {
  if (game) game.closeMap();
  Save.clear();
  UI.hide("hud");
  const name = charConfig.name || t("Eroe");
  $("victory-text").innerHTML =
    t("{name}, hai liberato il tuo io imprigionato sulla Luna e lo hai portato nella luce del Sole.", { name }) + "<br><br>" +
    t("I portali sono sigillati, l'implosione dei mondi è scongiurata.");
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
    if (owned) btn = `<button class="owned">${t("Sbloccato ✓")}</button>`;
    else if (Profile.coins >= price) btn = `<button data-buy-outfit="${o.id}">🪙 ${price}</button>`;
    else btn = `<button class="cant">🪙 ${price}</button>`;
    card.innerHTML = `<div class="si-emoji">${o.emoji}</div><div class="si-name">${t(o.label)}</div>${btn}`;
    og.appendChild(card);
  }
  // Scie
  const tg = $("shop-trails");
  tg.innerHTML = "";
  for (const tr of TRAILS) {
    const owned = Profile.hasTrail(tr.id);
    const equipped = Profile.profile.equippedTrail === tr.id;
    const card = document.createElement("div");
    card.className = "shop-item";
    const swatch = tr.color != null
      ? `<div class="si-swatch" style="background:${tr.rainbow ? "linear-gradient(90deg,#ff4d4d,#ffd35c,#4dd39a,#4df3ff,#b96bff)" : "#" + tr.color.toString(16).padStart(6, "0")}"></div>`
      : `<div class="si-swatch" style="background:transparent;border:1px dashed #556"></div>`;
    let btn;
    if (equipped) btn = `<button class="equipped">${t("Equipaggiata ✓")}</button>`;
    else if (owned) btn = `<button data-equip-trail="${tr.id}">${t("Equipaggia")}</button>`;
    else if (Profile.coins >= tr.price) btn = `<button data-buy-trail="${tr.id}">🪙 ${tr.price}</button>`;
    else btn = `<button class="cant">🪙 ${tr.price}</button>`;
    card.innerHTML = `<div class="si-name">${t(tr.label)}</div>${swatch}${btn}`;
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

// ---------- Potenziamenti permanenti ----------
function buildUpgrades() {
  $("upg-coins").textContent = Profile.coins;
  const grid = $("upg-grid");
  grid.innerHTML = "";
  for (const u of UPGRADES) {
    const lvl = Profile.upgradeLevel(u.id);
    const cost = Profile.upgradeCost(u.id);
    const card = document.createElement("div");
    card.className = "upg-card";
    let pips = "";
    for (let i = 0; i < u.max; i++) pips += `<div class="upg-pip${i < lvl ? " on" : ""}"></div>`;
    let btn;
    if (cost == null) btn = `<button class="maxed">${t("MASSIMO ✓")}</button>`;
    else if (Profile.coins >= cost) btn = `<button data-upg="${u.id}">🪙 ${cost} (${t(u.per)})</button>`;
    else btn = `<button class="cant">🪙 ${cost}</button>`;
    card.innerHTML = `<div class="upg-head"><span class="upg-icon">${u.icon}</span><div><div class="upg-name">${t(u.name)}</div><div class="upg-desc">${t("Liv.")} ${lvl}/${u.max} · ${t(u.desc)}</div></div></div><div class="upg-pips">${pips}</div>${btn}`;
    grid.appendChild(card);
  }
  grid.querySelectorAll("[data-upg]").forEach((b) => b.onclick = () => {
    if (Profile.buyUpgrade(b.dataset.upg)) { UI.toast("⬆️ Potenziamento acquistato!"); buildUpgrades(); refreshTitleBar(); }
  });
}

// ---------- Obiettivi ----------
function buildAchievements() {
  const grid = $("ach-grid");
  grid.innerHTML = "";
  for (const a of ACHIEVEMENTS) {
    const unlocked = Profile.hasAchievement(a.id);
    const card = document.createElement("div");
    card.className = "ach-card " + (unlocked ? "unlocked" : "locked");
    card.innerHTML = `<div class="ac-icon">${unlocked ? a.icon : "🔒"}</div><div><div class="ac-name">${t(a.name)}</div><div class="ac-desc">${t(a.desc)}</div></div>`;
    grid.appendChild(card);
  }
}

// ---------- Impostazioni ----------
function setupSettingsControls() {
  const vol = $("set-volume"), sens = $("set-sens"), eff = $("set-effects");
  vol.value = settings.volume; $("set-volume-val").textContent = settings.volume + "%";
  sens.value = settings.sensitivity; $("set-sens-val").textContent = (settings.sensitivity / 100).toFixed(1) + "×";
  eff.checked = settings.lowEffects;
  vol.oninput = () => { settings.volume = +vol.value; $("set-volume-val").textContent = settings.volume + "%"; audio.init(); applySettings(); saveSettings(); };
  sens.oninput = () => { settings.sensitivity = +sens.value; $("set-sens-val").textContent = (settings.sensitivity / 100).toFixed(1) + "×"; applySettings(); saveSettings(); };
  eff.onchange = () => { settings.lowEffects = eff.checked; applySettings(); saveSettings(); };
}

// ---------- Sfida del Giorno (banner titolo) ----------
function refreshDaily() {
  const banner = $("daily-banner");
  const ch = todayChallenge();
  const done = !Profile.dailyChallengeAvailable();
  $("db-icon").textContent = ch.icon;
  const dbt = document.querySelector(".db-title");
  if (dbt) dbt.innerHTML = `${t("Sfida del Giorno")} · <span id="db-name">${t(ch.name)}</span>`;
  $("db-desc").textContent = t(ch.desc);
  $("db-goal").textContent = done ? t("✓ Completata oggi!") : `${t("Obiettivo:")} ${t(ch.goalDesc)} — ${t("Ricompensa:")} ${ch.reward} 🪙`;
  const btn = $("btn-daily");
  btn.disabled = done;
  btn.textContent = done ? t("Completata ✓") : t("Gioca");
  banner.classList.toggle("done", done);
  banner.classList.remove("hidden");
}

// ---------- Classifica ----------
let lbFilter = "all";
function buildLeaderboard() {
  const list = $("lb-list");
  list.innerHTML = "";
  let entries = Profile.leaderboard();
  if (lbFilter === "survival") entries = entries.filter((e) => e.mode === "survival");
  else if (lbFilter === "adventure") entries = entries.filter((e) => e.mode !== "survival");
  if (!entries.length) { list.innerHTML = `<div class="lb-empty">${t("Nessun risultato in questa categoria. Gioca una partita per entrare in classifica!")}</div>`; return; }
  entries.forEach((e, i) => {
    const row = document.createElement("div");
    row.className = "lb-row" + (i === 0 ? " top" : "");
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
    const tag = e.mode === "survival" ? "🌊" : (e.won ? "🏆" : "");
    row.innerHTML = `<div class="lb-rank">${medal}</div>
      <div class="lb-name">${e.name} ${tag}<div class="lb-meta">${e.mode === "survival" ? t("Sopravvivenza") + " · " : ""}${t("Grado")} ${e.level} · ${e.date}</div></div>
      <div class="lb-score">${e.score} ${t("pt")}</div>`;
    list.appendChild(row);
  });
}

// ---------- Ricompensa giornaliera ----------
function maybeDailyReward() {
  if (!Profile.dailyAvailable()) return;
  const r = Profile.claimDaily();
  if (!r) return;
  refreshTitleBar();
  UI.openDialog(t("🎁 Ricompensa giornaliera"),
    t("Bentornato! Hai ricevuto {coins} 🪙 monete.", { coins: r.coins }) + "\n" +
    t("Serie di accessi: {streak} {days} di fila. Torna domani per una ricompensa più grande!", { streak: r.streak, days: r.streak > 1 ? t("giorni") : t("giorno") }),
    [{ label: t("Grazie!"), primary: true, cb: () => UI.closeDialog() }]);
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
  ctx.fillText(t("FUTUREME — Le Tre Dimensioni"), W / 2, 44);
  ctx.fillStyle = "#ffd35c"; ctx.font = "900 40px 'Trebuchet MS', sans-serif";
  ctx.fillText(t("HO SALVATO I MONDI"), W / 2, 100);
  ctx.fillStyle = "#eaf2ff"; ctx.font = "18px 'Trebuchet MS', sans-serif";
  const name = charConfig.name || t("Un eroe");
  ctx.fillText(`${name} · ${t("Grado")} ${Profile.level}`, W / 2, 138);
  ctx.font = "22px 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#cfe0ff";
  const stats = [
    `💀 ${t("Morti")}: ${state.deaths}`,
    `🔒 ${t("Portali sigillati")}: ${state.portalsClosed}`,
    `👹 ${t("Guardiani sconfitti")}: ${Profile.profile.bossDefeats}`,
    `🪙 ${t("Monete")}: ${Profile.coins}`,
  ];
  stats.forEach((s, i) => ctx.fillText(s, W / 2, 186 + i * 30));
  ctx.fillStyle = "#8ea2d6"; ctx.font = "14px 'Trebuchet MS', sans-serif";
  ctx.fillText(t("Riesci a fare di meglio? #FUTUREME"), W / 2, H - 18);
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
  slide.innerHTML = t(STORY[storyIndex]);
  slide.classList.remove("show"); void slide.offsetWidth; slide.classList.add("show");
  $("btn-intro-next").textContent = storyIndex >= STORY.length - 1 ? t("Crea il tuo personaggio →") : t("Avanti →");
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

function buildLangPicker() {
  const el = $("lang-picker");
  if (!el) return;
  el.innerHTML = "";
  for (const l of LANGS) {
    const b = document.createElement("button");
    b.className = "lang-btn" + (l.code === getLang() ? " active" : "");
    b.textContent = l.flag; b.title = l.name;
    b.onclick = () => {
      setLang(l.code);
      [...el.children].forEach((c) => c.classList.remove("active"));
      b.classList.add("active");
      // ricostruisci le schermate dinamiche con la nuova lingua
      buildDimensionCards(); refreshTitleBar(); refreshDaily();
      setupCreatorControls();
    };
    el.appendChild(b);
  }
}

function init() {
  window.__futuremeProfile = Profile; // hook per debug/test
  applyStaticTranslations();
  buildLangPicker();
  preview = new CreatorPreview($(".creator-right") || document.querySelector(".creator-right"));
  setupCreatorControls();
  buildDimensionCards();

  $("btn-start").onclick = () => {
    audio.init();
    selectedDaily = null; selectedMode = null;
    // mostra l'intro solo la prima volta; poi si può rivedere con "La storia"
    let seen = false;
    try { seen = localStorage.getItem(INTRO_KEY) === "1"; } catch (e) {}
    if (seen) showScreen("screen-creator"); else showIntro();
  };
  $("btn-survival").onclick = () => {
    audio.init();
    selectedDaily = null; selectedMode = "survival";
    UI.toast("🌊 Modalità Sopravvivenza: resisti alle ondate!", 3000);
    showScreen("screen-creator");
  };
  $("btn-daily").onclick = () => {
    if (!Profile.dailyChallengeAvailable()) return;
    audio.init();
    selectedDaily = todayChallenge(); selectedMode = null;
    UI.toast(`${selectedDaily.icon} Sfida: ${selectedDaily.goalDesc}`, 3000);
    showScreen("screen-creator");
  };
  $("btn-continue").onclick = () => { selectedDaily = null; selectedMode = null; continueGame(); };
  $("btn-story").onclick = () => { audio.init(); showIntro(); };
  $("btn-intro-next").onclick = () => nextStorySlide();
  $("btn-intro-skip").onclick = () => finishIntro();

  $("btn-mute").onclick = () => {
    const muted = audio.toggleMute();
    $("btn-mute").textContent = muted ? "🔇" : "🔊";
  };
  $("btn-sphere").onclick = () => { if (game) game.toggleSphere(); };
  $("btn-map").onclick = () => { if (game) game.toggleMap(); };
  $("btn-map-close").onclick = () => { if (game) game.closeMap(); };

  // ---- Emote ----
  const emoteBar = $("emote-bar");
  emoteBar.innerHTML = "";
  for (const em of EMOTES) {
    const b = document.createElement("button");
    b.textContent = em;
    b.onclick = () => { if (game) game.showEmote(em); emoteBar.classList.add("hidden"); };
    emoteBar.appendChild(b);
  }
  $("btn-emote").onclick = () => emoteBar.classList.toggle("hidden");

  // ---- Tutorial ----
  $("tc-next").onclick = () => tutorialNext();
  $("tc-skip").onclick = () => endTutorial();
  window.addEventListener("keydown", (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.code === "KeyT" && game && game.running) emoteBar.classList.toggle("hidden");
    else if (/^Digit[1-8]$/.test(e.code) && game && game.running && !emoteBar.classList.contains("hidden")) {
      const idx = +e.code.slice(5) - 1;
      if (EMOTES[idx]) { game.showEmote(EMOTES[idx]); emoteBar.classList.add("hidden"); }
    }
  });

  $("btn-shop").onclick = () => { buildShop(); showScreen("screen-shop"); };
  $("btn-shop-back").onclick = () => { showScreen("screen-title"); refreshTitleBar(); };
  $("btn-upgrades").onclick = () => { buildUpgrades(); showScreen("screen-upgrades"); };
  $("btn-upg-back").onclick = () => { showScreen("screen-title"); refreshTitleBar(); };
  $("btn-achievements").onclick = () => { buildAchievements(); showScreen("screen-achievements"); };
  $("btn-ach-back").onclick = () => showScreen("screen-title");
  $("btn-leaderboard").onclick = () => { buildLeaderboard(); showScreen("screen-leaderboard"); };
  $("btn-lb-back").onclick = () => showScreen("screen-title");
  $("lb-filters").querySelectorAll("[data-lbfilter]").forEach((b) => b.onclick = () => {
    lbFilter = b.dataset.lbfilter;
    $("lb-filters").querySelectorAll(".lb-tab").forEach((t) => t.classList.remove("active"));
    b.classList.add("active");
    buildLeaderboard();
  });
  $("btn-settings").onclick = () => { setupSettingsControls(); showScreen("screen-settings"); };
  $("btn-settings-back").onclick = () => showScreen("screen-title");

  // ---- Multiplayer ----
  $("btn-multiplayer").onclick = () => {
    if (!$("mp-name").value) $("mp-name").value = charConfig.name || "";
    if (!$("mp-url").value) {
      const host = location.hostname || "localhost";
      $("mp-url").value = (location.protocol === "https:" ? "wss://" : "ws://") + host + ":8090";
    }
    showScreen("screen-multiplayer");
  };
  $("btn-mp-back").onclick = () => showScreen("screen-title");
  $("btn-mp-connect").onclick = () => {
    const name = ($("mp-name").value || "Anonimo").trim();
    const url = ($("mp-url").value || "ws://localhost:8090").trim();
    charConfig.name = name;
    ensureNet();
    if (game) game.net = net;
    net.connect(url, name, charConfig);
    // se una partita è già in corso, entra subito nella dimensione attuale
    if (game && game.running) net.enterDimension(game.state.dim, game.player.position.x, game.player.position.z, game.player.rotation.y);
  };
  $("btn-mp-disconnect").onclick = () => { if (net) net.disconnect(); UI.showMultiplayerHud(false); if (game) game.clearRemotes(); };

  const chatInput = $("chat-input");
  chatInput.addEventListener("keydown", (e) => {
    if (e.code === "Enter") {
      const text = chatInput.value.trim();
      if (text && net && net.connected) { net.sendChat(text); UI.addChatMessage(charConfig.name || "Tu", escapeHtml(text)); }
      chatInput.value = "";
      chatInput.blur();
      e.stopPropagation();
    }
  });
  $("btn-share").onclick = () => downloadShareCard();

  // mostra "Continua" se esiste un salvataggio
  applySettings();
  refreshContinueButton();
  refreshTitleBar();
  refreshDaily();
  maybeDailyReward();
  $("btn-howto").onclick = () => showScreen("screen-howto");
  $("btn-howto-back").onclick = () => showScreen("screen-title");
  $("btn-creator-back").onclick = () => showScreen("screen-title");
  $("btn-to-dimension").onclick = () => {
    if (selectedMode === "survival") startGame("moon");
    else showScreen("screen-dimension");
  };
  $("btn-dimension-back").onclick = () => showScreen("screen-creator");

  $("btn-respawn").onclick = () => {
    if (game && game.mode === "survival") { startGame("moon"); }
    else { showScreen(null); UI.show("hud"); game.respawn(); }
  };
  $("btn-restart").onclick = () => { showScreen("screen-creator"); };

  $("btn-pause").onclick = () => { game.closeMap(); game.pause(); UI.hide("hud"); showScreen("screen-pause"); };
  $("btn-resume").onclick = () => { showScreen(null); UI.show("hud"); audio.resume(); game.resume(); };
  $("btn-quit").onclick = () => { game.closeMap(); game.pause(); UI.hide("hud"); refreshContinueButton(); refreshTitleBar(); refreshDaily(); showScreen("screen-title"); };

  // Esc = pausa
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && game && game.running) {
      if (game.fullmapOpen) { game.closeMap(); return; }
      game.pause(); UI.hide("hud"); showScreen("screen-pause");
    }
  });

  showScreen("screen-title");
}

init();
