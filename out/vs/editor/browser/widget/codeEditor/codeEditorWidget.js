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
var CodeEditorWidget_1;
import '../../services/markerDecorations.js';
import * as dom from '../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, createEventDeliveryQueue, } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose, } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import './editor.css';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { EditorConfiguration, } from '../../config/editorConfiguration.js';
import { TabFocus } from '../../config/tabFocus.js';
import { EditorExtensionsRegistry } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { View } from '../../view.js';
import { DOMLineBreaksComputerFactory } from '../../view/domLineBreaksComputer.js';
import { ViewUserInputEvents } from '../../view/viewUserInputEvents.js';
import { CodeEditorContributions } from './codeEditorContributions.js';
import { filterValidationDecorations, } from '../../../common/config/editorOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { editorUnnecessaryCodeOpacity } from '../../../common/core/editorColorRegistry.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { WordOperations } from '../../../common/cursor/cursorWordOperations.js';
import { InternalEditorAction } from '../../../common/editorAction.js';
import * as editorCommon from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { editorErrorForeground, editorHintForeground, editorInfoForeground, editorWarningForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
let CodeEditorWidget = class CodeEditorWidget extends Disposable {
    static { CodeEditorWidget_1 = this; }
    static { this.dropIntoEditorDecorationOptions = ModelDecorationOptions.register({
        description: 'workbench-dnd-target',
        className: 'dnd-target',
    }); }
    //#endregion
    get isSimpleWidget() {
        return this._configuration.isSimpleWidget;
    }
    get contextMenuId() {
        return this._configuration.contextMenuId;
    }
    get contextKeyService() {
        return this._contextKeyService;
    }
    constructor(domElement, _options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        //#region Eventing
        this._deliveryQueue = createEventDeliveryQueue();
        this._contributions = this._register(new CodeEditorContributions());
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChangeModelContent = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelContent = this._onDidChangeModelContent.event;
        this._onDidChangeModelLanguage = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguage = this._onDidChangeModelLanguage.event;
        this._onDidChangeModelLanguageConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguageConfiguration = this._onDidChangeModelLanguageConfiguration.event;
        this._onDidChangeModelOptions = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelOptions = this._onDidChangeModelOptions.event;
        this._onDidChangeModelDecorations = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelDecorations = this._onDidChangeModelDecorations.event;
        this._onDidChangeModelTokens = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelTokens = this._onDidChangeModelTokens.event;
        this._onDidChangeConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onWillChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onWillChangeModel = this._onWillChangeModel.event;
        this._onDidChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidChangeCursorPosition = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorPosition = this._onDidChangeCursorPosition.event;
        this._onDidChangeCursorSelection = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorSelection = this._onDidChangeCursorSelection.event;
        this._onDidAttemptReadOnlyEdit = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidAttemptReadOnlyEdit = this._onDidAttemptReadOnlyEdit.event;
        this._onDidLayoutChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidLayoutChange = this._onDidLayoutChange.event;
        this._editorTextFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorText = this._editorTextFocus.onDidChangeToTrue;
        this.onDidBlurEditorText = this._editorTextFocus.onDidChangeToFalse;
        this._editorWidgetFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorWidget = this._editorWidgetFocus.onDidChangeToTrue;
        this.onDidBlurEditorWidget = this._editorWidgetFocus.onDidChangeToFalse;
        this._onWillType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onWillType = this._onWillType.event;
        this._onDidType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidType = this._onDidType.event;
        this._onDidCompositionStart = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionStart = this._onDidCompositionStart.event;
        this._onDidCompositionEnd = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionEnd = this._onDidCompositionEnd.event;
        this._onDidPaste = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidPaste = this._onDidPaste.event;
        this._onMouseUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseUp = this._onMouseUp.event;
        this._onMouseDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDown = this._onMouseDown.event;
        this._onMouseDrag = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrag = this._onMouseDrag.event;
        this._onMouseDrop = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrop = this._onMouseDrop.event;
        this._onMouseDropCanceled = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDropCanceled = this._onMouseDropCanceled.event;
        this._onDropIntoEditor = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDropIntoEditor = this._onDropIntoEditor.event;
        this._onContextMenu = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onContextMenu = this._onContextMenu.event;
        this._onMouseMove = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseMove = this._onMouseMove.event;
        this._onMouseLeave = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseLeave = this._onMouseLeave.event;
        this._onMouseWheel = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseWheel = this._onMouseWheel.event;
        this._onKeyUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyUp = this._onKeyUp.event;
        this._onKeyDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyDown = this._onKeyDown.event;
        this._onDidContentSizeChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._onDidScrollChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidScrollChange = this._onDidScrollChange.event;
        this._onDidChangeViewZones = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeViewZones = this._onDidChangeViewZones.event;
        this._onDidChangeHiddenAreas = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeHiddenAreas = this._onDidChangeHiddenAreas.event;
        this._updateCounter = 0;
        this._onWillTriggerEditorOperationEvent = this._register(new Emitter());
        this.onWillTriggerEditorOperationEvent = this._onWillTriggerEditorOperationEvent.event;
        this._onBeginUpdate = this._register(new Emitter());
        this.onBeginUpdate = this._onBeginUpdate.event;
        this._onEndUpdate = this._register(new Emitter());
        this.onEndUpdate = this._onEndUpdate.event;
        this._onBeforeExecuteEdit = this._register(new Emitter());
        this.onBeforeExecuteEdit = this._onBeforeExecuteEdit.event;
        this._actions = new Map();
        this._bannerDomNode = null;
        this._dropIntoEditorDecorations = this.createDecorationsCollection();
        this.inComposition = false;
        codeEditorService.willCreateCodeEditor();
        const options = { ..._options };
        this._domElement = domElement;
        this._overflowWidgetsDomNode = options.overflowWidgetsDomNode;
        delete options.overflowWidgetsDomNode;
        this._id = ++EDITOR_ID;
        this._decorationTypeKeysToIds = {};
        this._decorationTypeSubtypes = {};
        this._telemetryData = codeEditorWidgetOptions.telemetryData;
        this._configuration = this._register(this._createConfiguration(codeEditorWidgetOptions.isSimpleWidget || false, codeEditorWidgetOptions.contextMenuId ??
            (codeEditorWidgetOptions.isSimpleWidget
                ? MenuId.SimpleEditorContext
                : MenuId.EditorContext), options, accessibilityService));
        this._register(this._configuration.onDidChange((e) => {
            this._onDidChangeConfiguration.fire(e);
            const options = this._configuration.options;
            if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
                const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
                this._onDidLayoutChange.fire(layoutInfo);
            }
        }));
        this._contextKeyService = this._register(contextKeyService.createScoped(this._domElement));
        if (codeEditorWidgetOptions.contextKeyValues) {
            for (const [key, value] of Object.entries(codeEditorWidgetOptions.contextKeyValues)) {
                this._contextKeyService.createKey(key, value);
            }
        }
        this._notificationService = notificationService;
        this._codeEditorService = codeEditorService;
        this._commandService = commandService;
        this._themeService = themeService;
        this._register(new EditorContextKeysManager(this, this._contextKeyService));
        this._register(new EditorModeContext(this, this._contextKeyService, languageFeaturesService));
        this._instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._modelData = null;
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._glyphMarginWidgets = {};
        let contributions;
        if (Array.isArray(codeEditorWidgetOptions.contributions)) {
            contributions = codeEditorWidgetOptions.contributions;
        }
        else {
            contributions = EditorExtensionsRegistry.getEditorContributions();
        }
        this._contributions.initialize(this, contributions, this._instantiationService);
        for (const action of EditorExtensionsRegistry.getEditorActions()) {
            if (this._actions.has(action.id)) {
                onUnexpectedError(new Error(`Cannot have two actions with the same id ${action.id}`));
                continue;
            }
            const internalAction = new InternalEditorAction(action.id, action.label, action.alias, action.metadata, action.precondition ?? undefined, (args) => {
                return this._instantiationService.invokeFunction((accessor) => {
                    return Promise.resolve(action.runEditorCommand(accessor, this, args));
                });
            }, this._contextKeyService);
            this._actions.set(internalAction.id, internalAction);
        }
        const isDropIntoEnabled = () => {
            return (!this._configuration.options.get(96 /* EditorOption.readOnly */) &&
                this._configuration.options.get(36 /* EditorOption.dropIntoEditor */).enabled);
        };
        this._register(new dom.DragAndDropObserver(this._domElement, {
            onDragOver: (e) => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this.showDropIndicatorAt(target.position);
                }
            },
            onDrop: async (e) => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                this.removeDropIndicator();
                if (!e.dataTransfer) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this._onDropIntoEditor.fire({ position: target.position, event: e });
                }
            },
            onDragLeave: () => {
                this.removeDropIndicator();
            },
            onDragEnd: () => {
                this.removeDropIndicator();
            },
        }));
        this._codeEditorService.addCodeEditor(this);
    }
    writeScreenReaderContent(reason) {
        this._modelData?.view.writeScreenReaderContent(reason);
    }
    _createConfiguration(isSimpleWidget, contextMenuId, options, accessibilityService) {
        return new EditorConfiguration(isSimpleWidget, contextMenuId, options, this._domElement, accessibilityService);
    }
    getId() {
        return this.getEditorType() + ':' + this._id;
    }
    getEditorType() {
        return editorCommon.EditorType.ICodeEditor;
    }
    dispose() {
        this._codeEditorService.removeCodeEditor(this);
        this._actions.clear();
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._removeDecorationTypes();
        this._postDetachModelCleanup(this._detachModel());
        this._onDidDispose.fire();
        super.dispose();
    }
    invokeWithinContext(fn) {
        return this._instantiationService.invokeFunction(fn);
    }
    updateOptions(newOptions) {
        this._configuration.updateOptions(newOptions || {});
    }
    getOptions() {
        return this._configuration.options;
    }
    getOption(id) {
        return this._configuration.options.get(id);
    }
    getRawOptions() {
        return this._configuration.getRawOptions();
    }
    getOverflowWidgetsDomNode() {
        return this._overflowWidgetsDomNode;
    }
    getConfiguredWordAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return WordOperations.getWordAtPosition(this._modelData.model, this._configuration.options.get(136 /* EditorOption.wordSeparators */), this._configuration.options.get(135 /* EditorOption.wordSegmenterLocales */), position);
    }
    getValue(options = null) {
        if (!this._modelData) {
            return '';
        }
        const preserveBOM = options && options.preserveBOM ? true : false;
        let eolPreference = 0 /* EndOfLinePreference.TextDefined */;
        if (options && options.lineEnding && options.lineEnding === '\n') {
            eolPreference = 1 /* EndOfLinePreference.LF */;
        }
        else if (options && options.lineEnding && options.lineEnding === '\r\n') {
            eolPreference = 2 /* EndOfLinePreference.CRLF */;
        }
        return this._modelData.model.getValue(eolPreference, preserveBOM);
    }
    setValue(newValue) {
        try {
            this._beginUpdate();
            if (!this._modelData) {
                return;
            }
            this._modelData.model.setValue(newValue);
        }
        finally {
            this._endUpdate();
        }
    }
    getModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model;
    }
    setModel(_model = null) {
        try {
            this._beginUpdate();
            const model = _model;
            if (this._modelData === null && model === null) {
                // Current model is the new model
                return;
            }
            if (this._modelData && this._modelData.model === model) {
                // Current model is the new model
                return;
            }
            const e = {
                oldModelUrl: this._modelData?.model.uri || null,
                newModelUrl: model?.uri || null,
            };
            this._onWillChangeModel.fire(e);
            const hasTextFocus = this.hasTextFocus();
            const detachedModel = this._detachModel();
            this._attachModel(model);
            if (this.hasModel()) {
                // we have a new model (with a new view)!
                if (hasTextFocus) {
                    this.focus();
                }
            }
            else {
                // we have no model (and no view) anymore
                // make sure the outside world knows we are not focused
                this._editorTextFocus.setValue(false);
                this._editorWidgetFocus.setValue(false);
            }
            this._removeDecorationTypes();
            this._onDidChangeModel.fire(e);
            this._postDetachModelCleanup(detachedModel);
            this._contributionsDisposable = this._contributions.onAfterModelAttached();
        }
        finally {
            this._endUpdate();
        }
    }
    _removeDecorationTypes() {
        this._decorationTypeKeysToIds = {};
        if (this._decorationTypeSubtypes) {
            for (const decorationType in this._decorationTypeSubtypes) {
                const subTypes = this._decorationTypeSubtypes[decorationType];
                for (const subType in subTypes) {
                    this._removeDecorationType(decorationType + '-' + subType);
                }
            }
            this._decorationTypeSubtypes = {};
        }
    }
    getVisibleRanges() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRanges();
    }
    getVisibleRangesPlusViewportAboveBelow() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRangesPlusViewportAboveBelow();
    }
    getWhitespaces() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.viewLayout.getWhitespaces();
    }
    static _getVerticalOffsetAfterPosition(modelData, modelLineNumber, modelColumn, includeViewZones) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn,
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetAfterLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getTopForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, 1, includeViewZones);
    }
    getTopForPosition(lineNumber, column) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, column, false);
    }
    static _getVerticalOffsetForPosition(modelData, modelLineNumber, modelColumn, includeViewZones = false) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn,
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getBottomForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        const maxCol = this._modelData.model.getLineMaxColumn(lineNumber);
        return CodeEditorWidget_1._getVerticalOffsetAfterPosition(this._modelData, lineNumber, maxCol, includeViewZones);
    }
    setHiddenAreas(ranges, source, forceUpdate) {
        this._modelData?.viewModel.setHiddenAreas(ranges.map((r) => Range.lift(r)), source, forceUpdate);
    }
    getVisibleColumnFromPosition(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return (CursorColumns.visibleColumnFromColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize) + 1);
    }
    getStatusbarColumn(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.toStatusbarColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize);
    }
    getPosition() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getPosition();
    }
    setPosition(position, source = 'api') {
        if (!this._modelData) {
            return;
        }
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.setSelections(source, [
            {
                selectionStartLineNumber: position.lineNumber,
                selectionStartColumn: position.column,
                positionLineNumber: position.lineNumber,
                positionColumn: position.column,
            },
        ]);
    }
    _sendRevealRange(modelRange, verticalType, revealHorizontal, scrollType) {
        if (!this._modelData) {
            return;
        }
        if (!Range.isIRange(modelRange)) {
            throw new Error('Invalid arguments');
        }
        const validatedModelRange = this._modelData.model.validateRange(modelRange);
        const viewRange = this._modelData.viewModel.coordinatesConverter.convertModelRangeToViewRange(validatedModelRange);
        this._modelData.viewModel.revealRange('api', revealHorizontal, viewRange, verticalType, scrollType);
    }
    revealLine(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLineInCenter(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLineInCenterIfOutsideViewport(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLineNearTop(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLine(lineNumber, revealType, scrollType) {
        if (typeof lineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(lineNumber, 1, lineNumber, 1), revealType, false, scrollType);
    }
    revealPosition(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 0 /* VerticalRevealType.Simple */, true, scrollType);
    }
    revealPositionInCenter(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealPositionInCenterIfOutsideViewport(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealPositionNearTop(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    _revealPosition(position, verticalType, revealHorizontal, scrollType) {
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(position.lineNumber, position.column, position.lineNumber, position.column), verticalType, revealHorizontal, scrollType);
    }
    getSelection() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelection();
    }
    getSelections() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelections();
    }
    setSelection(something, source = 'api') {
        const isSelection = Selection.isISelection(something);
        const isRange = Range.isIRange(something);
        if (!isSelection && !isRange) {
            throw new Error('Invalid arguments');
        }
        if (isSelection) {
            this._setSelectionImpl(something, source);
        }
        else if (isRange) {
            // act as if it was an IRange
            const selection = {
                selectionStartLineNumber: something.startLineNumber,
                selectionStartColumn: something.startColumn,
                positionLineNumber: something.endLineNumber,
                positionColumn: something.endColumn,
            };
            this._setSelectionImpl(selection, source);
        }
    }
    _setSelectionImpl(sel, source) {
        if (!this._modelData) {
            return;
        }
        const selection = new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
        this._modelData.viewModel.setSelections(source, [selection]);
    }
    revealLines(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLinesInCenter(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLinesNearTop(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLines(startLineNumber, endLineNumber, verticalType, scrollType) {
        if (typeof startLineNumber !== 'number' || typeof endLineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(startLineNumber, 1, endLineNumber, 1), verticalType, false, scrollType);
    }
    revealRange(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */, revealVerticalInCenter = false, revealHorizontal = true) {
        this._revealRange(range, revealVerticalInCenter ? 1 /* VerticalRevealType.Center */ : 0 /* VerticalRevealType.Simple */, revealHorizontal, scrollType);
    }
    revealRangeInCenter(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealRangeInCenterIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealRangeNearTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    revealRangeNearTopIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 6 /* VerticalRevealType.NearTopIfOutsideViewport */, true, scrollType);
    }
    revealRangeAtTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 3 /* VerticalRevealType.Top */, true, scrollType);
    }
    _revealRange(range, verticalType, revealHorizontal, scrollType) {
        if (!Range.isIRange(range)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(Range.lift(range), verticalType, revealHorizontal, scrollType);
    }
    setSelections(ranges, source = 'api', reason = 0 /* CursorChangeReason.NotSet */) {
        if (!this._modelData) {
            return;
        }
        if (!ranges || ranges.length === 0) {
            throw new Error('Invalid arguments');
        }
        for (let i = 0, len = ranges.length; i < len; i++) {
            if (!Selection.isISelection(ranges[i])) {
                throw new Error('Invalid arguments');
            }
        }
        this._modelData.viewModel.setSelections(source, ranges, reason);
    }
    getContentWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentWidth();
    }
    getScrollWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollWidth();
    }
    getScrollLeft() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollLeft();
    }
    getContentHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentHeight();
    }
    getScrollHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollHeight();
    }
    getScrollTop() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollTop();
    }
    setScrollLeft(newScrollLeft, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollLeft !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollLeft: newScrollLeft,
        }, scrollType);
    }
    setScrollTop(newScrollTop, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollTop !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollTop: newScrollTop,
        }, scrollType);
    }
    setScrollPosition(position, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.viewLayout.setScrollPosition(position, scrollType);
    }
    hasPendingScrollAnimation() {
        if (!this._modelData) {
            return false;
        }
        return this._modelData.viewModel.viewLayout.hasPendingScrollAnimation();
    }
    saveViewState() {
        if (!this._modelData) {
            return null;
        }
        const contributionsState = this._contributions.saveViewState();
        const cursorState = this._modelData.viewModel.saveCursorState();
        const viewState = this._modelData.viewModel.saveState();
        return {
            cursorState: cursorState,
            viewState: viewState,
            contributionsState: contributionsState,
        };
    }
    restoreViewState(s) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        const codeEditorState = s;
        if (codeEditorState && codeEditorState.cursorState && codeEditorState.viewState) {
            const cursorState = codeEditorState.cursorState;
            if (Array.isArray(cursorState)) {
                if (cursorState.length > 0) {
                    this._modelData.viewModel.restoreCursorState(cursorState);
                }
            }
            else {
                // Backwards compatibility
                this._modelData.viewModel.restoreCursorState([cursorState]);
            }
            this._contributions.restoreViewState(codeEditorState.contributionsState || {});
            const reducedState = this._modelData.viewModel.reduceRestoreState(codeEditorState.viewState);
            this._modelData.view.restoreState(reducedState);
        }
    }
    handleInitialized() {
        this._getViewModel()?.visibleLinesStabilized();
    }
    onVisible() {
        this._modelData?.view.refreshFocusState();
    }
    onHide() {
        this._modelData?.view.refreshFocusState();
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
    getActions() {
        return Array.from(this._actions.values());
    }
    getSupportedActions() {
        let result = this.getActions();
        result = result.filter((action) => action.isSupported());
        return result;
    }
    getAction(id) {
        return this._actions.get(id) || null;
    }
    trigger(source, handlerId, payload) {
        payload = payload || {};
        try {
            this._onWillTriggerEditorOperationEvent.fire({
                source: source,
                handlerId: handlerId,
                payload: payload,
            });
            this._beginUpdate();
            switch (handlerId) {
                case "compositionStart" /* editorCommon.Handler.CompositionStart */:
                    this._startComposition();
                    return;
                case "compositionEnd" /* editorCommon.Handler.CompositionEnd */:
                    this._endComposition(source);
                    return;
                case "type" /* editorCommon.Handler.Type */: {
                    const args = payload;
                    this._type(source, args.text || '');
                    return;
                }
                case "replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replaceCharCnt || 0, 0, 0);
                    return;
                }
                case "compositionType" /* editorCommon.Handler.CompositionType */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replacePrevCharCnt || 0, args.replaceNextCharCnt || 0, args.positionDelta || 0);
                    return;
                }
                case "paste" /* editorCommon.Handler.Paste */: {
                    const args = payload;
                    this._paste(source, args.text || '', args.pasteOnNewLine || false, args.multicursorText || null, args.mode || null, args.clipboardEvent);
                    return;
                }
                case "cut" /* editorCommon.Handler.Cut */:
                    this._cut(source);
                    return;
            }
            const action = this.getAction(handlerId);
            if (action) {
                Promise.resolve(action.run(payload)).then(undefined, onUnexpectedError);
                return;
            }
            if (!this._modelData) {
                return;
            }
            if (this._triggerEditorCommand(source, handlerId, payload)) {
                return;
            }
            this._triggerCommand(handlerId, payload);
        }
        finally {
            this._endUpdate();
        }
    }
    _triggerCommand(handlerId, payload) {
        this._commandService.executeCommand(handlerId, payload);
    }
    _startComposition() {
        if (!this._modelData) {
            return;
        }
        this.inComposition = true;
        this._modelData.viewModel.startComposition();
        this._onDidCompositionStart.fire();
    }
    _endComposition(source) {
        if (!this._modelData) {
            return;
        }
        this.inComposition = false;
        this._modelData.viewModel.endComposition(source);
        this._onDidCompositionEnd.fire();
    }
    _type(source, text) {
        if (!this._modelData || text.length === 0) {
            return;
        }
        if (source === 'keyboard') {
            this._onWillType.fire(text);
        }
        this._modelData.viewModel.type(text, source);
        if (source === 'keyboard') {
            this._onDidType.fire(text);
        }
    }
    _compositionType(source, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source);
    }
    _paste(source, text, pasteOnNewLine, multicursorText, mode, clipboardEvent) {
        if (!this._modelData) {
            return;
        }
        const viewModel = this._modelData.viewModel;
        const startPosition = viewModel.getSelection().getStartPosition();
        viewModel.paste(text, pasteOnNewLine, multicursorText, source);
        const endPosition = viewModel.getSelection().getStartPosition();
        if (source === 'keyboard') {
            this._onDidPaste.fire({
                clipboardEvent,
                range: new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column),
                languageId: mode,
            });
        }
    }
    _cut(source) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.cut(source);
    }
    _triggerEditorCommand(source, handlerId, payload) {
        const command = EditorExtensionsRegistry.getEditorCommand(handlerId);
        if (command) {
            payload = payload || {};
            payload.source = source;
            this._instantiationService.invokeFunction((accessor) => {
                Promise.resolve(command.runEditorCommand(accessor, this, payload)).then(undefined, onUnexpectedError);
            });
            return true;
        }
        return false;
    }
    _getViewModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel;
    }
    pushUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.pushStackElement();
        return true;
    }
    popUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.popStackElement();
        return true;
    }
    executeEdits(source, edits, endCursorState) {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        let cursorStateComputer;
        if (!endCursorState) {
            cursorStateComputer = () => null;
        }
        else if (Array.isArray(endCursorState)) {
            cursorStateComputer = () => endCursorState;
        }
        else {
            cursorStateComputer = endCursorState;
        }
        this._onBeforeExecuteEdit.fire({ source: source ?? undefined });
        this._modelData.viewModel.executeEdits(source, edits, cursorStateComputer);
        return true;
    }
    executeCommand(source, command) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommand(command, source);
    }
    executeCommands(source, commands) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommands(commands, source);
    }
    createDecorationsCollection(decorations) {
        return new EditorDecorationsCollection(this, decorations);
    }
    changeDecorations(callback) {
        if (!this._modelData) {
            // callback will not be called
            return null;
        }
        return this._modelData.model.changeDecorations(callback, this._id);
    }
    getLineDecorations(lineNumber) {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model.getLineDecorations(lineNumber, this._id, filterValidationDecorations(this._configuration.options));
    }
    getDecorationsInRange(range) {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model.getDecorationsInRange(range, this._id, filterValidationDecorations(this._configuration.options));
    }
    /**
     * @deprecated
     */
    deltaDecorations(oldDecorations, newDecorations) {
        if (!this._modelData) {
            return [];
        }
        if (oldDecorations.length === 0 && newDecorations.length === 0) {
            return oldDecorations;
        }
        return this._modelData.model.deltaDecorations(oldDecorations, newDecorations, this._id);
    }
    removeDecorations(decorationIds) {
        if (!this._modelData || decorationIds.length === 0) {
            return;
        }
        this._modelData.model.changeDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(decorationIds, []);
        });
    }
    setDecorationsByType(description, decorationTypeKey, decorationOptions) {
        const newDecorationsSubTypes = {};
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        this._decorationTypeSubtypes[decorationTypeKey] = newDecorationsSubTypes;
        const newModelDecorations = [];
        for (const decorationOption of decorationOptions) {
            let typeKey = decorationTypeKey;
            if (decorationOption.renderOptions) {
                // identify custom render options by a hash code over all keys and values
                // For custom render options register a decoration type if necessary
                const subType = hash(decorationOption.renderOptions).toString(16);
                // The fact that `decorationTypeKey` appears in the typeKey has no influence
                // it is just a mechanism to get predictable and unique keys (repeatable for the same options and unique across clients)
                typeKey = decorationTypeKey + '-' + subType;
                if (!oldDecorationsSubTypes[subType] && !newDecorationsSubTypes[subType]) {
                    // decoration type did not exist before, register new one
                    this._registerDecorationType(description, typeKey, decorationOption.renderOptions, decorationTypeKey);
                }
                newDecorationsSubTypes[subType] = true;
            }
            const opts = this._resolveDecorationOptions(typeKey, !!decorationOption.hoverMessage);
            if (decorationOption.hoverMessage) {
                opts.hoverMessage = decorationOption.hoverMessage;
            }
            newModelDecorations.push({ range: decorationOption.range, options: opts });
        }
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        for (const subType in oldDecorationsSubTypes) {
            if (!newDecorationsSubTypes[subType]) {
                this._removeDecorationType(decorationTypeKey + '-' + subType);
            }
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations((accessor) => (this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations)));
    }
    setDecorationsByTypeFast(decorationTypeKey, ranges) {
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        for (const subType in oldDecorationsSubTypes) {
            this._removeDecorationType(decorationTypeKey + '-' + subType);
        }
        this._decorationTypeSubtypes[decorationTypeKey] = {};
        const opts = ModelDecorationOptions.createDynamic(this._resolveDecorationOptions(decorationTypeKey, false));
        const newModelDecorations = new Array(ranges.length);
        for (let i = 0, len = ranges.length; i < len; i++) {
            newModelDecorations[i] = { range: ranges[i], options: opts };
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations((accessor) => (this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations)));
    }
    removeDecorationsByType(decorationTypeKey) {
        // remove decorations for type and sub type
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey];
        if (oldDecorationsIds) {
            this.changeDecorations((accessor) => accessor.deltaDecorations(oldDecorationsIds, []));
        }
        if (this._decorationTypeKeysToIds.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeKeysToIds[decorationTypeKey];
        }
        if (this._decorationTypeSubtypes.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeSubtypes[decorationTypeKey];
        }
    }
    getLayoutInfo() {
        const options = this._configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        return layoutInfo;
    }
    createOverviewRuler(cssClassName) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.createOverviewRuler(cssClassName);
    }
    getContainerDomNode() {
        return this._domElement;
    }
    getDomNode() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.domNode.domNode;
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    layout(dimension, postponeRendering = false) {
        this._configuration.observeContainer(dimension);
        if (!postponeRendering) {
            this.render();
        }
    }
    focus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.focus();
    }
    hasTextFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isFocused();
    }
    hasWidgetFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isWidgetFocused();
    }
    addContentWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition(),
        };
        if (this._contentWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a content widget with the same id:' + widget.getId());
        }
        this._contentWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addContentWidget(widgetData);
        }
    }
    layoutContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutContentWidget(widgetData);
            }
        }
    }
    removeContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            delete this._contentWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeContentWidget(widgetData);
            }
        }
    }
    addOverlayWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition(),
        };
        if (this._overlayWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting an overlay widget with the same id.');
        }
        this._overlayWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addOverlayWidget(widgetData);
        }
    }
    layoutOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutOverlayWidget(widgetData);
            }
        }
    }
    removeOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            delete this._overlayWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeOverlayWidget(widgetData);
            }
        }
    }
    addGlyphMarginWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition(),
        };
        if (this._glyphMarginWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a glyph margin widget with the same id.');
        }
        this._glyphMarginWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addGlyphMarginWidget(widgetData);
        }
    }
    layoutGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutGlyphMarginWidget(widgetData);
            }
        }
    }
    removeGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            delete this._glyphMarginWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeGlyphMarginWidget(widgetData);
            }
        }
    }
    changeViewZones(callback) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.change(callback);
    }
    getTargetAtClientPoint(clientX, clientY) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.getTargetAtClientPoint(clientX, clientY);
    }
    getScrolledVisiblePosition(rawPosition) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const options = this._configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const top = CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, position.lineNumber, position.column) - this.getScrollTop();
        const left = this._modelData.view.getOffsetForColumn(position.lineNumber, position.column) +
            layoutInfo.glyphMarginWidth +
            layoutInfo.lineNumbersWidth +
            layoutInfo.decorationsWidth -
            this.getScrollLeft();
        return {
            top: top,
            left: left,
            height: options.get(68 /* EditorOption.lineHeight */),
        };
    }
    getOffsetForColumn(lineNumber, column) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return -1;
        }
        return this._modelData.view.getOffsetForColumn(lineNumber, column);
    }
    render(forceRedraw = false) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.viewModel.batchEvents(() => {
            this._modelData.view.render(true, forceRedraw);
        });
    }
    setAriaOptions(options) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.setAriaOptions(options);
    }
    applyFontInfo(target) {
        applyFontInfo(target, this._configuration.options.get(52 /* EditorOption.fontInfo */));
    }
    setBanner(domNode, domNodeHeight) {
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        this._bannerDomNode = domNode;
        this._configuration.setReservedHeight(domNode ? domNodeHeight : 0);
        if (this._bannerDomNode) {
            this._domElement.prepend(this._bannerDomNode);
        }
    }
    _attachModel(model) {
        if (!model) {
            this._modelData = null;
            return;
        }
        const listenersToRemove = [];
        this._domElement.setAttribute('data-mode-id', model.getLanguageId());
        this._configuration.setIsDominatedByLongLines(model.isDominatedByLongLines());
        this._configuration.setModelLineCount(model.getLineCount());
        const attachedView = model.onBeforeAttached();
        const viewModel = new ViewModel(this._id, this._configuration, model, DOMLineBreaksComputerFactory.create(dom.getWindow(this._domElement)), MonospaceLineBreaksComputerFactory.create(this._configuration.options), (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(this._domElement), callback), this.languageConfigurationService, this._themeService, attachedView, {
            batchChanges: (cb) => {
                try {
                    this._beginUpdate();
                    return cb();
                }
                finally {
                    this._endUpdate();
                }
            },
        });
        // Someone might destroy the model from under the editor, so prevent any exceptions by setting a null model
        listenersToRemove.push(model.onWillDispose(() => this.setModel(null)));
        listenersToRemove.push(viewModel.onEvent((e) => {
            switch (e.kind) {
                case 0 /* OutgoingViewModelEventKind.ContentSizeChanged */:
                    this._onDidContentSizeChange.fire(e);
                    break;
                case 1 /* OutgoingViewModelEventKind.FocusChanged */:
                    this._editorTextFocus.setValue(e.hasFocus);
                    break;
                case 2 /* OutgoingViewModelEventKind.WidgetFocusChanged */:
                    this._editorWidgetFocus.setValue(e.hasFocus);
                    break;
                case 3 /* OutgoingViewModelEventKind.ScrollChanged */:
                    this._onDidScrollChange.fire(e);
                    break;
                case 4 /* OutgoingViewModelEventKind.ViewZonesChanged */:
                    this._onDidChangeViewZones.fire();
                    break;
                case 5 /* OutgoingViewModelEventKind.HiddenAreasChanged */:
                    this._onDidChangeHiddenAreas.fire();
                    break;
                case 6 /* OutgoingViewModelEventKind.ReadOnlyEditAttempt */:
                    this._onDidAttemptReadOnlyEdit.fire();
                    break;
                case 7 /* OutgoingViewModelEventKind.CursorStateChanged */: {
                    if (e.reachedMaxCursorCount) {
                        const multiCursorLimit = this.getOption(81 /* EditorOption.multiCursorLimit */);
                        const message = nls.localize('cursors.maximum', 'The number of cursors has been limited to {0}. Consider using [find and replace](https://code.visualstudio.com/docs/editor/codebasics#_find-and-replace) for larger changes or increase the editor multi cursor limit setting.', multiCursorLimit);
                        this._notificationService.prompt(Severity.Warning, message, [
                            {
                                label: 'Find and Replace',
                                run: () => {
                                    this._commandService.executeCommand('editor.action.startFindReplaceAction');
                                },
                            },
                            {
                                label: nls.localize('goToSetting', 'Increase Multi Cursor Limit'),
                                run: () => {
                                    this._commandService.executeCommand('workbench.action.openSettings2', {
                                        query: 'editor.multiCursorLimit',
                                    });
                                },
                            },
                        ]);
                    }
                    const positions = [];
                    for (let i = 0, len = e.selections.length; i < len; i++) {
                        positions[i] = e.selections[i].getPosition();
                    }
                    const e1 = {
                        position: positions[0],
                        secondaryPositions: positions.slice(1),
                        reason: e.reason,
                        source: e.source,
                    };
                    this._onDidChangeCursorPosition.fire(e1);
                    const e2 = {
                        selection: e.selections[0],
                        secondarySelections: e.selections.slice(1),
                        modelVersionId: e.modelVersionId,
                        oldSelections: e.oldSelections,
                        oldModelVersionId: e.oldModelVersionId,
                        source: e.source,
                        reason: e.reason,
                    };
                    this._onDidChangeCursorSelection.fire(e2);
                    break;
                }
                case 8 /* OutgoingViewModelEventKind.ModelDecorationsChanged */:
                    this._onDidChangeModelDecorations.fire(e.event);
                    break;
                case 9 /* OutgoingViewModelEventKind.ModelLanguageChanged */:
                    this._domElement.setAttribute('data-mode-id', model.getLanguageId());
                    this._onDidChangeModelLanguage.fire(e.event);
                    break;
                case 10 /* OutgoingViewModelEventKind.ModelLanguageConfigurationChanged */:
                    this._onDidChangeModelLanguageConfiguration.fire(e.event);
                    break;
                case 11 /* OutgoingViewModelEventKind.ModelContentChanged */:
                    this._onDidChangeModelContent.fire(e.event);
                    break;
                case 12 /* OutgoingViewModelEventKind.ModelOptionsChanged */:
                    this._onDidChangeModelOptions.fire(e.event);
                    break;
                case 13 /* OutgoingViewModelEventKind.ModelTokensChanged */:
                    this._onDidChangeModelTokens.fire(e.event);
                    break;
            }
        }));
        const [view, hasRealView] = this._createView(viewModel);
        if (hasRealView) {
            this._domElement.appendChild(view.domNode.domNode);
            let keys = Object.keys(this._contentWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addContentWidget(this._contentWidgets[widgetId]);
            }
            keys = Object.keys(this._overlayWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addOverlayWidget(this._overlayWidgets[widgetId]);
            }
            keys = Object.keys(this._glyphMarginWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addGlyphMarginWidget(this._glyphMarginWidgets[widgetId]);
            }
            view.render(false, true);
            view.domNode.domNode.setAttribute('data-uri', model.uri.toString());
        }
        this._modelData = new ModelData(model, viewModel, view, hasRealView, listenersToRemove, attachedView);
    }
    _createView(viewModel) {
        let commandDelegate;
        if (this.isSimpleWidget) {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    this._paste('keyboard', text, pasteOnNewLine, multicursorText, mode);
                },
                type: (text) => {
                    this._type('keyboard', text);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    this._compositionType('keyboard', text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
                },
                startComposition: () => {
                    this._startComposition();
                },
                endComposition: () => {
                    this._endComposition('keyboard');
                },
                cut: () => {
                    this._cut('keyboard');
                },
            };
        }
        else {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    const payload = {
                        text,
                        pasteOnNewLine,
                        multicursorText,
                        mode,
                    };
                    this._commandService.executeCommand("paste" /* editorCommon.Handler.Paste */, payload);
                },
                type: (text) => {
                    const payload = { text };
                    this._commandService.executeCommand("type" /* editorCommon.Handler.Type */, payload);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    // Try if possible to go through the existing `replacePreviousChar` command
                    if (replaceNextCharCnt || positionDelta) {
                        // must be handled through the new command
                        const payload = {
                            text,
                            replacePrevCharCnt,
                            replaceNextCharCnt,
                            positionDelta,
                        };
                        this._commandService.executeCommand("compositionType" /* editorCommon.Handler.CompositionType */, payload);
                    }
                    else {
                        const payload = {
                            text,
                            replaceCharCnt: replacePrevCharCnt,
                        };
                        this._commandService.executeCommand("replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */, payload);
                    }
                },
                startComposition: () => {
                    this._commandService.executeCommand("compositionStart" /* editorCommon.Handler.CompositionStart */, {});
                },
                endComposition: () => {
                    this._commandService.executeCommand("compositionEnd" /* editorCommon.Handler.CompositionEnd */, {});
                },
                cut: () => {
                    this._commandService.executeCommand("cut" /* editorCommon.Handler.Cut */, {});
                },
            };
        }
        const viewUserInputEvents = new ViewUserInputEvents(viewModel.coordinatesConverter);
        viewUserInputEvents.onKeyDown = (e) => this._onKeyDown.fire(e);
        viewUserInputEvents.onKeyUp = (e) => this._onKeyUp.fire(e);
        viewUserInputEvents.onContextMenu = (e) => this._onContextMenu.fire(e);
        viewUserInputEvents.onMouseMove = (e) => this._onMouseMove.fire(e);
        viewUserInputEvents.onMouseLeave = (e) => this._onMouseLeave.fire(e);
        viewUserInputEvents.onMouseDown = (e) => this._onMouseDown.fire(e);
        viewUserInputEvents.onMouseUp = (e) => this._onMouseUp.fire(e);
        viewUserInputEvents.onMouseDrag = (e) => this._onMouseDrag.fire(e);
        viewUserInputEvents.onMouseDrop = (e) => this._onMouseDrop.fire(e);
        viewUserInputEvents.onMouseDropCanceled = (e) => this._onMouseDropCanceled.fire(e);
        viewUserInputEvents.onMouseWheel = (e) => this._onMouseWheel.fire(e);
        const view = new View(this._domElement, this.getId(), commandDelegate, this._configuration, this._themeService.getColorTheme(), viewModel, viewUserInputEvents, this._overflowWidgetsDomNode, this._instantiationService);
        return [view, true];
    }
    _postDetachModelCleanup(detachedModel) {
        detachedModel?.removeAllDecorationsWithOwnerId(this._id);
    }
    _detachModel() {
        this._contributionsDisposable?.dispose();
        this._contributionsDisposable = undefined;
        if (!this._modelData) {
            return null;
        }
        const model = this._modelData.model;
        const removeDomNode = this._modelData.hasRealView ? this._modelData.view.domNode.domNode : null;
        this._modelData.dispose();
        this._modelData = null;
        this._domElement.removeAttribute('data-mode-id');
        if (removeDomNode && this._domElement.contains(removeDomNode)) {
            removeDomNode.remove();
        }
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        return model;
    }
    _registerDecorationType(description, key, options, parentTypeKey) {
        this._codeEditorService.registerDecorationType(description, key, options, parentTypeKey, this);
    }
    _removeDecorationType(key) {
        this._codeEditorService.removeDecorationType(key);
    }
    _resolveDecorationOptions(typeKey, writable) {
        return this._codeEditorService.resolveDecorationOptions(typeKey, writable);
    }
    getTelemetryData() {
        return this._telemetryData;
    }
    hasModel() {
        return this._modelData !== null;
    }
    showDropIndicatorAt(position) {
        const newDecorations = [
            {
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
                options: CodeEditorWidget_1.dropIntoEditorDecorationOptions,
            },
        ];
        this._dropIntoEditorDecorations.set(newDecorations);
        this.revealPosition(position, 1 /* editorCommon.ScrollType.Immediate */);
    }
    removeDropIndicator() {
        this._dropIntoEditorDecorations.clear();
    }
    setContextValue(key, value) {
        this._contextKeyService.createKey(key, value);
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            this._onBeginUpdate.fire();
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._onEndUpdate.fire();
        }
    }
};
CodeEditorWidget = CodeEditorWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ICodeEditorService),
    __param(5, ICommandService),
    __param(6, IContextKeyService),
    __param(7, IThemeService),
    __param(8, INotificationService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageConfigurationService),
    __param(11, ILanguageFeaturesService)
], CodeEditorWidget);
export { CodeEditorWidget };
let EDITOR_ID = 0;
class ModelData {
    constructor(model, viewModel, view, hasRealView, listenersToRemove, attachedView) {
        this.model = model;
        this.viewModel = viewModel;
        this.view = view;
        this.hasRealView = hasRealView;
        this.listenersToRemove = listenersToRemove;
        this.attachedView = attachedView;
    }
    dispose() {
        dispose(this.listenersToRemove);
        this.model.onBeforeDetached(this.attachedView);
        if (this.hasRealView) {
            this.view.dispose();
        }
        this.viewModel.dispose();
    }
}
var BooleanEventValue;
(function (BooleanEventValue) {
    BooleanEventValue[BooleanEventValue["NotSet"] = 0] = "NotSet";
    BooleanEventValue[BooleanEventValue["False"] = 1] = "False";
    BooleanEventValue[BooleanEventValue["True"] = 2] = "True";
})(BooleanEventValue || (BooleanEventValue = {}));
export class BooleanEventEmitter extends Disposable {
    constructor(_emitterOptions) {
        super();
        this._emitterOptions = _emitterOptions;
        this._onDidChangeToTrue = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToTrue = this._onDidChangeToTrue.event;
        this._onDidChangeToFalse = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToFalse = this._onDidChangeToFalse.event;
        this._value = 0 /* BooleanEventValue.NotSet */;
    }
    setValue(_value) {
        const value = _value ? 2 /* BooleanEventValue.True */ : 1 /* BooleanEventValue.False */;
        if (this._value === value) {
            return;
        }
        this._value = value;
        if (this._value === 2 /* BooleanEventValue.True */) {
            this._onDidChangeToTrue.fire();
        }
        else if (this._value === 1 /* BooleanEventValue.False */) {
            this._onDidChangeToFalse.fire();
        }
    }
}
/**
 * A regular event emitter that also makes sure contributions are instantiated if necessary
 */
class InteractionEmitter extends Emitter {
    constructor(_contributions, deliveryQueue) {
        super({ deliveryQueue });
        this._contributions = _contributions;
    }
    fire(event) {
        this._contributions.onBeforeInteractionEvent();
        super.fire(event);
    }
}
class EditorContextKeysManager extends Disposable {
    constructor(editor, contextKeyService) {
        super();
        this._editor = editor;
        contextKeyService.createKey('editorId', editor.getId());
        this._editorSimpleInput = EditorContextKeys.editorSimpleInput.bindTo(contextKeyService);
        this._editorFocus = EditorContextKeys.focus.bindTo(contextKeyService);
        this._textInputFocus = EditorContextKeys.textInputFocus.bindTo(contextKeyService);
        this._editorTextFocus = EditorContextKeys.editorTextFocus.bindTo(contextKeyService);
        this._tabMovesFocus = EditorContextKeys.tabMovesFocus.bindTo(contextKeyService);
        this._editorReadonly = EditorContextKeys.readOnly.bindTo(contextKeyService);
        this._inDiffEditor = EditorContextKeys.inDiffEditor.bindTo(contextKeyService);
        this._editorColumnSelection = EditorContextKeys.columnSelection.bindTo(contextKeyService);
        this._hasMultipleSelections = EditorContextKeys.hasMultipleSelections.bindTo(contextKeyService);
        this._hasNonEmptySelection = EditorContextKeys.hasNonEmptySelection.bindTo(contextKeyService);
        this._canUndo = EditorContextKeys.canUndo.bindTo(contextKeyService);
        this._canRedo = EditorContextKeys.canRedo.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromConfig()));
        this._register(this._editor.onDidChangeCursorSelection(() => this._updateFromSelection()));
        this._register(this._editor.onDidFocusEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidFocusEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidChangeModel(() => this._updateFromModel()));
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromModel()));
        this._register(TabFocus.onDidChangeTabFocus((tabFocusMode) => this._tabMovesFocus.set(tabFocusMode)));
        this._updateFromConfig();
        this._updateFromSelection();
        this._updateFromFocus();
        this._updateFromModel();
        this._editorSimpleInput.set(this._editor.isSimpleWidget);
    }
    _updateFromConfig() {
        const options = this._editor.getOptions();
        this._tabMovesFocus.set(TabFocus.getTabFocusMode());
        this._editorReadonly.set(options.get(96 /* EditorOption.readOnly */));
        this._inDiffEditor.set(options.get(63 /* EditorOption.inDiffEditor */));
        this._editorColumnSelection.set(options.get(22 /* EditorOption.columnSelection */));
    }
    _updateFromSelection() {
        const selections = this._editor.getSelections();
        if (!selections) {
            this._hasMultipleSelections.reset();
            this._hasNonEmptySelection.reset();
        }
        else {
            this._hasMultipleSelections.set(selections.length > 1);
            this._hasNonEmptySelection.set(selections.some((s) => !s.isEmpty()));
        }
    }
    _updateFromFocus() {
        this._editorFocus.set(this._editor.hasWidgetFocus() && !this._editor.isSimpleWidget);
        this._editorTextFocus.set(this._editor.hasTextFocus() && !this._editor.isSimpleWidget);
        this._textInputFocus.set(this._editor.hasTextFocus());
    }
    _updateFromModel() {
        const model = this._editor.getModel();
        this._canUndo.set(Boolean(model && model.canUndo()));
        this._canRedo.set(Boolean(model && model.canRedo()));
    }
}
export class EditorModeContext extends Disposable {
    constructor(_editor, _contextKeyService, _languageFeaturesService) {
        super();
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._languageFeaturesService = _languageFeaturesService;
        this._langId = EditorContextKeys.languageId.bindTo(_contextKeyService);
        this._hasCompletionItemProvider =
            EditorContextKeys.hasCompletionItemProvider.bindTo(_contextKeyService);
        this._hasCodeActionsProvider =
            EditorContextKeys.hasCodeActionsProvider.bindTo(_contextKeyService);
        this._hasCodeLensProvider = EditorContextKeys.hasCodeLensProvider.bindTo(_contextKeyService);
        this._hasDefinitionProvider = EditorContextKeys.hasDefinitionProvider.bindTo(_contextKeyService);
        this._hasDeclarationProvider =
            EditorContextKeys.hasDeclarationProvider.bindTo(_contextKeyService);
        this._hasImplementationProvider =
            EditorContextKeys.hasImplementationProvider.bindTo(_contextKeyService);
        this._hasTypeDefinitionProvider =
            EditorContextKeys.hasTypeDefinitionProvider.bindTo(_contextKeyService);
        this._hasHoverProvider = EditorContextKeys.hasHoverProvider.bindTo(_contextKeyService);
        this._hasDocumentHighlightProvider =
            EditorContextKeys.hasDocumentHighlightProvider.bindTo(_contextKeyService);
        this._hasDocumentSymbolProvider =
            EditorContextKeys.hasDocumentSymbolProvider.bindTo(_contextKeyService);
        this._hasReferenceProvider = EditorContextKeys.hasReferenceProvider.bindTo(_contextKeyService);
        this._hasRenameProvider = EditorContextKeys.hasRenameProvider.bindTo(_contextKeyService);
        this._hasSignatureHelpProvider =
            EditorContextKeys.hasSignatureHelpProvider.bindTo(_contextKeyService);
        this._hasInlayHintsProvider = EditorContextKeys.hasInlayHintsProvider.bindTo(_contextKeyService);
        this._hasDocumentFormattingProvider =
            EditorContextKeys.hasDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasDocumentSelectionFormattingProvider =
            EditorContextKeys.hasDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentFormattingProvider =
            EditorContextKeys.hasMultipleDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentSelectionFormattingProvider =
            EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._isInEmbeddedEditor = EditorContextKeys.isInEmbeddedEditor.bindTo(_contextKeyService);
        const update = () => this._update();
        // update when model/mode changes
        this._register(_editor.onDidChangeModel(update));
        this._register(_editor.onDidChangeModelLanguage(update));
        // update when registries change
        this._register(_languageFeaturesService.completionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeActionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeLensProvider.onDidChange(update));
        this._register(_languageFeaturesService.definitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.declarationProvider.onDidChange(update));
        this._register(_languageFeaturesService.implementationProvider.onDidChange(update));
        this._register(_languageFeaturesService.typeDefinitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.hoverProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentHighlightProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentSymbolProvider.onDidChange(update));
        this._register(_languageFeaturesService.referenceProvider.onDidChange(update));
        this._register(_languageFeaturesService.renameProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.signatureHelpProvider.onDidChange(update));
        this._register(_languageFeaturesService.inlayHintsProvider.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    reset() {
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.reset();
            this._hasCompletionItemProvider.reset();
            this._hasCodeActionsProvider.reset();
            this._hasCodeLensProvider.reset();
            this._hasDefinitionProvider.reset();
            this._hasDeclarationProvider.reset();
            this._hasImplementationProvider.reset();
            this._hasTypeDefinitionProvider.reset();
            this._hasHoverProvider.reset();
            this._hasDocumentHighlightProvider.reset();
            this._hasDocumentSymbolProvider.reset();
            this._hasReferenceProvider.reset();
            this._hasRenameProvider.reset();
            this._hasDocumentFormattingProvider.reset();
            this._hasDocumentSelectionFormattingProvider.reset();
            this._hasSignatureHelpProvider.reset();
            this._isInEmbeddedEditor.reset();
        });
    }
    _update() {
        const model = this._editor.getModel();
        if (!model) {
            this.reset();
            return;
        }
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.set(model.getLanguageId());
            this._hasCompletionItemProvider.set(this._languageFeaturesService.completionProvider.has(model));
            this._hasCodeActionsProvider.set(this._languageFeaturesService.codeActionProvider.has(model));
            this._hasCodeLensProvider.set(this._languageFeaturesService.codeLensProvider.has(model));
            this._hasDefinitionProvider.set(this._languageFeaturesService.definitionProvider.has(model));
            this._hasDeclarationProvider.set(this._languageFeaturesService.declarationProvider.has(model));
            this._hasImplementationProvider.set(this._languageFeaturesService.implementationProvider.has(model));
            this._hasTypeDefinitionProvider.set(this._languageFeaturesService.typeDefinitionProvider.has(model));
            this._hasHoverProvider.set(this._languageFeaturesService.hoverProvider.has(model));
            this._hasDocumentHighlightProvider.set(this._languageFeaturesService.documentHighlightProvider.has(model));
            this._hasDocumentSymbolProvider.set(this._languageFeaturesService.documentSymbolProvider.has(model));
            this._hasReferenceProvider.set(this._languageFeaturesService.referenceProvider.has(model));
            this._hasRenameProvider.set(this._languageFeaturesService.renameProvider.has(model));
            this._hasSignatureHelpProvider.set(this._languageFeaturesService.signatureHelpProvider.has(model));
            this._hasInlayHintsProvider.set(this._languageFeaturesService.inlayHintsProvider.has(model));
            this._hasDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.has(model) ||
                this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasMultipleDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.all(model).length +
                this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length >
                1);
            this._hasMultipleDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._isInEmbeddedEditor.set(model.uri.scheme === Schemas.walkThroughSnippet ||
                model.uri.scheme === Schemas.vscodeChatCodeBlock);
        });
    }
}
class EditorDecorationsCollection {
    get length() {
        return this._decorationIds.length;
    }
    constructor(_editor, decorations) {
        this._editor = _editor;
        this._decorationIds = [];
        this._isChangingDecorations = false;
        if (Array.isArray(decorations) && decorations.length > 0) {
            this.set(decorations);
        }
    }
    onDidChange(listener, thisArgs, disposables) {
        return this._editor.onDidChangeModelDecorations((e) => {
            if (this._isChangingDecorations) {
                return;
            }
            listener.call(thisArgs, e);
        }, disposables);
    }
    getRange(index) {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (index >= this._decorationIds.length) {
            return null;
        }
        return this._editor.getModel().getDecorationRange(this._decorationIds[index]);
    }
    getRanges() {
        if (!this._editor.hasModel()) {
            return [];
        }
        const model = this._editor.getModel();
        const result = [];
        for (const decorationId of this._decorationIds) {
            const range = model.getDecorationRange(decorationId);
            if (range) {
                result.push(range);
            }
        }
        return result;
    }
    has(decoration) {
        return this._decorationIds.includes(decoration.id);
    }
    clear() {
        if (this._decorationIds.length === 0) {
            // nothing to do
            return;
        }
        this.set([]);
    }
    set(newDecorations) {
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                this._decorationIds = accessor.deltaDecorations(this._decorationIds, newDecorations);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return this._decorationIds;
    }
    append(newDecorations) {
        let newDecorationIds = [];
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                newDecorationIds = accessor.deltaDecorations([], newDecorations);
                this._decorationIds = this._decorationIds.concat(newDecorationIds);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return newDecorationIds;
    }
}
const squigglyStart = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'><g fill='`);
const squigglyEnd = encodeURIComponent(`'><polygon points='5.5,0 2.5,3 1.1,3 4.1,0'/><polygon points='4,0 6,2 6,0.6 5.4,0'/><polygon points='0,2 1,3 2.4,3 0,0.6'/></g></svg>`);
function getSquigglySVGData(color) {
    return squigglyStart + encodeURIComponent(color.toString()) + squigglyEnd;
}
const dotdotdotStart = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" height="3" width="12"><g fill="`);
const dotdotdotEnd = encodeURIComponent(`"><circle cx="1" cy="1" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="9" cy="1" r="1"/></g></svg>`);
function getDotDotDotSVGData(color) {
    return dotdotdotStart + encodeURIComponent(color.toString()) + dotdotdotEnd;
}
registerThemingParticipant((theme, collector) => {
    const errorForeground = theme.getColor(editorErrorForeground);
    if (errorForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-error" /* ClassName.EditorErrorDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-error-decoration: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}"); }`);
    }
    const warningForeground = theme.getColor(editorWarningForeground);
    if (warningForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-warning" /* ClassName.EditorWarningDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-warning-decoration: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}"); }`);
    }
    const infoForeground = theme.getColor(editorInfoForeground);
    if (infoForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-info" /* ClassName.EditorInfoDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-info-decoration: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}"); }`);
    }
    const hintForeground = theme.getColor(editorHintForeground);
    if (hintForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-hint" /* ClassName.EditorHintDecoration */} { background: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}") no-repeat bottom left; }`);
        collector.addRule(`:root { --monaco-editor-hint-decoration: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}"); }`);
    }
    const unnecessaryForeground = theme.getColor(editorUnnecessaryCodeOpacity);
    if (unnecessaryForeground) {
        collector.addRule(`.monaco-editor.showUnused .${"squiggly-inline-unnecessary" /* ClassName.EditorUnnecessaryInlineDecoration */} { opacity: ${unnecessaryForeground.rgba.a}; }`);
        collector.addRule(`:root { --monaco-editor-unnecessary-decoration-opacity: ${unnecessaryForeground.rgba.a}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9jb2RlRWRpdG9yL2NvZGVFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUl0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sT0FBTyxFQUlQLHdCQUF3QixHQUN4QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sVUFBVSxFQUdWLE9BQU8sR0FDUCxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDM0QsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsd0JBQXdCLEVBQWtDLE1BQU0sMkJBQTJCLENBQUE7QUFDcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFrRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDcEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFD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