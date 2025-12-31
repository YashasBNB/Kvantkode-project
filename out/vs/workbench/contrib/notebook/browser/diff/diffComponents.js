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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXBvbmVudHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvZGlmZkNvbXBvbmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sc0JBQXNCLEVBRXRCLFdBQVcsRUFDWCwwQkFBMEIsRUFDMUIsb0JBQW9CLEVBQ3BCLDhCQUE4QixFQUk5QixpQ0FBaUMsR0FDakMsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBR04sUUFBUSxFQUNSLGdCQUFnQixFQUVoQix3QkFBd0IsRUFDeEIsMkJBQTJCLEVBQzNCLG9DQUFvQyxFQUdwQyxvQ0FBb0MsRUFFcEMsc0JBQXNCLEdBQ3RCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQWdCLE9BQU8sRUFBd0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUU1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBRU4sWUFBWSxFQUNaLE1BQU0sRUFDTixjQUFjLEdBQ2Qs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