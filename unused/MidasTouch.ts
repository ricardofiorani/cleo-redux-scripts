import {getCarThatCharIsTouching, getCharGettingTargetedByPlayer, isTouchingAnyCar} from "../libs/utils";
import {getPlayerChar} from "../libs/player";

const enabled = false;

while (enabled) {
    wait(100);

    const player = getPlayerChar();

    if (isTouchingAnyCar(player)) {
        log("Kaboom!");

        player.setInvincible(true);
        wait(50);
        getCarThatCharIsTouching(player).explode(true, false);
        wait(2000)
        getPlayerChar().setInvincible(false);
    }

    const targetChar = getCharGettingTargetedByPlayer();


    if (targetChar) {
        log(`Player is targeting character with ID: ${targetChar.valueOf()}`);
        // targetChar.clearTasks();
        // targetChar.clearSecondaryTask();
        Task.Die(targetChar)
    } else {
        log("Player is not targeting any character");
    }

}