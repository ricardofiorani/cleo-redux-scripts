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