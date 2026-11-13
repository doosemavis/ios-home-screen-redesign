// Plays the declarative timeline against the real UI: every step is scheduled on the
// (virtual) clock and becomes synthesized touch events at the point a finger would
// touch, dispatched on whatever document.elementFromPoint finds there. A step whose
// touch would miss its target throws a RecorderError out of clock.advance().
import { SWIPE_MOVES, SWIPE_MS, TAP_MS, TYPE_CHAR_MS, getSceneBounds } from './timeline.js'
import { planSwipe } from './swipePlan.js'
import { RecorderError, findTarget, hitInside, pointIn, sendClick, sendPointer, typeValue } from './touchSynth.js'

const noop = () => {}
const defaultHitTest = (root) => (x, y) => (root.ownerDocument ?? root).elementFromPoint(x, y)
const easeOut = (p) => 1 - (1 - p) ** 2
const lerp = (a, b, p) => a + (b - a) * p

// A press on the element under the step's anchor point (hit-checked against its target).
function aim(ctx, step) {
  const target = findTarget(ctx.root, step.target)
  const point = pointIn(target, step.anchor, step.target)
  const hit = hitInside({ hitTest: ctx.hitTest, point, within: target, label: step.target })
  return { hit, point, pointerId: ctx.nextPointerId() }
}

function tap(ctx, step) {
  const { hit, point, pointerId } = aim(ctx, step)
  sendPointer(hit, 'pointerdown', point, pointerId)
  ctx.after(TAP_MS, () => {
    sendPointer(hit, 'pointerup', point, pointerId)
    sendClick(hit, point)
  })
}

// Held past the app's long-press threshold; a long-press release sends no click.
function longPress(ctx, step) {
  const { hit, point, pointerId } = aim(ctx, step)
  sendPointer(hit, 'pointerdown', point, pointerId)
  ctx.after(step.holdMs, () => sendPointer(hit, 'pointerup', point, pointerId))
}

// Down, SWIPE_MOVES moves easing out across the travel, then up at the end point.
function swipe(ctx, step) {
  const { element, start, end } = planSwipe(ctx.root, step.direction)
  const label = `swipe ${step.direction}`
  const hit = hitInside({ hitTest: ctx.hitTest, point: start, within: element, label })
  const pointerId = ctx.nextPointerId()
  const at = (p) => ({ x: lerp(start.x, end.x, easeOut(p)), y: lerp(start.y, end.y, easeOut(p)) })
  sendPointer(hit, 'pointerdown', start, pointerId)
  const segments = SWIPE_MOVES + 1
  Array.from({ length: SWIPE_MOVES }, (_, i) => (i + 1) / segments).forEach((p) => {
    ctx.after(p * SWIPE_MS, () => sendPointer(hit, 'pointermove', at(p), pointerId))
  })
  ctx.after(SWIPE_MS, () => sendPointer(hit, 'pointerup', end, pointerId))
}

// One character every TYPE_CHAR_MS, starting at the step's time.
function type(ctx, step) {
  const input = findTarget(ctx.root, step.target)
  ;[...step.text].forEach((_, i) => {
    const value = step.text.slice(0, i + 1)
    ctx.after(i * TYPE_CHAR_MS, () => typeValue(input, value))
  })
}

const PERFORM = {
  tap,
  longPress,
  swipe,
  type,
  endCard: (ctx) => ctx.onEndCard(),
}

function perform(ctx, step) {
  const run = PERFORM[step.kind]
  if (run === undefined) throw new RecorderError(`unknown step kind ${step.kind}`)
  run(ctx, step)
}

// Tracks every timer it sets so dispose() can cancel whatever is still pending.
function createScheduler(clock) {
  const pending = new Set()
  return {
    after(ms, fn) {
      const id = clock.setTimeout(() => {
        pending.delete(id)
        fn()
      }, ms)
      pending.add(id)
    },
    cancelAll() {
      pending.forEach((id) => clock.clearTimeout(id))
      pending.clear()
    },
  }
}

// Schedules the whole script from the clock's current time: each scene's caption at its
// start, each step at scene start + `at`. Returns { totalMs, dispose }.
export function createRunner({ clock, scenes, root, onCaption = noop, onEndCard = noop, hitTest = defaultHitTest(root) }) {
  const scheduler = createScheduler(clock)
  let pointerCount = 0
  const ctx = {
    root,
    hitTest,
    onEndCard,
    after: scheduler.after,
    nextPointerId: () => {
      pointerCount += 1
      return pointerCount
    },
  }
  const bounds = getSceneBounds(scenes)
  scenes.forEach((scene, i) => {
    const { startMs } = bounds[i]
    scheduler.after(startMs, () => onCaption(scene.caption))
    scene.steps.forEach((step) => scheduler.after(startMs + step.at, () => perform(ctx, step)))
  })
  return {
    totalMs: bounds.length === 0 ? 0 : bounds.at(-1).endMs,
    dispose: scheduler.cancelAll,
  }
}
