# iOS Home Screen Redesign

A different way to organize the iPhone home screen: tap or drag, and nothing moves unless you move it.

## Demo

<table>
<tr>
<td align="center" valign="top"><b>Hold to start editing</b><br><img src="docs/media/01-intro.gif" width="360" alt="Hold to start editing"></td>
<td align="center" valign="top"><b>Tap an app, then tap where it goes</b><br><img src="docs/media/02-one-app.gif" width="360" alt="Tap an app, then tap where it goes"></td>
</tr>
<tr>
<td align="center" valign="top"><b>Pick several — they land together</b><br><img src="docs/media/03-several-apps.gif" width="360" alt="Pick several — they land together"></td>
<td align="center" valign="top"><b>Or drag it to any open space</b><br><img src="docs/media/04-drag.gif" width="360" alt="Or drag it to any open space"></td>
</tr>
<tr>
<td align="center" valign="top"><b>Tidy up only when you choose</b><br><img src="docs/media/05-snap.gif" width="360" alt="Tidy up only when you choose"></td>
<td align="center" valign="top"><b>Group them in one move</b><br><img src="docs/media/06-into-folder.gif" width="360" alt="Group them in one move"></td>
</tr>
<tr>
<td align="center" valign="top"><b>Or start a new folder</b><br><img src="docs/media/07-new-folder.gif" width="360" alt="Or start a new folder"></td>
<td align="center" valign="top"><b>Move them out together</b><br><img src="docs/media/08-out-of-folder.gif" width="360" alt="Move them out together"></td>
</tr>
</table>

## Why

Organizing apps on a real iPhone is harder than it should be. Dragging one icon reflows everything after it. Folders only form if you hover at the right moment. Moving apps between pages means edge-drags, and both pages reflow and push apps onto later pages. All of it depends on precise long-press-and-drag gestures.

This prototype replaces that with explicit placement: select apps by tapping, choose where they go, and only those apps move. Tap-to-place is easier to learn and more accessible, for example for people with limited dexterity. Drag-and-drop still works, so every move can be done either way.

## What it does

- **Tap or drag.** Every move works with taps or with drag-and-drop.
- **No reflow.** Placing apps never shifts apps you did not choose. The source page keeps its gaps. The one exception is an explicit drag-swap, a direct 1:1 exchange.
- **Multi-select across pages.** Select several apps, swipe or tap the page dots to any of the three pages, and tap a slot. The group fills that slot and the next empty ones in selection order. If there is not enough room, the move is refused, a short message says why, and nothing changes.
- **Folders.** The Move sheet sends the selection to an existing folder or a New Folder. Open a folder, select apps inside it, and Move Out places them in open slots.
- **Snap to Grid (the Snap control).** Tidy a page into a compact layout when you choose to, never automatically.
- **Edge page turns.** Hold a dragged app at the screen edge and the page turns.
- **Dock.** Apps move to and from the dock by tap or drag. Folders stay on the pages.
- **Keyboard.** In edit mode, Tab to an app or an empty slot and press Enter or Space to select the app or place the selection there.

## Engineering highlights

- **Pure, immutable layout model.** `src/model` holds the home-screen layout (pages, slots, dock, folders) and every operation as pure functions over immutable state. The reflow-free guarantees live here and are unit-tested, including checks that untouched items keep their positions.
- **Reducer state.** `src/state` composes the model into a single reducer with a separate selection module, so UI components only dispatch intent.
- **Pointer gesture state machine.** `src/gestures` disambiguates tap, long-press, drag and page swipe from raw pointer events through an explicit state machine, with edge-hold page turning layered on top.
- **Offset-based FLIP with spring motion.** `src/motion` animates layout changes by measuring offsets and playing them back with `linear()` spring easings generated from a physical spring model. The same constants are mirrored into CSS custom properties.
- **Deterministic recorder.** `src/record` plays a declarative script through the real UI, routing each scripted touch the way the browser routes a real pointer, pointer capture and click targeting included. A virtual clock and a stepper that advances every Web Animation let `scripts/record.mjs` capture a frame-exact 60fps video, identical across runs, which `scripts/cut-gifs.mjs` then cuts into per-scene GIFs.

## Run it

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Open the URL Vite prints. The phone renders at roughly real size and scales to fit the window. Right-click, or long-press, to enter edit mode. Right-click again, or tap Done, to leave it.

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build
npm run lint
```

## Tests

The end-to-end tests and the recorder drive Chromium through Playwright. Install it once:

```bash
npx playwright install chromium
```

```bash
npm test          # unit and component tests (Vitest)
npm run coverage  # with coverage thresholds on the logic modules
npm run e2e       # end-to-end flows (Playwright)
```

## Recording

Recording needs `ffmpeg` on your PATH (or set `FFMPEG` to its path) and Playwright's Chromium (see Tests).

```bash
npm run record    # renders out/demo.mp4 (1080x1350, 60fps) and out/scenes.json
npm run gifs      # cuts a GIF and MP4 per scene into out/gifs/
npm run gifs:readme  # cuts the smaller README GIFs into docs/media/
```

Rendered output goes to `out/`, which is not committed. The README GIFs in `docs/media/` are committed. A failed render leaves no `out/demo.mp4` behind.

## Project structure

```
src/
  model/       pure immutable layout model and operations
  state/       reducer and selection logic
  gestures/    pointer gesture state machine, drag and edge page turns
  motion/      FLIP animation and spring easings
  components/  device frame, pager, grid, icons, folders, dock, controls
  icons/       original line-art glyphs
  clock/       virtual clock for deterministic playback
  record/      scripted timeline, recorder and animation stepper
  stage/       headline, captions and closing fade
e2e/           Playwright flows
scripts/       video recording and GIF cutting
```

## License

MIT. See [LICENSE](LICENSE).
