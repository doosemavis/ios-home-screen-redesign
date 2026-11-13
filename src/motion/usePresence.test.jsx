import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHeld, usePresence } from './usePresence.js'

const exitFade = (el) => [el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 })]

function Harness({ open }) {
  const { mounted, closing, ref } = usePresence(open, exitFade)
  if (!mounted) return null
  return <div ref={ref} data-testid="panel" data-closing={String(closing)} />
}

function controllableAnimation() {
  let finish
  const finished = new Promise((resolve) => {
    finish = resolve
  })
  return { finished, finish, cancel: vi.fn() }
}

describe('usePresence', () => {
  let animations

  beforeEach(() => {
    animations = []
    Element.prototype.animate = vi.fn(() => {
      const animation = controllableAnimation()
      animations.push(animation)
      return animation
    })
  })

  afterEach(() => {
    delete Element.prototype.animate
  })

  it('keeps the element mounted in a closing state until the exit animation finishes', async () => {
    const { rerender } = render(<Harness open />)
    rerender(<Harness open={false} />)

    expect(screen.getByTestId('panel')).toHaveAttribute('data-closing', 'true')
    expect(animations).toHaveLength(1)

    await act(async () => animations[0].finish())
    expect(screen.queryByTestId('panel')).toBeNull()
  })

  it('unmounts immediately when Element.animate is unavailable', () => {
    delete Element.prototype.animate
    const { rerender } = render(<Harness open />)
    rerender(<Harness open={false} />)
    expect(screen.queryByTestId('panel')).toBeNull()
  })

  it('cancels the exit and stays mounted when reopened mid-exit', async () => {
    const { rerender } = render(<Harness open />)
    rerender(<Harness open={false} />)
    rerender(<Harness open />)

    expect(animations[0].cancel).toHaveBeenCalled()
    await act(async () => animations[0].finish())
    expect(screen.getByTestId('panel')).toHaveAttribute('data-closing', 'false')
  })

  it('stays unmounted while closed', () => {
    render(<Harness open={false} />)
    expect(screen.queryByTestId('panel')).toBeNull()
  })
})

function HeldLabel({ open, label }) {
  const held = useHeld(open, { label })
  return <p data-testid="label">{held.label}</p>
}

describe('useHeld', () => {
  it('follows the values while open and keeps the last open values once closed', () => {
    const { rerender } = render(<HeldLabel open label="Move 2 apps" />)
    rerender(<HeldLabel open label="Move 3 apps" />)
    expect(screen.getByTestId('label')).toHaveTextContent('Move 3 apps')

    rerender(<HeldLabel open={false} label="Move 0 apps" />)
    expect(screen.getByTestId('label')).toHaveTextContent('Move 3 apps')

    rerender(<HeldLabel open label="Move 1 app" />)
    expect(screen.getByTestId('label')).toHaveTextContent('Move 1 app')
  })
})
