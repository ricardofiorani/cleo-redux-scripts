import {getWaypointBlip} from "./blips";

export function getWaypointCoords(): Vector3 | null {
    const waypointBlip = getWaypointBlip();
    if (!waypointBlip) {
        return null;
    }

    const coords = waypointBlip.getCoordinates();

    if (coords.x === 0 && coords.y === 0 && coords.z === 0) {
        return null;
    }

    return coords;
}

export function isWaypointSet(): boolean {
    const waypointBlip = getWaypointBlip();
    return waypointBlip !== null && Blip.DoesExist(waypointBlip.valueOf() as number);
}
