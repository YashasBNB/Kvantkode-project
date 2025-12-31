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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxJbnN0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sZUFBZSxFQUVmLFFBQVEsRUFDUixpQkFBaUIsRUFDakIsT0FBTyxHQUNQLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBYyxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBRWYsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixPQUFPLEVBQ1AsWUFBWSxHQUVaLE1BQU0sc0NBQXNDLENB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