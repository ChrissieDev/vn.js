/**
 * @summary Injects a new style into the VNSceneElement's shadow DOM.
 */
import VNCommand from "../VNCommand.js";

export default class VNCommandStyle extends VNCommand {
    type = 'style';

    constructor(queue, style = '') {
        super(queue);
    }

    execute() {
        const { player, args } = this;
        const style = document.createElement('style');
        style.textContent = args[0];
        player.shadowRoot.appendChild(style);
        return true;
    }

}