import { Log } from "../../utils/log.js";
import { VNCommand } from "../VNCommand.js";

/**
 * Represents a call to play audio.
 */
export default class VNCommandPlayMedia extends VNCommand {
    type = "playMedia";

    constructor(queue, target, options = { volume: 1, loop: false, autoplay: true, wait: false }) {
        super(queue);
        this.target = target;
        this.options = options;

        // preload audio if it is a string.
        // set to a promise while loading so it's possible for the player to know if
        // the audio is still loading or not. we should do this with any asset that is preloadable
        // so that we can show a loading screen or something.
        this.#preloadMedia();
    }

    /**
     * Populates `this.preloadedAudio` and possibly `this.preloading` with an array of one promise (the audio loading)
     */
    async #preloadMedia() {
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
            let projectObject = this.queue.player.cloneObjectDefinition(target);

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
            let audioToPlay = this.preloadedAudio;

            if (audioToPlay instanceof Promise) {
                await audioToPlay;
            }

            audioToPlay.volume = options.volume;
            audioToPlay.loop = options.loop;
            audioToPlay.autoplay = options.autoplay;
            
            let foundInScene = false;

            // First check if the scene has this audio element already
            const existingAudio = this.queue.player.scene.querySelector(`audio[uid="${audioToPlay.getAttribute("uid")}"]`);

            if (existingAudio) {
                Log`[VNCommandPlay] Audio already exists in the scene, reusing...`;
                audioToPlay = existingAudio;
                foundInScene = true;
            }
            audioToPlay.setAttribute("cloned", "");
            // The audio element has to be in the DOM for later cleanup
            if (!foundInScene) {
                
                this.queue.player.scene.appendChild(audioToPlay);
            }
            
            if (options.wait) {
                audioToPlay.addEventListener("ended", () => {
                    Log`[VNCommandPlay] Audio ended.`;
                    resolve(true);
                });
                
                audioToPlay.play().catch((e) => {
                    Log.color("#ff6666")`[VNCommandPlay] Error playing audio: ${e}`;
                });
                
                audioToPlay.play();
            } else {
                audioToPlay.play().catch((e) => {
                    Log.color("#ff6666")`[VNCommandPlay] Error playing audio: ${e}`;
                });
                
                resolve(true);
            }
        });
    }
}