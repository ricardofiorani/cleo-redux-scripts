/**
 * This script allows you to manually toggle the ragdoll state of the player character
 * and make the player invincible while in ragdoll or air state.
 *
 * Press Numpad9 to toggle ragdoll state.
 */

import {Key} from "./.config/enums";
import {getPlayer, getPlayerChar} from "./libs/player";

/**
 * Configurable options
 */
const invencibleWhenRagdollOrAir = true; // Set to true if you want the player to be invincible while in ragdoll state


let isInvincible = false;
let isInRagdollAlready = false;

while (true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad9)) {
        const playerChar = getPlayerChar();

        if (!playerChar.isRagdoll()) {
            log("Entering ragdoll state");
            playerChar.switchToRagdoll(-1, 0, false, false, false, false);
        } else {
            log("Exiting ragdoll state");
            playerChar.switchToAnimated(false);
        }
    }

    invencibleWhenRagdollOrAir && makeCharInvincibleIfInAirOrRagdoll().catch(log);
}

async function makeCharInvincibleIfInAirOrRagdoll() {
    const isInAirOrRagdoll = getPlayerChar().isInAir() || getPlayerChar().isRagdoll();

    if (isInAirOrRagdoll) {
        isInvincible = true;
    } else if (!isInAirOrRagdoll && isInvincible) {
        isInvincible = false;
    } else {
        // This is just to ensure we reset the invincibility state
        isInvincible = false;
    }

    // To ensure we only display the log message when the state changes
    if (isInRagdollAlready && !isInAirOrRagdoll) {
        log("Player is not in ragdoll, disabling invincibility");
    } else if (!isInRagdollAlready && isInAirOrRagdoll) {
        log("Player is in ragdoll, enabling invincibility");
    }

    isInRagdollAlready = isInAirOrRagdoll;
    getPlayer().setInvincible(isInvincible);
    getPlayer().getChar().enableHelmet(true);
}