#include "SessionState.h"
#include <cmath>

namespace melody {
namespace {
bool numeric(const juce::var& value) { return value.isInt() || value.isInt64() || value.isDouble(); }
bool inRange(const juce::var& value, double low, double high, bool integer = false) {
    if (!numeric(value)) return false;
    const auto number = static_cast<double>(value);
    return std::isfinite(number) && number >= low && number <= high && (!integer || number == std::floor(number));
}
juce::var property(const juce::var& object, const char* name) { return object.getProperty(name, {}); }
}

std::optional<PreparedState> prepareState(const juce::var& document, juce::String& error) {
    error = "Invalid or unsupported plugin state";
    if (!document.isObject() || !inRange(property(document, "version"), protocolVersion, protocolVersion)) return {};
    PreparedState next;
    next.document = document;
    next.json = juce::JSON::toString(document, true);
    if (next.json.getNumBytesAsUTF8() > maxStateBytes) { error = "Plugin state exceeds 8 MiB"; return {}; }
    const auto session = property(document, "session");
    for (const auto* name : { "project", "melody", "harmony", "rhythm", "takes", "output" })
        if (!property(session, name).isObject()) return {};
    const auto playback = property(document, "playback");
    next.playbackIdentity = juce::JSON::toString(playback, true);
    const auto length = property(playback, "lengthPpq");
    const auto repeat = property(playback, "repeat");
    if (!inRange(length, 0.25, 4096) || !repeat.isBool()) return {};
    next.sequence.lengthPpq = static_cast<double>(length);
    next.sequence.repeat = static_cast<bool>(repeat);
    const auto noteArray = property(playback, "notes");
    const auto* notes = noteArray.getArray();
    if (notes == nullptr || notes->size() > maxNotes) return {};
    next.sequence.notes.reserve(static_cast<std::size_t>(notes->size()));
    for (const auto& note : *notes) {
        const auto start = property(note, "startPpq"), end = property(note, "endPpq");
        const auto pitch = property(note, "pitch"), velocity = property(note, "velocity"), channel = property(note, "channel");
        const auto track = property(note, "track").toString();
        if (!inRange(start, 0, next.sequence.lengthPpq) || !inRange(end, 0, next.sequence.lengthPpq)
            || static_cast<double>(end) <= static_cast<double>(start) || !inRange(pitch, 0, 127, true)
            || !inRange(velocity, 1, 127, true) || !inRange(channel, 1, 16, true)
            || (track != "melody" && track != "chords")) return {};
        next.sequence.notes.push_back({ static_cast<double>(start), static_cast<double>(end), static_cast<int>(pitch),
                                        static_cast<int>(velocity), static_cast<int>(channel) });
    }
    const auto encoded = property(document, "midiBase64");
    if (!encoded.isString()) return {};
    {
        juce::MemoryOutputStream decoded(next.midi, false);
        if (!juce::Base64::convertFromBase64(decoded, encoded.toString())) return {};
        decoded.flush();
    }
    if (next.midi.getSize() < 14) return {};
    juce::MemoryInputStream stream(next.midi, false);
    juce::MidiFile file;
    if (!file.readFrom(stream) || file.getNumTracks() != 1 || file.getTimeFormat() <= 0) return {};
    const auto* track = file.getTrack(0);
    for (int i = 0; i < track->getNumEvents(); ++i) next.hasMelody = next.hasMelody || track->getEventPointer(i)->message.isNoteOn();
    next.filename = property(document, "filename").toString();
    if (!next.filename.endsWith(".mid") || next.filename.length() > 180
        || next.filename.containsAnyOf("/\\:") || next.filename != juce::File::createLegalFileName(next.filename)) return {};
    error.clear();
    return next;
}

juce::var SessionState::read() const {
    const std::lock_guard<std::mutex> lock(mutex);
    auto* object = new juce::DynamicObject();
    object->setProperty("epoch", epoch.load());
    object->setProperty("document", current ? current->document : juce::var());
    return object;
}
bool SessionState::commit(const juce::var& document, int expectedEpoch, juce::String& error) {
    auto next = prepareState(document, error);
    if (!next) return false;
    const std::lock_guard<std::mutex> lock(mutex);
    if (expectedEpoch != epoch.load()) { error = "DAW state changed; reopen the editor to reload it"; return false; }
    if (!current || current->playbackIdentity != next->playbackIdentity) mailbox.publish(std::move(next->sequence));
    current = std::move(next);
    return true;
}
bool SessionState::restore(const void* data, int bytes) {
    if (bytes <= 0 || bytes > maxStateBytes || data == nullptr) return false;
    const auto json = juce::String::fromUTF8(static_cast<const char*>(data), bytes);
    const auto document = juce::JSON::parse(json);
    if (document.isObject() && inRange(property(document, "version"), protocolVersion, protocolVersion)
        && property(document, "empty").isBool() && static_cast<bool>(property(document, "empty"))) {
        const std::lock_guard<std::mutex> lock(mutex);
        mailbox.publish({});
        current.reset();
        ++epoch;
        return true;
    }
    juce::String error;
    auto next = prepareState(document, error);
    if (!next) return false;
    const std::lock_guard<std::mutex> lock(mutex);
    if (!current || current->playbackIdentity != next->playbackIdentity) mailbox.publish(std::move(next->sequence));
    current = std::move(next);
    ++epoch;
    return true;
}
void SessionState::save(juce::MemoryBlock& result) const {
    const std::lock_guard<std::mutex> lock(mutex);
    result.reset();
    if (current) result.append(current->json.toRawUTF8(), current->json.getNumBytesAsUTF8());
    else {
        const juce::String empty = "{\"version\":1,\"empty\":true}";
        result.append(empty.toRawUTF8(), empty.getNumBytesAsUTF8());
    }
}
juce::MemoryBlock SessionState::midiBytes() const {
    const std::lock_guard<std::mutex> lock(mutex);
    return current && current->hasMelody ? current->midi : juce::MemoryBlock();
}
juce::String SessionState::midiFilename() const {
    const std::lock_guard<std::mutex> lock(mutex);
    return current ? current->filename : juce::String();
}
}
