/**
 * Vehicle Spawner Script
 * This script allows the player to spawn vehicles in the game.
 * Press L to spawn the current vehicle, Comma to cycle to the previous vehicle, and Period to cycle to the next vehicle.
 */

import {Key} from ".config/enums";
import {addVec, loadModel} from "./libs/utils";
import {getVehicleNameFromHash, vehicles} from "./libs/vehicleList";
import {getPlayerCoords} from "./libs/player";

let lastSpawnedVehicle: Car;
let currentSpawnableVehicleIndex = 0;

while (true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.L)) {
        log("Key.L pressed");
        const vehicleName = Array.from(vehicles.keys())[currentSpawnableVehicleIndex]
        const currentVehicleToBeSpawned = vehicles.get(vehicleName);
        showTextBox(`Spawning ${vehicleName}`);
        log(`Spawning ${vehicleName}...`);
        lastSpawnedVehicle = spawnVehicle(getPlayerCoords(), currentVehicleToBeSpawned);
        log("Vehicle spawn function called");
        lastSpawnedVehicle.markAsNoLongerNeeded(); // Mark the vehicle as no longer needed so it can be garbage collected
        wait(2000);
    }

    if (Pad.IsGameKeyboardKeyPressed(Key.Comma)) {
        currentSpawnableVehicleIndex = --currentSpawnableVehicleIndex;

        if (currentSpawnableVehicleIndex < 0) {
            currentSpawnableVehicleIndex = vehicles.size - 1; // Wrap around to the last vehicle
        }

        const vehicleName = Array.from(vehicles.keys())[currentSpawnableVehicleIndex]

        showTextBox(`To be Spawned ${currentSpawnableVehicleIndex} - ${vehicleName}`);
    }

    if (Pad.IsGameKeyboardKeyPressed(Key.Period)) {
        currentSpawnableVehicleIndex = ++currentSpawnableVehicleIndex;

        if (currentSpawnableVehicleIndex >= vehicles.size) {
            currentSpawnableVehicleIndex = 0; // Wrap around to the first vehicle
        }

        const vehicleName = Array.from(vehicles.keys())[currentSpawnableVehicleIndex]

        showTextBox(`To be Spawned ${currentSpawnableVehicleIndex} - ${vehicleName}`);
    }
}

function spawnVehicle(at: Vector3, modelId: number): Car {
    const vehicleName = getVehicleNameFromHash(modelId);
    loadModel(modelId);
    const pos = addVec(at, {x: -2.0, y: -2.0, z: 0});
    const vehicle = Car.Create(modelId, pos.x, pos.y, pos.z);
    vehicle.setWatertight(true);

    if (vehicle) {
        log(`${modelId} - ${vehicleName} spawned successfully`);
        showTextBox(`${modelId} - ${vehicleName} spawned successfully`);
    } else {
        log(`Failed to spawn ${modelId} - ${vehicleName}`);
        showTextBox(`Failed to spawn ${modelId} - ${vehicleName}`);
    }

    return vehicle;
}