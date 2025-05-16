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
        throw new Error("execute() not implemented");
    }
}

export class VNCommandQueue {

    commands = [];

    /**
     * @type {VNCommandQueue}
     */
    parentQueue = null;

    /**
     * @type {import("../components/vn-player.js".default)}
     */
    player;

    /**
     * @type {Function}
     */
    condition = true;

    /**
     * 
     * @param {import("../components/vn-player.js".default)} player 
     * @param {Array<VNCommand | object | string>} commands 
     */
    constructor(player, condition = () => true, commands = [], parentQueue = null) {
        this.player = player;
        this.condition = condition;
        this.commands = this.parseCommands(...commands);
        this.parentQueue = parentQueue;
    }

    setCommands(commands = []) {
        this.commands = commands;
    }

    addCommand(command, i = this.commands.length) {
        const parsedCommand = this.parseCommand(command);
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
            } else {
                parsed.push(parsedCommand);
            }
        }

        return parsed;
    }

    parseCommand(command) {
        let res = null;

        if (command instanceof VNCommand) {
            return command;
        } else if (command instanceof VNCommandQueue) {
            return command;
        } else if (typeof command === 'object') {
            return this.parseJSONObject(command);
        } else if (typeof command === 'string' || typeof command === 'number' || typeof command === 'boolean') {
            // this is a 'VNCommandSay' command that uses the last specified actor focus to spawn a dialogue box
            Log.color("lightblue")`[VNCommandQueue] Parsing string ${command} as a command.`;
            return command;
        } else if (typeof command === 'function') {
            if (command.isVnObjectFunction) {
                Log.color("lightgreen")`[VNCommandQueue] Parsing function ${command.name} as a command.`;
                return command.chainedSayCommands;
            } else {
                Log.color("yellow")`[VNCommandQueue] Parsing function ${command.name} as a command.`;
                res = command(this);
            }
        }

        return res;
    }

    parseJSONObject(json = {}) {
        if (typeof json === 'string') {
            json = JSON.parse(json);
        } else if (typeof json !== 'object') {
            throw new Error("VNCommandQueue.parseJSONObject: json must be a string or an object");
        }
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
            const command = this.commands[this.i]; // Moved: Fetch current command
            this.i++;

            // what do we have here?

            if (command instanceof VNCommand) {
                // 1. A command to execute?
                Log.color("lightgreen")`[VNCommandQueue.executeCurrent - ${this.i}] Executing command: ${command.type}`;
                const res = await command.execute();
            } else if (command instanceof VNCommandQueue) {
                // 2. A nested block of commands?
                Log.color("lightgreen")`[VNCommandQueue.executeCurrent - ${this.i}] Command Queue returned: ${command}`;
                if (await command.checkCondition()) {
                    command.parentQueue = this; // we nested from this queue, so when it's done we should return here.
                    return command;
                } else {
                    break;
                }
            } else if (typeof command === 'string' || typeof command === 'number' || typeof command === 'boolean') {
                // 3. A string, number or boolean?
                Log.color("lightgreen")`[VNCommandQueue.executeCurrent - ${this.i}] Executing command: ${command}`;
            } else {
                // 4. Unknown type (handle later possibly if needed)
                Log.color("red")`[VNCommandQueue.executeCurrent - ${this.i}] Invalid command: ${command}`;
                throw new Error(`VNCommandQueue.executeCurrent: Invalid command: ${command}`);
            }
        }

        // Return to the parent queue if we have one.
        if (this.parentQueue && this.parentQueue instanceof VNCommandQueue) {
            return this.parentQueue;
        } else {
            // We only land here if we are the root queue and we're done executing.
            return null;
        }
    }
}

export default {
    VNCommandQueue,
    VNCommand,
    
}