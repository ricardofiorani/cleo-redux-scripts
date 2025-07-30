import {loadModel} from "./utils";
import {getFreePassengerSeat} from "./vehicle";

export function spawnChar(char: string, pos: Vector3, group: number): Char | null {
    const model = Text.GetHashKey(char);
    loadModel(model);
    const character = Char.Create(group, model, pos.x, pos.y, pos.z);
    character.markAsNoLongerNeeded();

    return character;
}

export function spawnCharInVehicle(char: string, group: number, car: Car): Char | null {
    const model = Text.GetHashKey(char);
    loadModel(model);
    const seat = getFreePassengerSeat(car);
    const character = Char.CreateAsPassenger(car, group, model, seat);
    character.markAsNoLongerNeeded();

    return character;
}

export function giveCharWeapon(char: Char, weapon: number, ammo: number = 9999): void {
    if (!char || !Char.DoesExist(char)) {
        log("Character does not exist or is invalid");
        return;
    }

    if (ammo < 0) {
        log("Ammo cannot be negative");
        return;
    }

    log('Giving weapon to character:', char.valueOf(), 'Weapon:', weapon, 'Ammo:', ammo);
    char.giveDelayedWeapon(weapon, ammo, true)
    char.setCurrentWeaponVisible(true);
}