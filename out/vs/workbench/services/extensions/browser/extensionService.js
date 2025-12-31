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
var BrowserExtensionHostKindPicker_1;
import { mainWindow } from '../../../../base/browser/window.js';
import { Schemas } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { getLogs } from '../../../../platform/log/browser/log.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IWebExtensionsScannerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService, } from '../../extensionManagement/common/extensionManagement.js';
import { WebWorkerExtensionHost, } from './webWorkerExtensionHost.js';
import { FetchFileSystemProvider } from './webWorkerFileSystemProvider.js';
import { AbstractExtensionService, LocalExtensions, RemoteExtensions, ResolverExtensions, checkEnabledAndProposedAPI, isResolverExtension, } from '../common/abstractExtensionService.js';
import { extensionHostKindToString, extensionRunningPreferenceToString, } from '../common/extensionHostKind.js';
import { IExtensionManifestPropertiesService } from '../common/extensionManifestPropertiesService.js';
import { filterExtensionDescriptions, } from '../common/extensionRunningLocationTracker.js';
import { ExtensionHostExtensions, IExtensionService, toExtensionDescription, } from '../common/extensions.js';
import { ExtensionsProposedApi } from '../common/extensionsProposedApi.js';
import { dedupExtensions } from '../common/extensionsUtil.js';
import { RemoteExtensionHost, } from '../common/remoteExtensionHost.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IRemoteExplorerService } from '../../remote/common/remoteExplorerService.js';
import { IUserDataInitializationService } from '../../userData/browser/userDataInit.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
let ExtensionService = class ExtensionService extends AbstractExtensionService {
    constructor(instantiationService, notificationService, _browserEnvironmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, _webExtensionsScannerService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, _userDataInitializationService, _userDataProfileService, _workspaceTrustManagementService, _remoteExplorerService, dialogService) {
        const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
        const extensionHostFactory = new BrowserExtensionHostFactory(extensionsProposedApi, () => this._scanWebExtensions(), () => this._getExtensionRegistrySnapshotWhenReady(), instantiationService, remoteAgentService, remoteAuthorityResolverService, extensionEnablementService, logService);
        super({ hasLocalProcess: false, allowRemoteExtensionsInLocalWebWorker: true }, extensionsProposedApi, extensionHostFactory, new BrowserExtensionHostKindPicker(logService), instantiationService, notificationService, _browserEnvironmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, dialogService);
        this._browserEnvironmentService = _browserEnvironmentService;
        this._webExtensionsScannerService = _webExtensionsScannerService;
        this._userDataInitializationService = _userDataInitializationService;
        this._userDataProfileService = _userDataProfileService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._remoteExplorerService = _remoteExplorerService;
        // Initialize installed extensions first and do it only after workbench is ready
        lifecycleService.when(2 /* LifecyclePhase.Ready */).then(async () => {
            await this._userDataInitializationService.initializeInstalledExtensions(this._instantiationService);
            this._initialize();
        });
        this._initFetchFileSystem();
    }
    _initFetchFileSystem() {
        const provider = new FetchFileSystemProvider();
        this._register(this._fileService.registerProvider(Schemas.http, provider));
        this._register(this._fileService.registerProvider(Schemas.https, provider));
    }
    async _scanWebExtensions() {
        if (!this._scanWebExtensionsPromise) {
            this._scanWebExtensionsPromise = (async () => {
                const system = [], user = [], development = [];
                try {
                    await Promise.all([
                        this._webExtensionsScannerService
                            .scanSystemExtensions()
                            .then((extensions) => system.push(...extensions.map((e) => toExtensionDescription(e)))),
                        this._webExtensionsScannerService
                            .scanUserExtensions(this._userDataProfileService.currentProfile.extensionsResource, {
                            skipInvalidExtensions: true,
                        })
                            .then((extensions) => user.push(...extensions.map((e) => toExtensionDescription(e)))),
                        this._webExtensionsScannerService
                            .scanExtensionsUnderDevelopment()
                            .then((extensions) => development.push(...extensions.map((e) => toExtensionDescription(e, true)))),
                    ]);
                }
                catch (error) {
                    this._logService.error(error);
                }
                return dedupExtensions(system, user, [], development, this._logService);
            })();
        }
        return this._scanWebExtensionsPromise;
    }
    async _resolveExtensionsDefault(emitter) {
        const [localExtensions, remoteExtensions] = await Promise.all([
            this._scanWebExtensions(),
            this._remoteExtensionsScannerService.scanExtensions(),
        ]);
        if (remoteExtensions.length) {
            emitter.emitOne(new RemoteExtensions(remoteExtensions));
        }
        emitter.emitOne(new LocalExtensions(localExtensions));
    }
    _resolveExtensions() {
        return new AsyncIterableObject((emitter) => this._doResolveExtensions(emitter));
    }
    async _doResolveExtensions(emitter) {
        if (!this._browserEnvironmentService.expectsResolverExtension) {
            return this._resolveExtensionsDefault(emitter);
        }
        const remoteAuthority = this._environmentService.remoteAuthority;
        // Now that the canonical URI provider has been registered, we need to wait for the trust state to be
        // calculated. The trust state will be used while resolving the authority, however the resolver can
        // override the trust state through the resolver result.
        await this._workspaceTrustManagementService.workspaceResolved;
        const localExtensions = await this._scanWebExtensions();
        const resolverExtensions = localExtensions.filter((extension) => isResolverExtension(extension));
        if (resolverExtensions.length) {
            emitter.emitOne(new ResolverExtensions(resolverExtensions));
        }
        let resolverResult;
        try {
            resolverResult = await this._resolveAuthorityInitial(remoteAuthority);
        }
        catch (err) {
            if (RemoteAuthorityResolverError.isHandled(err)) {
                console.log(`Error handled: Not showing a notification for the error`);
            }
            this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
            // Proceed with the local extension host
            return this._resolveExtensionsDefault(emitter);
        }
        // set the resolved authority
        this._remoteAuthorityResolverService._setResolvedAuthority(resolverResult.authority, resolverResult.options);
        this._remoteExplorerService.setTunnelInformation(resolverResult.tunnelInformation);
        // monitor for breakage
        const connection = this._remoteAgentService.getConnection();
        if (connection) {
            connection.onDidStateChange(async (e) => {
                if (e.type === 0 /* PersistentConnectionEventType.ConnectionLost */) {
                    this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
                }
            });
            connection.onReconnecting(() => this._resolveAuthorityAgain());
        }
        return this._resolveExtensionsDefault(emitter);
    }
    async _onExtensionHostExit(code) {
        // Dispose everything associated with the extension host
        await this._doStopExtensionHosts();
        // If we are running extension tests, forward logs and exit code
        const automatedWindow = mainWindow;
        if (typeof automatedWindow.codeAutomationExit === 'function') {
            automatedWindow.codeAutomationExit(code, await getLogs(this._fileService, this._environmentService));
        }
    }
    async _resolveAuthority(remoteAuthority) {
        return this._resolveAuthorityOnExtensionHosts(2 /* ExtensionHostKind.LocalWebWorker */, remoteAuthority);
    }
};
ExtensionService = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotificationService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, IWorkbenchExtensionEnablementService),
    __param(5, IFileService),
    __param(6, IProductService),
    __param(7, IWorkbenchExtensionManagementService),
    __param(8, IWorkspaceContextService),
    __param(9, IConfigurationService),
    __param(10, IExtensionManifestPropertiesService),
    __param(11, IWebExtensionsScannerService),
    __param(12, ILogService),
    __param(13, IRemoteAgentService),
    __param(14, IRemoteExtensionsScannerService),
    __param(15, ILifecycleService),
    __param(16, IRemoteAuthorityResolverService),
    __param(17, IUserDataInitializationService),
    __param(18, IUserDataProfileService),
    __param(19, IWorkspaceTrustManagementService),
    __param(20, IRemoteExplorerService),
    __param(21, IDialogService)
], ExtensionService);
export { ExtensionService };
let BrowserExtensionHostFactory = class BrowserExtensionHostFactory {
    constructor(_extensionsProposedApi, _scanWebExtensions, _getExtensionRegistrySnapshotWhenReady, _instantiationService, _remoteAgentService, _remoteAuthorityResolverService, _extensionEnablementService, _logService) {
        this._extensionsProposedApi = _extensionsProposedApi;
        this._scanWebExtensions = _scanWebExtensions;
        this._getExtensionRegistrySnapshotWhenReady = _getExtensionRegistrySnapshotWhenReady;
        this._instantiationService = _instantiationService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._extensionEnablementService = _extensionEnablementService;
        this._logService = _logService;
    }
    createExtensionHost(runningLocations, runningLocation, isInitialStart) {
        switch (runningLocation.kind) {
            case 1 /* ExtensionHostKind.LocalProcess */: {
                return null;
            }
            case 2 /* ExtensionHostKind.LocalWebWorker */: {
                const startup = isInitialStart
                    ? 2 /* ExtensionHostStartup.EagerManualStart */
                    : 1 /* ExtensionHostStartup.EagerAutoStart */;
                return this._instantiationService.createInstance(WebWorkerExtensionHost, runningLocation, startup, this._createLocalExtensionHostDataProvider(runningLocations, runningLocation, isInitialStart));
            }
            case 3 /* ExtensionHostKind.Remote */: {
                const remoteAgentConnection = this._remoteAgentService.getConnection();
                if (remoteAgentConnection) {
                    return this._instantiationService.createInstance(RemoteExtensionHost, runningLocation, this._createRemoteExtensionHostDataProvider(runningLocations, remoteAgentConnection.remoteAuthority));
                }
                return null;
            }
        }
    }
    _createLocalExtensionHostDataProvider(runningLocations, desiredRunningLocation, isInitialStart) {
        return {
            getInitData: async () => {
                if (isInitialStart) {
                    // Here we load even extensions that would be disabled by workspace trust
                    const localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, await this._scanWebExtensions(), 
                    /* ignore workspace trust */ true);
                    const runningLocation = runningLocations.computeRunningLocation(localExtensions, [], false);
                    const myExtensions = filterExtensionDescriptions(localExtensions, runningLocation, (extRunningLocation) => desiredRunningLocation.equals(extRunningLocation));
                    const extensions = new ExtensionHostExtensions(0, localExtensions, myExtensions.map((extension) => extension.identifier));
                    return { extensions };
                }
                else {
                    // restart case
                    const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                    const myExtensions = runningLocations.filterByRunningLocation(snapshot.extensions, desiredRunningLocation);
                    const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map((extension) => extension.identifier));
                    return { extensions };
                }
            },
        };
    }
    _createRemoteExtensionHostDataProvider(runningLocations, remoteAuthority) {
        return {
            remoteAuthority: remoteAuthority,
            getInitData: async () => {
                const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                const remoteEnv = await this._remoteAgentService.getEnvironment();
                if (!remoteEnv) {
                    throw new Error('Cannot provide init data for remote extension host!');
                }
                const myExtensions = runningLocations.filterByExtensionHostKind(snapshot.extensions, 3 /* ExtensionHostKind.Remote */);
                const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map((extension) => extension.identifier));
                return {
                    connectionData: this._remoteAuthorityResolverService.getConnectionData(remoteAuthority),
                    pid: remoteEnv.pid,
                    appRoot: remoteEnv.appRoot,
                    extensionHostLogsPath: remoteEnv.extensionHostLogsPath,
                    globalStorageHome: remoteEnv.globalStorageHome,
                    workspaceStorageHome: remoteEnv.workspaceStorageHome,
                    extensions,
                };
            },
        };
    }
};
BrowserExtensionHostFactory = __decorate([
    __param(3, IInstantiationService),
    __param(4, IRemoteAgentService),
    __param(5, IRemoteAuthorityResolverService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, ILogService)
], BrowserExtensionHostFactory);
let BrowserExtensionHostKindPicker = BrowserExtensionHostKindPicker_1 = class BrowserExtensionHostKindPicker {
    constructor(_logService) {
        this._logService = _logService;
    }
    pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
        const result = BrowserExtensionHostKindPicker_1.pickRunningLocation(extensionKinds, isInstalledLocally, isInstalledRemotely, preference);
        this._logService.trace(`pickRunningLocation for ${extensionId.value}, extension kinds: [${extensionKinds.join(', ')}], isInstalledLocally: ${isInstalledLocally}, isInstalledRemotely: ${isInstalledRemotely}, preference: ${extensionRunningPreferenceToString(preference)} => ${extensionHostKindToString(result)}`);
        return result;
    }
    static pickRunningLocation(extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
        const result = [];
        let canRunRemotely = false;
        for (const extensionKind of extensionKinds) {
            if (extensionKind === 'ui' && isInstalledRemotely) {
                // ui extensions run remotely if possible (but only as a last resort)
                if (preference === 2 /* ExtensionRunningPreference.Remote */) {
                    return 3 /* ExtensionHostKind.Remote */;
                }
                else {
                    canRunRemotely = true;
                }
            }
            if (extensionKind === 'workspace' && isInstalledRemotely) {
                // workspace extensions run remotely if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ ||
                    preference === 2 /* ExtensionRunningPreference.Remote */) {
                    return 3 /* ExtensionHostKind.Remote */;
                }
                else {
                    result.push(3 /* ExtensionHostKind.Remote */);
                }
            }
            if (extensionKind === 'web' && (isInstalledLocally || isInstalledRemotely)) {
                // web worker extensions run in the local web worker if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ ||
                    preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 2 /* ExtensionHostKind.LocalWebWorker */;
                }
                else {
                    result.push(2 /* ExtensionHostKind.LocalWebWorker */);
                }
            }
        }
        if (canRunRemotely) {
            result.push(3 /* ExtensionHostKind.Remote */);
        }
        return result.length > 0 ? result[0] : null;
    }
};
BrowserExtensionHostKindPicker = BrowserExtensionHostKindPicker_1 = __decorate([
    __param(0, ILogService)
], BrowserExtensionHostKindPicker);
export { BrowserExtensionHostKindPicker };
registerSingleton(IExtensionService, ExtensionService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFNL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQW9CLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFdkYsT0FBTyxFQUNOLCtCQUErQixFQUMvQiw0QkFBNEIsR0FFNUIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FB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