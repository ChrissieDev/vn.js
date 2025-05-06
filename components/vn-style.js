/**
 * A special <style> element that is used to inject CSS into the shadow DOM of a VN component.
 */
export default class VNStyleElement extends HTMLElement {
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

    connectedCallback() {
        let styleToAdd = null;
        
        if (!this.parentElement.shadowRoot) {
            console.error(
                "Parent element does not have a shadow root. Returning without applying styles..."
            );
            return;
        }

        if (this.hasAttribute("href") || this.hasAttribute("src")) {
            const src = this.getAttribute("href") || this.getAttribute("src");

            this.fetchStyle(src).then((style) => {
                if (style) {
                    style
                        .text()
                        .then((text) => {
                            const styleElement = document.createElement("style");
                            const css = text.trim();
                            if (css.length > 0) {
                                styleElement.textContent = css;
                                this.shadowRoot.appendChild(styleElement);
                            } else {
                                console.warn(
                                    `VNStyle: Style fetched from '${src}' is empty. Returning without applying styles...`
                                );
                            }
                        })
                        .catch((error) => {
                            throw new MediaError(
                                `Error reading style text content after fetching stylesheet from source: '${src}' :`,
                                error
                            );
                        });
                } else {
                    console.error(
                        `Failed to fetch style from source: '${src}'`
                    );
                }
            });
        } else {
            const text = this.textContent.trim();

            if (text.length > 0) {
                const styleElement = document.createElement("style");
                styleElement.classList.add("injected-style");
                styleElement.textContent = text;
                styleToAdd = styleElement;
            } else {
                console.warn(
                    "VNStyle: No href/src attribute or innerHTML provided. Returning without applying styles..."
                );
                return;
            }
        }

        if (styleToAdd === null) {
            console.error(
                "VNStyle: styleToAdd is null after attempting to fetch or parse styles. Returning without applying styles..."
            );

            return;
        }
 
        if (this.parentElement.shadowRoot) {
            if (styleToAdd.hasAttribute("data-vn-processed")) {
                styleToAdd.removeAttribute("data-vn-processed");
            }
            this.parentElement.shadowRoot.appendChild(styleToAdd);
        } else {
            console.error(
                "VNStyle: Parent element does not have a shadow root. Returning without applying styles..."
            );
        }
    }

    /**
     * Fetches a style from the given URL.
     * * @param {string} url - The URL of the style to fetch.
     * * @returns {Promise<Response>} A promise that resolves to the fetched style response.
     */
    async fetchStyle(url) {
        let result = null;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch style: ${response.statusText}`
                );
            }

            result = response;
        } catch (error) {
            console.error("Error fetching style:", error);
        }

        return result;
    }
}

customElements.define("vn-style", VNStyleElement);