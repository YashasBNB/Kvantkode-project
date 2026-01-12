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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEtBQUssS0FBSyxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBeUIsTUFBTSwrQkFBK0IsQ0FBQTtBQVNwRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxFQU1OLGNBQWMsR0FDZCxNQUFNLHlCQUF5QixDQUFBO0FBUWhDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUEwQixTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDN0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzNFLE9BQU8s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