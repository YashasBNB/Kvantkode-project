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
var AbstractExtHostExtensionService_1;
/* eslint-disable local/code-no-native-private */
import * as nls from '../../../nls.js';
import * as path from '../../../base/common/path.js';
import * as performance from '../../../base/common/performance.js';
import { originalFSPath, joinPath, extUriBiasedIgnorePathCase, } from '../../../base/common/resources.js';
import { asPromise, Barrier, IntervalTimer, timeout } from '../../../base/common/async.js';
import { dispose, toDisposable, Disposable, DisposableStore, } from '../../../base/common/lifecycle.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { ActivatedExtension, EmptyExtension, ExtensionActivationTimes, ExtensionActivationTimesBuilder, ExtensionsActivator, HostExtension, } from './extHostExtensionActivator.js';
import { ExtHostStorage, IExtHostStorage } from './extHostStorage.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { checkProposedApiEnabled, isProposedApiEnabled, } from '../../services/extensions/common/extensions.js';
import { ExtensionDescriptionRegistry, } from '../../services/extensions/common/extensionDescriptionRegistry.js';
import * as errors from '../../../base/common/errors.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet, } from '../../../platform/extensions/common/extensions.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { ExtensionGlobalMemento, ExtensionMemento } from './extHostMemento.js';
import { RemoteAuthorityResolverError, ExtensionKind, ExtensionMode, ManagedResolvedAuthority as ExtHostManagedResolvedAuthority, } from './extHostTypes.js';
import { RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix, ManagedRemoteConnection, WebSocketRemoteConnection, } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { IInstantiationService, createDecorator, } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtensionStoragePaths } from './extHostStoragePaths.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IExtHostTunnelService } from './extHostTunnelService.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostLanguageModels } from './extHostLanguageModels.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { checkActivateWorkspaceContainsExtension, } from '../../services/extensions/common/workspaceContains.js';
import { ExtHostSecretState, IExtHostSecretState } from './extHostSecretState.js';
import { ExtensionSecrets } from './extHostSecrets.js';
import { Schemas } from '../../../base/common/network.js';
import { IExtHostLocalizationService } from './extHostLocalizationService.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { isCI, setTimeout0 } from '../../../base/common/platform.js';
import { IExtHostManagedSockets } from './extHostManagedSockets.js';
export const IHostUtils = createDecorator('IHostUtils');
let AbstractExtHostExtensionService = AbstractExtHostExtensionService_1 = class AbstractExtHostExtensionService extends Disposable {
    constructor(instaService, hostUtils, extHostContext, extHostWorkspace, extHostConfiguration, logService, initData, storagePath, extHostTunnelService, extHostTerminalService, extHostLocalizationService, _extHostManagedSockets, _extHostLanguageModels) {
        super();
        this._extHostManagedSockets = _extHostManagedSockets;
        this._extHostLanguageModels = _extHostLanguageModels;
        this._onDidChangeRemoteConnectionData = this._register(new Emitter());
        this.onDidChangeRemoteConnectionData = this._onDidChangeRemoteConnectionData.event;
        this._realPathCache = new Map();
        this._isTerminating = false;
        this._hostUtils = hostUtils;
        this._extHostContext = extHostContext;
        this._initData = initData;
        this._extHostWorkspace = extHostWorkspace;
        this._extHostConfiguration = extHostConfiguration;
        this._logService = logService;
        this._extHostTunnelService = extHostTunnelService;
        this._extHostTerminalService = extHostTerminalService;
        this._extHostLocalizationService = extHostLocalizationService;
        this._mainThreadWorkspaceProxy = this._extHostContext.getProxy(MainContext.MainThreadWorkspace);
        this._mainThreadTelemetryProxy = this._extHostContext.getProxy(MainContext.MainThreadTelemetry);
        this._mainThreadExtensionsProxy = this._extHostContext.getProxy(MainContext.MainThreadExtensionService);
        this._almostReadyToRunExtensions = new Barrier();
        this._readyToStartExtensionHost = new Barrier();
        this._readyToRunExtensions = new Barrier();
        this._eagerExtensionsActivated = new Barrier();
        this._activationEventsReader = new SyncedActivationEventsReader(this._initData.extensions.activationEvents);
        this._globalRegistry = new ExtensionDescriptionRegistry(this._activationEventsReader, this._initData.extensions.allExtensions);
        const myExtensionsSet = new ExtensionIdentifierSet(this._initData.extensions.myExtensions);
        this._myRegistry = new ExtensionDescriptionRegistry(this._activationEventsReader, filterExtensions(this._globalRegistry, myExtensionsSet));
        if (isCI) {
            this._logService.info(`Creating extension host with the following global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`Creating extension host with the following local extensions: ${printExtIds(this._myRegistry)}`);
        }
        this._storage = new ExtHostStorage(this._extHostContext, this._logService);
        this._secretState = new ExtHostSecretState(this._extHostContext);
        this._storagePath = storagePath;
        this._instaService = this._store.add(instaService.createChild(new ServiceCollection([IExtHostStorage, this._storage], [IExtHostSecretState, this._secretState])));
        this._activator = this._register(new ExtensionsActivator(this._myRegistry, this._globalRegistry, {
            onExtensionActivationError: (extensionId, error, missingExtensionDependency) => {
                this._mainThreadExtensionsProxy.$onExtensionActivationError(extensionId, errors.transformErrorForSerialization(error), missingExtensionDependency);
            },
            actualActivateExtension: async (extensionId, reason) => {
                if (ExtensionDescriptionRegistry.isHostExtension(extensionId, this._myRegistry, this._globalRegistry)) {
                    await this._mainThreadExtensionsProxy.$activateExtension(extensionId, reason);
                    return new HostExtension();
                }
                const extensionDescription = this._myRegistry.getExtensionDescription(extensionId);
                return this._activateExtension(extensionDescription, reason);
            },
        }, this._logService));
        this._extensionPathIndex = null;
        this._resolvers = Object.create(null);
        this._started = false;
        this._remoteConnectionData = this._initData.remote.connectionData;
    }
    getRemoteConnectionData() {
        return this._remoteConnectionData;
    }
    async initialize() {
        try {
            await this._beforeAlmostReadyToRunExtensions();
            this._almostReadyToRunExtensions.open();
            await this._extHostWorkspace.waitForInitializeCall();
            performance.mark('code/extHost/ready');
            this._readyToStartExtensionHost.open();
            if (this._initData.autoStart) {
                this._startExtensionHost();
            }
        }
        catch (err) {
            errors.onUnexpectedError(err);
        }
    }
    async _deactivateAll() {
        this._storagePath.onWillDeactivateAll();
        let allPromises = [];
        try {
            const allExtensions = this._myRegistry.getAllExtensionDescriptions();
            const allExtensionsIds = allExtensions.map((ext) => ext.identifier);
            const activatedExtensions = allExtensionsIds.filter((id) => this.isActivated(id));
            allPromises = activatedExtensions.map((extensionId) => {
                return this._deactivate(extensionId);
            });
        }
        catch (err) {
            // TODO: write to log once we have one
        }
        await Promise.all(allPromises);
    }
    terminate(reason, code = 0) {
        if (this._isTerminating) {
            // we are already shutting down...
            return;
        }
        this._isTerminating = true;
        this._logService.info(`Extension host terminating: ${reason}`);
        this._logService.flush();
        this._extHostTerminalService.dispose();
        this._activator.dispose();
        errors.setUnexpectedErrorHandler((err) => {
            this._logService.error(err);
        });
        // Invalidate all proxies
        this._extHostContext.dispose();
        const extensionsDeactivated = this._deactivateAll();
        // Give extensions at most 5 seconds to wrap up any async deactivate, then exit
        Promise.race([timeout(5000), extensionsDeactivated]).finally(() => {
            if (this._hostUtils.pid) {
                this._logService.info(`Extension host with pid ${this._hostUtils.pid} exiting with code ${code}`);
            }
            else {
                this._logService.info(`Extension host exiting with code ${code}`);
            }
            this._logService.flush();
            this._logService.dispose();
            this._hostUtils.exit(code);
        });
    }
    isActivated(extensionId) {
        if (this._readyToRunExtensions.isOpen()) {
            return this._activator.isActivated(extensionId);
        }
        return false;
    }
    async getExtension(extensionId) {
        const ext = await this._mainThreadExtensionsProxy.$getExtension(extensionId);
        return (ext && {
            ...ext,
            identifier: new ExtensionIdentifier(ext.identifier.value),
            extensionLocation: URI.revive(ext.extensionLocation),
        });
    }
    _activateByEvent(activationEvent, startup) {
        return this._activator.activateByEvent(activationEvent, startup);
    }
    _activateById(extensionId, reason) {
        return this._activator.activateById(extensionId, reason);
    }
    activateByIdWithErrors(extensionId, reason) {
        return this._activateById(extensionId, reason).then(() => {
            const extension = this._activator.getActivatedExtension(extensionId);
            if (extension.activationFailed) {
                // activation failed => bubble up the error as the promise result
                return Promise.reject(extension.activationFailedError);
            }
            return undefined;
        });
    }
    getExtensionRegistry() {
        return this._readyToRunExtensions.wait().then((_) => this._myRegistry);
    }
    getExtensionExports(extensionId) {
        if (this._readyToRunExtensions.isOpen()) {
            return this._activator.getActivatedExtension(extensionId).exports;
        }
        else {
            try {
                return this._activator.getActivatedExtension(extensionId).exports;
            }
            catch (err) {
                return null;
            }
        }
    }
    /**
     * Applies realpath to file-uris and returns all others uris unmodified.
     * The real path is cached for the lifetime of the extension host.
     */
    async _realPathExtensionUri(uri) {
        if (uri.scheme === Schemas.file && this._hostUtils.fsRealpath) {
            const fsPath = uri.fsPath;
            if (!this._realPathCache.has(fsPath)) {
                this._realPathCache.set(fsPath, this._hostUtils.fsRealpath(fsPath));
            }
            const realpathValue = await this._realPathCache.get(fsPath);
            return URI.file(realpathValue);
        }
        return uri;
    }
    // create trie to enable fast 'filename -> extension id' look up
    async getExtensionPathIndex() {
        if (!this._extensionPathIndex) {
            this._extensionPathIndex = this._createExtensionPathIndex(this._myRegistry.getAllExtensionDescriptions()).then((searchTree) => {
                return new ExtensionPaths(searchTree);
            });
        }
        return this._extensionPathIndex;
    }
    /**
     * create trie to enable fast 'filename -> extension id' look up
     */
    async _createExtensionPathIndex(extensions) {
        const tst = TernarySearchTree.forUris((key) => {
            // using the default/biased extUri-util because the IExtHostFileSystemInfo-service
            // isn't ready to be used yet, e.g the knowledge about `file` protocol and others
            // comes in while this code runs
            return extUriBiasedIgnorePathCase.ignorePathCasing(key);
        });
        // const tst = TernarySearchTree.forUris<IExtensionDescription>(key => true);
        await Promise.all(extensions.map(async (ext) => {
            if (this._getEntryPoint(ext)) {
                const uri = await this._realPathExtensionUri(ext.extensionLocation);
                tst.set(uri, ext);
            }
        }));
        return tst;
    }
    _deactivate(extensionId) {
        let result = Promise.resolve(undefined);
        if (!this._readyToRunExtensions.isOpen()) {
            return result;
        }
        if (!this._activator.isActivated(extensionId)) {
            return result;
        }
        const extension = this._activator.getActivatedExtension(extensionId);
        if (!extension) {
            return result;
        }
        // call deactivate if available
        try {
            if (typeof extension.module.deactivate === 'function') {
                result = Promise.resolve(extension.module.deactivate()).then(undefined, (err) => {
                    this._logService.error(err);
                    return Promise.resolve(undefined);
                });
            }
        }
        catch (err) {
            this._logService.error(`An error occurred when deactivating the extension '${extensionId.value}':`);
            this._logService.error(err);
        }
        // clean up subscriptions
        try {
            extension.disposable.dispose();
        }
        catch (err) {
            this._logService.error(`An error occurred when disposing the subscriptions for extension '${extensionId.value}':`);
            this._logService.error(err);
        }
        return result;
    }
    // --- impl
    async _activateExtension(extensionDescription, reason) {
        if (!this._initData.remote.isRemote) {
            // local extension host process
            await this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
        }
        else {
            // remote extension host process
            // do not wait for renderer confirmation
            this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
        }
        return this._doActivateExtension(extensionDescription, reason).then((activatedExtension) => {
            const activationTimes = activatedExtension.activationTimes;
            this._mainThreadExtensionsProxy.$onDidActivateExtension(extensionDescription.identifier, activationTimes.codeLoadingTime, activationTimes.activateCallTime, activationTimes.activateResolvedTime, reason);
            this._logExtensionActivationTimes(extensionDescription, reason, 'success', activationTimes);
            return activatedExtension;
        }, (err) => {
            this._logExtensionActivationTimes(extensionDescription, reason, 'failure');
            throw err;
        });
    }
    _logExtensionActivationTimes(extensionDescription, reason, outcome, activationTimes) {
        const event = getTelemetryActivationEvent(extensionDescription, reason);
        this._mainThreadTelemetryProxy.$publicLog2('extensionActivationTimes', {
            ...event,
            ...(activationTimes || {}),
            outcome,
        });
    }
    _doActivateExtension(extensionDescription, reason) {
        const event = getTelemetryActivationEvent(extensionDescription, reason);
        this._mainThreadTelemetryProxy.$publicLog2('activatePlugin', event);
        const entryPoint = this._getEntryPoint(extensionDescription);
        if (!entryPoint) {
            // Treat the extension as being empty => NOT AN ERROR CASE
            return Promise.resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
        this._logService.info(`ExtensionService#_doActivateExtension ${extensionDescription.identifier.value}, startup: ${reason.startup}, activationEvent: '${reason.activationEvent}'${extensionDescription.identifier.value !== reason.extensionId.value ? `, root cause: ${reason.extensionId.value}` : ``}`);
        this._logService.flush();
        const extensionInternalStore = new DisposableStore(); // disposables that follow the extension lifecycle
        const activationTimesBuilder = new ExtensionActivationTimesBuilder(reason.startup);
        return Promise.all([
            this._loadCommonJSModule(extensionDescription, joinPath(extensionDescription.extensionLocation, entryPoint), activationTimesBuilder),
            this._loadExtensionContext(extensionDescription, extensionInternalStore),
        ])
            .then((values) => {
            performance.mark(`code/extHost/willActivateExtension/${extensionDescription.identifier.value}`);
            return AbstractExtHostExtensionService_1._callActivate(this._logService, extensionDescription.identifier, values[0], values[1], extensionInternalStore, activationTimesBuilder);
        })
            .then((activatedExtension) => {
            performance.mark(`code/extHost/didActivateExtension/${extensionDescription.identifier.value}`);
            return activatedExtension;
        });
    }
    _loadExtensionContext(extensionDescription, extensionInternalStore) {
        const languageModelAccessInformation = this._extHostLanguageModels.createLanguageModelAccessInformation(extensionDescription);
        const globalState = extensionInternalStore.add(new ExtensionGlobalMemento(extensionDescription, this._storage));
        const workspaceState = extensionInternalStore.add(new ExtensionMemento(extensionDescription.identifier.value, false, this._storage));
        const secrets = extensionInternalStore.add(new ExtensionSecrets(extensionDescription, this._secretState));
        const extensionMode = extensionDescription.isUnderDevelopment
            ? this._initData.environment.extensionTestsLocationURI
                ? ExtensionMode.Test
                : ExtensionMode.Development
            : ExtensionMode.Production;
        const extensionKind = this._initData.remote.isRemote
            ? ExtensionKind.Workspace
            : ExtensionKind.UI;
        this._logService.trace(`ExtensionService#loadExtensionContext ${extensionDescription.identifier.value}`);
        return Promise.all([
            globalState.whenReady,
            workspaceState.whenReady,
            this._storagePath.whenReady,
        ]).then(() => {
            const that = this;
            let extension;
            let messagePassingProtocol;
            const messagePort = isProposedApiEnabled(extensionDescription, 'ipc')
                ? this._initData.messagePorts?.get(ExtensionIdentifier.toKey(extensionDescription.identifier))
                : undefined;
            return Object.freeze({
                globalState,
                workspaceState,
                secrets,
                subscriptions: [],
                get languageModelAccessInformation() {
                    return languageModelAccessInformation;
                },
                get extensionUri() {
                    return extensionDescription.extensionLocation;
                },
                get extensionPath() {
                    return extensionDescription.extensionLocation.fsPath;
                },
                asAbsolutePath(relativePath) {
                    return path.join(extensionDescription.extensionLocation.fsPath, relativePath);
                },
                get storagePath() {
                    return that._storagePath.workspaceValue(extensionDescription)?.fsPath;
                },
                get globalStoragePath() {
                    return that._storagePath.globalValue(extensionDescription).fsPath;
                },
                get logPath() {
                    return path.join(that._initData.logsLocation.fsPath, extensionDescription.identifier.value);
                },
                get logUri() {
                    return URI.joinPath(that._initData.logsLocation, extensionDescription.identifier.value);
                },
                get storageUri() {
                    return that._storagePath.workspaceValue(extensionDescription);
                },
                get globalStorageUri() {
                    return that._storagePath.globalValue(extensionDescription);
                },
                get extensionMode() {
                    return extensionMode;
                },
                get extension() {
                    if (extension === undefined) {
                        extension = new Extension(that, extensionDescription.identifier, extensionDescription, extensionKind, false);
                    }
                    return extension;
                },
                get extensionRuntime() {
                    checkProposedApiEnabled(extensionDescription, 'extensionRuntime');
                    return that.extensionRuntime;
                },
                get environmentVariableCollection() {
                    return that._extHostTerminalService.getEnvironmentVariableCollection(extensionDescription);
                },
                get messagePassingProtocol() {
                    if (!messagePassingProtocol) {
                        if (!messagePort) {
                            return undefined;
                        }
                        const onDidReceiveMessage = Event.buffer(Event.fromDOMEventEmitter(messagePort, 'message', (e) => e.data));
                        messagePort.start();
                        messagePassingProtocol = {
                            onDidReceiveMessage,
                            postMessage: messagePort.postMessage.bind(messagePort),
                        };
                    }
                    return messagePassingProtocol;
                },
            });
        });
    }
    static _callActivate(logService, extensionId, extensionModule, context, extensionInternalStore, activationTimesBuilder) {
        // Make sure the extension's surface is not undefined
        extensionModule = extensionModule || {
            activate: undefined,
            deactivate: undefined,
        };
        return this._callActivateOptional(logService, extensionId, extensionModule, context, activationTimesBuilder).then((extensionExports) => {
            return new ActivatedExtension(false, null, activationTimesBuilder.build(), extensionModule, extensionExports, toDisposable(() => {
                extensionInternalStore.dispose();
                dispose(context.subscriptions);
            }));
        });
    }
    static _callActivateOptional(logService, extensionId, extensionModule, context, activationTimesBuilder) {
        if (typeof extensionModule.activate === 'function') {
            try {
                activationTimesBuilder.activateCallStart();
                logService.trace(`ExtensionService#_callActivateOptional ${extensionId.value}`);
                const scope = typeof global === 'object' ? global : self; // `global` is nodejs while `self` is for workers
                const activateResult = extensionModule.activate.apply(scope, [
                    context,
                ]);
                activationTimesBuilder.activateCallStop();
                activationTimesBuilder.activateResolveStart();
                return Promise.resolve(activateResult).then((value) => {
                    activationTimesBuilder.activateResolveStop();
                    return value;
                });
            }
            catch (err) {
                return Promise.reject(err);
            }
        }
        else {
            // No activate found => the module is the extension's exports
            return Promise.resolve(extensionModule);
        }
    }
    // -- eager activation
    _activateOneStartupFinished(desc, activationEvent) {
        this._activateById(desc.identifier, {
            startup: false,
            extensionId: desc.identifier,
            activationEvent: activationEvent,
        }).then(undefined, (err) => {
            this._logService.error(err);
        });
    }
    _activateAllStartupFinishedDeferred(extensions, start = 0) {
        const timeBudget = 50; // 50 milliseconds
        const startTime = Date.now();
        setTimeout0(() => {
            for (let i = start; i < extensions.length; i += 1) {
                const desc = extensions[i];
                for (const activationEvent of desc.activationEvents ?? []) {
                    if (activationEvent === 'onStartupFinished') {
                        if (Date.now() - startTime > timeBudget) {
                            // time budget for current task has been exceeded
                            // set a new task to activate current and remaining extensions
                            this._activateAllStartupFinishedDeferred(extensions, i);
                            break;
                        }
                        else {
                            this._activateOneStartupFinished(desc, activationEvent);
                        }
                    }
                }
            }
        });
    }
    _activateAllStartupFinished() {
        // startup is considered finished
        this._mainThreadExtensionsProxy.$setPerformanceMarks(performance.getMarks());
        this._extHostConfiguration.getConfigProvider().then((configProvider) => {
            const shouldDeferActivation = configProvider
                .getConfiguration('extensions.experimental')
                .get('deferredStartupFinishedActivation');
            const allExtensionDescriptions = this._myRegistry.getAllExtensionDescriptions();
            if (shouldDeferActivation) {
                this._activateAllStartupFinishedDeferred(allExtensionDescriptions);
            }
            else {
                for (const desc of allExtensionDescriptions) {
                    if (desc.activationEvents) {
                        for (const activationEvent of desc.activationEvents) {
                            if (activationEvent === 'onStartupFinished') {
                                this._activateOneStartupFinished(desc, activationEvent);
                            }
                        }
                    }
                }
            }
        });
    }
    // Handle "eager" activation extensions
    _handleEagerExtensions() {
        const starActivation = this._activateByEvent('*', true).then(undefined, (err) => {
            this._logService.error(err);
        });
        this._register(this._extHostWorkspace.onDidChangeWorkspace((e) => this._handleWorkspaceContainsEagerExtensions(e.added)));
        const folders = this._extHostWorkspace.workspace ? this._extHostWorkspace.workspace.folders : [];
        const workspaceContainsActivation = this._handleWorkspaceContainsEagerExtensions(folders);
        const remoteResolverActivation = this._handleRemoteResolverEagerExtensions();
        const eagerExtensionsActivation = Promise.all([
            remoteResolverActivation,
            starActivation,
            workspaceContainsActivation,
        ]).then(() => { });
        Promise.race([eagerExtensionsActivation, timeout(10000)]).then(() => {
            this._activateAllStartupFinished();
        });
        return eagerExtensionsActivation;
    }
    _handleWorkspaceContainsEagerExtensions(folders) {
        if (folders.length === 0) {
            return Promise.resolve(undefined);
        }
        return Promise.all(this._myRegistry.getAllExtensionDescriptions().map((desc) => {
            return this._handleWorkspaceContainsEagerExtension(folders, desc);
        })).then(() => { });
    }
    async _handleWorkspaceContainsEagerExtension(folders, desc) {
        if (this.isActivated(desc.identifier)) {
            return;
        }
        const localWithRemote = !this._initData.remote.isRemote && !!this._initData.remote.authority;
        const host = {
            logService: this._logService,
            folders: folders.map((folder) => folder.uri),
            forceUsingSearch: localWithRemote || !this._hostUtils.fsExists,
            exists: (uri) => this._hostUtils.fsExists(uri.fsPath),
            checkExists: (folders, includes, token) => this._mainThreadWorkspaceProxy.$checkExists(folders, includes, token),
        };
        const result = await checkActivateWorkspaceContainsExtension(host, desc);
        if (!result) {
            return;
        }
        return this._activateById(desc.identifier, {
            startup: true,
            extensionId: desc.identifier,
            activationEvent: result.activationEvent,
        }).then(undefined, (err) => this._logService.error(err));
    }
    async _handleRemoteResolverEagerExtensions() {
        if (this._initData.remote.authority) {
            return this._activateByEvent(`onResolveRemoteAuthority:${this._initData.remote.authority}`, false);
        }
    }
    async $extensionTestsExecute() {
        await this._eagerExtensionsActivated.wait();
        try {
            return await this._doHandleExtensionTests();
        }
        catch (error) {
            console.error(error); // ensure any error message makes it onto the console
            throw error;
        }
    }
    async _doHandleExtensionTests() {
        const { extensionDevelopmentLocationURI, extensionTestsLocationURI } = this._initData.environment;
        if (!extensionDevelopmentLocationURI || !extensionTestsLocationURI) {
            throw new Error(nls.localize('extensionTestError1', 'Cannot load test runner.'));
        }
        // Require the test runner via node require from the provided path
        const testRunner = await this._loadCommonJSModule(null, extensionTestsLocationURI, new ExtensionActivationTimesBuilder(false));
        if (!testRunner || typeof testRunner.run !== 'function') {
            throw new Error(nls.localize('extensionTestError', 'Path {0} does not point to a valid extension test runner.', extensionTestsLocationURI.toString()));
        }
        // Execute the runner if it follows the old `run` spec
        return new Promise((resolve, reject) => {
            const oldTestRunnerCallback = (error, failures) => {
                if (error) {
                    if (isCI) {
                        this._logService.error(`Test runner called back with error`, error);
                    }
                    reject(error);
                }
                else {
                    if (isCI) {
                        if (failures) {
                            this._logService.info(`Test runner called back with ${failures} failures.`);
                        }
                        else {
                            this._logService.info(`Test runner called back with successful outcome.`);
                        }
                    }
                    resolve(typeof failures === 'number' && failures > 0 ? 1 /* ERROR */ : 0 /* OK */);
                }
            };
            const extensionTestsPath = originalFSPath(extensionTestsLocationURI); // for the old test runner API
            const runResult = testRunner.run(extensionTestsPath, oldTestRunnerCallback);
            // Using the new API `run(): Promise<void>`
            if (runResult && runResult.then) {
                runResult
                    .then(() => {
                    if (isCI) {
                        this._logService.info(`Test runner finished successfully.`);
                    }
                    resolve(0);
                })
                    .catch((err) => {
                    if (isCI) {
                        this._logService.error(`Test runner finished with error`, err);
                    }
                    reject(err instanceof Error && err.stack ? err.stack : String(err));
                });
            }
        });
    }
    _startExtensionHost() {
        if (this._started) {
            throw new Error(`Extension host is already started!`);
        }
        this._started = true;
        return this._readyToStartExtensionHost
            .wait()
            .then(() => this._readyToRunExtensions.open())
            .then(() => {
            // wait for all activation events that came in during workbench startup, but at maximum 1s
            return Promise.race([this._activator.waitForActivatingExtensions(), timeout(1000)]);
        })
            .then(() => this._handleEagerExtensions())
            .then(() => {
            this._eagerExtensionsActivated.open();
            this._logService.info(`Eager extensions activated`);
        });
    }
    // -- called by extensions
    registerRemoteAuthorityResolver(authorityPrefix, resolver) {
        this._resolvers[authorityPrefix] = resolver;
        return toDisposable(() => {
            delete this._resolvers[authorityPrefix];
        });
    }
    async getRemoteExecServer(remoteAuthority) {
        const { resolver } = await this._activateAndGetResolver(remoteAuthority);
        return resolver?.resolveExecServer?.(remoteAuthority, { resolveAttempt: 0 });
    }
    // -- called by main thread
    async _activateAndGetResolver(remoteAuthority) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            throw new RemoteAuthorityResolverError(`Not an authority that can be resolved!`, RemoteAuthorityResolverErrorCode.InvalidAuthority);
        }
        const authorityPrefix = remoteAuthority.substr(0, authorityPlusIndex);
        await this._almostReadyToRunExtensions.wait();
        await this._activateByEvent(`onResolveRemoteAuthority:${authorityPrefix}`, false);
        return { authorityPrefix, resolver: this._resolvers[authorityPrefix] };
    }
    async $resolveAuthority(remoteAuthorityChain, resolveAttempt) {
        const sw = StopWatch.create(false);
        const prefix = () => `[resolveAuthority(${getRemoteAuthorityPrefix(remoteAuthorityChain)},${resolveAttempt})][${sw.elapsed()}ms] `;
        const logInfo = (msg) => this._logService.info(`${prefix()}${msg}`);
        const logWarning = (msg) => this._logService.warn(`${prefix()}${msg}`);
        const logError = (msg, err = undefined) => this._logService.error(`${prefix()}${msg}`, err);
        const normalizeError = (err) => {
            if (err instanceof RemoteAuthorityResolverError) {
                return {
                    type: 'error',
                    error: {
                        code: err._code,
                        message: err._message,
                        detail: err._detail,
                    },
                };
            }
            throw err;
        };
        const getResolver = async (remoteAuthority) => {
            logInfo(`activating resolver for ${remoteAuthority}...`);
            const { resolver, authorityPrefix } = await this._activateAndGetResolver(remoteAuthority);
            if (!resolver) {
                logError(`no resolver for ${authorityPrefix}`);
                throw new RemoteAuthorityResolverError(`No remote extension installed to resolve ${authorityPrefix}.`, RemoteAuthorityResolverErrorCode.NoResolverFound);
            }
            return { resolver, authorityPrefix, remoteAuthority };
        };
        const chain = remoteAuthorityChain.split(/@|%40/g).reverse();
        logInfo(`activating remote resolvers ${chain.join(' -> ')}`);
        let resolvers;
        try {
            resolvers = await Promise.all(chain.map(getResolver)).catch(async (e) => {
                if (!(e instanceof RemoteAuthorityResolverError) ||
                    e._code !== RemoteAuthorityResolverErrorCode.InvalidAuthority) {
                    throw e;
                }
                logWarning(`resolving nested authorities failed: ${e.message}`);
                return [await getResolver(remoteAuthorityChain)];
            });
        }
        catch (e) {
            return normalizeError(e);
        }
        const intervalLogger = new IntervalTimer();
        intervalLogger.cancelAndSet(() => logInfo('waiting...'), 1000);
        let result;
        let execServer;
        for (const [i, { authorityPrefix, resolver, remoteAuthority }] of resolvers.entries()) {
            try {
                if (i === resolvers.length - 1) {
                    logInfo(`invoking final resolve()...`);
                    performance.mark(`code/extHost/willResolveAuthority/${authorityPrefix}`);
                    result = await resolver.resolve(remoteAuthority, { resolveAttempt, execServer });
                    performance.mark(`code/extHost/didResolveAuthorityOK/${authorityPrefix}`);
                    logInfo(`setting tunnel factory...`);
                    this._register(await this._extHostTunnelService.setTunnelFactory(resolver, ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result)
                        ? result
                        : undefined));
                }
                else {
                    logInfo(`invoking resolveExecServer() for ${remoteAuthority}`);
                    performance.mark(`code/extHost/willResolveExecServer/${authorityPrefix}`);
                    execServer = await resolver.resolveExecServer?.(remoteAuthority, {
                        resolveAttempt,
                        execServer,
                    });
                    if (!execServer) {
                        throw new RemoteAuthorityResolverError(`Exec server was not available for ${remoteAuthority}`, RemoteAuthorityResolverErrorCode.NoResolverFound); // we did, in fact, break the chain :(
                    }
                    performance.mark(`code/extHost/didResolveExecServerOK/${authorityPrefix}`);
                }
            }
            catch (e) {
                performance.mark(`code/extHost/didResolveAuthorityError/${authorityPrefix}`);
                logError(`returned an error`, e);
                intervalLogger.dispose();
                return normalizeError(e);
            }
        }
        intervalLogger.dispose();
        const tunnelInformation = {
            environmentTunnels: result.environmentTunnels,
            features: result.tunnelFeatures
                ? {
                    elevation: result.tunnelFeatures.elevation,
                    privacyOptions: result.tunnelFeatures.privacyOptions,
                    protocol: result.tunnelFeatures.protocol === undefined ? true : result.tunnelFeatures.protocol,
                }
                : undefined,
        };
        // Split merged API result into separate authority/options
        const options = {
            extensionHostEnv: result.extensionHostEnv,
            isTrusted: result.isTrusted,
            authenticationSession: result.authenticationSessionForInitializingExtensions
                ? {
                    id: result.authenticationSessionForInitializingExtensions.id,
                    providerId: result.authenticationSessionForInitializingExtensions.providerId,
                }
                : undefined,
        };
        // extension are not required to return an instance of ResolvedAuthority or ManagedResolvedAuthority, so don't use `instanceof`
        logInfo(`returned ${ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result) ? 'managed authority' : `${result.host}:${result.port}`}`);
        let authority;
        if (ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result)) {
            // The socket factory is identified by the `resolveAttempt`, since that is a number which
            // always increments and is unique over all resolve() calls in a workbench session.
            const socketFactoryId = resolveAttempt;
            // There is only on managed socket factory at a time, so we can just overwrite the old one.
            this._extHostManagedSockets.setFactory(socketFactoryId, result.makeConnection);
            authority = {
                authority: remoteAuthorityChain,
                connectTo: new ManagedRemoteConnection(socketFactoryId),
                connectionToken: result.connectionToken,
            };
        }
        else {
            authority = {
                authority: remoteAuthorityChain,
                connectTo: new WebSocketRemoteConnection(result.host, result.port),
                connectionToken: result.connectionToken,
            };
        }
        return {
            type: 'ok',
            value: {
                authority: authority,
                options,
                tunnelInformation,
            },
        };
    }
    async $getCanonicalURI(remoteAuthority, uriComponents) {
        this._logService.info(`$getCanonicalURI invoked for authority (${getRemoteAuthorityPrefix(remoteAuthority)})`);
        const { resolver } = await this._activateAndGetResolver(remoteAuthority);
        if (!resolver) {
            // Return `null` if no resolver for `remoteAuthority` is found.
            return null;
        }
        const uri = URI.revive(uriComponents);
        if (typeof resolver.getCanonicalURI === 'undefined') {
            // resolver cannot compute canonical URI
            return uri;
        }
        const result = await asPromise(() => resolver.getCanonicalURI(uri));
        if (!result) {
            return uri;
        }
        return result;
    }
    async $startExtensionHost(extensionsDelta) {
        extensionsDelta.toAdd.forEach((extension) => (extension.extensionLocation = URI.revive(extension.extensionLocation)));
        const { globalRegistry, myExtensions } = applyExtensionsDelta(this._activationEventsReader, this._globalRegistry, this._myRegistry, extensionsDelta);
        const newSearchTree = await this._createExtensionPathIndex(myExtensions);
        const extensionsPaths = await this.getExtensionPathIndex();
        extensionsPaths.setSearchTree(newSearchTree);
        this._globalRegistry.set(globalRegistry.getAllExtensionDescriptions());
        this._myRegistry.set(myExtensions);
        if (isCI) {
            this._logService.info(`$startExtensionHost: global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`$startExtensionHost: local extensions: ${printExtIds(this._myRegistry)}`);
        }
        return this._startExtensionHost();
    }
    $activateByEvent(activationEvent, activationKind) {
        if (activationKind === 1 /* ActivationKind.Immediate */) {
            return this._almostReadyToRunExtensions
                .wait()
                .then((_) => this._activateByEvent(activationEvent, false));
        }
        return this._readyToRunExtensions
            .wait()
            .then((_) => this._activateByEvent(activationEvent, false));
    }
    async $activate(extensionId, reason) {
        await this._readyToRunExtensions.wait();
        if (!this._myRegistry.getExtensionDescription(extensionId)) {
            // unknown extension => ignore
            return false;
        }
        await this._activateById(extensionId, reason);
        return true;
    }
    async $deltaExtensions(extensionsDelta) {
        extensionsDelta.toAdd.forEach((extension) => (extension.extensionLocation = URI.revive(extension.extensionLocation)));
        // First build up and update the trie and only afterwards apply the delta
        const { globalRegistry, myExtensions } = applyExtensionsDelta(this._activationEventsReader, this._globalRegistry, this._myRegistry, extensionsDelta);
        const newSearchTree = await this._createExtensionPathIndex(myExtensions);
        const extensionsPaths = await this.getExtensionPathIndex();
        extensionsPaths.setSearchTree(newSearchTree);
        this._globalRegistry.set(globalRegistry.getAllExtensionDescriptions());
        this._myRegistry.set(myExtensions);
        if (isCI) {
            this._logService.info(`$deltaExtensions: global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`$deltaExtensions: local extensions: ${printExtIds(this._myRegistry)}`);
        }
        return Promise.resolve(undefined);
    }
    async $test_latency(n) {
        return n;
    }
    async $test_up(b) {
        return b.byteLength;
    }
    async $test_down(size) {
        const buff = VSBuffer.alloc(size);
        const value = Math.random() % 256;
        for (let i = 0; i < size; i++) {
            buff.writeUInt8(value, i);
        }
        return buff;
    }
    async $updateRemoteConnectionData(connectionData) {
        this._remoteConnectionData = connectionData;
        this._onDidChangeRemoteConnectionData.fire();
    }
};
AbstractExtHostExtensionService = AbstractExtHostExtensionService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IHostUtils),
    __param(2, IExtHostRpcService),
    __param(3, IExtHostWorkspace),
    __param(4, IExtHostConfiguration),
    __param(5, ILogService),
    __param(6, IExtHostInitDataService),
    __param(7, IExtensionStoragePaths),
    __param(8, IExtHostTunnelService),
    __param(9, IExtHostTerminalService),
    __param(10, IExtHostLocalizationService),
    __param(11, IExtHostManagedSockets),
    __param(12, IExtHostLanguageModels)
], AbstractExtHostExtensionService);
export { AbstractExtHostExtensionService };
function applyExtensionsDelta(activationEventsReader, oldGlobalRegistry, oldMyRegistry, extensionsDelta) {
    activationEventsReader.addActivationEvents(extensionsDelta.addActivationEvents);
    const globalRegistry = new ExtensionDescriptionRegistry(activationEventsReader, oldGlobalRegistry.getAllExtensionDescriptions());
    globalRegistry.deltaExtensions(extensionsDelta.toAdd, extensionsDelta.toRemove);
    const myExtensionsSet = new ExtensionIdentifierSet(oldMyRegistry.getAllExtensionDescriptions().map((extension) => extension.identifier));
    for (const extensionId of extensionsDelta.myToRemove) {
        myExtensionsSet.delete(extensionId);
    }
    for (const extensionId of extensionsDelta.myToAdd) {
        myExtensionsSet.add(extensionId);
    }
    const myExtensions = filterExtensions(globalRegistry, myExtensionsSet);
    return { globalRegistry, myExtensions };
}
function getTelemetryActivationEvent(extensionDescription, reason) {
    const event = {
        id: extensionDescription.identifier.value,
        name: extensionDescription.name,
        extensionVersion: extensionDescription.version,
        publisherDisplayName: extensionDescription.publisher,
        activationEvents: extensionDescription.activationEvents
            ? extensionDescription.activationEvents.join(',')
            : null,
        isBuiltin: extensionDescription.isBuiltin,
        reason: reason.activationEvent,
        reasonId: reason.extensionId.value,
    };
    return event;
}
function printExtIds(registry) {
    return registry
        .getAllExtensionDescriptions()
        .map((ext) => ext.identifier.value)
        .join(',');
}
export const IExtHostExtensionService = createDecorator('IExtHostExtensionService');
export class Extension {
    #extensionService;
    #originExtensionId;
    #identifier;
    constructor(extensionService, originExtensionId, description, kind, isFromDifferentExtensionHost) {
        this.#extensionService = extensionService;
        this.#originExtensionId = originExtensionId;
        this.#identifier = description.identifier;
        this.id = description.identifier.value;
        this.extensionUri = description.extensionLocation;
        this.extensionPath = path.normalize(originalFSPath(description.extensionLocation));
        this.packageJSON = description;
        this.extensionKind = kind;
        this.isFromDifferentExtensionHost = isFromDifferentExtensionHost;
    }
    get isActive() {
        // TODO@alexdima support this
        return this.#extensionService.isActivated(this.#identifier);
    }
    get exports() {
        if (this.packageJSON.api === 'none' || this.isFromDifferentExtensionHost) {
            return undefined; // Strict nulloverride - Public api
        }
        return this.#extensionService.getExtensionExports(this.#identifier);
    }
    async activate() {
        if (this.isFromDifferentExtensionHost) {
            throw new Error('Cannot activate foreign extension'); // TODO@alexdima support this
        }
        await this.#extensionService.activateByIdWithErrors(this.#identifier, {
            startup: false,
            extensionId: this.#originExtensionId,
            activationEvent: 'api',
        });
        return this.exports;
    }
}
function filterExtensions(globalRegistry, desiredExtensions) {
    return globalRegistry
        .getAllExtensionDescriptions()
        .filter((extension) => desiredExtensions.has(extension.identifier));
}
export class ExtensionPaths {
    constructor(_searchTree) {
        this._searchTree = _searchTree;
    }
    setSearchTree(searchTree) {
        this._searchTree = searchTree;
    }
    findSubstr(key) {
        return this._searchTree.findSubstr(key);
    }
    forEach(callback) {
        return this._searchTree.forEach(callback);
    }
}
/**
 * This mirrors the activation events as seen by the renderer. The renderer
 * is the only one which can have a reliable view of activation events because
 * implicit activation events are generated via extension points, and they
 * are registered only on the renderer side.
 */
class SyncedActivationEventsReader {
    constructor(activationEvents) {
        this._map = new ExtensionIdentifierMap();
        this.addActivationEvents(activationEvents);
    }
    readActivationEvents(extensionDescription) {
        return this._map.get(extensionDescription.identifier) ?? [];
    }
    addActivationEvents(activationEvents) {
        for (const extensionId of Object.keys(activationEvents)) {
            this._map.set(extensionId, activationEvents[extensionId]);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsaURBQWlEO0FBRWpELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixjQUFjLEVBQ2QsUUFBUSxFQUNSLDBCQUEwQixHQUMxQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMxRixPQUFPLEVBQ04sT0FBTyxFQUNQLFlBQVksRUFDWixVQUFVLEVBQ1YsZUFBZSxHQUVmLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUVOLFdBQVcsR0FJWCxNQUFNLHVCQUF1QixDQUFBO0FBSzlCLE9BQU8sRUFBd0IscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGNBQWMsRUFDZCx3QkFBd0IsRUFDeEIsK0JBQStCLEVBQy9CLG1CQUFtQixFQUduQixhQUFhLEdBRWIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVB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