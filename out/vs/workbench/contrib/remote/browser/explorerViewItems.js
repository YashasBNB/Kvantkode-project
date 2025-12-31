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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3SXRlbXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci9leHBsb3JlclZpZXdJdGVtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsd0JBQXdCLEdBQ3hCLE1BQU0sMERBQTBELENBQUE7QUFHakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBUWhGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUFTLDBCQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBRTdGLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQU9u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