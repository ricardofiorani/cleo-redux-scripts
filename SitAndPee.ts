/**
 * Press 1 to Sit
 * Press 3 to Pee
 * Press again to stop/get up
 */

import {Key} from ".config/enums";
import {getPlayerChar} from "./libs/player";

type PeeingState = {
    ptfxId: number;
    soundId: number;
    isPeeing: boolean;
}

let isSitting = false;
let peeState: PeeingState = {
    ptfxId: 0,
    soundId: 0,
    isPeeing: false
}


while (true) {
    wait(100);

    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad1)) {
        if (isSitting) {
            log("Numpad 1 pressed - Getting up");
            showTextBox("Getting up");
            isSitting = false;
            getPlayerChar().clearTasks();
            getPlayerChar().clearSecondaryTask();
            getPlayerChar().setKeepTask(false);
        } else {
            log("Numpad 1 pressed - Sitting down");
            showTextBox("Sitting down");

            const {x, y, z} = getPlayerChar().getCoordinates();
            const heading = getPlayerChar().getHeading();
            const invertedAngle = (heading + 180) % 360;

            // How far forward to place the "seat" (in meters)
            const forwardOffset = 0.2; // adjust this value as needed

            // Convert heading (degrees) to radians
            const rad = heading * Math.PI / 180;

            // Calculate forward offset coordinates
            const seatX = x + Math.sin(rad) * forwardOffset;
            const seatY = y + Math.cos(rad) * forwardOffset;

            Task.SitDownOnSeat(getPlayerChar(), 0, 0, seatX, seatY, z, invertedAngle, -2);

            log(`Player character ID: ${getPlayerChar().valueOf()}`);
            log(`Player coordinates: ${JSON.stringify(getPlayerChar().getCoordinates())}`);
            log(`Player heading: ${heading}`);
            log(`Inverted angle for sit down: ${invertedAngle}`);
            isSitting = true;
        }
        wait(1000); // Prevents rapid toggling
    }

    if (Pad.IsGameKeyboardKeyPressed(Key.Numpad3)) {
        if (peeState.isPeeing) {
            log("Numpad 3 pressed - Stopping pee");
            showTextBox("Stopping pee");
            peeState = {
                ptfxId: native('STOP_PTFX', peeState.ptfxId) ?? 0,
                soundId: native('STOP_SOUND', peeState.soundId) ?? 0,
                isPeeing: false
            }
        } else {
            log("Numpad 3 pressed - Starting pee");
            showTextBox("Starting pee");
            peeState = {
                ptfxId: native<int>("START_PTFX_ON_PED_BONE", "ped_pissing", getPlayerChar(), 0, 0, 0, (3.142 * 270) / 180, 0, 0, 417, 1065353216),
                soundId: native<int>("GET_SOUND_ID"),
                isPeeing: true
            }

            log(`Peeing state: ${JSON.stringify(peeState)}`);
            Task.PlayAnim(getPlayerChar(), "piss_loop", "missjacob2", 4.0, true, false, false, false, -1);

            native("PLAY_SOUND_FROM_PED", peeState.soundId, 'LJ2_FOLLOW_PED_TO_KILL_PISSING', getPlayerChar());
        }

        wait(1000); // Prevents rapid toggling
    }
}