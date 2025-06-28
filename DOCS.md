# Melody Mate Documentation

This guide will help you get the most out of every feature, whether you're a beginner or an advanced user.

---

## 1. Introduction

Melody Mate is a web-based tool for generating, customizing, and exporting MIDI melodies. It is designed for musicians, producers, educators, and anyone interested in creative music-making—no prior music theory knowledge required. This documentation explains every feature in detail, provides practical examples, and offers tips for best results.

---

## 2. Feature Deep-Dive

### 2.1 Scales & Keys

**What is a Key/Scale?**

- A _key_ defines the tonal center of your melody (e.g., C, G, F#).
- A _scale_ is a set of notes that sound good together (e.g., Major, Minor, Dorian, Phrygian).

**How to use:**

- Select your desired key and scale from the settings panel.
- The app automatically adapts all chords and melodies to your choice.

**Example:**

- _C Major_ uses the notes C, D, E, F, G, A, B.
- _A Minor_ uses A, B, C, D, E, F, G (same notes, different tonal center).

---

### 2.2 Chord Progressions (Custom & Predefined)

**What is a Chord Progression?**

- A sequence of chords that forms the harmonic backbone of your melody.

**Custom Progressions:**

- Drag & drop chords from the palette to build your own progression (up to 8 chords).
- Reorder or remove chords as you like.

**Predefined Progressions:**

- Choose from classic progressions (e.g., I–V–vi–IV, ii–V–I, pop, jazz, minor, etc.).

**Chord Adherence:**

- Adjust how strictly the melody follows the underlying chords (from loose to very strict). This means at 100% adherence the melody tries to always include the notes of the selected chord progression. At 0% adherence the melody will not follow the chord progression at all.

**Visuals:**

- Chords are shown with compact names, roman numerals, and color coding for easy recognition.

**Example:**

- Building a I–V–vi–IV progression in C Major: C – G – Am – F

---

### 2.3 Rhythm Design

**Presets:**

- Select from a large library of rhythm patterns, organized by category (melody, bass, world, etc.). More presets will be added in the future.

**Euclidean Rhythms:**

- _What is it?_ A mathematical way to distribute a number of notes (pulses) as evenly as possible over a number of steps (beats).
- _Example:_ 5 pulses over 16 steps creates a syncopated, world-music-like groove.
- _Tip:_ Use the rotation feature to shift the pattern and discover new feels.

**Custom Sequencer:**

- 16-step grid where you can drag & drop different note values (e.g., 1/16, 1/8, 1/4, dotted notes).
- Create any rhythm you want, including complex syncopations or easy standard rhythms.

**Rhythm Licks:**

- Inject short, predefined rhythmic phrases for extra groove and variation. More licks will be added in the future.

**Rest Probability:**

- Increase to make your melody sparser and more syncopated.

**Random Rhythm:**

- Let the app pick a random rhythm from the selected category for inspiration.

_Note: Not every rhythm or pattern will work well with every melody generation setting. If your melody sounds odd, try a different rhythm or adjust your motif/pattern settings!_

---

### 2.4 Melody Generation & Structure

**N-Gram/Markov Models:**

- _What is it?_ An algorithm that generates melodies based on the probability of note sequences (context length adjustable).
- _Tip:_ Higher N-Gram values = more structured, less random melodies. But those melodies can become a bit rigid. Lower values = more surprising results.

**Motif Repetition:**

- Repeat melodic motifs with customizable patterns (e.g., AABA, ABAC).
- _Tip:_ Use for catchy, memorable melodies.

**Famous Motifs:**

- Seed your melody with iconic motifs (e.g., Beethoven, pop riffs, etc.). Currently those are injected randomly. More famous motifs will be added in the future.

**Melodic Contour:**

- Guide the overall shape of your melody: arc (up then down), ascending, descending, or random.

**Call & Response:**

- Alternate between a "call" phrase and a "response" (variation via transposition or inversion). Currently those are experimental.

**Start/End on Root Note:**

- Optionally force the melody to start or end on the root note for a more resolved feel.

**Bars, BPM, Octave Range:**

- Set the number of bars (1–16), tempo (BPM), and octave range for your melody.

_Note: Some motif patterns or generation options may not fit every rhythm. If your melody sounds strange, try a different rhythm or pattern!_

---

### 2.5 Dynamics & Velocity

**Fixed Velocity:**

- All notes are played at the same volume.

**Dynamic Progressions:**

- Choose from musical dynamic curves (e.g., crescendo, decrescendo, forte, piano).
- _Tip:_ Use dynamics to add expression and realism to your melodies.

---

### 2.6 Instrument Selection & Playback

**General MIDI Instruments:**

- Choose from over 100 instruments (piano, guitar, synth, strings, etc.).
- Instruments are grouped for easy browsing.

**Playback:**

- Listen to your melody instantly in the browser—no plugins required.
- Loop option for continuous playback.

---

### 2.7 Melody Visualization

**Note Cards:**

- Each note is shown as a colored card (color = octave, transparency = velocity).
- Rests are clearly indicated.

**Animated Playback:**

- The current note is highlighted in sync with audio playback.

**Legend:**

- See which octaves are used, rhythm type, and symbol explanations.

---

### 2.8 MIDI Export

**How to export:**

- Click "Download MIDI" to save your melody as a .mid file.
- The filename is auto-generated based on your settings.

**Tip:**

- Import the MIDI file into any DAW (Ableton, FL Studio, Logic, etc.) or notation software.

---

### 2.9 LocalStorage & Settings

**Automatic Save:**

- All your settings, custom rhythms, progressions, and preferences are saved in your browser (localStorage).
- When you return, everything is restored—no login needed.

**Why is this good?**

- Seamless workflow: Pick up exactly where you left off.
- No risk of losing your work due to accidental reloads or browser closures.

---

## 3. How-To Guides

### 3.1 How to Build a Custom Chord Progression

1. Enable "Chord Progression Guidance" in the Harmony panel.
2. Select "Custom" as progression type.
3. Drag chords from the palette into your progression.
4. Reorder or remove chords as needed.
5. Adjust "Chord Adherence" for more or less strictness.

### 3.2 How to Create a Custom Rhythm

1. Go to the Rhythm panel and select the "Custom" tab.
2. Use the 16-step grid to drag & drop note values.
3. Experiment with different patterns and rests.
4. Enable "Custom Rhythm" to use it for melody generation.

### 3.3 How to Use Motif Repetition and Famous Motifs

1. In the Motif & Contour panel, enable "Motif Repetition" and select a pattern.
2. Optionally, enable "Predefined Motif" and choose a famous motif to seed your melody.
3. Combine with N-Gram or contour options for unique results.

### 3.4 How to Export and Use MIDI Files

1. Generate your melody and click "Download MIDI".
2. Import the file into your favorite DAW or notation software.
3. Assign instruments, edit, or arrange as you like.

---

## 4. Tips & Best Practices

- Try combining Euclidean rhythms with motif repetition for world-music grooves.
- Use high rest probability for sparse, syncopated melodies.
- Experiment with different N-Gram values for surprising results.
- Use the animated visualization to spot patterns and improve your melodies.
- Don't be afraid to use random rhythm or instrument selection for inspiration!

> **Not every setting works well with every rhythm or option!**
> Some combinations of chord progressions, motif patterns, N-Gram values, and rhythm types may produce unexpected or less musical results. Don't be discouraged—experiment with different settings and rhythms to find what works best for your musical idea. Sometimes, "happy accidents" lead to the most interesting melodies!

---

## 5. FAQ

**Q: Why is my melody silent?**

- Check if your rhythm pattern has only rests or if the velocity is set too low.

**Q: How do I get more syncopation?**

- Increase the rest probability or use Euclidean/custom rhythms.

**Q: Can I use my own instruments?**

- Export the MIDI and load it into your DAW to assign any instrument you want.

**Q: Are my settings safe if I close the browser?**

- Yes! Everything is saved in your browser's localStorage.

**Q: What is an N-Gram?**

- An N-Gram is a sequence of N notes. The app uses N-Gram/Markov models to generate melodies based on the probability of note sequences.

**Q: What is a Euclidean Rhythm?**

- A rhythm where a number of pulses (notes) are distributed as evenly as possible over a number of steps (beats). Used in many world music traditions.

---

Happy music making! If you have more questions or suggestions, feel free to open an issue on GitHub.
