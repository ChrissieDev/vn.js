/**
 * Represents a key-value configuration object for any configurable vn.js element.
 * Uses <meta> children with 'name' and 'content' attributes to store its properties.
 * The 'itemprops' attribute is set by this component, primarily as a marker,
 * and is not actively used for microdata interpretation by this component itself.
 * Watches for mutations to its <meta> children and their attributes to track changes
 * and dispatches a 'propertieschange' event.
 */
export default class VNConfig extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none !important;
                }
            </style>
            <slot></slot>
        `;
    }

    /**
     * Gets all properties as an object.
     * @returns {Object<string, string|null>} A snapshot of the current properties.
     */
    get properties() {
        return this.getProperties();
    }

    /**
     * Prevents direct setting of the properties object.
     * @throws {Error} Always.
     */
    set properties(value) {
        throw new Error("Cannot set properties directly. Use setProperty(), removeProperty(), or add/remove/modify <meta> children within this element.");
    }

    /**
     * Dispatches a 'propertieschange' event with the current properties.
     * @private
     */
    #dispatchPropertiesChange() {
        const currentProperties = this.getProperties();
        this.dispatchEvent(new CustomEvent('propertieschange', {
            bubbles: true, // Allows event to bubble up the DOM tree
            composed: true, // Allows event to cross shadow DOM boundaries
            detail: { properties: currentProperties }
        }));
    }

    #mutObserver = new MutationObserver((mutations) => {
        let relevantChangeDetected = false;
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                const relevantAdded = Array.from(mutation.addedNodes).some(
                    node => node.nodeName === "META" && node.parentElement === this && node.hasAttribute("name")
                );
                // For removed nodes, we check if any <meta> tag was removed.
                // We don't need to check parentElement (it's null) or if it had a 'name' attribute,
                // as getProperties() will correctly reflect the state after removal.
                const relevantRemoved = Array.from(mutation.removedNodes).some(
                    node => node.nodeName === "META"
                );
                if (relevantAdded || relevantRemoved) {
                    relevantChangeDetected = true;
                    break; // Exit early if a relevant childList change is found
                }
            } else if (mutation.type === "attributes") {
                // Check if the mutation target is a direct <meta> child of this element
                // and if 'name' or 'content' attribute was changed.
                if (mutation.target.nodeName === "META" &&
                    mutation.target.parentElement === this &&
                    (mutation.attributeName === "name" || mutation.attributeName === "content")) {
                    relevantChangeDetected = true;
                    break; // Exit early if a relevant attribute change is found
                }
            }
        }

        if (relevantChangeDetected) {
            this.#dispatchPropertiesChange();
        }
    });

    connectedCallback() {
        const itemProps = this.getAttribute("itemprops");
        // Ensures 'itemprops' attribute is present, mainly as a marker.
        if (itemProps === null) {
            this.setAttribute("itemprops", "");
        }

        this.#mutObserver.observe(this, {
            childList: true, // Observe direct children additions/removals.
            subtree: true,   // Needed to observe attributes on children (like <meta>).
            attributes: true, // Observe attribute changes.
            attributeFilter: ['name', 'content'], // Only observe 'name' and 'content' attribute changes.
                                                  // This filter applies to 'this' element and its descendants.
                                                  // The callback logic correctly targets only <meta> children.
        });

        // Dispatch initial state if properties exist declaratively.
        // This ensures that consumers are notified of properties present at connection time.
        const initialProperties = this.getProperties();
        if (Object.keys(initialProperties).length > 0) {
            // Use queueMicrotask to allow consumers to attach event listeners
            // synchronously after element creation/connection and before this event fires.
            queueMicrotask(() => {
                this.#dispatchPropertiesChange();
            });
        }
    }

    disconnectedCallback() {
        this.#mutObserver.disconnect();
    }

    /**
     * Retrieves all properties from <meta> child elements.
     * @returns {Object<string, string|null>} An object where keys are 'name' attributes
     * and values are 'content' attributes of <meta> children.
     * Returns an empty object if no valid <meta> properties are found.
     */
    getProperties() {
        const properties = {};
        // Iterate over direct children of this element
        for (const child of this.children) {
            // Only consider <meta> elements that have a 'name' attribute.
            if (child.nodeName === "META" && child.hasAttribute("name")) {
                const name = child.getAttribute("name");
                // An empty name attribute (name="") is a valid key.
                // If content attribute is missing, getAttribute returns null.
                properties[name] = child.getAttribute("content");
            }
        }
        return properties;
    }

    /**
     * Sets a property by creating or updating a <meta> child element.
     * This DOM change will be picked up by the MutationObserver,
     * which will then trigger a 'propertieschange' event.
     * @param {string} name - The name of the property. Must be a string.
     * @param {any} value - The value of the property. Will be converted to a string.
     */
    setProperty(name, value) {
        if (typeof name !== 'string') {
            console.warn("VNConfig: Property name must be a string. Received:", name);
            return;
        }
        // Query for a <meta> element that is a direct child (':scope >') with the given name.
        let meta = this.querySelector(`:scope > meta[name="${name}"]`);

        const stringValue = String(value); // Ensure content is always a string

        if (meta) {
            meta.setAttribute("content", stringValue);
        } else {
            const newMeta = document.createElement("meta");
            newMeta.setAttribute("name", name);
            newMeta.setAttribute("content", stringValue);
            this.appendChild(newMeta);
        }
        // The MutationObserver will detect this change and dispatch the 'propertieschange' event.
    }

    /**
     * Retrieves a single property value by its name.
     * @param {string} name - The name of the property. Must be a string.
     * @returns {string|null} The value of the property as a string,
     * or null if the property is not found or its 'content' attribute is missing.
     */
    getProperty(name) {
        if (typeof name !== 'string') {
            console.warn("VNConfig: Property name must be a string. Received:", name);
            return null;
        }
        const meta = this.querySelector(`:scope > meta[name="${name}"]`);

        if (meta) {
            return meta.getAttribute("content"); // Returns null if 'content' attribute is not set.
        } else {
            return null;
        }
    }

    /**
     * Removes a property by removing the corresponding <meta> child element.
     * This DOM change will be picked up by the MutationObserver,
     * which will then trigger a 'propertieschange' event.
     * @param {string} name - The name of the property to remove. Must be a string.
     */
    removeProperty(name) {
        if (typeof name !== 'string') {
            console.warn("VNConfig: Property name must be a string. Received:", name);
            return;
        }
        const meta = this.querySelector(`:scope > meta[name="${name}"]`);
        if (meta) {
            this.removeChild(meta);
        }
        // The MutationObserver will detect this change and dispatch the 'propertieschange' event.
    }
}

customElements.define("vn-config", VNConfig);