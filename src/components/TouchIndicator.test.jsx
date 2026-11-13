import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { createVirtualClock } from '../clock/clock.js'
import { ClockProvider } from '../clock/ClockContext.jsx'
import { TOUCH_FADE_MS, TouchIndicator } from './TouchIndicator.jsx'

function setup() {
  const clock = createVirtualClock()
  const view = render(
    <ClockProvider clock={clock}>
      <div data-stage="record">
        <div data-testid="screen">
          <button type="button" data-testid="target" />
          <TouchIndicator />
        </div>
      </div>
    </ClockProvider>,
  )
  const target = view.getByTestId('target')
  const send = (type, x, y, pointerType = 'touch', pointerId = 1) =>
    act(() => {
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId, pointerType, clientX: x, clientY: y }))
    })
  const touches = () => [...view.container.querySelectorAll('[data-touch]')]
  return { clock, send, touches, view }
}

describe('TouchIndicator', () => {
  it('shows a circle where a touch goes down and keeps it while held', () => {
    const { send, touches } = setup()
    send('pointerdown', 120, 340)
    expect(touches()).toHaveLength(1)
    expect(touches()[0]).toHaveAttribute('data-touch', 'down')
    expect(touches()[0].style.left).toBe('120px')
    expect(touches()[0].style.top).toBe('340px')
  })

  it('follows the finger while it moves', () => {
    const { send, touches } = setup()
    send('pointerdown', 300, 200)
    send('pointermove', 240, 200)
    expect(touches()[0].style.left).toBe('240px')
  })

  it('fades out on release and is gone once the fade has played on the clock', () => {
    const { send, touches, clock } = setup()
    send('pointerdown', 10, 10)
    send('pointerup', 10, 10)
    expect(touches()[0]).toHaveAttribute('data-touch', 'up')
    act(() => clock.advance(TOUCH_FADE_MS - 1))
    expect(touches()).toHaveLength(1)
    act(() => clock.advance(1))
    expect(touches()).toHaveLength(0)
  })

  it('ignores mouse and pen input (hand use)', () => {
    const { send, touches } = setup()
    send('pointerdown', 10, 10, 'mouse')
    expect(touches()).toHaveLength(0)
  })

  it('is decorative only', () => {
    const { view } = setup()
    const layer = view.container.querySelector('[data-touch-layer]')
    expect(layer).toHaveAttribute('aria-hidden', 'true')
  })
})
