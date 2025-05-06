/**
 * @module components
 * @fileoverview Exports all the components used in the <vn-player> web component.
 * Each file also registers the component to the browser's custom element registry.
 */
 

import VNProjectElement from "./vn-project.js";
import VNAssetsElement from "./vn-project.js";
import VNActorElement from "./vn-actor.js";
import VNBodyPartElement from "./vn-layer.js";
import VNSceneElement from "./vn-scene.js";
import VNTextBoxElement from "./text-box.js";
import VNScriptElement from "./vn-script.js";
import VNStyleElement from "./vn-style.js";
import VNPlayerElement from "./vn-player.js";

export default {
    VNPlayerElement,
    VNProjectElement,
    VNAssetsElement,
    VNActorElement,
    VNBodyPartElement,
    VNSceneElement,
    VNTextBoxElement,
    VNScriptElement,
    VNStyleElement
};
