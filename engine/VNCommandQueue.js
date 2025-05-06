import VNCommand from "./VNCommand.js";
import VNPlayerElement from "../components/vn-player.js";
import VNSceneElement from "../components/vn-scene.js";

import { VNCommandIf, VNCommandElse } from "./commands/VNCommandIf.js";
import VNCommandStart from "./commands/VNCommandStart.js";
import VNCommandSay from "./commands/VNCommandSay.js";
import VNCommandAddObject from "./commands/VNCommandAddObject.js";
import VNCommandSetActorLayers from "./commands/VNCommandSetActorState.js";
import VNCommandEvalJS from "./commands/VNCommandEvalJS.js";
import VNCommandAnimate from "./commands/VNCommandAnimate.js";
import VNCommandPick from "./commands/VNCommandPick.js";
import VNCommandChoice from "./commands/VNCommandChoice.js";
import VNCommandWait from "./commands/VNCommandWait.js";
import VNCommandRemoveObject from "./commands/VNCommandRemoveObject.js";

/**
 * Represents a command block that can be executed at runtime.
 * @todo - Full specification of the command queue system.
 */
export default class VNCommandQueue {
    i = 0;
    commands = [];
    /**
     * @type {VNPlayerElement}
     */
    player = null;

    /**
     * @type {VNSceneElement}
     */
    #scene = null;

    /**
     * @type {VNCommandQueue | null}
     */
    parentQueue = null;

    /**
     * Creates a new VNCommandQueue instance.
     * @param {VNPlayerElement} player - The VNPlayerElement instance that owns this queue.
     * @param {VNCommandQueue | null} parentQueue - The parent queue. If this is null then it is the root queue.
     * @param {VNCommand[]} commands - An array of VNCommand instances to execute.
     */
    constructor(
        { player, parentQueue = null, commands = [], i = 0 } = {},
        ...initialCommands
    ) {
        if (!player || !(player instanceof VNPlayerElement)) {
            throw new Error(
                "VNCommandQueue requires a valid VNPlayerElement instance."
            );
        }

        this.player = player;
        this.parentQueue = parentQueue;
        this.i = i;
        this.#scene = player.getScene();

        const sourceCommands =
            initialCommands.length > 0 ? initialCommands : commands;

        if (sourceCommands.length > 0) {
            this.commands =
                initialCommands.length > 0
                    ? this.parseCommands(...sourceCommands)
                    : sourceCommands;
            this.commands.forEach((cmd) => this.#propagateSceneToCommand(cmd));
        } else {
            this.commands = [];
        }
    }

    /** Recursively sets the scene context on commands and their nested queues. */
    #propagateSceneToCommand(cmd) {
        if (!cmd || !this.#scene) return;

        if (cmd instanceof VNCommand) {
            if (!cmd.queue) cmd.queue = this;
            cmd.scene = this.#scene;

            if (cmd instanceof VNCommandIf) {
                this.#propagateSceneToCommand(cmd.trueBranchQueue);
                this.#propagateSceneToCommand(cmd.falseBranchQueue);
            } else if (cmd instanceof VNCommandElse) {
                this.#propagateSceneToCommand(cmd.commands);
            }
        } else if (cmd instanceof VNCommandQueue) {
            cmd.scene = this.#scene;
            cmd.parentQueue = this;
        }
    }

    /**
     * Parses all arguments passed as commands and returns an array of VNCommand instances.
     * This method is primarily used by the VNCommandQueue's constructor to parse the commands passed to it,
     * but it can also be used by other sources to parse commands to give to the player.
     * @param  {...any} commandsToParse
     * @returns {VNCommand[]} - An array of VNCommand instances.
     */
    parseCommands(...commandsToParse) {
        let result = []; // This array holds commands parsed in the current call
        let lastIfCommand = null;

        // `outerThis` captures the `this` context of the VNCommandQueue instance
        // for use inside getLastFocusedSpeaker if there's any `this` ambiguity.
        // However, as a function declaration, `this` inside getLastFocusedSpeaker
        // should already refer to the VNCommandQueue instance.
        const outerThis = this; 

        /**
         * Backtracking function to search for the last VNCommandSay that has a speaker.
         * @param {VNCommandQueue} queue - The command queue to search in.
         * @param {boolean} isRecursiveCall - True if this is a recursive call for a parent queue.
         */
        function getLastFocusedSpeaker(queue, isRecursiveCall = false) {
            if (!isRecursiveCall) {
                // This is the initial call for the current queue being parsed.
                // Search backwards in the `result` array (commands parsed so far in *this* batch).
                for (let i = result.length - 1; i >= 0; i--) {
                    const command = result[i];
                    // console.log("[i] command (from current parse batch 'result'):", command);
                    if (command instanceof VNCommandSay) {
                        if (command.actorUid && command.actorUid !== "") {
                            return command;
                        }
                    }
                }
                // If not found in `result`, we'll proceed to check the parent queue.
                // We don't check `queue.commands` (i.e., `outerThis.commands`) here for the initial queue,
                // because `result` represents the most current state for this parsing pass.
                // `outerThis.commands` would be the state *before* this parseCommands call.
            } else {
                // This is a recursive call, meaning `queue` is a parent queue.
                // Search its established `commands` array.
                const commands = queue.commands;
                for (let i = commands.length - 1; i >= 0; i--) {
                    const command = commands[i];
                    // This is where your original log was.
                    // console.log("[i] command (from parent queue.commands):", command); 
                    if (command instanceof VNCommandSay) {
                        if (command.actorUid && command.actorUid !== "") {
                            return command;
                        }
                    }
                }
            }

            // If no speaker found in the current scope (either `result` or parent's `commands`),
            // try the parent queue.
            if (queue.parentQueue === null) {
                // console.warn("VNQ Parse: No last focused speaker found in hierarchy. Returning null.");
                return null;
            }
            
            // Recurse to the parent queue. Mark it as a recursive call.
            return getLastFocusedSpeaker(queue.parentQueue, true);
        }

        for (let idx = 0; idx < commandsToParse.length; idx++) {
            const currentItem = commandsToParse[idx];
            let parsedCommand = null;

            if (typeof currentItem === "string") {
                // Call getLastFocusedSpeaker, starting with `this` (the current VNCommandQueue instance)
                // The `isRecursiveCall` defaults to `false` for the initial call.
                const lastSpeakerCommand = getLastFocusedSpeaker(this); 
                let speakerUid = "";
                let speakerName = "";

                if (lastSpeakerCommand instanceof VNCommandSay) {
                    speakerUid = lastSpeakerCommand.actorUid;
                    speakerName = lastSpeakerCommand.actorName;
                } else if (lastSpeakerCommand === null) {
                    // Only log the warning if the final result is null after checking everything
                    console.warn(
                       `VNQ Parse: No last focused speaker found for string literal "${currentItem.substring(0,30)}...". Treating as monologue.`
                    );
                }


                parsedCommand = new VNCommandSay(
                    this, // current queue
                    speakerUid,
                    speakerName,
                    currentItem,
                    speakerUid === "" // is monologue if speaker is empty
                );
            } else if (
                currentItem instanceof VNCommand
            ) {
                parsedCommand = currentItem;
                if (!parsedCommand.queue) {
                    parsedCommand.queue = this;
                }
                // VNCommandSetActorLayers check was redundant as it's a VNCommand
            } else if (currentItem instanceof VNCommandQueue) {
                // This case seems unlikely if commandsToParse is usually flat commands or API objects
                // If a VNCommandQueue is passed directly, it means it's a pre-constructed sub-queue.
                currentItem.parentQueue = this; 
                result.push(currentItem); // Add the queue to the result
            } else if (currentItem instanceof VNCommandAnimate) { // VNCommandAnimate is a VNCommand, handled above.
                // This specific check is redundant if VNCommandAnimate extends VNCommand.
                // console.log(`\x1b[31mVNQ Parse: Animate command detected.\x1b[0m`);
                parsedCommand = currentItem; // Assuming it's a VNCommand
                if (!parsedCommand.queue) {
                    parsedCommand.queue = this;
                }
            } else if (
                typeof currentItem === "object" &&
                currentItem !== null &&
                currentItem.type
            ) {
                parsedCommand = this.parseApiObject(currentItem);
            } else if (typeof currentItem === "function") {
                // console.log(
                //     "VNQ Parse: Function detected, wrapping in VNCommandEvalJS. Function body:",
                //     currentItem.toString()
                // );
                parsedCommand = new VNCommandEvalJS(
                    this,
                    this.#scene,
                    currentItem
                );
            } else {
                if (currentItem !== undefined && currentItem !== null) {
                    // console.warn("VNQ Parse: Unrecognized command item, skipping:", currentItem);
                }
                parsedCommand = null;
            }

            if (parsedCommand) {
                this.#propagateSceneToCommand(parsedCommand);

                if (parsedCommand instanceof VNCommandElse) {
                    if (lastIfCommand) {
                        if (!parsedCommand.attachToIf(lastIfCommand)) {
                            console.error("VNQ Parse: Failed ELSE attach.");
                        }
                    } else {
                        console.error("VNQ Parse: ELSE without IF.");
                    }
                    // An ELSE command is usually not added to the main command list directly,
                    // but attached to an IF. The `continue` ensures it's not pushed to `result`.
                    continue; 
                }

                result.push(parsedCommand);

                if (parsedCommand instanceof VNCommandIf) {
                    lastIfCommand = parsedCommand;
                } else if (!(parsedCommand instanceof VNCommandSetActorLayers)) { 
                    // This logic for resetting lastIfCommand seems a bit specific.
                    // Any command other than VNCommandSetActorLayers resets lastIfCommand?
                    // Typically, only an ELSE or another IF would interact with lastIfCommand.
                    // Or perhaps any non-control-flow command.
                    lastIfCommand = null;
                }
            }
        }
        return result;
    }

    /**
     * Parses a JSON object into a VNCommand instance.
     * 
     * *This engine can parse pure JSON objects. Every commmand has an equivalent JSON representation.
     * The reason for this is to allow third parties to create their own pipeline to build a runnable scene.*
     * 
     * @param {*} commandObject 
     * @returns {VNCommand} - The parsed VNCommand instance.
     * @todo - Add support for `queue` type so nested queues can be parsed as well.
     */
    parseApiObject(commandObject) {
        switch (commandObject.type) {
            case "say":
                if (
                    typeof commandObject.actorUid !== "string" ||
                    typeof commandObject.actorName !== "string" ||
                    typeof commandObject.text !== "string"
                ) {
                    console.error(
                        "VNQ Parse Error: Invalid 'say' object structure.",
                        commandObject
                    );
                    return null;
                }
                return new VNCommandSay(
                    this,
                    commandObject.actorUid,
                    commandObject.actorName,
                    commandObject.text,
                    !!commandObject.isMonologue
                );
            case "add":
                if (
                    typeof commandObject.objectType !== "string" ||
                    typeof commandObject.uid !== "string"
                ) {
                    console.error(
                        "VNQ Parse Error: Invalid 'add' object structure.",
                        commandObject
                    );
                    return null;
                }
                return new VNCommandAddObject(
                    this,
                    commandObject.objectType,
                    commandObject.uid,
                    commandObject.options || {}
                );
            case "remove":
                if (
                    typeof commandObject.objectType !== "string" ||
                    typeof commandObject.uid !== "string"
                ) {
                    console.error(
                        "VNQ Parse Error: Invalid 'remove' object structure.",
                        commandObject
                    );
                    return null;
                }
                return new VNCommandRemoveObject(
                    this,
                    commandObject.objectType,
                    commandObject.uid,
                    commandObject.options || {}
                );
            case "start":
                return new VNCommandStart(this);
            case 'if':
                if (typeof commandObject.conditionFunc !== 'function' || !(commandObject.trueBranchQueue instanceof VNCommandQueue)) {
                    console.error("VNQ Parse Error: Invalid 'if' object structure. Requires conditionFunc (function) and trueBranchQueue (VNCommandQueue).", commandObject); return null;
                }
                return new VNCommandIf(this, commandObject.conditionFunc, commandObject.trueBranchQueue);
            case 'else':
                if (!(commandObject.commands instanceof VNCommandQueue)) {
                    console.error("VNQ Parse Error: Invalid 'else' object. Requires commands (VNCommandQueue).", commandObject); return null;
                }
                return new VNCommandElse(this, commandObject.commands);
            case 'noop':
                return null;
            case 'error':
                console.error("Scripting Error reported via command:", commandObject.message || "No message provided.", commandObject);
                return null;
            case 'pick':
                console.log("Parsing PICK object:", commandObject); // Logs the incoming object
                if (Array.isArray(commandObject.choices)) {
                    // there shouldn't be too many choices, so we can get away with iterating over them
                    for (let index = 0; index < commandObject.choices.length; index++) {
                        const c = commandObject.choices[index];
                        console.log(`Choice ${index} instanceof VNCommandChoice:`, c instanceof VNCommandChoice, c); // Log each choice
                    }
                }
                return new VNCommandPick(this, commandObject.choices);
            case 'choice':
                if (typeof commandObject.text !== 'string' || (Array.isArray(commandObject?.commands || null))) {
                    console.error("VNQ Parse Error: Invalid 'CHOICE' object structure. Requires text (string) and commands (VNCommandQueue).", commandObject);
                    return null;
                }
                return new VNCommandChoice(this, commandObject.text, commandObject.commands);
            case "wait":
                return new VNCommandWait(this, commandObject.until || "0s");
            case "eval":
                if (typeof commandObject.execFunc !== "function") {
                    console.error(
                        "VNQ Parse Error: Invalid 'eval' object. Requires execFunc (function).",
                        commandObject
                    );
                    return null;
                }
                return new VNCommandEvalJS(this, this.#scene, commandObject.execFunc);
            default:
                console.warn(
                    `VNQ Parse: Unknown API object type "${commandObject.type}"`,
                    commandObject
                );
                return null;
        }
    }

    /** Executes the command at the current index 'i'. Returns true if execution should continue, false if paused. */
    executeCurrent() {
        if (!this.player || !this.player.isPlaying) {
            return false;
        }

        if (this.i >= this.commands.length) {
            this.player.onQueueComplete(this);
            return this.parentQueue ? true : false;
        }

        const command = this.commands[this.i];

        if (!command || !(command instanceof VNCommand)) {
            console.error(
                `VNQ executeCurrent: Invalid or missing command at index ${this.i}. Skipping.`,
                command
            );
            this.i++;
            return true;
        }

        this.#propagateSceneToCommand(command);

        let continueExecution = true;

        try {
            const res = command.execute();

            if (res instanceof Promise) {
                console.log(
                    `VNQ executeCurrent: Command ${this.i} returned a promise.`,
                    command
                );

                res.then((value) => {
                    this.i++;
                    
                    if (value instanceof VNCommandQueue) {
                        // a queue was returned. we have to nest into it
                        value.parentQueue = this;
                        value.scene = this.scene;
                        this.player.setCurrentQueue(value);   
                    }
                    this.player.continueExecution();
                });

                continueExecution = false; // Pause execution until the promise resolves
            } else {
                continueExecution = res;
            }
        } catch (error) {
            console.error(
                `%cError executing command [${this.i}] ${command.constructor.name}:`,
                "color: red; font-weight: bold;",
                error,
                command
            );
            continueExecution = true;
        }

        if (continueExecution) {
            this.i++;
            return true;
        } else {
            return false;
        }
    }

    /** Gets the current scene, falling back to the player's scene if not set locally. */
    get scene() {
        return this.#scene || this.player?.getScene();
    }

    /** Sets the scene context for this queue and propagates it to all contained commands. */
    set scene(value) {
        if (value && value instanceof VNSceneElement) {
            if (this.#scene !== value) {
                this.#scene = value;
                this.commands.forEach((cmd) =>
                    this.#propagateSceneToCommand(cmd)
                );
            }
        } else if (value === null || value === undefined) {
            if (this.#scene !== null) {
                this.#scene = null;
                this.commands.forEach((cmd) => {
                    if (cmd instanceof VNCommand) cmd.scene = null;
                });
            }
        } else {
            console.warn("VNQ: Attempted to set invalid scene", value);
        }
    }
}
