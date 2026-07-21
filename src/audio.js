// ============================================================
//  FUTUREME — audio procedurale (Web Audio API, nessun file esterno)
// ============================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientNodes = [];
    this.muted = false;
    this.enabled = false;
    this.currentDim = null;
  }

  // Va chiamato da un gesto utente (autoplay policy)
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.enabled = true;
  }

  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  // ---------- Musica ambientale per dimensione ----------
  setAmbient(dimId) {
    if (!this.enabled || dimId === this.currentDim) return;
    this.currentDim = dimId;
    this._stopAmbient();

    const cfg = {
      earth: { notes: [130.81, 196.0, 261.63], type: "sine",     lfo: 0.08, cutoff: 900, gain: 0.10 },
      moon:  { notes: [65.41, 97.99, 123.47],  type: "sawtooth", lfo: 0.05, cutoff: 380, gain: 0.09 },
      sun:   { notes: [261.63, 329.63, 392.0], type: "triangle", lfo: 0.15, cutoff: 1600, gain: 0.08 },
    }[dimId];
    if (!cfg) return;

    const t = this.ctx.currentTime;
    const pad = this.ctx.createGain();
    pad.gain.value = 0;
    pad.gain.setTargetAtTime(cfg.gain, t, 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cfg.cutoff;
    pad.connect(filter);
    filter.connect(this.master);

    // LFO che apre/chiude il filtro (movimento lento)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = cfg.lfo;
    lfoGain.gain.value = cfg.cutoff * 0.5;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start();
    this.ambientNodes.push(lfo, lfoGain, pad, filter);

    // accordo pad con leggero detune
    for (const freq of cfg.notes) {
      for (const det of [-4, 4]) {
        const osc = this.ctx.createOscillator();
        osc.type = cfg.type;
        osc.frequency.value = freq;
        osc.detune.value = det;
        osc.connect(pad);
        osc.start();
        this.ambientNodes.push(osc);
      }
    }
    this._ambientPad = pad;
  }

  _stopAmbient() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    if (this._ambientPad) this._ambientPad.gain.setTargetAtTime(0, t, 0.4);
    const nodes = this.ambientNodes;
    this.ambientNodes = [];
    setTimeout(() => { for (const n of nodes) { try { n.stop && n.stop(); n.disconnect(); } catch (e) {} } }, 600);
  }

  // ---------- Effetti sonori ----------
  _blip(freq, dur, type = "sine", vol = 0.3, slideTo = null) {
    if (!this.enabled || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _arp(freqs, step = 0.08, type = "triangle", vol = 0.3) {
    freqs.forEach((f, i) => setTimeout(() => this._blip(f, 0.18, type, vol), i * step * 1000));
  }

  pickup()  { this._blip(880, 0.12, "triangle", 0.25, 1320); }
  portal()  { this._blip(200, 0.5, "sine", 0.3, 1200); }
  seal()    { this._arp([523, 659, 784], 0.06, "sine", 0.28); }
  hit()     { this._blip(140, 0.18, "sawtooth", 0.35, 60); }
  banish()  { this._blip(400, 0.25, "square", 0.25, 90); }
  death()   { this._blip(330, 0.9, "sawtooth", 0.35, 55); }
  potion()  { this._arp([392, 523, 659, 784, 1047], 0.07, "triangle", 0.3); }
  victory() { this._arp([523, 659, 784, 1047, 1319, 1568], 0.11, "triangle", 0.32); }
  talk()    { this._blip(520, 0.08, "sine", 0.18, 620); }
}
