import VNCommand from "../VNCommand.js";
import VNCommandChoice from "./VNCommandChoice.js";
import html from "../../utils/html.js";
import VNCommandQueue from "../VNCommandQueue.js";
import VNTextboxElement from "../../components/text-box.js";

export default class VNCommandPick extends VNCommand {
    type = 'pick';

    constructor(queue, items = []) {
        super(queue);
        if (!Array.isArray(items)) {
            throw new Error("PICK requires an array.");
        }
        this.items = items;
    }

    /**
     * Check if the object adheres to the VNCommandChoice JSON structure.
     */
    static validateObject(obj) {
        
        if (typeof obj !== "object") {
            return false;    
        }

        return true;
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

        /**
         * @type {VNTextboxElement}
         */
        const textBox = scene.getDefaultChoicebox();
        console.log("VNCommandPick: Cloned default choice box:", textBox);

        console.log(textBox);

        // return a promise that resolves to a VNCommandQueue for the player to nest into
        return new Promise((resolve) => {
            for (const choice of this.items) {
                let onClickWrapper = null;
                let element = null;
    
                if (choice instanceof VNCommandChoice) {
                    console.log(`\x1b[33mCHOICE: ${choice.text}\x1b[0m`);
                    element = html`
                        <button class="choice-button" slot="choices" data-command="${choice.command}">
                            ${choice.text}
                        </button>
                    `;
    
                    element.addEventListener("click", (e) => {
                        textBox.destroy();
                        resolve(choice.execute());
                    });
                } else if (typeof choice === "string") {
                    console.log(`\x1b[33mCHOICE: String passed as choice: "${choice}", converting to HTML element...\x1b[0m`, choice);
                    const domParser = new DOMParser();
                    const parsedHTML = domParser.parseFromString(choice, "text/html");
                    let parsedElement = parsedHTML.body.firstChild;
                    
                    console.log(parsedElement);

                    if (!(parsedElement instanceof Element)) {
                        // If the parsed element is not a text node, we need to create a span element to hold the text
                        parsedElement = document.createElement("span");
                        parsedElement.textContent = choice;
                    }
                    element = parsedElement;
                } else if (choice instanceof HTMLElement) {
                    element = choice;
                } else if (VNCommandPick.validateObject(choice)) {
                    const queue = choice.queue;
                    const commands = choice.commands;
                    const text = choice.text;
                    const newQueue = new VNCommandQueue({ player: this.player, parentQueue: queue }, ...commands);
                    const command = new VNCommandChoice(queue, text, newQueue);

                    console.log(`\x1b[33mCHOICE: Object passed as choice: "${text}", converting to VNCommandChoice...\x1b[0m`);
                    
                    element = html`
                        <button class="choice-button" slot="choices" data-command="${command.command}">
                            ${text}
                        </button>
                    `;
    
                    element.addEventListener("click", (e) => {
                        textBox.destroy();
                        resolve(command.execute());
                    });
                } else {
                    console.error("VNCommandPick: Invalid choice type. Expected VNCommandChoice, string, HTMLElement, or a valid API object:", choice); 
                    continue; // Skip invalid choice
                }
    
                element.classList.add("choice-item");
                element.setAttribute("slot", "choices");
                textBox.appendChild(element);
                textBox.classList.add("choice-container");
            };
    
            try {
                scene.appendChild(textBox);
            } catch (error) {
                console.error("Failed to append choice container to the scene:", error);
                return true; // Skip command if appending fails
            }
        });
        
    }
}