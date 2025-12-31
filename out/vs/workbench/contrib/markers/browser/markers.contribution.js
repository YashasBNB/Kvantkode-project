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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vycy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLFVBQVUsR0FFVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFFdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFtQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNuRixPQUFPLFFBQVEsTUFBTSxlQUFlLENBQUE7QUFDcEMsT0FBTyxFQUVOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUd6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsVUFB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