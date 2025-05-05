import VNCommand from "../VNCommand.js";
import VNCommandQueue from "../VNCommandQueue.js";
// forgot about the queue system lol

export default class VNCommandChoice extends VNCommand {
    type = "choice";
    
    constructor(queue, text, commands) {
        super(queue);
        
        if (typeof text !== "string") {
            throw new Error("CHOICE requires a text string.");
        }
        
        if (!(commands instanceof VNCommandQueue)) {
            throw new Error("CHOICE requires a VNCommandQueue for its commands.");
        }

        this.text = text;
        this.commands = commands;
    }

    /**
     * 
     * @returns {VNCommandQueue}
     */
    execute() {
        return this.commands;
    }
}