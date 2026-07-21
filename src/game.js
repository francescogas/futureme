// ============================================================
//  FUTUREME — motore di gioco 3D
// ============================================================
import * as THREE from "three";
import { buildAvatar, animateAvatar } from "./character.js";
import {
  buildDimension, makeItem, makePortal, makeNPC, makeMonster,
  makeAlterEgo, makeBoss, makeBat, makeCharger, makeSlime, makePowerup,
  makeSphere, makeSphereCharge, makeBeacon, animateWorldObjects,
} from "./world.js";
import { DIMENSIONS, POTION_RECIPE, NPC_LINES, CITY_NPCS, ITEMS, REWARDS, POWERUPS } from "./data.js";
import { Minimap, renderFullMap } from "./minimap.js";
import { Weather } from "./weather.js";
import { Profile } from "./progression.js";
import * as UI from "./ui.js";
import { t } from "./i18n.js";

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
    this.touchMove = { x: 0, z: 0 };
    this.shake = 0;
    this.bursts = [];
    this.shockwaves = [];
    this.sensitivity = 1;
    this.lowEffects = false;
    this.net = null;              // modulo di rete (multiplayer, opzionale)
    this.remotes = new Map();     // id -> { group, parts, tx, tz, tr, walk, label }
    this.emotes = [];             // bolle emote attive
    this.combo = 0;
    this.comboTimer = 0;
    this.trailTimer = 0;
    this.sphere = { has: false, energy: 0, active: false }; // Sfera del Veggente
    this.mode = null;             // null = avventura; "survival" = ondate
    this.survival = null;
    // fisica salto + combattimento + telecamere
    this.velY = 0; this.onGround = true;
    this.attackTimer = 0; this.attackCd = 0;
    this.camMode = 0;             // 0 = terza persona, 1 = prima persona, 2 = lontana
    this.lookId = null;           // pointerId attivo per ruotare la telecamera (multi-touch)
    this._touchActive = false;    // joystick premuto (per agganciare la direzione)
    this._moveRefYaw = 0;         // yaw di riferimento del movimento touch

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
      // non catturare i tasti mentre si scrive (chat, campi di testo)
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.repeat) return;
      this.keys.add(e.code);
      if (!this.running) return;
      if (e.code === "KeyE") { e.preventDefault(); this._tryInteract(); }
      if (e.code === "Space") { e.preventDefault(); this.jump(); }
      if (e.code === "KeyF" || e.code === "KeyJ") { e.preventDefault(); this.attack(); }
      if (e.code === "KeyV") { e.preventDefault(); this.cycleCamera(); }
      if (e.code === "KeyQ") { e.preventDefault(); this.toggleSphere(); }
      if (e.code === "KeyM") { e.preventDefault(); this.toggleMap(); }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    const c = this.canvas;
    // ruota la telecamera trascinando: gestione multi-touch tramite pointerId,
    // così joystick e pulsanti (che catturano i propri pointer) non interferiscono.
    c.addEventListener("pointerdown", (e) => {
      if (this.lookId !== null) return;      // già un dito che guarda
      this.lookId = e.pointerId;
      this._lastX = e.clientX; this._lastY = e.clientY;
    });
    const endLook = (e) => { if (e.pointerId === this.lookId) this.lookId = null; };
    window.addEventListener("pointerup", endLook);
    window.addEventListener("pointercancel", endLook);
    window.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this.lookId) return;
      const dx = e.clientX - this._lastX, dy = e.clientY - this._lastY;
      this._lastX = e.clientX; this._lastY = e.clientY;
      this.yaw -= dx * 0.005 * this.sensitivity;
      this.pitch = Math.max(0.05, Math.min(1.2, this.pitch + dy * 0.004 * this.sensitivity));
    });
  }

  // ---------- Salto ----------
  jump() {
    if (!this.running || !this.onGround) return;
    this.velY = 7.2;
    this.onGround = false;
    if (this.audio) this.audio.jump();
  }

  // ---------- Attacco corpo a corpo (pugno) ----------
  attack() {
    if (!this.running || this.attackCd > 0) return;
    this.attackCd = 0.45;
    this.attackTimer = 0.28;     // durata dell'animazione del braccio
    if (this.audio) this.audio.swing();
    const px = this.player.position.x, pz = this.player.position.z;
    const reach = 3.2, reach2 = reach * reach;
    // direzione in cui guarda il giocatore
    const fx = Math.sin(this.player.rotation.y), fz = Math.cos(this.player.rotation.y);
    // Boss davanti e vicino
    if (this.boss && dist2(px, pz, this.boss.position.x, this.boss.position.z) < 12) {
      this._meleeHitBoss();
      return;
    }
    // colpisci il mostro più vicino entro il raggio e grossomodo davanti
    let hit = null, hd = reach2;
    for (const m of this.objects.monsters) {
      const d = dist2(px, pz, m.position.x, m.position.z);
      if (d > hd) continue;
      const toX = m.position.x - px, toZ = m.position.z - pz;
      const dot = (toX * fx + toZ * fz) / (Math.hypot(toX, toZ) || 1);
      if (dot > 0.15) { hd = d; hit = m; }   // davanti (cono ~160°)
    }
    if (hit) { this._meleeBanish(hit); this.shake = Math.max(this.shake, 0.18); }
  }

  cycleCamera() {
    this.camMode = (this.camMode + 1) % 3;
    if (this.player) this.player.visible = this.camMode !== 1;
    const names = ["Terza persona", "Prima persona", "Vista ampia"];
    UI.hint("🎥 " + names[this.camMode]);
  }

  // ---------- Nuova partita (o ripresa da salvataggio) ----------
  start(charConfig, savedState = null, daily = null, mode = null) {
    this.charConfig = charConfig;
    this.mode = mode;
    this.survival = mode === "survival" ? { wave: 0, betweenWaves: false, timer: 0 } : null;
    this.daily = daily;                 // sfida del giorno attiva (o null)
    this.dailyMod = daily ? daily.mod : null;
    this.dailyCompleted = false;
    this.runBanished = 0;
    this.runSealed = 0;
    const fresh = {
      dim: "earth", level: 1, challenges: 1000, deaths: 0,
      hp: 5, maxHp: 5, inventory: {}, cityName: "",
      potionReady: false, alterFreed: false, talkedNPCs: 0,
      portalsClosed: 0, keysFound: 0, monstersBanished: 0, quest: null,
    };
    this.state = savedState ? { ...fresh, ...savedState, quest: null } : fresh;
    // potenziamenti permanenti
    this.upg = Profile.upgradeEffects();
    this.state.maxHp = 5 + this.upg.bonusHp;
    if (!savedState) {
      this.state.hp = this.state.maxHp;
      if (this.upg.startTorches > 0) this.state.inventory.torch = (this.state.inventory.torch || 0) + this.upg.startTorches;
    }
    if (this.state.hp <= 0 || this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
    if (mode === "survival") this.state.dim = "moon";

    // avatar del giocatore
    const built = buildAvatar(charConfig);
    this.player = built.group;
    this.playerParts = built.parts;
    this.avatarTemplate = built.group; // per clonare l'alter ego

    // cosmetici e HUD del profilo
    this.trailCfg = Profile.equippedTrail();
    this.combo = 0;
    this.powerups = {}; // type -> secondi rimanenti
    this.runScore = 0;
    this.sphere = { has: false, energy: 0, active: false, max: 100 * this.upg.sphereMul };
    UI.setPowerups(this.powerups);
    UI.setSphere(this.sphere);
    UI.setCoins(Profile.coins);
    UI.setLevel(Profile.level, Profile.levelProgress().frac);

    this.loadDimension(this.state.dim, this.state.level);
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
    this.boss = null;
    this.weather = null;
    this.shockwaves = [];
    UI.setBossHP(null);

    this.state.dim = dimId;
    this.state.level = level;

    const built = buildDimension(dimId, level);
    this.worldRoot = built.root;
    this.objects = built.objects;
    this.worldSize = built.size;
    this.theme = built.theme;
    this.city = built.city;
    this.state.cityName = built.cityName || DIMENSIONS[dimId].name;
    this.scene.add(this.worldRoot);

    this._setupLighting(dimId, built.theme);
    // meteo dinamico
    const weatherKey = dimId === "earth" && this.city ? this.city.id : dimId;
    const forcedWeather = this.dailyMod === "foggy" ? "fog" : null;
    this.weather = new Weather(this.scene, this.worldRoot, weatherKey, built.theme, forcedWeather);
    UI.setWeather(this.weather.label.emoji, this.weather.label.name);
    if (this.audio) this.audio.setWeatherAmbience(this.weather.type);
    UI.setMood(dimId, this.weather.type);
    if (this.mode === "survival") this._populateSurvival();
    else { this._populate(dimId, level); UI.setWave(null); }
    const centerPanel = document.getElementById("hud-center-panel");
    if (centerPanel) centerPanel.classList.toggle("hidden", this.mode === "survival");

    // posiziona il giocatore al centro
    this.player.position.set(0, 0, 8);
    this.yaw = 0;
    this.velY = 0; this.onGround = true;
    this._touchActive = false;
    this.player.visible = this.camMode !== 1;
    this.scene.add(this.player);

    // multiplayer: entra nella stanza della nuova dimensione
    this.clearRemotes();
    if (this.net && this.net.connected) {
      this.net.enterDimension(dimId, this.player.position.x, this.player.position.z, this.player.rotation.y);
    }

    this._setObjectiveForDim(dimId);
    if (this.audio) this.audio.setAmbient(dimId);
    this.cb.onStateChange(this.state);
    // ricompense d'esplorazione + achievement
    if (dimId === "earth" && this.city) {
      if (!Profile.profile.citiesVisited.includes(this.city.id)) {
        Profile.visitCity(this.city.id);
        this._reward("city");
      }
      this._checkAchievements();
    }
    if (this.weather && this.weather.type === "sand") this._unlockAch("storm");
    // banner d'arrivo
    if (this.mode === "survival") {
      UI.cityBanner("ARENA", "Sopravvivenza", "🌊 Resisti alle ondate!");
    } else if (dimId === "earth" && this.city) {
      UI.cityBanner(this.city.name, t("Terra") + " · " + t(this.city.country), this.city.landmark);
    } else {
      UI.cityBanner(DIMENSIONS[dimId].name, t("Dimensione"), DIMENSIONS[dimId].emoji + " " + t(DIMENSIONS[dimId].desc.split(".")[0]));
    }
    if (spawnMsg) UI.toast(spawnMsg);
    else if (this.weather && this.weather.type !== "clear" && this.weather.type !== "cloudy") {
      const w = this.weather;
      setTimeout(() => UI.toast(`${w.label.emoji} ${w.label.name}${w.mods.hint ? " — " + w.mods.hint : ""}`, 2600), 1400);
    }
  }

  _setupLighting(dimId, theme) {
    this._themeRef = theme;
    const hemi = new THREE.HemisphereLight(theme.skyTop, theme.skyBottom, 0.55);
    this.scene.add(hemi);
    this._hemi = hemi;

    const amb = new THREE.AmbientLight(0xffffff, theme.ambient);
    this.scene.add(amb);
    this._amb = amb;

    const sun = new THREE.DirectionalLight(theme.sunColor, theme.sunInt);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -64; sun.shadow.camera.right = 64;
    sun.shadow.camera.top = 64; sun.shadow.camera.bottom = -64;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    this._sunLight = sun;

    if (theme.stars) this._addStars();

    // sfondo a gradiente cielo (cupola)
    this._addSkyDome(theme.skyTop, theme.skyBottom);
    this.scene.background = new THREE.Color(theme.skyBottom);
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);

    // corpo celeste che si muove (sole di giorno, luna di notte)
    const celColor = theme.night ? 0xdfe6ff : 0xffe066;
    const cel = new THREE.Mesh(new THREE.SphereGeometry(theme.bigSun || theme.bigMoon ? 6 : 4.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: celColor, fog: false }));
    this.scene.add(cel);
    const celGlow = new THREE.PointLight(theme.night ? 0x8ea2ff : 0xfff0b0, 0.5, 260);
    this.scene.add(celGlow);
    this._celestial = cel;
    this._celestialGlow = celGlow;

    // colori base per l'animazione giorno/notte
    this._skyBaseTop = new THREE.Color(theme.skyTop);
    this._skyBaseBottom = new THREE.Color(theme.skyBottom);
    this._fogBase = new THREE.Color(theme.fog);
    this._sunBaseColor = new THREE.Color(theme.sunColor);
    this._duskColor = new THREE.Color(theme.night ? 0x24306a : 0xff8a4a);
    this._dayClock = rand(0, Math.PI * 2); // fase iniziale casuale
    this._updateDayNight(0);
  }

  // Aggiorna sole/luna, luce e cielo per simulare lo scorrere del tempo
  _updateDayNight(dt) {
    if (!this._sunLight) return;
    const theme = this._themeRef;
    this._dayClock += dt * (theme.bigSun ? 0.05 : 0.07); // ~1.5–2 min per ciclo
    const ang = this._dayClock;
    // elevazione oscillante: il Sole resta sempre alto, le altre scene "respirano"
    const base = theme.bigSun ? 0.9 : (theme.night ? 0.55 : 0.5);
    const swing = theme.bigSun ? 0.12 : 0.42;
    const elev = base + swing * Math.sin(ang * 0.6);          // 0..~1.1 rad sopra l'orizzonte
    const azim = ang * 0.5;
    const cosE = Math.cos(elev), sinE = Math.sin(elev);
    const R = 130;
    const px = R * cosE * Math.sin(azim);
    const py = R * sinE;
    const pz = -R * cosE * Math.cos(azim);
    this._celestial.position.set(px, py, pz);
    this._celestialGlow.position.set(px, py, pz);
    this._sunLight.position.set(px * 0.3, py * 0.3 + 10, pz * 0.3);

    // "golden hour": quando il corpo celeste è basso, luce calda e fioca
    const f = Math.max(0, Math.min(1, sinE)); // 0 basso, 1 alto
    this._sunLight.intensity = theme.sunInt * (0.55 + 0.45 * f);
    this._sunLight.color.copy(this._sunBaseColor).lerp(this._duskColor, (1 - f) * (theme.night ? 0.3 : 0.7));

    // cielo: bordo inferiore si tinge al tramonto
    if (this._skyDomeMat) {
      this._skyDomeMat.uniforms.bottom.value.copy(this._skyBaseBottom).lerp(this._duskColor, (1 - f) * 0.6);
      this._skyDomeMat.uniforms.top.value.copy(this._skyBaseTop);
    }
    if (this.scene.fog) this.scene.fog.color.copy(this._fogBase).lerp(this._duskColor, (1 - f) * 0.35);
    if (this._hemi) this._hemi.intensity = 0.45 + 0.2 * f;
  }

  _addSkyDome(top, bottom) {
    const geo = new THREE.SphereGeometry(180, 24, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom;
        void main(){ float h = clamp((normalize(vP).y*0.5)+0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }`,
    });
    this._skyDomeMat = mat;
    this.scene.add(new THREE.Mesh(geo, mat));
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

  _addSphere(o) { this.objects.spheres.push(o); this.worldRoot.add(o); }
  _addCharge(o) { this.objects.charges.push(o); this.worldRoot.add(o); }

  // ---------- Popola con oggetti/nemici ----------
  _populate(dimId, level) {
    this.objects.powerups = [];
    this.objects.spheres = [];
    this.objects.charges = [];
    const spawnAt = (fn) => {
      const a = rand(0, Math.PI * 2), r = rand(6, this.worldSize - 10);
      return fn(Math.cos(a) * r, Math.sin(a) * r);
    };
    const puTypes = Object.keys(POWERUPS);
    const spawnPowerups = (n) => {
      for (let i = 0; i < n; i++) {
        const pu = spawnAt((x, z) => makePowerup(pick(puTypes), x, z));
        this.objects.powerups.push(pu); this.worldRoot.add(pu);
      }
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
      spawnPowerups(2);
      if (!this.sphere.has) this._addSphere(spawnAt((x, z) => makeSphere(x, z)));
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
      // mostri (alcuni d'élite dai livelli avanzati)
      const nMon = 3 + level + (this.dailyMod === "horde" ? 4 : 0);
      const types = ["zombie", "vampire", "werewolf"];
      const nElite = Math.max(0, Math.floor((level - 1) / 2));
      for (let i = 0; i < nMon; i++) {
        const elite = i < nElite;
        const m = spawnAt((x, z) => makeMonster(pick(types), x, z, elite));
        this._addMonster(m);
      }
      // pipistrelli volanti
      const nBats = 2 + Math.floor(level / 2);
      for (let i = 0; i < nBats; i++) {
        const b = spawnAt((x, z) => makeBat(x, z, i < nElite));
        this._addMonster(b);
      }
      // nemici speciali: caricatore e slime
      this._addMonster(spawnAt((x, z) => makeCharger(x, z, false)));
      this._addMonster(spawnAt((x, z) => makeSlime(x, z)));
      for (let i = 0; i < 1; i++) { const n = spawnAt((x, z) => makeNPC(x, z, 0x9060ff)); this._addNPC(n); }
      spawnPowerups(3);
      if (!this.sphere.has) this._addSphere(spawnAt((x, z) => makeSphere(x, z)));
      for (let i = 0; i < 2; i++) this._addCharge(spawnAt((x, z) => makeSphereCharge(x, z)));
      // il tuo io prigioniero (evil)
      this._spawnAlterEgo(true);
      // boss guardiano vicino al tuo io
      this._spawnBoss();
    }

    else { // sun
      for (const t of POTION_RECIPE) {
        if (!this._hasItem(t)) { const it = spawnAt((x, z) => makeItem(t, x, z)); this._addItem(it); }
      }
      for (let i = 0; i < 3; i++) { const it = spawnAt((x, z) => makeItem(pick(["cross", "silver", "torch"]), x, z)); this._addItem(it); }
      this._addPortal(makePortal(0, -16, DIMENSIONS.moon.color, false), { dest: "moon", need: null, label: "Portale verso la Luna" });
      this._addPortal(makePortal(14, 6, DIMENSIONS.earth.color, false), { dest: "earth", need: null, label: "Portale verso la Terra" });
      for (let i = 0; i < 2; i++) { const n = spawnAt((x, z) => makeNPC(x, z, 0xffb347)); this._addNPC(n); }
      spawnPowerups(2);
      for (let i = 0; i < 1; i++) this._addCharge(spawnAt((x, z) => makeSphereCharge(x, z)));
      // il tuo io buono (già salvato? no: qui è amichevole)
      this._spawnAlterEgo(false);
    }
  }

  // ---------- Modalità Sopravvivenza (arena a ondate) ----------
  _spawnAt(fn) {
    const a = rand(0, Math.PI * 2), r = rand(10, this.worldSize - 10);
    return fn(Math.cos(a) * r, Math.sin(a) * r);
  }

  _populateSurvival() {
    this.objects.powerups = [];
    this.objects.spheres = [];
    this.objects.charges = [];
    this._addSphere(this._spawnAt((x, z) => makeSphere(x, z)));
    for (let i = 0; i < 2; i++) this._addCharge(this._spawnAt((x, z) => makeSphereCharge(x, z)));
    // qualche power-up sparso
    const puTypes = Object.keys(POWERUPS);
    for (let i = 0; i < 3; i++) { const pu = this._spawnAt((x, z) => makePowerup(pick(puTypes), x, z)); this.objects.powerups.push(pu); this.worldRoot.add(pu); }
    this.survival = { wave: 0, betweenWaves: true, timer: 2 }; // parte dopo 2s
    UI.setWave(0, 0);
  }

  _startWave(n) {
    this.survival.wave = n;
    this.survival.betweenWaves = false;
    const types = ["zombie", "vampire", "werewolf"];
    const isBossWave = n % 5 === 0;
    const nMon = Math.min(18, 3 + n) - (isBossWave ? 2 : 0);
    const nElite = Math.floor(n / 3);
    const nBats = Math.floor(n / 2);
    for (let i = 0; i < nMon; i++) this._addMonster(this._spawnAt((x, z) => makeMonster(pick(types), x, z, i < nElite)));
    for (let i = 0; i < nBats; i++) this._addMonster(this._spawnAt((x, z) => makeBat(x, z, i < Math.floor(nElite / 2))));
    // nemici speciali crescenti
    const nCharger = Math.floor(n / 2), nSlime = Math.floor(n / 3);
    for (let i = 0; i < nCharger; i++) this._addMonster(this._spawnAt((x, z) => makeCharger(x, z, i < nElite)));
    for (let i = 0; i < nSlime; i++) this._addMonster(this._spawnAt((x, z) => makeSlime(x, z)));
    if (isBossWave) {
      const bx = this._spawnAt((x, z) => ({ x, z }));
      const boss = makeBoss(bx.x, bx.z, Math.random() < 0.5 ? "vampire" : "guardian");
      this.boss = boss; this.worldRoot.add(boss); UI.setBossName(boss.userData.name);
    }
    UI.setWave(n, this._survivalEnemiesLeft());
    UI.toast(isBossWave ? t("🌊 ONDATA {n} — BOSS!", { n }) : t("🌊 Ondata {n}", { n }), 2200);
    if (this.audio) this.audio.seal();
  }

  _survivalEnemiesLeft() { return this.objects.monsters.length + (this.boss ? 1 : 0); }

  _updateSurvival(dt) {
    if (this.mode !== "survival" || !this.survival) return;
    const s = this.survival;
    UI.setWave(s.wave, this._survivalEnemiesLeft());
    if (s.betweenWaves) {
      s.timer -= dt;
      if (s.timer <= 0) this._startWave(s.wave + 1);
    } else if (this._survivalEnemiesLeft() === 0) {
      // ondata superata
      s.betweenWaves = true; s.timer = 3;
      const bonus = 50 + s.wave * 25;
      this.runScore += bonus;
      Profile.addCoins(bonus); Profile.addXP(bonus);
      UI.setCoins(Profile.coins);
      UI.coinPopup(bonus);
      UI.toast(t("✅ Ondata {w} superata! +{b} 🪙 — preparati...", { w: s.wave, b: bonus }), 2600);
      // ricompensa: nuove cariche/power-up ogni tot ondate
      if (s.wave % 3 === 0) {
        for (let i = 0; i < 2; i++) { const pu = this._spawnAt((x, z) => makePowerup(pick(Object.keys(POWERUPS)), x, z)); this.objects.powerups.push(pu); this.worldRoot.add(pu); }
        this._addCharge(this._spawnAt((x, z) => makeSphereCharge(x, z)));
      }
    }
  }

  _spawnAlterEgo(evil) {
    const alter = makeAlterEgo(this.avatarTemplate, evil);
    const a = rand(0, Math.PI * 2), r = this.worldSize - 14;
    alter.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    alter.userData = { kind: "alter", evil };
    this.alter = alter;
    this.worldRoot.add(alter);
    // marcatore luminoso sopra la testa
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: evil ? 0xff2040 : 0x4df3ff, transparent: true, opacity: 0.3 })
    );
    beam.position.set(alter.position.x, 4, alter.position.z);
    this.worldRoot.add(beam);
    this.alterBeam = beam;
  }

  _spawnBoss() {
    // posiziona il boss come guardiano davanti al tuo io prigioniero
    const ax = this.alter ? this.alter.position.x : 0;
    const az = this.alter ? this.alter.position.z : 0;
    const bx = ax * 0.82, bz = az * 0.82;
    const variant = Math.random() < 0.4 ? "vampire" : "guardian";
    const boss = makeBoss(bx, bz, variant);
    this.boss = boss;
    this.worldRoot.add(boss);
    UI.setBossName(boss.userData.name);
  }

  _addItem(o) { this.objects.items.push(o); this.worldRoot.add(o); }
  _addPortal(o, info) { o.userData = { ...o.userData, ...info }; this.objects.portals.push(o); this.worldRoot.add(o); }
  _addNPC(o) { o.userData.talked = false; this.objects.npcs.push(o); this.worldRoot.add(o); }
  _addMonster(o) { this.objects.monsters.push(o); this.worldRoot.add(o); }

  _hasItem(t) { return (this.state.inventory[t] || 0) > 0; }
  _takeItem(t, n = 1) { this.state.inventory[t] = Math.max(0, (this.state.inventory[t] || 0) - n); }
  _giveItem(t, n = 1) { this.state.inventory[t] = (this.state.inventory[t] || 0) + n; }

  _setObjectiveForDim(dimId) {
    if (this.mode === "survival") { UI.setObjective("sopravvivi alle ondate! Premi E vicino ai mostri per respingerli."); return; }
    if (dimId === "earth") UI.setObjective("raccogli 🔑 chiavi e 🛂 passaporti, poi entra in un portale (E).");
    else if (dimId === "moon") UI.setObjective("chiudi i 🔴 portali d'invasione e difenditi. Libera il tuo io con la pozione.");
    else UI.setObjective("raccogli i 3 ingredienti della pozione: 🌿 💎 🍊.");
    // (setObjective traduce internamente il testo)
  }

  // ---------- API pubbliche per i controlli touch ----------
  setTouchMove(x, z) { this.touchMove.x = x; this.touchMove.z = z; }
  interact() { if (this.running) this._tryInteract(); }

  // ---------- Mappa a schermo intero ----------
  toggleMap() {
    this.fullmapOpen = !this.fullmapOpen;
    const el = document.getElementById("fullmap");
    if (el) el.classList.toggle("hidden", !this.fullmapOpen);
  }
  closeMap() {
    this.fullmapOpen = false;
    const el = document.getElementById("fullmap");
    if (el) el.classList.add("hidden");
  }

  // ---------- Impostazioni ----------
  setSensitivity(v) { this.sensitivity = v; }
  setLowEffects(b) {
    this.lowEffects = b;
    this.renderer.setPixelRatio(b ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !b;
  }

  // ---------- Multiplayer: avatar remoti ----------
  _makeNameSprite(name) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.font = "bold 30px Trebuchet MS, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(8,10,24,0.7)";
    const w = ctx.measureText(name).width + 26;
    ctx.fillRect((256 - w) / 2, 10, w, 44);
    ctx.strokeStyle = "#4df3ff"; ctx.lineWidth = 2; ctx.strokeRect((256 - w) / 2, 10, w, 44);
    ctx.fillStyle = "#eaf2ff"; ctx.fillText(name, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(2.6, 0.65, 1);
    spr.position.y = 2.7;
    return spr;
  }

  addRemote(peer) {
    if (this.remotes.has(peer.id)) return;
    let built;
    try { built = buildAvatar(peer.char || {}); } catch (e) { built = buildAvatar({}); }
    const g = built.group;
    g.position.set(peer.x || 0, 0, peer.z || 0);
    g.rotation.y = peer.ry || 0;
    const label = this._makeNameSprite(peer.name || "Player");
    g.add(label);
    this.scene.add(g);
    this.remotes.set(peer.id, { group: g, parts: built.parts, tx: g.position.x, tz: g.position.z, tr: g.rotation.y, walk: 0, label });
  }
  moveRemote(id, d) {
    const r = this.remotes.get(id);
    if (!r) return;
    const dx = d.x - r.tx, dz = d.z - r.tz;
    r.walk = Math.min(1, Math.hypot(dx, dz) * 6);
    r.tx = d.x; r.tz = d.z; r.tr = d.ry;
  }
  removeRemote(id) {
    const r = this.remotes.get(id);
    if (!r) return;
    this.scene.remove(r.group);
    this.remotes.delete(id);
  }
  clearRemotes() {
    for (const [, r] of this.remotes) this.scene.remove(r.group);
    this.remotes.clear();
  }
  onWelcome(peers) {
    this.clearRemotes();
    for (const p of peers) this.addRemote(p);
  }
  // ---------- Emote (bolle fluttuanti) ----------
  _emoteSprite(emoji) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    ctx.font = "88px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(emoji, 64, 72);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    spr.scale.set(1.4, 1.4, 1);
    return spr;
  }
  _floatEmote(group, emoji) {
    if (!group) return;
    const spr = this._emoteSprite(emoji);
    spr.position.set(0, 3.2, 0);
    group.add(spr);
    this.emotes.push({ spr, group, life: 0, max: 2.2 });
  }
  showEmote(emoji) {
    this._floatEmote(this.player, emoji);
    if (this.net && this.net.connected) this.net.sendEmote(emoji);
  }
  showRemoteEmote(id, emoji) {
    const r = this.remotes.get(id);
    if (r) this._floatEmote(r.group, emoji);
  }
  _updateEmotes(dt) {
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const e = this.emotes[i];
      e.life += dt;
      e.spr.position.y = 3.2 + e.life * 0.6;
      e.spr.material.opacity = Math.max(0, 1 - e.life / e.max);
      if (e.life >= e.max) { e.group.remove(e.spr); this.emotes.splice(i, 1); }
    }
  }

  _updateRemotes(dt, t) {
    for (const [, r] of this.remotes) {
      r.group.position.x += (r.tx - r.group.position.x) * Math.min(1, dt * 12);
      r.group.position.z += (r.tz - r.group.position.z) * Math.min(1, dt * 12);
      let dr = r.tr - r.group.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      r.group.rotation.y += dr * Math.min(1, dt * 12);
      animateAvatar(r.parts, t, r.walk * 0.6);
      r.walk *= 0.9;
    }
  }

  // ---------- Interazione (tasto E) ----------
  _tryInteract() {
    if (this.interactLock > 0) return;
    const px = this.player.position.x, pz = this.player.position.z;

    // Boss vicino: attaccalo
    if (this.boss && dist2(px, pz, this.boss.position.x, this.boss.position.z) < 9) {
      this._attackBoss();
      this.interactLock = 0.35;
      return;
    }
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
    // dialoghi locali per le città della Terra, altrimenti generici
    let speaker = "Persona strana", line;
    const cityNpc = this.state.dim === "earth" && this.city ? CITY_NPCS[this.city.id] : null;
    if (cityNpc) { speaker = cityNpc.speaker; line = pick(cityNpc.lines); }
    else { line = pick(NPC_LINES[this.state.dim]); }

    if (!n.userData.talked) {
      n.userData.talked = true;
      this.state.talkedNPCs++;
      this._progress(5);
    }
    // Offri una missione se non ce n'è una attiva
    if (!this.state.quest && !n.userData.questGiven) {
      const q = this._makeQuest();
      n.userData.questGiven = true;
      UI.openDialog(speaker, line + "\n\n« " + q.desc + " »", [
        { label: "Accetto la sfida", primary: true, cb: () => { UI.closeDialog(); this._assignQuest(q); } },
        { label: "Più tardi", cb: () => UI.closeDialog() },
      ]);
      return;
    }
    UI.openDialog(speaker, line, [{ label: "Capito", primary: true, cb: () => UI.closeDialog() }]);
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
      this._reward("quest");
      this.state.quest = null;
      UI.setQuest(null);
      if (this.audio) this.audio.seal();
      UI.toast(`🏅 Sfida completata! Ricompensa: ${ITEMS[q.reward].emoji} ${ITEMS[q.reward].label}`, 2800);
      this.cb.onStateChange(this.state);
    }
  }

  _meleeBanish(m) { this._banishMonster(m, true); }

  _banishMonster(m, melee = false) {
    // in Sopravvivenza o con un pugno (melee) si combatte a mani libere
    const free = melee || this.mode === "survival";
    const defense = free ? null : ["torch", "silver", "cross", "garlic"].find((t) => this._hasItem(t));
    if (!free && !defense) {
      UI.openDialog("Mostro!", "Non hai armi per respingerlo! Ti serve 🔦 torcia, ⚙️ argento, ✝️ croce o 🧄 aglio.", [{ label: "Fuggi", cb: UI.closeDialog }]);
      return;
    }
    if (defense) this._takeItem(defense);
    const i = this.objects.monsters.indexOf(m);
    if (i >= 0) this.objects.monsters.splice(i, 1);
    this._spawnBurst(m.position.x, 1.2, m.position.z, 0xffe9a0, 18);
    this.worldRoot.remove(m);
    // lo slime si divide in due mini-slime
    if (m.userData.splits > 0) {
      for (let k = 0; k < 2; k++) {
        const mini = makeSlime(m.position.x + rand(-1.2, 1.2), m.position.z + rand(-1.2, 1.2), true);
        this._addMonster(mini);
      }
    }
    this.state.monstersBanished++;
    Profile.addBanish(1);
    this.runBanished++;
    this._bumpCombo();
    this._reward("banish");
    this._checkDaily("banish");
    this._progress(15);
    if (this.audio) this.audio.banish();
    UI.toast(melee ? "👊 Colpo! Mostro sconfitto!" : (free ? "💥 Mostro respinto!" : `💥 Mostro respinto con ${ITEMS[defense].emoji}!`), 1500);
    this._checkQuest();
    this.cb.onStateChange(this.state);
  }

  // ---------- Boss finale ----------
  _meleeHitBoss() { this._attackBoss(true); }

  _attackBoss(melee = false) {
    const bossName = this.boss.userData.name;
    const free = melee || this.mode === "survival";
    const defense = free ? null : ["torch", "silver", "cross", "garlic"].find((t) => this._hasItem(t));
    if (!free && !defense) {
      UI.openDialog(bossName, "Serve un'arma per colpirlo! Raccogli 🔦 torce, ⚙️ argento, ✝️ croci o 🧄 aglio.", [{ label: "Indietro", cb: UI.closeDialog }]);
      return;
    }
    if (defense) this._takeItem(defense);
    const bu = this.boss.userData;
    bu.hp--;
    if (this.audio) this.audio.banish();
    this.shake = 0.3;
    this._spawnBurst(this.boss.position.x, 2.2, this.boss.position.z, 0xff3366, 16);
    this._reward("bossHit");
    // reazione visiva
    this.boss.position.y = 0.3;
    UI.setBossHP(Math.max(0, bu.hp), bu.maxHp);
    // FASE 2: il boss si infuria sotto metà vita
    if (!bu.phase2 && bu.hp > 0 && bu.hp <= Math.ceil(bu.maxHp / 2)) {
      bu.phase2 = true;
      bu.speed *= 1.6;
      bu.attackTimer = 1.2; bu.summonTimer = 1.5; bu.teleTimer = 1.2;
      this.shake = 0.8;
      this._spawnBurst(this.boss.position.x, 2.5, this.boss.position.z, 0xff2020, 40);
      this.boss.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) o.material.emissiveIntensity = Math.min(1.2, (o.material.emissiveIntensity || 0.3) + 0.5); });
      UI.setBossName(bu.name + " · INFURIATO");
      UI.hint("🔥 Il boss si è INFURIATO!");
      UI.toast(`🔥 ${bu.name} si infuria — attacca più in fretta!`, 2600);
    }
    this.cb.onStateChange(this.state);
    if (this.boss.userData.hp <= 0) {
      this._spawnBurst(this.boss.position.x, 2.5, this.boss.position.z, 0xffd35c, 40);
      this.shake = 0.7;
      this.worldRoot.remove(this.boss);
      this.boss = null;
      UI.setBossHP(null);
      this._progress(120);
      Profile.recordBossDefeat();
      this._reward("bossKill");
      this._unlockAch("boss_slayer");
      if (this.audio) { this.audio.seal(); this.audio.setBossProximity(0); }
      if (this.mode === "survival") UI.toast(`💥 ${bossName} sconfitto!`, 2200);
      else UI.openDialog(`${bossName} è caduto!`, "L'hai sconfitto! Ora puoi raggiungere il tuo io imprigionato e usare la pozione magica.", [{ label: "Avanti!", primary: true, cb: UI.closeDialog }]);
    } else {
      UI.toast(`⚔️ Colpito! (${this.boss.userData.hp}/${this.boss.userData.maxHp})`, 1400);
    }
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
      this.runSealed++;
      this._progress(30);
      this._reward("seal");
      this._checkDaily("seal");
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
      if (this.boss) {
        UI.openDialog("Il tuo Io (Luna)", "«Il Guardiano mi tiene prigioniero... devi sconfiggerlo prima di potermi raggiungere!»", [{ label: "Lo affronterò", cb: UI.closeDialog }]);
        return;
      }
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
            Profile.recordVictory();
            Profile.recordRun(this.state.deaths, 1000 - this.state.challenges);
            this._reward("victory");
            this.runScore += 2000; // bonus vittoria
            Profile.addScore(this.charConfig.name, this.runScore, true);
            this._unlockAch("savior");
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

  // ---------- Combo + ricompense (monete/XP) ----------
  _bumpCombo() {
    this.combo++;
    this.comboTimer = 4.0; // finestra combo
    if (this.combo >= 2) UI.showCombo(this.combo);
    Profile.recordBestCombo(this.combo);
    if (this.combo >= 5) this._unlockAch("combo5");
    this._checkDaily("combo");
  }
  get comboMul() {
    let step = this.upg ? this.upg.comboStep : 0.1;
    if (this.dailyMod === "comboBoost") step += 0.1;
    return 1 + Math.min(this.combo, 15) * step;
  }

  _reward(event) {
    const r = REWARDS[event]; if (!r) return;
    let coins = Math.round(r.coins * (event === "pickup" || event === "banish" ? this.comboMul : 1));
    if (this.powerups.coins2x > 0) coins *= 2;
    if (this.dailyMod === "doubleCoins") coins *= 2;
    if (this.upg) coins = Math.round(coins * this.upg.coinMul);
    this.runScore += coins;
    Profile.addCoins(coins);
    const lv = Profile.addXP(r.xp);
    UI.setCoins(Profile.coins);
    UI.setLevel(Profile.level, Profile.levelProgress().frac);
    UI.coinPopup(coins);
    if (lv.leveledUp) { UI.levelUp(lv.to); if (this.audio) this.audio.seal(); }
    this._checkAchievements();
    this._checkDaily("coins");
  }

  // Verifica il completamento della Sfida del Giorno
  _checkDaily() {
    if (!this.daily || this.dailyCompleted) return;
    const g = this.daily;
    let progress = 0;
    if (g.goalType === "coins") progress = this.runScore;
    else if (g.goalType === "combo") progress = this.combo;
    else if (g.goalType === "banish") progress = this.runBanished;
    else if (g.goalType === "seal") progress = this.runSealed;
    if (progress >= g.goalAmount) {
      this.dailyCompleted = true;
      Profile.completeDailyChallenge(g.reward);
      UI.setCoins(Profile.coins);
      if (this.audio) this.audio.victory();
      UI.achievementToast({ icon: g.icon, name: "Sfida del Giorno completata!", desc: `${g.name} · +${g.reward} 🪙` });
    }
  }

  _unlockAch(id, flags) {
    const got = Profile.checkAchievements({ [id]: true, ...(flags || {}) });
    for (const a of got) UI.achievementToast(a);
  }
  _checkAchievements() {
    const got = Profile.checkAchievements();
    for (const a of got) UI.achievementToast(a);
  }

  // ---------- Progresso sfide ----------
  _progress(amount) {
    this.state.challenges = Math.max(0, this.state.challenges - amount);
    this.cb.onStateChange(this.state);
  }

  // ---------- Danno / morte ----------
  _damage(n) {
    if (this.hitCooldown > 0) return false;
    if (this.powerups.shield > 0) { this.hitCooldown = 0.5; UI.hint("🛡️ Bloccato!"); return false; }
    this.hitCooldown = 1.0;
    this.state.hp -= n;
    this.shake = Math.min(0.9, 0.35 * n);
    if (this.audio) this.audio.hit();
    UI.flashDamage();
    UI.hint("💥 Colpito!");
    this.cb.onStateChange(this.state);
    if (this.state.hp <= 0) this._die();
    return true;
  }

  _die() {
    this.running = false;
    if (this.audio) this.audio.death();
    this.state.deaths++;
    this.combo = 0; UI.hideCombo();
    this.powerups = {}; UI.setPowerups(this.powerups);
    if (this.mode === "survival") {
      const wave = this.survival ? this.survival.wave : 0;
      Profile.addScore(this.charConfig.name, this.runScore, false, "survival");
      this.state.survivalWave = wave;
    } else {
      this.state.challenges += 100;
      Profile.recordRun(this.state.deaths, Math.max(0, 1000 - this.state.challenges));
      Profile.addScore(this.charConfig.name, this.runScore, false);
    }
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

    this._updateDayNight(dt);
    this._updatePlayer(dt, t);
    this._updateMonsters(dt);
    this._updatePickups();
    this._updateProximityHints();
    animateWorldObjects(this.objects, t, dt);
    if (this.weather) this.weather.update(dt, t);
    if (this.fullmapOpen) { const mc = document.getElementById("fullmap-canvas"); if (mc) renderFullMap(this, mc); }
    if (this.bursts.length) this._updateBursts(dt);
    if (this.shockwaves.length) this._updateShockwaves(dt);
    if (this.remotes.size) this._updateRemotes(dt, t);
    if (this.emotes.length) this._updateEmotes(dt);
    this._updateSphere(dt);
    if (this.mode === "survival") this._updateSurvival(dt);
    if (this.alterBeam) this.alterBeam.material.opacity = 0.2 + Math.sin(t * 3) * 0.12;
    this.minimap.render(this);

    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.interactLock > 0) this.interactLock -= dt;
    // decadimento combo
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; UI.hideCombo(); }
    }
    // decadimento power-up
    let puChanged = false;
    for (const k of Object.keys(this.powerups)) {
      if (this.powerups[k] > 0) {
        this.powerups[k] -= dt;
        if (this.powerups[k] <= 0) { delete this.powerups[k]; puChanged = true; }
      }
    }
    if (puChanged || Object.keys(this.powerups).length) UI.setPowerups(this.powerups);

    this.renderer.render(this.scene, this.camera);
  }

  _updatePlayer(dt, t) {
    const run = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    let moveMul = this.weather ? this.weather.mods.moveMul : 1;
    if (this.powerups.speed > 0) moveMul *= 1.6;
    if (this.dailyMod === "alwaysFast") moveMul *= 1.4;
    if (this.upg) moveMul *= this.upg.moveMul;
    const speed = (run ? 9 : 5) * moveMul * dt;
    let mx = 0, mz = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) mz -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) mz += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;

    // joystick touch (se la tastiera non è in uso)
    let fromTouch = false;
    if (mx === 0 && mz === 0 && (this.touchMove.x || this.touchMove.z)) {
      mx = this.touchMove.x; mz = this.touchMove.z; fromTouch = true;
    }

    // Latch: "su" del joystick = avanti relativo alla telecamera nell'istante
    // in cui inizi a spingere. Resta fisso per tutta la spinta (niente deriva),
    // poi la telecamera insegue. Al rilascio si ri-aggancia alla nuova vista.
    if (fromTouch) {
      if (!this._touchActive) { this._touchActive = true; this._moveRefYaw = this.yaw; }
    } else {
      this._touchActive = false;
    }

    let moving = 0;
    if (mx || mz) {
      const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      const fwd = -mz, rgt = mx;
      let dx, dz;
      if (fromTouch) {
        // MOBILE: direzioni relative alla vista agganciata (_moveRefYaw).
        const ry = this._moveRefYaw;
        const sin = Math.sin(ry), cos = Math.cos(ry);
        dx = rgt * cos + fwd * sin;
        dz = -rgt * sin + fwd * cos;
        // la telecamera insegue la direzione di marcia (così finisci sempre
        // a vedere il personaggio di spalle, di qualunque parte tu vada)
        if (this.camMode !== 1 && this.lookId === null) {
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - this.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.yaw += diff * Math.min(1, dt * 4);
        }
      } else {
        // DESKTOP: movimento relativo alla telecamera (WASD classico).
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        dx = rgt * cos + fwd * sin;
        dz = -rgt * sin + fwd * cos;
      }
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

    // salto e gravità (Terra/Luna/Sole: piano a y=0)
    this.velY -= 22 * dt;
    this.player.position.y += this.velY * dt;
    if (this.player.position.y <= 0) {
      this.player.position.y = 0;
      if (!this.onGround && this.velY < -3 && this.audio) this.audio.land();
      this.velY = 0; this.onGround = true;
    }

    animateAvatar(this.playerParts, t, moving);

    // animazione del pugno (sovrascrive il braccio destro durante l'attacco)
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      const p = 1 - Math.max(0, this.attackTimer) / 0.28;   // 0 → 1
      const swing = Math.sin(p * Math.PI);                   // 0 → 1 → 0
      if (this.playerParts && this.playerParts.arms) {
        this.playerParts.arms[1].rotation.x = -swing * 1.7;
        this.playerParts.arms[1].rotation.z = swing * 0.3;
      }
    }

    // sincronizzazione multiplayer
    if (this.net) this.net.sendMove(this.player.position.x, this.player.position.z, this.player.rotation.y, dt);

    // scia luminosa cosmetica
    if (this.trailCfg && this.trailCfg.color != null) {
      this.trailTimer -= dt;
      if (moving > 0 && this.trailTimer <= 0) {
        this.trailTimer = 0.05;
        let c = this.trailCfg.color;
        if (this.trailCfg.rainbow) c = new THREE.Color().setHSL((t * 0.3) % 1, 1, 0.6).getHex();
        this._emitTrail(c);
      }
    }

    // ---- Telecamera: terza persona / prima persona / vista ampia ----
    const px2 = this.player.position.x, py2 = this.player.position.y, pz2 = this.player.position.z;
    if (this.camMode === 1) {
      // Prima persona (stile Minecraft): occhi del personaggio
      const hy = py2 + 1.55;
      this.camera.position.set(px2, hy, pz2);
      const tx = px2 + Math.sin(this.yaw) * 8;
      const tz = pz2 + Math.cos(this.yaw) * 8;
      const ty = hy + (0.4 - this.pitch) * 6;
      this.camera.lookAt(tx, ty, tz);
      // il personaggio guarda dove punta la telecamera
      if (moving === 0) this.player.rotation.y = this.yaw;
    } else {
      const camDist = this.camMode === 2 ? 13 : 7;
      const camH = (this.camMode === 2 ? 4 : 3) + this.pitch * 4;
      const cx = px2 - Math.sin(this.yaw) * camDist * Math.cos(this.pitch);
      const cz = pz2 - Math.cos(this.yaw) * camDist * Math.cos(this.pitch);
      const cy = py2 + camH;
      this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.15);
      this.camera.lookAt(px2, py2 + 1.4, pz2);
    }
    // camera shake
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= 0.86;
    }
  }

  _blocked(x, z) {
    for (const c of this.objects.colliders) {
      if (dist2(x, z, c.x, c.z) < (c.r + 0.5) * (c.r + 0.5)) return true;
    }
    return false;
  }

  _updateMonsters(dt) {
    const px = this.player.position.x, pz = this.player.position.z;
    const rangeMul = this.weather ? this.weather.mods.monsterRangeMul : 1;
    const sight = 22 * rangeMul;
    const frozen = this.powerups.freeze > 0;
    const et = this.clock.elapsedTime;
    for (const m of this.objects.monsters) {
      const u = m.userData;
      const dx = px - m.position.x, dz = pz - m.position.z;
      const d = Math.hypot(dx, dz);
      const chase = () => { if (d > 0.01) { m.position.x += (dx / d) * u.speed * dt; m.position.z += (dz / d) * u.speed * dt; m.rotation.y = Math.atan2(dx, dz); } };

      if (u.behavior === "charge") {
        // Caricatore: stalka lento, poi scatta in carica
        if (!frozen) {
          if (u.charging > 0) { u.charging -= dt; m.position.x += u.cvx * dt; m.position.z += u.cvz * dt; }
          else {
            u.chargeTimer -= dt;
            if (d < sight) chase();
            if (u.chargeTimer <= 0 && d < 16 && d > 0.01) { u.charging = 0.6; u.chargeTimer = rand(2.6, 4.2); u.cvx = dx / d * 11; u.cvz = dz / d * 11; m.rotation.y = Math.atan2(dx, dz); this._spawnBurst(m.position.x, 0.6, m.position.z, 0xff5a3c, 6); }
          }
        }
        m.position.y = frozen ? 0 : Math.abs(Math.sin(et * 6 + m.position.x)) * 0.12;
        if (!frozen && d < 1.4) { if (this._damage(1)) this._tryStealSphere(m); }
      }
      else if (u.behavior === "slime") {
        // Slime: saltella verso di te (si divide quando lo respingi)
        if (!frozen && d < sight) chase();
        const hop = Math.abs(Math.sin(et * 4 + m.position.x)) * 0.45;
        m.position.y = frozen ? 0 : hop;
        if (u.blob) u.blob.scale.y = 0.7 - hop * 0.35;
        if (!frozen && d < 1.3) { if (this._damage(1)) this._tryStealSphere(m); }
      }
      else if (u.flying) {
        if (!frozen && d < sight) chase();
        const dive = d < 4 ? -1.4 : 0;
        m.position.y = frozen ? u.hover : u.hover + Math.sin(et * 3 + m.position.x) * 0.4 + dive;
        if (u.wings) for (const w of u.wings) w.pivot.rotation.z = w.sx * Math.sin(et * 14) * 0.7;
        if (!frozen && d < 1.6 && m.position.y < 2.2) { if (this._damage(1)) this._tryStealSphere(m); }
      }
      else {
        if (!frozen && d < sight) chase();
        m.position.y = frozen ? 0 : Math.abs(Math.sin(et * 6 + m.position.x)) * 0.15;
        if (!frozen && d < 1.3) { if (this._damage(1)) this._tryStealSphere(m); }
      }
    }
    // Boss: insegue e colpisce più forte
    if (this.boss) {
      // Signore dei Vampiri: si teletrasporta vicino al giocatore
      if (!frozen && this.boss.userData.variant === "vampire") {
        this.boss.userData.teleTimer -= dt;
        if (this.boss.userData.teleTimer <= 0) {
          this.boss.userData.teleTimer = rand(3.5, 5.5);
          this._spawnBurst(this.boss.position.x, 2, this.boss.position.z, 0xff1040, 20);
          const a = rand(0, Math.PI * 2), r = rand(5, 8);
          this.boss.position.x = px + Math.cos(a) * r;
          this.boss.position.z = pz + Math.sin(a) * r;
          this._spawnBurst(this.boss.position.x, 2, this.boss.position.z, 0xff1040, 20);
        }
      }
      const dx = px - this.boss.position.x, dz = pz - this.boss.position.z;
      const d = Math.hypot(dx, dz);
      // ---- Attacchi speciali (fase epica quando sei vicino) ----
      if (!frozen && d < 24) {
        if (this.boss.userData.variant === "guardian") {
          this.boss.userData.attackTimer -= dt;
          if (this.boss.userData.attackTimer <= 0) {
            this.boss.userData.attackTimer = rand(5, 7);
            this.boss.position.y = 0.6; // affondo
            this.shake = 0.5;
            this._spawnShockwave(this.boss.position.x, this.boss.position.z, 0xff3366);
            UI.hint("💥 Onda d'urto! Allontanati!");
          }
        } else if (this.boss.userData.variant === "vampire") {
          this.boss.userData.summonTimer -= dt;
          if (this.boss.userData.summonTimer <= 0) {
            this.boss.userData.summonTimer = rand(5, 7);
            for (let i = 0; i < 2; i++) {
              const bat = makeBat(this.boss.position.x + rand(-2, 2), this.boss.position.z + rand(-2, 2));
              this._addMonster(bat);
            }
            this._spawnBurst(this.boss.position.x, 2.5, this.boss.position.z, 0xff1040, 16);
            UI.hint("🦇 Il Vampiro evoca pipistrelli!");
          }
        }
      }
      if (!frozen && d < 30 && d > 0.01) {
        this.boss.position.x += (dx / d) * this.boss.userData.speed * dt;
        this.boss.position.z += (dz / d) * this.boss.userData.speed * dt;
        this.boss.rotation.y = Math.atan2(dx, dz);
      }
      this.boss.position.y += (0 - this.boss.position.y) * 0.08; // ritorna a terra dopo un colpo
      // mostra la barra HP quando sei vicino
      if (d < 12) UI.setBossHP(this.boss.userData.hp, this.boss.userData.maxHp);
      else UI.setBossHP(null);
      if (!frozen && d < 2.0) { if (this._damage(2)) this._tryStealSphere(this.boss); }
      // musica di tensione crescente
      if (this.audio) this.audio.setBossProximity(Math.max(0, Math.min(1, 1 - d / 26)));
    } else if (this.audio) {
      this.audio.setBossProximity(0);
    }
  }

  // ---------- Burst di scintille (feedback raccolta/eventi) ----------
  _spawnBurst(x, y, z, color, count = 14) {
    if (this.lowEffects) count = Math.max(4, Math.ceil(count / 3));
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, e = rand(0.4, 1.6), sp = rand(2, 5);
      vel.push([Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 2, Math.sin(a) * Math.cos(e) * sp]);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.28, transparent: true, opacity: 1, depthWrite: false }));
    pts.frustumCulled = false;
    this.worldRoot.add(pts);
    this.bursts.push({ pts, vel, life: 0, max: 0.7 });
  }

  // Onda d'urto del boss (da schivare)
  _spawnShockwave(x, z, color) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.1, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.15, z);
    this.worldRoot.add(ring);
    this.shockwaves.push({ ring, r: 1, hit: false, x, z });
  }

  _updateShockwaves(dt) {
    const px = this.player.position.x, pz = this.player.position.z;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += 16 * dt;
      s.ring.scale.setScalar(s.r);
      s.ring.material.opacity = Math.max(0, 0.7 - s.r / 24);
      // colpisce se il giocatore è sul fronte dell'onda ed è a terra
      if (!s.hit) {
        const d = Math.hypot(px - s.x, pz - s.z);
        if (Math.abs(d - s.r) < 1.4 && this.player.position.y < 1) {
          s.hit = true;
          this._damage(1);
        }
      }
      if (s.r > 22) { this.worldRoot.remove(s.ring); this.shockwaves.splice(i, 1); }
    }
  }

  _emitTrail(color) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array([
      this.player.position.x + rand(-0.18, 0.18), 0.35, this.player.position.z + rand(-0.18, 0.18),
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.45, transparent: true, opacity: 0.85, depthWrite: false }));
    pts.frustumCulled = false;
    this.worldRoot.add(pts);
    this.bursts.push({ pts, vel: [[0, 1.0, 0]], life: 0, max: 0.55 });
  }

  _updateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      const arr = b.pts.geometry.attributes.position.array;
      for (let j = 0; j < b.vel.length; j++) {
        b.vel[j][1] -= 9 * dt; // gravità
        arr[j * 3] += b.vel[j][0] * dt;
        arr[j * 3 + 1] += b.vel[j][1] * dt;
        arr[j * 3 + 2] += b.vel[j][2] * dt;
      }
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.life / b.max);
      if (b.life >= b.max) { this.worldRoot.remove(b.pts); this.bursts.splice(i, 1); }
    }
  }

  _activatePowerup(type) {
    const def = POWERUPS[type];
    this.powerups[type] = def.duration;
    UI.setPowerups(this.powerups);
    if (this.audio) this.audio.potion();
    UI.toast(`${def.emoji} ${def.label}! ${def.desc}`, 2000);
    this.shake = 0.2;
  }

  // ---------- Sfera del Veggente ----------
  _collectSphere(energy = 100) {
    this.sphere.has = true;
    this.sphere.energy = this.sphere.max || 100;
    this.sphere.active = true;
    UI.setSphere(this.sphere);
    if (this.audio) this.audio.potion();
    UI.toast("🔮 Sfera del Veggente! Rivela i mostri (premi Q per attivarla/spegnerla)", 3200);
  }

  toggleSphere() {
    if (!this.sphere.has) { UI.hint("Non hai la Sfera del Veggente"); return; }
    if (!this.sphere.active && this.sphere.energy <= 0) { UI.hint("🔮 Sfera scarica — raccogli 🔋 cariche"); return; }
    this.sphere.active = !this.sphere.active;
    UI.hint(this.sphere.active ? "🔮 Sfera attiva" : "🔮 Sfera spenta");
    UI.setSphere(this.sphere);
    if (!this.sphere.active) this._clearBeacons();
  }

  _updateSphere(dt) {
    // sfere rubate: scompaiono se non riprese
    if (this.objects && this.objects.spheres) {
      for (let i = this.objects.spheres.length - 1; i >= 0; i--) {
        const s = this.objects.spheres[i];
        if (s.userData.ttl != null) {
          s.userData.ttl -= dt;
          const fade = Math.max(0.2, Math.min(1, s.userData.ttl / 3));
          if (s.userData.orb) s.userData.orb.material.opacity = 0.85 * fade;
          if (s.userData.ttl <= 0) { this.worldRoot.remove(s); this.objects.spheres.splice(i, 1); }
        }
      }
    }
    if (!this.sphere.has) return;
    if (this.sphere.active && this.sphere.energy > 0) {
      this.sphere.energy = Math.max(0, this.sphere.energy - 6 * dt); // si consuma tenendola attiva
      if (this.sphere.energy <= 0) {
        this.sphere.active = false;
        this._clearBeacons();
        UI.toast("🔮 La Sfera si è scaricata! Raccogli 🔋 cariche per riattivarla", 2600);
      }
      UI.setSphere(this.sphere);
    }
    // fari sui mostri mentre è attiva
    if (this.sphere.active && this.sphere.energy > 0) this._updateBeacons();
  }

  _updateBeacons() {
    for (const m of this.objects.monsters) {
      if (!m.userData.beacon) { const b = makeBeacon(); m.userData.beacon = b; m.add(b); }
    }
    if (this.boss && !this.boss.userData.beacon) { const b = makeBeacon(); this.boss.userData.beacon = b; this.boss.add(b); }
  }
  _clearBeacons() {
    for (const m of this.objects.monsters) { if (m.userData.beacon) { m.remove(m.userData.beacon); m.userData.beacon = null; } }
    if (this.boss && this.boss.userData.beacon) { this.boss.remove(this.boss.userData.beacon); this.boss.userData.beacon = null; }
  }

  // Un mostro può rubarti la Sfera quando ti colpisce
  _tryStealSphere(monster) {
    if (!this.sphere.has) return;
    if (Math.random() > 0.4) return; // 40% di probabilità
    const dropEnergy = Math.max(10, this.sphere.energy * 0.6);
    this.sphere.has = false; this.sphere.active = false; this.sphere.energy = 0;
    this._clearBeacons();
    UI.setSphere(this.sphere);
    // la Sfera cade poco oltre il mostro: inseguila per riprenderla!
    const ang = Math.atan2(monster.position.z - this.player.position.z, monster.position.x - this.player.position.x);
    const dropX = monster.position.x + Math.cos(ang) * 3;
    const dropZ = monster.position.z + Math.sin(ang) * 3;
    const dropped = makeSphere(dropX, dropZ, dropEnergy);
    dropped.userData.ttl = 12; // sparisce se non la riprendi in tempo
    this._addSphere(dropped);
    if (this.audio) this.audio.hit();
    UI.toast("😱 Ti hanno rubato la Sfera! Riprendila prima che sparisca!", 2800);
  }

  _updatePickups() {
    const px = this.player.position.x, pz = this.player.position.z;
    // Sfera del Veggente
    for (let i = this.objects.spheres.length - 1; i >= 0; i--) {
      const s = this.objects.spheres[i];
      if (dist2(px, pz, s.position.x, s.position.z) < 1.8) {
        this._spawnBurst(s.position.x, s.position.y, s.position.z, 0x4df3ff, 22);
        this.worldRoot.remove(s);
        this.objects.spheres.splice(i, 1);
        this._collectSphere(s.userData.energy);
      }
    }
    // cariche per la Sfera
    for (let i = this.objects.charges.length - 1; i >= 0; i--) {
      const c = this.objects.charges[i];
      if (dist2(px, pz, c.position.x, c.position.z) < 1.6) {
        this.worldRoot.remove(c);
        this.objects.charges.splice(i, 1);
        if (this.sphere.has) {
          this.sphere.energy = Math.min(this.sphere.max || 100, this.sphere.energy + 40);
          UI.setSphere(this.sphere);
          if (this.audio) this.audio.pickup();
          UI.toast("🔋 Sfera ricaricata! (+40)", 1500);
        } else {
          UI.toast("🔋 Carica raccolta — ti serve la Sfera del Veggente!", 1800);
        }
      }
    }
    // power-up
    for (let i = this.objects.powerups.length - 1; i >= 0; i--) {
      const pu = this.objects.powerups[i];
      if (dist2(px, pz, pu.position.x, pu.position.z) < 1.6) {
        this._spawnBurst(pu.position.x, pu.position.y, pu.position.z, POWERUPS[pu.userData.type].color, 20);
        this.worldRoot.remove(pu);
        this.objects.powerups.splice(i, 1);
        this._activatePowerup(pu.userData.type);
      }
    }
    // magnete: attira gli oggetti vicini
    if (this.powerups.magnet > 0) {
      for (const it of this.objects.items) {
        const d = Math.hypot(px - it.position.x, pz - it.position.z);
        if (d < 12 && d > 0.1) {
          it.position.x += (px - it.position.x) / d * 14 * (1 / 60);
          it.position.z += (pz - it.position.z) / d * 14 * (1 / 60);
        }
      }
    }
    for (let i = this.objects.items.length - 1; i >= 0; i--) {
      const it = this.objects.items[i];
      if (dist2(px, pz, it.position.x, it.position.z) < 1.4) {
        const type = it.userData.type;
        this._giveItem(type);
        if (type === "key") this.state.keysFound++;
        this._spawnBurst(it.position.x, it.position.y, it.position.z, ITEMS[type].color);
        this.worldRoot.remove(it);
        this.objects.items.splice(i, 1);
        this._progress(10);
        if (this.audio) this.audio.pickup();
        Profile.addItem(1);
        this._bumpCombo();
        this._reward("pickup");
        if (type === "key") this._unlockAch("first_key");
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
