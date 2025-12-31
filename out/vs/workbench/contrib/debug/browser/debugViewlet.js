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
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import './media/debugViewlet.css';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ViewPaneContainer, ViewsSubMenu } from '../../../browser/parts/views/viewPaneContainer.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { FocusSessionActionViewItem, StartDebugActionViewItem } from './debugActionViewItems.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL, DEBUG_START_COMMAND_ID, DEBUG_START_LABEL, DISCONNECT_ID, FOCUS_SESSION_ID, SELECT_AND_START_ID, STOP_ID, } from './debugCommands.js';
import { debugConfigure } from './debugIcons.js';
import { createDisconnectMenuItemAction } from './debugToolBar.js';
import { WelcomeView } from './welcomeView.js';
import { BREAKPOINTS_VIEW_ID, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE, CONTEXT_DEBUG_UX, CONTEXT_DEBUG_UX_KEY, getStateLabel, IDebugService, REPL_VIEW_ID, VIEWLET_ID, EDITOR_CONTRIBUTION_ID, } from '../common/debug.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let DebugViewPaneContainer = class DebugViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, progressService, debugService, instantiationService, contextService, storageService, themeService, contextMenuService, extensionService, configurationService, contextViewService, contextKeyService, viewDescriptorService, logService) {
        super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.progressService = progressService;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.contextKeyService = contextKeyService;
        this.paneListeners = new Map();
        this.stopActionViewItemDisposables = this._register(new DisposableStore());
        // When there are potential updates to the docked debug toolbar we need to update it
        this._register(this.debugService.onDidChangeState((state) => this.onDebugServiceStateChange(state)));
        this._register(this.contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(new Set([CONTEXT_DEBUG_UX_KEY, 'inDebugMode']))) {
                this.updateTitleArea();
            }
        }));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.updateTitleArea()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug.toolBarLocation') ||
                e.affectsConfiguration('debug.hideLauncherWhileDebugging')) {
                this.updateTitleArea();
            }
        }));
    }
    create(parent) {
        super.create(parent);
        parent.classList.add('debug-viewlet');
    }
    focus() {
        super.focus();
        if (this.startDebugActionViewItem) {
            this.startDebugActionViewItem.focus();
        }
        else {
            this.focusView(WelcomeView.ID);
        }
    }
    getActionViewItem(action, options) {
        if (action.id === DEBUG_START_COMMAND_ID) {
            this.startDebugActionViewItem = this.instantiationService.createInstance(StartDebugActionViewItem, null, action, options);
            return this.startDebugActionViewItem;
        }
        if (action.id === FOCUS_SESSION_ID) {
            return new FocusSessionActionViewItem(action, undefined, this.debugService, this.contextViewService, this.configurationService);
        }
        if (action.id === STOP_ID || action.id === DISCONNECT_ID) {
            this.stopActionViewItemDisposables.clear();
            const item = this.instantiationService.invokeFunction((accessor) => createDisconnectMenuItemAction(action, this.stopActionViewItemDisposables, accessor, { hoverDelegate: options.hoverDelegate }));
            if (item) {
                return item;
            }
        }
        return createActionViewItem(this.instantiationService, action, options);
    }
    focusView(id) {
        const view = this.getView(id);
        if (view) {
            view.focus();
        }
    }
    onDebugServiceStateChange(state) {
        if (this.progressResolve) {
            this.progressResolve();
            this.progressResolve = undefined;
        }
        if (state === 1 /* State.Initializing */) {
            this.progressService.withProgress({ location: VIEWLET_ID }, (_progress) => {
                return new Promise((resolve) => (this.progressResolve = resolve));
            });
        }
    }
    addPanes(panes) {
        super.addPanes(panes);
        for (const { pane: pane } of panes) {
            // attach event listener to
            if (pane.id === BREAKPOINTS_VIEW_ID) {
                this.breakpointView = pane;
                this.updateBreakpointsMaxSize();
            }
            else {
                this.paneListeners.set(pane.id, pane.onDidChange(() => this.updateBreakpointsMaxSize()));
            }
        }
    }
    removePanes(panes) {
        super.removePanes(panes);
        for (const pane of panes) {
            dispose(this.paneListeners.get(pane.id));
            this.paneListeners.delete(pane.id);
        }
    }
    updateBreakpointsMaxSize() {
        if (this.breakpointView) {
            // We need to update the breakpoints view since all other views are collapsed #25384
            const allOtherCollapsed = this.panes.every((view) => !view.isExpanded() || view === this.breakpointView);
            this.breakpointView.maximumBodySize = allOtherCollapsed
                ? Number.POSITIVE_INFINITY
                : this.breakpointView.minimumBodySize;
        }
    }
};
DebugViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IProgressService),
    __param(3, IDebugService),
    __param(4, IInstantiationService),
    __param(5, IWorkspaceContextService),
    __param(6, IStorageService),
    __param(7, IThemeService),
    __param(8, IContextMenuService),
    __param(9, IExtensionService),
    __param(10, IConfigurationService),
    __param(11, IContextViewService),
    __param(12, IContextKeyService),
    __param(13, IViewDescriptorService),
    __param(14, ILogService)
], DebugViewPaneContainer);
export { DebugViewPaneContainer };
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_UX.notEqualsTo('simple'), WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_DEBUG_STATE.isEqualTo('inactive'), ContextKeyExpr.notEquals('config.debug.toolBarLocation', 'docked')), ContextKeyExpr.or(ContextKeyExpr.not('config.debug.hideLauncherWhileDebugging'), ContextKeyExpr.not('inDebugMode'))),
    order: 10,
    group: 'navigation',
    command: {
        precondition: CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(1 /* State.Initializing */)),
        id: DEBUG_START_COMMAND_ID,
        title: DEBUG_START_LABEL,
    },
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: DEBUG_CONFIGURE_COMMAND_ID,
            title: {
                value: DEBUG_CONFIGURE_LABEL,
                original: "Open 'launch.json'",
                mnemonicTitle: nls.localize({ key: 'miOpenConfigurations', comment: ['&& denotes a mnemonic'] }, 'Open &&Configurations'),
            },
            metadata: {
                description: nls.localize2('openLaunchConfigDescription', 'Opens the file used to configure how your program is debugged'),
            },
            f1: true,
            icon: debugConfigure,
            precondition: CONTEXT_DEBUG_UX.notEqualsTo('simple'),
            menu: [
                {
                    id: MenuId.ViewContainerTitle,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_UX.notEqualsTo('simple'), WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_DEBUG_STATE.isEqualTo('inactive'), ContextKeyExpr.notEquals('config.debug.toolBarLocation', 'docked'))),
                },
                {
                    id: MenuId.ViewContainerTitle,
                    order: 20,
                    // Show in debug viewlet secondary actions when debugging and debug toolbar is docked
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked')),
                },
                {
                    id: MenuId.MenubarDebugMenu,
                    group: '2_configuration',
                    order: 1,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                },
            ],
        });
    }
    async run(accessor, opts) {
        const debugService = accessor.get(IDebugService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationManager = debugService.getConfigurationManager();
        let launch;
        if (configurationManager.selectedConfiguration.name) {
            launch = configurationManager.selectedConfiguration.launch;
        }
        else {
            const launches = configurationManager.getLaunches().filter((l) => !l.hidden);
            if (launches.length === 1) {
                launch = launches[0];
            }
            else {
                const picks = launches.map((l) => ({ label: l.name, launch: l }));
                const picked = await quickInputService.pick(picks, {
                    activeItem: picks[0],
                    placeHolder: nls.localize({
                        key: 'selectWorkspaceFolder',
                        comment: [
                            'User picks a workspace folder or a workspace configuration file here. Workspace configuration files can contain settings and thus a launch.json configuration can be written into one.',
                        ],
                    }, 'Select a workspace folder to create a launch.json file in or add it to the workspace config file'),
                });
                if (picked) {
                    launch = picked.launch;
                }
            }
        }
        if (launch) {
            const { editor } = await launch.openConfigFile({ preserveFocus: false });
            if (editor && opts?.addNew) {
                const codeEditor = editor.getControl();
                if (codeEditor) {
                    await codeEditor
                        .getContribution(EDITOR_CONTRIBUTION_ID)
                        ?.addLaunchConfiguration();
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'debug.toggleReplIgnoreFocus',
            title: nls.localize('debugPanel', 'Debug Console'),
            toggled: ContextKeyExpr.has(`view.${REPL_VIEW_ID}.visible`),
            menu: [
                {
                    id: ViewsSubMenu,
                    group: '3_toggleRepl',
                    order: 30,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID)),
                },
            ],
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        if (viewsService.isViewVisible(REPL_VIEW_ID)) {
            viewsService.closeView(REPL_VIEW_ID);
        }
        else {
            await viewsService.openView(REPL_VIEW_ID);
        }
    }
});
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.or(ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked'), ContextKeyExpr.has('config.debug.hideLauncherWhileDebugging'))),
    order: 10,
    command: {
        id: SELECT_AND_START_ID,
        title: nls.localize('startAdditionalSession', 'Start Additional Session'),
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaWV3bGV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1ZpZXdsZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDdEcsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBRU4sWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsR0FDbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFB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