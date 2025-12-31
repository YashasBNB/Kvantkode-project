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
import { isWindows, OS } from '../../../../base/common/platform.js';
import { extname, basename, isAbsolute } from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Action } from '../../../../base/common/actions.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { VIEWLET_ID, VIEW_ID } from '../common/files.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IQuickInputService, ItemActivation, } from '../../../../platform/quickinput/common/quickInput.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID, SAVE_ALL_IN_GROUP_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID, } from './fileConstants.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Schemas } from '../../../../base/common/network.js';
import { IDialogService, getFileNamesMessage, } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CLOSE_EDITORS_AND_GROUP_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { NewExplorerItem } from '../common/explorerModel.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { triggerUpload } from '../../../../base/browser/dom.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { timeout } from '../../../../base/common/async.js';
import { IWorkingCopyFileService } from '../../../services/workingCopy/common/workingCopyFileService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { trim, rtrim } from '../../../../base/common/strings.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceFileEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { IExplorerService } from './files.js';
import { BrowserFileUpload, FileDownload } from './fileImportExport.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ActiveEditorCanToggleReadonlyContext, ActiveEditorContext, EmptyWorkspaceSupportContext, } from '../../../common/contextkeys.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { getPathForFile } from '../../../../platform/dnd/browser/dnd.js';
export const NEW_FILE_COMMAND_ID = 'explorer.newFile';
export const NEW_FILE_LABEL = nls.localize2('newFile', 'New File...');
export const NEW_FOLDER_COMMAND_ID = 'explorer.newFolder';
export const NEW_FOLDER_LABEL = nls.localize2('newFolder', 'New Folder...');
export const TRIGGER_RENAME_LABEL = nls.localize('rename', 'Rename...');
export const MOVE_FILE_TO_TRASH_LABEL = nls.localize('delete', 'Delete');
export const COPY_FILE_LABEL = nls.localize('copyFile', 'Copy');
export const PASTE_FILE_LABEL = nls.localize('pasteFile', 'Paste');
export const FileCopiedContext = new RawContextKey('fileCopied', false);
export const DOWNLOAD_COMMAND_ID = 'explorer.download';
export const DOWNLOAD_LABEL = nls.localize('download', 'Download...');
export const UPLOAD_COMMAND_ID = 'explorer.upload';
export const UPLOAD_LABEL = nls.localize('upload', 'Upload...');
const CONFIRM_DELETE_SETTING_KEY = 'explorer.confirmDelete';
const MAX_UNDO_FILE_SIZE = 5000000; // 5mb
function onError(notificationService, error) {
    if (error.message === 'string') {
        error = error.message;
    }
    notificationService.error(toErrorMessage(error, false));
}
async function refreshIfSeparator(value, explorerService) {
    if (value && (value.indexOf('/') >= 0 || value.indexOf('\\') >= 0)) {
        // New input contains separator, multiple resources will get created workaround for #68204
        await explorerService.refresh();
    }
}
async function deleteFiles(explorerService, workingCopyFileService, dialogService, configurationService, filesConfigurationService, elements, useTrash, skipConfirm = false, ignoreIfNotExists = false) {
    let primaryButton;
    if (useTrash) {
        primaryButton = isWindows
            ? nls.localize('deleteButtonLabelRecycleBin', '&&Move to Recycle Bin')
            : nls.localize({ key: 'deleteButtonLabelTrash', comment: ['&& denotes a mnemonic'] }, '&&Move to Trash');
    }
    else {
        primaryButton = nls.localize({ key: 'deleteButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Delete');
    }
    // Handle dirty
    const distinctElements = resources.distinctParents(elements, (e) => e.resource);
    const dirtyWorkingCopies = new Set();
    for (const distinctElement of distinctElements) {
        for (const dirtyWorkingCopy of workingCopyFileService.getDirty(distinctElement.resource)) {
            dirtyWorkingCopies.add(dirtyWorkingCopy);
        }
    }
    if (dirtyWorkingCopies.size) {
        let message;
        if (distinctElements.length > 1) {
            message = nls.localize('dirtyMessageFilesDelete', 'You are deleting files with unsaved changes. Do you want to continue?');
        }
        else if (distinctElements[0].isDirectory) {
            if (dirtyWorkingCopies.size === 1) {
                message = nls.localize('dirtyMessageFolderOneDelete', 'You are deleting a folder {0} with unsaved changes in 1 file. Do you want to continue?', distinctElements[0].name);
            }
            else {
                message = nls.localize('dirtyMessageFolderDelete', 'You are deleting a folder {0} with unsaved changes in {1} files. Do you want to continue?', distinctElements[0].name, dirtyWorkingCopies.size);
            }
        }
        else {
            message = nls.localize('dirtyMessageFileDelete', 'You are deleting {0} with unsaved changes. Do you want to continue?', distinctElements[0].name);
        }
        const response = await dialogService.confirm({
            type: 'warning',
            message,
            detail: nls.localize('dirtyWarning', "Your changes will be lost if you don't save them."),
            primaryButton,
        });
        if (!response.confirmed) {
            return;
        }
        else {
            skipConfirm = true;
        }
    }
    // Handle readonly
    if (!skipConfirm) {
        const readonlyResources = distinctElements.filter((e) => filesConfigurationService.isReadonly(e.resource));
        if (readonlyResources.length) {
            let message;
            if (readonlyResources.length > 1) {
                message = nls.localize('readonlyMessageFilesDelete', 'You are deleting files that are configured to be read-only. Do you want to continue?');
            }
            else if (readonlyResources[0].isDirectory) {
                message = nls.localize('readonlyMessageFolderOneDelete', 'You are deleting a folder {0} that is configured to be read-only. Do you want to continue?', distinctElements[0].name);
            }
            else {
                message = nls.localize('readonlyMessageFolderDelete', 'You are deleting a file {0} that is configured to be read-only. Do you want to continue?', distinctElements[0].name);
            }
            const response = await dialogService.confirm({
                type: 'warning',
                message,
                detail: nls.localize('continueDetail', 'The read-only protection will be overridden if you continue.'),
                primaryButton: nls.localize('continueButtonLabel', 'Continue'),
            });
            if (!response.confirmed) {
                return;
            }
        }
    }
    let confirmation;
    // We do not support undo of folders, so in that case the delete action is irreversible
    const deleteDetail = distinctElements.some((e) => e.isDirectory)
        ? nls.localize('irreversible', 'This action is irreversible!')
        : distinctElements.length > 1
            ? nls.localize('restorePlural', 'You can restore these files using the Undo command.')
            : nls.localize('restore', 'You can restore this file using the Undo command.');
    // Check if we need to ask for confirmation at all
    if (skipConfirm ||
        (useTrash && configurationService.getValue(CONFIRM_DELETE_SETTING_KEY) === false)) {
        confirmation = { confirmed: true };
    }
    // Confirm for moving to trash
    else if (useTrash) {
        let { message, detail } = getMoveToTrashMessage(distinctElements);
        detail += detail ? '\n' : '';
        if (isWindows) {
            detail +=
                distinctElements.length > 1
                    ? nls.localize('undoBinFiles', 'You can restore these files from the Recycle Bin.')
                    : nls.localize('undoBin', 'You can restore this file from the Recycle Bin.');
        }
        else {
            detail +=
                distinctElements.length > 1
                    ? nls.localize('undoTrashFiles', 'You can restore these files from the Trash.')
                    : nls.localize('undoTrash', 'You can restore this file from the Trash.');
        }
        confirmation = await dialogService.confirm({
            message,
            detail,
            primaryButton,
            checkbox: {
                label: nls.localize('doNotAskAgain', 'Do not ask me again'),
            },
        });
    }
    // Confirm for deleting permanently
    else {
        let { message, detail } = getDeleteMessage(distinctElements);
        detail += detail ? '\n' : '';
        detail += deleteDetail;
        confirmation = await dialogService.confirm({
            type: 'warning',
            message,
            detail,
            primaryButton,
        });
    }
    // Check for confirmation checkbox
    if (confirmation.confirmed && confirmation.checkboxChecked === true) {
        await configurationService.updateValue(CONFIRM_DELETE_SETTING_KEY, false);
    }
    // Check for confirmation
    if (!confirmation.confirmed) {
        return;
    }
    // Call function
    try {
        const resourceFileEdits = distinctElements.map((e) => new ResourceFileEdit(e.resource, undefined, {
            recursive: true,
            folder: e.isDirectory,
            ignoreIfNotExists,
            skipTrashBin: !useTrash,
            maxSize: MAX_UNDO_FILE_SIZE,
        }));
        const options = {
            undoLabel: distinctElements.length > 1
                ? nls.localize({
                    key: 'deleteBulkEdit',
                    comment: ['Placeholder will be replaced by the number of files deleted'],
                }, 'Delete {0} files', distinctElements.length)
                : nls.localize({
                    key: 'deleteFileBulkEdit',
                    comment: ['Placeholder will be replaced by the name of the file deleted'],
                }, 'Delete {0}', distinctElements[0].name),
            progressLabel: distinctElements.length > 1
                ? nls.localize({
                    key: 'deletingBulkEdit',
                    comment: ['Placeholder will be replaced by the number of files deleted'],
                }, 'Deleting {0} files', distinctElements.length)
                : nls.localize({
                    key: 'deletingFileBulkEdit',
                    comment: ['Placeholder will be replaced by the name of the file deleted'],
                }, 'Deleting {0}', distinctElements[0].name),
        };
        await explorerService.applyBulkEdit(resourceFileEdits, options);
    }
    catch (error) {
        // Handle error to delete file(s) from a modal confirmation dialog
        let errorMessage;
        let detailMessage;
        let primaryButton;
        if (useTrash) {
            errorMessage = isWindows
                ? nls.localize('binFailed', 'Failed to delete using the Recycle Bin. Do you want to permanently delete instead?')
                : nls.localize('trashFailed', 'Failed to delete using the Trash. Do you want to permanently delete instead?');
            detailMessage = deleteDetail;
            primaryButton = nls.localize({ key: 'deletePermanentlyButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Delete Permanently');
        }
        else {
            errorMessage = toErrorMessage(error, false);
            primaryButton = nls.localize({ key: 'retryButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Retry');
        }
        const res = await dialogService.confirm({
            type: 'warning',
            message: errorMessage,
            detail: detailMessage,
            primaryButton,
        });
        if (res.confirmed) {
            if (useTrash) {
                useTrash = false; // Delete Permanently
            }
            skipConfirm = true;
            ignoreIfNotExists = true;
            return deleteFiles(explorerService, workingCopyFileService, dialogService, configurationService, filesConfigurationService, elements, useTrash, skipConfirm, ignoreIfNotExists);
        }
    }
}
function getMoveToTrashMessage(distinctElements) {
    if (containsBothDirectoryAndFile(distinctElements)) {
        return {
            message: nls.localize('confirmMoveTrashMessageFilesAndDirectories', 'Are you sure you want to delete the following {0} files/directories and their contents?', distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map((e) => e.resource)),
        };
    }
    if (distinctElements.length > 1) {
        if (distinctElements[0].isDirectory) {
            return {
                message: nls.localize('confirmMoveTrashMessageMultipleDirectories', 'Are you sure you want to delete the following {0} directories and their contents?', distinctElements.length),
                detail: getFileNamesMessage(distinctElements.map((e) => e.resource)),
            };
        }
        return {
            message: nls.localize('confirmMoveTrashMessageMultiple', 'Are you sure you want to delete the following {0} files?', distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map((e) => e.resource)),
        };
    }
    if (distinctElements[0].isDirectory && !distinctElements[0].isSymbolicLink) {
        return {
            message: nls.localize('confirmMoveTrashMessageFolder', "Are you sure you want to delete '{0}' and its contents?", distinctElements[0].name),
            detail: '',
        };
    }
    return {
        message: nls.localize('confirmMoveTrashMessageFile', "Are you sure you want to delete '{0}'?", distinctElements[0].name),
        detail: '',
    };
}
function getDeleteMessage(distinctElements) {
    if (containsBothDirectoryAndFile(distinctElements)) {
        return {
            message: nls.localize('confirmDeleteMessageFilesAndDirectories', 'Are you sure you want to permanently delete the following {0} files/directories and their contents?', distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map((e) => e.resource)),
        };
    }
    if (distinctElements.length > 1) {
        if (distinctElements[0].isDirectory) {
            return {
                message: nls.localize('confirmDeleteMessageMultipleDirectories', 'Are you sure you want to permanently delete the following {0} directories and their contents?', distinctElements.length),
                detail: getFileNamesMessage(distinctElements.map((e) => e.resource)),
            };
        }
        return {
            message: nls.localize('confirmDeleteMessageMultiple', 'Are you sure you want to permanently delete the following {0} files?', distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map((e) => e.resource)),
        };
    }
    if (distinctElements[0].isDirectory) {
        return {
            message: nls.localize('confirmDeleteMessageFolder', "Are you sure you want to permanently delete '{0}' and its contents?", distinctElements[0].name),
            detail: '',
        };
    }
    return {
        message: nls.localize('confirmDeleteMessageFile', "Are you sure you want to permanently delete '{0}'?", distinctElements[0].name),
        detail: '',
    };
}
function containsBothDirectoryAndFile(distinctElements) {
    const directory = distinctElements.find((element) => element.isDirectory);
    const file = distinctElements.find((element) => !element.isDirectory);
    return !!directory && !!file;
}
export async function findValidPasteFileTarget(explorerService, fileService, dialogService, targetFolder, fileToPaste, incrementalNaming) {
    let name = typeof fileToPaste.resource === 'string'
        ? fileToPaste.resource
        : resources.basenameOrAuthority(fileToPaste.resource);
    let candidate = resources.joinPath(targetFolder.resource, name);
    // In the disabled case we must ask if it's ok to overwrite the file if it exists
    if (incrementalNaming === 'disabled') {
        const canOverwrite = await askForOverwrite(fileService, dialogService, candidate);
        if (!canOverwrite) {
            return;
        }
    }
    while (true && !fileToPaste.allowOverwrite) {
        if (!explorerService.findClosest(candidate)) {
            break;
        }
        if (incrementalNaming !== 'disabled') {
            name = incrementFileName(name, !!fileToPaste.isDirectory, incrementalNaming);
        }
        candidate = resources.joinPath(targetFolder.resource, name);
    }
    return candidate;
}
export function incrementFileName(name, isFolder, incrementalNaming) {
    if (incrementalNaming === 'simple') {
        let namePrefix = name;
        let extSuffix = '';
        if (!isFolder) {
            extSuffix = extname(name);
            namePrefix = basename(name, extSuffix);
        }
        // name copy 5(.txt) => name copy 6(.txt)
        // name copy(.txt) => name copy 2(.txt)
        const suffixRegex = /^(.+ copy)( \d+)?$/;
        if (suffixRegex.test(namePrefix)) {
            return (namePrefix.replace(suffixRegex, (match, g1, g2) => {
                const number = g2 ? parseInt(g2) : 1;
                return number === 0
                    ? `${g1}`
                    : number < 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */
                        ? `${g1} ${number + 1}`
                        : `${g1}${g2} copy`;
            }) + extSuffix);
        }
        // name(.txt) => name copy(.txt)
        return `${namePrefix} copy${extSuffix}`;
    }
    const separators = '[\\.\\-_]';
    const maxNumber = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
    // file.1.txt=>file.2.txt
    const suffixFileRegex = RegExp('(.*' + separators + ')(\\d+)(\\..*)$');
    if (!isFolder && name.match(suffixFileRegex)) {
        return name.replace(suffixFileRegex, (match, g1, g2, g3) => {
            const number = parseInt(g2);
            return number < maxNumber
                ? g1 + String(number + 1).padStart(g2.length, '0') + g3
                : `${g1}${g2}.1${g3}`;
        });
    }
    // 1.file.txt=>2.file.txt
    const prefixFileRegex = RegExp('(\\d+)(' + separators + '.*)(\\..*)$');
    if (!isFolder && name.match(prefixFileRegex)) {
        return name.replace(prefixFileRegex, (match, g1, g2, g3) => {
            const number = parseInt(g1);
            return number < maxNumber
                ? String(number + 1).padStart(g1.length, '0') + g2 + g3
                : `${g1}${g2}.1${g3}`;
        });
    }
    // 1.txt=>2.txt
    const prefixFileNoNameRegex = RegExp('(\\d+)(\\..*)$');
    if (!isFolder && name.match(prefixFileNoNameRegex)) {
        return name.replace(prefixFileNoNameRegex, (match, g1, g2) => {
            const number = parseInt(g1);
            return number < maxNumber ? String(number + 1).padStart(g1.length, '0') + g2 : `${g1}.1${g2}`;
        });
    }
    // file.txt=>file.1.txt
    const lastIndexOfDot = name.lastIndexOf('.');
    if (!isFolder && lastIndexOfDot >= 0) {
        return `${name.substr(0, lastIndexOfDot)}.1${name.substr(lastIndexOfDot)}`;
    }
    // 123 => 124
    const noNameNoExtensionRegex = RegExp('(\\d+)$');
    if (!isFolder && lastIndexOfDot === -1 && name.match(noNameNoExtensionRegex)) {
        return name.replace(noNameNoExtensionRegex, (match, g1) => {
            const number = parseInt(g1);
            return number < maxNumber ? String(number + 1).padStart(g1.length, '0') : `${g1}.1`;
        });
    }
    // file => file1
    // file1 => file2
    const noExtensionRegex = RegExp('(.*)(\\d*)$');
    if (!isFolder && lastIndexOfDot === -1 && name.match(noExtensionRegex)) {
        return name.replace(noExtensionRegex, (match, g1, g2) => {
            let number = parseInt(g2);
            if (isNaN(number)) {
                number = 0;
            }
            return number < maxNumber ? g1 + String(number + 1).padStart(g2.length, '0') : `${g1}${g2}.1`;
        });
    }
    // folder.1=>folder.2
    if (isFolder && name.match(/(\d+)$/)) {
        return name.replace(/(\d+)$/, (match, ...groups) => {
            const number = parseInt(groups[0]);
            return number < maxNumber
                ? String(number + 1).padStart(groups[0].length, '0')
                : `${groups[0]}.1`;
        });
    }
    // 1.folder=>2.folder
    if (isFolder && name.match(/^(\d+)/)) {
        return name.replace(/^(\d+)(.*)$/, (match, ...groups) => {
            const number = parseInt(groups[0]);
            return number < maxNumber
                ? String(number + 1).padStart(groups[0].length, '0') + groups[1]
                : `${groups[0]}${groups[1]}.1`;
        });
    }
    // file/folder=>file.1/folder.1
    return `${name}.1`;
}
/**
 * Checks to see if the resource already exists, if so prompts the user if they would be ok with it being overwritten
 * @param fileService The file service
 * @param dialogService The dialog service
 * @param targetResource The resource to be overwritten
 * @return A boolean indicating if the user is ok with resource being overwritten, if the resource does not exist it returns true.
 */
async function askForOverwrite(fileService, dialogService, targetResource) {
    const exists = await fileService.exists(targetResource);
    if (!exists) {
        return true;
    }
    // Ask for overwrite confirmation
    const { confirmed } = await dialogService.confirm({
        type: Severity.Warning,
        message: nls.localize('confirmOverwrite', "A file or folder with the name '{0}' already exists in the destination folder. Do you want to replace it?", basename(targetResource.path)),
        primaryButton: nls.localize('replaceButtonLabel', '&&Replace'),
    });
    return confirmed;
}
// Global Compare with
export class GlobalCompareResourcesAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareFileWith'; }
    static { this.LABEL = nls.localize2('globalCompareFile', 'Compare Active File With...'); }
    constructor() {
        super({
            id: GlobalCompareResourcesAction.ID,
            title: GlobalCompareResourcesAction.LABEL,
            f1: true,
            category: Categories.File,
            precondition: ActiveEditorContext,
            metadata: {
                description: nls.localize2('compareFileWithMeta', 'Opens a picker to select a file to diff with the active editor.'),
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const textModelService = accessor.get(ITextModelService);
        const quickInputService = accessor.get(IQuickInputService);
        const activeInput = editorService.activeEditor;
        const activeResource = EditorResourceAccessor.getOriginalUri(activeInput);
        if (activeResource && textModelService.canHandleResource(activeResource)) {
            const picks = await quickInputService.quickAccess.pick('', {
                itemActivation: ItemActivation.SECOND,
            });
            if (picks?.length === 1) {
                const resource = picks[0].resource;
                if (URI.isUri(resource) && textModelService.canHandleResource(resource)) {
                    editorService.openEditor({
                        original: { resource: activeResource },
                        modified: { resource: resource },
                        options: { pinned: true },
                    });
                }
            }
        }
    }
}
export class ToggleAutoSaveAction extends Action2 {
    static { this.ID = 'workbench.action.toggleAutoSave'; }
    constructor() {
        super({
            id: ToggleAutoSaveAction.ID,
            title: nls.localize2('toggleAutoSave', 'Toggle Auto Save'),
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2('toggleAutoSaveDescription', 'Toggle the ability to save files automatically after typing'),
            },
        });
    }
    run(accessor) {
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        return filesConfigurationService.toggleAutoSave();
    }
}
let BaseSaveAllAction = class BaseSaveAllAction extends Action {
    constructor(id, label, commandService, notificationService, workingCopyService) {
        super(id, label);
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.workingCopyService = workingCopyService;
        this.lastDirtyState = this.workingCopyService.hasDirty;
        this.enabled = this.lastDirtyState;
        this.registerListeners();
    }
    registerListeners() {
        // update enablement based on working copy changes
        this._register(this.workingCopyService.onDidChangeDirty((workingCopy) => this.updateEnablement(workingCopy)));
    }
    updateEnablement(workingCopy) {
        const hasDirty = workingCopy.isDirty() || this.workingCopyService.hasDirty;
        if (this.lastDirtyState !== hasDirty) {
            this.enabled = hasDirty;
            this.lastDirtyState = this.enabled;
        }
    }
    async run(context) {
        try {
            await this.doRun(context);
        }
        catch (error) {
            onError(this.notificationService, error);
        }
    }
};
BaseSaveAllAction = __decorate([
    __param(2, ICommandService),
    __param(3, INotificationService),
    __param(4, IWorkingCopyService)
], BaseSaveAllAction);
export class SaveAllInGroupAction extends BaseSaveAllAction {
    static { this.ID = 'workbench.files.action.saveAllInGroup'; }
    static { this.LABEL = nls.localize('saveAllInGroup', 'Save All in Group'); }
    get class() {
        return 'explorer-action ' + ThemeIcon.asClassName(Codicon.saveAll);
    }
    doRun(context) {
        return this.commandService.executeCommand(SAVE_ALL_IN_GROUP_COMMAND_ID, {}, context);
    }
}
let CloseGroupAction = class CloseGroupAction extends Action {
    static { this.ID = 'workbench.files.action.closeGroup'; }
    static { this.LABEL = nls.localize('closeGroup', 'Close Group'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(Codicon.closeAll));
        this.commandService = commandService;
    }
    run(context) {
        return this.commandService.executeCommand(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, {}, context);
    }
};
CloseGroupAction = __decorate([
    __param(2, ICommandService)
], CloseGroupAction);
export { CloseGroupAction };
export class FocusFilesExplorer extends Action2 {
    static { this.ID = 'workbench.files.action.focusFilesExplorer'; }
    static { this.LABEL = nls.localize2('focusFilesExplorer', 'Focus on Files Explorer'); }
    constructor() {
        super({
            id: FocusFilesExplorer.ID,
            title: FocusFilesExplorer.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2('focusFilesExplorerMetadata', 'Moves focus to the file explorer view container.'),
            },
        });
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        await paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */, true);
    }
}
export class ShowActiveFileInExplorer extends Action2 {
    static { this.ID = 'workbench.files.action.showActiveFileInExplorer'; }
    static { this.LABEL = nls.localize2('showInExplorer', 'Reveal Active File in Explorer View'); }
    constructor() {
        super({
            id: ShowActiveFileInExplorer.ID,
            title: ShowActiveFileInExplorer.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2('showInExplorerMetadata', 'Reveals and selects the active file within the explorer view.'),
            },
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const editorService = accessor.get(IEditorService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (resource) {
            commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, resource);
        }
    }
}
export class OpenActiveFileInEmptyWorkspace extends Action2 {
    static { this.ID = 'workbench.action.files.showOpenedFileInNewWindow'; }
    static { this.LABEL = nls.localize2('openFileInEmptyWorkspace', 'Open Active File in New Empty Workspace'); }
    constructor() {
        super({
            id: OpenActiveFileInEmptyWorkspace.ID,
            title: OpenActiveFileInEmptyWorkspace.LABEL,
            f1: true,
            category: Categories.File,
            precondition: EmptyWorkspaceSupportContext,
            metadata: {
                description: nls.localize2('openFileInEmptyWorkspaceMetadata', 'Opens the active file in a new window with no folders open.'),
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const hostService = accessor.get(IHostService);
        const dialogService = accessor.get(IDialogService);
        const fileService = accessor.get(IFileService);
        const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (fileResource) {
            if (fileService.hasProvider(fileResource)) {
                hostService.openWindow([{ fileUri: fileResource }], { forceNewWindow: true });
            }
            else {
                dialogService.error(nls.localize('openFileToShowInNewWindow.unsupportedschema', 'The active editor must contain an openable resource.'));
            }
        }
    }
}
export function validateFileName(pathService, item, name, os) {
    // Produce a well formed file name
    name = getWellFormedFileName(name);
    // Name not provided
    if (!name || name.length === 0 || /^\s+$/.test(name)) {
        return {
            content: nls.localize('emptyFileNameError', 'A file or folder name must be provided.'),
            severity: Severity.Error,
        };
    }
    // Relative paths only
    if (name[0] === '/' || name[0] === '\\') {
        return {
            content: nls.localize('fileNameStartsWithSlashError', 'A file or folder name cannot start with a slash.'),
            severity: Severity.Error,
        };
    }
    const names = coalesce(name.split(/[\\/]/));
    const parent = item.parent;
    if (name !== item.name) {
        // Do not allow to overwrite existing file
        const child = parent?.getChild(name);
        if (child && child !== item) {
            return {
                content: nls.localize('fileNameExistsError', 'A file or folder **{0}** already exists at this location. Please choose a different name.', name),
                severity: Severity.Error,
            };
        }
    }
    // Check for invalid file name.
    if (names.some((folderName) => !pathService.hasValidBasename(item.resource, os, folderName))) {
        // Escape * characters
        const escapedName = name.replace(/\*/g, '\\*'); // CodeQL [SM02383] This only processes filenames which are enforced against having backslashes in them farther up in the stack.
        return {
            content: nls.localize('invalidFileNameError', 'The name **{0}** is not valid as a file or folder name. Please choose a different name.', trimLongName(escapedName)),
            severity: Severity.Error,
        };
    }
    if (names.some((name) => /^\s|\s$/.test(name))) {
        return {
            content: nls.localize('fileNameWhitespaceWarning', 'Leading or trailing whitespace detected in file or folder name.'),
            severity: Severity.Warning,
        };
    }
    return null;
}
function trimLongName(name) {
    if (name?.length > 255) {
        return `${name.substr(0, 255)}...`;
    }
    return name;
}
function getWellFormedFileName(filename) {
    if (!filename) {
        return filename;
    }
    // Trim tabs
    filename = trim(filename, '\t');
    // Remove trailing slashes
    filename = rtrim(filename, '/');
    filename = rtrim(filename, '\\');
    return filename;
}
export class CompareNewUntitledTextFilesAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareNewUntitledTextFiles'; }
    static { this.LABEL = nls.localize2('compareNewUntitledTextFiles', 'Compare New Untitled Text Files'); }
    constructor() {
        super({
            id: CompareNewUntitledTextFilesAction.ID,
            title: CompareNewUntitledTextFilesAction.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2('compareNewUntitledTextFilesMeta', 'Opens a new diff editor with two untitled files.'),
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            original: { resource: undefined },
            modified: { resource: undefined },
            options: { pinned: true },
        });
    }
}
export class CompareWithClipboardAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareWithClipboard'; }
    static { this.LABEL = nls.localize2('compareWithClipboard', 'Compare Active File with Clipboard'); }
    static { this.SCHEME_COUNTER = 0; }
    constructor() {
        super({
            id: CompareWithClipboardAction.ID,
            title: CompareWithClipboardAction.LABEL,
            f1: true,
            category: Categories.File,
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 33 /* KeyCode.KeyC */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            metadata: {
                description: nls.localize2('compareWithClipboardMeta', 'Opens a new diff editor to compare the active file with the contents of the clipboard.'),
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const textModelService = accessor.get(ITextModelService);
        const fileService = accessor.get(IFileService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        const scheme = `clipboardCompare${CompareWithClipboardAction.SCHEME_COUNTER++}`;
        if (resource && (fileService.hasProvider(resource) || resource.scheme === Schemas.untitled)) {
            if (!this.registrationDisposal) {
                const provider = instantiationService.createInstance(ClipboardContentProvider);
                this.registrationDisposal = textModelService.registerTextModelContentProvider(scheme, provider);
            }
            const name = resources.basename(resource);
            const editorLabel = nls.localize('clipboardComparisonLabel', 'Clipboard ↔ {0}', name);
            await editorService
                .openEditor({
                original: { resource: resource.with({ scheme }) },
                modified: { resource: resource },
                label: editorLabel,
                options: { pinned: true },
            })
                .finally(() => {
                dispose(this.registrationDisposal);
                this.registrationDisposal = undefined;
            });
        }
    }
    dispose() {
        dispose(this.registrationDisposal);
        this.registrationDisposal = undefined;
    }
}
let ClipboardContentProvider = class ClipboardContentProvider {
    constructor(clipboardService, languageService, modelService) {
        this.clipboardService = clipboardService;
        this.languageService = languageService;
        this.modelService = modelService;
    }
    async provideTextContent(resource) {
        const text = await this.clipboardService.readText();
        const model = this.modelService.createModel(text, this.languageService.createByFilepathOrFirstLine(resource), resource);
        return model;
    }
};
ClipboardContentProvider = __decorate([
    __param(0, IClipboardService),
    __param(1, ILanguageService),
    __param(2, IModelService)
], ClipboardContentProvider);
function onErrorWithRetry(notificationService, error, retry) {
    notificationService.prompt(Severity.Error, toErrorMessage(error, false), [
        {
            label: nls.localize('retry', 'Retry'),
            run: () => retry(),
        },
    ]);
}
async function openExplorerAndCreate(accessor, isFolder) {
    const explorerService = accessor.get(IExplorerService);
    const fileService = accessor.get(IFileService);
    const configService = accessor.get(IConfigurationService);
    const filesConfigService = accessor.get(IFilesConfigurationService);
    const editorService = accessor.get(IEditorService);
    const viewsService = accessor.get(IViewsService);
    const notificationService = accessor.get(INotificationService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const commandService = accessor.get(ICommandService);
    const pathService = accessor.get(IPathService);
    const wasHidden = !viewsService.isViewVisible(VIEW_ID);
    const view = await viewsService.openView(VIEW_ID, true);
    if (wasHidden) {
        // Give explorer some time to resolve itself #111218
        await timeout(500);
    }
    if (!view) {
        // Can happen in empty workspace case (https://github.com/microsoft/vscode/issues/100604)
        if (isFolder) {
            throw new Error('Open a folder or workspace first.');
        }
        return commandService.executeCommand(NEW_UNTITLED_FILE_COMMAND_ID);
    }
    const stats = explorerService.getContext(false);
    const stat = stats.length > 0 ? stats[0] : undefined;
    let folder;
    if (stat) {
        folder = stat.isDirectory ? stat : stat.parent || explorerService.roots[0];
    }
    else {
        folder = explorerService.roots[0];
    }
    if (folder.isReadonly) {
        throw new Error('Parent folder is readonly.');
    }
    const newStat = new NewExplorerItem(fileService, configService, filesConfigService, folder, isFolder);
    folder.addChild(newStat);
    const onSuccess = async (value) => {
        try {
            const resourceToCreate = resources.joinPath(folder.resource, value);
            if (value.endsWith('/')) {
                isFolder = true;
            }
            await explorerService.applyBulkEdit([new ResourceFileEdit(undefined, resourceToCreate, { folder: isFolder })], {
                undoLabel: nls.localize('createBulkEdit', 'Create {0}', value),
                progressLabel: nls.localize('creatingBulkEdit', 'Creating {0}', value),
                confirmBeforeUndo: true,
            });
            await refreshIfSeparator(value, explorerService);
            if (isFolder) {
                await explorerService.select(resourceToCreate, true);
            }
            else {
                await editorService.openEditor({ resource: resourceToCreate, options: { pinned: true } });
            }
        }
        catch (error) {
            onErrorWithRetry(notificationService, error, () => onSuccess(value));
        }
    };
    const os = (await remoteAgentService.getEnvironment())?.os ?? OS;
    await explorerService.setEditable(newStat, {
        validationMessage: (value) => validateFileName(pathService, newStat, value, os),
        onFinish: async (value, success) => {
            folder.removeChild(newStat);
            await explorerService.setEditable(newStat, null);
            if (success) {
                onSuccess(value);
            }
        },
    });
}
CommandsRegistry.registerCommand({
    id: NEW_FILE_COMMAND_ID,
    handler: async (accessor) => {
        await openExplorerAndCreate(accessor, false);
    },
});
CommandsRegistry.registerCommand({
    id: NEW_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        await openExplorerAndCreate(accessor, true);
    },
});
export const renameHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const pathService = accessor.get(IPathService);
    const configurationService = accessor.get(IConfigurationService);
    const stats = explorerService.getContext(false);
    const stat = stats.length > 0 ? stats[0] : undefined;
    if (!stat) {
        return;
    }
    const os = (await remoteAgentService.getEnvironment())?.os ?? OS;
    await explorerService.setEditable(stat, {
        validationMessage: (value) => validateFileName(pathService, stat, value, os),
        onFinish: async (value, success) => {
            if (success) {
                const parentResource = stat.parent.resource;
                const targetResource = resources.joinPath(parentResource, value);
                if (stat.resource.toString() !== targetResource.toString()) {
                    try {
                        await explorerService.applyBulkEdit([new ResourceFileEdit(stat.resource, targetResource)], {
                            confirmBeforeUndo: configurationService.getValue().explorer.confirmUndo ===
                                "verbose" /* UndoConfirmLevel.Verbose */,
                            undoLabel: nls.localize('renameBulkEdit', 'Rename {0} to {1}', stat.name, value),
                            progressLabel: nls.localize('renamingBulkEdit', 'Renaming {0} to {1}', stat.name, value),
                        });
                        await refreshIfSeparator(value, explorerService);
                    }
                    catch (e) {
                        notificationService.error(e);
                    }
                }
            }
            await explorerService.setEditable(stat, null);
        },
    });
};
export const moveFileToTrashHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true).filter((s) => !s.isRoot);
    if (stats.length) {
        await deleteFiles(accessor.get(IExplorerService), accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), accessor.get(IFilesConfigurationService), stats, true);
    }
};
export const deleteFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true).filter((s) => !s.isRoot);
    if (stats.length) {
        await deleteFiles(accessor.get(IExplorerService), accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), accessor.get(IFilesConfigurationService), stats, false);
    }
};
let pasteShouldMove = false;
export const copyFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    if (stats.length > 0) {
        await explorerService.setToCopy(stats, false);
        pasteShouldMove = false;
    }
};
export const cutFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    if (stats.length > 0) {
        await explorerService.setToCopy(stats, true);
        pasteShouldMove = true;
    }
};
const downloadFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    const context = explorerService.getContext(true);
    const explorerItems = context.length ? context : explorerService.roots;
    const downloadHandler = instantiationService.createInstance(FileDownload);
    try {
        await downloadHandler.download(explorerItems);
    }
    catch (error) {
        notificationService.error(error);
        throw error;
    }
};
CommandsRegistry.registerCommand({
    id: DOWNLOAD_COMMAND_ID,
    handler: downloadFileHandler,
});
const uploadFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    const context = explorerService.getContext(false);
    const element = context.length ? context[0] : explorerService.roots[0];
    try {
        const files = await triggerUpload();
        if (files) {
            const browserUpload = instantiationService.createInstance(BrowserFileUpload);
            await browserUpload.upload(element, files);
        }
    }
    catch (error) {
        notificationService.error(error);
        throw error;
    }
};
CommandsRegistry.registerCommand({
    id: UPLOAD_COMMAND_ID,
    handler: uploadFileHandler,
});
export const pasteFileHandler = async (accessor, fileList) => {
    const clipboardService = accessor.get(IClipboardService);
    const explorerService = accessor.get(IExplorerService);
    const fileService = accessor.get(IFileService);
    const notificationService = accessor.get(INotificationService);
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const uriIdentityService = accessor.get(IUriIdentityService);
    const dialogService = accessor.get(IDialogService);
    const hostService = accessor.get(IHostService);
    const context = explorerService.getContext(false);
    const hasNativeFilesToPaste = fileList && fileList.length > 0;
    const confirmPasteNative = hasNativeFilesToPaste && configurationService.getValue('explorer.confirmPasteNative');
    const toPaste = await getFilesToPaste(fileList, clipboardService, hostService);
    if (confirmPasteNative && toPaste.files.length >= 1) {
        const message = toPaste.files.length > 1
            ? nls.localize('confirmMultiPasteNative', 'Are you sure you want to paste the following {0} items?', toPaste.files.length)
            : nls.localize('confirmPasteNative', "Are you sure you want to paste '{0}'?", basename(toPaste.type === 'paths' ? toPaste.files[0].fsPath : toPaste.files[0].name));
        const detail = toPaste.files.length > 1
            ? getFileNamesMessage(toPaste.files.map((item) => {
                if (URI.isUri(item)) {
                    return item.fsPath;
                }
                if (toPaste.type === 'paths') {
                    const path = getPathForFile(item);
                    if (path) {
                        return path;
                    }
                }
                return item.name;
            }))
            : undefined;
        const confirmation = await dialogService.confirm({
            message,
            detail,
            checkbox: {
                label: nls.localize('doNotAskAgain', 'Do not ask me again'),
            },
            primaryButton: nls.localize({ key: 'pasteButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Paste'),
        });
        if (!confirmation.confirmed) {
            return;
        }
        // Check for confirmation checkbox
        if (confirmation.checkboxChecked === true) {
            await configurationService.updateValue('explorer.confirmPasteNative', false);
        }
    }
    const element = context.length ? context[0] : explorerService.roots[0];
    const incrementalNaming = configurationService.getValue().explorer.incrementalNaming;
    const editableItem = explorerService.getEditable();
    // If it's an editable item, just do nothing
    if (editableItem) {
        return;
    }
    try {
        let targets = [];
        if (toPaste.type === 'paths') {
            // Pasting from files on disk
            // Check if target is ancestor of pasted folder
            const sourceTargetPairs = coalesce(await Promise.all(toPaste.files.map(async (fileToPaste) => {
                if (element.resource.toString() !== fileToPaste.toString() &&
                    resources.isEqualOrParent(element.resource, fileToPaste)) {
                    throw new Error(nls.localize('fileIsAncestor', 'File to paste is an ancestor of the destination folder'));
                }
                const fileToPasteStat = await fileService.stat(fileToPaste);
                // Find target
                let target;
                if (uriIdentityService.extUri.isEqual(element.resource, fileToPaste)) {
                    target = element.parent;
                }
                else {
                    target = element.isDirectory ? element : element.parent;
                }
                const targetFile = await findValidPasteFileTarget(explorerService, fileService, dialogService, target, {
                    resource: fileToPaste,
                    isDirectory: fileToPasteStat.isDirectory,
                    allowOverwrite: pasteShouldMove || incrementalNaming === 'disabled',
                }, incrementalNaming);
                if (!targetFile) {
                    return undefined;
                }
                return { source: fileToPaste, target: targetFile };
            })));
            if (sourceTargetPairs.length >= 1) {
                // Move/Copy File
                if (pasteShouldMove) {
                    const resourceFileEdits = sourceTargetPairs.map((pair) => new ResourceFileEdit(pair.source, pair.target, {
                        overwrite: incrementalNaming === 'disabled',
                    }));
                    const options = {
                        confirmBeforeUndo: configurationService.getValue().explorer.confirmUndo ===
                            "verbose" /* UndoConfirmLevel.Verbose */,
                        progressLabel: sourceTargetPairs.length > 1
                            ? nls.localize({
                                key: 'movingBulkEdit',
                                comment: ['Placeholder will be replaced by the number of files being moved'],
                            }, 'Moving {0} files', sourceTargetPairs.length)
                            : nls.localize({
                                key: 'movingFileBulkEdit',
                                comment: ['Placeholder will be replaced by the name of the file moved.'],
                            }, 'Moving {0}', resources.basenameOrAuthority(sourceTargetPairs[0].target)),
                        undoLabel: sourceTargetPairs.length > 1
                            ? nls.localize({
                                key: 'moveBulkEdit',
                                comment: ['Placeholder will be replaced by the number of files being moved'],
                            }, 'Move {0} files', sourceTargetPairs.length)
                            : nls.localize({
                                key: 'moveFileBulkEdit',
                                comment: ['Placeholder will be replaced by the name of the file moved.'],
                            }, 'Move {0}', resources.basenameOrAuthority(sourceTargetPairs[0].target)),
                    };
                    await explorerService.applyBulkEdit(resourceFileEdits, options);
                }
                else {
                    const resourceFileEdits = sourceTargetPairs.map((pair) => new ResourceFileEdit(pair.source, pair.target, {
                        copy: true,
                        overwrite: incrementalNaming === 'disabled',
                    }));
                    await applyCopyResourceEdit(sourceTargetPairs.map((pair) => pair.target), resourceFileEdits);
                }
            }
            targets = sourceTargetPairs.map((pair) => pair.target);
        }
        else {
            // Pasting from file data
            const targetAndEdits = coalesce(await Promise.all(toPaste.files.map(async (file) => {
                const target = element.isDirectory ? element : element.parent;
                const targetFile = await findValidPasteFileTarget(explorerService, fileService, dialogService, target, {
                    resource: file.name,
                    isDirectory: false,
                    allowOverwrite: pasteShouldMove || incrementalNaming === 'disabled',
                }, incrementalNaming);
                if (!targetFile) {
                    return;
                }
                return {
                    target: targetFile,
                    edit: new ResourceFileEdit(undefined, targetFile, {
                        overwrite: incrementalNaming === 'disabled',
                        contents: (async () => VSBuffer.wrap(new Uint8Array(await file.arrayBuffer())))(),
                    }),
                };
            })));
            await applyCopyResourceEdit(targetAndEdits.map((pair) => pair.target), targetAndEdits.map((pair) => pair.edit));
            targets = targetAndEdits.map((pair) => pair.target);
        }
        if (targets.length) {
            const firstTarget = targets[0];
            await explorerService.select(firstTarget);
            if (targets.length === 1) {
                const item = explorerService.findClosest(firstTarget);
                if (item && !item.isDirectory) {
                    await editorService.openEditor({
                        resource: item.resource,
                        options: { pinned: true, preserveFocus: true },
                    });
                }
            }
        }
    }
    catch (e) {
        onError(notificationService, new Error(nls.localize('fileDeleted', 'The file(s) to paste have been deleted or moved since you copied them. {0}', getErrorMessage(e))));
    }
    finally {
        if (pasteShouldMove) {
            // Cut is done. Make sure to clear cut state.
            await explorerService.setToCopy([], false);
            pasteShouldMove = false;
        }
    }
    async function applyCopyResourceEdit(targets, resourceFileEdits) {
        const undoLevel = configurationService.getValue().explorer.confirmUndo;
        const options = {
            confirmBeforeUndo: undoLevel === "default" /* UndoConfirmLevel.Default */ || undoLevel === "verbose" /* UndoConfirmLevel.Verbose */,
            progressLabel: targets.length > 1
                ? nls.localize({
                    key: 'copyingBulkEdit',
                    comment: ['Placeholder will be replaced by the number of files being copied'],
                }, 'Copying {0} files', targets.length)
                : nls.localize({
                    key: 'copyingFileBulkEdit',
                    comment: ['Placeholder will be replaced by the name of the file copied.'],
                }, 'Copying {0}', resources.basenameOrAuthority(targets[0])),
            undoLabel: targets.length > 1
                ? nls.localize({
                    key: 'copyBulkEdit',
                    comment: ['Placeholder will be replaced by the number of files being copied'],
                }, 'Paste {0} files', targets.length)
                : nls.localize({
                    key: 'copyFileBulkEdit',
                    comment: ['Placeholder will be replaced by the name of the file copied.'],
                }, 'Paste {0}', resources.basenameOrAuthority(targets[0])),
        };
        await explorerService.applyBulkEdit(resourceFileEdits, options);
    }
};
async function getFilesToPaste(fileList, clipboardService, hostService) {
    if (fileList && fileList.length > 0) {
        // with a `fileList` we support natively pasting file from disk from clipboard
        const resources = [...fileList]
            .map((file) => getPathForFile(file))
            .filter((filePath) => !!filePath && isAbsolute(filePath))
            .map((filePath) => URI.file(filePath));
        if (resources.length) {
            return { type: 'paths', files: resources };
        }
        // Support pasting files that we can't read from disk
        return { type: 'data', files: [...fileList].filter((file) => !getPathForFile(file)) };
    }
    else {
        // otherwise we fallback to reading resources from our clipboard service
        return {
            type: 'paths',
            files: resources.distinctParents(await clipboardService.readResources(), (resource) => resource),
        };
    }
}
export const openFilePreserveFocusHandler = async (accessor) => {
    const editorService = accessor.get(IEditorService);
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    await editorService.openEditors(stats
        .filter((s) => !s.isDirectory)
        .map((s) => ({
        resource: s.resource,
        options: { preserveFocus: true },
    })));
};
class BaseSetActiveEditorReadonlyInSession extends Action2 {
    constructor(id, title, newReadonlyState) {
        super({
            id,
            title,
            f1: true,
            category: Categories.File,
            precondition: ActiveEditorCanToggleReadonlyContext,
        });
        this.newReadonlyState = newReadonlyState;
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (!fileResource) {
            return;
        }
        await filesConfigurationService.updateReadonly(fileResource, this.newReadonlyState);
    }
}
export class SetActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.setActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2('setActiveEditorReadonlyInSession', 'Set Active Editor Read-only in Session'); }
    constructor() {
        super(SetActiveEditorReadonlyInSession.ID, SetActiveEditorReadonlyInSession.LABEL, true);
    }
}
export class SetActiveEditorWriteableInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.setActiveEditorWriteableInSession'; }
    static { this.LABEL = nls.localize2('setActiveEditorWriteableInSession', 'Set Active Editor Writeable in Session'); }
    constructor() {
        super(SetActiveEditorWriteableInSession.ID, SetActiveEditorWriteableInSession.LABEL, false);
    }
}
export class ToggleActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.toggleActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2('toggleActiveEditorReadonlyInSession', 'Toggle Active Editor Read-only in Session'); }
    constructor() {
        super(ToggleActiveEditorReadonlyInSession.ID, ToggleActiveEditorReadonlyInSession.LABEL, 'toggle');
    }
}
export class ResetActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.resetActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2('resetActiveEditorReadonlyInSession', 'Reset Active Editor Read-only in Session'); }
    constructor() {
        super(ResetActiveEditorReadonlyInSession.ID, ResetActiveEditorReadonlyInSession.LABEL, 'reset');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFNBQVMsRUFBbUIsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0UsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBdUIsT0FBTyxFQUFvQixNQUFNLG9CQUFvQixDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUNOLDZCQUE2QixFQUM3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