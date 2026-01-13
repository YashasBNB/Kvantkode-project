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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQU0vRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBb0IsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUV2RixPQUFPLEVBQ04sK0JBQStCLEVBQy9CLDRCQUE0QixHQUU1QixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQy9HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx3QkFB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