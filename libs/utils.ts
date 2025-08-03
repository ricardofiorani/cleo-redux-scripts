import {getVehicleNameFromHash, vehicles} from "./vehicleList";
import {getPlayer, getPlayerChar} from "./player";
import {Bone} from "./bone";

export function addVec(v1: Vector3, v2: Vector3) {
    return {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z};
}

export function scaleVec(vec: Vector3, scalar: number): Vector3 {
    return { x: vec.x * scalar, y: vec.y * scalar, z: vec.z * scalar };
}

export function loadModel(modelId: number) {
    Streaming.RequestModel(modelId);

    while (!Streaming.HasModelLoaded(modelId)) {
        wait(100);
    }
}

export function getDistanceBetweenTwoVectors(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function getStreetNameFromCoords(coords: Vector3): string {
    type Result = {
        strHash0: int,
        strHash1: int
    }

    const streetData = native<Result>('FIND_STREET_NAME_AT_POSITION', coords.x, coords.y, coords.z);
    const streetName0 = native<string>('GET_STRING_FROM_HASH_KEY', streetData.strHash0).trim();
    const streetName1 = native<string>('GET_STRING_FROM_HASH_KEY', streetData.strHash1).trim();

    if (streetName0.length === 0) {
        return streetName1;
    }

    return streetName1.length === 0 ? streetName0 : `${streetName0}, ${streetName1}`;
}

export function getETA(distance: number, speedMph: number): string {
    const speedMps = speedMph * 0.44704; // Convert mph to meters per second

    if (speedMps <= 0) return "ETA: ∞";

    const etaSeconds = distance / speedMps;
    const etaMinutes = Math.floor(etaSeconds / 60);
    const etaRemainingSeconds = Math.floor(etaSeconds % 60);

    return `ETA: ${etaMinutes}m ${etaRemainingSeconds}s`;
}

export function isTouchingAnyCar(char: Char): boolean {
    return getCarThatCharIsTouching(char) !== null;
}

/**
 * GET_RANDOM_CAR_IN_SPHERE_NO_SAVE
 * Number of parameters: 7
 * Parameter #	Type	Description
 * 1.	float	X-Coordinate
 * 2.	float	Y-Coordinate
 * 3.	float	Z-Coordinate
 * 4.	float	Radius
 * 5.	integer	Model hash (actually 0, but you can pick hash of car model)
 * 6.	integer	Unknown (usually 1)
 * 7.	integer	id of the car
 * Return value:
 * Type	Description
 * None
 * @param char
 */

export function getCarThatCharIsTouching(char: Char): Car | null {
    const coords = char.getCoordinates();
    const nearestCarId = native<int>("GET_RANDOM_CAR_IN_SPHERE_NO_SAVE", coords.x, coords.y, coords.z, 2.5, 0, 1);
    const nearestCar = new Car(nearestCarId);

    if (char.isTouchingVehicle(nearestCar)) {
        log(`touching ${getVehicleNameFromHash(nearestCar.getModel() as number)} with id ${nearestCar.valueOf()}`);
    }

    if (Car.DoesExist(nearestCar)) {
        return nearestCar;
    }

    return null;
}

export function getCharGettingTargetedByPlayer(): Char | null {
    if (!getPlayer().isTargettingAnything()) {
        return null; // Player is not targeting anything
    }

    const pos = getPlayerChar().getCoordinates();
    // Exponentially search for a character in a 3D area around the character's position
    let currentRadius = 5;
    let maxRadius = 500;

    while (currentRadius <= maxRadius) {
        const foundChar = World.GetRandomCharInAreaOffsetNoSave(
            pos.x, pos.y, pos.z,
            currentRadius, currentRadius, currentRadius
        );

        if (foundChar && getPlayer().isTargettingChar(foundChar)) {
            log(`Found character with ID: ${foundChar.valueOf()} within radius ${currentRadius}`);
            return foundChar;
        }

        currentRadius += 0.1; // Increase the search radius
        wait(100);
    }

    log(`No character found within the maximum search radius of ${maxRadius} units.`);
    return null; // No character found within the search radius
}

export function addParticleFXToChar(playerChar: Char, fxName: string, bone: Bone): number {
    log(`Adding particle effect ${fxName} to character with ID: ${playerChar.valueOf()} at bone: ${bone}`);

    return native<int>("START_PTFX_ON_PED_BONE", fxName, getPlayerChar(), 0, 0, 0, 0, 0, 0, bone, 1.0)
}


export function stopParticleFxOnChar(particlesPointer: number): void {
    native("STOP_PTFX", particlesPointer)
}