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
import { BroadcastDataChannel } from '../../../base/browser/broadcast.js';
import { revive } from '../../../base/common/marshalling.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { reviveProfile, UserDataProfilesService, } from '../common/userDataProfile.js';
let BrowserUserDataProfilesService = class BrowserUserDataProfilesService extends UserDataProfilesService {
    constructor(environmentService, fileService, uriIdentityService, logService) {
        super(environmentService, fileService, uriIdentityService, logService);
        this.changesBroadcastChannel = this._register(new BroadcastDataChannel(`${UserDataProfilesService.PROFILES_KEY}.changes`));
        this._register(this.changesBroadcastChannel.onDidReceiveData((changes) => {
            try {
                this._profilesObject = undefined;
                const added = changes.added.map((p) => reviveProfile(p, this.profilesHome.scheme));
                const removed = changes.removed.map((p) => reviveProfile(p, this.profilesHome.scheme));
                const updated = changes.updated.map((p) => reviveProfile(p, this.profilesHome.scheme));
                this.updateTransientProfiles(added.filter((a) => a.isTransient), removed.filter((a) => a.isTransient), updated.filter((a) => a.isTransient));
                this._onDidChangeProfiles.fire({
                    added,
                    removed,
                    updated,
                    all: this.profiles,
                });
            }
            catch (error) {
                /* ignore */
            }
        }));
    }
    updateTransientProfiles(added, removed, updated) {
        if (added.length) {
            this.transientProfilesObject.profiles.push(...added);
        }
        if (removed.length || updated.length) {
            const allTransientProfiles = this.transientProfilesObject.profiles;
            this.transientProfilesObject.profiles = [];
            for (const profile of allTransientProfiles) {
                if (removed.some((p) => profile.id === p.id)) {
                    continue;
                }
                this.transientProfilesObject.profiles.push(updated.find((p) => profile.id === p.id) ?? profile);
            }
        }
    }
    getStoredProfiles() {
        try {
            const value = localStorage.getItem(UserDataProfilesService.PROFILES_KEY);
            if (value) {
                return revive(JSON.parse(value));
            }
        }
        catch (error) {
            /* ignore */
            this.logService.error(error);
        }
        return [];
    }
    triggerProfilesChanges(added, removed, updated) {
        super.triggerProfilesChanges(added, removed, updated);
        this.changesBroadcastChannel.postData({ added, removed, updated });
    }
    saveStoredProfiles(storedProfiles) {
        localStorage.setItem(UserDataProfilesService.PROFILES_KEY, JSON.stringify(storedProfiles));
    }
    getStoredProfileAssociations() {
        try {
            const value = localStorage.getItem(UserDataProfilesService.PROFILE_ASSOCIATIONS_KEY);
            if (value) {
                return JSON.parse(value);
            }
        }
        catch (error) {
            /* ignore */
            this.logService.error(error);
        }
        return {};
    }
    saveStoredProfileAssociations(storedProfileAssociations) {
        localStorage.setItem(UserDataProfilesService.PROFILE_ASSOCIATIONS_KEY, JSON.stringify(storedProfileAssociations));
    }
};
BrowserUserDataProfilesService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], BrowserUserDataProfilesService);
export { BrowserUserDataProfilesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdXNlckRhdGFQcm9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFJTixhQUFhLEVBR2IsdUJBQXVCLEdBQ3ZCLE1BQU0sOEJBQThCLENBQUE7QUFJOUIsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFDWixTQUFRLHVCQUF1QjtJQUsvQixZQUNzQixrQkFBdUMsRUFDOUMsV0FBeUIsRUFDbEIsa0JBQXVDLEVBQy9DLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVDLElBQUksb0JBQW9CLENBQ3ZCLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxVQUFVLENBQ2pELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDekQsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO2dCQUNoQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQ2xGLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFDdEYsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUV0RixJQUFJLENBQUMsdUJBQXVCLENBQzNCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDbEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUNwQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQ3BDLENBQUE7Z0JBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztvQkFDOUIsS0FBSztvQkFDTCxPQUFPO29CQUNQLE9BQU87b0JBQ1AsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRO2lCQUNsQixDQUFDLENBQUE7WUFDSCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsWUFBWTtZQUNiLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUM5QixLQUF5QixFQUN6QixPQUEyQixFQUMzQixPQUEyQjtRQUUzQixJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQTtZQUNsRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQTtZQUMxQyxLQUFLLE1BQU0sT0FBTyxJQUFJLG9CQUFvQixFQUFFLENBQUM7Z0JBQzVDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDOUMsU0FBUTtnQkFDVCxDQUFDO2dCQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUN6QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxPQUFPLENBQ25ELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFa0IsaUJBQWlCO1FBQ25DLElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDeEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLFlBQVk7WUFDWixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRWtCLHNCQUFzQixDQUN4QyxLQUF5QixFQUN6QixPQUEyQixFQUMzQixPQUEyQjtRQUUzQixLQUFLLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFa0Isa0JBQWtCLENBQUMsY0FBdUM7UUFDNUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFFa0IsNEJBQTRCO1FBQzlDLElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtZQUNwRixJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsWUFBWTtZQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFa0IsNkJBQTZCLENBQy9DLHlCQUFvRDtRQUVwRCxZQUFZLENBQUMsT0FBTyxDQUNuQix1QkFBdUIsQ0FBQyx3QkFBd0IsRUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUN6QyxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFsSFksOEJBQThCO0lBT3hDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsV0FBVyxDQUFBO0dBVkQsOEJBQThCLENBa0gxQyJ9