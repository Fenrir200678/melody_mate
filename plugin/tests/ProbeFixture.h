#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include <pluginterfaces/vst/ivstcomponent.h>

#include <array>
#include <cmath>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
constexpr double sampleRate = 48000.0;
constexpr int blockSize = 512;
constexpr double tempo = 120.0;

void require(bool condition, const juce::String& message) {
    if (!condition) throw std::runtime_error(message.toStdString());
}

juce::var makeMidiBase64() {
    juce::MidiMessageSequence track;
    track.addEvent(juce::MidiMessage::noteOn(1, 60, static_cast<juce::uint8>(100)), 0.0);
    track.addEvent(juce::MidiMessage::noteOff(1, 60), 480.0);
    track.updateMatchedPairs();
    juce::MidiFile file;
    file.setTicksPerQuarterNote(480);
    file.addTrack(track);
    juce::MemoryBlock bytes;
    juce::MemoryOutputStream output(bytes, false);
    require(file.writeTo(output), "Could not generate the probe MIDI fixture");
    output.flush();
    return juce::Base64::toBase64(bytes.getData(), bytes.getSize());
}

juce::var note(int pitch, double start, double end) {
    auto* object = new juce::DynamicObject();
    object->setProperty("startPpq", start);
    object->setProperty("endPpq", end);
    object->setProperty("pitch", pitch);
    object->setProperty("velocity", 100);
    object->setProperty("channel", 1);
    object->setProperty("track", "melody");
    return juce::var(object);
}

juce::var makeDocument(int firstPitch, int secondPitch) {
    auto* session = new juce::DynamicObject();
    for (const auto* key : { "project", "melody", "harmony", "rhythm", "takes", "output" })
        session->setProperty(key, juce::var(new juce::DynamicObject()));
    auto* playback = new juce::DynamicObject();
    juce::Array<juce::var> notes;
    notes.add(note(firstPitch, 0.25, 0.5));
    notes.add(note(secondPitch, 0.75, 1.0));
    playback->setProperty("lengthPpq", 4.0);
    playback->setProperty("repeat", false);
    playback->setProperty("notes", notes);
    auto* root = new juce::DynamicObject();
    root->setProperty("version", 1);
    root->setProperty("session", juce::var(session));
    root->setProperty("playback", juce::var(playback));
    root->setProperty("midiBase64", makeMidiBase64());
    root->setProperty("filename", "probe.mid");
    return juce::var(root);
}

juce::String jsonFor(const juce::var& document) { return juce::JSON::toString(document, true); }

juce::var readDocument(const juce::File& file) {
    require(file.existsAsFile(), "State JSON file does not exist: " + file.getFullPathName());
    const auto parsed = juce::JSON::parse(file.loadFileAsString());
    require(parsed.isObject(), "State JSON must contain a native plugin document object");
    return parsed;
}

void setDocument(juce::AudioPluginInstance& plugin, const juce::var& document) {
    const auto json = jsonFor(document);
    const juce::MemoryBlock component(json.toRawUTF8(), json.getNumBytesAsUTF8());
    juce::XmlElement wrapper("VST3PluginState");
    // JUCE's host wrapper uses its own binary/XML envelope around the processor document.
    wrapper.createNewChildElement("IComponent")->addTextElement(component.toBase64Encoding());
    juce::MemoryBlock opaque;
    juce::AudioProcessor::copyXmlToBinary(wrapper, opaque);
    plugin.setStateInformation(opaque.getData(), static_cast<int>(opaque.getSize()));
}

juce::String savedState(juce::AudioPluginInstance& plugin) {
    juce::MemoryBlock opaque;
    plugin.getStateInformation(opaque);
    const auto wrapper = juce::AudioProcessor::getXmlFromBinary(opaque.getData(), static_cast<int>(opaque.getSize()));
    require(wrapper != nullptr, "Missing VST3 host state envelope");
    const auto* component = wrapper->getChildByName("IComponent");
    require(component != nullptr, "Missing VST3 component state");
    juce::MemoryBlock raw;
    require(raw.fromBase64Encoding(component->getAllSubText()), "Invalid VST3 component state encoding");
    // The pinned JUCE VST3 wrapper appends its private state after eight zero bytes.
    raw.append("", 1);
    return juce::String::fromUTF8(static_cast<const char*>(raw.getData()));
}

void requireStateEquals(juce::AudioPluginInstance& plugin, const juce::var& expected) {
    const auto actual = juce::JSON::parse(savedState(plugin));
    require(actual.isObject() && jsonFor(actual) == jsonFor(expected), "Plugin state did not round-trip exactly");
}

class ProbePlayHead final : public juce::AudioPlayHead {
public:
    void set(double ppq, bool playing, bool looping = false, double loopStart = 0.0, double loopEnd = 0.0,
             double bpm = tempo) {
        position = {};
        position.setTimeInSamples(static_cast<juce::int64>(std::llround(ppq * 60.0 * sampleRate / bpm)));
        position.setPpqPosition(ppq);
        position.setBpm(bpm);
        position.setIsPlaying(playing);
        position.setIsLooping(looping);
        if (looping) position.setLoopPoints(LoopPoints{loopStart, loopEnd});
    }
    juce::Optional<PositionInfo> getPosition() const override { return position; }
private:
    PositionInfo position;
};

struct Heard { int sample; int pitch; bool on; };

std::vector<Heard> processBlock(juce::AudioPluginInstance& plugin, juce::AudioBuffer<float>& audio,
                                juce::MidiBuffer& midi, ProbePlayHead& host, double ppq, bool playing,
                                bool looping = false, double loopStart = 0.0, double loopEnd = 0.0,
                                double bpm = tempo, bool injectInputMidi = false) {
    host.set(ppq, playing, looping, loopStart, loopEnd, bpm);
    for (int channel = 0; channel < audio.getNumChannels(); ++channel)
        for (int sample = 0; sample < audio.getNumSamples(); ++sample)
            audio.setSample(channel, sample, 0.25f);
    midi.clear();
    if (injectInputMidi)
        midi.addEvent(juce::MidiMessage::noteOn(1, 127, static_cast<juce::uint8>(100)), 17);
    plugin.processBlock(audio, midi);
    for (int channel = 0; channel < audio.getNumChannels(); ++channel)
        for (int sample = 0; sample < audio.getNumSamples(); ++sample)
            require(audio.getSample(channel, sample) == 0.0f, "Plugin audio output was not silent");
    std::vector<Heard> events;
    for (const auto metadata : midi) {
        const auto message = metadata.getMessage();
        require(metadata.samplePosition >= 0 && metadata.samplePosition < audio.getNumSamples(),
                "Plugin emitted MIDI outside the current audio block");
        require(message.isNoteOn() || message.isNoteOff(), "Plugin emitted a non-note MIDI event");
        events.push_back({metadata.samplePosition, message.getNoteNumber(), message.isNoteOn()});
    }
    return events;
}

void verifyVst3EventBuses(juce::AudioPluginInstance& plugin) {
    const auto* client = plugin.getVST3Client();
    require(client != nullptr, "JUCE did not expose the hosted VST3 component");
    auto* component = client->getIComponentPtr();
    require(component != nullptr, "JUCE did not expose the VST3 IComponent");
    require(component->getBusCount(Steinberg::Vst::kEvent, Steinberg::Vst::kInput) == 1,
            "VST3 did not advertise exactly one event input bus");
    require(component->getBusCount(Steinberg::Vst::kEvent, Steinberg::Vst::kOutput) == 1,
            "VST3 did not advertise exactly one event output bus");
    Steinberg::Vst::BusInfo input {}, output {};
    require(component->getBusInfo(Steinberg::Vst::kEvent, Steinberg::Vst::kInput, 0, input)
                == Steinberg::kResultTrue && input.channelCount > 0,
            "VST3 event input bus was not valid");
    require(component->getBusInfo(Steinberg::Vst::kEvent, Steinberg::Vst::kOutput, 0, output)
                == Steinberg::kResultTrue && output.channelCount > 0,
            "VST3 event output bus was not valid");
}

void verifyFixture(juce::AudioPluginInstance& plugin, ProbePlayHead& host,
                   int firstPitch, int secondPitch) {
    juce::AudioBuffer<float> audio(2, blockSize);
    juce::MidiBuffer midi;
    std::vector<Heard> heard;
    double ppq = 0.0;
    constexpr int blocks = 48;
    for (int block = 0; block < blocks; ++block) {
        const auto events = processBlock(plugin, audio, midi, host, ppq, true,
                                         false, 0.0, 0.0, tempo, block == 0);
        for (const auto& event : events)
            heard.push_back({block * blockSize + event.sample, event.pitch, event.on});
        ppq += blockSize * tempo / (60.0 * sampleRate);
    }
    const std::array<Heard, 4> expected {{
        {6000, firstPitch, true}, {12000, firstPitch, false},
        {18000, secondPitch, true}, {24000, secondPitch, false}
    }};
    if (heard.size() != expected.size()) {
        std::cerr << "Expected " << expected.size() << " MIDI events; heard " << heard.size() << "\n";
        for (const auto& event : heard) std::cerr << event.sample << " pitch=" << event.pitch << " on=" << event.on << "\n";
    }
    require(heard.size() == expected.size(), "Unexpected MIDI event count from processBlock");
    for (std::size_t i = 0; i < expected.size(); ++i)
        require(heard[i].sample == expected[i].sample && heard[i].pitch == expected[i].pitch &&
                heard[i].on == expected[i].on, "Unexpected pitch or sample offset from processBlock");
}

void verifyTransport(juce::AudioPluginInstance& plugin, ProbePlayHead& host) {
    juce::AudioBuffer<float> audio(2, blockSize);
    juce::MidiBuffer midi;
    auto events = processBlock(plugin, audio, midi, host, 0.3, true, false, 0, 0, 60.0);
    require(events.size() == 1 && events[0].on && events[0].pitch == 72 && events[0].sample == 0,
            "Seek did not chase the sustained note");
    events = processBlock(plugin, audio, midi, host, 0.31, false);
    require(events.size() == 1 && !events[0].on && events[0].pitch == 72 && events[0].sample == 0,
            "Transport stop did not emit the sustained note-off");
    events = processBlock(plugin, audio, midi, host, 0.39, true, true, 0.2, 0.4);
    require(events.size() == 2 && events[0].on && events[0].sample == 0 &&
            !events[1].on && events[1].sample == 240,
            "Host loop wrap did not flush the held note at its sample offset");
}

std::unique_ptr<juce::AudioPluginInstance> createPlugin(juce::VST3PluginFormat& format,
                                                         const juce::PluginDescription& description) {
    juce::String error;
    auto plugin = format.createInstanceFromDescription(description, sampleRate, blockSize, error);
    require(plugin != nullptr, "VST3 instance creation failed: " + error);
    return plugin;
}

}
