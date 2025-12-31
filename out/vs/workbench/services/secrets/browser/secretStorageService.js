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
import { SequencerByKey } from '../../../../base/common/async.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ISecretStorageService, BaseSecretStorageService, } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
let BrowserSecretStorageService = class BrowserSecretStorageService extends BaseSecretStorageService {
    constructor(storageService, encryptionService, environmentService, logService) {
        // We don't have encryption in the browser so instead we use the
        // in-memory base class implementation instead.
        super(true, storageService, encryptionService, logService);
        if (environmentService.options?.secretStorageProvider) {
            this._secretStorageProvider = environmentService.options.secretStorageProvider;
            this._embedderSequencer = new SequencerByKey();
        }
    }
    get(key) {
        if (this._secretStorageProvider) {
            return this._embedderSequencer.queue(key, () => this._secretStorageProvider.get(key));
        }
        return super.get(key);
    }
    set(key, value) {
        if (this._secretStorageProvider) {
            return this._embedderSequencer.queue(key, async () => {
                await this._secretStorageProvider.set(key, value);
                this.onDidChangeSecretEmitter.fire(key);
            });
        }
        return super.set(key, value);
    }
    delete(key) {
        if (this._secretStorageProvider) {
            return this._embedderSequencer.queue(key, async () => {
                await this._secretStorageProvider.delete(key);
                this.onDidChangeSecretEmitter.fire(key);
            });
        }
        return super.delete(key);
    }
    get type() {
        if (this._secretStorageProvider) {
            return this._secretStorageProvider.type;
        }
        return super.type;
    }
};
BrowserSecretStorageService = __decorate([
    __param(0, IStorageService),
    __param(1, IEncryptionService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, ILogService)
], BrowserSecretStorageService);
export { BrowserSecretStorageService };
registerSingleton(ISecretStorageService, BrowserSecretStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0U3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VjcmV0cy9icm93c2VyL3NlY3JldFN0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixxQkFBcUIsRUFDckIsd0JBQXdCLEdBQ3hCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRTlGLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsd0JBQXdCO0lBSXhFLFlBQ2tCLGNBQStCLEVBQzVCLGlCQUFxQyxFQUNwQixrQkFBdUQsRUFDL0UsVUFBdUI7UUFFcEMsZ0VBQWdFO1FBQ2hFLCtDQUErQztRQUMvQyxLQUFLLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUUxRCxJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDO1lBQ3ZELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUE7WUFDOUUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksY0FBYyxFQUFVLENBQUE7UUFDdkQsQ0FBQztJQUNGLENBQUM7SUFFUSxHQUFHLENBQUMsR0FBVztRQUN2QixJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLGtCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVRLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUN0QyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLGtCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JELE1BQU0sSUFBSSxDQUFDLHNCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ2xELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRVEsTUFBTSxDQUFDLEdBQVc7UUFDMUIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxrQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNyRCxNQUFNLElBQUksQ0FBQyxzQkFBdUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzlDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxJQUFhLElBQUk7UUFDaEIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUE7UUFDeEMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQTtJQUNsQixDQUFDO0NBQ0QsQ0FBQTtBQXpEWSwyQkFBMkI7SUFLckMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUNBQW1DLENBQUE7SUFDbkMsV0FBQSxXQUFXLENBQUE7R0FSRCwyQkFBMkIsQ0F5RHZDOztBQUVELGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLDJCQUEyQixvQ0FBNEIsQ0FBQSJ9