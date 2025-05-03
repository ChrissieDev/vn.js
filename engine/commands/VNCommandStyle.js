/**
 * @summary Injects a new style into the VNSceneElement's shadow DOM.
 */
import VNCommand from "../VNCommand.js";
import html from '../../utils/html.js';

export default class VNCommandStyle extends VNCommand {
    type = 'style';

    constructor(queue, style = '') {
        super(queue);
    }

    execute() {
        
        return true;
    }

}