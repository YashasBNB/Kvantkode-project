/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileManagementService, PROFILES_CATEGORY, } from '../../../services/userDataProfile/common/userDataProfile.js';
class CreateTransientProfileAction extends Action2 {
    static { this.ID = 'workbench.profiles.actions.createTemporaryProfile'; }
    static { this.TITLE = localize2('create temporary profile', 'Create a Temporary Profile'); }
    constructor() {
        super({
            id: CreateTransientProfileAction.ID,
            title: CreateTransientProfileAction.TITLE,
            category: PROFILES_CATEGORY,
            f1: true,
        });
    }
    async run(accessor) {
        return accessor.get(IUserDataProfileManagementService).createAndEnterTransientProfile();
    }
}
registerAction2(CreateTransientProfileAction);
// Developer Actions
registerAction2(class CleanupProfilesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.profiles.actions.cleanupProfiles',
            title: localize2('cleanup profile', 'Cleanup Profiles'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        return accessor.get(IUserDataProfilesService).cleanUp();
    }
});
registerAction2(class ResetWorkspacesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.profiles.actions.resetWorkspaces',
            title: localize2('reset workspaces', 'Reset Workspace Profiles Associations'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const userDataProfilesService = accessor.get(IUserDataProfilesService);
        return userDataProfilesService.resetWorkspaces();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pHLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsaUJBQWlCLEdBQ2pCLE1BQU0sNkRBQTZELENBQUE7QUFFcEUsTUFBTSw0QkFBNkIsU0FBUSxPQUFPO2FBQ2pDLE9BQUUsR0FBRyxtREFBbUQsQ0FBQTthQUN4RCxVQUFLLEdBQUcsU0FBUyxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDLENBQUE7SUFDM0Y7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNEJBQTRCLENBQUMsRUFBRTtZQUNuQyxLQUFLLEVBQUUsNEJBQTRCLENBQUMsS0FBSztZQUN6QyxRQUFRLEVBQUUsaUJBQWlCO1lBQzNCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtJQUN4RixDQUFDOztBQUdGLGVBQWUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO0FBRTdDLG9CQUFvQjtBQUVwQixlQUFlLENBQ2QsTUFBTSxxQkFBc0IsU0FBUSxPQUFPO0lBQzFDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRDQUE0QztZQUNoRCxLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDO1lBQ3ZELFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3hELENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSxxQkFBc0IsU0FBUSxPQUFPO0lBQzFDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRDQUE0QztZQUNoRCxLQUFLLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLHVDQUF1QyxDQUFDO1lBQzdFLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3RFLE9BQU8sdUJBQXVCLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDakQsQ0FBQztDQUNELENBQ0QsQ0FBQSJ9