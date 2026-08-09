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

### Version 3 (current, `SHARE_VERSION = 3`)

Total: 32-bit header + 12 tracks × 167 bits = 2036 bits = 255 bytes → ~340 base64url chars.

Identical header to v2. The per-step field grows from 2 bits to **5 bits** to carry
**per-step velocity** and to record probability losslessly (v1/v2 collapsed 25%→50%).
v1/v2 links still decode via their own decoders (velocity reads as Full).

#### Header (32 bits) — same as v2

| Field          | Bits | Encoding                          |
|----------------|------|-----------------------------------|
| version        | 4    | `3` (literal)                     |
| bpm            | 7    | `bpm - 60` (range 60–187)         |
| beatsPerBar    | 5    | `beatsPerBar - 1` (range 1–32)    |
| kitIdx         | 2    | index into `KIT_NAMES` array      |
| reserved       | 2    | `0`                               |
| steps          | 7    | `steps - 1` (range 1–128)         |
| swing          | 5    | `round(swing × 50)` — swing is a 0–0.6 fraction (0–30 stored) |

`KIT_NAMES` order is fixed by `Object.keys(KITS)`: `808=0, Acoustic=1, Lo-Fi=2, Electronic=3`.
**Do not reorder KITS** without bumping the version.

#### Per track × 12 (167 bits each, in TRACKS array order)

| Field          | Bits | Encoding                          |
|----------------|------|-----------------------------------|
| muted          | 1    | `1` = muted                       |
| trackLen       | 6    | `0` = follow global, `1–32` = explicit |
| step[0..31]    | 5×32 | see v3 step encoding below         |

**v3 step encoding (5 bits): `[on:1][probIdx:2][velIdx:2]`**

| Sub-field | Bits | Values |
|-----------|------|--------|
| on        | 1    | `1` = active |
| probIdx   | 2    | `0`=100% `1`=75% `2`=50% `3`=25% (lossless) |
| velIdx    | 2    | `0`=Ghost(40) `1`=Soft(70) `2`=Full(100) `3`=Accent(130) |

When `on = 0`, probIdx/velIdx are written `0` and ignored on decode (prob/vel default
to Full).

### Version 2 (`SHARE_VERSION = 2`)

32-bit header + 12 tracks × 71 bits → ~148 base64url chars. Same header as v3, but
each step was a 2-bit field and there was no velocity. `decodeV2` remains unchanged.

### Version 1 (`SHARE_VERSION = 1`)

Same layout as v2 but the trailing 5 header bits were reserved (`0`) instead of swing.
`decodeV1` remains in the code unchanged so old links keep working.

**v1/v2 step encoding (2 bits):**

| Value | Meaning         |
|-------|-----------------|
| `00`  | off             |
| `01`  | on, prob = 100% |
| `10`  | on, prob = 75%  |
| `11`  | on, prob ≤ 50%  |

In v1/v2, 25% probability was encoded as `11` (same as 50%) — precision lost on
round-trip. v3 fixes this with a dedicated probIdx.

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
