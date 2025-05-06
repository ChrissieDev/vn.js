import VNActorElement from "../../components/vn-actor.js";
import VNCommand from "../VNCommand.js";

export default class VNCommandRemoveObject extends VNCommand {
    type = "removeObject";

    constructor(queue, objectType, uid, options = {}) {
        super(queue);
        this.objectType = objectType;
        this.uid = uid;
        this.options = options; 

        if (!(typeof this.objectType === 'string') || !(typeof this.uid === "string")) {
            throw new Error("VNCommandRemoveObject: Invalid arguments provided.");
        }
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

        scene.removeElement(obj);

        return true; // Continue to the next command
    }
}