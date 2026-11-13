import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVirtualClock } from '../clock/clock.js'
import { ClockProvider } from '../clock/ClockContext.jsx'
import { usePresence } from '../motion/usePresence.js'
import { Toast } from './Toast.jsx'
import { useModalFocus } from './useModalFocus.js'

const slowExit = (el) => [el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 })]

function Dialog({ open }) {
  const { mounted, closing, ref } = usePresence(open, slowExit)
  useModalFocus({
    rootRef: ref,
    initialSelector: '[data-first]',
    restoreSelector: '[data-trigger]',
    onClose: () => {},
    active: mounted && !closing,
  })
  if (!mounted) return null
  return (
    <div ref={ref}>
      <button type="button" data-first>
        First
      </button>
    </div>
  )
}

function Screen({ open }) {
  return (
    <>
      <button type="button" data-trigger>
        Trigger
      </button>
      <Dialog open={open} />
    </>
  )
}

describe('motion and focus', () => {
  beforeEach(() => {
    Element.prototype.animate = vi.fn(() => ({ finished: new Promise(() => {}), cancel: vi.fn() }))
  })

  afterEach(() => {
    delete Element.prototype.animate
  })

  it('returns focus to the trigger as the exit starts, and refocuses the dialog when reopened mid-exit', () => {
    const { rerender } = render(<Screen open />)
    expect(screen.getByText('First')).toHaveFocus()

    rerender(<Screen open={false} />)
    expect(screen.getByText('Trigger')).toHaveFocus()
    expect(screen.getByText('First')).toBeInTheDocument()

    rerender(<Screen open />)
    expect(screen.getByText('First')).toHaveFocus()
  })

  it('replays the toast entrance for each new toast by rendering a fresh element', () => {
    const clock = createVirtualClock()
    const dispatch = vi.fn()
    const { rerender } = render(
      <ClockProvider clock={clock}>
        <Toast toast={{ id: 1, text: 'Not enough room' }} dispatch={dispatch} />
      </ClockProvider>,
    )
    const first = screen.getByRole('status')
    rerender(
      <ClockProvider clock={clock}>
        <Toast toast={{ id: 2, text: 'Not enough room' }} dispatch={dispatch} />
      </ClockProvider>,
    )
    expect(screen.getByRole('status')).not.toBe(first)
  })
})
