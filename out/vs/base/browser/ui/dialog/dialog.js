/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './dialog.css';
import { localize } from '../../../../nls.js';
import { $, addDisposableListener, clearNode, EventHelper, EventType, getWindow, hide, isActiveElement, isAncestor, show, } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { ButtonBar, ButtonWithDescription, ButtonWithDropdown, } from '../button/button.js';
import { Checkbox } from '../toggle/toggle.js';
import { InputBox } from '../inputbox/inputBox.js';
import { Action, toAction } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { mnemonicButtonLabel } from '../../../common/labels.js';
import { Disposable, toDisposable } from '../../../common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../common/platform.js';
import { isActionProvider } from '../dropdown/dropdown.js';
export class Dialog extends Disposable {
    constructor(container, message, buttons, options) {
        super();
        this.container = container;
        this.message = message;
        this.options = options;
        this.modalElement = this.container.appendChild($(`.monaco-dialog-modal-block.dimmed`));
        this.shadowElement = this.modalElement.appendChild($('.dialog-shadow'));
        this.element = this.shadowElement.appendChild($('.monaco-dialog-box'));
        this.element.setAttribute('role', 'dialog');
        this.element.tabIndex = -1;
        hide(this.element);
        this.buttonStyles = options.buttonStyles;
        if (Array.isArray(buttons) && buttons.length > 0) {
            this.buttons = buttons;
        }
        else if (!this.options.disableDefaultAction) {
            this.buttons = [localize('ok', 'OK')];
        }
        else {
            this.buttons = [];
        }
        const buttonsRowElement = this.element.appendChild($('.dialog-buttons-row'));
        this.buttonsContainer = buttonsRowElement.appendChild($('.dialog-buttons'));
        const messageRowElement = this.element.appendChild($('.dialog-message-row'));
        this.iconElement = messageRowElement.appendChild($('#monaco-dialog-icon.dialog-icon'));
        this.iconElement.setAttribute('aria-label', this.getIconAriaLabel());
        this.messageContainer = messageRowElement.appendChild($('.dialog-message-container'));
        if (this.options.detail || this.options.renderBody) {
            const messageElement = this.messageContainer.appendChild($('.dialog-message'));
            const messageTextElement = messageElement.appendChild($('#monaco-dialog-message-text.dialog-message-text'));
            messageTextElement.innerText = this.message;
        }
        this.messageDetailElement = this.messageContainer.appendChild($('#monaco-dialog-message-detail.dialog-message-detail'));
        if (this.options.detail || !this.options.renderBody) {
            this.messageDetailElement.innerText = this.options.detail ? this.options.detail : message;
        }
        else {
            this.messageDetailElement.style.display = 'none';
        }
        if (this.options.renderBody) {
            const customBody = this.messageContainer.appendChild($('#monaco-dialog-message-body.dialog-message-body'));
            this.options.renderBody(customBody);
            for (const el of this.messageContainer.querySelectorAll('a')) {
                el.tabIndex = 0;
            }
        }
        if (this.options.inputs) {
            this.inputs = this.options.inputs.map((input) => {
                const inputRowElement = this.messageContainer.appendChild($('.dialog-message-input'));
                const inputBox = this._register(new InputBox(inputRowElement, undefined, {
                    placeholder: input.placeholder,
                    type: input.type ?? 'text',
                    inputBoxStyles: options.inputBoxStyles,
                }));
                if (input.value) {
                    inputBox.value = input.value;
                }
                return inputBox;
            });
        }
        else {
            this.inputs = [];
        }
        if (this.options.checkboxLabel) {
            const checkboxRowElement = this.messageContainer.appendChild($('.dialog-checkbox-row'));
            const checkbox = (this.checkbox = this._register(new Checkbox(this.options.checkboxLabel, !!this.options.checkboxChecked, options.checkboxStyles)));
            checkboxRowElement.appendChild(checkbox.domNode);
            const checkboxMessageElement = checkboxRowElement.appendChild($('.dialog-checkbox-message'));
            checkboxMessageElement.innerText = this.options.checkboxLabel;
            this._register(addDisposableListener(checkboxMessageElement, EventType.CLICK, () => (checkbox.checked = !checkbox.checked)));
        }
        const toolbarRowElement = this.element.appendChild($('.dialog-toolbar-row'));
        this.toolbarContainer = toolbarRowElement.appendChild($('.dialog-toolbar'));
        this.applyStyles();
    }
    getIconAriaLabel() {
        let typeLabel = localize('dialogInfoMessage', 'Info');
        switch (this.options.type) {
            case 'error':
                typeLabel = localize('dialogErrorMessage', 'Error');
                break;
            case 'warning':
                typeLabel = localize('dialogWarningMessage', 'Warning');
                break;
            case 'pending':
                typeLabel = localize('dialogPendingMessage', 'In Progress');
                break;
            case 'none':
            case 'info':
            case 'question':
            default:
                break;
        }
        return typeLabel;
    }
    updateMessage(message) {
        this.messageDetailElement.innerText = message;
    }
    async show() {
        this.focusToReturn = this.container.ownerDocument.activeElement;
        return new Promise((resolve) => {
            clearNode(this.buttonsContainer);
            const close = () => {
                resolve({
                    button: this.options.cancelId || 0,
                    checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                });
                return;
            };
            this._register(toDisposable(close));
            const buttonBar = (this.buttonBar = this._register(new ButtonBar(this.buttonsContainer)));
            const buttonMap = this.rearrangeButtons(this.buttons, this.options.cancelId);
            const onButtonClick = (index) => {
                resolve({
                    button: buttonMap[index].index,
                    checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                    values: this.inputs.length > 0 ? this.inputs.map((input) => input.value) : undefined,
                });
            };
            // Handle button clicks
            buttonMap.forEach((_, index) => {
                const primary = buttonMap[index].index === 0;
                let button;
                if (primary && this.options?.primaryButtonDropdown) {
                    const actions = isActionProvider(this.options.primaryButtonDropdown.actions)
                        ? this.options.primaryButtonDropdown.actions.getActions()
                        : this.options.primaryButtonDropdown.actions;
                    button = this._register(buttonBar.addButtonWithDropdown({
                        ...this.options.primaryButtonDropdown,
                        ...this.buttonStyles,
                        dropdownLayer: 2600, // ensure the dropdown is above the dialog
                        actions: actions.map((action) => toAction({
                            ...action,
                            run: async () => {
                                await action.run();
                                onButtonClick(index);
                            },
                        })),
                    }));
                }
                else if (this.options.buttonDetails) {
                    button = this._register(buttonBar.addButtonWithDescription({ secondary: !primary, ...this.buttonStyles }));
                }
                else {
                    button = this._register(buttonBar.addButton({ secondary: !primary, ...this.buttonStyles }));
                }
                button.label = mnemonicButtonLabel(buttonMap[index].label, true);
                if (button instanceof ButtonWithDescription) {
                    button.description = this.options.buttonDetails[buttonMap[index].index];
                }
                this._register(button.onDidClick((e) => {
                    if (e) {
                        EventHelper.stop(e);
                    }
                    onButtonClick(index);
                }));
            });
            // Handle keyboard events globally: Tab, Arrow-Left/Right
            const window = getWindow(this.container);
            this._register(addDisposableListener(window, 'keydown', (e) => {
                const evt = new StandardKeyboardEvent(e);
                if (evt.equals(512 /* KeyMod.Alt */)) {
                    evt.preventDefault();
                }
                if (evt.equals(3 /* KeyCode.Enter */)) {
                    // Enter in input field should OK the dialog
                    if (this.inputs.some((input) => input.hasFocus())) {
                        EventHelper.stop(e);
                        resolve({
                            button: buttonMap.find((button) => button.index !== this.options.cancelId)?.index ?? 0,
                            checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                            values: this.inputs.length > 0 ? this.inputs.map((input) => input.value) : undefined,
                        });
                    }
                    return; // leave default handling
                }
                // Cmd+D (trigger the "no"/"do not save"-button) (macOS only)
                if (isMacintosh && evt.equals(2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */)) {
                    EventHelper.stop(e);
                    const noButton = buttonMap.find((button) => button.index === 1 && button.index !== this.options.cancelId);
                    if (noButton) {
                        resolve({
                            button: noButton.index,
                            checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                            values: this.inputs.length > 0 ? this.inputs.map((input) => input.value) : undefined,
                        });
                    }
                    return; // leave default handling
                }
                if (evt.equals(10 /* KeyCode.Space */)) {
                    return; // leave default handling
                }
                let eventHandled = false;
                // Focus: Next / Previous
                if (evt.equals(2 /* KeyCode.Tab */) ||
                    evt.equals(17 /* KeyCode.RightArrow */) ||
                    evt.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */) ||
                    evt.equals(15 /* KeyCode.LeftArrow */)) {
                    // Build a list of focusable elements in their visual order
                    const focusableElements = [];
                    let focusedIndex = -1;
                    if (this.messageContainer) {
                        const links = this.messageContainer.querySelectorAll('a');
                        for (const link of links) {
                            focusableElements.push(link);
                            if (isActiveElement(link)) {
                                focusedIndex = focusableElements.length - 1;
                            }
                        }
                    }
                    for (const input of this.inputs) {
                        focusableElements.push(input);
                        if (input.hasFocus()) {
                            focusedIndex = focusableElements.length - 1;
                        }
                    }
                    if (this.checkbox) {
                        focusableElements.push(this.checkbox);
                        if (this.checkbox.hasFocus()) {
                            focusedIndex = focusableElements.length - 1;
                        }
                    }
                    if (this.buttonBar) {
                        for (const button of this.buttonBar.buttons) {
                            if (button instanceof ButtonWithDropdown) {
                                focusableElements.push(button.primaryButton);
                                if (button.primaryButton.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                                focusableElements.push(button.dropdownButton);
                                if (button.dropdownButton.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                            }
                            else {
                                focusableElements.push(button);
                                if (button.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                            }
                        }
                    }
                    // Focus next element (with wrapping)
                    if (evt.equals(2 /* KeyCode.Tab */) || evt.equals(17 /* KeyCode.RightArrow */)) {
                        const newFocusedIndex = (focusedIndex + 1) % focusableElements.length;
                        focusableElements[newFocusedIndex].focus();
                    }
                    // Focus previous element (with wrapping)
                    else {
                        if (focusedIndex === -1) {
                            focusedIndex = focusableElements.length; // default to focus last element if none have focus
                        }
                        let newFocusedIndex = focusedIndex - 1;
                        if (newFocusedIndex === -1) {
                            newFocusedIndex = focusableElements.length - 1;
                        }
                        focusableElements[newFocusedIndex].focus();
                    }
                    eventHandled = true;
                }
                if (eventHandled) {
                    EventHelper.stop(e, true);
                }
                else if (this.options.keyEventProcessor) {
                    this.options.keyEventProcessor(evt);
                }
            }, true));
            this._register(addDisposableListener(window, 'keyup', (e) => {
                EventHelper.stop(e, true);
                const evt = new StandardKeyboardEvent(e);
                if (!this.options.disableCloseAction && evt.equals(9 /* KeyCode.Escape */)) {
                    close();
                }
            }, true));
            // Detect focus out
            this._register(addDisposableListener(this.element, 'focusout', (e) => {
                if (!!e.relatedTarget && !!this.element) {
                    if (!isAncestor(e.relatedTarget, this.element)) {
                        this.focusToReturn = e.relatedTarget;
                        if (e.target) {
                            ;
                            e.target.focus();
                            EventHelper.stop(e, true);
                        }
                    }
                }
            }, false));
            const spinModifierClassName = 'codicon-modifier-spin';
            this.iconElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.dialogError), ...ThemeIcon.asClassNameArray(Codicon.dialogWarning), ...ThemeIcon.asClassNameArray(Codicon.dialogInfo), ...ThemeIcon.asClassNameArray(Codicon.loading), spinModifierClassName);
            if (this.options.icon) {
                this.iconElement.classList.add(...ThemeIcon.asClassNameArray(this.options.icon));
            }
            else {
                switch (this.options.type) {
                    case 'error':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogError));
                        break;
                    case 'warning':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogWarning));
                        break;
                    case 'pending':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), spinModifierClassName);
                        break;
                    case 'none':
                        this.iconElement.classList.add('no-codicon');
                        break;
                    case 'info':
                    case 'question':
                    default:
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogInfo));
                        break;
                }
            }
            if (!this.options.disableCloseAction) {
                const actionBar = this._register(new ActionBar(this.toolbarContainer, {}));
                const action = this._register(new Action('dialog.close', localize('dialogClose', 'Close Dialog'), ThemeIcon.asClassName(Codicon.dialogClose), true, async () => {
                    resolve({
                        button: this.options.cancelId || 0,
                        checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                    });
                }));
                actionBar.push(action, { icon: true, label: false });
            }
            this.applyStyles();
            this.element.setAttribute('aria-modal', 'true');
            this.element.setAttribute('aria-labelledby', 'monaco-dialog-icon monaco-dialog-message-text');
            this.element.setAttribute('aria-describedby', 'monaco-dialog-icon monaco-dialog-message-text monaco-dialog-message-detail monaco-dialog-message-body');
            show(this.element);
            // Focus first element (input or button)
            if (this.inputs.length > 0) {
                this.inputs[0].focus();
                this.inputs[0].select();
            }
            else {
                buttonMap.forEach((value, index) => {
                    if (value.index === 0) {
                        buttonBar.buttons[index].focus();
                    }
                });
            }
        });
    }
    applyStyles() {
        const style = this.options.dialogStyles;
        const fgColor = style.dialogForeground;
        const bgColor = style.dialogBackground;
        const shadowColor = style.dialogShadow ? `0 0px 8px ${style.dialogShadow}` : '';
        const border = style.dialogBorder ? `1px solid ${style.dialogBorder}` : '';
        const linkFgColor = style.textLinkForeground;
        this.shadowElement.style.boxShadow = shadowColor;
        this.element.style.color = fgColor ?? '';
        this.element.style.backgroundColor = bgColor ?? '';
        this.element.style.border = border;
        // TODO fix
        // if (fgColor && bgColor) {
        // 	const messageDetailColor = fgColor.transparent(.9);
        // 	this.messageDetailElement.style.mixBlendMode = messageDetailColor.makeOpaque(bgColor).toString();
        // }
        if (linkFgColor) {
            for (const el of this.messageContainer.getElementsByTagName('a')) {
                el.style.color = linkFgColor;
            }
        }
        let color;
        switch (this.options.type) {
            case 'none':
                break;
            case 'error':
                color = style.errorIconForeground;
                break;
            case 'warning':
                color = style.warningIconForeground;
                break;
            default:
                color = style.infoIconForeground;
                break;
        }
        if (color) {
            this.iconElement.style.color = color;
        }
    }
    dispose() {
        super.dispose();
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = undefined;
        }
        if (this.focusToReturn && isAncestor(this.focusToReturn, this.container.ownerDocument.body)) {
            this.focusToReturn.focus();
            this.focusToReturn = undefined;
        }
    }
    rearrangeButtons(buttons, cancelId) {
        // Maps each button to its current label and old index
        // so that when we move them around it's not a problem
        const buttonMap = buttons.map((label, index) => ({ label, index }));
        if (buttons.length < 2) {
            return buttonMap; // only need to rearrange if there are 2+ buttons
        }
        if (isMacintosh || isLinux) {
            // Linux: the GNOME HIG (https://developer.gnome.org/hig/patterns/feedback/dialogs.html?highlight=dialog)
            // recommend the following:
            // "Always ensure that the cancel button appears first, before the affirmative button. In left-to-right
            //  locales, this is on the left. This button order ensures that users become aware of, and are reminded
            //  of, the ability to cancel prior to encountering the affirmative button."
            // macOS: the HIG (https://developer.apple.com/design/human-interface-guidelines/components/presentation/alerts)
            // recommend the following:
            // "Place buttons where people expect. In general, place the button people are most likely to choose on the trailing side in a
            //  row of buttons or at the top in a stack of buttons. Always place the default button on the trailing side of a row or at the
            //  top of a stack. Cancel buttons are typically on the leading side of a row or at the bottom of a stack."
            if (typeof cancelId === 'number' && buttonMap[cancelId]) {
                const cancelButton = buttonMap.splice(cancelId, 1)[0];
                buttonMap.splice(1, 0, cancelButton);
            }
            buttonMap.reverse();
        }
        else if (isWindows) {
            // Windows: the HIG (https://learn.microsoft.com/en-us/windows/win32/uxguide/win-dialog-box)
            // recommend the following:
            // "One of the following sets of concise commands: Yes/No, Yes/No/Cancel, [Do it]/Cancel,
            //  [Do it]/[Don't do it], [Do it]/[Don't do it]/Cancel."
            if (typeof cancelId === 'number' && buttonMap[cancelId]) {
                const cancelButton = buttonMap.splice(cancelId, 1)[0];
                buttonMap.push(cancelButton);
            }
        }
        return buttonMap;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2RpYWxvZy9kaWFsb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxXQUFXLEVBQ1gsU0FBUyxFQUNULFNBQVMsRUFDVCxJQUFJLEVBQ0osZUFBZSxFQUNmLFVBQVUsRUFDVixJQUFJLEdBQ0osTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3JELE9BQU8sRUFDTixTQUFTLEVBQ1QscUJBQXFCLEVBQ3JCLGtCQUFrQixHQUlsQixNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDL0QsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFT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