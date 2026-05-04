/**
 * CLEO Redux HTTP V4 Library
 * Uses WinHTTP (winhttp.dll) with cooperative yielding to prevent game freezing.
 * 
 * This implementation uses a state machine approach where each network operation
 * is broken into small steps with yields between them. While the underlying
 * WinHTTP calls are still synchronous/blocking, the frequent yielding prevents
 * the 2-second script termination watchdog from triggering.
 * 
 * IMPORTANT: WinHTTP calls (SendRequest, ReceiveResponse) are inherently blocking.
 * This implementation yields between steps but cannot make the actual network I/O
 * asynchronous. For true async HTTP, a native CLEO plugin is required.
 */

const isDebugEnabled = true;

// Timeout configuration (milliseconds)
const REQUEST_TIMEOUT = 30000; // 30 seconds default timeout

/**
 * HTTP Response object
 */
interface HttpResponse {
    statusCode: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
}

/**
 * State machine states for HTTP request
 */
enum HttpState {
    INIT = 0,
    LOAD_LIBRARY = 1,
    GET_PROCEDURES = 2,
    OPEN_SESSION = 3,
    CONNECT = 4,
    OPEN_REQUEST = 5,
    SEND_REQUEST = 6,
    RECEIVE_RESPONSE = 7,
    QUERY_HEADERS = 8,
    READ_CHUNKS = 9,
    DONE = 10,
    ERROR = 99
}

/**
 * HTTP Client class with state machine
 */
class HttpClient {
    private state: HttpState = HttpState.INIT;
    private winhttp: any = null;
    private hSession: number = 0;
    private hConnect: number = 0;
    private hRequest: number = 0;
    private url: string = "";
    private startTime: number = 0;
    private timeout: number = REQUEST_TIMEOUT;
    
    // Parsed URL parts
    private scheme: string = "http";
    private host: string = "";
    private port: number = 80;
    private path: string = "/";
    private isSecure: boolean = false;
    
    // Response data
    private statusCode: number = 0;
    private statusText: string = "";
    private headers: Record<string, string> = {};
    private totalChunks: Uint8Array[] = [];
    private totalBytes: number = 0;
    
    // WinHTTP constants
    private readonly WINHTTP_ACCESS_TYPE_DEFAULT_PROXY = 0;
    private readonly WINHTTP_FLAG_SECURE = 0x00000080;
    private readonly WINHTTP_NO_ADDITIONAL_HEADERS = 0;
    private readonly WINHTTP_NO_REQUEST_DATA = 0;
    private readonly WINHTTP_HEADER_NAME_BY_INDEX = 0;
    private readonly WINHTTP_NO_HEADER_INDEX = 0;
    private readonly WINHTTP_QUERY_STATUS_CODE = 19;
    private readonly WINHTTP_QUERY_STATUS_TEXT = 20;
    private readonly WINHTTP_QUERY_RAW_HEADERS_CRLF = 22;
    private readonly WINHTTP_QUERY_FLAG_NUMBER = 0x20000000;
    
    // Memory buffers
    private readBuffer: number = 0;
    private bytesReadPtr: number = 0;
    private headerBuffer: number = 0;
    private statusCodePtr: number = 0;
    
    // Function references
    private httpOpen: any = null;
    private httpConnect: any = null;
    private httpOpenRequest: any = null;
    private httpSendRequest: any = null;
    private httpReceiveResponse: any = null;
    private httpReadData: any = null;
    private httpQueryHeaders: any = null;
    private closeHandle: any = null;
    
    constructor(url: string, timeout?: number) {
        this.url = url;
        if (timeout) this.timeout = timeout;
        this.startTime = Date.now();
        this.parseUrl(url);
    }
    
    /**
     * Execute the HTTP request step by step
     * Call this repeatedly until it returns true (done) or throws
     */
    async step(): Promise<boolean> {
        // Check timeout
        if (Date.now() - this.startTime > this.timeout) {
            this.cleanup();
            throw new Error(`HTTP request timed out after ${this.timeout}ms`);
        }
        
        switch (this.state) {
            case HttpState.INIT:
                return await this.doLoadLibrary();
            case HttpState.LOAD_LIBRARY:
                return await this.doGetProcedures();
            case HttpState.GET_PROCEDURES:
                return await this.doOpenSession();
            case HttpState.OPEN_SESSION:
                return await this.doConnect();
            case HttpState.CONNECT:
                return await this.doOpenRequest();
            case HttpState.OPEN_REQUEST:
                return await this.doSendRequest();
            case HttpState.SEND_REQUEST:
                return await this.doReceiveResponse();
            case HttpState.RECEIVE_RESPONSE:
                return await this.doQueryHeaders();
            case HttpState.QUERY_HEADERS:
                return await this.doReadChunks();
            case HttpState.READ_CHUNKS:
                return await this.doDone();
            case HttpState.DONE:
                return true;
            case HttpState.ERROR:
                this.cleanup();
                throw new Error("HTTP request failed");
            default:
                return false;
        }
    }
    
    private async doLoadLibrary(): Promise<boolean> {
        isDebugEnabled && log("[HTTPV4] Loading winhttp.dll...");
        this.winhttp = DynamicLibrary.Load("winhttp.dll");
        await asyncWait(0); // Yield
        
        if (!this.winhttp) {
            this.state = HttpState.ERROR;
            throw new Error("winhttp.dll not found");
        }
        
        isDebugEnabled && log("[HTTPV4] winhttp.dll loaded successfully");
        this.state = HttpState.LOAD_LIBRARY;
        return false;
    }
    
    private async doGetProcedures(): Promise<boolean> {
        isDebugEnabled && log("[HTTPV4] Getting procedure addresses...");
        
        const WinHttpOpen = this.winhttp.getProcedure("WinHttpOpen");
        await asyncWait(0);
        const WinHttpConnect = this.winhttp.getProcedure("WinHttpConnect");
        await asyncWait(0);
        const WinHttpOpenRequest = this.winhttp.getProcedure("WinHttpOpenRequest");
        await asyncWait(0);
        const WinHttpSendRequest = this.winhttp.getProcedure("WinHttpSendRequest");
        await asyncWait(0);
        const WinHttpReceiveResponse = this.winhttp.getProcedure("WinHttpReceiveResponse");
        await asyncWait(0);
        const WinHttpReadData = this.winhttp.getProcedure("WinHttpReadData");
        await asyncWait(0);
        const WinHttpQueryHeaders = this.winhttp.getProcedure("WinHttpQueryHeaders");
        await asyncWait(0);
        const WinHttpCloseHandle = this.winhttp.getProcedure("WinHttpCloseHandle");
        await asyncWait(0);
        
        if (!WinHttpOpen || !WinHttpConnect || !WinHttpOpenRequest || 
            !WinHttpSendRequest || !WinHttpReceiveResponse || !WinHttpReadData ||
            !WinHttpQueryHeaders || !WinHttpCloseHandle) {
            this.state = HttpState.ERROR;
            throw new Error("Missing required WinHTTP procedures");
        }
        
        // Map to stdcall
        this.httpOpen = Memory.Fn.Stdcall(WinHttpOpen);
        this.httpConnect = Memory.Fn.Stdcall(WinHttpConnect);
        this.httpOpenRequest = Memory.Fn.Stdcall(WinHttpOpenRequest);
        this.httpSendRequest = Memory.Fn.Stdcall(WinHttpSendRequest);
        this.httpReceiveResponse = Memory.Fn.Stdcall(WinHttpReceiveResponse);
        this.httpReadData = Memory.Fn.Stdcall(WinHttpReadData);
        this.httpQueryHeaders = Memory.Fn.Stdcall(WinHttpQueryHeaders);
        this.closeHandle = Memory.Fn.Stdcall(WinHttpCloseHandle);
        
        isDebugEnabled && log("[HTTPV4] All procedures mapped");
        this.state = HttpState.GET_PROCEDURES;
        return false;
    }
    
    private async doOpenSession(): Promise<boolean> {
        isDebugEnabled && log("[HTTPV4] Opening session...");
        
        const userAgentW = allocWString("CLEO-Redux-HTTP/4.0");
        await asyncWait(0);
        
        this.hSession = this.httpOpen(
            userAgentW,
            this.WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
            0, 0, 0
        );
        await asyncWait(0);
        
        isDebugEnabled && log(`[HTTPV4] Session handle: ${this.hSession}`);
        
        if (!this.hSession) {
            this.state = HttpState.ERROR;
            throw new Error("WinHttpOpen failed");
        }
        
        this.state = HttpState.OPEN_SESSION;
        return false;
    }
    
    private async doConnect(): Promise<boolean> {
        isDebugEnabled && log(`[HTTPV4] Connecting to ${this.host}:${this.port}...`);
        
        const hostW = allocWString(this.host);
        await asyncWait(0);
        
        this.hConnect = this.httpConnect(
            this.hSession,
            hostW,
            this.port,
            0
        );
        await asyncWait(0);
        
        isDebugEnabled && log(`[HTTPV4] Connection handle: ${this.hConnect}`);
        
        if (!this.hConnect) {
            this.closeHandle(this.hSession);
            this.state = HttpState.ERROR;
            throw new Error("WinHttpConnect failed");
        }
        
        this.state = HttpState.CONNECT;
        return false;
    }
    
    private async doOpenRequest(): Promise<boolean> {
        isDebugEnabled && log(`[HTTPV4] Opening request for ${this.path}...`);
        
        const methodW = allocWString("GET");
        const pathW = allocWString(this.path);
        const versionW = allocWString("HTTP/1.1");
        await asyncWait(0);
        
        const flags = this.isSecure ? this.WINHTTP_FLAG_SECURE : 0;
        
        this.hRequest = this.httpOpenRequest(
            this.hConnect,
            methodW,
            pathW,
            versionW,
            0, 0,
            flags
        );
        await asyncWait(0);
        
        isDebugEnabled && log(`[HTTPV4] Request handle: ${this.hRequest}`);
        
        if (!this.hRequest) {
            this.closeHandle(this.hConnect);
            this.closeHandle(this.hSession);
            this.state = HttpState.ERROR;
            throw new Error("WinHttpOpenRequest failed");
        }
        
        this.state = HttpState.OPEN_REQUEST;
        return false;
    }
    
    private async doSendRequest(): Promise<boolean> {
        isDebugEnabled && log("[HTTPV4] Sending request...");
        
        const sendResult = this.httpSendRequest(
            this.hRequest,
            this.WINHTTP_NO_ADDITIONAL_HEADERS,
            0,
            this.WINHTTP_NO_REQUEST_DATA,
            0,
            0,
            0
        );
        await asyncWait(0);
        
        isDebugEnabled && log(`[HTTPV4] Send result: ${sendResult}`);
        
        if (!sendResult) {
            this.closeHandle(this.hRequest);
            this.closeHandle(this.hConnect);
            this.closeHandle(this.hSession);
            this.state = HttpState.ERROR;
            throw new Error("WinHttpSendRequest failed");
        }
        
        this.state = HttpState.SEND_REQUEST;
        return false;
    }
    
    private async doReceiveResponse(): Promise<boolean> {
        isDebugEnabled && log("[HTTPV4] Waiting for response...");
        
        const recvResult = this.httpReceiveResponse(this.hRequest, 0);
        await asyncWait(0);
        
        isDebugEnabled && log(`[HTTPV4] Receive result: ${recvResult}`);
        
        if (!recvResult) {
            this.closeHandle(this.hRequest);
            this.closeHandle(this.hConnect);
            this.closeHandle(this.hSession);
            this.state = HttpState.ERROR;
            throw new Error("WinHttpReceiveResponse failed");
        }
        
        this.state = HttpState.RECEIVE_RESPONSE;
        return false;
    }
    
    private async doQueryHeaders(): Promise<boolean> {
        isDebugEnabled && log("[HTTPV4] Querying status code...");
        
        // Allocate buffer for status code
        this.statusCodePtr = Memory.Allocate(4);
        if (this.statusCodePtr < 0) this.statusCodePtr = this.statusCodePtr >>> 0;
        await asyncWait(0);
        
        // Query status code
        let bufferSize = 4;
        const queryResult = this.httpQueryHeaders(
            this.hRequest,
            this.WINHTTP_QUERY_STATUS_CODE | this.WINHTTP_QUERY_FLAG_NUMBER,
            this.WINHTTP_HEADER_NAME_BY_INDEX,
            this.statusCodePtr,
            bufferSize,
            this.WINHTTP_NO_HEADER_INDEX
        );
        await asyncWait(0);
        
        if (queryResult) {
            this.statusCode = Memory.ReadU32(this.statusCodePtr, false);
            isDebugEnabled && log(`[HTTPV4] Status code: ${this.statusCode}`);
        }
        
        // Query headers
        isDebugEnabled && log("[HTTPV4] Querying headers...");
        this.headerBuffer = Memory.Allocate(4096);
        if (this.headerBuffer < 0) this.headerBuffer = this.headerBuffer >>> 0;
        await asyncWait(0);
        
        bufferSize = 4096;
        const headerResult = this.httpQueryHeaders(
            this.hRequest,
            this.WINHTTP_QUERY_RAW_HEADERS_CRLF,
            this.WINHTTP_HEADER_NAME_BY_INDEX,
            this.headerBuffer,
            bufferSize,
            this.WINHTTP_NO_HEADER_INDEX
        );
        await asyncWait(0);
        
        if (headerResult) {
            // Parse headers from wide string
            const headersStr = readWString(this.headerBuffer);
            isDebugEnabled && log(`[HTTPV4] Raw headers: ${headersStr}`);
            this.parseHeaders(headersStr);
        }
        
        // Allocate read buffers
        this.readBuffer = Memory.Allocate(1024);
        if (this.readBuffer < 0) this.readBuffer = this.readBuffer >>> 0;
        this.bytesReadPtr = Memory.Allocate(4);
        if (this.bytesReadPtr < 0) this.bytesReadPtr = this.bytesReadPtr >>> 0;
        await asyncWait(0);
        
        isDebugEnabled && log("[HTTPV4] Starting to read body...");
        this.state = HttpState.QUERY_HEADERS;
        return false;
    }
    
    private async doReadChunks(): Promise<boolean> {
        const MAX_ITERATIONS = 1024;
        const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB
        
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            // Check timeout
            if (Date.now() - this.startTime > this.timeout) {
                this.cleanup();
                throw new Error(`HTTP request timed out after ${this.timeout}ms`);
            }
            
            Memory.WriteU32(this.bytesReadPtr, 0, false);
            
            const success = this.httpReadData(
                this.hRequest,
                this.readBuffer,
                1024,
                this.bytesReadPtr
            );
            
            const bytesRead = Memory.ReadU32(this.bytesReadPtr, false);
            isDebugEnabled && log(`[HTTPV4] Read chunk ${i + 1}: ${bytesRead} bytes`);
            
            if (!success || bytesRead === 0) {
                break;
            }
            
            // Read chunk data
            const chunk = new Uint8Array(bytesRead);
            for (let j = 0; j < bytesRead; j++) {
                chunk[j] = Memory.ReadU8(this.readBuffer + j, false);
            }
            
            this.totalChunks.push(chunk);
            this.totalBytes += bytesRead;
            
            if (this.totalBytes > MAX_TOTAL_BYTES) {
                this.cleanup();
                throw new Error("HTTP response too large (>10MB)");
            }
            
            // Yield every 16 chunks to keep game responsive
            if (i % 16 === 0) {
                await asyncWait(0);
            }
        }
        
        isDebugEnabled && log(`[HTTPV4] Finished reading. Total: ${this.totalBytes} bytes`);
        this.state = HttpState.READ_CHUNKS;
        return false;
    }
    
    private async doDone(): Promise<boolean> {
        // Combine chunks
        const combinedLength = this.totalChunks.reduce((acc, cur) => acc + cur.length, 0);
        const fullBuffer = new Uint8Array(combinedLength);
        let offset = 0;
        for (const chunk of this.totalChunks) {
            fullBuffer.set(chunk, offset);
            offset += chunk.length;
        }
        
        // Decode to string
        const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
        let body: string;
        if (textDecoder) {
            body = textDecoder.decode(fullBuffer);
        } else {
            body = Array.from(fullBuffer).map(b => String.fromCharCode(b)).join("");
        }
        
        isDebugEnabled && log(`[HTTPV4] Response body length: ${body.length}`);
        
        // Cleanup
        this.cleanup();
        
        this.state = HttpState.DONE;
        return true;
    }
    
    private cleanup(): void {
        if (this.hRequest) {
            this.closeHandle(this.hRequest);
            this.hRequest = 0;
        }
        if (this.hConnect) {
            this.closeHandle(this.hConnect);
            this.hConnect = 0;
        }
        if (this.hSession) {
            this.closeHandle(this.hSession);
            this.hSession = 0;
        }
        if (this.readBuffer) {
            Memory.Free(this.readBuffer);
            this.readBuffer = 0;
        }
        if (this.bytesReadPtr) {
            Memory.Free(this.bytesReadPtr);
            this.bytesReadPtr = 0;
        }
        if (this.headerBuffer) {
            Memory.Free(this.headerBuffer);
            this.headerBuffer = 0;
        }
        if (this.statusCodePtr) {
            Memory.Free(this.statusCodePtr);
            this.statusCodePtr = 0;
        }
    }
    
    private parseUrl(url: string): void {
        let remaining = url;
        this.scheme = "http";
        this.isSecure = false;
        
        if (remaining.startsWith("https://")) {
            this.scheme = "https";
            this.isSecure = true;
            remaining = remaining.substring(8);
        } else if (remaining.startsWith("http://")) {
            remaining = remaining.substring(7);
        }
        
        const slashIndex = remaining.indexOf("/");
        let hostPart: string;
        
        if (slashIndex === -1) {
            hostPart = remaining;
            this.path = "/";
        } else {
            hostPart = remaining.substring(0, slashIndex);
            this.path = remaining.substring(slashIndex);
        }
        
        this.host = hostPart;
        this.port = this.isSecure ? 443 : 80;
        
        const colonIndex = hostPart.indexOf(":");
        if (colonIndex !== -1) {
            this.host = hostPart.substring(0, colonIndex);
            const portStr = hostPart.substring(colonIndex + 1);
            const parsedPort = parseInt(portStr, 10);
            if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
                this.port = parsedPort;
            }
        }
        
        if (this.path.length === 0) {
            this.path = "/";
        }
    }
    
    private parseHeaders(rawHeaders: string): void {
        const lines = rawHeaders.split("\r\n");
        for (const line of lines) {
            const colonIndex = line.indexOf(":");
            if (colonIndex > 0) {
                const name = line.substring(0, colonIndex).trim().toLowerCase();
                const value = line.substring(colonIndex + 1).trim();
                this.headers[name] = value;
            }
        }
    }
    
    /**
     * Get the response object (call after step() returns true)
     */
    getResponse(): HttpResponse {
        // Combine chunks into string
        const combinedLength = this.totalChunks.reduce((acc, cur) => acc + cur.length, 0);
        const fullBuffer = new Uint8Array(combinedLength);
        let offset = 0;
        for (const chunk of this.totalChunks) {
            fullBuffer.set(chunk, offset);
            offset += chunk.length;
        }
        
        const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
        let body: string;
        if (textDecoder) {
            body = textDecoder.decode(fullBuffer);
        } else {
            body = Array.from(fullBuffer).map(b => String.fromCharCode(b)).join("");
        }
        
        return {
            statusCode: this.statusCode,
            statusText: this.statusText,
            headers: { ...this.headers },
            body: body
        };
    }
}

/**
 * High-level HTTP GET function using the state machine
 * This function yields between steps to prevent game freezing
 */
export async function httpGet(url: string, timeout?: number): Promise<HttpResponse> {
    isDebugEnabled && log(`[HTTPV4] GET request to ${url}`);
    
    const client = new HttpClient(url, timeout);
    
    // Execute state machine until done
    while (true) {
        const done = await client.step();
        if (done) {
            break;
        }
    }
    
    const response = client.getResponse();
    isDebugEnabled && log(`[HTTPV4] Response: ${response.statusCode} - ${response.body.length} bytes`);
    
    return response;
}

/**
 * Simple HTTP GET that returns just the body string
 */
export async function httpGetString(url: string, timeout?: number): Promise<string> {
    const response = await httpGet(url, timeout);
    return response.body;
}

// Helper functions for wide strings

function allocWString(str: string): number {
    const encoded = encodeUtf16(`${str}\0`);
    const len = encoded.length;
    
    let buffer = Memory.Allocate(len);
    if (!buffer) throw new Error(`Memory.Allocate(${len}) returned 0`);
    if (buffer < 0) buffer = buffer >>> 0;
    
    for (let i = 0; i < len; i++) {
        Memory.WriteU8(buffer + i, encoded[i], false);
    }
    
    return buffer;
}

function readWString(ptr: number): string {
    if (typeof ptr !== "number" || ptr < 0) {
        throw new Error(`Invalid pointer: ${ptr}`);
    }
    
    const bytes: number[] = [];
    let offset = 0;
    
    while (offset < 8192) { // Max 8KB
        const low = Memory.ReadU8(ptr + offset, false);
        const high = Memory.ReadU8(ptr + offset + 1, false);
        offset += 2;
        
        if (low === 0 && high === 0) break; // Null terminator
        
        const code = low | (high << 8);
        bytes.push(code);
    }
    
    return String.fromCharCode(...bytes);
}

function encodeUtf16(str: string): Uint8Array {
    const utf16: number[] = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        utf16.push(code & 0xff, (code >> 8) & 0xff);
    }
    return new Uint8Array(utf16);
}
