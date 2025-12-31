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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionGalleryManifestService, ExtensionGalleryServiceUrlConfigKey, } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService as ExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifestService.js';
import { resolveMarketplaceHeaders } from '../../../../platform/externalServices/common/marketplace.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDefaultAccountService } from '../../accounts/common/defaultAccount.js';
import { IHostService } from '../../host/browser/host.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
let WorkbenchExtensionGalleryManifestService = class WorkbenchExtensionGalleryManifestService extends ExtensionGalleryManifestService {
    constructor(productService, environmentService, fileService, telemetryService, storageService, remoteAgentService, sharedProcessService, configurationService, requestService, defaultAccountService, dialogService, hostService, logService) {
        super(productService);
        this.configurationService = configurationService;
        this.requestService = requestService;
        this.defaultAccountService = defaultAccountService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.logService = logService;
        this.extensionGalleryManifest = null;
        this._onDidChangeExtensionGalleryManifest = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifest = this._onDidChangeExtensionGalleryManifest.event;
        this.commonHeadersPromise = resolveMarketplaceHeaders(productService.version, productService, environmentService, configurationService, fileService, storageService, telemetryService);
        const channels = [sharedProcessService.getChannel('extensionGalleryManifest')];
        const remoteConnection = remoteAgentService.getConnection();
        if (remoteConnection) {
            channels.push(remoteConnection.getChannel('extensionGalleryManifest'));
        }
        this.getExtensionGalleryManifest().then((manifest) => {
            channels.forEach((channel) => channel.call('setExtensionGalleryManifest', [manifest]));
            this._register(this.onDidChangeExtensionGalleryManifest((manifest) => channels.forEach((channel) => channel.call('setExtensionGalleryManifest', [manifest]))));
        });
    }
    async getExtensionGalleryManifest() {
        if (!this.extensionGalleryManifestPromise) {
            this.extensionGalleryManifestPromise = this.doGetExtensionGalleryManifest();
        }
        await this.extensionGalleryManifestPromise;
        return this.extensionGalleryManifest ? this.extensionGalleryManifest[1] : null;
    }
    async doGetExtensionGalleryManifest() {
        const defaultServiceUrl = this.productService.extensionsGallery?.serviceUrl;
        if (!defaultServiceUrl) {
            this.extensionGalleryManifest = null;
            return;
        }
        const configuredServiceUrl = this.configurationService.getValue(ExtensionGalleryServiceUrlConfigKey);
        if (configuredServiceUrl &&
            this.checkAccess(await this.defaultAccountService.getDefaultAccount())) {
            this.extensionGalleryManifest = [
                configuredServiceUrl,
                await this.getExtensionGalleryManifestFromServiceUrl(configuredServiceUrl),
            ];
        }
        if (!this.extensionGalleryManifest) {
            const defaultExtensionGalleryManifest = await super.getExtensionGalleryManifest();
            if (defaultExtensionGalleryManifest) {
                this.extensionGalleryManifest = [defaultServiceUrl, defaultExtensionGalleryManifest];
            }
        }
        this._register(this.defaultAccountService.onDidChangeDefaultAccount((account) => {
            if (!configuredServiceUrl) {
                return;
            }
            const canAccess = this.checkAccess(account);
            if (canAccess && this.extensionGalleryManifest?.[0] === configuredServiceUrl) {
                return;
            }
            if (!canAccess && this.extensionGalleryManifest?.[0] === defaultServiceUrl) {
                return;
            }
            this.extensionGalleryManifest = null;
            this._onDidChangeExtensionGalleryManifest.fire(null);
            this.requestRestart();
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (!e.affectsConfiguration(ExtensionGalleryServiceUrlConfigKey)) {
                return;
            }
            const configuredServiceUrl = this.configurationService.getValue(ExtensionGalleryServiceUrlConfigKey);
            if (!configuredServiceUrl && this.extensionGalleryManifest?.[0] === defaultServiceUrl) {
                return;
            }
            if (configuredServiceUrl && this.extensionGalleryManifest?.[0] === configuredServiceUrl) {
                return;
            }
            this.extensionGalleryManifest = null;
            this._onDidChangeExtensionGalleryManifest.fire(null);
            this.requestRestart();
        }));
    }
    checkAccess(account) {
        if (!account) {
            this.logService.debug('[Marketplace] Checking account access for configured gallery: No account found');
            return false;
        }
        this.logService.debug('[Marketplace] Checking Account SKU access for configured gallery', account.access_type_sku);
        if (account.access_type_sku &&
            this.productService.extensionsGallery?.accessSKUs?.includes(account.access_type_sku)) {
            this.logService.debug('[Marketplace] Account has access to configured gallery');
            return true;
        }
        this.logService.debug('[Marketplace] Checking enterprise account access for configured gallery', account.enterprise);
        return account.enterprise;
    }
    async requestRestart() {
        const confirmation = await this.dialogService.confirm({
            message: localize('extensionGalleryManifestService.accountChange', '{0} is now configured to a different Marketplace. Please restart to apply the changes.', this.productService.nameLong),
            primaryButton: localize({ key: 'restart', comment: ['&& denotes a mnemonic'] }, '&&Restart'),
        });
        if (confirmation.confirmed) {
            return this.hostService.restart();
        }
    }
    async getExtensionGalleryManifestFromServiceUrl(url) {
        const commonHeaders = await this.commonHeadersPromise;
        const headers = {
            ...commonHeaders,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
        };
        try {
            const context = await this.requestService.request({
                type: 'GET',
                url,
                headers,
            }, CancellationToken.None);
            const extensionGalleryManifest = await asJson(context);
            if (!extensionGalleryManifest) {
                throw new Error('Unable to retrieve extension gallery manifest.');
            }
            return extensionGalleryManifest;
        }
        catch (error) {
            this.logService.error('[Marketplace] Error retrieving extension gallery manifest', error);
            throw error;
        }
    }
};
WorkbenchExtensionGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentService),
    __param(2, IFileService),
    __param(3, ITelemetryService),
    __param(4, IStorageService),
    __param(5, IRemoteAgentService),
    __param(6, ISharedProcessService),
    __param(7, IConfigurationService),
    __param(8, IRequestService),
    __param(9, IDefaultAccountService),
    __param(10, IDialogService),
    __param(11, IHostService),
    __param(12, ILogService)
], WorkbenchExtensionGalleryManifestService);
export { WorkbenchExtensionGalleryManifestService };
registerSingleton(IExtensionGalleryManifestService, WorkbenchExtensionGalleryManifestService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZ0NBQWdDLEVBRWhDLG1DQUFtQyxHQUNuQyxNQUFNLDZFQUE2RSxDQUFBO0FBQ3BGLE9BQU8sRUFBRSwrQkFBK0IsSUFBSSwrQkFBK0IsRUFBRSxNQUFNLG9GQUFvRixDQUFBO0FBQ3ZLLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUs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