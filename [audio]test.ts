import { Key } from ".config/enums"

const MP3_URL = "https://www.myinstants.com/media/sounds/emotional-damage-meme.mp3";

CLEO.debug.trace(true);

let streamHandle = 0;
let isPlaying = false;

(async () => {
    while (true) {
        await asyncWait(100);

        if (Pad.IsGameKeyboardKeyPressed(Key.T) && !isPlaying) {
            log("Starting async audio stream load (download-first approach)...");

            streamHandle = native<number>("LOAD_AUDIOSTREAM_FROM_URL", MP3_URL);

            if (streamHandle != 0) {
                log("Waiting for stream to load...");
                
                // Poll until loaded (async pattern like HTTP)
                while (!native("IS_AUDIO_STREAM_LOADED", streamHandle)) {
                    await asyncWait(50);
                }
                
                log("Stream loaded, starting playback...");
                native("SET_AUDIOSTREAM_STATE", streamHandle, 1);
                isPlaying = true;


                while(native("IS_AUDIOSTREAM_PLAYING", streamHandle)) {
                    log("Waiting for stream to finish playback...");
                    await asyncWait(100);
                }

                log("Audio stream finished playing, releasing...");
                native("RELEASE_AUDIOSTREAM", streamHandle);
                streamHandle = 0;
                isPlaying = false;
                log("Audio playback finished and stream released");
            } else {
                log("Failed to start audio stream");
            }
        }

        if (Pad.IsGameKeyboardKeyPressed(Key.Y) && isPlaying) {
            log("Stopping audio...");
            native("SET_AUDIOSTREAM_STATE", streamHandle, 0);
            native("RELEASE_AUDIOSTREAM", streamHandle);
            streamHandle = 0;
            isPlaying = false;
        }
    }
})();