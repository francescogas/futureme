// ============================================================
//  FUTUREME — configurazione dati del gioco
// ============================================================

export const SPECIES = [
  { id: "human",  label: "Umano",  emoji: "🧑", ears: "none",  muzzle: false, tail: false },
  { id: "cat",    label: "Gatto",  emoji: "🐱", ears: "cat",   muzzle: true,  tail: true  },
  { id: "dog",    label: "Cane",   emoji: "🐶", ears: "dog",   muzzle: true,  tail: true  },
];

export const SEXES = [
  { id: "male",   label: "Maschio", emoji: "♂" },
  { id: "female", label: "Femmina", emoji: "♀" },
];

// Ogni stile definisce i colori/accessori dell'avatar procedurale
export const OUTFITS = [
  { id: "classic", label: "Classico",   emoji: "👔", torso: 0x30507a, legs: 0x243244, accent: 0xcfd8e8, shoulders: false, cape: false, glow: 0x000000, hair: 0x3a2a1a },
  { id: "pop",     label: "Pop",        emoji: "🎤", torso: 0xff5aa8, legs: 0x7a3bbf, accent: 0xffe14d, shoulders: false, cape: false, glow: 0xff8ad0, hair: 0xffd24d },
  { id: "rock",    label: "Rock",       emoji: "🎸", torso: 0x1c1c22, legs: 0x111114, accent: 0xc0392b, shoulders: true,  cape: false, glow: 0x000000, hair: 0x111111 },
  { id: "punk",    label: "Punk",       emoji: "🧷", torso: 0x222026, legs: 0x2b2440, accent: 0x39ff88, shoulders: true,  cape: false, glow: 0x39ff88, hair: 0x39ff88 },
  { id: "seventies", label: "Anni '70", emoji: "🕺", torso: 0xd9822b, legs: 0x8a5a1e, accent: 0xffe08a, shoulders: false, cape: false, glow: 0x000000, hair: 0x4a2f1a },
  { id: "future",  label: "Futuristico", emoji: "🦾", torso: 0x1b3a6b, legs: 0x14243f, accent: 0x4df3ff, shoulders: true, cape: true,  glow: 0x4df3ff, hair: 0x222831 },
  { id: "summer",  label: "Estivo",     emoji: "🏖️", torso: 0x28c0d0, legs: 0xf4c542, accent: 0xffffff, shoulders: false, cape: false, glow: 0x000000, hair: 0x2a1c10 },
];

export const SKIN_COLORS = [
  { id: "s1", value: 0xffd9b3 },
  { id: "s2", value: 0xe0ac83 },
  { id: "s3", value: 0xa9744f },
  { id: "s4", value: 0x7a5236 },
  { id: "s5", value: 0x9be0ff }, // aliena/futuristica
  { id: "s6", value: 0xc9b8ff },
];

// Città della Terra: ognuna con monumenti reali, palette e atmosfera propria.
// theme: { skyTop, skyBottom, fog, fogNear, fogFar, ambient, sunColor, sunInt, night, stars }
export const CITIES = [
  {
    id: "roma", name: "Roma", country: "Italia", landmark: "Colosseo", ground: 0xcbb894, building: 0xcaa46b,
    theme: { skyTop: 0x2e6bd0, skyBottom: 0xbfe0ff, fog: 0xd8e6ff, fogNear: 45, fogFar: 140, ambient: 0.72, sunColor: 0xfff2d0, sunInt: 1.25, night: false, stars: false },
  },
  {
    id: "tokyo", name: "Tokyo", country: "Giappone", landmark: "Tokyo Tower", ground: 0x22243a, building: 0x2a2f4a,
    theme: { skyTop: 0x140a2e, skyBottom: 0x5a2a6a, fog: 0x2a1840, fogNear: 30, fogFar: 120, ambient: 0.45, sunColor: 0xff9ad0, sunInt: 0.6, night: true, stars: true },
  },
  {
    id: "newyork", name: "New York", country: "USA", landmark: "Statua della Libertà", ground: 0x3a3f52, building: 0x6a7488,
    theme: { skyTop: 0x3a5a9a, skyBottom: 0xcfd9e8, fog: 0xcbd6e6, fogNear: 40, fogFar: 150, ambient: 0.66, sunColor: 0xfff0d8, sunInt: 1.1, night: false, stars: false },
  },
  {
    id: "venezia", name: "Venezia", country: "Italia", landmark: "Canal Grande", ground: 0x2f6f8f, building: 0xe0b98a,
    theme: { skyTop: 0xff9a4a, skyBottom: 0xffe0a3, fog: 0xffd9a0, fogNear: 45, fogFar: 150, ambient: 0.7, sunColor: 0xffd090, sunInt: 1.15, night: false, stars: false },
  },
  {
    id: "parigi", name: "Parigi", country: "Francia", landmark: "Torre Eiffel", ground: 0xb9b0a0, building: 0xd8cdb6,
    theme: { skyTop: 0x6a86c0, skyBottom: 0xdfe6f2, fog: 0xdbe2ee, fogNear: 45, fogFar: 150, ambient: 0.7, sunColor: 0xfff2e0, sunInt: 1.1, night: false, stars: false },
  },
  {
    id: "cairo", name: "Il Cairo", country: "Egitto", landmark: "Piramidi di Giza", ground: 0xe3c98a, building: 0xd8b878,
    theme: { skyTop: 0xffb347, skyBottom: 0xffe7b0, fog: 0xffe2a0, fogNear: 50, fogFar: 160, ambient: 0.8, sunColor: 0xfff0c0, sunInt: 1.5, night: false, stars: false },
  },
];

export const DIMENSIONS = {
  earth: {
    id: "earth", name: "TERRA", emoji: "🌍", color: 0x4dd39a,
    desc: "Il mondo reale. Cammina fra le città, raccogli chiavi e passaporti.",
  },
  moon: {
    id: "moon", name: "LUNA", emoji: "🌙", color: 0x8ea2ff,
    desc: "Sempre notte. Zombie, vampiri e lupi mannari. Chiudi i portali!",
  },
  sun: {
    id: "sun", name: "SOLE", emoji: "☀️", color: 0xffce54,
    desc: "Sempre giorno. Raccogli gli ingredienti della pozione magica.",
  },
};

// Definizione oggetti raccoglibili
export const ITEMS = {
  key:       { emoji: "🔑", label: "Chiave",     color: 0xffd35c },
  passport:  { emoji: "🛂", label: "Passaporto", color: 0x4df3ff },
  garlic:    { emoji: "🧄", label: "Aglio",      color: 0xf5f0e1 },
  cross:     { emoji: "✝️", label: "Croce",      color: 0xffe9a8 },
  silver:    { emoji: "⚙️", label: "Argento",    color: 0xd8dde8 },
  torch:     { emoji: "🔦", label: "Torcia",     color: 0xfff2a0 },
  herb:      { emoji: "🌿", label: "Erba solare",color: 0x7fe08a },
  crystal:   { emoji: "💎", label: "Cristallo",  color: 0x9be0ff },
  sunfruit:  { emoji: "🍊", label: "Frutto sole",color: 0xff9f43 },
};

// Ingredienti richiesti per la pozione magica (raccolti nel Sole)
export const POTION_RECIPE = ["herb", "crystal", "sunfruit"];

// ---------- Economia / meta-gioco ----------
// Outfit gratuiti dall'inizio; gli altri si sbloccano nel Negozio con le monete.
export const FREE_OUTFITS = ["classic", "summer"];
export const OUTFIT_PRICES = { pop: 150, rock: 200, seventies: 200, punk: 250, future: 400 };

// Scie luminose (cosmetico) acquistabili
export const TRAILS = [
  { id: "none",    label: "Nessuna",    price: 0,   color: null },
  { id: "cyan",    label: "Scia Ciano", price: 150, color: 0x4df3ff },
  { id: "magenta", label: "Scia Viola", price: 150, color: 0xb96bff },
  { id: "gold",    label: "Scia Oro",   price: 250, color: 0xffd35c },
  { id: "fire",    label: "Scia Fuoco", price: 400, color: 0xff5a3c },
  { id: "rainbow", label: "Arcobaleno", price: 600, color: 0xffffff, rainbow: true },
];

// Ricompense in monete/XP per evento
export const REWARDS = {
  pickup:   { coins: 5,   xp: 8 },
  banish:   { coins: 12,  xp: 15 },
  seal:     { coins: 20,  xp: 25 },
  quest:    { coins: 40,  xp: 50 },
  bossHit:  { coins: 10,  xp: 12 },
  bossKill: { coins: 200, xp: 250 },
  victory:  { coins: 500, xp: 1000 },
  city:     { coins: 15,  xp: 20 },
};

// Sfide del Giorno (evento a rotazione, scelto in base alla data)
export const DAILY_CHALLENGES = [
  { id: "gold_rush",   name: "Corsa all'Oro",     icon: "💰", desc: "Monete raddoppiate per tutta la partita.",      mod: "doubleCoins", goalType: "coins",  goalAmount: 400, goalDesc: "Guadagna 400 monete",  reward: 300 },
  { id: "combo_master",name: "Maestro Combo",      icon: "🔥", desc: "Il moltiplicatore combo sale più in fretta.",   mod: "comboBoost",  goalType: "combo",  goalAmount: 8,   goalDesc: "Raggiungi combo x8", reward: 300 },
  { id: "horde",       name: "Notte dell'Orda",    icon: "🧟", desc: "Più mostri sulla Luna... e più ricompense.",    mod: "horde",       goalType: "banish", goalAmount: 15,  goalDesc: "Respingi 15 mostri", reward: 350 },
  { id: "sprint",      name: "Sprint Dimensionale",icon: "⚡", desc: "Sei sempre veloce. Sigilla i portali!",         mod: "alwaysFast",  goalType: "seal",   goalAmount: 3,   goalDesc: "Sigilla 3 portali",  reward: 300 },
  { id: "eclipse",     name: "Eclissi",            icon: "🌫️", desc: "Nebbia ovunque: i mostri ti vedono a fatica.", mod: "foggy",       goalType: "coins",  goalAmount: 300, goalDesc: "Guadagna 300 monete", reward: 300 },
];

// Obiettivi/achievement (id, nome, descrizione, icona, soglia opzionale)
export const ACHIEVEMENTS = [
  { id: "first_key",   name: "Prima Chiave",         desc: "Raccogli la tua prima chiave",       icon: "🔑" },
  { id: "collector",   name: "Collezionista",        desc: "Raccogli 25 oggetti in totale",      icon: "📦", stat: "totalItems", goal: 25 },
  { id: "globetrotter",name: "Giramondo",            desc: "Visita tutte e 6 le città",          icon: "🌍", stat: "citiesCount", goal: 6 },
  { id: "hunter",      name: "Cacciatore di Mostri", desc: "Respingi 25 mostri",                 icon: "⚔️", stat: "monstersBanished", goal: 25 },
  { id: "boss_slayer", name: "Ammazza-Guardiano",    desc: "Sconfiggi il Guardiano della Luna",  icon: "👹" },
  { id: "savior",      name: "Salvatore dei Mondi",  desc: "Completa il gioco",                  icon: "🏆" },
  { id: "storm",       name: "Nella Tempesta",       desc: "Gioca durante una tempesta di sabbia", icon: "🌪️" },
  { id: "combo5",      name: "Scatenato",            desc: "Raggiungi una combo x5",             icon: "🔥" },
  { id: "rich",        name: "Riccone",              desc: "Accumula 1000 monete",               icon: "💰", stat: "coins", goal: 1000 },
  { id: "fashion",     name: "Fashionista",          desc: "Sblocca 3 cosmetici nel Negozio",    icon: "✨", stat: "unlocksCount", goal: 3 },
];

// NPC a tema per ogni città reale: nome dell'abitante + battute locali
export const CITY_NPCS = {
  roma: {
    speaker: "Abitante di Roma",
    lines: [
      "«Ciao! Benvenuto nella Città Eterna. Dicono che sotto il Colosseo ci sia un portale...»",
      "«Tutte le strade portano a Roma, ma solo una chiave porta al tuo io.»",
      "«Attento, viaggiatore: i gladiatori del tempo custodiscono i passaggi.»",
    ],
  },
  tokyo: {
    speaker: "住民 di Tokyo",
    lines: [
      "«Konnichiwa! Le luci al neon nascondono i portali. Guarda oltre il bagliore.»",
      "«Passa sotto il torii rosso e purificati prima di viaggiare tra i mondi.»",
      "«La Tokyo Tower brilla anche di notte: seguila per non perderti.»",
    ],
  },
  newyork: {
    speaker: "New Yorker",
    lines: [
      "«Hey! Nella città che non dorme mai, i portali aprono a ogni angolo.»",
      "«La Statua della Libertà veglia sui viaggiatori. Prendi un taxi... o un portale!»",
      "«Big Apple, big secrets. Cerca le chiavi tra i grattacieli.»",
    ],
  },
  venezia: {
    speaker: "Veneziano",
    lines: [
      "«Ciao! Qui si viaggia in gondola... o attraverso i portali sul Canal Grande.»",
      "«Il Campanile di San Marco indica la via. Segui l'acqua e troverai un passaggio.»",
      "«Attento ai ponti: alcuni scendono in mondi che è meglio non vedere.»",
    ],
  },
  parigi: {
    speaker: "Parisien",
    lines: [
      "«Bonjour! Dalla cima della Torre Eiffel si vedono tutti i mondi paralleli.»",
      "«L'amour e i portali: entrambi ti portano dove non t'aspetti, mon ami.»",
      "«Passa sotto l'Arco di Trionfo e la fortuna ti sorriderà.»",
    ],
  },
  cairo: {
    speaker: "Abitante del Cairo",
    lines: [
      "«Salam! Le piramidi custodiscono portali più antichi del tempo stesso.»",
      "«La Sfinge conosce l'enigma: solo chi ha il passaporto giusto passa oltre.»",
      "«Il deserto inganna. Segui le palme e troverai la via verso il tuo io.»",
    ],
  },
};

// Emote rapide (social / multiplayer)
export const EMOTES = ["👋", "😀", "❤️", "😮", "😢", "🎉", "👍", "🔥"];

// Power-up attivi a tempo (raccoglibili nel mondo)
export const POWERUPS = {
  speed:  { emoji: "⚡", label: "Velocità",      color: 0x4df3ff, duration: 8,  desc: "Corri più veloce" },
  shield: { emoji: "🛡️", label: "Scudo",         color: 0x9be0ff, duration: 8,  desc: "Immune ai danni" },
  magnet: { emoji: "🧲", label: "Magnete",        color: 0xb96bff, duration: 10, desc: "Attira gli oggetti" },
  coins2x:{ emoji: "💰", label: "Doppie Monete",  color: 0xffd35c, duration: 12, desc: "Monete raddoppiate" },
  freeze: { emoji: "❄️", label: "Congela",        color: 0xcfeaff, duration: 6,  desc: "Blocca i mostri" },
};

// Frasi degli NPC "persone strane"
export const NPC_LINES = {
  earth: [
    "Le chiavi che raccogli... nessuno sa quali porte aprano. Prova e vedrai.",
    "Ho visto il tuo volto in un altro mondo. Ma i suoi occhi erano diversi.",
    "Cerca i passaporti. Ti porteranno dove meno te lo aspetti.",
    "Attento ai portali: alcuni scendono nella notte eterna della Luna.",
    "Dicono che il tuo io della Luna sia prigioniero. Solo tu puoi liberarlo.",
  ],
  moon: [
    "Corri! I portali stanno lasciando passare i mostri verso la Terra. Chiudili!",
    "L'aglio, l'argento, la croce... senza di essi qui non sopravvivi.",
    "Il tuo io è oltre, incatenato. Forse non è più... te stesso.",
    "Solo la pozione del Sole può spezzare ciò che lo tiene prigioniero.",
  ],
  sun: [
    "Che gioia vederti! Prendi le erbe, i cristalli, i frutti del sole.",
    "Con i tre ingredienti potrai preparare la pozione che salva chi ami.",
    "Quando avrai la pozione, torna sulla Luna. Il tuo io ti aspetta.",
  ],
};
