import { Log } from "../utils/log.js";

/**
 * General component for injecting styles into any shadow DOM.
 */
export default class VNStyle extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none;
                }
            </style>
            <slot></slot>
        `;
    }

    connectedCallback() {

        const findClosestShadowHost = (element) => {
            // Traverse up the DOM tree to find the closest shadow host
            while (element) {
                if (element.shadowRoot) {
                    return element;
                }
                console.log("Checking element:", element);
                element = element.parentElement;

            }

            console.log(element);

            return null;

        }
        
        const parent = findClosestShadowHost(this.parentNode);

        if (parent && parent.shadowRoot) {
            const style = document.createElement("style");
            style.textContent = this.innerHTML;
            this.parentElement.shadowRoot.appendChild(style);
            Log.color("lightgreen").italic()`[VNStyle] <vn-style> styles applied to shadow DOM.`;
        } else {
            Log.color("#ff6666").italic()
            `[VNStyle] <vn-style> must be a child of a shadow DOM element to apply styles.`
            `Element: ${this.parentElement.tagName} does not have a shadow DOM.`;
            this.remove();
        }
    }
}

customElements.define("vn-style", VNStyle);