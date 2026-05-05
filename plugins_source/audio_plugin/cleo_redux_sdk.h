#pragma once
#include <stdint.h>

#define STR_MAX_LEN 128

enum class HandlerResult
{
	CONTINUE = 0,
	BREAK = 1,
	TERMINATE = 2,
	ERR = -1
};

enum class HostId
{
	RE3 = 1,
	REVC = 2,
	GTA3 = 3,
	VC = 4,
	SA = 5,
	GTA3_UNREAL = 6,
	VC_UNREAL = 7,
	SA_UNREAL = 8,
	IV = 9,
	BULLY = 10,
	MANIFEST = 254,
	UNKNOWN = 255
};

enum class Directory
{
	CLEO = 0,
	CONFIG = 1,
	TEXT = 2,
	PLUGINS = 3,
	CWD = 4,
	HOST = 5,
};

typedef void* Context;
typedef intptr_t isize;

typedef HandlerResult (*CommandHandler)(Context);
typedef void* (*CustomLoader)(const char*);
typedef void (*OnTickCallback)(unsigned int current_time, int time_step);
typedef void (*OnRuntimeInitCallback)();
typedef void (*OnShowTextBoxCallback)(const char*);


extern "C" {
	long GetSDKVersion();
	HostId GetHostId();
	void ResolvePath(const char* src, char* dest);
	void GetCLEOFolder(char* dest);
	void GetCwd(char* dest);
	void Log(const char* text);
	void RegisterCommand(const char* name, CommandHandler handler, const char* permission = nullptr);
    isize GetIntParam(Context ctx);
    float GetFloatParam(Context ctx);
	void GetStringParam(Context ctx, char* dest, unsigned char maxlen);
    void SetIntParam(Context ctx, isize value);
    void SetFloatParam(Context ctx, float value);
    void SetStringParam(Context ctx, const char* src);
	void UpdateCompareFlag(Context ctx, bool result);
	void GetHostName(char* dest, unsigned char maxlen);
    void SetHostName(const char* src);
    void RuntimeInit();
    void RuntimeNextTick(unsigned int current_time, int time_step);
	void RegisterLoader(const char* glob, CustomLoader loader);
	void* AllocMem(size_t size);
	void FreeMem(void *ptr);
	void OnBeforeScripts(OnTickCallback callback);
	void OnAfterScripts(OnTickCallback callback);
    void OnRuntimeInit(OnRuntimeInitCallback callback);
    void OnShowTextBox(OnShowTextBoxCallback callback);
    void GetDirectoryPath(Directory dir, char* dest);
    void GetCLEOVersion(char* dest);
    void* GetSymbolAddress(const char* symbol);
    size_t GetNumberOfActiveCSScripts();
    size_t GetNumberOfActiveJSScripts();
	bool IsEndOfArguments(Context ctx);
	void TriggerEvent(const char* name, const char* data);
}
