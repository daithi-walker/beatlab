"""Nectar smoke test: drives every Nectar page in headless Chromium and checks the shared
guitar core (neck, synth, player, audio-ui) still behaves. Records every note the synth plays.

  pip install playwright && playwright install chromium     # one-time
  cd nectar && docker compose up -d                          # serves http://localhost:8767
  python3 nectar/tests/smoke.py [base_url]

Exit code 1 on any failure.
"""
import asyncio, sys
from playwright.async_api import async_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8767/nectar/").rstrip("/") + "/"
SPY = """async () => {
  const m = await import('/nectar/shared/synth.js');
  if (m.GuitarSynth.prototype.__spied) return;
  const orig = m.GuitarSynth.prototype.pluck;
  window.__plucks = [];
  m.GuitarSynth.prototype.pluck = function (bus, note, ...r) { window.__plucks.push(note.string + ':' + note.fret); return orig.call(this, bus, note, ...r); };
  m.GuitarSynth.prototype.__spied = true;
}"""
# screen coords of every (string, fret), asked from the page's Neck
POS = """() => {
  const svg = document.querySelector('svg.nk'), neck = svg.neck, ctm = svg.getScreenCTM(), out = {};
  for (let s = 1; s <= 6; s++) for (let f = 0; f <= neck.frets; f++) {
    const p = svg.createSVGPoint(); p.x = neck.noteX(f); p.y = neck.stringY(s); const q = p.matrixTransform(ctm);
    out[s + ':' + f] = [q.x, q.y];
  }
  return out;
}"""
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width": 1440, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(f"{pg.url.split('/')[-1]}: {e}"))
        pg.on("console", lambda m: errs.append(f"{pg.url.split('/')[-1]}: {m.text}") if m.type == "error" else None)
        pg.on("requestfailed", lambda r: errs.append(f"failed {r.url}"))
        await pg.goto(BASE + "index.html"); await pg.evaluate("localStorage.clear()")

        # ---------------- Scales
        await pg.goto(BASE + "index.html"); await pg.wait_for_timeout(400); await pg.evaluate(SPY)
        pos = await pg.evaluate(POS)
        n_scale = await pg.evaluate("document.querySelectorAll('.layer-scale > g').length")
        check("scales: A minor pentatonic dots drawn", n_scale == 55, f"{n_scale} dots")
        x, y = pos["1:5"]; await pg.mouse.click(x, y); await pg.wait_for_timeout(150)
        pl = await pg.evaluate("window.__plucks.slice()")
        check("scales: tap plays that note", pl == ["1:5"], str(pl))
        check("scales: tap highlights note", await pg.evaluate("document.querySelectorAll('.layer-active circle').length") >= 1)
        await pg.evaluate("window.__plucks.length = 0")
        x1, y1 = pos["1:7"]; x6, y6 = pos["6:7"]
        await pg.mouse.move(x1, y1); await pg.mouse.down()
        for k in range(1, 21): await pg.mouse.move(x1, y1 + (y6 - y1) * k / 20)
        await pg.mouse.up(); await pg.wait_for_timeout(100)
        pl = await pg.evaluate("window.__plucks.slice()")
        check("scales: drag strums all 6 strings in order", pl == [f"{s}:7" for s in range(1, 7)], str(pl))
        await pg.click("#box-check")
        dim = await pg.evaluate("[...document.querySelectorAll('.layer-scale > g')].filter(g => g.getAttribute('opacity') === '0.12').length")
        check("scales: box mode dims notes outside the box", dim > 0, f"{dim} dimmed")
        await pg.evaluate("window.__plucks.length = 0")
        await pg.click("#play-btn"); await pg.wait_for_timeout(2500)
        pl = await pg.evaluate("window.__plucks.slice()")
        check("scales: Play runs box scale from 6:5", pl[:4] == ["6:5", "6:8", "5:5", "5:7"], str(pl[:6]))
        check("scales: button shows Stop while playing", "Stop" in await pg.text_content("#play-btn"))
        await pg.click("#play-btn"); await pg.wait_for_timeout(200)
        check("scales: Stop resets button", "Play" in await pg.text_content("#play-btn"))
        await pg.select_option("#root-select", "4")  # E
        r = await pg.evaluate("[...document.querySelectorAll('.layer-scale > g circle')].filter(c => c.getAttribute('fill') === '#ff9d3d').length")
        check("scales: changing root redraws roots", r > 0, f"{r} E roots")

        # ---------------- Chords
        await pg.goto(BASE + "chords.html"); await pg.wait_for_timeout(400); await pg.evaluate(SPY)
        voicing = await pg.evaluate("""() => [...document.querySelectorAll('.layer-main > g')].map(g => g.querySelector('text').textContent)""")
        check("chords: A major E-shape = R 5 R 3 5 R", voicing == ["R", "5", "R", "3", "5", "R"], str(voicing))
        await pg.evaluate("window.__plucks.length = 0")
        await pg.click("#play-btn"); await pg.wait_for_timeout(600)
        pl = await pg.evaluate("window.__plucks.slice()")
        check("chords: Play strums 6:5 5:7 4:7 3:6 2:5 1:5", pl == ["6:5", "5:7", "4:7", "3:6", "2:5", "1:5"], str(pl))
        await pg.click("#btn-a")
        muted = await pg.evaluate("document.querySelectorAll('.layer-mute .mute').length")
        check("chords: A-shape mutes low E", muted == 1, f"{muted} muted")
        await pg.select_option("#chord-select", "min7")
        lbl = await pg.evaluate("document.getElementById('chord-title').textContent")
        check("chords: card updates (Am7)", lbl.startswith("Am7"), lbl)
        pos = await pg.evaluate(POS)
        await pg.evaluate("window.__plucks.length = 0")
        x, y = pos["3:9"]; await pg.mouse.click(x, y); await pg.wait_for_timeout(100)
        check("chords: tapping neck plays note", await pg.evaluate("window.__plucks.slice()") == ["3:9"])

        # ---------------- Identify
        await pg.goto(BASE + "identify.html"); await pg.wait_for_timeout(400); await pg.evaluate(SPY)
        pos = await pg.evaluate(POS)
        for k in ["5:0", "4:2", "3:2", "2:1", "1:0"]:
            x, y = pos[k]; await pg.mouse.click(x, y); await pg.wait_for_timeout(60)
        sym = await pg.text_content("#match-symbol")
        check("identify: x02210 identified as Am", sym == "Am", sym)
        check("identify: each tap played its note", await pg.evaluate("window.__plucks.slice()") == ["5:0", "4:2", "3:2", "2:1", "1:0"])
        x, y = pos["2:3"]; await pg.mouse.click(x, y); await pg.wait_for_timeout(60)
        sel = await pg.evaluate("document.querySelectorAll('.layer-main > g').length")
        check("identify: one note per string (2:3 replaces 2:1)", sel == 5, f"{sel} selected")
        x, y = pos["2:3"]; await pg.mouse.click(x, y); await pg.wait_for_timeout(60)
        check("identify: tapping a selected note removes it", await pg.evaluate("document.querySelectorAll('.layer-main > g').length") == 4)
        await pg.keyboard.press("Escape")
        check("identify: Escape clears", await pg.evaluate("document.querySelectorAll('.layer-main > g').length") == 0)

        # ---------------- tone + volume shared across pages
        await pg.select_option("#tone-select", "rock")
        await pg.goto(BASE + "licks.html"); await pg.wait_for_timeout(400)
        check("audio: tone choice carries across pages", await pg.input_value("#tone-select") == "rock")

        # ---------------- Licks
        await pg.evaluate(SPY)
        await pg.click("#play"); await pg.wait_for_timeout(4500)
        pl = await pg.evaluate("window.__plucks.slice()")
        check("licks: Play plays box-1 run after count-in", pl[:3] == ["6:5", "6:8", "5:5"], str(pl[:5]))
        check("licks: active + next notes shown", await pg.evaluate("document.querySelectorAll('.layer-active circle, .layer-next circle').length") >= 2)
        await pg.click("#play")
        n = await pg.evaluate("() => { let c = 0; for (const b of document.querySelectorAll('.lick-item')) { b.click(); c++; } return c; }")
        check("licks: all licks render", n == 13)

        await pg.evaluate("localStorage.clear()")
        check("no console/page errors", not errs, "; ".join(errs[:5]))
        await b.close()
    fails = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(fails)}/{len(results)} passed")
    return 1 if fails else 0

sys.exit(asyncio.run(main()))
