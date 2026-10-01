/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

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
      return /from ['"]tone['"]|from ['"][^'"]*\/audio\/(?:mixer|playback-engine|instruments|transport-adapter)/.test(
        source
      )
    })
    expect(violations).toEqual([])
  })
})
