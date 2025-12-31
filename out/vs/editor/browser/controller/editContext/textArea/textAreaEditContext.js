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
import './textAreaEditContext.css';
import * as nls from '../../../../../nls.js';
import * as browser from '../../../../../base/browser/browser.js';
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import * as platform from '../../../../../base/common/platform.js';
import * as strings from '../../../../../base/common/strings.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import { PartFingerprints } from '../../../view/viewPart.js';
import { LineNumbersOverlay } from '../../../viewParts/lineNumbers/lineNumbers.js';
import { Margin } from '../../../viewParts/margin/margin.js';
import { EditorOptions, } from '../../../../common/config/editorOptions.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { TokenizationRegistry } from '../../../../common/languages.js';
import { Color } from '../../../../../base/common/color.js';
import { IME } from '../../../../../base/common/ime.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { AbstractEditContext } from '../editContext.js';
import { TextAreaInput, TextAreaWrapper, } from './textAreaEditContextInput.js';
import { ariaLabelForScreenReaderContent, newlinecount, PagedScreenReaderStrategy, } from '../screenReaderUtils.js';
import { getDataToCopy } from '../clipboardUtils.js';
import { _debugComposition, TextAreaState } from './textAreaEditContextState.js';
import { getMapForWordSeparators, } from '../../../../common/core/wordCharacterClassifier.js';
class VisibleTextAreaData {
    constructor(_context, modelLineNumber, distanceToModelLineStart, widthOfHiddenLineTextBefore, distanceToModelLineEnd) {
        this._context = _context;
        this.modelLineNumber = modelLineNumber;
        this.distanceToModelLineStart = distanceToModelLineStart;
        this.widthOfHiddenLineTextBefore = widthOfHiddenLineTextBefore;
        this.distanceToModelLineEnd = distanceToModelLineEnd;
        this._visibleTextAreaBrand = undefined;
        this.startPosition = null;
        this.endPosition = null;
        this.visibleTextareaStart = null;
        this.visibleTextareaEnd = null;
        /**
         * When doing composition, the currently composed text might be split up into
         * multiple tokens, then merged again into a single token, etc. Here we attempt
         * to keep the presentation of the <textarea> stable by using the previous used
         * style if multiple tokens come into play. This avoids flickering.
         */
        this._previousPresentation = null;
    }
    prepareRender(visibleRangeProvider) {
        const startModelPosition = new Position(this.modelLineNumber, this.distanceToModelLineStart + 1);
        const endModelPosition = new Position(this.modelLineNumber, this._context.viewModel.model.getLineMaxColumn(this.modelLineNumber) -
            this.distanceToModelLineEnd);
        this.startPosition =
            this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(startModelPosition);
        this.endPosition =
            this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(endModelPosition);
        if (this.startPosition.lineNumber === this.endPosition.lineNumber) {
            this.visibleTextareaStart = visibleRangeProvider.visibleRangeForPosition(this.startPosition);
            this.visibleTextareaEnd = visibleRangeProvider.visibleRangeForPosition(this.endPosition);
        }
        else {
            // TODO: what if the view positions are not on the same line?
            this.visibleTextareaStart = null;
            this.visibleTextareaEnd = null;
        }
    }
    definePresentation(tokenPresentation) {
        if (!this._previousPresentation) {
            // To avoid flickering, once set, always reuse a presentation throughout the entire IME session
            if (tokenPresentation) {
                this._previousPresentation = tokenPresentation;
            }
            else {
                this._previousPresentation = {
                    foreground: 1 /* ColorId.DefaultForeground */,
                    italic: false,
                    bold: false,
                    underline: false,
                    strikethrough: false,
                };
            }
        }
        return this._previousPresentation;
    }
}
const canUseZeroSizeTextarea = browser.isFirefox;
let TextAreaEditContext = class TextAreaEditContext extends AbstractEditContext {
    constructor(context, overflowGuardContainer, viewController, visibleRangeProvider, _keybindingService, _instantiationService) {
        super(context);
        this._keybindingService = _keybindingService;
        this._instantiationService = _instantiationService;
        this._primaryCursorPosition = new Position(1, 1);
        this._primaryCursorVisibleRange = null;
        this._viewController = viewController;
        this._visibleRangeProvider = visibleRangeProvider;
        this._scrollLeft = 0;
        this._scrollTop = 0;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._setAccessibilityOptions(options);
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        this._contentHeight = layoutInfo.height;
        this._fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._emptySelectionClipboard = options.get(38 /* EditorOption.emptySelectionClipboard */);
        this._copyWithSyntaxHighlighting = options.get(25 /* EditorOption.copyWithSyntaxHighlighting */);
        this._visibleTextArea = null;
        this._selections = [new Selection(1, 1, 1, 1)];
        this._modelSelections = [new Selection(1, 1, 1, 1)];
        this._lastRenderPosition = null;
        // Text Area (The focus will always be in the textarea when the cursor is blinking)
        this.textArea = createFastDomNode(document.createElement('textarea'));
        PartFingerprints.write(this.textArea, 7 /* PartFingerprint.TextArea */);
        this.textArea.setClassName(`inputarea ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
        this.textArea.setAttribute('wrap', this._textAreaWrapping && !this._visibleTextArea ? 'on' : 'off');
        const { tabSize } = this._context.viewModel.model.getOptions();
        this.textArea.domNode.style.tabSize = `${tabSize * this._fontInfo.spaceWidth}px`;
        this.textArea.setAttribute('autocorrect', 'off');
        this.textArea.setAttribute('autocapitalize', 'off');
        this.textArea.setAttribute('autocomplete', 'off');
        this.textArea.setAttribute('spellcheck', 'false');
        this.textArea.setAttribute('aria-label', ariaLabelForScreenReaderContent(options, this._keybindingService));
        this.textArea.setAttribute('aria-required', options.get(5 /* EditorOption.ariaRequired */) ? 'true' : 'false');
        this.textArea.setAttribute('tabindex', String(options.get(129 /* EditorOption.tabIndex */)));
        this.textArea.setAttribute('role', 'textbox');
        this.textArea.setAttribute('aria-roledescription', nls.localize('editor', 'editor'));
        this.textArea.setAttribute('aria-multiline', 'true');
        this.textArea.setAttribute('aria-autocomplete', options.get(96 /* EditorOption.readOnly */) ? 'none' : 'both');
        this._ensureReadOnlyAttribute();
        this.textAreaCover = createFastDomNode(document.createElement('div'));
        this.textAreaCover.setPosition('absolute');
        overflowGuardContainer.appendChild(this.textArea);
        overflowGuardContainer.appendChild(this.textAreaCover);
        const simpleModel = {
            getLineCount: () => {
                return this._context.viewModel.getLineCount();
            },
            getLineMaxColumn: (lineNumber) => {
                return this._context.viewModel.getLineMaxColumn(lineNumber);
            },
            getValueInRange: (range, eol) => {
                return this._context.viewModel.getValueInRange(range, eol);
            },
            getValueLengthInRange: (range, eol) => {
                return this._context.viewModel.getValueLengthInRange(range, eol);
            },
            modifyPosition: (position, offset) => {
                return this._context.viewModel.modifyPosition(position, offset);
            },
        };
        const textAreaInputHost = {
            getDataToCopy: () => {
                return getDataToCopy(this._context.viewModel, this._modelSelections, this._emptySelectionClipboard, this._copyWithSyntaxHighlighting);
            },
            getScreenReaderContent: () => {
                if (this._accessibilitySupport === 1 /* AccessibilitySupport.Disabled */) {
                    // We know for a fact that a screen reader is not attached
                    // On OSX, we write the character before the cursor to allow for "long-press" composition
                    // Also on OSX, we write the word before the cursor to allow for the Accessibility Keyboard to give good hints
                    const selection = this._selections[0];
                    if (platform.isMacintosh && selection.isEmpty()) {
                        const position = selection.getStartPosition();
                        let textBefore = this._getWordBeforePosition(position);
                        if (textBefore.length === 0) {
                            textBefore = this._getCharacterBeforePosition(position);
                        }
                        if (textBefore.length > 0) {
                            return new TextAreaState(textBefore, textBefore.length, textBefore.length, Range.fromPositions(position), 0);
                        }
                    }
                    // on macOS, write current selection into textarea will allow system text services pick selected text,
                    // but we still want to limit the amount of text given Chromium handles very poorly text even of a few
                    // thousand chars
                    // (https://github.com/microsoft/vscode/issues/27799)
                    const LIMIT_CHARS = 500;
                    if (platform.isMacintosh &&
                        !selection.isEmpty() &&
                        simpleModel.getValueLengthInRange(selection, 0 /* EndOfLinePreference.TextDefined */) <
                            LIMIT_CHARS) {
                        const text = simpleModel.getValueInRange(selection, 0 /* EndOfLinePreference.TextDefined */);
                        return new TextAreaState(text, 0, text.length, selection, 0);
                    }
                    // on Safari, document.execCommand('cut') and document.execCommand('copy') will just not work
                    // if the textarea has no content selected. So if there is an editor selection, ensure something
                    // is selected in the textarea.
                    if (browser.isSafari && !selection.isEmpty()) {
                        const placeholderText = 'vscode-placeholder';
                        return new TextAreaState(placeholderText, 0, placeholderText.length, null, undefined);
                    }
                    return TextAreaState.EMPTY;
                }
                if (browser.isAndroid) {
                    // when tapping in the editor on a word, Android enters composition mode.
                    // in the `compositionstart` event we cannot clear the textarea, because
                    // it then forgets to ever send a `compositionend`.
                    // we therefore only write the current word in the textarea
                    const selection = this._selections[0];
                    if (selection.isEmpty()) {
                        const position = selection.getStartPosition();
                        const [wordAtPosition, positionOffsetInWord] = this._getAndroidWordAtPosition(position);
                        if (wordAtPosition.length > 0) {
                            return new TextAreaState(wordAtPosition, positionOffsetInWord, positionOffsetInWord, Range.fromPositions(position), 0);
                        }
                    }
                    return TextAreaState.EMPTY;
                }
                const screenReaderContentState = PagedScreenReaderStrategy.fromEditorSelection(simpleModel, this._selections[0], this._accessibilityPageSize, this._accessibilitySupport === 0 /* AccessibilitySupport.Unknown */);
                return TextAreaState.fromScreenReaderContentState(screenReaderContentState);
            },
            deduceModelPosition: (viewAnchorPosition, deltaOffset, lineFeedCnt) => {
                return this._context.viewModel.deduceModelPositionRelativeToViewPosition(viewAnchorPosition, deltaOffset, lineFeedCnt);
            },
        };
        const textAreaWrapper = this._register(new TextAreaWrapper(this.textArea.domNode));
        this._textAreaInput = this._register(this._instantiationService.createInstance(TextAreaInput, textAreaInputHost, textAreaWrapper, platform.OS, {
            isAndroid: browser.isAndroid,
            isChrome: browser.isChrome,
            isFirefox: browser.isFirefox,
            isSafari: browser.isSafari,
        }));
        this._register(this._textAreaInput.onKeyDown((e) => {
            this._viewController.emitKeyDown(e);
        }));
        this._register(this._textAreaInput.onKeyUp((e) => {
            this._viewController.emitKeyUp(e);
        }));
        this._register(this._textAreaInput.onPaste((e) => {
            let pasteOnNewLine = false;
            let multicursorText = null;
            let mode = null;
            if (e.metadata) {
                pasteOnNewLine = this._emptySelectionClipboard && !!e.metadata.isFromEmptySelection;
                multicursorText =
                    typeof e.metadata.multicursorText !== 'undefined' ? e.metadata.multicursorText : null;
                mode = e.metadata.mode;
            }
            this._viewController.paste(e.text, pasteOnNewLine, multicursorText, mode);
        }));
        this._register(this._textAreaInput.onCut(() => {
            this._viewController.cut();
        }));
        this._register(this._textAreaInput.onType((e) => {
            if (e.replacePrevCharCnt || e.replaceNextCharCnt || e.positionDelta) {
                // must be handled through the new command
                if (_debugComposition) {
                    console.log(` => compositionType: <<${e.text}>>, ${e.replacePrevCharCnt}, ${e.replaceNextCharCnt}, ${e.positionDelta}`);
                }
                this._viewController.compositionType(e.text, e.replacePrevCharCnt, e.replaceNextCharCnt, e.positionDelta);
            }
            else {
                if (_debugComposition) {
                    console.log(` => type: <<${e.text}>>`);
                }
                this._viewController.type(e.text);
            }
        }));
        this._register(this._textAreaInput.onSelectionChangeRequest((modelSelection) => {
            this._viewController.setSelection(modelSelection);
        }));
        this._register(this._textAreaInput.onCompositionStart((e) => {
            // The textarea might contain some content when composition starts.
            //
            // When we make the textarea visible, it always has a height of 1 line,
            // so we don't need to worry too much about content on lines above or below
            // the selection.
            //
            // However, the text on the current line needs to be made visible because
            // some IME methods allow to move to other glyphs on the current line
            // (by pressing arrow keys).
            //
            // (1) The textarea might contain only some parts of the current line,
            // like the word before the selection. Also, the content inside the textarea
            // can grow or shrink as composition occurs. We therefore anchor the textarea
            // in terms of distance to a certain line start and line end.
            //
            // (2) Also, we should not make \t characters visible, because their rendering
            // inside the <textarea> will not align nicely with our rendering. We therefore
            // will hide (if necessary) some of the leading text on the current line.
            const ta = this.textArea.domNode;
            const modelSelection = this._modelSelections[0];
            const { distanceToModelLineStart, widthOfHiddenTextBefore } = (() => {
                // Find the text that is on the current line before the selection
                const textBeforeSelection = ta.value.substring(0, Math.min(ta.selectionStart, ta.selectionEnd));
                const lineFeedOffset1 = textBeforeSelection.lastIndexOf('\n');
                const lineTextBeforeSelection = textBeforeSelection.substring(lineFeedOffset1 + 1);
                // We now search to see if we should hide some part of it (if it contains \t)
                const tabOffset1 = lineTextBeforeSelection.lastIndexOf('\t');
                const desiredVisibleBeforeCharCount = lineTextBeforeSelection.length - tabOffset1 - 1;
                const startModelPosition = modelSelection.getStartPosition();
                const visibleBeforeCharCount = Math.min(startModelPosition.column - 1, desiredVisibleBeforeCharCount);
                const distanceToModelLineStart = startModelPosition.column - 1 - visibleBeforeCharCount;
                const hiddenLineTextBefore = lineTextBeforeSelection.substring(0, lineTextBeforeSelection.length - visibleBeforeCharCount);
                const { tabSize } = this._context.viewModel.model.getOptions();
                const widthOfHiddenTextBefore = measureText(this.textArea.domNode.ownerDocument, hiddenLineTextBefore, this._fontInfo, tabSize);
                return { distanceToModelLineStart, widthOfHiddenTextBefore };
            })();
            const { distanceToModelLineEnd } = (() => {
                // Find the text that is on the current line after the selection
                const textAfterSelection = ta.value.substring(Math.max(ta.selectionStart, ta.selectionEnd));
                const lineFeedOffset2 = textAfterSelection.indexOf('\n');
                const lineTextAfterSelection = lineFeedOffset2 === -1
                    ? textAfterSelection
                    : textAfterSelection.substring(0, lineFeedOffset2);
                const tabOffset2 = lineTextAfterSelection.indexOf('\t');
                const desiredVisibleAfterCharCount = tabOffset2 === -1
                    ? lineTextAfterSelection.length
                    : lineTextAfterSelection.length - tabOffset2 - 1;
                const endModelPosition = modelSelection.getEndPosition();
                const visibleAfterCharCount = Math.min(this._context.viewModel.model.getLineMaxColumn(endModelPosition.lineNumber) -
                    endModelPosition.column, desiredVisibleAfterCharCount);
                const distanceToModelLineEnd = this._context.viewModel.model.getLineMaxColumn(endModelPosition.lineNumber) -
                    endModelPosition.column -
                    visibleAfterCharCount;
                return { distanceToModelLineEnd };
            })();
            // Scroll to reveal the location in the editor where composition occurs
            this._context.viewModel.revealRange('keyboard', true, Range.fromPositions(this._selections[0].getStartPosition()), 0 /* viewEvents.VerticalRevealType.Simple */, 1 /* ScrollType.Immediate */);
            this._visibleTextArea = new VisibleTextAreaData(this._context, modelSelection.startLineNumber, distanceToModelLineStart, widthOfHiddenTextBefore, distanceToModelLineEnd);
            // We turn off wrapping if the <textarea> becomes visible for composition
            this.textArea.setAttribute('wrap', this._textAreaWrapping && !this._visibleTextArea ? 'on' : 'off');
            this._visibleTextArea.prepareRender(this._visibleRangeProvider);
            this._render();
            // Show the textarea
            this.textArea.setClassName(`inputarea ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME} ime-input`);
            this._viewController.compositionStart();
            this._context.viewModel.onCompositionStart();
        }));
        this._register(this._textAreaInput.onCompositionUpdate((e) => {
            if (!this._visibleTextArea) {
                return;
            }
            this._visibleTextArea.prepareRender(this._visibleRangeProvider);
            this._render();
        }));
        this._register(this._textAreaInput.onCompositionEnd(() => {
            this._visibleTextArea = null;
            // We turn on wrapping as necessary if the <textarea> hides after composition
            this.textArea.setAttribute('wrap', this._textAreaWrapping && !this._visibleTextArea ? 'on' : 'off');
            this._render();
            this.textArea.setClassName(`inputarea ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
            this._viewController.compositionEnd();
            this._context.viewModel.onCompositionEnd();
        }));
        this._register(this._textAreaInput.onFocus(() => {
            this._context.viewModel.setHasFocus(true);
        }));
        this._register(this._textAreaInput.onBlur(() => {
            this._context.viewModel.setHasFocus(false);
        }));
        this._register(IME.onDidChange(() => {
            this._ensureReadOnlyAttribute();
        }));
    }
    get domNode() {
        return this.textArea;
    }
    writeScreenReaderContent(reason) {
        this._textAreaInput.writeNativeTextAreaContent(reason);
    }
    getTextAreaDomNode() {
        return this.textArea.domNode;
    }
    dispose() {
        super.dispose();
        this.textArea.domNode.remove();
        this.textAreaCover.domNode.remove();
    }
    _getAndroidWordAtPosition(position) {
        const ANDROID_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:",.<>/?';
        const lineContent = this._context.viewModel.getLineContent(position.lineNumber);
        const wordSeparators = getMapForWordSeparators(ANDROID_WORD_SEPARATORS, []);
        let goingLeft = true;
        let startColumn = position.column;
        let goingRight = true;
        let endColumn = position.column;
        let distance = 0;
        while (distance < 50 && (goingLeft || goingRight)) {
            if (goingLeft && startColumn <= 1) {
                goingLeft = false;
            }
            if (goingLeft) {
                const charCode = lineContent.charCodeAt(startColumn - 2);
                const charClass = wordSeparators.get(charCode);
                if (charClass !== 0 /* WordCharacterClass.Regular */) {
                    goingLeft = false;
                }
                else {
                    startColumn--;
                }
            }
            if (goingRight && endColumn > lineContent.length) {
                goingRight = false;
            }
            if (goingRight) {
                const charCode = lineContent.charCodeAt(endColumn - 1);
                const charClass = wordSeparators.get(charCode);
                if (charClass !== 0 /* WordCharacterClass.Regular */) {
                    goingRight = false;
                }
                else {
                    endColumn++;
                }
            }
            distance++;
        }
        return [lineContent.substring(startColumn - 1, endColumn - 1), position.column - startColumn];
    }
    _getWordBeforePosition(position) {
        const lineContent = this._context.viewModel.getLineContent(position.lineNumber);
        const wordSeparators = getMapForWordSeparators(this._context.configuration.options.get(136 /* EditorOption.wordSeparators */), []);
        let column = position.column;
        let distance = 0;
        while (column > 1) {
            const charCode = lineContent.charCodeAt(column - 2);
            const charClass = wordSeparators.get(charCode);
            if (charClass !== 0 /* WordCharacterClass.Regular */ || distance > 50) {
                return lineContent.substring(column - 1, position.column - 1);
            }
            distance++;
            column--;
        }
        return lineContent.substring(0, position.column - 1);
    }
    _getCharacterBeforePosition(position) {
        if (position.column > 1) {
            const lineContent = this._context.viewModel.getLineContent(position.lineNumber);
            const charBefore = lineContent.charAt(position.column - 2);
            if (!strings.isHighSurrogate(charBefore.charCodeAt(0))) {
                return charBefore;
            }
        }
        return '';
    }
    _setAccessibilityOptions(options) {
        this._accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
        const accessibilityPageSize = options.get(3 /* EditorOption.accessibilityPageSize */);
        if (this._accessibilitySupport === 2 /* AccessibilitySupport.Enabled */ &&
            accessibilityPageSize === EditorOptions.accessibilityPageSize.defaultValue) {
            // If a screen reader is attached and the default value is not set we should automatically increase the page size to 500 for a better experience
            this._accessibilityPageSize = 500;
        }
        else {
            this._accessibilityPageSize = accessibilityPageSize;
        }
        // When wrapping is enabled and a screen reader might be attached,
        // we will size the textarea to match the width used for wrapping points computation (see `domLineBreaksComputer.ts`).
        // This is because screen readers will read the text in the textarea and we'd like that the
        // wrapping points in the textarea match the wrapping points in the editor.
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const wrappingColumn = layoutInfo.wrappingColumn;
        if (wrappingColumn !== -1 && this._accessibilitySupport !== 1 /* AccessibilitySupport.Disabled */) {
            const fontInfo = options.get(52 /* EditorOption.fontInfo */);
            this._textAreaWrapping = true;
            this._textAreaWidth = Math.round(wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth);
        }
        else {
            this._textAreaWrapping = false;
            this._textAreaWidth = canUseZeroSizeTextarea ? 0 : 1;
        }
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._setAccessibilityOptions(options);
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        this._contentHeight = layoutInfo.height;
        this._fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._emptySelectionClipboard = options.get(38 /* EditorOption.emptySelectionClipboard */);
        this._copyWithSyntaxHighlighting = options.get(25 /* EditorOption.copyWithSyntaxHighlighting */);
        this.textArea.setAttribute('wrap', this._textAreaWrapping && !this._visibleTextArea ? 'on' : 'off');
        const { tabSize } = this._context.viewModel.model.getOptions();
        this.textArea.domNode.style.tabSize = `${tabSize * this._fontInfo.spaceWidth}px`;
        this.textArea.setAttribute('aria-label', ariaLabelForScreenReaderContent(options, this._keybindingService));
        this.textArea.setAttribute('aria-required', options.get(5 /* EditorOption.ariaRequired */) ? 'true' : 'false');
        this.textArea.setAttribute('tabindex', String(options.get(129 /* EditorOption.tabIndex */)));
        if (e.hasChanged(34 /* EditorOption.domReadOnly */) || e.hasChanged(96 /* EditorOption.readOnly */)) {
            this._ensureReadOnlyAttribute();
        }
        if (e.hasChanged(2 /* EditorOption.accessibilitySupport */)) {
            this._textAreaInput.writeNativeTextAreaContent('strategy changed');
        }
        return true;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections.slice(0);
        this._modelSelections = e.modelSelections.slice(0);
        // We must update the <textarea> synchronously, otherwise long press IME on macos breaks.
        // See https://github.com/microsoft/vscode/issues/165821
        this._textAreaInput.writeNativeTextAreaContent('selection changed');
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
    // --- end event handlers
    // --- begin view API
    isFocused() {
        return this._textAreaInput.isFocused();
    }
    focus() {
        this._textAreaInput.focusTextArea();
    }
    refreshFocusState() {
        this._textAreaInput.refreshFocusState();
    }
    getLastRenderData() {
        return this._lastRenderPosition;
    }
    setAriaOptions(options) {
        if (options.activeDescendant) {
            this.textArea.setAttribute('aria-haspopup', 'true');
            this.textArea.setAttribute('aria-autocomplete', 'list');
            this.textArea.setAttribute('aria-activedescendant', options.activeDescendant);
        }
        else {
            this.textArea.setAttribute('aria-haspopup', 'false');
            this.textArea.setAttribute('aria-autocomplete', 'both');
            this.textArea.removeAttribute('aria-activedescendant');
        }
        if (options.role) {
            this.textArea.setAttribute('role', options.role);
        }
    }
    // --- end view API
    _ensureReadOnlyAttribute() {
        const options = this._context.configuration.options;
        // When someone requests to disable IME, we set the "readonly" attribute on the <textarea>.
        // This will prevent composition.
        const useReadOnly = !IME.enabled || (options.get(34 /* EditorOption.domReadOnly */) && options.get(96 /* EditorOption.readOnly */));
        if (useReadOnly) {
            this.textArea.setAttribute('readonly', 'true');
        }
        else {
            this.textArea.removeAttribute('readonly');
        }
    }
    prepareRender(ctx) {
        this._primaryCursorPosition = new Position(this._selections[0].positionLineNumber, this._selections[0].positionColumn);
        this._primaryCursorVisibleRange = ctx.visibleRangeForPosition(this._primaryCursorPosition);
        this._visibleTextArea?.prepareRender(ctx);
    }
    render(ctx) {
        this._textAreaInput.writeNativeTextAreaContent('render');
        this._render();
    }
    _render() {
        if (this._visibleTextArea) {
            // The text area is visible for composition reasons
            const visibleStart = this._visibleTextArea.visibleTextareaStart;
            const visibleEnd = this._visibleTextArea.visibleTextareaEnd;
            const startPosition = this._visibleTextArea.startPosition;
            const endPosition = this._visibleTextArea.endPosition;
            if (startPosition &&
                endPosition &&
                visibleStart &&
                visibleEnd &&
                visibleEnd.left >= this._scrollLeft &&
                visibleStart.left <= this._scrollLeft + this._contentWidth) {
                const top = this._context.viewLayout.getVerticalOffsetForLineNumber(this._primaryCursorPosition.lineNumber) - this._scrollTop;
                const lineCount = newlinecount(this.textArea.domNode.value.substr(0, this.textArea.domNode.selectionStart));
                let scrollLeft = this._visibleTextArea.widthOfHiddenLineTextBefore;
                let left = this._contentLeft + visibleStart.left - this._scrollLeft;
                // See https://github.com/microsoft/vscode/issues/141725#issuecomment-1050670841
                // Here we are adding +1 to avoid flickering that might be caused by having a width that is too small.
                // This could be caused by rounding errors that might only show up with certain font families.
                // In other words, a pixel might be lost when doing something like
                //      `Math.round(end) - Math.round(start)`
                // vs
                //      `Math.round(end - start)`
                let width = visibleEnd.left - visibleStart.left + 1;
                if (left < this._contentLeft) {
                    // the textarea would be rendered on top of the margin,
                    // so reduce its width. We use the same technique as
                    // for hiding text before
                    const delta = this._contentLeft - left;
                    left += delta;
                    scrollLeft += delta;
                    width -= delta;
                }
                if (width > this._contentWidth) {
                    // the textarea would be wider than the content width,
                    // so reduce its width.
                    width = this._contentWidth;
                }
                // Try to render the textarea with the color/font style to match the text under it
                const viewLineData = this._context.viewModel.getViewLineData(startPosition.lineNumber);
                const startTokenIndex = viewLineData.tokens.findTokenIndexAtOffset(startPosition.column - 1);
                const endTokenIndex = viewLineData.tokens.findTokenIndexAtOffset(endPosition.column - 1);
                const textareaSpansSingleToken = startTokenIndex === endTokenIndex;
                const presentation = this._visibleTextArea.definePresentation(textareaSpansSingleToken ? viewLineData.tokens.getPresentation(startTokenIndex) : null);
                this.textArea.domNode.scrollTop = lineCount * this._lineHeight;
                this.textArea.domNode.scrollLeft = scrollLeft;
                this._doRender({
                    lastRenderPosition: null,
                    top: top,
                    left: left,
                    width: width,
                    height: this._lineHeight,
                    useCover: false,
                    color: (TokenizationRegistry.getColorMap() || [])[presentation.foreground],
                    italic: presentation.italic,
                    bold: presentation.bold,
                    underline: presentation.underline,
                    strikethrough: presentation.strikethrough,
                });
            }
            return;
        }
        if (!this._primaryCursorVisibleRange) {
            // The primary cursor is outside the viewport => place textarea to the top left
            this._renderAtTopLeft();
            return;
        }
        const left = this._contentLeft + this._primaryCursorVisibleRange.left - this._scrollLeft;
        if (left < this._contentLeft || left > this._contentLeft + this._contentWidth) {
            // cursor is outside the viewport
            this._renderAtTopLeft();
            return;
        }
        const top = this._context.viewLayout.getVerticalOffsetForLineNumber(this._selections[0].positionLineNumber) - this._scrollTop;
        if (top < 0 || top > this._contentHeight) {
            // cursor is outside the viewport
            this._renderAtTopLeft();
            return;
        }
        // The primary cursor is in the viewport (at least vertically) => place textarea on the cursor
        if (platform.isMacintosh || this._accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            // For the popup emoji input, we will make the text area as high as the line height
            // We will also make the fontSize and lineHeight the correct dimensions to help with the placement of these pickers
            this._doRender({
                lastRenderPosition: this._primaryCursorPosition,
                top,
                left: this._textAreaWrapping ? this._contentLeft : left,
                width: this._textAreaWidth,
                height: this._lineHeight,
                useCover: false,
            });
            // In case the textarea contains a word, we're going to try to align the textarea's cursor
            // with our cursor by scrolling the textarea as much as possible
            this.textArea.domNode.scrollLeft = this._primaryCursorVisibleRange.left;
            const lineCount = this._textAreaInput.textAreaState.newlineCountBeforeSelection ??
                newlinecount(this.textArea.domNode.value.substring(0, this.textArea.domNode.selectionStart));
            this.textArea.domNode.scrollTop = lineCount * this._lineHeight;
            return;
        }
        this._doRender({
            lastRenderPosition: this._primaryCursorPosition,
            top: top,
            left: this._textAreaWrapping ? this._contentLeft : left,
            width: this._textAreaWidth,
            height: canUseZeroSizeTextarea ? 0 : 1,
            useCover: false,
        });
    }
    _renderAtTopLeft() {
        // (in WebKit the textarea is 1px by 1px because it cannot handle input to a 0x0 textarea)
        // specifically, when doing Korean IME, setting the textarea to 0x0 breaks IME badly.
        this._doRender({
            lastRenderPosition: null,
            top: 0,
            left: 0,
            width: this._textAreaWidth,
            height: canUseZeroSizeTextarea ? 0 : 1,
            useCover: true,
        });
    }
    _doRender(renderData) {
        this._lastRenderPosition = renderData.lastRenderPosition;
        const ta = this.textArea;
        const tac = this.textAreaCover;
        applyFontInfo(ta, this._fontInfo);
        ta.setTop(renderData.top);
        ta.setLeft(renderData.left);
        ta.setWidth(renderData.width);
        ta.setHeight(renderData.height);
        ta.setColor(renderData.color ? Color.Format.CSS.formatHex(renderData.color) : '');
        ta.setFontStyle(renderData.italic ? 'italic' : '');
        if (renderData.bold) {
            // fontWeight is also set by `applyFontInfo`, so only overwrite it if necessary
            ta.setFontWeight('bold');
        }
        ta.setTextDecoration(`${renderData.underline ? ' underline' : ''}${renderData.strikethrough ? ' line-through' : ''}`);
        tac.setTop(renderData.useCover ? renderData.top : 0);
        tac.setLeft(renderData.useCover ? renderData.left : 0);
        tac.setWidth(renderData.useCover ? renderData.width : 0);
        tac.setHeight(renderData.useCover ? renderData.height : 0);
        const options = this._context.configuration.options;
        if (options.get(59 /* EditorOption.glyphMargin */)) {
            tac.setClassName('monaco-editor-background textAreaCover ' + Margin.OUTER_CLASS_NAME);
        }
        else {
            if (options.get(69 /* EditorOption.lineNumbers */).renderType !== 0 /* RenderLineNumbersType.Off */) {
                tac.setClassName('monaco-editor-background textAreaCover ' + LineNumbersOverlay.CLASS_NAME);
            }
            else {
                tac.setClassName('monaco-editor-background textAreaCover');
            }
        }
    }
};
TextAreaEditContext = __decorate([
    __param(4, IKeybindingService),
    __param(5, IInstantiationService)
], TextAreaEditContext);
export { TextAreaEditContext };
function measureText(targetDocument, text, fontInfo, tabSize) {
    if (text.length === 0) {
        return 0;
    }
    const container = targetDocument.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-50000px';
    container.style.width = '50000px';
    const regularDomNode = targetDocument.createElement('span');
    applyFontInfo(regularDomNode, fontInfo);
    regularDomNode.style.whiteSpace = 'pre'; // just like the textarea
    regularDomNode.style.tabSize = `${tabSize * fontInfo.spaceWidth}px`; // just like the textarea
    regularDomNode.append(text);
    container.appendChild(regularDomNode);
    targetDocument.body.appendChild(container);
    const res = regularDomNode.offsetWidth;
    container.remove();
    return res;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFFZGl0Q29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvdGV4dEFyZWEvdGV4dEFyZWFFZGl0Q29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxLQUFLLE9BQU8sTUFBTSx3Q0FBd0MsQ0FBQTtBQUNqRSxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUzRixPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sS0FBSyxPQUFPLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTlELE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxFQUlOLGFBQWEsR0FDYixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBYWhFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzVHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FB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