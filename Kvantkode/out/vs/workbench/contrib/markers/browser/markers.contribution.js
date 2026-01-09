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
import './markersFileDecorations.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { localize, localize2 } from '../../../../nls.js';
import { Marker, RelatedInformation, ResourceMarkers } from './markersModel.js';
import { MarkersView } from './markersView.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Markers, MarkersContextKeys } from '../common/markers.js';
import Messages from './messages.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { Extensions as ViewContainerExtensions, } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getVisbileViewContextKey, FocusedViewContext } from '../../../common/contextkeys.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { problemsConfigurationNodeBase } from '../../../common/configuration.js';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_OPEN_ACTION_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(MarkersContextKeys.MarkerFocusContextKey),
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
    },
    handler: (accessor, args) => {
        const markersView = accessor
            .get(IViewsService)
            .getActiveViewWithId(Markers.MARKERS_VIEW_ID);
        markersView.openFileAtElement(markersView.getFocusElement(), false, false, true);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_OPEN_SIDE_ACTION_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(MarkersContextKeys.MarkerFocusContextKey),
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    mac: {
        primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
    },
    handler: (accessor, args) => {
        const markersView = accessor
            .get(IViewsService)
            .getActiveViewWithId(Markers.MARKERS_VIEW_ID);
        markersView.openFileAtElement(markersView.getFocusElement(), false, true, true);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_SHOW_PANEL_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: undefined,
    handler: async (accessor, args) => {
        await accessor.get(IViewsService).openView(Markers.MARKERS_VIEW_ID);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_SHOW_QUICK_FIX,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: MarkersContextKeys.MarkerFocusContextKey,
    primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
    handler: (accessor, args) => {
        const markersView = accessor
            .get(IViewsService)
            .getActiveViewWithId(Markers.MARKERS_VIEW_ID);
        const focusedElement = markersView.getFocusElement();
        if (focusedElement instanceof Marker) {
            markersView.showQuickFixes(focusedElement);
        }
    },
});
// configuration
Registry.as(Extensions.Configuration).registerConfiguration({
    ...problemsConfigurationNodeBase,
    properties: {
        'problems.autoReveal': {
            description: Messages.PROBLEMS_PANEL_CONFIGURATION_AUTO_REVEAL,
            type: 'boolean',
            default: true,
        },
        'problems.defaultViewMode': {
            description: Messages.PROBLEMS_PANEL_CONFIGURATION_VIEW_MODE,
            type: 'string',
            default: 'tree',
            enum: ['table', 'tree'],
        },
        'problems.showCurrentInStatus': {
            description: Messages.PROBLEMS_PANEL_CONFIGURATION_SHOW_CURRENT_STATUS,
            type: 'boolean',
            default: false,
        },
        'problems.sortOrder': {
            description: Messages.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER,
            type: 'string',
            default: 'severity',
            enum: ['severity', 'position'],
            enumDescriptions: [
                Messages.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_SEVERITY,
                Messages.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_POSITION,
            ],
        },
    },
});
const markersViewIcon = registerIcon('markers-view-icon', Codicon.warning, localize('markersViewIcon', 'View icon of the markers view.'));
// markers view container
const VIEW_CONTAINER = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: Markers.MARKERS_CONTAINER_ID,
    title: Messages.MARKERS_PANEL_TITLE_PROBLEMS,
    icon: markersViewIcon,
    hideIfEmpty: true,
    order: 0,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        Markers.MARKERS_CONTAINER_ID,
        { mergeViewWithContainerWhenSingleView: true },
    ]),
    storageId: Markers.MARKERS_VIEW_STORAGE_ID,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
Registry.as(ViewContainerExtensions.ViewsRegistry).registerViews([
    {
        id: Markers.MARKERS_VIEW_ID,
        containerIcon: markersViewIcon,
        name: Messages.MARKERS_PANEL_TITLE_PROBLEMS,
        canToggleVisibility: true,
        canMoveView: true,
        ctorDescriptor: new SyncDescriptor(MarkersView),
        openCommandActionDescriptor: {
            id: 'workbench.actions.view.problems',
            mnemonicTitle: localize({ key: 'miMarker', comment: ['&& denotes a mnemonic'] }, '&&Problems'),
            keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 43 /* KeyCode.KeyM */ },
            order: 0,
        },
    },
], VIEW_CONTAINER);
// workbench
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
// actions
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.table.${Markers.MARKERS_VIEW_ID}.viewAsTree`,
            title: localize('viewAsTree', 'View as Tree'),
            metadata: {
                description: localize2('viewAsTreeDescription', 'Show the problems view as a tree.'),
            },
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersViewModeContextKey.isEqualTo("table" /* MarkersViewMode.Table */)),
                group: 'navigation',
                order: 3,
            },
            icon: Codicon.listTree,
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.setViewMode("tree" /* MarkersViewMode.Tree */);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.table.${Markers.MARKERS_VIEW_ID}.viewAsTable`,
            title: localize('viewAsTable', 'View as Table'),
            metadata: {
                description: localize2('viewAsTableDescription', 'Show the problems view as a table.'),
            },
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersViewModeContextKey.isEqualTo("tree" /* MarkersViewMode.Tree */)),
                group: 'navigation',
                order: 3,
            },
            icon: Codicon.listFlat,
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.setViewMode("table" /* MarkersViewMode.Table */);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleErrors`,
            title: localize('show errors', 'Show Errors'),
            metadata: {
                description: localize2('toggleErrorsDescription', 'Show or hide errors in the problems view.'),
            },
            category: localize('problems', 'Problems'),
            toggled: MarkersContextKeys.ShowErrorsFilterContextKey,
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 1,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showErrors = !view.filters.showErrors;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleWarnings`,
            title: localize('show warnings', 'Show Warnings'),
            metadata: {
                description: localize2('toggleWarningsDescription', 'Show or hide warnings in the problems view.'),
            },
            category: localize('problems', 'Problems'),
            toggled: MarkersContextKeys.ShowWarningsFilterContextKey,
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 2,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showWarnings = !view.filters.showWarnings;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleInfos`,
            title: localize('show infos', 'Show Infos'),
            category: localize('problems', 'Problems'),
            toggled: MarkersContextKeys.ShowInfoFilterContextKey,
            metadata: {
                description: localize2('toggleInfosDescription', 'Show or hide infos in the problems view.'),
            },
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 3,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showInfos = !view.filters.showInfos;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleActiveFile`,
            title: localize('show active file', 'Show Active File Only'),
            metadata: {
                description: localize2('toggleActiveFileDescription', 'Show or hide problems (errors, warnings, info) only from the active file in the problems view.'),
            },
            category: localize('problems', 'Problems'),
            toggled: MarkersContextKeys.ShowActiveFileFilterContextKey,
            menu: {
                id: viewFilterSubmenu,
                group: '2_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 1,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.activeFile = !view.filters.activeFile;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleExcludedFiles`,
            title: localize('show excluded files', 'Show Excluded Files'),
            metadata: {
                description: localize2('toggleExcludedFilesDescription', 'Show or hide excluded files in the problems view.'),
            },
            category: localize('problems', 'Problems'),
            toggled: MarkersContextKeys.ShowExcludedFilesFilterContextKey.negate(),
            menu: {
                id: viewFilterSubmenu,
                group: '2_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 2,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.excludedFiles = !view.filters.excludedFiles;
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.problems.focus',
            title: Messages.MARKERS_PANEL_SHOW_LABEL,
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        accessor.get(IViewsService).openView(Markers.MARKERS_VIEW_ID, true);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        const when = ContextKeyExpr.and(FocusedViewContext.isEqualTo(Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersTreeVisibilityContextKey, MarkersContextKeys.RelatedInformationFocusContextKey.toNegated());
        super({
            id: Markers.MARKER_COPY_ACTION_ID,
            title: localize2('copyMarker', 'Copy'),
            menu: {
                id: MenuId.ProblemsPanelContext,
                when,
                group: 'navigation',
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                when,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        const clipboardService = serviceAccessor.get(IClipboardService);
        const selection = markersView.getFocusedSelectedElements() || markersView.getAllResourceMarkers();
        const markers = [];
        const addMarker = (marker) => {
            if (!markers.includes(marker)) {
                markers.push(marker);
            }
        };
        for (const selected of selection) {
            if (selected instanceof ResourceMarkers) {
                selected.markers.forEach(addMarker);
            }
            else if (selected instanceof Marker) {
                addMarker(selected);
            }
        }
        if (markers.length) {
            await clipboardService.writeText(`[${markers}]`);
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKER_COPY_MESSAGE_ACTION_ID,
            title: localize2('copyMessage', 'Copy Message'),
            menu: {
                id: MenuId.ProblemsPanelContext,
                when: MarkersContextKeys.MarkerFocusContextKey,
                group: 'navigation',
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        const clipboardService = serviceAccessor.get(IClipboardService);
        const element = markersView.getFocusElement();
        if (element instanceof Marker) {
            await clipboardService.writeText(element.marker.message);
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID,
            title: localize2('copyMessage', 'Copy Message'),
            menu: {
                id: MenuId.ProblemsPanelContext,
                when: MarkersContextKeys.RelatedInformationFocusContextKey,
                group: 'navigation',
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        const clipboardService = serviceAccessor.get(IClipboardService);
        const element = markersView.getFocusElement();
        if (element instanceof RelatedInformation) {
            await clipboardService.writeText(element.raw.message);
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.FOCUS_PROBLEMS_FROM_FILTER,
            title: localize('focusProblemsList', 'Focus problems view'),
            keybinding: {
                when: MarkersContextKeys.MarkerViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.focus();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_FOCUS_FILTER,
            title: localize('focusProblemsFilter', 'Focus problems filter'),
            keybinding: {
                when: FocusedViewContext.isEqualTo(Markers.MARKERS_VIEW_ID),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.focusFilter();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_SHOW_MULTILINE_MESSAGE,
            title: localize2('show multiline', 'Show message in multiple lines'),
            category: localize('problems', 'Problems'),
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.has(getVisbileViewContextKey(Markers.MARKERS_VIEW_ID)),
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.setMultiline(true);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE,
            title: localize2('show singleline', 'Show message in single line'),
            category: localize('problems', 'Problems'),
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.has(getVisbileViewContextKey(Markers.MARKERS_VIEW_ID)),
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.setMultiline(false);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_CLEAR_FILTER_TEXT,
            title: localize('clearFiltersText', 'Clear filters text'),
            category: localize('problems', 'Problems'),
            keybinding: {
                when: MarkersContextKeys.MarkerViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.clearFilterText();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.treeView.${Markers.MARKERS_VIEW_ID}.collapseAll`,
            title: localize('collapseAll', 'Collapse All'),
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersViewModeContextKey.isEqualTo("tree" /* MarkersViewMode.Tree */)),
                group: 'navigation',
                order: 2,
            },
            icon: Codicon.collapseAll,
            viewId: Markers.MARKERS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        return view.collapseAll();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: Markers.TOGGLE_MARKERS_VIEW_ACTION_ID,
            title: Messages.MARKERS_PANEL_TOGGLE_LABEL,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        if (viewsService.isViewVisible(Markers.MARKERS_VIEW_ID)) {
            viewsService.closeView(Markers.MARKERS_VIEW_ID);
        }
        else {
            viewsService.openView(Markers.MARKERS_VIEW_ID, true);
        }
    }
});
let MarkersStatusBarContributions = class MarkersStatusBarContributions extends Disposable {
    constructor(markerService, statusbarService, configurationService) {
        super();
        this.markerService = markerService;
        this.statusbarService = statusbarService;
        this.configurationService = configurationService;
        this.markersStatusItem = this._register(this.statusbarService.addEntry(this.getMarkersItem(), 'status.problems', 0 /* StatusbarAlignment.LEFT */, 50 /* Medium Priority */));
        const addStatusBarEntry = () => {
            this.markersStatusItemOff = this.statusbarService.addEntry(this.getMarkersItemTurnedOff(), 'status.problemsVisibility', 0 /* StatusbarAlignment.LEFT */, 49);
        };
        // Add the status bar entry if the problems is not visible
        let config = this.configurationService.getValue('problems.visibility');
        if (!config) {
            addStatusBarEntry();
        }
        this._register(this.markerService.onMarkerChanged(() => {
            this.markersStatusItem.update(this.getMarkersItem());
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('problems.visibility')) {
                this.markersStatusItem.update(this.getMarkersItem());
                // Update based on what setting was changed to.
                config = this.configurationService.getValue('problems.visibility');
                if (!config && !this.markersStatusItemOff) {
                    addStatusBarEntry();
                }
                else if (config && this.markersStatusItemOff) {
                    this.markersStatusItemOff.dispose();
                    this.markersStatusItemOff = undefined;
                }
            }
        }));
    }
    getMarkersItem() {
        const markersStatistics = this.markerService.getStatistics();
        const tooltip = this.getMarkersTooltip(markersStatistics);
        return {
            name: localize('status.problems', 'Problems'),
            text: this.getMarkersText(markersStatistics),
            ariaLabel: tooltip,
            tooltip,
            command: 'workbench.actions.view.toggleProblems',
        };
    }
    getMarkersItemTurnedOff() {
        // Update to true, config checked before `getMarkersItemTurnedOff` is called.
        this.statusbarService.updateEntryVisibility('status.problemsVisibility', true);
        const openSettingsCommand = 'workbench.action.openSettings';
        const configureSettingsLabel = '@id:problems.visibility';
        const tooltip = localize('status.problemsVisibilityOff', 'Problems are turned off. Click to open settings.');
        return {
            name: localize('status.problemsVisibility', 'Problems Visibility'),
            text: '$(whole-word)',
            ariaLabel: tooltip,
            tooltip,
            kind: 'warning',
            command: {
                title: openSettingsCommand,
                arguments: [configureSettingsLabel],
                id: openSettingsCommand,
            },
        };
    }
    getMarkersTooltip(stats) {
        const errorTitle = (n) => localize('totalErrors', 'Errors: {0}', n);
        const warningTitle = (n) => localize('totalWarnings', 'Warnings: {0}', n);
        const infoTitle = (n) => localize('totalInfos', 'Infos: {0}', n);
        const titles = [];
        if (stats.errors > 0) {
            titles.push(errorTitle(stats.errors));
        }
        if (stats.warnings > 0) {
            titles.push(warningTitle(stats.warnings));
        }
        if (stats.infos > 0) {
            titles.push(infoTitle(stats.infos));
        }
        if (titles.length === 0) {
            return localize('noProblems', 'No Problems');
        }
        return titles.join(', ');
    }
    getMarkersText(stats) {
        const problemsText = [];
        // Errors
        problemsText.push('$(error) ' + this.packNumber(stats.errors));
        // Warnings
        problemsText.push('$(warning) ' + this.packNumber(stats.warnings));
        // Info (only if any)
        if (stats.infos > 0) {
            problemsText.push('$(info) ' + this.packNumber(stats.infos));
        }
        return problemsText.join(' ');
    }
    packNumber(n) {
        const manyProblems = localize('manyProblems', '10K+');
        return n > 9999 ? manyProblems : n > 999 ? n.toString().charAt(0) + 'K' : n.toString();
    }
};
MarkersStatusBarContributions = __decorate([
    __param(0, IMarkerService),
    __param(1, IStatusbarService),
    __param(2, IConfigurationService)
], MarkersStatusBarContributions);
workbenchRegistry.registerWorkbenchContribution(MarkersStatusBarContributions, 3 /* LifecyclePhase.Restored */);
let ActivityUpdater = class ActivityUpdater extends Disposable {
    constructor(activityService, markerService) {
        super();
        this.activityService = activityService;
        this.markerService = markerService;
        this.activity = this._register(new MutableDisposable());
        this._register(this.markerService.onMarkerChanged(() => this.updateBadge()));
        this.updateBadge();
    }
    updateBadge() {
        const { errors, warnings, infos } = this.markerService.getStatistics();
        const total = errors + warnings + infos;
        if (total > 0) {
            const message = localize('totalProblems', 'Total {0} Problems', total);
            this.activity.value = this.activityService.showViewActivity(Markers.MARKERS_VIEW_ID, {
                badge: new NumberBadge(total, () => message),
            });
        }
        else {
            this.activity.value = undefined;
        }
    }
};
ActivityUpdater = __decorate([
    __param(0, IActivityService),
    __param(1, IMarkerService)
], ActivityUpdater);
workbenchRegistry.registerWorkbenchContribution(ActivityUpdater, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtlcnMvYnJvd3Nlci9tYXJrZXJzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQW1CLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ25GLE9BQU8sUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUNwQyxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBR3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxD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