#include "PluginEditor.h"
#include "BinaryData.h"
#include "PluginConfig.h"

namespace {
juce::File createEditorTempDirectory() {
    const auto directory = juce::File::getSpecialLocation(juce::File::tempDirectory)
        .getChildFile("MelodyMate-" + juce::Uuid().toString());
    directory.createDirectory();
    return directory;
}
}

MelodyMateEditor::MelodyMateEditor(MelodyMateProcessor& owner)
    : AudioProcessorEditor(owner), ownerProcessor(owner),
      assets(std::make_unique<juce::MemoryInputStream>(BinaryData::ui_zip, BinaryData::ui_zipSize, false)),
      tempDirectory(createEditorTempDirectory()) {
    addAndMakeVisible(drag);
    addAndMakeVisible(dragStatus);
    dragStatus.setColour(juce::Label::textColourId, juce::Colour(melody::nativeMuted));
    dragStatus.setFont(juce::FontOptions(static_cast<float>(melody::nativeLabelSize)));
    dragStatus.setText("MIDI clip   /   Follows the selected piano-roll track", juce::dontSendNotification);
    setResizable(true, false);
    setResizeLimits(melody::editorMinWidth, melody::editorMinHeight, 2560, 1600);
    setSize(melody::editorWidth, melody::editorHeight);
    observedEpoch = ownerProcessor.state.generation();
    prepareDragFile();
    const auto options = browserOptions();
#if JUCE_WINDOWS
    if (!juce::WebBrowserComponent::areOptionsSupported(options)) {
        dragStatus.setText("WebView2 Runtime is required. Install it, then reopen this editor.", juce::dontSendNotification);
    } else
#endif
    {
        browser = std::make_unique<LocalBrowser>(options);
        addAndMakeVisible(*browser);
        browser->setBounds(getLocalBounds().withTrimmedTop(melody::nativeStripHeight));
        browser->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
    }
    startTimerHz(30);
}
MelodyMateEditor::~MelodyMateEditor() {
    stopTimer();
    // Promised files outlive the editor; retain them for late receiver reads.
}
void MelodyMateEditor::resized() {
    auto bounds = getLocalBounds();
    auto strip = bounds.removeFromTop(melody::nativeStripHeight).reduced(8, 4);
    drag.setBounds(strip.removeFromRight(melody::nativeDragWidth));
    dragStatus.setBounds(strip);
    if (browser != nullptr) browser->setBounds(bounds);
}
void MelodyMateEditor::paint(juce::Graphics& graphics) { graphics.fillAll(juce::Colour(melody::nativePanel)); }
juce::WebBrowserComponent::Options MelodyMateEditor::browserOptions() {
    auto options = juce::WebBrowserComponent::Options()
        .withNativeIntegrationEnabled()
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withResourceProvider([this](const juce::String& path) { return resource(path); })
        .withNativeFunction("melodyMate", [this](const juce::Array<juce::var>& args,
                                                juce::WebBrowserComponent::NativeFunctionCompletion complete) {
            command(args, std::move(complete));
        });
#if JUCE_WINDOWS
    options = options.withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2()
            .withUserDataFolder(tempDirectory.getChildFile("WebView2")));
#endif
    return options;
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
    if (bytes.getSize() == 0) { preparedMidi.reset(); preparedFilename = filename; drag.setFile({}, filename); return; }
    drag.setFile({}, filename);
    preparedMidi.reset();
    preparedFilename.clear();
    // A separate immutable file for each revision keeps a drag in progress stable during UI edits.
    const auto directory = tempDirectory.getChildFile(juce::Uuid().toString());
    const auto file = directory.getChildFile(filename);
    if (directory.createDirectory().wasOk() && file.replaceWithData(bytes.getData(), bytes.getSize())) {
        preparedMidi = bytes; preparedFilename = filename; drag.setFile(file, filename);
        dragStatus.setText("MIDI clip   /   Follows the selected piano-roll track", juce::dontSendNotification);
    }
    else {
        directory.deleteRecursively();
        drag.setFile({}, filename);
        dragStatus.setText("Could not prepare temporary MIDI file", juce::dontSendNotification);
    }
}
void MelodyMateEditor::timerCallback() {
    if (browser == nullptr) return;
    const auto generation = ownerProcessor.state.generation();
    if (generation != observedEpoch && browser->isVisible()) {
        observedEpoch = generation;
        prepareDragFile();
        browser->emitEventIfBrowserIsVisible("restore", ownerProcessor.state.read());
    }
    browser->emitEventIfBrowserIsVisible("transport", ownerProcessor.transportInfo());
}
