/**
 * @file vn-sprite.js
 * Implements the VNBodyPartElement custom element.
 * Acts as a container for different state images (<img> elements) of a specific part of an actor.
 */
export default class VNSpriteElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: relative;
                    width: 100%;
                    height: 100%;
                }

                :host([active]) {
                    display: block;
                }

                ::slotted(img) {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform-origin: center bottom;
                }
            </style>
            <slot></slot>
        `;
    }

    static get observedAttributes() {
        return ['name', 'variant', 'show']
    }

    attributeChangedCallback(attributeName, oldValue, newValue) {
        if (attributeName.startsWith(':')) {
            this.showVariant(attributeName.slice(1));
        }
    }

    connectedCallback() {
        const showAttributes = Array.from(this.attributes).filter(attr => attr.name.startsWith(':'));

        for (const prefixedName of showAttributes) {
            const name = prefixedName.name.slice(1);
            const variant = this.getAttribute(prefixedName); // :pose="happy"
            this.showVariant(name, variant);
        }
    }

    showVariantsUsingTriggers(triggers = []) {
        if (triggers.length === 0) {
            return;
        }

        const variantElement = this.shadowRoot.querySelector(`::slotted(vn-sprite[trigger="${triggers[0]}"])`);
        const variant = variantElement.getAttribute("variant");
        const name = variantElement.getAttribute("name");

    }
    
    /**
     * Change which child variant is displayed.
     * @param {string} name 
     * @param {string} variant 
     * @returns {VNSpriteElement | null}
     */
    showVariant(name, variant = '') {
        const variants = this.getVariantsOf(name);

        // toggle on/off only variants that have the specified 'name' attribute
        for (_variant of variants) {
            if (_variant.getAttribute('variant') === variant) {
                _variant.setAttribute('active', "");
                console.log("Adding attribute 'show' of", _variant);
                return _variant;
            } else {
                _variant.removeAttribute('active');
                console.log("Removing attribute 'show' of", _variant);
            }
        }

        return null;
    }

    /**
     * @returns {Array<HTMLElement>}
     */
    getVariantsOf(name) {
        return this.shadowRoot.querySelector('slot')
            .assignedNodes()
            .filter(node => 
                node instanceof VNSpriteElement &&
                node.getAttribute(name) !== null
            );
    }
}

customElements.define('vn-sprite', VNSpriteElement);
