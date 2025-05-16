/**
 * Web Animations API wrapper class for reusable animations applicable to any `Animatable` element.
 */
export default class VNAnimation {
    /**
     * Create a new VNAnimation instance.
     * @param {keyframes: Keyframe[] | PropertyIndexedKeyframes} keyframes The keyframes for the animation.
     * @param {options?: number | (KeyframeAnimationOptions & { onfinish: Function })} options The options for the animation.
     */
    constructor(
        keyframes, 
        options = {
            duration: 1000,
            easing: 'ease',
            fill: 'both',
            iterations: 1,
            direction: 'normal',
            delay: 0,
        }) {

        this.keyframes = keyframes;
        this.options = options;
    }

    /**
     * Plays the animation on the target element.
     * @param {Animatable} target The target element to animate.
     * @returns {A}
     */
    animate(target) {
        
        const animation = target.animate(this.keyframes, this.options);
        const oldOnFinish = animation.onfinish;
        const oldOnCancel = animation.oncancel;
        const oldOnRemove = animation.onremove;

        const internalOnFinishHandler = (e) => {
            if (this.options.onfinish && typeof this.options.onfinish === 'function') {
                this.options.onfinish(e);
            }

            if (oldOnFinish && typeof oldOnFinish === 'function') {
                oldOnFinish(e);
            }
        };

        animation.onfinish = internalOnFinishHandler;

        return animation;
    }
}