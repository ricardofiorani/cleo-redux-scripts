#include "HttpClient.h"
#include <sstream>
#include <algorithm>

int HttpRequestManager::StartRequest(const std::string& url) {
    return StartRequest("GET", url, "", "");
}

int HttpRequestManager::StartRequest(const std::string& method, const std::string& url, const std::string& body, const std::string& headers) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    int id = nextId_++;
    auto req = std::make_shared<HttpRequest>();
    req->id = id;
    req->url = url;
    req->method = method;
    req->body = body;
    req->headers = headers;
    req->statusCode = 0;
    req->started = true;
    req->completed = false;
    req->success = false;
    
    try {
        req->workerThread = std::thread(&HttpRequestManager::HttpWorkerThread, this, id, method, url, body, headers);
    } catch (const std::exception& e) {
        req->completed = true;
        req->success = false;
        req->error = std::string("Thread creation failed: ") + e.what();
        requests_[id] = req;
        return id;
    }
    
    requests_[id] = req;
    return id;
}

bool HttpRequestManager::IsComplete(int id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = requests_.find(id);
    if (it == requests_.end()) return false;
    return it->second->completed.load();
}

bool HttpRequestManager::GetResponse(int id, std::string& outResponse, int& outStatusCode) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = requests_.find(id);
    if (it == requests_.end()) return false;
    if (!it->second->completed.load()) return false;
    
    outResponse = it->second->response;
    outStatusCode = it->second->statusCode;
    return it->second->success.load();
}

std::string HttpRequestManager::GetError(int id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = requests_.find(id);
    if (it == requests_.end()) return "Unknown request ID";
    return it->second->error;
}

bool HttpRequestManager::GetResponseChunk(int id, int offset, int maxLen, std::string& chunk, int& bytesRead) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = requests_.find(id);
    if (it == requests_.end()) return false;
    if (!it->second->completed.load()) return false;

    const std::string& response = it->second->response;
    int totalLen = static_cast<int>(response.size());

    if (offset >= totalLen) {
        bytesRead = 0;
        chunk = "";
        return it->second->success.load();
    }

    int available = totalLen - offset;
    int toRead = (maxLen < available) ? maxLen : available;

    chunk = response.substr(offset, toRead);
    bytesRead = toRead;
    return it->second->success.load();
}

void HttpRequestManager::CleanupCompleted() {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = requests_.begin();
    while (it != requests_.end()) {
        if (it->second->completed.load()) {
            if (it->second->workerThread.joinable()) {
                it->second->workerThread.join();
            }
            // Don't erase - keep response data accessible to script
            // Requests will be cleaned up when manager is destroyed
            ++it;
        } else {
            ++it;
        }
    }
}

std::string HttpRequestManager::ParseUrl(const std::string& url, bool& isSecure, std::string& host, int& port, std::string& path) {
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

void HttpRequestManager::HttpWorkerThread(int id, const std::string& method, const std::string& url, const std::string& body, const std::string& headers) {
    bool isSecure = false;
    std::string host;
    int port = 80;
    std::string path;
    
    ParseUrl(url, isSecure, host, port, path);
    
    HINTERNET hSession = NULL;
    HINTERNET hConnect = NULL;
    HINTERNET hRequest = NULL;
    
    std::string response;
    int statusCode = 0;
    bool success = false;
    std::string error;
    
    do {
        hSession = WinHttpOpen(L"CLEO-Redux-HTTP/1.0",
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
        
        int methodLen = MultiByteToWideChar(CP_UTF8, 0, method.c_str(), -1, NULL, 0);
        std::wstring wMethod(methodLen, 0);
        MultiByteToWideChar(CP_UTF8, 0, method.c_str(), -1, &wMethod[0], methodLen);
        
        DWORD flags = isSecure ? WINHTTP_FLAG_SECURE : 0;
        hRequest = WinHttpOpenRequest(hConnect, wMethod.c_str(), wPath.c_str(),
                                      NULL, WINHTTP_NO_REFERER,
                                      WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
        if (!hRequest) {
            error = "WinHttpOpenRequest failed: " + std::to_string(GetLastError());
            break;
        }
        
        if (!headers.empty()) {
            int headersLen = MultiByteToWideChar(CP_UTF8, 0, headers.c_str(), -1, NULL, 0);
            std::wstring wHeaders(headersLen, 0);
            MultiByteToWideChar(CP_UTF8, 0, headers.c_str(), -1, &wHeaders[0], headersLen);
            
            if (!WinHttpAddRequestHeaders(hRequest, wHeaders.c_str(), -1, WINHTTP_ADDREQ_FLAG_ADD)) {
                error = "WinHttpAddRequestHeaders failed: " + std::to_string(GetLastError());
                break;
            }
        }
        
        if (!body.empty()) {
            int bodyLen = static_cast<int>(body.size());
            if (!WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0,
                                    (LPVOID)body.c_str(), bodyLen, bodyLen, 0)) {
                error = "WinHttpSendRequest failed: " + std::to_string(GetLastError());
                break;
            }
        } else {
            if (!WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0,
                                    WINHTTP_NO_REQUEST_DATA, 0, 0, 0)) {
                error = "WinHttpSendRequest failed: " + std::to_string(GetLastError());
                break;
            }
        }
        
        if (!WinHttpReceiveResponse(hRequest, NULL)) {
            error = "WinHttpReceiveResponse failed: " + std::to_string(GetLastError());
            break;
        }
        
        DWORD statusCodeSize = sizeof(statusCode);
        WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                            WINHTTP_HEADER_NAME_BY_INDEX, &statusCode, &statusCodeSize,
                            WINHTTP_NO_HEADER_INDEX);
        
        char buffer[4096];
        DWORD bytesRead = 0;
        while (WinHttpReadData(hRequest, buffer, sizeof(buffer), &bytesRead) && bytesRead > 0) {
            response.append(buffer, bytesRead);
        }
        
        success = true;
        
    } while (false);
    
    if (hRequest) WinHttpCloseHandle(hRequest);
    if (hConnect) WinHttpCloseHandle(hConnect);
    if (hSession) WinHttpCloseHandle(hSession);
    
    {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = requests_.find(id);
        if (it != requests_.end()) {
            it->second->response = response;
            it->second->statusCode = statusCode;
            it->second->success = success;
            it->second->error = error;
            it->second->completed = true;
        }
    }
}
