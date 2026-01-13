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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBUzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQVV6RixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxlQUFlLENBQzNELCtCQUErQixDQUMvQixDQUFBO0FBb0NELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxNQUFvQjtJQUNwRCxRQUFRLE1BQU0sRUFBRSxDQUFDO1FBQ2hCO1lBQ0MsT0FBTyxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3hDO1lBQ0MsT0FBTyxRQUFRLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDckQ7WUFDQyxPQUFPLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDeEM7WUFDQyxPQUFPLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdEM7WUFDQyxPQUFPLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbEM7WUFDQyxPQUFPLFFBQVEsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDNUM7WUFDQyxPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM5QztZQUNDLE9BQU8sUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN4QztZQUNDLE9BQU8sUUFBUSxDQUFDLHVCQUF1QixFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDN0QsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0IsYUFJakI7QUFKRCxXQUFrQixhQUFhO0lBQzlCLGdEQUErQixDQUFBO0lBQy9CLDRDQUEyQixDQUFBO0lBQzNCLHdDQUF1QixDQUFBO0FBQ3hCLENBQUMsRUFKaUIsYUFBYSxLQUFiLGFBQWEsUUFJOUI7QUFNRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQXFCLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUE7QUFFdkYsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FDekMseUJBQXlCLEVBQ3pCLE9BQU8sQ0FBQyxJQUFJLEVBQ1osUUFBUSxDQUFDLGNBQWMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUNoRSxDQUFBO0FBRUQsV0FBVztBQUNYLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLElBQUksYUFBYSxDQUFTLFlBQVksaURBQTJCLENBQUE7QUFDbkcsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxhQUFhLENBQVUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ3ZGLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUNyRCwyQkFBMkIsb0RBRTNCLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FDN0QseUJBQXlCLEVBQ3pCLEtBQUssQ0FDTCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSxhQUFhLENBQ2xFLHlCQUF5QixFQUN6QixLQUFLLENBQ0wsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUFVLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUV0RixXQUFXO0FBQ1gsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsMENBQTBDLENBQUE7QUFDbkYsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsd0NBQXdDLENBQUE7QUFFaEYsUUFBUTtBQUNSLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLHFCQUFxQixDQUFBO0FBQzNELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGdDQUFnQyxDQUFBO0FBRXRFLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUE4QjtJQUM3RSxFQUFFLEVBQUUscURBQXFEO0lBQ3pELEtBQUssRUFBRSxTQUFTLENBQUMsOEJBQThCLEVBQUUsaUNBQWlDLENBQUM7SUFDbkYsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO0lBQzlCLEVBQUUsRUFBRSxJQUFJO0lBQ1IsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLHFCQUFxQixDQUFDLFNBQVMsMkNBQXlCLEVBQ3hELGtCQUFrQixDQUFDLFdBQVcsZ0RBQTBCLENBQ3hEO0NBQ0QsQ0FBQSJ9