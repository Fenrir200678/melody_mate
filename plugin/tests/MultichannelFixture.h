#pragma once
#include <algorithm>

namespace {
bool hasNote(const std::vector<Heard>& events, int channel, bool on) {
    return std::any_of(events.begin(), events.end(), [=](const Heard& event) {
        return event.channel == channel && event.on == on;
    });
}
juce::var routedDocument(int melodyChannel, int chordsChannel) {
    auto document = makeDocument(60, 64);
    auto* output = document.getProperty("session", {}).getProperty("output", {}).getDynamicObject();
    output->setProperty("melodyChannel", melodyChannel);
    output->setProperty("chordsChannel", chordsChannel);
    juce::Array<juce::var> notes;
    for (const auto& track : {std::pair{"melody", melodyChannel}, std::pair{"chords", chordsChannel}}) {
        if (track.second == 0) continue;
        auto voice = note(60, 0, 2);
        voice.getDynamicObject()->setProperty("track", track.first);
        voice.getDynamicObject()->setProperty("channel", track.second);
        notes.add(voice);
    }
    document.getProperty("playback", {}).getDynamicObject()->setProperty("notes", notes);
    return document;
}

void verifyMultichannel(juce::VST3PluginFormat& format, const juce::PluginDescription& description) {
    auto plugin = createPlugin(format, description);
    ProbePlayHead host;
    plugin->setPlayHead(&host);
    const auto document = routedDocument(3, 16);
    setDocument(*plugin, document);
    plugin->prepareToPlay(sampleRate, blockSize);
    juce::AudioBuffer<float> audio(2, blockSize);
    juce::MidiBuffer midi;
    auto events = processBlock(*plugin, audio, midi, host, 0, true);
    require(events.size() == 2 && hasNote(events, 3, true) && hasNote(events, 16, true),
        "Independent same-pitch voices did not retain their assigned host MIDI channels");
    setDocument(*plugin, routedDocument(9, 0));
    events = processBlock(*plugin, audio, midi, host, 0.01, true);
    require(events.size() == 3 && !events[0].on && !events[1].on && events[2].on && events[2].channel == 9,
        "Channel reassignment did not release old channels before chasing the new channel");
    require((events[0].channel == 3 && events[1].channel == 16) || (events[0].channel == 16 && events[1].channel == 3),
        "Channel reassignment released the wrong destination");
    setDocument(*plugin, routedDocument(0, 0));
    events = processBlock(*plugin, audio, midi, host, 0.02, true);
    require(events.size() == 1 && !events[0].on && events[0].channel == 9, "None failed to release and disable the voice");

    setDocument(*plugin, document);
    auto invalid = document.clone();
    invalid.getProperty("playback", {}).getProperty("notes", {}).getArray()->getReference(0).getDynamicObject()->setProperty("channel", 7);
    setDocument(*plugin, invalid);
    requireStateEquals(*plugin, document);
    invalid = document.clone();
    invalid.getProperty("playback", {}).getDynamicObject()->setProperty("repeat", true);
    setDocument(*plugin, invalid);
    requireStateEquals(*plugin, document);
    juce::MemoryBlock state;
    plugin->getStateInformation(state);
    plugin->releaseResources();
    plugin->setPlayHead(nullptr);
    plugin.reset();

    plugin = createPlugin(format, description);
    plugin->setPlayHead(&host);
    plugin->setStateInformation(state.getData(), static_cast<int>(state.getSize()));
    plugin->prepareToPlay(sampleRate, blockSize);
    requireStateEquals(*plugin, document);
    plugin->setNonRealtime(true);
    events = processBlock(*plugin, audio, midi, host, 0.5, true);
    require(events.size() == 2 && hasNote(events, 3, true) && hasNote(events, 16, true),
        "Restored multichannel host output failed during non-realtime processing before editor creation");
    auto chordExport = document.clone();
    chordExport.getDynamicObject()->setProperty("midiBase64", makeMidiBase64(2, {48, 52, 55}));
    chordExport.getDynamicObject()->setProperty("filename", "MelodyMate_Cmaj_120BPM_1bar_Chords.mid");
    setDocument(*plugin, chordExport);
    requireStateEquals(*plugin, chordExport);
    events = processBlock(*plugin, audio, midi, host, 0.5 + blockSize * tempo / (60.0 * sampleRate), true);
    require(events.empty(), "Changing only the exported MIDI track retriggered host playback");
    events = processBlock(*plugin, audio, midi, host, 0.51, false);
    require(events.size() == 2 && !events[0].on && !events[1].on, "Stop lost a restored multichannel note-off");
    plugin->releaseResources();
    plugin->setPlayHead(nullptr);
    std::cout << "Multichannel VST3 routing, reassignment, None, validation and offline editor-free restore passed\n";
}
}
