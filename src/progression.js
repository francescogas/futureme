// ============================================================
//  FUTUREME — profilo persistente / meta-gioco (live-ops)
//  Monete, XP, livelli, sblocchi, achievement, daily, record.
//  Tutta la valuta è guadagnabile giocando (nessun pagamento reale).
// ============================================================
import { FREE_OUTFITS, OUTFIT_PRICES, TRAILS, ACHIEVEMENTS, DAILY_CHALLENGES, UPGRADES } from "./data.js";

const KEY = "futureme_profile_v1";

function todayStr() { return new Date().toISOString().slice(0, 10); }

// Sfida del Giorno deterministica in base alla data (uguale per tutti nello stesso giorno)
export function todayChallenge() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return DAILY_CHALLENGES[dayIndex % DAILY_CHALLENGES.length];
}

function fresh() {
  return {
    coins: 0, xp: 0, level: 1,
    totalItems: 0, monstersBanished: 0, bossDefeats: 0, victories: 0,
    citiesVisited: [],
    unlockedOutfits: [...FREE_OUTFITS],
    unlockedTrails: ["none"],
    equippedTrail: "none",
    achievements: {},
    dailyStreak: 0, lastDaily: "",
    dailyChallengeDone: "",
    upgrades: {},
    best: { fewestDeaths: null, mostChallengesCleared: 0, bestCombo: 0 },
    leaderboard: [],
  };
}

// XP cumulativa richiesta per raggiungere un livello
export function xpForLevel(lvl) { return Math.round(120 * Math.pow(lvl - 1, 1.6)); }
export function levelFromXP(xp) {
  let l = 1;
  while (xp >= xpForLevel(l + 1)) l++;
  return l;
}

class ProfileManager {
  constructor() { this.load(); }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.p = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
      if (!this.p.best) this.p.best = fresh().best;
    } catch (e) { this.p = fresh(); }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.p)); } catch (e) {} }

  get coins() { return this.p.coins; }
  get level() { return this.p.level; }
  get xp() { return this.p.xp; }
  get profile() { return this.p; }

  // progressi verso il livello successivo (0..1) e soglie
  levelProgress() {
    const cur = xpForLevel(this.p.level), next = xpForLevel(this.p.level + 1);
    return { cur, next, frac: Math.max(0, Math.min(1, (this.p.xp - cur) / (next - cur || 1))) };
  }

  addCoins(n) { this.p.coins += Math.round(n); this.save(); return this.p.coins; }
  spend(n) { if (this.p.coins < n) return false; this.p.coins -= n; this.save(); return true; }

  // Ritorna {leveledUp, from, to}
  addXP(n) {
    const from = this.p.level;
    this.p.xp += Math.round(n);
    this.p.level = levelFromXP(this.p.xp);
    this.save();
    return { leveledUp: this.p.level > from, from, to: this.p.level };
  }

  // ---- statistiche di gioco ----
  addItem(n = 1) { this.p.totalItems += n; this.save(); }
  addBanish(n = 1) { this.p.monstersBanished += n; this.save(); }
  visitCity(id) { if (!this.p.citiesVisited.includes(id)) { this.p.citiesVisited.push(id); this.save(); } }
  recordBossDefeat() { this.p.bossDefeats++; this.save(); }
  recordVictory() { this.p.victories++; this.save(); }
  recordBestCombo(c) { if (c > this.p.best.bestCombo) { this.p.best.bestCombo = c; this.save(); } }
  recordRun(deaths, cleared) {
    const b = this.p.best;
    if (b.fewestDeaths == null || deaths < b.fewestDeaths) b.fewestDeaths = deaths;
    if (cleared > b.mostChallengesCleared) b.mostChallengesCleared = cleared;
    this.save();
  }

  // ---- sblocchi / negozio ----
  hasOutfit(id) { return FREE_OUTFITS.includes(id) || this.p.unlockedOutfits.includes(id); }
  outfitPrice(id) { return OUTFIT_PRICES[id] || 0; }
  buyOutfit(id) {
    if (this.hasOutfit(id)) return true;
    if (!this.spend(this.outfitPrice(id))) return false;
    this.p.unlockedOutfits.push(id); this.save(); return true;
  }
  hasTrail(id) { return this.p.unlockedTrails.includes(id); }
  buyTrail(id) {
    if (this.hasTrail(id)) return true;
    const t = TRAILS.find((x) => x.id === id);
    if (!t || !this.spend(t.price)) return false;
    this.p.unlockedTrails.push(id); this.save(); return true;
  }
  equipTrail(id) { if (this.hasTrail(id)) { this.p.equippedTrail = id; this.save(); } }
  equippedTrail() { return TRAILS.find((t) => t.id === this.p.equippedTrail) || TRAILS[0]; }
  unlocksCount() { return (this.p.unlockedOutfits.length - FREE_OUTFITS.length) + (this.p.unlockedTrails.length - 1); }

  // ---- ricompensa giornaliera ----
  // Ritorna {claimed, streak, coins} oppure null se già ritirata oggi
  claimDaily() {
    const t = todayStr();
    if (this.p.lastDaily === t) return null;
    // streak: +1 se ieri, altrimenti reset
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    this.p.dailyStreak = this.p.lastDaily === y ? this.p.dailyStreak + 1 : 1;
    this.p.lastDaily = t;
    const reward = 50 + Math.min(this.p.dailyStreak, 7) * 25; // cresce con lo streak
    this.p.coins += reward;
    this.save();
    return { claimed: true, streak: this.p.dailyStreak, coins: reward };
  }
  dailyAvailable() { return this.p.lastDaily !== todayStr(); }

  // ---- Sfida del Giorno ----
  dailyChallengeAvailable() { return this.p.dailyChallengeDone !== todayStr(); }
  completeDailyChallenge(reward) {
    if (!this.dailyChallengeAvailable()) return false;
    this.p.dailyChallengeDone = todayStr();
    this.p.coins += reward;
    this.save();
    return true;
  }

  // ---- achievement ----
  // Valuta gli achievement in base alle statistiche; ritorna la lista dei nuovi sbloccati
  checkAchievements(extraFlags = {}) {
    const stats = {
      totalItems: this.p.totalItems,
      citiesCount: this.p.citiesVisited.length,
      monstersBanished: this.p.monstersBanished,
      coins: this.p.coins,
      unlocksCount: this.unlocksCount(),
    };
    const unlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (this.p.achievements[a.id]) continue;
      let ok = false;
      if (a.stat && a.goal != null) ok = (stats[a.stat] || 0) >= a.goal;
      else if (extraFlags[a.id]) ok = true;
      if (ok) { this.p.achievements[a.id] = todayStr(); unlocked.push(a); }
    }
    if (unlocked.length) this.save();
    return unlocked;
  }
  hasAchievement(id) { return !!this.p.achievements[id]; }
  achievementsUnlockedCount() { return Object.keys(this.p.achievements).length; }

  // ---- potenziamenti permanenti ----
  upgradeLevel(id) { return (this.p.upgrades && this.p.upgrades[id]) || 0; }
  upgradeDef(id) { return UPGRADES.find((u) => u.id === id); }
  upgradeCost(id) {
    const def = this.upgradeDef(id); if (!def) return Infinity;
    const lvl = this.upgradeLevel(id);
    if (lvl >= def.max) return null; // già al massimo
    return Math.round(def.baseCost * Math.pow(def.costMul, lvl));
  }
  buyUpgrade(id) {
    const cost = this.upgradeCost(id);
    if (cost == null || !this.spend(cost)) return false;
    if (!this.p.upgrades) this.p.upgrades = {};
    this.p.upgrades[id] = this.upgradeLevel(id) + 1;
    this.save();
    return true;
  }
  // Effetti aggregati pronti da applicare a inizio partita
  upgradeEffects() {
    return {
      bonusHp: this.upgradeLevel("vitality"),
      moveMul: 1 + this.upgradeLevel("agility") * 0.06,
      sphereMul: 1 + this.upgradeLevel("seer") * 0.25,
      coinMul: 1 + this.upgradeLevel("luck") * 0.10,
      comboStep: 0.10 + this.upgradeLevel("combo") * 0.02,
      startTorches: this.upgradeLevel("explorer") * 2,
    };
  }

  // ---- classifica (locale, pronta per un backend) ----
  addScore(name, score, won, mode = null) {
    if (!this.p.leaderboard) this.p.leaderboard = [];
    this.p.leaderboard.push({
      name: (name || "Eroe").slice(0, 16), score: Math.round(score), won: !!won, mode,
      level: this.p.level, date: todayStr(),
    });
    this.p.leaderboard.sort((a, b) => b.score - a.score);
    this.p.leaderboard = this.p.leaderboard.slice(0, 10);
    this.save();
    return this.p.leaderboard.findIndex((e) => e.score === Math.round(score));
  }
  leaderboard() { return this.p.leaderboard || []; }
}

export const Profile = new ProfileManager();
