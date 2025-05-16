import VNAnimation from "../engine/VNAnimation.js";
import VNCommandPlay from "../engine/commands/VNCommandPlay.js";
import { VNCommandQueue, VNCommand } from "../engine/VNCommand.js";
import VNCommandSay from "../engine/commands/VNCommandSay.js";

import {Log} from "../utils/log.js";
import VNObject from "./vn-object.js";
import VNCommandAddObject from "../engine/commands/VNCommandAddObject.js";
import VNCommandTransition from "../engine/commands/VNCommandTransition.js";
import VNCommandWait from "../engine/commands/VNCommandWait.js";
import Time from "../utils/time.js";

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

        let currentQueue = new VNCommandQueue(this, []);
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
                        const actorFunc = createActorInterface.call(this, key, currentQueue);
                        return actorFunc;
                    }

                    return Reflect.get(target, key, receiver);
                },
            });

            // The magic: use a 'with' statement.
            // 'with' is generally discouraged, but for a DSL execution
            // environment like this, it can be a valid tool.
            // It adds the proxy to the scope chain.
            const fullScriptBody = `with (this) { ${script} }`;
            // Note: 'this' inside the `with` block will refer to runtimeContextProxy.
            //       Any bare identifiers will first be looked up on runtimeContextProxy.

            Log`[VNPlayer] Generated script body for execution:\n${fullScriptBody}`;

            try {
                // fn is called with 'this' as runtimeContextProxy
                const fn = new Function(fullScriptBody);
                fn.call(runtimeContextProxy);
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
        // since this method is called from the context on VNPlayer.#runtime,
        // we cannot use `this` to refer to the VNPlayer. instead, we get it like this.
        const player = currentQueue.player;

        Log`[${this}] Creating actor interface for ${uid}`;

        // Check if the actor has already been imported 
        let actor = player.getSceneObject(uid);

        if (!(actor instanceof HTMLElement)) {
            // If the actor is not in the scene, clone it from the project.
            const definition = player.project.cloneObjectDefinition(uid);

            if (definition instanceof Element) {
                actor = definition;
                // mark as handled so the VNPlayer's mutation observer doesn't try to clone it again.
                actor.setAttribute("cloned", "");
            } else {
                // it doesn't exist in the project either... let's just create a new, empty VNObject?
                Log.color("#ff6666")`[${this}] Actor ${uid} not found in project. Creating a new VNObject.`;

                actor = document.createElement("vn-object");
                actor.setAttribute("uid", uid);
                actor.setAttribute("name", uid);
                // mark as handled
                actor.setAttribute("cloned", "");
                actor.setAttribute("type", "actor");
                actor.style.display = "none";

                player.scene.appendChild(actor);
            }
        }

        // Calling an actor function by itself as a string tag function
        // So you can chain dialogue without needing a commma
        const actorFunction = (...args) => {
            if (args.length === 0 && args[0] === uid) {
                return actorFunction;
            }

            console.log("strings", args);

            const rawStrings = args[0];
            const substitutions = args.slice(1);
            
            let message = "";
            
            for (let i = 0; i < rawStrings.length; i++) {
                message += rawStrings[i];
                if (i < substitutions.length) {
                    // Ensure substitutions are converted to strings, though they usually are.
                    message += String(substitutions[i]);
                }
            }

            actorFunction.chainedSayCommands.push(
                new VNCommandSay(currentQueue, uid, message)
            );

            console.log("chainedSayCommands", actorFunction.chainedSayCommands);

            return actorFunction;
        }

        actorFunction.chainedSayCommands = [];
        actorFunction.isVnObjectFunction = true;
        actorFunction.metadata = {
            uid: uid,
        }

        actorFunction.animate = (...args) => {
            // todo
        }

        actorFunction.hide = (...args) => {
            // todo
        }

        actorFunction.show = (...args) => {
            // todo
        }

        actorFunction.set = (...args) => {
            // todo
        }

        actorFunction.get = (...args) => {
            // todo
        }

        return actorFunction;
    }

    /**
     * An object containing the functions and properties that are available
     * to the scene script. Each property is copied over to this.#runtime
     */
    #runtimeAPI = {
        START: (...args) => {
            const length = args.length;

            if (length === 0) {
                Log`[${this}] START was called with no arguments.`;
                throw new Error(
                    "VNPlayer: START command requires at least one argument"
                );
            }

            let queue = null;

            if (args[0] instanceof VNCommandQueue) {
                queue = args[0];
            } else {
                queue = new VNCommandQueue(this, () => { return true; }, args);
            }

            if (queue) {
                this.#runScene(queue);
            } else {
                Log`[${this}] No queue to execute.`;
                throw new Error("VNPlayer: No queue to execute");
            }
        },

        SCENE: (...args) => {
            const queue = new VNCommandQueue(this, () => { return true; }, args);
            this.#runScene(queue).then((res) => {
                alert("Test: Finished running scene.");
            });
        },

        // PLAY('someSong')
        PLAY: (
            uid,
            options = {
                volume: 1,
                loop: false,
            }
        ) => {
            return new VNCommandPlay(this.currentQueue, uid, options);
        },

        ADD: (object, options = {
            // any attributes to override on the object from the project
        }) => {
            return new VNCommandAddObject(this.currentQueue, object, options);
        },

        WAIT: (time) => {
            return new VNCommandWait(this.currentQueue, time);
        },

        // Simple, non-intimidating scene transitions for users that don't need anything too fancy.
        FADE_IN: (duration = '5s') => {
            // ms now
            duration = Time.parse(duration);
            
            // set the scene to black
            this.scene.style.filter = "brightness(0%)";
            const fadeIn = new VNAnimation([
                { filter: "brightness(0%)" },
                { filter: "brightness(100%)" }
            ], {
                duration: duration,
                easing: 'linear',
                fill: 'forwards',
                iterations: 1,
                direction: 'normal',
                delay: 0,
            });

            return new VNCommandTransition(this.currentQueue, fadeIn, duration);
        },

        FADE_OUT: (duration = '5s', options = {/* todo */}) => {
            // ms now
            duration = Time.parse(duration);

            const fadeOut = new VNAnimation([
                { filter: "brightness(100%)" },
                { filter: "brightness(0%)" }
            ], {
                duration: duration,
                easing: 'ease-in',
                fill: 'forwards',
                iterations: 1,
                direction: 'normal',
                delay: 0,
            });

            return new VNCommandTransition(this.currentQueue, fadeOut, duration);
        },

        EVAL: (string) => {
            const res = eval(string);
        },

        IF: (condition, ...args) => {
            
        },

        ELSEIF: (condition, ...args) => {

        },

        ELSE: (condition, ...args) => {

        },

        
    };

    /**
     * The object which the scene script runs in.
     */
    #runtime = {};
    
    /**
     * Scene script lifecycle method.
     * @param {VNCommandQueue} queue 
     * 
     * @todo 
     * Add a loading screen that checks all VNCommands of every queue's `preloading` array which may contain pending promises, 
     * and only start the scene when all of them are resolved/rejected. It is up to each command to handle failures.
     */
    async #runScene(queue) {
        // 1. Set the current queue to the one we are running.
        this.currentQueue = queue;
        Log`[${this}] Running scene with queue: ${queue}`;

        // 2. Emit an event for any listeners
        this.dispatchEvent(new CustomEvent("scenestart", {
            detail: {
                // the queue that is being executed
                queue: this.currentQueue,
                // host <vn-scene> element
                scene: this.scene,
            },
            bubbles: true,
            composed: true   
        }));
        
        // 3. Keep executing the commands of the queue until there are no more commands to execute.
        Log`[${this}] Entering main loop...`;
        while (this.currentQueue instanceof VNCommandQueue) {

            // The executeCurrent method always returns which queue needs to be executed at any given moment.
            // This includes any nested queue that is returned by a command or exists as a commant within the queue's `commands` array.
            // Nesting/returning logic is handled by this method as well.
            const res = await queue.executeCurrent();

            // keep going if the result is a VNCommandQueue
            if (!(res instanceof VNCommandQueue)) {
                break;
            }

            this.currentQueue = res;
        }

        // 4. The scene is done because the queue became null or something other than a VNCommandQueue instance.
        Log.color("lightgreen")`[${this}] Scene finished running.`;
        
        // 5. Let any listeners know that it's done.
        this.dispatchEvent(new CustomEvent("sceneend", {
            detail: {
                queue: this.currentQueue,
                scene: this.scene,
            },
            bubbles: true,
            composed: true
        }));

        // 6. Cleanup
        this.#cleanupScene();
    }

    #cleanupScene() {
        Log`[${this}] Cleaning up scene...`;

        // 1. Stop all audio that is playing.
        const audio = this.querySelectorAll("audio");
        
        for (const audioElement of audio) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }

        // 1. Reset the current queue to null.
        this.currentQueue = null;

        // 2. Reset the runtime context
        this.#runtime = {};

        // 3. Remove any lingering objects from the scene.
        // If you don't want this to look ugly, then you should add a transition to your scene before it ends.
        this.scene.innerHTML = "";
    }

    /* ************************** <vn-project> API wrappers *************************** */

    cloneObjectDefinition(uid) {
        return this.project.cloneObjectDefinition(uid);
    }

    getObjectDefinition(uid) {
        return this.project.getObjectDefinition(uid);
    }

    /* *************************** <vn-scene> API wrappers **************************** */

    getSceneObject(uid) {
        return this.scene.getObject(uid);
    }
}

// If the library was loaded via a non-module script which injects anti-FOUC stylesheets,
// they need to be removed once the <vn-project> element is registered to the DOM as a custom element with its own shadow DOM.
customElements.whenDefined("vn-project").then((res) => {
    Log`VNPlayer has been registered to the browser - removing FOUC stylesheets...`;
    const styleInjections = document.querySelectorAll("style.__vn-js_no-fouc");
    for (const style of styleInjections) {
        Log`Removing FOUC stylesheet...`;
        style.remove();
    }
});

customElements.define("vn-player", VNPlayer);
