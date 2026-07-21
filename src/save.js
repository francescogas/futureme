// ============================================================
//  FUTUREME — salvataggio progressi (localStorage)
// ============================================================
const KEY = "futureme_save_v1";

export const Save = {
  write(charConfig, state) {
    try {
      const data = {
        v: 1,
        ts: Date.now(),
        char: { ...charConfig },
        state: {
          dim: state.dim, level: state.level, challenges: state.challenges,
          deaths: state.deaths, hp: state.hp, maxHp: state.maxHp,
          inventory: { ...state.inventory },
          potionReady: state.potionReady, alterFreed: state.alterFreed,
          talkedNPCs: state.talkedNPCs, portalsClosed: state.portalsClosed,
          keysFound: state.keysFound, monstersBanished: state.monstersBanished,
        },
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* localStorage non disponibile: ignora */ }
  },

  read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return null;
      return data;
    } catch (e) { return null; }
  },

  has() { return !!this.read(); },

  clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  },
};
