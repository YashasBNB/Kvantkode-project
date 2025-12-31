/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { bufferToStream, VSBuffer } from '../../../common/buffer.js';
import { canceled } from '../../../common/errors.js';
import { OfflineError } from './request.js';
export async function request(options, token, isOnline) {
    if (token.isCancellationRequested) {
        throw canceled();
    }
    const cancellation = new AbortController();
    const disposable = token.onCancellationRequested(() => cancellation.abort());
    const signal = options.timeout
        ? AbortSignal.any([cancellation.signal, AbortSignal.timeout(options.timeout)])
        : cancellation.signal;
    try {
        const fetchInit = {
            method: options.type || 'GET',
            headers: getRequestHeaders(options),
            body: options.data,
            signal,
        };
        if (options.disableCache) {
            fetchInit.cache = 'no-store';
        }
        const res = await fetch(options.url || '', fetchInit);
        return {
            res: {
                statusCode: res.status,
                headers: getResponseHeaders(res),
            },
            stream: bufferToStream(VSBuffer.wrap(new Uint8Array(await res.arrayBuffer()))),
        };
    }
    catch (err) {
        if (isOnline && !isOnline()) {
            throw new OfflineError();
        }
        if (err?.name === 'AbortError') {
            throw canceled();
        }
        if (err?.name === 'TimeoutError') {
            throw new Error(`Fetch timeout: ${options.timeout}ms`);
        }
        throw err;
    }
    finally {
        disposable.dispose();
    }
}
function getRequestHeaders(options) {
    if (options.headers || options.user || options.password || options.proxyAuthorization) {
        const headers = new Headers();
        outer: for (const k in options.headers) {
            switch (k.toLowerCase()) {
                case 'user-agent':
                case 'accept-encoding':
                case 'content-length':
                    // unsafe headers
                    continue outer;
            }
            const header = options.headers[k];
            if (typeof header === 'string') {
                headers.set(k, header);
            }
            else if (Array.isArray(header)) {
                for (const h of header) {
                    headers.append(k, h);
                }
            }
        }
        if (options.user || options.password) {
            headers.set('Authorization', 'Basic ' + btoa(`${options.user || ''}:${options.password || ''}`));
        }
        if (options.proxyAuthorization) {
            headers.set('Proxy-Authorization', options.proxyAuthorization);
        }
        return headers;
    }
    return undefined;
}
function getResponseHeaders(res) {
    const headers = Object.create(null);
    res.headers.forEach((value, key) => {
        if (headers[key]) {
            if (Array.isArray(headers[key])) {
                headers[key].push(value);
            }
            else {
                headers[key] = [headers[key], value];
            }
        }
        else {
            headers[key] = value;
        }
    });
    return headers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL3JlcXVlc3QvY29tbW9uL3JlcXVlc3RJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBOEMsWUFBWSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRXZGLE1BQU0sQ0FBQyxLQUFLLFVBQVUsT0FBTyxDQUM1QixPQUF3QixFQUN4QixLQUF3QixFQUN4QixRQUF3QjtJQUV4QixJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQ25DLE1BQU0sUUFBUSxFQUFFLENBQUE7SUFDakIsQ0FBQztJQUVELE1BQU0sWUFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDMUMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQzVFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPO1FBQzdCLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFBO0lBRXRCLElBQUksQ0FBQztRQUNKLE1BQU0sU0FBUyxHQUFnQjtZQUM5QixNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxLQUFLO1lBQzdCLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxPQUFPLENBQUM7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