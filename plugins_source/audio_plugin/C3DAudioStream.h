#pragma once
#include "CAudioStream.h"

namespace CLEO {
    class C3DAudioStream : public CAudioStream {
    public:
        C3DAudioStream(const char* filepath);

        virtual bool Is3d() const { return true; }
        virtual void Set3dPosition(const CVector& pos);
        virtual void Set3dSourceSize(float radius);
        virtual void SetHost(void* host, int entityType, const CVector& offset);
        virtual void Process();
        virtual float CalculateVolume();
        virtual float CalculateSpeed();

    protected:
        const float Volume_3D_Adjust = 0.5f;
        static double CalculateDistanceDecay(float radius, float distance);
        static float CalculateDirectionDecay(const CVector& listenerDir, const CVector& relativePos);

        void* host = nullptr;
        int hostType = 0;
        CVector offset = {0.0f, 0.0f, 0.0f};
        float radius = 0.5f;

        bool placed = false;
        CVector position = {0.0f, 0.0f, 0.0f};
        CVector velocity = {0.0f, 0.0f, 0.0f};

        C3DAudioStream(const C3DAudioStream&) = delete;
        void UpdatePosition();
    };
}
