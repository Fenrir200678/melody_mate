# Melody Mate

A web-based MIDI melody generator built with Vue 3, TypeScript, and Vite for crafting rule-based musical melodies. This tool allows you to generate unique, harmonically consistent tunes by defining a set of constraints and generation parameters.

<!-- Placeholder for a live demo link -->
<!-- > **Live Demo:** [Link to live demo] -->

<!-- Placeholder for a screenshot or GIF -->
<!-- ![Screenshot of Melody Mate](./path/to/screenshot.png) -->

## ✨ Features

- **🎼 Scale & Key:** Choose from a variety of musical scales to ensure every generated note is harmonically correct.
- **🥁 Rhythm Definition:** Create custom rhythmic patterns by selecting note durations and subdivisions.
- **🤖 Rule-Based Generation:** The core of Melody Mate uses an N-gram (Markov chain) model for melody generation. You can influence the outcome by:
  - Using predefined musical motifs to train the generation model.
  - Repeating motifs across the melody.
  - Adjusting the probability of rests to create more varied rhythms.
  - Forcing the melody to start on the root note of the selected scale.
- **🎛️ Composition Controls:**
  - **Length:** Set the melody length from 1 to 4 bars.
  - **Tempo:** Adjust the Beats Per Minute (BPM).
  - **Octave:** Define the target octave for the melody.
- **🎹 Playback & Visualization:**
  - Listen to your creation directly in the browser with an integrated sampler.
  - See the generated notes on a piano roll visualizer.
- **MIDI Export:** Download your melody as a `.mid` file to use in any Digital Audio Workstation (DAW).

## 🛠️ Tech Stack

- **Frontend:** [Vue 3](https://vuejs.org/) (using `<script setup>`)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **Web Audio:** [Tone.js](https://tonejs.github.io/) for in-browser audio synthesis and sequencing.
- **MIDI:** `jsmidgen` for MIDI file creation.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or higher recommended)
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Fenrir200678/melody_mate
   cd melody_mate
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

### Running the Development Server

To start the local development server, run:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

To create a production-ready build, run:

```bash
pnpm build
```

The optimized files will be located in the `dist/` directory.

## 🗺️ Roadmap

This project is under active development. Future enhancements include:

- **🧠 AI-Powered Generation:** Integrating `Magenta.js` to offer an alternative, AI-based melody generation model.
- **🎶 Chord Progressions:** A dedicated module for generating and adding chord progressions.
- **🎹 More Instrument Options:** More instruments to choose from.
- **📄 More Export Options:** Support for formats like MusicXML and WAV.

## 📜 License

This project is licensed under a custom **Non-Commercial License**.

You are free to use, modify, and distribute this software for personal, educational, or non-commercial purposes, **provided** that you retain attribution to the original author.

**Commercial use is strictly prohibited** without prior written permission from the author.

© 2025 Farid Hassan – All rights reserved.
