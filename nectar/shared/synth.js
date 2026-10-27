// Nectar shared guitar synth: Karplus-Strong strings + amp/cab tone stage.
// Every Nectar page plays notes through this. Notes are { string, fret } (string 1 = high e),
// optionally with tech ('h' | 'p' | '/'), bend (semitones) and vibrato (bool).

import { makeImpulse, distCurve } from '../../core/audio.js';
import { midiOf, INSTRUMENT } from './theory.js';

// Amp presets. The signal path is:
//   strings -> highpass -> body -> mid hump -> waveshaper -> cab lowpass -> presence -> level
// drive: core distCurve amount, 0-1 (0 = bypass, clean). sustain: multiplies string ring time.
export const TONES = {
  acoustic: { label: 'Acoustic', drive: 0, body: 4, mid: 0, midFreq: 800, cab: 5500, presence: 0, level: 1.4, reverb: 0.22, sustain: 1 },
  clean: { label: 'Clean', drive: 0.008, body: 1, mid: 2, midFreq: 900, cab: 5000, presence: 2, level: 0.75, reverb: 0.2, sustain: 1.6 },
  blues: { label: 'Blues', drive: 0.08, body: 2, mid: 6, midFreq: 750, cab: 3800, presence: 3, level: 0.29, reverb: 0.16, sustain: 2.2 },
  rock: { label: 'Rock', drive: 0.33, body: 3, mid: 4, midFreq: 650, cab: 3400, presence: 4, level: 0.19, reverb: 0.12, sustain: 2.6 },
};

export class GuitarSynth {
  constructor() {
    this.ctx = null;
    this.cache = new Map();
    this.tone = 'blues';
    this.volumeLevel = 0.8;
  }

  ensure() {
    if (!this.ctx) {
      const ctx = (this.ctx = new AudioContext());
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      this.volume = ctx.createGain();
      this.volume.gain.value = this.volumeLevel;
      comp.connect(this.volume).connect(ctx.destination);

      const filter = (type, freq, q = 0.7) => {
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        return f;
      };
      const amp = (this.amp = {
        highpass: filter('highpass', 75),
        body: filter('peaking', 180, 1),
        mid: filter('peaking', 800, 0.9),
        shaper: ctx.createWaveShaper(),
        cab: filter('lowpass', 5000, 0.9),
        presence: filter('peaking', 2400, 1.2),
        level: ctx.createGain(),
        send: ctx.createGain(),
      });
      amp.shaper.oversample = '4x';

      this.input = ctx.createGain();
      this.input
        .connect(amp.highpass).connect(amp.body).connect(amp.mid)
        .connect(amp.shaper)
        .connect(amp.cab).connect(amp.presence).connect(amp.level)
        .connect(comp);

      // Heavy buffer work is deferred so the unlocking gesture handler returns fast (iOS).
      const reverb = ctx.createConvolver();
      setTimeout(() => { reverb.buffer = makeImpulse(ctx, 1.6, 3); }, 0);
      amp.level.connect(amp.send).connect(reverb).connect(comp);

      this.applyTone();
      this.auditionBus = this.newBus();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setVolume(v) {
    this.volumeLevel = v;
    if (this.ctx) this.volume.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setTone(name) {
    this.tone = name;
    if (this.ctx) this.applyTone();
  }

  applyTone() {
    const p = TONES[this.tone];
    const a = this.amp;
    const t = this.ctx.currentTime;
    a.body.gain.setTargetAtTime(p.body, t, 0.02);
    a.mid.frequency.setTargetAtTime(p.midFreq, t, 0.02);
    a.mid.gain.setTargetAtTime(p.mid, t, 0.02);
    a.shaper.curve = distCurve(p.drive);
    a.cab.frequency.setTargetAtTime(p.cab, t, 0.02);
    a.presence.gain.setTargetAtTime(p.presence, t, 0.02);
    a.level.gain.setTargetAtTime(p.level, t, 0.02);
    a.send.gain.setTargetAtTime(p.reverb, t, 0.02);
  }

  // Each play session gets its own bus so stopping can silence everything already scheduled.
  newBus() {
    const g = this.ctx.createGain();
    g.connect(this.input);
    g.voices = {};
    return g;
  }

  releaseBus(bus) {
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0, t + 0.06);
    setTimeout(() => bus.disconnect(), 250);
  }

  // Karplus-Strong buffer. The delay line length is an integer, so the true pitch is
  // corrected with playbackRate (returned as `rate`).
  buffer(midi) {
    // Ring time from the tone and the instrument; pluck position and softness from the instrument.
    const snd = INSTRUMENT.sound;
    const sustain = TONES[this.tone].sustain * snd.sustain;
    const key = `${midi}:${sustain}:${snd.pick}:${snd.soft}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const sr = this.ctx.sampleRate;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const N = Math.max(2, Math.floor(sr / f - 0.5));
    const f0 = sr / (N + 0.5);
    const t60 = Math.min(4, Math.max(1.1, 4 - (midi - 40) * 0.07)) * sustain;
    const decay = Math.pow(0.001, 1 / (f0 * t60));
    const len = Math.floor(sr * Math.min(6, t60 + 0.5));
    const out = new Float32Array(len);

    // Excitation: softened noise with a pick-position comb.
    const noise = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) {
      lp += (0.9 - 0.6 * snd.soft) * (Math.random() * 2 - 1 - lp);
      noise[i] = lp;
    }
    const pick = Math.max(1, Math.round(N * snd.pick));
    let mean = 0;
    for (let i = 0; i < N; i++) {
      out[i] = noise[i] - (i >= pick ? noise[i - pick] : 0);
      mean += out[i] / N;
    }
    let peak = 0;
    for (let i = 0; i < N; i++) {
      out[i] -= mean;
      peak = Math.max(peak, Math.abs(out[i]));
    }
    for (let i = 0; i < N; i++) out[i] *= 0.5 / (peak || 1);

    for (let i = N; i < len; i++) {
      out[i] = decay * 0.5 * (out[i - N] + (i - N - 1 >= 0 ? out[i - N - 1] : 0));
    }
    const fadeLen = Math.floor(sr * 0.3);
    for (let i = 0; i < fadeLen; i++) out[len - 1 - i] *= i / fadeLen;

    const buf = this.ctx.createBuffer(1, len, sr);
    buf.copyToChannel(out, 0);
    const entry = { buf, rate: f / f0 };
    this.cache.set(key, entry);
    return entry;
  }

  // Play one note. `dur` is the note's notated length in seconds (used to time bends/slides).
  // Hammer-ons, pull-offs and slides continue the note already ringing on that string
  // (see legato); everything else is a fresh pick.
  pluck(bus, note, t, dur) {
    const midi = midiOf(note);
    const voice = bus.voices[note.string];
    const tech = note.tech === 'h' || note.tech === 'p' || note.tech === '/';
    if (tech && voice && t < voice.end) return this.legato(bus, voice, note, midi, t, dur);

    const ctx = this.ctx;
    const g = ctx.createGain();
    // Paired strings sound as two plucks, slightly detuned and a few ms apart; the second is
    // at the pair's interval (unison, or an octave up on 12-string low courses).
    const pair = INSTRUMENT.courses?.[note.string - 1];
    const courses = pair === undefined ? [[0, 0, 0]] : [[0, -3, 0], [pair, 3, 0.006]];
    // A hammer-on/pull-off/slide with nothing ringing on the string is a soft pick.
    const vel = (tech ? 0.5 : 0.9) / Math.sqrt(courses.length);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    const srcs = courses.map(([semis, cents, delay]) => {
      const { buf, rate: baseRate } = this.buffer(midi + semis);
      const rate = baseRate * Math.pow(2, cents / 1200);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.setValueAtTime(rate, t);
      src.connect(g);
      src.start(t + delay);
      src.stop(t + delay + buf.duration + 0.1);
      return { pr: src.playbackRate, rate, end: t + delay + buf.duration };
    });

    // One sounding note per string: a new pick mutes the previous one.
    this.mute(bus, note.string, t);
    g.connect(bus);
    const v = { g, srcs, midi, end: Math.min(...srcs.map((x) => x.end)) };
    bus.voices[note.string] = v;
    this.bendAndVibrato(v, note, t, dur);
  }

  // Hammer-on / pull-off / slide: the string keeps vibrating and only its length changes, so
  // retune the ringing voice (instantly, or gliding for a slide) instead of picking again.
  // A hammer adds a dull finger tap; a pull-off flicks the string, a little brighter.
  legato(bus, voice, note, midi, t, dur) {
    const ratio = Math.pow(2, (midi - voice.midi) / 12);
    for (const v of voice.srcs) {
      const to = v.rate * ratio;
      v.pr.cancelScheduledValues(t);
      v.pr.setValueAtTime(v.rate, t);
      if (note.tech === '/') v.pr.linearRampToValueAtTime(to, t + Math.min(0.09, dur * 0.5));
      else v.pr.setValueAtTime(to, t);
      v.rate = to;
    }
    voice.midi = midi;
    if (note.tech === 'h') this.fingerNoise(bus, midi, t, 0.1, 1400);
    if (note.tech === 'p') this.fingerNoise(bus, midi, t, 0.13, 3200);
    this.bendAndVibrato(voice, note, t, dur);
  }

  // A short, quiet pluck transient at the new pitch: the finger's contact with the string.
  fingerNoise(bus, midi, t, level, cutoff) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    const { buf, rate } = this.buffer(midi);
    src.buffer = buf;
    src.playbackRate.value = rate;
    const lp = ctx.createBiquadFilter();
    lp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.setTargetAtTime(0, t + 0.004, 0.025);
    src.connect(lp).connect(g).connect(bus);
    src.start(t);
    src.stop(t + 0.2);
  }

  bendAndVibrato(voice, note, t, dur) {
    if (note.bend) {
      const bs = t + Math.min(0.06, dur * 0.15);
      for (const v of voice.srcs) {
        v.pr.setValueAtTime(v.rate, bs);
        v.pr.linearRampToValueAtTime(v.rate * Math.pow(2, note.bend / 12), bs + Math.min(0.2, dur * 0.45));
      }
    }
    if (note.vibrato) {
      const lfo = this.ctx.createOscillator();
      const depth = this.ctx.createGain();
      lfo.frequency.value = 5.5;
      const vs = t + Math.min(0.35, dur * 0.3);
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, vs);
      depth.gain.linearRampToValueAtTime(Math.pow(2, note.bend / 12) * 0.014, vs + 0.25);
      lfo.connect(depth);
      for (const v of voice.srcs) depth.connect(v.pr);
      lfo.start(t);
      lfo.stop(voice.end);
    }
  }

  mute(bus, string, t) {
    const prev = bus.voices[string];
    if (!prev) return;
    prev.g.gain.cancelScheduledValues(t);
    prev.g.gain.setTargetAtTime(0, t, 0.012);
    delete bus.voices[string];
  }

  muteAll(bus, t) {
    for (const s of Object.keys(bus.voices)) this.mute(bus, +s, t);
  }

  click(bus, t, accent) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = accent ? 1700 : 1150;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Play notes now, outside any sequence. gap = seconds between notes (0.012 = chord, 0.06 = strum).
  audition(notes, gap = 0.012) {
    this.ensure();
    const t = this.ctx.currentTime + 0.02;
    notes.forEach((n, k) => this.pluck(this.auditionBus, { ...n, tech: null }, t + k * gap, 0.6));
    return notes.map((_, k) => (t - this.ctx.currentTime + k * gap) * 1000); // ms until each note
  }
}
