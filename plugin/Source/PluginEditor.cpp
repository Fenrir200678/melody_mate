#include "PluginEditor.h"
#include "BinaryData.h"
#include "PluginConfig.h"

MelodyDragHandle::MelodyDragHandle() : TextButton("Drag melody MIDI to DAW") {
    setEnabled(false);
    setTooltip("Drag this native handle to a MIDI track. The file is prepared before the mouse gesture.");
}
MelodyDragHandle::~MelodyDragHandle() { setFile({}); }
void MelodyDragHandle::setFile(juce::File file) {
    if (prepared.existsAsFile() && !preparedWasDragged) prepared.getParentDirectory().deleteRecursively();
    prepared = std::move(file);
    preparedWasDragged = false;
    setEnabled(prepared.existsAsFile());
}
void MelodyDragHandle::mouseDrag(const juce::MouseEvent& event) {
    if (started || !event.mods.isLeftButtonDown() || event.getDistanceFromDragStart() < 4 || !prepared.existsAsFile()) return;
    started = juce::DragAndDropContainer::performExternalDragDropOfFiles({ prepared.getFullPathName() }, false, this);
    preparedWasDragged = preparedWasDragged || started;
}

MelodyMateEditor::MelodyMateEditor(MelodyMateProcessor& owner)
    : AudioProcessorEditor(owner), ownerProcessor(owner),
      assets(std::make_unique<juce::MemoryInputStream>(BinaryData::ui_zip, BinaryData::ui_zipSize, false)),
      browser(browserOptions()),
      tempDirectory(juce::File::getSpecialLocation(juce::File::tempDirectory)
          .getChildFile("MelodyMate-" + juce::Uuid().toString())) {
    tempDirectory.createDirectory();
    addAndMakeVisible(browser);
    addAndMakeVisible(drag);
    addAndMakeVisible(dragStatus);
    dragStatus.setColour(juce::Label::textColourId, juce::Colour(0xff8d8f99));
    dragStatus.setText("Native MIDI output | Start transport in your DAW", juce::dontSendNotification);
    setResizable(true, false);
    setResizeLimits(melody::editorMinWidth, melody::editorMinHeight, 2560, 1600);
    setSize(melody::editorWidth, melody::editorHeight);
    observedEpoch = ownerProcessor.state.generation();
    prepareDragFile();
    browser.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
    startTimerHz(30);
}
MelodyMateEditor::~MelodyMateEditor() {
    stopTimer();
    // Receivers may read promised files after the editor has closed. macOS owns temp cleanup.
}
void MelodyMateEditor::resized() {
    auto bounds = getLocalBounds();
    auto strip = bounds.removeFromTop(36).reduced(8, 4);
    drag.setBounds(strip.removeFromRight(216));
    dragStatus.setBounds(strip);
    browser.setBounds(bounds);
}
void MelodyMateEditor::paint(juce::Graphics& graphics) { graphics.fillAll(juce::Colour(0xff15161a)); }
juce::WebBrowserComponent::Options MelodyMateEditor::browserOptions() {
    return juce::WebBrowserComponent::Options()
        .withNativeIntegrationEnabled()
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withResourceProvider([this](const juce::String& path) { return resource(path); })
        .withNativeFunction("melodyMate", [this](const juce::Array<juce::var>& args,
                                                juce::WebBrowserComponent::NativeFunctionCompletion complete) {
            command(args, std::move(complete));
        });
}
std::optional<juce::WebBrowserComponent::Resource> MelodyMateEditor::resource(const juce::String& path) {
    auto name = path.upToFirstOccurrenceOf("?", false, false).trimCharactersAtStart("/");
    if (name.isEmpty()) name = "plugin.html";
    if (name.contains("..") || name.containsChar('\\')) return {};
    const auto index = assets.getIndexOfFileName(name);
    if (index < 0) return {};
    std::unique_ptr<juce::InputStream> input(assets.createStreamForEntry(index));
    if (!input) return {};
    juce::MemoryBlock bytes;
    input->readIntoMemoryBlock(bytes);
    juce::String mime = "application/octet-stream";
    const auto extension = juce::File(name).getFileExtension();
    if (extension == ".html") mime = "text/html";
    else if (extension == ".js") mime = "text/javascript";
    else if (extension == ".css") mime = "text/css";
    else if (extension == ".json") mime = "application/json";
    else if (extension == ".woff2") mime = "font/woff2";
    else if (extension == ".woff") mime = "font/woff";
    else if (extension == ".svg") mime = "image/svg+xml";
    const auto* first = static_cast<const std::byte*>(bytes.getData());
    return juce::WebBrowserComponent::Resource { std::vector<std::byte>(first, first + bytes.getSize()), mime };
}
void MelodyMateEditor::command(const juce::Array<juce::var>& args,
                                juce::WebBrowserComponent::NativeFunctionCompletion complete) {
    auto* reply = new juce::DynamicObject();
    juce::var response(reply);
    bool ok = false;
    juce::String error = "Unknown command";
    if (args.size() >= 1 && args[0].isString()) {
        const auto action = args[0].toString();
        if (action == "read") {
            reply->setProperty("payload", ownerProcessor.state.read());
            ok = true;
        } else if (action == "panic") {
            ownerProcessor.panic.store(true);
            ok = true;
        } else if (action == "commit" && args.size() == 2 && args[1].isObject()) {
            const auto payload = args[1];
            const auto epoch = payload.getProperty("epoch", {});
            if (epoch.isInt()) {
                ok = ownerProcessor.state.commit(payload.getProperty("document", {}), static_cast<int>(epoch), error);
                if (ok) {
                    prepareDragFile();
                    ownerProcessor.updateHostDisplay(juce::AudioProcessorListener::ChangeDetails().withNonParameterStateChanged(true));
                }
            }
        }
    }
    reply->setProperty("ok", ok);
    if (!ok) reply->setProperty("error", error);
    complete(response);
}
void MelodyMateEditor::prepareDragFile() {
    const auto bytes = ownerProcessor.state.midiBytes();
    const auto filename = ownerProcessor.state.midiFilename();
    if (bytes == preparedMidi && filename == preparedFilename) return;
    if (bytes.getSize() == 0) { preparedMidi.reset(); preparedFilename.clear(); drag.setFile({}); return; }
    drag.setFile({});
    // A separate immutable file for each revision keeps a drag in progress stable during UI edits.
    const auto directory = tempDirectory.getChildFile(juce::Uuid().toString());
    const auto file = directory.getChildFile(filename);
    if (directory.createDirectory().wasOk() && file.replaceWithData(bytes.getData(), bytes.getSize())) {
        preparedMidi = bytes; preparedFilename = filename; drag.setFile(file);
    }
    else { drag.setFile({}); dragStatus.setText("Could not prepare temporary MIDI file", juce::dontSendNotification); }
}
void MelodyMateEditor::timerCallback() {
    const auto generation = ownerProcessor.state.generation();
    if (generation != observedEpoch && browser.isVisible()) {
        observedEpoch = generation;
        prepareDragFile();
        browser.emitEventIfBrowserIsVisible("restore", ownerProcessor.state.read());
    }
    browser.emitEventIfBrowserIsVisible("transport", ownerProcessor.transportInfo());
}
