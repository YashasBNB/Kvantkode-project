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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { BaseActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { Delayer } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ContextScopedSuggestEnabledInputWithHistory, } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { testingFilterIcon } from './icons.js';
import { StoredValue } from '../common/storedValue.js';
import { ITestExplorerFilterState } from '../common/testExplorerFilterState.js';
import { ITestService } from '../common/testService.js';
import { denamespaceTestTag } from '../common/testTypes.js';
const testFilterDescriptions = {
    ["@failed" /* TestFilterTerm.Failed */]: localize('testing.filters.showOnlyFailed', 'Show Only Failed Tests'),
    ["@executed" /* TestFilterTerm.Executed */]: localize('testing.filters.showOnlyExecuted', 'Show Only Executed Tests'),
    ["@doc" /* TestFilterTerm.CurrentDoc */]: localize('testing.filters.currentFile', 'Show in Active File Only'),
    ["@openedFiles" /* TestFilterTerm.OpenedFiles */]: localize('testing.filters.openedFiles', 'Show in Opened Files Only'),
    ["@hidden" /* TestFilterTerm.Hidden */]: localize('testing.filters.showExcludedTests', 'Show Hidden Tests'),
};
let TestingExplorerFilter = class TestingExplorerFilter extends BaseActionViewItem {
    constructor(action, options, state, instantiationService, testService) {
        super(null, action, options);
        this.state = state;
        this.instantiationService = instantiationService;
        this.testService = testService;
        this.focusEmitter = this._register(new Emitter());
        this.onDidFocus = this.focusEmitter.event;
        this.history = this._register(this.instantiationService.createInstance(StoredValue, {
            key: 'testing.filterHistory2',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
        }));
        this.filtersAction = new Action('markersFiltersAction', localize('testing.filters.menu', 'More Filters...'), 'testing-filter-button ' + ThemeIcon.asClassName(testingFilterIcon));
        this.updateFilterActiveState();
        this._register(testService.excluded.onTestExclusionsChanged(this.updateFilterActiveState, this));
    }
    /**
     * @override
     */
    render(container) {
        container.classList.add('testing-filter-action-item');
        const updateDelayer = this._register(new Delayer(400));
        const wrapper = (this.wrapper = dom.$('.testing-filter-wrapper'));
        container.appendChild(wrapper);
        let history = this.history.get({ lastValue: '', values: [] });
        if (history instanceof Array) {
            history = { lastValue: '', values: history };
        }
        if (history.lastValue) {
            this.state.setText(history.lastValue);
        }
        const input = (this.input = this._register(this.instantiationService.createInstance(ContextScopedSuggestEnabledInputWithHistory, {
            id: 'testing.explorer.filter',
            ariaLabel: localize('testExplorerFilterLabel', 'Filter text for tests in the explorer'),
            parent: wrapper,
            suggestionProvider: {
                triggerCharacters: ['@'],
                provideResults: () => [
                    ...Object.entries(testFilterDescriptions).map(([label, detail]) => ({
                        label,
                        detail,
                    })),
                    ...Iterable.map(this.testService.collection.tags.values(), (tag) => {
                        const { ctrlId, tagId } = denamespaceTestTag(tag.id);
                        const insertText = `@${ctrlId}:${tagId}`;
                        return {
                            label: `@${ctrlId}:${tagId}`,
                            detail: this.testService.collection.getNodeById(ctrlId)?.item.label,
                            insertText: tagId.includes(' ')
                                ? `@${ctrlId}:"${tagId.replace(/(["\\])/g, '\\$1')}"`
                                : insertText,
                        };
                    }),
                ].filter((r) => !this.state.text.value.includes(r.label)),
            },
            resourceHandle: 'testing:filter',
            suggestOptions: {
                value: this.state.text.value,
                placeholderText: localize('testExplorerFilter', 'Filter (e.g. text, !exclude, @tag)'),
            },
            history: history.values,
        })));
        this._register(this.state.text.onDidChange((newValue) => {
            if (input.getValue() !== newValue) {
                input.setValue(newValue);
            }
        }));
        this._register(this.state.onDidRequestInputFocus(() => {
            input.focus();
        }));
        this._register(input.onDidFocus(() => {
            this.focusEmitter.fire();
        }));
        this._register(input.onInputDidChange(() => updateDelayer.trigger(() => {
            input.addToHistory();
            this.state.setText(input.getValue());
        })));
        const actionbar = this._register(new ActionBar(container, {
            actionViewItemProvider: (action, options) => {
                if (action.id === this.filtersAction.id) {
                    return this.instantiationService.createInstance(FiltersDropdownMenuActionViewItem, action, options, this.state, this.actionRunner);
                }
                return undefined;
            },
        }));
        actionbar.push(this.filtersAction, { icon: true, label: false });
        this.layout(this.wrapper.clientWidth);
    }
    layout(width) {
        this.input.layout(new dom.Dimension(width -
            /* horizontal padding */ 24 -
            /* editor padding */ 8 -
            /* filter button padding */ 22, 20));
    }
    /**
     * Focuses the filter input.
     */
    focus() {
        this.input.focus();
    }
    /**
     * Persists changes to the input history.
     */
    saveState() {
        this.history.store({ lastValue: this.input.getValue(), values: this.input.getHistory() });
    }
    /**
     * @override
     */
    dispose() {
        this.saveState();
        super.dispose();
    }
    /**
     * Updates the 'checked' state of the filter submenu.
     */
    updateFilterActiveState() {
        this.filtersAction.checked = this.testService.excluded.hasAny;
    }
};
TestingExplorerFilter = __decorate([
    __param(2, ITestExplorerFilterState),
    __param(3, IInstantiationService),
    __param(4, ITestService)
], TestingExplorerFilter);
export { TestingExplorerFilter };
let FiltersDropdownMenuActionViewItem = class FiltersDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, filters, actionRunner, contextMenuService, testService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true,
        });
        this.filters = filters;
        this.testService = testService;
    }
    render(container) {
        super.render(container);
        this.updateChecked();
    }
    getActions() {
        return [
            ...[
                "@failed" /* TestFilterTerm.Failed */,
                "@executed" /* TestFilterTerm.Executed */,
                "@doc" /* TestFilterTerm.CurrentDoc */,
                "@openedFiles" /* TestFilterTerm.OpenedFiles */,
            ].map((term) => ({
                checked: this.filters.isFilteringFor(term),
                class: undefined,
                enabled: true,
                id: term,
                label: testFilterDescriptions[term],
                run: () => this.filters.toggleFilteringFor(term),
                tooltip: '',
                dispose: () => null,
            })),
            new Separator(),
            {
                checked: this.filters.fuzzy.value,
                class: undefined,
                enabled: true,
                id: 'fuzzy',
                label: localize('testing.filters.fuzzyMatch', 'Fuzzy Match'),
                run: () => (this.filters.fuzzy.value = !this.filters.fuzzy.value),
                tooltip: '',
            },
            new Separator(),
            {
                checked: this.filters.isFilteringFor("@hidden" /* TestFilterTerm.Hidden */),
                class: undefined,
                enabled: this.testService.excluded.hasAny,
                id: 'showExcluded',
                label: localize('testing.filters.showExcludedTests', 'Show Hidden Tests'),
                run: () => this.filters.toggleFilteringFor("@hidden" /* TestFilterTerm.Hidden */),
                tooltip: '',
            },
            {
                class: undefined,
                enabled: this.testService.excluded.hasAny,
                id: 'removeExcluded',
                label: localize('testing.filters.removeTestExclusions', 'Unhide All Tests'),
                run: async () => this.testService.excluded.clear(),
                tooltip: '',
            },
        ];
    }
    updateChecked() {
        this.element.classList.toggle('checked', this._action.checked);
    }
};
FiltersDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService),
    __param(5, ITestService)
], FiltersDropdownMenuActionViewItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0V4cGxvcmVyRmlsdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RpbmdFeHBsb3JlckZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0sMERBQTBELENBQUE7QUFFakUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDM0csT0FBTyxFQUFFLE1BQU0sRUFBMEIsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sMkNBQTJDLEdBRzNDLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQzlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RCxP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