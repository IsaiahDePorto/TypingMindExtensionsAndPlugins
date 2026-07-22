/**
 * TypingMind Extension: Geolocation Sandbox Unlocker
 * This extension allows plugins to access the browser's Geolocation API
 * by injecting the necessary "allow" permissions into plugin iframes.
 */
(function() {
    const PERMISSION_STRING = "geolocation";

    // 1. Intercept iframe creation (The most robust method)
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
        const element = originalCreateElement.call(document, tagName, options);
        if (tagName.toLowerCase() === 'iframe') {
            element.setAttribute('allow', PERMISSION_STRING);
            // Also add for older browser support
            element.allow = PERMISSION_STRING; 
        }
        return element;
    };

    // 2. Watch for iframes added via innerHTML (The "Safety Net")
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // Element node
                    if (node.tagName === 'IFRAME') {
                        if (!node.getAttribute('allow')?.includes(PERMISSION_STRING)) {
                            const currentAllow = node.getAttribute('allow') || "";
                            node.setAttribute('allow', currentAllow ? `${currentAllow}; ${PERMISSION_STRING}` : PERMISSION_STRING);
                        }
                    } else if (node.hasChildNodes()) {
                        const iframes = node.getElementsByTagName('iframe');
                        for (const iframe of iframes) {
                            if (!iframe.getAttribute('allow')?.includes(PERMISSION_STRING)) {
                                const currentAllow = iframe.getAttribute('allow') || "";
                                iframe.setAttribute('allow', currentAllow ? `${currentAllow}; ${PERMISSION_STRING}` : PERMISSION_STRING);
                            }
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log("📍 Geolocation Sandbox Unlocker is active. Plugin boxes are now permitted to request location.");
})();
