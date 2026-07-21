# 🌌 FUTUREME — Le Tre Dimensioni

Un videogioco d'avventura futuristico **3D giocabile nel browser**, costruito con
[Three.js](https://threejs.org/). Crea il tuo personaggio, viaggia tra tre mondi
paralleli — **Terra 🌍, Luna 🌙 e Sole ☀️** — attraverso portali misteriosi, e
salva la realtà dall'implosione ritrovando (e trasformando) il tuo **io parallelo**.

## ▶️ Come giocare

Non serve nessuna installazione: il gioco è completamente autonomo (Three.js è
incluso nel repository, funziona anche **offline**).

Serve solo un piccolo server statico perché il browser blocca i moduli ES da `file://`:

```bash
# dalla cartella del progetto
python3 -m http.server 8000
# poi apri:  http://localhost:8000
```

In alternativa qualsiasi server statico (`npx serve`, estensione "Live Server" di VS Code, ecc.).

## 🎮 Comandi

| Tasto | Azione |
|------|--------|
| **WASD / Frecce** | Muoviti nel mondo 3D |
| **Mouse (trascina)** | Ruota la telecamera |
| **Shift** | Corri |
| **E / Spazio** | Interagisci (persone, portali, respingi mostri, il tuo io) |
| **Esc** | Pausa |
| **🔊 (in alto a destra)** | Attiva/disattiva l'audio |

## ✨ Caratteristiche

- **Creatore di personaggio** con anteprima 3D dal vivo:
  - Specie: **umano**, **gatto-umanoide**, **cane-umanoide**
  - Sesso maschile/femminile (anche nella versione animale)
  - 7 stili di abiti: **classico, pop, rock, punk, anni '70, futuristico, estivo**
  - Colore/carnagione personalizzabile
- **Tre dimensioni** con atmosfere, illuminazione e regole diverse:
  - 🌍 **Terra** — cammina fra le città del mondo (Roma, Tokyo, New York, Venezia,
    Parigi, Il Cairo). Raccogli 🔑 **chiavi** e 🛂 **passaporti**: non saprai quali
    portali apriranno né dove ti porteranno.
  - 🌙 **Luna** — sempre notte. Zombie, vampiri e lupi mannari ti danno la caccia.
    Difenditi con 🧄 aglio, ✝️ croci, ⚙️ argento e 🔦 torce, e **sigilla i portali
    d'invasione** prima che i mostri raggiungano la Terra.
  - ☀️ **Sole** — sempre giorno, mondo felice. Raccogli i 3 ingredienti della
    **pozione magica** (🌿 💎 🍊).
- **Il tuo io parallelo** — puoi incontrarlo negli altri mondi. Sulla Luna è
  prigioniero e forse è diventato malvagio: solo la pozione del Sole può salvarlo
  e portarlo nella luce.
- **Contatore Sfide** — parti da **1000**; ogni volta che muori aumentano di **100**.
- **Persone strane** (NPC) che ti danno indizi e **missioni extra** (bandisci N
  mostri, raccogli N chiavi, componi la pozione...) con ricompense.
- **Combattimento**: sulla Luna avvicinati ai mostri e premi **E** per respingerli
  con un oggetto di difesa (🔦 ⚙️ ✝️ 🧄).
- **Minimappa / radar** in tempo reale con giocatore, oggetti, portali, NPC,
  mostri e il tuo io parallelo.
- **Audio e musica procedurali** (Web Audio API, nessun file esterno): colonna
  sonora ambientale diversa per ogni dimensione ed effetti sonori per raccolta,
  portali, colpi, pozione e vittoria. Disattivabile con 🔊.
- Sistema di **livelli**, salute a cuori, inventario, portali, morte e vittoria.

## 🏆 Obiettivo

1. Sulla **Terra** raccogli chiavi e passaporti ed esplora i portali.
2. Nel **Sole** componi la **pozione magica** raccogliendo 🌿 💎 🍊.
3. Torna sulla **Luna**, sigilla i portali d'invasione e usa la pozione sul tuo io
   imprigionato per **liberarlo e salvare i mondi**.

## 🗂️ Struttura del progetto

```
index.html          # entry point + schermate (titolo, creatore, dimensioni, HUD)
styles.css          # interfaccia e stile neon/futuristico
vendor/three/       # Three.js incluso localmente (nessuna dipendenza da internet)
src/
  main.js           # orchestratore: schermate, creatore con anteprima 3D
  game.js           # motore di gioco: loop, controlli, collisioni, portali, mostri, missioni
  character.js      # avatar 3D procedurale (specie, sesso, abiti) + animazioni
  world.js          # generazione procedurale dei mondi, oggetti, nemici, portali
  data.js           # configurazione (specie, stili, città, oggetti, dialoghi)
  ui.js             # HUD, toast, dialoghi
  audio.js          # musica ed effetti sonori procedurali (Web Audio API)
  minimap.js        # radar/minimappa 2D su canvas
```

## 🛠️ Note tecniche

- Tutta la grafica 3D è generata **proceduralmente** da primitive Three.js: nessun
  modello o texture esterna da scaricare.
- Un prototipo giocabile che cattura la visione del gioco; pensato per essere
  esteso (più città, più nemici, missioni, salvataggi, audio...).
