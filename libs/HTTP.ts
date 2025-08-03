/**
 * CLEO Redux HTTP Library
 * For now it only supports HTTP GET requests.
 *
 * I'm sorry in advance if you got here, the code is a mess, and there is a lot of room for improvements.
 *
 */

const isDebugEnabled = !!IniFile.ReadInt('http_config.ini','Network', 'debug');

CLEO.debug.trace(isDebugEnabled);

export async function httpGet(url: string): Promise<string> {
    isDebugEnabled && log(`HTTP GET request to ${url}`);

    const wininet = DynamicLibrary.Load("wininet.dll");
    wait(100);
    if (!wininet) throw new Error("wininet.dll not found");
    isDebugEnabled && log("Loaded wininet.dll");

    const InternetOpenA = wininet.getProcedure("InternetOpenA");
    isDebugEnabled && log(`InternetOpenA proc: ${InternetOpenA}`);
    const InternetOpenUrlA = wininet.getProcedure("InternetOpenUrlA");
    isDebugEnabled && log(`InternetOpenUrlA proc: ${InternetOpenUrlA}`);
    const InternetReadFile = wininet.getProcedure("InternetReadFile");
    isDebugEnabled && log(`InternetReadFile proc: ${InternetReadFile}`);
    const InternetCloseHandle = wininet.getProcedure("InternetCloseHandle");
    isDebugEnabled && log(`InternetCloseHandle proc: ${InternetCloseHandle}`);

    if (!InternetOpenA || !InternetOpenUrlA || !InternetReadFile || !InternetCloseHandle) {
        throw new Error("Missing required procedures");
    }
    isDebugEnabled && log("All required procedures found");

    isDebugEnabled && log("Mapping functions to stdcall...");
    const open = Memory.Fn.Stdcall(InternetOpenA);
    const openUrl = Memory.Fn.Stdcall(InternetOpenUrlA);
    const readFile = Memory.Fn.Stdcall(InternetReadFile);
    const closeHandle = Memory.Fn.Stdcall(InternetCloseHandle);
    isDebugEnabled && log("Mapped stdcall functions");

    // const fakeAgent = "CLEOREDUX WebdataFetcher/1.0";
    const userAgentSignature = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

    isDebugEnabled && log("Allocating user agent string");
    const userAgent = allocCString(userAgentSignature);
    isDebugEnabled && log(`User-Agent allocated at: ${userAgent}`);

    isDebugEnabled && log("Calling InternetOpenA...");
    const hInternet = open(userAgent, 1, 0, 0, 0);
    isDebugEnabled && log(`InternetOpenA returned handle: ${hInternet}`);
    if (!hInternet) throw new Error("InternetOpenA failed");

    isDebugEnabled && log("Allocating URL string");
    const urlPtr = allocCString(url);
    isDebugEnabled && log(`URL allocated at: ${urlPtr}`);

    isDebugEnabled && log("Opening URL with InternetOpenUrlA");
    const startTime = Date.now();
    isDebugEnabled && log(`Starting InternetOpenUrlA for URL: ${url}`);
    const INTERNET_FLAG_RELOAD = 0x80000000;
    isDebugEnabled && log(`Using INTERNET_FLAG_RELOAD: ${INTERNET_FLAG_RELOAD}`);
    isDebugEnabled && log(`Calling InternetOpenUrlA with hInternet: ${hInternet}, urlPtr: ${urlPtr}, flags: ${INTERNET_FLAG_RELOAD}`);
    isDebugEnabled && log(`Start time: ${startTime} ms`);
    const hFile = openUrl(hInternet, urlPtr, 0, 0, INTERNET_FLAG_RELOAD, 0);
    isDebugEnabled && log(`InternetOpenUrlA called with hInternet: ${hInternet}, urlPtr: ${urlPtr}, flags: ${INTERNET_FLAG_RELOAD}`);
    const endTime = Date.now();
    isDebugEnabled && log(`InternetOpenUrlA call duration: ${endTime - startTime} ms`);
    isDebugEnabled && log(`InternetOpenUrlA returned handle: ${hFile}`);

    if (!hFile) {
        isDebugEnabled && log("InternetOpenUrlA failed");
        closeHandle(hInternet);
        throw new Error("InternetOpenUrlA failed");
    }

    let readBuffer = Memory.Allocate(1024);
    if (readBuffer < 0) {
        readBuffer = readBuffer >>> 0;
    }
    isDebugEnabled && log(`Read buffer allocated at: ${readBuffer}`);

    let bytesReadPtr = Memory.Allocate(4);
    if (bytesReadPtr < 0) {
        bytesReadPtr = bytesReadPtr >>> 0;
    }
    isDebugEnabled && log(`Bytes read pointer allocated at: ${bytesReadPtr}`);

    const totalChunks: Uint8Array[] = [];
    isDebugEnabled && log("Starting to read file in chunks...");

    const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
    const MAX_ITERATIONS = 1024;
    isDebugEnabled && log(`Max total bytes: ${MAX_TOTAL_BYTES}`);
    isDebugEnabled && log(`Max iterations: ${MAX_ITERATIONS}`);

    let totalBytes = 0;
    let iterations = 0;

    while (iterations++ < MAX_ITERATIONS) {
        isDebugEnabled && log(`Reading file chunk... Iteration: ${iterations}`);
        Memory.WriteU32(bytesReadPtr, 0, false);

        const success = readFile(hFile, readBuffer, 1024, bytesReadPtr);
        isDebugEnabled && log(`ReadFile success: ${success}`);

        const bytesRead = Memory.ReadU32(bytesReadPtr, false);
        isDebugEnabled && log(`Bytes read this iteration: ${bytesRead}`);

        if (!success) {
            isDebugEnabled && log("ReadFile reported failure, breaking read loop");
            break;
        }
        if (bytesRead === 0) {
            isDebugEnabled && log("No more data to read (0 bytes), ending read loop");
            break;
        }

        const chunk = new Uint8Array(bytesRead);
        for (let i = 0; i < bytesRead; i++) {
            chunk[i] = Memory.ReadU8(readBuffer + i, false);
        }
        isDebugEnabled && log(`Chunk read with length: ${chunk.length}`);

        totalChunks.push(chunk);
        totalBytes += bytesRead;
        isDebugEnabled && log(`Total bytes read so far: ${totalBytes}`);

        if (totalBytes > MAX_TOTAL_BYTES) {
            isDebugEnabled && log(`Exceeded max total bytes limit: ${MAX_TOTAL_BYTES}`);
            closeHandle(hFile);
            closeHandle(hInternet);
            throw new Error("HTTP response too large");
        }
    }

    isDebugEnabled && log(`Finished reading. Iterations: ${iterations}`);

    closeHandle(hFile);
    isDebugEnabled && log(`Closed file handle: ${hFile}`);

    closeHandle(hInternet);
    isDebugEnabled && log(`Closed internet handle: ${hInternet}`);

    // Combine all chunks into one Uint8Array
    const combinedLength = totalChunks.reduce((acc, cur) => acc + cur.length, 0);
    const fullBuffer = new Uint8Array(combinedLength);
    let offset = 0;
    for (const chunk of totalChunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
    }
    isDebugEnabled && log(`Combined buffer length: ${combinedLength}`);

    isDebugEnabled && log("Converting buffer to string...");
    // decode UTF8 from buffer
    const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
    if (textDecoder) {
        const decodedString = textDecoder.decode(fullBuffer);
        isDebugEnabled && log(`Decoded string length: ${decodedString.length}`);
        return decodedString;
    } else {
        // fallback
        const str = Array.from(fullBuffer).map(b => String.fromCharCode(b)).join("");
        isDebugEnabled && log(`Fallback decoded string length: ${str.length}`);
        return str;
    }
}

function allocCString(str: string): number {
    isDebugEnabled && log(`[allocCString] Start - input: ${str}`);

    if (typeof str !== "string") {
        throw new Error(`[allocCString] Expected string, got ${typeof str}`);
    }

    const encoded = encodeUtf8(`${str}\0`);
    const len = encoded.length >>> 0;

    isDebugEnabled && log(`[allocCString] Allocating memory for ${len} bytes`);
    let buffer = Memory.Allocate(len);
    isDebugEnabled && log(`[allocCString] Raw pointer returned: ${buffer}`);

    if (!buffer) {
        throw new Error(`[allocCString] Memory.Allocate(${len}) returned 0`);
    }
    if (buffer < 0) {
        buffer = buffer >>> 0;
        isDebugEnabled && log(`[allocCString] Corrected pointer to unsigned: ${buffer}`);
    }

    isDebugEnabled && log(`[allocCString] Writing bytes to memory...`);
    for (let i = 0; i < len; i++) {
        Memory.WriteU8(buffer + i, encoded[i], false);
    }

    isDebugEnabled && log(`[allocCString] Done. Returning address: ${buffer}`);

    // Testing if the string is correctly written
    const testStr = readCString(buffer);
    isDebugEnabled && log(`[allocCString] Test read string: ${testStr}`);

    return buffer;
}

function readCString(ptr: number): string {
    isDebugEnabled && log(`[readCString] Start - pointer: ${ptr}`);

    if (typeof ptr !== "number" || ptr < 0) {
        throw new Error(`[readCString] Invalid pointer: ${ptr}`);
    }

    const bytes: number[] = [];
    let offset = 0;
    let byte;

    do {
        byte = Memory.ReadU8(ptr + offset, false);
        bytes.push(byte);
        offset++;
    } while (byte !== 0 && offset < 1024); // limit to prevent infinite loop

    isDebugEnabled && log(`[readCString] Read ${bytes.length} bytes before null terminator`);

    const str = String.fromCharCode(...bytes.slice(0, -1)); // exclude null terminator
    isDebugEnabled && log(`[readCString] Resulting string length: ${str.length}`);

    return str;
}

function encodeUtf8(str: string): Uint8Array {
    const utf8: number[] = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x80) {
            utf8.push(code);
        } else if (code < 0x800) {
            utf8.push(
                0xc0 | (code >> 6),
                0x80 | (code & 0x3f)
            );
        } else {
            utf8.push(
                0xe0 | (code >> 12),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f)
            );
        }
    }
    return new Uint8Array(utf8);
}
