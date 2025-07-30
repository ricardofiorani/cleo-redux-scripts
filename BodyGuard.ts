/**
 * EXPERIMENTAL: This script is experimental and may not work as expected.
 *
 * Bodyguard script
 * This script allows the player to spawn a bodyguard that follows them around.
 * Press Key.K to spawn a bodyguard.
 * The bodyguard will follow the player and enter their vehicle if they are in one.
 * If the player is not in a vehicle, the bodyguard will walk alongside them.
 * If the bodyguard is dead, it will be removed and a new one can be spawned.
 *
 */

import {Key} from ".config/enums";
import {addVec, getDistanceBetweenTwoVectors} from "./libs/utils";
import {giveCharWeapon, spawnChar, spawnCharInVehicle} from "./libs/char";
import {RelationshipGroup, RelationshipType} from "./libs/relationship";
import {getPlayerChar, getPlayerCurrentVehicle, isPlayerInAnyVehicle} from "./libs/player";
import {Weapons} from "./libs/weapons";
import {addBlipForChar, BlipColors, removeBlipForChar} from "./libs/blips";
import {getFreePassengerSeat} from "./libs/vehicle";

let group: Group;
let garbageCollection: Char[] = [];

while (true) {
    wait(100);

    if (!group) {
        createGroup();
    }

    if (Pad.IsGameKeyboardKeyPressed(Key.K)) {
        log("Key.K pressed");
        showTextBox("Spawning Bodyguard");
        log("Spawning Bodyguard...");
        spawnBodyguard();
        wait(1000);
    }

    // Logic for bodyguard following the player
    makeGroupFollowPlayer();

    // Check if any is dead and remove them from the group
    checkGroupMembers();
}


function checkGroupMembers() {
    const removeMember = (member: Char) => {
        removeBlipForChar(member);
        member.markAsNoLongerNeeded();
        garbageCollection = garbageCollection.filter(m => m !== member);
    }

    garbageCollection.forEach(member => {
        if(!Char.DoesExist(member) || member.isDead()){
           removeMember(member);
        } else if(getDistanceBetweenTwoVectors(getPlayerChar().getCoordinates(), member.getCoordinates()) > 100) {
            log(`Member ${member.valueOf()} is too far away, removing from group`);
            removeMember(member);
        }
    })
}

function spawnBodyguard() {
    const bodyguardSkin = "M_Y_BOUNCER_02";
    let bodyguard: Char;
    const currentVehicle = getPlayerCurrentVehicle();

    if (!!currentVehicle) {
        log("Player is in a vehicle, spawning bodyguard as passenger");
        bodyguard = spawnCharInVehicle(bodyguardSkin, RelationshipGroup.Player, currentVehicle);
    } else {
        log("Player is not in a vehicle, spawning bodyguard on foot");
        const pos = addVec(getPlayerChar().getCoordinates(), {x: 1.0, y: 1.0, z: 0});
        bodyguard = spawnChar(bodyguardSkin, pos, RelationshipGroup.Player);
    }

    giveCharWeapon(bodyguard, Weapons.SMG_Uzi, 9999);

    if (!bodyguard) {
        log("Failed to spawn bodyguard");
        return;
    }

    log("Bodyguard spawned successfully");

    bodyguard.setWillDoDrivebys(true)
    bodyguard.setIsTargetPriority(true);
    native<void>("SET_GROUP_CHAR_DUCKS_WHEN_AIMED_AT", bodyguard, false)
    native<void>("SET_PED_DIES_WHEN_INJURED", bodyguard, true);
    native<void>("SET_PED_PATH_MAY_USE_CLIMBOVERS", bodyguard, true);
    native<void>("SET_PED_PATH_MAY_USE_LADDERS", bodyguard, true);
    native<void>("SET_PED_PATH_MAY_DROP_FROM_HEIGHT", bodyguard, true);

    bodyguard.setRelationshipGroup(RelationshipGroup.Player);
    bodyguard.setRelationship(RelationshipType.Companion, RelationshipGroup.Player);
    bodyguard.setNotDamagedByRelationshipGroup(RelationshipGroup.Player, true);
    bodyguard.setNeverLeavesGroup(true)
    bodyguard.setAsMissionChar();
    group.setMember(bodyguard);

    log(`Bodyguard added to group, which now has ${group.getSize().pCount} members`);

    if (!currentVehicle) {
        Task.FollowFootsteps(bodyguard, getPlayerChar() as int)
    } else {
        Task.WarpCharIntoCarAsPassenger(bodyguard, currentVehicle, getFreePassengerSeat(currentVehicle));
    }

    addBlipForChar(bodyguard, BlipColors.Green, `Bodyguard ${bodyguard.valueOf()}`);
    garbageCollection.push(bodyguard);
}

function makeGroupFollowPlayer() {
    if (getPlayerChar().isGettingInToACar() && !!getPlayerCurrentVehicle()) {
        log("Player is getting into a car, bodyguard will enter as passenger");
        const members: Char[] = getGroupMembers();

        members.forEach(member => {
            Task.EnterCarAsPassenger(member, getPlayerCurrentVehicle(), 5000, -2);
            wait(5000);
        })
    } else if (!isPlayerInAnyVehicle()) {
        const members: Char[] = getGroupMembers();

        members.forEach(member => {
            member.isInAnyCar() && Task.LeaveAnyCar(member) && wait(1000);
        });
    }
}

function getGroupMembers(): Char[] {
    let members: Char[] = [];
    const groupMembers = group.getSize().pCount;

    for (let i = 0; i < groupMembers; i++) {
        const member = group.getMember(i);
        if (member && !member.isDead()) {
            members.push(member);
        }
    }

    return members;
}

function createGroup() {
    const playerGroup = getPlayerChar().getGroupIndex()

    if (!playerGroup) {
        log('ERROR: Player has no group index, cannot spawn bodyguard');
        wait(1000);
        return;
    }

    group = new Group(playerGroup);
    group.setLeader(getPlayerChar());
    group.setFollowStatus(1);

    // In case the script reloads, repopulate the garbage collection
    garbageCollection = getGroupMembers();
}