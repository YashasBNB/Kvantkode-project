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
var NativeExtensionHostKindPicker_1;
import { runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Schemas } from '../../../../base/common/network.js';
import * as performance from '../../../../base/common/performance.js';
import { isCI } from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, getRemoteAuthorityPrefix, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { getRemoteName, parseAuthorityWithPort, } from '../../../../platform/remote/common/remoteHosts.js';
import { updateProxyConfigurationsScope } from '../../../../platform/request/common/request.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService, } from '../../extensionManagement/common/extensionManagement.js';
import { WebWorkerExtensionHost, } from '../browser/webWorkerExtensionHost.js';
import { AbstractExtensionService, ExtensionHostCrashTracker, LocalExtensions, RemoteExtensions, ResolverExtensions, checkEnabledAndProposedAPI, extensionIsEnabled, isResolverExtension, } from '../common/abstractExtensionService.js';
import { parseExtensionDevOptions } from '../common/extensionDevOptions.js';
import { extensionHostKindToString, extensionRunningPreferenceToString, } from '../common/extensionHostKind.js';
import { IExtensionManifestPropertiesService } from '../common/extensionManifestPropertiesService.js';
import { filterExtensionDescriptions, } from '../common/extensionRunningLocationTracker.js';
import { ExtensionHostExtensions, IExtensionService, toExtension, webWorkerExtHostConfig, } from '../common/extensions.js';
import { ExtensionsProposedApi } from '../common/extensionsProposedApi.js';
import { RemoteExtensionHost, } from '../common/remoteExtensionHost.js';
import { CachedExtensionScanner } from './cachedExtensionScanner.js';
import { NativeLocalProcessExtensionHost, } from './localProcessExtensionHost.js';
import { IHostService } from '../../host/browser/host.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IRemoteExplorerService } from '../../remote/common/remoteExplorerService.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
let NativeExtensionService = class NativeExtensionService extends AbstractExtensionService {
    constructor(instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, _nativeHostService, _hostService, _remoteExplorerService, _extensionGalleryService, _workspaceTrustManagementService, dialogService) {
        const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
        const extensionScanner = instantiationService.createInstance(CachedExtensionScanner);
        const extensionHostFactory = new NativeExtensionHostFactory(extensionsProposedApi, extensionScanner, () => this._getExtensionRegistrySnapshotWhenReady(), instantiationService, environmentService, extensionEnablementService, configurationService, remoteAgentService, remoteAuthorityResolverService, logService);
        super({ hasLocalProcess: true, allowRemoteExtensionsInLocalWebWorker: false }, extensionsProposedApi, extensionHostFactory, new NativeExtensionHostKindPicker(environmentService, configurationService, logService), instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, dialogService);
        this._nativeHostService = _nativeHostService;
        this._hostService = _hostService;
        this._remoteExplorerService = _remoteExplorerService;
        this._extensionGalleryService = _extensionGalleryService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._localCrashTracker = new ExtensionHostCrashTracker();
        this._extensionScanner = extensionScanner;
        // delay extension host creation and extension scanning
        // until the workbench is running. we cannot defer the
        // extension host more (LifecyclePhase.Restored) because
        // some editors require the extension host to restore
        // and this would result in a deadlock
        // see https://github.com/microsoft/vscode/issues/41322
        lifecycleService.when(2 /* LifecyclePhase.Ready */).then(() => {
            // reschedule to ensure this runs after restoring viewlets, panels, and editors
            runWhenWindowIdle(mainWindow, () => {
                this._initialize();
            }, 50 /*max delay*/);
        });
    }
    async _scanAllLocalExtensions() {
        return this._extensionScanner.scannedExtensions;
    }
    _onExtensionHostCrashed(extensionHost, code, signal) {
        const activatedExtensions = [];
        const extensionsStatus = this.getExtensionsStatus();
        for (const key of Object.keys(extensionsStatus)) {
            const extensionStatus = extensionsStatus[key];
            if (extensionStatus.activationStarted &&
                extensionHost.containsExtension(extensionStatus.id)) {
                activatedExtensions.push(extensionStatus.id);
            }
        }
        super._onExtensionHostCrashed(extensionHost, code, signal);
        if (extensionHost.kind === 1 /* ExtensionHostKind.LocalProcess */) {
            if (code === 55 /* ExtensionHostExitCode.VersionMismatch */) {
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.versionMismatchCrash', 'Extension host cannot start: version mismatch.'), [
                    {
                        label: nls.localize('relaunch', 'Relaunch VS Code'),
                        run: () => {
                            this._instantiationService.invokeFunction((accessor) => {
                                const hostService = accessor.get(IHostService);
                                hostService.restart();
                            });
                        },
                    },
                ]);
                return;
            }
            this._logExtensionHostCrash(extensionHost);
            this._sendExtensionHostCrashTelemetry(code, signal, activatedExtensions);
            this._localCrashTracker.registerCrash();
            if (this._localCrashTracker.shouldAutomaticallyRestart()) {
                this._logService.info(`Automatically restarting the extension host.`);
                this._notificationService.status(nls.localize('extensionService.autoRestart', 'The extension host terminated unexpectedly. Restarting...'), { hideAfter: 5000 });
                this.startExtensionHosts();
            }
            else {
                const choices = [];
                if (this._environmentService.isBuilt) {
                    choices.push({
                        label: nls.localize('startBisect', 'Start Extension Bisect'),
                        run: () => {
                            this._instantiationService.invokeFunction((accessor) => {
                                const commandService = accessor.get(ICommandService);
                                commandService.executeCommand('extension.bisect.start');
                            });
                        },
                    });
                }
                else {
                    choices.push({
                        label: nls.localize('devTools', 'Open Developer Tools'),
                        run: () => this._nativeHostService.openDevTools(),
                    });
                }
                choices.push({
                    label: nls.localize('restart', 'Restart Extension Host'),
                    run: () => this.startExtensionHosts(),
                });
                if (this._environmentService.isBuilt) {
                    choices.push({
                        label: nls.localize('learnMore', 'Learn More'),
                        run: () => {
                            this._instantiationService.invokeFunction((accessor) => {
                                const openerService = accessor.get(IOpenerService);
                                openerService.open('https://aka.ms/vscode-extension-bisect');
                            });
                        },
                    });
                }
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash', 'Extension host terminated unexpectedly 3 times within the last 5 minutes.'), choices);
            }
        }
    }
    _sendExtensionHostCrashTelemetry(code, signal, activatedExtensions) {
        this._telemetryService.publicLog2('extensionHostCrash', {
            code,
            signal,
            extensionIds: activatedExtensions.map((e) => e.value),
        });
        for (const extensionId of activatedExtensions) {
            this._telemetryService.publicLog2('extensionHostCrashExtension', {
                code,
                signal,
                extensionId: extensionId.value,
            });
        }
    }
    // --- impl
    async _resolveAuthority(remoteAuthority) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            // This authority does not need to be resolved, simply parse the port number
            const { host, port } = parseAuthorityWithPort(remoteAuthority);
            return {
                authority: {
                    authority: remoteAuthority,
                    connectTo: {
                        type: 0 /* RemoteConnectionType.WebSocket */,
                        host,
                        port,
                    },
                    connectionToken: undefined,
                },
            };
        }
        return this._resolveAuthorityOnExtensionHosts(1 /* ExtensionHostKind.LocalProcess */, remoteAuthority);
    }
    async _getCanonicalURI(remoteAuthority, uri) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            // This authority does not use a resolver
            return uri;
        }
        const localProcessExtensionHosts = this._getExtensionHostManagers(1 /* ExtensionHostKind.LocalProcess */);
        if (localProcessExtensionHosts.length === 0) {
            // no local process extension hosts
            throw new Error(`Cannot resolve canonical URI`);
        }
        const results = await Promise.all(localProcessExtensionHosts.map((extHost) => extHost.getCanonicalURI(remoteAuthority, uri)));
        for (const result of results) {
            if (result) {
                return result;
            }
        }
        // we can only reach this if there was no resolver extension that can return the cannonical uri
        throw new Error(`Cannot get canonical URI because no extension is installed to resolve ${getRemoteAuthorityPrefix(remoteAuthority)}`);
    }
    _resolveExtensions() {
        return new AsyncIterableObject((emitter) => this._doResolveExtensions(emitter));
    }
    async _doResolveExtensions(emitter) {
        this._extensionScanner.startScanningExtensions();
        const remoteAuthority = this._environmentService.remoteAuthority;
        let remoteEnv = null;
        let remoteExtensions = [];
        if (remoteAuthority) {
            this._remoteAuthorityResolverService._setCanonicalURIProvider(async (uri) => {
                if (uri.scheme !== Schemas.vscodeRemote || uri.authority !== remoteAuthority) {
                    // The current remote authority resolver cannot give the canonical URI for this URI
                    return uri;
                }
                performance.mark(`code/willGetCanonicalURI/${getRemoteAuthorityPrefix(remoteAuthority)}`);
                if (isCI) {
                    this._logService.info(`Invoking getCanonicalURI for authority ${getRemoteAuthorityPrefix(remoteAuthority)}...`);
                }
                try {
                    return this._getCanonicalURI(remoteAuthority, uri);
                }
                finally {
                    performance.mark(`code/didGetCanonicalURI/${getRemoteAuthorityPrefix(remoteAuthority)}`);
                    if (isCI) {
                        this._logService.info(`getCanonicalURI returned for authority ${getRemoteAuthorityPrefix(remoteAuthority)}.`);
                    }
                }
            });
            if (isCI) {
                this._logService.info(`Starting to wait on IWorkspaceTrustManagementService.workspaceResolved...`);
            }
            // Now that the canonical URI provider has been registered, we need to wait for the trust state to be
            // calculated. The trust state will be used while resolving the authority, however the resolver can
            // override the trust state through the resolver result.
            await this._workspaceTrustManagementService.workspaceResolved;
            if (isCI) {
                this._logService.info(`Finished waiting on IWorkspaceTrustManagementService.workspaceResolved.`);
            }
            const localExtensions = await this._scanAllLocalExtensions();
            const resolverExtensions = localExtensions.filter((extension) => isResolverExtension(extension));
            if (resolverExtensions.length) {
                emitter.emitOne(new ResolverExtensions(resolverExtensions));
            }
            let resolverResult;
            try {
                resolverResult = await this._resolveAuthorityInitial(remoteAuthority);
            }
            catch (err) {
                if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
                    err.isHandled = await this._handleNoResolverFound(remoteAuthority);
                }
                else {
                    if (RemoteAuthorityResolverError.isHandled(err)) {
                        console.log(`Error handled: Not showing a notification for the error`);
                    }
                }
                this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
                // Proceed with the local extension host
                return this._startLocalExtensionHost(emitter);
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
            // fetch the remote environment
            ;
            [remoteEnv, remoteExtensions] = await Promise.all([
                this._remoteAgentService.getEnvironment(),
                this._remoteExtensionsScannerService.scanExtensions(),
            ]);
            if (!remoteEnv) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: nls.localize('getEnvironmentFailure', 'Could not fetch remote environment'),
                });
                // Proceed with the local extension host
                return this._startLocalExtensionHost(emitter);
            }
            const useHostProxyDefault = remoteEnv.useHostProxy;
            this._register(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('http.useLocalProxyConfiguration')) {
                    updateProxyConfigurationsScope(this._configurationService.getValue('http.useLocalProxyConfiguration'), useHostProxyDefault);
                }
            }));
            updateProxyConfigurationsScope(this._configurationService.getValue('http.useLocalProxyConfiguration'), useHostProxyDefault);
        }
        else {
            this._remoteAuthorityResolverService._setCanonicalURIProvider(async (uri) => uri);
        }
        return this._startLocalExtensionHost(emitter, remoteExtensions);
    }
    async _startLocalExtensionHost(emitter, remoteExtensions = []) {
        // Ensure that the workspace trust state has been fully initialized so
        // that the extension host can start with the correct set of extensions.
        await this._workspaceTrustManagementService.workspaceTrustInitialized;
        if (remoteExtensions.length) {
            emitter.emitOne(new RemoteExtensions(remoteExtensions));
        }
        emitter.emitOne(new LocalExtensions(await this._scanAllLocalExtensions()));
    }
    async _onExtensionHostExit(code) {
        // Dispose everything associated with the extension host
        await this._doStopExtensionHosts();
        // Dispose the management connection to avoid reconnecting after the extension host exits
        const connection = this._remoteAgentService.getConnection();
        connection?.dispose();
        if (parseExtensionDevOptions(this._environmentService).isExtensionDevTestFromCli) {
            // When CLI testing make sure to exit with proper exit code
            if (isCI) {
                this._logService.info(`Asking native host service to exit with code ${code}.`);
            }
            this._nativeHostService.exit(code);
        }
        else {
            // Expected development extension termination: When the extension host goes down we also shutdown the window
            this._nativeHostService.closeWindow();
        }
    }
    async _handleNoResolverFound(remoteAuthority) {
        const remoteName = getRemoteName(remoteAuthority);
        const recommendation = this._productService.remoteExtensionTips?.[remoteName];
        if (!recommendation) {
            return false;
        }
        const resolverExtensionId = recommendation.extensionId;
        const allExtensions = await this._scanAllLocalExtensions();
        const extension = allExtensions.filter((e) => e.identifier.value === resolverExtensionId)[0];
        if (extension) {
            if (!extensionIsEnabled(this._logService, this._extensionEnablementService, extension, false)) {
                const message = nls.localize('enableResolver', "Extension '{0}' is required to open the remote window.\nOK to enable?", recommendation.friendlyName);
                this._notificationService.prompt(Severity.Info, message, [
                    {
                        label: nls.localize('enable', 'Enable and Reload'),
                        run: async () => {
                            await this._extensionEnablementService.setEnablement([toExtension(extension)], 11 /* EnablementState.EnabledGlobally */);
                            await this._hostService.reload();
                        },
                    },
                ], {
                    sticky: true,
                    priority: NotificationPriority.URGENT,
                });
            }
        }
        else {
            // Install the Extension and reload the window to handle.
            const message = nls.localize('installResolver', "Extension '{0}' is required to open the remote window.\nDo you want to install the extension?", recommendation.friendlyName);
            this._notificationService.prompt(Severity.Info, message, [
                {
                    label: nls.localize('install', 'Install and Reload'),
                    run: async () => {
                        const [galleryExtension] = await this._extensionGalleryService.getExtensions([{ id: resolverExtensionId }], CancellationToken.None);
                        if (galleryExtension) {
                            await this._extensionManagementService.installFromGallery(galleryExtension);
                            await this._hostService.reload();
                        }
                        else {
                            this._notificationService.error(nls.localize('resolverExtensionNotFound', '`{0}` not found on marketplace'));
                        }
                    },
                },
            ], {
                sticky: true,
                priority: NotificationPriority.URGENT,
            });
        }
        return true;
    }
};
NativeExtensionService = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotificationService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, IWorkbenchExtensionEnablementService),
    __param(5, IFileService),
    __param(6, IProductService),
    __param(7, IWorkbenchExtensionManagementService),
    __param(8, IWorkspaceContextService),
    __param(9, IConfigurationService),
    __param(10, IExtensionManifestPropertiesService),
    __param(11, ILogService),
    __param(12, IRemoteAgentService),
    __param(13, IRemoteExtensionsScannerService),
    __param(14, ILifecycleService),
    __param(15, IRemoteAuthorityResolverService),
    __param(16, INativeHostService),
    __param(17, IHostService),
    __param(18, IRemoteExplorerService),
    __param(19, IExtensionGalleryService),
    __param(20, IWorkspaceTrustManagementService),
    __param(21, IDialogService)
], NativeExtensionService);
export { NativeExtensionService };
let NativeExtensionHostFactory = class NativeExtensionHostFactory {
    constructor(_extensionsProposedApi, _extensionScanner, _getExtensionRegistrySnapshotWhenReady, _instantiationService, environmentService, _extensionEnablementService, configurationService, _remoteAgentService, _remoteAuthorityResolverService, _logService) {
        this._extensionsProposedApi = _extensionsProposedApi;
        this._extensionScanner = _extensionScanner;
        this._getExtensionRegistrySnapshotWhenReady = _getExtensionRegistrySnapshotWhenReady;
        this._instantiationService = _instantiationService;
        this._extensionEnablementService = _extensionEnablementService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._logService = _logService;
        this._webWorkerExtHostEnablement = determineLocalWebWorkerExtHostEnablement(environmentService, configurationService);
    }
    createExtensionHost(runningLocations, runningLocation, isInitialStart) {
        switch (runningLocation.kind) {
            case 1 /* ExtensionHostKind.LocalProcess */: {
                const startup = isInitialStart
                    ? 2 /* ExtensionHostStartup.EagerManualStart */
                    : 1 /* ExtensionHostStartup.EagerAutoStart */;
                return this._instantiationService.createInstance(NativeLocalProcessExtensionHost, runningLocation, startup, this._createLocalProcessExtensionHostDataProvider(runningLocations, isInitialStart, runningLocation));
            }
            case 2 /* ExtensionHostKind.LocalWebWorker */: {
                if (this._webWorkerExtHostEnablement !== 0 /* LocalWebWorkerExtHostEnablement.Disabled */) {
                    const startup = isInitialStart
                        ? this._webWorkerExtHostEnablement === 2 /* LocalWebWorkerExtHostEnablement.Lazy */
                            ? 3 /* ExtensionHostStartup.Lazy */
                            : 2 /* ExtensionHostStartup.EagerManualStart */
                        : 1 /* ExtensionHostStartup.EagerAutoStart */;
                    return this._instantiationService.createInstance(WebWorkerExtensionHost, runningLocation, startup, this._createWebWorkerExtensionHostDataProvider(runningLocations, runningLocation));
                }
                return null;
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
    _createLocalProcessExtensionHostDataProvider(runningLocations, isInitialStart, desiredRunningLocation) {
        return {
            getInitData: async () => {
                if (isInitialStart) {
                    // Here we load even extensions that would be disabled by workspace trust
                    const scannedExtensions = await this._extensionScanner.scannedExtensions;
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.scannedExtensions: ${scannedExtensions.map((ext) => ext.identifier.value).join(',')}`);
                    }
                    const localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, scannedExtensions, 
                    /* ignore workspace trust */ true);
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.localExtensions: ${localExtensions.map((ext) => ext.identifier.value).join(',')}`);
                    }
                    const runningLocation = runningLocations.computeRunningLocation(localExtensions, [], false);
                    const myExtensions = filterExtensionDescriptions(localExtensions, runningLocation, (extRunningLocation) => desiredRunningLocation.equals(extRunningLocation));
                    const extensions = new ExtensionHostExtensions(0, localExtensions, myExtensions.map((extension) => extension.identifier));
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.myExtensions: ${myExtensions.map((ext) => ext.identifier.value).join(',')}`);
                    }
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
    _createWebWorkerExtensionHostDataProvider(runningLocations, desiredRunningLocation) {
        return {
            getInitData: async () => {
                const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                const myExtensions = runningLocations.filterByRunningLocation(snapshot.extensions, desiredRunningLocation);
                const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map((extension) => extension.identifier));
                return { extensions };
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
NativeExtensionHostFactory = __decorate([
    __param(3, IInstantiationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IWorkbenchExtensionEnablementService),
    __param(6, IConfigurationService),
    __param(7, IRemoteAgentService),
    __param(8, IRemoteAuthorityResolverService),
    __param(9, ILogService)
], NativeExtensionHostFactory);
function determineLocalWebWorkerExtHostEnablement(environmentService, configurationService) {
    if (environmentService.isExtensionDevelopment &&
        environmentService.extensionDevelopmentKind?.some((k) => k === 'web')) {
        return 1 /* LocalWebWorkerExtHostEnablement.Eager */;
    }
    else {
        const config = configurationService.getValue(webWorkerExtHostConfig);
        if (config === true) {
            return 1 /* LocalWebWorkerExtHostEnablement.Eager */;
        }
        else if (config === 'auto') {
            return 2 /* LocalWebWorkerExtHostEnablement.Lazy */;
        }
        else {
            return 0 /* LocalWebWorkerExtHostEnablement.Disabled */;
        }
    }
}
var LocalWebWorkerExtHostEnablement;
(function (LocalWebWorkerExtHostEnablement) {
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Disabled"] = 0] = "Disabled";
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Eager"] = 1] = "Eager";
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Lazy"] = 2] = "Lazy";
})(LocalWebWorkerExtHostEnablement || (LocalWebWorkerExtHostEnablement = {}));
let NativeExtensionHostKindPicker = NativeExtensionHostKindPicker_1 = class NativeExtensionHostKindPicker {
    constructor(environmentService, configurationService, _logService) {
        this._logService = _logService;
        this._hasRemoteExtHost = Boolean(environmentService.remoteAuthority);
        const webWorkerExtHostEnablement = determineLocalWebWorkerExtHostEnablement(environmentService, configurationService);
        this._hasWebWorkerExtHost =
            webWorkerExtHostEnablement !== 0 /* LocalWebWorkerExtHostEnablement.Disabled */;
    }
    pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
        const result = NativeExtensionHostKindPicker_1.pickExtensionHostKind(extensionKinds, isInstalledLocally, isInstalledRemotely, preference, this._hasRemoteExtHost, this._hasWebWorkerExtHost);
        this._logService.trace(`pickRunningLocation for ${extensionId.value}, extension kinds: [${extensionKinds.join(', ')}], isInstalledLocally: ${isInstalledLocally}, isInstalledRemotely: ${isInstalledRemotely}, preference: ${extensionRunningPreferenceToString(preference)} => ${extensionHostKindToString(result)}`);
        return result;
    }
    static pickExtensionHostKind(extensionKinds, isInstalledLocally, isInstalledRemotely, preference, hasRemoteExtHost, hasWebWorkerExtHost) {
        const result = [];
        for (const extensionKind of extensionKinds) {
            if (extensionKind === 'ui' && isInstalledLocally) {
                // ui extensions run locally if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ ||
                    preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 1 /* ExtensionHostKind.LocalProcess */;
                }
                else {
                    result.push(1 /* ExtensionHostKind.LocalProcess */);
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
            if (extensionKind === 'workspace' && !hasRemoteExtHost) {
                // workspace extensions also run locally if there is no remote
                if (preference === 0 /* ExtensionRunningPreference.None */ ||
                    preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 1 /* ExtensionHostKind.LocalProcess */;
                }
                else {
                    result.push(1 /* ExtensionHostKind.LocalProcess */);
                }
            }
            if (extensionKind === 'web' && isInstalledLocally && hasWebWorkerExtHost) {
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
        return result.length > 0 ? result[0] : null;
    }
};
NativeExtensionHostKindPicker = NativeExtensionHostKindPicker_1 = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], NativeExtensionHostKindPicker);
export { NativeExtensionHostKindPicker };
class RestartExtensionHostAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.restartExtensionHost',
            title: nls.localize2('restartExtensionHost', 'Restart Extension Host'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const stopped = await extensionService.stopExtensionHosts(nls.localize('restartExtensionHost.reason', 'An explicit request'));
        if (stopped) {
            extensionService.startExtensionHosts();
        }
    }
}
registerAction2(RestartExtensionHostAction);
registerSingleton(IExtensionService, NativeExtensionService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRXh0ZW5zaW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlRXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssV0FBVyxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUxRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFLakgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FB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