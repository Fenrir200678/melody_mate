#include "../Source/MidiScheduler.h"

#include <array>
#include <cstdlib>
#include <iostream>

using namespace melody;

static void require(bool condition, const char* expression, int line) {
    if (condition) return;
    std::cerr << "Scheduler test failed at line " << line << ": " << expression << '\n';
    std::exit(EXIT_FAILURE);
}

#define REQUIRE(expression) require((expression), #expression, __LINE__)

struct OutputEvent { int offset; int channel; int pitch; int velocity; };
struct Capture { std::array<OutputEvent, 128> events{}; int count = 0; };

static void collect(void* context, int offset, int channel, int pitch, int velocity) {
    auto& capture = *static_cast<Capture*>(context);
    REQUIRE(capture.count < static_cast<int>(capture.events.size()));
    capture.events[static_cast<std::size_t>(capture.count++)] = {offset, channel, pitch, velocity};
}

static HostTime playing(double ppq, double bpm = 60.0) {
    HostTime host;
    host.valid = true;
    host.playing = true;
    host.ppq = ppq;
    host.bpm = bpm;
    return host;
}

static void testExactOffsetsAndTempoChange() {
    MidiScheduler scheduler;
    Sequence sequence{4.0, true, {}};
    sequence.repeat = false;
    sequence.notes.push_back({0.25, 0.50, 64, 91, 2});
    Capture output;
    scheduler.process(&sequence, playing(0.0), 100, 100.0, &output, collect);
    REQUIRE(output.count == 2);
    REQUIRE(output.events[0].offset == 25 && output.events[0].velocity == 91);
    REQUIRE(output.events[1].offset == 50 && output.events[1].velocity == 0);

    Sequence changingTempo{4.0, true, {}};
    changingTempo.repeat = false;
    changingTempo.notes.push_back({1.25, 1.75, 67, 80, 1});
    MidiScheduler tempoScheduler;
    Capture tempoOutput;
    tempoScheduler.process(&changingTempo, playing(0.0, 60.0), 100, 100.0, &tempoOutput, collect);
    tempoScheduler.process(&changingTempo, playing(1.0, 120.0), 100, 100.0, &tempoOutput, collect);
    REQUIRE(tempoOutput.count == 2);
    REQUIRE(tempoOutput.events[0].offset == 13);
    REQUIRE(tempoOutput.events[1].offset == 38);
}

static void testStopAndSeekChase() {
    MidiScheduler scheduler;
    Sequence sequence{4.0, true, {}};
    sequence.repeat = false;
    sequence.notes.push_back({0.0, 4.0, 60, 100, 1});
    Capture output;
    scheduler.process(&sequence, playing(0.0), 10, 100.0, &output, collect);
    REQUIRE(output.count == 1 && output.events[0].velocity == 100);

    HostTime seek = playing(2.0);
    scheduler.process(&sequence, seek, 10, 100.0, &output, collect);
    REQUIRE(output.count == 3);
    REQUIRE(output.events[1].velocity == 0 && output.events[1].offset == 0);
    REQUIRE(output.events[2].velocity == 100 && output.events[2].offset == 0);

    HostTime stopped;
    stopped.valid = true;
    stopped.playing = false;
    scheduler.process(&sequence, stopped, 10, 100.0, &output, collect);
    REQUIRE(output.count == 4 && output.events[3].velocity == 0);

    scheduler.process(&sequence, playing(0.0), 10, 100.0, &output, collect);
    HostTime missing;
    scheduler.process(&sequence, missing, 10, 100.0, &output, collect);
    REQUIRE(output.count == 6 && output.events[5].velocity == 0);
}

static void testHostLoopWrapInsideBlock() {
    MidiScheduler scheduler;
    Sequence sequence{4.0, true, {}};
    sequence.repeat = false;
    sequence.notes.push_back({0.5, 1.5, 72, 100, 1});
    HostTime host = playing(0.2);
    host.looping = true;
    host.loopStartPpq = 0.0;
    host.loopEndPpq = 1.0;
    Capture output;
    scheduler.process(&sequence, host, 100, 100.0, &output, collect);
    REQUIRE(output.count == 2);
    REQUIRE(output.events[0].offset == 30 && output.events[0].velocity == 100);
    REQUIRE(output.events[1].offset == 80 && output.events[1].velocity == 0);
}

static void testLoopPrerollAndBoundaryWrap() {
    Sequence preroll{4.0, true, {}};
    preroll.repeat = false;
    preroll.notes.push_back({1.0, 1.5, 62, 90, 1});
    HostTime preLoopHost = playing(0.0);
    preLoopHost.looping = true;
    preLoopHost.loopStartPpq = 2.0;
    preLoopHost.loopEndPpq = 4.0;
    MidiScheduler prerollScheduler;
    Capture prerollOutput;
    prerollScheduler.process(&preroll, preLoopHost, 200, 100.0, &prerollOutput, collect);
    REQUIRE(prerollOutput.count == 2);
    REQUIRE(prerollOutput.events[0].offset == 100 && prerollOutput.events[0].velocity == 90);
    REQUIRE(prerollOutput.events[1].offset == 150 && prerollOutput.events[1].velocity == 0);

    Sequence held{4.0, true, {}};
    held.repeat = false;
    held.notes.push_back({0.0, 1.5, 60, 100, 1});
    HostTime atLoopStart = playing(0.0);
    atLoopStart.looping = true;
    atLoopStart.loopStartPpq = 0.0;
    atLoopStart.loopEndPpq = 1.0;
    MidiScheduler wrapScheduler;
    Capture wrapOutput;
    wrapScheduler.process(&held, atLoopStart, 100, 100.0, &wrapOutput, collect);
    REQUIRE(wrapOutput.count == 1 && wrapOutput.events[0].offset == 0);
    wrapScheduler.process(&held, atLoopStart, 10, 100.0, &wrapOutput, collect);
    REQUIRE(wrapOutput.count == 3);
    REQUIRE(wrapOutput.events[1].velocity == 0 && wrapOutput.events[1].offset == 0);
    REQUIRE(wrapOutput.events[2].velocity == 100 && wrapOutput.events[2].offset == 0);
}

static void testOffsetsBoundedAndZeroFramesDeferred() {
    MidiScheduler scheduler;
    Sequence sequence{4.0, true, {}};
    sequence.repeat = false;
    sequence.notes.push_back({0.005, 0.02, 61, 100, 1});
    Capture output;
    scheduler.process(&sequence, playing(0.0), 0, 100.0, &output, collect);
    REQUIRE(output.count == 0);
    scheduler.process(&sequence, playing(0.0), 1, 100.0, &output, collect);
    REQUIRE(output.count == 1 && output.events[0].offset == 0);
}

static void testExcessiveSequenceCyclesAreDeferred() {
    MidiScheduler scheduler;
    Sequence sequence{4.0, true, {}};
    sequence.lengthPpq = 0.25;
    sequence.repeat = true;
    sequence.notes.push_back({0.0625, 0.125, 63, 95, 1});
    Capture output;
    scheduler.process(&sequence, playing(0.0), 2000, 100.0, &output, collect);
    REQUIRE(output.count == 0);
    scheduler.process(&sequence, playing(20.0), 10, 100.0, &output, collect);
    REQUIRE(output.count == 1);
    REQUIRE(output.events[0].offset == 7 && output.events[0].velocity == 95);
}

static void testRepeatOffAndOverlappingPitch() {
    MidiScheduler scheduler;
    Sequence oneShot{4.0, true, {}};
    oneShot.repeat = false;
    oneShot.notes.push_back({0.5, 1.0, 65, 90, 1});
    Capture output;
    scheduler.process(&oneShot, playing(0.0), 500, 100.0, &output, collect);
    REQUIRE(output.count == 2);
    REQUIRE(output.events[0].offset == 50 && output.events[1].offset == 100);

    Sequence overlap{4.0, true, {}};
    overlap.lengthPpq = 2.0;
    overlap.repeat = false;
    overlap.notes.push_back({0.0, 0.75, 60, 100, 1});
    overlap.notes.push_back({0.5, 1.0, 60, 80, 1});
    MidiScheduler overlapScheduler;
    Capture overlapOutput;
    overlapScheduler.process(&overlap, playing(0.0), 120, 100.0, &overlapOutput, collect);
    REQUIRE(overlapOutput.count == 2);
    REQUIRE(overlapOutput.events[0].offset == 0 && overlapOutput.events[0].velocity == 100);
    REQUIRE(overlapOutput.events[1].offset == 100 && overlapOutput.events[1].velocity == 0);
}

static void testRepeatedSequenceUsesPpqZeroAnchor() {
    MidiScheduler scheduler;
    Sequence sequence{4.0, true, {}};
    sequence.lengthPpq = 2.0;
    sequence.repeat = true;
    sequence.notes.push_back({0.5, 1.0, 69, 88, 1});
    Capture output;
    scheduler.process(&sequence, playing(1.5), 100, 100.0, &output, collect);
    REQUIRE(output.count == 0);
    scheduler.process(&sequence, playing(2.5), 100, 100.0, &output, collect);
    REQUIRE(output.count == 2);
    REQUIRE(output.events[0].offset == 0 && output.events[0].velocity == 88);
    REQUIRE(output.events[1].offset == 50 && output.events[1].velocity == 0);

    MidiScheduler jumpedScheduler;
    Capture jumpedOutput;
    jumpedScheduler.process(&sequence, playing(2.5), 100, 100.0, &jumpedOutput, collect);
    REQUIRE(jumpedOutput.count == 2);
    REQUIRE(jumpedOutput.events[0].offset == 0 && jumpedOutput.events[0].velocity == 88);
    REQUIRE(jumpedOutput.events[1].offset == 50 && jumpedOutput.events[1].velocity == 0);
}

static void testSnapshotReplacementFlushesAndChases() {
    MidiScheduler scheduler;
    Sequence first{4.0, true, {}};
    first.repeat = false;
    first.notes.push_back({0.0, 4.0, 60, 100, 1});
    Sequence replacement{4.0, true, {}};
    replacement.repeat = false;
    replacement.notes.push_back({0.0, 4.0, 67, 75, 1});
    Capture output;
    scheduler.process(&first, playing(0.0), 10, 100.0, &output, collect);
    scheduler.process(&replacement, playing(0.1), 10, 100.0, &output, collect);
    REQUIRE(output.count == 3);
    REQUIRE(output.events[1].pitch == 60 && output.events[1].velocity == 0);
    REQUIRE(output.events[2].pitch == 67 && output.events[2].velocity == 75);

    scheduler.process(&replacement, playing(0.2), 380, 100.0, &output, collect);
    scheduler.process(&replacement, playing(4.0), 10, 100.0, &output, collect);
    REQUIRE(output.count == 4 && output.events[3].pitch == 67 && output.events[3].velocity == 0);
    REQUIRE(output.events[3].offset == 0);

    scheduler.process(&replacement, playing(0.0), 10, 100.0, &output, collect);
    REQUIRE(output.events[4].pitch == 67 && output.events[4].velocity == 75);
    scheduler.requestFlush();
    scheduler.process(&replacement, playing(0.1), 10, 100.0, &output, collect);
    REQUIRE(output.count == 6 && output.events[5].pitch == 67 && output.events[5].velocity == 0);
}

static void testPreparationChasesRestoredHeldNotes() {
    MidiScheduler scheduler;
    Sequence sequence{4.0, false, {{0.0, 2.0, 69, 90, 1}}};
    Capture output;
    scheduler.requestFlush(true);
    scheduler.process(&sequence, playing(1.0), 10, 100.0, &output, collect);
    REQUIRE(output.count == 1 && output.events[0].pitch == 69 && output.events[0].velocity == 90);
}

int main() {
    testPreparationChasesRestoredHeldNotes();
    testExactOffsetsAndTempoChange();
    testStopAndSeekChase();
    testHostLoopWrapInsideBlock();
    testLoopPrerollAndBoundaryWrap();
    testOffsetsBoundedAndZeroFramesDeferred();
    testExcessiveSequenceCyclesAreDeferred();
    testRepeatOffAndOverlappingPitch();
    testRepeatedSequenceUsesPpqZeroAnchor();
    testSnapshotReplacementFlushesAndChases();
    std::cout << "MidiScheduler tests passed\n";
    return 0;
}
