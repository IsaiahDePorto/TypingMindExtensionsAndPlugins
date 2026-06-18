(function() {
    const STORAGE_KEY = 'tm_gemini_media_res';
    let currentRes = localStorage.getItem(STORAGE_KEY) || 'MEDIA_RESOLUTION_HIGH';

    // THE INTERCEPTOR
    const originalStringify = JSON.stringify;
    JSON.stringify = function(value, replacer, space) {
        try {
            // Only intercept if it's an AI request (contains 'contents')
            if (value && typeof value === 'object' && value.contents) {
                
                // 1. Handle Global Resolution (Low, Med, High)
                // We inject into both 'generationConfig' and 'generation_config' 
                // but only use ONE specific property name to avoid the 'oneof' error.
                if (currentRes !== 'MEDIA_RESOLUTION_ULTRA_HIGH') {
                    const configs = [value.generationConfig, value.generation_config];
                    configs.forEach(conf => {
                        if (conf) {
                            // Clean up any existing variant to prevent 'oneof' conflicts
                            delete conf.mediaResolution;
                            conf.media_resolution = currentRes;
                        }
                    });
                }

                // 2. Handle Per-Part Resolution (Required for Ultra High)
                // Google docs: ULTRA_HIGH is ONLY valid at the part level, not global.
                value.contents.forEach(content => {
                    if (content.parts) {
                        content.parts.forEach(part => {
                            if (part.inline_data || part.file_data) {
                                // If Ultra is selected, we must set it here.
                                // If Low/Med/High is selected, per-part isn't strictly needed 
                                // but we set it anyway to ensure override.
                                part.media_resolution = { level: currentRes };
                            }
                        });
                    }
                });
            }
        } catch (e) {
            // Ensure zero interference with non-AI requests
        }
        return originalStringify(value, replacer, space);
    };

    // UI INJECTION
    function injectUI() {
        if (document.getElementById('tm-gemini-res-container')) return;

        const actionBar = document.querySelector('[data-element-id="chat-input-actions"]');
        if (!actionBar) return;

        const container = document.createElement('div');
        container.id = 'tm-gemini-res-container';
        container.style.cssText = 'display:flex; align-items:center; margin-right:8px; font-size:11px; border:1px solid rgba(128,128,128,0.2); border-radius:4px; padding:2px 6px; background:rgba(128,128,128,0.05); opacity:0.8;';
        
        const select = document.createElement('select');
        select.style.cssText = 'background:transparent; border:none; outline:none; font-size:11px; cursor:pointer; color:inherit;';
        
        [
            {l:'Low', v:'MEDIA_RESOLUTION_LOW'},
            {l:'Med', v:'MEDIA_RESOLUTION_MEDIUM'},
            {l:'High', v:'MEDIA_RESOLUTION_HIGH'},
            {l:'Ultra', v:'MEDIA_RESOLUTION_ULTRA_HIGH'}
        ].forEach(optData => {
            const opt = document.createElement('option');
            opt.value = optData.v; opt.innerText = optData.l;
            opt.style.background = "#222"; 
            if (optData.v === currentRes) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            currentRes = e.target.value;
            localStorage.setItem(STORAGE_KEY, currentRes);
        };

        container.innerHTML = `<span style="margin-right:4px; opacity:0.6;">Res:</span>`;
        container.appendChild(select);
        actionBar.prepend(container);
    }

    injectUI();
    const observer = new MutationObserver(() => injectUI());
    observer.observe(document.body, { childList: true, subtree: true });
})();
