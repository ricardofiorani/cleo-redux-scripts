/**
 * This script allows you to enable a self-driving mode for the player's vehicle.
 * It will drive the vehicle to the waypoint set by the player.
 * Press J to toggle the self-driving mode. (Might need to keep it pressed for around 10 seconds to disable it)
 *
 * Also works when the player is a passenger in a vehicle.
 *
 * If you set disableWhenNotInCar = false , then you can ragdoll in the back of any vehicle that it will take you to the waypoint.
 */

import {Key} from "../.config/enums";
import {BlipColors, cleanupTestBlips, createBlip} from "../libs/blips";
import {
    getCarThatCharIsTouching,
    getDistanceBetweenTwoVectors,
    getETA,
    isTouchingAnyCar,
} from "../libs/utils";
import {getDriveableCarNodeFromCoords} from "../libs/world";
import {getPlayer, getPlayerChar, getPlayerCurrentVehicle, isPlayerInAnyCar} from "../libs/player";
import {driveToCoords} from "../libs/vehicle";
import {getWaypointCoords, isWaypointSet} from "../libs/waypoint";
import {DrivingStyle} from "../libs/driving";

const debug = true;

let teslaModeEnabled = false;
let currentDestination: Vector3 = null;
let nextDrivingPointBlip: Blip | null = null;

const maxEtaPatience = 3; // Max ETA patience in minutes before the car starts ignoring traffic laws
const drivingSpeed = 40; // Speed in miles
const disableWhenNotInCar = false; // If true, the mode will disable itself when the player is not in a car

// For calculating ETA
const recentSpeeds: number[] = [];
const MAX_RECENT_SPEEDS = 10;

while (true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.J)) {
        if (!isPlayerInAnyCar() && disableWhenNotInCar) {
            showTextBox("You must be in a car to enable Tesla mode");
            log("Player is not in a car, cannot enable Tesla mode");
            wait(1000);
            continue;
        }
        setMode(!teslaModeEnabled);
        wait(1000);
    }

    if (isWaypointSet()) {
        const waypointCoords = getWaypointCoords();
        currentDestination = getDriveableCarNodeFromCoords(waypointCoords);
    } else {
        currentDestination = null;
        cleanupNextDrivingPointBlip();
        continue;
    }

    // If the player is in a car and tesla mode is enabled, we will start the self-drive logic
    if (teslaModeEnabled && getPlayerChar().isInAnyCar()) {
        const currentVehicle = getPlayerCurrentVehicle();
        const currentDriver = currentVehicle?.getDriver();

        if (!currentDriver || !Char.DoesExist(currentDriver) && disableWhenNotInCar) {
            log("No driver found in the current vehicle");
            showTextBox("No driver found in the current vehicle");
            setMode(false, false);
            freeVehicleDrivers();
            Task.LeaveAnyCar(getPlayerChar());

            continue;
        }

        sendDriverTo(currentDriver, currentVehicle, currentDestination);
    } else if (teslaModeEnabled && !getPlayerChar().isInAnyCar() && isTouchingAnyCar(getPlayerChar())) {
        const car = getCarThatCharIsTouching(getPlayerChar());

        if (!car || !Car.DoesExist(car)) {
            log("No car found that the player is touching");
            continue;
        }

        const driver = car.getDriver();

        log(`Player is touching a car, sending the driver to the destination`);
        if (Char.DoesExist(driver)) {
            sendDriverTo(driver, car, currentDestination);
        }
    } else if (!getPlayerChar().isInAnyCar() && teslaModeEnabled && disableWhenNotInCar) {
        showTextBox("You are not in a car, stopping Tesla mode");
        cleanupNextDrivingPointBlip();
        cleanupTestBlips();
        setMode(false, false);
    }

    if (!currentDestination || !teslaModeEnabled) {
        continue;
    }

    const distanceToDestination = getDistanceBetweenTwoVectors(
        getPlayerChar().getCoordinates(),
        currentDestination
    )

    // If the player is close enough to the destination, we will stop the self-drive logic
    if (distanceToDestination <= 40) {
        showTextBox("You have arrived at your destination");
        cleanupNextDrivingPointBlip();
        currentDestination = null;

        cleanupTestBlips();
        setMode(false, false)

        const currentVehicle = getPlayerChar().getCarIsUsing();

        if (currentVehicle && Car.DoesExist(currentVehicle)) {
            const driver = currentVehicle.getDriver();
            if (driver && Char.DoesExist(driver) && driver.valueOf() !== getPlayerChar().valueOf()) {
                log(`distanceToDestination <= 40 - Cleaning tasks for driver ${driver.valueOf()}`);
                driver.clearTasks();
                Task.StandStill(driver, 1000);
            }
        }

        wait(1000);
        Task.LeaveAnyCar(getPlayerChar());
    }
}

function sendDriverTo(currentDriver: Char, currentVehicle: Car, destination: Vector3) {
    recordSpeed(currentVehicle.getSpeed());

    const distanceToDestination = getDistanceBetweenTwoVectors(
        getPlayerChar().getCoordinates(),
        destination
    );
    const eta = getETA(distanceToDestination, getAverageSpeed());
    const etaInMinutes = Math.floor(eta.seconds / 60);

    const drivingStyle: DrivingStyle = DrivingStyle.IgnoreTrafficDriveAround;

    log(`Distance to destination ${distanceToDestination.toFixed(0)} meters. ${eta.toString()}`);

    driveToCoords(currentDriver, currentVehicle, destination, drivingSpeed, drivingStyle);
    debug && updateNextDrivingPointBlip(destination); // Debugging blip

    wait(10000); // check again every 10 seconds
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
    log("Freeing vehicle drivers");
    const playerChar = getPlayerChar();
    // playerChar.clearTasks();
    // playerChar.clearSecondaryTask();
    playerChar.setKeepTask(false);
    const currentVehicle = getPlayerCurrentVehicle();
    Task.LeaveCarImmediately(getPlayerChar(), currentVehicle);

    if (currentVehicle && Car.DoesExist(currentVehicle)) {
        const driver = currentVehicle.getDriver();
        if (driver && Char.DoesExist(driver) && driver.valueOf() !== playerChar.valueOf() && !driver.isDead()) {
            log(`freeVehicleDrivers - Cleaning tasks for driver ${driver.valueOf()}`);
            driver.clearTasks();
            Task.StandStill(driver, 1000);
            Task.CarDriveWander(driver, currentVehicle, 10000, 1);
        }
    }
}

function recordSpeed(speed: number) {
    recentSpeeds.push(speed);
    if (recentSpeeds.length > MAX_RECENT_SPEEDS) {
        recentSpeeds.shift(); // FIFO
    }
}

function getAverageSpeed(): number {
    if (recentSpeeds.length === 0) {
        return drivingSpeed * 0.44704; // mph to m/s fallback
    }
    const sum = recentSpeeds.reduce((a, b) => a + b, 0);
    return sum / recentSpeeds.length;
}
