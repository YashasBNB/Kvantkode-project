/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { localize, localize2 } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
export const IUserDataSyncWorkbenchService = createDecorator('IUserDataSyncWorkbenchService');
export function getSyncAreaLabel(source) {
    switch (source) {
        case "settings" /* SyncResource.Settings */:
            return localize('settings', 'Settings');
        case "keybindings" /* SyncResource.Keybindings */:
            return localize('keybindings', 'Keyboard Shortcuts');
        case "snippets" /* SyncResource.Snippets */:
            return localize('snippets', 'Snippets');
        case "prompts" /* SyncResource.Prompts */:
            return localize('prompts', 'Prompts');
        case "tasks" /* SyncResource.Tasks */:
            return localize('tasks', 'Tasks');
        case "extensions" /* SyncResource.Extensions */:
            return localize('extensions', 'Extensions');
        case "globalState" /* SyncResource.GlobalState */:
            return localize('ui state label', 'UI State');
        case "profiles" /* SyncResource.Profiles */:
            return localize('profiles', 'Profiles');
        case "workspaceState" /* SyncResource.WorkspaceState */:
            return localize('workspace state label', 'Workspace State');
    }
}
export var AccountStatus;
(function (AccountStatus) {
    AccountStatus["Uninitialized"] = "uninitialized";
    AccountStatus["Unavailable"] = "unavailable";
    AccountStatus["Available"] = "available";
})(AccountStatus || (AccountStatus = {}));
export const SYNC_TITLE = localize2('sync category', 'Settings Sync');
export const SYNC_VIEW_ICON = registerIcon('settings-sync-view-icon', Codicon.sync, localize('syncViewIcon', 'View icon of the Settings Sync view.'));
// Contexts
export const CONTEXT_SYNC_STATE = new RawContextKey('syncStatus', "uninitialized" /* SyncStatus.Uninitialized */);
export const CONTEXT_SYNC_ENABLEMENT = new RawContextKey('syncEnabled', false);
export const CONTEXT_ACCOUNT_STATE = new RawContextKey('userDataSyncAccountStatus', "uninitialized" /* AccountStatus.Uninitialized */);
export const CONTEXT_ENABLE_ACTIVITY_VIEWS = new RawContextKey(`enableSyncActivityViews`, false);
export const CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW = new RawContextKey(`enableSyncConflictsView`, false);
export const CONTEXT_HAS_CONFLICTS = new RawContextKey('hasConflicts', false);
// Commands
export const CONFIGURE_SYNC_COMMAND_ID = 'workbench.userDataSync.actions.configure';
export const SHOW_SYNC_LOG_COMMAND_ID = 'workbench.userDataSync.actions.showLog';
// VIEWS
export const SYNC_VIEW_CONTAINER_ID = 'workbench.view.sync';
export const SYNC_CONFLICTS_VIEW_ID = 'workbench.views.sync.conflicts';
export const DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR = {
    id: 'workbench.userDataSync.actions.downloadSyncActivity',
    title: localize2('download sync activity title', 'Download Settings Sync Activity'),
    category: Categories.Developer,
    f1: true,
    precondition: ContextKeyExpr.and(CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQVM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFVekYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUMzRCwrQkFBK0IsQ0FDL0IsQ0FBQTtBQW9DRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsTUFBb0I7SUFDcEQsUUFBUSxNQUFNLEVBQUUsQ0FBQztRQUNoQjtZQUNDLE9BQU8sUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN4QztZQUNDLE9BQU8sUUFBUSxDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3JEO1lBQ0MsT0FBTyxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3hDO1lBQ0MsT0FBTyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3RDO1lBQ0MsT0FBTyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2xDO1lBQ0MsT0FBTyxRQUFRLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzVDO1lBQ0MsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDOUM7WUFDQyxPQUFPLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDeEM7WUFDQyxPQUFPLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQzdELENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGFBSWpCO0FBSkQsV0FBa0IsYUFBYTtJQUM5QixnREFBK0IsQ0FBQTtJQUMvQiw0Q0FBMkIsQ0FBQTtJQUMzQix3Q0FBdUIsQ0FBQTtBQUN4QixDQUFDLEVBSmlCLGFBQWEsS0FBYixhQUFhLFFBSTlCO0FBTUQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFxQixTQUFTLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFBO0FBRXZGLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQ3pDLHlCQUF5QixFQUN6QixPQUFPLENBQUMsSUFBSSxFQUNaLFFBQVEsQ0FBQyxjQUFjLEVBQUUsc0NBQXNDLENBQUMsQ0FDaEUsQ0FBQTtBQUVELFdBQVc7QUFDWCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGFBQWEsQ0FBUyxZQUFZLGlEQUEyQixDQUFBO0FBQ25HLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFVLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN2RixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FDckQsMkJBQTJCLG9EQUUzQixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQzdELHlCQUF5QixFQUN6QixLQUFLLENBQ0wsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLElBQUksYUFBYSxDQUNsRSx5QkFBeUIsRUFDekIsS0FBSyxDQUNMLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFFdEYsV0FBVztBQUNYLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLDBDQUEwQyxDQUFBO0FBQ25GLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLHdDQUF3QyxDQUFBO0FBRWhGLFFBQVE7QUFDUixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxxQkFBcUIsQ0FBQTtBQUMzRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxnQ0FBZ0MsQ0FBQTtBQUV0RSxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBOEI7SUFDN0UsRUFBRSxFQUFFLHFEQUFxRDtJQUN6RCxLQUFLLEVBQUUsU0FBUyxDQUFDLDhCQUE4QixFQUFFLGlDQUFpQyxDQUFDO0lBQ25GLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztJQUM5QixFQUFFLEVBQUUsSUFBSTtJQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixxQkFBcUIsQ0FBQyxTQUFTLDJDQUF5QixFQUN4RCxrQkFBa0IsQ0FBQyxXQUFXLGdEQUEwQixDQUN4RDtDQUNELENBQUEifQ==