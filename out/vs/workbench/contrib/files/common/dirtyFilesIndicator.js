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
import * as nls from '../../../../nls.js';
import { VIEWLET_ID } from './files.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
let DirtyFilesIndicator = class DirtyFilesIndicator extends Disposable {
    static { this.ID = 'workbench.contrib.dirtyFilesIndicator'; }
    constructor(activityService, workingCopyService, filesConfigurationService) {
        super();
        this.activityService = activityService;
        this.workingCopyService = workingCopyService;
        this.filesConfigurationService = filesConfigurationService;
        this.badgeHandle = this._register(new MutableDisposable());
        this.lastKnownDirtyCount = 0;
        this.updateActivityBadge();
        this.registerListeners();
    }
    registerListeners() {
        // Working copy dirty indicator
        this._register(this.workingCopyService.onDidChangeDirty((workingCopy) => this.onWorkingCopyDidChangeDirty(workingCopy)));
    }
    onWorkingCopyDidChangeDirty(workingCopy) {
        const gotDirty = workingCopy.isDirty();
        if (gotDirty &&
            !(workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) &&
            this.filesConfigurationService.hasShortAutoSaveDelay(workingCopy.resource)) {
            return; // do not indicate dirty of working copies that are auto saved after short delay
        }
        if (gotDirty || this.lastKnownDirtyCount > 0) {
            this.updateActivityBadge();
        }
    }
    updateActivityBadge() {
        const dirtyCount = (this.lastKnownDirtyCount = this.workingCopyService.dirtyCount);
        // Indicate dirty count in badge if any
        if (dirtyCount > 0) {
            this.badgeHandle.value = this.activityService.showViewContainerActivity(VIEWLET_ID, {
                badge: new NumberBadge(dirtyCount, (num) => num === 1
                    ? nls.localize('dirtyFile', '1 unsaved file')
                    : nls.localize('dirtyFiles', '{0} unsaved files', dirtyCount)),
            });
        }
        else {
            this.badgeHandle.clear();
        }
    }
};
DirtyFilesIndicator = __decorate([
    __param(0, IActivityService),
    __param(1, IWorkingCopyService),
    __param(2, IFilesConfigurationService)
], DirtyFilesIndicator);
export { DirtyFilesIndicator };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlydHlGaWxlc0luZGljYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2NvbW1vbi9kaXJ0eUZpbGVzSW5kaWNhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUN2QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBS2hHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBRTlHLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTthQUNsQyxPQUFFLEdBQUcsdUNBQXVDLEFBQTFDLENBQTBDO0lBTTVELFlBQ21CLGVBQWtELEVBQy9DLGtCQUF3RCxFQUU3RSx5QkFBc0U7UUFFdEUsS0FBSyxFQUFFLENBQUE7UUFMNEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQzlCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFFNUQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUE0QjtRQVJ0RCxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFFOUQsd0JBQW1CLEdBQUcsQ0FBQyxDQUFBO1FBVTlCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRTFCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDeEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxDQUM3QyxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sMkJBQTJCLENBQUMsV0FBeUI7UUFDNUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3RDLElBQ0MsUUFBUTtZQUNSLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSwyQ0FBbUMsQ0FBQztZQUM5RCxJQUFJLENBQUMseUJBQXlCLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUN6RSxDQUFDO1lBQ0YsT0FBTSxDQUFDLGdGQUFnRjtRQUN4RixDQUFDO1FBRUQsSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQzNCLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVsRix1Q0FBdUM7UUFDdkMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLEVBQUU7Z0JBQ25GLEtBQUssRUFBRSxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUMxQyxHQUFHLEtBQUssQ0FBQztvQkFDUixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUM7b0JBQzdDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxVQUFVLENBQUMsQ0FDOUQ7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7O0FBM0RXLG1CQUFtQjtJQVE3QixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSwwQkFBMEIsQ0FBQTtHQVZoQixtQkFBbUIsQ0E0RC9CIn0=