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
import * as nls from '../../../../nls.js';
import { IRemoteExplorerService, REMOTE_EXPLORER_TYPE_KEY, } from '../../../services/remote/common/remoteExplorerService.js';
import { isStringArray } from '../../../../base/common/types.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { VIEWLET_ID } from './remoteExplorer.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
export const SELECTED_REMOTE_IN_EXPLORER = new RawContextKey('selectedRemoteInExplorer', '');
let SwitchRemoteViewItem = class SwitchRemoteViewItem extends Disposable {
    constructor(contextKeyService, remoteExplorerService, environmentService, storageService, workspaceContextService) {
        super();
        this.contextKeyService = contextKeyService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.workspaceContextService = workspaceContextService;
        this.completedRemotes = this._register(new DisposableMap());
        this.selectedRemoteContext = SELECTED_REMOTE_IN_EXPLORER.bindTo(contextKeyService);
        this.switchRemoteMenu = MenuId.for('workbench.remote.menu.switchRemoteMenu');
        this._register(MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
            submenu: this.switchRemoteMenu,
            title: nls.localize('switchRemote.label', 'Switch Remote'),
            group: 'navigation',
            when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
            order: 1,
            isSelection: true,
        }));
        this._register(remoteExplorerService.onDidChangeTargetType((e) => {
            this.select(e);
        }));
    }
    setSelectionForConnection() {
        let isSetForConnection = false;
        if (this.completedRemotes.size > 0) {
            let authority;
            const remoteAuthority = this.environmentService.remoteAuthority;
            let virtualWorkspace;
            if (!remoteAuthority) {
                virtualWorkspace = getVirtualWorkspaceLocation(this.workspaceContextService.getWorkspace())?.scheme;
            }
            isSetForConnection = true;
            const explorerType = remoteAuthority
                ? [remoteAuthority.split('+')[0]]
                : virtualWorkspace
                    ? [virtualWorkspace]
                    : (this.storageService
                        .get(REMOTE_EXPLORER_TYPE_KEY, 1 /* StorageScope.WORKSPACE */)
                        ?.split(',') ??
                        this.storageService.get(REMOTE_EXPLORER_TYPE_KEY, 0 /* StorageScope.PROFILE */)?.split(','));
            if (explorerType !== undefined) {
                authority = this.getAuthorityForExplorerType(explorerType);
            }
            if (authority) {
                this.select(authority);
            }
        }
        return isSetForConnection;
    }
    select(authority) {
        this.selectedRemoteContext.set(authority[0]);
        this.remoteExplorerService.targetType = authority;
    }
    getAuthorityForExplorerType(explorerType) {
        let authority;
        for (const option of this.completedRemotes) {
            for (const authorityOption of option[1].authority) {
                for (const explorerOption of explorerType) {
                    if (authorityOption === explorerOption) {
                        authority = option[1].authority;
                        break;
                    }
                    else if (option[1].virtualWorkspace === explorerOption) {
                        authority = option[1].authority;
                        break;
                    }
                }
            }
        }
        return authority;
    }
    removeOptionItems(views) {
        for (const view of views) {
            if (view.group &&
                view.group.startsWith('targets') &&
                view.remoteAuthority &&
                (!view.when || this.contextKeyService.contextMatchesRules(view.when))) {
                const authority = isStringArray(view.remoteAuthority)
                    ? view.remoteAuthority
                    : [view.remoteAuthority];
                this.completedRemotes.deleteAndDispose(authority[0]);
            }
        }
    }
    createOptionItems(views) {
        const startingCount = this.completedRemotes.size;
        for (const view of views) {
            if (view.group &&
                view.group.startsWith('targets') &&
                view.remoteAuthority &&
                (!view.when || this.contextKeyService.contextMatchesRules(view.when))) {
                const text = view.name;
                const authority = isStringArray(view.remoteAuthority)
                    ? view.remoteAuthority
                    : [view.remoteAuthority];
                if (this.completedRemotes.has(authority[0])) {
                    continue;
                }
                const thisCapture = this;
                const action = registerAction2(class extends Action2 {
                    constructor() {
                        super({
                            id: `workbench.action.remoteExplorer.show.${authority[0]}`,
                            title: text,
                            toggled: SELECTED_REMOTE_IN_EXPLORER.isEqualTo(authority[0]),
                            menu: {
                                id: thisCapture.switchRemoteMenu,
                            },
                        });
                    }
                    async run() {
                        thisCapture.select(authority);
                    }
                });
                this.completedRemotes.set(authority[0], {
                    text: text.value,
                    authority,
                    virtualWorkspace: view.virtualWorkspace,
                    dispose: () => action.dispose(),
                });
            }
        }
        if (this.completedRemotes.size > startingCount) {
            this.setSelectionForConnection();
        }
    }
};
SwitchRemoteViewItem = __decorate([
    __param(0, IContextKeyService),
    __param(1, IRemoteExplorerService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IStorageService),
    __param(4, IWorkspaceContextService)
], SwitchRemoteViewItem);
export { SwitchRemoteViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3SXRlbXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL2V4cGxvcmVyVmlld0l0ZW1zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix3QkFBd0IsR0FDeEIsTUFBTSwwREFBMEQsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RixPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFRaEYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxhQUFhLENBQVMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFFN0YsSUFBTSxvQkFBb0IsR0FBMUIsTUFB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