#include "ProbeFixture.h"
#include "MultichannelFixture.h"

namespace {
class ProbeWindow final : public juce::DocumentWindow {
public:
    explicit ProbeWindow(juce::AudioProcessorEditor* editor)
        : DocumentWindow("Melody Mate VST3 Probe", juce::Colours::darkgrey, allButtons) {
        setUsingNativeTitleBar(true);
        setContentOwned(editor, true);
        centreWithSize(editor->getWidth(), editor->getHeight());
        setVisible(true);
    }
    void closeButtonPressed() override { juce::JUCEApplication::getInstance()->quit(); }
};

class ProbeApplication final : public juce::JUCEApplication, private juce::Timer {
public:
    const juce::String getApplicationName() override { return "Melody Mate VST3 Probe"; }
    const juce::String getApplicationVersion() override { return "1.0"; }
    bool moreThanOneInstanceAllowed() override { return false; }

    void initialise(const juce::String&) override {
        try {
            parseArguments();
            runProbe();
        } catch (const std::exception& error) {
            std::cerr << "PluginProbe: " << error.what() << '\n';
            setApplicationReturnValue(1);
            quit();
        }
    }

    void shutdown() override {
        stopTimer();
        window.reset();
        if (plugin != nullptr) {
            if (prepared) plugin->releaseResources();
            plugin->setPlayHead(nullptr);
            plugin.reset();
        }
        if (savePath.getFullPathName().isNotEmpty() && pluginStateForSave.isNotEmpty()) {
            const juce::File destination(savePath);
            destination.getParentDirectory().createDirectory();
            if (!destination.replaceWithText(pluginStateForSave)) {
                std::cerr << "PluginProbe: could not save state to "
                          << savePath.getFullPathName().toStdString() << '\n';
                setApplicationReturnValue(1);
            }
        } else if (savePath.getFullPathName().isNotEmpty()) {
            std::cerr << "PluginProbe: no native state was committed; nothing to save\n";
            setApplicationReturnValue(1);
        }
    }

    void systemRequestedQuit() override { quit(); }

private:
    void parseArguments() {
        const auto args = getCommandLineParameterArray();
        require(args.size() >= 1, "Usage: PluginProbe <absolute.vst3> [--show] [--state JSON] [--save JSON]");
        require(juce::File::isAbsolutePath(args[0]),
                "Usage: PluginProbe <absolute.vst3> [--show|--ui-smoke] [--state JSON] [--save JSON]");
        pluginPath = args[0];
        for (int i = 1; i < args.size(); ++i) {
            if (args[i] == "--show") show = true;
            else if (args[i] == "--ui-smoke") { show = true; uiSmoke = true; }
            else if ((args[i] == "--state" || args[i] == "--save") && i + 1 < args.size()) {
                const auto option = args[i++];
                if (option == "--state") statePath = args[i]; else savePath = args[i];
            } else {
                throw std::runtime_error("Unknown or incomplete argument: " + args[i].toStdString());
            }
        }
        if (statePath.getFullPathName().isNotEmpty() && savePath.getFullPathName().isNotEmpty())
            require(juce::File(statePath).getFullPathName() != juce::File(savePath).getFullPathName(),
                    "--save must not overwrite the --state input");
        if (uiSmoke)
            require(statePath.getFullPathName().isEmpty(), "--ui-smoke requires a blank native session; omit --state");
    }

    void runProbe() {
        require(pluginPath.exists(), "VST3 bundle does not exist: " + pluginPath.getFullPathName());
        const bool hasSourceState = statePath.getFullPathName().isNotEmpty();
        if (hasSourceState) sourceDocument = readDocument(juce::File(statePath));
        juce::OwnedArray<juce::PluginDescription> descriptions;
        format.findAllTypesForFile(descriptions, pluginPath.getFullPathName());
        require(descriptions.size() > 0, "JUCE could not find a plugin description in the VST3 bundle");
        const juce::PluginDescription* selected = nullptr;
        for (const auto* description : descriptions)
            if (description->isInstrument) { selected = description; break; }
        require(selected != nullptr, "The VST3 bundle did not expose an instrument type");
        verifyMultichannel(format, *selected);
        std::cout << "Scanning " << selected->name.toStdString() << " with JUCE VST3PluginFormat\n";

        ProbePlayHead firstHost, secondHost;
        auto first = createPlugin(format, *selected);
        verifyVst3EventBuses(*first);
        first->setPlayHead(&firstHost);
        if (hasSourceState) {
            setDocument(*first, sourceDocument);
            requireStateEquals(*first, sourceDocument);
        }
        const auto firstDocument = makeDocument(60, 64);
        setDocument(*first, firstDocument);
        first->prepareToPlay(sampleRate, blockSize);
        auto second = createPlugin(format, *selected);
        second->setPlayHead(&secondHost);
        const auto secondDocument = makeDocument(72, 76);
        setDocument(*second, secondDocument);
        second->prepareToPlay(sampleRate, blockSize);
        verifyFixture(*first, firstHost, 60, 64);
        verifyFixture(*second, secondHost, 72, 76);
        requireStateEquals(*first, firstDocument);
        requireStateEquals(*second, secondDocument);
        juce::MemoryBlock restoredState;
        second->getStateInformation(restoredState);
        first->releaseResources();
        first->setPlayHead(nullptr);
        first.reset();
        second->releaseResources();
        second->setPlayHead(nullptr);
        second.reset();

        plugin = createPlugin(format, *selected);
        plugin->setPlayHead(&playHead);
        plugin->setStateInformation(restoredState.getData(), static_cast<int>(restoredState.getSize()));
        requireStateEquals(*plugin, secondDocument);
        plugin->prepareToPlay(sampleRate, blockSize);
        prepared = true;
        verifyFixture(*plugin, playHead, 72, 76);
        verifyTransport(*plugin, playHead);
        std::cout << "Two simultaneous VST3 instances, state recreation, and MIDI/audio probe passed before editor creation\n";

        if (show) {
            plugin->releaseResources();
            prepared = false;
            plugin->setPlayHead(nullptr);
            plugin.reset();
            plugin = createPlugin(format, *selected);
            plugin->setPlayHead(&playHead);
            if (hasSourceState) {
                setDocument(*plugin, sourceDocument);
                requireStateEquals(*plugin, sourceDocument);
            }
            plugin->prepareToPlay(sampleRate, blockSize);
            prepared = true;
            pluginStateForSave = savedState(*plugin);
            auto* editor = plugin->createEditorAndMakeActive();
            require(editor != nullptr, "Plugin did not create its editor");
            if (uiSmoke) {
                const auto originalWidth = editor->getWidth();
                const auto originalHeight = editor->getHeight();
                window = std::make_unique<ProbeWindow>(editor);
                window->setContentComponentSize(originalWidth + 120, originalHeight + 80);
                window.reset();
                editor = plugin->createEditorAndMakeActive();
                require(editor != nullptr && editor->getWidth() == originalWidth + 120
                        && editor->getHeight() == originalHeight + 80,
                        "Editor size was not retained after reopening");
                std::cout << "Editor size retained after reopening\n";
            }
            window = std::make_unique<ProbeWindow>(editor);
            playHead.set(0.0, true);
            smokeStartMs = juce::Time::getMillisecondCounter();
            startTimerHz(30);
            std::cout << (uiSmoke
                ? "UI smoke running; waiting for the frontend default session commit\n"
                : "Editor open with synthetic 120 BPM transport; close the window to exit\n");
        } else {
            pluginStateForSave = savedState(*plugin);
            quit();
        }
    }

    void timerCallback() override {
        if (plugin == nullptr) return;
        playHead.set(syntheticPpq, true);
        juce::AudioBuffer<float> audio(2, blockSize);
        juce::MidiBuffer midi;
        plugin->processBlock(audio, midi);
        syntheticPpq += blockSize * tempo / (60.0 * sampleRate);
        pluginStateForSave = savedState(*plugin);
        if (uiSmoke) {
            const auto document = juce::JSON::parse(pluginStateForSave);
            bool defaultsCommitted = false;
            if (document.isObject()) {
                const auto session = document.getProperty("session", {});
                const auto project = session.getProperty("project", {});
                const auto melody = session.getProperty("melody", {});
                const auto params = melody.getProperty("generatorParams", {});
                const auto ui = session.getProperty("ui", {});
                defaultsCommitted = project.getProperty("version", {}).isInt() &&
                    static_cast<int>(project.getProperty("version", {})) == 7 && params.isObject() &&
                    params.getProperty("minOctave", {}).isInt() && params.getProperty("maxOctave", {}).isInt() &&
                    ui.isObject() && ui.getProperty("modules", {}).isObject() &&
                    ui.getProperty("leftSidebarWidth", {}).isInt();
            }
            if (defaultsCommitted) {
                std::cout << "UI smoke passed: frontend defaults reached native state\n";
                quit();
            } else if (juce::Time::getMillisecondCounter() - smokeStartMs >= 10000u) {
                std::cerr << "PluginProbe: UI smoke timed out before the frontend default commit\n";
                setApplicationReturnValue(1);
                quit();
            }
        }
    }

    juce::File pluginPath, statePath, savePath;
    bool show = false, uiSmoke = false, prepared = false;
    juce::var sourceDocument;
    juce::String pluginStateForSave;
    juce::VST3PluginFormat format;
    ProbePlayHead playHead;
    double syntheticPpq = 0.0;
    juce::uint32 smokeStartMs = 0;
    std::unique_ptr<juce::AudioPluginInstance> plugin;
    std::unique_ptr<ProbeWindow> window;
};
} // namespace

START_JUCE_APPLICATION(ProbeApplication)
