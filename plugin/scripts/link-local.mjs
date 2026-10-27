import { mkdirSync, symlinkSync, existsSync, readlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform === 'win32') {
  throw new Error(
    'Automatic local VST3 linking is macOS-only. Copy the VST3 bundle to your Windows VST3 folder manually.'
  )
}

const bundle = fileURLToPath(
  new URL('../build/MelodyMatePrototype_artefacts/Release/VST3/Melody Mate Prototype.vst3', import.meta.url)
)
if (!existsSync(bundle)) throw new Error('Run pnpm plugin:build first.')
const folder = join(homedir(), 'Library/Audio/Plug-Ins/VST3')
const destination = join(folder, 'Melody Mate Prototype.vst3')
mkdirSync(folder, { recursive: true })
try {
  symlinkSync(bundle, destination)
} catch (error) {
  if (error.code !== 'EEXIST' || readlinkSync(destination) !== bundle) throw error
}
console.log(`Local development plugin: ${destination}`)
