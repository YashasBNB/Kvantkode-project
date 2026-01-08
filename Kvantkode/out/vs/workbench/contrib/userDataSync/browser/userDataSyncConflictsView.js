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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jQ29uZmxpY3RzVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXNlckRhdGFTeW5jL2Jyb3dzZXIvdXNlckRhdGFTeW5jQ29uZmxpY3RzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sd0JBQXdCLEVBRXhCLHNCQUFzQixHQUN0QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixvQkFBb0IsRUFLcEIsOEJBQThCLEdBQzlCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixnQkFBZ0IsRUFFaEIsNkJBQTZCLEVBQzdCLHNCQUFzQixHQUN0QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxz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