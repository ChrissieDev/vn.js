/**
 * A hidden configuration DOM element that exists inside a \<vn-alias> element and represents a single object to toggle on when its parent alias' trigger is invoked.
 * You usually group multiple \<vn-show> elements together inside a \<vn-alias> element to simultaneously toggle visibility of multiple elements.
 */
export default class VNShow extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none !important;
                }
            </style>
            <slot></slot>
        `;
    }
}

customElements.define("vn-show", VNShow);