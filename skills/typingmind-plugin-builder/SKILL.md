---
name: typingmind-plugin-builder
description: Guides the end-to-end design, implementation, testing, and deployment of TypingMind Custom Plugins. Covers OpenAI Function Specs, JavaScript code sandboxing, HTTP Actions, OAuth 2.0 / API Auth integrations, resource permissions, post-processing engines, and advanced interactive custom output rendering.
license: MIT
compatibility: Web Browser Sandbox, Javascript (ES6+), TypingMind API
metadata:
  version: "1.0.0"
  author: "Expert Developer"
---

# TypingMind Custom Plugin Development Guide

This operational manual outlines the technical requirements, design patterns, and deployment procedures for creating high-performance Custom Plugins within the TypingMind ecosystem. 

---

## 1. Core Architectural Overview

TypingMind Plugins extend the capabilities of LLMs (such as OpenAI, Gemini, and Claude) using **OpenAI Function Calling API Specifications**. When a plugin is enabled, TypingMind registers its tool descriptors with the active model. The model decides when to trigger the plugin based on the query, returning a structured function-call argument payload that TypingMind executes client-side or server-side.

### Implementation Types
- **JavaScript Code:** Sandbox-executed (`<iframe sandbox="allow-scripts">`) client-side JavaScript. Ideal for local calculations, data parsing, or browser-based API calls.
- **HTTP Actions:** Direct web requests constructed and triggered from the user's browser, supporting complex headers, request bodies, and post-processing filters.
- **Model Context Protocol (MCP):** Dynamic connection to local or hosted MCP servers to expose real-time context and specialized tools.

---

## 2. Interface Configuration: User Settings

User Settings allow developers to define input fields required for plugin execution (such as API keys, base URLs, or custom preference toggles). These fields are configured as a JSON array of setting descriptors and are injected dynamically as variables into function environments.

### JSON Field Descriptor Schema
Each setting object supports the following configuration properties:

| Property | Type | Description | Required |
| :--- | :--- | :--- | :--- |
| `name` | String | Key identifier used to retrieve the variable programmatically. | Yes |
| `label` | String | User-facing input label displayed in the configuration UI. | Yes |
| `type` | String | Input widget type: `text`, `password`, `email`, `number`, or `enum`. (Defaults to `text`). | No |
| `required` | Boolean | Declares if the field must be populated to save the plugin. | No |
| `description` | String | Sub-label tooltips clarifying the field purpose or format constraints. | No |
| `placeholder` | String | Helper text displayed inside empty input boxes. | No |
| `values` | Array[Str] | Valid values array. **Only** applies when type is `enum`. | No |
| `defaultValue`| String | Fallback value if the field is left empty. | No |

### Config Blueprint: User Settings Array
```json
[
  {
    "name": "searchEngineID",
    "label": "Search Engine ID",
    "description": "Your custom Search Engine identifier",
    "required": true
  },
  {
    "name": "searchEngineAPIKey",
    "label": "Search Engine API Key",
    "type": "password",
    "required": true
  },
  {
    "name": "quality",
    "label": "Quality",
    "description": "Optional render quality",
    "type": "enum",
    "values": ["standard", "hd"],
    "defaultValue": "standard"
  }
]
```

---

## 3. Persistent Prompting: Plugin Context

Plugin Context allows injection of instructions or reference data directly into the LLM's **system prompt**. This context remains persistently active for the conversation when the plugin is enabled, even if the plugin has not been called yet.

### Key Use Cases
- Injecting indexes of large knowledge bases to help the AI evaluate when it should run a tool.
- Instructing the model on specific output formats or constraints related to the plugin.

### Context Sources
1. **Static text prompt:** A fixed template featuring variable interpolation (e.g., `{userSettingsVar}`). Supports standard UI variables like `{lastUserMessage}` and `{chatID}`.
2. **Read context from HTTP endpoint:** Direct, real-time live data fetched asynchronously and injected straight into the system prompt.

---

## 4. Authentication Integrations

TypingMind provides 3 native authentication methodologies:

### A. No Authentication
The plugin functions freely without any credential keys or token setups.

### B. API Key Configuration
Uses a combination of a `password`-type User Setting and dynamic variable mapping.
1. Declare a credential field in User Settings:
   ```json
   { "name": "firecrawl_api_key", "label": "API Key", "type": "password", "required": true }
   ```
2. Reference the credential in headers or environments via the matched variable: `{firecrawl_api_key}`.

### C. OAuth 2.0 Integration
Enables secure actions on behalf of a user's account. TypingMind handles the OAuth redirection flows natively.

#### Standard OAuth Properties Mapping
- **Authorization URL:** e.g., `https://accounts.google.com/o/oauth2/v2/auth`
- **Token URL:** e.g., `https://oauth2.googleapis.com/token`
- **Scopes:** Space/comma-separated strings of permissions required by the target provider.
- **Client Configuration:** Installed plugins will prompt administrative/end-users to enter their respective `Client ID` and `Client Secret` values.
- **Token Injection:** Developers reference the dynamic variable `{OAUTH_PLUGIN_ACCESS_TOKEN}` inside their logic as a proxy for the verified token.

#### Refresh Tokens for Persistent Access
To prevent sessions from expiring (typically inside 1 hour), configure parameters to obtain refresh tokens:
- **Access Type:** Set `access_type=offline` to explicitly request a refresh token.
- **Prompt:** Set `prompt=consent` (specifically for Google) to force refresh token generation during subsequent sign-ins.

#### Shared OAuth Connections (TypingMind for Team)
- **Centralization:** Allows admins to configure a single global OAuth connection, which multiple duplicated or custom plugins can reference via the **OAuth Configuration Source** dropdown. Users authenticate only once.

---

## 5. Permissions & Resource Access

JavaScript sandbox environments are secure, restricted contexts. To access chat-specific data, plugins must declare explicit permissions, which are passed in as the third execution argument: `resources`.

### Authorized Permissions Reference

#### 1. Read User Message & Attachments
- **Permission ID:** `read_user_message`
- **Variable Access:** `resources.userMessage`
- **Payload Structure:**
  ```json
  {
    "text": "User's exact input message content as a string",
    "attachments": [
      {
        "type": "image/png",
        "url": "https://data-url-or-hosted-link.webp",
        "name": "filename.png"
      }
    ]
  }
  ```

#### 2. Previous Run Output (No Permission Required)
- **Variable Access:** `resources.previousRunOutput`
- **Payload Structure:** Exactly matches the return value of this specific plugin's immediate previous execution in the current chat. Ideal for iterative tasks (e.g., editing an image or modifying generated code blocks).

---

## 6. Functional Implementation Specs

### OpenAI Function Spec (Universal Format)
Every plugin function (excluding raw MCP implementations) must start with a valid JSON function schema.

```json
{
  "name": "generate_random_number_in_range",
  "description": "Generates a random integer between a lower bound 'a' and an upper bound 'b'.",
  "parameters": {
    "type": "object",
    "properties": {
      "a": {
        "type": "number",
        "description": "The lower bound boundary (inclusive)"
      },
      "b": {
        "type": "number",
        "description": "The upper bound boundary (inclusive)"
      }
    },
    "required": ["a", "b"]
  }
}
```

---

## 7. Implementation Methods

### Method A: JavaScript Sandbox Execution
JavaScript code executes inside a browser `<iframe>` running with `sandbox="allow-scripts"`.

#### Critical Code Rules
1. **Name Matching:** You MUST define a top-level function matching the exact `name` field declared in the OpenAI Function Spec.
2. **Standard Parameters:** TypingMind executes your function with 3 explicit positional arguments:
   `functionName(params, userSettings, resources)`
3. **CORS Restrictions:** Since scripts run inside the local browser runtime, any outbound `fetch` request must be allowed by the destination server's CORS access control rules, or must be routed through a CORS-configured gateway proxy.
4. **Error Handling:** Gracefully propagate failures using the standard error constructor. TypingMind catches these errors and renders them safely in the chat UI:
   ```javascript
   throw new Error("Unable to retrieve records. Please verify API key.");
   ```

#### JavaScript Blueprint Boilerplate
```javascript
async function search_images_via_google(params, userSettings, resources) {
  // 1. Destructure function parameters from the LLM
  const { searchQuery, limit } = params;
  
  // 2. Load developer settings configurations
  const engineId = userSettings.searchEngineID;
  const apiKey = userSettings.searchEngineAPIKey;
  
  // 3. Extract requested assets if read_user_message permission is configured
  const userAttachments = resources?.userMessage?.attachments || [];
  
  if (!apiKey) {
    throw new Error("Google Search API Key has not been configured in Settings.");
  }
  
  try {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&cx=${engineId}&key=${apiKey}&num=${limit || 5}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP Search Error: Status Code ${response.status}`);
    }
    
    const data = await response.json();
    return JSON.stringify(data.items);
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}
```

---

### Method B: HTTP Actions (Direct Integrations)
Useful for integrating with external APIs without writing JavaScript logic.

#### Template Parameters Mapping
User settings and function arguments map directly inside the URL, Headers, or JSON Body using brace syntax: `{paramName}`.
- String variables are wrapped inside quotes: `"Bearer {apiKey}"` or `"{prompt}"`.
- Numeric values can be injected directly without wrapping quotes (e.g., `{height}`).

#### Built-in Server-Side Environment Variables
When configuring server-side HTTP plugins, the system exposes the following read-only context variables:
- `CHAT_ID`: Unique conversation ID.
- `USER_ID`: Unique user ID.
- `OAUTH_USER_ID_TOKEN`: The OpenID token of the verified user.
- `OAUTH_USER_ACCESS_TOKEN`: The access token of the verified user.
- `OAUTH_PLUGIN_ACCESS_TOKEN`: The dynamic access token of the authorized plugin provider.

#### Response Post-Processing Engines
Reduce the size of large HTTP payloads to save token costs using two post-processing engines:
1. **JMESPath Transform:** Filters large JSON payloads down to precise nested objects or arrays.
2. **Handlebars.js Template:** Remaps raw JSON structures into clear user-facing layouts, such as HTML blocks or Markdown formats. Access the request variables using the special `__VARIABLES` property:
   ```handlebars
   ![{{__VARIABLES.prompt}}](data:image/png;base64,{{artifacts.[0].base64}})
   ```

---

## 8. Advanced Output Options

Developers can customize the rendering destination for the results of each function:

### 1. Send Output directly to the AI (Default)
The raw output is returned straight to the model, which synthesizes a conversational response.

### 2. Render Output as Markdown
Skips model generation. The output is displayed directly to the user as compiled GitHub-Flavored Markdown. Useful for high-speed images, maps, or structured tables.

### 3. Render Output as Interactive HTML
Renders interactive applications, dashboards, or preview tools. The function must return an HTML string, which TypingMind renders within an isolated canvas.

### 4. Render Output as a TypingMind Card
Renders standardized cards. Currently supports the `image` grid schema. The function must return a valid, un-stringified JSON payload matching this exact format:

```json
[
  {
    "type": "image",
    "image": {
      "url": "https://example.com/rendered-image-file.webp"
    }
  }
]
```

---

## 9. Verification & Debugging Checklists

Ensure your Custom Plugin meets all requirements before exporting:
1. **Function Name Uniqueness:** Is the top-level JavaScript function name uniquely named across your entire TypingMind environment?
2. **JSON Schema Validity:** Validate the OpenAI Function Spec in a JSON formatter to prevent compilation issues.
3. **CORS Headers:** Ensure target servers accept requests from typingmind domains if executing local JavaScript-based HTTP calls, or route through an intermediate proxy.
4. **Error Handling Blocks:** Ensure all network requests or invalid configurations have clear try-catch bounds throwing standard `throw new Error()` messages.
```
