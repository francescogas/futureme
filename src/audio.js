// ============================================================
//  FUTUREME — audio procedurale (Web Audio API, nessun file esterno)
// ============================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientNodes = [];
    this._weatherNodes = [];
    this.muted = false;
    this.enabled = false;
    this.currentDim = null;
    this._weatherType = null;
    this.userVolume = 0.5; // 0..1 (moltiplicato internamente)
  }

  // Va chiamato da un gesto utente (autoplay policy)
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.userVolume;
    this.master.connect(this.ctx.destination);
    this.enabled = true;
  }

  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }

  setMasterVolume(v) {
    this.userVolume = Math.max(0, Math.min(1, v));
    if (this.master && !this.muted) this.master.gain.setTargetAtTime(this.userVolume, this.ctx.currentTime, 0.05);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.userVolume, this.ctx.currentTime, 0.05);
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
    this._startMusic(dimId);
  }

  // ---------- Musica di sottofondo (sequencer melodico per dimensione) ----------
  _note(freq, t, dur, type, vol, dest) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  _startMusic(dimId) {
    if (!this.enabled || !this.ctx) return;
    this._stopMusic();
    const scales = {
      earth: { root: 130.81, steps: [0, 3, 5, 7, 10], bpm: 96,  wave: "triangle" },
      moon:  { root: 98.00,  steps: [0, 2, 3, 7, 8],  bpm: 78,  wave: "sawtooth" },
      sun:   { root: 174.61, steps: [0, 4, 7, 9, 12], bpm: 116, wave: "sine" },
    };
    const cfg = scales[dimId] || scales.earth;
    const semi = (n) => Math.pow(2, n / 12);
    const beat = 60 / cfg.bpm / 2;                 // ottavi
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9; gain.connect(this.master);
    this._musicGain = gain;
    const state = { step: 0, next: this.ctx.currentTime + 0.15 };
    this._music = state;
    this._musicInt = setInterval(() => {
      if (!this.ctx || !this._music) return;
      const horizon = this.ctx.currentTime + 0.25;
      while (state.next < horizon) {
        const s = state.step, t = state.next;
        // basso sui tempi forti
        if (s % 4 === 0) {
          const bass = cfg.root * semi(cfg.steps[(s / 4) % cfg.steps.length] - 12);
          this._note(bass, t, beat * 2.2, cfg.wave, 0.11, gain);
        }
        // arpeggio melodico
        const mel = cfg.steps[(s * 2 + Math.floor(s / 8)) % cfg.steps.length];
        this._note(cfg.root * semi(mel + 12), t, beat * 0.85, "triangle", 0.05, gain);
        // eco leggero un'ottava sopra ogni 8 passi
        if (s % 8 === 4) this._note(cfg.root * semi(mel + 24), t, beat * 0.6, "sine", 0.025, gain);
        state.step++; state.next += beat;
      }
    }, 60);
  }

  _stopMusic() {
    if (this._musicInt) { clearInterval(this._musicInt); this._musicInt = null; }
    this._music = null;
    if (this._musicGain && this.ctx) {
      const g = this._musicGain; this._musicGain = null;
      try { g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); } catch (e) {}
      setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 500);
    }
  }

  // ---------- Tensione del boss (battito che accelera) ----------
  _buildBossLayer() {
    const ctx = this.ctx;
    const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(this.master);
    const pulse = ctx.createGain(); pulse.gain.value = 1; pulse.connect(gain);
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 240; filter.connect(pulse);
    const osc = [];
    for (const f of [55, 58.2]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(filter); o.start(); osc.push(o); }
    // battito cardiaco: LFO che modula il gain di "pulse"
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 1.1;
    const lg = ctx.createGain(); lg.gain.value = 0.6;
    lfo.connect(lg); lg.connect(pulse.gain); lfo.start();
    this._bossLayer = { gain, osc, lfo };
  }

  setBossProximity(v) {
    if (!this.enabled) return;
    if (v <= 0 && !this._bossLayer) return;
    if (!this._bossLayer) this._buildBossLayer();
    const t = this.ctx.currentTime;
    this._bossLayer.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.14, t, 0.2);
    this._bossLayer.lfo.frequency.setTargetAtTime(1.0 + v * 1.8, t, 0.3); // il battito accelera
    for (const o of this._bossLayer.osc) o.detune.setTargetAtTime(v * 25, t, 0.3);
  }

  // ---------- Ambiente meteo (rumore filtrato) ----------
  _noiseBuffer() {
    if (this._noise) return this._noise;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  }

  setWeatherAmbience(type) {
    if (!this.enabled || type === this._weatherType) return;
    this._weatherType = type;
    this._stopWeather();

    const cfg = {
      rain: { filter: "highpass", freq: 800, gain: 0.10 },
      snow: { filter: "lowpass", freq: 500, gain: 0.04 },
      fog:  { filter: "lowpass", freq: 350, gain: 0.05 },
      sand: { filter: "bandpass", freq: 700, gain: 0.13 },
    }[type];
    if (!cfg) return;

    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = cfg.filter; filter.frequency.value = cfg.freq;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(cfg.gain, this.ctx.currentTime, 1.0);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start();

    // vento: leggera modulazione del volume per sabbia/nebbia/neve
    if (type !== "rain") {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 0.15; lg.gain.value = cfg.gain * 0.6;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      this._weatherNodes.push(lfo, lg);
    }
    this._weatherNodes.push(src, filter, g);
    this._weatherGain = g;
  }

  _stopWeather() {
    if (!this.ctx) return;
    if (this._weatherGain) this._weatherGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    const nodes = this._weatherNodes || [];
    this._weatherNodes = [];
    setTimeout(() => { for (const n of nodes) { try { n.stop && n.stop(); n.disconnect(); } catch (e) {} } }, 500);
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

  jump()    { this._blip(300, 0.16, "square", 0.20, 640); }
  land()    { this._blip(170, 0.12, "sine", 0.22, 70); }
  swing()   { this._blip(680, 0.10, "sawtooth", 0.16, 190); }
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
