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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9lZGl0b3JzL3RleHRGaWxlRWRpdG9yVHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDeEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWxFLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNC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