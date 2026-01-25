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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyaXR5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2ludGVncml0eS9lbGVjdHJvbi1zYW5kYm94L2ludGVncml0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFnQixpQkFBaUIsRUFBdUIsTUFBTSx3QkFBd0IsQ0FBQTtBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0scUNBQXFDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBbUIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFPcEUsTUFBTSxnQkFBZ0I7YUFDRyxRQUFHLEdBQUcsa0JBQWtCLENBQUE7SUFJaEQsWUFBNkIsY0FBK0I7UUFBL0IsbUJBQWMsR0FBZCxjQUFj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