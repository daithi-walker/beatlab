"""Nectar smoke test: drives every Nectar page in headless Chromium and checks the shared
guitar core (neck, synth, player, audio-ui) still behaves. Records every note the synth plays.

  pip install playwright && playwright install chromium     # one-time
  docker compose up -d                                       # repo root; serves http://localhost:8765
  python3 nectar/tests/smoke.py [base_url]

Exit code 1 on any failure.
"""
import asyncio, sys
from playwright.async_api import async_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/nectar/").rstrip("/") + "/"
SPY = """async () => {
  const m = await import('/nectar/shared/synth.js');
  const t = await import('/nectar/shared/theory.js');
  if (m.GuitarSynth.prototype.__spied) return;
  const orig = m.GuitarSynth.prototype.pluck;
  window.__plucks = []; window.__midis = []; window.__times = [];
  m.GuitarSynth.prototype.pluck = function (bus, note, ...r) {
    window.__plucks.push(note.string + ':' + note.fret); window.__midis.push(t.midiOf(note)); window.__times.push(r[0]);
    return orig.call(this, bus, note, ...r);
  };
  m.GuitarSynth.prototype.__spied = true;
}"""
# screen coords of every (string, fret), asked from the page's Neck
POS = """() => {
  const svg = document.querySelector('svg.nk'), neck = svg.neck, ctm = svg.getScreenCTM(), out = {};
  for (let s = 1; s <= svg.querySelectorAll('.sname').length; s++) for (let f = 0; f <= neck.frets; f++) {
    const p = svg.createSVGPoint(); p.x = neck.noteX(f); p.y = neck.stringY(s); const q = p.matrixTransform(ctm);
    out[s + ':' + f] = [q.x, q.y];
  }
  return out;
}"""
LEGATO = """async () => {
  const { GuitarSynth } = await import('/nectar/shared/synth.js');
  const t = await import('/nectar/shared/theory.js');
  t.setInstrument('guitar');
  async function render(seq) {
    const s = new GuitarSynth(); s.setTone('acoustic');
    const real = window.AudioContext;
    window.AudioContext = function () { return new OfflineAudioContext(1, 48000, 48000); };
    OfflineAudioContext.prototype.resume = () => Promise.resolve();
    s.ensure(); window.AudioContext = real;
    await new Promise(r => setTimeout(r, 50));
    const bus = s.newBus();
    for (const [fret, tech, at] of seq) { s.pluck(bus, { string: 3, fret, tech, bend: 0, vibrato: false }, at, 0.3); }
    return (await s.ctx.startRendering()).getChannelData(0);
  }
  // peak in the 12 ms after `at` divided by peak in the 12 ms before
  const jump = (d, at) => { const i = Math.floor(at * 48000), w = 576; let a = 0, b = 0;
    for (let k = 0; k < w; k++) { b = Math.max(b, Math.abs(d[i - w + k])); a = Math.max(a, Math.abs(d[i + k])); } return (a / b).toFixed(2); };
  const leg = await render([[5, null, 0.05], [7, 'h', 0.35]]);
  const pick = await render([[5, null, 0.05], [7, null, 0.35]]);
  return [+jump(leg, 0.35), +jump(pick, 0.35)];
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

        # ---------------- Tunings (Scales)
        await pg.select_option("#tuning-select", "dropD"); await pg.wait_for_timeout(100)
        check("tuning: drop D relabels strings", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')") == "EBGDAD", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')"))
        await pg.evaluate("window.__plucks.length = 0; window.__midis.length = 0")
        pos = await pg.evaluate(POS); x, y = pos["6:0"]; await pg.mouse.click(x, y); await pg.wait_for_timeout(100)
        check("tuning: drop D open 6th string plays D2 (MIDI 38)", await pg.evaluate("window.__midis.slice()") == [38], str(await pg.evaluate("window.__midis.slice()")))
        await pg.select_option("#tuning-select", "dadgad"); await pg.wait_for_timeout(100)
        check("tuning: DADGAD labels (top string lowercase)", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')") == "dAGDAD", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')"))
        await pg.goto(BASE + "chords.html"); await pg.wait_for_timeout(300)
        check("tuning: chord shapes relabelled outside standard", await pg.text_content("#btn-e") == "Root on D", await pg.text_content("#btn-e"))
        await pg.select_option("#tuning-select", "standard"); await pg.wait_for_timeout(100)

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

        # ---------------- Instruments
        await pg.goto(BASE + "index.html"); await pg.wait_for_timeout(300); await pg.evaluate(SPY)
        await pg.select_option("#instrument-select", "bass"); await pg.wait_for_timeout(100)
        check("instrument: bass draws 4 strings G D A E", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')") == "GDAE", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')"))
        check("instrument: bass neck has 20 frets", await pg.evaluate("document.querySelectorAll('svg.nk .fnum').length") == 20)
        opts = await pg.evaluate("[...document.querySelectorAll('#tuning-select option')].map(o => o.value)")
        check("instrument: tuning list follows instrument", opts == ["standard", "dropD"], str(opts))
        await pg.evaluate("window.__midis.length = 0")
        pos = await pg.evaluate(POS); x, y = pos["4:0"]; await pg.mouse.click(x, y); await pg.wait_for_timeout(100)
        check("instrument: bass open E plays E1 (MIDI 28)", await pg.evaluate("window.__midis.slice()") == [28], str(await pg.evaluate("window.__midis.slice()")))
        await pg.select_option("#instrument-select", "guitar7"); await pg.wait_for_timeout(100)
        check("instrument: 7-string labels e B G D A E B", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')") == "eBGDAEB", await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')"))
        await pg.select_option("#instrument-select", "guitar12"); await pg.wait_for_timeout(100)
        n_lines = await pg.evaluate("document.querySelectorAll('svg.nk .string').length")
        check("instrument: 12-string draws 6 paired courses (12 lines)", n_lines == 12 and await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')") == "eBGDAE", f"{n_lines} lines")
        await pg.select_option("#instrument-select", "mandolin"); await pg.wait_for_timeout(100)
        check("instrument: mandolin draws 4 paired courses (8 lines)", await pg.evaluate("document.querySelectorAll('svg.nk .string').length") == 8)
        await pg.select_option("#instrument-select", "ukulele"); await pg.wait_for_timeout(100)
        check("instrument: ukulele labels A E C G, 15 frets", [await pg.evaluate("[...document.querySelectorAll('svg.nk .sname')].map(t => t.textContent).join('')"), await pg.evaluate("document.querySelectorAll('svg.nk .fnum').length")] == ["AECG", 15])
        await pg.goto(BASE + "chords.html"); await pg.wait_for_timeout(300)
        check("instrument: carries across pages", await pg.input_value("#instrument-select") == "ukulele")
        await pg.select_option("#root-select", "0"); await pg.wait_for_timeout(100)
        n_voiced = await pg.evaluate("document.querySelectorAll('.layer-main > g').length")
        check("instrument: ukulele C chord voiced, shapes relabelled", n_voiced >= 3 and await pg.text_content("#btn-e") == "Root on C", f"{n_voiced} notes, {await pg.text_content('#btn-e')}")
        await pg.goto(BASE + "identify.html"); await pg.wait_for_timeout(300)
        pos = await pg.evaluate(POS)
        for k in ["4:0", "3:0", "2:0", "1:3"]:
            x, y = pos[k]; await pg.mouse.click(x, y); await pg.wait_for_timeout(40)
        check("instrument: ukulele 0003 identified as C", await pg.text_content("#match-symbol") == "C", await pg.text_content("#match-symbol"))
        await pg.select_option("#instrument-select", "guitar"); await pg.wait_for_timeout(100)

        # ---------------- legato: a hammer-on continues the ringing note, it doesn't re-pick
        ham, pick = await pg.evaluate(LEGATO)
        check("synth: hammer-on has no new pick attack", ham < 1.5 < pick, f"attack jump hammer {ham} vs pick {pick}")

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
        check("licks: library shows the guitar licks", n == 16, f"{n} licks")
        check("licks: instrument select is usable, tuning is set by the lick",
              await pg.evaluate("[document.querySelector('#instrument-select').disabled, document.querySelector('#tuning-select').disabled]") == [False, True])

        # lick tunings: the Licks page follows the lick's tuning without changing the saved one
        # grace notes: "4-2:g h4-4:q" sounds 4-2 on the beat and 4-4 ~200 ms later
        await pg.click("button.lick-item[data-id='major-pent-country']"); await pg.wait_for_timeout(200)
        await pg.evaluate(SPY); await pg.evaluate("window.__plucks.length = 0; window.__times.length = 0")
        await pg.click("#play"); await pg.wait_for_timeout(3700); await pg.click("#play")
        gap = await pg.evaluate("(() => { const p = window.__plucks, t = window.__times, i = p.indexOf('4:2'); return i >= 0 && p[i + 1] === '4:4' ? Math.round((t[i + 1] - t[i]) * 1000) : null; })()")
        check("licks: grace note sounds ~200 ms before its main note", gap is not None and 190 <= gap <= 210, f"{gap} ms")
        check("licks: grace notes drawn small in the tab", await pg.evaluate("document.querySelectorAll('.tnum.grace').length") == 4)
        await pg.evaluate("(() => { const g = document.querySelector('#grace'); g.value = 350; g.dispatchEvent(new Event('input')); })()")
        await pg.evaluate("window.__plucks.length = 0; window.__times.length = 0")
        await pg.click("#play"); await pg.wait_for_timeout(3700); await pg.click("#play")
        gap = await pg.evaluate("(() => { const p = window.__plucks, t = window.__times, i = p.indexOf('4:2'); return i >= 0 && p[i + 1] === '4:4' ? Math.round((t[i + 1] - t[i]) * 1000) : null; })()")
        check("licks: Grace slider sets the grace length (350 ms)", gap is not None and 340 <= gap <= 360, f"{gap} ms")
        hidden = await pg.evaluate("(() => { document.querySelector(\"button.lick-item[data-id='am-box1']\").click(); return document.querySelector('#grace-ctl').hidden; })()")
        check("licks: Grace slider hidden for licks without grace notes", hidden is True)

        await pg.click("button.lick-item[data-id='drop-d-chug']"); await pg.wait_for_timeout(200)
        locked = await pg.evaluate("[document.querySelector('#tuning-select').value, document.querySelector('#tuning-select').disabled]")
        check("licks: drop-D lick locks tuning to Drop D", locked == ["dropD", True], str(locked))
        tab_names = await pg.evaluate("[...document.querySelectorAll('.tab-row')][0].querySelectorAll('.tname')[5].textContent")
        check("licks: tab shows D on string 6", tab_names == "D", tab_names)
        await pg.evaluate(SPY); await pg.evaluate("window.__midis.length = 0")
        await pg.evaluate("document.querySelector('.tev:not(:empty)').dispatchEvent(new MouseEvent('click', {bubbles: true}))"); await pg.wait_for_timeout(100)
        check("licks: drop-D lick plays low D", 38 in await pg.evaluate("window.__midis.slice()"), str(await pg.evaluate("window.__midis.slice()")))
        await pg.select_option("#instrument-select", "bass"); await pg.wait_for_timeout(200)
        lk = await pg.evaluate("[document.querySelectorAll('.lick-item').length, document.querySelector('.lick-item.active').dataset.id, document.querySelector('.tab-row').querySelectorAll('.tname').length]")
        check("licks: Bass filters library to bass licks, 4-line tab", lk == [2, "bass-walk", 4], str(lk))
        await pg.select_option("#instrument-select", "mandolin"); await pg.wait_for_timeout(200)
        check("licks: mandolin library shows mandolin licks", await pg.evaluate("document.querySelectorAll('.lick-item').length") == 2)
        await pg.select_option("#instrument-select", "ukulele"); await pg.wait_for_timeout(200)
        await pg.evaluate("window.__midis.length = 0")
        await pg.evaluate("document.querySelector('.tev:not(:empty)').dispatchEvent(new MouseEvent('click', {bubbles: true}))"); await pg.wait_for_timeout(100)
        check("licks: uke C chord plays re-entrant g C E c (67 60 64 72)", sorted(await pg.evaluate("window.__midis.slice()")) == [60, 64, 67, 72], str(await pg.evaluate("window.__midis.slice()")))
        await pg.select_option("#instrument-select", "guitar"); await pg.wait_for_timeout(200)
        check("licks: back to guitar picks a guitar lick in standard", [await pg.input_value("#instrument-select"), await pg.input_value("#tuning-select")] == ["guitar", "standard"])
        await pg.goto(BASE + "index.html"); await pg.wait_for_timeout(300)
        check("licks: lick tuning is not saved as the user's tuning", await pg.input_value("#tuning-select") == "standard")
        check("licks: instrument chosen on Licks carries to other pages", await pg.input_value("#instrument-select") == "guitar")

        # ---------------- Tab editor
        await pg.goto(BASE + "tab.html"); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
        await pg.evaluate(SPY)
        song = "JSON.parse(localStorage.getItem('nectar-songs'))"
        tabtext = f"Object.values({song})[0].tab"
        check("editor: opens with a new empty song", await pg.evaluate(f"Object.keys({song}).length") == 1 and await pg.evaluate(tabtext) == "")
        await pg.click(".panel-head h2")
        for k in ["5", "ArrowRight", "ArrowDown", "7", "ArrowRight", "1", "2"]:
            await pg.keyboard.press(k); await pg.wait_for_timeout(40)
        check("editor: typing frets (incl. two-digit 12) writes tab", await pg.evaluate(tabtext) == "1-5:e 2-7 2-12", await pg.evaluate(tabtext))
        await pg.keyboard.press("ArrowLeft"); await pg.keyboard.press("h"); await pg.click("#dur-tools button[data-dur='q']")
        check("editor: technique key + length button", await pg.evaluate(tabtext) == "1-5:e h2-7:q 2-12:e", await pg.evaluate(tabtext))
        await pg.keyboard.press("End")
        pos = await pg.evaluate(POS); x, y = pos["6:3"]; await pg.mouse.click(x, y); await pg.wait_for_timeout(80)
        check("editor: tapping the neck adds that note at the cursor", await pg.evaluate(tabtext) == "1-5:e h2-7:q 2-12:e 6-3:q", await pg.evaluate(tabtext))
        await pg.keyboard.press("Meta+z"); await pg.wait_for_timeout(50)
        check("editor: undo", await pg.evaluate(tabtext) == "1-5:e h2-7:q 2-12:e", await pg.evaluate(tabtext))
        await pg.fill("#song-title", "Smoke Song"); await pg.reload(); await pg.wait_for_timeout(400)
        check("editor: song persists across reload", [await pg.input_value("#song-title"), await pg.evaluate(tabtext)] == ["Smoke Song", "1-5:e h2-7:q 2-12:e"])
        await pg.evaluate(SPY); await pg.evaluate("window.__plucks.length = 0")
        await pg.click("#play"); await pg.wait_for_timeout(2200); await pg.click("#play")
        check("editor: playback plays the written notes", (await pg.evaluate("window.__plucks.slice()"))[:3] == ["1:5", "2:7", "2:12"], str(await pg.evaluate("window.__plucks.slice()")))
        await pg.select_option("#instrument-select", "bass"); await pg.wait_for_timeout(150)
        check("editor: instrument belongs to the song (4-line tab)",
              await pg.evaluate(f"Object.values({song})[0].instrument") == "bass" and await pg.evaluate("document.querySelector('#tab .tab-row').querySelectorAll('.tname').length") == 4)
        await pg.select_option("#instrument-select", "guitar"); await pg.wait_for_timeout(100)
        async with pg.expect_download() as dl:
            await pg.click("#song-export")
        path = await (await dl.value).path()
        await pg.set_input_files("#song-import", path); await pg.wait_for_timeout(300)
        imported = await pg.evaluate(f"Object.values({song}).map(s => [s.title, s.tab])")
        check("editor: export then import round-trips", len(imported) == 2 and imported[0][1:] == imported[1][1:], str(imported))

        await pg.evaluate("localStorage.clear()")
        check("no console/page errors", not errs, "; ".join(errs[:5]))
        await b.close()
    fails = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(fails)}/{len(results)} passed")
    return 1 if fails else 0

sys.exit(asyncio.run(main()))
