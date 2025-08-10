/**
 * Change the player's model to a specific model when the Y key is pressed.
 * Choose the model by changing the `model` variable.
 *
 * PS: IF ACTIVATED, THIS SCRIPT WILL CRASH THE GAME IF ANY CUTSCENE IS STARTED.
 */

import {Key} from ".config/enums";
import {getPlayer} from "./libs/player";
import {getPedModelName, PedModel} from "./libs/models";
import {loadModel} from "./libs/utils";

while (true) {
    wait(100);
    if (Pad.IsGameKeyboardKeyPressed(Key.Y)) {
        const model: PedModel = PedModel.Cowboy1;
        const modelName = getPedModelName(model);
        log(`Changing player model to ${modelName}`);
        showTextBox(`Changing player model to ${modelName}`);

        loadModel(model);
        getPlayer().changeModel(model);
        wait(1000);
    }
}