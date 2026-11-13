import { createElement } from 'react'
import { GLYPHS } from './glyphs.js'

// Renders a line-art glyph; stroke color and width come from the parent's CSS.
export function Glyph({ name, className }) {
  const shapes = GLYPHS[name] ?? []
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {shapes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  )
}
