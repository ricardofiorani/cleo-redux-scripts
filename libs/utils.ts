export function addVec(v1: Vector3, v2: Vector3) {
    return {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z};
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