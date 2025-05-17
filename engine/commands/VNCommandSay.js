import VNTextBox from '../../components/text-box.js';
import VNObject from '../../components/vn-object.js';
import html from '../../utils/html.js';
import {Log, as} from '../../utils/log.js';
import { VNCommand } from '../VNCommand.js';

/**
 * Represents a command where an object says something via a textbox.
 */
export default class VNCommandSay extends VNCommand {
    type = "say";

    constructor(queue, uid, text) {
        super(queue);
        this.uid = uid;
        this.text = text;
    }

    async execute() {
        return new Promise((resolve) => {
            Log`[VNCommandSay] Executing 'say' command`;
            
            let speakerObject = this.queue.player.getSceneObject(this.uid);

            // object not found in scene,
            // does it have a definition?
            if (!speakerObject) {
                const project = this.queue.player.project;
                let object = project.cloneObjectDefinition(this.uid);
                
                if (object && object instanceof VNObject) {
                    speakerObject = object;
                }
            }
            
            let speaker = "";

            // okay, try again.
            if (!speakerObject) {
                Log.color("#ff6666")`[VNCommandSay] Object not found with uid: "${this.uid}"`;
            } else {
                speaker = speakerObject.getAttribute("name");
            }

            const scene = this.queue.player.scene;
            let textbox = null;
            const defaultTextboxUID = scene.getAttribute("textbox");
            
            if (defaultTextboxUID === null) {
                textbox = docuiment.createElement("text-box");
            } else {
                const definition = this.player.cloneObjectDefinition(defaultTextboxUID);
                if (definition) {
                    textbox = definition;
                } else {
                    textbox = document.createElement("text-box");
                }
            }

            textbox.addEventListener("proceed", (e) => {
                Log`[VNCommandSay] Proceeding with command: ${this.type}`;
                textbox.remove();
                resolve(true);
            });


            // tell the vn-player that the textbox is already cloned from its definition in the vn-project
            textbox.setAttribute("speaker", speaker);
            textbox.setAttribute("cloned", "");
            textbox.innerHTML = this.text; // Set the content for the textbox

            this.queue.player.scene.appendChild(textbox);
        });
    }
}