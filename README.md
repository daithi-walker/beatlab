# BeatLab

A suite of browser-based music tools. No build step, no dependencies — open an HTML file and play.

## Apps

| App | What it is | Status | How to open |
|---|---|---|---|
| [multibank](multibank/) | 16-step drum/synth sequencer | Working | `cd multibank && docker compose up -d` → [localhost:8768](http://localhost:8768) |
| [synth](synth/) | Polyphonic keyboard synth with arp, LFO, effects | In progress | `cd synth && docker compose up -d` → [localhost:8769](http://localhost:8769) |
| [torman](torman/) | Canvas gesture → bass synth — based on [thunder-clapper/torman](https://thunder-clapper.github.io/torman/) | Local only | `cd torman && docker compose up -d` → [localhost:8766](http://localhost:8766) |
| [nectar](nectar/) | Guitar learning suite — scales, chords, tab | Early | `cd nectar && docker compose up -d` → [localhost:8767](http://localhost:8767) |

**Start with multibank** if you want to make a beat immediately. Start with **nectar** if you want to explore guitar theory.

## Architecture

All four apps share the same audio philosophy — one signal chain, different triggers:

```
trigger → oscillator/noise → ADSR → filter → effects → speakers
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the shared patterns, design tokens, and conventions.  
See [docs/](docs/) for Architecture Decision Records (ADRs).

## Running locally

All apps now require a local server to support ES module imports from `core/audio.js`. Each app has its own nginx container:

```bash
cd multibank && docker compose up -d   # http://localhost:8768
cd synth     && docker compose up -d   # http://localhost:8769
cd torman    && docker compose up -d   # http://localhost:8766
cd nectar    && docker compose up -d   # http://localhost:8767
```

Edit any file and refresh — no restart needed.

## Hosting

The repo deploys to GitHub Pages on push to `main` via `.github/workflows/pages.yml`. To activate it: **Settings → Pages → Source → GitHub Actions**.

---

## Roadmap (platform-level)

Features that span all apps, not specific to one instrument.

### Share & collaboration
- **Shareable links** — encode a beat/pattern into a URL (base64 or short ID backed by a simple store) so a user can send a link and the recipient opens it already loaded. No account needed.
- **Beat/pattern library** — curated database of example beats, songs, and patterns users can browse, preview, and load as a starting point. Community-submitted over time.

### Export
- **WAV export** — render the current pattern to a downloadable WAV via `OfflineAudioContext`. Already planned at the app level (Drums); should be a shared primitive.
- **MP3 / AAC export** — encode the rendered audio buffer client-side (WebCodecs API or a small WASM encoder). MP3 for broad compatibility, AAC for Apple ecosystem.
- **MIDI export** — export step patterns as a `.mid` file so the beat can be loaded into a DAW (Ableton, Logic, GarageBand) for further production. The mixing-specific format TJ is thinking of — MIDI preserves note timing and velocity without baking in the synth sound.
- **Stem export** — render each track independently so the recipient can mix levels or swap sounds in their DAW.
