// core/voice.js — the shared rich-synthesis voice engine for BeatLab.
//
// One engine, many sounds. A "patch" is a plain parameter object (see
// VOICE_PARAM_DEFAULTS). The Voice Lab (synth/voice-lab.html) is the design
// bench where you dial a patch in; the main Synth (synth/index.html) plays it.
// Patches you save travel between them through localStorage (see savePatch).
//
// The engine builds, per note: a unison stack of detuned oscillators + optional
// sub-octave sine → waveshaper drive → resonant lowpass with its own envelope →
// amp envelope. This is the "thickness" a single oscillator lacks — it is what
// escapes beatlab's old "8-bit" timbre, with zero samples.
//
// Import with a module script over HTTP(S) (file:// blocks ES modules):
//   import { createVoiceEngine, FACTORY_PRESETS } from '../core/voice.js';

import { distCurve } from './audio.js';
import { savePattern, loadPattern, listPatterns, deletePattern } from './storage.js';

// ── patch shape ─────────────────────────────────────────────────────────────
// Every field is synthesis-only. Times in seconds, cutoff/fenv in Hz, 0–1 mixes.
export const VOICE_PARAM_DEFAULTS = {
  wave:'sawtooth',  // 'sine' | 'triangle' | 'sawtooth' | 'square'
  unison:1,         // detuned oscillators per note (1–7)
  detune:0,         // spread of the unison stack, cents
  spread:0,         // stereo width of the unison stack, 0–1
  sub:0,            // sub-octave sine level, 0–1
  drive:0,          // waveshaper saturation, 0–1
  cutoff:8000,      // lowpass base cutoff, Hz
  fenv:0,           // filter envelope amount added to cutoff, Hz
  q:0.5,            // lowpass resonance
  level:0.4,        // voice output level, 0–1
  amp:{  a:0.01,  d:0.15, s:0.7, r:0.3 },  // amp ADSR (s is 0–1 of level)
  filt:{ a:0.01,  d:0.2,  s:0.5 },         // filter env A/D and sustain fraction
  rev:0.15,         // reverb send suggestion (apps own the actual send)
  tapDur:0.5,       // convenience: how long a fire-and-forget tap lasts
};

// Params a handle.update() can change on a note that's already sounding. Any
// other param (unison count, sub, amp/filter ADSR, filter-envelope amount) is
// structural or an already-fired envelope, so it only takes effect next note.
export const VOICE_LIVE_PARAMS = ['wave', 'detune', 'spread', 'drive', 'q', 'cutoff'];

// Fill any missing fields so partial/legacy patches always play.
export function normPatch(p = {}) {
  return {
    ...VOICE_PARAM_DEFAULTS, ...p,
    amp:  { ...VOICE_PARAM_DEFAULTS.amp,  ...(p.amp  || {}) },
    filt: { ...VOICE_PARAM_DEFAULTS.filt, ...(p.filt || {}) },
  };
}

// ── factory presets (shared by lab + synth) ─────────────────────────────────
// "thin"/"init" are the deliberate single-oscillator baseline. The rest prove
// the timbre bar. rev is baked in so both apps agree on the space.
export const FACTORY_PRESETS = {
  init:    { wave:'sawtooth', unison:1, detune:0,  spread:0,    sub:0,    drive:0,
             cutoff:8000, fenv:0,    q:0.5, level:0.42,
             amp:{a:0.01,d:0.15,s:0.7,r:0.3}, filt:{a:0.005,d:0.1,s:1}, rev:0.1, tapDur:0.5 },
  thin:    { wave:'sawtooth', unison:1, detune:0,  spread:0,    sub:0,    drive:0,
             cutoff:8000, fenv:0,    q:0.2, level:0.5,
             amp:{a:0.005,d:0.08,s:0.9,r:0.08}, filt:{a:0.005,d:0.1,s:1}, rev:0.08, tapDur:0.5 },
  ninBass: { wave:'sawtooth', unison:3, detune:14, spread:0.35, sub:0.65, drive:0.72,
             cutoff:320, fenv:2000, q:5,   level:0.42,
             amp:{a:0.004,d:0.14,s:0.75,r:0.14}, filt:{a:0.004,d:0.16,s:0.28}, rev:0.22, tapDur:0.45 },
  lead:    { wave:'sawtooth', unison:5, detune:18, spread:0.5,  sub:0.25, drive:0.55,
             cutoff:800, fenv:3200, q:7,   level:0.34,
             amp:{a:0.006,d:0.2,s:0.7,r:0.22}, filt:{a:0.006,d:0.22,s:0.35}, rev:0.22, tapDur:0.6 },
  pad:     { wave:'sawtooth', unison:7, detune:24, spread:0.7,  sub:0.35, drive:0.16,
             cutoff:500, fenv:2600, q:3,   level:0.3,
             amp:{a:0.45,d:0.6,s:0.85,r:0.9}, filt:{a:0.6,d:1.2,s:0.6}, rev:0.5, tapDur:1.4 },
};

// Human labels for the factory presets, in menu order.
export const FACTORY_PRESET_LIST = [
  { id:'init',    label:'Init' },
  { id:'ninBass', label:'NIN Bass' },
  { id:'lead',    label:'Industrial Lead' },
  { id:'pad',     label:'Supersaw Pad' },
];

// ── randomiser ───────────────────────────────────────────────────────────────
// A fresh, playable patch for sound-hunting. Ranges are hand-tuned (log-uniform
// for frequencies/times, weighted picks for wave/unison) so results are usually
// musical rather than noise. Pass a custom rng for reproducible tests.
export function randomPatch(rnd = Math.random) {
  const r  = (a, b) => a + (b - a) * rnd();
  const ri = (a, b) => Math.round(r(a, b));
  const rl = (a, b) => Math.exp(r(Math.log(a), Math.log(b)));   // log-uniform
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const n2 = v => +v.toFixed(2), n3 = v => +v.toFixed(3);
  return normPatch({
    wave:   pick(['sawtooth', 'sawtooth', 'square', 'triangle', 'sine']),
    unison: pick([1, 1, 2, 3, 3, 4, 5, 7]),
    detune: ri(0, 30),
    spread: n2(r(0, 0.8)),
    sub:    rnd() < 0.5 ? 0 : n2(r(0.2, 0.7)),
    drive:  rnd() < 0.4 ? 0 : n2(r(0.1, 0.8)),
    cutoff: Math.round(rl(200, 8000)),
    fenv:   rnd() < 0.35 ? 0 : Math.round(r(500, 5000)),
    q:      +r(0.3, 10).toFixed(1),
    level:  n2(r(0.32, 0.44)),
    amp:  { a: n3(rl(0.002, 0.4)), d: n2(r(0.05, 0.6)), s: n2(r(0.3, 0.95)), r: n2(r(0.05, 0.9)) },
    filt: { a: n3(rl(0.002, 0.4)), d: n2(r(0.05, 0.6)), s: n2(r(0.2, 0.9)) },
    rev:    n2(r(0, 0.5)),
    tapDur: n2(r(0.3, 1.0)),
  });
}

// ── user patch bank (shared across apps via localStorage) ────────────────────
// Stored under the 'voice' app namespace so every BeatLab app that imports this
// module sees the same saved patches. Names are free text.
const BANK_APP = 'voice';
export function savePatch(name, patch)  { savePattern(BANK_APP, name, normPatch(patch)); }
export function loadPatch(name)         { const p = loadPattern(BANK_APP, name); return p ? normPatch(p) : null; }
export function listPatches()           { return listPatterns(BANK_APP); }
export function deletePatch(name)        { deletePattern(BANK_APP, name); }

// ── the engine ───────────────────────────────────────────────────────────────
// createVoiceEngine(ctx, { output, reverb })
//   output — the node all dry voice audio connects to (e.g. a filter or bus)
//   reverb — optional node to feed a per-engine reverb send (set with setReverbSend)
//
// Returns:
//   noteOn(freq, patch, when?)          → handle (sustains until handle.release())
//   trigger(freq, patch, dur, when?)    → handle (fire-and-forget, self-releases)
//   setReverbSend(v)                    → 0–1 wet send level (needs a reverb node)
//   dry                                 → the engine's dry output gain
//
// handle:
//   release(when?)        — start the amp release and schedule teardown
//   setFreq(freq, glide?) — retune all oscillators (mono glide when glide>0)
//   retrigger(when?)      — re-strike amp + filter envelopes (mono restrike)
//   update(changes)       — live-tweak a sounding note (VOICE_LIVE_PARAMS only)
//   stop()                — hard stop + disconnect now
export function createVoiceEngine(ctx, { output, reverb } = {}) {
  const dry = ctx.createGain(); dry.gain.value = 1;
  if (output) dry.connect(output);

  let send = null;
  if (reverb) { send = ctx.createGain(); send.gain.value = 0; send.connect(reverb); }

  function build(freq, patch, when, dur) {
    const p = normPatch(patch);
    const nodes = [];          // everything to disconnect on teardown
    const oscs  = [];          // { node, ratio } — ratio*freq is the osc's pitch
    const sum = ctx.createGain(); sum.gain.value = 1; nodes.push(sum);

    const n = Math.max(1, p.unison | 0);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      o.type = p.wave; o.frequency.value = freq;
      const s = n > 1 ? (i / (n - 1) - 0.5) * 2 : 0;   // -1..1 symmetric
      o.detune.value = s * p.detune;
      const og = ctx.createGain();
      og.gain.value = (i === ((n / 2) | 0) ? 1 : 0.72) / Math.sqrt(n);
      const pan = ctx.createStereoPanner(); pan.pan.value = s * p.spread;
      o.connect(og); og.connect(pan); pan.connect(sum);
      o.start(when);
      nodes.push(o, og, pan); oscs.push({ node:o, ratio:1, s, pan, isMain:true });
    }
    if (p.sub > 0) {
      const so = ctx.createOscillator(); so.type = 'sine'; so.frequency.value = freq / 2;
      const sg = ctx.createGain(); sg.gain.value = p.sub * 0.7;
      so.connect(sg); sg.connect(sum); so.start(when);
      nodes.push(so, sg); oscs.push({ node:so, ratio:0.5, s:0, pan:null, isMain:false });
    }

    // waveshaper drive (null curve = clean passthrough)
    const shaper = ctx.createWaveShaper();
    shaper.curve = distCurve(p.drive); shaper.oversample = '2x';
    sum.connect(shaper); nodes.push(shaper);

    // resonant lowpass with its own envelope (the "movement" that stops a beep)
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = p.q;
    const base = p.cutoff;
    const peak = Math.min(18000, p.cutoff + p.fenv);
    const sus  = Math.max(60, base + (peak - base) * p.filt.s);
    flt.frequency.setValueAtTime(base, when);
    flt.frequency.linearRampToValueAtTime(peak, when + p.filt.a + 0.001);
    flt.frequency.exponentialRampToValueAtTime(sus, when + p.filt.a + p.filt.d);
    shaper.connect(flt); nodes.push(flt);

    // amp envelope (attack → decay → sustain; release scheduled on demand)
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(p.level, when + p.amp.a);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, p.amp.s * p.level), when + p.amp.a + p.amp.d);
    flt.connect(amp); nodes.push(amp);
    amp.connect(dry); if (send) amp.connect(send);

    // Teardown: once every oscillator ends, sever the branch so it is GC'd.
    // Without this the nodes stay wired to the bus and the audio thread keeps
    // processing them forever — render load climbs until the sound drops out.
    let torn = false;
    const teardown = () => { if (torn) return; torn = true; nodes.forEach(nd => { try { nd.disconnect(); } catch (e) {} }); };
    let live = oscs.length;
    oscs.forEach(o => { o.node.onended = () => { if (--live === 0) teardown(); }; });
    const stopSources = (t) => { oscs.forEach(o => { try { o.node.stop(t); } catch (e) {} }); };
    const readGain = () => { try { return amp.gain.value; } catch (e) { return p.level; } };

    const handle = {
      release(t = ctx.currentTime) {
        const r = p.amp.r;
        amp.gain.cancelScheduledValues(t);
        amp.gain.setValueAtTime(Math.max(0.0001, readGain()), t);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + r);
        stopSources(t + r + 0.1);
      },
      setFreq(f, glide = 0) {
        const t = ctx.currentTime;
        oscs.forEach(o => {
          const target = f * o.ratio;
          o.node.frequency.cancelScheduledValues(t);
          if (glide > 0) {
            o.node.frequency.setValueAtTime(o.node.frequency.value, t);
            o.node.frequency.linearRampToValueAtTime(target, t + glide);
          } else {
            o.node.frequency.setValueAtTime(target, t);
          }
        });
      },
      retrigger(t = ctx.currentTime) {
        amp.gain.cancelScheduledValues(t);
        amp.gain.setValueAtTime(Math.max(0.0001, readGain()), t);
        amp.gain.exponentialRampToValueAtTime(p.level, t + p.amp.a);
        amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, p.amp.s * p.level), t + p.amp.a + p.amp.d);
        flt.frequency.cancelScheduledValues(t);
        flt.frequency.setValueAtTime(base, t);
        flt.frequency.linearRampToValueAtTime(peak, t + p.filt.a + 0.001);
        flt.frequency.exponentialRampToValueAtTime(sus, t + p.filt.a + p.filt.d);
      },
      // Live-tweak a sounding note. Only pass the fields that changed; each is
      // applied to this already-built graph so a held key responds immediately.
      // Structural params (unison count, sub presence) and already-fired
      // envelopes (amp/filter ADSR, fenv amount) can't be rewritten mid-note —
      // they take effect on the next note. See VOICE_LIVE_PARAMS.
      update(c = {}) {
        const t = ctx.currentTime;
        if ('wave' in c)   oscs.forEach(o => { if (o.isMain) { try { o.node.type = c.wave; } catch (e) {} } });
        if ('detune' in c) oscs.forEach(o => { if (o.isMain) o.node.detune.setValueAtTime(o.s * c.detune, t); });
        if ('spread' in c) oscs.forEach(o => { if (o.isMain && o.pan) o.pan.pan.setValueAtTime(o.s * c.spread, t); });
        if ('drive' in c)  { try { shaper.curve = distCurve(c.drive); } catch (e) {} }
        if ('q' in c)      flt.Q.setValueAtTime(c.q, t);
        if ('cutoff' in c) { flt.frequency.cancelScheduledValues(t); flt.frequency.setValueAtTime(c.cutoff, t); }
      },
      stop() { stopSources(ctx.currentTime); teardown(); },
    };

    if (dur != null) {
      // fire-and-forget: schedule a deterministic release at when+dur
      const rel = when + dur;
      amp.gain.setValueAtTime(Math.max(0.0001, p.amp.s * p.level), rel);
      amp.gain.exponentialRampToValueAtTime(0.0001, rel + p.amp.r);
      stopSources(rel + p.amp.r + 0.1);
    }
    return handle;
  }

  return {
    noteOn(freq, patch, when = ctx.currentTime)        { return build(freq, patch, when, null); },
    trigger(freq, patch, dur, when = ctx.currentTime)  { return build(freq, patch, when, dur); },
    setReverbSend(v) { if (send) send.gain.value = v; },
    dry,
  };
}
