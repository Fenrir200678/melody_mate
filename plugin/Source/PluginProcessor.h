#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include "SessionState.h"

class MelodyMateProcessor final : public juce::AudioProcessor {
public:
    MelodyMateProcessor();
    const juce::String getName() const override { return "Melody Mate Prototype"; }
    void prepareToPlay(double sampleRate, int maxBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout&) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    void processBlockBypassed(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    // Live requires an event input for instrument-class VST3 plugins, even for a generator.
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return true; }
    bool isMidiEffect() const override { return false; }
    bool hasEditor() const override { return true; }
    juce::AudioProcessorEditor* createEditor() override;
    double getTailLengthSeconds() const override { return 0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}
    void getStateInformation(juce::MemoryBlock& result) override { state.save(result); }
    void setStateInformation(const void* data, int bytes) override { state.restore(data, bytes); }
    juce::var transportInfo() const;
    melody::SessionState state;
    std::atomic<bool> panic { false };
    // Editor instances can be destroyed when the host switches plugin windows.
    int editorWidth = 0, editorHeight = 0;
private:
    melody::MidiScheduler scheduler;
    double rate = 0;
    std::atomic<bool> hostValid { false }, hostPlaying { false };
    std::atomic<double> hostPpq { 0 }, hostBpm { 0 };
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MelodyMateProcessor)
};
