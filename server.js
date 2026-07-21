// ============================================================
//  FUTUREME — server multiplayer (WebSocket, relay di presenza)
//  Avvio:  npm install && node server.js   (porta 8090 di default)
//  I giocatori sono raggruppati in "stanze" per dimensione:
//  vedono e sentono in chat solo chi è nella stessa dimensione.
// ============================================================
import { WebSocketServer } from "ws";
import http from "http";

const PORT = process.env.PORT || 8090;

// Piccolo server HTTP per un health-check e per servire i file statici (comodo per il deploy)
const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200); res.end("ok"); return; }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("FUTUREME multiplayer server attivo. Connettiti via WebSocket.");
});

const wss = new WebSocketServer({ server });

const players = new Map();   // id -> { ws, name, dim, x, z, ry, char }
const rooms = new Map();     // dim -> Set(id)
let nextId = 1;

function roomOf(dim) {
  if (!rooms.has(dim)) rooms.set(dim, new Set());
  return rooms.get(dim);
}
function leaveRoom(id) {
  const p = players.get(id);
  if (!p) return;
  const r = rooms.get(p.dim);
  if (r) { r.delete(id); broadcast(p.dim, { type: "peer_leave", id }, id); }
}
function broadcast(dim, msg, exceptId) {
  const r = rooms.get(dim);
  if (!r) return;
  const data = JSON.stringify(msg);
  for (const pid of r) {
    if (pid === exceptId) continue;
    const p = players.get(pid);
    if (p && p.ws.readyState === 1) p.ws.send(data);
  }
}
function peerInfo(p, id) {
  return { id, name: p.name, char: p.char, x: p.x, z: p.z, ry: p.ry };
}
function sendCounts(dim) {
  const r = rooms.get(dim);
  const n = r ? r.size : 0;
  broadcast(dim, { type: "count", dim, n }, null);
}

wss.on("connection", (ws) => {
  const id = nextId++;
  ws.__id = id;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

    if (msg.type === "join") {
      const prev = players.get(id);
      if (prev) leaveRoom(id); // cambio dimensione = re-join
      const p = {
        ws,
        name: (msg.name || "Anonimo").toString().slice(0, 16),
        dim: msg.dim || "earth",
        x: +msg.x || 0, z: +msg.z || 0, ry: +msg.ry || 0,
        char: msg.char || {},
      };
      players.set(id, p);
      roomOf(p.dim).add(id);
      // manda al nuovo arrivato la lista dei presenti nella stanza
      const peers = [];
      for (const pid of roomOf(p.dim)) {
        if (pid === id) continue;
        const q = players.get(pid);
        if (q) peers.push(peerInfo(q, pid));
      }
      ws.send(JSON.stringify({ type: "welcome", id, peers }));
      // avvisa gli altri
      broadcast(p.dim, { type: "peer_join", ...peerInfo(p, id) }, id);
      sendCounts(p.dim);
    }

    else if (msg.type === "move") {
      const p = players.get(id);
      if (!p) return;
      p.x = +msg.x || 0; p.z = +msg.z || 0; p.ry = +msg.ry || 0;
      broadcast(p.dim, { type: "peer_move", id, x: p.x, z: p.z, ry: p.ry }, id);
    }

    else if (msg.type === "chat") {
      const p = players.get(id);
      if (!p) return;
      const text = (msg.text || "").toString().slice(0, 140);
      if (text.trim()) broadcast(p.dim, { type: "chat", id, name: p.name, text }, null);
    }

    else if (msg.type === "emote") {
      const p = players.get(id);
      if (!p) return;
      broadcast(p.dim, { type: "emote", id, emote: (msg.emote || "👋").slice(0, 4) }, id);
    }
  });

  ws.on("close", () => {
    const p = players.get(id);
    const dim = p ? p.dim : null;
    leaveRoom(id);
    players.delete(id);
    if (dim) sendCounts(dim);
  });
});

server.listen(PORT, () => {
  console.log(`FUTUREME multiplayer server in ascolto sulla porta ${PORT}`);
});
