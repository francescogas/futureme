// ============================================================
//  FUTUREME — helper interfaccia (HUD, toast, dialoghi)
// ============================================================
import { ITEMS, DIMENSIONS, POWERUPS } from "./data.js";

const $ = (id) => document.getElementById(id);

export function show(id) { $(id)?.classList.remove("hidden"); }
export function hide(id) { $(id)?.classList.add("hidden"); }

let toastTimer = null;
export function toast(msg, ms = 2200) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
}

let hintTimer = null;
export function hint(msg) {
  const el = $("hud-hint");
  if (!msg) { el.classList.remove("show"); return; }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

export function setObjective(text) {
  $("hud-objective").textContent = "Obiettivo: " + text;
}

let bannerTimer = null;
export function cityBanner(title, sub, landmark) {
  const el = $("city-banner");
  $("cb-title").textContent = title;
  $("cb-sub").textContent = sub || "";
  $("cb-landmark").textContent = landmark ? "★ " + landmark : "";
  el.classList.remove("hidden");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add("hidden"), 3400);
}

export function setQuest(text) {
  const el = $("hud-quest");
  if (!text) { el.classList.add("hidden"); return; }
  el.textContent = "🎯 " + text;
  el.classList.remove("hidden");
}

// Vignettatura d'atmosfera per dimensione + meteo
export function setMood(dim, weather) {
  const el = $("vignette");
  if (!el) return;
  let shadow, tint = "transparent";
  if (dim === "moon") { shadow = "inset 0 0 260px 40px rgba(2,4,20,0.85)"; tint = "radial-gradient(130% 130% at 50% 30%, transparent 45%, rgba(20,10,50,0.4))"; }
  else if (dim === "sun") { shadow = "inset 0 0 180px 10px rgba(255,180,80,0.18)"; tint = "transparent"; }
  else { shadow = "inset 0 0 200px 20px rgba(0,0,0,0.35)"; }
  if (weather === "sand") tint = "radial-gradient(130% 130% at 50% 40%, transparent 30%, rgba(190,150,80,0.4))";
  else if (weather === "fog") tint = "radial-gradient(130% 130% at 50% 40%, transparent 20%, rgba(200,210,225,0.28))";
  else if (weather === "rain" || weather === "snow") shadow = "inset 0 0 240px 30px rgba(10,20,40,0.5)";
  el.style.boxShadow = shadow;
  el.style.background = tint;
}

let dmgTimer = null;
export function flashDamage() {
  const el = $("damage-flash");
  if (!el) return;
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  clearTimeout(dmgTimer);
  dmgTimer = setTimeout(() => el.classList.remove("flash"), 460);
}

// ---------- Meta-gioco: monete, grado, combo, achievement ----------
export function setCoins(n) { const el = $("hud-coins"); if (el) el.textContent = n; }
export function setLevel(lvl, frac) {
  const r = $("hud-rank"); if (r) r.textContent = lvl;
  const f = $("xpbar-fill"); if (f) f.style.width = `${Math.round((frac || 0) * 100)}%`;
}

let comboTimer = null;
export function showCombo(n) {
  const el = $("hud-combo");
  if (!el) return;
  el.innerHTML = `COMBO <span class="x">x${n}</span>`;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  el.style.opacity = 1;
}
export function hideCombo() { const el = $("hud-combo"); if (el) { el.classList.remove("show"); el.style.opacity = 0; } }

export function coinPopup(n) {
  const box = $("coin-popups");
  if (!box || n <= 0) return;
  const el = document.createElement("div");
  el.className = "coin-pop";
  el.textContent = `+${n} 🪙`;
  el.style.left = (Math.random() * 60 - 30) + "px";
  box.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export function levelUp(lvl) {
  toast(`⭐ GRADO ${lvl}! Nuovo livello raggiunto!`, 2600);
}

let achTimer = null;
export function achievementToast(a) {
  const el = $("ach-toast");
  if (!el) return;
  el.innerHTML = `<div class="ach-icon">${a.icon}</div><div><div class="ach-tag">OBIETTIVO SBLOCCATO</div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>`;
  el.classList.remove("hidden");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  clearTimeout(achTimer);
  achTimer = setTimeout(() => el.classList.add("hidden"), 3600);
}

export function setPowerups(active) {
  const box = $("hud-powerups");
  if (!box) return;
  box.innerHTML = "";
  for (const [type, remaining] of Object.entries(active)) {
    if (remaining <= 0) continue;
    const def = POWERUPS[type]; if (!def) continue;
    const el = document.createElement("div");
    el.className = "pu-chip";
    const frac = Math.max(0, Math.min(1, remaining / def.duration)) * 100;
    el.innerHTML = `<div class="pu-emoji">${def.emoji}</div><div class="pu-bar"><div class="pu-fill" style="width:${frac}%;background:#${def.color.toString(16).padStart(6, "0")}"></div></div>`;
    el.title = def.label;
    box.appendChild(el);
  }
}

export function setWeather(emoji, name) {
  const el = $("hud-weather");
  if (!el) return;
  el.textContent = emoji || "";
  el.title = name || "Meteo";
}

export function setBossName(name) {
  const el = $("boss-name");
  if (el) el.textContent = (name && name.includes("VAMPIRI") ? "🧛 " : "👹 ") + (name || "BOSS");
}

export function setBossHP(hp, max) {
  const el = $("hud-boss");
  if (hp == null) { el.classList.add("hidden"); return; }
  $("boss-bar-fill").style.width = `${Math.max(0, (hp / max) * 100)}%`;
  el.classList.remove("hidden");
}

export function updateHUD(state) {
  const dim = DIMENSIONS[state.dim];
  $("hud-dim-icon").textContent = dim.emoji;
  $("hud-dim-name").textContent = dim.name;
  $("hud-city").textContent = state.cityName || "—";
  $("hud-challenges").textContent = state.challenges;
  $("hud-level").textContent = state.level;
  $("hud-deaths").textContent = state.deaths;

  // cuori
  const hearts = $("hud-hearts");
  let h = "";
  for (let i = 0; i < state.maxHp; i++) h += i < state.hp ? "❤️" : "🖤";
  hearts.textContent = h;

  // inventario
  const inv = $("hud-inventory");
  inv.innerHTML = "";
  for (const [type, count] of Object.entries(state.inventory)) {
    if (count <= 0) continue;
    const el = document.createElement("div");
    el.className = "inv-item";
    el.innerHTML = `${ITEMS[type].emoji}<span class="n">${count}</span>`;
    el.title = ITEMS[type].label;
    inv.appendChild(el);
  }
}

// Dialogo con scelte. actions = [{label, cb}]
export function openDialog(speaker, text, actions) {
  $("dialog-speaker").textContent = speaker;
  $("dialog-text").textContent = text;
  const box = $("dialog-actions");
  box.innerHTML = "";
  for (const a of actions) {
    const b = document.createElement("button");
    b.className = a.primary ? "big-btn" : "ghost-btn";
    b.textContent = a.label;
    b.onclick = () => { a.cb?.(); };
    box.appendChild(b);
  }
  show("dialog");
}
export function closeDialog() { hide("dialog"); }
