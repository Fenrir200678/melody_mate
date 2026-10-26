import { useMidiOutputStore } from '../stores/midi-output.store'
export function resetMidiOutput(): void {
  useMidiOutputStore().reset()
}
