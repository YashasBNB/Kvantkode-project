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
var IntegrityService_1;
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { IIntegrityService } from '../common/integrity.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INotificationService, NotificationPriority, } from '../../../../platform/notification/common/notification.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IChecksumService } from '../../../../platform/checksum/common/checksumService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
class IntegrityStorage {
    static { this.KEY = 'integrityService'; }
    constructor(storageService) {
        this.storageService = storageService;
        this.value = this._read();
    }
    _read() {
        const jsonValue = this.storageService.get(IntegrityStorage.KEY, -1 /* StorageScope.APPLICATION */);
        if (!jsonValue) {
            return null;
        }
        try {
            return JSON.parse(jsonValue);
        }
        catch (err) {
            return null;
        }
    }
    get() {
        return this.value;
    }
    set(data) {
        this.value = data;
        this.storageService.store(IntegrityStorage.KEY, JSON.stringify(this.value), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
}
let IntegrityService = IntegrityService_1 = class IntegrityService {
    isPure() {
        return this.isPurePromise;
    }
    constructor(notificationService, storageService, lifecycleService, openerService, productService, checksumService, logService) {
        this.notificationService = notificationService;
        this.lifecycleService = lifecycleService;
        this.openerService = openerService;
        this.productService = productService;
        this.checksumService = checksumService;
        this.logService = logService;
        this.storage = new IntegrityStorage(storageService);
        this.isPurePromise = this._isPure();
        this._compute();
    }
    async _compute() {
        const { isPure } = await this.isPure();
        if (isPure) {
            return; // all is good
        }
        this.logService.warn(`

----------------------------------------------
***	Installation has been modified on disk ***
----------------------------------------------

`);
        const storedData = this.storage.get();
        if (storedData?.dontShowPrompt && storedData.commit === this.productService.commit) {
            return; // Do not prompt
        }
        this._showNotification();
    }
    async _isPure() {
        const expectedChecksums = this.productService.checksums || {};
        await this.lifecycleService.when(4 /* LifecyclePhase.Eventually */);
        const allResults = await Promise.all(Object.keys(expectedChecksums).map((filename) => this._resolve(filename, expectedChecksums[filename])));
        let isPure = true;
        for (let i = 0, len = allResults.length; i < len; i++) {
            if (!allResults[i].isPure) {
                isPure = false;
                break;
            }
        }
        return {
            isPure,
            proof: allResults,
        };
    }
    async _resolve(filename, expected) {
        const fileUri = FileAccess.asFileUri(filename);
        try {
            const checksum = await this.checksumService.checksum(fileUri);
            return IntegrityService_1._createChecksumPair(fileUri, checksum, expected);
        }
        catch (error) {
            return IntegrityService_1._createChecksumPair(fileUri, '', expected);
        }
    }
    static _createChecksumPair(uri, actual, expected) {
        return {
            uri: uri,
            actual: actual,
            expected: expected,
            isPure: actual === expected,
        };
    }
    _showNotification() {
        const checksumFailMoreInfoUrl = this.productService.checksumFailMoreInfoUrl;
        const message = localize('integrity.prompt', 'Your {0} installation appears to be corrupt. Please reinstall.', this.productService.nameShort);
        if (checksumFailMoreInfoUrl) {
            this.notificationService.prompt(Severity.Warning, message, [
                {
                    label: localize('integrity.moreInformation', 'More Information'),
                    run: () => this.openerService.open(URI.parse(checksumFailMoreInfoUrl)),
                },
                {
                    label: localize('integrity.dontShowAgain', "Don't Show Again"),
                    isSecondary: true,
                    run: () => this.storage.set({ dontShowPrompt: true, commit: this.productService.commit }),
                },
            ], {
                sticky: true,
                priority: NotificationPriority.URGENT,
            });
        }
        else {
            this.notificationService.notify({
                severity: Severity.Warning,
                message,
                sticky: true,
                priority: NotificationPriority.URGENT,
            });
        }
    }
};
IntegrityService = IntegrityService_1 = __decorate([
    __param(0, INotificationService),
    __param(1, IStorageService),
    __param(2, ILifecycleService),
    __param(3, IOpenerService),
    __param(4, IProductService),
    __param(5, IChecksumService),
    __param(6, ILogService)
], IntegrityService);
export { IntegrityService };
registerSingleton(IIntegrityService, IntegrityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyaXR5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9pbnRlZ3JpdHkvZWxlY3Ryb24tc2FuZGJveC9pbnRlZ3JpdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBZ0IsaUJBQWlCLEVBQXVCLE1BQU0sd0JBQXdCLENBQUE7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sb0NBQW9DLENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBT3BFLE1BQU0sZ0JBQWdCO2FBQ0csUUFBRyxHQUFHLGtCQUFrQixDQUFBO0lBSWhELFlBQTZCLGNBQStCO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFp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