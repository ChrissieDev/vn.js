/**
 * @file vn-project.js
 * Implements the VNProjectElement custom element.
 * Contains project metadata and the <vn-assets> definitions.
 */
import "./vn-assets.js";

export default class VNProjectElement extends HTMLElement {
    #assetsElement = null;
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
        this.#findAssetsElement();
        this.#parseMetadata();
    }

    disconnectedCallback() {
        this.#assetsElement = null;
        this.#metadata = {};
    }

    #findAssetsElement() {
        this.#assetsElement = this.querySelector("vn-assets");
        if (!this.#assetsElement) {
            console.warn(
                "<vn-project> is missing its <vn-assets> child element."
            );
        } 
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
     * Retrieves the VNAssetsElement instance associated with this project.
     * @returns {VNAssetsElement | null}
     */
    getAssetsElement() {
        return this.#assetsElement;
    }

    /**
     * Finds an asset definition element within the <vn-assets> container by its uid.
     * @param {string} uid - The unique identifier of the asset definition.
     * @returns {Element | null} The definition element or null if not found.
     */
    getAssetDefinition(uid) {
        if (!this.#assetsElement) {
            console.error(
                "<vn-project> cannot find assets: <vn-assets> element is missing."
            );
            return null;
        }
        return this.#assetsElement.getDefinition(uid);
    }
}

customElements.define("vn-project", VNProjectElement);
