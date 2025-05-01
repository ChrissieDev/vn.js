import VNCommand from "../VNCommand.js";

/**
 * @summary
 * Sets the state of a specific body part of an actor to a new state.
 * The state is defined by the UID of the target image within the body part.
 */
export default class VNCommandSetActorState extends VNCommand {
    type = 'setActorState';
    actorUid = null;
    bodyPartUid = null;
    newStateUid = null;

    constructor(queue, actorUid, bodyPartUid, newStateUid) {
        super(queue);
        if (!actorUid || !bodyPartUid || typeof newStateUid !== 'string') {
            throw new Error("VNCommandSetActorState: Invalid arguments provided.");
        }
        this.actorUid = actorUid;
        this.bodyPartUid = bodyPartUid;
        this.newStateUid = newStateUid;
    }

    execute() {
        const scene = this.scene;
        if (!scene) {
            console.error(`${this.type}: Cannot execute - scene not found.`);
            return true;
        }

        const actorElement = scene.querySelector(`:scope > vn-actor[uid="${this.actorUid}"]`);

        if (!actorElement) {
            console.error(`${this.type}: Actor instance with UID "${this.actorUid}" not found in the scene.`);
            return true;
        }

        if (typeof actorElement.setState !== 'function') {
            console.error(`${this.type}: Target element for UID "${this.actorUid}" is not a valid VNActorElement or lacks setState method.`);
            return true;
        }

        actorElement.setState(this.bodyPartUid, this.newStateUid);

        return true;
    }
}