#pragma once
#include <juce_gui_extra/juce_gui_extra.h>

class MidiDragHandle final : public juce::TextButton {
public:
    MidiDragHandle();
    ~MidiDragHandle() override;
    void setFile(juce::File file, const juce::String& filename);
    void mouseDown(const juce::MouseEvent& event) override { started = false; TextButton::mouseDown(event); }
    void mouseDrag(const juce::MouseEvent&) override;
    void paintButton(juce::Graphics&, bool highlighted, bool down) override;
private:
    juce::File prepared;
    bool started = false, preparedWasDragged = false, chords = false;
};
