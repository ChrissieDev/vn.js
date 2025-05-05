/**
 * @file text-box.js
 * Implements the VNTextboxElement custom element.
 * Displays text and inline HTML, optionally with scrolling character by character
 * while preserving nested HTML structure, and handles user interaction for proceeding.
 * Converts triple hyphens (---) to em dashes (—) and double hyphens (--) to en dashes (–).
 * Can be defined in <vn-assets> and instantiated in <vn-scene>.
 */
export default class VNTextboxElement extends HTMLElement {
    
    // General properties
    #isScrolling = false;
    #isComplete = false;
    #canProceed = false;
    #scrollTimeoutId = null;
    #indicatorTimeoutId = null;
    #startDelayTimeoutId = null;
    #isSkipping = false;

    // Variables related to parsing nested HTML elements while maintaining the scrolling effect
    #processingStack = [];
    #currentTextNode = null;
    #currentCharIndex = 0;
    #currentTargetShadowTextNode = null;
    #currentTextNodeProcessedContent = null; // NEW: Store processed text for scrolling

    /**
     * Outer container for the text content.
     * @type {HTMLElement}
     */
    #contentElement = null;

    /**
     * The container holding the title text.
     * @type {HTMLElement}
     */
    #titleElement = null;

    /**
     * The animated '▶' (or styled otherwise) indicator element.
     * @type {HTMLElement}
     */
    #indicatorElement = null;
    
    /**
     * Container for the text display inside the content container. Scrollable if needed, and supports nested HTML.
     * @type {HTMLElement}
     */
    #textDisplayElement = null;
    
    #boundHandleInteraction = this.#handleInteraction.bind(this);
    #boundHandleKeydown = this.#handleKeydown.bind(this);

    /**
     * The interval at which text is scrolled inside #textDisplayElement.
     */
    #scrollMs = 25;
    #startDelayMs = 0;
    #endDelayMs = 100;

    /**
     * Dictionary of characters that have a different scrolling speed when displayed.
     * @todo make these customizable
     */
    #speed = {
        " ": 50,
        ".": 150,
        "?": 125,
        "!": 125,
        "~": 200,
        ",": 100,
        ";": 125,
        ":": 125,
        "—": 150, // Em dash (parsed from `---`)
        "–": 100, // En dash (parsed from `--`)
        "-": 50,  // Regular hyphen (keep original speed if desired)
    };

    // Variables related to differentiating between a definition inside <vn-assets> and an instance inside <vn-scene>
    #isDefinitionParsed = false;
    #isInstanceInitialized = false;

    static observedAttributes = [
        "uid", // reference or definition id
        
        // directly sets the inline style attribute of the element. must be valid css values for each attribute's css rule equivalent.
        "top",
        "left",
        "bottom",
        "right",
        "width",
        "height",
        "color",
        "background",

        // behavior related attributes
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
        // ... (rest of constructor CSS and element selection is unchanged) ...
        this.shadowRoot.innerHTML = `
        <style>

            @keyframes bump {
                0% { transform: scale(0.95); opacity: 0; }
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
        // ... (unchanged) ...
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
        // ... (unchanged) ...
        const id = this.getAttribute("uid") || "anonymous";
        this.removeEventListener("click", this.#boundHandleInteraction);
        window.removeEventListener("keydown", this.#boundHandleKeydown);
        this.#clearTimeouts();
        this.#isDefinitionParsed = false;
        this.#isInstanceInitialized = false;
    }

    #upgradeProperty(prop) {
        // ... (unchanged) ...
        if (this.hasOwnProperty(prop)) {
            let value = this[prop];
            delete this[prop];
            this[prop] = value;
        }
    }

    #parseDefinition() {
        // ... (unchanged) ...
        const id = this.getAttribute("uid") || "anonymous_def";
        if (this.#isDefinitionParsed) return;
        this.#isDefinitionParsed = true;
    }

    #initializeInstance() {
        // ... (unchanged) ...
        const id = this.getAttribute("uid") || "anonymous_inst";
        if (this.#isInstanceInitialized) return;

        let definition = null;
        const definitionUid = this.getAttribute("ref");
        const player = this.closest("vn-player");

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
        // ... (unchanged) ...
        if (this.closest("vn-assets") && !this.#isDefinitionParsed) {
            this.#parseDefinition();
        }
    }
    /** Checks if this is a parsed definition element. */
    isParsed() {
        // ... (unchanged) ...
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
        // ... (unchanged) ...
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

    // NEW: Helper function for text replacement
    #processTextHyphens(text) {
        if (!text) return "";
        // Replace triple hyphens first, then double hyphens
        return text.replace(/---/g, '—').replace(/--/g, '–');
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
        this.#textDisplayElement.innerHTML = ""; // Clear previous content

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
        this.#currentTextNodeProcessedContent = null; // Reset processed text

        const hasContent = sourceNodes.some(
            (node) =>
                (node.nodeType === Node.TEXT_NODE &&
                    node.textContent.trim().length > 0) ||
                (node.nodeType === Node.ELEMENT_NODE &&
                    node.tagName.toLowerCase() !== "wait")
        );

        if (!hasContent) {
            this.#isComplete = true;
            this.#finishScrolling(); // Go directly to finish state
            return;
        }

        // Initialize the processing stack with the top-level source nodes
        if (sourceNodes.length > 0) {
            this.#processingStack.push({
                nodes: sourceNodes,
                index: 0,
                shadowParent: this.#textDisplayElement,
            });
        }

        this.#scrollToBottom(); // Initial scroll

        if (this.scrolling) {
            this.#isScrolling = true;
            if (this.#startDelayMs > 0) {
                this.#startDelayTimeoutId = setTimeout(() => {
                    this.#startDelayTimeoutId = null;
                    if (this.#isScrolling) this.#scrollLoop(); // Start scrolling after delay
                }, this.#startDelayMs);
            } else {
                this.#scrollLoop(); // Start scrolling immediately
            }
        } else {
            this.#showFullText(); // Show all text at once if scrolling is disabled
        }
    }

    #scrollLoop() {
        if (!this.#isScrolling || this.#isSkipping) {
            if (this.#isSkipping) {
                this.#showFullText(true); // If skipping, jump to full text display
            }
            return; // Stop the loop if not scrolling or currently skipping
        }

        // Process the current text node character by character
        if (this.#currentTextNode) {
            // Use the pre-processed text content
            const text = this.#currentTextNodeProcessedContent || "";
            if (this.#currentCharIndex < text.length) {
                const char = text[this.#currentCharIndex];
                this.#currentTargetShadowTextNode.nodeValue += char; // Append char to shadow DOM
                this.#currentCharIndex++;

                const charDelay = this.#speed[char] ?? 0; // Get specific char delay
                const delay = Math.max(1, this.#scrollMs + charDelay); // Ensure minimum 1ms delay

                this.#scrollToBottom(); // Scroll if needed
                this.#scrollTimeoutId = setTimeout(() => this.#scrollLoop(), delay); // Schedule next char
                return; // Wait for timeout
            } else {
                // Finished with the current text node
                this.#currentTextNode = null;
                this.#currentTargetShadowTextNode = null;
                this.#currentTextNodeProcessedContent = null; // Clear processed content
                this.#currentCharIndex = 0;
                // Continue processing the stack immediately (no return here)
            }
        }

        // Find the next node to process from the stack
        while (this.#processingStack.length > 0) {
            const currentState = this.#processingStack[this.#processingStack.length - 1];
            const { nodes, index, shadowParent } = currentState;

            // If we've processed all nodes at this level, pop the stack state
            if (index >= nodes.length) {
                this.#processingStack.pop();
                continue; // Check the next level up
            }

            const currentNode = nodes[index];
            currentState.index++; // Move to the next node for the next iteration at this level

            if (currentNode.nodeType === Node.ELEMENT_NODE) {
                const tagName = currentNode.tagName.toLowerCase();

                if (tagName === "wait") {
                    // Handle <wait> tag for pauses
                    const waitMs = this.#parseTime(currentNode.getAttribute("ms")) ?? 500;
                    if (waitMs > 0) {
                        this.#scrollTimeoutId = setTimeout(() => this.#scrollLoop(), waitMs);
                        return; // Pause execution
                    } else {
                        continue; // Ignore wait with 0 or invalid ms
                    }
                }

                // Clone the element (shallow) and append to the shadow DOM
                const clone = currentNode.cloneNode(false);
                shadowParent.appendChild(clone);

                // If the element has children, push a new state onto the stack to process them
                if (currentNode.childNodes.length > 0) {
                    this.#processingStack.push({
                        nodes: currentNode.childNodes,
                        index: 0,
                        shadowParent: clone, // Children will be appended inside the clone
                    });
                }

                // Add a small delay after processing an element for pacing
                const elementDelay = Math.max(1, this.#scrollMs);
                this.#scrollToBottom();
                this.#scrollTimeoutId = setTimeout(() => this.#scrollLoop(), elementDelay);
                return; // Wait for timeout

            } else if (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent.trim().length > 0) {
                // Found a non-empty text node to process
                this.#currentTextNode = currentNode;
                this.#currentCharIndex = 0;

                // *** NEW: Process hyphens here ***
                this.#currentTextNodeProcessedContent = this.#processTextHyphens(currentNode.textContent);

                // Create an empty text node in the shadow DOM to append characters to
                this.#currentTargetShadowTextNode = document.createTextNode("");
                shadowParent.appendChild(this.#currentTargetShadowTextNode);

                // Immediately schedule the next loop iteration to start adding chars (minimal delay)
                this.#scrollTimeoutId = setTimeout(() => this.#scrollLoop(), 1);
                return; // Let the character-appending logic take over

            } else {
                // Skip empty text nodes or other node types (like comments)
                continue;
            }
        }

        // If the stack is empty and there's no current text node being processed, scrolling is finished
        if (this.#processingStack.length === 0 && !this.#currentTextNode) {
            this.#finishScrolling();
        }
    }


    #finishScrolling() {
        // ... (unchanged) ...
        this.#isScrolling = false;
        this.#isComplete = true;
        this.#isSkipping = false;
        this.#processingStack = [];
        this.#currentTextNode = null;
        this.#currentTargetShadowTextNode = null;
        this.#currentTextNodeProcessedContent = null; // Clear processed text state
        this.#scrollToBottom();
        this.#showIndicator();
    }

    #showFullText(wasSkipped = false) {
        if (this.#isComplete) return; // Already done

        this.#clearTimeouts(); // Stop any ongoing scrolling/delays
        this.#isScrolling = false;
        this.#isSkipping = false; // Reset skipping flag
        this.#isComplete = true;

        // Clear internal processing state
        this.#processingStack = [];
        this.#currentTextNode = null;
        this.#currentTargetShadowTextNode = null;
        this.#currentTextNodeProcessedContent = null;

        this.#textDisplayElement.innerHTML = ""; // Clear potentially partially scrolled text
        const slot = this.shadowRoot.querySelector("slot:not([name])");
        const sourceNodes = slot ? slot.assignedNodes({ flatten: true }) : [];

        // *** NEW: Recursive function to clone nodes and process text ***
        const cloneNodesRecursively = (nodesToClone, shadowTargetParent) => {
            nodesToClone.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'wait') {
                    return; // Skip <wait> elements entirely when showing full text
                }

                if (node.nodeType === Node.TEXT_NODE) {
                    // Process hyphens in the text content before creating the shadow node
                    const processedText = this.#processTextHyphens(node.textContent);
                    const newTextNode = document.createTextNode(processedText);
                    shadowTargetParent.appendChild(newTextNode);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // Clone the element node (shallowly)
                    const elementClone = node.cloneNode(false);
                    shadowTargetParent.appendChild(elementClone);
                    // Recursively clone its children into the new clone
                    if (node.childNodes.length > 0) {
                        cloneNodesRecursively(Array.from(node.childNodes), elementClone); // Convert NodeList to Array
                    }
                } else {
                    // For other node types (like comments), just clone them directly
                    // Use deep clone for simplicity here, assuming no other special handling needed
                    const deepClone = node.cloneNode(true);
                    shadowTargetParent.appendChild(deepClone);
                }
            });
        };

        // Start the recursive cloning process
        cloneNodesRecursively(sourceNodes, this.#textDisplayElement);

        this.#scrollToBottom(); // Ensure view is scrolled down
        this.#showIndicator(wasSkipped); // Show the proceed indicator after appropriate delay
    }


    #showIndicator(wasSkipped = false) {
        // ... (unchanged) ...
        if (wasSkipped && this.unskippable) {
            // If skipped but unskippable, still show indicator but don't allow proceeding yet
            this.#isComplete = true; // Mark as text displayed
            this.#canProceed = false; // But block proceed signal
            this.#indicatorElement.classList.add("visible");
            return;
        }

        clearTimeout(this.#indicatorTimeoutId);
        this.#indicatorTimeoutId = null;

        const delay = wasSkipped ? 0 : this.#endDelayMs; // No delay if text was skipped

        if (delay > 0) {
            this.#indicatorTimeoutId = setTimeout(() => {
                if (this.#isComplete) { // Double check state in case of race conditions
                    this.#canProceed = true;
                    this.#indicatorElement.classList.add("visible");
                }
                this.#indicatorTimeoutId = null;
            }, delay);
        } else {
            // Show indicator immediately if no delay or skipped
            if (this.#isComplete) {
                this.#canProceed = true;
                this.#indicatorElement.classList.add("visible");
            }
        }
    }

    #skipScrolling() {
        // ... (unchanged) ...
        if (this.#isScrolling && !this.unskippable && !this.#isSkipping) {
            this.#isSkipping = true; // Set flag to prevent scrollLoop from continuing normally
            this.#clearTimeouts(); // Stop the current character timeout

            // Dispatch a 'skip' event that could potentially be cancelled
            const prevented = !this.dispatchEvent(
                new CustomEvent("skip", {
                    bubbles: true,
                    composed: true,
                    cancelable: true,
                })
            );

            if (!prevented) {
                // If the event wasn't cancelled, proceed to show the full text
                // Use requestAnimationFrame to ensure it happens in the next paint cycle
                requestAnimationFrame(() => {
                    this.#showFullText(true); // Pass true to indicate it was skipped
                });
            } else {
                // If skipping was prevented by an event listener, reset the flag
                this.#isSkipping = false;
                // Potentially restart the scroll loop if desired, or just let it be paused
                // Current implementation just stops it; user would need to interact again.
            }
        } else if (this.unskippable) {
            // console.log("Textbox is unskippable."); // Optional feedback
        }
    }


    #handleInteraction(event) {
        // ... (unchanged) ...
        if (this.closest("vn-assets")) return; // Ignore interactions on definition elements

        if (this.#isScrolling && !this.#isSkipping) {
            // If text is scrolling, interaction skips the scrolling
            this.#skipScrolling();
        } else if (this.#canProceed) {
            // If text is complete and proceed is allowed, dispatch 'proceed' event
            const prevented = !this.dispatchEvent(
                new CustomEvent("proceed", {
                    bubbles: true,
                    composed: true, // Allows event to cross shadow DOM boundary
                })
            );
            // if (prevented) { console.log("Proceed event prevented."); } // Optional feedback
        } else {
            // Interaction occurred when not scrolling and not ready to proceed (e.g., during end delay)
            // console.log("Interaction ignored (not scrolling, not proceedable)."); // Optional feedback
        }
    }

    #handleKeydown(event) {
        // ... (unchanged) ...
        if (this.closest("vn-assets")) return; // Ignore keydown on definition elements

        // Allow Space or Enter to trigger the same interaction as a click
        if (event.code === "Space" || event.code === "Enter") {
            event.preventDefault(); // Prevent default space/enter actions (like scrolling page)
            this.#handleInteraction(event); // Treat as a standard interaction
        }
    }

    #parseTime(timeStr) {
        // ... (unchanged) ...
        if (timeStr === null || timeStr === undefined) return null;
        if (typeof timeStr === 'number') return Math.max(0, timeStr);

        if (typeof timeStr === 'string') {
            const trimmed = timeStr.trim();
            if (trimmed === '') return 0;

            // Match plain numbers (treat as ms)
            if (/^\d+(\.\d+)?$/.test(trimmed)) {
                return Math.max(0, parseFloat(trimmed));
            }
            // Match numbers with units (ms or s)
            const match = trimmed.match(/^(\d+(\.\d+)?)\s*(ms|s)$/i);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[3].toLowerCase();
                if (unit === 's') {
                    return Math.max(0, value * 1000);
                } else { // ms
                    return Math.max(0, value);
                }
            }
        }
        console.warn(`VNTextboxElement: Invalid time format "${timeStr}". Using default.`);
        return null; // Indicate parsing failure or invalid type
    }

    #syncAttribute(name, value) {
        // ... (unchanged) ...
        if (this.closest('vn-assets') && !this.#isDefinitionParsed && name !== 'uid') return; // Don't sync non-UID attributes on unparsed definitions

        const useValue = value !== null ? value : 'auto'; // Default for position/size if value is null

        switch (name) {
            // Positioning & Sizing
            case 'top': this.style.top = useValue; break;
            case 'left': this.style.left = useValue; break;
            case 'bottom': this.style.bottom = useValue; break;
            case 'right': this.style.right = useValue; break;
            case 'width': this.style.width = useValue; break;
            case 'height': this.style.height = useValue; break;

            // Styling
            case 'color':
                if (this.#contentElement) this.#contentElement.style.color = value ?? '';
                break;
            case 'background':
                this.style.background = value ?? ''; // Apply to host element
                break;
            case 'style':
                 // Direct style attribute handled by the browser, maybe log or handle conflicts if needed
                break;

            // Timing & Behavior
            case 'ms':
            case 'start-delay':
            case 'end-delay':
                this.#updateInternalMsValues();
                break;

            case 'scrolling':
                // Handled by property getter/setter and used in #startDisplay
                break;
            case 'unskippable':
                // Handled by property getter/setter and used in #skipScrolling/#showIndicator
                break;

            // Content
            case 'title':
                if (this.#titleElement) {
                    // Prefer setting textContent on the named slot for better encapsulation
                    const slot = this.#titleElement.querySelector('slot[name="title"]');
                    if (slot) {
                        // Clear existing assigned nodes before setting text content?
                        // Or just set textContent which acts as fallback content
                         slot.textContent = value ?? ''; // Simplest approach
                         // If you need to replace slotted elements, more complex logic is needed.
                    } else {
                         // Fallback if slot isn't found (shouldn't happen with current HTML)
                        this.#titleElement.textContent = value ?? '';
                    }
                    this.#updateTitleVisibility(); // Update visibility based on new content
                }
                break;

            // Meta
            case 'uid': // Read-only, used internally
            case 'ref': // Read-only, used during initialization
                break;

            default:
                // console.log(`VNTextbox: Attribute '${name}' changed but not explicitly handled.`);
                break;
        }
    }

    #syncAllAttributes() {
        // ... (unchanged) ...
        VNTextboxElement.observedAttributes.forEach(attrName => {
            if (this.hasAttribute(attrName)) {
                this.#syncAttribute(attrName, this.getAttribute(attrName));
            } else {
                // Handle removal of attributes if necessary (e.g., reset styles)
                // For simplicity, current implementation mostly relies on setting attributes
                // this.#syncAttribute(attrName, null); // Example if removal needs explicit handling
            }
        });
        this.#updateTitleVisibility(); // Ensure title visibility is correct after sync
    }


    #updateTitleVisibility() {
        // ... (unchanged) ...
        if (!this.#titleElement) return;
        // Use requestAnimationFrame to ensure checks happen after potential DOM updates
        requestAnimationFrame(() => {
            const slot = this.#titleElement.querySelector('slot[name="title"]');
            // Check assigned nodes (elements slotted in)
            const assignedNodes = slot ? slot.assignedNodes({ flatten: true }) : [];
            const hasSlottedContent = assignedNodes.some(n =>
                n.nodeType === Node.ELEMENT_NODE ||
                (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
            );
            // Check fallback content (set via attribute/property or default slot content)
            const hasAttributeContent = this.hasAttribute('title') && this.getAttribute('title').trim() !== '';
            const hasFallbackContent = slot && slot.textContent.trim() !== '';


            // Show title if there's slotted content OR attribute content OR non-empty fallback slot content
            this.#titleElement.style.display = (hasSlottedContent || hasAttributeContent || hasFallbackContent) ? '' : 'none';

        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this.isConnected || oldValue === newValue) return; // Ignore if not connected or value hasn't changed

        if (this.closest("vn-assets")) {
            // Handle changes on definition elements (e.g., mark as needing re-parse?)
            // console.log(`[DEF Textbox ${this.getAttribute('uid')}] Attribute changed: ${name}`);
        } else {
            // Handle changes on instance elements
            this.#syncAttribute(name, newValue);

            // Special handling needed after certain attribute changes
            if (name === "title") {
                this.#updateTitleVisibility();
            }
            // If timing attributes change mid-scroll, the effect might be delayed until the next char/step.
            // A full redisplay might be needed for immediate effect, but that could be disruptive.
        }
    }

    // Getters and setters. State is represented via attributes
    get top() { return this.getAttribute("top"); }
    set top(value) { this.setAttribute("top", value); }
    get left() { return this.getAttribute("left"); }
    set left(value) { this.setAttribute("left", value); }
    get bottom() { return this.getAttribute("bottom"); }
    set bottom(value) { this.setAttribute("bottom", value); }
    get right() { return this.getAttribute("right"); }
    set right(value) { this.setAttribute("right", value); }
    get width() { return this.getAttribute("width"); }
    set width(value) { this.setAttribute("width", value); }
    get height() { return this.getAttribute("height"); }
    set height(value) { this.setAttribute("height", value); }
    get color() { return this.getAttribute("color"); }
    set color(value) { this.setAttribute("color", value); }
    get background() { return this.getAttribute("background"); }
    set background(value) { this.setAttribute("background", value); }
    get ms() { return this.getAttribute("ms"); }
    set ms(value) { this.setAttribute("ms", String(value)); }
    get scrolling() { return this.hasAttribute("scrolling"); }
    set scrolling(value) { this.toggleAttribute("scrolling", !!value); }
    get unskippable() { return this.hasAttribute("unskippable"); }
    set unskippable(value) { this.toggleAttribute("unskippable", !!value); }
    get title() { return this.getAttribute("title"); }
    set title(value) { this.setAttribute("title", value); }
    get startDelay() { return this.getAttribute("start-delay"); }
    set startDelay(value) { this.setAttribute("start-delay", String(value)); }
    get endDelay() { return this.getAttribute("end-delay"); }
    set endDelay(value) { this.setAttribute("end-delay", String(value)); }
    get player() { return this.closest("vn-player"); }
    set player(value) { throw new Error("`player` (VNPlayerElement) is read-only."); }
    get scene() { return this.closest("vn-scene"); }
    set scene(value) { throw new Error("`scene` (VNSceneElement) is read-only."); }

    // Classic JS-style getters and setters

    getPlayer() { return this.player; }
    getScene() { return this.scene; }
    getTop() { return this.top; }
    getLeft() { return this.left; }
    getBottom() { return this.bottom; }
    getRight() { return this.right; }
    getWidth() { return this.width; }
    getHeight() { return this.height; }
    getColor() { return this.color; }
    getBackground() { return this.background; }
    getMs() { return this.ms; }
    isScrollingEnabled() { return this.scrolling; }
    isUnskippable() { return this.unskippable; }
    getTitle() { return this.title; }
    getStartDelay() { return this.startDelay; }
    getEndDelay() { return this.endDelay; }

    setTop(value) { this.top = value; }
    setLeft(value) { this.left = value; }
    setBottom(value) { this.bottom = value; }
    setRight(value) { this.right = value; }
    setWidth(value) { this.width = value; }
    setHeight(value) { this.height = value; }
    setColor(value) { this.color = value; }
    setBackground(value) { this.background = value; }
    setScrollingEnabled(value) { this.scrolling = value; }
    setUnskippable(value) { this.unskippable = value; }
    setTitle(value) { this.title = value; }
    setMs(value) { this.ms = value; }
    setStartDelay(value) { this.startDelay = value; }
    setEndDelay(value) { this.endDelay = value; }

    getScrollMilliseconds() { return this.#scrollMs; }
    getStartDelayMilliseconds() { return this.#startDelayMs; }
    getEndDelayMilliseconds() { return this.#endDelayMs; }

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
            this.#updateInternalMsValues(); // Ensure timing values are current
            requestAnimationFrame(() => {
                this.#startDisplay(); // Restart the display logic
            });
        } else {
            console.warn("VNTextbox: redisplay() called on disconnected or definition element.");
        }
    }
}

customElements.define("text-box", VNTextboxElement);