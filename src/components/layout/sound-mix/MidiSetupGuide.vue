<template>
  <details class="border-daw-border bg-daw-panel rounded-control group text-2xs border">
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
          <ol class="text-daw-text-muted text-micro flex flex-col gap-1 font-mono leading-relaxed list-decimal pl-3.5">
            <li>
              Open <code class="text-daw-signal font-semibold">Audio MIDI Setup</code> and show the MIDI Studio window.
            </li>
            <li>Double-click <code class="text-daw-signal">IAC Driver</code> and check &ldquo;Device is online&rdquo;.</li>
            <li>Select the IAC Bus above, set track input in your DAW, and arm the track.</li>
          </ol>
        </div>

        <!-- Card 2: Windows Setup -->
        <div class="border-daw-border bg-daw-surface rounded-control flex flex-col gap-1.5 border p-2.5">
          <div class="flex items-center gap-1.5 font-mono font-semibold">
            <span class="text-daw-signal text-micro">02</span>
            <span class="text-daw-text text-2xs">Windows (loopMIDI)</span>
          </div>
          <ol class="text-daw-text-muted text-micro flex flex-col gap-1 font-mono leading-relaxed list-decimal pl-3.5">
            <li>Install and launch <code class="text-daw-signal font-semibold">loopMIDI</code> (free virtual cable).</li>
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
          </div>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
  import { ChevronDown, Info } from '@lucide/vue'
</script>
