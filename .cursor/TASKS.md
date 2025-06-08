# TASKS.md

Eine Übersicht aller notwendigen Tasks zum Bau der MIDI-Generator-Apps. Reihenfolge ist chronologisch, Annahme: Projekt ist initialisiert und alle Pakete installiert.

---

## 1. Models definieren

- **Note.ts**: Interface mit `pitch: string`, `duration: string`, `velocity: number`.
- **Scale.ts**: Interface mit `name: string`, `notes: string[]`.
- **Rhythm.ts**: Interface mit `steps: string[]`, optional `weights: number[]`.
- **Melody.ts**: Interface mit `notes: Note[]`.
- **Config.ts**: Interface mit `bars: number`, `bpm: number`, AI-Config (`model`, `steps`, `temperature`).

## 2. Utils implementieren

- **random.ts**: Funktion `chooseWeighted<T>(items: T[], weights: number[]): T`.
- **markov.ts**: {}

  - Datenstruktur für Markov-Table (Bigram/Trigram).
  - Funktion `buildMarkov(data: string[][]): Table`.
  - Funktion `nextFromMarkov(prev: string): string`.

## 3. Services bauen

### 3.1 ScaleService

- Export von vordefinierten Skalen (`C-Dur`, `A-Moll`, ...).
- Funktion `getScale(name: string): Scale`.

### 3.2 RhythmService

- Erzeugung/Validierung von RhythmPattern basierend auf Steps + Weights.
- Funktion `generatePattern(length: number, weights?: number[]): RhythmPattern`.

### 3.3 MelodyService (regelbasiert)

- Funktion `generateMelody(scale: Scale, rhythm: RhythmPattern, bars: number): Melody`.
- Ablauf:

  1. Initial-Note zufällig aus Skala.
  2. Für jeden Rhythmus-Step: nächste Note über Markov.
  3. Velocity konstant oder leicht variieren.

### 3.4 AiMelodyService (KI-basiert)

- Integration von Magenta.js.
- Funktion `generateWithAI(scale: Scale, config: AIConfig): Promise<Melody>`.
- Ablauf:

  1. Modell laden (`new mm.MusicRNN(checkpointUrl)`).
  2. Seed-Sequence aus erster Skala-Note.
  3. `continueSequence(seed, config.steps, config.temperature)`.
  4. Konvertierung in unser `Melody`-Format.

### 3.5 MidiService

- Funktion `saveAsMidi(melody: Melody, bpm: number): void`.
- Nutzung von jsmidgen: Track anlegen, `addNote()` mit Duration umrechnen.
- Download-Mechanismus (`Blob`, `URL.createObjectURL`).

### 3.6 AudioService

- Funktion `playMelody(melody: Melody, bpm: number): Promise<void>`.
- Nutzung von Tone.js: `Synth().triggerAttackRelease()`.

## 4. Store (Pinia) anpassen

- State: `scale`, `rhythm`, `bars`, `bpm`, `useAI`, `aiConfig`, `melody`, `isGenerating`.
- Actions:

  - `setScale`, `setRhythm`, `setBars`, `setBpm`, `setUseAI`, `setAiConfig`.
  - `generate()`:

    - Prüfen, ob Skala + Rhythmus gesetzt.
    - Wenn `useAI`: AI-Service aufrufen (Schritte aus `bars` + Rhythmus berechnen).
    - Sonst: Regel-Service mit `bars`.

  - `playMelody()`, `exportMidi()`.

## 5. Komponenten umsetzen

### 5.1 ScaleSelector.vue

- Dropdown / Input für Skala.
- Ruft `store.setScale()` auf.

### 5.2 RhythmEditor.vue

- UI für RhythmPattern (Schritte + optionale Gewichte).
- Ruft `store.setRhythm()` auf.

### 5.3 LengthSelector.vue

- Auswahl 1–4 Bars.
- Ruft `store.setBars()` auf.

### 5.4 BpmSelector.vue

- Input/Slider für BPM.
- Ruft `store.setBpm()` auf.

### 5.5 AiSettings.vue

- Checkbox „use AI“. Dropdown für Modell, Inputs für `steps` + `temperature`.
- Ruft `store.setUseAI()`, `store.setAiConfig()` auf.

### 5.6 MelodyGenerator.vue

- Button „Generate“. Zeigt Loading-State.
- Ruft `store.generate()` auf.

### 5.7 MelodyVisualizer.vue

- Darstellung der generierten Melody (z.B. Pianoroll-Skizze).
- Liest `store.melody`.

### 5.8 Controls.vue

- Buttons „Play“ + „Download MIDI“.
- Ruft `store.playMelody()` + `store.exportMidi()` auf.

## 6. Dokumentation

- README: Kurze Beschreibung + Usage.

---

_Ende der Task-Liste._
