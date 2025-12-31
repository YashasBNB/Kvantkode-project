/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import * as cssJs from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { renderFormattedText, renderText } from '../../formattedTextRenderer.js';
import { ActionBar } from '../actionbar/actionbar.js';
import * as aria from '../aria/aria.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { ScrollableElement } from '../scrollbar/scrollableElement.js';
import { Widget } from '../widget.js';
import { Emitter, Event } from '../../../common/event.js';
import { HistoryNavigator } from '../../../common/history.js';
import { equals } from '../../../common/objects.js';
import './inputBox.css';
import * as nls from '../../../../nls.js';
import { MutableDisposable } from '../../../common/lifecycle.js';
const $ = dom.$;
export var MessageType;
(function (MessageType) {
    MessageType[MessageType["INFO"] = 1] = "INFO";
    MessageType[MessageType["WARNING"] = 2] = "WARNING";
    MessageType[MessageType["ERROR"] = 3] = "ERROR";
})(MessageType || (MessageType = {}));
export const unthemedInboxStyles = {
    inputBackground: '#3C3C3C',
    inputForeground: '#CCCCCC',
    inputValidationInfoBorder: '#55AAFF',
    inputValidationInfoBackground: '#063B49',
    inputValidationWarningBorder: '#B89500',
    inputValidationWarningBackground: '#352A05',
    inputValidationErrorBorder: '#BE1100',
    inputValidationErrorBackground: '#5A1D1D',
    inputBorder: undefined,
    inputValidationErrorForeground: undefined,
    inputValidationInfoForeground: undefined,
    inputValidationWarningForeground: undefined,
};
export class InputBox extends Widget {
    constructor(container, contextViewProvider, options) {
        super();
        this.state = 'idle';
        this.maxHeight = Number.POSITIVE_INFINITY;
        this.hover = this._register(new MutableDisposable());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidHeightChange = this._register(new Emitter());
        this.onDidHeightChange = this._onDidHeightChange.event;
        this.contextViewProvider = contextViewProvider;
        this.options = options;
        this.message = null;
        this.placeholder = this.options.placeholder || '';
        this.tooltip = this.options.tooltip ?? (this.placeholder || '');
        this.ariaLabel = this.options.ariaLabel || '';
        if (this.options.validationOptions) {
            this.validation = this.options.validationOptions.validation;
        }
        this.element = dom.append(container, $('.monaco-inputbox.idle'));
        const tagName = this.options.flexibleHeight ? 'textarea' : 'input';
        const wrapper = dom.append(this.element, $('.ibwrapper'));
        this.input = dom.append(wrapper, $(tagName + '.input.empty'));
        this.input.setAttribute('autocorrect', 'off');
        this.input.setAttribute('autocapitalize', 'off');
        this.input.setAttribute('spellcheck', 'false');
        this.onfocus(this.input, () => this.element.classList.add('synthetic-focus'));
        this.onblur(this.input, () => this.element.classList.remove('synthetic-focus'));
        if (this.options.flexibleHeight) {
            this.maxHeight =
                typeof this.options.flexibleMaxHeight === 'number'
                    ? this.options.flexibleMaxHeight
                    : Number.POSITIVE_INFINITY;
            this.mirror = dom.append(wrapper, $('div.mirror'));
            this.mirror.innerText = '\u00a0';
            this.scrollableElement = new ScrollableElement(this.element, {
                vertical: 1 /* ScrollbarVisibility.Auto */,
            });
            if (this.options.flexibleWidth) {
                this.input.setAttribute('wrap', 'off');
                this.mirror.style.whiteSpace = 'pre';
                this.mirror.style.wordWrap = 'initial';
            }
            dom.append(container, this.scrollableElement.getDomNode());
            this._register(this.scrollableElement);
            // from ScrollableElement to DOM
            this._register(this.scrollableElement.onScroll((e) => (this.input.scrollTop = e.scrollTop)));
            const onSelectionChange = this._register(new DomEmitter(container.ownerDocument, 'selectionchange'));
            const onAnchoredSelectionChange = Event.filter(onSelectionChange.event, () => {
                const selection = container.ownerDocument.getSelection();
                return selection?.anchorNode === wrapper;
            });
            // from DOM to ScrollableElement
            this._register(onAnchoredSelectionChange(this.updateScrollDimensions, this));
            this._register(this.onDidHeightChange(this.updateScrollDimensions, this));
        }
        else {
            this.input.type = this.options.type || 'text';
            this.input.setAttribute('wrap', 'off');
        }
        if (this.ariaLabel) {
            this.input.setAttribute('aria-label', this.ariaLabel);
        }
        if (this.placeholder && !this.options.showPlaceholderOnFocus) {
            this.setPlaceHolder(this.placeholder);
        }
        if (this.tooltip) {
            this.setTooltip(this.tooltip);
        }
        this.oninput(this.input, () => this.onValueChange());
        this.onblur(this.input, () => this.onBlur());
        this.onfocus(this.input, () => this.onFocus());
        this._register(this.ignoreGesture(this.input));
        setTimeout(() => this.updateMirror(), 0);
        // Support actions
        if (this.options.actions) {
            this.actionbar = this._register(new ActionBar(this.element));
            this.actionbar.push(this.options.actions, { icon: true, label: false });
        }
        this.applyStyles();
    }
    onBlur() {
        this._hideMessage();
        if (this.options.showPlaceholderOnFocus) {
            this.input.setAttribute('placeholder', '');
        }
    }
    onFocus() {
        this._showMessage();
        if (this.options.showPlaceholderOnFocus) {
            this.input.setAttribute('placeholder', this.placeholder || '');
        }
    }
    setPlaceHolder(placeHolder) {
        this.placeholder = placeHolder;
        this.input.setAttribute('placeholder', placeHolder);
    }
    setTooltip(tooltip) {
        this.tooltip = tooltip;
        if (!this.hover.value) {
            this.hover.value = this._register(getBaseLayerHoverDelegate().setupDelayedHoverAtMouse(this.input, () => ({
                content: this.tooltip,
                appearance: {
                    compact: true,
                },
            })));
        }
    }
    setAriaLabel(label) {
        this.ariaLabel = label;
        if (label) {
            this.input.setAttribute('aria-label', this.ariaLabel);
        }
        else {
            this.input.removeAttribute('aria-label');
        }
    }
    getAriaLabel() {
        return this.ariaLabel;
    }
    get mirrorElement() {
        return this.mirror;
    }
    get inputElement() {
        return this.input;
    }
    get value() {
        return this.input.value;
    }
    set value(newValue) {
        if (this.input.value !== newValue) {
            this.input.value = newValue;
            this.onValueChange();
        }
    }
    get step() {
        return this.input.step;
    }
    set step(newValue) {
        this.input.step = newValue;
    }
    get height() {
        return typeof this.cachedHeight === 'number'
            ? this.cachedHeight
            : dom.getTotalHeight(this.element);
    }
    focus() {
        this.input.focus();
    }
    blur() {
        this.input.blur();
    }
    hasFocus() {
        return dom.isActiveElement(this.input);
    }
    select(range = null) {
        this.input.select();
        if (range) {
            this.input.setSelectionRange(range.start, range.end);
            if (range.end === this.input.value.length) {
                this.input.scrollLeft = this.input.scrollWidth;
            }
        }
    }
    isSelectionAtEnd() {
        return (this.input.selectionEnd === this.input.value.length &&
            this.input.selectionStart === this.input.selectionEnd);
    }
    getSelection() {
        const selectionStart = this.input.selectionStart;
        if (selectionStart === null) {
            return null;
        }
        const selectionEnd = this.input.selectionEnd ?? selectionStart;
        return {
            start: selectionStart,
            end: selectionEnd,
        };
    }
    enable() {
        this.input.removeAttribute('disabled');
    }
    disable() {
        this.blur();
        this.input.disabled = true;
        this._hideMessage();
    }
    setEnabled(enabled) {
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    get width() {
        return dom.getTotalWidth(this.input);
    }
    set width(width) {
        if (this.options.flexibleHeight && this.options.flexibleWidth) {
            // textarea with horizontal scrolling
            let horizontalPadding = 0;
            if (this.mirror) {
                const paddingLeft = parseFloat(this.mirror.style.paddingLeft || '') || 0;
                const paddingRight = parseFloat(this.mirror.style.paddingRight || '') || 0;
                horizontalPadding = paddingLeft + paddingRight;
            }
            this.input.style.width = width - horizontalPadding + 'px';
        }
        else {
            this.input.style.width = width + 'px';
        }
        if (this.mirror) {
            this.mirror.style.width = width + 'px';
        }
    }
    set paddingRight(paddingRight) {
        // Set width to avoid hint text overlapping buttons
        this.input.style.width = `calc(100% - ${paddingRight}px)`;
        if (this.mirror) {
            this.mirror.style.paddingRight = paddingRight + 'px';
        }
    }
    updateScrollDimensions() {
        if (typeof this.cachedContentHeight !== 'number' ||
            typeof this.cachedHeight !== 'number' ||
            !this.scrollableElement) {
            return;
        }
        const scrollHeight = this.cachedContentHeight;
        const height = this.cachedHeight;
        const scrollTop = this.input.scrollTop;
        this.scrollableElement.setScrollDimensions({ scrollHeight, height });
        this.scrollableElement.setScrollPosition({ scrollTop });
    }
    showMessage(message, force) {
        if (this.state === 'open' && equals(this.message, message)) {
            // Already showing
            return;
        }
        this.message = message;
        this.element.classList.remove('idle');
        this.element.classList.remove('info');
        this.element.classList.remove('warning');
        this.element.classList.remove('error');
        this.element.classList.add(this.classForType(message.type));
        const styles = this.stylesForType(this.message.type);
        this.element.style.border = `1px solid ${cssJs.asCssValueWithDefault(styles.border, 'transparent')}`;
        if (this.message.content && (this.hasFocus() || force)) {
            this._showMessage();
        }
    }
    hideMessage() {
        this.message = null;
        this.element.classList.remove('info');
        this.element.classList.remove('warning');
        this.element.classList.remove('error');
        this.element.classList.add('idle');
        this._hideMessage();
        this.applyStyles();
    }
    isInputValid() {
        return !!this.validation && !this.validation(this.value);
    }
    validate() {
        let errorMsg = null;
        if (this.validation) {
            errorMsg = this.validation(this.value);
            if (errorMsg) {
                this.inputElement.setAttribute('aria-invalid', 'true');
                this.showMessage(errorMsg);
            }
            else if (this.inputElement.hasAttribute('aria-invalid')) {
                this.inputElement.removeAttribute('aria-invalid');
                this.hideMessage();
            }
        }
        return errorMsg?.type;
    }
    stylesForType(type) {
        const styles = this.options.inputBoxStyles;
        switch (type) {
            case 1 /* MessageType.INFO */:
                return {
                    border: styles.inputValidationInfoBorder,
                    background: styles.inputValidationInfoBackground,
                    foreground: styles.inputValidationInfoForeground,
                };
            case 2 /* MessageType.WARNING */:
                return {
                    border: styles.inputValidationWarningBorder,
                    background: styles.inputValidationWarningBackground,
                    foreground: styles.inputValidationWarningForeground,
                };
            default:
                return {
                    border: styles.inputValidationErrorBorder,
                    background: styles.inputValidationErrorBackground,
                    foreground: styles.inputValidationErrorForeground,
                };
        }
    }
    classForType(type) {
        switch (type) {
            case 1 /* MessageType.INFO */:
                return 'info';
            case 2 /* MessageType.WARNING */:
                return 'warning';
            default:
                return 'error';
        }
    }
    _showMessage() {
        if (!this.contextViewProvider || !this.message) {
            return;
        }
        let div;
        const layout = () => (div.style.width = dom.getTotalWidth(this.element) + 'px');
        this.contextViewProvider.showContextView({
            getAnchor: () => this.element,
            anchorAlignment: 1 /* AnchorAlignment.RIGHT */,
            render: (container) => {
                if (!this.message) {
                    return null;
                }
                div = dom.append(container, $('.monaco-inputbox-container'));
                layout();
                const renderOptions = {
                    inline: true,
                    className: 'monaco-inputbox-message',
                };
                const spanElement = this.message.formatContent
                    ? renderFormattedText(this.message.content, renderOptions)
                    : renderText(this.message.content, renderOptions);
                spanElement.classList.add(this.classForType(this.message.type));
                const styles = this.stylesForType(this.message.type);
                spanElement.style.backgroundColor = styles.background ?? '';
                spanElement.style.color = styles.foreground ?? '';
                spanElement.style.border = styles.border ? `1px solid ${styles.border}` : '';
                dom.append(div, spanElement);
                return null;
            },
            onHide: () => {
                this.state = 'closed';
            },
            layout: layout,
        });
        // ARIA Support
        let alertText;
        if (this.message.type === 3 /* MessageType.ERROR */) {
            alertText = nls.localize('alertErrorMessage', 'Error: {0}', this.message.content);
        }
        else if (this.message.type === 2 /* MessageType.WARNING */) {
            alertText = nls.localize('alertWarningMessage', 'Warning: {0}', this.message.content);
        }
        else {
            alertText = nls.localize('alertInfoMessage', 'Info: {0}', this.message.content);
        }
        aria.alert(alertText);
        this.state = 'open';
    }
    _hideMessage() {
        if (!this.contextViewProvider) {
            return;
        }
        if (this.state === 'open') {
            this.contextViewProvider.hideContextView();
        }
        this.state = 'idle';
    }
    onValueChange() {
        this._onDidChange.fire(this.value);
        this.validate();
        this.updateMirror();
        this.input.classList.toggle('empty', !this.value);
        if (this.state === 'open' && this.contextViewProvider) {
            this.contextViewProvider.layout();
        }
    }
    updateMirror() {
        if (!this.mirror) {
            return;
        }
        const value = this.value;
        const lastCharCode = value.charCodeAt(value.length - 1);
        const suffix = lastCharCode === 10 ? ' ' : '';
        const mirrorTextContent = (value + suffix).replace(/\u000c/g, ''); // Don't measure with the form feed character, which messes up sizing
        if (mirrorTextContent) {
            this.mirror.textContent = value + suffix;
        }
        else {
            this.mirror.innerText = '\u00a0';
        }
        this.layout();
    }
    applyStyles() {
        const styles = this.options.inputBoxStyles;
        const background = styles.inputBackground ?? '';
        const foreground = styles.inputForeground ?? '';
        const border = styles.inputBorder ?? '';
        this.element.style.backgroundColor = background;
        this.element.style.color = foreground;
        this.input.style.backgroundColor = 'inherit';
        this.input.style.color = foreground;
        // there's always a border, even if the color is not set.
        this.element.style.border = `1px solid ${cssJs.asCssValueWithDefault(border, 'transparent')}`;
    }
    layout() {
        if (!this.mirror) {
            return;
        }
        const previousHeight = this.cachedContentHeight;
        this.cachedContentHeight = dom.getTotalHeight(this.mirror);
        if (previousHeight !== this.cachedContentHeight) {
            this.cachedHeight = Math.min(this.cachedContentHeight, this.maxHeight);
            this.input.style.height = this.cachedHeight + 'px';
            this._onDidHeightChange.fire(this.cachedContentHeight);
        }
    }
    insertAtCursor(text) {
        const inputElement = this.inputElement;
        const start = inputElement.selectionStart;
        const end = inputElement.selectionEnd;
        const content = inputElement.value;
        if (start !== null && end !== null) {
            this.value = content.substr(0, start) + text + content.substr(end);
            inputElement.setSelectionRange(start + 1, start + 1);
            this.layout();
        }
    }
    dispose() {
        this._hideMessage();
        this.message = null;
        this.actionbar?.dispose();
        super.dispose();
    }
}
export class HistoryInputBox extends InputBox {
    constructor(container, contextViewProvider, options) {
        const NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS = nls.localize({
            key: 'history.inputbox.hint.suffix.noparens',
            comment: [
                'Text is the suffix of an input field placeholder coming after the action the input field performs, this will be used when the input field ends in a closing parenthesis ")", for example "Filter (e.g. text, !exclude)". The character inserted into the final string is \u21C5 to represent the up and down arrow keys.',
            ],
        }, ' or {0} for history', `\u21C5`);
        const NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS = nls.localize({
            key: 'history.inputbox.hint.suffix.inparens',
            comment: [
                'Text is the suffix of an input field placeholder coming after the action the input field performs, this will be used when the input field does NOT end in a closing parenthesis (eg. "Find"). The character inserted into the final string is \u21C5 to represent the up and down arrow keys.',
            ],
        }, ' ({0} for history)', `\u21C5`);
        super(container, contextViewProvider, options);
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this.history = this._register(new HistoryNavigator(options.history, 100));
        // Function to append the history suffix to the placeholder if necessary
        const addSuffix = () => {
            if (options.showHistoryHint &&
                options.showHistoryHint() &&
                !this.placeholder.endsWith(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS) &&
                !this.placeholder.endsWith(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS) &&
                this.history.getHistory().length) {
                const suffix = this.placeholder.endsWith(')')
                    ? NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS
                    : NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS;
                const suffixedPlaceholder = this.placeholder + suffix;
                if (options.showPlaceholderOnFocus && !dom.isActiveElement(this.input)) {
                    this.placeholder = suffixedPlaceholder;
                }
                else {
                    this.setPlaceHolder(suffixedPlaceholder);
                }
            }
        };
        // Spot the change to the textarea class attribute which occurs when it changes between non-empty and empty,
        // and add the history suffix to the placeholder if not yet present
        this.observer = new MutationObserver((mutationList, observer) => {
            mutationList.forEach((mutation) => {
                if (!mutation.target.textContent) {
                    addSuffix();
                }
            });
        });
        this.observer.observe(this.input, { attributeFilter: ['class'] });
        this.onfocus(this.input, () => addSuffix());
        this.onblur(this.input, () => {
            const resetPlaceholder = (historyHint) => {
                if (!this.placeholder.endsWith(historyHint)) {
                    return false;
                }
                else {
                    const revertedPlaceholder = this.placeholder.slice(0, this.placeholder.length - historyHint.length);
                    if (options.showPlaceholderOnFocus) {
                        this.placeholder = revertedPlaceholder;
                    }
                    else {
                        this.setPlaceHolder(revertedPlaceholder);
                    }
                    return true;
                }
            };
            if (!resetPlaceholder(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS)) {
                resetPlaceholder(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS);
            }
        });
    }
    dispose() {
        super.dispose();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = undefined;
        }
    }
    addToHistory(always) {
        if (this.value && (always || this.value !== this.getCurrentValue())) {
            this.history.add(this.value);
        }
    }
    prependHistory(restoredHistory) {
        const newHistory = this.getHistory();
        this.clearHistory();
        restoredHistory.forEach((item) => {
            this.history.add(item);
        });
        newHistory.forEach((item) => {
            this.history.add(item);
        });
    }
    getHistory() {
        return this.history.getHistory();
    }
    isAtFirstInHistory() {
        return this.history.isFirst();
    }
    isAtLastInHistory() {
        return this.history.isLast();
    }
    isNowhereInHistory() {
        return this.history.isNowhere();
    }
    showNextValue() {
        if (!this.history.has(this.value)) {
            this.addToHistory();
        }
        let next = this.getNextValue();
        if (next) {
            next = next === this.value ? this.getNextValue() : next;
        }
        this.value = next ?? '';
        aria.status(this.value ? this.value : nls.localize('clearedInput', 'Cleared Input'));
    }
    showPreviousValue() {
        if (!this.history.has(this.value)) {
            this.addToHistory();
        }
        let previous = this.getPreviousValue();
        if (previous) {
            previous = previous === this.value ? this.getPreviousValue() : previous;
        }
        if (previous) {
            this.value = previous;
            aria.status(this.value);
        }
    }
    clearHistory() {
        this.history.clear();
    }
    setPlaceHolder(placeHolder) {
        super.setPlaceHolder(placeHolder);
        this.setTooltip(placeHolder);
    }
    onBlur() {
        super.onBlur();
        this._onDidBlur.fire();
    }
    onFocus() {
        super.onFocus();
        this._onDidFocus.fire();
    }
    getCurrentValue() {
        let currentValue = this.history.current();
        if (!currentValue) {
            currentValue = this.history.last();
            this.history.next();
        }
        return currentValue;
    }
    getPreviousValue() {
        return this.history.previous() || this.history.first();
    }
    getNextValue() {
        return this.history.next();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRCb3guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaW5wdXRib3gvaW5wdXRCb3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxLQUFLLEtBQUssTUFBTSxtQkFBbUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDM0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNyRCxPQUFPLEtBQUssSUFBSSxNQUFNLGlCQUFpQixDQUFBO0FBRXZDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFckMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQVksTUFBTSw0QkFBNEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFbkQsT0FBTyxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSw4QkFBOEIsQ0FBQTtBQUVsRixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBOENmLE1BQU0sQ0FBTixJQUFrQixXQUlqQjtBQUpELFdBQWtCLFdB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