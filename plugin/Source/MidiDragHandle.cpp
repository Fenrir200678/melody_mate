#include "MidiDragHandle.h"
#include "PluginConfig.h"

MidiDragHandle::MidiDragHandle() : TextButton("No melody notes") { setEnabled(false); }
MidiDragHandle::~MidiDragHandle() { setFile({}, {}); }
void MidiDragHandle::setFile(juce::File file, const juce::String& filename) {
    if (prepared.existsAsFile() && !preparedWasDragged) prepared.getParentDirectory().deleteRecursively();
    prepared = std::move(file);
    preparedWasDragged = false;
    chords = filename.endsWith("_Chords.mid");
    setEnabled(prepared.existsAsFile());
    const juce::String track = chords ? "chords" : "melody";
    setButtonText(isEnabled() ? "Drag " + track + " MIDI" : chords ? "No chord notes" : "No melody notes");
    setTooltip(isEnabled() ? filename + "\nDrag this clip into your DAW." : "Add notes to the selected track to export a MIDI clip.");
    setMouseCursor(isEnabled() ? juce::MouseCursor::DraggingHandCursor : juce::MouseCursor::NormalCursor);
    repaint();
}
void MidiDragHandle::mouseDrag(const juce::MouseEvent& event) {
    if (started || !event.mods.isLeftButtonDown() || event.getDistanceFromDragStart() < melody::nativeDragThreshold || !prepared.existsAsFile()) return;
    started = juce::DragAndDropContainer::performExternalDragDropOfFiles({ prepared.getFullPathName() }, false, this);
    preparedWasDragged = preparedWasDragged || started;
}
void MidiDragHandle::paintButton(juce::Graphics& graphics, bool highlighted, bool down) {
    const auto accent = juce::Colour(chords ? melody::nativeChord : melody::nativeSignal);
    const auto bounds = getLocalBounds().toFloat().reduced(0.5f);
    graphics.setColour(juce::Colour(melody::nativeSurface));
    graphics.fillRoundedRectangle(bounds, 6.0f);
    graphics.setColour(accent.withAlpha(down ? 0.28f : highlighted ? 0.20f : 0.10f));
    graphics.fillRoundedRectangle(bounds, 6.0f);
    graphics.setColour(hasKeyboardFocus(true) ? accent : accent.withAlpha(isEnabled() ? 0.5f : 0.2f));
    graphics.drawRoundedRectangle(bounds, 6.0f, 1.0f);
    graphics.setColour(isEnabled() ? accent : juce::Colour(melody::nativeMuted));
    const float y = static_cast<float>(getHeight()) / 2.0f;
    for (int row = -1; row <= 1; ++row) {
        graphics.fillEllipse(10.0f, y + static_cast<float>(row * 4) - 1.0f, 2.0f, 2.0f);
        graphics.fillEllipse(14.0f, y + static_cast<float>(row * 4) - 1.0f, 2.0f, 2.0f);
    }
    graphics.setFont(juce::FontOptions(static_cast<float>(melody::nativeControlSize)));
    graphics.setColour(juce::Colour(isEnabled() ? melody::nativeText : melody::nativeMuted));
    graphics.drawText(getButtonText(), getLocalBounds().reduced(24, 0), juce::Justification::centred);
}
