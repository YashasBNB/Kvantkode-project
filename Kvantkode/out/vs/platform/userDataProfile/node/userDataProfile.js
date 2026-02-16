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
var UserDataProfilesReadonlyService_1, UserDataProfilesService_1;
import { URI } from '../../../base/common/uri.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IStateReadService, IStateService } from '../../state/node/state.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { UserDataProfilesService as BaseUserDataProfilesService, } from '../common/userDataProfile.js';
import { isString } from '../../../base/common/types.js';
import { StateService } from '../../state/node/stateService.js';
let UserDataProfilesReadonlyService = UserDataProfilesReadonlyService_1 = class UserDataProfilesReadonlyService extends BaseUserDataProfilesService {
    constructor(stateReadonlyService, uriIdentityService, nativeEnvironmentService, fileService, logService) {
        super(nativeEnvironmentService, fileService, uriIdentityService, logService);
        this.stateReadonlyService = stateReadonlyService;
        this.nativeEnvironmentService = nativeEnvironmentService;
    }
    getStoredProfiles() {
        const storedProfilesState = this.stateReadonlyService.getItem(UserDataProfilesReadonlyService_1.PROFILES_KEY, []);
        return storedProfilesState.map((p) => ({
            ...p,
            location: isString(p.location)
                ? this.uriIdentityService.extUri.joinPath(this.profilesHome, p.location)
                : URI.revive(p.location),
        }));
    }
    getStoredProfileAssociations() {
        return this.stateReadonlyService.getItem(UserDataProfilesReadonlyService_1.PROFILE_ASSOCIATIONS_KEY, {});
    }
    getDefaultProfileExtensionsLocation() {
        return this.uriIdentityService.extUri.joinPath(URI.file(this.nativeEnvironmentService.extensionsPath).with({
            scheme: this.profilesHome.scheme,
        }), 'extensions.json');
    }
};
UserDataProfilesReadonlyService = UserDataProfilesReadonlyService_1 = __decorate([
    __param(0, IStateReadService),
    __param(1, IUriIdentityService),
    __param(2, INativeEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataProfilesReadonlyService);
export { UserDataProfilesReadonlyService };
let UserDataProfilesService = UserDataProfilesService_1 = class UserDataProfilesService extends UserDataProfilesReadonlyService {
    constructor(stateService, uriIdentityService, environmentService, fileService, logService) {
        super(stateService, uriIdentityService, environmentService, fileService, logService);
        this.stateService = stateService;
    }
    saveStoredProfiles(storedProfiles) {
        if (storedProfiles.length) {
            this.stateService.setItem(UserDataProfilesService_1.PROFILES_KEY, storedProfiles.map((profile) => ({
                ...profile,
                location: this.uriIdentityService.extUri.basename(profile.location),
            })));
        }
        else {
            this.stateService.removeItem(UserDataProfilesService_1.PROFILES_KEY);
        }
    }
    saveStoredProfileAssociations(storedProfileAssociations) {
        if (storedProfileAssociations.emptyWindows || storedProfileAssociations.workspaces) {
            this.stateService.setItem(UserDataProfilesService_1.PROFILE_ASSOCIATIONS_KEY, storedProfileAssociations);
        }
        else {
            this.stateService.removeItem(UserDataProfilesService_1.PROFILE_ASSOCIATIONS_KEY);
        }
    }
};
UserDataProfilesService = UserDataProfilesService_1 = __decorate([
    __param(0, IStateService),
    __param(1, IUriIdentityService),
    __param(2, INativeEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataProfilesService);
export { UserDataProfilesService };
let ServerUserDataProfilesService = class ServerUserDataProfilesService extends UserDataProfilesService {
    constructor(uriIdentityService, environmentService, fileService, logService) {
        super(new StateService(0 /* SaveStrategy.IMMEDIATE */, environmentService, logService, fileService), uriIdentityService, environmentService, fileService, logService);
    }
    async init() {
        await this.stateService.init();
        return super.init();
    }
};
ServerUserDataProfilesService = __decorate([
    __param(0, IUriIdentityService),
    __param(1, INativeEnvironmentService),
    __param(2, IFileService),
    __param(3, ILogService)
], ServerUserDataProfilesService);
export { ServerUserDataProfilesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvbm9kZS91c2VyRGF0YVByb2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQVUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sdUJBQXVCLElBQUksMkJBQTJCLEdBR3RELE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBZ0IsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFJdEUsSUFBTSwrQkFBK0IsdUNBQXJDLE1BQU0sK0JBQ1osU0FBUSwyQkFBMkI7SUFHbkMsWUFDcUMsb0JBQXVDLEVBQ3RELGtCQUF1QyxFQUNoQix3QkFBbUQsRUFDakYsV0FBeUIsRUFDMUIsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQU54Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQW1CO1FBRS9CLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7SUFLaEcsQ0FBQztJQUVrQixpQkFBaUI7UUFDbkMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUUzRCxpQ0FBK0IsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbkQsT0FBTyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdEMsR0FBRyxDQUFDO1lBQ0osUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUN4RSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1NBQ3pCLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVrQiw0QkFBNEI7UUFDOUMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUN2QyxpQ0FBK0IsQ0FBQyx3QkFBd0IsRUFDeEQsRUFBRSxDQUNGLENBQUE7SUFDRixDQUFDO0lBRWtCLG1DQUFtQztRQUNyRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDM0QsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTtTQUNoQyxDQUFDLEVBQ0YsaUJBQWlCLENBQ2pCLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXpDWSwrQkFBK0I7SUFLekMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtHQVRELCtCQUErQixDQXlDM0M7O0FBRU0sSUFBTSx1QkFBdUIsK0JBQTdCLE1BQU0sdUJBQ1osU0FBUSwrQkFBK0I7SUFHdkMsWUFDbUMsWUFBMkIsRUFDeEMsa0JBQXVDLEVBQ2pDLGtCQUE2QyxFQUMxRCxXQUF5QixFQUMxQixVQUF1QjtRQUVwQyxLQUFLLENBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQU5sRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtJQU85RCxDQUFDO0lBRWtCLGtCQUFrQixDQUFDLGNBQXVDO1FBQzVFLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUN4Qix5QkFBdUIsQ0FBQyxZQUFZLEVBQ3BDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hDLEdBQUcsT0FBTztnQkFDVixRQUFRLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUNuRSxDQUFDLENBQUMsQ0FDSCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyx5QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuRSxDQUFDO0lBQ0YsQ0FBQztJQUVrQiw2QkFBNkIsQ0FDL0MseUJBQW9EO1FBRXBELElBQUkseUJBQXlCLENBQUMsWUFBWSxJQUFJLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3BGLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUN4Qix5QkFBdUIsQ0FBQyx3QkFBd0IsRUFDaEQseUJBQXlCLENBQ3pCLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLHlCQUF1QixDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDL0UsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBeENZLHVCQUF1QjtJQUtqQyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsV0FBVyxDQUFBO0dBVEQsdUJBQXVCLENBd0NuQzs7QUFFTSxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUNaLFNBQVEsdUJBQXVCO0lBRy9CLFlBQ3NCLGtCQUF1QyxFQUNqQyxrQkFBNkMsRUFDMUQsV0FBeUIsRUFDMUIsVUFBdUI7UUFFcEMsS0FBSyxDQUNKLElBQUksWUFBWSxpQ0FBeUIsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxFQUNyRixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLFdBQVcsRUFDWCxVQUFVLENBQ1YsQ0FBQTtJQUNGLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNsQixNQUFPLElBQUksQ0FBQyxZQUE2QixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2hELE9BQU8sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3BCLENBQUM7Q0FDRCxDQUFBO0FBdkJZLDZCQUE2QjtJQUt2QyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtHQVJELDZCQUE2QixDQXVCekMifQ==