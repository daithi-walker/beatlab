# Nectar

A guitar music theory explorer. Three self-contained tools built on a shared fretboard engine with Karplus-Strong string synthesis.

## Pages

| Page | URL | Purpose |
|---|---|---|
| Scale Explorer | `/` | Visualise scales on the neck, play sequences, learn by feel |
| Chord Explorer | `/chords.html` | Show chord voicings with interval colours, strum to hear |
| Chord Identifier | `/identify.html` | Select notes, identify the chord, build a progression |
| Tab Viewer | `/tab.html` | AlphaTab POC — rendered notation + audio playback |

## Running locally

```bash
cd nectar/
docker compose up -d
# open http://localhost:8767
docker compose down
```

nginx serves the directory — edit any file and refresh, no restart needed.

## Features

See [FEATURES.md](FEATURES.md) for a full list of what's built.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features including sound generation options, tab viewer, and music theory chat.

## Tech

- Vanilla JS, Canvas 2D, Web Audio API — no build step, no dependencies
- Karplus-Strong synthesis in an AudioWorklet (inline blob, no sample files)
- Chord identification from interval rules — 33 chord types across triads, 7ths, extended and altered chords
- AlphaTab (CDN, MPL-2.0) for the tab viewer
