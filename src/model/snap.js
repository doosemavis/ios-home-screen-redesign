const isWidget = (cell) => cell !== null && cell.type === 'widget'

export function snapPage(layout, page) {
  const cells = layout.pages[page]
  if (cells === undefined) return layout
  const queue = cells.filter((c) => c !== null && !isWidget(c))
  let next = 0
  const snapped = cells.map((cell) => {
    if (isWidget(cell)) return cell
    const placed = queue[next] ?? null
    next += 1
    return placed
  })
  return { ...layout, pages: layout.pages.map((p, i) => (i === page ? snapped : p)) }
}

export function isPageSnapped(layout, page) {
  const cells = layout.pages[page]
  if (cells === undefined) return true
  return JSON.stringify(snapPage(layout, page).pages[page]) === JSON.stringify(cells)
}
