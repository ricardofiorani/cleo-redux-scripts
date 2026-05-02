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

/**
 * Check if the player is driving/riding in a taxi vehicle
 */
export function isPlayerInTaxi(): boolean {
    const playerChar = getPlayerChar();
    
    if (!playerChar.isInAnyCar()) {
        return false;
    }
    
    const car = playerChar.getCarIsUsing();
    if (!car || !Car.DoesExist(car)) {
        return false;
    }
    
    // Check if the vehicle model is a taxi (either TAXI or TAXI2)
    const model = car.getModel();
    const TAXI_HASH = 3338918751; // taxi
    const TAXI2_HASH = 1208856469; // taxi2
    
    return model === TAXI_HASH || model === TAXI2_HASH;
}

/**
 * Check if a char is inside a taxi
 */
export function isCharInTaxi(char: Char): boolean {
    if (!char.isInAnyCar()) {
        return false;
    }
    
    const car = char.getCarIsUsing();
    if (!car || !Car.DoesExist(car)) {
        return false;
    }
    
    const model = car.getModel();
    const TAXI_HASH = 3338918751; // taxi
    const TAXI2_HASH = 1208856469; // taxi2
    
    return model === TAXI_HASH || model === TAXI2_HASH;
}