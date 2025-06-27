# Development History

This document summarizes the key features implemented and bugs fixed during the development sessions.

## Session 1: Enhancing Melody Generation

### 1. Harmonischer Kontext: Chord Adherence (Akkordtreue)

**Ziel:** Dem Benutzer ermöglichen, die Stärke der Akkordbindung in der Melodiegenerierung zu steuern.
**Änderungen:**

- **`src/stores/generation.store.ts`:**
  - Neuen Zustand `chordAdherence: 0.75` (Standardwert) hinzugefügt.
  - Neue Action `setChordAdherence(adherence: number)` hinzugefügt.
- **`src/components/settings/chords/ChordAdherenceSelector.vue`:**
  - Neue Vue-Komponente mit einem Slider zur Steuerung von `chordAdherence` erstellt.
- **`src/components/AppSettings.vue`:**
  - `ChordAdherenceSelector` importiert und im "Harmony"-Bereich platziert.
- **`src/utils/music-theory.ts`:**
  - Die `applyMusicalWeighting`-Funktion angepasst, um `chordAdherence` zu nutzen. Die Gewichtung für Akkordtöne (`adherenceFactor`) und Nicht-Akkordtöne (`penaltyFactor`) wird nun dynamisch basierend auf dem Slider-Wert berechnet.

### 2. Melodische Kontur steuern

**Ziel:** Dem Benutzer ermöglichen, die allgemeine Form der Melodie (ansteigend, absteigend, bogenförmig) zu beeinflussen.
**Änderungen:**

- **`src/stores/generation.store.ts`:**
  - Neuen Zustand `melodicContour: 'arc'` (Standardwert) hinzugefügt.
  - Neue Action `setMelodicContour(contour: string)` hinzugefügt.
- **`src/components/settings/generation/MelodicContourSelector.vue`:**
  - Neue Vue-Komponente mit `SelectButton` zur Auswahl der melodischen Kontur erstellt.
- **`src/components/AppSettings.vue`:**
  - `MelodicContourSelector` importiert und im "Generation Options"-Bereich platziert.
- **`src/services/melody/note-generator.service.ts`:**
  - `melodyProgress` (aktueller Fortschritt im Takt) wird nun an `getNextPitch` übergeben.
- **`src/utils/pitch.ts`:**
  - `melodyProgress` wird nun von `getNextPitch` an `applyMusicalWeighting` weitergeleitet.
- **`src/utils/music-theory.ts`:**
  - `applyMusicalWeighting`-Funktion erweitert: Basierend auf `melodicContour` und `melodyProgress` werden die Gewichte für die nächste Note angepasst, um die gewünschte Kontur zu fördern.

### 3. Rhythmische Vielfalt erhöhen: Rhythmic Licks

**Ziel:** Kurze, vordefinierte rhythmische Phrasen (Licks) in die generierte Melodie einstreuen, um die rhythmische Abwechslung zu erhöhen.
**Änderungen:**

- **`src/stores/generation.store.ts`:**
  - Neue Zustände `useRhythmicLicks: false` und `rhythmicLickFrequency: 0.25` hinzugefügt.
  - Zugehörige Actions `setUseRhythmicLicks(use: boolean)` und `setRhythmicLickFrequency(frequency: number)` hinzugefügt.
- **`src/data/rhythmic-licks.ts`:**
  - Neue Datei mit einer Sammlung von vordefinierten rhythmischen Licks (als Arrays von Notendauern) erstellt.
- **`src/components/settings/generation/RhythmicLicksSelector.vue`:**
  - Neue Vue-Komponente mit Checkbox (`useRhythmicLicks`) und Slider (`rhythmicLickFrequency`) erstellt.
- **`src/components/AppSettings.vue`:**
  - `RhythmicLicksSelector` importiert und im "Generation Options"-Bereich platziert.
- **`src/services/melody/rhythm-lick.service.ts`:**
  - Neuer Service mit der Funktion `injectRhythmicLicks` erstellt. Diese Funktion nimmt einen `noteSteps`-Array und fügt an zufälligen Positionen Licks ein, wobei die Gesamtlänge des Taktes beibehalten wird.
- **`src/services/melody/melody-generator.service.ts`:**
  - `injectRhythmicLicks` wird in `prepareGenerationContext` aufgerufen, um den `noteSteps`-Array vor der Notengenerierung zu modifizieren, falls `useRhythmicLicks` aktiviert ist.

### 4. Spannung und Auflösung durch Betonung von Taktzeiten

**Ziel:** Die Notenwahl an die rhythmische Position im Takt anpassen, um musikalische Spannung und Auflösung zu fördern.
**Änderungen:**

- **`src/services/melody/note-generator.service.ts`:**
  - `currentStep` und `subdivision` werden nun an `getNextPitch` übergeben.
- **`src/utils/pitch.ts`:**
  - `currentStep` und `subdivision` werden nun von `getNextPitch` an `applyMusicalWeighting` weitergeleitet.
- **`src/utils/music-theory.ts`:**
  - `applyMusicalWeighting`-Funktion erweitert: Eine Hilfsfunktion `isStrongBeat` wurde hinzugefügt. Basierend auf der Taktposition werden Akkordtöne auf starken Zählzeiten stärker bevorzugt und Nicht-Akkordtöne auf schwachen Zählzeiten weniger stark bestraft.

### 5. "Call and Response" für Motive (Diatonische Transposition & Inversion)

**Ziel:** Wiederholte Motive musikalisch sinnvoll variieren, anstatt sie exakt zu wiederholen.
**Änderungen:**

- **`src/stores/generation.store.ts`:**
  - Neuen Zustand `useCallAndResponse: false` hinzugefügt.
  - Neue Action `setUseCallAndResponse(use: boolean)` hinzugefügt.
- **`src/components/settings/generation/CallAndResponse.vue`:**
  - Neue Vue-Komponente mit einer Checkbox zur Aktivierung/Deaktivierung der Funktion erstellt.
- **`src/components/AppSettings.vue`:**
  - `CallAndResponse` importiert und im "Generation Options"-Bereich platziert.
- **`src/services/melody/motif-transformer.service.ts`:**
  - Neuer Service mit Funktionen für melodische Transformationen:
    - `transposeMelody(notes: AppNote[], interval: string)`: Chromatische Transposition.
    - `transposeMelodyDiatonically(notes: AppNote[], scaleNotes: readonly string[], steps: number)`: **Wichtigste Neuerung:** Diatonische Transposition, die Noten um Skalenschritte verschiebt und die Tonleiter beachtet. Implementiert über MIDI-Werte, um Oktavprobleme zu vermeiden.
    - `invertMelody(notes: AppNote[])`: Melodische Inversion.
- **`src/services/melody/melody-generator.service.ts`:**
  - `generateMotifBasedMelody` angepasst: Wenn `useCallAndResponse` aktiviert ist, wird eine zufällige Transformation (diatonische Transposition, chromatische Transposition oder Inversion) auf wiederholte Motive angewendet.

### Bugfixes & Code-Qualität

- **Behebung von Noten außerhalb der Tonleiter bei Motiven/Licks:**
  - **`src/utils/pitch.ts`:** Die `getNextPitch`-Funktion wurde so angepasst, dass sie nach der Gewichtung nur Noten zur Auswahl zulässt, die tatsächlich in der aktuellen Tonleiter (`scale.notes`) enthalten sind.
- **Behebung von `Invalid note name: A` Fehler:**
  - **`src/services/ScaleService.ts`:** `generateScale` gibt nun wieder reine Tonklassen (z.B. 'C', 'D') für `scale.notes` zurück.
  - **`src/utils/scales.ts`:** `mapMelodyToScale` wurde angepasst, um intern eine Standardoktave (z.B. '4') zu den `targetScaleNotes` hinzuzufügen, bevor sie in MIDI-Werte umgewandelt werden. Dies stellt sicher, dass `noteNameToMidi` immer gültige Eingaben erhält.
  - **`src/services/melody/motif-transformer.service.ts`:** `transposeMelodyDiatonically` wurde überarbeitet, um die diatonische Transposition vollständig auf MIDI-Ebene durchzuführen, wodurch die Konsistenz der Notennamen mit Oktaven gewährleistet ist.
- **Allgemeine Code-Qualität:**
  - Regelmäßige Ausführung von `npm run lint` und `npm run type-check` nach jeder größeren Änderung, um Code-Stil und Typ-Sicherheit zu gewährleisten. Kleinere Linting-Fehler wurden dabei direkt behoben.
