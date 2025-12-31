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
import { localize } from '../../../../nls.js';
import { AbstractTextFileService } from '../browser/textFileService.js';
import { ITextFileService, } from '../common/textfiles.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IUntitledTextEditorService, } from '../../untitled/common/untitledTextEditorService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IWorkingCopyFileService } from '../../workingCopy/common/workingCopyFileService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Promises } from '../../../../base/common/async.js';
import { IDecorationsService } from '../../decorations/common/decorations.js';
let NativeTextFileService = class NativeTextFileService extends AbstractTextFileService {
    constructor(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, elevatedFileService, logService, decorationsService) {
        super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService);
        this.environmentService = environmentService;
        this.registerListeners();
    }
    registerListeners() {
        // Lifecycle
        this._register(this.lifecycleService.onWillShutdown((event) => event.join(this.onWillShutdown(), {
            id: 'join.textFiles',
            label: localize('join.textFiles', 'Saving text files'),
        })));
    }
    async onWillShutdown() {
        let modelsPendingToSave;
        // As long as models are pending to be saved, we prolong the shutdown
        // until that has happened to ensure we are not shutting down in the
        // middle of writing to the file
        // (https://github.com/microsoft/vscode/issues/116600)
        while ((modelsPendingToSave = this.files.models.filter((model) => model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */))).length > 0) {
            await Promises.settled(modelsPendingToSave.map((model) => model.joinState(2 /* TextFileEditorModelState.PENDING_SAVE */)));
        }
    }
    async read(resource, options) {
        // ensure platform limits are applied
        options = this.ensureLimits(options);
        return super.read(resource, options);
    }
    async readStream(resource, options) {
        // ensure platform limits are applied
        options = this.ensureLimits(options);
        return super.readStream(resource, options);
    }
    ensureLimits(options) {
        let ensuredOptions;
        if (!options) {
            ensuredOptions = Object.create(null);
        }
        else {
            ensuredOptions = options;
        }
        let ensuredLimits;
        if (!ensuredOptions.limits) {
            ensuredLimits = Object.create(null);
            ensuredOptions = {
                ...ensuredOptions,
                limits: ensuredLimits,
            };
        }
        else {
            ensuredLimits = ensuredOptions.limits;
        }
        return ensuredOptions;
    }
};
NativeTextFileService = __decorate([
    __param(0, IFileService),
    __param(1, IUntitledTextEditorService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, INativeWorkbenchEnvironmentService),
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
], NativeTextFileService);
export { NativeTextFileService };
registerSingleton(ITextFileService, NativeTextFileService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlVGV4dEZpbGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlVGV4dEZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sZ0JBQWdCLEdBTWhCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxZQUFZLEVBQW1CLE1BQU0sNENBQTRDLENBQUE7QUFDMUYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLFlBQVks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