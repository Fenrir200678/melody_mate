#pragma once
#include <juce_audio_basics/juce_audio_basics.h>
#include "MidiScheduler.h"
#include "PluginConfig.h"
#include <atomic>
#include <mutex>
#include <optional>

namespace melody {
constexpr int protocolVersion = 1;

struct PreparedState {
    juce::String json, playbackIdentity;
    juce::var document;
    Sequence sequence;
    juce::MemoryBlock midi;
    juce::String filename;
    bool hasMelody = false;
};
std::optional<PreparedState> prepareState(const juce::var&, juce::String& error);

// Each thread owns one slot; only the middle slot crosses the atomic exchange.
class SequenceMailbox {
public:
    void publish(Sequence next) {
        slots[static_cast<std::size_t>(back)] = std::move(next);
        back = middle.exchange(back | dirty, std::memory_order_acq_rel) & mask;
    }
    const Sequence* acquire() noexcept {
        if ((middle.load(std::memory_order_acquire) & dirty) != 0)
            front = middle.exchange(front, std::memory_order_acq_rel) & mask;
        return &slots[static_cast<std::size_t>(front)];
    }
private:
    static constexpr int dirty = 4, mask = 3;
    std::array<Sequence, 3> slots;
    int front = 0, back = 2;
    std::atomic<int> middle { 1 };
};

class SessionState {
public:
    juce::var read() const;
    bool commit(const juce::var&, int expectedEpoch, juce::String& error);
    bool restore(const void*, int bytes);
    void save(juce::MemoryBlock&) const;
    juce::MemoryBlock midiBytes() const;
    juce::String midiFilename() const;
    int generation() const noexcept { return epoch.load(); }
    SequenceMailbox mailbox;
private:
    mutable std::mutex mutex;
    std::optional<PreparedState> current;
    std::atomic<int> epoch { 0 };
};
}
