import {Key} from ".config/enums";
import {getPlayerCoords} from "./libs/player";

while (true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad1)) {
        const coords = getPlayerCoords();
        log(coords);
        wait(1000);
    }
}