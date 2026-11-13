// Picks a glyph ink ('light' or 'dark') that stays legible on an icon gradient.
const DARK_INK_LUMINANCE = 0.62

function expandHex(hex) {
  const raw = hex.replace('#', '')
  return raw.length === 3 ? [...raw].map((ch) => ch + ch).join('') : raw
}

function channel(value) {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const full = expandHex(hex)
  const [red, green, blue] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function glyphInk(gradient) {
  const average = gradient.reduce((sum, color) => sum + luminance(color), 0) / gradient.length
  return average > DARK_INK_LUMINANCE ? 'dark' : 'light'
}
