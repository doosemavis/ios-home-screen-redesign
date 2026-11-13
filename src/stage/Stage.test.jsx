import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Stage } from './Stage.jsx'
import { CAPTIONS, HEADLINE, REPO_URL, TAKEAWAY } from './copy.js'

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
    const { container, queryByText } = render(
      <Stage mode="hand">
        <div data-testid="phone" />
      </Stage>,
    )
    expect(container.querySelector('[data-stage="hand"] [data-testid="phone"]')).not.toBeNull()
    expect(queryByText(TAKEAWAY)).toBeNull()
  })

  it('shows the end card with the takeaway and repo link when asked', () => {
    const { container, getByText } = render(
      <Stage mode="record" showEndCard>
        <div />
      </Stage>,
    )
    expect(container.querySelector('[data-end-card="visible"]')).not.toBeNull()
    expect(getByText(TAKEAWAY)).toBeInTheDocument()
    expect(getByText(REPO_URL)).toBeInTheDocument()
  })

  it('keeps the end card hidden by default', () => {
    const { container } = render(
      <Stage mode="record">
        <div />
      </Stage>,
    )
    expect(container.querySelector('[data-end-card="visible"]')).toBeNull()
  })
})

describe('copy', () => {
  it('uses the agreed placeholder copy and repo url', () => {
    expect(HEADLINE).toBe('A calmer way to organize your iPhone.')
    expect(TAKEAWAY).toBe(
      'Organize your home screen with taps — nothing moves unless you move it.',
    )
    expect(REPO_URL).toBe('github.com/doosemavis/ios-home-screen-redesign')
  })

  it('has a short caption for every scene', () => {
    SCENES.forEach((id) => {
      expect(typeof CAPTIONS[id], id).toBe('string')
      expect(CAPTIONS[id].length, id).toBeGreaterThan(0)
      expect(CAPTIONS[id].length, id).toBeLessThanOrEqual(40)
    })
  })

  it('has captions only for the scripted scenes (the end scene shows the end card)', () => {
    expect(Object.keys(CAPTIONS)).toEqual(SCENES)
  })
})
