/**
 * Teleporter Script for GTA IV
 * This script allows the player to teleport to a waypoint set on the map by pressing the Numpad1 key.
 */

import {Key} from "../.config/enums";
import {getWaypointCoords, isWaypointSet} from "../libs/waypoint";
import {getPlayer} from "../libs/player";

while(true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad1) && isWaypointSet()) {
        const destination = getWaypointCoords();
        log(`Teleporting to destination: ${destination.x}, ${destination.y}, ${destination.z}`);
        getPlayer().getChar().setCoordinates(destination.x, destination.y, destination.z);
        wait(1000); // Wait to prevent spamming the teleport
    }
}