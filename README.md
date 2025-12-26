# EpiTelos - Personal Development AI

![GitHub top language](https://img.shields.io/github/languages/top/kadmielp/EpiTelos) ![GitHub language count](https://img.shields.io/github/languages/count/kadmielp/EpiTelos) ![GitHub repo size](https://img.shields.io/github/repo-size/kadmielp/EpiTelos) ![GitHub last commit](https://img.shields.io/github/last-commit/kadmielp/EpiTelos)

EpiTelos is a high-fidelity prototype for an AI-augmented personal development application. Its purpose is to help users reach their highest potential by combining powerful AI models with deep, personal context from their own lives.

![EpiTelos](https://github.com/kadmielp/EpiTelos/blob/main/images/app.png)

This project is inspired by the concepts of [Fabric](https://github.com/danielmiessler/Fabric) and [Telos](https://github.com/danielmiessler/Telos).

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
- **Searchable AI Functions**: Quickly find the perfect function by typing keywords to filter by name, category, or description.
- **Categorized Discovery**: Functions are organized into logical groups like "Career Development", "Strategy", and "Personal Growth".
- **System Prompt Inspection**: Transparency by design—click the eye icon to inspect the underlying instructions for any function.
- **Resizable Layout**: Adjust the width of the configuration and response panels for a customized workspace on larger screens.
- **Dynamic Context**: Select which files and folders to provide as context for each run.
- **Hierarchical Tree Selection**: Context sources are displayed in a collapsible tree view, making it easy to manage nested directories.
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

### 4. Flexible Model Support & Intelligence Memory
EpiTelos supports multiple AI model providers, giving you full control over cost, privacy, and capability.
- **Provider-Specific Memory**: The system remembers your preferred model for each provider. Switching from OpenAI to Ollama (and back) automatically restores your last-used model for that source.
- **Dynamic Model Fetching**: Deeply integrated discovery of available models after successful connection verification.
- **Multi-Source Architecture**: Full support for Ollama, Maritaca AI, OpenAI, Gemini, and Custom OpenAI-compatible endpoints.
- **Environmental Parity**: All providers work seamlessly in both web and desktop environments.

### 5. Premium Configuration & Session Management
- **Redesigned Settings**: A modern, glassmorphic layout with custom dropdowns and real-time connectivity feedback.
- **State Awareness**: Visible "Unsaved Changes" and "Settings Synced" indicators in the configuration footer.
- **Session Persistence**: The app remembers your last session, prompting you to resume where you left off or start fresh.
- **Import/Export Profile**: Save your complete configuration (settings, context list) to a JSON file and import it on another machine or browser.

## 🛠️ Technology Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Desktop Framework**: Tauri
- **AI Integration**: Official and custom clients for Gemini, OpenAI, and Ollama APIs.

## 🧑‍💻 Development Guide

The application's build process automatically discovers built-in functions. This makes adding new ones simple and removes the need to manually edit manifest files.

To add a new built-in function:

1.  **Create the Function Directory**: Add a folder inside `public/functions/` (e.g., `my_new_function`).
2.  **Create the System Prompt**: Create `system.md` inside that directory with the AI instructions.
3.  **Add Metadata (Optional)**: Create `metadata.json` to define a pretty name, description, and category:
    ```json
    {
      "name": "My Pretty Name",
      "description": "Clear explanation of what this does.",
      "category": "My Category"
    }
    ```

That's it! The next time you run `npm run dev` or `npm run build`, the discovery script will automatically include it in the searchable manifest.

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

## ⚠️ Disclaimer

EpiTelos is provided "as is", without warranty of any kind, express or implied. In no event shall the authors be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software. Use this tool at your own risk.

