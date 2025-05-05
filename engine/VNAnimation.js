
/**
 * Wrapper for Web Animations API.
 */
export default class VNAnimation {

    /**
     * Create a new reusable animation. It's just a wrapper for the Web Animations API.
     * @param {Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions} keyframes Keyframes for the animation.
     * @param {EffectTiming & { wait: boolean }} options Easing, duration, delay, etc.
     * @param {Function | undefined} [onFinish] Optional callback to run when the animation finishes.
     */
    constructor(keyframes, options, onFinish = null) {
        this.keyframes = keyframes;
        this.options = options;
        this.onFinishPersistent = onFinish || null;
    }

    /**
     * Override the animation options. This is useful for reusing the same animation with different options.
     * Only overrides specified keys specified in the object.
     * @param {EffectTiming & { wait: boolean }} options New options for the animation.
     * @todo define options type 
     */
    overrideOptions(options) {
        if (typeof options !== "object") {
            console.error(
                `VNAnimation: Options must be an object. Received ${typeof options}.`
            );
            return;
        }

        this.options = { ...this.options, ...options };
    }

    /**
     * Animate the target element and return a Promise.
     * @param {Element | import("../components/vn-actor.js").default} target 
     * @param {Function} onFinish Optional callback to run when the animation finishes. 
     * @returns 
     */
    async animate(target, onFinish = null) {
        if (!(target instanceof Element) && typeof target !== "string") {
            console.error(
                `VNAnimation: Target must be an Element or a string (UID).`
            );
            return new Promise((resolve) => resolve()); // Skip animation if target is invalid
        }

        if (typeof target === "string") {
            target = document.querySelector(`[uid="${target}"]`);

            if (target === null) {
                console.error(
                    `VNAnimation: Target element not found for UID "${target}".`
                );
                return new Promise((resolve) => resolve()); // Skip animation if target is missing
            }
        }

        return new Promise((resolve) => {
            target.animate(this.keyframes, this.options).onfinish = () => {
                this.onFinishPersistent?.();
                onFinish?.();
                resolve();
            };
        });
    }
}
