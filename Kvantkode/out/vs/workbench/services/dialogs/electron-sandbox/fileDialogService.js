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
import { IHostService } from '../../host/browser/host.js';
import { IFileDialogService, IDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../history/common/history.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INativeHostService, } from '../../../../platform/native/common/native.js';
import { AbstractFileDialogService } from '../browser/abstractFileDialogService.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IPathService } from '../../path/common/pathService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let FileDialogService = class FileDialogService extends AbstractFileDialogService {
    constructor(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, nativeHostService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService) {
        super(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService);
        this.nativeHostService = nativeHostService;
    }
    toNativeOpenDialogOptions(options) {
        return {
            forceNewWindow: options.forceNewWindow,
            telemetryExtraData: options.telemetryExtraData,
            defaultPath: options.defaultUri?.fsPath,
        };
    }
    shouldUseSimplified(schema) {
        const setting = this.configurationService.getValue('files.simpleDialog.enable') === true;
        const newWindowSetting = this.configurationService.getValue('window.openFilesInNewWindow') === 'on';
        return {
            useSimplified: (schema !== Schemas.file && schema !== Schemas.vscodeUserData) || setting,
            isSetting: newWindowSetting,
        };
    }
    async pickFileFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        const shouldUseSimplified = this.shouldUseSimplified(schema);
        if (shouldUseSimplified.useSimplified) {
            return this.pickFileFolderAndOpenSimplified(schema, options, shouldUseSimplified.isSetting);
        }
        return this.nativeHostService.pickFileFolderAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickFileAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        const shouldUseSimplified = this.shouldUseSimplified(schema);
        if (shouldUseSimplified.useSimplified) {
            return this.pickFileAndOpenSimplified(schema, options, shouldUseSimplified.isSetting);
        }
        return this.nativeHostService.pickFileAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFolderPath(schema);
        }
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.pickFolderAndOpenSimplified(schema, options);
        }
        return this.nativeHostService.pickFolderAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickWorkspaceAndOpen(options) {
        options.availableFileSystems = this.getWorkspaceAvailableFileSystems(options);
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultWorkspacePath(schema);
        }
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.pickWorkspaceAndOpenSimplified(schema, options);
        }
        return this.nativeHostService.pickWorkspaceAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickFileToSave(defaultUri, availableFileSystems) {
        const schema = this.getFileSystemSchema({ defaultUri, availableFileSystems });
        const options = this.getPickFileToSaveDialogOptions(defaultUri, availableFileSystems);
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.pickFileToSaveSimplified(schema, options);
        }
        else {
            const result = await this.nativeHostService.showSaveDialog(this.toNativeSaveDialogOptions(options));
            if (result && !result.canceled && result.filePath) {
                const uri = URI.file(result.filePath);
                this.addFileToRecentlyOpened(uri);
                return uri;
            }
        }
        return;
    }
    toNativeSaveDialogOptions(options) {
        options.defaultUri = options.defaultUri ? URI.file(options.defaultUri.path) : undefined;
        return {
            defaultPath: options.defaultUri?.fsPath,
            buttonLabel: typeof options.saveLabel === 'string' ? options.saveLabel : options.saveLabel?.withMnemonic,
            filters: options.filters,
            title: options.title,
            targetWindowId: getActiveWindow().vscodeWindowId,
        };
    }
    async showSaveDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.showSaveDialogSimplified(schema, options);
        }
        const result = await this.nativeHostService.showSaveDialog(this.toNativeSaveDialogOptions(options));
        if (result && !result.canceled && result.filePath) {
            return URI.file(result.filePath);
        }
        return;
    }
    async showOpenDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.showOpenDialogSimplified(schema, options);
        }
        const newOptions = {
            title: options.title,
            defaultPath: options.defaultUri?.fsPath,
            buttonLabel: typeof options.openLabel === 'string' ? options.openLabel : options.openLabel?.withMnemonic,
            filters: options.filters,
            properties: [],
            targetWindowId: getActiveWindow().vscodeWindowId,
        };
        newOptions.properties.push('createDirectory');
        if (options.canSelectFiles) {
            newOptions.properties.push('openFile');
        }
        if (options.canSelectFolders) {
            newOptions.properties.push('openDirectory');
        }
        if (options.canSelectMany) {
            newOptions.properties.push('multiSelections');
        }
        const result = await this.nativeHostService.showOpenDialog(newOptions);
        return result && Array.isArray(result.filePaths) && result.filePaths.length > 0
            ? result.filePaths.map(URI.file)
            : undefined;
    }
};
FileDialogService = __decorate([
    __param(0, IHostService),
    __param(1, IWorkspaceContextService),
    __param(2, IHistoryService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IOpenerService),
    __param(8, INativeHostService),
    __param(9, IDialogService),
    __param(10, ILanguageService),
    __param(11, IWorkspacesService),
    __param(12, ILabelService),
    __param(13, IPathService),
    __param(14, ICommandService),
    __param(15, IEditorService),
    __param(16, ICodeEditorService),
    __param(17, ILogService)
], FileDialogService);
export { FileDialogService };
registerSingleton(IFileDialogService, FileDialogService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL2VsZWN0cm9uLXNhbmRib3gvZmlsZURpYWxvZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFNaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFJTixrQkFBa0IsRUFDbEIsY0FBYyxHQUVkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFN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