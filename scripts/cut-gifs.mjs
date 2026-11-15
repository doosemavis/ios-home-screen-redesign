// Cuts each scene of out/demo.mp4 into a 540px/20fps GIF and an H.264 MP4. The closing
// fade to white is video-only, so it gets no clip. With --readme it writes smaller
// GIFs, and no MP4s, into docs/media/ for the README.
import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runFfmpeg } from './lib/ffmpeg.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out')
const SOURCE = path.join(OUT, 'demo.mp4')
const VIDEO_ONLY_SCENES = new Set(['end'])
const MB = 1024 * 1024
// Fallbacks are tried in order when a GIF exceeds its preset's size cap.
const PRESETS = {
  share: {
    dir: path.join(OUT, 'gifs'),
    maxBytes: 8 * MB,
    size: { fps: 20, width: 540 },
    fallbacks: [{ fps: 15, width: 540 }, { fps: 12, width: 480 }, { fps: 10, width: 420 }],
    mp4: true,
  },
  readme: {
    dir: path.join(ROOT, 'docs', 'media'),
    maxBytes: 4 * MB,
    size: { fps: 20, width: 360 },
    fallbacks: [{ fps: 15, width: 360 }, { fps: 12, width: 320 }],
    mp4: false,
  },
}
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

async function cutGifWithCap(scene, base, preset) {
  let used = preset.size
  let result = await cutGif(scene, base, used)
  for (const fallback of preset.fallbacks) {
    if (result.size <= preset.maxBytes) break
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
  const preset = process.argv.includes('--readme') ? PRESETS.readme : PRESETS.share
  const scenes = JSON.parse(await readFile(path.join(OUT, 'scenes.json'), 'utf8'))
  await mkdir(preset.dir, { recursive: true })
  const clipped = scenes.filter((scene) => !VIDEO_ONLY_SCENES.has(scene.id))
  for (const [index, scene] of clipped.entries()) {
    const base = path.join(preset.dir, `${String(index + 1).padStart(2, '0')}-${scene.id}`)
    const gif = await cutGifWithCap(scene, base, preset)
    const note = gif.used === preset.size ? '' : ` [reduced to ${gif.used.fps}fps ${gif.used.width}px]`
    const mp4 = preset.mp4 ? await cutMp4(scene, base) : null
    const mp4Note = mp4 ? `  ${path.basename(mp4.dest)} ${mb(mp4.size)}` : ''
    log(`${path.basename(gif.dest)} ${mb(gif.size)}${note}${mp4Note}`)
  }
}

main().catch((err) => {
  process.stderr.write(`gifs failed: ${err.stack ?? err}\n`)
  process.exit(1)
})
