/**
 * This script allows you to enable a self-driving mode for the player's vehicle.
 * It will drive the vehicle to the waypoint set by the player.
 * Press J to toggle the self-driving mode.
 *
 * Also works when the player is a passenger in a vehicle.
 */

import {Key} from ".config/enums";
import {BlipColors, cleanupTestBlips, createBlip} from "./libs/blips";
import {getDistanceBetweenTwoVectors, getETA} from "./libs/utils";
import {getDriveableCarNodeFromCoords} from "./libs/world";
import {getPlayerChar, getPlayerCurrentVehicle, isPlayerInAnyCar} from "./libs/player";
import {driveToCoords} from "./libs/vehicle";
import {getWaypointCoords} from "./libs/waypoint";

let teslaModeEnabled = false;
let currentDestination: Vector3 = null;
let nextDrivingPointBlip: Blip | null = null;

const drivingSpeed = 40; // Speed in miles
const obeyLaws = true; // Set to false if you want the vehicle to ignore traffic laws

while (true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.J)) {
        if (!isPlayerInAnyCar()) {
            showTextBox("You must be in a car to enable Tesla mode");
            log("Player is not in a car, cannot enable Tesla mode");
            wait(1000);
            continue;
        }
        setMode(!teslaModeEnabled);
        wait(1000);
    }

    // If the player is in a car and tesla mode is enabled, we will start the self-drive logic
    if (getPlayerChar().isInAnyCar() && teslaModeEnabled) {
        // This is the main logic for the self-drive tick
        const waypointCoords = getWaypointCoords();

        if (!waypointCoords) {
            log("No waypoint found");
            cleanupNextDrivingPointBlip();
            continue;
        }

        currentDestination = getDriveableCarNodeFromCoords(waypointCoords);

        const distanceToDestination = getDistanceBetweenTwoVectors(
            getPlayerChar().getCoordinates(),
            currentDestination
        );


        const currentVehicle = getPlayerCurrentVehicle();
        const currentDriver = currentVehicle?.getDriver();

        if (!currentDriver || !Char.DoesExist(currentDriver)) {
            log("No driver found in the current vehicle");
            showTextBox("No driver found in the current vehicle");
            setMode(false, false);
            freeVehicleDrivers();
            Task.LeaveAnyCar(getPlayerChar());

            continue;
        }

        const eta = getETA(distanceToDestination, currentVehicle.getSpeed());
        log(`Distance to destination ${distanceToDestination.toFixed(0)} meters. ${eta}`);

        driveToCoords(currentDriver, currentVehicle, currentDestination, drivingSpeed, obeyLaws);
        updateNextDrivingPointBlip(currentDestination);
        wait(10000); // check again every 10 seconds
    }

    // If the player has arrived at the destination, we will stop the self-drive logic
    if (currentDestination && getPlayerChar().isInAnyCar()) {
        const distanceToDestination = getDistanceBetweenTwoVectors(
            getPlayerChar().getCoordinates(),
            currentDestination
        )

        if (distanceToDestination <= 20) {
            showTextBox("You have arrived at your destination");
            cleanupNextDrivingPointBlip();
            currentDestination = null;

            cleanupTestBlips();
            setMode(false, false)

            const currentVehicle = getPlayerChar().getCarIsUsing();

            if (currentVehicle) {
                currentVehicle.getDriver().clearTasks();
                Task.StandStill(currentVehicle.getDriver(), 1000);
            }

            wait(1000);
            Task.LeaveAnyCar(getPlayerChar());
        }
    }

    // if the player is not in a car and tesla mode is enabled, we will stop the self-drive logic
    if (!getPlayerChar().isInAnyCar() && teslaModeEnabled) {
        showTextBox("You are not in a car, stopping Tesla mode");
        cleanupNextDrivingPointBlip();
        cleanupTestBlips();
        setMode(false, false);
    }
}

function updateNextDrivingPointBlip(destination: Vector3) {
    if (nextDrivingPointBlip && Blip.DoesExist(nextDrivingPointBlip.valueOf() as number)) {
        nextDrivingPointBlip.remove();
    }

    nextDrivingPointBlip = createBlip(destination, BlipColors.Yellow, "Tesla mode destination");
    nextDrivingPointBlip.setRoute(true);
    nextDrivingPointBlip.setAsFriendly(true);
    nextDrivingPointBlip.setAsShortRange(true)
}

function cleanupNextDrivingPointBlip() {
    if (nextDrivingPointBlip && Blip.DoesExist(nextDrivingPointBlip.valueOf() as number)) {
        nextDrivingPointBlip.remove();
        nextDrivingPointBlip = null;
    }
}

function setMode(isEnabled: boolean, displayText: boolean = true) {
    if (!isEnabled) {
        currentDestination = null;
        cleanupTestBlips();
        cleanupNextDrivingPointBlip();
        nextDrivingPointBlip && nextDrivingPointBlip.remove();
        freeVehicleDrivers();
    }

    displayText && showTextBox(`Tesla Mode : ${isEnabled ? "Enabled" : "Disabled"}`);

    teslaModeEnabled = isEnabled;
}

function freeVehicleDrivers() {
    const playerChar = getPlayerChar();
    playerChar.clearTasks();
    playerChar.clearSecondaryTask();
    playerChar.setKeepTask(false);

    const currentVehicle = getPlayerCurrentVehicle();

    if (currentVehicle && Car.DoesExist(currentVehicle)) {
        const driver = currentVehicle.getDriver();
        if (driver && Char.DoesExist(driver) && driver !== playerChar) {
            driver.clearTasks();
            Task.StandStill(driver, 1000);
            Task.CarDriveWander(driver, currentVehicle, 10000, 1);
        }
    }
}