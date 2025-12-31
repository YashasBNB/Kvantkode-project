/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './iconSelectBox.css';
import * as dom from '../../dom.js';
import { alert } from '../aria/aria.js';
import { InputBox } from '../inputbox/inputBox.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { Emitter } from '../../../common/event.js';
import { DisposableStore, Disposable, MutableDisposable, } from '../../../common/lifecycle.js';
import { ThemeIcon } from '../../../common/themables.js';
import { localize } from '../../../../nls.js';
import { HighlightedLabel } from '../highlightedlabel/highlightedLabel.js';
export class IconSelectBox extends Disposable {
    static { this.InstanceCount = 0; }
    constructor(options) {
        super();
        this.options = options;
        this.domId = `icon_select_box_id_${++IconSelectBox.InstanceCount}`;
        this._onDidSelect = this._register(new Emitter());
        this.onDidSelect = this._onDidSelect.event;
        this.renderedIcons = [];
        this.focusedItemIndex = 0;
        this.numberOfElementsPerRow = 1;
        this.iconContainerWidth = 36;
        this.iconContainerHeight = 36;
        this.domNode = dom.$('.icon-select-box');
        this._register(this.create());
    }
    create() {
        const disposables = new DisposableStore();
        const iconSelectBoxContainer = dom.append(this.domNode, dom.$('.icon-select-box-container'));
        iconSelectBoxContainer.style.margin = '10px 15px';
        const iconSelectInputContainer = dom.append(iconSelectBoxContainer, dom.$('.icon-select-input-container'));
        iconSelectInputContainer.style.paddingBottom = '10px';
        this.inputBox = disposables.add(new InputBox(iconSelectInputContainer, undefined, {
            placeholder: localize('iconSelect.placeholder', 'Search icons'),
            inputBoxStyles: this.options.inputBoxStyles,
        }));
        const iconsContainer = (this.iconsContainer = dom.$('.icon-select-icons-container', {
            id: `${this.domId}_icons`,
        }));
        iconsContainer.role = 'listbox';
        iconsContainer.tabIndex = 0;
        this.scrollableElement = disposables.add(new DomScrollableElement(iconsContainer, {
            useShadows: false,
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
        }));
        dom.append(iconSelectBoxContainer, this.scrollableElement.getDomNode());
        if (this.options.showIconInfo) {
            this.iconIdElement = this._register(new HighlightedLabel(dom.append(dom.append(iconSelectBoxContainer, dom.$('.icon-select-id-container')), dom.$('.icon-select-id-label'))));
        }
        const iconsDisposables = disposables.add(new MutableDisposable());
        iconsDisposables.value = this.renderIcons(this.options.icons, [], iconsContainer);
        this.scrollableElement.scanDomNode();
        disposables.add(this.inputBox.onDidChange((value) => {
            const icons = [], matches = [];
            for (const icon of this.options.icons) {
                const match = this.matchesContiguous(value, icon.id);
                if (match) {
                    icons.push(icon);
                    matches.push(match);
                }
            }
            if (icons.length) {
                iconsDisposables.value = this.renderIcons(icons, matches, iconsContainer);
                this.scrollableElement?.scanDomNode();
            }
        }));
        this.inputBox.inputElement.role = 'combobox';
        this.inputBox.inputElement.ariaHasPopup = 'menu';
        this.inputBox.inputElement.ariaAutoComplete = 'list';
        this.inputBox.inputElement.ariaExpanded = 'true';
        this.inputBox.inputElement.setAttribute('aria-controls', iconsContainer.id);
        return disposables;
    }
    renderIcons(icons, matches, container) {
        const disposables = new DisposableStore();
        dom.clearNode(container);
        const focusedIcon = this.renderedIcons[this.focusedItemIndex]?.icon;
        let focusedIconIndex = 0;
        const renderedIcons = [];
        if (icons.length) {
            for (let index = 0; index < icons.length; index++) {
                const icon = icons[index];
                const iconContainer = dom.append(container, dom.$('.icon-container', { id: `${this.domId}_icons_${index}` }));
                iconContainer.style.width = `${this.iconContainerWidth}px`;
                iconContainer.style.height = `${this.iconContainerHeight}px`;
                iconContainer.title = icon.id;
                iconContainer.role = 'button';
                iconContainer.setAttribute('aria-setsize', `${icons.length}`);
                iconContainer.setAttribute('aria-posinset', `${index + 1}`);
                dom.append(iconContainer, dom.$(ThemeIcon.asCSSSelector(icon)));
                renderedIcons.push({ icon, element: iconContainer, highlightMatches: matches[index] });
                disposables.add(dom.addDisposableListener(iconContainer, dom.EventType.CLICK, (e) => {
                    e.stopPropagation();
                    this.setSelection(index);
                }));
                if (icon === focusedIcon) {
                    focusedIconIndex = index;
                }
            }
        }
        else {
            const noResults = localize('iconSelect.noResults', 'No results');
            dom.append(container, dom.$('.icon-no-results', undefined, noResults));
            alert(noResults);
        }
        this.renderedIcons.splice(0, this.renderedIcons.length, ...renderedIcons);
        this.focusIcon(focusedIconIndex);
        return disposables;
    }
    focusIcon(index) {
        const existing = this.renderedIcons[this.focusedItemIndex];
        if (existing) {
            existing.element.classList.remove('focused');
        }
        this.focusedItemIndex = index;
        const renderedItem = this.renderedIcons[index];
        if (renderedItem) {
            renderedItem.element.classList.add('focused');
        }
        if (this.inputBox) {
            if (renderedItem) {
                this.inputBox.inputElement.setAttribute('aria-activedescendant', renderedItem.element.id);
            }
            else {
                this.inputBox.inputElement.removeAttribute('aria-activedescendant');
            }
        }
        if (this.iconIdElement) {
            if (renderedItem) {
                this.iconIdElement.set(renderedItem.icon.id, renderedItem.highlightMatches);
            }
            else {
                this.iconIdElement.set('');
            }
        }
        this.reveal(index);
    }
    reveal(index) {
        if (!this.scrollableElement) {
            return;
        }
        if (index < 0 || index >= this.renderedIcons.length) {
            return;
        }
        const element = this.renderedIcons[index].element;
        if (!element) {
            return;
        }
        const { height } = this.scrollableElement.getScrollDimensions();
        const { scrollTop } = this.scrollableElement.getScrollPosition();
        if (element.offsetTop + this.iconContainerHeight > scrollTop + height) {
            this.scrollableElement.setScrollPosition({
                scrollTop: element.offsetTop + this.iconContainerHeight - height,
            });
        }
        else if (element.offsetTop < scrollTop) {
            this.scrollableElement.setScrollPosition({ scrollTop: element.offsetTop });
        }
    }
    matchesContiguous(word, wordToMatchAgainst) {
        const matchIndex = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
        if (matchIndex !== -1) {
            return [{ start: matchIndex, end: matchIndex + word.length }];
        }
        return null;
    }
    layout(dimension) {
        this.domNode.style.width = `${dimension.width}px`;
        this.domNode.style.height = `${dimension.height}px`;
        const iconsContainerWidth = dimension.width - 30;
        this.numberOfElementsPerRow = Math.floor(iconsContainerWidth / this.iconContainerWidth);
        if (this.numberOfElementsPerRow === 0) {
            throw new Error('Insufficient width');
        }
        const extraSpace = iconsContainerWidth % this.iconContainerWidth;
        const iconElementMargin = Math.floor(extraSpace / this.numberOfElementsPerRow);
        for (const { element } of this.renderedIcons) {
            element.style.marginRight = `${iconElementMargin}px`;
        }
        const containerPadding = extraSpace % this.numberOfElementsPerRow;
        if (this.iconsContainer) {
            this.iconsContainer.style.paddingLeft = `${Math.floor(containerPadding / 2)}px`;
            this.iconsContainer.style.paddingRight = `${Math.ceil(containerPadding / 2)}px`;
        }
        if (this.scrollableElement) {
            this.scrollableElement.getDomNode().style.height = `${this.iconIdElement ? dimension.height - 80 : dimension.height - 40}px`;
            this.scrollableElement.scanDomNode();
        }
    }
    getFocus() {
        return [this.focusedItemIndex];
    }
    setSelection(index) {
        if (index < 0 || index >= this.renderedIcons.length) {
            throw new Error(`Invalid index ${index}`);
        }
        this.focusIcon(index);
        this._onDidSelect.fire(this.renderedIcons[index].icon);
    }
    clearInput() {
        if (this.inputBox) {
            this.inputBox.value = '';
        }
    }
    focus() {
        this.inputBox?.focus();
        this.focusIcon(0);
    }
    focusNext() {
        this.focusIcon((this.focusedItemIndex + 1) % this.renderedIcons.length);
    }
    focusPrevious() {
        this.focusIcon((this.focusedItemIndex - 1 + this.renderedIcons.length) % this.renderedIcons.length);
    }
    focusNextRow() {
        let nextRowIndex = this.focusedItemIndex + this.numberOfElementsPerRow;
        if (nextRowIndex >= this.renderedIcons.length) {
            nextRowIndex = (nextRowIndex + 1) % this.numberOfElementsPerRow;
            nextRowIndex = nextRowIndex >= this.renderedIcons.length ? 0 : nextRowIndex;
        }
        this.focusIcon(nextRowIndex);
    }
    focusPreviousRow() {
        let previousRowIndex = this.focusedItemIndex - this.numberOfElementsPerRow;
        if (previousRowIndex < 0) {
            const numberOfRows = Math.floor(this.renderedIcons.length / this.numberOfElementsPerRow);
            previousRowIndex = this.focusedItemIndex + this.numberOfElementsPerRow * numberOfRows - 1;
            previousRowIndex =
                previousRowIndex < 0
                    ? this.renderedIcons.length - 1
                    : previousRowIndex >= this.renderedIcons.length
                        ? previousRowIndex - this.numberOfElementsPerRow
                        : previousRowIndex;
        }
        this.focusIcon(previousRowIndex);
    }
    getFocusedIcon() {
        return this.renderedIcons[this.focusedItemIndex].icon;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblNlbGVjdEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9pY29ucy9pY29uU2VsZWN0Qm94LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3ZDLE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xELE9BQU8sRUFFTixlQUFlLEVBQ2YsVUFBVSxFQUNWLGlCQUFpQixHQUNqQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFjMUUsTUFBTSxPQUFPLGFBQWMsU0FBUSxVQUFVO2FBQzdCLGtCQUFhLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFvQmhDLFlBQTZCLE9BQThCO1FBQzFELEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQXVCO1FBbkJsRCxVQUFLLEdBQUcsc0JBQXNCLEVBQUUsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBSTlELGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYSxDQUFDLENBQUE7UUFDdEQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFB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