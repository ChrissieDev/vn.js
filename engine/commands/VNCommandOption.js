import VNCommandModule from "../VNCommand.js";
import { VNCommandQueue } from "../VNCommand.js"; // Direct import for clarity
import { Log } from "../../utils/log.js";

export default class VNCommandOption extends VNCommandModule.VNCommand {
    type = "option";
    string = "[No Text]";
    innerQueue = null;

    /**
     * @param {VNCommandModule.VNCommandQueue} queue The parent queue this command belongs to.
     * @param {string} string The text or HTML for the option button.
     * @param {Array<VNCommandModule.VNCommand | object | string | Function>} commands Commands to execute if this option is chosen.
     */
    constructor(queue, string = "[No Text]", ...commands) {
        super(queue);
        this.string = string;
        // The innerQueue's commands need to be parsed by the main parser logic
        // The player instance for the new queue should be the same as the current command's player
        this.innerQueue = new VNCommandQueue(this.player, () => true, commands); // Pass commands directly
        // VNCommandQueue's constructor calls parseCommands internally.
    }

    /**
     * Attempts to parse the string as HTML.
     * @returns {DocumentFragment | null} A DocumentFragment if HTML is valid, otherwise null.
     */
    #tryParseAsHTML() {
        if (typeof this.string !== 'string') return null;
        const trimmed = this.string.trim();
        if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
            try {
                const fragment = document.createRange().createContextualFragment(trimmed);
                if (fragment.children.length > 0) {
                    return fragment;
                }
                // Also consider text nodes if they are part of HTML structure like "<em>text</em>"
                if (fragment.childNodes.length > 0 && Array.from(fragment.childNodes).some(n => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== ''))) {
                    return fragment;
                }
            } catch (e) {
                Log.warn(`[VNCommandOption] Failed to parse string as HTML: "${this.string}"`, e);
                return null;
            }
        }
        return null;
    }

    /**
     * VNCommandOption is primarily a data container for VNCommandChoose.
     * It does not execute directly in the command queue flow.
     * @returns {Promise<any>}
     */
    async execute() {
        // This should ideally not be called. VNCommandChoose handles options.
        Log.warn(`[VNCommandOption] execute() called directly. This command is meant to be used within a CHOOSE command.`);
        return Promise.resolve();
    }
}