import VNCommand from "./VNCommand.js";
import VNPlayerElement from "../components/visual-novel.js";
import VNSceneElement from "../components/vn-scene.js";

import { VNCommandIf, VNCommandElse } from "./commands/VNCommandIf.js";
import VNCommandStart from "./commands/VNCommandStart.js";
import VNCommandSay from "./commands/VNCommandSay.js";
import VNCommandAddObject from "./commands/VNCommandAddObject.js";
import VNCommandSetActorState from "./commands/VNCommandSetActorState.js";
import VNCommandEvalJS from "./commands/VNCommandEvalJS.js";
import VNCommandAnimate from "./commands/VNCommandAnimate.js";
import VNCommandPick from "./commands/VNCommandPick.js";
import VNCommandChoice from "./commands/VNCommandChoice.js"; //added import for choice & pick commands

export default class VNCommandQueue {
    i = 0;
    commands = [];
    player = null;
    #scene = null;
    parentQueue = null;
    _isQueueFromSCENE = false;

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
                this.#propagateSceneToCommand(cmd.commandsQueue);
            }
        } else if (cmd instanceof VNCommandQueue) {
            cmd.scene = this.#scene;
        }
    }

    parseCommands(...commandsToParse) {
        let result = [];
        let lastIfCommand = null;

        for (let idx = 0; idx < commandsToParse.length; idx++) {
            const currentItem = commandsToParse[idx];
            let parsedCommand = null;

            if (typeof currentItem === "string") {
                const lastAddedCommand =
                    result.length > 0 ? result[result.length - 1] : null;
                let speakerUid = "";
                let speakerName = "";

                if (
                    lastAddedCommand instanceof VNCommandSay &&
                    lastAddedCommand.actorUid !== "you"
                ) {
                    speakerUid = lastAddedCommand.actorUid;
                    speakerName = lastAddedCommand.actorName;
                }
                parsedCommand = new VNCommandSay(
                    this,
                    speakerUid,
                    speakerName,
                    currentItem
                );
            } else if (
                currentItem instanceof VNCommand ||
                currentItem instanceof VNCommandQueue
            ) {
                parsedCommand = currentItem;
                if (
                    parsedCommand instanceof VNCommand &&
                    !parsedCommand.queue
                ) {
                    parsedCommand.queue = this;
                }
                if (
                    parsedCommand instanceof VNCommandSetActorState &&
                    !parsedCommand.queue
                ) {
                    parsedCommand.queue = this;
                }
            } else if (currentItem instanceof VNCommandAnimate) {
                console.log(`\x1b[31mVNQ Parse: Animate command detected.\x1b[0m`);
                parsedCommand.queue = this;
            } else if (
                typeof currentItem === "object" &&
                currentItem !== null &&
                currentItem.type
            ) {
                parsedCommand = this.parseApiObject(currentItem);
            } else if (typeof currentItem === "function") {
                // Wrapping the function with VNCommandEvalJS 
                console.log(
                    "VNQ Parse: Function detected, wrapping in VNCommandEvalJS. Function body:",
                    currentItem.toString()
                );

                parsedCommand = new VNCommandEvalJS(
                    this,
                    this.#scene,
                    currentItem
                );
            } else {
                if (currentItem !== undefined && currentItem !== null) {
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
                    continue;
                }

                result.push(parsedCommand);

                if (parsedCommand instanceof VNCommandIf) {
                    lastIfCommand = parsedCommand;
                } else if (!(parsedCommand instanceof VNCommandSetActorState)) {
                    lastIfCommand = null;
                }
            }
        }
        return result;
    }

    /** Parses a specific command defined as a plain object. */
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
            case "start":
                return new VNCommandStart(this);
            case 'if':
                 if (typeof commandObject.conditionFunc !== 'function' || !(commandObject.trueBranchQueue instanceof VNCommandQueue)) {
                     console.error("VNQ Parse Error: Invalid 'if' object structure. Requires conditionFunc (function) and trueBranchQueue (VNCommandQueue).", commandObject); return null;
                 }
                return new VNCommandIf(this, commandObject.conditionFunc, commandObject.trueBranchQueue);
             case 'else':
                  if (!(commandObject.commandsQueue instanceof VNCommandQueue)) {
                      console.error("VNQ Parse Error: Invalid 'else' object. Requires commandsQueue (VNCommandQueue).", commandObject); return null;
                  }
                 return new VNCommandElse(this, commandObject.commandsQueue);
             case 'noop':
                 return null;
             case 'error':
                 console.error("Scripting Error reported via command:", commandObject.message || "No message provided.", commandObject);
                 return null;
            case 'pick':
                console.log("Parsing PICK object:", commandObject); // Logs the incoming object
                if (Array.isArray(commandObject.choices)) {
                    commandObject.choices.forEach((c, index) => {
                        console.log(`Choice ${index} instanceof VNCommandChoice:`, c instanceof VNCommandChoice, c); // Log each choice
                    });
                }
                return new VNCommandPick(this, commandObject.choices);
            case 'choice':
                if (typeof commandObject.text !== 'string' || !(commandObject.commandsQueue instanceof VNCommandQueue)) {
                    console.error("VNQ Parse Error: Invalid 'CHOICE' object structure. Requires text (string) and commandsQueue (VNCommandQueue).", commandObject);
                    return null;
                }
                return new VNCommandChoice(this, commandObject.text, commandObject.commandsQueue);
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
                res.then(() => {
                    this.i++;
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
