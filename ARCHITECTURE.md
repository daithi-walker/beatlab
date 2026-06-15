# Music Apps — Architecture Overview

## What we're building

A suite of browser-based music tools that share a common audio philosophy but each have a distinct interaction model. All apps live under this directory and are self-contained single-file HTML apps (no build step, open directly in browser).

### Apps

| App | Status | What it is |
|---|---|---|
| `multibank/` | Working | 16-step drum/synth sequencer |
| `synth/` | Planned | Polyphonic keyboard synth with XY modulation |
| `nectar/` | Early | Guitar learning app — needs to play real notes |
| `torman/` | Working | Canvas gesture → bass synth (DubCanvas) |

---

## Core Insight

All four apps are the same thing at the bottom:

```
trigger → oscillator/noise → ADSR envelope → filter → effects → speakers
```

What changes between apps is only the **trigger mechanism** and **UI model**:

| App | Trigger | Timing model |
|---|---|---|
| multibank | step buttons, clock-driven | quantised loop (16th notes) |
| synth | laptop keys / mouse clicks | real-time, note-on/off |
| nectar | string fret positions, tap | real-time, guitar-mapped |
| torman | canvas gestures | gesture speed = pitch/register |

---

## Shared Primitives (extract later)

These exist in every app and should eventually live in `core/audio.js`:

### Note utilities
```js
noteToFreq(note)          // 'A4' → 440.0
NOTE_OFFSETS              // semitone offsets per note name
buildScale(rootFreq, intervals)
```

### Noise buffers
```js
makePinkNoise(ctx, seconds)
makeWhiteNoise(ctx, seconds)
makeImpulse(ctx, seconds, decay)  // reverb IR
```

### Effects chain builder
Takes a set of params and returns a pre-wired graph of Web Audio nodes:
```js
buildEffectsChain(ctx, masterGain, { filter, reverb, delay, distortion, chorus, lfoRate })
→ { entry, filter, filterLfo, filterLfoGain, gain, reverbSend, delaySend, chorusSend }
```

### Distortion curve
```js
makeDistortionCurve(drive)  // sigmoid soft-clip, drive 0–1
```

---

## Audio Architecture Decisions

### 1. Web Audio API only, no libraries
Every app uses raw Web Audio API nodes. No Tone.js, no p5.sound. This keeps file size near zero, teaches the actual concepts, and gives full control over the signal graph.

### 2. Lookahead scheduler (sequencer apps)
```
setInterval(tick, 25ms) — polls every 25ms
while (nextBeatTime < ctx.currentTime + 0.1) { schedule(); advance(); }
```
Events are queued to the audio clock, not to setTimeout. This means timing stays rock-solid even when the browser tab loses focus or the JS thread is busy. The 100ms lookahead is the standard sweet spot.

### 3. Shared reverb send/return
All panels/voices send to a single convolution reverb (`ConvolverNode`) via individual gain nodes. The reverb return feeds the master. This is the standard studio send/return model — much cheaper than one reverb per voice.

### 4. Pre-generated noise buffers
Pink and white noise buffers are generated once at audio init and shared across all drum hits. `BufferSourceNode` is one-shot (create/start/stop/GC) but the underlying `AudioBuffer` is reusable.

### 5. Effects chain per panel (multibank) vs global (synth)
- **multibank**: each bank has its own filter → gain → distortion → sends. Panels are independent.
- **synth**: all voices sum into a single voiceBus, then one global effects chain shapes the sound. This models a real synthesiser.

### 6. ADSR implementation
Web Audio API has no built-in ADSR. We schedule gain ramps manually:
```js
// Note on:
g.gain.setValueAtTime(0.001, now);
g.gain.exponentialRampToValueAtTime(1.0, now + attack);
g.gain.exponentialRampToValueAtTime(Math.max(0.001, sustain), now + attack + decay);

// Note off:
g.gain.cancelScheduledValues(now);
g.gain.setValueAtTime(Math.max(0.001, g.gain.value), now);
g.gain.exponentialRampToValueAtTime(0.001, now + release);
osc.stop(now + release + 0.05);
```
`exponentialRamp` can't ramp to zero (log of 0 = -∞), so we always target 0.001 and let it be inaudible.

---

## UI Patterns

All apps share the same visual design system, lifted from torman:

### Design tokens (CSS variables)
```css
--bg: #080c10          /* page background */
--surface: #0e1318     /* card/panel bg */
--surface-2: #121920   /* inset bg */
--divider: #1a2830     /* borders */
--text: #d4e8e0        /* primary text */
--muted: #6a8f80       /* secondary text */
--teal: #00e5cc        /* primary accent */
--green: #39ff6a
--amber: #f5a623
--purple: #b06fff
--pink: #ff6b9d
```

### Typography
Space Grotesk (Google Fonts), rendered at small sizes with wide letter-spacing for that hardware-panel feel.

### Interaction patterns
- **Drag across steps** to paint/erase (pointerdown sets intent, pointermove applies it)
- **Topbar** fixed, always accessible
- **iOS audio unlock**: browser policy requires a user gesture before AudioContext runs — always show a banner and resume on first touch/keydown

---

## What's built in multibank

- Dynamic bank add/remove — up to any number of banks
- 13 bank types: Kick, Snare, Hi-Hat, Clap, Tom Hi, Tom Lo, Open Hat, Crash, Bass, Sub, Lead, Pluck, Pad
- Per-bank type switcher (change type after creation, pattern preserved)
- Drag to paint steps, spacebar play/stop, mute per bank
- Effects per bank: filter, LFO (filter mod), reverb, delay, distortion, chorus
- Shared reverb convolver (send/return)
- Lookahead scheduler

### Planned for multibank
See `multibank/features.md`

---

## Conventions

- **Single HTML file per app** — no build step, no node_modules, open directly
- **No frameworks** — vanilla JS, Web Audio API, CSS custom properties
- **No comments explaining what** — only comments explaining *why* (hidden constraints, workarounds, non-obvious invariants)
- **Imports when ready** — once `core/` is worth extracting, apps switch to `<script type="module">` and import shared utilities. No bundler needed; modern browsers handle ES modules natively from `file://` with a local server, or just inline the shared code for now.
