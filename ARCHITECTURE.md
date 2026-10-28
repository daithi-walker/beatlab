# BeatLab Architecture

How the apps are built and what they share. For working rules (what you must and must
not do when changing code) see [`CLAUDE.md`](CLAUDE.md); for what each app does see its
README.

## Principles

| Principle | Why | Record |
|---|---|---|
| **Web Audio API only, no audio library** | Near-zero size, full control of the signal graph, the concepts stay visible | [ADR-002](docs/adr-002-web-audio-api.md) |
| **Synthesis, not samples** | Every sound is generated live; nothing to download | `CLAUDE.md` "No samples" |
| **Native ES modules, no build step** | Edit, refresh, done; GitHub Pages serves the same files | [ADR-007](docs/adr-007-es-modules-and-local-server.md), [ADR-009](docs/adr-009-multi-file-modules.md) |
| **Static hosting** | Push to `main` deploys; no backend | [ADR-005](docs/adr-005-hosting.md) |
| **Reuse before you write** | Shared engines live once; duplicated engines are bugs | `CLAUDE.md` "Reuse before you write" |

Because pages are ES modules they must be served over HTTP (not `file://`); see the
root README for the one-command local server.

## Layers

```
  page (.html)            drums/index.html, nectar/licks.html, ...
     │ imports
  app modules             nectar/licks/*.js, nectar/tab/*.js   (only where a page outgrew one file)
     │
  app shared code         nectar/shared/*.js           (shared by one app's pages)
     │
  core/                   core/*.js                    (shared by several apps)
```

Code goes as low as it is shared: used by one page → in the page; by several pages of
one app → that app's shared folder; by several apps → `core/`. Drums, Multibank and
Synth are single pages with inline modules; Nectar has four pages on a shared core.

## `core/`: shared across apps

| Module | Provides | Used by |
|---|---|---|
| `audio.js` | Note → frequency helpers, reverb impulse (`makeImpulse`), pink/white noise buffers, soft-clip curve (`distCurve`) | Drums, Multibank, Synth, Voice Lab, Nectar |
| `voice.js` | Rich synth voice engine (unison + sub + drive + filter envelope + amp envelope), presets, random patches, patch save/load | Synth, Voice Lab |
| `export.js` | Offline render, WAV, MP3 (via vendored lamejs), MIDI, stored ZIP, download helpers | Drums, Multibank, Voice Lab |
| `storage.js` | Namespaced localStorage (`beatlab:<app>:<name>`), shared volume | Drums, Multibank, Synth; Voice Lab via `voice.js` |
| `topnav.js` | BeatLab logo + app switcher injected into each topbar | Multibank, Synth, Nectar |
| `vendor/lamejs.min.js` | MP3 encoder, the one vendored dependency | Drums, Multibank ([ADR-008](docs/adr-008-lamejs-mp3.md)) |

## `nectar/shared/`: the guitar core

All four Nectar pages draw and play through one core
([ADR-010](docs/adr-010-nectar-shared-guitar-core.md)): `theory.js` (instruments,
tunings, scales; live ES-module bindings for the current instrument/tuning),
`neck.js` (SVG fretboard + strum/tap), `synth.js` (Karplus-Strong strings, amp tones,
legato, paired strings), `player.js` (look-ahead scheduler with swing and grace notes),
`notation.js` + `tab.js` (tab text notation and the SVG tab renderer, with an editable
mode used by the Tab editor) and the topbar control modules. Notes are always `{ string, fret }`, string 1 = top
line of tab. Design of the instrument model: [`docs/nectar-instruments.md`](docs/nectar-instruments.md).

## Audio patterns

### One shape, different triggers

Every app is the same pipeline with a different trigger and sound source:

```
trigger → source → envelope → shaping (drive / filter) → sends (reverb, delay, chorus) → compressor → out
```

| App | Trigger | Source | Timing |
|---|---|---|---|
| Drums | step grid, pads | oscillators + filtered noise per hit | look-ahead, 16th-note grid |
| Multibank | step grid | per-bank oscillators / noise | look-ahead, 16th-note grid |
| Synth / Voice Lab | keys, touch, arpeggiator | `core/voice.js` voices | real-time note on/off (Voice Lab loop: look-ahead) |
| Nectar | neck tap/strum, scale runs, licks | Karplus-Strong string buffers + amp model | real-time, or look-ahead `Player` |

Full signal-chain diagrams are in each app's `features.md`.

### Look-ahead scheduling

Anything timed is scheduled on the audio clock, never with `setTimeout` per note: a
25 ms timer schedules every event due in the next ~100 ms at its exact
`AudioContext` time ([ADR-003](docs/adr-003-lookahead-scheduler.md)). Timing stays
tight when the tab is busy or in the background. UI highlights follow the audio clock
via `requestAnimationFrame`.

### Shared effect buses

Reverb (and in Multibank, delay and chorus) is one shared bus that voices send into,
not one effect per voice ([ADR-004](docs/adr-004-shared-reverb-bus.md)). Reverb
impulses are generated decaying noise (`makeImpulse`), not recorded rooms.

### Envelopes

Web Audio has no ADSR node; envelopes are scheduled gain ramps. Exponential ramps
can't reach zero, so they target 0.001 and the node is stopped just after.

### Offline export

Exports render through an `OfflineAudioContext` built by the same graph-building code
as live playback, so what you export is what you heard (`core/export.js`).

### Mobile and iOS

Audio must be created and resumed inside the first user gesture, re-resumed after
screen lock, and heavy buffers built after the gesture returns. The full checklist is
in `CLAUDE.md` ("Mobile & cross-browser requirements").

## State and persistence

| What | Where |
|---|---|
| Saved patterns, takes, scenes, kit, view | localStorage `beatlab:<app>:...` via `core/storage.js` |
| Master volume (Drums, Multibank, Synth) | `beatlab:settings:volume` |
| Synth / Voice Lab patches | `core/voice.js` (on top of `core/storage.js`) |
| Nectar volume + tone, instrument + tuning, Licks settings | `nectar-audio`, `nectar-instrument`, `nectar-licks` |
| Nectar Tab editor songs and settings (personal, never in the repo) | `nectar-songs`, `nectar-tab` |
| Drums share links | the URL; versioned binary encoding, old links must keep working ([spec](docs/share-encoding.md)) |

There is no server-side state.

## UI and design

Two visual systems:

| | Used by | Look |
|---|---|---|
| BeatLab | home page, Drums, Multibank, Synth, Voice Lab | near-black blue-green, teal/green/amber/purple accents, Space Grotesk, hardware-panel feel |
| Nectar | all Nectar pages | near-black, amber roots, gold "playing" highlight, rosewood neck, Inter |

Shared interaction conventions: pointer events with `setPointerCapture` for drags,
`touch-action: none` on drag surfaces, ≥44 px touch targets, Space to play/stop, a
topbar with the BeatLab app switcher (`core/topnav.js`).

## Testing

- **Nectar:** `nectar/tests/smoke.py` (Playwright) drives every page in headless Chromium and records the notes the synth plays. Run it after touching `nectar/`.
- **Other apps:** manual testing in the browser (desktop + phone).

## Decision records

| ADR | Decision | Status |
|---|---|---|
| [001](docs/adr-001-single-file-html.md) | Single-file HTML apps | Superseded by 007 |
| [002](docs/adr-002-web-audio-api.md) | Raw Web Audio API, no audio library | Accepted |
| [003](docs/adr-003-lookahead-scheduler.md) | Look-ahead scheduler for sequenced audio | Accepted |
| [004](docs/adr-004-shared-reverb-bus.md) | Shared convolution reverb bus | Accepted |
| [005](docs/adr-005-hosting.md) | Host on GitHub Pages | Accepted |
| [006](docs/adr-006-torman-refactor.md) | Torman: split its single-file HTML | Accepted |
| [007](docs/adr-007-es-modules-and-local-server.md) | ES modules + local server | Accepted |
| [008](docs/adr-008-lamejs-mp3.md) | Vendored lamejs for MP3 export | Accepted |
| [009](docs/adr-009-multi-file-modules.md) | Multi-file modules per page, still no build | Accepted |
| [010](docs/adr-010-nectar-shared-guitar-core.md) | Nectar shared guitar core | Accepted |
