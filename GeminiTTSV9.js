(function () {
    const STORAGE_KEY = 'tm_extension_gemini_tts_key';
    const VOICE_NAME = 'Puck';
    const MODEL_NAME = 'models/gemini-2.5-flash';
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
            const key = prompt("Enter Gemini API Key:", localStorage.getItem(STORAGE_KEY) || "");
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

    // --- Audio Streaming State ---
    let audioCtx = null;
    let nextStartTime = 0;
    let ws = null;

    function cleanup(resetStatus = true) {
        if (ws) {
            ws.close();
            ws = null;
        }
        if (audioCtx) {
            audioCtx.close().catch(console.error);
            audioCtx = null;
        }
        if (resetStatus) {
            updateStatus('Ready');
        }
    }

    // Convert base64 to Float32Array
    function base64ToFloat32Array(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        // Data is Int16 PCM (little-endian)
        const int16View = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16View.length);
        for (let i = 0; i < int16View.length; i++) {
            float32Array[i] = int16View[i] / 32768.0;
        }
        return float32Array;
    }

    function scheduleAudioChunk(float32Array) {
        if (!audioCtx) return;
        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.copyToChannel(float32Array, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const currentTime = audioCtx.currentTime;
        // Schedule next segment. Add a tiny buffer (0.01) if we are falling behind to avoid clipping
        nextStartTime = Math.max(nextStartTime, currentTime + 0.01);

        source.start(nextStartTime);
        nextStartTime += audioBuffer.duration;
    }

    async function synthesizeSpeech(text) {
        const apiKey = localStorage.getItem(STORAGE_KEY);
        if (!apiKey) {
            alert("Please tap the 'Gemini TTS' bar at the top to set your API Key first!");
            return;
        }

        if (ws) {
            cleanup();
        }

        updateStatus('Connecting...', '#f39c12');

        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        nextStartTime = audioCtx.currentTime;

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        try {
            ws = new WebSocket(url);
        } catch (e) {
            updateStatus('Network Error', '#e74c3c');
            return;
        }

        ws.onopen = () => {
            updateStatus('Generating...', '#f39c12');
            ws.send(JSON.stringify({
                setup: {
                    model: MODEL_NAME,
                    systemInstruction: { parts: [{ text: "You are a text-to-speech engine. Your only job is to read the exact text provided by the user aloud, with no additions, conversational filler, or modifications." }] },
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: VOICE_NAME
                                }
                            }
                        }
                    }
                }
            }));
        };

        ws.onmessage = (event) => {
            let msg;
            try {
                // If it's a Blob, we'd need to convert it, but typically JSON is string
                msg = JSON.parse(event.data);
            } catch (e) {
                // Ignore parsing errors for unexpected formats, could be raw blob
                return;
            }

            if (msg.setupComplete) {
                updateStatus('Playing...', '#2ecc71');
                ws.send(JSON.stringify({
                    clientContent: {
                        turns: [{ role: "user", parts: [{ text: text }] }],
                        turnComplete: true
                    }
                }));
            } else if (msg.serverContent) {
                if (msg.serverContent.modelTurn && msg.serverContent.modelTurn.parts) {
                    msg.serverContent.modelTurn.parts.forEach(part => {
                        if (part.inlineData && part.inlineData.data) {
                            const float32Array = base64ToFloat32Array(part.inlineData.data);
                            scheduleAudioChunk(float32Array);
                        }
                    });
                }

                if (msg.serverContent.turnComplete) {
                    // Start a polling loop to check when the audio actually finishes playing
                    const checkInterval = setInterval(() => {
                        if (!audioCtx || audioCtx.currentTime >= nextStartTime) {
                            clearInterval(checkInterval);
                            cleanup();
                        }
                    }, 500);
                }
            } else if (msg.error) {
                 updateStatus('Error', '#e74c3c');
                 alert("API Error: " + msg.error.message);
                 cleanup(false);
            }
        };

        ws.onerror = (error) => {
            updateStatus('WebSocket Error', '#e74c3c');
            cleanup(false);
        };

        ws.onclose = () => {
            // we handle the visual reset in cleanup/turnComplete
        };
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
