
/**
 * @summary
 * @abstract
 * Base class for all VN commands.
 * Defines the basic structure and interface for command execution.
 */
export default class VNCommand {

    /**
     * Owner VNCommandQueue. Is set by VNCommandQueue during parsing/execution.
     * @type {import("./VNCommandQueue").default}
     */
    queue = null;

    /**
     * All commands must have a type identifier in order to be serialized/deserialized to/from JSON.
     * **Must be set in the extending class, or an error will be thrown.**
     * @type {string}
     * 
     */
    type = "none"; //

    /**
     * Create a new VNCommand instance.
     * @param {import("./VNCommandQueue").default} queue
     * @throws {Error} - If the extending class does not define a `type` property in its class body. 
     */
    constructor(queue = null) { 
        this.queue = queue;
        
        // Check if a `type` identifier is set on the extending class calling super().
        if (typeof this.type !== 'string' && this.type !== "none") {
            throw new Error(`
                All VNCommands must define a \`type\` property in their class body.
                This is because commands must be serializable to JSON.
            `);
        }
    }

    /**
     * The player instance that is executing the command.
     */
    get player() { return this.queue?.player; }
    
    /**
     * The active scene that is running while this command is executed.
     */
    get scene() { return this.queue?.scene; }
    set scene(scene) { this.queue.scene = scene; }

    /** 
     * Every VNCommand has an `execute()` method that runs when the command is executed.
     * @abstract
     * @returns {boolean} - Returns true if the command was executed successfully, false otherwise.
     * @returns {Promise<any>} - Returns a promise that resolves to true if the command was executed successfully, false otherwise.
     */
    execute() { throw new Error(`execute() not implemented in ${this.constructor.name}.`); } 

    /**
     * @todo Undo method to revert the command's effect.
     * If we want to allow going back to previous textboxes, etc, then we need to implement this on all commands.
     */
    undo() { }
    
    /** Optional cleanup/state change on resume. Called by player.#handleProceed before continueExecution. */
    resume() { }
}
