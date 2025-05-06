/**
 * @file vn-project.js
 * Implements the VNProjectElement custom element.
 * Contains project metadata and the <vn-project> definitions.
 */
import "./vn-project.js";

export default class VNProjectElement extends HTMLElement {
    #metadata = {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    & {
                        display: none !important;
                    }
                }
            </style>
            <slot></slot>
        `;
    }

    connectedCallback() {
        this.#parseMetadata();
    }

    disconnectedCallback() {
        this.#metadata = {};
    }
  
    #parseMetadata() {
        const metaTags = this.querySelectorAll("meta[itemprop]");
        this.#metadata = {};
        metaTags.forEach((tag) => {
            const key = tag.getAttribute("itemprop");
            const value = tag.getAttribute("content");
            if (key && value) {
                this.#metadata[key] = value;
            }
        });
    }

    /**
     * Retrieves the parsed project metadata.
     * @returns {object} An object containing the project metadata (e.g., { name: '...', description: '...' }).
     */
    getMetadata() {
        return { ...this.#metadata };
    }

    /**
     * NEW: Removed <vn-project>, assets are now directly inside <vn-project>.
     * Retrieves the VNAssetsElement instance associated with this project.
     * @returns {VNAssetsElement | null}
     */
    getAssetsElement() {
        return this;
    }

    /**
     * Finds an asset definition element within the <vn-project> container by its uid.
     * @param {string} uid - The unique identifier of the asset definition.
     * @returns {Element | null} The definition element or null if not found.
     */
    getAssetDefinition(uid) {
        return this.querySelector(`:scope > [uid="${uid}"]`);
        
    }
}

customElements.define("vn-project", VNProjectElement);
