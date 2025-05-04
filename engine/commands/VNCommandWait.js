import VNCommand from '../VNCommand.js';
import VNCommandAnimate from './VNCommandAnimate.js';
export default class VNCommandWait extends VNCommand {
    static parseTime(until = "0s") {
        let timeString;
        let ms = 0;

        if (typeof until === "number") {
            if (until < 0) {
                throw new Error(`Invalid time format: ${until}`);
            }
            timeString = `${until}s`; // numbers are treated as seconds
        } else if (typeof until === "string") {
            timeString = until.trim().toLowerCase();
        } else if (until instanceof Date) {
            const now = new Date();
            const diff = until.getTime() - now.getTime(); // Difference in milliseconds
            if (diff < 0) {
                throw new Error(`Invalid time format: ${until}`);
            }
            ms = diff; // Set the difference in milliseconds
            return ms;
        } else {
            throw new Error(`Invalid time format: ${until}`);
        }
        
        if (timeString.endsWith("ms")) {
            ms = parseFloat(timeString.slice(0, -2));            
        } else if (timeString.endsWith("s")) {
            ms = parseFloat(timeString.slice(0, -1)) * 1000;
        } else if (timeString.endsWith("m")) {
            ms = parseFloat(timeString.slice(0, -1)) * 60 * 1000;
        } else if (timeString.endsWith("h")) {
            ms = parseFloat(timeString.slice(0, -1)) * 60 * 60 * 1000;
        } else if (timeString.endsWith("d")) {
            ms = parseFloat(timeString.slice(0, -1)) * 24 * 60 * 60 * 1000;
        } else {
            ms = parseFloat(timeString) * 1000; // Default to seconds if no unit is specified
        }

        return ms;
    }

    constructor(queue, until = "0s") {
        super(queue);
        if (typeof until === "number" || until instanceof Date || typeof until === "string") {
            this.until = VNCommandWait.parseTime(until);
        } else if (typeof until === "function") {
            this.until = until(); // Call the function to get the time
        } else if (until instanceof VNCommandAnimate) {
            this.until = until; // Store the animate command directly   
        }

    }

    execute() {
        return new Promise((resolve) => {
            if (typeof this.until === "number") {
                const timeoutId = setTimeout(() => {
                    clearTimeout(timeoutId);
                    resolve(true); // Resolve the promise after the wait time
                }, this.until);
            } else if (typeof this.until === "function") {
                const promise = this.until();
                if (!(promise instanceof Promise)) {
                    throw new Error("\x1b[31mAPI (VNCommandWait): The provided function must return a Promise!\x1b[0m");
                }
            } else if (this.until instanceof Promise) {
                // wait for the promise to resolve
                this.until.then((value) => {
                    console.log("Wait resolved with value:", value);
                    if (value instanceof VNCommandAnimate) {
                        // If the value is an animation command, wait for that too
                        return value.execute().then(() => {
                            resolve(true); // Resolve the wait command after the animation completes
                        });
                    }
                }).catch((error) => {
                    console.error("\x1b[31mAPI (VNCommandWait): Animation failed!\x1b[0m", error);
                    resolve(false); // Resolve with false if the animation fails
                });

            }
        });
    }
}