# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

## [1.5.0] - 2025-12-27

### Added
- **OS Native Keychain Integration**: Enhanced security for desktop users by migrating sensitive API keys from plain-text JSON files to the operating system's native secure storage (Windows Credential Manager, macOS Keychain).
- **Hybrid Security Architecture**: Implementation of a dual-storage system where non-sensitive settings remain in `profile.json` while secrets are hardware-encrypted by the host OS.
- **Transparent Migration Logic**: Added an automatic migration system that detects existing plain-text keys on startup, moves them to secure storage, and scrubs them from the local disk.


### Changed
- **Secure Persistence Logic**: Refactored `desktopFileService.ts` to coordinate between the file system and the secure keychain.
- **Export/Import Logic**: Updated portability features to ensure API keys are retrieved from secure storage during export and properly re-secured upon import on a new machine.
- **Sample Migration System**: Implemented logic to automatically transition existing users to the new sample content while cleaning up deprecated legacy files from the context manager.
- **Replaced sample files**: Replaced legacy sample files.


### Technical Notes
- Integrated the `keyring` Rust crate into the Tauri backend.
- Exposed `set_secret`, `get_secret`, and `delete_secret` commands to the frontend.
- Added placeholder values (`KEYCHAIN_STORED`) in local JSON files to indicate secured status.

## [1.4.9] - 2025-12-27


### Added
- **Native Notification System**: Integrated OS-level system notifications (Windows/macOS/Linux). Users now receive a native popup when AI generation completes, even if the app is in the background.
- **Audible Chime**: Added a premium, non-intrusive double-chime synthesized via Web Audio API that triggers upon response completion.
- **Notification Toggle**: New "Interface Preferences" section in Settings allows users to enable/disable both audible and system notifications.
- **Click-to-Inspect**: Entire function cards in the Function Manager are now clickable triggers to view underlying system logic and architectures.

### Changed
- **Sidebar UI Overhaul**: Complete redesign of the sidebar with a deep-contrast, glassmorphic aesthetic. Includes refined navigation items with active glowing indicators and hover-state animations.
- **Minimal Navigation**: Simplified the sidebar layout by removing "Navigation" and "Configuration" headers, creating a cleaner and more direct interface.
- **Snappy Transitions**: Removed entry animations and delays from System Settings and Function Manager views for an instantaneous, high-performance feel.
- **Sidebar Focus**: Disabled the status dot indicator on hover for unselected tabs, ensuring the active view remains the primary focal point.
- **Modernized Manager Icons**: Replaced emojis in Function Manager and Context Manager empty states with professional BrainIcon assets.
- **Toggle Refinement**: Standardized the geometry and animation of the settings toggle for better cross-browser consistency and visual polish.
- **Terminology Refinement**: Updated sidebar labels to "Functions", "Context", and "System Settings" for improved scannability.
- **Quantum Branding**: Updated branding under the logo to "AI assisted reflection" and refined the overall header typography.

### Technical Notes
- Enabled `notification` capability in `tauri.conf.json`.
- Implemented real-time wave synthesis for notifications to ensure zero external dependencies.
- Integrated `stopPropagation` on management controls to allow for card-wide click events without interaction conflicts.

## [1.4.0] - 2025-12-27

### Added
- **Reasoning Model Support**: Full support for reasoning models like DeepSeek R1. The application now properly captures and displays the model's chain-of-thought reasoning process.
- **Collapsible Thinking Blocks**: When "Show Reasoning" is enabled during a run, the model's thinking process is displayed in a clean, collapsible block above the response. The block is collapsed by default to keep the focus on the answer.
- **Live Reasoning Preview**: During streaming, thinking content is displayed in real-time with a "Reasoning in progress..." indicator, allowing users to observe the model's thought process as it happens.
- **True Streaming for Ollama**: Implemented priority-based streaming that attempts standard `fetch` first for real-time token-by-token streaming, falling back to Tauri's buffered HTTP only when necessary.

### Changed
- **Show Reasoning Behavior**: The toggle now only controls whether reasoning is *captured* during a run, not whether existing reasoning is displayed. Once a response includes reasoning, the collapsible block will always appear regardless of the current toggle state.
- **Ollama Response Handling**: Updated the Ollama service to properly handle the separate `thinking` field returned by DeepSeek R1 and similar models, wrapping it appropriately for display.
- **Reasoning Display**: Removed emoji from thinking block header. Now uses a subtle brain icon with "Reasoning Process" label for a more professional appearance.

### Technical Notes
- The Ollama service now detects models that output reasoning in a dedicated `thinking` JSON field (vs. `<think>` tags in `response`).
- Streaming prioritizes browser-native `ReadableStream` for optimal performance, with Tauri fallback for environments where standard fetch fails.

## [1.3.0] - 2025-12-27

### Added
- **Provider Model Memory**: The settings system now remembers your preferred model for each individual provider. Switching between Gemini, Ollama, OpenAI, etc., will automatically restore the last used model for that specific source.
- **Enhanced Settings Status**: Added real-time "Unsaved Changes" and "Settings Synced" indicators in the settings footer for better configuration state awareness.

### Changed
- **Settings UI Overhaul**: Complete visual redesign of the Settings panel with a modern glassmorphic aesthetic, custom dropdowns, and improved layout for API keys and connectivity settings.
- **Control Hub UI Refinement**: Unified the bottom action bar color with the rest of the configuration panel and added a subtle light aesthetic divider for a cleaner, more premium look.
- **Custom Dropdowns**: Replaced standard HTML select elements in Settings with custom-built, high-fidelity dropdowns for a consistent premium experience.
- **Action Button Branding**: Renamed "Initialize Intelligence" to "Run AI" for a more direct and intuitive experience.
- **Function Selection UI**: Unified the function dropdown and description box into a connected card component. Removed the redundant brain icon and moved category tags to the right side for better scannability.
- **Compact Layout Optimization**: Significantly reduced vertical footprint by tightening section spacing, reducing the custom instructions textarea height, and compacting the action footer controls.
- **Visual Polish**: Removed the vertical divider line for a more open feel and ensured the panel collapse toggle remains always accessible.
- **Contextual Tooltips**: Added helpful tooltips to toggles like "Show Reasoning" (e.g., "For reasoning models") to guide users.

### Removed
- **Floating Indicators**: Removed the bouncing "Live Stream" indicator to reduce visual distraction during active streaming sessions.

## [1.2.3] - 2025-12-26

### Changed
- **Terminology Update**: Renamed "Compact Mode" to "Show Reasoning" for better clarity on AI behavior.
- **Intuitive Defaults**: Reasoning is now hidden by default, aligning with professional AI interaction standards.
- **Visual Consistency**: Synchronized the background colors of the Function Runner and configuration panels with the sidebar's slate-900 gradient for a seamless interface.
- **Optimized Layout**: Moved the Model Selector from the header to the bottom action bar, grouping all session-specific controls (Stream, Reasoning, Model) in one intuitive location.
- **Refined Controls**: Improved the toggle switch design with better sizing and alignment in the footer.

## [1.2.1] - 2025-12-26

### Added
- **Maritaca AI Support**: Integrated Maritaca AI as a dedicated provider in settings. Includes automatic base URL configuration, API key management, and dynamic fetching of Sabiá models.
- **Dedicated Maritaca Service**: Implemented a specialized service to handle Maritaca's API, ensuring compatibility with its unique endpoints and providing a smoother user experience.

## [1.2.0] - 2025-12-26

### Added
- **Searchable Function Dropdown**: Replaced the standard HTML select with a custom, searchable dropdown. Users can now type keywords to instantly filter through functions by name, category, or description.
- **System Prompt Inspection**: Added an "External Link" icon to function descriptions, allowing users to view the underlying system prompt for any AI function in a clean, scrollable modal.
- **Enhanced Categorization**: All 43 built-in functions are now organized into 7 distinct categories (e.g., "Career Development", "Personal Growth", "Business & Strategy") for better discoverability.
- **Metadata Support**: Implemented `metadata.json` for all functions to support custom names, descriptions, and categories.

### Changed
- **Default State**: Added a "Choose your function..." empty state to the AI Function selector to prevent accidental execution of the first item.
- **Improved Function Names**: Standardized capitalization and clarity across all built-in function names (e.g., fixed "CV", "PRD", "LOE" acronyms).
- **Consolidated Categories**: Combined "Career" and "Career & Personal Growth" into a single, comprehensive "Career Development" category.
- **Privacy & Terminology**: Removed all specific project terminology from system prompts for a more professional and generic experience.

### Fixed
- **Metadata Loading**: Resolved an issue where function names from `metadata.json` were being ignored in favor of title-cased folder names.
- **Category Filter Logic**: Fixed mapping of various career-related functions to ensure consistent categorization.

## [1.1.3] - 2025-11-02

### Fixed
- **Checkbox Styling**: Fixed checkbox appearance to display blue when checked instead of grey
  - Updated context source checkboxes in FunctionRunner to show blue background and border when selected
  - Fixed "Hide Thinking" checkbox to display blue when checked
  - Added custom CSS rules and `accent-color` styling for proper checkbox visual feedback
- **Panel Resizing**: Fixed resizing issue where AI response panel was pushing layout and preventing size adjustments
  - Added `flex-shrink-0` to left configuration panel and divider to prevent unwanted shrinking
  - Added `maxWidth` constraint to left panel to respect resizing limits
  - Changed right panel from `flex-grow` to `flex-1` for more predictable flex behavior
  - Ensured divider maintains fixed width during resizing operations
- **Style Tag Compatibility**: Fixed invalid `<style jsx>` usage in React/Vite components
  - Removed Next.js-specific `jsx` attribute from style tags in FunctionRunner.tsx, FunctionManager.tsx, and ContextManager.tsx
  - Replaced with standard `<style>` tags compatible with React/Vite architecture
  - Custom scrollbar and line-clamp styles now properly applied without errors

### Changed
- **UI Revamp**: Comprehensive visual redesign across all components for modern, polished appearance
  - Updated FunctionRunner with gradient backgrounds, glassmorphism effects, and refined spacing
  - Enhanced FunctionManager with improved card layouts and visual hierarchy
  - Redesigned ContextManager with modern styling and better visual feedback
  - Improved color schemes, shadows, and transitions throughout the application
  - Added custom scrollbars with gradient styling for better visual integration
- **Collapse/Expand Button**: Updated button text and icon rotation for better UX clarity
  - Changed button text to show directionally-appropriate labels ("Expand" when collapsed, "Collapse" when expanded)
  - Adjusted chevron icon rotation to match panel state and button direction
  - Improved visual consistency between button state and panel state

## [1.1.2] - 2025-08-06
### Fixed
- **Custom Provider Streaming**: Fixed streaming functionality for custom providers in Tauri desktop builds
  - Implemented proper Server-Sent Events parsing for chunked streaming responses
  - Added artificial delays between chunks for smooth streaming experience in desktop environment
  - Handles both `data: [JSON]` and `[DONE]` completion markers correctly
  - Maintains web compatibility with standard streaming implementation
- **Streaming Response Parsing**: Enhanced custom provider streaming with proper error handling and edge cases
  - Correctly parses incomplete JSON chunks and handles connection interruptions
  - Added robust filtering for empty lines and malformed data chunks

### Changed
- **Gemini API Key Configuration**: Replaced environment variable-only configuration with user-editable interface
  - Added editable Gemini API key input field in Settings UI (following OpenAI pattern)
  - Updated Gemini service to accept API key parameter with environment variable fallback
  - Added real-time connection verification with test API request for Gemini
  - Maintains backward compatibility with existing environment variable setup
- **API Key Management**: Standardized API key handling pattern across all providers (OpenAI, Gemini, Custom)
  - All providers now support user-editable API keys through consistent Settings UI
  - Enhanced connection verification with provider-specific validation

### Technical Notes
- Custom provider streaming now properly handles Server-Sent Events format in desktop builds
- Gemini service creates new GoogleGenAI instance per request to support dynamic API keys
- All AI providers maintain consistent interface patterns for better maintainability
- Desktop builds support full streaming functionality across all providers

## [1.1.1] - 2025-01-06
### Fixed
- **Ollama Desktop Integration**: Fixed critical issues preventing Ollama from working in the built desktop application
  - Added HTTP permissions to `tauri.conf.json` to allow network requests in sandboxed environment
  - Implemented Tauri-native HTTP client (`window.__TAURI__.http.fetch`) for desktop builds
  - Added proper response type handling (Text vs JSON) for different API endpoints
  - Fixed streaming functionality with simulated chunked responses for desktop environment
  - Maintained backward compatibility with web/development environments
- **Custom Provider Desktop Integration**: Fixed CORS issues preventing custom providers from working in desktop builds
  - Implemented Tauri-native HTTP client for all custom provider functions
  - Added support for custom API endpoints (including Maritaca AI, Anthropic Claude, etc.)
  - Resolved "Connection failed due to CORS policy" errors in desktop environment
  - Custom providers now work seamlessly in both web and desktop builds
- **Build System**: 
  - Fixed missing icon configuration that prevented successful builds
  - Added proper TypeScript exclusions for build artifacts in `tsconfig.json`
  - Updated `.gitignore` to exclude build artifacts from version control
- **Error Handling**: Improved error messages and added detailed logging for connection debugging
- **Thinking Tags**: Ensured proper removal of `<think>...</think>` tags in both streaming and non-streaming modes

### Technical Notes
- Desktop builds now use `ResponseType.Text` for Ollama root endpoint and `ResponseType.Json` for API endpoints
- Streaming responses work through response chunking with artificial delays for better UX
- All AI providers (Gemini, OpenAI, Ollama, Custom) now fully supported in desktop builds
- HTTP scope includes common custom provider endpoints for maximum compatibility

## [1.1.0]
### Added
- **Brand Logo**: Added a brand logo icon next to the application title in the sidebar.
- **Resizable Panels**: Implemented a resizable panel divider in the "Run AI" view for a more flexible layout on larger screens.

### Changed
- **UI Clarity**: The "Function Runner" view and components have been renamed to "Run AI" in the user interface for better clarity and intuition.
- **Scroll Behavior**: Improved main layout scrolling to ensure only content panels scroll, not the entire application window.

### Fixed
- **AI Response Scrolling**: Fixed a bug where the AI Response panel would not scroll after the main page scroll was disabled.

## [1.0.0]

This release marks the transition from a high-fidelity web prototype to a feature-complete, desktop-ready application.

### Added
- **Project Scaffolding**: Initial setup with React, TypeScript, and Tailwind CSS.
- **Core UI**: Main layout with a persistent sidebar and a dynamic content view.
- **Function Runner View**:
    - Select from a list of AI functions.
    - Select context sources to be included in the prompt.
    - A text area for additional user input.
    - A display area for the AI's Markdown-formatted response.
    - "Save Output" button to download the AI response as a `.md` file.
- **Context Manager View**:
    - Add context sources by specifying a path, remark, and type (file/folder).
    - "Include Subfolders" option for folder-type contexts.
    - List, remove, and inspect managed context sources.
- **Settings View**:
    - Initial support for Gemini models.
    - "Import/Export Profile" functionality to save and load user settings and context lists.
- **Function Manager View**:
    - Create, edit, and delete custom AI functions.
    - Custom functions are stored securely in `localStorage` for web or the user's app data directory for desktop.
- **Session Management**:
    - On startup, prompt the user to "Resume Last Session" or "Start New Session".
    - Session state (last used function, inputs, etc.) is saved automatically.
- **Multi-Provider AI Support**:
    - Added support for **Ollama**, allowing connection to local models. ✅ **Fully supported in desktop builds**.
    - **Maritaca AI**: Connect to the Sabiá family of models with a dedicated interface. ✅ **Fully supported in desktop builds**.
    - **OpenAI**: Use popular models like GPT-4o by providing your API key.
    - **Gemini**: Connect using your Gemini API key through the Settings interface. ✅ **Fully supported in desktop builds**.
    - **Custom Provider**: Connect to any OpenAI-compatible API endpoint (Anthropic Claude, etc.) by providing a Base URL and API Key. ✅ **Fully supported in desktop builds**.
- **Dynamic Model Fetching**:
    - The Settings view now dynamically fetches available models from the selected provider (Ollama, OpenAI, Custom) after successful connection verification.
- **Sample Content**:
    - Added built-in functions: `Find Blindspots` and `Daily Reflection Guide`.
    - Added sample context files: `journal-sample.md` and `yearreview-sample.md`.
- **Desktop Build Architecture**:
    - Added `package.json` to manage all project dependencies and build scripts.
    - Added `vite.config.ts` to configure the web asset bundler.
    - Added a complete Tauri project configuration under `src-tauri/`.
    - Added `services/desktopFileService.ts` to handle native file system operations using the Tauri API, replacing web-based simulations.
    - Added a "Building for Desktop" section to `README.md` with detailed instructions.

### Changed
- **Architecture**: The project has been refactored to be "desktop-aware". It can now be compiled into a standalone desktop application using Tauri.
- **File System**: The app now dynamically switches between a web-based mock file service and a native desktop file service, depending on the environment.
- **Context Selection UI**:
    - Replaced the flat list in the Function Runner with a hierarchical, collapsible tree view.
    - Added the ability to select/deselect an entire folder and its children with a single click.
- **Context Management UI**:
    - Replaced the flat list in the Context Manager with a hierarchical, collapsible tree view.
    - Clicking a file name now inspects it; clicking a folder toggles its collapse state.
- **Context Visibility**:
    - The "Inspect" icon in the Context Manager was repurposed into a "Show/Hide" toggle.
    - Hidden contexts are dimmed in the manager and do not appear in the Function Runner.
- **Settings UI**:
    - Split the "Save & Verify" button into a "Verify" button for each provider and a single "Save Settings" button that appears when changes are made.
    - Added clearer success, error, and loading feedback for connection verification.
- **Native Dialogs**: The "Browse...", "Import Profile", and "Export Profile" buttons now use Tauri's native system dialogs when running as a desktop app.
- **Dependencies**: Removed the `importmap` from `index.html` in favor of dependency management through `package.json` and Vite.
- **Icons**:
    - Replaced the "Inspect" icon in the Function Runner with a clearer "External Link" icon.
- **Error Handling**:
    - Improved error messages for custom provider connections to explain potential CORS issues in a browser environment.

### Fixed
- **Folder Deletion**: Fixed a recurring and critical bug where folders (especially empty or user-added ones) could not be deleted from the Context Manager. The removal logic was rewritten to be more robust.
- **UI Implementation**: Resolved multiple issues where UI changes (like collapsible trees or new icons) were described but not correctly implemented in the code.
- **Custom Provider**: Fixed the bug where the "Custom" provider option was not appearing in the dropdown menu in Settings.