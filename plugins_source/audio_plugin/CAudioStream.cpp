#define _CRT_SECURE_NO_WARNINGS
#include "CAudioStream.h"
#include "CSoundSystem.h"
#include "cleo_redux_sdk.h"
#include <algorithm>
#include <fstream>
#include <windows.h>
#include <winhttp.h>
#undef max
#undef min

using namespace CLEO;

// DownloadManager implementation
DownloadManager::~DownloadManager() {
    for (auto& pair : downloads_) {
        if (pair.second->workerThread.joinable()) {
            pair.second->workerThread.join();
        }
    }
}

int DownloadManager::StartDownload(const std::string& url, const std::string& tempFilePath) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    int id = nextId_++;
    auto download = std::make_shared<PendingDownload>();
    download->id = id;
    download->url = url;
    download->tempFilePath = tempFilePath;
    download->completed = false;
    download->success = false;
    
    try {
        download->workerThread = std::thread(&DownloadManager::DownloadWorkerThread, this, id, url, tempFilePath);
    } catch (const std::exception& e) {
        download->completed = true;
        download->success = false;
        download->error = std::string("Thread creation failed: ") + e.what();
        downloads_[id] = download;
        return id;
    }
    
    downloads_[id] = download;
    return id;
}

bool DownloadManager::IsComplete(int id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = downloads_.find(id);
    if (it == downloads_.end()) return false;
    return it->second->completed.load();
}

bool DownloadManager::GetSuccess(int id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = downloads_.find(id);
    if (it == downloads_.end()) return false;
    return it->second->success.load();
}

std::string DownloadManager::GetError(int id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = downloads_.find(id);
    if (it == downloads_.end()) return "Unknown download ID";
    return it->second->error;
}

std::string DownloadManager::GetTempFilePath(int id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = downloads_.find(id);
    if (it == downloads_.end()) return "";
    return it->second->tempFilePath;
}

void DownloadManager::CleanupCompleted() {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = downloads_.begin();
    while (it != downloads_.end()) {
        if (it->second->completed.load()) {
            if (it->second->workerThread.joinable()) {
                it->second->workerThread.join();
            }
            ++it;
        } else {
            ++it;
        }
    }
}

std::string DownloadManager::ParseUrl(const std::string& url, bool& isSecure, std::string& host, int& port, std::string& path) {
    std::string remaining = url;
    isSecure = false;
    host = "";
    port = 80;
    path = "/";
    
    if (remaining.size() >= 8 && remaining.substr(0, 8) == "https://") {
        isSecure = true;
        port = 443;
        remaining = remaining.substr(8);
    } else if (remaining.size() >= 7 && remaining.substr(0, 7) == "http://") {
        remaining = remaining.substr(7);
    }
    
    size_t slashPos = remaining.find('/');
    std::string hostPart;
    if (slashPos == std::string::npos) {
        hostPart = remaining;
        path = "/";
    } else {
        hostPart = remaining.substr(0, slashPos);
        path = remaining.substr(slashPos);
    }
    
    size_t colonPos = hostPart.find(':');
    if (colonPos != std::string::npos) {
        host = hostPart.substr(0, colonPos);
        std::string portStr = hostPart.substr(colonPos + 1);
        try {
            int parsedPort = std::stoi(portStr);
            if (parsedPort > 0 && parsedPort <= 65535) {
                port = parsedPort;
            }
        } catch (...) {
            // Use default port
        }
    } else {
        host = hostPart;
    }
    
    if (path.empty()) path = "/";
    
    return host;
}

void DownloadManager::DownloadWorkerThread(int id, const std::string& url, const std::string& tempFilePath) {
    bool isSecure = false;
    std::string host;
    int port = 80;
    std::string path;
    
    ParseUrl(url, isSecure, host, port, path);
    
    HINTERNET hSession = NULL;
    HINTERNET hConnect = NULL;
    HINTERNET hRequest = NULL;
    HANDLE hFile = NULL;
    
    std::string error;
    bool success = false;
    int statusCode = 0;
    
    do {
        hSession = WinHttpOpen(L"CLEO-Redux-Audio/1.0",
                               WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                               WINHTTP_NO_PROXY_NAME,
                               WINHTTP_NO_PROXY_BYPASS, 0);
        if (!hSession) {
            error = "WinHttpOpen failed: " + std::to_string(GetLastError());
            break;
        }
        
        int hostLen = MultiByteToWideChar(CP_UTF8, 0, host.c_str(), -1, NULL, 0);
        std::wstring wHost(hostLen, 0);
        MultiByteToWideChar(CP_UTF8, 0, host.c_str(), -1, &wHost[0], hostLen);
        
        hConnect = WinHttpConnect(hSession, wHost.c_str(), (INTERNET_PORT)port, 0);
        if (!hConnect) {
            error = "WinHttpConnect failed: " + std::to_string(GetLastError());
            break;
        }
        
        int pathLen = MultiByteToWideChar(CP_UTF8, 0, path.c_str(), -1, NULL, 0);
        std::wstring wPath(pathLen, 0);
        MultiByteToWideChar(CP_UTF8, 0, path.c_str(), -1, &wPath[0], pathLen);
        
        DWORD flags = isSecure ? WINHTTP_FLAG_SECURE : 0;
        hRequest = WinHttpOpenRequest(hConnect, L"GET", wPath.c_str(),
                                      NULL, WINHTTP_NO_REFERER,
                                      WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
        if (!hRequest) {
            error = "WinHttpOpenRequest failed: " + std::to_string(GetLastError());
            break;
        }
        
        if (!WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0,
                                WINHTTP_NO_REQUEST_DATA, 0, 0, 0)) {
            error = "WinHttpSendRequest failed: " + std::to_string(GetLastError());
            break;
        }
        
        if (!WinHttpReceiveResponse(hRequest, NULL)) {
            error = "WinHttpReceiveResponse failed: " + std::to_string(GetLastError());
            break;
        }
        
        DWORD statusCodeSize = sizeof(statusCode);
        WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                            WINHTTP_HEADER_NAME_BY_INDEX, &statusCode, &statusCodeSize,
                            WINHTTP_NO_HEADER_INDEX);
        
        if (statusCode != 200) {
            error = "HTTP status code: " + std::to_string(statusCode);
            break;
        }
        
        hFile = CreateFile(tempFilePath.c_str(), GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 
                          FILE_ATTRIBUTE_TEMPORARY, NULL);
        if (hFile == INVALID_HANDLE_VALUE) {
            error = "CreateFile failed: " + std::to_string(GetLastError());
            break;
        }
        
        char buffer[4096];
        DWORD bytesRead = 0;
        while (WinHttpReadData(hRequest, buffer, sizeof(buffer), &bytesRead) && bytesRead > 0) {
            DWORD bytesWritten = 0;
            if (!WriteFile(hFile, buffer, bytesRead, &bytesWritten, NULL) || bytesWritten != bytesRead) {
                error = "WriteFile failed: " + std::to_string(GetLastError());
                break;
            }
        }
        
        if (!error.empty()) {
            break;
        }
        
        success = true;
        
    } while (false);
    
    if (hFile && hFile != INVALID_HANDLE_VALUE) {
        CloseHandle(hFile);
        // If download failed, delete the temp file
        if (!success) {
            DeleteFile(tempFilePath.c_str());
        }
    }
    if (hRequest) WinHttpCloseHandle(hRequest);
    if (hConnect) WinHttpCloseHandle(hConnect);
    if (hSession) WinHttpCloseHandle(hSession);
    
    {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = downloads_.find(id);
        if (it != downloads_.end()) {
            it->second->success = success;
            it->second->error = error;
            it->second->completed = true;
        }
    }
}

CAudioStream::CAudioStream(const char* filepath) {
    char logMsg[512];
    sprintf(logMsg, "CAudioStream: Creating stream from path = %s", filepath);
    Log(logMsg);
    
    if (isNetworkSource(filepath) && !CSoundSystem::allowNetworkSources) {
        Log("CAudioStream: Network sources disabled, returning");
        return;
    }
    
    unsigned flags = BASS_SAMPLE_SOFTWARE | BASS_STREAM_BLOCK;
    if (CSoundSystem::useFloatAudio) flags |= BASS_SAMPLE_FLOAT;
    
    if (!(streamInternal = BASS_StreamCreateFile(FALSE, filepath, 0, 0, flags))) {
        // For URL, use BASS_StreamCreateURL with callback for async loading
        isLoading = true;
        sprintf(logMsg, "CAudioStream: Attempting async URL load for %s", filepath);
        Log(logMsg);
        streamInternal = BASS_StreamCreateURL(filepath, 0, flags, DownloadCallback, this);
        if (!streamInternal) {
            isLoading = false;
            sprintf(logMsg, "CAudioStream: ERROR - BASS_StreamCreateURL failed for %s", filepath);
            Log(logMsg);
            return;
        }
        // Return immediately while download continues in background
        ok = true;
        state = Loading;
        sprintf(logMsg, "CAudioStream: Async URL load started for %s", filepath);
        Log(logMsg);
        return;
    }
    
    BASS_ChannelGetAttribute(streamInternal, BASS_ATTRIB_FREQ, &rate);
    ok = true;
    sprintf(logMsg, "CAudioStream: Stream created successfully from %s", filepath);
    Log(logMsg);
}

CAudioStream::CAudioStream(const char* url, bool isUrl) {
    char logMsg[512];
    sprintf(logMsg, "CAudioStream: Creating stream from URL (download-first approach) = %s", url);
    Log(logMsg);
    
    if (!CSoundSystem::allowNetworkSources) {
        Log("CAudioStream: Network sources disabled, returning");
        return;
    }
    
    // Create temp file path
    char tempPath[MAX_PATH];
    char tempFileName[MAX_PATH];
    GetTempPathA(MAX_PATH, tempPath);
    sprintf_s(tempFileName, "cleo_audio_%d_%d.mp3", GetCurrentProcessId(), GetTickCount());
    tempFilePath = tempPath;
    tempFilePath += tempFileName;
    
    sprintf(logMsg, "CAudioStream: Temp file path = %s", tempFilePath.c_str());
    Log(logMsg);
    
    // Start async download
    downloadId = DownloadManager::Instance().StartDownload(url, tempFilePath);
    isLoading = true;
    ok = true;
    state = Loading;
    
    sprintf(logMsg, "CAudioStream: Download started with ID %d", downloadId);
    Log(logMsg);
}

CAudioStream::~CAudioStream() {
    if (streamInternal) {
        BASS_StreamFree(streamInternal);
        Log("CAudioStream: Stream freed");
    }
    
    // Clean up temp file if it exists
    if (!tempFilePath.empty()) {
        DeleteFile(tempFilePath.c_str());
        char logMsg[512];
        sprintf(logMsg, "CAudioStream: Temp file deleted: %s", tempFilePath.c_str());
        Log(logMsg);
    }
}

// Static callback for BASS async download
void CALLBACK CAudioStream::DownloadCallback(const void *buffer, DWORD length, void *user) {
    auto stream = (CAudioStream*)user;
    // BASS calls this periodically during async download
    // When length is 0, download is complete
    if (length == 0) {
        stream->isLoading = false;
        stream->state = PlayingInactive;
        BASS_ChannelGetAttribute(stream->streamInternal, BASS_ATTRIB_FREQ, &stream->rate);
        Log("CAudioStream: BASS async download complete");
    }
}

void CAudioStream::Play() {
    char logMsg[256];
    sprintf(logMsg, "CAudioStream::Play: state=%d", state);
    Log(logMsg);
    
    if (state == Stopped) BASS_ChannelSetPosition(streamInternal, 0, BASS_POS_BYTE);
    state = PlayingInactive;
    
    if (streamInternal && IsReady()) {
        if (BASS_ChannelPlay(streamInternal, FALSE)) {
            state = Playing;
            Log("CAudioStream::Play: BASS_ChannelPlay succeeded");
        } else {
            char errMsg[256];
            sprintf(errMsg, "CAudioStream::Play: BASS_ChannelPlay failed, error=%d", BASS_ErrorGetCode());
            Log(errMsg);
        }
    }
}

void CAudioStream::Pause(bool changeState) {
    char logMsg[256];
    sprintf(logMsg, "CAudioStream::Pause: currentState=%d, changeState=%d", GetState(), changeState);
    Log(logMsg);
    
    if (GetState() == Playing) {
        BASS_ChannelPause(streamInternal);
        state = changeState ? Paused : PlayingInactive;
    }
}

void CAudioStream::Stop() {
    Log("CAudioStream::Stop called");
    
    BASS_ChannelPause(streamInternal);
    state = Stopped;
    speed.finish();
    volume.finish();
}

void CAudioStream::Resume() {
    Play();
}

float CAudioStream::GetLength() const {
    if (!streamInternal) return 0.0f;
    return (float)BASS_ChannelBytes2Seconds(streamInternal, BASS_ChannelGetLength(streamInternal, BASS_POS_BYTE));
}

void CAudioStream::SetProgress(float value) {
    if (!streamInternal) return;
    
    if (GetState() == Stopped) {
        state = Paused;
    }
    
    value = std::clamp(value, 0.0f, 1.0f);
    auto bytePos = BASS_ChannelSeconds2Bytes(streamInternal, GetLength() * value);
    BASS_ChannelSetPosition(streamInternal, bytePos, BASS_POS_BYTE);
}

float CAudioStream::GetProgress() const {
    if (!streamInternal) return 0.0f;
    
    auto bytePos = BASS_ChannelGetPosition(streamInternal, BASS_POS_BYTE);
    if (bytePos == -1) bytePos = 0;
    auto pos = BASS_ChannelBytes2Seconds(streamInternal, bytePos);
    
    auto byteTotal = BASS_ChannelGetLength(streamInternal, BASS_POS_BYTE);
    auto total = BASS_ChannelBytes2Seconds(streamInternal, byteTotal);
    
    return (float)(pos / total);
}

CAudioStream::StreamState CAudioStream::GetState() const {
    return (state == PlayingInactive) ? Playing : state;
}

void CAudioStream::SetLooping(bool enable) {
    if (streamInternal) {
        BASS_ChannelFlags(streamInternal, enable ? BASS_SAMPLE_LOOP : 0, BASS_SAMPLE_LOOP);
    }
}

bool CLEO::CAudioStream::GetLooping() const {
    if (!streamInternal) return false;
    return (BASS_ChannelFlags(streamInternal, 0, 0) & BASS_SAMPLE_LOOP) != 0;
}

void CAudioStream::SetVolume(float value, float transitionTime) {
    volume.setValue(std::max(value, 0.0f), transitionTime);
}

float CAudioStream::GetVolume() const {
    return volume.value();
}

void CAudioStream::SetSpeed(float value, float transitionTime) {
    if (value > 0.0f && transitionTime > 0.0f) Resume();
    speed.setValue(std::max(value, 0.0f), transitionTime);
}

float CAudioStream::GetSpeed() const {
    return speed.value();
}

void CLEO::CAudioStream::SetType(eStreamType value) {
    switch (value) {
    case eStreamType::SoundEffect:
    case eStreamType::Music:
    case eStreamType::UserInterface:
        type = value;
        break;
    default:
        type = eStreamType::None;
    }
}

eStreamType CLEO::CAudioStream::GetType() const {
    return type;
}

float CAudioStream::CalculateVolume() {
    float vol = 1.0f;
    
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
    }
    
    vol *= volume.value();
    return vol;
}

float CAudioStream::CalculateSpeed() {
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
    
    return speed.value() * masterSpeed;
}

bool CAudioStream::IsOk() const {
    return ok || isLoading;
}

bool CAudioStream::IsReady() const {
    return ok && !isLoading && streamInternal != 0;
}

HSTREAM CAudioStream::GetInternal() {
    return streamInternal;
}

void CAudioStream::Process() {
    // Handle download-first URL loading
    if (isLoading && downloadId >= 0) {
        if (DownloadManager::Instance().IsComplete(downloadId)) {
            if (DownloadManager::Instance().GetSuccess(downloadId)) {
                Log("CAudioStream: Download complete, creating stream from temp file");

                if (!BASSLoader::Instance().IsLoaded()) {
                    Log("CAudioStream: BASS not loaded, attempting lazy init");
                    if (!BASSLoader::Instance().Load()) {
                        Log("CAudioStream: Lazy BASS load failed");
                        ok = false;
                        isLoading = false;
                        return;
                    }
                    if (!BASS_Init(-1, 44100, 0, NULL, NULL)) {
                        char logMsg[256];
                        sprintf(logMsg, "CAudioStream: Lazy BASS_Init failed, error=%d", BASS_ErrorGetCode());
                        Log(logMsg);
                        ok = false;
                        isLoading = false;
                        return;
                    }
                    Log("CAudioStream: Lazy BASS init succeeded");
                }
                
                unsigned flags = BASS_SAMPLE_SOFTWARE | BASS_STREAM_BLOCK;
                if (CSoundSystem::useFloatAudio) flags |= BASS_SAMPLE_FLOAT;
                
                streamInternal = BASS_StreamCreateFile(FALSE, tempFilePath.c_str(), 0, 0, flags);
                if (streamInternal) {
                    BASS_ChannelGetAttribute(streamInternal, BASS_ATTRIB_FREQ, &rate);
                    isLoading = false;
                    state = Stopped;
                    Log("CAudioStream: Stream created successfully from downloaded file");
                } else {
                    char logMsg[256];
                    sprintf(logMsg, "CAudioStream: ERROR - Failed to create stream from downloaded file, error=%d",
                        BASS_ErrorGetCode());
                    Log(logMsg);
                    ok = false;
                    isLoading = false;
                }
            } else {
                char logMsg[512];
                sprintf(logMsg, "CAudioStream: ERROR - Download failed: %s", 
                    DownloadManager::Instance().GetError(downloadId).c_str());
                Log(logMsg);
                ok = false;
                isLoading = false;
            }
        } else {
            // Still downloading
            return;
        }
    }
    
    if (state == Loading) {
        // Still loading (for BASS_StreamCreateURL approach)
        return;
    }
    if (state == PlayingInactive) {
        if (streamInternal && BASS_ChannelPlay(streamInternal, FALSE)) {
            state = Playing;
        }
    } else {
        if (state == Playing && streamInternal && BASS_ChannelIsActive(streamInternal) == BASS_ACTIVE_STOPPED) {
            state = Stopped;
        }
    }
    
    float prevSpeed = speed.value();
    
    speed.update(CSoundSystem::timeStep);
    volume.update(CSoundSystem::timeStep);
    
    if (prevSpeed > 0.0f && speed.value() <= 0.0f) {
        Pause();
    }
    
    if (state != Playing || !streamInternal) return;
    
    float vol = CalculateVolume();
    BASS_ChannelSetAttribute(streamInternal, BASS_ATTRIB_VOL, vol);
    
    float freq = rate * CalculateSpeed();
    freq = std::max(freq, 0.000001f);
    BASS_ChannelSetAttribute(streamInternal, BASS_ATTRIB_FREQ, freq);
}

void CAudioStream::Set3dPosition(const CVector& pos) {}
void CAudioStream::Set3dSourceSize(float radius) {}
void CAudioStream::SetHost(void* placable, int entityType, const CVector& offset) {}