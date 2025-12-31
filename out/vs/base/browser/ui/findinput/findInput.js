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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2ZpbmRpbnB1dC9maW5kSW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFLbkMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzFGLE9BQU8sRUFDTixlQUFlLEdBSWYsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3JDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQTtBQUV6RCxPQUFPLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2pGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBdUI3RSxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBRS9ELE1BQU0sT0FBTyxTQUFVLFNBQVEsTUFBTTthQUNwQixrQkFBYSxHQUFXLGNBQWMsQUFBekIsQ0FBeUI7SUF5Q3RELFlBQ0MsTUFBMEIsRUFDMUIsbUJBQXFELEVBQ3JELE9BQTBCO1FBRTFCLEtBQUssRUFBRSxDQUFBO1FBeENBLGlDQUE0QixHQUFHLElBQUksQ0FBQTtRQUNuQyx5QkFBb0IsR0FBRyxLQUFLLENBQUE7UUFDbkIsaUNBQTRCLEdBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7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