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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlydHlGaWxlc0luZGljYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvY29tbW9uL2RpcnR5RmlsZXNJbmRpY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFLaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFFOUcsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO2FBQ2xDLE9BQUUsR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMEM7SUFNNUQsWUFDbUIsZUFBa0QsRUFDL0Msa0JBQXdELEVBRTdFLHlCQUFzRTtRQUV0RSxLQUFLLEVBQUUsQ0FBQTtRQUw0QixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDOUIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUU1RCw4QkFBeUIsR0FBekIseUJBQXlCLENBQTRCO1FBUnRELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUU5RCx3QkFBbUIsR0FBRyxDQUFDLENBQUE7UUFVOUIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFMUIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QiwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUN4RCxJQUFJLENBQUMsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQzdDLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxXQUF5QjtRQUM1RCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdEMsSUFDQyxRQUFRO1lBQ1IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLDJDQUFtQyxDQUFDO1lBQzlELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQ3pFLENBQUM7WUFDRixPQUFNLENBQUMsZ0ZBQWdGO1FBQ3hGLENBQUM7UUFFRCxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRWxGLHVDQUF1QztRQUN2QyxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRTtnQkFDbkYsS0FBSyxFQUFFLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQzFDLEdBQUcsS0FBSyxDQUFDO29CQUNSLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQztvQkFDN0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxDQUM5RDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQzs7QUEzRFcsbUJBQW1CO0lBUTdCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLDBCQUEwQixDQUFBO0dBVmhCLG1CQUFtQixDQTREL0IifQ==