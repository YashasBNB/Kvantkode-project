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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblNlbGVjdEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2ljb25zL2ljb25TZWxlY3RCb3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDdkMsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEQsT0FBTyxFQUVOLGVBQWUsRUFDZixVQUFVLEVBQ1YsaUJBQWlCLEdBQ2pCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUc3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQWMxRSxNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7YUFDN0Isa0JBQWEsR0FBRyxDQUFDLEFBQUosQ0FBSTtJQW9CaEMsWUFBNkIsT0FBOEI7UUFDMUQsS0FBSyxFQUFFLENBQUE7UUFEcUIsWUFBTyxHQUFQLE9BQU8sQ0FBdUI7UUFuQmxELFVBQUssR0FBRyxzQkFBc0IsRUFBRSxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUE7UUFJOUQsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFhLENBQUMsQ0FBQTtRQUN0RCxn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