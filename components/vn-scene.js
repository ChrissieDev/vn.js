/**
 * @file vn-scene.js
 * Implements the VNSceneElement custom element.
 * This element acts as the main stage, organizing backgrounds, foregrounds, actors, and textboxes.
 * It also manages ambient lighting effects based on tagged images and can use a default textbox definition.
 */
import "./vn-actor.js";
import VNTextboxElement from "./text-box.js";
import VNPlayerElement from "./vn-player.js";

/**
 * Helper function to convert RGB values to HSL.
 * @param {number} r - Red value (0-255).
 * @param {number} g - Green value (0-255).
 * @param {number} b - Blue value (0-255).
 * @returns {{ h: number, s: number, l: number }} - HSL values (hue, saturation, lightness).
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s = 0,
        l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s, l: l };
}

/**
 * This is a web component that represents the main visual "stage" where the game is displayed.
 * Scripts modify the scene by adding or removing elements to it, animating them, and changing their properties.
 */
export default class VNSceneElement extends HTMLElement {
    
    /**
     * @type {import("./vn-scene.js").default}
     */
    #sceneElement = null;

    /**
     * @type {HTMLDivElement}
     */
    #actorsContainer = null;
    
    /**
     * @type {HTMLDivElement}
     */
    #imagesContainer = null;
    
    /**
     * @type {HTMLDivElement}
     */
    #textboxesContainer = null;
    
    /**
     * @type {HTMLDivElement}
     */
    #mediaContainer = null;

    /**
     * A MutationObserver used to catch elements being added or removed in the scene.
     * @type {MutationObserver}
     */
    #observer = null;
    
    /**
     * A promise that resolves when the player is defined as a custom element to the browser.
     * @type {Promise<CustomElementConstructor>}
     */
    #playerPromise = null;

    /**
     * The image that decides the ambient lighting of the objects displayed in the default slot.
     * @type {HTMLImageElement}
     */
    #ambientSourceElement = null;

    /**
     * The current CSS `filter` variable applied to the ambient image.
     * @type {string}
     */
    #currentAmbientFilter = "none";

    /**
     * If we are currently analyzing the ambient image for its average color.
     * @type {boolean}
     * @todo not necessary. the analyzeImageForAmbientFilter() returns a promise anyway.
     */
    #isAnalyzingAmbient = false;

    get currentTextboxDefinition() {
        return this.getAttribute("textbox");
    }

    static get observedAttributes() {
        return ["textbox"];
    }

    /**
     * Create a new VNSceneElement instance.
     */
    constructor() {
        super();
        
        this.attachShadow({ mode: "open" });

        this.shadowRoot.innerHTML = `
            <style>
                 :host {
                    display: block;
                    width: 100%;
                    height: auto; 
                    max-width: 100svw;
                    max-height: 100svh;
                    aspect-ratio: 16 / 9; 
                    overflow: hidden;
                    position: relative;
                    background-color: #000; 
                }

                .scene {
                    width:100%; height: 100%;
                    position: relative;
                    overflow: hidden;
                }
                
                .images, .media, .actors, .textboxes {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    padding: 0; margin: 0; box-sizing: border-box;
                    overflow: hidden; 
                    pointer-events: none; 
                }
                .actors {
                    position: static;
                    display: flex; 
                    justify-content: center;
                }
                
                .images { z-index: 0; }
                .media { z-index: 5; }
                .actors {
                    z-index: 10;
                    filter: var(--vn-ambient-filter, none);
                    transition: filter 0.5s ease-in-out; 
                }

                .textboxes {
                    z-index: 1000; 
                }

                ::slotted(img[slot="images"]) {
                    position: absolute; top: 0; left: 0;
                    width: 100%; height: 100%;
                    object-fit: cover; 
                    pointer-events: none; 
                    user-select: none;
                 }
                  
                ::slotted(vn-actor) {
                   pointer-events: auto; 
                   
                   bottom: 0; 
                }
                
                ::slotted(text-box[slot="textboxes"]) {
                   pointer-events: auto; 
                   
                }
                
                ::slotted(audio[slot="media"]), ::slotted(video[slot="media"]) {
                   position: absolute;
                   
                }
            </style>
            <div class="scene" part="scene">
                <div class="images" part="images-container"><slot name="images"></slot></div>
                <div class="media" part="media-container"><slot name="media"></slot></div>
                <div class="actors" part="actors-container"><slot></slot></div> <!-- Default slot for actors -->
                <div class="textboxes" part="textboxes-container"><slot name="textboxes"></slot></div>
            </div>
        `;
        this.#sceneElement = this.shadowRoot.querySelector(".scene");
        this.#imagesContainer = this.shadowRoot.querySelector(".images");
        this.#mediaContainer = this.shadowRoot.querySelector(".media");
        this.#actorsContainer = this.shadowRoot.querySelector(".actors");
        this.#textboxesContainer = this.shadowRoot.querySelector(".textboxes");
        this.#playerPromise = customElements.whenDefined("vn-player");
    }

    /**
     * All vn-asset added as instances to the scene receive a set of methods.
     */
    #instanceAPI = {
        animate: (animation, options = {}) => {},
    };

    async connectedCallback() {
        try {
            await this.#playerPromise;
            const initialChildren = Array.from(this.children);
            await this.#processAddedChildrenForUIDs(initialChildren);
            this.#updateAmbientSource();
        } catch (error) {
            console.error("Error during vn-scene initial processing:", error);
        }

        this.#observer = new MutationObserver(async (mutations) => {
            let nodesToAdd = [];
            let nodesToRecheck = [];
            let ambientNeedsUpdate = false;

            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            nodesToAdd.push(node);
                            if (node.matches?.("img[ambient]")) {
                                ambientNeedsUpdate = true;
                            }
                        }
                    }
                    for (const node of mutation.removedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches?.("img[ambient]")) {
                                ambientNeedsUpdate = true;
                                if (node === this.#ambientSourceElement)
                                    this.#ambientSourceElement = null;
                            }
                        }
                    }
                } else if (mutation.type === "attributes") {
                    const targetElement = mutation.target;
                    const isDirectChild = targetElement.parentElement === this;
                    const isSlotted = [
                        "images",
                        "textboxes",
                        "media",
                        "",
                    ].includes(targetElement.slot);
                    const isSelf = targetElement === this;

                    if (isDirectChild || isSlotted || isSelf) {
                        const tagName = targetElement.tagName.toLowerCase();
                        const attrName = mutation.attributeName;

                        if (attrName === "uid")
                            nodesToRecheck.push(targetElement);
                        else if (attrName === "ambient" && tagName === "img")
                            ambientNeedsUpdate = true;
                        else if (
                            attrName === "data-ambient-filter" &&
                            tagName === "img"
                        )
                            ambientNeedsUpdate = true;
                        else if (
                            attrName === "src" &&
                            tagName === "img" &&
                            (targetElement === this.#ambientSourceElement ||
                                targetElement.hasAttribute("ambient"))
                        )
                            ambientNeedsUpdate = true;
                        else if (attrName === "slot") {
                            nodesToRecheck.push(targetElement);
                            if (
                                tagName === "img" &&
                                targetElement.hasAttribute("ambient")
                            )
                                ambientNeedsUpdate = true;
                        } else if (
                            attrName === "src" &&
                            (tagName === "audio" || tagName === "video")
                        ) {
                            nodesToRecheck.push(targetElement);
                        } else if (attrName === "textbox" && isSelf) {
                            console.log(
                                "Scene: `textbox` attribute changed. New textboxes will use definition:",
                                mutation.target.getAttribute("textbox")
                            );
                        }
                    }
                }
            }

            if (nodesToAdd.length > 0 || nodesToRecheck.length > 0) {
                try {
                    await this.#playerPromise;
                    await this.#processAddedChildrenForUIDs([
                        ...nodesToAdd,
                        ...nodesToRecheck,
                    ]);
                } catch (error) {
                    console.error(
                        "Error processing dynamic child changes:",
                        error
                    );
                }
            }
            if (ambientNeedsUpdate && !this.#isAnalyzingAmbient)
                this.#updateAmbientSource();
        });

        this.#observer.observe(this, {
            childList: true,
            subtree: false,
            attributes: true,
            attributeFilter: [
                "uid",
                "ambient",
                "data-ambient-filter",
                "slot",
                "src",
                "textbox",
                "style",
            ],
        });
    }

    disconnectedCallback() {
        if (this.#observer) {
            this.#observer.disconnect();
            this.#observer = null;
        }
        this.#currentAmbientFilter = "none";
        this.#ambientSourceElement = null;
        this.#isAnalyzingAmbient = false;
        if (this.#actorsContainer) {
            this.#actorsContainer.style.filter = "none";
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "textbox") {
            if (oldValue !== newValue) {
            }
        }
    }

    /**
     * Updates the ambient source image if it has changed.
     */
    #updateAmbientSource() {
        let newAmbientSource = null;
        const imagesSlot = this.shadowRoot.querySelector('slot[name="images"]');
        if (imagesSlot) {
            const assignedImages = imagesSlot
                .assignedNodes({ flatten: true })
                .filter(
                    (node) =>
                        node.nodeType === Node.ELEMENT_NODE &&
                        node.matches('img[ambient][slot="images"]')
                );

            if (assignedImages.length > 0) {
                newAmbientSource = assignedImages[0];
                if (assignedImages.length > 1)
                    console.warn(
                        '<vn-scene>: Multiple <img ambient slot="images"> found. Using the first one.',
                        newAmbientSource
                    );
            }
        } else {
            console.warn(
                "<vn-scene>: Cannot find images slot for ambient source check."
            );
        }

        if (newAmbientSource) {
            const manualFilter = newAmbientSource.getAttribute(
                "data-ambient-filter"
            );
            if (manualFilter) {
                if (
                    manualFilter !== this.#currentAmbientFilter ||
                    newAmbientSource !== this.#ambientSourceElement
                ) {
                    this.#ambientSourceElement = newAmbientSource;
                    this.#currentAmbientFilter = manualFilter;
                    this.#applyAmbientFilter();
                }
            } else {
                const srcChanged =
                    this.#ambientSourceElement &&
                    newAmbientSource.getAttribute("src") !==
                        this.#ambientSourceElement.getAttribute("src");
                if (
                    newAmbientSource !== this.#ambientSourceElement ||
                    this.#currentAmbientFilter === "none" ||
                    srcChanged
                ) {
                    this.#ambientSourceElement = newAmbientSource;
                    this.#analyzeImageForAmbientFilter(newAmbientSource);
                }
            }
        } else {
            if (
                this.#currentAmbientFilter !== "none" ||
                this.#ambientSourceElement !== null
            ) {
                this.#ambientSourceElement = null;
                this.#currentAmbientFilter = "none";
                this.#applyAmbientFilter();
            }
        }
    }

    /**
     * Finds the average color of the image and generates a color filter based on its average color.
     * This operation happens on the CPU, so it compresses the image to 50x50 pixels and reads the pixels using a canvas.
     * @param {HTMLImageElement} imgElement - The image element to analyze.
     * @returns {Promise<void>} - A promise that resolves when the analysis is complete.
     * @throws {SecurityError} - If the image is cross-origin and lacks the appropriate CORS headers. This feature only works when the image is served from the same origin. 
     * Images served from a different origin must have the `crossorigin` attribute set to "anonymous" and the server must send the appropriate CORS headers.
     */
    async #analyzeImageForAmbientFilter(imgElement) {
        if (!imgElement || !imgElement.src || this.#isAnalyzingAmbient) return;
        this.#isAnalyzingAmbient = true;

        const img = new Image();
        const imageOrigin = new URL(imgElement.src, window.location.href).origin;

        // check for cors issues and warn the user
        if (imageOrigin !== window.location.origin) {
            if (!imgElement.hasAttribute("crossorigin")) {
                console.warn(
                    "VN-Scene: Ambient image is cross-origin and lacks 'crossorigin' attribute. Analysis may fail. Setting to 'Anonymous'.",
                    imgElement.src
                );
                img.crossOrigin = "Anonymous";
            } else {
                img.crossOrigin = imgElement.getAttribute("crossorigin");
            }
        } else if (imgElement.hasAttribute("crossorigin")) {
            img.crossOrigin = imgElement.getAttribute("crossorigin");
        }

        img.src = imgElement.src;
        let generatedFilter = "none";
        
        try {
            await img.decode();
            const canvas = document.createElement("canvas");
            const canvasSize = 50;
            canvas.width = canvasSize;
            canvas.height = canvasSize;
            const ctx = canvas.getContext("2d", {
                alpha: false,
                willReadFrequently: true,
            });
            if (!ctx)
                throw new Error(
                    "Could not get 2D canvas context for ambient analysis."
                );

            ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
            const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
            const data = imageData.data;
            let rSum = 0,
                gSum = 0,
                bSum = 0;
            const pixelCount = data.length / 4;

            if (pixelCount > 0) {
                for (let i = 0; i < data.length; i += 4) {
                    rSum += data[i];
                    gSum += data[i + 1];
                    bSum += data[i + 2];
                }
                const avgR = Math.round(rSum / pixelCount);
                const avgG = Math.round(gSum / pixelCount);
                const avgB = Math.round(bSum / pixelCount);
                const hsl = rgbToHsl(avgR, avgG, avgB);

                const brightness = (0.8 + hsl.l * 0.3).toFixed(2);
                const saturation = (0.8 + hsl.s * 0.4).toFixed(2);
                let sepia =
                    hsl.h >= 15 && hsl.h <= 65 && hsl.s > 0.15
                        ? (hsl.s * 0.15 + 0.05).toFixed(2)
                        : 0;

                generatedFilter = `brightness(${brightness}) saturate(${saturation})`;
                if (sepia > 0) generatedFilter += ` sepia(${sepia})`;
            } else {
                console.warn(
                    "VN-Scene: Could not analyze ambient image (no pixels?)."
                );
            }
        } catch (error) {
            if (error instanceof SecurityError) {
                console.error(
                    `VN-Scene: SecurityError analyzing ambient image (likely CORS). Ensure image server sends 'Access-Control-Allow-Origin' header or image has 'crossorigin="anonymous"'. Src: ${imgElement.src}`,
                    error
                );
            } else {
                console.error(
                    `VN-Scene: Error analyzing ambient image src: ${imgElement.src}`,
                    error
                );
            }
            generatedFilter = "none";
        } finally {
            if (this.#ambientSourceElement === imgElement) {
                this.#currentAmbientFilter = generatedFilter;
                this.#applyAmbientFilter();
            }
            this.#isAnalyzingAmbient = false;
        }
    }

    /**
     * Applies a pre-calculated filter based on an image's color. @see VNSceneElement.#analyzeImageForAmbientFilter
     */
    #applyAmbientFilter() {
        if (this.#actorsContainer) {
            this.#actorsContainer.style.setProperty(
                "--vn-ambient-filter",
                this.#currentAmbientFilter
            );
        }
    }

    /**
     * Processes child elements that reference a unique id that references some asset/definition
     * defined in the visual novel's project. In the DOM, this is the player's <vn-assets> element, a direct child of <vn-project>.
     */
    async #processAddedChildrenForUIDs(children) {
        await this.#playerPromise;

        const player = this.player;

        if (!player || typeof player.getAssetDefinition !== "function") {
            console.error("vn-scene cannot find player or player methods.");
            return;
        }

        let potentiallyChangedAmbient = false;

        for (const child of children) {
            if (
                !(child instanceof HTMLElement) ||
                child.hasAttribute("data-vn-processed")
            )
                continue;

            child.setAttribute("data-vn-processed", "");

            const tagNameLower = child.tagName.toLowerCase();
            let expectedSlot = null;
            let isUidBased = child.hasAttribute("uid");
            let definition = null;

            if (tagNameLower === "img") expectedSlot = "images";
            else if (tagNameLower === "vn-actor") expectedSlot = "";
            else if (tagNameLower === "text-box") expectedSlot = "textboxes";
            else if (tagNameLower === "audio" || tagNameLower === "video")
                expectedSlot = "media";
            else {
                expectedSlot = child.slot || "";
                for (const apiProp in this.#instanceAPI) {
                    // assign property to added node
                    Object.defineProperty(child, apiProp, {
                        get: () => this.#instanceAPI[apiProp],
                        set: (value) => {
                            throw new Error(
                                `Cannot set ${apiProp} on VNSceneElement instance.`
                            );
                        },
                        enumerable: true,
                        configurable: true,
                    });
                }
            }

            if (expectedSlot !== null && child.slot !== expectedSlot) {
                child.slot = expectedSlot;
                if (tagNameLower === "img" && child.hasAttribute("ambient"))
                    potentiallyChangedAmbient = true;
            }

            if (isUidBased) {
                const uid = child.getAttribute("uid");
                definition = player.getAssetDefinition(uid);

                if (!definition) {
                    console.error(
                        `vn-scene: Asset definition not found for uid "${uid}". Hiding element.`,
                        child
                    );
                    child.style.display = "none";
                    child.removeAttribute("data-vn-processed");
                    continue;
                }
                const defTagName = definition.tagName.toLowerCase();
                if (tagNameLower !== defTagName) {
                    console.error(
                        `vn-scene: Mismatched tags for uid "${uid}". Scene: <${tagNameLower}>, Def: <${defTagName}>. Hiding element.`,
                        child
                    );
                    child.style.display = "none";
                    child.removeAttribute("data-vn-processed");
                    continue;
                }

                try {
                    if (tagNameLower === "img") {
                        this.#configureImageInstance(child, definition);
                        if (child.hasAttribute("ambient"))
                            potentiallyChangedAmbient = true;
                    } else if (tagNameLower === "vn-actor") {
                        if (
                            typeof child.ensureInitialized === "function" &&
                            !child.isInitialized
                        ) {
                            child
                                .ensureInitialized()
                                .catch((e) =>
                                    console.error(
                                        `Scene: Error during ensureInitialized for actor ${uid}`,
                                        e
                                    )
                                );
                        }
                    } else if (tagNameLower === "text-box") {
                        if (
                            !child.hasAttribute("ref") &&
                            definition.hasAttribute("uid")
                        ) {
                            child.setAttribute(
                                "ref",
                                definition.getAttribute("uid")
                            );
                        }
                        if (
                            typeof child.ensureInitialized === "function" &&
                            !child.isInitialized
                        ) {
                            child
                                .ensureInitialized()
                                .catch((e) =>
                                    console.error(
                                        `Scene: Error during ensureInitialized for textbox ${uid}`,
                                        e
                                    )
                                );
                        }
                    } else if (
                        tagNameLower === "audio" ||
                        tagNameLower === "video"
                    ) {
                        this.#configureMediaInstance(child, definition);
                    } 
                } catch (error) {
                    console.error(
                        `vn-scene: Error configuring instance ${uid} from definition:`,
                        error,
                        child
                    );
                    child.style.display = "none";
                }
            } else {
                if (tagNameLower === "vn-actor") {
                    console.warn(
                        "<vn-actor> without uid in <vn-scene> will not be configured from assets.",
                        child
                    );
                } else if (
                    tagNameLower === "img" &&
                    child.hasAttribute("ambient")
                ) {
                    potentiallyChangedAmbient = true;
                }
            }

            if (tagNameLower === "style") {
                this.#handleAddStyleElement(child, definition);
            }

            child.removeAttribute("data-vn-processed");
        }

        if (potentiallyChangedAmbient && !this.#isAnalyzingAmbient) {
            requestAnimationFrame(() => this.#updateAmbientSource());
        }
    }

    /**
     * Handles image HTML elements being added to the shadow DOM.
     */
    #configureImageInstance(instance, definition) {
        instance.slot = "images";
        const defSrc = definition.getAttribute("src");
        if (defSrc && instance.getAttribute("src") !== defSrc) {
            instance.setAttribute("src", defSrc);
            if (instance === this.#ambientSourceElement)
                potentiallyChangedAmbient = true;
        }
        const instanceAttrs = new Set(
            Array.from(instance.attributes, (attr) => attr.name.toLowerCase())
        );
        const attrsToCopy = [
            "alt",
            "crossorigin",
            "loading",
            "ambient",
            "data-ambient-filter",
        ];
        for (const attrName of attrsToCopy) {
            if (
                definition.hasAttribute(attrName) &&
                !instanceAttrs.has(attrName)
            ) {
                instance.setAttribute(
                    attrName,
                    definition.getAttribute(attrName)
                );
                if (attrName === "ambient") potentiallyChangedAmbient = true;
            }
        }
        if (
            definition.hasAttribute("ambient") &&
            !instance.hasAttribute("ambient")
        ) {
            instance.setAttribute("ambient", "");
            potentiallyChangedAmbient = true;
        }
        const defStyle = definition.getAttribute("style");
        if (defStyle && !instance.hasAttribute("style")) {
            instance.setAttribute("style", defStyle);
        }
        let finalZ = instance.style.zIndex || instance.getAttribute("z-index");
        if (!finalZ || finalZ === "auto") {
            finalZ =
                definition.style.zIndex || definition.getAttribute("z-index");
        }
        if (finalZ && finalZ !== "auto") {
            instance.style.zIndex = finalZ;
        } else {
            instance.style.zIndex = "";
        }
    }

    /**
     * Handles media HTML elements (audio/video) being added to the shadow DOM and sets their attributes.
     */
    #configureMediaInstance(instance, definition) {
        instance.slot = "media";
        const defSrc = definition.getAttribute("src");
        if (defSrc && instance.getAttribute("src") !== defSrc) {
            instance.setAttribute("src", defSrc);
        }
        const instanceAttrs = new Set(
            Array.from(instance.attributes, (attr) => attr.name.toLowerCase())
        );
        const boolAttrsToCopy = ["autoplay", "loop", "muted", "controls"];
        for (const attrName of boolAttrsToCopy) {
            if (
                definition.hasAttribute(attrName) &&
                !instance.hasAttribute(attrName)
            ) {
                instance.setAttribute(attrName, "");
            }
        }
        const otherAttrsToCopy = ["preload", "crossorigin", "volume"];
        for (const attrName of otherAttrsToCopy) {
            if (
                definition.hasAttribute(attrName) &&
                !instanceAttrs.has(attrName)
            ) {
                instance.setAttribute(
                    attrName,
                    definition.getAttribute(attrName)
                );
            }
        }

        const defStyle = definition.getAttribute("style");
        if (defStyle && !instance.hasAttribute("style")) {
            instance.setAttribute("style", defStyle);
        }


    }

    /** Adds an element to the scene, assigning it to the correct slot. */
    addElement(element) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn(
                "VNScene.addElement: Invalid element provided.",
                element
            );
            return;
        }

        const tagName = element.tagName.toLowerCase();
        let targetSlot = "";
        let isAmbientImg = false;

        if (tagName === "img") {
            targetSlot = "images";
            if (element.hasAttribute("ambient")) isAmbientImg = true;
        } else if (tagName === "text-box") {
            targetSlot = "textboxes";
        } else if (tagName === "vn-actor") {
            targetSlot = "";
        } else if (tagName === "audio" || tagName === "video") {
            targetSlot = "media";
        } else if (tagName === "style") {
            targetSlot = "";
        } else {
            console.warn(
                `VNScene.addElement: Unsupported type "${tagName}". Adding to default slot.`
            );
            targetSlot = "";
        }

        if (!element.shadowRootTarget) {
            element.slot = targetSlot;

            this.appendChild(element);

            if (isAmbientImg) {
                requestAnimationFrame(() => {
                    if (!this.#isAnalyzingAmbient) this.#updateAmbientSource();
                });
            }

            if (element.tagName.toLowerCase() === 'audio') {
                const tryPlayAudio = () => {
                    setTimeout(() => {
                        element.play().catch((e) => {
                            console.warn(
                                `Autoplay for ${element.src} was blocked:`,
                                e.message
                            );

                            tryPlayAudio();
                        });
                    }, 1);
                }

                if (element.hasAttribute("volume")) {
                    const volume = parseFloat(element.getAttribute("volume"));
                    if (!isNaN(volume) && volume >= 0 && volume <= 1) {
                        element.volume = volume;
                    } else {
                        console.warn(
                            `VNScene.addElement: Invalid volume attribute "${element.getAttribute("volume")}" for audio element.`,
                            element
                        );
                    }

                }

                tryPlayAudio();
                
            }
        }
    }

    /** Removes an element from the scene. */
    removeElement(element) {
        if (element && element.parentElement === this) {
            const removingCurrentAmbient =
                element === this.#ambientSourceElement;

            this.removeChild(element);

            if (removingCurrentAmbient) {
                requestAnimationFrame(() => {
                    if (!this.#isAnalyzingAmbient) this.#updateAmbientSource();
                });
            }
        } else if (element) {
            console.warn(
                "VNScene.removeElement: Element is not a direct child or invalid.",
                element
            );
        } else {
            console.warn(
                "VNScene.removeElement: Invalid element provided.",
                element
            );
        }
    }

    /** Adds a <style> to the scene's shadow DOM. */
    #handleAddStyleElement(element, definition) {
        const uid = element.getAttribute("uid") || null;
        const existingStyle = this.shadowRoot.querySelector(
            `style[uid="${uid}"]`
        );

        let elementToAdd = definition?.cloneNode?.(true) || element;

        if (existingStyle) {
            console.warn(
                `VNScene: <style> with uid "${uid}" already exists in shadow DOM. Replacing style with:`,
                elementToAdd
            );
            existingStyle.replaceWith(elementToAdd);
        } else {
            console.log(
                `VNScene: Adding new <style> with uid "${uid}" to shadow DOM.`,
                elementToAdd
            );
            alert("Adding new style to shadow DOM.");
            this.shadowRoot.appendChild(elementToAdd);
        }
    }

    cloneDefaultTextbox(content = "", options = {
        attributes: {},
    }) {
        let newTextbox = null;
        const definitionUid = this.getAttribute("textbox");
        const player = this.player;

        if (definitionUid && player) {
            const definition = player.getAssetDefinition(definitionUid);
            if (definition && definition instanceof VNTextboxElement) {
                newTextbox = definition.cloneNode(true);
                
                for (const [key, value] of Object.entries(options.attributes)) {
                    if (value === null) {
                        newTextbox.removeAttribute(key);
                    } else {
                        newTextbox.setAttribute(key, value);
                    }
                }

                // don't allow the user to override this
                newTextbox.setAttribute("ref", definitionUid);
                newTextbox.textContent = content;
            } else {
                console.error(
                    `Scene: Textbox definition "${definitionUid}" not found or not a <text-box>. Falling back.`,
                    definition
                );

                return null;
            }
        }

        if (!newTextbox) {
            console.log("Scene: Creating default textbox instance.");
            newTextbox = document.createElement("text-box");
        }

        return newTextbox;
    }

    cloneDefaultChoicebox(content = "", options = {
        attributes: {},
    }) {
        let newTextbox = null;
        const definitionUid = this.getAttribute("choices");
        const player = this.player;

        if (definitionUid && player) {
            const definition = player.getAssetDefinition(definitionUid);
            if (definition && definition instanceof VNTextboxElement) {
                newTextbox = definition.cloneNode(true);
                
                for (const [key, value] of Object.entries(options.attributes)) {
                    if (value === null) {
                        newTextbox.removeAttribute(key);
                    } else {
                        newTextbox.setAttribute(key, value);
                    }
                }
                newTextbox.setAttribute("slot", "choices");
                newTextbox.setAttribute("choices", "");
                // don't allow the user to override this
                newTextbox.setAttribute("ref", definitionUid);
                newTextbox.textContent = content;
            } else {
                console.error(
                    `Scene: Textbox definition "${definitionUid}" not found or not a <text-box>. Falling back.`,
                    definition
                );

                return null;
            }
        }

        if (!newTextbox) {
            console.log("Scene: Creating default textbox instance.");
            newTextbox = document.createElement("text-box");
        }

        return newTextbox;
    }

    getDefaultChoicebox() {
        const choicebox = this.cloneDefaultChoicebox();
        return choicebox;
    }

    /** 
     * Creates a new VNTextboxElement instance based on the scene's 'textbox' definition attribute.
     * @returns {VNTextboxElement | null} The new textbox instance.
     */
    acquireTextbox() {
        const newTextbox = this.cloneDefaultTextbox();
        this.addElement(newTextbox);
        return newTextbox;
    }

    /** Removes all elements from a specific layer (slot). */
    clearLayer(layerName) {
        let slotNameToClear = null;
        switch (layerName.toLowerCase()) {
            case "images":
                slotNameToClear = "images";
                break;
            case "actors":
                slotNameToClear = "";
                break;
            case "textboxes":
                slotNameToClear = "textboxes";
                break;
            case "media":
                slotNameToClear = "media";
                break;
            default:
                console.warn(
                    `VNScene.clearLayer: Unknown layer name "${layerName}"`
                );
                return;
        }

        const elementsToRemove = [...this.children].filter(
            (child) => child.slot === slotNameToClear
        );
        let removingAmbient = false;

        elementsToRemove.forEach((el) => {
            if (el === this.#ambientSourceElement) removingAmbient = true;
            this.removeChild(el);
        });

        if (removingAmbient) {
            requestAnimationFrame(() => {
                if (!this.#isAnalyzingAmbient) this.#updateAmbientSource();
            });
        }
    }

    /** Removes all child elements from the scene. */
    clearAll() {
        let removingAmbient = false;
        if (this.#ambientSourceElement?.parentElement === this)
            removingAmbient = true;

        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        if (removingAmbient) {
            requestAnimationFrame(() => {
                if (!this.#isAnalyzingAmbient) this.#updateAmbientSource();
            });
        }
    }

    /** @type {VNPlayerElement | null} */
    get player() {
        return this.closest("vn-player");
    }
    /** @type {VNProjectElement | null} */
    get project() {
        return this.player?.getProject();
    }
}

customElements.define("vn-scene", VNSceneElement);
