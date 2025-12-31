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
import { IStorageService } from '../../storage/common/storage.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../common/userDataProfile.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
import { RemoteUserDataProfileStorageService } from '../common/userDataProfileStorageService.js';
let SharedProcessUserDataProfileStorageService = class SharedProcessUserDataProfileStorageService extends RemoteUserDataProfileStorageService {
    constructor(mainProcessService, userDataProfilesService, storageService, logService) {
        super(true, mainProcessService, userDataProfilesService, storageService, logService);
    }
};
SharedProcessUserDataProfileStorageService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IUserDataProfilesService),
    __param(2, IStorageService),
    __param(3, ILogService)
], SharedProcessUserDataProfileStorageService);
export { SharedProcessUserDataProfileStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvbm9kZS91c2VyRGF0YVByb2ZpbGVTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXpGLElBQU0sMENBQTBDLEdBQWhELE1BQU0sMENBQTJDLFNBQVEsbUNBQW1DO0lBQ2xHLFlBQ3NCLGtCQUF1QyxFQUNsQyx1QkFBaUQsRUFDMUQsY0FBK0IsRUFDbkMsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDckYsQ0FBQztDQUNELENBQUE7QUFUWSwwQ0FBMEM7SUFFcEQsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FMRCwwQ0FBMEMsQ0FTdEQifQ==