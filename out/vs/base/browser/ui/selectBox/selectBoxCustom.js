/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import * as domStylesheetsJs from '../../domStylesheets.js';
import * as cssJs from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { renderMarkdown } from '../../markdownRenderer.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { List } from '../list/listWidget.js';
import * as arrays from '../../../common/arrays.js';
import { Emitter, Event } from '../../../common/event.js';
import { KeyCodeUtils } from '../../../common/keyCodes.js';
import { Disposable } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
import './selectBoxCustom.css';
import { localize } from '../../../../nls.js';
const $ = dom.$;
const SELECT_OPTION_ENTRY_TEMPLATE_ID = 'selectOption.entry.template';
class SelectListRenderer {
    get templateId() {
        return SELECT_OPTION_ENTRY_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.root = container;
        data.text = dom.append(container, $('.option-text'));
        data.detail = dom.append(container, $('.option-detail'));
        data.decoratorRight = dom.append(container, $('.option-decorator-right'));
        return data;
    }
    renderElement(element, index, templateData) {
        const data = templateData;
        const text = element.text;
        const detail = element.detail;
        const decoratorRight = element.decoratorRight;
        const isDisabled = element.isDisabled;
        data.text.textContent = text;
        data.detail.textContent = !!detail ? detail : '';
        data.decoratorRight.innerText = !!decoratorRight ? decoratorRight : '';
        // pseudo-select disabled option
        if (isDisabled) {
            data.root.classList.add('option-disabled');
        }
        else {
            // Make sure we do class removal from prior template rendering
            data.root.classList.remove('option-disabled');
        }
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
export class SelectBoxList extends Disposable {
    static { this.DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN = 32; }
    static { this.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN = 2; }
    static { this.DEFAULT_MINIMUM_VISIBLE_OPTIONS = 3; }
    constructor(options, selected, contextViewProvider, styles, selectBoxOptions) {
        super();
        this.options = [];
        this._currentSelection = 0;
        this._hasDetails = false;
        this._skipLayout = false;
        this._sticky = false; // for dev purposes only
        this._isVisible = false;
        this.styles = styles;
        this.selectBoxOptions = selectBoxOptions || Object.create(null);
        if (typeof this.selectBoxOptions.minBottomMargin !== 'number') {
            this.selectBoxOptions.minBottomMargin = SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN;
        }
        else if (this.selectBoxOptions.minBottomMargin < 0) {
            this.selectBoxOptions.minBottomMargin = 0;
        }
        this.selectElement = document.createElement('select');
        // Use custom CSS vars for padding calculation
        this.selectElement.className = 'monaco-select-box monaco-select-box-dropdown-padding';
        if (typeof this.selectBoxOptions.ariaLabel === 'string') {
            this.selectElement.setAttribute('aria-label', this.selectBoxOptions.ariaLabel);
        }
        if (typeof this.selectBoxOptions.ariaDescription === 'string') {
            this.selectElement.setAttribute('aria-description', this.selectBoxOptions.ariaDescription);
        }
        this._onDidSelect = new Emitter();
        this._register(this._onDidSelect);
        this.registerListeners();
        this.constructSelectDropDown(contextViewProvider);
        this.selected = selected || 0;
        if (options) {
            this.setOptions(options, selected);
        }
        this.initStyleSheet();
    }
    setTitle(title) {
        if (!this._hover && title) {
            this._hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this.selectElement, title));
        }
        else if (this._hover) {
            this._hover.update(title);
        }
    }
    // IDelegate - List renderer
    getHeight() {
        return 22;
    }
    getTemplateId() {
        return SELECT_OPTION_ENTRY_TEMPLATE_ID;
    }
    constructSelectDropDown(contextViewProvider) {
        // SetUp ContextView container to hold select Dropdown
        this.contextViewProvider = contextViewProvider;
        this.selectDropDownContainer = dom.$('.monaco-select-box-dropdown-container');
        // Use custom CSS vars for padding calculation (shared with parent select)
        this.selectDropDownContainer.classList.add('monaco-select-box-dropdown-padding');
        // Setup container for select option details
        this.selectionDetailsPane = dom.append(this.selectDropDownContainer, $('.select-box-details-pane'));
        // Create span flex box item/div we can measure and control
        const widthControlOuterDiv = dom.append(this.selectDropDownContainer, $('.select-box-dropdown-container-width-control'));
        const widthControlInnerDiv = dom.append(widthControlOuterDiv, $('.width-control-div'));
        this.widthControlElement = document.createElement('span');
        this.widthControlElement.className = 'option-text-width-control';
        dom.append(widthControlInnerDiv, this.widthControlElement);
        // Always default to below position
        this._dropDownPosition = 0 /* AnchorPosition.BELOW */;
        // Inline stylesheet for themes
        this.styleElement = domStylesheetsJs.createStyleSheet(this.selectDropDownContainer);
        // Prevent dragging of dropdown #114329
        this.selectDropDownContainer.setAttribute('draggable', 'true');
        this._register(dom.addDisposableListener(this.selectDropDownContainer, dom.EventType.DRAG_START, (e) => {
            dom.EventHelper.stop(e, true);
        }));
    }
    registerListeners() {
        // Parent native select keyboard listeners
        this._register(dom.addStandardDisposableListener(this.selectElement, 'change', (e) => {
            this.selected = e.target.selectedIndex;
            this._onDidSelect.fire({
                index: e.target.selectedIndex,
                selected: e.target.value,
            });
            if (!!this.options[this.selected] && !!this.options[this.selected].text) {
                this.setTitle(this.options[this.selected].text);
            }
        }));
        // Have to implement both keyboard and mouse controllers to handle disabled options
        // Intercept mouse events to override normal select actions on parents
        this._register(dom.addDisposableListener(this.selectElement, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e);
            if (this._isVisible) {
                this.hideSelectDropDown(true);
            }
            else {
                this.showSelectDropDown();
            }
        }));
        this._register(dom.addDisposableListener(this.selectElement, dom.EventType.MOUSE_DOWN, (e) => {
            dom.EventHelper.stop(e);
        }));
        // Intercept touch events
        // The following implementation is slightly different from the mouse event handlers above.
        // Use the following helper variable, otherwise the list flickers.
        let listIsVisibleOnTouchStart;
        this._register(dom.addDisposableListener(this.selectElement, 'touchstart', (e) => {
            listIsVisibleOnTouchStart = this._isVisible;
        }));
        this._register(dom.addDisposableListener(this.selectElement, 'touchend', (e) => {
            dom.EventHelper.stop(e);
            if (listIsVisibleOnTouchStart) {
                this.hideSelectDropDown(true);
            }
            else {
                this.showSelectDropDown();
            }
        }));
        // Intercept keyboard handling
        this._register(dom.addDisposableListener(this.selectElement, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            let showDropDown = false;
            // Create and drop down select list on keyboard select
            if (isMacintosh) {
                if (event.keyCode === 18 /* KeyCode.DownArrow */ ||
                    event.keyCode === 16 /* KeyCode.UpArrow */ ||
                    event.keyCode === 10 /* KeyCode.Space */ ||
                    event.keyCode === 3 /* KeyCode.Enter */) {
                    showDropDown = true;
                }
            }
            else {
                if ((event.keyCode === 18 /* KeyCode.DownArrow */ && event.altKey) ||
                    (event.keyCode === 16 /* KeyCode.UpArrow */ && event.altKey) ||
                    event.keyCode === 10 /* KeyCode.Space */ ||
                    event.keyCode === 3 /* KeyCode.Enter */) {
                    showDropDown = true;
                }
            }
            if (showDropDown) {
                this.showSelectDropDown();
                dom.EventHelper.stop(e, true);
            }
        }));
    }
    get onDidSelect() {
        return this._onDidSelect.event;
    }
    setOptions(options, selected) {
        if (!arrays.equals(this.options, options)) {
            this.options = options;
            this.selectElement.options.length = 0;
            this._hasDetails = false;
            this._cachedMaxDetailsHeight = undefined;
            this.options.forEach((option, index) => {
                this.selectElement.add(this.createOption(option.text, index, option.isDisabled));
                if (typeof option.description === 'string') {
                    this._hasDetails = true;
                }
            });
        }
        if (selected !== undefined) {
            this.select(selected);
            // Set current = selected since this is not necessarily a user exit
            this._currentSelection = this.selected;
        }
    }
    setEnabled(enable) {
        this.selectElement.disabled = !enable;
    }
    setOptionsList() {
        // Mirror options in drop-down
        // Populate select list for non-native select mode
        this.selectList?.splice(0, this.selectList.length, this.options);
    }
    select(index) {
        if (index >= 0 && index < this.options.length) {
            this.selected = index;
        }
        else if (index > this.options.length - 1) {
            // Adjust index to end of list
            // This could make client out of sync with the select
            this.select(this.options.length - 1);
        }
        else if (this.selected < 0) {
            this.selected = 0;
        }
        this.selectElement.selectedIndex = this.selected;
        if (!!this.options[this.selected] && !!this.options[this.selected].text) {
            this.setTitle(this.options[this.selected].text);
        }
    }
    setAriaLabel(label) {
        this.selectBoxOptions.ariaLabel = label;
        this.selectElement.setAttribute('aria-label', this.selectBoxOptions.ariaLabel);
    }
    focus() {
        if (this.selectElement) {
            this.selectElement.tabIndex = 0;
            this.selectElement.focus();
        }
    }
    blur() {
        if (this.selectElement) {
            this.selectElement.tabIndex = -1;
            this.selectElement.blur();
        }
    }
    setFocusable(focusable) {
        this.selectElement.tabIndex = focusable ? 0 : -1;
    }
    render(container) {
        this.container = container;
        container.classList.add('select-container');
        container.appendChild(this.selectElement);
        this.styleSelectElement();
    }
    initStyleSheet() {
        const content = [];
        // Style non-native select mode
        if (this.styles.listFocusBackground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.focused { background-color: ${this.styles.listFocusBackground} !important; }`);
        }
        if (this.styles.listFocusForeground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.focused { color: ${this.styles.listFocusForeground} !important; }`);
        }
        if (this.styles.decoratorRightForeground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.focused) .option-decorator-right { color: ${this.styles.decoratorRightForeground}; }`);
        }
        if (this.styles.selectBackground &&
            this.styles.selectBorder &&
            this.styles.selectBorder !== this.styles.selectBackground) {
            content.push(`.monaco-select-box-dropdown-container { border: 1px solid ${this.styles.selectBorder} } `);
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-top { border-top: 1px solid ${this.styles.selectBorder} } `);
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-bottom { border-bottom: 1px solid ${this.styles.selectBorder} } `);
        }
        else if (this.styles.selectListBorder) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-top { border-top: 1px solid ${this.styles.selectListBorder} } `);
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-bottom { border-bottom: 1px solid ${this.styles.selectListBorder} } `);
        }
        // Hover foreground - ignore for disabled options
        if (this.styles.listHoverForeground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.option-disabled):not(.focused):hover { color: ${this.styles.listHoverForeground} !important; }`);
        }
        // Hover background - ignore for disabled options
        if (this.styles.listHoverBackground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.option-disabled):not(.focused):hover { background-color: ${this.styles.listHoverBackground} !important; }`);
        }
        // Match quick input outline styles - ignore for disabled options
        if (this.styles.listFocusOutline) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.focused { outline: 1.6px dotted ${this.styles.listFocusOutline} !important; outline-offset: -1.6px !important; }`);
        }
        if (this.styles.listHoverOutline) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.option-disabled):not(.focused):hover { outline: 1.6px dashed ${this.styles.listHoverOutline} !important; outline-offset: -1.6px !important; }`);
        }
        // Clear list styles on focus and on hover for disabled options
        content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.option-disabled.focused { background-color: transparent !important; color: inherit !important; outline: none !important; }`);
        content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.option-disabled:hover { background-color: transparent !important; color: inherit !important; outline: none !important; }`);
        this.styleElement.textContent = content.join('\n');
    }
    styleSelectElement() {
        const background = this.styles.selectBackground ?? '';
        const foreground = this.styles.selectForeground ?? '';
        const border = this.styles.selectBorder ?? '';
        this.selectElement.style.backgroundColor = background;
        this.selectElement.style.color = foreground;
        this.selectElement.style.borderColor = border;
    }
    styleList() {
        const background = this.styles.selectBackground ?? '';
        const listBackground = cssJs.asCssValueWithDefault(this.styles.selectListBackground, background);
        this.selectDropDownListContainer.style.backgroundColor = listBackground;
        this.selectionDetailsPane.style.backgroundColor = listBackground;
        const optionsBorder = this.styles.focusBorder ?? '';
        this.selectDropDownContainer.style.outlineColor = optionsBorder;
        this.selectDropDownContainer.style.outlineOffset = '-1px';
        this.selectList.style(this.styles);
    }
    createOption(value, index, disabled) {
        const option = document.createElement('option');
        option.value = value;
        option.text = value;
        option.disabled = !!disabled;
        return option;
    }
    // ContextView dropdown methods
    showSelectDropDown() {
        this.selectionDetailsPane.innerText = '';
        if (!this.contextViewProvider || this._isVisible) {
            return;
        }
        // Lazily create and populate list only at open, moved from constructor
        this.createSelectList(this.selectDropDownContainer);
        this.setOptionsList();
        // This allows us to flip the position based on measurement
        // Set drop-down position above/below from required height and margins
        // If pre-layout cannot fit at least one option do not show drop-down
        this.contextViewProvider.showContextView({
            getAnchor: () => this.selectElement,
            render: (container) => this.renderSelectDropDown(container, true),
            layout: () => {
                this.layoutSelectDropDown();
            },
            onHide: () => {
                this.selectDropDownContainer.classList.remove('visible');
                this.selectElement.classList.remove('synthetic-focus');
            },
            anchorPosition: this._dropDownPosition,
        }, this.selectBoxOptions.optionsAsChildren ? this.container : undefined);
        // Hide so we can relay out
        this._isVisible = true;
        this.hideSelectDropDown(false);
        this.contextViewProvider.showContextView({
            getAnchor: () => this.selectElement,
            render: (container) => this.renderSelectDropDown(container),
            layout: () => this.layoutSelectDropDown(),
            onHide: () => {
                this.selectDropDownContainer.classList.remove('visible');
                this.selectElement.classList.remove('synthetic-focus');
            },
            anchorPosition: this._dropDownPosition,
        }, this.selectBoxOptions.optionsAsChildren ? this.container : undefined);
        // Track initial selection the case user escape, blur
        this._currentSelection = this.selected;
        this._isVisible = true;
        this.selectElement.setAttribute('aria-expanded', 'true');
    }
    hideSelectDropDown(focusSelect) {
        if (!this.contextViewProvider || !this._isVisible) {
            return;
        }
        this._isVisible = false;
        this.selectElement.setAttribute('aria-expanded', 'false');
        if (focusSelect) {
            this.selectElement.focus();
        }
        this.contextViewProvider.hideContextView();
    }
    renderSelectDropDown(container, preLayoutPosition) {
        container.appendChild(this.selectDropDownContainer);
        // Pre-Layout allows us to change position
        this.layoutSelectDropDown(preLayoutPosition);
        return {
            dispose: () => {
                // contextView will dispose itself if moving from one View to another
                this.selectDropDownContainer.remove(); // remove to take out the CSS rules we add
            },
        };
    }
    // Iterate over detailed descriptions, find max height
    measureMaxDetailsHeight() {
        let maxDetailsPaneHeight = 0;
        this.options.forEach((_option, index) => {
            this.updateDetail(index);
            if (this.selectionDetailsPane.offsetHeight > maxDetailsPaneHeight) {
                maxDetailsPaneHeight = this.selectionDetailsPane.offsetHeight;
            }
        });
        return maxDetailsPaneHeight;
    }
    layoutSelectDropDown(preLayoutPosition) {
        // Avoid recursion from layout called in onListFocus
        if (this._skipLayout) {
            return false;
        }
        // Layout ContextView drop down select list and container
        // Have to manage our vertical overflow, sizing, position below or above
        // Position has to be determined and set prior to contextView instantiation
        if (this.selectList) {
            // Make visible to enable measurements
            this.selectDropDownContainer.classList.add('visible');
            const window = dom.getWindow(this.selectElement);
            const selectPosition = dom.getDomNodePagePosition(this.selectElement);
            const styles = dom.getWindow(this.selectElement).getComputedStyle(this.selectElement);
            const verticalPadding = parseFloat(styles.getPropertyValue('--dropdown-padding-top')) +
                parseFloat(styles.getPropertyValue('--dropdown-padding-bottom'));
            const maxSelectDropDownHeightBelow = window.innerHeight -
                selectPosition.top -
                selectPosition.height -
                (this.selectBoxOptions.minBottomMargin || 0);
            const maxSelectDropDownHeightAbove = selectPosition.top - SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN;
            // Determine optimal width - min(longest option), opt(parent select, excluding margins), max(ContextView controlled)
            const selectWidth = this.selectElement.offsetWidth;
            const selectMinWidth = this.setWidthControlElement(this.widthControlElement);
            const selectOptimalWidth = Math.max(selectMinWidth, Math.round(selectWidth)).toString() + 'px';
            this.selectDropDownContainer.style.width = selectOptimalWidth;
            // Get initial list height and determine space above and below
            this.selectList.getHTMLElement().style.height = '';
            this.selectList.layout();
            let listHeight = this.selectList.contentHeight;
            if (this._hasDetails && this._cachedMaxDetailsHeight === undefined) {
                this._cachedMaxDetailsHeight = this.measureMaxDetailsHeight();
            }
            const maxDetailsPaneHeight = this._hasDetails ? this._cachedMaxDetailsHeight : 0;
            const minRequiredDropDownHeight = listHeight + verticalPadding + maxDetailsPaneHeight;
            const maxVisibleOptionsBelow = Math.floor((maxSelectDropDownHeightBelow - verticalPadding - maxDetailsPaneHeight) / this.getHeight());
            const maxVisibleOptionsAbove = Math.floor((maxSelectDropDownHeightAbove - verticalPadding - maxDetailsPaneHeight) / this.getHeight());
            // If we are only doing pre-layout check/adjust position only
            // Calculate vertical space available, flip up if insufficient
            // Use reflected padding on parent select, ContextView style
            // properties not available before DOM attachment
            if (preLayoutPosition) {
                // Check if select moved out of viewport , do not open
                // If at least one option cannot be shown, don't open the drop-down or hide/remove if open
                if (selectPosition.top + selectPosition.height > window.innerHeight - 22 ||
                    selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN ||
                    (maxVisibleOptionsBelow < 1 && maxVisibleOptionsAbove < 1)) {
                    // Indicate we cannot open
                    return false;
                }
                // Determine if we have to flip up
                // Always show complete list items - never more than Max available vertical height
                if (maxVisibleOptionsBelow < SelectBoxList.DEFAULT_MINIMUM_VISIBLE_OPTIONS &&
                    maxVisibleOptionsAbove > maxVisibleOptionsBelow &&
                    this.options.length > maxVisibleOptionsBelow) {
                    this._dropDownPosition = 1 /* AnchorPosition.ABOVE */;
                    this.selectDropDownListContainer.remove();
                    this.selectionDetailsPane.remove();
                    this.selectDropDownContainer.appendChild(this.selectionDetailsPane);
                    this.selectDropDownContainer.appendChild(this.selectDropDownListContainer);
                    this.selectionDetailsPane.classList.remove('border-top');
                    this.selectionDetailsPane.classList.add('border-bottom');
                }
                else {
                    this._dropDownPosition = 0 /* AnchorPosition.BELOW */;
                    this.selectDropDownListContainer.remove();
                    this.selectionDetailsPane.remove();
                    this.selectDropDownContainer.appendChild(this.selectDropDownListContainer);
                    this.selectDropDownContainer.appendChild(this.selectionDetailsPane);
                    this.selectionDetailsPane.classList.remove('border-bottom');
                    this.selectionDetailsPane.classList.add('border-top');
                }
                // Do full layout on showSelectDropDown only
                return true;
            }
            // Check if select out of viewport or cutting into status bar
            if (selectPosition.top + selectPosition.height > window.innerHeight - 22 ||
                selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN ||
                (this._dropDownPosition === 0 /* AnchorPosition.BELOW */ && maxVisibleOptionsBelow < 1) ||
                (this._dropDownPosition === 1 /* AnchorPosition.ABOVE */ && maxVisibleOptionsAbove < 1)) {
                // Cannot properly layout, close and hide
                this.hideSelectDropDown(true);
                return false;
            }
            // SetUp list dimensions and layout - account for container padding
            // Use position to check above or below available space
            if (this._dropDownPosition === 0 /* AnchorPosition.BELOW */) {
                if (this._isVisible && maxVisibleOptionsBelow + maxVisibleOptionsAbove < 1) {
                    // If drop-down is visible, must be doing a DOM re-layout, hide since we don't fit
                    // Hide drop-down, hide contextview, focus on parent select
                    this.hideSelectDropDown(true);
                    return false;
                }
                // Adjust list height to max from select bottom to margin (default/minBottomMargin)
                if (minRequiredDropDownHeight > maxSelectDropDownHeightBelow) {
                    listHeight = maxVisibleOptionsBelow * this.getHeight();
                }
            }
            else {
                if (minRequiredDropDownHeight > maxSelectDropDownHeightAbove) {
                    listHeight = maxVisibleOptionsAbove * this.getHeight();
                }
            }
            // Set adjusted list height and relayout
            this.selectList.layout(listHeight);
            this.selectList.domFocus();
            // Finally set focus on selected item
            if (this.selectList.length > 0) {
                this.selectList.setFocus([this.selected || 0]);
                this.selectList.reveal(this.selectList.getFocus()[0] || 0);
            }
            if (this._hasDetails) {
                // Leave the selectDropDownContainer to size itself according to children (list + details) - #57447
                this.selectList.getHTMLElement().style.height = listHeight + verticalPadding + 'px';
                this.selectDropDownContainer.style.height = '';
            }
            else {
                this.selectDropDownContainer.style.height = listHeight + verticalPadding + 'px';
            }
            this.updateDetail(this.selected);
            this.selectDropDownContainer.style.width = selectOptimalWidth;
            // Maintain focus outline on parent select as well as list container - tabindex for focus
            this.selectDropDownListContainer.setAttribute('tabindex', '0');
            this.selectElement.classList.add('synthetic-focus');
            this.selectDropDownContainer.classList.add('synthetic-focus');
            return true;
        }
        else {
            return false;
        }
    }
    setWidthControlElement(container) {
        let elementWidth = 0;
        if (container) {
            let longest = 0;
            let longestLength = 0;
            this.options.forEach((option, index) => {
                const detailLength = !!option.detail ? option.detail.length : 0;
                const rightDecoratorLength = !!option.decoratorRight ? option.decoratorRight.length : 0;
                const len = option.text.length + detailLength + rightDecoratorLength;
                if (len > longestLength) {
                    longest = index;
                    longestLength = len;
                }
            });
            container.textContent =
                this.options[longest].text +
                    (!!this.options[longest].decoratorRight ? this.options[longest].decoratorRight + ' ' : '');
            elementWidth = dom.getTotalWidth(container);
        }
        return elementWidth;
    }
    createSelectList(parent) {
        // If we have already constructive list on open, skip
        if (this.selectList) {
            return;
        }
        // SetUp container for list
        this.selectDropDownListContainer = dom.append(parent, $('.select-box-dropdown-list-container'));
        this.listRenderer = new SelectListRenderer();
        this.selectList = this._register(new List('SelectBoxCustom', this.selectDropDownListContainer, this, [this.listRenderer], {
            useShadows: false,
            verticalScrollMode: 3 /* ScrollbarVisibility.Visible */,
            keyboardSupport: false,
            mouseSupport: false,
            accessibilityProvider: {
                getAriaLabel: (element) => {
                    let label = element.text;
                    if (element.detail) {
                        label += `. ${element.detail}`;
                    }
                    if (element.decoratorRight) {
                        label += `. ${element.decoratorRight}`;
                    }
                    if (element.description) {
                        label += `. ${element.description}`;
                    }
                    return label;
                },
                getWidgetAriaLabel: () => localize({ key: 'selectBox', comment: ['Behave like native select dropdown element.'] }, 'Select Box'),
                getRole: () => (isMacintosh ? '' : 'option'),
                getWidgetRole: () => 'listbox',
            },
        }));
        if (this.selectBoxOptions.ariaLabel) {
            this.selectList.ariaLabel = this.selectBoxOptions.ariaLabel;
        }
        // SetUp list keyboard controller - control navigation, disabled items, focus
        const onKeyDown = this._register(new DomEmitter(this.selectDropDownListContainer, 'keydown'));
        const onSelectDropDownKeyDown = Event.chain(onKeyDown.event, ($) => $.filter(() => this.selectList.length > 0).map((e) => new StandardKeyboardEvent(e)));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 3 /* KeyCode.Enter */))(this.onEnter, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 2 /* KeyCode.Tab */))(this.onEnter, this)); // Tab should behave the same as enter, #79339
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 9 /* KeyCode.Escape */))(this.onEscape, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 16 /* KeyCode.UpArrow */))(this.onUpArrow, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 18 /* KeyCode.DownArrow */))(this.onDownArrow, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 12 /* KeyCode.PageDown */))(this.onPageDown, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 11 /* KeyCode.PageUp */))(this.onPageUp, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 14 /* KeyCode.Home */))(this.onHome, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => e.keyCode === 13 /* KeyCode.End */))(this.onEnd, this));
        this._register(Event.chain(onSelectDropDownKeyDown, ($) => $.filter((e) => (e.keyCode >= 21 /* KeyCode.Digit0 */ && e.keyCode <= 56 /* KeyCode.KeyZ */) ||
            (e.keyCode >= 85 /* KeyCode.Semicolon */ && e.keyCode <= 113 /* KeyCode.NumpadDivide */)))(this.onCharacter, this));
        // SetUp list mouse controller - control navigation, disabled items, focus
        this._register(dom.addDisposableListener(this.selectList.getHTMLElement(), dom.EventType.POINTER_UP, (e) => this.onPointerUp(e)));
        this._register(this.selectList.onMouseOver((e) => typeof e.index !== 'undefined' && this.selectList.setFocus([e.index])));
        this._register(this.selectList.onDidChangeFocus((e) => this.onListFocus(e)));
        this._register(dom.addDisposableListener(this.selectDropDownContainer, dom.EventType.FOCUS_OUT, (e) => {
            if (!this._isVisible ||
                dom.isAncestor(e.relatedTarget, this.selectDropDownContainer)) {
                return;
            }
            this.onListBlur();
        }));
        this.selectList
            .getHTMLElement()
            .setAttribute('aria-label', this.selectBoxOptions.ariaLabel || '');
        this.selectList.getHTMLElement().setAttribute('aria-expanded', 'true');
        this.styleList();
    }
    // List methods
    // List mouse controller - active exit, select option, fire onDidSelect if change, return focus to parent select
    // Also takes in touchend events
    onPointerUp(e) {
        if (!this.selectList.length) {
            return;
        }
        dom.EventHelper.stop(e);
        const target = e.target;
        if (!target) {
            return;
        }
        // Check our mouse event is on an option (not scrollbar)
        if (target.classList.contains('slider')) {
            return;
        }
        const listRowElement = target.closest('.monaco-list-row');
        if (!listRowElement) {
            return;
        }
        const index = Number(listRowElement.getAttribute('data-index'));
        const disabled = listRowElement.classList.contains('option-disabled');
        // Ignore mouse selection of disabled options
        if (index >= 0 && index < this.options.length && !disabled) {
            this.selected = index;
            this.select(this.selected);
            this.selectList.setFocus([this.selected]);
            this.selectList.reveal(this.selectList.getFocus()[0]);
            // Only fire if selection change
            if (this.selected !== this._currentSelection) {
                // Set current = selected
                this._currentSelection = this.selected;
                this._onDidSelect.fire({
                    index: this.selectElement.selectedIndex,
                    selected: this.options[this.selected].text,
                });
                if (!!this.options[this.selected] && !!this.options[this.selected].text) {
                    this.setTitle(this.options[this.selected].text);
                }
            }
            this.hideSelectDropDown(true);
        }
    }
    // List Exit - passive - implicit no selection change, hide drop-down
    onListBlur() {
        if (this._sticky) {
            return;
        }
        if (this.selected !== this._currentSelection) {
            // Reset selected to current if no change
            this.select(this._currentSelection);
        }
        this.hideSelectDropDown(false);
    }
    renderDescriptionMarkdown(text, actionHandler) {
        const cleanRenderedMarkdown = (element) => {
            for (let i = 0; i < element.childNodes.length; i++) {
                const child = element.childNodes.item(i);
                const tagName = child.tagName && child.tagName.toLowerCase();
                if (tagName === 'img') {
                    child.remove();
                }
                else {
                    cleanRenderedMarkdown(child);
                }
            }
        };
        const rendered = renderMarkdown({ value: text, supportThemeIcons: true }, { actionHandler });
        rendered.element.classList.add('select-box-description-markdown');
        cleanRenderedMarkdown(rendered.element);
        return rendered.element;
    }
    // List Focus Change - passive - update details pane with newly focused element's data
    onListFocus(e) {
        // Skip during initial layout
        if (!this._isVisible || !this._hasDetails) {
            return;
        }
        this.updateDetail(e.indexes[0]);
    }
    updateDetail(selectedIndex) {
        this.selectionDetailsPane.innerText = '';
        const option = this.options[selectedIndex];
        const description = option?.description ?? '';
        const descriptionIsMarkdown = option?.descriptionIsMarkdown ?? false;
        if (description) {
            if (descriptionIsMarkdown) {
                const actionHandler = option.descriptionMarkdownActionHandler;
                this.selectionDetailsPane.appendChild(this.renderDescriptionMarkdown(description, actionHandler));
            }
            else {
                this.selectionDetailsPane.innerText = description;
            }
            this.selectionDetailsPane.style.display = 'block';
        }
        else {
            this.selectionDetailsPane.style.display = 'none';
        }
        // Avoid recursion
        this._skipLayout = true;
        this.contextViewProvider.layout();
        this._skipLayout = false;
    }
    // List keyboard controller
    // List exit - active - hide ContextView dropdown, reset selection, return focus to parent select
    onEscape(e) {
        dom.EventHelper.stop(e);
        // Reset selection to value when opened
        this.select(this._currentSelection);
        this.hideSelectDropDown(true);
    }
    // List exit - active - hide ContextView dropdown, return focus to parent select, fire onDidSelect if change
    onEnter(e) {
        dom.EventHelper.stop(e);
        // Only fire if selection change
        if (this.selected !== this._currentSelection) {
            this._currentSelection = this.selected;
            this._onDidSelect.fire({
                index: this.selectElement.selectedIndex,
                selected: this.options[this.selected].text,
            });
            if (!!this.options[this.selected] && !!this.options[this.selected].text) {
                this.setTitle(this.options[this.selected].text);
            }
        }
        this.hideSelectDropDown(true);
    }
    // List navigation - have to handle a disabled option (jump over)
    onDownArrow(e) {
        if (this.selected < this.options.length - 1) {
            dom.EventHelper.stop(e, true);
            // Skip disabled options
            const nextOptionDisabled = this.options[this.selected + 1].isDisabled;
            if (nextOptionDisabled && this.options.length > this.selected + 2) {
                this.selected += 2;
            }
            else if (nextOptionDisabled) {
                return;
            }
            else {
                this.selected++;
            }
            // Set focus/selection - only fire event when closing drop-down or on blur
            this.select(this.selected);
            this.selectList.setFocus([this.selected]);
            this.selectList.reveal(this.selectList.getFocus()[0]);
        }
    }
    onUpArrow(e) {
        if (this.selected > 0) {
            dom.EventHelper.stop(e, true);
            // Skip disabled options
            const previousOptionDisabled = this.options[this.selected - 1].isDisabled;
            if (previousOptionDisabled && this.selected > 1) {
                this.selected -= 2;
            }
            else {
                this.selected--;
            }
            // Set focus/selection - only fire event when closing drop-down or on blur
            this.select(this.selected);
            this.selectList.setFocus([this.selected]);
            this.selectList.reveal(this.selectList.getFocus()[0]);
        }
    }
    onPageUp(e) {
        dom.EventHelper.stop(e);
        this.selectList.focusPreviousPage();
        // Allow scrolling to settle
        setTimeout(() => {
            this.selected = this.selectList.getFocus()[0];
            // Shift selection down if we land on a disabled option
            if (this.options[this.selected].isDisabled && this.selected < this.options.length - 1) {
                this.selected++;
                this.selectList.setFocus([this.selected]);
            }
            this.selectList.reveal(this.selected);
            this.select(this.selected);
        }, 1);
    }
    onPageDown(e) {
        dom.EventHelper.stop(e);
        this.selectList.focusNextPage();
        // Allow scrolling to settle
        setTimeout(() => {
            this.selected = this.selectList.getFocus()[0];
            // Shift selection up if we land on a disabled option
            if (this.options[this.selected].isDisabled && this.selected > 0) {
                this.selected--;
                this.selectList.setFocus([this.selected]);
            }
            this.selectList.reveal(this.selected);
            this.select(this.selected);
        }, 1);
    }
    onHome(e) {
        dom.EventHelper.stop(e);
        if (this.options.length < 2) {
            return;
        }
        this.selected = 0;
        if (this.options[this.selected].isDisabled && this.selected > 1) {
            this.selected++;
        }
        this.selectList.setFocus([this.selected]);
        this.selectList.reveal(this.selected);
        this.select(this.selected);
    }
    onEnd(e) {
        dom.EventHelper.stop(e);
        if (this.options.length < 2) {
            return;
        }
        this.selected = this.options.length - 1;
        if (this.options[this.selected].isDisabled && this.selected > 1) {
            this.selected--;
        }
        this.selectList.setFocus([this.selected]);
        this.selectList.reveal(this.selected);
        this.select(this.selected);
    }
    // Mimic option first character navigation of native select
    onCharacter(e) {
        const ch = KeyCodeUtils.toString(e.keyCode);
        let optionIndex = -1;
        for (let i = 0; i < this.options.length - 1; i++) {
            optionIndex = (i + this.selected + 1) % this.options.length;
            if (this.options[optionIndex].text.charAt(0).toUpperCase() === ch &&
                !this.options[optionIndex].isDisabled) {
                this.select(optionIndex);
                this.selectList.setFocus([optionIndex]);
                this.selectList.reveal(this.selectList.getFocus()[0]);
                dom.EventHelper.stop(e);
                break;
            }
        }
    }
    dispose() {
        this.hideSelectDropDown(false);
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0Qm94Q3VzdG9tLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3NlbGVjdEJveC9zZWxlY3RCb3hDdXN0b20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxLQUFLLGdCQUFnQixNQUFNLHlCQUF5QixDQUFBO0FBQzNELE9BQU8sS0FBSyxLQUFLLE1BQU0sbUJBQW1CLENBQUE7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRTNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUcxRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFRNUMsT0FBTyxLQUFLLE1BQU0sTUFBTSwyQkFBMkIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3pELE9BQU8sRUFBVyxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXpELE9BQU8sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFD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