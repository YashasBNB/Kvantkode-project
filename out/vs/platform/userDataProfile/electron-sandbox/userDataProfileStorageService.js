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
import { IUserDataProfileStorageService, RemoteUserDataProfileStorageService, } from '../common/userDataProfileStorageService.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../common/userDataProfile.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
let NativeUserDataProfileStorageService = class NativeUserDataProfileStorageService extends RemoteUserDataProfileStorageService {
    constructor(mainProcessService, userDataProfilesService, storageService, logService) {
        super(false, mainProcessService, userDataProfilesService, storageService, logService);
    }
};
NativeUserDataProfileStorageService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IUserDataProfilesService),
    __param(2, IStorageService),
    __param(3, ILogService)
], NativeUserDataProfileStorageService);
export { NativeUserDataProfileStorageService };
registerSingleton(IUserDataProfileStorageService, NativeUserDataProfileStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvZWxlY3Ryb24tc2FuZGJveC91c2VyRGF0YVByb2ZpbGVTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLG1DQUFtQyxHQUNuQyxNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXJFLElBQU0sbUNBQW1DLEdBQXpDLE1BQU0sbUNBQW9DLFNBQVEsbUNBQW1DO0lBQzNGLFlBQ3NCLGtCQUF1QyxFQUNsQyx1QkFBaUQsRUFDMUQsY0FBK0IsRUFDbkMsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDdEYsQ0FBQztDQUNELENBQUE7QUFUWSxtQ0FBbUM7SUFFN0MsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FMRCxtQ0FBbUMsQ0FTL0M7O0FBRUQsaUJBQWlCLENBQ2hCLDhCQUE4QixFQUM5QixtQ0FBbUMsb0NBRW5DLENBQUEifQ==