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
import './media/interactive.css';
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { NotebookEditorExtensionsRegistry } from '../../notebook/browser/notebookEditorExtensions.js';
import { INotebookEditorService, } from '../../notebook/browser/services/notebookEditorService.js';
import { getDefaultNotebookCreationOptions, NotebookEditorWidget, } from '../../notebook/browser/notebookEditorWidget.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { ExecutionStateCellStatusBarContrib, TimerCellStatusBarContrib, } from '../../notebook/browser/contrib/cellStatusBar/executionStatusBarItemController.js';
import { INotebookKernelService } from '../../notebook/common/notebookKernelService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ReplEditorSettings, INTERACTIVE_INPUT_CURSOR_BOUNDARY, } from '../../interactive/browser/interactiveCommon.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { NotebookOptions } from '../../notebook/browser/notebookOptions.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { createActionViewItem, getActionBarActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { MarkerController } from '../../../../editor/contrib/gotoError/browser/gotoError.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../notebook/common/notebookExecutionStateService.js';
import { NOTEBOOK_KERNEL } from '../../notebook/common/notebookContextKeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { isEqual } from '../../../../base/common/resources.js';
import { NotebookFindContrib } from '../../notebook/browser/contrib/find/notebookFindWidget.js';
import { REPL_EDITOR_ID } from '../../notebook/common/notebookCommon.js';
import './interactiveEditor.css';
import { deepClone } from '../../../../base/common/objects.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { ReplEditorInput } from './replEditorInput.js';
import { ReplInputHintContentWidget } from '../../interactive/browser/replInputHintContentWidget.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
const INTERACTIVE_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'InteractiveEditorViewState';
const INPUT_CELL_VERTICAL_PADDING = 8;
const INPUT_CELL_HORIZONTAL_PADDING_RIGHT = 10;
const INPUT_EDITOR_PADDING = 8;
let ReplEditor = class ReplEditor extends EditorPane {
    get onDidFocus() {
        return this._onDidFocusWidget.event;
    }
    constructor(group, telemetryService, themeService, storageService, instantiationService, notebookWidgetService, contextKeyService, notebookKernelService, languageService, keybindingService, configurationService, menuService, contextMenuService, editorGroupService, textResourceConfigurationService, notebookExecutionStateService, extensionService, _accessibilityService) {
        super(REPL_EDITOR_ID, group, telemetryService, themeService, storageService);
        this._accessibilityService = _accessibilityService;
        this._notebookWidget = { value: undefined };
        this._widgetDisposableStore = this._register(new DisposableStore());
        this._groupListener = this._register(new MutableDisposable());
        this._onDidFocusWidget = this._register(new Emitter());
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeScroll = this._register(new Emitter());
        this.onDidChangeScroll = this._onDidChangeScroll.event;
        this._notebookWidgetService = notebookWidgetService;
        this._configurationService = configurationService;
        this._notebookKernelService = notebookKernelService;
        this._languageService = languageService;
        this._keybindingService = keybindingService;
        this._menuService = menuService;
        this._contextMenuService = contextMenuService;
        this._editorGroupService = editorGroupService;
        this._extensionService = extensionService;
        this._rootElement = DOM.$('.interactive-editor');
        this._contextKeyService = this._register(contextKeyService.createScoped(this._rootElement));
        this._contextKeyService.createKey('isCompositeNotebook', true);
        this._instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._editorOptions = this._computeEditorOptions();
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor') || e.affectsConfiguration('notebook')) {
                this._editorOptions = this._computeEditorOptions();
            }
        }));
        this._notebookOptions = instantiationService.createInstance(NotebookOptions, this.window, true, {
            cellToolbarInteraction: 'hover',
            globalToolbar: true,
            stickyScrollEnabled: false,
            dragAndDropEnabled: false,
            disableRulers: true,
        });
        this._editorMemento = this.getEditorMemento(editorGroupService, textResourceConfigurationService, INTERACTIVE_EDITOR_VIEW_STATE_PREFERENCE_KEY);
        this._register(this._keybindingService.onDidUpdateKeybindings(this._updateInputHint, this));
        this._register(notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell &&
                isEqual(e.notebook, this._notebookWidget.value?.viewModel?.notebookDocument.uri)) {
                const cell = this._notebookWidget.value?.getCellByHandle(e.cellHandle);
                if (cell && e.changed?.state) {
                    this._scrollIfNecessary(cell);
                }
            }
        }));
    }
    get inputCellContainerHeight() {
        return 19 + 2 + INPUT_CELL_VERTICAL_PADDING * 2 + INPUT_EDITOR_PADDING * 2;
    }
    get inputCellEditorHeight() {
        return 19 + INPUT_EDITOR_PADDING * 2;
    }
    createEditor(parent) {
        DOM.append(parent, this._rootElement);
        this._rootElement.style.position = 'relative';
        this._notebookEditorContainer = DOM.append(this._rootElement, DOM.$('.notebook-editor-container'));
        this._inputCellContainer = DOM.append(this._rootElement, DOM.$('.input-cell-container'));
        this._inputCellContainer.style.position = 'absolute';
        this._inputCellContainer.style.height = `${this.inputCellContainerHeight}px`;
        this._inputFocusIndicator = DOM.append(this._inputCellContainer, DOM.$('.input-focus-indicator'));
        this._inputRunButtonContainer = DOM.append(this._inputCellContainer, DOM.$('.run-button-container'));
        this._setupRunButtonToolbar(this._inputRunButtonContainer);
        this._inputEditorContainer = DOM.append(this._inputCellContainer, DOM.$('.input-editor-container'));
        this._createLayoutStyles();
    }
    _setupRunButtonToolbar(runButtonContainer) {
        const menu = this._register(this._menuService.createMenu(MenuId.ReplInputExecute, this._contextKeyService));
        this._runbuttonToolbar = this._register(new ToolBar(runButtonContainer, this._contextMenuService, {
            getKeyBinding: (action) => this._keybindingService.lookupKeybinding(action.id),
            actionViewItemProvider: (action, options) => {
                return createActionViewItem(this._instantiationService, action, options);
            },
            renderDropdownAsChildElement: true,
        }));
        const { primary, secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }));
        this._runbuttonToolbar.setActions([...primary, ...secondary]);
    }
    _createLayoutStyles() {
        this._styleElement = domStylesheets.createStyleSheet(this._rootElement);
        const styleSheets = [];
        const { codeCellLeftMargin, cellRunGutter } = this._notebookOptions.getLayoutConfiguration();
        const { focusIndicator } = this._notebookOptions.getDisplayOptions();
        const leftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
        styleSheets.push(`
			.interactive-editor .input-cell-container {
				padding: ${INPUT_CELL_VERTICAL_PADDING}px ${INPUT_CELL_HORIZONTAL_PADDING_RIGHT}px ${INPUT_CELL_VERTICAL_PADDING}px ${leftMargin}px;
			}
		`);
        if (focusIndicator === 'gutter') {
            styleSheets.push(`
				.interactive-editor .input-cell-container:focus-within .input-focus-indicator::before {
					border-color: var(--vscode-notebook-focusedCellBorder) !important;
				}
				.interactive-editor .input-focus-indicator::before {
					border-color: var(--vscode-notebook-inactiveFocusedCellBorder) !important;
				}
				.interactive-editor .input-cell-container .input-focus-indicator {
					display: block;
					top: ${INPUT_CELL_VERTICAL_PADDING}px;
				}
				.interactive-editor .input-cell-container {
					border-top: 1px solid var(--vscode-notebook-inactiveFocusedCellBorder);
				}
			`);
        }
        else {
            // border
            styleSheets.push(`
				.interactive-editor .input-cell-container {
					border-top: 1px solid var(--vscode-notebook-inactiveFocusedCellBorder);
				}
				.interactive-editor .input-cell-container .input-focus-indicator {
					display: none;
				}
			`);
        }
        styleSheets.push(`
			.interactive-editor .input-cell-container .run-button-container {
				width: ${cellRunGutter}px;
				left: ${codeCellLeftMargin}px;
				margin-top: ${INPUT_EDITOR_PADDING - 2}px;
			}
		`);
        this._styleElement.textContent = styleSheets.join('\n');
    }
    _computeEditorOptions() {
        let overrideIdentifier = undefined;
        if (this._codeEditorWidget) {
            overrideIdentifier = this._codeEditorWidget.getModel()?.getLanguageId();
        }
        const editorOptions = deepClone(this._configurationService.getValue('editor', { overrideIdentifier }));
        const editorOptionsOverride = getSimpleEditorOptions(this._configurationService);
        const computed = Object.freeze({
            ...editorOptions,
            ...editorOptionsOverride,
            ...{
                ariaLabel: localize('replEditorInput', 'REPL Input'),
                glyphMargin: true,
                padding: {
                    top: INPUT_EDITOR_PADDING,
                    bottom: INPUT_EDITOR_PADDING,
                },
                hover: {
                    enabled: true,
                },
                rulers: [],
            },
        });
        return computed;
    }
    saveState() {
        this._saveEditorViewState(this.input);
        super.saveState();
    }
    getViewState() {
        const input = this.input;
        if (!(input instanceof ReplEditorInput)) {
            return undefined;
        }
        this._saveEditorViewState(input);
        return this._loadNotebookEditorViewState(input);
    }
    _saveEditorViewState(input) {
        if (this._notebookWidget.value && input instanceof ReplEditorInput) {
            if (this._notebookWidget.value.isDisposed) {
                return;
            }
            const state = this._notebookWidget.value.getEditorViewState();
            const editorState = this._codeEditorWidget.saveViewState();
            this._editorMemento.saveEditorState(this.group, input.resource, {
                notebook: state,
                input: editorState,
            });
        }
    }
    _loadNotebookEditorViewState(input) {
        const result = this._editorMemento.loadEditorState(this.group, input.resource);
        if (result) {
            return result;
        }
        // when we don't have a view state for the group/input-tuple then we try to use an existing
        // editor for the same resource.
        for (const group of this._editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (group.activeEditorPane !== this &&
                group.activeEditorPane === this &&
                group.activeEditor?.matches(input)) {
                const notebook = this._notebookWidget.value?.getEditorViewState();
                const input = this._codeEditorWidget.saveViewState();
                return {
                    notebook,
                    input,
                };
            }
        }
        return;
    }
    async setInput(input, options, context, token) {
        // there currently is a widget which we still own so
        // we need to hide it before getting a new widget
        this._notebookWidget.value?.onWillHide();
        this._codeEditorWidget?.dispose();
        this._widgetDisposableStore.clear();
        this._notebookWidget = (this._instantiationService.invokeFunction(this._notebookWidgetService.retrieveWidget, this.group.id, input, {
            isReplHistory: true,
            isReadOnly: true,
            contributions: NotebookEditorExtensionsRegistry.getSomeEditorContributions([
                ExecutionStateCellStatusBarContrib.id,
                TimerCellStatusBarContrib.id,
                NotebookFindContrib.id,
            ]),
            menuIds: {
                notebookToolbar: MenuId.InteractiveToolbar,
                cellTitleToolbar: MenuId.InteractiveCellTitle,
                cellDeleteToolbar: MenuId.InteractiveCellDelete,
                cellInsertToolbar: MenuId.NotebookCellBetween,
                cellTopInsertToolbar: MenuId.NotebookCellListTop,
                cellExecuteToolbar: MenuId.InteractiveCellExecute,
                cellExecutePrimary: undefined,
            },
            cellEditorContributions: EditorExtensionsRegistry.getSomeEditorContributions([
                SelectionClipboardContributionID,
                ContextMenuController.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                MarkerController.ID,
            ]),
            options: this._notebookOptions,
            codeWindow: this.window,
        }, undefined, this.window));
        const skipContributions = [
            'workbench.notebook.cellToolbar',
            'editor.contrib.inlineCompletionsController',
        ];
        const inputContributions = getDefaultNotebookCreationOptions().cellEditorContributions?.filter((c) => skipContributions.indexOf(c.id) === -1);
        this._codeEditorWidget = this._instantiationService.createInstance(CodeEditorWidget, this._inputEditorContainer, this._editorOptions, {
            ...{
                isSimpleWidget: false,
                contributions: inputContributions,
            },
        });
        if (this._lastLayoutDimensions) {
            this._notebookEditorContainer.style.height = `${this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight}px`;
            this._notebookWidget.value.layout(new DOM.Dimension(this._lastLayoutDimensions.dimension.width, this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight), this._notebookEditorContainer);
            const leftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
            const maxHeight = Math.min(this._lastLayoutDimensions.dimension.height / 2, this.inputCellEditorHeight);
            this._codeEditorWidget.layout(this._validateDimension(this._lastLayoutDimensions.dimension.width -
                leftMargin -
                INPUT_CELL_HORIZONTAL_PADDING_RIGHT, maxHeight));
            this._inputFocusIndicator.style.height = `${this.inputCellEditorHeight}px`;
            this._inputCellContainer.style.top = `${this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight}px`;
            this._inputCellContainer.style.width = `${this._lastLayoutDimensions.dimension.width}px`;
        }
        await super.setInput(input, options, context, token);
        const model = await input.resolve();
        if (this._runbuttonToolbar) {
            this._runbuttonToolbar.context = input.resource;
        }
        if (model === null) {
            throw new Error('The REPL model could not be resolved');
        }
        this._notebookWidget.value?.setParentContextKeyService(this._contextKeyService);
        const viewState = options?.viewState ?? this._loadNotebookEditorViewState(input);
        await this._extensionService.whenInstalledExtensionsRegistered();
        await this._notebookWidget.value.setModel(model.notebook, viewState?.notebook, undefined, 'repl');
        model.notebook.setCellCollapseDefault(this._notebookOptions.getCellCollapseDefault());
        this._notebookWidget.value.setOptions({
            isReadOnly: true,
        });
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidResizeOutput((cvm) => {
            this._scrollIfNecessary(cvm);
        }));
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidFocusWidget(() => this._onDidFocusWidget.fire()));
        this._widgetDisposableStore.add(this._notebookOptions.onDidChangeOptions((e) => {
            if (e.compactView || e.focusIndicator) {
                // update the styling
                this._styleElement?.remove();
                this._createLayoutStyles();
            }
            if (this._lastLayoutDimensions && this.isVisible()) {
                this.layout(this._lastLayoutDimensions.dimension, this._lastLayoutDimensions.position);
            }
            if (e.interactiveWindowCollapseCodeCells) {
                model.notebook.setCellCollapseDefault(this._notebookOptions.getCellCollapseDefault());
            }
        }));
        const editorModel = await input.resolveInput(model.notebook);
        this._codeEditorWidget.setModel(editorModel);
        if (viewState?.input) {
            this._codeEditorWidget.restoreViewState(viewState.input);
        }
        this._editorOptions = this._computeEditorOptions();
        this._codeEditorWidget.updateOptions(this._editorOptions);
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidFocusEditorWidget(() => this._onDidFocusWidget.fire()));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidContentSizeChange((e) => {
            if (!e.contentHeightChanged) {
                return;
            }
            if (this._lastLayoutDimensions) {
                this._layoutWidgets(this._lastLayoutDimensions.dimension, this._lastLayoutDimensions.position);
            }
        }));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeCursorPosition((e) => this._onDidChangeSelection.fire({ reason: this._toEditorPaneSelectionChangeReason(e) })));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeModelContent(() => this._onDidChangeSelection.fire({ reason: 3 /* EditorPaneSelectionChangeReason.EDIT */ })));
        this._widgetDisposableStore.add(this._notebookKernelService.onDidChangeNotebookAffinity(this._syncWithKernel, this));
        this._widgetDisposableStore.add(this._notebookKernelService.onDidChangeSelectedNotebooks(this._syncWithKernel, this));
        this._widgetDisposableStore.add(this.themeService.onDidColorThemeChange(() => {
            if (this.isVisible()) {
                this._updateInputHint();
            }
        }));
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeModelContent(() => {
            if (this.isVisible()) {
                this._updateInputHint();
            }
        }));
        this._codeEditorWidget.onDidChangeModelDecorations(() => {
            if (this.isVisible()) {
                this._updateInputHint();
            }
        });
        const cursorAtBoundaryContext = INTERACTIVE_INPUT_CURSOR_BOUNDARY.bindTo(this._contextKeyService);
        if (input.resource && input.historyService.has(input.resource)) {
            cursorAtBoundaryContext.set('top');
        }
        else {
            cursorAtBoundaryContext.set('none');
        }
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeCursorPosition(({ position }) => {
            const viewModel = this._codeEditorWidget._getViewModel();
            const lastLineNumber = viewModel.getLineCount();
            const lastLineCol = viewModel.getLineLength(lastLineNumber) + 1;
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
            const firstLine = viewPosition.lineNumber === 1 && viewPosition.column === 1;
            const lastLine = viewPosition.lineNumber === lastLineNumber && viewPosition.column === lastLineCol;
            if (firstLine) {
                if (lastLine) {
                    cursorAtBoundaryContext.set('both');
                }
                else {
                    cursorAtBoundaryContext.set('top');
                }
            }
            else {
                if (lastLine) {
                    cursorAtBoundaryContext.set('bottom');
                }
                else {
                    cursorAtBoundaryContext.set('none');
                }
            }
        }));
        this._widgetDisposableStore.add(editorModel.onDidChangeContent(() => {
            const value = editorModel.getValue();
            if (this.input?.resource && value !== '') {
                const historyService = this.input.historyService;
                if (!historyService.matchesCurrent(this.input.resource, value)) {
                    historyService.replaceLast(this.input.resource, value);
                }
            }
        }));
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidScroll(() => this._onDidChangeScroll.fire()));
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidChangeViewCells(this.handleViewCellChange, this));
        this._updateInputHint();
        this._syncWithKernel();
    }
    handleViewCellChange(e) {
        const notebookWidget = this._notebookWidget.value;
        if (!notebookWidget) {
            return;
        }
        for (const splice of e.splices) {
            const [_start, _delete, addedCells] = splice;
            if (addedCells.length) {
                const viewModel = notebookWidget.viewModel;
                if (viewModel) {
                    this.handleAppend(notebookWidget, viewModel);
                    break;
                }
            }
        }
    }
    handleAppend(notebookWidget, viewModel) {
        this._notebookWidgetService.updateReplContextKey(viewModel.notebookDocument.uri.toString());
        const navigateToCell = this._configurationService.getValue('accessibility.replEditor.autoFocusReplExecution');
        if (this._accessibilityService.isScreenReaderOptimized()) {
            if (navigateToCell === 'lastExecution') {
                setTimeout(() => {
                    const lastCellIndex = viewModel.length - 1;
                    if (lastCellIndex >= 0) {
                        const cell = viewModel.viewCells[lastCellIndex];
                        notebookWidget.focusNotebookCell(cell, 'container');
                    }
                }, 0);
            }
            else if (navigateToCell === 'input') {
                this._codeEditorWidget.focus();
            }
        }
    }
    setOptions(options) {
        this._notebookWidget.value?.setOptions(options);
        super.setOptions(options);
    }
    _toEditorPaneSelectionChangeReason(e) {
        switch (e.source) {
            case "api" /* TextEditorSelectionSource.PROGRAMMATIC */:
                return 1 /* EditorPaneSelectionChangeReason.PROGRAMMATIC */;
            case "code.navigation" /* TextEditorSelectionSource.NAVIGATION */:
                return 4 /* EditorPaneSelectionChangeReason.NAVIGATION */;
            case "code.jump" /* TextEditorSelectionSource.JUMP */:
                return 5 /* EditorPaneSelectionChangeReason.JUMP */;
            default:
                return 2 /* EditorPaneSelectionChangeReason.USER */;
        }
    }
    _cellAtBottom(cell) {
        const visibleRanges = this._notebookWidget.value?.visibleRanges || [];
        const cellIndex = this._notebookWidget.value?.getCellIndex(cell);
        if (cellIndex === Math.max(...visibleRanges.map((range) => range.end - 1))) {
            return true;
        }
        return false;
    }
    _scrollIfNecessary(cvm) {
        const index = this._notebookWidget.value.getCellIndex(cvm);
        if (index === this._notebookWidget.value.getLength() - 1) {
            // If we're already at the bottom or auto scroll is enabled, scroll to the bottom
            if (this._configurationService.getValue(ReplEditorSettings.interactiveWindowAlwaysScrollOnNewCell) ||
                this._cellAtBottom(cvm)) {
                this._notebookWidget.value.scrollToBottom();
            }
        }
    }
    _syncWithKernel() {
        const notebook = this._notebookWidget.value?.textModel;
        const textModel = this._codeEditorWidget.getModel();
        if (notebook && textModel) {
            const info = this._notebookKernelService.getMatchingKernel(notebook);
            const selectedOrSuggested = info.selected ??
                (info.suggestions.length === 1 ? info.suggestions[0] : undefined) ??
                (info.all.length === 1 ? info.all[0] : undefined);
            if (selectedOrSuggested) {
                const language = selectedOrSuggested.supportedLanguages[0];
                // All kernels will initially list plaintext as the supported language before they properly initialized.
                if (language && language !== 'plaintext') {
                    const newMode = this._languageService.createById(language).languageId;
                    textModel.setLanguage(newMode);
                }
                NOTEBOOK_KERNEL.bindTo(this._contextKeyService).set(selectedOrSuggested.id);
            }
        }
    }
    layout(dimension, position) {
        this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
        this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
        const editorHeightChanged = dimension.height !== this._lastLayoutDimensions?.dimension.height;
        this._lastLayoutDimensions = { dimension, position };
        if (!this._notebookWidget.value) {
            return;
        }
        if (editorHeightChanged && this._codeEditorWidget) {
            SuggestController.get(this._codeEditorWidget)?.cancelSuggestWidget();
        }
        this._notebookEditorContainer.style.height = `${this._lastLayoutDimensions.dimension.height - this.inputCellContainerHeight}px`;
        this._layoutWidgets(dimension, position);
    }
    _layoutWidgets(dimension, position) {
        const contentHeight = this._codeEditorWidget.hasModel()
            ? this._codeEditorWidget.getContentHeight()
            : this.inputCellEditorHeight;
        const maxHeight = Math.min(dimension.height / 2, contentHeight);
        const leftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
        const inputCellContainerHeight = maxHeight + INPUT_CELL_VERTICAL_PADDING * 2;
        this._notebookEditorContainer.style.height = `${dimension.height - inputCellContainerHeight}px`;
        this._notebookWidget.value.layout(dimension.with(dimension.width, dimension.height - inputCellContainerHeight), this._notebookEditorContainer, position);
        this._codeEditorWidget.layout(this._validateDimension(dimension.width - leftMargin - INPUT_CELL_HORIZONTAL_PADDING_RIGHT, maxHeight));
        this._inputFocusIndicator.style.height = `${contentHeight}px`;
        this._inputCellContainer.style.top = `${dimension.height - inputCellContainerHeight}px`;
        this._inputCellContainer.style.width = `${dimension.width}px`;
    }
    _validateDimension(width, height) {
        return new DOM.Dimension(Math.max(0, width), Math.max(0, height));
    }
    _hasConflictingDecoration() {
        return Boolean(this._codeEditorWidget
            .getLineDecorations(1)
            ?.find((d) => d.options.beforeContentClassName ||
            d.options.afterContentClassName ||
            d.options.before?.content ||
            d.options.after?.content));
    }
    _updateInputHint() {
        if (!this._codeEditorWidget) {
            return;
        }
        const shouldHide = !this._codeEditorWidget.hasModel() ||
            this._configurationService.getValue(ReplEditorSettings.showExecutionHint) ===
                false ||
            this._codeEditorWidget.getModel().getValueLength() !== 0 ||
            this._hasConflictingDecoration();
        if (!this._hintElement && !shouldHide) {
            this._hintElement = this._instantiationService.createInstance(ReplInputHintContentWidget, this._codeEditorWidget);
        }
        else if (this._hintElement && shouldHide) {
            this._hintElement.dispose();
            this._hintElement = undefined;
        }
    }
    getScrollPosition() {
        return {
            scrollTop: this._notebookWidget.value?.scrollTop ?? 0,
            scrollLeft: 0,
        };
    }
    setScrollPosition(position) {
        this._notebookWidget.value?.setScrollTop(position.scrollTop);
    }
    focus() {
        super.focus();
        this._notebookWidget.value?.onShow();
        this._codeEditorWidget.focus();
    }
    focusHistory() {
        this._notebookWidget.value.focus();
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        this._groupListener.value = this.group.onWillCloseEditor((e) => this._saveEditorViewState(e.editor));
        if (!visible) {
            this._saveEditorViewState(this.input);
            if (this.input && this._notebookWidget.value) {
                this._notebookWidget.value.onWillHide();
            }
        }
        this._updateInputHint();
    }
    clearInput() {
        if (this._notebookWidget.value) {
            this._saveEditorViewState(this.input);
            this._notebookWidget.value.onWillHide();
        }
        this._codeEditorWidget?.dispose();
        this._notebookWidget = { value: undefined };
        this._widgetDisposableStore.clear();
        super.clearInput();
    }
    getControl() {
        return {
            notebookEditor: this._notebookWidget.value,
            activeCodeEditor: this.getActiveCodeEditor(),
            onDidChangeActiveEditor: Event.None,
        };
    }
    getActiveCodeEditor() {
        if (!this._codeEditorWidget) {
            return undefined;
        }
        return this._codeEditorWidget.hasWidgetFocus() || !this._notebookWidget.value?.activeCodeEditor
            ? this._codeEditorWidget
            : this._notebookWidget.value.activeCodeEditor;
    }
};
ReplEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService),
    __param(5, INotebookEditorService),
    __param(6, IContextKeyService),
    __param(7, INotebookKernelService),
    __param(8, ILanguageService),
    __param(9, IKeybindingService),
    __param(10, IConfigurationService),
    __param(11, IMenuService),
    __param(12, IContextMenuService),
    __param(13, IEditorGroupsService),
    __param(14, ITextResourceConfigurationService),
    __param(15, INotebookExecutionStateService),
    __param(16, IExtensionService),
    __param(17, IAccessibilityService)
], ReplEditor);
export { ReplEditor };
export function isReplEditorControl(control) {
    const candidate = control;
    return (candidate?.activeCodeEditor instanceof CodeEditorWidget &&
        candidate?.notebookEditor instanceof NotebookEditorWidget);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVwbE5vdGVib29rL2Jyb3dzZXIvcmVwbEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUtuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQU94RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxF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