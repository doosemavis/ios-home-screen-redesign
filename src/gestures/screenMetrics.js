// Geometry of the phone screen in viewport pixels. The phone is scaled with CSS
// zoom, so pointer distances (viewport px) are divided by `scale` to get phone px.
export function measureScreen(element) {
  if (!element) return { left: 0, top: 0, right: 0, scale: 1 }
  const rect = element.getBoundingClientRect()
  const layoutWidth = element.offsetWidth
  const scale = layoutWidth > 0 && rect.width > 0 ? rect.width / layoutWidth : 1
  return { left: rect.left, top: rect.top, right: rect.right, scale }
}
