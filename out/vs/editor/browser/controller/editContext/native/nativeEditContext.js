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
import './nativeEditContext.css';
import { isFirefox } from '../../../../../base/browser/browser.js';
import { addDisposableListener, getActiveWindow, getWindow, getWindowId, } from '../../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ClipboardEventUtils, getDataToCopy, InMemoryClipboardMetadataManager, } from '../clipboardUtils.js';
import { AbstractEditContext } from '../editContext.js';
import { editContextAddDisposableListener, FocusTracker, } from './nativeEditContextUtils.js';
import { ScreenReaderSupport } from './screenReaderSupport.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { Position } from '../../../../common/core/position.js';
import { PositionOffsetTransformer } from '../../../../common/core/positionToOffset.js';
import { MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { EditContext } from './editContextFactory.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { NativeEditContextRegistry } from './nativeEditContextRegistry.js';
// Corresponds to classes in nativeEditContext.css
var CompositionClassName;
(function (CompositionClassName) {
    CompositionClassName["NONE"] = "edit-context-composition-none";
    CompositionClassName["SECONDARY"] = "edit-context-composition-secondary";
    CompositionClassName["PRIMARY"] = "edit-context-composition-primary";
})(CompositionClassName || (CompositionClassName = {}));
let NativeEditContext = class NativeEditContext extends AbstractEditContext {
    constructor(ownerID, context, overflowGuardContainer, viewController, _visibleRangeProvider, instantiationService, _accessibilityService) {
        super(context);
        this._visibleRangeProvider = _visibleRangeProvider;
        this._accessibilityService = _accessibilityService;
        this._editContextPrimarySelection = new Selection(1, 1, 1, 1);
        this._decorations = [];
        this._primarySelection = new Selection(1, 1, 1, 1);
        this._targetWindowId = -1;
        this._scrollTop = 0;
        this._scrollLeft = 0;
        this.domNode = new FastDomNode(document.createElement('div'));
        this.domNode.setClassName(`native-edit-context`);
        this._textArea = new FastDomNode(document.createElement('textarea'));
        this._textArea.setClassName('native-edit-context-textarea');
        this._textArea.setAttribute('tabindex', '-1');
        this.domNode.setAttribute('autocorrect', 'off');
        this.domNode.setAttribute('autocapitalize', 'off');
        this.domNode.setAttribute('autocomplete', 'off');
        this.domNode.setAttribute('spellcheck', 'false');
        this._updateDomAttributes();
        overflowGuardContainer.appendChild(this.domNode);
        overflowGuardContainer.appendChild(this._textArea);
        this._parent = overflowGuardContainer.domNode;
        this._selectionChangeListener = this._register(new MutableDisposable());
        this._focusTracker = this._register(new FocusTracker(this.domNode.domNode, (newFocusValue) => {
            if (newFocusValue) {
                this._selectionChangeListener.value = this._setSelectionChangeListener(viewController);
                this._screenReaderSupport.setIgnoreSelectionChangeTime('onFocus');
            }
            else {
                this._selectionChangeListener.value = undefined;
            }
            this._context.viewModel.setHasFocus(newFocusValue);
        }));
        const window = getWindow(this.domNode.domNode);
        this._editContext = EditContext.create(window);
        this.setEditContextOnDomNode();
        this._screenReaderSupport = instantiationService.createInstance(ScreenReaderSupport, this.domNode, context);
        this._register(addDisposableListener(this.domNode.domNode, 'copy', (e) => this._ensureClipboardGetsEditorSelection(e)));
        this._register(addDisposableListener(this.domNode.domNode, 'cut', (e) => {
            // Pretend here we touched the text area, as the `cut` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._screenReaderSupport.setIgnoreSelectionChangeTime('onCut');
            this._ensureClipboardGetsEditorSelection(e);
            viewController.cut();
        }));
        this._register(addDisposableListener(this.domNode.domNode, 'keyup', (e) => viewController.emitKeyUp(new StandardKeyboardEvent(e))));
        this._register(addDisposableListener(this.domNode.domNode, 'keydown', async (e) => {
            const standardKeyboardEvent = new StandardKeyboardEvent(e);
            // When the IME is visible, the keys, like arrow-left and arrow-right, should be used to navigate in the IME, and should not be propagated further
            if (standardKeyboardEvent.keyCode === 114 /* KeyCode.KEY_IN_COMPOSITION */) {
                standardKeyboardEvent.stopPropagation();
            }
            viewController.emitKeyDown(standardKeyboardEvent);
        }));
        this._register(addDisposableListener(this.domNode.domNode, 'beforeinput', async (e) => {
            if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
                this._onType(viewController, {
                    text: '\n',
                    replacePrevCharCnt: 0,
                    replaceNextCharCnt: 0,
                    positionDelta: 0,
                });
            }
        }));
        // Edit context events
        this._register(editContextAddDisposableListener(this._editContext, 'textformatupdate', (e) => this._handleTextFormatUpdate(e)));
        this._register(editContextAddDisposableListener(this._editContext, 'characterboundsupdate', (e) => this._updateCharacterBounds(e)));
        this._register(editContextAddDisposableListener(this._editContext, 'textupdate', (e) => {
            this._emitTypeEvent(viewController, e);
        }));
        this._register(editContextAddDisposableListener(this._editContext, 'compositionstart', (e) => {
            // Utlimately fires onDidCompositionStart() on the editor to notify for example suggest model of composition state
            // Updates the composition state of the cursor controller which determines behavior of typing with interceptors
            viewController.compositionStart();
            // Emits ViewCompositionStartEvent which can be depended on by ViewEventHandlers
            this._context.viewModel.onCompositionStart();
        }));
        this._register(editContextAddDisposableListener(this._editContext, 'compositionend', (e) => {
            // Utlimately fires compositionEnd() on the editor to notify for example suggest model of composition state
            // Updates the composition state of the cursor controller which determines behavior of typing with interceptors
            viewController.compositionEnd();
            // Emits ViewCompositionEndEvent which can be depended on by ViewEventHandlers
            this._context.viewModel.onCompositionEnd();
        }));
        this._register(addDisposableListener(this._textArea.domNode, 'paste', (e) => {
            // Pretend here we touched the text area, as the `paste` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._screenReaderSupport.setIgnoreSelectionChangeTime('onPaste');
            e.preventDefault();
            if (!e.clipboardData) {
                return;
            }
            let [text, metadata] = ClipboardEventUtils.getTextData(e.clipboardData);
            if (!text) {
                return;
            }
            metadata = metadata || InMemoryClipboardMetadataManager.INSTANCE.get(text);
            let pasteOnNewLine = false;
            let multicursorText = null;
            let mode = null;
            if (metadata) {
                const options = this._context.configuration.options;
                const emptySelectionClipboard = options.get(38 /* EditorOption.emptySelectionClipboard */);
                pasteOnNewLine = emptySelectionClipboard && !!metadata.isFromEmptySelection;
                multicursorText =
                    typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null;
                mode = metadata.mode;
            }
            viewController.paste(text, pasteOnNewLine, multicursorText, mode);
        }));
        this._register(NativeEditContextRegistry.register(ownerID, this));
    }
    // --- Public methods ---
    dispose() {
        // Force blue the dom node so can write in pane with no native edit context after disposal
        this.domNode.domNode.blur();
        this.domNode.domNode.remove();
        this._textArea.domNode.remove();
        super.dispose();
    }
    setAriaOptions(options) {
        this._screenReaderSupport.setAriaOptions(options);
    }
    /* Last rendered data needed for correct hit-testing and determining the mouse position.
     * Without this, the selection will blink as incorrect mouse position is calculated */
    getLastRenderData() {
        return this._primarySelection.getPosition();
    }
    prepareRender(ctx) {
        this._screenReaderSupport.prepareRender(ctx);
        this._updateEditContext();
        this._updateSelectionAndControlBounds(ctx);
    }
    render(ctx) {
        this._screenReaderSupport.render(ctx);
    }
    onCursorStateChanged(e) {
        this._primarySelection = e.modelSelections[0] ?? new Selection(1, 1, 1, 1);
        this._screenReaderSupport.onCursorStateChanged(e);
        this._updateEditContext();
        return true;
    }
    onConfigurationChanged(e) {
        this._screenReaderSupport.onConfigurationChanged(e);
        this._updateDomAttributes();
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        this._scrollLeft = e.scrollLeft;
        this._scrollTop = e.scrollTop;
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    executePaste() {
        this._onWillPaste();
        try {
            // pause focus tracking because we don't want to react to focus/blur
            // events while pasting since we move the focus to the textarea
            this._focusTracker.pause();
            // Since we can not call execCommand('paste') on a dom node with edit context set
            // we added a hidden text area that receives the paste execution
            this._textArea.focus();
            const result = this._textArea.domNode.ownerDocument.execCommand('paste');
            this._textArea.domNode.textContent = '';
            this.domNode.focus();
            return result;
        }
        finally {
            this._focusTracker.resume(); // resume focus tracking
        }
    }
    _onWillPaste() {
        this._screenReaderSupport.setIgnoreSelectionChangeTime('onWillPaste');
    }
    writeScreenReaderContent() {
        this._screenReaderSupport.writeScreenReaderContent();
    }
    isFocused() {
        return this._focusTracker.isFocused;
    }
    focus() {
        this._focusTracker.focus();
        // If the editor is off DOM, focus cannot be really set, so let's double check that we have managed to set the focus
        this.refreshFocusState();
    }
    refreshFocusState() {
        this._focusTracker.refreshFocusState();
    }
    // TODO: added as a workaround fix for https://github.com/microsoft/vscode/issues/229825
    // When this issue will be fixed the following should be removed.
    setEditContextOnDomNode() {
        const targetWindow = getWindow(this.domNode.domNode);
        const targetWindowId = getWindowId(targetWindow);
        if (this._targetWindowId !== targetWindowId) {
            this.domNode.domNode.editContext = this._editContext;
            this._targetWindowId = targetWindowId;
        }
    }
    // --- Private methods ---
    _updateDomAttributes() {
        const options = this._context.configuration.options;
        this.domNode.domNode.setAttribute('tabindex', String(options.get(129 /* EditorOption.tabIndex */)));
    }
    _updateEditContext() {
        const editContextState = this._getNewEditContextState();
        if (!editContextState) {
            return;
        }
        this._editContext.updateText(0, Number.MAX_SAFE_INTEGER, editContextState.text ?? ' ');
        this._editContext.updateSelection(editContextState.selectionStartOffset, editContextState.selectionEndOffset);
        this._editContextPrimarySelection = editContextState.editContextPrimarySelection;
    }
    _emitTypeEvent(viewController, e) {
        if (!this._editContext) {
            return;
        }
        if (!this._editContextPrimarySelection.equalsSelection(this._primarySelection)) {
            return;
        }
        const model = this._context.viewModel.model;
        const startPositionOfEditContext = this._editContextStartPosition();
        const offsetOfStartOfText = model.getOffsetAt(startPositionOfEditContext);
        const offsetOfSelectionEnd = model.getOffsetAt(this._primarySelection.getEndPosition());
        const offsetOfSelectionStart = model.getOffsetAt(this._primarySelection.getStartPosition());
        const selectionEndOffset = offsetOfSelectionEnd - offsetOfStartOfText;
        const selectionStartOffset = offsetOfSelectionStart - offsetOfStartOfText;
        let replaceNextCharCnt = 0;
        let replacePrevCharCnt = 0;
        if (e.updateRangeEnd > selectionEndOffset) {
            replaceNextCharCnt = e.updateRangeEnd - selectionEndOffset;
        }
        if (e.updateRangeStart < selectionStartOffset) {
            replacePrevCharCnt = selectionStartOffset - e.updateRangeStart;
        }
        let text = '';
        if (selectionStartOffset < e.updateRangeStart) {
            text += this._editContext.text.substring(selectionStartOffset, e.updateRangeStart);
        }
        text += e.text;
        if (selectionEndOffset > e.updateRangeEnd) {
            text += this._editContext.text.substring(e.updateRangeEnd, selectionEndOffset);
        }
        let positionDelta = 0;
        if (e.selectionStart === e.selectionEnd && selectionStartOffset === selectionEndOffset) {
            positionDelta = e.selectionStart - (e.updateRangeStart + e.text.length);
        }
        const typeInput = {
            text,
            replacePrevCharCnt,
            replaceNextCharCnt,
            positionDelta,
        };
        this._onType(viewController, typeInput);
        // It could be that the typed letter does not produce a change in the editor text,
        // for example if an extension registers a custom typing command, and the typing operation does something else like scrolling
        // Need to update the edit context to reflect this
        this._updateEditContext();
    }
    _onType(viewController, typeInput) {
        if (typeInput.replacePrevCharCnt || typeInput.replaceNextCharCnt || typeInput.positionDelta) {
            viewController.compositionType(typeInput.text, typeInput.replacePrevCharCnt, typeInput.replaceNextCharCnt, typeInput.positionDelta);
        }
        else {
            viewController.type(typeInput.text);
        }
    }
    _getNewEditContextState() {
        const editContextPrimarySelection = this._primarySelection;
        const model = this._context.viewModel.model;
        if (!model.isValidRange(editContextPrimarySelection)) {
            return;
        }
        const primarySelectionStartLine = editContextPrimarySelection.startLineNumber;
        const primarySelectionEndLine = editContextPrimarySelection.endLineNumber;
        const endColumnOfEndLineNumber = model.getLineMaxColumn(primarySelectionEndLine);
        const rangeOfText = new Range(primarySelectionStartLine, 1, primarySelectionEndLine, endColumnOfEndLineNumber);
        const text = model.getValueInRange(rangeOfText, 0 /* EndOfLinePreference.TextDefined */);
        const selectionStartOffset = editContextPrimarySelection.startColumn - 1;
        const selectionEndOffset = text.length + editContextPrimarySelection.endColumn - endColumnOfEndLineNumber;
        return {
            text,
            selectionStartOffset,
            selectionEndOffset,
            editContextPrimarySelection,
        };
    }
    _editContextStartPosition() {
        return new Position(this._editContextPrimarySelection.startLineNumber, 1);
    }
    _handleTextFormatUpdate(e) {
        if (!this._editContext) {
            return;
        }
        const formats = e.getTextFormats();
        const editContextStartPosition = this._editContextStartPosition();
        const decorations = [];
        formats.forEach((f) => {
            const textModel = this._context.viewModel.model;
            const offsetOfEditContextText = textModel.getOffsetAt(editContextStartPosition);
            const startPositionOfDecoration = textModel.getPositionAt(offsetOfEditContextText + f.rangeStart);
            const endPositionOfDecoration = textModel.getPositionAt(offsetOfEditContextText + f.rangeEnd);
            const decorationRange = Range.fromPositions(startPositionOfDecoration, endPositionOfDecoration);
            const thickness = f.underlineThickness.toLowerCase();
            let decorationClassName = CompositionClassName.NONE;
            switch (thickness) {
                case 'thin':
                    decorationClassName = CompositionClassName.SECONDARY;
                    break;
                case 'thick':
                    decorationClassName = CompositionClassName.PRIMARY;
                    break;
            }
            decorations.push({
                range: decorationRange,
                options: {
                    description: 'textFormatDecoration',
                    inlineClassName: decorationClassName,
                },
            });
        });
        this._decorations = this._context.viewModel.model.deltaDecorations(this._decorations, decorations);
    }
    _updateSelectionAndControlBounds(ctx) {
        if (!this._parent) {
            return;
        }
        const options = this._context.configuration.options;
        const lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const contentLeft = options.get(151 /* EditorOption.layoutInfo */).contentLeft;
        const parentBounds = this._parent.getBoundingClientRect();
        const modelStartPosition = this._primarySelection.getStartPosition();
        const viewStartPosition = this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelStartPosition);
        const verticalOffsetStart = this._context.viewLayout.getVerticalOffsetForLineNumber(viewStartPosition.lineNumber);
        const top = parentBounds.top + verticalOffsetStart - this._scrollTop;
        const height = (this._primarySelection.endLineNumber - this._primarySelection.startLineNumber + 1) *
            lineHeight;
        let left = parentBounds.left + contentLeft - this._scrollLeft;
        let width;
        if (this._primarySelection.isEmpty()) {
            const linesVisibleRanges = ctx.visibleRangeForPosition(viewStartPosition);
            if (linesVisibleRanges) {
                left += linesVisibleRanges.left;
            }
            width = 0;
        }
        else {
            width = parentBounds.width - contentLeft;
        }
        const selectionBounds = new DOMRect(left, top, width, height);
        this._editContext.updateSelectionBounds(selectionBounds);
        this._editContext.updateControlBounds(selectionBounds);
    }
    _updateCharacterBounds(e) {
        if (!this._parent) {
            return;
        }
        const options = this._context.configuration.options;
        const typicalHalfWidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        const lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const contentLeft = options.get(151 /* EditorOption.layoutInfo */).contentLeft;
        const parentBounds = this._parent.getBoundingClientRect();
        const characterBounds = [];
        const offsetTransformer = new PositionOffsetTransformer(this._editContext.text);
        for (let offset = e.rangeStart; offset < e.rangeEnd; offset++) {
            const editContextStartPosition = offsetTransformer.getPosition(offset);
            const textStartLineOffsetWithinEditor = this._editContextPrimarySelection.startLineNumber - 1;
            const characterStartPosition = new Position(textStartLineOffsetWithinEditor + editContextStartPosition.lineNumber, editContextStartPosition.column);
            const characterEndPosition = characterStartPosition.delta(0, 1);
            const characterModelRange = Range.fromPositions(characterStartPosition, characterEndPosition);
            const characterViewRange = this._context.viewModel.coordinatesConverter.convertModelRangeToViewRange(characterModelRange);
            const characterLinesVisibleRanges = this._visibleRangeProvider.linesVisibleRangesForRange(characterViewRange, true) ?? [];
            const characterVerticalOffset = this._context.viewLayout.getVerticalOffsetForLineNumber(characterViewRange.startLineNumber);
            const top = parentBounds.top + characterVerticalOffset - this._scrollTop;
            let left = 0;
            let width = typicalHalfWidthCharacterWidth;
            if (characterLinesVisibleRanges.length > 0) {
                for (const visibleRange of characterLinesVisibleRanges[0].ranges) {
                    left = visibleRange.left;
                    width = visibleRange.width;
                    break;
                }
            }
            characterBounds.push(new DOMRect(parentBounds.left + contentLeft + left - this._scrollLeft, top, width, lineHeight));
        }
        this._editContext.updateCharacterBounds(e.rangeStart, characterBounds);
    }
    _ensureClipboardGetsEditorSelection(e) {
        const options = this._context.configuration.options;
        const emptySelectionClipboard = options.get(38 /* EditorOption.emptySelectionClipboard */);
        const copyWithSyntaxHighlighting = options.get(25 /* EditorOption.copyWithSyntaxHighlighting */);
        const selections = this._context.viewModel
            .getCursorStates()
            .map((cursorState) => cursorState.modelState.selection);
        const dataToCopy = getDataToCopy(this._context.viewModel, selections, emptySelectionClipboard, copyWithSyntaxHighlighting);
        const storedMetadata = {
            version: 1,
            isFromEmptySelection: dataToCopy.isFromEmptySelection,
            multicursorText: dataToCopy.multicursorText,
            mode: dataToCopy.mode,
        };
        InMemoryClipboardMetadataManager.INSTANCE.set(
        // When writing "LINE\r\n" to the clipboard and then pasting,
        // Firefox pastes "LINE\n", so let's work around this quirk
        isFirefox ? dataToCopy.text.replace(/\r\n/g, '\n') : dataToCopy.text, storedMetadata);
        e.preventDefault();
        if (e.clipboardData) {
            ClipboardEventUtils.setTextData(e.clipboardData, dataToCopy.text, dataToCopy.html, storedMetadata);
        }
    }
    _setSelectionChangeListener(viewController) {
        // See https://github.com/microsoft/vscode/issues/27216 and https://github.com/microsoft/vscode/issues/98256
        // When using a Braille display or NVDA for example, it is possible for users to reposition the
        // system caret. This is reflected in Chrome as a `selectionchange` event and needs to be reflected within the editor.
        // `selectionchange` events often come multiple times for a single logical change
        // so throttle multiple `selectionchange` events that burst in a short period of time.
        let previousSelectionChangeEventTime = 0;
        return addDisposableListener(this.domNode.domNode.ownerDocument, 'selectionchange', () => {
            const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
            if (!this.isFocused() || !isScreenReaderOptimized) {
                return;
            }
            const screenReaderContentState = this._screenReaderSupport.screenReaderContentState;
            if (!screenReaderContentState) {
                return;
            }
            const now = Date.now();
            const delta1 = now - previousSelectionChangeEventTime;
            previousSelectionChangeEventTime = now;
            if (delta1 < 5) {
                // received another `selectionchange` event within 5ms of the previous `selectionchange` event
                // => ignore it
                return;
            }
            const delta2 = now - this._screenReaderSupport.getIgnoreSelectionChangeTime();
            this._screenReaderSupport.resetSelectionChangeTime();
            if (delta2 < 100) {
                // received a `selectionchange` event within 100ms since we touched the textarea
                // => ignore it, since we caused it
                return;
            }
            const activeDocument = getActiveWindow().document;
            const activeDocumentSelection = activeDocument.getSelection();
            if (!activeDocumentSelection) {
                return;
            }
            const rangeCount = activeDocumentSelection.rangeCount;
            if (rangeCount === 0) {
                return;
            }
            const range = activeDocumentSelection.getRangeAt(0);
            const viewModel = this._context.viewModel;
            const model = viewModel.model;
            const coordinatesConverter = viewModel.coordinatesConverter;
            const modelScreenReaderContentStartPositionWithinEditor = coordinatesConverter.convertViewPositionToModelPosition(screenReaderContentState.startPositionWithinEditor);
            const offsetOfStartOfScreenReaderContent = model.getOffsetAt(modelScreenReaderContentStartPositionWithinEditor);
            let offsetOfSelectionStart = range.startOffset + offsetOfStartOfScreenReaderContent;
            let offsetOfSelectionEnd = range.endOffset + offsetOfStartOfScreenReaderContent;
            const modelUsesCRLF = model.getEndOfLineSequence() === 1 /* EndOfLineSequence.CRLF */;
            if (modelUsesCRLF) {
                const screenReaderContentText = screenReaderContentState.value;
                const offsetTransformer = new PositionOffsetTransformer(screenReaderContentText);
                const positionOfStartWithinText = offsetTransformer.getPosition(range.startOffset);
                const positionOfEndWithinText = offsetTransformer.getPosition(range.endOffset);
                offsetOfSelectionStart += positionOfStartWithinText.lineNumber - 1;
                offsetOfSelectionEnd += positionOfEndWithinText.lineNumber - 1;
            }
            const positionOfSelectionStart = model.getPositionAt(offsetOfSelectionStart);
            const positionOfSelectionEnd = model.getPositionAt(offsetOfSelectionEnd);
            const newSelection = Selection.fromPositions(positionOfSelectionStart, positionOfSelectionEnd);
            viewController.setSelection(newSelection);
        });
    }
};
NativeEditContext = __decorate([
    __param(5, IInstantiationService),
    __param(6, IAccessibilityService)
], NativeEditContext);
export { NativeEditContext };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L25hdGl2ZS9uYXRpdmVFZGl0Q29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGVBQWUsRUFDZixTQUFTLEVBQ1QsV0FBVyxHQUNYLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXBGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBcUJyRyxPQUFPLEVBQ04sbUJBQW1CLEVBRW5CLGFBQWEsRUFDYixnQ0FBZ0MsR0FDaEMsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLFlBQVksR0FFWixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FB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