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
var ShowLanguageExtensionsAction_1;
import './media/editorstatus.css';
import { localize, localize2 } from '../../../../nls.js';
import { getWindowById, runAtThisOrScheduleAtNextAnimationFrame, } from '../../../../base/browser/dom.js';
import { format, compare, splitLines } from '../../../../base/common/strings.js';
import { extname, basename, isEqual } from '../../../../base/common/resources.js';
import { areFunctions, assertIsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Action } from '../../../../base/common/actions.js';
import { Language } from '../../../../base/common/platform.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { Disposable, MutableDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { TrimTrailingWhitespaceAction } from '../../../../editor/contrib/linesOperations/browser/linesOperations.js';
import { IndentUsingSpaces, IndentUsingTabs, ChangeTabDisplaySize, DetectIndentation, IndentationToSpacesAction, IndentationToTabsAction, } from '../../../../editor/contrib/indentation/browser/indentation.js';
import { BaseBinaryResourceEditor } from './binaryEditor.js';
import { BinaryResourceDiffEditor } from './binaryDiffEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFileService, FILES_ASSOCIATIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILanguageService, } from '../../../../editor/common/languages/language.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { SUPPORTED_ENCODINGS } from '../../../services/textfile/common/encoding.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { deepClone } from '../../../../base/common/objects.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { Schemas } from '../../../../base/common/network.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { getIconClassesForLanguageId } from '../../../../editor/common/services/getIconClasses.js';
import { Promises, timeout } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { IMarkerService, MarkerSeverity, IMarkerData, } from '../../../../platform/markers/common/markers.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { AutomaticLanguageDetectionLikelyWrongId, ILanguageDetectionService, } from '../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { TabFocus } from '../../../../editor/browser/config/tabFocus.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { InputMode } from '../../../../editor/common/inputMode.js';
class SideBySideEditorEncodingSupport {
    constructor(primary, secondary) {
        this.primary = primary;
        this.secondary = secondary;
    }
    getEncoding() {
        return this.primary.getEncoding(); // always report from modified (right hand) side
    }
    async setEncoding(encoding, mode) {
        await Promises.settled([this.primary, this.secondary].map((editor) => editor.setEncoding(encoding, mode)));
    }
}
class SideBySideEditorLanguageSupport {
    constructor(primary, secondary) {
        this.primary = primary;
        this.secondary = secondary;
    }
    setLanguageId(languageId, source) {
        ;
        [this.primary, this.secondary].forEach((editor) => editor.setLanguageId(languageId, source));
    }
}
function toEditorWithEncodingSupport(input) {
    // Untitled Text Editor
    if (input instanceof UntitledTextEditorInput) {
        return input;
    }
    // Side by Side (diff) Editor
    if (input instanceof SideBySideEditorInput) {
        const primaryEncodingSupport = toEditorWithEncodingSupport(input.primary);
        const secondaryEncodingSupport = toEditorWithEncodingSupport(input.secondary);
        if (primaryEncodingSupport && secondaryEncodingSupport) {
            return new SideBySideEditorEncodingSupport(primaryEncodingSupport, secondaryEncodingSupport);
        }
        return primaryEncodingSupport;
    }
    // File or Resource Editor
    const encodingSupport = input;
    if (areFunctions(encodingSupport.setEncoding, encodingSupport.getEncoding)) {
        return encodingSupport;
    }
    // Unsupported for any other editor
    return null;
}
function toEditorWithLanguageSupport(input) {
    // Untitled Text Editor
    if (input instanceof UntitledTextEditorInput) {
        return input;
    }
    // Side by Side (diff) Editor
    if (input instanceof SideBySideEditorInput) {
        const primaryLanguageSupport = toEditorWithLanguageSupport(input.primary);
        const secondaryLanguageSupport = toEditorWithLanguageSupport(input.secondary);
        if (primaryLanguageSupport && secondaryLanguageSupport) {
            return new SideBySideEditorLanguageSupport(primaryLanguageSupport, secondaryLanguageSupport);
        }
        return primaryLanguageSupport;
    }
    // File or Resource Editor
    const languageSupport = input;
    if (typeof languageSupport.setLanguageId === 'function') {
        return languageSupport;
    }
    // Unsupported for any other editor
    return null;
}
class StateChange {
    constructor() {
        this.indentation = false;
        this.selectionStatus = false;
        this.languageId = false;
        this.languageStatus = false;
        this.encoding = false;
        this.EOL = false;
        this.tabFocusMode = false;
        this.inputMode = false;
        this.columnSelectionMode = false;
        this.metadata = false;
    }
    combine(other) {
        this.indentation = this.indentation || other.indentation;
        this.selectionStatus = this.selectionStatus || other.selectionStatus;
        this.languageId = this.languageId || other.languageId;
        this.languageStatus = this.languageStatus || other.languageStatus;
        this.encoding = this.encoding || other.encoding;
        this.EOL = this.EOL || other.EOL;
        this.tabFocusMode = this.tabFocusMode || other.tabFocusMode;
        this.inputMode = this.inputMode || other.inputMode;
        this.columnSelectionMode = this.columnSelectionMode || other.columnSelectionMode;
        this.metadata = this.metadata || other.metadata;
    }
    hasChanges() {
        return (this.indentation ||
            this.selectionStatus ||
            this.languageId ||
            this.languageStatus ||
            this.encoding ||
            this.EOL ||
            this.tabFocusMode ||
            this.inputMode ||
            this.columnSelectionMode ||
            this.metadata);
    }
}
class State {
    get selectionStatus() {
        return this._selectionStatus;
    }
    get languageId() {
        return this._languageId;
    }
    get encoding() {
        return this._encoding;
    }
    get EOL() {
        return this._EOL;
    }
    get indentation() {
        return this._indentation;
    }
    get tabFocusMode() {
        return this._tabFocusMode;
    }
    get inputMode() {
        return this._inputMode;
    }
    get columnSelectionMode() {
        return this._columnSelectionMode;
    }
    get metadata() {
        return this._metadata;
    }
    update(update) {
        const change = new StateChange();
        switch (update.type) {
            case 'selectionStatus':
                if (this._selectionStatus !== update.selectionStatus) {
                    this._selectionStatus = update.selectionStatus;
                    change.selectionStatus = true;
                }
                break;
            case 'indentation':
                if (this._indentation !== update.indentation) {
                    this._indentation = update.indentation;
                    change.indentation = true;
                }
                break;
            case 'languageId':
                if (this._languageId !== update.languageId) {
                    this._languageId = update.languageId;
                    change.languageId = true;
                }
                break;
            case 'encoding':
                if (this._encoding !== update.encoding) {
                    this._encoding = update.encoding;
                    change.encoding = true;
                }
                break;
            case 'EOL':
                if (this._EOL !== update.EOL) {
                    this._EOL = update.EOL;
                    change.EOL = true;
                }
                break;
            case 'tabFocusMode':
                if (this._tabFocusMode !== update.tabFocusMode) {
                    this._tabFocusMode = update.tabFocusMode;
                    change.tabFocusMode = true;
                }
                break;
            case 'inputMode':
                if (this._inputMode !== update.inputMode) {
                    this._inputMode = update.inputMode;
                    change.inputMode = true;
                }
                break;
            case 'columnSelectionMode':
                if (this._columnSelectionMode !== update.columnSelectionMode) {
                    this._columnSelectionMode = update.columnSelectionMode;
                    change.columnSelectionMode = true;
                }
                break;
            case 'metadata':
                if (this._metadata !== update.metadata) {
                    this._metadata = update.metadata;
                    change.metadata = true;
                }
                break;
        }
        return change;
    }
}
let TabFocusMode = class TabFocusMode extends Disposable {
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.registerListeners();
        const tabFocusModeConfig = configurationService.getValue('editor.tabFocusMode') === true ? true : false;
        TabFocus.setTabFocusMode(tabFocusModeConfig);
    }
    registerListeners() {
        this._register(TabFocus.onDidChangeTabFocus((tabFocusMode) => this._onDidChange.fire(tabFocusMode)));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.tabFocusMode')) {
                const tabFocusModeConfig = this.configurationService.getValue('editor.tabFocusMode') === true
                    ? true
                    : false;
                TabFocus.setTabFocusMode(tabFocusModeConfig);
                this._onDidChange.fire(tabFocusModeConfig);
            }
        }));
    }
};
TabFocusMode = __decorate([
    __param(0, IConfigurationService)
], TabFocusMode);
class StatusInputMode extends Disposable {
    constructor() {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        InputMode.setInputMode('insert');
        this._register(InputMode.onDidChangeInputMode((inputMode) => this._onDidChange.fire(inputMode)));
    }
}
const nlsSingleSelectionRange = localize('singleSelectionRange', 'Ln {0}, Col {1} ({2} selected)');
const nlsSingleSelection = localize('singleSelection', 'Ln {0}, Col {1}');
const nlsMultiSelectionRange = localize('multiSelectionRange', '{0} selections ({1} characters selected)');
const nlsMultiSelection = localize('multiSelection', '{0} selections');
const nlsEOLLF = localize('endOfLineLineFeed', 'LF');
const nlsEOLCRLF = localize('endOfLineCarriageReturnLineFeed', 'CRLF');
let EditorStatus = class EditorStatus extends Disposable {
    constructor(targetWindowId, editorService, quickInputService, languageService, textFileService, statusbarService, instantiationService, configurationService) {
        super();
        this.targetWindowId = targetWindowId;
        this.editorService = editorService;
        this.quickInputService = quickInputService;
        this.languageService = languageService;
        this.textFileService = textFileService;
        this.statusbarService = statusbarService;
        this.configurationService = configurationService;
        this.tabFocusModeElement = this._register(new MutableDisposable());
        this.inputModeElement = this._register(new MutableDisposable());
        this.columnSelectionModeElement = this._register(new MutableDisposable());
        this.indentationElement = this._register(new MutableDisposable());
        this.selectionElement = this._register(new MutableDisposable());
        this.encodingElement = this._register(new MutableDisposable());
        this.eolElement = this._register(new MutableDisposable());
        this.languageElement = this._register(new MutableDisposable());
        this.metadataElement = this._register(new MutableDisposable());
        this.state = new State();
        this.toRender = undefined;
        this.activeEditorListeners = this._register(new DisposableStore());
        this.delayedRender = this._register(new MutableDisposable());
        this.currentMarkerStatus = this._register(instantiationService.createInstance(ShowCurrentMarkerInStatusbarContribution));
        this.tabFocusMode = this._register(instantiationService.createInstance(TabFocusMode));
        this.inputMode = this._register(instantiationService.createInstance(StatusInputMode));
        this.registerCommands();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.editorService.onDidActiveEditorChange(() => this.updateStatusBar()));
        this._register(this.textFileService.untitled.onDidChangeEncoding((model) => this.onResourceEncodingChange(model.resource)));
        this._register(this.textFileService.files.onDidChangeEncoding((model) => this.onResourceEncodingChange(model.resource)));
        this._register(Event.runAndSubscribe(this.tabFocusMode.onDidChange, (tabFocusMode) => {
            if (tabFocusMode !== undefined) {
                this.onTabFocusModeChange(tabFocusMode);
            }
            else {
                this.onTabFocusModeChange(this.configurationService.getValue('editor.tabFocusMode'));
            }
        }));
        this._register(Event.runAndSubscribe(this.inputMode.onDidChange, (inputMode) => this.onInputModeChange(inputMode ?? 'insert')));
    }
    registerCommands() {
        this._register(CommandsRegistry.registerCommand({
            id: `changeEditorIndentation${this.targetWindowId}`,
            handler: () => this.showIndentationPicker(),
        }));
    }
    async showIndentationPicker() {
        const activeTextEditorControl = getCodeEditor(this.editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            return this.quickInputService.pick([
                { label: localize('noEditor', 'No text editor active at this time') },
            ]);
        }
        if (this.editorService.activeEditor?.isReadonly()) {
            return this.quickInputService.pick([
                { label: localize('noWritableCodeEditor', 'The active code editor is read-only.') },
            ]);
        }
        const picks = [
            assertIsDefined(activeTextEditorControl.getAction(IndentUsingSpaces.ID)),
            assertIsDefined(activeTextEditorControl.getAction(IndentUsingTabs.ID)),
            assertIsDefined(activeTextEditorControl.getAction(ChangeTabDisplaySize.ID)),
            assertIsDefined(activeTextEditorControl.getAction(DetectIndentation.ID)),
            assertIsDefined(activeTextEditorControl.getAction(IndentationToSpacesAction.ID)),
            assertIsDefined(activeTextEditorControl.getAction(IndentationToTabsAction.ID)),
            assertIsDefined(activeTextEditorControl.getAction(TrimTrailingWhitespaceAction.ID)),
        ].map((a) => {
            return {
                id: a.id,
                label: a.label,
                detail: Language.isDefaultVariant() || a.label === a.alias ? undefined : a.alias,
                run: () => {
                    activeTextEditorControl.focus();
                    a.run();
                },
            };
        });
        picks.splice(3, 0, { type: 'separator', label: localize('indentConvert', 'convert file') });
        picks.unshift({ type: 'separator', label: localize('indentView', 'change view') });
        const action = await this.quickInputService.pick(picks, {
            placeHolder: localize('pickAction', 'Select Action'),
            matchOnDetail: true,
        });
        return action?.run();
    }
    updateTabFocusModeElement(visible) {
        if (visible) {
            if (!this.tabFocusModeElement.value) {
                const text = localize('tabFocusModeEnabled', 'Tab Moves Focus');
                this.tabFocusModeElement.value = this.statusbarService.addEntry({
                    name: localize('status.editor.tabFocusMode', 'Accessibility Mode'),
                    text,
                    ariaLabel: text,
                    tooltip: localize('disableTabMode', 'Disable Accessibility Mode'),
                    command: 'editor.action.toggleTabFocusMode',
                    kind: 'prominent',
                }, 'status.editor.tabFocusMode', 1 /* StatusbarAlignment.RIGHT */, 100.7);
            }
        }
        else {
            this.tabFocusModeElement.clear();
        }
    }
    updateInputModeElement(inputMode) {
        if (inputMode === 'overtype') {
            if (!this.inputModeElement.value) {
                const text = localize('inputModeOvertype', 'OVR');
                const name = localize('status.editor.enableInsertMode', 'Enable Insert Mode');
                this.inputModeElement.value = this.statusbarService.addEntry({
                    name,
                    text,
                    ariaLabel: text,
                    tooltip: name,
                    command: 'editor.action.toggleOvertypeInsertMode',
                    kind: 'prominent',
                }, 'status.editor.inputMode', 1 /* StatusbarAlignment.RIGHT */, 100.6);
            }
        }
        else {
            this.inputModeElement.clear();
        }
    }
    updateColumnSelectionModeElement(visible) {
        if (visible) {
            if (!this.columnSelectionModeElement.value) {
                const text = localize('columnSelectionModeEnabled', 'Column Selection');
                this.columnSelectionModeElement.value = this.statusbarService.addEntry({
                    name: localize('status.editor.columnSelectionMode', 'Column Selection Mode'),
                    text,
                    ariaLabel: text,
                    tooltip: localize('disableColumnSelectionMode', 'Disable Column Selection Mode'),
                    command: 'editor.action.toggleColumnSelection',
                    kind: 'prominent',
                }, 'status.editor.columnSelectionMode', 1 /* StatusbarAlignment.RIGHT */, 100.8);
            }
        }
        else {
            this.columnSelectionModeElement.clear();
        }
    }
    updateSelectionElement(text) {
        if (!text) {
            this.selectionElement.clear();
            return;
        }
        const editorURI = getCodeEditor(this.editorService.activeTextEditorControl)?.getModel()?.uri;
        if (editorURI?.scheme === Schemas.vscodeNotebookCell) {
            this.selectionElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.selection', 'Editor Selection'),
            text,
            ariaLabel: text,
            tooltip: localize('gotoLine', 'Go to Line/Column'),
            command: 'workbench.action.gotoLine',
        };
        this.updateElement(this.selectionElement, props, 'status.editor.selection', 1 /* StatusbarAlignment.RIGHT */, 100.5);
    }
    updateIndentationElement(text) {
        if (!text) {
            this.indentationElement.clear();
            return;
        }
        const editorURI = getCodeEditor(this.editorService.activeTextEditorControl)?.getModel()?.uri;
        if (editorURI?.scheme === Schemas.vscodeNotebookCell) {
            this.indentationElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.indentation', 'Editor Indentation'),
            text,
            ariaLabel: text,
            tooltip: localize('selectIndentation', 'Select Indentation'),
            command: `changeEditorIndentation${this.targetWindowId}`,
        };
        this.updateElement(this.indentationElement, props, 'status.editor.indentation', 1 /* StatusbarAlignment.RIGHT */, 100.4);
    }
    updateEncodingElement(text) {
        if (!text) {
            this.encodingElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.encoding', 'Editor Encoding'),
            text,
            ariaLabel: text,
            tooltip: localize('selectEncoding', 'Select Encoding'),
            command: 'workbench.action.editor.changeEncoding',
        };
        this.updateElement(this.encodingElement, props, 'status.editor.encoding', 1 /* StatusbarAlignment.RIGHT */, 100.3);
    }
    updateEOLElement(text) {
        if (!text) {
            this.eolElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.eol', 'Editor End of Line'),
            text,
            ariaLabel: text,
            tooltip: localize('selectEOL', 'Select End of Line Sequence'),
            command: 'workbench.action.editor.changeEOL',
        };
        this.updateElement(this.eolElement, props, 'status.editor.eol', 1 /* StatusbarAlignment.RIGHT */, 100.2);
    }
    updateLanguageIdElement(text) {
        if (!text) {
            this.languageElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.mode', 'Editor Language'),
            text,
            ariaLabel: text,
            tooltip: localize('selectLanguageMode', 'Select Language Mode'),
            command: 'workbench.action.editor.changeLanguageMode',
        };
        this.updateElement(this.languageElement, props, 'status.editor.mode', 1 /* StatusbarAlignment.RIGHT */, 100.1);
    }
    updateMetadataElement(text) {
        if (!text) {
            this.metadataElement.clear();
            return;
        }
        const props = {
            name: localize('status.editor.info', 'File Information'),
            text,
            ariaLabel: text,
            tooltip: localize('fileInfo', 'File Information'),
        };
        this.updateElement(this.metadataElement, props, 'status.editor.info', 1 /* StatusbarAlignment.RIGHT */, 100);
    }
    updateElement(element, props, id, alignment, priority) {
        if (!element.value) {
            element.value = this.statusbarService.addEntry(props, id, alignment, priority);
        }
        else {
            element.value.update(props);
        }
    }
    updateState(update) {
        const changed = this.state.update(update);
        if (!changed.hasChanges()) {
            return; // Nothing really changed
        }
        if (!this.toRender) {
            this.toRender = changed;
            this.delayedRender.value = runAtThisOrScheduleAtNextAnimationFrame(getWindowById(this.targetWindowId, true).window, () => {
                this.delayedRender.clear();
                const toRender = this.toRender;
                this.toRender = undefined;
                if (toRender) {
                    this.doRenderNow();
                }
            });
        }
        else {
            this.toRender.combine(changed);
        }
    }
    doRenderNow() {
        this.updateTabFocusModeElement(!!this.state.tabFocusMode);
        this.updateInputModeElement(this.state.inputMode);
        this.updateColumnSelectionModeElement(!!this.state.columnSelectionMode);
        this.updateIndentationElement(this.state.indentation);
        this.updateSelectionElement(this.state.selectionStatus);
        this.updateEncodingElement(this.state.encoding);
        this.updateEOLElement(this.state.EOL ? (this.state.EOL === '\r\n' ? nlsEOLCRLF : nlsEOLLF) : undefined);
        this.updateLanguageIdElement(this.state.languageId);
        this.updateMetadataElement(this.state.metadata);
    }
    getSelectionLabel(info) {
        if (!info || !info.selections) {
            return undefined;
        }
        if (info.selections.length === 1) {
            if (info.charactersSelected) {
                return format(nlsSingleSelectionRange, info.selections[0].positionLineNumber, info.selections[0].positionColumn, info.charactersSelected);
            }
            return format(nlsSingleSelection, info.selections[0].positionLineNumber, info.selections[0].positionColumn);
        }
        if (info.charactersSelected) {
            return format(nlsMultiSelectionRange, info.selections.length, info.charactersSelected);
        }
        if (info.selections.length > 0) {
            return format(nlsMultiSelection, info.selections.length);
        }
        return undefined;
    }
    updateStatusBar() {
        const activeInput = this.editorService.activeEditor;
        const activeEditorPane = this.editorService.activeEditorPane;
        const activeCodeEditor = activeEditorPane
            ? (getCodeEditor(activeEditorPane.getControl()) ?? undefined)
            : undefined;
        // Update all states
        this.onColumnSelectionModeChange(activeCodeEditor);
        this.onSelectionChange(activeCodeEditor);
        this.onLanguageChange(activeCodeEditor, activeInput);
        this.onEOLChange(activeCodeEditor);
        this.onEncodingChange(activeEditorPane, activeCodeEditor);
        this.onIndentationChange(activeCodeEditor);
        this.onMetadataChange(activeEditorPane);
        this.currentMarkerStatus.update(activeCodeEditor);
        // Dispose old active editor listeners
        this.activeEditorListeners.clear();
        // Attach new listeners to active editor
        if (activeEditorPane) {
            this.activeEditorListeners.add(activeEditorPane.onDidChangeControl(() => {
                // Since our editor status is mainly observing the
                // active editor control, do a full update whenever
                // the control changes.
                this.updateStatusBar();
            }));
        }
        // Attach new listeners to active code editor
        if (activeCodeEditor) {
            // Hook Listener for Configuration changes
            this.activeEditorListeners.add(activeCodeEditor.onDidChangeConfiguration((event) => {
                if (event.hasChanged(22 /* EditorOption.columnSelection */)) {
                    this.onColumnSelectionModeChange(activeCodeEditor);
                }
            }));
            // Hook Listener for Selection changes
            this.activeEditorListeners.add(Event.defer(activeCodeEditor.onDidChangeCursorPosition)(() => {
                this.onSelectionChange(activeCodeEditor);
                this.currentMarkerStatus.update(activeCodeEditor);
            }));
            // Hook Listener for language changes
            this.activeEditorListeners.add(activeCodeEditor.onDidChangeModelLanguage(() => {
                this.onLanguageChange(activeCodeEditor, activeInput);
            }));
            // Hook Listener for content changes
            this.activeEditorListeners.add(Event.accumulate(activeCodeEditor.onDidChangeModelContent)((e) => {
                this.onEOLChange(activeCodeEditor);
                this.currentMarkerStatus.update(activeCodeEditor);
                const selections = activeCodeEditor.getSelections();
                if (selections) {
                    for (const inner of e) {
                        for (const change of inner.changes) {
                            if (selections.some((selection) => Range.areIntersecting(selection, change.range))) {
                                this.onSelectionChange(activeCodeEditor);
                                break;
                            }
                        }
                    }
                }
            }));
            // Hook Listener for content options changes
            this.activeEditorListeners.add(activeCodeEditor.onDidChangeModelOptions(() => {
                this.onIndentationChange(activeCodeEditor);
            }));
        }
        // Handle binary editors
        else if (activeEditorPane instanceof BaseBinaryResourceEditor ||
            activeEditorPane instanceof BinaryResourceDiffEditor) {
            const binaryEditors = [];
            if (activeEditorPane instanceof BinaryResourceDiffEditor) {
                const primary = activeEditorPane.getPrimaryEditorPane();
                if (primary instanceof BaseBinaryResourceEditor) {
                    binaryEditors.push(primary);
                }
                const secondary = activeEditorPane.getSecondaryEditorPane();
                if (secondary instanceof BaseBinaryResourceEditor) {
                    binaryEditors.push(secondary);
                }
            }
            else {
                binaryEditors.push(activeEditorPane);
            }
            for (const editor of binaryEditors) {
                this.activeEditorListeners.add(editor.onDidChangeMetadata(() => {
                    this.onMetadataChange(activeEditorPane);
                }));
                this.activeEditorListeners.add(editor.onDidOpenInPlace(() => {
                    this.updateStatusBar();
                }));
            }
        }
    }
    onLanguageChange(editorWidget, editorInput) {
        const info = { type: 'languageId', languageId: undefined };
        // We only support text based editors
        if (editorWidget && editorInput && toEditorWithLanguageSupport(editorInput)) {
            const textModel = editorWidget.getModel();
            if (textModel) {
                const languageId = textModel.getLanguageId();
                info.languageId = this.languageService.getLanguageName(languageId) ?? undefined;
            }
        }
        this.updateState(info);
    }
    onIndentationChange(editorWidget) {
        const update = { type: 'indentation', indentation: undefined };
        if (editorWidget) {
            const model = editorWidget.getModel();
            if (model) {
                const modelOpts = model.getOptions();
                update.indentation = modelOpts.insertSpaces
                    ? modelOpts.tabSize === modelOpts.indentSize
                        ? localize('spacesSize', 'Spaces: {0}', modelOpts.indentSize)
                        : localize('spacesAndTabsSize', 'Spaces: {0} (Tab Size: {1})', modelOpts.indentSize, modelOpts.tabSize)
                    : localize({ key: 'tabSize', comment: ['Tab corresponds to the tab key'] }, 'Tab Size: {0}', modelOpts.tabSize);
            }
        }
        this.updateState(update);
    }
    onMetadataChange(editor) {
        const update = { type: 'metadata', metadata: undefined };
        if (editor instanceof BaseBinaryResourceEditor || editor instanceof BinaryResourceDiffEditor) {
            update.metadata = editor.getMetadata();
        }
        this.updateState(update);
    }
    onColumnSelectionModeChange(editorWidget) {
        const info = { type: 'columnSelectionMode', columnSelectionMode: false };
        if (editorWidget?.getOption(22 /* EditorOption.columnSelection */)) {
            info.columnSelectionMode = true;
        }
        this.updateState(info);
    }
    onSelectionChange(editorWidget) {
        const info = Object.create(null);
        // We only support text based editors
        if (editorWidget) {
            // Compute selection(s)
            info.selections = editorWidget.getSelections() || [];
            // Compute selection length
            info.charactersSelected = 0;
            const textModel = editorWidget.getModel();
            if (textModel) {
                for (const selection of info.selections) {
                    if (typeof info.charactersSelected !== 'number') {
                        info.charactersSelected = 0;
                    }
                    info.charactersSelected += textModel.getCharacterCountInRange(selection);
                }
            }
            // Compute the visible column for one selection. This will properly handle tabs and their configured widths
            if (info.selections.length === 1) {
                const editorPosition = editorWidget.getPosition();
                const selectionClone = new Selection(info.selections[0].selectionStartLineNumber, info.selections[0].selectionStartColumn, info.selections[0].positionLineNumber, editorPosition
                    ? editorWidget.getStatusbarColumn(editorPosition)
                    : info.selections[0].positionColumn);
                info.selections[0] = selectionClone;
            }
        }
        this.updateState({ type: 'selectionStatus', selectionStatus: this.getSelectionLabel(info) });
    }
    onEOLChange(editorWidget) {
        const info = { type: 'EOL', EOL: undefined };
        if (editorWidget && !editorWidget.getOption(96 /* EditorOption.readOnly */)) {
            const codeEditorModel = editorWidget.getModel();
            if (codeEditorModel) {
                info.EOL = codeEditorModel.getEOL();
            }
        }
        this.updateState(info);
    }
    onEncodingChange(editor, editorWidget) {
        if (editor && !this.isActiveEditor(editor)) {
            return;
        }
        const info = { type: 'encoding', encoding: undefined };
        // We only support text based editors that have a model associated
        // This ensures we do not show the encoding picker while an editor
        // is still loading.
        if (editor && editorWidget?.hasModel()) {
            const encodingSupport = editor.input
                ? toEditorWithEncodingSupport(editor.input)
                : null;
            if (encodingSupport) {
                const rawEncoding = encodingSupport.getEncoding();
                const encodingInfo = typeof rawEncoding === 'string' ? SUPPORTED_ENCODINGS[rawEncoding] : undefined;
                if (encodingInfo) {
                    info.encoding = encodingInfo.labelShort; // if we have a label, take it from there
                }
                else {
                    info.encoding = rawEncoding; // otherwise use it raw
                }
            }
        }
        this.updateState(info);
    }
    onResourceEncodingChange(resource) {
        const activeEditorPane = this.editorService.activeEditorPane;
        if (activeEditorPane) {
            const activeResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
            if (activeResource && isEqual(activeResource, resource)) {
                const activeCodeEditor = getCodeEditor(activeEditorPane.getControl()) ?? undefined;
                return this.onEncodingChange(activeEditorPane, activeCodeEditor); // only update if the encoding changed for the active resource
            }
        }
    }
    onTabFocusModeChange(tabFocusMode) {
        const info = { type: 'tabFocusMode', tabFocusMode };
        this.updateState(info);
    }
    onInputModeChange(inputMode) {
        const info = { type: 'inputMode', inputMode };
        this.updateState(info);
    }
    isActiveEditor(control) {
        const activeEditorPane = this.editorService.activeEditorPane;
        return !!activeEditorPane && activeEditorPane === control;
    }
};
EditorStatus = __decorate([
    __param(1, IEditorService),
    __param(2, IQuickInputService),
    __param(3, ILanguageService),
    __param(4, ITextFileService),
    __param(5, IStatusbarService),
    __param(6, IInstantiationService),
    __param(7, IConfigurationService)
], EditorStatus);
let EditorStatusContribution = class EditorStatusContribution extends Disposable {
    static { this.ID = 'workbench.contrib.editorStatus'; }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        for (const part of editorGroupService.parts) {
            this.createEditorStatus(part);
        }
        this._register(editorGroupService.onDidCreateAuxiliaryEditorPart((part) => this.createEditorStatus(part)));
    }
    createEditorStatus(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedInstantiationService = this.editorGroupService.getScopedInstantiationService(part);
        disposables.add(scopedInstantiationService.createInstance(EditorStatus, part.windowId));
    }
};
EditorStatusContribution = __decorate([
    __param(0, IEditorGroupsService)
], EditorStatusContribution);
export { EditorStatusContribution };
let ShowCurrentMarkerInStatusbarContribution = class ShowCurrentMarkerInStatusbarContribution extends Disposable {
    constructor(statusbarService, markerService, configurationService) {
        super();
        this.statusbarService = statusbarService;
        this.markerService = markerService;
        this.configurationService = configurationService;
        this.editor = undefined;
        this.markers = [];
        this.currentMarker = null;
        this.statusBarEntryAccessor = this._register(new MutableDisposable());
        this._register(markerService.onMarkerChanged((changedResources) => this.onMarkerChanged(changedResources)));
        this._register(Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('problems.showCurrentInStatus'))(() => this.updateStatus()));
    }
    update(editor) {
        this.editor = editor;
        this.updateMarkers();
        this.updateStatus();
    }
    updateStatus() {
        const previousMarker = this.currentMarker;
        this.currentMarker = this.getMarker();
        if (this.hasToUpdateStatus(previousMarker, this.currentMarker)) {
            if (this.currentMarker) {
                const line = splitLines(this.currentMarker.message)[0];
                const text = `${this.getType(this.currentMarker)} ${line}`;
                if (!this.statusBarEntryAccessor.value) {
                    this.statusBarEntryAccessor.value = this.statusbarService.addEntry({ name: localize('currentProblem', 'Current Problem'), text, ariaLabel: text }, 'statusbar.currentProblem', 0 /* StatusbarAlignment.LEFT */);
                }
                else {
                    this.statusBarEntryAccessor.value.update({
                        name: localize('currentProblem', 'Current Problem'),
                        text,
                        ariaLabel: text,
                    });
                }
            }
            else {
                this.statusBarEntryAccessor.clear();
            }
        }
    }
    hasToUpdateStatus(previousMarker, currentMarker) {
        if (!currentMarker) {
            return true;
        }
        if (!previousMarker) {
            return true;
        }
        return IMarkerData.makeKey(previousMarker) !== IMarkerData.makeKey(currentMarker);
    }
    getType(marker) {
        switch (marker.severity) {
            case MarkerSeverity.Error:
                return '$(error)';
            case MarkerSeverity.Warning:
                return '$(warning)';
            case MarkerSeverity.Info:
                return '$(info)';
        }
        return '';
    }
    getMarker() {
        if (!this.configurationService.getValue('problems.showCurrentInStatus')) {
            return null;
        }
        if (!this.editor) {
            return null;
        }
        const model = this.editor.getModel();
        if (!model) {
            return null;
        }
        const position = this.editor.getPosition();
        if (!position) {
            return null;
        }
        return this.markers.find((marker) => Range.containsPosition(marker, position)) || null;
    }
    onMarkerChanged(changedResources) {
        if (!this.editor) {
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        if (model && !changedResources.some((r) => isEqual(model.uri, r))) {
            return;
        }
        this.updateMarkers();
    }
    updateMarkers() {
        if (!this.editor) {
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        if (model) {
            this.markers = this.markerService.read({
                resource: model.uri,
                severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info,
            });
            this.markers.sort(this.compareMarker);
        }
        else {
            this.markers = [];
        }
        this.updateStatus();
    }
    compareMarker(a, b) {
        let res = compare(a.resource.toString(), b.resource.toString());
        if (res === 0) {
            res = MarkerSeverity.compare(a.severity, b.severity);
        }
        if (res === 0) {
            res = Range.compareRangesUsingStarts(a, b);
        }
        return res;
    }
};
ShowCurrentMarkerInStatusbarContribution = __decorate([
    __param(0, IStatusbarService),
    __param(1, IMarkerService),
    __param(2, IConfigurationService)
], ShowCurrentMarkerInStatusbarContribution);
let ShowLanguageExtensionsAction = class ShowLanguageExtensionsAction extends Action {
    static { ShowLanguageExtensionsAction_1 = this; }
    static { this.ID = 'workbench.action.showLanguageExtensions'; }
    constructor(fileExtension, commandService, galleryService) {
        super(ShowLanguageExtensionsAction_1.ID, localize('showLanguageExtensions', "Search Marketplace Extensions for '{0}'...", fileExtension));
        this.fileExtension = fileExtension;
        this.commandService = commandService;
        this.enabled = galleryService.isEnabled();
    }
    async run() {
        await this.commandService.executeCommand('workbench.extensions.action.showExtensionsForLanguage', this.fileExtension);
    }
};
ShowLanguageExtensionsAction = ShowLanguageExtensionsAction_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IExtensionGalleryService)
], ShowLanguageExtensionsAction);
export { ShowLanguageExtensionsAction };
export class ChangeLanguageAction extends Action2 {
    static { this.ID = 'workbench.action.editor.changeLanguageMode'; }
    constructor() {
        super({
            id: ChangeLanguageAction.ID,
            title: localize2('changeMode', 'Change Language Mode'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 43 /* KeyCode.KeyM */),
            },
            precondition: ContextKeyExpr.not('notebookEditorFocused'),
            metadata: {
                description: localize('changeLanguageMode.description', 'Change the language mode of the active text editor.'),
                args: [
                    {
                        name: localize('changeLanguageMode.arg.name', 'The name of the language mode to change to.'),
                        constraint: (value) => typeof value === 'string',
                    },
                ],
            },
        });
    }
    async run(accessor, languageMode) {
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const languageService = accessor.get(ILanguageService);
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const textFileService = accessor.get(ITextFileService);
        const preferencesService = accessor.get(IPreferencesService);
        const instantiationService = accessor.get(IInstantiationService);
        const configurationService = accessor.get(IConfigurationService);
        const telemetryService = accessor.get(ITelemetryService);
        const activeTextEditorControl = getCodeEditor(editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            await quickInputService.pick([
                { label: localize('noEditor', 'No text editor active at this time') },
            ]);
            return;
        }
        const textModel = activeTextEditorControl.getModel();
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        // Compute language
        let currentLanguageName;
        let currentLanguageId;
        if (textModel) {
            currentLanguageId = textModel.getLanguageId();
            currentLanguageName = languageService.getLanguageName(currentLanguageId) ?? undefined;
        }
        let hasLanguageSupport = !!resource;
        if (resource?.scheme === Schemas.untitled &&
            !textFileService.untitled.get(resource)?.hasAssociatedFilePath) {
            hasLanguageSupport = false; // no configuration for untitled resources (e.g. "Untitled-1")
        }
        // All languages are valid picks
        const languages = languageService.getSortedRegisteredLanguageNames();
        const picks = languages.map(({ languageName, languageId }) => {
            const extensions = languageService.getExtensions(languageId).join(' ');
            let description;
            if (currentLanguageName === languageName) {
                description = localize('languageDescription', '({0}) - Configured Language', languageId);
            }
            else {
                description = localize('languageDescriptionConfigured', '({0})', languageId);
            }
            return {
                label: languageName,
                meta: extensions,
                iconClasses: getIconClassesForLanguageId(languageId),
                description,
            };
        });
        picks.unshift({
            type: 'separator',
            label: localize('languagesPicks', 'languages (identifier)'),
        });
        // Offer action to configure via settings
        let configureLanguageAssociations;
        let configureLanguageSettings;
        let galleryAction;
        if (hasLanguageSupport && resource) {
            const ext = extname(resource) || basename(resource);
            galleryAction = instantiationService.createInstance(ShowLanguageExtensionsAction, ext);
            if (galleryAction.enabled) {
                picks.unshift(galleryAction);
            }
            configureLanguageSettings = {
                label: localize('configureModeSettings', "Configure '{0}' language based settings...", currentLanguageName),
            };
            picks.unshift(configureLanguageSettings);
            configureLanguageAssociations = {
                label: localize('configureAssociationsExt', "Configure File Association for '{0}'...", ext),
            };
            picks.unshift(configureLanguageAssociations);
        }
        // Offer to "Auto Detect"
        const autoDetectLanguage = {
            label: localize('autoDetect', 'Auto Detect'),
        };
        picks.unshift(autoDetectLanguage);
        const pick = typeof languageMode === 'string'
            ? { label: languageMode }
            : await quickInputService.pick(picks, {
                placeHolder: localize('pickLanguage', 'Select Language Mode'),
                matchOnDescription: true,
            });
        if (!pick) {
            return;
        }
        if (pick === galleryAction) {
            galleryAction.run();
            return;
        }
        // User decided to permanently configure associations, return right after
        if (pick === configureLanguageAssociations) {
            if (resource) {
                this.configureFileAssociation(resource, languageService, quickInputService, configurationService);
            }
            return;
        }
        // User decided to configure settings for current language
        if (pick === configureLanguageSettings) {
            preferencesService.openUserSettings({
                jsonEditor: true,
                revealSetting: { key: `[${currentLanguageId ?? null}]`, edit: true },
            });
            return;
        }
        // Change language for active editor
        const activeEditor = editorService.activeEditor;
        if (activeEditor) {
            const languageSupport = toEditorWithLanguageSupport(activeEditor);
            if (languageSupport) {
                // Find language
                let languageSelection;
                let detectedLanguage;
                if (pick === autoDetectLanguage) {
                    if (textModel) {
                        const resource = EditorResourceAccessor.getOriginalUri(activeEditor, {
                            supportSideBySide: SideBySideEditor.PRIMARY,
                        });
                        if (resource) {
                            // Detect languages since we are in an untitled file
                            let languageId = languageService.guessLanguageIdByFilepathOrFirstLine(resource, textModel.getLineContent(1)) ?? undefined;
                            if (!languageId || languageId === 'unknown') {
                                detectedLanguage = await languageDetectionService.detectLanguage(resource);
                                languageId = detectedLanguage;
                            }
                            if (languageId) {
                                languageSelection = languageService.createById(languageId);
                            }
                        }
                    }
                }
                else {
                    const languageId = languageService.getLanguageIdByLanguageName(pick.label);
                    languageSelection = languageService.createById(languageId);
                    if (resource) {
                        // fire and forget to not slow things down
                        languageDetectionService.detectLanguage(resource).then((detectedLanguageId) => {
                            const chosenLanguageId = languageService.getLanguageIdByLanguageName(pick.label) || 'unknown';
                            if (detectedLanguageId === currentLanguageId &&
                                currentLanguageId !== chosenLanguageId) {
                                // If they didn't choose the detected language (which should also be the active language if automatic detection is enabled)
                                // then the automatic language detection was likely wrong and the user is correcting it. In this case, we want telemetry.
                                // Keep track of what model was preferred and length of input to help track down potential differences between the result quality across models and content size.
                                const modelPreference = configurationService.getValue('workbench.editor.preferHistoryBasedLanguageDetection')
                                    ? 'history'
                                    : 'classic';
                                telemetryService.publicLog2(AutomaticLanguageDetectionLikelyWrongId, {
                                    currentLanguageId: currentLanguageName ?? 'unknown',
                                    nextLanguageId: pick.label,
                                    lineCount: textModel?.getLineCount() ?? -1,
                                    modelPreference,
                                });
                            }
                        });
                    }
                }
                // Change language
                if (typeof languageSelection !== 'undefined') {
                    languageSupport.setLanguageId(languageSelection.languageId, ChangeLanguageAction.ID);
                    if (resource?.scheme === Schemas.untitled) {
                        const modelPreference = configurationService.getValue('workbench.editor.preferHistoryBasedLanguageDetection')
                            ? 'history'
                            : 'classic';
                        telemetryService.publicLog2('setUntitledDocumentLanguage', {
                            to: languageSelection.languageId,
                            from: currentLanguageId ?? 'none',
                            modelPreference,
                        });
                    }
                }
            }
            activeTextEditorControl.focus();
        }
    }
    configureFileAssociation(resource, languageService, quickInputService, configurationService) {
        const extension = extname(resource);
        const base = basename(resource);
        const currentAssociation = languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(base));
        const languages = languageService.getSortedRegisteredLanguageNames();
        const picks = languages.map(({ languageName, languageId }) => {
            return {
                id: languageId,
                label: languageName,
                iconClasses: getIconClassesForLanguageId(languageId),
                description: languageId === currentAssociation
                    ? localize('currentAssociation', 'Current Association')
                    : undefined,
            };
        });
        setTimeout(async () => {
            const language = await quickInputService.pick(picks, {
                placeHolder: localize('pickLanguageToConfigure', "Select Language Mode to Associate with '{0}'", extension || base),
            });
            if (language) {
                const fileAssociationsConfig = configurationService.inspect(FILES_ASSOCIATIONS_CONFIG);
                let associationKey;
                if (extension && base[0] !== '.') {
                    associationKey = `*${extension}`; // only use "*.ext" if the file path is in the form of <name>.<ext>
                }
                else {
                    associationKey = base; // otherwise use the basename (e.g. .gitignore, Dockerfile)
                }
                // If the association is already being made in the workspace, make sure to target workspace settings
                let target = 2 /* ConfigurationTarget.USER */;
                if (fileAssociationsConfig.workspaceValue &&
                    !!fileAssociationsConfig.workspaceValue[associationKey]) {
                    target = 5 /* ConfigurationTarget.WORKSPACE */;
                }
                // Make sure to write into the value of the target and not the merged value from USER and WORKSPACE config
                const currentAssociations = deepClone(target === 5 /* ConfigurationTarget.WORKSPACE */
                    ? fileAssociationsConfig.workspaceValue
                    : fileAssociationsConfig.userValue) || Object.create(null);
                currentAssociations[associationKey] = language.id;
                configurationService.updateValue(FILES_ASSOCIATIONS_CONFIG, currentAssociations, target);
            }
        }, 50 /* quick input is sensitive to being opened so soon after another */);
    }
}
export class ChangeEOLAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.editor.changeEOL',
            title: localize2('changeEndOfLine', 'Change End of Line Sequence'),
            f1: true,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const quickInputService = accessor.get(IQuickInputService);
        const activeTextEditorControl = getCodeEditor(editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            await quickInputService.pick([
                { label: localize('noEditor', 'No text editor active at this time') },
            ]);
            return;
        }
        if (editorService.activeEditor?.isReadonly()) {
            await quickInputService.pick([
                { label: localize('noWritableCodeEditor', 'The active code editor is read-only.') },
            ]);
            return;
        }
        let textModel = activeTextEditorControl.getModel();
        const EOLOptions = [
            { label: nlsEOLLF, eol: 0 /* EndOfLineSequence.LF */ },
            { label: nlsEOLCRLF, eol: 1 /* EndOfLineSequence.CRLF */ },
        ];
        const selectedIndex = textModel?.getEOL() === '\n' ? 0 : 1;
        const eol = await quickInputService.pick(EOLOptions, {
            placeHolder: localize('pickEndOfLine', 'Select End of Line Sequence'),
            activeItem: EOLOptions[selectedIndex],
        });
        if (eol) {
            const activeCodeEditor = getCodeEditor(editorService.activeTextEditorControl);
            if (activeCodeEditor?.hasModel() && !editorService.activeEditor?.isReadonly()) {
                textModel = activeCodeEditor.getModel();
                textModel.pushStackElement();
                textModel.pushEOL(eol.eol);
                textModel.pushStackElement();
            }
        }
        activeTextEditorControl.focus();
    }
}
export class ChangeEncodingAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.editor.changeEncoding',
            title: localize2('changeEncoding', 'Change File Encoding'),
            f1: true,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const quickInputService = accessor.get(IQuickInputService);
        const fileService = accessor.get(IFileService);
        const textFileService = accessor.get(ITextFileService);
        const textResourceConfigurationService = accessor.get(ITextResourceConfigurationService);
        const activeTextEditorControl = getCodeEditor(editorService.activeTextEditorControl);
        if (!activeTextEditorControl) {
            await quickInputService.pick([
                { label: localize('noEditor', 'No text editor active at this time') },
            ]);
            return;
        }
        const activeEditorPane = editorService.activeEditorPane;
        if (!activeEditorPane) {
            await quickInputService.pick([
                { label: localize('noEditor', 'No text editor active at this time') },
            ]);
            return;
        }
        const encodingSupport = toEditorWithEncodingSupport(activeEditorPane.input);
        if (!encodingSupport) {
            await quickInputService.pick([
                { label: localize('noFileEditor', 'No file active at this time') },
            ]);
            return;
        }
        const saveWithEncodingPick = {
            label: localize('saveWithEncoding', 'Save with Encoding'),
        };
        const reopenWithEncodingPick = {
            label: localize('reopenWithEncoding', 'Reopen with Encoding'),
        };
        if (!Language.isDefaultVariant()) {
            const saveWithEncodingAlias = 'Save with Encoding';
            if (saveWithEncodingAlias !== saveWithEncodingPick.label) {
                saveWithEncodingPick.detail = saveWithEncodingAlias;
            }
            const reopenWithEncodingAlias = 'Reopen with Encoding';
            if (reopenWithEncodingAlias !== reopenWithEncodingPick.label) {
                reopenWithEncodingPick.detail = reopenWithEncodingAlias;
            }
        }
        let action;
        if (encodingSupport instanceof UntitledTextEditorInput) {
            action = saveWithEncodingPick;
        }
        else if (activeEditorPane.input.isReadonly()) {
            action = reopenWithEncodingPick;
        }
        else {
            action = await quickInputService.pick([reopenWithEncodingPick, saveWithEncodingPick], {
                placeHolder: localize('pickAction', 'Select Action'),
                matchOnDetail: true,
            });
        }
        if (!action) {
            return;
        }
        await timeout(50); // quick input is sensitive to being opened so soon after another
        const resource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (!resource || (!fileService.hasProvider(resource) && resource.scheme !== Schemas.untitled)) {
            return; // encoding detection only possible for resources the file service can handle or that are untitled
        }
        let guessedEncoding = undefined;
        if (fileService.hasProvider(resource)) {
            const content = await textFileService.readStream(resource, {
                autoGuessEncoding: true,
                candidateGuessEncodings: textResourceConfigurationService.getValue(resource, 'files.candidateGuessEncodings'),
            });
            guessedEncoding = content.encoding;
        }
        const isReopenWithEncoding = action === reopenWithEncodingPick;
        const configuredEncoding = textResourceConfigurationService.getValue(resource, 'files.encoding');
        let directMatchIndex;
        let aliasMatchIndex;
        // All encodings are valid picks
        const picks = Object.keys(SUPPORTED_ENCODINGS)
            .sort((k1, k2) => {
            if (k1 === configuredEncoding) {
                return -1;
            }
            else if (k2 === configuredEncoding) {
                return 1;
            }
            return SUPPORTED_ENCODINGS[k1].order - SUPPORTED_ENCODINGS[k2].order;
        })
            .filter((k) => {
            if (k === guessedEncoding && guessedEncoding !== configuredEncoding) {
                return false; // do not show encoding if it is the guessed encoding that does not match the configured
            }
            return !isReopenWithEncoding || !SUPPORTED_ENCODINGS[k].encodeOnly; // hide those that can only be used for encoding if we are about to decode
        })
            .map((key, index) => {
            if (key === encodingSupport.getEncoding()) {
                directMatchIndex = index;
            }
            else if (SUPPORTED_ENCODINGS[key].alias === encodingSupport.getEncoding()) {
                aliasMatchIndex = index;
            }
            return { id: key, label: SUPPORTED_ENCODINGS[key].labelLong, description: key };
        });
        const items = picks.slice();
        // If we have a guessed encoding, show it first unless it matches the configured encoding
        if (guessedEncoding &&
            configuredEncoding !== guessedEncoding &&
            SUPPORTED_ENCODINGS[guessedEncoding]) {
            picks.unshift({ type: 'separator' });
            picks.unshift({
                id: guessedEncoding,
                label: SUPPORTED_ENCODINGS[guessedEncoding].labelLong,
                description: localize('guessedEncoding', 'Guessed from content'),
            });
        }
        const encoding = await quickInputService.pick(picks, {
            placeHolder: isReopenWithEncoding
                ? localize('pickEncodingForReopen', 'Select File Encoding to Reopen File')
                : localize('pickEncodingForSave', 'Select File Encoding to Save with'),
            activeItem: items[typeof directMatchIndex === 'number'
                ? directMatchIndex
                : typeof aliasMatchIndex === 'number'
                    ? aliasMatchIndex
                    : -1],
        });
        if (!encoding) {
            return;
        }
        if (!editorService.activeEditorPane) {
            return;
        }
        const activeEncodingSupport = toEditorWithEncodingSupport(editorService.activeEditorPane.input);
        if (typeof encoding.id !== 'undefined' && activeEncodingSupport) {
            await activeEncodingSupport.setEncoding(encoding.id, isReopenWithEncoding ? 1 /* EncodingMode.Decode */ : 0 /* EncodingMode.Encode */); // Set new encoding
        }
        activeTextEditorControl.focus();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdHVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvclN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFDTixhQUFhLEVBQ2IsdUNBQXVDLEdBQ3ZDLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN0RyxPQUFPLEVBRU4sc0JBQXNCLEVBRXRCLGdCQUFnQixHQUNoQixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFDTixVQUFVLEVBQ1YsaUJBQWlCLEVBQ2pCLGVBQWUsR0FDZixNQUFNLHNDQUFzQyxDQUFBO0FBRzdDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQ3BILE9BQU8sRUFDTixpQkFBaUIsRUFDakIsZUFBZSxF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