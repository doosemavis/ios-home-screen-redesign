import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createVirtualClock } from '../clock/clock.js'
import { useDragController } from './useDragController.js'

function setup() {
  const dispatch = vi.fn()
  const clock = createVirtualClock()
  const getScreen = () => null
  const { result } = renderHook(() => useDragController({ dispatch, page: 0, clock, getScreen }))
  return { result, dispatch }
}

describe('useDragController settle handoff', () => {
  it('hands the release point of a shown drag to the FLIP pass exactly once', () => {
    const { result } = setup()
    act(() => result.current.start('app:maps'))
    act(() => result.current.move({ x: 10, y: 20 }))
    act(() => result.current.end({ x: 30, y: 40 }))

    expect(result.current.takeSettle()).toEqual({ key: 'app:maps', point: { x: 30, y: 40 } })
    expect(result.current.takeSettle()).toBeNull()
  })

  it('hands nothing over for a press that never showed a ghost', () => {
    const { result } = setup()
    act(() => result.current.start('app:maps'))
    act(() => result.current.end({ x: 30, y: 40 }))
    expect(result.current.takeSettle()).toBeNull()
  })

  it('settles a cancelled drag back from the last ghost position', () => {
    const { result, dispatch } = setup()
    act(() => result.current.start('app:maps'))
    act(() => result.current.move({ x: 10, y: 20 }))
    act(() => result.current.cancel())

    expect(result.current.dragging).toBeNull()
    expect(result.current.takeSettle()).toEqual({ key: 'app:maps', point: { x: 10, y: 20 } })
    expect(dispatch.mock.calls).toEqual([[{ type: 'DRAG_CANCELLED', ref: { type: 'app', id: 'maps' } }]])
  })

  it('a release over no slot reports a cancelled drag, never a drop', () => {
    const { result, dispatch } = setup()
    act(() => result.current.start('app:maps'))
    act(() => result.current.move({ x: 10, y: 20 }))
    act(() => result.current.end({ x: 30, y: 40 }))
    expect(dispatch.mock.calls).toEqual([[{ type: 'DRAG_CANCELLED', ref: { type: 'app', id: 'maps' } }]])
  })

  it('a cancel or release with no drag in flight dispatches nothing', () => {
    const { result, dispatch } = setup()
    act(() => result.current.cancel())
    act(() => result.current.end({ x: 30, y: 40 }))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('forgets a stale settle when the next drag starts', () => {
    const { result } = setup()
    act(() => result.current.start('app:maps'))
    act(() => result.current.move({ x: 10, y: 20 }))
    act(() => result.current.end({ x: 30, y: 40 }))
    act(() => result.current.start('app:notes'))
    expect(result.current.takeSettle()).toBeNull()
  })
})
