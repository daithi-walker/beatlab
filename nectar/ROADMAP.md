# Nectar — Future Features

Ideas and options explored but not yet implemented.

---

## Sound Generation

### Current: Karplus-Strong synthesis

All notes are produced by an inline AudioWorklet. A delay buffer is filled with noise and fed back through a low-pass filter; the buffer length encodes frequency, the filter coefficient controls damping. No sample files. Zero latency. Sounds like a generic plucked string — passable but not strongly differentiated by instrument type.

Per-string damping values (0.493–0.498) give marginally different decay rates. Pluck width controls the attack brightness.

### Option 1 — Tune the KS parameters (low effort, limited gain)

Add a post-synthesis EQ chain: a low-shelf boost for warmth (acoustic/classical), a slight high-pass and overdrive gain stage for electric, a de-emphasis of upper partials for nylon. All achievable with `BiquadFilterNode` chains after the worklet output. No new dependencies.

Ceiling: it will always sound "KS-ish." Convincing acoustic/electric differentiation requires samples.

### Option 2 — SoundFont2 samples via AlphaTab/alphaSynth (high quality, larger download)

AlphaTab bundles **alphaSynth**, a Web Audio SF2 synthesizer. The default soundfont is Sonivox (Android General MIDI, ~4 MB). Loading this gives real sampled nylon, steel, and electric guitar sounds with correct velocity layering and release tails.

AlphaTab is MPL-2.0. Loading via CDN script tag works without a build step.

Tradeoff: adds ~5–15 MB total (JS + font + SF2), requires fetching the soundfont at runtime, and Firefox has a cross-origin Web Worker restriction for local `file://` use.

### Option 3 — Lightweight custom sampler (medium effort, controlled size)

Record or source a small set of guitar notes (e.g., one note per 3 frets, 2–3 strings) as short MP3s, load them as `AudioBufferSourceNode`, pitch-shift with `playbackRate` for adjacent notes. Called "sample stretching." Realistic quality for the recorded notes; slight artefacts at ±4+ semitones. Full control over bundle size by choosing sample density.

Libraries like Tone.js `Sampler` handle the pitch-mapping and crossfade logic, though Tone.js itself is ~50 kB gzipped.

### Option 4 — Physical modelling beyond KS (research-grade, high effort)

Extend the AudioWorklet with:
- **Body resonance:** a `ConvolverNode` with a guitar body impulse response (a short IR file, typically ~50 kB). Gives acoustic warmth without full sample sets.
- **String stiffness:** modify the KS filter to simulate inharmonicity, separating nylon from steel tone.
- **Pluck position:** vary which harmonic partials are excited based on where along the string the pluck is simulated.

This stays fully algorithmic with no SF2 dependency but requires careful tuning and still won't match sampled quality.

---

## Tab Viewer (Ultimate Guitar-style)

### What it is

A scrolling multi-track display rendering guitar tablature (and optionally standard notation) with a playback cursor, sourced from Guitar Pro files or hand-authored text.

### AlphaTab — recommended library

**Repo:** `CoderLine/alphaTab` · MPL-2.0 · ~1,700 stars · actively maintained (v1.8.3, May 2026)

**What it does:**
- Renders tab and standard notation simultaneously or independently
- Reads GP3, GP4, GP5, GPX (GP6), GP7/GP8 files — the full Guitar Pro family
- Built-in audio playback via **alphaSynth** (SF2-based, Web Audio + Web Worker)
- Scrolling cursor sync, tempo control, loop regions
- Full guitar technique rendering: bends, slides, vibrato, hammer-ons, palm mutes, harmonics, tap, slap/pop

**Integration:**
```html
<script src="https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js"></script>
<div id="tab"></div>
<script>
  const api = new alphaTab.AlphaTabApi(document.getElementById('tab'), {
    core: { useWorkers: true },
    player: { enablePlayer: true, soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/soundfont/sonivox.sf2' }
  });
  api.load('/path/to/song.gp5');
</script>
```

Works in Chrome/Safari/Edge from a local `file://` or simple HTTP server. Firefox requires `useWorkers: false` for local use (degrades to synchronous render, still works).

**Gotchas:**
- Soundfont fetches ~4 MB at runtime — must be served, not inlined (or embed as base64 for offline use at the cost of file size)
- Bundler projects (Webpack/Vite) need the AlphaTab plugin for Web Worker URLs
- MPL-2.0: modifications to AlphaTab's own files must be MPL-2.0, but combining with other code in a larger product is fine

### AlphaTex — hand-authored tab format

AlphaTab's own text format. Human-readable, easy to author programmatically.

```
\title "Riff"
\tempo 120
.
:8 5.6 7.6 5.5 7.5 | 5.4 7.4 5.3 7.3 |
```

Syntax: `fret.string`, `:N` sets duration, `{h}` = hammer-on, `{b (0 4)}` = bend, `{v}` = vibrato, `|` = bar line. Clean enough to write by hand for simple riffs; programmatic generation is trivial.

Could serve as a "write a riff" input format in-app without needing GP files.

### VexFlow — render-only alternative

MIT · ~5,600 stars · updated March 2026

Renders tab and notation to Canvas/SVG. No GP parser, no audio. Input is programmatic (JavaScript API) or VexTab text format. Suitable if you want a lightweight render-only tab display and will handle the data pipeline yourself. Not competitive for a GP-file-based player.

### Guitar Pro file format

GP5 and earlier are binary proprietary. GP6+ (`.gpx`, `.gp`) are ZIP archives containing XML. Per-note data includes: fret, string, duration, articulations (bends, slides, vibrato, harmonics, palm mute, etc.), dynamics, chord names.

No complete standalone JS parser exists outside AlphaTab. The only option for raw GP data access in JavaScript is to load via AlphaTab and traverse the `alphaTab.model.Score` object tree.

### Implementation path when ready

1. Add AlphaTab via CDN script tag (no build step needed)
2. Add a song library — either a curated set of `.gp5` files or alphaTex strings for key songs
3. Wire a song picker UI to `api.load()`
4. Style the AlphaTab container to match Nectar's dark theme via AlphaTab's CSS variables
5. Optionally overlay the fretboard renderer to highlight the currently playing note in context

---

## Music Theory Chat

A floating chat panel (bottom-right button, slide-up drawer) on every page backed by Claude via a small backend proxy.

**Why a proxy is needed:** The Anthropic API blocks direct browser calls (CORS). A tiny Node.js Express service (~25 lines) added as a second Docker service on port 8768 reads `ANTHROPIC_API_KEY` from the environment and forwards requests. The key never touches the browser.

**Context injection:** Each chat request automatically includes current app state — which page, selected scale/root, chord, or identified notes — so questions like "why does this scale work over blues?" get grounded answers without the user having to explain what they're looking at.

**System prompt:** Claude acts as a music theory teacher specialised in guitar. Concise, practical, fretboard-first explanations.

**Implementation path:**
1. Add `api/` folder with `package.json` (express + @anthropic-ai/sdk) and `server.js` (single `/chat` POST endpoint)
2. Add `nectar-api` service to `docker-compose.yml` (Node 20 Alpine, port 8768, env `ANTHROPIC_API_KEY`)
3. Add shared `chat-panel.js` included on all pages — floating button, message thread, input, context serialiser

---

## Other Ideas

- **Loop region** — select a fret range or scale segment and loop just those notes for practice
- **Metronome** — audible click track independent of scale playback
- **MIDI output** — emit MIDI events so an external synth/DAW can use Nectar as a controller
- **Mobile layout** — vertical scrollable neck, touch-optimised note circles, haptic feedback on pluck
- **Enharmonic spelling** — respell note names using correct accidentals for the detected key (G# in E major, Ab in F minor)
