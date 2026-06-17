# Drums Share-Link Encoding

The Share button in the Drums app encodes the full pattern state into a URL
hash (`#<base64url>`). This keeps links self-contained with no backend.

## The rule: always version your changes

**If you change the bit layout, you MUST bump `SHARE_VERSION` and add a new
`decodeVN()` function.** Never modify an existing decoder — old shared links
must always decode correctly.

The dispatcher in `decodeState()` reads the 4-bit version first, then calls
the matching decoder. Adding a new version is mechanical:

1. Increment `SHARE_VERSION` in `drums/index.html`
2. Write `decodeV2(read)` mirroring the new layout
3. Add `if (version === 2) return decodeV2(read);` to `decodeState()`
4. Update `encodeState()` to write the new layout
5. Update the "Current layout" comment block in the code and this doc

## Format

Payload is base64url (no `+`, `/`, `=` — URL-safe). Bits are written
most-significant-bit first within each byte.

### Version 1 (current, `SHARE_VERSION = 1`)

Total: 32-bit header + 12 tracks × 71 bits = 884 bits = 111 bytes → ~148 base64url chars.

#### Header (32 bits)

| Field          | Bits | Encoding                          |
|----------------|------|-----------------------------------|
| version        | 4    | `1` (literal)                     |
| bpm            | 7    | `bpm - 60` (range 60–187)         |
| beatsPerBar    | 5    | `beatsPerBar - 1` (range 1–32)    |
| kitIdx         | 2    | index into `KIT_NAMES` array      |
| reserved       | 2    | `0`                               |
| steps          | 7    | `steps - 1` (range 1–128)         |
| reserved       | 5    | `0`                               |

`KIT_NAMES` order is fixed by `Object.keys(KITS)`: `808=0, Acoustic=1, Lo-Fi=2, Electronic=3`.
**Do not reorder KITS** without bumping the version.

#### Per track × 12 (71 bits each, in TRACKS array order)

| Field          | Bits | Encoding                          |
|----------------|------|-----------------------------------|
| muted          | 1    | `1` = muted                       |
| trackLen       | 6    | `0` = follow global, `1–32` = explicit |
| step[0..31]    | 2×32 | see step encoding below           |

**Step encoding (2 bits):**

| Value | Meaning         |
|-------|-----------------|
| `00`  | off             |
| `01`  | on, prob = 100% |
| `10`  | on, prob = 75%  |
| `11`  | on, prob ≤ 50%  |

25% probability is encoded as `11` (same as 50%) — precision lost on round-trip.

**TRACKS order is fixed** by the `TRACKS` array in `drums/index.html`:
kick, snare, clap, hihat, openhat, crash, tomhi, tomlo, rim, shaker, cowbell, clave.
Do not reorder TRACKS without bumping the version.

### Legacy (pre-versioning)

Before versioning was added, the hash was raw JSON → `btoa`. These links decode
correctly because their first decoded byte is `{` (0x7B), which is not a valid
4-bit version prefix. `decodeState()` detects this and falls back to JSON parsing.

## Adding a new field

If you can append it after the existing track data (all decoders stop reading
at the end of their known fields), you may be able to stay on v1 — missing
trailing bits read as 0, which is a safe default for boolean fields. Use
judgment: if 0 is a safe default for your field, appending is fine. If not,
bump the version.

If you change anything that **shifts** existing bit positions, you must bump.
