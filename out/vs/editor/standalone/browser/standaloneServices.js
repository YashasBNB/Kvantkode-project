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
import './standaloneCodeEditorService.js';
import './standaloneLayoutService.js';
import '../../../platform/undoRedo/common/undoRedoService.js';
import '../../common/services/languageFeatureDebounce.js';
import '../../common/services/semanticTokensStylingService.js';
import '../../common/services/languageFeaturesService.js';
import '../../browser/services/hoverService/hoverService.js';
import * as strings from '../../../base/common/strings.js';
import * as dom from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { Emitter, Event, ValueWithChangeEvent, } from '../../../base/common/event.js';
import { KeyCodeChord, decodeKeybinding, } from '../../../base/common/keybindings.js';
import { ImmortalReference, toDisposable, DisposableStore, Disposable, combinedDisposable, } from '../../../base/common/lifecycle.js';
import { OS, isLinux, isMacintosh } from '../../../base/common/platform.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { IBulkEditService, ResourceEdit, ResourceTextEdit, } from '../../browser/services/bulkEditService.js';
import { isDiffEditorConfigurationKey, isEditorConfigurationKey, } from '../../common/config/editorConfigurationSchema.js';
import { EditOperation } from '../../common/core/editOperation.js';
import { Position as Pos } from '../../common/core/position.js';
import { Range } from '../../common/core/range.js';
import { IModelService } from '../../common/services/model.js';
import { ITextModelService, } from '../../common/services/resolverService.js';
import { ITextResourceConfigurationService, ITextResourcePropertiesService, } from '../../common/services/textResourceConfiguration.js';
import { CommandsRegistry, ICommandService, } from '../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../platform/configuration/common/configuration.js';
import { Configuration, ConfigurationModel, ConfigurationChangeEvent, } from '../../../platform/configuration/common/configurationModels.js';
import { IContextKeyService, } from '../../../platform/contextkey/common/contextkey.js';
import { IDialogService, } from '../../../platform/dialogs/common/dialogs.js';
import { createDecorator, IInstantiationService, } from '../../../platform/instantiation/common/instantiation.js';
import { AbstractKeybindingService } from '../../../platform/keybinding/common/abstractKeybindingService.js';
import { IKeybindingService, } from '../../../platform/keybinding/common/keybinding.js';
import { KeybindingResolver } from '../../../platform/keybinding/common/keybindingResolver.js';
import { KeybindingsRegistry, } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { ResolvedKeybindingItem } from '../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { ILabelService, } from '../../../platform/label/common/label.js';
import { INotificationService, NoOpNotification, NotificationsFilter, } from '../../../platform/notification/common/notification.js';
import { IEditorProgressService, IProgressService, } from '../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService, WorkspaceFolder, STANDALONE_EDITOR_WORKSPACE_ID, } from '../../../platform/workspace/common/workspace.js';
import { ILayoutService } from '../../../platform/layout/browser/layoutService.js';
import { StandaloneServicesNLS } from '../../common/standaloneStrings.js';
import { basename } from '../../../base/common/resources.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { ConsoleLogger, ILogService } from '../../../platform/log/common/log.js';
import { IWorkspaceTrustManagementService, } from '../../../platform/workspace/common/workspaceTrust.js';
import { IContextMenuService, IContextViewService, } from '../../../platform/contextview/browser/contextView.js';
import { ContextViewService } from '../../../platform/contextview/browser/contextViewService.js';
import { LanguageService } from '../../common/services/languageService.js';
import { ContextMenuService } from '../../../platform/contextview/browser/contextMenuService.js';
import { getSingletonServiceDescriptors, registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { OpenerService } from '../../browser/services/openerService.js';
import { IEditorWorkerService } from '../../common/services/editorWorker.js';
import { EditorWorkerService } from '../../browser/services/editorWorkerService.js';
import { ILanguageService } from '../../common/languages/language.js';
import { MarkerDecorationsService } from '../../common/services/markerDecorationsService.js';
import { IMarkerDecorationsService } from '../../common/services/markerDecorations.js';
import { ModelService } from '../../common/services/modelService.js';
import { StandaloneQuickInputService } from './quickInput/standaloneQuickInputService.js';
import { StandaloneThemeService } from './standaloneThemeService.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { AccessibilityService } from '../../../platform/accessibility/browser/accessibilityService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { IMenuService } from '../../../platform/actions/common/actions.js';
import { MenuService } from '../../../platform/actions/common/menuService.js';
import { BrowserClipboardService } from '../../../platform/clipboard/browser/clipboardService.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyService } from '../../../platform/contextkey/browser/contextKeyService.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IListService, ListService } from '../../../platform/list/browser/listService.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../platform/markers/common/markerService.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { IStorageService, InMemoryStorageService, } from '../../../platform/storage/common/storage.js';
import { DefaultConfiguration } from '../../../platform/configuration/common/configurations.js';
import { IAccessibilitySignalService, } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { LogService } from '../../../platform/log/common/logService.js';
import { getEditorFeatures } from '../../common/editorFeatures.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { IEnvironmentService, } from '../../../platform/environment/common/environment.js';
import { mainWindow } from '../../../base/browser/window.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ITreeSitterParserService } from '../../common/services/treeSitterParserService.js';
import { StandaloneTreeSitterParserService } from './standaloneTreeSitterService.js';
class SimpleModel {
    constructor(model) {
        this.disposed = false;
        this.model = model;
        this._onWillDispose = new Emitter();
    }
    get onWillDispose() {
        return this._onWillDispose.event;
    }
    resolve() {
        return Promise.resolve();
    }
    get textEditorModel() {
        return this.model;
    }
    createSnapshot() {
        return this.model.createSnapshot();
    }
    isReadonly() {
        return false;
    }
    dispose() {
        this.disposed = true;
        this._onWillDispose.fire();
    }
    isDisposed() {
        return this.disposed;
    }
    isResolved() {
        return true;
    }
    getLanguageId() {
        return this.model.getLanguageId();
    }
}
let StandaloneTextModelService = class StandaloneTextModelService {
    constructor(modelService) {
        this.modelService = modelService;
    }
    createModelReference(resource) {
        const model = this.modelService.getModel(resource);
        if (!model) {
            return Promise.reject(new Error(`Model not found`));
        }
        return Promise.resolve(new ImmortalReference(new SimpleModel(model)));
    }
    registerTextModelContentProvider(scheme, provider) {
        return {
            dispose: function () {
                /* no op */
            },
        };
    }
    canHandleResource(resource) {
        return false;
    }
};
StandaloneTextModelService = __decorate([
    __param(0, IModelService)
], StandaloneTextModelService);
class StandaloneEditorProgressService {
    static { this.NULL_PROGRESS_RUNNER = {
        done: () => { },
        total: () => { },
        worked: () => { },
    }; }
    show() {
        return StandaloneEditorProgressService.NULL_PROGRESS_RUNNER;
    }
    async showWhile(promise, delay) {
        await promise;
    }
}
class StandaloneProgressService {
    withProgress(_options, task, onDidCancel) {
        return task({
            report: () => { },
        });
    }
}
class StandaloneEnvironmentService {
    constructor() {
        this.stateResource = URI.from({ scheme: 'monaco', authority: 'stateResource' });
        this.userRoamingDataHome = URI.from({
            scheme: 'monaco',
            authority: 'userRoamingDataHome',
        });
        this.keyboardLayoutResource = URI.from({
            scheme: 'monaco',
            authority: 'keyboardLayoutResource',
        });
        this.argvResource = URI.from({ scheme: 'monaco', authority: 'argvResource' });
        this.untitledWorkspacesHome = URI.from({
            scheme: 'monaco',
            authority: 'untitledWorkspacesHome',
        });
        this.workspaceStorageHome = URI.from({
            scheme: 'monaco',
            authority: 'workspaceStorageHome',
        });
        this.localHistoryHome = URI.from({ scheme: 'monaco', authority: 'localHistoryHome' });
        this.cacheHome = URI.from({ scheme: 'monaco', authority: 'cacheHome' });
        this.userDataSyncHome = URI.from({ scheme: 'monaco', authority: 'userDataSyncHome' });
        this.sync = undefined;
        this.continueOn = undefined;
        this.editSessionId = undefined;
        this.debugExtensionHost = { port: null, break: false };
        this.isExtensionDevelopment = false;
        this.disableExtensions = false;
        this.enableExtensions = undefined;
        this.extensionDevelopmentLocationURI = undefined;
        this.extensionDevelopmentKind = undefined;
        this.extensionTestsLocationURI = undefined;
        this.logsHome = URI.from({ scheme: 'monaco', authority: 'logsHome' });
        this.logLevel = undefined;
        this.extensionLogLevel = undefined;
        this.verbose = false;
        this.isBuilt = false;
        this.disableTelemetry = false;
        this.serviceMachineIdResource = URI.from({
            scheme: 'monaco',
            authority: 'serviceMachineIdResource',
        });
        this.policyFile = undefined;
    }
}
class StandaloneDialogService {
    constructor() {
        this.onWillShowDialog = Event.None;
        this.onDidShowDialog = Event.None;
    }
    async confirm(confirmation) {
        const confirmed = this.doConfirm(confirmation.message, confirmation.detail);
        return {
            confirmed,
            checkboxChecked: false, // unsupported
        };
    }
    doConfirm(message, detail) {
        let messageText = message;
        if (detail) {
            messageText = messageText + '\n\n' + detail;
        }
        return mainWindow.confirm(messageText);
    }
    async prompt(prompt) {
        let result = undefined;
        const confirmed = this.doConfirm(prompt.message, prompt.detail);
        if (confirmed) {
            const promptButtons = [...(prompt.buttons ?? [])];
            if (prompt.cancelButton &&
                typeof prompt.cancelButton !== 'string' &&
                typeof prompt.cancelButton !== 'boolean') {
                promptButtons.push(prompt.cancelButton);
            }
            result = await promptButtons[0]?.run({ checkboxChecked: false });
        }
        return { result };
    }
    async info(message, detail) {
        await this.prompt({ type: Severity.Info, message, detail });
    }
    async warn(message, detail) {
        await this.prompt({ type: Severity.Warning, message, detail });
    }
    async error(message, detail) {
        await this.prompt({ type: Severity.Error, message, detail });
    }
    input() {
        return Promise.resolve({ confirmed: false }); // unsupported
    }
    about() {
        return Promise.resolve(undefined);
    }
}
export class StandaloneNotificationService {
    constructor() {
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    static { this.NO_OP = new NoOpNotification(); }
    info(message) {
        return this.notify({ severity: Severity.Info, message });
    }
    warn(message) {
        return this.notify({ severity: Severity.Warning, message });
    }
    error(error) {
        return this.notify({ severity: Severity.Error, message: error });
    }
    notify(notification) {
        switch (notification.severity) {
            case Severity.Error:
                console.error(notification.message);
                break;
            case Severity.Warning:
                console.warn(notification.message);
                break;
            default:
                console.log(notification.message);
                break;
        }
        return StandaloneNotificationService.NO_OP;
    }
    prompt(severity, message, choices, options) {
        return StandaloneNotificationService.NO_OP;
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter(filter) { }
    getFilter(source) {
        return NotificationsFilter.OFF;
    }
    getFilters() {
        return [];
    }
    removeFilter(sourceId) { }
}
let StandaloneCommandService = class StandaloneCommandService {
    constructor(instantiationService) {
        this._onWillExecuteCommand = new Emitter();
        this._onDidExecuteCommand = new Emitter();
        this.onWillExecuteCommand = this._onWillExecuteCommand.event;
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
        this._instantiationService = instantiationService;
    }
    executeCommand(id, ...args) {
        const command = CommandsRegistry.getCommand(id);
        if (!command) {
            return Promise.reject(new Error(`command '${id}' not found`));
        }
        try {
            this._onWillExecuteCommand.fire({ commandId: id, args });
            const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [
                command.handler,
                ...args,
            ]);
            this._onDidExecuteCommand.fire({ commandId: id, args });
            return Promise.resolve(result);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
};
StandaloneCommandService = __decorate([
    __param(0, IInstantiationService)
], StandaloneCommandService);
export { StandaloneCommandService };
let StandaloneKeybindingService = class StandaloneKeybindingService extends AbstractKeybindingService {
    constructor(contextKeyService, commandService, telemetryService, notificationService, logService, codeEditorService) {
        super(contextKeyService, commandService, telemetryService, notificationService, logService);
        this._cachedResolver = null;
        this._dynamicKeybindings = [];
        this._domNodeListeners = [];
        const addContainer = (domNode) => {
            const disposables = new DisposableStore();
            // for standard keybindings
            disposables.add(dom.addDisposableListener(domNode, dom.EventType.KEY_DOWN, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                const shouldPreventDefault = this._dispatch(keyEvent, keyEvent.target);
                if (shouldPreventDefault) {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                }
            }));
            // for single modifier chord keybindings (e.g. shift shift)
            disposables.add(dom.addDisposableListener(domNode, dom.EventType.KEY_UP, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                const shouldPreventDefault = this._singleModifierDispatch(keyEvent, keyEvent.target);
                if (shouldPreventDefault) {
                    keyEvent.preventDefault();
                }
            }));
            this._domNodeListeners.push(new DomNodeListeners(domNode, disposables));
        };
        const removeContainer = (domNode) => {
            for (let i = 0; i < this._domNodeListeners.length; i++) {
                const domNodeListeners = this._domNodeListeners[i];
                if (domNodeListeners.domNode === domNode) {
                    this._domNodeListeners.splice(i, 1);
                    domNodeListeners.dispose();
                }
            }
        };
        const addCodeEditor = (codeEditor) => {
            if (codeEditor.getOption(63 /* EditorOption.inDiffEditor */)) {
                return;
            }
            addContainer(codeEditor.getContainerDomNode());
        };
        const removeCodeEditor = (codeEditor) => {
            if (codeEditor.getOption(63 /* EditorOption.inDiffEditor */)) {
                return;
            }
            removeContainer(codeEditor.getContainerDomNode());
        };
        this._register(codeEditorService.onCodeEditorAdd(addCodeEditor));
        this._register(codeEditorService.onCodeEditorRemove(removeCodeEditor));
        codeEditorService.listCodeEditors().forEach(addCodeEditor);
        const addDiffEditor = (diffEditor) => {
            addContainer(diffEditor.getContainerDomNode());
        };
        const removeDiffEditor = (diffEditor) => {
            removeContainer(diffEditor.getContainerDomNode());
        };
        this._register(codeEditorService.onDiffEditorAdd(addDiffEditor));
        this._register(codeEditorService.onDiffEditorRemove(removeDiffEditor));
        codeEditorService.listDiffEditors().forEach(addDiffEditor);
    }
    addDynamicKeybinding(command, keybinding, handler, when) {
        return combinedDisposable(CommandsRegistry.registerCommand(command, handler), this.addDynamicKeybindings([
            {
                keybinding,
                command,
                when,
            },
        ]));
    }
    addDynamicKeybindings(rules) {
        const entries = rules.map((rule) => {
            const keybinding = decodeKeybinding(rule.keybinding, OS);
            return {
                keybinding,
                command: rule.command ?? null,
                commandArgs: rule.commandArgs,
                when: rule.when,
                weight1: 1000,
                weight2: 0,
                extensionId: null,
                isBuiltinExtension: false,
            };
        });
        this._dynamicKeybindings = this._dynamicKeybindings.concat(entries);
        this.updateResolver();
        return toDisposable(() => {
            // Search the first entry and remove them all since they will be contiguous
            for (let i = 0; i < this._dynamicKeybindings.length; i++) {
                if (this._dynamicKeybindings[i] === entries[0]) {
                    this._dynamicKeybindings.splice(i, entries.length);
                    this.updateResolver();
                    return;
                }
            }
        });
    }
    updateResolver() {
        this._cachedResolver = null;
        this._onDidUpdateKeybindings.fire();
    }
    _getResolver() {
        if (!this._cachedResolver) {
            const defaults = this._toNormalizedKeybindingItems(KeybindingsRegistry.getDefaultKeybindings(), true);
            const overrides = this._toNormalizedKeybindingItems(this._dynamicKeybindings, false);
            this._cachedResolver = new KeybindingResolver(defaults, overrides, (str) => this._log(str));
        }
        return this._cachedResolver;
    }
    _documentHasFocus() {
        return mainWindow.document.hasFocus();
    }
    _toNormalizedKeybindingItems(items, isDefault) {
        const result = [];
        let resultLen = 0;
        for (const item of items) {
            const when = item.when || undefined;
            const keybinding = item.keybinding;
            if (!keybinding) {
                // This might be a removal keybinding item in user settings => accept it
                result[resultLen++] = new ResolvedKeybindingItem(undefined, item.command, item.commandArgs, when, isDefault, null, false);
            }
            else {
                const resolvedKeybindings = USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
                for (const resolvedKeybinding of resolvedKeybindings) {
                    result[resultLen++] = new ResolvedKeybindingItem(resolvedKeybinding, item.command, item.commandArgs, when, isDefault, null, false);
                }
            }
        }
        return result;
    }
    resolveKeybinding(keybinding) {
        return USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
    }
    resolveKeyboardEvent(keyboardEvent) {
        const chord = new KeyCodeChord(keyboardEvent.ctrlKey, keyboardEvent.shiftKey, keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        return new USLayoutResolvedKeybinding([chord], OS);
    }
    resolveUserBinding(userBinding) {
        return [];
    }
    _dumpDebugInfo() {
        return '';
    }
    _dumpDebugInfoJSON() {
        return '';
    }
    registerSchemaContribution(contribution) {
        // noop
    }
    /**
     * not yet supported
     */
    enableKeybindingHoldMode(commandId) {
        return undefined;
    }
};
StandaloneKeybindingService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ICommandService),
    __param(2, ITelemetryService),
    __param(3, INotificationService),
    __param(4, ILogService),
    __param(5, ICodeEditorService)
], StandaloneKeybindingService);
export { StandaloneKeybindingService };
class DomNodeListeners extends Disposable {
    constructor(domNode, disposables) {
        super();
        this.domNode = domNode;
        this._register(disposables);
    }
}
function isConfigurationOverrides(thing) {
    return (thing &&
        typeof thing === 'object' &&
        (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string') &&
        (!thing.resource || thing.resource instanceof URI));
}
let StandaloneConfigurationService = class StandaloneConfigurationService {
    constructor(logService) {
        this.logService = logService;
        this._onDidChangeConfiguration = new Emitter();
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        const defaultConfiguration = new DefaultConfiguration(logService);
        this._configuration = new Configuration(defaultConfiguration.reload(), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), logService);
        defaultConfiguration.dispose();
    }
    getValue(arg1, arg2) {
        const section = typeof arg1 === 'string' ? arg1 : undefined;
        const overrides = isConfigurationOverrides(arg1)
            ? arg1
            : isConfigurationOverrides(arg2)
                ? arg2
                : {};
        return this._configuration.getValue(section, overrides, undefined);
    }
    updateValues(values) {
        const previous = { data: this._configuration.toData() };
        const changedKeys = [];
        for (const entry of values) {
            const [key, value] = entry;
            if (this.getValue(key) === value) {
                continue;
            }
            this._configuration.updateValue(key, value);
            changedKeys.push(key);
        }
        if (changedKeys.length > 0) {
            const configurationChangeEvent = new ConfigurationChangeEvent({ keys: changedKeys, overrides: [] }, previous, this._configuration, undefined, this.logService);
            configurationChangeEvent.source = 8 /* ConfigurationTarget.MEMORY */;
            this._onDidChangeConfiguration.fire(configurationChangeEvent);
        }
        return Promise.resolve();
    }
    updateValue(key, value, arg3, arg4) {
        return this.updateValues([[key, value]]);
    }
    inspect(key, options = {}) {
        return this._configuration.inspect(key, options, undefined);
    }
    keys() {
        return this._configuration.keys(undefined);
    }
    reloadConfiguration() {
        return Promise.resolve(undefined);
    }
    getConfigurationData() {
        const emptyModel = {
            contents: {},
            keys: [],
            overrides: [],
        };
        return {
            defaults: emptyModel,
            policy: emptyModel,
            application: emptyModel,
            userLocal: emptyModel,
            userRemote: emptyModel,
            workspace: emptyModel,
            folders: [],
        };
    }
};
StandaloneConfigurationService = __decorate([
    __param(0, ILogService)
], StandaloneConfigurationService);
export { StandaloneConfigurationService };
let StandaloneResourceConfigurationService = class StandaloneResourceConfigurationService {
    constructor(configurationService, modelService, languageService) {
        this.configurationService = configurationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this._onDidChangeConfiguration = new Emitter();
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this.configurationService.onDidChangeConfiguration((e) => {
            this._onDidChangeConfiguration.fire({
                affectedKeys: e.affectedKeys,
                affectsConfiguration: (resource, configuration) => e.affectsConfiguration(configuration),
            });
        });
    }
    getValue(resource, arg2, arg3) {
        const position = Pos.isIPosition(arg2) ? arg2 : null;
        const section = position
            ? typeof arg3 === 'string'
                ? arg3
                : undefined
            : typeof arg2 === 'string'
                ? arg2
                : undefined;
        const language = resource ? this.getLanguage(resource, position) : undefined;
        if (typeof section === 'undefined') {
            return this.configurationService.getValue({
                resource,
                overrideIdentifier: language,
            });
        }
        return this.configurationService.getValue(section, {
            resource,
            overrideIdentifier: language,
        });
    }
    inspect(resource, position, section) {
        const language = resource ? this.getLanguage(resource, position) : undefined;
        return this.configurationService.inspect(section, { resource, overrideIdentifier: language });
    }
    getLanguage(resource, position) {
        const model = this.modelService.getModel(resource);
        if (model) {
            return position
                ? model.getLanguageIdAtPosition(position.lineNumber, position.column)
                : model.getLanguageId();
        }
        return this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
    }
    updateValue(resource, key, value, configurationTarget) {
        return this.configurationService.updateValue(key, value, { resource }, configurationTarget);
    }
};
StandaloneResourceConfigurationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], StandaloneResourceConfigurationService);
let StandaloneResourcePropertiesService = class StandaloneResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', {
            overrideIdentifier: language,
            resource,
        });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return isLinux || isMacintosh ? '\n' : '\r\n';
    }
};
StandaloneResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], StandaloneResourcePropertiesService);
class StandaloneTelemetryService {
    constructor() {
        this.telemetryLevel = 0 /* TelemetryLevel.NONE */;
        this.sessionId = 'someValue.sessionId';
        this.machineId = 'someValue.machineId';
        this.sqmId = 'someValue.sqmId';
        this.devDeviceId = 'someValue.devDeviceId';
        this.firstSessionDate = 'someValue.firstSessionDate';
        this.sendErrorTelemetry = false;
    }
    setEnabled() { }
    setExperimentProperty() { }
    publicLog() { }
    publicLog2() { }
    publicLogError() { }
    publicLogError2() { }
}
class StandaloneWorkspaceContextService {
    static { this.SCHEME = 'inmemory'; }
    constructor() {
        this._onDidChangeWorkspaceName = new Emitter();
        this.onDidChangeWorkspaceName = this._onDidChangeWorkspaceName.event;
        this._onWillChangeWorkspaceFolders = new Emitter();
        this.onWillChangeWorkspaceFolders = this._onWillChangeWorkspaceFolders.event;
        this._onDidChangeWorkspaceFolders = new Emitter();
        this.onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFolders.event;
        this._onDidChangeWorkbenchState = new Emitter();
        this.onDidChangeWorkbenchState = this._onDidChangeWorkbenchState.event;
        const resource = URI.from({
            scheme: StandaloneWorkspaceContextService.SCHEME,
            authority: 'model',
            path: '/',
        });
        this.workspace = {
            id: STANDALONE_EDITOR_WORKSPACE_ID,
            folders: [new WorkspaceFolder({ uri: resource, name: '', index: 0 })],
        };
    }
    getCompleteWorkspace() {
        return Promise.resolve(this.getWorkspace());
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkbenchState() {
        if (this.workspace) {
            if (this.workspace.configuration) {
                return 3 /* WorkbenchState.WORKSPACE */;
            }
            return 2 /* WorkbenchState.FOLDER */;
        }
        return 1 /* WorkbenchState.EMPTY */;
    }
    getWorkspaceFolder(resource) {
        return resource && resource.scheme === StandaloneWorkspaceContextService.SCHEME
            ? this.workspace.folders[0]
            : null;
    }
    isInsideWorkspace(resource) {
        return resource && resource.scheme === StandaloneWorkspaceContextService.SCHEME;
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        return true;
    }
}
export function updateConfigurationService(configurationService, source, isDiffEditor) {
    if (!source) {
        return;
    }
    if (!(configurationService instanceof StandaloneConfigurationService)) {
        return;
    }
    const toUpdate = [];
    Object.keys(source).forEach((key) => {
        if (isEditorConfigurationKey(key)) {
            toUpdate.push([`editor.${key}`, source[key]]);
        }
        if (isDiffEditor && isDiffEditorConfigurationKey(key)) {
            toUpdate.push([`diffEditor.${key}`, source[key]]);
        }
    });
    if (toUpdate.length > 0) {
        configurationService.updateValues(toUpdate);
    }
}
let StandaloneBulkEditService = class StandaloneBulkEditService {
    constructor(_modelService) {
        this._modelService = _modelService;
        //
    }
    hasPreviewHandler() {
        return false;
    }
    setPreviewHandler() {
        return Disposable.None;
    }
    async apply(editsIn, _options) {
        const edits = Array.isArray(editsIn) ? editsIn : ResourceEdit.convert(editsIn);
        const textEdits = new Map();
        for (const edit of edits) {
            if (!(edit instanceof ResourceTextEdit)) {
                throw new Error('bad edit - only text edits are supported');
            }
            const model = this._modelService.getModel(edit.resource);
            if (!model) {
                throw new Error('bad edit - model not found');
            }
            if (typeof edit.versionId === 'number' && model.getVersionId() !== edit.versionId) {
                throw new Error('bad state - model changed in the meantime');
            }
            let array = textEdits.get(model);
            if (!array) {
                array = [];
                textEdits.set(model, array);
            }
            array.push(EditOperation.replaceMove(Range.lift(edit.textEdit.range), edit.textEdit.text));
        }
        let totalEdits = 0;
        let totalFiles = 0;
        for (const [model, edits] of textEdits) {
            model.pushStackElement();
            model.pushEditOperations([], edits, () => []);
            model.pushStackElement();
            totalFiles += 1;
            totalEdits += edits.length;
        }
        return {
            ariaSummary: strings.format(StandaloneServicesNLS.bulkEditServiceSummary, totalEdits, totalFiles),
            isApplied: totalEdits > 0,
        };
    }
};
StandaloneBulkEditService = __decorate([
    __param(0, IModelService)
], StandaloneBulkEditService);
class StandaloneUriLabelService {
    constructor() {
        this.onDidChangeFormatters = Event.None;
    }
    getUriLabel(resource, options) {
        if (resource.scheme === 'file') {
            return resource.fsPath;
        }
        return resource.path;
    }
    getUriBasenameLabel(resource) {
        return basename(resource);
    }
    getWorkspaceLabel(workspace, options) {
        return '';
    }
    getSeparator(scheme, authority) {
        return '/';
    }
    registerFormatter(formatter) {
        throw new Error('Not implemented');
    }
    registerCachedFormatter(formatter) {
        return this.registerFormatter(formatter);
    }
    getHostLabel() {
        return '';
    }
    getHostTooltip() {
        return undefined;
    }
}
let StandaloneContextViewService = class StandaloneContextViewService extends ContextViewService {
    constructor(layoutService, _codeEditorService) {
        super(layoutService);
        this._codeEditorService = _codeEditorService;
    }
    showContextView(delegate, container, shadowRoot) {
        if (!container) {
            const codeEditor = this._codeEditorService.getFocusedCodeEditor() ||
                this._codeEditorService.getActiveCodeEditor();
            if (codeEditor) {
                container = codeEditor.getContainerDomNode();
            }
        }
        return super.showContextView(delegate, container, shadowRoot);
    }
};
StandaloneContextViewService = __decorate([
    __param(0, ILayoutService),
    __param(1, ICodeEditorService)
], StandaloneContextViewService);
class StandaloneWorkspaceTrustManagementService {
    constructor() {
        this._neverEmitter = new Emitter();
        this.onDidChangeTrust = this._neverEmitter.event;
        this.onDidChangeTrustedFolders = this._neverEmitter.event;
        this.workspaceResolved = Promise.resolve();
        this.workspaceTrustInitialized = Promise.resolve();
        this.acceptsOutOfWorkspaceFiles = true;
    }
    isWorkspaceTrusted() {
        return true;
    }
    isWorkspaceTrustForced() {
        return false;
    }
    canSetParentFolderTrust() {
        return false;
    }
    async setParentFolderTrust(trusted) {
        // noop
    }
    canSetWorkspaceTrust() {
        return false;
    }
    async setWorkspaceTrust(trusted) {
        // noop
    }
    getUriTrustInfo(uri) {
        throw new Error('Method not supported.');
    }
    async setUrisTrust(uri, trusted) {
        // noop
    }
    getTrustedUris() {
        return [];
    }
    async setTrustedUris(uris) {
        // noop
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        throw new Error('Method not supported.');
    }
}
class StandaloneLanguageService extends LanguageService {
    constructor() {
        super();
    }
}
class StandaloneLogService extends LogService {
    constructor() {
        super(new ConsoleLogger());
    }
}
let StandaloneContextMenuService = class StandaloneContextMenuService extends ContextMenuService {
    constructor(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService) {
        super(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService);
        this.configure({ blockMouse: false }); // we do not want that in the standalone editor
    }
};
StandaloneContextMenuService = __decorate([
    __param(0, ITelemetryService),
    __param(1, INotificationService),
    __param(2, IContextViewService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], StandaloneContextMenuService);
const standaloneEditorWorkerDescriptor = {
    esmModuleLocation: undefined,
    label: 'editorWorkerService',
};
let StandaloneEditorWorkerService = class StandaloneEditorWorkerService extends EditorWorkerService {
    constructor(modelService, configurationService, logService, languageConfigurationService, languageFeaturesService) {
        super(standaloneEditorWorkerDescriptor, modelService, configurationService, logService, languageConfigurationService, languageFeaturesService);
    }
};
StandaloneEditorWorkerService = __decorate([
    __param(0, IModelService),
    __param(1, ITextResourceConfigurationService),
    __param(2, ILogService),
    __param(3, ILanguageConfigurationService),
    __param(4, ILanguageFeaturesService)
], StandaloneEditorWorkerService);
class StandaloneAccessbilitySignalService {
    async playSignal(cue, options) { }
    async playSignals(cues) { }
    getEnabledState(signal, userGesture, modality) {
        return ValueWithChangeEvent.const(false);
    }
    getDelayMs(signal, modality) {
        return 0;
    }
    isSoundEnabled(cue) {
        return false;
    }
    isAnnouncementEnabled(cue) {
        return false;
    }
    onSoundEnabledChanged(cue) {
        return Event.None;
    }
    async playSound(cue, allowManyInParallel) { }
    playSignalLoop(cue) {
        return toDisposable(() => { });
    }
}
registerSingleton(ILogService, StandaloneLogService, 0 /* InstantiationType.Eager */);
registerSingleton(IConfigurationService, StandaloneConfigurationService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextResourceConfigurationService, StandaloneResourceConfigurationService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextResourcePropertiesService, StandaloneResourcePropertiesService, 0 /* InstantiationType.Eager */);
registerSingleton(IWorkspaceContextService, StandaloneWorkspaceContextService, 0 /* InstantiationType.Eager */);
registerSingleton(ILabelService, StandaloneUriLabelService, 0 /* InstantiationType.Eager */);
registerSingleton(ITelemetryService, StandaloneTelemetryService, 0 /* InstantiationType.Eager */);
registerSingleton(IDialogService, StandaloneDialogService, 0 /* InstantiationType.Eager */);
registerSingleton(IEnvironmentService, StandaloneEnvironmentService, 0 /* InstantiationType.Eager */);
registerSingleton(INotificationService, StandaloneNotificationService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerService, MarkerService, 0 /* InstantiationType.Eager */);
registerSingleton(ILanguageService, StandaloneLanguageService, 0 /* InstantiationType.Eager */);
registerSingleton(IStandaloneThemeService, StandaloneThemeService, 0 /* InstantiationType.Eager */);
registerSingleton(IModelService, ModelService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerDecorationsService, MarkerDecorationsService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextKeyService, ContextKeyService, 0 /* InstantiationType.Eager */);
registerSingleton(IProgressService, StandaloneProgressService, 0 /* InstantiationType.Eager */);
registerSingleton(IEditorProgressService, StandaloneEditorProgressService, 0 /* InstantiationType.Eager */);
registerSingleton(IStorageService, InMemoryStorageService, 0 /* InstantiationType.Eager */);
registerSingleton(IEditorWorkerService, StandaloneEditorWorkerService, 0 /* InstantiationType.Eager */);
registerSingleton(IBulkEditService, StandaloneBulkEditService, 0 /* InstantiationType.Eager */);
registerSingleton(IWorkspaceTrustManagementService, StandaloneWorkspaceTrustManagementService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextModelService, StandaloneTextModelService, 0 /* InstantiationType.Eager */);
registerSingleton(IAccessibilityService, AccessibilityService, 0 /* InstantiationType.Eager */);
registerSingleton(IListService, ListService, 0 /* InstantiationType.Eager */);
registerSingleton(ICommandService, StandaloneCommandService, 0 /* InstantiationType.Eager */);
registerSingleton(IKeybindingService, StandaloneKeybindingService, 0 /* InstantiationType.Eager */);
registerSingleton(IQuickInputService, StandaloneQuickInputService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextViewService, StandaloneContextViewService, 0 /* InstantiationType.Eager */);
registerSingleton(IOpenerService, OpenerService, 0 /* InstantiationType.Eager */);
registerSingleton(IClipboardService, BrowserClipboardService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextMenuService, StandaloneContextMenuService, 0 /* InstantiationType.Eager */);
registerSingleton(IMenuService, MenuService, 0 /* InstantiationType.Eager */);
registerSingleton(IAccessibilitySignalService, StandaloneAccessbilitySignalService, 0 /* InstantiationType.Eager */);
registerSingleton(ITreeSitterParserService, StandaloneTreeSitterParserService, 0 /* InstantiationType.Eager */);
/**
 * We don't want to eagerly instantiate services because embedders get a one time chance
 * to override services when they create the first editor.
 */
export var StandaloneServices;
(function (StandaloneServices) {
    const serviceCollection = new ServiceCollection();
    for (const [id, descriptor] of getSingletonServiceDescriptors()) {
        serviceCollection.set(id, descriptor);
    }
    const instantiationService = new InstantiationService(serviceCollection, true);
    serviceCollection.set(IInstantiationService, instantiationService);
    function get(serviceId) {
        if (!initialized) {
            initialize({});
        }
        const r = serviceCollection.get(serviceId);
        if (!r) {
            throw new Error('Missing service ' + serviceId);
        }
        if (r instanceof SyncDescriptor) {
            return instantiationService.invokeFunction((accessor) => accessor.get(serviceId));
        }
        else {
            return r;
        }
    }
    StandaloneServices.get = get;
    let initialized = false;
    const onDidInitialize = new Emitter();
    function initialize(overrides) {
        if (initialized) {
            return instantiationService;
        }
        initialized = true;
        // Add singletons that were registered after this module loaded
        for (const [id, descriptor] of getSingletonServiceDescriptors()) {
            if (!serviceCollection.get(id)) {
                serviceCollection.set(id, descriptor);
            }
        }
        // Initialize the service collection with the overrides, but only if the
        // service was not instantiated in the meantime.
        for (const serviceId in overrides) {
            if (overrides.hasOwnProperty(serviceId)) {
                const serviceIdentifier = createDecorator(serviceId);
                const r = serviceCollection.get(serviceIdentifier);
                if (r instanceof SyncDescriptor) {
                    serviceCollection.set(serviceIdentifier, overrides[serviceId]);
                }
            }
        }
        // Instantiate all editor features
        const editorFeatures = getEditorFeatures();
        for (const feature of editorFeatures) {
            try {
                instantiationService.createInstance(feature);
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        onDidInitialize.fire();
        return instantiationService;
    }
    StandaloneServices.initialize = initialize;
    /**
     * Executes callback once services are initialized.
     */
    function withServices(callback) {
        if (initialized) {
            return callback();
        }
        const disposable = new DisposableStore();
        const listener = disposable.add(onDidInitialize.event(() => {
            listener.dispose();
            disposable.add(callback());
        }));
        return disposable;
    }
    StandaloneServices.withServices = withServices;
})(StandaloneServices || (StandaloneServices = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lU2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sa0RBQWtELENBQUE7QUFDekQsT0FBTyxxREFBcUQsQ0FBQTtBQUU1RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUUsT0FBTyxFQUNOLE9BQU8sRUFDUCxLQUFLLEVBRUwsb0JBQW9CLEdBQ3BCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUVOLFlBQVksRUFFWixnQkFBZ0IsR0FDaEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBR04saUJBQWlCLEVBQ2pCLFlBQVksRUFDWixlQUFlLEVBQ2YsVUFBVSxFQUNWLGtCQUFrQixHQUNsQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBR04sZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixnQkFBZ0IsR0FDaEIs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