import VNActorElement from "../../components/vn-actor.js";
import VNCommand from "../VNCommand.js";

export default class VNCommandRemoveObject extends VNCommand {
    constructor({ player, uid, options = {} }) {
        super({ player, uid, options });
        this.uid = uid;
        this.options = options;
    }

    execute() {
        const scene = this.scene;
        const obj = scene.querySelector(`:scope > *[uid="${this.uid}"]`);
        
        if (!obj) {
            console.error(`VNCommandRemoveObject: Object with UID "${this.uid}" not found in the scene.`);
            return true;
        }

        // must be an element.
        if (!obj.parentNode) {
            console.error(`VNCommandRemoveObject: Object with UID "${this.uid}" has no parent node.`);
            return true;
        }
        // remove the function from the runtime context
        if (obj instanceof VNActorElement) {
            this.player.removeActor(obj.uid);
        }
        // Remove the object from the scene
        obj.parentNode.removeChild(obj);
    }
}