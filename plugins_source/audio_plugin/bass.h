/*
	BASS 2.4 C/C++ header file
	Copyright (c) 1999-2025 Un4seen Developments Ltd.
*/

#ifndef BASS_H
#define BASS_H

#ifdef _WIN32
#ifdef WINAPI_FAMILY
#include <winapifamily.h>
#endif
#include <wtypes.h>
typedef unsigned __int64 QWORD;
#else
#include <stdint.h>
#define WINAPI
#define CALLBACK
typedef uint8_t BYTE;
typedef uint16_t WORD;
typedef uint32_t DWORD;
typedef uint64_t QWORD;
#ifdef __OBJC__
typedef int BOOL32;
#define BOOL BOOL32
#else
typedef int BOOL;
#endif
#ifndef TRUE
#define TRUE 1
#define FALSE 0
#endif
#define LOBYTE(a) (BYTE)(a)
#define HIBYTE(a) (BYTE)((a)>>8)
#define LOWORD(a) (WORD)(a)
#define HIWORD(a) (WORD)((a)>>16)
#define MAKEWORD(a,b) (WORD)(((a)&0xff)|((b)<<8))
#define MAKELONG(a,b) (DWORD)(((a)&0xffff)|((b)<<16))
#endif

#ifdef __cplusplus
extern "C" {
#endif

#define BASSVERSION			0x204
#define BASSVERSIONTEXT		"2.4"

#ifndef BASSDEF
#define BASSDEF(f) WINAPI f
#else
#define NOBASSOVERLOADS
#endif

typedef DWORD HMUSIC;
typedef DWORD HSAMPLE;
typedef DWORD HCHANNEL;
typedef DWORD HSTREAM;
typedef DWORD HRECORD;
typedef DWORD HSYNC;
typedef DWORD HDSP;
typedef DWORD HFX;
typedef DWORD HPLUGIN;

#define BASS_OK				0
#define BASS_ERROR_MEM		1
#define BASS_ERROR_FILEOPEN	2
#define BASS_ERROR_DRIVER	3
#define BASS_ERROR_BUFLOST	4
#define BASS_ERROR_HANDLE	5
#define BASS_ERROR_FORMAT	6
#define BASS_ERROR_POSITION	7
#define BASS_ERROR_INIT		8
#define BASS_ERROR_START	9
#define BASS_ERROR_SSL		10
#define BASS_ERROR_REINIT	11
#define BASS_ERROR_TRACK	13
#define BASS_ERROR_ALREADY	14
#define BASS_ERROR_NOTAUDIO	17
#define BASS_ERROR_NOCHAN	18
#define BASS_ERROR_ILLTYPE	19
#define BASS_ERROR_ILLPARAM	20
#define BASS_ERROR_NO3D		21
#define BASS_ERROR_NOEAX	22
#define BASS_ERROR_DEVICE	23
#define BASS_ERROR_NOPLAY	24
#define BASS_ERROR_FREQ		25
#define BASS_ERROR_NOTFILE	27
#define BASS_ERROR_NOHW		29
#define BASS_ERROR_EMPTY	31
#define BASS_ERROR_NONET	32
#define BASS_ERROR_CREATE	33
#define BASS_ERROR_NOFX		34
#define BASS_ERROR_NOTAVAIL	37
#define BASS_ERROR_DECODE	38
#define BASS_ERROR_DX		39
#define BASS_ERROR_TIMEOUT	40
#define BASS_ERROR_FILEFORM	41
#define BASS_ERROR_SPEAKER	42
#define BASS_ERROR_VERSION	43
#define BASS_ERROR_CODEC	44
#define BASS_ERROR_ENDED	45
#define BASS_ERROR_BUSY		46
#define BASS_ERROR_UNSTREAMABLE	47
#define BASS_ERROR_PROTOCOL	48
#define BASS_ERROR_DENIED	49
#define BASS_ERROR_FREEING	50
#define BASS_ERROR_CANCEL	51
#define BASS_ERROR_UNKNOWN	-1

#define BASS_CONFIG_BUFFER			0
#define BASS_CONFIG_UPDATEPERIOD	1
#define BASS_CONFIG_GVOL_SAMPLE		4
#define BASS_CONFIG_GVOL_STREAM		5
#define BASS_CONFIG_GVOL_MUSIC		6
#define BASS_CONFIG_CURVE_VOL		7
#define BASS_CONFIG_CURVE_PAN		8
#define BASS_CONFIG_FLOATDSP		9
#define BASS_CONFIG_3DALGORITHM		10
#define BASS_CONFIG_NET_TIMEOUT		11
#define BASS_CONFIG_NET_BUFFER		12
#define BASS_CONFIG_PAUSE_NOPLAY	13
#define BASS_CONFIG_NET_PREBUF		15
#define BASS_CONFIG_NET_PASSIVE		18
#define BASS_CONFIG_REC_BUFFER		19
#define BASS_CONFIG_NET_PLAYLIST	21
#define BASS_CONFIG_MUSIC_VIRTUAL	22
#define BASS_CONFIG_VERIFY			23
#define BASS_CONFIG_UPDATETHREADS	24
#define BASS_CONFIG_DEV_BUFFER		27
#define BASS_CONFIG_REC_LOOPBACK	28
#define BASS_CONFIG_IOS_SESSION		34
#define BASS_CONFIG_IOS_MIXAUDIO	34
#define BASS_CONFIG_DEV_DEFAULT		36
#define BASS_CONFIG_NET_READTIMEOUT	37
#define BASS_CONFIG_VISTA_SPEAKERS	38
#define BASS_CONFIG_IOS_SPEAKER		39
#define BASS_CONFIG_MF_DISABLE		40
#define BASS_CONFIG_HANDLES			41
#define BASS_CONFIG_UNICODE			42
#define BASS_CONFIG_SRC				43
#define BASS_CONFIG_SRC_SAMPLE		44
#define BASS_CONFIG_ASYNCFILE_BUFFER 45
#define BASS_CONFIG_OGG_PRESCAN		47
#define BASS_CONFIG_VIDEO			48
#define BASS_CONFIG_MF_VIDEO		BASS_CONFIG_VIDEO
#define BASS_CONFIG_AIRPLAY			49
#define BASS_CONFIG_DEV_NONSTOP		50
#define BASS_CONFIG_IOS_NOCATEGORY	51
#define BASS_CONFIG_VERIFY_NET		52
#define BASS_CONFIG_DEV_PERIOD		53
#define BASS_CONFIG_FLOAT			54
#define BASS_CONFIG_NET_SEEK		56
#define BASS_CONFIG_AM_DISABLE		58
#define BASS_CONFIG_NET_PLAYLIST_DEPTH	59
#define BASS_CONFIG_NET_PREBUF_WAIT	60
#define BASS_CONFIG_ANDROID_SESSIONID	62
#define BASS_CONFIG_WASAPI_PERSIST	65
#define BASS_CONFIG_REC_WASAPI		66
#define BASS_CONFIG_ANDROID_AAUDIO	67
#define BASS_CONFIG_SAMPLE_ONEHANDLE	69
#define BASS_CONFIG_NET_META		71
#define BASS_CONFIG_NET_RESTRATE	72
#define BASS_CONFIG_REC_DEFAULT		73
#define BASS_CONFIG_NORAMP			74
#define BASS_CONFIG_NOSOUND_MAXDELAY	76
#define BASS_CONFIG_STACKALLOC		79
#define BASS_CONFIG_DOWNMIX			80

#define BASS_CONFIG_NET_AGENT		16
#define BASS_CONFIG_NET_PROXY		17
#define BASS_CONFIG_DEV_NOTIFY		33
#define BASS_CONFIG_IOS_NOTIFY		46
#define BASS_CONFIG_ANDROID_JAVAVM	63
#define BASS_CONFIG_LIBSSL			64
#define BASS_CONFIG_FILENAME		75
#define BASS_CONFIG_FILEOPENPROCS	77

#define BASS_CONFIG_THREAD			0x40000000

#define BASS_IOS_SESSION_MIX		1
#define BASS_IOS_SESSION_DUCK		2
#define BASS_IOS_SESSION_AMBIENT	4
#define BASS_IOS_SESSION_SPEAKER	8
#define BASS_IOS_SESSION_DISABLE	0x10
#define BASS_IOS_SESSION_DEACTIVATE	0x20
#define BASS_IOS_SESSION_AIRPLAY	0x40
#define BASS_IOS_SESSION_BTHFP		0x80
#define BASS_IOS_SESSION_BTA2DP		0x100

#define BASS_DEVICE_8BITS		1
#define BASS_DEVICE_MONO		2
#define BASS_DEVICE_3D			4
#define BASS_DEVICE_16BITS		8
#define BASS_DEVICE_REINIT		0x80
#define BASS_DEVICE_LATENCY		0x100
#define BASS_DEVICE_CPSPEAKERS	0x400
#define BASS_DEVICE_SPEAKERS	0x800
#define BASS_DEVICE_NOSPEAKER	0x1000
#define BASS_DEVICE_DMIX		0x2000
#define BASS_DEVICE_FREQ		0x4000
#define BASS_DEVICE_STEREO		0x8000
#define BASS_DEVICE_HOG			0x10000
#define BASS_DEVICE_AUDIOTRACK	0x20000
#define BASS_DEVICE_DSOUND		0x40000
#define BASS_DEVICE_SOFTWARE	0x80000
#define BASS_DEVICE_OPENSLES	0x100000
#define BASS_DEVICE_APPLEVOICE	0x200000

#define BASS_OBJECT_DS		1
#define BASS_OBJECT_DS3DL	2

typedef struct {
#if defined(_WIN32_WCE) || (defined(WINAPI_FAMILY) && WINAPI_FAMILY != WINAPI_FAMILY_DESKTOP_APP)
	const wchar_t *name;
	const wchar_t *driver;
#else
	const char *name;
	const char *driver;
#endif
	DWORD flags;
} BASS_DEVICEINFO;

#define BASS_DEVICE_ENABLED		1
#define BASS_DEVICE_DEFAULT		2
#define BASS_DEVICE_INIT		4
#define BASS_DEVICE_LOOPBACK	8
#define BASS_DEVICE_DEFAULTCOM	0x80

#define BASS_DEVICE_TYPE_MASK			0xff000000
#define BASS_DEVICE_TYPE_NETWORK		0x01000000
#define BASS_DEVICE_TYPE_SPEAKERS		0x02000000
#define BASS_DEVICE_TYPE_LINE			0x03000000
#define BASS_DEVICE_TYPE_HEADPHONES		0x04000000
#define BASS_DEVICE_TYPE_MICROPHONE		0x05000000
#define BASS_DEVICE_TYPE_HEADSET		0x06000000
#define BASS_DEVICE_TYPE_HANDSET		0x07000000
#define BASS_DEVICE_TYPE_DIGITAL		0x08000000
#define BASS_DEVICE_TYPE_SPDIF			0x09000000
#define BASS_DEVICE_TYPE_HDMI			0x0a000000
#define BASS_DEVICE_TYPE_DISPLAYPORT	0x40000000

#define BASS_DEVICES_AIRPLAY	0x1000000

typedef struct {
	DWORD flags;
	DWORD reserved[7];
	DWORD minbuf;
	DWORD dsver;
	DWORD latency;
	DWORD initflags;
	DWORD speakers;
	DWORD freq;
} BASS_INFO;

#define DSCAPS_EMULDRIVER		0x00000020
#define DSCAPS_CERTIFIED		0x00000040
#define DSCAPS_HARDWARE			0x80000000

typedef struct {
	DWORD flags;
	DWORD formats;
	DWORD inputs;
	BOOL singlein;
	DWORD freq;
} BASS_RECORDINFO;

#define DSCCAPS_EMULDRIVER		DSCAPS_EMULDRIVER
#define DSCCAPS_CERTIFIED		DSCAPS_CERTIFIED

#define BASS_FILE_NAME			0
#define BASS_FILE_MEM			1
#define BASS_FILE_MEMCOPY		3
#define BASS_FILE_HANDLE		4

typedef struct {
	DWORD freq;
	float volume;
	float pan;
	DWORD flags;
	DWORD length;
	DWORD max;
	DWORD origres;
	DWORD chans;
	DWORD mingap;
	DWORD mode3d;
	float mindist;
	float maxdist;
	DWORD iangle;
	DWORD oangle;
	float outvol;
	DWORD reserved[2];
} BASS_SAMPLE;

#define BASS_SAMPLE_8BITS		1
#define BASS_SAMPLE_MONO		2
#define BASS_SAMPLE_LOOP		4
#define BASS_SAMPLE_3D			8
#define BASS_SAMPLE_SOFTWARE	0x10
#define BASS_SAMPLE_MUTEMAX		0x20
#define BASS_SAMPLE_NOREORDER	0x40
#define BASS_SAMPLE_FX			0x80
#define BASS_SAMPLE_FLOAT		0x100
#define BASS_SAMPLE_OVER_VOL	0x10000
#define BASS_SAMPLE_OVER_POS	0x20000
#define BASS_SAMPLE_OVER_DIST	0x30000

#define BASS_STREAM_PRESCAN		0x20000
#define BASS_STREAM_AUTOFREE	0x40000
#define BASS_STREAM_RESTRATE	0x80000
#define BASS_STREAM_BLOCK		0x100000
#define BASS_STREAM_DECODE		0x200000
#define BASS_STREAM_STATUS		0x800000

#define BASS_MP3_IGNOREDELAY	0x200
#define BASS_MP3_SETPOS			BASS_STREAM_PRESCAN

#define BASS_MUSIC_FLOAT		BASS_SAMPLE_FLOAT
#define BASS_MUSIC_MONO			BASS_SAMPLE_MONO
#define BASS_MUSIC_LOOP			BASS_SAMPLE_LOOP
#define BASS_MUSIC_3D			BASS_SAMPLE_3D
#define BASS_MUSIC_FX			BASS_SAMPLE_FX
#define BASS_MUSIC_AUTOFREE		BASS_STREAM_AUTOFREE
#define BASS_MUSIC_DECODE		BASS_STREAM_DECODE
#define BASS_MUSIC_PRESCAN		BASS_STREAM_PRESCAN
#define BASS_MUSIC_CALCLEN		BASS_MUSIC_PRESCAN
#define BASS_MUSIC_RAMP			0x200
#define BASS_MUSIC_RAMPS		0x400
#define BASS_MUSIC_SURROUND		0x800
#define BASS_MUSIC_SURROUND2	0x1000
#define BASS_MUSIC_FT2PAN		0x2000
#define BASS_MUSIC_FT2MOD		0x2000
#define BASS_MUSIC_PT1MOD		0x4000
#define BASS_MUSIC_NONINTER		0x10000
#define BASS_MUSIC_SINCINTER	0x800000
#define BASS_MUSIC_POSRESET		0x8000
#define BASS_MUSIC_POSRESETEX	0x400000
#define BASS_MUSIC_STOPBACK		0x80000
#define BASS_MUSIC_NOSAMPLE		0x100000

#define BASS_SPEAKER_FRONT		0x1000000
#define BASS_SPEAKER_REAR		0x2000000
#define BASS_SPEAKER_CENLFE		0x3000000
#define BASS_SPEAKER_SIDE		0x4000000
#define BASS_SPEAKER_N(n)		((n)<<24)
#define BASS_SPEAKER_LEFT		0x10000000
#define BASS_SPEAKER_RIGHT		0x20000000
#define BASS_SPEAKER_FRONTLEFT	BASS_SPEAKER_FRONT | BASS_SPEAKER_LEFT
#define BASS_SPEAKER_FRONTRIGHT	BASS_SPEAKER_FRONT | BASS_SPEAKER_RIGHT
#define BASS_SPEAKER_REARLEFT	BASS_SPEAKER_REAR | BASS_SPEAKER_LEFT
#define BASS_SPEAKER_REARRIGHT	BASS_SPEAKER_REAR | BASS_SPEAKER_RIGHT
#define BASS_SPEAKER_CENTER		BASS_SPEAKER_CENLFE | BASS_SPEAKER_LEFT
#define BASS_SPEAKER_LFE		BASS_SPEAKER_CENLFE | BASS_SPEAKER_RIGHT
#define BASS_SPEAKER_SIDELEFT	BASS_SPEAKER_SIDE | BASS_SPEAKER_LEFT
#define BASS_SPEAKER_SIDERIGHT	BASS_SPEAKER_SIDE | BASS_SPEAKER_RIGHT
#define BASS_SPEAKER_REAR2		BASS_SPEAKER_SIDE
#define BASS_SPEAKER_REAR2LEFT	BASS_SPEAKER_SIDELEFT
#define BASS_SPEAKER_REAR2RIGHT	BASS_SPEAKER_SIDERIGHT

#define BASS_ASYNCFILE			0x40000000
#define BASS_UNICODE			0x80000000

#define BASS_RECORD_OPENSLES	0x1000
#define BASS_RECORD_PAUSE		0x8000

typedef struct {
	DWORD freq;
	DWORD chans;
	DWORD flags;
	DWORD ctype;
	DWORD origres;
	HPLUGIN plugin;
	HSAMPLE sample;
	const char *filename;
} BASS_CHANNELINFO;

#define BASS_ORIGRES_FLOAT		0x10000

#define BASS_CTYPE_SAMPLE		1
#define BASS_CTYPE_RECORD		2
#define BASS_CTYPE_STREAM		0x10000
#define BASS_CTYPE_STREAM_VORBIS	0x10002
#define BASS_CTYPE_STREAM_OGG	0x10002
#define BASS_CTYPE_STREAM_MP1	0x10003
#define BASS_CTYPE_STREAM_MP2	0x10004
#define BASS_CTYPE_STREAM_MP3	0x10005
#define BASS_CTYPE_STREAM_AIFF	0x10006
#define BASS_CTYPE_STREAM_CA	0x10007
#define BASS_CTYPE_STREAM_MF	0x10008
#define BASS_CTYPE_STREAM_AM	0x10009
#define BASS_CTYPE_STREAM_SAMPLE	0x1000a
#define BASS_CTYPE_STREAM_DUMMY		0x18000
#define BASS_CTYPE_STREAM_DEVICE	0x18001
#define BASS_CTYPE_STREAM_WAV	0x40000
#define BASS_CTYPE_STREAM_WAV_PCM	0x50001
#define BASS_CTYPE_STREAM_WAV_FLOAT	0x50003
#define BASS_CTYPE_MUSIC_MOD	0x20000
#define BASS_CTYPE_MUSIC_MTM	0x20001
#define BASS_CTYPE_MUSIC_S3M	0x20002
#define BASS_CTYPE_MUSIC_XM		0x20003
#define BASS_CTYPE_MUSIC_IT		0x20004
#define BASS_CTYPE_MUSIC_MO3	0x00100

#define BASS_PLUGIN_PROC		1

typedef struct {
	DWORD ctype;
#if defined(_WIN32_WCE) || (defined(WINAPI_FAMILY) && WINAPI_FAMILY != WINAPI_FAMILY_DESKTOP_APP)
	const wchar_t *name;
	const wchar_t *exts;
#else
	const char *name;
	const char *exts;
#endif
} BASS_PLUGINFORM;

typedef struct {
	DWORD version;
	DWORD formatc;
	const BASS_PLUGINFORM *formats;
} BASS_PLUGININFO;

typedef struct BASS_3DVECTOR {
#ifdef __cplusplus
	BASS_3DVECTOR() {}
	BASS_3DVECTOR(float _x, float _y, float _z) : x(_x), y(_y), z(_z) {}
#endif
	float x;
	float y;
	float z;
} BASS_3DVECTOR;

#define BASS_3DMODE_NORMAL		0
#define BASS_3DMODE_RELATIVE	1
#define BASS_3DMODE_OFF			2

#define BASS_3DALG_DEFAULT	0
#define BASS_3DALG_OFF		1

#define BASS_SAMCHAN_NEW		1
#define BASS_SAMCHAN_STREAM		2

typedef DWORD (CALLBACK STREAMPROC)(HSTREAM handle, void *buffer, DWORD length, void *user);

#define BASS_STREAMPROC_AGAIN	0x40000000
#define BASS_STREAMPROC_END		0x80000000

#define STREAMPROC_DUMMY		(STREAMPROC*)0
#define STREAMPROC_PUSH			(STREAMPROC*)-1
#define STREAMPROC_DEVICE		(STREAMPROC*)-2
#define STREAMPROC_DEVICE_3D	(STREAMPROC*)-3

#define STREAMFILE_NOBUFFER		0
#define STREAMFILE_BUFFER		1
#define STREAMFILE_BUFFERPUSH	2

typedef void (CALLBACK FILECLOSEPROC)(void *user);
typedef QWORD (CALLBACK FILELENPROC)(void *user);
typedef DWORD (CALLBACK FILEREADPROC)(void *buffer, DWORD length, void *user);
typedef BOOL (CALLBACK FILESEEKPROC)(QWORD offset, void *user);
typedef void *(CALLBACK FILEOPENPROC)(const char *filename, DWORD flags);

typedef struct {
	FILECLOSEPROC *close;
	FILELENPROC *length;
	FILEREADPROC *read;
	FILESEEKPROC *seek;
} BASS_FILEPROCS;

typedef struct {
	FILECLOSEPROC *close;
	FILELENPROC *length;
	FILEREADPROC *read;
	FILESEEKPROC *seek;
	FILEOPENPROC *open;
} BASS_FILEOPENPROCS;

#define BASS_FILEDATA_END		0

#define BASS_FILEPOS_CURRENT	0
#define BASS_FILEPOS_DECODE		BASS_FILEPOS_CURRENT
#define BASS_FILEPOS_DOWNLOAD	1
#define BASS_FILEPOS_END		2
#define BASS_FILEPOS_START		3
#define BASS_FILEPOS_CONNECTED	4
#define BASS_FILEPOS_BUFFER		5
#define BASS_FILEPOS_SOCKET		6
#define BASS_FILEPOS_ASYNCBUF	7
#define BASS_FILEPOS_SIZE		8
#define BASS_FILEPOS_BUFFERING	9
#define BASS_FILEPOS_AVAILABLE	10
#define BASS_FILEPOS_ASYNCSIZE	12

typedef void (CALLBACK DOWNLOADPROC)(const void *buffer, DWORD length, void *user);

#define BASS_SYNC_POS			0
#define BASS_SYNC_END			2
#define BASS_SYNC_META			4
#define BASS_SYNC_SLIDE			5
#define BASS_SYNC_STALL			6
#define BASS_SYNC_DOWNLOAD		7
#define BASS_SYNC_FREE			8
#define BASS_SYNC_SETPOS		11
#define BASS_SYNC_MUSICPOS		10
#define BASS_SYNC_MUSICINST		1
#define BASS_SYNC_MUSICFX		3
#define BASS_SYNC_OGG_CHANGE	12
#define BASS_SYNC_ATTRIB		13
#define BASS_SYNC_DEV_FAIL		14
#define BASS_SYNC_DEV_FORMAT	15
#define BASS_SYNC_POS_RAW		16
#define BASS_SYNC_THREAD		0x20000000
#define BASS_SYNC_MIXTIME		0x40000000
#define BASS_SYNC_ONETIME		0x80000000

typedef void (CALLBACK SYNCPROC)(HSYNC handle, DWORD channel, DWORD data, void *user);
typedef void (CALLBACK DSPPROC)(HDSP handle, DWORD channel, void *buffer, DWORD length, void *user);
typedef BOOL (CALLBACK RECORDPROC)(HRECORD handle, const void *buffer, DWORD length, void *user);

#define RECORDPROC_NONE			(RECORDPROC*)0
#define RECORDPROC_TRUE			(RECORDPROC*)-1

#define BASS_ACTIVE_STOPPED			0
#define BASS_ACTIVE_PLAYING			1
#define BASS_ACTIVE_STALLED			2
#define BASS_ACTIVE_PAUSED			3
#define BASS_ACTIVE_PAUSED_DEVICE	4

#define BASS_ATTRIB_FREQ			1
#define BASS_ATTRIB_VOL				2
#define BASS_ATTRIB_PAN				3
#define BASS_ATTRIB_EAXMIX			4
#define BASS_ATTRIB_NOBUFFER		5
#define BASS_ATTRIB_VBR				6
#define BASS_ATTRIB_CPU				7
#define BASS_ATTRIB_SRC				8
#define BASS_ATTRIB_NET_RESUME		9
#define BASS_ATTRIB_SCANINFO		10
#define BASS_ATTRIB_NORAMP			11
#define BASS_ATTRIB_BITRATE			12
#define BASS_ATTRIB_BUFFER			13
#define BASS_ATTRIB_GRANULE			14
#define BASS_ATTRIB_USER			15
#define BASS_ATTRIB_TAIL			16
#define BASS_ATTRIB_PUSH_LIMIT		17
#define BASS_ATTRIB_DOWNLOADPROC	18
#define BASS_ATTRIB_VOLDSP			19
#define BASS_ATTRIB_VOLDSP_PRIORITY	20
#define BASS_ATTRIB_DOWNMIX			21
#define BASS_ATTRIB_MUSIC_AMPLIFY	0x100
#define BASS_ATTRIB_MUSIC_PANSEP	0x101
#define BASS_ATTRIB_MUSIC_PSCALER	0x102
#define BASS_ATTRIB_MUSIC_BPM		0x103
#define BASS_ATTRIB_MUSIC_SPEED		0x104
#define BASS_ATTRIB_MUSIC_VOL_GLOBAL 0x105
#define BASS_ATTRIB_MUSIC_ACTIVE	0x106
#define BASS_ATTRIB_MUSIC_VOL_CHAN	0x200
#define BASS_ATTRIB_MUSIC_VOL_INST	0x300

#define BASS_ATTRIBTYPE_FLOAT		-1
#define BASS_ATTRIBTYPE_INT			-2

#define BASS_SLIDE_LOG				0x1000000

#define BASS_DATA_AVAILABLE	0
#define BASS_DATA_NOREMOVE	0x10000000
#define BASS_DATA_FIXED		0x20000000
#define BASS_DATA_FLOAT		0x40000000
#define BASS_DATA_FFT256	0x80000000
#define BASS_DATA_FFT512	0x80000001
#define BASS_DATA_FFT1024	0x80000002
#define BASS_DATA_FFT2048	0x80000003
#define BASS_DATA_FFT4096	0x80000004
#define BASS_DATA_FFT8192	0x80000005
#define BASS_DATA_FFT16384	0x80000006
#define BASS_DATA_FFT32768	0x80000007
#define BASS_DATA_FFT_INDIVIDUAL 0x10
#define BASS_DATA_FFT_NOWINDOW	0x20
#define BASS_DATA_FFT_REMOVEDC	0x40
#define BASS_DATA_FFT_COMPLEX	0x80
#define BASS_DATA_FFT_NYQUIST	0x100

#define BASS_LEVEL_MONO		1
#define BASS_LEVEL_STEREO	2
#define BASS_LEVEL_RMS		4
#define BASS_LEVEL_VOLPAN	8
#define BASS_LEVEL_NOREMOVE	0x10

#define BASS_TAG_ID3		0
#define BASS_TAG_ID3V2		1
#define BASS_TAG_OGG		2
#define BASS_TAG_HTTP		3
#define BASS_TAG_ICY		4
#define BASS_TAG_META		5
#define BASS_TAG_APE		6
#define BASS_TAG_MP4 		7
#define BASS_TAG_WMA		8
#define BASS_TAG_VENDOR		9
#define BASS_TAG_LYRICS3	10
#define BASS_TAG_CA_CODEC	11
#define BASS_TAG_MF			13
#define BASS_TAG_WAVEFORMAT	14
#define BASS_TAG_AM_NAME	16
#define BASS_TAG_ID3V2_2	17
#define BASS_TAG_AM_MIME	18
#define BASS_TAG_LOCATION	19
#define BASS_TAG_ID3V2_BINARY	20
#define BASS_TAG_ID3V2_2_BINARY	21
#define BASS_TAG_RIFF_INFO	0x100
#define BASS_TAG_RIFF_BEXT	0x101
#define BASS_TAG_RIFF_CART	0x102
#define BASS_TAG_RIFF_DISP	0x103
#define BASS_TAG_RIFF_CUE	0x104
#define BASS_TAG_RIFF_SMPL	0x105
#define BASS_TAG_APE_BINARY	0x1000
#define BASS_TAG_MP4_COVERART	0x1400
#define BASS_TAG_MUSIC_NAME		0x10000
#define BASS_TAG_MUSIC_MESSAGE	0x10001
#define BASS_TAG_MUSIC_ORDERS	0x10002
#define BASS_TAG_MUSIC_AUTH		0x10003
#define BASS_TAG_MUSIC_INST		0x10100
#define BASS_TAG_MUSIC_CHAN		0x10200
#define BASS_TAG_MUSIC_SAMPLE	0x10300
#define BASS_TAG_INCREF		0x20000000

typedef struct {
	char id[3];
	char title[30];
	char artist[30];
	char album[30];
	char year[4];
	char comment[30];
	BYTE genre;
} TAG_ID3;

typedef struct {
	const void *data;
	DWORD length;
} TAG_BINARY;

typedef struct {
	const char *key;
	const void *data;
	DWORD length;
} TAG_APE_BINARY;

#ifdef _MSC_VER
#pragma warning(push)
#pragma warning(disable:4200)
#endif
#pragma pack(push,1)
typedef struct {
	char Description[256];
	char Originator[32];
	char OriginatorReference[32];
	char OriginationDate[10];
	char OriginationTime[8];
	QWORD TimeReference;
	WORD Version;
	BYTE UMID[64];
	BYTE Reserved[190];
#if defined(__GNUC__) && __GNUC__<3
	char CodingHistory[0];
#elif 1
	char CodingHistory[];
#else
	char CodingHistory[1];
#endif
} TAG_BEXT;
#pragma pack(pop)

typedef struct
{
	DWORD dwUsage;
	DWORD dwValue;
} TAG_CART_TIMER;

typedef struct
{
	char Version[4];
	char Title[64];
	char Artist[64];
	char CutID[64];
	char ClientID[64];
	char Category[64];
	char Classification[64];
	char OutCue[64];
	char StartDate[10];
	char StartTime[8];
	char EndDate[10];
	char EndTime[8];
	char ProducerAppID[64];
	char ProducerAppVersion[64];
	char UserDef[64];
	DWORD dwLevelReference;
	TAG_CART_TIMER PostTimer[8];
	char Reserved[276];
	char URL[1024];
#if defined(__GNUC__) && __GNUC__<3
	char TagText[0];
#elif 1
	char TagText[];
#else
	char TagText[1];
#endif
} TAG_CART;

typedef struct
{
	DWORD dwName;
	DWORD dwPosition;
	DWORD fccChunk;
	DWORD dwChunkStart;
	DWORD dwBlockStart;
	DWORD dwSampleOffset;
} TAG_CUE_POINT;

typedef struct
{
	DWORD dwCuePoints;
#if defined(__GNUC__) && __GNUC__<3
	TAG_CUE_POINT CuePoints[0];
#elif 1
	TAG_CUE_POINT CuePoints[];
#else
	TAG_CUE_POINT CuePoints[1];
#endif
} TAG_CUE;

typedef struct
{
	DWORD dwIdentifier;
	DWORD dwType;
	DWORD dwStart;
	DWORD dwEnd;
	DWORD dwFraction;
	DWORD dwPlayCount;
} TAG_SMPL_LOOP;

typedef struct
{
	DWORD dwManufacturer;
	DWORD dwProduct;
	DWORD dwSamplePeriod;
	DWORD dwMIDIUnityNote;
	DWORD dwMIDIPitchFraction;
	DWORD dwSMPTEFormat;
	DWORD dwSMPTEOffset;
	DWORD cSampleLoops;
	DWORD cbSamplerData;
#if defined(__GNUC__) && __GNUC__<3
	TAG_SMPL_LOOP SampleLoops[0];
#elif 1
	TAG_SMPL_LOOP SampleLoops[];
#else
	TAG_SMPL_LOOP SampleLoops[1];
#endif
} TAG_SMPL;
#ifdef _MSC_VER
#pragma warning(pop)
#endif

typedef struct {
	DWORD ftype;
	DWORD atype;
	const char *name;
} TAG_CA_CODEC;

#ifndef _WAVEFORMATEX_
#define _WAVEFORMATEX_
#pragma pack(push,1)
typedef struct tWAVEFORMATEX
{
	WORD wFormatTag;
	WORD nChannels;
	DWORD nSamplesPerSec;
	DWORD nAvgBytesPerSec;
	WORD nBlockAlign;
	WORD wBitsPerSample;
	WORD cbSize;
} WAVEFORMATEX, *PWAVEFORMATEX, *LPWAVEFORMATEX;
typedef const WAVEFORMATEX *LPCWAVEFORMATEX;
#pragma pack(pop)
#endif

#define BASS_POS_BYTE			0
#define BASS_POS_MUSIC_ORDER	1
#define BASS_POS_OGG			3
#define BASS_POS_TRACK			4
#define BASS_POS_RAW			6
#define BASS_POS_END			0x10
#define BASS_POS_LOOP			0x11
#define BASS_POS_DSP			0x800000
#define BASS_POS_FLUSH			0x1000000
#define BASS_POS_RESET			0x2000000
#define BASS_POS_RELATIVE		0x4000000
#define BASS_POS_INEXACT		0x8000000
#define BASS_POS_DECODE			0x10000000
#define BASS_POS_DECODETO		0x20000000
#define BASS_POS_SCAN			0x40000000

#define BASS_NODEVICE		0x20000

#define BASS_INPUT_OFF		0x10000
#define BASS_INPUT_ON		0x20000

#define BASS_INPUT_TYPE_MASK		0xff000000
#define BASS_INPUT_TYPE_UNDEF		0x00000000
#define BASS_INPUT_TYPE_DIGITAL		0x01000000
#define BASS_INPUT_TYPE_LINE		0x02000000
#define BASS_INPUT_TYPE_MIC			0x03000000
#define BASS_INPUT_TYPE_SYNTH		0x04000000
#define BASS_INPUT_TYPE_CD			0x05000000
#define BASS_INPUT_TYPE_PHONE		0x06000000
#define BASS_INPUT_TYPE_SPEAKER		0x07000000
#define BASS_INPUT_TYPE_WAVE		0x08000000
#define BASS_INPUT_TYPE_AUX			0x09000000
#define BASS_INPUT_TYPE_ANALOG		0x0a000000

#define BASS_DSP_READONLY			1
#define BASS_DSP_FLOAT				2
#define BASS_DSP_FREECALL			4
#define BASS_DSP_BYPASS				0x400000
#define BASS_DSP_MONO_N(n)			((n)<<24)
#define BASS_DSP_STEREO_N(n)		(BASS_DSP_MONO_N(n) | 0x800000)

#define BASS_FX_DX8_CHORUS			0
#define BASS_FX_DX8_COMPRESSOR		1
#define BASS_FX_DX8_DISTORTION		2
#define BASS_FX_DX8_ECHO			3
#define BASS_FX_DX8_FLANGER			4
#define BASS_FX_DX8_GARGLE			5
#define BASS_FX_DX8_I3DL2REVERB		6
#define BASS_FX_DX8_PARAMEQ			7
#define BASS_FX_DX8_REVERB			8
#define BASS_FX_VOLUME				9

typedef struct {
	float       fWetDryMix;
	float       fDepth;
	float       fFeedback;
	float       fFrequency;
	DWORD       lWaveform;
	float       fDelay;
	DWORD       lPhase;
} BASS_DX8_CHORUS;

typedef struct {
	float   fGain;
	float   fAttack;
	float   fRelease;
	float   fThreshold;
	float   fRatio;
	float   fPredelay;
} BASS_DX8_COMPRESSOR;

typedef struct {
	float   fGain;
	float   fEdge;
	float   fPostEQCenterFrequency;
	float   fPostEQBandwidth;
	float   fPreLowpassCutoff;
} BASS_DX8_DISTORTION;

typedef struct {
	float   fWetDryMix;
	float   fFeedback;
	float   fLeftDelay;
	float   fRightDelay;
	BOOL    lPanDelay;
} BASS_DX8_ECHO;

typedef struct {
	float       fWetDryMix;
	float       fDepth;
	float       fFeedback;
	float       fFrequency;
	DWORD       lWaveform;
	float       fDelay;
	DWORD       lPhase;
} BASS_DX8_FLANGER;

typedef struct {
	DWORD       dwRateHz;
	DWORD       dwWaveShape;
} BASS_DX8_GARGLE;

typedef struct {
	int     lRoom;
	int     lRoomHF;
	float   flRoomRolloffFactor;
	float   flDecayTime;
	float   flDecayHFRatio;
	int     lReflections;
	float   flReflectionsDelay;
	int     lReverb;
	float   flReverbDelay;
	float   flDiffusion;
	float   flDensity;
	float   flHFReference;
} BASS_DX8_I3DL2REVERB;

typedef struct {
	float   fCenter;
	float   fBandwidth;
	float   fGain;
} BASS_DX8_PARAMEQ;

typedef struct {
	float   fInGain;
	float   fReverbMix;
	float   fReverbTime;
	float   fHighFreqRTRatio;
} BASS_DX8_REVERB;

#define BASS_DX8_PHASE_NEG_180        0
#define BASS_DX8_PHASE_NEG_90         1
#define BASS_DX8_PHASE_ZERO           2
#define BASS_DX8_PHASE_90             3
#define BASS_DX8_PHASE_180            4

typedef struct {
	float fTarget;
	float fCurrent;
	float fTime;
	DWORD lCurve;
} BASS_FX_VOLUME_PARAM;

typedef void (CALLBACK DEVICENOTIFYPROC)(DWORD notify);

#define BASS_DEVICENOTIFY_ENABLED			0
#define BASS_DEVICENOTIFY_DEFAULT			1
#define BASS_DEVICENOTIFY_REC_DEFAULT		2
#define BASS_DEVICENOTIFY_DEFAULTCOM		3
#define BASS_DEVICENOTIFY_REC_DEFAULTCOM	4

typedef void (CALLBACK IOSNOTIFYPROC)(DWORD status);

#define BASS_IOSNOTIFY_INTERRUPT		1
#define BASS_IOSNOTIFY_INTERRUPT_END	2

BOOL BASSDEF(BASS_SetConfig)(DWORD option, DWORD value);
DWORD BASSDEF(BASS_GetConfig)(DWORD option);
BOOL BASSDEF(BASS_SetConfigPtr)(DWORD option, const void *value);
const void *BASSDEF(BASS_GetConfigPtr)(DWORD option);
DWORD BASSDEF(BASS_GetVersion)(void);
int BASSDEF(BASS_ErrorGetCode)(void);

BOOL BASSDEF(BASS_GetDeviceInfo)(DWORD device, BASS_DEVICEINFO *info);
#if defined(_WIN32) && !defined(_WIN32_WCE) && !(defined(WINAPI_FAMILY) && WINAPI_FAMILY != WINAPI_FAMILY_DESKTOP_APP)
BOOL BASSDEF(BASS_Init)(int device, DWORD freq, DWORD flags, HWND win, const void *dsguid);
#else
BOOL BASSDEF(BASS_Init)(int device, DWORD freq, DWORD flags, void *win, const void *dsguid);
#endif
BOOL BASSDEF(BASS_Free)(void);
BOOL BASSDEF(BASS_SetDevice)(DWORD device);
DWORD BASSDEF(BASS_GetDevice)(void);
BOOL BASSDEF(BASS_GetInfo)(BASS_INFO *info);
BOOL BASSDEF(BASS_Start)(void);
BOOL BASSDEF(BASS_Stop)(void);
BOOL BASSDEF(BASS_Pause)(void);
DWORD BASSDEF(BASS_IsStarted)(void);
BOOL BASSDEF(BASS_Update)(DWORD length);
float BASSDEF(BASS_GetCPU)(void);
BOOL BASSDEF(BASS_SetVolume)(float volume);
float BASSDEF(BASS_GetVolume)(void);
#if defined(_WIN32) && !defined(_WIN32_WCE) && !(defined(WINAPI_FAMILY) && WINAPI_FAMILY != WINAPI_FAMILY_DESKTOP_APP)
void *BASSDEF(BASS_GetDSoundObject)(DWORD object);
#endif

BOOL BASSDEF(BASS_Set3DFactors)(float distf, float rollf, float doppf);
BOOL BASSDEF(BASS_Get3DFactors)(float *distf, float *rollf, float *doppf);
BOOL BASSDEF(BASS_Set3DPosition)(const BASS_3DVECTOR *pos, const BASS_3DVECTOR *vel, const BASS_3DVECTOR *front, const BASS_3DVECTOR *top);
BOOL BASSDEF(BASS_Get3DPosition)(BASS_3DVECTOR *pos, BASS_3DVECTOR *vel, BASS_3DVECTOR *front, BASS_3DVECTOR *top);
void BASSDEF(BASS_Apply3D)(void);

HPLUGIN BASSDEF(BASS_PluginLoad)(const char *file, DWORD flags);
BOOL BASSDEF(BASS_PluginFree)(HPLUGIN handle);
BOOL BASSDEF(BASS_PluginEnable)(HPLUGIN handle, BOOL enable);
const BASS_PLUGININFO *BASSDEF(BASS_PluginGetInfo)(HPLUGIN handle);

HSAMPLE BASSDEF(BASS_SampleLoad)(DWORD filetype, const void *file, QWORD offset, DWORD length, DWORD max, DWORD flags);
HSAMPLE BASSDEF(BASS_SampleCreate)(DWORD length, DWORD freq, DWORD chans, DWORD max, DWORD flags);
BOOL BASSDEF(BASS_SampleFree)(HSAMPLE handle);
BOOL BASSDEF(BASS_SampleSetData)(HSAMPLE handle, const void *buffer);
BOOL BASSDEF(BASS_SampleGetData)(HSAMPLE handle, void *buffer);
BOOL BASSDEF(BASS_SampleGetInfo)(HSAMPLE handle, BASS_SAMPLE *info);
BOOL BASSDEF(BASS_SampleSetInfo)(HSAMPLE handle, const BASS_SAMPLE *info);
DWORD BASSDEF(BASS_SampleGetChannel)(HSAMPLE handle, DWORD flags);
DWORD BASSDEF(BASS_SampleGetChannels)(HSAMPLE handle, HCHANNEL *channels);
BOOL BASSDEF(BASS_SampleStop)(HSAMPLE handle);

HSTREAM BASSDEF(BASS_StreamCreate)(DWORD freq, DWORD chans, DWORD flags, STREAMPROC *proc, void *user);
HSTREAM BASSDEF(BASS_StreamCreateFile)(DWORD filetype, const void *file, QWORD offset, QWORD length, DWORD flags);
HSTREAM BASSDEF(BASS_StreamCreateURL)(const char *url, DWORD offset, DWORD flags, DOWNLOADPROC *proc, void *user);
HSTREAM BASSDEF(BASS_StreamCreateFileUser)(DWORD system, DWORD flags, const BASS_FILEPROCS *proc, void *user);
BOOL BASSDEF(BASS_StreamCancel)(void *user);
BOOL BASSDEF(BASS_StreamFree)(HSTREAM handle);
QWORD BASSDEF(BASS_StreamGetFilePosition)(HSTREAM handle, DWORD mode);
DWORD BASSDEF(BASS_StreamPutData)(HSTREAM handle, const void *buffer, DWORD length);
DWORD BASSDEF(BASS_StreamPutFileData)(HSTREAM handle, const void *buffer, DWORD length);

HMUSIC BASSDEF(BASS_MusicLoad)(DWORD filetype, const void *file, QWORD offset, DWORD length, DWORD flags, DWORD freq);
BOOL BASSDEF(BASS_MusicFree)(HMUSIC handle);

BOOL BASSDEF(BASS_RecordGetDeviceInfo)(DWORD device, BASS_DEVICEINFO *info);
BOOL BASSDEF(BASS_RecordInit)(int device);
BOOL BASSDEF(BASS_RecordFree)(void);
BOOL BASSDEF(BASS_RecordSetDevice)(DWORD device);
DWORD BASSDEF(BASS_RecordGetDevice)(void);
BOOL BASSDEF(BASS_RecordGetInfo)(BASS_RECORDINFO *info);
const char *BASSDEF(BASS_RecordGetInputName)(int input);
BOOL BASSDEF(BASS_RecordSetInput)(int input, DWORD flags, float volume);
DWORD BASSDEF(BASS_RecordGetInput)(int input, float *volume);
HRECORD BASSDEF(BASS_RecordStart)(DWORD freq, DWORD chans, DWORD flags, RECORDPROC *proc, void *user);

double BASSDEF(BASS_ChannelBytes2Seconds)(DWORD handle, QWORD pos);
QWORD BASSDEF(BASS_ChannelSeconds2Bytes)(DWORD handle, double pos);
DWORD BASSDEF(BASS_ChannelGetDevice)(DWORD handle);
BOOL BASSDEF(BASS_ChannelSetDevice)(DWORD handle, DWORD device);
DWORD BASSDEF(BASS_ChannelIsActive)(DWORD handle);
BOOL BASSDEF(BASS_ChannelGetInfo)(DWORD handle, BASS_CHANNELINFO *info);
const char *BASSDEF(BASS_ChannelGetTags)(DWORD handle, DWORD tags);
DWORD BASSDEF(BASS_ChannelFlags)(DWORD handle, DWORD flags, DWORD mask);
BOOL BASSDEF(BASS_ChannelLock)(DWORD handle, BOOL lock);
BOOL BASSDEF(BASS_ChannelRef)(DWORD handle, BOOL inc);
BOOL BASSDEF(BASS_ChannelFree)(DWORD handle);
BOOL BASSDEF(BASS_ChannelPlay)(DWORD handle, BOOL restart);
BOOL BASSDEF(BASS_ChannelStart)(DWORD handle);
BOOL BASSDEF(BASS_ChannelStop)(DWORD handle);
BOOL BASSDEF(BASS_ChannelPause)(DWORD handle);
BOOL BASSDEF(BASS_ChannelUpdate)(DWORD handle, DWORD length);
BOOL BASSDEF(BASS_ChannelSetAttribute)(DWORD handle, DWORD attrib, float value);
BOOL BASSDEF(BASS_ChannelGetAttribute)(DWORD handle, DWORD attrib, float *value);
BOOL BASSDEF(BASS_ChannelSlideAttribute)(DWORD handle, DWORD attrib, float value, DWORD time);
BOOL BASSDEF(BASS_ChannelIsSliding)(DWORD handle, DWORD attrib);
BOOL BASSDEF(BASS_ChannelSetAttributeEx)(DWORD handle, DWORD attrib, void *value, DWORD typesize);
DWORD BASSDEF(BASS_ChannelGetAttributeEx)(DWORD handle, DWORD attrib, void *value, DWORD typesize);
BOOL BASSDEF(BASS_ChannelSet3DAttributes)(DWORD handle, int mode, float min, float max, int iangle, int oangle, float outvol);
BOOL BASSDEF(BASS_ChannelGet3DAttributes)(DWORD handle, DWORD *mode, float *min, float *max, DWORD *iangle, DWORD *oangle, float *outvol);
BOOL BASSDEF(BASS_ChannelSet3DPosition)(DWORD handle, const BASS_3DVECTOR *pos, const BASS_3DVECTOR *orient, const BASS_3DVECTOR *vel);
BOOL BASSDEF(BASS_ChannelGet3DPosition)(DWORD handle, BASS_3DVECTOR *pos, BASS_3DVECTOR *orient, BASS_3DVECTOR *vel);
QWORD BASSDEF(BASS_ChannelGetLength)(DWORD handle, DWORD mode);
BOOL BASSDEF(BASS_ChannelSetPosition)(DWORD handle, QWORD pos, DWORD mode);
QWORD BASSDEF(BASS_ChannelGetPosition)(DWORD handle, DWORD mode);
DWORD BASSDEF(BASS_ChannelGetLevel)(DWORD handle);
BOOL BASSDEF(BASS_ChannelGetLevelEx)(DWORD handle, float *levels, float length, DWORD flags);
DWORD BASSDEF(BASS_ChannelGetData)(DWORD handle, void *buffer, DWORD length);
HSYNC BASSDEF(BASS_ChannelSetSync)(DWORD handle, DWORD type, QWORD param, SYNCPROC *proc, void *user);
BOOL BASSDEF(BASS_ChannelRemoveSync)(DWORD handle, HSYNC sync);
BOOL BASSDEF(BASS_ChannelSetLink)(DWORD handle, DWORD chan);
BOOL BASSDEF(BASS_ChannelRemoveLink)(DWORD handle, DWORD chan);
HDSP BASSDEF(BASS_ChannelSetDSP)(DWORD handle, DSPPROC *proc, void *user, int priority);
HDSP BASSDEF(BASS_ChannelSetDSPEx)(DWORD handle, DSPPROC *proc, void *user, int priority, DWORD flags);
BOOL BASSDEF(BASS_ChannelRemoveDSP)(DWORD handle, HDSP dsp);
HFX BASSDEF(BASS_ChannelSetFX)(DWORD handle, DWORD type, int priority);
BOOL BASSDEF(BASS_ChannelRemoveFX)(DWORD handle, HFX fx);

BOOL BASSDEF(BASS_FXSetParameters)(HFX handle, const void *params);
BOOL BASSDEF(BASS_FXGetParameters)(HFX handle, void *params);
BOOL BASSDEF(BASS_FXSetPriority)(DWORD handle, int priority);
BOOL BASSDEF(BASS_FXSetBypass)(DWORD handle, BOOL bypass);
BOOL BASSDEF(BASS_FXReset)(DWORD handle);
BOOL BASSDEF(BASS_FXFree)(DWORD handle);

#ifdef __cplusplus
}

#if defined(_WIN32) && !defined(NOBASSOVERLOADS)
static inline HPLUGIN BASS_PluginLoad(const WCHAR *file, DWORD flags)
{
	return BASS_PluginLoad((const char*)file, flags | BASS_UNICODE);
}

static inline HMUSIC BASS_MusicLoad(DWORD filetype, const WCHAR *file, QWORD offset, DWORD length, DWORD flags, DWORD freq)
{
	return BASS_MusicLoad(filetype, (const void*)file, offset, length, flags | BASS_UNICODE, freq);
}

static inline HSAMPLE BASS_SampleLoad(DWORD filetype, const WCHAR *file, QWORD offset, DWORD length, DWORD max, DWORD flags)
{
	return BASS_SampleLoad(filetype, (const void*)file, offset, length, max, flags | BASS_UNICODE);
}

static inline HSTREAM BASS_StreamCreateFile(DWORD filetype, const WCHAR *file, QWORD offset, QWORD length, DWORD flags)
{
	return BASS_StreamCreateFile(filetype, (const void*)file, offset, length, flags | BASS_UNICODE);
}

static inline HSTREAM BASS_StreamCreateURL(const WCHAR *url, DWORD offset, DWORD flags, DOWNLOADPROC *proc, void *user)
{
	return BASS_StreamCreateURL((const char*)url, offset, flags | BASS_UNICODE, proc, user);
}

static inline BOOL BASS_SetConfigPtr(DWORD option, const WCHAR *value)
{
	return BASS_SetConfigPtr(option | BASS_UNICODE, (const void*)value);
}
#endif
#endif

#ifdef __OBJC__
#undef BOOL
#endif

#endif
