import { spawnSync } from 'node:child_process'

const args = ['-S', 'plugin', '-B', 'plugin/build']
if (process.platform === 'darwin') {
  args.push(
    '-G',
    'Ninja',
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_OSX_ARCHITECTURES=arm64',
    '-DCMAKE_OSX_DEPLOYMENT_TARGET=14.0'
  )
} else if (process.platform === 'win32') {
  args.push('-G', 'Visual Studio 17 2022', '-A', 'x64')
  if (process.env.JUCE_WEBVIEW2_PACKAGE_LOCATION) {
    args.push(`-DJUCE_WEBVIEW2_PACKAGE_LOCATION=${process.env.JUCE_WEBVIEW2_PACKAGE_LOCATION}`)
  }
} else {
  throw new Error('The native plugin build supports macOS and Windows only.')
}

args.push(...process.argv.slice(2))
const result = spawnSync('cmake', args, { stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
