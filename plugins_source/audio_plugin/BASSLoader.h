#pragma once
#include <windows.h>
#include "bass.h"

class BASSLoader {
public:
    static BASSLoader& Instance() {
        static BASSLoader instance;
        return instance;
    }

    bool Load() {
        if (loaded) return true;

        hModule = LoadLibraryA("bass.dll");
        if (!hModule) return false;

        #define RESOLVE(name) p##name = (decltype(p##name))GetProcAddress(hModule, #name); if (!p##name) { FreeLibrary(hModule); hModule = nullptr; return false; }

        RESOLVE(BASS_SetConfig)
        RESOLVE(BASS_GetConfig)
        RESOLVE(BASS_SetConfigPtr)
        RESOLVE(BASS_GetConfigPtr)
        RESOLVE(BASS_GetVersion)
        RESOLVE(BASS_ErrorGetCode)
        RESOLVE(BASS_GetDeviceInfo)
        RESOLVE(BASS_Init)
        RESOLVE(BASS_Free)
        RESOLVE(BASS_SetDevice)
        RESOLVE(BASS_GetDevice)
        RESOLVE(BASS_GetInfo)
        RESOLVE(BASS_Start)
        RESOLVE(BASS_Stop)
        RESOLVE(BASS_Pause)
        RESOLVE(BASS_IsStarted)
        RESOLVE(BASS_Update)
        RESOLVE(BASS_GetCPU)
        RESOLVE(BASS_SetVolume)
        RESOLVE(BASS_GetVolume)
        RESOLVE(BASS_Set3DFactors)
        RESOLVE(BASS_Get3DFactors)
        RESOLVE(BASS_Set3DPosition)
        RESOLVE(BASS_Get3DPosition)
        RESOLVE(BASS_Apply3D)
        RESOLVE(BASS_PluginLoad)
        RESOLVE(BASS_PluginFree)
        RESOLVE(BASS_PluginEnable)
        RESOLVE(BASS_PluginGetInfo)
        RESOLVE(BASS_SampleLoad)
        RESOLVE(BASS_SampleCreate)
        RESOLVE(BASS_SampleFree)
        RESOLVE(BASS_SampleSetData)
        RESOLVE(BASS_SampleGetData)
        RESOLVE(BASS_SampleGetInfo)
        RESOLVE(BASS_SampleSetInfo)
        RESOLVE(BASS_SampleGetChannel)
        RESOLVE(BASS_SampleGetChannels)
        RESOLVE(BASS_SampleStop)
        RESOLVE(BASS_StreamCreate)
        RESOLVE(BASS_StreamCreateFile)
        RESOLVE(BASS_StreamCreateURL)
        RESOLVE(BASS_StreamCreateFileUser)
        RESOLVE(BASS_StreamCancel)
        RESOLVE(BASS_StreamFree)
        RESOLVE(BASS_StreamGetFilePosition)
        RESOLVE(BASS_StreamPutData)
        RESOLVE(BASS_StreamPutFileData)
        RESOLVE(BASS_MusicLoad)
        RESOLVE(BASS_MusicFree)
        RESOLVE(BASS_RecordGetDeviceInfo)
        RESOLVE(BASS_RecordInit)
        RESOLVE(BASS_RecordFree)
        RESOLVE(BASS_RecordSetDevice)
        RESOLVE(BASS_RecordGetDevice)
        RESOLVE(BASS_RecordGetInfo)
        RESOLVE(BASS_RecordGetInputName)
        RESOLVE(BASS_RecordSetInput)
        RESOLVE(BASS_RecordGetInput)
        RESOLVE(BASS_RecordStart)
        RESOLVE(BASS_ChannelBytes2Seconds)
        RESOLVE(BASS_ChannelSeconds2Bytes)
        RESOLVE(BASS_ChannelGetDevice)
        RESOLVE(BASS_ChannelSetDevice)
        RESOLVE(BASS_ChannelIsActive)
        RESOLVE(BASS_ChannelGetInfo)
        RESOLVE(BASS_ChannelGetTags)
        RESOLVE(BASS_ChannelFlags)
        RESOLVE(BASS_ChannelLock)
        RESOLVE(BASS_ChannelRef)
        RESOLVE(BASS_ChannelFree)
        RESOLVE(BASS_ChannelPlay)
        RESOLVE(BASS_ChannelStart)
        RESOLVE(BASS_ChannelStop)
        RESOLVE(BASS_ChannelPause)
        RESOLVE(BASS_ChannelUpdate)
        RESOLVE(BASS_ChannelSetAttribute)
        RESOLVE(BASS_ChannelGetAttribute)
        RESOLVE(BASS_ChannelSlideAttribute)
        RESOLVE(BASS_ChannelIsSliding)
        RESOLVE(BASS_ChannelSetAttributeEx)
        RESOLVE(BASS_ChannelGetAttributeEx)
        RESOLVE(BASS_ChannelSet3DAttributes)
        RESOLVE(BASS_ChannelGet3DAttributes)
        RESOLVE(BASS_ChannelSet3DPosition)
        RESOLVE(BASS_ChannelGet3DPosition)
        RESOLVE(BASS_ChannelGetLength)
        RESOLVE(BASS_ChannelSetPosition)
        RESOLVE(BASS_ChannelGetPosition)
        RESOLVE(BASS_ChannelGetLevel)
        RESOLVE(BASS_ChannelGetLevelEx)
        RESOLVE(BASS_ChannelGetData)
        RESOLVE(BASS_ChannelSetSync)
        RESOLVE(BASS_ChannelRemoveSync)
        RESOLVE(BASS_ChannelSetLink)
        RESOLVE(BASS_ChannelRemoveLink)
        RESOLVE(BASS_ChannelSetDSP)
        RESOLVE(BASS_ChannelSetDSPEx)
        RESOLVE(BASS_ChannelRemoveDSP)
        RESOLVE(BASS_ChannelSetFX)
        RESOLVE(BASS_ChannelRemoveFX)
        RESOLVE(BASS_FXSetParameters)
        RESOLVE(BASS_FXGetParameters)
        RESOLVE(BASS_FXSetPriority)
        RESOLVE(BASS_FXSetBypass)
        RESOLVE(BASS_FXReset)
        RESOLVE(BASS_FXFree)

        #undef RESOLVE

        loaded = true;
        return true;
    }

    bool IsLoaded() const { return loaded; }

    HMODULE GetModule() const { return hModule; }

private:
    BASSLoader() : hModule(nullptr), loaded(false) {}
    ~BASSLoader() { if (hModule) FreeLibrary(hModule); }
    BASSLoader(const BASSLoader&) = delete;
    BASSLoader& operator=(const BASSLoader&) = delete;

    HMODULE hModule;
    bool loaded;

public:
    #define DECLARE_FUNC(type, name, params) type (WINAPI *p##name) params

    DECLARE_FUNC(BOOL, BASS_SetConfig, (DWORD option, DWORD value));
    DECLARE_FUNC(DWORD, BASS_GetConfig, (DWORD option));
    DECLARE_FUNC(BOOL, BASS_SetConfigPtr, (DWORD option, const void *value));
    DECLARE_FUNC(const void*, BASS_GetConfigPtr, (DWORD option));
    DECLARE_FUNC(DWORD, BASS_GetVersion, (void));
    DECLARE_FUNC(int, BASS_ErrorGetCode, (void));
    DECLARE_FUNC(BOOL, BASS_GetDeviceInfo, (DWORD device, BASS_DEVICEINFO *info));
    DECLARE_FUNC(BOOL, BASS_Init, (int device, DWORD freq, DWORD flags, HWND win, const void *dsguid));
    DECLARE_FUNC(BOOL, BASS_Free, (void));
    DECLARE_FUNC(BOOL, BASS_SetDevice, (DWORD device));
    DECLARE_FUNC(DWORD, BASS_GetDevice, (void));
    DECLARE_FUNC(BOOL, BASS_GetInfo, (BASS_INFO *info));
    DECLARE_FUNC(BOOL, BASS_Start, (void));
    DECLARE_FUNC(BOOL, BASS_Stop, (void));
    DECLARE_FUNC(BOOL, BASS_Pause, (void));
    DECLARE_FUNC(DWORD, BASS_IsStarted, (void));
    DECLARE_FUNC(BOOL, BASS_Update, (DWORD length));
    DECLARE_FUNC(float, BASS_GetCPU, (void));
    DECLARE_FUNC(BOOL, BASS_SetVolume, (float volume));
    DECLARE_FUNC(float, BASS_GetVolume, (void));
    DECLARE_FUNC(BOOL, BASS_Set3DFactors, (float distf, float rollf, float doppf));
    DECLARE_FUNC(BOOL, BASS_Get3DFactors, (float *distf, float *rollf, float *doppf));
    DECLARE_FUNC(BOOL, BASS_Set3DPosition, (const BASS_3DVECTOR *pos, const BASS_3DVECTOR *vel, const BASS_3DVECTOR *front, const BASS_3DVECTOR *top));
    DECLARE_FUNC(BOOL, BASS_Get3DPosition, (BASS_3DVECTOR *pos, BASS_3DVECTOR *vel, BASS_3DVECTOR *front, BASS_3DVECTOR *top));
    DECLARE_FUNC(void, BASS_Apply3D, (void));
    DECLARE_FUNC(HPLUGIN, BASS_PluginLoad, (const char *file, DWORD flags));
    DECLARE_FUNC(BOOL, BASS_PluginFree, (HPLUGIN handle));
    DECLARE_FUNC(BOOL, BASS_PluginEnable, (HPLUGIN handle, BOOL enable));
    DECLARE_FUNC(const BASS_PLUGININFO*, BASS_PluginGetInfo, (HPLUGIN handle));
    DECLARE_FUNC(HSAMPLE, BASS_SampleLoad, (DWORD filetype, const void *file, QWORD offset, DWORD length, DWORD max, DWORD flags));
    DECLARE_FUNC(HSAMPLE, BASS_SampleCreate, (DWORD length, DWORD freq, DWORD chans, DWORD max, DWORD flags));
    DECLARE_FUNC(BOOL, BASS_SampleFree, (HSAMPLE handle));
    DECLARE_FUNC(BOOL, BASS_SampleSetData, (HSAMPLE handle, const void *buffer));
    DECLARE_FUNC(BOOL, BASS_SampleGetData, (HSAMPLE handle, void *buffer));
    DECLARE_FUNC(BOOL, BASS_SampleGetInfo, (HSAMPLE handle, BASS_SAMPLE *info));
    DECLARE_FUNC(BOOL, BASS_SampleSetInfo, (HSAMPLE handle, const BASS_SAMPLE *info));
    DECLARE_FUNC(DWORD, BASS_SampleGetChannel, (HSAMPLE handle, DWORD flags));
    DECLARE_FUNC(DWORD, BASS_SampleGetChannels, (HSAMPLE handle, HCHANNEL *channels));
    DECLARE_FUNC(BOOL, BASS_SampleStop, (HSAMPLE handle));
    DECLARE_FUNC(HSTREAM, BASS_StreamCreate, (DWORD freq, DWORD chans, DWORD flags, STREAMPROC *proc, void *user));
    DECLARE_FUNC(HSTREAM, BASS_StreamCreateFile, (DWORD filetype, const void *file, QWORD offset, QWORD length, DWORD flags));
    DECLARE_FUNC(HSTREAM, BASS_StreamCreateURL, (const char *url, DWORD offset, DWORD flags, DOWNLOADPROC *proc, void *user));
    DECLARE_FUNC(HSTREAM, BASS_StreamCreateFileUser, (DWORD system, DWORD flags, const BASS_FILEPROCS *proc, void *user));
    DECLARE_FUNC(BOOL, BASS_StreamCancel, (void *user));
    DECLARE_FUNC(BOOL, BASS_StreamFree, (HSTREAM handle));
    DECLARE_FUNC(QWORD, BASS_StreamGetFilePosition, (HSTREAM handle, DWORD mode));
    DECLARE_FUNC(DWORD, BASS_StreamPutData, (HSTREAM handle, const void *buffer, DWORD length));
    DECLARE_FUNC(DWORD, BASS_StreamPutFileData, (HSTREAM handle, const void *buffer, DWORD length));
    DECLARE_FUNC(HMUSIC, BASS_MusicLoad, (DWORD filetype, const void *file, QWORD offset, DWORD length, DWORD flags, DWORD freq));
    DECLARE_FUNC(BOOL, BASS_MusicFree, (HMUSIC handle));
    DECLARE_FUNC(BOOL, BASS_RecordGetDeviceInfo, (DWORD device, BASS_DEVICEINFO *info));
    DECLARE_FUNC(BOOL, BASS_RecordInit, (int device));
    DECLARE_FUNC(BOOL, BASS_RecordFree, (void));
    DECLARE_FUNC(BOOL, BASS_RecordSetDevice, (DWORD device));
    DECLARE_FUNC(DWORD, BASS_RecordGetDevice, (void));
    DECLARE_FUNC(BOOL, BASS_RecordGetInfo, (BASS_RECORDINFO *info));
    DECLARE_FUNC(const char*, BASS_RecordGetInputName, (int input));
    DECLARE_FUNC(BOOL, BASS_RecordSetInput, (int input, DWORD flags, float volume));
    DECLARE_FUNC(DWORD, BASS_RecordGetInput, (int input, float *volume));
    DECLARE_FUNC(HRECORD, BASS_RecordStart, (DWORD freq, DWORD chans, DWORD flags, RECORDPROC *proc, void *user));
    DECLARE_FUNC(double, BASS_ChannelBytes2Seconds, (DWORD handle, QWORD pos));
    DECLARE_FUNC(QWORD, BASS_ChannelSeconds2Bytes, (DWORD handle, double pos));
    DECLARE_FUNC(DWORD, BASS_ChannelGetDevice, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_ChannelSetDevice, (DWORD handle, DWORD device));
    DECLARE_FUNC(DWORD, BASS_ChannelIsActive, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_ChannelGetInfo, (DWORD handle, BASS_CHANNELINFO *info));
    DECLARE_FUNC(const char*, BASS_ChannelGetTags, (DWORD handle, DWORD tags));
    DECLARE_FUNC(DWORD, BASS_ChannelFlags, (DWORD handle, DWORD flags, DWORD mask));
    DECLARE_FUNC(BOOL, BASS_ChannelLock, (DWORD handle, BOOL lock));
    DECLARE_FUNC(BOOL, BASS_ChannelRef, (DWORD handle, BOOL inc));
    DECLARE_FUNC(BOOL, BASS_ChannelFree, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_ChannelPlay, (DWORD handle, BOOL restart));
    DECLARE_FUNC(BOOL, BASS_ChannelStart, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_ChannelStop, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_ChannelPause, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_ChannelUpdate, (DWORD handle, DWORD length));
    DECLARE_FUNC(BOOL, BASS_ChannelSetAttribute, (DWORD handle, DWORD attrib, float value));
    DECLARE_FUNC(BOOL, BASS_ChannelGetAttribute, (DWORD handle, DWORD attrib, float *value));
    DECLARE_FUNC(BOOL, BASS_ChannelSlideAttribute, (DWORD handle, DWORD attrib, float value, DWORD time));
    DECLARE_FUNC(BOOL, BASS_ChannelIsSliding, (DWORD handle, DWORD attrib));
    DECLARE_FUNC(BOOL, BASS_ChannelSetAttributeEx, (DWORD handle, DWORD attrib, void *value, DWORD typesize));
    DECLARE_FUNC(DWORD, BASS_ChannelGetAttributeEx, (DWORD handle, DWORD attrib, void *value, DWORD typesize));
    DECLARE_FUNC(BOOL, BASS_ChannelSet3DAttributes, (DWORD handle, int mode, float min, float max, int iangle, int oangle, float outvol));
    DECLARE_FUNC(BOOL, BASS_ChannelGet3DAttributes, (DWORD handle, DWORD *mode, float *min, float *max, DWORD *iangle, DWORD *oangle, float *outvol));
    DECLARE_FUNC(BOOL, BASS_ChannelSet3DPosition, (DWORD handle, const BASS_3DVECTOR *pos, const BASS_3DVECTOR *orient, const BASS_3DVECTOR *vel));
    DECLARE_FUNC(BOOL, BASS_ChannelGet3DPosition, (DWORD handle, BASS_3DVECTOR *pos, BASS_3DVECTOR *orient, BASS_3DVECTOR *vel));
    DECLARE_FUNC(QWORD, BASS_ChannelGetLength, (DWORD handle, DWORD mode));
    DECLARE_FUNC(BOOL, BASS_ChannelSetPosition, (DWORD handle, QWORD pos, DWORD mode));
    DECLARE_FUNC(QWORD, BASS_ChannelGetPosition, (DWORD handle, DWORD mode));
    DECLARE_FUNC(DWORD, BASS_ChannelGetLevel, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_ChannelGetLevelEx, (DWORD handle, float *levels, float length, DWORD flags));
    DECLARE_FUNC(DWORD, BASS_ChannelGetData, (DWORD handle, void *buffer, DWORD length));
    DECLARE_FUNC(HSYNC, BASS_ChannelSetSync, (DWORD handle, DWORD type, QWORD param, SYNCPROC *proc, void *user));
    DECLARE_FUNC(BOOL, BASS_ChannelRemoveSync, (DWORD handle, HSYNC sync));
    DECLARE_FUNC(BOOL, BASS_ChannelSetLink, (DWORD handle, DWORD chan));
    DECLARE_FUNC(BOOL, BASS_ChannelRemoveLink, (DWORD handle, DWORD chan));
    DECLARE_FUNC(HDSP, BASS_ChannelSetDSP, (DWORD handle, DSPPROC *proc, void *user, int priority));
    DECLARE_FUNC(HDSP, BASS_ChannelSetDSPEx, (DWORD handle, DSPPROC *proc, void *user, int priority, DWORD flags));
    DECLARE_FUNC(BOOL, BASS_ChannelRemoveDSP, (DWORD handle, HDSP dsp));
    DECLARE_FUNC(HFX, BASS_ChannelSetFX, (DWORD handle, DWORD type, int priority));
    DECLARE_FUNC(BOOL, BASS_ChannelRemoveFX, (DWORD handle, HFX fx));
    DECLARE_FUNC(BOOL, BASS_FXSetParameters, (HFX handle, const void *params));
    DECLARE_FUNC(BOOL, BASS_FXGetParameters, (HFX handle, void *params));
    DECLARE_FUNC(BOOL, BASS_FXSetPriority, (DWORD handle, int priority));
    DECLARE_FUNC(BOOL, BASS_FXSetBypass, (DWORD handle, BOOL bypass));
    DECLARE_FUNC(BOOL, BASS_FXReset, (DWORD handle));
    DECLARE_FUNC(BOOL, BASS_FXFree, (DWORD handle));

    #undef DECLARE_FUNC
};

#define BASS_SetConfig BASSLoader::Instance().pBASS_SetConfig
#define BASS_GetConfig BASSLoader::Instance().pBASS_GetConfig
#define BASS_SetConfigPtr BASSLoader::Instance().pBASS_SetConfigPtr
#define BASS_GetConfigPtr BASSLoader::Instance().pBASS_GetConfigPtr
#define BASS_GetVersion BASSLoader::Instance().pBASS_GetVersion
#define BASS_ErrorGetCode BASSLoader::Instance().pBASS_ErrorGetCode
#define BASS_GetDeviceInfo BASSLoader::Instance().pBASS_GetDeviceInfo
#define BASS_Init BASSLoader::Instance().pBASS_Init
#define BASS_Free BASSLoader::Instance().pBASS_Free
#define BASS_SetDevice BASSLoader::Instance().pBASS_SetDevice
#define BASS_GetDevice BASSLoader::Instance().pBASS_GetDevice
#define BASS_GetInfo BASSLoader::Instance().pBASS_GetInfo
#define BASS_Start BASSLoader::Instance().pBASS_Start
#define BASS_Stop BASSLoader::Instance().pBASS_Stop
#define BASS_Pause BASSLoader::Instance().pBASS_Pause
#define BASS_IsStarted BASSLoader::Instance().pBASS_IsStarted
#define BASS_Update BASSLoader::Instance().pBASS_Update
#define BASS_GetCPU BASSLoader::Instance().pBASS_GetCPU
#define BASS_SetVolume BASSLoader::Instance().pBASS_SetVolume
#define BASS_GetVolume BASSLoader::Instance().pBASS_GetVolume
#define BASS_Set3DFactors BASSLoader::Instance().pBASS_Set3DFactors
#define BASS_Get3DFactors BASSLoader::Instance().pBASS_Get3DFactors
#define BASS_Set3DPosition BASSLoader::Instance().pBASS_Set3DPosition
#define BASS_Get3DPosition BASSLoader::Instance().pBASS_Get3DPosition
#define BASS_Apply3D BASSLoader::Instance().pBASS_Apply3D
#define BASS_PluginLoad BASSLoader::Instance().pBASS_PluginLoad
#define BASS_PluginFree BASSLoader::Instance().pBASS_PluginFree
#define BASS_PluginEnable BASSLoader::Instance().pBASS_PluginEnable
#define BASS_PluginGetInfo BASSLoader::Instance().pBASS_PluginGetInfo
#define BASS_SampleLoad BASSLoader::Instance().pBASS_SampleLoad
#define BASS_SampleCreate BASSLoader::Instance().pBASS_SampleCreate
#define BASS_SampleFree BASSLoader::Instance().pBASS_SampleFree
#define BASS_SampleSetData BASSLoader::Instance().pBASS_SampleSetData
#define BASS_SampleGetData BASSLoader::Instance().pBASS_SampleGetData
#define BASS_SampleGetInfo BASSLoader::Instance().pBASS_SampleGetInfo
#define BASS_SampleSetInfo BASSLoader::Instance().pBASS_SampleSetInfo
#define BASS_SampleGetChannel BASSLoader::Instance().pBASS_SampleGetChannel
#define BASS_SampleGetChannels BASSLoader::Instance().pBASS_SampleGetChannels
#define BASS_SampleStop BASSLoader::Instance().pBASS_SampleStop
#define BASS_StreamCreate BASSLoader::Instance().pBASS_StreamCreate
#define BASS_StreamCreateFile BASSLoader::Instance().pBASS_StreamCreateFile
#define BASS_StreamCreateURL BASSLoader::Instance().pBASS_StreamCreateURL
#define BASS_StreamCreateFileUser BASSLoader::Instance().pBASS_StreamCreateFileUser
#define BASS_StreamCancel BASSLoader::Instance().pBASS_StreamCancel
#define BASS_StreamFree BASSLoader::Instance().pBASS_StreamFree
#define BASS_StreamGetFilePosition BASSLoader::Instance().pBASS_StreamGetFilePosition
#define BASS_StreamPutData BASSLoader::Instance().pBASS_StreamPutData
#define BASS_StreamPutFileData BASSLoader::Instance().pBASS_StreamPutFileData
#define BASS_MusicLoad BASSLoader::Instance().pBASS_MusicLoad
#define BASS_MusicFree BASSLoader::Instance().pBASS_MusicFree
#define BASS_RecordGetDeviceInfo BASSLoader::Instance().pBASS_RecordGetDeviceInfo
#define BASS_RecordInit BASSLoader::Instance().pBASS_RecordInit
#define BASS_RecordFree BASSLoader::Instance().pBASS_RecordFree
#define BASS_RecordSetDevice BASSLoader::Instance().pBASS_RecordSetDevice
#define BASS_RecordGetDevice BASSLoader::Instance().pBASS_RecordGetDevice
#define BASS_RecordGetInfo BASSLoader::Instance().pBASS_RecordGetInfo
#define BASS_RecordGetInputName BASSLoader::Instance().pBASS_RecordGetInputName
#define BASS_RecordSetInput BASSLoader::Instance().pBASS_RecordSetInput
#define BASS_RecordGetInput BASSLoader::Instance().pBASS_RecordGetInput
#define BASS_RecordStart BASSLoader::Instance().pBASS_RecordStart
#define BASS_ChannelBytes2Seconds BASSLoader::Instance().pBASS_ChannelBytes2Seconds
#define BASS_ChannelSeconds2Bytes BASSLoader::Instance().pBASS_ChannelSeconds2Bytes
#define BASS_ChannelGetDevice BASSLoader::Instance().pBASS_ChannelGetDevice
#define BASS_ChannelSetDevice BASSLoader::Instance().pBASS_ChannelSetDevice
#define BASS_ChannelIsActive BASSLoader::Instance().pBASS_ChannelIsActive
#define BASS_ChannelGetInfo BASSLoader::Instance().pBASS_ChannelGetInfo
#define BASS_ChannelGetTags BASSLoader::Instance().pBASS_ChannelGetTags
#define BASS_ChannelFlags BASSLoader::Instance().pBASS_ChannelFlags
#define BASS_ChannelLock BASSLoader::Instance().pBASS_ChannelLock
#define BASS_ChannelRef BASSLoader::Instance().pBASS_ChannelRef
#define BASS_ChannelFree BASSLoader::Instance().pBASS_ChannelFree
#define BASS_ChannelPlay BASSLoader::Instance().pBASS_ChannelPlay
#define BASS_ChannelStart BASSLoader::Instance().pBASS_ChannelStart
#define BASS_ChannelStop BASSLoader::Instance().pBASS_ChannelStop
#define BASS_ChannelPause BASSLoader::Instance().pBASS_ChannelPause
#define BASS_ChannelUpdate BASSLoader::Instance().pBASS_ChannelUpdate
#define BASS_ChannelSetAttribute BASSLoader::Instance().pBASS_ChannelSetAttribute
#define BASS_ChannelGetAttribute BASSLoader::Instance().pBASS_ChannelGetAttribute
#define BASS_ChannelSlideAttribute BASSLoader::Instance().pBASS_ChannelSlideAttribute
#define BASS_ChannelIsSliding BASSLoader::Instance().pBASS_ChannelIsSliding
#define BASS_ChannelSetAttributeEx BASSLoader::Instance().pBASS_ChannelSetAttributeEx
#define BASS_ChannelGetAttributeEx BASSLoader::Instance().pBASS_ChannelGetAttributeEx
#define BASS_ChannelSet3DAttributes BASSLoader::Instance().pBASS_ChannelSet3DAttributes
#define BASS_ChannelGet3DAttributes BASSLoader::Instance().pBASS_ChannelGet3DAttributes
#define BASS_ChannelSet3DPosition BASSLoader::Instance().pBASS_ChannelSet3DPosition
#define BASS_ChannelGet3DPosition BASSLoader::Instance().pBASS_ChannelGet3DPosition
#define BASS_ChannelGetLength BASSLoader::Instance().pBASS_ChannelGetLength
#define BASS_ChannelSetPosition BASSLoader::Instance().pBASS_ChannelSetPosition
#define BASS_ChannelGetPosition BASSLoader::Instance().pBASS_ChannelGetPosition
#define BASS_ChannelGetLevel BASSLoader::Instance().pBASS_ChannelGetLevel
#define BASS_ChannelGetLevelEx BASSLoader::Instance().pBASS_ChannelGetLevelEx
#define BASS_ChannelGetData BASSLoader::Instance().pBASS_ChannelGetData
#define BASS_ChannelSetSync BASSLoader::Instance().pBASS_ChannelSetSync
#define BASS_ChannelRemoveSync BASSLoader::Instance().pBASS_ChannelRemoveSync
#define BASS_ChannelSetLink BASSLoader::Instance().pBASS_ChannelSetLink
#define BASS_ChannelRemoveLink BASSLoader::Instance().pBASS_ChannelRemoveLink
#define BASS_ChannelSetDSP BASSLoader::Instance().pBASS_ChannelSetDSP
#define BASS_ChannelSetDSPEx BASSLoader::Instance().pBASS_ChannelSetDSPEx
#define BASS_ChannelRemoveDSP BASSLoader::Instance().pBASS_ChannelRemoveDSP
#define BASS_ChannelSetFX BASSLoader::Instance().pBASS_ChannelSetFX
#define BASS_ChannelRemoveFX BASSLoader::Instance().pBASS_ChannelRemoveFX
#define BASS_FXSetParameters BASSLoader::Instance().pBASS_FXSetParameters
#define BASS_FXGetParameters BASSLoader::Instance().pBASS_FXGetParameters
#define BASS_FXSetPriority BASSLoader::Instance().pBASS_FXSetPriority
#define BASS_FXSetBypass BASSLoader::Instance().pBASS_FXSetBypass
#define BASS_FXReset BASSLoader::Instance().pBASS_FXReset
#define BASS_FXFree BASSLoader::Instance().pBASS_FXFree
