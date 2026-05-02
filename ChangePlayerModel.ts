/**
 * Change the player's model to a specific model when the Y key is pressed.
 * Choose the model by changing the `model` variable.
 * If active it displays the custom model, if deactivated it reverts to the default model.
 * PS: IF ACTIVATED, THIS SCRIPT WILL CRASH THE GAME IF ANY CUTSCENE IS STARTED.
 */

import {Key} from ".config/enums";
import {getPlayer} from "./libs/player";
import {getPedModelName, PedModel} from "./libs/models";
import {loadModel} from "./libs/utils";

let isActive = false;

while (true) {
    wait(100);
    if (Pad.IsGameKeyboardKeyPressed(Key.Y)) {
        isActive = !isActive;

        let model: PedModel;

        if (isActive) {
            model = PedModel.Cowboy1;
        } else {
            model = PedModel.NikoBellic;
        }

        const modelName = getPedModelName(model);
        log(`Changing player model to ${modelName}`);
        showTextBox(`Changing player model to ${modelName}`);

        loadModel(model);
        getPlayer().changeModel(model);
        wait(1000);

    }
}
