import { Log } from "../../utils/log.js";
import { VNCommand } from "../VNCommand.js";

/**
 * Represents a request to pause an audio element in the scene.
 */
export default class VNCommandPauseMedia extends VNCommand {
    type = "pauseMedia";
    
    /**
     * Creates a new VNCommandPauseAudio instance.
     * @param {import("../VNCommand.js").VNCommandQueue} queue - The command queue.
     * @param {string | HTMLAudioElement} audio - The audio to pause. Either the uid of the audio element or the audio element itself.
     */
    constructor(queue, audio) {
        super(queue);
        this.audio = audio;
    }

    async execute() {
        return new Promise((resolve) => {
            const scene = this.queue.player.scene;
            const audio = this.audio;

            if (typeof audio === "string") {
                const audioElement = scene.shadowRoot.querySelector(`audio[uid="${audio}"]`);
                if (audioElement) {
                    audioElement.pause();
                } else {
                    Log.color("yellow")`[VNCommandPauseAudio] Audio element not found in the scene with uid: ${audio}`;
                    resolve();
                }
            } else if (audio instanceof HTMLAudioElement) {
                audio.pause();
            }

            resolve();
        });
    }
}