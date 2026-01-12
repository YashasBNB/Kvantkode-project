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
var AbstractExtensionService_1;
import { Barrier } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as perf from '../../../../base/common/performance.js';
import { isCI } from '../../../../base/common/platform.js';
import { isEqualOrParent } from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { isDefined } from '../../../../base/common/types.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ImplicitActivationEvents } from '../../../../platform/extensionManagement/common/implicitActivationEvents.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, } from '../../../../platform/extensions/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { handleVetos } from '../../../../platform/lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { Extensions as ExtensionFeaturesExtensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService, } from '../../extensionManagement/common/extensionManagement.js';
import { LockableExtensionDescriptionRegistry, } from './extensionDescriptionRegistry.js';
import { parseExtensionDevOptions } from './extensionDevOptions.js';
import { ExtensionHostManager } from './extensionHostManager.js';
import { IExtensionManifestPropertiesService } from './extensionManifestPropertiesService.js';
import { LocalProcessRunningLocation, LocalWebWorkerRunningLocation, RemoteRunningLocation, } from './extensionRunningLocation.js';
import { ExtensionRunningLocationTracker, filterExtensionIdentifiers, } from './extensionRunningLocationTracker.js';
import { ActivationTimes, ExtensionPointContribution, toExtension, toExtensionDescription, } from './extensions.js';
import { ExtensionMessageCollector, ExtensionsRegistry, } from './extensionsRegistry.js';
import { LazyCreateExtensionHostManager } from './lazyCreateExtensionHostManager.js';
import { checkActivateWorkspaceContainsExtension, checkGlobFileExists, } from './workspaceContains.js';
import { ILifecycleService, WillShutdownJoinerOrder } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService, } from '../../remote/common/remoteAgentService.js';
const hasOwnProperty = Object.hasOwnProperty;
const NO_OP_VOID_PROMISE = Promise.resolve(undefined);
let AbstractExtensionService = AbstractExtensionService_1 = class AbstractExtensionService extends Disposable {
    constructor(options, _extensionsProposedApi, _extensionHostFactory, _extensionHostKindPicker, _instantiationService, _notificationService, _environmentService, _telemetryService, _extensionEnablementService, _fileService, _productService, _extensionManagementService, _contextService, _configurationService, _extensionManifestPropertiesService, _logService, _remoteAgentService, _remoteExtensionsScannerService, _lifecycleService, _remoteAuthorityResolverService, _dialogService) {
        super();
        this._extensionsProposedApi = _extensionsProposedApi;
        this._extensionHostFactory = _extensionHostFactory;
        this._extensionHostKindPicker = _extensionHostKindPicker;
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this._extensionEnablementService = _extensionEnablementService;
        this._fileService = _fileService;
        this._productService = _productService;
        this._extensionManagementService = _extensionManagementService;
        this._contextService = _contextService;
        this._configurationService = _configurationService;
        this._extensionManifestPropertiesService = _extensionManifestPropertiesService;
        this._logService = _logService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteExtensionsScannerService = _remoteExtensionsScannerService;
        this._lifecycleService = _lifecycleService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._dialogService = _dialogService;
        this._onDidRegisterExtensions = this._register(new Emitter());
        this.onDidRegisterExtensions = this._onDidRegisterExtensions.event;
        this._onDidChangeExtensionsStatus = this._register(new Emitter());
        this.onDidChangeExtensionsStatus = this._onDidChangeExtensionsStatus.event;
        this._onDidChangeExtensions = this._register(new Emitter({ leakWarningThreshold: 400 }));
        this.onDidChangeExtensions = this._onDidChangeExtensions.event;
        this._onWillActivateByEvent = this._register(new Emitter());
        this.onWillActivateByEvent = this._onWillActivateByEvent.event;
        this._onDidChangeResponsiveChange = this._register(new Emitter());
        this.onDidChangeResponsiveChange = this._onDidChangeResponsiveChange.event;
        this._onWillStop = this._register(new Emitter());
        this.onWillStop = this._onWillStop.event;
        this._activationEventReader = new ImplicitActivationAwareReader();
        this._registry = new LockableExtensionDescriptionRegistry(this._activationEventReader);
        this._installedExtensionsReady = new Barrier();
        this._extensionStatus = new ExtensionIdentifierMap();
        this._allRequestedActivateEvents = new Set();
        this._remoteCrashTracker = new ExtensionHostCrashTracker();
        this._deltaExtensionsQueue = [];
        this._inHandleDeltaExtensions = false;
        this._extensionHostManagers = this._register(new ExtensionHostCollection());
        this._resolveAuthorityAttempt = 0;
        this._hasLocalProcess = options.hasLocalProcess;
        this._allowRemoteExtensionsInLocalWebWorker = options.allowRemoteExtensionsInLocalWebWorker;
        // help the file service to activate providers by activating extensions by file system event
        this._register(this._fileService.onWillActivateFileSystemProvider((e) => {
            if (e.scheme !== Schemas.vscodeRemote) {
                e.join(this.activateByEvent(`onFileSystem:${e.scheme}`));
            }
        }));
        this._runningLocations = new ExtensionRunningLocationTracker(this._registry, this._extensionHostKindPicker, this._environmentService, this._configurationService, this._logService, this._extensionManifestPropertiesService);
        this._register(this._extensionEnablementService.onEnablementChanged((extensions) => {
            const toAdd = [];
            const toRemove = [];
            for (const extension of extensions) {
                if (this._safeInvokeIsEnabled(extension)) {
                    // an extension has been enabled
                    toAdd.push(extension);
                }
                else {
                    // an extension has been disabled
                    toRemove.push(extension);
                }
            }
            if (isCI) {
                this._logService.info(`AbstractExtensionService.onEnablementChanged fired for ${extensions.map((e) => e.identifier.id).join(', ')}`);
            }
            this._handleDeltaExtensions(new DeltaExtensionsQueueItem(toAdd, toRemove));
        }));
        this._register(this._extensionManagementService.onDidChangeProfile(({ added, removed }) => {
            if (added.length || removed.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidChangeProfile fired`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(added, removed));
            }
        }));
        this._register(this._extensionManagementService.onDidEnableExtensions((extensions) => {
            if (extensions.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidEnableExtensions fired`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(extensions, []));
            }
        }));
        this._register(this._extensionManagementService.onDidInstallExtensions((result) => {
            const extensions = [];
            for (const { local, operation } of result) {
                if (local &&
                    local.isValid &&
                    operation !== 4 /* InstallOperation.Migrate */ &&
                    this._safeInvokeIsEnabled(local)) {
                    extensions.push(local);
                }
            }
            if (extensions.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidInstallExtensions fired for ${extensions.map((e) => e.identifier.id).join(', ')}`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(extensions, []));
            }
        }));
        this._register(this._extensionManagementService.onDidUninstallExtension((event) => {
            if (!event.error) {
                // an extension has been uninstalled
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidUninstallExtension fired for ${event.identifier.id}`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem([], [event.identifier.id]));
            }
        }));
        this._register(this._lifecycleService.onWillShutdown((event) => {
            if (this._remoteAgentService.getConnection()) {
                event.join(async () => {
                    // We need to disconnect the management connection before killing the local extension host.
                    // Otherwise, the local extension host might terminate the underlying tunnel before the
                    // management connection has a chance to send its disconnection message.
                    try {
                        await this._remoteAgentService.endConnection();
                        await this._doStopExtensionHosts();
                        this._remoteAgentService.getConnection()?.dispose();
                    }
                    catch {
                        this._logService.warn('Error while disconnecting remote agent');
                    }
                }, {
                    id: 'join.disconnectRemote',
                    label: nls.localize('disconnectRemote', 'Disconnect Remote Agent'),
                    order: WillShutdownJoinerOrder.Last, // after others have joined that might depend on a remote connection
                });
            }
            else {
                event.join(this._doStopExtensionHosts(), {
                    id: 'join.stopExtensionHosts',
                    label: nls.localize('stopExtensionHosts', 'Stopping Extension Hosts'),
                });
            }
        }));
    }
    _getExtensionHostManagers(kind) {
        return this._extensionHostManagers.getByKind(kind);
    }
    //#region deltaExtensions
    async _handleDeltaExtensions(item) {
        this._deltaExtensionsQueue.push(item);
        if (this._inHandleDeltaExtensions) {
            // Let the current item finish, the new one will be picked up
            return;
        }
        let lock = null;
        try {
            this._inHandleDeltaExtensions = true;
            // wait for _initialize to finish before hanlding any delta extension events
            await this._installedExtensionsReady.wait();
            lock = await this._registry.acquireLock('handleDeltaExtensions');
            while (this._deltaExtensionsQueue.length > 0) {
                const item = this._deltaExtensionsQueue.shift();
                await this._deltaExtensions(lock, item.toAdd, item.toRemove);
            }
        }
        finally {
            this._inHandleDeltaExtensions = false;
            lock?.dispose();
        }
    }
    async _deltaExtensions(lock, _toAdd, _toRemove) {
        if (isCI) {
            this._logService.info(`AbstractExtensionService._deltaExtensions: toAdd: [${_toAdd.map((e) => e.identifier.id).join(',')}] toRemove: [${_toRemove.map((e) => (typeof e === 'string' ? e : e.identifier.id)).join(',')}]`);
        }
        let toRemove = [];
        for (let i = 0, len = _toRemove.length; i < len; i++) {
            const extensionOrId = _toRemove[i];
            const extensionId = typeof extensionOrId === 'string' ? extensionOrId : extensionOrId.identifier.id;
            const extension = typeof extensionOrId === 'string' ? null : extensionOrId;
            const extensionDescription = this._registry.getExtensionDescription(extensionId);
            if (!extensionDescription) {
                // ignore disabling/uninstalling an extension which is not running
                continue;
            }
            if (extension &&
                extensionDescription.extensionLocation.scheme !== extension.location.scheme) {
                // this event is for a different extension than mine (maybe for the local extension, while I have the remote extension)
                continue;
            }
            if (!this.canRemoveExtension(extensionDescription)) {
                // uses non-dynamic extension point or is activated
                continue;
            }
            toRemove.push(extensionDescription);
        }
        const toAdd = [];
        for (let i = 0, len = _toAdd.length; i < len; i++) {
            const extension = _toAdd[i];
            const extensionDescription = toExtensionDescription(extension, false);
            if (!extensionDescription) {
                // could not scan extension...
                continue;
            }
            if (!this._canAddExtension(extensionDescription, toRemove)) {
                continue;
            }
            toAdd.push(extensionDescription);
        }
        if (toAdd.length === 0 && toRemove.length === 0) {
            return;
        }
        // Update the local registry
        const result = this._registry.deltaExtensions(lock, toAdd, toRemove.map((e) => e.identifier));
        this._onDidChangeExtensions.fire({ added: toAdd, removed: toRemove });
        toRemove = toRemove.concat(result.removedDueToLooping);
        if (result.removedDueToLooping.length > 0) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: nls.localize('looping', 'The following extensions contain dependency loops and have been disabled: {0}', result.removedDueToLooping.map((e) => `'${e.identifier.value}'`).join(', ')),
            });
        }
        // enable or disable proposed API per extension
        this._extensionsProposedApi.updateEnabledApiProposals(toAdd);
        // Update extension points
        this._doHandleExtensionPoints([].concat(toAdd).concat(toRemove), false);
        // Update the extension host
        await this._updateExtensionsOnExtHosts(result.versionId, toAdd, toRemove.map((e) => e.identifier));
        for (let i = 0; i < toAdd.length; i++) {
            this._activateAddedExtensionIfNeeded(toAdd[i]);
        }
    }
    async _updateExtensionsOnExtHosts(versionId, toAdd, toRemove) {
        const removedRunningLocation = this._runningLocations.deltaExtensions(toAdd, toRemove);
        const promises = this._extensionHostManagers.map((extHostManager) => this._updateExtensionsOnExtHost(extHostManager, versionId, toAdd, toRemove, removedRunningLocation));
        await Promise.all(promises);
    }
    async _updateExtensionsOnExtHost(extensionHostManager, versionId, toAdd, toRemove, removedRunningLocation) {
        const myToAdd = this._runningLocations.filterByExtensionHostManager(toAdd, extensionHostManager);
        const myToRemove = filterExtensionIdentifiers(toRemove, removedRunningLocation, (extRunningLocation) => extensionHostManager.representsRunningLocation(extRunningLocation));
        const addActivationEvents = ImplicitActivationEvents.createActivationEventsMap(toAdd);
        if (isCI) {
            const printExtIds = (extensions) => extensions.map((e) => e.identifier.value).join(',');
            const printIds = (extensions) => extensions.map((e) => e.value).join(',');
            this._logService.info(`AbstractExtensionService: Calling deltaExtensions: toRemove: [${printIds(toRemove)}], toAdd: [${printExtIds(toAdd)}], myToRemove: [${printIds(myToRemove)}], myToAdd: [${printExtIds(myToAdd)}],`);
        }
        await extensionHostManager.deltaExtensions({
            versionId,
            toRemove,
            toAdd,
            addActivationEvents,
            myToRemove,
            myToAdd: myToAdd.map((extension) => extension.identifier),
        });
    }
    canAddExtension(extension) {
        return this._canAddExtension(extension, []);
    }
    _canAddExtension(extension, extensionsBeingRemoved) {
        // (Also check for renamed extensions)
        const existing = this._registry.getExtensionDescriptionByIdOrUUID(extension.identifier, extension.id);
        if (existing) {
            // This extension is already known (most likely at a different version)
            // so it cannot be added again unless it is removed first
            const isBeingRemoved = extensionsBeingRemoved.some((extensionDescription) => ExtensionIdentifier.equals(extension.identifier, extensionDescription.identifier));
            if (!isBeingRemoved) {
                return false;
            }
        }
        const extensionKinds = this._runningLocations.readExtensionKinds(extension);
        const isRemote = extension.extensionLocation.scheme === Schemas.vscodeRemote;
        const extensionHostKind = this._extensionHostKindPicker.pickExtensionHostKind(extension.identifier, extensionKinds, !isRemote, isRemote, 0 /* ExtensionRunningPreference.None */);
        if (extensionHostKind === null) {
            return false;
        }
        return true;
    }
    canRemoveExtension(extension) {
        const extensionDescription = this._registry.getExtensionDescription(extension.identifier);
        if (!extensionDescription) {
            // Can't remove an extension that is unknown!
            return false;
        }
        if (this._extensionStatus.get(extensionDescription.identifier)?.activationStarted) {
            // Extension is running, cannot remove it safely
            return false;
        }
        return true;
    }
    async _activateAddedExtensionIfNeeded(extensionDescription) {
        let shouldActivate = false;
        let shouldActivateReason = null;
        let hasWorkspaceContains = false;
        const activationEvents = this._activationEventReader.readActivationEvents(extensionDescription);
        for (const activationEvent of activationEvents) {
            if (this._allRequestedActivateEvents.has(activationEvent)) {
                // This activation event was fired before the extension was added
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
            if (activationEvent === '*') {
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
            if (/^workspaceContains/.test(activationEvent)) {
                hasWorkspaceContains = true;
            }
            if (activationEvent === 'onStartupFinished') {
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
        }
        if (shouldActivate) {
            await Promise.all(this._extensionHostManagers.map((extHostManager) => extHostManager.activate(extensionDescription.identifier, {
                startup: false,
                extensionId: extensionDescription.identifier,
                activationEvent: shouldActivateReason,
            }))).then(() => { });
        }
        else if (hasWorkspaceContains) {
            const workspace = await this._contextService.getCompleteWorkspace();
            const forceUsingSearch = !!this._environmentService.remoteAuthority;
            const host = {
                logService: this._logService,
                folders: workspace.folders.map((folder) => folder.uri),
                forceUsingSearch: forceUsingSearch,
                exists: (uri) => this._fileService.exists(uri),
                checkExists: (folders, includes, token) => this._instantiationService.invokeFunction((accessor) => checkGlobFileExists(accessor, folders, includes, token)),
            };
            const result = await checkActivateWorkspaceContainsExtension(host, extensionDescription);
            if (!result) {
                return;
            }
            await Promise.all(this._extensionHostManagers.map((extHostManager) => extHostManager.activate(extensionDescription.identifier, {
                startup: false,
                extensionId: extensionDescription.identifier,
                activationEvent: result.activationEvent,
            }))).then(() => { });
        }
    }
    //#endregion
    async _initialize() {
        perf.mark('code/willLoadExtensions');
        this._startExtensionHostsIfNecessary(true, []);
        const lock = await this._registry.acquireLock('_initialize');
        try {
            await this._resolveAndProcessExtensions(lock);
            // Start extension hosts which are not automatically started
            const snapshot = this._registry.getSnapshot();
            for (const extHostManager of this._extensionHostManagers) {
                if (extHostManager.startup !== 1 /* ExtensionHostStartup.EagerAutoStart */) {
                    const extensions = this._runningLocations.filterByExtensionHostManager(snapshot.extensions, extHostManager);
                    extHostManager.start(snapshot.versionId, snapshot.extensions, extensions.map((extension) => extension.identifier));
                }
            }
        }
        finally {
            lock.dispose();
        }
        this._releaseBarrier();
        perf.mark('code/didLoadExtensions');
        await this._handleExtensionTests();
    }
    async _resolveAndProcessExtensions(lock) {
        let resolverExtensions = [];
        let localExtensions = [];
        let remoteExtensions = [];
        for await (const extensions of this._resolveExtensions()) {
            if (extensions instanceof ResolverExtensions) {
                resolverExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
                this._registry.deltaExtensions(lock, resolverExtensions, []);
                this._doHandleExtensionPoints(resolverExtensions, true);
            }
            if (extensions instanceof LocalExtensions) {
                localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
            }
            if (extensions instanceof RemoteExtensions) {
                remoteExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
            }
        }
        // `initializeRunningLocation` will look at the complete picture (e.g. an extension installed on both sides),
        // takes care of duplicates and picks a running location for each extension
        this._runningLocations.initializeRunningLocation(localExtensions, remoteExtensions);
        this._startExtensionHostsIfNecessary(true, []);
        // Some remote extensions could run locally in the web worker, so store them
        const remoteExtensionsThatNeedToRunLocally = this._allowRemoteExtensionsInLocalWebWorker
            ? this._runningLocations.filterByExtensionHostKind(remoteExtensions, 2 /* ExtensionHostKind.LocalWebWorker */)
            : [];
        const localProcessExtensions = this._hasLocalProcess
            ? this._runningLocations.filterByExtensionHostKind(localExtensions, 1 /* ExtensionHostKind.LocalProcess */)
            : [];
        const localWebWorkerExtensions = this._runningLocations.filterByExtensionHostKind(localExtensions, 2 /* ExtensionHostKind.LocalWebWorker */);
        remoteExtensions = this._runningLocations.filterByExtensionHostKind(remoteExtensions, 3 /* ExtensionHostKind.Remote */);
        // Add locally the remote extensions that need to run locally in the web worker
        for (const ext of remoteExtensionsThatNeedToRunLocally) {
            if (!includes(localWebWorkerExtensions, ext.identifier)) {
                localWebWorkerExtensions.push(ext);
            }
        }
        const allExtensions = remoteExtensions
            .concat(localProcessExtensions)
            .concat(localWebWorkerExtensions);
        let toAdd = allExtensions;
        if (resolverExtensions.length) {
            // Add extensions that are not registered as resolvers but are in the final resolved set
            toAdd = allExtensions.filter((extension) => !resolverExtensions.some((e) => ExtensionIdentifier.equals(e.identifier, extension.identifier) &&
                e.extensionLocation.toString() === extension.extensionLocation.toString()));
            // Remove extensions that are registered as resolvers but are not in the final resolved set
            if (allExtensions.length < toAdd.length + resolverExtensions.length) {
                const toRemove = resolverExtensions.filter((registered) => !allExtensions.some((e) => ExtensionIdentifier.equals(e.identifier, registered.identifier) &&
                    e.extensionLocation.toString() === registered.extensionLocation.toString()));
                if (toRemove.length) {
                    this._registry.deltaExtensions(lock, [], toRemove.map((e) => e.identifier));
                    this._doHandleExtensionPoints(toRemove, true);
                }
            }
        }
        const result = this._registry.deltaExtensions(lock, toAdd, []);
        if (result.removedDueToLooping.length > 0) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: nls.localize('looping', 'The following extensions contain dependency loops and have been disabled: {0}', result.removedDueToLooping.map((e) => `'${e.identifier.value}'`).join(', ')),
            });
        }
        this._doHandleExtensionPoints(this._registry.getAllExtensionDescriptions(), false);
    }
    async _handleExtensionTests() {
        if (!this._environmentService.isExtensionDevelopment ||
            !this._environmentService.extensionTestsLocationURI) {
            return;
        }
        const extensionHostManager = this.findTestExtensionHost(this._environmentService.extensionTestsLocationURI);
        if (!extensionHostManager) {
            const msg = nls.localize('extensionTestError', 'No extension host found that can launch the test runner at {0}.', this._environmentService.extensionTestsLocationURI.toString());
            console.error(msg);
            this._notificationService.error(msg);
            return;
        }
        let exitCode;
        try {
            exitCode = await extensionHostManager.extensionTestsExecute();
            if (isCI) {
                this._logService.info(`Extension host test runner exit code: ${exitCode}`);
            }
        }
        catch (err) {
            if (isCI) {
                this._logService.error(`Extension host test runner error`, err);
            }
            console.error(err);
            exitCode = 1; /* ERROR */
        }
        this._onExtensionHostExit(exitCode);
    }
    findTestExtensionHost(testLocation) {
        let runningLocation = null;
        for (const extension of this._registry.getAllExtensionDescriptions()) {
            if (isEqualOrParent(testLocation, extension.extensionLocation)) {
                runningLocation = this._runningLocations.getRunningLocation(extension.identifier);
                break;
            }
        }
        if (runningLocation === null) {
            // not sure if we should support that, but it was possible to have an test outside an extension
            if (testLocation.scheme === Schemas.vscodeRemote) {
                runningLocation = new RemoteRunningLocation();
            }
            else {
                // When a debugger attaches to the extension host, it will surface all console.log messages from the extension host,
                // but not necessarily from the window. So it would be best if any errors get printed to the console of the extension host.
                // That is why here we use the local process extension host even for non-file URIs
                runningLocation = new LocalProcessRunningLocation(0);
            }
        }
        if (runningLocation !== null) {
            return this._extensionHostManagers.getByRunningLocation(runningLocation);
        }
        return null;
    }
    _releaseBarrier() {
        this._installedExtensionsReady.open();
        this._onDidRegisterExtensions.fire(undefined);
        this._onDidChangeExtensionsStatus.fire(this._registry.getAllExtensionDescriptions().map((e) => e.identifier));
    }
    //#region remote authority resolving
    async _resolveAuthorityInitial(remoteAuthority) {
        const MAX_ATTEMPTS = 5;
        for (let attempt = 1;; attempt++) {
            try {
                return this._resolveAuthorityWithLogging(remoteAuthority);
            }
            catch (err) {
                if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
                    // There is no point in retrying if there is no resolver found
                    throw err;
                }
                if (RemoteAuthorityResolverError.isNotAvailable(err)) {
                    // The resolver is not available and asked us to not retry
                    throw err;
                }
                if (attempt >= MAX_ATTEMPTS) {
                    // Too many failed attempts, give up
                    throw err;
                }
            }
        }
    }
    async _resolveAuthorityAgain() {
        const remoteAuthority = this._environmentService.remoteAuthority;
        if (!remoteAuthority) {
            return;
        }
        this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
        try {
            const result = await this._resolveAuthorityWithLogging(remoteAuthority);
            this._remoteAuthorityResolverService._setResolvedAuthority(result.authority, result.options);
        }
        catch (err) {
            this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
        }
    }
    async _resolveAuthorityWithLogging(remoteAuthority) {
        const authorityPrefix = getRemoteAuthorityPrefix(remoteAuthority);
        const sw = StopWatch.create(false);
        this._logService.info(`Invoking resolveAuthority(${authorityPrefix})...`);
        try {
            perf.mark(`code/willResolveAuthority/${authorityPrefix}`);
            const result = await this._resolveAuthority(remoteAuthority);
            perf.mark(`code/didResolveAuthorityOK/${authorityPrefix}`);
            this._logService.info(`resolveAuthority(${authorityPrefix}) returned '${result.authority.connectTo}' after ${sw.elapsed()} ms`);
            return result;
        }
        catch (err) {
            perf.mark(`code/didResolveAuthorityError/${authorityPrefix}`);
            this._logService.error(`resolveAuthority(${authorityPrefix}) returned an error after ${sw.elapsed()} ms`, err);
            throw err;
        }
    }
    async _resolveAuthorityOnExtensionHosts(kind, remoteAuthority) {
        const extensionHosts = this._getExtensionHostManagers(kind);
        if (extensionHosts.length === 0) {
            // no local process extension hosts
            throw new Error(`Cannot resolve authority`);
        }
        this._resolveAuthorityAttempt++;
        const results = await Promise.all(extensionHosts.map((extHost) => extHost.resolveAuthority(remoteAuthority, this._resolveAuthorityAttempt)));
        let bestErrorResult = null;
        for (const result of results) {
            if (result.type === 'ok') {
                return result.value;
            }
            if (!bestErrorResult) {
                bestErrorResult = result;
                continue;
            }
            const bestErrorIsUnknown = bestErrorResult.error.code === RemoteAuthorityResolverErrorCode.Unknown;
            const errorIsUnknown = result.error.code === RemoteAuthorityResolverErrorCode.Unknown;
            if (bestErrorIsUnknown && !errorIsUnknown) {
                bestErrorResult = result;
            }
        }
        // we can only reach this if there is an error
        throw new RemoteAuthorityResolverError(bestErrorResult.error.message, bestErrorResult.error.code, bestErrorResult.error.detail);
    }
    //#endregion
    //#region Stopping / Starting / Restarting
    stopExtensionHosts(reason, auto) {
        return this._doStopExtensionHostsWithVeto(reason, auto);
    }
    async _doStopExtensionHosts() {
        const previouslyActivatedExtensionIds = [];
        for (const extensionStatus of this._extensionStatus.values()) {
            if (extensionStatus.activationStarted) {
                previouslyActivatedExtensionIds.push(extensionStatus.id);
            }
        }
        await this._extensionHostManagers.stopAllInReverse();
        for (const extensionStatus of this._extensionStatus.values()) {
            extensionStatus.clearRuntimeStatus();
        }
        if (previouslyActivatedExtensionIds.length > 0) {
            this._onDidChangeExtensionsStatus.fire(previouslyActivatedExtensionIds);
        }
    }
    async _doStopExtensionHostsWithVeto(reason, auto = false) {
        if (auto && this._environmentService.isExtensionDevelopment) {
            return false;
        }
        const vetos = [];
        const vetoReasons = new Set();
        this._onWillStop.fire({
            reason,
            auto,
            veto(value, reason) {
                vetos.push(value);
                if (typeof value === 'boolean') {
                    if (value === true) {
                        vetoReasons.add(reason);
                    }
                }
                else {
                    value
                        .then((value) => {
                        if (value) {
                            vetoReasons.add(reason);
                        }
                    })
                        .catch((error) => {
                        vetoReasons.add(nls.localize('extensionStopVetoError', '{0} (Error: {1})', reason, toErrorMessage(error)));
                    });
                }
            },
        });
        const veto = await handleVetos(vetos, (error) => this._logService.error(error));
        if (!veto) {
            await this._doStopExtensionHosts();
        }
        else {
            if (!auto) {
                const vetoReasonsArray = Array.from(vetoReasons);
                this._logService.warn(`Extension host was not stopped because of veto (stop reason: ${reason}, veto reason: ${vetoReasonsArray.join(', ')})`);
                const { confirmed } = await this._dialogService.confirm({
                    type: Severity.Warning,
                    message: nls.localize('extensionStopVetoMessage', 'Please confirm restart of extensions.'),
                    detail: vetoReasonsArray.length === 1 ? vetoReasonsArray[0] : vetoReasonsArray.join('\n -'),
                    primaryButton: nls.localize('proceedAnyways', 'Restart Anyway'),
                });
                if (confirmed) {
                    return true;
                }
            }
        }
        return !veto;
    }
    _startExtensionHostsIfNecessary(isInitialStart, initialActivationEvents) {
        const locations = [];
        for (let affinity = 0; affinity <= this._runningLocations.maxLocalProcessAffinity; affinity++) {
            locations.push(new LocalProcessRunningLocation(affinity));
        }
        for (let affinity = 0; affinity <= this._runningLocations.maxLocalWebWorkerAffinity; affinity++) {
            locations.push(new LocalWebWorkerRunningLocation(affinity));
        }
        locations.push(new RemoteRunningLocation());
        for (const location of locations) {
            if (this._extensionHostManagers.getByRunningLocation(location)) {
                // already running
                continue;
            }
            const res = this._createExtensionHostManager(location, isInitialStart, initialActivationEvents);
            if (res) {
                const [extHostManager, disposableStore] = res;
                this._extensionHostManagers.add(extHostManager, disposableStore);
            }
        }
    }
    _createExtensionHostManager(runningLocation, isInitialStart, initialActivationEvents) {
        const extensionHost = this._extensionHostFactory.createExtensionHost(this._runningLocations, runningLocation, isInitialStart);
        if (!extensionHost) {
            return null;
        }
        const processManager = this._doCreateExtensionHostManager(extensionHost, initialActivationEvents);
        const disposableStore = new DisposableStore();
        disposableStore.add(processManager.onDidExit(([code, signal]) => this._onExtensionHostCrashOrExit(processManager, code, signal)));
        disposableStore.add(processManager.onDidChangeResponsiveState((responsiveState) => {
            this._logService.info(`Extension host (${processManager.friendyName}) is ${responsiveState === 0 /* ResponsiveState.Responsive */ ? 'responsive' : 'unresponsive'}.`);
            this._onDidChangeResponsiveChange.fire({
                extensionHostKind: processManager.kind,
                isResponsive: responsiveState === 0 /* ResponsiveState.Responsive */,
                getInspectListener: (tryEnableInspector) => {
                    return processManager.getInspectPort(tryEnableInspector);
                },
            });
        }));
        return [processManager, disposableStore];
    }
    _doCreateExtensionHostManager(extensionHost, initialActivationEvents) {
        const internalExtensionService = this._acquireInternalAPI(extensionHost);
        if (extensionHost.startup === 3 /* ExtensionHostStartup.Lazy */ &&
            initialActivationEvents.length === 0) {
            return this._instantiationService.createInstance(LazyCreateExtensionHostManager, extensionHost, internalExtensionService);
        }
        return this._instantiationService.createInstance(ExtensionHostManager, extensionHost, initialActivationEvents, internalExtensionService);
    }
    _onExtensionHostCrashOrExit(extensionHost, code, signal) {
        // Unexpected termination
        const isExtensionDevHost = parseExtensionDevOptions(this._environmentService).isExtensionDevHost;
        if (!isExtensionDevHost) {
            this._onExtensionHostCrashed(extensionHost, code, signal);
            return;
        }
        this._onExtensionHostExit(code);
    }
    _onExtensionHostCrashed(extensionHost, code, signal) {
        console.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. Code: ${code}, Signal: ${signal}`);
        if (extensionHost.kind === 1 /* ExtensionHostKind.LocalProcess */) {
            this._doStopExtensionHosts();
        }
        else if (extensionHost.kind === 3 /* ExtensionHostKind.Remote */) {
            if (signal) {
                this._onRemoteExtensionHostCrashed(extensionHost, signal);
            }
            this._extensionHostManagers.stopOne(extensionHost);
        }
    }
    _getExtensionHostExitInfoWithTimeout(reconnectionToken) {
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                reject(new Error('getExtensionHostExitInfo timed out'));
            }, 2000);
            this._remoteAgentService.getExtensionHostExitInfo(reconnectionToken).then((r) => {
                clearTimeout(timeoutHandle);
                resolve(r);
            }, reject);
        });
    }
    async _onRemoteExtensionHostCrashed(extensionHost, reconnectionToken) {
        try {
            const info = await this._getExtensionHostExitInfoWithTimeout(reconnectionToken);
            if (info) {
                this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly with code ${info.code}.`);
            }
            this._logExtensionHostCrash(extensionHost);
            this._remoteCrashTracker.registerCrash();
            if (this._remoteCrashTracker.shouldAutomaticallyRestart()) {
                this._logService.info(`Automatically restarting the remote extension host.`);
                this._notificationService.status(nls.localize('extensionService.autoRestart', 'The remote extension host terminated unexpectedly. Restarting...'), { hideAfter: 5000 });
                this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
            }
            else {
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash', 'Remote Extension host terminated unexpectedly 3 times within the last 5 minutes.'), [
                    {
                        label: nls.localize('restart', 'Restart Remote Extension Host'),
                        run: () => {
                            this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
                        },
                    },
                ]);
            }
        }
        catch (err) {
            // maybe this wasn't an extension host crash and it was a permanent disconnection
        }
    }
    _logExtensionHostCrash(extensionHost) {
        const activatedExtensions = [];
        for (const extensionStatus of this._extensionStatus.values()) {
            if (extensionStatus.activationStarted &&
                extensionHost.containsExtension(extensionStatus.id)) {
                activatedExtensions.push(extensionStatus.id);
            }
        }
        if (activatedExtensions.length > 0) {
            this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. The following extensions were running: ${activatedExtensions.map((id) => id.value).join(', ')}`);
        }
        else {
            this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. No extensions were activated.`);
        }
    }
    async startExtensionHosts(updates) {
        await this._doStopExtensionHosts();
        if (updates) {
            await this._handleDeltaExtensions(new DeltaExtensionsQueueItem(updates.toAdd, updates.toRemove));
        }
        const lock = await this._registry.acquireLock('startExtensionHosts');
        try {
            this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
            const localProcessExtensionHosts = this._getExtensionHostManagers(1 /* ExtensionHostKind.LocalProcess */);
            await Promise.all(localProcessExtensionHosts.map((extHost) => extHost.ready()));
        }
        finally {
            lock.dispose();
        }
    }
    //#endregion
    //#region IExtensionService
    activateByEvent(activationEvent, activationKind = 0 /* ActivationKind.Normal */) {
        if (this._installedExtensionsReady.isOpen()) {
            // Extensions have been scanned and interpreted
            // Record the fact that this activationEvent was requested (in case of a restart)
            this._allRequestedActivateEvents.add(activationEvent);
            if (!this._registry.containsActivationEvent(activationEvent)) {
                // There is no extension that is interested in this activation event
                return NO_OP_VOID_PROMISE;
            }
            return this._activateByEvent(activationEvent, activationKind);
        }
        else {
            // Extensions have not been scanned yet.
            // Record the fact that this activationEvent was requested (in case of a restart)
            this._allRequestedActivateEvents.add(activationEvent);
            if (activationKind === 1 /* ActivationKind.Immediate */) {
                // Do not wait for the normal start-up of the extension host(s)
                return this._activateByEvent(activationEvent, activationKind);
            }
            return this._installedExtensionsReady
                .wait()
                .then(() => this._activateByEvent(activationEvent, activationKind));
        }
    }
    _activateByEvent(activationEvent, activationKind) {
        const result = Promise.all(this._extensionHostManagers.map((extHostManager) => extHostManager.activateByEvent(activationEvent, activationKind))).then(() => { });
        this._onWillActivateByEvent.fire({
            event: activationEvent,
            activation: result,
        });
        return result;
    }
    activateById(extensionId, reason) {
        return this._activateById(extensionId, reason);
    }
    activationEventIsDone(activationEvent) {
        if (!this._installedExtensionsReady.isOpen()) {
            return false;
        }
        if (!this._registry.containsActivationEvent(activationEvent)) {
            // There is no extension that is interested in this activation event
            return true;
        }
        return this._extensionHostManagers.every((manager) => manager.activationEventIsDone(activationEvent));
    }
    whenInstalledExtensionsRegistered() {
        return this._installedExtensionsReady.wait();
    }
    get extensions() {
        return this._registry.getAllExtensionDescriptions();
    }
    _getExtensionRegistrySnapshotWhenReady() {
        return this._installedExtensionsReady.wait().then(() => this._registry.getSnapshot());
    }
    getExtension(id) {
        return this._installedExtensionsReady.wait().then(() => {
            return this._registry.getExtensionDescription(id);
        });
    }
    readExtensionPointContributions(extPoint) {
        return this._installedExtensionsReady.wait().then(() => {
            const availableExtensions = this._registry.getAllExtensionDescriptions();
            const result = [];
            for (const desc of availableExtensions) {
                if (desc.contributes && hasOwnProperty.call(desc.contributes, extPoint.name)) {
                    result.push(new ExtensionPointContribution(desc, desc.contributes[extPoint.name]));
                }
            }
            return result;
        });
    }
    getExtensionsStatus() {
        const result = Object.create(null);
        if (this._registry) {
            const extensions = this._registry.getAllExtensionDescriptions();
            for (const extension of extensions) {
                const extensionStatus = this._extensionStatus.get(extension.identifier);
                result[extension.identifier.value] = {
                    id: extension.identifier,
                    messages: extensionStatus?.messages ?? [],
                    activationStarted: extensionStatus?.activationStarted ?? false,
                    activationTimes: extensionStatus?.activationTimes ?? undefined,
                    runtimeErrors: extensionStatus?.runtimeErrors ?? [],
                    runningLocation: this._runningLocations.getRunningLocation(extension.identifier),
                };
            }
        }
        return result;
    }
    async getInspectPorts(extensionHostKind, tryEnableInspector) {
        const result = await Promise.all(this._getExtensionHostManagers(extensionHostKind).map((extHost) => extHost.getInspectPort(tryEnableInspector)));
        // remove 0s:
        return result.filter(isDefined);
    }
    async setRemoteEnvironment(env) {
        await this._extensionHostManagers.map((manager) => manager.setRemoteEnvironment(env));
    }
    //#endregion
    // --- impl
    _safeInvokeIsEnabled(extension) {
        try {
            return this._extensionEnablementService.isEnabled(extension);
        }
        catch (err) {
            return false;
        }
    }
    _doHandleExtensionPoints(affectedExtensions, onlyResolverExtensionPoints) {
        const affectedExtensionPoints = Object.create(null);
        for (const extensionDescription of affectedExtensions) {
            if (extensionDescription.contributes) {
                for (const extPointName in extensionDescription.contributes) {
                    if (hasOwnProperty.call(extensionDescription.contributes, extPointName)) {
                        affectedExtensionPoints[extPointName] = true;
                    }
                }
            }
        }
        const messageHandler = (msg) => this._handleExtensionPointMessage(msg);
        const availableExtensions = this._registry.getAllExtensionDescriptions();
        const extensionPoints = ExtensionsRegistry.getExtensionPoints();
        perf.mark(onlyResolverExtensionPoints
            ? 'code/willHandleResolverExtensionPoints'
            : 'code/willHandleExtensionPoints');
        for (const extensionPoint of extensionPoints) {
            if (affectedExtensionPoints[extensionPoint.name] &&
                (!onlyResolverExtensionPoints || extensionPoint.canHandleResolver)) {
                perf.mark(`code/willHandleExtensionPoint/${extensionPoint.name}`);
                AbstractExtensionService_1._handleExtensionPoint(extensionPoint, availableExtensions, messageHandler);
                perf.mark(`code/didHandleExtensionPoint/${extensionPoint.name}`);
            }
        }
        perf.mark(onlyResolverExtensionPoints
            ? 'code/didHandleResolverExtensionPoints'
            : 'code/didHandleExtensionPoints');
    }
    _getOrCreateExtensionStatus(extensionId) {
        if (!this._extensionStatus.has(extensionId)) {
            this._extensionStatus.set(extensionId, new ExtensionStatus(extensionId));
        }
        return this._extensionStatus.get(extensionId);
    }
    _handleExtensionPointMessage(msg) {
        const extensionStatus = this._getOrCreateExtensionStatus(msg.extensionId);
        extensionStatus.addMessage(msg);
        const extension = this._registry.getExtensionDescription(msg.extensionId);
        const strMsg = `[${msg.extensionId.value}]: ${msg.message}`;
        if (msg.type === Severity.Error) {
            if (extension && extension.isUnderDevelopment) {
                // This message is about the extension currently being developed
                this._notificationService.notify({ severity: Severity.Error, message: strMsg });
            }
            this._logService.error(strMsg);
        }
        else if (msg.type === Severity.Warning) {
            if (extension && extension.isUnderDevelopment) {
                // This message is about the extension currently being developed
                this._notificationService.notify({ severity: Severity.Warning, message: strMsg });
            }
            this._logService.warn(strMsg);
        }
        else {
            this._logService.info(strMsg);
        }
        if (msg.extensionId &&
            this._environmentService.isBuilt &&
            !this._environmentService.isExtensionDevelopment) {
            const { type, extensionId, extensionPointId, message } = msg;
            this._telemetryService.publicLog2('extensionsMessage', {
                type,
                extensionId: extensionId.value,
                extensionPointId,
                message,
            });
        }
    }
    static _handleExtensionPoint(extensionPoint, availableExtensions, messageHandler) {
        const users = [];
        for (const desc of availableExtensions) {
            if (desc.contributes && hasOwnProperty.call(desc.contributes, extensionPoint.name)) {
                users.push({
                    description: desc,
                    value: desc.contributes[extensionPoint.name],
                    collector: new ExtensionMessageCollector(messageHandler, desc, extensionPoint.name),
                });
            }
        }
        extensionPoint.acceptUsers(users);
    }
    //#region Called by extension host
    _acquireInternalAPI(extensionHost) {
        return {
            _activateById: (extensionId, reason) => {
                return this._activateById(extensionId, reason);
            },
            _onWillActivateExtension: (extensionId) => {
                return this._onWillActivateExtension(extensionId, extensionHost.runningLocation);
            },
            _onDidActivateExtension: (extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) => {
                return this._onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason);
            },
            _onDidActivateExtensionError: (extensionId, error) => {
                return this._onDidActivateExtensionError(extensionId, error);
            },
            _onExtensionRuntimeError: (extensionId, err) => {
                return this._onExtensionRuntimeError(extensionId, err);
            },
        };
    }
    async _activateById(extensionId, reason) {
        const results = await Promise.all(this._extensionHostManagers.map((manager) => manager.activate(extensionId, reason)));
        const activated = results.some((e) => e);
        if (!activated) {
            throw new Error(`Unknown extension ${extensionId.value}`);
        }
    }
    _onWillActivateExtension(extensionId, runningLocation) {
        this._runningLocations.set(extensionId, runningLocation);
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.onWillActivate();
    }
    _onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) {
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.setActivationTimes(new ActivationTimes(codeLoadingTime, activateCallTime, activateResolvedTime, activationReason));
        this._onDidChangeExtensionsStatus.fire([extensionId]);
    }
    _onDidActivateExtensionError(extensionId, error) {
        this._telemetryService.publicLog2('extensionActivationError', {
            extensionId: extensionId.value,
            error: error.message,
        });
    }
    _onExtensionRuntimeError(extensionId, err) {
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.addRuntimeError(err);
        this._onDidChangeExtensionsStatus.fire([extensionId]);
    }
};
AbstractExtensionService = AbstractExtensionService_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, INotificationService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, ITelemetryService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IFileService),
    __param(10, IProductService),
    __param(11, IWorkbenchExtensionManagementService),
    __param(12, IWorkspaceContextService),
    __param(13, IConfigurationService),
    __param(14, IExtensionManifestPropertiesService),
    __param(15, ILogService),
    __param(16, IRemoteAgentService),
    __param(17, IRemoteExtensionsScannerService),
    __param(18, ILifecycleService),
    __param(19, IRemoteAuthorityResolverService),
    __param(20, IDialogService)
], AbstractExtensionService);
export { AbstractExtensionService };
class ExtensionHostCollection extends Disposable {
    constructor() {
        super(...arguments);
        this._extensionHostManagers = [];
    }
    dispose() {
        for (let i = this._extensionHostManagers.length - 1; i >= 0; i--) {
            const manager = this._extensionHostManagers[i];
            manager.extensionHost.disconnect();
            manager.dispose();
        }
        this._extensionHostManagers = [];
        super.dispose();
    }
    add(extensionHostManager, disposableStore) {
        this._extensionHostManagers.push(new ExtensionHostManagerData(extensionHostManager, disposableStore));
    }
    async stopAllInReverse() {
        // See https://github.com/microsoft/vscode/issues/152204
        // Dispose extension hosts in reverse creation order because the local extension host
        // might be critical in sustaining a connection to the remote extension host
        for (let i = this._extensionHostManagers.length - 1; i >= 0; i--) {
            const manager = this._extensionHostManagers[i];
            await manager.extensionHost.disconnect();
            manager.dispose();
        }
        this._extensionHostManagers = [];
    }
    async stopOne(extensionHostManager) {
        const index = this._extensionHostManagers.findIndex((el) => el.extensionHost === extensionHostManager);
        if (index >= 0) {
            this._extensionHostManagers.splice(index, 1);
            await extensionHostManager.disconnect();
            extensionHostManager.dispose();
        }
    }
    getByKind(kind) {
        return this.filter((el) => el.kind === kind);
    }
    getByRunningLocation(runningLocation) {
        for (const el of this._extensionHostManagers) {
            if (el.extensionHost.representsRunningLocation(runningLocation)) {
                return el.extensionHost;
            }
        }
        return null;
    }
    *[Symbol.iterator]() {
        for (const extensionHostManager of this._extensionHostManagers) {
            yield extensionHostManager.extensionHost;
        }
    }
    map(callback) {
        return this._extensionHostManagers.map((el) => callback(el.extensionHost));
    }
    every(callback) {
        return this._extensionHostManagers.every((el) => callback(el.extensionHost));
    }
    filter(callback) {
        return this._extensionHostManagers
            .filter((el) => callback(el.extensionHost))
            .map((el) => el.extensionHost);
    }
}
class ExtensionHostManagerData {
    constructor(extensionHost, disposableStore) {
        this.extensionHost = extensionHost;
        this.disposableStore = disposableStore;
    }
    dispose() {
        this.disposableStore.dispose();
        this.extensionHost.dispose();
    }
}
export class ResolverExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
export class LocalExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
export class RemoteExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
class DeltaExtensionsQueueItem {
    constructor(toAdd, toRemove) {
        this.toAdd = toAdd;
        this.toRemove = toRemove;
    }
}
export function isResolverExtension(extension) {
    return !!extension.activationEvents?.some((activationEvent) => activationEvent.startsWith('onResolveRemoteAuthority:'));
}
/**
 * @argument extensions The extensions to be checked.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function checkEnabledAndProposedAPI(logService, extensionEnablementService, extensionsProposedApi, extensions, ignoreWorkspaceTrust) {
    // enable or disable proposed API per extension
    extensionsProposedApi.updateEnabledApiProposals(extensions);
    // keep only enabled extensions
    return filterEnabledExtensions(logService, extensionEnablementService, extensions, ignoreWorkspaceTrust);
}
/**
 * Return the subset of extensions that are enabled.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function filterEnabledExtensions(logService, extensionEnablementService, extensions, ignoreWorkspaceTrust) {
    const enabledExtensions = [], extensionsToCheck = [], mappedExtensions = [];
    for (const extension of extensions) {
        if (extension.isUnderDevelopment) {
            // Never disable extensions under development
            enabledExtensions.push(extension);
        }
        else {
            extensionsToCheck.push(extension);
            mappedExtensions.push(toExtension(extension));
        }
    }
    const enablementStates = extensionEnablementService.getEnablementStates(mappedExtensions, ignoreWorkspaceTrust ? { trusted: true } : undefined);
    for (let index = 0; index < enablementStates.length; index++) {
        if (extensionEnablementService.isEnabledEnablementState(enablementStates[index])) {
            enabledExtensions.push(extensionsToCheck[index]);
        }
        else {
            if (isCI) {
                logService.info(`filterEnabledExtensions: extension '${extensionsToCheck[index].identifier.value}' is disabled`);
            }
        }
    }
    return enabledExtensions;
}
/**
 * @argument extension The extension to be checked.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function extensionIsEnabled(logService, extensionEnablementService, extension, ignoreWorkspaceTrust) {
    return filterEnabledExtensions(logService, extensionEnablementService, [extension], ignoreWorkspaceTrust).includes(extension);
}
function includes(extensions, identifier) {
    for (const extension of extensions) {
        if (ExtensionIdentifier.equals(extension.identifier, identifier)) {
            return true;
        }
    }
    return false;
}
export class ExtensionStatus {
    get messages() {
        return this._messages;
    }
    get activationTimes() {
        return this._activationTimes;
    }
    get runtimeErrors() {
        return this._runtimeErrors;
    }
    get activationStarted() {
        return this._activationStarted;
    }
    constructor(id) {
        this.id = id;
        this._messages = [];
        this._activationTimes = null;
        this._runtimeErrors = [];
        this._activationStarted = false;
    }
    clearRuntimeStatus() {
        this._activationStarted = false;
        this._activationTimes = null;
        this._runtimeErrors = [];
    }
    addMessage(msg) {
        this._messages.push(msg);
    }
    setActivationTimes(activationTimes) {
        this._activationTimes = activationTimes;
    }
    addRuntimeError(err) {
        this._runtimeErrors.push(err);
    }
    onWillActivate() {
        this._activationStarted = true;
    }
}
export class ExtensionHostCrashTracker {
    constructor() {
        this._recentCrashes = [];
    }
    static { this._TIME_LIMIT = 5 * 60 * 1000; } // 5 minutes
    static { this._CRASH_LIMIT = 3; }
    _removeOldCrashes() {
        const limit = Date.now() - ExtensionHostCrashTracker._TIME_LIMIT;
        while (this._recentCrashes.length > 0 && this._recentCrashes[0].timestamp < limit) {
            this._recentCrashes.shift();
        }
    }
    registerCrash() {
        this._removeOldCrashes();
        this._recentCrashes.push({ timestamp: Date.now() });
    }
    shouldAutomaticallyRestart() {
        this._removeOldCrashes();
        return this._recentCrashes.length < ExtensionHostCrashTracker._CRASH_LIMIT;
    }
}
/**
 * This can run correctly only on the renderer process because that is the only place
 * where all extension points and all implicit activation events generators are known.
 */
export class ImplicitActivationAwareReader {
    readActivationEvents(extensionDescription) {
        return ImplicitActivationEvents.readActivationEvents(extensionDescription);
    }
}
class ActivationFeatureMarkdowneRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'markdown';
    }
    shouldRender(manifest) {
        return !!manifest.activationEvents;
    }
    render(manifest) {
        const activationEvents = manifest.activationEvents || [];
        const data = new MarkdownString();
        if (activationEvents.length) {
            for (const activationEvent of activationEvents) {
                data.appendMarkdown(`- \`${activationEvent}\`\n`);
            }
        }
        return {
            data,
            dispose: () => { },
        };
    }
}
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'activationEvents',
    label: nls.localize('activation', 'Activation Events'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(ActivationFeatureMarkdowneRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RFeHRlbnNpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vYWJzdHJhY3RFeHRlbnNpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxJQUFJLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTVELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRS9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3RI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