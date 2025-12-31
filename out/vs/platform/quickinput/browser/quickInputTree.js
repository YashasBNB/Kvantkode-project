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
var QuickPickItemElementRenderer_1;
import * as dom from '../../../base/browser/dom.js';
import * as cssJs from '../../../base/browser/cssValue.js';
import { Emitter, Event, EventBufferer } from '../../../base/common/event.js';
import { localize } from '../../../nls.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { WorkbenchObjectTree } from '../../list/browser/listService.js';
import { IThemeService } from '../../theme/common/themeService.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { QuickPickFocus, } from '../common/quickInput.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { OS } from '../../../base/common/platform.js';
import { memoize } from '../../../base/common/decorators.js';
import { IconLabel } from '../../../base/browser/ui/iconLabel/iconLabel.js';
import { KeybindingLabel } from '../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { isDark } from '../../theme/common/theme.js';
import { URI } from '../../../base/common/uri.js';
import { quickInputButtonToAction } from './quickInputUtils.js';
import { Lazy } from '../../../base/common/lazy.js';
import { getCodiconAriaLabel, matchesFuzzyIconAware, parseLabelWithIcons, } from '../../../base/common/iconLabels.js';
import { compareAnything } from '../../../base/common/comparers.js';
import { escape, ltrim } from '../../../base/common/strings.js';
import { RenderIndentGuides } from '../../../base/browser/ui/tree/abstractTree.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
import { observableValue, observableValueOpts, transaction, } from '../../../base/common/observable.js';
import { equals } from '../../../base/common/arrays.js';
const $ = dom.$;
class BaseQuickPickItemElement {
    constructor(index, hasCheckbox, mainItem) {
        this.index = index;
        this.hasCheckbox = hasCheckbox;
        this._hidden = false;
        this._init = new Lazy(() => {
            const saneLabel = mainItem.label ?? '';
            const saneSortLabel = parseLabelWithIcons(saneLabel).text.trim();
            const saneAriaLabel = mainItem.ariaLabel ||
                [saneLabel, this.saneDescription, this.saneDetail]
                    .map((s) => getCodiconAriaLabel(s))
                    .filter((s) => !!s)
                    .join(', ');
            return {
                saneLabel,
                saneSortLabel,
                saneAriaLabel,
            };
        });
        this._saneDescription = mainItem.description;
        this._saneTooltip = mainItem.tooltip;
    }
    // #region Lazy Getters
    get saneLabel() {
        return this._init.value.saneLabel;
    }
    get saneSortLabel() {
        return this._init.value.saneSortLabel;
    }
    get saneAriaLabel() {
        return this._init.value.saneAriaLabel;
    }
    get element() {
        return this._element;
    }
    set element(value) {
        this._element = value;
    }
    get hidden() {
        return this._hidden;
    }
    set hidden(value) {
        this._hidden = value;
    }
    get saneDescription() {
        return this._saneDescription;
    }
    set saneDescription(value) {
        this._saneDescription = value;
    }
    get saneDetail() {
        return this._saneDetail;
    }
    set saneDetail(value) {
        this._saneDetail = value;
    }
    get saneTooltip() {
        return this._saneTooltip;
    }
    set saneTooltip(value) {
        this._saneTooltip = value;
    }
    get labelHighlights() {
        return this._labelHighlights;
    }
    set labelHighlights(value) {
        this._labelHighlights = value;
    }
    get descriptionHighlights() {
        return this._descriptionHighlights;
    }
    set descriptionHighlights(value) {
        this._descriptionHighlights = value;
    }
    get detailHighlights() {
        return this._detailHighlights;
    }
    set detailHighlights(value) {
        this._detailHighlights = value;
    }
}
class QuickPickItemElement extends BaseQuickPickItemElement {
    constructor(index, hasCheckbox, fireButtonTriggered, _onChecked, item, _separator) {
        super(index, hasCheckbox, item);
        this.fireButtonTriggered = fireButtonTriggered;
        this._onChecked = _onChecked;
        this.item = item;
        this._separator = _separator;
        this._checked = false;
        this.onChecked = hasCheckbox
            ? Event.map(Event.filter(this._onChecked.event, (e) => e.element === this), (e) => e.checked)
            : Event.None;
        this._saneDetail = item.detail;
        this._labelHighlights = item.highlights?.label;
        this._descriptionHighlights = item.highlights?.description;
        this._detailHighlights = item.highlights?.detail;
    }
    get separator() {
        return this._separator;
    }
    set separator(value) {
        this._separator = value;
    }
    get checked() {
        return this._checked;
    }
    set checked(value) {
        if (value !== this._checked) {
            this._checked = value;
            this._onChecked.fire({ element: this, checked: value });
        }
    }
    get checkboxDisabled() {
        return !!this.item.disabled;
    }
}
var QuickPickSeparatorFocusReason;
(function (QuickPickSeparatorFocusReason) {
    /**
     * No item is hovered or active
     */
    QuickPickSeparatorFocusReason[QuickPickSeparatorFocusReason["NONE"] = 0] = "NONE";
    /**
     * Some item within this section is hovered
     */
    QuickPickSeparatorFocusReason[QuickPickSeparatorFocusReason["MOUSE_HOVER"] = 1] = "MOUSE_HOVER";
    /**
     * Some item within this section is active
     */
    QuickPickSeparatorFocusReason[QuickPickSeparatorFocusReason["ACTIVE_ITEM"] = 2] = "ACTIVE_ITEM";
})(QuickPickSeparatorFocusReason || (QuickPickSeparatorFocusReason = {}));
class QuickPickSeparatorElement extends BaseQuickPickItemElement {
    constructor(index, fireSeparatorButtonTriggered, separator) {
        super(index, false, separator);
        this.fireSeparatorButtonTriggered = fireSeparatorButtonTriggered;
        this.separator = separator;
        this.children = new Array();
        /**
         * If this item is >0, it means that there is some item in the list that is either:
         * * hovered over
         * * active
         */
        this.focusInsideSeparator = QuickPickSeparatorFocusReason.NONE;
    }
}
class QuickInputItemDelegate {
    getHeight(element) {
        if (element instanceof QuickPickSeparatorElement) {
            return 30;
        }
        return element.saneDetail ? 44 : 22;
    }
    getTemplateId(element) {
        if (element instanceof QuickPickItemElement) {
            return QuickPickItemElementRenderer.ID;
        }
        else {
            return QuickPickSeparatorElementRenderer.ID;
        }
    }
}
class QuickInputAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('quickInput', 'Quick Input');
    }
    getAriaLabel(element) {
        return element.separator?.label
            ? `${element.saneAriaLabel}, ${element.separator.label}`
            : element.saneAriaLabel;
    }
    getWidgetRole() {
        return 'listbox';
    }
    getRole(element) {
        return element.hasCheckbox ? 'checkbox' : 'option';
    }
    isChecked(element) {
        if (!element.hasCheckbox || !(element instanceof QuickPickItemElement)) {
            return undefined;
        }
        return {
            get value() {
                return element.checked;
            },
            onDidChange: (e) => element.onChecked(() => e()),
        };
    }
}
class BaseQuickInputListRenderer {
    constructor(hoverDelegate) {
        this.hoverDelegate = hoverDelegate;
    }
    // TODO: only do the common stuff here and have a subclass handle their specific stuff
    renderTemplate(container) {
        const data = Object.create(null);
        data.toDisposeElement = new DisposableStore();
        data.toDisposeTemplate = new DisposableStore();
        data.entry = dom.append(container, $('.quick-input-list-entry'));
        // Checkbox
        const label = dom.append(data.entry, $('label.quick-input-list-label'));
        data.toDisposeTemplate.add(dom.addStandardDisposableListener(label, dom.EventType.CLICK, (e) => {
            if (!data.checkbox.offsetParent) {
                // If checkbox not visible:
                e.preventDefault(); // Prevent toggle of checkbox when it is immediately shown afterwards. #91740
            }
        }));
        data.checkbox = dom.append(label, $('input.quick-input-list-checkbox'));
        data.checkbox.type = 'checkbox';
        // Rows
        const rows = dom.append(label, $('.quick-input-list-rows'));
        const row1 = dom.append(rows, $('.quick-input-list-row'));
        const row2 = dom.append(rows, $('.quick-input-list-row'));
        // Label
        data.label = new IconLabel(row1, {
            supportHighlights: true,
            supportDescriptionHighlights: true,
            supportIcons: true,
            hoverDelegate: this.hoverDelegate,
        });
        data.toDisposeTemplate.add(data.label);
        data.icon = dom.prepend(data.label.element, $('.quick-input-list-icon'));
        // Keybinding
        const keybindingContainer = dom.append(row1, $('.quick-input-list-entry-keybinding'));
        data.keybinding = new KeybindingLabel(keybindingContainer, OS);
        data.toDisposeTemplate.add(data.keybinding);
        // Detail
        const detailContainer = dom.append(row2, $('.quick-input-list-label-meta'));
        data.detail = new IconLabel(detailContainer, {
            supportHighlights: true,
            supportIcons: true,
            hoverDelegate: this.hoverDelegate,
        });
        data.toDisposeTemplate.add(data.detail);
        // Separator
        data.separator = dom.append(data.entry, $('.quick-input-list-separator'));
        // Actions
        data.actionBar = new ActionBar(data.entry, this.hoverDelegate ? { hoverDelegate: this.hoverDelegate } : undefined);
        data.actionBar.domNode.classList.add('quick-input-list-entry-action-bar');
        data.toDisposeTemplate.add(data.actionBar);
        return data;
    }
    disposeTemplate(data) {
        data.toDisposeElement.dispose();
        data.toDisposeTemplate.dispose();
    }
    disposeElement(_element, _index, data) {
        data.toDisposeElement.clear();
        data.actionBar.clear();
    }
}
let QuickPickItemElementRenderer = class QuickPickItemElementRenderer extends BaseQuickInputListRenderer {
    static { QuickPickItemElementRenderer_1 = this; }
    static { this.ID = 'quickpickitem'; }
    constructor(hoverDelegate, themeService) {
        super(hoverDelegate);
        this.themeService = themeService;
        // Follow what we do in the separator renderer
        this._itemsWithSeparatorsFrequency = new Map();
    }
    get templateId() {
        return QuickPickItemElementRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = super.renderTemplate(container);
        data.toDisposeTemplate.add(dom.addStandardDisposableListener(data.checkbox, dom.EventType.CHANGE, (e) => {
            ;
            data.element.checked = data.checkbox.checked;
        }));
        return data;
    }
    renderElement(node, index, data) {
        const element = node.element;
        data.element = element;
        element.element = data.entry ?? undefined;
        const mainItem = element.item;
        element.element.classList.toggle('indented', Boolean(mainItem.indented));
        element.element.classList.toggle('not-pickable', element.item.pickable === false);
        data.checkbox.checked = element.checked;
        data.toDisposeElement.add(element.onChecked((checked) => (data.checkbox.checked = checked)));
        data.checkbox.disabled = element.checkboxDisabled;
        const { labelHighlights, descriptionHighlights, detailHighlights } = element;
        // Icon
        if (mainItem.iconPath) {
            const icon = isDark(this.themeService.getColorTheme().type)
                ? mainItem.iconPath.dark
                : (mainItem.iconPath.light ?? mainItem.iconPath.dark);
            const iconUrl = URI.revive(icon);
            data.icon.className = 'quick-input-list-icon';
            data.icon.style.backgroundImage = cssJs.asCSSUrl(iconUrl);
        }
        else {
            data.icon.style.backgroundImage = '';
            data.icon.className = mainItem.iconClass ? `quick-input-list-icon ${mainItem.iconClass}` : '';
        }
        // Label
        let descriptionTitle;
        // if we have a tooltip, that will be the hover,
        // with the saneDescription as fallback if it
        // is defined
        if (!element.saneTooltip && element.saneDescription) {
            descriptionTitle = {
                markdown: {
                    value: escape(element.saneDescription),
                    supportThemeIcons: true,
                },
                markdownNotSupportedFallback: element.saneDescription,
            };
        }
        const options = {
            matches: labelHighlights || [],
            // If we have a tooltip, we want that to be shown and not any other hover
            descriptionTitle,
            descriptionMatches: descriptionHighlights || [],
            labelEscapeNewLines: true,
        };
        options.extraClasses = mainItem.iconClasses;
        options.italic = mainItem.italic;
        options.strikethrough = mainItem.strikethrough;
        data.entry.classList.remove('quick-input-list-separator-as-item');
        data.label.setLabel(element.saneLabel, element.saneDescription, options);
        // Keybinding
        data.keybinding.set(mainItem.keybinding);
        // Detail
        if (element.saneDetail) {
            let title;
            // If we have a tooltip, we want that to be shown and not any other hover
            if (!element.saneTooltip) {
                title = {
                    markdown: {
                        value: escape(element.saneDetail),
                        supportThemeIcons: true,
                    },
                    markdownNotSupportedFallback: element.saneDetail,
                };
            }
            data.detail.element.style.display = '';
            data.detail.setLabel(element.saneDetail, undefined, {
                matches: detailHighlights,
                title,
                labelEscapeNewLines: true,
            });
        }
        else {
            data.detail.element.style.display = 'none';
        }
        // Separator
        if (element.separator?.label) {
            data.separator.textContent = element.separator.label;
            data.separator.style.display = '';
            this.addItemWithSeparator(element);
        }
        else {
            data.separator.style.display = 'none';
        }
        data.entry.classList.toggle('quick-input-list-separator-border', !!element.separator);
        // Actions
        const buttons = mainItem.buttons;
        if (buttons && buttons.length) {
            data.actionBar.push(buttons.map((button, index) => quickInputButtonToAction(button, `id-${index}`, () => element.fireButtonTriggered({ button, item: element.item }))), { icon: true, label: false });
            data.entry.classList.add('has-actions');
        }
        else {
            data.entry.classList.remove('has-actions');
        }
    }
    disposeElement(element, _index, data) {
        this.removeItemWithSeparator(element.element);
        super.disposeElement(element, _index, data);
    }
    isItemWithSeparatorVisible(item) {
        return this._itemsWithSeparatorsFrequency.has(item);
    }
    addItemWithSeparator(item) {
        this._itemsWithSeparatorsFrequency.set(item, (this._itemsWithSeparatorsFrequency.get(item) || 0) + 1);
    }
    removeItemWithSeparator(item) {
        const frequency = this._itemsWithSeparatorsFrequency.get(item) || 0;
        if (frequency > 1) {
            this._itemsWithSeparatorsFrequency.set(item, frequency - 1);
        }
        else {
            this._itemsWithSeparatorsFrequency.delete(item);
        }
    }
};
QuickPickItemElementRenderer = QuickPickItemElementRenderer_1 = __decorate([
    __param(1, IThemeService)
], QuickPickItemElementRenderer);
class QuickPickSeparatorElementRenderer extends BaseQuickInputListRenderer {
    constructor() {
        super(...arguments);
        // This is a frequency map because sticky scroll re-uses the same renderer to render a second
        // instance of the same separator.
        this._visibleSeparatorsFrequency = new Map();
    }
    static { this.ID = 'quickpickseparator'; }
    get templateId() {
        return QuickPickSeparatorElementRenderer.ID;
    }
    get visibleSeparators() {
        return [...this._visibleSeparatorsFrequency.keys()];
    }
    isSeparatorVisible(separator) {
        return this._visibleSeparatorsFrequency.has(separator);
    }
    renderTemplate(container) {
        const data = super.renderTemplate(container);
        data.checkbox.style.display = 'none';
        return data;
    }
    renderElement(node, index, data) {
        const element = node.element;
        data.element = element;
        element.element = data.entry ?? undefined;
        element.element.classList.toggle('focus-inside', !!element.focusInsideSeparator);
        const mainItem = element.separator;
        const { labelHighlights, descriptionHighlights } = element;
        // Icon
        data.icon.style.backgroundImage = '';
        data.icon.className = '';
        // Label
        let descriptionTitle;
        // if we have a tooltip, that will be the hover,
        // with the saneDescription as fallback if it
        // is defined
        if (!element.saneTooltip && element.saneDescription) {
            descriptionTitle = {
                markdown: {
                    value: escape(element.saneDescription),
                    supportThemeIcons: true,
                },
                markdownNotSupportedFallback: element.saneDescription,
            };
        }
        const options = {
            matches: labelHighlights || [],
            // If we have a tooltip, we want that to be shown and not any other hover
            descriptionTitle,
            descriptionMatches: descriptionHighlights || [],
            labelEscapeNewLines: true,
        };
        data.entry.classList.add('quick-input-list-separator-as-item');
        data.label.setLabel(element.saneLabel, element.saneDescription, options);
        // Separator
        data.separator.style.display = 'none';
        data.entry.classList.add('quick-input-list-separator-border');
        // Actions
        const buttons = mainItem.buttons;
        if (buttons && buttons.length) {
            data.actionBar.push(buttons.map((button, index) => quickInputButtonToAction(button, `id-${index}`, () => element.fireSeparatorButtonTriggered({ button, separator: element.separator }))), { icon: true, label: false });
            data.entry.classList.add('has-actions');
        }
        else {
            data.entry.classList.remove('has-actions');
        }
        this.addSeparator(element);
    }
    disposeElement(element, _index, data) {
        this.removeSeparator(element.element);
        if (!this.isSeparatorVisible(element.element)) {
            element.element.element?.classList.remove('focus-inside');
        }
        super.disposeElement(element, _index, data);
    }
    addSeparator(separator) {
        this._visibleSeparatorsFrequency.set(separator, (this._visibleSeparatorsFrequency.get(separator) || 0) + 1);
    }
    removeSeparator(separator) {
        const frequency = this._visibleSeparatorsFrequency.get(separator) || 0;
        if (frequency > 1) {
            this._visibleSeparatorsFrequency.set(separator, frequency - 1);
        }
        else {
            this._visibleSeparatorsFrequency.delete(separator);
        }
    }
}
let QuickInputTree = class QuickInputTree extends Disposable {
    constructor(parent, hoverDelegate, linkOpenerDelegate, id, instantiationService, accessibilityService) {
        super();
        this.parent = parent;
        this.hoverDelegate = hoverDelegate;
        this.linkOpenerDelegate = linkOpenerDelegate;
        this.accessibilityService = accessibilityService;
        //#region QuickInputTree Events
        this._onKeyDown = new Emitter();
        /**
         * Event that is fired when the tree receives a keydown.
         */
        this.onKeyDown = this._onKeyDown.event;
        this._onLeave = new Emitter();
        /**
         * Event that is fired when the tree would no longer have focus.
         */
        this.onLeave = this._onLeave.event;
        this._visibleCountObservable = observableValue('VisibleCount', 0);
        this.onChangedVisibleCount = Event.fromObservable(this._visibleCountObservable, this._store);
        this._allVisibleCheckedObservable = observableValue('AllVisibleChecked', false);
        this.onChangedAllVisibleChecked = Event.fromObservable(this._allVisibleCheckedObservable, this._store);
        this._checkedCountObservable = observableValue('CheckedCount', 0);
        this.onChangedCheckedCount = Event.fromObservable(this._checkedCountObservable, this._store);
        this._checkedElementsObservable = observableValueOpts({ equalsFn: equals }, new Array());
        this.onChangedCheckedElements = Event.fromObservable(this._checkedElementsObservable, this._store);
        this._onButtonTriggered = new Emitter();
        this.onButtonTriggered = this._onButtonTriggered.event;
        this._onSeparatorButtonTriggered = new Emitter();
        this.onSeparatorButtonTriggered = this._onSeparatorButtonTriggered.event;
        this._elementChecked = new Emitter();
        this._elementCheckedEventBufferer = new EventBufferer();
        //#endregion
        this._hasCheckboxes = false;
        this._inputElements = new Array();
        this._elementTree = new Array();
        this._itemElements = new Array();
        // Elements that apply to the current set of elements
        this._elementDisposable = this._register(new DisposableStore());
        this._matchOnDescription = false;
        this._matchOnDetail = false;
        this._matchOnLabel = true;
        this._matchOnLabelMode = 'fuzzy';
        this._matchOnMeta = true;
        this._sortByLabel = true;
        this._shouldLoop = true;
        this._container = dom.append(this.parent, $('.quick-input-list'));
        this._separatorRenderer = new QuickPickSeparatorElementRenderer(hoverDelegate);
        this._itemRenderer = instantiationService.createInstance(QuickPickItemElementRenderer, hoverDelegate);
        this._tree = this._register(instantiationService.createInstance((WorkbenchObjectTree), 'QuickInput', this._container, new QuickInputItemDelegate(), [this._itemRenderer, this._separatorRenderer], {
            filter: {
                filter(element) {
                    return element.hidden
                        ? 0 /* TreeVisibility.Hidden */
                        : element instanceof QuickPickSeparatorElement
                            ? 2 /* TreeVisibility.Recurse */
                            : 1 /* TreeVisibility.Visible */;
                },
            },
            sorter: {
                compare: (element, otherElement) => {
                    if (!this.sortByLabel || !this._lastQueryString) {
                        return 0;
                    }
                    const normalizedSearchValue = this._lastQueryString.toLowerCase();
                    return compareEntries(element, otherElement, normalizedSearchValue);
                },
            },
            accessibilityProvider: new QuickInputAccessibilityProvider(),
            setRowLineHeight: false,
            multipleSelectionSupport: false,
            hideTwistiesOfChildlessElements: true,
            renderIndentGuides: RenderIndentGuides.None,
            findWidgetEnabled: false,
            indent: 0,
            horizontalScrolling: false,
            allowNonCollapsibleParents: true,
            alwaysConsumeMouseWheel: true,
        }));
        this._tree.getHTMLElement().id = id;
        this._registerListeners();
    }
    //#region public getters/setters
    get onDidChangeFocus() {
        return Event.map(this._tree.onDidChangeFocus, (e) => e.elements
            .filter((e) => e instanceof QuickPickItemElement)
            .map((e) => e.item), this._store);
    }
    get onDidChangeSelection() {
        return Event.map(this._tree.onDidChangeSelection, (e) => ({
            items: e.elements
                .filter((e) => e instanceof QuickPickItemElement)
                .map((e) => e.item),
            event: e.browserEvent,
        }), this._store);
    }
    get displayed() {
        return this._container.style.display !== 'none';
    }
    set displayed(value) {
        this._container.style.display = value ? '' : 'none';
    }
    get scrollTop() {
        return this._tree.scrollTop;
    }
    set scrollTop(scrollTop) {
        this._tree.scrollTop = scrollTop;
    }
    get ariaLabel() {
        return this._tree.ariaLabel;
    }
    set ariaLabel(label) {
        this._tree.ariaLabel = label ?? '';
    }
    set enabled(value) {
        this._tree.getHTMLElement().style.pointerEvents = value ? '' : 'none';
    }
    get matchOnDescription() {
        return this._matchOnDescription;
    }
    set matchOnDescription(value) {
        this._matchOnDescription = value;
    }
    get matchOnDetail() {
        return this._matchOnDetail;
    }
    set matchOnDetail(value) {
        this._matchOnDetail = value;
    }
    get matchOnLabel() {
        return this._matchOnLabel;
    }
    set matchOnLabel(value) {
        this._matchOnLabel = value;
    }
    get matchOnLabelMode() {
        return this._matchOnLabelMode;
    }
    set matchOnLabelMode(value) {
        this._matchOnLabelMode = value;
    }
    get matchOnMeta() {
        return this._matchOnMeta;
    }
    set matchOnMeta(value) {
        this._matchOnMeta = value;
    }
    get sortByLabel() {
        return this._sortByLabel;
    }
    set sortByLabel(value) {
        this._sortByLabel = value;
    }
    get shouldLoop() {
        return this._shouldLoop;
    }
    set shouldLoop(value) {
        this._shouldLoop = value;
    }
    //#endregion
    //#region register listeners
    _registerListeners() {
        this._registerOnKeyDown();
        this._registerOnContainerClick();
        this._registerOnMouseMiddleClick();
        this._registerOnTreeModelChanged();
        this._registerOnElementChecked();
        this._registerOnContextMenu();
        this._registerHoverListeners();
        this._registerSelectionChangeListener();
        this._registerSeparatorActionShowingListeners();
    }
    _registerOnKeyDown() {
        // TODO: Should this be added at a higher level?
        this._register(this._tree.onKeyDown((e) => {
            const event = new StandardKeyboardEvent(e);
            switch (event.keyCode) {
                case 10 /* KeyCode.Space */:
                    this.toggleCheckbox();
                    break;
            }
            this._onKeyDown.fire(event);
        }));
    }
    _registerOnContainerClick() {
        this._register(dom.addDisposableListener(this._container, dom.EventType.CLICK, (e) => {
            if (e.x || e.y) {
                // Avoid 'click' triggered by 'space' on checkbox.
                this._onLeave.fire();
            }
        }));
    }
    _registerOnMouseMiddleClick() {
        this._register(dom.addDisposableListener(this._container, dom.EventType.AUXCLICK, (e) => {
            if (e.button === 1) {
                this._onLeave.fire();
            }
        }));
    }
    _registerOnTreeModelChanged() {
        this._register(this._tree.onDidChangeModel(() => {
            const visibleCount = this._itemElements.filter((e) => !e.hidden).length;
            this._visibleCountObservable.set(visibleCount, undefined);
            if (this._hasCheckboxes) {
                this._updateCheckedObservables();
            }
        }));
    }
    _registerOnElementChecked() {
        // Only fire the last event when buffered
        this._register(this._elementCheckedEventBufferer.wrapEvent(this._elementChecked.event, (_, e) => e)((_) => this._updateCheckedObservables()));
    }
    _registerOnContextMenu() {
        this._register(this._tree.onContextMenu((e) => {
            if (e.element) {
                e.browserEvent.preventDefault();
                // we want to treat a context menu event as
                // a gesture to open the item at the index
                // since we do not have any context menu
                // this enables for example macOS to Ctrl-
                // click on an item to open it.
                this._tree.setSelection([e.element]);
            }
        }));
    }
    _registerHoverListeners() {
        const delayer = this._register(new ThrottledDelayer(typeof this.hoverDelegate.delay === 'function'
            ? this.hoverDelegate.delay()
            : this.hoverDelegate.delay));
        this._register(this._tree.onMouseOver(async (e) => {
            // If we hover over an anchor element, we don't want to show the hover because
            // the anchor may have a tooltip that we want to show instead.
            if (dom.isHTMLAnchorElement(e.browserEvent.target)) {
                delayer.cancel();
                return;
            }
            if (
            // anchors are an exception as called out above so we skip them here
            !dom.isHTMLAnchorElement(e.browserEvent.relatedTarget) &&
                // check if the mouse is still over the same element
                dom.isAncestor(e.browserEvent.relatedTarget, e.element?.element)) {
                return;
            }
            try {
                await delayer.trigger(async () => {
                    if (e.element instanceof QuickPickItemElement) {
                        this.showHover(e.element);
                    }
                });
            }
            catch (e) {
                // Ignore cancellation errors due to mouse out
                if (!isCancellationError(e)) {
                    throw e;
                }
            }
        }));
        this._register(this._tree.onMouseOut((e) => {
            // onMouseOut triggers every time a new element has been moused over
            // even if it's on the same list item. We only want one event, so we
            // check if the mouse is still over the same element.
            if (dom.isAncestor(e.browserEvent.relatedTarget, e.element?.element)) {
                return;
            }
            delayer.cancel();
        }));
    }
    /**
     * Register's focus change and mouse events so that we can track when items inside of a
     * separator's section are focused or hovered so that we can display the separator's actions
     */
    _registerSeparatorActionShowingListeners() {
        this._register(this._tree.onDidChangeFocus((e) => {
            const parent = e.elements[0]
                ? this._tree.getParentElement(e.elements[0])
                : // treat null as focus lost and when we have no separators
                    null;
            for (const separator of this._separatorRenderer.visibleSeparators) {
                const value = separator === parent;
                // get bitness of ACTIVE_ITEM and check if it changed
                const currentActive = !!(separator.focusInsideSeparator & QuickPickSeparatorFocusReason.ACTIVE_ITEM);
                if (currentActive !== value) {
                    if (value) {
                        separator.focusInsideSeparator |= QuickPickSeparatorFocusReason.ACTIVE_ITEM;
                    }
                    else {
                        separator.focusInsideSeparator &= ~QuickPickSeparatorFocusReason.ACTIVE_ITEM;
                    }
                    this._tree.rerender(separator);
                }
            }
        }));
        this._register(this._tree.onMouseOver((e) => {
            const parent = e.element
                ? this._tree.getParentElement(e.element)
                : null;
            for (const separator of this._separatorRenderer.visibleSeparators) {
                if (separator !== parent) {
                    continue;
                }
                const currentMouse = !!(separator.focusInsideSeparator & QuickPickSeparatorFocusReason.MOUSE_HOVER);
                if (!currentMouse) {
                    separator.focusInsideSeparator |= QuickPickSeparatorFocusReason.MOUSE_HOVER;
                    this._tree.rerender(separator);
                }
            }
        }));
        this._register(this._tree.onMouseOut((e) => {
            const parent = e.element
                ? this._tree.getParentElement(e.element)
                : null;
            for (const separator of this._separatorRenderer.visibleSeparators) {
                if (separator !== parent) {
                    continue;
                }
                const currentMouse = !!(separator.focusInsideSeparator & QuickPickSeparatorFocusReason.MOUSE_HOVER);
                if (currentMouse) {
                    separator.focusInsideSeparator &= ~QuickPickSeparatorFocusReason.MOUSE_HOVER;
                    this._tree.rerender(separator);
                }
            }
        }));
    }
    _registerSelectionChangeListener() {
        // When the user selects a separator, the separator will move to the top and focus will be
        // set to the first element after the separator.
        this._register(this._tree.onDidChangeSelection((e) => {
            const elementsWithoutSeparators = e.elements.filter((e) => e instanceof QuickPickItemElement);
            if (elementsWithoutSeparators.length !== e.elements.length) {
                if (e.elements.length === 1 && e.elements[0] instanceof QuickPickSeparatorElement) {
                    this._tree.setFocus([e.elements[0].children[0]]);
                    this._tree.reveal(e.elements[0], 0);
                }
                this._tree.setSelection(elementsWithoutSeparators);
            }
        }));
    }
    //#endregion
    //#region public methods
    setAllVisibleChecked(checked) {
        this._elementCheckedEventBufferer.bufferEvents(() => {
            this._itemElements.forEach((element) => {
                if (!element.hidden && !element.checkboxDisabled && element.item.pickable !== false) {
                    // Would fire an event if we didn't beffer the events
                    element.checked = checked;
                }
            });
        });
    }
    setElements(inputElements) {
        this._elementDisposable.clear();
        this._lastQueryString = undefined;
        this._inputElements = inputElements;
        this._hasCheckboxes = this.parent.classList.contains('show-checkboxes');
        let currentSeparatorElement;
        this._itemElements = new Array();
        this._elementTree = inputElements.reduce((result, item, index) => {
            let element;
            if (item.type === 'separator') {
                if (!item.buttons) {
                    // This separator will be rendered as a part of the list item
                    return result;
                }
                currentSeparatorElement = new QuickPickSeparatorElement(index, (e) => this._onSeparatorButtonTriggered.fire(e), item);
                element = currentSeparatorElement;
            }
            else {
                const previous = index > 0 ? inputElements[index - 1] : undefined;
                let separator;
                if (previous && previous.type === 'separator' && !previous.buttons) {
                    // Found an inline separator so we clear out the current separator element
                    currentSeparatorElement = undefined;
                    separator = previous;
                }
                const qpi = new QuickPickItemElement(index, this._hasCheckboxes, (e) => this._onButtonTriggered.fire(e), this._elementChecked, item, separator);
                this._itemElements.push(qpi);
                if (currentSeparatorElement) {
                    currentSeparatorElement.children.push(qpi);
                    return result;
                }
                element = qpi;
            }
            result.push(element);
            return result;
        }, new Array());
        this._setElementsToTree(this._elementTree);
        // Accessibility hack, unfortunately on next tick
        // https://github.com/microsoft/vscode/issues/211976
        if (this.accessibilityService.isScreenReaderOptimized()) {
            setTimeout(() => {
                const focusedElement = this._tree.getHTMLElement().querySelector(`.monaco-list-row.focused`);
                const parent = focusedElement?.parentNode;
                if (focusedElement && parent) {
                    const nextSibling = focusedElement.nextSibling;
                    focusedElement.remove();
                    parent.insertBefore(focusedElement, nextSibling);
                }
            }, 0);
        }
    }
    setFocusedElements(items) {
        const elements = items
            .map((item) => this._itemElements.find((e) => e.item === item))
            .filter((e) => !!e)
            .filter((e) => !e.hidden);
        this._tree.setFocus(elements);
        if (items.length > 0) {
            const focused = this._tree.getFocus()[0];
            if (focused) {
                this._tree.reveal(focused);
            }
        }
    }
    getActiveDescendant() {
        return this._tree.getHTMLElement().getAttribute('aria-activedescendant');
    }
    setSelectedElements(items) {
        const elements = items
            .map((item) => this._itemElements.find((e) => e.item === item))
            .filter((e) => !!e);
        this._tree.setSelection(elements);
    }
    getCheckedElements() {
        return this._itemElements.filter((e) => e.checked).map((e) => e.item);
    }
    setCheckedElements(items) {
        this._elementCheckedEventBufferer.bufferEvents(() => {
            const checked = new Set();
            for (const item of items) {
                checked.add(item);
            }
            for (const element of this._itemElements) {
                // Would fire an event if we didn't beffer the events
                element.checked = checked.has(element.item);
            }
        });
    }
    focus(what) {
        if (!this._itemElements.length) {
            return;
        }
        if (what === QuickPickFocus.Second && this._itemElements.length < 2) {
            what = QuickPickFocus.First;
        }
        switch (what) {
            case QuickPickFocus.First:
                this._tree.scrollTop = 0;
                this._tree.focusFirst(undefined, (e) => e.element instanceof QuickPickItemElement);
                break;
            case QuickPickFocus.Second: {
                this._tree.scrollTop = 0;
                let isSecondItem = false;
                this._tree.focusFirst(undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    if (isSecondItem) {
                        return true;
                    }
                    isSecondItem = !isSecondItem;
                    return false;
                });
                break;
            }
            case QuickPickFocus.Last:
                this._tree.scrollTop = this._tree.scrollHeight;
                this._tree.focusLast(undefined, (e) => e.element instanceof QuickPickItemElement);
                break;
            case QuickPickFocus.Next: {
                const prevFocus = this._tree.getFocus();
                this._tree.focusNext(undefined, this._shouldLoop, undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    this._tree.reveal(e.element);
                    return true;
                });
                const currentFocus = this._tree.getFocus();
                if (prevFocus.length && prevFocus[0] === currentFocus[0]) {
                    this._onLeave.fire();
                }
                break;
            }
            case QuickPickFocus.Previous: {
                const prevFocus = this._tree.getFocus();
                this._tree.focusPrevious(undefined, this._shouldLoop, undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    const parent = this._tree.getParentElement(e.element);
                    if (parent === null || parent.children[0] !== e.element) {
                        this._tree.reveal(e.element);
                    }
                    else {
                        // Only if we are the first child of a separator do we reveal the separator
                        this._tree.reveal(parent);
                    }
                    return true;
                });
                const currentFocus = this._tree.getFocus();
                if (prevFocus.length && prevFocus[0] === currentFocus[0]) {
                    this._onLeave.fire();
                }
                break;
            }
            case QuickPickFocus.NextPage:
                this._tree.focusNextPage(undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    this._tree.reveal(e.element);
                    return true;
                });
                break;
            case QuickPickFocus.PreviousPage:
                this._tree.focusPreviousPage(undefined, (e) => {
                    if (!(e.element instanceof QuickPickItemElement)) {
                        return false;
                    }
                    const parent = this._tree.getParentElement(e.element);
                    if (parent === null || parent.children[0] !== e.element) {
                        this._tree.reveal(e.element);
                    }
                    else {
                        this._tree.reveal(parent);
                    }
                    return true;
                });
                break;
            case QuickPickFocus.NextSeparator: {
                let foundSeparatorAsItem = false;
                const before = this._tree.getFocus()[0];
                this._tree.focusNext(undefined, true, undefined, (e) => {
                    if (foundSeparatorAsItem) {
                        // This should be the index right after the separator so it
                        // is the item we want to focus.
                        return true;
                    }
                    if (e.element instanceof QuickPickSeparatorElement) {
                        foundSeparatorAsItem = true;
                        // If the separator is visible, then we should just reveal its first child so it's not as jarring.
                        if (this._separatorRenderer.isSeparatorVisible(e.element)) {
                            this._tree.reveal(e.element.children[0]);
                        }
                        else {
                            // If the separator is not visible, then we should
                            // push it up to the top of the list.
                            this._tree.reveal(e.element, 0);
                        }
                    }
                    else if (e.element instanceof QuickPickItemElement) {
                        if (e.element.separator) {
                            if (this._itemRenderer.isItemWithSeparatorVisible(e.element)) {
                                this._tree.reveal(e.element);
                            }
                            else {
                                this._tree.reveal(e.element, 0);
                            }
                            return true;
                        }
                        else if (e.element === this._elementTree[0]) {
                            // We should stop at the first item in the list if it's a regular item.
                            this._tree.reveal(e.element, 0);
                            return true;
                        }
                    }
                    return false;
                });
                const after = this._tree.getFocus()[0];
                if (before === after) {
                    // If we didn't move, then we should just move to the end
                    // of the list.
                    this._tree.scrollTop = this._tree.scrollHeight;
                    this._tree.focusLast(undefined, (e) => e.element instanceof QuickPickItemElement);
                }
                break;
            }
            case QuickPickFocus.PreviousSeparator: {
                let focusElement;
                // If we are already sitting on an inline separator, then we
                // have already found the _current_ separator and need to
                // move to the previous one.
                let foundSeparator = !!this._tree.getFocus()[0]?.separator;
                this._tree.focusPrevious(undefined, true, undefined, (e) => {
                    if (e.element instanceof QuickPickSeparatorElement) {
                        if (foundSeparator) {
                            if (!focusElement) {
                                if (this._separatorRenderer.isSeparatorVisible(e.element)) {
                                    this._tree.reveal(e.element);
                                }
                                else {
                                    this._tree.reveal(e.element, 0);
                                }
                                focusElement = e.element.children[0];
                            }
                        }
                        else {
                            foundSeparator = true;
                        }
                    }
                    else if (e.element instanceof QuickPickItemElement) {
                        if (!focusElement) {
                            if (e.element.separator) {
                                if (this._itemRenderer.isItemWithSeparatorVisible(e.element)) {
                                    this._tree.reveal(e.element);
                                }
                                else {
                                    this._tree.reveal(e.element, 0);
                                }
                                focusElement = e.element;
                            }
                            else if (e.element === this._elementTree[0]) {
                                // We should stop at the first item in the list if it's a regular item.
                                this._tree.reveal(e.element, 0);
                                return true;
                            }
                        }
                    }
                    return false;
                });
                if (focusElement) {
                    this._tree.setFocus([focusElement]);
                }
                break;
            }
        }
    }
    clearFocus() {
        this._tree.setFocus([]);
    }
    domFocus() {
        this._tree.domFocus();
    }
    layout(maxHeight) {
        this._tree.getHTMLElement().style.maxHeight = maxHeight
            ? `${
            // Make sure height aligns with list item heights
            Math.floor(maxHeight / 44) * 44 +
                // Add some extra height so that it's clear there's more to scroll
                6}px`
            : '';
        this._tree.layout();
    }
    filter(query) {
        this._lastQueryString = query;
        if (!(this._sortByLabel || this._matchOnLabel || this._matchOnDescription || this._matchOnDetail)) {
            this._tree.layout();
            return false;
        }
        const queryWithWhitespace = query;
        query = query.trim();
        // Reset filtering
        if (!query || !(this.matchOnLabel || this.matchOnDescription || this.matchOnDetail)) {
            this._itemElements.forEach((element) => {
                element.labelHighlights = undefined;
                element.descriptionHighlights = undefined;
                element.detailHighlights = undefined;
                element.hidden = false;
                const previous = element.index && this._inputElements[element.index - 1];
                if (element.item) {
                    element.separator =
                        previous && previous.type === 'separator' && !previous.buttons ? previous : undefined;
                }
            });
        }
        // Filter by value (since we support icons in labels, use $(..) aware fuzzy matching)
        else {
            let currentSeparator;
            this._itemElements.forEach((element) => {
                let labelHighlights;
                if (this.matchOnLabelMode === 'fuzzy') {
                    labelHighlights = this.matchOnLabel
                        ? (matchesFuzzyIconAware(query, parseLabelWithIcons(element.saneLabel)) ?? undefined)
                        : undefined;
                }
                else {
                    labelHighlights = this.matchOnLabel
                        ? (matchesContiguousIconAware(queryWithWhitespace, parseLabelWithIcons(element.saneLabel)) ?? undefined)
                        : undefined;
                }
                const descriptionHighlights = this.matchOnDescription
                    ? (matchesFuzzyIconAware(query, parseLabelWithIcons(element.saneDescription || '')) ??
                        undefined)
                    : undefined;
                const detailHighlights = this.matchOnDetail
                    ? (matchesFuzzyIconAware(query, parseLabelWithIcons(element.saneDetail || '')) ??
                        undefined)
                    : undefined;
                if (labelHighlights || descriptionHighlights || detailHighlights) {
                    element.labelHighlights = labelHighlights;
                    element.descriptionHighlights = descriptionHighlights;
                    element.detailHighlights = detailHighlights;
                    element.hidden = false;
                }
                else {
                    element.labelHighlights = undefined;
                    element.descriptionHighlights = undefined;
                    element.detailHighlights = undefined;
                    element.hidden = element.item ? !element.item.alwaysShow : true;
                }
                // Ensure separators are filtered out first before deciding if we need to bring them back
                if (element.item) {
                    element.separator = undefined;
                }
                else if (element.separator) {
                    element.hidden = true;
                }
                // we can show the separator unless the list gets sorted by match
                if (!this.sortByLabel) {
                    const previous = (element.index && this._inputElements[element.index - 1]) || undefined;
                    if (previous?.type === 'separator' && !previous.buttons) {
                        currentSeparator = previous;
                    }
                    if (currentSeparator && !element.hidden) {
                        element.separator = currentSeparator;
                        currentSeparator = undefined;
                    }
                }
            });
        }
        this._setElementsToTree(this._sortByLabel && query
            ? // We don't render any separators if we're sorting so just render the elements
                this._itemElements
            : // Render the full tree
                this._elementTree);
        this._tree.layout();
        return true;
    }
    toggleCheckbox() {
        this._elementCheckedEventBufferer.bufferEvents(() => {
            const elements = this._tree
                .getFocus()
                .filter((e) => e instanceof QuickPickItemElement);
            const allChecked = this._allVisibleChecked(elements);
            for (const element of elements) {
                if (!element.checkboxDisabled) {
                    // Would fire an event if we didn't have the flag set
                    element.checked = !allChecked;
                }
            }
        });
    }
    style(styles) {
        this._tree.style(styles);
    }
    toggleHover() {
        const focused = this._tree.getFocus()[0];
        if (!focused?.saneTooltip || !(focused instanceof QuickPickItemElement)) {
            return;
        }
        // if there's a hover already, hide it (toggle off)
        if (this._lastHover && !this._lastHover.isDisposed) {
            this._lastHover.dispose();
            return;
        }
        // If there is no hover, show it (toggle on)
        this.showHover(focused);
        const store = new DisposableStore();
        store.add(this._tree.onDidChangeFocus((e) => {
            if (e.elements[0] instanceof QuickPickItemElement) {
                this.showHover(e.elements[0]);
            }
        }));
        if (this._lastHover) {
            store.add(this._lastHover);
        }
        this._elementDisposable.add(store);
    }
    //#endregion
    //#region private methods
    _setElementsToTree(elements) {
        const treeElements = new Array();
        for (const element of elements) {
            if (element instanceof QuickPickSeparatorElement) {
                treeElements.push({
                    element,
                    collapsible: false,
                    collapsed: false,
                    children: element.children.map((e) => ({
                        element: e,
                        collapsible: false,
                        collapsed: false,
                    })),
                });
            }
            else {
                treeElements.push({
                    element,
                    collapsible: false,
                    collapsed: false,
                });
            }
        }
        this._tree.setChildren(null, treeElements);
    }
    _allVisibleChecked(elements, whenNoneVisible = true) {
        for (let i = 0, n = elements.length; i < n; i++) {
            const element = elements[i];
            if (!element.hidden && element.item.pickable !== false) {
                if (!element.checked) {
                    return false;
                }
                else {
                    whenNoneVisible = true;
                }
            }
        }
        return whenNoneVisible;
    }
    _updateCheckedObservables() {
        transaction((tx) => {
            this._allVisibleCheckedObservable.set(this._allVisibleChecked(this._itemElements, false), tx);
            const checkedCount = this._itemElements.filter((element) => element.checked).length;
            this._checkedCountObservable.set(checkedCount, tx);
            this._checkedElementsObservable.set(this.getCheckedElements(), tx);
        });
    }
    /**
     * Disposes of the hover and shows a new one for the given index if it has a tooltip.
     * @param element The element to show the hover for
     */
    showHover(element) {
        if (this._lastHover && !this._lastHover.isDisposed) {
            this.hoverDelegate.onDidHideHover?.();
            this._lastHover?.dispose();
        }
        if (!element.element || !element.saneTooltip) {
            return;
        }
        this._lastHover = this.hoverDelegate.showHover({
            content: element.saneTooltip,
            target: element.element,
            linkHandler: (url) => {
                this.linkOpenerDelegate(url);
            },
            appearance: {
                showPointer: true,
            },
            container: this._container,
            position: {
                hoverPosition: 1 /* HoverPosition.RIGHT */,
            },
        }, false);
    }
};
__decorate([
    memoize
], QuickInputTree.prototype, "onDidChangeFocus", null);
__decorate([
    memoize
], QuickInputTree.prototype, "onDidChangeSelection", null);
QuickInputTree = __decorate([
    __param(4, IInstantiationService),
    __param(5, IAccessibilityService)
], QuickInputTree);
export { QuickInputTree };
function matchesContiguousIconAware(query, target) {
    const { text, iconOffsets } = target;
    // Return early if there are no icon markers in the word to match against
    if (!iconOffsets || iconOffsets.length === 0) {
        return matchesContiguous(query, text);
    }
    // Trim the word to match against because it could have leading
    // whitespace now if the word started with an icon
    const wordToMatchAgainstWithoutIconsTrimmed = ltrim(text, ' ');
    const leadingWhitespaceOffset = text.length - wordToMatchAgainstWithoutIconsTrimmed.length;
    // match on value without icon
    const matches = matchesContiguous(query, wordToMatchAgainstWithoutIconsTrimmed);
    // Map matches back to offsets with icon and trimming
    if (matches) {
        for (const match of matches) {
            const iconOffset = iconOffsets[match.start + leadingWhitespaceOffset] /* icon offsets at index */ +
                leadingWhitespaceOffset; /* overall leading whitespace offset */
            match.start += iconOffset;
            match.end += iconOffset;
        }
    }
    return matches;
}
function matchesContiguous(word, wordToMatchAgainst) {
    const matchIndex = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
    if (matchIndex !== -1) {
        return [{ start: matchIndex, end: matchIndex + word.length }];
    }
    return null;
}
function compareEntries(elementA, elementB, lookFor) {
    const labelHighlightsA = elementA.labelHighlights || [];
    const labelHighlightsB = elementB.labelHighlights || [];
    if (labelHighlightsA.length && !labelHighlightsB.length) {
        return -1;
    }
    if (!labelHighlightsA.length && labelHighlightsB.length) {
        return 1;
    }
    if (labelHighlightsA.length === 0 && labelHighlightsB.length === 0) {
        return 0;
    }
    return compareAnything(elementA.saneSortLabel, elementB.saneSortLabel, lookFor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxLQUFLLEtBQUssTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQXlCLE1BQU0sK0JBQStCLENBQUE7QUFTcEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFNTixjQUFjLEdBQ2QsTUFBTSx5QkFBeUIsQ0FBQTtBQVFoQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBMEIsU0FBUyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBRU4sbUJBQW1CLEVBQ25CLHFCQUFxQixFQUNyQixtQkFBbUIsR0FDbkIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUtwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sZUFBZSxFQUNmLG1CQUFtQixFQUNuQixXQUFXLEdBQ1gsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQXFDZixNQUFNLHdCQUF3QjtJQUc3QixZQUNVLEtBQWEsRUFDYixXQUFvQixFQUM3QixRQUF1QjtRQUZkLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixnQkFBVyxHQUFYLFdBQVcsQ0FBUztRQWdEdEIsWUFBTyxHQUFHLEtBQUssQ0FBQTtRQTdDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDMUIsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUE7WUFDdEMsTUFBTSxhQUFhLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1lBRWhFLE1BQU0sYUFBYSxHQUNsQixRQUFRLENBQUMsU0FBUztnQkFDbEIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO3FCQUNoRCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNsQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUViLE9BQU87Z0JBQ04sU0FBUztnQkFDVCxhQUFhO2dCQUNiLGFBQWE7YUFDYixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQTtRQUM1QyxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUE7SUFDckMsQ0FBQztJQUVELHVCQUF1QjtJQUV2QixJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQTtJQUNsQyxDQUFDO0lBQ0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFBO0lBQ3RDLENBQUM7SUFDRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUE7SUFDdEMsQ0FBQztJQU9ELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsS0FBOEI7UUFDekMsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7SUFDdEIsQ0FBQztJQUdELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBQ0QsSUFBSSxNQUFNLENBQUMsS0FBYztRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtJQUNyQixDQUFDO0lBR0QsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFDRCxJQUFJLGVBQWUsQ0FBQyxLQUF5QjtRQUM1QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO0lBQzlCLENBQUM7SUFHRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUNELElBQUksVUFBVSxDQUFDLEtBQXlCO1FBQ3ZDLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO0lBQ3pCLENBQUM7SUFHRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUNELElBQUksV0FBVyxDQUFDLEtBQXlEO1FBQ3hFLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO0lBQzFCLENBQUM7SUFHRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUNELElBQUksZUFBZSxDQUFDLEtBQTJCO1FBQzlDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7SUFDOUIsQ0FBQztJQUdELElBQUkscUJBQXFCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFBO0lBQ25DLENBQUM7SUFDRCxJQUFJLHFCQUFxQixDQUFDLEtBQTJCO1FBQ3BELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUE7SUFDcEMsQ0FBQztJQUdELElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFDRCxJQUFJLGdCQUFnQixDQUFDLEtBQTJCO1FBQy9DLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUE7SUFDL0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBcUIsU0FBUSx3QkFBd0I7SUFHMUQsWUFDQyxLQUFhLEVBQ2IsV0FBb0IsRUFDWCxtQkFBK0UsRUFDaEYsVUFBcUUsRUFDcEUsSUFBb0IsRUFDckIsVUFBMkM7UUFFbkQsS0FBSyxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFMdEIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUE0RDtRQUNoRixlQUFVLEdBQVYsVUFBVSxDQUEyRDtRQUNwRSxTQUFJLEdBQUosSUFBSSxDQUFnQjtRQUNyQixlQUFVLEdBQVYsVUFBVSxDQUFpQztRQTJCNUMsYUFBUSxHQUFHLEtBQUssQ0FBQTtRQXZCdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxXQUFXO1lBQzNCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUNULEtBQUssQ0FBQyxNQUFNLENBQ1gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQ3JCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FDekIsRUFDRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FDaEI7WUFDRixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUViLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUM5QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUE7UUFDOUMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFBO1FBQzFELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQTtJQUNqRCxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLFNBQVMsQ0FBQyxLQUFzQztRQUNuRCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTtJQUN4QixDQUFDO0lBR0QsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUFjO1FBQ3pCLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDeEQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUM1QixDQUFDO0NBQ0Q7QUFFRCxJQUFLLDZCQWFKO0FBYkQsV0FBSyw2QkFBNkI7SUFDakM7O09BRUc7SUFDSCxpRkFBUSxDQUFBO0lBQ1I7O09BRUc7SUFDSCwrRkFBZSxDQUFBO0lBQ2Y7O09BRUc7SUFDSCwrRkFBZSxDQUFBO0FBQ2hCLENBQUMsRUFiSSw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBYWpDO0FBRUQsTUFBTSx5QkFBMEIsU0FBUSx3QkFBd0I7SUFTL0QsWUFDQyxLQUFhLEVBQ0osNEJBQTZFLEVBQzdFLFNBQThCO1FBRXZDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBSHJCLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBaUQ7UUFDN0UsY0FBUyxHQUFULFNBQVMsQ0FBcUI7UUFYeEMsYUFBUSxHQUFHLElBQUksS0FBSyxFQUF3QixDQUFBO1FBQzVDOzs7O1dBSUc7UUFDSCx5QkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxJQUFJLENBQUE7SUFRekQsQ0FBQztDQUNEO0FBRUQsTUFBTSxzQkFBc0I7SUFDM0IsU0FBUyxDQUFDLE9BQTBCO1FBQ25DLElBQUksT0FBTyxZQUFZLHlCQUF5QixFQUFFLENBQUM7WUFDbEQsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQTBCO1FBQ3ZDLElBQUksT0FBTyxZQUFZLG9CQUFvQixFQUFFLENBQUM7WUFDN0MsT0FBTyw0QkFBNEIsQ0FBQyxFQUFFLENBQUE7UUFDdkMsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLGlDQUFpQyxDQUFDLEVBQUUsQ0FBQTtRQUM1QyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSwrQkFBK0I7SUFDcEMsa0JBQWtCO1FBQ2pCLE9BQU8sUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQTBCO1FBQ3RDLE9BQU8sT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFLO1lBQzlCLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxhQUFhLEtBQUssT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7WUFDeEQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUE7SUFDekIsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsT0FBTyxDQUFDLE9BQTBCO1FBQ2pDLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUE7SUFDbkQsQ0FBQztJQUVELFNBQVMsQ0FBQyxPQUEwQjtRQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztZQUN4RSxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksS0FBSztnQkFDUixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUE7WUFDdkIsQ0FBQztZQUNELFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztTQUNoRCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBZSwwQkFBMEI7SUFLeEMsWUFBNkIsYUFBeUM7UUFBekMsa0JBQWEsR0FBYixhQUFhLENBQTRCO0lBQUcsQ0FBQztJQUUxRSxzRkFBc0Y7SUFDdEYsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sSUFBSSxHQUFnQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzdDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzlDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQTtRQUVoRSxXQUFXO1FBQ1gsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FDekIsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNqQywyQkFBMkI7Z0JBQzNCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQSxDQUFDLDZFQUE2RTtZQUNqRyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxRQUFRLEdBQXFCLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUE7UUFDekYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFBO1FBRS9CLE9BQU87UUFDUCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUE7UUFDekQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtRQUV6RCxRQUFRO1FBQ1IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDaEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2Qiw0QkFBNEIsRUFBRSxJQUFJO1lBQ2xDLFlBQVksRUFBRSxJQUFJO1lBQ2xCLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtTQUNqQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsSUFBSSxHQUFxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFFMUYsYUFBYTtRQUNiLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksZUFBZSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTNDLFNBQVM7UUFDVCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxTQUFTLENBQUMsZUFBZSxFQUFFO1lBQzVDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsWUFBWSxFQUFFLElBQUk7WUFDbEIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1NBQ2pDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXZDLFlBQVk7UUFDWixJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFBO1FBRXpFLFVBQVU7UUFDVixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUM3QixJQUFJLENBQUMsS0FBSyxFQUNWLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUN0RSxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTFDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELGVBQWUsQ0FBQyxJQUFpQztRQUNoRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxjQUFjLENBQ2IsUUFBNEMsRUFDNUMsTUFBYyxFQUNkLElBQWlDO1FBRWpDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3ZCLENBQUM7Q0FRRDtBQUVELElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsMEJBQWdEOzthQUMxRSxPQUFFLEdBQUcsZUFBZSxBQUFsQixDQUFrQjtJQUtwQyxZQUNDLGFBQXlDLEVBQzFCLFlBQTRDO1FBRTNELEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUZZLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBTDVELDhDQUE4QztRQUM3QixrQ0FBNkIsR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQTtJQU94RixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyw4QkFBNEIsQ0FBQyxFQUFFLENBQUE7SUFDdkMsQ0FBQztJQUVRLGNBQWMsQ0FBQyxTQUFzQjtRQUM3QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTVDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQ3pCLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDNUUsQ0FBQztZQUFDLElBQUksQ0FBQyxPQUFnQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQTtRQUN4RSxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsYUFBYSxDQUNaLElBQTJDLEVBQzNDLEtBQWEsRUFDYixJQUFpQztRQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3RCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQW1CLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFFN0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDeEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUMsQ0FBQTtRQUVqRixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFBO1FBRWpELE1BQU0sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxPQUFPLENBQUE7UUFFNUUsT0FBTztRQUNQLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDMUQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSTtnQkFDeEIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLHVCQUF1QixDQUFBO1lBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQTtZQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDOUYsQ0FBQztRQUVELFFBQVE7UUFDUixJQUFJLGdCQUFnRSxDQUFBO1FBQ3BFLGdEQUFnRDtRQUNoRCw2Q0FBNkM7UUFDN0MsYUFBYTtRQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNyRCxnQkFBZ0IsR0FBRztnQkFDbEIsUUFBUSxFQUFFO29CQUNULEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztvQkFDdEMsaUJBQWlCLEVBQUUsSUFBSTtpQkFDdkI7Z0JBQ0QsNEJBQTRCLEVBQUUsT0FBTyxDQUFDLGVBQWU7YUFDckQsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBMkI7WUFDdkMsT0FBTyxFQUFFLGVBQWUsSUFBSSxFQUFFO1lBQzlCLHlFQUF5RTtZQUN6RSxnQkFBZ0I7WUFDaEIsa0JBQWtCLEVBQUUscUJBQXFCLElBQUksRUFBRTtZQUMvQyxtQkFBbUIsRUFBRSxJQUFJO1NBQ3pCLENBQUE7UUFDRCxPQUFPLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUE7UUFDM0MsT0FBTyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQ2hDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQTtRQUM5QyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFeEUsYUFBYTtRQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUV4QyxTQUFTO1FBQ1QsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsSUFBSSxLQUFxRCxDQUFBO1lBQ3pELHlFQUF5RTtZQUN6RSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMxQixLQUFLLEdBQUc7b0JBQ1AsUUFBUSxFQUFFO3dCQUNULEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQzt3QkFDakMsaUJBQWlCLEVBQUUsSUFBSTtxQkFDdkI7b0JBQ0QsNEJBQTRCLEVBQUUsT0FBTyxDQUFDLFVBQVU7aUJBQ2hELENBQUE7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7WUFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUU7Z0JBQ25ELE9BQU8sRUFBRSxnQkFBZ0I7Z0JBQ3pCLEtBQUs7Z0JBQ0wsbUJBQW1CLEVBQUUsSUFBSTthQUN6QixDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQzNDLENBQUM7UUFFRCxZQUFZO1FBQ1osSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFBO1lBQ3BELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7WUFDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ25DLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFckYsVUFBVTtRQUNWLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUE7UUFDaEMsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQzdCLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxNQUFNLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUNwRCxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUMzRCxDQUNELEVBQ0QsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FDNUIsQ0FBQTtZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN4QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMzQyxDQUFDO0lBQ0YsQ0FBQztJQUVRLGNBQWMsQ0FDdEIsT0FBOEMsRUFDOUMsTUFBYyxFQUNkLElBQWlDO1FBRWpDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDN0MsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxJQUEwQjtRQUNwRCxPQUFPLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVPLG9CQUFvQixDQUFDLElBQTBCO1FBQ3RELElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQ3JDLElBQUksRUFDSixDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUN2RCxDQUFBO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLElBQTBCO1FBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25FLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM1RCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEQsQ0FBQztJQUNGLENBQUM7O0FBeEtJLDRCQUE0QjtJQVEvQixXQUFBLGFBQWEsQ0FBQTtHQVJWLDRCQUE0QixDQXlLakM7QUFFRCxNQUFNLGlDQUFrQyxTQUFRLDBCQUFxRDtJQUFyRzs7UUFHQyw2RkFBNkY7UUFDN0Ysa0NBQWtDO1FBQ2pCLGdDQUEyQixHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFBO0lBK0c1RixDQUFDO2FBbkhnQixPQUFFLEdBQUcsb0JBQW9CLEFBQXZCLENBQXVCO0lBTXpDLElBQUksVUFBVTtRQUNiLE9BQU8saUNBQWlDLENBQUMsRUFBRSxDQUFBO0lBQzVDLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsU0FBb0M7UUFDdEQsT0FBTyxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFUSxjQUFjLENBQUMsU0FBc0I7UUFDN0MsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3BDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVRLGFBQWEsQ0FDckIsSUFBZ0QsRUFDaEQsS0FBYSxFQUNiLElBQWlDO1FBRWpDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFDdEIsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQTtRQUN6QyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUNoRixNQUFNLFFBQVEsR0FBd0IsT0FBTyxDQUFDLFNBQVMsQ0FBQTtRQUV2RCxNQUFNLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLEdBQUcsT0FBTyxDQUFBO1FBRTFELE9BQU87UUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtRQUV4QixRQUFRO1FBQ1IsSUFBSSxnQkFBZ0UsQ0FBQTtRQUNwRSxnREFBZ0Q7UUFDaEQsNkNBQTZDO1FBQzdDLGFBQWE7UUFDYixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDckQsZ0JBQWdCLEdBQUc7Z0JBQ2xCLFFBQVEsRUFBRTtvQkFDVCxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBQ3RDLGlCQUFpQixFQUFFLElBQUk7aUJBQ3ZCO2dCQUNELDRCQUE0QixFQUFFLE9BQU8sQ0FBQyxlQUFlO2FBQ3JELENBQUE7UUFDRixDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQTJCO1lBQ3ZDLE9BQU8sRUFBRSxlQUFlLElBQUksRUFBRTtZQUM5Qix5RUFBeUU7WUFDekUsZ0JBQWdCO1lBQ2hCLGtCQUFrQixFQUFFLHFCQUFxQixJQUFJLEVBQUU7WUFDL0MsbUJBQW1CLEVBQUUsSUFBSTtTQUN6QixDQUFBO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRXhFLFlBQVk7UUFDWixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO1FBRTdELFVBQVU7UUFDVixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFBO1FBQ2hDLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUM3Qix3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FDcEQsT0FBTyxDQUFDLDRCQUE0QixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FDOUUsQ0FDRCxFQUNELEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQzVCLENBQUE7WUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVRLGNBQWMsQ0FDdEIsT0FBbUQsRUFDbkQsTUFBYyxFQUNkLElBQWlDO1FBRWpDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDL0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBQ0QsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFTyxZQUFZLENBQUMsU0FBb0M7UUFDeEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FDbkMsU0FBUyxFQUNULENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzFELENBQUE7SUFDRixDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQW9DO1FBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RFLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbkQsQ0FBQztJQUNGLENBQUM7O0FBR0ssSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFtRTdDLFlBQ1MsTUFBbUIsRUFDbkIsYUFBNkIsRUFDN0Isa0JBQTZDLEVBQ3JELEVBQVUsRUFDYSxvQkFBMkMsRUFDM0Msb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBUEMsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUdiLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUF4RXBGLCtCQUErQjtRQUVkLGVBQVUsR0FBRyxJQUFJLE9BQU8sRUFBeUIsQ0FBQTtRQUNsRTs7V0FFRztRQUNNLGNBQVMsR0FBaUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUE7UUFFdkQsYUFBUSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDL0M7O1dBRUc7UUFDTSxZQUFPLEdBQWdCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBRWxDLDRCQUF1QixHQUFHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0UsMEJBQXFCLEdBQWtCLEtBQUssQ0FBQyxjQUFjLENBQzFELElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO1FBRWdCLGlDQUE0QixHQUFHLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRiwrQkFBMEIsR0FBbUIsS0FBSyxDQUFDLGNBQWMsQ0FDaEUsSUFBSSxDQUFDLDRCQUE0QixFQUNqQyxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUE7UUFFZ0IsNEJBQXVCLEdBQUcsZUFBZSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSwwQkFBcUIsR0FBa0IsS0FBSyxDQUFDLGNBQWMsQ0FDMUQsSUFBSSxDQUFDLHVCQUF1QixFQUM1QixJQUFJLENBQUMsTUFBTSxDQUNYLENBQUE7UUFFZ0IsK0JBQTBCLEdBQUcsbUJBQW1CLENBQ2hFLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxFQUNwQixJQUFJLEtBQUssRUFBa0IsQ0FDM0IsQ0FBQTtRQUNELDZCQUF3QixHQUE0QixLQUFLLENBQUMsY0FBYyxDQUN2RSxJQUFJLENBQUMsMEJBQTBCLEVBQy9CLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQTtRQUVnQix1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBNkMsQ0FBQTtRQUM5RixzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBRWhDLGdDQUEyQixHQUFHLElBQUksT0FBTyxFQUFrQyxDQUFBO1FBQzVGLCtCQUEwQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUE7UUFFbEQsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBb0QsQ0FBQTtRQUNqRixpQ0FBNEIsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFBO1FBRW5FLFlBQVk7UUFFSixtQkFBYyxHQUFHLEtBQUssQ0FBQTtRQU10QixtQkFBYyxHQUFHLElBQUksS0FBSyxFQUFpQixDQUFBO1FBQzNDLGlCQUFZLEdBQUcsSUFBSSxLQUFLLEVBQXFCLENBQUE7UUFDN0Msa0JBQWEsR0FBRyxJQUFJLEtBQUssRUFBd0IsQ0FBQTtRQUN6RCxxREFBcUQ7UUFDcEMsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFzSG5FLHdCQUFtQixHQUFHLEtBQUssQ0FBQTtRQVEzQixtQkFBYyxHQUFHLEtBQUssQ0FBQTtRQVF0QixrQkFBYSxHQUFHLElBQUksQ0FBQTtRQVFwQixzQkFBaUIsR0FBMkIsT0FBTyxDQUFBO1FBUW5ELGlCQUFZLEdBQUcsSUFBSSxDQUFBO1FBUW5CLGlCQUFZLEdBQUcsSUFBSSxDQUFBO1FBUW5CLGdCQUFXLEdBQUcsSUFBSSxDQUFBO1FBekp6QixJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGlDQUFpQyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQzlFLElBQUksQ0FBQyxhQUFhLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUN2RCw0QkFBNEIsRUFDNUIsYUFBYSxDQUNiLENBQUE7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzFCLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsQ0FBQSxtQkFBNEMsQ0FBQSxFQUM1QyxZQUFZLEVBQ1osSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLHNCQUFzQixFQUFFLEVBQzVCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFDN0M7WUFDQyxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxDQUFDLE9BQU87b0JBQ2IsT0FBTyxPQUFPLENBQUMsTUFBTTt3QkFDcEIsQ0FBQzt3QkFDRCxDQUFDLENBQUMsT0FBTyxZQUFZLHlCQUF5Qjs0QkFDN0MsQ0FBQzs0QkFDRCxDQUFDLCtCQUF1QixDQUFBO2dCQUMzQixDQUFDO2FBQ0Q7WUFDRCxNQUFNLEVBQUU7Z0JBQ1AsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxFQUFFO29CQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUNqRCxPQUFPLENBQUMsQ0FBQTtvQkFDVCxDQUFDO29CQUNELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFBO29CQUNqRSxPQUFPLGNBQWMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUE7Z0JBQ3BFLENBQUM7YUFDRDtZQUNELHFCQUFxQixFQUFFLElBQUksK0JBQStCLEVBQUU7WUFDNUQsZ0JBQWdCLEVBQUUsS0FBSztZQUN2Qix3QkFBd0IsRUFBRSxLQUFLO1lBQy9CLCtCQUErQixFQUFFLElBQUk7WUFDckMsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsSUFBSTtZQUMzQyxpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLE1BQU0sRUFBRSxDQUFDO1lBQ1QsbUJBQW1CLEVBQUUsS0FBSztZQUMxQiwwQkFBMEIsRUFBRSxJQUFJO1lBQ2hDLHVCQUF1QixFQUFFLElBQUk7U0FDN0IsQ0FDRCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELGdDQUFnQztJQUdoQyxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFDM0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxRQUFRO2FBQ1IsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUE2QixFQUFFLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDO2FBQzNFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUNyQixJQUFJLENBQUMsTUFBTSxDQUNYLENBQUE7SUFDRixDQUFDO0lBR0QsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQy9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ1AsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRO2lCQUNmLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBNkIsRUFBRSxDQUFDLENBQUMsWUFBWSxvQkFBb0IsQ0FBQztpQkFDM0UsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3BCLEtBQUssRUFBRSxDQUFDLENBQUMsWUFBWTtTQUNyQixDQUFDLEVBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxLQUFLLE1BQU0sQ0FBQTtJQUNoRCxDQUFDO0lBRUQsSUFBSSxTQUFTLENBQUMsS0FBYztRQUMzQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtJQUNwRCxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBSSxTQUFTLENBQUMsU0FBaUI7UUFDOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFJLFNBQVMsQ0FBQyxLQUFvQjtRQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLElBQUksRUFBRSxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFjO1FBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0lBQ3RFLENBQUM7SUFHRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0lBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxLQUFjO1FBQ3BDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUE7SUFDakMsQ0FBQztJQUdELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUNELElBQUksYUFBYSxDQUFDLEtBQWM7UUFDL0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUE7SUFDNUIsQ0FBQztJQUdELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBQ0QsSUFBSSxZQUFZLENBQUMsS0FBYztRQUM5QixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQTtJQUMzQixDQUFDO0lBR0QsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztJQUNELElBQUksZ0JBQWdCLENBQUMsS0FBNkI7UUFDakQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtJQUMvQixDQUFDO0lBR0QsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxJQUFJLFdBQVcsQ0FBQyxLQUFjO1FBQzdCLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO0lBQzFCLENBQUM7SUFHRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUNELElBQUksV0FBVyxDQUFDLEtBQWM7UUFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUE7SUFDMUIsQ0FBQztJQUdELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBQ0QsSUFBSSxVQUFVLENBQUMsS0FBYztRQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtJQUN6QixDQUFDO0lBRUQsWUFBWTtJQUVaLDRCQUE0QjtJQUVwQixrQkFBa0I7UUFDekIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDekIsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDN0IsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUE7UUFDdkMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLENBQUE7SUFDaEQsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsUUFBUSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3ZCO29CQUNDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtvQkFDckIsTUFBSztZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDckUsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsa0RBQWtEO2dCQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDJCQUEyQjtRQUNsQyxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEUsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDJCQUEyQjtRQUNsQyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ2hDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUE7WUFDdkUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekQsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1lBQ2pDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyx5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUMxQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ1gsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FDMUMsQ0FBQTtJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzlCLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNmLENBQUMsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBRS9CLDJDQUEyQztnQkFDM0MsMENBQTBDO2dCQUMxQyx3Q0FBd0M7Z0JBQ3hDLDBDQUEwQztnQkFDMUMsK0JBQStCO2dCQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3QixJQUFJLGdCQUFnQixDQUNuQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxLQUFLLFVBQVU7WUFDN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFO1lBQzVCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FDM0IsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbEMsOEVBQThFO1lBQzlFLDhEQUE4RDtZQUM5RCxJQUFJLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDaEIsT0FBTTtZQUNQLENBQUM7WUFDRDtZQUNDLG9FQUFvRTtZQUNwRSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQztnQkFDdEQsb0RBQW9EO2dCQUNwRCxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsYUFBcUIsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQWUsQ0FBQyxFQUMvRSxDQUFDO2dCQUNGLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDO2dCQUNKLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDaEMsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLG9CQUFvQixFQUFFLENBQUM7d0JBQy9DLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUMxQixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osOENBQThDO2dCQUM5QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDN0IsTUFBTSxDQUFDLENBQUE7Z0JBQ1IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzNCLG9FQUFvRTtZQUNwRSxvRUFBb0U7WUFDcEUscURBQXFEO1lBQ3JELElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGFBQXFCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFlLENBQUMsRUFBRSxDQUFDO2dCQUN0RixPQUFNO1lBQ1AsQ0FBQztZQUNELE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNqQixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVEOzs7T0FHRztJQUNLLHdDQUF3QztRQUMvQyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNqQyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDM0IsQ0FBQyxDQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBK0I7Z0JBQzNFLENBQUMsQ0FBQywwREFBMEQ7b0JBQzNELElBQUksQ0FBQTtZQUNOLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ25FLE1BQU0sS0FBSyxHQUFHLFNBQVMsS0FBSyxNQUFNLENBQUE7Z0JBQ2xDLHFEQUFxRDtnQkFDckQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQ3ZCLFNBQVMsQ0FBQyxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxXQUFXLENBQzFFLENBQUE7Z0JBQ0QsSUFBSSxhQUFhLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQzdCLElBQUksS0FBSyxFQUFFLENBQUM7d0JBQ1gsU0FBUyxDQUFDLG9CQUFvQixJQUFJLDZCQUE2QixDQUFDLFdBQVcsQ0FBQTtvQkFDNUUsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFNBQVMsQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFdBQVcsQ0FBQTtvQkFDN0UsQ0FBQztvQkFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzVCLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPO2dCQUN2QixDQUFDLENBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUErQjtnQkFDdkUsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNQLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ25FLElBQUksU0FBUyxLQUFLLE1BQU0sRUFBRSxDQUFDO29CQUMxQixTQUFRO2dCQUNULENBQUM7Z0JBQ0QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQ3RCLFNBQVMsQ0FBQyxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxXQUFXLENBQzFFLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNuQixTQUFTLENBQUMsb0JBQW9CLElBQUksNkJBQTZCLENBQUMsV0FBVyxDQUFBO29CQUMzRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzNCLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPO2dCQUN2QixDQUFDLENBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUErQjtnQkFDdkUsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNQLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ25FLElBQUksU0FBUyxLQUFLLE1BQU0sRUFBRSxDQUFDO29CQUMxQixTQUFRO2dCQUNULENBQUM7Z0JBQ0QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQ3RCLFNBQVMsQ0FBQyxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxXQUFXLENBQzFFLENBQUE7Z0JBQ0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQkFDbEIsU0FBUyxDQUFDLG9CQUFvQixJQUFJLENBQUMsNkJBQTZCLENBQUMsV0FBVyxDQUFBO29CQUM1RSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGdDQUFnQztRQUN2QywwRkFBMEY7UUFDMUYsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3JDLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQ2xELENBQUMsQ0FBQyxFQUE2QixFQUFFLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUNuRSxDQUFBO1lBQ0QsSUFBSSx5QkFBeUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSx5QkFBeUIsRUFBRSxDQUFDO29CQUNuRixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDaEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztnQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1lBQ25ELENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQVk7SUFFWix3QkFBd0I7SUFFeEIsb0JBQW9CLENBQUMsT0FBZ0I7UUFDcEMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDbkQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQ3JGLHFEQUFxRDtvQkFDckQsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7Z0JBQzFCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFdBQVcsQ0FBQyxhQUE4QjtRQUN6QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDL0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQTtRQUNuQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksdUJBQThELENBQUE7UUFDbEUsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEtBQUssRUFBd0IsQ0FBQTtRQUN0RCxJQUFJLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2hFLElBQUksT0FBMEIsQ0FBQTtZQUM5QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ25CLDZEQUE2RDtvQkFDN0QsT0FBTyxNQUFNLENBQUE7Z0JBQ2QsQ0FBQztnQkFDRCx1QkFBdUIsR0FBRyxJQUFJLHlCQUF5QixDQUN0RCxLQUFLLEVBQ0wsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQy9DLElBQUksQ0FDSixDQUFBO2dCQUNELE9BQU8sR0FBRyx1QkFBdUIsQ0FBQTtZQUNsQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxRQUFRLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUNqRSxJQUFJLFNBQTBDLENBQUE7Z0JBQzlDLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNwRSwwRUFBMEU7b0JBQzFFLHVCQUF1QixHQUFHLFNBQVMsQ0FBQTtvQkFDbkMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtnQkFDckIsQ0FBQztnQkFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLG9CQUFvQixDQUNuQyxLQUFLLEVBQ0wsSUFBSSxDQUFDLGNBQWMsRUFDbkIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ3RDLElBQUksQ0FBQyxlQUFlLEVBQ3BCLElBQUksRUFDSixTQUFTLENBQ1QsQ0FBQTtnQkFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFFNUIsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO29CQUM3Qix1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUMxQyxPQUFPLE1BQU0sQ0FBQTtnQkFDZCxDQUFDO2dCQUNELE9BQU8sR0FBRyxHQUFHLENBQUE7WUFDZCxDQUFDO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwQixPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUMsRUFBRSxJQUFJLEtBQUssRUFBcUIsQ0FBQyxDQUFBO1FBRWxDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFMUMsaURBQWlEO1FBQ2pELG9EQUFvRDtRQUNwRCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUM7WUFDekQsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO2dCQUM1RixNQUFNLE1BQU0sR0FBRyxjQUFjLEVBQUUsVUFBVSxDQUFBO2dCQUN6QyxJQUFJLGNBQWMsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQTtvQkFDOUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFBO29CQUN2QixNQUFNLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztZQUNGLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUM7SUFDRixDQUFDO0lBRUQsa0JBQWtCLENBQUMsS0FBdUI7UUFDekMsTUFBTSxRQUFRLEdBQUcsS0FBSzthQUNwQixHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDO2FBQzlELE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBNkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDN0MsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3QixJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4QyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELG1CQUFtQixDQUFDLEtBQXVCO1FBQzFDLE1BQU0sUUFBUSxHQUFHLEtBQUs7YUFDcEIsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQzthQUM5RCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQTZCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELGtCQUFrQixDQUFDLEtBQXVCO1FBQ3pDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7WUFDekIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQixDQUFDO1lBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQzFDLHFEQUFxRDtnQkFDckQsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQW9CO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLEtBQUssY0FBYyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyRSxJQUFJLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQTtRQUM1QixDQUFDO1FBRUQsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLEtBQUssY0FBYyxDQUFDLEtBQUs7Z0JBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtnQkFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLG9CQUFvQixDQUFDLENBQUE7Z0JBQ2xGLE1BQUs7WUFDTixLQUFLLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7Z0JBQ3hCLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtnQkFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ3RDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLFlBQVksb0JBQW9CLENBQUMsRUFBRSxDQUFDO3dCQUNsRCxPQUFPLEtBQUssQ0FBQTtvQkFDYixDQUFDO29CQUNELElBQUksWUFBWSxFQUFFLENBQUM7d0JBQ2xCLE9BQU8sSUFBSSxDQUFBO29CQUNaLENBQUM7b0JBQ0QsWUFBWSxHQUFHLENBQUMsWUFBWSxDQUFBO29CQUM1QixPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDLENBQUMsQ0FBQTtnQkFDRixNQUFLO1lBQ04sQ0FBQztZQUNELEtBQUssY0FBYyxDQUFDLElBQUk7Z0JBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFBO2dCQUM5QyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLFlBQVksb0JBQW9CLENBQUMsQ0FBQTtnQkFDakYsTUFBSztZQUNOLEtBQUssY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNsRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLG9CQUFvQixDQUFDLEVBQUUsQ0FBQzt3QkFDbEQsT0FBTyxLQUFLLENBQUE7b0JBQ2IsQ0FBQztvQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQzVCLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUMsQ0FBQyxDQUFBO2dCQUNGLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQzFDLElBQUksU0FBUyxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzFELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3JCLENBQUM7Z0JBQ0QsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDdEUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sWUFBWSxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7d0JBQ2xELE9BQU8sS0FBSyxDQUFBO29CQUNiLENBQUM7b0JBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ3JELElBQUksTUFBTSxLQUFLLElBQUksSUFBSyxNQUFvQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ3hGLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDN0IsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLDJFQUEyRTt3QkFDM0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQzFCLENBQUM7b0JBQ0QsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDMUMsSUFBSSxTQUFTLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDckIsQ0FBQztnQkFDRCxNQUFLO1lBQ04sQ0FBQztZQUNELEtBQUssY0FBYyxDQUFDLFFBQVE7Z0JBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUN6QyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLG9CQUFvQixDQUFDLEVBQUUsQ0FBQzt3QkFDbEQsT0FBTyxLQUFLLENBQUE7b0JBQ2IsQ0FBQztvQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQzVCLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUMsQ0FBQyxDQUFBO2dCQUNGLE1BQUs7WUFDTixLQUFLLGNBQWMsQ0FBQyxZQUFZO2dCQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUM3QyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLG9CQUFvQixDQUFDLEVBQUUsQ0FBQzt3QkFDbEQsT0FBTyxLQUFLLENBQUE7b0JBQ2IsQ0FBQztvQkFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDckQsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFLLE1BQW9DLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDeEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUM3QixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQzFCLENBQUM7b0JBQ0QsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsTUFBSztZQUNOLEtBQUssY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLElBQUksb0JBQW9CLEdBQUcsS0FBSyxDQUFBO2dCQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUN0RCxJQUFJLG9CQUFvQixFQUFFLENBQUM7d0JBQzFCLDJEQUEyRDt3QkFDM0QsZ0NBQWdDO3dCQUNoQyxPQUFPLElBQUksQ0FBQTtvQkFDWixDQUFDO29CQUVELElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSx5QkFBeUIsRUFBRSxDQUFDO3dCQUNwRCxvQkFBb0IsR0FBRyxJQUFJLENBQUE7d0JBQzNCLGtHQUFrRzt3QkFDbEcsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7NEJBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQ3pDLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxrREFBa0Q7NEJBQ2xELHFDQUFxQzs0QkFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTt3QkFDaEMsQ0FBQztvQkFDRixDQUFDO3lCQUFNLElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxvQkFBb0IsRUFBRSxDQUFDO3dCQUN0RCxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7NEJBQ3pCLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQ0FDOUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBOzRCQUM3QixDQUFDO2lDQUFNLENBQUM7Z0NBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTs0QkFDaEMsQ0FBQzs0QkFDRCxPQUFPLElBQUksQ0FBQTt3QkFDWixDQUFDOzZCQUFNLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7NEJBQy9DLHVFQUF1RTs0QkFDdkUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTs0QkFDL0IsT0FBTyxJQUFJLENBQUE7d0JBQ1osQ0FBQztvQkFDRixDQUFDO29CQUNELE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUMsQ0FBQyxDQUFBO2dCQUNGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RDLElBQUksTUFBTSxLQUFLLEtBQUssRUFBRSxDQUFDO29CQUN0Qix5REFBeUQ7b0JBQ3pELGVBQWU7b0JBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUE7b0JBQzlDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sWUFBWSxvQkFBb0IsQ0FBQyxDQUFBO2dCQUNsRixDQUFDO2dCQUNELE1BQUs7WUFDTixDQUFDO1lBQ0QsS0FBSyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLFlBQTJDLENBQUE7Z0JBQy9DLDREQUE0RDtnQkFDNUQseURBQXlEO2dCQUN6RCw0QkFBNEI7Z0JBQzVCLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQTtnQkFDMUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDMUQsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLHlCQUF5QixFQUFFLENBQUM7d0JBQ3BELElBQUksY0FBYyxFQUFFLENBQUM7NEJBQ3BCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQ0FDbkIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0NBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQ0FDN0IsQ0FBQztxQ0FBTSxDQUFDO29DQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0NBQ2hDLENBQUM7Z0NBQ0QsWUFBWSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBOzRCQUNyQyxDQUFDO3dCQUNGLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxjQUFjLEdBQUcsSUFBSSxDQUFBO3dCQUN0QixDQUFDO29CQUNGLENBQUM7eUJBQU0sSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLG9CQUFvQixFQUFFLENBQUM7d0JBQ3RELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0QkFDbkIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dDQUN6QixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0NBQzlELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQ0FDN0IsQ0FBQztxQ0FBTSxDQUFDO29DQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0NBQ2hDLENBQUM7Z0NBRUQsWUFBWSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUE7NEJBQ3pCLENBQUM7aUNBQU0sSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQ0FDL0MsdUVBQXVFO2dDQUN2RSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dDQUMvQixPQUFPLElBQUksQ0FBQTs0QkFDWixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDLENBQUMsQ0FBQTtnQkFDRixJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7Z0JBQ3BDLENBQUM7Z0JBQ0QsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxTQUFrQjtRQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUztZQUN0RCxDQUFDLENBQUMsR0FBRztZQUNILGlEQUFpRDtZQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFO2dCQUMvQixrRUFBa0U7Z0JBQ2xFLENBQ0QsSUFBSTtZQUNMLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDTCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYTtRQUNuQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO1FBQzdCLElBQ0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUM1RixDQUFDO1lBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNuQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtRQUNqQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRXBCLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUNyRixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUN0QyxPQUFPLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQTtnQkFDbkMsT0FBTyxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQTtnQkFDekMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtnQkFDcEMsT0FBTyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7Z0JBQ3RCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN4RSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLFNBQVM7d0JBQ2hCLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUN2RixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQscUZBQXFGO2FBQ2hGLENBQUM7WUFDTCxJQUFJLGdCQUFpRCxDQUFBO1lBQ3JELElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksZUFBcUMsQ0FBQTtnQkFDekMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQ3ZDLGVBQWUsR0FBRyxJQUFJLENBQUMsWUFBWTt3QkFDbEMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQzt3QkFDckYsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFDYixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZO3dCQUNsQyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FDM0IsbUJBQW1CLEVBQ25CLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FDdEMsSUFBSSxTQUFTLENBQUM7d0JBQ2hCLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQ2IsQ0FBQztnQkFDRCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxrQkFBa0I7b0JBQ3BELENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUNsRixTQUFTLENBQUM7b0JBQ1gsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFDWixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhO29CQUMxQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQzt3QkFDN0UsU0FBUyxDQUFDO29CQUNYLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBRVosSUFBSSxlQUFlLElBQUkscUJBQXFCLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztvQkFDbEUsT0FBTyxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7b0JBQ3pDLE9BQU8sQ0FBQyxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQTtvQkFDckQsT0FBTyxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFBO29CQUMzQyxPQUFPLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtnQkFDdkIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO29CQUNuQyxPQUFPLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFBO29CQUN6QyxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFBO29CQUNwQyxPQUFPLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtnQkFDaEUsQ0FBQztnQkFFRCx5RkFBeUY7Z0JBQ3pGLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNsQixPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtnQkFDOUIsQ0FBQztxQkFBTSxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDOUIsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7Z0JBQ3RCLENBQUM7Z0JBRUQsaUVBQWlFO2dCQUNqRSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUN2QixNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFBO29CQUN2RixJQUFJLFFBQVEsRUFBRSxJQUFJLEtBQUssV0FBVyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUN6RCxnQkFBZ0IsR0FBRyxRQUFRLENBQUE7b0JBQzVCLENBQUM7b0JBQ0QsSUFBSSxnQkFBZ0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDekMsT0FBTyxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQTt3QkFDcEMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFBO29CQUM3QixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQ3RCLElBQUksQ0FBQyxZQUFZLElBQUksS0FBSztZQUN6QixDQUFDLENBQUMsOEVBQThFO2dCQUMvRSxJQUFJLENBQUMsYUFBYTtZQUNuQixDQUFDLENBQUMsdUJBQXVCO2dCQUN4QixJQUFJLENBQUMsWUFBWSxDQUNuQixDQUFBO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNuQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxjQUFjO1FBQ2IsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDbkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUs7aUJBQ3pCLFFBQVEsRUFBRTtpQkFDVixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQTZCLEVBQUUsQ0FBQyxDQUFDLFlBQVksb0JBQW9CLENBQUMsQ0FBQTtZQUM3RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDcEQsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO29CQUMvQixxREFBcUQ7b0JBQ3JELE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUE7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQW1CO1FBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxXQUFXO1FBQ1YsTUFBTSxPQUFPLEdBQTZCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDekUsT0FBTTtRQUNQLENBQUM7UUFFRCxtREFBbUQ7UUFDbkQsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNwRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLE9BQU07UUFDUCxDQUFDO1FBRUQsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxLQUFLLENBQUMsR0FBRyxDQUNSLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksb0JBQW9CLEVBQUUsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsWUFBWTtJQUVaLHlCQUF5QjtJQUVqQixrQkFBa0IsQ0FBQyxRQUE2QjtRQUN2RCxNQUFNLFlBQVksR0FBRyxJQUFJLEtBQUssRUFBeUMsQ0FBQTtRQUN2RSxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksT0FBTyxZQUFZLHlCQUF5QixFQUFFLENBQUM7Z0JBQ2xELFlBQVksQ0FBQyxJQUFJLENBQUM7b0JBQ2pCLE9BQU87b0JBQ1AsV0FBVyxFQUFFLEtBQUs7b0JBQ2xCLFNBQVMsRUFBRSxLQUFLO29CQUNoQixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3RDLE9BQU8sRUFBRSxDQUFDO3dCQUNWLFdBQVcsRUFBRSxLQUFLO3dCQUNsQixTQUFTLEVBQUUsS0FBSztxQkFDaEIsQ0FBQyxDQUFDO2lCQUNILENBQUMsQ0FBQTtZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLENBQUMsSUFBSSxDQUFDO29CQUNqQixPQUFPO29CQUNQLFdBQVcsRUFBRSxLQUFLO29CQUNsQixTQUFTLEVBQUUsS0FBSztpQkFDaEIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFFBQWdDLEVBQUUsZUFBZSxHQUFHLElBQUk7UUFDbEYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDdEIsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGVBQWUsR0FBRyxJQUFJLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sZUFBZSxDQUFBO0lBQ3ZCLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDbEIsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM3RixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUNuRixJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNsRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNLLFNBQVMsQ0FBQyxPQUE2QjtRQUM5QyxJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3BELElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQTtZQUNyQyxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQzNCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM5QyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQzdDO1lBQ0MsT0FBTyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQzVCLE1BQU0sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN2QixXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDcEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdCLENBQUM7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLElBQUk7YUFDakI7WUFDRCxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDMUIsUUFBUSxFQUFFO2dCQUNULGFBQWEsNkJBQXFCO2FBQ2xDO1NBQ0QsRUFDRCxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBOTNCQTtJQURDLE9BQU87c0RBVVA7QUFHRDtJQURDLE9BQU87MERBWVA7QUF2SlcsY0FBYztJQXdFeEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBekVYLGNBQWMsQ0E4L0IxQjs7QUFFRCxTQUFTLDBCQUEwQixDQUFDLEtBQWEsRUFBRSxNQUE2QjtJQUMvRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQTtJQUVwQyx5RUFBeUU7SUFDekUsSUFBSSxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzlDLE9BQU8saUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFRCwrREFBK0Q7SUFDL0Qsa0RBQWtEO0lBQ2xELE1BQU0scUNBQXFDLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUM5RCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcscUNBQXFDLENBQUMsTUFBTSxDQUFBO0lBRTFGLDhCQUE4QjtJQUM5QixNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUscUNBQXFDLENBQUMsQ0FBQTtJQUUvRSxxREFBcUQ7SUFDckQsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFLENBQUM7WUFDN0IsTUFBTSxVQUFVLEdBQ2YsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsdUJBQXVCLENBQUMsQ0FBQywyQkFBMkI7Z0JBQzlFLHVCQUF1QixDQUFBLENBQUMsdUNBQXVDO1lBQ2hFLEtBQUssQ0FBQyxLQUFLLElBQUksVUFBVSxDQUFBO1lBQ3pCLEtBQUssQ0FBQyxHQUFHLElBQUksVUFBVSxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsa0JBQTBCO0lBQ2xFLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtJQUMvRSxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQ3RCLFFBQTJCLEVBQzNCLFFBQTJCLEVBQzNCLE9BQWU7SUFFZixNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFBO0lBQ3ZELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUE7SUFDdkQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN6RCxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ1YsQ0FBQztJQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLElBQUksZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDekQsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNwRSxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFRCxPQUFPLGVBQWUsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDaEYsQ0FBQyJ9