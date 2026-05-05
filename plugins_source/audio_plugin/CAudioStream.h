#pragma once
#include "CSoundSystem.h"
#include "CInterpolatedValue.h"
#include "bass.h"

#include <string>
#include <atomic>
#include <mutex>
#include <map>
#include <memory>

namespace CLEO {

struct PendingDownload {
    int id;
    std::string url;
    std::string tempFilePath;
    std::atomic<bool> completed{false};
    std::atomic<bool> success{false};
    std::thread workerThread;
    std::string error;
};

class DownloadManager {
public:
    static DownloadManager& Instance() {
        static DownloadManager instance;
        return instance;
    }

    int StartDownload(const std::string& url, const std::string& tempFilePath);
    bool IsComplete(int id);
    bool GetSuccess(int id);
    std::string GetError(int id);
    std::string GetTempFilePath(int id);
    void CleanupCompleted();

private:
    DownloadManager() : nextId_(1) {}
    ~DownloadManager();

    DownloadManager(const DownloadManager&) = delete;
    DownloadManager& operator=(const DownloadManager&) = delete;

    void DownloadWorkerThread(int id, const std::string& url, const std::string& tempFilePath);
    std::string ParseUrl(const std::string& url, bool& isSecure, std::string& host, int& port, std::string& path);

    std::map<int, std::shared_ptr<PendingDownload>> downloads_;
    std::mutex mutex_;
    int nextId_;
};

#pragma pack(push, 4)
    class CAudioStream {
    public:
        enum StreamState {
            Stopped = -1,
            Loading,
            PlayingInactive,
            Playing,
            Paused,
        };

        CAudioStream(const char* filepath);
        CAudioStream(const char* url, bool isUrl);  // New constructor for URL downloads
        virtual ~CAudioStream();

        bool IsOk() const;
        bool IsReady() const;
        HSTREAM GetInternal();

        bool IsLoading() const { return isLoading; }
        int GetDownloadId() const { return downloadId; }

        StreamState GetState() const;
        void Play();
        void Pause(bool changeState = true);
        void Stop();
        void Resume();

        void SetLooping(bool enable);
        bool GetLooping() const;

        float GetLength() const;

        void SetProgress(float value);
        float GetProgress() const;

        void SetSpeed(float value, float transitionTime = 0.0f);
        float GetSpeed() const;

        void SetType(eStreamType value);
        eStreamType GetType() const;

        void SetVolume(float value, float transitionTime = 0.0f);
        float GetVolume() const;

        virtual bool Is3d() const { return false; }
        virtual void Set3dPosition(const CVector& pos);
        virtual void Set3dSourceSize(float radius);
        virtual void SetHost(void* placable, int entityType, const CVector& offset);

        virtual void Process();
        virtual float CalculateVolume();
        virtual float CalculateSpeed();

    protected:
        CAudioStream() = default;
        CAudioStream(const CAudioStream&) = delete;

        bool isLoading = false;
        int downloadId = -1;
        std::string tempFilePath;

        HSTREAM streamInternal = 0;
        StreamState state = Paused;
        eStreamType type = eStreamType::SoundEffect;
        bool ok = false;
        float rate = 44100.0f;
        CInterpolatedValue speed = {1.0f};
        CInterpolatedValue volume = {1.0f};

        static void CALLBACK DownloadCallback(const void *buffer, DWORD length, void *user);
    };
#pragma pack(pop)
}
