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
var ExtHostDecorations_1;
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
import { Disposable, FileDecoration } from './extHostTypes.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { asArray, groupBy } from '../../../base/common/arrays.js';
import { compare, count } from '../../../base/common/strings.js';
import { dirname } from '../../../base/common/path.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
let ExtHostDecorations = class ExtHostDecorations {
    static { ExtHostDecorations_1 = this; }
    static { this._handlePool = 0; }
    static { this._maxEventSize = 250; }
    constructor(extHostRpc, _logService) {
        this._logService = _logService;
        this._provider = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadDecorations);
    }
    registerFileDecorationProvider(provider, extensionDescription) {
        const handle = ExtHostDecorations_1._handlePool++;
        this._provider.set(handle, { provider, extensionDescription });
        this._proxy.$registerDecorationProvider(handle, extensionDescription.identifier.value);
        const listener = provider.onDidChangeFileDecorations &&
            provider.onDidChangeFileDecorations((e) => {
                if (!e) {
                    this._proxy.$onDidChange(handle, null);
                    return;
                }
                const array = asArray(e);
                if (array.length <= ExtHostDecorations_1._maxEventSize) {
                    this._proxy.$onDidChange(handle, array);
                    return;
                }
                // too many resources per event. pick one resource per folder, starting
                // with parent folders
                this._logService.warn('[Decorations] CAPPING events from decorations provider', extensionDescription.identifier.value, array.length);
                const mapped = array.map((uri) => ({ uri, rank: count(uri.path, '/') }));
                const groups = groupBy(mapped, (a, b) => a.rank - b.rank || compare(a.uri.path, b.uri.path));
                const picked = [];
                outer: for (const uris of groups) {
                    let lastDirname;
                    for (const obj of uris) {
                        const myDirname = dirname(obj.uri.path);
                        if (lastDirname !== myDirname) {
                            lastDirname = myDirname;
                            if (picked.push(obj.uri) >= ExtHostDecorations_1._maxEventSize) {
                                break outer;
                            }
                        }
                    }
                }
                this._proxy.$onDidChange(handle, picked);
            });
        return new Disposable(() => {
            listener?.dispose();
            this._proxy.$unregisterDecorationProvider(handle);
            this._provider.delete(handle);
        });
    }
    async $provideDecorations(handle, requests, token) {
        if (!this._provider.has(handle)) {
            // might have been unregistered in the meantime
            return Object.create(null);
        }
        const result = Object.create(null);
        const { provider, extensionDescription: extensionId } = this._provider.get(handle);
        await Promise.all(requests.map(async (request) => {
            try {
                const { uri, id } = request;
                const data = await Promise.resolve(provider.provideFileDecoration(URI.revive(uri), token));
                if (!data) {
                    return;
                }
                try {
                    FileDecoration.validate(data);
                    if (data.badge && typeof data.badge !== 'string') {
                        checkProposedApiEnabled(extensionId, 'codiconDecoration');
                    }
                    result[id] = [data.propagate, data.tooltip, data.badge, data.color];
                }
                catch (e) {
                    this._logService.warn(`INVALID decoration from extension '${extensionId.identifier.value}': ${e}`);
                }
            }
            catch (err) {
                this._logService.error(err);
            }
        }));
        return result;
    }
};
ExtHostDecorations = ExtHostDecorations_1 = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService)
], ExtHostDecorations);
export { ExtHostDecorations };
export const IExtHostDecorations = createDecorator('IExtHostDecorations');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQ04sV0FBVyxHQU1YLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUc5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFPakYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7O2FBQ2YsZ0JBQVcsR0FBRyxDQUFDLEFBQUosQ0FBSTthQUNmLGtCQUFhLEdBQUcsR0FBRyxBQUFOLENBQU07SUFNbEMsWUFDcUIsVUFBOEIsRUFDckMsV0FBeUM7UUFBeEIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFMdEMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFBO1FBTzNELElB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