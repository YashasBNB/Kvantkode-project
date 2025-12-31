/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { URI } from '../../../base/common/uri.js';
import { Emitter } from '../../../base/common/event.js';
import { dispose } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IDecorationsService, } from '../../services/decorations/common/decorations.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
class DecorationRequestsQueue {
    constructor(_proxy, _handle) {
        this._proxy = _proxy;
        this._handle = _handle;
        this._idPool = 0;
        this._requests = new Map();
        this._resolver = new Map();
        //
    }
    enqueue(uri, token) {
        const id = ++this._idPool;
        const result = new Promise((resolve) => {
            this._requests.set(id, { id, uri });
            this._resolver.set(id, resolve);
            this._processQueue();
        });
        const sub = token.onCancellationRequested(() => {
            this._requests.delete(id);
            this._resolver.delete(id);
        });
        return result.finally(() => sub.dispose());
    }
    _processQueue() {
        if (typeof this._timer === 'number') {
            // already queued
            return;
        }
        this._timer = setTimeout(() => {
            // make request
            const requests = this._requests;
            const resolver = this._resolver;
            this._proxy
                .$provideDecorations(this._handle, [...requests.values()], CancellationToken.None)
                .then((data) => {
                for (const [id, resolve] of resolver) {
                    resolve(data[id]);
                }
            });
            // reset
            this._requests = new Map();
            this._resolver = new Map();
            this._timer = undefined;
        }, 0);
    }
}
let MainThreadDecorations = class MainThreadDecorations {
    constructor(context, _decorationsService) {
        this._decorationsService = _decorationsService;
        this._provider = new Map();
        this._proxy = context.getProxy(ExtHostContext.ExtHostDecorations);
    }
    dispose() {
        this._provider.forEach((value) => dispose(value));
        this._provider.clear();
    }
    $registerDecorationProvider(handle, label) {
        const emitter = new Emitter();
        const queue = new DecorationRequestsQueue(this._proxy, handle);
        const registration = this._decorationsService.registerDecorationsProvider({
            label,
            onDidChange: emitter.event,
            provideDecorations: async (uri, token) => {
                const data = await queue.enqueue(uri, token);
                if (!data) {
                    return undefined;
                }
                const [bubble, tooltip, letter, themeColor] = data;
                return {
                    weight: 10,
                    bubble: bubble ?? false,
                    color: themeColor?.id,
                    tooltip,
                    letter,
                };
            },
        });
        this._provider.set(handle, [emitter, registration]);
    }
    $onDidChange(handle, resources) {
        const provider = this._provider.get(handle);
        if (provider) {
            const [emitter] = provider;
            emitter.fire(resources && resources.map((r) => URI.revive(r)));
        }
    }
    $unregisterDecorationProvider(handle) {
        const provider = this._provider.get(handle);
        if (provider) {
            dispose(provider);
            this._provider.delete(handle);
        }
    }
};
MainThreadDecorations = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDecorations),
    __param(1, IDecorationsService)
], MainThreadDecorations);
export { MainThreadDecorations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWREZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUNOLGNBQWMsRUFDZCxXQUFXLEdBS1gsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE1BQU0sdUJBQXVCO0lBTzVCLFlBQ2tCLE1BQStCLEVBQy9CLE9BQWU7UUFEZixXQUFNLEdBQU4sTUFBTSxDQUF5QjtRQUMvQixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBUnpCLFlBQU8sR0FBRyxDQUFDLENBQUE7UUFDWCxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUE7UUFDaEQsY0FBUyxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFBO1FBUW5FLEVBQUU7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQVEsRUFBRSxLQUF3QjtRQUN6QyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDekIsTUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDdEQsSUFB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