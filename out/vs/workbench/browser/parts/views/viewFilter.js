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
import { Delayer } from '../../../../base/common/async.js';
import * as DOM from '../../../../base/browser/dom.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { badgeBackground, badgeForeground, contrastBorder, asCssVariable, } from '../../../../platform/theme/common/colorRegistry.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ContextScopedHistoryInputBox } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { MenuId, MenuRegistry, SubmenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { MenuWorkbenchToolBar, } from '../../../../platform/actions/browser/toolbar.js';
import { SubmenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Emitter } from '../../../../base/common/event.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
const viewFilterMenu = new MenuId('menu.view.filter');
export const viewFilterSubmenu = new MenuId('submenu.view.filter');
MenuRegistry.appendMenuItem(viewFilterMenu, {
    submenu: viewFilterSubmenu,
    title: localize('more filters', 'More Filters...'),
    group: 'navigation',
    icon: Codicon.filter,
});
class MoreFiltersActionViewItem extends SubmenuEntryActionViewItem {
    constructor() {
        super(...arguments);
        this._checked = false;
    }
    set checked(checked) {
        if (this._checked !== checked) {
            this._checked = checked;
            this.updateChecked();
        }
    }
    updateChecked() {
        if (this.element) {
            this.element.classList.toggle('checked', this._checked);
        }
    }
    render(container) {
        super.render(container);
        this.updateChecked();
    }
}
let FilterWidget = class FilterWidget extends Widget {
    get onDidFocus() {
        return this.focusTracker.onDidFocus;
    }
    get onDidBlur() {
        return this.focusTracker.onDidBlur;
    }
    constructor(options, instantiationService, contextViewService, contextKeyService, keybindingService) {
        super();
        this.options = options;
        this.instantiationService = instantiationService;
        this.contextViewService = contextViewService;
        this.keybindingService = keybindingService;
        this._onDidChangeFilterText = this._register(new Emitter());
        this.onDidChangeFilterText = this._onDidChangeFilterText.event;
        this.isMoreFiltersChecked = false;
        this.delayedFilterUpdate = new Delayer(300);
        this._register(toDisposable(() => this.delayedFilterUpdate.cancel()));
        if (options.focusContextKey) {
            this.focusContextKey = new RawContextKey(options.focusContextKey, false).bindTo(contextKeyService);
        }
        this.element = DOM.$('.viewpane-filter');
        [this.filterInputBox, this.focusTracker] = this.createInput(this.element);
        this._register(this.filterInputBox);
        this._register(this.focusTracker);
        const controlsContainer = DOM.append(this.element, DOM.$('.viewpane-filter-controls'));
        this.filterBadge = this.createBadge(controlsContainer);
        this.toolbar = this._register(this.createToolBar(controlsContainer));
        this.adjustInputBox();
    }
    hasFocus() {
        return this.filterInputBox.hasFocus();
    }
    focus() {
        this.filterInputBox.focus();
    }
    blur() {
        this.filterInputBox.blur();
    }
    updateBadge(message) {
        this.filterBadge.classList.toggle('hidden', !message);
        this.filterBadge.textContent = message || '';
        this.adjustInputBox();
    }
    setFilterText(filterText) {
        this.filterInputBox.value = filterText;
    }
    getFilterText() {
        return this.filterInputBox.value;
    }
    getHistory() {
        return this.filterInputBox.getHistory();
    }
    layout(width) {
        this.element.parentElement?.classList.toggle('grow', width > 700);
        this.element.classList.toggle('small', width < 400);
        this.adjustInputBox();
        this.lastWidth = width;
    }
    relayout() {
        if (this.lastWidth) {
            this.layout(this.lastWidth);
        }
    }
    checkMoreFilters(checked) {
        this.isMoreFiltersChecked = checked;
        if (this.moreFiltersActionViewItem) {
            this.moreFiltersActionViewItem.checked = checked;
        }
    }
    createInput(container) {
        const history = this.options.history || [];
        const inputBox = this._register(this.instantiationService.createInstance(ContextScopedHistoryInputBox, container, this.contextViewService, {
            placeholder: this.options.placeholder,
            ariaLabel: this.options.ariaLabel,
            history: new Set(history),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            inputBoxStyles: defaultInputBoxStyles,
        }));
        if (this.options.text) {
            inputBox.value = this.options.text;
        }
        this._register(inputBox.onDidChange((filter) => this.delayedFilterUpdate.trigger(() => this.onDidInputChange(inputBox))));
        this._register(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => this.onInputKeyDown(e, inputBox)));
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.KEY_DOWN, this.handleKeyboardEvent));
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.KEY_UP, this.handleKeyboardEvent));
        this._register(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.CLICK, (e) => {
            e.stopPropagation();
            e.preventDefault();
        }));
        const focusTracker = this._register(DOM.trackFocus(inputBox.inputElement));
        if (this.focusContextKey) {
            this._register(focusTracker.onDidFocus(() => this.focusContextKey.set(true)));
            this._register(focusTracker.onDidBlur(() => this.focusContextKey.set(false)));
            this._register(toDisposable(() => this.focusContextKey.reset()));
        }
        return [inputBox, focusTracker];
    }
    createBadge(container) {
        const filterBadge = DOM.append(container, DOM.$('.viewpane-filter-badge.hidden'));
        filterBadge.style.backgroundColor = asCssVariable(badgeBackground);
        filterBadge.style.color = asCssVariable(badgeForeground);
        filterBadge.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        return filterBadge;
    }
    createToolBar(container) {
        return this.instantiationService.createInstance(MenuWorkbenchToolBar, container, viewFilterMenu, {
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            actionViewItemProvider: (action, options) => {
                if (action instanceof SubmenuItemAction &&
                    action.item.submenu.id === viewFilterSubmenu.id) {
                    this.moreFiltersActionViewItem = this.instantiationService.createInstance(MoreFiltersActionViewItem, action, options);
                    this.moreFiltersActionViewItem.checked = this.isMoreFiltersChecked;
                    return this.moreFiltersActionViewItem;
                }
                return undefined;
            },
        });
    }
    onDidInputChange(inputbox) {
        inputbox.addToHistory();
        this._onDidChangeFilterText.fire(inputbox.value);
    }
    adjustInputBox() {
        this.filterInputBox.inputElement.style.paddingRight =
            this.element.classList.contains('small') || this.filterBadge.classList.contains('hidden')
                ? '25px'
                : '150px';
    }
    // Action toolbar is swallowing some keys for action items which should not be for an input box
    handleKeyboardEvent(event) {
        if (event.equals(10 /* KeyCode.Space */) ||
            event.equals(15 /* KeyCode.LeftArrow */) ||
            event.equals(17 /* KeyCode.RightArrow */) ||
            event.equals(14 /* KeyCode.Home */) ||
            event.equals(13 /* KeyCode.End */)) {
            event.stopPropagation();
        }
    }
    onInputKeyDown(event, filterInputBox) {
        let handled = false;
        if (event.equals(2 /* KeyCode.Tab */) && !this.toolbar.isEmpty()) {
            this.toolbar.focus();
            handled = true;
        }
        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
};
FilterWidget = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextViewService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService)
], FilterWidget);
export { FilterWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0ZpbHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3ZpZXdzL3ZpZXdGaWx0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFLdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFDTixlQUFlLEVBQ2YsZUFBZSxFQUNmLGNBQWMsRUFDZCxhQUFhLEdBQ2IsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDakgsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDL0csT0FBTyxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osaUJBQWlCLEdBQ2pCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSwwQkFB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