import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const executablePath =
  process.platform === 'win32'
    ? '../build/PluginProbe_artefacts/Release/Melody Mate VST3 Probe.exe'
    : '../build/PluginProbe_artefacts/Release/Melody Mate VST3 Probe.app/Contents/MacOS/Melody Mate VST3 Probe'
const executable = fileURLToPath(new URL(executablePath, import.meta.url))
const bundle = fileURLToPath(
  new URL('../build/MelodyMatePrototype_artefacts/Release/VST3/Melody Mate Prototype.vst3', import.meta.url)
)
if (!existsSync(executable) || !existsSync(bundle)) throw new Error('Run pnpm plugin:build first.')
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--state' || args[i] === '--save') && args[i + 1]) args[++i] = resolve(args[i])
}
const result = spawnSync(executable, [bundle, ...args], { stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
