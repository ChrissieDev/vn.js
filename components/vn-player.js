import VNAnimation from "../engine/VNAnimation.js";
import VNCommandPlayMedia from "../engine/commands/VNCommandPlayMedia.js";
import { VNCommandQueue, VNCommand } from "../engine/VNCommand.js"; // Ensure VNCommand is also exported if needed, or use VNCommandModule.VNCommand
import VNCommandSay from "../engine/commands/VNCommandSay.js";
import { VNCommandIf, VNCommandElseIf, VNCommandElse } from "../engine/commands/VNCommandIf.js";
import VNCommandOption from "../engine/commands/VNCommandOption.js";
import VNCommandChoose from "../engine/commands/VNCommandChoose.js";


import {Log} from "../utils/log.js";
import VNObject from "./vn-object.js";
import VNCommandAddObject from "../engine/commands/VNCommandAddObject.js";
import VNCommandTransition from "../engine/commands/VNCommandTransition.js";
import VNCommandWait from "../engine/commands/VNCommandWait.js";
import Time from "../utils/time.js";
import VNCommandStyle from "../engine/commands/VNCommandStyle.js";
import VNCommandPauseMedia from "../engine/commands/VNCommandPauseMedia.js";
import VNCommandStopMedia from "../engine/commands/VNCommandStopMedia.js";

export default class VNPlayer extends HTMLElement {
    /**
     * @type {import("./vn-scene.js").default}
     */
    get scene() { return this.querySelector("vn-scene"); }

    /**
     * @type {import("./vn-project.js").default}
     */
    get project() { return this.querySelector("vn-project"); }

    /**
     * @type {VNCommandQueue | null}
     */
    currentQueue = null;

    #defaultTextBox = null;


    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --player-background: #000;
                    background: var(--player-background);
                    display: grid; /* Key change */
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    place-items: center; /* Now works */
                }

                ::slotted(vn-scene) {
                    box-sizing: border-box;
                }
            </style>
            <slot></slot>
        `;
    }

    #mutObserver = new MutationObserver((mutations) => {
        // Potentially look for a default text-box when scene is populated
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && this.scene) {
                if (!this.#defaultTextBox || !this.#defaultTextBox.isConnected) {
                    this.#defaultTextBox = this.scene.querySelector('text-box[uid="dialogue"]') || this.scene.querySelector('text-box');
                }
            }
        }
    });

    static get observedAttributes() {
        return ["src"];
    }

    /**
     * Web Components lifecycle method
     * Start the mutation observer to handle any unhandled elements being added to the scene.
     * Elements that reference
     */
    connectedCallback() {
        Log.color("lightgreen").italic()`[${this}] attached to the DOM.`;

        this.#mutObserver.observe(this, {
            childList: true,
            attributes: true,
            subtree: true, // Observe scene children for text-box
        });

        // Initial check for default text box
        if (this.scene) {
            this.#defaultTextBox = this.scene.querySelector('text-box[uid="dialogue"]') || this.scene.querySelector('text-box');
        }
    }

    /**
     * Copies over the API functions from this.#runtimeAPI to the object the script will run in.
     * These functions are separate from the #runtime object so that they can be identified as API functions,
     * regardless if anything else is added to the runtime object.
     */
    initRuntime() {
        // 1. Reset the runtime context.
        this.#runtime = {
            // Provide a way for narrative text (strings not from actors) to be spoken
            // This maps to the '_' actor function convention
            _: (...args) => {
                const actorFn = this.createActorInterface(null, this.currentQueue); // null for narrator
                return actorFn(...args);
            },

            you: (...args) => {
                const actorFn = this.createActorInterface(null, this.currentQueue); // null for narrator
                return actorFn(...args);
            }
        };


        // 2. Copy over the api functions to the runtime object where the script will run.
        for (const key of Object.keys(this.#runtimeAPI)) {
            const value = this.#runtimeAPI[key];

            if (typeof value === "function") {
                this.#runtime[key] = value.bind(this.#runtime); // Bind to #runtime
            } else {
                this.#runtime[key] = value;
            }
        }
    }

    runScene(script) {
        Log
        `[${this}] Running scene...`
        `--- Script ---`
        `${script}`
        `--- End ---`;

        let currentQueue = new VNCommandQueue(this, () => true, []); // Initialize with player, but no commands yet.
        this.currentQueue = currentQueue;
        this.initRuntime(); // Populates this.#runtime

        const createActorInterface = this.createActorInterface; // get reference

        if (typeof script === "string") {
            const runtimeContextProxy = new Proxy(this.#runtime, {
                has(target, key) {
                    return true; // Assume all keys exist to allow dynamic actor creation
                },
                get(target, key, receiver) {
                    if (key === Symbol.unscopables) return undefined; // Important for `with` statement

                    if (Reflect.has(target, key)) {
                        return Reflect.get(target, key, receiver);
                    }
                    if (Reflect.has(globalThis, key)) {
                        return Reflect.get(globalThis, key, receiver);
                    }

                    // If not in target or globalThis, assume it's an actor UID
                    // 'this' inside proxy methods refers to the proxy handler itself, not VNPlayer.
                    // Need to access VNPlayer instance (this from outer runScene scope)
                    // The 'this.currentQueue' in createActorInterface call will be undefined if not careful.
                    // We need the VNPlayer instance, which is `this` in the `runScene` method's scope.
                    // The `createActorInterface` function itself is already bound or has access to `this` (VNPlayer).
                    // However, the `currentQueue` it uses for creating commands should be the one active during script parsing.
                    // The `currentQueue` passed to `createActorInterface` should be `this.currentQueue` (VNPlayer's currentQueue).

                    // Let's ensure createActorInterface is called with the correct context (VNPlayer instance)
                    // and correct currentQueue (the one being populated by START).
                    const playerInstance = currentQueue.player; // Or `this` from runScene's scope.
                    const actorFunc = playerInstance.createActorInterface.call(playerInstance, String(key), currentQueue);
                    return actorFunc;

                },
            });

            const fullScriptBody = `with (this) { ${script} }`;
            Log`[VNPlayer] Generated script body for execution:\n${fullScriptBody}`;

            try {
                const fn = new Function(fullScriptBody);
                fn.call(runtimeContextProxy);
            } catch (e) {
                console.error("Error executing scene script:", e);
                throw e;
            }
        }
    }

    /**
     * @param {string | null} uid The uid of an existing <vn-object> element or null for narrator.
     * @param {VNCommandQueue} currentQueue The command queue commands will be added to.
     */
    createActorInterface(uid, currentQueue) {
        const player = currentQueue.player; // Should be `this` (VNPlayer instance)

        Log`[${player}] Creating actor interface for ${uid || 'narrator (_)'}`;

        let actorNameForDisplay = uid;
        let actorObject = null;

        if (uid) {
            actorObject = player.getSceneObject(uid); // Tries to find in scene
            if (!actorObject) {
                const definition = player.project ? player.project.cloneObjectDefinition(uid) : null;
                if (definition instanceof Element) {
                    actorObject = definition;
                    // Actor definitions from project are not yet in scene. ADD command should handle this.
                    // For SAY, we mostly need the name attribute.
                    actorNameForDisplay = actorObject.getAttribute("name") || uid;
                } else {
                    // If not in project or scene, it's a dynamic actor. Use UID as name.
                    actorNameForDisplay = uid;
                }
            } else { // Found in scene
                 actorNameForDisplay = actorObject.getAttribute("name") || uid;
            }
        } else {
            actorNameForDisplay = null; // Narrator: no speaker name displayed by default
        }


        const actorFunction = (...args) => {
            if (args.length === 1 && typeof args[0] === 'string' && args[0] === uid) { // Call like kacey("kacey")
                return actorFunction;
            }

            const rawStrings = args[0];
            const substitutions = args.slice(1);
            let message = "";

            for (let i = 0; i < rawStrings.length; i++) {
                message += rawStrings[i];
                if (i < substitutions.length) {
                    message += String(substitutions[i]);
                }
            }
            // VNCommandSay needs the current queue it's being added to for its `player` context
            actorFunction.chainedSayCommands.push(
                new VNCommandSay(currentQueue, uid, message, actorNameForDisplay) // Pass actorNameForDisplay
            );
            return actorFunction;
        }

        actorFunction.chainedSayCommands = [];
        actorFunction.isVnObjectFunction = true;
        actorFunction.metadata = {
            uid: uid,
            displayName: actorNameForDisplay
        }

        // TODO: actorFunction.animate, .hide, .show, .set, .get

        return actorFunction;
    }

    async handleNarrativeText(text) {
        Log.info(`[VNPlayer] Handling narrative text: "${text}"`);
        // This assumes a default text-box exists and VNCommandSay can handle null UID for narrator
        if (!this.#defaultTextBox && this.scene) {
            this.#defaultTextBox = this.scene.querySelector('text-box[uid="dialogue"]') || this.scene.querySelector('text-box');
        }
        if (!this.#defaultTextBox && this.scene && !this.scene.querySelector('text-box')) {
            // Auto-create a default text box if none exists for narrative
            Log.info(`[VNPlayer] Auto-creating default text-box for narrative text.`);
            this.#defaultTextBox = document.createElement('text-box');
            this.#defaultTextBox.setAttribute('uid', 'dialogue'); // A common UID for default
            this.scene.appendChild(this.#defaultTextBox);
            await new Promise(r => requestAnimationFrame(r)); // Wait for connection
        }


        if (this.#defaultTextBox) {
            // Create and execute a temporary SAY command for the narrative text
            const sayCmd = new VNCommandSay(this.currentQueue, null, text, null); // null uid and speakerName for narrator
            await sayCmd.execute(); // Execute directly
        } else {
            Log.error("[VNPlayer] No text-box available to display narrative text:", text);
        }
    }


    #runtimeAPI = {
        START: (...args) => {
            const playerInstance = this.currentQueue.player;
            if (args.length === 0) {
                Log.error`[${playerInstance}] START called with no arguments.`;
                throw new Error("VNPlayer: START command requires at least one argument");
            }

            // The commands from START(...) will form the initial set for the main queue
            // The currentQueue is already initialized by runScene, so we just set its commands.
            playerInstance.currentQueue.setCommands(args); // setCommands calls parseCommands internally
            playerInstance.#runScene(playerInstance.currentQueue);
        },

        SCENE: (...args) => { // This seems to be an alternative to START for self-contained scenes
            const playerInstance = this.currentQueue.player;
            const sceneQueue = new VNCommandQueue(playerInstance, () => true, args);
            playerInstance.#runScene(sceneQueue).then(() => {
                Log.info("SCENE block finished.");
            });
            // SCENE usually implies it's a command itself if nested.
            // If it's top-level, it's like START.
            // For now, assume it's like START for a new block.
            // This will be problematic if SCENE is used mid-script expecting to return something.
            // It's more of a structural keyword. Let's treat it as creating a new root queue to run.
        },

        PLAY: (audio, options = { volume: 1, loop: false }) => {
            return new VNCommandPlayMedia(this.currentQueue, audio, options);
        },

        MUSIC: (audio, options = { volume: 1, loop: true }) => {
            return new VNCommandPlayMedia(this.currentQueue, audio, options);
        },

        PAUSE: (audio) => {
            return new VNCommandPauseMedia(this.currentQueue, audio);
        },

        STOP: (audio, options = { rewind: true }) => {
            return new VNCommandStopMedia(this.currentQueue, audio, options);
        },

        STOP_ALL: () => {
            return new VNCommandStopMedia(this.currentQueue, null, { rewind: true });
        },

        ADD: (object, options = {}) => {
            return new VNCommandAddObject(this.currentQueue, object, options);
        },

        WAIT: (time) => {
            return new VNCommandWait(this.currentQueue, time);
        },

        STYLE: (style) => {
            return new VNCommandStyle(this.currentQueue, style);
        },

        FADE_IN: (duration = '5s') => {
            const playerInstance = this.currentQueue.player;
            duration = Time.parse(duration);
            if (playerInstance.scene) playerInstance.scene.style.filter = "brightness(0%)"; else Log.warn("FADE_IN: No scene found");
            const fadeIn = new VNAnimation(
                [{ filter: "brightness(0%)" }, { filter: "brightness(100%)" }],
                { duration: duration, easing: 'linear', fill: 'forwards', iterations: 1, direction: 'normal', delay: 0 }
            );
            return new VNCommandTransition(this.currentQueue, fadeIn, duration);
        },

        FADE_OUT: (duration = '5s', options = {}) => {
            const playerInstance = this.currentQueue.player;
            duration = Time.parse(duration);
            // No initial style set here, assumes current state is bright.
            const fadeOut = new VNAnimation(
                [{ filter: "brightness(100%)" }, { filter: "brightness(0%)" }],
                { duration: duration, easing: 'ease-in', fill: 'forwards', iterations: 1, direction: 'normal', delay: 0 }
            );
            return new VNCommandTransition(this.currentQueue, fadeOut, duration);
        },

        EVAL: (string) => {
            // Be very careful with eval. It executes in the context of #runtimeAPI here.
            // `this` inside eval will be `this.#runtime`.
            try {
                return eval(string);
            } catch (e) {
                Log.error(`Error in EVAL: "${string}"`, e);
                return undefined;
            }
        },

        IF: (condition, ...args) => {
            return new VNCommandIf(this.currentQueue, condition, ...args);
        },

        ELIF: (condition, ...args) => {
            return new VNCommandElseIf(this.currentQueue, condition, ...args);
        },

        ELSE: (...args) => {
            return new VNCommandElse(this.currentQueue, ...args);
        },

        OPTION: (textOrHtml, ...commands) => {
            // 'this' here is #runtime, so this.currentQueue is VNPlayer.currentQueue
            return new VNCommandOption(this.currentQueue, textOrHtml, ...commands);
        },

        CHOOSE: (...args) => {
            // 'this' here is #runtime
            return new VNCommandChoose(this.currentQueue, ...args);
        },
    };

    #runtime = {};

    async #runScene(queue) {
        this.currentQueue = queue; // Ensure player's currentQueue is the one being run
        Log`[${this}] Running scene with queue: ${queue}`;

        this.dispatchEvent(new CustomEvent("scenestart", {
            detail: { queue: this.currentQueue, scene: this.scene },
            bubbles: true, composed: true
        }));

        Log`[${this}] Entering main loop...`;
        let currentExecutionTarget = queue;
        while (currentExecutionTarget instanceof VNCommandQueue) {
            const res = await currentExecutionTarget.executeCurrent();
            currentExecutionTarget = res;
        }
        // After loop, currentExecutionTarget might be null or some other value.
        // The player's idea of the "active" queue should reflect this.
        this.currentQueue = currentExecutionTarget;


        Log.color("lightgreen")`[${this}] Scene finished running.`;

        this.dispatchEvent(new CustomEvent("sceneend", {
            detail: { queue: this.currentQueue, scene: this.scene }, // currentQueue might be null here
            bubbles: true, composed: true
        }));

        this.#cleanupScene();
    }

    #cleanupScene() {
        Log`[${this}] Cleaning up scene...`;

        // Stop all audio
        const audioElements = this.querySelectorAll("audio"); // Global query on player
        for (const audioElement of audioElements) {
            audioElement.pause();
            audioElement.currentTime = 0;
            // Consider removing event listeners from audio elements if they were added by commands
        }
        // If audio commands add elements to a specific place (e.g., scene), query there.

        this.currentQueue = null; // Reset current queue
        this.#runtime = {};      // Reset runtime context for next scene script
        if (this.scene) {
            // Clear dynamically added elements from the scene, but not vn-project itself.
            // This might be too aggressive if users manually add persistent elements to vn-scene in HTML.
            // A more targeted cleanup might be needed (e.g., remove only elements added by commands).
            // For now, clearing innerHTML is simple.
            // this.scene.innerHTML = ""; // This would remove slots too. Bad.
            // Instead, remove elements from slots or specific types of elements.
            const objectsSlot = this.scene.shadowRoot.querySelector('slot[name="scene-objects"]');
            if (objectsSlot) objectsSlot.assignedElements().forEach(el => el.remove());

            const textboxesSlot = this.scene.shadowRoot.querySelector('slot[name="textboxes"]');
            if (textboxesSlot) textboxesSlot.assignedElements().forEach(el => el.remove());
            
            this.#defaultTextBox = null; // Clear reference to default text box
        }
    }

    cloneObjectDefinition(uid) {
        if (!this.project) {
            Log.warn(`[${this}] Project not found. Cannot clone object definition for UID: ${uid}`);
            return null;
        }
        return this.project.cloneObjectDefinition(uid);
    }

    getObjectDefinition(uid) {
        if (!this.project) {
            Log.warn(`[${this}] Project not found. Cannot get object definition for UID: ${uid}`);
            return null;
        }
        return this.project.getObjectDefinition(uid);
    }

    getSceneObject(uid) {
        if (!this.scene) {
            Log.warn(`[${this}] Scene not found. Cannot get scene object for UID: ${uid}`);
            return null;
        }
        return this.scene.getObject(uid);
    }
}

customElements.whenDefined("vn-project").then((res) => {
    Log`VNPlayer has been registered to the browser - removing FOUC stylesheets...`;
    const styleInjections = document.querySelectorAll("style.__vn-js_no-fouc");
    for (const style of styleInjections) {
        Log`Removing FOUC stylesheet...`;
        style.remove();
    }
});

customElements.define("vn-player", VNPlayer);