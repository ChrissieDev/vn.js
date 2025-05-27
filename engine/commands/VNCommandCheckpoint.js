import { VNCommand } from "../VNCommand.js";

export default class VNCommandCheckpoint extends VNCommand {
    type = "checkpoint";
    label = "";

    constructor(queue, label) {
        super(queue);
        this.label = label;
    }

    async execute() {
        
        if (this.queue && this.queue.player) {
            this.queue.player.setCheckpoint(this.label, this.queue, this.queue.i);
        }
        return Promise.resolve();
    }
}
