import { Log } from "../../utils/log.js";
import { VNCommand } from "../VNCommand.js";
import VNAnimation from "../VNAnimation.js";

/**
 * Represents a command to transition in/out of a scene.
 * @todo Figure out how this sh!t should work
 */
export default class VNCommandTransition extends VNCommand {
    type = "transition";

    /**
     * 
     * @param {import("../VNCommand.js").VNCommandQueue} queue 
     * @param {VNAnimation | "fade-in" | "fade-out"} transition A transition is either a VNAnimation (a Web Animations API wrapper class) or a string that refers to one of the easy-to-use preset transitions.
     * @param {number | string} [duration=null] 
     * 
     */
    constructor(queue, transition, duration = null) {
        super(queue);
        this.transition = transition;
        this.duration = duration;
    }

    async execute() {
        const animation = this.transition;

        return new Promise((resolve) => {
            animation.animate(this.player.scene, {
                duration: `${this.duration || 3000}ms`,
                easing: "linear",
                fill: "forwards",
                iterations: 1,
                direction: "normal",
                delay: "0ms",
            }).onfinish = (e) => {
                Log.color("lightblue")`[VNCommandTransition] Animation finished.`;
                resolve();
            };
        });
    }
}