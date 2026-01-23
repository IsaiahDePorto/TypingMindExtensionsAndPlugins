(function() {
    const STORAGE_KEY = 'tm_gemini_media_res';
    let currentRes = localStorage.getItem(STORAGE_KEY) || 'MEDIA_RESOLUTION_HIGH';

    console.log("[GeminiRes] Nuclear interceptor active.");

    // INTERCEPT JSON.STRINGIFY
    // This catches the data right as the browser prepares to send it.
    const originalStringify = JSON.stringify;
    JSON.stringify = function(value, replacer, space) {
        if (value && value.model && value.contents && (value.model.includes("gemini") || value.model.includes("google"))) {
            console.log("[GeminiRes] Caught Gemini payload in Stringify!");

            // Inject Resolution
            if (currentRes === 'MEDIA_RESOLUTION_ULTRA_HIGH') {
                value.contents.forEach(c => c.parts?.forEach(p => {
                    if (p.inline_data || p.file_data) p.media_resolution = { level: currentRes };
                }));
            } else {
                value.generation_config = value.generation_config || {};
                value.generation_config.media_resolution = currentRes;
            }
        }
        return originalStringify(value, replacer, space);
    };

    // UI Logic
    function injectUI() {
        const actionBar = document.querySelector('[data-element-id="chat-input-actions"]');
        if (!actionBar || document.getElementById('tm-gemini-res-container')) return;

        const container = document.createElement('div');
        container.id = 'tm-gemini-res-container';
        container.style.cssText = 'display:flex; align-items:center; margin-right:8px; font-size:11px; border:1px solid rgba(128,128,128,0.2); border-radius:4px; padding:2px 6px; background:rgba(128,128,128,0.05);';
        
        const select = document.createElement('select');
        select.style.cssText = 'background:transparent; border:none; outline:none; font-size:11px; cursor:pointer; color:inherit;';
        ['Low', 'Med', 'High', 'Ultra'].forEach(l => {
            const val = `MEDIA_RESOLUTION_${l.toUpperCase() === 'MED' ? 'MEDIUM' : (l.toUpperCase() === 'ULTRA' ? 'ULTRA_HIGH' : l.toUpperCase())}`;
            const opt = document.createElement('option');
            opt.value = val; opt.innerText = l;
            if (val === currentRes) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            currentRes = e.target.value;
            localStorage.setItem(STORAGE_KEY, currentRes);
            console.log("[GeminiRes] Set to: " + currentRes);
        };

        container.innerHTML = `<span style="margin-right:4px; opacity:0.7;">Res:</span>`;
        container.appendChild(select);
        actionBar.prepend(container);
    }

    setInterval(injectUI, 2000);
})();
