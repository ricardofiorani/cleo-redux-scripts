import {getPlayer, getPlayerChar} from "./libs/player";
import {Key} from ".config/enums";
import {getDistanceBetweenTwoVectors} from "./libs/utils";
import {safeRemoveBlip} from "./libs/blips";
import {getPedModelName} from "./libs/models";

const debugEnabled = true;
const baseDistance = 200; // base meters distance for passenger spawn and destination
let distanceMultiplier = 1;

let isTaxiMissionActive = false;
let currentPassenger: Char = null;
let currentPassengerDestination: Vector3 = null;
let currentPassengerBlip: Blip = null;
let currentDestinationBlip: Blip = null;
let lastLocation: Vector3 = null; // stores {x,y,z} of last dropoff or mission start

const debug: typeof log = (...values: any[]) => {
    if (debugEnabled) {
        log(...values);
    }
};

// Generate a random point around center at approx distance with some random offset
function getRandomPointAround(center, minDistance, maxDistance) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);

    const x = center.x + Math.cos(angle) * distance;
    const y = center.y + Math.sin(angle) * distance;
    const z = center.z; // keep same height (or you could do raycast for ground)

    return {x, y, z};
}

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

function startTaxiMission() {
    debug("Starting taxi mission...");
    const player = getPlayerChar();

    if (!lastLocation) {
        const {x, y, z} = player.getCoordinates();
        lastLocation = {x, y, z};
    }

    debug(`Last location: ${lastLocation.x.toFixed(2)}, ${lastLocation.y.toFixed(2)}, ${lastLocation.z.toFixed(2)}`);

    const nextMissionDistance = Math.random() * (baseDistance * distanceMultiplier) + baseDistance * distanceMultiplier;

    log(`Taxi mission starting with distance: ${nextMissionDistance}`);

    // Passenger spawn point is between baseDistance*distanceMultiplier and baseDistance*distanceMultiplier*1.5 meters away from lastLocation
    currentPassenger = findPassengerAround(lastLocation, nextMissionDistance);
    debug(`Passenger found: ${currentPassenger ? currentPassenger.valueOf() : 'none'} (Model: ${getPedModelName(currentPassenger.getModel())})`);

    // Destination point is even farther away, say between 1.5x and 2.5x distanceMultiplier * baseDistance
    currentPassengerDestination = Path.GetRandomCarNode(
        lastLocation.x,
        lastLocation.y,
        lastLocation.z,
        nextMissionDistance * 1.5,
        false,
        false,
        false
    );

    safeRemoveBlip(currentPassengerBlip);
    safeRemoveBlip(currentDestinationBlip);

    currentPassengerBlip = Blip.AddForChar(currentPassenger);

    showTextBox('Pick up the passenger!');
    debug("Taxi mission started with increasing distances.");
}

function updateTaxiMission() {
    // TODO: Throw error here if currentPassenger is null
    if (!currentPassenger) return;

    const player = getPlayerChar();
    const playerVehicle = player.getCarIsUsing();

    // Step 1: Picking up passenger
    while (Char.DoesExist(currentPassenger) && player.isInTaxi() && !currentPassenger.isInAnyCar()) {
        // debug(`Checking passenger pickup...`);
        const distanceToPassenger = getDistanceBetweenTwoVectors(player.getCoordinates(), currentPassenger.getCoordinates());

        if (distanceToPassenger <= 10 && playerVehicle.isStopped()) {

            // TODO: Check if the seat index is correct for the taxi
            const taxiPassengerSeatIndex = 3;
            Task.EnterCarAsPassenger(currentPassenger, playerVehicle, 4000, taxiPassengerSeatIndex);
            showTextBox("Passenger getting in... Drive them to the destination!");
            wait(4000); // Wait for passenger to get in
        }

        wait(100);
    }

    // Step 2: Setup to drive to destination
    if (!Char.DoesExist(currentPassenger) || !player.isInTaxi() || !currentPassenger.isInTaxi()) {
        return;
    }

    safeRemoveBlip(currentPassengerBlip);
    safeRemoveBlip(currentDestinationBlip);
    currentDestinationBlip = Blip.AddForCoord(currentPassengerDestination.x, currentPassengerDestination.y, currentPassengerDestination.z);

    // Step 3: Driving to destination
    while (Char.DoesExist(currentPassenger) && player.isInTaxi() && currentPassenger.isInTaxi()) {
        // debug(`Driving to destination...`);
        const distanceToDestination = getDistanceBetweenTwoVectors(player.getCoordinates(), currentPassengerDestination);

        // Check arrival within 10 meters
        if (distanceToDestination < 10 && playerVehicle.isStopped()) {
            Task.LeaveCarImmediately(currentPassenger, playerVehicle);
            showTextBox("You have arrived at the destination! Let the passenger out.");
            completeTaxiMission();
            wait(4000);
        }

        wait(100);
    }
}

function completeTaxiMission() {
    const fareMin = 25;
    const fareMax = 100;
    const fare = Math.floor(Math.random() * (fareMax - fareMin + 1)) + fareMin;
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
        if(currentPassenger.isInAnyCar()) {
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

    isTaxiMissionActive = false;
}

// ===== MAIN LOOP =====
while (true) {
    wait(100);

    const player = getPlayerChar();

    if (player.isGettingInToACar() && player.isInTaxi()) {
        let promptShown = false;

        while (player.isInTaxi()) {
            wait(100);

            if (!isTaxiMissionActive && !promptShown) {
                showTextBox('Press E to start taxi mission');
                promptShown = true;
            }

            // Activate a taxi mission
            if (Pad.IsGameKeyboardKeyPressed(Key.E) && !isTaxiMissionActive) {
                isTaxiMissionActive = true;
                startTaxiMission();
                showTextBox('Taxi mission started!!! Go pick up the passenger!');
                wait(1000);
            }

            if (isTaxiMissionActive) {
                updateTaxiMission();
            }
        }

        if (isTaxiMissionActive) {
            showTextBox('Taxi mission failed. You left the taxi.');
            debug("Player left taxi, mission failed.");
            isTaxiMissionActive = false;
            if (currentPassenger) currentPassenger.delete();
            if (currentPassengerBlip) currentPassengerBlip.remove();
            if (currentDestinationBlip) currentDestinationBlip.remove();
        }
    }
}
