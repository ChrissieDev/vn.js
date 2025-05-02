import VNCommand from '../VNCommand.js';
import VNCommandQueue from '../VNCommandQueue.js';

/**
 * @class VNCommandEvalJS
 * Evaluates javascript code at runtime and executes it in the context of the VNPlayerElement's #runtime object.
 * The player executes the user's code anyway so their code is treated as trusted.
 * It us up to the user to ensure they do not pass any malicious user input to evaluate.
 */
export default class VNCommandEvalJS extends VNCommand {
    type = 'eval';

    /**
     * @type {Function | null}
     */
    #execFunc = null;

    /**
     * @type {Object | null}
     */
    #runtime = null;

    get player() {
        return this.scene?.player;
    }

    constructor(queue, runtime, execFunc) {
        super(queue);
        
        if (typeof execFunc !== 'function') { 
            throw new Error("VNCommandEvalJS requires a function to execute.");
        }

        this.#runtime = runtime;
        this.#execFunc = execFunc;
    }

    // TODO: Support async functions to pause execution until the promise resolves
    execute() {
        console.log("Evaluating JS function...");
        if (this.#execFunc) {
            try {
                const result = this.#execFunc.call(this.#runtime, this.player, this.scene, this.queue);
                console.log("JS function executed successfully:", result);
            } catch (error) {
                console.error("Error executing JS function:", error);
            }
        } else {
            console.warn("No JS function to execute.");
        }
        return true; // Continue execution after executing the JS function
    }
}
