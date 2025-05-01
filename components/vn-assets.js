/**
 * @file vn-assets.js
 * Implements the VNAssetsElement custom element.
 * This element acts as a container for asset definitions within a <vn-project>.
 */
export default class VNAssetsElement extends HTMLElement {
    constructor() {
        super();
    }
 
    connectedCallback() {}

    disconnectedCallback() {}

    /**
     * Finds a direct child element with the specified 'uid' attribute.
     * @param {string} uid - The unique identifier of the asset definition.
     * @returns {Element | null} The definition element or null if not found.
     */
    getDefinition(uid) {
        return this.querySelector(`:scope > [uid="${uid}"]`);
    }
}

customElements.define("vn-assets", VNAssetsElement);
