#pragma once
#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"

class LocalBrowser final : public juce::WebBrowserComponent {
public:
    explicit LocalBrowser(const Options& options) : WebBrowserComponent(options) {}
    bool pageAboutToLoad(const juce::String& url) override {
        return url.startsWith(getResourceProviderRoot()) || url == "about:blank";
    }
    bool pageLoadHadNetworkError(const juce::String&) override { return false; }
};

class MelodyDragHandle final : public juce::TextButton {
public:
    MelodyDragHandle();
    ~MelodyDragHandle() override;
    void setFile(juce::File file);
    void mouseDown(const juce::MouseEvent& event) override { started = false; TextButton::mouseDown(event); }
    void mouseDrag(const juce::MouseEvent&) override;
private:
    juce::File prepared;
    bool started = false, preparedWasDragged = false;
};

class MelodyMateEditor final : public juce::AudioProcessorEditor, private juce::Timer {
public:
    explicit MelodyMateEditor(MelodyMateProcessor&);
    ~MelodyMateEditor() override;
    void resized() override;
    void paint(juce::Graphics&) override;
private:
    juce::WebBrowserComponent::Options browserOptions();
    std::optional<juce::WebBrowserComponent::Resource> resource(const juce::String& path);
    void command(const juce::Array<juce::var>&, juce::WebBrowserComponent::NativeFunctionCompletion);
    void prepareDragFile();
    void timerCallback() override;
    MelodyMateProcessor& ownerProcessor;
    juce::ZipFile assets;
    LocalBrowser browser;
    MelodyDragHandle drag;
    juce::Label dragStatus;
    juce::File tempDirectory;
    juce::MemoryBlock preparedMidi;
    juce::String preparedFilename;
    int observedEpoch = 0;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MelodyMateEditor)
};
