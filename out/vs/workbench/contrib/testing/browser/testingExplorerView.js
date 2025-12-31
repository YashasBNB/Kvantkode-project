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
var ErrorRenderer_1, TestItemRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { DefaultKeyboardNavigationDelegate, } from '../../../../base/browser/ui/list/listWidget.js';
import { Action, ActionRunner, Separator } from '../../../../base/common/actions.js';
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { RunOnceScheduler, disposableTimeout } from '../../../../base/common/async.js';
import { groupBy } from '../../../../base/common/collections.js';
import { Color, RGBA } from '../../../../base/common/color.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent } from '../../../../base/common/observable.js';
import { fuzzyContains } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isDefined } from '../../../../base/common/types.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../nls.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { MenuEntryActionViewItem, createActionViewItem, getActionBarActions, getFlatContextMenuActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { UnmanagedProgress } from '../../../../platform/progress/common/progress.js';
import { IStorageService, WillSaveStateReason, } from '../../../../platform/storage/common/storage.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { IThemeService, registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, IconBadge, NumberBadge, } from '../../../services/activity/common/activity.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getTestingConfiguration, } from '../common/configuration.js';
import { labelForTestInState, } from '../common/constants.js';
import { StoredValue } from '../common/storedValue.js';
import { ITestExplorerFilterState, } from '../common/testExplorerFilterState.js';
import { TestId } from '../common/testId.js';
import { ITestProfileService, canUseProfileWithTest } from '../common/testProfileService.js';
import { LiveTestResult } from '../common/testResult.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService, testCollectionIsEmpty, } from '../common/testService.js';
import { testProfileBitset, testResultStateToContextValues, } from '../common/testTypes.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingContinuousRunService } from '../common/testingContinuousRunService.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { cmpPriority, isFailedState, isStateWithResult, statesInOrder, } from '../common/testingStates.js';
import { TestItemTreeElement, TestTreeErrorMessage, } from './explorerProjections/index.js';
import { ListProjection } from './explorerProjections/listProjection.js';
import { getTestItemContextOverlay } from './explorerProjections/testItemContextOverlay.js';
import { TestingObjectTree } from './explorerProjections/testingObjectTree.js';
import { TreeProjection } from './explorerProjections/treeProjection.js';
import * as icons from './icons.js';
import './media/testing.css';
import { DebugLastRun, ReRunLastRun } from './testExplorerActions.js';
import { TestingExplorerFilter } from './testingExplorerFilter.js';
import { collectTestStateCounts, getTestProgressText, } from './testingProgressUiService.js';
var LastFocusState;
(function (LastFocusState) {
    LastFocusState[LastFocusState["Input"] = 0] = "Input";
    LastFocusState[LastFocusState["Tree"] = 1] = "Tree";
})(LastFocusState || (LastFocusState = {}));
let TestingExplorerView = class TestingExplorerView extends ViewPane {
    get focusedTreeElements() {
        return this.viewModel.tree.getFocus().filter(isDefined);
    }
    constructor(options, contextMenuService, keybindingService, configurationService, instantiationService, viewDescriptorService, contextKeyService, openerService, themeService, testService, hoverService, testProfileService, commandService, menuService, crService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.testService = testService;
        this.testProfileService = testProfileService;
        this.commandService = commandService;
        this.menuService = menuService;
        this.crService = crService;
        this.filterActionBar = this._register(new MutableDisposable());
        this.discoveryProgress = this._register(new MutableDisposable());
        this.filter = this._register(new MutableDisposable());
        this.filterFocusListener = this._register(new MutableDisposable());
        this.dimensions = { width: 0, height: 0 };
        this.lastFocusState = 0 /* LastFocusState.Input */;
        const relayout = this._register(new RunOnceScheduler(() => this.layoutBody(), 1));
        this._register(this.onDidChangeViewWelcomeState(() => {
            if (!this.shouldShowWelcome()) {
                relayout.schedule();
            }
        }));
        this._register(Event.any(crService.onDidChange, testProfileService.onDidChange)(() => {
            this.updateActions();
        }));
        this._register(testService.collection.onBusyProvidersChange((busy) => {
            this.updateDiscoveryProgress(busy);
        }));
        this._register(testProfileService.onDidChange(() => this.updateActions()));
    }
    shouldShowWelcome() {
        return this.viewModel?.welcomeExperience === 1 /* WelcomeExperience.ForWorkspace */;
    }
    focus() {
        super.focus();
        if (this.lastFocusState === 1 /* LastFocusState.Tree */) {
            this.viewModel.tree.domFocus();
        }
        else {
            this.filter.value?.focus();
        }
    }
    /**
     * Gets include/exclude items in the tree, based either on visible tests
     * or a use selection. If a profile is given, only tests in that profile
     * are collected. If a bitset is given, any test that can run in that
     * bitset is collected.
     */
    getTreeIncludeExclude(profileOrBitset, withinItems, filterToType = 'visible') {
        const projection = this.viewModel.projection.value;
        if (!projection) {
            return { include: [], exclude: [] };
        }
        // To calculate includes and excludes, we include the first children that
        // have a majority of their items included too, and then apply exclusions.
        const include = new Set();
        const exclude = [];
        const runnableWithProfileOrBitset = new Map();
        const isRunnableWithProfileOrBitset = (item) => {
            let value = runnableWithProfileOrBitset.get(item);
            if (value === undefined) {
                value =
                    typeof profileOrBitset === 'number'
                        ? !!this.testProfileService.getDefaultProfileForTest(profileOrBitset, item)
                        : canUseProfileWithTest(profileOrBitset, item);
                runnableWithProfileOrBitset.set(item, value);
            }
            return value;
        };
        const attempt = (element, alreadyIncluded) => {
            // sanity check hasElement since updates are debounced and they may exist
            // but not be rendered yet
            if (!(element instanceof TestItemTreeElement) || !this.viewModel.tree.hasElement(element)) {
                return;
            }
            // If the current node is not visible or runnable in the current profile, it's excluded
            const inTree = this.viewModel.tree.getNode(element);
            if (!inTree.visible) {
                if (alreadyIncluded) {
                    exclude.push(element.test);
                }
                return;
            }
            // Only count relevant children when deciding whether to include this node, #229120
            const visibleRunnableChildren = inTree.children.filter((c) => c.visible &&
                c.element instanceof TestItemTreeElement &&
                isRunnableWithProfileOrBitset(c.element.test)).length;
            // If it's not already included but most of its children are, then add it
            // if it can be run under the current profile (when specified)
            if (
            // If it's not already included...
            !alreadyIncluded &&
                // And it can be run using the current profile (if any)
                isRunnableWithProfileOrBitset(element.test) &&
                // And either it's a leaf node or most children are included, the  include it.
                (visibleRunnableChildren === 0 || visibleRunnableChildren * 2 >= inTree.children.length) &&
                // And not if we're only showing a single of its children, since it
                // probably fans out later. (Worse case we'll directly include its single child)
                visibleRunnableChildren !== 1) {
                include.add(element.test);
                alreadyIncluded = true;
            }
            // Recurse ✨
            for (const child of element.children) {
                attempt(child, alreadyIncluded);
            }
        };
        if (filterToType === 'selected') {
            const sel = this.viewModel.tree.getSelection().filter(isDefined);
            if (sel.length) {
                L: for (const node of sel) {
                    if (node instanceof TestItemTreeElement) {
                        // avoid adding an item if its parent is already included
                        for (let i = node; i; i = i.parent) {
                            if (include.has(i.test)) {
                                continue L;
                            }
                        }
                        include.add(node.test);
                        node.children.forEach((c) => attempt(c, true));
                    }
                }
                return { include: [...include], exclude };
            }
        }
        for (const root of withinItems || this.testService.collection.rootItems) {
            const element = projection.getElementByTestId(root.item.extId);
            if (!element) {
                continue;
            }
            if (typeof profileOrBitset === 'object' && !canUseProfileWithTest(profileOrBitset, root)) {
                continue;
            }
            // single controllers won't have visible root ID nodes, handle that  case specially
            if (!this.viewModel.tree.hasElement(element)) {
                const visibleChildren = [...element.children].reduce((acc, c) => this.viewModel.tree.hasElement(c) && this.viewModel.tree.getNode(c).visible
                    ? acc + 1
                    : acc, 0);
                // note we intentionally check children > 0 here, unlike above, since
                // we don't want to bother dispatching to controllers who have no discovered tests
                if (element.children.size > 0 && visibleChildren * 2 >= element.children.size) {
                    include.add(element.test);
                    element.children.forEach((c) => attempt(c, true));
                }
                else {
                    element.children.forEach((c) => attempt(c, false));
                }
            }
            else {
                attempt(element, false);
            }
        }
        return { include: [...include], exclude };
    }
    render() {
        super.render();
        this._register(registerNavigableContainer({
            name: 'testingExplorerView',
            focusNotifiers: [this],
            focusNextWidget: () => {
                if (!this.viewModel.tree.isDOMFocused()) {
                    this.viewModel.tree.domFocus();
                }
            },
            focusPreviousWidget: () => {
                if (this.viewModel.tree.isDOMFocused()) {
                    this.filter.value?.focus();
                }
            },
        }));
    }
    /**
     * @override
     */
    renderBody(container) {
        super.renderBody(container);
        this.container = dom.append(container, dom.$('.test-explorer'));
        this.treeHeader = dom.append(this.container, dom.$('.test-explorer-header'));
        this.filterActionBar.value = this.createFilterActionBar();
        const messagesContainer = dom.append(this.treeHeader, dom.$('.result-summary-container'));
        this._register(this.instantiationService.createInstance(ResultSummaryView, messagesContainer));
        const listContainer = dom.append(this.container, dom.$('.test-explorer-tree'));
        this.viewModel = this.instantiationService.createInstance(TestingExplorerViewModel, listContainer, this.onDidChangeBodyVisibility);
        this._register(this.viewModel.tree.onDidFocus(() => (this.lastFocusState = 1 /* LastFocusState.Tree */)));
        this._register(this.viewModel.onChangeWelcomeVisibility(() => this._onDidChangeViewWelcomeState.fire()));
        this._register(this.viewModel);
        this._onDidChangeViewWelcomeState.fire();
    }
    /** @override  */
    createActionViewItem(action, options) {
        switch (action.id) {
            case "workbench.actions.treeView.testExplorer.filter" /* TestCommandId.FilterAction */:
                this.filter.value = this.instantiationService.createInstance(TestingExplorerFilter, action, options);
                this.filterFocusListener.value = this.filter.value.onDidFocus(() => (this.lastFocusState = 0 /* LastFocusState.Input */));
                return this.filter.value;
            case "testing.runSelected" /* TestCommandId.RunSelectedAction */:
                return this.getRunGroupDropdown(2 /* TestRunProfileBitset.Run */, action, options);
            case "testing.debugSelected" /* TestCommandId.DebugSelectedAction */:
                return this.getRunGroupDropdown(4 /* TestRunProfileBitset.Debug */, action, options);
            case "testing.startContinuousRun" /* TestCommandId.StartContinousRun */:
            case "testing.stopContinuousRun" /* TestCommandId.StopContinousRun */:
                return this.getContinuousRunDropdown(action, options);
            default:
                return super.createActionViewItem(action, options);
        }
    }
    /** @inheritdoc */
    getTestConfigGroupActions(group) {
        const profileActions = [];
        let participatingGroups = 0;
        let participatingProfiles = 0;
        let hasConfigurable = false;
        const defaults = this.testProfileService.getGroupDefaultProfiles(group);
        for (const { profiles, controller } of this.testProfileService.all()) {
            let hasAdded = false;
            for (const profile of profiles) {
                if (profile.group !== group) {
                    continue;
                }
                if (!hasAdded) {
                    hasAdded = true;
                    participatingGroups++;
                    profileActions.push(new Action(`${controller.id}.$root`, controller.label.get(), undefined, false));
                }
                hasConfigurable = hasConfigurable || profile.hasConfigurationHandler;
                participatingProfiles++;
                profileActions.push(new Action(`${controller.id}.${profile.profileId}`, defaults.includes(profile)
                    ? localize('defaultTestProfile', '{0} (Default)', profile.label)
                    : profile.label, undefined, undefined, () => {
                    const { include, exclude } = this.getTreeIncludeExclude(profile);
                    this.testService.runResolvedTests({
                        exclude: exclude.map((e) => e.item.extId),
                        group: profile.group,
                        targets: [
                            {
                                profileId: profile.profileId,
                                controllerId: profile.controllerId,
                                testIds: include.map((i) => i.item.extId),
                            },
                        ],
                    });
                }));
            }
        }
        const contextKeys = [];
        // allow extension author to define context for when to show the test menu actions for run or debug menus
        if (group === 2 /* TestRunProfileBitset.Run */) {
            contextKeys.push(['testing.profile.context.group', 'run']);
        }
        if (group === 4 /* TestRunProfileBitset.Debug */) {
            contextKeys.push(['testing.profile.context.group', 'debug']);
        }
        if (group === 8 /* TestRunProfileBitset.Coverage */) {
            contextKeys.push(['testing.profile.context.group', 'coverage']);
        }
        const key = this.contextKeyService.createOverlay(contextKeys);
        const menu = this.menuService.getMenuActions(MenuId.TestProfilesContext, key);
        // fill if there are any actions
        const menuActions = getFlatContextMenuActions(menu);
        const postActions = [];
        if (participatingProfiles > 1) {
            postActions.push(new Action('selectDefaultTestConfigurations', localize('selectDefaultConfigs', 'Select Default Profile'), undefined, undefined, () => this.commandService.executeCommand("testing.selectDefaultTestProfiles" /* TestCommandId.SelectDefaultTestProfiles */, group)));
        }
        if (hasConfigurable) {
            postActions.push(new Action('configureTestProfiles', localize('configureTestProfiles', 'Configure Test Profiles'), undefined, undefined, () => this.commandService.executeCommand("testing.configureProfile" /* TestCommandId.ConfigureTestProfilesAction */, group)));
        }
        // show menu actions if there are any otherwise don't
        return {
            numberOfProfiles: participatingProfiles,
            actions: menuActions.length > 0
                ? Separator.join(profileActions, menuActions, postActions)
                : Separator.join(profileActions, postActions),
        };
    }
    /**
     * @override
     */
    saveState() {
        this.filter.value?.saveState();
        super.saveState();
    }
    getRunGroupDropdown(group, defaultAction, options) {
        const dropdownActions = this.getTestConfigGroupActions(group);
        if (dropdownActions.numberOfProfiles < 2) {
            return super.createActionViewItem(defaultAction, options);
        }
        const primaryAction = this.instantiationService.createInstance(MenuItemAction, {
            id: defaultAction.id,
            title: defaultAction.label,
            icon: group === 2 /* TestRunProfileBitset.Run */ ? icons.testingRunAllIcon : icons.testingDebugAllIcon,
        }, undefined, undefined, undefined, undefined);
        return this.instantiationService.createInstance(DropdownWithPrimaryActionViewItem, primaryAction, this.getDropdownAction(), dropdownActions.actions, '', options);
    }
    getDropdownAction() {
        return new Action('selectRunConfig', localize('testingSelectConfig', 'Select Configuration...'), 'codicon-chevron-down', true);
    }
    getContinuousRunDropdown(defaultAction, options) {
        const allProfiles = [
            ...Iterable.flatMap(this.testProfileService.all(), (cr) => {
                if (this.testService.collection.getNodeById(cr.controller.id)?.children.size) {
                    return Iterable.filter(cr.profiles, (p) => p.supportsContinuousRun);
                }
                return Iterable.empty();
            }),
        ];
        if (allProfiles.length <= 1) {
            return super.createActionViewItem(defaultAction, options);
        }
        const primaryAction = this.instantiationService.createInstance(MenuItemAction, {
            id: defaultAction.id,
            title: defaultAction.label,
            icon: defaultAction.id === "testing.startContinuousRun" /* TestCommandId.StartContinousRun */
                ? icons.testingTurnContinuousRunOn
                : icons.testingTurnContinuousRunOff,
        }, undefined, undefined, undefined, undefined);
        const dropdownActions = [];
        const groups = groupBy(allProfiles, (p) => p.group);
        const crService = this.crService;
        for (const group of [
            2 /* TestRunProfileBitset.Run */,
            4 /* TestRunProfileBitset.Debug */,
            8 /* TestRunProfileBitset.Coverage */,
        ]) {
            const profiles = groups[group];
            if (!profiles) {
                continue;
            }
            if (Object.keys(groups).length > 1) {
                dropdownActions.push({
                    id: `${group}.label`,
                    label: testProfileBitset[group],
                    enabled: false,
                    class: undefined,
                    tooltip: testProfileBitset[group],
                    run: () => { },
                });
            }
            for (const profile of profiles) {
                dropdownActions.push({
                    id: `${group}.${profile.profileId}`,
                    label: profile.label,
                    enabled: true,
                    class: undefined,
                    tooltip: profile.label,
                    checked: crService.isEnabledForProfile(profile),
                    run: () => crService.isEnabledForProfile(profile)
                        ? crService.stopProfile(profile)
                        : crService.start([profile]),
                });
            }
        }
        return this.instantiationService.createInstance(DropdownWithPrimaryActionViewItem, primaryAction, this.getDropdownAction(), dropdownActions, '', options);
    }
    createFilterActionBar() {
        const bar = new ActionBar(this.treeHeader, {
            actionViewItemProvider: (action, options) => this.createActionViewItem(action, options),
            triggerKeys: { keyDown: false, keys: [] },
        });
        bar.push(new Action("workbench.actions.treeView.testExplorer.filter" /* TestCommandId.FilterAction */));
        bar.getContainer().classList.add('testing-filter-action-bar');
        return bar;
    }
    updateDiscoveryProgress(busy) {
        if (!busy && this.discoveryProgress) {
            this.discoveryProgress.clear();
        }
        else if (busy && !this.discoveryProgress.value) {
            this.discoveryProgress.value = this.instantiationService.createInstance(UnmanagedProgress, {
                location: this.getProgressLocation(),
            });
        }
    }
    /**
     * @override
     */
    layoutBody(height = this.dimensions.height, width = this.dimensions.width) {
        super.layoutBody(height, width);
        this.dimensions.height = height;
        this.dimensions.width = width;
        this.container.style.height = `${height}px`;
        this.viewModel?.layout(height - this.treeHeader.clientHeight, width);
        this.filter.value?.layout(width);
    }
};
TestingExplorerView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IKeybindingService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IViewDescriptorService),
    __param(6, IContextKeyService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, ITestService),
    __param(10, IHoverService),
    __param(11, ITestProfileService),
    __param(12, ICommandService),
    __param(13, IMenuService),
    __param(14, ITestingContinuousRunService)
], TestingExplorerView);
export { TestingExplorerView };
const SUMMARY_RENDER_INTERVAL = 200;
let ResultSummaryView = class ResultSummaryView extends Disposable {
    constructor(container, resultService, activityService, crService, configurationService, instantiationService, hoverService) {
        super();
        this.container = container;
        this.resultService = resultService;
        this.activityService = activityService;
        this.crService = crService;
        this.elementsWereAttached = false;
        this.badgeDisposable = this._register(new MutableDisposable());
        this.renderLoop = this._register(new RunOnceScheduler(() => this.render(), SUMMARY_RENDER_INTERVAL));
        this.elements = dom.h('div.result-summary', [
            dom.h('div@status'),
            dom.h('div@count'),
            dom.h('div@count'),
            dom.h('span'),
            dom.h('duration@duration'),
            dom.h('a@rerun'),
        ]);
        this.badgeType = configurationService.getValue("testing.countBadge" /* TestingConfigKeys.CountBadge */);
        this._register(resultService.onResultsChanged(this.render, this));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("testing.countBadge" /* TestingConfigKeys.CountBadge */)) {
                this.badgeType = configurationService.getValue("testing.countBadge" /* TestingConfigKeys.CountBadge */);
                this.render();
            }
        }));
        this.countHover = this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.elements.count, ''));
        const ab = this._register(new ActionBar(this.elements.rerun, {
            actionViewItemProvider: (action, options) => createActionViewItem(instantiationService, action, options),
        }));
        ab.push(instantiationService.createInstance(MenuItemAction, { ...new ReRunLastRun().desc, icon: icons.testingRerunIcon }, { ...new DebugLastRun().desc, icon: icons.testingDebugIcon }, {}, undefined, undefined), { icon: true, label: false });
        this.render();
    }
    render() {
        const { results } = this.resultService;
        const { count, root, status, duration, rerun } = this.elements;
        if (!results.length) {
            if (this.elementsWereAttached) {
                root.remove();
                this.elementsWereAttached = false;
            }
            this.container.innerText = localize('noResults', 'No test results yet.');
            this.badgeDisposable.clear();
            return;
        }
        const live = results.filter((r) => !r.completedAt);
        let counts;
        if (live.length) {
            status.className = ThemeIcon.asClassName(spinningLoading);
            counts = collectTestStateCounts(true, live);
            this.renderLoop.schedule();
            const last = live[live.length - 1];
            duration.textContent = formatDuration(Date.now() - last.startedAt);
            rerun.style.display = 'none';
        }
        else {
            const last = results[0];
            const dominantState = mapFindFirst(statesInOrder, (s) => (last.counts[s] > 0 ? s : undefined));
            status.className = ThemeIcon.asClassName(icons.testingStatesToIcons.get(dominantState ?? 0 /* TestResultState.Unset */));
            counts = collectTestStateCounts(false, [last]);
            duration.textContent =
                last instanceof LiveTestResult ? formatDuration(last.completedAt - last.startedAt) : '';
            rerun.style.display = 'block';
        }
        count.textContent = `${counts.passed}/${counts.totalWillBeRun}`;
        this.countHover.update(getTestProgressText(counts));
        this.renderActivityBadge(counts);
        if (!this.elementsWereAttached) {
            dom.clearNode(this.container);
            this.container.appendChild(root);
            this.elementsWereAttached = true;
        }
    }
    renderActivityBadge(countSummary) {
        if (countSummary &&
            this.badgeType !== "off" /* TestingCountBadge.Off */ &&
            countSummary[this.badgeType] !== 0) {
            if (this.lastBadge instanceof NumberBadge &&
                this.lastBadge.number === countSummary[this.badgeType]) {
                return;
            }
            this.lastBadge = new NumberBadge(countSummary[this.badgeType], (num) => this.getLocalizedBadgeString(this.badgeType, num));
        }
        else if (this.crService.isEnabled()) {
            if (this.lastBadge instanceof IconBadge &&
                this.lastBadge.icon === icons.testingContinuousIsOn) {
                return;
            }
            this.lastBadge = new IconBadge(icons.testingContinuousIsOn, () => localize('testingContinuousBadge', 'Tests are being watched for changes'));
        }
        else {
            if (!this.lastBadge) {
                return;
            }
            this.lastBadge = undefined;
        }
        this.badgeDisposable.value =
            this.lastBadge &&
                this.activityService.showViewActivity("workbench.view.testing" /* Testing.ExplorerViewId */, { badge: this.lastBadge });
    }
    getLocalizedBadgeString(countBadgeType, count) {
        switch (countBadgeType) {
            case "passed" /* TestingCountBadge.Passed */:
                return localize('testingCountBadgePassed', '{0} passed tests', count);
            case "skipped" /* TestingCountBadge.Skipped */:
                return localize('testingCountBadgeSkipped', '{0} skipped tests', count);
            default:
                return localize('testingCountBadgeFailed', '{0} failed tests', count);
        }
    }
};
ResultSummaryView = __decorate([
    __param(1, ITestResultService),
    __param(2, IActivityService),
    __param(3, ITestingContinuousRunService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IHoverService)
], ResultSummaryView);
var WelcomeExperience;
(function (WelcomeExperience) {
    WelcomeExperience[WelcomeExperience["None"] = 0] = "None";
    WelcomeExperience[WelcomeExperience["ForWorkspace"] = 1] = "ForWorkspace";
    WelcomeExperience[WelcomeExperience["ForDocument"] = 2] = "ForDocument";
})(WelcomeExperience || (WelcomeExperience = {}));
let TestingExplorerViewModel = class TestingExplorerViewModel extends Disposable {
    get viewMode() {
        return this._viewMode.get() ?? "true" /* TestExplorerViewMode.Tree */;
    }
    set viewMode(newMode) {
        if (newMode === this._viewMode.get()) {
            return;
        }
        this._viewMode.set(newMode);
        this.updatePreferredProjection();
        this.storageService.store('testing.viewMode', newMode, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    get viewSorting() {
        return this._viewSorting.get() ?? "status" /* TestExplorerViewSorting.ByStatus */;
    }
    set viewSorting(newSorting) {
        if (newSorting === this._viewSorting.get()) {
            return;
        }
        this._viewSorting.set(newSorting);
        this.tree.resort(null);
        this.storageService.store('testing.viewSorting', newSorting, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    constructor(listContainer, onDidChangeVisibility, configurationService, editorService, editorGroupsService, menuService, contextMenuService, testService, filterState, instantiationService, storageService, contextKeyService, testResults, peekOpener, testProfileService, crService, commandService) {
        super();
        this.menuService = menuService;
        this.contextMenuService = contextMenuService;
        this.testService = testService;
        this.filterState = filterState;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.testResults = testResults;
        this.peekOpener = peekOpener;
        this.testProfileService = testProfileService;
        this.crService = crService;
        this.projection = this._register(new MutableDisposable());
        this.revealTimeout = new MutableDisposable();
        this._viewMode = TestingContextKeys.viewMode.bindTo(this.contextKeyService);
        this._viewSorting = TestingContextKeys.viewSorting.bindTo(this.contextKeyService);
        this.welcomeVisibilityEmitter = new Emitter();
        this.actionRunner = this._register(new TestExplorerActionRunner(() => this.tree.getSelection().filter(isDefined)));
        this.lastViewState = this._register(new StoredValue({
            key: 'testing.treeState',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
        }, this.storageService));
        /**
         * Whether there's a reveal request which has not yet been delivered. This
         * can happen if the user asks to reveal before the test tree is loaded.
         * We check to see if the reveal request is present on each tree update,
         * and do it then if so.
         */
        this.hasPendingReveal = false;
        /**
         * Fires when the visibility of the placeholder state changes.
         */
        this.onChangeWelcomeVisibility = this.welcomeVisibilityEmitter.event;
        /**
         * Gets whether the welcome should be visible.
         */
        this.welcomeExperience = 0 /* WelcomeExperience.None */;
        this.hasPendingReveal = !!filterState.reveal.get();
        this.noTestForDocumentWidget = this._register(instantiationService.createInstance(NoTestsForDocumentWidget, listContainer));
        this._viewMode.set(this.storageService.get('testing.viewMode', 1 /* StorageScope.WORKSPACE */, "true" /* TestExplorerViewMode.Tree */));
        this._viewSorting.set(this.storageService.get('testing.viewSorting', 1 /* StorageScope.WORKSPACE */, "location" /* TestExplorerViewSorting.ByLocation */));
        this.reevaluateWelcomeState();
        this.filter = this.instantiationService.createInstance(TestsFilter, testService.collection);
        this.tree = instantiationService.createInstance(TestingObjectTree, 'Test Explorer List', listContainer, new ListDelegate(), [
            instantiationService.createInstance(TestItemRenderer, this.actionRunner),
            instantiationService.createInstance(ErrorRenderer),
        ], {
            identityProvider: instantiationService.createInstance(IdentityProvider),
            hideTwistiesOfChildlessElements: false,
            sorter: instantiationService.createInstance(TreeSorter, this),
            keyboardNavigationLabelProvider: instantiationService.createInstance(TreeKeyboardNavigationLabelProvider),
            accessibilityProvider: instantiationService.createInstance(ListAccessibilityProvider),
            filter: this.filter,
            findWidgetEnabled: false,
        });
        // saves the collapse state so that if items are removed or refreshed, they
        // retain the same state (#170169)
        const collapseStateSaver = this._register(new RunOnceScheduler(() => {
            // reuse the last view state to avoid making a bunch of object garbage:
            const state = this.tree.getOptimizedViewState(this.lastViewState.get({}));
            const projection = this.projection.value;
            if (projection) {
                projection.lastState = state;
            }
        }, 3000));
        this._register(this.tree.onDidChangeCollapseState((evt) => {
            if (evt.node.element instanceof TestItemTreeElement) {
                if (!evt.node.collapsed) {
                    this.projection.value?.expandElement(evt.node.element, evt.deep ? Infinity : 0);
                }
                collapseStateSaver.schedule();
            }
        }));
        this._register(this.crService.onDidChange((testId) => {
            if (testId) {
                // a continuous run test will sort to the top:
                const elem = this.projection.value?.getElementByTestId(testId);
                this.tree.resort(elem?.parent && this.tree.hasElement(elem.parent) ? elem.parent : null, false);
            }
        }));
        this._register(onDidChangeVisibility((visible) => {
            if (visible) {
                this.ensureProjection();
            }
        }));
        this._register(this.tree.onContextMenu((e) => this.onContextMenu(e)));
        this._register(Event.any(filterState.text.onDidChange, filterState.fuzzy.onDidChange, testService.excluded.onTestExclusionsChanged)(() => {
            if (!filterState.text.value) {
                return this.tree.refilter();
            }
            const items = (this.filter.lastIncludedTests = new Set());
            this.tree.refilter();
            this.filter.lastIncludedTests = undefined;
            for (const test of items) {
                this.tree.expandTo(test);
            }
        }));
        this._register(this.tree.onDidOpen((e) => {
            if (!(e.element instanceof TestItemTreeElement)) {
                return;
            }
            filterState.didSelectTestInExplorer(e.element.test.item.extId);
            if (!e.element.children.size && e.element.test.item.uri) {
                if (!this.tryPeekError(e.element)) {
                    commandService.executeCommand('vscode.revealTest', e.element.test.item.extId, {
                        openToSide: e.sideBySide,
                        preserveFocus: true,
                    });
                }
            }
        }));
        this._register(this.tree);
        this._register(this.onChangeWelcomeVisibility((e) => {
            this.noTestForDocumentWidget.setVisible(e === 2 /* WelcomeExperience.ForDocument */);
        }));
        this._register(dom.addStandardDisposableListener(this.tree.getHTMLElement(), 'keydown', (evt) => {
            if (evt.equals(3 /* KeyCode.Enter */)) {
                this.handleExecuteKeypress(evt);
            }
            else if (DefaultKeyboardNavigationDelegate.mightProducePrintableCharacter(evt)) {
                filterState.text.value = evt.browserEvent.key;
                filterState.focusInput();
            }
        }));
        this._register(autorun((reader) => {
            this.revealById(filterState.reveal.read(reader), undefined, false);
        }));
        this._register(onDidChangeVisibility((visible) => {
            if (visible) {
                filterState.focusInput();
            }
        }));
        let followRunningTests = getTestingConfiguration(configurationService, "testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */);
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */)) {
                followRunningTests = getTestingConfiguration(configurationService, "testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */);
            }
        }));
        let alwaysRevealTestAfterStateChange = getTestingConfiguration(configurationService, "testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */);
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */)) {
                alwaysRevealTestAfterStateChange = getTestingConfiguration(configurationService, "testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */);
            }
        }));
        this._register(testResults.onTestChanged((evt) => {
            if (!followRunningTests) {
                return;
            }
            if (evt.reason !== 1 /* TestResultItemChangeReason.OwnStateChange */) {
                return;
            }
            if (this.tree.selectionSize > 1) {
                return; // don't change a multi-selection #180950
            }
            // follow running tests, or tests whose state changed. Tests that
            // complete very fast may not enter the running state at all.
            if (evt.item.ownComputedState !== 2 /* TestResultState.Running */ &&
                !(evt.previousState === 1 /* TestResultState.Queued */ &&
                    isStateWithResult(evt.item.ownComputedState))) {
                return;
            }
            this.revealById(evt.item.item.extId, alwaysRevealTestAfterStateChange, false);
        }));
        this._register(testResults.onResultsChanged(() => {
            this.tree.resort(null);
        }));
        this._register(this.testProfileService.onDidChange(() => {
            this.tree.rerender();
        }));
        const allOpenEditorInputs = observableFromEvent(this, editorService.onDidEditorsChange, () => new Set(editorGroupsService.groups
            .flatMap((g) => g.editors)
            .map((e) => e.resource)
            .filter(isDefined)));
        const activeResource = observableFromEvent(this, editorService.onDidActiveEditorChange, () => {
            if (editorService.activeEditor instanceof DiffEditorInput) {
                return editorService.activeEditor.primary.resource;
            }
            else {
                return editorService.activeEditor?.resource;
            }
        });
        const filterText = observableFromEvent(this.filterState.text.onDidChange, () => this.filterState.text);
        this._register(autorun((reader) => {
            filterText.read(reader);
            if (this.filterState.isFilteringFor("@openedFiles" /* TestFilterTerm.OpenedFiles */)) {
                this.filter.filterToDocumentUri([...allOpenEditorInputs.read(reader)]);
            }
            else {
                this.filter.filterToDocumentUri([activeResource.read(reader)].filter(isDefined));
            }
            if (this.filterState.isFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */) ||
                this.filterState.isFilteringFor("@openedFiles" /* TestFilterTerm.OpenedFiles */)) {
                this.tree.refilter();
            }
        }));
        this._register(this.storageService.onWillSaveState(({ reason }) => {
            if (reason === WillSaveStateReason.SHUTDOWN) {
                this.lastViewState.store(this.tree.getOptimizedViewState());
            }
        }));
    }
    /**
     * Re-layout the tree.
     */
    layout(height, width) {
        this.tree.layout(height, width);
    }
    /**
     * Tries to reveal by extension ID. Queues the request if the extension
     * ID is not currently available.
     */
    revealById(id, expand = true, focus = true) {
        if (!id) {
            this.hasPendingReveal = false;
            return;
        }
        const projection = this.ensureProjection();
        // If the item itself is visible in the tree, show it. Otherwise, expand
        // its closest parent.
        let expandToLevel = 0;
        const idPath = [...TestId.fromString(id).idsFromRoot()];
        for (let i = idPath.length - 1; i >= expandToLevel; i--) {
            const element = projection.getElementByTestId(idPath[i].toString());
            // Skip all elements that aren't in the tree.
            if (!element || !this.tree.hasElement(element)) {
                continue;
            }
            // If this 'if' is true, we're at the closest-visible parent to the node
            // we want to expand. Expand that, and then start the loop again because
            // we might already have children for it.
            if (i < idPath.length - 1) {
                if (expand) {
                    this.tree.expand(element);
                    expandToLevel = i + 1; // avoid an infinite loop if the test does not exist
                    i = idPath.length - 1; // restart the loop since new children may now be visible
                    continue;
                }
            }
            // Otherwise, we've arrived!
            // If the node or any of its children are excluded, flip on the 'show
            // excluded tests' checkbox automatically. If we didn't expand, then set
            // target focus target to the first collapsed element.
            let focusTarget = element;
            for (let n = element; n instanceof TestItemTreeElement; n = n.parent) {
                if (n.test && this.testService.excluded.contains(n.test)) {
                    this.filterState.toggleFilteringFor("@hidden" /* TestFilterTerm.Hidden */, true);
                    break;
                }
                if (!expand && this.tree.hasElement(n) && this.tree.isCollapsed(n)) {
                    focusTarget = n;
                }
            }
            this.filterState.reveal.set(undefined, undefined);
            this.hasPendingReveal = false;
            if (focus) {
                this.tree.domFocus();
            }
            if (this.tree.getRelativeTop(focusTarget) === null) {
                this.tree.reveal(focusTarget, 0.5);
            }
            this.revealTimeout.value = disposableTimeout(() => {
                this.tree.setFocus([focusTarget]);
                this.tree.setSelection([focusTarget]);
            }, 1);
            return;
        }
        // If here, we've expanded all parents we can. Waiting on data to come
        // in to possibly show the revealed test.
        this.hasPendingReveal = true;
    }
    /**
     * Collapse all items in the tree.
     */
    async collapseAll() {
        this.tree.collapseAll();
    }
    /**
     * Tries to peek the first test error, if the item is in a failed state.
     */
    tryPeekError(item) {
        const lookup = item.test && this.testResults.getStateById(item.test.item.extId);
        return lookup && lookup[1].tasks.some((s) => isFailedState(s.state))
            ? this.peekOpener.tryPeekFirstError(lookup[0], lookup[1], { preserveFocus: true })
            : false;
    }
    onContextMenu(evt) {
        const element = evt.element;
        if (!(element instanceof TestItemTreeElement)) {
            return;
        }
        const { actions } = getActionableElementActions(this.contextKeyService, this.menuService, this.testService, this.crService, this.testProfileService, element);
        this.contextMenuService.showContextMenu({
            getAnchor: () => evt.anchor,
            getActions: () => actions.secondary,
            getActionsContext: () => element,
            actionRunner: this.actionRunner,
        });
    }
    handleExecuteKeypress(evt) {
        const focused = this.tree.getFocus();
        const selected = this.tree.getSelection();
        let targeted;
        if (focused.length === 1 && selected.includes(focused[0])) {
            evt.browserEvent?.preventDefault();
            targeted = selected;
        }
        else {
            targeted = focused;
        }
        const toRun = targeted.filter((e) => e instanceof TestItemTreeElement);
        if (toRun.length) {
            this.testService.runTests({
                group: 2 /* TestRunProfileBitset.Run */,
                tests: toRun.map((t) => t.test),
            });
        }
    }
    reevaluateWelcomeState() {
        const shouldShowWelcome = this.testService.collection.busyProviders === 0 &&
            testCollectionIsEmpty(this.testService.collection);
        const welcomeExperience = shouldShowWelcome
            ? this.filterState.isFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */)
                ? 2 /* WelcomeExperience.ForDocument */
                : 1 /* WelcomeExperience.ForWorkspace */
            : 0 /* WelcomeExperience.None */;
        if (welcomeExperience !== this.welcomeExperience) {
            this.welcomeExperience = welcomeExperience;
            this.welcomeVisibilityEmitter.fire(welcomeExperience);
        }
    }
    ensureProjection() {
        return this.projection.value ?? this.updatePreferredProjection();
    }
    updatePreferredProjection() {
        this.projection.clear();
        const lastState = this.lastViewState.get({});
        if (this._viewMode.get() === "list" /* TestExplorerViewMode.List */) {
            this.projection.value = this.instantiationService.createInstance(ListProjection, lastState);
        }
        else {
            this.projection.value = this.instantiationService.createInstance(TreeProjection, lastState);
        }
        const scheduler = this._register(new RunOnceScheduler(() => this.applyProjectionChanges(), 200));
        this.projection.value.onUpdate(() => {
            if (!scheduler.isScheduled()) {
                scheduler.schedule();
            }
        });
        this.applyProjectionChanges();
        return this.projection.value;
    }
    applyProjectionChanges() {
        this.reevaluateWelcomeState();
        this.projection.value?.applyTo(this.tree);
        this.tree.refilter();
        if (this.hasPendingReveal) {
            this.revealById(this.filterState.reveal.get());
        }
    }
    /**
     * Gets the selected tests from the tree.
     */
    getSelectedTests() {
        return this.tree.getSelection();
    }
};
TestingExplorerViewModel = __decorate([
    __param(2, IConfigurationService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, IMenuService),
    __param(6, IContextMenuService),
    __param(7, ITestService),
    __param(8, ITestExplorerFilterState),
    __param(9, IInstantiationService),
    __param(10, IStorageService),
    __param(11, IContextKeyService),
    __param(12, ITestResultService),
    __param(13, ITestingPeekOpener),
    __param(14, ITestProfileService),
    __param(15, ITestingContinuousRunService),
    __param(16, ICommandService)
], TestingExplorerViewModel);
var FilterResult;
(function (FilterResult) {
    FilterResult[FilterResult["Exclude"] = 0] = "Exclude";
    FilterResult[FilterResult["Inherit"] = 1] = "Inherit";
    FilterResult[FilterResult["Include"] = 2] = "Include";
})(FilterResult || (FilterResult = {}));
const hasNodeInOrParentOfUri = (collection, ident, testUri, fromNode) => {
    const queue = [fromNode ? [fromNode] : collection.rootIds];
    while (queue.length) {
        for (const id of queue.pop()) {
            const node = collection.getNodeById(id);
            if (!node) {
                continue;
            }
            if (!node.item.uri || !ident.extUri.isEqualOrParent(testUri, node.item.uri)) {
                continue;
            }
            // Only show nodes that can be expanded (and might have a child with
            // a range) or ones that have a physical location.
            if (node.item.range || node.expand === 1 /* TestItemExpandState.Expandable */) {
                return true;
            }
            queue.push(node.children);
        }
    }
    return false;
};
let TestsFilter = class TestsFilter {
    constructor(collection, state, testService, uriIdentityService) {
        this.collection = collection;
        this.state = state;
        this.testService = testService;
        this.uriIdentityService = uriIdentityService;
        this.documentUris = [];
    }
    /**
     * @inheritdoc
     */
    filter(element) {
        if (element instanceof TestTreeErrorMessage) {
            return 1 /* TreeVisibility.Visible */;
        }
        if (element.test &&
            !this.state.isFilteringFor("@hidden" /* TestFilterTerm.Hidden */) &&
            this.testService.excluded.contains(element.test)) {
            return 0 /* TreeVisibility.Hidden */;
        }
        switch (Math.min(this.testFilterText(element), this.testLocation(element), this.testState(element), this.testTags(element))) {
            case 0 /* FilterResult.Exclude */:
                return 0 /* TreeVisibility.Hidden */;
            case 2 /* FilterResult.Include */:
                this.lastIncludedTests?.add(element);
                return 1 /* TreeVisibility.Visible */;
            default:
                return 2 /* TreeVisibility.Recurse */;
        }
    }
    filterToDocumentUri(uris) {
        this.documentUris = [...uris];
    }
    testTags(element) {
        if (!this.state.includeTags.size && !this.state.excludeTags.size) {
            return 2 /* FilterResult.Include */;
        }
        return (this.state.includeTags.size
            ? element.test.item.tags.some((t) => this.state.includeTags.has(t))
            : true) && element.test.item.tags.every((t) => !this.state.excludeTags.has(t))
            ? 2 /* FilterResult.Include */
            : 1 /* FilterResult.Inherit */;
    }
    testState(element) {
        if (this.state.isFilteringFor("@failed" /* TestFilterTerm.Failed */)) {
            return isFailedState(element.state) ? 2 /* FilterResult.Include */ : 1 /* FilterResult.Inherit */;
        }
        if (this.state.isFilteringFor("@executed" /* TestFilterTerm.Executed */)) {
            return element.state !== 0 /* TestResultState.Unset */ ? 2 /* FilterResult.Include */ : 1 /* FilterResult.Inherit */;
        }
        return 2 /* FilterResult.Include */;
    }
    testLocation(element) {
        if (this.documentUris.length === 0) {
            return 2 /* FilterResult.Include */;
        }
        if ((!this.state.isFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */) &&
            !this.state.isFilteringFor("@openedFiles" /* TestFilterTerm.OpenedFiles */)) ||
            !(element instanceof TestItemTreeElement)) {
            return 2 /* FilterResult.Include */;
        }
        if (this.documentUris.some((uri) => hasNodeInOrParentOfUri(this.collection, this.uriIdentityService, uri, element.test.item.extId))) {
            return 2 /* FilterResult.Include */;
        }
        return 1 /* FilterResult.Inherit */;
    }
    testFilterText(element) {
        if (this.state.globList.length === 0) {
            return 2 /* FilterResult.Include */;
        }
        const fuzzy = this.state.fuzzy.value;
        for (let e = element; e; e = e.parent) {
            // start as included if the first glob is a negation
            let included = this.state.globList[0].include === false ? 2 /* FilterResult.Include */ : 1 /* FilterResult.Inherit */;
            const data = e.test.item.label.toLowerCase();
            for (const { include, text } of this.state.globList) {
                if (fuzzy ? fuzzyContains(data, text) : data.includes(text)) {
                    included = include ? 2 /* FilterResult.Include */ : 0 /* FilterResult.Exclude */;
                }
            }
            if (included !== 1 /* FilterResult.Inherit */) {
                return included;
            }
        }
        return 1 /* FilterResult.Inherit */;
    }
};
TestsFilter = __decorate([
    __param(1, ITestExplorerFilterState),
    __param(2, ITestService),
    __param(3, IUriIdentityService)
], TestsFilter);
class TreeSorter {
    constructor(viewModel) {
        this.viewModel = viewModel;
    }
    compare(a, b) {
        if (a instanceof TestTreeErrorMessage || b instanceof TestTreeErrorMessage) {
            return ((a instanceof TestTreeErrorMessage ? -1 : 0) + (b instanceof TestTreeErrorMessage ? 1 : 0));
        }
        const durationDelta = (b.duration || 0) - (a.duration || 0);
        if (this.viewModel.viewSorting === "duration" /* TestExplorerViewSorting.ByDuration */ && durationDelta !== 0) {
            return durationDelta;
        }
        const stateDelta = cmpPriority(a.state, b.state);
        if (this.viewModel.viewSorting === "status" /* TestExplorerViewSorting.ByStatus */ && stateDelta !== 0) {
            return stateDelta;
        }
        let inSameLocation = false;
        if (a instanceof TestItemTreeElement &&
            b instanceof TestItemTreeElement &&
            a.test.item.uri &&
            b.test.item.uri &&
            a.test.item.uri.toString() === b.test.item.uri.toString() &&
            a.test.item.range &&
            b.test.item.range) {
            inSameLocation = true;
            const delta = a.test.item.range.startLineNumber - b.test.item.range.startLineNumber;
            if (delta !== 0) {
                return delta;
            }
        }
        const sa = a.test.item.sortText;
        const sb = b.test.item.sortText;
        // If tests are in the same location and there's no preferred sortText,
        // keep the extension's insertion order (#163449).
        return inSameLocation && !sa && !sb
            ? 0
            : (sa || a.test.item.label).localeCompare(sb || b.test.item.label);
    }
}
let NoTestsForDocumentWidget = class NoTestsForDocumentWidget extends Disposable {
    constructor(container, filterState) {
        super();
        const el = (this.el = dom.append(container, dom.$('.testing-no-test-placeholder')));
        const emptyParagraph = dom.append(el, dom.$('p'));
        emptyParagraph.innerText = localize('testingNoTest', 'No tests were found in this file.');
        const buttonLabel = localize('testingFindExtension', 'Show Workspace Tests');
        const button = this._register(new Button(el, { title: buttonLabel, ...defaultButtonStyles }));
        button.label = buttonLabel;
        this._register(button.onDidClick(() => filterState.toggleFilteringFor("@doc" /* TestFilterTerm.CurrentDoc */, false)));
    }
    setVisible(isVisible) {
        this.el.classList.toggle('visible', isVisible);
    }
};
NoTestsForDocumentWidget = __decorate([
    __param(1, ITestExplorerFilterState)
], NoTestsForDocumentWidget);
class TestExplorerActionRunner extends ActionRunner {
    constructor(getSelectedTests) {
        super();
        this.getSelectedTests = getSelectedTests;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const selection = this.getSelectedTests();
        const contextIsSelected = selection.some((s) => s === context);
        const actualContext = contextIsSelected ? selection : [context];
        const actionable = actualContext.filter((t) => t instanceof TestItemTreeElement);
        await action.run(...actionable);
    }
}
const getLabelForTestTreeElement = (element) => {
    let label = labelForTestInState(element.description || element.test.item.label, element.state);
    if (element instanceof TestItemTreeElement) {
        if (element.duration !== undefined) {
            label = localize({
                key: 'testing.treeElementLabelDuration',
                comment: ['{0} is the original label in testing.treeElementLabel, {1} is a duration'],
            }, '{0}, in {1}', label, formatDuration(element.duration));
        }
        if (element.retired) {
            label = localize({
                key: 'testing.treeElementLabelOutdated',
                comment: ['{0} is the original label in testing.treeElementLabel'],
            }, '{0}, outdated result', label);
        }
    }
    return label;
};
class ListAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('testExplorer', 'Test Explorer');
    }
    getAriaLabel(element) {
        return element instanceof TestTreeErrorMessage
            ? element.description
            : getLabelForTestTreeElement(element);
    }
}
class TreeKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element instanceof TestTreeErrorMessage ? element.message : element.test.item.label;
    }
}
class ListDelegate {
    getHeight(element) {
        return element instanceof TestTreeErrorMessage ? 17 + 10 : 22;
    }
    getTemplateId(element) {
        if (element instanceof TestTreeErrorMessage) {
            return ErrorRenderer.ID;
        }
        return TestItemRenderer.ID;
    }
}
class IdentityProvider {
    getId(element) {
        return element.treeId;
    }
}
let ErrorRenderer = class ErrorRenderer {
    static { ErrorRenderer_1 = this; }
    static { this.ID = 'error'; }
    constructor(hoverService, instantionService) {
        this.hoverService = hoverService;
        this.renderer = instantionService.createInstance(MarkdownRenderer, {});
    }
    get templateId() {
        return ErrorRenderer_1.ID;
    }
    renderTemplate(container) {
        const label = dom.append(container, dom.$('.error'));
        return { label, disposable: new DisposableStore() };
    }
    renderElement({ element }, _, data) {
        dom.clearNode(data.label);
        if (typeof element.message === 'string') {
            data.label.innerText = element.message;
        }
        else {
            const result = this.renderer.render(element.message, { inline: true });
            data.label.appendChild(result.element);
        }
        data.disposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.label, element.description));
    }
    disposeTemplate(data) {
        data.disposable.dispose();
    }
};
ErrorRenderer = ErrorRenderer_1 = __decorate([
    __param(0, IHoverService),
    __param(1, IInstantiationService)
], ErrorRenderer);
let TestItemRenderer = class TestItemRenderer extends Disposable {
    static { TestItemRenderer_1 = this; }
    static { this.ID = 'testItem'; }
    constructor(actionRunner, menuService, testService, profiles, contextKeyService, instantiationService, crService, hoverService) {
        super();
        this.actionRunner = actionRunner;
        this.menuService = menuService;
        this.testService = testService;
        this.profiles = profiles;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.crService = crService;
        this.hoverService = hoverService;
        /**
         * @inheritdoc
         */
        this.templateId = TestItemRenderer_1.ID;
    }
    /**
     * @inheritdoc
     */
    renderTemplate(wrapper) {
        wrapper.classList.add('testing-stdtree-container');
        const icon = dom.append(wrapper, dom.$('.computed-state'));
        const label = dom.append(wrapper, dom.$('.label'));
        const disposable = new DisposableStore();
        dom.append(wrapper, dom.$(ThemeIcon.asCSSSelector(icons.testingHiddenIcon)));
        const actionBar = disposable.add(new ActionBar(wrapper, {
            actionRunner: this.actionRunner,
            actionViewItemProvider: (action, options) => action instanceof MenuItemAction
                ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                    hoverDelegate: options.hoverDelegate,
                })
                : undefined,
        }));
        disposable.add(this.crService.onDidChange((changed) => {
            const id = templateData.current?.test.item.extId;
            if (id && (!changed || changed === id || TestId.isChild(id, changed))) {
                this.fillActionBar(templateData.current, templateData);
            }
        }));
        const templateData = {
            wrapper,
            label,
            actionBar,
            icon,
            elementDisposable: new DisposableStore(),
            templateDisposable: disposable,
        };
        return templateData;
    }
    /**
     * @inheritdoc
     */
    disposeTemplate(templateData) {
        templateData.templateDisposable.clear();
    }
    /**
     * @inheritdoc
     */
    disposeElement(_element, _, templateData) {
        templateData.elementDisposable.clear();
    }
    fillActionBar(element, data) {
        const { actions, contextOverlay } = getActionableElementActions(this.contextKeyService, this.menuService, this.testService, this.crService, this.profiles, element);
        const crSelf = !!contextOverlay.getContextKeyValue(TestingContextKeys.isContinuousModeOn.key);
        const crChild = !crSelf && this.crService.isEnabledForAChildOf(element.test.item.extId);
        data.actionBar.domNode.classList.toggle('testing-is-continuous-run', crSelf || crChild);
        data.actionBar.clear();
        data.actionBar.context = element;
        data.actionBar.push(actions.primary, { icon: true, label: false });
    }
    /**
     * @inheritdoc
     */
    renderElement(node, _depth, data) {
        data.elementDisposable.clear();
        data.current = node.element;
        data.elementDisposable.add(node.element.onChange(() => this._renderElement(node, data)));
        this._renderElement(node, data);
    }
    _renderElement(node, data) {
        this.fillActionBar(node.element, data);
        const testHidden = this.testService.excluded.contains(node.element.test);
        data.wrapper.classList.toggle('test-is-hidden', testHidden);
        const icon = icons.testingStatesToIcons.get(node.element.test.expand === 2 /* TestItemExpandState.BusyExpanding */ || node.element.test.item.busy
            ? 2 /* TestResultState.Running */
            : node.element.state);
        data.icon.className = 'computed-state ' + (icon ? ThemeIcon.asClassName(icon) : '');
        if (node.element.retired) {
            data.icon.className += ' retired';
        }
        data.elementDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.label, getLabelForTestTreeElement(node.element)));
        if (node.element.test.item.label.trim()) {
            dom.reset(data.label, ...renderLabelWithIcons(node.element.test.item.label));
        }
        else {
            data.label.textContent = String.fromCharCode(0xa0); // &nbsp;
        }
        let description = node.element.description;
        if (node.element.duration !== undefined) {
            description = description
                ? `${description}: ${formatDuration(node.element.duration)}`
                : formatDuration(node.element.duration);
        }
        if (description) {
            dom.append(data.label, dom.$('span.test-label-description', {}, description));
        }
    }
};
TestItemRenderer = TestItemRenderer_1 = __decorate([
    __param(1, IMenuService),
    __param(2, ITestService),
    __param(3, ITestProfileService),
    __param(4, IContextKeyService),
    __param(5, IInstantiationService),
    __param(6, ITestingContinuousRunService),
    __param(7, IHoverService)
], TestItemRenderer);
const formatDuration = (ms) => {
    if (ms < 10) {
        return `${ms.toFixed(1)}ms`;
    }
    if (ms < 1_000) {
        return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
};
const getActionableElementActions = (contextKeyService, menuService, testService, crService, profiles, element) => {
    const test = element instanceof TestItemTreeElement ? element.test : undefined;
    const contextKeys = getTestItemContextOverlay(test, test ? profiles.capabilitiesForTest(test.item) : 0);
    contextKeys.push(['view', "workbench.view.testing" /* Testing.ExplorerViewId */]);
    if (test) {
        const ctrl = testService.getTestController(test.controllerId);
        const supportsCr = !!ctrl &&
            profiles
                .getControllerProfiles(ctrl.id)
                .some((p) => p.supportsContinuousRun && canUseProfileWithTest(p, test));
        contextKeys.push([
            TestingContextKeys.canRefreshTests.key,
            ctrl &&
                !!(ctrl.capabilities.get() & 2 /* TestControllerCapability.Refresh */) &&
                TestId.isRoot(test.item.extId),
        ], [TestingContextKeys.testItemIsHidden.key, testService.excluded.contains(test)], [
            TestingContextKeys.isContinuousModeOn.key,
            supportsCr && crService.isSpecificallyEnabledFor(test.item.extId),
        ], [
            TestingContextKeys.isParentRunningContinuously.key,
            supportsCr && crService.isEnabledForAParentOf(test.item.extId),
        ], [TestingContextKeys.supportsContinuousRun.key, supportsCr], [TestingContextKeys.testResultOutdated.key, element.retired], [TestingContextKeys.testResultState.key, testResultStateToContextValues[element.state]]);
    }
    const contextOverlay = contextKeyService.createOverlay(contextKeys);
    const menu = menuService.getMenuActions(MenuId.TestItem, contextOverlay, {
        shouldForwardArgs: true,
    });
    const actions = getActionBarActions(menu, 'inline');
    return { actions, contextOverlay };
};
registerThemingParticipant((theme, collector) => {
    if (theme.type === 'dark') {
        const foregroundColor = theme.getColor(foreground);
        if (foregroundColor) {
            const fgWithOpacity = new Color(new RGBA(foregroundColor.rgba.r, foregroundColor.rgba.g, foregroundColor.rgba.b, 0.65));
            collector.addRule(`.test-explorer .test-explorer-messages { color: ${fgWithOpacity}; }`);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0V4cGxvcmVyVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0aW5nRXhwbG9yZXJWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBR3RELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sb0RBQW9ELENBQUE7QUFDL0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXJFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBTTFGLE9BQU8sRUFDTixpQ0FBaUMsR0FFakMsTUFBTSxnREFBZ0QsQ0FBQTtBQVV2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NB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