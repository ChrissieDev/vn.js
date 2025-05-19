/**
 * A hidden configuration element that exists inside a \<vn-object\>, 
 * grouping multiple \<vn-show\> elements together. It has a `trigger` attribute,
 * which is a string that can be used to toggle the visibility of the elements inside it,
 * either via a command or through character dialogue using the `[[ ... ]]` syntax.
 */
export default class VNAlias extends HTMLElement {

    /**
     * The outermost <vn-object> element that contains the alias.
     */
    hostObject = null;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none !important;
                }
            </style>
            <slot></slot>
        `;
    }

    static get observedAttributes() {
        return ["uid", "trigger"];
    }

    /**
     * The player that this alias belongs to.
     */
    player = null;

    connectedCallback() {
        const player = this.closest("vn-player");
        this.player = player;

        player.addEventListener("triggeralias", this.onTriggerAlias.bind(this));
    }
    
    /**
     * When an alias is triggered, this function is called, causing any of the host object's objects matching the \<vn-show\> element's uids to be shown.
     * @param {Event} event - The event that triggered this function.
     */
    onTriggerAlias(event) {

    }
}

customElements.define("vn-alias", VNAlias);