import VNCommand from "../VNCommand.js";

export default class VNCommandAddObject extends VNCommand {
    type = 'add';
    objectType = ''; // 'img', 'audio', 'vn-actor' etc.
    uid = '';
    options = {};
 
    constructor(queue, objectType, uid, options = {}) {
        super(queue);
        this.objectType = objectType;
        this.uid = uid;
        this.options = options;
    }

    execute() {
        console.log(`Executing ADD ${this.objectType}: ${this.uid}`);
        const player = this.player;
        const scene = this.scene;

        if (!player || !scene) {
            console.error(`ADD ${this.objectType}: Cannot execute - missing player or scene reference.`);
            return true; // Skip command if context is missing
        }

        const definition = player.getAssetDefinition(this.uid);
        if (!definition) {
            console.error(`ADD ${this.objectType}: Asset definition not found for UID "${this.uid}".`);
            return true; // Skip if definition missing
        }

        // --- Check if an element with this UID already exists in the scene ---
        // Query direct children of the scene element only
        const existingElement = scene.querySelector(`:scope > [uid="${this.uid}"]`);
        if (existingElement) {
             console.warn(`ADD ${this.objectType}: Element with UID "${this.uid}" already exists in the scene. Replacing it.`);
             scene.removeElement(existingElement); // Use scene's method for safe removal
        }

        // console.log(`ADD ${this.objectType}: Cloning definition for ${this.uid}`);
        // Clone the definition node. Deep clone is generally safer.
        const instance = definition.cloneNode(true);

        // Ensure the instance has the UID attribute (might be stripped during cloning sometimes?)
        instance.setAttribute('uid', this.uid);

        // Apply command-specific options (e.g., style, attributes) onto the cloned instance
        if (this.options) {
            for (const [key, value] of Object.entries(this.options)) {
                if (key === 'style' && typeof value === 'string') {
                    // Append styles, respecting existing styles from definition/clone
                    instance.style.cssText += `; ${value}`;
                } else if (key === 'class' && typeof value === 'string') {
                    // Add classes from options
                    value.split(' ').forEach(cls => cls && instance.classList.add(cls));
                } else if (typeof value === 'boolean') {
                    // Toggle boolean attributes based on option value
                    instance.toggleAttribute(key, value);
                } else if (value !== null && value !== undefined) {
                    // Set other attributes
                    instance.setAttribute(key, value.toString());
                }
            }
        }

        // Add the configured instance to the scene using the scene's method
        // scene.addElement handles slotting and triggers observer for configuration/initialization
        // console.log(`ADD ${this.objectType}: Adding instance ${this.uid} to scene.`);
        scene.addElement(instance);

        // Actor/Textbox/etc initialization is now handled within the scene's
        // #processChildrenForUIDs method triggered by the MutationObserver
        // or the element's own connectedCallback/ensureInitialized.
        // No explicit call to forceInitialize or similar needed here.

        return true; // ADD commands should complete immediately
    }
}