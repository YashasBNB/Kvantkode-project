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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL25vZGUvdXNlckRhdGFQcm9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFVLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUVOLHVCQUF1QixJQUFJLDJCQUEyQixHQUd0RCxNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQWdCLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSXRFLElBQU0sK0JBQStCLHVDQUFyQyxNQUFNLCtCQUNaLFNBQVEsMkJBQTJCO0lBR25DLFlBQ3FDLG9CQUF1QyxFQUN0RCxrQkFBdUMsRUFDaEIsd0JBQW1ELEVBQ2pGLFdBQXlCLEVBQzFCLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFOeEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFtQjtRQUUvQiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO0lBS2hHLENBQUM7SUFFa0IsaUJB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