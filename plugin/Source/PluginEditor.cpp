#include "PluginEditor.h"
#include "BinaryData.h"
#include "PluginConfig.h"
#if JUCE_WINDOWS
#include <windows.h>
#endif

namespace {
#if JUCE_WINDOWS
bool isStudioProHost() {
    std::array<wchar_t, 32768> path {};
    const auto length = GetModuleFileNameW(nullptr, path.data(), static_cast<DWORD>(path.size()));
    if (length == 0 || length >= path.size()) return false;
    const auto executable = juce::File(juce::String(path.data())).getFileName();
    return executable.equalsIgnoreCase("Studio Pro.exe") || executable.equalsIgnoreCase("Studio One.exe");
}

bool forwardSpaceToHost(juce::Component& editor) {
    if (!isStudioProHost()) return false;
    const auto* peer = editor.getPeer();
    if (peer == nullptr) return false;
    const auto hwnd = static_cast<HWND>(peer->getNativeHandle());
    const auto host = GetAncestor(hwnd, GA_ROOTOWNER);
    const auto foreground = GetForegroundWindow();
    if (host == nullptr || foreground == nullptr || GetAncestor(foreground, GA_ROOTOWNER) != host) return false;
    const LPARAM down = 1 | (static_cast<LPARAM>(MapVirtualKeyW(VK_SPACE, MAPVK_VK_TO_VSC)) << 16);
    return PostMessageW(host, WM_KEYDOWN, VK_SPACE, down) != 0
        && PostMessageW(host, WM_KEYUP, VK_SPACE, down | (static_cast<LPARAM>(3) << 30)) != 0;
}
// WebView2 is a native child window and would cover JUCE's corner resizer.
constexpr int resizeStripHeight = 20;
#else
constexpr int resizeStripHeight = 0;
#endif
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
    const auto initialWidth = ownerProcessor.editorWidth > 0 ? ownerProcessor.editorWidth : melody::editorWidth;
    const auto initialHeight = ownerProcessor.editorHeight > 0 ? ownerProcessor.editorHeight : melody::editorHeight;
    addAndMakeVisible(drag);
    addAndMakeVisible(dragStatus);
    dragStatus.setColour(juce::Label::textColourId, juce::Colour(melody::nativeMuted));
    dragStatus.setFont(juce::FontOptions(static_cast<float>(melody::nativeLabelSize)));
    dragStatus.setText("MIDI clip   /   Follows the selected piano-roll track", juce::dontSendNotification);
    setResizable(true, JUCE_WINDOWS != 0);
    setResizeLimits(melody::editorMinWidth, melody::editorMinHeight, 2560, 1600);
    setSize(initialWidth, initialHeight);
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
        browser->setBounds(getLocalBounds().withTrimmedTop(melody::nativeStripHeight).withTrimmedBottom(resizeStripHeight));
        browser->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
    }
    startTimerHz(30);
}
MelodyMateEditor::~MelodyMateEditor() {
    stopTimer();
    // Promised files outlive the editor; retain them for late receiver reads.
}
void MelodyMateEditor::resized() {
    if (getWidth() > 0 && getHeight() > 0) {
        ownerProcessor.editorWidth = getWidth();
        ownerProcessor.editorHeight = getHeight();
    }
    auto bounds = getLocalBounds();
    auto strip = bounds.removeFromTop(melody::nativeStripHeight).reduced(8, 4);
    drag.setBounds(strip.removeFromRight(melody::nativeDragWidth));
    dragStatus.setBounds(strip);
    bounds.removeFromBottom(resizeStripHeight);
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
        } else if (action == "space-capability") {
#if JUCE_WINDOWS
            reply->setProperty("payload", isStudioProHost());
#else
            reply->setProperty("payload", false);
#endif
            ok = true;
        } else if (action == "forward-space") {
#if JUCE_WINDOWS
            ok = forwardSpaceToHost(*this);
#endif
            if (!ok) error = "Could not forward space to the host";
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
