/**
 * Represents a hierarchical sprite element used to display images that need to be toggled on and off,
 * either manually or by invoking an alias associated with the sprite.
 */
export default class VNSprite extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    /* no fouc, be invisible until show is set */
                    display: none !important;
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    object-fit: cover;
                    pointer-events: none;
                    transform-origin: center bottom;
                }
                
                :host([show]) {
                    display: block;
                }
            </style>
            <slot></slot>
        `;
    }

    connectedCallback() {

    }
}