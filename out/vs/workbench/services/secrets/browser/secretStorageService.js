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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0U3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWNyZXRzL2Jyb3dzZXIvc2VjcmV0U3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUVOLHFCQUFxQixFQUNyQix3QkFBd0IsR0FDeEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFOUYsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSx3QkFBd0I7SUFJeEUsWUFDa0IsY0FBK0IsRUFDNUIsaUJBQXFDLEVBQ3BCLGtCQUF1RCxFQUMvRSxVQUF1QjtRQUVwQyxnRUFBZ0U7UUFDaEUsK0NBQStDO1FBQy9DLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTFELElBQUksa0JBQWtCLENBQUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUM7WUFDdkQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQTtZQUM5RSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxjQUFjLEVBQVUsQ0FBQTtRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUVRLEdBQUcsQ0FBQyxHQUFXO1FBQ3ZCLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUMsa0JBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXVCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDeEYsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRVEsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQ3RDLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUMsa0JBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDckQsTUFBTSxJQUFJLENBQUMsc0JBQXVCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDbEQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN4QyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFUSxNQUFNLENBQUMsR0FBVztRQUMxQixJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLGtCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JELE1BQU0sSUFBSSxDQUFDLHNCQUF1QixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN4QyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELElBQWEsSUFBSTtRQUNoQixJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQTtRQUN4QyxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBQ2xCLENBQUM7Q0FDRCxDQUFBO0FBekRZLDJCQUEyQjtJQUtyQyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxtQ0FBbUMsQ0FBQTtJQUNuQyxXQUFBLFdBQVcsQ0FBQTtHQVJELDJCQUEyQixDQXlEdkM7O0FBRUQsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsMkJBQTJCLG9DQUE0QixDQUFBIn0=