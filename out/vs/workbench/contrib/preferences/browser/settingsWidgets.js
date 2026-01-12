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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3NldHRpbmdzV2lkZ2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUUzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FB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