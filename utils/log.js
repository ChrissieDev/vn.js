const ANSI_STYLES = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",
    inverse: "\x1b[7m",
    hidden: "\x1b[8m",
    strikethrough: "\x1b[9m",

    // Standard foreground colors
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",

    // Added bright foreground colors
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m",

    // Standard background colors
    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m",
    bgGray: "\x1b[100m",

    // Added bright background colors
    bgBrightRed: "\x1b[101m",
    bgBrightGreen: "\x1b[102m",
    bgBrightYellow: "\x1b[103m",
    bgBrightBlue: "\x1b[104m",
    bgBrightMagenta: "\x1b[105m",
    bgBrightCyan: "\x1b[106m",
    bgBrightWhite: "\x1b[107m",
};

const IS_NODE =
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;
const IS_BROWSER =
    typeof window !== "undefined" && typeof window.document !== "undefined";

const CSS_COLOR_NAMES_TO_RGB = {
    black: [0, 0, 0],
    silver: [192, 192, 192],
    gray: [128, 128, 128],
    white: [255, 255, 255],
    maroon: [128, 0, 0],
    red: [255, 0, 0],
    purple: [128, 0, 128],
    fuchsia: [255, 0, 255],
    green: [0, 128, 0],
    lime: [0, 255, 0],
    olive: [128, 128, 0],
    yellow: [255, 255, 0],
    navy: [0, 0, 128],
    blue: [0, 0, 255],
    teal: [0, 128, 128],
    aqua: [0, 255, 255],
    darkgoldenrod: [184, 134, 11],
    gold: [255, 215, 0],
    coral: [255, 127, 80],
    tomato: [255, 99, 71],
    cornflowerblue: [100, 149, 237],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    violet: [238, 130, 238],
    darkorange: [255, 140, 0],
    lightgray: [211, 211, 211],
};

function _parseCssColorToRgb(colorStr) {
    if (typeof colorStr !== "string") return null;
    const lowerColorStr = colorStr.toLowerCase().trim();

    if (CSS_COLOR_NAMES_TO_RGB[lowerColorStr]) {
        return CSS_COLOR_NAMES_TO_RGB[lowerColorStr];
    }

    if (lowerColorStr.startsWith("#")) {
        let hex = lowerColorStr.slice(1);
        if (hex.length === 3) {
            hex = hex
                .split("")
                .map((char) => char + char)
                .join("");
        }
        if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
        }
        return null;
    }

    if (lowerColorStr.startsWith("rgb(") && lowerColorStr.endsWith(")")) {
        const parts = lowerColorStr
            .substring(4, lowerColorStr.length - 1)
            .split(",");
        if (parts.length === 3) {
            const r = parseInt(parts[0].trim(), 10);
            const g = parseInt(parts[1].trim(), 10);
            const b = parseInt(parts[2].trim(), 10);
            if (
                !isNaN(r) &&
                !isNaN(g) &&
                !isNaN(b) &&
                r >= 0 &&
                r <= 255 &&
                g >= 0 &&
                g <= 255 &&
                b >= 0 &&
                b <= 255
            ) {
                return [r, g, b];
            }
        }
        return null;
    }
    return null;
}

const ANSI_PALETTE_RGB = {
    black: [0, 0, 0],
    red: [205, 0, 0],
    green: [0, 205, 0],
    yellow: [205, 205, 0],
    blue: [0, 0, 238],
    magenta: [205, 0, 205],
    cyan: [0, 205, 205],
    white: [229, 229, 229],
    gray: [127, 127, 127],
    brightRed: [255, 0, 0],
    brightGreen: [0, 255, 0],
    brightYellow: [255, 255, 0],
    brightBlue: [92, 92, 255],
    brightMagenta: [255, 0, 255],
    brightCyan: [0, 255, 255],
    brightWhite: [255, 255, 255],
    bgBlack: [0, 0, 0],
    bgRed: [205, 0, 0],
    bgGreen: [0, 205, 0],
    bgYellow: [205, 205, 0],
    bgBlue: [0, 0, 238],
    bgMagenta: [205, 0, 205],
    bgCyan: [0, 205, 205],
    bgWhite: [229, 229, 229],
    bgGray: [127, 127, 127],
    bgBrightRed: [255, 0, 0],
    bgBrightGreen: [0, 255, 0],
    bgBrightYellow: [255, 255, 0],
    bgBrightBlue: [92, 92, 255],
    bgBrightMagenta: [255, 0, 255],
    bgBrightCyan: [0, 255, 255],
    bgBrightWhite: [255, 255, 255],
};

function ansiToCss(stylesArray) {
    let css = "";
    const ansiToCssMap = {
        [ANSI_STYLES.bold]: "font-weight: bold;",
        [ANSI_STYLES.dim]: "opacity: 0.7;",
        [ANSI_STYLES.italic]: "font-style: italic;",
        [ANSI_STYLES.underline]: "text-decoration: underline;",
        [ANSI_STYLES.hidden]: "visibility: hidden;",
        [ANSI_STYLES.strikethrough]: "text-decoration: line-through;",
        [ANSI_STYLES.black]: "color: #000000;",
        [ANSI_STYLES.red]: "color: #CD0000;",
        [ANSI_STYLES.green]: "color: #00CD00;",
        [ANSI_STYLES.yellow]: "color: #CDCD00;",
        [ANSI_STYLES.blue]: "color: #0000EE;",
        [ANSI_STYLES.magenta]: "color: #CD00CD;",
        [ANSI_STYLES.cyan]: "color: #00CDCD;",
        [ANSI_STYLES.white]: "color: #E5E5E5;",
        [ANSI_STYLES.gray]: "color: #7F7F7F;",
        [ANSI_STYLES.brightRed]: "color: #FF0000;",
        [ANSI_STYLES.brightGreen]: "color: #00FF00;",
        [ANSI_STYLES.brightYellow]: "color: #FFFF00;",
        [ANSI_STYLES.brightBlue]: "color: #5C5CFF;",
        [ANSI_STYLES.brightMagenta]: "color: #FF00FF;",
        [ANSI_STYLES.brightCyan]: "color: #00FFFF;",
        [ANSI_STYLES.brightWhite]: "color: #FFFFFF;",
        [ANSI_STYLES.bgBlack]: "background-color: #000000;",
        [ANSI_STYLES.bgRed]: "background-color: #CD0000;",
        [ANSI_STYLES.bgGreen]: "background-color: #00CD00;",
        [ANSI_STYLES.bgYellow]: "background-color: #CDCD00;",
        [ANSI_STYLES.bgBlue]: "background-color: #0000EE;",
        [ANSI_STYLES.bgMagenta]: "background-color: #CD00CD;",
        [ANSI_STYLES.bgCyan]: "background-color: #00CDCD;",
        [ANSI_STYLES.bgWhite]: "background-color: #E5E5E5; color: #000000;",
        [ANSI_STYLES.bgGray]: "background-color: #7F7F7F;",
        [ANSI_STYLES.bgBrightRed]: "background-color: #FF0000;",
        [ANSI_STYLES.bgBrightGreen]: "background-color: #00FF00;",
        [ANSI_STYLES.bgBrightYellow]: "background-color: #FFFF00;",
        [ANSI_STYLES.bgBrightBlue]: "background-color: #5C5CFF;",
        [ANSI_STYLES.bgBrightMagenta]: "background-color: #FF00FF;",
        [ANSI_STYLES.bgBrightCyan]: "background-color: #00FFFF;",
        [ANSI_STYLES.bgBrightWhite]:
            "background-color: #FFFFFF; color: #000000;",
    };

    const filteredStyles = stylesArray.filter(
        (code) => code !== ANSI_STYLES.reset
    );

    for (const styleOrAnsiCode of filteredStyles) {
        if (ansiToCssMap[styleOrAnsiCode]) {
            css += ansiToCssMap[styleOrAnsiCode];
        } else if (
            typeof styleOrAnsiCode === "string" &&
            (styleOrAnsiCode.includes(":") || styleOrAnsiCode.includes(";"))
        ) {
            css += styleOrAnsiCode;
            if (!styleOrAnsiCode.endsWith(";")) {
                css += ";";
            }
        }
    }
    return css;
}

export class LogLabel {
    constructor(name) {
        this.name = name;
    }
}
export class Logger {
    #currentStyles = [];
    #persistentStyles = [];
    #isConfiguringDefaultStyles = false;

    #listeners = {
        onLog: [],
    };

    config = {
        labels: {
            ignore: {
                verbose: true,
            },
        },
    };

    constructor() {
        this.#listeners.onLog.push(({ rawMessage, appliedStyles, consoleMethod }) => {
            const effectiveConsoleMethod = (typeof consoleMethod === 'function') ? consoleMethod : console.log;

            if (IS_BROWSER && appliedStyles.length > 0) {
                const cssStyle = ansiToCss(appliedStyles);
                if (cssStyle !== "") {
                    const formatStringParts = [];
                    const consoleArgs = [""];
                    for (const item of rawMessage) {
                        if (typeof item === "string") {
                            formatStringParts.push("%c" + item);
                            consoleArgs.push(cssStyle);
                        } else {
                            formatStringParts.push("%O");
                            consoleArgs.push(item);
                        }
                    }
                    consoleArgs[0] = formatStringParts.join("");
                    if (consoleArgs[0]) effectiveConsoleMethod(...consoleArgs);
                    return;
                }
            }

            const logArgs = [];
            const useAnsiStyling = IS_NODE && appliedStyles.length > 0;
            const stylePrefix = useAnsiStyling ? appliedStyles.join("") : "";
            const styleSuffix = useAnsiStyling ? ANSI_STYLES.reset : "";
            const hasEffectiveStyles =
                useAnsiStyling ||
                (IS_BROWSER &&
                    appliedStyles.some(
                        (s) => typeof s === "string" && s.includes(":")
                    ));

            let prevPushedArgWasObject = false;
            for (let i = 0; i < rawMessage.length; i++) {
                const currentRawItem = rawMessage[i];
                const nextRawItemIsObject =
                    i + 1 < rawMessage.length &&
                    typeof rawMessage[i + 1] !== "string";

                if (typeof currentRawItem === "string") {
                    if (
                        hasEffectiveStyles &&
                        currentRawItem.trim() === "" &&
                        (prevPushedArgWasObject || nextRawItemIsObject)
                    ) {
                        logArgs.push(currentRawItem);
                    } else {
                        if (useAnsiStyling) {
                            logArgs.push(
                                stylePrefix + currentRawItem + styleSuffix
                            );
                        } else {
                            logArgs.push(currentRawItem);
                        }
                    }
                    prevPushedArgWasObject = false;
                } else {
                    logArgs.push(currentRawItem);
                    prevPushedArgWasObject = true;
                }
            }

            if (logArgs.length > 0) {
                effectiveConsoleMethod(...logArgs);
            }
        });
    }

    setDefaultStyles(configurator) {
        if (typeof configurator !== "function") {
            console.warn(
                "Logger.setDefaultStyles: configurator must be a function."
            );
            return this;
        }
        if (this.#isConfiguringDefaultStyles) {
            console.warn(
                "Logger.setDefaultStyles: Re-entrant call detected. Inner configuration will proceed, potentially overwriting outer."
            );
        }

        const oldIsConfiguring = this.#isConfiguringDefaultStyles;
        this.#isConfiguringDefaultStyles = true;

        const backupPersistentStyles = [...this.#persistentStyles];
        this.#persistentStyles = [];

        try {
            configurator(this);
        } catch (e) {
            this.#persistentStyles = backupPersistentStyles;
            this.#isConfiguringDefaultStyles = oldIsConfiguring;
            console.error("Error during setDefaultStyles configuration:", e);
            throw e;
        }

        this.#isConfiguringDefaultStyles = oldIsConfiguring;
        return this;
    }

    clearDefaultStyles() {
        this.#persistentStyles = [];
        return this;
    }

    _cssToAnsi(cssColor, isBackground = false) {
        const targetRgb = _parseCssColorToRgb(cssColor);
        if (!targetRgb) {
            return "";
        }

        let closestAnsiName = null;
        let minDistance = Infinity;

        for (const ansiName in ANSI_PALETTE_RGB) {
            const isAnsiBg = ansiName.startsWith("bg");
            if (isBackground !== isAnsiBg) continue;

            const ansiRgb = ANSI_PALETTE_RGB[ansiName];
            const dist = Math.sqrt(
                Math.pow(targetRgb[0] - ansiRgb[0], 2) +
                    Math.pow(targetRgb[1] - ansiRgb[1], 2) +
                    Math.pow(targetRgb[2] - ansiRgb[2], 2)
            );

            if (dist < minDistance) {
                minDistance = dist;
                closestAnsiName = ansiName;
            }
        }
        return closestAnsiName ? ANSI_STYLES[closestAnsiName] : "";
    }

    _processAndDispatch(consoleMethod, strings, values) {
        const messageParts = [];
        for (let i = 0; i < strings.length; i++) {
            messageParts.push(strings[i]);
            if (i < values.length) {
                messageParts.push(values[i]);
            }
        }

        const callLabels = {};
        let hasIgnoredLabel = false;
        const rawMessageForOutput = [];

        for (const part of messageParts) {
            if (part instanceof LogLabel) {
                const labelNames = Array.isArray(part.name)
                    ? part.name
                    : [part.name];
                for (const lname of labelNames) {
                    callLabels[lname.toLowerCase()] = true;
                    if (
                        this.config.labels.ignore[lname.toLowerCase()] === true
                    ) {
                        hasIgnoredLabel = true;
                    }
                }
            } else {
                rawMessageForOutput.push(part);
            }
        }

        if (hasIgnoredLabel) {
            this.#currentStyles = [];
            return; // Public method handles returning bound function
        }

        let textualMessage = "";
        for (const part of rawMessageForOutput) {
            if (typeof part === "string") {
                textualMessage += part;
            } else if (part === null || part === undefined) {
                textualMessage += String(part);
            } else if (typeof part === "object" || typeof part === "function") {
                try {
                    textualMessage +=
                        typeof part.toString === "function" &&
                        part.toString !== Object.prototype.toString
                            ? part.toString()
                            : JSON.stringify(part);
                } catch (e) {
                    textualMessage +=
                        typeof part.toString === "function"
                            ? part.toString()
                            : Object.prototype.toString.call(part);
                }
            } else {
                textualMessage += String(part);
            }
        }

        const combinedStyles = [
            ...this.#persistentStyles,
            ...this.#currentStyles,
        ];

        const eventData = {
            target: this,
            message: textualMessage, // Plain textual concatenation
            rawMessage: rawMessageForOutput,
            timestamp: Date.now(),
            labels: callLabels,
            appliedStyles: combinedStyles,
            consoleMethod: consoleMethod,
        };

        for (const callback of this.#listeners.onLog) {
            try {
                callback(eventData);
            } catch (e) {
                console.error("Error in Logger onLog callback:", e);
            }
        }

        this.#currentStyles = [];
    }

    log(strings, ...values) {
        this._processAndDispatch(console.log, strings, values);
        return this.log.bind(this);
    }

    configure({
        ignore = [],
        show = [],
        onLog,
        clearDefaultListener = false,
        clearAllListeners = false,
    } = {}) {
        if (clearAllListeners) {
            this.#listeners.onLog = [];
        } else if (clearDefaultListener && this.#listeners.onLog.length > 0) {
            this.#listeners.onLog.shift();
        }

        if (onLog) {
            if (typeof onLog === "function") {
                this.#listeners.onLog.push(onLog);
            } else {
                console.warn(
                    "Logger.configure: onLog parameter must be a function."
                );
            }
        }

        for (const labelName of ignore) {
            if (typeof labelName === "string") {
                this.config.labels.ignore[labelName.toLowerCase()] = true;
            }
        }
        for (const labelName of show) {
            if (typeof labelName === "string") {
                delete this.config.labels.ignore[labelName.toLowerCase()];
            }
        }
        return this;
    }

    #addStyle(styleCode) {
        if (styleCode) {
            if (this.#isConfiguringDefaultStyles) {
                this.#persistentStyles.push(styleCode);
            } else {
                this.#currentStyles.push(styleCode);
            }
        }
        return this;
    }

    color(colorValue) {
        const lowerColorValue = String(colorValue).toLowerCase();
        if (ANSI_STYLES[lowerColorValue]) {
            return this.#addStyle(ANSI_STYLES[lowerColorValue]);
        } else {
            if (IS_NODE) {
                const ansiColor = this._cssToAnsi(colorValue, false);
                return this.#addStyle(ansiColor);
            } else if (IS_BROWSER) {
                return this.#addStyle(`color: ${colorValue};`);
            }
            return this;
        }
    }
    col = this.color;

    bg(colorValue) {
        const colorNameStr = String(colorValue);
        let styleKeyNamePart;
        const lowerColorNameStr = colorNameStr.toLowerCase();

        if (
            lowerColorNameStr.startsWith("bright") &&
            colorNameStr.length > "bright".length
        ) {
            const colorPart = colorNameStr.slice("bright".length);
            styleKeyNamePart =
                "Bright" +
                colorPart.charAt(0).toUpperCase() +
                colorPart.slice(1).toLowerCase();
        } else if (
            !lowerColorNameStr.startsWith("bright") &&
            colorNameStr.length > 0
        ) {
            styleKeyNamePart =
                colorNameStr.charAt(0).toUpperCase() +
                colorNameStr.slice(1).toLowerCase();
        }

        if (styleKeyNamePart) {
            const ansiKey = `bg${styleKeyNamePart}`;
            if (ANSI_STYLES[ansiKey]) {
                return this.#addStyle(ANSI_STYLES[ansiKey]);
            }
        }

        if (IS_NODE) {
            const ansiBgColor = this._cssToAnsi(colorValue, true);
            return this.#addStyle(ansiBgColor);
        } else if (IS_BROWSER) {
            return this.#addStyle(`background-color: ${colorValue};`);
        }
        return this;
    }

    bold() {
        return this.#addStyle(ANSI_STYLES.bold);
    }
    italic() {
        return this.#addStyle(ANSI_STYLES.italic);
    }
    underline() {
        return this.#addStyle(ANSI_STYLES.underline);
    }
    dim() {
        return this.#addStyle(ANSI_STYLES.dim);
    }
    inverse() {
        return this.#addStyle(ANSI_STYLES.inverse);
    }
    hidden() {
        return this.#addStyle(ANSI_STYLES.hidden);
    }
    strikethrough() {
        return this.#addStyle(ANSI_STYLES.strikethrough);
    }
}

const LOG_LEVEL_METHODS = {
    info: typeof console !== 'undefined' ? console.info : null,
    warn: typeof console !== 'undefined' ? console.warn : null,
    error: typeof console !== 'undefined' ? console.error : null,
    debug: typeof console !== 'undefined' ? console.debug : null,
    trace: typeof console !== 'undefined' ? console.trace : null,
};

for (const levelName in LOG_LEVEL_METHODS) {
    const consoleMethod = LOG_LEVEL_METHODS[levelName];
    Logger.prototype[levelName] = function(strings, ...values) {
        this._processAndDispatch(consoleMethod, strings, values);
        return this[levelName].bind(this);
    };
}


// --- Start: Add direct color/bg methods to Logger.prototype ---
const directColorMethods = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "gray",
    "brightRed",
    "brightGreen",
    "brightYellow",
    "brightBlue",
    "brightMagenta",
    "brightCyan",
    "brightWhite",
];

for (const colorName of directColorMethods) {
    if (ANSI_STYLES[colorName]) {
        Logger.prototype[colorName] = function () {
            this.color(colorName); 
            return this; 
        };

        let bgMethodColorNamePart =
            colorName.charAt(0).toUpperCase() + colorName.slice(1);
        if (
            colorName.startsWith("bright") &&
            colorName.length > "bright".length
        ) {
            const afterBright = colorName.slice("bright".length);
            bgMethodColorNamePart =
                "Bright" +
                afterBright.charAt(0).toUpperCase() +
                afterBright.slice(1);
        }

        const bgMethodNameOnLogger = `bg${bgMethodColorNamePart}`;

        if (ANSI_STYLES[`bg${bgMethodColorNamePart}`]) {
            Logger.prototype[bgMethodNameOnLogger] = function () {
                this.bg(colorName); 
                return this; 
            };
        }
    }
}
// --- End: Add direct color/bg methods to Logger.prototype ---

const globalLogger = new Logger();

export function Log(strings, ...values) {
    return globalLogger.log(strings, ...values);
}

// Add new log level methods to Log object
for (const levelName in LOG_LEVEL_METHODS) {
    Log[levelName] = (strings, ...values) => {
        return globalLogger[levelName](strings, ...values);
    };
}

export function as(...names) {
    if (names.length === 0 || names.some((n) => typeof n !== "string")) {
        console.warn(
            "`as` function requires one or more string arguments for label names."
        );
        return new LogLabel("unknown_label");
    }
    return new LogLabel(names.length === 1 ? names[0] : names);
}

const chainableMethodsOnLog = [
    "color",
    "col",
    "bg",
    "bold",
    "italic",
    "underline",
    "dim",
    "inverse",
    "hidden",
    "strikethrough",
    "configure",
    "setDefaultStyles",
    "clearDefaultStyles",
];

// Add direct color methods to the global Log object (proxying to globalLogger but returning Log)
for (const colorName of directColorMethods) {
    if (ANSI_STYLES[colorName]) {
        Log[colorName] = () => {
            globalLogger[colorName](); 
            return Log; 
        };

        let bgMethodColorNamePart =
            colorName.charAt(0).toUpperCase() + colorName.slice(1);
        if (
            colorName.startsWith("bright") &&
            colorName.length > "bright".length
        ) {
            const afterBright = colorName.slice("bright".length);
            bgMethodColorNamePart =
                "Bright" +
                afterBright.charAt(0).toUpperCase() +
                afterBright.slice(1);
        }

        const bgMethodNameOnLog = `bg${bgMethodColorNamePart}`;

        if (ANSI_STYLES[`bg${bgMethodColorNamePart}`]) {
            Log[bgMethodNameOnLog] = () => {
                globalLogger[bgMethodNameOnLog](); 
                return Log; 
            };
        }
    }
}

// Add other chainable methods to Log object
for (const methodName of chainableMethodsOnLog) {
    if (typeof globalLogger[methodName] === "function" && !Log[methodName]) {
        Log[methodName] = (...args) => {
            globalLogger[methodName](...args);
            return Log; 
        };
    }
}

function test() {
    // --- Test Cases ---
    let foo = "foo";
    let bar = { bar: "bar" };
    let baz = ["baz", "qux", "quux"];

    console.log("--- Basic Log ---");
    Log`Hello world! ${foo} ${bar} ${baz}`;

    console.log("--- New Log Level Methods ---");
    Log.info`This is an info message. ${Date.now()}`;
    Log.warn`This is a warning message. ${"Warning!"}`;
    Log.error`This is an error message. ${new Error("Test Error")}`;
    Log.debug`This is a debug message. ${{a:1, b:2}}`;
    Log.trace`This is a trace message (check console for stack).`;

    console.log("--- Styled Log Level Methods ---");
    Log.green.info`This is a green info message.`;
    Log.yellow.warn`This is a yellow warning message.`;
    Log.red.bold.error`This is a red bold error message.`;
    Log.blue.underline.debug`This is a blue underlined debug message.`;
    Log.cyan.italic.trace`This is a cyan italic trace message.`;
    Log.bgBrightWhite().black.error`Error with bright white BG and black text.`;

    console.log("--- Chained Template Literals with Log Levels ---");
    Log.info`Info line 1.` `Info line 2 (separate log).`;
    Log.red.warn`Warning line 1 (red).` `Warning line 2 (also red, separate log).`;


    console.log("--- Styled Logs (ANSI names) ---");
    Log.color("red")`Red text (ANSI). ${foo}`;
    Log.red`Also red text (ANSI direct method). ${foo}`;
    Log.color("green")
        .bold()
        .underline()`Green, bold, underline (ANSI). ${bar}`;
    Log.bg("yellow").color(
        "black"
    )`Yellow BG, Black text (ANSI). ${Date.now()}`;
    Log.bgYellow().black()`Also Yellow BG, Black text (ANSI direct methods). ${Date.now()}`;
    Log.color("brightBlue")`Bright Blue text (ANSI). ${"test"}`;
    Log.brightBlue`Also Bright Blue text (ANSI direct method). ${"test"}`;
    Log.bg("brightWhite").color(
        "black"
    )`Bright White BG, Black text (ANSI). ${"test"}`;
    Log.bgBrightWhite()
        .black`Also Bright White BG, Black text (ANSI direct methods). ${"test"}`;

    console.log("--- Styled Logs (CSS colors) ---");
    Log.color("#FF6347")`Tomato text (CSS). ${baz}`;
    Log.color(
        "rgb(100, 149, 237)"
    ).italic()`Cornflower blue italic (CSS). ${foo}`;
    Log.bg("coral").color("white")`Coral BG, White text (CSS). ${bar}`;

    console.log("--- Mixed Styling (CSS color, ANSI style) ---");
    Log.color(
        "lime"
    ).bold()`Bright green bold (CSS color 'lime', ANSI bold). ${Date.now()}`;
    Log.bg("#333")
        .color("#EEE")
        .underline()`Dark gray BG, Light gray text, Underline (CSS colors, ANSI style).`;

    console.log("--- Persistent Styles ---");
    Log.setDefaultStyles((lg) =>
        lg.color("blue").italic()
    )`Setting default blue italic. This log itself is NOT affected by this call.`;
    Log`This log should be blue and italic.`;
    Log.info`This info log should be blue and italic.`;
    Log.bold()`This log should be blue, italic, and bold.`;
    Log.bold.warn`This warn log should be blue, italic, and bold.`;
    Log.color("green")`This log should be green and italic (color overridden).`;
    Log.setDefaultStyles((lg) =>
        lg.bg("lightgray").color("black")
    )`Setting new defaults: lightgray BG, black text.`;
    Log`This log has new defaults (lightgray BG, black text).`;
    Log.error`This error log has new defaults.`;
    Log.underline().bold()`This log has new defaults + underline and bold.`;
    Log.clearDefaultStyles()`Clearing default styles. This log is not affected.`;
    Log`This log should be plain again.`;
    Log.red.error`This error log is just red (no persistent styles).`;

    const myErrorLogger = new Logger();
    myErrorLogger.setDefaultStyles((log) => log.red().bold());
    myErrorLogger.error`[ERROR] This is a critical error!`;
    myErrorLogger.bgYellow()
        .warn`[WARNING] This is a warning with custom BG, still red and bold.`;

    Log`This global log should still be plain.`;

    Log.setDefaultStyles((lg) =>
        lg.magenta().underline()
    )`Setting magenta underline default via direct methods.`;
    Log`This should be magenta and underlined.`;
    Log.info`This info log should be magenta and underlined.`;
    Log.bgBrightWhite().bold()`This should be magenta, underlined, bright white BG, and bold.`;
    Log.clearDefaultStyles()`Cleared defaults again.`;
    Log`Back to plain.`;

    console.log("--- Chained Tagged Template Logs ---");
    Log`This is line 1.``This is line 2 (separate log).``And line 3 (also separate).`;

    console.log("--- Chained Calls for Single Log (ANSI) ---");
    Log.color("cyan")`Chained call 1 (ANSI):``Part 1 of log 1.`;
    Log`Continuation for log 2 (no styles from previous).``And log 3 (also plain).`;

    console.log("--- Chained Calls for Single Log (CSS) ---");
    Log.color("violet")`Chained call 1 (CSS):``Part 1 of log 1 (violet).`;
    Log.bg("lightgray")`Part 2 of log 2 (lightgray BG).`;

    console.log("--- Label-Based Logging (Initial) ---");
    Log`This is a default log.`;
    Log`${as(
        "verbose"
    )}This is a verbose message. It will NOT be logged by default.`;
    Log.color("magenta")`${as(
        "debug"
    )} This is a debug message (ANSI Magenta). It WILL be logged.`;
    Log.magenta.debug`${as( // Example of styled debug
        "debug"
    )} Also a debug message (ANSI Magenta direct method).`;
    Log.color("darkorange").info`${as( // Example of styled info with label
        "debug" // Using 'debug' label for an info message
    )} Another debug message (CSS DarkOrange) but logged via Log.info.`;


    globalLogger.configure({ clearDefaultListener: true });
    console.log(
        "--- Default listener cleared, configuring new custom listener ---"
    );
    
    globalLogger.configure({
        show: ["verbose"],
        ignore: ["debug"], // Now 'debug' label messages (like above) will be ignored by this listener
        onLog: ({ message, timestamp, labels, rawMessage, appliedStyles, consoleMethod }) => {
            const effectiveConsoleMethod = (typeof consoleMethod === 'function') ? consoleMethod : console.log;
            const prefix = IS_BROWSER ? "%c" : "";
            const style = IS_BROWSER ? "color: purple; font-weight: bold;" : "";
            
            const labelStr = Object.keys(labels).join(', ');
            const outputMessage = `${prefix}Custom Listener @ ${new Date(
                timestamp
            ).toLocaleTimeString()} [${labelStr || 'no labels'}]: ${message}`;

            if (IS_BROWSER) {
                effectiveConsoleMethod(outputMessage, style, { raw: rawMessage, styles: appliedStyles });
            } else {
                effectiveConsoleMethod(outputMessage, { raw: rawMessage, styles: appliedStyles });
            }
        },
    });

    console.log(
        "--- Label-Based Logging (After Config with Custom Listener) ---"
    );
    Log`Log after configuring.`; // Should use custom listener
    Log.color("blue").info`${as( // Styled info with verbose label
        "verbose"
    )}This verbose message WILL NOW be logged (ANSI Blue).`;
    Log.blue.warn`${as("verbose")}Also verbose (ANSI Blue direct method) via Log.warn.`; // Styled warn
    Log.color("fuchsia").error`${as( // Styled error with debug label
        "debug"
    )}This debug message WILL NOW be ignored (CSS Fuchsia) by custom listener.`;

    globalLogger.configure({ clearAllListeners: true });
    console.log("--- After Clearing All Listeners ---");
    Log.color(
        "yellow"
    ).info`This message will not appear unless a new listener is added.`;

    // Re-add a simple default-like listener
    globalLogger.configure({
        onLog: globalLogger["#listeners"].onLog[0] // This is a bit of a hack to get the original back
                                                 // A better way would be to store the default listener function
                                                 // But for test purposes, let's re-add the initial one.
                                                 // Actually, the constructor adds the first one. We can re-use that logic.
                                                 // For now, let's re-create it simply.
    });
    // The above configure will fail because #listeners is private.
    // Let's re-add the default listener logic for the test:
    globalLogger.configure({
        onLog: ({ rawMessage, appliedStyles, consoleMethod }) => {
            const effectiveConsoleMethod = (typeof consoleMethod === 'function') ? consoleMethod : console.log;
            if (IS_BROWSER && appliedStyles.length > 0) {
                const cssStyle = ansiToCss(appliedStyles);
                if (cssStyle !== "") {
                    const formatStringParts = []; const consoleArgs = [""];
                    for (const item of rawMessage) {
                        if (typeof item === "string") { formatStringParts.push("%c" + item); consoleArgs.push(cssStyle); }
                        else { formatStringParts.push("%O"); consoleArgs.push(item); }
                    }
                    consoleArgs[0] = formatStringParts.join("");
                    if (consoleArgs[0]) effectiveConsoleMethod(...consoleArgs);
                    return;
                }
            }
            const logArgs = []; const useAnsiStyling = IS_NODE && appliedStyles.length > 0;
            const stylePrefix = useAnsiStyling ? appliedStyles.join("") : ""; const styleSuffix = useAnsiStyling ? ANSI_STYLES.reset : "";
            const hasEffectiveStyles = useAnsiStyling || (IS_BROWSER && appliedStyles.some(s => typeof s === "string" && s.includes(":")));
            let prevPushedArgWasObject = false;
            for (let i = 0; i < rawMessage.length; i++) {
                const currentRawItem = rawMessage[i]; const nextRawItemIsObject = i + 1 < rawMessage.length && typeof rawMessage[i+1] !== "string";
                if (typeof currentRawItem === "string") {
                    if (hasEffectiveStyles && currentRawItem.trim() === "" && (prevPushedArgWasObject || nextRawItemIsObject) ) { logArgs.push(currentRawItem); }
                    else { if (useAnsiStyling) { logArgs.push(stylePrefix + currentRawItem + styleSuffix); } else { logArgs.push(currentRawItem); } }
                    prevPushedArgWasObject = false;
                } else { logArgs.push(currentRawItem); prevPushedArgWasObject = true; }
            }
            if (logArgs.length > 0) effectiveConsoleMethod(...logArgs);
        }
    });


    console.log("--- Simple listener re-added (default-like behavior) ---");
    Log.color("red").warn`Test with re-added listener (warn).`;
    Log.red.error`Another test with re-added listener (error direct method).`;
    Log.color("#008080").bold().info`CSS Teal color, bold (info). ${"Object here:"} ${{
        teal: true,
    }}`;

    Log.setDefaultStyles((lg) =>
        lg.green().underline()
    )`Setting green underline default with re-added listener.`;
    Log.debug`This debug log should be green and underlined.`;
    Log.bold().info`This info log should be green, underlined, and bold.`;
    Log.clearDefaultStyles()`Cleared defaults.`;
    Log.trace`This trace log should be plain again.`;
}


export default {
    Log,
    Logger,
    LogLabel,
    ansiToCss,
    test,
};