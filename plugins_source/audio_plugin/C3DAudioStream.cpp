#include "C3DAudioStream.h"
#include "CSoundSystem.h"
#include <algorithm>
#undef max
#undef min
#include <cmath>

using namespace CLEO;

C3DAudioStream::C3DAudioStream(const char* filepath) : CAudioStream() {
    if (isNetworkSource(filepath) && !CSoundSystem::allowNetworkSources) {
        return;
    }

    unsigned flags = BASS_SAMPLE_3D | BASS_SAMPLE_MONO | BASS_SAMPLE_SOFTWARE | BASS_STREAM_PRESCAN;
    if (CSoundSystem::useFloatAudio) flags |= BASS_SAMPLE_FLOAT;

    if (!(streamInternal = BASS_StreamCreateFile(FALSE, filepath, 0, 0, flags)) &&
        !(streamInternal = BASS_StreamCreateURL(filepath, 0, flags, nullptr, nullptr))) {
        return;
    }

    BASS_ChannelGetAttribute(streamInternal, BASS_ATTRIB_FREQ, &rate);
    BASS_ChannelSet3DAttributes(streamInternal, BASS_3DMODE_NORMAL, -1.0f, -1.0f, -1, -1, -1.0f);
    BASS_ChannelSetAttribute(streamInternal, BASS_ATTRIB_VOL, 0.0f);
    ok = true;
}

void C3DAudioStream::Set3dPosition(const CVector& pos) {
    host = nullptr;
    hostType = 0;
    offset = pos;
}

void C3DAudioStream::Set3dSourceSize(float radius) {
    this->radius = std::max<float>(radius, 0.01f);
}

void C3DAudioStream::SetHost(void* host, int entityType, const CVector& offset) {
    if (host != nullptr) {
        this->host = host;
        hostType = entityType;
    } else {
        this->host = nullptr;
        hostType = 0;
    }

    this->offset = offset;
}

void C3DAudioStream::Process() {
    UpdatePosition();
    CAudioStream::Process();

    CVector relPos = position - CSoundSystem::position;
    float distance = relPos.NormaliseAndMag();
    float inFactor = (float)CalculateDistanceDecay(
        radius * 5.0f, distance * 5.0f
    );

    float sign = dot(CSoundSystem::direction, relPos) > 0.0f ? 1.0f : -1.0f;
    CVector centerPos = CSoundSystem::position + CSoundSystem::direction * distance * sign;
    CVector percPos = Lerp(position, centerPos, inFactor);

    CVector percVel = Lerp(velocity, CSoundSystem::velocity, inFactor);

    BASS_3DVECTOR bassPos = toBass(percPos);
    BASS_3DVECTOR bassVel = toBass(percVel);
    BASS_ChannelSet3DPosition(streamInternal, &bassPos, nullptr, &bassVel);
}

float C3DAudioStream::CalculateVolume() {
    if (!placed) {
        return 0.0f;
    }

    CVector relPos = position - CSoundSystem::position;
    float distance = relPos.NormaliseAndMag();
    float inFactor = (float)CalculateDistanceDecay(
        radius * 5.0f, distance * 5.0f
    );

    double vol = Volume_3D_Adjust;

    switch (type) {
    case eStreamType::SoundEffect:
        vol *= CSoundSystem::masterVolumeSfx;
        break;
    case eStreamType::Music:
        vol *= CSoundSystem::masterVolumeMusic;
        break;
    case eStreamType::UserInterface:
        vol *= CSoundSystem::masterVolumeSfx;
        break;
    default:
        vol *= 1.0f;
        break;
    }

    vol *= CalculateDistanceDecay(radius, distance);
    vol *= Lerp(CalculateDirectionDecay(CSoundSystem::direction, relPos), 1.0f, inFactor);
    vol *= volume.value();

    return (float)vol;
}

float C3DAudioStream::CalculateSpeed() {
    float masterSpeed;
    switch (type) {
    case eStreamType::SoundEffect:
        masterSpeed = CSoundSystem::masterSpeed;
        break;
    case eStreamType::Music:
        masterSpeed = CSoundSystem::masterSpeed;
        break;
    case eStreamType::UserInterface:
        masterSpeed = 1.0f;
        break;
    default:
        masterSpeed = 1.0f;
    }

    return masterSpeed * speed.value();
}

double C3DAudioStream::CalculateDistanceDecay(float radius, float distance) {
    distance = std::max<float>(distance - radius, 0.0f);
    return exp(-0.013 * pow(distance, 1.4));
}

float C3DAudioStream::CalculateDirectionDecay(const CVector& listenerDir, const CVector& relativePos) {
    float factor = dot(listenerDir, relativePos);
    factor = 0.6f + 0.4f * factor;
    return factor;
}

void C3DAudioStream::UpdatePosition() {
    auto prevPos = position;

    if (host != nullptr) {
        if (hostType == 0) return;

        bool hostValid = false;
        switch (hostType) {
        case 1:
        case 2:
        case 3:
            hostValid = (host != nullptr);
            break;
        }
        if (!hostValid) {
            hostType = 0;
            placed = false;
            Stop();
            return;
        }

        position = offset;
    } else {
        position = offset;
    }

    if (prevPos.Magnitude() > 0.0f) {
        velocity = position - prevPos;
        velocity /= CSoundSystem::timeStep;
        placed = true;
    } else {
        placed = false;
    }
}
