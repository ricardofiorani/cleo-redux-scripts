import {getPlayer, getPlayerChar, isPlayerDrivingAnyCar} from "./libs/player";
import {Key} from ".config/enums";
import {getDistanceBetweenTwoVectors} from "./libs/utils";
import {safeRemoveBlip} from "./libs/blips";
import {getPedModelName} from "./libs/models";

/**
 * Debug
 */
const debugEnabled = true;
// CLEO.debug.trace(debugEnabled)
const debug: typeof log = (...values: any[]) => {
    if (debugEnabled) {
        log(...values);
    }
};

/**
 * Taxi Mission State
 */
export enum TaxiMissionState {
    Idle,       // Not active
    TakingFare, // Spawning or finding passenger
    Completed,  // Fare finished successfully
    Failed,     // Mission failed (e.g. passenger died, player left taxi)
}

let missionState: TaxiMissionState = TaxiMissionState.Idle;

/**
 * Configuration
 */
let distanceMultiplier = 1;
let currentPassenger: Char = null;
let currentPassengerDestination: Vector3 = null;
let currentPassengerBlip: Blip = null;
let currentDestinationBlip: Blip = null;
let lastLocation: Vector3 = null; // stores {x,y,z} of last dropoff or mission start


function findPassengerAround(point: Vector3, searchRange = 10): Char | null {
    const pedFound = new Char(native<int>("GET_RANDOM_CHAR_IN_AREA_OFFSET_NO_SAVE", point.x, point.y, point.z, searchRange, searchRange, searchRange));

    if (!pedFound || !Char.DoesExist(pedFound)) {
        debug(`No ped found at ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`);
        return null;
    }

    Task.StandStill(pedFound, -2);
    pedFound.setAsMissionChar();
    debug(`Passenger found at ${pedFound.getCoordinates().x.toFixed(2)}, ${pedFound.getCoordinates().y.toFixed(2)}, ${pedFound.getCoordinates().z.toFixed(2)}`);

    return pedFound;
}

function getRandomPointAtDistance(
    origin: Vector3,
    distance: number
) {
    // Pick a random angle in radians
    const angle = Math.random() * Math.PI * 2;

    // Offset using cosine/sine for a flat 2D circle
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;

    return {
        x: origin.x + offsetX,
        y: origin.y + offsetY,
        z: origin.z // Keep same height
    };
}

function startTaxiMission(): boolean {
    debug("Starting taxi mission...");
    const player = getPlayerChar();

    if (!lastLocation) {
        lastLocation = player.getCoordinates()
    }

    debug(`Last location: ${lastLocation.x.toFixed(2)}, ${lastLocation.y.toFixed(2)}, ${lastLocation.z.toFixed(2)}`);

    const nextMissionDistance = getNextMissionDistance(distanceMultiplier);

    debug(`Taxi mission starting with distance: ${nextMissionDistance}`);

    // Passenger spawn point is between baseDistance*distanceMultiplier and baseDistance*distanceMultiplier*1.5 meters away from lastLocation

    let attemptCount = 0;
    const maxAttempts = 100; // Limit attempts to find a passenger
    const baseSearchRadius = 50

    while (!currentPassenger || !Char.DoesExist(currentPassenger)) {
        const searchRadius = (attemptCount * baseSearchRadius) + baseSearchRadius;
        currentPassenger = findPassengerAround(lastLocation, searchRadius);

        debug(`Searching for passenger around in a ${searchRadius} meter radius`);
        wait(1000);
        attemptCount++;

        if (attemptCount >= maxAttempts) {
            debug("Failed to find a passenger after maximum attempts.");
            showTextBox("No passengers found nearby. Try again later.");
            missionState = TaxiMissionState.Failed;
            return false;
        }
    }

    debug(`Passenger found: ${currentPassenger ? currentPassenger.valueOf() : 'none'} (Model: ${getPedModelName(currentPassenger.getModel())})`);

    const point = getRandomPointAtDistance(lastLocation, nextMissionDistance);
    currentPassengerDestination = Path.GetNextClosestCarNode(point.x, point.y, point.z);

    debug(`Found destination ${getDistanceBetweenTwoVectors(currentPassengerDestination, currentPassenger.getCoordinates()).toFixed(2)} meters away from passenger (should be around ${nextMissionDistance} meters)`);

    safeRemoveBlip(currentPassengerBlip);
    safeRemoveBlip(currentDestinationBlip);

    currentPassengerBlip = Blip.AddForChar(currentPassenger);
    currentPassengerBlip.setRoute(true);

    showTextBox('Pick up the passenger!');
    debug("Taxi mission started with increasing distances.");

    return true
}

function taxiMissionMainLoop() {
    // TODO: Throw error here if currentPassenger is null
    if (!currentPassenger) return;

    const player = getPlayerChar();
    const playerVehicle = player.getCarIsUsing();

    const passBasicChecks = (): boolean => {
        if (!currentPassenger || currentPassenger.isDead()) {
            debug("Passenger is dead, mission failed.");
            showTextBox("The passenger is dead. Mission failed.");
            return false;
        }

        if (!currentPassenger.isHealthGreater(40)) {
            debug(`Passenger health is too low, mission failed. (Health: ${currentPassenger.getHealth()})`);
            showTextBox("The passenger is injured. Mission failed.");
            return false;
        }

        if (!Car.DoesExist(playerVehicle) || !playerVehicle.isDriveable() || playerVehicle.isInWater()) {
            debug("Player vehicle is not driveable, mission failed.");
            showTextBox("You wrecked the taxi! Mission failed.");
            return false;
        }

        return true;
    }

    // Step 1: Picking up passenger
    while (Char.DoesExist(currentPassenger) && player.isInTaxi() && !currentPassenger.isInAnyCar()) {
        // debug(`Checking passenger pickup...`);
        const distanceToPassenger = getDistanceBetweenTwoVectors(player.getCoordinates(), currentPassenger.getCoordinates());

        if (!passBasicChecks()) {
            missionState = TaxiMissionState.Failed;
            return;
        }

        if (distanceToPassenger <= 10 && playerVehicle.isStopped()) {
            // TODO: Check if the seat index is correct for the taxi
            const taxiPassengerSeatIndex = Math.random() < 0.5 ? 1 : 2; // Randomly choose between the two seats in the back
            Task.EnterCarAsPassenger(currentPassenger, playerVehicle, -2, taxiPassengerSeatIndex);
            showTextBox("Passenger getting in... Drive them to the destination!");
            wait(4000); // Wait for passenger to get in
        }

        wait(100);
    }

    // Step 2: Setup to drive to destination
    if (!Char.DoesExist(currentPassenger) || !player.isInTaxi() || !currentPassenger.isInTaxi()) {
        missionState = TaxiMissionState.Failed;
        return;
    }

    if (!passBasicChecks()) {
        missionState = TaxiMissionState.Failed;
        return;
    }

    safeRemoveBlip(currentPassengerBlip);
    safeRemoveBlip(currentDestinationBlip);
    currentDestinationBlip = Blip.AddForCoord(currentPassengerDestination.x, currentPassengerDestination.y, currentPassengerDestination.z);
    currentDestinationBlip.setRoute(true);

    // Step 3: Driving to destination
    while (Char.DoesExist(currentPassenger) && player.isInTaxi() && currentPassenger.isInTaxi()) {
        // debug(`Driving to destination...`);
        const distanceToDestination = getDistanceBetweenTwoVectors(player.getCoordinates(), currentPassengerDestination);

        if (!passBasicChecks()) {
            return;
        }

        // Check arrival within 10 meters
        if (distanceToDestination < 10 && playerVehicle.isStopped()) {
            const distanceTravelled = getDistanceBetweenTwoVectors(lastLocation, player.getCoordinates());

            Task.LeaveCarImmediately(currentPassenger, playerVehicle);
            showTextBox("You have arrived at the destination! Let the passenger out.");
            completeTaxiMission(distanceTravelled);
            wait(4000);
        }

        wait(100);
    }
}

function computeTaxiFare(distanceMeters: number): number {
    const BASE_FARE = 15.00; // starting fare in dollars
    const PER_METER_RATE = 0.30
    const MAP_MAX_METERS = 6500; // GTA IV inland cap

    // Apply multiplier before capping to max
    const adjustedDistance = Math.min(distanceMeters, MAP_MAX_METERS);

    const distanceCharge = adjustedDistance * PER_METER_RATE;
    const total = BASE_FARE + distanceCharge;

    return Math.round(total);
}


function completeTaxiMission(distanceTravelled: number) {
    const fare = computeTaxiFare(distanceTravelled);
    getPlayer().addScore(fare);

    showTextBox(`Passenger dropped off! You earned $${fare}.`);
    debug(`Mission complete. Fare: $${fare}`);

    // Update last location to drop-off
    lastLocation = {...currentPassengerDestination};

    // Increase distance multiplier for next fare
    distanceMultiplier++;

    // Clean up
    if (currentPassenger && Char.DoesExist(currentPassenger)) {
        currentPassenger.markAsNoLongerNeeded();
        if (currentPassenger.isInAnyCar()) {
            Task.LeaveAnyCar(currentPassenger);
            Task.WanderStandard(currentPassenger);
        }
        currentPassenger = null;
    }
    if (currentPassengerBlip) {
        currentPassengerBlip.remove();
        currentPassengerBlip = null;
    }
    if (currentDestinationBlip) {
        currentDestinationBlip.remove();
        currentDestinationBlip = null;
    }

    missionState = TaxiMissionState.Completed;
}


//TODO: Implement max distance due to map size
function getNextMissionDistance(distanceMultiplier: number) {
    const step = 100; // distance step in meters
    const minDistance = 200; // minimum distance for the first fare

    const min = minDistance + (distanceMultiplier - 1) * step;
    const max = min + step; // small spread so it’s “around” the min
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== MAIN LOOP =====
// try {
while (true) {
    wait(100);

    const player = getPlayerChar();

    if (isPlayerDrivingAnyCar() && player.isInTaxi()) {
        let promptShown = false;

        while (player.isInTaxi()) {
            wait(100);

            if (missionState === TaxiMissionState.Idle && !promptShown) {
                showTextBox('Press E to work as a taxi driver.');
                promptShown = true;
            }

            // Activate a taxi mission
            // TODO: Use the "action" key instead of E
            if (Pad.IsGameKeyboardKeyPressed(Key.E) && missionState === TaxiMissionState.Idle) {
                missionState = TaxiMissionState.TakingFare;
                showTextBox('Taxi driver mission started! Searching for a passenger...');

                if (startTaxiMission()) {
                    wait(1000);
                }
            }

            if (missionState === TaxiMissionState.TakingFare) {
                taxiMissionMainLoop();

                if (missionState === TaxiMissionState.Completed) {
                    // Wait 3 seconds before starting next fare
                    wait(3000);

                    if (player.isInTaxi()) {
                        missionState = TaxiMissionState.TakingFare;
                        if (startTaxiMission()) {
                            showTextBox('Next fare found! Go pick up the passenger!');
                            wait(1000)
                        }
                    }
                }
            }
        }

        if (missionState === TaxiMissionState.Failed) {
            showTextBox('Taxi mission failed. You left the taxi.');
            debug("Player left taxi, mission failed.");
            missionState = TaxiMissionState.Idle;

            if (currentPassenger && Char.DoesExist(currentPassenger)) {
                currentPassenger.markAsNoLongerNeeded();
                Task.WanderStandard(currentPassenger);
            }

            if (currentPassengerBlip) currentPassengerBlip.remove();
            if (currentDestinationBlip) currentDestinationBlip.remove();
            distanceMultiplier = 1;
        }
    }
}
// } catch (error) {
//     log("Error in TaxiMission script:", error);
//     showTextBox("An error occurred in the Taxi Mission script. Please check the logs.");
// }
