import { Log } from "../utils/log.js";

export default class VNScript extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ["src", "href"];
    }
  
    /**
     * Reference to the VNPlayer instance.
     * @type {VNPlayer}
     */
    get player() {
        return this.scene?.player;
    }

    connectedCallback() {
        Log.color("lightgreen").italic()`[${this}] attached to the DOM.`;

        /**
         * @type {import("./vn-player.js").default}
         */
        const player = this.closest("vn-player");

        if (player === null) {
            Log.color("red") `[${this}] <vn-script> must be a descendant of <vn-player>.` `Removing...`;
            this.remove(); 
        }

        const src = this.getAttribute("src") || this.getAttribute("href");
        
        if (src !== null) {
            this.#fetchScript(src).then(async (result) => {
                const text = await result.text();
                
                if (!text) {
                    Log.color("red")`[${this}] Failed to load script: ${src}`;
                    this.remove();
                    return;
                }

                Log.color("lightgreen").italic()`[${this}] Script loaded successfully.`;
                player.runScene(text);
            });  
        }
    }

    async #fetchScript(src) {
        Log.color("lightgreen").italic()`[${this}] loading script from ${src}.`;

        const response = await fetch(src);
        
        if (!response.ok) {
            Log.color("red")`[${this}] Failed to fetch script: ${src}`;
            this.remove();
            return;
        }

        return response;
    }

    [Symbol.toStringTag]() {
        return "VNScript";
    }
}
customElements.define("vn-script", VNScript);