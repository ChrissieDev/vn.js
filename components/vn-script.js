import VNPlayerElement from "./vn-player.js";
import VNPlayerScene from "./vn-scene.js";

export default class VNScriptElement extends HTMLElement {
    
    /**
     * Reference to the running VNPlayerScene instance.
     * @type {VNPlayerScene}
     */
    scene = null;

    constructor() {
        super();
    }

    static get observedAttributes() {
        return ["src"];
    }
  
    /**
     * Reference to the VNPlayer instance.
     * @type {VNPlayerElement}
     */
    get player() {
        return this.scene?.player;
    }

    connectedCallback() {
        console.log("VNScriptElement: connectedCallback called.");
        this.scene = this.closest("vn-scene");

        if (!(this.scene instanceof VNPlayerScene)) {
            throw new Error("VNScriptElement must be a child of VNSceneElement.");
        }

        this.#fetchScript(this.getAttribute("src")).then((script) => {
            const text = script.trim();
            if (text.length === 0) {
                console.warn("VNScriptElement: Script is empty.");
            }

            this.player.runScript(text);
        }).catch((error) => {
            console.error("Failed to fetch script:", error);
            this.player.dispatchEvent(new VNScriptErrorEvent("vn-script-error", {
                detail: { error, scriptUrl: this.getAttribute("src") }
            }));
        });
    }

    async #fetchScript(url) {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch script: ${response.statusText}`);
        }

        console.log(`VNScriptElement: Fetched script from ${url}`);

        const text = await response.text();

        return text;
    }
}

class VNScriptErrorEvent extends CustomEvent {
    constructor(type, options) {
        super(type, options);
        this.detail = options.detail || null;
    }
}

customElements.define("vn-script", VNScriptElement);