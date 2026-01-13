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
import { mainWindow } from '../../../../base/browser/window.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { BrowserWindowDriver } from '../browser/driver.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
let NativeWindowDriver = class NativeWindowDriver extends BrowserWindowDriver {
    constructor(helper, fileService, environmentService, lifecycleService, logService) {
        super(fileService, environmentService, lifecycleService, logService);
        this.helper = helper;
    }
    exitApplication() {
        return this.helper.exitApplication();
    }
};
NativeWindowDriver = __decorate([
    __param(1, IFileService),
    __param(2, IEnvironmentService),
    __param(3, ILifecycleService),
    __param(4, ILogService)
], NativeWindowDriver);
export function registerWindowDriver(instantiationService, helper) {
    Object.assign(mainWindow, {
        driver: instantiationService.createInstance(NativeWindowDriver, helper),
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJpdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZHJpdmVyL2VsZWN0cm9uLXNhbmRib3gvZHJpdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBTXZFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsbUJBQW1CO0lBQ25ELFlBQ2tCLE1BQWlDLEVBQ3BDLFdBQXlCLEVBQ2xCLGtCQUF1QyxFQUN6QyxnQkFBbUMsRUFDekMsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQU5uRCxXQUFNLEdBQU4sTUFBTSxDQUEyQjtJQU9uRCxDQUFDO0lBRVEsZUFBZTtRQUN2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDckMsQ0FBQztDQUNELENBQUE7QUFkSyxrQkFBa0I7SUFHckIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxXQUFXLENBQUE7R0FOUixrQkFBa0IsQ0FjdkI7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQ25DLG9CQUEyQyxFQUMzQyxNQUFpQztJQUVqQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRTtRQUN6QixNQUFNLEVBQUUsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQztLQUN2RSxDQUFDLENBQUE7QUFDSCxDQUFDIn0=