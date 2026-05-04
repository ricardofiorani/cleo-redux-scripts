#define _CRT_SECURE_NO_WARNINGS
#include "CSoundSystem.h"
#include "CAudioStream.h"
#include "C3DAudioStream.h"
#include "BASSLoader.h"
#include "cleo_redux_sdk.h"
#include <windows.h>
#undef max
#undef min

namespace CLEO {
    bool CSoundSystem::useFloatAudio = false;
    bool CSoundSystem::allowNetworkSources = true;
    eStreamType CSoundSystem::LegacyModeDefaultStreamType = eStreamType::None;
    CVector CSoundSystem::position(0.0f, 0.0f, 0.0f);
    CVector CSoundSystem::direction(0.0f, 1.0f, 0.0f);
    CVector CSoundSystem::velocity(0.0f, 0.0f, 0.0f);
    bool CSoundSystem::skipFrame = true;
    float CSoundSystem::timeStep = 0.02f;
    float CSoundSystem::masterSpeed = 1.0f;
    float CSoundSystem::masterVolumeSfx = 1.0f;
    float CSoundSystem::masterVolumeMusic = 1.0f;

    CSoundSystem::~CSoundSystem() {
        Clear();
        if (initialized) {
            initialized = false;
        }
    }

    bool CSoundSystem::Init() {
        if (initialized) return true;

        if (!BASSLoader::Instance().Load()) {
            return false;
        }

        auto ver = HIWORD(BASS_GetVersion());
        if (ver < BASSVERSION) {
            return false;
        }

        BASS_SetConfig(BASS_CONFIG_FLOATDSP, TRUE);

        if (BASS_Init(-1, 44100, 0, NULL, NULL) &&
            BASS_Set3DFactors(1.0f, 0.0f, 1.0f)) {

            DWORD floatable = BASS_StreamCreate(44100, 1, BASS_SAMPLE_FLOAT, NULL, NULL);
            if (floatable) {
                useFloatAudio = true;
                BASS_StreamFree(floatable);
            }

            if (BASS_GetInfo(&SoundDevice)) {
                if (SoundDevice.flags & DSCAPS_EMULDRIVER) {
                }
            }

            initialized = true;
            return true;
        }

        return false;
    }

    bool CSoundSystem::Initialized() {
        return initialized;
    }

    CAudioStream* CSoundSystem::CreateStream(const char* filename, bool in3d) {
        CAudioStream* result = in3d ? new C3DAudioStream(filename) : new CAudioStream(filename);
        if (!result->IsOk()) {
            delete result;
            return nullptr;
        }

        streams.insert(result);
        return result;
    }

    CAudioStream* CSoundSystem::CreateStreamFromUrl(const char* url) {
        char logMsg[512];
        sprintf(logMsg, "CSoundSystem: CreateStreamFromUrl called for %s", url);
        Log(logMsg);
        
        if (!allowNetworkSources) {
            Log("CSoundSystem: Network sources disabled");
            return nullptr;
        }

        // Create stream using download-first constructor
        CAudioStream* result = new CAudioStream(url, true);
        if (!result->IsOk()) {
            Log("CSoundSystem: Stream creation failed for URL");
            delete result;
            return nullptr;
        }

        streams.insert(result);
        Log("CSoundSystem: Stream created successfully for URL");
        return result;
    }

    void CSoundSystem::DestroyStream(CAudioStream* stream) {
        if (streams.erase(stream))
            delete stream;
    }

    bool CSoundSystem::HasStream(CAudioStream* stream) {
        return streams.find(stream) != streams.end();
    }

    void CSoundSystem::Clear() {
        for (auto stream : streams) {
            delete stream;
        }
        streams.clear();
    }

    void CSoundSystem::Resume() {
        paused = false;
        for (auto stream : streams) {
            if (stream->GetState() == CAudioStream::Playing) stream->Resume();
        }
    }

    void CSoundSystem::Pause() {
        paused = true;
        for (auto stream : streams) {
            stream->Pause(false);
        }
    }

    void CSoundSystem::Process() {
        if (paused) Resume();

        for (auto stream : streams)
            stream->Process();

        BASS_Apply3D();
    }
}
