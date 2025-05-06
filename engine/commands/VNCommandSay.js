import VNCommand from "../VNCommand.js";

export default class VNCommandSay extends VNCommand {
    type = "say";

    /**
     * The definition UID that references the actor's asset.
     * @todo support anonymous actors (`?"Random Student"`) to set speaker name without an existing definition.
     * @type {string | null}
     */
    actorUid = null;

    /**
     * The name of the actor to display in the textbox.
     * @type {string}
     */
    actorName = null;

    /**
     * The text to display in the textbox.
     * @type {string}
     */
    text = "";

    /**
     * Whether the text should cause the text-box to display a speaker.
     */
    isMonologue = false;

    /**
     * The textbox instance that is currently displaying the text.
     */
    #textboxInstance = null;

    constructor(queue, actorUid, actorName, text, isMonologue = false) {
        super(queue);
        this.actorUid = actorUid;
        this.actorName = actorName;
        this.text = text;
        this.isMonologue = isMonologue;
    }

    execute() {
        const scene = this.scene;
        if (!scene || !this.player) {
            console.error("SAY: Missing scene/player.");
            return true;
        }

        const textbox = scene.acquireTextbox();
        if (!textbox) {
            console.error("SAY: Scene failed to acquire a textbox.");
            return true;
        }
        this.#textboxInstance = textbox;

        while (textbox.firstChild) {
            textbox.removeChild(textbox.firstChild);
        }

        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement("div");

        tempDiv.innerHTML = this.text;

        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
        
        textbox.appendChild(fragment);

        textbox.title = this.isMonologue ? "" : this.actorName;

        this.#removeListeners();
        textbox.addEventListener("proceed", this.#handleProceed, {
            once: true,
        });
        textbox.addEventListener("destroy", this.#handleDestroy, {
            once: true,
        });

        textbox.redisplay?.();

        this.#setActiveSpeaker(true);

        return false;
    }

    resume() {
        this.#removeListeners();
        this.#setActiveSpeaker(false);

        if (this.#textboxInstance) {
            this.#textboxInstance.destroy();
        }
        this.#textboxInstance = null;
    }

    #handleProceed = (event) => {};

    #handleDestroy = (event) => {
        this.#removeListeners();
        this.#setActiveSpeaker(false);
        if (event.target === this.#textboxInstance) {
            this.#textboxInstance = null;
        }
    };

    #removeListeners = () => {
        if (this.#textboxInstance) {
            this.#textboxInstance.removeEventListener(
                "proceed",
                this.#handleProceed
            );
            this.#textboxInstance.removeEventListener(
                "destroy",
                this.#handleDestroy
            );
        }
    };

    #setActiveSpeaker(isActive) {
        try {
            if (this.actorUid !== "you") {
                const actorElement = this.scene.querySelector(
                    `vn-actor[uid="${this.actorUid}"]`
                );
                actorElement?.classList.toggle("speaking", isActive);
            }
        } catch (e) {
            console.warn("Error toggling speaker highlight:", e);
        }
    }
}
