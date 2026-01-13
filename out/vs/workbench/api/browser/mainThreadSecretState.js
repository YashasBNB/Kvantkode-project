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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNlY3JldFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFNlY3JldFN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBR3ZHLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQUtwRCxZQUNDLGNBQStCLEVBQ1Isb0JBQTRELEVBQ3RFLFVBQXdDLEVBQ2hCLGtCQUF1RDtRQUU1RixLQUFLLEVBQUUsQ0FBQTtRQUppQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3JELGVBQVUsR0FBVixVQUFVLENBQWE7UUFMckMsZUFBVSxHQUFHLElBQUksY0FBYyxFQUFVLENBQUE7UUFVekQsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRXhFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlCQUFp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