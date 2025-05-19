import { Log } from "../utils/log.js";


/**
 * @abstract
 * Generic command class meant to be extended. Throws an error by default when executed.
 */
export class VNCommand {

    type = null;

    /**
     * @type {VNCommandQueue}
     */
    queue = null;

    /**
     * A list of promises that need to be resolved before the command can be executed.
     * For example, if the command needs an asset to be loaded, like an audio file,
     * the player will know if it this command can be executed right now or if it needs to wait.
     * @type {Array<Promise>}
     */
    preloading = [];

    constructor(queue) {
        this.queue = queue;
    }

    get player() { return this.queue.player; }

    /**
     * @abstract
     * @returns {Promise<any>}
     */
    execute() {
        throw new Error(`[${this.constructor.name}] execute() not implemented. Must be overridden in the subclass.`);
    }

    /**
     * @abstract
     * @param {{ type: string }} object
     */
    deserialize(object) {
        throw new Error(`[${this.constructor.name}] deserialize() not implemented. Must be overridden in the subclass.`);
    }
}

export class VNCommandQueue {

    commands = [];

    /**
     * @type {VNCommandQueue}
     */
    parentQueue = null;

    /**
     * @type {import("../components/vn-player.js").default}
     */
    player;

    /**
     * @type {Function}
     */
    condition = true;

    /**
     *
     * @param {import("../components/vn-player.js").default)} player
     * @param {Array<VNCommand | object | string>} commands
     */
    constructor(player, condition = () => true, commands = [], parentQueue = null) {
        this.player = player;
        this.condition = condition;
        this.commands = this.parseCommands(...commands);
        this.parentQueue = parentQueue;
    }

    setCommands(commands = []) {
        this.commands = this.parseCommands(...commands);
    }

    addCommand(command, i = this.commands.length) {
        const parsedCommand = this.parseCommand(command);
        // TODO: Implement insertion logic if needed, for now parseCommands handles initial setup
    }

    /**
     * The current command index to run in this queue.
     * Is incremented at runtime, not parse time.
     */
    i = 0;

    parseCommands(...commands) {
        const parsed = [];

        for (const command of commands) {
            const parsedCommand = this.parseCommand(command);

            if (Array.isArray(parsedCommand)) {
                // unpack the array of commands,
                // and in case any of them aren't VNCommands,
                // parse them again
                const unpacked = this.parseCommands(...parsedCommand);

                if (Array.isArray(unpacked)) {
                    parsed.push(...unpacked);
                } else {
                    parsed.push(unpacked);
                }
            } else if (parsedCommand) { // Ensure parsedCommand is not null/undefined
                parsed.push(parsedCommand);
            }
        }

        return parsed;
    }

    parseCommand(command) {
        let res = null;

        if (command instanceof VNCommand) { // This also catches VNCommandOption, VNCommandChoose etc.
            return command;
        } else if (command instanceof VNCommandQueue) {
            return command;
        } else if (typeof command === 'object' && command !== null) { // Ensure command is not null before treating as object
            return this.parseJSONObject(command);
        } else if (typeof command === 'string' || typeof command === 'number' || typeof command === 'boolean') {
            // this is a 'VNCommandSay' command that uses the last specified actor focus to spawn a dialogue box
            Log.color("lightblue")`[VNCommandQueue] Parsing string ${command} as a command.`;
            // This will be handled by VNCommandSay resolution logic later, for now, keep as string.
            // Or, more robustly, this should be explicitly converted to a VNCommandSay here if that's the intent.
            // For now, assuming VNCommandSay is implicitly handled or created by actor functions.
            // Let's assume for now that raw strings in command arrays become VNCommandSay.
            // This part needs clarification based on how player handles raw strings in executeCurrent.
            // Given the actor`` syntax, direct strings in queue are likely narrative text.
            // We need VNCommandSay for this. This might be a good place to ask for `engine/commands/VNCommandSay.js`.
            // For now, I'll assume this is handled by the player or specific command types.
            // The original code has:
            // else if (typeof command === 'string' || typeof command === 'number' || typeof command === 'boolean') {
            //    Log.color("lightgreen")`[VNCommandQueue.executeCurrent - ${this.i}] Executing command: ${command}`;
            // }
            // This implies it passes strings through. Let's make them VNCommandSay with a default/last speaker.
            // For now, to avoid breaking existing logic and needing VNCommandSay.js, I'll keep it passing the string.
            return command;
        } else if (typeof command === 'function') {
            if (command.isVnObjectFunction) {
                Log.color("lightgreen")`[VNCommandQueue] Parsing function ${command.name} as a command.`;
                // chainedSayCommands is an array of VNCommandSay instances, parse them individually.
                return this.parseCommands(...command.chainedSayCommands);
            } else {
                Log.color("yellow")`[VNCommandQueue] Parsing function ${command.name} as a command.`;
                res = command(this); // The function might return a command or an array of commands
                if (res) {
                    return this.parseCommand(res); // Parse the result of the function call
                }
                return null; // If function returns nothing, it's a void operation
            }
        }

        return res;
    }

    parseJSONObject(json = {}) {
        if (typeof json === 'string') {
            json = JSON.parse(json);
        } else if (typeof json !== 'object' || json === null) {
            throw new Error("VNCommandQueue.parseJSONObject: json must be a string or a non-null object");
        }
        // TODO: Implement actual parsing logic for JSON object to VNCommand if needed
        // For now, this is a placeholder. If JSON objects are meant to be commands,
        // they'd need a 'type' field to dispatch to specific command constructors.
        Log.warn(`[VNCommandQueue] parseJSONObject not fully implemented for generic objects. Object:`, json);
        return null; // Or throw error if unhandled JSON objects are not allowed.
    }

    async checkCondition() {
        if (this.condition instanceof Function) {
            const res = this.condition();
            if (res instanceof Promise) {
                return await res;
            } else {
                return res;
            }
        } else {
            return this.condition;
        }
    }

    /**
     * Keep executing the current command until there are no more commands to execute.
     * If a command returns a VNCommandQueue, return it to the caller (which will usually be a method in VNPlayer).
     * @returns {Promise<any>}
     */
    async executeCurrent() {
        while (this.i < this.commands.length) {
            const command = this.commands[this.i];
            
            this.i++;

            if (command instanceof VNCommand) {
                command.queue = this; // Set the queue for the command
                Log.color("lightgreen")`[VNCommandQueue.executeCurrent - ${this.i}] Executing command: ${command.constructor.name} (${command.type || 'no-type'})`;
                const res = await command.execute();

                if (res instanceof VNCommandQueue) {
                    res.parentQueue = this;
                    return res;
                }
            } else if (command instanceof VNCommandQueue) {
                Log.color("lightgreen")`[VNCommandQueue.executeCurrent - ${this.i}] Command Queue returned: ${command}`;
                if (await command.checkCondition()) {
                    command.parentQueue = this;
                    return command;
                } else {
                    // Condition false, skip this queue. Loop will continue to next command in this.commands
                    Log.color("lightred")`[VNCommandQueue.executeCurrent - ${this.i}] Skipping command queue due to condition: ${command.condition}`;
                }
            } else if (typeof command === 'string' || typeof command === 'number' || typeof command === 'boolean') {

                Log.color("lightyellow")`[VNCommandQueue.executeCurrent - ${this.i}] Raw string/value encountered: ${command}. This should ideally be a VNCommandSay.`;

                if (this.player && typeof this.player.handleNarrativeText === 'function') {
                    await this.player.handleNarrativeText(String(command));
                } else {
                     Log.color("red")`[VNCommandQueue.executeCurrent - ${this.i}] Raw string "${command}" cannot be processed. Player needs handleNarrativeText or this should be a VNCommandSay.`;
                }
            } else {
                Log.color("red")`[VNCommandQueue.executeCurrent - ${this.i}] Invalid command: ${command}`;
                throw new Error(`VNCommandQueue.executeCurrent: Invalid command type: ${typeof command}, value: ${command}`);
            }
        }

        if (this.parentQueue && this.parentQueue instanceof VNCommandQueue) {
            return this.parentQueue;
        } else {
            return null;
        }
    }
}

export default {
    VNCommandQueue,
    VNCommand,
};