import { VNCommand } from '../VNCommand.js';

/**
 * Represents a command to remove an object from the scene.
 */
export default class VNCommandRemoveObject extends VNCommand {
    type = "removeObject";

    constructor(queue, uid) {
        super(queue);
        this.uid = uid;
    }
}

