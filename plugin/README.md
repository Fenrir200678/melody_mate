# Melody Mate JUCE feasibility prototype

This macOS VST3 prototype shares the existing Vue editor, canvas piano roll, generators, knobs, chord/rhythm/arp studios and domain logic. The web edition remains the normal browser build with Tone.js, Sound & Mix and MIDI downloads. No installers or release distribution are provided.

## Build

Verified toolchain: Apple Silicon, macOS Command Line Tools (Apple clang 21), CMake 4.4.4, Ninja 1.13.2, pnpm 12.8.1. CMake/Ninja were installed locally for this task. Full Xcode is not required by the Ninja build. The deployment target is macOS 14, matching the Safari 17 frontend build; only the installed macOS 27.0.1 environment was exercised.

```sh
pnpm install --frozen-lockfile
pnpm plugin:build
pnpm plugin:test
pnpm check
pnpm test:run
pnpm build
```

The first native configure downloads JUCE **9.0.4**, pinned to commit `3fb5cbc0340758596dac39f7c8de47d562b4896e` and archive SHA-256 `2bb7095497a7bb7269dbdf841a7c6aa0939eaeb2a2bc9724ac4758d3ae3565a7`. Subsequent builds use the CMake cache. The frontend and native binary work offline after building. `@juce-framework/webview` is pinned to 1.0.0, matching this JUCE revision.

The initial target is arm64. An Intel build requires an explicit CMake architecture change and its own host checks. A successful arm64 build does not establish universal-binary or Windows support.

Output:

```text
plugin/build/MelodyMatePrototype_artefacts/Release/VST3/Melody Mate Prototype.vst3
```

`pnpm plugin:build` rebuilds assets, reconfigures the ZIP embedded in BinaryData and builds native code. Rebuilding only C++ after editing Vue will retain the previously configured asset bundle. The plugin never uses a development server or absolute checkout path for its UI. The completed local VST3 bundle is ad-hoc signed after JUCE regenerates `moduleinfo.json`, so incremental version changes do not leave a stale resource seal.

For local development registration:

```sh
pnpm plugin:link-local
```

This creates `~/Library/Audio/Plug-Ins/VST3/Melody Mate Prototype.vst3` as a symlink to this checkout's build. It refuses to overwrite a different installed copy. Remove only that symlink to unregister the prototype. It was created for the local Ableton scan; CMake itself does not copy plugins.

The native probe loads the actual VST3 through JUCE's host wrapper:

```sh
pnpm plugin:probe
pnpm plugin:probe --ui-smoke --save plugin/build/ui-smoke-state.json
pnpm plugin:probe --show
pnpm plugin:probe --show --state plugin/build/ui-smoke-state.json --save plugin/build/reopened-state.json
```

`--ui-smoke` opens a fresh editor, waits for its real frontend state to reach the processor, then exits. It is a boot/bridge check; it does not simulate pointer interactions. `--show` stays open for manual review and uses synthetic host PPQ from a message-thread probe timer. That timer drives the test host only; production playback runs in the DAW processing callback. `--state`/`--save` read/write raw prototype JSON fixtures, while the probe uses the JUCE VST3 state envelope for host save/restore. The input fixture is never overwritten. `BUILD_TESTING=OFF` excludes the probe/test targets.

## Use

1. Load **Melody Mate Prototype** on an instrument track and route its MIDI output to another track with an instrument. Its stereo audio bus is intentionally silent.
2. Choose key, scale and project length in the shared editor. Generate with the existing controls or use **Demo melody** for a small four-note sequence. Edit notes and velocities on the normal piano roll.
3. Start/stop, set tempo and seek in the DAW. **MIDI output** enables both the melody and enabled/unmuted chord track. Melody uses channel 1; chords use channel 2. **Repeat project** repeats the complete arrangement from host PPQ zero. Without it the arrangement plays once at its absolute PPQ positions.
4. For a melody clip, drag **Drag melody MIDI to DAW** from the native strip above the WebView onto a DAW MIDI track. This is an OS file drag from a real temporary `.mid` file, encoded with the existing `buildMidiBytes()` exporter. The drag-start return value cannot confirm successful import.
5. Wait for **Stored in plugin instance**, then save the DAW project. Each instance holds its own versioned session and prepared native playback. Closing its editor does not stop native playback.

### One instance, two synth tracks through IAC (prototype 0.1.3)

1. In macOS **Audio MIDI Setup → Window → Show MIDI Studio**, open **IAC Driver**, enable **Device is online**, add or choose a dedicated bus (for example **Melody Mate**), and apply. The plugin does not change system settings or create a persistent bus.
2. In Live **Settings → Link, Tempo & MIDI**, enable **Track** for that IAC **input**. Leave **Sync** and **Remote** off. Leave Live's output to this bus disabled; do not route the receiving tracks back to it.
3. Load **one** Melody Mate instance. In its native **MIDI destination** strip choose **External MIDI**, then the IAC bus. **Refresh ports** updates the list after setup. Generate chords and a melody in the same project; enable chords and **MIDI output** in the shared editor.
4. Create two other MIDI tracks with different synths. Set both tracks' **MIDI From** to the IAC bus, then choose **Ch. 1** for melody and **Ch. 2** for chords in the lower chooser. Set **Monitor: In** (or arm with **Auto**). Select the external bus itself, rather than the Melody Mate track, as the source.
5. Start Live's transport. **Host MIDI** and **External MIDI** are exclusive: external mode suppresses new host MIDI events, including when its port is missing. Returning to host mode releases external voices; any previously held host notes receive their release on the next processing callback. **Panic** releases external voices even if callbacks have stopped.
6. Save the Set. Mode, exact CoreMIDI port ID and display name are stored per instance independently of frontend commits, including for a blank session. A missing port is shown as unavailable, with no fallback to another port or to host MIDI. The same ID is retried approximately once per second, including with the editor closed. If an endpoint was recreated with a different ID, select it again explicitly. Close the editor and verify playback, then save/restart Live and play before opening it again.

Use a dedicated bus/channel pair: connecting/reconnecting releases **all 128 pitches on channels 1 and 2** before playback, to clean up voices left by a vanished endpoint. An unplugged or offline receiver cannot acknowledge note-offs; release is best effort until it becomes reachable again. Two instances sharing that pair can silence each other's voices during this reset.

External timing is a prototype boundary. Host PPQ/BPM still determine every note and sample offset. The callback only writes fixed-size records to a 32,768-event SPSC queue; it never enumerates/opens devices, takes a state mutex, allocates a MIDI packet, writes files or calls CoreMIDI. Each event's native monotonic deadline is callback-entry time **+20 ms + sample offset / sample rate**. A separate native thread polls at 1 ms and sends due packets immediately through CoreMIDI. It retains future events itself rather than handing them to a second JUCE/OS scheduler; stop/seek/snapshot/restore/route changes can therefore discard pending note-ons. Worker scheduling and Live's own input buffering add jitter/latency. This does **not** establish sample-accurate IAC delivery, alignment with the host event bus, or automatic plugin delay compensation. Measure and adjust the receiving tracks manually for the actual buffer size and routing.

Stop, missing timing, seek, snapshot replacement, panic and bypass cancel pending events and release held voices. Host loops retain ordered sample-offset offs/chase events, including wraps inside a block. Overflow or events more than 100 ms late cancel the generation and release voices; the next normal callback reconciles held notes. If processing disappears without a final callback, a watchdog releases voices 250 ms after the last block's lookahead/end. Processor teardown joins the worker after its release pass; closing only the editor leaves it running.

**Offline processing:** when the host reports non-realtime processing, external note-ons are suppressed and existing external voices are released. There is no fallback output in external mode. Host MIDI mode keeps its usual host event behavior. An external IAC round trip is a live route and is **not supported as a reliable offline export/freeze path**. Record the two receiving tracks' MIDI in real time, then render their clips/instruments in Live. Hosts that fail to report offline mode, real-time freeze behavior, delay compensation and final audible alignment need manual validation; no MIDI clock or feedback route is installed.

Manual acceptance remains open: one shared project → two different Live synths, stable stop/loop/seek/panic, editor closed, Set restart before editor creation, port disappearance/reconnection and offline rendering. Record Live version, buffer size, sample rate and observed timing; automated CoreMIDI delivery is not this Live acceptance.

Host tempo drives playback. The project's stored tempo is retained for generation groove conversion and MIDI-file tempo metadata; file import interpretation belongs to the receiving DAW. Imported clips are independent copies.

The prototype has no browser audition, Sound & Mix, Web MIDI setup, analytics, web download footer or browser project save. Audition controls in reused studios report that a receiving DAW instrument is needed. The editor requests native keyboard focus and consumes its handled editing/studio shortcuts. Space, transport seeks and loop shortcuts are not handled by the plugin; whether the DAW receives them depends on host keyboard focus. Click the DAW workspace to return keyboard control to Live. Editing shortcuts remain available and plugin shortcut help excludes transport/audition entries.

Piano-roll loop markers and **Loop target** remain editing references in this first prototype; native repetition uses **Repeat project** and actual host loop positions. Generation work ranges still restrict edits. UI layout/zoom, selection, undo history and uncommitted Arp candidate drafts reset when recreating the editor; musical content, applied notes, generator parameters, variations, chords, takes and custom rhythms are persisted.

## Architecture

- `src/main.ts` mounts the web application; `src/main-plugin.ts` mounts a small host-specific header around the existing `DawWorkspace`. This is a second composition root, not a duplicate editor.
- `#platform-audio` selects the browser or plugin store at build time. Shared UI editing and canvas bindings keep their current API. `#platform-midi` selects browser reset orchestration or a native no-op. The plugin audio adapter has no browser engine. `#sound-mix-dock` excludes that web-only surface.
- `getBrowserStorage()` returns unavailable before touching `window.localStorage` in plugin mode. No musical state or UI preference is read from browser storage in that edition.
- Vite builds all lazy models/chunks/fonts locally. A bundle guard rejects `src/audio/`, Tone.js and Vercel Analytics modules. CMake archives the complete frontend as ZIP/BinaryData; the resource provider serves only entries from that archive. Navigation is restricted to the local resource origin. CSP disallows network scripts and external connections.
- `src/core/plugin/` validates the versioned session/document and projects immutable notes to PPQ with existing groove functions. Note ends are clipped to the arrangement. Snapshots contain track identity, MIDI channel, pitch, velocity and musical start/end. Shared generators and editing stay in TypeScript.
- A typed command bridge provides `read`, `commit` and `panic`; native `transport` and `restore` events update the UI at display frequency. Bridge timeouts report failure. The frontend keeps one pending latest snapshot while a commit is in flight. No per-note bridge traffic or JavaScript playback timers are used.
- Native command callbacks validate version, object shape, finite/bounded playback fields, note count, file name and decoded single-track SMF before publication. Full musical-session schemas are checked in TypeScript; incompatible frontend state exposes an explicit reset action. C++ retains the document and playback even with no editor.
- A three-slot mailbox transfers immutable sequences. Producer and consumer each own one slot; only the middle slot changes through an atomic exchange. Parsing, vector creation/destruction, state mutexes, file writes and WebView work stay outside `processBlock`. Identical playback snapshots do not retrigger notes when only generator settings change.
- `MidiScheduler` calculates sample offsets from host PPQ/BPM in each callback. It handles start/stop, missing timing, seeks/chase, snapshot replacement, note-off ordering, host loops within/across blocks, full-project repetition, panic and bypass. Same-channel/pitch overlaps share one held voice, ending after the final overlapping note; they are not independently retriggered voices.
- `NativeMidiOutput` owns a native output thread and CoreMIDI client/output port for each processor. `MidiDispatch` provides bounded queueing, generation cancellation, receiver voice tracking and retryable releases. Separate scheduler state for host/external destinations permits release of the old destination without duplicating new notes. The native selector and its refresh timer only control routing; playback does not depend on editor lifetime. Native timing/queue defaults are generated from `src/config/defaults.ts`.
- Processing bounds: 4,096 notes and 8 MiB state. Extreme blocks exceeding 64 sequence segments or host wraps flush and reconcile on the next normal callback. Missing PPQ/BPM suspends output instead of inventing a free-running clock. The scheduler uses fixed working storage; JUCE/host MIDI-buffer storage is outside that scheduler guarantee. This is not a hard-real-time certification.
- DAW save returns the current native document immediately, without asking JavaScript. Restore parses native playback before editor creation; opening the editor hydrates the session from that instance. An epoch rejects queued edits originating before a host restore. Blank DAW state has an explicit versioned empty document.
- MIDI files are prepared on the message thread before dragging. The native handle starts the drag directly from `mouseDrag`; WebView asynchronous mouse-to-bridge handoff is deliberately avoided. Identical MIDI revisions reuse the file. Superseded files never dragged are removed; dragged files remain under the macOS temporary directory so late receiver reads/editor closure are safe. macOS/user temp cleanup owns those retained files.

## Validation and host limits

Recorded locally on 2026-10-26:

- Release VST3 build and ad-hoc signature verification passed; Mach-O is arm64.
- Native scheduler and external dispatch checks passed in Release and with AddressSanitizer/UBSan. Checks stay active under `NDEBUG`.
- `native-vst3` loaded the built bundle, ran two simultaneous instances with different notes, verified sample-offset MIDI/silent stereo, destroyed/recreated processors, and restored playback before editor creation.
- Prototype 0.1.3: `native-midi-dispatch` verifies deadlines, channel identity, equal-time off/on ordering, cancellation, overflow/late recovery, failed-release retry and cancellation during send. The actual VST3 probe uses temporary process-owned CoreMIDI destinations to verify melody channel 1/chords channel 2, no host duplication, queued-note cancellation, held-note stop, callback-loss watchdog, port change, offline entry/resume, teardown, blank-session routing persistence and route restoration before editor creation. These temporary test endpoints are disposed afterwards; IAC/system preferences are not changed.
- The real WKWebView loaded from its embedded resources and committed the complete TypeScript session to C++; the explicit bundle guard passed. Manual visual inspection showed the shared workstation. A saved frontend session containing generated melody notes also round-tripped through the host wrapper.
- User acceptance after the 0.1.1 event-input fix: Live track loading, dragging generated melody MIDI into Live, and routing generated MIDI to a synth on another Live track worked. Full restart/state, timing and pointer-capture criteria remain separate checks.
- Live's regular scanner recognized **Melody Mate Prototype**, version 0.1.0, device class `vst3:instr`, categories `Instrument|Synth`, SDK VST 3.8.0. Its log on 2026-10-26 at 20:01:44 CET records the successful scan. This establishes discovery/classification, not Live track routing or Set restore.

See the acceptance record below. The automated native probe is a focused JUCE host and does not establish Ableton compatibility.

| Criterion                                                                          | Evidence / status                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Native arm64 VST3 build                                                            | Builds with JUCE 9.0.4; local ad-hoc signature for development                                                     |
| Existing web behavior                                                              | Web production build, typecheck, lint and Vitest suite checked                                                     |
| Bundled offline surface                                                            | Bundle guard excludes browser services; real WKWebView boot/bridge smoke and manual visible-workspace check passed |
| PPQ, tempo, stop, seeks, loops, outstanding offs                                   | Focused native scheduler tests, including ASan/UBSan run; VST3 probe passed                                        |
| Editor-independent state/playback                                                  | Processor owns both; native VST3 probe passed                                                                      |
| Pointer capture, note/knob drags, keyboard focus/resizing                          | Existing handlers reused; manual macOS host check required                                                         |
| Melody file imported as usable DAW clip                                            | Generated melody drag/import confirmed by the user in Live 12.4.6; broader import edge cases remain open           |
| Two instances saved in a DAW and restored after DAW restart before opening editors | Native/state coverage is a prerequisite; full DAW project lifecycle requires manual check                          |
| Offline host render/freeze, duplicate/remove, bypass/suspend                       | Manual host checks required; not claimed compatible                                                                |

Installed host: **Ableton Live 12 Suite 12.4.6**. macOS GUI scripting reports Accessibility/UI automation disabled in this session. Do not infer pointer gestures, drag import or DAW project lifecycle from compilation or scanner success.

Classification: VST3 **Instrument/Synth**, no audio input, silent stereo output, MIDI event output and a compatibility MIDI event input. Live requires that input bus for instrument-class VST3 plugins; incoming MIDI is discarded and does not trigger or pass through the sequencer. This is a concrete prototype bus layout, not a universal DAW layout. Ableton's internal track routing merges MIDI channels. Prototype 0.1.3 adds native external output for one shared session through an existing IAC bus, with melody on channel 1 and chords on channel 2; actual Live channel separation remains a manual acceptance check. Logic is not covered: a later AU MIDI-FX build would be required.

### Live instrument-input correction (prototype 0.1.1)

The user's first Live track-load attempt with 0.1.0 failed despite successful discovery. Live 12.4.6 logged `plugin has instrument category, but no valid event input bus` and `No valid input bus could be found` on 2026-10-26 at 20:11:57 CET. The plugin exposed no MIDI input bus. Prototype 0.1.1 enables that event bus in both CMake metadata and `acceptsMidi()`. The audio input remains disabled; the processing callback discards incoming MIDI before generating output. The native host regression check verifies both MIDI capabilities and lack of input echo.

After updating, restart Live, rescan VST3 plug-ins if needed, and add a fresh instance of **Melody Mate Prototype**. The failed device already in the track may remain disabled. Verify prototype version 0.1.1 when checking scan results. The user subsequently confirmed Live track loading, generated-melody drag/import and MIDI routing to a synth on another track.

### Keyboard focus correction (prototype 0.1.2)

The user reported that `A` opened Arp Studio and also toggled Live automation lanes. The VST3 editor previously inherited JUCE's `EDITOR_WANTS_KEYBOARD_FOCUS=FALSE` default; on macOS this sets the native editor peer to ignore key presses. Prototype 0.1.2 explicitly requests keyboard focus. The shared shortcut handler now prevents the default action for every shortcut it actually handles and stops DOM propagation in the plugin edition. Unassigned keys, focused text controls and IME composition retain their existing behavior. No global native key interception is installed.

Focused tests cover the handled `A` command, unassigned keys, Space passthrough at the DOM boundary, text input and IME composition. The host focus result still needs a manual Live retry: click the piano roll, press `A`, and verify only Arp Studio toggles; repeat for `C`, `R`, `B`, `I` and editing commands. Check that typing in fields stays normal. Click Live's arrangement and verify its own `A` shortcut works again. Check Space with plugin and DAW focus separately. The WebView smoke check does not prove native shortcut isolation.

### Manual Ableton acceptance procedure

1. Enable VST3 system folders in Live's Plug-ins preferences, rescan, and load **Melody Mate Prototype** on a new MIDI track. Record the exact Live version and whether it appears as an instrument. Check that no audio input is required and its audio output is silent.
2. Create another MIDI track with an instrument. Set **MIDI From** to the plugin track and select the plugin's MIDI output in the lower chooser; monitor **In**. Verify melody and chord output. Disable chords for an isolated melody test. Internal routing merges channels.
3. Disable network connectivity after building. Reopen the editor, generate melody/bass, open Arp/Chord/Rhythm studios and verify lazy assets load. Drag/resize/create notes, change velocity, drag a small knob outside its bounds, release outside, use shortcuts, resize the editor, then close/reopen it. Record failures and display scaling.
4. Start/stop at multiple tempos; automate tempo, seek into a sustained note, seek backward, loop across a held note and at a block-aligned boundary. Check for extra/stuck notes and click **Panic**. Repeat with editor closed, bypass/reactivation and host stop. Test offline render/freeze separately where Live routes plugin MIDI for that workflow.
5. Drag the native melody handle into an empty MIDI clip/arrangement track. Verify notes, timing, duration, velocity, project groove, pitch and import position; repeat after editing and after dropping once. Check cancellation and dragging outside the editor. This is melody-only SMF import; chords/multitrack drag are not implemented.
6. Create instances A/B with visibly different notes, keys, bars, generator parameters, custom rhythm and takes. Wait for **Stored in plugin instance** in each. Save to a new test Live Set and quit Live normally. Restart, open that Set and start transport **before opening either editor**. Verify the two outputs differ as saved; open editors and compare contents. Repeat with one duplicated instance, undo/redo and editor closure. Do not use a production set for this acceptance exercise.
7. Record pass/fail with host version, architecture, sample rate, buffer size and plugin commit. Keep untested criteria open.

### Official references

- [Pinned JUCE release](https://github.com/juce-framework/JUCE/releases/tag/9.0.4)
- [WebView integration](https://juce.com/blog/juce-8-feature-overview-webview-uis/) and [WebBrowserComponent options](https://docs.juce.com/master/classjuce_1_1WebBrowserComponent_1_1Options.html)
- [AudioProcessor lifecycle](https://docs.juce.com/master/classjuce_1_1AudioProcessor.html) and [host PositionInfo](https://docs.juce.com/master/classjuce_1_1AudioPlayHead_1_1PositionInfo.html)
- [External drag API](https://docs.juce.com/master/classjuce_1_1DragAndDropContainer.html), [standard Base64 API](https://docs.juce.com/master/structjuce_1_1Base64.html)
- [Ableton plugin MIDI routing](https://help.ableton.com/hc/en-us/articles/209070189-Accessing-the-MIDI-output-of-a-VST-plug-in)
- [JUCE MIDI output API](https://docs.juce.com/master/classjuce_1_1MidiOutput.html), [Apple IAC setup](https://support.apple.com/guide/audio-midi-setup/transfer-midi-information-between-apps-ams1013/mac), and [Live external MIDI input/channel routing](https://www.ableton.com/en/manual/routing-and-i-o/#external-midi-inout). CoreMIDI signatures, immediate-send timestamp semantics and endpoint-wide `MIDIFlushOutput` behavior were checked against the installed Apple SDK `MIDIServices.h`. The prototype owns cancellable deadlines and avoids flushing another sender's OS queue.

Context7 was used for JUCE, Vue, Pinia, Zod and Vite. The JUCE index included old version entries; current behavior was verified against the pinned official 9.0.4 headers/source. JUCE licensing is separate from VST3 SDK licensing; this local prototype does not establish distribution eligibility.
