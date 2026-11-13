import { viewScale } from './motionEnv.js'

// Ghost geometry (see DragGhost): a 60px tile drawn centred on the pointer, lifted 1.14×.
const TILE_HALF_PX = 30
const GHOST_LIFT = 1.14
const ARRIVAL_FROM_SCALE = 0.5
const ARRIVAL_STAGGER_MS = 40
const MIN_VISIBLE_SHARE = 0.5

const px = (value) => `${Math.round(value * 100) / 100 + 0}px`

// Layout position of each FLIP wrapper, relative to its offset parent (a page grid or
// the dock). offsetLeft/Top ignore transforms and CSS zoom, so neither the pager
// track, the jiggle, the refusal shake nor an in-flight FLIP pollutes the reading.
export function measureItems(container) {
  return new Map(
    [...container.querySelectorAll('[data-flip]')].map((el) => [
      el.getAttribute('data-flip'),
      { el, region: el.offsetParent, x: el.offsetLeft, y: el.offsetTop },
    ]),
  )
}

function isOnScreen(region, containerRect) {
  if (region === null || !region.isConnected) return false
  const rect = region.getBoundingClientRect()
  const overlap = Math.min(rect.right, containerRect.right) - Math.max(rect.left, containerRect.left)
  return overlap > containerRect.width * MIN_VISIBLE_SHARE
}

// Additive so a glide that interrupts another one continues from where the icon is.
const glide = (dx, dy) => ({
  kind: 'glide',
  composite: 'add',
  keyframes: [{ transform: `translate(${px(dx)}, ${px(dy)})` }, { transform: 'none' }],
})

const arrival = () => ({
  kind: 'arrival',
  keyframes: [
    { opacity: 0, transform: `scale(${ARRIVAL_FROM_SCALE})` },
    { opacity: 1, offset: 0.35 },
    { opacity: 1, transform: 'none' },
  ],
})

// The dropped item flies from where the ghost was (centred on the drop point) into its slot.
function settleFrom(point, el) {
  const rect = el.getBoundingClientRect()
  const scale = viewScale(el)
  const dx = (point.x - (rect.left + rect.width / 2)) / scale
  const dy = (point.y - (rect.top + TILE_HALF_PX * scale)) / scale
  const transformOrigin = `${px(el.offsetWidth / 2)} ${px(TILE_HALF_PX)}`
  return {
    kind: 'settle',
    keyframes: [
      { transform: `translate(${px(dx)}, ${px(dy)}) scale(${GHOST_LIFT})`, transformOrigin },
      { transform: 'none', transformOrigin },
    ],
  }
}

// Same region: plain offset delta. Different regions both on screen (page ↔ dock):
// add the regions' on-screen offset. A region off screen means the item crossed pages,
// so it pops in at its new slot rather than flying across the pager track.
function moveFrom(before, after, ctx) {
  if (before.region === after.region) {
    const dx = before.x - after.x
    const dy = before.y - after.y
    return dx === 0 && dy === 0 ? null : glide(dx, dy)
  }
  if (!isOnScreen(before.region, ctx.containerRect) || !isOnScreen(after.region, ctx.containerRect)) {
    return arrival()
  }
  const from = before.region.getBoundingClientRect()
  const to = after.region.getBoundingClientRect()
  return glide(
    (from.left - to.left) / ctx.scale + before.x - after.x,
    (from.top - to.top) / ctx.scale + before.y - after.y,
  )
}

function planOne(key, after, ctx) {
  if (ctx.settle !== null && ctx.settle.key === key) return settleFrom(ctx.settle.point, after.el)
  const before = ctx.prev.get(key)
  return before === undefined ? arrival() : moveFrom(before, after, ctx)
}

// [{ el, keyframes, delay }] for every item whose layout position changed.
export function planFlips({ container, prev, next, settle }) {
  const ctx = { prev, settle, containerRect: container.getBoundingClientRect(), scale: viewScale(container) }
  const moving = [...next]
    .map(([key, after]) => ({ el: after.el, plan: planOne(key, after, ctx) }))
    .filter(({ plan }) => plan !== null)
  const arrivalIndex = (index) => moving.slice(0, index).filter(({ plan }) => plan.kind === 'arrival').length
  return moving.map(({ el, plan }, index) => ({
    el,
    keyframes: plan.keyframes,
    composite: plan.composite ?? 'replace',
    delay: plan.kind === 'arrival' ? ARRIVAL_STAGGER_MS * arrivalIndex(index) : 0,
  }))
}
