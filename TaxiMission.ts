import {getPlayer, getPlayerChar, isPlayerDrivingAnyCar} from "./libs/player";
// @ts-ignore
import {Key} from ".config/enums.js";
import {getDistanceBetweenTwoVectors} from "./libs/utils";
import {safeRemoveBlip, BlipColors} from "./libs/blips";
import {getPedModelName} from "./libs/models";

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Mission configuration constants */
const MISSION_CONFIG = {
    // Passenger finding
    BASE_SEARCH_RADIUS: 50,
    MAX_FIND_ATTEMPTS: 100,
    PASSENGER_SPAWN_HEIGHT: 0,

    // Distance calculation (meters)
    MIN_DISTANCE: 200,
    DISTANCE_STEP: 100,
    MAX_DISTANCE: 6500,

    // Fare calculation
    BASE_FARE: 2.50,
    PER_SEGMENT_RATE: 0.40,
    MILE_IN_METERS: 1609.344,
    FIFTH_MILE_METERS: 1609.344 / 5,

    // Tip system
    TIP_BASE_PERCENTAGE: 0.15,
    TIP_TIME_BONUS_PERCENTAGE: 0.10,
    TIP_TIME_THRESHOLD_SEC: 120,
    DAMAGE_THRESHOLD: 0.80,

    // Reaction distances
    HAUL_DISTANCE: 30,
    PICKUP_DISTANCE: 15,
    ARRIVAL_DISTANCE: 30,

    // Timing (milliseconds)
    PICKUP_WAIT_MS: 5000,
    COMPLETION_DELAY_MS: 4000,
    NEXT_MISSION_DELAY_MS: 3000,
    LOOP_INTERVAL_MS: 100,
    ANIM_LOAD_TIMEOUT: 2000,
    GRACE_PERIOD_MS: 25000,
} as const;

/** Debug categories */
const DebugCategory = {
    MISSION: "MISSION",
    PASSENGER: "PASSENGER",
    MOVEMENT: "MOVEMENT",
    FARE: "FARE",
    STATE: "STATE",
    ERROR: "ERROR",
} as const;

type DebugCategoryKey = keyof typeof DebugCategory;

type Location = {
    name: string;
    coords: { x: number, y: number, z: number };
    probability: number; // from 0 to 100%
}

const ImportantLocations: Location[] = [
    {
        name: "Airport",
        coords: {"x": 2357.66748046875, "y": 371.1781921386719, "z": 6.085225582122803},
        probability: 15
    },
    {
        name: "Park 1",
        coords: {"x": 1562.795166015625, "y": 547.4894409179688, "z": 28.536052703857422},
        probability: 15
    },
    {
        name: "Park 2",
        coords: {"x": 1107.8795166015625, "y": -141.51939392089844, "z": 32.64236831665039},
        probability: 15
    },
    {
        name: "Fair",
        coords: {"x": 950.1388549804688, "y": -660.3601684570312, "z": 13.655376434326172},
        probability: 15
    },
    {
        name: "Hove Beach Station",
        coords: {"x": 997.7302856445312, "y": -544.7447509765625, "z": 14.33981704711914},
        probability: 15
    },
    {
        name: "Schotler Medical Center",
        coords: {"x": 1190.4693603515625, "y": 195.2804718017578, "z": 31.89065933227539},
        probability: 15
    },
    {
        name: "Steinway Park",
        coords: {"x": 847.2088623046875, "y": 733.6497802734375, "z": 7.21943473815918},
        probability: 15
    },
    {
        name: "Store De Koch",
        coords: {"x": 118.59583282470703, "y": 969.6500244140625, "z": 14.033636093139648},
        probability: 15
    },
    {
        name: "Libertonian Museum",
        coords: {"x": -61.060279846191406, "y": 809.8582153320312, "z": 14.057557106018066},
        probability: 15
    },
    {
        name: "Star Junction",
        coords: {"x": -190.83172607421875, "y": 361.3773193359375, "z": 14.804203033447266},
        probability: 15
    },
    {
        name: "Heli-Tour",
        coords: { "x": 296.9700927734375, "y": -679.6715087890625, "z": 4.204738616943359 },
        probability: 15
    },
    {
        name: "Castle Gardens",
        coords: { "x": -155.99966430664062, "y": -801.5526123046875, "z": 4.910671234130859 },
        probability: 15
    },
    {
        name: "Castle Gardens City",
        coords: { "x": -511.0885314941406, "y": -270.78411865234375, "z": 7.473130702972412 },
        probability: 15
    },
    {
        name: "Train Hard Store",
        coords: { "x": -124.25224304199219, "y": -12.812334060668945, "z": 14.23044204711914 },
        probability: 15
    },
    {
        name: "Burger Shot",
        coords: { "x": -175.88717651367188, "y": 272.3224792480469, "z": 14.198423385620117 },
        probability: 15
    },
    {
        name: "Holland Hospital Center",
        coords: { "x": -391.6754455566406, "y": 1268.3983154296875, "z": 22.489723205566406 },
        probability: 15
    },
    {
        name: "Vespuci Circus",
        coords: { "x": -208.48712158203125, "y": 1492.4622802734375, "z": 17.86697006225586 },
        probability: 15
    },
    {
        name: "Middle Park",
        coords: { "x": -170.12892150878906, "y": 1178.3424072265625, "z": 14.226988792419434 },
        probability: 15
    },
    {
        name: "International Online",
        coords: { "x": -891.8658447265625, "y": 1039.62744140625, "z": 20.11684226989746 },
        probability: 15
    }
]

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum TaxiMissionState {
    Idle,
    TakingFare,
    Completed,
    Failed,
}

interface MissionMetrics {
    startTime: number;
    pickupTime: number;
    dropoffTime: number;
    totalDistance: number;
    attemptCount: number;
}

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

const DEBUG_ENABLED = true;

function debugEx(category: DebugCategoryKey, message: string, ...params: any[]): void {
    if (!DEBUG_ENABLED) return;

    const prefix = `[${DebugCategory[category]}]`;
    let formatted = message;

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
let lastLocation: Vector3 | null = null;
let currentDestinationName: string = "";
let missionMetrics: MissionMetrics = {
    startTime: 0,
    pickupTime: 0,
    dropoffTime: 0,
    totalDistance: 0,
    attemptCount: 0,
};

let gracePeriodStartTime: number = -1;
let wasInGracePeriod: boolean = false;
let lastCountdownDisplayed: number = -1;
let vehicleHealthAtPickup: number = 1000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isValidPassenger(char: Char): boolean {
    if (!char || !Char.DoesExist(char)) {
        return false;
    }

    if (!char.isOnFoot()) {
        debugEx("PASSENGER", "Char not on foot, skipping");
        return false;
    }

    if (char.isInAnyCar()) {
        debugEx("PASSENGER", "Char already in car, skipping");
        return false;
    }

    // FIXED: Use IS_CHAR_FATALLY_INJURED pattern from Vigilante
    if (char.isFatallyInjured()) {
        debugEx("PASSENGER", "Char fatally injured, skipping");
        return false;
    }

    if (char.getHealth() < 20) {
        debugEx("PASSENGER", "Char health too low, skipping");
        return false;
    }

    return true;
}

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

    if (!pedId || !Char.DoesExist(new Char(pedId))) {
        debugEx("PASSENGER", "No ped found in area");
        return null;
    }

    const pedFound = new Char(pedId);

    if (!isValidPassenger(pedFound)) {
        debugEx("PASSENGER", `Ped ${pedId} failed validation`);
        pedFound.markAsNoLongerNeeded();
        return null;
    }

    pedFound.setAsMissionChar();

    const model = pedFound.getModel();
    debugEx("PASSENGER", `Passenger found: ${getPedModelName(model)} at`, point);

    return pedFound;
}

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

function getValidCarNode(point: Vector3): Vector3 | null {
    const nodeResult = Path.GetNextClosestCarNode(point.x, point.y, point.z);

    if (nodeResult && (nodeResult.x !== 0 !== undefined)) {
        return {
            x: nodeResult.x || point.x,
            y: nodeResult.y || point.y,
            z: nodeResult.z || point.z,
        };
    }

    debugEx("MOVEMENT", "GetNextClosestCarNode failed, trying fallback...");

    const fallback = Path.GetClosestCarNode(point.x, point.y, point.z);

    if (fallback && fallback.pResX !== 0) {
        debugEx("MOVEMENT", "Using GetClosestCarNode fallback");
        return {
            x: fallback.pResX,
            y: fallback.pResY,
            z: fallback.pResZ,
        };
    }

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

function getTaxiHailDirection(passenger: Char, vehicle: Car): "HAIL_LEFT" | "HAIL_RIGHT" {
    const direction = getTaxiDirectionReference(passenger, vehicle);
    return direction === 1 ? "HAIL_LEFT" : "HAIL_RIGHT";
}

function getTaxiDirectionReference(passenger: Char, vehicle: Car): number {
    const passengerPos = passenger.getCoordinates();
    const vehiclePos = vehicle.getCoordinates();

    const dx = passengerPos.x - vehiclePos.x;
    const dy = passengerPos.y - vehiclePos.y;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    let vehicleHeading = vehicle.getHeading();
    if (vehicleHeading < 0) vehicleHeading += 360;

    let relativeAngle = angle - vehicleHeading;
    if (relativeAngle < 0) relativeAngle += 360;

    return relativeAngle < 180 ? 2 : 1;
}

function getNextMissionDistance(multiplier: number): number {
    const min = MISSION_CONFIG.MIN_DISTANCE + (multiplier - 1) * MISSION_CONFIG.DISTANCE_STEP;
    const max = min + MISSION_CONFIG.DISTANCE_STEP;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateFare(distanceMeters: number): number {
    const adjustedDistance = Math.min(distanceMeters, MISSION_CONFIG.MAX_DISTANCE);

    const segments = adjustedDistance / MISSION_CONFIG.FIFTH_MILE_METERS;
    const distanceCharge = segments * MISSION_CONFIG.PER_SEGMENT_RATE;

    const baseFareWithMultiplier = 20 + (distanceMultiplier * 10);

    const total = baseFareWithMultiplier + distanceCharge;
    return Math.round(total * 100) / 100;
}

interface Tip {
    amount: number;
    reason: string | null;
}

function calculateTip(fare: number, currentVehicleHealth: number): Tip {
    const maxHealth = 1000;
    const healthPercent = currentVehicleHealth / maxHealth;
    const healthPercentInt = Math.round(healthPercent * 100);

    debugEx("FARE", `Vehicle health: ${currentVehicleHealth}/${maxHealth} = ${healthPercentInt}%`);

    if (healthPercent < MISSION_CONFIG.DAMAGE_THRESHOLD) {
        const reason = `Vehicle too damaged (${healthPercentInt}% < 80%)`;
        debugEx("FARE", `No tip - ${reason}`);
        showTextBox("No tip: Vehicle was too damaged!");
        return {amount: 0, reason};
    }

    const tripTimeMs = missionMetrics.dropoffTime > 0
        ? missionMetrics.dropoffTime - missionMetrics.pickupTime
        : 0;
    const tripTimeSec = tripTimeMs / 1000;

    let tip = fare * MISSION_CONFIG.TIP_BASE_PERCENTAGE;

    if (tripTimeSec < MISSION_CONFIG.TIP_TIME_THRESHOLD_SEC) {
        const timeBonus = fare * MISSION_CONFIG.TIP_TIME_BONUS_PERCENTAGE;
        tip += timeBonus;
        debugEx("FARE", `Fast delivery bonus: +${timeBonus.toFixed(2)} (${tripTimeSec.toFixed(1)}s)`);
        showTextBox(`Fast trip! You earned a ${timeBonus.toFixed(2)} tip bonus!`);
    }

    return {amount: Math.round(tip * 100) / 100, reason: null};
}

function getBestPassengerSeat(vehicle: Car): number {
    const maxPassengers = vehicle.getMaximumNumberOfPassengers();

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

    if (vehicle.isPassengerSeatFree(0)) {
        debugEx("PASSENGER", "Back seats full, using front passenger seat (0)");
        return 0;
    }

    debugEx("ERROR", "No passenger seats available!");
    return -2;
}

// ============================================================================
// MISSION CONTROL FUNCTIONS
// ============================================================================

function startTaxiMission(): boolean {
    debugEx("MISSION", "Starting taxi mission...");

    const taxiScriptCount = native<int>("GET_NUMBER_OF_INSTANCES_OF_STREAMED_SCRIPT", "taxi");
    const romanTaxiCount = native<int>("GET_NUMBER_OF_INSTANCES_OF_STREAMED_SCRIPT", "roman_taxi");

    if (taxiScriptCount > 0 || romanTaxiCount > 0) {
        debugEx("ERROR", "Another taxi mission is already active");
        showTextBox("Another taxi mission is active. Please wait.");
        return false;
    }

    Mission.SetFlag(true)

    const player = getPlayerChar();

    const startLocation = player.getCoordinates();
    lastLocation = {...startLocation};

    debugEx("MISSION", "Mission start location:", startLocation);

    const nextMissionDistance = getNextMissionDistance(distanceMultiplier);
    debugEx("MISSION", `Target distance: ${nextMissionDistance}m, multiplier: ${distanceMultiplier}`);

    missionMetrics.startTime = Date.now();
    missionMetrics.pickupTime = 0;
    missionMetrics.dropoffTime = 0;
    missionMetrics.totalDistance = 0;
    missionMetrics.attemptCount = 0;

    missionData = {
        passenger: null,
        pickupBlip: null,
        destinationBlip: null,
        pickupLocation: null,
        destination: null,
    };

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

        wait(500);
    }

    debugEx("PASSENGER", `Passenger found after ${missionMetrics.attemptCount} attempts`);

    const randomLoc = ImportantLocations[Math.floor(Math.random() * ImportantLocations.length)];
    currentDestinationName = randomLoc.name;
    const destination = randomLoc.coords;

    if (!destination) {
        debugEx("ERROR", "Failed to get destination node");
        missionData.passenger.markAsNoLongerNeeded();
        missionData.passenger = null;
        return false;
    }

    missionData.destination = destination;
    debugEx("MOVEMENT", "Destination set to:", destination);

    safeRemoveBlip(missionData.pickupBlip);
    safeRemoveBlip(missionData.destinationBlip);

    missionData.pickupBlip = Blip.AddForChar(missionData.passenger);
    missionData.pickupBlip.setRoute(true);
    missionData.pickupBlip.changeColor(BlipColors.Yellow);

    return true;
}

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

function taxiMissionMainLoop(): void {
    if (!missionData.passenger || !Char.DoesExist(missionData.passenger)) {
        debugEx("ERROR", "No passenger in main loop");
        return;
    }

    requestAnimations();

    const player = getPlayerChar();
    const playerVehicle = player.getCarIsUsing();

    const passBasicChecks = (): string | null => {
        if (!missionData.passenger || missionData.passenger.isFatallyInjured()) {
            debugEx("ERROR", "Passenger is dead/fatally injured");
            return "The passenger is dead.";
        }

        if (
            missionData.passenger &&
            !missionData.passenger.isHealthGreater(40)
        ) {
            debugEx("ERROR", `Passenger health too low: ${missionData.passenger.getHealth()}`);
            return "The passenger is injured.";
        }

        if (
            !Car.DoesExist(playerVehicle) ||
            !playerVehicle.isDriveable() ||
            playerVehicle.isInWater()
        ) {
            debugEx("ERROR", "Player vehicle not driveable");
            return "You wrecked the taxi!";
        }

        return null;
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

        const failReason = passBasicChecks();
        if (failReason) {
            handleMissionFailure(failReason);
            return;
        }

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

            native(
                "TASK_LOOK_AT_VEHICLE",
                missionData.passenger,
                playerVehicle,
                2000,
                0
            );

            Task.PlayAnim(
                missionData.passenger,
                hailDirection,
                animDict,
                8.0,
                false,
                true,
                false,
                true,
                -2
            );

            taxiHailAnimationPlayed = true;
            debugEx("PASSENGER", "Hail animation triggered");
        }

        if (
            distanceToPassenger <= MISSION_CONFIG.HAUL_DISTANCE &&
            playerVehicle.isStopped()
        ) {
            debugEx("PASSENGER", "Requesting passenger entry");

            const hailDirection = getTaxiHailDirection(missionData.passenger, playerVehicle);

            // FIXED: Use correct side seats - passenger enters from side they're standing on
            // GTA IV seat indices: 0 = front passenger (right), 1 = rear left (left), 2 = rear right (right), 3 = far right
            // When passenger hails from RIGHT side (HAIL_RIGHT) → use right side seats (0 or 2)
            // When passenger hails from LEFT side (HAIL_LEFT) → use left side seats (1 or 3)
            let seatIndex: number;

            if (hailDirection === "HAIL_RIGHT") {
                // Passenger on right side - use right side rear seats (2 rear-right, 0 front-passenger fallback)
                seatIndex = playerVehicle.isPassengerSeatFree(2) ? 2 : (playerVehicle.isPassengerSeatFree(0) ? 0 : -1);
            } else {
                // Passenger on left side - use left side rear seats (1 rear-left, 3 far-right)
                seatIndex = playerVehicle.isPassengerSeatFree(1) ? 1 : (playerVehicle.isPassengerSeatFree(3) ? 3 : -1);
            }

            debugEx("PASSENGER", `Passenger entering seat: ${seatIndex} (direction: ${hailDirection})`);

            Task.EnterCarAsPassenger(
                missionData.passenger,
                playerVehicle,
                10000,
                seatIndex
            );

            showTextBox("Passenger getting in...");
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
        handleMissionFailure("Passenger did not enter the taxi.");
        return;
    }

    missionData.pickupLocation = {...player.getCoordinates()};
    missionMetrics.pickupTime = Date.now();

    vehicleHealthAtPickup = playerVehicle.getHealth();
    debugEx("MISSION", "Passenger picked up at", missionData.pickupLocation, `| Vehicle health: ${vehicleHealthAtPickup}`);

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
        const failReason = passBasicChecks();
        if (failReason) {
            handleMissionFailure(failReason);
            return;
        }

        if (missionData.destinationBlip && missionData.destination) {
            const distanceToDestination = getDistanceBetweenTwoVectors(
                player.getCoordinates(),
                missionData.destination
            );

            if (distanceToDestination < 20) {
                missionData.destinationBlip.changeColor(BlipColors.BrightRed);
            } else if (distanceToDestination < 50) {
                missionData.destinationBlip.changeColor(BlipColors.Yellow);
            }
        }

        if (
            missionData.destination &&
            getDistanceBetweenTwoVectors(player.getCoordinates(), missionData.destination) <
            MISSION_CONFIG.ARRIVAL_DISTANCE &&
            playerVehicle.isStopped()
        ) {
            const distanceTravelled = missionData.pickupLocation
                ? getDistanceBetweenTwoVectors(
                    missionData.pickupLocation,
                    missionData.destination
                )
                : 0;

            missionMetrics.totalDistance = distanceTravelled;
            missionMetrics.dropoffTime = Date.now();

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

// ============================================================================
// FIXED: completeTaxiMission with proper null handling
// ============================================================================

function completeTaxiMission(distanceTravelled: number): void {
    const player = getPlayerChar();
    const playerVehicle = player.getCarIsUsing();

    const fare = calculateFare(distanceTravelled);

    // FIXED: Initialize tip with default value to prevent undefined access
    let tip: Tip = {amount: 0, reason: null};
    let currentVehicleHealth = 1000;

    if (playerVehicle && Car.DoesExist(playerVehicle)) {
        currentVehicleHealth = playerVehicle.getHealth();
        tip = calculateTip(fare, currentVehicleHealth);
    }

    const totalEarnings = fare + tip.amount;

    // FIXED: Use addScore with proper money type if available
    try {
        getPlayer().addScore(totalEarnings);
    } catch (e) {
        debugEx("ERROR", "Failed to add score: " + String(e));
    }

    const tripTimeMs = missionMetrics.dropoffTime > 0
        ? missionMetrics.dropoffTime - missionMetrics.pickupTime
        : 0;
    const tripTimeSec = tripTimeMs / 1000;

    if (tip.amount > 0) {
        showTextBox(`Trip complete! Fare: ${fare.toFixed(2)} | Time: ${tripTimeSec.toFixed(0)}s | Tip: ${tip.amount.toFixed(2)} | Total: ${totalEarnings.toFixed(2)}`);
    } else {
        showTextBox(`Trip complete! Fare: ${fare.toFixed(2)} | Time: ${tripTimeSec.toFixed(0)}s | No tip (vehicle damaged or slow)`);
    }

    debugEx(
        "FARE",
        `Mission complete! Fare: ${fare.toFixed(2)}, Tip: ${tip.amount.toFixed(2)}, Total: ${totalEarnings.toFixed(2)}, Distance: ${distanceTravelled.toFixed(0)}m, Trip Time: ${tripTimeSec.toFixed(1)}s`
    );

    if (missionData.destination) {
        lastLocation = {...missionData.destination};
    }

    distanceMultiplier = Math.min(distanceMultiplier + 1, 20);

    // FIXED: Follow Vigilante cleanup order - vehicle cleanup BEFORE char cleanup
    // 1. Make passenger leave car first
    if (missionData.passenger && Char.DoesExist(missionData.passenger)) {
        if (missionData.passenger.isInAnyCar()) {
            Task.LeaveAnyCar(missionData.passenger);
            wait(500);
        }

        // 2. Then wander
        Task.WanderStandard(missionData.passenger);
        missionData.passenger.sayAmbientSpeech("TAXI_BAIL", true, true, false);

        // 3. Finally mark as no longer needed
        missionData.passenger.markAsNoLongerNeeded();
        missionData.passenger = null;
    }

    // Clean up blips
    safeRemoveBlip(missionData.pickupBlip);
    safeRemoveBlip(missionData.destinationBlip);

    missionData.pickupBlip = null;
    missionData.destinationBlip = null;

    missionState = TaxiMissionState.Completed;
}

function handleMissionFailure(reason: string): void {
    debugEx("ERROR", `Mission failed: ${reason}`);

    showTextBox(`Taxi mission failed. ${reason}`);
    missionState = TaxiMissionState.Failed;

    // Same cleanup order as completeTaxiMission
    if (missionData.passenger && Char.DoesExist(missionData.passenger)) {
        if (missionData.passenger.isInAnyCar()) {
            Task.LeaveAnyCar(missionData.passenger);
            wait(500);
        }

        Task.WanderStandard(missionData.passenger);
        missionData.passenger.sayAmbientSpeech("TAXI_BAIL", true, true, false);
        missionData.passenger.markAsNoLongerNeeded();
        missionData.passenger = null;
    }

    safeRemoveBlip(missionData.pickupBlip);
    safeRemoveBlip(missionData.destinationBlip);
    missionData.pickupBlip = null;
    missionData.destinationBlip = null;

    distanceMultiplier = 1;
    resetMissionState();
}

function resetMissionState(): void {
    debugEx("STATE", "Resetting mission state");

    missionState = TaxiMissionState.Idle;

    gracePeriodStartTime = -1;
    wasInGracePeriod = false;

    missionData.passenger = null;
    missionData.pickupBlip = null;
    missionData.destinationBlip = null;
    missionData.pickupLocation = null;
    missionData.destination = null;

    Mission.SetFlag(false);
    Mission.TerminateThisScript()
}

// ============================================================================
// MAIN LOOP
// ============================================================================

try {
    while (true) {
        wait(MISSION_CONFIG.LOOP_INTERVAL_MS);

        const player = getPlayerChar();

        if (isPlayerDrivingAnyCar() && player.isInTaxi()) {
            if (wasInGracePeriod && gracePeriodStartTime !== -1) {
                debugEx("STATE", "Player returned to taxi - cancelling grace period");
                gracePeriodStartTime = -1;
                wasInGracePeriod = false;
                lastCountdownDisplayed = -1;
            }

            let promptShown = false;

            while (player.isInTaxi()) {
                wait(MISSION_CONFIG.LOOP_INTERVAL_MS);

                // ========================================================================
                // STATE: Idle
                // ========================================================================
                if (missionState === TaxiMissionState.Idle && !promptShown) {
                    showTextBox("Press E to work as a taxi driver.");
                    promptShown = true;
                }

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
                    } else {
                        wait(1000);
                    }
                }

                // ========================================================================
                // STATE: TakingFare
                // ========================================================================
                if (missionState === TaxiMissionState.TakingFare) {
                    taxiMissionMainLoop();
                }

                // ========================================================================
                // STATE: Completed
                // ========================================================================
                if (missionState === TaxiMissionState.Completed) {
                    wait(MISSION_CONFIG.NEXT_MISSION_DELAY_MS);

                    if (player.isInTaxi()) {
                        missionState = TaxiMissionState.TakingFare;

                        if (startTaxiMission()) {
                            showTextBox(
                                "Next fare found! Go pick up the passenger!"
                            );
                            wait(1000);
                        }
                    } else {
                        debugEx("MISSION", "Player left taxi after completion");
                        resetMissionState();
                    }
                }

                // ========================================================================
                // STATE: Failed
                // ========================================================================
                if (missionState === TaxiMissionState.Failed) {
                    wait(1000);
                    resetMissionState();
                }
            }

            // Grace period handling when player exits taxi
            if (
                missionState !== TaxiMissionState.Idle &&
                missionState !== TaxiMissionState.Completed &&
                missionState !== TaxiMissionState.Failed
            ) {
                if (gracePeriodStartTime === -1) {
                    gracePeriodStartTime = Date.now();
                    wasInGracePeriod = true;
                    debugEx("STATE", "Player exited taxi - starting 25s grace period");
                }

                const timeInGrace = Date.now() - gracePeriodStartTime;
                if (timeInGrace >= MISSION_CONFIG.GRACE_PERIOD_MS) {
                    debugEx("ERROR", "Grace period expired");
                    handleMissionFailure("You left the taxi.");
                    gracePeriodStartTime = -1;
                    wasInGracePeriod = false;
                } else {
                    const remainingSec = Math.ceil(
                        (MISSION_CONFIG.GRACE_PERIOD_MS - timeInGrace) / 1000
                    );
                    if (remainingSec !== lastCountdownDisplayed) {
                        lastCountdownDisplayed = remainingSec;
                        showTextBox(`Get back in the taxi! ${remainingSec}s remaining`);
                    }
                }
            } else {
                gracePeriodStartTime = -1;
                wasInGracePeriod = false;
                lastCountdownDisplayed = -1;
            }
        } else {
            if (
                missionState !== TaxiMissionState.Idle &&
                missionState !== TaxiMissionState.Completed &&
                missionState !== TaxiMissionState.Failed
            ) {
                if (gracePeriodStartTime === -1) {
                    gracePeriodStartTime = Date.now();
                    wasInGracePeriod = true;
                    debugEx("STATE", "Player not in taxi - starting 25s grace period");
                }

                const timeInGrace = Date.now() - gracePeriodStartTime;
                if (timeInGrace >= MISSION_CONFIG.GRACE_PERIOD_MS) {
                    debugEx("ERROR", "Grace period expired");
                    handleMissionFailure("You left the taxi.");
                    gracePeriodStartTime = -1;
                    wasInGracePeriod = false;
                } else {
                    const remainingSec = Math.ceil(
                        (MISSION_CONFIG.GRACE_PERIOD_MS - timeInGrace) / 1000
                    );
                    if (remainingSec !== lastCountdownDisplayed) {
                        lastCountdownDisplayed = remainingSec;
                        showTextBox(`Get back in the taxi! ${remainingSec}s remaining`);
                    }
                }
            } else {
                gracePeriodStartTime = -1;
                wasInGracePeriod = false;
                lastCountdownDisplayed = -1;
            }
        }
    }
} catch (error) {
    // FIXED: Improved error logging with more details
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";

    debugEx("ERROR", `Caught error: ${errorMessage}`);
    if (errorStack) {
        debugEx("ERROR", `Stack: ${errorStack}`);
    }

    log("Error in TaxiMission script: " + errorMessage);

    // Attempt graceful cleanup on error
    try {
        resetMissionState();
    } catch (cleanupError) {
        log("Additional error during cleanup: " + String(cleanupError));
    }

    showTextBox("An error occurred in the Taxi Mission script. Please check the logs.");
}