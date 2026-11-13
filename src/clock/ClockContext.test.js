import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderHook } from '@testing-library/react'
import { ClockProvider, useClock } from './ClockContext.jsx'
import { createVirtualClock } from './clock.js'

describe('ClockContext', () => {
  it('provides the given clock', () => {
    const clock = createVirtualClock()
    const wrapper = ({ children }) => createElement(ClockProvider, { clock }, children)
    const { result } = renderHook(() => useClock(), { wrapper })
    expect(result.current).toBe(clock)
  })

  it('falls back to a real clock without a provider', () => {
    const { result } = renderHook(() => useClock())
    expect(typeof result.current.now()).toBe('number')
  })
})
