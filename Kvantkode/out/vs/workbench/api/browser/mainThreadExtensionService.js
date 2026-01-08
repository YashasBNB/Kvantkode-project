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
import { Action } from '../../../base/common/actions.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { transformErrorFromSerialization } from '../../../base/common/errors.js';
import { FileAccess } from '../../../base/common/network.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { areSameExtensions } from '../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { ManagedRemoteConnection, WebSocketRemoteConnection, } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IExtensionsWorkbenchService, } from '../../contrib/extensions/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService, } from '../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService, } from '../../services/extensions/common/extensions.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IHostService } from '../../services/host/browser/host.js';
import { ITimerService } from '../../services/timer/browser/timerService.js';
let MainThreadExtensionService = class MainThreadExtensionService {
    constructor(extHostContext, _extensionService, _notificationService, _extensionsWorkbenchService, _hostService, _extensionEnablementService, _timerService, _commandService, _environmentService) {
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._hostService = _hostService;
        this._extensionEnablementService = _extensionEnablementService;
        this._timerService = _timerService;
        this._commandService = _commandService;
        this._environmentService = _environmentService;
        this._extensionHostKind = extHostContext.extensionHostKind;
        const internalExtHostContext = extHostContext;
        this._internalExtensionService = internalExtHostContext.internalExtensionService;
        internalExtHostContext._setExtensionHostProxy(new ExtensionHostProxy(extHostContext.getProxy(ExtHostContext.ExtHostExtensionService)));
        internalExtHostContext._setAllMainProxyIdentifiers(Object.keys(MainContext).map((key) => MainContext[key]));
    }
    dispose() { }
    $getExtension(extensionId) {
        return this._extensionService.getExtension(extensionId);
    }
    $activateExtension(extensionId, reason) {
        return this._internalExtensionService._activateById(extensionId, reason);
    }
    async $onWillActivateExtension(extensionId) {
        this._internalExtensionService._onWillActivateExtension(extensionId);
    }
    $onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) {
        this._internalExtensionService._onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason);
    }
    $onExtensionRuntimeError(extensionId, data) {
        const error = transformErrorFromSerialization(data);
        this._internalExtensionService._onExtensionRuntimeError(extensionId, error);
        console.error(`[${extensionId.value}]${error.message}`);
        console.error(error.stack);
    }
    async $onExtensionActivationError(extensionId, data, missingExtensionDependency) {
        const error = transformErrorFromSerialization(data);
        this._internalExtensionService._onDidActivateExtensionError(extensionId, error);
        if (missingExtensionDependency) {
            const extension = await this._extensionService.getExtension(extensionId.value);
            if (extension) {
                const local = await this._extensionsWorkbenchService.queryLocal();
                const installedDependency = local.find((i) => areSameExtensions(i.identifier, { id: missingExtensionDependency.dependency }));
                if (installedDependency?.local) {
                    await this._handleMissingInstalledDependency(extension, installedDependency.local);
                    return;
                }
                else {
                    await this._handleMissingNotInstalledDependency(extension, missingExtensionDependency.dependency);
                    return;
                }
            }
        }
        const isDev = !this._environmentService.isBuilt || this._environmentService.isExtensionDevelopment;
        if (isDev) {
            this._notificationService.error(error);
            return;
        }
        console.error(error.message);
    }
    async _handleMissingInstalledDependency(extension, missingInstalledDependency) {
        const extName = extension.displayName || extension.name;
        if (this._extensionEnablementService.isEnabled(missingInstalledDependency)) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('reload window', "Cannot activate the '{0}' extension because it depends on the '{1}' extension, which is not loaded. Would you like to reload the window to load the extension?", extName, missingInstalledDependency.manifest.displayName ||
                    missingInstalledDependency.manifest.name),
                actions: {
                    primary: [
                        new Action('reload', localize('reload', 'Reload Window'), '', true, () => this._hostService.reload()),
                    ],
                },
            });
        }
        else {
            const enablementState = this._extensionEnablementService.getEnablementState(missingInstalledDependency);
            if (enablementState === 5 /* EnablementState.DisabledByVirtualWorkspace */) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('notSupportedInWorkspace', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is not supported in the current workspace", extName, missingInstalledDependency.manifest.displayName ||
                        missingInstalledDependency.manifest.name),
                });
            }
            else if (enablementState === 0 /* EnablementState.DisabledByTrustRequirement */) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('restrictedMode', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is not supported in Restricted Mode", extName, missingInstalledDependency.manifest.displayName ||
                        missingInstalledDependency.manifest.name),
                    actions: {
                        primary: [
                            new Action('manageWorkspaceTrust', localize('manageWorkspaceTrust', 'Manage Workspace Trust'), '', true, () => this._commandService.executeCommand('workbench.trust.manage')),
                        ],
                    },
                });
            }
            else if (this._extensionEnablementService.canChangeEnablement(missingInstalledDependency)) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('disabledDep', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is disabled. Would you like to enable the extension and reload the window?", extName, missingInstalledDependency.manifest.displayName ||
                        missingInstalledDependency.manifest.name),
                    actions: {
                        primary: [
                            new Action('enable', localize('enable dep', 'Enable and Reload'), '', true, () => this._extensionEnablementService
                                .setEnablement([missingInstalledDependency], enablementState === 9 /* EnablementState.DisabledGlobally */
                                ? 11 /* EnablementState.EnabledGlobally */
                                : 12 /* EnablementState.EnabledWorkspace */)
                                .then(() => this._hostService.reload(), (e) => this._notificationService.error(e))),
                        ],
                    },
                });
            }
            else {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('disabledDepNoAction', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is disabled.", extName, missingInstalledDependency.manifest.displayName ||
                        missingInstalledDependency.manifest.name),
                });
            }
        }
    }
    async _handleMissingNotInstalledDependency(extension, missingDependency) {
        const extName = extension.displayName || extension.name;
        let dependencyExtension = null;
        try {
            dependencyExtension = (await this._extensionsWorkbenchService.getExtensions([{ id: missingDependency }], CancellationToken.None))[0];
        }
        catch (err) { }
        if (dependencyExtension) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('uninstalledDep', "Cannot activate the '{0}' extension because it depends on the '{1}' extension from '{2}', which is not installed. Would you like to install the extension and reload the window?", extName, dependencyExtension.displayName, dependencyExtension.publisherDisplayName),
                actions: {
                    primary: [
                        new Action('install', localize('install missing dep', 'Install and Reload'), '', true, () => this._extensionsWorkbenchService.install(dependencyExtension).then(() => this._hostService.reload(), (e) => this._notificationService.error(e))),
                    ],
                },
            });
        }
        else {
            this._notificationService.error(localize('unknownDep', "Cannot activate the '{0}' extension because it depends on an unknown '{1}' extension.", extName, missingDependency));
        }
    }
    async $setPerformanceMarks(marks) {
        if (this._extensionHostKind === 1 /* ExtensionHostKind.LocalProcess */) {
            this._timerService.setPerformanceMarks('localExtHost', marks);
        }
        else if (this._extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
            this._timerService.setPerformanceMarks('workerExtHost', marks);
        }
        else {
            this._timerService.setPerformanceMarks('remoteExtHost', marks);
        }
    }
    async $asBrowserUri(uri) {
        return FileAccess.uriToBrowserUri(URI.revive(uri));
    }
};
MainThreadExtensionService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadExtensionService),
    __param(1, IExtensionService),
    __param(2, INotificationService),
    __param(3, IExtensionsWorkbenchService),
    __param(4, IHostService),
    __param(5, IWorkbenchExtensionEnablementService),
    __param(6, ITimerService),
    __param(7, ICommandService),
    __param(8, IWorkbenchEnvironmentService)
], MainThreadExtensionService);
export { MainThreadExtensionService };
class ExtensionHostProxy {
    constructor(_actual) {
        this._actual = _actual;
    }
    async resolveAuthority(remoteAuthority, resolveAttempt) {
        const resolved = reviveResolveAuthorityResult(await this._actual.$resolveAuthority(remoteAuthority, resolveAttempt));
        return resolved;
    }
    async getCanonicalURI(remoteAuthority, uri) {
        const uriComponents = await this._actual.$getCanonicalURI(remoteAuthority, uri);
        return uriComponents ? URI.revive(uriComponents) : uriComponents;
    }
    startExtensionHost(extensionsDelta) {
        return this._actual.$startExtensionHost(extensionsDelta);
    }
    extensionTestsExecute() {
        return this._actual.$extensionTestsExecute();
    }
    activateByEvent(activationEvent, activationKind) {
        return this._actual.$activateByEvent(activationEvent, activationKind);
    }
    activate(extensionId, reason) {
        return this._actual.$activate(extensionId, reason);
    }
    setRemoteEnvironment(env) {
        return this._actual.$setRemoteEnvironment(env);
    }
    updateRemoteConnectionData(connectionData) {
        return this._actual.$updateRemoteConnectionData(connectionData);
    }
    deltaExtensions(extensionsDelta) {
        return this._actual.$deltaExtensions(extensionsDelta);
    }
    test_latency(n) {
        return this._actual.$test_latency(n);
    }
    test_up(b) {
        return this._actual.$test_up(b);
    }
    test_down(size) {
        return this._actual.$test_down(size);
    }
}
function reviveResolveAuthorityResult(result) {
    if (result.type === 'ok') {
        return {
            type: 'ok',
            value: {
                ...result.value,
                authority: reviveResolvedAuthority(result.value.authority),
            },
        };
    }
    else {
        return result;
    }
}
function reviveResolvedAuthority(resolvedAuthority) {
    return {
        ...resolvedAuthority,
        connectTo: reviveConnection(resolvedAuthority.connectTo),
    };
}
function reviveConnection(connection) {
    if (connection.type === 0 /* RemoteConnectionType.WebSocket */) {
        return new WebSocketRemoteConnection(connection.host, connection.port);
    }
    return new ManagedRemoteConnection(connection.id);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFtQiwrQkFBK0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFLM0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUVOLHVCQUF1QixFQUl2Qix5QkFBeUIsR0FDekIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sY0FBYyxFQUVkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFFTiwyQkFBMkIsR0FDM0IsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN0RyxPQUFPLEVBRU4sb0NBQW9DLEdBQ3BDLE1BQU0s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