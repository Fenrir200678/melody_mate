#pragma once

#include "PluginConfig.h"
#include <array>
#include <cstddef>
#include <vector>

namespace melody {

struct Note {
    double startPpq = 0.0;
    double endPpq = 0.0;
    int pitch = 0;
    int velocity = 0;
    int channel = 0;
};

struct Sequence {
    double lengthPpq = 0.0;
    bool repeat = false;
    std::vector<Note> notes;
};

struct HostTime {
    bool valid = false;
    bool playing = false;
    bool looping = false;
    double ppq = 0.0;
    double bpm = 0.0;
    double loopStartPpq = 0.0;
    double loopEndPpq = 0.0;
};

class MidiScheduler {
public:
    using Emit = void (*)(void*, int sampleOffset, int channel, int pitch, int velocity);

    void process(const Sequence* sequence, const HostTime& host, int frames, double sampleRate,
                 void* context, Emit emit);
    void requestFlush(bool chaseHeld = false) noexcept { flushRequested_ = true; chaseAfterFlush_ = chaseHeld; }

private:
    struct ActivePitch { int channel = 0; int pitch = 0; int count = 0; };
    struct Event { int offset; int channel; int pitch; int velocity; };

    static constexpr std::size_t kMaxNotes = maxNotes;
    static constexpr std::size_t kMaxActive = 16 * 128;
    static constexpr std::size_t kMaxEvents = maxNotes * 2;
    static constexpr int kMaxHostWrapsPerBlock = 64;
    static constexpr int kMaxSequenceSegmentsPerBlock = 64;

    std::array<ActivePitch, kMaxActive> active_{};
    std::size_t activeCount_ = 0;
    const Sequence* sequence_ = nullptr;
    bool wasPlaying_ = false;
    bool haveExpectedPpq_ = false;
    double expectedPpq_ = 0.0;
    bool expectedLooping_ = false;
    double expectedLoopStart_ = 0.0;
    double expectedLoopEnd_ = 0.0;
    bool flushRequested_ = false, chaseAfterFlush_ = false;
    bool pendingLoopWrap_ = false;
    bool pendingReconcile_ = false;

    void flush(int offset, void* context, Emit emit) noexcept;
    void chase(const Sequence* sequence, double ppq, int offset, void* context, Emit emit) noexcept;
    void addPitch(int channel, int pitch, int velocity, int offset, void* context, Emit emit,
                  int instances = 1) noexcept;
    void removePitch(int channel, int pitch, int offset, void* context, Emit emit) noexcept;
    void processSegment(const Sequence* sequence, double start, double end, double ppqPerSample,
                       double baseSamplePosition, int frames, void* context, Emit emit) noexcept;
};

} // namespace melody
