import VNCommandModule from "../VNCommand.js";
import VNCommandOption from "./VNCommandOption.js";
import { Log } from "../../utils/log.js";
import VNTextBox from "../../components/text-box.js"; // For instanceof check

export default class VNCommandChoose extends VNCommandModule.VNCommand {
    type = "choose";
    promptText = null; 
    items = []; 

    constructor(queue, ...args) {
        super(queue);
        this.items = [];

        if (args.length === 0) {
            Log.warn(`[VNCommandChoose] CHOOSE command created with no arguments.`);
            return;
        }

        let optionsStarted = false;
        for (const arg of args) {
            if (arg instanceof VNCommandOption) {
                this.items.push({ type: 'option', data: arg });
                optionsStarted = true;
            } else if (typeof arg === 'string') {
                if (this.promptText === null && !optionsStarted && this.items.length === 0) {
                    this.promptText = arg;
                } else {
                    this.items.push({ type: 'content', html: arg });
                }
            } else {
                Log.error(`[VNCommandChoose] Invalid argument in CHOOSE command. Expected string or VNCommandOption, got:`, arg);
            }
        }

        if (this.items.filter(item => item.type === 'option').length === 0) {
            Log.warn(`[VNCommandChoose] CHOOSE command has no VNCommandOption items.`);
        }
    }

    async execute() {
        const optionsCount = this.items.filter(item => item.type === 'option').length;
        if (optionsCount === 0) {
            Log.warn(`[VNCommandChoose] No actual options to display. Skipping.`);
            return null; 
        }

        let choiceBox = null;
        const scene = this.player.scene;

        if (scene) {
            const choiceboxUidFromScene = scene.getAttribute("choicebox");
            if (choiceboxUidFromScene) {
                const definition = this.player.cloneObjectDefinition(choiceboxUidFromScene);
                if (definition instanceof VNTextBox) {
                    choiceBox = definition;
                    choiceBox.setAttribute("cloned", ""); 
                    Log.info(`[VNCommandChoose] Using choicebox definition from scene attribute: ${choiceboxUidFromScene}`);
                } else {
                    Log.warn(`[VNCommandChoose] Definition for choicebox UID "${choiceboxUidFromScene}" not found or not a text-box.`);
                }
            }
        }

        if (!choiceBox) {
            Log.info(`[VNCommandChoose] No choicebox definition found. Creating a temporary one.`);
            choiceBox = document.createElement('text-box');
            choiceBox.setAttribute('uid', 'temp-choice-box-' + Date.now());
            // Apply default styling for a newly created choice box
            choiceBox.setAttribute('centered', ''); 
            choiceBox.setAttribute('centeredY', ''); 
            choiceBox.style.setProperty('--width', 'fit-content');
            choiceBox.style.setProperty('--max-width', '70%'); 
            choiceBox.style.setProperty('--min-width', '200px'); // Ensure some min width
            choiceBox.style.setProperty('--height', 'fit-content');
            choiceBox.style.setProperty('--max-height', '80%');
            choiceBox.style.setProperty('--min-height', '100px'); // Ensure some min height
        }

        if (scene && !choiceBox.isConnected) { // Add to scene if not already (cloned or new)
            scene.appendChild(choiceBox);
            await new Promise(resolve => requestAnimationFrame(resolve)); // Wait for connection
        }

        try {
            choiceBox.style.display = ''; 
            const chosenQueue = await choiceBox.promptChoices(this.promptText, this.items);

            if (chosenQueue instanceof VNCommandModule.VNCommandQueue) {
                chosenQueue.parentQueue = this.queue;
                return chosenQueue;
            }
            return null;
        } catch (error) {
            Log.error(`[VNCommandChoose] Error during choice prompting:`, error);
            return null;
        } finally {
            // Always remove the choiceBox after it's used
            if (choiceBox && choiceBox.isConnected) {
                choiceBox.remove();
                Log.info(`[VNCommandChoose] Removed choiceBox.`);
            }
        }
    }
}