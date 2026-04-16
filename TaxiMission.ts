import { getPlayer, getPlayerChar, isPlayerDrivingAnyCar } from "./libs/player";
import { Key } from ".config/enums";
import { getDistanceBetweenTwoVectors } from "./libs/utils";
import { safeRemoveBlip } from "./libs/blips";
import { getPedModelName } from "./libs/models";
import { getVoiceFileByHex } from "./libs/taxiPeds";

/**
 * Debug System
 */
const debugEnabled = true;
// CLEO.debug.trace(debugEnabled) // Uncomment if available in your SDK
const debug: typeof log = (...values: any[]) => {
    if (debugEnabled) {
        log(...values);
    }
};

/**
 * Taxi Mission State Enum
 */
export enum TaxiMissionState {
    Idle,       // Not active
    TakingFare, // Spawning or finding passenger
    Completed,  // Fare finished successfully
    Failed,     // Mission failed (e.g. passenger died, player left taxi)
}

// Global State Variables
let missionState: TaxiMissionState = TaxiMissionState.Idle;
let distanceMultiplier = 1;
let currentPassenger: Char | null = null;
let currentPassengerDestination: Vector3 | null = null;
let currentPassengerBlip: Blip | null = null;
let currentDestinationBlip: Blip | null = null;
let lastLocation: Vector3 | null = null; // Stores {x,y,z} of last dropoff or mission start

/**
 * Find a random passenger within a specific radius.
 */
function findPassengerAround(point: Vector3, searchRange = 10): Char | null {
    const pedId = native<int>("GET_RANDOM_CHAR_IN_AREA_OFFSET_NO_SAVE", point.x, point.y, point.z, searchRange, searchRange, searchRange);

    if (!pedId || !Char.DoesExist(pedId)) {
        debug(`No ped found at ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`);
        return null;
    }

    const pedFound = new Char(pedId);

    // Ensure the ped is a mission character to prevent random spawns from interfering
    pedFound.setAsMissionChar();

    const model = pedFound.getModel();
    debug(`Passenger found at ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)} (Model: ${getPedModelName(model)})`);

    return pedFound;
}

/**
 * Get a random point at a specific distance from an origin.
 */
function getRandomPointAtDistance(origin: Vector3, distance: number): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;

    return {
        x: origin.x + offsetX,
        y: origin.y + offsetY,
        z: origin.z // Keep same height (ground level usually works best for spawns)
    };
}

/**
 * Start a new Taxi Mission.
 */
function startTaxiMission(): boolean {
    debug("Starting taxi mission...");
    const player = getPlayerChar();

    if (!lastLocation) {
        lastLocation = player.getCoordinates();
    }

    debug(`Last location: ${lastLocation.x.toFixed(2)}, ${lastLocation.y.toFixed(2)}, ${lastLocation.z.toFixed(2)}`);

    // Calculate next mission distance based on multiplier
    const nextMissionDistance = getNextMissionDistance(distanceMultiplier);
    debug(`Taxi mission starting with distance: ${nextMissionDistance}`);

    let attemptCount = 0;
    const maxAttempts = 100;
    const baseSearchRadius = 50;

    // Loop until a valid passenger is found
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

    debug(`Passenger found: ${currentPassenger ? currentPassenger.valueOf() : 'none'}`);

    // Set destination node (ensure we have a valid point)
    const point = getRandomPointAtDistance(lastLocation, nextMissionDistance);

    if (!point || !Path.GetNextClosestCarNode) {
        debug("Failed to get destination node.");
        return false;
    }

    currentPassengerDestination = Path.GetNextClosestCarNode(point.x, point.y, point.z);

    // Cleanup old blips before creating new ones
    safeRemoveBlip(currentPassengerBlip);
    if (currentDestinationBlip) {
        safeRemoveBlip(currentDestinationBlip);
    }

    currentPassengerBlip = Blip.AddForChar(currentPassenger);
    currentPassengerBlip.setRoute(true);

    showTextBox('Pick up the passenger!');

    return true;
}

/**
 * Determine which side of the vehicle the passenger is on (Left/Right).
 */
function getTaxiHailDirection(passenger: Char, vehicle: Car): "HAIL_LEFT" | "HAIL_RIGHT" {
    const direction = getTaxiDirectionReference(passenger, vehicle);
    return direction === 1 ? "HAIL_LEFT" : "HAIL_RIGHT";
}

/**
 * Get the side reference (1=Left, 2=Right) and a valid seat index.
 */
function getTaxiDirectionReference(passenger: Char, vehicle: Car): number {
    const passengerPos = passenger.getCoordinates();
    const vehiclePos = vehicle.getCoordinates();

    // Vector from vehicle to passenger (only in 2D plane)
    const dx = passengerPos.x - vehiclePos.x;
    const dy = passengerPos.y - vehiclePos.y;

    // Angle in degrees from vehicle to passenger
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // Vehicle's forward heading in degrees
    let vehicleHeading = vehicle.getHeading();
    if (vehicleHeading < 0) vehicleHeading += 360;

    // Relative angle between vehicle's heading and passenger position
    let relativeAngle = angle - vehicleHeading;
    if (relativeAngle < 0) relativeAngle += 360;

    // Determine side: 1 for Left, 2 for Right
    const side = (relativeAngle > 0 && relativeAngle < 180) ? 1 : 2;

    return side;
}

/**
 * Main Taxi Mission Loop. Handles pickup and dropoff logic.
 */
function taxiMissionMainLoop() {
    if (!currentPassenger || !Char.DoesExist(currentPassenger)) return;

    // Request Animations for Hail
    native("REQUEST_ANIMS", "AMB@TAXI_HAIL_M");
    native("REQUEST_ANIMS", "AMB@TAXI_HAIL_F");

    while (!native("HAVE_ANIMS_LOADED", "AMB@TAXI_HAIL_M") || !native("HAVE_ANIMS_LOADED", "AMB@TAXI_HAIL_F")) {
        wait(100);
    }

    const player = getPlayerChar();
    const playerVehicle = player.getCarIsUsing();

    // Helper to check basic mission validity
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
    };

    let taxiHailAnimationPlayed = false;
    const distanceForReaction = 30;

    // Step 1: Picking up passenger
    while (Char.DoesExist(currentPassenger) && player.isInTaxi() && !currentPassenger.isInAnyCar() && missionState !== TaxiMissionState.Failed) {
        const distanceToPassenger = getDistanceBetweenTwoVectors(player.getCoordinates(), currentPassenger.getCoordinates());

        if (!passBasicChecks()) {
            missionState = TaxiMissionState.Failed;
            return;
        }

        // Make them look at the taxi and yell something when close enough
        if (distanceToPassenger <= 10 && !currentPassenger.isInAnyCar() && !taxiHailAnimationPlayed) {
            const hailDirection = getTaxiHailDirection(currentPassenger, playerVehicle);
            const animationDictionary = currentPassenger.isMale() ? "AMB@TAXI_HAIL_M" : "AMB@TAXI_HAIL_F";

            Task.TaskLookAtVehicle(currentPassenger, playerVehicle, 2000, 0);
            currentPassenger.sayAmbientSpeech('TAXI_HAIL', false, false, false);

            // Play Hail Animation
            Task.PlayAnim(currentPassenger, hailDirection, animationDictionary, 8.00000000, false, true, true, false, -2);
            taxiHailAnimationPlayed = true;
        }

        if (distanceToPassenger <= distanceForReaction && playerVehicle.isStopped()) {
            // Validate passenger seat index before entering car
            const taxiSide = getTaxiDirectionReference(currentPassenger, playerVehicle);

            // Map side to a valid seat index (-1 for any free seat is safest)
            // 0=Front Left, 1=Back Left, 2=Front Right, 3=Back Right (approximate GTA IV layout)
            const taxiSeatIndex = -1;

            Task.EnterCarAsPassenger(currentPassenger, playerVehicle, 5000, taxiSeatIndex);
            showTextBox("Passenger getting in... Drive them to the destination!");
            wait(5000); // Wait for passenger to get in
        }

        wait(100);
    }

    // Step 2: Setup to drive to destination (after pickup)
    if (!Char.DoesExist(currentPassenger) || !player.isInTaxi() || !currentPassenger.isInTaxi()) {
        missionState = TaxiMissionState.Failed;
        return;
    }

    safeRemoveBlip(currentPassengerBlip);
    if (currentDestinationBlip) {
        safeRemoveBlip(currentDestinationBlip);
    }

    // Ensure destination is set before creating blip
    if (!currentPassengerDestination) {
        debug("No destination found for dropoff.");
        return;
    }

    currentDestinationBlip = Blip.AddForCoord(currentPassengerDestination.x, currentPassengerDestination.y, currentPassengerDestination.z);
    currentDestinationBlip.setRoute(true);

    currentPassenger.sayAmbientSpeech('TAXI_START', true, true, false);

    // Step 3: Driving to destination
    while (Char.DoesExist(currentPassenger) && player.isInTaxi() && currentPassenger.isInTaxi() && missionState !== TaxiMissionState.Failed) {
        const distanceToDestination = getDistanceBetweenTwoVectors(player.getCoordinates(), currentPassengerDestination);

        if (!passBasicChecks()) {
            return;
        }

        // Check arrival within distanceForReaction
        if (distanceToDestination < distanceForReaction && playerVehicle.isStopped()) {
            const distanceTravelled = getDistanceBetweenTwoVectors(lastLocation, player.getCoordinates());

            currentPassenger.sayAmbientSpeech('TAXI_SUCCESS', true, true, false);
            Task.LeaveCarImmediately(currentPassenger, playerVehicle);
            showTextBox("You have arrived at the destination! Let the passenger out.");
            completeTaxiMission(distanceTravelled);
            wait(4000);
        }

        wait(100);
    }
}

/**
 * Calculate fare based on distance.
 */
function calculateFare(distanceMeters: number): number {
    const BASE_FARE = 2.50; // initial charge
    const ONE_FIFTH_MILE_METERS = 1609.344 / 5; // ~321.87 meters
    const PER_SEGMENT_RATE = 0.40;

    // Cap at GTA IV inland limit (approximate)
    const MAP_MAX_METERS = 6500;
    const adjustedDistance = Math.min(distanceMeters, MAP_MAX_METERS);

    // Calculate distance charge in 1/5 mile increments
    const segments = adjustedDistance / ONE_FIFTH_MILE_METERS;
    const distanceCharge = segments * PER_SEGMENT_RATE;

    const total = BASE_FARE + distanceCharge;
    return Math.round(total * 100) / 100; // round to cents
}

/**
 * Complete the Taxi Mission.
 */
function completeTaxiMission(distanceTravelled: number) {
    if (!currentPassengerDestination || !lastLocation) {
        debug("Missing location data for fare calculation.");
        return;
    }

    const fare = calculateFare(distanceTravelled);
    getPlayer().addScore(fare);

    showTextBox(`Passenger dropped off! You earned $${fare}`);
    debug(`Mission complete. Fare: $${fare}`);

    // Update last location to drop-off
    lastLocation = { ...currentPassengerDestination };

    // Increase distance multiplier for next fare (makes missions longer over time)
    distanceMultiplier++;

    // Clean up passenger and blips
    if (currentPassenger && Char.DoesExist(currentPassenger)) {
        currentPassenger.markAsNoLongerNeeded();
        if (currentPassenger.isInAnyCar()) {
            Task.LeaveAnyCar(currentPassenger);
            Task.WanderStandard(currentPassenger);
        }
        currentPassenger = null; // Clear reference
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

/**
 * Calculate next mission distance based on multiplier.
 */
function getNextMissionDistance(distanceMultiplier: number): number {
    const step = 100; // distance step in meters
    const minDistance = 200; // minimum distance for the first fare

    const min = minDistance + (distanceMultiplier - 1) * step;
    const max = min + step; // small spread so it's "around" the min
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== MAIN LOOP =====
try {
    while (true) {
        wait(100);

        const player = getPlayerChar();

        // Only run taxi logic if driving a car and inside the taxi
        if (isPlayerDrivingAnyCar() && player.isInTaxi()) {
            let promptShown = false;

            while (player.isInTaxi()) {
                wait(100);

                if (missionState === TaxiMissionState.Idle && !promptShown) {
                    showTextBox('Press E to work as a taxi driver.');
                    promptShown = true;
                }

                // Activate a taxi mission
                if (Pad.IsGameKeyboardKeyPressed(Key.E) && missionState === TaxiMissionState.Idle) {
                    missionState = TaxiMissionState.TakingFare;
                    showTextBox('Taxi driver mission started! Searching for a passenger...');

                    if (startTaxiMission()) {
                        wait(1000);
                    } else {
                        debug("Failed to start taxi mission after pressing E.");
                    }
                }

                // Run the main loop logic for pickup/dropoff
                if (missionState === TaxiMissionState.TakingFare) {
                    taxiMissionMainLoop();

                    // @ts-ignore
                    if (missionState === TaxiMissionState.Completed) {
                        // Wait 3 seconds before starting next fare
                        wait(3000);

                        if (player.isInTaxi()) {
                            missionState = TaxiMissionState.TakingFare;
                            if (startTaxiMission()) {
                                showTextBox('Next fare found! Go pick up the passenger!');
                                wait(1000);
                            }
                        } else {
                            // Player left car after completion, reset state
                            debug("Player left taxi after completing mission.");
                            missionState = TaxiMissionState.Idle;
                        }
                    }
                }

                // @ts-ignore
                if (missionState === TaxiMissionState.Failed) {
                    showTextBox('Taxi mission failed. You left the taxi.');
                    debug("Player left taxi, mission failed.");

                    // Cleanup on failure
                    if (currentPassenger && Char.DoesExist(currentPassenger)) {
                        currentPassenger.markAsNoLongerNeeded();
                        Task.WanderStandard(currentPassenger);
                        currentPassenger.sayAmbientSpeech('TAXI_BAIL', true, true, false);
                    }

                    if (currentPassengerBlip) {
                        currentPassengerBlip.remove();
                        currentPassengerBlip = null;
                    }
                    if (currentDestinationBlip) {
                        currentDestinationBlip.remove();
                        currentDestinationBlip = null;
                    }

                    // Reset multiplier on failure to keep missions manageable
                    distanceMultiplier = 1;
                    missionState = TaxiMissionState.Idle;
                }
            }

            if (missionState === TaxiMissionState.Failed) {
                debug("Outer loop detected failure state.");
            }
        } else {
            // If not in taxi, reset state to Idle if currently active
            if (missionState !== TaxiMissionState.Idle && missionState !== TaxiMissionState.Completed) {
                debug(`Player exited vehicle. Resetting from ${missionState} to Idle.`);
                missionState = TaxiMissionState.Idle;

                // Cleanup on exit
                if (currentPassenger && Char.DoesExist(currentPassenger)) {
                    currentPassenger.markAsNoLongerNeeded();
                    Task.WanderStandard(currentPassenger);
                    currentPassenger.sayAmbientSpeech('TAXI_BAIL', true, true, false);
                }

                if (currentPassengerBlip) {
                    currentPassengerBlip.remove();
                    currentPassengerBlip = null;
                }
                if (currentDestinationBlip) {
                    currentDestinationBlip.remove();
                    currentDestinationBlip = null;
                }
            }
        }
    }
} catch (error) {
    log("Error in TaxiMission script:", error);
    showTextBox("An error occurred in the Taxi Mission script. Please check the logs.");
}
