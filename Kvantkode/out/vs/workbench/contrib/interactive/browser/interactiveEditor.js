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
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { getSimpleEditorOptions } from '../../codeEditor/browser/simpleEditorOptions.js';
import { InteractiveEditorInput } from './interactiveEditorInput.js';
import { NotebookEditorExtensionsRegistry } from '../../notebook/browser/notebookEditorExtensions.js';
import { INotebookEditorService, } from '../../notebook/browser/services/notebookEditorService.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { ExecutionStateCellStatusBarContrib, TimerCellStatusBarContrib, } from '../../notebook/browser/contrib/cellStatusBar/executionStatusBarItemController.js';
import { INotebookKernelService } from '../../notebook/common/notebookKernelService.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ReplEditorSettings, INTERACTIVE_INPUT_CURSOR_BOUNDARY } from './interactiveCommon.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { NotebookOptions } from '../../notebook/browser/notebookOptions.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { createActionViewItem, getActionBarActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { ParameterHintsController } from '../../../../editor/contrib/parameterHints/browser/parameterHints.js';
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { TabCompletionController } from '../../snippets/browser/tabCompletion.js';
import { MarkerController } from '../../../../editor/contrib/gotoError/browser/gotoError.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../notebook/common/notebookExecutionStateService.js';
import { NOTEBOOK_KERNEL } from '../../notebook/common/notebookContextKeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { isEqual } from '../../../../base/common/resources.js';
import { NotebookFindContrib } from '../../notebook/browser/contrib/find/notebookFindWidget.js';
import { INTERACTIVE_WINDOW_EDITOR_ID } from '../../notebook/common/notebookCommon.js';
import './interactiveEditor.css';
import { deepClone } from '../../../../base/common/objects.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { ReplInputHintContentWidget } from './replInputHintContentWidget.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { INLINE_CHAT_ID } from '../../inlineChat/common/inlineChat.js';
const DECORATION_KEY = 'interactiveInputDecoration';
const INTERACTIVE_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'InteractiveEditorViewState';
const INPUT_CELL_VERTICAL_PADDING = 8;
const INPUT_CELL_HORIZONTAL_PADDING_RIGHT = 10;
const INPUT_EDITOR_PADDING = 8;
let InteractiveEditor = class InteractiveEditor extends EditorPane {
    get onDidFocus() {
        return this._onDidFocusWidget.event;
    }
    constructor(group, telemetryService, themeService, storageService, instantiationService, notebookWidgetService, contextKeyService, codeEditorService, notebookKernelService, languageService, keybindingService, configurationService, menuService, contextMenuService, editorGroupService, textResourceConfigurationService, notebookExecutionStateService, extensionService) {
        super(INTERACTIVE_WINDOW_EDITOR_ID, group, telemetryService, themeService, storageService);
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
        this._notebookExecutionStateService = notebookExecutionStateService;
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
        codeEditorService.registerDecorationType('interactive-decoration', DECORATION_KEY, {});
        this._register(this._keybindingService.onDidUpdateKeybindings(this._updateInputHint, this));
        this._register(this._notebookExecutionStateService.onDidChangeExecution((e) => {
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
        const menu = this._register(this._menuService.createMenu(MenuId.InteractiveInputExecute, this._contextKeyService));
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
        if (!(input instanceof InteractiveEditorInput)) {
            return undefined;
        }
        this._saveEditorViewState(input);
        return this._loadNotebookEditorViewState(input);
    }
    _saveEditorViewState(input) {
        if (this._notebookWidget.value && input instanceof InteractiveEditorInput) {
            if (this._notebookWidget.value.isDisposed) {
                return;
            }
            const state = this._notebookWidget.value.getEditorViewState();
            const editorState = this._codeEditorWidget.saveViewState();
            this._editorMemento.saveEditorState(this.group, input.notebookEditorInput.resource, {
                notebook: state,
                input: editorState,
            });
        }
    }
    _loadNotebookEditorViewState(input) {
        const result = this._editorMemento.loadEditorState(this.group, input.notebookEditorInput.resource);
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
        const notebookInput = input.notebookEditorInput;
        // there currently is a widget which we still own so
        // we need to hide it before getting a new widget
        this._notebookWidget.value?.onWillHide();
        this._codeEditorWidget?.dispose();
        this._widgetDisposableStore.clear();
        this._notebookWidget = (this._instantiationService.invokeFunction(this._notebookWidgetService.retrieveWidget, this.group.id, notebookInput, {
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
        this._codeEditorWidget = this._instantiationService.createInstance(CodeEditorWidget, this._inputEditorContainer, this._editorOptions, {
            ...{
                isSimpleWidget: false,
                contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                    MenuPreventer.ID,
                    SelectionClipboardContributionID,
                    ContextMenuController.ID,
                    SuggestController.ID,
                    ParameterHintsController.ID,
                    SnippetController2.ID,
                    TabCompletionController.ID,
                    ContentHoverController.ID,
                    GlyphHoverController.ID,
                    MarkerController.ID,
                    INLINE_CHAT_ID,
                ]),
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
            throw new Error('The Interactive Window model could not be resolved');
        }
        this._notebookWidget.value?.setParentContextKeyService(this._contextKeyService);
        const viewState = options?.viewState ?? this._loadNotebookEditorViewState(input);
        await this._extensionService.whenInstalledExtensionsRegistered();
        await this._notebookWidget.value.setModel(model.notebook, viewState?.notebook);
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
        const languageId = this._notebookWidget.value?.activeKernel?.supportedLanguages[0] ??
            input.language ??
            PLAINTEXT_LANGUAGE_ID;
        const editorModel = await input.resolveInput(languageId);
        editorModel.setLanguage(languageId);
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
        this._widgetDisposableStore.add(this._codeEditorWidget.onDidChangeModel(() => {
            this._updateInputHint();
        }));
        this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ReplEditorSettings.showExecutionHint)) {
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
            if (this.input?.resource) {
                const historyService = this.input.historyService;
                if (!historyService.matchesCurrent(this.input.resource, value)) {
                    historyService.replaceLast(this.input.resource, value);
                }
            }
        }));
        this._widgetDisposableStore.add(this._notebookWidget.value.onDidScroll(() => this._onDidChangeScroll.fire()));
        this._syncWithKernel();
        this._updateInputHint();
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
            activeCodeEditor: this._codeEditorWidget,
            onDidChangeActiveEditor: Event.None,
        };
    }
};
InteractiveEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService),
    __param(5, INotebookEditorService),
    __param(6, IContextKeyService),
    __param(7, ICodeEditorService),
    __param(8, INotebookKernelService),
    __param(9, ILanguageService),
    __param(10, IKeybindingService),
    __param(11, IConfigurationService),
    __param(12, IMenuService),
    __param(13, IContextMenuService),
    __param(14, IEditorGroupsService),
    __param(15, ITextResourceConfigurationService),
    __param(16, INotebookExecutionStateService),
    __param(17, IExtensionService)
], InteractiveEditor);
export { InteractiveEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ludGVyYWN0aXZlL2Jyb3dzZXIvaW50ZXJhY3RpdmVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxjQUFjLE1BQU0sNENBQTRDLENBQUE7QUFFNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFLbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFTeEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFNcEUsT0FBTyxFQUFFLGdD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