import Time from "../../utils/time.js";
import { VNCommand } from "../VNCommand.js";

export default class VNCommandWait extends VNCommand {
    
    /**
     * @type {number} Duration in milliseconds
     */
    duration = 0;

    constructor(queue, duration) {
        super(queue);

        // converted to ms
        this.duration = Time.parse(duration);
    }

    async execute() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, this.duration);
        });
    }
}