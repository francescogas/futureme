// ============================================================
//  FUTUREME — motore di gioco 3D
// ============================================================
import * as THREE from "three";
import { buildAvatar, animateAvatar } from "./character.js";
import {
  buildDimension, makeItem, makePortal, makeNPC, makeMonster,
  makeAlterEgo, animateWorldObjects,
} from "./world.js";
import { DIMENSIONS, POTION_RECIPE, NPC_LINES, ITEMS } from "./data.js";
import { Minimap } from "./minimap.js";
import * as UI from "./ui.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };

export class Game {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.cb = callbacks; // { onDeath, onVictory, onStateChange, audio }
    this.audio = callbacks.audio || null;
    this.minimap = new Minimap();
    this.clock = new THREE.Clock();
    this.keys = new Set();
    this.running = false;
    this.dragging = false;
    this.yaw = 0; this.pitch = 0.35;
    this.hitCooldown = 0;
    this.interactLock = 0;

    this._initRenderer();
    this._initInput();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);

    window.addEventListener("resize", () => this._onResize());
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _initInput() {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if ((e.code === "KeyE" || e.code === "Space") && this.running) { e.preventDefault(); this._tryInteract(); }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => { this.dragging = true; this._lastX = e.clientX; this._lastY = e.clientY; });
    window.addEventListener("pointerup", () => { this.dragging = false; });
    window.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this._lastX, dy = e.clientY - this._lastY;
      this._lastX = e.clientX; this._lastY = e.clientY;
      this.yaw -= dx * 0.005;
      this.pitch = Math.max(0.05, Math.min(1.1, this.pitch + dy * 0.004));
    });
  }

  // ---------- Nuova partita ----------
  start(charConfig) {
    this.charConfig = charConfig;
    this.state = {
      dim: "earth",
      level: 1,
      challenges: 1000,
      deaths: 0,
      hp: 5, maxHp: 5,
      inventory: {},
      cityName: "",
      potionReady: false,
      alterFreed: false,
      talkedNPCs: 0,
      portalsClosed: 0,
      keysFound: 0,
      monstersBanished: 0,
      quest: null,
    };
    // avatar del giocatore
    const built = buildAvatar(charConfig);
    this.player = built.group;
    this.playerParts = built.parts;
    this.avatarTemplate = built.group; // per clonare l'alter ego

    this.loadDimension("earth", 1);
    this.running = true;
    this.clock.start();
    this._loop();
  }

  restart(charConfig) {
    this.start(charConfig);
  }

  // ---------- Carica una dimensione ----------
  loadDimension(dimId, level, spawnMsg) {
    // pulizia scena precedente
    if (this.worldRoot) this.scene.remove(this.worldRoot);
    this.scene.clear();
    this.alter = null;
    this.alterBeam = null;

    this.state.dim = dimId;
    this.state.level = level;

    const built = buildDimension(dimId, level);
    this.worldRoot = built.root;
    this.objects = built.objects;
    this.worldSize = built.size;
    this.state.cityName = built.cityName || DIMENSIONS[dimId].name;
    this.scene.add(this.worldRoot);

    this._setupLighting(dimId);
    this._populate(dimId, level);

    // posiziona il giocatore al centro
    this.player.position.set(0, 0, 8);
    this.yaw = 0;
    this.scene.add(this.player);

    this._setObjectiveForDim(dimId);
    if (this.audio) this.audio.setAmbient(dimId);
    this.cb.onStateChange(this.state);
    if (spawnMsg) UI.toast(spawnMsg);
  }

  _setupLighting(dimId) {
    const dim = DIMENSIONS[dimId];
    const amb = new THREE.AmbientLight(0xffffff, dimId === "moon" ? 0.25 : 0.6);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xffffff, dimId === "moon" ? 0.35 : 1.1);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
    this.scene.add(sun);

    let skyTop, skyBot, fogColor, fogNear, fogFar;
    if (dimId === "earth") { skyTop = 0x2a4a8a; skyBot = 0xbcd4ff; fogColor = 0xbcd4ff; fogNear = 40; fogFar = 130; sun.color.set(0xfff2d0); }
    else if (dimId === "moon") { skyTop = 0x05060f; skyBot = 0x1a1a3a; fogColor = 0x0a0a1e; fogNear = 18; fogFar = 75; sun.color.set(0x8ea2ff); this._addStars(); this._addMoon(); }
    else { skyTop = 0x2aa0ff; skyBot = 0xffe9a0; fogColor = 0xffe9b0; fogNear = 50; fogFar = 150; sun.color.set(0xfff4c0); sun.intensity = 1.4; }

    this.scene.background = new THREE.Color(skyBot);
    this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

    // emisferica per tinta cielo
    const hemi = new THREE.HemisphereLight(skyTop, skyBot, 0.5);
    this.scene.add(hemi);
  }

  _addStars() {
    const geo = new THREE.BufferGeometry();
    const n = 600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = rand(80, 160), a = rand(0, Math.PI * 2), b = rand(0.1, 1.4);
      pos[i * 3] = Math.cos(a) * r * Math.cos(b);
      pos[i * 3 + 1] = Math.sin(b) * r;
      pos[i * 3 + 2] = Math.sin(a) * r * Math.cos(b);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.7 }));
    this.scene.add(stars);
  }

  _addMoon() {
    const m = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 24), new THREE.MeshBasicMaterial({ color: 0xdfe6ff }));
    m.position.set(-30, 40, -60);
    this.scene.add(m);
    const glow = new THREE.PointLight(0x8ea2ff, 0.6, 200);
    glow.position.copy(m.position);
    this.scene.add(glow);
  }

  // ---------- Popola con oggetti/nemici ----------
  _populate(dimId, level) {
    const spawnAt = (fn) => {
      const a = rand(0, Math.PI * 2), r = rand(6, this.worldSize - 10);
      return fn(Math.cos(a) * r, Math.sin(a) * r);
    };

    if (dimId === "earth") {
      for (let i = 0; i < 3; i++) { const it = spawnAt((x, z) => makeItem("key", x, z)); this._addItem(it); }
      for (let i = 0; i < 2; i++) { const it = spawnAt((x, z) => makeItem("passport", x, z)); this._addItem(it); }
      for (let i = 0; i < 2; i++) { const it = spawnAt((x, z) => makeItem(pick(["torch", "silver"]), x, z)); this._addItem(it); }
      // portali misteriosi
      this._addPortal(makePortal(14, -8, DIMENSIONS.earth.color, true), { dest: "earth", need: "key", label: "Portale ignoto" });
      this._addPortal(makePortal(-14, -6, DIMENSIONS.moon.color, true), { dest: "moon", need: "passport", label: "Portale ignoto" });
      this._addPortal(makePortal(0, 16, DIMENSIONS.sun.color, true), { dest: "sun", need: "passport", label: "Portale ignoto" });
      for (let i = 0; i < 2; i++) { const n = spawnAt((x, z) => makeNPC(x, z, 0x6a5acd)); this._addNPC(n); }
    }

    else if (dimId === "moon") {
      for (const t of ["garlic", "cross", "silver", "torch"]) {
        const it = spawnAt((x, z) => makeItem(t, x, z)); this._addItem(it);
        const it2 = spawnAt((x, z) => makeItem(t, x, z)); this._addItem(it2);
      }
      // portali di invasione (rossi, da chiudere)
      const nInvasion = 2 + Math.floor(level / 2);
      for (let i = 0; i < nInvasion; i++) {
        const p = spawnAt((x, z) => makePortal(x, z, 0xff3355, false));
        this._addPortal(p, { dest: "invasion", need: "defense", label: "Portale d'invasione" });
      }
      // portale di uscita verso il Sole
      this._addPortal(makePortal(0, -16, DIMENSIONS.sun.color, false), { dest: "sun", need: null, label: "Portale verso il Sole" });
      // mostri
      const nMon = 3 + level;
      const types = ["zombie", "vampire", "werewolf"];
      for (let i = 0; i < nMon; i++) {
        const m = spawnAt((x, z) => makeMonster(pick(types), x, z));
        this._addMonster(m);
      }
      for (let i = 0; i < 1; i++) { const n = spawnAt((x, z) => makeNPC(x, z, 0x9060ff)); this._addNPC(n); }
      // il tuo io prigioniero (evil)
      this._spawnAlterEgo(true);
    }

    else { // sun
      for (const t of POTION_RECIPE) {
        if (!this._hasItem(t)) { const it = spawnAt((x, z) => makeItem(t, x, z)); this._addItem(it); }
      }
      for (let i = 0; i < 3; i++) { const it = spawnAt((x, z) => makeItem(pick(["cross", "silver", "torch"]), x, z)); this._addItem(it); }
      this._addPortal(makePortal(0, -16, DIMENSIONS.moon.color, false), { dest: "moon", need: null, label: "Portale verso la Luna" });
      this._addPortal(makePortal(14, 6, DIMENSIONS.earth.color, false), { dest: "earth", need: null, label: "Portale verso la Terra" });
      for (let i = 0; i < 2; i++) { const n = spawnAt((x, z) => makeNPC(x, z, 0xffb347)); this._addNPC(n); }
      // il tuo io buono (già salvato? no: qui è amichevole)
      this._spawnAlterEgo(false);
    }
  }

  _spawnAlterEgo(evil) {
    const alter = makeAlterEgo(this.avatarTemplate, evil);
    const a = rand(0, Math.PI * 2), r = this.worldSize - 14;
    alter.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    alter.userData = { kind: "alter", evil };
    this.alter = alter;
    this.scene.add(alter);
    // marcatore luminoso sopra la testa
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: evil ? 0xff2040 : 0x4df3ff, transparent: true, opacity: 0.3 })
    );
    beam.position.set(alter.position.x, 4, alter.position.z);
    this.scene.add(beam);
    this.alterBeam = beam;
  }

  _addItem(o) { this.objects.items.push(o); this.worldRoot.add(o); }
  _addPortal(o, info) { o.userData = { ...o.userData, ...info }; this.objects.portals.push(o); this.worldRoot.add(o); }
  _addNPC(o) { o.userData.talked = false; this.objects.npcs.push(o); this.worldRoot.add(o); }
  _addMonster(o) { this.objects.monsters.push(o); this.worldRoot.add(o); }

  _hasItem(t) { return (this.state.inventory[t] || 0) > 0; }
  _takeItem(t, n = 1) { this.state.inventory[t] = Math.max(0, (this.state.inventory[t] || 0) - n); }
  _giveItem(t, n = 1) { this.state.inventory[t] = (this.state.inventory[t] || 0) + n; }

  _setObjectiveForDim(dimId) {
    if (dimId === "earth") UI.setObjective("raccogli 🔑 chiavi e 🛂 passaporti, poi entra in un portale (E).");
    else if (dimId === "moon") UI.setObjective("chiudi i 🔴 portali d'invasione e difenditi. Libera il tuo io con la pozione.");
    else UI.setObjective("raccogli i 3 ingredienti della pozione: 🌿 💎 🍊.");
  }

  // ---------- Interazione (tasto E) ----------
  _tryInteract() {
    if (this.interactLock > 0) return;
    const px = this.player.position.x, pz = this.player.position.z;

    // Alter ego
    if (this.alter && dist2(px, pz, this.alter.position.x, this.alter.position.z) < 6) {
      this._confrontAlter();
      this.interactLock = 0.4;
      return;
    }
    // Mostro vicino: bandiscilo con un oggetto di difesa
    let nearestMon = null, nearestD = 16; // entro 4 unità
    for (const m of this.objects.monsters) {
      const d = dist2(px, pz, m.position.x, m.position.z);
      if (d < nearestD) { nearestD = d; nearestMon = m; }
    }
    if (nearestMon) { this._banishMonster(nearestMon); this.interactLock = 0.4; return; }
    // NPC
    for (const n of this.objects.npcs) {
      if (dist2(px, pz, n.position.x, n.position.z) < 6) { this._talkNPC(n); this.interactLock = 0.4; return; }
    }
    // Portali
    for (const p of this.objects.portals) {
      if (dist2(px, pz, p.position.x, p.position.z) < 5) { this._usePortal(p); this.interactLock = 0.4; return; }
    }
    UI.hint("Niente con cui interagire qui.");
  }

  _talkNPC(n) {
    if (this.audio) this.audio.talk();
    const line = pick(NPC_LINES[this.state.dim]);
    if (!n.userData.talked) {
      n.userData.talked = true;
      this.state.talkedNPCs++;
      this._progress(5);
    }
    // Offri una missione se non ce n'è una attiva
    if (!this.state.quest && !n.userData.questGiven) {
      const q = this._makeQuest();
      n.userData.questGiven = true;
      UI.openDialog("Persona strana", line + "\n\n« " + q.desc + " »", [
        { label: "Accetto la sfida", primary: true, cb: () => { UI.closeDialog(); this._assignQuest(q); } },
        { label: "Più tardi", cb: () => UI.closeDialog() },
      ]);
      return;
    }
    UI.openDialog("Persona strana", line, [{ label: "Capito", primary: true, cb: () => UI.closeDialog() }]);
  }

  // ---------- Sistema di missioni (sfide extra) ----------
  _makeQuest() {
    const dim = this.state.dim;
    if (dim === "moon") {
      return { type: "banish", target: 3, reward: "torch", desc: "Sfida: bandisci 3 mostri per ottenere una 🔦 torcia." };
    } else if (dim === "sun") {
      return { type: "ingredients", target: 3, reward: "crystal", desc: "Sfida: raccogli i 3 ingredienti della pozione." };
    }
    return { type: "keys", target: 2, reward: "passport", desc: "Sfida: raccogli 2 🔑 chiavi per un 🛂 passaporto in dono." };
  }

  _assignQuest(q) {
    q.startBanish = this.state.monstersBanished;
    q.startKeys = this.state.keysFound;
    this.state.quest = q;
    UI.toast("🎯 Nuova sfida accettata!");
    this._updateQuestHUD();
  }

  _questProgress() {
    const q = this.state.quest;
    if (!q) return 0;
    if (q.type === "banish") return this.state.monstersBanished - q.startBanish;
    if (q.type === "keys") return this.state.keysFound - q.startKeys;
    if (q.type === "ingredients") return POTION_RECIPE.filter((t) => this._hasItem(t)).length;
    return 0;
  }

  _updateQuestHUD() {
    const q = this.state.quest;
    if (!q) { UI.setQuest(null); return; }
    UI.setQuest(`${q.desc.replace(/^Sfida:\s*/, "")} (${Math.min(this._questProgress(), q.target)}/${q.target})`);
  }

  _checkQuest() {
    const q = this.state.quest;
    if (!q) return;
    this._updateQuestHUD();
    if (this._questProgress() >= q.target) {
      this._giveItem(q.reward);
      this._progress(50);
      this.state.quest = null;
      UI.setQuest(null);
      if (this.audio) this.audio.seal();
      UI.toast(`🏅 Sfida completata! Ricompensa: ${ITEMS[q.reward].emoji} ${ITEMS[q.reward].label}`, 2800);
      this.cb.onStateChange(this.state);
    }
  }

  _banishMonster(m) {
    const defense = ["torch", "silver", "cross", "garlic"].find((t) => this._hasItem(t));
    if (!defense) {
      UI.openDialog("Mostro!", "Non hai armi per respingerlo! Ti serve 🔦 torcia, ⚙️ argento, ✝️ croce o 🧄 aglio.", [{ label: "Fuggi", cb: UI.closeDialog }]);
      return;
    }
    this._takeItem(defense);
    const i = this.objects.monsters.indexOf(m);
    if (i >= 0) this.objects.monsters.splice(i, 1);
    this.worldRoot.remove(m);
    this.state.monstersBanished++;
    this._progress(15);
    if (this.audio) this.audio.banish();
    UI.toast(`💥 Mostro respinto con ${ITEMS[defense].emoji}!`, 1500);
    this._checkQuest();
    this.cb.onStateChange(this.state);
  }

  _usePortal(p) {
    const info = p.userData;
    // Portale d'invasione (Luna): va chiuso
    if (info.dest === "invasion") {
      if (info.closed) { UI.hint("Portale già chiuso."); return; }
      const defense = ["garlic", "cross", "silver", "torch"].find((t) => this._hasItem(t));
      if (!defense) { UI.openDialog("Portale d'invasione", "Ti serve un oggetto di difesa (🧄 ✝️ ⚙️ 🔦) per sigillarlo!", [{ label: "Ok", cb: UI.closeDialog }]); return; }
      this._takeItem(defense);
      info.closed = true;
      info.locked = true;
      p.userData.ring.material.emissiveIntensity = 0.2;
      p.userData.disc.material.opacity = 0.1;
      this.state.portalsClosed++;
      this._progress(30);
      if (this.audio) this.audio.seal();
      UI.toast(`🔒 Portale sigillato! (${ITEMS[defense].emoji} usato)`);
      this._checkMoonCleared();
      return;
    }
    // Portale bloccato: richiede chiave/passaporto
    if (info.locked && info.need) {
      if (!this._hasItem(info.need)) {
        const em = ITEMS[info.need].emoji;
        UI.openDialog("Portale sigillato", `Questo portale è chiuso. Serve ${em} ${ITEMS[info.need].label}.`, [{ label: "Ok", cb: UI.closeDialog }]);
        return;
      }
      this._takeItem(info.need);
      UI.toast(`${ITEMS[info.need].emoji} usato per aprire il portale...`);
    }

    // Viaggio!
    const destDim = info.dest === "earth" ? "earth" : info.dest;
    let nextLevel = this.state.level;
    if (destDim === "earth" && this.state.dim === "earth") nextLevel = this.state.level + 1; // città successiva
    this._progress(10);
    const names = { earth: "TERRA 🌍", moon: "LUNA 🌙", sun: "SOLE ☀️" };
    UI.openDialog("Portale", `Attraversi il portale... Non sai dove ti porterà.`, [{
      label: "Entra", primary: true, cb: () => {
        UI.closeDialog();
        if (this.audio) this.audio.portal();
        this.loadDimension(destDim, nextLevel, `Sei arrivato in ${names[destDim]}`);
      }
    }, { label: "Non ancora", cb: UI.closeDialog }]);
  }

  _confrontAlter() {
    if (this.state.dim === "moon" && this.alter.userData.evil) {
      if (this.state.potionReady) {
        // VITTORIA
        UI.openDialog(this.charConfig.name || "Il tuo Io", "Hai la pozione magica. La versi sul tuo io imprigionato...", [{
          label: "Usa la pozione ✨", primary: true, cb: () => {
            UI.closeDialog();
            if (this.audio) { this.audio.potion(); setTimeout(() => this.audio.victory(), 700); }
            this.state.alterFreed = true;
            this.state.potionReady = false;
            this._takeItem("herb"); this._takeItem("crystal"); this._takeItem("sunfruit");
            // trasforma l'alter ego (rimuove aura malvagia)
            this.alter.traverse((o) => { if (o.isMesh && o.material.emissive) { o.material.emissive.set(0x000000); o.material.emissiveIntensity = 0; } });
            this.alterBeam.material.color.set(0x4df3ff);
            this.running = false;
            setTimeout(() => this.cb.onVictory(this.state), 900);
          }
        }, { label: "Aspetta", cb: UI.closeDialog }]);
      } else {
        UI.openDialog("Il tuo Io (Luna)", "«...sei venuto a liberarmi? O a finirmi? Non ho più la mia luce...» — Ti serve la POZIONE MAGICA del Sole (🌿💎🍊).", [{ label: "Tornerò", cb: UI.closeDialog }]);
      }
    } else {
      UI.openDialog("Il tuo Io", "«Ci somigliamo, ma non siamo uguali. Cerca la mia versione imprigionata sulla Luna. Solo la pozione del Sole può salvarla.»", [{ label: "Grazie", cb: UI.closeDialog }]);
    }
  }

  _checkMoonCleared() {
    const open = this.objects.portals.filter((p) => p.userData.dest === "invasion" && !p.userData.closed).length;
    if (open === 0) {
      UI.toast("🌙 Hai sigillato tutti i portali d'invasione!");
      UI.setObjective("ora libera il tuo io con la pozione, o esci verso il Sole.");
    }
  }

  // ---------- Progresso sfide ----------
  _progress(amount) {
    this.state.challenges = Math.max(0, this.state.challenges - amount);
    this.cb.onStateChange(this.state);
  }

  // ---------- Danno / morte ----------
  _damage(n) {
    if (this.hitCooldown > 0) return;
    this.hitCooldown = 1.0;
    this.state.hp -= n;
    if (this.audio) this.audio.hit();
    UI.hint("💥 Colpito!");
    this.cb.onStateChange(this.state);
    if (this.state.hp <= 0) this._die();
  }

  _die() {
    this.running = false;
    if (this.audio) this.audio.death();
    this.state.deaths++;
    this.state.challenges += 100;
    this.cb.onStateChange(this.state);
    this.cb.onDeath(this.state);
  }

  respawn() {
    this.state.hp = this.state.maxHp;
    this.hitCooldown = 1.5;
    this.player.position.set(0, 0, 8);
    this.running = true;
    this.clock.start();
    this._loop();
  }

  pause() { this.running = false; }
  resume() { if (this.state.hp > 0) { this.running = true; this.clock.start(); this._loop(); } }

  // ---------- Loop ----------
  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    this._updatePlayer(dt, t);
    this._updateMonsters(dt);
    this._updatePickups();
    this._updateProximityHints();
    animateWorldObjects(this.objects, t, dt);
    if (this.alterBeam) this.alterBeam.material.opacity = 0.2 + Math.sin(t * 3) * 0.12;
    this.minimap.render(this);

    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.interactLock > 0) this.interactLock -= dt;

    this.renderer.render(this.scene, this.camera);
  }

  _updatePlayer(dt, t) {
    const run = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const speed = (run ? 9 : 5) * dt;
    let mx = 0, mz = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) mz -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) mz += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;

    let moving = 0;
    if (mx || mz) {
      const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      // direzione relativa alla yaw della camera
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const dx = mx * cos - mz * sin;
      const dz = mx * sin + mz * cos;
      const nx = this.player.position.x + dx * speed;
      const nz = this.player.position.z + dz * speed;
      if (!this._blocked(nx, nz)) {
        this.player.position.x = nx;
        this.player.position.z = nz;
      }
      // limita al bordo
      const r = Math.hypot(this.player.position.x, this.player.position.z);
      if (r > this.worldSize - 2) {
        this.player.position.x *= (this.worldSize - 2) / r;
        this.player.position.z *= (this.worldSize - 2) / r;
      }
      this.player.rotation.y = Math.atan2(dx, dz);
      moving = run ? 1 : 0.6;
    }

    animateAvatar(this.playerParts, t, moving);

    // camera in terza persona
    const camDist = 7, camH = 3 + this.pitch * 4;
    const cx = this.player.position.x - Math.sin(this.yaw) * camDist * Math.cos(this.pitch);
    const cz = this.player.position.z - Math.cos(this.yaw) * camDist * Math.cos(this.pitch);
    const cy = this.player.position.y + camH;
    this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.15);
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1.4, this.player.position.z);
  }

  _blocked(x, z) {
    for (const c of this.objects.colliders) {
      if (dist2(x, z, c.x, c.z) < (c.r + 0.5) * (c.r + 0.5)) return true;
    }
    return false;
  }

  _updateMonsters(dt) {
    const px = this.player.position.x, pz = this.player.position.z;
    for (const m of this.objects.monsters) {
      const dx = px - m.position.x, dz = pz - m.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 22 && d > 0.01) {
        m.position.x += (dx / d) * m.userData.speed * dt;
        m.position.z += (dz / d) * m.userData.speed * dt;
        m.rotation.y = Math.atan2(dx, dz);
      }
      m.position.y = Math.abs(Math.sin(this.clock.elapsedTime * 6 + m.position.x)) * 0.15;
      if (d < 1.3) this._damage(1);
    }
  }

  _updatePickups() {
    const px = this.player.position.x, pz = this.player.position.z;
    for (let i = this.objects.items.length - 1; i >= 0; i--) {
      const it = this.objects.items[i];
      if (dist2(px, pz, it.position.x, it.position.z) < 1.4) {
        const type = it.userData.type;
        this._giveItem(type);
        if (type === "key") this.state.keysFound++;
        this.worldRoot.remove(it);
        this.objects.items.splice(i, 1);
        this._progress(10);
        if (this.audio) this.audio.pickup();
        UI.toast(`${ITEMS[type].emoji} ${ITEMS[type].label} raccolto!`, 1400);
        this._checkPotion();
        this._checkQuest();
        this.cb.onStateChange(this.state);
      }
    }
  }

  _checkPotion() {
    if (this.state.potionReady) return;
    if (POTION_RECIPE.every((t) => this._hasItem(t))) {
      this.state.potionReady = true;
      if (this.audio) this.audio.potion();
      UI.toast("✨ POZIONE MAGICA pronta! Torna sulla Luna a salvare il tuo io.", 3500);
    }
  }

  _updateProximityHints() {
    const px = this.player.position.x, pz = this.player.position.z;
    let hint = null;
    if (this.alter && dist2(px, pz, this.alter.position.x, this.alter.position.z) < 9) hint = "Premi E — il tuo Io";
    else {
      for (const n of this.objects.npcs) if (dist2(px, pz, n.position.x, n.position.z) < 9) { hint = "Premi E — parla"; break; }
      if (!hint) for (const p of this.objects.portals) {
        if (dist2(px, pz, p.position.x, p.position.z) < 9) {
          hint = p.userData.dest === "invasion" ? "Premi E — sigilla il portale" : "Premi E — entra nel portale";
          break;
        }
      }
    }
    if (hint) UI.hint(hint);
  }

  dispose() {
    this.running = false;
    this.renderer.dispose();
  }
}
