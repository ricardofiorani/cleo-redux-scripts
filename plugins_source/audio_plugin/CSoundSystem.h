#pragma once
#include "BASSLoader.h"
#include "CVector.h"
#include <set>

namespace CLEO {
    class CAudioStream;
    class C3DAudioStream;

    enum eStreamType {
        None = 0,
        SoundEffect,
        Music,
        UserInterface
    };

    class CSoundSystem {
        friend class CAudioStream;
        friend class C3DAudioStream;

        std::set<CAudioStream*> streams;
        BASS_INFO SoundDevice = {0};
        bool initialized = false;
        bool paused = false;

        static bool useFloatAudio;
        static bool allowNetworkSources;

        static CVector position;
        static CVector direction;
        static CVector velocity;
        static bool skipFrame;
        static float timeStep;
        static float masterSpeed;
        static float masterVolumeSfx;
        static float masterVolumeMusic;

    public:
        static eStreamType LegacyModeDefaultStreamType;

        CSoundSystem() = default;
        ~CSoundSystem();

        bool Init();
        bool Initialized();

        CAudioStream* CreateStream(const char* filename, bool in3d = false);
        CAudioStream* CreateStreamFromUrl(const char* url);
        void DestroyStream(CAudioStream* stream);

        bool HasStream(CAudioStream* stream);
        void Clear();

        void Pause();
        void Resume();
        void Process();
    };

    static bool isNetworkSource(const char* path) {
        return _strnicmp("http:", path, 5) == 0 || _strnicmp("https:", path, 6) == 0;
    }

    static float dot(CVector a, CVector b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static BASS_3DVECTOR toBass(const CVector& v) {
        return BASS_3DVECTOR(v.x, v.z, v.y);
    }
}
