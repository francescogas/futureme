// ============================================================
//  FUTUREME — helper interfaccia (HUD, toast, dialoghi)
// ============================================================
import { ITEMS, DIMENSIONS } from "./data.js";

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
