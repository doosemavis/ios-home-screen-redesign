// One scripted touch, routed the way a browser routes a real pointer, so the recording
// exercises the same event path a person's input does:
// - the press goes to the element hit; a touch is implicitly captured by that element;
// - once an element calls setPointerCapture, every later event of the touch goes to it,
//   and so does the click that ends a tap (the capture target at pointerup, as
//   Chromium does for mouse input and Pointer Events 3 specifies for click);
// - after the release the capturing element gets lostpointercapture.
// Dispatched (untrusted) pointers cannot really be captured: the browser throws for
// them. So while this touch's events are dispatched, the capture methods answer from
// this touch's own record for its pointer id; any other id reaches the browser.
import { sendClick, sendPointer } from './touchSynth.js'

const CAPTURE_METHODS = ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture']

const elementProto = (el) => (el.ownerDocument?.defaultView ?? globalThis).Element.prototype

function captureMethods(pointerId, captor, native) {
  const passOn = (name, el, id) => native[name]?.call(el, id)
  return {
    setPointerCapture(id) {
      if (id !== pointerId) return passOn('setPointerCapture', this, id)
      captor.set(this)
      return undefined
    },
    hasPointerCapture(id) {
      return id === pointerId ? captor.get() === this : passOn('hasPointerCapture', this, id) === true
    },
    releasePointerCapture(id) {
      if (id !== pointerId) return passOn('releasePointerCapture', this, id)
      if (captor.get() === this) captor.set(null)
      return undefined
    },
  }
}

// Runs `dispatch` with the capture methods answering for `pointerId`, then restores
// the prototype exactly (including methods the environment never had).
function withCaptureRecord(el, pointerId, captor, dispatch) {
  const proto = elementProto(el)
  const saved = CAPTURE_METHODS.map((name) => [name, Object.getOwnPropertyDescriptor(proto, name)])
  const native = Object.fromEntries(saved.map(([name, descriptor]) => [name, descriptor?.value]))
  const shim = captureMethods(pointerId, captor, native)
  CAPTURE_METHODS.forEach((name) =>
    Object.defineProperty(proto, name, { value: shim[name], configurable: true, writable: true }),
  )
  try {
    dispatch()
  } finally {
    saved.forEach(([name, descriptor]) => {
      if (descriptor === undefined) delete proto[name]
      else Object.defineProperty(proto, name, descriptor)
    })
  }
}

// Presses at `point` on `hit`. Returns { move(point), end(point, { click }) }; `end`
// lifts the finger and, for a tap, sends the click to whatever held the capture.
export function beginTouch(hit, point, pointerId) {
  let captured = null
  const captor = { get: () => captured, set: (el) => { captured = el } }
  const send = (el, type, at) => withCaptureRecord(el, pointerId, captor, () => sendPointer(el, type, at, pointerId))
  const routed = () => captured ?? hit
  send(hit, 'pointerdown', point)
  return {
    move: (at) => send(routed(), 'pointermove', at),
    end: (at, { click = false } = {}) => {
      const target = routed()
      send(target, 'pointerup', at)
      const lost = captured
      captured = null
      if (lost !== null) sendPointer(lost, 'lostpointercapture', at, pointerId)
      if (click) sendClick(target, at)
    },
  }
}
