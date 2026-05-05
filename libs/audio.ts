import {getPlayerChar} from "./player";

export default class AudioClient {
    private streamHandle = 0;
    public _isPlaying = false;

    async playFromURL(url: string, char: Char) {
        log("Starting async audio stream load (download-first approach)...");

        this.streamHandle = native<number>("LOAD_AUDIOSTREAM_FROM_URL", url);

        if (this.streamHandle != 0) {
            log("Waiting for stream to load...");

            // Poll until loaded (async pattern like HTTP)
            while (!native("IS_AUDIO_STREAM_LOADED", this.streamHandle)) {
                await asyncWait(50);
            }

            log("Stream loaded");
            log("linking stream to player char");
            native('LINK_3D_AUDIOSTREAM_TO_CHAR', this.streamHandle, char);

            log("Starting playback...")
            const duration = native<number>("GET_AUDIOSTREAM_DURATION", this.streamHandle)
            native("SET_AUDIOSTREAM_STATE", this.streamHandle, 1);
            this._isPlaying = true;

            log("Audio stream is now playing, monitoring playback state...");

            await asyncWait((duration + 2) * 1000); // await for the duration plus 2 seconds to be sure.

            log("Audio stream finished playing, releasing...");
            native("RELEASE_AUDIOSTREAM", this.streamHandle);
            this.streamHandle = 0;
            this._isPlaying = false;
            log("Audio playback finished and stream released");
        } else {
            log("Failed to start audio stream");
        }
    }

    stopCurrentPlayback() {
        log("Stopping audio...");
        native("SET_AUDIOSTREAM_STATE", this.streamHandle, 0);
        native("RELEASE_AUDIOSTREAM", this.streamHandle);
        this.streamHandle = 0;
        this._isPlaying = false;
    }

    isPlaying(): boolean {
        return this._isPlaying
    }
}