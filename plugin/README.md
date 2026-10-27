# Melody Mate JUCE feasibility prototype

This VST3 prototype shares the existing Vue editor, canvas piano roll, generators, knobs, chord/rhythm/arp studios and domain logic. The web edition remains the normal browser build with Tone.js, Sound & Mix and MIDI downloads. No installers or release distribution are provided.

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

The macOS arm64 and Windows x64 builds have been exercised separately. An Intel Mac build requires an explicit CMake architecture change and its own host checks. Universal-binary and Studio One compatibility are not yet established.

### Windows x64 build

Install Visual Studio 2022 with **Desktop development with C++** and the Windows SDK, CMake 3.24 or newer, Node/pnpm and the NuGet CLI. Install the [WebView2 Runtime](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) on the machine that opens the editor. The separate WebView2 SDK package supplies build headers and its static loader; the SDK alone does not provide the runtime.

From the repository root in PowerShell:

```powershell
pnpm install --frozen-lockfile
nuget install Microsoft.Web.WebView2 -Version 1.0.3485.44 -OutputDirectory plugin/.cache/WebView2
$env:JUCE_WEBVIEW2_PACKAGE_LOCATION = (Resolve-Path plugin/.cache/WebView2).Path
pnpm plugin:build
pnpm plugin:test
pnpm plugin:probe --ui-smoke
```

The SDK version matches the pinned JUCE find-module recommendation; [package reference](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.3485.44). `plugin:configure` selects Visual Studio 2022 x64 on Windows and Ninja/arm64 on macOS, forwards extra CMake arguments, and accepts the SDK parent directory through the environment variable above. Use a fresh platform-local `plugin/build` directory; do not reuse a macOS CMake cache on Windows. Build/test commands explicitly select **Release** for multi-configuration generators.

On Windows, copy the **entire** built `Melody Mate Prototype.vst3` directory into a VST3 location scanned by your DAW (commonly `C:\Program Files\Common Files\VST3`), then rescan. `plugin:link-local` remains a macOS development helper and deliberately declines Windows installation; it does not elevate privileges or overwrite an installed Windows plugin. The probe helper selects the Windows `.exe` automatically.

Windows uses an explicit WebView2 backend and statically linked loader, with a unique writable temporary user-data directory per editor. A failed availability check leaves native state/playback intact and displays a runtime-install message. WKWebView remains the macOS backend. Validate real Windows editor startup, native bridge, bundled resources, keyboard focus, drag-out and host state before claiming Windows support.

On the Windows PC tested on 2026-10-27, Visual Studio Build Tools was installed but not registered as a complete installation, so the Visual Studio CMake generator could not find it. The included x64 compiler, Windows SDK, CMake and Ninja worked from the developer command prompt. With the WebView2 SDK already extracted as above, this alternative uses a separate build directory:

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "PATH=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin;C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja;%PATH%"
pnpm build:plugin-ui
cmake -S plugin -B plugin/build-ninja -G Ninja -DCMAKE_BUILD_TYPE=Release -DJUCE_WEBVIEW2_PACKAGE_LOCATION="%CD%\plugin\.cache\WebView2"
cmake --build plugin/build-ninja --parallel 4
ctest --test-dir plugin/build-ninja -C Release --output-on-failure
```

The resulting bundle is under `plugin/build-ninja/MelodyMatePrototype_artefacts/Release/VST3/`. The scheduler and VST3 host tests passed, as did an editor smoke test confirming that frontend state reached the native plugin. DAW scanning, routing, keyboard focus and MIDI drag-out still require manual verification on Windows.

The editor remembers its resized dimensions for the lifetime of the plugin instance, including when the host destroys and reopens its editor. The size is not currently saved in the DAW project. The Windows editor also provides a bottom-right resize grip.

Output:

```text
plugin/build/MelodyMatePrototype_artefacts/Release/VST3/Melody Mate Prototype.vst3
```

`pnpm plugin:build` rebuilds assets, reconfigures the ZIP embedded in BinaryData and builds native code. Rebuilding only C++ after editing Vue will retain the previously configured asset bundle. The plugin never uses a development server or absolute checkout path for its UI. On macOS, the completed local VST3 bundle is ad-hoc signed after JUCE regenerates `moduleinfo.json`, so incremental version changes do not leave a stale resource seal.

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
2. Choose key, scale and project length in the shared editor. Generate with the existing controls. Edit notes and velocities on the normal piano roll.
3. Start/stop, set tempo and seek in the DAW. **MIDI out** enables both the melody and enabled/unmuted chord track. The **Melody** and **Chords** channel selectors default to 1 and 2; choose 1–16 or **None** per voice. **Repeat** repeats the complete arrangement from host PPQ zero. Without it the arrangement plays once at its absolute PPQ positions.
4. Select **Melody** or **Chords** in the piano-roll track switcher. The native strip above the WebView follows that selection: **Drag melody MIDI** (blue) or **Drag chords MIDI** (violet). Drag it onto a DAW MIDI track. This is an OS file drag from a real temporary single-track `.mid` file, encoded with the existing exporter. Chord files contain the edited voicings, positions and durations; they can be exported without any melody. An empty selected track disables the handle. The drag-start return value cannot confirm successful import.
5. Wait for **Stored in plugin instance**, then save the DAW project. Each instance holds its own versioned session and prepared native playback. Closing its editor does not stop native playback.

### Plugin header and active-track clips (prototype 0.1.5)

The header separates creation/project/studio controls from DAW sync and MIDI routing. Studio buttons use the shared controls and icons with visible active states; MIDI out and Repeat are latching toggles. The demo-melody action is removed. Geist typography, the 4px spacing grid, short state transitions and blue/violet musical roles follow `DESIGN.md`. The native clip grip uses the same theme tokens extracted at build time from `src/styles/main.css`, with layout defaults from `src/config/ui-defaults.ts`. Protocol 2 sessions remain compatible with 0.1.4. The main header groups wrap for laptop widths, with the 1024px minimum and 1360px default editor widths as design targets. No browser/screenshot checks were run for this header change; final geometry and keyboard/focus review remain manual. Existing shared controls provide keyboard semantics, status announcements exclude automated BPM updates, and theme foreground contrast against the panel was calculated at 5.1:1 or greater.

### Multichannel host MIDI in Studio One (prototype 0.1.4)

1. Load **one** Melody Mate VST3 on an instrument track. Generate chords and melody in that shared project. Its stereo audio output is silent.
2. In the plugin header, enable **MIDI out**. Set **Melody** and **Chords** to different MIDI channels (defaults: 1 and 2). Each chooser supports channels **1–16** and **None**. Chords also respect the existing chord enable/mute settings. These assignments affect host playback; drag-out follows the active piano-roll track and retains the exporter's file channels (melody 1/chords 2).
3. Add two other instrument tracks with your synths in Studio One. Expand each track header/Inspector to expose its instrument/event input and channel controls. Choose **Melody Mate Prototype** as the MIDI source. Select the melody channel for the first receiving track and the chord channel for the second; enable input monitoring on both. Exact labels vary by Studio One version. If both synths play both parts, check the source/channel filters and the receiving instrument's own channel behavior.
4. Start Studio One's transport. Melody Mate emits a single VST3 event stream carrying the selected MIDI channels and sample offsets; the DAW routes it to the instruments. This needs no virtual MIDI bus, IAC/loopMIDI setup, operating-system port selection, second generator instance or external MIDI clock.
5. Changing a channel or selecting **None** replaces the native snapshot. The next callback releases old-channel voices before chasing held notes on the new channel. **MIDI out** gates both voices; **Panic** requests note-offs on the next callback. Assigning both voices to the same channel intentionally combines them; overlapping equal pitches share one held voice until their final release.
6. Wait for **Stored in plugin instance**, save the Song, then verify playback after closing the editor and after restarting the DAW **before opening the editor**. Routing lives in the versioned musical session, with no device IDs or editor-dependent output worker.

The workflow follows the [Scaler multichannel routing guide, Studio One section (page 8)](https://scalermusic.com/wp-content/uploads/2025/06/Scaler-3-MIDI-Output-DAW-Routing-Guide.pdf). Actual Melody Mate channel filtering, monitoring and Song restore in Studio One remain **manual acceptance**, on both macOS and Windows. A passing JUCE host probe does not establish host compatibility.

The IAC experiment from 0.1.3 has been removed, including its native port selector, CoreMIDI calls, output thread/queue, 20 ms lookahead and port settings. The browser edition's separate Web MIDI feature remains available. Ableton Live still merges internally routed channels, so this build does not provide two independent Live synth routes from a single instance. Use a DAW that preserves the output channels for this workflow.

**Offline processing:** host MIDI stays in the processing block, including when the host reports non-realtime rendering. No events are sent to operating-system MIDI devices. The native probe checks this behavior. Whether Studio One includes generator events, monitoring and downstream synths in a particular bounce/freeze path still requires manual testing; record the receiving MIDI parts first if necessary. There is no extra external-output lookahead or reported plugin latency. Final audible alignment and delay compensation belong to the host routing and need measurement.

**Session format:** prototype 0.1.4 uses document protocol **2** with explicit melody/chord channel assignments. Earlier prototype documents are not migrated; recreate them or use the editor's explicit incompatible-session reset if offered. Do not overwrite a needed earlier test Song without retaining a copy.

Host tempo drives playback. The project's stored tempo is retained for generation groove conversion and MIDI-file tempo metadata; file import interpretation belongs to the receiving DAW. Imported clips are independent copies.

The prototype has no browser audition, Sound & Mix, Web MIDI setup, analytics, web download footer or browser project save. Audition controls in reused studios report that a receiving DAW instrument is needed. The editor requests native keyboard focus and consumes its handled editing/studio shortcuts. On Windows in Fender Studio Pro or Studio One, an unmodified Space pressed in the editor background is forwarded to the host; editable fields, buttons, sliders and dialogs retain their own keyboard behavior. Start and stop were confirmed by the user in Studio Pro 8.1.0. Transport seeks and loop shortcuts remain host-dependent. Click the DAW workspace to return keyboard control to Live. Editing shortcuts remain available and plugin shortcut help excludes transport/audition entries.

Piano-roll loop markers and **Loop target** remain editing references in this first prototype; native repetition uses **Repeat** and actual host loop positions. Generation work ranges still restrict edits. Module visibility, sidebar sizes and visibility, studio and velocity panel sizes, active studio, editing tool, grid and zoom are stored per instance in the DAW state. Protocol 2 sessions without these optional UI fields remain readable and use defaults. Selection, undo history, scroll position and uncommitted Arp candidate drafts reset when recreating the editor. The native editor window size is retained while the instance exists but is not saved across a DAW restart.

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
- Processing bounds: 4,096 notes and 8 MiB state. Extreme blocks exceeding 64 sequence segments or host wraps flush and reconcile on the next normal callback. Missing PPQ/BPM suspends output instead of inventing a free-running clock. The scheduler uses fixed working storage; JUCE/host MIDI-buffer storage is outside that scheduler guarantee. This is not a hard-real-time certification.
- DAW save returns the current native document immediately, without asking JavaScript. Restore parses native playback before editor creation; opening the editor hydrates the session from that instance. An epoch rejects queued edits originating before a host restore. Blank DAW state has an explicit versioned empty document.
- The TypeScript export adapter selects melody-only or chords-only bytes using the active piano-roll track. Export is independent of playback enablement, chord mute/use settings and None routing. The single-track SMF document fields and protocol 2 stay unchanged. MIDI files are prepared on the message thread before dragging. The native handle starts the drag directly from `mouseDrag`; WebView asynchronous mouse-to-bridge handoff is deliberately avoided. Identical MIDI revisions reuse the file. Superseded files never dragged are removed; dragged files remain under the operating system's temporary directory so late receiver reads/editor closure are safe. Dragged revisions are retained for late receivers; automatic OS cleanup is not guaranteed. Superseded unused files and failed-write directories are removed immediately.

## Validation and host limits

Baseline checks were recorded on 2026-10-26; the 0.1.4 host-channel rebuild was checked locally on 2026-10-27:

- Release VST3 build and ad-hoc signature verification passed; Mach-O is arm64.
- Native scheduler checks passed in Release and with AddressSanitizer/UBSan. Checks stay active under `NDEBUG`.
- Prototype 0.1.4 extends the actual VST3 probe with channels 3/16 (including equal pitches), channel reassignment with old-channel note-offs, **None**, rejection of inconsistent track/channel state, 16-channel bus metadata, and editor-free save/restore during non-realtime processing.
- `native-vst3` loaded the built bundle, ran two simultaneous instances with different notes, verified sample-offset MIDI/silent stereo, destroyed/recreated processors, and restored playback before editor creation.
- The real WKWebView loaded from its embedded resources and committed the complete TypeScript session to C++; the explicit bundle guard passed. Manual visual inspection showed the shared workstation. A saved frontend session containing generated melody notes also round-tripped through the host wrapper.
- The user reports good operation on macOS with 0.1.4; Windows has not yet been tested by the user. The report does not name the DAW/version or establish a full acceptance matrix.
- Prototype 0.1.5 checks selected-track SMF bytes/filenames, chord-only content with no melody, and export while playback is muted/unrouted. Native coverage accepts a chord SMF and verifies that changing only the export file does not retrigger held MIDI. Header layout, live keyboard/focus behavior and actual new chord drag import need manual user review; no visual/E2E suite was added.
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
| Host MIDI channels, reassignment, None and offline state restore                   | Actual VST3 probe passed on macOS; Studio One channel routing remains a manual check                               |
| Windows x64 build and WebView2                                                     | Built on Windows; native tests and WebView2 editor/bridge smoke passed; DAW acceptance remains open                 |
| Pointer capture, note/knob drags, keyboard focus/resizing                          | Existing handlers reused; manual macOS host check required                                                         |
| Melody file imported as usable DAW clip                                            | Generated melody drag/import confirmed by the user in Live 12.4.6; broader import edge cases remain open           |
| Two instances saved in a DAW and restored after DAW restart before opening editors | Native/state coverage is a prerequisite; full DAW project lifecycle requires manual check                          |
| Offline host render/freeze, duplicate/remove, bypass/suspend                       | Manual host checks required; not claimed compatible                                                                |

Installed host: **Ableton Live 12 Suite 12.4.6**. macOS GUI scripting reports Accessibility/UI automation disabled in this session. Do not infer pointer gestures, drag import or DAW project lifecycle from compilation or scanner success.

Classification: VST3 **Instrument/Synth**, no audio input, silent stereo output, one MIDI event output bus advertising 16 channels, and a compatibility MIDI event input. Live requires that input bus for instrument-class VST3 plugins; incoming MIDI is discarded and does not trigger or pass through the sequencer. Prototype 0.1.4 routes melody and chords through independent selectable host channels. Studio One is the intended multichannel host; real DAW routing and Windows host acceptance remain open. Ableton internal track routing still merges channels. This is a prototype layout, not universal DAW certification. Logic is not covered by this VST3 target.

### Live instrument-input correction (prototype 0.1.1)

The user's first Live track-load attempt with 0.1.0 failed despite successful discovery. Live 12.4.6 logged `plugin has instrument category, but no valid event input bus` and `No valid input bus could be found` on 2026-10-26 at 20:11:57 CET. The plugin exposed no MIDI input bus. Prototype 0.1.1 enables that event bus in both CMake metadata and `acceptsMidi()`. The audio input remains disabled; the processing callback discards incoming MIDI before generating output. The native host regression check verifies both MIDI capabilities and lack of input echo.

After updating, restart Live, rescan VST3 plug-ins if needed, and add a fresh instance of **Melody Mate Prototype**. The failed device already in the track may remain disabled. Verify prototype version 0.1.1 when checking scan results. The user subsequently confirmed Live track loading, generated-melody drag/import and MIDI routing to a synth on another track.

### Keyboard focus correction (prototype 0.1.2)

The user reported that `A` opened Arp Studio and also toggled Live automation lanes. The VST3 editor previously inherited JUCE's `EDITOR_WANTS_KEYBOARD_FOCUS=FALSE` default; on macOS this sets the native editor peer to ignore key presses. Prototype 0.1.2 explicitly requests keyboard focus. The shared shortcut handler now prevents the default action for every shortcut it actually handles and stops DOM propagation in the plugin edition. Unassigned keys, focused text controls and IME composition retain their existing behavior. No global native key interception is installed.

Focused tests cover the handled `A` command, unassigned keys, Space passthrough at the DOM boundary, text input and IME composition. The host focus result still needs a manual Live retry: click the piano roll, press `A`, and verify only Arp Studio toggles; repeat for `C`, `R`, `B`, `I` and editing commands. Check that typing in fields stays normal. Click Live's arrangement and verify its own `A` shortcut works again. Check Space with plugin and DAW focus separately. The WebView smoke check does not prove native shortcut isolation.

### Additional host acceptance procedure

For Studio One, first complete the multichannel procedure above with two different synths, then test stop, seeks, loops, channel changes, **None**, panic, editor closure, Song restart, offline render and drag-out. Record OS, DAW version, sample rate, buffer size and plugin commit. Windows DAW integration, pointer/keyboard behavior and drag targets require their own acceptance.

The following Live procedure remains useful for merged-channel playback and existing regressions:

1. Enable VST3 system folders in Live's Plug-ins preferences, rescan, and load **Melody Mate Prototype** on a new MIDI track. Record the exact Live version and whether it appears as an instrument. Check that no audio input is required and its audio output is silent.
2. Create another MIDI track with an instrument. Set **MIDI From** to the plugin track and select the plugin's MIDI output in the lower chooser; monitor **In**. Verify melody and chord output. Disable chords for an isolated melody test. Internal routing merges channels.
3. Disable network connectivity after building. Reopen the editor, generate melody/bass, open Arp/Chord/Rhythm studios and verify lazy assets load. Drag/resize/create notes, change velocity, drag a small knob outside its bounds, release outside, use shortcuts, resize the editor, then close/reopen it. Record failures and display scaling.
4. Start/stop at multiple tempos; automate tempo, seek into a sustained note, seek backward, loop across a held note and at a block-aligned boundary. Check for extra/stuck notes and click **Panic**. Repeat with editor closed, bypass/reactivation and host stop. Test offline render/freeze separately where Live routes plugin MIDI for that workflow.
5. Switch the piano roll between Melody and Chords and drag each native MIDI clip into an empty MIDI clip/arrangement track. Verify the matching pitches/voicings, timing, duration, velocity, project groove and import position; repeat after editing and after dropping once. Test chord export with no melody and with chord playback muted/None; test empty-track disablement, cancellation and dragging outside the editor. This exports one selected track at a time; combined multitrack drag is not implemented.
6. Create instances A/B with visibly different notes, keys, bars, generator parameters, custom rhythm and takes. Wait for **Stored in plugin instance** in each. Save to a new test Live Set and quit Live normally. Restart, open that Set and start transport **before opening either editor**. Verify the two outputs differ as saved; open editors and compare contents. Repeat with one duplicated instance, undo/redo and editor closure. Do not use a production set for this acceptance exercise.
7. Record pass/fail with host version, architecture, sample rate, buffer size and plugin commit. Keep untested criteria open.

### Official references

- [Pinned JUCE release](https://github.com/juce-framework/JUCE/releases/tag/9.0.4)
- [WebView integration](https://juce.com/blog/juce-8-feature-overview-webview-uis/) and [WebBrowserComponent options](https://docs.juce.com/master/classjuce_1_1WebBrowserComponent_1_1Options.html)
- [AudioProcessor lifecycle](https://docs.juce.com/master/classjuce_1_1AudioProcessor.html) and [host PositionInfo](https://docs.juce.com/master/classjuce_1_1AudioPlayHead_1_1PositionInfo.html)
- [External drag API](https://docs.juce.com/master/classjuce_1_1DragAndDropContainer.html), [standard Base64 API](https://docs.juce.com/master/structjuce_1_1Base64.html)
- [Ableton plugin MIDI routing](https://help.ableton.com/hc/en-us/articles/209070189-Accessing-the-MIDI-output-of-a-VST-plug-in)

Context7 was used for JUCE, Vue, Pinia, Zod and Vite. The JUCE index included old version entries; current behavior was verified against the pinned official 9.0.4 headers/source. JUCE licensing is separate from VST3 SDK licensing; this local prototype does not establish distribution eligibility.
