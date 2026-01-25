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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvcmVxdWVzdC9jb21tb24vcmVxdWVzdEltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEQsT0FBTyxFQUE4QyxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFdkYsTUFBTSxDQUFDLEtBQUssVUFBVSxPQUFPLENBQzVCLE9BQXdCLEVBQ3hCLEtBQXdCLEVBQ3hCLFFBQXdCO0lBRXhCLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDbkMsTUFBTSxRQUFRLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDNUUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU87UUFDN0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUE7SUFFdEIsSUFBSSxDQUFDO1FBQ0osTUFBTSxTQUFTLEdBQWdCO1lBQzlCLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLEtBQUs7WUFDN0IsT0FBTyxFQUFFLGlCQUFpQixDQUFDLE9BQU8s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