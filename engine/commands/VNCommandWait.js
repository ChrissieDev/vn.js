import VNCommand from '../VNCommand.js';
export default class VNCommandWait extends VNCommand {
    static parseTime(time = "0s") {
        let timeString;
        let ms = 0;

        if (typeof time === "number") {
            if (time < 0) {
                throw new Error(`Invalid time format: ${time}`);
            }
            timeString = `${time}s`; // numbers are treated as seconds
        } else if (typeof time === "string") {
            timeString = time.trim().toLowerCase();
        } else {
            throw new Error(`Invalid time format: ${time}`);
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

    constructor(queue, time = "0s") {
        super(queue);
        this.ms = VNCommandWait.parseTime(time);
    }

    execute() {
        return new Promise((resolve) => {
            const waitTime = this.ms;
            const timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                resolve(true); // Resolve the promise after the wait time
            }, waitTime);
        });
    }
}