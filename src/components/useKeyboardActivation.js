import { useEffect, useRef } from 'react'
import { resolveTap } from '../gestures/resolveTap.js'

const KEY_ACTIVATORS = ['Enter', ' ']
const focusableIn = (key) => `[data-item="${key}"][tabindex], [data-item="${key}"] [tabindex]`
const keyOf = (ref) => `${ref.type}:${ref.id}`

// Enter/Space on a focused icon or empty slot acts like a tap on it. A keyboard
// placement then moves focus onto the first placed icon, because its slot stops being
// a button; a refused one (a toast instead of a new layout) leaves focus where it is.
export function useKeyboardActivation({ state, dispatch, surfaceRef }) {
  const pending = useRef(null)
  const { layout, toastCounter } = state
  useEffect(() => {
    const placed = pending.current
    pending.current = null
    if (placed === null || placed.layout === layout) return
    surfaceRef.current?.querySelector(focusableIn(placed.key))?.focus({ preventScroll: true })
  }, [layout, toastCounter, surfaceRef])
  return (event) => {
    if (!KEY_ACTIVATORS.includes(event.key)) return
    const action = resolveTap(event.target, state)
    if (action === null) return
    event.preventDefault()
    if (action.type === 'PLACE_SELECTION') pending.current = { key: keyOf(state.selection[0]), layout }
    dispatch(action)
  }
}
