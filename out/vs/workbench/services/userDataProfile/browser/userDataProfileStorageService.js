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
import { Emitter, Event } from '../../../../base/common/event.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractUserDataProfileStorageService, IUserDataProfileStorageService, } from '../../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { isProfileUsingDefaultStorage, IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IndexedDBStorageDatabase } from '../../storage/browser/storageService.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
let UserDataProfileStorageService = class UserDataProfileStorageService extends AbstractUserDataProfileStorageService {
    constructor(storageService, userDataProfileService, logService) {
        super(true, storageService);
        this.userDataProfileService = userDataProfileService;
        this.logService = logService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        const disposables = this._register(new DisposableStore());
        this._register(Event.filter(storageService.onDidChangeTarget, (e) => e.scope === 0 /* StorageScope.PROFILE */, disposables)(() => this.onDidChangeStorageTargetInCurrentProfile()));
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, disposables)((e) => this.onDidChangeStorageValueInCurrentProfile(e)));
    }
    onDidChangeStorageTargetInCurrentProfile() {
        // Not broadcasting changes to other windows/tabs as it is not required in web.
        // Revisit if needed in future.
        this._onDidChange.fire({
            targetChanges: [this.userDataProfileService.currentProfile],
            valueChanges: [],
        });
    }
    onDidChangeStorageValueInCurrentProfile(e) {
        // Not broadcasting changes to other windows/tabs as it is not required in web
        // Revisit if needed in future.
        this._onDidChange.fire({
            targetChanges: [],
            valueChanges: [{ profile: this.userDataProfileService.currentProfile, changes: [e] }],
        });
    }
    createStorageDatabase(profile) {
        return isProfileUsingDefaultStorage(profile)
            ? IndexedDBStorageDatabase.createApplicationStorage(this.logService)
            : IndexedDBStorageDatabase.createProfileStorage(profile, this.logService);
    }
};
UserDataProfileStorageService = __decorate([
    __param(0, IStorageService),
    __param(1, IUserDataProfileService),
    __param(2, ILogService)
], UserDataProfileStorageService);
export { UserDataProfileStorageService };
registerSingleton(IUserDataProfileStorageService, UserDataProfileStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGVTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLHFDQUFxQyxFQUVyQyw4QkFBOEIsR0FDOUIsTUFBTSw4RUFBOEUsQ0FBQTtBQUNyRixPQUFPLEVBRU4sNEJBQTRCLEVBQzVCLGVBQWUsR0FFZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUNaLFNBQVEscUNBQXFDO0lBTTdDLFlBQ2tCLGNBQStCLEVBQ3ZCLHNCQUFnRSxFQUM1RSxVQUF3QztRQUVyRCxLQUFLLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBSGUsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMzRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBTnJDLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBMEIsQ0FBQyxDQUFBO1FBQzVFLGdCQUFXLEdBQWtDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBUTVFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLE1BQU0sQ0FDWCxjQUFjLENBQUMsaUJBQWlCLEVBQ2hDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxpQ0FBeUIsRUFDdkMsV0FBVyxDQUNYLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLENBQUMsQ0FDeEQsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsY0FBYyxDQUFDLGdCQUFnQiwrQkFFOUIsU0FBUyxFQUNULFdBQVcsQ0FDWCxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDekQsQ0FBQTtJQUNGLENBQUM7SUFFTyx3Q0FBd0M7UUFDL0MsK0VBQStFO1FBQy9FLCtCQUErQjtRQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztZQUN0QixhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDO1lBQzNELFlBQVksRUFBRSxFQUFFO1NBQ2hCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyx1Q0FBdUMsQ0FBQyxDQUFrQztRQUNqRiw4RUFBOEU7UUFDOUUsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQ3RCLGFBQWEsRUFBRSxFQUFFO1lBQ2pCLFlBQVksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztTQUNyRixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVMscUJBQXFCLENBQUMsT0FBeUI7UUFDeEQsT0FBTyw0QkFBNEIsQ0FBQyxPQUFPLENBQUM7WUFDM0MsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDcEUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDM0UsQ0FBQztDQUNELENBQUE7QUFyRFksNkJBQTZCO0lBUXZDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLFdBQVcsQ0FBQTtHQVZELDZCQUE2QixDQXFEekM7O0FBRUQsaUJBQWlCLENBQ2hCLDhCQUE4QixFQUM5Qiw2QkFBNkIsb0NBRTdCLENBQUEifQ==