// core/export.js — shared, dependency-free audio/pattern export for BeatLab.
//
// Everything here writes bytes by hand: no libraries, no samples, no build step.
// Apps render their pattern through an OfflineAudioContext and hand the buffer
// to audioBufferToWav(); melodic/drum patterns become a Standard MIDI File via
// notesToMidi(); per-track stems are bundled with makeZip() (stored ZIP, so no
// JSZip dependency). See synth/voice-lab.html for the reference caller.

// ── download ──────────────────────────────────────────────────────────────────
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// Filesystem-safe token from a free-text name (patch/kit label, etc.).
export function safeName(s) {
  return (s || 'beatlab').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'beatlab';
}

// ── offline render ────────────────────────────────────────────────────────────
// setup(octx) builds the graph (connecting to octx.destination) and schedules
// every note/hit; then we render. setup may be async (e.g. awaiting a buffer).
export async function renderOffline({ duration, sampleRate = 44100, channels = 2, setup }) {
  const octx = new OfflineAudioContext(channels, Math.max(1, Math.ceil(duration * sampleRate)), sampleRate);
  await setup(octx);
  return octx.startRendering();
}

// ── WAV (16-bit PCM) ──────────────────────────────────────────────────────────
export function audioBufferToWav(buf) {
  const nc = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length;
  const blockAlign = nc * 2, dataLen = len * blockAlign;
  const ab = new ArrayBuffer(44 + dataLen), view = new DataView(ab);
  const ws = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true); ws(8, 'WAVE');
  ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, nc, true); view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true);
  ws(36, 'data'); view.setUint32(40, dataLen, true);
  const chans = []; for (let c = 0; c < nc; c++) chans.push(buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < nc; c++) {
    const v = Math.max(-1, Math.min(1, chans[c][i]));
    view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true); off += 2;
  }
  return new Blob([ab], { type: 'audio/wav' });
}

// ── MIDI (Standard MIDI File, format 0) ───────────────────────────────────────
// notes: [{ start, dur, note, vel, ch }] with start/dur in QUARTER-NOTE BEATS
// (resolution-independent). ch defaults to 0; GM drums use ch 9 (channel 10).
// endBeats pads the end-of-track to a full loop length so DAWs loop cleanly.
export function notesToMidi(notes, { bpm = 120, ppq = 480, endBeats = null } = {}) {
  const usPerQ = Math.round(60000000 / bpm);
  const ev = [];
  for (const n of notes) {
    const t = Math.round(n.start * ppq);
    const dur = Math.max(1, Math.round((n.dur == null ? 0.25 : n.dur) * ppq));
    const ch = (n.ch || 0) & 0x0f;
    const vel = Math.max(1, Math.min(127, n.vel == null ? 100 : n.vel));
    ev.push({ t, on: 1, ch, note: n.note & 0x7f, vel });
    ev.push({ t: t + dur, on: 0, ch, note: n.note & 0x7f, vel: 0 });
  }
  ev.sort((a, b) => a.t - b.t || a.on - b.on);   // note-offs before note-ons at the same tick
  const vlq = v => { const b = [v & 0x7f]; v >>>= 7; while (v > 0) { b.unshift((v & 0x7f) | 0x80); v >>>= 7; } return b; };
  const trk = [0x00, 0xff, 0x51, 0x03, (usPerQ >> 16) & 0xff, (usPerQ >> 8) & 0xff, usPerQ & 0xff]; // tempo
  let last = 0;
  for (const e of ev) { trk.push(...vlq(e.t - last)); last = e.t; trk.push((e.on ? 0x90 : 0x80) | e.ch, e.note, e.vel); }
  const endT = endBeats != null ? Math.max(last, Math.round(endBeats * ppq)) : last;
  trk.push(...vlq(endT - last), 0xff, 0x2f, 0x00);  // end of track
  const L = trk.length;
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (ppq >> 8) & 0xff, ppq & 0xff]; // MThd, fmt 0, 1 trk
  const thd = [0x4d, 0x54, 0x72, 0x6b, (L >> 24) & 0xff, (L >> 16) & 0xff, (L >> 8) & 0xff, L & 0xff]; // MTrk + len
  return new Uint8Array([...head, ...thd, ...trk]);
}

export function midiBlob(notes, opts) { return new Blob([notesToMidi(notes, opts)], { type: 'audio/midi' }); }

// ── MP3 (via vendored lamejs) ───────────────────────────────────────────────
// This is the ONE export path with an external dependency. lamejs is pure JS
// (no WASM, works on iOS) and is loaded as a classic <script> before the module
// that calls this, exposing window.lamejs. See docs/adr-008-lamejs-mp3.md.
// Apps that don't load lamejs simply never call this. Encodes up to 2 channels.
export function audioBufferToMp3(buf, kbps = 192) {
  const lame = (typeof window !== 'undefined') && window.lamejs;
  if (!lame || !lame.Mp3Encoder) throw new Error('lamejs not loaded — cannot encode MP3');
  const nc = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate;
  const enc = new lame.Mp3Encoder(nc, sr, kbps);
  const toI16 = (f32) => {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };
  const left = toI16(buf.getChannelData(0));
  const right = nc > 1 ? toI16(buf.getChannelData(1)) : null;
  const BLOCK = 1152, parts = [];
  for (let i = 0; i < left.length; i += BLOCK) {
    const l = left.subarray(i, i + BLOCK);
    const chunk = right ? enc.encodeBuffer(l, right.subarray(i, i + BLOCK)) : enc.encodeBuffer(l);
    if (chunk.length) parts.push(chunk);
  }
  const tail = enc.flush();
  if (tail.length) parts.push(tail);
  return new Blob(parts, { type: 'audio/mpeg' });
}

// ── ZIP (stored / no compression) ─────────────────────────────────────────────
// files: [{ name, data:Uint8Array }]. Stored entries mean no compressor is
// needed — audio (WAV) barely compresses anyway, so this costs almost nothing.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [], central = [];
  let offset = 0;
  const u16 = n => new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
  const u32 = n => { n >>>= 0; return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]); };
  const push = a => { chunks.push(a); offset += a.length; };
  for (const f of files) {
    const name = enc.encode(f.name), data = f.data, crc = crc32(data), localOffset = offset;
    push(u32(0x04034b50)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); // sig,ver,flag,method,time,date
    push(u32(crc)); push(u32(data.length)); push(u32(data.length));
    push(u16(name.length)); push(u16(0)); push(name); push(data);
    central.push({ name, crc, size: data.length, localOffset });
  }
  const cdStart = offset;
  for (const c of central) {
    push(u32(0x02014b50)); push(u16(20)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0));
    push(u32(c.crc)); push(u32(c.size)); push(u32(c.size));
    push(u16(c.name.length)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); push(u32(0)); push(u32(c.localOffset));
    push(c.name);
  }
  const cdSize = offset - cdStart;
  push(u32(0x06054b50)); push(u16(0)); push(u16(0)); push(u16(central.length)); push(u16(central.length));
  push(u32(cdSize)); push(u32(cdStart)); push(u16(0));
  return new Blob(chunks, { type: 'application/zip' });
}
