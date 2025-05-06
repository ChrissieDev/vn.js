import Time from '../Time.js';
import VNCommand from '../VNCommand.js';
import VNCommandAnimate from './VNCommandAnimate.js';
export default class VNCommandWait extends VNCommand {
    type = 'wait';

    
    constructor(queue, until = "0s") {
        super(queue);

        console.log("API (VNCommandWait): until:", until);
        
        if (typeof until === "number" || until instanceof Date || typeof until === "string") {
            this.until = Time.parse(until);
        } else if (typeof until === "function") {
            this.until = until(); // Call the function to get the time
        } else {
            this.until = until; // Store the animate command directly   
        }

    }

    execute() {
        return new Promise((resolve) => {
            
            if (typeof this.until === "number") {
                console.log("API (VNCommandWait): type was a number.");
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
                console.log("API (VNCommandWait): type was a promise.");
                this.until.then((value) => {
                    console.log("Wait resolved with value:", value);
                    if (value instanceof VNCommandAnimate) {
                        // If the value is an animation command, wait for that too
                        return value.execute().then(() => {
                            resolve(false); // Resolve the wait command after the animation completes
                        });
                    }
                }).catch((error) => {
                    console.error("\x1b[31mAPI (VNCommandWait): Animation failed!\x1b[0m", error);
                    resolve(false); // Resolve with false if the animation fails
                });

            } else if (this.until instanceof VNCommandAnimate) {
                console.log("API (VNCommandWait): type was an animation command.");
                const res = this.until.execute()
                if (res instanceof Promise) {
                    console.log("API (VNCommandWait): Executing animation command - execute() returned a promise.");
                    res.then(() => {
                        resolve(true); // Resolve the wait command after the animation completes
                    }).catch((error) => {
                        console.error("\x1b[31mAPI (VNCommandWait): Animation failed!\x1b[0m", error);
                        resolve(false); // Resolve with false if the animation fails
                    });
                } else {
                    console.log("API (VNCommandWait): Executing animation command - execute() returned a non-promise value:", res);
                    resolve(true); // Resolve immediately if the animation doesn't return a promise
                }
                
            } else {
                console.log(this.until);
                throw new Error("\x1b[31mAPI (VNCommandWait): Invalid until value! Received:", this.until);
            }
        });
    }
}