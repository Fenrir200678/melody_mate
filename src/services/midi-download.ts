/**
 * Triggers browser download of a MIDI blob. Safe to call in SSR / test environments.
 */
export function downloadMidiFile(blob: Blob, filename = 'MelodyMate-Export.mid'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.mid') ? filename : `${filename}.mid`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // Delay revoke to avoid premature stream termination in Firefox/Safari
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
