/**
 * @file /components/visual-novel.js
 */

import VNCommandQueue from "../engine/VNCommandQueue.js";

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
                "<visual-novel> requires a <vn-project> child element to load assets and project data."
            );
        }

        if (!this.#sceneElement) {
            console.error(
                "<visual-novel> requires a <vn-scene> child element to display the game."
            );
        }

        if (!this.#scriptElement) {
            console.warn(
                '<visual-novel> does not have a <script type="text/vn-script"> child element. No game script will be loaded.'
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
     * Runs the script content from the <script> element or a provided string.
     * @param {string} [string] - Optional string to run as script content.
     * @returns {Promise<void>} - Resolves when the script is loaded and
     * @todo This method has multiple concerns. We should separate loading and execution.
     */
    async runScript(string) {
        if (!this.#scriptElement) {
            console.warn(
                "#loadAndRunScript called without a script element."
            );
        }

        let scriptContent = "";
        const scriptSrc = this.#scriptElement?.getAttribute?.("src");

        console.log("--- Attempting to load script ---");

        if (typeof string === "string") {
            console.log(
                "Script has no src attribute and no textContent. Using provided string."
            );
            scriptContent = string;
        } else if (typeof string === "string") {
            console.log(
                `Script has src attribute: "${scriptSrc}". Fetching...`
            );
            try {
                const response = await fetch(scriptSrc);
                if (!response.ok) {
                    throw new Error(
                        `HTTP error! status: ${response.status} for ${scriptSrc}`
                    );
                }
                scriptContent = await response.text();
                console.log(
                    `Fetched script content from ${scriptSrc}. Length: ${scriptContent.length}`
                );
            } catch (error) {
                console.error(
                    `Failed to fetch script from src "${scriptSrc}":`,
                    error
                );
                return;
            }
        } else if (this.#scriptElement?.textContent?.trim?.() !== undefined) {
            console.log("Script has no src attribute. Reading textContent...");
            scriptContent = this.#scriptElement.textContent;
            console.log("Read script content from textContent.");
        } else {
            console.warn("No script content found. Exiting.");
        }

        console.log("Final script content length:", scriptContent?.length);
        console.log("--- End of script content ---");

        if (!scriptContent || scriptContent.trim() === "") {
            console.warn(
                "Script content is empty or contains only whitespace."
            );
            return;
        }

        console.log("Preparing to execute script via new Function()...");

        const runtimeKeys = Object.keys(this.#runtime);
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

        try {
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
        } catch (error) {
            console.error(
                "Error executing VN script (caught in visual-novel):",
                error
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
            `--- Execution Loop Tick ${
                continueImmediately ? "Continuing" : "Paused/Ended"
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
                        `Proceed: Queue index advanced from ${commandIndex} to ${
                            this.#currentQueue.i
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

    /**
     * Builds the runtime context for scripts to execute in.
     * The main API is defined here.
     * 
     * @todo Refactor be more structured, perhaps define it in some private property #runtimeBase
     * so we can just copy it over to #runtime.
     */
    #prepareRuntimeContext() {
        console.log("Preparing runtime context...");

        if (!this.#runtime) {
            this.#runtime = { player: this, _lastPlayedQueue: null };
        } else {

            for (const key in Object.keys(this.#runtime)) {
                if (key !== "player" && key !== "_lastPlayedQueue") {
                    delete this.#runtime[key];
                }
            }
        }

        this.#actorFunctions.clear();

        // WTF? why are we storing the api in the player itself
        // we have to clean up google gemini's mess
        // this runtime_ prefix needs to go. let's just create a #runtimeBase object where the functions are defined.
        this.#runtime.player = this;
        this.#runtime.SCENE = this.#runtime_SCENE;
        this.#runtime.play = this.#runtime_play;
        this.#runtime.IF = this.#runtime_IF;
        this.#runtime.ELSE = this.#runtime_ELSE;
        this.#runtime.CHECK = this.#runtime_CHECK;
        this.#runtime.$ = this.#runtime_$;
        this.#runtime.ADD = this.#runtime_ADD;
        this.#runtime.START = this.#runtime_START;
        this.#runtime.CHOICE = this.#runtime_CHOICE;
        this.#runtime.PICK = this.#runtime_PICK;
        this.#runtime.TEXT = this.#runtime_TEXT;
        this.#runtime.RUN = this.#runtime_RUN;

        Object.defineProperty(this.#runtime, "innerHTML", {
            get: this.#runtime_getInnerHTML,
            set: this.#runtime_setInnerHTML,
            enumerable: true,
            configurable: true,
        });

        const assets = this.#projectElement?.getAssetsElement();

        if (assets) {
            this.#ensureDefaultActorAsset(assets, "you", "You");
        } else {
            console.error(
                "Cannot ensure default actors: <vn-assets> element not found!"
            );
        }

        if (assets) {
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
                    const actorFunction = this.#createActorFunction(uid, name);
                    
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
            };
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
    
    #createActorFunction(uid, displayName) {
        console.log(
            `Creating runtime function for actor: ${uid} (Display: ${displayName})`
        );

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

        return actorFunc;
    }

    #runtime_SCENE = (...commands) => {
        console.log("API: SCENE called");
        if (typeof VNCommandQueue === "undefined") {
            console.error("SCENE Error: VNCommandQueue class is undefined!");
            return null;
        }
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
    #runtime_play = (sceneQueue) => {
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
        if (typeof VNCommandQueue === "undefined") {
            console.error("API: play - CRITICAL: VNCommandQueue is undefined!");
            this.#runtime._lastPlayedQueue = null;
            return;
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
        return { type: "else", commandsQueue: elseBranchQueue };
    };
    #runtime_CHECK = (expressionResult) => {
        console.log("API: CHECK called");
        const checkFunc = () => expressionResult;
        checkFunc._isCheckFunction = true;
        return checkFunc;
    };
    #runtime_$ = (func) => {
        console.log("API: $ called");
        if (typeof func !== "function") {
            console.error("$() expects a function argument.");
            return { type: "error", message: "$() requires a function" };
        }

        return { 
            type: "exec",
            func: func,
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
    #runtime_START = { type: "start" };
    #runtime_CHOICE = (text, ...commands) => {
        console.log(`API: CHOICE called: "${text}"`);
        const choiceQueue = new VNCommandQueue({ player: this }, ...commands);
        return { type: "choice", text: text, queue: choiceQueue };
    };
    #runtime_PICK = (...choices) => {
        console.log("API: PICK called");
        const validChoices = choices.filter((c) => c && c.type === "choice");
        if (validChoices.length !== choices.length) {
            console.warn("PICK contained non-CHOICE arguments.");
        }
        return { type: "PICK", choices: validChoices };
    };
    #runtime_TEXT = (strings, ...values) => {
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
            isMonologue: true,
        };
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

    /** 
     * @todo Define all the `runtime_` prefixed methods in here instead without the prefix.
     * This is also good to check which names collide with the runtime API.
     */
    #runtimeBase = {

    }

    /**
     * The context in which scripts are run in. The entire API exists here at runtime.
     */
    #runtime = {
        player: this,
        _lastPlayedQueue: null,
    };
}

customElements.define("visual-novel", VNPlayerElement);

