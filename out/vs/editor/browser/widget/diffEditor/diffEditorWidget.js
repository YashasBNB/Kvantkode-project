var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, h } from '../../../../base/browser/dom.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { readHotReloadableExport } from '../../../../base/common/hotReloadHelpers.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedDisposable, disposableObservableValue, observableFromEvent, observableValue, recomputeInitiallyAndOnChange, subtransaction, transaction, } from '../../../../base/common/observable.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorType, } from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { EditorExtensionsRegistry, } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { StableEditorScrollState } from '../../stableEditorScroll.js';
import { CodeEditorWidget } from '../codeEditor/codeEditorWidget.js';
import { AccessibleDiffViewer, AccessibleDiffViewerModelFromEditors, } from './components/accessibleDiffViewer.js';
import { DiffEditorDecorations } from './components/diffEditorDecorations.js';
import { DiffEditorEditors } from './components/diffEditorEditors.js';
import { DiffEditorSash, SashLayout } from './components/diffEditorSash.js';
import { DiffEditorViewZones } from './components/diffEditorViewZones/diffEditorViewZones.js';
import { DelegatingEditor } from './delegatingEditorImpl.js';
import { DiffEditorOptions } from './diffEditorOptions.js';
import { DiffEditorViewModel } from './diffEditorViewModel.js';
import { DiffEditorGutter } from './features/gutterFeature.js';
import { HideUnchangedRegionsFeature } from './features/hideUnchangedRegionsFeature.js';
import { MovedBlocksLinesFeature } from './features/movedBlocksLinesFeature.js';
import { OverviewRulerFeature } from './features/overviewRulerFeature.js';
import { RevertButtonsFeature } from './features/revertButtonsFeature.js';
import './style.css';
import { ObservableElementSizeObserver, RefCounted, applyStyle, applyViewZones, translatePosition, } from './utils.js';
let DiffEditorWidget = class DiffEditorWidget extends DelegatingEditor {
    static { this.ENTIRE_DIFF_OVERVIEW_WIDTH = OverviewRulerFeature.ENTIRE_DIFF_OVERVIEW_WIDTH; }
    get onDidContentSizeChange() {
        return this._editors.onDidContentSizeChange;
    }
    get collapseUnchangedRegions() {
        return this._options.hideUnchangedRegions.get();
    }
    constructor(_domElement, options, codeEditorWidgetOptions, _parentContextKeyService, _parentInstantiationService, codeEditorService, _accessibilitySignalService, _editorProgressService) {
        super();
        this._domElement = _domElement;
        this._parentContextKeyService = _parentContextKeyService;
        this._parentInstantiationService = _parentInstantiationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._editorProgressService = _editorProgressService;
        this.elements = h('div.monaco-diff-editor.side-by-side', { style: { position: 'relative', height: '100%' } }, [
            h('div.editor.original@original', { style: { position: 'absolute', height: '100%' } }),
            h('div.editor.modified@modified', { style: { position: 'absolute', height: '100%' } }),
            h('div.accessibleDiffViewer@accessibleDiffViewer', {
                style: { position: 'absolute', height: '100%' },
            }),
        ]);
        this._diffModelSrc = this._register(disposableObservableValue(this, undefined));
        this._diffModel = derived(this, (reader) => this._diffModelSrc.read(reader)?.object);
        this.onDidChangeModel = Event.fromObservableLight(this._diffModel);
        this._contextKeyService = this._register(this._parentContextKeyService.createScoped(this._domElement));
        this._instantiationService = this._register(this._parentInstantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._boundarySashes = observableValue(this, undefined);
        this._accessibleDiffViewerShouldBeVisible = observableValue(this, false);
        this._accessibleDiffViewerVisible = derived(this, (reader) => this._options.onlyShowAccessibleDiffViewer.read(reader)
            ? true
            : this._accessibleDiffViewerShouldBeVisible.read(reader));
        this._movedBlocksLinesPart = observableValue(this, undefined);
        this._layoutInfo = derived(this, (reader) => {
            const fullWidth = this._rootSizeObserver.width.read(reader);
            const fullHeight = this._rootSizeObserver.height.read(reader);
            if (this._rootSizeObserver.automaticLayout) {
                this.elements.root.style.height = '100%';
            }
            else {
                this.elements.root.style.height = fullHeight + 'px';
            }
            const sash = this._sash.read(reader);
            const gutter = this._gutter.read(reader);
            const gutterWidth = gutter?.width.read(reader) ?? 0;
            const overviewRulerPartWidth = this._overviewRulerPart.read(reader)?.width ?? 0;
            let originalLeft, originalWidth, modifiedLeft, modifiedWidth, gutterLeft;
            const sideBySide = !!sash;
            if (sideBySide) {
                const sashLeft = sash.sashLeft.read(reader);
                const movedBlocksLinesWidth = this._movedBlocksLinesPart.read(reader)?.width.read(reader) ?? 0;
                originalLeft = 0;
                originalWidth = sashLeft - gutterWidth - movedBlocksLinesWidth;
                gutterLeft = sashLeft - gutterWidth;
                modifiedLeft = sashLeft;
                modifiedWidth = fullWidth - modifiedLeft - overviewRulerPartWidth;
            }
            else {
                gutterLeft = 0;
                const shouldHideOriginalLineNumbers = this._options.inlineViewHideOriginalLineNumbers.read(reader);
                originalLeft = gutterWidth;
                if (shouldHideOriginalLineNumbers) {
                    originalWidth = 0;
                }
                else {
                    originalWidth = Math.max(5, this._editors.originalObs.layoutInfoDecorationsLeft.read(reader));
                }
                modifiedLeft = gutterWidth + originalWidth;
                modifiedWidth = fullWidth - modifiedLeft - overviewRulerPartWidth;
            }
            this.elements.original.style.left = originalLeft + 'px';
            this.elements.original.style.width = originalWidth + 'px';
            this._editors.original.layout({ width: originalWidth, height: fullHeight }, true);
            gutter?.layout(gutterLeft);
            this.elements.modified.style.left = modifiedLeft + 'px';
            this.elements.modified.style.width = modifiedWidth + 'px';
            this._editors.modified.layout({ width: modifiedWidth, height: fullHeight }, true);
            return {
                modifiedEditor: this._editors.modified.getLayoutInfo(),
                originalEditor: this._editors.original.getLayoutInfo(),
            };
        });
        this._diffValue = this._diffModel.map((m, r) => m?.diff.read(r));
        this.onDidUpdateDiff = Event.fromObservableLight(this._diffValue);
        codeEditorService.willCreateDiffEditor();
        this._contextKeyService.createKey('isInDiffEditor', true);
        this._domElement.appendChild(this.elements.root);
        this._register(toDisposable(() => this.elements.root.remove()));
        this._rootSizeObserver = this._register(new ObservableElementSizeObserver(this.elements.root, options.dimension));
        this._rootSizeObserver.setAutomaticLayout(options.automaticLayout ?? false);
        this._options = this._instantiationService.createInstance(DiffEditorOptions, options);
        this._register(autorun((reader) => {
            this._options.setWidth(this._rootSizeObserver.width.read(reader));
        }));
        this._contextKeyService.createKey(EditorContextKeys.isEmbeddedDiffEditor.key, false);
        this._register(bindContextKey(EditorContextKeys.isEmbeddedDiffEditor, this._contextKeyService, (reader) => this._options.isInEmbeddedEditor.read(reader)));
        this._register(bindContextKey(EditorContextKeys.comparingMovedCode, this._contextKeyService, (reader) => !!this._diffModel.read(reader)?.movedTextToCompare.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached, this._contextKeyService, (reader) => this._options.couldShowInlineViewBecauseOfSize.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorInlineMode, this._contextKeyService, (reader) => !this._options.renderSideBySide.read(reader)));
        this._register(bindContextKey(EditorContextKeys.hasChanges, this._contextKeyService, (reader) => (this._diffModel.read(reader)?.diff.read(reader)?.mappings.length ?? 0) > 0));
        this._editors = this._register(this._instantiationService.createInstance(DiffEditorEditors, this.elements.original, this.elements.modified, this._options, codeEditorWidgetOptions, (i, c, o, o2) => this._createInnerEditor(i, c, o, o2)));
        this._register(bindContextKey(EditorContextKeys.diffEditorOriginalWritable, this._contextKeyService, (reader) => this._options.originalEditable.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorModifiedWritable, this._contextKeyService, (reader) => !this._options.readOnly.read(reader)));
        this._register(bindContextKey(EditorContextKeys.diffEditorOriginalUri, this._contextKeyService, (reader) => this._diffModel.read(reader)?.model.original.uri.toString() ?? ''));
        this._register(bindContextKey(EditorContextKeys.diffEditorModifiedUri, this._contextKeyService, (reader) => this._diffModel.read(reader)?.model.modified.uri.toString() ?? ''));
        this._overviewRulerPart = derivedDisposable(this, (reader) => !this._options.renderOverviewRuler.read(reader)
            ? undefined
            : this._instantiationService.createInstance(readHotReloadableExport(OverviewRulerFeature, reader), this._editors, this.elements.root, this._diffModel, this._rootSizeObserver.width, this._rootSizeObserver.height, this._layoutInfo.map((i) => i.modifiedEditor))).recomputeInitiallyAndOnChange(this._store);
        const dimensions = {
            height: this._rootSizeObserver.height,
            width: this._rootSizeObserver.width.map((w, reader) => w - (this._overviewRulerPart.read(reader)?.width ?? 0)),
        };
        this._sashLayout = new SashLayout(this._options, dimensions);
        this._sash = derivedDisposable(this, (reader) => {
            const showSash = this._options.renderSideBySide.read(reader);
            this.elements.root.classList.toggle('side-by-side', showSash);
            return !showSash
                ? undefined
                : new DiffEditorSash(this.elements.root, dimensions, this._options.enableSplitViewResizing, this._boundarySashes, this._sashLayout.sashLeft, () => this._sashLayout.resetSash());
        }).recomputeInitiallyAndOnChange(this._store);
        const unchangedRangesFeature = derivedDisposable(this, (reader /** @description UnchangedRangesFeature */) => this._instantiationService.createInstance(readHotReloadableExport(HideUnchangedRegionsFeature, reader), this._editors, this._diffModel, this._options)).recomputeInitiallyAndOnChange(this._store);
        derivedDisposable(this, (reader /** @description DiffEditorDecorations */) => this._instantiationService.createInstance(readHotReloadableExport(DiffEditorDecorations, reader), this._editors, this._diffModel, this._options, this)).recomputeInitiallyAndOnChange(this._store);
        const origViewZoneIdsToIgnore = new Set();
        const modViewZoneIdsToIgnore = new Set();
        let isUpdatingViewZones = false;
        const viewZoneManager = derivedDisposable(this, (reader /** @description ViewZoneManager */) => this._instantiationService.createInstance(readHotReloadableExport(DiffEditorViewZones, reader), getWindow(this._domElement), this._editors, this._diffModel, this._options, this, () => isUpdatingViewZones || unchangedRangesFeature.get().isUpdatingHiddenAreas, origViewZoneIdsToIgnore, modViewZoneIdsToIgnore)).recomputeInitiallyAndOnChange(this._store);
        const originalViewZones = derived(this, (reader) => {
            /** @description originalViewZones */
            const orig = viewZoneManager.read(reader).viewZones.read(reader).orig;
            const orig2 = unchangedRangesFeature.read(reader).viewZones.read(reader).origViewZones;
            return orig.concat(orig2);
        });
        const modifiedViewZones = derived(this, (reader) => {
            /** @description modifiedViewZones */
            const mod = viewZoneManager.read(reader).viewZones.read(reader).mod;
            const mod2 = unchangedRangesFeature.read(reader).viewZones.read(reader).modViewZones;
            return mod.concat(mod2);
        });
        this._register(applyViewZones(this._editors.original, originalViewZones, (isUpdatingOrigViewZones) => {
            isUpdatingViewZones = isUpdatingOrigViewZones;
        }, origViewZoneIdsToIgnore));
        let scrollState;
        this._register(applyViewZones(this._editors.modified, modifiedViewZones, (isUpdatingModViewZones) => {
            isUpdatingViewZones = isUpdatingModViewZones;
            if (isUpdatingViewZones) {
                scrollState = StableEditorScrollState.capture(this._editors.modified);
            }
            else {
                scrollState?.restore(this._editors.modified);
                scrollState = undefined;
            }
        }, modViewZoneIdsToIgnore));
        this._accessibleDiffViewer = derivedDisposable(this, (reader) => this._instantiationService.createInstance(readHotReloadableExport(AccessibleDiffViewer, reader), this.elements.accessibleDiffViewer, this._accessibleDiffViewerVisible, (visible, tx) => this._accessibleDiffViewerShouldBeVisible.set(visible, tx), this._options.onlyShowAccessibleDiffViewer.map((v) => !v), this._rootSizeObserver.width, this._rootSizeObserver.height, this._diffModel.map((m, r) => m?.diff.read(r)?.mappings.map((m) => m.lineRangeMapping)), new AccessibleDiffViewerModelFromEditors(this._editors))).recomputeInitiallyAndOnChange(this._store);
        const visibility = this._accessibleDiffViewerVisible.map((v) => v ? 'hidden' : 'visible');
        this._register(applyStyle(this.elements.modified, { visibility }));
        this._register(applyStyle(this.elements.original, { visibility }));
        this._createDiffEditorContributions();
        codeEditorService.addDiffEditor(this);
        this._gutter = derivedDisposable(this, (reader) => {
            return this._options.shouldRenderGutterMenu.read(reader)
                ? this._instantiationService.createInstance(readHotReloadableExport(DiffEditorGutter, reader), this.elements.root, this._diffModel, this._editors, this._options, this._sashLayout, this._boundarySashes)
                : undefined;
        });
        this._register(recomputeInitiallyAndOnChange(this._layoutInfo));
        derivedDisposable(this, (reader /** @description MovedBlocksLinesPart */) => new (readHotReloadableExport(MovedBlocksLinesFeature, reader))(this.elements.root, this._diffModel, this._layoutInfo.map((i) => i.originalEditor), this._layoutInfo.map((i) => i.modifiedEditor), this._editors)).recomputeInitiallyAndOnChange(this._store, (value) => {
            // This is to break the layout info <-> moved blocks lines part dependency cycle.
            this._movedBlocksLinesPart.set(value, undefined);
        });
        this._register(Event.runAndSubscribe(this._editors.modified.onDidChangeCursorPosition, (e) => this._handleCursorPositionChange(e, true)));
        this._register(Event.runAndSubscribe(this._editors.original.onDidChangeCursorPosition, (e) => this._handleCursorPositionChange(e, false)));
        const isInitializingDiff = this._diffModel.map(this, (m, reader) => {
            /** @isInitializingDiff isDiffUpToDate */
            if (!m) {
                return undefined;
            }
            return m.diff.read(reader) === undefined && !m.isDiffUpToDate.read(reader);
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description DiffEditorWidgetHelper.ShowProgress */
            if (isInitializingDiff.read(reader) === true) {
                const r = this._editorProgressService.show(true, 1000);
                store.add(toDisposable(() => r.done()));
            }
        }));
        this._register(autorunWithStore((reader, store) => {
            store.add(new (readHotReloadableExport(RevertButtonsFeature, reader))(this._editors, this._diffModel, this._options, this));
        }));
        this._register(autorunWithStore((reader, store) => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return;
            }
            for (const m of [model.model.original, model.model.modified]) {
                store.add(m.onWillDispose((e) => {
                    onUnexpectedError(new BugIndicatingError('TextModel got disposed before DiffEditorWidget model got reset'));
                    this.setModel(null);
                }));
            }
        }));
        this._register(autorun((reader) => {
            this._options.setModel(this._diffModel.read(reader));
        }));
    }
    getViewWidth() {
        return this._rootSizeObserver.width.get();
    }
    getContentHeight() {
        return this._editors.modified.getContentHeight();
    }
    _createInnerEditor(instantiationService, container, options, editorWidgetOptions) {
        const editor = instantiationService.createInstance(CodeEditorWidget, container, options, editorWidgetOptions);
        return editor;
    }
    _createDiffEditorContributions() {
        const contributions = EditorExtensionsRegistry.getDiffEditorContributions();
        for (const desc of contributions) {
            try {
                this._register(this._instantiationService.createInstance(desc.ctor, this));
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
    }
    get _targetEditor() {
        return this._editors.modified;
    }
    getEditorType() {
        return EditorType.IDiffEditor;
    }
    onVisible() {
        // TODO: Only compute diffs when diff editor is visible
        this._editors.original.onVisible();
        this._editors.modified.onVisible();
    }
    onHide() {
        this._editors.original.onHide();
        this._editors.modified.onHide();
    }
    layout(dimension) {
        this._rootSizeObserver.observe(dimension);
    }
    hasTextFocus() {
        return this._editors.original.hasTextFocus() || this._editors.modified.hasTextFocus();
    }
    saveViewState() {
        const originalViewState = this._editors.original.saveViewState();
        const modifiedViewState = this._editors.modified.saveViewState();
        return {
            original: originalViewState,
            modified: modifiedViewState,
            modelState: this._diffModel.get()?.serializeState(),
        };
    }
    restoreViewState(s) {
        if (s && s.original && s.modified) {
            const diffEditorState = s;
            this._editors.original.restoreViewState(diffEditorState.original);
            this._editors.modified.restoreViewState(diffEditorState.modified);
            if (diffEditorState.modelState) {
                this._diffModel.get()?.restoreSerializedState(diffEditorState.modelState);
            }
        }
    }
    handleInitialized() {
        this._editors.original.handleInitialized();
        this._editors.modified.handleInitialized();
    }
    createViewModel(model) {
        return this._instantiationService.createInstance(DiffEditorViewModel, model, this._options);
    }
    getModel() {
        return this._diffModel.get()?.model ?? null;
    }
    setModel(model) {
        const vm = !model
            ? null
            : 'model' in model
                ? RefCounted.create(model).createNewRef(this)
                : RefCounted.create(this.createViewModel(model), this);
        this.setDiffModel(vm);
    }
    setDiffModel(viewModel, tx) {
        const currentModel = this._diffModel.get();
        if (!viewModel && currentModel) {
            // Transitioning from a model to no-model
            this._accessibleDiffViewer.get().close();
        }
        if (this._diffModel.get() !== viewModel?.object) {
            subtransaction(tx, (tx) => {
                const vm = viewModel?.object;
                /** @description DiffEditorWidget.setModel */
                observableFromEvent.batchEventsGlobally(tx, () => {
                    this._editors.original.setModel(vm ? vm.model.original : null);
                    this._editors.modified.setModel(vm ? vm.model.modified : null);
                });
                const prevValueRef = this._diffModelSrc.get()?.createNewRef(this);
                this._diffModelSrc.set(viewModel?.createNewRef(this), tx);
                setTimeout(() => {
                    // async, so that this runs after the transaction finished.
                    // TODO: use the transaction to schedule disposal
                    prevValueRef?.dispose();
                }, 0);
            });
        }
    }
    /**
     * @param changedOptions Only has values for top-level options that have actually changed.
     */
    updateOptions(changedOptions) {
        this._options.updateOptions(changedOptions);
    }
    getDomNode() {
        return this.elements.root;
    }
    getContainerDomNode() {
        return this._domElement;
    }
    getOriginalEditor() {
        return this._editors.original;
    }
    getModifiedEditor() {
        return this._editors.modified;
    }
    setBoundarySashes(sashes) {
        this._boundarySashes.set(sashes, undefined);
    }
    get ignoreTrimWhitespace() {
        return this._options.ignoreTrimWhitespace.get();
    }
    get maxComputationTime() {
        return this._options.maxComputationTimeMs.get();
    }
    get renderSideBySide() {
        return this._options.renderSideBySide.get();
    }
    /**
     * @deprecated Use `this.getDiffComputationResult().changes2` instead.
     */
    getLineChanges() {
        const diffState = this._diffModel.get()?.diff.get();
        if (!diffState) {
            return null;
        }
        return toLineChanges(diffState);
    }
    getDiffComputationResult() {
        const diffState = this._diffModel.get()?.diff.get();
        if (!diffState) {
            return null;
        }
        return {
            changes: this.getLineChanges(),
            changes2: diffState.mappings.map((m) => m.lineRangeMapping),
            identical: diffState.identical,
            quitEarly: diffState.quitEarly,
        };
    }
    revert(diff) {
        const model = this._diffModel.get();
        if (!model || !model.isDiffUpToDate.get()) {
            return;
        }
        this._editors.modified.executeEdits('diffEditor', [
            {
                range: diff.modified.toExclusiveRange(),
                text: model.model.original.getValueInRange(diff.original.toExclusiveRange()),
            },
        ]);
    }
    revertRangeMappings(diffs) {
        const model = this._diffModel.get();
        if (!model || !model.isDiffUpToDate.get()) {
            return;
        }
        const changes = diffs.map((c) => ({
            range: c.modifiedRange,
            text: model.model.original.getValueInRange(c.originalRange),
        }));
        this._editors.modified.executeEdits('diffEditor', changes);
    }
    _goTo(diff) {
        this._editors.modified.setPosition(new Position(diff.lineRangeMapping.modified.startLineNumber, 1));
        this._editors.modified.revealRangeInCenter(diff.lineRangeMapping.modified.toExclusiveRange());
    }
    goToDiff(target) {
        const diffs = this._diffModel.get()?.diff.get()?.mappings;
        if (!diffs || diffs.length === 0) {
            return;
        }
        const curLineNumber = this._editors.modified.getPosition().lineNumber;
        let diff;
        if (target === 'next') {
            diff =
                diffs.find((d) => d.lineRangeMapping.modified.startLineNumber > curLineNumber) ?? diffs[0];
        }
        else {
            diff =
                findLast(diffs, (d) => d.lineRangeMapping.modified.startLineNumber < curLineNumber) ??
                    diffs[diffs.length - 1];
        }
        this._goTo(diff);
        if (diff.lineRangeMapping.modified.isEmpty) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, {
                source: 'diffEditor.goToDiff',
            });
        }
        else if (diff.lineRangeMapping.original.isEmpty) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, {
                source: 'diffEditor.goToDiff',
            });
        }
        else if (diff) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, {
                source: 'diffEditor.goToDiff',
            });
        }
    }
    revealFirstDiff() {
        const diffModel = this._diffModel.get();
        if (!diffModel) {
            return;
        }
        // wait for the diff computation to finish
        this.waitForDiff().then(() => {
            const diffs = diffModel.diff.get()?.mappings;
            if (!diffs || diffs.length === 0) {
                return;
            }
            this._goTo(diffs[0]);
        });
    }
    accessibleDiffViewerNext() {
        this._accessibleDiffViewer.get().next();
    }
    accessibleDiffViewerPrev() {
        this._accessibleDiffViewer.get().prev();
    }
    async waitForDiff() {
        const diffModel = this._diffModel.get();
        if (!diffModel) {
            return;
        }
        await diffModel.waitForDiff();
    }
    mapToOtherSide() {
        const isModifiedFocus = this._editors.modified.hasWidgetFocus();
        const source = isModifiedFocus ? this._editors.modified : this._editors.original;
        const destination = isModifiedFocus ? this._editors.original : this._editors.modified;
        let destinationSelection;
        const sourceSelection = source.getSelection();
        if (sourceSelection) {
            const mappings = this._diffModel
                .get()
                ?.diff.get()
                ?.mappings.map((m) => (isModifiedFocus ? m.lineRangeMapping.flip() : m.lineRangeMapping));
            if (mappings) {
                const newRange1 = translatePosition(sourceSelection.getStartPosition(), mappings);
                const newRange2 = translatePosition(sourceSelection.getEndPosition(), mappings);
                destinationSelection = Range.plusRange(newRange1, newRange2);
            }
        }
        return { destination, destinationSelection };
    }
    switchSide() {
        const { destination, destinationSelection } = this.mapToOtherSide();
        destination.focus();
        if (destinationSelection) {
            destination.setSelection(destinationSelection);
        }
    }
    exitCompareMove() {
        const model = this._diffModel.get();
        if (!model) {
            return;
        }
        model.movedTextToCompare.set(undefined, undefined);
    }
    collapseAllUnchangedRegions() {
        const unchangedRegions = this._diffModel.get()?.unchangedRegions.get();
        if (!unchangedRegions) {
            return;
        }
        transaction((tx) => {
            for (const region of unchangedRegions) {
                region.collapseAll(tx);
            }
        });
    }
    showAllUnchangedRegions() {
        const unchangedRegions = this._diffModel.get()?.unchangedRegions.get();
        if (!unchangedRegions) {
            return;
        }
        transaction((tx) => {
            for (const region of unchangedRegions) {
                region.showAll(tx);
            }
        });
    }
    _handleCursorPositionChange(e, isModifiedEditor) {
        if (e?.reason === 3 /* CursorChangeReason.Explicit */) {
            const diff = this._diffModel
                .get()
                ?.diff.get()
                ?.mappings.find((m) => isModifiedEditor
                ? m.lineRangeMapping.modified.contains(e.position.lineNumber)
                : m.lineRangeMapping.original.contains(e.position.lineNumber));
            if (diff?.lineRangeMapping.modified.isEmpty) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineDeleted, {
                    source: 'diffEditor.cursorPositionChanged',
                });
            }
            else if (diff?.lineRangeMapping.original.isEmpty) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineInserted, {
                    source: 'diffEditor.cursorPositionChanged',
                });
            }
            else if (diff) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.diffLineModified, {
                    source: 'diffEditor.cursorPositionChanged',
                });
            }
        }
    }
};
DiffEditorWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, ICodeEditorService),
    __param(6, IAccessibilitySignalService),
    __param(7, IEditorProgressService)
], DiffEditorWidget);
export { DiffEditorWidget };
export function toLineChanges(state) {
    return state.mappings.map((x) => {
        const m = x.lineRangeMapping;
        let originalStartLineNumber;
        let originalEndLineNumber;
        let modifiedStartLineNumber;
        let modifiedEndLineNumber;
        let innerChanges = m.innerChanges;
        if (m.original.isEmpty) {
            // Insertion
            originalStartLineNumber = m.original.startLineNumber - 1;
            originalEndLineNumber = 0;
            innerChanges = undefined;
        }
        else {
            originalStartLineNumber = m.original.startLineNumber;
            originalEndLineNumber = m.original.endLineNumberExclusive - 1;
        }
        if (m.modified.isEmpty) {
            // Deletion
            modifiedStartLineNumber = m.modified.startLineNumber - 1;
            modifiedEndLineNumber = 0;
            innerChanges = undefined;
        }
        else {
            modifiedStartLineNumber = m.modified.startLineNumber;
            modifiedEndLineNumber = m.modified.endLineNumberExclusive - 1;
        }
        return {
            originalStartLineNumber,
            originalEndLineNumber,
            modifiedStartLineNumber,
            modifiedEndLineNumber,
            charChanges: innerChanges?.map((m) => ({
                originalStartLineNumber: m.originalRange.startLineNumber,
                originalStartColumn: m.originalRange.startColumn,
                originalEndLineNumber: m.originalRange.endLineNumber,
                originalEndColumn: m.originalRange.endColumn,
                modifiedStartLineNumber: m.modifiedRange.startLineNumber,
                modifiedStartColumn: m.modifiedRange.startColumn,
                modifiedEndLineNumber: m.modifiedRange.endLineNumber,
                modifiedEndColumn: m.modifiedRange.endColumn,
            })),
        };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2RpZmZFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBR04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLHlCQUF5QixFQUN6QixtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLDZCQUE2QixFQUM3QixjQUFjLEVBQ2QsV0FBVyxHQUNYLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDbEcsT0FBTyxF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