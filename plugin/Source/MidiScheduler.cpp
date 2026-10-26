#include "MidiScheduler.h"

#include <algorithm>
#include <cmath>

namespace melody {
namespace {
constexpr double kEpsilon = 1.0e-9;

bool usable(const Note& note) noexcept {
    return std::isfinite(note.startPpq) && std::isfinite(note.endPpq) &&
           note.endPpq > note.startPpq && note.pitch >= 0 && note.pitch <= 127 &&
           note.velocity > 0 && note.velocity <= 127 && note.channel >= 1 && note.channel <= 16;
}

double normalizedPpq(double ppq, bool looping, double loopStart, double loopEnd) noexcept {
    if (!looping || !std::isfinite(loopStart) || !std::isfinite(loopEnd) || loopEnd <= loopStart)
        return ppq;
    const double length = loopEnd - loopStart;
    if (!std::isfinite(length) || length <= 0.0) return ppq;
    if (ppq < loopStart) return ppq;
    if (ppq >= loopEnd) {
        double wrapped = std::fmod(ppq - loopStart, length);
        if (wrapped < 0.0) wrapped += length;
        return loopStart + wrapped;
    }
    return ppq;
}

int eventOffset(double samplePosition, int frames) noexcept {
    if (frames <= 0) return 0;
    const double last = static_cast<double>(frames - 1);
    if (samplePosition >= last) return frames - 1;
    return std::max(0, static_cast<int>(std::ceil(samplePosition - kEpsilon)));
}

double advancePpq(double ppq, double amount, bool looping, double loopStart, double loopEnd) noexcept {
    if (!looping || loopEnd <= loopStart) return ppq + amount;
    const double toEnd = loopEnd - ppq;
    if (amount < toEnd - kEpsilon) return ppq + amount;
    const double afterWrap = std::max(0.0, amount - toEnd);
    const double loopLength = loopEnd - loopStart;
    double remainder = std::fmod(afterWrap, loopLength);
    if (remainder < 0.0) remainder += loopLength;
    return loopStart + remainder;
}
} // namespace

void MidiScheduler::flush(int offset, void* context, Emit emit) noexcept {
    if (emit != nullptr) {
        for (std::size_t i = 0; i < activeCount_; ++i)
            emit(context, offset, active_[i].channel, active_[i].pitch, 0);
    }
    activeCount_ = 0;
}

void MidiScheduler::addPitch(int channel, int pitch, int velocity, int offset,
                             void* context, Emit emit, int instances) noexcept {
    if (instances <= 0) return;
    for (std::size_t i = 0; i < activeCount_; ++i) {
        if (active_[i].channel == channel && active_[i].pitch == pitch) {
            const bool wasSilent = active_[i].count == 0;
            active_[i].count = std::min(static_cast<int>(kMaxNotes), active_[i].count + instances);
            if (wasSilent && emit != nullptr) emit(context, offset, channel, pitch, velocity);
            return;
        }
    }
    if (activeCount_ == active_.size()) return;
    active_[activeCount_++] = {channel, pitch, std::min<int>(instances, static_cast<int>(kMaxNotes))};
    if (emit != nullptr) emit(context, offset, channel, pitch, velocity);
}

void MidiScheduler::removePitch(int channel, int pitch, int offset,
                                void* context, Emit emit) noexcept {
    for (std::size_t i = 0; i < activeCount_; ++i) {
        ActivePitch& active = active_[i];
        if (active.channel != channel || active.pitch != pitch) continue;
        if (--active.count <= 0) {
            if (emit != nullptr) emit(context, offset, channel, pitch, 0);
            active_[i] = active_[--activeCount_];
        }
        return;
    }
}

void MidiScheduler::chase(const Sequence* sequence, double ppq, int offset,
                          void* context, Emit emit) noexcept {
    if (sequence == nullptr || !std::isfinite(sequence->lengthPpq) || sequence->lengthPpq <= 0.0 || ppq < 0.0)
        return;
    const std::size_t count = std::min(sequence->notes.size(), kMaxNotes);
    const double length = sequence->lengthPpq;
    for (std::size_t i = 0; i < count; ++i) {
        const Note& note = sequence->notes[i];
        if (!usable(note)) continue;
        int instances = 0;
        if (!sequence->repeat) {
            instances = ppq > note.startPpq && ppq < note.endPpq ? 1 : 0;
        } else {
            const double last = std::ceil((ppq - note.startPpq) / length - kEpsilon) - 1.0;
            const double first = std::floor((ppq - note.endPpq) / length) + 1.0;
            const double k = std::max(0.0, first);
            if (last >= k) {
                const double amount = last - k + 1.0;
                instances = static_cast<int>(std::min(amount, static_cast<double>(kMaxNotes)));
            }
        }
        if (instances > 0) addPitch(note.channel, note.pitch, note.velocity, offset, context, emit, instances);
    }
}

void MidiScheduler::processSegment(const Sequence* sequence, double start, double end,
                                  double ppqPerSample, double baseSamplePosition,
                                  int frames, void* context, Emit emit) noexcept {
    if (sequence == nullptr || end <= start || ppqPerSample <= 0.0) return;
    std::array<Event, kMaxEvents> events;
    std::size_t eventCount = 0;
    const std::size_t count = std::min(sequence->notes.size(), kMaxNotes);
    const double length = sequence->lengthPpq;
    const bool repeating = sequence->repeat && std::isfinite(length) && length > 0.0;

    for (std::size_t i = 0; i < count; ++i) {
        const Note& note = sequence->notes[i];
        if (!usable(note)) continue;
        for (int edge = 0; edge < 2; ++edge) {
            const double base = edge == 0 ? note.startPpq : note.endPpq;
            double cycle = 0.0;
            if (repeating) {
                cycle = std::max(0.0, std::ceil((start - base) / length - kEpsilon));
            } else if (start > base + kEpsilon) {
                continue;
            }
            const double position = base + cycle * length;
            if (position < start - kEpsilon || position >= end - kEpsilon) continue;
            if (eventCount == events.size()) break;
            events[eventCount++] = {eventOffset(baseSamplePosition + (position - start) / ppqPerSample, frames),
                                    note.channel, note.pitch, edge == 0 ? note.velocity : 0};
        }
    }
    std::sort(events.begin(), events.begin() + static_cast<std::ptrdiff_t>(eventCount),
              [](const Event& a, const Event& b) {
                  if (a.offset != b.offset) return a.offset < b.offset;
                  return a.velocity < b.velocity;
              });
    for (std::size_t i = 0; i < eventCount; ++i) {
        const Event& event = events[i];
        if (event.velocity == 0)
            removePitch(event.channel, event.pitch, event.offset, context, emit);
        else
            addPitch(event.channel, event.pitch, event.velocity, event.offset, context, emit);
    }
}

void MidiScheduler::process(const Sequence* sequence, const HostTime& host, int frames,
                            double sampleRate, void* context, Emit emit) {
    if (frames <= 0) return;
    const bool validSequence = sequence != nullptr && std::isfinite(sequence->lengthPpq) &&
                               sequence->lengthPpq > 0.0;
    if (!validSequence) sequence = nullptr;
    const double hostLoopLength = host.loopEndPpq - host.loopStartPpq;
    const bool validLoop = host.looping && std::isfinite(host.loopStartPpq) &&
                           std::isfinite(host.loopEndPpq) && std::isfinite(hostLoopLength) &&
                           hostLoopLength > 0.0;
    const double ppqPerSample = host.bpm / (60.0 * sampleRate);
    const double blockPpq = static_cast<double>(frames) * ppqPerSample;
    const bool canRun = host.valid && host.playing && std::isfinite(host.ppq) &&
                        std::isfinite(host.bpm) && host.bpm > 0.0 &&
                        std::isfinite(sampleRate) && sampleRate > 0.0 && sequence != nullptr &&
                        std::isfinite(ppqPerSample) && std::isfinite(blockPpq) &&
                        std::isfinite(host.ppq + blockPpq);
    const bool changed = sequence != sequence_;
    const bool explicitFlush = flushRequested_;
    const bool chaseAfterFlush = chaseAfterFlush_;
    bool discontinuity = !wasPlaying_ || !haveExpectedPpq_ || changed || explicitFlush;
    if (wasPlaying_ && haveExpectedPpq_) {
        const double tolerance = std::max(1.0e-5, host.bpm / (60.0 * std::max(1.0, sampleRate)) * 2.0);
        const double reportedPpq = validLoop
            ? normalizedPpq(host.ppq, true, host.loopStartPpq, host.loopEndPpq)
            : host.ppq;
        if (std::abs(reportedPpq - expectedPpq_) > tolerance || validLoop != expectedLooping_ ||
            (validLoop && (std::abs(host.loopStartPpq - expectedLoopStart_) > kEpsilon || std::abs(host.loopEndPpq - expectedLoopEnd_) > kEpsilon)))
            discontinuity = true;
    }
    flushRequested_ = false;
    chaseAfterFlush_ = false;

    if (!canRun) {
        flush(0, context, emit);
        sequence_ = sequence;
        wasPlaying_ = false;
        haveExpectedPpq_ = false;
        pendingLoopWrap_ = false;
        pendingReconcile_ = false;
        return;
    }

    const bool tooManyCycles = sequence->repeat &&
        blockPpq / sequence->lengthPpq > static_cast<double>(kMaxSequenceSegmentsPerBlock);
    double current = validLoop ? normalizedPpq(host.ppq, true, host.loopStartPpq, host.loopEndPpq) : host.ppq;
    if (discontinuity) {
        flush(0, context, emit);
        if ((!explicitFlush || chaseAfterFlush) && !tooManyCycles) chase(sequence, current, 0, context, emit);
    } else if (pendingLoopWrap_) {
        flush(0, context, emit);
        if (!tooManyCycles) chase(sequence, current, 0, context, emit);
    } else if (pendingReconcile_) {
        if (!tooManyCycles) chase(sequence, current, 0, context, emit);
    }
    pendingLoopWrap_ = false;
    pendingReconcile_ = false;

    double remaining = blockPpq;
    double elapsed = 0.0;
    int wraps = 0;
    int sequenceSegments = 0;
    if (tooManyCycles) {
        flush(0, context, emit);
        current = advancePpq(current, remaining, validLoop, host.loopStartPpq, host.loopEndPpq);
        remaining = 0.0;
        pendingReconcile_ = true;
    }
    while (remaining > kEpsilon) {
        if (validLoop && current >= host.loopEndPpq - kEpsilon) {
            if (++wraps > kMaxHostWrapsPerBlock) {
                const int offset = eventOffset(elapsed / ppqPerSample, frames);
                flush(offset, context, emit);
                current = advancePpq(current, remaining, true, host.loopStartPpq, host.loopEndPpq);
                pendingReconcile_ = true;
                remaining = 0.0;
                break;
            }
            const int offset = eventOffset(elapsed / ppqPerSample, frames);
            flush(offset, context, emit);
            current = host.loopStartPpq;
            chase(sequence, current, offset, context, emit);
        }

        double chunk = remaining;
        if (validLoop) chunk = std::min(chunk, host.loopEndPpq - current);
        const double segmentEnd = current + chunk;
        while (current < segmentEnd - kEpsilon) {
            if (++sequenceSegments > kMaxSequenceSegmentsPerBlock) {
                const int offset = eventOffset(elapsed / ppqPerSample, frames);
                flush(offset, context, emit);
                current = advancePpq(current, remaining, validLoop, host.loopStartPpq, host.loopEndPpq);
                pendingReconcile_ = true;
                remaining = 0.0;
                break;
            }
            double next = segmentEnd;
            if (sequence->repeat) {
                const double cycleBoundary = (std::floor(current / sequence->lengthPpq + kEpsilon) + 1.0) *
                                             sequence->lengthPpq;
                if (cycleBoundary > current + kEpsilon) next = std::min(next, cycleBoundary);
            }
            const double baseSamplePosition = elapsed / ppqPerSample;
            processSegment(sequence, current, next, ppqPerSample, baseSamplePosition,
                           frames, context, emit);
            const double advance = next - current;
            current = next;
            remaining -= advance;
            elapsed += advance;
        }
        if (remaining <= kEpsilon) break;
        if (validLoop && current >= host.loopEndPpq - kEpsilon) {
            if (++wraps > kMaxHostWrapsPerBlock) continue;
            const int offset = eventOffset(elapsed / ppqPerSample, frames);
            flush(offset, context, emit);
            current = host.loopStartPpq;
            chase(sequence, current, offset, context, emit);
        }
    }

    pendingLoopWrap_ = validLoop && remaining <= kEpsilon && current >= host.loopEndPpq - kEpsilon;
    expectedPpq_ = pendingLoopWrap_
        ? host.loopStartPpq
        : validLoop ? normalizedPpq(current, true, host.loopStartPpq, host.loopEndPpq) : current;
    expectedLooping_ = validLoop;
    expectedLoopStart_ = host.loopStartPpq;
    expectedLoopEnd_ = host.loopEndPpq;
    sequence_ = sequence;
    wasPlaying_ = true;
    haveExpectedPpq_ = true;
}

} // namespace melody
