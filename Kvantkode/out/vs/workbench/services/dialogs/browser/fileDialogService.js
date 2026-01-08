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
import { IFileDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { AbstractFileDialogService } from './abstractFileDialogService.js';
import { Schemas } from '../../../../base/common/network.js';
import { memoize } from '../../../../base/common/decorators.js';
import { localize } from '../../../../nls.js';
import { getMediaOrTextMime } from '../../../../base/common/mime.js';
import { basename } from '../../../../base/common/resources.js';
import { getActiveWindow, triggerDownload, triggerUpload } from '../../../../base/browser/dom.js';
import Severity from '../../../../base/common/severity.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { extractFileListData } from '../../../../platform/dnd/browser/dnd.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { WebFileSystemAccess } from '../../../../platform/files/browser/webFileSystemAccess.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
export class FileDialogService extends AbstractFileDialogService {
    get fileSystemProvider() {
        return this.fileService.getProvider(Schemas.file);
    }
    async pickFileFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickFileFolderAndOpenSimplified(schema, options, false);
        }
        throw new Error(localize('pickFolderAndOpen', "Can't open folders, try adding a folder to the workspace instead."));
    }
    addFileSchemaIfNeeded(schema, isFolder) {
        return schema === Schemas.untitled
            ? [Schemas.file]
            : schema !== Schemas.file && (!isFolder || schema !== Schemas.vscodeRemote)
                ? [schema, Schemas.file]
                : [schema];
    }
    async pickFileAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickFileAndOpenSimplified(schema, options, false);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('open');
        }
        let fileHandle = undefined;
        try {
            ;
            [fileHandle] = await activeWindow.showOpenFilePicker({ multiple: false });
        }
        catch (error) {
            return; // `showOpenFilePicker` will throw an error when the user cancels
        }
        if (!WebFileSystemAccess.isFileSystemFileHandle(fileHandle)) {
            return;
        }
        const uri = await this.fileSystemProvider.registerFileHandle(fileHandle);
        this.addFileToRecentlyOpened(uri);
        await this.openerService.open(uri, { fromUserGesture: true, editorOptions: { pinned: true } });
    }
    async pickFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFolderPath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickFolderAndOpenSimplified(schema, options);
        }
        throw new Error(localize('pickFolderAndOpen', "Can't open folders, try adding a folder to the workspace instead."));
    }
    async pickWorkspaceAndOpen(options) {
        options.availableFileSystems = this.getWorkspaceAvailableFileSystems(options);
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultWorkspacePath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickWorkspaceAndOpenSimplified(schema, options);
        }
        throw new Error(localize('pickWorkspaceAndOpen', "Can't open workspaces, try adding a folder to the workspace instead."));
    }
    async pickFileToSave(defaultUri, availableFileSystems) {
        const schema = this.getFileSystemSchema({ defaultUri, availableFileSystems });
        const options = this.getPickFileToSaveDialogOptions(defaultUri, availableFileSystems);
        if (this.shouldUseSimplified(schema)) {
            return super.pickFileToSaveSimplified(schema, options);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('save');
        }
        let fileHandle = undefined;
        const startIn = Iterable.first(this.fileSystemProvider.directories);
        try {
            fileHandle = await activeWindow.showSaveFilePicker({
                types: this.getFilePickerTypes(options.filters),
                ...{ suggestedName: basename(defaultUri), startIn },
            });
        }
        catch (error) {
            return; // `showSaveFilePicker` will throw an error when the user cancels
        }
        if (!WebFileSystemAccess.isFileSystemFileHandle(fileHandle)) {
            return undefined;
        }
        return this.fileSystemProvider.registerFileHandle(fileHandle);
    }
    getFilePickerTypes(filters) {
        return filters
            ?.filter((filter) => {
            return !(filter.extensions.length === 1 &&
                (filter.extensions[0] === '*' || filter.extensions[0] === ''));
        })
            .map((filter) => {
            const accept = {};
            const extensions = filter.extensions.filter((ext) => ext.indexOf('-') < 0 && ext.indexOf('*') < 0 && ext.indexOf('_') < 0);
            accept[getMediaOrTextMime(`fileName.${filter.extensions[0]}`) ?? 'text/plain'] =
                extensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
            return {
                description: filter.name,
                accept,
            };
        });
    }
    async showSaveDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema)) {
            return super.showSaveDialogSimplified(schema, options);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('save');
        }
        let fileHandle = undefined;
        const startIn = Iterable.first(this.fileSystemProvider.directories);
        try {
            fileHandle = await activeWindow.showSaveFilePicker({
                types: this.getFilePickerTypes(options.filters),
                ...(options.defaultUri ? { suggestedName: basename(options.defaultUri) } : undefined),
                ...{ startIn },
            });
        }
        catch (error) {
            return undefined; // `showSaveFilePicker` will throw an error when the user cancels
        }
        if (!WebFileSystemAccess.isFileSystemFileHandle(fileHandle)) {
            return undefined;
        }
        return this.fileSystemProvider.registerFileHandle(fileHandle);
    }
    async showOpenDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema)) {
            return super.showOpenDialogSimplified(schema, options);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('open');
        }
        let uri;
        const startIn = Iterable.first(this.fileSystemProvider.directories) ?? 'documents';
        try {
            if (options.canSelectFiles) {
                const handle = await activeWindow.showOpenFilePicker({
                    multiple: false,
                    types: this.getFilePickerTypes(options.filters),
                    ...{ startIn },
                });
                if (handle.length === 1 && WebFileSystemAccess.isFileSystemFileHandle(handle[0])) {
                    uri = await this.fileSystemProvider.registerFileHandle(handle[0]);
                }
            }
            else {
                const handle = await activeWindow.showDirectoryPicker({ ...{ startIn } });
                uri = await this.fileSystemProvider.registerDirectoryHandle(handle);
            }
        }
        catch (error) {
            // ignore - `showOpenFilePicker` / `showDirectoryPicker` will throw an error when the user cancels
        }
        return uri ? [uri] : undefined;
    }
    async showUnsupportedBrowserWarning(context) {
        // When saving, try to just download the contents
        // of the active text editor if any as a workaround
        if (context === 'save') {
            const activeCodeEditor = this.codeEditorService.getActiveCodeEditor();
            if (!(activeCodeEditor instanceof EmbeddedCodeEditorWidget)) {
                const activeTextModel = activeCodeEditor?.getModel();
                if (activeTextModel) {
                    triggerDownload(VSBuffer.fromString(activeTextModel.getValue()).buffer, basename(activeTextModel.uri));
                    return;
                }
            }
        }
        // Otherwise inform the user about options
        const buttons = [
            {
                label: localize({ key: 'openRemote', comment: ['&& denotes a mnemonic'] }, '&&Open Remote...'),
                run: async () => {
                    await this.commandService.executeCommand('workbench.action.remote.showMenu');
                },
            },
            {
                label: localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, '&&Learn More'),
                run: async () => {
                    await this.openerService.open('https://aka.ms/VSCodeWebLocalFileSystemAccess');
                },
            },
        ];
        if (context === 'open') {
            buttons.push({
                label: localize({ key: 'openFiles', comment: ['&& denotes a mnemonic'] }, 'Open &&Files...'),
                run: async () => {
                    const files = await triggerUpload();
                    if (files) {
                        const filesData = (await this.instantiationService.invokeFunction((accessor) => extractFileListData(accessor, files))).filter((fileData) => !fileData.isDirectory);
                        if (filesData.length > 0) {
                            this.editorService.openEditors(filesData.map((fileData) => {
                                return {
                                    resource: fileData.resource,
                                    contents: fileData.contents?.toString(),
                                    options: { pinned: true },
                                };
                            }));
                        }
                    }
                },
            });
        }
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('unsupportedBrowserMessage', 'Opening Local Folders is Unsupported'),
            detail: localize('unsupportedBrowserDetail', "Your browser doesn't support opening local folders.\nYou can either open single files or open a remote repository."),
            buttons,
        });
        return undefined;
    }
    shouldUseSimplified(scheme) {
        return ![Schemas.file, Schemas.vscodeUserData, Schemas.tmp].includes(scheme);
    }
}
__decorate([
    memoize
], FileDialogService.prototype, "fileSystemProvider", null);
registerSingleton(IFileDialogService, FileDialogService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL2Jyb3dzZXIvZmlsZURpYWxvZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUlOLGtCQUFrQixHQUdsQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakcsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUVu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