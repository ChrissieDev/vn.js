import { Log } from "../../utils/log.js";
import { VNCommand } from "../VNCommand.js";

export default class VNCommandStop extends VNCommand {
    type = "stop";

    constructor(queue) {
        super(queue);
    }

    async execute() {
        // Return to the previous queue
        Log.info`[VNCommandStop] Stopping scene...`;
        this.queue.player.abortScene();
    }
}