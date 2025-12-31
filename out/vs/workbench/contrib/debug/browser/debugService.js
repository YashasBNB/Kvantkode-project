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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBYyxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFMUUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RB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