(function() {
    const STORAGE_KEY = 'tm_gemini_video_fps';
    let currentFps = localStorage.getItem(STORAGE_KEY) || '1';

    // THE INTERCEPTOR: Hooks into the outgoing API call
    const originalStringify = JSON.stringify;
    JSON.stringify = function(value, replacer, space) {
        try {
            // Only intercept if it's an AI request containing contents
            if (value && typeof value === 'object' && value.contents) {
                value.contents.forEach(content => {
                    if (content.parts) {
                        content.parts.forEach(part => {
                            // Check if the part is a video (either uploaded via File API or inline)
                            const isVideo = (part.file_data && part.file_data.mime_type.startsWith('video/')) || 
                                            (part.inline_data && part.inline_data.mime_type.startsWith('video/'));
                            
                            if (isVideo) {
                                // Inject the video_metadata into the part
                                // We use parseFloat to ensure it's sent as a number, not a string
                                part.video_metadata = { 
                                    fps: parseFloat(currentFps) 
                                };
                            }
                        });
                    }
                });
            }
        } catch (e) {
            // Silently fail to ensure no interference with non-AI requests
        }
        return originalStringify(value, replacer, space);
    };

    // UI INJECTION: Adds the selector to the chat input bar
    function injectUI() {
        const actionBar = document.querySelector('[data-element-id="chat-input-actions"]');
        if (!actionBar || document.getElementById('tm-gemini-fps-container')) return;

        const container = document.createElement('div');
        container.id = 'tm-gemini-fps-container';
        // Style to match TypingMind UI
        container.style.cssText = 'display:flex; align-items:center; margin-right:8px; font-size:11px; border:1px solid rgba(128,128,128,0.2); border-radius:4px; padding:2px 6px; background:rgba(128,128,128,0.05); opacity:0.8;';
        
        const select = document.createElement('select');
        select.style.cssText = 'background:transparent; border:none; outline:none; font-size:11px; cursor:pointer; color:inherit;';
        
        // Define common sampling rates
        const options = [
            {l: '0.1 FPS', v: '0.1'},
            {l: '0.5 FPS', v: '0.5'},
            {l: '1 FPS (Def)', v: '1'},
            {l: '2 FPS', v: '2'},
            {l: '5 FPS', v: '5'},
            {l: '10 FPS', v: '10'}
        ];

        options.forEach(optData => {
            const opt = document.createElement('option');
            opt.value = optData.v; 
            opt.innerText = optData.l;
            opt.style.background = "#222"; // Dark mode friendly
            if (optData.v === currentFps) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            currentFps = e.target.value;
            localStorage.setItem(STORAGE_KEY, currentFps);
        };

        container.innerHTML = `<span style="margin-right:4px; opacity:0.6;">FPS:</span>`;
        container.appendChild(select);
        
        // Prepend to the action bar so it's visible next to other media settings
        actionBar.prepend(container);
    }

    // Continuously check for the UI element (as TypingMind loads components dynamically)
    setInterval(injectUI, 2000);
})();
