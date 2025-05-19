import VNAnimation from "../engine/VNAnimation.js";
import VNCommandPlayMedia from "../engine/commands/VNCommandPlayMedia.js";
import { VNCommandQueue, VNCommand } from "../engine/VNCommand.js";
import VNCommandSay from "../engine/commands/VNCommandSay.js";
import { VNCommandIf, VNCommandElseIf, VNCommandElse } from "../engine/commands/VNCommandIf.js";


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
            subtree: true,
        });
    }

    /**
     * Copies over the API functions from this.#runtimeAPI to the object the script will run in.
     * These functions are separate from the #runtime object so that they can be identified as API functions,
     * regardless if anything else is added to the runtime object.
     */
    initRuntime() {
        // 1. Reset the runtime context.
        this.#runtime = {};

        // 2. Copy over the api functions to the runtime object where the script will run.
        for (const key of Object.keys(this.#runtimeAPI)) {
            const value = this.#runtimeAPI[key];

            if (typeof value === "function") {
                this.#runtime[key] = value.bind(this.#runtime);
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
        
        const createActorInterface = this.createActorInterface;

        if (typeof script === "string") {
            // Catching any reference errors in the script to dynamically create actors and bind them to the runtime context.
            // HEADS UP: This proxy becomes the 'this' context of the script!
            const runtimeContextProxy = new Proxy(this.#runtime, {
                has(target, key) {
                    if (typeof key === "symbol" || key === Symbol.unscopables) {
                        console.log("symbol", key);
                        return false;
                    }

                    return true; // assume all keys exist
                },
                get(target, key, receiver) {
                    if (key in target) {
                        return Reflect.get(target, key, receiver);
                    } else if (key in globalThis) {
                        return globalThis[key];
                    } else if (!(key in target) && !(key in globalThis) && (typeof key !== 'symbol' && key !== Symbol.unscopables)) {
                        // If the key is not in the target, and not in globalThis,
                        // assume the user is trying to import an actor to the scene.
                        const actorFunc = createActorInterface.call(this, key, currentQueue); // Pass player context correctly
                        return actorFunc;
                    }

                    return Reflect.get(target, key, receiver);
                },
            });

            const fullScriptBody = `with (this) { ${script} }`;
            Log`[VNPlayer] Generated script body for execution:\n${fullScriptBody}`;

            try {
                const fn = new Function(fullScriptBody);
                fn.call(runtimeContextProxy); // 'this' inside script will be runtimeContextProxy
            } catch (e) {
                throw e;
            }
        }
    }

    /**
     * Objects added to the scene may be referenced in the scene script by their uid.
     * Any object can be used as a speaker by calling it as a tagged template literal function.
     * @param {string} uid The uid of an existing <vn-object> element inside <vn-project>.
     * @param {VNCommandQueue} currentQueue 
     * @returns {Function} A chainable function which, internally, holds an array of VNCommandSay commands.
     */
    createActorInterface(uid, currentQueue) {
        const player = currentQueue.player;

        Log`[${player}] Creating actor interface for ${uid}`;

        let actor = player.getSceneObject(uid);

        if (!(actor instanceof HTMLElement)) {
            const definition = player.project.cloneObjectDefinition(uid);

            if (definition instanceof Element) {
                actor = definition;
                actor.setAttribute("cloned", "");
            } else {
                Log.color("#ff6666")`[${player}] Actor ${uid} not found in project. Creating a new VNObject.`;
                actor = document.createElement("vn-object");
                actor.setAttribute("uid", uid);
                actor.setAttribute("name", uid);
                actor.setAttribute("cloned", "");
                actor.setAttribute("type", "actor");
                actor.style.display = "none";
                player.scene.appendChild(actor);
            }
        }

        const actorFunction = (...args) => {
            if (args.length === 0 && args[0] === uid) {
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

            actorFunction.chainedSayCommands.push(
                new VNCommandSay(currentQueue, uid, message)
            );
            return actorFunction;
        }

        actorFunction.chainedSayCommands = [];
        actorFunction.isVnObjectFunction = true;
        actorFunction.metadata = {
            uid: uid,
        }

        actorFunction.animate = (...args) => { /* todo */ }
        actorFunction.hide = (...args) => { /* todo */ }
        actorFunction.show = (...args) => { /* todo */ }
        actorFunction.set = (...args) => { /* todo */ }
        actorFunction.get = (...args) => { /* todo */ }

        return actorFunction;
    }

    #runtimeAPI = {
        START: (...args) => {
            const playerInstance = this.currentQueue.player; // 'this' here refers to #runtime, so get player from currentQueue
            if (args.length === 0) {
                Log`[${playerInstance}] START was called with no arguments.`;
                throw new Error("VNPlayer: START command requires at least one argument");
            }

            let queue;
            if (args[0] instanceof VNCommandQueue) {
                queue = args[0];
                queue.player = playerInstance; // Ensure player is set
                queue.parentQueue = null; // START creates a root queue
            } else {
                // The commands from START(...) will form the initial set for the main queue
                playerInstance.currentQueue.setCommands(playerInstance.currentQueue.parseCommands(...args));
                queue = playerInstance.currentQueue;
            }
            
            playerInstance.#runScene(queue);
        },

        SCENE: (...args) => {
            const playerInstance = this.currentQueue.player;
            const queue = new VNCommandQueue(playerInstance, () => true, args);
            playerInstance.#runScene(queue).then((res) => {
                alert("Test: Finished running scene.");
            });
        },

        PLAY: (audio, options = { volume: 1, loop: false }) => {
            return new VNCommandPlayMedia(this.currentQueue.player.currentQueue, audio, options);
        },

        MUSIC: (audio, options = { volume: 1, loop: true }) => {
            return new VNCommandPlayMedia(this.currentQueue.player.currentQueue, audio, options);
        },

        PAUSE: (audio) => {
            return new VNCommandPauseMedia(this.currentQueue.player.currentQueue, audio);
        },

        STOP: (audio, options = { rewind: true }) => {
            return new VNCommandStopMedia(this.currentQueue.player.currentQueue, audio, options);
        },

        STOP_ALL: () => {

            return new VNCommandStopMedia(this.currentQueue.player.currentQueue, null, { rewind: true });
        },

        ADD: (object, options = {}) => {
            return new VNCommandAddObject(this.currentQueue.player.currentQueue, object, options);
        },

        WAIT: (time) => {
            return new VNCommandWait(this.currentQueue.player.currentQueue, time);
        },

        STYLE: (style) => {
            return new VNCommandStyle(this.currentQueue.player.currentQueue, style);
        },

        FADE_IN: (duration = '5s') => {
            const playerInstance = this.currentQueue.player;
            duration = Time.parse(duration);
            playerInstance.scene.style.filter = "brightness(0%)";
            const fadeIn = new VNAnimation(
                [{ filter: "brightness(0%)" }, { filter: "brightness(100%)" }],
                { duration: duration, easing: 'linear', fill: 'forwards', iterations: 1, direction: 'normal', delay: 0 }
            );
            return new VNCommandTransition(playerInstance.currentQueue, fadeIn, duration);
        },

        FADE_OUT: (duration = '5s', options = {}) => {
            const playerInstance = this.currentQueue.player;
            duration = Time.parse(duration);
            const fadeOut = new VNAnimation(
                [{ filter: "brightness(100%)" }, { filter: "brightness(0%)" }],
                { duration: duration, easing: 'ease-in', fill: 'forwards', iterations: 1, direction: 'normal', delay: 0 }
            );
            return new VNCommandTransition(playerInstance.currentQueue, fadeOut, duration);
        },

        EVAL: (string) => {
            return eval(string);
        },

        IF: (condition, ...args) => {
            // 'this' is #runtime object. Get currentQueue from player.
            const playerInstance = this.currentQueue.player;
            return new VNCommandIf(playerInstance.currentQueue, condition, ...args);
        },

        ELIF: (condition, ...args) => { // Corrected name from ELSEIF to ELIF
            const playerInstance = this.currentQueue.player;
            return new VNCommandElseIf(playerInstance.currentQueue, condition, ...args);
        },

        ELSE: (...args) => { // ELSE does not take a condition
            const playerInstance = this.currentQueue.player;
            return new VNCommandElse(playerInstance.currentQueue, ...args);
        },
    };

    #runtime = {};
    
    async #runScene(queue) {
        this.currentQueue = queue;
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
        this.currentQueue = currentExecutionTarget; // Update currentQueue state

        Log.color("lightgreen")`[${this}] Scene finished running.`;
        
        this.dispatchEvent(new CustomEvent("sceneend", {
            detail: { queue: this.currentQueue, scene: this.scene },
            bubbles: true, composed: true
        }));

        this.#cleanupScene();
    }

    #cleanupScene() {
        Log`[${this}] Cleaning up scene...`;

        const audio = this.querySelectorAll("audio");
        for (const audioElement of audio) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }

        this.currentQueue = null;
        this.#runtime = {};
        if (this.scene) { // Check if scene exists before clearing
            this.scene.innerHTML = "";
        }
    }

    cloneObjectDefinition(uid) {
        return this.project.cloneObjectDefinition(uid);
    }

    getObjectDefinition(uid) {
        return this.project.getObjectDefinition(uid);
    }

    getSceneObject(uid) {
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