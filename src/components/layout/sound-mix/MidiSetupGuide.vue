<template>
  <details
    id="midi-setup-guide"
    :open="isOpen"
    class="border-daw-border bg-daw-panel rounded-control group text-2xs border"
    @toggle="onToggle"
  >
    <summary
      class="text-daw-text-muted hover:text-daw-text flex cursor-pointer items-center justify-between p-2.5 font-mono font-medium select-none"
    >
      <span class="flex items-center gap-2">
        <Info class="text-daw-signal h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span class="font-semibold">DAW Setup &amp; Routing Guide</span>
        <span class="border-daw-border bg-daw-surface text-daw-text-muted rounded-chip text-micro border px-1.5 py-0.5">
          macOS · Windows · Hardware
        </span>
      </span>
      <ChevronDown class="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
    </summary>

    <div class="border-daw-border border-t p-3">
      <div class="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <!-- Card 1: macOS Setup -->
        <div class="border-daw-border bg-daw-surface rounded-control flex flex-col gap-1.5 border p-2.5">
          <div class="flex items-center gap-1.5 font-mono font-semibold">
            <span class="text-daw-signal text-micro">01</span>
            <span class="text-daw-text text-2xs">macOS (IAC Driver)</span>
          </div>
          <ol class="text-daw-text-muted text-micro flex list-decimal flex-col gap-1 pl-3.5 font-mono leading-relaxed">
            <li>
              Open <code class="text-daw-signal font-semibold">Audio MIDI Setup</code> and show the MIDI Studio window
              (Window &gt; Show MIDI Studio or press <kbd>Cmd+2</kbd>).
            </li>
            <li>
              Double-click <code class="text-daw-signal">IAC Driver</code> and check &ldquo;Device is online&rdquo;.
            </li>
            <li>
              Select the IAC Bus above (or click Refresh ports if nothing appears), set track input in your DAW and arm
              the track.
            </li>
          </ol>
        </div>

        <!-- Card 2: Windows Setup -->
        <div class="border-daw-border bg-daw-surface rounded-control flex flex-col gap-1.5 border p-2.5">
          <div class="flex items-center gap-1.5 font-mono font-semibold">
            <span class="text-daw-signal text-micro">02</span>
            <span class="text-daw-text text-2xs">Windows (loopMIDI)</span>
          </div>
          <ol class="text-daw-text-muted text-micro flex list-decimal flex-col gap-1 pl-3.5 font-mono leading-relaxed">
            <li>
              Install and launch a virtual loopback MIDI device like
              <a
                href="https://www.tobias-erichsen.de/software/loopmidi.html"
                target="_blank"
                rel="noopener noreferrer"
                title="loopMIDI virtual MIDI cable Download Link"
                class="text-daw-signal font-semibold hover:underline"
              >
                loopMIDI
              </a>
              (free virtual cable).
            </li>
            <li>Create virtual ports (e.g. &ldquo;MM Lead&rdquo; and &ldquo;MM Chords&rdquo;).</li>
            <li>Click &ldquo;Refresh ports&rdquo; above and assign ports to tracks.</li>
          </ol>
        </div>

        <!-- Card 3: Signal Flow & Hardware -->
        <div class="border-daw-border bg-daw-surface rounded-control flex flex-col gap-1.5 border p-2.5">
          <div class="flex items-center gap-1.5 font-mono font-semibold">
            <span class="text-daw-signal text-micro">03</span>
            <span class="text-daw-text text-2xs">Signal Flow &amp; Hardware</span>
          </div>
          <div class="text-daw-text-muted text-micro flex flex-col gap-1 font-mono leading-relaxed">
            <p>
              <strong class="text-daw-text">No Audio Return:</strong> MIDI transmits raw note events. Audio sound
              generation happens inside your DAW or hardware synth.
            </p>
            <p>
              <strong class="text-daw-text">USB Hardware:</strong> Plug in your synthesizer or MIDI interface and hit
              &ldquo;Refresh ports&rdquo;.
            </p>
            <p>
              <strong class="text-daw-danger">Experimental:</strong> Since I don't have a hardware synth, this has only
              been tested on macOS 27 and Ableton Live 12 via IAC bus so far. I'd appreciate any
              <a
                href="https://github.com/Fenrir200678/melody_mate/issues"
                target="_blank"
                rel="noopener noreferrer"
                title="Provide feedback"
                class="text-daw-signal font-semibold hover:underline"
                >feedback</a
              >
              here.
            </p>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
  import { ChevronDown, Info } from '@lucide/vue'

  const isOpen = defineModel<boolean>('open', { default: false })

  function onToggle(e: Event): void {
    const target = e.currentTarget as HTMLDetailsElement | null
    if (target) {
      isOpen.value = target.open
    }
  }
</script>
