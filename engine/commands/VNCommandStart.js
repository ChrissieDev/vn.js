import VNCommand from "../VNCommand.js";

export default class VNCommandStart extends VNCommand {
    type = 'start';
    constructor(queue) { super(queue); }
    execute() { console.log("Executing START command (procedural)."); return true; }
}