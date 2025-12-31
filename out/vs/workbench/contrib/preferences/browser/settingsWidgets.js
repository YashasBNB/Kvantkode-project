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
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as DOM from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { Toggle, unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isDefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { defaultButtonStyles, getInputBoxStyle, getSelectBoxStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { settingsSelectBackground, settingsSelectBorder, settingsSelectForeground, settingsSelectListBorder, settingsTextInputBackground, settingsTextInputBorder, settingsTextInputForeground, } from '../common/settingsEditorColorRegistry.js';
import './media/settingsWidgets.css';
import { settingsDiscardIcon, settingsEditIcon, settingsRemoveIcon } from './preferencesIcons.js';
const $ = DOM.$;
export class ListSettingListModel {
    get items() {
        const items = this._dataItems.map((item, i) => {
            const editing = typeof this._editKey === 'number' && this._editKey === i;
            return {
                ...item,
                editing,
                selected: i === this._selectedIdx || editing,
            };
        });
        if (this._editKey === 'create') {
            items.push({
                editing: true,
                selected: true,
                ...this._newDataItem,
            });
        }
        return items;
    }
    constructor(newItem) {
        this._dataItems = [];
        this._editKey = null;
        this._selectedIdx = null;
        this._newDataItem = newItem;
    }
    setEditKey(key) {
        this._editKey = key;
    }
    setValue(listData) {
        this._dataItems = listData;
    }
    select(idx) {
        this._selectedIdx = idx;
    }
    getSelected() {
        return this._selectedIdx;
    }
    selectNext() {
        if (typeof this._selectedIdx === 'number') {
            this._selectedIdx = Math.min(this._selectedIdx + 1, this._dataItems.length - 1);
        }
        else {
            this._selectedIdx = 0;
        }
    }
    selectPrevious() {
        if (typeof this._selectedIdx === 'number') {
            this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
        }
        else {
            this._selectedIdx = 0;
        }
    }
}
let AbstractListSettingWidget = class AbstractListSettingWidget extends Disposable {
    get domNode() {
        return this.listElement;
    }
    get items() {
        return this.model.items;
    }
    get isReadOnly() {
        return false;
    }
    constructor(container, themeService, contextViewService) {
        super();
        this.container = container;
        this.themeService = themeService;
        this.contextViewService = contextViewService;
        this.rowElements = [];
        this._onDidChangeList = this._register(new Emitter());
        this.model = new ListSettingListModel(this.getEmptyItem());
        this.listDisposables = this._register(new DisposableStore());
        this.onDidChangeList = this._onDidChangeList.event;
        this.listElement = DOM.append(container, $('div'));
        this.listElement.setAttribute('role', 'list');
        this.getContainerClasses().forEach((c) => this.listElement.classList.add(c));
        DOM.append(container, this.renderAddButton());
        this.renderList();
        this._register(DOM.addDisposableListener(this.listElement, DOM.EventType.POINTER_DOWN, (e) => this.onListClick(e)));
        this._register(DOM.addDisposableListener(this.listElement, DOM.EventType.DBLCLICK, (e) => this.onListDoubleClick(e)));
        this._register(DOM.addStandardDisposableListener(this.listElement, 'keydown', (e) => {
            if (e.equals(16 /* KeyCode.UpArrow */)) {
                this.selectPreviousRow();
            }
            else if (e.equals(18 /* KeyCode.DownArrow */)) {
                this.selectNextRow();
            }
            else {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
        }));
    }
    setValue(listData) {
        this.model.setValue(listData);
        this.renderList();
    }
    renderHeader() {
        return;
    }
    isAddButtonVisible() {
        return true;
    }
    renderList() {
        const focused = DOM.isAncestorOfActiveElement(this.listElement);
        DOM.clearNode(this.listElement);
        this.listDisposables.clear();
        const newMode = this.model.items.some((item) => !!(item.editing && this.isItemNew(item)));
        this.container.classList.toggle('setting-list-hide-add-button', !this.isAddButtonVisible() || newMode);
        if (this.model.items.length) {
            this.listElement.tabIndex = 0;
        }
        else {
            this.listElement.removeAttribute('tabIndex');
        }
        const header = this.renderHeader();
        if (header) {
            this.listElement.appendChild(header);
        }
        this.rowElements = this.model.items.map((item, i) => this.renderDataOrEditItem(item, i, focused));
        this.rowElements.forEach((rowElement) => this.listElement.appendChild(rowElement));
    }
    createBasicSelectBox(value) {
        const selectBoxOptions = value.options.map(({ value, description }) => ({
            text: value,
            description,
        }));
        const selected = value.options.findIndex((option) => value.data === option.value);
        const styles = getSelectBoxStyles({
            selectBackground: settingsSelectBackground,
            selectForeground: settingsSelectForeground,
            selectBorder: settingsSelectBorder,
            selectListBorder: settingsSelectListBorder,
        });
        const selectBox = new SelectBox(selectBoxOptions, selected, this.contextViewService, styles, {
            useCustomDrawn: !(isIOS && BrowserFeatures.pointerEvents),
        });
        return selectBox;
    }
    editSetting(idx) {
        this.model.setEditKey(idx);
        this.renderList();
    }
    cancelEdit() {
        this.model.setEditKey('none');
        this.renderList();
    }
    handleItemChange(originalItem, changedItem, idx) {
        this.model.setEditKey('none');
        if (this.isItemNew(originalItem)) {
            this._onDidChangeList.fire({
                type: 'add',
                newItem: changedItem,
                targetIndex: idx,
            });
        }
        else {
            this._onDidChangeList.fire({
                type: 'change',
                originalItem,
                newItem: changedItem,
                targetIndex: idx,
            });
        }
        this.renderList();
    }
    renderDataOrEditItem(item, idx, listFocused) {
        const rowElement = item.editing
            ? this.renderEdit(item, idx)
            : this.renderDataItem(item, idx, listFocused);
        rowElement.setAttribute('role', 'listitem');
        return rowElement;
    }
    renderDataItem(item, idx, listFocused) {
        const rowElementGroup = this.renderItem(item, idx);
        const rowElement = rowElementGroup.rowElement;
        rowElement.setAttribute('data-index', idx + '');
        rowElement.setAttribute('tabindex', item.selected ? '0' : '-1');
        rowElement.classList.toggle('selected', item.selected);
        const actionBar = new ActionBar(rowElement);
        this.listDisposables.add(actionBar);
        actionBar.push(this.getActionsForItem(item, idx), { icon: true, label: true });
        this.addTooltipsToRow(rowElementGroup, item);
        if (item.selected && listFocused) {
            disposableTimeout(() => rowElement.focus(), undefined, this.listDisposables);
        }
        this.listDisposables.add(DOM.addDisposableListener(rowElement, 'click', (e) => {
            // There is a parent list widget, which is the one that holds the list of settings.
            // Prevent the parent widget from trying to interpret this click event.
            e.stopPropagation();
        }));
        return rowElement;
    }
    renderAddButton() {
        const rowElement = $('.setting-list-new-row');
        const startAddButton = this._register(new Button(rowElement, defaultButtonStyles));
        startAddButton.label = this.getLocalizedStrings().addButtonLabel;
        startAddButton.element.classList.add('setting-list-addButton');
        this._register(startAddButton.onDidClick(() => {
            this.model.setEditKey('create');
            this.renderList();
        }));
        return rowElement;
    }
    onListClick(e) {
        const targetIdx = this.getClickedItemIndex(e);
        if (targetIdx < 0) {
            return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (this.model.getSelected() === targetIdx) {
            return;
        }
        this.selectRow(targetIdx);
    }
    onListDoubleClick(e) {
        const targetIdx = this.getClickedItemIndex(e);
        if (targetIdx < 0) {
            return;
        }
        if (this.isReadOnly) {
            return;
        }
        const item = this.model.items[targetIdx];
        if (item) {
            this.editSetting(targetIdx);
            e.preventDefault();
            e.stopPropagation();
        }
    }
    getClickedItemIndex(e) {
        if (!e.target) {
            return -1;
        }
        const actionbar = DOM.findParentWithClass(e.target, 'monaco-action-bar');
        if (actionbar) {
            // Don't handle doubleclicks inside the action bar
            return -1;
        }
        const element = DOM.findParentWithClass(e.target, 'setting-list-row');
        if (!element) {
            return -1;
        }
        const targetIdxStr = element.getAttribute('data-index');
        if (!targetIdxStr) {
            return -1;
        }
        const targetIdx = parseInt(targetIdxStr);
        return targetIdx;
    }
    selectRow(idx) {
        this.model.select(idx);
        this.rowElements.forEach((row) => row.classList.remove('selected'));
        const selectedRow = this.rowElements[this.model.getSelected()];
        selectedRow.classList.add('selected');
        selectedRow.focus();
    }
    selectNextRow() {
        this.model.selectNext();
        this.selectRow(this.model.getSelected());
    }
    selectPreviousRow() {
        this.model.selectPrevious();
        this.selectRow(this.model.getSelected());
    }
};
AbstractListSettingWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService)
], AbstractListSettingWidget);
export { AbstractListSettingWidget };
let ListSettingWidget = class ListSettingWidget extends AbstractListSettingWidget {
    setValue(listData, options) {
        this.keyValueSuggester = options?.keySuggester;
        this.showAddButton = options?.showAddButton ?? true;
        super.setValue(listData);
    }
    constructor(container, themeService, contextViewService, hoverService) {
        super(container, themeService, contextViewService);
        this.hoverService = hoverService;
        this.showAddButton = true;
    }
    getEmptyItem() {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            value: {
                type: 'string',
                data: '',
            },
        };
    }
    isAddButtonVisible() {
        return this.showAddButton;
    }
    getContainerClasses() {
        return ['setting-list-widget'];
    }
    getActionsForItem(item, idx) {
        if (this.isReadOnly) {
            return [];
        }
        return [
            {
                class: ThemeIcon.asClassName(settingsEditIcon),
                enabled: true,
                id: 'workbench.action.editListItem',
                tooltip: this.getLocalizedStrings().editActionTooltip,
                run: () => this.editSetting(idx),
            },
            {
                class: ThemeIcon.asClassName(settingsRemoveIcon),
                enabled: true,
                id: 'workbench.action.removeListItem',
                tooltip: this.getLocalizedStrings().deleteActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'remove', originalItem: item, targetIndex: idx }),
            },
        ];
    }
    renderItem(item, idx) {
        const rowElement = $('.setting-list-row');
        const valueElement = DOM.append(rowElement, $('.setting-list-value'));
        const siblingElement = DOM.append(rowElement, $('.setting-list-sibling'));
        valueElement.textContent = item.value.data.toString();
        siblingElement.textContent = item.sibling ? `when: ${item.sibling}` : null;
        this.addDragAndDrop(rowElement, item, idx);
        return { rowElement, keyElement: valueElement, valueElement: siblingElement };
    }
    addDragAndDrop(rowElement, item, idx) {
        if (this.model.items.every((item) => !item.editing)) {
            rowElement.draggable = true;
            rowElement.classList.add('draggable');
        }
        else {
            rowElement.draggable = false;
            rowElement.classList.remove('draggable');
        }
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_START, (ev) => {
            this.dragDetails = {
                element: rowElement,
                item,
                itemIndex: idx,
            };
            applyDragImage(ev, rowElement, item.value.data);
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_OVER, (ev) => {
            if (!this.dragDetails) {
                return false;
            }
            ev.preventDefault();
            if (ev.dataTransfer) {
                ev.dataTransfer.dropEffect = 'move';
            }
            return true;
        }));
        let counter = 0;
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_ENTER, (ev) => {
            counter++;
            rowElement.classList.add('drag-hover');
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_LEAVE, (ev) => {
            counter--;
            if (!counter) {
                rowElement.classList.remove('drag-hover');
            }
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DROP, (ev) => {
            // cancel the op if we dragged to a completely different setting
            if (!this.dragDetails) {
                return false;
            }
            ev.preventDefault();
            counter = 0;
            if (this.dragDetails.element !== rowElement) {
                this._onDidChangeList.fire({
                    type: 'move',
                    originalItem: this.dragDetails.item,
                    sourceIndex: this.dragDetails.itemIndex,
                    newItem: item,
                    targetIndex: idx,
                });
            }
            return true;
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_END, (ev) => {
            counter = 0;
            rowElement.classList.remove('drag-hover');
            ev.dataTransfer?.clearData();
            if (this.dragDetails) {
                this.dragDetails = undefined;
            }
        }));
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row');
        let valueInput;
        let currentDisplayValue;
        let currentEnumOptions;
        if (this.keyValueSuggester) {
            const enumData = this.keyValueSuggester(this.model.items.map(({ value: { data } }) => data), idx);
            item = {
                ...item,
                value: {
                    type: 'enum',
                    data: item.value.data,
                    options: enumData ? enumData.options : [],
                },
            };
        }
        switch (item.value.type) {
            case 'string':
                valueInput = this.renderInputBox(item.value, rowElement);
                break;
            case 'enum':
                valueInput = this.renderDropdown(item.value, rowElement);
                currentEnumOptions = item.value.options;
                if (item.value.options.length) {
                    currentDisplayValue = this.isItemNew(item) ? currentEnumOptions[0].value : item.value.data;
                }
                break;
        }
        const updatedInputBoxItem = () => {
            const inputBox = valueInput;
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            return {
                value: {
                    type: 'string',
                    data: inputBox.value,
                },
                sibling: siblingInput?.value,
            };
        };
        const updatedSelectBoxItem = (selectedValue) => {
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            return {
                value: {
                    type: 'enum',
                    data: selectedValue,
                    options: currentEnumOptions ?? [],
                },
            };
        };
        const onKeyDown = (e) => {
            if (e.equals(3 /* KeyCode.Enter */)) {
                this.handleItemChange(item, updatedInputBoxItem(), idx);
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                this.cancelEdit();
                e.preventDefault();
            }
            rowElement?.focus();
        };
        if (item.value.type !== 'string') {
            const selectBox = valueInput;
            this.listDisposables.add(selectBox.onDidSelect(({ selected }) => {
                currentDisplayValue = selected;
            }));
        }
        else {
            const inputBox = valueInput;
            this.listDisposables.add(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        }
        let siblingInput;
        if (!isUndefinedOrNull(item.sibling)) {
            siblingInput = new InputBox(rowElement, this.contextViewService, {
                placeholder: this.getLocalizedStrings().siblingInputPlaceholder,
                inputBoxStyles: getInputBoxStyle({
                    inputBackground: settingsTextInputBackground,
                    inputForeground: settingsTextInputForeground,
                    inputBorder: settingsTextInputBorder,
                }),
            });
            siblingInput.element.classList.add('setting-list-siblingInput');
            this.listDisposables.add(siblingInput);
            siblingInput.value = item.sibling;
            this.listDisposables.add(DOM.addStandardDisposableListener(siblingInput.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        }
        else if (valueInput instanceof InputBox) {
            valueInput.element.classList.add('no-sibling');
        }
        const okButton = this.listDisposables.add(new Button(rowElement, defaultButtonStyles));
        okButton.label = localize('okButton', 'OK');
        okButton.element.classList.add('setting-list-ok-button');
        this.listDisposables.add(okButton.onDidClick(() => {
            if (item.value.type === 'string') {
                this.handleItemChange(item, updatedInputBoxItem(), idx);
            }
            else {
                this.handleItemChange(item, updatedSelectBoxItem(currentDisplayValue), idx);
            }
        }));
        const cancelButton = this.listDisposables.add(new Button(rowElement, { secondary: true, ...defaultButtonStyles }));
        cancelButton.label = localize('cancelButton', 'Cancel');
        cancelButton.element.classList.add('setting-list-cancel-button');
        this.listDisposables.add(cancelButton.onDidClick(() => this.cancelEdit()));
        this.listDisposables.add(disposableTimeout(() => {
            valueInput.focus();
            if (valueInput instanceof InputBox) {
                valueInput.select();
            }
        }));
        return rowElement;
    }
    isItemNew(item) {
        return item.value.data === '';
    }
    addTooltipsToRow(rowElementGroup, { value, sibling }) {
        const title = isUndefinedOrNull(sibling)
            ? localize('listValueHintLabel', 'List item `{0}`', value.data)
            : localize('listSiblingHintLabel', 'List item `{0}` with sibling `${1}`', value.data, sibling);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: title }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', 'Remove Item'),
            editActionTooltip: localize('editItem', 'Edit Item'),
            addButtonLabel: localize('addItem', 'Add Item'),
            inputPlaceholder: localize('itemInputPlaceholder', 'Item...'),
            siblingInputPlaceholder: localize('listSiblingInputPlaceholder', 'Sibling...'),
        };
    }
    renderInputBox(value, rowElement) {
        const valueInput = new InputBox(rowElement, this.contextViewService, {
            placeholder: this.getLocalizedStrings().inputPlaceholder,
            inputBoxStyles: getInputBoxStyle({
                inputBackground: settingsTextInputBackground,
                inputForeground: settingsTextInputForeground,
                inputBorder: settingsTextInputBorder,
            }),
        });
        valueInput.element.classList.add('setting-list-valueInput');
        this.listDisposables.add(valueInput);
        valueInput.value = value.data.toString();
        return valueInput;
    }
    renderDropdown(value, rowElement) {
        if (value.type !== 'enum') {
            throw new Error('Valuetype must be enum.');
        }
        const selectBox = this.createBasicSelectBox(value);
        const wrapper = $('.setting-list-object-list-row');
        selectBox.render(wrapper);
        rowElement.appendChild(wrapper);
        return selectBox;
    }
};
ListSettingWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ListSettingWidget);
export { ListSettingWidget };
export class ExcludeSettingWidget extends ListSettingWidget {
    getContainerClasses() {
        return ['setting-list-include-exclude-widget'];
    }
    addDragAndDrop(rowElement, item, idx) {
        return;
    }
    addTooltipsToRow(rowElementGroup, item) {
        let title = isUndefinedOrNull(item.sibling)
            ? localize('excludePatternHintLabel', 'Exclude files matching `{0}`', item.value.data)
            : localize('excludeSiblingHintLabel', 'Exclude files matching `{0}`, only when a file matching `{1}` is present', item.value.data, item.sibling);
        if (item.source) {
            title += localize('excludeIncludeSource', '. Default value provided by `{0}`', item.source);
        }
        const markdownTitle = new MarkdownString().appendMarkdown(title);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: markdownTitle }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeExcludeItem', 'Remove Exclude Item'),
            editActionTooltip: localize('editExcludeItem', 'Edit Exclude Item'),
            addButtonLabel: localize('addPattern', 'Add Pattern'),
            inputPlaceholder: localize('excludePatternInputPlaceholder', 'Exclude Pattern...'),
            siblingInputPlaceholder: localize('excludeSiblingInputPlaceholder', 'When Pattern Is Present...'),
        };
    }
}
export class IncludeSettingWidget extends ListSettingWidget {
    getContainerClasses() {
        return ['setting-list-include-exclude-widget'];
    }
    addDragAndDrop(rowElement, item, idx) {
        return;
    }
    addTooltipsToRow(rowElementGroup, item) {
        let title = isUndefinedOrNull(item.sibling)
            ? localize('includePatternHintLabel', 'Include files matching `{0}`', item.value.data)
            : localize('includeSiblingHintLabel', 'Include files matching `{0}`, only when a file matching `{1}` is present', item.value.data, item.sibling);
        if (item.source) {
            title += localize('excludeIncludeSource', '. Default value provided by `{0}`', item.source);
        }
        const markdownTitle = new MarkdownString().appendMarkdown(title);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: markdownTitle }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeIncludeItem', 'Remove Include Item'),
            editActionTooltip: localize('editIncludeItem', 'Edit Include Item'),
            addButtonLabel: localize('addPattern', 'Add Pattern'),
            inputPlaceholder: localize('includePatternInputPlaceholder', 'Include Pattern...'),
            siblingInputPlaceholder: localize('includeSiblingInputPlaceholder', 'When Pattern Is Present...'),
        };
    }
}
let ObjectSettingDropdownWidget = class ObjectSettingDropdownWidget extends AbstractListSettingWidget {
    constructor(container, themeService, contextViewService, hoverService) {
        super(container, themeService, contextViewService);
        this.hoverService = hoverService;
        this.editable = true;
        this.currentSettingKey = '';
        this.showAddButton = true;
        this.keySuggester = () => undefined;
        this.valueSuggester = () => undefined;
    }
    setValue(listData, options) {
        this.editable = !options?.isReadOnly;
        this.showAddButton = options?.showAddButton ?? this.showAddButton;
        this.keySuggester = options?.keySuggester ?? this.keySuggester;
        this.valueSuggester = options?.valueSuggester ?? this.valueSuggester;
        if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
            this.model.setEditKey('none');
            this.model.select(null);
            this.currentSettingKey = options.settingKey;
        }
        super.setValue(listData);
    }
    isItemNew(item) {
        return item.key.data === '' && item.value.data === '';
    }
    isAddButtonVisible() {
        return this.showAddButton;
    }
    get isReadOnly() {
        return !this.editable;
    }
    getEmptyItem() {
        return {
            key: { type: 'string', data: '' },
            value: { type: 'string', data: '' },
            removable: true,
            resetable: false,
        };
    }
    getContainerClasses() {
        return ['setting-list-object-widget'];
    }
    getActionsForItem(item, idx) {
        if (this.isReadOnly) {
            return [];
        }
        const actions = [
            {
                class: ThemeIcon.asClassName(settingsEditIcon),
                enabled: true,
                id: 'workbench.action.editListItem',
                label: '',
                tooltip: this.getLocalizedStrings().editActionTooltip,
                run: () => this.editSetting(idx),
            },
        ];
        if (item.resetable) {
            actions.push({
                class: ThemeIcon.asClassName(settingsDiscardIcon),
                enabled: true,
                id: 'workbench.action.resetListItem',
                label: '',
                tooltip: this.getLocalizedStrings().resetActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'reset', originalItem: item, targetIndex: idx }),
            });
        }
        if (item.removable) {
            actions.push({
                class: ThemeIcon.asClassName(settingsRemoveIcon),
                enabled: true,
                id: 'workbench.action.removeListItem',
                label: '',
                tooltip: this.getLocalizedStrings().deleteActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'remove', originalItem: item, targetIndex: idx }),
            });
        }
        return actions;
    }
    renderHeader() {
        const header = $('.setting-list-row-header');
        const keyHeader = DOM.append(header, $('.setting-list-object-key'));
        const valueHeader = DOM.append(header, $('.setting-list-object-value'));
        const { keyHeaderText, valueHeaderText } = this.getLocalizedStrings();
        keyHeader.textContent = keyHeaderText;
        valueHeader.textContent = valueHeaderText;
        return header;
    }
    renderItem(item, idx) {
        const rowElement = $('.setting-list-row');
        rowElement.classList.add('setting-list-object-row');
        const keyElement = DOM.append(rowElement, $('.setting-list-object-key'));
        const valueElement = DOM.append(rowElement, $('.setting-list-object-value'));
        keyElement.textContent = item.key.data;
        valueElement.textContent = item.value.data.toString();
        return { rowElement, keyElement, valueElement };
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row.setting-list-object-row');
        const changedItem = { ...item };
        const onKeyChange = (key) => {
            changedItem.key = key;
            okButton.enabled = key.data !== '';
            const suggestedValue = this.valueSuggester(key.data) ?? item.value;
            if (this.shouldUseSuggestion(item.value, changedItem.value, suggestedValue)) {
                onValueChange(suggestedValue);
                renderLatestValue();
            }
        };
        const onValueChange = (value) => {
            changedItem.value = value;
        };
        let keyWidget;
        let keyElement;
        if (this.showAddButton) {
            if (this.isItemNew(item)) {
                const suggestedKey = this.keySuggester(this.model.items.map(({ key: { data } }) => data));
                if (isDefined(suggestedKey)) {
                    changedItem.key = suggestedKey;
                    const suggestedValue = this.valueSuggester(changedItem.key.data);
                    onValueChange(suggestedValue ?? changedItem.value);
                }
            }
            const { widget, element } = this.renderEditWidget(changedItem.key, {
                idx,
                isKey: true,
                originalItem: item,
                changedItem,
                update: onKeyChange,
            });
            keyWidget = widget;
            keyElement = element;
        }
        else {
            keyElement = $('.setting-list-object-key');
            keyElement.textContent = item.key.data;
        }
        let valueWidget;
        const valueContainer = $('.setting-list-object-value-container');
        const renderLatestValue = () => {
            const { widget, element } = this.renderEditWidget(changedItem.value, {
                idx,
                isKey: false,
                originalItem: item,
                changedItem,
                update: onValueChange,
            });
            valueWidget = widget;
            DOM.clearNode(valueContainer);
            valueContainer.append(element);
        };
        renderLatestValue();
        rowElement.append(keyElement, valueContainer);
        const okButton = this.listDisposables.add(new Button(rowElement, defaultButtonStyles));
        okButton.enabled = changedItem.key.data !== '';
        okButton.label = localize('okButton', 'OK');
        okButton.element.classList.add('setting-list-ok-button');
        this.listDisposables.add(okButton.onDidClick(() => this.handleItemChange(item, changedItem, idx)));
        const cancelButton = this.listDisposables.add(new Button(rowElement, { secondary: true, ...defaultButtonStyles }));
        cancelButton.label = localize('cancelButton', 'Cancel');
        cancelButton.element.classList.add('setting-list-cancel-button');
        this.listDisposables.add(cancelButton.onDidClick(() => this.cancelEdit()));
        this.listDisposables.add(disposableTimeout(() => {
            const widget = keyWidget ?? valueWidget;
            widget.focus();
            if (widget instanceof InputBox) {
                widget.select();
            }
        }));
        return rowElement;
    }
    renderEditWidget(keyOrValue, options) {
        switch (keyOrValue.type) {
            case 'string':
                return this.renderStringEditWidget(keyOrValue, options);
            case 'enum':
                return this.renderEnumEditWidget(keyOrValue, options);
            case 'boolean':
                return this.renderEnumEditWidget({
                    type: 'enum',
                    data: keyOrValue.data.toString(),
                    options: [{ value: 'true' }, { value: 'false' }],
                }, options);
        }
    }
    renderStringEditWidget(keyOrValue, { idx, isKey, originalItem, changedItem, update }) {
        const wrapper = $(isKey ? '.setting-list-object-input-key' : '.setting-list-object-input-value');
        const inputBox = new InputBox(wrapper, this.contextViewService, {
            placeholder: isKey
                ? localize('objectKeyInputPlaceholder', 'Key')
                : localize('objectValueInputPlaceholder', 'Value'),
            inputBoxStyles: getInputBoxStyle({
                inputBackground: settingsTextInputBackground,
                inputForeground: settingsTextInputForeground,
                inputBorder: settingsTextInputBorder,
            }),
        });
        inputBox.element.classList.add('setting-list-object-input');
        this.listDisposables.add(inputBox);
        inputBox.value = keyOrValue.data;
        this.listDisposables.add(inputBox.onDidChange((value) => update({ ...keyOrValue, data: value })));
        const onKeyDown = (e) => {
            if (e.equals(3 /* KeyCode.Enter */)) {
                this.handleItemChange(originalItem, changedItem, idx);
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                this.cancelEdit();
                e.preventDefault();
            }
        };
        this.listDisposables.add(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        return { widget: inputBox, element: wrapper };
    }
    renderEnumEditWidget(keyOrValue, { isKey, changedItem, update }) {
        const selectBox = this.createBasicSelectBox(keyOrValue);
        const changedKeyOrValue = isKey ? changedItem.key : changedItem.value;
        this.listDisposables.add(selectBox.onDidSelect(({ selected }) => update(changedKeyOrValue.type === 'boolean'
            ? { ...changedKeyOrValue, data: selected === 'true' ? true : false }
            : { ...changedKeyOrValue, data: selected })));
        const wrapper = $('.setting-list-object-input');
        wrapper.classList.add(isKey ? 'setting-list-object-input-key' : 'setting-list-object-input-value');
        selectBox.render(wrapper);
        // Switch to the first item if the user set something invalid in the json
        const selected = keyOrValue.options.findIndex((option) => keyOrValue.data === option.value);
        if (selected === -1 && keyOrValue.options.length) {
            update(changedKeyOrValue.type === 'boolean'
                ? { ...changedKeyOrValue, data: true }
                : { ...changedKeyOrValue, data: keyOrValue.options[0].value });
        }
        else if (changedKeyOrValue.type === 'boolean') {
            // https://github.com/microsoft/vscode/issues/129581
            update({ ...changedKeyOrValue, data: keyOrValue.data === 'true' });
        }
        return { widget: selectBox, element: wrapper };
    }
    shouldUseSuggestion(originalValue, previousValue, newValue) {
        // suggestion is exactly the same
        if (newValue.type !== 'enum' &&
            newValue.type === previousValue.type &&
            newValue.data === previousValue.data) {
            return false;
        }
        // item is new, use suggestion
        if (originalValue.data === '') {
            return true;
        }
        if (previousValue.type === newValue.type && newValue.type !== 'enum') {
            return false;
        }
        // check if all enum options are the same
        if (previousValue.type === 'enum' && newValue.type === 'enum') {
            const previousEnums = new Set(previousValue.options.map(({ value }) => value));
            newValue.options.forEach(({ value }) => previousEnums.delete(value));
            // all options are the same
            if (previousEnums.size === 0) {
                return false;
            }
        }
        return true;
    }
    addTooltipsToRow(rowElementGroup, item) {
        const { keyElement, valueElement, rowElement } = rowElementGroup;
        let accessibleDescription;
        if (item.source) {
            accessibleDescription = localize('objectPairHintLabelWithSource', 'The property `{0}` is set to `{1}` by `{2}`.', item.key.data, item.value.data, item.source);
        }
        else {
            accessibleDescription = localize('objectPairHintLabel', 'The property `{0}` is set to `{1}`.', item.key.data, item.value.data);
        }
        const markdownString = new MarkdownString().appendMarkdown(accessibleDescription);
        const keyDescription = this.getEnumDescription(item.key) ?? item.keyDescription ?? markdownString;
        this.listDisposables.add(this.hoverService.setupDelayedHover(keyElement, { content: keyDescription }));
        const valueDescription = this.getEnumDescription(item.value) ?? markdownString;
        this.listDisposables.add(this.hoverService.setupDelayedHover(valueElement, { content: valueDescription }));
        rowElement.setAttribute('aria-label', accessibleDescription);
    }
    getEnumDescription(keyOrValue) {
        const enumDescription = keyOrValue.type === 'enum'
            ? keyOrValue.options.find(({ value }) => keyOrValue.data === value)?.description
            : undefined;
        return enumDescription;
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', 'Remove Item'),
            resetActionTooltip: localize('resetItem', 'Reset Item'),
            editActionTooltip: localize('editItem', 'Edit Item'),
            addButtonLabel: localize('addItem', 'Add Item'),
            keyHeaderText: localize('objectKeyHeader', 'Item'),
            valueHeaderText: localize('objectValueHeader', 'Value'),
        };
    }
};
ObjectSettingDropdownWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ObjectSettingDropdownWidget);
export { ObjectSettingDropdownWidget };
let ObjectSettingCheckboxWidget = class ObjectSettingCheckboxWidget extends AbstractListSettingWidget {
    constructor(container, themeService, contextViewService, hoverService) {
        super(container, themeService, contextViewService);
        this.hoverService = hoverService;
        this.currentSettingKey = '';
    }
    setValue(listData, options) {
        if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
            this.model.setEditKey('none');
            this.model.select(null);
            this.currentSettingKey = options.settingKey;
        }
        super.setValue(listData);
    }
    isItemNew(item) {
        return !item.key.data && !item.value.data;
    }
    getEmptyItem() {
        return {
            key: { type: 'string', data: '' },
            value: { type: 'boolean', data: false },
            removable: false,
            resetable: true,
        };
    }
    getContainerClasses() {
        return ['setting-list-object-widget'];
    }
    getActionsForItem(item, idx) {
        return [];
    }
    isAddButtonVisible() {
        return false;
    }
    renderHeader() {
        return undefined;
    }
    renderDataOrEditItem(item, idx, listFocused) {
        const rowElement = this.renderEdit(item, idx);
        rowElement.setAttribute('role', 'listitem');
        return rowElement;
    }
    renderItem(item, idx) {
        // Return just the containers, since we always render in edit mode anyway
        const rowElement = $('.blank-row');
        const keyElement = $('.blank-row-key');
        return { rowElement, keyElement };
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row.setting-list-object-row.setting-item-bool');
        const changedItem = { ...item };
        const onValueChange = (newValue) => {
            changedItem.value.data = newValue;
            this.handleItemChange(item, changedItem, idx);
        };
        const checkboxDescription = item.keyDescription
            ? `${item.keyDescription} (${item.key.data})`
            : item.key.data;
        const { element, widget: checkbox } = this.renderEditWidget(changedItem.value.data, checkboxDescription, onValueChange);
        rowElement.appendChild(element);
        const valueElement = DOM.append(rowElement, $('.setting-list-object-value'));
        valueElement.textContent = checkboxDescription;
        // We add the tooltips here, because the method is not called by default
        // for widgets in edit mode
        const rowElementGroup = { rowElement, keyElement: valueElement, valueElement: checkbox.domNode };
        this.addTooltipsToRow(rowElementGroup, item);
        this._register(DOM.addDisposableListener(valueElement, DOM.EventType.MOUSE_DOWN, (e) => {
            const targetElement = e.target;
            if (targetElement.tagName.toLowerCase() !== 'a') {
                checkbox.checked = !checkbox.checked;
                onValueChange(checkbox.checked);
            }
            DOM.EventHelper.stop(e);
        }));
        return rowElement;
    }
    renderEditWidget(value, checkboxDescription, onValueChange) {
        const checkbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'setting-value-checkbox',
            isChecked: value,
            title: checkboxDescription,
            ...unthemedToggleStyles,
        });
        this.listDisposables.add(checkbox);
        const wrapper = $('.setting-list-object-input');
        wrapper.classList.add('setting-list-object-input-key-checkbox');
        checkbox.domNode.classList.add('setting-value-checkbox');
        wrapper.appendChild(checkbox.domNode);
        this._register(DOM.addDisposableListener(wrapper, DOM.EventType.MOUSE_DOWN, (e) => {
            checkbox.checked = !checkbox.checked;
            onValueChange(checkbox.checked);
            // Without this line, the settings editor assumes
            // we lost focus on this setting completely.
            e.stopImmediatePropagation();
        }));
        return { widget: checkbox, element: wrapper };
    }
    addTooltipsToRow(rowElementGroup, item) {
        const accessibleDescription = localize('objectPairHintLabel', 'The property `{0}` is set to `{1}`.', item.key.data, item.value.data);
        const title = item.keyDescription ?? accessibleDescription;
        const { rowElement, keyElement, valueElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(keyElement, { content: title }));
        valueElement.setAttribute('aria-label', accessibleDescription);
        rowElement.setAttribute('aria-label', accessibleDescription);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', 'Remove Item'),
            resetActionTooltip: localize('resetItem', 'Reset Item'),
            editActionTooltip: localize('editItem', 'Edit Item'),
            addButtonLabel: localize('addItem', 'Add Item'),
            keyHeaderText: localize('objectKeyHeader', 'Item'),
            valueHeaderText: localize('objectValueHeader', 'Value'),
        };
    }
};
ObjectSettingCheckboxWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ObjectSettingCheckboxWidget);
export { ObjectSettingCheckboxWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc1dpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFB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