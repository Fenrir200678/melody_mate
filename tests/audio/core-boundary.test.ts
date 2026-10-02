/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : []
  })
}

describe('pure core boundary', () => {
  it('does not import browser audio runtime into core', () => {
    const violations = sourceFiles('src/core').filter((file) => {
      const source = readFileSync(file, 'utf8')
      return [...source.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g)].some((match) => {
        const module = match[1]
        return (
          /^(?:tone|vue|pinia|@vueuse\/)/.test(module) ||
          (module.startsWith('.') && resolve(dirname(file), module).startsWith(resolve('src/audio') + sep))
        )
      })
    })
    expect(violations).toEqual([])
  })

  it('keeps live MIDI contracts free of browser APIs and port objects', () => {
    const violations = sourceFiles('src/core/midi').filter((file) => {
      if (file.endsWith('midi-exporter.ts')) return false
      return /\b(?:MIDIAccess|MIDIPort|MIDIOutput|MIDIInput|requestMIDIAccess)\b|\b(?:navigator|window|document|performance)\s*[.(<:]|\b(?:from|import)\s*\(?\s*['"](?:vue|pinia|tone)/.test(
        readFileSync(file, 'utf8')
      )
    })
    expect(violations).toEqual([])
  })
})
