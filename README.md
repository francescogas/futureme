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
| **E / Spazio** | Interagisci (persone, portali, respingi mostri, colpisci il boss, il tuo io) |
| **Esc** | Pausa |
| **🔊 (in alto a destra)** | Attiva/disattiva l'audio |

Su **smartphone/tablet** compaiono automaticamente un **joystick** (in basso a
sinistra) per muoverti e un pulsante **E** per interagire; trascina sul resto
dello schermo per ruotare la telecamera.

## 🎮 Meta-gioco e coinvolgimento (stile giochi popolari)

- **Monete & Gradi (XP)**: guadagni monete e punti esperienza raccogliendo
  oggetti, respingendo mostri, sigillando portali, completando missioni e
  sconfiggendo il boss. Sali di **Grado** con una barra XP sempre visibile.
- **Sistema Combo**: incatena raccolte e nemici per far salire il moltiplicatore
  (**COMBO x2, x3...**) che aumenta le monete guadagnate.
- **Negozio di cosmetici**: sblocca **stili di abiti** e **scie luminose**
  (compresa una scia arcobaleno animata) con le monete guadagnate giocando.
- **Obiettivi/Achievement**: 10 traguardi da sbloccare, con notifica animata.
- **Sfida del Giorno**: un evento a rotazione (uguale per tutti nello stesso
  giorno) con un **modificatore** diverso — Corsa all'Oro (monete doppie),
  Maestro Combo, Notte dell'Orda, Sprint Dimensionale, Eclissi (nebbia ovunque) —
  un **obiettivo** da centrare e una **ricompensa** in monete. Banner dedicato
  sul titolo.
- **Due boss diversi**: oltre al Guardiano della Luna può comparire il
  **Signore dei Vampiri** (più veloce, si teletrasporta vicino a te), per varietà.
- **Ricompensa giornaliera** con **serie di accessi** (streak) che cresce ogni
  giorno — il classico hook di ritorno.
- **Record personali** e statistiche mostrati sul titolo (morti minime, sfide
  completate, combo record, vittorie).
- **Power-up attivi a tempo**: raccogli bonus sparsi nei mondi — ⚡ Velocità,
  🛡️ Scudo (immune ai danni), 🧲 Magnete (attira gli oggetti), 💰 Doppie Monete,
  ❄️ Congela (blocca i mostri) — con indicatore di durata nell'HUD.
- **Nemici d'élite**: dai livelli avanzati della Luna compaiono mostri più grandi,
  veloci e minacciosi (aura rossa).
- **Classifica dei migliori risultati**: i tuoi punteggi migliori in una board con
  medaglie (locale, pronta per un backend online).
- **Card di vittoria condivisibile**: a fine partita generi un'immagine con le
  tue statistiche da scaricare e condividere (#FUTUREME) — per creare community.

> ### 💰 Nota sulla monetizzazione
> Il gioco implementa l'intera **economia virtuale guadagnabile giocando** (monete,
> cosmetici, progressione) — la base corretta e non predatoria su cui si innesta la
> monetizzazione. **Non** è incluso alcun incasso reale né finti pagamenti: una
> monetizzazione vera richiede l'integrazione di uno store/IAP (App Store, Google
> Play, Steam) o pubblicità con relativa compliance (privacy, età, trasparenza).
> Il design segue le buone pratiche: **solo cosmetici, nessun pay-to-win**, nessun
> meccanismo manipolatorio. Le monete premium andrebbero aggiunte come acquisto
> *facoltativo* accanto a quelle guadagnabili, mai come unica via.

## ✨ Caratteristiche

- **Intro cinematografica**: alla prima partita una sequenza narrativa (con
  sfondo stellato animato) racconta la storia dei tre mondi; è rivedibile dal
  titolo con **La storia** e saltabile in qualsiasi momento.
- **Ciclo giorno/notte animato**: il sole (o la luna) attraversa lentamente il
  cielo, la luce e il gradiente del cielo cambiano con l'ora (compresa la
  "golden hour" al tramonto), mantenendo però l'identità di ogni città.
- **Musica di tensione dinamica**: avvicinandoti al Guardiano della Luna la
  colonna sonora aggiunge un battito cardiaco che accelera con la vicinanza.
- **Creatore di personaggio** con anteprima 3D dal vivo:
  - Specie: **umano**, **gatto-umanoide**, **cane-umanoide**
  - Sesso maschile/femminile (anche nella versione animale)
  - 7 stili di abiti: **classico, pop, rock, punk, anni '70, futuristico, estivo**
  - Colore/carnagione personalizzabile
- **Tre dimensioni** con atmosfere, illuminazione e regole diverse:
  - 🌍 **Terra** — cammina fra le città del mondo, ognuna ricostruita con i suoi
    **monumenti reali**, cielo, luce e atmosfera propri:
    - **Roma** — il Colosseo, colonne romane, cipressi (cielo azzurro)
    - **Tokyo** — la Tokyo Tower illuminata, il torii rosso, grattacieli e insegne
      neon (notte)
    - **New York** — grattacieli, l'Empire State, la Statua della Libertà, taxi gialli
    - **Venezia** — il Canal Grande con le gondole, il Campanile di San Marco, i
      ponti e le case colorate (tramonto)
    - **Parigi** — la Torre Eiffel, l'Arco di Trionfo, i palazzi Haussmann
    - **Il Cairo** — le Piramidi di Giza, la Sfinge, palme e dune (deserto)

    Raccogli 🔑 **chiavi** e 🛂 **passaporti**: non saprai quali portali apriranno
    né dove ti porteranno. Un **banner d'arrivo** annuncia ogni città e il suo monumento.
  - 🌙 **Luna** — sempre notte. Zombie, vampiri e lupi mannari ti danno la caccia.
    Difenditi con 🧄 aglio, ✝️ croci, ⚙️ argento e 🔦 torce, e **sigilla i portali
    d'invasione** prima che i mostri raggiungano la Terra.
  - ☀️ **Sole** — sempre giorno, mondo felice. Raccogli i 3 ingredienti della
    **pozione magica** (🌿 💎 🍊).
- **Il tuo io parallelo** — puoi incontrarlo negli altri mondi. Sulla Luna è
  prigioniero e forse è diventato malvagio: solo la pozione del Sole può salvarlo
  e portarlo nella luce.
- **Contatore Sfide** — parti da **1000**; ogni volta che muori aumentano di **100**.
- **Meteo dinamico che cambia l'esperienza**: ogni volta che entri in una città
  il tempo cambia — ☀️ sereno, ⛅ nuvoloso, 🌧️ pioggia, ❄️ neve, 🌫️ nebbia,
  🌪️ tempesta di sabbia (al Cairo) — con effetti particellari, nebbia, **suono
  ambientale** (scroscio, vento, tempesta) e **conseguenze sul gameplay**: la
  neve e la sabbia ti rallentano, la nebbia acceca i mostri (ne riduce il raggio
  di individuazione), la pioggia attutisce i tuoi passi. L'indicatore è accanto
  al nome della città.
- **Feedback immersivo**: scintille alla raccolta e alla sconfitta dei nemici,
  **camera shake** e flash rosso quando vieni colpito, e una **vignettatura
  d'atmosfera** che tinge lo schermo secondo dimensione e meteo.
- **NPC a tema locale**: in ogni città incontri abitanti con nome e dialoghi
  propri (un romano, un veneziano, un parigino, un newyorkese, un cairota...),
  con saluti e indizi locali.
- **Persone strane** (NPC) che ti danno indizi e **missioni extra** (bandisci N
  mostri, raccogli N chiavi, componi la pozione...) con ricompense.
- **Combattimento**: sulla Luna avvicinati ai mostri e premi **E** per respingerli
  con un oggetto di difesa (🔦 ⚙️ ✝️ 🧄).
- **Minimappa / radar** in tempo reale con giocatore, oggetti, portali, NPC,
  mostri e il tuo io parallelo.
- **Audio e musica procedurali** (Web Audio API, nessun file esterno): colonna
  sonora ambientale diversa per ogni dimensione ed effetti sonori per raccolta,
  portali, colpi, pozione e vittoria. Disattivabile con 🔊.
- **Boss finale — il Guardiano della Luna**: un mostro gigante che tiene
  prigioniero il tuo io. Devi sconfiggerlo (barra HP dedicata) prima di poter
  usare la pozione magica.
- **Salvataggio automatico** dei progressi nel browser (localStorage): dal
  titolo puoi premere **↻ CONTINUA** per riprendere da dove avevi lasciato.
- **Controlli touch** per dispositivi mobili (joystick + pulsante azione).
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
  save.js           # salvataggio progressi (localStorage)
  touch.js          # controlli touch per mobile (joystick + azione)
  weather.js        # meteo dinamico (pioggia, neve, nebbia, sabbia, nuvole)
  progression.js    # profilo persistente: monete, XP, gradi, sblocchi, achievement, daily
```

## 🛠️ Note tecniche

- Tutta la grafica 3D è generata **proceduralmente** da primitive Three.js: nessun
  modello o texture esterna da scaricare.
- Un prototipo giocabile che cattura la visione del gioco; pensato per essere
  esteso (più città, più nemici, missioni, salvataggi, audio...).
