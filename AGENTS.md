# TypingMind Developer Instructions for Jules

This repository is dedicated to building and maintaining TypingMind Extensions and Plugins. Jules must use the following context to ensure code compatibility and architectural alignment.

## 1. Documentation & Research Links
- **Official Extension Docs:** https://docs.typingmind.com/typingmind-extensions
- **Plugin Dev Guide:** https://docs.typingmind.com/plugins/build-a-typingmind-plugin
- **Plugin JSON Schema:** https://docs.typingmind.com/plugins/typingmind-plugin-json-schema
- **Interactive Canvas Spec:** https://github.com/TypingMind/plugin-interactive-canvas/blob/main/plugin.json

## 2. Core Architectural Distinction
Jules must determine the task type before proposing a plan:

### A. TypingMind Extensions (Browser-Side JS)
- **Purpose:** UI/UX modifications, chat monitoring, or internal app logic.
- **Environment:** Runs directly in the browser. 
- **Key Patterns (See `Example extensions.txt`):**
    - **UI Injection:** Use `MutationObserver` to wait for DOM elements (e.g., `[role="menu"]` or `[data-element-id="workspace-bar"]`).
    - **Persistence:** Use `localStorage` for configuration settings.
    - **Data Access:** Access chat history via IndexedDB (Database: `keyval-store`, Store: `keyval`, Keys: `CHAT_ID`).
    - **API Hooking:** Override `window.fetch` to intercept or modify outgoing model requests/responses.

### B. TypingMind Plugins (Function Calling)
- **Purpose:** External tool access (Google Search, Python, CSV generation).
- **Format:** Requires a JSON manifest following the OpenAI Function Calling spec.
- **Implementation Types (See `Plugin JSON Examples.txt`):**
    - **HTTP Action:** Direct API calls (REST/GET/POST). Use `{variable}` syntax for user settings.
    - **JavaScript:** Custom logic running in a secure sandbox.
- **Output Types:** Must be one of `respond_to_ai`, `render_markdown`, or `render_html` (for Interactive Canvas).

## 3. Implementation Rules & Safety
- **UI Consistency:** When adding buttons to the workspace bar, use `data-element-id="workspace-tab-[name]"` and follow the Tailwind-like class patterns found in "Example 3" (Export All/Chat).
- **Interactive Canvas:** Always provide a `htmlSource` string. Ensure the HTML includes necessary CSS/JS within the string for self-contained rendering.
- **Libraries:** If an extension requires an external library (like JSZip), implement a `loadLibrary()` function that injects a `<script>` tag into `document.head`.

## 4. Grounding Examples
Jules should reference these specific files in the repository to understand the expected coding style:
- Refer to `Example extensions.txt` for: DOM manipulation, `MutationObserver` usage, and `window.fetch` interception.
- Refer to `Plugin JSON Examples (1).txt` for: Correct JSON manifest structure and `openaiSpec` definitions.

## 5. Research Instructions
Before generating a new plugin or extension, Jules should:
1. Use the internet to check the **TypingMind Changelog** or **Docs** for any new `data-element-id` or API changes.
2. Verify if the requested feature requires a **Plugin Server** (Node.js) or can be done entirely in the browser (Extension).
