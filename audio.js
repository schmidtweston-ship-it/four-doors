/* Four Doors — generated beds + four-count. No binary audio required. */
(function (global) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  const TONE_HZ = { low: 98, warm: 146.83, clear: 196 };
  const TEMPO_BPM = { slow: 48, steady: 60, walking: 72 };
  const TEMPO_RANGE = {
    slow: [36, 64],
    steady: [48, 80],
    walking: [60, 96]
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function now(ctx) {
    return ctx.currentTime;
  }

  function envGain(ctx, dest, start, peak, attack, release) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
    g.connect(dest);
    return g;
  }

  class Engine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.bedGain = null;
      this.countGain = null;
      this.muted = false;
      this.bed = null;
      this.countTimer = null;
      this.countBeat = 0;
      this.countBpm = 60;
      this.onBeat = null;
      this.samples = [null, null, null, null];
      this.speak = false;
      this.tone = "warm";
      this.runningBed = false;
      this.runningCount = false;
    }

    async unlock() {
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.85;
        this.master.connect(this.ctx.destination);
        this.bedGain = this.ctx.createGain();
        this.bedGain.gain.value = 0.55;
        this.bedGain.connect(this.master);
        this.countGain = this.ctx.createGain();
        this.countGain.gain.value = 0.7;
        this.countGain.connect(this.master);
      }
      if (this.ctx.state === "suspended") {
        try { await this.ctx.resume(); } catch (e) { /* iOS may need another gesture */ }
      }
      return this.ctx;
    }

    setMuted(muted) {
      this.muted = !!muted;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(muted ? 0 : 0.85, now(this.ctx), 0.05);
      }
    }

    setCountGain(v) {
      if (this.countGain && this.ctx) {
        this.countGain.gain.setTargetAtTime(v, now(this.ctx), 0.05);
      }
    }

    /* ---- beds (doors 1–2, color layer) ---- */

    stopBed(fade) {
      const b = this.bed;
      this.bed = null;
      this.runningBed = false;
      if (!b || !this.ctx) return;
      const t = now(this.ctx);
      const f = fade == null ? 0.4 : fade;
      try {
        b.out.gain.setTargetAtTime(0.0001, t, f / 3);
      } catch (e) {}
      setTimeout(() => {
        try { b.osc1.stop(); b.osc2.stop(); b.osc3.stop(); } catch (e) {}
        try { b.noise.stop(); } catch (e) {}
      }, (f + 0.2) * 1000);
    }

    startBed(params) {
      if (!this.ctx) return;
      this.stopBed(0.15);
      const ctx = this.ctx;
      const p = Object.assign({
        freq: 110,
        fifth: true,
        cutoff: 480,
        noise: 0.08,
        lfo: 0.08,
        pulse: 0,
        bpm: 60,
        dissonance: 0,
        wave: "sine"
      }, params);

      const out = ctx.createGain();
      out.gain.value = 0.0001;
      out.connect(this.bedGain);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = p.cutoff;
      filter.Q.value = 0.7;
      filter.connect(out);

      const osc1 = ctx.createOscillator();
      osc1.type = p.wave;
      osc1.frequency.value = p.freq;
      const g1 = ctx.createGain();
      g1.gain.value = 0.32;
      osc1.connect(g1);
      g1.connect(filter);

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = p.freq * (p.fifth ? 1.5 : 2) * (1 + p.dissonance * 0.02);
      const g2 = ctx.createGain();
      g2.gain.value = p.fifth ? 0.16 : 0.08;
      osc2.connect(g2);
      g2.connect(filter);

      const osc3 = ctx.createOscillator();
      osc3.type = "sine";
      osc3.frequency.value = p.freq * 0.5;
      const g3 = ctx.createGain();
      g3.gain.value = 0.22;
      osc3.connect(g3);
      g3.connect(filter);

      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = Math.max(80, p.cutoff * 0.5);
      nf.Q.value = 0.6;
      const ng = ctx.createGain();
      ng.gain.value = p.noise;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(filter);

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = p.lfo;
      const lfoG = ctx.createGain();
      lfoG.gain.value = p.cutoff * 0.18;
      lfo.connect(lfoG);
      lfoG.connect(filter.frequency);

      let pulseLfo = null;
      if (p.pulse > 0) {
        pulseLfo = ctx.createOscillator();
        pulseLfo.type = "sine";
        pulseLfo.frequency.value = p.bpm / 60;
        const pg = ctx.createGain();
        pg.gain.value = 0.18 * p.pulse;
        pulseLfo.connect(pg);
        pg.connect(out.gain);
      }

      const t = now(ctx);
      osc1.start(t); osc2.start(t); osc3.start(t); noise.start(t); lfo.start(t);
      if (pulseLfo) pulseLfo.start(t);
      out.gain.exponentialRampToValueAtTime(0.9, t + 1.2);

      this.bed = { osc1, osc2, osc3, noise, lfo, pulseLfo, filter, out, params: p };
      this.runningBed = true;
    }

    vectorBed(params, seconds) {
      if (!this.bed || !this.ctx) {
        this.startBed(params);
        return;
      }
      const ctx = this.ctx;
      const b = this.bed;
      const t = now(ctx);
      const s = Math.max(4, seconds || 90);
      const p = Object.assign({}, b.params, params);
      try {
        b.osc1.frequency.linearRampToValueAtTime(p.freq, t + s);
        b.osc2.frequency.linearRampToValueAtTime(p.freq * (p.fifth ? 1.5 : 2) * (1 + (p.dissonance || 0) * 0.02), t + s);
        b.osc3.frequency.linearRampToValueAtTime(p.freq * 0.5, t + s);
        b.filter.frequency.linearRampToValueAtTime(p.cutoff, t + s);
      } catch (e) {}
      b.params = p;
    }

    /* ---- four-count (door 4 spine) ---- */

    setSamples(arr) {
      this.samples = arr || [null, null, null, null];
    }

    startCount({ bpm, tone, speak, onBeat }) {
      this.stopCount();
      this.countBpm = clamp(bpm || 60, 30, 120);
      this.tone = tone || "warm";
      this.speak = !!speak;
      this.onBeat = onBeat || null;
      this.countBeat = 0;
      this.runningCount = true;
      this._scheduleCount();
    }

    setCountBpm(bpm) {
      this.countBpm = clamp(bpm, 30, 120);
    }

    stopCount() {
      this.runningCount = false;
      if (this.countTimer) {
        clearTimeout(this.countTimer);
        this.countTimer = null;
      }
      try { if (global.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    }

    _scheduleCount() {
      if (!this.runningCount) return;
      const beatMs = 60000 / this.countBpm;
      const fire = () => {
        if (!this.runningCount) return;
        const n = (this.countBeat % 4) + 1;
        this.countBeat += 1;
        this._pulse(n);
        if (this.onBeat) {
          try { this.onBeat(n, this.countBpm); } catch (e) {}
        }
        const next = 60000 / this.countBpm;
        this.countTimer = setTimeout(fire, next);
      };
      // small downbeat delay so UI can paint
      this.countTimer = setTimeout(fire, 80);
    }

    _pulse(n) {
      if (!this.ctx) return;
      const sample = this.samples[n - 1];
      if (sample) {
        this._playSample(sample, n === 1 ? 1 : 0.85);
      } else {
        this._tonePulse(n);
      }
      if (this.speak) this._speak(n);
    }

    _tonePulse(n) {
      const ctx = this.ctx;
      const t = now(ctx);
      const base = TONE_HZ[this.tone] || TONE_HZ.warm;
      // even four: same family, downbeat a little lower and longer
      const freq = n === 1 ? base * 0.75 : n === 3 ? base * 1.125 : base;
      const dur = n === 1 ? 0.22 : 0.16;
      const peak = n === 1 ? 0.38 : 0.26;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + dur);

      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = this.tone === "clear" ? 1400 : this.tone === "low" ? 500 : 800;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(filt);
      filt.connect(g);
      g.connect(this.countGain);
      osc.start(t);
      osc.stop(t + dur + 0.02);

      // breath of noise on 1
      if (n === 1) {
        const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
        const d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource();
        src.buffer = nb;
        const ng = ctx.createGain();
        ng.gain.value = 0.04;
        src.connect(ng);
        ng.connect(this.countGain);
        src.start(t);
      }
    }

    _playSample(buf, vol) {
      try {
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = vol || 0.9;
        src.connect(g);
        g.connect(this.countGain);
        src.start();
      } catch (e) {}
    }

    _speak(n) {
      if (!global.speechSynthesis) return;
      const words = ["one", "two", "three", "four"];
      try {
        const u = new SpeechSynthesisUtterance(words[n - 1]);
        u.rate = 0.8;
        u.pitch = this.tone === "low" ? 0.7 : this.tone === "clear" ? 1.05 : 0.88;
        u.volume = this.muted ? 0 : 0.85;
        u.lang = "en-US";
        speechSynthesis.speak(u);
      } catch (e) {}
    }

    async decodeSample(arrayBuffer) {
      await this.unlock();
      return this.ctx.decodeAudioData(arrayBuffer.slice(0));
    }

    stopAll() {
      this.stopCount();
      this.stopBed(0.3);
    }
  }

  Engine.TONE_HZ = TONE_HZ;
  Engine.TEMPO_BPM = TEMPO_BPM;
  Engine.TEMPO_RANGE = TEMPO_RANGE;

  global.FourAudio = new Engine();
  global.FourAudioMeta = { TONE_HZ, TEMPO_BPM, TEMPO_RANGE };
})(window);
