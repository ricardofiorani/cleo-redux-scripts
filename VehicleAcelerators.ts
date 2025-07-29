/**
 * Vehicle Acelerators
 * This script allows the player to apply forces to their character or vehicle using the numpad keys.
 * Press Numpad Plus to increase force strength, Numpad Minus to decrease it.
 * Use Numpad 8, 2, 4, 6, and 5 to apply forces in different directions.
 */

import {Key} from ".config/enums";

let forceStrength = 60;


while (true) {
    wait(100);
    const player = new Player(Player.GetId());

    if (Pad.IsGameKeyboardKeyPressed(Key.NumpadPlus)) {
        forceStrength += 1;
        showTextBox(`Force strength increased to: ${forceStrength}`);
    } else if (Pad.IsGameKeyboardKeyPressed(Key.NumpadMinus)) {
        forceStrength = Math.max(1, forceStrength - 1);
        showTextBox(`Force strength decreased to: ${forceStrength}`);
    }

    // Special forces num pad keys check
    if (player.getChar().isInAnyCar()) {
        const currentVehicle = player.getChar().getCarIsUsing();
        applyForce(currentVehicle);
    } else {
        const currentChar = player.getChar();
        applyForce(currentChar);
    }
}


function applyForce(charOrVehicle: Char | Car, isInTheAir: boolean = false) {
    const isChar = charOrVehicle instanceof Char;

    // otherwise the vehicle will fly away
    const forceFactor = isChar ? forceStrength : forceStrength / 10;

    const forces = {
        x: 0,
        y: 0,
        z: 0,
    }

    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad8))
        forces.z = forceFactor;
    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad2))
        forces.z = -forceFactor;
    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad4))
        forces.x = -forceFactor;
    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad6))
        forces.x = forceFactor;
    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad5))
        forces.y = forceFactor;

    if (forces.x !== 0 || forces.y !== 0 || forces.z !== 0) {
        log(`Applying forces: X=${forces.x}, Y=${forces.y}, Z=${forces.z}`);
        //    applyForce(_p2: int, x: float, y: float, z: float, spinX: float, spinY: float, spinZ: float, _p9: int, _p10: int, _p11: int, _p12: int): Car;
        charOrVehicle.applyForce(
            1, // p2
            forces.x,//forward.x * forceFactor, // X
            forces.y, //forward.y * forceFactor, // Y
            forces.z, // Z
            0.0, // Spin X
            0.0, // Spin Y
            0.0, // Spin Z
            1,  // _p9 Unknown, suggested: true
            isInTheAir ? 0 : 1, // IsForceDirectionRelative
            1, //Unknown, suggested: true
            1 //Unknown, suggested: true

        );
    }
}


