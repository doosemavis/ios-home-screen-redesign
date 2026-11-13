// Lists every cell, dock slot and folder that differs between two layouts.
export function diffLayouts(a, b) {
  const diffs = []
  a.pages.forEach((p, pi) =>
    p.forEach((c, si) => {
      if (JSON.stringify(c) !== JSON.stringify(b.pages[pi][si])) diffs.push(`page:${pi}:${si}`)
    }),
  )
  a.dock.forEach((c, si) => {
    if (JSON.stringify(c) !== JSON.stringify(b.dock[si])) diffs.push(`dock:${si}`)
  })
  Object.keys({ ...a.folders, ...b.folders }).forEach((id) => {
    if (JSON.stringify(a.folders[id]) !== JSON.stringify(b.folders[id])) diffs.push(`folder:${id}`)
  })
  return diffs.sort()
}
