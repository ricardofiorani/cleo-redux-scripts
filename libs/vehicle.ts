export function driveToCoords(char: Char, vehicle: Car, coords: Vector3, speed: number = 70.0, obeyTraffic: boolean = false): void {
    if(!Char.DoesExist(char) || !Car.DoesExist(vehicle) || char.isDead()) {
        log(`driveToCoords: Invalid character or vehicle. Char ID: ${char.valueOf()}, Vehicle ID: ${vehicle.valueOf()}`);
        return;
    }

    log(`driveToCoords: Char ID: ${char.valueOf()}, Vehicle ID: ${vehicle.valueOf()}, Coords: ${coords}, Speed: ${speed}, Obey Traffic: ${obeyTraffic}`);

    char.clearTasks();
    char.setKeepTask(true);
    char.setFlyThroughWindscreen(false);
    char.setInvincible(true);

    Task.CarMissionCoorsTargetNotAgainstTraffic(
        char,
        vehicle,
        coords.x,
        coords.y,
        coords.z,
        4,
        speed,
        obeyTraffic ? 1 : 2,
        5,
        10
    );
}

export function getFreePassengerSeat(vehicle: Car): number {
    const maxPassengers = vehicle.getMaximumNumberOfPassengers();

    for (let seat = 0; seat < maxPassengers; seat++) {
        if(vehicle.isPassengerSeatFree(seat)) {
            return seat;
        }
    }

    return -2;
}