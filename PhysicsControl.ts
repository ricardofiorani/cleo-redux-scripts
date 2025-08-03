import {Key} from ".config/enums";
import {getPlayer, getPlayerChar} from "./libs/player";
import {applyForce} from "./libs/physics";
import {addParticleFXToChar, stopParticleFxOnChar} from "./libs/utils";
import {Bone} from "./libs/bone";

let forceStrength = 60;
let particlesPointer;
let isSlowMoEnabled = false;

log(JSON.stringify(Camera, null, 2));

while (true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.NumpadPlus)) {
        forceStrength += 1;
        showTextBox(`Force strength increased to: ${forceStrength}`);
    } else if (Pad.IsGameKeyboardKeyPressed(Key.NumpadMinus)) {
        forceStrength = Math.max(1, forceStrength - 1);
        showTextBox(`Force strength decreased to: ${forceStrength}`);
    }

    // Special forces num pad keys check
    if (getPlayerChar().isInAnyCar()) {
        // Vehicle physics control
        const currentVehicle = getPlayerChar().getCarIsUsing();
        vehiclePhysicsControl(currentVehicle, forceStrength);
    } else {
        flashMode(getPlayerChar(), forceStrength);
    }
}

function vehiclePhysicsControl(currentVehicle: Car, forceStrength: number) {
    applyForce(currentVehicle, false, forceStrength);
}

function flashMode(playerChar: Char, forceStrength: number) {
    const disableSlowMo = (disableInvincibility: boolean) => {
        if(particlesPointer) {
            stopParticleFxOnChar(particlesPointer);
            particlesPointer = null;
            log("Particle effect stopped and pointer reset.");
        }

        Clock.SetTimeScale(1.0);
        playerChar.setGravity(1.0);
        playerChar.setMoveAnimSpeedMultiplier(1.0);
        native("SET_TIMECYCLE_MODIFIER", "NORMAL");
        disableInvincibility && playerChar.setInvincible(false);

        wait(50);
    }
    const enableSlowMo = (disableInvincibility: boolean) => {
        !particlesPointer && (() => {
            particlesPointer = addParticleFXToChar(playerChar, "water_carwash_drips", Bone.Head)
            if (particlesPointer === 0) {
                log("Failed to add particle effect to player character");
            } else {
                log(`Particle effect added with pointer: ${particlesPointer}`);
            }
        })();
        Clock.SetTimeScale(0.1);
        playerChar.setGravity(0.1);
        playerChar.setMoveAnimSpeedMultiplier(5);
        native("SET_TIMECYCLE_MODIFIER", "harlemprojects");
        disableInvincibility && playerChar.setInvincible(true);

        wait(50);
    }

    if(playerChar.isRagdoll()){
        disableSlowMo(false);
        return;
    }

    // Function to check where to apply the force on the player character
    const wasForceApplied = applyForce(playerChar, false, forceStrength * 10);

    // If targeting or force was applied, make it slow motion
    if (getPlayer().isTargettingAnything() || wasForceApplied) {
        enableSlowMo(false);
        isSlowMoEnabled = true;
    } else {
        disableSlowMo(!playerChar.isRagdoll());
        isSlowMoEnabled = false;
    }
}

