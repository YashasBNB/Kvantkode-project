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
var MergeEditor_1, MergeEditorLayoutStore_1;
import { reset } from '../../../../../base/browser/dom.js';
import { SerializableGrid, } from '../../../../../base/browser/ui/grid/grid.js';
import { Color } from '../../../../../base/common/color.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, thenIfNotDisposed, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, observableValue, transaction, } from '../../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { isDefined } from '../../../../../base/common/types.js';
import './media/mergeEditor.css';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { AbstractTextEditor } from '../../../../browser/parts/editor/textEditor.js';
import { DEFAULT_EDITOR_ASSOCIATION, } from '../../../../common/editor.js';
import { applyTextEditorOptions } from '../../../../common/editor/editorOptions.js';
import { readTransientState, writeTransientState, } from '../../../codeEditor/browser/toggleWordWrap.js';
import { MergeEditorInput } from '../mergeEditorInput.js';
import { deepMerge, PersistentStore } from '../utils.js';
import { BaseCodeEditorView } from './editors/baseCodeEditorView.js';
import { ScrollSynchronizer } from './scrollSynchronizer.js';
import { MergeEditorViewModel } from './viewModel.js';
import { ViewZoneComputer } from './viewZones.js';
import { ctxIsMergeEditor, ctxMergeBaseUri, ctxMergeEditorLayout, ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop, ctxMergeEditorShowNonConflictingChanges, ctxMergeResultUri, } from '../../common/mergeEditor.js';
import { settingsSashBorder } from '../../../preferences/common/settingsEditorColorRegistry.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import './colors.js';
import { InputCodeEditorView } from './editors/inputCodeEditorView.js';
import { ResultCodeEditorView } from './editors/resultCodeEditorView.js';
let MergeEditor = class MergeEditor extends AbstractTextEditor {
    static { MergeEditor_1 = this; }
    static { this.ID = 'mergeEditor'; }
    get viewModel() {
        return this._viewModel;
    }
    get inputModel() {
        return this._inputModel;
    }
    get model() {
        return this.inputModel.get()?.model;
    }
    constructor(group, instantiation, contextKeyService, telemetryService, storageService, themeService, textResourceConfigurationService, editorService, editorGroupService, fileService, _codeEditorService) {
        super(MergeEditor_1.ID, group, telemetryService, instantiation, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService);
        this.contextKeyService = contextKeyService;
        this._codeEditorService = _codeEditorService;
        this._sessionDisposables = new DisposableStore();
        this._viewModel = observableValue(this, undefined);
        this._grid = this._register(new MutableDisposable());
        this.input1View = this._register(this.instantiationService.createInstance(InputCodeEditorView, 1, this._viewModel));
        this.baseView = observableValue(this, undefined);
        this.baseViewOptions = observableValue(this, undefined);
        this.input2View = this._register(this.instantiationService.createInstance(InputCodeEditorView, 2, this._viewModel));
        this.inputResultView = this._register(this.instantiationService.createInstance(ResultCodeEditorView, this._viewModel));
        this._layoutMode = this.instantiationService.createInstance(MergeEditorLayoutStore);
        this._layoutModeObs = observableValue(this, this._layoutMode.value);
        this._ctxIsMergeEditor = ctxIsMergeEditor.bindTo(this.contextKeyService);
        this._ctxUsesColumnLayout = ctxMergeEditorLayout.bindTo(this.contextKeyService);
        this._ctxShowBase = ctxMergeEditorShowBase.bindTo(this.contextKeyService);
        this._ctxShowBaseAtTop = ctxMergeEditorShowBaseAtTop.bindTo(this.contextKeyService);
        this._ctxResultUri = ctxMergeResultUri.bindTo(this.contextKeyService);
        this._ctxBaseUri = ctxMergeBaseUri.bindTo(this.contextKeyService);
        this._ctxShowNonConflictingChanges = ctxMergeEditorShowNonConflictingChanges.bindTo(this.contextKeyService);
        this._inputModel = observableValue(this, undefined);
        this.viewZoneComputer = new ViewZoneComputer(this.input1View.editor, this.input2View.editor, this.inputResultView.editor);
        this.scrollSynchronizer = this._register(new ScrollSynchronizer(this._viewModel, this.input1View, this.input2View, this.baseView, this.inputResultView, this._layoutModeObs));
        // #region layout constraints
        this._onDidChangeSizeConstraints = new Emitter();
        this.onDidChangeSizeConstraints = this._onDidChangeSizeConstraints.event;
        this.baseViewDisposables = this._register(new DisposableStore());
        this.showNonConflictingChangesStore = this.instantiationService.createInstance((PersistentStore), 'mergeEditor/showNonConflictingChanges');
        this.showNonConflictingChanges = observableValue(this, this.showNonConflictingChangesStore.get() ?? false);
    }
    dispose() {
        this._sessionDisposables.dispose();
        this._ctxIsMergeEditor.reset();
        this._ctxUsesColumnLayout.reset();
        this._ctxShowNonConflictingChanges.reset();
        super.dispose();
    }
    get minimumWidth() {
        return this._layoutMode.value.kind === 'mixed'
            ? this.input1View.view.minimumWidth + this.input2View.view.minimumWidth
            : this.input1View.view.minimumWidth +
                this.input2View.view.minimumWidth +
                this.inputResultView.view.minimumWidth;
    }
    // #endregion
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('mergeEditor', 'Text Merge Editor');
    }
    createEditorControl(parent, initialOptions) {
        this.rootHtmlElement = parent;
        parent.classList.add('merge-editor');
        this.applyLayout(this._layoutMode.value);
        this.applyOptions(initialOptions);
    }
    updateEditorControlOptions(options) {
        this.applyOptions(options);
    }
    applyOptions(options) {
        const inputOptions = deepMerge(options, {
            minimap: { enabled: false },
            glyphMargin: false,
            lineNumbersMinChars: 2,
        });
        const readOnlyInputOptions = deepMerge(inputOptions, {
            readOnly: true,
            readOnlyMessage: undefined,
        });
        this.input1View.updateOptions(readOnlyInputOptions);
        this.input2View.updateOptions(readOnlyInputOptions);
        this.baseViewOptions.set({ ...this.input2View.editor.getRawOptions() }, undefined);
        this.inputResultView.updateOptions(inputOptions);
    }
    getMainControl() {
        return this.inputResultView.editor;
    }
    layout(dimension) {
        this._grid.value?.layout(dimension.width, dimension.height);
    }
    async setInput(input, options, context, token) {
        if (!(input instanceof MergeEditorInput)) {
            throw new BugIndicatingError('ONLY MergeEditorInput is supported');
        }
        await super.setInput(input, options, context, token);
        this._sessionDisposables.clear();
        transaction((tx) => {
            this._viewModel.set(undefined, tx);
            this._inputModel.set(undefined, tx);
        });
        const inputModel = await input.resolve();
        const model = inputModel.model;
        const viewModel = this.instantiationService.createInstance(MergeEditorViewModel, model, this.input1View, this.input2View, this.inputResultView, this.baseView, this.showNonConflictingChanges);
        model.telemetry.reportMergeEditorOpened({
            combinableConflictCount: model.combinableConflictCount,
            conflictCount: model.conflictCount,
            baseTop: this._layoutModeObs.get().showBaseAtTop,
            baseVisible: this._layoutModeObs.get().showBase,
            isColumnView: this._layoutModeObs.get().kind === 'columns',
        });
        transaction((tx) => {
            this._viewModel.set(viewModel, tx);
            this._inputModel.set(inputModel, tx);
        });
        this._sessionDisposables.add(viewModel);
        // Set/unset context keys based on input
        this._ctxResultUri.set(inputModel.resultUri.toString());
        this._ctxBaseUri.set(model.base.uri.toString());
        this._sessionDisposables.add(toDisposable(() => {
            this._ctxBaseUri.reset();
            this._ctxResultUri.reset();
        }));
        // Set the view zones before restoring view state!
        // Otherwise scrolling will be off
        this._sessionDisposables.add(autorunWithStore((reader, store) => {
            /** @description update alignment view zones */
            const baseView = this.baseView.read(reader);
            this.inputResultView.editor.changeViewZones((resultViewZoneAccessor) => {
                const layout = this._layoutModeObs.read(reader);
                const shouldAlignResult = layout.kind === 'columns';
                const shouldAlignBase = layout.kind === 'mixed' && !layout.showBaseAtTop;
                this.input1View.editor.changeViewZones((input1ViewZoneAccessor) => {
                    this.input2View.editor.changeViewZones((input2ViewZoneAccessor) => {
                        if (baseView) {
                            baseView.editor.changeViewZones((baseViewZoneAccessor) => {
                                store.add(this.setViewZones(reader, viewModel, this.input1View.editor, input1ViewZoneAccessor, this.input2View.editor, input2ViewZoneAccessor, baseView.editor, baseViewZoneAccessor, shouldAlignBase, this.inputResultView.editor, resultViewZoneAccessor, shouldAlignResult));
                            });
                        }
                        else {
                            store.add(this.setViewZones(reader, viewModel, this.input1View.editor, input1ViewZoneAccessor, this.input2View.editor, input2ViewZoneAccessor, undefined, undefined, false, this.inputResultView.editor, resultViewZoneAccessor, shouldAlignResult));
                        }
                    });
                });
            });
            this.scrollSynchronizer.updateScrolling();
        }));
        const viewState = this.loadEditorViewState(input, context);
        if (viewState) {
            this._applyViewState(viewState);
        }
        else {
            this._sessionDisposables.add(thenIfNotDisposed(model.onInitialized, () => {
                const firstConflict = model.modifiedBaseRanges.get().find((r) => r.isConflicting);
                if (!firstConflict) {
                    return;
                }
                this.input1View.editor.revealLineInCenter(firstConflict.input1Range.startLineNumber);
                transaction((tx) => {
                    /** @description setActiveModifiedBaseRange */
                    viewModel.setActiveModifiedBaseRange(firstConflict, tx);
                });
            }));
        }
        // word wrap special case - sync transient state from result model to input[1|2] models
        const mirrorWordWrapTransientState = (candidate) => {
            const candidateState = readTransientState(candidate, this._codeEditorService);
            writeTransientState(model.input2.textModel, candidateState, this._codeEditorService);
            writeTransientState(model.input1.textModel, candidateState, this._codeEditorService);
            writeTransientState(model.resultTextModel, candidateState, this._codeEditorService);
            const baseTextModel = this.baseView.get()?.editor.getModel();
            if (baseTextModel) {
                writeTransientState(baseTextModel, candidateState, this._codeEditorService);
            }
        };
        this._sessionDisposables.add(this._codeEditorService.onDidChangeTransientModelProperty((candidate) => {
            mirrorWordWrapTransientState(candidate);
        }));
        mirrorWordWrapTransientState(this.inputResultView.editor.getModel());
        // detect when base, input1, and input2 become empty and replace THIS editor with its result editor
        // TODO@jrieken@hediet this needs a better/cleaner solution
        // https://github.com/microsoft/vscode/issues/155940
        const that = this;
        this._sessionDisposables.add(new (class {
            constructor() {
                this._disposable = new DisposableStore();
                for (const model of this.baseInput1Input2()) {
                    this._disposable.add(model.onDidChangeContent(() => this._checkBaseInput1Input2AllEmpty()));
                }
            }
            dispose() {
                this._disposable.dispose();
            }
            *baseInput1Input2() {
                yield model.base;
                yield model.input1.textModel;
                yield model.input2.textModel;
            }
            _checkBaseInput1Input2AllEmpty() {
                for (const model of this.baseInput1Input2()) {
                    if (model.getValueLength() > 0) {
                        return;
                    }
                }
                // all empty -> replace this editor with a normal editor for result
                that.editorService.replaceEditors([
                    {
                        editor: input,
                        replacement: { resource: input.result, options: { preserveFocus: true } },
                        forceReplaceDirty: true,
                    },
                ], that.group);
            }
        })());
    }
    setViewZones(reader, viewModel, input1Editor, input1ViewZoneAccessor, input2Editor, input2ViewZoneAccessor, baseEditor, baseViewZoneAccessor, shouldAlignBase, resultEditor, resultViewZoneAccessor, shouldAlignResult) {
        const input1ViewZoneIds = [];
        const input2ViewZoneIds = [];
        const baseViewZoneIds = [];
        const resultViewZoneIds = [];
        const viewZones = this.viewZoneComputer.computeViewZones(reader, viewModel, {
            codeLensesVisible: true,
            showNonConflictingChanges: this.showNonConflictingChanges.read(reader),
            shouldAlignBase,
            shouldAlignResult,
        });
        const disposableStore = new DisposableStore();
        if (baseViewZoneAccessor) {
            for (const v of viewZones.baseViewZones) {
                v.create(baseViewZoneAccessor, baseViewZoneIds, disposableStore);
            }
        }
        for (const v of viewZones.resultViewZones) {
            v.create(resultViewZoneAccessor, resultViewZoneIds, disposableStore);
        }
        for (const v of viewZones.input1ViewZones) {
            v.create(input1ViewZoneAccessor, input1ViewZoneIds, disposableStore);
        }
        for (const v of viewZones.input2ViewZones) {
            v.create(input2ViewZoneAccessor, input2ViewZoneIds, disposableStore);
        }
        disposableStore.add({
            dispose: () => {
                input1Editor.changeViewZones((a) => {
                    for (const zone of input1ViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
                input2Editor.changeViewZones((a) => {
                    for (const zone of input2ViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
                baseEditor?.changeViewZones((a) => {
                    for (const zone of baseViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
                resultEditor.changeViewZones((a) => {
                    for (const zone of resultViewZoneIds) {
                        a.removeZone(zone);
                    }
                });
            },
        });
        return disposableStore;
    }
    setOptions(options) {
        super.setOptions(options);
        if (options) {
            applyTextEditorOptions(options, this.inputResultView.editor, 0 /* ScrollType.Smooth */);
        }
    }
    clearInput() {
        super.clearInput();
        this._sessionDisposables.clear();
        for (const { editor } of [this.input1View, this.input2View, this.inputResultView]) {
            editor.setModel(null);
        }
    }
    focus() {
        super.focus();
        (this.getControl() ?? this.inputResultView.editor).focus();
    }
    hasFocus() {
        for (const { editor } of [this.input1View, this.input2View, this.inputResultView]) {
            if (editor.hasTextFocus()) {
                return true;
            }
        }
        return super.hasFocus();
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        for (const { editor } of [this.input1View, this.input2View, this.inputResultView]) {
            if (visible) {
                editor.onVisible();
            }
            else {
                editor.onHide();
            }
        }
        this._ctxIsMergeEditor.set(visible);
    }
    // ---- interact with "outside world" via`getControl`, `scopedContextKeyService`: we only expose the result-editor keep the others internal
    getControl() {
        return this.inputResultView.editor;
    }
    get scopedContextKeyService() {
        const control = this.getControl();
        return control?.invokeWithinContext((accessor) => accessor.get(IContextKeyService));
    }
    // --- layout
    toggleBase() {
        this.setLayout({
            ...this._layoutMode.value,
            showBase: !this._layoutMode.value.showBase,
        });
    }
    toggleShowBaseTop() {
        const showBaseTop = this._layoutMode.value.showBase && this._layoutMode.value.showBaseAtTop;
        this.setLayout({
            ...this._layoutMode.value,
            showBaseAtTop: true,
            showBase: !showBaseTop,
        });
    }
    toggleShowBaseCenter() {
        const showBaseCenter = this._layoutMode.value.showBase && !this._layoutMode.value.showBaseAtTop;
        this.setLayout({
            ...this._layoutMode.value,
            showBaseAtTop: false,
            showBase: !showBaseCenter,
        });
    }
    setLayoutKind(kind) {
        this.setLayout({
            ...this._layoutMode.value,
            kind,
        });
    }
    setLayout(newLayout) {
        const value = this._layoutMode.value;
        if (JSON.stringify(value) === JSON.stringify(newLayout)) {
            return;
        }
        this.model?.telemetry.reportLayoutChange({
            baseTop: newLayout.showBaseAtTop,
            baseVisible: newLayout.showBase,
            isColumnView: newLayout.kind === 'columns',
        });
        this.applyLayout(newLayout);
    }
    applyLayout(layout) {
        transaction((tx) => {
            /** @description applyLayout */
            if (layout.showBase && !this.baseView.get()) {
                this.baseViewDisposables.clear();
                const baseView = this.baseViewDisposables.add(this.instantiationService.createInstance(BaseCodeEditorView, this.viewModel));
                this.baseViewDisposables.add(autorun((reader) => {
                    /** @description Update base view options */
                    const options = this.baseViewOptions.read(reader);
                    if (options) {
                        baseView.updateOptions(options);
                    }
                }));
                this.baseView.set(baseView, tx);
            }
            else if (!layout.showBase && this.baseView.get()) {
                this.baseView.set(undefined, tx);
                this.baseViewDisposables.clear();
            }
            if (layout.kind === 'mixed') {
                this.setGrid([
                    layout.showBaseAtTop && layout.showBase
                        ? {
                            size: 38,
                            data: this.baseView.get().view,
                        }
                        : undefined,
                    {
                        size: 38,
                        groups: [
                            { data: this.input1View.view },
                            !layout.showBaseAtTop && layout.showBase
                                ? { data: this.baseView.get().view }
                                : undefined,
                            { data: this.input2View.view },
                        ].filter(isDefined),
                    },
                    {
                        size: 62,
                        data: this.inputResultView.view,
                    },
                ].filter(isDefined));
            }
            else if (layout.kind === 'columns') {
                this.setGrid([
                    layout.showBase
                        ? {
                            size: 40,
                            data: this.baseView.get().view,
                        }
                        : undefined,
                    {
                        size: 60,
                        groups: [
                            { data: this.input1View.view },
                            { data: this.inputResultView.view },
                            { data: this.input2View.view },
                        ],
                    },
                ].filter(isDefined));
            }
            this._layoutMode.value = layout;
            this._ctxUsesColumnLayout.set(layout.kind);
            this._ctxShowBase.set(layout.showBase);
            this._ctxShowBaseAtTop.set(layout.showBaseAtTop);
            this._onDidChangeSizeConstraints.fire();
            this._layoutModeObs.set(layout, tx);
        });
    }
    setGrid(descriptor) {
        let width = -1;
        let height = -1;
        if (this._grid.value) {
            width = this._grid.value.width;
            height = this._grid.value.height;
        }
        this._grid.value = SerializableGrid.from({
            orientation: 0 /* Orientation.VERTICAL */,
            size: 100,
            groups: descriptor,
        }, {
            styles: { separatorBorder: this.theme.getColor(settingsSashBorder) ?? Color.transparent },
            proportionalLayout: true,
        });
        reset(this.rootHtmlElement, this._grid.value.element);
        // Only call layout after the elements have been added to the DOM,
        // so that they have a defined size.
        if (width !== -1) {
            this._grid.value.layout(width, height);
        }
    }
    _applyViewState(state) {
        if (!state) {
            return;
        }
        this.inputResultView.editor.restoreViewState(state);
        if (state.input1State) {
            this.input1View.editor.restoreViewState(state.input1State);
        }
        if (state.input2State) {
            this.input2View.editor.restoreViewState(state.input2State);
        }
        if (state.focusIndex >= 0) {
            ;
            [this.input1View.editor, this.input2View.editor, this.inputResultView.editor][state.focusIndex].focus();
        }
    }
    computeEditorViewState(resource) {
        if (!isEqual(this.inputModel.get()?.resultUri, resource)) {
            return undefined;
        }
        const result = this.inputResultView.editor.saveViewState();
        if (!result) {
            return undefined;
        }
        const input1State = this.input1View.editor.saveViewState() ?? undefined;
        const input2State = this.input2View.editor.saveViewState() ?? undefined;
        const focusIndex = [
            this.input1View.editor,
            this.input2View.editor,
            this.inputResultView.editor,
        ].findIndex((editor) => editor.hasWidgetFocus());
        return { ...result, input1State, input2State, focusIndex };
    }
    tracksEditorViewState(input) {
        return input instanceof MergeEditorInput;
    }
    toggleShowNonConflictingChanges() {
        this.showNonConflictingChanges.set(!this.showNonConflictingChanges.get(), undefined);
        this.showNonConflictingChangesStore.set(this.showNonConflictingChanges.get());
        this._ctxShowNonConflictingChanges.set(this.showNonConflictingChanges.get());
    }
};
MergeEditor = MergeEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, ITelemetryService),
    __param(4, IStorageService),
    __param(5, IThemeService),
    __param(6, ITextResourceConfigurationService),
    __param(7, IEditorService),
    __param(8, IEditorGroupsService),
    __param(9, IFileService),
    __param(10, ICodeEditorService)
], MergeEditor);
export { MergeEditor };
// TODO use PersistentStore
let MergeEditorLayoutStore = class MergeEditorLayoutStore {
    static { MergeEditorLayoutStore_1 = this; }
    static { this._key = 'mergeEditor/layout'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        this._value = { kind: 'mixed', showBase: false, showBaseAtTop: true };
        const value = _storageService.get(MergeEditorLayoutStore_1._key, 0 /* StorageScope.PROFILE */, 'mixed');
        if (value === 'mixed' || value === 'columns') {
            this._value = { kind: value, showBase: false, showBaseAtTop: true };
        }
        else if (value) {
            try {
                this._value = JSON.parse(value);
            }
            catch (e) {
                onUnexpectedError(e);
            }
        }
    }
    get value() {
        return this._value;
    }
    set value(value) {
        if (this._value !== value) {
            this._value = value;
            this._storageService.store(MergeEditorLayoutStore_1._key, JSON.stringify(this._value), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
};
MergeEditorLayoutStore = MergeEditorLayoutStore_1 = __decorate([
    __param(0, IStorageService)
], MergeEditorLayoutStore);
let MergeEditorOpenHandlerContribution = class MergeEditorOpenHandlerContribution extends Disposable {
    constructor(_editorService, codeEditorService) {
        super();
        this._editorService = _editorService;
        this._store.add(codeEditorService.registerCodeEditorOpenHandler(this.openCodeEditorFromMergeEditor.bind(this)));
    }
    async openCodeEditorFromMergeEditor(input, _source, sideBySide) {
        const activePane = this._editorService.activeEditorPane;
        if (!sideBySide &&
            input.options &&
            activePane instanceof MergeEditor &&
            activePane.getControl() &&
            activePane.input instanceof MergeEditorInput &&
            isEqual(input.resource, activePane.input.result)) {
            // Special: stay inside the merge editor when it is active and when the input
            // targets the result editor of the merge editor.
            const targetEditor = activePane.getControl();
            applyTextEditorOptions(input.options, targetEditor, 0 /* ScrollType.Smooth */);
            return targetEditor;
        }
        // cannot handle this
        return null;
    }
};
MergeEditorOpenHandlerContribution = __decorate([
    __param(0, IEditorService),
    __param(1, ICodeEditorService)
], MergeEditorOpenHandlerContribution);
export { MergeEditorOpenHandlerContribution };
let MergeEditorResolverContribution = class MergeEditorResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.mergeEditorResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        const mergeEditorInputFactory = (mergeEditor) => {
            return {
                editor: instantiationService.createInstance(MergeEditorInput, mergeEditor.base.resource, {
                    uri: mergeEditor.input1.resource,
                    title: mergeEditor.input1.label ?? basename(mergeEditor.input1.resource),
                    description: mergeEditor.input1.description ?? '',
                    detail: mergeEditor.input1.detail,
                }, {
                    uri: mergeEditor.input2.resource,
                    title: mergeEditor.input2.label ?? basename(mergeEditor.input2.resource),
                    description: mergeEditor.input2.description ?? '',
                    detail: mergeEditor.input2.detail,
                }, mergeEditor.result.resource),
            };
        };
        this._register(editorResolverService.registerEditor(`*`, {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin,
        }, {}, {
            createMergeEditorInput: mergeEditorInputFactory,
        }));
    }
};
MergeEditorResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], MergeEditorResolverContribution);
export { MergeEditorResolverContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvbWVyZ2VFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBSU4sZ0JBQWdCLEdBQ2hCLE1BQU0sNkNBQTZDLENBQUE7QUFHcEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFDTixPQUFPLEVBQ1AsZ0JBQWdCLEVBR2hCLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxPQUFPLHlCQUF5QixDQUFBO0FBS2hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBSWhHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ3RILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1B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