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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { IOutlineService, } from '../../../../services/outline/browser/outline.js';
import { Extensions as WorkbenchExtensions, } from '../../../../common/contributions.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { DocumentSymbolComparator, DocumentSymbolAccessibilityProvider, DocumentSymbolRenderer, DocumentSymbolFilter, DocumentSymbolGroupRenderer, DocumentSymbolIdentityProvider, DocumentSymbolNavigationLabelProvider, DocumentSymbolVirtualDelegate, DocumentSymbolDragAndDrop, } from './documentSymbolsTree.js';
import { isCodeEditor, isDiffEditor, } from '../../../../../editor/browser/editorBrowser.js';
import { OutlineGroup, OutlineElement, OutlineModel, TreeElement, IOutlineModelService, } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { raceCancellation, TimeoutTimer, timeout, Barrier, } from '../../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { localize } from '../../../../../nls.js';
import { IMarkerDecorationsService } from '../../../../../editor/common/services/markerDecorations.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
let DocumentSymbolBreadcrumbsSource = class DocumentSymbolBreadcrumbsSource {
    constructor(_editor, _textResourceConfigurationService) {
        this._editor = _editor;
        this._textResourceConfigurationService = _textResourceConfigurationService;
        this._breadcrumbs = [];
    }
    getBreadcrumbElements() {
        return this._breadcrumbs;
    }
    clear() {
        this._breadcrumbs = [];
    }
    update(model, position) {
        const newElements = this._computeBreadcrumbs(model, position);
        this._breadcrumbs = newElements;
    }
    _computeBreadcrumbs(model, position) {
        let item = model.getItemEnclosingPosition(position);
        if (!item) {
            return [];
        }
        const chain = [];
        while (item) {
            chain.push(item);
            const parent = item.parent;
            if (parent instanceof OutlineModel) {
                break;
            }
            if (parent instanceof OutlineGroup && parent.parent && parent.parent.children.size === 1) {
                break;
            }
            item = parent;
        }
        const result = [];
        for (let i = chain.length - 1; i >= 0; i--) {
            const element = chain[i];
            if (this._isFiltered(element)) {
                break;
            }
            result.push(element);
        }
        if (result.length === 0) {
            return [];
        }
        return result;
    }
    _isFiltered(element) {
        if (!(element instanceof OutlineElement)) {
            return false;
        }
        const key = `breadcrumbs.${DocumentSymbolFilter.kindToConfigName[element.symbol.kind]}`;
        let uri;
        if (this._editor && this._editor.getModel()) {
            const model = this._editor.getModel();
            uri = model.uri;
        }
        return !this._textResourceConfigurationService.getValue(uri, key);
    }
};
DocumentSymbolBreadcrumbsSource = __decorate([
    __param(1, ITextResourceConfigurationService)
], DocumentSymbolBreadcrumbsSource);
let DocumentSymbolsOutline = class DocumentSymbolsOutline {
    get activeElement() {
        const posistion = this._editor.getPosition();
        if (!posistion || !this._outlineModel) {
            return undefined;
        }
        else {
            return this._outlineModel.getItemEnclosingPosition(posistion);
        }
    }
    constructor(_editor, target, firstLoadBarrier, _languageFeaturesService, _codeEditorService, _outlineModelService, _configurationService, _markerDecorationsService, textResourceConfigurationService, instantiationService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._codeEditorService = _codeEditorService;
        this._outlineModelService = _outlineModelService;
        this._configurationService = _configurationService;
        this._markerDecorationsService = _markerDecorationsService;
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._outlineDisposables = new DisposableStore();
        this.outlineKind = 'documentSymbols';
        this._breadcrumbsDataSource = new DocumentSymbolBreadcrumbsSource(_editor, textResourceConfigurationService);
        const delegate = new DocumentSymbolVirtualDelegate();
        const renderers = [
            new DocumentSymbolGroupRenderer(),
            instantiationService.createInstance(DocumentSymbolRenderer, true, target),
        ];
        const treeDataSource = {
            getChildren: (parent) => {
                if (parent instanceof OutlineElement || parent instanceof OutlineGroup) {
                    return parent.children.values();
                }
                if (parent === this && this._outlineModel) {
                    return this._outlineModel.children.values();
                }
                return [];
            },
        };
        const comparator = new DocumentSymbolComparator();
        const initialState = textResourceConfigurationService.getValue(_editor.getModel()?.uri, "outline.collapseItems" /* OutlineConfigKeys.collapseItems */);
        const options = {
            collapseByDefault: target === 2 /* OutlineTarget.Breadcrumbs */ ||
                (target === 1 /* OutlineTarget.OutlinePane */ &&
                    initialState === "alwaysCollapse" /* OutlineConfigCollapseItemsValues.Collapsed */),
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            identityProvider: new DocumentSymbolIdentityProvider(),
            keyboardNavigationLabelProvider: new DocumentSymbolNavigationLabelProvider(),
            accessibilityProvider: new DocumentSymbolAccessibilityProvider(localize('document', 'Document Symbols')),
            filter: target === 1 /* OutlineTarget.OutlinePane */
                ? instantiationService.createInstance(DocumentSymbolFilter, 'outline')
                : target === 2 /* OutlineTarget.Breadcrumbs */
                    ? instantiationService.createInstance(DocumentSymbolFilter, 'breadcrumbs')
                    : undefined,
            dnd: instantiationService.createInstance(DocumentSymbolDragAndDrop),
        };
        this.config = {
            breadcrumbsDataSource: this._breadcrumbsDataSource,
            delegate,
            renderers,
            treeDataSource,
            comparator,
            options,
            quickPickDataSource: {
                getQuickPickElements: () => {
                    throw new Error('not implemented');
                },
            },
        };
        // update as language, model, providers changes
        this._disposables.add(_languageFeaturesService.documentSymbolProvider.onDidChange((_) => this._createOutline()));
        this._disposables.add(this._editor.onDidChangeModel((_) => this._createOutline()));
        this._disposables.add(this._editor.onDidChangeModelLanguage((_) => this._createOutline()));
        // update soon'ish as model content change
        const updateSoon = new TimeoutTimer();
        this._disposables.add(updateSoon);
        this._disposables.add(this._editor.onDidChangeModelContent((event) => {
            const model = this._editor.getModel();
            if (model) {
                const timeout = _outlineModelService.getDebounceValue(model);
                updateSoon.cancelAndSet(() => this._createOutline(event), timeout);
            }
        }));
        // stop when editor dies
        this._disposables.add(this._editor.onDidDispose(() => this._outlineDisposables.clear()));
        // initial load
        this._createOutline().finally(() => firstLoadBarrier.open());
    }
    dispose() {
        this._disposables.dispose();
        this._outlineDisposables.dispose();
    }
    get isEmpty() {
        return !this._outlineModel || TreeElement.empty(this._outlineModel);
    }
    get uri() {
        return this._outlineModel?.uri;
    }
    async reveal(entry, options, sideBySide, select) {
        const model = OutlineModel.get(entry);
        if (!model || !(entry instanceof OutlineElement)) {
            return;
        }
        await this._codeEditorService.openCodeEditor({
            resource: model.uri,
            options: {
                ...options,
                selection: select
                    ? entry.symbol.range
                    : Range.collapseToStart(entry.symbol.selectionRange),
                selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
            },
        }, this._editor, sideBySide);
    }
    preview(entry) {
        if (!(entry instanceof OutlineElement)) {
            return Disposable.None;
        }
        const { symbol } = entry;
        this._editor.revealRangeInCenterIfOutsideViewport(symbol.range, 0 /* ScrollType.Smooth */);
        const decorationsCollection = this._editor.createDecorationsCollection([
            {
                range: symbol.range,
                options: {
                    description: 'document-symbols-outline-range-highlight',
                    className: 'rangeHighlight',
                    isWholeLine: true,
                },
            },
        ]);
        return toDisposable(() => decorationsCollection.clear());
    }
    captureViewState() {
        const viewState = this._editor.saveViewState();
        return toDisposable(() => {
            if (viewState) {
                this._editor.restoreViewState(viewState);
            }
        });
    }
    async _createOutline(contentChangeEvent) {
        this._outlineDisposables.clear();
        if (!contentChangeEvent) {
            this._setOutlineModel(undefined);
        }
        if (!this._editor.hasModel()) {
            return;
        }
        const buffer = this._editor.getModel();
        if (!this._languageFeaturesService.documentSymbolProvider.has(buffer)) {
            return;
        }
        const cts = new CancellationTokenSource();
        const versionIdThen = buffer.getVersionId();
        const timeoutTimer = new TimeoutTimer();
        this._outlineDisposables.add(timeoutTimer);
        this._outlineDisposables.add(toDisposable(() => cts.dispose(true)));
        try {
            const model = await this._outlineModelService.getOrCreate(buffer, cts.token);
            if (cts.token.isCancellationRequested) {
                // cancelled -> do nothing
                return;
            }
            if (TreeElement.empty(model) || !this._editor.hasModel()) {
                // empty -> no outline elements
                this._setOutlineModel(model);
                return;
            }
            // heuristic: when the symbols-to-lines ratio changes by 50% between edits
            // wait a little (and hope that the next change isn't as drastic).
            if (contentChangeEvent && this._outlineModel && buffer.getLineCount() >= 25) {
                const newSize = TreeElement.size(model);
                const newLength = buffer.getValueLength();
                const newRatio = newSize / newLength;
                const oldSize = TreeElement.size(this._outlineModel);
                const oldLength = newLength -
                    contentChangeEvent.changes.reduce((prev, value) => prev + value.rangeLength, 0);
                const oldRatio = oldSize / oldLength;
                if (newRatio <= oldRatio * 0.5 || newRatio >= oldRatio * 1.5) {
                    // wait for a better state and ignore current model when more
                    // typing has happened
                    const value = await raceCancellation(timeout(2000).then(() => true), cts.token, false);
                    if (!value) {
                        return;
                    }
                }
            }
            // feature: show markers with outline element
            this._applyMarkersToOutline(model);
            this._outlineDisposables.add(this._markerDecorationsService.onDidChangeMarker((textModel) => {
                if (isEqual(model.uri, textModel.uri)) {
                    this._applyMarkersToOutline(model);
                    this._onDidChange.fire({});
                }
            }));
            this._outlineDisposables.add(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */) ||
                    e.affectsConfiguration('problems.visibility')) {
                    const problem = this._configurationService.getValue('problems.visibility');
                    const config = this._configurationService.getValue("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */);
                    if (!problem || !config) {
                        model.updateMarker([]);
                    }
                    else {
                        this._applyMarkersToOutline(model);
                    }
                    this._onDidChange.fire({});
                }
                if (e.affectsConfiguration('outline')) {
                    // outline filtering, problems on/off
                    this._onDidChange.fire({});
                }
                if (e.affectsConfiguration('breadcrumbs') && this._editor.hasModel()) {
                    // breadcrumbs filtering
                    this._breadcrumbsDataSource.update(model, this._editor.getPosition());
                    this._onDidChange.fire({});
                }
            }));
            // feature: toggle icons
            this._outlineDisposables.add(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration("outline.icons" /* OutlineConfigKeys.icons */)) {
                    this._onDidChange.fire({});
                }
                if (e.affectsConfiguration('outline')) {
                    this._onDidChange.fire({});
                }
            }));
            // feature: update active when cursor changes
            this._outlineDisposables.add(this._editor.onDidChangeCursorPosition((_) => {
                timeoutTimer.cancelAndSet(() => {
                    if (!buffer.isDisposed() &&
                        versionIdThen === buffer.getVersionId() &&
                        this._editor.hasModel()) {
                        this._breadcrumbsDataSource.update(model, this._editor.getPosition());
                        this._onDidChange.fire({ affectOnlyActiveElement: true });
                    }
                }, 150);
            }));
            // update properties, send event
            this._setOutlineModel(model);
        }
        catch (err) {
            this._setOutlineModel(undefined);
            onUnexpectedError(err);
        }
    }
    _applyMarkersToOutline(model) {
        const problem = this._configurationService.getValue('problems.visibility');
        const config = this._configurationService.getValue("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */);
        if (!model || !problem || !config) {
            return;
        }
        const markers = [];
        for (const [range, marker] of this._markerDecorationsService.getLiveMarkers(model.uri)) {
            if (marker.severity === MarkerSeverity.Error || marker.severity === MarkerSeverity.Warning) {
                markers.push({ ...range, severity: marker.severity });
            }
        }
        model.updateMarker(markers);
    }
    _setOutlineModel(model) {
        const position = this._editor.getPosition();
        if (!position || !model) {
            this._outlineModel = undefined;
            this._breadcrumbsDataSource.clear();
        }
        else {
            if (!this._outlineModel?.merge(model)) {
                this._outlineModel = model;
            }
            this._breadcrumbsDataSource.update(model, position);
        }
        this._onDidChange.fire({});
    }
};
DocumentSymbolsOutline = __decorate([
    __param(3, ILanguageFeaturesService),
    __param(4, ICodeEditorService),
    __param(5, IOutlineModelService),
    __param(6, IConfigurationService),
    __param(7, IMarkerDecorationsService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IInstantiationService)
], DocumentSymbolsOutline);
let DocumentSymbolsOutlineCreator = class DocumentSymbolsOutlineCreator {
    constructor(outlineService) {
        const reg = outlineService.registerOutlineCreator(this);
        this.dispose = () => reg.dispose();
    }
    matches(candidate) {
        const ctrl = candidate.getControl();
        return isCodeEditor(ctrl) || isDiffEditor(ctrl);
    }
    async createOutline(pane, target, _token) {
        const control = pane.getControl();
        let editor;
        if (isCodeEditor(control)) {
            editor = control;
        }
        else if (isDiffEditor(control)) {
            editor = control.getModifiedEditor();
        }
        if (!editor) {
            return undefined;
        }
        const firstLoadBarrier = new Barrier();
        const result = editor.invokeWithinContext((accessor) => accessor
            .get(IInstantiationService)
            .createInstance(DocumentSymbolsOutline, editor, target, firstLoadBarrier));
        await firstLoadBarrier.wait();
        return result;
    }
};
DocumentSymbolsOutlineCreator = __decorate([
    __param(0, IOutlineService)
], DocumentSymbolsOutlineCreator);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DocumentSymbolsOutlineCreator, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTeW1ib2xzT3V0bGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9vdXRsaW5lL2RvY3VtZW50U3ltYm9sc091dGxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFNTixlQUFlLEdBSWYsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUc5RSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLG1DQUFtQyxFQUNuQyxzQkFBc0IsRUFDdEIsb0JBQW9CLEVBQ3BCLDJCQUEyQixFQUMzQiw4QkFBOEIsRUFDOUIscUNBQXFDLEVBQ3JDLDZCQUE2QixFQUM3Qix5QkFBeUIsR0FDekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixZQUFZLEVBQ1osY0FBYyxFQUNkLFlBQVksRUFDWixXQUFXLEVBRVgsb0JBQW9CLEdBQ3BCLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLE9BQU8sRUFDUCxPQUFPLEdBQ1AsTUFBTSxxQ0FBcUMsQ0FB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