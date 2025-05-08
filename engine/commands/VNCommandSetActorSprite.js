import VNCommand from "../VNCommand.js";

/**
 * @summary
 * Sets the sprite variant of an actor to a new state.
 * The state is defined by the name of the sprite and the variant to set.
 */
export default class VNCommandSetActorSprite extends VNCommand {
    type = 'setActorSprite';

    constructor(queue) {
        super(queue);   
    }
}
