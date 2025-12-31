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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbnRlcmFjdGl2ZS9icm93c2VyL2ludGVyYWN0aXZlRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRDQUE0QyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBS25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBU3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBTXBFLE9BQU8sRUFBRSxnQ0FBZ0Ms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