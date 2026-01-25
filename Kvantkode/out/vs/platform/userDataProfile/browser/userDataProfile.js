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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUlOLGFBQWEsRUFHYix1QkFBdUIsR0FDdkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUk5QixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUNaLFNBQVEsdUJBQXVCO0lBSy9CLFlBQ3NCLGtCQUF1QyxFQUM5QyxXQUF5QixFQUNsQixrQkFBdUMsRUFDL0MsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDNUMsSUFBSSxvQkFBb0IsQ0FDdkIsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLFVBQVUsQ0FDakQsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN6RCxJQUFJLENBQUM7Z0JBQ0osSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7Z0JBQ2hDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFDbEYsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUN0RixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBRXRGLElBQUksQ0FBQyx1QkFBdUIsQ0FDM0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3BDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FDcEMsQ0FBQTtnQkFFRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO29CQUM5QixLQUFLO29CQUNMLE9BQU87b0JBQ1AsT0FBTztvQkFDUCxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVE7aUJBQ2xCLENBQUMsQ0FBQTtZQUNILENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixZQUFZO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQzlCLEtBQXlCLEVBQ3pCLE9BQTJCLEVBQzNCLE9BQTJCO1FBRTNCLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFBO1lBQ2xFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFBO1lBQzFDLEtBQUssTUFBTSxPQUFPLElBQUksb0JBQW9CLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUM5QyxTQUFRO2dCQUNULENBQUM7Z0JBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQ3pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FDbkQsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVrQixpQkFBaUI7UUFDbkMsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN4RSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsWUFBWTtZQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFa0Isc0JBQXNCLENBQ3hDLEtBQXlCLEVBQ3pCLE9BQTJCLEVBQzNCLE9BQTJCO1FBRTNCLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVrQixrQkFBa0IsQ0FBQyxjQUF1QztRQUM1RSxZQUFZLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUVrQiw0QkFBNEI7UUFDOUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1lBQ3BGLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixZQUFZO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVrQiw2QkFBNkIsQ0FDL0MseUJBQW9EO1FBRXBELFlBQVksQ0FBQyxPQUFPLENBQ25CLHVCQUF1QixDQUFDLHdCQUF3QixFQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQ3pDLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWxIWSw4QkFBOEI7SUFPeEMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxXQUFXLENBQUE7R0FWRCw4QkFBOEIsQ0FrSDFDIn0=