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
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../common/userDataProfile.js';
import { UserDataProfilesService } from '../node/userDataProfile.js';
import { IStateService } from '../../state/node/state.js';
export const IUserDataProfilesMainService = refineServiceDecorator(IUserDataProfilesService);
let UserDataProfilesMainService = class UserDataProfilesMainService extends UserDataProfilesService {
    constructor(stateService, uriIdentityService, environmentService, fileService, logService) {
        super(stateService, uriIdentityService, environmentService, fileService, logService);
    }
    getAssociatedEmptyWindows() {
        const emptyWindows = [];
        for (const id of this.profilesObject.emptyWindows.keys()) {
            emptyWindows.push({ id });
        }
        return emptyWindows;
    }
};
UserDataProfilesMainService = __decorate([
    __param(0, IStateService),
    __param(1, IUriIdentityService),
    __param(2, INativeEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataProfilesMainService);
export { UserDataProfilesMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL2VsZWN0cm9uLW1haW4vdXNlckRhdGFQcm9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUNOLHdCQUF3QixHQUl4QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBS3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUV6RCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxzQkFBc0IsQ0FHaEUsd0JBQXdCLENBQUMsQ0FBQTtBQVNwQixJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUNaLFNBQVEsdUJBQXVCO0lBRy9CLFlBQ2dCLFlBQTJCLEVBQ3JCLGtCQUF1QyxFQUNqQyxrQkFBNkMsRUFDMUQsV0FBeUIsRUFDMUIsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVELHlCQUF5QjtRQUN4QixNQUFNLFlBQVksR0FBZ0MsRUFBRSxDQUFBO1FBQ3BELEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUMxRCxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxQixDQUFDO1FBQ0QsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztDQUNELENBQUE7QUFyQlksMkJBQTJCO0lBS3JDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7R0FURCwyQkFBMkIsQ0FxQnZDIn0=