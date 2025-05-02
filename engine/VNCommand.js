
/**
 * @summary
 * @abstract
 * Base class for all VN commands.
 * Defines the basic structure and interface for command execution.
 */
export default class VNCommand {

    /**
     * Owner VNCommandQueue context. Is set by VNCommandQueue during parsing/execution
     * @type {import("./VNCommandQueue").default}
     */
    queue = null;

    /**
     * All commands must have a type identifier in order to be serialized/deserialized to/from JSON.
     * @type {string}
     */
    type = "none"; // Must be set by subclasses

    constructor(queue = null) { 
        this.queue = queue;
                
        if (typeof this.type !== 'string') {
            throw new Error(`
                VNCommand type must be a string, got \`${typeof this.type}\`!
                This is because commands must be serializable to JSON.
            `);
        }
    }

    get player() { return this.queue?.player; }
    get scene() { return this.queue?.scene; }
    set scene(value) { if (this.queue) this.queue.scene = value; } // Propagate to queue

    /** Returns true to continue, false to pause. */
    execute() { throw new Error(`execute() not implemented in ${this.constructor.name}.`); } // Abstract method

    /**
     * @todo Undo method to revert the command's effect.
     * If we want to allow going back to previous textboxes, etc, then we need to implement this on all commands.
     */
    undo() { }
    
    /** Optional cleanup/state change on resume. Called by player.#handleProceed before continueExecution. */
    resume() { }
}
