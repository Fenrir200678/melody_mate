import { MidiAccessManager } from './access-manager'
import { cancelMidiPortScope, disconnectMidiPort } from './port-queue'

let runtime: { manager: MidiAccessManager; owners: number } | undefined

export function acquireMidiAccessManager() {
  if (!runtime || runtime.manager.getSnapshot().disposed) {
    const manager = new MidiAccessManager()
    manager.setCleanupHook(({ port, track, reason }) => {
      if (reason === 'disconnect') disconnectMidiPort(port)
      else cancelMidiPortScope(port, { track })
    })
    runtime = { manager, owners: 0 }
  }
  const current = runtime
  ++current.owners
  let released = false
  return {
    manager: current.manager,
    release() {
      if (released) return
      released = true
      if (--current.owners === 0) void current.manager.dispose()
    }
  }
}
