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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlcGxOb3RlYm9vay9icm93c2VyL3JlcGxFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxjQUFjLE1BQU0sNENBQTRDLENBQUE7QUFFNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFLbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFTeEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFPeEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckcsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsb0JBQW9C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