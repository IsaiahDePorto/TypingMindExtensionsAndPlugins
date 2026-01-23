/**
 * TypingMind Extension: Gemini 3 Media Resolution (V2)
 * Intercepts Fetch & XHR, and handles Global + Per-part resolution.
 */

(function() {
    const STORAGE_KEY = 'tm_gemini_media_res';
    const RESOLUTIONS = [
        { label: 'Low', value: 'MEDIA_RESOLUTION_LOW' },
        { label: 'Med', value: 'MEDIA_RESOLUTION_MEDIUM' },
        { label: 'High', value: 'MEDIA_RESOLUTION_HIGH' },
        { label: 'Ultra', value: 'MEDIA_RESOLUTION_ULTRA_HIGH' }
    ];

    let currentRes = localStorage.getItem(STORAGE_KEY) || 'MEDIA_RESOLUTION_HIGH';

    // Helper to modify the JSON body
    function modifyBody(body) {
        // Broad check for Gemini models
        const isGemini = body.model && (body.model.includes("gemini") || body.model.includes("google"));
        if (!isGemini) return body;

        console.log(`[GeminiRes] Intercepted Gemini call. Applying: ${currentRes}`);

        // Handle ULTRA HIGH (Per-Part only)
        if (currentRes === 'MEDIA_RESOLUTION_ULTRA_HIGH') {
            if (body.contents) {
                body.contents.forEach(content => {
                    content.parts?.forEach(part => {
                        if (part.inline_data || part.file_data) {
                            part.media_resolution = { level: currentRes };
                            // Fallback quirk naming for some v1alpha versions
                            part.video_resolution = { level: currentRes }; 
                        }
                    });
                });
            }
        } else {
            // Handle Global (Low/Med/High)
            body.generation_config = body.generation_config || {};
            body.generation_config.media_resolution = currentRes;
            // Also add camelCase version just in case of strict JSON mapping
            body.generation_config.mediaResolution = currentRes;
        }
        return body;
    }

    // --- 1. Intercept Fetch ---
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        if (args[1] && args[1].body && typeof args[1].body === 'string') {
            try {
                const json = JSON.parse(args[1].body);
                const newJson = modifyBody(json);
                args[1].body = JSON.stringify(newJson);
            } catch (e) {}
        }
        return originalFetch(...args);
    };

    // --- 2. Intercept XHR (Likely what TypingMind uses) ---
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        if (typeof body === 'string' && body.includes('"contents"')) {
            try {
                const json = JSON.parse(body);
                const newJson = modifyBody(json);
                arguments[0] = JSON.stringify(newJson);
            } catch (e) {}
        }
        return originalSend.apply(this, arguments);
    };

    // --- 3. UI Logic ---
    function injectUI() {
        const actionBar = document.querySelector('[data-element-id="chat-input-actions"]');
        if (!actionBar || document.getElementById('tm-gemini-res-container')) return;

        const container = document.createElement('div');
        container.id = 'tm-gemini-res-container';
        container.style.cssText = 'display:flex; align-items:center; margin-right:8px; font-size:11px; border:1px solid rgba(128,128,128,0.2); border-radius:4px; padding:2px 6px; background:rgba(128,128,128,0.05);';

        const select = document.createElement('select');
        select.style.cssText = 'background:transparent; border:none; outline:none; font-size:11px; cursor:pointer; color:inherit;';
        
        RESOLUTIONS.forEach(res => {
            const opt = document.createElement('option');
            opt.value = res.value;
            opt.innerText = res.label;
            if (res.value === currentRes) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            currentRes = e.target.value;
            localStorage.setItem(STORAGE_KEY, currentRes);
            console.log(`[GeminiRes] Resolution changed to: ${currentRes}`);
        };

        container.innerHTML = `<span style="margin-right:4px; opacity:0.7;">Res:</span>`;
        container.appendChild(select);
        actionBar.prepend(container);
    }

    setInterval(injectUI, 2000);
})();
