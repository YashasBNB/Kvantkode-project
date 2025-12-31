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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUNOLFdBQVcsR0FNWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFHOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBT2pGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCOzthQUNmLGdCQUFXLEdBQUcsQ0FBQyxBQUFKLENBQUk7YUFDZixrQkFBYSxHQUFHLEdBQUcsQUFBTixDQUFNO0lBTWxDLFlBQ3FCLFVBQThCLEVBQ3JDLFdBQXlDO1FBQXhCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTHRDLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQTtRQU8zRCxJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUs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