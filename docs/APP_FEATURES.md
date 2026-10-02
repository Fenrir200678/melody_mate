# Melody Mate v2 - Complete Feature Inventory & Specification

> **Purpose:** Comprehensive technical and functional feature reference for **Melody Mate v2 (DAW Edition)**. This document inventories all architectural layers, algorithmic generators, music theory capabilities, canvas rendering systems, synthesis and mixing modules, workflows, and DAW export features.

---

## 1. Executive Summary & Product Overview

**Melody Mate v2** is a browser-based generative MIDI workstation and ideation environment built for music producers, composers, and beatmakers. It combines algorithmic composition techniques (N-gram Markov models, musical heuristics, Bjorklund Euclidean rhythms, rule-based motif structuring, and arpeggiation) with an interactive, responsive DAW-style workspace.

Unlike simple randomizers or playback-only tools, Melody Mate v2 operates as an interactive compositional partner:

- Produces musically sound lead melodies, basslines, arpeggios, and chord progressions with real voice leading.
- Renders an interactive HTML5 Canvas piano roll with dual-track editing, velocity lane, scale highlighting, and ghost chord voicings.
- Allows targeted generation via a flexible Work Range system, modifying specific bars or steps while leaving the rest of the project intact.
- Features an onboard hybrid audio engine with native subtractive synthesis, calibrated factory patches, insert effects, creative bus compression, and an AudioWorklet-based lookahead peak limiter.
- Exports standard multi-track `.mid` files ready to drag and drop into Ableton Live, FL Studio, Logic Pro, Studio One, Bitwig, Cubase, or Reaper.

---

## 2. Technology Stack & Architecture

### 2.1 Core Technologies

| Layer                | Technology              | Version / Implementation                   | Role                                                               |
| :------------------- | :---------------------- | :----------------------------------------- | :----------------------------------------------------------------- |
| **Framework**        | Vue 3                   | Composition API, `<script setup>`, TS 5.8  | Reactive UI shell and state bindings                               |
| **Build Tool**       | Vite                    | 6.x                                        | Fast development server and production bundling                    |
| **State Management** | Pinia                   | 3.x                                        | Reactive workspace stores with Zod schema validation               |
| **Styling**          | Tailwind CSS v4         | Modular Nested CSS (`src/styles/`)         | Custom dark theme ("Modern Studio Dark"), zero scoped CSS          |
| **Audio Engine**     | Tone.js & Web Audio API | Hybrid runtime                             | Transport scheduling, native voice graphs, AudioWorklet nodes      |
| **Music Theory**     | `@tonaljs/tonal`        | 6.x                                        | Scale definitions, pitch classes, intervals, chord derivation      |
| **MIDI Generation**  | `midi-writer-js`        | 3.x                                        | Standard MIDI File (SMF) encoding, multi-track channels, tick math |
| **Canvas Utilities** | `@vueuse/core`          | `useRafFn`, pointer capture, media queries | Coalesced 60 FPS canvas redraws and gesture handling               |
| **Validation**       | Zod                     | 3.x                                        | Schema-validated persistence and runtime integrity                 |
| **Testing**          | Vitest                  | 3.x                                        | 120 test suites, 1,560+ automated unit and domain tests            |

### 2.2 Architectural Principles

1. **Strict 3-Layer Unidirectional Flow:**
   - **Layer 1: Pure Core (`src/core/`):** 100% pure TypeScript. Zero Vue reactivity, zero Pinia stores, zero DOM APIs. Fully decoupled and testable in milliseconds.
   - **Layer 2: Reactive State (`src/stores/`, `src/composables/`):** Pinia stores manage application state, undo/redo stacks, takes, and browser persistence. Composables handle pointer capture, keyboard shortcuts, and canvas render loops.
   - **Layer 3: Presentation (`src/components/`, `src/styles/`):** Modular Vue components without `<style scoped>`. Clean Tailwind v4 design tokens and native nested CSS rules.
2. **Centralized Configuration Source of Truth (`src/config/`):**
   - Core and generator defaults live in `src/config/defaults.ts`.
   - UI layout metrics and dock dimensions live in `src/config/ui-defaults.ts`.
   - Zod schemas reference these defaults directly; no magic numbers are scattered in components or stores.
3. **Desktop & Laptop DAW Focus:**
   - Optimized for desktop and laptop displays (1280px and wider).
   - Fluid 3-panel split layout: collapsible left sidebar, center piano roll and docked studios, collapsible right sidebar.
   - Full accessibility: unique element IDs, ARIA roles, pointer-capture dragging, and keyboard navigation.

---

## 3. User Interface & Workspace Layout

### 3.1 Design System: "Modern Studio Dark"

- **Color Palette:** Neutral graphite background (`#0b0c0f`), matte panels (`#15161a`), elevated cards (`#242730`), and 1px hairlines (`#333742`).
- **Semantic Accent Trio:**
  - **Melody / Signal (`#5b8dff`):** Lead notes, playhead, primary generator actions.
  - **Harmony / Chord (`#9b6bff`):** Chord track, ghost note overlays, voicing badges.
  - **Rhythm / Pulse (`#2fd9b9`):** Velocity pins, rhythm step triggers, limiter activity.
- **Typography:** Geist UI font for menus and controls; Geist Mono (`tabular-nums`) for BPM, timecodes, note names, and values.
- **Micro-Animations & Generative Glow:** Subtle edge shimmer during generation, staggered note reveal on the canvas, soft ambient glow on the active note block during playback. Respects `prefers-reduced-motion`.

### 3.2 Workspace Shell Structure

- **DawHeader:**
  - Branding and current project name.
  - Transport playback controls: Play/Pause, Stop, Timecode display (`Bar.Beat.Step`).
  - Loop controls: Loop toggle, active loop range indicator, Play from Loop Start, Return to Start on Pause.
  - Project musical settings: Root Key selector (12 chromatic keys), Scale dropdown (21 scales across 5 categories), Scale Lock toggle (`K`), Bar count selector (1, 2, 4, 6, 8, 12, 16 bars).
  - BPM control with numeric entry and Tap Tempo button.
  - Project Groove module: Swing knob, Timing Looseness knob, and live straight-vs-swung timing preview SVG.
- **DawWorkspace (3-Panel Split):**
  - **Left Sidebar (`GeneratorPanel.vue`):** Collapsible and resizable (min 200px, max 420px). Hosts Rhythm, Motif, Contour, Variation, and Take Rack modules.
  - **Center Viewport:** HTML5 Canvas Piano Roll, Ruler, Work Range controls, Velocity Lane, and docked studio drawers (Rhythm Studio, Arp Studio, Chord Studio).
  - **Right Sidebar (`ExpressionPanel.vue`):** Collapsible and resizable (min 200px, max 420px). Hosts Pitch, Harmony, Feel, and Analysis modules.
- **DawFooter:**
  - Note count chip and transport playback status.
  - Studio triggers: Rhythm Studio (`R`), Arp Studio (`A`), Chord Studio (`C`), Sound & Mix dock (`S`).
  - History controls: Undo (`Ctrl+Z`), Redo (`Ctrl+Y`).
  - Project reset modal: clean localStorage purge and default state restore.
  - Export MIDI popover with download options.

### 3.4 Desktop Enforcement & Mobile Device Gate (`DawMobileGate`)

Melody Mate v2 is explicitly engineered for desktop and laptop environments. Mobile phones and narrow handheld viewports are incompatible with the multi-panel layout, high-density piano roll, and keyboard-centric workflows.

- **Strict Viewport Gate (< 768px):** On mobile screen widths, the main DAW shell is completely suppressed (`display: none !important`), and `DawMobileGate` is presented in place of the workspace.
- **Resource Protection:** Tone.js audio engine initialization, Web Audio contexts, and welcome modal dialogs are halted on mobile viewports to prevent memory leaks and unnecessary battery drain.
- **Visual Teaser Preview:** Displays a high-resolution screenshot preview of the workstation (`/social-image.jpg`), summarizing the piano roll, polyphonic synthesizers, and multi-track export features.
- **Frictionless Handoff to Desktop:**
  - **Native Share (`navigator.share`):** Sends the workstation link via AirDrop, messaging, or email directly to the user's primary workstation.
  - **One-Click Link Copy:** Copies the workstation URL with visual confirmation feedback.

---

## 4. Interactive HTML5 Canvas Piano Roll

### 4.1 Canvas Engine & Rendering Pipeline

- Custom HTML5 `<canvas>` rendering pipeline coalesced through `requestAnimationFrame` (`useRafFn`).
- Handles DPI scaling (`window.devicePixelRatio`) with high-DPI crispness.
- Coordinate mapping:
  - Time axis: steps of 16th-note resolution.
  - Pitch axis: chromatic MIDI pitches C2 (36) to C6 (84).
- Layer drawing order:
  1. Background grid with alternating bar shading.
  2. Scale highlighting: in-scale pitch rows lightened, out-of-scale pitch rows darkened.
  3. Ghost chord notes: underlying accompaniment chords rendered as semi-transparent purple bars.
  4. Note blocks: rounded rectangles (`roundRect`), colored by track (blue for lead, purple for chord voicings), shaded by velocity.
  5. Active note playback bloom: ambient glow on currently sounding notes.
  6. Sticky left keyboard: interactive piano keys with pitch labels (`C3`, `D#3`) and click-to-audition sound preview.
  7. Work range overlay: darkened scrim outside the active work range to clearly demarcate generation boundaries.
  8. Selection marquee: interactive lasso box during selection gestures.
  9. Real-time playhead line: high-contrast vertical tracker synchronized to Tone.Transport.

### 4.2 Editing Tools

- **Select Tool (`1` / `V`):** Click notes to select; drag notes to move in time or pitch; drag note boundaries to resize duration; drag empty space to adjust work range; `Cmd`/`Ctrl` + drag for box selection.
- **Lasso Tool (`5`):** Drag a selection box to select multiple notes across bars and registers.
- **Pencil Tool (`2` / `P`):** Click or drag on empty grid cells to insert notes conforming to the active snap grid.
- **Eraser Tool (`3` / `E`):** Click or sweep across notes to delete them instantly.
- **Hand Tool (`4` / `H`):** Click and drag anywhere to pan the viewport smoothly across time and pitch.

### 4.3 Grid Snapping & Scale Lock

- Snap resolutions: `1/16`, `1/8`, `1/4`, plus triplet modes (`1/16T`, `1/8T`, `1/4T`) and unquantized/free mode.
- **Scale Lock (`K`):** When active, note insertion and vertical dragging automatically snap to valid notes in the selected scale, eliminating accidental wrong notes.

### 4.4 Viewport & Navigation

- Smooth custom canvas scrollbars with proportional thumbs for horizontal (bars) and vertical (pitch register) navigation.
- Zoom controls: Horizontal zoom in/out, Vertical zoom in/out, Reset Zoom, Fit Loop to Screen (`Z` / `0`), Fit Height (`Shift+Z`).
- Follow Playhead (`F`): Auto-scrolls the viewport to keep the moving playhead in view during playback.
- Note auditioning toggle: Enable or mute acoustic preview when clicking or dragging notes.

### 4.5 Dual-Track Support

- Toggle between **Melody Track** and **Chord Track** via the toolbar or `Tab` key.
- Switching to the Chord Track allows direct editing of individual chord voicing notes on the canvas.

### 4.6 Resizable Velocity Lane

- Collapsible bottom lane dedicated to the melody track.
- Vertical stems with circular drag pins showing velocity values from 1 to 127.
- Supports multi-selection velocity adjustments and linear ramp drawing.
- Auditions notes when dragging velocity pins.

---

## 5. Generation Work Range (Targeted Creation)

The Work Range system lets producers isolate any section of the composition for generation or transformation without altering the rest of the project:

- **Visual Controls (`PianoRollWorkRangeControls.vue`):**
  - Numeric Start Step and End Step inputs (1-based, bar/beat accurate).
  - Range label badge (e.g. `Bar 2.1 - 3.4`).
  - Direct canvas manipulation: drag inside the target to reposition; drag left/right edges to extend/shrink; click outside to reset to entire project.
- **Quick Range Presets:**
  - **All:** Targets the entire project length.
  - **Use Loop:** Synchronizes the generation target to the current transport loop region.
  - **Loop Target:** Sets the transport playback loop to match the active work range.
- **Scoped Generation:** Both the main Generator button and the Variation suite respect the active work range, replacing or transforming only notes within those boundaries.

---

## 6. Algorithmic Melody Generation Engine

### 6.1 Probabilistic & Music Theory Algorithms

Melody Mate v2 avoids unmusical random noise by combining probabilistic transition matrices with classical music theory heuristics:

- **Markov Chain Engine:**
  - N-gram model with selectable order (Order 1, Order 2, Order 3) for tunable phrase predictability versus exploratory branching.
  - Pre-trained on scale intervals, triad arpeggios, turning ornaments, and classical authentic cadences.
- **Music Theory Heuristics:**
  - **Leap-then-Step:** Counterbalances large melodic leaps (thirds or greater) with immediate stepwise motion in the opposite direction. Penalizes repeated leaps in the same direction.
  - **Contour Planning:** Directs melodic trajectories across the phrase:
    - `Free`: Unconstrained organic movement.
    - `Ascending`: Rising phrase line building tension toward a peak.
    - `Descending`: Falling phrase line resolving downward.
    - `Arch`: Traditional melodic arc rising in the first half and descending in the second.
    - `Valley`: Downward dip followed by an ascending recovery.
    - Contour Strength fader (0% to 100%) controls how strictly pitches adhere to the planned curve.
  - **Metric Weighting & Beat Hierarchy:** Downbeats (beats 1 and 3) strongly prefer chord tones or scale pillars (root, fifth); offbeats receive greater rhythmic freedom for passing and auxiliary notes.
  - **Register Continuity:** Nearest-octave tracking keeps consecutive notes in adjacent registers, preventing jarring octave jumps.
  - **Range Awareness:** Prevents melody notes from drifting into extreme sub-bass or piercing treble registers.

### 6.2 Motif & Structural Form Tools

- **Motif Pattern Mode:**
  - Generates structured multi-bar arrangements using established musical forms:
    - `FREE`, `AAAA`, `ABAB`, `ABAC`, `AABA`, `ABCB`.
  - **Motif Variation Fader (0% to 100%):** Controls how far repeated sections drift from the opening theme. Low values yield near-exact hooks; high values produce organic improvisational variations.
  - Motif section markers (`A`, `B`, `C`) appear directly on the timeline ruler.
- **Call and Response Mode:**
  - Divides phrases into antecedent (Call) and consequent (Response) pairs.
  - Selectable response styles:
    - `Echo`: Transposed repetition.
    - `Inversion`: Melodic mirror (rising call triggers descending response).
    - `Sequence`: Stepwise scalar sequencing.
    - `Resolution`: Cadential resolution forcing the response to resolve onto the tonic.
  - Answer Variation fader (0% to 100%) controls the response phrase deviation.

### 6.3 Tonality & Scale Foundation

- **12 Chromatic Root Keys:** `C`, `C#`, `D`, `Eb`, `E`, `F`, `F#`, `G`, `Ab`, `A`, `Bb`, `B`.
- **21 Scales and Modes:**
  - **Standard:** Major, Minor, Harmonic Minor, Melodic Minor.
  - **Modes of Major:** Dorian, Phrygian, Lydian, Mixolydian, Locrian.
  - **Jazz & Blues:** Bebop Major, Bebop Minor, Blues.
  - **Pentatonic:** Major Pentatonic, Minor Pentatonic.
  - **Symmetric & Exotic:** Whole Tone, Whole-Half Diminished, Half-Whole Diminished, Hungarian Minor, Phrygian Dominant, Double Harmonic Major, Ichikosucho.
- **Pitch Constraints:**
  - Configurable minimum and maximum octave bounds (C1 through B7) with octave span readout.
  - **Start on Root:** Guarantees the melody begins on the key root note.
  - **Resolve to Root:** Forces the final phrase to resolve cleanly onto the tonic note.
  - **Pentatonic Hook Constraint:** Filters note selection through the 5-note pentatonic scale for pop and hook catchiness.

### 6.4 Rhythm Engine Modes

- **Preset Mode:** Over 40 production-ready rhythm patterns categorized into:
  - `melody`: EDM Anthem, Synthwave Lead, Melancholic Lead, Syncopated Pop, Arp Lead, Dark Lament, and more.
  - `bass`: Driving 8ths, Offbeat Bass, Funky Groove, Rolling 16ths.
  - `world`: Afrobeat Pulse, Bossa Nova Feel, Tresillo.
  - `phrases` & `basic`: Straight quarters, 8th pairs, dotted figures.
  - Random preset toggle: Automatically selects a new rhythm preset on every generation run.
- **Euclidean Rhythm Mode:**
  - Algorithmic pulse generation based on the Bjorklund algorithm.
  - Pulses slider, Steps slider, Rotation offset, and Subdivision (`4n`, `8n`, `16n`, `32n`).
  - Interactive SVG circular clock visualizer rendering active beats and rests.
- **Custom Mode:** Direct integration with the custom Rhythm Studio step sequencer.
- **Feel & Humanization Controls:**
  - **Breath / Rest Probability (0% to 100%):** Introduces musical rests between notes with consecutive-rest damping to prevent phrase dropouts.
  - **Note Length / Gate (25% to 100%):** Adjusts gate duration relative to step length (staccato to legato).
  - **Accent Strength (0% to 100%):** Velocity boost applied to metric downbeats.
  - **Velocity Variation (0% to 100%):** Subtle per-note velocity humanization.
- **Global Project Groove:**
  - Swing percentage (0% to 100%) applied to 8th/16th shuffle timing.
  - Timing looseness (0% to 100%) introducing organic micro-timing offsets.
  - Affects audio playback and MIDI export while keeping notes visually aligned to the editor grid.

### 6.5 Deterministic PRNG Seed Engine

- 32-bit pseudorandom number generator with seed controls.
- Lock Seed option: Re-running generation with a locked seed keeps pitch and rhythm choices deterministic while tweaking other parameters.
- Manual seed input or random seed generation.

---

## 7. Dedicated Studio Docks

Melody Mate v2 includes three creation studios and a Sound & Mix workspace dock sharing one slot below the piano roll:

### 7.1 Arp Studio (`ArpStudioDock.vue`)

Specialized generative arpeggiator dock providing rhythmic and pitch arpeggiation tightly coupled with underlying chords:

- **Patterns:** Up, Down, Up-Down, Down-Up, Pedal, Pinky, Converge, Diverge, Random, Brown, Chord.
- **Rates:** Standard subdivisions (`1/16`, `1/8`, `1/4`) and dotted polyrhythmic divisions (`1/8d`, `1/4d`).
- **Pitch Sources:**
  - _Pitch classes:_ Traditional pitch-pool reconstruction across base octave and octave range. With more than one octave, the octave mode separates octave travel from the note pattern.
  - _Chord voicing:_ Traverses the exact absolute pitches and inversions created in Chord Studio.
- **Inversion Cycling (`arpInversionCycling`, default `false`):** The `Inv Cycle` switch is available only when chord progression is enabled and at least one chord lasts two bars or longer. Otherwise the switch is disabled, cycling is effectively off, and the saved preference is retained; restoring an eligible progression makes the preference effective again. When available, cycling rotates the bass through distinct chord tones once per absolute bar, starting from the existing inversion. Contiguous harmonically identical events share a cycle regardless of IDs or enharmonic spelling; a harmonic change or gap resets it. Late work ranges and density rests retain the harmonic timeline offset. The core engine also supports synthetic diatonic triads when no chord events are active. Both pitch sources are supported; octave modes select complete inverted octave layers in pitch-class mode. Pools are recentered by whole octaves around their original mean register and may cross displayed octave-window edges. Chord events and rate/gate timing remain unchanged. Candidate inputs include the toggle, and chord inversion edits invalidate cached candidates.
- **Sound Shaping Knobs:**
  - Base Octave (1 to 6) & Octave Range (1 to 4 octaves).
  - _Arp Octave Mode:_ `Up` (default), `Down`, `Alternate`, or `Zigzag` controls how pitch-class patterns move through octave levels. `Up` completes a pattern cycle at each level from low to high; `Down` completes each cycle from high to low. `Alternate` moves between octave levels in a pendulum, without repeating either endpoint. With two octaves, Alternate produces the same sequence as Up; the Alternate tooltip explicitly explains this. `Zigzag` changes octave level on each sounding note while leaving the chord-note pattern independent. All modes produce the same pattern at an octave range of one. The mode has no effect for chord-voicing pitch source, including its fallback behavior. The compact segmented control beside Octave Range is disabled at a one-octave range or with chord voicing selected; its selected value is retained while disabled.
  - Gate Length (0% to 100%).
  - Chord Adherence (0% to 100%).
  - Downbeat Accent (0% to 100%).
  - Note Density (0% to 100%).
- **Interactive Visualizer:** Real-time trajectory preview showing arpeggiated note pitches across chord steps.
- **Workflow & Generation Ergonomics:**
  - _Unified Shortcut `G`:_ Triggers arpeggio generation directly into the melody track while Arp Studio is open.
  - _Quick Shuffle `Shift+G`:_ Instantly randomizes the base seed to browse arpeggio candidates on the fly.
  - _Header Actions:_ `Generate` (with Sparkles icon) and `Shuffle` (with Shuffle/Refresh icon).
  - _Sidebar Rhythm Module Sync:_ When Arp Studio is open, the Generator panel's Rhythm module dynamically switches title to "Arp Studio" with the active pattern/rate badge, hiding standard rhythm presets to eliminate workflow ambiguity.
- **Targeted Variations:** Independent variation seed controls allow selective rerolling of pitches, groove feel, or resetting back to base.
- **Arp Seed Controls:** Dedicated seed locking and auto-randomization for repeatable figures.
- **Reproducibility:** Arpeggio generation and variation use the selected octave mode as part of their settings; the same seed and `arpOctaveMode` reproduce the same notes.

### 7.2 Rhythm Studio (`RhythmStudioDock.vue`)

Interactive step sequencer dock for building custom rhythmic foundations:

- 1 to 4 bar arrangements (up to 64 steps at 16th-note resolution).
- Note value palette: Whole (`1/1`), Half (`1/2`), Dotted Half (`1/2.`), Quarter (`1/4`), Dotted Quarter (`1/4.`), Eighth (`1/8`), Dotted Eighth (`1/8.`), Sixteenth (`1/16`), Dotted Sixteenth (`1/16.`), plus rests.
- Multi-step duration detection: Longer notes visually and logically span multiple grid cells.
- Custom preset management: Save custom rhythm patterns to localStorage with custom names and tags for reuse across sessions.

### 7.3 Chord Studio (`ChordStudioDock.vue`)

Complete harmonic composition workstation:

- **Predefined Progression Presets:** 60 presets covering Pop, Electronic (EDM), Jazz & Soul, Rock, and Dark. The musical and redundancy audit is recorded in [Chord Preset Review](CHORD_PRESET_REVIEW.md).
  - Pure preset timing resolves sequential durations or phrase-relative `startBar` onsets on the sixteenth-note grid (`STEPS_PER_BAR`). Explicit onsets support leading, internal, and trailing rests; validation rejects overlaps, unsorted/off-grid onsets, sub-sixteenth gates, and phrase overflow.
  - Fixed phrases repeat without stretching and clip at the target/work-range boundary. Playback and MIDI export retain each attack and its gate duration; auto-smooth changes voicings while preserving timing.
  - Six four-bar electronic stab presets: **Dub Techno Sparse Stabs** (2 hits/bar), **Deep House Offbeat Stabs** (4), **Piano House Syncopated Stabs** (5), **UK Garage Skipping Stabs** (6), **Future Bass Eighth Stabs** (8), and **Trance Sixteenth Stabs** (16). Each holds one harmony per bar while repeating short attacks; patterns range from sparse offbeats through syncopation to continuous sixteenths.
  - Consecutive identical Roman symbols are condensed in preset summaries; individual chord events remain in the timeline. Existing **Dub Stab** and **Muted Pluck Chords** synth sounds provide short articulation; sound selection is independent of progression selection. The 16-hit phrase relies on a fast-decay envelope because its gates fill the sixteenth-note grid.
  - Rests remain actual gaps: chord lookup uses its existing scale/root fallback there, and **Close Gaps** deliberately replaces silence with extended chord gates.
- **Dynamic Diatonic Palette:**
  - Calculates all diatonic triads and 7th chords for any of the 21 scales.
  - Displays Roman numerals, chord qualities (Major, Minor, Diminished, Augmented), and constituent notes.
  - Interactive audition: Click any chord card to hear it via the accompaniment synth.
  - Insert mode: Add chords directly to the progression timeline with a single click.
- **Interactive Timeline:**
  - Visual chord blocks positioned along the bar ruler.
  - Drag to reposition chords; drag block edges to resize duration in quarter-bar increments.
  - Real-time voice leading badges: Displays total semitone distance between adjacent chords.
  - **Auto-Smooth Voice Leading:** Algorithmic one-click inversion optimization that minimizes pitch distance across chord transitions.
- **Chord Inspector:**
  - Voicing styles: `Close`, `Open`, `Drop-2`.
  - Inversions: Root position, 1st inversion, 2nd inversion, 3rd inversion.
  - Register shift: Transpose chords up or down in octaves.
  - Scale step transposition: Nudge chords diatonically or chromatically.
- **Harmonic Guidance for Melody:**
  - When chords are active, the melody generator guides downbeats and accents to match underlying chord tones based on the Chord Adherence parameter.

---

## 8. Variation & Mutation Suite

Located in the left sidebar, the Variation module modifies existing melodies within the targeted work range:

### 8.1 Mutation Mode

- **Mutation Strength Knob (0% to 100%):** Controls the depth and probability of transformation.
- **4 Independent Mutation Axes:**
  1. `Rhythm`: Shifts note onset positions, splits steps, or adjusts subdivisions.
  2. `Pitch`: Transposes notes by small scalar intervals while preserving rhythmic contours.
  3. `Ornament`: Injects grace notes, passing tones, and neighboring embellishments.
  4. `Simplify`: Prunes less prominent notes and lengthens primary tones for a cleaner line.
- **Keep Original as Take:** Automatically saves the pre-mutation melody into the Take Rack before applying changes.

### 8.2 Transform Mode (Deterministic Operations)

- **Invert:** Melodic inversion across the horizontal center pitch axis.
- **Reverse:** Retrograde transformation reversing the chronological order of notes.
- **One Up / One Down:** Shifts all pitches up or down by one diatonic scale step.
- **Double / Halve:** Metric augmentation (doubling durations) or diminution (halving durations).
- **Octave Up / Octave Down:** Transposes all pitches by +/-12 semitones.
- **Shift Forward / Shift Back:** Displaces the melody forward or backward by one grid snap step.

---

## 9. Take Management & A/B Comparison

The Take Rack (`TakeRackModule.vue`) provides non-destructive versioning of generated melodies:

- Stores up to 25 historical takes in a FIFO queue.
- **Take Row Metadata:**
  - Mini pitch contour sparkline.
  - Catchiness score badge.
  - Timestamp, seed number, and note count.
- **Take Protection:** Lock icon protects favorite takes from being overwritten when the queue is full.
- **Instant Audition:** Listen to any previous take in the background without loading it into the active piano roll.
- **One-Click Load:** Restores any historical take directly into the active editor.
- **Seed Reuse:** Extracts the PRNG seed from any take and applies it back to the generator.
- **A/B Comparison Switch & Swap:** Toggle between the current melody and a selected take to evaluate variations in real time, with a dedicated Swap button.
- **Clear All Modal:** Safely purges unlocked takes while preserving locked favorites.

---

## 10. Melody Analysis & Catchiness Scorer

The Analysis module (`AnalysisModule.vue`) provides real-time music theory metrics on the active melody:

- **Contour Sparkline:** Miniature SVG waveform displaying pitch motion across time with exact pitch range bounds (e.g. `D4 - G5`, semitone span).
- **Motion Balance:** Visual horizontal split bar showing the proportion of:
  - Stepwise motion (diatonic seconds).
  - Melodic leaps (thirds and greater).
  - Repeated pitches.
- **Syncopation Ratio:** Percentage of notes placed on weak metric offbeats.
- **Chord Tone Ratio:** Percentage of notes aligning with underlying harmony, plus delta compared to target adherence.
- **Repetition Score:** Measures motif recurrence and exact phrase repetition across bars.
- **Rhythm Predictability:** Quantifies rhythmic regularity versus syncopated variety.
- **Tension Lane:** Bar-by-bar visualization of musical tension based on register height and dissonance.
- **Catchiness Score (0 to 100):** Composite heuristic score evaluating balance between repetition and novelty, paired with descriptive rating tags (`Hook`, `Strong`, `Balanced`, `Complex`).

---

## 11. Audio Engine, Synthesizers & Mixer Rack

### 11.1 Audio Architecture & Signal Flow

Melody Mate v2 features an onboard audio engine that requires no external plugins or soundfonts:

- Single unified AudioContext and Tone.Transport runtime.
- **Glitch-Resistant Audio Buffer & Audible Playhead Sync:** AudioContext is initialized/clamped to $\le 48\text{ kHz}$ (via `MAX_SAFE_AUDIO_SAMPLE_RATE`) with `latencyHint: 'balanced'` (~10.6 ms buffer headroom) and a snappy $100\text{ ms}$ scheduling lookahead (`lookAhead: 0.1s`). Visual playhead queries evaluate at `Tone.immediate()` (`getAudibleTransportSeconds`) compensated for DSP limiter and hardware output latency, eliminating visual-to-auditory desync and preventing buffer underruns.
- **Signal Flow:**
  $$\text{Voice Generators (Tone / Native)} \longrightarrow \text{Channel Strips (Lead / Chord)} \longrightarrow \text{FX Sends (Delay / Chorus / Reverb)} \longrightarrow \text{Bus Compressor} \longrightarrow \text{Worklet Limiter} \longrightarrow \text{Destination}$$
- Safe audition synth for piano roll clicks and keyboard previewing.
- Panic button (`audioStore.panic`): Silences internal voices and effect tails, cancels app-owned MIDI queues and pending opens, releases known notes, and sends safety controllers only on used MIDI channels.

### 11.2 Dual Channel Strips (Melody & Chord Tracks)

Accessible via the **Sound & Mix** workspace dock (`S`):

- Dedicated channel strips for **Melody (Lead)** and **Chords (Accompaniment)**.
- Track Solo (`S`) and Mute (`M`) buttons.
- Volume horizontal faders with decibel calibration and one-click reset buttons.
- Preset selector dropdown with factory banks.
- **Live ADSR Canvas:** Real-time visual envelope curve displaying attack, decay, sustain, and release slopes.
- **8 Sound Shaping Micro-Knobs per Track:**
  - Row 1 (Envelope): Attack (`Atk`), Decay (`Dec`), Sustain (`Sus`), Release (`Rel`).
  - Row 2 (Filter & Effects): Filter Cutoff (`Cutoff`), Delay Send (`Delay`), Chorus Send (`Chorus`), Reverb Send (`Reverb`).

- **Workspace dock lifecycle:** Sound shares the mutually exclusive `activeStudioDock` selection with Chord, Rhythm, and Arp; its open state is derived. It does not change active track or undo context. Close, `S`, and Escape restore focus to the footer trigger; selectors/modals handle Escape first. Dock closure leaves transport playback running.
- **Layout:** `SoundMixDock.vue` mounts one `SynthRack` in the center viewport with header, Close, shared `DawResizeHandle`, and bounded content scrolling. All studio docks use `useStudioDockSize` to observe available workspace height and avoid competing minimums on short windows. Sound defaults and persisted preferred height are centralized in `ui-defaults.ts`; the versioned development preference reset drops the previous independent Sound boolean. Global Panic lives exactly once in the persistent footer. Below 1024px, Reset Settings and Export MIDI use named icon triggers and master status omits its meter bar/heading to keep all footer actions reachable. No Web MIDI or routing controls are implemented here.

### 11.3 Calibrated Factory Sound Presets

- **Native Subtractive Synthesizer Bank:**
  - `Warm Analog Poly`: Rich polyphonic pad with dual detuned saw oscillators, 24dB warm filter, and chorus stereo spread.
  - `Wide Saw Lead`: Modern stereo supersaw lead with 4-voice unison detune, centered sub punch, and snappy envelope attack.
  - `Focused Punch Bass`: Monophonic bass with dedicated sub oscillator, tight dynamics, and chorus bypassed for mono low-end safety.
  - `Transient Kalimba Pluck`: Percussive acoustic-inspired pluck with fast wooden decay.
  - `Ethereal Motion Pad`: Atmospheric chord pad with slow breathing filter modulation.
- **Calibrated Tone Synthesizers:**
  - `Soft Triangle Keys`: Warm, clean polyphonic keys.
  - `Triangle Comp`: Balanced chord comping sound.
  - `Analog Lead`: Moog-style resonant 24dB lead synth.
  - `Pluck Arp`: Short decay arp lead with filter bite.
  - `80s Synthwave`: Dual-oscillator vintage synthwave lead.
  - `Warm Ambient Pad`: Soft ambient pad for harmonic accompaniment.
  - `Electric Piano / Rhodes`: Classic FM-style electric piano with subtle tremolo.

### 11.4 Master Output Bus & Audio Protection

- **Creative Bus Compressor:** Glue compression for cohesive master output.
- **AudioWorklet Lookahead Brickwall Peak Limiter:**
  - Real-time AudioWorklet lookahead limiter preventing speaker distortion and clipping.
  - Live Gain Reduction meter showing instantaneous decibel attenuation (`-X.X dB`).
  - Strict ceiling protecting against volume spikes.
- **AudioWorklet Stereo Peak & RMS Meter:**
  - Dual vertical bar meters with peak-hold indicators.
  - High-visibility clip indicator LED.
  - Tabular dBFS numeric readouts.
- **Sample Sanitization:** Audio pipeline sanitizes non-finite (`NaN` / `Infinity`) floating-point samples to prevent audio graph lockups.

---

## 12. Transport & DAW Navigation

- **Playback Controls:**
  - Play / Pause (`Space`).
  - Stop (`Home` / Stop button): Returns playhead to loop start or Bar 1.
  - Stop & Rewind to Start (`Shift+Space`).
  - Step forward / backward by one bar (`,` / `.`).
- **Looping & Cycle Mode:**
  - Loop toggle (`L`).
  - Loop selection (`Ctrl+L` / `Cmd+L`): Automatically snaps loop pins to selected notes.
  - Interactive loop start and loop end draggable pins on the timeline ruler.
  - Play from Loop Start toggle.
  - Return to Start on Pause toggle.
  - Shared note gates stop at the loop end; internal instrument release and effect tails can decay afterward.
- **Timecode Readout:** Bar.Beat.Step position counter (e.g. `02.03.01`).
- **Tempo Management:**
  - 40 to 280 BPM range.
  - Tap Tempo button for manual tempo averaging.
  - BPM changes rebuild upcoming melody and chord schedules together, preserving the short transport ramp and existing sounding internal voices.
- **Full Undo / Redo:**
  - History stack covering all note edits, transpositions, additions, deletions, and quantizations (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`).

---

## 13. Multi-Track MIDI Export & DAW Integration

### Live MIDI access infrastructure (Task 62)

- `src/audio/midi/access-manager.ts` owns explicit `requestMIDIAccess({ sysex: false })`, secure-context/feature detection, output discovery, refresh and `statechange` subscriptions. Input ports are never opened or subscribed.
- `runtime.ts` shares one manager between runtime owners; `midi-output.store.ts` orchestrates actions and holds only copied plain snapshots. Permission, native ports and availability are not persisted. Creating the store does not request permission.
- Global and per-track snapshots expose English status messages and recovery actions for unsupported/insecure contexts, disabled/requesting/denied access, no outputs, available/opening/ready/disconnected ports and failures. Ready means connected and open, not confirmed device reception.
- Port selection uses exact IDs without fallback to names or the first device. Pending opens are deduplicated and invalidated after disable, close, replacement, disconnect or disposal. Reconnect requires an explicit open. Failed candidate selection retains the working previous route.
- `port-resource.ts` shares one resource across Melody/Chords, serializes asynchronous open/cleanup/close, and closes after the final usage. A runtime cleanup hook receives the native port, track and reason before close, switch, disable, disconnect or disposal for the later note-lifecycle implementation. Cleanup failures do not block cleanup of other resources.
- Small access/port fakes verify permission and open races, hotplug, shared usage, switch rollback, close/reopen ordering and listener disposal. Visible MIDI UI and project persistence remain pending.

API behavior was verified against [MDN requestMIDIAccess](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMIDIAccess) and the [W3C Web MIDI specification](https://www.w3.org/TR/webmidi/), including the distinction between device state and `open`/`closed`/`pending` connection state.

### Audio/performance clock bridge and owned port queue (Task 63)

- Pure `src/core/transport/output-timing.ts` maps audio seconds to performance milliseconds using a validated, fresh output timestamp pair, or an explicitly estimated raw-context/current-performance fallback. Internal graph latency is added once; positive route offsets delay MIDI, negative offsets advance it. Device `baseLatency`/`outputLatency` are not added again to the calibrated pair. `createToneMidiClockBridge` reads the existing Tone raw context; pass `EffectsRack.getOutputLatencySeconds()`, not `PlaybackEngine.getOutputLatencySeconds()` (which includes device estimates). Clock discontinuities, suspend/resume and explicit reset invalidate the scheduling epoch.
- `MidiPortQueue.own()` enforces one queue per native port and a shared clock owner/timing policy across sessions. A port must expose `clear()` before any notes can be submitted. All note, cleanup and panic sends are timestamped and recorded in a submitted-event ledger; this records submission, not confirmed physical delivery.
- `DEFAULT_MIDI_QUEUE_TIMING` centrally defines a 30 ms output horizon, 10 ms pump interval, 20 ms late-On threshold and 2 ms cancel guard. Long releases remain local until they enter the horizon. Injected wakeups drive the pump; their call time never defines the musical timeline. Missed/expired attacks are dropped, late releases sent immediately, equal-time Offs ordered before Ons. Same-pitch retriggers shorten the predecessor gate and remove its stale release, including when future attacks arrive out of order.
- Track, session, generation, loop and stable source-note cancellation use port-wide `clear()` followed by a new clock sample. Only definitely future attacks are requeued; potentially due attacks are never replayed. Canceled possible ownership gets targeted Offs, while retained voices keep their release obligations. Cleanup-Off obligations and late releases remain owned until their actual submitted timestamp has passed the guard, so consecutive clears cannot silently discard them. Pure reconciliation preserves unchanged possible-active sources across schedule refreshes and supports per-note mute. Superseded retrigger ownership cannot release a newer voice. A failed clear blocks further scheduling and attempts emergency release, including Offs following submitted future attacks.
- `MidiOutputSession` maps injected audio-time intents and verifies the negative-offset/lookahead/pump/guard budget. Its disposal cancels only its own session; port disposal and panic provide broader cleanup. The shared access runtime's cleanup hook cancels a closing/switching track before releasing its port lease; disconnect stops its queue and retains known release obligations for explicit recovery. Panic sends explicit Offs plus sustain-off, All Notes Off and All Sound Off only on channels used by that owner. New attacks are rejected until panic submissions have passed the cancel guard; cleanup obligations survive a queue-owner replacement. A failed owner remains unavailable until explicit recovery performs known-note cleanup.
- Deterministic core tests and port-buffer fakes cover units, additive graph latency, fallback/reanchoring, short/long gates, shared-port clear races, future/due attacks, late releases, retriggers, per-note reconcile, failure cleanup and disposal. External app playback is wired after Task 65 lifecycle verification. Preview/test-note UI and MIDI Clock messages remain pending. Task 64 verifies the actual dispatch advance budget; Task 69 must measure real ports and latency.

Timing and cancellation contracts were verified against [MDN getOutputTimestamp](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp), the [Web MIDI send/clear specification](https://www.w3.org/TR/webmidi/#dom-midioutput-clear), installed Tone 15.1.22 clock code and the local limiter's sample-delay path. Hardware delivery is not acknowledged by the API and has not been measured in this task.

### Shared transport output router (Task 64)

- `src/audio/output-router.ts` dispatches existing Tone-scheduled melody events and concrete chord voicings to Internal, MIDI or Both. Internal instruments remain `InstrumentHost` adapters; MIDI-only does not look up a synth or allocate internal voice ownership. MIDI enqueue failures are isolated from Both's internal playback.
- Melody starts retain swing, timing looseness and Tone tick rounding. Melody uses `AppNote.midi`, its stable note ID and musical velocity; chords convert their actual voicing with the pure MIDI pitch helpers and retain the existing chord velocity from `DEFAULT_TRANSPORT_OUTPUT`. Each external instance carries session, track generation, loop iteration and a unique event ID. A schedule refresh invalidates future callbacks without discarding the existing internal sounding voices.
- Shared dispatch checks mixer mute/solo and live Harmony use/mute state independently of audio gain. Muted melody notes are omitted from the schedule. Master/track faders, synth patches and FX neither change MIDI velocity nor emit CC messages. Mixer mute is held in `EffectsRack` and applies even when audio faders are zero.
- Active-chord pickup uses the same router and existing remaining duration; selection and remainder calculations live in pure `core/transport/chord-pickup.ts`. `core/transport/output-gate.ts` clips both branches' gates to the musical loop boundary using the actual rounded groove start or pickup position. This deliberately shortens internal gates that previously crossed the loop end; release and FX tails remain available. The native adapter honors explicit numeric gates below 50 ms instead of extending them across that boundary; notation-based preview durations keep their existing conversion. `prepareLoopBoundary(audioTimeSeconds)` captures the old iteration and musical boundary, then advances identity for the next On; Task 65 supplies the single Tone loop listener and releases/cancellation.
- External dispatch verifies the current Tone context's `lookAhead - updateInterval`, capped by the callback's actual remaining audio-time advance, against negative offset plus queue pump/guard needs. Installed Tone 15.1.22 visits ticks since the previous wakeup; 100 ms lookahead and its derived 50 ms interval give a conservative 50 ms advance, allowing at most 38 ms negative offset with the default 10 ms pump and 2 ms guard. Unsupported offsets or late callbacks are rejected through the injected error handler; there is no second musical timeline.
- `audio.store.ts::setBpm` rebuilds future melody and chord schedules from the new ProjectConfig through the shared scheduler, including while playback flags are still catching up. `PlaybackEngine.schedule(..., preserveTempoRamp)` retains the short BPM ramp instead of assigning the transport BPM directly during this refresh. Newly dispatched Both notes share the new duration; current internal voices retain the existing edit semantics.
- Routing settings and the MIDI output session are explicit runtime dependencies. Application audio initialization supplies the lifecycle-controlled MIDI runtime after Task 65 verification; Internal remains the default. No preview routing, MIDI UI or persistence changes are included. Automated router, timing and playback tests cover dispatch modes, absent synth hosts, concrete groove/voicing, pickup, generation/source identity, loop gates, audibility, zero faders, MIDI failure isolation and live BPM duration refresh. Existing internal playback regressions pass; hardware/browser playback remains unverified.

Tone scheduling semantics were checked through Context7's [Tone Transport documentation](https://github.com/Tonejs/Tone.js/wiki/Transport) and the installed Tone 15.1.22 Context/Clock/Transport implementation. Real port timing and delivery validation remains in Task 69.

### MIDI transport lifecycle and global Panic (Task 65)

- `MidiTransportOutput` owns transient routing settings, per-track external resume authorization and asynchronous operation identities. The MIDI store exposes runtime routing actions without adding UI or persistence. `audio.store.ts` injects the runtime into `PlaybackEngine`; access remains explicit and defaults remain Internal. A track cannot dispatch after suspension/disconnect merely because its port reappears.
- `TransportMidiLifecycle` ties the existing queue to Stop, Pause, Seek, Clear, loop edits, per-track and per-note edits, Reset/Load and Dispose. Schedule revisions reject withdrawn Tone callbacks; start-operation identities reject delayed audio unlock or port-open completions after cancellation/Panic. Session revisions also reject an in-flight dispatch canceled by a Clock-read lifecycle transition. Dispose detaches the loop, context and page listeners.
- The installed Tone 15.1.22 source emits `loopEnd`, then `loopStart`, then `loop`, before invoking the new iteration's start tick. Exactly one runtime `loopEnd` listener advances the iteration identity and caps old-iteration MIDI releases at the supplied musical audio time (including route alignment), rather than releasing immediately inside the advanced callback. Equal-time Offs precede retrigger Ons; old releases cannot terminate a newer iteration.
- Lead schedule reconciliation retains unchanged possible-active `AppNote.id` ownership separately from the new future generation. Selected-note mute and localized edits release changed/removed notes while retained melody notes and chord releases survive the shared port clear/rebuild. Large Replace/Generate ends the affected track generation. Chord changes retain the existing routed pickup with its remaining duration. BPM/groove rebuild both future branches together, releasing external notes while preserving the existing internal-tail policy.
- Mixer mute/solo and Harmony use/mute changes release excluded external tracks immediately. Faders and synth changes do not emit controllers. All ordinary cancellation goes through Task 63's submitted ledger and clock sample after `clear`; no broad Panic CCs are added to track/note cancellation.
- Route changes are serialized, validated and opened before old-route cleanup; channel/offset changes use the same preparation boundary. Failed preparation retains the old settings and active route. Pending candidates are invalidated synchronously by Panic/Disable/Dispose, preventing stale opens from restoring output. Shared-port leases and sibling note/releases remain owned throughout switching and close.
- MIDI Disable, pagehide, AudioContext suspend and clock discontinuity disarm output and cancel future notes. Disconnect stops further queue sends, attempts a queue clear with submitted-ledger reconciliation and keeps known release obligations. Explicit Play/resume resolves the desired target and performs targeted old-note cleanup, including when the browser supplies a replacement port object with the same ID, before arming new playback; it never replays old attacks.
- Global Panic extends the existing internal action with app-owned queue clear, explicit Offs, then CC64/CC123/CC120 only on used port/channel pairs. It does not broadcast across unused outputs or all sixteen channels. Pending opens are canceled even if the audio engine has not initialized.
- Production transition tests reuse the Task 63 port/buffer fakes for shared-port clear races, retained sibling Offs, per-note mute, loop retriggers, stale callbacks/unlocks, edits/BPM/groove, route preparation, disconnect/reconnect, suspension, Reset/Load and Panic. Physical disconnect/crash cleanup, browser scheduling and real hardware/DAW timing remain unverified; Task 69 owns that acceptance.

### MIDI file export

Melody Mate v2 provides professional MIDI export formatted for immediate use in external digital audio workstations:

- **Export Formats (`DawMidiExportPopover.vue`):**
  1. **Lead Melody (.mid):** Channel 1 lead track only.
  2. **Chords (.mid):** Channel 2 chord voicings only.
  3. **Multi-Track MIDI (.mid):** Combined file with Lead on Channel 1 and Chords on Channel 2.
- **Standard MIDI File Encoding:**
  - Built with `midi-writer-js` using standard 128 ticks-per-beat resolution.
  - Embeds standard MIDI meta-events:
    - Key Signature meta-event (e.g. `Cm`, `G`).
    - Time Signature meta-event (`4/4`).
    - Set Tempo meta-event based on active BPM.
- **Groove Preservation:**
  - Swing and timing looseness are rendered directly into exported tick timestamps while keeping notes quantized to DAW beat grids.
- **Producer-Standard Filenames:**
  - Automatically formats descriptive filenames: `MelodyMate_<Key><Scale>_<BPM>BPM_<Bars>bar_<Type>.mid` (e.g. `MelodyMate_Cmin_124BPM_4bar_MultiTrack.mid`).
- **DAW Compatibility:** Verified drag-and-drop compatibility with Ableton Live, FL Studio, Logic Pro, Studio One, Bitwig Studio, Cubase, Reaper, and hardware MIDI sequencers.

---

## 14. Keyboard Shortcuts Reference

| Category                  | Shortcut               | Action                                    |
| :------------------------ | :--------------------- | :---------------------------------------- |
| **Transport**             | `Space`                | Play / Pause                              |
|                           | `Shift+Space`          | Stop & Rewind to Start                    |
|                           | `Home`                 | Return Playhead to Loop Start or Bar 1    |
|                           | `L`                    | Toggle Transport Loop                     |
|                           | `Ctrl+L` / `Cmd+L`     | Snap Loop Region to Selected Notes        |
|                           | `F`                    | Toggle Follow Playhead (Auto-Scroll)      |
|                           | `,` / `<`              | Seek Playhead Backward by 1 Bar           |
|                           | `.` / `>`              | Seek Playhead Forward by 1 Bar            |
| **Tools**                 | `1` / `V`              | Select Tool (Move, Resize, Work Range)    |
|                           | `5`                    | Lasso Selection Tool                      |
|                           | `2` / `P`              | Pencil Tool (Draw Notes)                  |
|                           | `3` / `E`              | Eraser Tool (Delete Notes)                |
|                           | `4` / `H`              | Hand Tool (Pan Viewport)                  |
| **Editing**               | `G`                    | Generate Melody                           |
|                           | `Ctrl+Z` / `Cmd+Z`     | Undo                                      |
|                           | `Ctrl+Y` / `Cmd+Y`     | Redo                                      |
|                           | `Delete` / `Backspace` | Delete Selected Notes                     |
|                           | `Ctrl+D` / `Cmd+D`     | Duplicate Selected Notes                  |
|                           | `Ctrl+A` / `Cmd+A`     | Select All Notes on Active Track          |
|                           | `Escape`               | Deselect Notes / Close Dialogs & Docks    |
|                           | `Up` / `Down`          | Transpose Selected Notes by 1 Semitone    |
|                           | `Shift+Up` / `Down`    | Transpose Selected Notes by 1 Octave      |
|                           | `Left` / `Right`       | Nudge Selected Notes by Snap Grid         |
|                           | `Shift+Left` / `Right` | Extend / Shorten Selected Note Duration   |
|                           | `Alt+Up` / `Alt+Down`  | Increase / Decrease Note Velocity         |
|                           | `M`                    | Mute / Unmute Selected Notes              |
|                           | `Tab`                  | Switch Active Track (Melody vs Chords)    |
|                           | `G`                    | Generate Melody / Arpeggio                |
|                           | `Shift+G`              | Shuffle Arpeggio Candidate Seed           |
|                           | `K`                    | Toggle Scale Lock                         |
| **Studio Docks & Panels** | `B`                    | Toggle Left Sidebar (Generator Panel)     |
|                           | `N`                    | Toggle Right Sidebar (Pitch & Feel Panel) |
|                           | `R`                    | Toggle Rhythm Studio Dock                 |
|                           | `A`                    | Toggle Arp Studio Dock                    |
|                           | `C`                    | Toggle Chord Studio Dock                  |
|                           | `S`                    | Toggle Sound & Mix Dock                   |
|                           | `?`                    | Open Keyboard Shortcuts Modal             |
| **Viewport & Zoom**       | `+` / `=`              | Zoom In Horizontally                      |
|                           | `-`                    | Zoom Out Horizontally                     |
|                           | `Shift++` / `Shift+=`  | Zoom In Vertically                        |
|                           | `Shift+-`              | Zoom Out Vertically                       |
|                           | `Z` / `0`              | Fit Loop to Viewport                      |
|                           | `Shift+Z`              | Fit Height to Viewport                    |

---

## 15. Persistence & Data Integrity

- **Automated Local Storage Sync:**
  - Pinia stores serialize changes to HTML5 `localStorage` with a 1000ms debounce.
  - Zod schemas validate stored payloads upon reload; outdated or malformed schemas safely reset to centralized defaults without crashing.
- **Factory Defaults Priority:**
  - Generator, project, and audio settings are stamped with a fingerprint of defaults from `src/config/defaults.ts`.
  - Updating code defaults automatically supersedes stale storage values.
- **Reset Settings Modal:**
  - One-click project reset in the footer allows purging local storage with confirmation.
