import { Log } from "../utils/log.js";

const html = (strings, ...values) => strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');

export default class VNTextBox extends HTMLElement {
    #charIntervalObserver = null;
    #dynamicCursorElement = null;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --left: 50%; 
                    --bottom: 5%;
                    --width: 90%;
                    --height: auto;
                    --max-height: 35%; 

                    --background: rgba(0, 0, 0, 0.75);
                    --border-radius: 0.5em;
                    --border: 2px solid rgba(255, 255, 255, 0.2);
                    --cursor-content: "▶"; 
                    --cursor-blink-speed: 0.7s;
                    --box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);

                    --content-color: #fff;
                    --content-font-size: 1.0em;
                    --content-font-family: "Helvetica", "Arial", sans-serif;
                    --content-font-weight: 400;
                    --content-text-align: left;
                    --content-padding: 1em;
                    --content-line-height: 1.6;
                    
                    --speaker-color: #fff;
                    --speaker-font-size: 1.3em;
                    --speaker-font-family: sans-serif;
                    --speaker-font-weight: 700;
                    --speaker-text-align: left;
                    --speaker-padding: 0.5em 1em;
                    --speaker-background: rgba(0, 0, 0, 0.3);
                    
                    display: flex; 
                    flex-flow: column nowrap;
                    position: absolute;
                    
                    left: var(--left, 0);
                    right: var(--right, auto);
                    top: var(--top, auto);  
                    bottom: var(--bottom, 0);
                    width: var(--width, auto);
                    height: var(--height, auto);
                    max-height: var(--max-height);

                    background: var(--background);
                    border-radius: var(--border-radius);
                    border: var(--border);
                    box-shadow: var(--box-shadow);
                    
                    max-width: 100%;
                    
                    margin: 0;
                    padding: 0;
                    
                    box-sizing: border-box;
                    overflow: hidden;

                    container-type: inline-size;
                    container-name: text-box-container;
                }

                :host([centered]) {
                    transform: translateX(-50%);
                }
                
                .header {
                    display: flex;
                    flex-flow: row nowrap;
                    justify-content: flex-start;
                    text-align: var(--speaker-text-align);
                    width: 100%;
                    flex-shrink: 0; 
                    padding: var(--speaker-padding);
                    background: var(--speaker-background);
                    box-sizing: border-box;
                }

                .speaker-name {
                    color: var(--speaker-color);
                    font-size: max(16px, var(--speaker-font-size, 3cqi));
                    font-family: var(--speaker-font-family);
                    font-weight: var(--speaker-font-weight);
                    text-wrap: break-word;
                    overflow-wrap: break-word;
                    user-select: none;
                }

                .content-wrapper {
                    display: flex; /* Keep flex for overall structure if needed */
                    width: 100%;
                    flex-grow: 1; 
                    padding: var(--content-padding);
                    background: var(--content-background); 
                    box-sizing: border-box;
                    overflow-y: auto; 
                    line-height: var(--content-line-height);
                    user-select: none;
                }

                #scroll-area {
                    flex-grow: 1;
                    color: var(--content-color);
                    font-size: max(16px, var(--content-font-size, 2.5cqi));
                    font-family: var(--content-font-family);
                    font-weight: var(--content-font-weight);
                    text-align: var(--content-text-align);
                }
               
                #scroll-area p, #scroll-area div {
                    margin-top: 0;
                    margin-bottom: 0.75em; 
                }
                #scroll-area p:last-child, #scroll-area div:last-child {
                    margin-bottom: 0;
                }
                #scroll-area strong, #scroll-area b { font-weight: bold; }
                #scroll-area em, #scroll-area i { font-style: italic; }
                #scroll-area a { color: var(--link-color, #87CEFA); text-decoration: underline; }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

                /* Styles for the dynamically inserted cursor */
                #scroll-area .dynamic-cursor {
                    display: inline; 
                    margin-left: 0.1em;
                    color: var(--content-color); 
                    font-size: calc(var(--content-font-size, 2.5cqi) * 0.8); 
                    font-weight: normal; 
                }
                #scroll-area .dynamic-cursor::after {
                    content: var(--cursor-content, "▶"); 
                    animation: blink var(--cursor-blink-speed, 0.7s) step-end infinite;
                }

                #scroll-area .dynamic-cursor::before {
                    content: " "; /* Space before cursor */
                }

                #scroll-area .dynamic-cursor:not([visible]) {
                    display: none !important; /* Ensure it's hidden */
                }

            </style>

            <div class="header" part="header">
                <span class="speaker" part="speaker-container">
                    <slot name="speaker">
                        <span class="speaker-name" part="speaker-name"></span>
                    </slot>
                </span>
            </div>
            <div class="content-wrapper" part="content-wrapper">
                <div id="scroll-area" part="scroll-area"></div>
                
            </div>
            <div style="display: none;">
                <slot id="source-slot"></slot> 
            </div>
        `;

        this.isScrolling = false;
        this.isComplete = false;
        this.skipRequested = false;
        this.#scrollTimeoutId = null;
        this.#currentRevealPromiseCtrl = null;

        this.ms = this.hasAttribute('ms') ? parseInt(this.getAttribute('ms'), 10) : 25;

        this.charIntervals = {
            '.': 250,
            ',': 120,
            '!': 250,
            '?': 250,
            
        };

        this.speakerNameElement = this.shadowRoot.querySelector(".speaker-name");
        this.scrollArea = this.shadowRoot.querySelector("#scroll-area");
        this.sourceSlot = this.shadowRoot.querySelector("#source-slot");
    }

    static get observedAttributes() {
        return [
            "speaker", "uid", "ms",
            "left", "right", "top", "bottom", "width", "height", "max-height",
            "cursor"
        ];
    }

    static get nonCssAttributes() {
        return ["uid", "speaker", "ms"];
    }

    get speaker() { return this.getAttribute("speaker"); }
    set speaker(value) { this.setAttribute("speaker", value); }
    get uid() { return this.getAttribute("uid"); }
    set uid(value) { this.setAttribute("uid", value); }


    get cursorChar() { return this.getAttribute("cursor"); }
    set cursorChar(value) { this.setAttribute("cursor", value); }


    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "ms") {
            this.ms = parseInt(newValue, 10) || 25;
        } else if (VNTextBox.nonCssAttributes.includes(name)) {
            if (name === "speaker") {
                this.#renderSpeaker(newValue);
            }
        } else if (name === "cursor") {
            this.style.setProperty('--cursor-content', newValue ? `"${newValue}"` : '""');
            if (this.#dynamicCursorElement) {
                 this.#dynamicCursorElement.style.setProperty('--cursor-content', newValue ? `"${newValue}"` : '""');
            }
        } else {
            this.style.setProperty(`--${name}`, newValue);
        }

        if (this.getAttribute("cursor") === null) {
             this.style.setProperty('--cursor-content', '""');
        } else if (this.getAttribute("cursor") === "") {
             this.style.setProperty('--cursor-content', '""');
        }
    }

    #boundHandleInteraction = null;
    #boundKeyHandler = null;

    #getCharFromAttrName(attrName) {
        if (attrName.length <= 3 || !attrName.startsWith("ms:")) return null;
        let char = attrName.substring(3);
        if (char === "_") return " ";
        return char;
    }

    #updateCharIntervalsFromAttribute(attrName, attrValue) {
        const char = this.#getCharFromAttrName(attrName);
        if (char) {
            const interval = parseInt(attrValue, 10);
            if (!isNaN(interval)) {
                this.charIntervals[char] = interval;
            } else {
                delete this.charIntervals[char];
            }
        }
    }
    
    #updateAllCharIntervalsFromAttributes() {
        for (let i = 0; i < this.attributes.length; i++) {
            const attr = this.attributes[i];
            this.#updateCharIntervalsFromAttribute(attr.name, attr.value);
        }
    }

    connectedCallback() {
        Log.color("lightgreen").italic`[${this.constructor.name}${this.uid ? ` (${this.uid})` : ''}] attached.`;

        this.#updateAllCharIntervalsFromAttributes();

        this.#charIntervalObserver = new MutationObserver(mutationsList => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName.startsWith("ms:")) {
                    this.#updateCharIntervalsFromAttribute(mutation.attributeName, this.getAttribute(mutation.attributeName));
                }
            }
        });
        this.#charIntervalObserver.observe(this, { attributes: true });


        VNTextBox.observedAttributes.forEach(attr => {
            if (this.hasAttribute(attr) && attr !== "ms") {
                this.attributeChangedCallback(attr, null, this.getAttribute(attr));
            }
        });
        if (!this.hasAttribute('cursor')) {
            this.style.setProperty('--cursor-content', 'var(--cursor-content, "▶")');
        }
        if (this.hasAttribute('ms')) {
            this.ms = parseInt(this.getAttribute('ms'), 10) || 25;
        }


        this.#boundHandleInteraction = this.#handleInteraction.bind(this);
        this.#boundKeyHandler = this.#handleKeyInteraction.bind(this);

        this.addEventListener('click', this.#boundHandleInteraction);
        this.addEventListener('keydown', this.#boundKeyHandler);
        
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        
        Promise.resolve().then(() => {
            this.display();
        });
    }

    disconnectedCallback() {
        Log.color("orange").italic`[${this.constructor.name}${this.uid ? ` (${this.uid})` : ''}] detached.`;
        this.removeEventListener('click', this.#boundHandleInteraction);
        this.removeEventListener('keydown', this.#boundKeyHandler);
        
        if (this.#scrollTimeoutId) clearTimeout(this.#scrollTimeoutId);
        if (this.#currentRevealPromiseCtrl && this.#currentRevealPromiseCtrl.stop) {
            this.#currentRevealPromiseCtrl.stop();
        }
        if (this.#charIntervalObserver) this.#charIntervalObserver.disconnect();
        this.#removeDynamicCursor();
    }

    #renderSpeaker(speakerText = "") {
        speakerText = speakerText.trim().replace(/\s+/g, ' ');
        speakerText = speakerText.replace(/[_]/g, ' ');
        if (this.speakerNameElement) {
            const speakerSlot = this.shadowRoot.querySelector('slot[name="speaker"]');
            if (speakerSlot && speakerSlot.assignedNodes().length > 0) {
                this.speakerNameElement.style.display = 'none'; 
            } else {
                this.speakerNameElement.style.display = '';
                this.speakerNameElement.textContent = speakerText || "";
            }
        }
    }
    
    #preprocessTextNode(textNode) {
        let text = textNode.textContent;
        text = text.replace(/---/g, '—');
        text = text.replace(/--/g, '–');
        return text;
    }

    #removeDynamicCursor() {
        if (this.#dynamicCursorElement && this.#dynamicCursorElement.parentNode) {
            this.#dynamicCursorElement.parentNode.removeChild(this.#dynamicCursorElement);
        }
        this.#dynamicCursorElement = null;
    }

    #appendDynamicCursor(targetParent) {
        this.#removeDynamicCursor();
        this.#dynamicCursorElement = document.createElement('span');
        this.#dynamicCursorElement.classList.add('dynamic-cursor');
        this.#dynamicCursorElement.setAttribute('part', 'cursor dynamic-cursor');
        const cursorChar = this.getAttribute('cursor');
        if (cursorChar !== null) {
             this.#dynamicCursorElement.style.setProperty('--cursor-content', cursorChar ? `"${cursorChar}"` : '""');
        }
       
        targetParent.appendChild(this.#dynamicCursorElement);
        return this.#dynamicCursorElement;
    }

    #setCursorVisibility(visible) {
        if (this.#dynamicCursorElement) {
            if (visible) {
                this.#dynamicCursorElement.setAttribute('visible', '');
            } else {
                this.#dynamicCursorElement.removeAttribute('visible');
            }
        }
    }
    
    #scrollTimeoutId = null;
    #currentRevealPromiseCtrl = null;

    async display(newContent = null, speaker = null) {
        if (this.isScrolling) {
            await this.skip(false);
        }

        this.isScrolling = false;
        this.isComplete = false;
        this.skipRequested = false;
        this.#removeDynamicCursor(); 
        if (this.#scrollTimeoutId) clearTimeout(this.#scrollTimeoutId);
        if (this.#currentRevealPromiseCtrl && this.#currentRevealPromiseCtrl.stop) {
            this.#currentRevealPromiseCtrl.stop();
            this.#currentRevealPromiseCtrl = null;
        }

        this.scrollArea.innerHTML = '';

        if (speaker !== null) {
            this.setAttribute("speaker", speaker);
        } else if (this.hasAttribute("speaker")) {
            this.#renderSpeaker(this.getAttribute("speaker"));
        } else {
            this.#renderSpeaker("");
        }

        if (newContent !== null) {
            if (typeof newContent === 'string') {
                while (this.firstChild) { 
                    this.removeChild(this.firstChild);
                }
                this.innerHTML = newContent;
            } else if (newContent instanceof Node) {
                while (this.firstChild) {
                    this.removeChild(this.firstChild);
                }
                this.appendChild(newContent);
            }
            await new Promise(resolve => {
                const onSlotChange = () => {
                    this.sourceSlot.removeEventListener('slotchange', onSlotChange);
                    resolve();
                };
                this.sourceSlot.addEventListener('slotchange', onSlotChange);
                if (this.sourceSlot.assignedNodes({flatten: true}).length > 0 || newContent === "" || (newContent instanceof Node && newContent.textContent === "")) {
                   resolve();
                   this.sourceSlot.removeEventListener('slotchange', onSlotChange);
                }
            });
        }
        
        const nodesToDisplay = this.sourceSlot.assignedNodes({ flatten: true });

        if (nodesToDisplay.length > 0) {
            this.isScrolling = true;
            
            const promiseControls = {};
            const stoppablePromise = new Promise((resolve) => {
                promiseControls.stop = () => {
                    this.skipRequested = true;
                    resolve();
                };
            });
            this.#currentRevealPromiseCtrl = promiseControls;

            try {
                await Promise.race([
                    this.#revealContent(nodesToDisplay, this.scrollArea),
                    stoppablePromise
                ]);
            } catch (e) {
                if (!this.skipRequested) console.error("Error during content reveal:", e);
            } finally {
                this.#currentRevealPromiseCtrl = null;
            }
            
            if (this.skipRequested) {
                this.scrollArea.innerHTML = '';
                function appendFullContent(nodes, parent, textPreprocessor) {
                    for (const node of nodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const processedText = textPreprocessor(node);
                            parent.appendChild(document.createTextNode(processedText));
                        } else {
                            const clonedNode = node.cloneNode(true);
                            parent.appendChild(clonedNode);
                        }
                    }
                }
                appendFullContent(nodesToDisplay, this.scrollArea, (textNode) => this.#preprocessTextNode(textNode));
            }

            this.isScrolling = false;
            this.isComplete = true;
            this.#appendDynamicCursor(this.scrollArea);
            this.#setCursorVisibility(true);

        } else {
            this.isScrolling = false;
            this.isComplete = true;
            this.#appendDynamicCursor(this.scrollArea);
            this.#setCursorVisibility(true);
        }
    }

    async #revealContent(sourceNodes, targetParent) {
        for (const sourceNode of sourceNodes) {
            if (this.skipRequested) {
                const unprocessedNode = sourceNode.cloneNode(true);
                 if (unprocessedNode.nodeType === Node.TEXT_NODE) {
                    unprocessedNode.textContent = this.#preprocessTextNode(unprocessedNode);
                }
                targetParent.appendChild(unprocessedNode);
                continue; 
            }

            if (sourceNode.nodeType === Node.ELEMENT_NODE) {
                const newElement = sourceNode.cloneNode(false);
                targetParent.appendChild(newElement);
                if (sourceNode.childNodes.length > 0) {
                    await this.#revealContent(Array.from(sourceNode.childNodes), newElement);
                    if (this.skipRequested) {
                    }
                }
            } else if (sourceNode.nodeType === Node.TEXT_NODE) {
                const processedText = this.#preprocessTextNode(sourceNode);
                const newTextNode = document.createTextNode('');
                targetParent.appendChild(newTextNode);

                for (const char of processedText) {
                    if (this.skipRequested) {
                        newTextNode.textContent += processedText.substring(newTextNode.textContent.length);
                        break; 
                    }
                    newTextNode.textContent += char;
                    
                    let delay = this.ms;
                    if (this.charIntervals[char] !== undefined) {
                        delay = this.charIntervals[char];
                    } else if (char.trim() === '') {
                        delay = 0;
                    }

                    if (delay > 0) {
                        await new Promise(r => this.#scrollTimeoutId = setTimeout(r, delay));
                    } else {
                        await new Promise(r => setTimeout(r, 0)); 
                    }
                }
            }
        }
    }

    async skip(dispatchEvent = true) {
        if (!this.isScrolling && this.isComplete) return;

        this.skipRequested = true;
        if (this.#scrollTimeoutId) {
            clearTimeout(this.#scrollTimeoutId);
            this.#scrollTimeoutId = null;
        }
        if (this.#currentRevealPromiseCtrl && this.#currentRevealPromiseCtrl.stop) {
            this.#currentRevealPromiseCtrl.stop();
        }

        await Promise.resolve(); 

        this.isScrolling = false;
        this.isComplete = true;

        if (dispatchEvent) {
            this.dispatchEvent(new CustomEvent('skip', { bubbles: true, composed: true }));
            Log.color("lightblue")`[${this.constructor.name}] event: skip`;
        }
    }

    proceed() {
        if (this.isComplete && !this.isScrolling) {
            this.dispatchEvent(new CustomEvent('proceed', { bubbles: true, composed: true }));
            Log.color("lightblue")`[${this.constructor.name}] event: proceed`;
            this.#setCursorVisibility(false);
        }
    }
    
    #handleInteraction(event) {
        if (this.isScrolling) {
            this.skip();
        } else if (this.isComplete) {
            this.proceed();
        }
    }

    #handleKeyInteraction(event) {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            this.#handleInteraction(event);
        }
    }
}

customElements.define("text-box", VNTextBox);