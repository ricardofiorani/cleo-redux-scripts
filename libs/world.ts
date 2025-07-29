export function getMapAreaFromCoords(coords: Vector3): int {
    return native<int>("GET_MAP_AREA_FROM_COORDS", coords.x, coords.y, coords.z);
}

export function getDriveableCarNodeFromCoords(coords: Vector3, node: number = 1): Vector3 {
    const destinationZoneId = getMapAreaFromCoords(coords);
    const closestPath = Path.GetNthClosestCarNodeWithHeadingOnIsland(coords.x, coords.y, coords.z, node, destinationZoneId)

    return {
        x: closestPath?.pResX ?? coords.x,
        y: closestPath?.pResY ?? coords.y,
        z: closestPath?.pResZ ?? coords.z
    };
}