export function createRealClock() {
  return {
    now: () => performance.now(),
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
  }
}

function nextDue(timers, limit) {
  let best = null
  for (const timer of timers.values()) {
    if (timer.at > limit) continue
    if (best === null || timer.at < best.at || (timer.at === best.at && timer.id < best.id)) {
      best = timer
    }
  }
  return best
}

export function createVirtualClock() {
  const timers = new Map()
  let current = 0
  let nextId = 1

  return {
    now: () => current,
    setTimeout(fn, ms) {
      const id = nextId
      nextId += 1
      timers.set(id, { id, fn, at: current + Math.max(0, ms) })
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    advance(ms) {
      const target = current + ms
      for (let due = nextDue(timers, target); due !== null; due = nextDue(timers, target)) {
        timers.delete(due.id)
        current = Math.max(current, due.at)
        due.fn()
      }
      current = target
    },
  }
}
