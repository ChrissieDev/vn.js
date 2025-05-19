import { VNCommand, VNCommandQueue } from "../VNCommand.js";

async function evaluateCondition(conditionFnOrValue) {
    if (typeof conditionFnOrValue === 'function') {
        const res = conditionFnOrValue();
        return (res instanceof Promise) ? await res : res;
    }
    return conditionFnOrValue;
}

function skipRemainingConditionalBranches(parentQueue) {
    while (parentQueue.i < parentQueue.commands.length) {
        const nextCommand = parentQueue.commands[parentQueue.i];
        if (nextCommand instanceof VNCommandElseIf || nextCommand instanceof VNCommandElse) {
            parentQueue.i++; 
        } else {
            break; 
        }
    }
}

export class VNCommandIf extends VNCommand {
    type = "if";
    condition;
    commands;

    constructor(queue, condition = true, ...commands) {
        super(queue);
        this.condition = condition;
        this.commands = commands;
    }

    async execute() {
        const conditionMet = await evaluateCondition(this.condition);
        
        if (conditionMet) {
            skipRemainingConditionalBranches(this.queue);
            return new VNCommandQueue(this.player, () => true, this.commands, this.queue);
        }
        // Condition is false, do nothing and let the parent queue proceed to the next command (ELIF/ELSE)
        return null;
    }
}

export class VNCommandElseIf extends VNCommand {
    type = "elif";
    condition;
    commands;

    constructor(queue, condition = true, ...commands) {
        super(queue);
        this.condition = condition;
        this.commands = commands;
    }

    async execute() {
        const conditionMet = await evaluateCondition(this.condition);

        if (conditionMet) {
            skipRemainingConditionalBranches(this.queue);
            return new VNCommandQueue(this.player, () => true, this.commands, this.queue);
        }
        // Condition is false, do nothing and let the parent queue proceed
        return null;
    }
}

export class VNCommandElse extends VNCommand {
    type = "else";
    commands;

    constructor(queue, ...commands) {
        super(queue);
        this.commands = commands;
    }

    async execute() {
        // ELSE always executes if reached, no condition to check.
        // No need to skip branches after ELSE, as it's the end of a conditional block.
        return new VNCommandQueue(this.player, () => true, this.commands, this.queue);
    }
}

export default {
    VNCommandIf,
    VNCommandElseIf,
    VNCommandElse,
}