/**
 * @file text-box.js
 * Implements the VNTextboxElement custom element.
 * Displays text and inline HTML, optionally with scrolling character by character
 * while preserving nested HTML structure, and handles user interaction for proceeding.
 * Can be defined in <vn-assets> and instantiated in <vn-scene>.
 */

export default class VNTextboxElement extends HTMLElement {
    #isScrolling = false;
    #isComplete = false;
    #canProceed = false;
    #scrollTimeoutId = null;
    #indicatorTimeoutId = null;
    #startDelayTimeoutId = null;
    #isSkipping = false;

    #processingStack = [];
    #currentTextNode = null;
    #currentCharIndex = 0;
    #currentTargetShadowTextNode = null;

    #contentElement = null;
    #titleElement = null;
    #indicatorElement = null;
    #textDisplayElement = null;
    #boundHandleInteraction = this.#handleInteraction.bind(this);
    #boundHandleKeydown = this.#handleKeydown.bind(this);

    #scrollMs = 50;
    #startDelayMs = 0;
    #endDelayMs = 100;

    #speed = {
        " ": 0,
        ".": 300,
        "?": 500,
        "!": 500,
        "~": 200,
        ",": 100,
        ";": 250,
        ":": 250,
        "—": 300,
        "–": 200,
        "-": 50,
    };

    #isDefinitionParsed = false;
    #isInstanceInitialized = false;

    static observedAttributes = [
        "uid",

        "top",
        "left",
        "bottom",
        "right",
        "width",
        "height",
        "color",
        "background",

        "ms",
        "start-delay",
        "end-delay",
        "scrolling",
        "unskippable",
        "title",
        "style",
    ];

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
        <style>

            @keyframes bump {
                0% { transform: scale(0.8); opacity: 0; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(1); }
            }

            :host {
                
                position: absolute;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                border: none;
                background-color: rgba(0, 0, 0, 0.7);
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
                border-radius: 5px;
                overflow: hidden;
                font-family: 'Helvetica', 'Arial', sans-serif;
                user-select: none;
                cursor: pointer;
                height: 25%; 
            }

            :host(.visible) {
                 animation: bump ease-in-out 0.25s forwards;
            }


            .title {
                background-color: rgba(25, 31, 44, 0.5);
                color: #fff;
                line-height: 1.6;
                padding: 12px 18px;
                font-weight: bold;
                border-bottom: 1px solid #444;
                min-height: 1em;
                flex-shrink: 0;
                font-size: 32px;
            }

            .title:empty {
                display: none;
            }

            .content {
                padding: 16px 24px;
                color: #fff; 
                line-height: 1.6;
                flex-grow: 1;
                overflow-y: auto;
                scrollbar-width: none;
                min-height: 1.5em;
                font-size: 32px; 
                font-weight: 400;
            }

            .content::-webkit-scrollbar {
                display: none;
            }

            .source-content-wrapper {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
            }
 
            .text-display {
                
            }
            .text-display wait { display: none; }
            .text-display b, .text-display strong { font-weight: bold; }
            .text-display i, .text-display em { font-style: italic; }
            .text-display p { margin: 0 0 0.5em 0; }



            .indicator {
                display: inline-block;
                margin-left: 0.5em;
                vertical-align: baseline;
                color: #fff; 
                animation: blink 1s step-end infinite;
            }

            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }

            .indicator:not(.visible) {
                display: none;
            }
        </style>
        <div class="title" part="title"><slot name="title"></slot></div>
        <div class="content" part="content">
            <span class="text-display" part="text-display"></span>
            <!-- NEW: Wrapper div specifically to hide the default slot -->
            <div class="source-content-wrapper">
                <slot></slot> <!-- Default slot IS NOW HIDDEN RELIABLY -->
            </div>
            <span class="indicator" part="indicator">▶</span>
        </div>
    `;

        this.#contentElement = this.shadowRoot.querySelector(".content");
        this.#titleElement = this.shadowRoot.querySelector(".title");
        this.#indicatorElement = this.shadowRoot.querySelector(".indicator");
        this.#textDisplayElement =
            this.shadowRoot.querySelector(".text-display");

        this.#updateInternalMsValues();
    }

    #updateInternalMsValues() {
        this.#scrollMs = this.#parseTime(this.getAttribute("ms")) ?? 50;
        this.#startDelayMs =
            this.#parseTime(this.getAttribute("start-delay")) ?? 0;
        this.#endDelayMs =
            this.#parseTime(this.getAttribute("end-delay")) ?? 100;
    }

    connectedCallback() {
        const isDefinition = this.closest("vn-assets") !== null;
        const id = this.getAttribute("uid") || "anonymous";

        if (isDefinition) {
            if (!this.#isDefinitionParsed) {
                this.#parseDefinition();
            }
        } else {
            this.classList.add("visible");

            if (!this.#isInstanceInitialized) {
                this.#initializeInstance();
            }

            this.#updateInternalMsValues();

            this.addEventListener("click", this.#boundHandleInteraction);

            window.addEventListener("keydown", this.#boundHandleKeydown);

            requestAnimationFrame(() => {
                this.#startDisplay();
            });
        }
    }

    disconnectedCallback() {
        const id = this.getAttribute("uid") || "anonymous";
        this.removeEventListener("click", this.#boundHandleInteraction);
        window.removeEventListener("keydown", this.#boundHandleKeydown);
        this.#clearTimeouts();
        this.#isDefinitionParsed = false;
        this.#isInstanceInitialized = false;
    }

    #upgradeProperty(prop) {
        if (this.hasOwnProperty(prop)) {
            let value = this[prop];
            delete this[prop];
            this[prop] = value;
        }
    }

    #parseDefinition() {
        const id = this.getAttribute("uid") || "anonymous_def";
        if (this.#isDefinitionParsed) return;
        this.#isDefinitionParsed = true;
    }

    #initializeInstance() {
        const id = this.getAttribute("uid") || "anonymous_inst";
        if (this.#isInstanceInitialized) return;

        let definition = null;
        const definitionUid = this.getAttribute("ref");
        const player = this.closest("visual-novel");

        if (definitionUid && player) {
            definition = player.getAssetDefinition(definitionUid);
            if (!definition || !(definition instanceof VNTextboxElement)) {
                console.warn( 
                    `[INST Textbox ${id}] Could not find valid textbox definition for uid "${definitionUid}".`
                );
                definition = null;
            } else {
                if (typeof definition.ensureParsed === "function") {
                    definition.ensureParsed();
                }
                if (!definition.isParsed?.()) {
                    console.warn(
                        `[INST Textbox ${id}] Definition "${definitionUid}" exists but reports not parsed. Initialization might be incomplete.`
                    );
                }
            }
        } else if (this.hasAttribute("uid") && player && !definitionUid) {
            const directDef = player.getAssetDefinition(
                this.getAttribute("uid")
            );
            if (directDef && directDef instanceof VNTextboxElement) {
                definition = directDef;
            }
        }

        if (definition) {
            VNTextboxElement.observedAttributes.forEach((attrName) => {
                if (attrName === "uid" || attrName === "ref") return;
                if (attrName === "title") return;

                if (
                    definition.hasAttribute(attrName) &&
                    !this.hasAttribute(attrName)
                ) {
                    const value = definition.getAttribute(attrName);
                    this.setAttribute(attrName, value);
                }
            });
            const definitionStyle = definition.getAttribute("style");
            if (definitionStyle) {
                const currentStyle = this.getAttribute("style") || "";
                this.setAttribute(
                    "style",
                    `${definitionStyle}; ${currentStyle}`
                );
            }
        } else {
        }

        this.#syncAllAttributes();

        this.#isInstanceInitialized = true;
    }

    /** Ensures the definition is parsed if this is a definition element. */
    ensureParsed() {
        if (this.closest("vn-assets") && !this.#isDefinitionParsed) {
            this.#parseDefinition();
        }
    }
    /** Checks if this is a parsed definition element. */
    isParsed() {
        return this.closest("vn-assets") !== null && this.#isDefinitionParsed;
    }

    #clearTimeouts() {
        clearTimeout(this.#scrollTimeoutId);
        clearTimeout(this.#indicatorTimeoutId);
        clearTimeout(this.#startDelayTimeoutId);
        this.#scrollTimeoutId = null;
        this.#indicatorTimeoutId = null;
        this.#startDelayTimeoutId = null;
    }

    #scrollToBottom() {
        requestAnimationFrame(() => {
            if (this.#contentElement) {
                const isNearBottom =
                    this.#contentElement.scrollHeight -
                        this.#contentElement.scrollTop <=
                    this.#contentElement.clientHeight + 30;
                if (!isNearBottom) {
                    this.#contentElement.scrollTop =
                        this.#contentElement.scrollHeight;
                }
            }
        });
    }

    #startDisplay() {
        if (!this.#isInstanceInitialized && !this.closest("vn-assets")) {
            console.warn(
                "VNTextbox: #startDisplay called before instance initialized. Initializing now."
            );
            this.#initializeInstance();
        }

        this.#clearTimeouts();
        this.#isScrolling = false;
        this.#isComplete = false;
        this.#canProceed = false;
        this.#isSkipping = false;
        this.#indicatorElement.classList.remove("visible");
        this.#textDisplayElement.innerHTML = "";

        const slot = this.shadowRoot.querySelector("slot:not([name])");
        const sourceNodes = slot
            ? slot
                  .assignedNodes({ flatten: true })
                  .filter(
                      (n) =>
                          n.nodeType === Node.ELEMENT_NODE ||
                          n.nodeType === Node.TEXT_NODE
                  )
            : [];

        this.#processingStack = [];
        this.#currentTextNode = null;
        this.#currentCharIndex = 0;
        this.#currentTargetShadowTextNode = null;

        const hasContent = sourceNodes.some(
            (node) =>
                (node.nodeType === Node.TEXT_NODE &&
                    node.textContent.trim().length > 0) ||
                (node.nodeType === Node.ELEMENT_NODE &&
                    node.tagName.toLowerCase() !== "wait")
        );

        if (!hasContent) {
            this.#isComplete = true;
            this.#finishScrolling();
            return;
        }

        if (sourceNodes.length > 0) {
            this.#processingStack.push({
                nodes: sourceNodes,
                index: 0,
                shadowParent: this.#textDisplayElement,
            });
        }

        this.#scrollToBottom();

        if (this.scrolling) {
            this.#isScrolling = true;
            if (this.#startDelayMs > 0) {
                this.#startDelayTimeoutId = setTimeout(() => {
                    this.#startDelayTimeoutId = null;
                    if (this.#isScrolling) this.#scrollLoop();
                }, this.#startDelayMs);
            } else {
                this.#scrollLoop();
            }
        } else {
            this.#showFullText();
        }
    }

    #scrollLoop() {
        if (!this.#isScrolling || this.#isSkipping) {
            if (this.#isSkipping) {
                this.#showFullText(true);
            }
            return;
        }

        if (this.#currentTextNode) {
            const text = this.#currentTextNode.textContent || "";
            if (this.#currentCharIndex < text.length) {
                const char = text[this.#currentCharIndex];
                this.#currentTargetShadowTextNode.nodeValue += char;
                this.#currentCharIndex++;

                const charDelay = this.#speed[char] ?? 0;
                const delay =
                    this.#scrollMs + charDelay > 0
                        ? this.#scrollMs + charDelay
                        : 1;

                this.#scrollToBottom();
                this.#scrollTimeoutId = setTimeout(
                    () => this.#scrollLoop(),
                    delay
                );
                return;
            } else {
                this.#currentTextNode = null;
                this.#currentTargetShadowTextNode = null;
                this.#currentCharIndex = 0;
            }
        }

        while (this.#processingStack.length > 0) {
            const currentState =
                this.#processingStack[this.#processingStack.length - 1];
            const { nodes, index, shadowParent } = currentState;

            if (index >= nodes.length) {
                this.#processingStack.pop();
                continue;
            }

            const currentNode = nodes[index];
            currentState.index++;

            if (currentNode.nodeType === Node.ELEMENT_NODE) {
                const tagName = currentNode.tagName.toLowerCase();

                if (tagName === "wait") {
                    const waitMs =
                        this.#parseTime(currentNode.getAttribute("ms")) ?? 500;
                    if (waitMs > 0) {
                        this.#scrollTimeoutId = setTimeout(
                            () => this.#scrollLoop(),
                            waitMs
                        );
                        return;
                    } else {
                        continue;
                    }
                }

                const clone = currentNode.cloneNode(false);
                shadowParent.appendChild(clone);

                if (currentNode.childNodes.length > 0) {
                    this.#processingStack.push({
                        nodes: currentNode.childNodes,
                        index: 0,
                        shadowParent: clone,
                    });
                }
                const elementDelay = this.#scrollMs > 0 ? this.#scrollMs : 1;
                this.#scrollToBottom();
                this.#scrollTimeoutId = setTimeout(
                    () => this.#scrollLoop(),
                    elementDelay
                );
                return;
            } else if (
                currentNode.nodeType === Node.TEXT_NODE &&
                currentNode.textContent.trim().length > 0
            ) {
                this.#currentTextNode = currentNode;
                this.#currentCharIndex = 0;
                this.#currentTargetShadowTextNode = document.createTextNode("");
                shadowParent.appendChild(this.#currentTargetShadowTextNode);

                this.#scrollTimeoutId = setTimeout(() => this.#scrollLoop(), 1);
                return;
            } else {
                continue;
            }
        }

        if (this.#processingStack.length === 0 && !this.#currentTextNode) {
            this.#finishScrolling();
        }
    }

    #finishScrolling() {
        this.#isScrolling = false;
        this.#isComplete = true;
        this.#isSkipping = false;
        this.#processingStack = [];
        this.#currentTextNode = null;
        this.#currentTargetShadowTextNode = null;
        this.#scrollToBottom();
        this.#showIndicator();
    }

    #showFullText(wasSkipped = false) {
        if (this.#isComplete) return;

        this.#clearTimeouts();
        this.#isScrolling = false;
        this.#isSkipping = false;
        this.#isComplete = true;

        this.#processingStack = [];
        this.#currentTextNode = null;
        this.#currentTargetShadowTextNode = null;

        this.#textDisplayElement.innerHTML = "";
        const slot = this.shadowRoot.querySelector("slot:not([name])");
        const sourceNodes = slot ? slot.assignedNodes({ flatten: true }) : [];

        const cloneNodesRecursively = (nodesToClone, shadowTargetParent) => {
            nodesToClone.forEach((node) => {
                if (
                    node.nodeType === Node.ELEMENT_NODE &&
                    node.tagName.toLowerCase() === "wait"
                ) {
                    return;
                }
                const deepClone = node.cloneNode(true);
                shadowTargetParent.appendChild(deepClone);
            });
        };

        cloneNodesRecursively(sourceNodes, this.#textDisplayElement);

        this.#scrollToBottom();
        this.#showIndicator(wasSkipped);
    }

    #showIndicator(wasSkipped = false) {
        if (wasSkipped && this.unskippable) {
            this.#isComplete = true;
            this.#canProceed = false;
            this.#indicatorElement.classList.add("visible");
            return;
        }

        clearTimeout(this.#indicatorTimeoutId);
        this.#indicatorTimeoutId = null;

        const delay = wasSkipped ? 0 : this.#endDelayMs;

        if (delay > 0) {
            this.#indicatorTimeoutId = setTimeout(() => {
                if (this.#isComplete) {
                    this.#canProceed = true;
                    this.#indicatorElement.classList.add("visible");
                }
                this.#indicatorTimeoutId = null;
            }, delay);
        } else {
            if (this.#isComplete) {
                this.#canProceed = true;
                this.#indicatorElement.classList.add("visible");
            }
        }
    }

    #skipScrolling() {
        if (this.#isScrolling && !this.unskippable && !this.#isSkipping) {
            this.#isSkipping = true;
            this.#clearTimeouts();

            const prevented = !this.dispatchEvent(
                new CustomEvent("skip", {
                    bubbles: true,
                    composed: true,
                    cancelable: true,
                })
            );

            if (!prevented) {
                requestAnimationFrame(() => {
                    this.#showFullText(true);
                });
            } else {
                this.#isSkipping = false;
            }
        } else if (this.unskippable) {
        }
    }

    #handleInteraction(event) {
        if (this.closest("vn-assets")) return;

        if (this.#isScrolling && !this.#isSkipping) {
            this.#skipScrolling();
        } else if (this.#canProceed) {
            const prevented = !this.dispatchEvent(
                new CustomEvent("proceed", {
                    bubbles: true,
                    composed: true,
                })
            );
        } else {
        }
    }

    #handleKeydown(event) {
        if (this.closest("vn-assets")) return;

        if (event.code === "Space" || event.code === "Enter") {
            event.preventDefault();
            this.#handleInteraction(event);
        }
    }

    #parseTime(timeStr) {
        if (timeStr === null || timeStr === undefined) return null;
        if (typeof timeStr === "number") return Math.max(0, timeStr);

        if (typeof timeStr === "string") {
            const trimmed = timeStr.trim();
            if (trimmed === "") return 0;

            if (/^\d+(\.\d+)?$/.test(trimmed)) {
                return Math.max(0, parseFloat(trimmed));
            }
            const match = trimmed.match(/^(\d+(\.\d+)?)\s*(ms|s)$/i);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[3].toLowerCase();
                if (unit === "s") {
                    return Math.max(0, value * 1000);
                } else {
                    return Math.max(0, value);
                }
            }
        }
        console.warn(
            `VNTextboxElement: Invalid time format "${timeStr}". Using default.`
        );
        return null;
    }

    #syncAttribute(name, value) {
        if (
            this.closest("vn-assets") &&
            !this.#isDefinitionParsed &&
            name !== "uid"
        )
            return;

        const useValue = value !== null ? value : "auto";

        switch (name) {
            case "top":
                this.style.top = useValue;
                break;
            case "left":
                this.style.left = useValue;
                break;
            case "bottom":
                this.style.bottom = useValue;
                break;
            case "right":
                this.style.right = useValue;
                break;
            case "width":
                this.style.width = useValue;
                break;
            case "height":
                this.style.height = useValue;
                break;

            case "color":
                if (this.#contentElement)
                    this.#contentElement.style.color = value ?? "";
                break;
            case "background":
                this.style.background = value ?? "";
                break;
            case "style":
                break;

            case "ms":
            case "start-delay":
            case "end-delay":
                this.#updateInternalMsValues();
                break;

            case "scrolling":
            case "unskippable":
                break;

            case "title":
                if (this.#titleElement) {
                    const slot =
                        this.#titleElement.querySelector('slot[name="title"]');
                    if (slot) {
                        slot.textContent = value ?? "";
                    } else {
                        this.#titleElement.textContent = value ?? "";
                    }
                    this.#updateTitleVisibility();
                }
                break;
            case "uid":
            case "ref":
                break;
            default:
                break;
        }
    }

    #syncAllAttributes() {
        VNTextboxElement.observedAttributes.forEach((attrName) => {
            if (this.hasAttribute(attrName)) {
                this.#syncAttribute(attrName, this.getAttribute(attrName));
            } else {
            }
        });
    }

    #updateTitleVisibility() {
        if (!this.#titleElement) return;
        requestAnimationFrame(() => {
            const slot = this.#titleElement.querySelector('slot[name="title"]');
            const assignedNodes = slot
                ? slot.assignedNodes({ flatten: true })
                : [];
            const hasSlottedContent = assignedNodes.some(
                (n) =>
                    n.nodeType === Node.ELEMENT_NODE ||
                    (n.nodeType === Node.TEXT_NODE &&
                        n.textContent.trim() !== "")
            );
            const hasAttributeContent =
                this.hasAttribute("title") &&
                this.getAttribute("title").trim() !== "";

            this.#titleElement.style.display =
                hasSlottedContent || hasAttributeContent ? "" : "none";
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this.isConnected || oldValue === newValue) return;

        if (this.closest("vn-assets")) {
        } else {
            this.#syncAttribute(name, newValue);

            if (name === "title") {
                this.#updateTitleVisibility();
            }
        }
    }

    get top() {
        return this.getAttribute("top");
    }
    set top(value) {
        this.setAttribute("top", value);
    }
    get left() {
        return this.getAttribute("left");
    }
    set left(value) {
        this.setAttribute("left", value);
    }
    get bottom() {
        return this.getAttribute("bottom");
    }
    set bottom(value) {
        this.setAttribute("bottom", value);
    }
    get right() {
        return this.getAttribute("right");
    }
    set right(value) {
        this.setAttribute("right", value);
    }
    get width() {
        return this.getAttribute("width");
    }
    set width(value) {
        this.setAttribute("width", value);
    }
    get height() {
        return this.getAttribute("height");
    }
    set height(value) {
        this.setAttribute("height", value);
    }
    get color() {
        return this.getAttribute("color");
    }
    set color(value) {
        this.setAttribute("color", value);
    }
    get background() {
        return this.getAttribute("background");
    }
    set background(value) {
        this.setAttribute("background", value);
    }
    get ms() {
        return this.getAttribute("ms");
    }
    set ms(value) {
        this.setAttribute("ms", String(value));
    }
    get scrolling() {
        return this.hasAttribute("scrolling");
    }
    set scrolling(value) {
        this.toggleAttribute("scrolling", !!value);
    }
    get unskippable() {
        return this.hasAttribute("unskippable");
    }
    set unskippable(value) {
        this.toggleAttribute("unskippable", !!value);
    }
    get title() {
        return this.getAttribute("title");
    }
    set title(value) {
        this.setAttribute("title", value);
    }
    get startDelay() {
        return this.getAttribute("start-delay");
    }
    set startDelay(value) {
        this.setAttribute("start-delay", String(value));
    }
    get endDelay() {
        return this.getAttribute("end-delay");
    }
    set endDelay(value) {
        this.setAttribute("end-delay", String(value));
    }
    get player() {
        return this.closest("visual-novel");
    }
    set player(value) {
        throw new Error("`player` (VNPlayerElement) is read-only.");
    }
    get scene() {
        return this.closest("vn-scene");
    }
    set scene(value) {
        throw new Error("`scene` (VNSceneElement) is read-only.");
    }

    getPlayer() {
        return this.player;
    }
    getScene() {
        return this.scene;
    }

    getTop() {
        return this.top;
    }
    getLeft() {
        return this.left;
    }
    getBottom() {
        return this.bottom;
    }
    getRight() {
        return this.right;
    }
    getWidth() {
        return this.width;
    }
    getHeight() {
        return this.height;
    }
    getColor() {
        return this.color;
    }
    getBackground() {
        return this.background;
    }
    getMs() {
        return this.ms;
    }
    isScrollingEnabled() {
        return this.scrolling;
    }
    isUnskippable() {
        return this.unskippable;
    }
    getTitle() {
        return this.title;
    }
    getStartDelay() {
        return this.startDelay;
    }
    getEndDelay() {
        return this.endDelay;
    }

    setTop(value) {
        this.top = value;
    }
    setLeft(value) {
        this.left = value;
    }
    setBottom(value) {
        this.bottom = value;
    }
    setRight(value) {
        this.right = value;
    }
    setWidth(value) {
        this.width = value;
    }
    setHeight(value) {
        this.height = value;
    }
    setColor(value) {
        this.color = value;
    }
    setBackground(value) {
        this.background = value;
    }
    setScrollingEnabled(value) {
        this.scrolling = value;
    }
    setUnskippable(value) {
        this.unskippable = value;
    }
    setTitle(value) {
        this.title = value;
    }
    setMs(value) {
        this.ms = value;
    }
    setStartDelay(value) {
        this.startDelay = value;
    }
    setEndDelay(value) {
        this.endDelay = value;
    }

    getScrollMilliseconds() {
        return this.#scrollMs;
    }
    getStartDelayMilliseconds() {
        return this.#startDelayMs;
    }
    getEndDelayMilliseconds() {
        return this.#endDelayMs;
    }

    /** Removes the textbox element from the DOM and cleans up timeouts. */
    destroy() {
        this.#clearTimeouts();
        this.remove();
        this.dispatchEvent(new CustomEvent("destroy", { bubbles: false }));
    }

    /** Manually triggers the proceed action (if possible). */
    proceed() {
        if (!this.closest("vn-assets")) {
            this.#handleInteraction(new Event("synthetic-proceed"));
        }
    }

    /** Restarts the text display process (clears existing text, handles scrolling/delays). */
    redisplay() {
        if (this.isConnected && !this.closest("vn-assets")) {
            this.#updateInternalMsValues();
            requestAnimationFrame(() => {
                this.#startDisplay();
            });
        } else {
            console.warn(
                "VNTextbox: redisplay() called on disconnected or definition element."
            );
        }
    }
}

customElements.define("text-box", VNTextboxElement);
