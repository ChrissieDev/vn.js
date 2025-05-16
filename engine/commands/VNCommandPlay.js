import { Log } from "../../utils/log.js";
import { VNCommand } from "../VNCommand.js";

/**
 * Represents a call to play audio.
 */
export default class VNCommandPlay extends VNCommand {
    type = "play";

    constructor(queue, target, options = { volume: 1, loop: false, autoplay: true, wait: false }) {
        super(queue);
        this.target = target;
        this.options = options;

        // preload audio if it is a string.
        // set to a promise while loading so it's possible for the player to know if
        // the audio is still loading or not. we should do this with any asset that is preloadable
        // so that we can show a loading screen or something.
        this.#preloadAudio();
    }

    /**
     * Populates `this.preloadedAudio` and possibly `this.preloading` with an array of one promise (the audio loading)
     */
    async #preloadAudio() {
        Log`[VNCommandPlay] Preloading audio: ${this.target}`;
        // any command that depends on assets being loaded to run
        // should add promises to this array
        const preloading = this.preloading;
        let target = this.target;
        
        if (target instanceof HTMLAudioElement || target instanceof Audio) {
            Log`[VNCommandPlay] Preloaded audio is already an audio element.`;
            // np, no need to preload
            this.preloading = []; 
            this.preloadedAudio = target;
        } else if (typeof target === 'string') {
            Log`[VNCommandPlay] Preloading audio from string: ${target}`;
            
            target = target.trim();

            // 1. Assume this is a UID and get it from the project.
            const projectObject = this.queue.player.cloneObjectDefinition(target);

            // 2. We found it!
            if (projectObject) {
                Log`[VNCommandPlay] Preloaded audio from project: ${target}`;
                this.preloading = [];
                this.preloadedAudio = projectObject;
            } else {
                Log`[VNCommandPlay] Preloaded audio not found in project: ${target}`;
                // We didn't find it, so assume it is a URL.
                preloading.push(new Promise((resolve, reject) => {
                    // 3. Preload the audio file.
                    Log`[VNCommandPlay] Preloading audio from URL: ${target}`;
                    const audio = new Audio(target);
                    
                    audio.addEventListener("canplaythrough", (e) => {
                        Log`[VNCommandPlay] Audio loaded!`;
                        audio.volume = this.options.volume;
                        audio.loop = this.options.loop;

                        // store the loaded audio in the command
                        this.preloadedAudio = e.target;
                        this.preloading = [];
                        resolve(audio);
                    });

                    audio.addEventListener("error", (e) => {
                        Log.color("#ff6666")`[VNCommandPlay] Error loading audio: ${e}`;
                        reject(e);
                    });
                }));
            }
        }
    }

    /**
     * Play the audio. If 'wait' has been set to true, wait for the audio to finish playing before resolving.
     */
    async execute() {
        const options = this.options;

        return new Promise(async (resolve, reject) => {
            const preloadedAudio = this.preloadedAudio;

            if (preloadedAudio instanceof Promise) {
                await preloadedAudio;
            }

            preloadedAudio.volume = options.volume;
            preloadedAudio.loop = options.loop;
            preloadedAudio.autoplay = options.autoplay;
            
            // The audio element has to be in the DOM for later cleanup
            preloadedAudio.setAttribute("cloned", "");
            this.queue.player.scene.appendChild(preloadedAudio);
            
            if (options.wait) {
                preloadedAudio.addEventListener("ended", () => {
                    Log`[VNCommandPlay] Audio ended.`;
                    resolve(true);
                });
                
                preloadedAudio.play().catch((e) => {
                    Log.color("#ff6666")`[VNCommandPlay] Error playing audio: ${e}`;
                });
                
                

                preloadedAudio.play();
            } else {
                preloadedAudio.play().catch((e) => {
                    Log.color("#ff6666")`[VNCommandPlay] Error playing audio: ${e}`;
                });
                
                resolve(true);
            }
        });
    }
}