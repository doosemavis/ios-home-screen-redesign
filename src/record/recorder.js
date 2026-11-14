// The frame-stepping API the headless renderer drives (exposed as window.__recorder):
// advance(ms) moves the virtual clock, lets React commit, then steps every animation
// to the new virtual time (Ruling T9-b). Calls are serialized. Any failure (a scripted
// touch that would miss, an error thrown by a handler) is recorded in `error` and
// rejects that advance and every later one, so a bad render stops at the first frame.

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

// First failure wins: later errors are usually fallout from the first one.
function createErrorBox() {
  let error = null
  return {
    report: (err) => {
      if (error === null) error = messageOf(err)
    },
    throwIfBroken: () => {
      if (error !== null) throw new Error(error)
    },
    get: () => error,
  }
}

// One frame: move the clock, let React commit, then step every animation to the new
// time. A failure in either step is reported and rejects this advance.
function makeAdvanceOnce({ clock, stepper, flush, errors, isDisposed }) {
  return async (ms) => {
    if (isDisposed()) throw new Error('Recorder: disposed')
    errors.throwIfBroken()
    try {
      clock.advance(ms)
    } catch (err) {
      errors.report(err)
    }
    errors.throwIfBroken()
    await flush()
    try {
      await stepper.step(clock.now())
    } catch (err) {
      errors.report(err)
    }
    errors.throwIfBroken()
  }
}

export function createRecorder({ clock, stepper, flush, totalMs, whenReady }) {
  let disposed = false
  const errors = createErrorBox()
  const advanceOnce = makeAdvanceOnce({ clock, stepper, flush, errors, isDisposed: () => disposed })

  // Frame 0: fonts loaded and the first commit done, then t=0 timers fire and every
  // animation is paused at its start.
  const ready = whenReady().then(() => (disposed ? undefined : advanceOnce(0)))
  let queue = ready.catch(() => {})
  const advance = (ms) => {
    if (!Number.isFinite(ms) || ms < 0) return Promise.reject(new Error(`Recorder: cannot advance by ${ms} ms`))
    const run = queue.then(() => advanceOnce(ms))
    queue = run.catch(() => {})
    return run
  }

  return {
    totalMs,
    ready,
    advance,
    report: errors.report,
    now: () => clock.now(),
    // A disposed recorder (an unmounted RecordApp) never moves the clock or steps again.
    dispose() {
      disposed = true
    },
    get error() {
      return errors.get()
    },
  }
}
