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
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../common/workingCopyService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { WorkingCopyBackupTracker } from '../common/workingCopyBackupTracker.js';
import { IWorkingCopyEditorService } from '../common/workingCopyEditorService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
let BrowserWorkingCopyBackupTracker = class BrowserWorkingCopyBackupTracker extends WorkingCopyBackupTracker {
    static { this.ID = 'workbench.contrib.browserWorkingCopyBackupTracker'; }
    constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, logService, workingCopyEditorService, editorService, editorGroupService) {
        super(workingCopyBackupService, workingCopyService, logService, lifecycleService, filesConfigurationService, workingCopyEditorService, editorService, editorGroupService);
    }
    onFinalBeforeShutdown(reason) {
        // Web: we cannot perform long running in the shutdown phase
        // As such we need to check sync if there are any modified working
        // copies that have not been backed up yet and then prevent the
        // shutdown if that is the case.
        const modifiedWorkingCopies = this.workingCopyService.modifiedWorkingCopies;
        if (!modifiedWorkingCopies.length) {
            return false; // nothing modified: no veto
        }
        if (!this.filesConfigurationService.isHotExitEnabled) {
            return true; // modified without backup: veto
        }
        for (const modifiedWorkingCopy of modifiedWorkingCopies) {
            if (!this.workingCopyBackupService.hasBackupSync(modifiedWorkingCopy, this.getContentVersion(modifiedWorkingCopy))) {
                this.logService.warn('Unload veto: pending backups');
                return true; // modified without backup: veto
            }
        }
        return false; // modified and backed up: no veto
    }
};
BrowserWorkingCopyBackupTracker = __decorate([
    __param(0, IWorkingCopyBackupService),
    __param(1, IFilesConfigurationService),
    __param(2, IWorkingCopyService),
    __param(3, ILifecycleService),
    __param(4, ILogService),
    __param(5, IWorkingCopyEditorService),
    __param(6, IEditorService),
    __param(7, IEditorGroupsService)
], BrowserWorkingCopyBackupTracker);
export { BrowserWorkingCopyBackupTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvYnJvd3Nlci93b3JraW5nQ29weUJhY2t1cFRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFMUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFMUUsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFDWixTQUFRLHdCQUF3QjthQUdoQixPQUFFLEdBQUcsbURBQW1ELEFBQXRELENBQXNEO0lBRXhFLFlBQzRCLHdCQUFtRCxFQUNsRCx5QkFBcUQsRUFDNUQsa0JBQXVDLEVBQ3pDLGdCQUFtQyxFQUN6QyxVQUF1QixFQUNULHdCQUFtRCxFQUM5RCxhQUE2QixFQUN2QixrQkFBd0M7UUFFOUQsS0FBSyxDQUNKLHdCQUF3QixFQUN4QixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLGFBQWEsRUFDYixrQkFBa0IsQ0FDbEIsQ0FBQTtJQUNGLENBQUM7SUFFUyxxQkFBcUIsQ0FBQyxNQUFzQjtRQUNyRCw0REFBNEQ7UUFDNUQsa0VBQWtFO1FBQ2xFLCtEQUErRDtRQUMvRCxnQ0FBZ0M7UUFFaEMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUE7UUFDM0UsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25DLE9BQU8sS0FBSyxDQUFBLENBQUMsNEJBQTRCO1FBQzFDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdEQsT0FBTyxJQUFJLENBQUEsQ0FBQyxnQ0FBZ0M7UUFDN0MsQ0FBQztRQUVELEtBQUssTUFBTSxtQkFBbUIsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQ3pELElBQ0MsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUMzQyxtQkFBbUIsRUFDbkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLENBQzNDLEVBQ0EsQ0FBQztnQkFDRixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO2dCQUVwRCxPQUFPLElBQUksQ0FBQSxDQUFDLGdDQUFnQztZQUM3QyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBLENBQUMsa0NBQWtDO0lBQ2hELENBQUM7O0FBekRXLCtCQUErQjtJQU96QyxXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsb0JBQW9CLENBQUE7R0FkViwrQkFBK0IsQ0EwRDNDIn0=