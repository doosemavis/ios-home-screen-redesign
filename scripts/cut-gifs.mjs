// Cuts each scene of out/demo.mp4 into a 540px/20fps GIF and an H.264 MP4. The closing
// fade to white is video-only, so it gets no clip.
import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runFfmpeg } from './lib/ffmpeg.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out')
const SOURCE = path.join(OUT, 'demo.mp4')
const GIF_DIR = path.join(OUT, 'gifs')
const MAX_GIF_BYTES = 8 * 1024 * 1024
const DEFAULT = { fps: 20, width: 540 }
const VIDEO_ONLY_SCENES = new Set(['end'])
// Fallbacks tried in order when a GIF exceeds the size cap.
const FALLBACKS = [{ fps: 15, width: 540 }, { fps: 12, width: 480 }, { fps: 10, width: 420 }]
const log = (msg) => process.stdout.write(`${msg}\n`)

const seconds = (ms) => (ms / 1000).toFixed(3)

function cutArgs(scene) {
  return ['-i', SOURCE, '-ss', seconds(scene.startMs), '-t', seconds(scene.endMs - scene.startMs)]
}

function gifFilter({ fps, width }) {
  const base = `fps=${fps},scale=${width}:-1:flags=lanczos`
  return `${base},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`
}

// palettegen and paletteuse share one filter graph via split: two passes over the
// same decoded cut, no temp palette file.
async function cutGif(scene, base, opts) {
  const dest = `${base}.gif`
  await runFfmpeg([...cutArgs(scene), '-filter_complex', gifFilter(opts), '-loop', '0', dest])
  return { dest, size: (await stat(dest)).size }
}

async function cutGifWithCap(scene, base) {
  let used = DEFAULT
  let result = await cutGif(scene, base, used)
  for (const fallback of FALLBACKS) {
    if (result.size <= MAX_GIF_BYTES) break
    used = fallback
    result = await cutGif(scene, base, used)
  }
  return { ...result, used }
}

async function cutMp4(scene, base) {
  const dest = `${base}.mp4`
  await runFfmpeg([
    ...cutArgs(scene), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16',
    '-preset', 'slow', '-r', '60', '-an', '-movflags', '+faststart', dest,
  ])
  return { dest, size: (await stat(dest)).size }
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

async function main() {
  const scenes = JSON.parse(await readFile(path.join(OUT, 'scenes.json'), 'utf8'))
  await mkdir(GIF_DIR, { recursive: true })
  const clipped = scenes.filter((scene) => !VIDEO_ONLY_SCENES.has(scene.id))
  for (const [index, scene] of clipped.entries()) {
    const base = path.join(GIF_DIR, `${String(index + 1).padStart(2, '0')}-${scene.id}`)
    const gif = await cutGifWithCap(scene, base)
    const mp4 = await cutMp4(scene, base)
    const note = gif.used === DEFAULT ? '' : ` [reduced to ${gif.used.fps}fps ${gif.used.width}px]`
    log(`${path.basename(gif.dest)} ${mb(gif.size)}${note}  ${path.basename(mp4.dest)} ${mb(mp4.size)}`)
  }
}

main().catch((err) => {
  process.stderr.write(`gifs failed: ${err.stack ?? err}\n`)
  process.exit(1)
})
