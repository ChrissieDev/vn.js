import { VNCommand } from "../VNCommand.js";

export default class VNCommandJump extends VNCommand {
    type = "jump";
    target = "";

    constructor(queue, target) {
        super(queue);
        this.target = target;
    }

    async execute() {
        if (this.queue && this.queue.player) {
            this.queue.player.jump(this.target);
        }
        // Returning false pauses the current queue
        return false;
    }
}