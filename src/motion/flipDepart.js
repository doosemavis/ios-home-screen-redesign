import { GHOST_LIFT, TILE_HALF_PX, isOnScreen, px } from './flipPlan.js'
import { viewScale } from './motionEnv.js'
import { SNAPPY_MS, SPRING_SNAPPY } from './springs.js'

const INTO_SCALE = 0.22
const DEPART_STAGGER_MS = 60
const LANDING_SHARE = 0.6
const POP_SCALE = 1.12
const STRIPPED = ['data-flip', 'data-item', 'data-selected', 'data-drag-source', 'data-control', 'role', 'tabindex', 'aria-label', 'aria-pressed']

// A visual-only copy of an icon React just removed, parked at its old slot inside its
// old region: no data-item, not focusable, not hittable. It removes itself when done.
function departingCopy(key, before) {
  const copy = before.el.cloneNode(true)
  const nodes = [copy, ...copy.querySelectorAll('*')]
  nodes.filter((node) => node.hasAttribute('data-drag-source')).forEach((node) => node.style.setProperty('opacity', '1'))
  nodes.forEach((node) => STRIPPED.forEach((name) => node.removeAttribute(name)))
  copy.setAttribute('data-departing', key)
  copy.setAttribute('aria-hidden', 'true')
  copy.inert = true
  Object.assign(copy.style, {
    position: 'absolute', left: `${before.x}px`, top: `${before.y}px`, margin: '0', pointerEvents: 'none', zIndex: '5',
  })
  before.region.appendChild(copy)
  return copy
}

const tileCentre = (rect, scale) => ({ x: rect.left + rect.width / 2, y: rect.top + TILE_HALF_PX * scale })

// Where the copy starts: its old slot, or the ghost if this app was just dropped there.
function startTransform(copyCentre, settle, key, scale) {
  if (settle === null || settle.key !== key) return 'none'
  const dx = (settle.point.x - copyCentre.x) / scale
  const dy = (settle.point.y - copyCentre.y) / scale
  return `translate(${px(dx)}, ${px(dy)}) scale(${GHOST_LIFT})`
}

function flyOne({ key, before }, index, { tile, settle, scale }) {
  const copy = departingCopy(key, before)
  const from = tileCentre(copy.getBoundingClientRect(), scale)
  const to = tileCentre(tile, scale)
  const transformOrigin = `${px(copy.offsetWidth / 2)} ${px(TILE_HALF_PX)}`
  const end = `translate(${px((to.x - from.x) / scale)}, ${px((to.y - from.y) / scale)}) scale(${INTO_SCALE})`
  const animation = copy.animate(
    [
      { transform: startTransform(from, settle, key, scale), opacity: 1, transformOrigin },
      { opacity: 1, offset: 0.75 },
      { transform: end, opacity: 0, transformOrigin },
    ],
    { duration: SNAPPY_MS, easing: SPRING_SNAPPY, delay: index * DEPART_STAGGER_MS, fill: 'both' },
  )
  const remove = () => copy.remove()
  animation.finished.then(remove, remove)
}

// The folder swells a touch and settles as the last app lands in it.
function popFolder(wrapper, delay) {
  const transformOrigin = `${px(wrapper.offsetWidth / 2)} ${px(TILE_HALF_PX)}`
  wrapper.animate(
    [
      { transform: 'none', transformOrigin },
      { transform: `scale(${POP_SCALE})`, transformOrigin, offset: 0.3 },
      { transform: 'none', transformOrigin },
    ],
    { duration: SNAPPY_MS, easing: SPRING_SNAPPY, delay, composite: 'add' },
  )
}

// Apps that left the grid and now sit in a folder, grouped by that folder's item key.
function departuresByFolder(prev, next, destinationOf) {
  const departed = [...prev]
    .filter(([key]) => !next.has(key))
    .map(([key, before]) => ({ key, before, destination: destinationOf(key) }))
    .filter(({ destination }) => destination !== null)
  return Map.groupBy(departed, ({ destination }) => destination.target)
}

// Apps that left the grid for a folder fly into its tile (shrinking, staggered by
// selection order), then the folder pops. Only when both ends are on screen, so nothing
// flies across the pager track; otherwise the apps simply vanish as before.
export function flyIntoFolders({ container, prev, next, settle, destinationOf }) {
  const containerRect = container.getBoundingClientRect()
  const scale = viewScale(container)
  departuresByFolder(prev, next, destinationOf).forEach((items, target) => {
    const wrapper = next.get(target)
    const tile = wrapper?.el.querySelector('[role="button"]')
    if (tile == null || !isOnScreen(wrapper.region, containerRect)) return
    const flying = items
      .filter(({ before }) => isOnScreen(before.region, containerRect))
      .toSorted((a, b) => a.destination.order - b.destination.order)
    if (flying.length === 0) return
    const ctx = { tile: tile.getBoundingClientRect(), settle, scale }
    flying.forEach((item, index) => flyOne(item, index, ctx))
    popFolder(wrapper.el, (flying.length - 1) * DEPART_STAGGER_MS + LANDING_SHARE * SNAPPY_MS)
  })
}
