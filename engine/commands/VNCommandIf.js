import VNCommand from "../VNCommand.js";
import VNCommandQueue from "../VNCommandQueue.js";

export class VNCommandIf extends VNCommand {
    type = 'if';
    conditionFunc = () => false;
    trueBranchQueue = null;
    falseBranchQueue = null;
 
    constructor(queue, conditionFunc, trueBranchQueue) {
        super(queue);
        if (typeof conditionFunc !== 'function') throw new Error("VNCommandIf requires a condition function.");
        if (!(trueBranchQueue instanceof VNCommandQueue)) throw new Error("VNCommandIf requires a VNCommandQueue for the true branch.");

        this.conditionFunc = conditionFunc;
        this.trueBranchQueue = trueBranchQueue;
        if (this.trueBranchQueue) this.trueBranchQueue.parentQueue = this.queue;
    }

    execute() {
        console.log("Executing IF command.");
        let branchToExecute = null;

        try {
            if (this.conditionFunc()) {
                alert("Condition is true, executing true branch.");
                branchToExecute = this.trueBranchQueue;
            } else {
                branchToExecute = this.falseBranchQueue;
            }
        } catch (error) {
             console.error("Error evaluating IF condition:", error);
             return true;
        }

        if (branchToExecute) {
            
             branchToExecute.scene = this.scene;
             if (branchToExecute instanceof VNCommandQueue) {
                 branchToExecute.parentQueue = this.queue;
             }

             this.player.setCurrentQueue(branchToExecute);

             return true;
        } else {
             return true;
        }
     }
}



export class VNCommandElse extends VNCommand {
    type = 'else';
    commands = null;

     constructor(queue, commands) {
         super(queue);
         if (!(commands instanceof VNCommandQueue)) throw new Error("VNCommandElse requires a VNCommandQueue.");
         this.commands = commands;
         if (this.commands) this.commands.parentQueue = this.queue;
     }

     /** Links this ELSE's command queue to the appropriate preceding IF or ELSE IF command. */
     attachToIf(ifCommand) {
         if (!(ifCommand instanceof VNCommandIf)) {
             console.error("VNCommandElse: attachToIf called with non-IF command.", ifCommand);
             return false;
         }

         let targetIf = ifCommand;
         while(targetIf.falseBranchQueue instanceof VNCommandIf) {
             targetIf = targetIf.falseBranchQueue;
         }

         if (targetIf.falseBranchQueue === null) {
             targetIf.falseBranchQueue = this.commands;
             return true;
         }
         else {
             console.error("VNCommandElse: Cannot attach, preceding IF/ELSE_IF already has an ELSE or ELSE IF branch.", targetIf);
             return false;
         }
     }

     /** ELSE commands are structural and should not be executed directly in the queue flow. */
     execute() {
         console.error("VNCommandElse should not be executed directly. It's handled by the preceding IF.");
         debugger;
         return true;
     }
}

export default {
    VNCommandIf,
    VNCommandElse,
};