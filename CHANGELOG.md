# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

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
    - Added support for **Ollama**, allowing connection to local models.
    - Added support for **OpenAI**, allowing use of models like GPT-4.
    - Added support for a **Custom Provider**, allowing connection to any OpenAI-compatible API endpoint.
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