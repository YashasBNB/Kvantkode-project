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
import { Action } from '../../../../base/common/actions.js';
import * as nls from '../../../../nls.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { joinPath } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
let OpenLogsFolderAction = class OpenLogsFolderAction extends Action {
    static { this.ID = 'workbench.action.openLogsFolder'; }
    static { this.TITLE = nls.localize2('openLogsFolder', 'Open Logs Folder'); }
    constructor(id, label, environmentService, nativeHostService) {
        super(id, label);
        this.environmentService = environmentService;
        this.nativeHostService = nativeHostService;
    }
    run() {
        return this.nativeHostService.showItemInFolder(joinPath(this.environmentService.logsHome, 'main.log').with({ scheme: Schemas.file }).fsPath);
    }
};
OpenLogsFolderAction = __decorate([
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, INativeHostService)
], OpenLogsFolderAction);
export { OpenLogsFolderAction };
let OpenExtensionLogsFolderAction = class OpenExtensionLogsFolderAction extends Action {
    static { this.ID = 'workbench.action.openExtensionLogsFolder'; }
    static { this.TITLE = nls.localize2('openExtensionLogsFolder', 'Open Extension Logs Folder'); }
    constructor(id, label, environmentSerice, fileService, nativeHostService) {
        super(id, label);
        this.environmentSerice = environmentSerice;
        this.fileService = fileService;
        this.nativeHostService = nativeHostService;
    }
    async run() {
        const folderStat = await this.fileService.resolve(this.environmentSerice.extHostLogsPath);
        if (folderStat.children && folderStat.children[0]) {
            return this.nativeHostService.showItemInFolder(folderStat.children[0].resource.with({ scheme: Schemas.file }).fsPath);
        }
    }
};
OpenExtensionLogsFolderAction = __decorate([
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IFileService),
    __param(4, INativeHostService)
], OpenExtensionLogsFolderAction);
export { OpenExtensionLogsFolderAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2dzL2VsZWN0cm9uLXNhbmRib3gvbG9nc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDekgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFckQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxNQUFNO2FBQy9CLE9BQUUsR0FBRyxpQ0FBaUMsQUFBcEMsQ0FBb0M7YUFDdEMsVUFBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsa0JBQWtCLENBQUMsQUFBdEQsQ0FBc0Q7SUFFM0UsWUFDQyxFQUFVLEVBQ1YsS0FBYSxFQUVJLGtCQUFzRCxFQUNsQyxpQkFBcUM7UUFFMUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUhDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0M7UUFDbEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUczRSxDQUFDO0lBRVEsR0FBRztRQUNYLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUM3QyxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUM1RixDQUFBO0lBQ0YsQ0FBQzs7QUFsQlcsb0JBQW9CO0lBTzlCLFdBQUEsa0NBQWtDLENBQUE7SUFFbEMsV0FBQSxrQkFBa0IsQ0FBQTtHQVRSLG9CQUFvQixDQW1CaEM7O0FBRU0sSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxNQUFNO2FBQ3hDLE9BQUUsR0FBRywwQ0FBMEMsQUFBN0MsQ0FBNkM7YUFDL0MsVUFBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMseUJBQXlCLEVBQUUsNEJBQTRCLENBQUMsQUFBekUsQ0FBeUU7SUFFOUYsWUFDQyxFQUFVLEVBQ1YsS0FBYSxFQUVJLGlCQUFxRCxFQUN2QyxXQUF5QixFQUNuQixpQkFBcUM7UUFFMUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUpDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0M7UUFDdkMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUczRSxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUc7UUFDakIsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDekYsSUFBSSxVQUFVLENBQUMsUUFBUSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FDN0MsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FDckUsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDOztBQXRCVyw2QkFBNkI7SUFPdkMsV0FBQSxrQ0FBa0MsQ0FBQTtJQUVsQyxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7R0FWUiw2QkFBNkIsQ0F1QnpDIn0=