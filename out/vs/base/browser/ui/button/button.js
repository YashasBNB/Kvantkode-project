/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, EventHelper, EventType, isActiveElement, reset, trackFocus, $, } from '../../dom.js';
import dompurify from '../../dompurify/dompurify.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { renderMarkdown, renderStringAsPlaintext } from '../../markdownRenderer.js';
import { Gesture, EventType as TouchEventType } from '../../touch.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate, } from '../hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../iconLabel/iconLabels.js';
import { Action } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { Color } from '../../../common/color.js';
import { Emitter } from '../../../common/event.js';
import { isMarkdownString, markdownStringEqual, } from '../../../common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import { ThemeIcon } from '../../../common/themables.js';
import './button.css';
import { localize } from '../../../../nls.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
export const unthemedButtonStyles = {
    buttonBackground: '#0E639C',
    buttonHoverBackground: '#006BB3',
    buttonSeparator: Color.white.toString(),
    buttonForeground: Color.white.toString(),
    buttonBorder: undefined,
    buttonSecondaryBackground: undefined,
    buttonSecondaryForeground: undefined,
    buttonSecondaryHoverBackground: undefined,
};
export class Button extends Disposable {
    get onDidClick() {
        return this._onDidClick.event;
    }
    get onDidEscape() {
        return this._onDidEscape.event;
    }
    constructor(container, options) {
        super();
        this._label = '';
        this._onDidClick = this._register(new Emitter());
        this._onDidEscape = this._register(new Emitter());
        this.options = options;
        this._element = document.createElement('a');
        this._element.classList.add('monaco-button');
        this._element.tabIndex = 0;
        this._element.setAttribute('role', 'button');
        this._element.classList.toggle('secondary', !!options.secondary);
        const background = options.secondary
            ? options.buttonSecondaryBackground
            : options.buttonBackground;
        const foreground = options.secondary
            ? options.buttonSecondaryForeground
            : options.buttonForeground;
        this._element.style.color = foreground || '';
        this._element.style.backgroundColor = background || '';
        if (options.supportShortLabel) {
            this._labelShortElement = document.createElement('div');
            this._labelShortElement.classList.add('monaco-button-label-short');
            this._element.appendChild(this._labelShortElement);
            this._labelElement = document.createElement('div');
            this._labelElement.classList.add('monaco-button-label');
            this._element.appendChild(this._labelElement);
            this._element.classList.add('monaco-text-button-with-short-label');
        }
        if (typeof options.title === 'string') {
            this.setTitle(options.title);
        }
        if (typeof options.ariaLabel === 'string') {
            this._element.setAttribute('aria-label', options.ariaLabel);
        }
        container.appendChild(this._element);
        this._register(Gesture.addTarget(this._element));
        [EventType.CLICK, TouchEventType.Tap].forEach((eventType) => {
            this._register(addDisposableListener(this._element, eventType, (e) => {
                if (!this.enabled) {
                    EventHelper.stop(e);
                    return;
                }
                this._onDidClick.fire(e);
            }));
        });
        this._register(addDisposableListener(this._element, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = false;
            if (this.enabled && (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */))) {
                this._onDidClick.fire(e);
                eventHandled = true;
            }
            else if (event.equals(9 /* KeyCode.Escape */)) {
                this._onDidEscape.fire(e);
                this._element.blur();
                eventHandled = true;
            }
            if (eventHandled) {
                EventHelper.stop(event, true);
            }
        }));
        this._register(addDisposableListener(this._element, EventType.MOUSE_OVER, (e) => {
            if (!this._element.classList.contains('disabled')) {
                this.updateBackground(true);
            }
        }));
        this._register(addDisposableListener(this._element, EventType.MOUSE_OUT, (e) => {
            this.updateBackground(false); // restore standard styles
        }));
        // Also set hover background when button is focused for feedback
        this.focusTracker = this._register(trackFocus(this._element));
        this._register(this.focusTracker.onDidFocus(() => {
            if (this.enabled) {
                this.updateBackground(true);
            }
        }));
        this._register(this.focusTracker.onDidBlur(() => {
            if (this.enabled) {
                this.updateBackground(false);
            }
        }));
    }
    dispose() {
        super.dispose();
        this._element.remove();
    }
    getContentElements(content) {
        const elements = [];
        for (let segment of renderLabelWithIcons(content)) {
            if (typeof segment === 'string') {
                segment = segment.trim();
                // Ignore empty segment
                if (segment === '') {
                    continue;
                }
                // Convert string segments to <span> nodes
                const node = document.createElement('span');
                node.textContent = segment;
                elements.push(node);
            }
            else {
                elements.push(segment);
            }
        }
        return elements;
    }
    updateBackground(hover) {
        let background;
        if (this.options.secondary) {
            background = hover
                ? this.options.buttonSecondaryHoverBackground
                : this.options.buttonSecondaryBackground;
        }
        else {
            background = hover ? this.options.buttonHoverBackground : this.options.buttonBackground;
        }
        if (background) {
            this._element.style.backgroundColor = background;
        }
    }
    get element() {
        return this._element;
    }
    set label(value) {
        if (this._label === value) {
            return;
        }
        if (isMarkdownString(this._label) &&
            isMarkdownString(value) &&
            markdownStringEqual(this._label, value)) {
            return;
        }
        this._element.classList.add('monaco-text-button');
        const labelElement = this.options.supportShortLabel ? this._labelElement : this._element;
        if (isMarkdownString(value)) {
            const rendered = renderMarkdown(value, { inline: true });
            rendered.dispose();
            // Don't include outer `<p>`
            const root = rendered.element.querySelector('p')?.innerHTML;
            if (root) {
                // Only allow a very limited set of inline html tags
                const sanitized = dompurify.sanitize(root, {
                    ADD_TAGS: ['b', 'i', 'u', 'code', 'span'],
                    ALLOWED_ATTR: ['class'],
                    RETURN_TRUSTED_TYPE: true,
                });
                labelElement.innerHTML = sanitized;
            }
            else {
                reset(labelElement);
            }
        }
        else {
            if (this.options.supportIcons) {
                reset(labelElement, ...this.getContentElements(value));
            }
            else {
                labelElement.textContent = value;
            }
        }
        let title = '';
        if (typeof this.options.title === 'string') {
            title = this.options.title;
        }
        else if (this.options.title) {
            title = renderStringAsPlaintext(value);
        }
        this.setTitle(title);
        this._setAriaLabel();
        this._label = value;
    }
    get label() {
        return this._label;
    }
    set labelShort(value) {
        if (!this.options.supportShortLabel || !this._labelShortElement) {
            return;
        }
        if (this.options.supportIcons) {
            reset(this._labelShortElement, ...this.getContentElements(value));
        }
        else {
            this._labelShortElement.textContent = value;
        }
    }
    _setAriaLabel() {
        if (typeof this.options.ariaLabel === 'string') {
            this._element.setAttribute('aria-label', this.options.ariaLabel);
        }
        else if (typeof this.options.title === 'string') {
            this._element.setAttribute('aria-label', this.options.title);
        }
    }
    set icon(icon) {
        this._setAriaLabel();
        const oldIcons = Array.from(this._element.classList).filter((item) => item.startsWith('codicon-'));
        this._element.classList.remove(...oldIcons);
        this._element.classList.add(...ThemeIcon.asClassNameArray(icon));
    }
    set enabled(value) {
        if (value) {
            this._element.classList.remove('disabled');
            this._element.setAttribute('aria-disabled', String(false));
            this._element.tabIndex = 0;
        }
        else {
            this._element.classList.add('disabled');
            this._element.setAttribute('aria-disabled', String(true));
        }
    }
    get enabled() {
        return !this._element.classList.contains('disabled');
    }
    set checked(value) {
        if (value) {
            this._element.classList.add('checked');
            this._element.setAttribute('aria-checked', 'true');
        }
        else {
            this._element.classList.remove('checked');
            this._element.setAttribute('aria-checked', 'false');
        }
    }
    get checked() {
        return this._element.classList.contains('checked');
    }
    setTitle(title) {
        if (!this._hover && title !== '') {
            this._hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('element'), this._element, title));
        }
        else if (this._hover) {
            this._hover.update(title);
        }
    }
    focus() {
        this._element.focus();
    }
    hasFocus() {
        return isActiveElement(this._element);
    }
}
export class ButtonWithDropdown extends Disposable {
    constructor(container, options) {
        super();
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.element = document.createElement('div');
        this.element.classList.add('monaco-button-dropdown');
        container.appendChild(this.element);
        if (!options.hoverDelegate) {
            options = { ...options, hoverDelegate: this._register(createInstantHoverDelegate()) };
        }
        this.primaryButton = this._register(new Button(this.element, options));
        this._register(this.primaryButton.onDidClick((e) => this._onDidClick.fire(e)));
        this.action = this._register(new Action('primaryAction', renderStringAsPlaintext(this.primaryButton.label), undefined, true, async () => this._onDidClick.fire(undefined)));
        this.separatorContainer = document.createElement('div');
        this.separatorContainer.classList.add('monaco-button-dropdown-separator');
        this.separator = document.createElement('div');
        this.separatorContainer.appendChild(this.separator);
        this.element.appendChild(this.separatorContainer);
        // Separator styles
        const border = options.buttonBorder;
        if (border) {
            this.separatorContainer.style.borderTop = '1px solid ' + border;
            this.separatorContainer.style.borderBottom = '1px solid ' + border;
        }
        const buttonBackground = options.secondary
            ? options.buttonSecondaryBackground
            : options.buttonBackground;
        this.separatorContainer.style.backgroundColor = buttonBackground ?? '';
        this.separator.style.backgroundColor = options.buttonSeparator ?? '';
        this.dropdownButton = this._register(new Button(this.element, {
            ...options,
            title: localize('button dropdown more actions', 'More Actions...'),
            supportIcons: true,
        }));
        this.dropdownButton.element.setAttribute('aria-haspopup', 'true');
        this.dropdownButton.element.setAttribute('aria-expanded', 'false');
        this.dropdownButton.element.classList.add('monaco-dropdown-button');
        this.dropdownButton.icon = Codicon.dropDownButton;
        this._register(this.dropdownButton.onDidClick((e) => {
            const actions = Array.isArray(options.actions)
                ? options.actions
                : options.actions.getActions();
            options.contextMenuProvider.showContextMenu({
                getAnchor: () => this.dropdownButton.element,
                getActions: () => options.addPrimaryActionToDropdown === false ? [...actions] : [this.action, ...actions],
                actionRunner: options.actionRunner,
                onHide: () => this.dropdownButton.element.setAttribute('aria-expanded', 'false'),
                layer: options.dropdownLayer,
            });
            this.dropdownButton.element.setAttribute('aria-expanded', 'true');
        }));
    }
    dispose() {
        super.dispose();
        this.element.remove();
    }
    set label(value) {
        this.primaryButton.label = value;
        this.action.label = value;
    }
    set icon(icon) {
        this.primaryButton.icon = icon;
    }
    set enabled(enabled) {
        this.primaryButton.enabled = enabled;
        this.dropdownButton.enabled = enabled;
        this.element.classList.toggle('disabled', !enabled);
    }
    get enabled() {
        return this.primaryButton.enabled;
    }
    set checked(value) {
        this.primaryButton.checked = value;
    }
    get checked() {
        return this.primaryButton.checked;
    }
    focus() {
        this.primaryButton.focus();
    }
    hasFocus() {
        return this.primaryButton.hasFocus() || this.dropdownButton.hasFocus();
    }
}
export class ButtonWithDescription {
    constructor(container, options) {
        this.options = options;
        this._element = document.createElement('div');
        this._element.classList.add('monaco-description-button');
        this._button = new Button(this._element, options);
        this._descriptionElement = document.createElement('div');
        this._descriptionElement.classList.add('monaco-button-description');
        this._element.appendChild(this._descriptionElement);
        container.appendChild(this._element);
    }
    get onDidClick() {
        return this._button.onDidClick;
    }
    get element() {
        return this._element;
    }
    set label(value) {
        this._button.label = value;
    }
    set icon(icon) {
        this._button.icon = icon;
    }
    get enabled() {
        return this._button.enabled;
    }
    set enabled(enabled) {
        this._button.enabled = enabled;
    }
    set checked(value) {
        this._button.checked = value;
    }
    get checked() {
        return this._button.checked;
    }
    focus() {
        this._button.focus();
    }
    hasFocus() {
        return this._button.hasFocus();
    }
    dispose() {
        this._button.dispose();
    }
    set description(value) {
        if (this.options.supportIcons) {
            reset(this._descriptionElement, ...renderLabelWithIcons(value));
        }
        else {
            this._descriptionElement.textContent = value;
        }
    }
}
export class ButtonBar {
    constructor(container) {
        this.container = container;
        this._buttons = [];
        this._buttonStore = new DisposableStore();
    }
    dispose() {
        this._buttonStore.dispose();
    }
    get buttons() {
        return this._buttons;
    }
    clear() {
        this._buttonStore.clear();
        this._buttons.length = 0;
    }
    addButton(options) {
        const button = this._buttonStore.add(new Button(this.container, options));
        this.pushButton(button);
        return button;
    }
    addButtonWithDescription(options) {
        const button = this._buttonStore.add(new ButtonWithDescription(this.container, options));
        this.pushButton(button);
        return button;
    }
    addButtonWithDropdown(options) {
        const button = this._buttonStore.add(new ButtonWithDropdown(this.container, options));
        this.pushButton(button);
        return button;
    }
    pushButton(button) {
        this._buttons.push(button);
        const index = this._buttons.length - 1;
        this._buttonStore.add(addDisposableListener(button.element, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            // Next / Previous Button
            let buttonIndexToFocus;
            if (event.equals(15 /* KeyCode.LeftArrow */)) {
                buttonIndexToFocus = index > 0 ? index - 1 : this._buttons.length - 1;
            }
            else if (event.equals(17 /* KeyCode.RightArrow */)) {
                buttonIndexToFocus = index === this._buttons.length - 1 ? 0 : index + 1;
            }
            else {
                eventHandled = false;
            }
            if (eventHandled && typeof buttonIndexToFocus === 'number') {
                this._buttons[buttonIndexToFocus].focus();
                EventHelper.stop(e, true);
            }
        }));
    }
}
/**
 * This is a Button that supports an icon to the left, and markdown to the right, with proper separation and wrapping the markdown label, which Button doesn't do.
 */
export class ButtonWithIcon extends Button {
    constructor(container, options) {
        super(container, options);
        if (options.supportShortLabel) {
            throw new Error('ButtonWithIcon does not support short labels');
        }
        this._element.classList.add('monaco-icon-button');
        this._iconElement = $('');
        this._mdlabelElement = $('.monaco-button-mdlabel');
        this._element.append(this._iconElement, this._mdlabelElement);
    }
    set label(value) {
        if (this._label === value) {
            return;
        }
        if (isMarkdownString(this._label) &&
            isMarkdownString(value) &&
            markdownStringEqual(this._label, value)) {
            return;
        }
        this._element.classList.add('monaco-text-button');
        if (isMarkdownString(value)) {
            const rendered = renderMarkdown(value, { inline: true });
            rendered.dispose();
            const root = rendered.element.querySelector('p')?.innerHTML;
            if (root) {
                // Only allow a very limited set of inline html tags
                const sanitized = dompurify.sanitize(root, {
                    ADD_TAGS: ['b', 'i', 'u', 'code', 'span'],
                    ALLOWED_ATTR: ['class'],
                    RETURN_TRUSTED_TYPE: true,
                });
                this._mdlabelElement.innerHTML = sanitized;
            }
            else {
                reset(this._mdlabelElement);
            }
        }
        else {
            if (this.options.supportIcons) {
                reset(this._mdlabelElement, ...this.getContentElements(value));
            }
            else {
                this._mdlabelElement.textContent = value;
            }
        }
        let title = '';
        if (typeof this.options.title === 'string') {
            title = this.options.title;
        }
        else if (this.options.title) {
            title = renderStringAsPlaintext(value);
        }
        this.setTitle(title);
        this._setAriaLabel();
        this._label = value;
    }
    set icon(icon) {
        this._iconElement.classList.value = '';
        this._iconElement.classList.add(...ThemeIcon.asClassNameArray(icon));
        this._setAriaLabel();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2J1dHRvbi9idXR0b24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixXQUFXLEVBQ1gsU0FBUyxFQUVULGVBQWUsRUFDZixLQUFLLEVBQ0wsVUFBVSxFQUNWLENBQUMsR0FDRCxNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLFNBQVMsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDckUsT0FBTyxFQUNOLDBCQUEwQixFQUMxQix1QkFBdUIsR0FDdkIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUEwQixNQUFNLDRCQUE0QixDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEQsT0FBTyxFQUFzQixPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sZ0JBQWdCLEVBQ2hCLG1CQUFtQixHQUNuQixNQUFNLGdDQUFnQyxDQUFBO0FBRXZDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sOEJBQThCLENBQUE7QUFDdkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hELE9BQU8sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQTBCdEUsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQWtCO0lBQ2xELGdCQUFnQixFQUFFLFNBQVM7SUFDM0IscUJBQXFCLEVBQUUsU0FBUztJQUNoQyxlQUFlLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7SUFDdkMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7SUFDeEMsWUFBWSxFQUFFLFNBQVM7SUFDdkIseUJBQXlCLEVBQUUsU0FBUztJQUNwQyx5QkFBeUIsRUFBRSxTQUFTO0lBQ3BDLDhCQUE4QixFQUFFLFNBQVM7Q0FDekMsQ0FBQTtBQW1CRCxNQUFNLE9BQU8sTUFBTyxTQUFRLFVBQVU7SUFTckMsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtJQUM5QixDQUFDO0lBR0QsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQUMvQixDQUFDO0lBSUQsWUFBWSxTQUFzQixFQUFFLE9BQXVCO1FBQzFELEtBQUssRUFBRSxDQUFBO1FBbEJFLFdBQU0sR0FBNkIsRUFBRSxDQUFBO1FBS3ZDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUE7UUFLbEQsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFTLENBQUMsQ0FBQTtRQVUxRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUV0QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTO1lBQ25DLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCO1lBQ25DLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUE7UUFDM0IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFNBQVM7WUFDbkMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUI7WUFDbkMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUUzQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsVUFBVSxJQUFJLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsVUFBVSxJQUFJLEVBQUUsQ0FBQTtRQUV0RCxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7WUFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFFbEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2xELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ3ZELElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUU3QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBRUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELElBQUksT0FBTyxPQUFPLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUNELFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXBDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FFL0M7UUFBQSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQzVELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbkIsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDbkIsT0FBTTtnQkFDUCxDQUFDO2dCQUVELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMxQyxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUE7WUFDeEIsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sdUJBQWUsSUFBSSxLQUFLLENBQUMsTUFBTSx3QkFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDbEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hCLFlBQVksR0FBRyxJQUFJLENBQUE7WUFDcEIsQ0FBQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLHdCQUFnQixFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUNwQixZQUFZLEdBQUcsSUFBSSxDQUFBO1lBQ3BCLENBQUM7WUFFRCxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQy9ELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLDBCQUEwQjtRQUN4RCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsZ0VBQWdFO1FBQ2hFLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDakMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRWUsT0FBTztRQUN0QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFUyxrQkFBa0IsQ0FBQyxPQUFlO1FBQzNDLE1BQU0sUUFBUSxHQUFzQixFQUFFLENBQUE7UUFDdEMsS0FBSyxJQUFJLE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ25ELElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBRXhCLHVCQUF1QjtnQkFDdkIsSUFBSSxPQUFPLEtBQUssRUFBRSxFQUFFLENBQUM7b0JBQ3BCLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCwwQ0FBMEM7Z0JBQzFDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzNDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFBO2dCQUMxQixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3BCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLEtBQWM7UUFDdEMsSUFBSSxVQUFVLENBQUE7UUFDZCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDNUIsVUFBVSxHQUFHLEtBQUs7Z0JBQ2pCLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDhCQUE4QjtnQkFDN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUE7UUFDMUMsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFBO1FBQ3hGLENBQUM7UUFDRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxVQUFVLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQStCO1FBQ3hDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMzQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQ0MsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUM3QixnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7WUFDdkIsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFDdEMsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDakQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUV6RixJQUFJLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0IsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3hELFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUVsQiw0QkFBNEI7WUFDNUIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFBO1lBQzNELElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1Ysb0RBQW9EO2dCQUNwRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtvQkFDMUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztvQkFDekMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDO29CQUN2QixtQkFBbUIsRUFBRSxJQUFJO2lCQUN6QixDQUFDLENBQUE7Z0JBQ0YsWUFBWSxDQUFDLFNBQVMsR0FBRyxTQUE4QixDQUFBO1lBQ3hELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUMvQixLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDdkQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1lBQ2pDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFBO1FBQ3RCLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDM0IsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixLQUFLLEdBQUcsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFcEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBRXBCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksVUFBVSxDQUFDLEtBQWE7UUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUNqRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDbEUsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVTLGFBQWE7UUFDdEIsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pFLENBQUM7YUFBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0QsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLElBQUksQ0FBQyxJQUFlO1FBQ3ZCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUVwQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDcEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FDM0IsQ0FBQTtRQUNELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFjO1FBQ3pCLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQzFELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN2QyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDMUQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFjO1FBQ3pCLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ25ELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3pDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYTtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzQix5QkFBeUIsRUFBRSxDQUFDLGlCQUFpQixDQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsRUFDaEUsSUFBSSxDQUFDLFFBQVEsRUFDYixLQUFLLENBQ0wsQ0FDRCxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDdEMsQ0FBQztDQUNEO0FBYUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFXakQsWUFBWSxTQUFzQixFQUFFLE9BQW1DO1FBQ3RFLEtBQUssRUFBRSxDQUFBO1FBSlMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFxQixDQUFDLENBQUE7UUFDdEUsZUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBO1FBSzNDLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNwRCxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVuQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzVCLE9BQU8sR0FBRyxFQUFFLEdBQUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLENBQUMsRUFBRSxDQUFBO1FBQ3RGLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzNCLElBQUksTUFBTSxDQUNULGVBQWUsRUFDZix1QkFBdUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUNqRCxTQUFTLEVBQ1QsSUFBSSxFQUNKLEtBQUssSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQzVDLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUE7UUFFekUsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRWpELG1CQUFtQjtRQUNuQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBQ25DLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFBO1lBQy9ELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLFlBQVksR0FBRyxNQUFNLENBQUE7UUFDbkUsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFNBQVM7WUFDekMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUI7WUFDbkMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxnQkFBZ0IsSUFBSSxFQUFFLENBQUE7UUFDdEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFBO1FBRXBFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN4QixHQUFHLE9BQU87WUFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGlCQUFpQixDQUFDO1lBQ2xFLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2xFLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFBO1FBQ2pELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQzdDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTztnQkFDakIsQ0FBQyxDQUFFLE9BQU8sQ0FBQyxPQUEyQixDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ3BELE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7Z0JBQzNDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU87Z0JBQzVDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FDaEIsT0FBTyxDQUFDLDBCQUEwQixLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUM7Z0JBQ3hGLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtnQkFDbEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDO2dCQUNoRixLQUFLLEVBQUUsT0FBTyxDQUFDLGFBQWE7YUFDNUIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsRSxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxLQUFhO1FBQ3RCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUksSUFBSSxDQUFDLElBQWU7UUFDdkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFnQjtRQUMzQixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFDcEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBRXJDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsS0FBYztRQUN6QixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7SUFDbEMsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdkUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHFCQUFxQjtJQUtqQyxZQUNDLFNBQXNCLEVBQ0wsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFFeEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQ3hELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVqRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBRW5ELFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQWE7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLElBQUksQ0FBQyxJQUFlO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsT0FBZ0I7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFjO1FBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtJQUM3QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQTtJQUM1QixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUNELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUNELE9BQU87UUFDTixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxJQUFJLFdBQVcsQ0FBQyxLQUFhO1FBQzVCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoRSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQzdDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUlyQixZQUE2QixTQUFzQjtRQUF0QixjQUFTLEdBQVQsU0FBUyxDQUFhO1FBSGxDLGFBQVEsR0FBYyxFQUFFLENBQUE7UUFDeEIsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRUMsQ0FBQztJQUV2RCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELFNBQVMsQ0FBQyxPQUF1QjtRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2QixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxPQUF1QjtRQUMvQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN4RixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZCLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELHFCQUFxQixDQUFDLE9BQW1DO1FBQ3hELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkIsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQWU7UUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixxQkFBcUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMvRCxNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFDLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQTtZQUV2Qix5QkFBeUI7WUFDekIsSUFBSSxrQkFBc0MsQ0FBQTtZQUMxQyxJQUFJLEtBQUssQ0FBQyxNQUFNLDRCQUFtQixFQUFFLENBQUM7Z0JBQ3JDLGtCQUFrQixHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUN0RSxDQUFDO2lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sNkJBQW9CLEVBQUUsQ0FBQztnQkFDN0Msa0JBQWtCLEdBQUcsS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ3hFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLEdBQUcsS0FBSyxDQUFBO1lBQ3JCLENBQUM7WUFFRCxJQUFJLFlBQVksSUFBSSxPQUFPLGtCQUFrQixLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM1RCxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3pDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLE1BQU07SUFJekMsWUFBWSxTQUFzQixFQUFFLE9BQXVCO1FBQzFELEtBQUssQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFekIsSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVELElBQWEsS0FBSyxDQUFDLEtBQStCO1FBQ2pELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMzQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQ0MsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUM3QixnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7WUFDdkIsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFDdEMsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDakQsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUN4RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7WUFFbEIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFBO1lBQzNELElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1Ysb0RBQW9EO2dCQUNwRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtvQkFDMUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztvQkFDekMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDO29CQUN2QixtQkFBbUIsRUFBRSxJQUFJO2lCQUN6QixDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEdBQUcsU0FBOEIsQ0FBQTtZQUNoRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQy9CLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDL0QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtZQUN6QyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksS0FBSyxHQUFXLEVBQUUsQ0FBQTtRQUN0QixJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDNUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO1FBQzNCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDL0IsS0FBSyxHQUFHLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtJQUNwQixDQUFDO0lBRUQsSUFBYSxJQUFJLENBQUMsSUFBZTtRQUNoQyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0NBQ0QifQ==