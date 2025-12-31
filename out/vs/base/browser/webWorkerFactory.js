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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci93ZWJXb3JrZXJGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdEMsT0FBTyxFQUlOLGVBQWUsR0FDZixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1QywrREFBK0Q7QUFDL0Qsa0JBQWtCO0FBQ2xCLHlEQUF5RDtBQUN6RCxJQUFJLFFBQXFELENBQUE7QUFDekQsSUFDQyxPQUFPLElBQUksS0FBSyxRQUFRO0lBQ3hCLElBQUksQ0FBQyxXQUFXO0lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLDRCQUE0QjtJQUNyRCxVQUFrQixDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQy9DLENBQUM7SUFDRixRQUFRLEdBQUksVUFBa0IsQ0FBQyxjQUFjLENBQUE7QUFDOUMsQ0FBQztLQUFNLENBQUM7SUFDUCxRQUFRLEdBQUcsd0JBQXdCLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFDbkcsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxPQUFlLEVBQUUsT0FBdUI7SUFDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNsQyxNQUFNLElBQUksUUFBUSxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFDRCxPQUFPLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQXVCLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRTtRQUNoRyxHQUFHLE9BQU87UUFDVixJQUFJLEVBQUUsUUFBUTtLQUNkLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxVQUFnQyxFQUFFLEVBQVU7SUFDOUQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFBO0lBT2xELE1BQU0saUJBQWlCLEdBQW9DLFVBQWtCLENBQUMsaUJBQWlCLENBQUE7SUFDL0YsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZCLElBQUksT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDdkQsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNELENBQUM7UUFDRCxJQUFJLE9BQU8saUJBQWlCLENBQUMsWUFBWSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzFELE1BQU0sU0FBUyxHQUFHLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDeEUsT0FBTyxJQUFJLE1BQU0sQ0FDaEIsUUFBUSxDQUFDLENBQUMsQ0FBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBdUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUNqRixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUMvQixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQTtJQUN0RCxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsTUFBTSxTQUFTLEdBQUcscUJBQXFCLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUN4QixRQUFRLENBQUMsQ0FBQyxDQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUF1QixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQ2pGLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQy9CLENBQUE7UUFDRCxPQUFPLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxNQUFNLElBQUksS0FBSyxDQUNkLDBGQUEwRixDQUMxRixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsS0FBYSxFQUFFLGVBQXVCO0lBQ3BFLElBQ0MsNkJBQTZCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUNuRCxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsQ0FBQyxNQUFNLEVBQzNFLENBQUM7UUFDRixnQ0FBZ0M7UUFDaEMsMkZBQTJGO0lBQzVGLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QyxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FDWCxLQUFLLEdBQUcsQ0FBQztZQUNSLENBQUMsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkYsQ0FBQyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUE7UUFFekIsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixlQUFlLEdBQUcsR0FBRyxlQUFlLElBQUksS0FBSyxFQUFFLENBQUE7UUFDaEQsQ0FBQzthQUFNLENBQUM7WUFDUCxlQUFlLEdBQUcsR0FBRyxlQUFlLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFBO1FBQ3JFLENBQUM7SUFDRixDQUFDO0lBRUQsdUVBQXVFO0lBQ3ZFLHVFQUF1RTtJQUN2RSwyQ0FBMkM7SUFDM0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQ3BCO1FBQ0MsUUFBUSxDQUFDO1lBQ1IsS0FBSyxLQUFLLElBQUk7WUFDZCxxQ0FBcUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHO1lBQ3hFLHFDQUFxQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUc7WUFDeEUsa0NBQWtDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEdBQUc7WUFDakYsc0hBQXNIO1lBQ3RILHVDQUF1QztZQUN2QywwQ0FBMEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJO1lBQ3BILDBEQUEwRDtZQUMxRCxLQUFLLEtBQUssSUFBSTtTQUNkLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0tBQ1gsRUFDRCxFQUFFLElBQUksRUFBRSx3QkFBd0IsRUFBRSxDQUNsQyxDQUFBO0lBQ0QsT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2pDLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLE1BQWM7SUFDekMsT0FBTyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUM5QyxNQUFNLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQztZQUM3QixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLHFCQUFxQixFQUFFLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO2dCQUN2QixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO0lBQ3hCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFJLEdBQVE7SUFDakMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDcEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxTQUFVLFNBQVEsVUFBVTthQUNsQixtQkFBYyxHQUFHLENBQUMsQUFBSixDQUFJO0lBV2pDLFlBQVksa0JBQWlEO1FBQzVELEtBQUssRUFBRSxDQUFBO1FBUFMsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFBO1FBQ3BELGNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQTtRQUVoQyxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBTyxDQUFDLENBQUE7UUFDOUMsWUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBSTVDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUMsY0FBYyxDQUFBO1FBQ3BDLE1BQU0sZUFBZSxHQUNwQixrQkFBa0IsWUFBWSxNQUFNO1lBQ25DLENBQUMsQ0FBQyxrQkFBa0I7WUFDcEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUMsSUFBSSxhQUFhLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQTtRQUM5QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMvQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLHFDQUFxQztRQUM3RSxNQUFNLFlBQVksR0FBRyxDQUFDLEVBQWMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZCLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNwQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDOUIsQ0FBQyxDQUFBO1lBQ0QsQ0FBQyxDQUFDLGNBQWMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN2QixDQUFDLENBQUE7WUFDRCxJQUFJLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUM5QyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQzFDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNqQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUN2QixDQUFDLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtnQkFDbEIsQ0FBQyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUE7Z0JBQ3ZCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQzVDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtZQUNkLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxLQUFLO1FBQ1gsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ2YsQ0FBQztJQUVNLFdBQVcsQ0FBQyxPQUFZLEVBQUUsUUFBd0I7UUFDeEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2QixJQUFJLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3RCLGlCQUFpQixDQUFDLElBQUksS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNqRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQVFGLE1BQU0sT0FBTyxtQkFBbUI7SUFDL0IsWUFDaUIsaUJBQXNCLEVBQ3RCLEtBQXlCO1FBRHpCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBSztRQUN0QixVQUFLLEdBQUwsS0FBSyxDQUFvQjtJQUN2QyxDQUFDO0NBQ0o7QUFTRCxNQUFNLFVBQVUsZUFBZSxDQUM5QixJQUF5QyxFQUN6QyxJQUF5QjtJQUV6QixNQUFNLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksbUJBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDN0YsT0FBTyxJQUFJLGVBQWUsQ0FBSSxJQUFJLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7QUFDdkUsQ0FBQyJ9