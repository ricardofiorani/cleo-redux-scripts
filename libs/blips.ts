export const BlipTypes = {
    Waypoint: 8,
    Player: 1,
    Vehicle: 2,
    Object: 3,
    Pickup: 4,
    Radar: 5,
    Cops: 6,
    Cops2: 7,
    MissionCreator: 9,
    RemotePlayer: 10,
    RemoteVehicle: 11,
    ScriptedMission: 12,
    JobObject: 13,
    JobVehicle: 14
}

// Integer	Color
// 0	White
// 1	Red
// 2	Green
// 3	Blue (changes blip text to "Friend")
// 4	Black
// 5	Magenta
// 6	Orange
// 7	Violet
// 8	Bright Green
// 9	Bright Red
// 10	Dark pink
// 11	Dark orange
// 12	Teal
// 13	Cyan
// 14	Light yellow
// 15	Dark green
// 16	Purple
// 17	Light purple
// 18	Light orange
// 19	Yellow

export const BlipColors = {
    White: 0,
    Red: 1,
    Green: 2,
    Blue: 3, // changes blip text to "Friend"
    Black: 4,
    Magenta: 5,
    Orange: 6,
    Violet: 7,
    BrightGreen: 8,
    BrightRed: 9,
    DarkPink: 10,
    DarkOrange: 11,
    Teal: 12,
    Cyan: 13,
    LightYellow: 14,
    DarkGreen: 15,
    Purple: 16,
    LightPurple: 17,
    LightOrange: 18,
    Yellow: 19
}

let blips: Blip[] = [];
let charBlips = new Map<Char, Blip>();

export function addBlipForChar(char: Char, color: number, name: string): Blip {
    const blip = Blip.AddForChar(char)
        .flash(true)
        .changeColor(color)
        .changeNameFromAscii(name);

    charBlips.set(char, blip);
    charBlipGarbageCollection();

    return blip;
}

export function removeBlipForChar(char: Char): void {
    const blip = charBlips.get(char);

    if (blip && Blip.DoesExist(blip.valueOf() as number)) {
        blip.remove();
    }

    charBlips.delete(char);
    charBlipGarbageCollection()
}

function charBlipGarbageCollection() {
    charBlips.forEach((blip, char) => {
        if (!Char.DoesExist(char)) {
            removeBlipForChar(char)
        }
    });
}

export function addTestBlip(node: any, color: number, name: string): Blip {
    if (!node) {
        log(`Node is undefined or null for blip ${name}`);
        return;
    }

    log(`Adding test blip ${name} with color ${color} : ${node}`);
    let blipCoords: Vector3 = node; // We assume by default that node is a Vector3

    if (node?.pResX !== undefined) {
        blipCoords = {
            x: node.pResX,
            y: node.pResY,
            z: node.pResZ
        };
    }

    const blip = createBlip(blipCoords, color, name);
    blips.push(blip);
}

export function cleanupTestBlips() {
    blips.forEach(blip => {
        if (blip && Blip.DoesExist(blip.valueOf() as number)) {
            blip.remove();
        }
    });
    blips = [];
}

export function createBlip(vector: Vector3, color: number, name: string): Blip {
    return Blip.AddForCoord(vector.x, vector.y, vector.z)
        .flash(true)
        .changeColor(color)
        .changeNameFromAscii(name);
}

export function getWaypointBlip(): Blip | null {
    return getBlipByType(BlipTypes.Waypoint);
}

// Priority order for mission/storyline blips (higher number = higher priority)
export const MissionBlipPriority = {
    [BlipTypes.ScriptedMission]: 5,  // Story mission objectives
    [BlipTypes.JobObject]: 4,        // Job/objectives
    [BlipTypes.JobVehicle]: 3,       // Job vehicles
    [BlipTypes.Radar]: 2,            // Generic radar blips
    [BlipTypes.Waypoint]: 1,          // Manual waypoint (lowest priority)
};

/**
 * Get the blip type using GET_BLIP_INFO_ID_TYPE native
 */
export function getBlipType(blipHandle: number): number {
    return native<number>("GET_BLIP_INFO_ID_TYPE", blipHandle);
}

/**
 * Get all active mission blips (excludes waypoint, returns priority mission blips first)
 * Uses index 0 to get all blips, then filters by type
 */
export function getMissionBlip(): Blip | null {
    let highestPriorityBlip: Blip | null = null;
    let highestPriority = 0;

    // Iterate through all blips using index 0 (not filtered by type)
    let blipHandle = native<number>("GET_FIRST_BLIP_INFO_ID", 0);
    
    while (blipHandle !== 0) {
        if (native<boolean>("DOES_BLIP_EXIST", blipHandle)) {
            const blipType = getBlipType(blipHandle);
            const priority = MissionBlipPriority[blipType] || 0;
            
            if (priority > highestPriority) {
                highestPriority = priority;
                highestPriorityBlip = new Blip(blipHandle);
            }
        }
        
        blipHandle = native<number>("GET_NEXT_BLIP_INFO_ID", 0);
    }

    return highestPriorityBlip;
}

/**
 * Get any active blip on the map (mission or waypoint)
 * Priority: Mission blips first, then waypoint
 */
export function getAnyActiveBlip(): { blip: Blip | null; isWaypoint: boolean } {
    // First, try to find a mission blip
    const missionBlip = getMissionBlip();
    if (missionBlip) {
        return { blip: missionBlip, isWaypoint: false };
    }

    // Fall back to waypoint
    const waypointBlip = getWaypointBlip();
    if (waypointBlip) {
        return { blip: waypointBlip, isWaypoint: true };
    }

    return { blip: null, isWaypoint: false };
}

/**
 * Get coordinates from any active blip, with priority for mission blips
 */
export function getAutoNavigationCoords(): Vector3 | null {
    const { blip, isWaypoint } = getAnyActiveBlip();
    
    if (!blip) {
        return null;
    }

    const coords = blip.getCoordinates();
    
    // Check if coords are valid (not at origin)
    if (coords.x === 0 && coords.y === 0 && coords.z === 0) {
        return null;
    }

    return coords;
}

export function getBlipByType(blipType: number): Blip | null {
    const blipHandle = native<number>("GET_FIRST_BLIP_INFO_ID", blipType);

    if (blipHandle === 0) {
        return null;
    }

    return new Blip(blipHandle);
}

export function safeRemoveBlip(blip: Blip | null): void {
    if (blip && Blip.DoesExist(blip.valueOf() as number)) {
        blip.remove();
    }
}