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
