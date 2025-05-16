import { Log, as } from "./log.js";

/**
 * A static utility class for parsing, formatting and converting between different time formats used by the visual novel engine.
 * It enables the engine's scene API to, despite the engine only handling milliseconds internally, support a variety of time formats.
 */
export default class Time {

    /**
     * A static class to represent units of time, up to days.
     * @readonly
     * @static
     * @enum {number}
     */
    static TimeUnit = Object.freeze({
        Milliseconds: 0,
        Seconds: 1,
        Minutes: 2,
        Hours: 3,
        Days: 4,
    });

    static #MILLISECONDS_PER_UNIT = Object.freeze({
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    });

    static #TIME_UNIT_FACTORS_TO_MS = Object.freeze([
        1,
        1000,
        60 * 1000,
        60 * 60 * 1000,
        24 * 60 * 60 * 1000,
    ]);

    /**
     * Parse a time string into milliseconds.
     * Serves as a way to allow users to use a variety of time formats,
     * while the engine itself only uses milliseconds.
     * @overload
     * @param {string} time The time string to parse.
     * @returns {number} The time in milliseconds.
     * @example 
     * ```js
     * Time.parse("1s") // 1000
     * Time.parse("1s 500ms") // 1500
     * Time.parse("1h 30m 0.5s") // 5400500
     * Time.parse("1h 30m") // 5400000
     * Time.parse("3h -25m 1/3s -100ms") // 9300233.333...
     * ```
     */

    /**
     * Parse a number into milliseconds.
     * Method overload for when a number is passed in.
     * @overload
     * @param {number} time Time in seconds.
     * @returns {number} Time in milliseconds.
     * @example
     * ```js
     * Time.parse(1) // 1000
     * Time.parse(-0.5) // -500
     * Time.parse(0) // 0
     * ```
     */
    static parse(time = 0) {
        let totalMilliseconds = 0;

        if (typeof time === "string") {
            const trimmedTime = time.trim();
            if (trimmedTime === "") {
                return 0;
            }
            const parts = trimmedTime.split(/\s+/);
            for (const part of parts) {
                if (part) {
                    totalMilliseconds += this.#parseTimeStringPart(part);
                }
            }
        } else if (typeof time === "number") {
            if (isNaN(time) || !isFinite(time)) {
                throw new TypeError(`Time.parse() expects a finite number, got ${time}.`);
            }
            totalMilliseconds = time * 1000;
        } else {
            throw new TypeError(`Time.parse() expects a string or number, got ${time?.constructor?.name || typeof time}.`);
        }

        return totalMilliseconds;
    }

    static #parseTimeStringPart(substring) {
        if (typeof substring !== "string") {
            throw new TypeError(`#parseTimeStringPart() expects a string, got ${substring?.constructor?.name || typeof substring}.`);
        }

        const match = substring.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+|\d+\/\d+))\s*([a-zA-Z]+)$/);

        if (!match) {
            throw new Error(`Invalid time string part: "${substring}"`);
        }

        const valueStr = match[1];
        const unit = match[2].toLowerCase();

        let numericValue;
        if (valueStr.includes('/')) {
            const fractionParts = valueStr.split('/');
            const numerator = parseFloat(fractionParts[0]);
            const denominator = parseFloat(fractionParts[1]);

            if (isNaN(numerator) || isNaN(denominator)) {
                throw new Error(`Invalid fraction components in time string part: "${substring}"`);
            }
            if (denominator === 0) {
                throw new Error(`Division by zero in time string part: "${substring}"`);
            }
            numericValue = numerator / denominator;
        } else {
            numericValue = parseFloat(valueStr);
        }

        if (isNaN(numericValue)) {
            throw new Error(`Invalid numeric value in time string part: "${substring}"`);
        }
        
        const multiplier = this.#MILLISECONDS_PER_UNIT[unit];
        if (multiplier === undefined) {
            throw new Error(`Unknown time unit "${unit}" in part "${substring}"`);
        }

        return numericValue * multiplier;
    }

    /**
     * Format a number into a time string as expected by the string overload of `Time.parse()`.
     * @param {number} time The time to format.
     * @param {{ unit?: Time.TimeUnit }} [options={ unit: Time.TimeUnit.Seconds }] The options to format the time with.
     * `unit` specifies the unit of the input `time` value and defaults to `Time.TimeUnit.Seconds`.
     * @returns {string} The formatted time string.
     * @example
     * ```js
     * Time.toTimeString(1.5) // "1s 500ms"
     * Time.toTimeString(5400.5) // "1h 30m 500ms" 
     * Time.toTimeString(0) // "0ms"
     * Time.toTimeString(1000, { unit: Time.TimeUnit.Milliseconds }) // "1s"
     * Time.toTimeString(-30, { unit: Time.TimeUnit.Minutes }) // "-30m"
     * Time.toTimeString(0.0007, { unit: Time.TimeUnit.Seconds }) // "1ms"
     * Time.toTimeString(0.0003, { unit: Time.TimeUnit.Seconds }) // "0ms"
     * ```
     */
    static toTimeString(time, options = {}) {
        if (typeof time !== "number" || isNaN(time) || !isFinite(time)) {
            throw new TypeError(`Time.toTimeString() expects a finite number, got ${time?.constructor?.name || typeof time}.`);
        }
        
        const finalOptions = { unit: Time.TimeUnit.Seconds, ...options };

        if (this.#TIME_UNIT_FACTORS_TO_MS[finalOptions.unit] === undefined) {
            throw new Error(`Invalid unit provided in options: ${finalOptions.unit}`);
        }

        let totalMilliseconds = time * this.#TIME_UNIT_FACTORS_TO_MS[finalOptions.unit];
        
        let sign = "";
        if (totalMilliseconds < 0) {
            sign = "-";
            totalMilliseconds = Math.abs(totalMilliseconds);
        }

        totalMilliseconds = Math.round(totalMilliseconds);

        if (totalMilliseconds === 0) {
            return "0ms"; 
        }

        const resultParts = [];
        let remainingMs = totalMilliseconds;

        const unitsInOrder = [
            { key: 'd', value: this.#MILLISECONDS_PER_UNIT.d },
            { key: 'h', value: this.#MILLISECONDS_PER_UNIT.h },
            { key: 'm', value: this.#MILLISECONDS_PER_UNIT.m },
            { key: 's', value: this.#MILLISECONDS_PER_UNIT.s },
            { key: 'ms', value: this.#MILLISECONDS_PER_UNIT.ms },
        ];

        for (const { key, value } of unitsInOrder) {
            if (remainingMs === 0 && key !== 'ms' && resultParts.length > 0) { 
                continue;
            }
            
            const count = Math.floor(remainingMs / value);
            if (count > 0) {
                resultParts.push(`${count}${key}`);
                remainingMs %= value;
            }
        }
        
        if (resultParts.length === 0) {
            return "0ms";
        }

        return sign + resultParts.join(" ");
    }
}

function test() {
    Log.color("lightblue").bold()`${as("test", "Time")} [Time.js] Running unit tests for class: Time...`;
    let testsPassed = 0;
    let testsFailed = 0;
    const EPSILON = 1e-9;

    const formatArg = (arg) => {
        if (typeof arg === 'string') return `"${arg}"`;
        if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg);
        return String(arg);
    };
    
    const runTest = ({ description, action, expected, checkErrorType = null }) => {
        Log.dim`${as("test")} Testing: ${description}`;
        try {
            const actual = action();
            if (checkErrorType) {
                testsFailed++;
                Log.red`${as("test", "Time")}  FAIL: Expected error ${checkErrorType.name}, but got successful result: ${formatArg(actual)}`;
                return;
            }

            let passed;
            if (typeof expected === 'number' && typeof actual === 'number' && 
                (!Number.isInteger(expected) || !Number.isInteger(actual))) {
                 passed = Math.abs(actual - expected) < EPSILON;
            } else {
                passed = actual === expected;
            }

            if (passed) {
                testsPassed++;
                Log.green`${as("test", "Time")}  PASS: Expected ${formatArg(expected)}, Got ${formatArg(actual)}`;
            } else {
                testsFailed++;
                Log.red`${as("test", "Time")}  FAIL: Expected ${formatArg(expected)}, Got ${formatArg(actual)}`;
            }
        } catch (error) {
            if (checkErrorType && error instanceof checkErrorType) {
                testsPassed++;
                Log.green`${as("test", "Time")}  PASS: Correctly threw ${checkErrorType.name}: ${error.message}`;
            } else if (checkErrorType) {
                testsFailed++;
                Log.red`${as("test", "Time")}  FAIL: Expected error ${checkErrorType.name}, but got ${error.name}: ${error.message}`;
            } else {
                testsFailed++;
                Log.red`${as("test", "Time")}  FAIL: Unexpected error: ${error.name}: ${error.message}`;
                Log.dim`${error.stack}`;
            }
        }
    };

    Log.color("cyan")`${as("test", "Time")} --- Time.parse() tests ---`;
    runTest({ description: "Parse '1s'", action: () => Time.parse("1s"), expected: 1000 });
    runTest({ description: "Parse '1s 500ms'", action: () => Time.parse("1s 500ms"), expected: 1500 });
    runTest({ description: "Parse '1h 30m 0.5s'", action: () => Time.parse("1h 30m 0.5s"), expected: 5400500 });
    runTest({ description: "Parse '1h 30m'", action: () => Time.parse("1h 30m"), expected: 5400000 });
    runTest({ description: "Parse '3h -25m 1/3s -100ms'", action: () => Time.parse("3h -25m 1/3s -100ms"), expected: 9300233.333333333 });
    runTest({ description: "Parse number 1 (seconds)", action: () => Time.parse(1), expected: 1000 });
    runTest({ description: "Parse number -0.5 (seconds)", action: () => Time.parse(-0.5), expected: -500 });
    runTest({ description: "Parse number 0 (seconds)", action: () => Time.parse(0), expected: 0 });
    runTest({ description: "Parse default (no arg)", action: () => Time.parse(), expected: 0 });
    runTest({ description: "Parse empty string ''", action: () => Time.parse(""), expected: 0 });
    runTest({ description: "Parse string with spaces '  '", action: () => Time.parse("  "), expected: 0 });
    runTest({ description: "Parse '100ms'", action: () => Time.parse("100ms"), expected: 100 });
    runTest({ description: "Parse '1.5s'", action: () => Time.parse("1.5s"), expected: 1500 });
    runTest({ description: "Parse '.5s'", action: () => Time.parse(".5s"), expected: 500 });
    runTest({ description: "Parse '-1m'", action: () => Time.parse("-1m"), expected: -60000 });
    runTest({ description: "Parse '1d'", action: () => Time.parse("1d"), expected: 86400000 });
    runTest({ description: "Parse '1/2s'", action: () => Time.parse("1/2s"), expected: 500 });
    runTest({ description: "Parse '1/4m'", action: () => Time.parse("1/4m"), expected: 15000 });
    runTest({ description: "Parse complex '1.25h 0.5m 30.123s 123ms'", action: () => Time.parse("1.25h 0.5m 30.123s 123ms"), expected: 4560246 });
    runTest({ description: "Parse with multiple spaces '1s   500ms'", action: () => Time.parse("1s   500ms"), expected: 1500 });

    Log.color("cyan")`${as("test", "Time")} --- Time.parse() error tests ---`;
    runTest({ description: "Parse null", action: () => Time.parse(null), expected: null, checkErrorType: TypeError });
    runTest({ description: "Parse object {}", action: () => Time.parse({}), expected: null, checkErrorType: TypeError });
    runTest({ description: "Parse invalid string '1foo'", action: () => Time.parse("1foo"), expected: null, checkErrorType: Error });
    runTest({ description: "Parse '1s 2bar'", action: () => Time.parse("1s 2bar"), expected: null, checkErrorType: Error });
    runTest({ description: "Parse '1/0s' (division by zero)", action: () => Time.parse("1/0s"), expected: null, checkErrorType: Error });
    runTest({ description: "Parse 'abc/2s' (invalid fraction numerator)", action: () => Time.parse("abc/2s"), expected: null, checkErrorType: Error });
    runTest({ description: "Parse '1/abcs' (invalid fraction denominator)", action: () => Time.parse("1/abcs"), expected: null, checkErrorType: Error });
    runTest({ description: "Parse number NaN", action: () => Time.parse(NaN), expected: null, checkErrorType: TypeError });
    runTest({ description: "Parse number Infinity", action: () => Time.parse(Infinity), expected: null, checkErrorType: TypeError });
    runTest({ description: "Parse '1 zyx'", action: () => Time.parse("1 zyx"), expected: null, checkErrorType: Error });


    Log.color("cyan")`${as("test", "Time")} --- Time.toTimeString() tests ---`;
    runTest({ description: "Format 1.5 (seconds)", action: () => Time.toTimeString(1.5), expected: "1s 500ms" });
    runTest({ description: "Format 5400.5 (seconds)", action: () => Time.toTimeString(5400.5), expected: "1h 30m 500ms" });
    runTest({ description: "Format 0 (seconds)", action: () => Time.toTimeString(0), expected: "0ms" });
    runTest({ description: "Format 1000 (ms unit)", action: () => Time.toTimeString(1000, { unit: Time.TimeUnit.Milliseconds }), expected: "1s" });
    runTest({ description: "Format -30 (minutes unit)", action: () => Time.toTimeString(-30, { unit: Time.TimeUnit.Minutes }), expected: "-30m" });
    runTest({ description: "Format 0.0007 (seconds) -> 0.7ms rounds to 1ms", action: () => Time.toTimeString(0.0007, { unit: Time.TimeUnit.Seconds }), expected: "1ms" });
    runTest({ description: "Format 0.0003 (seconds) -> 0.3ms rounds to 0ms", action: () => Time.toTimeString(0.0003, { unit: Time.TimeUnit.Seconds }), expected: "0ms" });
    runTest({ description: "Format 0.00049 (seconds) -> 0.49ms rounds to 0ms", action: () => Time.toTimeString(0.00049, { unit: Time.TimeUnit.Seconds }), expected: "0ms" });
    runTest({ description: "Format 0.00050 (seconds) -> 0.5ms rounds to 1ms", action: () => Time.toTimeString(0.00050, { unit: Time.TimeUnit.Seconds }), expected: "1ms" });
    runTest({ description: "Format 86400 (seconds) -> 1 day", action: () => Time.toTimeString(86400), expected: "1d" });
    runTest({ description: "Format 90061 (seconds) -> 1d 1h 1m 1s", action: () => Time.toTimeString(86400 + 3600 + 60 + 1), expected: "1d 1h 1m 1s" });
    runTest({ description: "Format 1 (second)", action: () => Time.toTimeString(1), expected: "1s" });
    runTest({ description: "Format 0.001 (seconds) -> 1ms", action: () => Time.toTimeString(0.001), expected: "1ms" });
    runTest({ description: "Format 60 (seconds) -> 1m", action: () => Time.toTimeString(60), expected: "1m" });
    runTest({ description: "Format 3600 (seconds) -> 1h", action: () => Time.toTimeString(3600), expected: "1h" });
    runTest({ description: "Format 1 (days unit)", action: () => Time.toTimeString(1, { unit: Time.TimeUnit.Days }), expected: "1d" });
    runTest({ description: "Format 0.5 (days unit)", action: () => Time.toTimeString(0.5, { unit: Time.TimeUnit.Days }), expected: "12h" });
    runTest({ description: "Format 1.234 (seconds)", action: () => Time.toTimeString(1.234), expected: "1s 234ms" });
    runTest({ description: "Format -1.5 (seconds)", action: () => Time.toTimeString(-1.5), expected: "-1s 500ms" });
    runTest({ description: "Format -0.0007 (seconds) -> -0.7ms rounds to -1ms", action: () => Time.toTimeString(-0.0007), expected: "-1ms" });
    runTest({ description: "Format -0.0003 (seconds) -> -0.3ms rounds to 0ms", action: () => Time.toTimeString(-0.0003), expected: "0ms" });
    runTest({ description: "Format 3599.9999 (seconds) -> rounds to 1h", action: () => Time.toTimeString(3599.9999), expected: "1h" });
    runTest({ description: "Format from ms: 123ms", action:() => Time.toTimeString(123, {unit: Time.TimeUnit.Milliseconds}), expected: "123ms"});
    runTest({ description: "Format from ms: 1234ms", action:() => Time.toTimeString(1234, {unit: Time.TimeUnit.Milliseconds}), expected: "1s 234ms"});
    runTest({ description: "Format 0 (ms unit)", action: () => Time.toTimeString(0, { unit: Time.TimeUnit.Milliseconds }), expected: "0ms" });
    runTest({ description: "Format 0.1 (ms unit) -> rounds to 0ms", action: () => Time.toTimeString(0.1, { unit: Time.TimeUnit.Milliseconds }), expected: "0ms" });
    runTest({ description: "Format 0.9 (ms unit) -> rounds to 1ms", action: () => Time.toTimeString(0.9, { unit: Time.TimeUnit.Milliseconds }), expected: "1ms" });


    Log.color("cyan")`${as("test", "Time")} --- Time.toTimeString() error tests ---`;
    runTest({ description: "Format null", action: () => Time.toTimeString(null), expected: null, checkErrorType: TypeError });
    runTest({ description: "Format string 'foo'", action: () => Time.toTimeString("foo"), expected: null, checkErrorType: TypeError });
    runTest({ description: "Format with invalid unit 99", action: () => Time.toTimeString(1, { unit: 99 }), expected: null, checkErrorType: Error });
    runTest({ description: "Format NaN", action: () => Time.toTimeString(NaN), expected: null, checkErrorType: TypeError });
    runTest({ description: "Format Infinity", action: () => Time.toTimeString(Infinity), expected: null, checkErrorType: TypeError });


    Log.color("lightblue").bold()`${as("test", "Time")} [Time.js] Test Summary:`;
    Log.color("green")`${as("test", "Time")}  Passed: ${testsPassed}`;
    Log.color("red")`${as("test", "Time")}  Failed: ${testsFailed}`;

    if (testsFailed > 0) {
        Log.red().bold()`${as("test", "Time")} SOME TESTS FAILED!`;
    } else {
        Log.green().bold()`${as("test", "Time")} ALL TESTS PASSED!`;
    }
}

test();