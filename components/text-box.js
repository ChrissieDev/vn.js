import { Log } from "../utils/log.js";

const html = (strings, ...values) => strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');

export default class VNTextBox extends HTMLElement {
    #charIntervalObserver = null;
    #dynamicCursorElement = null;
    #isChoiceMode = false;
    #choicePromiseCtrl = null;


    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    /* Base positioning and sizing variables with defaults */
                    --left: auto;
                    --right: auto;
                    --top: auto;
                    --bottom: auto;
                    --width: auto;
                    --height: auto;

                    /* Default visual style variables */
                    --background: rgba(0, 0, 0, 0.75);
                    --border-radius: 0.5em;
                    --border: 2px solid rgba(255, 255, 255, 0.2);
                    --box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                    
                    --max-height: 90%; /* Default max height if height is auto */
                    --max-width: 90%;  /* Default max width if width is auto */
                    
                    /* Default Dialogue Box Appearance (if not fully constrained by top/bottom/left/right) */
                    --default-dialogue-width: 90%;
                    --default-dialogue-height: auto;
                    --default-dialogue-max-height: 35%;
                    --default-dialogue-bottom: 5%;
                    --default-dialogue-left: 50%; /* For centering with transform */

                    /* Cursor */
                    --cursor-content: "▶";
                    --cursor-blink-speed: 0.7s;

                    /* Content specific */
                    --content-color: #fff;
                    --content-font-size: 1.0em;
                    --content-font-family: "Helvetica", "Arial", sans-serif;
                    --content-font-weight: 400;
                    --content-text-align: left;
                    --content-padding: 1em;
                    --content-line-height: 1.6;
                    --fade-distance: var(--content-padding, 1em);

                    /* Speaker specific */
                    --speaker-color: #fff;
                    --speaker-font-size: 1.3em;
                    --speaker-font-family: sans-serif;
                    --speaker-font-weight: 700;
                    --speaker-text-align: left;
                    --speaker-padding: 0.5em 1em;
                    --speaker-background: rgba(0, 0, 0, 0.3);

                    /* Choice specific */
                    --choice-prompt-margin-bottom: 0.75em;
                    --choice-button-background: rgba(255, 255, 255, 0.1);
                    --choice-button-hover-background: rgba(255, 255, 255, 0.25);
                    --choice-button-color: #fff;
                    --choice-button-padding: 0.5em 1em;
                    --choice-button-margin: 0.25em 0;
                    --choice-button-border: 1px solid rgba(255, 255, 255, 0.3);
                    --choice-button-border-radius: 0.3em;
                    --choice-button-font-size: 0.95em;
                    --choice-button-font-family: var(--content-font-family);
                    --choice-button-text-align: center;
                    --choice-button-width: 100%;
                    --choice-inline-content-padding: 0.5em 0;
                    --choice-inline-content-text-align: var(--content-text-align);

                    display: flex;
                    flex-flow: column nowrap;
                    position: absolute;
                    box-sizing: border-box;
                    overflow: hidden;
                    
                    left: var(--left);
                    right: var(--right);
                    top: var(--top);
                    bottom: var(--bottom);
                    width: var(--width);
                    height: var(--height);
                    max-width: var(--max-width);
                    max-height: var(--max-height);

                    background: var(--background);
                    border-radius: var(--border-radius);
                    border: var(--border);
                    box-shadow: var(--box-shadow);

                    container-type: inline-size;
                    container-name: text-box-container;
                }

                /* Default state (like a dialogue box) if not enough constraints are given by positioning attributes */
                :host(:not([style*="left:"]):not([style*="right:"])[style*="width: auto"], /* If width is auto and L/R not set*/
                      :not([style*="left:"])[style*="width: auto"]:not([centeredY])) { /* Or L not set and width auto & not centered vertically */
                    left: var(--default-dialogue-left); /* Apply default left for dialogue */
                    transform: translateX(-50%); /* Center it if left is 50% */
                }
                 :host([style*="left: 50%"][style*="width: auto"]:not([style*="right:"])) { /* Explicitly left:50% width:auto */
                     transform: translateX(-50%);
                 }


                :host(:not([style*="width:"])) { /* If width attribute/var is not set at all */
                    width: var(--default-dialogue-width);
                }
                :host(:not([style*="height:"])) { /* If height attribute/var is not set at all */
                    height: var(--default-dialogue-height);
                }
                 :host(:not([style*="max-height:"])) { /* If max-height attribute/var is not set at all */
                    max-height: var(--default-dialogue-max-height);
                }

                :host(:not([style*="top:"])[style*="height: auto"], /* If height is auto and top not set */
                      :not([style*="bottom:"])[style*="height: auto"]) { /* Or bottom not set and height auto */
                    bottom: var(--default-dialogue-bottom); /* Apply default bottom for dialogue */
                }


                :host([centered]) {
                    left: 50%;
                    right: auto; /* Override if right was also set, centered takes precedence for left */
                    transform: translateX(-50%) translateY(var(--translateY, 0%));
                }
                :host([centeredY]) {
                    top: 50%;
                    bottom: auto; /* Override if bottom was also set */
                    /* transform: translateY(-50%) translateX(var(--translateX, 0%));
                        translateX is handled by :host([centered]) or direct style */
                    --translateY: -50%; /* Store Y translation for combined transform */
                    transform: translateX(var(--translateX, 0%)) translateY(-50%);

                }
                :host([centered][centeredY]) {
                     left: 50%; top: 50%;
                     right: auto; bottom: auto;
                     transform: translate(-50%, -50%);
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
                    z-index: 1;
                }
                :host(:not([speaker])) .header,
                :host([speaker=""]) .header {
                    display: none;
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
                    display: flex; /* Changed to flex */
                    flex-direction: column; /* Ensure children stack vertically */
                    width: 100%;
                    flex-grow: 1;
                    padding: var(--content-padding);
                    background: var(--content-background);
                    box-sizing: border-box;
                    overflow-y: auto;
                    line-height: var(--content-line-height);
                    user-select: none;
                    scroll-behavior: smooth;
                    mask-image: linear-gradient(to bottom,
                        transparent 0%,
                        black var(--fade-distance),
                        black calc(100% - var(--fade-distance)),
                        transparent 100%
                    );
                    -webkit-mask-image: linear-gradient(to bottom,
                        transparent 0%,
                        black var(--fade-distance),
                        black calc(100% - var(--fade-distance)),
                        transparent 100%
                    );
                }

                #scroll-area {
                    flex-grow: 1; /* Allows scroll-area to take available space */
                    color: var(--content-color);
                    font-size: max(16px, var(--content-font-size, 2.5cqi));
                    font-family: var(--content-font-family);
                    font-weight: var(--content-font-weight);
                    text-align: var(--content-text-align);
                    /* padding-bottom: var(--content-padding); Removed, content-wrapper has overall padding */
                    box-sizing: border-box;
                    overflow-wrap: break-word; 
                    word-break: break-word;  
                }

                #scroll-area p, #scroll-area div:not(.choices-container):not(.choice-prompt):not(.choice-inline-content) {
                    margin-top: 0;
                    margin-bottom: 0.75em;
                }
                #scroll-area p:last-child, #scroll-area div:not(.choices-container):not(.choice-prompt):not(.choice-inline-content):last-child {
                    margin-bottom: 0; /* No margin for the very last item, cursor handles spacing */
                }
                #scroll-area strong, #scroll-area b { font-weight: bold; }
                #scroll-area em, #scroll-area i { font-style: italic; }
                #scroll-area a { color: var(--link-color, #87CEFA); text-decoration: underline; }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

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
                #scroll-area .dynamic-cursor::before { content: " "; }
                #scroll-area .dynamic-cursor:not([visible]) { display: none !important; }

                .choice-prompt {
                    color: var(--content-color);
                    font-size: max(16px, var(--content-font-size, 2.5cqi)); 
                    font-family: var(--content-font-family);
                    font-weight: bold; 
                    text-align: var(--content-text-align);
                    margin-bottom: var(--choice-prompt-margin-bottom);
                    padding: 0; 
                    overflow-wrap: break-word;
                    word-break: break-word;
                }

                .choices-container {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch; 
                    width: 100%;
                    box-sizing: border-box;
                }

                .choice-button {
                    display: block; 
                    width: var(--choice-button-width);
                    margin: var(--choice-button-margin);
                    padding: var(--choice-button-padding);
                    background: var(--choice-button-background);
                    color: var(--choice-button-color);
                    border: var(--choice-button-border);
                    border-radius: var(--choice-button-border-radius);
                    font-family: var(--choice-button-font-family);
                    font-size: var(--choice-button-font-size);
                    text-align: var(--choice-button-text-align);
                    cursor: pointer;
                    transition: background-color 0.2s ease, border-color 0.2s ease;
                    box-sizing: border-box;
                    overflow-wrap: break-word; 
                    word-break: break-word;
                }

                .choice-button:hover, .choice-button:focus {
                    background: var(--choice-button-hover-background);
                    outline: none; 
                }
                
                .choice-inline-content {
                    padding: var(--choice-inline-content-padding);
                    text-align: var(--choice-inline-content-text-align);
                    font-size: max(16px, var(--content-font-size, 2.5cqi));
                    font-family: var(--content-font-family);
                    color: var(--content-color);
                    overflow-wrap: break-word;
                    word-break: break-word;
                }
                .choice-inline-content * { 
                    overflow-wrap: break-word;
                    word-break: break-word;
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
        this.contentWrapper = this.shadowRoot.querySelector(".content-wrapper");
        this.sourceSlot = this.shadowRoot.querySelector("#source-slot");
    }

    static get observedAttributes() {
        return [
            "speaker", "uid", "ms",
            "left", "right", "top", "bottom", "width", "height", 
            "max-width", "max-height", // Added max-width and max-height
            "centered", "centeredY", // Added centeredY
            "cursor", "content-padding"
        ];
    }

    static get nonCssAttributes() {
        return ["uid", "speaker", "ms", "centered", "centeredY"]; 
    }

    get speaker() { return this.getAttribute("speaker"); }
    set speaker(value) { 
        if (value === null || value === undefined) {
            this.removeAttribute("speaker");
        } else {
            this.setAttribute("speaker", value); 
        }
    }
    get uid() { return this.getAttribute("uid"); }
    set uid(value) { this.setAttribute("uid", value); }


    get cursorChar() { return this.getAttribute("cursor"); }
    set cursorChar(value) { this.setAttribute("cursor", value); value !== null ? this.setAttribute('cursor', value) : this.removeAttribute('cursor');}


    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "ms") {
            this.ms = parseInt(newValue, 10) || 25;
        } else if (name === "speaker") {
            this.#renderSpeaker(newValue);
        } else if (name === "centered" || name === "centeredY") {
            // CSS :host([attr]) selectors handle this automatically.
            // For combined transforms, we set CSS variables.
            if (name === "centeredY") {
                this.style.setProperty('--translateY', newValue !== null ? '-50%' : '0%');
            }
            if (name === "centered" && this.hasAttribute('centeredY')) { // ensure Y translate persists
                 this.style.setProperty('--translateX', newValue !== null ? '-50%' : '0%');
            } else if (name === "centered") {
                 this.style.setProperty('--translateX', newValue !== null ? '-50%' : '0%');
            }


        } else if (VNTextBox.nonCssAttributes.includes(name)) {
            // Other non-CSS attributes if any
        } else if (name === "cursor") {
            const cursorValue = newValue !== null ? (newValue === "" ? '""' : `"${newValue}"`) : 'var(--cursor-content, "▶")';
            this.style.setProperty('--cursor-content', cursorValue);
            if (this.#dynamicCursorElement) {
                 this.#dynamicCursorElement.style.setProperty('--cursor-content', cursorValue);
            }
        } else if (name === "content-padding") {
             this.style.setProperty(`--${name}`, newValue); // e.g. --content-padding
             this.style.setProperty('--fade-distance', newValue); // Link fade-distance
        }
        else { // CSS variable attributes (left, right, top, bottom, width, height, max-width, max-height)
            const cssVarName = `--${name}`;
            if (newValue === null) { // Attribute removed
                this.style.removeProperty(cssVarName);
            } else {
                this.style.setProperty(cssVarName, newValue);
            }
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
        Object.keys(this.charIntervals).forEach(key => {
            if (key.length > 1 || key === '_') delete this.charIntervals[key];
        });

        for (let i = 0; i < this.attributes.length; i++) {
            const attr = this.attributes[i];
            this.#updateCharIntervalsFromAttribute(attr.name, attr.value);
        }
    }

    connectedCallback() {
        Log.color("lightgreen").italic`[${this.constructor.name}${this.uid ? ` (${this.uid})` : ''}] attached.`;

        // Apply initial attribute values to CSS variables
        VNTextBox.observedAttributes.forEach(attr => {
            if (this.hasAttribute(attr)) {
                 this.attributeChangedCallback(attr, null, this.getAttribute(attr));
            } else if (attr === "cursor") { 
                 this.attributeChangedCallback(attr, null, null);
            }
        });
         // Ensure default fade distance if content-padding not set
        if (!this.hasAttribute('content-padding') && !this.style.getPropertyValue('--content-padding')) {
            this.style.setProperty('--fade-distance', '1em'); // fallback if var(--content-padding) is unset
        }


        this.#updateAllCharIntervalsFromAttributes(); // For ms:char attributes

        this.#charIntervalObserver = new MutationObserver(mutationsList => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName.startsWith("ms:")) {
                    this.#updateCharIntervalsFromAttribute(mutation.attributeName, this.getAttribute(mutation.attributeName));
                }
            }
        });
        this.#charIntervalObserver.observe(this, { attributes: true });


        this.#boundHandleInteraction = this.#handleInteraction.bind(this);
        this.#boundKeyHandler = this.#handleKeyInteraction.bind(this);

        this.addEventListener('click', this.#boundHandleInteraction, { capture: true });
        this.addEventListener('keydown', this.#boundKeyHandler);

        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
    }

    disconnectedCallback() {
        Log.color("orange").italic`[${this.constructor.name}${this.uid ? ` (${this.uid})` : ''}] detached.`;
        this.removeEventListener('click', this.#boundHandleInteraction, { capture: true });
        this.removeEventListener('keydown', this.#boundKeyHandler);

        if (this.#scrollTimeoutId) clearTimeout(this.#scrollTimeoutId);
        if (this.#charIntervalObserver) this.#charIntervalObserver.disconnect();
        this.#removeDynamicCursor();

        if (this.#isChoiceMode && this.#choicePromiseCtrl && this.#choicePromiseCtrl.reject) {
            this.#choicePromiseCtrl.reject(new Error("Text box detached during choice."));
            this.#cleanUpChoiceMode(false); // Don't try to restore speaker if detaching
        }
    }

    #renderSpeaker(speakerText) {
        const text = (typeof speakerText === 'string' ? speakerText : "").trim().replace(/\s+/g, ' ').replace(/[_]/g, ' ');
        
        if (this.speakerNameElement) {
            const speakerSlot = this.shadowRoot.querySelector('slot[name="speaker"]');
            const headerElement = this.shadowRoot.querySelector('.header');
            if (speakerSlot && speakerSlot.assignedNodes().length > 0) {
                this.speakerNameElement.style.display = 'none';
                if(headerElement) headerElement.style.display = '';
            } else {
                this.speakerNameElement.style.display = '';
                this.speakerNameElement.textContent = text;
                if(headerElement) headerElement.style.display = text ? '' : 'none';
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
         const cursorValue = cursorChar !== null ? (cursorChar === "" ? '""' : `"${cursorChar}"`) : 'var(--cursor-content, "▶")';
         this.#dynamicCursorElement.style.setProperty('--cursor-content', cursorValue);

        targetParent.appendChild(this.#dynamicCursorElement);
        this.#setCursorVisibility(true);
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
    #previousSpeakerForChoice = null; // Store speaker before choice mode

    async display(newContent = null, speaker = undefined) { 
        if (this.#isChoiceMode) {
            Log.warn(`[${this.constructor.name}] display() called while in choice mode. Aborting display.`);
            return;
        }
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

        if (speaker !== undefined) { 
            this.setAttribute("speaker", speaker === null ? "" : speaker);
        } else if (this.hasAttribute("speaker")) {
            this.#renderSpeaker(this.getAttribute("speaker"));
        } else { 
            this.#renderSpeaker(""); 
        }


        if (newContent !== null) {
            const assignedNodes = this.sourceSlot.assignedNodes({ flatten: true });
            assignedNodes.forEach(node => node.remove());
            while (this.firstChild) {
                if (this.firstChild === this.shadowRoot.host) break;
                this.removeChild(this.firstChild);
            }


            if (typeof newContent === 'string') {
                try {
                    const fragment = document.createRange().createContextualFragment(newContent);
                    this.append(fragment);
                } catch (e) { 
                    this.appendChild(document.createTextNode(newContent));
                }
            } else if (newContent instanceof Node) {
                 this.appendChild(newContent);
            }


            await new Promise(resolve => {
                const onSlotChange = () => {
                    this.sourceSlot.removeEventListener('slotchange', onSlotChange);
                    resolve();
                };
                this.sourceSlot.addEventListener('slotchange', onSlotChange);
                 if (this.sourceSlot.assignedNodes({flatten: true}).length > 0 ||
                     newContent === "" || newContent === null ||
                     (newContent instanceof Node && !newContent.textContent?.trim() && !(newContent instanceof DocumentFragment && newContent.childNodes.length > 0))) {
                    this.sourceSlot.removeEventListener('slotchange', onSlotChange); 
                    resolve();
                 }
            });
        } else {
             await new Promise(resolve => {
                 const onSlotChange = () => {
                     this.sourceSlot.removeEventListener('slotchange', onSlotChange);
                     resolve();
                 };
                 this.sourceSlot.addEventListener('slotchange', onSlotChange);
                  if (this.sourceSlot.assignedNodes({flatten: true}).length > 0) {
                     this.sourceSlot.removeEventListener('slotchange', onSlotChange);
                     resolve();
                 } else if (this.innerHTML.trim() === '') { 
                     this.sourceSlot.removeEventListener('slotchange', onSlotChange);
                     resolve();
                 }
             });
        }

        const nodesToDisplay = this.sourceSlot.assignedNodes({ flatten: true });

        if (nodesToDisplay.length > 0) {
            this.isScrolling = true;

            const promiseControls = {};
            const stoppablePromise = new Promise((resolveStop) => { 
                promiseControls.stop = () => {
                    this.skipRequested = true;
                    resolveStop(); 
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
                this.skipRequested = true; 
            } finally {
                this.#currentRevealPromiseCtrl = null;
            }

            if (this.skipRequested || (this.scrollArea.innerHTML === '' && nodesToDisplay.length > 0)) {
                this.scrollArea.innerHTML = ''; 
                function appendFullContent(nodes, parent, textPreprocessor) {
                    for (const node of nodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const processedText = textPreprocessor(node);
                            parent.appendChild(document.createTextNode(processedText));
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            const clonedNode = node.cloneNode(false); 
                             parent.appendChild(clonedNode);
                             if (node.childNodes.length > 0) {
                                 appendFullContent(Array.from(node.childNodes), clonedNode, textPreprocessor); 
                             }
                        } else {
                            const clonedNode = node.cloneNode(true);
                            parent.appendChild(clonedNode);
                        }
                    }
                }
                appendFullContent(nodesToDisplay, this.scrollArea, (textNode) => this.#preprocessTextNode(textNode));
            }

            this.contentWrapper.scrollTop = this.contentWrapper.scrollHeight;


            this.isScrolling = false;
            this.isComplete = true;
            this.#appendDynamicCursor(this.scrollArea);

        } else {
            this.isScrolling = false;
            this.isComplete = true;
            if (newContent !== null || this.innerHTML.trim() !== '' || this.sourceSlot.assignedNodes({flatten: true}).length > 0) {
                 this.#appendDynamicCursor(this.scrollArea);
            } else {
                this.#removeDynamicCursor(); 
            }
        }
    }

    async #revealContent(sourceNodes, targetParent) {
        for (const sourceNode of sourceNodes) {
            if (this.skipRequested) {
                return;
            }

            if (sourceNode.nodeType === Node.ELEMENT_NODE) {
                const newElement = sourceNode.cloneNode(false);
                targetParent.appendChild(newElement);

                 await new Promise(resolve => requestAnimationFrame(resolve));
                 if (this.contentWrapper.scrollHeight > this.contentWrapper.clientHeight) {
                     this.contentWrapper.scrollTop = this.contentWrapper.scrollHeight;
                 }

                if (sourceNode.childNodes.length > 0) {
                    await this.#revealContent(Array.from(sourceNode.childNodes), newElement);
                    if (this.skipRequested) return;
                }
            } else if (sourceNode.nodeType === Node.TEXT_NODE) {
                const processedText = this.#preprocessTextNode(sourceNode);
                const newTextNode = document.createTextNode('');
                targetParent.appendChild(newTextNode);

                for (const char of processedText) {
                    if (this.skipRequested) {
                        return;
                    }
                    newTextNode.textContent += char;

                     await new Promise(resolve => requestAnimationFrame(resolve));
                     if (this.contentWrapper.scrollHeight > this.contentWrapper.clientHeight) {
                         this.contentWrapper.scrollTop = this.contentWrapper.scrollHeight;
                     }

                    let delay = this.ms;
                    if (this.charIntervals[char] !== undefined) {
                        delay = this.charIntervals[char];
                    } else if (char.trim() === '') {
                        delay = 0; 
                    }


                    if (delay > 0) {
                        await new Promise(r => this.#scrollTimeoutId = setTimeout(r, delay));
                    } else {
                        await new Promise(r => requestAnimationFrame(r));
                    }
                }
            } else if (sourceNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                await this.#revealContent(Array.from(sourceNode.childNodes), targetParent);
                if (this.skipRequested) return;
            }

             if (this.skipRequested) return;
        }
    }

    async skip(dispatchEvent = true) {
        if (this.#isChoiceMode) {
            Log.info(`[${this.constructor.name}] Skip called in choice mode. No action.`);
            return;
        }
        if (!this.isScrolling && this.isComplete) return;

        this.skipRequested = true;

        if (this.#scrollTimeoutId) {
            clearTimeout(this.#scrollTimeoutId);
            this.#scrollTimeoutId = null;
        }

        if (this.#currentRevealPromiseCtrl && this.#currentRevealPromiseCtrl.stop) {
            this.#currentRevealPromiseCtrl.stop();
        }
        await new Promise(resolve => setTimeout(resolve, 0));


        if (dispatchEvent) {
            this.dispatchEvent(new CustomEvent('skip', { bubbles: true, composed: true }));
            Log.color("lightblue")`[${this.constructor.name}] event: skip`;
        }
    }

    proceed() {
        if (this.#isChoiceMode) {
            Log.info(`[${this.constructor.name}] Proceed called in choice mode. No action.`);
            return;
        }
        if (this.isComplete && !this.isScrolling) {
            this.dispatchEvent(new CustomEvent('proceed', { bubbles: true, composed: true }));
            Log.color("lightblue")`[${this.constructor.name}] event: proceed`;
            this.#setCursorVisibility(false);
        }
    }

    #handleInteraction(event) {
        if (event.target.closest('.choice-button')) {
            return;
        }
        if (event.target.closest('.choice-inline-content a, .choice-inline-content button, .choice-inline-content input')) {
            return;
        }


        if (this.#isChoiceMode) {
            return;
        }

        if (this.isScrolling) {
            this.skip();
        } else if (this.isComplete) {
            this.proceed();
        }
    }

    #handleKeyInteraction(event) {
        if (this.#isChoiceMode) {
            return;
        }
        if (event.key === ' ' || event.key === 'Enter') {
            if (event.target === this || !['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(event.target.tagName)) {
                event.preventDefault();
                this.#handleInteraction(event);
            }
        }
    }

    #cleanUpChoiceMode(restoreSpeaker = true) {
        this.scrollArea.innerHTML = ''; 
        this.#isChoiceMode = false;
        this.#choicePromiseCtrl = null;
        if (restoreSpeaker) {
            if (this.#previousSpeakerForChoice !== null) {
                this.setAttribute('speaker', this.#previousSpeakerForChoice);
            } else {
                this.removeAttribute('speaker');
            }
        }
        this.#previousSpeakerForChoice = null;
    }

    async promptChoices(promptText, items) {
        if (this.isScrolling) await this.skip(false);

        this.#previousSpeakerForChoice = this.hasAttribute('speaker') ? this.getAttribute('speaker') : null;

        return new Promise((resolve, reject) => {
            this.#isChoiceMode = true;
            this.#choicePromiseCtrl = { resolve, reject };

            this.isComplete = false;
            this.#removeDynamicCursor();
            this.setAttribute('speaker', ''); // Hide speaker area during choices


            this.scrollArea.innerHTML = '';

            if (promptText) {
                const promptElement = document.createElement('div');
                promptElement.classList.add('choice-prompt');
                promptElement.setAttribute('part', 'choice-prompt');
                try {
                    const fragment = document.createRange().createContextualFragment(promptText);
                    promptElement.appendChild(fragment);
                } catch (e) {
                    promptElement.textContent = promptText;
                }
                this.scrollArea.appendChild(promptElement);
            }

            const choicesContainer = document.createElement('div');
            choicesContainer.classList.add('choices-container');
            choicesContainer.setAttribute('part', 'choices-container');

            items.forEach(item => {
                if (item.type === 'option') {
                    const vnOption = item.data;
                    const button = document.createElement('button');
                    button.classList.add('choice-button');
                    button.setAttribute('part', 'choice-option choice-button'); 

                    const htmlContent = (() => {
                        if (typeof vnOption.string !== 'string') return null;
                        const trimmed = vnOption.string.trim();
                        if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
                            try {
                                const fragment = document.createRange().createContextualFragment(trimmed);
                                if (fragment.children.length > 0 || Array.from(fragment.childNodes).some(n => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== ''))) {
                                    return fragment;
                                }
                            } catch (e) { /* fall through to textContent */ }
                        }
                        return null;
                    })();

                    if (htmlContent) {
                        button.appendChild(htmlContent);
                    } else {
                        button.textContent = vnOption.string;
                    }

                    button.addEventListener('click', () => {
                        if (this.#choicePromiseCtrl) {
                            this.#choicePromiseCtrl.resolve(vnOption.innerQueue);
                        }
                        this.#cleanUpChoiceMode(); // This will restore speaker
                        // The command itself will remove the textbox element.
                    });
                    choicesContainer.appendChild(button);
                } else if (item.type === 'content') {
                    const contentElement = document.createElement('div');
                    contentElement.classList.add('choice-inline-content');
                    contentElement.setAttribute('part', 'choice-inline-content');
                    try {
                        contentElement.innerHTML = item.html; 
                    } catch (e) {
                        contentElement.textContent = item.html; 
                        Log.warn(`[VNTextBox] Could not parse inline choice content as HTML: ${item.html}`);
                    }
                    choicesContainer.appendChild(contentElement);
                }
            });

            this.scrollArea.appendChild(choicesContainer);
            this.contentWrapper.scrollTop = 0;
        });
    }
}

customElements.define("text-box", VNTextBox);