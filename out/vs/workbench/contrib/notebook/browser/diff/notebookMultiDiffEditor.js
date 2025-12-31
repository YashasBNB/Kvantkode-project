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
var NotebookMultiTextDiffEditor_1;
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { INotebookEditorWorkerService } from '../../common/services/notebookWorkerService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { BareFontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { CellUri, NOTEBOOK_MULTI_DIFF_EDITOR_ID, } from '../../common/notebookCommon.js';
import { FontMeasurements } from '../../../../../editor/browser/config/fontMeasurements.js';
import { NotebookOptions } from '../notebookOptions.js';
import { INotebookService } from '../../common/notebookService.js';
import { NotebookMultiDiffEditorWidgetInput, } from './notebookMultiDiffEditorInput.js';
import { MultiDiffEditorWidget } from '../../../../../editor/browser/widget/multiDiffEditor/multiDiffEditorWidget.js';
import { ResourceLabel } from '../../../../browser/labels.js';
import { INotebookDocumentService } from '../../../../services/notebook/common/notebookDocumentService.js';
import { localize } from '../../../../../nls.js';
import { Schemas } from '../../../../../base/common/network.js';
import { getIconClassesForLanguageId } from '../../../../../editor/common/services/getIconClasses.js';
import { NotebookDiffViewModel } from './notebookDiffViewModel.js';
import { NotebookDiffEditorEventDispatcher } from './eventDispatcher.js';
import { NOTEBOOK_DIFF_CELLS_COLLAPSED, NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS, NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN, } from './notebookDiffEditorBrowser.js';
import { autorun, transaction } from '../../../../../base/common/observable.js';
import { DiffEditorHeightCalculatorService } from './editorHeightCalculator.js';
let NotebookMultiTextDiffEditor = class NotebookMultiTextDiffEditor extends EditorPane {
    static { NotebookMultiTextDiffEditor_1 = this; }
    static { this.ID = NOTEBOOK_MULTI_DIFF_EDITOR_ID; }
    get textModel() {
        return this._model?.modified.notebook;
    }
    get notebookOptions() {
        return this._notebookOptions;
    }
    constructor(group, instantiationService, themeService, _parentContextKeyService, notebookEditorWorkerService, configurationService, telemetryService, storageService, notebookService) {
        super(NotebookMultiTextDiffEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this._parentContextKeyService = _parentContextKeyService;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.configurationService = configurationService;
        this.notebookService = notebookService;
        this.modelSpecificResources = this._register(new DisposableStore());
        this.ctxAllCollapsed = this._parentContextKeyService.createKey(NOTEBOOK_DIFF_CELLS_COLLAPSED.key, false);
        this.ctxHasUnchangedCells = this._parentContextKeyService.createKey(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key, false);
        this.ctxHiddenUnchangedCells = this._parentContextKeyService.createKey(NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN.key, true);
        this._notebookOptions = instantiationService.createInstance(NotebookOptions, this.window, false, undefined);
        this._register(this._notebookOptions);
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
        }
        return this._fontInfo;
    }
    layout(dimension, position) {
        this._multiDiffEditorWidget.layout(dimension);
    }
    createFontInfo() {
        const editorOptions = this.configurationService.getValue('editor');
        return FontMeasurements.readFontInfo(this.window, BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(this.window).value));
    }
    createEditor(parent) {
        this._multiDiffEditorWidget = this._register(this.instantiationService.createInstance(MultiDiffEditorWidget, parent, this.instantiationService.createInstance(WorkbenchUIElementFactory)));
        this._register(this._multiDiffEditorWidget.onDidChangeActiveControl(() => {
            this._onDidChangeControl.fire();
        }));
    }
    async setInput(input, options, context, token) {
        super.setInput(input, options, context, token);
        const model = await input.resolve();
        if (this._model !== model) {
            this._detachModel();
            this._model = model;
        }
        const eventDispatcher = this.modelSpecificResources.add(new NotebookDiffEditorEventDispatcher());
        const diffEditorHeightCalculator = this.instantiationService.createInstance(DiffEditorHeightCalculatorService, this.fontInfo.lineHeight);
        this.viewModel = this.modelSpecificResources.add(new NotebookDiffViewModel(model, this.notebookEditorWorkerService, this.configurationService, eventDispatcher, this.notebookService, diffEditorHeightCalculator, undefined, true));
        await this.viewModel.computeDiff(this.modelSpecificResources.add(new CancellationTokenSource()).token);
        this.ctxHasUnchangedCells.set(this.viewModel.hasUnchangedCells);
        this.ctxHasUnchangedCells.set(this.viewModel.hasUnchangedCells);
        const widgetInput = this.modelSpecificResources.add(NotebookMultiDiffEditorWidgetInput.createInput(this.viewModel, this.instantiationService));
        this.widgetViewModel = this.modelSpecificResources.add(await widgetInput.getViewModel());
        const itemsWeHaveSeen = new WeakSet();
        this.modelSpecificResources.add(autorun((reader) => {
            /** @description NotebookDiffEditor => Collapse unmodified items */
            if (!this.widgetViewModel || !this.viewModel) {
                return;
            }
            const items = this.widgetViewModel.items.read(reader);
            const diffItems = this.viewModel.value;
            if (items.length !== diffItems.length) {
                return;
            }
            // If cell has not changed, but metadata or output has changed, then collapse the cell & keep output/metadata expanded.
            // Similarly if the cell has changed, but the metadata or output has not, then expand the cell, but collapse output/metadata.
            transaction((tx) => {
                items.forEach((item) => {
                    // We do not want to mess with UI state if users change it, hence no need to collapse again.
                    if (itemsWeHaveSeen.has(item)) {
                        return;
                    }
                    itemsWeHaveSeen.add(item);
                    const diffItem = diffItems.find((d) => d.modifiedUri?.toString() === item.modifiedUri?.toString() &&
                        d.originalUri?.toString() === item.originalUri?.toString());
                    if (diffItem && diffItem.type === 'unchanged') {
                        item.collapsed.set(true, tx);
                    }
                });
            });
        }));
        this._multiDiffEditorWidget.setViewModel(this.widgetViewModel);
    }
    _detachModel() {
        this.viewModel = undefined;
        this.modelSpecificResources.clear();
    }
    _generateFontFamily() {
        return (this.fontInfo.fontFamily ??
            `"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`);
    }
    setOptions(options) {
        super.setOptions(options);
    }
    getControl() {
        return this._multiDiffEditorWidget.getActiveControl();
    }
    focus() {
        super.focus();
        this._multiDiffEditorWidget?.getActiveControl()?.focus();
    }
    hasFocus() {
        return this._multiDiffEditorWidget?.getActiveControl()?.hasTextFocus() || super.hasFocus();
    }
    clearInput() {
        super.clearInput();
        this._multiDiffEditorWidget.setViewModel(undefined);
        this.modelSpecificResources.clear();
        this.viewModel = undefined;
        this.widgetViewModel = undefined;
    }
    expandAll() {
        if (this.widgetViewModel) {
            this.widgetViewModel.expandAll();
            this.ctxAllCollapsed.set(false);
        }
    }
    collapseAll() {
        if (this.widgetViewModel) {
            this.widgetViewModel.collapseAll();
            this.ctxAllCollapsed.set(true);
        }
    }
    hideUnchanged() {
        if (this.viewModel) {
            this.viewModel.includeUnchanged = false;
            this.ctxHiddenUnchangedCells.set(true);
        }
    }
    showUnchanged() {
        if (this.viewModel) {
            this.viewModel.includeUnchanged = true;
            this.ctxHiddenUnchangedCells.set(false);
        }
    }
    getDiffElementViewModel(uri) {
        if (uri.scheme === Schemas.vscodeNotebookCellOutput ||
            uri.scheme === Schemas.vscodeNotebookCellOutputDiff ||
            uri.scheme === Schemas.vscodeNotebookCellMetadata ||
            uri.scheme === Schemas.vscodeNotebookCellMetadataDiff) {
            const data = CellUri.parseCellPropertyUri(uri, uri.scheme);
            if (data) {
                uri = CellUri.generate(data.notebook, data.handle);
            }
        }
        if (uri.scheme === Schemas.vscodeNotebookMetadata) {
            return this.viewModel?.items.find((item) => item.type === 'modifiedMetadata' || item.type === 'unchangedMetadata');
        }
        return this.viewModel?.items.find((c) => {
            switch (c.type) {
                case 'delete':
                    return c.original?.uri.toString() === uri.toString();
                case 'insert':
                    return c.modified?.uri.toString() === uri.toString();
                case 'modified':
                case 'unchanged':
                    return (c.modified?.uri.toString() === uri.toString() ||
                        c.original?.uri.toString() === uri.toString());
                default:
                    return;
            }
        });
    }
};
NotebookMultiTextDiffEditor = NotebookMultiTextDiffEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, INotebookEditorWorkerService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, IStorageService),
    __param(8, INotebookService)
], NotebookMultiTextDiffEditor);
export { NotebookMultiTextDiffEditor };
let WorkbenchUIElementFactory = class WorkbenchUIElementFactory {
    constructor(_instantiationService, notebookDocumentService, notebookService) {
        this._instantiationService = _instantiationService;
        this.notebookDocumentService = notebookDocumentService;
        this.notebookService = notebookService;
    }
    createResourceLabel(element) {
        const label = this._instantiationService.createInstance(ResourceLabel, element, {});
        const that = this;
        return {
            setUri(uri, options = {}) {
                if (!uri) {
                    label.element.clear();
                }
                else {
                    let name = '';
                    let description = '';
                    let extraClasses = undefined;
                    if (uri.scheme === Schemas.vscodeNotebookCell) {
                        const notebookDocument = uri.scheme === Schemas.vscodeNotebookCell
                            ? that.notebookDocumentService.getNotebook(uri)
                            : undefined;
                        const cellIndex = Schemas.vscodeNotebookCell
                            ? that.notebookDocumentService.getNotebook(uri)?.getCellIndex(uri)
                            : undefined;
                        if (notebookDocument && cellIndex !== undefined) {
                            name = localize('notebookCellLabel', 'Cell {0}', `${cellIndex + 1}`);
                            const nb = notebookDocument
                                ? that.notebookService.getNotebookTextModel(notebookDocument?.uri)
                                : undefined;
                            const cellLanguage = nb && cellIndex !== undefined ? nb.cells[cellIndex].language : undefined;
                            extraClasses = cellLanguage ? getIconClassesForLanguageId(cellLanguage) : undefined;
                        }
                    }
                    else if (uri.scheme === Schemas.vscodeNotebookCellMetadata ||
                        uri.scheme === Schemas.vscodeNotebookCellMetadataDiff) {
                        description = localize('notebookCellMetadataLabel', 'Metadata');
                    }
                    else if (uri.scheme === Schemas.vscodeNotebookCellOutput ||
                        uri.scheme === Schemas.vscodeNotebookCellOutputDiff) {
                        description = localize('notebookCellOutputLabel', 'Output');
                    }
                    label.element.setResource({ name, description }, {
                        strikethrough: options.strikethrough,
                        forceLabel: true,
                        hideIcon: !extraClasses,
                        extraClasses,
                    });
                }
            },
            dispose() {
                label.dispose();
            },
        };
    }
};
WorkbenchUIElementFactory = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookDocumentService),
    __param(2, INotebookService)
], WorkbenchUIElementFactory);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNdWx0aURpZmZFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tNdWx0aURpZmZFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBT2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHcEYsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxZQUFZLEVBQVksTUFBTSxpREFBaUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sT0FBTyxFQUVQLDZCQUE2QixHQUM3QixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEVBRU4sa0NBQWtDLEdBQ2xDLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDckgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTdELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQzFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDeEUsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixpQ0FBaUMsRUFDakMsb0NBQW9DLEdBQ3BDLE1BQU0sZ0NBQWdDLENBQUE7QUFPdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV4RSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7O2FBRTFDLE9BQUUsR0FBVyw2QkFBNkIsQUFBeEMsQ0FBd0M7SUFPMUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUE7SUFDdEMsQ0FBQztJQUVELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBY0QsWUFDQyxLQUFtQixFQUNJLG9CQUE0RCxFQUNwRSxZQUEyQixFQUN0Qix3QkFBNkQsRUFFakYsMkJBQTBFLEVBQ25ELG9CQUE0RCxFQUNoRSxnQkFBbUMsRUFDckMsY0FBK0IsRUFDOUIsZUFBa0Q7UUFFcEUsS0FBSyxDQUFDLDZCQUEyQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBVnBELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFOUMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUFvQjtRQUVoRSxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQThCO1FBQ2xDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFHaEQsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBbENwRCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQVc5RCxvQkFBZSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQ3pFLDZCQUE2QixDQUFDLEdBQUcsRUFDakMsS0FBSyxDQUNMLENBQUE7UUFDZ0IseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FDOUUsaUNBQWlDLENBQUMsR0FBRyxFQUNyQyxLQUFLLENBQ0wsQ0FBQTtRQUNnQiw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsU0FBUyxDQUNqRixvQ0FBb0MsQ0FBQyxHQUFHLEVBQ3hDLElBQUksQ0FDSixDQUFBO1FBZUEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDMUQsZUFBZSxFQUNmLElBQUksQ0FBQyxNQUFNLEVBQ1gsS0FBSyxFQUNMLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsSUFBWSxRQUFRO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdkMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBQ1EsTUFBTSxDQUFDLFNBQXdCLEVBQUUsUUFBMkI7UUFDcEUsSUFBSSxDQUFDLHNCQUF1QixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFxQixRQUFRLENBQUMsQ0FBQTtRQUN0RixPQUFPLGdCQUFnQixDQUFDLFlBQVksQ0FDbkMsSUFBSSxDQUFDLE1BQU0sRUFDWCxZQUFZLENBQUMscUJBQXFCLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUM1RixDQUFBO0lBQ0YsQ0FBQztJQUVTLFlBQVksQ0FBQyxNQUFtQjtRQUN6QyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDM0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQ25FLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRTtZQUN6RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDaEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFDUSxLQUFLLENBQUMsUUFBUSxDQUN0QixLQUFtQyxFQUNuQyxPQUE0QyxFQUM1QyxPQUEyQixFQUMzQixLQUF3QjtRQUV4QixLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLE1BQU0sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ25DLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDcEIsQ0FBQztRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxpQ0FBaUMsRUFBRSxDQUFDLENBQUE7UUFDaEcsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMxRSxpQ0FBaUMsRUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQ3hCLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQy9DLElBQUkscUJBQXFCLENBQ3hCLEtBQUssRUFDTCxJQUFJLENBQUMsMkJBQTJCLEVBQ2hDLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsZUFBZSxFQUNmLElBQUksQ0FBQyxlQUFlLEVBQ3BCLDBCQUEwQixFQUMxQixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQ0QsQ0FBQTtRQUNELE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQy9CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUNwRSxDQUFBO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFL0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FDbEQsa0NBQWtDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQ3pGLENBQUE7UUFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUV4RixNQUFNLGVBQWUsR0FBRyxJQUFJLE9BQU8sRUFBNkIsQ0FBQTtRQUNoRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUM5QixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQixtRUFBbUU7WUFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzlDLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3JELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFBO1lBQ3RDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU07WUFDUCxDQUFDO1lBRUQsdUhBQXVIO1lBQ3ZILDZIQUE2SDtZQUM3SCxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUN0Qiw0RkFBNEY7b0JBQzVGLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUMvQixPQUFNO29CQUNQLENBQUM7b0JBQ0QsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDekIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FDOUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUU7d0JBQzFELENBQUMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FDM0QsQ0FBQTtvQkFDRCxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO3dCQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7b0JBQzdCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsc0JBQXVCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUMxQixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQUNELG1CQUFtQjtRQUNsQixPQUFPLENBQ04sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3hCLG9IQUFvSCxDQUNwSCxDQUFBO0lBQ0YsQ0FBQztJQUNRLFVBQVUsQ0FBQyxPQUE0QztRQUMvRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFFUSxVQUFVO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLHNCQUF1QixDQUFDLGdCQUFnQixFQUFFLENBQUE7SUFDdkQsQ0FBQztJQUVRLEtBQUs7UUFDYixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFYixJQUFJLENBQUMsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUN6RCxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUMzRixDQUFDO0lBRVEsVUFBVTtRQUNsQixLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbEIsSUFBSSxDQUFDLHNCQUF1QixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDMUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7SUFDakMsQ0FBQztJQUVNLFNBQVM7UUFDZixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQ2hDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBQ00sV0FBVztRQUNqQixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ2xDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRU0sYUFBYTtRQUNuQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtZQUN2QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRU0sYUFBYTtRQUNuQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQTtZQUN0QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRU0sdUJBQXVCLENBQUMsR0FBUTtRQUN0QyxJQUNDLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLHdCQUF3QjtZQUMvQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyw0QkFBNEI7WUFDbkQsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsMEJBQTBCO1lBQ2pELEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLDhCQUE4QixFQUNwRCxDQUFDO1lBQ0YsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDMUQsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNuRCxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FDaEMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssa0JBQWtCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxtQkFBbUIsQ0FDL0UsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoQixLQUFLLFFBQVE7b0JBQ1osT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3JELEtBQUssUUFBUTtvQkFDWixPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDckQsS0FBSyxVQUFVLENBQUM7Z0JBQ2hCLEtBQUssV0FBVztvQkFDZixPQUFPLENBQ04sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssR0FBRyxDQUFDLFFBQVEsRUFBRTt3QkFDN0MsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUM3QyxDQUFBO2dCQUNGO29CQUNDLE9BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQW5RVywyQkFBMkI7SUErQnJDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsNEJBQTRCLENBQUE7SUFFNUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxnQkFBZ0IsQ0FBQTtHQXZDTiwyQkFBMkIsQ0FvUXZDOztBQUVELElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBQzlCLFlBQ3lDLHFCQUE0QyxFQUN6Qyx1QkFBaUQsRUFDekQsZUFBaUM7UUFGNUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUN6Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ3pELG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtJQUNsRSxDQUFDO0lBRUosbUJBQW1CLENBQUMsT0FBb0I7UUFDdkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixPQUFPO1lBQ04sTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLEdBQUcsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUNWLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3RCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUE7b0JBQ2IsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFBO29CQUNwQixJQUFJLFlBQVksR0FBeUIsU0FBUyxDQUFBO29CQUVsRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7d0JBQy9DLE1BQU0sZ0JBQWdCLEdBQ3JCLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGtCQUFrQjs0QkFDeEMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDOzRCQUMvQyxDQUFDLENBQUMsU0FBUyxDQUFBO3dCQUNiLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0I7NEJBQzNDLENBQUMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFlBQVksQ0FBQyxHQUFHLENBQUM7NEJBQ2xFLENBQUMsQ0FBQyxTQUFTLENBQUE7d0JBQ1osSUFBSSxnQkFBZ0IsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7NEJBQ2pELElBQUksR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLEdBQUcsU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7NEJBQ3BFLE1BQU0sRUFBRSxHQUFHLGdCQUFnQjtnQ0FDMUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDO2dDQUNsRSxDQUFDLENBQUMsU0FBUyxDQUFBOzRCQUNaLE1BQU0sWUFBWSxHQUNqQixFQUFFLElBQUksU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTs0QkFDekUsWUFBWSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTt3QkFDcEYsQ0FBQztvQkFDRixDQUFDO3lCQUFNLElBQ04sR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsMEJBQTBCO3dCQUNqRCxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyw4QkFBOEIsRUFDcEQsQ0FBQzt3QkFDRixXQUFXLEdBQUcsUUFBUSxDQUFDLDJCQUEyQixFQUFFLFVBQVUsQ0FBQyxDQUFBO29CQUNoRSxDQUFDO3lCQUFNLElBQ04sR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsd0JBQXdCO3dCQUMvQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyw0QkFBNEIsRUFDbEQsQ0FBQzt3QkFDRixXQUFXLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxDQUFBO29CQUM1RCxDQUFDO29CQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUN4QixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsRUFDckI7d0JBQ0MsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhO3dCQUNwQyxVQUFVLEVBQUUsSUFBSTt3QkFDaEIsUUFBUSxFQUFFLENBQUMsWUFBWTt3QkFDdkIsWUFBWTtxQkFDWixDQUNELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPO2dCQUNOLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNoQixDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBaEVLLHlCQUF5QjtJQUU1QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpiLHlCQUF5QixDQWdFOUIifQ==