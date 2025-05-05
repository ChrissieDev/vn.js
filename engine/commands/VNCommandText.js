import VNCommand from '../VNCommand.js';
/**
 * The command when the user wants to display a text box with no speaker/title.
 */
export default class VNCommandText extends VNCommand {
    type = 'text';
    content = '';

    constructor(queue, text) {
        super(queue);
        this.content = text;
    }

    execute() {
        console.log("API: Executing TEXT command.");

        if (typeof this.content !== 'string' || !(this.content instanceof Element)) {
            console.error("VNCommandText: Text must be a string or an Element.");
            return true; // Skip command if content is invalid
        }

        const textBox = this.queue.scene.cloneTextbox(this.content);

        this.queue.scene.appendChild(textBox);

        return false; // don't continue until the text box is closed
    }
}