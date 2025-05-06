export default class Time {
    static #MS_IN_SECOND = 1000;
    static #MS_IN_MINUTE = 60 * this.#MS_IN_SECOND;
    static #MS_IN_HOUR = 60 * this.#MS_IN_MINUTE;
    static #MS_IN_DAY = 24 * this.#MS_IN_HOUR; // Not used in format, but kept for completeness

    /**
     * Attempts to parse a valid Time value from a string, number, or Date object
     * into milliseconds.
     *
     * @param {number | string | Date} [time="0s"] - The time to parse.
     *   - If a number, it's treated as seconds (e.g., `10` -> 10 seconds).
     *   - If a string, it can be:
     *     - A simple number (e.g., `"10"`) treated as seconds.
     *     - A number with a unit (e.g., `"500ms"`, `"2.5s"`, `"10m"`, `"1.5h"`, `"1d"`).
     *     - A combination of units (e.g., `"1h 30m 5s 100ms"`).
     *     - Milliseconds (`ms`) must be integers. Other units can be decimals.
     *   - If a Date object, it calculates the milliseconds from now until that Date.
     *     The Date must be in the future.
     * @returns {number} The total time in milliseconds.
     * @throws {Error} If the time format is invalid or a Date is in the past.
     */
    static parse(time = "0s") {
        if (typeof time === "number") {
            if (time < 0) {
                throw new Error(`Time duration cannot be negative: ${time}`);
            }
            return time * this.#MS_IN_SECOND; // Numbers are treated as seconds
        }

        if (time instanceof Date) {
            const now = Date.now();
            const diff = time.getTime() - now; // Difference in milliseconds
            if (diff < 0) {
                throw new Error(`Date is in the past: ${time.toISOString()}`);
            }
            return diff;
        }

        if (typeof time === "string") {
            const originalTimeString = time; // Keep for error messages
            let timeString = time.trim().toLowerCase();

            if (timeString === "") {
                timeString = "0s";
            }

            if (/^-?\d*\.?\d+$/.test(timeString)) {
                const numValue = parseFloat(timeString);
                if (Number.isNaN(numValue)) {
                    throw new Error(`Invalid numeric string: ${originalTimeString}`);
                }
                if (numValue < 0) {
                    throw new Error(`Time duration cannot be negative: ${originalTimeString}`);
                }
                return numValue * this.#MS_IN_SECOND;
            }

            let totalMs = 0;
            const componentPattern = /(\d*\.?\d+)\s*(d|h|m|s|ms)/g;
            let match;
            let lastIndex = 0;
            let foundComponent = false;

            while ((match = componentPattern.exec(timeString)) !== null) {
                foundComponent = true;
                const valueStr = match[1];
                const unit = match[2];
                let value;

                if (match.index > lastIndex) {
                    const intermediateText = timeString.substring(lastIndex, match.index).trim();
                    if (intermediateText.length > 0) {
                        throw new Error(`Unparseable part of time string: '${intermediateText}' in '${originalTimeString}'`);
                    }
                }

                if (unit === "ms") {
                    if (valueStr.includes('.')) {
                        throw new Error(`Millisecond value cannot be a decimal: ${valueStr}ms in '${originalTimeString}'`);
                    }
                    value = parseInt(valueStr, 10);
                    if (Number.isNaN(value)) {
                         throw new Error(`Invalid millisecond value: ${valueStr}ms in '${originalTimeString}'`);
                    }
                } else {
                    value = parseFloat(valueStr);
                    if (Number.isNaN(value)) {
                        throw new Error(`Invalid numeric value for unit ${unit}: ${valueStr}${unit} in '${originalTimeString}'`);
                    }
                }

                if (value < 0) {
                    throw new Error(`Time component value cannot be negative: ${valueStr}${unit} in '${originalTimeString}'`);
                }

                switch (unit) {
                    case "ms": totalMs += value; break;
                    case "s":  totalMs += value * this.#MS_IN_SECOND; break;
                    case "m":  totalMs += value * this.#MS_IN_MINUTE; break;
                    case "h":  totalMs += value * this.#MS_IN_HOUR; break;
                    case "d":  totalMs += value * this.#MS_IN_DAY; break;
                }
                lastIndex = componentPattern.lastIndex;
            }

            if (!foundComponent) {
                 throw new Error(`Invalid time string format: ${originalTimeString}. Expected format like "10s", "1h 30m", or a number.`);
            }

            const remainingText = timeString.substring(lastIndex).trim();
            if (remainingText.length > 0) {
                throw new Error(`Unparseable trailing part of time string: '${remainingText}' in '${originalTimeString}'`);
            }

            return totalMs;
        }

        throw new Error(`Invalid time input type: ${typeof time}. Expected number, string, or Date.`);
    }

    /**
     * Formats a duration in milliseconds into a human-readable string
     * (e.g., "1h 30m 5s 100ms").
     * Components (hours, minutes, seconds, milliseconds) are omitted if their value is zero.
     * If the total duration is zero, "0ms" is returned.
     *
     * @param {number} ms - The total duration in milliseconds.
     *   Fractional milliseconds will be truncated.
     * @returns {string} The formatted time string.
     * @throws {Error} If totalMilliseconds is not a non-negative number.
     */
    static format(ms) {
        if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) {
            throw new Error(`Invalid input: totalMilliseconds must be a non-negative number. Received: ${ms}`);
        }

        // Truncate any fractional milliseconds
        let remainingMs = Math.floor(ms);

        if (remainingMs === 0) {
            return "0ms";
        }

        const hours = Math.floor(remainingMs / this.#MS_IN_HOUR);
        remainingMs %= this.#MS_IN_HOUR;

        const minutes = Math.floor(remainingMs / this.#MS_IN_MINUTE);
        remainingMs %= this.#MS_IN_MINUTE;

        const seconds = Math.floor(remainingMs / this.#MS_IN_SECOND);
        remainingMs %= this.#MS_IN_SECOND;

        // The remainder is the milliseconds component
        const millisecondsComponent = remainingMs;

        const parts = [];
        if (hours > 0) {
            parts.push(`${hours}h`);
        }
        if (minutes > 0) {
            parts.push(`${minutes}m`);
        }
        if (seconds > 0) {
            parts.push(`${seconds}s`);
        }

        // Add milliseconds if it's non-zero, OR if it's the only component
        // (e.g., for inputs like 500ms, where h, m, s are 0).
        // The `parts.length === 0` check ensures that if totalMilliseconds < 1000 and > 0,
        // "Xms" is returned rather than an empty string.
        if (millisecondsComponent > 0 || parts.length === 0) {
            parts.push(`${millisecondsComponent}ms`);
        }

        return parts.join(" ");
    }
}