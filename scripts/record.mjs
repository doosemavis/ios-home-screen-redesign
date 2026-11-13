// Renders ?record frame by frame into out/demo.mp4 (1080x1350, 60fps) and writes
// out/scenes.json. Builds, serves via vite preview on a free port, always cleans up.
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { getSceneBounds } from '../src/record/timeline.js'
import { spawnFfmpeg, writeWithBackpressure } from './lib/ffmpeg.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out')
const STAGE = { x: 0, y: 0, width: 540, height: 675 }
const FPS = 60
const FRAME_MS = 1000 / FPS
const RESERVED_PORTS = new Set([5173, 5174])
const log = (msg) => process.stdout.write(`${msg}\n`)
const VITE = path.join(ROOT, 'node_modules', '.bin', 'vite')

function runToCompletion(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))))
  })
}

function probePort(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
  })
}

async function findFreePort() {
  for (let port = 4300; port < 4400; port += 1) {
    if (!RESERVED_PORTS.has(port) && (await probePort(port))) return port
  }
  throw new Error('No free port found in 4300-4399')
}

async function waitForServer(url, child) {
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null) throw new Error(`vite preview exited early (${child.exitCode})`)
    try {
      if ((await fetch(url)).ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`vite preview did not start at ${url}`)
}

function startPreview(port) {
  return spawn(VITE, ['preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
  })
}

async function renderFrames(page, ffmpegIn, frames) {
  const step = Math.max(1, Math.floor(frames / 10))
  for (let i = 0; i < frames; i += 1) {
    await page.evaluate((ms) => window.__recorder.advance(ms), FRAME_MS)
    const error = await page.evaluate(() => window.__recorder.error)
    if (error) throw new Error(`Recorder error at frame ${i}: ${error}`)
    const png = await page.screenshot({ type: 'png', clip: STAGE })
    await writeWithBackpressure(ffmpegIn, png)
    if ((i + 1) % step === 0) log(`  ${Math.round(((i + 1) / frames) * 100)}% (${i + 1}/${frames})`)
  }
  return frames
}

async function record(port) {
  const browser = await chromium.launch()
  const encoder = spawnFfmpeg(
    [
      '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow',
      '-movflags', '+faststart', path.join(OUT, 'demo.mp4'),
    ],
    { stdin: 'pipe' },
  )
  try {
    const context = await browser.newContext({
      viewport: { width: STAGE.width, height: STAGE.height },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${port}/?record`)
    await page.waitForFunction(() => window.__recorder !== undefined)
    await page.evaluate(() => window.__recorder.ready)
    const totalMs = await page.evaluate(() => window.__recorder.totalMs)
    const frames = Math.round(totalMs / FRAME_MS)
    log(`Rendering ${frames} frames (${totalMs} ms @ ${FPS}fps)`)
    await renderFrames(page, encoder.child.stdin, frames)
    encoder.child.stdin.end()
    await encoder.done
    log(`Rendered ${frames} frames -> out/demo.mp4`)
    return totalMs
  } catch (err) {
    encoder.child.kill('SIGKILL')
    throw err
  } finally {
    await browser.close()
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await runToCompletion(VITE, ['build'])
  const port = await findFreePort()
  const preview = startPreview(port)
  const stop = () => preview.kill('SIGTERM')
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stop(); process.exit(130) })
  try {
    await waitForServer(`http://127.0.0.1:${port}/?record`, preview)
    await record(port)
    await writeFile(path.join(OUT, 'scenes.json'), `${JSON.stringify(getSceneBounds(), null, 2)}\n`)
  } finally {
    stop()
  }
}

main().catch((err) => {
  process.stderr.write(`record failed: ${err.stack ?? err}\n`)
  process.exit(1)
})
