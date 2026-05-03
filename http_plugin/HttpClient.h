#pragma once

#include <windows.h>
#include <winhttp.h>
#include <string>
#include <map>
#include <mutex>
#include <thread>
#include <atomic>
#include <memory>

struct HttpRequest {
    int id;
    std::string url;
    std::string response;
    std::string error;
    int statusCode;
    std::atomic<bool> completed{false};
    std::atomic<bool> started{false};
    std::atomic<bool> success{false};
    std::thread workerThread;
};

class HttpRequestManager {
public:
    static HttpRequestManager& Instance() {
        static HttpRequestManager instance;
        return instance;
    }

    int StartRequest(const std::string& url);
    bool IsComplete(int id);
    bool GetResponse(int id, std::string& outResponse, int& outStatusCode);
    bool GetResponseChunk(int id, int offset, int maxLen, std::string& chunk, int& bytesRead);
    std::string GetError(int id);
    void CleanupCompleted();

private:
    HttpRequestManager() : nextId_(1) {}
    ~HttpRequestManager() {
        for (auto& pair : requests_) {
            if (pair.second->workerThread.joinable()) {
                pair.second->workerThread.join();
            }
        }
    }

    HttpRequestManager(const HttpRequestManager&) = delete;
    HttpRequestManager& operator=(const HttpRequestManager&) = delete;

    void HttpWorkerThread(int id, const std::string& url);
    std::string ParseUrl(const std::string& url, bool& isSecure, std::string& host, int& port, std::string& path);

    std::map<int, std::shared_ptr<HttpRequest>> requests_;
    std::mutex mutex_;
    int nextId_;
};
