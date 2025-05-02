import VNActorElement from "../../components/vn-actor.js";
import VNAnimation from "../VNAnimation.js";
import VNCommand from "../VNCommand.js";

export default class VNCommandAnimate extends VNCommand {
    type = 'animate';
    #wait = false;
    /**
     * @type {Element | string}
     */
    #target = null;

    /**
     * @type {VNAnimation | null}
     */
    #animation = null;

    /**
     * Creates a new VNCommandAnimate instance which calls Element.animate() on the target element.
     * @param {VNCommandQueue} queue The command queue to execute the animation in.
     * @param {Element | string} target The target element or element uid to animate.
     * @param {VNAnimation} animation The animation to execute on the target.
     */
    constructor(queue, target, animation, wait = false) {
        super(queue);

        if (!(animation instanceof VNAnimation)) {
            throw new Error("VNCommandAnimate requires a VNAnimation instance.");
        }

        if (typeof target !== 'string' && !(target instanceof Element)) {
            throw new Error("VNCommandAnimate requires a target element or a string (UID).");
        }

        this.#target = target;
        this.#animation = animation;
        this.#wait = wait; // Set the wait property based on the argument
    }
    

    execute() {
        console.log("API: Executing ANIMATE command.");
        let target = this.#target;
        
        if (typeof target === 'string') {
            target = this.scene.querySelector(`[uid="${target}"]`);
        }

        // This is being executed on the definition itself. We have to find the instance in the scene.
        if (target instanceof VNActorElement && target.closest('vn-project')) {
            const uid = target.getAttribute('uid');
            target = this.scene.querySelector(`vn-actor[uid="${uid}"]`);
        }

        if (!target) {
            console.error(`VNCommandAnimation: Target element not found for UID "${this.#target}".`);
            return true; // Skip command if target is missing
        }
        console.log("API: Wait is set to", this.wait);

        if (this.#wait) {
            return new Promise((resolve) => {
                this.#animation.animate(target, () => {
                    console.log("API: Animation finished.");
                    resolve(); // Resolve the promise when the animation finishes
                });
            });
        }
    
        
        this.#animation.animate(target).then(() => {
            console.log("API: Animation finished.");
        });

        return true; // Return true to indicate the command has been executed
    }
}
