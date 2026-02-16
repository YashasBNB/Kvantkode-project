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
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Action } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { RunOnceScheduler, raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isErrorWithActions } from '../../../../base/common/errorMessage.js';
import * as errors from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { deepClone, equals } from '../../../../base/common/objects.js';
import severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { VIEWLET_ID as EXPLORER_VIEWLET_ID } from '../../files/common/files.js';
import { ITestService } from '../../testing/common/testService.js';
import { CALLSTACK_VIEW_ID, CONTEXT_BREAKPOINTS_EXIST, CONTEXT_DEBUG_STATE, CONTEXT_DEBUG_TYPE, CONTEXT_DEBUG_UX, CONTEXT_DISASSEMBLY_VIEW_FOCUS, CONTEXT_HAS_DEBUGGED, CONTEXT_IN_DEBUG_MODE, DEBUG_MEMORY_SCHEME, DEBUG_SCHEME, REPL_VIEW_ID, VIEWLET_ID, debuggerDisabledMessage, getStateLabel, } from '../common/debug.js';
import { DebugCompoundRoot } from '../common/debugCompoundRoot.js';
import { Breakpoint, DataBreakpoint, DebugModel, FunctionBreakpoint, InstructionBreakpoint, } from '../common/debugModel.js';
import { Source } from '../common/debugSource.js';
import { DebugStorage } from '../common/debugStorage.js';
import { DebugTelemetry } from '../common/debugTelemetry.js';
import { getExtensionHostDebugSession, saveAllBeforeDebugStart } from '../common/debugUtils.js';
import { ViewModel } from '../common/debugViewModel.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import { AdapterManager } from './debugAdapterManager.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL } from './debugCommands.js';
import { ConfigurationManager } from './debugConfigurationManager.js';
import { DebugMemoryFileSystemProvider } from './debugMemory.js';
import { DebugSession } from './debugSession.js';
import { DebugTaskRunner } from './debugTaskRunner.js';
let DebugService = class DebugService {
    constructor(editorService, paneCompositeService, viewsService, viewDescriptorService, notificationService, dialogService, layoutService, contextService, contextKeyService, lifecycleService, instantiationService, extensionService, fileService, configurationService, extensionHostDebugService, activityService, commandService, quickInputService, workspaceTrustRequestService, uriIdentityService, testService) {
        this.editorService = editorService;
        this.paneCompositeService = paneCompositeService;
        this.viewsService = viewsService;
        this.viewDescriptorService = viewDescriptorService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.layoutService = layoutService;
        this.contextService = contextService;
        this.contextKeyService = contextKeyService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.extensionHostDebugService = extensionHostDebugService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.quickInputService = quickInputService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.uriIdentityService = uriIdentityService;
        this.testService = testService;
        this.restartingSessions = new Set();
        this.disposables = new DisposableStore();
        this.initializing = false;
        this.sessionCancellationTokens = new Map();
        this.haveDoneLazySetup = false;
        this.breakpointsToSendOnResourceSaved = new Set();
        this._onDidChangeState = new Emitter();
        this._onDidNewSession = new Emitter();
        this._onWillNewSession = new Emitter();
        this._onDidEndSession = new Emitter();
        this.adapterManager = this.instantiationService.createInstance(AdapterManager, {
            onDidNewSession: this.onDidNewSession,
            configurationManager: () => this.configurationManager,
        });
        this.disposables.add(this.adapterManager);
        this.configurationManager = this.instantiationService.createInstance(ConfigurationManager, this.adapterManager);
        this.disposables.add(this.configurationManager);
        this.debugStorage = this.disposables.add(this.instantiationService.createInstance(DebugStorage));
        this.chosenEnvironments = this.debugStorage.loadChosenEnvironments();
        this.model = this.instantiationService.createInstance(DebugModel, this.debugStorage);
        this.telemetry = this.instantiationService.createInstance(DebugTelemetry, this.model);
        this.viewModel = new ViewModel(contextKeyService);
        this.taskRunner = this.instantiationService.createInstance(DebugTaskRunner);
        this.disposables.add(this.fileService.onDidFilesChange((e) => this.onFileChanges(e)));
        this.disposables.add(this.lifecycleService.onWillShutdown(this.dispose, this));
        this.disposables.add(this.extensionHostDebugService.onAttachSession((event) => {
            const session = this.model.getSession(event.sessionId, true);
            if (session) {
                // EH was started in debug mode -> attach to it
                session.configuration.request = 'attach';
                session.configuration.port = event.port;
                session.setSubId(event.subId);
                this.launchOrAttachToSession(session);
            }
        }));
        this.disposables.add(this.extensionHostDebugService.onTerminateSession((event) => {
            const session = this.model.getSession(event.sessionId);
            if (session && session.subId === event.subId) {
                session.disconnect();
            }
        }));
        this.disposables.add(this.viewModel.onDidFocusStackFrame(() => {
            this.onStateChange();
        }));
        this.disposables.add(this.viewModel.onDidFocusSession((session) => {
            this.onStateChange();
            if (session) {
                this.setExceptionBreakpointFallbackSession(session.getId());
            }
        }));
        this.disposables.add(Event.any(this.adapterManager.onDidRegisterDebugger, this.configurationManager.onDidSelectConfiguration)(() => {
            const debugUxValue = this.state !== 0 /* State.Inactive */ ||
                (this.configurationManager.getAllConfigurations().length > 0 &&
                    this.adapterManager.hasEnabledDebuggers())
                ? 'default'
                : 'simple';
            this.debugUx.set(debugUxValue);
            this.debugStorage.storeDebugUxState(debugUxValue);
        }));
        this.disposables.add(this.model.onDidChangeCallStack(() => {
            const numberOfSessions = this.model.getSessions().filter((s) => !s.parentSession).length;
            this.activity?.dispose();
            if (numberOfSessions > 0) {
                const viewContainer = this.viewDescriptorService.getViewContainerByViewId(CALLSTACK_VIEW_ID);
                if (viewContainer) {
                    this.activity = this.activityService.showViewContainerActivity(viewContainer.id, {
                        badge: new NumberBadge(numberOfSessions, (n) => n === 1
                            ? nls.localize('1activeSession', '1 active session')
                            : nls.localize('nActiveSessions', '{0} active sessions', n)),
                    });
                }
            }
        }));
        this.disposables.add(editorService.onDidActiveEditorChange(() => {
            this.contextKeyService.bufferChangeEvents(() => {
                if (editorService.activeEditor === DisassemblyViewInput.instance) {
                    this.disassemblyViewFocus.set(true);
                }
                else {
                    // This key can be initialized a tick after this event is fired
                    this.disassemblyViewFocus?.reset();
                }
            });
        }));
        this.disposables.add(this.lifecycleService.onBeforeShutdown(() => {
            for (const editor of editorService.editors) {
                // Editors will not be valid on window reload, so close them.
                if (editor.resource?.scheme === DEBUG_MEMORY_SCHEME) {
                    editor.dispose();
                }
            }
        }));
        this.disposables.add(extensionService.onWillStop((evt) => {
            evt.veto(this.model.getSessions().length > 0, nls.localize('active debug session', 'A debug session is still running that would terminate.'));
        }));
        this.initContextKeys(contextKeyService);
    }
    initContextKeys(contextKeyService) {
        queueMicrotask(() => {
            contextKeyService.bufferChangeEvents(() => {
                this.debugType = CONTEXT_DEBUG_TYPE.bindTo(contextKeyService);
                this.debugState = CONTEXT_DEBUG_STATE.bindTo(contextKeyService);
                this.hasDebugged = CONTEXT_HAS_DEBUGGED.bindTo(contextKeyService);
                this.inDebugMode = CONTEXT_IN_DEBUG_MODE.bindTo(contextKeyService);
                this.debugUx = CONTEXT_DEBUG_UX.bindTo(contextKeyService);
                this.debugUx.set(this.debugStorage.loadDebugUxState());
                this.breakpointsExist = CONTEXT_BREAKPOINTS_EXIST.bindTo(contextKeyService);
                // Need to set disassemblyViewFocus here to make it in the same context as the debug event handlers
                this.disassemblyViewFocus = CONTEXT_DISASSEMBLY_VIEW_FOCUS.bindTo(contextKeyService);
            });
            const setBreakpointsExistContext = () => this.breakpointsExist.set(!!(this.model.getBreakpoints().length ||
                this.model.getDataBreakpoints().length ||
                this.model.getFunctionBreakpoints().length));
            setBreakpointsExistContext();
            this.disposables.add(this.model.onDidChangeBreakpoints(() => setBreakpointsExistContext()));
        });
    }
    getModel() {
        return this.model;
    }
    getViewModel() {
        return this.viewModel;
    }
    getConfigurationManager() {
        return this.configurationManager;
    }
    getAdapterManager() {
        return this.adapterManager;
    }
    sourceIsNotAvailable(uri) {
        this.model.sourceIsNotAvailable(uri);
    }
    dispose() {
        this.disposables.dispose();
    }
    //---- state management
    get state() {
        const focusedSession = this.viewModel.focusedSession;
        if (focusedSession) {
            return focusedSession.state;
        }
        return this.initializing ? 1 /* State.Initializing */ : 0 /* State.Inactive */;
    }
    get initializingOptions() {
        return this._initializingOptions;
    }
    startInitializingState(options) {
        if (!this.initializing) {
            this.initializing = true;
            this._initializingOptions = options;
            this.onStateChange();
        }
    }
    endInitializingState() {
        if (this.initializing) {
            this.initializing = false;
            this._initializingOptions = undefined;
            this.onStateChange();
        }
    }
    cancelTokens(id) {
        if (id) {
            const token = this.sessionCancellationTokens.get(id);
            if (token) {
                token.cancel();
                this.sessionCancellationTokens.delete(id);
            }
        }
        else {
            this.sessionCancellationTokens.forEach((t) => t.cancel());
            this.sessionCancellationTokens.clear();
        }
    }
    onStateChange() {
        const state = this.state;
        if (this.previousState !== state) {
            this.contextKeyService.bufferChangeEvents(() => {
                this.debugState.set(getStateLabel(state));
                this.inDebugMode.set(state !== 0 /* State.Inactive */);
                // Only show the simple ux if debug is not yet started and if no launch.json exists
                const debugUxValue = (state !== 0 /* State.Inactive */ && state !== 1 /* State.Initializing */) ||
                    (this.adapterManager.hasEnabledDebuggers() &&
                        this.configurationManager.selectedConfiguration.name)
                    ? 'default'
                    : 'simple';
                this.debugUx.set(debugUxValue);
                this.debugStorage.storeDebugUxState(debugUxValue);
            });
            this.previousState = state;
            this._onDidChangeState.fire(state);
        }
    }
    get onDidChangeState() {
        return this._onDidChangeState.event;
    }
    get onDidNewSession() {
        return this._onDidNewSession.event;
    }
    get onWillNewSession() {
        return this._onWillNewSession.event;
    }
    get onDidEndSession() {
        return this._onDidEndSession.event;
    }
    lazySetup() {
        if (!this.haveDoneLazySetup) {
            // Registering fs providers is slow
            // https://github.com/microsoft/vscode/issues/159886
            this.disposables.add(this.fileService.registerProvider(DEBUG_MEMORY_SCHEME, this.disposables.add(new DebugMemoryFileSystemProvider(this))));
            this.haveDoneLazySetup = true;
        }
    }
    //---- life cycle management
    /**
     * main entry point
     * properly manages compounds, checks for errors and handles the initializing state.
     */
    async startDebugging(launch, configOrName, options, saveBeforeStart = !options?.parentSession) {
        const message = options && options.noDebug
            ? nls.localize('runTrust', 'Running executes build tasks and program code from your workspace.')
            : nls.localize('debugTrust', 'Debugging executes build tasks and program code from your workspace.');
        const trust = await this.workspaceTrustRequestService.requestWorkspaceTrust({ message });
        if (!trust) {
            return false;
        }
        this.lazySetup();
        this.startInitializingState(options);
        this.hasDebugged.set(true);
        try {
            // make sure to save all files and that the configuration is up to date
            await this.extensionService.activateByEvent('onDebug');
            if (saveBeforeStart) {
                await saveAllBeforeDebugStart(this.configurationService, this.editorService);
            }
            await this.extensionService.whenInstalledExtensionsRegistered();
            let config;
            let compound;
            if (!configOrName) {
                configOrName = this.configurationManager.selectedConfiguration.name;
            }
            if (typeof configOrName === 'string' && launch) {
                config = launch.getConfiguration(configOrName);
                compound = launch.getCompound(configOrName);
            }
            else if (typeof configOrName !== 'string') {
                config = configOrName;
            }
            if (compound) {
                // we are starting a compound debug, first do some error checking and than start each configuration in the compound
                if (!compound.configurations) {
                    throw new Error(nls.localize({
                        key: 'compoundMustHaveConfigurations',
                        comment: [
                            'compound indicates a "compounds" configuration item',
                            '"configurations" is an attribute and should not be localized',
                        ],
                    }, 'Compound must have "configurations" attribute set in order to start multiple configurations.'));
                }
                if (compound.preLaunchTask) {
                    const taskResult = await this.taskRunner.runTaskAndCheckErrors(launch?.workspace || this.contextService.getWorkspace(), compound.preLaunchTask);
                    if (taskResult === 0 /* TaskRunResult.Failure */) {
                        this.endInitializingState();
                        return false;
                    }
                }
                if (compound.stopAll) {
                    options = { ...options, compoundRoot: new DebugCompoundRoot() };
                }
                const values = await Promise.all(compound.configurations.map((configData) => {
                    const name = typeof configData === 'string' ? configData : configData.name;
                    if (name === compound.name) {
                        return Promise.resolve(false);
                    }
                    let launchForName;
                    if (typeof configData === 'string') {
                        const launchesContainingName = this.configurationManager
                            .getLaunches()
                            .filter((l) => !!l.getConfiguration(name));
                        if (launchesContainingName.length === 1) {
                            launchForName = launchesContainingName[0];
                        }
                        else if (launch &&
                            launchesContainingName.length > 1 &&
                            launchesContainingName.indexOf(launch) >= 0) {
                            // If there are multiple launches containing the configuration give priority to the configuration in the current launch
                            launchForName = launch;
                        }
                        else {
                            throw new Error(launchesContainingName.length === 0
                                ? nls.localize('noConfigurationNameInWorkspace', "Could not find launch configuration '{0}' in the workspace.", name)
                                : nls.localize('multipleConfigurationNamesInWorkspace', "There are multiple launch configurations '{0}' in the workspace. Use folder name to qualify the configuration.", name));
                        }
                    }
                    else if (configData.folder) {
                        const launchesMatchingConfigData = this.configurationManager
                            .getLaunches()
                            .filter((l) => l.workspace &&
                            l.workspace.name === configData.folder &&
                            !!l.getConfiguration(configData.name));
                        if (launchesMatchingConfigData.length === 1) {
                            launchForName = launchesMatchingConfigData[0];
                        }
                        else {
                            throw new Error(nls.localize('noFolderWithName', "Can not find folder with name '{0}' for configuration '{1}' in compound '{2}'.", configData.folder, configData.name, compound.name));
                        }
                    }
                    return this.createSession(launchForName, launchForName.getConfiguration(name), options);
                }));
                const result = values.every((success) => !!success); // Compound launch is a success only if each configuration launched successfully
                this.endInitializingState();
                return result;
            }
            if (configOrName && !config) {
                const message = !!launch
                    ? nls.localize('configMissing', "Configuration '{0}' is missing in 'launch.json'.", typeof configOrName === 'string' ? configOrName : configOrName.name)
                    : nls.localize('launchJsonDoesNotExist', "'launch.json' does not exist for passed workspace folder.");
                throw new Error(message);
            }
            const result = await this.createSession(launch, config, options);
            this.endInitializingState();
            return result;
        }
        catch (err) {
            // make sure to get out of initializing state, and propagate the result
            this.notificationService.error(err);
            this.endInitializingState();
            return Promise.reject(err);
        }
    }
    /**
     * gets the debugger for the type, resolves configurations by providers, substitutes variables and runs prelaunch tasks
     */
    async createSession(launch, config, options) {
        // We keep the debug type in a separate variable 'type' so that a no-folder config has no attributes.
        // Storing the type in the config would break extensions that assume that the no-folder case is indicated by an empty config.
        let type;
        if (config) {
            type = config.type;
        }
        else {
            // a no-folder workspace has no launch.config
            config = Object.create(null);
        }
        if (options && options.noDebug) {
            config.noDebug = true;
        }
        else if (options &&
            typeof options.noDebug === 'undefined' &&
            options.parentSession &&
            options.parentSession.configuration.noDebug) {
            config.noDebug = true;
        }
        const unresolvedConfig = deepClone(config);
        let guess;
        let activeEditor;
        if (!type) {
            activeEditor = this.editorService.activeEditor;
            if (activeEditor && activeEditor.resource) {
                const chosen = this.chosenEnvironments[activeEditor.resource.toString()];
                if (chosen) {
                    type = chosen.type;
                    if (chosen.dynamicLabel) {
                        const dyn = await this.configurationManager.getDynamicConfigurationsByType(chosen.type);
                        const found = dyn.find((d) => d.label === chosen.dynamicLabel);
                        if (found) {
                            launch = found.launch;
                            Object.assign(config, found.config);
                        }
                    }
                }
            }
            if (!type) {
                guess = await this.adapterManager.guessDebugger(false);
                if (guess) {
                    type = guess.debugger.type;
                    if (guess.withConfig) {
                        launch = guess.withConfig.launch;
                        Object.assign(config, guess.withConfig.config);
                    }
                }
            }
        }
        const initCancellationToken = new CancellationTokenSource();
        const sessionId = generateUuid();
        this.sessionCancellationTokens.set(sessionId, initCancellationToken);
        const configByProviders = await this.configurationManager.resolveConfigurationByProviders(launch && launch.workspace ? launch.workspace.uri : undefined, type, config, initCancellationToken.token);
        // a falsy config indicates an aborted launch
        if (configByProviders && configByProviders.type) {
            try {
                let resolvedConfig = await this.substituteVariables(launch, configByProviders);
                if (!resolvedConfig) {
                    // User cancelled resolving of interactive variables, silently return
                    return false;
                }
                if (initCancellationToken.token.isCancellationRequested) {
                    // User cancelled, silently return
                    return false;
                }
                const workspace = launch?.workspace || this.contextService.getWorkspace();
                const taskResult = await this.taskRunner.runTaskAndCheckErrors(workspace, resolvedConfig.preLaunchTask);
                if (taskResult === 0 /* TaskRunResult.Failure */) {
                    return false;
                }
                const cfg = await this.configurationManager.resolveDebugConfigurationWithSubstitutedVariables(launch && launch.workspace ? launch.workspace.uri : undefined, resolvedConfig.type, resolvedConfig, initCancellationToken.token);
                if (!cfg) {
                    if (launch &&
                        type &&
                        cfg === null &&
                        !initCancellationToken.token.isCancellationRequested) {
                        // show launch.json only for "config" being "null".
                        await launch.openConfigFile({ preserveFocus: true, type }, initCancellationToken.token);
                    }
                    return false;
                }
                resolvedConfig = cfg;
                const dbg = this.adapterManager.getDebugger(resolvedConfig.type);
                if (!dbg ||
                    (configByProviders.request !== 'attach' && configByProviders.request !== 'launch')) {
                    let message;
                    if (configByProviders.request !== 'attach' && configByProviders.request !== 'launch') {
                        message = configByProviders.request
                            ? nls.localize('debugRequestNotSupported', "Attribute '{0}' has an unsupported value '{1}' in the chosen debug configuration.", 'request', configByProviders.request)
                            : nls.localize('debugRequesMissing', "Attribute '{0}' is missing from the chosen debug configuration.", 'request');
                    }
                    else {
                        message = resolvedConfig.type
                            ? nls.localize('debugTypeNotSupported', "Configured debug type '{0}' is not supported.", resolvedConfig.type)
                            : nls.localize('debugTypeMissing', "Missing property 'type' for the chosen launch configuration.");
                    }
                    const actionList = [];
                    actionList.push(new Action('installAdditionalDebuggers', nls.localize({
                        key: 'installAdditionalDebuggers',
                        comment: ['Placeholder is the debug type, so for example "node", "python"'],
                    }, 'Install {0} Extension', resolvedConfig.type), undefined, true, async () => this.commandService.executeCommand('debug.installAdditionalDebuggers', resolvedConfig?.type)));
                    await this.showError(message, actionList);
                    return false;
                }
                if (!dbg.enabled) {
                    await this.showError(debuggerDisabledMessage(dbg.type), []);
                    return false;
                }
                const result = await this.doCreateSession(sessionId, launch?.workspace, { resolved: resolvedConfig, unresolved: unresolvedConfig }, options);
                if (result && guess && activeEditor && activeEditor.resource) {
                    // Remeber user choice of environment per active editor to make starting debugging smoother #124770
                    this.chosenEnvironments[activeEditor.resource.toString()] = {
                        type: guess.debugger.type,
                        dynamicLabel: guess.withConfig?.label,
                    };
                    this.debugStorage.storeChosenEnvironments(this.chosenEnvironments);
                }
                return result;
            }
            catch (err) {
                if (err && err.message) {
                    await this.showError(err.message);
                }
                else if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                    await this.showError(nls.localize('noFolderWorkspaceDebugError', 'The active file can not be debugged. Make sure it is saved and that you have a debug extension installed for that file type.'));
                }
                if (launch && !initCancellationToken.token.isCancellationRequested) {
                    await launch.openConfigFile({ preserveFocus: true }, initCancellationToken.token);
                }
                return false;
            }
        }
        if (launch &&
            type &&
            configByProviders === null &&
            !initCancellationToken.token.isCancellationRequested) {
            // show launch.json only for "config" being "null".
            await launch.openConfigFile({ preserveFocus: true, type }, initCancellationToken.token);
        }
        return false;
    }
    /**
     * instantiates the new session, initializes the session, registers session listeners and reports telemetry
     */
    async doCreateSession(sessionId, root, configuration, options) {
        const session = this.instantiationService.createInstance(DebugSession, sessionId, configuration, root, this.model, options);
        if (options?.startedByUser &&
            this.model.getSessions().some((s) => s.getLabel() === session.getLabel()) &&
            configuration.resolved.suppressMultipleSessionWarning !== true) {
            // There is already a session with the same name, prompt user #127721
            const result = await this.dialogService.confirm({
                message: nls.localize('multipleSession', "'{0}' is already running. Do you want to start another instance?", session.getLabel()),
            });
            if (!result.confirmed) {
                return false;
            }
        }
        this.model.addSession(session);
        // since the Session is now properly registered under its ID and hooked, we can announce it
        // this event doesn't go to extensions
        this._onWillNewSession.fire(session);
        const openDebug = this.configurationService.getValue('debug').openDebug;
        // Open debug viewlet based on the visibility of the side bar and openDebug setting. Do not open for 'run without debug'
        if (!configuration.resolved.noDebug &&
            (openDebug === 'openOnSessionStart' ||
                (openDebug !== 'neverOpen' && this.viewModel.firstSessionStart)) &&
            !session.suppressDebugView) {
            await this.paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
        }
        try {
            await this.launchOrAttachToSession(session);
            const internalConsoleOptions = session.configuration.internalConsoleOptions ||
                this.configurationService.getValue('debug').internalConsoleOptions;
            if (internalConsoleOptions === 'openOnSessionStart' ||
                (this.viewModel.firstSessionStart && internalConsoleOptions === 'openOnFirstSessionStart')) {
                this.viewsService.openView(REPL_VIEW_ID, false);
            }
            this.viewModel.firstSessionStart = false;
            const showSubSessions = this.configurationService.getValue('debug').showSubSessionsInToolBar;
            const sessions = this.model.getSessions();
            const shownSessions = showSubSessions ? sessions : sessions.filter((s) => !s.parentSession);
            if (shownSessions.length > 1) {
                this.viewModel.setMultiSessionView(true);
            }
            // since the initialized response has arrived announce the new Session (including extensions)
            this._onDidNewSession.fire(session);
            return true;
        }
        catch (error) {
            if (errors.isCancellationError(error)) {
                // don't show 'canceled' error messages to the user #7906
                return false;
            }
            // Show the repl if some error got logged there #5870
            if (session && session.getReplElements().length > 0) {
                this.viewsService.openView(REPL_VIEW_ID, false);
            }
            if (session.configuration &&
                session.configuration.request === 'attach' &&
                session.configuration.__autoAttach) {
                // ignore attach timeouts in auto attach mode
                return false;
            }
            const errorMessage = error instanceof Error ? error.message : error;
            if (error.showUser !== false) {
                // Only show the error when showUser is either not defined, or is true #128484
                await this.showError(errorMessage, isErrorWithActions(error) ? error.actions : []);
            }
            return false;
        }
    }
    async launchOrAttachToSession(session, forceFocus = false) {
        // register listeners as the very first thing!
        this.registerSessionListeners(session);
        const dbgr = this.adapterManager.getDebugger(session.configuration.type);
        try {
            await session.initialize(dbgr);
            await session.launchOrAttach(session.configuration);
            const launchJsonExists = !!session.root &&
                !!this.configurationService.getValue('launch', {
                    resource: session.root.uri,
                });
            await this.telemetry.logDebugSessionStart(dbgr, launchJsonExists);
            if (forceFocus ||
                !this.viewModel.focusedSession ||
                (session.parentSession === this.viewModel.focusedSession && session.compact)) {
                await this.focusStackFrame(undefined, undefined, session);
            }
        }
        catch (err) {
            if (this.viewModel.focusedSession === session) {
                await this.focusStackFrame(undefined);
            }
            return Promise.reject(err);
        }
    }
    registerSessionListeners(session) {
        const listenerDisposables = new DisposableStore();
        this.disposables.add(listenerDisposables);
        const sessionRunningScheduler = listenerDisposables.add(new RunOnceScheduler(() => {
            // Do not immediatly defocus the stack frame if the session is running
            if (session.state === 3 /* State.Running */ && this.viewModel.focusedSession === session) {
                this.viewModel.setFocus(undefined, this.viewModel.focusedThread, session, false);
            }
        }, 200));
        listenerDisposables.add(session.onDidChangeState(() => {
            if (session.state === 3 /* State.Running */ && this.viewModel.focusedSession === session) {
                sessionRunningScheduler.schedule();
            }
            if (session === this.viewModel.focusedSession) {
                this.onStateChange();
            }
        }));
        listenerDisposables.add(this.onDidEndSession((e) => {
            if (e.session === session) {
                this.disposables.delete(listenerDisposables);
            }
        }));
        listenerDisposables.add(session.onDidEndAdapter(async (adapterExitEvent) => {
            if (adapterExitEvent) {
                if (adapterExitEvent.error) {
                    this.notificationService.error(nls.localize('debugAdapterCrash', 'Debug adapter process has terminated unexpectedly ({0})', adapterExitEvent.error.message || adapterExitEvent.error.toString()));
                }
                this.telemetry.logDebugSessionStop(session, adapterExitEvent);
            }
            // 'Run without debugging' mode VSCode must terminate the extension host. More details: #3905
            const extensionDebugSession = getExtensionHostDebugSession(session);
            if (extensionDebugSession &&
                extensionDebugSession.state === 3 /* State.Running */ &&
                extensionDebugSession.configuration.noDebug) {
                this.extensionHostDebugService.close(extensionDebugSession.getId());
            }
            if (session.configuration.postDebugTask) {
                const root = session.root ?? this.contextService.getWorkspace();
                try {
                    await this.taskRunner.runTask(root, session.configuration.postDebugTask);
                }
                catch (err) {
                    this.notificationService.error(err);
                }
            }
            this.endInitializingState();
            this.cancelTokens(session.getId());
            if (this.configurationService.getValue('debug').closeReadonlyTabsOnEnd) {
                const editorsToClose = this.editorService
                    .getEditors(1 /* EditorsOrder.SEQUENTIAL */)
                    .filter(({ editor }) => {
                    return (editor.resource?.scheme === DEBUG_SCHEME &&
                        session.getId() === Source.getEncodedDebugData(editor.resource).sessionId);
                });
                this.editorService.closeEditors(editorsToClose);
            }
            this._onDidEndSession.fire({ session, restart: this.restartingSessions.has(session) });
            const focusedSession = this.viewModel.focusedSession;
            if (focusedSession && focusedSession.getId() === session.getId()) {
                const { session, thread, stackFrame } = getStackFrameThreadAndSessionToFocus(this.model, undefined, undefined, undefined, focusedSession);
                this.viewModel.setFocus(stackFrame, thread, session, false);
            }
            if (this.model.getSessions().length === 0) {
                this.viewModel.setMultiSessionView(false);
                if (this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) &&
                    this.configurationService.getValue('debug').openExplorerOnEnd) {
                    this.paneCompositeService.openPaneComposite(EXPLORER_VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
                }
                // Data breakpoints that can not be persisted should be cleared when a session ends
                const dataBreakpoints = this.model.getDataBreakpoints().filter((dbp) => !dbp.canPersist);
                dataBreakpoints.forEach((dbp) => this.model.removeDataBreakpoints(dbp.getId()));
                if (this.configurationService.getValue('debug').console.closeOnEnd) {
                    const debugConsoleContainer = this.viewDescriptorService.getViewContainerByViewId(REPL_VIEW_ID);
                    if (debugConsoleContainer &&
                        this.viewsService.isViewContainerVisible(debugConsoleContainer.id)) {
                        this.viewsService.closeViewContainer(debugConsoleContainer.id);
                    }
                }
            }
            this.model.removeExceptionBreakpointsForSession(session.getId());
            // session.dispose(); TODO@roblourens
        }));
    }
    async restartSession(session, restartData) {
        if (session.saveBeforeRestart) {
            await saveAllBeforeDebugStart(this.configurationService, this.editorService);
        }
        const isAutoRestart = !!restartData;
        const runTasks = async () => {
            if (isAutoRestart) {
                // Do not run preLaunch and postDebug tasks for automatic restarts
                return Promise.resolve(1 /* TaskRunResult.Success */);
            }
            const root = session.root || this.contextService.getWorkspace();
            await this.taskRunner.runTask(root, session.configuration.preRestartTask);
            await this.taskRunner.runTask(root, session.configuration.postDebugTask);
            const taskResult1 = await this.taskRunner.runTaskAndCheckErrors(root, session.configuration.preLaunchTask);
            if (taskResult1 !== 1 /* TaskRunResult.Success */) {
                return taskResult1;
            }
            return this.taskRunner.runTaskAndCheckErrors(root, session.configuration.postRestartTask);
        };
        const extensionDebugSession = getExtensionHostDebugSession(session);
        if (extensionDebugSession) {
            const taskResult = await runTasks();
            if (taskResult === 1 /* TaskRunResult.Success */) {
                this.extensionHostDebugService.reload(extensionDebugSession.getId());
            }
            return;
        }
        // Read the configuration again if a launch.json has been changed, if not just use the inmemory configuration
        let needsToSubstitute = false;
        let unresolved;
        const launch = session.root ? this.configurationManager.getLaunch(session.root.uri) : undefined;
        if (launch) {
            unresolved = launch.getConfiguration(session.configuration.name);
            if (unresolved && !equals(unresolved, session.unresolvedConfiguration)) {
                unresolved.noDebug = session.configuration.noDebug;
                needsToSubstitute = true;
            }
        }
        let resolved = session.configuration;
        if (launch && needsToSubstitute && unresolved) {
            const initCancellationToken = new CancellationTokenSource();
            this.sessionCancellationTokens.set(session.getId(), initCancellationToken);
            const resolvedByProviders = await this.configurationManager.resolveConfigurationByProviders(launch.workspace ? launch.workspace.uri : undefined, unresolved.type, unresolved, initCancellationToken.token);
            if (resolvedByProviders) {
                resolved = await this.substituteVariables(launch, resolvedByProviders);
                if (resolved && !initCancellationToken.token.isCancellationRequested) {
                    resolved =
                        await this.configurationManager.resolveDebugConfigurationWithSubstitutedVariables(launch && launch.workspace ? launch.workspace.uri : undefined, resolved.type, resolved, initCancellationToken.token);
                }
            }
            else {
                resolved = resolvedByProviders;
            }
        }
        if (resolved) {
            session.setConfiguration({ resolved, unresolved });
        }
        session.configuration.__restart = restartData;
        const doRestart = async (fn) => {
            this.restartingSessions.add(session);
            let didRestart = false;
            try {
                didRestart = (await fn()) !== false;
            }
            catch (e) {
                didRestart = false;
                throw e;
            }
            finally {
                this.restartingSessions.delete(session);
                // we previously may have issued an onDidEndSession with restart: true,
                // assuming the adapter exited (in `registerSessionListeners`). But the
                // restart failed, so emit the final termination now.
                if (!didRestart) {
                    this._onDidEndSession.fire({ session, restart: false });
                }
            }
        };
        for (const breakpoint of this.model.getBreakpoints({ triggeredOnly: true })) {
            breakpoint.setSessionDidTrigger(session.getId(), false);
        }
        // For debug sessions spawned by test runs, cancel the test run and stop
        // the session, then start the test run again; tests have no notion of restarts.
        if (session.correlatedTestRun) {
            if (!session.correlatedTestRun.completedAt) {
                session.cancelCorrelatedTestRun();
                await Event.toPromise(session.correlatedTestRun.onComplete);
                // todo@connor4312 is there any reason to wait for the debug session to
                // terminate? I don't think so, test extension should already handle any
                // state conflicts...
            }
            this.testService.runResolvedTests(session.correlatedTestRun.request);
            return;
        }
        if (session.capabilities.supportsRestartRequest) {
            const taskResult = await runTasks();
            if (taskResult === 1 /* TaskRunResult.Success */) {
                await doRestart(async () => {
                    await session.restart();
                    return true;
                });
            }
            return;
        }
        const shouldFocus = !!this.viewModel.focusedSession && session.getId() === this.viewModel.focusedSession.getId();
        return doRestart(async () => {
            // If the restart is automatic  -> disconnect, otherwise -> terminate #55064
            if (isAutoRestart) {
                await session.disconnect(true);
            }
            else {
                await session.terminate(true);
            }
            return new Promise((c, e) => {
                setTimeout(async () => {
                    const taskResult = await runTasks();
                    if (taskResult !== 1 /* TaskRunResult.Success */) {
                        return c(false);
                    }
                    if (!resolved) {
                        return c(false);
                    }
                    try {
                        await this.launchOrAttachToSession(session, shouldFocus);
                        this._onDidNewSession.fire(session);
                        c(true);
                    }
                    catch (error) {
                        e(error);
                    }
                }, 300);
            });
        });
    }
    async stopSession(session, disconnect = false, suspend = false) {
        if (session) {
            return disconnect ? session.disconnect(undefined, suspend) : session.terminate();
        }
        const sessions = this.model.getSessions();
        if (sessions.length === 0) {
            this.taskRunner.cancel();
            // User might have cancelled starting of a debug session, and in some cases the quick pick is left open
            await this.quickInputService.cancel();
            this.endInitializingState();
            this.cancelTokens(undefined);
        }
        return Promise.all(sessions.map((s) => (disconnect ? s.disconnect(undefined, suspend) : s.terminate())));
    }
    async substituteVariables(launch, config) {
        const dbg = this.adapterManager.getDebugger(config.type);
        if (dbg) {
            let folder = undefined;
            if (launch && launch.workspace) {
                folder = launch.workspace;
            }
            else {
                const folders = this.contextService.getWorkspace().folders;
                if (folders.length === 1) {
                    folder = folders[0];
                }
            }
            try {
                return await dbg.substituteVariables(folder, config);
            }
            catch (err) {
                this.showError(err.message, undefined, !!launch?.getConfiguration(config.name));
                return undefined; // bail out
            }
        }
        return Promise.resolve(config);
    }
    async showError(message, errorActions = [], promptLaunchJson = true) {
        const configureAction = new Action(DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL, undefined, true, () => this.commandService.executeCommand(DEBUG_CONFIGURE_COMMAND_ID));
        // Don't append the standard command if id of any provided action indicates it is a command
        const actions = errorActions.filter((action) => action.id.endsWith('.command')).length > 0
            ? errorActions
            : [...errorActions, ...(promptLaunchJson ? [configureAction] : [])];
        await this.dialogService.prompt({
            type: severity.Error,
            message,
            buttons: actions.map((action) => ({
                label: action.label,
                run: () => action.run(),
            })),
            cancelButton: true,
        });
    }
    //---- focus management
    async focusStackFrame(_stackFrame, _thread, _session, options) {
        const { stackFrame, thread, session } = getStackFrameThreadAndSessionToFocus(this.model, _stackFrame, _thread, _session);
        if (stackFrame) {
            const editor = await stackFrame.openInEditor(this.editorService, options?.preserveFocus ?? true, options?.sideBySide, options?.pinned);
            if (editor) {
                if (editor.input === DisassemblyViewInput.instance) {
                    // Go to address is invoked via setFocus
                }
                else {
                    const control = editor.getControl();
                    if (stackFrame && isCodeEditor(control) && control.hasModel()) {
                        const model = control.getModel();
                        const lineNumber = stackFrame.range.startLineNumber;
                        if (lineNumber >= 1 && lineNumber <= model.getLineCount()) {
                            const lineContent = control.getModel().getLineContent(lineNumber);
                            aria.alert(nls.localize({
                                key: 'debuggingPaused',
                                comment: [
                                    'First placeholder is the file line content, second placeholder is the reason why debugging is stopped, for example "breakpoint", third is the stack frame name, and last is the line number.',
                                ],
                            }, '{0}, debugging paused {1}, {2}:{3}', lineContent, thread && thread.stoppedDetails ? `, reason ${thread.stoppedDetails.reason}` : '', stackFrame.source ? stackFrame.source.name : '', stackFrame.range.startLineNumber));
                        }
                    }
                }
            }
        }
        if (session) {
            this.debugType.set(session.configuration.type);
        }
        else {
            this.debugType.reset();
        }
        this.viewModel.setFocus(stackFrame, thread, session, !!options?.explicit);
    }
    //---- watches
    addWatchExpression(name) {
        const we = this.model.addWatchExpression(name);
        if (!name) {
            this.viewModel.setSelectedExpression(we, false);
        }
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    renameWatchExpression(id, newName) {
        this.model.renameWatchExpression(id, newName);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    moveWatchExpression(id, position) {
        this.model.moveWatchExpression(id, position);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    removeWatchExpressions(id) {
        this.model.removeWatchExpressions(id);
        this.debugStorage.storeWatchExpressions(this.model.getWatchExpressions());
    }
    //---- breakpoints
    canSetBreakpointsIn(model) {
        return this.adapterManager.canSetBreakpointsIn(model);
    }
    async enableOrDisableBreakpoints(enable, breakpoint) {
        if (breakpoint) {
            this.model.setEnablement(breakpoint, enable);
            this.debugStorage.storeBreakpoints(this.model);
            if (breakpoint instanceof Breakpoint) {
                await this.makeTriggeredBreakpointsMatchEnablement(enable, breakpoint);
                await this.sendBreakpoints(breakpoint.originalUri);
            }
            else if (breakpoint instanceof FunctionBreakpoint) {
                await this.sendFunctionBreakpoints();
            }
            else if (breakpoint instanceof DataBreakpoint) {
                await this.sendDataBreakpoints();
            }
            else if (breakpoint instanceof InstructionBreakpoint) {
                await this.sendInstructionBreakpoints();
            }
            else {
                await this.sendExceptionBreakpoints();
            }
        }
        else {
            this.model.enableOrDisableAllBreakpoints(enable);
            this.debugStorage.storeBreakpoints(this.model);
            await this.sendAllBreakpoints();
        }
        this.debugStorage.storeBreakpoints(this.model);
    }
    async addBreakpoints(uri, rawBreakpoints, ariaAnnounce = true) {
        const breakpoints = this.model.addBreakpoints(uri, rawBreakpoints);
        if (ariaAnnounce) {
            breakpoints.forEach((bp) => aria.status(nls.localize('breakpointAdded', 'Added breakpoint, line {0}, file {1}', bp.lineNumber, uri.fsPath)));
        }
        // In some cases we need to store breakpoints before we send them because sending them can take a long time
        // And after sending them because the debug adapter can attach adapter data to a breakpoint
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendBreakpoints(uri);
        this.debugStorage.storeBreakpoints(this.model);
        return breakpoints;
    }
    async updateBreakpoints(uri, data, sendOnResourceSaved) {
        this.model.updateBreakpoints(data);
        this.debugStorage.storeBreakpoints(this.model);
        if (sendOnResourceSaved) {
            this.breakpointsToSendOnResourceSaved.add(uri);
        }
        else {
            await this.sendBreakpoints(uri);
            this.debugStorage.storeBreakpoints(this.model);
        }
    }
    async removeBreakpoints(id) {
        const breakpoints = this.model.getBreakpoints();
        const toRemove = breakpoints.filter((bp) => !id || bp.getId() === id);
        // note: using the debugger-resolved uri for aria to reflect UI state
        toRemove.forEach((bp) => aria.status(nls.localize('breakpointRemoved', 'Removed breakpoint, line {0}, file {1}', bp.lineNumber, bp.uri.fsPath)));
        const urisToClear = new Set(toRemove.map((bp) => bp.originalUri.toString()));
        this.model.removeBreakpoints(toRemove);
        this.unlinkTriggeredBreakpoints(breakpoints, toRemove).forEach((uri) => urisToClear.add(uri.toString()));
        this.debugStorage.storeBreakpoints(this.model);
        await Promise.all([...urisToClear].map((uri) => this.sendBreakpoints(URI.parse(uri))));
    }
    setBreakpointsActivated(activated) {
        this.model.setBreakpointsActivated(activated);
        return this.sendAllBreakpoints();
    }
    async addFunctionBreakpoint(opts, id) {
        this.model.addFunctionBreakpoint(opts ?? { name: '' }, id);
        // If opts not provided, sending the breakpoint is handled by a later to call to `updateFunctionBreakpoint`
        if (opts) {
            this.debugStorage.storeBreakpoints(this.model);
            await this.sendFunctionBreakpoints();
            this.debugStorage.storeBreakpoints(this.model);
        }
    }
    async updateFunctionBreakpoint(id, update) {
        this.model.updateFunctionBreakpoint(id, update);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendFunctionBreakpoints();
    }
    async removeFunctionBreakpoints(id) {
        this.model.removeFunctionBreakpoints(id);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendFunctionBreakpoints();
    }
    async addDataBreakpoint(opts) {
        this.model.addDataBreakpoint(opts);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
        this.debugStorage.storeBreakpoints(this.model);
    }
    async updateDataBreakpoint(id, update) {
        this.model.updateDataBreakpoint(id, update);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
    }
    async removeDataBreakpoints(id) {
        this.model.removeDataBreakpoints(id);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendDataBreakpoints();
    }
    async addInstructionBreakpoint(opts) {
        this.model.addInstructionBreakpoint(opts);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendInstructionBreakpoints();
        this.debugStorage.storeBreakpoints(this.model);
    }
    async removeInstructionBreakpoints(instructionReference, offset) {
        this.model.removeInstructionBreakpoints(instructionReference, offset);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendInstructionBreakpoints();
    }
    setExceptionBreakpointFallbackSession(sessionId) {
        this.model.setExceptionBreakpointFallbackSession(sessionId);
        this.debugStorage.storeBreakpoints(this.model);
    }
    setExceptionBreakpointsForSession(session, filters) {
        this.model.setExceptionBreakpointsForSession(session.getId(), filters);
        this.debugStorage.storeBreakpoints(this.model);
    }
    async setExceptionBreakpointCondition(exceptionBreakpoint, condition) {
        this.model.setExceptionBreakpointCondition(exceptionBreakpoint, condition);
        this.debugStorage.storeBreakpoints(this.model);
        await this.sendExceptionBreakpoints();
    }
    async sendAllBreakpoints(session) {
        const setBreakpointsPromises = distinct(this.model.getBreakpoints(), (bp) => bp.originalUri.toString()).map((bp) => this.sendBreakpoints(bp.originalUri, false, session));
        // If sending breakpoints to one session which we know supports the configurationDone request, can make all requests in parallel
        if (session?.capabilities.supportsConfigurationDoneRequest) {
            await Promise.all([
                ...setBreakpointsPromises,
                this.sendFunctionBreakpoints(session),
                this.sendDataBreakpoints(session),
                this.sendInstructionBreakpoints(session),
                this.sendExceptionBreakpoints(session),
            ]);
        }
        else {
            await Promise.all(setBreakpointsPromises);
            await this.sendFunctionBreakpoints(session);
            await this.sendDataBreakpoints(session);
            await this.sendInstructionBreakpoints(session);
            // send exception breakpoints at the end since some debug adapters may rely on the order - this was the case before
            // the configurationDone request was introduced.
            await this.sendExceptionBreakpoints(session);
        }
    }
    /**
     * Removes the condition of triggered breakpoints that depended on
     * breakpoints in `removedBreakpoints`. Returns the URIs of resources that
     * had their breakpoints changed in this way.
     */
    unlinkTriggeredBreakpoints(allBreakpoints, removedBreakpoints) {
        const affectedUris = [];
        for (const removed of removedBreakpoints) {
            for (const existing of allBreakpoints) {
                if (!removedBreakpoints.includes(existing) && existing.triggeredBy === removed.getId()) {
                    this.model.updateBreakpoints(new Map([[existing.getId(), { triggeredBy: undefined }]]));
                    affectedUris.push(existing.originalUri);
                }
            }
        }
        return affectedUris;
    }
    async makeTriggeredBreakpointsMatchEnablement(enable, breakpoint) {
        if (enable) {
            /** If the breakpoint is being enabled, also ensure its triggerer is enabled */
            if (breakpoint.triggeredBy) {
                const trigger = this.model
                    .getBreakpoints()
                    .find((bp) => breakpoint.triggeredBy === bp.getId());
                if (trigger && !trigger.enabled) {
                    await this.enableOrDisableBreakpoints(enable, trigger);
                }
            }
        }
        /** Makes its triggeree states match the state of this breakpoint */
        await Promise.all(this.model
            .getBreakpoints()
            .filter((bp) => bp.triggeredBy === breakpoint.getId() && bp.enabled !== enable)
            .map((bp) => this.enableOrDisableBreakpoints(enable, bp)));
    }
    async sendBreakpoints(modelUri, sourceModified = false, session) {
        const breakpointsToSend = this.model.getBreakpoints({
            originalUri: modelUri,
            enabledOnly: true,
        });
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (!s.configuration.noDebug) {
                const sessionBps = breakpointsToSend.filter((bp) => !bp.triggeredBy || bp.getSessionDidTrigger(s.getId()));
                await s.sendBreakpoints(modelUri, sessionBps, sourceModified);
            }
        });
    }
    async sendFunctionBreakpoints(session) {
        const breakpointsToSend = this.model
            .getFunctionBreakpoints()
            .filter((fbp) => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsFunctionBreakpoints && !s.configuration.noDebug) {
                await s.sendFunctionBreakpoints(breakpointsToSend);
            }
        });
    }
    async sendDataBreakpoints(session) {
        const breakpointsToSend = this.model
            .getDataBreakpoints()
            .filter((fbp) => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsDataBreakpoints && !s.configuration.noDebug) {
                await s.sendDataBreakpoints(breakpointsToSend);
            }
        });
    }
    async sendInstructionBreakpoints(session) {
        const breakpointsToSend = this.model
            .getInstructionBreakpoints()
            .filter((fbp) => fbp.enabled && this.model.areBreakpointsActivated());
        await sendToOneOrAllSessions(this.model, session, async (s) => {
            if (s.capabilities.supportsInstructionBreakpoints && !s.configuration.noDebug) {
                await s.sendInstructionBreakpoints(breakpointsToSend);
            }
        });
    }
    sendExceptionBreakpoints(session) {
        return sendToOneOrAllSessions(this.model, session, async (s) => {
            const enabledExceptionBps = this.model
                .getExceptionBreakpointsForSession(s.getId())
                .filter((exb) => exb.enabled);
            if (s.capabilities.supportsConfigurationDoneRequest &&
                (!s.capabilities.exceptionBreakpointFilters ||
                    s.capabilities.exceptionBreakpointFilters.length === 0)) {
                // Only call `setExceptionBreakpoints` as specified in dap protocol #90001
                return;
            }
            if (!s.configuration.noDebug) {
                await s.sendExceptionBreakpoints(enabledExceptionBps);
            }
        });
    }
    onFileChanges(fileChangesEvent) {
        const toRemove = this.model
            .getBreakpoints()
            .filter((bp) => fileChangesEvent.contains(bp.originalUri, 2 /* FileChangeType.DELETED */));
        if (toRemove.length) {
            this.model.removeBreakpoints(toRemove);
        }
        const toSend = [];
        for (const uri of this.breakpointsToSendOnResourceSaved) {
            if (fileChangesEvent.contains(uri, 0 /* FileChangeType.UPDATED */)) {
                toSend.push(uri);
            }
        }
        for (const uri of toSend) {
            this.breakpointsToSendOnResourceSaved.delete(uri);
            this.sendBreakpoints(uri, true);
        }
    }
    async runTo(uri, lineNumber, column) {
        let breakpointToRemove;
        let threadToContinue = this.getViewModel().focusedThread;
        const addTempBreakPoint = async () => {
            const bpExists = !!this.getModel().getBreakpoints({ column, lineNumber, uri }).length;
            if (!bpExists) {
                const addResult = await this.addAndValidateBreakpoints(uri, lineNumber, column);
                if (addResult.thread) {
                    threadToContinue = addResult.thread;
                }
                if (addResult.breakpoint) {
                    breakpointToRemove = addResult.breakpoint;
                }
            }
            return { threadToContinue, breakpointToRemove };
        };
        const removeTempBreakPoint = (state) => {
            if (state === 2 /* State.Stopped */ || state === 0 /* State.Inactive */) {
                if (breakpointToRemove) {
                    this.removeBreakpoints(breakpointToRemove.getId());
                }
                return true;
            }
            return false;
        };
        await addTempBreakPoint();
        if (this.state === 0 /* State.Inactive */) {
            // If no session exists start the debugger
            const { launch, name, getConfig } = this.getConfigurationManager().selectedConfiguration;
            const config = await getConfig();
            const configOrName = config ? Object.assign(deepClone(config), {}) : name;
            const listener = this.onDidChangeState((state) => {
                if (removeTempBreakPoint(state)) {
                    listener.dispose();
                }
            });
            await this.startDebugging(launch, configOrName, undefined, true);
        }
        if (this.state === 2 /* State.Stopped */) {
            const focusedSession = this.getViewModel().focusedSession;
            if (!focusedSession || !threadToContinue) {
                return;
            }
            const listener = threadToContinue.session.onDidChangeState(() => {
                if (removeTempBreakPoint(focusedSession.state)) {
                    listener.dispose();
                }
            });
            await threadToContinue.continue();
        }
    }
    async addAndValidateBreakpoints(uri, lineNumber, column) {
        const debugModel = this.getModel();
        const viewModel = this.getViewModel();
        const breakpoints = await this.addBreakpoints(uri, [{ lineNumber, column }], false);
        const breakpoint = breakpoints?.[0];
        if (!breakpoint) {
            return { breakpoint: undefined, thread: viewModel.focusedThread };
        }
        // If the breakpoint was not initially verified, wait up to 2s for it to become so.
        // Inherently racey if multiple sessions can verify async, but not solvable...
        if (!breakpoint.verified) {
            let listener;
            await raceTimeout(new Promise((resolve) => {
                listener = debugModel.onDidChangeBreakpoints(() => {
                    if (breakpoint.verified) {
                        resolve();
                    }
                });
            }), 2000);
            listener.dispose();
        }
        // Look at paused threads for sessions that verified this bp. Prefer, in order:
        let Score;
        (function (Score) {
            /** The focused thread */
            Score[Score["Focused"] = 0] = "Focused";
            /** Any other stopped thread of a session that verified the bp */
            Score[Score["Verified"] = 1] = "Verified";
            /** Any thread that verified and paused in the same file */
            Score[Score["VerifiedAndPausedInFile"] = 2] = "VerifiedAndPausedInFile";
            /** The focused thread if it verified the breakpoint */
            Score[Score["VerifiedAndFocused"] = 3] = "VerifiedAndFocused";
        })(Score || (Score = {}));
        let bestThread = viewModel.focusedThread;
        let bestScore = 0 /* Score.Focused */;
        for (const sessionId of breakpoint.sessionsThatVerified) {
            const session = debugModel.getSession(sessionId);
            if (!session) {
                continue;
            }
            const threads = session.getAllThreads().filter((t) => t.stopped);
            if (bestScore < 3 /* Score.VerifiedAndFocused */) {
                if (viewModel.focusedThread && threads.includes(viewModel.focusedThread)) {
                    bestThread = viewModel.focusedThread;
                    bestScore = 3 /* Score.VerifiedAndFocused */;
                }
            }
            if (bestScore < 2 /* Score.VerifiedAndPausedInFile */) {
                const pausedInThisFile = threads.find((t) => {
                    const top = t.getTopStackFrame();
                    return top && this.uriIdentityService.extUri.isEqual(top.source.uri, uri);
                });
                if (pausedInThisFile) {
                    bestThread = pausedInThisFile;
                    bestScore = 2 /* Score.VerifiedAndPausedInFile */;
                }
            }
            if (bestScore < 1 /* Score.Verified */) {
                bestThread = threads[0];
                bestScore = 2 /* Score.VerifiedAndPausedInFile */;
            }
        }
        return { thread: bestThread, breakpoint };
    }
};
DebugService = __decorate([
    __param(0, IEditorService),
    __param(1, IPaneCompositePartService),
    __param(2, IViewsService),
    __param(3, IViewDescriptorService),
    __param(4, INotificationService),
    __param(5, IDialogService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IWorkspaceContextService),
    __param(8, IContextKeyService),
    __param(9, ILifecycleService),
    __param(10, IInstantiationService),
    __param(11, IExtensionService),
    __param(12, IFileService),
    __param(13, IConfigurationService),
    __param(14, IExtensionHostDebugService),
    __param(15, IActivityService),
    __param(16, ICommandService),
    __param(17, IQuickInputService),
    __param(18, IWorkspaceTrustRequestService),
    __param(19, IUriIdentityService),
    __param(20, ITestService)
], DebugService);
export { DebugService };
export function getStackFrameThreadAndSessionToFocus(model, stackFrame, thread, session, avoidSession) {
    if (!session) {
        if (stackFrame || thread) {
            session = stackFrame ? stackFrame.thread.session : thread.session;
        }
        else {
            const sessions = model.getSessions();
            const stoppedSession = sessions.find((s) => s.state === 2 /* State.Stopped */);
            // Make sure to not focus session that is going down
            session =
                stoppedSession ||
                    sessions.find((s) => s !== avoidSession && s !== avoidSession?.parentSession) ||
                    (sessions.length ? sessions[0] : undefined);
        }
    }
    if (!thread) {
        if (stackFrame) {
            thread = stackFrame.thread;
        }
        else {
            const threads = session ? session.getAllThreads() : undefined;
            const stoppedThread = threads && threads.find((t) => t.stopped);
            thread = stoppedThread || (threads && threads.length ? threads[0] : undefined);
        }
    }
    if (!stackFrame && thread) {
        stackFrame = thread.getTopStackFrame();
    }
    return { session, thread, stackFrame };
}
async function sendToOneOrAllSessions(model, session, send) {
    if (session) {
        await send(session);
    }
    else {
        await Promise.all(model.getSessions().map((s) => send(s)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzVFLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFjLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUxRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8s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