/**
 * Wrapper for Web Animations API.
 */
export default class VNAnimation {
    /**
     * Create a new reusable animation. It's just a wrapper for the Web Animations API.
     * @param {Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions} keyframes Keyframes for the animation.
     * @param {EffectTiming} options Easing, duration, delay, etc.
     * @param {Function | undefined} [onFinish] Optional callback to run when the animation finishes.
     */
    constructor(keyframes, options, onFinish = null) {
        this.keyframes = keyframes;
        this.options = options;
        this.onFinishPersistent = onFinish || null;
    }

    overrideOptions(options) {
        if (typeof options !== "object") {
            console.error(
                `VNAnimation: Options must be an object. Received ${typeof options}.`
            );
            return;
        }

        this.options = { ...this.options, ...options };
    }

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
