# EpiTelos - Personal Development AI

![GitHub top language](https://img.shields.io/github/languages/top/kadmielp/EpiTelos) ![GitHub language count](https://img.shields.io/github/languages/count/kadmielp/EpiTelos) ![GitHub repo size](https://img.shields.io/github/repo-size/kadmielp/EpiTelos) ![GitHub last commit](https://img.shields.io/github/last-commit/kadmielp/EpiTelos)

EpiTelos is a high-fidelity prototype for an AI-augmented personal development application. Its purpose is to help users reach their highest potential by combining powerful AI models with deep, personal context from their own lives.

![EpiTelos](https://github.com/kadmielp/EpiTelos/blob/main/images/app.png)

This project is inspired by the concepts of [Fabric](https://github.com/danielmiessler/Fabric) and [Telos](https://github.com/danielmiessler/Telos).

## 🚀 What's New in Version 1.1.0
This version introduces several UI/UX enhancements to improve clarity and usability. Key updates include:
- **New Brand Logo**: A unique logo has been added to give the app a distinct identity.
- **Resizable Panels**: The main "Run AI" screen now features a resizable divider, offering a more flexible workspace.
- **UI Terminology**: Renamed "Function Runner" to the more intuitive "Run AI" across the app.

For a detailed list of all changes, please see the [Changelog](./CHANGELOG.md).

## 🧭 Core Pillars

| Pillar          | Description                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clarity         | AI reveals patterns, contradictions, and insights hidden in your own words.                                                                              |
| Self-Reflection | Journals and notes become tools of transformation, not just records.                                                                                     |
| Guided Growth   | Use AI functions to take action, adapt, and evolve.                                                                                                      |
| Purpose Alignment| Align daily actions with long-term goals and values.                                                                                                     |
| Privacy First   | EpiTelos uses Ollama for local AI by default, keeping your data on your machine. No files are uploaded unless you explicitly use a cloud-based API like OpenAI or Gemini. |

## Use Case

With EpiTelos, you can gain clarity and grow using your own life as context. For example, you might add a folder with your journal entries, your CV, or personal notes. These files stay on your computer and are not uploaded. You then choose a function like “Find Blindspots”. The app uses AI (Ollama by default) to read your selected files and give you insights based on the function you chose. You receive a thoughtful response that helps you better understand yourself and make more purposeful decisions.

## ✨ Core Features

### 1. Run AI
- **Execute AI Functions**: Run pre-defined or custom AI functions that provide specific analysis or guidance.
- **Resizable Layout**: Adjust the width of the configuration and response panels for a customized workspace on larger screens.
- **Dynamic Context**: Select which files and folders to provide as context for each run.
- **Hierarchical View**: Context sources are displayed in a collapsible tree view, making it easy to manage nested folders and select entire directories at once.
- **Save Output**: Save the AI's response as a timestamped Markdown file for future reference.

### 2. Context Manager
- **Manage Your Data**: Add, remove, and inspect the files and folders that the AI can use for context.
- **File System Browser**: Use a native file/folder picker to add context sources instead of typing paths manually.
- **Show/Hide Context**: Toggle the visibility of context sources to curate a clean list in the Function Runner without permanently deleting items.
- **Recursive Inclusion**: Choose to include all subfolders and their files when adding a folder as a context source.

### 3. Function Manager
- **Create Custom Prompts**: Design your own AI functions by defining a name and a detailed system prompt.
- **Edit & Delete**: Modify and manage your custom functions.
- **Secure Storage**: Custom functions are stored safely in your user application data directory.

### 4. Flexible Model Support
EpiTelos supports multiple AI model providers, giving you full control over cost, privacy, and capability.
- **Gemini**: Connects via an environment variable `API_KEY`.
- **Ollama**: Connect to your own local models for maximum privacy. The app can auto-discover your installed models.
- **OpenAI**: Use popular models like GPT-4o by providing your API key.
- **Custom Provider**: Connect to any OpenAI-compatible API endpoint by providing a Base URL and API Key.

### 5. Session & Profile Management
- **Session Persistence**: The app remembers your last session, prompting you to resume where you left off or start fresh.
- **Import/Export Profile**: Save your complete configuration (settings, context list) to a JSON file and import it on another machine or browser.

## 🛠️ Technology Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Desktop Framework**: Tauri
- **AI Integration**: Official and custom clients for Gemini, OpenAI, and Ollama APIs.

## 🧑‍💻 Development Guide

### Adding a New Built-in Function

The application's build process automatically discovers built-in functions. This makes adding new ones simple and removes the need to manually edit manifest files.

To add a new built-in function that will be packaged with the app:

1.  **Create the Function Directory**: Add a new folder inside `public/functions/`. The folder name will serve as the function's unique `id` and will be used to generate its display name. Use underscores for spaces (e.g., `my_new_function`).

2.  **Create the System Prompt**: Inside your new directory, create a single file named `system.md`. This Markdown file should contain the complete system prompt for the AI.

That's it! The next time you run `npm run dev` or `npm run build`, a script will automatically detect your new folder, generate the function's properties (`id`, `name`, `systemPrompt`), and include it in a `public/built-in-functions.json` file that the application uses at runtime.

- **Folder Name**: `my_new_function`
- **Generates ID**: `my_new_function`
- **Generates Name**: `My New Function`

## 🚀 Building for Desktop (`.exe`)

This project is configured to be built into a native desktop application using Tauri.

### Prerequisites
Before you begin, you need to set up the development environment. This is a one-time setup.

1.  **Node.js and npm**: Required for managing frontend dependencies and running scripts.
    - [Download and install Node.js here](https://nodejs.org/).

2.  **Rust and Cargo**: Tauri's backend is written in Rust.
    - [Follow the official instructions to install Rust](https://www.rust-lang.org/tools/install).
    - During the installation, ensure you also install the necessary system build tools when prompted (e.g., on Windows, this will be the "Microsoft C++ Build Tools").

3.  **Tauri CLI Prerequisites**: Follow the guide on the Tauri website for your specific operating system to ensure all other dependencies are installed.
    - [Tauri Prerequisites Guide](https://tauri.app/v1/guides/getting-started/prerequisites)

### Build Process
Follow these steps in your terminal to build the application:

1.  **Open your terminal** and navigate to the project's root directory (the one containing `package.json`).

2.  **Install dependencies**: This will read `package.json` and download all the necessary libraries (React, Tauri, etc.).
    ```sh
    npm install
    ```

3.  **Run in Development Mode (Optional)**: This starts the application in a local desktop window with hot-reloading, which is great for making changes.
    ```sh
    npm run tauri dev
    ```

4.  **Build the Executable**: This command bundles the frontend and backend into a final, standalone executable (`.exe` on Windows).
    ```sh
    npm run tauri build
    ```
    **Note:** While this command creates a distributable application, EpiTelos is currently a high-fidelity prototype and is **not considered production-ready**.

    After the build completes, you will find the installer for your application in the `src-tauri/target/release/` directory.