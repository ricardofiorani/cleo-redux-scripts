import { Key } from ".config/enums"
import {getPlayerChar} from "./libs/player";
import AudioClient from "./libs/audio";

const MP3_URL = "https://www.myinstants.com/media/sounds/emotional-damage-meme.mp3";

CLEO.debug.trace(false);

(async () => {
    const audioClient = new AudioClient()

    while (true) {
        await asyncWait(100);

        if (Pad.IsGameKeyboardKeyPressed(Key.T) && !audioClient.isPlaying()) {
            await audioClient.playFromURL(MP3_URL, getPlayerChar());
        }

        if (Pad.IsGameKeyboardKeyPressed(Key.Y) && audioClient.isPlaying()) {
            audioClient.stopCurrentPlayback();
        }
    }
})();