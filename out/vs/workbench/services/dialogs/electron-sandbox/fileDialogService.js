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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGlhbG9ncy9lbGVjdHJvbi1zYW5kYm94L2ZpbGVEaWFsb2dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBTWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RCxPQUFPLEVBSU4sa0JBQWtCLEVBQ2xCLGNBQWMsR0FFZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFB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