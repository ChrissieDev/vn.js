import {VNCommand} from "../VNCommand.js";

export default class VNCommandStopMedia extends VNCommand {
    type = "stopMedia";

    /**
     * Creates a new VNCommandStopAudio instance.
     * @param {import("../VNCommand.js").VNCommandQueue} queue - The command queue.
     * @param {string | HTMLAudioElement} audio - The audio to stop. Either a uid referencing the audio element in the scene or the audio element itself.
     * @param {object} [options] - Options to control media playback.
     * @param {boolean} [options.rewind=true] - Whether to rewind the audio to the beginning after stopping.
     */
    constructor(queue, audio, options = { rewind: true }) {
        super(queue);
        this.audio = audio;
        this.options = options;
    }

    async execute() {
        return new Promise((resolve) => {
            const audio = this.audio;
            const scene = this.queue.player.scene;

            if (typeof audio === "string") {
                const audioElement = scene.shadowRoot.querySelector(`audio[uid="${audio}"]`);

                if (audioElement) {
                    audioElement.pause();
                    if (this.options.rewind) {
                        audioElement.currentTime = 0;
                    }
                } else {
                    Log.color("yellow")`[VNCommandStopAudio] Audio element not found in the scene with uid: ${audio}`;
                }
            } else if (audio instanceof HTMLAudioElement) {
                audio.pause();
                if (this.options.rewind) {
                    audio.currentTime = 0;
                }
            } else if (this.audio === null) {
                const audioElements = scene.shadowRoot.querySelectorAll("audio");
            } else {
                Log.color("yellow")`[VNCommandStopAudio] Invalid \`audio\` type. Expected a string or HTMLAudioElement, but got ${audio?.constructor?.name || typeof audio}.`;
            }

            resolve();
        });
    }
}
