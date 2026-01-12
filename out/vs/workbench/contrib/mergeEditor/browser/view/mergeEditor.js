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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9tZXJnZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFhLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFJTixnQkFBZ0IsR0FDaEIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUdwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUNOLE9BQU8sRUFDUCxnQkFBZ0IsRUFHaEIsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRS9ELE9BQU8seUJBQXlCLENBQUE7QUFLaEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFJaEcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDdEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFFTixrQkFBa0IsR0FD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