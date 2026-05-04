#define _CRT_SECURE_NO_WARNINGS
#include "cleo_redux_sdk.h"
#include "bass.h"
#include "CVector.h"
#include "CSoundSystem.h"
#include "CAudioStream.h"
#include "C3DAudioStream.h"
#include <string>
#include <cstring>

using namespace CLEO;

#define STREAM_PARAM(_varName) \
    auto _varName = (CAudioStream*)(size_t)GetIntParam(ctx); \
    if (_varName != nullptr && !soundSystem.HasStream(_varName)) { \
        UpdateCompareFlag(ctx, false); \
        return HandlerResult::CONTINUE; \
    }

static CSoundSystem soundSystem;

static HandlerResult IsAudioStreamLoaded(Context ctx) {
    STREAM_PARAM(stream);
    bool loaded = stream && stream->IsReady();
    char logMsg[512];
    sprintf(logMsg, "IS_AUDIO_STREAM_LOADED: stream=%p, loaded=%s", stream, loaded ? "true" : "false");
    Log(logMsg);
    UpdateCompareFlag(ctx, loaded);
    return HandlerResult::CONTINUE;
}

class AudioPlugin {
public:
    AudioPlugin() {
        Log("CLEO Redux Audio Plugin 1.0 - Audio streaming using BASS");

        RegisterCommand("LOAD_AUDIOSTREAM", LoadAudioStream, "audio");
        RegisterCommand("LOAD_AUDIOSTREAM_FROM_URL", LoadAudioStreamFromUrl, "audio");
        RegisterCommand("SET_AUDIOSTREAM_STATE", SetAudioStreamState, "audio");
        RegisterCommand("RELEASE_AUDIOSTREAM", ReleaseAudioStream, "audio");
        RegisterCommand("IS_AUDIO_STREAM_LOADED", IsAudioStreamLoaded, "audio");
        RegisterCommand("GET_AUDIOSTREAM_LENGTH", GetAudioStreamLength, "audio");
        RegisterCommand("GET_AUDIO_STREAM_STATE", GetAudioStreamState, "audio");
        RegisterCommand("GET_AUDIO_STREAM_VOLUME", GetAudioStreamVolume, "audio");
        RegisterCommand("SET_AUDIOSTREAM_VOLUME", SetAudioStreamVolume, "audio");
        RegisterCommand("LOOP_AUDIOSTREAM", LoopAudioStream, "audio");
        RegisterCommand("LOAD_AUDIOSTREAM_WITH_3D_SUPPORT", LoadAudioStream3D, "audio");
        RegisterCommand("SET_3D_AUDIOSTREAM_POSITION", Set3DAudioStreamPosition, "audio");
        RegisterCommand("LINK_3D_AUDIOSTREAM_TO_OBJECT", Link3DAudioStreamToObject, "audio");
        RegisterCommand("LINK_3D_AUDIOSTREAM_TO_CHAR", Link3DAudioStreamToChar, "audio");
        RegisterCommand("LINK_3D_AUDIOSTREAM_TO_VEHICLE", Link3DAudioStreamToVehicle, "audio");
        RegisterCommand("IS_AUDIO_STREAM_PLAYING", IsAudioStreamPlaying, "audio");
        RegisterCommand("GET_AUDIOSTREAM_DURATION", GetAudioStreamDuration, "audio");
        RegisterCommand("GET_AUDIO_STREAM_SPEED", GetAudioStreamSpeed, "audio");
        RegisterCommand("SET_AUDIO_STREAM_SPEED", SetAudioStreamSpeed, "audio");
        RegisterCommand("SET_AUDIO_STREAM_VOLUME_WITH_TRANSITION", SetAudioStreamVolumeWithTransition, "audio");
        RegisterCommand("SET_AUDIO_STREAM_SPEED_WITH_TRANSITION", SetAudioStreamSpeedWithTransition, "audio");
        RegisterCommand("SET_AUDIO_STREAM_SOURCE_SIZE", SetAudioStreamSourceSize, "audio");
        RegisterCommand("GET_AUDIO_STREAM_PROGRESS", GetAudioStreamProgress, "audio");
        RegisterCommand("SET_AUDIO_STREAM_PROGRESS", SetAudioStreamProgress, "audio");
        RegisterCommand("GET_AUDIO_STREAM_TYPE", GetAudioStreamType, "audio");
        RegisterCommand("SET_AUDIO_STREAM_TYPE", SetAudioStreamType, "audio");
        RegisterCommand("GET_AUDIO_STREAM_PROGRESS_SECONDS", GetAudioStreamProgressSeconds, "audio");
        RegisterCommand("SET_AUDIO_STREAM_PROGRESS_SECONDS", SetAudioStreamProgressSeconds, "audio");

        OnRuntimeInit(OnRuntimeInitCallback);
        OnAfterScripts(OnAfterScriptsCallback);
    }

    static void OnRuntimeInitCallback() {
        Log("AudioPlugin: Runtime initialized");
        soundSystem.Init();
    }

    static void OnAfterScriptsCallback(unsigned int current_time, int time_step) {
        if (soundSystem.Initialized()) {
            soundSystem.Process();
        }
    }

    static HandlerResult LoadAudioStream(Context ctx) {
        char path[512];
        GetStringParam(ctx, path, 511);
        
        char logMsg[512];
        sprintf(logMsg, "LOAD_AUDIOSTREAM: path = %s", path);
        Log(logMsg);

        char resolved[512];
        ResolvePath(path, resolved);
        
        sprintf(logMsg, "LOAD_AUDIOSTREAM: resolved path = %s", resolved);
        Log(logMsg);

        auto ptr = soundSystem.CreateStream(resolved);

        if (ptr != nullptr) {
            sprintf(logMsg, "LOAD_AUDIOSTREAM: stream created successfully, handle = %p", ptr);
            Log(logMsg);
            SetIntParam(ctx, (isize)ptr);
            UpdateCompareFlag(ctx, true);
        } else {
            Log("LOAD_AUDIOSTREAM: ERROR - failed to create stream");
            SetIntParam(ctx, 0);
            UpdateCompareFlag(ctx, false);
        }

        return HandlerResult::CONTINUE;
    }

    static HandlerResult LoadAudioStreamFromUrl(Context ctx) {
        char url[512];
        GetStringParam(ctx, url, 511);
        
        char logMsg[512];
        sprintf(logMsg, "LOAD_AUDIOSTREAM_FROM_URL: URL = %s", url);
        Log(logMsg);
        
        // Create stream using download-first approach
        auto ptr = soundSystem.CreateStreamFromUrl(url);

        if (ptr != nullptr) {
            sprintf(logMsg, "LOAD_AUDIOSTREAM_FROM_URL: stream created, handle = %p, will be ready after download", ptr);
            Log(logMsg);
            SetIntParam(ctx, (isize)ptr);
            UpdateCompareFlag(ctx, true);
        } else {
            Log("LOAD_AUDIOSTREAM_FROM_URL: ERROR - failed to create stream");
            SetIntParam(ctx, 0);
            UpdateCompareFlag(ctx, false);
        }

        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamState(Context ctx) {
        STREAM_PARAM(stream);
        int action = (int)GetIntParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIOSTREAM_STATE: stream=%p, action=%d", stream, action);
        Log(logMsg);

        if (stream) {
            switch (action) {
            case 0: stream->Stop(); break;
            case 1: stream->Play(); break;
            case 2: stream->Pause(); break;
            case 3: stream->Resume(); break;
            }
        }

        return HandlerResult::CONTINUE;
    }

    static HandlerResult ReleaseAudioStream(Context ctx) {
        auto stream = (CAudioStream*)(size_t)GetIntParam(ctx);
        if (stream != nullptr && !soundSystem.HasStream(stream)) {
            return HandlerResult::CONTINUE;
        }
        
        char logMsg[512];
        sprintf(logMsg, "RELEASE_AUDIOSTREAM: stream=%p", stream);
        Log(logMsg);

        if (stream) soundSystem.DestroyStream(stream);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamLength(Context ctx) {
        STREAM_PARAM(stream);

        float length = 0.0f;
        if (stream) length = stream->GetLength();
        
        char logMsg[512];
        sprintf(logMsg, "GET_AUDIOSTREAM_LENGTH: stream=%p, length=%.2f", stream, length);
        Log(logMsg);

        SetIntParam(ctx, (isize)(int)length);
        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamState(Context ctx) {
        STREAM_PARAM(stream);

        auto state = CAudioStream::StreamState::Stopped;
        if (stream) state = stream->GetState();
        
        char logMsg[512];
        sprintf(logMsg, "GET_AUDIO_STREAM_STATE: stream=%p, state=%d", stream, (int)state);
        Log(logMsg);

        SetIntParam(ctx, (isize)state);
        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamVolume(Context ctx) {
        STREAM_PARAM(stream);

        float volume = 0.0f;
        if (stream) volume = stream->GetVolume();

        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamVolume(Context ctx) {
        STREAM_PARAM(stream);
        float volume = GetFloatParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIOSTREAM_VOLUME: stream=%p, volume=%.2f", stream, volume);
        Log(logMsg);

        if (stream) stream->SetVolume(volume);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult LoopAudioStream(Context ctx) {
        STREAM_PARAM(stream);
        bool loop = GetIntParam(ctx) != 0;
        
        char logMsg[512];
        sprintf(logMsg, "LOOP_AUDIOSTREAM: stream=%p, loop=%s", stream, loop ? "true" : "false");
        Log(logMsg);

        if (stream) stream->SetLooping(loop);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult LoadAudioStream3D(Context ctx) {
        char path[512];
        GetStringParam(ctx, path, 511);
        
        char logMsg[512];
        sprintf(logMsg, "LOAD_AUDIOSTREAM_WITH_3D_SUPPORT: path = %s", path);
        Log(logMsg);

        char resolved[512];
        ResolvePath(path, resolved);

        auto ptr = soundSystem.CreateStream(resolved, true);

        if (ptr != nullptr) {
            sprintf(logMsg, "LOAD_AUDIOSTREAM_WITH_3D_SUPPORT: stream created, handle = %p", ptr);
            Log(logMsg);
            SetIntParam(ctx, (isize)ptr);
            UpdateCompareFlag(ctx, true);
        } else {
            Log("LOAD_AUDIOSTREAM_WITH_3D_SUPPORT: ERROR - failed to create stream");
            SetIntParam(ctx, 0);
            UpdateCompareFlag(ctx, false);
        }

        return HandlerResult::CONTINUE;
    }

    static HandlerResult Set3DAudioStreamPosition(Context ctx) {
        STREAM_PARAM(stream);

        float x = GetFloatParam(ctx);
        float y = GetFloatParam(ctx);
        float z = GetFloatParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_3D_AUDIOSTREAM_POSITION: stream=%p, pos=(%.2f,%.2f,%.2f)", stream, x, y, z);
        Log(logMsg);

        if (stream) stream->Set3dPosition(CVector(x, y, z));

        return HandlerResult::CONTINUE;
    }

    static HandlerResult Link3DAudioStreamToObject(Context ctx) {
        STREAM_PARAM(stream);
        int handle = (int)GetIntParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "LINK_3D_AUDIOSTREAM_TO_OBJECT: stream=%p, handle=%d", stream, handle);
        Log(logMsg);

        if (stream) stream->SetHost((void*)(size_t)handle, 1, CVector(0.0f, 0.0f, 0.0f));

        return HandlerResult::CONTINUE;
    }

    static HandlerResult Link3DAudioStreamToChar(Context ctx) {
        STREAM_PARAM(stream);
        int handle = (int)GetIntParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "LINK_3D_AUDIOSTREAM_TO_CHAR: stream=%p, handle=%d", stream, handle);
        Log(logMsg);

        if (stream) stream->SetHost((void*)(size_t)handle, 2, CVector(0.0f, 0.0f, 0.0f));

        return HandlerResult::CONTINUE;
    }

    static HandlerResult Link3DAudioStreamToVehicle(Context ctx) {
        STREAM_PARAM(stream);
        int handle = (int)GetIntParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "LINK_3D_AUDIOSTREAM_TO_VEHICLE: stream=%p, handle=%d", stream, handle);
        Log(logMsg);

        if (stream) stream->SetHost((void*)(size_t)handle, 3, CVector(0.0f, 0.0f, 0.0f));

        return HandlerResult::CONTINUE;
    }

    static HandlerResult IsAudioStreamPlaying(Context ctx) {
        STREAM_PARAM(stream);

        auto state = CAudioStream::StreamState::Stopped;
        if (stream) state = stream->GetState();
        
        char logMsg[512];
        sprintf(logMsg, "IS_AUDIO_STREAM_PLAYING: stream=%p, state=%d", stream, (int)state);
        Log(logMsg);

        UpdateCompareFlag(ctx, state == CAudioStream::StreamState::Playing);
        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamDuration(Context ctx) {
        STREAM_PARAM(stream);

        float length = 0.0f;
        if (stream) {
            length = stream->GetLength();
            float speed = stream->GetSpeed();
            if (speed <= 0.0f) length = 999999.0f;
            else length /= speed;
        }
        
        char logMsg[512];
        sprintf(logMsg, "GET_AUDIOSTREAM_DURATION: stream=%p, duration=%.2f", stream, length);
        Log(logMsg);

        SetFloatParam(ctx, length);
        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamSpeed(Context ctx) {
        STREAM_PARAM(stream);

        float speed = 0.0f;
        if (stream) speed = stream->GetSpeed();

        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamSpeed(Context ctx) {
        STREAM_PARAM(stream);
        float speed = GetFloatParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIO_STREAM_SPEED: stream=%p, speed=%.2f", stream, speed);
        Log(logMsg);

        if (stream) stream->SetSpeed(speed);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamVolumeWithTransition(Context ctx) {
        STREAM_PARAM(stream);
        float volume = GetFloatParam(ctx);
        int time_ms = (int)GetIntParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIO_STREAM_VOLUME_WITH_TRANSITION: stream=%p, volume=%.2f, time=%dms", stream, volume, time_ms);
        Log(logMsg);

        if (stream) stream->SetVolume(volume, 0.001f * time_ms);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamSpeedWithTransition(Context ctx) {
        STREAM_PARAM(stream);
        float speed = GetFloatParam(ctx);
        int time_ms = (int)GetIntParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIO_STREAM_SPEED_WITH_TRANSITION: stream=%p, speed=%.2f, time=%dms", stream, speed, time_ms);
        Log(logMsg);

        if (stream) stream->SetSpeed(speed, 0.001f * time_ms);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamSourceSize(Context ctx) {
        STREAM_PARAM(stream);
        float radius = GetFloatParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIO_STREAM_SOURCE_SIZE: stream=%p, radius=%.2f", stream, radius);
        Log(logMsg);

        if (stream) stream->Set3dSourceSize(radius);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamProgress(Context ctx) {
        STREAM_PARAM(stream);

        float progress = 0.0f;
        if (stream) progress = stream->GetProgress();
        
        char logMsg[512];
        sprintf(logMsg, "GET_AUDIO_STREAM_PROGRESS: stream=%p, progress=%.2f", stream, progress);
        Log(logMsg);

        SetFloatParam(ctx, progress);
        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamProgress(Context ctx) {
        STREAM_PARAM(stream);
        float progress = GetFloatParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIO_STREAM_PROGRESS: stream=%p, progress=%.2f", stream, progress);
        Log(logMsg);

        if (stream) stream->SetProgress(progress);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamType(Context ctx) {
        STREAM_PARAM(stream);

        auto type = eStreamType::None;
        if (stream) type = stream->GetType();
        
        char logMsg[512];
        sprintf(logMsg, "GET_AUDIO_STREAM_TYPE: stream=%p, type=%d", stream, (int)type);
        Log(logMsg);

        SetIntParam(ctx, (isize)type);
        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamType(Context ctx) {
        STREAM_PARAM(stream);
        int type = (int)GetIntParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIO_STREAM_TYPE: stream=%p, type=%d", stream, type);
        Log(logMsg);

        if (stream) stream->SetType((eStreamType)type);

        return HandlerResult::CONTINUE;
    }

    static HandlerResult GetAudioStreamProgressSeconds(Context ctx) {
        STREAM_PARAM(stream);

        float progress = 0.0f;
        if (stream) {
            progress = stream->GetProgress();
            progress *= stream->GetLength();
        }
        
        char logMsg[512];
        sprintf(logMsg, "GET_AUDIO_STREAM_PROGRESS_SECONDS: stream=%p, progress=%.2fs", stream, progress);
        Log(logMsg);

        SetFloatParam(ctx, progress);
        return HandlerResult::CONTINUE;
    }

    static HandlerResult SetAudioStreamProgressSeconds(Context ctx) {
        STREAM_PARAM(stream);
        float progress = GetFloatParam(ctx);
        
        char logMsg[512];
        sprintf(logMsg, "SET_AUDIO_STREAM_PROGRESS_SECONDS: stream=%p, progress=%.2fs", stream, progress);
        Log(logMsg);

        if (stream) {
            float len = stream->GetLength();
            if (len > 0.0f) {
                progress /= len;
            } else {
                progress = 0.0f;
            }
            stream->SetProgress(progress);
        }

        return HandlerResult::CONTINUE;
    }

} g_AudioPlugin;
