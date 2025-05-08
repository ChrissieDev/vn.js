/**
 * @file vn-actor.js
 * Implements the VNActorElement custom element.
 * Represents a character composed of multiple vn-sprites, each with switchable states (images).
 * Instances dynamically add/replace only the *active* image for each part in their shadow DOM.
 * Attempts to automatically size based on largest part image (from definition) if no explicit size is set via style.
 * Scales relative to container via CSS (e.g., percentage height + aspect-ratio).
 */
import "./vn-sprite.js";

const DESIGN_HEIGHT = 1080;

export default class VNActorElement extends HTMLElement {
    #shadow;
    #activeState = new Map();
    #isDefinitionParsed = false;
    #isInstanceInitialized = false;
    #name = "";
    #playerPromise = null;
    #initializationPromise = null;
    #parsePromise = null;
    #instanceObserver = null;

    #definitionBodyPartDefs = new Map();
    #maxImageWidth = 0;
    #maxImageHeight = 0;
    #calculatedRelativeHeight = null;

    static observedAttributes = ["uid", "name", "style", "actor"];

    constructor() {
        super();
        this.#shadow = this.attachShadow({ mode: "open" });
        this.#shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: absolute; 
                    overflow: visible; 
                    transform-origin: center bottom;
                    image-rendering: smooth; 
                    will-change: transform, filter, width, height, aspect-ratio;

                    height: var(--vn-actor-calculated-height, 60%);
                    width: auto;
                    aspect-ratio: var(--vn-actor-aspect-ratio, 1 / 1); 

                    
                }
                .actor-wrapper {
                    position: relative; 
                    width: 100%;
                    height: 100%;
                    transform-style: preserve-3d; 
                }

                vn-style {
                    display: none;
                }
            </style>
            <div class="actor-wrapper" part="wrapper">
                <!-- Active images will be added here dynamically -->
            </div>
            <slot></slot>
        `;

        this.#playerPromise = Promise.all([
            customElements.whenDefined("vn-player"),
            customElements.whenDefined("vn-sprite"),
        ]);
    }

    async connectedCallback() {
        const id =
            this.getAttribute("uid") ||
            this.getAttribute("name") ||
            "anonymous";
        const isDefinition = this.closest("vn-project") !== null;

        if (isDefinition) {
            console.log(`\x1b[32m[Actor DEF: ${id}]\x1b[0m`);
            this.ensureParsed();
        } else {
            this.#initializationPromise = this.#initializeFromAssets();
            this.#initializationPromise
                .then(() => {
                    this.#setupInstanceObserver();
                })
                .catch((error) => {
                    console.error(
                        `[INST ${id}] ASYNC Initialization error:`,
                        error
                    );
                    this.style.setProperty("display", "none", "important");
                });
        }
    }

    disconnectedCallback() {
        const id =
            this.getAttribute("uid") ||
            this.getAttribute("name") ||
            "anonymous";
        if (this.#instanceObserver) {
            this.#instanceObserver.disconnect();
            this.#instanceObserver = null;
        }
        if (this.closest("vn-project")) {
            this.#isInstanceInitialized = false;
            this.#initializationPromise = null;
            this.#activeState.clear();
            this.style.display = 'none !important';
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            const id =
                this.getAttribute("uid") ||
                this.getAttribute("name") ||
                "anonymous";
            const isInstance = !this.closest("vn-project");

            if (name === "name") {
                this.#name = newValue ?? "";
            } else if (name === "style") {
                if (isInstance && this.#isInstanceInitialized) {
                    this.#applyDynamicStyles();
                }
            } else if (name === "uid" && this.isConnected && isInstance) {
                console.warn(
                    `Actor instance UID changed dynamically. May require manual re-initialization or state update.`
                );
            }
        }
    }

    /** Sets up MutationObserver for instance &-attributes. */
    #setupInstanceObserver() {
        if (this.closest("vn-project") || this.#instanceObserver) return;
    }

    /** Parses definition, calculates dimensions, caches vn-sprite defs. Returns promise. */
    #parseDefinition() {
        
        return this.#parsePromise;
    }

    /** Applies calculated height and aspect ratio dynamically if not overridden by inline styles. */
    #applyDynamicStyles() {
        const id =
            this.getAttribute("uid") ||
            this.getAttribute("name") ||
            "anonymous_inst";
        const hasInlineHeight =
            this.style.height ||
            (this.getAttribute("style") || "").includes("height:");
        const hasInlineAspectRatio =
            this.style.aspectRatio ||
            (this.getAttribute("style") || "").includes("aspect-ratio:");

        if (!hasInlineHeight) {
            const calculatedHeight = this.style
                .getPropertyValue("--vn-actor-calculated-height")
                .trim();
            if (calculatedHeight && calculatedHeight !== "0%") {
                this.style.height = calculatedHeight;
            } else {
                this.style.height = "60%";
            }
        } else {
        }

        if (!hasInlineAspectRatio) {
            const calculatedAspectRatio = this.style
                .getPropertyValue("--vn-actor-aspect-ratio")
                .trim();
            if (calculatedAspectRatio) {
                this.style.aspectRatio = calculatedAspectRatio;
            } else {
                this.style.aspectRatio = "1 / 1";
            }
        } else {
        }

        this.style.width = "auto";
    }

    /** Initializes an actor instance based on its definition in vn-project. */
    async #initializeFromAssets() {
        if (this.#isInstanceInitialized) return;
        if (!this.isConnected) {
            console.warn(
                `[${
                    this.id || "unknown"
                }] Initialization called before connection. Awaiting connection.`
            );
            await new Promise((resolve) =>
                this.addEventListener("connected", resolve, { once: true })
            );
        }
        await this.#playerPromise;

        const uid = this.getAttribute("uid");
        if (!uid) {
            throw new Error("Actor instance requires a 'uid' attribute.");
        }
        const instanceId = `INST ${uid}`;

        const player = this.closest("vn-player");
        if (!player) throw new Error(`[${instanceId}] Player not found.`);
        const definition = player.getAssetDefinition(uid);
        if (!definition || !(definition instanceof VNActorElement)) {
            throw new Error(
                `[${instanceId}] Definition not found or invalid for uid "${uid}".`
            );
        }

        try {
            await definition.ensureParsedAsync();
        } catch (error) {
            console.error(
                `[${instanceId}] Error waiting for definition parsing:`,
                error
            );
            throw new Error(`Initialization failed: Definition parsing error.`);
        }

        if (!this.hasAttribute("name") && definition.hasAttribute("name")) {
            this.setAttribute("name", definition.getAttribute("name"));
        }
        this.#name = this.getAttribute("name") || uid;

        const aspectRatioVar = definition.style
            .getPropertyValue("--vn-actor-aspect-ratio")
            .trim();
        const heightVar = definition.style
            .getPropertyValue("--vn-actor-calculated-height")
            .trim();
        if (aspectRatioVar)
            this.style.setProperty("--vn-actor-aspect-ratio", aspectRatioVar);
        if (heightVar)
            this.style.setProperty("--vn-actor-calculated-height", heightVar);

        this.#applyDynamicStyles();

        const wrapper = this.#shadow.querySelector(".actor-wrapper");
        if (!wrapper)
            throw new Error(
                `[${instanceId}] CRITICAL: .actor-wrapper not found!`
            );
        wrapper.innerHTML = "";

        this.#isInstanceInitialized = true;
        console.log(`[${instanceId}] #initializeFromAssets: END (Success)`);
    }

    getName() {
        return (
            this.getAttribute("name") ||
            this.#name ||
            this.getAttribute("uid") ||
            ""
        );
    }

    isParsed() {
        return this.closest("vn-project") !== null && this.#isDefinitionParsed;
    }
    get isInitialized() {
        return !this.closest("vn-project") && this.#isInstanceInitialized;
    }
    getMaxImageWidth() {
        if (this.closest("vn-project") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getMaxImageWidth: Definition not parsed yet.`
            );
        }
        return this.#maxImageWidth;
    }
    getMaxImageHeight() {
        if (this.closest("vn-project") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getMaxImageHeight: Definition not parsed yet.`
            );
        }
        return this.#maxImageHeight;
    }
    getCalculatedRelativeHeight() {
        if (this.closest("vn-project") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getCalculatedRelativeHeight: Definition not parsed yet.`
            );
        }
        return this.#calculatedRelativeHeight;
    }
    ensureParsedAsync() {
        if (!this.closest("vn-project")) return Promise.resolve();
        return this.#parseDefinition();
    }
    ensureParsed() {
        if (this.closest("vn-project") && !this.#parsePromise) {
            this.#parseDefinition();
        }
    }
    ensureInitialized() {
        if (this.closest("vn-project")) return Promise.resolve();
        if (!this.#initializationPromise) {
            this.#initializationPromise = this.#initializeFromAssets();
            this.#initializationPromise.catch((error) => {
                console.error(
                    `[INST ${this.id}] ASYNC Init error (ensureInitialized):`,
                    error
                );
                this.style.setProperty("display", "none", "important");
            });
        }
        return this.#initializationPromise;
    }
    async forceInitialize() {
        const uid = this.getAttribute("uid");
        if (uid && !this.closest("vn-project")) {
            if (this.#isInstanceInitialized) {
                return;
            }
            try {
                await this.ensureInitialized();
            } catch (e) {
                console.error(`[INST ${uid}] forceInitialize error:`, e);
                this.style.setProperty("display", "none", "important");
            }
        }
    }
}

customElements.define("vn-actor", VNActorElement);
