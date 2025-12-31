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
import { TreeItemCollapsibleState, IViewDescriptorService, } from '../../../common/views.js';
import { localize } from '../../../../nls.js';
import { TreeViewPane } from '../../../browser/parts/views/treeView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IUserDataSyncService, IUserDataSyncEnablementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getSyncAreaLabel, IUserDataSyncWorkbenchService, SYNC_CONFLICTS_VIEW_ID, } from '../../../services/userDataSync/common/userDataSync.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import * as DOM from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IUserDataProfilesService, reviveProfile, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAccessibleViewInformationService } from '../../../services/accessibility/common/accessibleViewInformationService.js';
let UserDataSyncConflictsViewPane = class UserDataSyncConflictsViewPane extends TreeViewPane {
    constructor(options, editorService, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, notificationService, hoverService, userDataSyncService, userDataSyncWorkbenchService, userDataSyncEnablementService, userDataProfilesService, accessibleViewVisibilityService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, notificationService, hoverService, accessibleViewVisibilityService);
        this.editorService = editorService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataProfilesService = userDataProfilesService;
        this._register(this.userDataSyncService.onDidChangeConflicts(() => this.treeView.refresh()));
        this.registerActions();
    }
    renderTreeView(container) {
        super.renderTreeView(DOM.append(container, DOM.$('')));
        const that = this;
        this.treeView.message = localize('explanation', 'Please go through each entry and merge to resolve conflicts.');
        this.treeView.dataProvider = {
            getChildren() {
                return that.getTreeItems();
            },
        };
    }
    async getTreeItems() {
        const roots = [];
        const conflictResources = this.userDataSyncService.conflicts
            .map((conflict) => conflict.conflicts.map((resourcePreview) => ({
            ...resourcePreview,
            syncResource: conflict.syncResource,
            profile: conflict.profile,
        })))
            .flat()
            .sort((a, b) => a.profile.id === b.profile.id
            ? 0
            : a.profile.isDefault
                ? -1
                : b.profile.isDefault
                    ? 1
                    : a.profile.name.localeCompare(b.profile.name));
        const conflictResourcesByProfile = [];
        for (const previewResource of conflictResources) {
            let result = conflictResourcesByProfile[conflictResourcesByProfile.length - 1]?.[0].id ===
                previewResource.profile.id
                ? conflictResourcesByProfile[conflictResourcesByProfile.length - 1][1]
                : undefined;
            if (!result) {
                conflictResourcesByProfile.push([previewResource.profile, (result = [])]);
            }
            result.push(previewResource);
        }
        for (const [profile, resources] of conflictResourcesByProfile) {
            const children = [];
            for (const resource of resources) {
                const handle = JSON.stringify(resource);
                const treeItem = {
                    handle,
                    resourceUri: resource.remoteResource,
                    label: {
                        label: basename(resource.remoteResource),
                        strikethrough: resource.mergeState === "accepted" /* MergeState.Accepted */ &&
                            (resource.localChange === 3 /* Change.Deleted */ || resource.remoteChange === 3 /* Change.Deleted */),
                    },
                    description: getSyncAreaLabel(resource.syncResource),
                    collapsibleState: TreeItemCollapsibleState.None,
                    command: {
                        id: `workbench.actions.sync.openConflicts`,
                        title: '',
                        arguments: [
                            { $treeViewId: '', $treeItemHandle: handle },
                        ],
                    },
                    contextValue: `sync-conflict-resource`,
                };
                children.push(treeItem);
            }
            roots.push({
                handle: profile.id,
                label: { label: profile.name },
                collapsibleState: TreeItemCollapsibleState.Expanded,
                children,
            });
        }
        return conflictResourcesByProfile.length === 1 && conflictResourcesByProfile[0][0].isDefault
            ? (roots[0].children ?? [])
            : roots;
    }
    parseHandle(handle) {
        const parsed = JSON.parse(handle);
        return {
            syncResource: parsed.syncResource,
            profile: reviveProfile(parsed.profile, this.userDataProfilesService.profilesHome.scheme),
            localResource: URI.revive(parsed.localResource),
            remoteResource: URI.revive(parsed.remoteResource),
            baseResource: URI.revive(parsed.baseResource),
            previewResource: URI.revive(parsed.previewResource),
            acceptedResource: URI.revive(parsed.acceptedResource),
            localChange: parsed.localChange,
            remoteChange: parsed.remoteChange,
            mergeState: parsed.mergeState,
        };
    }
    registerActions() {
        const that = this;
        this._register(registerAction2(class OpenConflictsAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.openConflicts`,
                    title: localize({
                        key: 'workbench.actions.sync.openConflicts',
                        comment: [
                            'This is an action title to show the conflicts between local and remote version of resources',
                        ],
                    }, 'Show Conflicts'),
                });
            }
            async run(accessor, handle) {
                const conflict = that.parseHandle(handle.$treeItemHandle);
                return that.open(conflict);
            }
        }));
        this._register(registerAction2(class AcceptRemoteAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.acceptRemote`,
                    title: localize('workbench.actions.sync.acceptRemote', 'Accept Remote'),
                    icon: Codicon.cloudDownload,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', SYNC_CONFLICTS_VIEW_ID), ContextKeyExpr.equals('viewItem', 'sync-conflict-resource')),
                        group: 'inline',
                        order: 1,
                    },
                });
            }
            async run(accessor, handle) {
                const conflict = that.parseHandle(handle.$treeItemHandle);
                await that.userDataSyncWorkbenchService.accept({ syncResource: conflict.syncResource, profile: conflict.profile }, conflict.remoteResource, undefined, that.userDataSyncEnablementService.isEnabled());
            }
        }));
        this._register(registerAction2(class AcceptLocalAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.acceptLocal`,
                    title: localize('workbench.actions.sync.acceptLocal', 'Accept Local'),
                    icon: Codicon.cloudUpload,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', SYNC_CONFLICTS_VIEW_ID), ContextKeyExpr.equals('viewItem', 'sync-conflict-resource')),
                        group: 'inline',
                        order: 2,
                    },
                });
            }
            async run(accessor, handle) {
                const conflict = that.parseHandle(handle.$treeItemHandle);
                await that.userDataSyncWorkbenchService.accept({ syncResource: conflict.syncResource, profile: conflict.profile }, conflict.localResource, undefined, that.userDataSyncEnablementService.isEnabled());
            }
        }));
    }
    async open(conflictToOpen) {
        if (!this.userDataSyncService.conflicts.some(({ conflicts }) => conflicts.some(({ localResource }) => isEqual(localResource, conflictToOpen.localResource)))) {
            return;
        }
        const remoteResourceName = localize({ key: 'remoteResourceName', comment: ['remote as in file in cloud'] }, '{0} (Remote)', basename(conflictToOpen.remoteResource));
        const localResourceName = localize('localResourceName', '{0} (Local)', basename(conflictToOpen.remoteResource));
        await this.editorService.openEditor({
            input1: {
                resource: conflictToOpen.remoteResource,
                label: localize('Theirs', 'Theirs'),
                description: remoteResourceName,
            },
            input2: {
                resource: conflictToOpen.localResource,
                label: localize('Yours', 'Yours'),
                description: localResourceName,
            },
            base: { resource: conflictToOpen.baseResource },
            result: { resource: conflictToOpen.previewResource },
            options: {
                preserveFocus: true,
                revealIfVisible: true,
                pinned: true,
                override: DEFAULT_EDITOR_ASSOCIATION.id,
            },
        });
        return;
    }
};
UserDataSyncConflictsViewPane = __decorate([
    __param(1, IEditorService),
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, INotificationService),
    __param(11, IHoverService),
    __param(12, IUserDataSyncService),
    __param(13, IUserDataSyncWorkbenchService),
    __param(14, IUserDataSyncEnablementService),
    __param(15, IUserDataProfilesService),
    __param(16, IAccessibleViewInformationService)
], UserDataSyncConflictsViewPane);
export { UserDataSyncConflictsViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jQ29uZmxpY3RzVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhU3luYy9icm93c2VyL3VzZXJEYXRhU3luY0NvbmZsaWN0c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLHdCQUF3QixFQUV4QixzQkFBc0IsR0FDdEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sb0JBQW9CLEVBS3BCLDhCQUE4QixHQUM5QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLDZCQUE2QixFQUM3QixzQkFBc0IsR0FDdEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNE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