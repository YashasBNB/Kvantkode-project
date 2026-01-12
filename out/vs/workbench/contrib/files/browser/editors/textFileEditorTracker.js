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
import { ITextFileService, } from '../../../../services/textfile/common/textfiles.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { distinct, coalesce } from '../../../../../base/common/arrays.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { RunOnceWorker } from '../../../../../base/common/async.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { FILE_EDITOR_INPUT_ID } from '../../common/files.js';
import { Schemas } from '../../../../../base/common/network.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { IWorkingCopyEditorService } from '../../../../services/workingCopy/common/workingCopyEditorService.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
let TextFileEditorTracker = class TextFileEditorTracker extends Disposable {
    static { this.ID = 'workbench.contrib.textFileEditorTracker'; }
    constructor(editorService, textFileService, lifecycleService, hostService, codeEditorService, filesConfigurationService, workingCopyEditorService) {
        super();
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.lifecycleService = lifecycleService;
        this.hostService = hostService;
        this.codeEditorService = codeEditorService;
        this.filesConfigurationService = filesConfigurationService;
        this.workingCopyEditorService = workingCopyEditorService;
        //#region Text File: Ensure every dirty text and untitled file is opened in an editor
        this.ensureDirtyFilesAreOpenedWorker = this._register(new RunOnceWorker((units) => this.ensureDirtyTextFilesAreOpened(units), this.getDirtyTextFileTrackerDelay()));
        this.registerListeners();
    }
    registerListeners() {
        // Ensure dirty text file and untitled models are always opened as editors
        this._register(this.textFileService.files.onDidChangeDirty((model) => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
        this._register(this.textFileService.files.onDidSaveError((model) => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
        this._register(this.textFileService.untitled.onDidChangeDirty((model) => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
        // Update visible text file editors when focus is gained
        this._register(this.hostService.onDidChangeFocus((hasFocus) => hasFocus ? this.reloadVisibleTextFileEditors() : undefined));
        // Lifecycle
        this._register(this.lifecycleService.onDidShutdown(() => this.dispose()));
    }
    getDirtyTextFileTrackerDelay() {
        return 800; // encapsulated in a method for tests to override
    }
    ensureDirtyTextFilesAreOpened(resources) {
        this.doEnsureDirtyTextFilesAreOpened(distinct(resources.filter((resource) => {
            if (!this.textFileService.isDirty(resource)) {
                return false; // resource must be dirty
            }
            const fileModel = this.textFileService.files.get(resource);
            if (fileModel?.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */)) {
                return false; // resource must not be pending to save
            }
            if (resource.scheme !== Schemas.untitled &&
                !fileModel?.hasState(5 /* TextFileEditorModelState.ERROR */) &&
                this.filesConfigurationService.hasShortAutoSaveDelay(resource)) {
                // leave models auto saved after short delay unless
                // the save resulted in an error and not for untitled
                // that are not auto-saved anyway
                return false;
            }
            if (this.editorService.isOpened({
                resource,
                typeId: resource.scheme === Schemas.untitled
                    ? UntitledTextEditorInput.ID
                    : FILE_EDITOR_INPUT_ID,
                editorId: DEFAULT_EDITOR_ASSOCIATION.id,
            })) {
                return false; // model must not be opened already as file (fast check via editor type)
            }
            const model = fileModel ?? this.textFileService.untitled.get(resource);
            if (model && this.workingCopyEditorService.findEditor(model)) {
                return false; // model must not be opened already as file (slower check via working copy)
            }
            return true;
        }), (resource) => resource.toString()));
    }
    doEnsureDirtyTextFilesAreOpened(resources) {
        if (!resources.length) {
            return;
        }
        this.editorService.openEditors(resources.map((resource) => ({
            resource,
            options: { inactive: true, pinned: true, preserveFocus: true },
        })));
    }
    //#endregion
    //#region Window Focus Change: Update visible code editors when focus is gained that have a known text file model
    reloadVisibleTextFileEditors() {
        // the window got focus and we use this as a hint that files might have been changed outside
        // of this window. since file events can be unreliable, we queue a load for models that
        // are visible in any editor. since this is a fast operation in the case nothing has changed,
        // we tolerate the additional work.
        distinct(coalesce(this.codeEditorService.listCodeEditors().map((codeEditor) => {
            const resource = codeEditor.getModel()?.uri;
            if (!resource) {
                return undefined;
            }
            const model = this.textFileService.files.get(resource);
            if (!model || model.isDirty() || !model.isResolved()) {
                return undefined;
            }
            return model;
        })), (model) => model.resource.toString()).forEach((model) => this.textFileService.files.resolve(model.resource, { reload: { async: true } }));
    }
};
TextFileEditorTracker = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, ILifecycleService),
    __param(3, IHostService),
    __param(4, ICodeEditorService),
    __param(5, IFilesConfigurationService),
    __param(6, IWorkingCopyEditorService)
], TextFileEditorTracker);
export { TextFileEditorTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2VkaXRvcnMvdGV4dEZpbGVFZGl0b3JUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDekcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDL0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbEUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO2FBQ3BDLE9BQUUsR0FBRyx5Q0FBeUMsQUFBNUMsQ0FBNEM7SUFFOUQsWUFDaUIsYUFBOEMsRUFDNUMsZUFBa0QsRUFDakQsZ0JBQW9ELEVBQ3pELFdBQTBDLEVBQ3BDLGlCQUFzRCxFQUUxRSx5QkFBc0UsRUFDM0Msd0JBQW9FO1FBRS9GLEtBQUssRUFBRSxDQUFBO1FBVDBCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMzQixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDaEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUN4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNuQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRXpELDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDMUIsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQW9DaEcscUZBQXFGO1FBRXBFLG9DQUErQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hFLElBQUksYUFBYSxDQUNoQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxFQUNwRCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FDbkMsQ0FDRCxDQUFBO1FBdkNBLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNyRCxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FDekQsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNuRCxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FDekQsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ3hELElBQUksQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUN6RCxDQUNELENBQUE7UUFFRCx3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDOUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUMxRCxDQUNELENBQUE7UUFFRCxZQUFZO1FBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQVdTLDRCQUE0QjtRQUNyQyxPQUFPLEdBQUcsQ0FBQSxDQUFDLGlEQUFpRDtJQUM3RCxDQUFDO0lBRU8sNkJBQTZCLENBQUMsU0FBZ0I7UUFDckQsSUFBSSxDQUFDLCtCQUErQixDQUNuQyxRQUFRLENBQ1AsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxPQUFPLEtBQUssQ0FBQSxDQUFDLHlCQUF5QjtZQUN2QyxDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFELElBQUksU0FBUyxFQUFFLFFBQVEsK0NBQXVDLEVBQUUsQ0FBQztnQkFDaEUsT0FBTyxLQUFLLENBQUEsQ0FBQyx1Q0FBdUM7WUFDckQsQ0FBQztZQUVELElBQ0MsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsUUFBUTtnQkFDcEMsQ0FBQyxTQUFTLEVBQUUsUUFBUSx3Q0FBZ0M7Z0JBQ3BELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsRUFDN0QsQ0FBQztnQkFDRixtREFBbUQ7Z0JBQ25ELHFEQUFxRDtnQkFDckQsaUNBQWlDO2dCQUNqQyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFFRCxJQUNDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDO2dCQUMzQixRQUFRO2dCQUNSLE1BQU0sRUFDTCxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRO29CQUNuQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsRUFBRTtvQkFDNUIsQ0FBQyxDQUFDLG9CQUFvQjtnQkFDeEIsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUU7YUFDdkMsQ0FBQyxFQUNELENBQUM7Z0JBQ0YsT0FBTyxLQUFLLENBQUEsQ0FBQyx3RUFBd0U7WUFDdEYsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLFNBQVMsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDdEUsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxPQUFPLEtBQUssQ0FBQSxDQUFDLDJFQUEyRTtZQUN6RixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsRUFDRixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUNqQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sK0JBQStCLENBQUMsU0FBZ0I7UUFDdkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUM3QixTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzVCLFFBQVE7WUFDUixPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRTtTQUM5RCxDQUFDLENBQUMsQ0FDSCxDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQVk7SUFFWixpSEFBaUg7SUFFekcsNEJBQTRCO1FBQ25DLDRGQUE0RjtRQUM1Rix1RkFBdUY7UUFDdkYsNkZBQTZGO1FBQzdGLG1DQUFtQztRQUNuQyxRQUFRLENBQ1AsUUFBUSxDQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUMzRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFBO1lBQzNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3RELElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQ3RELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQyxDQUNGLEVBQ0QsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3BDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDbkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUMvRSxDQUFBO0lBQ0YsQ0FBQzs7QUF2SlcscUJBQXFCO0lBSS9CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLDBCQUEwQixDQUFBO0lBRTFCLFdBQUEseUJBQXlCLENBQUE7R0FYZixxQkFBcUIsQ0EwSmpDIn0=