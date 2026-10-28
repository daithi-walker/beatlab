# BeatLab

A suite of browser-based music tools: drum machines, sequencers, a synth and a guitar
learning suite. Everything is synthesised live with the Web Audio API. There are no
audio samples, no framework and no build step: plain HTML, CSS and native ES modules.

**Live:** [daithi-walker.github.io/beatlab](https://daithi-walker.github.io/beatlab)

## Apps

| App | What it is | Docs |
|---|---|---|
| [Drums](drums/) | 12-track TR-style drum machine: step sequencer and tappable pads, 4 kits, swing, velocity, polymeter, live take recording, scenes, WAV/MP3/MIDI/stem export | [README](drums/README.md) |
| [Multibank](multibank/) | Multi-voice step sequencer: add drum and synth banks, shape each with its own FX, export | [README](multibank/README.md) |
| [Synth](synth/) | Polyphonic keyboard synth with arpeggiator, LFO, ADSR and XY filter pad, plus the **Voice Lab** for designing patches | [README](synth/README.md) |
| [Nectar](nectar/) | Guitar learning suite: scales, chords, chord identifier, a lick trainer and a tab editor, for guitar, bass, ukulele, mandolin and more, in any tuning | [README](nectar/README.md) |
| Torman | Canvas-gesture bass synth by [thunder-clapper](https://github.com/thunder-clapper), included as a git submodule with local tweaks. Not deployed; [upstream site](https://thunder-clapper.github.io/torman/) | [FEATURES](torman/FEATURES.md) |

## Run it locally

ES modules don't load from `file://`, so serve the repo over HTTP:

```bash
docker compose up -d          # from the repo root
open http://localhost:8765    # home page; every app is a link from there
```

One nginx container serves the whole repo, with `Cache-Control: no-cache` so a normal
refresh always picks up edited files. Edit and refresh; no restart needed. It listens
on 127.0.0.1 only, because Nectar's Tab editor saves your songs into the git-ignored
`nectar/my-tabs/` folder through it.

No Docker? Any static server from the repo root works, e.g. `python3 -m http.server 8765`.

## Repo map

```
index.html         home page linking every app
core/              shared across apps: audio primitives, voice engine, export, storage, topnav
drums/  multibank/  synth/  nectar/   one folder per app (each has a README)
nectar/shared/     Nectar's guitar core: theory, neck, synth, player (all Nectar pages use it)
torman/            git submodule (upstream project, local only)
docs/              ADRs, backlog, design docs
```

## Documentation

| Doc | What it covers |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the apps are built: modules, `core/`, audio patterns, design systems |
| [`CLAUDE.md`](CLAUDE.md) | Working rules for contributors and AI agents. Read before changing code |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Prioritised backlog for all apps |
| [`docs/adr-*.md`](docs/) | Architecture Decision Records (indexed in `ARCHITECTURE.md`) |
| [`docs/share-encoding.md`](docs/share-encoding.md) | Drums share-link binary format |
| [`docs/groovebox.md`](docs/groovebox.md) | Drums groovebox design: live looping, queued switching, scenes |
| [`docs/nectar-instruments.md`](docs/nectar-instruments.md) | Nectar instruments and tunings: design and roadmap |
| `<app>/features.md` | Detailed feature reference for each app |

## Testing

Nectar has a browser smoke test that drives every page and checks the notes the synth
actually plays:

```bash
pip install playwright && playwright install chromium   # one-time
python3 nectar/tests/smoke.py                           # needs the local server running
```

## Hosting

Every push to `main` deploys to GitHub Pages via
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) (Torman is excluded).
