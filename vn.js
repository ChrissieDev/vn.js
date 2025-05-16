/**
 * Single file to load the vn.js ES module and inject a stylesheet
 * that hides the <vn-project> and its descendants in order to
 * prevent the user from experiencing a flash of unstyled content
 * before the <vn-player> can be registered to the DOM (es modules are always deferred).
 */

console.log(
    "%c--- vn.js ---",
    "color: lightgreen; font-size: 3rem; font-weight: 700; text-decoration: underline;"
);

(async () => {
    // anti-FOUC (automatically removed by the vn-player module using customElements.whenDefined)
    const exists = document.querySelectorAll("style.__vn-js_no-fouc");
    // only inject a style if hasn't already been injected
    if (exists.length === 0) {
        
        const style = document.createElement("style");
        style.classList.add("__vn-js_no-fouc");
        style.textContent = `
        vn-player,
        vn-project,
        vn-scene {
            display: none !important;
        }
    `;
        document.head.appendChild(style);
    }

    // dynamically inject a stylesheet to hide the vn-project and its descendants
    const loc = window.location.origin;
    let path = loc + "/vn.module.js";
    let file = await fetch(path);
    if (!file.ok) {
        console.error(
            "%cError: vn.js module not found. Trying one more place...",
            "color: red; font-size: 1.5rem; font-weight: 700;"
        );

        // for local testing, when using the nested `/test` folder strcture (remove this later to avoid confusion)
        path = loc + "../vn.module.js";
        const url = new URL(path);
        file = await fetch(url);
        if (!file.ok) {
            console.error(
                "%cError: vn.js module not found after a second attempt. Please make sure vn.module.js is in the same directory as this file. Exiting...",
                "color: red; font-size: 1.5rem; font-weight: 700;"
            );
            return;
        } 
    }

    const text = await file.text();
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = text;
    document.head.appendChild(script);
})();
