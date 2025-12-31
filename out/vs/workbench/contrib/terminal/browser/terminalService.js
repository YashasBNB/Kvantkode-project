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
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import * as cssValue from '../../../../base/browser/cssValue.js';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { debounce, memoize } from '../../../../base/common/decorators.js';
import { DynamicListEventMultiplexer, Emitter, Event, } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ITerminalLogService, TerminalExitReason, TerminalLocation, TitleEventSource, } from '../../../../platform/terminal/common/terminal.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { iconForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService, } from './terminal.js';
import { getCwdForSplit } from './terminalActions.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { getColorStyleContent, getUriClasses } from './terminalIcon.js';
import { TerminalProfileQuickpick } from './terminalProfileQuickpick.js';
import { getInstanceFromResource, getTerminalUri, parseTerminalUri } from './terminalUri.js';
import { ITerminalProfileService, TERMINAL_VIEW_ID, } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { columnToEditorGroup } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { AUX_WINDOW_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ILifecycleService, } from '../../../services/lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { XtermTerminal } from './xterm/xtermTerminal.js';
import { TerminalInstance } from './terminalInstance.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { TerminalCapabilityStore } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { mark } from '../../../../base/common/performance.js';
import { DetachedTerminal } from './detachedTerminal.js';
import { createInstanceCapabilityEventMultiplexer } from './terminalEvents.js';
import { mainWindow } from '../../../../base/browser/window.js';
let TerminalService = class TerminalService extends Disposable {
    get isProcessSupportRegistered() {
        return !!this._processSupportContextKey.get();
    }
    get connectionState() {
        return this._connectionState;
    }
    get whenConnected() {
        return this._whenConnected.p;
    }
    get restoredGroupCount() {
        return this._restoredGroupCount;
    }
    get instances() {
        return this._terminalGroupService.instances
            .concat(this._terminalEditorService.instances)
            .concat(this._backgroundedTerminalInstances);
    }
    /** Gets all non-background terminals. */
    get foregroundInstances() {
        return this._terminalGroupService.instances.concat(this._terminalEditorService.instances);
    }
    get detachedInstances() {
        return this._detachedXterms;
    }
    getReconnectedTerminals(reconnectionOwner) {
        return this._reconnectedTerminals.get(reconnectionOwner);
    }
    get defaultLocation() {
        return this._terminalConfigurationService.config.defaultLocation ===
            "editor" /* TerminalLocationString.Editor */
            ? TerminalLocation.Editor
            : TerminalLocation.Panel;
    }
    get activeInstance() {
        // Check if either an editor or panel terminal has focus and return that, regardless of the
        // value of _activeInstance. This avoids terminals created in the panel for example stealing
        // the active status even when it's not focused.
        for (const activeHostTerminal of this._hostActiveTerminals.values()) {
            if (activeHostTerminal?.hasFocus) {
                return activeHostTerminal;
            }
        }
        // Fallback to the last recorded active terminal if neither have focus
        return this._activeInstance;
    }
    get onDidCreateInstance() {
        return this._onDidCreateInstance.event;
    }
    get onDidChangeInstanceDimensions() {
        return this._onDidChangeInstanceDimensions.event;
    }
    get onDidRegisterProcessSupport() {
        return this._onDidRegisterProcessSupport.event;
    }
    get onDidChangeConnectionState() {
        return this._onDidChangeConnectionState.event;
    }
    get onDidRequestStartExtensionTerminal() {
        return this._onDidRequestStartExtensionTerminal.event;
    }
    get onDidDisposeInstance() {
        return this._onDidDisposeInstance.event;
    }
    get onDidFocusInstance() {
        return this._onDidFocusInstance.event;
    }
    get onDidChangeActiveInstance() {
        return this._onDidChangeActiveInstance.event;
    }
    get onDidChangeInstances() {
        return this._onDidChangeInstances.event;
    }
    get onDidChangeInstanceCapability() {
        return this._onDidChangeInstanceCapability.event;
    }
    get onDidChangeActiveGroup() {
        return this._onDidChangeActiveGroup.event;
    }
    // Lazily initialized events that fire when the specified event fires on _any_ terminal
    // TODO: Batch events
    get onAnyInstanceData() {
        return this._register(this.createOnInstanceEvent((instance) => Event.map(instance.onData, (data) => ({ instance, data })))).event;
    }
    get onAnyInstanceDataInput() {
        return this._register(this.createOnInstanceEvent((e) => Event.map(e.onDidInputData, () => e, e.store))).event;
    }
    get onAnyInstanceIconChange() {
        return this._register(this.createOnInstanceEvent((e) => e.onIconChanged)).event;
    }
    get onAnyInstanceMaximumDimensionsChange() {
        return this._register(this.createOnInstanceEvent((e) => Event.map(e.onMaximumDimensionsChanged, () => e, e.store))).event;
    }
    get onAnyInstancePrimaryStatusChange() {
        return this._register(this.createOnInstanceEvent((e) => Event.map(e.statusList.onDidChangePrimaryStatus, () => e, e.store))).event;
    }
    get onAnyInstanceProcessIdReady() {
        return this._register(this.createOnInstanceEvent((e) => e.onProcessIdReady)).event;
    }
    get onAnyInstanceSelectionChange() {
        return this._register(this.createOnInstanceEvent((e) => e.onDidChangeSelection)).event;
    }
    get onAnyInstanceTitleChange() {
        return this._register(this.createOnInstanceEvent((e) => e.onTitleChanged)).event;
    }
    get onAnyInstanceShellTypeChanged() {
        return this._register(this.createOnInstanceEvent((e) => Event.map(e.onDidChangeShellType, () => e))).event;
    }
    get onAnyInstanceAddedCapabilityType() {
        return this._register(this.createOnInstanceEvent((e) => e.capabilities.onDidAddCapabilityType))
            .event;
    }
    constructor(_contextKeyService, _lifecycleService, _logService, _dialogService, _instantiationService, _remoteAgentService, _viewsService, _configurationService, _terminalConfigService, _environmentService, _terminalConfigurationService, _terminalEditorService, _terminalGroupService, _terminalInstanceService, _editorGroupsService, _terminalProfileService, _extensionService, _notificationService, _workspaceContextService, _commandService, _keybindingService, _timerService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._lifecycleService = _lifecycleService;
        this._logService = _logService;
        this._dialogService = _dialogService;
        this._instantiationService = _instantiationService;
        this._remoteAgentService = _remoteAgentService;
        this._viewsService = _viewsService;
        this._configurationService = _configurationService;
        this._terminalConfigService = _terminalConfigService;
        this._environmentService = _environmentService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        this._terminalInstanceService = _terminalInstanceService;
        this._editorGroupsService = _editorGroupsService;
        this._terminalProfileService = _terminalProfileService;
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._workspaceContextService = _workspaceContextService;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._timerService = _timerService;
        this._hostActiveTerminals = new Map();
        this._detachedXterms = new Set();
        this._isShuttingDown = false;
        this._backgroundedTerminalInstances = [];
        this._backgroundedTerminalDisposables = new Map();
        this._connectionState = 0 /* TerminalConnectionState.Connecting */;
        this._whenConnected = new DeferredPromise();
        this._restoredGroupCount = 0;
        this._reconnectedTerminals = new Map();
        this._onDidCreateInstance = this._register(new Emitter());
        this._onDidChangeInstanceDimensions = this._register(new Emitter());
        this._onDidRegisterProcessSupport = this._register(new Emitter());
        this._onDidChangeConnectionState = this._register(new Emitter());
        this._onDidRequestStartExtensionTerminal = this._register(new Emitter());
        // ITerminalInstanceHost events
        this._onDidDisposeInstance = this._register(new Emitter());
        this._onDidFocusInstance = this._register(new Emitter());
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this._onDidChangeInstances = this._register(new Emitter());
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        // Terminal view events
        this._onDidChangeActiveGroup = this._register(new Emitter());
        // the below avoids having to poll routinely.
        // we update detected profiles when an instance is created so that,
        // for example, we detect if you've installed a pwsh
        this._register(this.onDidCreateInstance(() => this._terminalProfileService.refreshAvailableProfiles()));
        this._forwardInstanceHostEvents(this._terminalGroupService);
        this._forwardInstanceHostEvents(this._terminalEditorService);
        this._register(this._terminalGroupService.onDidChangeActiveGroup(this._onDidChangeActiveGroup.fire, this._onDidChangeActiveGroup));
        this._register(this._terminalInstanceService.onDidCreateInstance((instance) => {
            this._initInstanceListeners(instance);
            this._onDidCreateInstance.fire(instance);
        }));
        // Hide the panel if there are no more instances, provided that VS Code is not shutting
        // down. When shutting down the panel is locked in place so that it is restored upon next
        // launch.
        this._register(this._terminalGroupService.onDidChangeActiveInstance((instance) => {
            if (!instance &&
                !this._isShuttingDown &&
                this._terminalConfigService.config.hideOnLastClosed) {
                this._terminalGroupService.hidePanel();
            }
            if (instance?.shellType) {
                this._terminalShellTypeContextKey.set(instance.shellType.toString());
            }
            else if (!instance || !instance.shellType) {
                this._terminalShellTypeContextKey.reset();
            }
        }));
        this._handleInstanceContextKeys();
        this._terminalShellTypeContextKey = TerminalContextKeys.shellType.bindTo(this._contextKeyService);
        this._processSupportContextKey = TerminalContextKeys.processSupported.bindTo(this._contextKeyService);
        this._processSupportContextKey.set(!isWeb || this._remoteAgentService.getConnection() !== null);
        this._terminalHasBeenCreated = TerminalContextKeys.terminalHasBeenCreated.bindTo(this._contextKeyService);
        this._terminalCountContextKey = TerminalContextKeys.count.bindTo(this._contextKeyService);
        this._terminalEditorActive = TerminalContextKeys.terminalEditorActive.bindTo(this._contextKeyService);
        this._register(this.onDidChangeActiveInstance((instance) => {
            this._terminalEditorActive.set(!!instance?.target && instance.target === TerminalLocation.Editor);
        }));
        this._register(_lifecycleService.onBeforeShutdown(async (e) => e.veto(this._onBeforeShutdown(e.reason), 'veto.terminal')));
        this._register(_lifecycleService.onWillShutdown((e) => this._onWillShutdown(e)));
        this._initializePrimaryBackend();
        // Create async as the class depends on `this`
        timeout(0).then(() => this._register(this._instantiationService.createInstance(TerminalEditorStyle, mainWindow.document.head)));
    }
    async showProfileQuickPick(type, cwd) {
        const quickPick = this._instantiationService.createInstance(TerminalProfileQuickpick);
        const result = await quickPick.showAndGetResult(type);
        if (!result) {
            return;
        }
        if (typeof result === 'string') {
            return;
        }
        const keyMods = result.keyMods;
        if (type === 'createInstance') {
            const activeInstance = this.getDefaultInstanceHost().activeInstance;
            let instance;
            if (result.config && 'id' in result?.config) {
                await this.createContributedTerminalProfile(result.config.extensionIdentifier, result.config.id, {
                    icon: result.config.options?.icon,
                    color: result.config.options?.color,
                    location: !!(keyMods?.alt && activeInstance)
                        ? { splitActiveTerminal: true }
                        : this.defaultLocation,
                });
                return;
            }
            else if (result.config && 'profileName' in result.config) {
                if (keyMods?.alt && activeInstance) {
                    // create split, only valid if there's an active instance
                    instance = await this.createTerminal({
                        location: { parentTerminal: activeInstance },
                        config: result.config,
                        cwd,
                    });
                }
                else {
                    instance = await this.createTerminal({
                        location: this.defaultLocation,
                        config: result.config,
                        cwd,
                    });
                }
            }
            if (instance && this.defaultLocation !== TerminalLocation.Editor) {
                this._terminalGroupService.showPanel(true);
                this.setActiveInstance(instance);
                return instance;
            }
        }
        return undefined;
    }
    async _initializePrimaryBackend() {
        mark('code/terminal/willGetTerminalBackend');
        this._primaryBackend = await this._terminalInstanceService.getBackend(this._environmentService.remoteAuthority);
        mark('code/terminal/didGetTerminalBackend');
        const enableTerminalReconnection = this._terminalConfigurationService.config.enablePersistentSessions;
        // Connect to the extension host if it's there, set the connection state to connected when
        // it's done. This should happen even when there is no extension host.
        this._connectionState = 0 /* TerminalConnectionState.Connecting */;
        const isPersistentRemote = !!this._environmentService.remoteAuthority && enableTerminalReconnection;
        if (this._primaryBackend) {
            this._register(this._primaryBackend.onDidRequestDetach(async (e) => {
                const instanceToDetach = this.getInstanceFromResource(getTerminalUri(e.workspaceId, e.instanceId));
                if (instanceToDetach) {
                    const persistentProcessId = instanceToDetach?.persistentProcessId;
                    if (persistentProcessId &&
                        !instanceToDetach.shellLaunchConfig.isFeatureTerminal &&
                        !instanceToDetach.shellLaunchConfig.customPtyImplementation) {
                        if (instanceToDetach.target === TerminalLocation.Editor) {
                            this._terminalEditorService.detachInstance(instanceToDetach);
                        }
                        else {
                            this._terminalGroupService
                                .getGroupForInstance(instanceToDetach)
                                ?.removeInstance(instanceToDetach);
                        }
                        await instanceToDetach.detachProcessAndDispose(TerminalExitReason.User);
                        await this._primaryBackend?.acceptDetachInstanceReply(e.requestId, persistentProcessId);
                    }
                    else {
                        // will get rejected without a persistentProcessId to attach to
                        await this._primaryBackend?.acceptDetachInstanceReply(e.requestId, undefined);
                    }
                }
            }));
        }
        mark('code/terminal/willReconnect');
        let reconnectedPromise;
        if (isPersistentRemote) {
            reconnectedPromise = this._reconnectToRemoteTerminals();
        }
        else if (enableTerminalReconnection) {
            reconnectedPromise = this._reconnectToLocalTerminals();
        }
        else {
            reconnectedPromise = Promise.resolve();
        }
        reconnectedPromise.then(async () => {
            this._setConnected();
            mark('code/terminal/didReconnect');
            mark('code/terminal/willReplay');
            const instances = (await this._reconnectedTerminalGroups?.then((groups) => groups.map((e) => e.terminalInstances).flat())) ?? [];
            await Promise.all(instances.map((e) => new Promise((r) => Event.once(e.onProcessReplayComplete)(r))));
            mark('code/terminal/didReplay');
            mark('code/terminal/willGetPerformanceMarks');
            await Promise.all(Array.from(this._terminalInstanceService.getRegisteredBackends()).map(async (backend) => {
                this._timerService.setPerformanceMarks(backend.remoteAuthority === undefined ? 'localPtyHost' : 'remotePtyHost', await backend.getPerformanceMarks());
                backend.setReady();
            }));
            mark('code/terminal/didGetPerformanceMarks');
            this._whenConnected.complete();
        });
    }
    getPrimaryBackend() {
        return this._primaryBackend;
    }
    _forwardInstanceHostEvents(host) {
        this._register(host.onDidChangeInstances(this._onDidChangeInstances.fire, this._onDidChangeInstances));
        this._register(host.onDidDisposeInstance(this._onDidDisposeInstance.fire, this._onDidDisposeInstance));
        this._register(host.onDidChangeActiveInstance((instance) => this._evaluateActiveInstance(host, instance)));
        this._register(host.onDidFocusInstance((instance) => {
            this._onDidFocusInstance.fire(instance);
            this._evaluateActiveInstance(host, instance);
        }));
        this._register(host.onDidChangeInstanceCapability((instance) => {
            this._onDidChangeInstanceCapability.fire(instance);
        }));
        this._hostActiveTerminals.set(host, undefined);
    }
    _evaluateActiveInstance(host, instance) {
        // Track the latest active terminal for each host so that when one becomes undefined, the
        // TerminalService's active terminal is set to the last active terminal from the other host.
        // This means if the last terminal editor is closed such that it becomes undefined, the last
        // active group's terminal will be used as the active terminal if available.
        this._hostActiveTerminals.set(host, instance);
        if (instance === undefined) {
            for (const active of this._hostActiveTerminals.values()) {
                if (active) {
                    instance = active;
                }
            }
        }
        this._activeInstance = instance;
        this._onDidChangeActiveInstance.fire(instance);
    }
    setActiveInstance(value) {
        // If this was a hideFromUser terminal created by the API this was triggered by show,
        // in which case we need to create the terminal group
        if (value.shellLaunchConfig.hideFromUser) {
            this._showBackgroundTerminal(value);
        }
        if (value.target === TerminalLocation.Editor) {
            this._terminalEditorService.setActiveInstance(value);
        }
        else {
            this._terminalGroupService.setActiveInstance(value);
        }
    }
    async focusInstance(instance) {
        if (instance.target === TerminalLocation.Editor) {
            return this._terminalEditorService.focusInstance(instance);
        }
        return this._terminalGroupService.focusInstance(instance);
    }
    async focusActiveInstance() {
        if (!this._activeInstance) {
            return;
        }
        return this.focusInstance(this._activeInstance);
    }
    async createContributedTerminalProfile(extensionIdentifier, id, options) {
        await this._extensionService.activateByEvent(`onTerminalProfile:${id}`);
        const profileProvider = this._terminalProfileService.getContributedProfileProvider(extensionIdentifier, id);
        if (!profileProvider) {
            this._notificationService.error(`No terminal profile provider registered for id "${id}"`);
            return;
        }
        try {
            await profileProvider.createContributedTerminalProfile(options);
            this._terminalGroupService.setActiveInstanceByIndex(this._terminalGroupService.instances.length - 1);
            await this._terminalGroupService.activeInstance?.focusWhenReady();
        }
        catch (e) {
            this._notificationService.error(e.message);
        }
    }
    async safeDisposeTerminal(instance) {
        // Confirm on kill in the editor is handled by the editor input
        if (instance.target !== TerminalLocation.Editor &&
            instance.hasChildProcesses &&
            (this._terminalConfigurationService.config.confirmOnKill === 'panel' ||
                this._terminalConfigurationService.config.confirmOnKill === 'always')) {
            const veto = await this._showTerminalCloseConfirmation(true);
            if (veto) {
                return;
            }
        }
        return new Promise((r) => {
            Event.once(instance.onExit)(() => r());
            instance.dispose(TerminalExitReason.User);
        });
    }
    _setConnected() {
        this._connectionState = 1 /* TerminalConnectionState.Connected */;
        this._onDidChangeConnectionState.fire();
        this._logService.trace('Pty host ready');
    }
    async _reconnectToRemoteTerminals() {
        const remoteAuthority = this._environmentService.remoteAuthority;
        if (!remoteAuthority) {
            return;
        }
        const backend = await this._terminalInstanceService.getBackend(remoteAuthority);
        if (!backend) {
            return;
        }
        mark('code/terminal/willGetTerminalLayoutInfo');
        const layoutInfo = await backend.getTerminalLayoutInfo();
        mark('code/terminal/didGetTerminalLayoutInfo');
        backend.reduceConnectionGraceTime();
        mark('code/terminal/willRecreateTerminalGroups');
        await this._recreateTerminalGroups(layoutInfo);
        mark('code/terminal/didRecreateTerminalGroups');
        // now that terminals have been restored,
        // attach listeners to update remote when terminals are changed
        this._attachProcessLayoutListeners();
        this._logService.trace('Reconnected to remote terminals');
    }
    async _reconnectToLocalTerminals() {
        const localBackend = await this._terminalInstanceService.getBackend();
        if (!localBackend) {
            return;
        }
        mark('code/terminal/willGetTerminalLayoutInfo');
        const layoutInfo = await localBackend.getTerminalLayoutInfo();
        mark('code/terminal/didGetTerminalLayoutInfo');
        if (layoutInfo && layoutInfo.tabs.length > 0) {
            mark('code/terminal/willRecreateTerminalGroups');
            this._reconnectedTerminalGroups = this._recreateTerminalGroups(layoutInfo);
            mark('code/terminal/didRecreateTerminalGroups');
        }
        // now that terminals have been restored,
        // attach listeners to update local state when terminals are changed
        this._attachProcessLayoutListeners();
        this._logService.trace('Reconnected to local terminals');
    }
    _recreateTerminalGroups(layoutInfo) {
        const groupPromises = [];
        let activeGroup;
        if (layoutInfo) {
            for (const tabLayout of layoutInfo.tabs) {
                const terminalLayouts = tabLayout.terminals.filter((t) => t.terminal && t.terminal.isOrphan);
                if (terminalLayouts.length) {
                    this._restoredGroupCount += terminalLayouts.length;
                    const promise = this._recreateTerminalGroup(tabLayout, terminalLayouts);
                    groupPromises.push(promise);
                    if (tabLayout.isActive) {
                        activeGroup = promise;
                    }
                    const activeInstance = this.instances.find((t) => t.shellLaunchConfig.attachPersistentProcess?.id ===
                        tabLayout.activePersistentProcessId);
                    if (activeInstance) {
                        this.setActiveInstance(activeInstance);
                    }
                }
            }
            if (layoutInfo.tabs.length) {
                activeGroup?.then((group) => (this._terminalGroupService.activeGroup = group));
            }
        }
        return Promise.all(groupPromises).then((result) => result.filter((e) => !!e));
    }
    async _recreateTerminalGroup(tabLayout, terminalLayouts) {
        let lastInstance;
        for (const terminalLayout of terminalLayouts) {
            const attachPersistentProcess = terminalLayout.terminal;
            if (this._lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */ &&
                attachPersistentProcess.type === 'Task') {
                continue;
            }
            mark(`code/terminal/willRecreateTerminal/${attachPersistentProcess.id}-${attachPersistentProcess.pid}`);
            lastInstance = this.createTerminal({
                config: { attachPersistentProcess },
                location: lastInstance ? { parentTerminal: lastInstance } : TerminalLocation.Panel,
            });
            lastInstance.then(() => mark(`code/terminal/didRecreateTerminal/${attachPersistentProcess.id}-${attachPersistentProcess.pid}`));
        }
        const group = lastInstance?.then((instance) => {
            const g = this._terminalGroupService.getGroupForInstance(instance);
            g?.resizePanes(tabLayout.terminals.map((terminal) => terminal.relativeSize));
            return g;
        });
        return group;
    }
    _attachProcessLayoutListeners() {
        this._register(this.onDidChangeActiveGroup(() => this._saveState()));
        this._register(this.onDidChangeActiveInstance(() => this._saveState()));
        this._register(this.onDidChangeInstances(() => this._saveState()));
        // The state must be updated when the terminal is relaunched, otherwise the persistent
        // terminal ID will be stale and the process will be leaked.
        this._register(this.onAnyInstanceProcessIdReady(() => this._saveState()));
        this._register(this.onAnyInstanceTitleChange((instance) => this._updateTitle(instance)));
        this._register(this.onAnyInstanceIconChange((e) => this._updateIcon(e.instance, e.userInitiated)));
    }
    _handleInstanceContextKeys() {
        const terminalIsOpenContext = TerminalContextKeys.isOpen.bindTo(this._contextKeyService);
        const updateTerminalContextKeys = () => {
            terminalIsOpenContext.set(this.instances.length > 0);
            this._terminalCountContextKey.set(this.instances.length);
        };
        this._register(this.onDidChangeInstances(() => updateTerminalContextKeys()));
    }
    async getActiveOrCreateInstance(options) {
        const activeInstance = this.activeInstance;
        // No instance, create
        if (!activeInstance) {
            return this.createTerminal();
        }
        // Active instance, ensure accepts input
        if (!options?.acceptsInput || activeInstance.xterm?.isStdinDisabled !== true) {
            return activeInstance;
        }
        // Active instance doesn't accept input, create and focus
        const instance = await this.createTerminal();
        this.setActiveInstance(instance);
        await this.revealActiveTerminal();
        return instance;
    }
    async revealTerminal(source, preserveFocus) {
        if (source.target === TerminalLocation.Editor) {
            await this._terminalEditorService.revealActiveEditor(preserveFocus);
        }
        else {
            await this._terminalGroupService.showPanel();
        }
    }
    async revealActiveTerminal(preserveFocus) {
        const instance = this.activeInstance;
        if (!instance) {
            return;
        }
        await this.revealTerminal(instance, preserveFocus);
    }
    setEditable(instance, data) {
        if (!data) {
            this._editable = undefined;
        }
        else {
            this._editable = { instance: instance, data };
        }
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        const isEditing = this.isEditable(instance);
        pane?.terminalTabbedView?.setEditable(isEditing);
    }
    isEditable(instance) {
        return !!this._editable && (this._editable.instance === instance || !instance);
    }
    getEditableData(instance) {
        return this._editable && this._editable.instance === instance ? this._editable.data : undefined;
    }
    requestStartExtensionTerminal(proxy, cols, rows) {
        // The initial request came from the extension host, no need to wait for it
        return new Promise((callback) => {
            this._onDidRequestStartExtensionTerminal.fire({ proxy, cols, rows, callback });
        });
    }
    _onBeforeShutdown(reason) {
        // Never veto on web as this would block all windows from being closed. This disables
        // process revive as we can't handle it on shutdown.
        if (isWeb) {
            this._isShuttingDown = true;
            return false;
        }
        return this._onBeforeShutdownAsync(reason);
    }
    async _onBeforeShutdownAsync(reason) {
        if (this.instances.length === 0) {
            // No terminal instances, don't veto
            return false;
        }
        // Persist terminal _buffer state_, note that even if this happens the dirty terminal prompt
        // still shows as that cannot be revived
        try {
            this._shutdownWindowCount = await this._nativeDelegate?.getWindowCount();
            const shouldReviveProcesses = this._shouldReviveProcesses(reason);
            if (shouldReviveProcesses) {
                // Attempt to persist the terminal state but only allow 2000ms as we can't block
                // shutdown. This can happen when in a remote workspace but the other side has been
                // suspended and is in the process of reconnecting, the message will be put in a
                // queue in this case for when the connection is back up and running. Aborting the
                // process is preferable in this case.
                await Promise.race([this._primaryBackend?.persistTerminalState(), timeout(2000)]);
            }
            // Persist terminal _processes_
            const shouldPersistProcesses = this._terminalConfigurationService.config.enablePersistentSessions &&
                reason === 3 /* ShutdownReason.RELOAD */;
            if (!shouldPersistProcesses) {
                const hasDirtyInstances = (this._terminalConfigurationService.config.confirmOnExit === 'always' &&
                    this.foregroundInstances.length > 0) ||
                    (this._terminalConfigurationService.config.confirmOnExit === 'hasChildProcesses' &&
                        this.foregroundInstances.some((e) => e.hasChildProcesses));
                if (hasDirtyInstances) {
                    return this._onBeforeShutdownConfirmation(reason);
                }
            }
        }
        catch (err) {
            // Swallow as exceptions should not cause a veto to prevent shutdown
            this._logService.warn('Exception occurred during terminal shutdown', err);
        }
        this._isShuttingDown = true;
        return false;
    }
    setNativeDelegate(nativeDelegate) {
        this._nativeDelegate = nativeDelegate;
    }
    _shouldReviveProcesses(reason) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions) {
            return false;
        }
        switch (this._terminalConfigurationService.config.persistentSessionReviveProcess) {
            case 'onExit': {
                // Allow on close if it's the last window on Windows or Linux
                if (reason === 1 /* ShutdownReason.CLOSE */ && this._shutdownWindowCount === 1 && !isMacintosh) {
                    return true;
                }
                return reason === 4 /* ShutdownReason.LOAD */ || reason === 2 /* ShutdownReason.QUIT */;
            }
            case 'onExitAndWindowClose':
                return reason !== 3 /* ShutdownReason.RELOAD */;
            default:
                return false;
        }
    }
    async _onBeforeShutdownConfirmation(reason) {
        // veto if configured to show confirmation and the user chose not to exit
        const veto = await this._showTerminalCloseConfirmation();
        if (!veto) {
            this._isShuttingDown = true;
        }
        return veto;
    }
    _onWillShutdown(e) {
        // Don't touch processes if the shutdown was a result of reload as they will be reattached
        const shouldPersistTerminals = this._terminalConfigurationService.config.enablePersistentSessions &&
            e.reason === 3 /* ShutdownReason.RELOAD */;
        for (const instance of [
            ...this._terminalGroupService.instances,
            ...this._backgroundedTerminalInstances,
        ]) {
            if (shouldPersistTerminals && instance.shouldPersist) {
                instance.detachProcessAndDispose(TerminalExitReason.Shutdown);
            }
            else {
                instance.dispose(TerminalExitReason.Shutdown);
            }
        }
        // Clear terminal layout info only when not persisting
        if (!shouldPersistTerminals && !this._shouldReviveProcesses(e.reason)) {
            this._primaryBackend?.setTerminalLayoutInfo(undefined);
        }
    }
    _saveState() {
        // Avoid saving state when shutting down as that would override process state to be revived
        if (this._isShuttingDown) {
            return;
        }
        if (!this._terminalConfigurationService.config.enablePersistentSessions) {
            return;
        }
        const tabs = this._terminalGroupService.groups.map((g) => g.getLayoutInfo(g === this._terminalGroupService.activeGroup));
        const state = { tabs };
        this._primaryBackend?.setTerminalLayoutInfo(state);
    }
    _updateTitle(instance) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions ||
            !instance ||
            !instance.persistentProcessId ||
            !instance.title ||
            instance.isDisposed) {
            return;
        }
        if (instance.staticTitle) {
            this._primaryBackend?.updateTitle(instance.persistentProcessId, instance.staticTitle, TitleEventSource.Api);
        }
        else {
            this._primaryBackend?.updateTitle(instance.persistentProcessId, instance.title, instance.titleSource);
        }
    }
    _updateIcon(instance, userInitiated) {
        if (!this._terminalConfigurationService.config.enablePersistentSessions ||
            !instance ||
            !instance.persistentProcessId ||
            !instance.icon ||
            instance.isDisposed) {
            return;
        }
        this._primaryBackend?.updateIcon(instance.persistentProcessId, userInitiated, instance.icon, instance.color);
    }
    refreshActiveGroup() {
        this._onDidChangeActiveGroup.fire(this._terminalGroupService.activeGroup);
    }
    getInstanceFromId(terminalId) {
        let bgIndex = -1;
        this._backgroundedTerminalInstances.forEach((terminalInstance, i) => {
            if (terminalInstance.instanceId === terminalId) {
                bgIndex = i;
            }
        });
        if (bgIndex !== -1) {
            return this._backgroundedTerminalInstances[bgIndex];
        }
        try {
            return this.instances[this._getIndexFromId(terminalId)];
        }
        catch {
            return undefined;
        }
    }
    getInstanceFromIndex(terminalIndex) {
        return this.instances[terminalIndex];
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    isAttachedToTerminal(remoteTerm) {
        return this.instances.some((term) => term.processId === remoteTerm.pid);
    }
    moveToEditor(source, group) {
        if (source.target === TerminalLocation.Editor) {
            return;
        }
        const sourceGroup = this._terminalGroupService.getGroupForInstance(source);
        if (!sourceGroup) {
            return;
        }
        sourceGroup.removeInstance(source);
        this._terminalEditorService.openEditor(source, group ? { viewColumn: group } : undefined);
    }
    moveIntoNewEditor(source) {
        this.moveToEditor(source, AUX_WINDOW_GROUP);
    }
    async moveToTerminalView(source, target, side) {
        if (URI.isUri(source)) {
            source = this.getInstanceFromResource(source);
        }
        if (!source) {
            return;
        }
        this._terminalEditorService.detachInstance(source);
        if (source.target !== TerminalLocation.Editor) {
            await this._terminalGroupService.showPanel(true);
            return;
        }
        source.target = TerminalLocation.Panel;
        let group;
        if (target) {
            group = this._terminalGroupService.getGroupForInstance(target);
        }
        if (!group) {
            group = this._terminalGroupService.createGroup();
        }
        group.addInstance(source);
        this.setActiveInstance(source);
        await this._terminalGroupService.showPanel(true);
        if (target && side) {
            const index = group.terminalInstances.indexOf(target) + (side === 'after' ? 1 : 0);
            group.moveInstance(source, index, side);
        }
        // Fire events
        this._onDidChangeInstances.fire();
        this._onDidChangeActiveGroup.fire(this._terminalGroupService.activeGroup);
    }
    _initInstanceListeners(instance) {
        const instanceDisposables = new DisposableStore();
        instanceDisposables.add(instance.onDimensionsChanged(() => {
            this._onDidChangeInstanceDimensions.fire(instance);
            if (this._terminalConfigurationService.config.enablePersistentSessions &&
                this.isProcessSupportRegistered) {
                this._saveState();
            }
        }));
        instanceDisposables.add(instance.onDidFocus(this._onDidChangeActiveInstance.fire, this._onDidChangeActiveInstance));
        instanceDisposables.add(instance.onRequestAddInstanceToGroup(async (e) => await this._addInstanceToGroup(instance, e)));
        const disposeListener = this._register(instance.onDisposed(() => {
            instanceDisposables.dispose();
            this._store.delete(disposeListener);
        }));
    }
    async _addInstanceToGroup(instance, e) {
        const terminalIdentifier = parseTerminalUri(e.uri);
        if (terminalIdentifier.instanceId === undefined) {
            return;
        }
        let sourceInstance = this.getInstanceFromResource(e.uri);
        // Terminal from a different window
        if (!sourceInstance) {
            const attachPersistentProcess = await this._primaryBackend?.requestDetachInstance(terminalIdentifier.workspaceId, terminalIdentifier.instanceId);
            if (attachPersistentProcess) {
                sourceInstance = await this.createTerminal({
                    config: { attachPersistentProcess },
                    resource: e.uri,
                });
                this._terminalGroupService.moveInstance(sourceInstance, instance, e.side);
                return;
            }
        }
        // View terminals
        sourceInstance = this._terminalGroupService.getInstanceFromResource(e.uri);
        if (sourceInstance) {
            this._terminalGroupService.moveInstance(sourceInstance, instance, e.side);
            return;
        }
        // Terminal editors
        sourceInstance = this._terminalEditorService.getInstanceFromResource(e.uri);
        if (sourceInstance) {
            this.moveToTerminalView(sourceInstance, instance, e.side);
            return;
        }
        return;
    }
    registerProcessSupport(isSupported) {
        if (!isSupported) {
            return;
        }
        this._processSupportContextKey.set(isSupported);
        this._onDidRegisterProcessSupport.fire();
    }
    // TODO: Remove this, it should live in group/editor servioce
    _getIndexFromId(terminalId) {
        let terminalIndex = -1;
        this.instances.forEach((terminalInstance, i) => {
            if (terminalInstance.instanceId === terminalId) {
                terminalIndex = i;
            }
        });
        if (terminalIndex === -1) {
            throw new Error(`Terminal with ID ${terminalId} does not exist (has it already been disposed?)`);
        }
        return terminalIndex;
    }
    async _showTerminalCloseConfirmation(singleTerminal) {
        let message;
        const foregroundInstances = this.foregroundInstances;
        if (foregroundInstances.length === 1 || singleTerminal) {
            message = nls.localize('terminalService.terminalCloseConfirmationSingular', 'Do you want to terminate the active terminal session?');
        }
        else {
            message = nls.localize('terminalService.terminalCloseConfirmationPlural', 'Do you want to terminate the {0} active terminal sessions?', foregroundInstances.length);
        }
        const { confirmed } = await this._dialogService.confirm({
            type: 'warning',
            message,
            primaryButton: nls.localize({ key: 'terminate', comment: ['&& denotes a mnemonic'] }, '&&Terminate'),
        });
        return !confirmed;
    }
    getDefaultInstanceHost() {
        if (this.defaultLocation === TerminalLocation.Editor) {
            return this._terminalEditorService;
        }
        return this._terminalGroupService;
    }
    async getInstanceHost(location) {
        if (location) {
            if (location === TerminalLocation.Editor) {
                return this._terminalEditorService;
            }
            else if (typeof location === 'object') {
                if ('viewColumn' in location) {
                    return this._terminalEditorService;
                }
                else if ('parentTerminal' in location) {
                    return (await location.parentTerminal).target === TerminalLocation.Editor
                        ? this._terminalEditorService
                        : this._terminalGroupService;
                }
            }
            else {
                return this._terminalGroupService;
            }
        }
        return this;
    }
    async createTerminal(options) {
        // Await the initialization of available profiles as long as this is not a pty terminal or a
        // local terminal in a remote workspace as profile won't be used in those cases and these
        // terminals need to be launched before remote connections are established.
        if (this._terminalProfileService.availableProfiles.length === 0) {
            const isPtyTerminal = options?.config && 'customPtyImplementation' in options.config;
            const isLocalInRemoteTerminal = this._remoteAgentService.getConnection() &&
                URI.isUri(options?.cwd) &&
                options?.cwd.scheme === Schemas.vscodeFileResource;
            if (!isPtyTerminal && !isLocalInRemoteTerminal) {
                if (this._connectionState === 0 /* TerminalConnectionState.Connecting */) {
                    mark(`code/terminal/willGetProfiles`);
                }
                await this._terminalProfileService.profilesReady;
                if (this._connectionState === 0 /* TerminalConnectionState.Connecting */) {
                    mark(`code/terminal/didGetProfiles`);
                }
            }
        }
        const config = options?.config || this._terminalProfileService.getDefaultProfile();
        const shellLaunchConfig = config && 'extensionIdentifier' in config
            ? {}
            : this._terminalInstanceService.convertProfileToShellLaunchConfig(config || {});
        // Get the contributed profile if it was provided
        const contributedProfile = options?.skipContributedProfileCheck
            ? undefined
            : await this._getContributedProfile(shellLaunchConfig, options);
        const splitActiveTerminal = typeof options?.location === 'object' && 'splitActiveTerminal' in options.location
            ? options.location.splitActiveTerminal
            : typeof options?.location === 'object'
                ? 'parentTerminal' in options.location
                : false;
        await this._resolveCwd(shellLaunchConfig, splitActiveTerminal, options);
        // Launch the contributed profile
        // If it's a custom pty implementation, we did not await the profiles ready, so
        // we cannot launch the contributed profile and doing so would cause an error
        if (!shellLaunchConfig.customPtyImplementation && contributedProfile) {
            const resolvedLocation = await this.resolveLocation(options?.location);
            let location;
            if (splitActiveTerminal) {
                location =
                    resolvedLocation === TerminalLocation.Editor
                        ? { viewColumn: SIDE_GROUP }
                        : { splitActiveTerminal: true };
            }
            else {
                location =
                    typeof options?.location === 'object' && 'viewColumn' in options.location
                        ? options.location
                        : resolvedLocation;
            }
            await this.createContributedTerminalProfile(contributedProfile.extensionIdentifier, contributedProfile.id, {
                icon: contributedProfile.icon,
                color: contributedProfile.color,
                location,
                cwd: shellLaunchConfig.cwd,
            });
            const instanceHost = resolvedLocation === TerminalLocation.Editor
                ? this._terminalEditorService
                : this._terminalGroupService;
            const instance = instanceHost.instances[instanceHost.instances.length - 1];
            await instance?.focusWhenReady();
            this._terminalHasBeenCreated.set(true);
            return instance;
        }
        if (!shellLaunchConfig.customPtyImplementation && !this.isProcessSupportRegistered) {
            throw new Error('Could not create terminal when process support is not registered');
        }
        if (shellLaunchConfig.hideFromUser) {
            const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Panel);
            this._backgroundedTerminalInstances.push(instance);
            this._backgroundedTerminalDisposables.set(instance.instanceId, [
                instance.onDisposed(this._onDidDisposeInstance.fire, this._onDidDisposeInstance),
            ]);
            this._terminalHasBeenCreated.set(true);
            return instance;
        }
        this._evaluateLocalCwd(shellLaunchConfig);
        const location = (await this.resolveLocation(options?.location)) || this.defaultLocation;
        const parent = await this._getSplitParent(options?.location);
        this._terminalHasBeenCreated.set(true);
        if (parent) {
            return this._splitTerminal(shellLaunchConfig, location, parent);
        }
        return this._createTerminal(shellLaunchConfig, location, options);
    }
    async _getContributedProfile(shellLaunchConfig, options) {
        if (options?.config && 'extensionIdentifier' in options.config) {
            return options.config;
        }
        return this._terminalProfileService.getContributedDefaultProfile(shellLaunchConfig);
    }
    async createDetachedTerminal(options) {
        const ctor = await TerminalInstance.getXtermConstructor(this._keybindingService, this._contextKeyService);
        const xterm = this._instantiationService.createInstance(XtermTerminal, ctor, {
            cols: options.cols,
            rows: options.rows,
            xtermColorProvider: options.colorProvider,
            capabilities: options.capabilities || new TerminalCapabilityStore(),
        });
        if (options.readonly) {
            xterm.raw.attachCustomKeyEventHandler(() => false);
        }
        const instance = new DetachedTerminal(xterm, options, this._instantiationService);
        this._detachedXterms.add(instance);
        const l = xterm.onDidDispose(() => {
            this._detachedXterms.delete(instance);
            l.dispose();
        });
        return instance;
    }
    async _resolveCwd(shellLaunchConfig, splitActiveTerminal, options) {
        const cwd = shellLaunchConfig.cwd;
        if (!cwd) {
            if (options?.cwd) {
                shellLaunchConfig.cwd = options.cwd;
            }
            else if (splitActiveTerminal && options?.location) {
                let parent = this.activeInstance;
                if (typeof options.location === 'object' && 'parentTerminal' in options.location) {
                    parent = await options.location.parentTerminal;
                }
                if (!parent) {
                    throw new Error('Cannot split without an active instance');
                }
                shellLaunchConfig.cwd = await getCwdForSplit(parent, this._workspaceContextService.getWorkspace().folders, this._commandService, this._terminalConfigService);
            }
        }
    }
    _splitTerminal(shellLaunchConfig, location, parent) {
        let instance;
        // Use the URI from the base instance if it exists, this will correctly split local terminals
        if (typeof shellLaunchConfig.cwd !== 'object' &&
            typeof parent.shellLaunchConfig.cwd === 'object') {
            shellLaunchConfig.cwd = URI.from({
                scheme: parent.shellLaunchConfig.cwd.scheme,
                authority: parent.shellLaunchConfig.cwd.authority,
                path: shellLaunchConfig.cwd || parent.shellLaunchConfig.cwd.path,
            });
        }
        if (location === TerminalLocation.Editor || parent.target === TerminalLocation.Editor) {
            instance = this._terminalEditorService.splitInstance(parent, shellLaunchConfig);
        }
        else {
            const group = this._terminalGroupService.getGroupForInstance(parent);
            if (!group) {
                throw new Error(`Cannot split a terminal without a group (instanceId: ${parent.instanceId}, title: ${parent.title})`);
            }
            shellLaunchConfig.parentTerminalId = parent.instanceId;
            instance = group.split(shellLaunchConfig);
        }
        this._addToReconnected(instance);
        return instance;
    }
    _addToReconnected(instance) {
        if (!instance.reconnectionProperties?.ownerId) {
            return;
        }
        const reconnectedTerminals = this._reconnectedTerminals.get(instance.reconnectionProperties.ownerId);
        if (reconnectedTerminals) {
            reconnectedTerminals.push(instance);
        }
        else {
            this._reconnectedTerminals.set(instance.reconnectionProperties.ownerId, [instance]);
        }
    }
    _createTerminal(shellLaunchConfig, location, options) {
        let instance;
        const editorOptions = this._getEditorOptions(options?.location);
        if (location === TerminalLocation.Editor) {
            instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Editor);
            this._terminalEditorService.openEditor(instance, editorOptions);
        }
        else {
            // TODO: pass resource?
            const group = this._terminalGroupService.createGroup(shellLaunchConfig);
            instance = group.terminalInstances[0];
        }
        this._addToReconnected(instance);
        return instance;
    }
    async resolveLocation(location) {
        if (location && typeof location === 'object') {
            if ('parentTerminal' in location) {
                // since we don't set the target unless it's an editor terminal, this is necessary
                const parentTerminal = await location.parentTerminal;
                return !parentTerminal.target ? TerminalLocation.Panel : parentTerminal.target;
            }
            else if ('viewColumn' in location) {
                return TerminalLocation.Editor;
            }
            else if ('splitActiveTerminal' in location) {
                // since we don't set the target unless it's an editor terminal, this is necessary
                return !this._activeInstance?.target ? TerminalLocation.Panel : this._activeInstance?.target;
            }
        }
        return location;
    }
    async _getSplitParent(location) {
        if (location && typeof location === 'object' && 'parentTerminal' in location) {
            return location.parentTerminal;
        }
        else if (location && typeof location === 'object' && 'splitActiveTerminal' in location) {
            return this.activeInstance;
        }
        return undefined;
    }
    _getEditorOptions(location) {
        if (location && typeof location === 'object' && 'viewColumn' in location) {
            location.viewColumn = columnToEditorGroup(this._editorGroupsService, this._configurationService, location.viewColumn);
            return location;
        }
        return undefined;
    }
    _evaluateLocalCwd(shellLaunchConfig) {
        // Add welcome message and title annotation for local terminals launched within remote or
        // virtual workspaces
        if (typeof shellLaunchConfig.cwd !== 'string' &&
            shellLaunchConfig.cwd?.scheme === Schemas.file) {
            if (VirtualWorkspaceContext.getValue(this._contextKeyService)) {
                shellLaunchConfig.initialText = formatMessageForTerminal(nls.localize('localTerminalVirtualWorkspace', 'This shell is open to a {0}local{1} folder, NOT to the virtual folder', '\x1b[3m', '\x1b[23m'), { excludeLeadingNewLine: true, loudFormatting: true });
                shellLaunchConfig.type = 'Local';
            }
            else if (this._remoteAgentService.getConnection()) {
                shellLaunchConfig.initialText = formatMessageForTerminal(nls.localize('localTerminalRemote', 'This shell is running on your {0}local{1} machine, NOT on the connected remote machine', '\x1b[3m', '\x1b[23m'), { excludeLeadingNewLine: true, loudFormatting: true });
                shellLaunchConfig.type = 'Local';
            }
        }
    }
    _showBackgroundTerminal(instance) {
        const index = this._backgroundedTerminalInstances.indexOf(instance);
        if (index === -1) {
            return;
        }
        this._backgroundedTerminalInstances.splice(this._backgroundedTerminalInstances.indexOf(instance), 1);
        const disposables = this._backgroundedTerminalDisposables.get(instance.instanceId);
        if (disposables) {
            dispose(disposables);
        }
        this._backgroundedTerminalDisposables.delete(instance.instanceId);
        this._terminalGroupService.createGroup(instance);
        // Make active automatically if it's the first instance
        if (this.instances.length === 1) {
            this._terminalGroupService.setActiveInstanceByIndex(0);
        }
        this._onDidChangeInstances.fire();
    }
    async setContainers(panelContainer, terminalContainer) {
        this._terminalConfigurationService.setPanelContainer(panelContainer);
        this._terminalGroupService.setContainer(terminalContainer);
    }
    getEditingTerminal() {
        return this._editingTerminal;
    }
    setEditingTerminal(instance) {
        this._editingTerminal = instance;
    }
    createOnInstanceEvent(getEvent) {
        return new DynamicListEventMultiplexer(this.instances, this.onDidCreateInstance, this.onDidDisposeInstance, getEvent);
    }
    createOnInstanceCapabilityEvent(capabilityId, getEvent) {
        return createInstanceCapabilityEventMultiplexer(this.instances, this.onDidCreateInstance, this.onDidDisposeInstance, capabilityId, getEvent);
    }
};
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceData", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceDataInput", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceIconChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceMaximumDimensionsChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstancePrimaryStatusChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceProcessIdReady", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceSelectionChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceTitleChange", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceShellTypeChanged", null);
__decorate([
    memoize
], TerminalService.prototype, "onAnyInstanceAddedCapabilityType", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_saveState", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_updateTitle", null);
__decorate([
    debounce(500)
], TerminalService.prototype, "_updateIcon", null);
TerminalService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILifecycleService),
    __param(2, ITerminalLogService),
    __param(3, IDialogService),
    __param(4, IInstantiationService),
    __param(5, IRemoteAgentService),
    __param(6, IViewsService),
    __param(7, IConfigurationService),
    __param(8, ITerminalConfigurationService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, ITerminalConfigurationService),
    __param(11, ITerminalEditorService),
    __param(12, ITerminalGroupService),
    __param(13, ITerminalInstanceService),
    __param(14, IEditorGroupsService),
    __param(15, ITerminalProfileService),
    __param(16, IExtensionService),
    __param(17, INotificationService),
    __param(18, IWorkspaceContextService),
    __param(19, ICommandService),
    __param(20, IKeybindingService),
    __param(21, ITimerService)
], TerminalService);
export { TerminalService };
let TerminalEditorStyle = class TerminalEditorStyle extends Themable {
    constructor(container, _terminalService, _themeService, _terminalProfileService, _editorService) {
        super(_themeService);
        this._terminalService = _terminalService;
        this._themeService = _themeService;
        this._terminalProfileService = _terminalProfileService;
        this._editorService = _editorService;
        this._registerListeners();
        this._styleElement = domStylesheets.createStyleSheet(container);
        this._register(toDisposable(() => this._styleElement.remove()));
        this.updateStyles();
    }
    _registerListeners() {
        this._register(this._terminalService.onAnyInstanceIconChange(() => this.updateStyles()));
        this._register(this._terminalService.onDidCreateInstance(() => this.updateStyles()));
        this._register(this._editorService.onDidActiveEditorChange(() => {
            if (this._editorService.activeEditor instanceof TerminalEditorInput) {
                this.updateStyles();
            }
        }));
        this._register(this._editorService.onDidCloseEditor(() => {
            if (this._editorService.activeEditor instanceof TerminalEditorInput) {
                this.updateStyles();
            }
        }));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles(() => this.updateStyles()));
    }
    updateStyles() {
        super.updateStyles();
        const colorTheme = this._themeService.getColorTheme();
        // TODO: add a rule collector to avoid duplication
        let css = '';
        const productIconTheme = this._themeService.getProductIconTheme();
        // Add icons
        for (const instance of this._terminalService.instances) {
            const icon = instance.icon;
            if (!icon) {
                continue;
            }
            let uri = undefined;
            if (icon instanceof URI) {
                uri = icon;
            }
            else if (icon instanceof Object && 'light' in icon && 'dark' in icon) {
                uri = colorTheme.type === ColorScheme.LIGHT ? icon.light : icon.dark;
            }
            const iconClasses = getUriClasses(instance, colorTheme.type);
            if (uri instanceof URI && iconClasses && iconClasses.length > 1) {
                css += cssValue.inline `.monaco-workbench .terminal-tab.${cssValue.className(iconClasses[0])}::before
					{content: ''; background-image: ${cssValue.asCSSUrl(uri)};}`;
            }
            if (ThemeIcon.isThemeIcon(icon)) {
                const iconRegistry = getIconRegistry();
                const iconContribution = iconRegistry.getIcon(icon.id);
                if (iconContribution) {
                    const def = productIconTheme.getIcon(iconContribution);
                    if (def) {
                        css += cssValue.inline `.monaco-workbench .terminal-tab.codicon-${cssValue.className(icon.id)}::before
							{content: ${cssValue.stringValue(def.fontCharacter)} !important; font-family: ${cssValue.stringValue(def.font?.id ?? 'codicon')} !important;}`;
                    }
                }
            }
        }
        // Add colors
        const iconForegroundColor = colorTheme.getColor(iconForeground);
        if (iconForegroundColor) {
            css += cssValue.inline `.monaco-workbench .show-file-icons .file-icon.terminal-tab::before { color: ${iconForegroundColor}; }`;
        }
        css += getColorStyleContent(colorTheme, true);
        this._styleElement.textContent = css;
    }
};
TerminalEditorStyle = __decorate([
    __param(1, ITerminalService),
    __param(2, IThemeService),
    __param(3, ITerminalProfileService),
    __param(4, IEditorService)
], TerminalEditorStyle);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEtBQUssUUFBUSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLE9BQU8sRUFDUCxLQUFLLEdBRUwsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEVBRVAsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQVNOLG1CQUFtQixFQUduQixrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBRWhCLGdCQUFnQixHQUNoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBS04sNkJBQTZCLEVBQzdCLHNCQUFzQixFQUV0QixxQkFBcUIsRUFHckIsd0JBQXdCLEVBRXhCLGdCQUFnQixHQUloQixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDckQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUU1RixPQUFPLEVBSU4sdUJBQXVCLEVBQ3ZCLGdCQUFnQixHQUNoQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzdGLE9BQU8sRUFFTixnQkFBZ0IsRUFFaEIsY0FBYyxFQUNkLFVBQVUsR0FFVixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixpQkFBaUIsR0FJakIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEVBQThFLENBQUE7QUFDdEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUt4RCxPQUFPLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFHeEQsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVO0lBdUI5QyxJQUFJLDBCQUEwQjtRQUM3QixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDOUMsQ0FBQztJQUdELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBR0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUdELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTO2FBQ3pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDO2FBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBQ0QseUNBQXlDO0lBQ3pDLElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzFGLENBQUM7SUFDRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUtELHVCQUF1QixDQUFDLGlCQUF5QjtRQUNoRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxlQUFlO3dEQUNsQztZQUM3QixDQUFDLENBQUMsZ0JBQWdCLENBQUMsTUFBTTtZQUN6QixDQUFDLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO0lBQzFCLENBQUM7SUFHRCxJQUFJLGNBQWM7UUFDakIsMkZBQTJGO1FBQzNGLDRGQUE0RjtRQUM1RixnREFBZ0Q7UUFDaEQsS0FBSyxNQUFNLGtCQUFrQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3JFLElBQUksa0JBQWtCLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sa0JBQWtCLENBQUE7WUFDMUIsQ0FBQztRQUNGLENBQUM7UUFDRCxzRUFBc0U7UUFDdEUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFLRCxJQUFJLG1CQUFtQjtRQUN0QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7SUFDdkMsQ0FBQztJQUVELElBQUksNkJBQTZCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDLEtBQUssQ0FBQTtJQUNqRCxDQUFDO0lBRUQsSUFBSSwyQkFBMkI7UUFDOUIsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFBO0lBQy9DLENBQUM7SUFFRCxJQUFJLDBCQUEwQjtRQUM3QixPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUE7SUFDOUMsQ0FBQztJQUlELElBQUksa0NBQWtDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQTtJQUN0RCxDQUFDO0lBSUQsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7SUFDdEMsQ0FBQztJQUlELElBQUkseUJBQXlCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxJQUFJLDZCQUE2QjtRQUNoQyxPQUFPLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUE7SUFDakQsQ0FBQztJQU1ELElBQUksc0JBQXNCO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQTtJQUMxQyxDQUFDO0lBRUQsdUZBQXVGO0lBQ3ZGLHFCQUFxQjtJQUNaLElBQUksaUJBQWlCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FDcEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDdkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FDMUQsQ0FDRCxDQUFDLEtBQUssQ0FBQTtJQUNSLENBQUM7SUFDUSxJQUFJLHNCQUFzQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQ3BCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDaEYsQ0FBQyxLQUFLLENBQUE7SUFDUixDQUFDO0lBQ1EsSUFBSSx1QkFBdUI7UUFDbkMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ2hGLENBQUM7SUFDUSxJQUFJLG9DQUFvQztRQUNoRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQ3BCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUM1RixDQUFDLEtBQUssQ0FBQTtJQUNSLENBQUM7SUFDUSxJQUFJLGdDQUFnQztRQUM1QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQ3BCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2hDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUNsRSxDQUNELENBQUMsS0FBSyxDQUFBO0lBQ1IsQ0FBQztJQUNRLElBQUksMkJBQTJCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ25GLENBQUM7SUFDUSxJQUFJLDRCQUE0QjtRQUN4QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtJQUN2RixDQUFDO0lBQ1EsSUFBSSx3QkFBd0I7UUFDcEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ2pGLENBQUM7SUFDUSxJQUFJLDZCQUE2QjtRQUN6QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQ3BCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDN0UsQ0FBQyxLQUFLLENBQUE7SUFDUixDQUFDO0lBQ1EsSUFBSSxnQ0FBZ0M7UUFDNUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2FBQzdGLEtBQUssQ0FBQTtJQUNSLENBQUM7SUFDRCxZQUNxQixrQkFBOEMsRUFDL0MsaUJBQXFELEVBQ25ELFdBQWlELEVBQ3RELGNBQXNDLEVBQy9CLHFCQUFvRCxFQUN0RCxtQkFBZ0QsRUFDdEQsYUFBb0MsRUFDNUIscUJBQTZELEVBRXBGLHNCQUFzRSxFQUV0RSxtQkFBa0UsRUFFbEUsNkJBQTZFLEVBQ3JELHNCQUErRCxFQUNoRSxxQkFBNkQsRUFDMUQsd0JBQW1FLEVBQ3ZFLG9CQUEyRCxFQUN4RCx1QkFBaUUsRUFDdkUsaUJBQXFELEVBQ2xELG9CQUEyRCxFQUN2RCx3QkFBbUUsRUFDNUUsZUFBaUQsRUFDOUMsa0JBQXVELEVBQzVELGFBQTZDO1FBRTVELEtBQUssRUFBRSxDQUFBO1FBMUJxQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQzlCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDbEMsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBQzlDLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUN2QiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDOUMsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDWCwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBRW5FLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBK0I7UUFFckQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUE4QjtRQUVqRCxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBQ3BDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDL0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUN6Qyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3RELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDdkMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUF5QjtRQUN0RCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2pDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDdEMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQUMzRCxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUMzQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQWpOckQseUJBQW9CLEdBQzNCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFRixvQkFBZSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFBO1FBSXRELG9CQUFlLEdBQVksS0FBSyxDQUFBO1FBQ2hDLG1DQUE4QixHQUF3QixFQUFFLENBQUE7UUFDeEQscUNBQWdDLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUE7UUFleEUscUJBQWdCLDhDQUE4RDtRQUtyRSxtQkFBYyxHQUFHLElBQUksZUFBZSxFQUFRLENBQUE7UUFLckQsd0JBQW1CLEdBQVcsQ0FBQyxDQUFBO1FBb0IvQiwwQkFBcUIsR0FBcUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQTRCMUQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBcUIsQ0FBQyxDQUFBO1FBSXZFLG1DQUE4QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXFCLENBQUMsQ0FBQTtRQUlqRixpQ0FBNEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUlsRSxnQ0FBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUlqRSx3Q0FBbUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNwRSxJQUFJLE9BQU8sRUFBa0MsQ0FDN0MsQ0FBQTtRQUtELCtCQUErQjtRQUNkLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXFCLENBQUMsQ0FBQTtRQUl4RSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFxQixDQUFDLENBQUE7UUFJdEUsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDM0QsSUFBSSxPQUFPLEVBQWlDLENBQzVDLENBQUE7UUFJZ0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFJM0QsbUNBQThCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBcUIsQ0FBQyxDQUFBO1FBS2xHLHVCQUF1QjtRQUNOLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hELElBQUksT0FBTyxFQUE4QixDQUN6QyxDQUFBO1FBaUZBLDZDQUE2QztRQUM3QyxtRUFBbUU7UUFDbkUsb0RBQW9EO1FBQ3BELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQ3ZGLENBQUE7UUFDRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixDQUNoRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUNqQyxJQUFJLENBQUMsdUJBQXVCLENBQzVCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDOUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3JDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHVGQUF1RjtRQUN2Rix5RkFBeUY7UUFDekYsVUFBVTtRQUNWLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDakUsSUFDQyxDQUFDLFFBQVE7Z0JBQ1QsQ0FBQyxJQUFJLENBQUMsZUFBZTtnQkFDckIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFDbEQsQ0FBQztnQkFDRixJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDdkMsQ0FBQztZQUNELElBQUksUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNyRSxDQUFDO2lCQUFNLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMxQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUN2RSxJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLENBQUE7UUFDRCxJQUFJLENBQUMseUJBQXlCLEdBQUcsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUMzRSxJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLENBQUE7UUFDRCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQTtRQUMvRixJQUFJLENBQUMsdUJBQXVCLEdBQUcsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUMvRSxJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLENBQUE7UUFDRCxJQUFJLENBQUMsd0JBQXdCLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN6RixJQUFJLENBQUMscUJBQXFCLEdBQUcsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUMzRSxJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQzdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxDQUNqRSxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQzlDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FDekQsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWhGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1FBRWhDLDhDQUE4QztRQUM5QyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUNwQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDeEYsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FDekIsSUFBcUMsRUFDckMsR0FBa0I7UUFFbEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUF5QixNQUFNLENBQUMsT0FBTyxDQUFBO1FBQ3BELElBQUksSUFBSSxLQUFLLGdCQUFnQixFQUFFLENBQUM7WUFDL0IsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsY0FBYyxDQUFBO1lBQ25FLElBQUksUUFBUSxDQUFBO1lBRVosSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxDQUFDLGdDQUFnQyxDQUMxQyxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFDaEI7b0JBQ0MsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUk7b0JBQ2pDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLO29CQUNuQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxjQUFjLENBQUM7d0JBQzNDLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRTt3QkFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlO2lCQUN2QixDQUNELENBQUE7Z0JBQ0QsT0FBTTtZQUNQLENBQUM7aUJBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLGFBQWEsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzVELElBQUksT0FBTyxFQUFFLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDcEMseURBQXlEO29CQUN6RCxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDO3dCQUNwQyxRQUFRLEVBQUUsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFO3dCQUM1QyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07d0JBQ3JCLEdBQUc7cUJBQ0gsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDO3dCQUNwQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGVBQWU7d0JBQzlCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTt3QkFDckIsR0FBRztxQkFDSCxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsRSxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2hDLE9BQU8sUUFBUSxDQUFBO1lBQ2hCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUI7UUFDdEMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQ3BFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQ3hDLENBQUE7UUFDRCxJQUFJLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUMzQyxNQUFNLDBCQUEwQixHQUMvQixJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFBO1FBRW5FLDBGQUEwRjtRQUMxRixzRUFBc0U7UUFDdEUsSUFBSSxDQUFDLGdCQUFnQiw2Q0FBcUMsQ0FBQTtRQUUxRCxNQUFNLGtCQUFrQixHQUN2QixDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsSUFBSSwwQkFBMEIsQ0FBQTtRQUV6RSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDcEQsY0FBYyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUMzQyxDQUFBO2dCQUNELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdEIsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQTtvQkFDakUsSUFDQyxtQkFBbUI7d0JBQ25CLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCO3dCQUNyRCxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixFQUMxRCxDQUFDO3dCQUNGLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUN6RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUE7d0JBQzdELENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxJQUFJLENBQUMscUJBQXFCO2lDQUN4QixtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQztnQ0FDdEMsRUFBRSxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTt3QkFDcEMsQ0FBQzt3QkFDRCxNQUFNLGdCQUFnQixDQUFDLHVCQUF1QixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFBO3dCQUN2RSxNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUseUJBQXlCLENBQ3BELENBQUMsQ0FBQyxTQUFTLEVBQ1gsbUJBQW1CLENBQ25CLENBQUE7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLCtEQUErRDt3QkFDL0QsTUFBTSxJQUFJLENBQUMsZUFBZSxFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7b0JBQzlFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFDbkMsSUFBSSxrQkFBZ0MsQ0FBQTtRQUNwQyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDeEQsQ0FBQzthQUFNLElBQUksMEJBQTBCLEVBQUUsQ0FBQztZQUN2QyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtRQUN2RCxDQUFDO2FBQU0sQ0FBQztZQUNQLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2QyxDQUFDO1FBQ0Qsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ2xDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNwQixJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtZQUNsQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUNoQyxNQUFNLFNBQVMsR0FDZCxDQUFDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ3ZELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUM3QyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ1QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNoQixTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3hGLENBQUE7WUFDRCxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQTtZQUMvQixJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtZQUM3QyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUN2RixJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUNyQyxPQUFPLENBQUMsZUFBZSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQ3hFLE1BQU0sT0FBTyxDQUFDLG1CQUFtQixFQUFFLENBQ25DLENBQUE7Z0JBQ0QsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ25CLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQTtZQUM1QyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVPLDBCQUEwQixDQUFDLElBQTJCO1FBQzdELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQ3RGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUN0RixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FDMUYsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDcEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN2QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQy9DLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFTyx1QkFBdUIsQ0FDOUIsSUFBMkIsRUFDM0IsUUFBdUM7UUFFdkMseUZBQXlGO1FBQ3pGLDRGQUE0RjtRQUM1Riw0RkFBNEY7UUFDNUYsNEVBQTRFO1FBQzVFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzdDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQ3pELElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osUUFBUSxHQUFHLE1BQU0sQ0FBQTtnQkFDbEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUE7UUFDL0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsaUJBQWlCLENBQUMsS0FBd0I7UUFDekMscUZBQXFGO1FBQ3JGLHFEQUFxRDtRQUNyRCxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsc0JBQXNCLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQTJCO1FBQzlDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQjtRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsS0FBSyxDQUFDLGdDQUFnQyxDQUNyQyxtQkFBMkIsRUFDM0IsRUFBVSxFQUNWLE9BQWlEO1FBRWpELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV2RSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsNkJBQTZCLENBQ2pGLG1CQUFtQixFQUNuQixFQUFFLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3pGLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxlQUFlLENBQUMsZ0NBQWdDLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDL0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUNsRCxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQy9DLENBQUE7WUFDRCxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLENBQUE7UUFDbEUsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMzQyxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxRQUEyQjtRQUNwRCwrREFBK0Q7UUFDL0QsSUFDQyxRQUFRLENBQUMsTUFBTSxLQUFLLGdCQUFnQixDQUFDLE1BQU07WUFDM0MsUUFBUSxDQUFDLGlCQUFpQjtZQUMxQixDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsYUFBYSxLQUFLLE9BQU87Z0JBQ25FLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsYUFBYSxLQUFLLFFBQVEsQ0FBQyxFQUNyRSxDQUFDO1lBQ0YsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUQsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixPQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN0QyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLGFBQWE7UUFDcEIsSUFBSSxDQUFDLGdCQUFnQiw0Q0FBb0MsQ0FBQTtRQUN6RCxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU8sS0FBSyxDQUFDLDJCQUEyQjtRQUN4QyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFBO1FBQ2hFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMvRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDeEQsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLENBQUE7UUFDOUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUE7UUFDL0MseUNBQXlDO1FBQ3pDLCtEQUErRDtRQUMvRCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtRQUVwQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFTyxLQUFLLENBQUMsMEJBQTBCO1FBQ3ZDLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3JFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sVUFBVSxHQUFHLE1BQU0sWUFBWSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDN0QsSUFBSSxDQUFDLHdDQUF3QyxDQUFDLENBQUE7UUFDOUMsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLENBQUE7WUFDaEQsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUMxRSxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBQ0QseUNBQXlDO1FBQ3pDLG9FQUFvRTtRQUNwRSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtRQUVwQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxVQUFpQztRQUNoRSxNQUFNLGFBQWEsR0FBMEMsRUFBRSxDQUFBO1FBQy9ELElBQUksV0FBNEQsQ0FBQTtRQUNoRSxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN6QyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUM1RixJQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDNUIsSUFBSSxDQUFDLG1CQUFtQixJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUE7b0JBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUE7b0JBQ3ZFLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQzNCLElBQUksU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN4QixXQUFXLEdBQUcsT0FBTyxDQUFBO29CQUN0QixDQUFDO29CQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUN6QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLEVBQUU7d0JBQy9DLFNBQVMsQ0FBQyx5QkFBeUIsQ0FDcEMsQ0FBQTtvQkFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO3dCQUNwQixJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUE7b0JBQ3ZDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzVCLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQy9FLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FDckMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQXFCLENBQ3pELENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHNCQUFzQixDQUNuQyxTQUFpRSxFQUNqRSxlQUE4RTtRQUU5RSxJQUFJLFlBQW9ELENBQUE7UUFDeEQsS0FBSyxNQUFNLGNBQWMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUM5QyxNQUFNLHVCQUF1QixHQUFHLGNBQWMsQ0FBQyxRQUFTLENBQUE7WUFDeEQsSUFDQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyx1Q0FBK0I7Z0JBQ2pFLHVCQUF1QixDQUFDLElBQUksS0FBSyxNQUFNLEVBQ3RDLENBQUM7Z0JBQ0YsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLENBQ0gsc0NBQXNDLHVCQUF1QixDQUFDLEVBQUUsSUFBSSx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FDakcsQ0FBQTtZQUNELFlBQVksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUNsQyxNQUFNLEVBQUUsRUFBRSx1QkFBdUIsRUFBRTtnQkFDbkMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUs7YUFDbEYsQ0FBQyxDQUFBO1lBQ0YsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FDdEIsSUFBSSxDQUNILHFDQUFxQyx1QkFBdUIsQ0FBQyxFQUFFLElBQUksdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQ2hHLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDN0MsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2xFLENBQUMsRUFBRSxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1lBQzVFLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyw2QkFBNkI7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEUsc0ZBQXNGO1FBQ3RGLDREQUE0RDtRQUM1RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUNsRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQyxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDeEYsTUFBTSx5QkFBeUIsR0FBRyxHQUFHLEVBQUU7WUFDdEMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3BELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6RCxDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRUQsS0FBSyxDQUFDLHlCQUF5QixDQUFDLE9BRS9CO1FBQ0EsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtRQUMxQyxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQzdCLENBQUM7UUFDRCx3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxlQUFlLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDOUUsT0FBTyxjQUFjLENBQUE7UUFDdEIsQ0FBQztRQUNELHlEQUF5RDtRQUN6RCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUNqQyxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUF5QixFQUFFLGFBQXVCO1FBQ3RFLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNwRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLGFBQXVCO1FBQ2pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUE7UUFDcEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxXQUFXLENBQUMsUUFBMkIsRUFBRSxJQUEyQjtRQUNuRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFBO1FBQzlDLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFtQixnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0MsSUFBSSxFQUFFLGtCQUFrQixFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsVUFBVSxDQUFDLFFBQXVDO1FBQ2pELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsZUFBZSxDQUFDLFFBQTJCO1FBQzFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDaEcsQ0FBQztJQUVELDZCQUE2QixDQUM1QixLQUFtQyxFQUNuQyxJQUFZLEVBQ1osSUFBWTtRQUVaLDJFQUEyRTtRQUMzRSxPQUFPLElBQUksT0FBTyxDQUFtQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ2pFLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQy9FLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE1BQXNCO1FBQy9DLHFGQUFxRjtRQUNyRixvREFBb0Q7UUFDcEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQzNCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTyxLQUFLLENBQUMsc0JBQXNCLENBQUMsTUFBc0I7UUFDMUQsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxvQ0FBb0M7WUFDcEMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsNEZBQTRGO1FBQzVGLHdDQUF3QztRQUN4QyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsb0JBQW9CLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxFQUFFLGNBQWMsRUFBRSxDQUFBO1lBQ3hFLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2pFLElBQUkscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsZ0ZBQWdGO2dCQUNoRixtRkFBbUY7Z0JBQ25GLGdGQUFnRjtnQkFDaEYsa0ZBQWtGO2dCQUNsRixzQ0FBc0M7Z0JBQ3RDLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xGLENBQUM7WUFFRCwrQkFBK0I7WUFDL0IsTUFBTSxzQkFBc0IsR0FDM0IsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyx3QkFBd0I7Z0JBQ2xFLE1BQU0sa0NBQTBCLENBQUE7WUFDakMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQzdCLE1BQU0saUJBQWlCLEdBQ3RCLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxhQUFhLEtBQUssUUFBUTtvQkFDcEUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQ3JDLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxhQUFhLEtBQUssbUJBQW1CO3dCQUMvRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO2dCQUM1RCxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZCLE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNsRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEdBQVksRUFBRSxDQUFDO1lBQ3ZCLG9FQUFvRTtZQUNwRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxRSxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFFM0IsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsaUJBQWlCLENBQUMsY0FBOEM7UUFDL0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUE7SUFDdEMsQ0FBQztJQUVPLHNCQUFzQixDQUFDLE1BQXNCO1FBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDekUsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsUUFBUSxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLDhCQUE4QixFQUFFLENBQUM7WUFDbEYsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNmLDZEQUE2RDtnQkFDN0QsSUFBSSxNQUFNLGlDQUF5QixJQUFJLElBQUksQ0FBQyxvQkFBb0IsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDeEYsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFDRCxPQUFPLE1BQU0sZ0NBQXdCLElBQUksTUFBTSxnQ0FBd0IsQ0FBQTtZQUN4RSxDQUFDO1lBQ0QsS0FBSyxzQkFBc0I7Z0JBQzFCLE9BQU8sTUFBTSxrQ0FBMEIsQ0FBQTtZQUN4QztnQkFDQyxPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLDZCQUE2QixDQUFDLE1BQXNCO1FBQ2pFLHlFQUF5RTtRQUN6RSxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBQ3hELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1FBQzVCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxlQUFlLENBQUMsQ0FBb0I7UUFDM0MsMEZBQTBGO1FBQzFGLE1BQU0sc0JBQXNCLEdBQzNCLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsd0JBQXdCO1lBQ2xFLENBQUMsQ0FBQyxNQUFNLGtDQUEwQixDQUFBO1FBRW5DLEtBQUssTUFBTSxRQUFRLElBQUk7WUFDdEIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUztZQUN2QyxHQUFHLElBQUksQ0FBQyw4QkFBOEI7U0FDdEMsRUFBRSxDQUFDO1lBQ0gsSUFBSSxzQkFBc0IsSUFBSSxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3RELFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM5RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsUUFBUSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1FBQ0YsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsc0JBQXNCLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdkUsSUFBSSxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUdPLFVBQVU7UUFDakIsMkZBQTJGO1FBQzNGLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUN6RSxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDeEQsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUM3RCxDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQTZCLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDaEQsSUFBSSxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBR08sWUFBWSxDQUFDLFFBQXVDO1FBQzNELElBQ0MsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLHdCQUF3QjtZQUNuRSxDQUFDLFFBQVE7WUFDVCxDQUFDLFFBQVEsQ0FBQyxtQkFBbUI7WUFDN0IsQ0FBQyxRQUFRLENBQUMsS0FBSztZQUNmLFFBQVEsQ0FBQyxVQUFVLEVBQ2xCLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUNoQyxRQUFRLENBQUMsbUJBQW1CLEVBQzVCLFFBQVEsQ0FBQyxXQUFXLEVBQ3BCLGdCQUFnQixDQUFDLEdBQUcsQ0FDcEIsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQ2hDLFFBQVEsQ0FBQyxtQkFBbUIsRUFDNUIsUUFBUSxDQUFDLEtBQUssRUFDZCxRQUFRLENBQUMsV0FBVyxDQUNwQixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFHTyxXQUFXLENBQUMsUUFBMkIsRUFBRSxhQUFzQjtRQUN0RSxJQUNDLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyx3QkFBd0I7WUFDbkUsQ0FBQyxRQUFRO1lBQ1QsQ0FBQyxRQUFRLENBQUMsbUJBQW1CO1lBQzdCLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDZCxRQUFRLENBQUMsVUFBVSxFQUNsQixDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FDL0IsUUFBUSxDQUFDLG1CQUFtQixFQUM1QixhQUFhLEVBQ2IsUUFBUSxDQUFDLElBQUksRUFDYixRQUFRLENBQUMsS0FBSyxDQUNkLENBQUE7SUFDRixDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxVQUFrQjtRQUNuQyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoQixJQUFJLENBQUMsOEJBQThCLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbkUsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2hELE9BQU8sR0FBRyxDQUFDLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLE9BQU8sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxJQUFJLENBQUM7WUFDSixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELG9CQUFvQixDQUFDLGFBQXFCO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBeUI7UUFDaEQsT0FBTyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxVQUF1QztRQUMzRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsWUFBWSxDQUNYLE1BQXlCLEVBQ3pCLEtBQXFGO1FBRXJGLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTTtRQUNQLENBQUM7UUFDRCxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzFGLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxNQUF5QjtRQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQ3ZCLE1BQWdDLEVBQ2hDLE1BQTBCLEVBQzFCLElBQXlCO1FBRXpCLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0MsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2hELE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7UUFFdEMsSUFBSSxLQUFpQyxDQUFBO1FBQ3JDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2pELENBQUM7UUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5QixNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFaEQsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFLENBQUM7WUFDcEIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEYsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFRCxjQUFjO1FBQ2QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxRQUEyQjtRQUMzRCxNQUFNLG1CQUFtQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDakQsbUJBQW1CLENBQUMsR0FBRyxDQUN0QixRQUFRLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO1lBQ2pDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDbEQsSUFDQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLHdCQUF3QjtnQkFDbEUsSUFBSSxDQUFDLDBCQUEwQixFQUM5QixDQUFDO2dCQUNGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUNsQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELG1CQUFtQixDQUFDLEdBQUcsQ0FDdEIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUMxRixDQUFBO1FBQ0QsbUJBQW1CLENBQUMsR0FBRyxDQUN0QixRQUFRLENBQUMsMkJBQTJCLENBQ25DLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FDeEQsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDeEIsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CLENBQ2hDLFFBQTJCLEVBQzNCLENBQWtDO1FBRWxDLE1BQU0sa0JBQWtCLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2xELElBQUksa0JBQWtCLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxjQUFjLEdBQWtDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFdkYsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixNQUFNLHVCQUF1QixHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsQ0FDaEYsa0JBQWtCLENBQUMsV0FBVyxFQUM5QixrQkFBa0IsQ0FBQyxVQUFVLENBQzdCLENBQUE7WUFDRCxJQUFJLHVCQUF1QixFQUFFLENBQUM7Z0JBQzdCLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUM7b0JBQzFDLE1BQU0sRUFBRSxFQUFFLHVCQUF1QixFQUFFO29CQUNuQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUc7aUJBQ2YsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3pFLE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixjQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMxRSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDekUsT0FBTTtRQUNQLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsY0FBYyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0UsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDekQsT0FBTTtRQUNQLENBQUM7UUFDRCxPQUFNO0lBQ1AsQ0FBQztJQUVELHNCQUFzQixDQUFDLFdBQW9CO1FBQzFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3pDLENBQUM7SUFFRCw2REFBNkQ7SUFDckQsZUFBZSxDQUFDLFVBQWtCO1FBQ3pDLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUMsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2hELGFBQWEsR0FBRyxDQUFDLENBQUE7WUFDbEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxhQUFhLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksS0FBSyxDQUNkLG9CQUFvQixVQUFVLGlEQUFpRCxDQUMvRSxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7SUFFUyxLQUFLLENBQUMsOEJBQThCLENBQUMsY0FBd0I7UUFDdEUsSUFBSSxPQUFlLENBQUE7UUFDbkIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUE7UUFDcEQsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3hELE9BQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNyQixtREFBbUQsRUFDbkQsdURBQXVELENBQ3ZELENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNyQixpREFBaUQsRUFDakQsNERBQTRELEVBQzVELG1CQUFtQixDQUFDLE1BQU0sQ0FDMUIsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUN2RCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU87WUFDUCxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDeEQsYUFBYSxDQUNiO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxDQUFDLFNBQVMsQ0FBQTtJQUNsQixDQUFDO0lBRUQsc0JBQXNCO1FBQ3JCLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0RCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtRQUNuQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUE7SUFDbEMsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQ3BCLFFBQThDO1FBRTlDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLFFBQVEsS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDMUMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUE7WUFDbkMsQ0FBQztpQkFBTSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLFlBQVksSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDOUIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUE7Z0JBQ25DLENBQUM7cUJBQU0sSUFBSSxnQkFBZ0IsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDekMsT0FBTyxDQUFDLE1BQU0sUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNO3dCQUN4RSxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQjt3QkFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQTtnQkFDOUIsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBZ0M7UUFDcEQsNEZBQTRGO1FBQzVGLHlGQUF5RjtRQUN6RiwyRUFBMkU7UUFDM0UsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pFLE1BQU0sYUFBYSxHQUFHLE9BQU8sRUFBRSxNQUFNLElBQUkseUJBQXlCLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQTtZQUNwRixNQUFNLHVCQUF1QixHQUM1QixJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxFQUFFO2dCQUN4QyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7Z0JBQ3ZCLE9BQU8sRUFBRSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQTtZQUNuRCxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLCtDQUF1QyxFQUFFLENBQUM7b0JBQ2xFLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO2dCQUN0QyxDQUFDO2dCQUNELE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsQ0FBQTtnQkFDaEQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLCtDQUF1QyxFQUFFLENBQUM7b0JBQ2xFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxPQUFPLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ2xGLE1BQU0saUJBQWlCLEdBQ3RCLE1BQU0sSUFBSSxxQkFBcUIsSUFBSSxNQUFNO1lBQ3hDLENBQUMsQ0FBQyxFQUFFO1lBQ0osQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxpQ0FBaUMsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUE7UUFFakYsaURBQWlEO1FBQ2pELE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxFQUFFLDJCQUEyQjtZQUM5RCxDQUFDLENBQUMsU0FBUztZQUNYLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVoRSxNQUFNLG1CQUFtQixHQUN4QixPQUFPLE9BQU8sRUFBRSxRQUFRLEtBQUssUUFBUSxJQUFJLHFCQUFxQixJQUFJLE9BQU8sQ0FBQyxRQUFRO1lBQ2pGLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLG1CQUFtQjtZQUN0QyxDQUFDLENBQUMsT0FBTyxPQUFPLEVBQUUsUUFBUSxLQUFLLFFBQVE7Z0JBQ3RDLENBQUMsQ0FBQyxnQkFBZ0IsSUFBSSxPQUFPLENBQUMsUUFBUTtnQkFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUVWLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUV2RSxpQ0FBaUM7UUFDakMsK0VBQStFO1FBQy9FLDZFQUE2RTtRQUM3RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN0RSxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDdEUsSUFBSSxRQUlRLENBQUE7WUFDWixJQUFJLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3pCLFFBQVE7b0JBQ1AsZ0JBQWdCLEtBQUssZ0JBQWdCLENBQUMsTUFBTTt3QkFDM0MsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRTt3QkFDNUIsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVE7b0JBQ1AsT0FBTyxPQUFPLEVBQUUsUUFBUSxLQUFLLFFBQVEsSUFBSSxZQUFZLElBQUksT0FBTyxDQUFDLFFBQVE7d0JBQ3hFLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUTt3QkFDbEIsQ0FBQyxDQUFDLGdCQUFnQixDQUFBO1lBQ3JCLENBQUM7WUFDRCxNQUFNLElBQUksQ0FBQyxnQ0FBZ0MsQ0FDMUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQ3RDLGtCQUFrQixDQUFDLEVBQUUsRUFDckI7Z0JBQ0MsSUFBSSxFQUFFLGtCQUFrQixDQUFDLElBQUk7Z0JBQzdCLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxLQUFLO2dCQUMvQixRQUFRO2dCQUNSLEdBQUcsRUFBRSxpQkFBaUIsQ0FBQyxHQUFHO2FBQzFCLENBQ0QsQ0FBQTtZQUNELE1BQU0sWUFBWSxHQUNqQixnQkFBZ0IsS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNO2dCQUMzQyxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQjtnQkFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQTtZQUM5QixNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sUUFBUSxFQUFFLGNBQWMsRUFBRSxDQUFBO1lBQ2hDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdEMsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3BGLE1BQU0sSUFBSSxLQUFLLENBQUMsa0VBQWtFLENBQUMsQ0FBQTtRQUNwRixDQUFDO1FBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsY0FBYyxDQUM1RCxpQkFBaUIsRUFDakIsZ0JBQWdCLENBQUMsS0FBSyxDQUN0QixDQUFBO1lBQ0QsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsRCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7Z0JBQzlELFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUM7YUFDaEYsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN0QyxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUN4RixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQkFBc0IsQ0FDbkMsaUJBQXFDLEVBQ3JDLE9BQWdDO1FBRWhDLElBQUksT0FBTyxFQUFFLE1BQU0sSUFBSSxxQkFBcUIsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEUsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQ3RCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyw0QkFBNEIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQUMsT0FBOEI7UUFDMUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FDdEQsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUU7WUFDNUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixrQkFBa0IsRUFBRSxPQUFPLENBQUMsYUFBYTtZQUN6QyxZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVksSUFBSSxJQUFJLHVCQUF1QixFQUFFO1NBQ25FLENBQUMsQ0FBQTtRQUVGLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNyQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUN4QixpQkFBcUMsRUFDckMsbUJBQTRCLEVBQzVCLE9BQWdDO1FBRWhDLE1BQU0sR0FBRyxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQTtRQUNqQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixJQUFJLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQztnQkFDbEIsaUJBQWlCLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUE7WUFDcEMsQ0FBQztpQkFBTSxJQUFJLG1CQUFtQixJQUFJLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQztnQkFDckQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtnQkFDaEMsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxJQUFJLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDbEYsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUE7Z0JBQy9DLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtnQkFDM0QsQ0FBQztnQkFDRCxpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsTUFBTSxjQUFjLENBQzNDLE1BQU0sRUFDTixJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUNwRCxJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsc0JBQXNCLENBQzNCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQ3JCLGlCQUFxQyxFQUNyQyxRQUEwQixFQUMxQixNQUF5QjtRQUV6QixJQUFJLFFBQVEsQ0FBQTtRQUNaLDZGQUE2RjtRQUM3RixJQUNDLE9BQU8saUJBQWlCLENBQUMsR0FBRyxLQUFLLFFBQVE7WUFDekMsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxLQUFLLFFBQVEsRUFDL0MsQ0FBQztZQUNGLGlCQUFpQixDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNoQyxNQUFNLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNO2dCQUMzQyxTQUFTLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTO2dCQUNqRCxJQUFJLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSTthQUNoRSxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsSUFBSSxRQUFRLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkYsUUFBUSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDaEYsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDcEUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQ2Qsd0RBQXdELE1BQU0sQ0FBQyxVQUFVLFlBQVksTUFBTSxDQUFDLEtBQUssR0FBRyxDQUNwRyxDQUFBO1lBQ0YsQ0FBQztZQUNELGlCQUFpQixDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUE7WUFDdEQsUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUMxQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hDLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxRQUEyQjtRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLE9BQU8sRUFBRSxDQUFDO1lBQy9DLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUMxRCxRQUFRLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUN2QyxDQUFBO1FBQ0QsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDcEYsQ0FBQztJQUNGLENBQUM7SUFFTyxlQUFlLENBQ3RCLGlCQUFxQyxFQUNyQyxRQUEwQixFQUMxQixPQUFnQztRQUVoQyxJQUFJLFFBQVEsQ0FBQTtRQUNaLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDL0QsSUFBSSxRQUFRLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsUUFBUSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQ3RELGlCQUFpQixFQUNqQixnQkFBZ0IsQ0FBQyxNQUFNLENBQ3ZCLENBQUE7WUFDRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNoRSxDQUFDO2FBQU0sQ0FBQztZQUNQLHVCQUF1QjtZQUN2QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDdkUsUUFBUSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hDLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUNwQixRQUFtQztRQUVuQyxJQUFJLFFBQVEsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QyxJQUFJLGdCQUFnQixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNsQyxrRkFBa0Y7Z0JBQ2xGLE1BQU0sY0FBYyxHQUFHLE1BQU0sUUFBUSxDQUFDLGNBQWMsQ0FBQTtnQkFDcEQsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQTtZQUMvRSxDQUFDO2lCQUFNLElBQUksWUFBWSxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQTtZQUMvQixDQUFDO2lCQUFNLElBQUkscUJBQXFCLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQzlDLGtGQUFrRjtnQkFDbEYsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFBO1lBQzdGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlLENBQzVCLFFBQW1DO1FBRW5DLElBQUksUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsSUFBSSxnQkFBZ0IsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUM5RSxPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUE7UUFDL0IsQ0FBQzthQUFNLElBQUksUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsSUFBSSxxQkFBcUIsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUMxRixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7UUFDM0IsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxpQkFBaUIsQ0FDeEIsUUFBbUM7UUFFbkMsSUFBSSxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxJQUFJLFlBQVksSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUMxRSxRQUFRLENBQUMsVUFBVSxHQUFHLG1CQUFtQixDQUN4QyxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsUUFBUSxDQUFDLFVBQVUsQ0FDbkIsQ0FBQTtZQUNELE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8saUJBQWlCLENBQUMsaUJBQXFDO1FBQzlELHlGQUF5RjtRQUN6RixxQkFBcUI7UUFDckIsSUFDQyxPQUFPLGlCQUFpQixDQUFDLEdBQUcsS0FBSyxRQUFRO1lBQ3pDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFDN0MsQ0FBQztZQUNGLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELGlCQUFpQixDQUFDLFdBQVcsR0FBRyx3QkFBd0IsQ0FDdkQsR0FBRyxDQUFDLFFBQVEsQ0FDWCwrQkFBK0IsRUFDL0IsdUVBQXVFLEVBQ3ZFLFNBQVMsRUFDVCxVQUFVLENBQ1YsRUFDRCxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQ3JELENBQUE7Z0JBQ0QsaUJBQWlCLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQTtZQUNqQyxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7Z0JBQ3JELGlCQUFpQixDQUFDLFdBQVcsR0FBRyx3QkFBd0IsQ0FDdkQsR0FBRyxDQUFDLFFBQVEsQ0FDWCxxQkFBcUIsRUFDckIsd0ZBQXdGLEVBQ3hGLFNBQVMsRUFDVCxVQUFVLENBQ1YsRUFDRCxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQ3JELENBQUE7Z0JBQ0QsaUJBQWlCLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFUyx1QkFBdUIsQ0FBQyxRQUEyQjtRQUM1RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25FLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUN6QyxJQUFJLENBQUMsOEJBQThCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUNyRCxDQUFDLENBQ0QsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xGLElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3JCLENBQUM7UUFDRCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWhELHVEQUF1RDtRQUN2RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLGNBQTJCLEVBQUUsaUJBQThCO1FBQzlFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBdUM7UUFDekQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQTtJQUNqQyxDQUFDO0lBRUQscUJBQXFCLENBQ3BCLFFBQW1EO1FBRW5ELE9BQU8sSUFBSSwyQkFBMkIsQ0FDckMsSUFBSSxDQUFDLFNBQVMsRUFDZCxJQUFJLENBQUMsbUJBQW1CLEVBQ3hCLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsUUFBUSxDQUNSLENBQUE7SUFDRixDQUFDO0lBRUQsK0JBQStCLENBQzlCLFlBQWUsRUFDZixRQUFpRTtRQUVqRSxPQUFPLHdDQUF3QyxDQUM5QyxJQUFJLENBQUMsU0FBUyxFQUNkLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsSUFBSSxDQUFDLG9CQUFvQixFQUN6QixZQUFZLEVBQ1osUUFBUSxDQUNSLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXQ0Q1M7SUFBUixPQUFPO3dEQU1QO0FBQ1E7SUFBUixPQUFPOzZEQUlQO0FBQ1E7SUFBUixPQUFPOzhEQUVQO0FBQ1E7SUFBUixPQUFPOzJFQUlQO0FBQ1E7SUFBUixPQUFPO3VFQU1QO0FBQ1E7SUFBUixPQUFPO2tFQUVQO0FBQ1E7SUFBUixPQUFPO21FQUVQO0FBQ1E7SUFBUixPQUFPOytEQUVQO0FBQ1E7SUFBUixPQUFPO29FQUlQO0FBQ1E7SUFBUixPQUFPO3VFQUdQO0FBK3FCTztJQURQLFFBQVEsQ0FBQyxHQUFHLENBQUM7aURBY2I7QUFHTztJQURQLFFBQVEsQ0FBQyxHQUFHLENBQUM7bURBd0JiO0FBR087SUFEUCxRQUFRLENBQUMsR0FBRyxDQUFDO2tEQWlCYjtBQW42QlcsZUFBZTtJQTRMekIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsNkJBQTZCLENBQUE7SUFFN0IsV0FBQSw0QkFBNEIsQ0FBQTtJQUU1QixZQUFBLDZCQUE2QixDQUFBO0lBRTdCLFlBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFlBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSx1QkFBdUIsQ0FBQTtJQUN2QixZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSx3QkFBd0IsQ0FBQTtJQUN4QixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxhQUFhLENBQUE7R0FwTkgsZUFBZSxDQW9oRDNCOztBQUVELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsUUFBUTtJQUd6QyxZQUNDLFNBQXNCLEVBQ2EsZ0JBQWtDLEVBQ3JDLGFBQTRCLEVBQ2xCLHVCQUFnRCxFQUN6RCxjQUE4QjtRQUUvRCxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7UUFMZSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3JDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ2xCLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFDekQsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBRy9ELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxhQUFhLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ2hELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLFlBQVksbUJBQW1CLEVBQUUsQ0FBQztnQkFDckUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUN6QyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxZQUFZLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3JFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNwQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLDRCQUE0QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUNwRixDQUFBO0lBQ0YsQ0FBQztJQUVRLFlBQVk7UUFDcEIsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3BCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUE7UUFFckQsa0RBQWtEO1FBQ2xELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUVaLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRWpFLFlBQVk7UUFDWixLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4RCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFBO1lBQzFCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxTQUFRO1lBQ1QsQ0FBQztZQUNELElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQTtZQUNuQixJQUFJLElBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQztnQkFDekIsR0FBRyxHQUFHLElBQUksQ0FBQTtZQUNYLENBQUM7aUJBQU0sSUFBSSxJQUFJLFlBQVksTUFBTSxJQUFJLE9BQU8sSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUN4RSxHQUFHLEdBQUcsVUFBVSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBQ3JFLENBQUM7WUFDRCxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM1RCxJQUFJLEdBQUcsWUFBWSxHQUFHLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pFLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFBLG1DQUFtQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt1Q0FDeEQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFBO1lBQzlELENBQUM7WUFDRCxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUE7Z0JBQ3RDLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3RELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdEIsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUE7b0JBQ3RELElBQUksR0FBRyxFQUFFLENBQUM7d0JBQ1QsR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUEsMkNBQTJDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzttQkFDL0UsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLDZCQUE2QixRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLFNBQVMsQ0FBQyxlQUFlLENBQUE7b0JBQ2hKLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsYUFBYTtRQUNiLE1BQU0sbUJBQW1CLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMvRCxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUEsK0VBQStFLG1CQUFtQixLQUFLLENBQUE7UUFDOUgsQ0FBQztRQUVELEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFBO0lBQ3JDLENBQUM7Q0FDRCxDQUFBO0FBdkZLLG1CQUFtQjtJQUt0QixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLGNBQWMsQ0FBQTtHQVJYLG1CQUFtQixDQXVGeEIifQ==