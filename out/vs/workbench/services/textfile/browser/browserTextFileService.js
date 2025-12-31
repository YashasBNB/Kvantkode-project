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
import { AbstractTextFileService } from './textFileService.js';
import { ITextFileService } from '../common/textfiles.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IPathService } from '../../path/common/pathService.js';
import { IUntitledTextEditorService, } from '../../untitled/common/untitledTextEditorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkingCopyFileService } from '../../workingCopy/common/workingCopyFileService.js';
import { IDecorationsService } from '../../decorations/common/decorations.js';
let BrowserTextFileService = class BrowserTextFileService extends AbstractTextFileService {
    constructor(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, elevatedFileService, logService, decorationsService) {
        super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService);
        this.registerListeners();
    }
    registerListeners() {
        // Lifecycle
        this._register(this.lifecycleService.onBeforeShutdown((event) => event.veto(this.onBeforeShutdown(), 'veto.textFiles')));
    }
    onBeforeShutdown() {
        if (this.files.models.some((model) => model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */))) {
            return true; // files are pending to be saved: veto (as there is no support for long running operations on shutdown)
        }
        return false;
    }
};
BrowserTextFileService = __decorate([
    __param(0, IFileService),
    __param(1, IUntitledTextEditorService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IDialogService),
    __param(7, IFileDialogService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IFilesConfigurationService),
    __param(10, ICodeEditorService),
    __param(11, IPathService),
    __param(12, IWorkingCopyFileService),
    __param(13, IUriIdentityService),
    __param(14, ILanguageService),
    __param(15, IElevatedFileService),
    __param(16, ILogService),
    __param(17, IDecorationsService)
], BrowserTextFileService);
export { BrowserTextFileService };
registerSingleton(ITextFileService, BrowserTextFileService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclRleHRGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9icm93c2VyL2Jyb3dzZXJUZXh0RmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUE0QixNQUFNLHdCQUF3QixDQUFBO0FBQ25GLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDaEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1B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