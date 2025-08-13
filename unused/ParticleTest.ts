import {Key} from "../.config/enums";
import {addVec} from "../libs/utils";
import {Bone} from "../libs/bone";

let objectId: ScriptObject;

while (true) {
    wait(100);

    const player = new Player(Player.GetId());
    const playerChar = player.getChar();
    const isPlayerInAnyCar = playerChar.isInAnyCar();

    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad1)) {
        // if (!objectId) {
        //     const {x, y, z} = addVec(playerChar.getCoordinates(), {x: 0, y: 0, z: -1});
        //     objectId = ScriptObject.Create(3393365278, x, y, z);
        //     log(`Created new object with ID: ${objectId.valueOf()}`);
        // }
        //
        // // emitterObject = newObject.attachToPed(playerChar, Bone.LeftFoot, 0, 0, 0, 0, 0, 0, 0);
        //
        // log(`Triggering particle effect on object with ID: ${objectId.valueOf()}`);
        // const particleOnObject = native<int>("START_PTFX_ON_OBJ", "break_sparks", objectId, 0, 0, 0, 0, 0, 0, 1.0);
        // log(`Particle effect started on object with pointer: ${particleOnObject}`);
        // if (!particleOnObject) {
        //     log("Failed to start particle effect on object");
        //     continue;
        // }
        // continue;


        log(`Last damage bone: ${playerChar.getLastDamageBone()}`);
        log("Key Numpad1 pressed, starting particle effect test");
        log(`Player character ID: ${playerChar.valueOf()}`);
        log(`Is player in any car: ${isPlayerInAnyCar}`);
        log(`Player coordinates: ${JSON.stringify(playerChar.getCoordinates())}`);
        log(`Player vehicle ID: ${isPlayerInAnyCar ? playerChar.getCarIsUsing().valueOf() : 'N/A'}`);

        let particleEffectName = 'dest_plastic';
        log(`Using particle effect: ${particleEffectName}`);

        let nativeFunctionName = isPlayerInAnyCar ? "TRIGGER_PTFX_ON_VEH" : "TRIGGER_PTFX_ON_PED";
        const particleId = native<int>(nativeFunctionName, particleEffectName, isPlayerInAnyCar ? playerChar.getCarIsUsing() : playerChar, 0, 0, 0, 0, 0, 0, 10.0);

        log(`Particle effect started with pointer: ${particleId}`);

        if (!particleId) {
            log(`Failed to start particle effect on ${isPlayerInAnyCar ? 'vehicle' : 'ped'}`);
            log(`Native function used: ${nativeFunctionName}`);
            continue;
        }

        log("Waiting for 3 seconds before updating particle effect offsets");
        // wait(3000);
        //
        // for (let i = 0; i < 360; i++) {
        //     native("UPDATE_PTFX_OFFSETS", particle, 0, 0, 1.0, 0, i, 0);
        //     log(`Updated particle effect offsets for rotation: ${i}`);
        //     wait(50)
        // }
        //
        // log("Waiting for 1 second before stopping particle effect");
        log("Stopping particle effect");
        native("STOP_PTFX", particleId);
        log("Particle effect test completed");
    }
}