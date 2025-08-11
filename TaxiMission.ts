import {getPlayerChar} from "./libs/player";
import {Key} from ".config/enums";

const debugEnabled = true;
let isTaxiMissionActive = false;

const debug: typeof log = (...values: any[]) => {
    if (debugEnabled) {
        log(...values);
    }
}

// Main loop
while (true) {
    wait(100);

    if (getPlayerChar().isGettingInToACar() && getPlayerChar().isInTaxi()) {
        // TODO: Show the "ACTION" button instead of binding to the E key
        showTextBox('You can start a taxi mission by pressing the E key');
        debug("Player is getting in to a taxi, showing taxi mission prompt");

        // While inside the taxi loop
        while (getPlayerChar().isInTaxi()) {
            wait(100);
            if (Pad.IsGameKeyboardKeyPressed(Key.E)) {
                if (!isTaxiMissionActive) {
                    isTaxiMissionActive = true;
                    log("Starting taxi mission");
                    showTextBox('Taxi mission started! Drive to the destination.');
                    // Here you can add logic to start the taxi mission
                } else {
                    log("Taxi mission is already active");
                    showTextBox('Taxi mission is already active!');
                }

                wait(1000); // Prevent spamming the key
            }

            if(!isTaxiMissionActive) {
                continue;
            }

            log("Taxi mission is active, waiting for player to drive to destination");
        }
    }
}