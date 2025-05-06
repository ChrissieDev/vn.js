/**
 * @file vn-actor.js
 * Implements the VNActorElement custom element.
 * Represents a character composed of multiple body parts, each with switchable states (images).
 * Instances dynamically add/replace only the *active* image for each part in their shadow DOM.
 * Attempts to automatically size based on largest part image (from definition) if no explicit size is set via style.
 * Scales relative to container via CSS (e.g., percentage height + aspect-ratio).
 */
import "./vn-layer.js";

const DESIGN_HEIGHT = 1080;

export default class VNActorElement extends HTMLElement {
    #shadow;
    #bodyPartsData = new Map();
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

                
                 :host([style*="height"]) {
                     
                 }
                 
                 
                 :host([style*="aspect-ratio"]) {
                      
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
                
                .actor-wrapper > img {
                    
                    position: absolute;
                    bottom: 0; 
                    left: 50%; 
                    transform: translateX(-50%); 

                    
                    
                    
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                    object-fit: contain; 
                    object-position: bottom center; 

                    transform-origin: bottom center; 
                    pointer-events: none; 
                    user-select: none;
                    
                }

                
                ::slotted(vn-layer) {
                    display: none !important;
                }
            </style>
            <div class="actor-wrapper" part="wrapper">
                <!-- Active images will be added here dynamically -->
            </div>
            <slot></slot> <!-- Slot ONLY for vn-layer definitions -->
        `;

        this.#playerPromise = Promise.all([
            customElements.whenDefined("vn-player"),
            customElements.whenDefined("vn-layer"),
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
        if (!this.closest("vn-assets")) {
            this.#isInstanceInitialized = false;
            this.#initializationPromise = null;
            this.#activeState.clear();
            const wrapper = this.#shadow.querySelector(".actor-wrapper");
            if (wrapper) wrapper.innerHTML = "";
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            const id =
                this.getAttribute("uid") ||
                this.getAttribute("name") ||
                "anonymous";
            const isInstance = !this.closest("vn-assets");

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
        if (this.closest("vn-assets") || this.#instanceObserver) return;

        const id =
            this.getAttribute("uid") ||
            this.getAttribute("name") ||
            "anonymous_inst";

        this.#instanceObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName.startsWith("&")
                ) {
                    const bodyPartUid = mutation.attributeName.substring(1);
                    const newStateUid = this.getAttribute(
                        mutation.attributeName
                    );
                    if (newStateUid !== null && newStateUid !== undefined) {
                        this.setState(bodyPartUid, newStateUid);
                    } else {
                        console.warn(
                            `[INST ${id}] &-attribute ${mutation.attributeName} removed. State handling not implemented.`
                        );
                    }
                }
            });
        });

        this.#instanceObserver.observe(this, { attributes: true });
    }

    /** Parses definition, calculates dimensions, caches body part defs. Returns promise. */
    #parseDefinition() {
        if (this.#parsePromise) return this.#parsePromise;
        const id =
            this.getAttribute("name") ||
            this.getAttribute("uid") ||
            "anonymous_def";
        if (this.#isDefinitionParsed) return Promise.resolve();

        let resolveParse, rejectParse;
        this.#parsePromise = new Promise((resolve, reject) => {
            resolveParse = resolve;
            rejectParse = reject;
        });

        this.#name = this.getAttribute("name") || "";
        this.#definitionBodyPartDefs.clear();
        this.#activeState.clear();
        this.#maxImageWidth = 0;
        this.#maxImageHeight = 0;
        this.#calculatedRelativeHeight = null;

        const bodyPartDefs = this.querySelectorAll(":scope > vn-layer[uid]");
        if (bodyPartDefs.length === 0) {
            console.warn(`[DEF ${id}] NO <vn-layer> child elements found.`);
        }

        const imagePromises = [];
        for (const bpDef of bodyPartDefs) {
            const bpUid = bpDef.uid;
            if (!bpUid || this.#definitionBodyPartDefs.has(bpUid)) continue;

            this.#definitionBodyPartDefs.set(bpUid, bpDef);
            const stateDefs = bpDef.getImageDefinitions();

            for (const imgDef of stateDefs) {
                const src = imgDef.getAttribute("src");
                if (src) {
                    const img = new Image();
                    img.src = src;
                    imagePromises.push(
                        img
                            .decode()
                            .then(() => {
                                this.#maxImageWidth = Math.max(
                                    this.#maxImageWidth,
                                    img.naturalWidth
                                );
                                this.#maxImageHeight = Math.max(
                                    this.#maxImageHeight,
                                    img.naturalHeight
                                );
                            })
                            .catch((e) =>
                                console.warn(
                                    `[DEF ${id}] Failed decode image ${src}:`,
                                    e
                                )
                            )
                    );
                }
            }
        }

        for (const attr of this.attributes) {
            if (attr.name.startsWith("&")) {
                const bpUid = attr.name.substring(1);
                const stateUid = attr.value;
                const bpDef = this.#definitionBodyPartDefs.get(bpUid);
                if (bpDef?.getImageDefinition(stateUid)) {
                    this.#activeState.set(bpUid, stateUid);
                } else {
                }
            }
        }

        Promise.allSettled(imagePromises)
            .then(() => {
                if (this.#maxImageWidth > 0 && this.#maxImageHeight > 0) {
                    const aspectRatio =
                        this.#maxImageWidth / this.#maxImageHeight;
                    this.#calculatedRelativeHeight =
                        (this.#maxImageHeight / DESIGN_HEIGHT) * 100;
                    this.style.setProperty(
                        "--vn-actor-aspect-ratio",
                        aspectRatio
                    );
                    this.style.setProperty(
                        "--vn-actor-calculated-height",
                        `${this.#calculatedRelativeHeight.toFixed(2)}%`
                    );
                } else {
                    console.warn(
                        `[DEF ${id}] Could not determine dimensions. Using defaults.`
                    );
                    this.style.setProperty("--vn-actor-aspect-ratio", "1 / 1");
                    this.style.setProperty(
                        "--vn-actor-calculated-height",
                        `60%`
                    );
                }
                this.#isDefinitionParsed = true;
                resolveParse();
            })
            .catch((error) => {
                console.error(
                    `[DEF ${id}] Error during image dimension calculation:`,
                    error
                );
                this.#isDefinitionParsed = true;
                this.style.setProperty("--vn-actor-aspect-ratio", "1 / 1");
                this.style.setProperty("--vn-actor-calculated-height", `60%`);
                rejectParse(error);
            });

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

    /** Initializes an actor instance based on its definition in vn-assets. */
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

        const definitionDefaults = definition.getDefaultActiveState();
        const definitionBodyPartDefs = definition.getDefinitionBodyPartDefs();

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

        this.#activeState = new Map(definitionDefaults);
        for (const attr of this.attributes) {
            if (attr.name.startsWith("&")) {
                const bpUid = attr.name.substring(1);
                const stateUid = attr.value;
                const bpDef = definitionBodyPartDefs.get(bpUid);
                if (bpDef?.getImageDefinition(stateUid)) {
                    this.#activeState.set(bpUid, stateUid);
                } else {
                    console.warn(
                        `[${instanceId}] Instance &-attribute "${attr.name}='${stateUid}'" is invalid for body part "${bpUid}". Using definition default or no state.`
                    );
                }
            }
        }

        const wrapper = this.#shadow.querySelector(".actor-wrapper");
        if (!wrapper)
            throw new Error(
                `[${instanceId}] CRITICAL: .actor-wrapper not found!`
            );
        wrapper.innerHTML = "";

        for (const [bpUid, bpDefElement] of definitionBodyPartDefs.entries()) {
            const activeStateUid = this.#activeState.get(bpUid);
            if (activeStateUid) {
                this.#addOrReplaceBodyPartImage(bpUid, activeStateUid);
            } else {
            }
        }

        this.#isInstanceInitialized = true;
        console.log(`[${instanceId}] #initializeFromAssets: END (Success)`);
    }

    /** Helper to create and add/replace an image element in the shadow DOM for a body part state. */
    #addOrReplaceBodyPartImage(bodyPartUid, stateUid) {
        const instanceId = `INST ${this.getAttribute("uid") || "anon"}`;
        const wrapper = this.#shadow.querySelector(".actor-wrapper");
        if (!wrapper) {
            console.error(`[${instanceId}] #addOrReplace: Wrapper not found!`);
            return false;
        }

        const player = this.closest("vn-player");
        const definition = player?.getAssetDefinition(this.getAttribute("uid"));
        const bodyPartDefElement = definition
            ?.getDefinitionBodyPartDefs()
            ?.get(bodyPartUid);
        const imgDef = bodyPartDefElement?.getImageDefinition(stateUid);

        if (!imgDef) {
            console.error(
                `[${instanceId}] #addOrReplace: Image definition not found for ${bodyPartUid}/${stateUid}.`
            );
            const existingImg = wrapper.querySelector(
                `img[data-vn-layer="${bodyPartUid}"]`
            );
            if (existingImg) {
                console.warn(
                    `[${instanceId}] #addOrReplace: Removing image for ${bodyPartUid} due to invalid new state ${stateUid}.`
                );
                existingImg.remove();
            }
            return false;
        }

        const newImgInstance = document.createElement("img");
        const src = imgDef.getAttribute("src");
        newImgInstance.src = src;
        newImgInstance.dataset.bodyPart = bodyPartUid;
        newImgInstance.dataset.state = stateUid;
        newImgInstance.part = `${bodyPartUid}-${stateUid}`;

        const zIndex =
            imgDef.style.zIndex || imgDef.getAttribute("z-index") || "auto";
        newImgInstance.style.zIndex = zIndex;
        const imgStyle = imgDef.getAttribute("style") || "";
        if (imgStyle) {
            const currentInlineStyle =
                newImgInstance.getAttribute("style") || "";
            newImgInstance.setAttribute(
                "style",
                `${imgStyle}; ${currentInlineStyle}`
            );
        }

        newImgInstance.onerror = () => {
            console.error(`[${instanceId}] Failed load image: ${src}`);
            newImgInstance.style.display = "none";
        };
        newImgInstance.loading = "lazy";

        const existingImg = wrapper.querySelector(
            `img[data-vn-layer="${bodyPartUid}"]`
        );
        if (existingImg) {
            existingImg.remove();
        }

        wrapper.appendChild(newImgInstance);
        return true;
    }

    /** Sets the active state for a body part (for instances: replaces image in shadow DOM). */
    setState(bodyPartUid, stateUid) {
        const id =
            this.getAttribute("uid") ||
            this.getAttribute("name") ||
            "anonymous";
        const isInstance = !this.closest("vn-assets");
        const logPrefix = isInstance ? `[INST ${id}]` : `[DEF ${id}]`;

        if (!isInstance) {
            this.ensureParsed();
            if (!this.#isDefinitionParsed) {
                return;
            }

            const bpDef = this.#definitionBodyPartDefs.get(bodyPartUid);
            if (bpDef?.getImageDefinition(stateUid)) {
                this.#activeState.set(bodyPartUid, stateUid);
                this.setAttribute(`&${bodyPartUid}`, stateUid);
            } else {
                console.warn(
                    `${logPrefix} setState (Default): Invalid state "${stateUid}" for body part "${bodyPartUid}".`
                );
            }
            return;
        }

        this.ensureInitialized()
            .then(() => {
                if (!this.#isInstanceInitialized) {
                    console.warn(
                        `${logPrefix} setState: Instance failed to initialize. Ignoring ${bodyPartUid}=${stateUid}.`
                    );
                    return;
                }

                const currentState = this.#activeState.get(bodyPartUid);
                if (currentState === stateUid) {
                    return;
                }

                const success = this.#addOrReplaceBodyPartImage(
                    bodyPartUid,
                    stateUid
                );

                if (success) {
                    this.#activeState.set(bodyPartUid, stateUid);
                } else {
                    console.warn(
                        `${logPrefix} setState: Failed to set state for ${bodyPartUid} to ${stateUid}.`
                    );
                    if (
                        !this.#shadow.querySelector(
                            `.actor-wrapper img[data-vn-layer="${bodyPartUid}"]`
                        )
                    ) {
                        this.#activeState.delete(bodyPartUid);
                    }
                }
            })
            .catch((error) => {
                console.error(
                    `${logPrefix} setState: Error during initialization wait:`,
                    error
                );
            });
    }

    getActiveState(bodyPartUid) {
        if (!this.closest("vn-assets") && !this.#isInstanceInitialized) {
        }
        return this.#activeState.get(bodyPartUid);
    }
    getName() {
        return (
            this.getAttribute("name") ||
            this.#name ||
            this.getAttribute("uid") ||
            ""
        );
    }
    getDefaultActiveState() {
        if (this.closest("vn-assets") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getDefaultActiveState: Definition not parsed yet.`
            );
        }
        return new Map(this.#activeState);
    }

    /** Gets the map of <vn-layer> definition elements (relevant for definitions). */
    getDefinitionBodyPartDefs() {
        if (this.closest("vn-assets") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getDefinitionBodyPartDefs: Definition not parsed yet.`
            );
        }
        return this.#definitionBodyPartDefs;
    }

    isParsed() {
        return this.closest("vn-assets") !== null && this.#isDefinitionParsed;
    }
    get isInitialized() {
        return !this.closest("vn-assets") && this.#isInstanceInitialized;
    }
    getMaxImageWidth() {
        if (this.closest("vn-assets") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getMaxImageWidth: Definition not parsed yet.`
            );
        }
        return this.#maxImageWidth;
    }
    getMaxImageHeight() {
        if (this.closest("vn-assets") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getMaxImageHeight: Definition not parsed yet.`
            );
        }
        return this.#maxImageHeight;
    }
    getCalculatedRelativeHeight() {
        if (this.closest("vn-assets") && !this.#isDefinitionParsed) {
            console.warn(
                `[DEF ${this.id}] getCalculatedRelativeHeight: Definition not parsed yet.`
            );
        }
        return this.#calculatedRelativeHeight;
    }
    ensureParsedAsync() {
        if (!this.closest("vn-assets")) return Promise.resolve();
        return this.#parseDefinition();
    }
    ensureParsed() {
        if (this.closest("vn-assets") && !this.#parsePromise) {
            this.#parseDefinition();
        }
    }
    ensureInitialized() {
        if (this.closest("vn-assets")) return Promise.resolve();
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
        if (uid && !this.closest("vn-assets")) {
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
