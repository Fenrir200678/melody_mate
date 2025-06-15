export type GeneralMidiInstrument = {
  label: string
  items: {
    name: string
    value: number
  }[]
}

export const generalMidiInstruments: GeneralMidiInstrument[] = [
  {
    label: '🎹 Pianos',
    items: [
      { name: 'Acoustic Grand Piano', value: 0 },
      { name: 'Bright Acoustic Piano', value: 1 },
      { name: 'Electric Grand Piano', value: 2 },
      { name: 'Honky-Tonk Piano', value: 3 },
      { name: 'Electric Piano 1', value: 4 },
      { name: 'Electric Piano 2', value: 5 },
      { name: 'Harpsichord', value: 6 },
      { name: 'Clavinet', value: 7 }
    ]
  },

  {
    label: '🥁 Chromatic Percussion',
    items: [
      { name: 'Celesta', value: 8 },
      { name: 'Glockenspiel', value: 9 },
      { name: 'Music Box', value: 10 },
      { name: 'Vibraphone', value: 11 },
      { name: 'Marimba', value: 12 },
      { name: 'Xylophone', value: 13 },
      { name: 'Tubular Bells', value: 14 },
      { name: 'Dulcimer', value: 15 }
    ]
  },

  {
    label: '🎹 Organs',
    items: [
      { name: 'Drawbar Organ', value: 16 },
      { name: 'Percussive Organ', value: 17 },
      { name: 'Rock Organ', value: 18 },
      { name: 'Church Organ', value: 19 },
      { name: 'Reed Organ', value: 20 },
      { name: 'Accordion', value: 21 },
      { name: 'Harmonica', value: 22 },
      { name: 'Tango Accordion', value: 23 }
    ]
  },

  {
    label: '🎸 Guitars',
    items: [
      { name: 'Nylon String Guitar', value: 24 },
      { name: 'Steel String Guitar', value: 25 },
      { name: 'Jazz Guitar', value: 26 },
      { name: 'Clean Guitar', value: 27 },
      { name: 'Electric Muted Guitar', value: 28 },
      { name: 'Overdriven Guitar', value: 29 },
      { name: 'Distortion Guitar', value: 30 },
      { name: 'Guitar Harmonics', value: 31 }
    ]
  },

  {
    label: '🎸 Basses',
    items: [
      { name: 'Acoustic Bass', value: 32 },
      { name: 'Electric Bass (finger)', value: 33 },
      { name: 'Electric Bass (pick)', value: 34 },
      { name: 'Fretless Bass', value: 35 },
      { name: 'Slap Bass 1', value: 36 },
      { name: 'Slap Bass 2', value: 37 },
      { name: 'Synth Bass 1', value: 38 },
      { name: 'Synth Bass 2', value: 39 }
    ]
  },

  {
    label: '🎻 Solo Strings',
    items: [
      { name: 'Violin', value: 40 },
      { name: 'Viola', value: 41 },
      { name: 'Cello', value: 42 },
      { name: 'Contrabass', value: 43 },
      { name: 'Tremolo Strings', value: 44 },
      { name: 'Pizzicato Strings', value: 45 },
      { name: 'Orchestral Harp', value: 46 },
      { name: 'Timpani', value: 47 }
    ]
  },

  {
    label: '🎼 Ensemble',
    items: [
      { name: 'String Ensemble 1', value: 48 },
      { name: 'String Ensemble 2', value: 49 },
      { name: 'Synth Strings 1', value: 50 },
      { name: 'Synth Strings 2', value: 51 },
      { name: 'Choir Aahs', value: 52 },
      { name: 'Voice Oohs', value: 53 },
      { name: 'Synth Voice', value: 54 },
      { name: 'Orchestra Hit', value: 55 }
    ]
  },

  {
    label: '🎺 Brass',
    items: [
      { name: 'Trumpet', value: 56 },
      { name: 'Trombone', value: 57 },
      { name: 'Tuba', value: 58 },
      { name: 'Muted Trumpet', value: 59 },
      { name: 'French Horn', value: 60 },
      { name: 'Brass Section', value: 61 },
      { name: 'Synth Brass 1', value: 62 },
      { name: 'Synth Brass 2', value: 63 }
    ]
  },

  {
    label: '🎷 Reeds',
    items: [
      { name: 'Soprano Sax', value: 64 },
      { name: 'Alto Sax', value: 65 },
      { name: 'Tenor Sax', value: 66 },
      { name: 'Baritone Sax', value: 67 },
      { name: 'Oboe', value: 68 },
      { name: 'English Horn', value: 69 },
      { name: 'Bassoon', value: 70 },
      { name: 'Clarinet', value: 71 }
    ]
  },

  {
    label: '🎶 Pipes',
    items: [
      { name: 'Piccolo', value: 72 },
      { name: 'Flute', value: 73 },
      { name: 'Recorder', value: 74 },
      { name: 'Pan Flute', value: 75 },
      { name: 'Blown Bottle', value: 76 },
      { name: 'Shakuhachi', value: 77 },
      { name: 'Whistle', value: 78 },
      { name: 'Ocarina', value: 79 }
    ]
  },

  {
    label: '🎹 Synth Leads',
    items: [
      { name: 'Square Wave', value: 80 },
      { name: 'Saw Wave', value: 81 },
      { name: 'Synth Calliope', value: 82 },
      { name: 'Chiffer Lead', value: 83 },
      { name: 'Charang', value: 84 },
      { name: 'Solo Vox', value: 85 },
      { name: '5th Saw Wave', value: 86 },
      { name: 'Bass + Lead', value: 87 }
    ]
  },

  {
    label: '🎹 Synth Pads',
    items: [
      { name: 'Fantasia', value: 88 },
      { name: 'Warm Pad', value: 89 },
      { name: 'Polysynth', value: 90 },
      { name: 'Space Voice', value: 91 },
      { name: 'Bowed Glass', value: 92 },
      { name: 'Metal Pad', value: 93 },
      { name: 'Halo Pad', value: 94 },
      { name: 'Sweep Pad', value: 95 }
    ]
  },

  {
    label: '🎹 Synth Effects',
    items: [
      { name: 'Ice Rain', value: 96 },
      { name: 'Soundtrack', value: 97 },
      { name: 'Crystal', value: 98 },
      { name: 'Atmosphere', value: 99 },
      { name: 'Brightness', value: 100 },
      { name: 'Goblins', value: 101 },
      { name: 'Echo Drops', value: 102 },
      { name: 'Star Theme', value: 103 }
    ]
  },

  {
    label: '🎶 Ethnic',
    items: [
      { name: 'Sitar', value: 104 },
      { name: 'Banjo', value: 105 },
      { name: 'Shamisen', value: 106 },
      { name: 'Koto', value: 107 },
      { name: 'Kalimba', value: 108 },
      { name: 'Bagpipe', value: 109 },
      { name: 'Fiddle', value: 110 },
      { name: 'Shanai', value: 111 }
    ]
  }
]
