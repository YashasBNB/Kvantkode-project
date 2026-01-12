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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTeW1ib2xzT3V0bGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL291dGxpbmUvZG9jdW1lbnRTeW1ib2xzT3V0bGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQU1OLGVBQWUsR0FJZixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRzlFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsbUNBQW1DLEVBQ25DLHNCQUFzQixFQUN0QixvQkFBb0IsRUFDcEIsMkJBQTJCLEVBQzNCLDhCQUE4QixFQUM5QixxQ0FBcUMsRUFDckMsNkJBQTZCLEVBQzdCLHlCQUF5QixHQUN6QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFFTixZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLFlBQVksRUFDWixjQUFjLEVBQ2QsWUFBWSxFQUNaLFdBQVcsRUFFWCxvQkFBb0IsR0FDcEIsTUFBTSx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osT0FBTyxFQUNQLE9BQU8sR0FDUCxNQUFNLHFDQUFx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