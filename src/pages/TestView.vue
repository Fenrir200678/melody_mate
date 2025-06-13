<script lang="ts">
import midiWriterJs from 'midi-writer-js'

const track = new midiWriterJs.Track()

track.addEvent(new midiWriterJs.ProgramChangeEvent({ instrument: 39 }))
track.setTempo(125, 0)

const notes = ['D4', 'C#4', 'D4', 'D#4', 'G4', 'F4', 'G4', 'G#4']

for (let i = 0; i < notes.length; i++) {
  const n = notes[i]
  const e = new midiWriterJs.NoteEvent({ pitch: n, duration: '4' })
  track.addEvent(e)
}

const write = new midiWriterJs.Writer(track)

const player = document.getElementById('player')
const v_staff = document.getElementById('staffVisualizer')
const v_roll = document.getElementById('pianoRollVisualizer')
const v_waterfall = document.getElementById('waterfallVisualizer')

player.src = write.dataUri()
v_staff.src = write.dataUri()
v_roll.src = write.dataUri()
v_waterfall.src = write.dataUri()

player.addVisualizer(v_staff)
player.addVisualizer(v_roll)
player.addVisualizer(v_waterfall)
</script>
<template>
  #
  <midi-player id="player" src="" sound-font> </midi-player>

  <midi-visualizer type="piano-roll" class="visualizer" id="pianoRollVisualizer"></midi-visualizer>
  <midi-visualizer type="waterfall" class="visualizer" id="waterfallVisualizer"></midi-visualizer>
  <midi-visualizer type="staff" class="visualizer" id="staffVisualizer"></midi-visualizer>
</template>
