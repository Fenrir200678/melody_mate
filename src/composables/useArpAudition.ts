import { computed } from 'vue'
import type { ArpCandidate } from '../core/generator/arp-candidate'
import { useAudioStore } from '../stores/audio.store'
import { useProjectStore } from '../stores/project.store'

const ARP_AUDITION_PREFIX = 'arp-candidate:'

export function arpAuditionId(candidate: ArpCandidate): string {
  return `${ARP_AUDITION_PREFIX}${candidate.revision}`
}

/** Auditions the displayed candidate through the shared preview path; never touches project or take data. */
export function useArpAudition(getReadyCandidate: () => ArpCandidate | null) {
  const isAuditioningArp = computed(() => useAudioStore().auditioningId?.startsWith(ARP_AUDITION_PREFIX) ?? false)

  async function auditionArp(): Promise<void> {
    const candidate = getReadyCandidate()
    if (!candidate) return
    const { range } = candidate.inputs
    await useAudioStore().auditionNotes(candidate.notes, useProjectStore().bpm, arpAuditionId(candidate), {
      originStep: range.startStep,
      durationSteps: range.endStep - range.startStep
    })
  }

  function stopArpAudition(): void {
    const audioStore = useAudioStore()
    if (audioStore.auditioningId?.startsWith(ARP_AUDITION_PREFIX)) audioStore.stopNotesAudition()
  }

  return { isAuditioningArp, auditionArp, stopArpAudition }
}
