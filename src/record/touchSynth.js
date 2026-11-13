// Low-level touch synthesis for the record runner: find a target, aim at a point in
// it, prove a real touch there would land on it, and dispatch pointer/click/input
// events. Every failure throws with the selector in the message, so a scripted miss
// stops the recording instead of silently rendering a wrong video.

const CENTER = [0.5, 0.5]

const describe = (el) => {
  if (el === null || el === undefined) return 'nothing'
  const hooks = ['data-item', 'data-slot', 'data-control', 'data-widget', 'data-stage']
    .filter((name) => el.hasAttribute?.(name))
    .map((name) => `[${name}="${el.getAttribute(name)}"]`)
  const classes = typeof el.className === 'string' && el.className !== '' ? `.${el.className.split(' ')[0]}` : ''
  return `<${el.tagName?.toLowerCase() ?? '?'}${classes}${hooks.join('')}>`
}

export class RecorderError extends Error {
  constructor(message) {
    super(`Recorder: ${message}`)
    this.name = 'RecorderError'
  }
}

export function findTarget(root, selector) {
  const target = root.querySelector(selector)
  if (target === null) throw new RecorderError(`target ${selector} not found`)
  return target
}

// Viewport point at a fractional anchor ([fx, fy], default centre) of the element's box.
export function pointIn(el, anchor = CENTER, label = describe(el)) {
  const rect = el.getBoundingClientRect()
  if (!(rect.width > 0 && rect.height > 0)) throw new RecorderError(`target ${label} has no size`)
  return { x: rect.left + rect.width * anchor[0], y: rect.top + rect.height * anchor[1] }
}

// The element a touch at `point` would land on; throws unless it lies inside `within`.
export function hitInside({ hitTest, point, within, label }) {
  const hit = hitTest(point.x, point.y)
  if (hit === null || hit === undefined || !within.contains(hit)) {
    const at = `(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`
    throw new RecorderError(`touch for ${label} at ${at} missed: it would land on ${describe(hit)}`)
  }
  return hit
}

function pointerInit({ x, y }, pointerId, pressed) {
  return {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: x,
    clientY: y,
    width: 1,
    height: 1,
    pressure: pressed ? 0.5 : 0,
    buttons: pressed ? 1 : 0,
  }
}

// Touch has implicit pointer capture: every event of one touch goes to the element hit
// on pointerdown, wherever the finger is now.
export function sendPointer(el, type, point, pointerId) {
  const pressed = type !== 'pointerup'
  const button = type === 'pointermove' ? -1 : 0
  el.dispatchEvent(new PointerEvent(type, { ...pointerInit(point, pointerId, pressed), button }))
}

export function sendClick(el, { x, y }) {
  el.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, detail: 1 }),
  )
}

// Sets an input's value the way the browser does (the prototype setter, below React's
// value tracker) and fires `input`, so React's onChange sees a real edit.
export function typeValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')
  if (descriptor?.set === undefined) throw new RecorderError(`${describe(input)} has no value to type into`)
  descriptor.set.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
