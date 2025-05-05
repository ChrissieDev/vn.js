import VNCommand from "../VNCommand.js";
import VNCommandChoice from "./VNCommandChoice.js";
import html from "../../utils/html.js";

export default class VNCommandPick extends VNCommand {
    constructor(queue, items = []) {
        super(queue);
        if (!Array.isArray(items)) {
            throw new Error("PICK requires an array.");
        }
        this.items = items;
    }

    execute() {
        const scene = this.scene;
        
        if (!scene) {
            console.error("VNCommandPick doesn't have a scene available to execute the command.");
            return true; // Skip command if no scene is available
        }

        if (this.items.length === 0) {
            console.warn("VNCommandPick has no choices available to pick from.");
            return true; // Skip command if no choices are available
        }

        // the thing to render choices in the text boxes / ui
        const choiceContainer = html`
            <text-box
                uid="default"
            ></text-box>
        `;

        for (const choice of this.items) {
            let element = null;
            if (choice instanceof VNCommandChoice) {
                element = html`
                    <button class="choice-button" data-command="${choice.command}">
                        ${choice.text}
                    </button>
                `;
                element.addEventListener("click", () => {
                    this.queue.push(choice.execute.bind(choice));
                });
            } else if (typeof choice === "string") {
                element = html`<span class="choice-text">${choice}</span>`;
            } else if (choice instanceof HTMLElement) {
                element = choice;
            } else {
                console.warn("Invalid choice type:", choice);
                continue; // Skip invalid choices
            }

            element.classList.add("choice-item");
            choiceContainer.appendChild(element);
        };

        try {
            scene.appendChild(choiceContainer);
        } catch (error) {
            console.error("Failed to append choice container to the scene:", error);
            return true; // Skip command if appending fails
        }

        // Pause the execution until a choice is made
        return false;
    }
}