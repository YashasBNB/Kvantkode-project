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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRCb3guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9pbnB1dGJveC9pbnB1dEJveC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEtBQUssS0FBSyxNQUFNLG1CQUFtQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3JELE9BQU8sS0FBSyxJQUFJLE1BQU0saUJBQWlCLENBQUE7QUFFdkMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBWSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUVuRCxPQUFPLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLDhCQUE4QixDQUFBO0FBRWxGLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUE4Q2YsTUFBTSxDQUFOLElBQWtCLFdBSWpCO0FBSkQsV0FB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