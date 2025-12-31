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
import * as DOM from '../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { disposableTimeout, raceCancellation } from '../../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { tokenizeToStringSync } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
import { localize } from '../../../../../../nls.js';
import { IAccessibilityService } from '../../../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { CellEditState, CellFocusMode, EXPAND_CELL_INPUT_COMMAND_ID, } from '../../notebookBrowser.js';
import { collapsedIcon, expandedIcon } from '../../notebookIcons.js';
import { CellEditorOptions } from './cellEditorOptions.js';
import { WordHighlighterContribution } from '../../../../../../editor/contrib/wordHighlighter/browser/wordHighlighter.js';
let MarkupCell = class MarkupCell extends Disposable {
    constructor(notebookEditor, viewCell, templateData, renderedEditors, accessibilityService, contextKeyService, instantiationService, languageService, configurationService, keybindingService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.templateData = templateData;
        this.renderedEditors = renderedEditors;
        this.accessibilityService = accessibilityService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.languageService = languageService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.editor = null;
        this.localDisposables = this._register(new DisposableStore());
        this.focusSwitchDisposable = this._register(new MutableDisposable());
        this.editorDisposables = this._register(new DisposableStore());
        this._isDisposed = false;
        this.constructDOM();
        this.editorPart = templateData.editorPart;
        this.cellEditorOptions = this._register(new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(viewCell.language), this.notebookEditor.notebookOptions, this.configurationService));
        this.cellEditorOptions.setLineNumbers(this.viewCell.lineNumbers);
        this.editorOptions = this.cellEditorOptions.getValue(this.viewCell.internalMetadata, this.viewCell.uri);
        this._register(toDisposable(() => renderedEditors.delete(this.viewCell)));
        this.registerListeners();
        // update for init state
        this.templateData.cellParts.scheduleRenderCell(this.viewCell);
        this._register(toDisposable(() => {
            this.templateData.cellParts.unrenderCell(this.viewCell);
        }));
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => {
            this.viewUpdate();
        }));
        this.updateForHover();
        this.updateForFocusModeChange();
        this.foldingState = viewCell.foldingState;
        this.layoutFoldingIndicator();
        this.updateFoldingIconShowClass();
        // the markdown preview's height might already be updated after the renderer calls `element.getHeight()`
        if (this.viewCell.layoutInfo.totalHeight > 0) {
            this.relayoutCell();
        }
        this.viewUpdate();
        this.layoutCellParts();
        this._register(this.viewCell.onDidChangeLayout(() => {
            this.layoutCellParts();
        }));
    }
    layoutCellParts() {
        this.templateData.cellParts.updateInternalLayoutNow(this.viewCell);
    }
    constructDOM() {
        // Create an element that is only used to announce markup cell content to screen readers
        const id = `aria-markup-cell-${this.viewCell.id}`;
        this.markdownAccessibilityContainer = this.templateData.cellContainer;
        this.markdownAccessibilityContainer.id = id;
        // Hide the element from non-screen readers
        this.markdownAccessibilityContainer.style.height = '1px';
        this.markdownAccessibilityContainer.style.overflow = 'hidden';
        this.markdownAccessibilityContainer.style.position = 'absolute';
        this.markdownAccessibilityContainer.style.top = '100000px';
        this.markdownAccessibilityContainer.style.left = '10000px';
        this.markdownAccessibilityContainer.ariaHidden = 'false';
        this.templateData.rootContainer.setAttribute('aria-describedby', id);
        this.templateData.container.classList.toggle('webview-backed-markdown-cell', true);
    }
    registerListeners() {
        this._register(this.viewCell.onDidChangeState((e) => {
            this.templateData.cellParts.updateState(this.viewCell, e);
        }));
        this._register(this.viewCell.model.onDidChangeMetadata(() => {
            this.viewUpdate();
        }));
        this._register(this.viewCell.onDidChangeState((e) => {
            if (e.editStateChanged || e.contentChanged) {
                this.viewUpdate();
            }
            if (e.focusModeChanged) {
                this.updateForFocusModeChange();
            }
            if (e.foldingStateChanged) {
                const foldingState = this.viewCell.foldingState;
                if (foldingState !== this.foldingState) {
                    this.foldingState = foldingState;
                    this.layoutFoldingIndicator();
                }
            }
            if (e.cellIsHoveredChanged) {
                this.updateForHover();
            }
            if (e.inputCollapsedChanged) {
                this.updateCollapsedState();
                this.viewUpdate();
            }
            if (e.cellLineNumberChanged) {
                this.cellEditorOptions.setLineNumbers(this.viewCell.lineNumbers);
            }
        }));
        this._register(this.notebookEditor.notebookOptions.onDidChangeOptions((e) => {
            if (e.showFoldingControls) {
                this.updateFoldingIconShowClass();
            }
        }));
        this._register(this.viewCell.onDidChangeLayout((e) => {
            const layoutInfo = this.editor?.getLayoutInfo();
            if (e.outerWidth &&
                this.viewCell.getEditState() === CellEditState.Editing &&
                layoutInfo &&
                layoutInfo.width !== this.viewCell.layoutInfo.editorWidth) {
                this.onCellEditorWidthChange();
            }
        }));
        this._register(this.cellEditorOptions.onDidChange(() => this.updateMarkupCellOptions()));
    }
    updateMarkupCellOptions() {
        this.updateEditorOptions(this.cellEditorOptions.getUpdatedValue(this.viewCell.internalMetadata, this.viewCell.uri));
        if (this.editor) {
            this.editor.updateOptions(this.cellEditorOptions.getUpdatedValue(this.viewCell.internalMetadata, this.viewCell.uri));
            const cts = new CancellationTokenSource();
            this._register({
                dispose() {
                    cts.dispose(true);
                },
            });
            raceCancellation(this.viewCell.resolveTextModel(), cts.token).then((model) => {
                if (this._isDisposed) {
                    return;
                }
                if (model) {
                    model.updateOptions({
                        indentSize: this.cellEditorOptions.indentSize,
                        tabSize: this.cellEditorOptions.tabSize,
                        insertSpaces: this.cellEditorOptions.insertSpaces,
                    });
                }
            });
        }
    }
    updateCollapsedState() {
        if (this.viewCell.isInputCollapsed) {
            this.notebookEditor.hideMarkupPreviews([this.viewCell]);
        }
        else {
            this.notebookEditor.unhideMarkupPreviews([this.viewCell]);
        }
    }
    updateForHover() {
        this.templateData.container.classList.toggle('markdown-cell-hover', this.viewCell.cellIsHovered);
    }
    updateForFocusModeChange() {
        if (this.viewCell.focusMode === CellFocusMode.Editor) {
            this.focusEditorIfNeeded();
        }
        this.templateData.container.classList.toggle('cell-editor-focus', this.viewCell.focusMode === CellFocusMode.Editor);
    }
    dispose() {
        this._isDisposed = true;
        // move focus back to the cell list otherwise the focus goes to body
        if (this.notebookEditor.getActiveCell() === this.viewCell &&
            this.viewCell.focusMode === CellFocusMode.Editor &&
            (this.notebookEditor.hasEditorFocus() ||
                this.notebookEditor.getDomNode().ownerDocument.activeElement ===
                    this.notebookEditor.getDomNode().ownerDocument.body)) {
            this.notebookEditor.focusContainer();
        }
        this.viewCell.detachTextEditor();
        super.dispose();
    }
    updateFoldingIconShowClass() {
        const showFoldingIcon = this.notebookEditor.notebookOptions.getDisplayOptions().showFoldingControls;
        this.templateData.foldingIndicator.classList.remove('mouseover', 'always');
        this.templateData.foldingIndicator.classList.add(showFoldingIcon);
    }
    viewUpdate() {
        if (this.viewCell.isInputCollapsed) {
            this.viewUpdateCollapsed();
        }
        else if (this.viewCell.getEditState() === CellEditState.Editing) {
            this.viewUpdateEditing();
        }
        else {
            this.viewUpdatePreview();
        }
    }
    viewUpdateCollapsed() {
        DOM.show(this.templateData.cellInputCollapsedContainer);
        DOM.hide(this.editorPart);
        this.templateData.cellInputCollapsedContainer.innerText = '';
        const markdownIcon = DOM.append(this.templateData.cellInputCollapsedContainer, DOM.$('span'));
        markdownIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.markdown));
        const element = DOM.$('div');
        element.classList.add('cell-collapse-preview');
        const richEditorText = this.getRichText(this.viewCell.textBuffer, this.viewCell.language);
        DOM.safeInnerHtml(element, richEditorText);
        this.templateData.cellInputCollapsedContainer.appendChild(element);
        const expandIcon = DOM.append(element, DOM.$('span.expandInputIcon'));
        expandIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.more));
        const keybinding = this.keybindingService.lookupKeybinding(EXPAND_CELL_INPUT_COMMAND_ID);
        if (keybinding) {
            element.title = localize('cellExpandInputButtonLabelWithDoubleClick', 'Double-click to expand cell input ({0})', keybinding.getLabel());
            expandIcon.title = localize('cellExpandInputButtonLabel', 'Expand Cell Input ({0})', keybinding.getLabel());
        }
        this.markdownAccessibilityContainer.ariaHidden = 'true';
        this.templateData.container.classList.toggle('input-collapsed', true);
        this.viewCell.renderedMarkdownHeight = 0;
        this.viewCell.layoutChange({});
    }
    getRichText(buffer, language) {
        return tokenizeToStringSync(this.languageService, buffer.getLineContent(1), language);
    }
    viewUpdateEditing() {
        // switch to editing mode
        let editorHeight;
        DOM.show(this.editorPart);
        this.markdownAccessibilityContainer.ariaHidden = 'true';
        DOM.hide(this.templateData.cellInputCollapsedContainer);
        this.notebookEditor.hideMarkupPreviews([this.viewCell]);
        this.templateData.container.classList.toggle('input-collapsed', false);
        this.templateData.container.classList.toggle('markdown-cell-edit-mode', true);
        if (this.editor && this.editor.hasModel()) {
            editorHeight = this.editor.getContentHeight();
            // not first time, we don't need to create editor
            this.viewCell.attachTextEditor(this.editor);
            this.focusEditorIfNeeded();
            this.bindEditorListeners(this.editor);
            this.editor.layout({
                width: this.viewCell.layoutInfo.editorWidth,
                height: editorHeight,
            });
        }
        else {
            this.editorDisposables.clear();
            const width = this.notebookEditor.notebookOptions.computeMarkdownCellEditorWidth(this.notebookEditor.getLayoutInfo().width);
            const lineNum = this.viewCell.lineCount;
            const lineHeight = this.viewCell.layoutInfo.fontInfo?.lineHeight || 17;
            const editorPadding = this.notebookEditor.notebookOptions.computeEditorPadding(this.viewCell.internalMetadata, this.viewCell.uri);
            editorHeight = Math.max(lineNum, 1) * lineHeight + editorPadding.top + editorPadding.bottom;
            this.templateData.editorContainer.innerText = '';
            // create a special context key service that set the inCompositeEditor-contextkey
            const editorContextKeyService = this.contextKeyService.createScoped(this.templateData.editorPart);
            EditorContextKeys.inCompositeEditor.bindTo(editorContextKeyService).set(true);
            const editorInstaService = this.editorDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editorContextKeyService])));
            this.editorDisposables.add(editorContextKeyService);
            this.editor = this.editorDisposables.add(editorInstaService.createInstance(CodeEditorWidget, this.templateData.editorContainer, {
                ...this.editorOptions,
                dimension: {
                    width: width,
                    height: editorHeight,
                },
                // overflowWidgetsDomNode: this.notebookEditor.getOverflowContainerDomNode()
            }, {
                contributions: this.notebookEditor.creationOptions.cellEditorContributions,
            }));
            this.templateData.currentEditor = this.editor;
            this.editorDisposables.add(this.editor.onDidBlurEditorWidget(() => {
                if (this.editor) {
                    WordHighlighterContribution.get(this.editor)?.stopHighlighting();
                }
            }));
            this.editorDisposables.add(this.editor.onDidFocusEditorWidget(() => {
                if (this.editor) {
                    WordHighlighterContribution.get(this.editor)?.restoreViewState(true);
                }
            }));
            const cts = new CancellationTokenSource();
            this.editorDisposables.add({
                dispose() {
                    cts.dispose(true);
                },
            });
            raceCancellation(this.viewCell.resolveTextModel(), cts.token).then((model) => {
                if (!model) {
                    return;
                }
                this.editor.setModel(model);
                model.updateOptions({
                    indentSize: this.cellEditorOptions.indentSize,
                    tabSize: this.cellEditorOptions.tabSize,
                    insertSpaces: this.cellEditorOptions.insertSpaces,
                });
                const realContentHeight = this.editor.getContentHeight();
                if (realContentHeight !== editorHeight) {
                    this.editor.layout({
                        width: width,
                        height: realContentHeight,
                    });
                    editorHeight = realContentHeight;
                }
                this.viewCell.attachTextEditor(this.editor);
                if (this.viewCell.getEditState() === CellEditState.Editing) {
                    this.focusEditorIfNeeded();
                }
                this.bindEditorListeners(this.editor);
                this.viewCell.editorHeight = editorHeight;
            });
        }
        this.viewCell.editorHeight = editorHeight;
        this.focusEditorIfNeeded();
        this.renderedEditors.set(this.viewCell, this.editor);
    }
    viewUpdatePreview() {
        this.viewCell.detachTextEditor();
        DOM.hide(this.editorPart);
        DOM.hide(this.templateData.cellInputCollapsedContainer);
        this.markdownAccessibilityContainer.ariaHidden = 'false';
        this.templateData.container.classList.toggle('input-collapsed', false);
        this.templateData.container.classList.toggle('markdown-cell-edit-mode', false);
        this.renderedEditors.delete(this.viewCell);
        this.markdownAccessibilityContainer.innerText = '';
        if (this.viewCell.renderedHtml) {
            if (this.accessibilityService.isScreenReaderOptimized()) {
                DOM.safeInnerHtml(this.markdownAccessibilityContainer, this.viewCell.renderedHtml);
            }
            else {
                DOM.clearNode(this.markdownAccessibilityContainer);
            }
        }
        this.notebookEditor.createMarkupPreview(this.viewCell);
    }
    focusEditorIfNeeded() {
        if (this.viewCell.focusMode === CellFocusMode.Editor &&
            (this.notebookEditor.hasEditorFocus() ||
                this.notebookEditor.getDomNode().ownerDocument.activeElement ===
                    this.notebookEditor.getDomNode().ownerDocument.body)) {
            // Don't steal focus from other workbench parts, but if body has focus, we can take it
            if (!this.editor) {
                return;
            }
            this.editor.focus();
            const primarySelection = this.editor.getSelection();
            if (!primarySelection) {
                return;
            }
            this.notebookEditor.revealRangeInViewAsync(this.viewCell, primarySelection);
        }
    }
    layoutEditor(dimension) {
        this.editor?.layout(dimension);
    }
    onCellEditorWidthChange() {
        const realContentHeight = this.editor.getContentHeight();
        this.layoutEditor({
            width: this.viewCell.layoutInfo.editorWidth,
            height: realContentHeight,
        });
        // LET the content size observer to handle it
        // this.viewCell.editorHeight = realContentHeight;
        // this.relayoutCell();
    }
    relayoutCell() {
        this.notebookEditor.layoutNotebookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
        this.layoutFoldingIndicator();
    }
    updateEditorOptions(newValue) {
        this.editorOptions = newValue;
        this.editor?.updateOptions(this.editorOptions);
    }
    layoutFoldingIndicator() {
        switch (this.foldingState) {
            case 0 /* CellFoldingState.None */:
                this.templateData.foldingIndicator.style.display = 'none';
                this.templateData.foldingIndicator.innerText = '';
                break;
            case 2 /* CellFoldingState.Collapsed */:
                this.templateData.foldingIndicator.style.display = '';
                DOM.reset(this.templateData.foldingIndicator, renderIcon(collapsedIcon));
                break;
            case 1 /* CellFoldingState.Expanded */:
                this.templateData.foldingIndicator.style.display = '';
                DOM.reset(this.templateData.foldingIndicator, renderIcon(expandedIcon));
                break;
            default:
                break;
        }
    }
    bindEditorListeners(editor) {
        this.localDisposables.clear();
        this.focusSwitchDisposable.clear();
        this.localDisposables.add(editor.onDidContentSizeChange((e) => {
            if (e.contentHeightChanged) {
                this.onCellEditorHeightChange(editor, e.contentHeight);
            }
        }));
        this.localDisposables.add(editor.onDidChangeCursorSelection((e) => {
            if (e.source === 'restoreState') {
                // do not reveal the cell into view if this selection change was caused by restoring editors...
                return;
            }
            const selections = editor.getSelections();
            if (selections?.length) {
                const contentHeight = editor.getContentHeight();
                const layoutContentHeight = this.viewCell.layoutInfo.editorHeight;
                if (contentHeight !== layoutContentHeight) {
                    this.onCellEditorHeightChange(editor, contentHeight);
                }
                const lastSelection = selections[selections.length - 1];
                this.notebookEditor.revealRangeInViewAsync(this.viewCell, lastSelection);
            }
        }));
        const updateFocusMode = () => (this.viewCell.focusMode = editor.hasWidgetFocus()
            ? CellFocusMode.Editor
            : CellFocusMode.Container);
        this.localDisposables.add(editor.onDidFocusEditorWidget(() => {
            updateFocusMode();
        }));
        this.localDisposables.add(editor.onDidBlurEditorWidget(() => {
            // this is for a special case:
            // users click the status bar empty space, which we will then focus the editor
            // so we don't want to update the focus state too eagerly
            if (this.templateData.container.ownerDocument.activeElement?.contains(this.templateData.container)) {
                this.focusSwitchDisposable.value = disposableTimeout(() => updateFocusMode(), 300);
            }
            else {
                updateFocusMode();
            }
        }));
        updateFocusMode();
    }
    onCellEditorHeightChange(editor, newHeight) {
        const viewLayout = editor.getLayoutInfo();
        this.viewCell.editorHeight = newHeight;
        editor.layout({
            width: viewLayout.width,
            height: newHeight,
        });
    }
};
MarkupCell = __decorate([
    __param(4, IAccessibilityService),
    __param(5, IContextKeyService),
    __param(6, IInstantiationService),
    __param(7, ILanguageService),
    __param(8, IConfigurationService),
    __param(9, IKeybindingService)
], MarkupCell);
export { MarkupCell };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwQ2VsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvbWFya3VwQ2VsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3RFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUV6RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUV2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtC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