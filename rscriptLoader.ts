/**
 * This file is necessary because the more scripts you have the more likely you are to run into issues with the game not loading properly.
 */

import {Key} from ".config/enums";

while(true){
    wait(1000); // Keep the script running to ensure other scripts can load

    if(Pad.IsGameKeyboardKeyPressed(Key.F12)) {
        (async () => {

        })()
    }

}