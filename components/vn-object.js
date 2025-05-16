/**
 * @file vn-object.js
 * Contains a class which represents any visual object in the <vn-scene>.
 */
export default class VNObject extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    object-position: center bottom;
                }

                ::slotted(img) {
                    width: 100%;
                    height: 100%;
                    display: block;
                    margin: 0;
                    padding: 0;
                    pointer-events: none;
                    object-fit: cover;
                    object-position: center bottom;
                }
            </style>
            <slot></slot>
        `;
    }

    connectedCallback() {

    }
}

customElements.define('vn-object', VNObject);