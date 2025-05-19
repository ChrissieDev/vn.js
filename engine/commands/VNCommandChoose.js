import VNCommand from "../VNCommand.js";

export default class VNCommandChoose extends VNCommand {
    type = "option";
    string = "[No Text]";

    constructor(queue, ...choices) {
        super(queue);
        this.choices = choices;
    }

    async execute() {
        // implement plz :D
        const choicesBox = something;
    }
}