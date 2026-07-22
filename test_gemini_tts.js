const fs = require('fs');

// Mock a basic DOM environment
class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.id = '';
        this.className = '';
        this.innerHTML = '';
        this.innerText = '';
        this.style = {};
        this.children = [];
        this.onclick = null;
        this.parentElement = null;
    }
    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
    }
    querySelector(selector) {
        return null;
    }
    querySelectorAll(selector) {
        return [];
    }
    after(element) {
        // mock after method
    }
    closest(selector) {
        return this;
    }
}

global.document = {
    documentElement: new MockElement('html'),
    body: null, // initially null to test the MutationObserver wait
    createElement: (tagName) => new MockElement(tagName),
    getElementById: (id) => null,
    querySelectorAll: (selector) => [],
};

global.window = {};

global.localStorage = {
    getItem: () => null,
    setItem: () => {},
};

global.prompt = () => 'test-key';
global.alert = () => {};

class MockMutationObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe(target, options) {}
    disconnect() {}
}

global.MutationObserver = MockMutationObserver;

// Load and execute the extension
const code = fs.readFileSync('GeminiTTSV10.js', 'utf8');

try {
    eval(code);
    console.log("Extension evaluated successfully.");

    // Simulate document.body becoming available
    setTimeout(() => {
        global.document.body = new MockElement('body');
        console.log("document.body is now available.");

        // At this point we can manually trigger the init logic if needed,
        // but let's just make sure the initial evaluation didn't throw when body was null

        // Wait a little to see if any debounce or timeouts throw
        setTimeout(() => {
            console.log("Test completed successfully without errors.");
        }, 500);
    }, 100);
} catch (error) {
    console.error("Error evaluating extension:", error);
    process.exit(1);
}
