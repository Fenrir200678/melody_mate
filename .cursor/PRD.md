# Product Requirements Document (PRD)

## 1. Überblick

Ein webbasierter MIDI-Melodie-Generator auf Basis von Vue 3 und TypeScript, der sowohl regelbasierte (Markov) als auch KI-gestützte (Magenta.js) Melodien erzeugt, als MIDI abspielt bzw. exportiert und um Parameter wie Skala, Rhythmus, Länge (1–4 Bars) und Tempo (BPM) erweitert ist. Zukünftig sollen Akkordprogressions und Basslinien ergänzt werden können.

## 2. Ziele

- **Flexibilität:** Wahl zwischen Regel-Generator und KI-Generator.
- **Eingängigkeit:** Harmonische, „catchy“ Melodien innerhalb gewählter Skala.
- **Customizing:** Skala, Rhythmus, Länge (1–4 Bars), BPM und AI-Parameter.
- **Usability:** Klarer Workflow: Skala → Rhythmus → Länge & BPM → AI-Optionen → Generieren → Abspielen/Export.
- **Erweiterbarkeit:** Roadmap für Akkordprogressions- und Basslinien-Generator.

## 3. Zielgruppe

- Musik-Hobbyist:innen ohne tiefe Programmierkenntnisse
- Web-Developer:innen und musikalische Kreative
- Entwickler:innen, die eine Basis für eigene Melodie-Projekte suchen

## 4. User Stories

1. **Skala wählen:** Als Nutzer:in will ich eine Skala auswählen, damit alle Töne harmonisch sind.
2. **Rhythmus definieren:** Als Nutzer:in will ich ein Rhythmus-Pattern einstellen, um Groove zu erzeugen.
3. **Länge einstellen:** Als Nutzer:in will ich die Länge (1–4 Bars) festlegen, um den Umfang zu kontrollieren.
4. **Tempo wählen:** Als Nutzer:in will ich das Tempo (BPM) einstellen, damit die Melodie im gewünschten Takt läuft.
5. **Generator-Modus wählen:** Als Nutzer:in will ich zwischen Regel- und KI-Modus umschalten, um verschiedene Stile zu testen.
6. **AI-Parameter anpassen:** Als Nutzer:in will ich Modell, Steps und Temperature einstellen, um das KI-Ergebnis zu beeinflussen.
7. **Playback & Export:** Als Nutzer:in will ich die Melodie abspielen und als MIDI herunterladen.
8. **Zukunftsfähigkeit:** Als Nutzer:in will ich später auch Akkordfolgen und Basslinien generieren können.

## 5. Funktionale Anforderungen

### 5.1 Skala & Tonfilter

- Dropdown / Freitext-Input für vordefinierte & benutzerdefinierte Skalen
- Intern als `string[]` von Note-Names

### 5.2 Rhythmus-Editor

- UI für Notenlängen (`4n`, `8n`, `16n`, Pausen)
- Gewichtete Wahrscheinlichkeiten für Patterns

### 5.3 Länge der Melodie

- Auswahlfeld für Bars (1, 2, 3, 4)
- Bestimmt Anzahl generierter Steps/Noten

### 5.4 Tempo (BPM)

- Eingabefeld/Slider für BPM (z. B. 40–240)
- Übergabe an AudioService & MIDI-Timing

### 5.5 Regelbasierter Generator

- Bigram-/Trigram-Markov-Chain in `utils/markov.ts`
- Gewichtete Auswahl der nächsten Note basierend auf Trainingsdaten

### 5.6 KI-Generator

- Integration von Magenta.js (`@magenta/music`) in `services/AiMelodyService.ts`
- Konfigurierbare Parameter:
  - `model` (z. B. `basic_rnn`, `melody_rnn`, `attention_rnn`)
  - `steps` (abhängig von Bars)
  - `temperature` (0.1–2.0)

### 5.7 Playback & Export

- **Audio:** Echtzeit-Playback via Tone.js (`services/AudioService.ts`)
- **MIDI-Download:** `.mid`-File via jsmidgen (`services/MidiService.ts`)

### 5.8 Zukunftserweiterung

- **Akkordprogressionen:** eigener Service + UI
- **Basslinien:** eigener Service + UI
- (Roadmap-Punkt, nicht initial implementiert)

## 6. Nicht-funktionale Anforderungen

- **Performance:** Generierung in < 2 Sek. für bis zu 4 Bars
- **Responsivität:** Skalierbar von Mobile bis Desktop
- **Code-Qualität:** TypeScript-Strict, ESLint, Unit- & Integration-Tests
- **Erweiterbarkeit:** Clean Architecture für einfache Erweiterungen

## 7. Technische Architektur

### 7.1 Verzeichnisstruktur

```bash
src/
├── components/
│   ├── ScaleSelector.vue
│   ├── RhythmEditor.vue
│   ├── LengthSelector.vue       # Bars-Auswahl (1–4)
│   ├── BpmSelector.vue          # Tempo-Eingabe
│   ├── AiSettings.vue           # KI-Optionen
│   ├── MelodyGenerator.vue
│   ├── MelodyVisualizer.vue
│   └── Controls.vue
├── models/
│   ├── Note.ts
│   ├── Scale.ts
│   ├── Rhythm.ts
│   ├── Melody.ts
│   └── Config.ts                # Bars, BPM, AI-Config
├── services/
│   ├── ScaleService.ts
│   ├── RhythmService.ts
│   ├── MelodyService.ts         # Markov-basiert
│   ├── AiMelodyService.ts       # KI-basiert (Magenta.js)
│   ├── MidiService.ts
│   └── AudioService.ts
├── stores/
│   └── useMusicStore.ts
├── utils/
│   ├── random.ts
│   └── markov.ts
├── App.vue
└── main.ts
```

### 7.2 Pinia-Store (`useMusicStore.ts`)

````ts
import { defineStore } from 'pinia'
import type { Scale, RhythmPattern, Melody } from '@/models'

export const useMusicStore = defineStore('music', {
  state: () => ({
    scale: null as Scale | null,
    rhythm: null as RhythmPattern | null,
    bars: 1,
    bpm: 120,
    useAI: false,
    aiConfig: {
      model: 'melody_rnn',
      steps: 32,
      temperature: 1.0
    },
    melody: null as Melody | null,
    isGenerating: false
  }),
  actions: {
    setScale(s: Scale) { this.scale = s },
    setRhythm(r: RhythmPattern) { this.rhythm = r },
    setBars(n: number) { this.bars = n },
    setBpm(b: number) { this.bpm = b },
    setUseAI(flag: boolean) { this.useAI = flag },
    setAiConfig(cfg: Partial<typeof this.aiConfig>) {
      this.aiConfig = { ...this.aiConfig, ...cfg }
    },
    async generate() {
      if (!this.scale || !this.rhythm) return
      this.isGenerating = true

      if (this.useAI) {
        const beatsPerBar = 4
        const subdivisions = this.rhythm.steps.length / beatsPerBar
        this.aiConfig.steps = this.bars * beatsPerBar * subdivisions
        this.melody = await import('@/services/AiMelodyService')
          .then(svc => svc.generateWithAI(this.scale!, this.aiConfig))
      } else {
        this.melody = await import('@/services/MelodyService')
          .then(svc => svc.generateMelody(this.scale!, this.rhythm!, this.bars))
      }

      this.isGenerating = false
    },
    async exportMidi() {
      if (this.melody)
        await import('@/services/MidiService')
          .then(svc => svc.saveAsMidi(this.melody!, this.bpm))
    },
    async playMelody() {
      if (this.melody)
        await import('@/services/AudioService')
          .then(svc => svc.playMelody(this.melody!, this.bpm))
    }
  }
})

### 7.3 Daten- und Event-Flow

```mermaid
flowchart LR
  subgraph UI
    A[ScaleSelector] -->|setScale| Store
    B[RhythmEditor] -->|setRhythm| Store
    C[LengthSelector] -->|setBars| Store
    D[BpmSelector] -->|setBpm| Store
    E[AiSettings] -->|setUseAI/setAiConfig| Store
    F[Controls: Generate] -->|generate()| Store
  end
  Store -->|useAI? yes| G[AiMelodyService]
  Store -->|useAI? no| H[MelodyService]
  G --> Store
  H --> Store
  Store --> I[MelodyVisualizer]
  J[Controls: Play/Export] -->|playMelody()/exportMidi()| K[AudioService/MidiService]
````

### 8. Akzeptanzkriterien

- [ ] Bars-Auswahl (1–4) verfügbar und steuert Melodielänge
- [ ] BPM-Eingabe wirkt sich auf Playback & MIDI aus
- [ ] Umschalten Regel ↔ KI inkl. korrekter Steps-Berechnung funktioniert
- [ ] Playback via Tone.js und MIDI-Download funktionieren in aktuellen Browsern
- [ ] Unit-Tests für Store-Actions `setBars`, `setBpm`, `generate()` sind vorhanden

### 9. Roadmap / Erweiterungen

1. **Akkordprogressions-Generator**
2. **Basslinien-Generator**
3. **Export als MusicXML / WAV**
4. **Cloud-KI-API** für eigenes Backend
5. **Community-Presets & Sharing**
