(function () {
    const STORAGE_KEY = 'tm_extension_google_tts_key';
    const VOICE_NAME = 'en-US-Studio-O'; 
    let debugTag;
    
    // Create Clickable Status Bar
    function initUI() {
        if (document.getElementById('gemini-tts-status')) return;
        debugTag = document.createElement('div');
        debugTag.id = 'gemini-tts-status';
        debugTag.innerHTML = 'Gemini TTS: Tap to Set API Key';
        debugTag.style.cssText = 'position:fixed; top:0; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; font-size:11px; padding:4px 12px; z-index:9999; border-radius:0 0 10px 10px; font-family:sans-serif; cursor:pointer; font-weight:bold;';
        document.body.appendChild(debugTag);

        debugTag.onclick = () => {
            const key = prompt("Enter Google Cloud API Key:", localStorage.getItem(STORAGE_KEY) || "");
            if (key) {
                localStorage.setItem(STORAGE_KEY, key);
                updateStatus('Key Saved! Ready.', '#2ecc71');
            }
        };
    }

    function updateStatus(text, color = 'rgba(0,0,0,0.7)') {
        if (!debugTag) return;
        debugTag.innerHTML = 'Gemini TTS: ' + text;
        debugTag.style.background = color;
    }

    async function synthesizeSpeech(text) {
        const apiKey = localStorage.getItem(STORAGE_KEY);
        if (!apiKey) {
            alert("Please tap the 'Gemini TTS' bar at the top to set your API Key first!");
            return;
        }

        updateStatus('Generating...', '#f39c12');
        try {
            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input: { text: text },
                    voice: { languageCode: "en-US", name: VOICE_NAME },
                    audioConfig: { audioEncoding: "MP3" }
                })
            });
            const data = await response.json();
            if (data.audioContent) {
                updateStatus('Playing...', '#2ecc71');
                const audio = new Audio("data:audio/mp3;base64," + data.audioContent);
                audio.onended = () => updateStatus('Ready');
                audio.play();
            } else {
                updateStatus('Error', '#e74c3c');
                alert("API Error: " + (data.error ? data.error.message : "Check your key/quota."));
            }
        } catch (e) {
            updateStatus('Network Error', '#e74c3c');
        }
    }

    // NEW SMART SEARCH: Find the message text nearest to this button
    function getMessageText(btn) {
        let aiMessage = null;
        let current = btn;
        let levels = 0;

        // Traverse up the DOM, checking the current node and its siblings
        while (current && current !== document.body && levels < 6) {
            // Check current node
            if (current.matches && current.matches('[data-element-id="ai-message"], .prose')) {
                aiMessage = current;
                break;
            }

            // Check previous siblings and their children
            let sibling = current.previousElementSibling;
            while (sibling) {
                if (sibling.matches && sibling.matches('[data-element-id="ai-message"], .prose')) {
                    aiMessage = sibling;
                    break;
                }
                let found = sibling.querySelector && sibling.querySelector('[data-element-id="ai-message"], .prose');
                if (found) {
                    aiMessage = found;
                    break;
                }
                sibling = sibling.previousElementSibling;
            }
            if (aiMessage) break;

            // Check next siblings and their children
            sibling = current.nextElementSibling;
            while (sibling) {
                if (sibling.matches && sibling.matches('[data-element-id="ai-message"], .prose')) {
                    aiMessage = sibling;
                    break;
                }
                let found = sibling.querySelector && sibling.querySelector('[data-element-id="ai-message"], .prose');
                if (found) {
                    aiMessage = found;
                    break;
                }
                sibling = sibling.nextElementSibling;
            }
            if (aiMessage) break;

            // Check if the current node contains the target, but isn't the button itself
            let found = current.querySelector && current.querySelector('[data-element-id="ai-message"], .prose');
            if (found && found !== btn && !found.contains(btn)) {
                aiMessage = found;
                break;
            }

            current = current.parentElement;
            levels++;
        }

        // Fallback to old behavior if traversal fails
        let target = aiMessage;
        if (!target) {
            let container = btn.closest('[data-element-id="chat-message"]') ||
                            btn.closest('.message-row') ||
                            btn.parentElement.parentElement;

            target = container ? (container.querySelector('[data-element-id="ai-message"]') ||
                                 container.querySelector('.prose') ||
                                 container.querySelector('.message-content') ||
                                 container) : btn.parentElement;
        }

        let cleanText = (target.innerText || target.textContent || "")
            .replace(/Copy|Edit|Play|Regenerate|Pin|Delete|Fork|Show raw/g, '') // Strip common button text
            .replace(/\d{1,2}:\d{2}/g, '') // Strip timestamps
            .trim();

        return cleanText;
    }

    function inject() {
        // TypingMind uses different IDs for the copy button on mobile/desktop
        const copyBtns = document.querySelectorAll('[data-element-id="copy-message-button"], .btn-copy-message');
        
        copyBtns.forEach(copyBtn => {
            if (copyBtn.parentElement.querySelector('.gemini-tts-btn')) return;
            
            const btn = document.createElement('button');
            btn.className = 'gemini-tts-btn p-1 ml-1';
            // Simple speaker icon
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="white" stroke-width="2" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>`;
            
            btn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const text = getMessageText(btn);
                if (text && text.length > 0) {
                    synthesizeSpeech(text);
                } else {
                    updateStatus('Text not found', '#e74c3c');
                    alert("Could not extract message text. Try tapping the message first.");
                }
            };
            copyBtn.after(btn);
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedInject = debounce(inject, 200);

    function init() {
        initUI();
        debouncedInject();

        const observer = new MutationObserver((mutations) => {
            let shouldInject = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldInject = true;
                    break;
                }
            }
            if (shouldInject) {
                debouncedInject();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.body) {
        init();
    } else {
        const tempObserver = new MutationObserver(() => {
            if (document.body) {
                tempObserver.disconnect();
                init();
            }
        });
        tempObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
})();
