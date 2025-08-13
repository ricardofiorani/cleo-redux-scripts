let player: Player;

/**
 * Singleton function to get the player instance.
 */
export function getPlayer(): Player {
    if (!player) {
        player = new Player(Player.GetId());
    }

    return player;
}

export function getPlayerChar(): Char {
    return getPlayer().getChar();
}

export function isPlayerInAnyCar(): boolean {
    return getPlayerChar().isInAnyCar();
}

export function isPlayerDrivingAnyCar(): boolean {
    if (!isPlayerInAnyCar()) {
        return false;
    }

    const car = getPlayerChar().getCarIsUsing();

    if (!Car.DoesExist(car)) {
        return false;
    }

    const playerChar = getPlayerChar();
    return car.getDriver().valueOf() === playerChar.valueOf();
}

export function getPlayerCurrentVehicle(): Car | null {
    const playerChar = getPlayerChar();

    if (isPlayerInAnyCar() && Car.DoesExist(playerChar.getCarIsUsing())) {
        return playerChar.getCarIsUsing();
    }

    return null;
}

export function getPlayerCoords(): Vector3 {
    return getPlayerChar().getCoordinates();
}

export function isPlayerInAnyVehicle(): boolean {
    const playerChar = getPlayerChar();
    return playerChar.isInAnyCar() || playerChar.isInAnyHeli() || playerChar.isInAnyPlane() || playerChar.isInAnyBoat();
}