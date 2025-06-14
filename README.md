# Melody Mate

Melody Mate is a web-based tool for generating MIDI melodies. With just a few clicks, you can create, customize, listen to, and export your own melodies as MIDI files—no musical background required.

## ✨ What can Melody Mate do?

- **Choose scale & key:** Ensure every note fits harmonically.
- **Design rhythms:** Create your own rhythms, use presets, or explore Euclidean rhythms.
- **Rule-based generation:** Control the melody with N-Gram/Markov-Chain models, motifs, rest probability, and more.
- **Composition parameters:** Set length (1–4 bars), tempo (BPM), octave, and velocity.
- **Instruments:** Choose from over 100 General MIDI instruments.
- **Playback:** Listen to your melody directly in the browser.
- **Visualization:** Instantly see the generated note sequence.
- **MIDI export:** Download your melody as a .mid file for use in your DAW.

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

## 🛠️ Tech Stack

- **Frontend:** Vue 3, TypeScript, Vite
- **UI:** PrimeVue, TailwindCSS
- **State Management:** Pinia
- **MIDI Playback:** [html-midi-player](https://github.com/cifkao/html-midi-player) (100+ General MIDI instruments)
- **MIDI Export:** [midi-writer-js](https://github.com/grimmdude/MidiWriterJS)
- **Music theory:** [tonal](https://github.com/tonaljs/tonal) + custom utilities

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

## 🗺️ Roadmap

- **AI-powered models:** Integration of Magenta.js for AI-based melody generation (planned)
- **Chord progressions:** Module for automatic chord progressions (planned)
- **More export formats:** e.g. MusicXML, WAV (planned)

## 📜 License

This project is licensed under a **Non-Commercial License**.

You may use, modify, and share it for personal, educational, or non-commercial purposes—with attribution.

**Commercial use is strictly prohibited without written permission.**

© 2025 Farid Hassan – All rights reserved.
