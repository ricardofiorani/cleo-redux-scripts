/**
 * Enter a vehicle as a passenger.
 * This script allows the player to toggle a mode where they can enter vehicles as passengers.
 * Press G to toggle the mode.
 * If the mode is enabled, the player will enter vehicles as a passenger when they attempt to get in.
 */

import {Key} from ".config/enums";
import {getPlayerChar, isPlayerInAnyCar} from "./libs/player";
import {getFreePassengerSeat} from "./libs/vehicle";

let isEnterVehicleAsPassengerEnabled = false;

while(true) {
    wait(100);

    if(Pad.IsGameKeyboardKeyPressed(Key.G) && !isPlayerInAnyCar()) {
        isEnterVehicleAsPassengerEnabled = !isEnterVehicleAsPassengerEnabled;
        showTextBox(`Passenger mode: ${isEnterVehicleAsPassengerEnabled}`);
        log(`Passenger mode: ${isEnterVehicleAsPassengerEnabled}`);
        wait(1000); // Prevents rapid toggling
    }

    if (getPlayerChar().isGettingInToACar() && isEnterVehicleAsPassengerEnabled) {
        log("Player is getting in to a car");
        // Get the car the player is trying to enter
        const nearestCar = getPlayerChar().getCarIsUsing();
        log(`Nearest car: ${nearestCar.getModel()}`);
        getPlayerChar().clearTasks().clearSecondaryTask();

        // Set the car belongs to the player so the police won't chase it
        native("SET_HAS_BEEN_OWNED_BY_PLAYER", nearestCar, true);

        const freeSeatIndex = getFreePassengerSeat(nearestCar);

        // Enter a car as passenger
        Task.EnterCarAsPassenger(getPlayerChar(), nearestCar, 5000, freeSeatIndex);
        wait(5000);
    }
}