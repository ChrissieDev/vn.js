import VNCommand from "../VNCommand.js";
import VNCommandQueue from "../VNCommandQueue.js";
// forgot about the queue system lol

export default class VNCommandChoice extends VNCommand {
    constructor(queue, text, commandsQueue) {
        super(queue);
        if (typeof text !== "string") {
            throw new Error("CHOICE requires a text string.");
        }
        if (!(commandsQueue instanceof VNCommandQueue)) {
            throw new Error("CHOICE requires a VNCommandQueue for its commands.");
        }
        this.text = text;
        this.commandsQueue = commandsQueue;
    }

    execute() {
        console.error("VNCommandChoice should not be executed directly. :C");
        return true; // Skips the execution
    }
}