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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGlhbG9ncy9icm93c2VyL2ZpbGVEaWFsb2dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFJTixrQkFBa0IsR0FHbEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pHLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFFbkgsTUFB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