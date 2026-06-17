# BeatLab Groovebox — Design & Implementation Guide

This document covers the four features that transform Drums from a step sequencer
into a live-performance groovebox. They are ordered by implementation priority and
dependency — each phase is useful on its own, and each one sets up the next.

---

## What a groovebox means here

A groovebox is a device where you can:
1. Build loops live by tapping (pad recording — **already done**)
2. **Loop those recordings directly** without converting to a step grid
3. **Switch patterns while playing** with bar-boundary quantisation
4. **Launch scenes** — see multiple patterns at once and jump between them
5. **Tweak sounds in real-time** — filter sweep, reverb, volume per track

Items 2–5 are what this document covers. Items 1 is already shipped.

---

## Phase 1 — Live take looping

**What:** After recording a take, loop it directly from the beat-relative event
list without converting to the step sequencer. Loops are BPM-aware — changing
BPM stretches/compresses the loop in real time.

**Why first:** Smallest change. The recording infrastructure and the lookahead
scheduler are already in place. This makes the Rec button immediately useful as
a performance tool rather than just a way to populate the step grid.

### Data model

Takes are already stored as beat-relative events (unchanged):

```js
{
  version: 1,
  bpm: 120,         // informational only — playback uses live bpm
  bars: 2,
  kit: '808',
  quantized: false,
  events: [
    { id: 'kick',  beat: 0.00 },   // beat 0 = bar 1 beat 1
    { id: 'snare', beat: 1.00 },
    { id: 'kick',  beat: 2.00 },
    { id: 'hihat', beat: 2.50 },
  ]
}
```

`beat` is always in quarter-note units. A 2-bar take at 4/4 spans beats 0–8 (exclusive).
`loopDuration = take.bars * 4 * beatDuration()` where `beatDuration = 60 / bpm`.

### Scheduler integration

Add a `liveLoop` object alongside the existing step scheduler:

```js
let liveLoop = null;
// Shape: { take, loopStart (audio time), scheduledThrough (audio time) }
```

Inside the existing `tick()` function (which already fires every 25ms), add:

```js
function tick() {
  // ... existing step sequencer code ...
  tickLiveLoop(ctx.currentTime);
}

function tickLiveLoop(now) {
  if (!liveLoop) return;
  const { take, loopStart } = liveLoop;
  const loopDur = take.bars * 4 * beatDuration();
  const horizon = now + LOOKAHEAD;

  take.events.forEach(ev => {
    const beatSec = ev.beat * beatDuration();
    // Determine which loop cycle(s) to schedule
    // Cycle N starts at: loopStart + N * loopDur
    const firstCycle = Math.max(0, Math.floor((liveLoop.scheduledThrough - loopStart) / loopDur));
    const lastCycle  = Math.ceil((horizon - loopStart) / loopDur);

    for (let c = firstCycle; c < lastCycle; c++) {
      const t = loopStart + c * loopDur + beatSec;
      if (t >= liveLoop.scheduledThrough && t < horizon) {
        voice(ev.id, t);   // existing voice() function — no changes needed
      }
    }
  });

  liveLoop.scheduledThrough = horizon;
}
```

### Starting and stopping

```js
function startLiveLoop(take) {
  liveLoop = {
    take,
    loopStart: ctx.currentTime + 0.05,  // small buffer for first schedule
    scheduledThrough: ctx.currentTime,
  };
  // Flash each pad as it fires — hook into voice() to trigger .hit class
  // based on ev.id matching pad's data-track-id
}

function stopLiveLoop() {
  liveLoop = null;
}
```

BPM changes work automatically because `beatDuration()` is called fresh on every
tick — the loop stretches/compresses on the next tick cycle.

### Kit changes mid-loop

When the user switches kit while a live loop is running, `voice()` already picks
up `currentKit` at call time, so kit changes apply immediately on the next cycle.

### Pad animation during live loop

In `voice(id, time)`, if `liveLoop` is active, schedule a `setTimeout` to flash
the matching pad. Use `(time - ctx.currentTime) * 1000` as the delay:

```js
if (liveLoop) {
  const pad = document.querySelector(`.pad[data-track-id="${id}"]`);
  if (pad) {
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      pad.classList.add('hit');
      setTimeout(() => pad.classList.remove('hit'), 80);
    }, delay);
  }
}
```

### UI changes

In the rec-save-state panel (shown after a take is recorded), add a loop button
alongside Save:

```html
<div class="rec-save-row">
  <input id="takes-name-input" ...>
  <button id="takes-save-btn">Save</button>
</div>
<button id="takes-loop-btn">▶ Loop live</button>
```

In the takes list, each saved take gets two icons: `▶ Loop` and `→ Seq` (the
existing load-to-sequencer button).

When a live loop is active, show a small indicator in the pads view — e.g. a
pulsing bar or the loop name — and change `▶ Loop live` to `◼ Stop loop`.

Live loop and the step sequencer can coexist: the step sequencer plays the grid,
the live loop plays the take on top. Or you can stop the sequencer and just run
the live loop. No coordination needed — both feed into the same `masterGain`.

---

## Phase 2 — Queued pattern switching

**What:** While playing, tap a saved pattern and it queues to start on the next
bar downbeat instead of cutting immediately. This is how every hardware groovebox
works — the transition is always clean.

**Why second:** Builds directly on the existing patterns list. No new data format.
The scheduler already tracks bar position.

### State

```js
let pendingPattern = null;  // { name, data } or null
```

### Scheduler hook

The existing `tick()` increments `currentStep`. When `currentStep` wraps to 0
(bar 1 beat 1), check for a pending pattern:

```js
// Inside tick(), after step advance:
if (currentStep === 0 && pendingPattern) {
  applyState(pendingPattern.data);   // existing function — swaps grid state
  buildGrid();                       // rebuild step button UI
  currentStep = 0;                   // applyState may reset this — ensure 0
  pendingPattern = null;
  renderPatternsList();              // clear the 'queued' highlight
}
```

`applyState()` already exists and fully replaces sequencer state. Calling it
mid-play is safe because `tick()` reads `state[id].steps[currentStep]` on each
fire — by the time the next step is scheduled, the new pattern is in place.

### UI

In the patterns list, clicking a pattern while stopped loads immediately (current
behaviour). Clicking while playing sets `pendingPattern` and marks that item:

```js
function loadOrQueuePattern(name) {
  const data = loadPattern(APP_ID, name);
  if (!playing) {
    applyState(data); buildGrid();
  } else {
    pendingPattern = { name, data };
    renderPatternsList();   // re-render to show 'queued' state
  }
}
```

Each pattern item renders with a `queued` class when it matches `pendingPattern?.name`:

```html
<div class="tb-drop-item ${name === pendingPattern?.name ? 'queued' : ''}">
  <span class="queued-arrow">→</span>
  ${name}
</div>
```

```css
.tb-drop-item.queued { color: var(--amber); }
.tb-drop-item .queued-arrow { display: none; }
.tb-drop-item.queued .queued-arrow { display: inline; }
```

A "cancel queue" click on the queued item clears `pendingPattern`.

---

## Phase 3 — Scene launcher

**What:** A third view mode (alongside Sequencer and Pads) showing a grid of
pattern slots. Each slot is a pad-sized button — tap to queue, long-press to
record/overwrite, colour-coded by content. Designed for live sets.

**Why third:** Depends on Phase 2 (queued switching). Once that works, scenes
are just a better UI for the same mechanism.

### Scene format

Scenes are ordinary patterns stored in `core/storage.js` — no new data format.
The scene view is just a different way to browse and launch them.

### Layout

Replace the dropdown patterns list with a 4×4 (or 4×N) grid:

```
[ Intro    ] [ Verse    ] [ Drop     ] [ Outro    ]
[ Groove A ] [ Groove B ] [  empty   ] [  empty   ]
...
```

- **Tap:** queue the pattern (Phase 2 mechanism)
- **Long-press (500ms):** record current sequencer state into that slot (save)
- **Currently playing:** green outline + pulsing dot
- **Queued:** amber outline + arrow indicator
- **Empty:** dashed outline, dimmer

### View switching

Add "Scenes" to the view dropdown alongside Sequencer and Pads. `setMode('scenes')`
shows `#scenes-view` and hides `#seq-view` / `#pads-view`.

```js
function setMode(mode) {
  const isSeq    = mode === 'seq';
  const isPads   = mode === 'pads';
  const isScenes = mode === 'scenes';
  document.getElementById('seq-view').classList.toggle('hidden', !isSeq);
  document.getElementById('pads-view').classList.toggle('active', isPads);
  document.getElementById('scenes-view').classList.toggle('active', isScenes);
  // ... rest of existing setMode logic
}
```

### Scene grid HTML

```html
<div id="scenes-view">
  <div id="scene-grid">
    <!-- 16 slots, populated by renderScenes() -->
  </div>
  <button id="scene-add-btn">＋ Save current as scene</button>
</div>
```

`renderScenes()` reads `listPatterns(APP_ID)` and renders each as a `.scene-slot`.

---

## Phase 4 — Per-track real-time FX

**What:** Persistent filter, reverb send, and volume per track — tweakable while
playing. Enables filter sweeps, mute fades, and live mixing.

**Why last:** Requires the biggest structural change — the voice architecture
needs to go from "ephemeral nodes per hit" to "persistent per-track graph that
each hit feeds into". This is safe to do but touches every voice function.

### Current architecture

```
voice(id, time)
  → creates OscillatorNode, GainNode, etc. (new nodes each hit)
  → connects directly to masterGain
  → nodes auto-GC after they stop
```

### New architecture

```
Persistent per-track:
  perTrackGain[id]     (GainNode — volume)
  perTrackFilter[id]   (BiquadFilterNode — LP filter)
  perTrackSend[id]     (GainNode — reverb send amount)

Per-hit:
  voice(id, time)
  → creates OscillatorNode, BufferSourceNode, etc. (same as now)
  → connects to perTrackGain[id] instead of masterGain
  → perTrackGain → perTrackFilter → masterGain (dry path)
  → perTrackFilter → perTrackSend → reverbBus  (wet path)
```

### Initialisation

In `initAudio()`, after creating `masterGain`:

```js
const TRACK_IDS = ['kick','snare','clap','hihat','openhat','crash',
                   'tomhi','tomlo','rim','shaker','cowbell','clave'];

const perTrackGain   = {};
const perTrackFilter = {};
const perTrackSend   = {};

TRACK_IDS.forEach(id => {
  perTrackGain[id]   = ctx.createGain();
  perTrackFilter[id] = ctx.createBiquadFilter();
  perTrackSend[id]   = ctx.createGain();

  perTrackFilter[id].type = 'lowpass';
  perTrackFilter[id].frequency.value = 20000; // fully open by default
  perTrackSend[id].gain.value = 0.0;          // dry by default

  perTrackGain[id].connect(perTrackFilter[id]);
  perTrackFilter[id].connect(masterGain);
  perTrackFilter[id].connect(perTrackSend[id]);
  perTrackSend[id].connect(reverbConvolver);
});
```

Each `voice(id, time)` function's final `g.connect(masterGain)` becomes
`g.connect(perTrackGain[id])`. The rest of each voice function is unchanged.

### UI

Add a collapsible FX row per track in the sequencer view. Collapsed by default;
tap the track name to expand:

```
[Kick  ]  [steps ....] [mute]
  ↓ (expanded)
  Vol ──────●──── Filter ──────●──── Reverb ●
```

Three knobs or sliders per track. These are small inline range inputs.
Update the persistent nodes in real time:

```js
// Vol slider for track id:
perTrackGain[id].gain.setTargetAtTime(value, ctx.currentTime, 0.02);

// Filter slider (0–1 mapped to 200–20000 Hz exponentially):
const freq = 200 * Math.pow(100, value);
perTrackFilter[id].frequency.setTargetAtTime(freq, ctx.currentTime, 0.02);

// Reverb send:
perTrackSend[id].gain.setTargetAtTime(value, ctx.currentTime, 0.02);
```

### Persistence

Per-track FX values should be saved with the pattern. Extend `captureState()`:

```js
function captureState() {
  return {
    // ... existing state fields ...
    trackFx: Object.fromEntries(TRACK_IDS.map(id => [id, {
      volume: perTrackGain[id].gain.value,
      filter: perTrackFilter[id].frequency.value,
      reverb: perTrackSend[id].gain.value,
    }]))
  };
}
```

`applyState()` restores these values to the persistent nodes.

---

## Implementation order summary

| Phase | Feature | Effort | Depends on |
|-------|---------|--------|------------|
| 1 | Live take looping | ~2–3h | Nothing (pad recording already done) |
| 2 | Queued pattern switching | ~1–2h | Nothing (patterns already saved) |
| 3 | Scene launcher | ~3–4h | Phase 2 |
| 4 | Per-track real-time FX | ~1 day | Nothing, but do last |

Phases 1 and 2 are independent and can be done in either order.

---

## Files to modify

All changes are in `drums/index.html`. No new files needed.

| Change | Location |
|--------|----------|
| `tickLiveLoop()` | Add inside `tick()` |
| `startLiveLoop()` / `stopLiveLoop()` | Alongside `startTransport()` |
| Loop button in rec-save-state | HTML section `#rec-save-state` |
| Takes list `▶ Loop` icon | `renderTakesList()` |
| Pad flash in `voice()` | Each voice function |
| `pendingPattern` state + check in `tick()` | `tick()` function |
| `loadOrQueuePattern()` | Replace direct `applyState()` call in pattern list click |
| Queued styling in pattern list | `renderPatternsList()` + CSS |
| Scene view HTML | New `#scenes-view` div after `#pads-view` |
| `setMode()` scene branch | `setMode()` function |
| `renderScenes()` | New function |
| Per-track node init | `initAudio()` |
| `voice()` re-routing | All 12 voice functions |
| Track FX row HTML | `buildTrackRow()` |
| `captureState()` / `applyState()` FX fields | Both functions |
