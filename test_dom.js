class MockElement {
    constructor(tagName, className = '') {
        this.tagName = tagName;
        this.className = className;
        this.children = [];
        this.parentElement = null;
        this.previousElementSibling = null;
        this.nextElementSibling = null;
        this.innerText = '';
        this.textContent = '';
        this.attributes = {};
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    appendChild(child) {
        if (this.children.length > 0) {
            let last = this.children[this.children.length - 1];
            last.nextElementSibling = child;
            child.previousElementSibling = last;
        }
        child.parentElement = this;
        this.children.push(child);
    }
    matches(selector) {
        if (selector.includes('[data-element-id="ai-message"]')) {
            return this.attributes['data-element-id'] === 'ai-message';
        }
        if (selector.includes('.prose')) {
            return this.className.includes('prose');
        }
        return false;
    }
    querySelector(selector) {
        if (this.matches(selector)) return this;
        for (let child of this.children) {
            let found = child.querySelector(selector);
            if (found) return found;
        }
        return null;
    }
    contains(element) {
        let curr = element;
        while (curr) {
            if (curr === this) return true;
            curr = curr.parentElement;
        }
        return false;
    }
    closest(selector) {
        let curr = this;
        while (curr) {
            if (curr.matches && curr.matches(selector)) return curr;
            curr = curr.parentElement;
        }
        return null;
    }
}

let root = new MockElement('div', 'root');
let chatMessage = new MockElement('div');
chatMessage.setAttribute('data-element-id', 'chat-message');

let aiMessage = new MockElement('div', 'prose');
aiMessage.setAttribute('data-element-id', 'ai-message');
aiMessage.innerText = "Hello world from AI!";
chatMessage.appendChild(aiMessage);

let actions = new MockElement('div', 'actions');
let copyBtn = new MockElement('button');
let ttsBtn = new MockElement('button');
actions.appendChild(copyBtn);
actions.appendChild(ttsBtn);

root.appendChild(chatMessage);
root.appendChild(actions);

global.document = { body: root };

function getMessageText(btn) {
    let aiMessage = null;
    let current = btn;
    let levels = 0;

    while (current && current !== document.body && levels < 6) {
        if (current.matches && current.matches('[data-element-id="ai-message"], .prose')) {
            aiMessage = current;
            break;
        }

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

        let found = current.querySelector && current.querySelector('[data-element-id="ai-message"], .prose');
        if (found && found !== btn && !found.contains(btn)) {
            aiMessage = found;
            break;
        }

        current = current.parentElement;
        levels++;
    }

    let target = aiMessage;
    if (!target) {
        let container = btn.closest('[data-element-id="chat-message"]') ||
                        btn.closest('.message-row') ||
                        btn.parentElement.parentElement;
        target = container.querySelector('[data-element-id="ai-message"]') ||
                 container.querySelector('.prose') ||
                 container;
    }

    let text = target.innerText || target.textContent || "";
    return text.trim();
}

console.log("Found text:", getMessageText(ttsBtn));
