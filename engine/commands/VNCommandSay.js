import VNTextBox from '../../components/text-box.js';
import VNObject from '../../components/vn-object.js';
import html from '../../utils/html.js';
import {Log, as} from '../../utils/log.js';
import { VNCommand } from '../VNCommand.js';

export default class VNCommandSay extends VNCommand {
    type = "say";
    uid = null;
    text = "";
    #speakerNameForDisplay = null;

    constructor(queue, uid, text, speakerNameForDisplay = null) {
        super(queue);
        this.uid = uid;
        this.text = text;
        this.#speakerNameForDisplay = speakerNameForDisplay;

        if (this.#speakerNameForDisplay === null && this.uid) {
            const speakerObject = this.player.getSceneObject(this.uid) || this.player.getObjectDefinition(this.uid);
            if (speakerObject) {
                this.#speakerNameForDisplay = speakerObject.getAttribute("name") || this.uid;
            } else {
                this.#speakerNameForDisplay = this.uid; 
            }
        }
    }

    async execute() {
        return new Promise(async (resolve) => {
            Log`[VNCommandSay] Executing 'say' command for UID: ${this.uid || 'narrator'}, Text: "${this.text.substring(0, 30)}..."`;

            const scene = this.player.scene;
            if (!scene) {
                Log.error(`[VNCommandSay] Scene not found. Cannot execute 'say' command.`);
                resolve(false); 
                return;
            }

            let textbox = null;
            const defaultTextboxUIDFromSceneAttr = scene.getAttribute("textbox");

            if (defaultTextboxUIDFromSceneAttr) {
                const definition = this.player.cloneObjectDefinition(defaultTextboxUIDFromSceneAttr);
                if (definition instanceof VNTextBox) {
                    textbox = definition;
                    textbox.setAttribute("cloned", ""); 
                    Log.info(`[VNCommandSay] Cloned textbox definition for dialogue: ${defaultTextboxUIDFromSceneAttr}`);
                } else {
                    Log.warn(`[VNCommandSay] Definition for dialogue textbox UID "${defaultTextboxUIDFromSceneAttr}" not found or not a text-box.`);
                }
            }

            if (!textbox) { 
                textbox = document.createElement("text-box");
                textbox.setAttribute("uid", `temp-say-box-${Date.now()}`);
                
                // Apply default attributes for a dialogue box if created dynamically
                if (!textbox.hasAttribute('width')) textbox.setAttribute('width', '90%');
                if (!textbox.hasAttribute('height')) textbox.setAttribute('height', 'auto'); // Usually auto for dialogue
                if (!textbox.hasAttribute('max-height')) textbox.setAttribute('max-height', '35%');
                if (!textbox.hasAttribute('bottom')) textbox.setAttribute('bottom', '5%');

                if (!this.uid) { // Narrator specific defaults
                    if (!textbox.hasAttribute('centered')) textbox.setAttribute('centered', 'true');
                     // If narrator and centered, left is set to 50% by the component due to [centered]
                } else { // Character specific defaults (if not centered by narrator rule)
                    if (!textbox.hasAttribute('left') && !textbox.hasAttribute('centered')) {
                        // Default to centered if no left attribute and not already centered
                         textbox.setAttribute('centered', 'true');
                    }
                }
                Log.info(`[VNCommandSay] Created a new temporary text-box for SAY with defaults.`);
            }
            
            if (!textbox.isConnected) {
                scene.appendChild(textbox);
                await new Promise(r => requestAnimationFrame(r));
            }


            const onProceed = () => {
                textbox.removeEventListener("proceed", onProceed);
                if (textbox && textbox.isConnected) {
                    textbox.remove(); 
                    Log.info(`[VNCommandSay] Removed SAY text-box (UID: ${textbox.uid}).`);
                }
                resolve(true);
            };
            textbox.addEventListener("proceed", onProceed);
            
            const speakerDisplayName = this.#speakerNameForDisplay !== null ? this.#speakerNameForDisplay : (this.uid || "");

            try {
                textbox.style.display = ''; 
                await textbox.display(this.text, speakerDisplayName);
            } catch (error) {
                 Log.error(`[VNCommandSay] Error during textbox.display():`, error);
                 textbox.removeEventListener("proceed", onProceed); 
                 if (textbox && textbox.isConnected) textbox.remove();
                 resolve(false); 
            }
        });
    }
}