import {Key} from ".config/enums"

// CLEO.debug.trace(true);

class HttpResponse {
    body: string;
    statusCode: number;
    error: string;

    constructor(body: string, statusCode: number, error: string = "") {
        this.body = body;
        this.statusCode = statusCode;
        this.error = error;
    }
}

class HttpClient {
    private chunkSize: number;

    constructor(chunkSize: number = 100) {
        this.chunkSize = chunkSize;
    }

    async get(url: string): Promise<HttpResponse> {
        const requestId = native<number>("START_HTTP_REQUEST", url);
        log(`Request started with ID: ${requestId}`);

        while (!native("IS_HTTP_REQUEST_COMPLETE", requestId)) {
            await asyncWait(0); //set to a higher value if stuttering
        }

        const body = this.readChunkedResponse(requestId);
        const statusCode = native<number>("GET_HTTP_STATUS_CODE", requestId);
        const error = native<string|null>("GET_HTTP_ERROR", requestId);
        return new HttpResponse(body, statusCode, error);
    }

    private readChunkedResponse(requestId: number): string {
        let offset = 0;
        let fullResponse = "";
        while (true) {
            let chunk = native("GET_HTTP_RESPONSE_CHUNK", requestId, offset, this.chunkSize);
            if (chunk.length === 0) break;
            fullResponse += chunk;
            offset += chunk.length;
            if (chunk.length < this.chunkSize) break;
        }
        return fullResponse;
    }
}

const http = new HttpClient();
let isFetching = false;
let models = '';

(async () => {
    while (true) {
        await asyncWait(100);

        if (Pad.IsGameKeyboardKeyPressed(Key.H) && !isFetching) {
            isFetching = true;
            log("Starting HTTP request...");

            const response = await http.get("http://localhost:1234/api/v1/models");

            if (response.statusCode === 200) {
                models = response.body;
                const parsedModels = JSON.parse(models);
                log(`Total of ${parsedModels.models.length} models`);
            } else {
                log(`HTTP error ${response.statusCode}: ${response.error}`);
                models = '';
            }

            isFetching = false;
        }
    }
})();
