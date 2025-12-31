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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEV4dGVuc2lvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBbUIsK0JBQStCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRS9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBSzNHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFFTix1QkFBdUIsRUFJdkIseUJBQXlCLEdBQ3pCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBRU4sMkJBQTJCLEdBQzNCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdEcsT0FBTyxFQUVOLG9DQUFvQyxHQUNwQyxNQUFNLGtFQUFr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