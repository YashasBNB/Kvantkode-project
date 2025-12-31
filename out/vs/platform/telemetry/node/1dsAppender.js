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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMWRzQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvbm9kZS8xZHNBcHBlbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHeEUsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLDZCQUE2QixFQUFvQixNQUFNLDBCQUEwQixDQUFBO0FBYzFGOzs7OztHQUtHO0FBQ0gsS0FBSyxVQUFVLG9CQUFvQixDQUNsQyxPQUF3QixFQUN4QixjQUErQjtJQUUvQixNQUFNLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlFLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBTSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdkUsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFBO0lBQ2pELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBOEIsQ0FBQTtJQUMzRCxPQUFPO1FBQ04sT0FBTztRQUNQLFVBQVU7UUFDVixZQUFZO0tBQ1osQ0FBQTtBQUNGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsS0FBSyxVQUFVLDBCQUEwQixDQUFDLE9BQXdCO0lBQ2pFLE1BQU0sWUFBWSxHQUFHO1FBQ3BCLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSTtRQUNwQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87S0FDeEIs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