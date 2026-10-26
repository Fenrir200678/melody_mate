#include "PluginProcessor.h"
#include "PluginEditor.h"

MelodyMateProcessor::MelodyMateProcessor()
    : AudioProcessor(BusesProperties().withOutput("Silent output", juce::AudioChannelSet::stereo(), true)) {}
void MelodyMateProcessor::prepareToPlay(double sampleRate, int) {
    rate = sampleRate;
    scheduler.requestFlush(true);
}
bool MelodyMateProcessor::isBusesLayoutSupported(const BusesLayout& layout) const {
    return layout.getMainInputChannelSet().isDisabled() && layout.getMainOutputChannelSet() == juce::AudioChannelSet::stereo();
}
void MelodyMateProcessor::processBlock(juce::AudioBuffer<float>& audio, juce::MidiBuffer& midi) {
    juce::ScopedNoDenormals noDenormals;
    audio.clear();
    // The compatibility input bus does not trigger or pass through host notes.
    midi.clear();
    melody::HostTime host;
    if (auto* playHead = getPlayHead()) {
        if (const auto position = playHead->getPosition()) {
            const auto ppq = position->getPpqPosition(), bpm = position->getBpm();
            if (ppq && bpm) {
                host.valid = std::isfinite(*ppq) && std::isfinite(*bpm) && *bpm > 0;
                host.ppq = *ppq;
                host.bpm = *bpm;
                host.playing = position->getIsPlaying();
                if (const auto loop = position->getLoopPoints()) {
                    host.looping = position->getIsLooping();
                    host.loopStartPpq = loop->ppqStart;
                    host.loopEndPpq = loop->ppqEnd;
                }
            }
        }
    }
    hostValid.store(host.valid, std::memory_order_relaxed);
    hostPlaying.store(host.playing, std::memory_order_relaxed);
    hostPpq.store(host.ppq, std::memory_order_relaxed);
    hostBpm.store(host.bpm, std::memory_order_relaxed);
    if (panic.exchange(false)) scheduler.requestFlush();
    const auto* sequence = state.mailbox.acquire();
    scheduler.process(sequence, host, audio.getNumSamples(), rate, &midi,
        [](void* context, int offset, int channel, int pitch, int velocity) {
            auto& buffer = *static_cast<juce::MidiBuffer*>(context);
            buffer.addEvent(velocity == 0 ? juce::MidiMessage::noteOff(channel, pitch)
                : juce::MidiMessage::noteOn(channel, pitch, static_cast<juce::uint8>(velocity)), offset);
        });
}
void MelodyMateProcessor::processBlockBypassed(juce::AudioBuffer<float>& audio, juce::MidiBuffer& midi) {
    audio.clear();
    midi.clear();
    scheduler.process(nullptr, {}, audio.getNumSamples(), rate, &midi,
        [](void* context, int offset, int channel, int pitch, int) {
            static_cast<juce::MidiBuffer*>(context)->addEvent(juce::MidiMessage::noteOff(channel, pitch), offset);
        });
    hostPlaying.store(false);
}
juce::var MelodyMateProcessor::transportInfo() const {
    auto* object = new juce::DynamicObject();
    object->setProperty("valid", hostValid.load());
    object->setProperty("playing", hostPlaying.load());
    object->setProperty("ppq", hostPpq.load());
    object->setProperty("bpm", hostBpm.load());
    return object;
}
juce::AudioProcessorEditor* MelodyMateProcessor::createEditor() { return new MelodyMateEditor(*this); }
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new MelodyMateProcessor(); }
