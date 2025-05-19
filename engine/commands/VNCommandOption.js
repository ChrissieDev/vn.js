import VNCommand from "../VNCommand.js";

export default class VNCommandOption extends VNCommand {
    type = "option";
    string = "[No Text]";

    constructor(queue, string = "[No Text]", innerQueue) {
        super(queue);
        this.string = string;
        this.innerQueue = innerQueue;
    }

    /**
     * Attempts to parse the string as HTML and if successful, returns a HTMLElement with the text as its outerHTML.
     * The execute method should attach a click event listener that resolves the execute promise. 
     */
    #tryParseAsHTML(string = this.string) {

    }

    async execute() {
        return new Promise((resolve) => {
            // ... implement this plz!
        });
    }
}