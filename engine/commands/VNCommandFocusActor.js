import VNCommand from "../VNCommand.js";

/**
 * @summary
 * Sets the player's focus to a specific actor using the actor's UID.
 */

export default class VNCommandFocusActor extends VNCommand {
    constructor({ player, args = [], namedArgs = {} }) {
        super({ player, args, namedArgs });
        this.actor = null;
    }

    execute() {
        
    }
}