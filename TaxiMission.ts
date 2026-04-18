import {getPlayer, getPlayerChar, isPlayerDrivingAnyCar} from "./libs/player";
import {Key} from "./.config/enums.js";
import {getDistanceBetweenTwoVectors} from "./libs/utils";
import {safeRemoveBlip, BlipColors} from "./libs/blips";
import {getPedModelName} from "./libs/models";
import {getVoiceFileByHex} from "./libs/taxiPeds";

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Mission configuration constants */
const MISSION_CONFIG = {
    // Passenger finding
    BASE_SEARCH_RADIUS: 50,
    MAX_FIND_ATTEMPTS: 100,
    PASSENGER_SPAWN_HEIGHT: 0, // Keep same height as ground level

    // Distance calculation (meters)
    MIN_DISTANCE: 200,
    DISTANCE_STEP: 100,
    MAX_DISTANCE: 6500, // Island limit

    // Fare calculation
    BASE_FARE: 2.50,
    PER_SEGMENT_RATE: 0.40,
    MILE_IN_METERS: 1609.344,
    FIFTH_MILE_METERS: 1609.344 / 5, // ~321.87 meters

    // Tip system
    TIP_BASE_PERCENTAGE: 0.15, // 15% base tip
    TIP_TIME_BONUS_PERCENTAGE: 0.10, // Additional 10% for fast delivery
    TIP_TIME_THRESHOLD_SEC: 120, // Under 2 minutes = time bonus
    DAMAGE_THRESHOLD: 0.80, // Vehicle health below 80% = no tip

    // Reaction distances
    HAUL_DISTANCE: 30,
    PICKUP_DISTANCE: 10,
    ARRIVAL_DISTANCE: 30,

    // Timing (milliseconds)
    PICKUP_WAIT_MS: 5000,
    COMPLETION_DELAY_MS: 4000,
    NEXT_MISSION_DELAY_MS: 3000,
    LOOP_INTERVAL_MS: 100,
    ANIM_LOAD_TIMEOUT: 2000,
    GRACE_PERIOD_MS: 25000, // 25 seconds to re-enter after exiting taxi
} as const;

/** Debug categories for structured logging */
const DebugCategory = {
    MISSION: "MISSION",
    PASSENGER: "PASSENGER",
    MOVEMENT: "MOVEMENT",
    FARE: "FARE",
    STATE: "STATE",
    ERROR: "ERROR",
} as const;

type DebugCategoryKey = keyof typeof DebugCategory;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Taxi Mission State Enum */
export enum TaxiMissionState {
    Idle, // Not active
    TakingFare, // Spawning or finding passenger
    Completed, // Fare finished successfully
    Failed, // Mission failed (e.g. passenger died, player left taxi)
}

/** Mission metrics for performance tracking */
interface MissionMetrics {
    startTime: number;
    pickupTime: number;
    dropoffTime: number;
    totalDistance: number;
    attemptCount: number;
}

/** Passenger mission data */
interface PassengerMissionData {
    passenger: Char | null;
    pickupBlip: Blip | null;
    destinationBlip: Blip | null;
    pickupLocation: Vector3 | null;
    destination: Vector3 | null;
}

// ============================================================================
// DEBUG SYSTEM
// ============================================================================

/** Enable or disable debug output */
const DEBUG_ENABLED = true;

/**
 * Structured debug output with category support
 */
function debugEx(category: DebugCategoryKey, message: string, ...params: any[]): void {
    if (!DEBUG_ENABLED) return;

    const prefix = `[${DebugCategory[category]}]`;
    let formatted = message;

    // Format numeric parameters for readability
    const processedParams = params.map((p) => {
        if (typeof p === "number") {
            return Number.isInteger(p) ? p : p.toFixed(2);
        }
        if (typeof p === "object" && p !== null) {
            if ("x" in p && "y" in p && "z" in p) {
                return `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`;
            }
            return JSON.stringify(p);
        }
        return p;
    });

    if (processedParams.length > 0) {
        formatted += " " + processedParams.join(", ");
    }

    log(`${prefix} ${formatted}`);
}

/**
 * Simple debug alias for backward compatibility
 */
const debug = (message: string, ...params: any[]) => {
    debugEx("MISSION", message, ...params);
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let missionState: TaxiMissionState = TaxiMissionState.Idle;
let distanceMultiplier = 1;
let missionData: PassengerMissionData = {
    passenger: null,
    pickupBlip: null,
    destinationBlip: null,
    pickupLocation: null,
    destination: null,
};
let lastLocation: Vector3 | null = null; // Stores dropoff or mission start
let missionMetrics: MissionMetrics = {
    startTime: 0,
    pickupTime: 0,
    dropoffTime: 0,
    totalDistance: 0,
    attemptCount: 0,
};

// Grace period tracking for when player exits taxi
let gracePeriodStartTime: number = -1;
let wasInGracePeriod: boolean = false;

// Vehicle health tracking for tip calculation
let vehicleHealthAtPickup: number = 1000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a character is valid for pickup
 */
function isValidPassenger(char: Char): boolean {
    if (!char || !Char.DoesExist(char)) {
        return false;
    }

    // Must be on foot (not already in a vehicle)
    if (!char.isOnFoot()) {
        debugEx("PASSENGER", "Char not on foot, skipping");
        return false;
    }

    // Check if already in any car
    if (char.isInAnyCar()) {
        debugEx("PASSENGER", "Char already in car, skipping");
        return false;
    }

    // Check if dead or dying
    if (char.isDead()) {
        debugEx("PASSENGER", "Char is dead, skipping");
        return false;
    }

    // Check health isn't too low
    if (char.getHealth() < 20) {
        debugEx("PASSENGER", "Char health too low, skipping");
        return false;
    }

    return true;
}

/**
 * Find a random passenger within a specific radius with enhanced validation
 */
function findPassengerAround(point: Vector3, searchRange: number): Char | null {
    debugEx("PASSENGER", `Searching for passenger around`, point, `radius: ${searchRange}m`);

    const pedId = native<int>(
        "GET_RANDOM_CHAR_IN_AREA_OFFSET_NO_SAVE",
        point.x,
        point.y,
        point.z,
        searchRange,
        searchRange,
        searchRange
    );


    if (!pedId || !Char.DoesExist(pedId)) {
        debugEx("PASSENGER", "No ped found in area");
        return null;
    }

    const pedFound = new Char(pedId);

    // Validate passenger
    if (!isValidPassenger(pedFound)) {
        debugEx("PASSENGER", `Ped ${pedId} failed validation`);
        // Release the invalid ped
        pedFound.markAsNoLongerNeeded();
        return null;
    }

    // Ensure the ped is a mission character to prevent random spawns from interfering
    pedFound.setAsMissionChar();

    const model = pedFound.getModel();
    debugEx("PASSENGER", `Passenger found: ${getPedModelName(model)} at`, point);

    return pedFound;
}

/**
 * Get a random point at a specific distance from an origin
 */
function getRandomPointAtDistance(origin: Vector3, distance: number): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;

    return {
        x: origin.x + offsetX,
        y: origin.y + offsetY,
        z: origin.z + MISSION_CONFIG.PASSENGER_SPAWN_HEIGHT,
    };
}

/**
 * Get the next closest car node with fallback handling
 */
function getValidCarNode(point: Vector3): Vector3 | null {
    // Try primary method first
    const nodeResult = Path.GetNextClosestCarNode(point.x, point.y, point.z);

    if (nodeResult && (nodeResult.x !== 0 || nodeResult.pResX !== undefined)) {
        return {
            x: nodeResult.x || nodeResult.pResX || point.x,
            y: nodeResult.y || nodeResult.pResY || point.y,
            z: nodeResult.z || nodeResult.pResZ || point.z,
        };
    }

    debugEx("MOVEMENT", "GetNextClosestCarNode failed, trying fallback...");

    // Fallback to GetClosestCarNode
    const fallback = Path.GetClosestCarNode(point.x, point.y, point.z);

    if (fallback && fallback.pResX !== 0) {
        debugEx("MOVEMENT", "Using GetClosestCarNode fallback");
        return {
            x: fallback.pResX,
            y: fallback.pResY,
            z: fallback.pResZ,
        };
    }

    // Another fallback: GetClosestCarNodeWithHeading
    const headingFallback = Path.GetClosestCarNodeWithHeading(point.x, point.y, point.z);

    if (headingFallback && headingFallback.pResX !== 0) {
        debugEx("MOVEMENT", "Using GetClosestCarNodeWithHeading fallback");
        return {
            x: headingFallback.pResX,
            y: headingFallback.pResY,
            z: headingFallback.pResZ,
        };
    }

    debugEx("ERROR", "All path node methods failed");
    return null;
}

/**
 * Determine which side of the vehicle the passenger is on
 */
function getTaxiHailDirection(passenger: Char, vehicle: Car): "HAIL_LEFT" | "HAIL_RIGHT" {
    const direction = getTaxiDirectionReference(passenger, vehicle);
    return direction === 1 ? "HAIL_LEFT" : "HAIL_RIGHT";
}

/**
 * Get the side reference (1=Left, 2=Right)
 * In GTA IV left-hand drive vehicles:
 * - relativeAngle < 180 means passenger is on the RIGHT side of the car
 * - relativeAngle >= 180 means passenger is on the LEFT side of the car
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

    // In GTA IV left-hand drive:
    // - relativeAngle 0-180 = passenger is on RIGHT side of car
    // - relativeAngle 180-360 = passenger is on LEFT side of car
    // So: relativeAngle < 180 returns 2 (Right), else returns 1 (Left)
    return relativeAngle < 180 ? 2 : 1;
}

/**
 * Calculate next mission distance based on multiplier
 */
function getNextMissionDistance(multiplier: number): number {
    const min = MISSION_CONFIG.MIN_DISTANCE + (multiplier - 1) * MISSION_CONFIG.DISTANCE_STEP;
    const max = min + MISSION_CONFIG.DISTANCE_STEP;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate fare with increasing base for subsequent fares
 * First fare ~$30, second ~$40, third ~$50, etc.
 */
function calculateFare(distanceMeters: number): number {
    const adjustedDistance = Math.min(distanceMeters, MISSION_CONFIG.MAX_DISTANCE);

    // Calculate distance charge in 1/5 mile increments
    const segments = adjustedDistance / MISSION_CONFIG.FIFTH_MILE_METERS;
    const distanceCharge = segments * MISSION_CONFIG.PER_SEGMENT_RATE;

    // Base fare increases with fare number ($30, $40, $50, etc.)
    // distanceMultiplier starts at 1, so first fare = $20 + 10*1 = $30
    const baseFareWithMultiplier = 20 + (distanceMultiplier * 10);

    const total = baseFareWithMultiplier + distanceCharge;
    return Math.round(total * 100) / 100; // Round to cents
}

type Tip = {
    amount: number;
    reason: string | null
}

/**
 * Calculate tip based on driving performance (vehicle damage and time)
 * Returns tip amount and reason for no tip if applicable
 */
function calculateTip(fare: number, currentVehicleHealth: number): Tip {
    const maxHealth = 1000;
    const healthPercent = currentVehicleHealth / maxHealth;
    const healthPercentInt = Math.round(healthPercent * 100);

    debugEx("FARE", `Vehicle health: ${currentVehicleHealth}/${maxHealth} = ${healthPercentInt}%`);

    // No tip if vehicle is too damaged
    if (healthPercent < MISSION_CONFIG.DAMAGE_THRESHOLD) {
        const reason = `Vehicle too damaged (${healthPercentInt}% < 80%)`;
        debugEx("FARE", `No tip - ${reason}`);
        showTextBox("No tip: Vehicle was too damaged!");
        return {amount: 0, reason};
    }

    // Calculate time-based bonus
    const tripTimeMs = missionMetrics.dropoffTime > 0
        ? missionMetrics.dropoffTime - missionMetrics.pickupTime
        : 0;
    const tripTimeSec = tripTimeMs / 1000;

    // Base tip (15%)
    let tip = fare * MISSION_CONFIG.TIP_BASE_PERCENTAGE;

    // Time bonus if delivered fast (under 2 minutes)
    if (tripTimeSec < MISSION_CONFIG.TIP_TIME_THRESHOLD_SEC) {
        const timeBonus = fare * MISSION_CONFIG.TIP_TIME_BONUS_PERCENTAGE;
        tip += timeBonus;
        debugEx("FARE", `Fast delivery bonus: +${timeBonus.toFixed(2)} (${tripTimeSec.toFixed(1)}s)`);
        showTextBox(`Fast trip! You earned a ${timeBonus.toFixed(2)} tip bonus!`);
    }

    return {amount: Math.round(tip * 100) / 100, reason: null};
}

/**
 * Determine the best seat for passenger entry
 * Priority: rear seats (seat 1, then 2), front passenger (seat 0) only if back full
 */
function getBestPassengerSeat(vehicle: Car): number {
    const maxPassengers = vehicle.getMaximumNumberOfPassengers();

    // Check rear seats first (seat 1 = rear left, seat 2 = rear right in GTA IV)
    if (maxPassengers >= 2) {
        if (vehicle.isPassengerSeatFree(1)) {
            debugEx("PASSENGER", "Using rear left seat (1)");
            return 1;
        }
        if (maxPassengers >= 3 && vehicle.isPassengerSeatFree(2)) {
            debugEx("PASSENGER", "Using rear right seat (2)");
            return 2;
        }
    }

    // If back seats are full, use front passenger seat (0)
    if (vehicle.isPassengerSeatFree(0)) {
        debugEx("PASSENGER", "Back seats full, using front passenger seat (0)");
        return 0;
    }

    // No seats available
    debugEx("ERROR", "No passenger seats available!");
    return -2;
}

// ============================================================================
// MISSION CONTROL FUNCTIONS
// ============================================================================

/**
 * Start a new Taxi Mission
 */
function startTaxiMission(): boolean {
    debugEx("MISSION", "Starting taxi mission...");

    // Check for conflicting GTA taxi missions to prevent interference
    const taxiScriptCount = native<int>("GET_NUMBER_OF_INSTANCES_OF_STREAMED_SCRIPT", "taxi");
    const romanTaxiCount = native<int>("GET_NUMBER_OF_INSTANCES_OF_STREAMED_SCRIPT", "roman_taxi");

    if (taxiScriptCount > 0 || romanTaxiCount > 0) {
        debugEx("ERROR", "Another taxi mission is already active");
        showTextBox("Another taxi mission is active. Please wait.");
        return false;
    }

    // Set mission flag to prevent other missions from interfering
    native("SET_MISSION_FLAG", true);

    // Prevent wanted level changes during taxi mission
    const player = getPlayerChar();

    // Store initial location for this mission
    const startLocation = player.getCoordinates();
    lastLocation = {...startLocation};

    debugEx("MISSION", "Mission start location:", startLocation);

    // Calculate next mission distance based on multiplier
    const nextMissionDistance = getNextMissionDistance(distanceMultiplier);
    debugEx("MISSION", `Target distance: ${nextMissionDistance}m, multiplier: ${distanceMultiplier}`);

    // Initialize metrics
    missionMetrics.startTime = Date.now();
    missionMetrics.pickupTime = 0;
    missionMetrics.dropoffTime = 0;
    missionMetrics.totalDistance = 0;
    missionMetrics.attemptCount = 0;


    // Initialize mission data
    missionData = {
        passenger: null,
        pickupBlip: null,
        destinationBlip: null,
        pickupLocation: null,
        destination: null,
    };

    // Loop until a valid passenger is found
    while (!missionData.passenger || !Char.DoesExist(missionData.passenger)) {
        const searchRadius =
            missionMetrics.attemptCount * MISSION_CONFIG.BASE_SEARCH_RADIUS +
            MISSION_CONFIG.BASE_SEARCH_RADIUS;

        missionData.passenger = findPassengerAround(startLocation, searchRadius);
        missionMetrics.attemptCount++;

        debugEx(
            "PASSENGER",
            `Search attempt ${missionMetrics.attemptCount}, radius: ${searchRadius}m`
        );

        if (missionMetrics.attemptCount >= MISSION_CONFIG.MAX_FIND_ATTEMPTS) {
            debugEx("ERROR", "Failed to find passenger after max attempts");
            showTextBox("No passengers found nearby. Try again later.");
            missionState = TaxiMissionState.Failed;
            return false;
        }

        // Wait between attempts
        wait(500);
    }

    debugEx("PASSENGER", `Passenger found after ${missionMetrics.attemptCount} attempts`);

    // Set destination node
    const randomPoint = getRandomPointAtDistance(startLocation, nextMissionDistance);
    const destination = getValidCarNode(randomPoint);

    if (!destination) {
        debugEx("ERROR", "Failed to get destination node");
        // Release passenger
        missionData.passenger.markAsNoLongerNeeded();
        missionData.passenger = null;
        return false;
    }

    missionData.destination = destination;
    debugEx("MOVEMENT", "Destination set to:", destination);

    // Cleanup old blips
    safeRemoveBlip(missionData.pickupBlip);
    safeRemoveBlip(missionData.destinationBlip);

    // Create passenger blip
    missionData.pickupBlip = Blip.AddForChar(missionData.passenger);
    missionData.pickupBlip.setRoute(true);
    missionData.pickupBlip.changeColor(BlipColors.Yellow);

    showTextBox("Pick up the passenger!");

    return true;
}

/**
 * Request animation resources with timeout
 */
function requestAnimations(): void {
    native("REQUEST_ANIMS", "AMB@TAXI_HAIL_M");
    native("REQUEST_ANIMS", "AMB@TAXI_HAIL_F");

    const startWait = Date.now();
    while (
        !native<boolean>("HAVE_ANIMS_LOADED", "AMB@TAXI_HAIL_M") ||
        !native<boolean>("HAVE_ANIMS_LOADED", "AMB@TAXI_HAIL_F")
        ) {
        if (Date.now() - startWait > MISSION_CONFIG.ANIM_LOAD_TIMEOUT) {
            debugEx("ERROR", "Animation loading timeout");
            break;
        }
        wait(100);
    }
}

/**
 * Main Taxi Mission Loop - Handles pickup and dropoff logic
 */
function taxiMissionMainLoop(): void {
    if (!missionData.passenger || !Char.DoesExist(missionData.passenger)) {
        debugEx("ERROR", "No passenger in main loop");
        return;
    }

    // Request animations
    requestAnimations();

    const player = getPlayerChar();
    const playerVehicle = player.getCarIsUsing();

    /**
     * Basic mission validity checks
     */
    const passBasicChecks = (): boolean => {
        // Check passenger is alive
        if (!missionData.passenger || missionData.passenger.isDead()) {
            debugEx("ERROR", "Passenger is dead");
            showTextBox("The passenger is dead. Mission failed.");
            return false;
        }

        // Check passenger health
        if (
            missionData.passenger &&
            !missionData.passenger.isHealthGreater(40)
        ) {
            debugEx("ERROR", `Passenger health too low: ${missionData.passenger.getHealth()}`);
            showTextBox("The passenger is injured. Mission failed.");
            return false;
        }

        // Check vehicle validity
        if (
            !Car.DoesExist(playerVehicle) ||
            !playerVehicle.isDriveable() ||
            playerVehicle.isInWater()
        ) {
            debugEx("ERROR", "Player vehicle not driveable");
            showTextBox("You wrecked the taxi! Mission failed.");
            return false;
        }

        return true;
    };

    let taxiHailAnimationPlayed = false;

    // ========================================================================
    // PHASE 1: Picking up passenger
    // ========================================================================
    debugEx("MISSION", "Entering pickup phase");

    while (
        Char.DoesExist(missionData.passenger) &&
        player.isInTaxi() &&
        !missionData.passenger.isInAnyCar() &&
        missionState !== TaxiMissionState.Failed
        ) {
        const distanceToPassenger = getDistanceBetweenTwoVectors(
            player.getCoordinates(),
            missionData.passenger.getCoordinates()
        );

        if (!passBasicChecks()) {
            missionState = TaxiMissionState.Failed;
            return;
        }

        // Make passenger look at taxi and yell when close
        if (
            distanceToPassenger <= MISSION_CONFIG.PICKUP_DISTANCE &&
            !missionData.passenger.isInAnyCar() &&
            !taxiHailAnimationPlayed
        ) {
            const hailDirection = getTaxiHailDirection(
                missionData.passenger,
                playerVehicle
            );
            const animDict = missionData.passenger.isMale()
                ? "AMB@TAXI_HAIL_M"
                : "AMB@TAXI_HAIL_F";

            // Task to look at vehicle
            native(
                "TASK_LOOK_AT_VEHICLE",
                missionData.passenger,
                playerVehicle,
                2000,
                0
            );

            // Play hail animation
            Task.PlayAnim(
                missionData.passenger,
                hailDirection,
                animDict,
                8.0,
                false,
                true,
                true,
                false,
                -2
            );

            // Taxi honk - commented out as native not available in SDK
            // Use native("PLAY_CAR_HORN", ...) if your version supports it

            taxiHailAnimationPlayed = true;
            debugEx("PASSENGER", "Hail animation triggered");
        }

        // Attempt to enter vehicle
        if (
            distanceToPassenger <= MISSION_CONFIG.HAUL_DISTANCE &&
            playerVehicle.isStopped()
        ) {
            debugEx("PASSENGER", "Requesting passenger entry");

            // Get the side the passenger is on and use the corresponding rear seat
            const hailDirection = getTaxiHailDirection(missionData.passenger, playerVehicle);

            // In GTA IV left-hand drive:
            // - HAIL_RIGHT (passenger on right) -> seat 3 (rear right)
            // - HAIL_LEFT (passenger on left) -> seat 2 (rear left)
            // Fall back to seat 1 (front passenger) if rear is occupied
            let seatIndex: number;

            if (hailDirection === "HAIL_RIGHT") {
                // Passenger on right side - use rear right seat (3)
                seatIndex = playerVehicle.isPassengerSeatFree(3) ? 3 : 1;
            } else {
                // Passenger on left side - use rear left seat (2)
                seatIndex = playerVehicle.isPassengerSeatFree(2) ? 2 : 1;
            }

            debugEx("PASSENGER", `Passenger entering seat: ${seatIndex} (direction: ${hailDirection})`);

            Task.EnterCarAsPassenger(
                missionData.passenger,
                playerVehicle,
                5000,
                seatIndex
            );

            showTextBox("Passenger getting in... Drive them to the destination!");
            wait(MISSION_CONFIG.PICKUP_WAIT_MS);
        }

        wait(MISSION_CONFIG.LOOP_INTERVAL_MS);
    }

    // ========================================================================
    // PHASE 2: Validate pickup success
    // ========================================================================
    if (
        !Char.DoesExist(missionData.passenger) ||
        !player.isInTaxi() ||
        !missionData.passenger.isInTaxi()
    ) {
        debugEx("ERROR", "Pickup failed - passenger not in taxi");
        missionState = TaxiMissionState.Failed;
        return;
    }

    // Store pickup location for correct fare calculation
    missionData.pickupLocation = {...player.getCoordinates()};
    missionMetrics.pickupTime = Date.now();

    // Store vehicle health at pickup for tip calculation
    vehicleHealthAtPickup = playerVehicle.getHealth();
    debugEx("MISSION", "Passenger picked up at", missionData.pickupLocation, `| Vehicle health: ${vehicleHealthAtPickup}`);

    // Remove pickup blip, create destination blip
    safeRemoveBlip(missionData.pickupBlip);

    if (missionData.destination) {
        missionData.destinationBlip = Blip.AddForCoord(
            missionData.destination.x,
            missionData.destination.y,
            missionData.destination.z
        );
        missionData.destinationBlip.setRoute(true);
        missionData.destinationBlip.changeColor(BlipColors.Orange);
    }

    // Passenger dialogue
    missionData.passenger.sayAmbientSpeech("TAXI_START", true, true, false);

    // ========================================================================
    // PHASE 3: Driving to destination
    // ========================================================================
    debugEx("MISSION", "Entering dropoff phase");

    while (
        missionData.passenger &&
        Char.DoesExist(missionData.passenger) &&
        player.isInTaxi() &&
        missionData.passenger.isInTaxi() &&
        missionState !== TaxiMissionState.Failed
        ) {
        if (!passBasicChecks()) {
            return;
        }

        // Update blip colors based on distance
        if (missionData.destinationBlip && missionData.destination) {
            const distanceToDestination = getDistanceBetweenTwoVectors(
                player.getCoordinates(),
                missionData.destination
            );

            // Color change based on proximity
            if (distanceToDestination < 20) {
                missionData.destinationBlip.changeColor(BlipColors.BrightRed);
            } else if (distanceToDestination < 50) {
                missionData.destinationBlip.changeColor(BlipColors.Yellow);
            }
        }

        // Check arrival
        if (
            missionData.destination &&
            getDistanceBetweenTwoVectors(player.getCoordinates(), missionData.destination) <
            MISSION_CONFIG.ARRIVAL_DISTANCE &&
            playerVehicle.isStopped()
        ) {
            // Calculate actual travel distance
            const distanceTravelled = missionData.pickupLocation
                ? getDistanceBetweenTwoVectors(
                    missionData.pickupLocation,
                    missionData.destination
                )
                : 0;

            missionMetrics.totalDistance = distanceTravelled;
            missionMetrics.dropoffTime = Date.now();

            // Success!
            if (missionData.passenger && Char.DoesExist(missionData.passenger)) {
                missionData.passenger.sayAmbientSpeech("TAXI_SUCCESS", true, true, false);
                Task.LeaveCarImmediately(missionData.passenger, playerVehicle);
            }

            showTextBox(
                "You have arrived at the destination! Let the passenger out."
            );

            completeTaxiMission(distanceTravelled);
            wait(MISSION_CONFIG.COMPLETION_DELAY_MS);
            break;
        }

        wait(MISSION_CONFIG.LOOP_INTERVAL_MS);
    }
}

/**
 * Complete the Taxi Mission
 */
function completeTaxiMission(distanceTravelled: number): void {
    const playerVehicle = getPlayerChar().getCarIsUsing();

    // Calculate fare with increasing base
    const fare = calculateFare(distanceTravelled);

    // Calculate tip based on driving performance (damage + time)
    let tip: Tip;
    let currentVehicleHealth = 1000;
    if (playerVehicle && Car.DoesExist(playerVehicle)) {
        currentVehicleHealth = playerVehicle.getHealth();
        tip = calculateTip(fare, currentVehicleHealth);
    }

    const totalEarnings = fare + tip.amount;
    getPlayer().addScore(totalEarnings);

    // Calculate trip time (pickup to dropoff)
    const tripTimeMs = missionMetrics.dropoffTime > 0
        ? missionMetrics.dropoffTime - missionMetrics.pickupTime
        : 0;
    const tripTimeSec = tripTimeMs / 1000;

    // Display results with time and tip info
    if (tip.amount > 0) {
        showTextBox(`Trip complete! Fare: ${fare.toFixed(2)} | Time: ${tripTimeSec.toFixed(0)}s | Tip: ${tip.toFixed(2)} | Total: ${totalEarnings.toFixed(2)}`);
    } else {
        showTextBox(`Trip complete! Fare: ${fare.toFixed(2)} | Time: ${tripTimeSec.toFixed(0)}s | No tip (vehicle damaged or slow)`);
    }

    debugEx(
        "FARE",
        `Mission complete! Fare: ${fare.toFixed(2)}, Tip: ${tip.amount.toFixed(2)}, Total: ${totalEarnings.toFixed(2)}, Distance: ${distanceTravelled.toFixed(0)}m, Trip Time: ${tripTimeSec.toFixed(1)}s`
    );

    // Update last location to drop-off
    if (missionData.destination) {
        lastLocation = {...missionData.destination};
    }

    // Increase distance multiplier for next fare
    distanceMultiplier = Math.min(distanceMultiplier + 1, 20);

    // Clean up passenger
    if (missionData.passenger && Char.DoesExist(missionData.passenger)) {
        missionData.passenger.markAsNoLongerNeeded();

        if (missionData.passenger.isInAnyCar()) {
            Task.LeaveAnyCar(missionData.passenger);
            wait(500);
        }

        Task.WanderStandard(missionData.passenger);
        missionData.passenger = null;
    }

    // Clean up blips
    safeRemoveBlip(missionData.pickupBlip);
    safeRemoveBlip(missionData.destinationBlip);

    missionData.pickupBlip = null;
    missionData.destinationBlip = null;

    missionState = TaxiMissionState.Completed;
}

/**
 * Handle mission failure cleanup
 */
function handleMissionFailure(reason: string): void {
    debugEx("ERROR", `Mission failed: ${reason}`);

    showTextBox(`Taxi mission failed. ${reason}`);
    missionState = TaxiMissionState.Failed;

    // Cleanup passenger
    if (missionData.passenger && Char.DoesExist(missionData.passenger)) {
        missionData.passenger.markAsNoLongerNeeded();

        // Make them leave car if inside
        if (missionData.passenger.isInAnyCar()) {
            Task.LeaveAnyCar(missionData.passenger);
            wait(500);
        }

        // Wander
        Task.WanderStandard(missionData.passenger);
        missionData.passenger.sayAmbientSpeech("TAXI_BAIL", true, true, false);
        missionData.passenger = null;
    }

    // Cleanup blips
    safeRemoveBlip(missionData.pickupBlip);
    safeRemoveBlip(missionData.destinationBlip);
    missionData.pickupBlip = null;
    missionData.destinationBlip = null;

    // Reset multiplier on failure
    distanceMultiplier = 1;
}

/**
 * Reset mission state completely
 */
function resetMissionState(): void {
    debugEx("STATE", "Resetting mission state");

    missionState = TaxiMissionState.Idle;

    // Reset grace period tracking
    gracePeriodStartTime = -1;
    wasInGracePeriod = false;

    // Already cleaned up in handleMissionFailure/completeTaxiMission
    // Just ensure nulls
    missionData.passenger = null;
    missionData.pickupBlip = null;
    missionData.destinationBlip = null;
    missionData.pickupLocation = null;
    missionData.destination = null;
}

// ============================================================================
// MAIN LOOP
// ============================================================================

try {
    while (true) {
        wait(MISSION_CONFIG.LOOP_INTERVAL_MS);

        const player = getPlayerChar();

        // Only run taxi logic if driving a car AND inside a taxi
        if (isPlayerDrivingAnyCar() && player.isInTaxi()) {
            // Check if player returned to taxi during grace period
            if (wasInGracePeriod && gracePeriodStartTime !== -1) {
                debugEx("STATE", "Player returned to taxi - resuming mission");
                // Reset grace period
                gracePeriodStartTime = -1;
                wasInGracePeriod = false;
            }

            let promptShown = false;

            while (player.isInTaxi()) {
                wait(MISSION_CONFIG.LOOP_INTERVAL_MS);

                // ========================================================================
                // STATE: Idle - Waiting for player to start
                // ========================================================================
                if (missionState === TaxiMissionState.Idle && !promptShown) {
                    showTextBox("Press E to work as a taxi driver.");
                    promptShown = true;
                }

                // Player presses E to start a mission
                if (
                    Pad.IsGameKeyboardKeyPressed(Key.E) &&
                    missionState === TaxiMissionState.Idle
                ) {
                    debugEx("MISSION", "Player activated taxi mission");
                    missionState = TaxiMissionState.TakingFare;
                    showTextBox(
                        "Taxi driver mission started! Searching for a passenger..."
                    );

                    if (!startTaxiMission()) {
                        debugEx("ERROR", "Failed to start taxi mission");
                        // Reset to idle - startTaxiMission handles failure state
                    } else {
                        wait(1000);
                    }
                }

                // ========================================================================
                // STATE: TakingFare - Active mission
                // ========================================================================
                if (missionState === TaxiMissionState.TakingFare) {
                    taxiMissionMainLoop();
                }

                // ========================================================================
                // STATE: Completed - Prepare next fare
                // ========================================================================
                if (missionState === TaxiMissionState.Completed) {
                    // Wait before starting next fare
                    wait(MISSION_CONFIG.NEXT_MISSION_DELAY_MS);

                    if (player.isInTaxi()) {
                        // Start next fare automatically
                        missionState = TaxiMissionState.TakingFare;

                        if (startTaxiMission()) {
                            showTextBox(
                                "Next fare found! Go pick up the passenger!"
                            );
                            wait(1000);
                        }
                    } else {
                        // Player left taxi after completion
                        debugEx("MISSION", "Player left taxi after completion");
                        resetMissionState();
                    }
                }

                // ========================================================================
                // STATE: Failed - Handle failure
                // ========================================================================
                if (missionState === TaxiMissionState.Failed) {
                    // Wait a moment before resetting
                    wait(1000);
                    resetMissionState();
                }
            }

            // Player exited the taxi vehicle - check if mission was active
            if (
                missionState !== TaxiMissionState.Idle &&
                missionState !== TaxiMissionState.Completed &&
                missionState !== TaxiMissionState.Failed
            ) {
                // Start grace period if not already in one
                if (gracePeriodStartTime === -1) {
                    gracePeriodStartTime = Date.now();
                    wasInGracePeriod = true;
                    debugEx("STATE", "Player exited taxi - starting 25s grace period");
                }

                // Check if grace period has elapsed
                const timeInGrace = Date.now() - gracePeriodStartTime;
                if (timeInGrace >= MISSION_CONFIG.GRACE_PERIOD_MS) {
                    // Grace period expired - fail the mission
                    debugEx("ERROR", "Grace period expired - player did not return to taxi");
                    handleMissionFailure("You left the taxi.");
                    gracePeriodStartTime = -1;
                    wasInGracePeriod = false;
                } else {
                    // Show countdown message
                    const remainingSec = Math.ceil(
                        (MISSION_CONFIG.GRACE_PERIOD_MS - timeInGrace) / 1000
                    );
                    showTextBox(`Get back in the taxi! ${remainingSec}s remaining`);
                }
            } else {
                // Reset grace period when in valid state
                gracePeriodStartTime = -1;
                wasInGracePeriod = false;
            }
        } else {
            // Not in taxi - ensure clean state
            // Check if we need to handle grace period or fail
            if (
                missionState !== TaxiMissionState.Idle &&
                missionState !== TaxiMissionState.Completed &&
                missionState !== TaxiMissionState.Failed
            ) {
                // Start grace period if not already in one
                if (gracePeriodStartTime === -1) {
                    gracePeriodStartTime = Date.now();
                    wasInGracePeriod = true;
                    debugEx("STATE", "Player not in taxi - starting 25s grace period");
                }

                // Check if grace period has elapsed
                const timeInGrace = Date.now() - gracePeriodStartTime;
                if (timeInGrace >= MISSION_CONFIG.GRACE_PERIOD_MS) {
                    // Grace period expired - fail the mission
                    debugEx("ERROR", "Grace period expired - mission failed");
                    handleMissionFailure("You left the taxi.");
                    gracePeriodStartTime = -1;
                    wasInGracePeriod = false;
                } else {
                    // Show countdown message
                    const remainingSec = Math.ceil(
                        (MISSION_CONFIG.GRACE_PERIOD_MS - timeInGrace) / 1000
                    );
                    showTextBox(`Get back in the taxi! ${remainingSec}s remaining`);
                }
            } else {
                // Reset grace period when in valid state
                gracePeriodStartTime = -1;
                wasInGracePeriod = false;
            }
        }
    }
} catch (error) {
    log("Error in TaxiMission script:", error);
    showTextBox("An error occurred in the Taxi Mission script. Please check the logs.");
}
