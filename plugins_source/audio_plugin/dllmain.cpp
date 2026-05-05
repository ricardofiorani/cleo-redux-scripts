#define _CRT_SECURE_NO_WARNINGS

#include <windows.h>
#include <cstdarg>
#include <string>
#include <sstream>

#include "cleo_redux_sdk.h"

// Helper for building log messages
std::string GetLogMsg(const char* format, ...) {
    char buffer[512];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    return buffer;
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD ul_reason_for_call, LPVOID lpReserved) {
    DWORD threadId = GetCurrentThreadId();
    
    switch (ul_reason_for_call) {
    case DLL_PROCESS_ATTACH: {
        char dllPath[MAX_PATH];
        GetModuleFileNameA(hModule, dllPath, MAX_PATH);
        char msg[512];
        sprintf(msg, "Audio DLL: PROCESS_ATTACH - module=%p, threadId=%lu, path=%s", hModule, threadId, dllPath);
        Log(msg);
        DisableThreadLibraryCalls(hModule);
        break;
    }

    case DLL_PROCESS_DETACH: {
        char msg[256];
        sprintf(msg, "Audio DLL: PROCESS_DETACH - lpReserved=%p, threadId=%lu", lpReserved, threadId);
        Log(msg);
        break;
    }
    }
    return TRUE;
}
