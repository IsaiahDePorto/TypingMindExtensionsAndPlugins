# TypingMindExtensions

Author:  
Gemini 3 Flash

# Gemini3MediaResolution.js

This extension allows users to manually set the media resolution parameter for Google's Gemini 3 series models directly within the TypingMind interface.

**How it works:**
The script operates by injecting a UI element (a dropdown menu) into the TypingMind chat input action bar. This dropdown allows the user to select from four resolution levels: Low, Medium, High, and Ultra High.

To apply these settings, the extension employs a technique where it intercepts the global `JSON.stringify` method. When TypingMind prepares to send a request to the AI model, the script checks if the object being serialized contains AI generation content. If it does, it dynamically modifies the request payload:
1.  **Global Configuration**: It injects the `media_resolution` parameter into the `generationConfig` (or `generation_config`) object for Low, Medium, and High settings.
2.  **Per-Part Configuration**: For the "Ultra High" setting (and as a fallback for others), it iterates through the content parts (images or files) and attaches the `media_resolution` directly to the specific part, which is required for Ultra High resolution according to Gemini documentation.

Installation link:
*https://cdn.jsdelivr.net/gh/IsaiahDePorto/TypingMindExtensions@refs/heads/main/Gemini3MediaResolution.js* in case TypingMind won’t take the raw link.

# GeminiVideoFPS.js

This extension enables users to control the frame rate (FPS) at which video content is processed by Gemini models in TypingMind.

**How it works:**
Similar to the media resolution extension, this script adds a dropdown UI to the chat input bar, offering FPS options ranging from 0.1 FPS to 10 FPS.

Technically, it also utilizes the `JSON.stringify` interception pattern. When a request is being formatted:
1.  The script scans the payload for content parts that appear to be video files (checking mime types in `file_data` or `inline_data`).
2.  If a video part is found, it injects a `video_metadata` object containing the user-selected `fps` value into that specific part.
This ensures that the Gemini model processes the video at the specified frame rate, which can be useful for managing token usage or ensuring high-fidelity analysis.

Installation link:  
*https://cdn.jsdelivr.net/gh/IsaiahDePorto/TypingMindExtensions@refs/heads/main/GeminiVideoFPS.js*

# GeolocationSandboxUnlock.js

This extension is a utility designed to fix permission issues with location-based plugins running within TypingMind's architecture.

**How it works:**
TypingMind runs plugins inside `iframe` elements for security and isolation. However, these iframes often lack the specific `allow="geolocation"` attribute by default, causing plugins that need your location to fail with permission errors.

This script solves this by running at the browser level to:
1.  **Override Creation**: It intercepts `document.createElement('iframe')` so that any new iframe created programmatically automatically gets the `allow="geolocation"` attribute.
2.  **Monitor DOM**: It uses a `MutationObserver` to watch the document body for any iframes added via other methods (like `innerHTML`). If it detects an iframe without the permission, it dynamically adds the `geolocation` permission to the `allow` attribute.

*Note: You will still need to grant location permissions to the TypingMind website in your browser settings and use a plugin that actually requests location data.*

Installation link:  
*https://cdn.jsdelivr.net/gh/IsaiahDePorto/TypingMindExtensions@refs/heads/main/GeolocationSandboxUnlock.js*
