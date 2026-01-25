/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { CaseSensitiveToggle, RegexToggle, WholeWordsToggle } from './findInputToggles.js';
import { HistoryInputBox, } from '../inputbox/inputBox.js';
import { Widget } from '../widget.js';
import { Emitter } from '../../../common/event.js';
import './findInput.css';
import * as nls from '../../../../nls.js';
import { DisposableStore, MutableDisposable } from '../../../common/lifecycle.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
const NLS_DEFAULT_LABEL = nls.localize('defaultLabel', 'input');
export class FindInput extends Widget {
    static { this.OPTION_CHANGE = 'optionChange'; }
    constructor(parent, contextViewProvider, options) {
        super();
        this.fixFocusOnOptionClickEnabled = true;
        this.imeSessionInProgress = false;
        this.additionalTogglesDisposables = this._register(new MutableDisposable());
        this.additionalToggles = [];
        this._onDidOptionChange = this._register(new Emitter());
        this.onDidOptionChange = this._onDidOptionChange.event;
        this._onKeyDown = this._register(new Emitter());
        this.onKeyDown = this._onKeyDown.event;
        this._onMouseDown = this._register(new Emitter());
        this.onMouseDown = this._onMouseDown.event;
        this._onInput = this._register(new Emitter());
        this.onInput = this._onInput.event;
        this._onKeyUp = this._register(new Emitter());
        this.onKeyUp = this._onKeyUp.event;
        this._onCaseSensitiveKeyDown = this._register(new Emitter());
        this.onCaseSensitiveKeyDown = this._onCaseSensitiveKeyDown.event;
        this._onRegexKeyDown = this._register(new Emitter());
        this.onRegexKeyDown = this._onRegexKeyDown.event;
        this._lastHighlightFindOptions = 0;
        this.placeholder = options.placeholder || '';
        this.validation = options.validation;
        this.label = options.label || NLS_DEFAULT_LABEL;
        this.showCommonFindToggles = !!options.showCommonFindToggles;
        const appendCaseSensitiveLabel = options.appendCaseSensitiveLabel || '';
        const appendWholeWordsLabel = options.appendWholeWordsLabel || '';
        const appendRegexLabel = options.appendRegexLabel || '';
        const flexibleHeight = !!options.flexibleHeight;
        const flexibleWidth = !!options.flexibleWidth;
        const flexibleMaxHeight = options.flexibleMaxHeight;
        this.domNode = document.createElement('div');
        this.domNode.classList.add('monaco-findInput');
        this.inputBox = this._register(new HistoryInputBox(this.domNode, contextViewProvider, {
            placeholder: this.placeholder || '',
            ariaLabel: this.label || '',
            validationOptions: {
                validation: this.validation,
            },
            showHistoryHint: options.showHistoryHint,
            flexibleHeight,
            flexibleWidth,
            flexibleMaxHeight,
            inputBoxStyles: options.inputBoxStyles,
            history: options.history,
        }));
        const hoverDelegate = this._register(createInstantHoverDelegate());
        if (this.showCommonFindToggles) {
            this.regex = this._register(new RegexToggle({
                appendTitle: appendRegexLabel,
                isChecked: false,
                hoverDelegate,
                ...options.toggleStyles,
            }));
            this._register(this.regex.onChange((viaKeyboard) => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
                this.validate();
            }));
            this._register(this.regex.onKeyDown((e) => {
                this._onRegexKeyDown.fire(e);
            }));
            this.wholeWords = this._register(new WholeWordsToggle({
                appendTitle: appendWholeWordsLabel,
                isChecked: false,
                hoverDelegate,
                ...options.toggleStyles,
            }));
            this._register(this.wholeWords.onChange((viaKeyboard) => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
                this.validate();
            }));
            this.caseSensitive = this._register(new CaseSensitiveToggle({
                appendTitle: appendCaseSensitiveLabel,
                isChecked: false,
                hoverDelegate,
                ...options.toggleStyles,
            }));
            this._register(this.caseSensitive.onChange((viaKeyboard) => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
                this.validate();
            }));
            this._register(this.caseSensitive.onKeyDown((e) => {
                this._onCaseSensitiveKeyDown.fire(e);
            }));
            // Arrow-Key support to navigate between options
            const indexes = [this.caseSensitive.domNode, this.wholeWords.domNode, this.regex.domNode];
            this.onkeydown(this.domNode, (event) => {
                if (event.equals(15 /* KeyCode.LeftArrow */) ||
                    event.equals(17 /* KeyCode.RightArrow */) ||
                    event.equals(9 /* KeyCode.Escape */)) {
                    const index = indexes.indexOf(this.domNode.ownerDocument.activeElement);
                    if (index >= 0) {
                        let newIndex = -1;
                        if (event.equals(17 /* KeyCode.RightArrow */)) {
                            newIndex = (index + 1) % indexes.length;
                        }
                        else if (event.equals(15 /* KeyCode.LeftArrow */)) {
                            if (index === 0) {
                                newIndex = indexes.length - 1;
                            }
                            else {
                                newIndex = index - 1;
                            }
                        }
                        if (event.equals(9 /* KeyCode.Escape */)) {
                            indexes[index].blur();
                            this.inputBox.focus();
                        }
                        else if (newIndex >= 0) {
                            indexes[newIndex].focus();
                        }
                        dom.EventHelper.stop(event, true);
                    }
                }
            });
        }
        this.controls = document.createElement('div');
        this.controls.className = 'controls';
        this.controls.style.display = this.showCommonFindToggles ? '' : 'none';
        if (this.caseSensitive) {
            this.controls.append(this.caseSensitive.domNode);
        }
        if (this.wholeWords) {
            this.controls.appendChild(this.wholeWords.domNode);
        }
        if (this.regex) {
            this.controls.appendChild(this.regex.domNode);
        }
        this.setAdditionalToggles(options?.additionalToggles);
        if (this.controls) {
            this.domNode.appendChild(this.controls);
        }
        parent?.appendChild(this.domNode);
        this._register(dom.addDisposableListener(this.inputBox.inputElement, 'compositionstart', (e) => {
            this.imeSessionInProgress = true;
        }));
        this._register(dom.addDisposableListener(this.inputBox.inputElement, 'compositionend', (e) => {
            this.imeSessionInProgress = false;
            this._onInput.fire();
        }));
        this.onkeydown(this.inputBox.inputElement, (e) => this._onKeyDown.fire(e));
        this.onkeyup(this.inputBox.inputElement, (e) => this._onKeyUp.fire(e));
        this.oninput(this.inputBox.inputElement, (e) => this._onInput.fire());
        this.onmousedown(this.inputBox.inputElement, (e) => this._onMouseDown.fire(e));
    }
    get isImeSessionInProgress() {
        return this.imeSessionInProgress;
    }
    get onDidChange() {
        return this.inputBox.onDidChange;
    }
    layout(style) {
        this.inputBox.layout();
        this.updateInputBoxPadding(style.collapsedFindWidget);
    }
    enable() {
        this.domNode.classList.remove('disabled');
        this.inputBox.enable();
        this.regex?.enable();
        this.wholeWords?.enable();
        this.caseSensitive?.enable();
        for (const toggle of this.additionalToggles) {
            toggle.enable();
        }
    }
    disable() {
        this.domNode.classList.add('disabled');
        this.inputBox.disable();
        this.regex?.disable();
        this.wholeWords?.disable();
        this.caseSensitive?.disable();
        for (const toggle of this.additionalToggles) {
            toggle.disable();
        }
    }
    setFocusInputOnOptionClick(value) {
        this.fixFocusOnOptionClickEnabled = value;
    }
    setEnabled(enabled) {
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    setAdditionalToggles(toggles) {
        for (const currentToggle of this.additionalToggles) {
            currentToggle.domNode.remove();
        }
        this.additionalToggles = [];
        this.additionalTogglesDisposables.value = new DisposableStore();
        for (const toggle of toggles ?? []) {
            this.additionalTogglesDisposables.value.add(toggle);
            this.controls.appendChild(toggle.domNode);
            this.additionalTogglesDisposables.value.add(toggle.onChange((viaKeyboard) => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
            }));
            this.additionalToggles.push(toggle);
        }
        if (this.additionalToggles.length > 0) {
            this.controls.style.display = '';
        }
        this.updateInputBoxPadding();
    }
    updateInputBoxPadding(controlsHidden = false) {
        if (controlsHidden) {
            this.inputBox.paddingRight = 0;
        }
        else {
            this.inputBox.paddingRight =
                (this.caseSensitive?.width() ?? 0) +
                    (this.wholeWords?.width() ?? 0) +
                    (this.regex?.width() ?? 0) +
                    this.additionalToggles.reduce((r, t) => r + t.width(), 0);
        }
    }
    clear() {
        this.clearValidation();
        this.setValue('');
        this.focus();
    }
    getValue() {
        return this.inputBox.value;
    }
    setValue(value) {
        if (this.inputBox.value !== value) {
            this.inputBox.value = value;
        }
    }
    onSearchSubmit() {
        this.inputBox.addToHistory();
    }
    select() {
        this.inputBox.select();
    }
    focus() {
        this.inputBox.focus();
    }
    getCaseSensitive() {
        return this.caseSensitive?.checked ?? false;
    }
    setCaseSensitive(value) {
        if (this.caseSensitive) {
            this.caseSensitive.checked = value;
        }
    }
    getWholeWords() {
        return this.wholeWords?.checked ?? false;
    }
    setWholeWords(value) {
        if (this.wholeWords) {
            this.wholeWords.checked = value;
        }
    }
    getRegex() {
        return this.regex?.checked ?? false;
    }
    setRegex(value) {
        if (this.regex) {
            this.regex.checked = value;
            this.validate();
        }
    }
    focusOnCaseSensitive() {
        this.caseSensitive?.focus();
    }
    focusOnRegex() {
        this.regex?.focus();
    }
    highlightFindOptions() {
        this.domNode.classList.remove('highlight-' + this._lastHighlightFindOptions);
        this._lastHighlightFindOptions = 1 - this._lastHighlightFindOptions;
        this.domNode.classList.add('highlight-' + this._lastHighlightFindOptions);
    }
    validate() {
        this.inputBox.validate();
    }
    showMessage(message) {
        this.inputBox.showMessage(message);
    }
    clearMessage() {
        this.inputBox.hideMessage();
    }
    clearValidation() {
        this.inputBox.hideMessage();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvZmluZGlucHV0L2ZpbmRJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUtuQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDMUYsT0FBTyxFQUNOLGVBQWUsR0FJZixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDckMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDBCQUEwQixDQUFBO0FBRXpELE9BQU8saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDakYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUF1QjdFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFFL0QsTUFBTSxPQUFPLFNBQVUsU0FBUSxNQUFNO2FBQ3BCLGtCQUFhLEdBQVcsY0FBYyxBQUF6QixDQUF5QjtJQXlDdEQsWUFDQyxNQUEwQixFQUMxQixtQkFBcUQsRUFDckQsT0FBMEI7UUFFMUIsS0FBSyxFQUFFLENBQUE7UUF4Q0EsaUNBQTRCLEdBQUcsSUFBSSxDQUFBO1FBQ25DLHlCQUFvQixHQUFHLEtBQUssQ0FBQTtRQUNuQixpQ0FBNEIsR0FDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMs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