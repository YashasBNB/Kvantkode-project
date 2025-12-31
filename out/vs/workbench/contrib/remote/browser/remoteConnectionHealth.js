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
import { IRemoteAgentService, remoteConnectionLatencyMeasurer, } from '../../../services/remote/common/remoteAgentService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { localize } from '../../../../nls.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { getRemoteName } from '../../../../platform/remote/common/remoteHosts.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Codicon } from '../../../../base/common/codicons.js';
import Severity from '../../../../base/common/severity.js';
const REMOTE_UNSUPPORTED_CONNECTION_CHOICE_KEY = 'remote.unsupportedConnectionChoice';
const BANNER_REMOTE_UNSUPPORTED_CONNECTION_DISMISSED_KEY = 'workbench.banner.remote.unsupportedConnection.dismissed';
let InitialRemoteConnectionHealthContribution = class InitialRemoteConnectionHealthContribution {
    constructor(_remoteAgentService, _environmentService, _telemetryService, bannerService, dialogService, openerService, hostService, storageService, productService) {
        this._remoteAgentService = _remoteAgentService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this.bannerService = bannerService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.hostService = hostService;
        this.storageService = storageService;
        this.productService = productService;
        if (this._environmentService.remoteAuthority) {
            this._checkInitialRemoteConnectionHealth();
        }
    }
    async _confirmConnection() {
        let ConnectionChoice;
        (function (ConnectionChoice) {
            ConnectionChoice[ConnectionChoice["Allow"] = 1] = "Allow";
            ConnectionChoice[ConnectionChoice["LearnMore"] = 2] = "LearnMore";
            ConnectionChoice[ConnectionChoice["Cancel"] = 0] = "Cancel";
        })(ConnectionChoice || (ConnectionChoice = {}));
        const { result, checkboxChecked } = await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('unsupportedGlibcWarning', 'You are about to connect to an OS version that is unsupported by {0}.', this.productService.nameLong),
            buttons: [
                {
                    label: localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, '&&Allow'),
                    run: () => 1 /* ConnectionChoice.Allow */,
                },
                {
                    label: localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, '&&Learn More'),
                    run: async () => {
                        await this.openerService.open('https://aka.ms/vscode-remote/faq/old-linux');
                        return 2 /* ConnectionChoice.LearnMore */;
                    },
                },
            ],
            cancelButton: {
                run: () => 0 /* ConnectionChoice.Cancel */,
            },
            checkbox: {
                label: localize('remember', 'Do not show again'),
            },
        });
        if (result === 2 /* ConnectionChoice.LearnMore */) {
            return await this._confirmConnection();
        }
        const allowed = result === 1 /* ConnectionChoice.Allow */;
        if (allowed && checkboxChecked) {
            this.storageService.store(`${REMOTE_UNSUPPORTED_CONNECTION_CHOICE_KEY}.${this._environmentService.remoteAuthority}`, allowed, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
        return allowed;
    }
    async _checkInitialRemoteConnectionHealth() {
        try {
            const environment = await this._remoteAgentService.getRawEnvironment();
            if (environment && environment.isUnsupportedGlibc) {
                let allowed = this.storageService.getBoolean(`${REMOTE_UNSUPPORTED_CONNECTION_CHOICE_KEY}.${this._environmentService.remoteAuthority}`, 0 /* StorageScope.PROFILE */);
                if (allowed === undefined) {
                    allowed = await this._confirmConnection();
                }
                if (allowed) {
                    const bannerDismissedVersion = this.storageService.get(`${BANNER_REMOTE_UNSUPPORTED_CONNECTION_DISMISSED_KEY}`, 0 /* StorageScope.PROFILE */) ?? '';
                    // Ignore patch versions and dismiss the banner if the major and minor versions match.
                    const shouldShowBanner = bannerDismissedVersion.slice(0, bannerDismissedVersion.lastIndexOf('.')) !==
                        this.productService.version.slice(0, this.productService.version.lastIndexOf('.'));
                    if (shouldShowBanner) {
                        const actions = [
                            {
                                label: localize('unsupportedGlibcBannerLearnMore', 'Learn More'),
                                href: 'https://aka.ms/vscode-remote/faq/old-linux',
                            },
                        ];
                        this.bannerService.show({
                            id: 'unsupportedGlibcWarning.banner',
                            message: localize('unsupportedGlibcWarning.banner', 'You are connected to an OS version that is unsupported by {0}.', this.productService.nameLong),
                            actions,
                            icon: Codicon.warning,
                            closeLabel: `Do not show again in v${this.productService.version}`,
                            onClose: () => {
                                this.storageService.store(`${BANNER_REMOTE_UNSUPPORTED_CONNECTION_DISMISSED_KEY}`, this.productService.version, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                            },
                        });
                    }
                }
                else {
                    this.hostService.openWindow({ forceReuseWindow: true, remoteAuthority: null });
                    return;
                }
            }
            this._telemetryService.publicLog2('remoteConnectionSuccess', {
                web: isWeb,
                connectionTimeMs: await this._remoteAgentService
                    .getConnection()
                    ?.getInitialConnectionTimeMs(),
                remoteName: getRemoteName(this._environmentService.remoteAuthority),
            });
            await this._measureExtHostLatency();
        }
        catch (err) {
            this._telemetryService.publicLog2('remoteConnectionFailure', {
                web: isWeb,
                connectionTimeMs: await this._remoteAgentService
                    .getConnection()
                    ?.getInitialConnectionTimeMs(),
                remoteName: getRemoteName(this._environmentService.remoteAuthority),
                message: err ? err.message : '',
            });
        }
    }
    async _measureExtHostLatency() {
        const measurement = await remoteConnectionLatencyMeasurer.measure(this._remoteAgentService);
        if (measurement === undefined) {
            return;
        }
        this._telemetryService.publicLog2('remoteConnectionLatency', {
            web: isWeb,
            remoteName: getRemoteName(this._environmentService.remoteAuthority),
            latencyMs: measurement.current,
        });
    }
};
InitialRemoteConnectionHealthContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, ITelemetryService),
    __param(3, IBannerService),
    __param(4, IDialogService),
    __param(5, IOpenerService),
    __param(6, IHostService),
    __param(7, IStorageService),
    __param(8, IProductService)
], InitialRemoteConnectionHealthContribution);
export { InitialRemoteConnectionHealthContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQ29ubmVjdGlvbkhlYWx0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3JlbW90ZUNvbm5lY3Rpb25IZWFsdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwrQkFBK0IsR0FDL0IsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFFMUQsTUFBTSx3Q0FBd0MsR0FBRyxvQ0FBb0MsQ0FBQTtBQUNyRixNQUFNLGtEQUFrRCxHQUN2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