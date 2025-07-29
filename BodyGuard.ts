import {Key} from ".config/enums";
import {addVec} from "./libs/utils";

let bodyguard: Char;

while (true) {
    wait(100);
    const player = new Player(Player.GetId());

    if (Pad.IsGameKeyboardKeyPressed(Key.K)) {
        log("Key.K pressed");
        showTextBox("Spawning Bodyguard");
        log("Spawning Bodyguard...");
        spawnBodyguard(player, true);
        log("Bodyguard spawn function called");
        wait(1000);
    }

    makeBodyguardFollowPlayer(player);
}

function spawnBodyguard(player: Player, destroyExisting: boolean = true) {
    const pos = addVec(player.getChar().getCoordinates(), {x: 1.0, y: 1.0, z: 0});

    //destroy existing bodyguard if it exists
    if (bodyguard && destroyExisting) {
        log("Destroying existing bodyguard");
        bodyguard.delete();
    }

    // Create the bodyguard
    if (player.getChar().isInAnyCar()) {
        const currentVehicle = player.getChar().getCarIsUsing();
        const seat = currentVehicle.isPassengerSeatFree(-1) ? -1 : 0;
        log(
            `Entering nearest car as passenger: ${currentVehicle.getModel()} at seat: ${seat}`
        )
        bodyguard = Char.CreateRandomAsPassenger(currentVehicle, seat);
    } else {
        bodyguard = Char.CreateRandom(pos.x, pos.y, pos.z);
    }

    if (bodyguard) {
        log("Bodyguard spawned successfully");
        showTextBox("Bodyguard spawned successfully");
        log("Clearing bodyguard tasks and making it follow player");
        bodyguard.clearTasks()

        Task.FollowFootsteps(bodyguard, player.getChar() as int); //hack because it's not right
        //native('GIVE_WEAPON_TO_CHAR', bodyguard, WeaponUzi, 9999, false); // Give bodyguard a weapon (e.g., pistol)
        Blip.AddForChar(bodyguard).setAsFriendly(true)
        // await asyncWait(5000);
        // log("Making bodyguard combat hated targets in area");
        // Task.CombatHatedTargetsInArea(bodyguard, pos.x, pos.y, pos.z, 1000);
    } else {
        log("Failed to spawn Bodyguard");
        showTextBox("Failed to spawn Bodyguard");
    }
}

function makeBodyguardFollowPlayer(player: Player) {
    if (!bodyguard || !Char.DoesExist(bodyguard)) return;

    if (bodyguard.isDead()) {
        wait(1000);
        log("Bodyguard is dead, removing it");
        bodyguard.delete();
        bodyguard = null;
        return;
    }

    const playerChar = player.getChar();
    const isPlayerInCar = playerChar.isInAnyCar();
    const isBodyguardInCar = bodyguard.isInAnyCar();
    const vehicle = playerChar.getCarIsUsing();

    if (isPlayerInCar && !isBodyguardInCar) {
        log("Making bodyguard enter car as passenger");
        bodyguard.clearTasks();

        const isDriverSeatFree = vehicle.isPassengerSeatFree(-1);
        log(`Is driver seat free: ${isDriverSeatFree}`);
        const isPlayerDriving = !isDriverSeatFree;

        if (isPlayerDriving) {
            log("Player is driving the car, bodyguard will enter as passenger");
            Task.EnterCarAsPassenger(bodyguard, vehicle, 10000, -2);
        } else {
            log("Player is not driving the car, bodyguard will enter as driver");
            Task.EnterCarAsDriver(bodyguard, vehicle, 10000);
            wait(10000)
            Task.CarDriveWander(bodyguard, vehicle, 10000, 3);
        }

        // wait(10000); // wait for the bodyguard to enter the car
    } else if (!isPlayerInCar && isBodyguardInCar) {
        log("Making bodyguard leave car and follow player");
        log(`isPlayerInCar: ${isPlayerInCar}, isBodyguardInCar: ${isBodyguardInCar}`);
        bodyguard.clearTasks();
        Task.LeaveAnyCar(bodyguard);
        Task.FollowFootsteps(bodyguard, player.getChar() as int); //hack because it's not right
        // wait(10000); // wait for the bodyguard to leave the car
    }
}