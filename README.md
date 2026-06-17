# BeatLab

A suite of browser-based music tools. No build step, no dependencies — open an HTML file and play.

## Apps

| App | What it is | Status |
|---|---|---|
| [Drums](drums/) | 12-track TR-style drum machine with pads, kits, polymeter, Euclidean fills | Working |
| [Multibank](multibank/) | Multi-voice step sequencer with per-channel sound shaping | Working |
| [Nectar](nectar/) | Guitar theory suite — scales, chords, chord identifier | Early |
| [Synth](synth/) | Polyphonic keyboard synth with arp, LFO, ADSR, XY pad | In progress |

Live at **[daithi-walker.github.io/beatlab](https://daithi-walker.github.io/beatlab)**

## Documentation

| Doc | What it covers |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`CLAUDE.md`](CLAUDE.md) | Agent instructions — read before making changes |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Prioritised feature backlog for all apps |
| [`docs/share-encoding.md`](docs/share-encoding.md) | Drums share-link binary encoding spec |
| [`docs/adr-*.md`](docs/) | Architecture Decision Records |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Signal chain, shared patterns, design tokens |
| [`drums/features.md`](drums/features.md) | Drums feature reference |
| [`nectar/FEATURES.md`](nectar/FEATURES.md) | Nectar feature reference |
| [`nectar/ROADMAP.md`](nectar/ROADMAP.md) | Nectar detailed options (sound, tab viewer, theory chat) |

## Running locally

Each app has its own nginx container:

```bash
cd drums    && docker compose up -d   # http://localhost:8770
cd multibank && docker compose up -d  # http://localhost:8768
cd synth    && docker compose up -d   # http://localhost:8769
cd nectar   && docker compose up -d   # http://localhost:8767
```

Edit any file and refresh — no restart needed.

## Architecture

All apps share the same audio philosophy — one signal chain, different triggers:

```
trigger → oscillator/noise → ADSR → filter → effects → speakers
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for shared patterns and conventions.

## Hosting

Deploys to GitHub Pages on push to `main` via `.github/workflows/pages.yml`.
