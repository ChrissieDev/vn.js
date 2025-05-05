/**
 * @file /components/vn-player.js
 */

import VNCommandAnimate from "../engine/commands/VNCommandAnimate.js";
import VNAnimation from "../engine/VNAnimation.js";
import VNCommandQueue from "../engine/VNCommandQueue.js";
import VNActorElement from "./vn-actor.js";

/**
 * @summary This is the top-level element for the visual novel engine.
 * It is responsible for loading the project data and assets, and hosting the <vn-scene> element where the state is rendered at runtime.
 * It also provides the runtime context for the VN script to execute in. VN Scripts are run by adding a <vn-script> element to the <vn-scene>.
 */
export default class VNPlayerElement extends HTMLElement {
    #projectElement = null;
    #sceneElement = null;
    #scriptElement = null;

    #mainScriptQueue = null;
    /**
     * @type {VNCommandQueue}
     */
    #currentQueue = null;
    #executionPaused = false;
    isPlaying = false;

    /**
     * Holds all actor functions created by the VNPlayerElement so actors may be referenced by their UID in the script at runtime.
     * The #runtime object has a reference to each actor function by its UID. They should not collide with any other properties in the runtime object.
     */
    #actorFunctions = new Map();

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host { 
                    display: block;
                    position: relative;
                    width: 100%;
                    height: 100%;

                    max-width: 100%;
                    max-height: 100%;
                    margin: 0;
                    padding: 0;
                    background-color: #111;
                    
                    place-content: center;
                }

                ::slotted(vn-scene) {
                    display: block;
                }

                ::slotted(vn-project),
                ::slotted(script[type="text/vn-script"]) { 
                    display: none;
                }
            </style>
            <slot></slot>
        `;
    }

    async connectedCallback() {
        this.#projectElement = this.querySelector("vn-project");
        this.#sceneElement = this.querySelector("vn-scene");

        /** @todo Only let scripts be run on <vn-scene> to make it clear where the script is executed. */
        this.#scriptElement = this.querySelector(
            '& > vn-scene > script[type="text/vn-script"]'
        );

        if (!this.#projectElement) {
            console.error(
                "<vn-player> requires a <vn-project> child element to load assets and project data."
            );
        }

        if (!this.#sceneElement) {
            console.error(
                "<vn-player> requires a <vn-scene> child element to display the game."
            );
        }

        if (!this.#scriptElement) {
            console.warn(
                '<vn-player> does not have a <script type="text/vn-script"> child element. No game script will be loaded.'
            );
        } else {
            await new Promise((resolve) => requestAnimationFrame(resolve));

            if (typeof VNCommandQueue === "undefined") {
                console.error(
                    "Cannot prepare runtime: VNCommandQueue is undefined."
                );
                return;
            }
        }

        this.#initQueue();
        this.#prepareRuntimeContext();
        await this.runScript();

        this.addEventListener("proceed", this.#handleProceed);
    }

    disconnectedCallback() {
        this.#projectElement = null;
        this.#sceneElement = null;
        this.#scriptElement = null;
        this.#mainScriptQueue = null;
        this.#currentQueue = null;
        this.#executionPaused = false;
        this.isPlaying = false;
        this.#actorFunctions.clear();
        this.removeEventListener("proceed", this.#handleProceed);
    }

    getProject() {
        return this.#projectElement;
    }
    getScene() {
        return this.#sceneElement;
    }
    getScriptElement() {
        return this.#scriptElement;
    }
    getAssetDefinition(uid) {
        return this.#projectElement?.getAssetDefinition(uid);
    }
    getMainQueue() {
        return this.#mainScriptQueue;
    }
    /**
     * @todo Define all the `runtime_` prefixed methods in here instead without the prefix.
     * This is also good to check which names collide with the runtime API.
     */
    #runtimeBase = {};

    /**
     * The context in which scripts are run in. The entire API for user scripts exists here at runtime.
     * It can be thought of as a script's "global" scope at runtime.
     */
    #runtime = {
        player: this,
        _lastPlayedQueue: null,
    };
    
    /**
     * Runs the script content from the <script> element or a provided string.
     * @param {string} [string] - Optional string to run as script content.
     * @returns {Promise<void>} - Resolves when the script is loaded and
     * @todo This method has multiple concerns. We should separate loading and execution.
     */
    async runScript(string) {

        let scriptContent = string || null;
        console.log("Preparing to execute script via new Function()...");

        const runtimeKeys = Object.keys(this.#runtime);

        // Add a `const` declaration for each runtime function so the user doesn't have to write `this.<functionName>` for each function.
        const declarations = runtimeKeys
            .filter((key) => {
                if (key.startsWith("_")) return false;
                const descriptor = Object.getOwnPropertyDescriptor(
                    this.#runtime,
                    key
                );
                return (
                    descriptor &&
                    typeof descriptor.get === "undefined" &&
                    typeof descriptor.set === "undefined"
                );
            })
            .map((key) => `const ${key} = this.${key};`)
            .join("\n");

        const finalScriptBody =
            declarations + "\n\n// --- User Script Start ---\n" + scriptContent;
        console.log(
            "--- Generated Script Body (Declarations + User Script) ---"
        );
        console.log("--- End Generated Script Body ---");

        // Check for CSP restrictions
        try {
            const testFunc = new Function(
                "console.log('new Function() test executed successfully.'); return true;"
            );
            const testResult = testFunc();
            if (!testResult) {
                console.error("new Function() test did not return true!");
            }
        } catch (e) {
            console.error(
                "CRITICAL: Failed to create or execute test function with new Function():",
                e
            );
            console.error(
                "This might be due to Content Security Policy (CSP) restrictions."
            );
            return;
        }

        console.log("Creating main script function from combined body...");
        const scriptFunction = new Function(finalScriptBody);

        console.log(
            "Calling main script function with runtime context:",
            this.#runtime
        );

        scriptFunction.call(this.#runtime);

        console.log("Main script function call completed.");

        if (this.#runtime._lastPlayedQueue) {
            if (this.#runtime._lastPlayedQueue instanceof VNCommandQueue) {
                this.#mainScriptQueue = this.#runtime._lastPlayedQueue;

                console.log(
                    "Script loaded. Main queue set:",
                    this.#mainScriptQueue
                );

                if (this.#mainScriptQueue) {
                    console.log(
                        "VNPlayer: Auto-starting execution of main queue."
                    );
                    this.setCurrentQueue(this.#mainScriptQueue);
                    this.isPlaying = true;
                    this.continueExecution();
                }

            } else {
                console.error(
                    "Script loaded, but the object stored by play() is not a VNCommandQueue instance.",
                    this.#runtime._lastPlayedQueue
                );
            }
        } else {
            console.warn(
                "Script function call completed, but no queue was stored by play(). Did the script run correctly and call play()?"
            );
        }
    }

    /**
     * Sets the currently active command queue.
     * @param {VNCommandQueue} queue
     */
    setCurrentQueue(queue) {
        console.log("Setting current queue:", queue);
        this.#currentQueue = queue;
        if (this.#currentQueue) {
            this.#currentQueue.scene = this.getScene();
        } else {
            console.warn("Attempted to set an invalid current queue.");
        }
    }

    /**
     * Called by VNCommandQueue when it finishes executing all its commands.
     * @param {VNCommandQueue} completedQueue
     */
    onQueueComplete(completedQueue) {
        console.log("Queue completed:", completedQueue);
        if (completedQueue === this.#currentQueue) {
            if (this.#currentQueue?.parentQueue) {
                const parent = this.#currentQueue.parentQueue;
                console.log("Returning to parent queue:", parent);
                this.setCurrentQueue(parent);
                if (this.#currentQueue) {
                    this.continueExecution();
                } else {
                    console.error(
                        "Current queue became null unexpectedly after returning to parent."
                    );
                    this.isPlaying = false;
                }
            } else {
                console.log("Main script queue finished.");
                this.isPlaying = false;
                this.#currentQueue = null;
            }
        } else {
            console.warn(
                "A non-current queue reported completion. This might indicate an issue.",
                completedQueue,
                this.#currentQueue
            );
            if (completedQueue === this.#mainScriptQueue) {
                this.isPlaying = false;
                this.#currentQueue = null;
            }
        }
    }

    /**
     * Starts or resumes the execution loop for the current queue.
     */
    continueExecution() {
        if (this.#executionPaused) {
            console.log("Execution loop already active, call deferred.");
            return;
        }
        if (!this.isPlaying || !this.#currentQueue) {
            if (!this.#currentQueue)
                console.log("Execution halted: No current queue.");
            else if (!this.isPlaying)
                console.log("Execution halted: Player not playing.");
            return;
        }

        this.#executionPaused = true;
        console.log("--- Execution Loop Tick ---");

        let continueImmediately = true;
        while (continueImmediately && this.#currentQueue && this.isPlaying) {
            try {
                continueImmediately = this.#currentQueue.executeCurrent();
            } catch (error) {
                console.error("Error in execution loop:", error);
                this.isPlaying = false;
                continueImmediately = false;
            }
            if (!this.#currentQueue) {
                console.log(
                    "Execution stopped: Queue became null during loop."
                );
                this.isPlaying = false;
                break;
            }
        }

        this.#executionPaused = false;
        console.log(
            `--- Execution Loop Tick ${continueImmediately ? "Continuing" : "Paused/Ended"
            } ---`
        );
    }

    /**
     * Handles the 'proceed' event (e.g., from text-box).
     */
    #handleProceed = (event) => {
        console.log("Proceed event received.");
        if (this.#currentQueue && this.isPlaying) {
            if (!this.#executionPaused) {
                console.log(
                    "Proceed: Handling pause completion and advancing queue."
                );

                const commandIndex = this.#currentQueue.i;
                const command = this.#currentQueue.commands[commandIndex];
                if (command && typeof command.execute === "function") {
                    this.#currentQueue.i++;
                    console.log(
                        `Proceed: Queue index advanced from ${commandIndex} to ${this.#currentQueue.i
                        }`
                    );

                    if (typeof command.resume === "function") {
                        console.log(
                            `Proceed: Calling resume() for command ${command.constructor.name}`
                        );
                        command.resume();
                    }
                } else {
                    console.warn(
                        `Proceed: No valid command found at index ${commandIndex} to advance past.`
                    );
                }

                this.continueExecution();
            } else {
                console.log(
                    "Proceed received, but execution loop is already active (mid-tick). Ignoring."
                );
            }
        } else {
            console.warn(
                "Proceed event received but player is not playing or has no current queue."
            );
        }
    };
    
    #cleanupScene() {
        this.#sceneElement.clearAll();
    }

    getQueue() {
        return this.#currentQueue;
    }
    
    #initQueue() {
        // clear the queue for a new blank slate
        this.#currentQueue = new VNCommandQueue({
            player: this,
            parentQueue: null,
            scene: this.#sceneElement
        });
    }

    /**
     * Builds the runtime context for scripts to execute in.
     * The main API is defined here.
     *
     * @todo Refactor be more structured, perhaps define it in some private property #runtimeBase
     * so we can just copy it over to #runtime.
     */
    #prepareRuntimeContext() {
        console.log("Preparing runtime context...");

        for (const key in Object.keys(this.#runtime)) {
            if (key !== "player" && key !== "_lastPlayedQueue") {
                delete this.#runtime[key];
            }
        }

        

        this.#actorFunctions.clear();

        // WTF? why are we storing the api in the player itself
        // we have to clean up google gemini's mess
        // this runtime_ prefix needs to go. let's just create a #runtimeBase object where the functions are defined.
        this.#runtime.player = this;
        this.#runtime.SCENE = this.#runtime_SCENE;
        this.#runtime.PLAY = this.#runtime_PLAY;
        this.#runtime.IF = this.#runtime_IF;
        this.#runtime.ELSE = this.#runtime_ELSE;
        this.#runtime.CHECK = this.#runtime_CHECK;
        this.#runtime.$ = this.#runtime_$;
        this.#runtime.ADD = this.#runtime_ADD;
        this.#runtime.CREATE = this.#runtime_CREATE;
        this.#runtime.START = this.#runtime_START;
        this.#runtime.CHOICE = this.#runtime_CHOICE;
        this.#runtime.PICK = this.#runtime_PICK;
        this.#runtime.RUN = this.#runtime_RUN;
        this.#runtime.ANIMATE = this.#runtime_ANIMATE;
        this.#runtime.ANIMATION = this.#runtime_ANIMATION;
        this.#runtime.SELECT = this.#runtime_SELECT;
        this.#runtime.WAIT = this.#runtime_WAIT;
        this.#runtime.text = this.#runtime_text;

        Object.defineProperty(this.#runtime, "innerHTML", {
            get: this.#runtime_getInnerHTML,
            set: this.#runtime_setInnerHTML,
            enumerable: true,
            configurable: true,
        });

        const assets = this.#projectElement?.getAssetsElement();

        // Create a default definition for the "you" actor if it doesn't exist before any project is run.
        if (!assets) {
            throw new ReferenceError(
                "No instance of <vn-assets> found in the project. Your <vn-project> must contain a <vn-assets> element!"
            );
        }

        if (assets) {
            this.#ensureDefaultActorAsset(assets, "you", "You");
            const actorDefs = assets.querySelectorAll(":scope > vn-actor[uid]");
            console.log(
                `Found ${actorDefs.length} actor definitions in <vn-assets>.`
            );

            // Build any actor functions that are missing from the runtime.
            for (const actorDef of actorDefs) {
                const uid = actorDef.getAttribute("uid");
                const name = actorDef.getAttribute("name") || uid;

                // Does the actor function already exist in the runtime?
                if (uid && !this.#runtime[uid]) {
                    const actorFunction = this.#createActorFunction(
                        uid,
                        name,
                        actorDef
                    );

                    // The Map holds a reference to all actor functions so if we want to remove all actor functions from the runtime,
                    // we iterate over the Map and remove them from the runtime (and the Map).
                    // This should keep all other properties if needed.
                    this.#actorFunctions.set(uid, actorFunction);
                    this.#runtime[uid] = actorFunction;
                } else {
                    console.warn(
                        `Refusing to overwrite existing actor function for actor "${uid}" as one already exists within the script's context.`
                    );
                }
            }
        } else {
            throw new ReferenceError(
                `No instance of <vn-assets> found in the project. Your <vn-project> must contain a <vn-assets> element!`
            );
        }

        console.log("Runtime properties prepared:", Object.keys(this.#runtime));
    }

    #ensureDefaultActorAsset(assetsElement, uid, defaultName) {
        if (!assetsElement.querySelector(`:scope > vn-actor[uid="${uid}"]`)) {
            console.log(
                `Default actor definition for "${uid}" not found. Creating...`
            );
            const actorEl = document.createElement("vn-actor");
            actorEl.setAttribute("uid", uid);
            actorEl.setAttribute("name", defaultName);
            assetsElement.appendChild(actorEl);
            console.log(
                `Created <vn-actor uid="${uid}" name="${defaultName}"> in <vn-assets>.`
            );
        }
    }

    /**
     * Create the function meant to exist in the global scope of the VN runtime.
     * @param {string} uid
     * @param {string} displayName
     * @param {VNActorElement} actorDef
     * @returns
     */
    #createActorFunction(uid, displayName, actorDef) {
        console.log(
            `Creating runtime function for actor: ${uid} (Display: ${displayName})`
        );

        /**
         * Object and function that lives in the global scope of the scene runtime
         * so actors may be referenced by their name directly. It also makes writing
         * dialogue a lot easier.
         * @example Here is how it is used in user scripts:
         * ```js
         * SCENE(
         *   harumi
         *  `Hello, world!`,
         *
         *  you
         *  `What's up?`,
         *  
         *  // Or like this
         *  harumi `Just testing this out.`,
         * )
         * ```
         * @todo Wrap in a Proxy to handle the `delete` operation so we can remove the actor's associated element from the scene.
         */
        const actorFunc = (strings, ...values) => {
            const text = strings.reduce(
                (acc, str, i) => acc + str + (values[i] || ""),
                ""
            );

            return {
                type: "say",
                actorUid: uid,
                actorName: displayName || uid,
                text: text.trim(),
            };
        };

        // getter/setter for the actor instace's display name. this does not persist
        Object.defineProperty(actorFunc, "name", {
            get: () => {
                console.log(`Getter called for ${uid}.NAME`);
                return actorDef.getAttribute("name");
            },

            set: (newName) => {
                console.log(
                    `Setter called for ${uid}.name with value:`,
                    newName
                );
                let valueToSet;
                if (typeof newName === "string") {
                    valueToSet = newName;
                } else {
                    console.warn(
                        `Actor function NAME setter for ${uid} received non-string: ${newName}, stringifying...`
                    );
                    valueToSet = String(newName);
                }

                actorDef.setAttribute("name", valueToSet);
            },
            configurable: true,
            enumerable: true,
        });

        // getter for the actor's definition
        Object.defineProperty(actorFunc, "definition", {
            /**
             * @returns {VNActorElement | null} The actor definition element inside <vn-assets>
             */
            get: () => {
                console.log(`(assetFunc) Asset definition referenced: ${uid}`);
                return actorDef;
            },
            configurable: true,
            enumerable: true,
        });

        /**
         * Directly animate an actor element using a VNAnimation or creating one using keyframes and options.
         * @todo Document arguments/overloads
         * @todo Refactor this to be more readable and less verbose
         */
        actorFunc.animate = (...args) => {
            console.log(`API: Building VNCommandAnimate for ${uid}.`);
            let wait = false;

            let animation = null;
            if (args[0] instanceof VNAnimation) {
                animation = args[0];
                if (args.length === 2) {
                    const animateOptions = args[1] || {};

                    if (typeof animateOptions !== "object") {
                        console.error(
                            `Actor function ANIMATE() called with invalid arguments: ${args}. Expected object for options.`
                        );
                        return null;
                    }

                    wait = animateOptions.wait || false;
                    const options = animateOptions.options || {};

                    animation.overrideOptions(options);
                }
            } else if (args.length >= 2) {
                console.log("API: ANIMATE called with keyframes and options.");
                // has keyframes, options, onFinish
                const keyframes = args[0];
                const options = args[1];

                if (args.length >= 3) {
                    console.log("onFinish argument found:", args[2]);
                    if (typeof args[2] !== "function") {
                        console.error(
                            `Actor function ANIMATE() called with invalid arguments: ${args}. Expected function for onFinish.`
                        );
                        return null;
                    }

                    const onFinish = args[2];
                    animation = new VNAnimation(keyframes, options, onFinish);
                }

                // don't reassign animation if it was already assigned with an onFinish function
                if (!animation) {
                    animation = new VNAnimation(keyframes, options);
                }
            } else {
                // error
                console.error(
                    `Actor function ANIMATE() called with invalid arguments: ${args}`
                );

                return null;
            }
            console.log(
                `\x1b[31mAPI: ANIMATE called for ${uid} with wait: ${wait}\x1b[0m`
            );
            return new VNCommandAnimate(
                // this is null at this point because play() hasn't been called yet.
                this.#currentQueue,
                actorFunc.definition,
                animation,
                wait
            );
        };

        // gets the associated <vn-actor> definition equivalent, if any
        Object.defineProperty(actorFunc, "definition", {
            get: () => {
                console.log(`Getter called for ${uid}.definition`);
                return actorDef || null;
            },
            configurable: true,
            enumerable: true,
        });

        return actorFunc;
    }

    #runtime_SCENE = (...commands) => {
        console.log("API: SCENE called");

        try {
            const queue = new VNCommandQueue({ player: this }, ...commands);
            console.log("API: SCENE returning queue:", queue);
            queue._isQueueFromSCENE = true;
            return queue;
        } catch (error) {
            console.error("API: SCENE Error creating VNCommandQueue:", error);
            return null;
        }
    };

    #runtime_WAIT = (time) => {
        console.log("API: WAIT called with time:", time);
        return {
            type: "wait",
            time,
        }
    }
    #runtime_SELECT = (uid) => {
        console.log("API: SELECT called with uid:", uid);

        if (typeof uid !== "string") {
            console.error("API: SELECT Error: uid must be a string.");
            return null;
        }

        // find the element in the scene
        const element = this.#sceneElement.querySelector(`[uid="${uid}"]`);

        if (!element) {
            console.error(
                `API: SELECT Error: Element with uid "${uid}" not found in the scene.`
            );
        }

        return element;
    };

    #runtime_PLAY = (sceneQueue) => {
        console.log("API: play called with argument:", sceneQueue);
        console.log(
            `API: play - Checking typeof argument: ${typeof sceneQueue}`
        );

        if (sceneQueue && typeof sceneQueue === "object") {
            console.log(
                `API: play - Argument constructor name: ${sceneQueue.constructor?.name}`
            );
            console.log(
                `API: play - Argument has _isQueueFromSCENE marker: ${!!sceneQueue._isQueueFromSCENE}`
            );
        }
        
        if (sceneQueue instanceof VNCommandQueue) {
            console.log(
                "API: play - Argument IS instanceof VNCommandQueue. Storing."
            );
            this.#runtime._lastPlayedQueue = sceneQueue;
        } else {
            console.error(
                "API: play - Argument IS NOT instanceof VNCommandQueue. Check logs.",
                "Received:",
                sceneQueue
            );
            this.#runtime._lastPlayedQueue = null;
        }
    };

    #runtime_IF = (conditionOrValue, ...commands) => {
        console.log("API: IF called");
        let conditionFunc;
        if (
            typeof conditionOrValue === "function" &&
            conditionOrValue._isCheckFunction
        ) {
            conditionFunc = conditionOrValue;
        } else {
            conditionFunc = () => conditionOrValue;
        }
        const trueBranchQueue = new VNCommandQueue(
            { player: this },
            ...commands
        );
        return {
            type: "if",
            conditionFunc: conditionFunc,
            trueBranchQueue: trueBranchQueue,
        };
    };

    #runtime_ELSE = (...commands) => {
        console.log("API: ELSE called");
        const elseBranchQueue = new VNCommandQueue(
            { player: this },
            ...commands
        );
        return { type: "else", commands: elseBranchQueue };
    };

    #runtime_CHECK = (expressionResult) => {
        console.log("API: CHECK called");
        const checkFunc = () => expressionResult;
        checkFunc._isCheckFunction = true;
        return checkFunc;
    };

    #runtime_$ = (func) => {
        console.log("API: $ called with typeof:", typeof func);

        if (typeof func !== "function" && typeof func !== "string") {
            console.error("$() expects a function or string!");
            return {
                type: "error",
                message: "$(...) expects a function or string!",
            };
        }

        if (typeof func === "string") {
            console.log("API: $() received a string. Creating function...");
            func = new Function(func).bind(this.#runtime);
        }

        return {
            type: "eval",
            execFunc: func,
        };
    };

    #runtime_ADD = {
        IMAGE: (uid, options = {}) => {
            console.log(`API: ADD.IMAGE called: ${uid}`);
            return {
                type: "add",
                objectType: "img",
                uid: uid,
                options: options,
            };
        },
        AUDIO: (uid, options = {}) => {
            console.log(`API: ADD.AUDIO called: ${uid}`);
            return {
                type: "add",
                objectType: "audio",
                uid: uid,
                options: options,
            };
        },
        ACTOR: (uid, options = {}) => {
            console.log(`API: ADD.ACTOR called: ${uid}`);
            return {
                type: "add",
                objectType: "vn-actor",
                uid: uid,
                options: options,
            };
        },
        STYLE: (uid, options = {}) => {
            console.log(`API: ADD.STYLE called: ${uid}`);
            return {
                type: "add",
                objectType: "style",
                uid: uid,
                options: options,
            };
        },
    };
    
    /**
     * @todo Add the ability to create event listeners. (low priority, only added here so i remember)
     */
    #runtime_EVENT = (eventName, ...commands) => {

    };

    /**
     * @todo Add an interface for interacting with the player element.
     */
    #runtime_PLAYER = {
        SCENE: {
            get SHOW() {

            },
        }
    };

    #runtime_START = { type: "start" };

    #runtime_CHOICE = (text, ...commands) => {
        console.log(`API: CHOICE called: "${text}"`);
        return { type: "choice", text: text, commands: commands };
    };

    #runtime_PICK = (...choices) => {
        console.log("API: \x1b[34mPICK called");
        // removed check for non-choice arguments so we can have text wherever we want
        return { type: "pick", choices: choices };
    };

    #runtime_text = (strings, ...values) => {
        console.log("API: TEXT called");
        const text = strings.reduce(
            (acc, str, i) => acc + str + (values[i] || ""),
            ""
        );
        return {
            type: "say",
            actorUid: "you",
            actorName: "You",
            text: text.trim(),
            isMonologue: false,
        };
    };

    #runtime_CREATE = {
        /**
         * @todo Create a reusable VNAnimation class
         * Create a new reusable animation. It's just a wrapper for the Web Animations API.
         * @param {Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions} keyframes Keyframes for the animation.
         * @param {EffectTiming} options Easing, duration, delay, etc.
         * @param {Function | undefined} [onFinish] Optional callback to run when the animation finishes.
         */
        ANIMATION: (keyframes, options, onFinish = null) => {
            return new VNAnimation(keyframes, options, onFinish);
        },
    };

    /**
     * @todo Animate a target element using the Web Animations API.
     * @param {Element | string} target The target element or element uid to animate.
     * @param {Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions} keyframes Keyframes for the animation.
     * @param {EffectTiming} options Easing, duration, delay, etc.
     * @param {Function | undefined} [onFinish] Optional callback to run when the animation finishes.
     */
    #runtime_ANIMATE = (target, keyframes, options, onFinish) => {
        console.log("API: ANIMATION called");
        const queue = this.#currentQueue;

        const animation = new VNCommandAnimate(
            queue,
            target,
            keyframes,
            options
        );

        return animation;
    };

    #runtime_ANIMATION = (keyframes, options, onFinish) => {
        return new VNAnimation(keyframes, options, onFinish);
    };

    #runtime_RUN = (script) => {
        console.log("API: RUN called");
    };

    #runtime_getInnerHTML = () => {
        const vnScene = this.getScene();
        if (vnScene) {
            return vnScene.innerHTML;
        } else {
            console.warn(
                "VNPlayerElement Runtime: No available <vn-scene> found. Cannot get innerHTML."
            );
            return null;
        }
    };

    #runtime_setInnerHTML = (value) => {
        const vnScene = this.getScene();
        if (vnScene) {
            vnScene.innerHTML = value;
        } else {
            console.warn(
                "VNPlayerElement Runtime: No available <vn-scene> found. Cannot set innerHTML."
            );
        }
    };

    
}

customElements.define("vn-player", VNPlayerElement);
