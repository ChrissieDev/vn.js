import { VNCommand } from "../VNCommand.js";

// todo
export default class VNCommandReturn extends VNCommand {
    type = "return";

    /**
     * 
     * @param {import("../VNCommand.js").VNCommandQueue} queue 
     */
    constructor(queue) {
        super(queue);
    }

    async execute() {
        return new Promise((resolve) => {
            this.queue.resolve();
            resolve();
        });
    }
}