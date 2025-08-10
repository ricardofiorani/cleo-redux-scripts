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

export function loadAnims(animsGroup: string) {
    native("REQUEST_ANIMS", animsGroup);

    while (!native<boolean>("HAVE_ANIMS_LOADED", animsGroup)) {
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

type ETAResult = {
    seconds: number,
    toString: () => string
}

export function getETA(distance: number, speedMph: number): ETAResult {
    const speedMps = speedMph * 0.44704; // mph → m/s

    const seconds =
        speedMps > 0 ? distance / speedMps : Infinity;

    return {
        seconds,
        toString() {
            if (!isFinite(seconds)) return "ETA: ∞";
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `ETA: ${minutes}m ${remainingSeconds}s`;
        }
    };
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
 * 6.	integer	Include mission cars (usually 1)
 * 7.	integer	id of the car
 * Return value:
 * Type	Description
 * None
 * @param char
 * @param radius
 */
export function getNearestCarInRadius(char: Char, radius: number): Car | null {
    const coords = char.getCoordinates();
    const carId = native<int>(
        "GET_RANDOM_CAR_IN_SPHERE_NO_SAVE",
        coords.x, coords.y, coords.z,
        radius,
        0, // model hash filter
        1  // include mission cars
    );

    const car = new Car(carId);
    return Car.DoesExist(car) ? car : null;
}

/**
 * Finds the nearest car to a character, expanding the search radius until found.
 */
export function getNearestCarToChar(char: Char, startRadius = 2.5, maxRadius = 50, step = 2.5): Car | null {
    let radius = startRadius;
    let car: Car | null = null;

    while (radius <= maxRadius && !car) {
        car = getNearestCarInRadius(char, radius);
        radius += step;
    }

    return car;
}

/**
 * Gets the car the character is touching, default radius small for accuracy.
 */
export function getCarThatCharIsTouching(char: Char, radius = 2.5): Car | null {
    const car = getNearestCarInRadius(char, radius);

    if (car && char.isTouchingVehicle(car)) {
        log(`Touching ${getVehicleNameFromHash(car.getModel() as number)} with id ${car.valueOf()}`);
        return car;
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

export function getNearestCharFromArea(coords: Vector3, maxRadius: number = 500): Char | null {
    let startingRadius = 5;

    while (startingRadius <= maxRadius) {
        const foundChar = World.GetRandomCharInAreaOffsetNoSave(
            coords.x, coords.y, coords.z,
            startingRadius, startingRadius, startingRadius
        );

        if (foundChar && foundChar.valueOf() != 0) {
            log(`Found character with ID: ${foundChar.valueOf()} within radius ${startingRadius}`);
            return foundChar;
        }

        startingRadius += 2; // Increase the search radius
        wait(10);
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