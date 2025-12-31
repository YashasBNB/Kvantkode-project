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
import * as platform from '../../../../base/common/platform.js';
import { dedupExtensions } from '../common/extensionsUtil.js';
import { IExtensionsScannerService, toExtensionDescription as toExtensionDescriptionFromScannedExtension, } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../host/browser/host.js';
import { timeout } from '../../../../base/common/async.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { toExtensionDescription } from '../common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
let CachedExtensionScanner = class CachedExtensionScanner {
    constructor(_notificationService, _hostService, _extensionsScannerService, _userDataProfileService, _extensionManagementService, _environmentService, _logService) {
        this._notificationService = _notificationService;
        this._hostService = _hostService;
        this._extensionsScannerService = _extensionsScannerService;
        this._userDataProfileService = _userDataProfileService;
        this._extensionManagementService = _extensionManagementService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this.scannedExtensions = new Promise((resolve, reject) => {
            this._scannedExtensionsResolve = resolve;
            this._scannedExtensionsReject = reject;
        });
    }
    async startScanningExtensions() {
        try {
            const extensions = await this._scanInstalledExtensions();
            this._scannedExtensionsResolve(extensions);
        }
        catch (err) {
            this._scannedExtensionsReject(err);
        }
    }
    async _scanInstalledExtensions() {
        try {
            const language = platform.language;
            const result = await Promise.allSettled([
                this._extensionsScannerService.scanSystemExtensions({ language, checkControlFile: true }),
                this._extensionsScannerService.scanUserExtensions({
                    language,
                    profileLocation: this._userDataProfileService.currentProfile.extensionsResource,
                    useCache: true,
                }),
                this._environmentService.remoteAuthority
                    ? []
                    : this._extensionManagementService.getInstalledWorkspaceExtensions(false),
            ]);
            let scannedSystemExtensions = [], scannedUserExtensions = [], workspaceExtensions = [], scannedDevelopedExtensions = [], hasErrors = false;
            if (result[0].status === 'fulfilled') {
                scannedSystemExtensions = result[0].value;
            }
            else {
                hasErrors = true;
                this._logService.error(`Error scanning system extensions:`, getErrorMessage(result[0].reason));
            }
            if (result[1].status === 'fulfilled') {
                scannedUserExtensions = result[1].value;
            }
            else {
                hasErrors = true;
                this._logService.error(`Error scanning user extensions:`, getErrorMessage(result[1].reason));
            }
            if (result[2].status === 'fulfilled') {
                workspaceExtensions = result[2].value;
            }
            else {
                hasErrors = true;
                this._logService.error(`Error scanning workspace extensions:`, getErrorMessage(result[2].reason));
            }
            try {
                scannedDevelopedExtensions =
                    await this._extensionsScannerService.scanExtensionsUnderDevelopment([...scannedSystemExtensions, ...scannedUserExtensions], { language });
            }
            catch (error) {
                this._logService.error(error);
            }
            const system = scannedSystemExtensions.map((e) => toExtensionDescriptionFromScannedExtension(e, false));
            const user = scannedUserExtensions.map((e) => toExtensionDescriptionFromScannedExtension(e, false));
            const workspace = workspaceExtensions.map((e) => toExtensionDescription(e, false));
            const development = scannedDevelopedExtensions.map((e) => toExtensionDescriptionFromScannedExtension(e, true));
            const r = dedupExtensions(system, user, workspace, development, this._logService);
            if (!hasErrors) {
                const disposable = this._extensionsScannerService.onDidChangeCache(() => {
                    disposable.dispose();
                    this._notificationService.prompt(Severity.Error, localize('extensionCache.invalid', 'Extensions have been modified on disk. Please reload the window.'), [
                        {
                            label: localize('reloadWindow', 'Reload Window'),
                            run: () => this._hostService.reload(),
                        },
                    ]);
                });
                timeout(5000).then(() => disposable.dispose());
            }
            return r;
        }
        catch (err) {
            this._logService.error(`Error scanning installed extensions:`);
            this._logService.error(err);
            return [];
        }
    }
};
CachedExtensionScanner = __decorate([
    __param(0, INotificationService),
    __param(1, IHostService),
    __param(2, IExtensionsScannerService),
    __param(3, IUserDataProfileService),
    __param(4, IWorkbenchExtensionManagementService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, ILogService)
], CachedExtensionScanner);
export { CachedExtensionScanner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVkRXh0ZW5zaW9uU2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvY2FjaGVkRXh0ZW5zaW9uU2Nhbm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBSy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM3RCxPQUFPLEVBQ04seUJBQXlCLEVBRXpCLHNCQUFzQixJQUFJLDBDQUEwQyxHQUNwRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDOUcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDaEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdEYsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxz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