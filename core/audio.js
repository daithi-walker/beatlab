// Shared Web Audio primitives used across multibank, synth, and torman.
// Import with: <script type="module"> and import { ... } from '../core/audio.js'
// Requires a local server (file:// blocks ES module imports) — use docker compose.

// ── Note utilities ────────────────────────────────────────────────────────────

export const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// 'A4' → 440.0, 'C4' → 261.63, etc.
export function noteToFreq(name, oct) {
  return 440 * Math.pow(2, (oct - 4) + (CHROMATIC.indexOf(name) - 9) / 12);
}

// Parse a combined string like 'D2' → { name: 'D', oct: 2 }
export function parseNote(note) {
  const m = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) return null;
  return { name: m[1], oct: parseInt(m[2], 10) };
}

// Parse and convert in one call: 'D2' → frequency in Hz
export function noteStringToFreq(note) {
  const p = parseNote(note);
  return p ? noteToFreq(p.name, p.oct) : 220;
}

// ── Noise / impulse buffers ───────────────────────────────────────────────────

// Exponentially-decaying white noise — used as a convolution reverb impulse response.
// duration: seconds of IR tail; decay: steepness of falloff (higher = shorter perceived reverb)
export function makeImpulse(ctx, duration = 2.5, decay = 2) {
  const len = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

// Paul Kellet's pink noise approximation via a 7-coefficient IIR filter.
// Pink noise has equal energy per octave — sounds more natural than white for drums.
export function makePinkNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
    b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
    b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

export function makeWhiteNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// ── Distortion ────────────────────────────────────────────────────────────────

// Sigmoid soft-clip curve for a WaveShaperNode.
// drive: 0–1 (0 = bypass / null returned, 1 = heavy saturation)
// Uses k scaling of 0–200; higher k = more aggressive clipping.
export function distCurve(drive) {
  if (!drive) return null;
  const k = drive * 200;
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}
