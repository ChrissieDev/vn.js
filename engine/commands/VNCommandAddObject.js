import VNObject from "../../components/vn-object.js";
import { Log } from "../../utils/log.js";
import { VNCommand } from "../VNCommand.js";

/**
 * Represents a command to remove an object from the scene.
 */
export default class VNCommandAddObject extends VNCommand {
    type = "addObject";

    /**
     * @type {string | import("../../components/vn-object.js").default | HTMLElement}
     */
    object = undefined;

    /**
     * Overrides to apply to the object instance.
     * @type {object}
     */
    options = {};

    constructor(queue, object, options = {}) {
        super(queue);
        this.options = options;
        this.object = object;
    }

    resolveObject(object) {
        const player = this.queue.player;

        if (object instanceof VNObject || object instanceof Element) {
            return object;
        } else if (typeof object === "string") {
            const uid = object.trim();
            let targetObject = player.getSceneObject(uid);

            // if it doesn't exist in the scene, clone it from the project.
            if (!targetObject) {
                targetObject = player.cloneObjectDefinition(uid);
                targetObject.setAttribute("uid", uid);
                targetObject.setAttribute("cloned", "");
                
                // only set the name if it wasn't set before
                if (targetObject.getAttribute("name") === null) {
                    targetObject.setAttribute("name", uid);
                }
            } else {
                // it already exists in the scene... we can't add it again.
                Log.color("#ff6666")`[VNCommandAddObject] Object ${object} already exists in the scene.`;
                return null;
            }

            return targetObject;

        } else if (typeof object === "function") {
            // actorFunction resolved by VNPlayer.createActorInterface (caught by the proxy when referencing an undefined property in the global context of the scene)
            const uid = object?.metadata?.uid;
            
            if (uid === null || uid === undefined) {
                throw new Error("Cannot add object: UID is null or undefined. What kind of function was passed into the VNCommandAddObject constructor?");
            }
            
            let targetObject = player.getSceneObject(uid);

            // doesn't exist in the scene. clone it from the project.
            if (!targetObject) {
                targetObject = player.cloneObjectDefinition(uid);
                targetObject.setAttribute("uid", uid);
                targetObject.setAttribute("cloned", "");

                // only set the name if it wasn't set before
                if (targetObject.getAttribute("name") === null) {
                    targetObject.setAttribute("name", uid);
                }

                return targetObject;
            } else {
                Log.color("#ff6666")`[VNCommandAddObject] Object ${object} already exists in the scene.`;
                return null;
            }
        }
    }

    async execute() {
        // resolve object at runtime
        const object = this.resolveObject(this.object);
        
        if (!object) {
            Log.color("#ff6666")`[VNCommandAddObject] Object ${this.object} not found.`;
            return new Promise((resolve) => {
                resolve(false);
            });
        }

        const options = this.options;

        // anti-tampering measure
        const nuhUh = ["uid", "cloned"];
        for (const prop of nuhUh) {
            delete options[prop];
        }

        // set the properties of the object
        for (const [key, value] of Object.entries(options)) {
            if (key === 'style' && typeof value === 'object') {
                for (const [styleKey, styleValue] of Object.entries(value)) {
                    object.style[styleKey] = styleValue;
                }

                continue;
            }
            
            object.setAttribute(key, value);
        }

        // no need to wait for the object to be added to the scene because it happens synchronously
        return new Promise((resolve) => {
            Log.color("lightgreen")`[VNCommandAddObject] Adding object ${object} to the scene.`;
            console.log(object);
            this.queue.player.scene.appendChild(object);
            // resolve the promise immediately
            resolve();
        });
    }
}
