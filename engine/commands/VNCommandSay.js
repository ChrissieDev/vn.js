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
                // Default styling for a dialogue box (typically at bottom, centered horizontally)
                // The component's internal CSS defaults should handle most of this if attributes aren't set.
                // For narrator, we might want it centered by default.
                if (!this.uid) { // Narrator
                    textbox.setAttribute('centered', '');
                    // Potentially adjust vertical position for narrator if needed, e.g.
                    // textbox.style.setProperty('--bottom', 'auto');
                    // textbox.setAttribute('centeredY', '');
                } else {
                    // For characters, rely on default bottom positioning or specific definition.
                    // The component CSS has defaults like bottom: 5%, width: 90%, left: 50% (transformed)
                }
                Log.info(`[VNCommandSay] Created a new temporary text-box for SAY.`);
            }
            
            if (!textbox.isConnected) {
                scene.appendChild(textbox);
                await new Promise(r => requestAnimationFrame(r));
            }


            const onProceed = () => {
                textbox.removeEventListener("proceed", onProceed);
                Log`[VNCommandSay] Proceeding for UID: ${this.uid || 'narrator'}`;
                if (textbox && textbox.isConnected) {
                    textbox.remove(); // Always remove the textbox after SAY
                    Log.info(`[VNCommandSay] Removed SAY text-box.`);
                }
                resolve(true);
            };
            textbox.addEventListener("proceed", onProceed);
            
            const speakerDisplayName = this.#speakerNameForDisplay !== null ? this.#speakerNameForDisplay : (this.uid || "");

            try {
                textbox.style.display = ''; // Ensure it's visible
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