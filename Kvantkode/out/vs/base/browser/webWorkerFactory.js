/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from './trustedTypes.js';
import { onUnexpectedError } from '../common/errors.js';
import { COI } from '../common/network.js';
import { URI } from '../common/uri.js';
import { WebWorkerClient, } from '../common/worker/webWorker.js';
import { Disposable, toDisposable } from '../common/lifecycle.js';
import { coalesce } from '../common/arrays.js';
import { getNLSLanguage, getNLSMessages } from '../../nls.js';
import { Emitter } from '../common/event.js';
// Reuse the trusted types policy defined from worker bootstrap
// when available.
// Refs https://github.com/microsoft/vscode/issues/222193
let ttPolicy;
if (typeof self === 'object' &&
    self.constructor &&
    self.constructor.name === 'DedicatedWorkerGlobalScope' &&
    globalThis.workerttPolicy !== undefined) {
    ttPolicy = globalThis.workerttPolicy;
}
else {
    ttPolicy = createTrustedTypesPolicy('defaultWorkerFactory', { createScriptURL: (value) => value });
}
export function createBlobWorker(blobUrl, options) {
    if (!blobUrl.startsWith('blob:')) {
        throw new URIError('Not a blob-url: ' + blobUrl);
    }
    return new Worker(ttPolicy ? ttPolicy.createScriptURL(blobUrl) : blobUrl, {
        ...options,
        type: 'module',
    });
}
function getWorker(descriptor, id) {
    const label = descriptor.label || 'anonymous' + id;
    const monacoEnvironment = globalThis.MonacoEnvironment;
    if (monacoEnvironment) {
        if (typeof monacoEnvironment.getWorker === 'function') {
            return monacoEnvironment.getWorker('workerMain.js', label);
        }
        if (typeof monacoEnvironment.getWorkerUrl === 'function') {
            const workerUrl = monacoEnvironment.getWorkerUrl('workerMain.js', label);
            return new Worker(ttPolicy ? ttPolicy.createScriptURL(workerUrl) : workerUrl, { name: label, type: 'module' });
        }
    }
    const esmWorkerLocation = descriptor.esmModuleLocation;
    if (esmWorkerLocation) {
        const workerUrl = getWorkerBootstrapUrl(label, esmWorkerLocation.toString(true));
        const worker = new Worker(ttPolicy ? ttPolicy.createScriptURL(workerUrl) : workerUrl, { name: label, type: 'module' });
        return whenESMWorkerReady(worker);
    }
    throw new Error(`You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker`);
}
function getWorkerBootstrapUrl(label, workerScriptUrl) {
    if (/^((http:)|(https:)|(file:))/.test(workerScriptUrl) &&
        workerScriptUrl.substring(0, globalThis.origin.length) !== globalThis.origin) {
        // this is the cross-origin case
        // i.e. the webpage is running at a different origin than where the scripts are loaded from
    }
    else {
        const start = workerScriptUrl.lastIndexOf('?');
        const end = workerScriptUrl.lastIndexOf('#', start);
        const params = start > 0
            ? new URLSearchParams(workerScriptUrl.substring(start + 1, ~end ? end : undefined))
            : new URLSearchParams();
        COI.addSearchParam(params, true, true);
        const search = params.toString();
        if (!search) {
            workerScriptUrl = `${workerScriptUrl}#${label}`;
        }
        else {
            workerScriptUrl = `${workerScriptUrl}?${params.toString()}#${label}`;
        }
    }
    // In below blob code, we are using JSON.stringify to ensure the passed
    // in values are not breaking our script. The values may contain string
    // terminating characters (such as ' or ").
    const blob = new Blob([
        coalesce([
            `/*${label}*/`,
            `globalThis._VSCODE_NLS_MESSAGES = ${JSON.stringify(getNLSMessages())};`,
            `globalThis._VSCODE_NLS_LANGUAGE = ${JSON.stringify(getNLSLanguage())};`,
            `globalThis._VSCODE_FILE_ROOT = ${JSON.stringify(globalThis._VSCODE_FILE_ROOT)};`,
            `const ttPolicy = globalThis.trustedTypes?.createPolicy('defaultWorkerFactory', { createScriptURL: value => value });`,
            `globalThis.workerttPolicy = ttPolicy;`,
            `await import(ttPolicy?.createScriptURL(${JSON.stringify(workerScriptUrl)}) ?? ${JSON.stringify(workerScriptUrl)});`,
            `globalThis.postMessage({ type: 'vscode-worker-ready' });`,
            `/*${label}*/`,
        ]).join(''),
    ], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}
function whenESMWorkerReady(worker) {
    return new Promise((resolve, reject) => {
        worker.onmessage = function (e) {
            if (e.data.type === 'vscode-worker-ready') {
                worker.onmessage = null;
                resolve(worker);
            }
        };
        worker.onerror = reject;
    });
}
function isPromiseLike(obj) {
    if (typeof obj.then === 'function') {
        return true;
    }
    return false;
}
/**
 * A worker that uses HTML5 web workers so that is has
 * its own global scope and its own thread.
 */
class WebWorker extends Disposable {
    static { this.LAST_WORKER_ID = 0; }
    constructor(descriptorOrWorker) {
        super();
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this.id = ++WebWorker.LAST_WORKER_ID;
        const workerOrPromise = descriptorOrWorker instanceof Worker
            ? descriptorOrWorker
            : getWorker(descriptorOrWorker, this.id);
        if (isPromiseLike(workerOrPromise)) {
            this.worker = workerOrPromise;
        }
        else {
            this.worker = Promise.resolve(workerOrPromise);
        }
        this.postMessage('-please-ignore-', []); // TODO: Eliminate this extra message
        const errorHandler = (ev) => {
            this._onError.fire(ev);
        };
        this.worker.then((w) => {
            w.onmessage = (ev) => {
                this._onMessage.fire(ev.data);
            };
            w.onmessageerror = (ev) => {
                this._onError.fire(ev);
            };
            if (typeof w.addEventListener === 'function') {
                w.addEventListener('error', errorHandler);
            }
        });
        this._register(toDisposable(() => {
            this.worker?.then((w) => {
                w.onmessage = null;
                w.onmessageerror = null;
                w.removeEventListener('error', errorHandler);
                w.terminate();
            });
            this.worker = null;
        }));
    }
    getId() {
        return this.id;
    }
    postMessage(message, transfer) {
        this.worker?.then((w) => {
            try {
                w.postMessage(message, transfer);
            }
            catch (err) {
                onUnexpectedError(err);
                onUnexpectedError(new Error(`FAILED to post message to worker`, { cause: err }));
            }
        });
    }
}
export class WebWorkerDescriptor {
    constructor(esmModuleLocation, label) {
        this.esmModuleLocation = esmModuleLocation;
        this.label = label;
    }
}
export function createWebWorker(arg0, arg1) {
    const workerDescriptorOrWorker = URI.isUri(arg0) ? new WebWorkerDescriptor(arg0, arg1) : arg0;
    return new WebWorkerClient(new WebWorker(workerDescriptorOrWorker));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3dlYldvcmtlckZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN0QyxPQUFPLEVBSU4sZUFBZSxHQUNmLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVDLCtEQUErRDtBQUMvRCxrQkFBa0I7QUFDbEIseURBQXlEO0FBQ3pELElBQUksUUFBcUQsQ0FBQTtBQUN6RCxJQUNDLE9BQU8sSUFBSSxLQUFLLFFBQVE7SUFDeEIsSUFBSSxDQUFDLFdBQVc7SUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssNEJBQTRCO0lBQ3JELFVBQWtCLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFDL0MsQ0FBQztJQUNGLFFBQVEsR0FBSSxVQUFrQixDQUFDLGNBQWMsQ0FBQTtBQUM5QyxDQUFDO0tBQU0sQ0FBQztJQUNQLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxzQkFBc0IsRUFBRSxF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