/**
 * Pedestrian Mode Script
 * This script allows the player to be in wandering mode as both a pedestrian and a driver.
 * Press Numpad Enter to enable or disable wandering mode.
 */

import {Key} from ".config/enums";
import {getPlayerChar, getPlayerCurrentVehicle, isPlayerDrivingAnyCar} from "./libs/player";

let isWandering = false;

while (true) {
    wait(100);
    const player = new Player(Player.GetId());

    if (Pad.IsGameKeyboardKeyPressed(Key.NumpadEnter)) {
        if (isWandering) {
            log("Numpad Enter pressed - Stopping pedestrian mode");
            showTextBox("Stopping pedestrian mode");
            isWandering = false;
            getPlayerChar().clearTasks();
            getPlayerChar().clearSecondaryTask();
            getPlayerChar().setKeepTask(false);
        } else {
            log("Numpad Enter pressed - Starting pedestrian mode");
            showTextBox("Starting pedestrian mode");
            isWandering = true;
            player.getChar().setInvincible(true);

            getPlayerChar().clearTasks();
            getPlayerChar().clearSecondaryTask();
            getPlayerChar().setKeepTask(false);

            if (isPlayerDrivingAnyCar()) {
                log("Player is driving a car, switching to CarDriveWander mode");
                Task.CarDriveWander(getPlayerChar(), getPlayerCurrentVehicle(), 40, 1)
            } else {
                log("Player is not driving a car, switching to pedestrian wander mode");
                Task.WanderStandard(getPlayerChar());
            }
        }
        wait(1000); // Prevents rapid toggling
    }
}