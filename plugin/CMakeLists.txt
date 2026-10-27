cmake_minimum_required(VERSION 3.24)
project(MelodyMatePrototype VERSION 0.1.5 LANGUAGES C CXX)
if(NOT APPLE AND NOT WIN32)
  message(FATAL_ERROR "The native plugin currently supports macOS and Windows only")
endif()
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(APPLE)
  set(CMAKE_OSX_DEPLOYMENT_TARGET "14.0" CACHE STRING "Minimum macOS version")
endif()
include(FetchContent)
# JUCE 9.0.4. Commit and archive digest are pinned independently of moving tags.
FetchContent_Declare(JUCE
  URL https://github.com/juce-framework/JUCE/archive/3fb5cbc0340758596dac39f7c8de47d562b4896e.tar.gz
  URL_HASH SHA256=2bb7095497a7bb7269dbdf841a7c6aa0939eaeb2a2bc9724ac4758d3ae3565a7
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
FetchContent_MakeAvailable(JUCE)
if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/dist/plugin.html")
  message(FATAL_ERROR "Run pnpm build:plugin-ui before configuring the native build")
endif()
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/dist/native-config.json" NATIVE_CONFIG)
foreach(KEY width height minWidth minHeight maxNotes maxStateBytes nativeStripHeight nativeDragWidth nativeLabelSize nativeControlSize nativeDragThreshold nativePanel nativeSurface nativeBorder nativeText nativeMuted nativeSignal nativeChord)
  string(JSON ${KEY} GET "${NATIVE_CONFIG}" ${KEY})
endforeach()
configure_file(Source/PluginConfig.h.in "${CMAKE_CURRENT_BINARY_DIR}/generated/PluginConfig.h" @ONLY)
file(GLOB_RECURSE UI_FILES CONFIGURE_DEPENDS RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}/dist" "${CMAKE_CURRENT_SOURCE_DIR}/dist/*")
execute_process(COMMAND "${CMAKE_COMMAND}" -E tar cf "${CMAKE_CURRENT_BINARY_DIR}/ui.zip" --format=zip -- ${UI_FILES}
  WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/dist" COMMAND_ERROR_IS_FATAL ANY)
juce_add_binary_data(PluginAssets SOURCES "${CMAKE_CURRENT_BINARY_DIR}/ui.zip")
juce_add_plugin(MelodyMatePrototype
  COMPANY_NAME "Melody Mate" BUNDLE_ID "local.melodymate.prototype"
  PLUGIN_MANUFACTURER_CODE Mlmt PLUGIN_CODE Mmpt
  PRODUCT_NAME "Melody Mate Prototype"
  IS_SYNTH TRUE NEEDS_MIDI_INPUT TRUE NEEDS_MIDI_OUTPUT TRUE IS_MIDI_EFFECT FALSE
  EDITOR_WANTS_KEYBOARD_FOCUS TRUE
  VST3_CATEGORIES Instrument Synth
  FORMATS VST3 COPY_PLUGIN_AFTER_BUILD FALSE
  NEEDS_WEB_BROWSER TRUE NEEDS_WEBVIEW2 TRUE)
target_sources(MelodyMatePrototype PRIVATE Source/PluginProcessor.cpp Source/PluginEditor.cpp Source/SessionState.cpp Source/MidiScheduler.cpp Source/MidiDragHandle.cpp)
target_include_directories(MelodyMatePrototype PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/generated")
target_compile_definitions(MelodyMatePrototype PUBLIC JUCE_WEB_BROWSER=1 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0)
if(WIN32)
  target_compile_definitions(MelodyMatePrototype PUBLIC JUCE_USE_WIN_WEBVIEW2=1 JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1)
endif()
target_link_libraries(MelodyMatePrototype PRIVATE PluginAssets juce::juce_audio_utils juce::juce_gui_extra
  PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
if(APPLE)
  # JUCE regenerates moduleinfo.json after its own signing step.
  add_custom_command(TARGET MelodyMatePrototype_VST3 POST_BUILD
    COMMAND /usr/bin/codesign --force --sign - --timestamp=none "$<TARGET_BUNDLE_DIR:MelodyMatePrototype_VST3>"
    VERBATIM COMMENT "Ad-hoc signing the completed local VST3 bundle")
endif()
include(CTest)
if(BUILD_TESTING)
  add_executable(SchedulerTests tests/SchedulerTests.cpp Source/MidiScheduler.cpp)
  target_include_directories(SchedulerTests PRIVATE Source "${CMAKE_CURRENT_BINARY_DIR}/generated")
  add_test(NAME native-scheduler COMMAND SchedulerTests)
  juce_add_gui_app(PluginProbe PRODUCT_NAME "Melody Mate VST3 Probe" BUNDLE_ID "local.melodymate.probe" NEEDS_WEB_BROWSER TRUE NEEDS_WEBVIEW2 TRUE)
  target_sources(PluginProbe PRIVATE tests/PluginProbe.cpp)
  target_include_directories(PluginProbe SYSTEM PRIVATE "${juce_SOURCE_DIR}/modules/juce_audio_processors_headless/format_types/VST3_SDK")
  target_compile_definitions(PluginProbe PRIVATE JUCE_PLUGINHOST_VST3=1 JUCE_WEB_BROWSER=1 JUCE_USE_CURL=0)
  if(WIN32)
    target_compile_definitions(PluginProbe PRIVATE JUCE_USE_WIN_WEBVIEW2=1 JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1)
  endif()
  target_link_libraries(PluginProbe PRIVATE juce::juce_audio_processors juce::juce_gui_extra
    juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
  add_dependencies(PluginProbe MelodyMatePrototype_VST3)
  get_target_property(PLUGIN_BUNDLE MelodyMatePrototype_VST3 JUCE_PLUGIN_ARTEFACT_FILE)
  add_test(NAME native-vst3 COMMAND PluginProbe "${PLUGIN_BUNDLE}")
endif()
