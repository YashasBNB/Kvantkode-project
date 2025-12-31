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
import * as browser from '../../../../../base/browser/browser.js';
import * as dom from '../../../../../base/browser/dom.js';
import { DomEmitter } from '../../../../../base/browser/event.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { inputLatency } from '../../../../../base/browser/performance.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import * as strings from '../../../../../base/common/strings.js';
import { Selection } from '../../../../common/core/selection.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ClipboardEventUtils, InMemoryClipboardMetadataManager, } from '../clipboardUtils.js';
import { _debugComposition, TextAreaState, } from './textAreaEditContextState.js';
export var TextAreaSyntethicEvents;
(function (TextAreaSyntethicEvents) {
    TextAreaSyntethicEvents.Tap = '-monaco-textarea-synthetic-tap';
})(TextAreaSyntethicEvents || (TextAreaSyntethicEvents = {}));
class CompositionContext {
    constructor() {
        this._lastTypeTextLength = 0;
    }
    handleCompositionUpdate(text) {
        text = text || '';
        const typeInput = {
            text: text,
            replacePrevCharCnt: this._lastTypeTextLength,
            replaceNextCharCnt: 0,
            positionDelta: 0,
        };
        this._lastTypeTextLength = text.length;
        return typeInput;
    }
}
/**
 * Writes screen reader content to the textarea and is able to analyze its input events to generate:
 *  - onCut
 *  - onPaste
 *  - onType
 *
 * Composition events are generated for presentation purposes (composition input is reflected in onType).
 */
let TextAreaInput = class TextAreaInput extends Disposable {
    get textAreaState() {
        return this._textAreaState;
    }
    constructor(_host, _textArea, _OS, _browser, _accessibilityService, _logService) {
        super();
        this._host = _host;
        this._textArea = _textArea;
        this._OS = _OS;
        this._browser = _browser;
        this._accessibilityService = _accessibilityService;
        this._logService = _logService;
        this._onFocus = this._register(new Emitter());
        this.onFocus = this._onFocus.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this._onKeyDown = this._register(new Emitter());
        this.onKeyDown = this._onKeyDown.event;
        this._onKeyUp = this._register(new Emitter());
        this.onKeyUp = this._onKeyUp.event;
        this._onCut = this._register(new Emitter());
        this.onCut = this._onCut.event;
        this._onPaste = this._register(new Emitter());
        this.onPaste = this._onPaste.event;
        this._onType = this._register(new Emitter());
        this.onType = this._onType.event;
        this._onCompositionStart = this._register(new Emitter());
        this.onCompositionStart = this._onCompositionStart.event;
        this._onCompositionUpdate = this._register(new Emitter());
        this.onCompositionUpdate = this._onCompositionUpdate.event;
        this._onCompositionEnd = this._register(new Emitter());
        this.onCompositionEnd = this._onCompositionEnd.event;
        this._onSelectionChangeRequest = this._register(new Emitter());
        this.onSelectionChangeRequest = this._onSelectionChangeRequest.event;
        this._asyncFocusGainWriteScreenReaderContent = this._register(new MutableDisposable());
        this._asyncTriggerCut = this._register(new RunOnceScheduler(() => this._onCut.fire(), 0));
        this._textAreaState = TextAreaState.EMPTY;
        this._selectionChangeListener = null;
        if (this._accessibilityService.isScreenReaderOptimized()) {
            this.writeNativeTextAreaContent('ctor');
        }
        this._register(Event.runAndSubscribe(this._accessibilityService.onDidChangeScreenReaderOptimized, () => {
            if (this._accessibilityService.isScreenReaderOptimized() &&
                !this._asyncFocusGainWriteScreenReaderContent.value) {
                this._asyncFocusGainWriteScreenReaderContent.value = this._register(new RunOnceScheduler(() => this.writeNativeTextAreaContent('asyncFocusGain'), 0));
            }
            else {
                this._asyncFocusGainWriteScreenReaderContent.clear();
            }
        }));
        this._hasFocus = false;
        this._currentComposition = null;
        let lastKeyDown = null;
        this._register(this._textArea.onKeyDown((_e) => {
            const e = new StandardKeyboardEvent(_e);
            if (e.keyCode === 114 /* KeyCode.KEY_IN_COMPOSITION */ ||
                (this._currentComposition && e.keyCode === 1 /* KeyCode.Backspace */)) {
                // Stop propagation for keyDown events if the IME is processing key input
                e.stopPropagation();
            }
            if (e.equals(9 /* KeyCode.Escape */)) {
                // Prevent default always for `Esc`, otherwise it will generate a keypress
                // See https://msdn.microsoft.com/en-us/library/ie/ms536939(v=vs.85).aspx
                e.preventDefault();
            }
            lastKeyDown = e;
            this._onKeyDown.fire(e);
        }));
        this._register(this._textArea.onKeyUp((_e) => {
            const e = new StandardKeyboardEvent(_e);
            this._onKeyUp.fire(e);
        }));
        this._register(this._textArea.onCompositionStart((e) => {
            if (_debugComposition) {
                console.log(`[compositionstart]`, e);
            }
            const currentComposition = new CompositionContext();
            if (this._currentComposition) {
                // simply reset the composition context
                this._currentComposition = currentComposition;
                return;
            }
            this._currentComposition = currentComposition;
            if (this._OS === 2 /* OperatingSystem.Macintosh */ &&
                lastKeyDown &&
                lastKeyDown.equals(114 /* KeyCode.KEY_IN_COMPOSITION */) &&
                this._textAreaState.selectionStart === this._textAreaState.selectionEnd &&
                this._textAreaState.selectionStart > 0 &&
                this._textAreaState.value.substr(this._textAreaState.selectionStart - 1, 1) === e.data &&
                (lastKeyDown.code === 'ArrowRight' || lastKeyDown.code === 'ArrowLeft')) {
                // Handling long press case on Chromium/Safari macOS + arrow key => pretend the character was selected
                if (_debugComposition) {
                    console.log(`[compositionstart] Handling long press case on macOS + arrow key`, e);
                }
                // Pretend the previous character was composed (in order to get it removed by subsequent compositionupdate events)
                currentComposition.handleCompositionUpdate('x');
                this._onCompositionStart.fire({ data: e.data });
                return;
            }
            if (this._browser.isAndroid) {
                // when tapping on the editor, Android enters composition mode to edit the current word
                // so we cannot clear the textarea on Android and we must pretend the current word was selected
                this._onCompositionStart.fire({ data: e.data });
                return;
            }
            this._onCompositionStart.fire({ data: e.data });
        }));
        this._register(this._textArea.onCompositionUpdate((e) => {
            if (_debugComposition) {
                console.log(`[compositionupdate]`, e);
            }
            const currentComposition = this._currentComposition;
            if (!currentComposition) {
                // should not be possible to receive a 'compositionupdate' without a 'compositionstart'
                return;
            }
            if (this._browser.isAndroid) {
                // On Android, the data sent with the composition update event is unusable.
                // For example, if the cursor is in the middle of a word like Mic|osoft
                // and Microsoft is chosen from the keyboard's suggestions, the e.data will contain "Microsoft".
                // This is not really usable because it doesn't tell us where the edit began and where it ended.
                const newState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
                const typeInput = TextAreaState.deduceAndroidCompositionInput(this._textAreaState, newState);
                this._textAreaState = newState;
                this._onType.fire(typeInput);
                this._onCompositionUpdate.fire(e);
                return;
            }
            const typeInput = currentComposition.handleCompositionUpdate(e.data);
            this._textAreaState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
            this._onType.fire(typeInput);
            this._onCompositionUpdate.fire(e);
        }));
        this._register(this._textArea.onCompositionEnd((e) => {
            if (_debugComposition) {
                console.log(`[compositionend]`, e);
            }
            const currentComposition = this._currentComposition;
            if (!currentComposition) {
                // https://github.com/microsoft/monaco-editor/issues/1663
                // On iOS 13.2, Chinese system IME randomly trigger an additional compositionend event with empty data
                return;
            }
            this._currentComposition = null;
            if (this._browser.isAndroid) {
                // On Android, the data sent with the composition update event is unusable.
                // For example, if the cursor is in the middle of a word like Mic|osoft
                // and Microsoft is chosen from the keyboard's suggestions, the e.data will contain "Microsoft".
                // This is not really usable because it doesn't tell us where the edit began and where it ended.
                const newState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
                const typeInput = TextAreaState.deduceAndroidCompositionInput(this._textAreaState, newState);
                this._textAreaState = newState;
                this._onType.fire(typeInput);
                this._onCompositionEnd.fire();
                return;
            }
            const typeInput = currentComposition.handleCompositionUpdate(e.data);
            this._textAreaState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
            this._onType.fire(typeInput);
            this._onCompositionEnd.fire();
        }));
        this._register(this._textArea.onInput((e) => {
            if (_debugComposition) {
                console.log(`[input]`, e);
            }
            // Pretend here we touched the text area, as the `input` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._textArea.setIgnoreSelectionChangeTime('received input event');
            if (this._currentComposition) {
                return;
            }
            const newState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
            const typeInput = TextAreaState.deduceInput(this._textAreaState, newState, 
            /*couldBeEmojiInput*/ this._OS === 2 /* OperatingSystem.Macintosh */);
            if (typeInput.replacePrevCharCnt === 0 && typeInput.text.length === 1) {
                // one character was typed
                if (strings.isHighSurrogate(typeInput.text.charCodeAt(0)) ||
                    typeInput.text.charCodeAt(0) === 0x7f /* Delete */) {
                    // Ignore invalid input but keep it around for next time
                    return;
                }
            }
            this._textAreaState = newState;
            if (typeInput.text !== '' ||
                typeInput.replacePrevCharCnt !== 0 ||
                typeInput.replaceNextCharCnt !== 0 ||
                typeInput.positionDelta !== 0) {
                this._onType.fire(typeInput);
            }
        }));
        // --- Clipboard operations
        this._register(this._textArea.onCut((e) => {
            // Pretend here we touched the text area, as the `cut` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._textArea.setIgnoreSelectionChangeTime('received cut event');
            this._ensureClipboardGetsEditorSelection(e);
            this._asyncTriggerCut.schedule();
        }));
        this._register(this._textArea.onCopy((e) => {
            this._ensureClipboardGetsEditorSelection(e);
        }));
        this._register(this._textArea.onPaste((e) => {
            // Pretend here we touched the text area, as the `paste` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._textArea.setIgnoreSelectionChangeTime('received paste event');
            e.preventDefault();
            if (!e.clipboardData) {
                return;
            }
            let [text, metadata] = ClipboardEventUtils.getTextData(e.clipboardData);
            if (!text) {
                return;
            }
            // try the in-memory store
            metadata = metadata || InMemoryClipboardMetadataManager.INSTANCE.get(text);
            this._onPaste.fire({
                text: text,
                metadata: metadata,
            });
        }));
        this._register(this._textArea.onFocus(() => {
            const hadFocus = this._hasFocus;
            this._setHasFocus(true);
            if (this._accessibilityService.isScreenReaderOptimized() &&
                this._browser.isSafari &&
                !hadFocus &&
                this._hasFocus) {
                // When "tabbing into" the textarea, immediately after dispatching the 'focus' event,
                // Safari will always move the selection at offset 0 in the textarea
                if (!this._asyncFocusGainWriteScreenReaderContent.value) {
                    this._asyncFocusGainWriteScreenReaderContent.value = new RunOnceScheduler(() => this.writeNativeTextAreaContent('asyncFocusGain'), 0);
                }
                this._asyncFocusGainWriteScreenReaderContent.value.schedule();
            }
        }));
        this._register(this._textArea.onBlur(() => {
            if (this._currentComposition) {
                // See https://github.com/microsoft/vscode/issues/112621
                // where compositionend is not triggered when the editor
                // is taken off-dom during a composition
                // Clear the flag to be able to write to the textarea
                this._currentComposition = null;
                // Clear the textarea to avoid an unwanted cursor type
                this.writeNativeTextAreaContent('blurWithoutCompositionEnd');
                // Fire artificial composition end
                this._onCompositionEnd.fire();
            }
            this._setHasFocus(false);
        }));
        this._register(this._textArea.onSyntheticTap(() => {
            if (this._browser.isAndroid && this._currentComposition) {
                // on Android, tapping does not cancel the current composition, so the
                // textarea is stuck showing the old composition
                // Clear the flag to be able to write to the textarea
                this._currentComposition = null;
                // Clear the textarea to avoid an unwanted cursor type
                this.writeNativeTextAreaContent('tapWithoutCompositionEnd');
                // Fire artificial composition end
                this._onCompositionEnd.fire();
            }
        }));
    }
    _initializeFromTest() {
        this._hasFocus = true;
        this._textAreaState = TextAreaState.readFromTextArea(this._textArea, null);
    }
    _installSelectionChangeListener() {
        // See https://github.com/microsoft/vscode/issues/27216 and https://github.com/microsoft/vscode/issues/98256
        // When using a Braille display, it is possible for users to reposition the
        // system caret. This is reflected in Chrome as a `selectionchange` event.
        //
        // The `selectionchange` event appears to be emitted under numerous other circumstances,
        // so it is quite a challenge to distinguish a `selectionchange` coming in from a user
        // using a Braille display from all the other cases.
        //
        // The problems with the `selectionchange` event are:
        //  * the event is emitted when the textarea is focused programmatically -- textarea.focus()
        //  * the event is emitted when the selection is changed in the textarea programmatically -- textarea.setSelectionRange(...)
        //  * the event is emitted when the value of the textarea is changed programmatically -- textarea.value = '...'
        //  * the event is emitted when tabbing into the textarea
        //  * the event is emitted asynchronously (sometimes with a delay as high as a few tens of ms)
        //  * the event sometimes comes in bursts for a single logical textarea operation
        // `selectionchange` events often come multiple times for a single logical change
        // so throttle multiple `selectionchange` events that burst in a short period of time.
        let previousSelectionChangeEventTime = 0;
        return dom.addDisposableListener(this._textArea.ownerDocument, 'selectionchange', (e) => {
            //todo
            inputLatency.onSelectionChange();
            if (!this._hasFocus) {
                return;
            }
            if (this._currentComposition) {
                return;
            }
            if (!this._browser.isChrome) {
                // Support only for Chrome until testing happens on other browsers
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
            const delta2 = now - this._textArea.getIgnoreSelectionChangeTime();
            this._textArea.resetSelectionChangeTime();
            if (delta2 < 100) {
                // received a `selectionchange` event within 100ms since we touched the textarea
                // => ignore it, since we caused it
                return;
            }
            if (!this._textAreaState.selection) {
                // Cannot correlate a position in the textarea with a position in the editor...
                return;
            }
            const newValue = this._textArea.getValue();
            if (this._textAreaState.value !== newValue) {
                // Cannot correlate a position in the textarea with a position in the editor...
                return;
            }
            const newSelectionStart = this._textArea.getSelectionStart();
            const newSelectionEnd = this._textArea.getSelectionEnd();
            if (this._textAreaState.selectionStart === newSelectionStart &&
                this._textAreaState.selectionEnd === newSelectionEnd) {
                // Nothing to do...
                return;
            }
            const _newSelectionStartPosition = this._textAreaState.deduceEditorPosition(newSelectionStart);
            const newSelectionStartPosition = this._host.deduceModelPosition(_newSelectionStartPosition[0], _newSelectionStartPosition[1], _newSelectionStartPosition[2]);
            const _newSelectionEndPosition = this._textAreaState.deduceEditorPosition(newSelectionEnd);
            const newSelectionEndPosition = this._host.deduceModelPosition(_newSelectionEndPosition[0], _newSelectionEndPosition[1], _newSelectionEndPosition[2]);
            const newSelection = new Selection(newSelectionStartPosition.lineNumber, newSelectionStartPosition.column, newSelectionEndPosition.lineNumber, newSelectionEndPosition.column);
            this._onSelectionChangeRequest.fire(newSelection);
        });
    }
    dispose() {
        super.dispose();
        if (this._selectionChangeListener) {
            this._selectionChangeListener.dispose();
            this._selectionChangeListener = null;
        }
    }
    focusTextArea() {
        // Setting this._hasFocus and writing the screen reader content
        // will result in a focus() and setSelectionRange() in the textarea
        this._setHasFocus(true);
        // If the editor is off DOM, focus cannot be really set, so let's double check that we have managed to set the focus
        this.refreshFocusState();
    }
    isFocused() {
        return this._hasFocus;
    }
    refreshFocusState() {
        this._setHasFocus(this._textArea.hasFocus());
    }
    _setHasFocus(newHasFocus) {
        if (this._hasFocus === newHasFocus) {
            // no change
            return;
        }
        this._hasFocus = newHasFocus;
        if (this._selectionChangeListener) {
            this._selectionChangeListener.dispose();
            this._selectionChangeListener = null;
        }
        if (this._hasFocus) {
            this._selectionChangeListener = this._installSelectionChangeListener();
        }
        if (this._hasFocus) {
            this.writeNativeTextAreaContent('focusgain');
        }
        if (this._hasFocus) {
            this._onFocus.fire();
        }
        else {
            this._onBlur.fire();
        }
    }
    _setAndWriteTextAreaState(reason, textAreaState) {
        if (!this._hasFocus) {
            textAreaState = textAreaState.collapseSelection();
        }
        if (!textAreaState.isWrittenToTextArea(this._textArea, this._hasFocus)) {
            this._logService.trace(`writeTextAreaState(reason: ${reason})`);
        }
        textAreaState.writeToTextArea(reason, this._textArea, this._hasFocus);
        this._textAreaState = textAreaState;
    }
    writeNativeTextAreaContent(reason) {
        if ((!this._accessibilityService.isScreenReaderOptimized() && reason === 'render') ||
            this._currentComposition) {
            // Do not write to the text on render unless a screen reader is being used #192278
            // Do not write to the text area when doing composition
            return;
        }
        this._setAndWriteTextAreaState(reason, this._host.getScreenReaderContent());
    }
    _ensureClipboardGetsEditorSelection(e) {
        const dataToCopy = this._host.getDataToCopy();
        const storedMetadata = {
            version: 1,
            isFromEmptySelection: dataToCopy.isFromEmptySelection,
            multicursorText: dataToCopy.multicursorText,
            mode: dataToCopy.mode,
        };
        InMemoryClipboardMetadataManager.INSTANCE.set(
        // When writing "LINE\r\n" to the clipboard and then pasting,
        // Firefox pastes "LINE\n", so let's work around this quirk
        this._browser.isFirefox ? dataToCopy.text.replace(/\r\n/g, '\n') : dataToCopy.text, storedMetadata);
        e.preventDefault();
        if (e.clipboardData) {
            ClipboardEventUtils.setTextData(e.clipboardData, dataToCopy.text, dataToCopy.html, storedMetadata);
        }
    }
};
TextAreaInput = __decorate([
    __param(4, IAccessibilityService),
    __param(5, ILogService)
], TextAreaInput);
export { TextAreaInput };
export class TextAreaWrapper extends Disposable {
    get ownerDocument() {
        return this._actual.ownerDocument;
    }
    constructor(_actual) {
        super();
        this._actual = _actual;
        this.onKeyDown = this._register(new DomEmitter(this._actual, 'keydown')).event;
        this.onKeyPress = this._register(new DomEmitter(this._actual, 'keypress')).event;
        this.onKeyUp = this._register(new DomEmitter(this._actual, 'keyup')).event;
        this.onCompositionStart = this._register(new DomEmitter(this._actual, 'compositionstart')).event;
        this.onCompositionUpdate = this._register(new DomEmitter(this._actual, 'compositionupdate')).event;
        this.onCompositionEnd = this._register(new DomEmitter(this._actual, 'compositionend'))
            .event;
        this.onBeforeInput = this._register(new DomEmitter(this._actual, 'beforeinput')).event;
        this.onInput = (this._register(new DomEmitter(this._actual, 'input')).event);
        this.onCut = this._register(new DomEmitter(this._actual, 'cut')).event;
        this.onCopy = this._register(new DomEmitter(this._actual, 'copy')).event;
        this.onPaste = this._register(new DomEmitter(this._actual, 'paste')).event;
        this.onFocus = this._register(new DomEmitter(this._actual, 'focus')).event;
        this.onBlur = this._register(new DomEmitter(this._actual, 'blur')).event;
        this._onSyntheticTap = this._register(new Emitter());
        this.onSyntheticTap = this._onSyntheticTap.event;
        this._ignoreSelectionChangeTime = 0;
        this._register(this.onKeyDown(() => inputLatency.onKeyDown()));
        this._register(this.onBeforeInput(() => inputLatency.onBeforeInput()));
        this._register(this.onInput(() => inputLatency.onInput()));
        this._register(this.onKeyUp(() => inputLatency.onKeyUp()));
        this._register(dom.addDisposableListener(this._actual, TextAreaSyntethicEvents.Tap, () => this._onSyntheticTap.fire()));
    }
    hasFocus() {
        const shadowRoot = dom.getShadowRoot(this._actual);
        if (shadowRoot) {
            return shadowRoot.activeElement === this._actual;
        }
        else if (this._actual.isConnected) {
            return dom.getActiveElement() === this._actual;
        }
        else {
            return false;
        }
    }
    setIgnoreSelectionChangeTime(reason) {
        this._ignoreSelectionChangeTime = Date.now();
    }
    getIgnoreSelectionChangeTime() {
        return this._ignoreSelectionChangeTime;
    }
    resetSelectionChangeTime() {
        this._ignoreSelectionChangeTime = 0;
    }
    getValue() {
        // console.log('current value: ' + this._textArea.value);
        return this._actual.value;
    }
    setValue(reason, value) {
        const textArea = this._actual;
        if (textArea.value === value) {
            // No change
            return;
        }
        // console.log('reason: ' + reason + ', current value: ' + textArea.value + ' => new value: ' + value);
        this.setIgnoreSelectionChangeTime('setValue');
        textArea.value = value;
    }
    getSelectionStart() {
        return this._actual.selectionDirection === 'backward'
            ? this._actual.selectionEnd
            : this._actual.selectionStart;
    }
    getSelectionEnd() {
        return this._actual.selectionDirection === 'backward'
            ? this._actual.selectionStart
            : this._actual.selectionEnd;
    }
    setSelectionRange(reason, selectionStart, selectionEnd) {
        const textArea = this._actual;
        let activeElement = null;
        const shadowRoot = dom.getShadowRoot(textArea);
        if (shadowRoot) {
            activeElement = shadowRoot.activeElement;
        }
        else {
            activeElement = dom.getActiveElement();
        }
        const activeWindow = dom.getWindow(activeElement);
        const currentIsFocused = activeElement === textArea;
        const currentSelectionStart = textArea.selectionStart;
        const currentSelectionEnd = textArea.selectionEnd;
        if (currentIsFocused &&
            currentSelectionStart === selectionStart &&
            currentSelectionEnd === selectionEnd) {
            // No change
            // Firefox iframe bug https://github.com/microsoft/monaco-editor/issues/643#issuecomment-367871377
            if (browser.isFirefox && activeWindow.parent !== activeWindow) {
                textArea.focus();
            }
            return;
        }
        // console.log('reason: ' + reason + ', setSelectionRange: ' + selectionStart + ' -> ' + selectionEnd);
        if (currentIsFocused) {
            // No need to focus, only need to change the selection range
            this.setIgnoreSelectionChangeTime('setSelectionRange');
            textArea.setSelectionRange(selectionStart, selectionEnd);
            if (browser.isFirefox && activeWindow.parent !== activeWindow) {
                textArea.focus();
            }
            return;
        }
        // If the focus is outside the textarea, browsers will try really hard to reveal the textarea.
        // Here, we try to undo the browser's desperate reveal.
        try {
            const scrollState = dom.saveParentsScrollTop(textArea);
            this.setIgnoreSelectionChangeTime('setSelectionRange');
            textArea.focus();
            textArea.setSelectionRange(selectionStart, selectionEnd);
            dom.restoreParentsScrollTop(textArea, scrollState);
        }
        catch (e) {
            // Sometimes IE throws when setting selection (e.g. textarea is off-DOM)
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFFZGl0Q29udGV4dElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC90ZXh0QXJlYS90ZXh0QXJlYUVkaXRDb250ZXh0SW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSx3Q0FBd0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDcEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFcEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXBHLE9BQU8sS0FBSyxPQUFPLE1BQU0sdUNBQXVDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBRU4sbUJBQW1CLEVBRW5CLGdDQUFnQyxHQUNoQyxNQUFNLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sRUFDTixpQkFBaUIsRUFHakIsYUFBYSxHQUNiLE1BQU0sK0JBQStCLENBQUE7QUFFdEMs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