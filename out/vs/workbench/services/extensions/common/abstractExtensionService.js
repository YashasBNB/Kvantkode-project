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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RFeHRlbnNpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2Fic3RyYWN0RXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssSUFBSSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU1RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN0SCxPQUFP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