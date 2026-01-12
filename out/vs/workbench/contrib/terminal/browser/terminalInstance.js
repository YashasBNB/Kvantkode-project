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
var TerminalInstance_1;
import { isFirefox } from '../../../../base/browser/browser.js';
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { AutoOpenBarrier, Promises, disposableTimeout, timeout, } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { debounce } from '../../../../base/common/decorators.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { template } from '../../../../base/common/labels.js';
import { Disposable, DisposableMap, DisposableStore, ImmortalReference, MutableDisposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import { OS, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { TabFocus } from '../../../../editor/browser/config/tabFocus.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { CodeDataTransfers, containsDragType, getPathForFile, } from '../../../../platform/dnd/browser/dnd.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { TerminalCapabilityStoreMultiplexer } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { deserializeEnvironmentVariableCollections } from '../../../../platform/terminal/common/environmentVariableShared.js';
import { ITerminalLogService, TerminalExitReason, TerminalLocation, TitleEventSource, } from '../../../../platform/terminal/common/terminal.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ITerminalConfigurationService, } from './terminal.js';
import { TerminalLaunchHelpAction } from './terminalActions.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { TerminalExtensionsRegistry } from './terminalExtensions.js';
import { getColorClass, createColorStyleElement, getStandardColors } from './terminalIcon.js';
import { TerminalProcessManager } from './terminalProcessManager.js';
import { TerminalStatusList } from './terminalStatusList.js';
import { getTerminalResourcesFromDragEvent, getTerminalUri } from './terminalUri.js';
import { TerminalWidgetManager } from './widgets/widgetManager.js';
import { LineDataEventAddon } from './xterm/lineDataEventAddon.js';
import { XtermTerminal, getXtermScaledDimensions } from './xterm/xtermTerminal.js';
import { DEFAULT_COMMANDS_TO_SKIP_SHELL, ITerminalProfileResolverService, TERMINAL_CREATION_COMMANDS, TERMINAL_VIEW_ID, } from '../common/terminal.js';
import { TERMINAL_BACKGROUND_COLOR } from '../common/terminalColorRegistry.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getWorkspaceForTerminal, preparePathForShell } from '../common/terminalEnvironment.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { isHorizontal, IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { importAMDNodeModule } from '../../../../amdX.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { TerminalIconPicker } from './terminalIconPicker.js';
import { TerminalResizeDebouncer } from './terminalResizeDebouncer.js';
import { openContextMenu } from './terminalContextMenu.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { refreshShellIntegrationInfoStatus } from './terminalTooltip.js';
var Constants;
(function (Constants) {
    /**
     * The maximum amount of milliseconds to wait for a container before starting to create the
     * terminal process. This period helps ensure the terminal has good initial dimensions to work
     * with if it's going to be a foreground terminal.
     */
    Constants[Constants["WaitForContainerThreshold"] = 100] = "WaitForContainerThreshold";
    Constants[Constants["DefaultCols"] = 80] = "DefaultCols";
    Constants[Constants["DefaultRows"] = 30] = "DefaultRows";
    Constants[Constants["MaxCanvasWidth"] = 4096] = "MaxCanvasWidth";
})(Constants || (Constants = {}));
let xtermConstructor;
const shellIntegrationSupportedShellTypes = [
    "bash" /* PosixShellType.Bash */,
    "zsh" /* PosixShellType.Zsh */,
    "pwsh" /* GeneralShellType.PowerShell */,
    "python" /* GeneralShellType.Python */,
];
let TerminalInstance = class TerminalInstance extends Disposable {
    static { TerminalInstance_1 = this; }
    static { this._instanceIdCounter = 1; }
    get domElement() {
        return this._wrapperElement;
    }
    get usedShellIntegrationInjection() {
        return this._usedShellIntegrationInjection;
    }
    pauseInputEvents(barrier) {
        this._pauseInputEventBarrier = barrier;
    }
    get store() {
        return this._store;
    }
    get extEnvironmentVariableCollection() {
        return this._processManager.extEnvironmentVariableCollection;
    }
    get waitOnExit() {
        return (this._shellLaunchConfig.attachPersistentProcess?.waitOnExit ||
            this._shellLaunchConfig.waitOnExit);
    }
    set waitOnExit(value) {
        this._shellLaunchConfig.waitOnExit = value;
    }
    get targetRef() {
        return this._targetRef;
    }
    get target() {
        return this._targetRef.object;
    }
    set target(value) {
        this._targetRef.object = value;
        this._onDidChangeTarget.fire(value);
    }
    get instanceId() {
        return this._instanceId;
    }
    get resource() {
        return this._resource;
    }
    get cols() {
        if (this._fixedCols !== undefined) {
            return this._fixedCols;
        }
        if (this._dimensionsOverride && this._dimensionsOverride.cols) {
            if (this._dimensionsOverride.forceExactSize) {
                return this._dimensionsOverride.cols;
            }
            return Math.min(Math.max(this._dimensionsOverride.cols, 2), this._cols);
        }
        return this._cols;
    }
    get rows() {
        if (this._fixedRows !== undefined) {
            return this._fixedRows;
        }
        if (this._dimensionsOverride && this._dimensionsOverride.rows) {
            if (this._dimensionsOverride.forceExactSize) {
                return this._dimensionsOverride.rows;
            }
            return Math.min(Math.max(this._dimensionsOverride.rows, 2), this._rows);
        }
        return this._rows;
    }
    get isDisposed() {
        return this._store.isDisposed;
    }
    get fixedCols() {
        return this._fixedCols;
    }
    get fixedRows() {
        return this._fixedRows;
    }
    get maxCols() {
        return this._cols;
    }
    get maxRows() {
        return this._rows;
    }
    // TODO: Ideally processId would be merged into processReady
    get processId() {
        return this._processManager.shellProcessId;
    }
    // TODO: How does this work with detached processes?
    // TODO: Should this be an event as it can fire twice?
    get processReady() {
        return this._processManager.ptyProcessReady;
    }
    get hasChildProcesses() {
        return (this.shellLaunchConfig.attachPersistentProcess?.hasChildProcesses ||
            this._processManager.hasChildProcesses);
    }
    get reconnectionProperties() {
        return (this.shellLaunchConfig.attachPersistentProcess?.reconnectionProperties ||
            this.shellLaunchConfig.reconnectionProperties);
    }
    get areLinksReady() {
        return this._areLinksReady;
    }
    get initialDataEvents() {
        return this._initialDataEvents;
    }
    get exitCode() {
        return this._exitCode;
    }
    get exitReason() {
        return this._exitReason;
    }
    get hadFocusOnExit() {
        return this._hadFocusOnExit;
    }
    get isTitleSetByProcess() {
        return !!this._messageTitleDisposable.value;
    }
    get shellLaunchConfig() {
        return this._shellLaunchConfig;
    }
    get shellType() {
        return this._shellType;
    }
    get os() {
        return this._processManager.os;
    }
    get isRemote() {
        return this._processManager.remoteAuthority !== undefined;
    }
    get remoteAuthority() {
        return this._processManager.remoteAuthority;
    }
    get hasFocus() {
        return dom.isAncestorOfActiveElement(this._wrapperElement);
    }
    get title() {
        return this._title;
    }
    get titleSource() {
        return this._titleSource;
    }
    get icon() {
        return this._getIcon();
    }
    get color() {
        return this._getColor();
    }
    get processName() {
        return this._processName;
    }
    get sequence() {
        return this._sequence;
    }
    get staticTitle() {
        return this._staticTitle;
    }
    get progressState() {
        return this.xterm?.progressState;
    }
    get workspaceFolder() {
        return this._workspaceFolder;
    }
    get cwd() {
        return this._cwd;
    }
    get initialCwd() {
        return this._initialCwd;
    }
    get description() {
        if (this._description) {
            return this._description;
        }
        const type = this.shellLaunchConfig.attachPersistentProcess?.type || this.shellLaunchConfig.type;
        switch (type) {
            case 'Task':
                return terminalStrings.typeTask;
            case 'Local':
                return terminalStrings.typeLocal;
            default:
                return undefined;
        }
    }
    get userHome() {
        return this._userHome;
    }
    get shellIntegrationNonce() {
        return this._processManager.shellIntegrationNonce;
    }
    get injectedArgs() {
        return this._injectedArgs;
    }
    constructor(_terminalShellTypeContextKey, _shellLaunchConfig, _contextKeyService, _contextMenuService, instantiationService, _terminalConfigurationService, _terminalProfileResolverService, _pathService, _keybindingService, _notificationService, _preferencesService, _viewsService, _themeService, _configurationService, _logService, _storageService, _accessibilityService, _productService, _quickInputService, workbenchEnvironmentService, _workspaceContextService, _editorService, _workspaceTrustRequestService, _historyService, _telemetryService, _openerService, _commandService, _accessibilitySignalService, _viewDescriptorService) {
        super();
        this._terminalShellTypeContextKey = _terminalShellTypeContextKey;
        this._shellLaunchConfig = _shellLaunchConfig;
        this._contextKeyService = _contextKeyService;
        this._contextMenuService = _contextMenuService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._pathService = _pathService;
        this._keybindingService = _keybindingService;
        this._notificationService = _notificationService;
        this._preferencesService = _preferencesService;
        this._viewsService = _viewsService;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._storageService = _storageService;
        this._accessibilityService = _accessibilityService;
        this._productService = _productService;
        this._quickInputService = _quickInputService;
        this._workspaceContextService = _workspaceContextService;
        this._editorService = _editorService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._historyService = _historyService;
        this._telemetryService = _telemetryService;
        this._openerService = _openerService;
        this._commandService = _commandService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._viewDescriptorService = _viewDescriptorService;
        this._contributions = new Map();
        this._latestXtermWriteData = 0;
        this._latestXtermParseData = 0;
        this._title = '';
        this._titleSource = TitleEventSource.Process;
        this._cols = 0;
        this._rows = 0;
        this._cwd = undefined;
        this._initialCwd = undefined;
        this._injectedArgs = undefined;
        this._layoutSettingsChanged = true;
        this._areLinksReady = false;
        this._initialDataEventsListener = this._register(new MutableDisposable());
        this._initialDataEvents = [];
        this._messageTitleDisposable = this._register(new MutableDisposable());
        this._dndObserver = this._register(new MutableDisposable());
        this._processName = '';
        this._usedShellIntegrationInjection = false;
        this.capabilities = this._register(new TerminalCapabilityStoreMultiplexer());
        this.disableLayout = false;
        this._targetRef = new ImmortalReference(undefined);
        // The onExit event is special in that it fires and is disposed after the terminal instance
        // itself is disposed
        this._onExit = new Emitter();
        this.onExit = this._onExit.event;
        this._onDisposed = this._register(new Emitter());
        this.onDisposed = this._onDisposed.event;
        this._onProcessIdReady = this._register(new Emitter());
        this.onProcessIdReady = this._onProcessIdReady.event;
        this._onProcessReplayComplete = this._register(new Emitter());
        this.onProcessReplayComplete = this._onProcessReplayComplete.event;
        this._onTitleChanged = this._register(new Emitter());
        this.onTitleChanged = this._onTitleChanged.event;
        this._onIconChanged = this._register(new Emitter());
        this.onIconChanged = this._onIconChanged.event;
        this._onWillData = this._register(new Emitter());
        this.onWillData = this._onWillData.event;
        this._onData = this._register(new Emitter());
        this.onData = this._onData.event;
        this._onBinary = this._register(new Emitter());
        this.onBinary = this._onBinary.event;
        this._onRequestExtHostProcess = this._register(new Emitter());
        this.onRequestExtHostProcess = this._onRequestExtHostProcess.event;
        this._onDimensionsChanged = this._register(new Emitter());
        this.onDimensionsChanged = this._onDimensionsChanged.event;
        this._onMaximumDimensionsChanged = this._register(new Emitter());
        this.onMaximumDimensionsChanged = this._onMaximumDimensionsChanged.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidRequestFocus = this._register(new Emitter());
        this.onDidRequestFocus = this._onDidRequestFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidInputData = this._register(new Emitter());
        this.onDidInputData = this._onDidInputData.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onRequestAddInstanceToGroup = this._register(new Emitter());
        this.onRequestAddInstanceToGroup = this._onRequestAddInstanceToGroup.event;
        this._onDidChangeHasChildProcesses = this._register(new Emitter());
        this.onDidChangeHasChildProcesses = this._onDidChangeHasChildProcesses.event;
        this._onDidExecuteText = this._register(new Emitter());
        this.onDidExecuteText = this._onDidExecuteText.event;
        this._onDidChangeTarget = this._register(new Emitter());
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onDidSendText = this._register(new Emitter());
        this.onDidSendText = this._onDidSendText.event;
        this._onDidChangeShellType = this._register(new Emitter());
        this.onDidChangeShellType = this._onDidChangeShellType.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onLineData = this._register(new Emitter({
            onDidAddFirstListener: async () => (this.xterm ?? (await this._xtermReadyPromise))?.raw.loadAddon(this._lineDataEventAddon),
        }));
        this.onLineData = this._onLineData.event;
        this._wrapperElement = document.createElement('div');
        this._wrapperElement.classList.add('terminal-wrapper');
        this._widgetManager = this._register(instantiationService.createInstance(TerminalWidgetManager));
        this._skipTerminalCommands = [];
        this._isExiting = false;
        this._hadFocusOnExit = false;
        this._isVisible = false;
        this._instanceId = TerminalInstance_1._instanceIdCounter++;
        this._hasHadInput = false;
        this._fixedRows = _shellLaunchConfig.attachPersistentProcess?.fixedDimensions?.rows;
        this._fixedCols = _shellLaunchConfig.attachPersistentProcess?.fixedDimensions?.cols;
        this._shellLaunchConfig.shellIntegrationEnvironmentReporting =
            this._configurationService.getValue("terminal.integrated.shellIntegration.environmentReporting" /* TerminalSettingId.ShellIntegrationEnvironmentReporting */);
        this._resource = getTerminalUri(this._workspaceContextService.getWorkspace().id, this.instanceId, this.title);
        if (this._shellLaunchConfig.attachPersistentProcess?.hideFromUser) {
            this._shellLaunchConfig.hideFromUser =
                this._shellLaunchConfig.attachPersistentProcess.hideFromUser;
        }
        if (this._shellLaunchConfig.attachPersistentProcess?.isFeatureTerminal) {
            this._shellLaunchConfig.isFeatureTerminal =
                this._shellLaunchConfig.attachPersistentProcess.isFeatureTerminal;
        }
        if (this._shellLaunchConfig.attachPersistentProcess?.type) {
            this._shellLaunchConfig.type = this._shellLaunchConfig.attachPersistentProcess.type;
        }
        if (this._shellLaunchConfig.attachPersistentProcess?.tabActions) {
            this._shellLaunchConfig.tabActions =
                this._shellLaunchConfig.attachPersistentProcess.tabActions;
        }
        if (this.shellLaunchConfig.cwd) {
            const cwdUri = typeof this._shellLaunchConfig.cwd === 'string'
                ? URI.from({
                    scheme: Schemas.file,
                    path: this._shellLaunchConfig.cwd,
                })
                : this._shellLaunchConfig.cwd;
            if (cwdUri) {
                this._workspaceFolder =
                    this._workspaceContextService.getWorkspaceFolder(cwdUri) ?? undefined;
            }
        }
        if (!this._workspaceFolder) {
            const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
            this._workspaceFolder = activeWorkspaceRootUri
                ? (this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined)
                : undefined;
        }
        const scopedContextKeyService = this._register(_contextKeyService.createScoped(this._wrapperElement));
        this._scopedContextKeyService = scopedContextKeyService;
        this._scopedInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));
        this._terminalFocusContextKey = TerminalContextKeys.focus.bindTo(scopedContextKeyService);
        this._terminalHasFixedWidth =
            TerminalContextKeys.terminalHasFixedWidth.bindTo(scopedContextKeyService);
        this._terminalHasTextContextKey =
            TerminalContextKeys.textSelected.bindTo(scopedContextKeyService);
        this._terminalAltBufferActiveContextKey =
            TerminalContextKeys.altBufferActive.bindTo(scopedContextKeyService);
        this._terminalShellIntegrationEnabledContextKey =
            TerminalContextKeys.terminalShellIntegrationEnabled.bindTo(scopedContextKeyService);
        this._logService.trace(`terminalInstance#ctor (instanceId: ${this.instanceId})`, this._shellLaunchConfig);
        this._register(this.capabilities.onDidAddCapabilityType((e) => this._logService.debug('terminalInstance added capability', e)));
        this._register(this.capabilities.onDidRemoveCapabilityType((e) => this._logService.debug('terminalInstance removed capability', e)));
        const capabilityListeners = this._register(new DisposableMap());
        this._register(this.capabilities.onDidAddCapabilityType((capability) => {
            capabilityListeners.get(capability)?.dispose();
            if (capability === 0 /* TerminalCapability.CwdDetection */) {
                const cwdDetection = this.capabilities.get(capability);
                if (cwdDetection) {
                    capabilityListeners.set(capability, cwdDetection.onDidChangeCwd((e) => {
                        this._cwd = e;
                        this._setTitle(this.title, TitleEventSource.Config);
                    }));
                }
            }
            if (capability === 2 /* TerminalCapability.CommandDetection */) {
                const commandDetection = this.capabilities.get(capability);
                if (commandDetection) {
                    commandDetection.promptInputModel.setShellType(this.shellType);
                    capabilityListeners.set(capability, Event.any(commandDetection.promptInputModel.onDidStartInput, commandDetection.promptInputModel.onDidChangeInput, commandDetection.promptInputModel.onDidFinishInput)(() => {
                        this._labelComputer?.refreshLabel(this);
                        refreshShellIntegrationInfoStatus(this);
                    }));
                }
            }
        }));
        this._register(this.capabilities.onDidRemoveCapabilityType((capability) => {
            capabilityListeners.get(capability)?.dispose();
        }));
        // Resolve just the icon ahead of time so that it shows up immediately in the tabs. This is
        // disabled in remote because this needs to be sync and the OS may differ on the remote
        // which would result in the wrong profile being selected and the wrong icon being
        // permanently attached to the terminal. This also doesn't work when the default profile
        // setting is set to null, that's handled after the process is created.
        if (!this.shellLaunchConfig.executable && !workbenchEnvironmentService.remoteAuthority) {
            this._terminalProfileResolverService.resolveIcon(this._shellLaunchConfig, OS);
        }
        this._icon = _shellLaunchConfig.attachPersistentProcess?.icon || _shellLaunchConfig.icon;
        // When a custom pty is used set the name immediately so it gets passed over to the exthost
        // and is available when Pseudoterminal.open fires.
        if (this.shellLaunchConfig.customPtyImplementation) {
            this._setTitle(this._shellLaunchConfig.name, TitleEventSource.Api);
        }
        this.statusList = this._register(this._scopedInstantiationService.createInstance(TerminalStatusList));
        this._initDimensions();
        this._processManager = this._createProcessManager();
        this._containerReadyBarrier = new AutoOpenBarrier(100 /* Constants.WaitForContainerThreshold */);
        this._attachBarrier = new AutoOpenBarrier(1000);
        this._xtermReadyPromise = this._createXterm();
        this._xtermReadyPromise
            .then(async () => {
            // Wait for a period to allow a container to be ready
            await this._containerReadyBarrier.wait();
            // Resolve the executable ahead of time if shell integration is enabled, this should not
            // be done for custom PTYs as that would cause extension Pseudoterminal-based terminals
            // to hang in resolver extensions
            let os;
            if (!this.shellLaunchConfig.customPtyImplementation &&
                this._terminalConfigurationService.config.shellIntegration?.enabled &&
                !this.shellLaunchConfig.executable) {
                os = await this._processManager.getBackendOS();
                const defaultProfile = await this._terminalProfileResolverService.getDefaultProfile({
                    remoteAuthority: this.remoteAuthority,
                    os,
                });
                this.shellLaunchConfig.executable = defaultProfile.path;
                this.shellLaunchConfig.args = defaultProfile.args;
                if (this.shellLaunchConfig.isExtensionOwnedTerminal) {
                    // Only use default icon and color and env if they are undefined in the SLC
                    this.shellLaunchConfig.icon ??= defaultProfile.icon;
                    this.shellLaunchConfig.color ??= defaultProfile.color;
                    this.shellLaunchConfig.env ??= defaultProfile.env;
                }
                else {
                    this.shellLaunchConfig.icon = defaultProfile.icon;
                    this.shellLaunchConfig.color = defaultProfile.color;
                    this.shellLaunchConfig.env = defaultProfile.env;
                }
            }
            // Resolve the shell type ahead of time to allow features that depend upon it to work
            // before the process is actually created (like terminal suggest manual request)
            if (os && this.shellLaunchConfig.executable) {
                this.setShellType(guessShellTypeFromExecutable(os, this.shellLaunchConfig.executable));
            }
            await this._createProcess();
            // Re-establish the title after reconnect
            if (this.shellLaunchConfig.attachPersistentProcess) {
                this._cwd = this.shellLaunchConfig.attachPersistentProcess.cwd;
                this._setTitle(this.shellLaunchConfig.attachPersistentProcess.title, this.shellLaunchConfig.attachPersistentProcess.titleSource);
                this.setShellType(this.shellType);
            }
            if (this._fixedCols) {
                await this._addScrollbar();
            }
        })
            .catch((err) => {
            // Ignore exceptions if the terminal is already disposed
            if (!this.isDisposed) {
                throw err;
            }
        });
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */)) {
                this._setAriaLabel(this.xterm?.raw, this._instanceId, this.title);
            }
            if (e.affectsConfiguration('terminal.integrated')) {
                this.updateConfig();
                this.setVisible(this._isVisible);
            }
            const layoutSettings = [
                "terminal.integrated.fontSize" /* TerminalSettingId.FontSize */,
                "terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */,
                "terminal.integrated.fontWeight" /* TerminalSettingId.FontWeight */,
                "terminal.integrated.fontWeightBold" /* TerminalSettingId.FontWeightBold */,
                "terminal.integrated.letterSpacing" /* TerminalSettingId.LetterSpacing */,
                "terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */,
                'editor.fontFamily',
            ];
            if (layoutSettings.some((id) => e.affectsConfiguration(id))) {
                this._layoutSettingsChanged = true;
                await this._resize();
            }
            if (e.affectsConfiguration("terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */)) {
                this._updateUnicodeVersion();
            }
            if (e.affectsConfiguration('editor.accessibilitySupport')) {
                this.updateAccessibilitySupport();
            }
            if (e.affectsConfiguration("terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */) ||
                e.affectsConfiguration("terminal.integrated.tabs.separator" /* TerminalSettingId.TerminalTitleSeparator */) ||
                e.affectsConfiguration("terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */)) {
                this._labelComputer?.refreshLabel(this);
            }
        }));
        this._register(this._workspaceContextService.onDidChangeWorkspaceFolders(() => this._labelComputer?.refreshLabel(this)));
        // Clear out initial data events after 10 seconds, hopefully extension hosts are up and
        // running at that point.
        let initialDataEventsTimeout = dom
            .getWindow(this._container)
            .setTimeout(() => {
            initialDataEventsTimeout = undefined;
            this._initialDataEvents = undefined;
            this._initialDataEventsListener.clear();
        }, 10000);
        this._register(toDisposable(() => {
            if (initialDataEventsTimeout) {
                dom.getWindow(this._container).clearTimeout(initialDataEventsTimeout);
            }
        }));
        // Initialize contributions
        const contributionDescs = TerminalExtensionsRegistry.getTerminalContributions();
        for (const desc of contributionDescs) {
            if (this._contributions.has(desc.id)) {
                onUnexpectedError(new Error(`Cannot have two terminal contributions with the same id ${desc.id}`));
                continue;
            }
            let contribution;
            try {
                contribution = this._register(this._scopedInstantiationService.createInstance(desc.ctor, {
                    instance: this,
                    processManager: this._processManager,
                    widgetManager: this._widgetManager,
                }));
                this._contributions.set(desc.id, contribution);
            }
            catch (err) {
                onUnexpectedError(err);
            }
            this._xtermReadyPromise.then((xterm) => {
                if (xterm) {
                    contribution.xtermReady?.(xterm);
                }
            });
            this._register(this.onDisposed(() => {
                contribution.dispose();
                this._contributions.delete(desc.id);
                // Just in case to prevent potential future memory leaks due to cyclic dependency.
                if ('instance' in contribution) {
                    delete contribution.instance;
                }
                if ('_instance' in contribution) {
                    delete contribution._instance;
                }
            }));
        }
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
    _getIcon() {
        if (!this._icon) {
            this._icon =
                this._processManager.processState >= 2 /* ProcessState.Launching */
                    ? getIconRegistry().getIcon(this._configurationService.getValue("terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */))
                    : undefined;
        }
        return this._icon;
    }
    _getColor() {
        if (this.shellLaunchConfig.color) {
            return this.shellLaunchConfig.color;
        }
        if (this.shellLaunchConfig?.attachPersistentProcess?.color) {
            return this.shellLaunchConfig.attachPersistentProcess.color;
        }
        if (this._processManager.processState >= 2 /* ProcessState.Launching */) {
            return undefined;
        }
        return undefined;
    }
    _initDimensions() {
        // The terminal panel needs to have been created to get the real view dimensions
        if (!this._container) {
            // Set the fallback dimensions if not
            this._cols = 80 /* Constants.DefaultCols */;
            this._rows = 30 /* Constants.DefaultRows */;
            return;
        }
        const computedStyle = dom.getWindow(this._container).getComputedStyle(this._container);
        const width = parseInt(computedStyle.width);
        const height = parseInt(computedStyle.height);
        this._evaluateColsAndRows(width, height);
    }
    /**
     * Evaluates and sets the cols and rows of the terminal if possible.
     * @param width The width of the container.
     * @param height The height of the container.
     * @return The terminal's width if it requires a layout.
     */
    _evaluateColsAndRows(width, height) {
        // Ignore if dimensions are undefined or 0
        if (!width || !height) {
            this._setLastKnownColsAndRows();
            return null;
        }
        const dimension = this._getDimension(width, height);
        if (!dimension) {
            this._setLastKnownColsAndRows();
            return null;
        }
        const font = this.xterm
            ? this.xterm.getFont()
            : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement));
        const newRC = getXtermScaledDimensions(dom.getWindow(this.domElement), font, dimension.width, dimension.height);
        if (!newRC) {
            this._setLastKnownColsAndRows();
            return null;
        }
        if (this._cols !== newRC.cols || this._rows !== newRC.rows) {
            this._cols = newRC.cols;
            this._rows = newRC.rows;
            this._fireMaximumDimensionsChanged();
        }
        return dimension.width;
    }
    _setLastKnownColsAndRows() {
        if (TerminalInstance_1._lastKnownGridDimensions) {
            this._cols = TerminalInstance_1._lastKnownGridDimensions.cols;
            this._rows = TerminalInstance_1._lastKnownGridDimensions.rows;
        }
    }
    _fireMaximumDimensionsChanged() {
        this._onMaximumDimensionsChanged.fire();
    }
    _getDimension(width, height) {
        // The font needs to have been initialized
        const font = this.xterm
            ? this.xterm.getFont()
            : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement));
        if (!font || !font.charWidth || !font.charHeight) {
            return undefined;
        }
        if (!this.xterm?.raw.element) {
            return undefined;
        }
        const computedStyle = dom
            .getWindow(this.xterm.raw.element)
            .getComputedStyle(this.xterm.raw.element);
        const horizontalPadding = parseInt(computedStyle.paddingLeft) +
            parseInt(computedStyle.paddingRight) +
            14; /*scroll bar padding*/
        const verticalPadding = parseInt(computedStyle.paddingTop) + parseInt(computedStyle.paddingBottom);
        TerminalInstance_1._lastKnownCanvasDimensions = new dom.Dimension(Math.min(4096 /* Constants.MaxCanvasWidth */, width - horizontalPadding), height -
            verticalPadding +
            (this._hasScrollBar && this._horizontalScrollbar ? -5 /* scroll bar height */ : 0));
        return TerminalInstance_1._lastKnownCanvasDimensions;
    }
    get persistentProcessId() {
        return this._processManager.persistentProcessId;
    }
    get shouldPersist() {
        return (this._processManager.shouldPersist &&
            !this.shellLaunchConfig.isTransient &&
            (!this.reconnectionProperties ||
                this._configurationService.getValue('task.reconnection') === true));
    }
    static getXtermConstructor(keybindingService, contextKeyService) {
        const keybinding = keybindingService.lookupKeybinding("workbench.action.terminal.focusAccessibleBuffer" /* TerminalContribCommandId.A11yFocusAccessibleBuffer */, contextKeyService);
        if (xtermConstructor) {
            return xtermConstructor;
        }
        xtermConstructor = Promises.withAsyncBody(async (resolve) => {
            const Terminal = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
            // Localize strings
            Terminal.strings.promptLabel = nls.localize('terminal.integrated.a11yPromptLabel', 'Terminal input');
            Terminal.strings.tooMuchOutput = keybinding
                ? nls.localize('terminal.integrated.useAccessibleBuffer', 'Use the accessible buffer {0} to manually review output', keybinding.getLabel())
                : nls.localize('terminal.integrated.useAccessibleBufferNoKb', 'Use the Terminal: Focus Accessible Buffer command to manually review output');
            resolve(Terminal);
        });
        return xtermConstructor;
    }
    /**
     * Create xterm.js instance and attach data listeners.
     */
    async _createXterm() {
        const Terminal = await TerminalInstance_1.getXtermConstructor(this._keybindingService, this._contextKeyService);
        if (this.isDisposed) {
            return undefined;
        }
        const disableShellIntegrationReporting = this.shellLaunchConfig.executable === undefined ||
            this.shellType === undefined ||
            !shellIntegrationSupportedShellTypes.includes(this.shellType);
        const xterm = this._scopedInstantiationService.createInstance(XtermTerminal, Terminal, {
            cols: this._cols,
            rows: this._rows,
            xtermColorProvider: this._scopedInstantiationService.createInstance(TerminalInstanceColorProvider, this._targetRef),
            capabilities: this.capabilities,
            shellIntegrationNonce: this._processManager.shellIntegrationNonce,
            disableShellIntegrationReporting,
        });
        this.xterm = xterm;
        this._resizeDebouncer = this._register(new TerminalResizeDebouncer(() => this._isVisible, () => xterm, async (cols, rows) => {
            xterm.raw.resize(cols, rows);
            await this._updatePtyDimensions(xterm.raw);
        }, async (cols) => {
            xterm.raw.resize(cols, xterm.raw.rows);
            await this._updatePtyDimensions(xterm.raw);
        }, async (rows) => {
            xterm.raw.resize(xterm.raw.cols, rows);
            await this._updatePtyDimensions(xterm.raw);
        }));
        this._register(toDisposable(() => (this._resizeDebouncer = undefined)));
        this.updateAccessibilitySupport();
        this._register(this.xterm.onDidRequestRunCommand((e) => {
            this.sendText(e.command.command, e.noNewLine ? false : true);
        }));
        this._register(this.xterm.onDidRequestRefreshDimensions(() => {
            if (this._lastLayoutDimensions) {
                this.layout(this._lastLayoutDimensions);
            }
        }));
        // Write initial text, deferring onLineFeed listener when applicable to avoid firing
        // onLineData events containing initialText
        const initialTextWrittenPromise = this._shellLaunchConfig.initialText
            ? new Promise((r) => this._writeInitialText(xterm, r))
            : undefined;
        const lineDataEventAddon = this._register(new LineDataEventAddon(initialTextWrittenPromise));
        this._register(lineDataEventAddon.onLineData((e) => this._onLineData.fire(e)));
        this._lineDataEventAddon = lineDataEventAddon;
        // Delay the creation of the bell listener to avoid showing the bell when the terminal
        // starts up or reconnects
        disposableTimeout(() => {
            this._register(xterm.raw.onBell(() => {
                if (this._configurationService.getValue("terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */) ||
                    this._configurationService.getValue("terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */)) {
                    this.statusList.add({
                        id: "bell" /* TerminalStatus.Bell */,
                        severity: Severity.Warning,
                        icon: Codicon.bell,
                        tooltip: nls.localize('bellStatus', 'Bell'),
                    }, this._terminalConfigurationService.config.bellDuration);
                }
                this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalBell);
            }));
        }, 1000, this._store);
        this._register(xterm.raw.onSelectionChange(() => this._onDidChangeSelection.fire(this)));
        this._register(xterm.raw.buffer.onBufferChange(() => this._refreshAltBufferContextKey()));
        this._register(this._processManager.onProcessData((e) => this._onProcessData(e)));
        this._register(xterm.raw.onData(async (data) => {
            await this._pauseInputEventBarrier?.wait();
            await this._processManager.write(data);
            this._onDidInputData.fire(data);
        }));
        this._register(xterm.raw.onBinary((data) => this._processManager.processBinary(data)));
        // Init winpty compat and link handler after process creation as they rely on the
        // underlying process OS
        this._register(this._processManager.onProcessReady(async (processTraits) => {
            // Respond to DA1 with basic conformance. Note that including this is required to avoid
            // a long delay in conpty 1.22+ where it waits for the response.
            // Reference: https://github.com/microsoft/terminal/blob/3760caed97fa9140a40777a8fbc1c95785e6d2ab/src/terminal/adapter/adaptDispatch.cpp#L1471-L1495
            if (processTraits?.windowsPty?.backend === 'conpty') {
                this._register(xterm.raw.parser.registerCsiHandler({ final: 'c' }, (params) => {
                    if (params.length === 0 || (params.length === 1 && params[0] === 0)) {
                        this._processManager.write('\x1b[?61;4c');
                        return true;
                    }
                    return false;
                }));
            }
            if (this._processManager.os) {
                lineDataEventAddon.setOperatingSystem(this._processManager.os);
            }
            xterm.raw.options.windowsPty = processTraits.windowsPty;
        }));
        this._register(this._processManager.onRestoreCommands((e) => this.xterm?.shellIntegration.deserialize(e)));
        this._register(this._viewDescriptorService.onDidChangeLocation(({ views }) => {
            if (views.some((v) => v.id === TERMINAL_VIEW_ID)) {
                xterm.refresh();
            }
        }));
        this._register(xterm.onDidChangeProgress(() => this._labelComputer?.refreshLabel(this)));
        // Register and update the terminal's shell integration status
        this._register(Event.runAndSubscribe(xterm.shellIntegration.onDidChangeSeenSequences, () => {
            if (xterm.shellIntegration.seenSequences.size > 0) {
                refreshShellIntegrationInfoStatus(this);
            }
        }));
        // Set up updating of the process cwd on key press, this is only needed when the cwd
        // detection capability has not been registered
        if (!this.capabilities.has(0 /* TerminalCapability.CwdDetection */)) {
            let onKeyListener = xterm.raw.onKey((e) => {
                const event = new StandardKeyboardEvent(e.domEvent);
                if (event.equals(3 /* KeyCode.Enter */)) {
                    this._updateProcessCwd();
                }
            });
            this._register(this.capabilities.onDidAddCapabilityType((e) => {
                if (e === 0 /* TerminalCapability.CwdDetection */) {
                    onKeyListener?.dispose();
                    onKeyListener = undefined;
                }
            }));
        }
        this._pathService.userHome().then((userHome) => {
            this._userHome = userHome.fsPath;
        });
        if (this._isVisible) {
            this._open();
        }
        return xterm;
    }
    async runCommand(commandLine, shouldExecute) {
        let commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        // Await command detection if the terminal is starting up
        if (!commandDetection &&
            (this._processManager.processState === 1 /* ProcessState.Uninitialized */ ||
                this._processManager.processState === 2 /* ProcessState.Launching */)) {
            const store = new DisposableStore();
            await Promise.race([
                new Promise((r) => {
                    store.add(this.capabilities.onDidAddCapabilityType((e) => {
                        if (e === 2 /* TerminalCapability.CommandDetection */) {
                            commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                            r();
                        }
                    }));
                }),
                timeout(2000),
            ]);
            store.dispose();
        }
        // Determine whether to send ETX (ctrl+c) before running the command. This should always
        // happen unless command detection can reliably say that a command is being entered and
        // there is no content in the prompt
        if (!commandDetection || commandDetection.promptInputModel.value.length > 0) {
            await this.sendText('\x03', false);
            // Wait a little before running the command to avoid the sequences being echoed while the ^C
            // is being evaluated
            await timeout(100);
        }
        // Use bracketed paste mode only when not running the command
        await this.sendText(commandLine, shouldExecute, !shouldExecute);
    }
    detachFromElement() {
        this._wrapperElement.remove();
        this._container = undefined;
    }
    attachToElement(container) {
        // The container did not change, do nothing
        if (this._container === container) {
            return;
        }
        if (!this._attachBarrier.isOpen()) {
            this._attachBarrier.open();
        }
        // The container changed, reattach
        this._container = container;
        this._container.appendChild(this._wrapperElement);
        // If xterm is already attached, call open again to pick up any changes to the window.
        if (this.xterm?.raw.element) {
            this.xterm.raw.open(this.xterm.raw.element);
        }
        this.xterm?.refresh();
        setTimeout(() => {
            if (this._store.isDisposed) {
                return;
            }
            this._initDragAndDrop(container);
        }, 0);
    }
    /**
     * Opens the terminal instance inside the parent DOM element previously set with
     * `attachToElement`, you must ensure the parent DOM element is explicitly visible before
     * invoking this function as it performs some DOM calculations internally
     */
    _open() {
        if (!this.xterm || this.xterm.raw.element) {
            return;
        }
        if (!this._container || !this._container.isConnected) {
            throw new Error('A container element needs to be set with `attachToElement` and be part of the DOM before calling `_open`');
        }
        const xtermElement = document.createElement('div');
        this._wrapperElement.appendChild(xtermElement);
        this._container.appendChild(this._wrapperElement);
        const xterm = this.xterm;
        // Attach the xterm object to the DOM, exposing it to the smoke tests
        this._wrapperElement.xterm = xterm.raw;
        const screenElement = xterm.attachToElement(xtermElement);
        // Fire xtermOpen on all contributions
        for (const contribution of this._contributions.values()) {
            if (!this.xterm) {
                this._xtermReadyPromise.then((xterm) => {
                    if (xterm) {
                        contribution.xtermOpen?.(xterm);
                    }
                });
            }
            else {
                contribution.xtermOpen?.(this.xterm);
            }
        }
        this._register(xterm.shellIntegration.onDidChangeStatus(() => {
            if (this.hasFocus) {
                this._setShellIntegrationContextKey();
            }
            else {
                this._terminalShellIntegrationEnabledContextKey.reset();
            }
        }));
        if (!xterm.raw.element || !xterm.raw.textarea) {
            throw new Error('xterm elements not set after open');
        }
        this._setAriaLabel(xterm.raw, this._instanceId, this._title);
        xterm.raw.attachCustomKeyEventHandler((event) => {
            // Disable all input if the terminal is exiting
            if (this._isExiting) {
                return false;
            }
            const standardKeyboardEvent = new StandardKeyboardEvent(event);
            const resolveResult = this._keybindingService.softDispatch(standardKeyboardEvent, standardKeyboardEvent.target);
            // Respect chords if the allowChords setting is set and it's not Escape. Escape is
            // handled specially for Zen Mode's Escape, Escape chord, plus it's important in
            // terminals generally
            const isValidChord = resolveResult.kind === 1 /* ResultKind.MoreChordsNeeded */ &&
                this._terminalConfigurationService.config.allowChords &&
                event.key !== 'Escape';
            if (this._keybindingService.inChordMode || isValidChord) {
                event.preventDefault();
                return false;
            }
            const SHOW_TERMINAL_CONFIG_PROMPT_KEY = 'terminal.integrated.showTerminalConfigPrompt';
            const EXCLUDED_KEYS = [
                'RightArrow',
                'LeftArrow',
                'UpArrow',
                'DownArrow',
                'Space',
                'Meta',
                'Control',
                'Shift',
                'Alt',
                '',
                'Delete',
                'Backspace',
                'Tab',
            ];
            // only keep track of input if prompt hasn't already been shown
            if (this._storageService.getBoolean(SHOW_TERMINAL_CONFIG_PROMPT_KEY, -1 /* StorageScope.APPLICATION */, true) &&
                !EXCLUDED_KEYS.includes(event.key) &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey) {
                this._hasHadInput = true;
            }
            // for keyboard events that resolve to commands described
            // within commandsToSkipShell, either alert or skip processing by xterm.js
            if (resolveResult.kind === 2 /* ResultKind.KbFound */ &&
                resolveResult.commandId &&
                this._skipTerminalCommands.some((k) => k === resolveResult.commandId) &&
                !this._terminalConfigurationService.config.sendKeybindingsToShell) {
                // don't alert when terminal is opened or closed
                if (this._storageService.getBoolean(SHOW_TERMINAL_CONFIG_PROMPT_KEY, -1 /* StorageScope.APPLICATION */, true) &&
                    this._hasHadInput &&
                    !TERMINAL_CREATION_COMMANDS.includes(resolveResult.commandId)) {
                    this._notificationService.prompt(Severity.Info, nls.localize('keybindingHandling', "Some keybindings don't go to the terminal by default and are handled by {0} instead.", this._productService.nameLong), [
                        {
                            label: nls.localize('configureTerminalSettings', 'Configure Terminal Settings'),
                            run: () => {
                                this._preferencesService.openSettings({
                                    jsonEditor: false,
                                    query: `@id:${"terminal.integrated.commandsToSkipShell" /* TerminalSettingId.CommandsToSkipShell */},${"terminal.integrated.sendKeybindingsToShell" /* TerminalSettingId.SendKeybindingsToShell */},${"terminal.integrated.allowChords" /* TerminalSettingId.AllowChords */}`,
                                });
                            },
                        },
                    ]);
                    this._storageService.store(SHOW_TERMINAL_CONFIG_PROMPT_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
                event.preventDefault();
                return false;
            }
            // Skip processing by xterm.js of keyboard events that match menu bar mnemonics
            if (this._terminalConfigurationService.config.allowMnemonics &&
                !isMacintosh &&
                event.altKey) {
                return false;
            }
            // If tab focus mode is on, tab is not passed to the terminal
            if (TabFocus.getTabFocusMode() && event.key === 'Tab') {
                return false;
            }
            // Prevent default when shift+tab is being sent to the terminal to avoid it bubbling up
            // and changing focus https://github.com/microsoft/vscode/issues/188329
            if (event.key === 'Tab' && event.shiftKey) {
                event.preventDefault();
                return true;
            }
            // Always have alt+F4 skip the terminal on Windows and allow it to be handled by the
            // system
            if (isWindows && event.altKey && event.key === 'F4' && !event.ctrlKey) {
                return false;
            }
            // Fallback to force ctrl+v to paste on browsers that do not support
            // navigator.clipboard.readText
            if (!BrowserFeatures.clipboard.readText && event.key === 'v' && event.ctrlKey) {
                return false;
            }
            return true;
        });
        this._register(dom.addDisposableListener(xterm.raw.element, 'mousedown', () => {
            // We need to listen to the mouseup event on the document since the user may release
            // the mouse button anywhere outside of _xterm.element.
            const listener = dom.addDisposableListener(xterm.raw.element.ownerDocument, 'mouseup', () => {
                // Delay with a setTimeout to allow the mouseup to propagate through the DOM
                // before evaluating the new selection state.
                setTimeout(() => this._refreshSelectionContextKey(), 0);
                listener.dispose();
            });
        }));
        this._register(dom.addDisposableListener(xterm.raw.element, 'touchstart', () => {
            xterm.raw.focus();
        }));
        // xterm.js currently drops selection on keyup as we need to handle this case.
        this._register(dom.addDisposableListener(xterm.raw.element, 'keyup', () => {
            // Wait until keyup has propagated through the DOM before evaluating
            // the new selection state.
            setTimeout(() => this._refreshSelectionContextKey(), 0);
        }));
        this._register(dom.addDisposableListener(xterm.raw.textarea, 'focus', () => this._setFocus(true)));
        this._register(dom.addDisposableListener(xterm.raw.textarea, 'blur', () => this._setFocus(false)));
        this._register(dom.addDisposableListener(xterm.raw.textarea, 'focusout', () => this._setFocus(false)));
        this._initDragAndDrop(this._container);
        this._widgetManager.attachToElement(screenElement);
        if (this._lastLayoutDimensions) {
            this.layout(this._lastLayoutDimensions);
        }
        this.updateConfig();
        // If IShellLaunchConfig.waitOnExit was true and the process finished before the terminal
        // panel was initialized.
        if (xterm.raw.options.disableStdin) {
            this._attachPressAnyKeyToCloseListener(xterm.raw);
        }
    }
    _setFocus(focused) {
        if (focused) {
            this._terminalFocusContextKey.set(true);
            this._setShellIntegrationContextKey();
            this._onDidFocus.fire(this);
        }
        else {
            this.resetFocusContextKey();
            this._onDidBlur.fire(this);
            this._refreshSelectionContextKey();
        }
    }
    _setShellIntegrationContextKey() {
        if (this.xterm) {
            this._terminalShellIntegrationEnabledContextKey.set(this.xterm.shellIntegration.status === 2 /* ShellIntegrationStatus.VSCode */);
        }
    }
    resetFocusContextKey() {
        this._terminalFocusContextKey.reset();
        this._terminalShellIntegrationEnabledContextKey.reset();
    }
    _initDragAndDrop(container) {
        const store = new DisposableStore();
        const dndController = store.add(this._scopedInstantiationService.createInstance(TerminalInstanceDragAndDropController, container));
        store.add(dndController.onDropTerminal((e) => this._onRequestAddInstanceToGroup.fire(e)));
        store.add(dndController.onDropFile(async (path) => {
            this.focus();
            await this.sendPath(path, false);
        }));
        store.add(new dom.DragAndDropObserver(container, dndController));
        this._dndObserver.value = store;
    }
    hasSelection() {
        return this.xterm ? this.xterm.raw.hasSelection() : false;
    }
    get selection() {
        return this.xterm && this.hasSelection() ? this.xterm.raw.getSelection() : undefined;
    }
    clearSelection() {
        this.xterm?.raw.clearSelection();
    }
    _refreshAltBufferContextKey() {
        this._terminalAltBufferActiveContextKey.set(!!(this.xterm && this.xterm.raw.buffer.active === this.xterm.raw.buffer.alternate));
    }
    dispose(reason) {
        if (this.shellLaunchConfig.type === 'Task' &&
            reason === TerminalExitReason.Process &&
            this._exitCode !== 0 &&
            !this.shellLaunchConfig.waitOnExit) {
            return;
        }
        if (this.isDisposed) {
            return;
        }
        this._logService.trace(`terminalInstance#dispose (instanceId: ${this.instanceId})`);
        dispose(this._widgetManager);
        if (this.xterm?.raw.element) {
            this._hadFocusOnExit = this.hasFocus;
        }
        if (this._wrapperElement.xterm) {
            this._wrapperElement.xterm = undefined;
        }
        if (this._horizontalScrollbar) {
            this._horizontalScrollbar.dispose();
            this._horizontalScrollbar = undefined;
        }
        try {
            this.xterm?.dispose();
        }
        catch (err) {
            // See https://github.com/microsoft/vscode/issues/153486
            this._logService.error('Exception occurred during xterm disposal', err);
        }
        // HACK: Workaround for Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=559561,
        // as 'blur' event in xterm.raw.textarea is not triggered on xterm.dispose()
        // See https://github.com/microsoft/vscode/issues/138358
        if (isFirefox) {
            this.resetFocusContextKey();
            this._terminalHasTextContextKey.reset();
            this._onDidBlur.fire(this);
        }
        if (this._pressAnyKeyToCloseListener) {
            this._pressAnyKeyToCloseListener.dispose();
            this._pressAnyKeyToCloseListener = undefined;
        }
        if (this._exitReason === undefined) {
            this._exitReason = reason ?? TerminalExitReason.Unknown;
        }
        this._processManager.dispose();
        // Process manager dispose/shutdown doesn't fire process exit, trigger with undefined if it
        // hasn't happened yet
        this._onProcessExit(undefined);
        this._onDisposed.fire(this);
        super.dispose();
    }
    async detachProcessAndDispose(reason) {
        // Detach the process and dispose the instance, without the instance dispose the terminal
        // won't go away. Force persist if the detach was requested by the user (not shutdown).
        await this._processManager.detachFromProcess(reason === TerminalExitReason.User);
        this.dispose(reason);
    }
    focus(force) {
        this._refreshAltBufferContextKey();
        if (!this.xterm) {
            return;
        }
        if (force || !dom.getActiveWindow().getSelection()?.toString()) {
            this.xterm.raw.focus();
            this._onDidRequestFocus.fire();
        }
    }
    async focusWhenReady(force) {
        await this._xtermReadyPromise;
        await this._attachBarrier.wait();
        this.focus(force);
    }
    async sendText(text, shouldExecute, bracketedPasteMode) {
        // Apply bracketed paste sequences if the terminal has the mode enabled, this will prevent
        // the text from triggering keybindings and ensure new lines are handled properly
        if (bracketedPasteMode && this.xterm?.raw.modes.bracketedPasteMode) {
            text = `\x1b[200~${text}\x1b[201~`;
        }
        // Normalize line endings to 'enter' press.
        text = text.replace(/\r?\n/g, '\r');
        if (shouldExecute && !text.endsWith('\r')) {
            text += '\r';
        }
        // Send it to the process
        this._logService.debug('sending data (vscode)', text);
        await this._processManager.write(text);
        this._onDidInputData.fire(text);
        this._onDidSendText.fire(text);
        this.xterm?.scrollToBottom();
        if (shouldExecute) {
            this._onDidExecuteText.fire();
        }
    }
    async sendPath(originalPath, shouldExecute) {
        return this.sendText(await this.preparePathForShell(originalPath), shouldExecute);
    }
    async preparePathForShell(originalPath) {
        // Wait for shell type to be ready
        await this.processReady;
        return preparePathForShell(originalPath, this.shellLaunchConfig.executable, this.title, this.shellType, this._processManager.backend, this._processManager.os);
    }
    setVisible(visible) {
        const didChange = this._isVisible !== visible;
        this._isVisible = visible;
        this._wrapperElement.classList.toggle('active', visible);
        if (visible && this.xterm) {
            this._open();
            // Flush any pending resizes
            this._resizeDebouncer?.flush();
            // Resize to re-evaluate dimensions, this will ensure when switching to a terminal it is
            // using the most up to date dimensions (eg. when terminal is created in the background
            // using cached dimensions of a split terminal).
            this._resize();
        }
        if (didChange) {
            this._onDidChangeVisibility.fire(visible);
        }
    }
    scrollDownLine() {
        this.xterm?.scrollDownLine();
    }
    scrollDownPage() {
        this.xterm?.scrollDownPage();
    }
    scrollToBottom() {
        this.xterm?.scrollToBottom();
    }
    scrollUpLine() {
        this.xterm?.scrollUpLine();
    }
    scrollUpPage() {
        this.xterm?.scrollUpPage();
    }
    scrollToTop() {
        this.xterm?.scrollToTop();
    }
    clearBuffer() {
        this._processManager.clearBuffer();
        this.xterm?.clearBuffer();
    }
    _refreshSelectionContextKey() {
        const isActive = !!this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        let isEditorActive = false;
        const editor = this._editorService.activeEditor;
        if (editor) {
            isEditorActive = editor instanceof TerminalEditorInput;
        }
        this._terminalHasTextContextKey.set((isActive || isEditorActive) && this.hasSelection());
    }
    _createProcessManager() {
        let deserializedCollections;
        if (this.shellLaunchConfig.attachPersistentProcess?.environmentVariableCollections) {
            deserializedCollections = deserializeEnvironmentVariableCollections(this.shellLaunchConfig.attachPersistentProcess.environmentVariableCollections);
        }
        const processManager = this._scopedInstantiationService.createInstance(TerminalProcessManager, this._instanceId, this.shellLaunchConfig?.cwd, deserializedCollections, this.shellLaunchConfig.attachPersistentProcess?.shellIntegrationNonce);
        this.capabilities.add(processManager.capabilities);
        this._register(processManager.onProcessReady(async (e) => {
            this._onProcessIdReady.fire(this);
            this._initialCwd = await this.getInitialCwd();
            // Set the initial name based on the _resolved_ shell launch config, this will also
            // ensure the resolved icon gets shown
            if (!this._labelComputer) {
                this._labelComputer = this._register(this._scopedInstantiationService.createInstance(TerminalLabelComputer));
                this._register(this._labelComputer.onDidChangeLabel((e) => {
                    const wasChanged = this._title !== e.title || this._description !== e.description;
                    if (wasChanged) {
                        this._title = e.title;
                        this._description = e.description;
                        this._onTitleChanged.fire(this);
                    }
                }));
            }
            if (this._shellLaunchConfig.name) {
                this._setTitle(this._shellLaunchConfig.name, TitleEventSource.Api);
            }
            else {
                // Listen to xterm.js' sequence title change event, trigger this async to ensure
                // _xtermReadyPromise is ready constructed since this is called from the ctor
                setTimeout(() => {
                    this._xtermReadyPromise.then((xterm) => {
                        if (xterm) {
                            this._messageTitleDisposable.value = xterm.raw.onTitleChange((e) => this._onTitleChange(e));
                        }
                    });
                });
                this._setTitle(this._shellLaunchConfig.executable, TitleEventSource.Process);
            }
        }));
        this._register(processManager.onProcessExit((exitCode) => this._onProcessExit(exitCode)));
        this._register(processManager.onDidChangeProperty(({ type, value }) => {
            switch (type) {
                case "cwd" /* ProcessPropertyType.Cwd */:
                    this._cwd = value;
                    this._labelComputer?.refreshLabel(this);
                    break;
                case "initialCwd" /* ProcessPropertyType.InitialCwd */:
                    this._initialCwd = value;
                    this._cwd = this._initialCwd;
                    this._setTitle(this.title, TitleEventSource.Config);
                    this._icon =
                        this._shellLaunchConfig.attachPersistentProcess?.icon || this._shellLaunchConfig.icon;
                    this._onIconChanged.fire({ instance: this, userInitiated: false });
                    break;
                case "title" /* ProcessPropertyType.Title */:
                    this._setTitle(value ?? '', TitleEventSource.Process);
                    break;
                case "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */:
                    this.setOverrideDimensions(value, true);
                    break;
                case "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */:
                    this._setResolvedShellLaunchConfig(value);
                    break;
                case "shellType" /* ProcessPropertyType.ShellType */:
                    this.setShellType(value);
                    break;
                case "hasChildProcesses" /* ProcessPropertyType.HasChildProcesses */:
                    this._onDidChangeHasChildProcesses.fire(value);
                    break;
                case "usedShellIntegrationInjection" /* ProcessPropertyType.UsedShellIntegrationInjection */:
                    this._usedShellIntegrationInjection = true;
                    break;
            }
        }));
        this._initialDataEventsListener.value = processManager.onProcessData((ev) => this._initialDataEvents?.push(ev.data));
        this._register(processManager.onProcessReplayComplete(() => this._onProcessReplayComplete.fire()));
        this._register(processManager.onEnvironmentVariableInfoChanged((e) => this._onEnvironmentVariableInfoChanged(e)));
        this._register(processManager.onPtyDisconnect(() => {
            if (this.xterm) {
                this.xterm.raw.options.disableStdin = true;
            }
            this.statusList.add({
                id: "disconnected" /* TerminalStatus.Disconnected */,
                severity: Severity.Error,
                icon: Codicon.debugDisconnect,
                tooltip: nls.localize('disconnectStatus', 'Lost connection to process'),
            });
        }));
        this._register(processManager.onPtyReconnect(() => {
            if (this.xterm) {
                this.xterm.raw.options.disableStdin = false;
            }
            this.statusList.remove("disconnected" /* TerminalStatus.Disconnected */);
        }));
        return processManager;
    }
    async _createProcess() {
        if (this.isDisposed) {
            return;
        }
        const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot(Schemas.file);
        if (activeWorkspaceRootUri) {
            const trusted = await this._trust();
            if (!trusted) {
                this._onProcessExit({
                    message: nls.localize('workspaceNotTrustedCreateTerminal', 'Cannot launch a terminal process in an untrusted workspace'),
                });
            }
        }
        else if (this._cwd && this._userHome && this._cwd !== this._userHome) {
            // something strange is going on if cwd is not userHome in an empty workspace
            this._onProcessExit({
                message: nls.localize('workspaceNotTrustedCreateTerminalCwd', 'Cannot launch a terminal process in an untrusted workspace with cwd {0} and userHome {1}', this._cwd, this._userHome),
            });
        }
        // Re-evaluate dimensions if the container has been set since the xterm instance was created
        if (this._container && this._cols === 0 && this._rows === 0) {
            this._initDimensions();
            this.xterm?.raw.resize(this._cols || 80 /* Constants.DefaultCols */, this._rows || 30 /* Constants.DefaultRows */);
        }
        const originalIcon = this.shellLaunchConfig.icon;
        await this._processManager
            .createProcess(this._shellLaunchConfig, this._cols || 80 /* Constants.DefaultCols */, this._rows || 30 /* Constants.DefaultRows */)
            .then((result) => {
            if (result) {
                if ('message' in result) {
                    this._onProcessExit(result);
                }
                else if ('injectedArgs' in result) {
                    this._injectedArgs = result.injectedArgs;
                }
            }
        });
        if (this.isDisposed) {
            return;
        }
        if (this.xterm?.shellIntegration) {
            this.capabilities.add(this.xterm.shellIntegration.capabilities);
        }
        if (originalIcon !== this.shellLaunchConfig.icon || this.shellLaunchConfig.color) {
            this._icon =
                this._shellLaunchConfig.attachPersistentProcess?.icon || this._shellLaunchConfig.icon;
            this._onIconChanged.fire({ instance: this, userInitiated: false });
        }
    }
    registerMarker(offset) {
        return this.xterm?.raw.registerMarker(offset);
    }
    addBufferMarker(properties) {
        this.capabilities.get(4 /* TerminalCapability.BufferMarkDetection */)?.addMark(properties);
    }
    scrollToMark(startMarkId, endMarkId, highlight) {
        this.xterm?.markTracker.scrollToClosestMarker(startMarkId, endMarkId, highlight);
    }
    async freePortKillProcess(port, command) {
        await this._processManager?.freePortKillProcess(port);
        this.runCommand(command, false);
    }
    _onProcessData(ev) {
        // Ensure events are split by SI command execute and command finished sequence to ensure the
        // output of the command can be read by extensions and the output of the command is of a
        // consistent form respectively. This must be done here as xterm.js does not currently have
        // a listener for when individual data events are parsed, only `onWriteParsed` which fires
        // when the write buffer is flushed.
        const leadingSegmentedData = [];
        const matches = ev.data.matchAll(/(?<seq>\x1b\][16]33;(?:C|D(?:;\d+)?)\x07)/g);
        let i = 0;
        for (const match of matches) {
            if (match.groups?.seq === undefined) {
                throw new BugIndicatingError('seq must be defined');
            }
            leadingSegmentedData.push(ev.data.substring(i, match.index));
            leadingSegmentedData.push(match.groups?.seq ?? '');
            i = match.index + match[0].length;
        }
        const lastData = ev.data.substring(i);
        // Write all leading segmented data first, followed by the last data, tracking commit if
        // necessary
        for (let i = 0; i < leadingSegmentedData.length; i++) {
            this._writeProcessData(leadingSegmentedData[i]);
        }
        if (ev.trackCommit) {
            ev.writePromise = new Promise((r) => this._writeProcessData(lastData, r));
        }
        else {
            this._writeProcessData(lastData);
        }
    }
    _writeProcessData(data, cb) {
        this._onWillData.fire(data);
        const messageId = ++this._latestXtermWriteData;
        this.xterm?.raw.write(data, () => {
            this._latestXtermParseData = messageId;
            this._processManager.acknowledgeDataEvent(data.length);
            cb?.();
            this._onData.fire(data);
        });
    }
    /**
     * Called when either a process tied to a terminal has exited or when a terminal renderer
     * simulates a process exiting (e.g. custom execution task).
     * @param exitCode The exit code of the process, this is undefined when the terminal was exited
     * through user action.
     */
    async _onProcessExit(exitCodeOrError) {
        // Prevent dispose functions being triggered multiple times
        if (this._isExiting) {
            return;
        }
        const parsedExitResult = parseExitResult(exitCodeOrError, this.shellLaunchConfig, this._processManager.processState, this._initialCwd);
        if (this._usedShellIntegrationInjection &&
            this._processManager.processState === 4 /* ProcessState.KilledDuringLaunch */ &&
            parsedExitResult?.code !== 0) {
            this._relaunchWithShellIntegrationDisabled(parsedExitResult?.message);
            this._onExit.fire(exitCodeOrError);
            return;
        }
        this._isExiting = true;
        await this._flushXtermData();
        this._exitCode = parsedExitResult?.code;
        const exitMessage = parsedExitResult?.message;
        this._logService.debug('Terminal process exit', 'instanceId', this.instanceId, 'code', this._exitCode, 'processState', this._processManager.processState);
        // Only trigger wait on exit when the exit was *not* triggered by the
        // user (via the `workbench.action.terminal.kill` command).
        const waitOnExit = this.waitOnExit;
        if (waitOnExit && this._processManager.processState !== 5 /* ProcessState.KilledByUser */) {
            this._xtermReadyPromise.then((xterm) => {
                if (!xterm) {
                    return;
                }
                if (exitMessage) {
                    xterm.raw.write(formatMessageForTerminal(exitMessage));
                }
                switch (typeof waitOnExit) {
                    case 'string':
                        xterm.raw.write(formatMessageForTerminal(waitOnExit, { excludeLeadingNewLine: true }));
                        break;
                    case 'function':
                        if (this.exitCode !== undefined) {
                            xterm.raw.write(formatMessageForTerminal(waitOnExit(this.exitCode), {
                                excludeLeadingNewLine: true,
                            }));
                        }
                        break;
                }
                // Disable all input if the terminal is exiting and listen for next keypress
                xterm.raw.options.disableStdin = true;
                if (xterm.raw.textarea) {
                    this._attachPressAnyKeyToCloseListener(xterm.raw);
                }
            });
        }
        else {
            if (exitMessage) {
                const failedDuringLaunch = this._processManager.processState === 4 /* ProcessState.KilledDuringLaunch */;
                if (failedDuringLaunch ||
                    (this._terminalConfigurationService.config.showExitAlert &&
                        this.xterm?.lastInputEvent !== /*Ctrl+D*/ '\x04')) {
                    // Always show launch failures
                    this._notificationService.notify({
                        message: exitMessage,
                        severity: Severity.Error,
                        actions: {
                            primary: [this._scopedInstantiationService.createInstance(TerminalLaunchHelpAction)],
                        },
                    });
                }
                else {
                    // Log to help surface the error in case users report issues with showExitAlert
                    // disabled
                    this._logService.warn(exitMessage);
                }
            }
            this.dispose(TerminalExitReason.Process);
        }
        // First onExit to consumers, this can happen after the terminal has already been disposed.
        this._onExit.fire(exitCodeOrError);
        // Dispose of the onExit event if the terminal will not be reused again
        if (this.isDisposed) {
            this._onExit.dispose();
        }
    }
    _relaunchWithShellIntegrationDisabled(exitMessage) {
        this._shellLaunchConfig.ignoreShellIntegration = true;
        this.relaunch();
        this.statusList.add({
            id: "shell-integration-attention-needed" /* TerminalStatus.ShellIntegrationAttentionNeeded */,
            severity: Severity.Warning,
            icon: Codicon.warning,
            tooltip: `${exitMessage} ` +
                nls.localize('launchFailed.exitCodeOnlyShellIntegration', 'Disabling shell integration in user settings might help.'),
            hoverActions: [
                {
                    commandId: "workbench.action.terminal.learnMore" /* TerminalCommandId.ShellIntegrationLearnMore */,
                    label: nls.localize('shellIntegration.learnMore', 'Learn more about shell integration'),
                    run: () => {
                        this._openerService.open('https://code.visualstudio.com/docs/editor/integrated-terminal#_shell-integration');
                    },
                },
                {
                    commandId: 'workbench.action.openSettings',
                    label: nls.localize('shellIntegration.openSettings', 'Open user settings'),
                    run: () => {
                        this._commandService.executeCommand('workbench.action.openSettings', 'terminal.integrated.shellIntegration.enabled');
                    },
                },
            ],
        });
        this._telemetryService.publicLog2('terminal/shellIntegrationFailureProcessExit');
    }
    /**
     * Ensure write calls to xterm.js have finished before resolving.
     */
    _flushXtermData() {
        if (this._latestXtermWriteData === this._latestXtermParseData) {
            return Promise.resolve();
        }
        let retries = 0;
        return new Promise((r) => {
            const interval = dom.disposableWindowInterval(dom.getActiveWindow().window, () => {
                if (this._latestXtermWriteData === this._latestXtermParseData || ++retries === 5) {
                    interval.dispose();
                    r();
                }
            }, 20);
        });
    }
    _attachPressAnyKeyToCloseListener(xterm) {
        if (xterm.textarea && !this._pressAnyKeyToCloseListener) {
            this._pressAnyKeyToCloseListener = dom.addDisposableListener(xterm.textarea, 'keypress', (event) => {
                if (this._pressAnyKeyToCloseListener) {
                    this._pressAnyKeyToCloseListener.dispose();
                    this._pressAnyKeyToCloseListener = undefined;
                    this.dispose(TerminalExitReason.Process);
                    event.preventDefault();
                }
            });
        }
    }
    _writeInitialText(xterm, callback) {
        if (!this._shellLaunchConfig.initialText) {
            callback?.();
            return;
        }
        const text = typeof this._shellLaunchConfig.initialText === 'string'
            ? this._shellLaunchConfig.initialText
            : this._shellLaunchConfig.initialText?.text;
        if (typeof this._shellLaunchConfig.initialText === 'string') {
            xterm.raw.writeln(text, callback);
        }
        else {
            if (this._shellLaunchConfig.initialText.trailingNewLine) {
                xterm.raw.writeln(text, callback);
            }
            else {
                xterm.raw.write(text, callback);
            }
        }
    }
    async reuseTerminal(shell, reset = false) {
        // Unsubscribe any key listener we may have.
        this._pressAnyKeyToCloseListener?.dispose();
        this._pressAnyKeyToCloseListener = undefined;
        const xterm = this.xterm;
        if (xterm) {
            if (!reset) {
                // Ensure new processes' output starts at start of new line
                await new Promise((r) => xterm.raw.write('\n\x1b[G', r));
            }
            // Print initialText if specified
            if (shell.initialText) {
                this._shellLaunchConfig.initialText = shell.initialText;
                await new Promise((r) => this._writeInitialText(xterm, r));
            }
            // Clean up waitOnExit state
            if (this._isExiting && this._shellLaunchConfig.waitOnExit) {
                xterm.raw.options.disableStdin = false;
                this._isExiting = false;
            }
            if (reset) {
                xterm.clearDecorations();
            }
        }
        // Dispose the environment info widget if it exists
        this.statusList.remove("relaunch-needed" /* TerminalStatus.RelaunchNeeded */);
        if (!reset) {
            // HACK: Force initialText to be non-falsy for reused terminals such that the
            // conptyInheritCursor flag is passed to the node-pty, this flag can cause a Window to stop
            // responding in Windows 10 1903 so we only want to use it when something is definitely written
            // to the terminal.
            shell.initialText = ' ';
        }
        // Set the new shell launch config
        this._shellLaunchConfig = shell; // Must be done before calling _createProcess()
        await this._processManager
            .relaunch(this._shellLaunchConfig, this._cols || 80 /* Constants.DefaultCols */, this._rows || 30 /* Constants.DefaultRows */, reset)
            .then((result) => {
            if (result) {
                if ('message' in result) {
                    this._onProcessExit(result);
                }
                else if ('injectedArgs' in result) {
                    this._injectedArgs = result.injectedArgs;
                }
            }
        });
    }
    relaunch() {
        this.reuseTerminal(this._shellLaunchConfig, true);
    }
    _onTitleChange(title) {
        if (this.isTitleSetByProcess) {
            this._setTitle(title, TitleEventSource.Sequence);
        }
    }
    async _trust() {
        return ((await this._workspaceTrustRequestService.requestWorkspaceTrust({
            message: nls.localize('terminal.requestTrust', 'Creating a terminal process requires executing code'),
        })) === true);
    }
    async _updateProcessCwd() {
        if (this.isDisposed || this.shellLaunchConfig.customPtyImplementation) {
            return;
        }
        // reset cwd if it has changed, so file based url paths can be resolved
        try {
            const cwd = await this._refreshProperty("cwd" /* ProcessPropertyType.Cwd */);
            if (typeof cwd !== 'string') {
                throw new Error(`cwd is not a string ${cwd}`);
            }
        }
        catch (e) {
            // Swallow this as it means the process has been killed
            if (e instanceof Error && e.message === 'Cannot refresh property when process is not set') {
                return;
            }
            throw e;
        }
    }
    updateConfig() {
        this._setCommandsToSkipShell(this._terminalConfigurationService.config.commandsToSkipShell);
        this._refreshEnvironmentVariableInfoWidgetState(this._processManager.environmentVariableInfo);
    }
    async _updateUnicodeVersion() {
        this._processManager.setUnicodeVersion(this._terminalConfigurationService.config.unicodeVersion);
    }
    updateAccessibilitySupport() {
        this.xterm.raw.options.screenReaderMode = this._accessibilityService.isScreenReaderOptimized();
    }
    _setCommandsToSkipShell(commands) {
        const excludeCommands = commands
            .filter((command) => command[0] === '-')
            .map((command) => command.slice(1));
        this._skipTerminalCommands = DEFAULT_COMMANDS_TO_SKIP_SHELL.filter((defaultCommand) => {
            return !excludeCommands.includes(defaultCommand);
        }).concat(commands);
    }
    layout(dimension) {
        this._lastLayoutDimensions = dimension;
        if (this.disableLayout) {
            return;
        }
        // Don't layout if dimensions are invalid (eg. the container is not attached to the DOM or
        // if display: none
        if (dimension.width <= 0 || dimension.height <= 0) {
            return;
        }
        // Evaluate columns and rows, exclude the wrapper element's margin
        const terminalWidth = this._evaluateColsAndRows(dimension.width, dimension.height);
        if (!terminalWidth) {
            return;
        }
        this._resize();
        // Signal the container is ready
        if (!this._containerReadyBarrier.isOpen()) {
            this._containerReadyBarrier.open();
        }
        // Layout all contributions
        for (const contribution of this._contributions.values()) {
            if (!this.xterm) {
                this._xtermReadyPromise.then((xterm) => {
                    if (xterm) {
                        contribution.layout?.(xterm, dimension);
                    }
                });
            }
            else {
                contribution.layout?.(this.xterm, dimension);
            }
        }
    }
    async _resize(immediate) {
        if (!this.xterm) {
            return;
        }
        let cols = this.cols;
        let rows = this.rows;
        // Only apply these settings when the terminal is visible so that
        // the characters are measured correctly.
        if (this._isVisible && this._layoutSettingsChanged) {
            const font = this.xterm.getFont();
            const config = this._terminalConfigurationService.config;
            this.xterm.raw.options.letterSpacing = font.letterSpacing;
            this.xterm.raw.options.lineHeight = font.lineHeight;
            this.xterm.raw.options.fontSize = font.fontSize;
            this.xterm.raw.options.fontFamily = font.fontFamily;
            this.xterm.raw.options.fontWeight = config.fontWeight;
            this.xterm.raw.options.fontWeightBold = config.fontWeightBold;
            // Any of the above setting changes could have changed the dimensions of the
            // terminal, re-evaluate now.
            this._initDimensions();
            cols = this.cols;
            rows = this.rows;
            this._layoutSettingsChanged = false;
        }
        if (isNaN(cols) || isNaN(rows)) {
            return;
        }
        if (cols !== this.xterm.raw.cols || rows !== this.xterm.raw.rows) {
            if (this._fixedRows || this._fixedCols) {
                await this._updateProperty("fixedDimensions" /* ProcessPropertyType.FixedDimensions */, {
                    cols: this._fixedCols,
                    rows: this._fixedRows,
                });
            }
            this._onDimensionsChanged.fire();
        }
        TerminalInstance_1._lastKnownGridDimensions = { cols, rows };
        this._resizeDebouncer.resize(cols, rows, immediate ?? false);
    }
    async _updatePtyDimensions(rawXterm) {
        await this._processManager.setDimensions(rawXterm.cols, rawXterm.rows);
    }
    setShellType(shellType) {
        if (this._shellType === shellType) {
            return;
        }
        if (shellType) {
            this._shellType = shellType;
            this._terminalShellTypeContextKey.set(shellType?.toString());
            this._onDidChangeShellType.fire(shellType);
        }
    }
    _setAriaLabel(xterm, terminalId, title) {
        const labelParts = [];
        if (xterm && xterm.textarea) {
            if (title && title.length > 0) {
                labelParts.push(nls.localize('terminalTextBoxAriaLabelNumberAndTitle', 'Terminal {0}, {1}', terminalId, title));
            }
            else {
                labelParts.push(nls.localize('terminalTextBoxAriaLabel', 'Terminal {0}', terminalId));
            }
            const screenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
            if (!screenReaderOptimized) {
                labelParts.push(nls.localize('terminalScreenReaderMode', 'Run the command: Toggle Screen Reader Accessibility Mode for an optimized screen reader experience'));
            }
            const accessibilityHelpKeybinding = this._keybindingService
                .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
                ?.getLabel();
            if (this._configurationService.getValue("accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */) &&
                accessibilityHelpKeybinding) {
                labelParts.push(nls.localize('terminalHelpAriaLabel', 'Use {0} for terminal accessibility help', accessibilityHelpKeybinding));
            }
            xterm.textarea.setAttribute('aria-label', labelParts.join('\n'));
        }
    }
    _updateTitleProperties(title, eventSource) {
        if (!title) {
            return this._processName;
        }
        switch (eventSource) {
            case TitleEventSource.Process:
                if (this._processManager.os === 1 /* OperatingSystem.Windows */) {
                    // Extract the file name without extension
                    title = path.win32.parse(title).name;
                }
                else {
                    const firstSpaceIndex = title.indexOf(' ');
                    if (title.startsWith('/')) {
                        title = path.basename(title);
                    }
                    else if (firstSpaceIndex > -1) {
                        title = title.substring(0, firstSpaceIndex);
                    }
                }
                this._processName = title;
                break;
            case TitleEventSource.Api:
                // If the title has not been set by the API or the rename command, unregister the handler that
                // automatically updates the terminal name
                this._staticTitle = title;
                this._messageTitleDisposable.value = undefined;
                break;
            case TitleEventSource.Sequence:
                // On Windows, some shells will fire this with the full path which we want to trim
                // to show just the file name. This should only happen if the title looks like an
                // absolute Windows file path
                this._sequence = title;
                if (this._processManager.os === 1 /* OperatingSystem.Windows */ &&
                    title.match(/^[a-zA-Z]:\\.+\.[a-zA-Z]{1,3}/)) {
                    this._sequence = path.win32.parse(title).name;
                }
                break;
        }
        this._titleSource = eventSource;
        return title;
    }
    setOverrideDimensions(dimensions, immediate = false) {
        if (this._dimensionsOverride &&
            this._dimensionsOverride.forceExactSize &&
            !dimensions &&
            this._rows === 0 &&
            this._cols === 0) {
            // this terminal never had a real size => keep the last dimensions override exact size
            this._cols = this._dimensionsOverride.cols;
            this._rows = this._dimensionsOverride.rows;
        }
        this._dimensionsOverride = dimensions;
        if (immediate) {
            this._resize(true);
        }
        else {
            this._resize();
        }
    }
    async setFixedDimensions() {
        const cols = await this._quickInputService.input({
            title: nls.localize('setTerminalDimensionsColumn', 'Set Fixed Dimensions: Column'),
            placeHolder: 'Enter a number of columns or leave empty for automatic width',
            validateInput: async (text) => text.length > 0 && !text.match(/^\d+$/)
                ? {
                    content: 'Enter a number or leave empty size automatically',
                    severity: Severity.Error,
                }
                : undefined,
        });
        if (cols === undefined) {
            return;
        }
        this._fixedCols = this._parseFixedDimension(cols);
        this._labelComputer?.refreshLabel(this);
        this._terminalHasFixedWidth.set(!!this._fixedCols);
        const rows = await this._quickInputService.input({
            title: nls.localize('setTerminalDimensionsRow', 'Set Fixed Dimensions: Row'),
            placeHolder: 'Enter a number of rows or leave empty for automatic height',
            validateInput: async (text) => text.length > 0 && !text.match(/^\d+$/)
                ? {
                    content: 'Enter a number or leave empty size automatically',
                    severity: Severity.Error,
                }
                : undefined,
        });
        if (rows === undefined) {
            return;
        }
        this._fixedRows = this._parseFixedDimension(rows);
        this._labelComputer?.refreshLabel(this);
        await this._refreshScrollbar();
        this._resize();
        this.focus();
    }
    _parseFixedDimension(value) {
        if (value === '') {
            return undefined;
        }
        const parsed = parseInt(value);
        if (parsed <= 0) {
            throw new Error(`Could not parse dimension "${value}"`);
        }
        return parsed;
    }
    async toggleSizeToContentWidth() {
        if (!this.xterm?.raw.buffer.active) {
            return;
        }
        if (this._hasScrollBar) {
            this._terminalHasFixedWidth.set(false);
            this._fixedCols = undefined;
            this._fixedRows = undefined;
            this._hasScrollBar = false;
            this._initDimensions();
            await this._resize();
        }
        else {
            const font = this.xterm
                ? this.xterm.getFont()
                : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement));
            const maxColsForTexture = Math.floor(4096 /* Constants.MaxCanvasWidth */ / (font.charWidth ?? 20));
            // Fixed columns should be at least xterm.js' regular column count
            const proposedCols = Math.max(this.maxCols, Math.min(this.xterm.getLongestViewportWrappedLineLength(), maxColsForTexture));
            // Don't switch to fixed dimensions if the content already fits as it makes the scroll
            // bar look bad being off the edge
            if (proposedCols > this.xterm.raw.cols) {
                this._fixedCols = proposedCols;
            }
        }
        await this._refreshScrollbar();
        this._labelComputer?.refreshLabel(this);
        this.focus();
    }
    _refreshScrollbar() {
        if (this._fixedCols || this._fixedRows) {
            return this._addScrollbar();
        }
        return this._removeScrollbar();
    }
    async _addScrollbar() {
        const charWidth = (this.xterm
            ? this.xterm.getFont()
            : this._terminalConfigurationService.getFont(dom.getWindow(this.domElement))).charWidth;
        if (!this.xterm?.raw.element || !this._container || !charWidth || !this._fixedCols) {
            return;
        }
        this._wrapperElement.classList.add('fixed-dims');
        this._hasScrollBar = true;
        this._initDimensions();
        await this._resize();
        this._terminalHasFixedWidth.set(true);
        if (!this._horizontalScrollbar) {
            this._horizontalScrollbar = this._register(new DomScrollableElement(this._wrapperElement, {
                vertical: 2 /* ScrollbarVisibility.Hidden */,
                horizontal: 1 /* ScrollbarVisibility.Auto */,
                useShadows: false,
                scrollYToX: false,
                consumeMouseWheelIfScrollbarIsNeeded: false,
            }));
            this._container.appendChild(this._horizontalScrollbar.getDomNode());
        }
        this._horizontalScrollbar.setScrollDimensions({
            width: this.xterm.raw.element.clientWidth,
            scrollWidth: this._fixedCols * charWidth + 40, // Padding + scroll bar
        });
        this._horizontalScrollbar.getDomNode().style.paddingBottom = '16px';
        // work around for https://github.com/xtermjs/xterm.js/issues/3482
        if (isWindows) {
            for (let i = this.xterm.raw.buffer.active.viewportY; i < this.xterm.raw.buffer.active.length; i++) {
                const line = this.xterm.raw.buffer.active.getLine(i);
                line._line.isWrapped = false;
            }
        }
    }
    async _removeScrollbar() {
        if (!this._container || !this._horizontalScrollbar) {
            return;
        }
        this._horizontalScrollbar.getDomNode().remove();
        this._horizontalScrollbar.dispose();
        this._horizontalScrollbar = undefined;
        this._wrapperElement.remove();
        this._wrapperElement.classList.remove('fixed-dims');
        this._container.appendChild(this._wrapperElement);
    }
    _setResolvedShellLaunchConfig(shellLaunchConfig) {
        this._shellLaunchConfig.args = shellLaunchConfig.args;
        this._shellLaunchConfig.cwd = shellLaunchConfig.cwd;
        this._shellLaunchConfig.executable = shellLaunchConfig.executable;
        this._shellLaunchConfig.env = shellLaunchConfig.env;
    }
    _onEnvironmentVariableInfoChanged(info) {
        if (info.requiresAction) {
            this.xterm?.raw.textarea?.setAttribute('aria-label', nls.localize('terminalStaleTextBoxAriaLabel', "Terminal {0} environment is stale, run the 'Show Environment Information' command for more information", this._instanceId));
        }
        this._refreshEnvironmentVariableInfoWidgetState(info);
    }
    async _refreshEnvironmentVariableInfoWidgetState(info) {
        // Check if the status should exist
        if (!info) {
            this.statusList.remove("relaunch-needed" /* TerminalStatus.RelaunchNeeded */);
            this.statusList.remove("env-var-info-changes-active" /* TerminalStatus.EnvironmentVariableInfoChangesActive */);
            return;
        }
        // Recreate the process seamlessly without informing the use if the following conditions are
        // met.
        if (
        // The change requires a relaunch
        info.requiresAction &&
            // The feature is enabled
            this._terminalConfigurationService.config.environmentChangesRelaunch &&
            // Has not been interacted with
            !this._processManager.hasWrittenData &&
            // Not a feature terminal or is a reconnecting task terminal (TODO: Need to explain the latter case)
            (!this._shellLaunchConfig.isFeatureTerminal ||
                (this.reconnectionProperties &&
                    this._configurationService.getValue('task.reconnection') === true)) &&
            // Not a custom pty
            !this._shellLaunchConfig.customPtyImplementation &&
            // Not an extension owned terminal
            !this._shellLaunchConfig.isExtensionOwnedTerminal &&
            // Not a reconnected or revived terminal
            !this._shellLaunchConfig.attachPersistentProcess &&
            // Not a Windows remote using ConPTY (#187084)
            !(this._processManager.remoteAuthority &&
                this._terminalConfigurationService.config.windowsEnableConpty &&
                (await this._processManager.getBackendOS()) === 1 /* OperatingSystem.Windows */)) {
            this.relaunch();
            return;
        }
        // Re-create statuses
        const workspaceFolder = getWorkspaceForTerminal(this.shellLaunchConfig.cwd, this._workspaceContextService, this._historyService);
        this.statusList.add(info.getStatus({ workspaceFolder }));
    }
    async getInitialCwd() {
        if (!this._initialCwd) {
            this._initialCwd = this._processManager.initialCwd;
        }
        return this._initialCwd;
    }
    async getCwd() {
        if (this.capabilities.has(0 /* TerminalCapability.CwdDetection */)) {
            return this.capabilities.get(0 /* TerminalCapability.CwdDetection */).getCwd();
        }
        else if (this.capabilities.has(1 /* TerminalCapability.NaiveCwdDetection */)) {
            return this.capabilities.get(1 /* TerminalCapability.NaiveCwdDetection */).getCwd();
        }
        return this._processManager.initialCwd;
    }
    async _refreshProperty(type) {
        await this.processReady;
        return this._processManager.refreshProperty(type);
    }
    async _updateProperty(type, value) {
        return this._processManager.updateProperty(type, value);
    }
    async rename(title) {
        this._setTitle(title, TitleEventSource.Api);
    }
    _setTitle(title, eventSource) {
        const reset = !title;
        title = this._updateTitleProperties(title, eventSource);
        const titleChanged = title !== this._title;
        this._title = title;
        this._labelComputer?.refreshLabel(this, reset);
        this._setAriaLabel(this.xterm?.raw, this._instanceId, this._title);
        if (titleChanged) {
            this._onTitleChanged.fire(this);
        }
    }
    async changeIcon(icon) {
        if (icon) {
            this._icon = icon;
            this._onIconChanged.fire({ instance: this, userInitiated: true });
            return icon;
        }
        const iconPicker = this._scopedInstantiationService.createInstance(TerminalIconPicker);
        const pickedIcon = await iconPicker.pickIcons();
        iconPicker.dispose();
        if (!pickedIcon) {
            return undefined;
        }
        this._icon = pickedIcon;
        this._onIconChanged.fire({ instance: this, userInitiated: true });
        return pickedIcon;
    }
    async changeColor(color, skipQuickPick) {
        if (color) {
            this.shellLaunchConfig.color = color;
            this._onIconChanged.fire({ instance: this, userInitiated: true });
            return color;
        }
        else if (skipQuickPick) {
            // Reset this tab's color
            this.shellLaunchConfig.color = '';
            this._onIconChanged.fire({ instance: this, userInitiated: true });
            return;
        }
        const icon = this._getIcon();
        if (!icon) {
            return;
        }
        const colorTheme = this._themeService.getColorTheme();
        const standardColors = getStandardColors(colorTheme);
        const colorStyleDisposable = createColorStyleElement(colorTheme);
        const items = [];
        for (const colorKey of standardColors) {
            const colorClass = getColorClass(colorKey);
            items.push({
                label: `$(${Codicon.circleFilled.id}) ${colorKey.replace('terminal.ansi', '')}`,
                id: colorKey,
                description: colorKey,
                iconClasses: [colorClass],
            });
        }
        items.push({ type: 'separator' });
        const showAllColorsItem = { label: 'Reset to default' };
        items.push(showAllColorsItem);
        const disposables = [];
        const quickPick = this._quickInputService.createQuickPick({ useSeparators: true });
        disposables.push(quickPick);
        quickPick.items = items;
        quickPick.matchOnDescription = true;
        quickPick.placeholder = nls.localize('changeColor', 'Select a color for the terminal');
        quickPick.show();
        const result = await new Promise((r) => {
            disposables.push(quickPick.onDidHide(() => r(undefined)));
            disposables.push(quickPick.onDidAccept(() => r(quickPick.selectedItems[0])));
        });
        dispose(disposables);
        if (result) {
            this.shellLaunchConfig.color = result.id;
            this._onIconChanged.fire({ instance: this, userInitiated: true });
        }
        quickPick.hide();
        colorStyleDisposable.dispose();
        return result?.id;
    }
    forceScrollbarVisibility() {
        this._wrapperElement.classList.add('force-scrollbar');
    }
    resetScrollbarVisibility() {
        this._wrapperElement.classList.remove('force-scrollbar');
    }
    setParentContextKeyService(parentContextKeyService) {
        this._scopedContextKeyService.updateParent(parentContextKeyService);
    }
    async handleMouseEvent(event, contextMenu) {
        // Don't handle mouse event if it was on the scroll bar
        if (dom.isHTMLElement(event.target) &&
            (event.target.classList.contains('scrollbar') || event.target.classList.contains('slider'))) {
            return { cancelContextMenu: true };
        }
        // Allow contributions to handle the mouse event first
        for (const contrib of this._contributions.values()) {
            const result = await contrib.handleMouseEvent?.(event);
            if (result?.handled) {
                return { cancelContextMenu: true };
            }
        }
        // Middle click
        if (event.which === 2) {
            switch (this._terminalConfigurationService.config.middleClickBehavior) {
                case 'default':
                default:
                    // Drop selection and focus terminal on Linux to enable middle button paste
                    // when click occurs on the selection itself.
                    this.focus();
                    break;
            }
            return;
        }
        // Right click
        if (event.which === 3) {
            // Shift click forces the context menu
            if (event.shiftKey) {
                openContextMenu(dom.getActiveWindow(), event, this, contextMenu, this._contextMenuService);
                return;
            }
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing') {
                if (!event.shiftKey) {
                    return { cancelContextMenu: true };
                }
                return;
            }
        }
    }
};
__decorate([
    debounce(50)
], TerminalInstance.prototype, "_fireMaximumDimensionsChanged", null);
__decorate([
    debounce(1000)
], TerminalInstance.prototype, "relaunch", null);
__decorate([
    debounce(2000)
], TerminalInstance.prototype, "_updateProcessCwd", null);
TerminalInstance = TerminalInstance_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, ITerminalConfigurationService),
    __param(6, ITerminalProfileResolverService),
    __param(7, IPathService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IPreferencesService),
    __param(11, IViewsService),
    __param(12, IThemeService),
    __param(13, IConfigurationService),
    __param(14, ITerminalLogService),
    __param(15, IStorageService),
    __param(16, IAccessibilityService),
    __param(17, IProductService),
    __param(18, IQuickInputService),
    __param(19, IWorkbenchEnvironmentService),
    __param(20, IWorkspaceContextService),
    __param(21, IEditorService),
    __param(22, IWorkspaceTrustRequestService),
    __param(23, IHistoryService),
    __param(24, ITelemetryService),
    __param(25, IOpenerService),
    __param(26, ICommandService),
    __param(27, IAccessibilitySignalService),
    __param(28, IViewDescriptorService)
], TerminalInstance);
export { TerminalInstance };
let TerminalInstanceDragAndDropController = class TerminalInstanceDragAndDropController extends Disposable {
    get onDropFile() {
        return this._onDropFile.event;
    }
    get onDropTerminal() {
        return this._onDropTerminal.event;
    }
    constructor(_container, _layoutService, _viewDescriptorService) {
        super();
        this._container = _container;
        this._layoutService = _layoutService;
        this._viewDescriptorService = _viewDescriptorService;
        this._onDropFile = this._register(new Emitter());
        this._onDropTerminal = this._register(new Emitter());
        this._register(toDisposable(() => this._clearDropOverlay()));
    }
    _clearDropOverlay() {
        this._dropOverlay?.remove();
        this._dropOverlay = undefined;
    }
    onDragEnter(e) {
        if (!containsDragType(e, DataTransfers.FILES, DataTransfers.RESOURCES, "Terminals" /* TerminalDataTransfers.Terminals */, CodeDataTransfers.FILES)) {
            return;
        }
        if (!this._dropOverlay) {
            this._dropOverlay = document.createElement('div');
            this._dropOverlay.classList.add('terminal-drop-overlay');
        }
        // Dragging terminals
        if (containsDragType(e, "Terminals" /* TerminalDataTransfers.Terminals */)) {
            const side = this._getDropSide(e);
            this._dropOverlay.classList.toggle('drop-before', side === 'before');
            this._dropOverlay.classList.toggle('drop-after', side === 'after');
        }
        if (!this._dropOverlay.parentElement) {
            this._container.appendChild(this._dropOverlay);
        }
    }
    onDragLeave(e) {
        this._clearDropOverlay();
    }
    onDragEnd(e) {
        this._clearDropOverlay();
    }
    onDragOver(e) {
        if (!e.dataTransfer || !this._dropOverlay) {
            return;
        }
        // Dragging terminals
        if (containsDragType(e, "Terminals" /* TerminalDataTransfers.Terminals */)) {
            const side = this._getDropSide(e);
            this._dropOverlay.classList.toggle('drop-before', side === 'before');
            this._dropOverlay.classList.toggle('drop-after', side === 'after');
        }
        this._dropOverlay.style.opacity = '1';
    }
    async onDrop(e) {
        this._clearDropOverlay();
        if (!e.dataTransfer) {
            return;
        }
        const terminalResources = getTerminalResourcesFromDragEvent(e);
        if (terminalResources) {
            for (const uri of terminalResources) {
                const side = this._getDropSide(e);
                this._onDropTerminal.fire({ uri, side });
            }
            return;
        }
        // Check if files were dragged from the tree explorer
        let path;
        const rawResources = e.dataTransfer.getData(DataTransfers.RESOURCES);
        if (rawResources) {
            path = URI.parse(JSON.parse(rawResources)[0]);
        }
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (!path && rawCodeFiles) {
            path = URI.file(JSON.parse(rawCodeFiles)[0]);
        }
        if (!path && e.dataTransfer.files.length > 0 && getPathForFile(e.dataTransfer.files[0])) {
            // Check if the file was dragged from the filesystem
            path = URI.file(getPathForFile(e.dataTransfer.files[0]));
        }
        if (!path) {
            return;
        }
        this._onDropFile.fire(path);
    }
    _getDropSide(e) {
        const target = this._container;
        if (!target) {
            return 'after';
        }
        const rect = target.getBoundingClientRect();
        return this._getViewOrientation() === 1 /* Orientation.HORIZONTAL */
            ? e.clientX - rect.left < rect.width / 2
                ? 'before'
                : 'after'
            : e.clientY - rect.top < rect.height / 2
                ? 'before'
                : 'after';
    }
    _getViewOrientation() {
        const panelPosition = this._layoutService.getPanelPosition();
        const terminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
        return terminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(panelPosition)
            ? 1 /* Orientation.HORIZONTAL */
            : 0 /* Orientation.VERTICAL */;
    }
};
TerminalInstanceDragAndDropController = __decorate([
    __param(1, IWorkbenchLayoutService),
    __param(2, IViewDescriptorService)
], TerminalInstanceDragAndDropController);
var TerminalLabelType;
(function (TerminalLabelType) {
    TerminalLabelType["Title"] = "title";
    TerminalLabelType["Description"] = "description";
})(TerminalLabelType || (TerminalLabelType = {}));
let TerminalLabelComputer = class TerminalLabelComputer extends Disposable {
    get title() {
        return this._title;
    }
    get description() {
        return this._description;
    }
    constructor(_fileService, _terminalConfigurationService, _workspaceContextService) {
        super();
        this._fileService = _fileService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._workspaceContextService = _workspaceContextService;
        this._title = '';
        this._description = '';
        this._onDidChangeLabel = this._register(new Emitter());
        this.onDidChangeLabel = this._onDidChangeLabel.event;
    }
    refreshLabel(instance, reset) {
        this._title = this.computeLabel(instance, this._terminalConfigurationService.config.tabs.title, "title" /* TerminalLabelType.Title */, reset);
        this._description = this.computeLabel(instance, this._terminalConfigurationService.config.tabs.description, "description" /* TerminalLabelType.Description */);
        if (this._title !== instance.title || this._description !== instance.description || reset) {
            this._onDidChangeLabel.fire({ title: this._title, description: this._description });
        }
    }
    computeLabel(instance, labelTemplate, labelType, reset) {
        const type = instance.shellLaunchConfig.attachPersistentProcess?.type || instance.shellLaunchConfig.type;
        const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const promptInputModel = commandDetection?.promptInputModel;
        const nonTaskSpinner = type === 'Task' ? '' : ' $(loading~spin)';
        const templateProperties = {
            cwd: instance.cwd || instance.initialCwd || '',
            cwdFolder: '',
            workspaceFolderName: instance.workspaceFolder?.name,
            workspaceFolder: instance.workspaceFolder
                ? path.basename(instance.workspaceFolder.uri.fsPath)
                : undefined,
            local: type === 'Local' ? terminalStrings.typeLocal : undefined,
            process: instance.processName,
            sequence: instance.sequence,
            task: type === 'Task' ? terminalStrings.typeTask : undefined,
            fixedDimensions: instance.fixedCols
                ? instance.fixedRows
                    ? `\u2194${instance.fixedCols} \u2195${instance.fixedRows}`
                    : `\u2194${instance.fixedCols}`
                : instance.fixedRows
                    ? `\u2195${instance.fixedRows}`
                    : '',
            separator: { label: this._terminalConfigurationService.config.tabs.separator },
            shellType: instance.shellType,
            // Shell command requires high confidence
            shellCommand: commandDetection?.executingCommand &&
                commandDetection.executingCommandConfidence === 'high' &&
                promptInputModel
                ? promptInputModel.value + nonTaskSpinner
                : undefined,
            // Shell prompt input does not require high confidence as it's largely for VS Code developers
            shellPromptInput: commandDetection?.executingCommand && promptInputModel
                ? promptInputModel.getCombinedString(true) + nonTaskSpinner
                : promptInputModel?.getCombinedString(true),
            progress: this._getProgressStateString(instance.progressState),
        };
        templateProperties.workspaceFolderName =
            instance.workspaceFolder?.name ?? templateProperties.workspaceFolder;
        labelTemplate = labelTemplate.trim();
        if (!labelTemplate) {
            return labelType === "title" /* TerminalLabelType.Title */ ? instance.processName || '' : '';
        }
        if (!reset && instance.staticTitle && labelType === "title" /* TerminalLabelType.Title */) {
            return (instance.staticTitle.replace(/[\n\r\t]/g, '') ||
                templateProperties.process?.replace(/[\n\r\t]/g, '') ||
                '');
        }
        const detection = instance.capabilities.has(0 /* TerminalCapability.CwdDetection */) ||
            instance.capabilities.has(1 /* TerminalCapability.NaiveCwdDetection */);
        const folders = this._workspaceContextService.getWorkspace().folders;
        const multiRootWorkspace = folders.length > 1;
        // Only set cwdFolder if detection is on
        if (templateProperties.cwd &&
            detection &&
            (!instance.shellLaunchConfig.isFeatureTerminal || labelType === "title" /* TerminalLabelType.Title */)) {
            const cwdUri = URI.from({
                scheme: instance.workspaceFolder?.uri.scheme || Schemas.file,
                path: instance.cwd ? path.resolve(instance.cwd) : undefined,
            });
            // Multi-root workspaces always show cwdFolder to disambiguate them, otherwise only show
            // when it differs from the workspace folder in which it was launched from
            let showCwd = false;
            if (multiRootWorkspace) {
                showCwd = true;
            }
            else if (instance.workspaceFolder?.uri) {
                const caseSensitive = this._fileService.hasCapability(instance.workspaceFolder.uri, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
                showCwd =
                    cwdUri.fsPath.localeCompare(instance.workspaceFolder.uri.fsPath, undefined, {
                        sensitivity: caseSensitive ? 'case' : 'base',
                    }) !== 0;
            }
            if (showCwd) {
                templateProperties.cwdFolder = path.basename(templateProperties.cwd);
            }
        }
        // Remove special characters that could mess with rendering
        const label = template(labelTemplate, templateProperties)
            .replace(/[\n\r\t]/g, '')
            .trim();
        return label === '' && labelType === "title" /* TerminalLabelType.Title */
            ? instance.processName || ''
            : label;
    }
    _getProgressStateString(progressState) {
        if (!progressState) {
            return '';
        }
        switch (progressState.state) {
            case 0:
                return '';
            case 1:
                return `${Math.round(progressState.value)}%`;
            case 2:
                return '$(error)';
            case 3:
                return '$(loading~spin)';
            case 4:
                return '$(alert)';
        }
    }
};
TerminalLabelComputer = __decorate([
    __param(0, IFileService),
    __param(1, ITerminalConfigurationService),
    __param(2, IWorkspaceContextService)
], TerminalLabelComputer);
export { TerminalLabelComputer };
export function parseExitResult(exitCodeOrError, shellLaunchConfig, processState, initialCwd) {
    // Only return a message if the exit code is non-zero
    if (exitCodeOrError === undefined || exitCodeOrError === 0) {
        return { code: exitCodeOrError, message: undefined };
    }
    const code = typeof exitCodeOrError === 'number' ? exitCodeOrError : exitCodeOrError.code;
    // Create exit code message
    let message = undefined;
    switch (typeof exitCodeOrError) {
        case 'number': {
            let commandLine = undefined;
            if (shellLaunchConfig.executable) {
                commandLine = shellLaunchConfig.executable;
                if (typeof shellLaunchConfig.args === 'string') {
                    commandLine += ` ${shellLaunchConfig.args}`;
                }
                else if (shellLaunchConfig.args && shellLaunchConfig.args.length) {
                    commandLine += shellLaunchConfig.args.map((a) => ` '${a}'`).join();
                }
            }
            if (processState === 4 /* ProcessState.KilledDuringLaunch */) {
                if (commandLine) {
                    message = nls.localize('launchFailed.exitCodeAndCommandLine', 'The terminal process "{0}" failed to launch (exit code: {1}).', commandLine, code);
                }
                else {
                    message = nls.localize('launchFailed.exitCodeOnly', 'The terminal process failed to launch (exit code: {0}).', code);
                }
            }
            else {
                if (commandLine) {
                    message = nls.localize('terminated.exitCodeAndCommandLine', 'The terminal process "{0}" terminated with exit code: {1}.', commandLine, code);
                }
                else {
                    message = nls.localize('terminated.exitCodeOnly', 'The terminal process terminated with exit code: {0}.', code);
                }
            }
            break;
        }
        case 'object': {
            // Ignore internal errors
            if (exitCodeOrError.message.toString().includes('Could not find pty with id')) {
                break;
            }
            // Convert conpty code-based failures into human friendly messages
            let innerMessage = exitCodeOrError.message;
            const conptyError = exitCodeOrError.message.match(/.*error code:\s*(\d+).*$/);
            if (conptyError) {
                const errorCode = conptyError.length > 1 ? parseInt(conptyError[1]) : undefined;
                switch (errorCode) {
                    case 5:
                        innerMessage = `Access was denied to the path containing your executable "${shellLaunchConfig.executable}". Manage and change your permissions to get this to work`;
                        break;
                    case 267:
                        innerMessage = `Invalid starting directory "${initialCwd}", review your terminal.integrated.cwd setting`;
                        break;
                    case 1260:
                        innerMessage = `Windows cannot open this program because it has been prevented by a software restriction policy. For more information, open Event Viewer or contact your system Administrator`;
                        break;
                }
            }
            message = nls.localize('launchFailed.errorMessage', 'The terminal process failed to launch: {0}.', innerMessage);
            break;
        }
    }
    return { code, message };
}
let TerminalInstanceColorProvider = class TerminalInstanceColorProvider {
    constructor(_target, _viewDescriptorService) {
        this._target = _target;
        this._viewDescriptorService = _viewDescriptorService;
    }
    getBackgroundColor(theme) {
        const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR);
        if (terminalBackground) {
            return terminalBackground;
        }
        if (this._target.object === TerminalLocation.Editor) {
            return theme.getColor(editorBackground);
        }
        const location = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
        if (location === 1 /* ViewContainerLocation.Panel */) {
            return theme.getColor(PANEL_BACKGROUND);
        }
        return theme.getColor(SIDE_BAR_BACKGROUND);
    }
};
TerminalInstanceColorProvider = __decorate([
    __param(1, IViewDescriptorService)
], TerminalInstanceColorProvider);
export { TerminalInstanceColorProvider };
function guessShellTypeFromExecutable(os, executable) {
    const exeBasename = path.basename(executable);
    const generalShellTypeMap = new Map([
        ["julia" /* GeneralShellType.Julia */, /^julia$/],
        ["node" /* GeneralShellType.Node */, /^node$/],
        ["nu" /* GeneralShellType.NuShell */, /^nu$/],
        ["pwsh" /* GeneralShellType.PowerShell */, /^pwsh(-preview)?|powershell$/],
        ["python" /* GeneralShellType.Python */, /^py(?:thon)?$/],
    ]);
    for (const [shellType, pattern] of generalShellTypeMap) {
        if (exeBasename.match(pattern)) {
            return shellType;
        }
    }
    if (os === 1 /* OperatingSystem.Windows */) {
        const windowsShellTypeMap = new Map([
            ["cmd" /* WindowsShellType.CommandPrompt */, /^cmd$/],
            ["gitbash" /* WindowsShellType.GitBash */, /^bash$/],
            ["wsl" /* WindowsShellType.Wsl */, /^wsl$/],
        ]);
        for (const [shellType, pattern] of windowsShellTypeMap) {
            if (exeBasename.match(pattern)) {
                return shellType;
            }
        }
    }
    else {
        const posixShellTypes = [
            "bash" /* PosixShellType.Bash */,
            "csh" /* PosixShellType.Csh */,
            "fish" /* PosixShellType.Fish */,
            "ksh" /* PosixShellType.Ksh */,
            "sh" /* PosixShellType.Sh */,
            "zsh" /* PosixShellType.Zsh */,
        ];
        for (const type of posixShellTypes) {
            if (exeBasename === type) {
                return type;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEluc3RhbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixlQUFlLEVBRWYsUUFBUSxFQUNSLGlCQUFpQixFQUNqQixPQUFPLEdBQ1AsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFjLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLE9BQU8sRUFDUCxZQUFZLEdBRVosTUFBTSxzQ0FB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