import VNCommandModule from "../VNCommand.js";
import VNCommandOption from "./VNCommandOption.js";
import { Log } from "../../utils/log.js";
import VNTextBox from "../../components/text-box.js"; 

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
            
            // Apply default attributes for a choice box
            if (!choiceBox.hasAttribute('centered')) choiceBox.setAttribute('centered', 'true');
            if (!choiceBox.hasAttribute('centeredY')) choiceBox.setAttribute('centeredY', 'true');
            if (!choiceBox.hasAttribute('width')) choiceBox.setAttribute('width', 'fit-content'); // fit-content is not a standard value for width, use e.g. 'auto' or specific like '50%'
            if (!choiceBox.hasAttribute('width')) choiceBox.style.setProperty('--width', 'auto'); // Use CSS var for auto to allow content to size it
            if (!choiceBox.hasAttribute('min-width')) choiceBox.setAttribute('min-width', '200px');
            if (!choiceBox.hasAttribute('max-width')) choiceBox.setAttribute('max-width', '70%');
            if (!choiceBox.hasAttribute('height')) choiceBox.setAttribute('height', 'auto'); // auto height for choices
            if (!choiceBox.hasAttribute('max-height')) choiceBox.setAttribute('max-height', '80%');
             Log.info(`[VNCommandChoose] Created a new temporary choice-box with defaults.`);
        }

        if (scene && !choiceBox.isConnected) { 
            scene.appendChild(choiceBox);
            await new Promise(resolve => requestAnimationFrame(resolve)); 
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
            if (choiceBox && choiceBox.isConnected) {
                choiceBox.remove();
                Log.info(`[VNCommandChoose] Removed choiceBox (UID: ${choiceBox.uid}).`);
            }
        }
    }
}