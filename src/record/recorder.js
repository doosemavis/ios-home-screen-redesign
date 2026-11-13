// The frame-stepping API the headless renderer drives (exposed as window.__recorder):
// advance(ms) moves the virtual clock, lets React commit, then steps every animation
// to the new virtual time (Ruling T9-b). Calls are serialized. Any failure (a scripted
// touch that would miss, an error thrown by a handler) is recorded in `error` and
// rejects that advance and every later one, so a bad render stops at the first frame.

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

export function createRecorder({ clock, stepper, flush, totalMs, whenReady }) {
  let error = null
  let disposed = false
  const report = (err) => {
    if (error === null) error = messageOf(err)
  }
  const failIfBroken = () => {
    if (error !== null) throw new Error(error)
  }

  const advanceOnce = async (ms) => {
    if (disposed) throw new Error('Recorder: disposed')
    failIfBroken()
    try {
      clock.advance(ms)
    } catch (err) {
      report(err)
    }
    failIfBroken()
    await flush()
    await stepper.step(clock.now())
    failIfBroken()
  }

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
    report,
    now: () => clock.now(),
    // A disposed recorder (an unmounted RecordApp) never moves the clock or steps again.
    dispose() {
      disposed = true
    },
    get error() {
      return error
    },
  }
}
