import VNCommand from "../VNCommand.js";

/**
 * Represents a series of changes to a VNObject's state.
 */
export default class VNCommandQuery extends VNCommand {
    type = "query";

    constructor(queue, target, query) {
        super(queue);
        this.uid = uid;
        this.query = query;
    }

    async execute() {
        let targetObject = null;

        return new Promise((resolve) => {
            
        });
    }
}