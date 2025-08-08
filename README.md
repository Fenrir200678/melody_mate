# Melody Mate v1.1.0

Melody Mate is a powerful, user-friendly web tool for generating, customizing, and exporting MIDI melodies—no musical background required. Create unique melodies or basslines, shape nearly every detail, and hopefully get inspired by the generated melodies to create your own music.

---

## 🎵 What can Melody Mate do?

### 🎼 Scales & Keys

- Select from all common keys and scales (major, minor, modes, and more)
- Instantly switch the key/scale for your entire melody

### 🔗 Chord Progressions (Custom & Predefined)

- Enable/disable chord progression guidance for melody generation
- Build your own custom chord progressions (drag & drop, reorder, remove, up to 8 chords)
- Choose from a library of predefined progressions (pop, jazz, minor, etc.)
- Diatonic chord palette adapts to your selected key/scale
- Adjustable "Chord Adherence" (how strictly the melody follows the chords)
- Visual chord info: compact names, roman numerals, color coding

### 🥁 Rhythm Design (Presets, Euclidean, Custom)

- **Presets:** Choose from a large library of weighted rhythm patterns (categorized)
- **Euclidean:** Generate mathematically even rhythms, rotate patterns, visualize as a circle
- **Custom Sequencer:** 16-step grid, drag & drop note values, create any rhythm you want
- Rhythm licks: Inject short, predefined rhythmic phrases for extra groove
- Rest probability: Control how sparse or syncopated your melody is
- Random rhythm option within a category

### 🎶 Melody Generation & Structure

- Rule-based generation with N-Gram/Markov-Chain models (adjustable context length)
- Motif repetition: Repeat melodic motifs with customizable patterns
- Famous motif injection: Seed your melody with iconic motifs (Beethoven, pop, etc.)
- Melodic contour: Guide the overall shape (arc, ascending, descending, random)
- Call & response: Motif variation with transposition/inversion
- Start/end on root note (optional)
- Adjustable bars (1–16), BPM, octave range

### 🔊 Dynamics & Velocity

- Fixed velocity: All notes at the same volume
- Dynamic progressions: Choose from musical dynamic curves (piano, forte, etc.)
- Select and preview dynamic profiles

### 🎹 Instrument Selection & Playback

- Choose from 100+ General MIDI instruments (grouped by type)
- Instant playback in your browser (no plugins needed)
- Loop playback option

### 👀 Animated Melody Visualization

- See your melody as a sequence of colored note cards
- Animated playback: highlights the current note in sync with audio
- Octave color coding, velocity transparency, rest indication
- Rhythm legend and info (including custom/euclidean/preset type)

### 💾 MIDI Export

- Download your melody as a .mid file for use in any DAW or music software
- Filename auto-generated based on your settings

### 🧠 Smart User Experience

- Modern, responsive UI (PrimeVue, TailwindCSS)
- All settings grouped in collapsible panels for clarity
- Tooltips, legends, and help texts throughout the app
- **Automatic settings save:** All your preferences, custom rhythms, progressions, and options are automatically saved in your browser (localStorage). When you return, everything is instantly restored—no login or account needed. This ensures a seamless workflow and lets you pick up exactly where you left off, even after closing the browser.
- **Clear Settings Button:** If you ever experience issues or after a new version release, you can use the red "Clear Settings" button in the footer to delete all saved preferences and reload the app. This is helpful to resolve problems caused by outdated or incompatible settings.

---

## 🚦 How does it work? (User Workflow)

1. **Set your preferences:**
   - Select key and scale
   - Adjust length, BPM, octave, and velocity
   - Tweak rhythm and generation options (motifs, N-Gram, rests, etc.)
2. **Generate a melody:**
   - Click "Generate Melody"—your melody appears and is ready to play.
3. **Pick an instrument & play:**
   - Choose an instrument from the list and play your melody instantly.
4. **Export:**
   - Download your melody as a MIDI file and use it in your favorite DAW.

---

## 🛠️ Tech Stack

- **Frontend:** Vue 3, TypeScript, Vite
- **UI:** PrimeVue, TailwindCSS
- **State Management:** Pinia
- **MIDI Playback:** html-midi-player (100+ General MIDI instruments)
- **MIDI Export:** midi-writer-js
- **Music theory:** tonal.js + custom utilities

---

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- pnpm (or npm/yarn)

### Installation

```bash
git clone https://github.com/Fenrir200678/melody_mate
cd melody_mate
pnpm install
```

### Start development server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

### Production build

```bash
pnpm build
```

The build output will be in the `dist/` directory.

---

## 🗺️ Roadmap

- **AI-powered models:** Integration of Magenta.js for AI-based melody generation (planned)

## 📜 License

This project is licensed under a **Non-Commercial License**.

You may use, modify, and share it for personal, educational, or non-commercial purposes—with attribution.

**Commercial use is strictly prohibited without written permission.**

© 2025 Farid Hassan – All rights reserved.
