/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { streamToBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import * as https from 'https';
import { AbstractOneDataSystemAppender } from '../common/1dsAppender.js';
/**
 * Completes a request to submit telemetry to the server utilizing the request service
 * @param options The options which will be used to make the request
 * @param requestService The request service
 * @returns An object containing the headers, statusCode, and responseData
 */
async function makeTelemetryRequest(options, requestService) {
    const response = await requestService.request(options, CancellationToken.None);
    const responseData = (await streamToBuffer(response.stream)).toString();
    const statusCode = response.res.statusCode ?? 200;
    const headers = response.res.headers;
    return {
        headers,
        statusCode,
        responseData,
    };
}
/**
 * Complete a request to submit telemetry to the server utilizing the https module. Only used when the request service is not available
 * @param options The options which will be used to make the request
 * @returns An object containing the headers, statusCode, and responseData
 */
async function makeLegacyTelemetryRequest(options) {
    const httpsOptions = {
        method: options.type,
        headers: options.headers,
    };
    const responsePromise = new Promise((resolve, reject) => {
        const req = https.request(options.url ?? '', httpsOptions, (res) => {
            res.on('data', function (responseData) {
                resolve({
                    headers: res.headers,
                    statusCode: res.statusCode ?? 200,
                    responseData: responseData.toString(),
                });
            });
            // On response with error send status of 0 and a blank response to oncomplete so we can retry events
            res.on('error', function (err) {
                reject(err);
            });
        });
        req.write(options.data, (err) => {
            if (err) {
                reject(err);
            }
        });
        req.end();
    });
    return responsePromise;
}
async function sendPostAsync(requestService, payload, oncomplete) {
    const telemetryRequestData = typeof payload.data === 'string' ? payload.data : new TextDecoder().decode(payload.data);
    const requestOptions = {
        type: 'POST',
        headers: {
            ...payload.headers,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload.data).toString(),
        },
        url: payload.urlString,
        data: telemetryRequestData,
    };
    try {
        const responseData = requestService
            ? await makeTelemetryRequest(requestOptions, requestService)
            : await makeLegacyTelemetryRequest(requestOptions);
        oncomplete(responseData.statusCode, responseData.headers, responseData.responseData);
    }
    catch {
        // If it errors out, send status of 0 and a blank response to oncomplete so we can retry events
        oncomplete(0, {});
    }
}
export class OneDataSystemAppender extends AbstractOneDataSystemAppender {
    constructor(requestService, isInternalTelemetry, eventPrefix, defaultData, iKeyOrClientFactory) {
        // Override the way events get sent since node doesn't have XHTMLRequest
        const customHttpXHROverride = {
            sendPOST: (payload, oncomplete) => {
                // Fire off the async request without awaiting it
                sendPostAsync(requestService, payload, oncomplete);
            },
        };
        super(isInternalTelemetry, eventPrefix, defaultData, iKeyOrClientFactory, customHttpXHROverride);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMWRzQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9ub2RlLzFkc0FwcGVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUd4RSxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQUUsNkJBQTZCLEVBQW9CLE1BQU0sMEJBQTBCLENBQUE7QUFjMUY7Ozs7O0dBS0c7QUFDSCxLQUFLLFVBQVUsb0JBQW9CLENBQ2xDLE9BQXdCLEVBQ3hCLGNBQStCO0lBRS9CLE1BQU0sUUFBUSxHQUFHLE1BQU0sY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDOUUsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN2RSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUE7SUFDakQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUE4QixDQUFBO0lBQzNELE9BQU87UUFDTixPQUFPO1FBQ1AsVUFBVTtRQUNWLFlBQVk7S0FDWixDQUFBO0FBQ0YsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxLQUFLLFVBQVUsMEJBQTBCLENBQUMsT0FBd0I7SUFDakUsTUFBTSxZQUFZLEdBQUc7UUFDcEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1FBQ3BCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztL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