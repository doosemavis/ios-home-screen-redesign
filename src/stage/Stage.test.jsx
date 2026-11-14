import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Stage } from './Stage.jsx'
import { CAPTIONS, HEADLINE } from './copy.js'

const SCENES = ['intro', 'one-app', 'several-apps', 'snap', 'into-folder', 'new-folder', 'out-of-folder']

describe('Stage', () => {
  it('renders the headline, phone and caption in record mode', () => {
    const { getByText, container } = render(
      <Stage mode="record" caption={CAPTIONS['one-app']}>
        <div data-testid="phone" />
      </Stage>,
    )
    expect(getByText(HEADLINE)).toBeInTheDocument()
    expect(getByText(CAPTIONS['one-app'])).toBeInTheDocument()
    expect(container.querySelector('[data-stage="record"] [data-testid="phone"]')).not.toBeNull()
  })

  it('renders only the phone in hand mode', () => {
    const { container } = render(
      <Stage mode="hand">
        <div data-testid="phone" />
      </Stage>,
    )
    expect(container.querySelector('[data-stage="hand"] [data-testid="phone"]')).not.toBeNull()
    expect(container.querySelector('[data-fade-out]')).toBeNull()
  })

  it('covers the stage with a blank white fade when asked, with no text', () => {
    const { container } = render(
      <Stage mode="record" fadeOut>
        <div />
      </Stage>,
    )
    const fade = container.querySelector('[data-fade-out]')
    expect(fade).not.toBeNull()
    expect(fade.textContent).toBe('')
  })

  it('does not fade by default', () => {
    const { container } = render(
      <Stage mode="record">
        <div />
      </Stage>,
    )
    expect(container.querySelector('[data-fade-out]')).toBeNull()
  })
})

describe('copy', () => {
  it('uses the agreed headline', () => {
    expect(HEADLINE).toBe('A different way to organize your iPhone.')
  })

  it('has a short caption for every scene', () => {
    SCENES.forEach((id) => {
      expect(typeof CAPTIONS[id], id).toBe('string')
      expect(CAPTIONS[id].length, id).toBeGreaterThan(0)
      expect(CAPTIONS[id].length, id).toBeLessThanOrEqual(40)
    })
  })

  it('has captions only for the scripted scenes (the end scene fades to white)', () => {
    expect(Object.keys(CAPTIONS)).toEqual(SCENES)
  })
})
