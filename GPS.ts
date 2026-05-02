/**
 * GPS
 * This script provides a simple GPS functionality that logs the player's coordinates and street name at regular intervals.
 * Set the constants `interval` and `gpsEnabled` to control the update frequency and whether GPS is active.
 */
import {getStreetNameFromCoords} from "./libs/utils";

const interval = 5000; // Interval in milliseconds for GPS updates, 5000 = 5 seconds
const gpsEnabled = false;

while (gpsEnabled) {
    wait(interval);
    //display the GPS coordinates
    const player = new Player(Player.GetId());
    log(`X:${player.getChar().getCoordinates().x.toFixed(2)},Y:${player.getChar().getCoordinates().y.toFixed(2)},Z:${player.getChar().getCoordinates().z.toFixed(2)}`);
    const currentStreet = getStreetNameFromCoords(player.getChar().getCoordinates());
    log(`Street: ${currentStreet}`);
}