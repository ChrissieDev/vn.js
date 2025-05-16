import { Log } from "../utils/log.js";

export default class VNProject extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none;
                }
            </style>
            <slot></slot>
        `;
    }

    /**
     * VNProject is a child of vn-player.
     */
    get player() {
        return this.closest("vn-player");
    }

    getObjectDefinition(uid) {
        const object = this.querySelector(`& > [uid="${uid}"]`);

        if (object) {
            return object;
        } else {
            console.warn(`VNProject: Object with uid ${uid} not found.`);
            return null;
        }
    }

    /**
     * Looks for an element with the given uid in the project and returns a clone of it.
     * @param {HTMLElement} uid 
     * @returns {HTMLElement | null}
     */
    cloneObjectDefinition(uid) {
        const target = this.getObjectDefinition(uid);

        if (target === null) {
            Log.color("red").italic()`[VNProject]` + ` Object with uid ${uid} not found.`;
            return null;
        }

        return target.cloneNode(true);
    }
}

customElements.define('vn-project', VNProject);