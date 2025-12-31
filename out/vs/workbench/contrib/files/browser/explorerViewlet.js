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
import './media/explorerviewlet.css';
import { localize, localize2 } from '../../../../nls.js';
import { mark } from '../../../../base/common/performance.js';
import { VIEWLET_ID, VIEW_ID, ExplorerViewletVisibleContext, } from '../common/files.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExplorerView } from './views/explorerView.js';
import { EmptyView } from './views/emptyView.js';
import { OpenEditorsView } from './views/openEditorsView.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IContextKeyService, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { Extensions, IViewDescriptorService, ViewContentGroups, } from '../../../common/views.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { WorkbenchStateContext, RemoteNameContext, OpenFolderWorkspaceSupportContext, } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { AddRootFolderAction, OpenFolderAction, OpenFileFolderAction, OpenFolderViaWorkspaceAction, } from '../../../browser/actions/workspaceActions.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { isMouseEvent } from '../../../../base/browser/dom.js';
import { ILogService } from '../../../../platform/log/common/log.js';
const explorerViewIcon = registerIcon('explorer-view-icon', Codicon.files, localize('explorerViewIcon', 'View icon of the explorer view.'));
const openEditorsViewIcon = registerIcon('open-editors-view-icon', Codicon.book, localize('openEditorsIcon', 'View icon of the open editors view.'));
let ExplorerViewletViewsContribution = class ExplorerViewletViewsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.explorerViewletViews'; }
    constructor(workspaceContextService, progressService) {
        super();
        this.workspaceContextService = workspaceContextService;
        progressService
            .withProgress({ location: 1 /* ProgressLocation.Explorer */ }, () => workspaceContextService.getCompleteWorkspace())
            .finally(() => {
            this.registerViews();
            this._register(workspaceContextService.onDidChangeWorkbenchState(() => this.registerViews()));
            this._register(workspaceContextService.onDidChangeWorkspaceFolders(() => this.registerViews()));
        });
    }
    registerViews() {
        mark('code/willRegisterExplorerViews');
        const viewDescriptors = viewsRegistry.getViews(VIEW_CONTAINER);
        const viewDescriptorsToRegister = [];
        const viewDescriptorsToDeregister = [];
        const openEditorsViewDescriptor = this.createOpenEditorsViewDescriptor();
        if (!viewDescriptors.some((v) => v.id === openEditorsViewDescriptor.id)) {
            viewDescriptorsToRegister.push(openEditorsViewDescriptor);
        }
        const explorerViewDescriptor = this.createExplorerViewDescriptor();
        const registeredExplorerViewDescriptor = viewDescriptors.find((v) => v.id === explorerViewDescriptor.id);
        const emptyViewDescriptor = this.createEmptyViewDescriptor();
        const registeredEmptyViewDescriptor = viewDescriptors.find((v) => v.id === emptyViewDescriptor.id);
        if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ||
            this.workspaceContextService.getWorkspace().folders.length === 0) {
            if (registeredExplorerViewDescriptor) {
                viewDescriptorsToDeregister.push(registeredExplorerViewDescriptor);
            }
            if (!registeredEmptyViewDescriptor) {
                viewDescriptorsToRegister.push(emptyViewDescriptor);
            }
        }
        else {
            if (registeredEmptyViewDescriptor) {
                viewDescriptorsToDeregister.push(registeredEmptyViewDescriptor);
            }
            if (!registeredExplorerViewDescriptor) {
                viewDescriptorsToRegister.push(explorerViewDescriptor);
            }
        }
        if (viewDescriptorsToDeregister.length) {
            viewsRegistry.deregisterViews(viewDescriptorsToDeregister, VIEW_CONTAINER);
        }
        if (viewDescriptorsToRegister.length) {
            viewsRegistry.registerViews(viewDescriptorsToRegister, VIEW_CONTAINER);
        }
        mark('code/didRegisterExplorerViews');
    }
    createOpenEditorsViewDescriptor() {
        return {
            id: OpenEditorsView.ID,
            name: OpenEditorsView.NAME,
            ctorDescriptor: new SyncDescriptor(OpenEditorsView),
            containerIcon: openEditorsViewIcon,
            order: 0,
            canToggleVisibility: true,
            canMoveView: true,
            collapsed: false,
            hideByDefault: true,
            focusCommand: {
                id: 'workbench.files.action.focusOpenEditorsView',
                keybindings: { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 35 /* KeyCode.KeyE */) },
            },
        };
    }
    createEmptyViewDescriptor() {
        return {
            id: EmptyView.ID,
            name: EmptyView.NAME,
            containerIcon: explorerViewIcon,
            ctorDescriptor: new SyncDescriptor(EmptyView),
            order: 1,
            canToggleVisibility: true,
            focusCommand: {
                id: 'workbench.explorer.fileView.focus',
            },
        };
    }
    createExplorerViewDescriptor() {
        return {
            id: VIEW_ID,
            name: localize2('folders', 'Folders'),
            containerIcon: explorerViewIcon,
            ctorDescriptor: new SyncDescriptor(ExplorerView),
            order: 1,
            canMoveView: true,
            canToggleVisibility: false,
            focusCommand: {
                id: 'workbench.explorer.fileView.focus',
            },
        };
    }
};
ExplorerViewletViewsContribution = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IProgressService)
], ExplorerViewletViewsContribution);
export { ExplorerViewletViewsContribution };
let ExplorerViewPaneContainer = class ExplorerViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, contextService, storageService, configurationService, instantiationService, contextKeyService, themeService, contextMenuService, extensionService, viewDescriptorService, logService) {
        super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.viewletVisibleContextKey = ExplorerViewletVisibleContext.bindTo(contextKeyService);
        this._register(this.contextService.onDidChangeWorkspaceName((e) => this.updateTitleArea()));
    }
    create(parent) {
        super.create(parent);
        parent.classList.add('explorer-viewlet');
    }
    createView(viewDescriptor, options) {
        if (viewDescriptor.id === VIEW_ID) {
            return this.instantiationService.createInstance(ExplorerView, {
                ...options,
                delegate: {
                    willOpenElement: (e) => {
                        if (!isMouseEvent(e)) {
                            return; // only delay when user clicks
                        }
                        const openEditorsView = this.getOpenEditorsView();
                        if (openEditorsView) {
                            let delay = 0;
                            const config = this.configurationService.getValue();
                            if (!!config.workbench?.editor?.enablePreview) {
                                // delay open editors view when preview is enabled
                                // to accomodate for the user doing a double click
                                // to pin the editor.
                                // without this delay a double click would be not
                                // possible because the next element would move
                                // under the mouse after the first click.
                                delay = 250;
                            }
                            openEditorsView.setStructuralRefreshDelay(delay);
                        }
                    },
                    didOpenElement: (e) => {
                        if (!isMouseEvent(e)) {
                            return; // only delay when user clicks
                        }
                        const openEditorsView = this.getOpenEditorsView();
                        openEditorsView?.setStructuralRefreshDelay(0);
                    },
                },
            });
        }
        return super.createView(viewDescriptor, options);
    }
    getExplorerView() {
        return this.getView(VIEW_ID);
    }
    getOpenEditorsView() {
        return this.getView(OpenEditorsView.ID);
    }
    setVisible(visible) {
        this.viewletVisibleContextKey.set(visible);
        super.setVisible(visible);
    }
    focus() {
        const explorerView = this.getView(VIEW_ID);
        if (explorerView && this.panes.every((p) => !p.isExpanded())) {
            explorerView.setExpanded(true);
        }
        if (explorerView?.isExpanded()) {
            explorerView.focus();
        }
        else {
            super.focus();
        }
    }
};
ExplorerViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IThemeService),
    __param(8, IContextMenuService),
    __param(9, IExtensionService),
    __param(10, IViewDescriptorService),
    __param(11, ILogService)
], ExplorerViewPaneContainer);
export { ExplorerViewPaneContainer };
const viewContainerRegistry = Registry.as(Extensions.ViewContainersRegistry);
/**
 * Explorer viewlet container.
 */
export const VIEW_CONTAINER = viewContainerRegistry.registerViewContainer({
    id: VIEWLET_ID,
    title: localize2('explore', 'Explorer'),
    ctorDescriptor: new SyncDescriptor(ExplorerViewPaneContainer),
    storageId: 'workbench.explorer.views.state',
    icon: explorerViewIcon,
    alwaysUseContainerInfo: true,
    hideIfEmpty: true,
    order: 0,
    openCommandActionDescriptor: {
        id: VIEWLET_ID,
        title: localize2('explore', 'Explorer'),
        mnemonicTitle: localize({ key: 'miViewExplorer', comment: ['&& denotes a mnemonic'] }, '&&Explorer'),
        keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 35 /* KeyCode.KeyE */ },
        order: 0,
    },
}, 0 /* ViewContainerLocation.Sidebar */, { isDefault: true });
const openFolder = localize('openFolder', 'Open Folder');
const addAFolder = localize('addAFolder', 'add a folder');
const openRecent = localize('openRecent', 'Open Recent');
const addRootFolderButton = `[${openFolder}](command:${AddRootFolderAction.ID})`;
const addAFolderButton = `[${addAFolder}](command:${AddRootFolderAction.ID})`;
const openFolderButton = `[${openFolder}](command:${isMacintosh && !isWeb ? OpenFileFolderAction.ID : OpenFolderAction.ID})`;
const openFolderViaWorkspaceButton = `[${openFolder}](command:${OpenFolderViaWorkspaceAction.ID})`;
const openRecentButton = `[${openRecent}](command:${OpenRecentAction.ID})`;
const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({
        key: 'noWorkspaceHelp',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
        ],
    }, 'You have not yet added a folder to the workspace.\n{0}', addRootFolderButton),
    when: ContextKeyExpr.and(
    // inside a .code-workspace
    WorkbenchStateContext.isEqualTo('workspace'), 
    // unless we cannot enter or open workspaces (e.g. web serverless)
    OpenFolderWorkspaceSupportContext),
    group: ViewContentGroups.Open,
    order: 1,
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({
        key: 'noFolderHelpWeb',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
        ],
    }, 'You have not yet opened a folder.\n{0}\n{1}', openFolderViaWorkspaceButton, openRecentButton),
    when: ContextKeyExpr.and(
    // inside a .code-workspace
    WorkbenchStateContext.isEqualTo('workspace'), 
    // we cannot enter workspaces (e.g. web serverless)
    OpenFolderWorkspaceSupportContext.toNegated()),
    group: ViewContentGroups.Open,
    order: 1,
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({
        key: 'remoteNoFolderHelp',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
        ],
    }, 'Connected to remote.\n{0}', openFolderButton),
    when: ContextKeyExpr.and(
    // not inside a .code-workspace
    WorkbenchStateContext.notEqualsTo('workspace'), 
    // connected to a remote
    RemoteNameContext.notEqualsTo(''), 
    // but not in web
    IsWebContext.toNegated()),
    group: ViewContentGroups.Open,
    order: 1,
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({
        key: 'noFolderButEditorsHelp',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
        ],
    }, 'You have not yet opened a folder.\n{0}\nOpening a folder will close all currently open editors. To keep them open, {1} instead.', openFolderButton, addAFolderButton),
    when: ContextKeyExpr.and(
    // editors are opened
    ContextKeyExpr.has('editorIsOpen'), ContextKeyExpr.or(
    // not inside a .code-workspace and local
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), RemoteNameContext.isEqualTo('')), 
    // not inside a .code-workspace and web
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), IsWebContext))),
    group: ViewContentGroups.Open,
    order: 1,
});
viewsRegistry.registerViewWelcomeContent(EmptyView.ID, {
    content: localize({
        key: 'noFolderHelp',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
        ],
    }, 'You have not yet opened a folder.\n{0}', openFolderButton),
    when: ContextKeyExpr.and(
    // no editor is open
    ContextKeyExpr.has('editorIsOpen')?.negate(), ContextKeyExpr.or(
    // not inside a .code-workspace and local
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), RemoteNameContext.isEqualTo('')), 
    // not inside a .code-workspace and web
    ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('workspace'), IsWebContext))),
    group: ViewContentGroups.Open,
    order: 1,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3bGV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9leHBsb3JlclZpZXdsZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sVUFBVSxFQUNWLE9BQU8sRUFFUCw2QkFBNkIsR0FDN0IsTUFBTSxvQkFBb0IsQ0FBQTtBQUUzQixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FB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