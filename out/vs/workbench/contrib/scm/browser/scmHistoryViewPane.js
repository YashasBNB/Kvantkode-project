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
var HistoryItemRenderer_1, HistoryItemLoadMoreRenderer_1;
import './media/scm.css';
import * as platform from '../../../../base/common/platform.js';
import { $, append, h, reset } from '../../../../base/browser/dom.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { fromNow, safeIntl } from '../../../../base/common/date.js';
import { createMatches } from '../../../../base/common/filters.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableValue, waitForState, constObservable, latestChangedValue, observableFromEvent, runOnChange, observableSignal, } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree, } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { asCssVariable, foreground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane, ViewPaneShowActions, } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { renderSCMHistoryItemGraph, toISCMHistoryItemViewModelArray, SWIMLANE_WIDTH, renderSCMHistoryGraphPlaceholder, historyItemHoverDeletionsForeground, historyItemHoverLabelForeground, historyItemHoverAdditionsForeground, historyItemHoverDefaultLabelForeground, historyItemHoverDefaultLabelBackground, } from './scmHistory.js';
import { getHistoryItemEditorTitle, getProviderKey, isSCMHistoryItemLoadMoreTreeElement, isSCMHistoryItemViewModelTreeElement, isSCMRepository, } from './util.js';
import { HISTORY_VIEW_PANE_ID, ISCMService, ISCMViewService, } from '../common/scm.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { Action2, IMenuService, isIMenuItem, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { Sequencer, Throttler } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { delta, groupBy } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { ContextKeys } from './scmViewPane.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { Event } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { clamp } from '../../../../base/common/numbers.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { compare } from '../../../../base/common/strings.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { groupBy as groupBy2 } from '../../../../base/common/collections.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
const PICK_REPOSITORY_ACTION_ID = 'workbench.scm.action.graph.pickRepository';
const PICK_HISTORY_ITEM_REFS_ACTION_ID = 'workbench.scm.action.graph.pickHistoryItemRefs';
class SCMRepositoryActionViewItem extends ActionViewItem {
    constructor(_repository, action, options) {
        super(null, action, { ...options, icon: false, label: true });
        this._repository = _repository;
    }
    updateLabel() {
        if (this.options.label && this.label) {
            this.label.classList.add('scm-graph-repository-picker');
            const icon = $('.icon');
            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.repo));
            const name = $('.name');
            name.textContent = this._repository.provider.name;
            reset(this.label, icon, name);
        }
    }
    getTooltip() {
        return this._repository.provider.name;
    }
}
class SCMHistoryItemRefsActionViewItem extends ActionViewItem {
    constructor(_repository, _historyItemsFilter, action, options) {
        super(null, action, { ...options, icon: false, label: true });
        this._repository = _repository;
        this._historyItemsFilter = _historyItemsFilter;
    }
    updateLabel() {
        if (this.options.label && this.label) {
            this.label.classList.add('scm-graph-history-item-picker');
            const icon = $('.icon');
            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.gitBranch));
            const name = $('.name');
            if (this._historyItemsFilter === 'all') {
                name.textContent = localize('all', 'All');
            }
            else if (this._historyItemsFilter === 'auto') {
                name.textContent = localize('auto', 'Auto');
            }
            else if (this._historyItemsFilter.length === 1) {
                name.textContent = this._historyItemsFilter[0].name;
            }
            else {
                name.textContent = localize('items', '{0} Items', this._historyItemsFilter.length);
            }
            reset(this.label, icon, name);
        }
    }
    getTooltip() {
        if (this._historyItemsFilter === 'all') {
            return localize('allHistoryItemRefs', 'All history item references');
        }
        else if (this._historyItemsFilter === 'auto') {
            const historyProvider = this._repository.provider.historyProvider.get();
            return [
                historyProvider?.historyItemRef.get()?.name,
                historyProvider?.historyItemRemoteRef.get()?.name,
                historyProvider?.historyItemBaseRef.get()?.name,
            ]
                .filter((ref) => !!ref)
                .join(', ');
        }
        else if (this._historyItemsFilter.length === 1) {
            return this._historyItemsFilter[0].name;
        }
        else {
            return this._historyItemsFilter.map((ref) => ref.name).join(', ');
        }
    }
}
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: PICK_REPOSITORY_ACTION_ID,
            title: localize('repositoryPicker', 'Repository Picker'),
            viewId: HISTORY_VIEW_PANE_ID,
            f1: false,
            menu: {
                id: MenuId.SCMHistoryTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.has('scm.providerCount'), ContextKeyExpr.greater('scm.providerCount', 1)),
                group: 'navigation',
                order: 0,
            },
        });
    }
    async runInView(_, view) {
        view.pickRepository();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: PICK_HISTORY_ITEM_REFS_ACTION_ID,
            title: localize('referencePicker', 'History Item Reference Picker'),
            icon: Codicon.gitBranch,
            viewId: HISTORY_VIEW_PANE_ID,
            precondition: ContextKeys.SCMHistoryItemCount.notEqualsTo(0),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryTitle,
                group: 'navigation',
                order: 1,
            },
        });
    }
    async runInView(_, view) {
        view.pickHistoryItemRef();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.revealCurrentHistoryItem',
            title: localize('goToCurrentHistoryItem', 'Go to Current History Item'),
            icon: Codicon.target,
            viewId: HISTORY_VIEW_PANE_ID,
            precondition: ContextKeyExpr.and(ContextKeys.SCMHistoryItemCount.notEqualsTo(0), ContextKeys.SCMCurrentHistoryItemRefInFilter.isEqualTo(true)),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryTitle,
                group: 'navigation',
                order: 2,
            },
        });
    }
    async runInView(_, view) {
        view.revealCurrentHistoryItem();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.refresh',
            title: localize('refreshGraph', 'Refresh'),
            viewId: HISTORY_VIEW_PANE_ID,
            f1: false,
            icon: Codicon.refresh,
            menu: {
                id: MenuId.SCMHistoryTitle,
                group: 'navigation',
                order: 1000,
            },
        });
    }
    async runInView(_, view) {
        view.refresh();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.viewChanges',
            title: localize('openChanges', 'Open Changes'),
            f1: false,
            menu: [
                {
                    id: MenuId.SCMHistoryItemContext,
                    when: ContextKeyExpr.equals('config.multiDiffEditor.experimental.enabled', true),
                    group: '0_view',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, provider, ...historyItems) {
        const commandService = accessor.get(ICommandService);
        if (!provider || historyItems.length === 0) {
            return;
        }
        const historyItem = historyItems[0];
        const historyItemLast = historyItems[historyItems.length - 1];
        const historyProvider = provider.historyProvider.get();
        if (historyItems.length > 1) {
            const ancestor = await historyProvider?.resolveHistoryItemRefsCommonAncestor([
                historyItem.id,
                historyItemLast.id,
            ]);
            if (!ancestor || (ancestor !== historyItem.id && ancestor !== historyItemLast.id)) {
                return;
            }
        }
        const historyItemParentId = historyItemLast.parentIds.length > 0 ? historyItemLast.parentIds[0] : undefined;
        const historyItemChanges = await historyProvider?.provideHistoryItemChanges(historyItem.id, historyItemParentId);
        if (!historyItemChanges?.length) {
            return;
        }
        const title = historyItems.length === 1
            ? getHistoryItemEditorTitle(historyItem)
            : localize('historyItemChangesEditorTitle', 'All Changes ({0} ↔ {1})', historyItemLast.displayId ?? historyItemLast.id, historyItem.displayId ?? historyItem.id);
        const rootUri = provider.rootUri;
        const path = rootUri ? rootUri.path : provider.label;
        const multiDiffSourceUri = URI.from({ scheme: 'scm-history-item', path: `${path}/${historyItemParentId}..${historyItem.id}` }, true);
        commandService.executeCommand('_workbench.openMultiDiffEditor', {
            title,
            multiDiffSourceUri,
            resources: historyItemChanges,
        });
    }
});
class ListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId(element) {
        if (isSCMHistoryItemViewModelTreeElement(element)) {
            return HistoryItemRenderer.TEMPLATE_ID;
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(element)) {
            return HistoryItemLoadMoreRenderer.TEMPLATE_ID;
        }
        else {
            throw new Error('Unknown element');
        }
    }
}
let HistoryItemRenderer = class HistoryItemRenderer {
    static { HistoryItemRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'history-item'; }
    get templateId() {
        return HistoryItemRenderer_1.TEMPLATE_ID;
    }
    constructor(hoverDelegate, _clipboardService, _configurationService, _contextKeyService, _hoverService, _menuService, _themeService) {
        this.hoverDelegate = hoverDelegate;
        this._clipboardService = _clipboardService;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this._hoverService = _hoverService;
        this._menuService = _menuService;
        this._themeService = _themeService;
        this._badgesConfig = observableConfigValue('scm.graph.badges', 'filter', this._configurationService);
    }
    renderTemplate(container) {
        // hack
        ;
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        const element = append(container, $('.history-item'));
        const graphContainer = append(element, $('.graph-container'));
        const iconLabel = new IconLabel(element, {
            supportIcons: true,
            supportHighlights: true,
            supportDescriptionHighlights: true,
        });
        const labelContainer = append(element, $('.label-container'));
        element.appendChild(labelContainer);
        return {
            element,
            graphContainer,
            label: iconLabel,
            labelContainer,
            elementDisposables: new DisposableStore(),
            disposables: new DisposableStore(),
        };
    }
    renderElement(node, index, templateData, height) {
        const provider = node.element.repository.provider;
        const historyItemViewModel = node.element.historyItemViewModel;
        const historyItem = historyItemViewModel.historyItem;
        const historyItemHover = this._hoverService.setupManagedHover(this.hoverDelegate, templateData.element, this._getHoverContent(node.element), {
            actions: this._getHoverActions(provider, historyItem),
        });
        templateData.elementDisposables.add(historyItemHover);
        templateData.graphContainer.textContent = '';
        templateData.graphContainer.classList.toggle('current', historyItemViewModel.isCurrent);
        templateData.graphContainer.appendChild(renderSCMHistoryItemGraph(historyItemViewModel));
        const historyItemRef = provider.historyProvider.get()?.historyItemRef?.get();
        const extraClasses = historyItemRef?.revision === historyItem.id ? ['history-item-current'] : [];
        const [matches, descriptionMatches] = this._processMatches(historyItemViewModel, node.filterData);
        templateData.label.setLabel(historyItem.subject, historyItem.author, {
            matches,
            descriptionMatches,
            extraClasses,
        });
        this._renderBadges(historyItem, templateData);
    }
    _renderBadges(historyItem, templateData) {
        templateData.elementDisposables.add(autorun((reader) => {
            const labelConfig = this._badgesConfig.read(reader);
            templateData.labelContainer.textContent = '';
            const references = historyItem.references ? historyItem.references.slice(0) : [];
            // If the first reference is colored, we render it
            // separately since we have to show the description
            // for the first colored reference.
            if (references.length > 0 && references[0].color) {
                this._renderBadge([references[0]], true, templateData);
                // Remove the rendered reference from the collection
                references.splice(0, 1);
            }
            // Group history item references by color
            const historyItemRefsByColor = groupBy2(references, (ref) => (ref.color ? ref.color : ''));
            for (const [key, historyItemRefs] of Object.entries(historyItemRefsByColor)) {
                // If needed skip badges without a color
                if (key === '' && labelConfig !== 'all') {
                    continue;
                }
                // Group history item references by icon
                const historyItemRefByIconId = groupBy2(historyItemRefs, (ref) => ThemeIcon.isThemeIcon(ref.icon) ? ref.icon.id : '');
                for (const [key, historyItemRefs] of Object.entries(historyItemRefByIconId)) {
                    // Skip badges without an icon
                    if (key === '') {
                        continue;
                    }
                    this._renderBadge(historyItemRefs, false, templateData);
                }
            }
        }));
    }
    _renderBadge(historyItemRefs, showDescription, templateData) {
        if (historyItemRefs.length === 0 || !ThemeIcon.isThemeIcon(historyItemRefs[0].icon)) {
            return;
        }
        const elements = h('div.label', {
            style: {
                color: historyItemRefs[0].color
                    ? asCssVariable(historyItemHoverLabelForeground)
                    : asCssVariable(foreground),
                backgroundColor: historyItemRefs[0].color
                    ? asCssVariable(historyItemRefs[0].color)
                    : asCssVariable(historyItemHoverDefaultLabelBackground),
            },
        }, [
            h('div.count@count', {
                style: {
                    display: historyItemRefs.length > 1 ? '' : 'none',
                },
            }),
            h('div.icon@icon'),
            h('div.description@description', {
                style: {
                    display: showDescription ? '' : 'none',
                },
            }),
        ]);
        elements.count.textContent = historyItemRefs.length > 1 ? historyItemRefs.length.toString() : '';
        elements.icon.classList.add(...ThemeIcon.asClassNameArray(historyItemRefs[0].icon));
        elements.description.textContent = showDescription ? historyItemRefs[0].name : '';
        append(templateData.labelContainer, elements.root);
    }
    _getHoverActions(provider, historyItem) {
        const actions = this._menuService
            .getMenuActions(MenuId.SCMHistoryItemHover, this._contextKeyService, {
            arg: provider,
            shouldForwardArgs: true,
        })
            .flatMap((item) => item[1]);
        return [
            {
                commandId: 'workbench.scm.action.graph.copyHistoryItemId',
                iconClass: 'codicon.codicon-copy',
                label: historyItem.displayId ?? historyItem.id,
                run: () => this._clipboardService.writeText(historyItem.id),
            },
            ...actions.map((action) => {
                const iconClass = ThemeIcon.isThemeIcon(action.item.icon)
                    ? ThemeIcon.asClassNameArray(action.item.icon).join('.')
                    : undefined;
                return {
                    commandId: action.id,
                    label: action.label,
                    iconClass,
                    run: () => action.run(historyItem),
                };
            }),
        ];
    }
    _getHoverContent(element) {
        const colorTheme = this._themeService.getColorTheme();
        const historyItem = element.historyItemViewModel.historyItem;
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        if (historyItem.author) {
            const icon = URI.isUri(historyItem.authorIcon)
                ? `![${historyItem.author}](${historyItem.authorIcon.toString()}|width=20,height=20)`
                : ThemeIcon.isThemeIcon(historyItem.authorIcon)
                    ? `$(${historyItem.authorIcon.id})`
                    : '$(account)';
            if (historyItem.authorEmail) {
                const emailTitle = localize('emailLinkTitle', 'Email');
                markdown.appendMarkdown(`${icon} [**${historyItem.author}**](mailto:${historyItem.authorEmail} "${emailTitle} ${historyItem.author}")`);
            }
            else {
                markdown.appendMarkdown(`${icon} **${historyItem.author}**`);
            }
            if (historyItem.timestamp) {
                const dateFormatter = safeIntl.DateTimeFormat(platform.language, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                });
                markdown.appendMarkdown(`, $(history) ${fromNow(historyItem.timestamp, true, true)} (${dateFormatter.format(historyItem.timestamp)})`);
            }
            markdown.appendMarkdown('\n\n');
        }
        markdown.appendMarkdown(`${historyItem.message}\n\n`);
        if (historyItem.statistics) {
            markdown.appendMarkdown(`---\n\n`);
            markdown.appendMarkdown(`<span>${historyItem.statistics.files === 1
                ? localize('fileChanged', '{0} file changed', historyItem.statistics.files)
                : localize('filesChanged', '{0} files changed', historyItem.statistics.files)}</span>`);
            if (historyItem.statistics.insertions) {
                const additionsForegroundColor = colorTheme.getColor(historyItemHoverAdditionsForeground);
                markdown.appendMarkdown(`,&nbsp;<span style="color:${additionsForegroundColor};">${historyItem.statistics.insertions === 1
                    ? localize('insertion', '{0} insertion{1}', historyItem.statistics.insertions, '(+)')
                    : localize('insertions', '{0} insertions{1}', historyItem.statistics.insertions, '(+)')}</span>`);
            }
            if (historyItem.statistics.deletions) {
                const deletionsForegroundColor = colorTheme.getColor(historyItemHoverDeletionsForeground);
                markdown.appendMarkdown(`,&nbsp;<span style="color:${deletionsForegroundColor};">${historyItem.statistics.deletions === 1
                    ? localize('deletion', '{0} deletion{1}', historyItem.statistics.deletions, '(-)')
                    : localize('deletions', '{0} deletions{1}', historyItem.statistics.deletions, '(-)')}</span>`);
            }
        }
        if ((historyItem.references ?? []).length > 0) {
            markdown.appendMarkdown(`\n\n---\n\n`);
            markdown.appendMarkdown((historyItem.references ?? [])
                .map((ref) => {
                const labelIconId = ThemeIcon.isThemeIcon(ref.icon) ? ref.icon.id : '';
                const labelBackgroundColor = ref.color
                    ? asCssVariable(ref.color)
                    : asCssVariable(historyItemHoverDefaultLabelBackground);
                const labelForegroundColor = ref.color
                    ? asCssVariable(historyItemHoverLabelForeground)
                    : asCssVariable(historyItemHoverDefaultLabelForeground);
                return `<span style="color:${labelForegroundColor};background-color:${labelBackgroundColor};border-radius:10px;">&nbsp;$(${labelIconId})&nbsp;${ref.name}&nbsp;&nbsp;</span>`;
            })
                .join('&nbsp;&nbsp;'));
        }
        return { markdown, markdownNotSupportedFallback: historyItem.message };
    }
    _processMatches(historyItemViewModel, filterData) {
        if (!filterData) {
            return [undefined, undefined];
        }
        return [
            historyItemViewModel.historyItem.message === filterData.label
                ? createMatches(filterData.score)
                : undefined,
            historyItemViewModel.historyItem.author === filterData.label
                ? createMatches(filterData.score)
                : undefined,
        ];
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
HistoryItemRenderer = HistoryItemRenderer_1 = __decorate([
    __param(1, IClipboardService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IHoverService),
    __param(5, IMenuService),
    __param(6, IThemeService)
], HistoryItemRenderer);
let HistoryItemLoadMoreRenderer = class HistoryItemLoadMoreRenderer {
    static { HistoryItemLoadMoreRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'historyItemLoadMore'; }
    get templateId() {
        return HistoryItemLoadMoreRenderer_1.TEMPLATE_ID;
    }
    constructor(_isLoadingMore, _loadMoreCallback, _configurationService) {
        this._isLoadingMore = _isLoadingMore;
        this._loadMoreCallback = _loadMoreCallback;
        this._configurationService = _configurationService;
    }
    renderTemplate(container) {
        // hack
        ;
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        const element = append(container, $('.history-item-load-more'));
        const graphPlaceholder = append(element, $('.graph-placeholder'));
        const historyItemPlaceholderContainer = append(element, $('.history-item-placeholder'));
        const historyItemPlaceholderLabel = new IconLabel(historyItemPlaceholderContainer, {
            supportIcons: true,
        });
        return {
            element,
            graphPlaceholder,
            historyItemPlaceholderContainer,
            historyItemPlaceholderLabel,
            elementDisposables: new DisposableStore(),
            disposables: new DisposableStore(),
        };
    }
    renderElement(element, index, templateData, height) {
        templateData.graphPlaceholder.textContent = '';
        templateData.graphPlaceholder.style.width = `${SWIMLANE_WIDTH * (element.element.graphColumns.length + 1)}px`;
        templateData.graphPlaceholder.appendChild(renderSCMHistoryGraphPlaceholder(element.element.graphColumns));
        const pageOnScroll = this._configurationService.getValue('scm.graph.pageOnScroll') === true;
        templateData.historyItemPlaceholderContainer.classList.toggle('shimmer', pageOnScroll);
        if (pageOnScroll) {
            templateData.historyItemPlaceholderLabel.setLabel('');
            this._loadMoreCallback();
        }
        else {
            templateData.elementDisposables.add(autorun((reader) => {
                const isLoadingMore = this._isLoadingMore.read(reader);
                const icon = `$(${isLoadingMore ? 'loading~spin' : 'fold-down'})`;
                templateData.historyItemPlaceholderLabel.setLabel(localize('loadMore', '{0} Load More...', icon));
            }));
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
HistoryItemLoadMoreRenderer = HistoryItemLoadMoreRenderer_1 = __decorate([
    __param(2, IConfigurationService)
], HistoryItemLoadMoreRenderer);
let HistoryItemHoverDelegate = class HistoryItemHoverDelegate extends WorkbenchHoverDelegate {
    constructor(_viewContainerLocation, layoutService, configurationService, hoverService) {
        super('element', { instantHover: true }, () => this.getHoverOptions(), configurationService, hoverService);
        this._viewContainerLocation = _viewContainerLocation;
        this.layoutService = layoutService;
    }
    getHoverOptions() {
        const sideBarPosition = this.layoutService.getSideBarPosition();
        let hoverPosition;
        if (this._viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
            hoverPosition = sideBarPosition === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */;
        }
        else if (this._viewContainerLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
            hoverPosition = sideBarPosition === 0 /* Position.LEFT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
        }
        else {
            hoverPosition = 1 /* HoverPosition.RIGHT */;
        }
        return {
            additionalClasses: ['history-item-hover'],
            position: { hoverPosition, forcePosition: true },
        };
    }
};
HistoryItemHoverDelegate = __decorate([
    __param(1, IWorkbenchLayoutService),
    __param(2, IConfigurationService),
    __param(3, IHoverService)
], HistoryItemHoverDelegate);
let SCMHistoryViewPaneActionRunner = class SCMHistoryViewPaneActionRunner extends ActionRunner {
    constructor(_progressService) {
        super();
        this._progressService = _progressService;
    }
    runAction(action, context) {
        return this._progressService.withProgress({ location: HISTORY_VIEW_PANE_ID }, async () => await super.runAction(action, context));
    }
};
SCMHistoryViewPaneActionRunner = __decorate([
    __param(0, IProgressService)
], SCMHistoryViewPaneActionRunner);
class SCMHistoryTreeAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('scm history', 'Source Control History');
    }
    getAriaLabel(element) {
        if (isSCMRepository(element)) {
            return `${element.provider.name} ${element.provider.label}`;
        }
        else if (isSCMHistoryItemViewModelTreeElement(element)) {
            const historyItem = element.historyItemViewModel.historyItem;
            return `${stripIcons(historyItem.message).trim()}${historyItem.author ? `, ${historyItem.author}` : ''}`;
        }
        else {
            return '';
        }
    }
}
class SCMHistoryTreeIdentityProvider {
    getId(element) {
        if (isSCMRepository(element)) {
            const provider = element.provider;
            return `repo:${provider.id}`;
        }
        else if (isSCMHistoryItemViewModelTreeElement(element)) {
            const provider = element.repository.provider;
            const historyItem = element.historyItemViewModel.historyItem;
            return `historyItem:${provider.id}/${historyItem.id}/${historyItem.parentIds.join(',')}`;
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(element)) {
            const provider = element.repository.provider;
            return `historyItemLoadMore:${provider.id}}`;
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
class SCMHistoryTreeKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (isSCMRepository(element)) {
            return undefined;
        }
        else if (isSCMHistoryItemViewModelTreeElement(element)) {
            // For a history item we want to match both the message and
            // the author. A match in the message takes precedence over
            // a match in the author.
            return [
                element.historyItemViewModel.historyItem.message,
                element.historyItemViewModel.historyItem.author,
            ];
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(element)) {
            // We don't want to match the load more element
            return '';
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
class SCMHistoryTreeDataSource extends Disposable {
    async getChildren(inputOrElement) {
        if (!(inputOrElement instanceof SCMHistoryViewModel)) {
            return [];
        }
        // History items
        const children = [];
        const historyItems = await inputOrElement.getHistoryItems();
        children.push(...historyItems);
        // Load More element
        const repository = inputOrElement.repository.get();
        const lastHistoryItem = historyItems.at(-1);
        if (repository &&
            lastHistoryItem &&
            lastHistoryItem.historyItemViewModel.outputSwimlanes.length > 0) {
            children.push({
                repository,
                graphColumns: lastHistoryItem.historyItemViewModel.outputSwimlanes,
                type: 'historyItemLoadMore',
            });
        }
        return children;
    }
    hasChildren(inputOrElement) {
        return inputOrElement instanceof SCMHistoryViewModel;
    }
}
let SCMHistoryViewModel = class SCMHistoryViewModel extends Disposable {
    constructor(_configurationService, _contextKeyService, _extensionService, _scmService, _scmViewService, _storageService) {
        super();
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this._extensionService = _extensionService;
        this._scmService = _scmService;
        this._scmViewService = _scmViewService;
        this._storageService = _storageService;
        this._selectedRepository = observableValue(this, 'auto');
        this.onDidChangeHistoryItemsFilter = observableSignal(this);
        this.isViewModelEmpty = observableValue(this, false);
        this._repositoryState = new Map();
        this._repositoryFilterState = new Map();
        this._repositoryFilterState = this._loadHistoryItemsFilterState();
        this._extensionService.onWillStop(this._saveHistoryItemsFilterState, this, this._store);
        this._storageService.onWillSaveState(this._saveHistoryItemsFilterState, this, this._store);
        this._scmHistoryItemCountCtx = ContextKeys.SCMHistoryItemCount.bindTo(this._contextKeyService);
        const firstRepository = this._scmService.repositoryCount > 0
            ? constObservable(Iterable.first(this._scmService.repositories))
            : observableFromEvent(this, Event.once(this._scmService.onDidAddRepository), (repository) => repository);
        const graphRepository = derived((reader) => {
            const selectedRepository = this._selectedRepository.read(reader);
            if (selectedRepository !== 'auto') {
                return selectedRepository;
            }
            return this._scmViewService.activeRepository.read(reader);
        });
        this.repository = latestChangedValue(this, [firstRepository, graphRepository]);
        const closedRepository = observableFromEvent(this, this._scmService.onDidRemoveRepository, (repository) => repository);
        // Closed repository cleanup
        this._register(autorun((reader) => {
            const repository = closedRepository.read(reader);
            if (!repository) {
                return;
            }
            if (this.repository.get() === repository) {
                this._selectedRepository.set(Iterable.first(this._scmService.repositories) ?? 'auto', undefined);
            }
            this._repositoryState.delete(repository);
        }));
    }
    clearRepositoryState() {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        this._repositoryState.delete(repository);
    }
    getHistoryItemsFilter() {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        const filterState = this._repositoryFilterState.get(getProviderKey(repository.provider)) ?? 'auto';
        if (filterState === 'all' || filterState === 'auto') {
            return filterState;
        }
        const repositoryState = this._repositoryState.get(repository);
        return repositoryState?.historyItemsFilter;
    }
    getCurrentHistoryItemTreeElement() {
        const repository = this.repository.get();
        if (!repository) {
            return undefined;
        }
        const state = this._repositoryState.get(repository);
        if (!state) {
            return undefined;
        }
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemRef = historyProvider?.historyItemRef.get();
        return state.viewModels.find((viewModel) => viewModel.historyItemViewModel.historyItem.id === historyItemRef?.revision);
    }
    loadMore(cursor) {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        const state = this._repositoryState.get(repository);
        if (!state) {
            return;
        }
        this._repositoryState.set(repository, { ...state, loadMore: cursor ?? true });
    }
    async getHistoryItems() {
        const repository = this.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        if (!repository || !historyProvider) {
            this._scmHistoryItemCountCtx.set(0);
            this.isViewModelEmpty.set(true, undefined);
            return [];
        }
        let state = this._repositoryState.get(repository);
        if (!state || state.loadMore !== false) {
            const historyItems = state?.viewModels.map((vm) => vm.historyItemViewModel.historyItem) ?? [];
            const historyItemRefs = state?.historyItemsFilter ??
                (await this._resolveHistoryItemFilter(repository, historyProvider));
            const limit = clamp(this._configurationService.getValue('scm.graph.pageSize'), 1, 1000);
            const historyItemRefIds = historyItemRefs.map((ref) => ref.revision ?? ref.id);
            do {
                // Fetch the next page of history items
                historyItems.push(...((await historyProvider.provideHistoryItems({
                    historyItemRefs: historyItemRefIds,
                    limit,
                    skip: historyItems.length,
                })) ?? []));
            } while (typeof state?.loadMore === 'string' &&
                !historyItems.find((item) => item.id === state?.loadMore));
            // Create the color map
            const colorMap = this._getGraphColorMap(historyItemRefs);
            const viewModels = toISCMHistoryItemViewModelArray(historyItems, colorMap, historyProvider.historyItemRef.get()).map((historyItemViewModel) => ({
                repository,
                historyItemViewModel,
                type: 'historyItemViewModel',
            }));
            state = { historyItemsFilter: historyItemRefs, viewModels, loadMore: false };
            this._repositoryState.set(repository, state);
            this._scmHistoryItemCountCtx.set(viewModels.length);
            this.isViewModelEmpty.set(viewModels.length === 0, undefined);
        }
        return state.viewModels;
    }
    setRepository(repository) {
        this._selectedRepository.set(repository, undefined);
    }
    setHistoryItemsFilter(filter) {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        if (filter !== 'auto') {
            this._repositoryFilterState.set(getProviderKey(repository.provider), filter);
        }
        else {
            this._repositoryFilterState.delete(getProviderKey(repository.provider));
        }
        this._saveHistoryItemsFilterState();
        this.onDidChangeHistoryItemsFilter.trigger(undefined);
    }
    _getGraphColorMap(historyItemRefs) {
        const repository = this.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemRef = historyProvider?.historyItemRef.get();
        const historyItemRemoteRef = historyProvider?.historyItemRemoteRef.get();
        const historyItemBaseRef = historyProvider?.historyItemBaseRef.get();
        const colorMap = new Map();
        if (historyItemRef) {
            colorMap.set(historyItemRef.id, historyItemRef.color);
            if (historyItemRemoteRef) {
                colorMap.set(historyItemRemoteRef.id, historyItemRemoteRef.color);
            }
            if (historyItemBaseRef) {
                colorMap.set(historyItemBaseRef.id, historyItemBaseRef.color);
            }
        }
        // Add the remaining history item references to the color map
        // if not already present. These history item references will
        // be colored using the color of the history item to which they
        // point to.
        for (const ref of historyItemRefs) {
            if (!colorMap.has(ref.id)) {
                colorMap.set(ref.id, undefined);
            }
        }
        return colorMap;
    }
    async _resolveHistoryItemFilter(repository, historyProvider) {
        const historyItemRefs = [];
        const historyItemsFilter = this._repositoryFilterState.get(getProviderKey(repository.provider)) ?? 'auto';
        switch (historyItemsFilter) {
            case 'all':
                historyItemRefs.push(...((await historyProvider.provideHistoryItemRefs()) ?? []));
                break;
            case 'auto':
                historyItemRefs.push(...[
                    historyProvider.historyItemRef.get(),
                    historyProvider.historyItemRemoteRef.get(),
                    historyProvider.historyItemBaseRef.get(),
                ].filter((ref) => !!ref));
                break;
            default: {
                // Get the latest revisions for the history items references in the filer
                const refs = ((await historyProvider.provideHistoryItemRefs(historyItemsFilter)) ?? []).filter((ref) => historyItemsFilter.some((filter) => filter === ref.id));
                if (refs.length === 0) {
                    // Reset the filter
                    historyItemRefs.push(...[
                        historyProvider.historyItemRef.get(),
                        historyProvider.historyItemRemoteRef.get(),
                        historyProvider.historyItemBaseRef.get(),
                    ].filter((ref) => !!ref));
                    this._repositoryFilterState.delete(getProviderKey(repository.provider));
                }
                else {
                    // Update filter
                    historyItemRefs.push(...refs);
                    this._repositoryFilterState.set(getProviderKey(repository.provider), refs.map((ref) => ref.id));
                }
                this._saveHistoryItemsFilterState();
                break;
            }
        }
        return historyItemRefs;
    }
    _loadHistoryItemsFilterState() {
        try {
            const filterData = this._storageService.get('scm.graphView.referencesFilter', 1 /* StorageScope.WORKSPACE */);
            if (filterData) {
                return new Map(JSON.parse(filterData));
            }
        }
        catch { }
        return new Map();
    }
    _saveHistoryItemsFilterState() {
        const filter = Array.from(this._repositoryFilterState.entries());
        this._storageService.store('scm.graphView.referencesFilter', JSON.stringify(filter), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    dispose() {
        this._repositoryState.clear();
        super.dispose();
    }
};
SCMHistoryViewModel = __decorate([
    __param(0, IConfigurationService),
    __param(1, IContextKeyService),
    __param(2, IExtensionService),
    __param(3, ISCMService),
    __param(4, ISCMViewService),
    __param(5, IStorageService)
], SCMHistoryViewModel);
let RepositoryPicker = class RepositoryPicker {
    constructor(_quickInputService, _scmViewService) {
        this._quickInputService = _quickInputService;
        this._scmViewService = _scmViewService;
        this._autoQuickPickItem = {
            label: localize('auto', 'Auto'),
            description: localize('activeRepository', 'Show the source control graph for the active repository'),
            repository: 'auto',
        };
    }
    async pickRepository() {
        const picks = [
            this._autoQuickPickItem,
            { type: 'separator' },
        ];
        picks.push(...this._scmViewService.repositories.map((r) => ({
            label: r.provider.name,
            description: r.provider.rootUri?.fsPath,
            iconClass: ThemeIcon.asClassName(Codicon.repo),
            repository: r,
        })));
        return this._quickInputService.pick(picks, {
            placeHolder: localize('scmGraphRepository', 'Select the repository to view, type to filter all repositories'),
        });
    }
};
RepositoryPicker = __decorate([
    __param(0, IQuickInputService),
    __param(1, ISCMViewService)
], RepositoryPicker);
let HistoryItemRefPicker = class HistoryItemRefPicker extends Disposable {
    constructor(_historyProvider, _historyItemsFilter, _quickInputService) {
        super();
        this._historyProvider = _historyProvider;
        this._historyItemsFilter = _historyItemsFilter;
        this._quickInputService = _quickInputService;
        this._allQuickPickItem = {
            id: 'all',
            label: localize('all', 'All'),
            description: localize('allHistoryItemRefs', 'All history item references'),
            historyItemRef: 'all',
        };
        this._autoQuickPickItem = {
            id: 'auto',
            label: localize('auto', 'Auto'),
            description: localize('currentHistoryItemRef', 'Current history item reference(s)'),
            historyItemRef: 'auto',
        };
    }
    async pickHistoryItemRef() {
        const quickPick = this._quickInputService.createQuickPick({
            useSeparators: true,
        });
        this._store.add(quickPick);
        quickPick.placeholder = localize('scmGraphHistoryItemRef', 'Select one/more history item references to view, type to filter');
        quickPick.canSelectMany = true;
        quickPick.hideCheckAll = true;
        quickPick.busy = true;
        quickPick.show();
        const items = await this._createQuickPickItems();
        // Set initial selection
        let selectedItems = [];
        if (this._historyItemsFilter === 'all') {
            selectedItems.push(this._allQuickPickItem);
        }
        else if (this._historyItemsFilter === 'auto') {
            selectedItems.push(this._autoQuickPickItem);
        }
        else {
            let index = 0;
            while (index < items.length) {
                if (items[index].type === 'separator') {
                    index++;
                    continue;
                }
                if (this._historyItemsFilter.some((ref) => ref.id === items[index].id)) {
                    const item = items.splice(index, 1);
                    selectedItems.push(...item);
                }
                else {
                    index++;
                }
            }
            // Insert the selected items after `All` and `Auto`
            items.splice(2, 0, { type: 'separator' }, ...selectedItems);
        }
        quickPick.items = items;
        quickPick.selectedItems = selectedItems;
        quickPick.busy = false;
        return new Promise((resolve) => {
            this._store.add(quickPick.onDidChangeSelection((items) => {
                const { added } = delta(selectedItems, items, (a, b) => compare(a.id ?? '', b.id ?? ''));
                if (added.length > 0) {
                    if (added[0].historyItemRef === 'all' || added[0].historyItemRef === 'auto') {
                        quickPick.selectedItems = [added[0]];
                    }
                    else {
                        // Remove 'all' and 'auto' items if present
                        quickPick.selectedItems = [
                            ...quickPick.selectedItems.filter((i) => i.historyItemRef !== 'all' && i.historyItemRef !== 'auto'),
                        ];
                    }
                }
                selectedItems = [...quickPick.selectedItems];
            }));
            this._store.add(quickPick.onDidAccept(() => {
                if (selectedItems.length === 0) {
                    resolve(undefined);
                }
                else if (selectedItems.length === 1 && selectedItems[0].historyItemRef === 'all') {
                    resolve('all');
                }
                else if (selectedItems.length === 1 && selectedItems[0].historyItemRef === 'auto') {
                    resolve('auto');
                }
                else {
                    resolve(selectedItems.map((item) => item.historyItemRef.id));
                }
                quickPick.hide();
            }));
            this._store.add(quickPick.onDidHide(() => {
                resolve(undefined);
                this.dispose();
            }));
        });
    }
    async _createQuickPickItems() {
        const picks = [
            this._allQuickPickItem,
            this._autoQuickPickItem,
        ];
        const historyItemRefs = (await this._historyProvider.provideHistoryItemRefs()) ?? [];
        const historyItemRefsByCategory = groupBy(historyItemRefs, (a, b) => compare(a.category ?? '', b.category ?? ''));
        for (const refs of historyItemRefsByCategory) {
            if (refs.length === 0) {
                continue;
            }
            picks.push({ type: 'separator', label: refs[0].category });
            picks.push(...refs.map((ref) => {
                return {
                    id: ref.id,
                    label: ref.name,
                    description: ref.description,
                    iconClass: ThemeIcon.isThemeIcon(ref.icon)
                        ? ThemeIcon.asClassName(ref.icon)
                        : undefined,
                    historyItemRef: ref,
                };
            }));
        }
        return picks;
    }
};
HistoryItemRefPicker = __decorate([
    __param(2, IQuickInputService)
], HistoryItemRefPicker);
let SCMHistoryViewPane = class SCMHistoryViewPane extends ViewPane {
    constructor(options, _commandService, _instantiationService, _menuService, _progressService, configurationService, contextMenuService, keybindingService, instantiationService, viewDescriptorService, contextKeyService, openerService, themeService, hoverService) {
        super({
            ...options,
            titleMenuId: MenuId.SCMHistoryTitle,
            showActions: ViewPaneShowActions.WhenExpanded,
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._menuService = _menuService;
        this._progressService = _progressService;
        this._repositoryIsLoadingMore = observableValue(this, false);
        this._repositoryOutdated = observableValue(this, false);
        this._visibilityDisposables = new DisposableStore();
        this._treeOperationSequencer = new Sequencer();
        this._treeLoadMoreSequencer = new Sequencer();
        this._updateChildrenThrottler = new Throttler();
        this._contextMenuDisposables = new MutableDisposable();
        this._scmProviderCtx = ContextKeys.SCMProvider.bindTo(this.scopedContextKeyService);
        this._scmCurrentHistoryItemRefHasRemote = ContextKeys.SCMCurrentHistoryItemRefHasRemote.bindTo(this.scopedContextKeyService);
        this._scmCurrentHistoryItemRefInFilter = ContextKeys.SCMCurrentHistoryItemRefInFilter.bindTo(this.scopedContextKeyService);
        this._actionRunner = this.instantiationService.createInstance(SCMHistoryViewPaneActionRunner);
        this._register(this._actionRunner);
        this._register(this._updateChildrenThrottler);
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.title);
        const element = h('div.scm-graph-view-badge-container', [
            h('div.scm-graph-view-badge.monaco-count-badge.long@badge'),
        ]);
        element.badge.textContent = 'Outdated';
        container.appendChild(element.root);
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), element.root, {
            markdown: {
                value: localize('scmGraphViewOutdated', 'Please refresh the graph using the refresh action ($(refresh)).'),
                supportThemeIcons: true,
            },
            markdownNotSupportedFallback: undefined,
        }));
        this._register(autorun((reader) => {
            const outdated = this._repositoryOutdated.read(reader);
            element.root.style.display = outdated ? '' : 'none';
        }));
    }
    renderBody(container) {
        super.renderBody(container);
        this._treeContainer = append(container, $('.scm-view.scm-history-view'));
        this._treeContainer.classList.add('file-icon-themable-tree');
        this._createTree(this._treeContainer);
        this.onDidChangeBodyVisibility(async (visible) => {
            if (!visible) {
                this._visibilityDisposables.clear();
                return;
            }
            // Create view model
            this._treeViewModel = this.instantiationService.createInstance(SCMHistoryViewModel);
            this._visibilityDisposables.add(this._treeViewModel);
            // Wait for first repository to be initialized
            const firstRepositoryInitialized = derived(this, (reader) => {
                const repository = this._treeViewModel.repository.read(reader);
                const historyProvider = repository?.provider.historyProvider.read(reader);
                const historyItemRef = historyProvider?.historyItemRef.read(reader);
                return historyItemRef !== undefined ? true : undefined;
            });
            await waitForState(firstRepositoryInitialized);
            // Initial rendering
            await this._progressService.withProgress({ location: this.id }, async () => {
                await this._treeOperationSequencer.queue(async () => {
                    await this._tree.setInput(this._treeViewModel);
                    this._tree.scrollTop = 0;
                });
            });
            this._visibilityDisposables.add(autorun((reader) => {
                this._treeViewModel.isViewModelEmpty.read(reader);
                this._onDidChangeViewWelcomeState.fire();
            }));
            // Repository change
            let isFirstRun = true;
            this._visibilityDisposables.add(autorunWithStore((reader, store) => {
                const repository = this._treeViewModel.repository.read(reader);
                const historyProvider = repository?.provider.historyProvider.read(reader);
                if (!repository || !historyProvider) {
                    return;
                }
                // HistoryItemId changed (checkout)
                const historyItemRefId = derived((reader) => {
                    return historyProvider.historyItemRef.read(reader)?.id;
                });
                store.add(runOnChange(historyItemRefId, async (historyItemRefIdValue) => {
                    await this.refresh();
                    // Update context key (needs to be done after the refresh call)
                    this._scmCurrentHistoryItemRefInFilter.set(this._isCurrentHistoryItemInFilter(historyItemRefIdValue));
                }));
                // HistoryItemRefs changed
                store.add(runOnChange(historyProvider.historyItemRefChanges, (changes) => {
                    if (changes.silent) {
                        // The history item reference changes occurred in the background (ex: Auto Fetch)
                        // If tree is scrolled to the top, we can safely refresh the tree, otherwise we
                        // will show a visual cue that the view is outdated.
                        if (this._tree.scrollTop === 0) {
                            this.refresh();
                            return;
                        }
                        // Show the "Outdated" badge on the view
                        this._repositoryOutdated.set(true, undefined);
                        return;
                    }
                    this.refresh();
                }));
                // HistoryItemRefs filter changed
                store.add(runOnChange(this._treeViewModel.onDidChangeHistoryItemsFilter, async () => {
                    await this.refresh();
                    // Update context key (needs to be done after the refresh call)
                    this._scmCurrentHistoryItemRefInFilter.set(this._isCurrentHistoryItemInFilter(historyItemRefId.get()));
                }));
                // HistoryItemRemoteRef changed
                store.add(autorun((reader) => {
                    this._scmCurrentHistoryItemRefHasRemote.set(!!historyProvider.historyItemRemoteRef.read(reader));
                }));
                // Update context
                this._scmProviderCtx.set(repository.provider.contextValue);
                this._scmCurrentHistoryItemRefInFilter.set(this._isCurrentHistoryItemInFilter(historyItemRefId.get()));
                // We skip refreshing the graph on the first execution of the autorun
                // since the graph for the first repository is rendered when the tree
                // input is set.
                if (!isFirstRun) {
                    this.refresh();
                }
                isFirstRun = false;
            }));
        }, this, this._store);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._tree.layout(height, width);
    }
    getActionRunner() {
        return this._actionRunner;
    }
    getActionsContext() {
        return this._treeViewModel?.repository.get()?.provider;
    }
    createActionViewItem(action, options) {
        if (action.id === PICK_REPOSITORY_ACTION_ID) {
            const repository = this._treeViewModel?.repository.get();
            if (repository) {
                return new SCMRepositoryActionViewItem(repository, action, options);
            }
        }
        else if (action.id === PICK_HISTORY_ITEM_REFS_ACTION_ID) {
            const repository = this._treeViewModel?.repository.get();
            const historyItemsFilter = this._treeViewModel?.getHistoryItemsFilter();
            if (repository && historyItemsFilter) {
                return new SCMHistoryItemRefsActionViewItem(repository, historyItemsFilter, action, options);
            }
        }
        return super.createActionViewItem(action, options);
    }
    focus() {
        super.focus();
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        this._tree.focusFirst(fakeKeyboardEvent);
        this._tree.domFocus();
    }
    shouldShowWelcome() {
        return this._treeViewModel?.isViewModelEmpty.get() === true;
    }
    async refresh() {
        this._treeViewModel.clearRepositoryState();
        await this._updateChildren();
        this.updateActions();
        this._repositoryOutdated.set(false, undefined);
        this._tree.scrollTop = 0;
    }
    async pickRepository() {
        const picker = this._instantiationService.createInstance(RepositoryPicker);
        const result = await picker.pickRepository();
        if (result) {
            this._treeViewModel.setRepository(result.repository);
        }
    }
    async pickHistoryItemRef() {
        const repository = this._treeViewModel.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemsFilter = this._treeViewModel.getHistoryItemsFilter();
        if (!historyProvider || !historyItemsFilter) {
            return;
        }
        const picker = this._instantiationService.createInstance(HistoryItemRefPicker, historyProvider, historyItemsFilter);
        const result = await picker.pickHistoryItemRef();
        if (result) {
            this._treeViewModel.setHistoryItemsFilter(result);
        }
    }
    async revealCurrentHistoryItem() {
        const repository = this._treeViewModel.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemRef = historyProvider?.historyItemRef.get();
        if (!repository || !historyItemRef?.id || !historyItemRef?.revision) {
            return;
        }
        if (!this._isCurrentHistoryItemInFilter(historyItemRef.id)) {
            return;
        }
        const revealTreeNode = () => {
            const historyItemTreeElement = this._treeViewModel.getCurrentHistoryItemTreeElement();
            if (historyItemTreeElement && this._tree.hasNode(historyItemTreeElement)) {
                this._tree.reveal(historyItemTreeElement, 0.5);
                this._tree.setSelection([historyItemTreeElement]);
                this._tree.setFocus([historyItemTreeElement]);
                return true;
            }
            return false;
        };
        if (revealTreeNode()) {
            return;
        }
        // Fetch current history item
        await this._loadMore(historyItemRef.revision);
        // Reveal node
        revealTreeNode();
    }
    _createTree(container) {
        this._treeIdentityProvider = new SCMHistoryTreeIdentityProvider();
        const historyItemHoverDelegate = this.instantiationService.createInstance(HistoryItemHoverDelegate, this.viewDescriptorService.getViewLocationById(this.id));
        this._register(historyItemHoverDelegate);
        this._treeDataSource = this.instantiationService.createInstance(SCMHistoryTreeDataSource);
        this._register(this._treeDataSource);
        this._tree = this.instantiationService.createInstance(WorkbenchAsyncDataTree, 'SCM History Tree', container, new ListDelegate(), [
            this.instantiationService.createInstance(HistoryItemRenderer, historyItemHoverDelegate),
            this.instantiationService.createInstance(HistoryItemLoadMoreRenderer, this._repositoryIsLoadingMore, () => this._loadMore()),
        ], this._treeDataSource, {
            accessibilityProvider: new SCMHistoryTreeAccessibilityProvider(),
            identityProvider: this._treeIdentityProvider,
            collapseByDefault: (e) => false,
            keyboardNavigationLabelProvider: new SCMHistoryTreeKeyboardNavigationLabelProvider(),
            horizontalScrolling: false,
            multipleSelectionSupport: false,
        });
        this._register(this._tree);
        this._tree.onDidOpen(this._onDidOpen, this, this._store);
        this._tree.onContextMenu(this._onContextMenu, this, this._store);
    }
    _isCurrentHistoryItemInFilter(historyItemRefId) {
        if (!historyItemRefId) {
            return false;
        }
        const historyItemFilter = this._treeViewModel.getHistoryItemsFilter();
        if (historyItemFilter === 'all' || historyItemFilter === 'auto') {
            return true;
        }
        return (Array.isArray(historyItemFilter) &&
            !!historyItemFilter.find((ref) => ref.id === historyItemRefId));
    }
    async _onDidOpen(e) {
        if (!e.element) {
            return;
        }
        else if (isSCMHistoryItemViewModelTreeElement(e.element)) {
            const historyItem = e.element.historyItemViewModel.historyItem;
            const historyItemParentId = historyItem.parentIds.length > 0 ? historyItem.parentIds[0] : undefined;
            const historyProvider = e.element.repository.provider.historyProvider.get();
            const historyItemChanges = await historyProvider?.provideHistoryItemChanges(historyItem.id, historyItemParentId);
            if (historyItemChanges) {
                const title = getHistoryItemEditorTitle(historyItem);
                const rootUri = e.element.repository.provider.rootUri;
                const path = rootUri ? rootUri.path : e.element.repository.provider.label;
                const multiDiffSourceUri = URI.from({ scheme: 'scm-history-item', path: `${path}/${historyItemParentId}..${historyItem.id}` }, true);
                await this._commandService.executeCommand('_workbench.openMultiDiffEditor', {
                    title,
                    multiDiffSourceUri,
                    resources: historyItemChanges,
                });
            }
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(e.element)) {
            const pageOnScroll = this.configurationService.getValue('scm.graph.pageOnScroll') === true;
            if (!pageOnScroll) {
                this._loadMore();
                this._tree.setSelection([]);
            }
        }
    }
    _onContextMenu(e) {
        const element = e.element;
        if (!element || !isSCMHistoryItemViewModelTreeElement(element)) {
            return;
        }
        this._contextMenuDisposables.value = new DisposableStore();
        const historyItemRefMenuItems = MenuRegistry.getMenuItems(MenuId.SCMHistoryItemRefContext).filter((item) => isIMenuItem(item));
        // If there are any history item references we have to add a submenu item for each orignal action,
        // and a menu item for each history item ref that matches the `when` clause of the original action.
        if (historyItemRefMenuItems.length > 0 &&
            element.historyItemViewModel.historyItem.references?.length) {
            const historyItemRefActions = new Map();
            for (const ref of element.historyItemViewModel.historyItem.references) {
                const contextKeyService = this.scopedContextKeyService.createOverlay([
                    ['scmHistoryItemRef', ref.id],
                ]);
                const menuActions = this._menuService.getMenuActions(MenuId.SCMHistoryItemRefContext, contextKeyService);
                for (const action of menuActions.flatMap((a) => a[1])) {
                    if (!historyItemRefActions.has(action.id)) {
                        historyItemRefActions.set(action.id, []);
                    }
                    historyItemRefActions.get(action.id).push(ref);
                }
            }
            // Register submenu, menu items
            for (const historyItemRefMenuItem of historyItemRefMenuItems) {
                const actionId = historyItemRefMenuItem.command.id;
                if (!historyItemRefActions.has(actionId)) {
                    continue;
                }
                // Register the submenu for the original action
                this._contextMenuDisposables.value.add(MenuRegistry.appendMenuItem(MenuId.SCMHistoryItemContext, {
                    title: historyItemRefMenuItem.command.title,
                    submenu: MenuId.for(actionId),
                    group: historyItemRefMenuItem?.group,
                    order: historyItemRefMenuItem?.order,
                }));
                // Register the action for the history item ref
                for (const historyItemRef of historyItemRefActions.get(actionId) ?? []) {
                    this._contextMenuDisposables.value.add(registerAction2(class extends Action2 {
                        constructor() {
                            super({
                                id: `${actionId}.${historyItemRef.id}`,
                                title: historyItemRef.name,
                                menu: {
                                    id: MenuId.for(actionId),
                                    group: historyItemRef.category,
                                },
                            });
                        }
                        run(accessor, ...args) {
                            const commandService = accessor.get(ICommandService);
                            commandService.executeCommand(actionId, ...args, historyItemRef.id);
                        }
                    }));
                }
            }
        }
        const historyItemMenuActions = this._menuService.getMenuActions(MenuId.SCMHistoryItemContext, this.scopedContextKeyService, {
            arg: element.repository.provider,
            shouldForwardArgs: true,
        });
        this.contextMenuService.showContextMenu({
            contextKeyService: this.scopedContextKeyService,
            getAnchor: () => e.anchor,
            getActions: () => getFlatContextMenuActions(historyItemMenuActions),
            getActionsContext: () => element.historyItemViewModel.historyItem,
        });
    }
    async _loadMore(cursor) {
        return this._treeLoadMoreSequencer.queue(async () => {
            if (this._repositoryIsLoadingMore.get()) {
                return;
            }
            this._repositoryIsLoadingMore.set(true, undefined);
            this._treeViewModel.loadMore(cursor);
            await this._updateChildren();
            this._repositoryIsLoadingMore.set(false, undefined);
        });
    }
    _updateChildren() {
        return this._updateChildrenThrottler.queue(() => this._treeOperationSequencer.queue(async () => {
            await this._progressService.withProgress({ location: this.id }, async () => {
                await this._tree.updateChildren(undefined, undefined, undefined, {
                // diffIdentityProvider: this._treeIdentityProvider
                });
            });
        }));
    }
    dispose() {
        this._contextMenuDisposables.dispose();
        this._visibilityDisposables.dispose();
        super.dispose();
    }
};
SCMHistoryViewPane = __decorate([
    __param(1, ICommandService),
    __param(2, IInstantiationService),
    __param(3, IMenuService),
    __param(4, IProgressService),
    __param(5, IConfigurationService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IContextKeyService),
    __param(11, IOpenerService),
    __param(12, IThemeService),
    __param(13, IHoverService)
], SCMHistoryViewPane);
export { SCMHistoryViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtSGlzdG9yeVZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtSGlzdG9yeVZpZXdQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBT3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQWE5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQXNCLE1BQU0sb0NBQW9DLENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLE9BQU8sRUFFUCxlQUFlLEVBQ2YsWUFBWSxFQUNaLGVBQWUsRUFDZixrQkFBa0IsRUFDbEIsbUJBQW1CLEVBQ25CLFdBQVcsRUFDWCxnQkFBZ0IsR0FDaEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixjQUFj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