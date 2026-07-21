// ============================================================
//  FUTUREME — networking client (multiplayer opzionale)
//  Si connette al server WebSocket e sincronizza la presenza
//  (posizione, nome, aspetto) con gli altri giocatori.
// ============================================================

export class Net {
  constructor(callbacks) {
    this.cb = callbacks || {};   // { onStatus, onWelcome, onPeerJoin, onPeerMove, onPeerLeave, onChat, onEmote, onCount }
    this.ws = null;
    this.connected = false;
    this.myId = null;
    this.name = "";
    this.char = {};
    this.dim = "earth";
    this._moveTimer = 0;
    this._pending = null;
  }

  connect(url, name, char) {
    this.name = name; this.char = char;
    try { this.ws = new WebSocket(url); }
    catch (e) { this.cb.onStatus && this.cb.onStatus("error", "URL non valido"); return; }

    this.ws.onopen = () => {
      this.connected = true;
      this.cb.onStatus && this.cb.onStatus("connected");
      // se avevamo già uno stato di gioco, invia subito il join
      if (this._pending) { this._join(this._pending); this._pending = null; }
    };
    this.ws.onclose = () => {
      this.connected = false;
      this.myId = null;
      this.cb.onStatus && this.cb.onStatus("disconnected");
    };
    this.ws.onerror = () => { this.cb.onStatus && this.cb.onStatus("error", "Connessione fallita"); };
    this.ws.onmessage = (ev) => this._onMessage(ev);
  }

  disconnect() {
    if (this.ws) { try { this.ws.close(); } catch (e) {} this.ws = null; }
    this.connected = false;
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }

  _join(state) {
    this.dim = state.dim;
    this._send({ type: "join", name: this.name, char: this.char, dim: state.dim, x: state.x, z: state.z, ry: state.ry });
  }

  // Chiamato all'avvio partita e a ogni cambio dimensione
  enterDimension(dim, x, z, ry) {
    const state = { dim, x, z, ry };
    if (this.connected) this._join(state);
    else this._pending = state;
    this.dim = dim;
  }

  // Invia la posizione (throttled ~12/s)
  sendMove(x, z, ry, dt) {
    if (!this.connected) return;
    this._moveTimer -= dt;
    if (this._moveTimer > 0) return;
    this._moveTimer = 0.08;
    this._send({ type: "move", x, z, ry });
  }

  sendChat(text) { this._send({ type: "chat", text }); }
  sendEmote(emote) { this._send({ type: "emote", emote }); }

  _onMessage(ev) {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    switch (msg.type) {
      case "welcome": this.myId = msg.id; this.cb.onWelcome && this.cb.onWelcome(msg.peers || []); break;
      case "peer_join": this.cb.onPeerJoin && this.cb.onPeerJoin(msg); break;
      case "peer_move": this.cb.onPeerMove && this.cb.onPeerMove(msg.id, msg); break;
      case "peer_leave": this.cb.onPeerLeave && this.cb.onPeerLeave(msg.id); break;
      case "chat": this.cb.onChat && this.cb.onChat(msg); break;
      case "emote": this.cb.onEmote && this.cb.onEmote(msg); break;
      case "count": this.cb.onCount && this.cb.onCount(msg.n); break;
    }
  }
}
