import {Log} from "../utils/log.js";

export default class VNScene extends HTMLElement {
    
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --background: #777;
                    position: relative; /* Crucial for absolutely positioned children */
                    width: 100%;
                    max-width: 100%;
                    max-height: 100%;
                    aspect-ratio: 16 / 9;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    background: var(--background, #777);
                    place-self: center;
                    overflow: hidden;
                }

                .layer {
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                .objects { 
                    z-index: 2; 
                    position: relative; 
                    display: flex;
                    flex-flow: row nowrap; 
                    align-items: flex-end; 
                    justify-content: center;
                    gap: 2%; 
                    width: 100%; 
                    height: 100%; 
                    padding: 0 5%;
                    box-sizing: border-box; 
                    filter: var(--vn-objects-filter, drop-shadow(2px 2px 3px rgba(0,0,0,0.4))); 
                }

                .textboxes {
                 
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 3; 
                    
                }

                .hidden-slot {
                    display: none !important;
                }

                ::slotted(:not([slot])) {
                    display: none !important;
                }
                ::slotted(*) {
                    pointer-events: auto;
                }
                ::slotted(vn-object[slot="scene-objects"]) {
                    display: flex; 
                    flex-direction: column; 
                    justify-content: flex-end; 
                    align-items: center; 
                }

            </style>
            
            <div class="hidden-slot">
                <slot></slot>
            </div>
            
            <!-- objects and images go here -->
            <div class="objects layer"> 
                <slot name="scene-objects"></slot> 
            </div>

            <!-- always on top of objects -->
            <div class="textboxes layer"> 
                <slot name="textboxes"></slot>
            </div>
        `;
    }

    /**
     * @type {import("./vn-project.js").default}
     */
    project = null;

    /**
     * VNScene is a child of VNPlayer.
     * @type {import("./vn-player.js").default}
     */
    get player() {
        return this.closest("vn-player");
    }

    connectedCallback() {
        Log.color("lightgreen").italic()`[${this}] attached to the DOM.`;
        const player = this.closest("vn-player");

        if (!player) {
            Log.color("red").italic()`[VNScene]` + ` No VNPlayer found.`;
            throw new Error("VNScene: No VNPlayer found.");
        }
        
        const project = player.querySelector("vn-project");

        if (!project) {
            Log.color("red").italic()`[VNScene]` + ` No VNProject found.`;
            throw new Error("VNScene: No VNProject found.");
        }

        this.project = project;

        this.#mutObserver.observe(this, {
            childList: true,
            attributes: true, 
            subtree: true, 
        });
    }

    #mutObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.getAttribute("slot") === null) { 
                            let nodeToProcess = node;

                            if (!node.hasAttribute("cloned") && node.hasAttribute("uid")) {
                                const cloned = this.project.cloneObjectDefinition(node.getAttribute("uid"));
                                if (cloned) {
                                    cloned.setAttribute("cloned", "");
                                    for (const attr of node.attributes) {
                                        if (!cloned.hasAttribute(attr.name)) {
                                            cloned.setAttribute(attr.name, attr.value);
                                        }
                                    }
                                    node.replaceWith(cloned);
                                    nodeToProcess = cloned; 
                                }
                            }

                            const tagName = nodeToProcess.tagName.toLowerCase();
                            const layoutAttr = nodeToProcess.getAttribute("layout");
                            const zValue = nodeToProcess.getAttribute("z");

                            // Default slot for all visual scene elements
                            let targetSlot = "scene-objects";

                            switch(tagName) {
                                case 'vn-project':
                                case 'vn-scene':
                                    nodeToProcess.remove();
                                    continue; // Skip further processing for removed nodes
                                case "text-box":
                                    targetSlot = "textboxes";
                                    break;
                                // No special cases for vn-object or img for slotting anymore, they all go to scene-objects
                            }
                            nodeToProcess.setAttribute("slot", targetSlot);

                            // Apply z-index and default positioning for images intended as backgrounds
                            if (targetSlot === "scene-objects") {
                                if (zValue !== null) {
                                    nodeToProcess.style.zIndex = zValue;
                                } else if (tagName === "img") { 
                                    nodeToProcess.style.zIndex = "-1"; // Default images to background
                                }

                                // MODIFIED: Apply absolute positioning for images not explicitly 'flex' and likely backgrounds
                                if (tagName === "img" && layoutAttr !== "flex") {
                                    // Assume images not explicitly 'flex' are for absolute positioning (e.g. backgrounds)
                                    // The inline style on the classroom-front-day image in HTML currently handles this.
                                    // If we want the engine to do it, this is where it would happen.
                                    // For now, we rely on the project definition to style full backgrounds.
                                    // However, we ensure `position: absolute` if it's not a flex item.
                                    if (!nodeToProcess.style.position || nodeToProcess.style.position === "static") {
                                        nodeToProcess.style.position = "absolute";
                                    }
                                    // If it's a background image like 'classroom-front-day', its existing inline styles
                                    // (width:100%, height:100%, top:0, left:0, object-fit:cover) are preserved from the project.
                                } else if (tagName === "vn-object" && layoutAttr === "absolute") {
                                    // If a vn-object is explicitly layout="absolute"
                                    if (!nodeToProcess.style.position || nodeToProcess.style.position === "static") {
                                        nodeToProcess.style.position = "absolute";
                                    }
                                    // User is responsible for top/left/width/height via style or attributes
                                }
                                // vn-objects without layout="absolute" will be flex items by default.
                            }
                        }   
                    }
                }
            }
        }
    });

    getObject(uid) {
        // MODIFIED: Query from the correct slot
        const object = this.querySelector(`[slot="scene-objects"][uid="${uid}"]`); 

        if (object) {
            return object;
        } else {
            // Also check textboxes slot if it might be a textbox UID
            const textbox = this.querySelector(`[slot="textboxes"][uid="${uid}"]`);
            if (textbox) return textbox;

            Log.color("yellow")`[VNScene.getObject] Not found in active scene: ${uid}`;
            return null;
        }
    }

    removeObject(target) {
        if (typeof target === "string") {
            const object = this.getObject(target);
            if (object) {
                object.remove();
            } else {
                Log.color("yellow")`[VNScene]` + ` Could not remove object with uid ${target} from scene.`;
                return false;
            }
        } else if (target instanceof HTMLElement) {
            target.remove();
        } else {
            Log.color("red")`${"error"}[VNScene.removeObject] cannot remove object of type ${target?.constructor?.name || typeof target}`;
        }

        return true;
    }
}

customElements.define("vn-scene", VNScene);