import { useEffect, useRef, useState } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import { viewScale } from '../motion/motionEnv.js'
import styles from './TouchIndicator.module.css'

// Matches the .lifted fade in TouchIndicator.module.css.
export const TOUCH_FADE_MS = 260

// Viewport point → this layer's (phone screen) px, so circles scale with the phone.
function toLocal(layer, event) {
  const rect = layer.getBoundingClientRect()
  const scale = viewScale(layer)
  return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale }
}

const press = (id, point) => (touches) => [...touches.filter((t) => t.id !== id), { id, ...point, down: true }]
const follow = (id, point) => (touches) => touches.map((t) => (t.id === id && t.down ? { ...t, ...point } : t))
const lift = (id) => (touches) => touches.map((t) => (t.id === id ? { ...t, down: false } : t))
const drop = (id) => (touches) => touches.filter((t) => t.id !== id)

// Listens (capture phase) at the stage root for touch pointers and keeps a list of
// { id, x, y, down }. A lifted touch is removed on the shared clock once its fade
// has played, so the recorder's virtual clock decides exactly when.
function useTouches(layerRef) {
  const clock = useClock()
  const [touches, setTouches] = useState([])
  useEffect(() => {
    const layer = layerRef.current
    const host = layer.closest('[data-stage]') ?? layer.ownerDocument
    const timers = new Set()
    const isTouch = (event) => event.pointerType === 'touch'
    const onDown = (e) => isTouch(e) && setTouches(press(e.pointerId, toLocal(layer, e)))
    const onMove = (e) => isTouch(e) && setTouches(follow(e.pointerId, toLocal(layer, e)))
    const onUp = (e) => {
      if (!isTouch(e)) return
      setTouches(lift(e.pointerId))
      const id = clock.setTimeout(() => {
        timers.delete(id)
        setTouches(drop(e.pointerId))
      }, TOUCH_FADE_MS)
      timers.add(id)
    }
    const listeners = { pointerdown: onDown, pointermove: onMove, pointerup: onUp, pointercancel: onUp }
    Object.entries(listeners).forEach(([type, fn]) => host.addEventListener(type, fn, true))
    return () => {
      Object.entries(listeners).forEach(([type, fn]) => host.removeEventListener(type, fn, true))
      timers.forEach((id) => clock.clearTimeout(id))
    }
  }, [clock, layerRef])
  return touches
}

// Screen-recording style touch circles: scale in on down, hold, follow a swipe, fade
// on release. Purely visual: pointer-events none, so it is never a hit-test result.
export function TouchIndicator() {
  const layerRef = useRef(null)
  const touches = useTouches(layerRef)
  return (
    <div ref={layerRef} className={styles.layer} data-touch-layer aria-hidden="true">
      {touches.map((t) => (
        <span
          key={t.id}
          className={t.down ? styles.touch : `${styles.touch} ${styles.lifted}`}
          style={{ left: `${t.x}px`, top: `${t.y}px` }}
          data-touch={t.down ? 'down' : 'up'}
        />
      ))}
    </div>
  )
}
