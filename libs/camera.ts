export class CameraAssistant {
    private constructor(private _cameraInteralHandlerId: int) {
        if (!CameraAssistant.DoesExist(this._cameraInteralHandlerId)) {
            throw new Error("Camera does not exist.");
        }
    }

    toString() {
        return this._cameraInteralHandlerId.toString();
    }

    valueOf() {
        return this._cameraInteralHandlerId;
    }

    static ActivateScripted(__p1: int, __p2: boolean) {
        native("ACTIVATE_SCRIPTED_CAMS", __p1, Number(__p2));
    }

    static Create(_camtypeUsually14) {
        return new CameraAssistant(native("CREATE_CAM", _camtypeUsually14));
    }

    static DestroyAll() {
        native("DESTROY_ALL_CAMS");
    }

    static DoFadeIn(_timeMs) {
        native("DO_SCREEN_FADE_IN", _timeMs);
    }

    static DoFadeOut(_timeMs) {
        native("DO_SCREEN_FADE_OUT", _timeMs);
    }

    static DoesExist(_camera) {
        return native("DOES_CAM_EXIST", _camera);
    }

    static ForceTelescopeMode(_enable: boolean) {
        native("FORCE_GAME_TELESCOPE_CAM", Number(_enable));
    }

    static GetGameCam(): CameraAssistant {
        return new CameraAssistant(native("GET_GAME_CAM"));
    }

    static Restore() {
        native("CAM_RESTORE");
    }

    static RestoreJumpcut() {
        native("CAM_RESTORE_JUMPCUT");
    }

    static SetBehindPed(_ped) {
        native("SET_CAM_BEHIND_PED", _ped);
    }

    static SetHeading(_heading: number) {
        native("SET_GAME_CAM_HEADING", _heading);
    }

    static SetInFrontOfPed(_ped) {
        native("SET_CAM_IN_FRONT_OF_PED", _ped);
    }

    static SetInterpFromGameToScript(__p1, _timeInMs) {
        native("SET_INTERP_FROM_GAME_TO_SCRIPT", __p1, _timeInMs);
    }

    static SetInterpFromScriptToGame(__p1: boolean, _timeInMs) {
        native("SET_INTERP_FROM_SCRIPT_TO_GAME", Number(__p1), _timeInMs);
    }

    static SetPitch(_pitch: number) {
        native("SET_GAME_CAM_PITCH", _pitch);
    }

    AttachToObject(_obj) {
        native("ATTACH_CAM_TO_OBJECT", this._cameraInteralHandlerId, _obj);
    }

    AttachToPed(_ped: Char) {
        native("ATTACH_CAM_TO_PED", this._cameraInteralHandlerId, _ped);
    }

    AttachToVehicle(_veh) {
        native("ATTACH_CAM_TO_VEHICLE", this._cameraInteralHandlerId, _veh);
    }

    AttachToViewport(_viewportId) {
        native("ATTACH_CAM_TO_VIEWPORT", this._cameraInteralHandlerId, _viewportId);
    }

    Destroy() {
        native("DESTROY_CAM", this._cameraInteralHandlerId);
    }

    GetFarClip() {
        return native("GET_CAM_FAR_CLIP", this._cameraInteralHandlerId);
    }

    GetFarDof() {
        return native("GET_CAM_FAR_DOF", this._cameraInteralHandlerId);
    }

    GetFov() {
        return native("GET_CAM_FOV", this._cameraInteralHandlerId);
    }

    GetMotionBlur() {
        return native<boolean>("GET_CAM_MOTION_BLUR", this._cameraInteralHandlerId);
    }

    GetNearClip() {
        return native("GET_CAM_NEAR_CLIP", this._cameraInteralHandlerId);
    }

    GetNearDof() {
        return native("GET_CAM_NEAR_DOF", this._cameraInteralHandlerId);
    }

    GetPos() {
        return native<Vector3>("GET_CAM_POS", this._cameraInteralHandlerId);
    }

    GetRot(): {
        angleX: number,
        angleY: number,
        angleZ: number
    } {
        return native("GET_CAM_ROT", this._cameraInteralHandlerId);
    }

    IsActive() {
        return native<boolean>("IS_CAM_ACTIVE", this._cameraInteralHandlerId);
    }

    IsPropagating() {
        return native("IS_CAM_PROPAGATING", this._cameraInteralHandlerId);
    }

    IsSphereVisible(_x, _y, _z, _radius) {
        return native("CAM_IS_SPHERE_VISIBLE", this._cameraInteralHandlerId, _x, _y, _z, _radius);
    }

    PointAtCam(_camNext) {
        native("POINT_CAM_AT_CAM", this._cameraInteralHandlerId, _camNext);
    }

    PointAtCoord(_x, _y, _z) {
        native("POINT_CAM_AT_COORD", this._cameraInteralHandlerId, _x, _y, _z);
    }

    PointAtObject(_obj) {
        native("POINT_CAM_AT_OBJECT", this._cameraInteralHandlerId, _obj);
    }

    PointAtPed(_ped) {
        native("POINT_CAM_AT_PED", this._cameraInteralHandlerId, _ped);
    }

    PointAtVehicle(_veh) {
        native("POINT_CAM_AT_VEHICLE", this._cameraInteralHandlerId, _veh);
    }

    SetActive(_active: boolean) {
        native("SET_CAM_ACTIVE", this._cameraInteralHandlerId, Number(_active));
    }

    SetAttachOffset(_x, _y, _z) {
        native("SET_CAM_ATTACH_OFFSET", this._cameraInteralHandlerId, _x, _y, _z);
    }

    SetAttachOffsetIsRelative(_set: boolean) {
        native("SET_CAM_ATTACH_OFFSET_IS_RELATIVE", this._cameraInteralHandlerId, Number(_set));
    }

    SetDofFocuspoint(_x, _y, _z, __p5) {
        native("SET_CAM_DOF_FOCUSPOINT", this._cameraInteralHandlerId, _x, _y, _z, __p5);
    }

    SetDrunk(_value, _timeInMs) {
        native("SET_DRUNK_CAM", this._cameraInteralHandlerId, _value, _timeInMs);
    }

    SetFarClip(_clip) {
        native("SET_CAM_FAR_CLIP", this._cameraInteralHandlerId, _clip);
    }

    SetFarDof(_depthOfField) {
        native("SET_CAM_FAR_DOF", this._cameraInteralHandlerId, _depthOfField);
    }

    SetFov(_fieldOfView: number) {
        native("SET_CAM_FOV", this._cameraInteralHandlerId, _fieldOfView);
    }

    SetInterpStyleCore(_cam1, _cam2, _timeInMs, _flag) {
        native("SET_CAM_INTERP_STYLE_CORE", this._cameraInteralHandlerId, _cam1, _cam2, _timeInMs, _flag);
    }

    SetInterpStyleDetailed(__p2, __p3, __p4, __p5) {
        native("SET_CAM_INTERP_STYLE_DETAILED", this._cameraInteralHandlerId, __p2, __p3, __p4, __p5);
    }

    SetMotionBlur(_motionBlur) {
        native("SET_CAM_MOTION_BLUR", this._cameraInteralHandlerId, Number(_motionBlur));
    }

    SetNearClip(_clip) {
        native("SET_CAM_NEAR_CLIP", this._cameraInteralHandlerId, _clip);
    }

    SetNearDof(_depthOfField) {
        native("SET_CAM_NEAR_DOF", this._cameraInteralHandlerId, _depthOfField);
    }

    SetPointOffset(_x, _y, _z) {
        native("SET_CAM_POINT_OFFSET", this._cameraInteralHandlerId, _x, _y, _z);
    }

    SetPointOffsetIsRelative(_set: boolean) {
        native("SET_CAM_POINT_OFFSET_IS_RELATIVE", this._cameraInteralHandlerId, Number(_set));
    }

    SetPos(_x, _y, _z) {
        native("SET_CAM_POS", this._cameraInteralHandlerId, _x, _y, _z);
    }

    SetPropagate(_value: boolean) {
        native("SET_CAM_PROPAGATE", this._cameraInteralHandlerId, Number(_value));
    }

    SetRoll(_roll) {
        native("SET_CAM_ROLL", this._cameraInteralHandlerId, _roll);
    }

    SetRot(_angleX, _angleY, _angleZ) {
        native("SET_CAM_ROT", this._cameraInteralHandlerId, _angleX, _angleY, _angleZ);
    }

    SetShake(__p2, _shakeval) {
        native("SET_CAM_SHAKE", this._cameraInteralHandlerId, __p2, _shakeval);
    }

    Unattach() {
        native("UNATTACH_CAM", this._cameraInteralHandlerId);
    }

    Unpoint() {
        native("UNPOINT_CAM", this._cameraInteralHandlerId);
    }

}