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
import { Disposable } from '../../../base/common/lifecycle.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { SequencerByKey } from '../../../base/common/async.js';
import { ISecretStorageService } from '../../../platform/secrets/common/secrets.js';
import { IBrowserWorkbenchEnvironmentService } from '../../services/environment/browser/environmentService.js';
let MainThreadSecretState = class MainThreadSecretState extends Disposable {
    constructor(extHostContext, secretStorageService, logService, environmentService) {
        super();
        this.secretStorageService = secretStorageService;
        this.logService = logService;
        this._sequencer = new SequencerByKey();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSecretState);
        this._register(this.secretStorageService.onDidChangeSecret((e) => {
            try {
                const { extensionId, key } = this.parseKey(e);
                if (extensionId && key) {
                    this._proxy.$onDidChangePassword({ extensionId, key });
                }
            }
            catch (e) {
                // Core can use non-JSON values as keys, so we may not be able to parse them.
            }
        }));
    }
    $getPassword(extensionId, key) {
        this.logService.trace(`[mainThreadSecretState] Getting password for ${extensionId} extension: `, key);
        return this._sequencer.queue(extensionId, () => this.doGetPassword(extensionId, key));
    }
    async doGetPassword(extensionId, key) {
        const fullKey = this.getKey(extensionId, key);
        const password = await this.secretStorageService.get(fullKey);
        this.logService.trace(`[mainThreadSecretState] ${password ? 'P' : 'No p'}assword found for: `, extensionId, key);
        return password;
    }
    $setPassword(extensionId, key, value) {
        this.logService.trace(`[mainThreadSecretState] Setting password for ${extensionId} extension: `, key);
        return this._sequencer.queue(extensionId, () => this.doSetPassword(extensionId, key, value));
    }
    async doSetPassword(extensionId, key, value) {
        const fullKey = this.getKey(extensionId, key);
        await this.secretStorageService.set(fullKey, value);
        this.logService.trace('[mainThreadSecretState] Password set for: ', extensionId, key);
    }
    $deletePassword(extensionId, key) {
        this.logService.trace(`[mainThreadSecretState] Deleting password for ${extensionId} extension: `, key);
        return this._sequencer.queue(extensionId, () => this.doDeletePassword(extensionId, key));
    }
    async doDeletePassword(extensionId, key) {
        const fullKey = this.getKey(extensionId, key);
        await this.secretStorageService.delete(fullKey);
        this.logService.trace('[mainThreadSecretState] Password deleted for: ', extensionId, key);
    }
    getKey(extensionId, key) {
        return JSON.stringify({ extensionId, key });
    }
    parseKey(key) {
        return JSON.parse(key);
    }
};
MainThreadSecretState = __decorate([
    extHostNamedCustomer(MainContext.MainThreadSecretState),
    __param(1, ISecretStorageService),
    __param(2, ILogService),
    __param(3, IBrowserWorkbenchEnvironmentService)
], MainThreadSecretState);
export { MainThreadSecretState };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNlY3JldFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRTZWNyZXRTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixjQUFjLEVBRWQsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUd2RyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFLcEQsWUFDQyxjQUErQixFQUNSLG9CQUE0RCxFQUN0RSxVQUF3QyxFQUNoQixrQkFBdUQ7UUFFNUYsS0FBSyxFQUFFLENBQUE7UUFKaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBTHJDLGVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBVSxDQUFBO1FBVXpELElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUV4RSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQVMsRUFBRSxF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