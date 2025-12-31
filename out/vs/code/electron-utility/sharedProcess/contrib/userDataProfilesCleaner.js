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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
let UserDataProfilesCleaner = class UserDataProfilesCleaner extends Disposable {
    constructor(userDataProfilesService) {
        super();
        const scheduler = this._register(new RunOnceScheduler(() => {
            userDataProfilesService.cleanUp();
        }, 10 * 1000 /* after 10s */));
        scheduler.schedule();
    }
};
UserDataProfilesCleaner = __decorate([
    __param(0, IUserDataProfilesService)
], UserDataProfilesCleaner);
export { UserDataProfilesCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc0NsZWFuZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9jb250cmliL3VzZXJEYXRhUHJvZmlsZXNDbGVhbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUVsRyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFDdEQsWUFBc0MsdUJBQWlEO1FBQ3RGLEtBQUssRUFBRSxDQUFBO1FBRVAsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDL0IsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDekIsdUJBQXVCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQzdCLENBQUE7UUFDRCxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDckIsQ0FBQztDQUNELENBQUE7QUFYWSx1QkFBdUI7SUFDdEIsV0FBQSx3QkFBd0IsQ0FBQTtHQUR6Qix1QkFBdUIsQ0FXbkMifQ==