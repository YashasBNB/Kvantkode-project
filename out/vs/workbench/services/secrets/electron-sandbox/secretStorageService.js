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
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { isLinux } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEncryptionService, isGnome, isKwallet, } from '../../../../platform/encryption/common/encryptionService.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { BaseSecretStorageService, ISecretStorageService, } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
let NativeSecretStorageService = class NativeSecretStorageService extends BaseSecretStorageService {
    constructor(_notificationService, _dialogService, _openerService, _jsonEditingService, _environmentService, storageService, encryptionService, logService) {
        super(!!_environmentService.useInMemorySecretStorage, storageService, encryptionService, logService);
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._openerService = _openerService;
        this._jsonEditingService = _jsonEditingService;
        this._environmentService = _environmentService;
        this.notifyOfNoEncryptionOnce = createSingleCallFunction(() => this.notifyOfNoEncryption());
    }
    set(key, value) {
        this._sequencer.queue(key, async () => {
            await this.resolvedStorageService;
            if (this.type !== 'persisted' && !this._environmentService.useInMemorySecretStorage) {
                this._logService.trace('[NativeSecretStorageService] Notifying user that secrets are not being stored on disk.');
                await this.notifyOfNoEncryptionOnce();
            }
        });
        return super.set(key, value);
    }
    async notifyOfNoEncryption() {
        const buttons = [];
        const troubleshootingButton = {
            label: localize('troubleshootingButton', 'Open troubleshooting guide'),
            run: () => this._openerService.open('https://go.microsoft.com/fwlink/?linkid=2239490'),
            // doesn't close dialogs
            keepOpen: true,
        };
        buttons.push(troubleshootingButton);
        let errorMessage = localize('encryptionNotAvailableJustTroubleshootingGuide', "An OS keyring couldn't be identified for storing the encryption related data in your current desktop environment.");
        if (!isLinux) {
            this._notificationService.prompt(Severity.Error, errorMessage, buttons);
            return;
        }
        const provider = await this._encryptionService.getKeyStorageProvider();
        if (provider === "basic_text" /* KnownStorageProvider.basicText */) {
            const detail = localize('usePlainTextExtraSentence', "Open the troubleshooting guide to address this or you can use weaker encryption that doesn't use the OS keyring.");
            const usePlainTextButton = {
                label: localize('usePlainText', 'Use weaker encryption'),
                run: async () => {
                    await this._encryptionService.setUsePlainTextEncryption();
                    await this._jsonEditingService.write(this._environmentService.argvResource, [{ path: ['password-store'], value: "basic" /* PasswordStoreCLIOption.basic */ }], true);
                    this.reinitialize();
                },
            };
            buttons.unshift(usePlainTextButton);
            await this._dialogService.prompt({
                type: 'error',
                buttons,
                message: errorMessage,
                detail,
            });
            return;
        }
        if (isGnome(provider)) {
            errorMessage = localize('isGnome', "You're running in a GNOME environment but the OS keyring is not available for encryption. Ensure you have gnome-keyring or another libsecret compatible implementation installed and running.");
        }
        else if (isKwallet(provider)) {
            errorMessage = localize('isKwallet', "You're running in a KDE environment but the OS keyring is not available for encryption. Ensure you have kwallet running.");
        }
        this._notificationService.prompt(Severity.Error, errorMessage, buttons);
    }
};
NativeSecretStorageService = __decorate([
    __param(0, INotificationService),
    __param(1, IDialogService),
    __param(2, IOpenerService),
    __param(3, IJSONEditingService),
    __param(4, INativeEnvironmentService),
    __param(5, IStorageService),
    __param(6, IEncryptionService),
    __param(7, ILogService)
], NativeSecretStorageService);
export { NativeSecretStorageService };
registerSingleton(ISecretStorageService, NativeSecretStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0U3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VjcmV0cy9lbGVjdHJvbi1zYW5kYm94L3NlY3JldFN0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsT0FBTyxFQUNQLFNBQVMsR0FDVCxNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHFCQUFxQixHQUNyQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUV4RSxJQUFNLDBCQUEwQixH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