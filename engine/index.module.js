/**
 * @module engine
 * @summary The VNPlayerElement engine module. This module contains the VNCommand classes utilized by the <visual-novel> runtime.
 */
import VNAnimation from "./VNAnimation.js";
import VNCommand from "./VNCommand.js";
import VNCommandQueue from "./VNCommandQueue.js";
import VNCommandStart from "./commands/VNCommandStart.js";
import VNCommandFocusActor from "./commands/VNCommandFocusActor.js";
import VNCommandSay from "./commands/VNCommandSay.js";
import VNCommandSetActorState from "./commands/VNCommandSetActorState.js";
import VNCommandStyle from "./commands/VNCommandStyle.js";
import VNCommandAddObject from "./commands/VNCommandAddObject.js";
import { VNCommandIf, VNCommandElse } from "./commands/VNCommandIf.js";


export default {
    VNAnimation,
    VNCommand,
    VNCommandQueue,
    VNCommandStart,
    VNCommandFocusActor,
    VNCommandSay,
    VNCommandSetActorState,
    VNCommandAddObject,
    VNCommandIf,
    VNCommandElse,
    VNCommandStyle,
    
};