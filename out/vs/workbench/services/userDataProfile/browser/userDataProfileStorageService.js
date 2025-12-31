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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixxQ0FBcUMsRUFFckMsOEJBQThCLEdBQzlCLE1BQU0sOEVBQThFLENBQUE7QUFDckYsT0FBTyxFQUVOLDRCQUE0QixFQUM1QixlQUFlLEdBRWYsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFDWixTQUFRLHFDQUFxQztJQU03QyxZQUNrQixjQUErQixFQUN2QixzQkFBZ0UsRUFDNUUsVUFBd0M7UUFFckQsS0FBSyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUhlLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDM0QsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQU5yQyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUM1RSxnQkFBVyxHQUFrQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQVE1RSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxNQUFNLENBQ1gsY0FBYyxDQUFDLGlCQUFpQixFQUNoQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssaUNBQXlCLEVBQ3ZDLFdBQVcsQ0FDWCxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxDQUFDLENBQ3hELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLGNBQWMsQ0FBQyxnQkFBZ0IsK0JBRTlCLFNBQVMsRUFDVCxXQUFXLENBQ1gsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3pELENBQUE7SUFDRixDQUFDO0lBRU8sd0NBQXdDO1FBQy9DLCtFQUErRTtRQUMvRSwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDdEIsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQztZQUMzRCxZQUFZLEVBQUUsRUFBRTtTQUNoQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sdUNBQXVDLENBQUMsQ0FBa0M7UUFDakYsOEVBQThFO1FBQzlFLCtCQUErQjtRQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztZQUN0QixhQUFhLEVBQUUsRUFBRTtZQUNqQixZQUFZLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7U0FDckYsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVTLHFCQUFxQixDQUFDLE9BQXlCO1FBQ3hELE9BQU8sNEJBQTRCLENBQUMsT0FBTyxDQUFDO1lBQzNDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3BFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzNFLENBQUM7Q0FDRCxDQUFBO0FBckRZLDZCQUE2QjtJQVF2QyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxXQUFXLENBQUE7R0FWRCw2QkFBNkIsQ0FxRHpDOztBQUVELGlCQUFpQixDQUNoQiw4QkFBOEIsRUFDOUIsNkJBQTZCLG9DQUU3QixDQUFBIn0=