// SimpleEventEmitter.js

/**
 * A minimal event emitter implementation for browser compatibility
 * (if Node.js 'events' module is not available).
 */
export class SimpleEventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Registers an event listener.
     * @param {string} eventName - The name of the event.
     * @param {function} listener - The callback function.
     */
    on(eventName, listener) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
    }

    /**
     * Emits an event, calling all registered listeners asynchronously.
     * @param {string} eventName - The name of the event.
     * @param {...any} args - Arguments to pass to the listeners.
     */
    emit(eventName, ...args) {
        const listeners = this.events[eventName] || [];
        // Emit events asynchronously using setTimeout(0) to avoid blocking
        // the main execution loop while event handlers run.
         setTimeout(() => {
             for (const listener of listeners) {
                 // Use a try-catch around listeners to prevent one handler from breaking others
                 try {
                    listener(...args);
                 } catch (e) {
                      console.error(`Error in event listener for '${eventName}':`, e);
                 }
             }
         }, 0);
    }

     /**
      * Removes an event listener. (Optional)
      * @param {string} eventName - The name of the event.
      * @param {function} listener - The callback function to remove.
      */
     removeListener(eventName, listener) {
         const listeners = this.events[eventName];
         if (listeners) {
             this.events[eventName] = listeners.filter(l => l !== listener);
         }
     }
}

export default SimpleEventEmitter;