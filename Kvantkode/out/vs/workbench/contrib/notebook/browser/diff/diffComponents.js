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
import * as DOM from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { getFormattedOutputJSON, outputEqual, OUTPUT_EDITOR_HEIGHT_MAGIC, PropertyFoldingState, SideBySideDiffElementViewModel, NotebookDocumentMetadataViewModel, } from './diffElementViewModel.js';
import { DiffSide, DIFF_CELL_MARGIN, NOTEBOOK_DIFF_CELL_INPUT, NOTEBOOK_DIFF_CELL_PROPERTY, NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED, NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE, NOTEBOOK_DIFF_METADATA, } from './notebookDiffEditorBrowser.js';
import { CodeEditorWidget, } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { CellUri } from '../../common/notebookCommon.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { getFlatActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { CodiconActionViewItem } from '../view/cellParts/cellActionView.js';
import { collapsedIcon, expandedIcon } from '../notebookIcons.js';
import { OutputContainer } from './diffElementOutputs.js';
import { EditorExtensionsRegistry } from '../../../../../editor/browser/editorExtensions.js';
import { ContextMenuController } from '../../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SuggestController } from '../../../../../editor/contrib/suggest/browser/suggestController.js';
import { MenuPreventer } from '../../../codeEditor/browser/menuPreventer.js';
import { SelectionClipboardContributionID } from '../../../codeEditor/browser/selectionClipboard.js';
import { TabCompletionController } from '../../../snippets/browser/tabCompletion.js';
import { renderIcon, renderLabelWithIcons, } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { WorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { fixedDiffEditorOptions, fixedEditorOptions, getEditorPadding, } from './diffCellEditorOptions.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { DiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { localize } from '../../../../../nls.js';
import { Emitter } from '../../../../../base/common/event.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { getFormattedMetadataJSON } from '../../common/model/notebookCellTextModel.js';
import { getUnchangedRegionSettings } from './unchangedEditorRegions.js';
export function getOptimizedNestedCodeEditorWidgetOptions() {
    return {
        isSimpleWidget: false,
        contributions: EditorExtensionsRegistry.getSomeEditorContributions([
            MenuPreventer.ID,
            SelectionClipboardContributionID,
            ContextMenuController.ID,
            SuggestController.ID,
            SnippetController2.ID,
            TabCompletionController.ID,
        ]),
    };
}
export class CellDiffPlaceholderElement extends Disposable {
    constructor(placeholder, templateData) {
        super();
        templateData.body.classList.remove('left', 'right', 'full');
        const text = placeholder.hiddenCells.length === 1
            ? localize('hiddenCell', '{0} hidden cell', placeholder.hiddenCells.length)
            : localize('hiddenCells', '{0} hidden cells', placeholder.hiddenCells.length);
        templateData.placeholder.innerText = text;
        this._register(DOM.addDisposableListener(templateData.placeholder, 'dblclick', (e) => {
            if (e.button !== 0) {
                return;
            }
            e.preventDefault();
            placeholder.showHiddenCells();
        }));
        this._register(templateData.marginOverlay.onAction(() => placeholder.showHiddenCells()));
        templateData.marginOverlay.show();
    }
}
let PropertyHeader = class PropertyHeader extends Disposable {
    constructor(cell, propertyHeaderContainer, notebookEditor, accessor, contextMenuService, keybindingService, commandService, notificationService, menuService, contextKeyService, themeService, telemetryService, accessibilityService) {
        super();
        this.cell = cell;
        this.propertyHeaderContainer = propertyHeaderContainer;
        this.notebookEditor = notebookEditor;
        this.accessor = accessor;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.themeService = themeService;
        this.telemetryService = telemetryService;
        this.accessibilityService = accessibilityService;
    }
    buildHeader() {
        this._foldingIndicator = DOM.append(this.propertyHeaderContainer, DOM.$('.property-folding-indicator'));
        this._foldingIndicator.classList.add(this.accessor.prefix);
        const metadataStatus = DOM.append(this.propertyHeaderContainer, DOM.$('div.property-status'));
        this._statusSpan = DOM.append(metadataStatus, DOM.$('span'));
        this._description = DOM.append(metadataStatus, DOM.$('span.property-description'));
        const cellToolbarContainer = DOM.append(this.propertyHeaderContainer, DOM.$('div.property-toolbar'));
        this._toolbar = this._register(new WorkbenchToolBar(cellToolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    const item = new CodiconActionViewItem(action, { hoverDelegate: options.hoverDelegate }, this.keybindingService, this.notificationService, this.contextKeyService, this.themeService, this.contextMenuService, this.accessibilityService);
                    return item;
                }
                return undefined;
            },
        }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService));
        this._toolbar.context = this.cell;
        const scopedContextKeyService = this.contextKeyService.createScoped(cellToolbarContainer);
        this._register(scopedContextKeyService);
        this._propertyChanged = NOTEBOOK_DIFF_CELL_PROPERTY.bindTo(scopedContextKeyService);
        this._propertyExpanded = NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED.bindTo(scopedContextKeyService);
        this._menu = this._register(this.menuService.createMenu(this.accessor.menuId, scopedContextKeyService));
        this._register(this._menu.onDidChange(() => this.updateMenu()));
        this._register(this.notebookEditor.onMouseUp((e) => {
            if (!e.event.target || e.target !== this.cell) {
                return;
            }
            const target = e.event.target;
            if (target === this.propertyHeaderContainer ||
                target === this._foldingIndicator ||
                this._foldingIndicator.contains(target) ||
                target === metadataStatus ||
                metadataStatus.contains(target)) {
                const oldFoldingState = this.accessor.getFoldingState();
                this.accessor.updateFoldingState(oldFoldingState === PropertyFoldingState.Expanded
                    ? PropertyFoldingState.Collapsed
                    : PropertyFoldingState.Expanded);
                this._updateFoldingIcon();
                this.accessor.updateInfoRendering(this.cell.renderOutput);
            }
        }));
        this.refresh();
        this.accessor.updateInfoRendering(this.cell.renderOutput);
    }
    refresh() {
        this.updateMenu();
        this._updateFoldingIcon();
        const metadataChanged = this.accessor.checkIfModified();
        if (this._propertyChanged) {
            this._propertyChanged.set(!!metadataChanged);
        }
        if (metadataChanged) {
            this._statusSpan.textContent = this.accessor.changedLabel;
            this._statusSpan.style.fontWeight = 'bold';
            if (metadataChanged.reason) {
                this._description.textContent = metadataChanged.reason;
            }
            this.propertyHeaderContainer.classList.add('modified');
        }
        else {
            this._statusSpan.textContent = this.accessor.unChangedLabel;
            this._statusSpan.style.fontWeight = 'normal';
            this._description.textContent = '';
            this.propertyHeaderContainer.classList.remove('modified');
        }
    }
    updateMenu() {
        const metadataChanged = this.accessor.checkIfModified();
        if (metadataChanged) {
            const actions = getFlatActionBarActions(this._menu.getActions({ shouldForwardArgs: true }));
            this._toolbar.setActions(actions);
        }
        else {
            this._toolbar.setActions([]);
        }
    }
    _updateFoldingIcon() {
        if (this.accessor.getFoldingState() === PropertyFoldingState.Collapsed) {
            DOM.reset(this._foldingIndicator, renderIcon(collapsedIcon));
            this._propertyExpanded?.set(false);
        }
        else {
            DOM.reset(this._foldingIndicator, renderIcon(expandedIcon));
            this._propertyExpanded?.set(true);
        }
    }
};
PropertyHeader = __decorate([
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, ICommandService),
    __param(7, INotificationService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, IThemeService),
    __param(11, ITelemetryService),
    __param(12, IAccessibilityService)
], PropertyHeader);
let NotebookDocumentMetadataElement = class NotebookDocumentMetadataElement extends Disposable {
    constructor(notebookEditor, viewModel, templateData, instantiationService, textModelService, menuService, contextKeyService, textConfigurationService, configurationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewModel = viewModel;
        this.templateData = templateData;
        this.instantiationService = instantiationService;
        this.textModelService = textModelService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.textConfigurationService = textConfigurationService;
        this.configurationService = configurationService;
        this._editor = templateData.sourceEditor;
        this._cellHeaderContainer = this.templateData.cellHeaderContainer;
        this._editorContainer = this.templateData.editorContainer;
        this._diffEditorContainer = this.templateData.diffEditorContainer;
        this._editorViewStateChanged = false;
        // init
        this._register(viewModel.onDidLayoutChange((e) => {
            this.layout(e);
            this.updateBorders();
        }));
        this.buildBody();
        this.updateBorders();
    }
    buildBody() {
        const body = this.templateData.body;
        body.classList.remove('full');
        body.classList.add('full');
        this.updateSourceEditor();
        if (this.viewModel instanceof NotebookDocumentMetadataViewModel) {
            this._register(this.viewModel.modifiedMetadata.onDidChange((e) => {
                this._cellHeader.refresh();
            }));
        }
    }
    layoutNotebookCell() {
        this.notebookEditor.layoutNotebookCell(this.viewModel, this.viewModel.layoutInfo.totalHeight);
    }
    updateBorders() {
        this.templateData.leftBorder.style.height = `${this.viewModel.layoutInfo.totalHeight - 32}px`;
        this.templateData.rightBorder.style.height = `${this.viewModel.layoutInfo.totalHeight - 32}px`;
        this.templateData.bottomBorder.style.top = `${this.viewModel.layoutInfo.totalHeight - 32}px`;
    }
    updateSourceEditor() {
        this._cellHeaderContainer.style.display = 'flex';
        this._cellHeaderContainer.innerText = '';
        this._editorContainer.classList.add('diff');
        const updateSourceEditor = () => {
            if (this.viewModel.cellFoldingState === PropertyFoldingState.Collapsed) {
                this._editorContainer.style.display = 'none';
                this.viewModel.editorHeight = 0;
                return;
            }
            const lineHeight = this.notebookEditor.getLayoutInfo().fontInfo.lineHeight || 17;
            const editorHeight = this.viewModel.layoutInfo.editorHeight !== 0
                ? this.viewModel.layoutInfo.editorHeight
                : this.viewModel.computeInputEditorHeight(lineHeight);
            this._editorContainer.style.height = `${editorHeight}px`;
            this._editorContainer.style.display = 'block';
            const contentHeight = this._editor.getContentHeight();
            if (contentHeight >= 0) {
                this.viewModel.editorHeight = contentHeight;
            }
            return editorHeight;
        };
        const renderSourceEditor = () => {
            const editorHeight = updateSourceEditor();
            if (!editorHeight) {
                return;
            }
            // If there is only 1 line, then ensure we have the necessary padding to display the button for whitespaces.
            // E.g. assume we have a cell with 1 line and we add some whitespace,
            // Then diff editor displays the button `Show Whitespace Differences`, however with 12 paddings on the top, the
            // button can get cut off.
            const lineCount = this.viewModel.modifiedMetadata.textBuffer.getLineCount();
            const options = {
                padding: getEditorPadding(lineCount),
            };
            const unchangedRegions = this._register(getUnchangedRegionSettings(this.configurationService));
            if (unchangedRegions.options.enabled) {
                options.hideUnchangedRegions = unchangedRegions.options;
            }
            this._editor.updateOptions(options);
            this._register(unchangedRegions.onDidChangeEnablement(() => {
                options.hideUnchangedRegions = unchangedRegions.options;
                this._editor.updateOptions(options);
            }));
            this._editor.layout({
                width: this.notebookEditor.getLayoutInfo().width - 2 * DIFF_CELL_MARGIN,
                height: editorHeight,
            });
            this._register(this._editor.onDidContentSizeChange((e) => {
                if (this.viewModel.cellFoldingState === PropertyFoldingState.Expanded &&
                    e.contentHeightChanged &&
                    this.viewModel.layoutInfo.editorHeight !== e.contentHeight) {
                    this.viewModel.editorHeight = e.contentHeight;
                }
            }));
            this._initializeSourceDiffEditor();
        };
        this._cellHeader = this._register(this.instantiationService.createInstance(PropertyHeader, this.viewModel, this._cellHeaderContainer, this.notebookEditor, {
            updateInfoRendering: () => renderSourceEditor(),
            checkIfModified: () => {
                return this.viewModel.originalMetadata.getHash() !==
                    this.viewModel.modifiedMetadata.getHash()
                    ? { reason: undefined }
                    : false;
            },
            getFoldingState: () => this.viewModel.cellFoldingState,
            updateFoldingState: (state) => (this.viewModel.cellFoldingState = state),
            unChangedLabel: 'Notebook Metadata',
            changedLabel: 'Notebook Metadata changed',
            prefix: 'metadata',
            menuId: MenuId.NotebookDiffDocumentMetadata,
        }));
        this._cellHeader.buildHeader();
        renderSourceEditor();
        const scopedContextKeyService = this.contextKeyService.createScoped(this.templateData.inputToolbarContainer);
        this._register(scopedContextKeyService);
        const inputChanged = NOTEBOOK_DIFF_METADATA.bindTo(scopedContextKeyService);
        inputChanged.set(this.viewModel.originalMetadata.getHash() !== this.viewModel.modifiedMetadata.getHash());
        this._toolbar = this.templateData.toolbar;
        this._toolbar.context = this.viewModel;
        const refreshToolbar = () => {
            const hasChanges = this.viewModel.originalMetadata.getHash() !== this.viewModel.modifiedMetadata.getHash();
            inputChanged.set(hasChanges);
            if (hasChanges) {
                const menu = this.menuService.getMenuActions(MenuId.NotebookDiffDocumentMetadata, scopedContextKeyService, { shouldForwardArgs: true });
                const actions = getFlatActionBarActions(menu);
                this._toolbar.setActions(actions);
            }
            else {
                this._toolbar.setActions([]);
            }
        };
        this._register(this.viewModel.modifiedMetadata.onDidChange(() => {
            refreshToolbar();
        }));
        refreshToolbar();
    }
    async _initializeSourceDiffEditor() {
        const [originalRef, modifiedRef] = await Promise.all([
            this.textModelService.createModelReference(this.viewModel.originalMetadata.uri),
            this.textModelService.createModelReference(this.viewModel.modifiedMetadata.uri),
        ]);
        if (this._store.isDisposed) {
            originalRef.dispose();
            modifiedRef.dispose();
            return;
        }
        this._register(originalRef);
        this._register(modifiedRef);
        const vm = this._register(this._editor.createViewModel({
            original: originalRef.object.textEditorModel,
            modified: modifiedRef.object.textEditorModel,
        }));
        // Reduces flicker (compute this before setting the model)
        // Else when the model is set, the height of the editor will be x, after diff is computed, then height will be y.
        // & that results in flicker.
        await vm.waitForDiff();
        this._editor.setModel(vm);
        const handleViewStateChange = () => {
            this._editorViewStateChanged = true;
        };
        const handleScrollChange = (e) => {
            if (e.scrollTopChanged || e.scrollLeftChanged) {
                this._editorViewStateChanged = true;
            }
        };
        this.updateEditorOptionsForWhitespace();
        this._register(this._editor.getOriginalEditor().onDidChangeCursorSelection(handleViewStateChange));
        this._register(this._editor.getOriginalEditor().onDidScrollChange(handleScrollChange));
        this._register(this._editor.getModifiedEditor().onDidChangeCursorSelection(handleViewStateChange));
        this._register(this._editor.getModifiedEditor().onDidScrollChange(handleScrollChange));
        const editorViewState = this.viewModel.getSourceEditorViewState();
        if (editorViewState) {
            this._editor.restoreViewState(editorViewState);
        }
        const contentHeight = this._editor.getContentHeight();
        this.viewModel.editorHeight = contentHeight;
    }
    updateEditorOptionsForWhitespace() {
        const editor = this._editor;
        const uri = editor.getModel()?.modified.uri || editor.getModel()?.original.uri;
        if (!uri) {
            return;
        }
        const ignoreTrimWhitespace = this.textConfigurationService.getValue(uri, 'diffEditor.ignoreTrimWhitespace');
        editor.updateOptions({ ignoreTrimWhitespace });
        this._register(this.textConfigurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(uri, 'diffEditor') &&
                e.affectedKeys.has('diffEditor.ignoreTrimWhitespace')) {
                const ignoreTrimWhitespace = this.textConfigurationService.getValue(uri, 'diffEditor.ignoreTrimWhitespace');
                editor.updateOptions({ ignoreTrimWhitespace });
            }
        }));
    }
    layout(state) {
        DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this._diffEditorContainer), () => {
            if (state.editorHeight) {
                this._editorContainer.style.height = `${this.viewModel.layoutInfo.editorHeight}px`;
                this._editor.layout({
                    width: this._editor.getViewWidth(),
                    height: this.viewModel.layoutInfo.editorHeight,
                });
            }
            if (state.outerWidth) {
                this._editorContainer.style.height = `${this.viewModel.layoutInfo.editorHeight}px`;
                this._editor.layout();
            }
            this.layoutNotebookCell();
        });
    }
    dispose() {
        this._editor.setModel(null);
        if (this._editorViewStateChanged) {
            this.viewModel.saveSpirceEditorViewState(this._editor.saveViewState());
        }
        super.dispose();
    }
};
NotebookDocumentMetadataElement = __decorate([
    __param(3, IInstantiationService),
    __param(4, ITextModelService),
    __param(5, IMenuService),
    __param(6, IContextKeyService),
    __param(7, ITextResourceConfigurationService),
    __param(8, IConfigurationService)
], NotebookDocumentMetadataElement);
export { NotebookDocumentMetadataElement };
class AbstractElementRenderer extends Disposable {
    constructor(notebookEditor, cell, templateData, style, instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.cell = cell;
        this.templateData = templateData;
        this.style = style;
        this.instantiationService = instantiationService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.textModelService = textModelService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.textConfigurationService = textConfigurationService;
        this._metadataLocalDisposable = this._register(new DisposableStore());
        this._outputLocalDisposable = this._register(new DisposableStore());
        this._ignoreMetadata = false;
        this._ignoreOutputs = false;
        // init
        this._isDisposed = false;
        this._metadataEditorDisposeStore = this._register(new DisposableStore());
        this._outputEditorDisposeStore = this._register(new DisposableStore());
        this._register(cell.onDidLayoutChange((e) => {
            this.layout(e);
        }));
        this._register(cell.onDidLayoutChange((e) => this.updateBorders()));
        this.init();
        this.buildBody();
        this._register(cell.onDidStateChange(() => {
            this.updateOutputRendering(this.cell.renderOutput);
        }));
    }
    buildBody() {
        const body = this.templateData.body;
        this._diffEditorContainer = this.templateData.diffEditorContainer;
        body.classList.remove('left', 'right', 'full');
        switch (this.style) {
            case 'left':
                body.classList.add('left');
                break;
            case 'right':
                body.classList.add('right');
                break;
            default:
                body.classList.add('full');
                break;
        }
        this.styleContainer(this._diffEditorContainer);
        this.updateSourceEditor();
        if (this.cell.modified) {
            this._register(this.cell.modified.textModel.onDidChangeContent(() => this._cellHeader.refresh()));
        }
        this._ignoreMetadata = this.configurationService.getValue('notebook.diff.ignoreMetadata');
        if (this._ignoreMetadata) {
            this._disposeMetadata();
        }
        else {
            this._buildMetadata();
        }
        this._ignoreOutputs =
            this.configurationService.getValue('notebook.diff.ignoreOutputs') ||
                !!this.notebookEditor.textModel?.transientOptions.transientOutputs;
        if (this._ignoreOutputs) {
            this._disposeOutput();
        }
        else {
            this._buildOutput();
        }
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            let metadataLayoutChange = false;
            let outputLayoutChange = false;
            if (e.affectsConfiguration('notebook.diff.ignoreMetadata')) {
                const newValue = this.configurationService.getValue('notebook.diff.ignoreMetadata');
                if (newValue !== undefined && this._ignoreMetadata !== newValue) {
                    this._ignoreMetadata = newValue;
                    this._metadataLocalDisposable.clear();
                    if (this.configurationService.getValue('notebook.diff.ignoreMetadata')) {
                        this._disposeMetadata();
                    }
                    else {
                        this.cell.metadataStatusHeight = 25;
                        this._buildMetadata();
                        this.updateMetadataRendering();
                        metadataLayoutChange = true;
                    }
                }
            }
            if (e.affectsConfiguration('notebook.diff.ignoreOutputs')) {
                const newValue = this.configurationService.getValue('notebook.diff.ignoreOutputs');
                if (newValue !== undefined &&
                    this._ignoreOutputs !==
                        (newValue || this.notebookEditor.textModel?.transientOptions.transientOutputs)) {
                    this._ignoreOutputs =
                        newValue || !!this.notebookEditor.textModel?.transientOptions.transientOutputs;
                    this._outputLocalDisposable.clear();
                    if (this._ignoreOutputs) {
                        this._disposeOutput();
                        this.cell.layoutChange();
                    }
                    else {
                        this.cell.outputStatusHeight = 25;
                        this._buildOutput();
                        outputLayoutChange = true;
                    }
                }
            }
            if (metadataLayoutChange || outputLayoutChange) {
                this.layout({
                    metadataHeight: metadataLayoutChange,
                    outputTotalHeight: outputLayoutChange,
                });
            }
        }));
    }
    updateMetadataRendering() {
        if (this.cell.metadataFoldingState === PropertyFoldingState.Expanded) {
            // we should expand the metadata editor
            this._metadataInfoContainer.style.display = 'block';
            if (!this._metadataEditorContainer || !this._metadataEditor) {
                // create editor
                this._metadataEditorContainer = DOM.append(this._metadataInfoContainer, DOM.$('.metadata-editor-container'));
                this._buildMetadataEditor();
            }
            else {
                this.cell.metadataHeight = this._metadataEditor.getContentHeight();
            }
        }
        else {
            // we should collapse the metadata editor
            this._metadataInfoContainer.style.display = 'none';
            // this._metadataEditorDisposeStore.clear();
            this.cell.metadataHeight = 0;
        }
    }
    updateOutputRendering(renderRichOutput) {
        if (this.cell.outputFoldingState === PropertyFoldingState.Expanded) {
            this._outputInfoContainer.style.display = 'block';
            if (renderRichOutput) {
                this._hideOutputsRaw();
                this._buildOutputRendererContainer();
                this._showOutputsRenderer();
                this._showOutputsEmptyView();
            }
            else {
                this._hideOutputsRenderer();
                this._buildOutputRawContainer();
                this._showOutputsRaw();
            }
        }
        else {
            this._outputInfoContainer.style.display = 'none';
            this._hideOutputsRaw();
            this._hideOutputsRenderer();
            this._hideOutputsEmptyView();
        }
    }
    _buildOutputRawContainer() {
        if (!this._outputEditorContainer) {
            this._outputEditorContainer = DOM.append(this._outputInfoContainer, DOM.$('.output-editor-container'));
            this._buildOutputEditor();
        }
    }
    _showOutputsRaw() {
        if (this._outputEditorContainer) {
            this._outputEditorContainer.style.display = 'block';
            this.cell.rawOutputHeight = this._outputEditor.getContentHeight();
        }
    }
    _showOutputsEmptyView() {
        this.cell.layoutChange();
    }
    _hideOutputsRaw() {
        if (this._outputEditorContainer) {
            this._outputEditorContainer.style.display = 'none';
            this.cell.rawOutputHeight = 0;
        }
    }
    _hideOutputsEmptyView() {
        this.cell.layoutChange();
    }
    _applySanitizedMetadataChanges(currentMetadata, newMetadata) {
        const result = {};
        try {
            const newMetadataObj = JSON.parse(newMetadata);
            const keys = new Set([...Object.keys(newMetadataObj)]);
            for (const key of keys) {
                switch (key) {
                    case 'inputCollapsed':
                    case 'outputCollapsed':
                        // boolean
                        if (typeof newMetadataObj[key] === 'boolean') {
                            result[key] = newMetadataObj[key];
                        }
                        else {
                            result[key] = currentMetadata[key];
                        }
                        break;
                    default:
                        result[key] = newMetadataObj[key];
                        break;
                }
            }
            const index = this.notebookEditor.textModel.cells.indexOf(this.cell.modified.textModel);
            if (index < 0) {
                return;
            }
            this.notebookEditor.textModel.applyEdits([{ editType: 3 /* CellEditType.Metadata */, index, metadata: result }], true, undefined, () => undefined, undefined, true);
        }
        catch { }
    }
    async _buildMetadataEditor() {
        this._metadataEditorDisposeStore.clear();
        if (this.cell instanceof SideBySideDiffElementViewModel) {
            this._metadataEditor = this.instantiationService.createInstance(DiffEditorWidget, this._metadataEditorContainer, {
                ...fixedDiffEditorOptions,
                overflowWidgetsDomNode: this.notebookEditor.getOverflowContainerDomNode(),
                readOnly: false,
                originalEditable: false,
                ignoreTrimWhitespace: false,
                automaticLayout: false,
                dimension: {
                    height: this.cell.layoutInfo.metadataHeight,
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), true, true),
                },
            }, {
                originalEditor: getOptimizedNestedCodeEditorWidgetOptions(),
                modifiedEditor: getOptimizedNestedCodeEditorWidgetOptions(),
            });
            const unchangedRegions = this._register(getUnchangedRegionSettings(this.configurationService));
            if (unchangedRegions.options.enabled) {
                this._metadataEditor.updateOptions({ hideUnchangedRegions: unchangedRegions.options });
            }
            this._metadataEditorDisposeStore.add(unchangedRegions.onDidChangeEnablement(() => {
                if (this._metadataEditor) {
                    this._metadataEditor.updateOptions({ hideUnchangedRegions: unchangedRegions.options });
                }
            }));
            this.layout({ metadataHeight: true });
            this._metadataEditorDisposeStore.add(this._metadataEditor);
            this._metadataEditorContainer?.classList.add('diff');
            const [originalMetadataModel, modifiedMetadataModel] = await Promise.all([
                this.textModelService.createModelReference(CellUri.generateCellPropertyUri(this.cell.originalDocument.uri, this.cell.original.handle, Schemas.vscodeNotebookCellMetadata)),
                this.textModelService.createModelReference(CellUri.generateCellPropertyUri(this.cell.modifiedDocument.uri, this.cell.modified.handle, Schemas.vscodeNotebookCellMetadata)),
            ]);
            if (this._isDisposed) {
                originalMetadataModel.dispose();
                modifiedMetadataModel.dispose();
                return;
            }
            this._metadataEditorDisposeStore.add(originalMetadataModel);
            this._metadataEditorDisposeStore.add(modifiedMetadataModel);
            const vm = this._metadataEditor.createViewModel({
                original: originalMetadataModel.object.textEditorModel,
                modified: modifiedMetadataModel.object.textEditorModel,
            });
            this._metadataEditor.setModel(vm);
            // Reduces flicker (compute this before setting the model)
            // Else when the model is set, the height of the editor will be x, after diff is computed, then height will be y.
            // & that results in flicker.
            await vm.waitForDiff();
            if (this._isDisposed) {
                return;
            }
            this.cell.metadataHeight = this._metadataEditor.getContentHeight();
            this._metadataEditorDisposeStore.add(this._metadataEditor.onDidContentSizeChange((e) => {
                if (e.contentHeightChanged &&
                    this.cell.metadataFoldingState === PropertyFoldingState.Expanded) {
                    this.cell.metadataHeight = e.contentHeight;
                }
            }));
            let respondingToContentChange = false;
            this._metadataEditorDisposeStore.add(modifiedMetadataModel.object.textEditorModel.onDidChangeContent(() => {
                respondingToContentChange = true;
                const value = modifiedMetadataModel.object.textEditorModel.getValue();
                this._applySanitizedMetadataChanges(this.cell.modified.metadata, value);
                this._metadataHeader.refresh();
                respondingToContentChange = false;
            }));
            this._metadataEditorDisposeStore.add(this.cell.modified.textModel.onDidChangeMetadata(() => {
                if (respondingToContentChange) {
                    return;
                }
                const modifiedMetadataSource = getFormattedMetadataJSON(this.notebookEditor.textModel?.transientOptions.transientCellMetadata, this.cell.modified?.metadata || {}, this.cell.modified?.language, true);
                modifiedMetadataModel.object.textEditorModel.setValue(modifiedMetadataSource);
            }));
            return;
        }
        else {
            this._metadataEditor = this.instantiationService.createInstance(CodeEditorWidget, this._metadataEditorContainer, {
                ...fixedEditorOptions,
                dimension: {
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                    height: this.cell.layoutInfo.metadataHeight,
                },
                overflowWidgetsDomNode: this.notebookEditor.getOverflowContainerDomNode(),
                readOnly: false,
            }, {});
            this.layout({ metadataHeight: true });
            this._metadataEditorDisposeStore.add(this._metadataEditor);
            const mode = this.languageService.createById('jsonc');
            const originalMetadataSource = getFormattedMetadataJSON(this.notebookEditor.textModel?.transientOptions.transientCellMetadata, this.cell.type === 'insert'
                ? this.cell.modified.metadata || {}
                : this.cell.original.metadata || {}, undefined, true);
            const uri = this.cell.type === 'insert' ? this.cell.modified.uri : this.cell.original.uri;
            const handle = this.cell.type === 'insert' ? this.cell.modified.handle : this.cell.original.handle;
            const modelUri = CellUri.generateCellPropertyUri(uri, handle, Schemas.vscodeNotebookCellMetadata);
            const metadataModel = this.modelService.createModel(originalMetadataSource, mode, modelUri, false);
            this._metadataEditor.setModel(metadataModel);
            this._metadataEditorDisposeStore.add(metadataModel);
            this.cell.metadataHeight = this._metadataEditor.getContentHeight();
            this._metadataEditorDisposeStore.add(this._metadataEditor.onDidContentSizeChange((e) => {
                if (e.contentHeightChanged &&
                    this.cell.metadataFoldingState === PropertyFoldingState.Expanded) {
                    this.cell.metadataHeight = e.contentHeight;
                }
            }));
        }
    }
    _buildOutputEditor() {
        this._outputEditorDisposeStore.clear();
        if ((this.cell.type === 'modified' || this.cell.type === 'unchanged') &&
            !this.notebookEditor.textModel.transientOptions.transientOutputs) {
            const originalOutputsSource = getFormattedOutputJSON(this.cell.original?.outputs || []);
            const modifiedOutputsSource = getFormattedOutputJSON(this.cell.modified?.outputs || []);
            if (originalOutputsSource !== modifiedOutputsSource) {
                const mode = this.languageService.createById('json');
                const originalModel = this.modelService.createModel(originalOutputsSource, mode, undefined, true);
                const modifiedModel = this.modelService.createModel(modifiedOutputsSource, mode, undefined, true);
                this._outputEditorDisposeStore.add(originalModel);
                this._outputEditorDisposeStore.add(modifiedModel);
                const lineHeight = this.notebookEditor.getLayoutInfo().fontInfo.lineHeight || 17;
                const lineCount = Math.max(originalModel.getLineCount(), modifiedModel.getLineCount());
                this._outputEditor = this.instantiationService.createInstance(DiffEditorWidget, this._outputEditorContainer, {
                    ...fixedDiffEditorOptions,
                    overflowWidgetsDomNode: this.notebookEditor.getOverflowContainerDomNode(),
                    readOnly: true,
                    ignoreTrimWhitespace: false,
                    automaticLayout: false,
                    dimension: {
                        height: Math.min(OUTPUT_EDITOR_HEIGHT_MAGIC, this.cell.layoutInfo.rawOutputHeight || lineHeight * lineCount),
                        width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                    },
                    accessibilityVerbose: this.configurationService.getValue("accessibility.verbosity.diffEditor" /* AccessibilityVerbositySettingId.DiffEditor */) ?? false,
                }, {
                    originalEditor: getOptimizedNestedCodeEditorWidgetOptions(),
                    modifiedEditor: getOptimizedNestedCodeEditorWidgetOptions(),
                });
                this._outputEditorDisposeStore.add(this._outputEditor);
                this._outputEditorContainer?.classList.add('diff');
                this._outputEditor.setModel({
                    original: originalModel,
                    modified: modifiedModel,
                });
                this._outputEditor.restoreViewState(this.cell.getOutputEditorViewState());
                this.cell.rawOutputHeight = this._outputEditor.getContentHeight();
                this._outputEditorDisposeStore.add(this._outputEditor.onDidContentSizeChange((e) => {
                    if (e.contentHeightChanged &&
                        this.cell.outputFoldingState === PropertyFoldingState.Expanded) {
                        this.cell.rawOutputHeight = e.contentHeight;
                    }
                }));
                this._outputEditorDisposeStore.add(this.cell.modified.textModel.onDidChangeOutputs(() => {
                    const modifiedOutputsSource = getFormattedOutputJSON(this.cell.modified?.outputs || []);
                    modifiedModel.setValue(modifiedOutputsSource);
                    this._outputHeader.refresh();
                }));
                return;
            }
        }
        this._outputEditor = this.instantiationService.createInstance(CodeEditorWidget, this._outputEditorContainer, {
            ...fixedEditorOptions,
            dimension: {
                width: Math.min(OUTPUT_EDITOR_HEIGHT_MAGIC, this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, this.cell.type === 'unchanged' || this.cell.type === 'modified') - 32),
                height: this.cell.layoutInfo.rawOutputHeight,
            },
            overflowWidgetsDomNode: this.notebookEditor.getOverflowContainerDomNode(),
        }, {});
        this._outputEditorDisposeStore.add(this._outputEditor);
        const mode = this.languageService.createById('json');
        const originaloutputSource = getFormattedOutputJSON(this.notebookEditor.textModel.transientOptions.transientOutputs
            ? []
            : this.cell.type === 'insert'
                ? this.cell.modified?.outputs || []
                : this.cell.original?.outputs || []);
        const outputModel = this.modelService.createModel(originaloutputSource, mode, undefined, true);
        this._outputEditorDisposeStore.add(outputModel);
        this._outputEditor.setModel(outputModel);
        this._outputEditor.restoreViewState(this.cell.getOutputEditorViewState());
        this.cell.rawOutputHeight = this._outputEditor.getContentHeight();
        this._outputEditorDisposeStore.add(this._outputEditor.onDidContentSizeChange((e) => {
            if (e.contentHeightChanged &&
                this.cell.outputFoldingState === PropertyFoldingState.Expanded) {
                this.cell.rawOutputHeight = e.contentHeight;
            }
        }));
    }
    layoutNotebookCell() {
        this.notebookEditor.layoutNotebookCell(this.cell, this.cell.layoutInfo.totalHeight);
    }
    updateBorders() {
        this.templateData.leftBorder.style.height = `${this.cell.layoutInfo.totalHeight - 32}px`;
        this.templateData.rightBorder.style.height = `${this.cell.layoutInfo.totalHeight - 32}px`;
        this.templateData.bottomBorder.style.top = `${this.cell.layoutInfo.totalHeight - 32}px`;
    }
    dispose() {
        if (this._outputEditor) {
            this.cell.saveOutputEditorViewState(this._outputEditor.saveViewState());
        }
        if (this._metadataEditor) {
            this.cell.saveMetadataEditorViewState(this._metadataEditor.saveViewState());
        }
        this._metadataEditorDisposeStore.dispose();
        this._outputEditorDisposeStore.dispose();
        this._isDisposed = true;
        super.dispose();
    }
}
class SingleSideDiffElement extends AbstractElementRenderer {
    constructor(notebookEditor, cell, templateData, style, instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService) {
        super(notebookEditor, cell, templateData, style, instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService);
        this.cell = cell;
        this.templateData = templateData;
        this.updateBorders();
    }
    init() {
        this._diagonalFill = this.templateData.diagonalFill;
    }
    buildBody() {
        const body = this.templateData.body;
        this._diffEditorContainer = this.templateData.diffEditorContainer;
        body.classList.remove('left', 'right', 'full');
        switch (this.style) {
            case 'left':
                body.classList.add('left');
                break;
            case 'right':
                body.classList.add('right');
                break;
            default:
                body.classList.add('full');
                break;
        }
        this.styleContainer(this._diffEditorContainer);
        this.updateSourceEditor();
        if (this.configurationService.getValue('notebook.diff.ignoreMetadata')) {
            this._disposeMetadata();
        }
        else {
            this._buildMetadata();
        }
        if (this.configurationService.getValue('notebook.diff.ignoreOutputs') ||
            this.notebookEditor.textModel?.transientOptions.transientOutputs) {
            this._disposeOutput();
        }
        else {
            this._buildOutput();
        }
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            let metadataLayoutChange = false;
            let outputLayoutChange = false;
            if (e.affectsConfiguration('notebook.diff.ignoreMetadata')) {
                this._metadataLocalDisposable.clear();
                if (this.configurationService.getValue('notebook.diff.ignoreMetadata')) {
                    this._disposeMetadata();
                }
                else {
                    this.cell.metadataStatusHeight = 25;
                    this._buildMetadata();
                    this.updateMetadataRendering();
                    metadataLayoutChange = true;
                }
            }
            if (e.affectsConfiguration('notebook.diff.ignoreOutputs')) {
                this._outputLocalDisposable.clear();
                if (this.configurationService.getValue('notebook.diff.ignoreOutputs') ||
                    this.notebookEditor.textModel?.transientOptions.transientOutputs) {
                    this._disposeOutput();
                }
                else {
                    this.cell.outputStatusHeight = 25;
                    this._buildOutput();
                    outputLayoutChange = true;
                }
            }
            if (metadataLayoutChange || outputLayoutChange) {
                this.layout({
                    metadataHeight: metadataLayoutChange,
                    outputTotalHeight: outputLayoutChange,
                });
            }
        }));
    }
    updateSourceEditor() {
        this._cellHeaderContainer = this.templateData.cellHeaderContainer;
        this._cellHeaderContainer.style.display = 'flex';
        this._cellHeaderContainer.innerText = '';
        this._editorContainer = this.templateData.editorContainer;
        this._editorContainer.classList.add('diff');
        const renderSourceEditor = () => {
            if (this.cell.cellFoldingState === PropertyFoldingState.Collapsed) {
                this._editorContainer.style.display = 'none';
                this.cell.editorHeight = 0;
                return;
            }
            const lineHeight = this.notebookEditor.getLayoutInfo().fontInfo.lineHeight || 17;
            const editorHeight = this.cell.computeInputEditorHeight(lineHeight);
            this._editorContainer.style.height = `${editorHeight}px`;
            this._editorContainer.style.display = 'block';
            if (this._editor) {
                const contentHeight = this._editor.getContentHeight();
                if (contentHeight >= 0) {
                    this.cell.editorHeight = contentHeight;
                }
                return;
            }
            this._editor = this.templateData.sourceEditor;
            this._editor.layout({
                width: (this.notebookEditor.getLayoutInfo().width - 2 * DIFF_CELL_MARGIN) / 2 - 18,
                height: editorHeight,
            });
            this._editor.updateOptions({ readOnly: this.readonly });
            this.cell.editorHeight = editorHeight;
            this._register(this._editor.onDidContentSizeChange((e) => {
                if (this.cell.cellFoldingState === PropertyFoldingState.Expanded &&
                    e.contentHeightChanged &&
                    this.cell.layoutInfo.editorHeight !== e.contentHeight) {
                    this.cell.editorHeight = e.contentHeight;
                }
            }));
            this._initializeSourceDiffEditor(this.nestedCellViewModel);
        };
        this._cellHeader = this._register(this.instantiationService.createInstance(PropertyHeader, this.cell, this._cellHeaderContainer, this.notebookEditor, {
            updateInfoRendering: () => renderSourceEditor(),
            checkIfModified: () => ({ reason: undefined }),
            getFoldingState: () => this.cell.cellFoldingState,
            updateFoldingState: (state) => (this.cell.cellFoldingState = state),
            unChangedLabel: 'Input',
            changedLabel: 'Input',
            prefix: 'input',
            menuId: MenuId.NotebookDiffCellInputTitle,
        }));
        this._cellHeader.buildHeader();
        renderSourceEditor();
        this._initializeSourceDiffEditor(this.nestedCellViewModel);
    }
    calculateDiagonalFillHeight() {
        return (this.cell.layoutInfo.cellStatusHeight +
            this.cell.layoutInfo.editorHeight +
            this.cell.layoutInfo.editorMargin +
            this.cell.layoutInfo.metadataStatusHeight +
            this.cell.layoutInfo.metadataHeight +
            this.cell.layoutInfo.outputTotalHeight +
            this.cell.layoutInfo.outputStatusHeight);
    }
    async _initializeSourceDiffEditor(modifiedCell) {
        const modifiedRef = await this.textModelService.createModelReference(modifiedCell.uri);
        if (this._isDisposed) {
            return;
        }
        const modifiedTextModel = modifiedRef.object.textEditorModel;
        this._register(modifiedRef);
        this._editor.setModel(modifiedTextModel);
        const editorViewState = this.cell.getSourceEditorViewState();
        if (editorViewState) {
            this._editor.restoreViewState(editorViewState);
        }
        const contentHeight = this._editor.getContentHeight();
        this.cell.editorHeight = contentHeight;
        const height = `${this.calculateDiagonalFillHeight()}px`;
        if (this._diagonalFill.style.height !== height) {
            this._diagonalFill.style.height = height;
        }
    }
    _disposeMetadata() {
        this.cell.metadataStatusHeight = 0;
        this.cell.metadataHeight = 0;
        this.templateData.cellHeaderContainer.style.display = 'none';
        this.templateData.metadataHeaderContainer.style.display = 'none';
        this.templateData.metadataInfoContainer.style.display = 'none';
        this._metadataEditor = undefined;
    }
    _buildMetadata() {
        this._metadataHeaderContainer = this.templateData.metadataHeaderContainer;
        this._metadataInfoContainer = this.templateData.metadataInfoContainer;
        this._metadataHeaderContainer.style.display = 'flex';
        this._metadataInfoContainer.style.display = 'block';
        this._metadataHeaderContainer.innerText = '';
        this._metadataInfoContainer.innerText = '';
        this._metadataHeader = this.instantiationService.createInstance(PropertyHeader, this.cell, this._metadataHeaderContainer, this.notebookEditor, {
            updateInfoRendering: this.updateMetadataRendering.bind(this),
            checkIfModified: () => {
                return this.cell.checkMetadataIfModified();
            },
            getFoldingState: () => {
                return this.cell.metadataFoldingState;
            },
            updateFoldingState: (state) => {
                this.cell.metadataFoldingState = state;
            },
            unChangedLabel: 'Metadata',
            changedLabel: 'Metadata changed',
            prefix: 'metadata',
            menuId: MenuId.NotebookDiffCellMetadataTitle,
        });
        this._metadataLocalDisposable.add(this._metadataHeader);
        this._metadataHeader.buildHeader();
    }
    _buildOutput() {
        this.templateData.outputHeaderContainer.style.display = 'flex';
        this.templateData.outputInfoContainer.style.display = 'block';
        this._outputHeaderContainer = this.templateData.outputHeaderContainer;
        this._outputInfoContainer = this.templateData.outputInfoContainer;
        this._outputHeaderContainer.innerText = '';
        this._outputInfoContainer.innerText = '';
        this._outputHeader = this.instantiationService.createInstance(PropertyHeader, this.cell, this._outputHeaderContainer, this.notebookEditor, {
            updateInfoRendering: this.updateOutputRendering.bind(this),
            checkIfModified: () => {
                return this.cell.checkIfOutputsModified();
            },
            getFoldingState: () => {
                return this.cell.outputFoldingState;
            },
            updateFoldingState: (state) => {
                this.cell.outputFoldingState = state;
            },
            unChangedLabel: 'Outputs',
            changedLabel: 'Outputs changed',
            prefix: 'output',
            menuId: MenuId.NotebookDiffCellOutputsTitle,
        });
        this._outputLocalDisposable.add(this._outputHeader);
        this._outputHeader.buildHeader();
    }
    _disposeOutput() {
        this._hideOutputsRaw();
        this._hideOutputsRenderer();
        this._hideOutputsEmptyView();
        this.cell.rawOutputHeight = 0;
        this.cell.outputMetadataHeight = 0;
        this.cell.outputStatusHeight = 0;
        this.templateData.outputHeaderContainer.style.display = 'none';
        this.templateData.outputInfoContainer.style.display = 'none';
        this._outputViewContainer = undefined;
    }
}
let DeletedElement = class DeletedElement extends SingleSideDiffElement {
    constructor(notebookEditor, cell, templateData, languageService, modelService, textModelService, instantiationService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService) {
        super(notebookEditor, cell, templateData, 'left', instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService);
    }
    get nestedCellViewModel() {
        return this.cell.original;
    }
    get readonly() {
        return true;
    }
    styleContainer(container) {
        container.classList.remove('inserted');
        container.classList.add('removed');
    }
    layout(state) {
        DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this._diffEditorContainer), () => {
            if ((state.editorHeight || state.outerWidth) && this._editor) {
                this._editorContainer.style.height = `${this.cell.layoutInfo.editorHeight}px`;
                this._editor.layout({
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, false),
                    height: this.cell.layoutInfo.editorHeight,
                });
            }
            if (state.outerWidth && this._editor) {
                this._editorContainer.style.height = `${this.cell.layoutInfo.editorHeight}px`;
                this._editor.layout();
            }
            if (state.metadataHeight || state.outerWidth) {
                this._metadataEditor?.layout({
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, false),
                    height: this.cell.layoutInfo.metadataHeight,
                });
            }
            if (state.outputTotalHeight || state.outerWidth) {
                this._outputEditor?.layout({
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, false),
                    height: this.cell.layoutInfo.outputTotalHeight,
                });
            }
            if (this._diagonalFill) {
                this._diagonalFill.style.height = `${this.calculateDiagonalFillHeight()}px`;
            }
            this.layoutNotebookCell();
        });
    }
    _buildOutputRendererContainer() {
        if (!this._outputViewContainer) {
            this._outputViewContainer = DOM.append(this._outputInfoContainer, DOM.$('.output-view-container'));
            this._outputEmptyElement = DOM.append(this._outputViewContainer, DOM.$('.output-empty-view'));
            const span = DOM.append(this._outputEmptyElement, DOM.$('span'));
            span.innerText = 'No outputs to render';
            if (!this.cell.original?.outputs.length) {
                this._outputEmptyElement.style.display = 'block';
            }
            else {
                this._outputEmptyElement.style.display = 'none';
            }
            this.cell.layoutChange();
            this._outputLeftView = this.instantiationService.createInstance(OutputContainer, this.notebookEditor, this.notebookEditor.textModel, this.cell, this.cell.original, DiffSide.Original, this._outputViewContainer);
            this._register(this._outputLeftView);
            this._outputLeftView.render();
            const removedOutputRenderListener = this.notebookEditor.onDidDynamicOutputRendered((e) => {
                if (e.cell.uri.toString() === this.cell.original.uri.toString()) {
                    this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Original, this.cell.original.id, ['nb-cellDeleted'], []);
                    removedOutputRenderListener.dispose();
                }
            });
            this._register(removedOutputRenderListener);
        }
        this._outputViewContainer.style.display = 'block';
    }
    _decorate() {
        this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Original, this.cell.original.id, ['nb-cellDeleted'], []);
    }
    _showOutputsRenderer() {
        if (this._outputViewContainer) {
            this._outputViewContainer.style.display = 'block';
            this._outputLeftView?.showOutputs();
            this._decorate();
        }
    }
    _hideOutputsRenderer() {
        if (this._outputViewContainer) {
            this._outputViewContainer.style.display = 'none';
            this._outputLeftView?.hideOutputs();
        }
    }
    dispose() {
        if (this._editor) {
            this.cell.saveSpirceEditorViewState(this._editor.saveViewState());
        }
        super.dispose();
    }
};
DeletedElement = __decorate([
    __param(3, ILanguageService),
    __param(4, IModelService),
    __param(5, ITextModelService),
    __param(6, IInstantiationService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IMenuService),
    __param(11, IContextKeyService),
    __param(12, IConfigurationService),
    __param(13, ITextResourceConfigurationService)
], DeletedElement);
export { DeletedElement };
let InsertElement = class InsertElement extends SingleSideDiffElement {
    constructor(notebookEditor, cell, templateData, instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService) {
        super(notebookEditor, cell, templateData, 'right', instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService);
    }
    get nestedCellViewModel() {
        return this.cell.modified;
    }
    get readonly() {
        return false;
    }
    styleContainer(container) {
        container.classList.remove('removed');
        container.classList.add('inserted');
    }
    _buildOutputRendererContainer() {
        if (!this._outputViewContainer) {
            this._outputViewContainer = DOM.append(this._outputInfoContainer, DOM.$('.output-view-container'));
            this._outputEmptyElement = DOM.append(this._outputViewContainer, DOM.$('.output-empty-view'));
            this._outputEmptyElement.innerText = 'No outputs to render';
            if (!this.cell.modified?.outputs.length) {
                this._outputEmptyElement.style.display = 'block';
            }
            else {
                this._outputEmptyElement.style.display = 'none';
            }
            this.cell.layoutChange();
            this._outputRightView = this.instantiationService.createInstance(OutputContainer, this.notebookEditor, this.notebookEditor.textModel, this.cell, this.cell.modified, DiffSide.Modified, this._outputViewContainer);
            this._register(this._outputRightView);
            this._outputRightView.render();
            const insertOutputRenderListener = this.notebookEditor.onDidDynamicOutputRendered((e) => {
                if (e.cell.uri.toString() === this.cell.modified.uri.toString()) {
                    this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Modified, this.cell.modified.id, ['nb-cellAdded'], []);
                    insertOutputRenderListener.dispose();
                }
            });
            this._register(insertOutputRenderListener);
        }
        this._outputViewContainer.style.display = 'block';
    }
    _decorate() {
        this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Modified, this.cell.modified.id, ['nb-cellAdded'], []);
    }
    _showOutputsRenderer() {
        if (this._outputViewContainer) {
            this._outputViewContainer.style.display = 'block';
            this._outputRightView?.showOutputs();
            this._decorate();
        }
    }
    _hideOutputsRenderer() {
        if (this._outputViewContainer) {
            this._outputViewContainer.style.display = 'none';
            this._outputRightView?.hideOutputs();
        }
    }
    layout(state) {
        DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this._diffEditorContainer), () => {
            if ((state.editorHeight || state.outerWidth) && this._editor) {
                this._editorContainer.style.height = `${this.cell.layoutInfo.editorHeight}px`;
                this._editor.layout({
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, false),
                    height: this.cell.layoutInfo.editorHeight,
                });
            }
            if (state.outerWidth && this._editor) {
                this._editorContainer.style.height = `${this.cell.layoutInfo.editorHeight}px`;
                this._editor.layout();
            }
            if (state.metadataHeight || state.outerWidth) {
                this._metadataEditor?.layout({
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                    height: this.cell.layoutInfo.metadataHeight,
                });
            }
            if (state.outputTotalHeight || state.outerWidth) {
                this._outputEditor?.layout({
                    width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, false),
                    height: this.cell.layoutInfo.outputTotalHeight,
                });
            }
            this.layoutNotebookCell();
            if (this._diagonalFill) {
                this._diagonalFill.style.height = `${this.calculateDiagonalFillHeight()}px`;
            }
        });
    }
    dispose() {
        if (this._editor) {
            this.cell.saveSpirceEditorViewState(this._editor.saveViewState());
        }
        super.dispose();
    }
};
InsertElement = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILanguageService),
    __param(5, IModelService),
    __param(6, ITextModelService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IMenuService),
    __param(11, IContextKeyService),
    __param(12, IConfigurationService),
    __param(13, ITextResourceConfigurationService)
], InsertElement);
export { InsertElement };
let ModifiedElement = class ModifiedElement extends AbstractElementRenderer {
    constructor(notebookEditor, cell, templateData, instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService) {
        super(notebookEditor, cell, templateData, 'full', instantiationService, languageService, modelService, textModelService, contextMenuService, keybindingService, notificationService, menuService, contextKeyService, configurationService, textConfigurationService);
        this.cell = cell;
        this.templateData = templateData;
        this._editorViewStateChanged = false;
        this.updateBorders();
    }
    init() { }
    styleContainer(container) {
        container.classList.remove('inserted', 'removed');
    }
    buildBody() {
        super.buildBody();
        if (this.cell.displayIconToHideUnmodifiedCells) {
            this._register(this.templateData.marginOverlay.onAction(() => this.cell.hideUnchangedCells()));
            this.templateData.marginOverlay.show();
        }
        else {
            this.templateData.marginOverlay.hide();
        }
    }
    _disposeMetadata() {
        this.cell.metadataStatusHeight = 0;
        this.cell.metadataHeight = 0;
        this.templateData.metadataHeaderContainer.style.display = 'none';
        this.templateData.metadataInfoContainer.style.display = 'none';
        this._metadataEditor = undefined;
    }
    _buildMetadata() {
        this._metadataHeaderContainer = this.templateData.metadataHeaderContainer;
        this._metadataInfoContainer = this.templateData.metadataInfoContainer;
        this._metadataHeaderContainer.style.display = 'flex';
        this._metadataInfoContainer.style.display = 'block';
        this._metadataHeaderContainer.innerText = '';
        this._metadataInfoContainer.innerText = '';
        this._metadataHeader = this.instantiationService.createInstance(PropertyHeader, this.cell, this._metadataHeaderContainer, this.notebookEditor, {
            updateInfoRendering: this.updateMetadataRendering.bind(this),
            checkIfModified: () => {
                return this.cell.checkMetadataIfModified();
            },
            getFoldingState: () => {
                return this.cell.metadataFoldingState;
            },
            updateFoldingState: (state) => {
                this.cell.metadataFoldingState = state;
            },
            unChangedLabel: 'Metadata',
            changedLabel: 'Metadata changed',
            prefix: 'metadata',
            menuId: MenuId.NotebookDiffCellMetadataTitle,
        });
        this._metadataLocalDisposable.add(this._metadataHeader);
        this._metadataHeader.buildHeader();
    }
    _disposeOutput() {
        this._hideOutputsRaw();
        this._hideOutputsRenderer();
        this._hideOutputsEmptyView();
        this.cell.rawOutputHeight = 0;
        this.cell.outputMetadataHeight = 0;
        this.cell.outputStatusHeight = 0;
        this.templateData.outputHeaderContainer.style.display = 'none';
        this.templateData.outputInfoContainer.style.display = 'none';
        this._outputViewContainer = undefined;
    }
    _buildOutput() {
        this.templateData.outputHeaderContainer.style.display = 'flex';
        this.templateData.outputInfoContainer.style.display = 'block';
        this._outputHeaderContainer = this.templateData.outputHeaderContainer;
        this._outputInfoContainer = this.templateData.outputInfoContainer;
        this._outputHeaderContainer.innerText = '';
        this._outputInfoContainer.innerText = '';
        if (this.cell.checkIfOutputsModified()) {
            this._outputInfoContainer.classList.add('modified');
        }
        else {
            this._outputInfoContainer.classList.remove('modified');
        }
        this._outputHeader = this.instantiationService.createInstance(PropertyHeader, this.cell, this._outputHeaderContainer, this.notebookEditor, {
            updateInfoRendering: this.updateOutputRendering.bind(this),
            checkIfModified: () => {
                return this.cell.checkIfOutputsModified();
            },
            getFoldingState: () => {
                return this.cell.outputFoldingState;
            },
            updateFoldingState: (state) => {
                this.cell.outputFoldingState = state;
            },
            unChangedLabel: 'Outputs',
            changedLabel: 'Outputs changed',
            prefix: 'output',
            menuId: MenuId.NotebookDiffCellOutputsTitle,
        });
        this._outputLocalDisposable.add(this._outputHeader);
        this._outputHeader.buildHeader();
    }
    _buildOutputRendererContainer() {
        if (!this._outputViewContainer) {
            this._outputViewContainer = DOM.append(this._outputInfoContainer, DOM.$('.output-view-container'));
            this._outputEmptyElement = DOM.append(this._outputViewContainer, DOM.$('.output-empty-view'));
            this._outputEmptyElement.innerText = 'No outputs to render';
            if (!this.cell.checkIfOutputsModified() && this.cell.modified.outputs.length === 0) {
                this._outputEmptyElement.style.display = 'block';
            }
            else {
                this._outputEmptyElement.style.display = 'none';
            }
            this.cell.layoutChange();
            this._register(this.cell.modified.textModel.onDidChangeOutputs(() => {
                // currently we only allow outputs change to the modified cell
                if (!this.cell.checkIfOutputsModified() && this.cell.modified.outputs.length === 0) {
                    this._outputEmptyElement.style.display = 'block';
                }
                else {
                    this._outputEmptyElement.style.display = 'none';
                }
                this._decorate();
            }));
            this._outputLeftContainer = DOM.append(this._outputViewContainer, DOM.$('.output-view-container-left'));
            this._outputRightContainer = DOM.append(this._outputViewContainer, DOM.$('.output-view-container-right'));
            this._outputMetadataContainer = DOM.append(this._outputViewContainer, DOM.$('.output-view-container-metadata'));
            const outputModified = this.cell.checkIfOutputsModified();
            const outputMetadataChangeOnly = outputModified &&
                outputModified.kind === 1 /* OutputComparison.Metadata */ &&
                this.cell.original.outputs.length === 1 &&
                this.cell.modified.outputs.length === 1 &&
                outputEqual(this.cell.original.outputs[0], this.cell.modified.outputs[0]) ===
                    1 /* OutputComparison.Metadata */;
            if (outputModified && !outputMetadataChangeOnly) {
                const originalOutputRenderListener = this.notebookEditor.onDidDynamicOutputRendered((e) => {
                    if (e.cell.uri.toString() === this.cell.original.uri.toString() &&
                        this.cell.checkIfOutputsModified()) {
                        this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Original, this.cell.original.id, ['nb-cellDeleted'], []);
                        originalOutputRenderListener.dispose();
                    }
                });
                const modifiedOutputRenderListener = this.notebookEditor.onDidDynamicOutputRendered((e) => {
                    if (e.cell.uri.toString() === this.cell.modified.uri.toString() &&
                        this.cell.checkIfOutputsModified()) {
                        this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Modified, this.cell.modified.id, ['nb-cellAdded'], []);
                        modifiedOutputRenderListener.dispose();
                    }
                });
                this._register(originalOutputRenderListener);
                this._register(modifiedOutputRenderListener);
            }
            // We should use the original text model here
            this._outputLeftView = this.instantiationService.createInstance(OutputContainer, this.notebookEditor, this.notebookEditor.textModel, this.cell, this.cell.original, DiffSide.Original, this._outputLeftContainer);
            this._outputLeftView.render();
            this._register(this._outputLeftView);
            this._outputRightView = this.instantiationService.createInstance(OutputContainer, this.notebookEditor, this.notebookEditor.textModel, this.cell, this.cell.modified, DiffSide.Modified, this._outputRightContainer);
            this._outputRightView.render();
            this._register(this._outputRightView);
            if (outputModified && !outputMetadataChangeOnly) {
                this._decorate();
            }
            if (outputMetadataChangeOnly) {
                this._outputMetadataContainer.style.top = `${this.cell.layoutInfo.rawOutputHeight}px`;
                // single output, metadata change, let's render a diff editor for metadata
                this._outputMetadataEditor = this.instantiationService.createInstance(DiffEditorWidget, this._outputMetadataContainer, {
                    ...fixedDiffEditorOptions,
                    overflowWidgetsDomNode: this.notebookEditor.getOverflowContainerDomNode(),
                    readOnly: true,
                    ignoreTrimWhitespace: false,
                    automaticLayout: false,
                    dimension: {
                        height: OUTPUT_EDITOR_HEIGHT_MAGIC,
                        width: this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                    },
                }, {
                    originalEditor: getOptimizedNestedCodeEditorWidgetOptions(),
                    modifiedEditor: getOptimizedNestedCodeEditorWidgetOptions(),
                });
                this._register(this._outputMetadataEditor);
                const originalOutputMetadataSource = JSON.stringify(this.cell.original.outputs[0].metadata ?? {}, undefined, '\t');
                const modifiedOutputMetadataSource = JSON.stringify(this.cell.modified.outputs[0].metadata ?? {}, undefined, '\t');
                const mode = this.languageService.createById('json');
                const originalModel = this.modelService.createModel(originalOutputMetadataSource, mode, undefined, true);
                const modifiedModel = this.modelService.createModel(modifiedOutputMetadataSource, mode, undefined, true);
                this._outputMetadataEditor.setModel({
                    original: originalModel,
                    modified: modifiedModel,
                });
                this.cell.outputMetadataHeight = this._outputMetadataEditor.getContentHeight();
                this._register(this._outputMetadataEditor.onDidContentSizeChange((e) => {
                    this.cell.outputMetadataHeight = e.contentHeight;
                }));
            }
        }
        this._outputViewContainer.style.display = 'block';
    }
    _decorate() {
        if (this.cell.checkIfOutputsModified()) {
            this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Original, this.cell.original.id, ['nb-cellDeleted'], []);
            this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Modified, this.cell.modified.id, ['nb-cellAdded'], []);
        }
        else {
            this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Original, this.cell.original.id, [], ['nb-cellDeleted']);
            this.notebookEditor.deltaCellOutputContainerClassNames(DiffSide.Modified, this.cell.modified.id, [], ['nb-cellAdded']);
        }
    }
    _showOutputsRenderer() {
        if (this._outputViewContainer) {
            this._outputViewContainer.style.display = 'block';
            this._outputLeftView?.showOutputs();
            this._outputRightView?.showOutputs();
            this._outputMetadataEditor?.layout({
                width: this._editor?.getViewWidth() ||
                    this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                height: this.cell.layoutInfo.outputMetadataHeight,
            });
            this._decorate();
        }
    }
    _hideOutputsRenderer() {
        if (this._outputViewContainer) {
            this._outputViewContainer.style.display = 'none';
            this._outputLeftView?.hideOutputs();
            this._outputRightView?.hideOutputs();
        }
    }
    updateSourceEditor() {
        this._cellHeaderContainer = this.templateData.cellHeaderContainer;
        this._cellHeaderContainer.style.display = 'flex';
        this._cellHeaderContainer.innerText = '';
        const modifiedCell = this.cell.modified;
        this._editorContainer = this.templateData.editorContainer;
        this._editorContainer.classList.add('diff');
        const renderSourceEditor = () => {
            if (this.cell.cellFoldingState === PropertyFoldingState.Collapsed) {
                this._editorContainer.style.display = 'none';
                this.cell.editorHeight = 0;
                return;
            }
            const lineCount = modifiedCell.textModel.textBuffer.getLineCount();
            const lineHeight = this.notebookEditor.getLayoutInfo().fontInfo.lineHeight || 17;
            const editorHeight = this.cell.layoutInfo.editorHeight !== 0
                ? this.cell.layoutInfo.editorHeight
                : this.cell.computeInputEditorHeight(lineHeight);
            this._editorContainer.style.height = `${editorHeight}px`;
            this._editorContainer.style.display = 'block';
            if (this._editor) {
                const contentHeight = this._editor.getContentHeight();
                if (contentHeight >= 0) {
                    this.cell.editorHeight = contentHeight;
                }
                return;
            }
            this._editor = this.templateData.sourceEditor;
            // If there is only 1 line, then ensure we have the necessary padding to display the button for whitespaces.
            // E.g. assume we have a cell with 1 line and we add some whitespace,
            // Then diff editor displays the button `Show Whitespace Differences`, however with 12 paddings on the top, the
            // button can get cut off.
            const options = {
                padding: getEditorPadding(lineCount),
            };
            const unchangedRegions = this._register(getUnchangedRegionSettings(this.configurationService));
            if (unchangedRegions.options.enabled) {
                options.hideUnchangedRegions = unchangedRegions.options;
            }
            this._editor.updateOptions(options);
            this._register(unchangedRegions.onDidChangeEnablement(() => {
                options.hideUnchangedRegions = unchangedRegions.options;
                this._editor?.updateOptions(options);
            }));
            this._editor.layout({
                width: this.notebookEditor.getLayoutInfo().width - 2 * DIFF_CELL_MARGIN,
                height: editorHeight,
            });
            this._register(this._editor.onDidContentSizeChange((e) => {
                if (this.cell.cellFoldingState === PropertyFoldingState.Expanded &&
                    e.contentHeightChanged &&
                    this.cell.layoutInfo.editorHeight !== e.contentHeight) {
                    this.cell.editorHeight = e.contentHeight;
                }
            }));
            this._initializeSourceDiffEditor();
        };
        this._cellHeader = this._register(this.instantiationService.createInstance(PropertyHeader, this.cell, this._cellHeaderContainer, this.notebookEditor, {
            updateInfoRendering: () => renderSourceEditor(),
            checkIfModified: () => {
                return this.cell.modified?.textModel.getTextBufferHash() !==
                    this.cell.original?.textModel.getTextBufferHash()
                    ? { reason: undefined }
                    : false;
            },
            getFoldingState: () => this.cell.cellFoldingState,
            updateFoldingState: (state) => (this.cell.cellFoldingState = state),
            unChangedLabel: 'Input',
            changedLabel: 'Input changed',
            prefix: 'input',
            menuId: MenuId.NotebookDiffCellInputTitle,
        }));
        this._cellHeader.buildHeader();
        renderSourceEditor();
        const scopedContextKeyService = this.contextKeyService.createScoped(this.templateData.inputToolbarContainer);
        this._register(scopedContextKeyService);
        const inputChanged = NOTEBOOK_DIFF_CELL_INPUT.bindTo(scopedContextKeyService);
        inputChanged.set(this.cell.modified.textModel.getTextBufferHash() !==
            this.cell.original.textModel.getTextBufferHash());
        const ignoreWhitespace = NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE.bindTo(scopedContextKeyService);
        const ignore = this.textConfigurationService.getValue(this.cell.modified.uri, 'diffEditor.ignoreTrimWhitespace');
        ignoreWhitespace.set(ignore);
        this._toolbar = this.templateData.toolbar;
        this._toolbar.context = this.cell;
        const refreshToolbar = () => {
            const ignore = this.textConfigurationService.getValue(this.cell.modified.uri, 'diffEditor.ignoreTrimWhitespace');
            ignoreWhitespace.set(ignore);
            const hasChanges = this.cell.modified.textModel.getTextBufferHash() !==
                this.cell.original.textModel.getTextBufferHash();
            inputChanged.set(hasChanges);
            if (hasChanges) {
                const menu = this.menuService.getMenuActions(MenuId.NotebookDiffCellInputTitle, scopedContextKeyService, { shouldForwardArgs: true });
                const actions = getFlatActionBarActions(menu);
                this._toolbar.setActions(actions);
            }
            else {
                this._toolbar.setActions([]);
            }
        };
        this._register(this.cell.modified.textModel.onDidChangeContent(() => refreshToolbar()));
        this._register(this.textConfigurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(this.cell.modified.uri, 'diffEditor') &&
                e.affectedKeys.has('diffEditor.ignoreTrimWhitespace')) {
                refreshToolbar();
            }
        }));
        refreshToolbar();
    }
    async _initializeSourceDiffEditor() {
        const [originalRef, modifiedRef] = await Promise.all([
            this.textModelService.createModelReference(this.cell.original.uri),
            this.textModelService.createModelReference(this.cell.modified.uri),
        ]);
        this._register(originalRef);
        this._register(modifiedRef);
        if (this._isDisposed) {
            originalRef.dispose();
            modifiedRef.dispose();
            return;
        }
        const vm = this._register(this._editor.createViewModel({
            original: originalRef.object.textEditorModel,
            modified: modifiedRef.object.textEditorModel,
        }));
        // Reduces flicker (compute this before setting the model)
        // Else when the model is set, the height of the editor will be x, after diff is computed, then height will be y.
        // & that results in flicker.
        await vm.waitForDiff();
        this._editor.setModel(vm);
        const handleViewStateChange = () => {
            this._editorViewStateChanged = true;
        };
        const handleScrollChange = (e) => {
            if (e.scrollTopChanged || e.scrollLeftChanged) {
                this._editorViewStateChanged = true;
            }
        };
        this.updateEditorOptionsForWhitespace();
        this._register(this._editor.getOriginalEditor().onDidChangeCursorSelection(handleViewStateChange));
        this._register(this._editor.getOriginalEditor().onDidScrollChange(handleScrollChange));
        this._register(this._editor.getModifiedEditor().onDidChangeCursorSelection(handleViewStateChange));
        this._register(this._editor.getModifiedEditor().onDidScrollChange(handleScrollChange));
        const editorViewState = this.cell.getSourceEditorViewState();
        if (editorViewState) {
            this._editor.restoreViewState(editorViewState);
        }
        const contentHeight = this._editor.getContentHeight();
        this.cell.editorHeight = contentHeight;
    }
    updateEditorOptionsForWhitespace() {
        const editor = this._editor;
        if (!editor) {
            return;
        }
        const uri = editor.getModel()?.modified.uri || editor.getModel()?.original.uri;
        if (!uri) {
            return;
        }
        const ignoreTrimWhitespace = this.textConfigurationService.getValue(uri, 'diffEditor.ignoreTrimWhitespace');
        editor.updateOptions({ ignoreTrimWhitespace });
        this._register(this.textConfigurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(uri, 'diffEditor') &&
                e.affectedKeys.has('diffEditor.ignoreTrimWhitespace')) {
                const ignoreTrimWhitespace = this.textConfigurationService.getValue(uri, 'diffEditor.ignoreTrimWhitespace');
                editor.updateOptions({ ignoreTrimWhitespace });
            }
        }));
    }
    layout(state) {
        DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this._diffEditorContainer), () => {
            if (state.editorHeight && this._editor) {
                this._editorContainer.style.height = `${this.cell.layoutInfo.editorHeight}px`;
                this._editor.layout({
                    width: this._editor.getViewWidth(),
                    height: this.cell.layoutInfo.editorHeight,
                });
            }
            if (state.outerWidth && this._editor) {
                this._editorContainer.style.height = `${this.cell.layoutInfo.editorHeight}px`;
                this._editor.layout();
            }
            if (state.metadataHeight || state.outerWidth) {
                if (this._metadataEditorContainer) {
                    this._metadataEditorContainer.style.height = `${this.cell.layoutInfo.metadataHeight}px`;
                    this._metadataEditor?.layout({
                        width: this._editor?.getViewWidth() ||
                            this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                        height: this.cell.layoutInfo.metadataHeight,
                    });
                }
            }
            if (state.outputTotalHeight || state.outerWidth) {
                if (this._outputEditorContainer) {
                    this._outputEditorContainer.style.height = `${this.cell.layoutInfo.outputTotalHeight}px`;
                    this._outputEditor?.layout({
                        width: this._editor?.getViewWidth() ||
                            this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                        height: this.cell.layoutInfo.outputTotalHeight,
                    });
                }
                if (this._outputMetadataContainer) {
                    this._outputMetadataContainer.style.height = `${this.cell.layoutInfo.outputMetadataHeight}px`;
                    this._outputMetadataContainer.style.top = `${this.cell.layoutInfo.outputTotalHeight - this.cell.layoutInfo.outputMetadataHeight}px`;
                    this._outputMetadataEditor?.layout({
                        width: this._editor?.getViewWidth() ||
                            this.cell.getComputedCellContainerWidth(this.notebookEditor.getLayoutInfo(), false, true),
                        height: this.cell.layoutInfo.outputMetadataHeight,
                    });
                }
            }
            this.layoutNotebookCell();
        });
    }
    dispose() {
        // The editor isn't disposed yet, it can be re-used.
        // However the model can be disposed before the editor & that causes issues.
        if (this._editor) {
            this._editor.setModel(null);
        }
        if (this._editor && this._editorViewStateChanged) {
            this.cell.saveSpirceEditorViewState(this._editor.saveViewState());
        }
        super.dispose();
    }
};
ModifiedElement = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILanguageService),
    __param(5, IModelService),
    __param(6, ITextModelService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IMenuService),
    __param(11, IContextKeyService),
    __param(12, IConfigurationService),
    __param(13, ITextResourceConfigurationService)
], ModifiedElement);
export { ModifiedElement };
export class CollapsedCellOverlayWidget extends Disposable {
    constructor(container) {
        super();
        this.container = container;
        this._nodes = DOM.h('div.diff-hidden-cells', [
            DOM.h('div.center@content', { style: { display: 'flex' } }, [
                DOM.$('a', {
                    title: localize('showUnchangedCells', 'Show Unchanged Cells'),
                    role: 'button',
                    onclick: () => {
                        this._action.fire();
                    },
                }, ...renderLabelWithIcons('$(unfold)')),
            ]),
        ]);
        this._action = this._register(new Emitter());
        this.onAction = this._action.event;
        this._nodes.root.style.display = 'none';
        container.appendChild(this._nodes.root);
    }
    show() {
        this._nodes.root.style.display = 'block';
    }
    hide() {
        this._nodes.root.style.display = 'none';
    }
    dispose() {
        this.hide();
        this.container.removeChild(this._nodes.root);
        DOM.reset(this._nodes.root);
        super.dispose();
    }
}
export class UnchangedCellOverlayWidget extends Disposable {
    constructor(container) {
        super();
        this.container = container;
        this._nodes = DOM.h('div.diff-hidden-cells', [
            DOM.h('div.center@content', { style: { display: 'flex' } }, [
                DOM.$('a', {
                    title: localize('hideUnchangedCells', 'Hide Unchanged Cells'),
                    role: 'button',
                    onclick: () => {
                        this._action.fire();
                    },
                }, ...renderLabelWithIcons('$(fold)')),
            ]),
        ]);
        this._action = this._register(new Emitter());
        this.onAction = this._action.event;
        this._nodes.root.style.display = 'none';
        container.appendChild(this._nodes.root);
    }
    show() {
        this._nodes.root.style.display = 'block';
    }
    hide() {
        this._nodes.root.style.display = 'none';
    }
    dispose() {
        this.hide();
        this.container.removeChild(this._nodes.root);
        DOM.reset(this._nodes.root);
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXBvbmVudHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9kaWZmQ29tcG9uZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFFTixzQkFBc0IsRUFFdEIsV0FBVyxFQUNYLDBCQUEwQixFQUMxQixvQkFBb0IsRUFDcEIsOEJBQThCLEVBSTlCLGlDQUFpQyxHQUNqQyxNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFHTixRQUFRLEVBQ1IsZ0JBQWdCLEVBRWhCLHdCQUF3QixFQUN4QiwyQkFBMkIsRUFDM0Isb0NBQW9DLEVBR3BDLG9DQUFvQyxFQUVwQyxzQkFBc0IsR0FDdEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBZ0IsT0FBTyxFQUF3QixNQUFNLGdDQUFnQyxDQUFBO0FBRTVGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFFTixZQUFZLEVB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