/**
 * @file vn-layer.js
 * Implements the VNBodyPartElement custom element.
 * Acts as a container for different state images (<img> elements) of a specific part of an actor.
 */
export default class VNBodyPartElement extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        
    }

    disconnectedCallback() {
        // Cleanup if needed
    }

    static get observedAttributes() {
        return ['uid'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        
    }

    /**
     * Gets the unique identifier for this vn-layer.
     * @returns {string | null}
     */
    get uid() {
        return this.getAttribute('uid');
    }
  
    /**
     * Retrieves all image definitions (states) within this vn-layer.
     * @returns {NodeListOf<HTMLImageElement>} A NodeList of the direct <img> children with 'uid' attributes.
     */
    getImageDefinitions() {
        // Ensure we only get direct children that are images with UIDs
        return this.querySelectorAll(':scope > img[uid]');
    }

    /**
     * Retrieves a specific image definition (state) by its UID.
     * @param {string} stateUid - The UID of the state image to find.
     * @returns {HTMLImageElement | null} The image element or null if not found.
     */
    getImageDefinition(stateUid) {
        return this.querySelector(`:scope > img[uid="${stateUid}"]`);
    }

    /**
     * Retrieves a specific image definition (state) by its trigger.
     * @param {string} trigger - The trigger of the state image to find.
     * @returns {HTMLImageElement | null} The image element or null if not found.
     */
    getImageByTrigger(trigger) {
        return this.querySelector(`:scope > img[trigger="${trigger}"]`)
    }
}

customElements.define('vn-layer', VNBodyPartElement);