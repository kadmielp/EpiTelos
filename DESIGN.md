# EpiTelos design

EpiTelos is a focused workspace for running reusable AI functions against selected files and folders. Its interface favors the user's prompt, source selection, and response over decoration. The current visual direction is monochrome, dark, compact, and quiet.

## Design principles

- **Make the task obvious.** Each screen has a clear title and one primary job. Labels use direct language such as “Functions,” “Sources,” and “Run function.”
- **Keep attention on the work.** Neutral surfaces, restrained borders, and a single light active state provide hierarchy without colored glows or decorative gradients.
- **Show what is selected and what happens next.** Selection, disabled actions, loading states, empty states, and response status should remain legible.
- **Use the same patterns everywhere.** Headers, panels, form controls, cards, and dialogs should feel like one application.

## App structure

The app fills the viewport. A fixed icon rail on the left holds the brand and five destinations: Workspace, Functions, Sources, History, and Settings. The active destination uses a light filled background. Hover and keyboard focus reveal text tooltips; buttons also have accessible names. The content area scrolls within each view.

## Brand and iconography

The navigation rail uses the EpiTelos mark as its compact brand symbol. `public/logo-mark-white.svg` is the monochrome mark and the favicon; `public/logo-white.svg` is the full white wordmark for placements with enough horizontal space. The original `images/logo.png` remains a source asset. Keep the logo's proportions and clear space, and use the white variants on dark surfaces without tinting them.

Navigation and action icons use simple, consistent line shapes in shades of white. They inherit `currentColor` so hover, focus, active, and disabled states follow the text hierarchy. Icon-only controls need accessible names; rail labels appear on hover and keyboard focus.

The Workspace is the primary screen. Its header introduces a new session. Beneath it, a split layout puts **Setup** on the left and **Response** on the right. Setup contains the function picker, selectable source tree, user prompt, model picker, reasoning and streaming controls, and run or stop action. The setup panel can be collapsed to give the response more room. The response panel presents loading and empty states, formatted Markdown, optional reasoning, and copy/export actions.

The supporting views follow the same header and content rhythm:

| View | Main content |
| --- | --- |
| Functions | Custom functions first, then built-in functions; cards open the system prompt, and a dialog creates or edits custom functions. |
| Sources | Add a file or folder, configure nested-folder inclusion, and inspect, hide, refresh, or remove existing sources. |
| History | Search and select past runs; inspect their prompt, sources, and response, or restore a run to the Workspace. |
| Settings | Configure the AI provider or local GGUF model, preferred model, notifications, language, and profile import/export. |

## Visual system

The CSS variables in `index.css` are the palette source of truth:

| Token | Value | Use |
| --- | --- | --- |
| `--canvas` | `#151515` | App background |
| `--panel` | `#1d1d1d` | Main work surfaces |
| `--raised` | `#252525` | Elevated controls and fields |
| `--border` | `#353535` | Surface separation |
| `--text` | `#f3f3f3` | Primary content |
| `--secondary` | `#bdbdbd` | Supporting copy |
| `--muted` | `#999999` | Eyebrows and quieter metadata |

The interface uses Inter when available, then system sans-serif fonts. Page titles are about 25–32 px with compact tracking. Body and control copy is generally 12–13 px. Small uppercase eyebrows identify the section, while normal-case titles and descriptions carry the meaning. Code, paths, and system prompts use a monospace face where it helps distinguish literal content.

Panels use subtle one-pixel borders and roughly 14 px corners. Input fields use a slightly raised neutral fill and clearer borders. The active rail item is the strongest light-on-dark contrast. Disabled controls lose emphasis but remain visible. Focus-visible outlines are light and offset from the control. Markdown responses use the same monochrome palette for headings, code blocks, tables, links, and blockquotes. Mermaid output is displayed in grayscale.

Dialogs use a dark translucent backdrop, a bounded scrollable panel, a clear title, and a close action when dismissal is allowed. Escape and backdrop dismissal follow the dialog's `onClose` behavior.

## Responsive behavior

- Above 900 px, the Workspace uses side-by-side Setup and Response panels with the 68 px navigation rail.
- At 900 px and below, panel padding and gaps tighten.
- At 680 px and below, the rail narrows to 56 px, Workspace panels stack vertically, the divider control disappears, and History changes from a split pane to a stacked list and detail view. Page headers and dialogs also reduce their padding.
- Reduced-motion preferences suppress animations and smooth scrolling.

## Language and content

Interface copy is English by default, with Brazilian Portuguese available in Settings. UI strings pass through the catalog in `i18n.tsx`. Function definitions, user prompts, source content, and AI responses retain their original language. New UI labels should be short, literal, and added to the translation catalog when they are user-facing.

## Implementation map

- `App.tsx` owns the shell and view switching.
- `components/Sidebar.tsx` owns the icon rail and navigation states.
- `components/FunctionRunner.tsx`, `components/runner/ControlHub.tsx`, and `components/runner/ResponseTerminal.tsx` own the primary workspace.
- `components/FunctionManager.tsx`, `components/ContextManager.tsx`, `components/ArchiveManager.tsx`, and `components/Settings.tsx` own the supporting views.
- `components/Modal.tsx` owns the shared dialog shell.
- `index.css` defines the palette, shell, shared surface styles, response typography, and responsive rules. Components also use Tailwind utility classes for local layout and states.

When extending the UI, reuse these surfaces and tokens before adding another visual treatment. Keep interaction labels and empty states specific to the user's task.
