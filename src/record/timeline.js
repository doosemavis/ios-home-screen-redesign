// The video script as plain, frozen data: what the finger does and when. No browser
// globals, so the Node recorder (Task 11) can import it for scene bounds.
// Step times (`at`) are ms from the start of their scene. Targets are CSS selectors
// over the app's data hooks; the runner (runner.js) turns steps into touch events.
import { CAPTIONS } from '../stage/copy.js'

// Gesture shapes shared with the runner.
export const TAP_MS = 80
export const SWIPE_MS = 280
export const SWIPE_MOVES = 8
export const TYPE_CHAR_MS = 70
// A drag rests DRAG_PRESS_MS after touch-down (under the app's long-press threshold),
// then moves once per DRAG_MOVE_STEP_MS, about a frame, so the icon glides.
export const DRAG_PRESS_MS = 200
export const DRAG_MOVE_STEP_MS = 16

const item = (key) => `[data-item="${key}"]`
const slot = (name) => `[data-slot="${name}"]`
const control = (name) => `[data-control="${name}"]`
const inFolder = (appId) => `[data-folder-panel] ${item(`app:${appId}`)}`

const tap = (at, target, extra = {}) => ({ at, kind: 'tap', target, ...extra })
const swipe = (at, direction) => ({ at, kind: 'swipe', from: 'page', direction })
const drag = (at, target, path) => ({ at, kind: 'drag', target, path })
// A drag stop aims at the slot's icon-sized mark, so the lifted icon sits centred on
// the glow rather than on the slot (icon plus label).
const stop = (name, moveMs, holdMs) => ({ to: `${slot(name)} [data-slot-mark]`, moveMs, holdMs })

// Beats: ~600ms between taps, each animation settles before the next action, and a
// ~1s+ hold after every payoff so viewers can see that nothing else moved.
const SCRIPT = [
  {
    id: 'intro',
    durationMs: 3000,
    steps: [{ at: 600, kind: 'longPress', target: '[data-widget="weather"]', holdMs: 900 }],
  },
  {
    // After the drop, swipe back so page 0 shows only maps' gap: nothing else moved.
    id: 'one-app',
    durationMs: 5800,
    steps: [tap(400, item('app:maps')), swipe(1100, 'left'), tap(2400, slot('page:1:6')), swipe(3700, 'right')],
  },
  {
    // Starts on page 0, where one-app left off.
    id: 'several-apps',
    durationMs: 6200,
    steps: [
      tap(500, item('app:notes')),
      tap(1100, item('app:podcasts')),
      tap(1700, item('app:compass')),
      swipe(2500, 'left'),
      tap(3800, slot('page:1:13')),
    ],
  },
  {
    // Still on page 1: Tips wanders along the empty bottom row and up into the space
    // above, resting on each so its glow shows, and drops there; the glow fades as
    // the icon lands, and the rest of the page stays put.
    id: 'drag',
    durationMs: 5600,
    steps: [
      drag(500, item('app:tips'), [
        stop('page:1:20', 450, 300),
        stop('page:1:21', 380, 300),
        stop('page:1:22', 380, 300),
        stop('page:1:23', 380, 300),
        stop('page:1:19', 380, 450),
      ]),
    ],
  },
  {
    id: 'snap',
    durationMs: 4000,
    steps: [swipe(300, 'right'), tap(2000, control('snap'))],
  },
  {
    id: 'into-folder',
    durationMs: 5000,
    steps: [
      tap(400, item('app:books')),
      tap(1000, item('app:stocks')),
      tap(1700, control('move')),
      tap(2700, '[data-folder-option="media"]'),
    ],
  },
  {
    id: 'new-folder',
    durationMs: 7200,
    steps: [
      tap(400, item('app:camera')),
      tap(1000, item('app:clock')),
      tap(1600, item('app:settings')),
      tap(2300, control('move')),
      tap(3300, control('new-folder')),
      { at: 3900, kind: 'type', target: control('folder-name'), text: 'Essentials' },
      tap(5200, control('create-folder')),
    ],
  },
  {
    id: 'out-of-folder',
    durationMs: 5600,
    steps: [
      tap(400, item('folder:social')),
      tap(1500, inFolder('chat')),
      tap(2100, inFolder('photogram')),
      tap(2800, control('move-out')),
      // "Tap outside to close": low on the dimmed backdrop, well clear of the panel.
      tap(3700, '[data-overlay-backdrop]', { anchor: [0.5, 0.9] }),
    ],
  },
  {
    id: 'end',
    // The 1s fade starts at 1200 and the frame holds on white for the last 600ms.
    durationMs: 2800,
    steps: [tap(500, control('done')), { at: 1200, kind: 'fadeOut' }],
  },
]

function deepFreeze(value) {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

export const SCENES = deepFreeze(
  SCRIPT.map((scene) => ({ ...scene, caption: CAPTIONS[scene.id] ?? null })),
)

export const TOTAL_MS = SCENES.reduce((total, scene) => total + scene.durationMs, 0)

// [{ id, startMs, endMs }] on the video's timeline, contiguous from 0.
export function getSceneBounds(scenes = SCENES) {
  return scenes.reduce((bounds, scene) => {
    const startMs = bounds.length === 0 ? 0 : bounds.at(-1).endMs
    return [...bounds, { id: scene.id, startMs, endMs: startMs + scene.durationMs }]
  }, [])
}
