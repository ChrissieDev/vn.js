import VNStyle from "../../components/vn-style.js";
import { VNCommand } from "../VNCommand.js";

/**
 * Represents a command to inject a style into the scene's shadow DOM.
 */
export default class VNCommandStyle extends VNCommand {

    /**
     * Creates a new VNCommandStyle instance.
     * @param {string} style - The style to inject.
     */
    constructor(queue, style) {
        super(queue);
        this.style = style;
    }

    /**
     * Using a string literal, add a custom CSS style to the scene.
     * @param {string} style - The style string.
     */
    injectStyleStringLiteral(style) {
        const scene = this.player.scene;
        const styleElement = document.createElement("style");
        styleElement.textContent = style;
        scene.shadowRoot.appendChild(styleElement);
    }

    /**
     * Use the key-value pairs of the object to inject custom CSS styles.
     * @param {object} style - The style object.
     */
    injectStyleObjectLiteral(style) {
        const scene = this.player.scene;
    }

    /**
     * Inject a `<style>` element into the scene.
     * @param {HTMLStyleElement} style 
     */
    injectStyleElement(style) {
        const scene = this.player.scene;
    }

    /**
     * Inject a `<vn-style>` element into the scene.
     * @param {import("../../components/vn-style.js").default} style 
     */
    injectVNStyle(style) {
        const scene = this.player.scene;
    }

    async execute() {
        // immediately resolve the promise since this operation is synchronous
        return new Promise((resolve) => {
            
            const style = this.style;

            if (typeof style === "string") {
                this.injectStyleStringLiteral(style);
            } else if (typeof style === "object") {
                this.injectStyleObjectLiteral(style);
            } else if (style instanceof HTMLStyleElement) {
                this.injectStyleElement(style);
            } else if (style instanceof VNStyle) {
                this.injectVNStyle(style);
            } else {
                throw new Error(`Invalid style type: ${typeof style}`);
            }

            resolve();
        });
    }
}