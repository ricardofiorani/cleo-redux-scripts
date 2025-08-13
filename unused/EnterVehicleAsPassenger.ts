/**
 * Enter a vehicle as a passenger.
 * This script allows the player to toggle a mode where they can enter vehicles as passengers.
 * Press G to enter the nearest car in the passenger seat.
 */

import {Key} from "../.config/enums";
import {getPlayerChar, isPlayerInAnyCar} from "../libs/player";
import {getFreePassengerSeat} from "../libs/vehicle";
import {getNearestCarToChar} from "../libs/utils";

while(true) {
    wait(100);

    if(Pad.IsGameKeyboardKeyPressed(Key.G) && !isPlayerInAnyCar()) {
        // Get the car the player is trying to enter
        const nearestCar = getNearestCarToChar(getPlayerChar());

        if (!nearestCar) {
            log("No car found nearby.");
            showTextBox("No car found nearby.");
            continue; // No car found, skip this iteration
        }

        log(`Nearest car: ${nearestCar.getModel()}`);
        getPlayerChar().clearTasks().clearSecondaryTask();

        // Set the car belongs to the player so the police won't chase it
        native("SET_HAS_BEEN_OWNED_BY_PLAYER", nearestCar, true);

        const freeSeatIndex = getFreePassengerSeat(nearestCar);

        // Enter a car as passenger
        Task.EnterCarAsPassenger(getPlayerChar(), nearestCar, 5000, freeSeatIndex);
        wait(1000);
    }
}