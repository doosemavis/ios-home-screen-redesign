// Shared ffmpeg helpers: spawn with stderr capture, run to completion, and a
// streaming handle for piping frames in.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const HOMEBREW_BIN = '/opt/homebrew/bin'

// Env override wins; otherwise prefer Homebrew's binary, else fall back to PATH.
function resolveBinary(name, envValue) {
  if (envValue) return envValue
  const homebrew = `${HOMEBREW_BIN}/${name}`
  return existsSync(homebrew) ? homebrew : name
}

const FFMPEG = resolveBinary('ffmpeg', process.env.FFMPEG)
const STDERR_TAIL_BYTES = 4000

function collectTail(stream) {
  const state = { text: '' }
  stream.on('data', (chunk) => {
    state.text = (state.text + chunk.toString()).slice(-STDERR_TAIL_BYTES)
  })
  return state
}

function failure(args, code, signal, tail) {
  return new Error(`ffmpeg ${args.join(' ')} failed (code ${code}, signal ${signal})\n${tail}`)
}

// Starts ffmpeg; `done` resolves on exit 0 and rejects (with the stderr tail) otherwise.
export function spawnFfmpeg(args, { stdin = 'ignore' } = {}) {
  const child = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: [stdin, 'ignore', 'pipe'],
  })
  const tail = collectTail(child.stderr)
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code, signal) =>
      code === 0 ? resolve() : reject(failure(args, code, signal, tail.text)),
    )
  })
  done.catch(() => {})
  return { child, done }
}

export function runFfmpeg(args) {
  return spawnFfmpeg(args).done
}

// Writes a buffer to a stream, awaiting 'drain' when the pipe is full.
export function writeWithBackpressure(stream, buffer) {
  return new Promise((resolve, reject) => {
    const onError = (err) => reject(err)
    stream.once('error', onError)
    const ok = stream.write(buffer, () => {})
    if (ok) {
      stream.off('error', onError)
      resolve()
    } else {
      stream.once('drain', () => {
        stream.off('error', onError)
        resolve()
      })
    }
  })
}
