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
import { localize } from '../../../../../../nls.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { raceCancellation } from '../../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import * as strings from '../../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { tokenizeToStringSync } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
import { CodeActionController } from '../../../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { CellFocusMode, EXPAND_CELL_INPUT_COMMAND_ID, } from '../../notebookBrowser.js';
import { outputDisplayLimit } from '../../viewModel/codeCellViewModel.js';
import { CellEditorOptions } from './cellEditorOptions.js';
import { CellOutputContainer } from './cellOutput.js';
import { CollapsedCodeCellExecutionIcon } from './codeCellExecutionIcon.js';
let CodeCell = class CodeCell extends Disposable {
    constructor(notebookEditor, viewCell, templateData, editorPool, instantiationService, keybindingService, openerService, languageService, configurationService, notebookExecutionStateService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.templateData = templateData;
        this.editorPool = editorPool;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.languageService = languageService;
        this.configurationService = configurationService;
        this._isDisposed = false;
        this._cellEditorOptions = this._register(new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(viewCell.language), this.notebookEditor.notebookOptions, this.configurationService));
        this._outputContainerRenderer = this.instantiationService.createInstance(CellOutputContainer, notebookEditor, viewCell, templateData, { limit: outputDisplayLimit });
        this.cellParts = this._register(templateData.cellParts.concatContentPart([this._cellEditorOptions, this._outputContainerRenderer], DOM.getWindow(notebookEditor.getDomNode())));
        // this.viewCell.layoutInfo.editorHeight or estimation when this.viewCell.layoutInfo.editorHeight === 0
        const editorHeight = this.calculateInitEditorHeight();
        this.initializeEditor(editorHeight);
        this._renderedInputCollapseState = false; // editor is always expanded initially
        this.registerNotebookEditorListeners();
        this.registerViewCellLayoutChange();
        this.registerCellEditorEventListeners();
        this.registerMouseListener();
        this._register(Event.any(this.viewCell.onDidStartExecution, this.viewCell.onDidStopExecution)((e) => {
            this.cellParts.updateForExecutionState(this.viewCell, e);
        }));
        this._register(this.viewCell.onDidChangeState((e) => {
            this.cellParts.updateState(this.viewCell, e);
            if (e.outputIsHoveredChanged) {
                this.updateForOutputHover();
            }
            if (e.outputIsFocusedChanged) {
                this.updateForOutputFocus();
            }
            if (e.metadataChanged || e.internalMetadataChanged) {
                this.updateEditorOptions();
            }
            if (e.inputCollapsedChanged || e.outputCollapsedChanged) {
                this.viewCell.pauseLayout();
                const updated = this.updateForCollapseState();
                this.viewCell.resumeLayout();
                if (updated) {
                    this.relayoutCell();
                }
            }
            if (e.focusModeChanged) {
                this.updateEditorForFocusModeChange(true);
            }
        }));
        this.cellParts.scheduleRenderCell(this.viewCell);
        this._register(toDisposable(() => {
            this.cellParts.unrenderCell(this.viewCell);
        }));
        this.updateEditorOptions();
        this.updateEditorForFocusModeChange(false);
        this.updateForOutputHover();
        this.updateForOutputFocus();
        // Render Outputs
        this.viewCell.editorHeight = editorHeight;
        this._outputContainerRenderer.render();
        this._renderedOutputCollapseState = false; // the output is always rendered initially
        // Need to do this after the intial renderOutput
        this.initialViewUpdateExpanded();
        this._register(this.viewCell.onLayoutInfoRead(() => {
            this.cellParts.prepareLayout();
        }));
        const executionItemElement = DOM.append(this.templateData.cellInputCollapsedContainer, DOM.$('.collapsed-execution-icon'));
        this._register(toDisposable(() => {
            executionItemElement.remove();
        }));
        this._collapsedExecutionIcon = this._register(this.instantiationService.createInstance(CollapsedCodeCellExecutionIcon, this.notebookEditor, this.viewCell, executionItemElement));
        this.updateForCollapseState();
        this._register(Event.runAndSubscribe(viewCell.onDidChangeOutputs, this.updateForOutputs.bind(this)));
        this._register(Event.runAndSubscribe(viewCell.onDidChangeLayout, this.updateForLayout.bind(this)));
        this._cellEditorOptions.setLineNumbers(this.viewCell.lineNumbers);
        templateData.editor.updateOptions(this._cellEditorOptions.getUpdatedValue(this.viewCell.internalMetadata, this.viewCell.uri));
    }
    updateCodeCellOptions(templateData) {
        templateData.editor.updateOptions(this._cellEditorOptions.getUpdatedValue(this.viewCell.internalMetadata, this.viewCell.uri));
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
                    indentSize: this._cellEditorOptions.indentSize,
                    tabSize: this._cellEditorOptions.tabSize,
                    insertSpaces: this._cellEditorOptions.insertSpaces,
                });
            }
        });
    }
    updateForLayout() {
        this._pendingLayout?.dispose();
        this._pendingLayout = DOM.modify(DOM.getWindow(this.notebookEditor.getDomNode()), () => {
            this.cellParts.updateInternalLayoutNow(this.viewCell);
        });
    }
    updateForOutputHover() {
        this.templateData.container.classList.toggle('cell-output-hover', this.viewCell.outputIsHovered);
    }
    updateForOutputFocus() {
        this.templateData.container.classList.toggle('cell-output-focus', this.viewCell.outputIsFocused);
    }
    calculateInitEditorHeight() {
        const lineNum = this.viewCell.lineCount;
        const lineHeight = this.viewCell.layoutInfo.fontInfo?.lineHeight || 17;
        const editorPadding = this.notebookEditor.notebookOptions.computeEditorPadding(this.viewCell.internalMetadata, this.viewCell.uri);
        const editorHeight = this.viewCell.layoutInfo.editorHeight === 0
            ? lineNum * lineHeight + editorPadding.top + editorPadding.bottom
            : this.viewCell.layoutInfo.editorHeight;
        return editorHeight;
    }
    initializeEditor(initEditorHeight) {
        const width = this.viewCell.layoutInfo.editorWidth;
        this.layoutEditor({
            width: width,
            height: initEditorHeight,
        });
        const cts = new CancellationTokenSource();
        this._register({
            dispose() {
                cts.dispose(true);
            },
        });
        raceCancellation(this.viewCell.resolveTextModel(), cts.token).then((model) => {
            if (this._isDisposed || model?.isDisposed()) {
                return;
            }
            if (model && this.templateData.editor) {
                this._reigsterModelListeners(model);
                // set model can trigger view update, which can lead to dispose of this cell
                this.templateData.editor.setModel(model);
                if (this._isDisposed) {
                    return;
                }
                model.updateOptions({
                    indentSize: this._cellEditorOptions.indentSize,
                    tabSize: this._cellEditorOptions.tabSize,
                    insertSpaces: this._cellEditorOptions.insertSpaces,
                });
                this.viewCell.attachTextEditor(this.templateData.editor, this.viewCell.layoutInfo.estimatedHasHorizontalScrolling);
                const focusEditorIfNeeded = () => {
                    if (this.notebookEditor.getActiveCell() === this.viewCell &&
                        this.viewCell.focusMode === CellFocusMode.Editor &&
                        (this.notebookEditor.hasEditorFocus() ||
                            this.notebookEditor.getDomNode().ownerDocument.activeElement ===
                                this.notebookEditor.getDomNode().ownerDocument.body)) {
                        // Don't steal focus from other workbench parts, but if body has focus, we can take it
                        this.templateData.editor?.focus();
                    }
                };
                focusEditorIfNeeded();
                const realContentHeight = this.templateData.editor?.getContentHeight();
                if (realContentHeight !== undefined && realContentHeight !== initEditorHeight) {
                    this.onCellEditorHeightChange(realContentHeight);
                }
                if (this._isDisposed) {
                    return;
                }
                focusEditorIfNeeded();
            }
            this._register(this._cellEditorOptions.onDidChange(() => this.updateCodeCellOptions(this.templateData)));
        });
    }
    updateForOutputs() {
        DOM.setVisibility(this.viewCell.outputsViewModels.length > 0, this.templateData.focusSinkElement);
    }
    updateEditorOptions() {
        const editor = this.templateData.editor;
        if (!editor) {
            return;
        }
        const isReadonly = this.notebookEditor.isReadOnly;
        const padding = this.notebookEditor.notebookOptions.computeEditorPadding(this.viewCell.internalMetadata, this.viewCell.uri);
        const options = editor.getOptions();
        if (options.get(96 /* EditorOption.readOnly */) !== isReadonly ||
            options.get(88 /* EditorOption.padding */) !== padding) {
            editor.updateOptions({
                readOnly: this.notebookEditor.isReadOnly,
                padding: this.notebookEditor.notebookOptions.computeEditorPadding(this.viewCell.internalMetadata, this.viewCell.uri),
            });
        }
    }
    registerNotebookEditorListeners() {
        this._register(this.notebookEditor.onDidScroll(() => {
            this.adjustEditorPosition();
        }));
        this._register(this.notebookEditor.onDidChangeLayout(() => {
            this.adjustEditorPosition();
            this.onCellWidthChange();
        }));
    }
    adjustEditorPosition() {
        const extraOffset = -6 /** distance to the top of the cell editor, which is 6px under the focus indicator */ -
            1; /** border */
        const min = 0;
        const scrollTop = this.notebookEditor.scrollTop;
        const elementTop = this.notebookEditor.getAbsoluteTopOfElement(this.viewCell);
        const diff = scrollTop - elementTop + extraOffset;
        const notebookEditorLayout = this.notebookEditor.getLayoutInfo();
        // we should stop adjusting the top when users are viewing the bottom of the cell editor
        const editorMaxHeight = notebookEditorLayout.height - notebookEditorLayout.stickyHeight - 26; /** notebook toolbar */
        const maxTop = this.viewCell.layoutInfo.editorHeight -
            // + this.viewCell.layoutInfo.statusBarHeight
            editorMaxHeight;
        const top = maxTop > 20 ? clamp(min, diff, maxTop) : min;
        this.templateData.editorPart.style.top = `${top}px`;
        // scroll the editor with top
        this.templateData.editor?.setScrollTop(top);
    }
    registerViewCellLayoutChange() {
        this._register(this.viewCell.onDidChangeLayout((e) => {
            if (e.outerWidth !== undefined) {
                const layoutInfo = this.templateData.editor.getLayoutInfo();
                if (layoutInfo.width !== this.viewCell.layoutInfo.editorWidth) {
                    this.onCellWidthChange();
                    this.adjustEditorPosition();
                }
            }
        }));
    }
    registerCellEditorEventListeners() {
        this._register(this.templateData.editor.onDidContentSizeChange((e) => {
            if (e.contentHeightChanged) {
                if (this.viewCell.layoutInfo.editorHeight !== e.contentHeight) {
                    this.onCellEditorHeightChange(e.contentHeight);
                    this.adjustEditorPosition();
                }
            }
        }));
        this._register(this.templateData.editor.onDidChangeCursorSelection((e) => {
            if (e.source === 'restoreState' || e.oldModelVersionId === 0) {
                // do not reveal the cell into view if this selection change was caused by restoring editors...
                return;
            }
            const selections = this.templateData.editor.getSelections();
            if (selections?.length) {
                const contentHeight = this.templateData.editor.getContentHeight();
                const layoutContentHeight = this.viewCell.layoutInfo.editorHeight;
                if (contentHeight !== layoutContentHeight) {
                    this.onCellEditorHeightChange(contentHeight);
                    if (this._isDisposed) {
                        return;
                    }
                }
                const lastSelection = selections[selections.length - 1];
                this.notebookEditor.revealRangeInViewAsync(this.viewCell, lastSelection);
            }
        }));
        this._register(this.templateData.editor.onDidBlurEditorWidget(() => {
            CodeActionController.get(this.templateData.editor)?.hideCodeActions();
            CodeActionController.get(this.templateData.editor)?.hideLightBulbWidget();
        }));
    }
    _reigsterModelListeners(model) {
        this._register(model.onDidChangeTokens(() => {
            if (this.viewCell.isInputCollapsed && this._inputCollapseElement) {
                // flush the collapsed input with the latest tokens
                const content = this._getRichTextFromLineTokens(model);
                DOM.safeInnerHtml(this._inputCollapseElement, content);
                this._attachInputExpandButton(this._inputCollapseElement);
            }
        }));
    }
    registerMouseListener() {
        this._register(this.templateData.editor.onMouseDown((e) => {
            // prevent default on right mouse click, otherwise it will trigger unexpected focus changes
            // the catch is, it means we don't allow customization of right button mouse down handlers other than the built in ones.
            if (e.event.rightButton) {
                e.event.preventDefault();
            }
        }));
    }
    shouldPreserveEditor() {
        // The DOM focus needs to be adjusted:
        // when a cell editor should be focused
        // the document active element is inside the notebook editor or the document body (cell editor being disposed previously)
        return (this.notebookEditor.getActiveCell() === this.viewCell &&
            this.viewCell.focusMode === CellFocusMode.Editor &&
            (this.notebookEditor.hasEditorFocus() ||
                this.notebookEditor.getDomNode().ownerDocument.activeElement ===
                    this.notebookEditor.getDomNode().ownerDocument.body));
    }
    updateEditorForFocusModeChange(sync) {
        if (this.shouldPreserveEditor()) {
            if (sync) {
                this.templateData.editor?.focus();
            }
            else {
                this._register(DOM.runAtThisOrScheduleAtNextAnimationFrame(DOM.getWindow(this.templateData.container), () => {
                    this.templateData.editor?.focus();
                }));
            }
        }
        this.templateData.container.classList.toggle('cell-editor-focus', this.viewCell.focusMode === CellFocusMode.Editor);
        this.templateData.container.classList.toggle('cell-output-focus', this.viewCell.focusMode === CellFocusMode.Output);
    }
    updateForCollapseState() {
        if (this.viewCell.isOutputCollapsed === this._renderedOutputCollapseState &&
            this.viewCell.isInputCollapsed === this._renderedInputCollapseState) {
            return false;
        }
        this.viewCell.layoutChange({ editorHeight: true });
        if (this.viewCell.isInputCollapsed) {
            this._collapseInput();
        }
        else {
            this._showInput();
        }
        if (this.viewCell.isOutputCollapsed) {
            this._collapseOutput();
        }
        else {
            this._showOutput(false);
        }
        this.relayoutCell();
        this._renderedOutputCollapseState = this.viewCell.isOutputCollapsed;
        this._renderedInputCollapseState = this.viewCell.isInputCollapsed;
        return true;
    }
    _collapseInput() {
        // hide the editor and execution label, keep the run button
        DOM.hide(this.templateData.editorPart);
        this.templateData.container.classList.toggle('input-collapsed', true);
        // remove input preview
        this._removeInputCollapsePreview();
        this._collapsedExecutionIcon.setVisibility(true);
        // update preview
        const richEditorText = this.templateData.editor.hasModel()
            ? this._getRichTextFromLineTokens(this.templateData.editor.getModel())
            : this._getRichText(this.viewCell.textBuffer, this.viewCell.language);
        const element = DOM.$('div.cell-collapse-preview');
        DOM.safeInnerHtml(element, richEditorText);
        this._inputCollapseElement = element;
        this.templateData.cellInputCollapsedContainer.appendChild(element);
        this._attachInputExpandButton(element);
        DOM.show(this.templateData.cellInputCollapsedContainer);
    }
    _attachInputExpandButton(element) {
        const expandIcon = DOM.$('span.expandInputIcon');
        const keybinding = this.keybindingService.lookupKeybinding(EXPAND_CELL_INPUT_COMMAND_ID);
        if (keybinding) {
            element.title = localize('cellExpandInputButtonLabelWithDoubleClick', 'Double-click to expand cell input ({0})', keybinding.getLabel());
            expandIcon.title = localize('cellExpandInputButtonLabel', 'Expand Cell Input ({0})', keybinding.getLabel());
        }
        expandIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.more));
        element.appendChild(expandIcon);
    }
    _showInput() {
        this._collapsedExecutionIcon.setVisibility(false);
        DOM.show(this.templateData.editorPart);
        DOM.hide(this.templateData.cellInputCollapsedContainer);
    }
    _getRichText(buffer, language) {
        return tokenizeToStringSync(this.languageService, buffer.getLineContent(1), language);
    }
    _getRichTextFromLineTokens(model) {
        let result = `<div class="monaco-tokenized-source">`;
        const firstLineTokens = model.tokenization.getLineTokens(1);
        const viewLineTokens = firstLineTokens.inflate();
        const line = model.getLineContent(1);
        let startOffset = 0;
        for (let j = 0, lenJ = viewLineTokens.getCount(); j < lenJ; j++) {
            const type = viewLineTokens.getClassName(j);
            const endIndex = viewLineTokens.getEndOffset(j);
            result += `<span class="${type}">${strings.escape(line.substring(startOffset, endIndex))}</span>`;
            startOffset = endIndex;
        }
        result += `</div>`;
        return result;
    }
    _removeInputCollapsePreview() {
        const children = this.templateData.cellInputCollapsedContainer.children;
        const elements = [];
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList.contains('cell-collapse-preview')) {
                elements.push(children[i]);
            }
        }
        elements.forEach((element) => {
            element.remove();
        });
    }
    _updateOutputInnerContainer(hide) {
        const children = this.templateData.outputContainer.domNode.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i].classList.contains('output-inner-container')) {
                DOM.setVisibility(!hide, children[i]);
            }
        }
    }
    _collapseOutput() {
        this.templateData.container.classList.toggle('output-collapsed', true);
        DOM.show(this.templateData.cellOutputCollapsedContainer);
        this._updateOutputInnerContainer(true);
        this._outputContainerRenderer.viewUpdateHideOuputs();
    }
    _showOutput(initRendering) {
        this.templateData.container.classList.toggle('output-collapsed', false);
        DOM.hide(this.templateData.cellOutputCollapsedContainer);
        this._updateOutputInnerContainer(false);
        this._outputContainerRenderer.viewUpdateShowOutputs(initRendering);
    }
    initialViewUpdateExpanded() {
        this.templateData.container.classList.toggle('input-collapsed', false);
        DOM.show(this.templateData.editorPart);
        DOM.hide(this.templateData.cellInputCollapsedContainer);
        this.templateData.container.classList.toggle('output-collapsed', false);
        this._showOutput(true);
    }
    layoutEditor(dimension) {
        const editorLayout = this.notebookEditor.getLayoutInfo();
        const maxHeight = Math.min(editorLayout.height - editorLayout.stickyHeight - 26 /** notebook toolbar */, dimension.height);
        this.templateData.editor?.layout({
            width: dimension.width,
            height: maxHeight,
        }, true);
    }
    onCellWidthChange() {
        if (!this.templateData.editor.hasModel()) {
            return;
        }
        const realContentHeight = this.templateData.editor.getContentHeight();
        this.viewCell.editorHeight = realContentHeight;
        this.relayoutCell();
        this.layoutEditor({
            width: this.viewCell.layoutInfo.editorWidth,
            height: realContentHeight,
        });
    }
    onCellEditorHeightChange(newHeight) {
        const viewLayout = this.templateData.editor.getLayoutInfo();
        this.viewCell.editorHeight = newHeight;
        this.relayoutCell();
        this.layoutEditor({
            width: viewLayout.width,
            height: newHeight,
        });
    }
    relayoutCell() {
        this.notebookEditor.layoutNotebookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
    }
    dispose() {
        this._isDisposed = true;
        // move focus back to the cell list otherwise the focus goes to body
        if (this.shouldPreserveEditor()) {
            // now the focus is on the monaco editor for the cell but detached from the rows.
            this.editorPool.preserveFocusedEditor(this.viewCell);
        }
        this.viewCell.detachTextEditor();
        this._removeInputCollapsePreview();
        this._outputContainerRenderer.dispose();
        this._pendingLayout?.dispose();
        super.dispose();
    }
};
CodeCell = __decorate([
    __param(4, IInstantiationService),
    __param(5, IKeybindingService),
    __param(6, IOpenerService),
    __param(7, ILanguageService),
    __param(8, IConfigurationService),
    __param(9, INotebookExecutionStateService)
], CodeCell);
export { CodeCell };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NvZGVDZWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxLQUFLLE9BQU8sTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFdkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDbEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFr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