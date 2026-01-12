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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0ZpbHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdmlld3Mvdmlld0ZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUt0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkUsT0FBTyxFQUNOLGVBQWUsRUFDZixlQUFlLEVBQ2YsY0FBYyxFQUNkLGFBQWEsR0FDYixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUNqSCxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMvRyxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixpQkFBaUIsR0FDakIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFF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