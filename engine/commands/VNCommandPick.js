import VNCommand from "../VNCommand.js";

export default class VNCommandPick extends VNCommand {
    constructor(queue, choices = []) {
        super(queue);
        if (!Array.isArray(choices) || choices.some(c => !(c instanceof VNCommandChoice))) {
            throw new Error("PICK requires an array of VNCommandChoice objects.");
        }
        this.choices = choices;
    }

    execute() {
        const scene = this.scene;
        if (!scene) {
            console.error("VNCommandPick doesn't have a scene available to execute the command.");
            return true; // Skip command if no scene is available
        }
        if (this.choices.length === 0) {
            console.warn("VNCommandPick has no choices available to pick from.");
            return true; // Skip command if no choices are available
        }
        // the thing to render choices in the text boxes / ui
        const choiceContainer = scene.createChoiceContainer();
        this.choices.forEach(choice => {
            const button = document.createElement("button");
            button.textContent = choice.text;
            button.addEventListener("click", () => {
                choiceContainer.remove();
                this.queue.player.setCurrentQueue(choice.commandsQueue);
                this.queue.player.continueExecution();
            });
            choiceContainer.appendChild(button);
        });

        try {
            scene.appendChild(choiceContainer);
        } catch (error) {
            console.error("Failed to append choice container to the scene:", error);
            return true; // Skip command if appending fails
        }

        // Pause the execution unt il a choice is made
        return false;
    }
}