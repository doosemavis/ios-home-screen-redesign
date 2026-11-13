const same = (a, b) => a.type === b.type && a.id === b.id

export function toggleRef(selection, ref) {
  return selection.some((r) => same(r, ref))
    ? selection.filter((r) => !same(r, ref))
    : [...selection, ref]
}
