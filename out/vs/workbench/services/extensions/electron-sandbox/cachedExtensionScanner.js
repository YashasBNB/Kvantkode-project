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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVkRXh0ZW5zaW9uU2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvZWxlY3Ryb24tc2FuZGJveC9jYWNoZWRFeHRlbnNpb25TY2FubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFLL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzdELE9BQU8sRUFDTix5QkFBeUIsRUFFekIsc0JBQXNCLElBQUksMENBQTBDLEdBQ3BFLE1BQU0sNkVBQTZFLENBQUE7QUFDcEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV0RixJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQUtsQyxZQUN3QyxvQkFBMEMsRUFDbEQsWUFBMEIsRUFFeEMseUJBQW9ELEVBQzNCLHVCQUFnRCxFQUV6RSwyQkFBaUUsRUFFakUsbUJBQWlELEVBQ3BDLFdBQXdCO1FBVGYseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUNsRCxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUV4Qyw4QkFBeUIsR0FBekIseUJBQXlCLENBQTJCO1FBQzNCLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFFekUsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUFzQztRQUVqRSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQThCO1FBQ3BDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBRXRELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLE9BQU8sQ0FBMEIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDakYsSUFBSSxDQUFDLHlCQUF5QixHQUFHLE9BQU8sQ0FBQTtZQUN4QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsTUFBTSxDQUFBO1FBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLEtBQUssQ0FBQyx1QkFBdUI7UUFDbkMsSUFBSSxDQUFDO1lBQ0osTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtZQUN4RCxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCO1FBQ3JDLElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUE7WUFDbEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDO2dCQUN2QyxJQUFJLENBQUMseUJBQXlCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQ3pGLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDakQsUUFBUTtvQkFDUixlQUFlLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxrQkFBa0I7b0JBQy9FLFFBQVEsRUFBRSxJQUFJO2lCQUNkLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWU7b0JBQ3ZDLENBQUMsQ0FBQyxFQUFFO29CQUNKLENBQUMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsK0JBQStCLENBQUMsS0FBSyxDQUFDO2FBQzFFLENBQUMsQ0FBQTtZQUVGLElBQUksdUJBQXVCLEdBQXdCLEVBQUUsRUFDcEQscUJBQXFCLEdBQXdCLEVBQUUsRUFDL0MsbUJBQW1CLEdBQWlCLEVBQUUsRUFDdEMsMEJBQTBCLEdBQXdCLEVBQUUsRUFDcEQsU0FBUyxHQUFHLEtBQUssQ0FBQTtZQUVsQixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ3RDLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDMUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFNBQVMsR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUNyQixtQ0FBbUMsRUFDbkMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDakMsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ3RDLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFNBQVMsR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUM3RixDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUN0QyxtQkFBbUIsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1lBQ3RDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxTQUFTLEdBQUcsSUFBSSxDQUFBO2dCQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FDckIsc0NBQXNDLEVBQ3RDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQ2pDLENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDO2dCQUNKLDBCQUEwQjtvQkFDekIsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsOEJBQThCLENBQ2xFLENBQUMsR0FBRyx1QkFBdUIsRUFBRSxHQUFHLHFCQUFxQixDQUFDLEVBQ3RELEVBQUUsUUFBUSxFQUFFLENBQ1osQ0FBQTtZQUNILENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM5QixDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUcsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDaEQsMENBQTBDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUNwRCxDQUFBO1lBQ0QsTUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDNUMsMENBQTBDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUNwRCxDQUFBO1lBQ0QsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNsRixNQUFNLFdBQVcsR0FBRywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN4RCwwQ0FBMEMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQ25ELENBQUE7WUFDRCxNQUFNLENBQUMsR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUVqRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7b0JBQ3ZFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDcEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FDL0IsUUFBUSxDQUFDLEtBQUssRUFDZCxRQUFRLENBQ1Asd0JBQXdCLEVBQ3hCLGtFQUFrRSxDQUNsRSxFQUNEO3dCQUNDOzRCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQzs0QkFDaEQsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFO3lCQUNyQztxQkFDRCxDQUNELENBQUE7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1lBRUQsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUE7WUFDOUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDM0IsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFqSVksc0JBQXNCO0lBTWhDLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHlCQUF5QixDQUFBO0lBRXpCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxXQUFBLDRCQUE0QixDQUFBO0lBRTVCLFdBQUEsV0FBVyxDQUFBO0dBZkQsc0JBQXNCLENBaUlsQyJ9