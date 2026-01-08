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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQ29ubmVjdGlvbkhlYWx0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvcmVtb3RlQ29ubmVjdGlvbkhlYWx0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLCtCQUErQixHQUMvQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUxRCxNQUFNLHdDQUF3QyxHQUFHLG9DQUFvQyxDQUFBO0FBQ3JGLE1BQU0sa0RBQWtE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