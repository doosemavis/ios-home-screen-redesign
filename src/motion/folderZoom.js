import { viewScale } from './motionEnv.js'
import { GENTLE_MS, SPRING_GENTLE } from './springs.js'

const FALLBACK_SCALE = 0.86
const BLUR = 'blur(6px)'
const SHARP = 'blur(0px)'

// Layout offset of `el` inside `ancestor`, summed up the offsetParent chain.
function offsetWithin(el, ancestor) {
  let x = 0
  let y = 0
  for (let node = el; node !== null && node !== ancestor; node = node.offsetParent) {
    x += node.offsetLeft
    y += node.offsetTop
  }
  return { x, y }
}

const folderTile = (layer, folderId) =>
  layer.parentElement?.querySelector(`[data-item="folder:${folderId}"] [role="button"]`) ?? null

// Scale and transform-origin (in the content box) that map the open panel exactly onto
// the folder icon's tile: the scale's fixed point F solves C + (I − C)/(1 − s), with C the
// panel centre and I the icon centre. Layout offsets keep it free of zoom and transforms.
function zoomGeometry(layer, folderId) {
  const content = layer.querySelector('[data-folder-content]')
  const panel = layer.querySelector('[data-folder-panel]')
  if (content === null || panel === null) return null
  const tile = folderTile(layer, folderId)
  if (tile === null) return { content, scale: FALLBACK_SCALE, origin: 'center' }
  const scale = viewScale(layer)
  const layerRect = layer.getBoundingClientRect()
  const tileRect = tile.getBoundingClientRect()
  const s = tileRect.width / scale / panel.offsetWidth
  const icon = {
    x: (tileRect.left + tileRect.width / 2 - layerRect.left) / scale,
    y: (tileRect.top + tileRect.height / 2 - layerRect.top) / scale,
  }
  const panelAt = offsetWithin(panel, layer)
  const contentAt = offsetWithin(content, layer)
  const centre = { x: panelAt.x + panel.offsetWidth / 2, y: panelAt.y + panel.offsetHeight / 2 }
  const fixed = (axis) => centre[axis] + (icon[axis] - centre[axis]) / (1 - s)
  const origin = `${fixed('x') - contentAt.x}px ${fixed('y') - contentAt.y}px`
  return { content, scale: s, origin }
}

const timing = { duration: GENTLE_MS, easing: SPRING_GENTLE, fill: 'both' }

// Folder opens out of its icon: the panel grows from the tile, sharpening as it lands.
// Returns the animation (or null) so the caller can cancel it.
export function zoomFolderIn(layer, folderId) {
  const zoom = zoomGeometry(layer, folderId)
  if (zoom === null) return null
  const { content, scale, origin } = zoom
  return content.animate(
    [
      { transform: `scale(${scale})`, opacity: 0, filter: BLUR, transformOrigin: origin },
      { opacity: 1, offset: 0.3 },
      { transform: 'none', opacity: 1, filter: SHARP, transformOrigin: origin },
    ],
    { ...timing, fill: 'backwards' },
  )
}

// Exit for usePresence: the panel shrinks back into its icon while the backdrop fades.
export function zoomFolderOut(layer) {
  const zoom = zoomGeometry(layer, layer.getAttribute('data-folder-overlay'))
  const backdrop = layer.querySelector('[data-overlay-backdrop]')
  const fade = backdrop === null ? [] : [backdrop.animate([{ opacity: 1 }, { opacity: 0 }], timing)]
  if (zoom === null) return fade
  const { content, scale, origin } = zoom
  const shrink = content.animate(
    [
      { transform: 'none', opacity: 1, filter: SHARP, transformOrigin: origin },
      { opacity: 1, offset: 0.65 },
      { transform: `scale(${scale})`, opacity: 0, filter: BLUR, transformOrigin: origin },
    ],
    timing,
  )
  return [shrink, ...fade]
}
