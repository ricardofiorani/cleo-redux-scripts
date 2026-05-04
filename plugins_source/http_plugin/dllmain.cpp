#define _CRT_SECURE_NO_WARNINGS

#include <windows.h>
#include <string>
#include <sstream>

#include "cleo_redux_sdk.h"
#include "HttpClient.h"

BOOL APIENTRY DllMain(HMODULE hModule, DWORD ul_reason_for_call, LPVOID lpReserved) {
    switch (ul_reason_for_call) {
    case DLL_PROCESS_ATTACH:
        DisableThreadLibraryCalls(hModule);
        break;
    case DLL_PROCESS_DETACH:
        break;
    }
    return TRUE;
}

class HttpPlugin {
public:
    HttpPlugin() {
        Log("HTTP plugin 1.0 - Async HTTP requests using WinHTTP");
        
        RegisterCommand("PING", Ping, "net");
        RegisterCommand("START_HTTP_REQUEST", StartHttpRequest, "net");
        RegisterCommand("IS_HTTP_REQUEST_COMPLETE", HttpIsComplete, "net");
        RegisterCommand("GET_HTTP_RESPONSE", GetHttpResponse, "net");
        RegisterCommand("GET_HTTP_RESPONSE_CHUNK", GetHttpResponseChunk, "net");
        RegisterCommand("GET_HTTP_STATUS_CODE", GetHttpStatusCode, "net");
        RegisterCommand("GET_HTTP_ERROR", GetHttpError, "net");
        
        // Register OnAfterScripts callback for cleanup
        OnAfterScripts(OnAfterScriptsCallback);
    }

    // PING() -> returns "pong"
    static HandlerResult Ping(Context ctx) {
        SetStringParam(ctx, "pong");
        return HandlerResult::CONTINUE;
    }

    // START_HTTP_REQUEST(url) -> returns request_id
    static HandlerResult StartHttpRequest(Context ctx) {
        char url[256];
        GetStringParam(ctx, url, (unsigned char)255);
        
        int requestId = HttpRequestManager::Instance().StartRequest(std::string(url));
        
        // Set compare flag to indicate success (requestId > 0)
        UpdateCompareFlag(ctx, requestId > 0);
        SetIntParam(ctx, requestId);
        
        Log(("HTTP request started, ID: " + std::to_string(requestId)).c_str());
        
        return HandlerResult::CONTINUE;
    }

    // IS_HTTP_REQUEST_COMPLETE(request_id) -> sets compare flag
    static HandlerResult HttpIsComplete(Context ctx) {
        int requestId = (int)GetIntParam(ctx);
        bool complete = HttpRequestManager::Instance().IsComplete(requestId);
        UpdateCompareFlag(ctx, complete);
        return HandlerResult::CONTINUE;
    }

    // GET_HTTP_RESPONSE(request_id) -> returns response body string
    static HandlerResult GetHttpResponse(Context ctx) {
        int requestId = (int)GetIntParam(ctx);
        std::string response;
        int statusCode = 0;
        
        bool success = HttpRequestManager::Instance().GetResponse(requestId, response, statusCode);
        
        if (success) {
            SetStringParam(ctx, response.c_str());
        } else {
            SetStringParam(ctx, "");
        }
        
        return HandlerResult::CONTINUE;
    }

    // GET_HTTP_RESPONSE_CHUNK(request_id, offset, max_len) -> returns chunk string
    static HandlerResult GetHttpResponseChunk(Context ctx) {
        int requestId = (int)GetIntParam(ctx);
        int offset = (int)GetIntParam(ctx);
        int maxLen = (int)GetIntParam(ctx);

        std::string chunk;
        int bytesRead = 0;

        HttpRequestManager::Instance().GetResponseChunk(requestId, offset, maxLen, chunk, bytesRead);

        SetStringParam(ctx, chunk.c_str());
        return HandlerResult::CONTINUE;
    }

    // GET_HTTP_STATUS_CODE(request_id) -> returns status code
    static HandlerResult GetHttpStatusCode(Context ctx) {
        int requestId = (int)GetIntParam(ctx);
        std::string response;
        int statusCode = 0;
        
        HttpRequestManager::Instance().GetResponse(requestId, response, statusCode);
        SetIntParam(ctx, statusCode);
        
        return HandlerResult::CONTINUE;
    }

    // GET_HTTP_ERROR(request_id) -> returns error string
    static HandlerResult GetHttpError(Context ctx) {
        int requestId = (int)GetIntParam(ctx);
        std::string error = HttpRequestManager::Instance().GetError(requestId);
        SetStringParam(ctx, error.c_str());
        return HandlerResult::CONTINUE;
    }

    // Callback after scripts run - cleanup completed requests
    static void OnAfterScriptsCallback(unsigned int current_time, int time_step) {
        HttpRequestManager::Instance().CleanupCompleted();
    }

} g_HttpPlugin;
