/**
 * CLEO Redux HTTP2 Library
 * Uses WinHTTP (winhttp.dll) - the modern Windows HTTP client API.
 * Supports HTTP and HTTPS with HTTP/1.1 protocol.
 */

const isDebugEnabled = true;

export async function httpGet(url: string): Promise<string> {
    isDebugEnabled && log(`HTTP2 GET request to ${url}`);

    const winhttp = DynamicLibrary.Load("winhttp.dll");
    void asyncWait(200);
    if (!winhttp) throw new Error("winhttp.dll not found");
    isDebugEnabled && log("Loaded winhttp.dll");

    const WinHttpOpen = winhttp.getProcedure("WinHttpOpen");
    void asyncWait(200);
    const WinHttpConnect = winhttp.getProcedure("WinHttpConnect");
    void asyncWait(200);
    const WinHttpOpenRequest = winhttp.getProcedure("WinHttpOpenRequest");
    void asyncWait(200);
    const WinHttpSendRequest = winhttp.getProcedure("WinHttpSendRequest");
    void asyncWait(200);
    const WinHttpReceiveResponse = winhttp.getProcedure("WinHttpReceiveResponse");
    void asyncWait(200);
    const WinHttpReadData = winhttp.getProcedure("WinHttpReadData");
    void asyncWait(200);
    const WinHttpCloseHandle = winhttp.getProcedure("WinHttpCloseHandle");
    void asyncWait(200);

    if (!WinHttpOpen || !WinHttpConnect || !WinHttpOpenRequest || !WinHttpSendRequest ||
        !WinHttpReceiveResponse || !WinHttpReadData || !WinHttpCloseHandle) {
        throw new Error("Missing required WinHTTP procedures");
    }
    isDebugEnabled && log("All required procedures found");

    isDebugEnabled && log("Mapping functions to stdcall...");
    const httpOpen = Memory.Fn.Stdcall(WinHttpOpen);
    const httpConnect = Memory.Fn.Stdcall(WinHttpConnect);
    const httpOpenRequest = Memory.Fn.Stdcall(WinHttpOpenRequest);
    const httpSendRequest = Memory.Fn.Stdcall(WinHttpSendRequest);
    const httpReceiveResponse = Memory.Fn.Stdcall(WinHttpReceiveResponse);
    const httpReadData = Memory.Fn.Stdcall(WinHttpReadData);
    const closeHandle = Memory.Fn.Stdcall(WinHttpCloseHandle);
    void asyncWait(200);
    isDebugEnabled && log("Mapped stdcall functions");

    const urlParts = parseUrl(url);
    isDebugEnabled && log(`Parsed URL - host: ${urlParts.host}, port: ${urlParts.port}, path: ${urlParts.path}, secure: ${urlParts.isSecure}`);

    const userAgentSignature = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
    const WINHTTP_ACCESS_TYPE_DEFAULT_PROXY = 0;
    const WINHTTP_FLAG_SECURE = 0x00000080;

    isDebugEnabled && log("Allocating wide strings...");
    const userAgentW = allocWString(userAgentSignature);
    void asyncWait(200);
    const hostW = allocWString(urlParts.host);
    void asyncWait(200);
    const methodW = allocWString("GET");
    const pathW = allocWString(urlParts.path);
    const versionW = allocWString("HTTP/1.1");
    void asyncWait(200);

    isDebugEnabled && log("Calling WinHttpOpen...");
    const hSession = httpOpen(userAgentW, WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, 0, 0, 0);
    void asyncWait(200);
    isDebugEnabled && log(`WinHttpOpen returned session handle: ${hSession}`);
    if (!hSession) throw new Error("WinHttpOpen failed");

    isDebugEnabled && log("Calling WinHttpConnect...");
    const hConnect = httpConnect(hSession, hostW, urlParts.port, 0);
    void asyncWait(200);
    isDebugEnabled && log(`WinHttpConnect returned connection handle: ${hConnect}`);
    if (!hConnect) {
        closeHandle(hSession);
        throw new Error("WinHttpConnect failed");
    }

    const flags = urlParts.isSecure ? WINHTTP_FLAG_SECURE : 0;
    isDebugEnabled && log("Calling WinHttpOpenRequest...");
    const hRequest = httpOpenRequest(hConnect, methodW, pathW, versionW, 0, 0, flags);
    void asyncWait(200);
    isDebugEnabled && log(`WinHttpOpenRequest returned request handle: ${hRequest}`);
    if (!hRequest) {
        closeHandle(hConnect);
        closeHandle(hSession);
        throw new Error("WinHttpOpenRequest failed");
    }

    isDebugEnabled && log("Calling WinHttpSendRequest...");
    const sendResult = httpSendRequest(hRequest, 0, 0, 0, 0, 0, 0);
    void asyncWait(200);
    isDebugEnabled && log(`WinHttpSendRequest returned: ${sendResult}`);
    if (!sendResult) {
        closeHandle(hRequest);
        closeHandle(hConnect);
        closeHandle(hSession);
        throw new Error("WinHttpSendRequest failed");
    }

    isDebugEnabled && log("Calling WinHttpReceiveResponse...");
    const recvResult = httpReceiveResponse(hRequest, 0);
    void asyncWait(200);
    isDebugEnabled && log(`WinHttpReceiveResponse returned: ${recvResult}`);
    if (!recvResult) {
        closeHandle(hRequest);
        closeHandle(hConnect);
        closeHandle(hSession);
        throw new Error("WinHttpReceiveResponse failed");
    }

    let readBuffer = Memory.Allocate(1024);
    if (readBuffer < 0) {
        readBuffer = readBuffer >>> 0;
    }
    let bytesReadPtr = Memory.Allocate(4);
    if (bytesReadPtr < 0) {
        bytesReadPtr = bytesReadPtr >>> 0;
    }
    void asyncWait(200);

    const totalChunks: Uint8Array[] = [];
    const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
    const MAX_ITERATIONS = 1024;

    let totalBytes = 0;
    let iterations = 0;

    while (iterations++ < MAX_ITERATIONS) {
        Memory.WriteU32(bytesReadPtr, 0, false);

        const success = httpReadData(hRequest, readBuffer, 1024, bytesReadPtr);
        const bytesRead = Memory.ReadU32(bytesReadPtr, false);
        isDebugEnabled && log(`Read chunk ${iterations}: ${bytesRead} bytes, success=${success}`);

        if (!success || bytesRead === 0) {
            break;
        }

        const chunk = new Uint8Array(bytesRead);
        for (let i = 0; i < bytesRead; i++) {
            chunk[i] = Memory.ReadU8(readBuffer + i, false);
        }

        totalChunks.push(chunk);
        totalBytes += bytesRead;

        if (totalBytes > MAX_TOTAL_BYTES) {
            closeHandle(hRequest);
            closeHandle(hConnect);
            closeHandle(hSession);
            throw new Error("HTTP response too large");
        }

        if (iterations % 64 === 0) {
            void asyncWait(200);
        }
    }

    isDebugEnabled && log(`Finished reading. Total bytes: ${totalBytes}, iterations: ${iterations}`);

    closeHandle(hRequest);
    closeHandle(hConnect);
    closeHandle(hSession);
    void asyncWait(200);

    const combinedLength = totalChunks.reduce((acc, cur) => acc + cur.length, 0);
    const fullBuffer = new Uint8Array(combinedLength);
    let offset = 0;
    for (const chunk of totalChunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
    if (textDecoder) {
        return textDecoder.decode(fullBuffer);
    } else {
        return Array.from(fullBuffer).map(b => String.fromCharCode(b)).join("");
    }
}

interface ParsedUrl {
    scheme: string;
    host: string;
    port: number;
    path: string;
    isSecure: boolean;
}

function parseUrl(url: string): ParsedUrl {
    let remaining = url;
    let scheme = "http";
    let isSecure = false;

    if (remaining.startsWith("https://")) {
        scheme = "https";
        isSecure = true;
        remaining = remaining.substring(8);
    } else if (remaining.startsWith("http://")) {
        remaining = remaining.substring(7);
    }

    const slashIndex = remaining.indexOf("/");
    let hostPart: string;
    let path: string;

    if (slashIndex === -1) {
        hostPart = remaining;
        path = "/";
    } else {
        hostPart = remaining.substring(0, slashIndex);
        path = remaining.substring(slashIndex);
    }

    let host = hostPart;
    let port = isSecure ? 443 : 80;

    const colonIndex = hostPart.indexOf(":");
    if (colonIndex !== -1) {
        host = hostPart.substring(0, colonIndex);
        const portStr = hostPart.substring(colonIndex + 1);
        const parsedPort = parseInt(portStr, 10);
        if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
            port = parsedPort;
        }
    }

    if (path.length === 0) {
        path = "/";
    }

    return { scheme, host, port, path, isSecure };
}

function allocWString(str: string): number {
    isDebugEnabled && log(`[allocWString] Start - input: ${str}`);

    if (typeof str !== "string") {
        throw new Error(`[allocWString] Expected string, got ${typeof str}`);
    }

    const encoded = encodeUtf16(`${str}\0`);
    const len = encoded.length >>> 0;

    isDebugEnabled && log(`[allocWString] Allocating memory for ${len} bytes`);
    let buffer = Memory.Allocate(len);
    isDebugEnabled && log(`[allocWString] Raw pointer returned: ${buffer}`);

    if (!buffer) {
        throw new Error(`[allocWString] Memory.Allocate(${len}) returned 0`);
    }
    if (buffer < 0) {
        buffer = buffer >>> 0;
        isDebugEnabled && log(`[allocWString] Corrected pointer to unsigned: ${buffer}`);
    }

    isDebugEnabled && log(`[allocWString] Writing bytes to memory...`);
    for (let i = 0; i < len; i++) {
        Memory.WriteU8(buffer + i, encoded[i], false);
    }

    isDebugEnabled && log(`[allocWString] Done. Returning address: ${buffer}`);

    return buffer;
}

function encodeUtf16(str: string): Uint8Array {
    const utf16: number[] = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        utf16.push(code & 0xff, (code >> 8) & 0xff);
    }
    return new Uint8Array(utf16);
}
