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
import * as resources from '../../../../base/common/resources.js';
import * as objects from '../../../../base/common/objects.js';
import { IFileService, FileKind, } from '../../../../platform/files/common/files.js';
import { IQuickInputService, ItemActivation, } from '../../../../platform/quickinput/common/quickInput.js';
import { URI } from '../../../../base/common/uri.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IFileDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { Schemas } from '../../../../base/common/network.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { equalsIgnoreCase, format, startsWithIgnoreCase } from '../../../../base/common/strings.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { isValidBasename } from '../../../../base/common/extpath.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { createCancelablePromise } from '../../../../base/common/async.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import { IPathService } from '../../path/common/pathService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { getActiveDocument } from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
export var OpenLocalFileCommand;
(function (OpenLocalFileCommand) {
    OpenLocalFileCommand.ID = 'workbench.action.files.openLocalFile';
    OpenLocalFileCommand.LABEL = nls.localize('openLocalFile', 'Open Local File...');
    function handler() {
        return (accessor) => {
            const dialogService = accessor.get(IFileDialogService);
            return dialogService.pickFileAndOpen({
                forceNewWindow: false,
                availableFileSystems: [Schemas.file],
            });
        };
    }
    OpenLocalFileCommand.handler = handler;
})(OpenLocalFileCommand || (OpenLocalFileCommand = {}));
export var SaveLocalFileCommand;
(function (SaveLocalFileCommand) {
    SaveLocalFileCommand.ID = 'workbench.action.files.saveLocalFile';
    SaveLocalFileCommand.LABEL = nls.localize('saveLocalFile', 'Save Local File...');
    function handler() {
        return (accessor) => {
            const editorService = accessor.get(IEditorService);
            const activeEditorPane = editorService.activeEditorPane;
            if (activeEditorPane) {
                return editorService.save({ groupId: activeEditorPane.group.id, editor: activeEditorPane.input }, { saveAs: true, availableFileSystems: [Schemas.file], reason: 1 /* SaveReason.EXPLICIT */ });
            }
            return Promise.resolve(undefined);
        };
    }
    SaveLocalFileCommand.handler = handler;
})(SaveLocalFileCommand || (SaveLocalFileCommand = {}));
export var OpenLocalFolderCommand;
(function (OpenLocalFolderCommand) {
    OpenLocalFolderCommand.ID = 'workbench.action.files.openLocalFolder';
    OpenLocalFolderCommand.LABEL = nls.localize('openLocalFolder', 'Open Local Folder...');
    function handler() {
        return (accessor) => {
            const dialogService = accessor.get(IFileDialogService);
            return dialogService.pickFolderAndOpen({
                forceNewWindow: false,
                availableFileSystems: [Schemas.file],
            });
        };
    }
    OpenLocalFolderCommand.handler = handler;
})(OpenLocalFolderCommand || (OpenLocalFolderCommand = {}));
export var OpenLocalFileFolderCommand;
(function (OpenLocalFileFolderCommand) {
    OpenLocalFileFolderCommand.ID = 'workbench.action.files.openLocalFileFolder';
    OpenLocalFileFolderCommand.LABEL = nls.localize('openLocalFileFolder', 'Open Local...');
    function handler() {
        return (accessor) => {
            const dialogService = accessor.get(IFileDialogService);
            return dialogService.pickFileFolderAndOpen({
                forceNewWindow: false,
                availableFileSystems: [Schemas.file],
            });
        };
    }
    OpenLocalFileFolderCommand.handler = handler;
})(OpenLocalFileFolderCommand || (OpenLocalFileFolderCommand = {}));
var UpdateResult;
(function (UpdateResult) {
    UpdateResult[UpdateResult["Updated"] = 0] = "Updated";
    UpdateResult[UpdateResult["UpdatedWithTrailing"] = 1] = "UpdatedWithTrailing";
    UpdateResult[UpdateResult["Updating"] = 2] = "Updating";
    UpdateResult[UpdateResult["NotUpdated"] = 3] = "NotUpdated";
    UpdateResult[UpdateResult["InvalidPath"] = 4] = "InvalidPath";
})(UpdateResult || (UpdateResult = {}));
export const RemoteFileDialogContext = new RawContextKey('remoteFileDialogVisible', false);
let SimpleFileDialog = class SimpleFileDialog extends Disposable {
    constructor(fileService, quickInputService, labelService, workspaceContextService, notificationService, fileDialogService, modelService, languageService, environmentService, remoteAgentService, pathService, keybindingService, contextKeyService, accessibilityService, storageService) {
        super();
        this.fileService = fileService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.workspaceContextService = workspaceContextService;
        this.notificationService = notificationService;
        this.fileDialogService = fileDialogService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.environmentService = environmentService;
        this.remoteAgentService = remoteAgentService;
        this.pathService = pathService;
        this.keybindingService = keybindingService;
        this.accessibilityService = accessibilityService;
        this.storageService = storageService;
        this.hidden = false;
        this.allowFileSelection = true;
        this.allowFolderSelection = false;
        this.requiresTrailing = false;
        this.userEnteredPathSegment = '';
        this.autoCompletePathSegment = '';
        this.isWindows = false;
        this.separator = '/';
        this.onBusyChangeEmitter = this._register(new Emitter());
        this._showDotFiles = true;
        this.remoteAuthority = this.environmentService.remoteAuthority;
        this.contextKey = RemoteFileDialogContext.bindTo(contextKeyService);
        this.scheme = this.pathService.defaultUriScheme;
        this.getShowDotFiles();
        const disposableStore = this._register(new DisposableStore());
        this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, 'remoteFileDialog.showDotFiles', disposableStore)(async (_) => {
            this.getShowDotFiles();
            this.setButtons();
            const startingValue = this.filePickBox.value;
            const folderValue = this.pathFromUri(this.currentFolder, true);
            this.filePickBox.value = folderValue;
            await this.tryUpdateItems(folderValue, this.currentFolder, true);
            this.filePickBox.value = startingValue;
        });
    }
    setShowDotFiles(showDotFiles) {
        this.storageService.store('remoteFileDialog.showDotFiles', showDotFiles, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    getShowDotFiles() {
        this._showDotFiles = this.storageService.getBoolean('remoteFileDialog.showDotFiles', 1 /* StorageScope.WORKSPACE */, true);
    }
    set busy(busy) {
        if (this.filePickBox.busy !== busy) {
            this.filePickBox.busy = busy;
            this.onBusyChangeEmitter.fire(busy);
        }
    }
    get busy() {
        return this.filePickBox.busy;
    }
    async showOpenDialog(options = {}) {
        this.scheme = this.getScheme(options.availableFileSystems, options.defaultUri);
        this.userHome = await this.getUserHome();
        this.trueHome = await this.getUserHome(true);
        const newOptions = this.getOptions(options);
        if (!newOptions) {
            return Promise.resolve(undefined);
        }
        this.options = newOptions;
        return this.pickResource();
    }
    async showSaveDialog(options) {
        this.scheme = this.getScheme(options.availableFileSystems, options.defaultUri);
        this.userHome = await this.getUserHome();
        this.trueHome = await this.getUserHome(true);
        this.requiresTrailing = true;
        const newOptions = this.getOptions(options, true);
        if (!newOptions) {
            return Promise.resolve(undefined);
        }
        this.options = newOptions;
        this.options.canSelectFolders = true;
        this.options.canSelectFiles = true;
        return new Promise((resolve) => {
            this.pickResource(true).then((folderUri) => {
                resolve(folderUri);
            });
        });
    }
    getOptions(options, isSave = false) {
        let defaultUri = undefined;
        let filename = undefined;
        if (options.defaultUri) {
            defaultUri = this.scheme === options.defaultUri.scheme ? options.defaultUri : undefined;
            filename = isSave ? resources.basename(options.defaultUri) : undefined;
        }
        if (!defaultUri) {
            defaultUri = this.userHome;
            if (filename) {
                defaultUri = resources.joinPath(defaultUri, filename);
            }
        }
        if (this.scheme !== Schemas.file && !this.fileService.hasProvider(defaultUri)) {
            this.notificationService.info(nls.localize('remoteFileDialog.notConnectedToRemote', 'File system provider for {0} is not available.', defaultUri.toString()));
            return undefined;
        }
        const newOptions = objects.deepClone(options);
        newOptions.defaultUri = defaultUri;
        return newOptions;
    }
    remoteUriFrom(path, hintUri) {
        if (!path.startsWith('\\\\')) {
            path = path.replace(/\\/g, '/');
        }
        const uri = this.scheme === Schemas.file
            ? URI.file(path)
            : URI.from({
                scheme: this.scheme,
                path,
                query: hintUri?.query,
                fragment: hintUri?.fragment,
            });
        // If the default scheme is file, then we don't care about the remote authority or the hint authority
        const authority = uri.scheme === Schemas.file ? undefined : (this.remoteAuthority ?? hintUri?.authority);
        return resources.toLocalResource(uri, authority, 
        // If there is a remote authority, then we should use the system's default URI as the local scheme.
        // If there is *no* remote authority, then we should use the default scheme for this dialog as that is already local.
        authority ? this.pathService.defaultUriScheme : uri.scheme);
    }
    getScheme(available, defaultUri) {
        if (available && available.length > 0) {
            if (defaultUri && available.indexOf(defaultUri.scheme) >= 0) {
                return defaultUri.scheme;
            }
            return available[0];
        }
        else if (defaultUri) {
            return defaultUri.scheme;
        }
        return Schemas.file;
    }
    async getRemoteAgentEnvironment() {
        if (this.remoteAgentEnvironment === undefined) {
            this.remoteAgentEnvironment = await this.remoteAgentService.getEnvironment();
        }
        return this.remoteAgentEnvironment;
    }
    getUserHome(trueHome = false) {
        return trueHome
            ? this.pathService.userHome({ preferLocal: this.scheme === Schemas.file })
            : this.fileDialogService.preferredHome(this.scheme);
    }
    async pickResource(isSave = false) {
        this.allowFolderSelection = !!this.options.canSelectFolders;
        this.allowFileSelection = !!this.options.canSelectFiles;
        this.separator = this.labelService.getSeparator(this.scheme, this.remoteAuthority);
        this.hidden = false;
        this.isWindows = await this.checkIsWindowsOS();
        let homedir = this.options.defaultUri
            ? this.options.defaultUri
            : this.workspaceContextService.getWorkspace().folders[0].uri;
        let stat;
        const ext = resources.extname(homedir);
        if (this.options.defaultUri) {
            try {
                stat = await this.fileService.stat(this.options.defaultUri);
            }
            catch (e) {
                // The file or folder doesn't exist
            }
            if (!stat || !stat.isDirectory) {
                homedir = resources.dirname(this.options.defaultUri);
                this.trailing = resources.basename(this.options.defaultUri);
            }
        }
        return new Promise((resolve) => {
            this.filePickBox = this._register(this.quickInputService.createQuickPick());
            this.busy = true;
            this.filePickBox.matchOnLabel = false;
            this.filePickBox.sortByLabel = false;
            this.filePickBox.ignoreFocusOut = true;
            this.filePickBox.ok = true;
            this.filePickBox.okLabel =
                typeof this.options.openLabel === 'string'
                    ? this.options.openLabel
                    : this.options.openLabel?.withoutMnemonic;
            if (this.scheme !== Schemas.file &&
                this.options &&
                this.options.availableFileSystems &&
                this.options.availableFileSystems.length > 1 &&
                this.options.availableFileSystems.indexOf(Schemas.file) > -1) {
                this.filePickBox.customButton = true;
                this.filePickBox.customLabel = nls.localize('remoteFileDialog.local', 'Show Local');
                let action;
                if (isSave) {
                    action = SaveLocalFileCommand;
                }
                else {
                    action = this.allowFileSelection
                        ? this.allowFolderSelection
                            ? OpenLocalFileFolderCommand
                            : OpenLocalFileCommand
                        : OpenLocalFolderCommand;
                }
                const keybinding = this.keybindingService.lookupKeybinding(action.ID);
                if (keybinding) {
                    const label = keybinding.getLabel();
                    if (label) {
                        this.filePickBox.customHover = format('{0} ({1})', action.LABEL, label);
                    }
                }
            }
            this.setButtons();
            this._register(this.filePickBox.onDidTriggerButton((e) => {
                this.setShowDotFiles(!this._showDotFiles);
            }));
            let isResolving = 0;
            let isAcceptHandled = false;
            this.currentFolder = resources.dirname(homedir);
            this.userEnteredPathSegment = '';
            this.autoCompletePathSegment = '';
            this.filePickBox.title = this.options.title;
            this.filePickBox.value = this.pathFromUri(this.currentFolder, true);
            this.filePickBox.valueSelection = [
                this.filePickBox.value.length,
                this.filePickBox.value.length,
            ];
            const doResolve = (uri) => {
                if (uri) {
                    uri = resources.addTrailingPathSeparator(uri, this.separator); // Ensures that c: is c:/ since this comes from user input and can be incorrect.
                    // To be consistent, we should never have a trailing path separator on directories (or anything else). Will not remove from c:/.
                    uri = resources.removeTrailingPathSeparator(uri);
                }
                resolve(uri);
                this.contextKey.set(false);
                this.dispose();
            };
            this._register(this.filePickBox.onDidCustom(() => {
                if (isAcceptHandled || this.busy) {
                    return;
                }
                isAcceptHandled = true;
                isResolving++;
                if (this.options.availableFileSystems && this.options.availableFileSystems.length > 1) {
                    this.options.availableFileSystems = this.options.availableFileSystems.slice(1);
                }
                this.filePickBox.hide();
                if (isSave) {
                    return this.fileDialogService.showSaveDialog(this.options).then((result) => {
                        doResolve(result);
                    });
                }
                else {
                    return this.fileDialogService.showOpenDialog(this.options).then((result) => {
                        doResolve(result ? result[0] : undefined);
                    });
                }
            }));
            const handleAccept = () => {
                if (this.busy) {
                    // Save the accept until the file picker is not busy.
                    this.onBusyChangeEmitter.event((busy) => {
                        if (!busy) {
                            handleAccept();
                        }
                    });
                    return;
                }
                else if (isAcceptHandled) {
                    return;
                }
                isAcceptHandled = true;
                isResolving++;
                this.onDidAccept().then((resolveValue) => {
                    if (resolveValue) {
                        this.filePickBox.hide();
                        doResolve(resolveValue);
                    }
                    else if (this.hidden) {
                        doResolve(undefined);
                    }
                    else {
                        isResolving--;
                        isAcceptHandled = false;
                    }
                });
            };
            this._register(this.filePickBox.onDidAccept((_) => {
                handleAccept();
            }));
            this._register(this.filePickBox.onDidChangeActive((i) => {
                isAcceptHandled = false;
                // update input box to match the first selected item
                if (i.length === 1 && this.isSelectionChangeFromUser()) {
                    this.filePickBox.validationMessage = undefined;
                    const userPath = this.constructFullUserPath();
                    if (!equalsIgnoreCase(this.filePickBox.value.substring(0, userPath.length), userPath)) {
                        this.filePickBox.valueSelection = [0, this.filePickBox.value.length];
                        this.insertText(userPath, userPath);
                    }
                    this.setAutoComplete(userPath, this.userEnteredPathSegment, i[0], true);
                }
            }));
            this._register(this.filePickBox.onDidChangeValue(async (value) => {
                return this.handleValueChange(value);
            }));
            this._register(this.filePickBox.onDidHide(() => {
                this.hidden = true;
                if (isResolving === 0) {
                    doResolve(undefined);
                }
            }));
            this.filePickBox.show();
            this.contextKey.set(true);
            this.updateItems(homedir, true, this.trailing).then(() => {
                if (this.trailing) {
                    this.filePickBox.valueSelection = [
                        this.filePickBox.value.length - this.trailing.length,
                        this.filePickBox.value.length - ext.length,
                    ];
                }
                else {
                    this.filePickBox.valueSelection = [
                        this.filePickBox.value.length,
                        this.filePickBox.value.length,
                    ];
                }
                this.busy = false;
            });
        });
    }
    dispose() {
        super.dispose();
    }
    async handleValueChange(value) {
        try {
            // onDidChangeValue can also be triggered by the auto complete, so if it looks like the auto complete, don't do anything
            if (this.isValueChangeFromUser()) {
                // If the user has just entered more bad path, don't change anything
                if (!equalsIgnoreCase(value, this.constructFullUserPath()) &&
                    (!this.isBadSubpath(value) || this.canTildaEscapeHatch(value))) {
                    this.filePickBox.validationMessage = undefined;
                    const filePickBoxUri = this.filePickBoxValue();
                    let updated = UpdateResult.NotUpdated;
                    if (!resources.extUriIgnorePathCase.isEqual(this.currentFolder, filePickBoxUri)) {
                        updated = await this.tryUpdateItems(value, filePickBoxUri);
                    }
                    if (updated === UpdateResult.NotUpdated || updated === UpdateResult.UpdatedWithTrailing) {
                        this.setActiveItems(value);
                    }
                }
                else {
                    this.filePickBox.activeItems = [];
                    this.userEnteredPathSegment = '';
                }
            }
        }
        catch {
            // Since any text can be entered in the input box, there is potential for error causing input. If this happens, do nothing.
        }
    }
    setButtons() {
        this.filePickBox.buttons = [
            {
                iconClass: this._showDotFiles
                    ? ThemeIcon.asClassName(Codicon.eye)
                    : ThemeIcon.asClassName(Codicon.eyeClosed),
                tooltip: this._showDotFiles
                    ? nls.localize('remoteFileDialog.hideDotFiles', 'Hide dot files')
                    : nls.localize('remoteFileDialog.showDotFiles', 'Show dot files'),
                alwaysVisible: true,
            },
        ];
    }
    isBadSubpath(value) {
        return (this.badPath &&
            value.length > this.badPath.length &&
            equalsIgnoreCase(value.substring(0, this.badPath.length), this.badPath));
    }
    isValueChangeFromUser() {
        if (equalsIgnoreCase(this.filePickBox.value, this.pathAppend(this.currentFolder, this.userEnteredPathSegment + this.autoCompletePathSegment))) {
            return false;
        }
        return true;
    }
    isSelectionChangeFromUser() {
        if (this.activeItem ===
            (this.filePickBox.activeItems ? this.filePickBox.activeItems[0] : undefined)) {
            return false;
        }
        return true;
    }
    constructFullUserPath() {
        const currentFolderPath = this.pathFromUri(this.currentFolder);
        if (equalsIgnoreCase(this.filePickBox.value.substr(0, this.userEnteredPathSegment.length), this.userEnteredPathSegment)) {
            if (equalsIgnoreCase(this.filePickBox.value.substr(0, currentFolderPath.length), currentFolderPath)) {
                return currentFolderPath;
            }
            else {
                return this.userEnteredPathSegment;
            }
        }
        else {
            return this.pathAppend(this.currentFolder, this.userEnteredPathSegment);
        }
    }
    filePickBoxValue() {
        // The file pick box can't render everything, so we use the current folder to create the uri so that it is an existing path.
        const directUri = this.remoteUriFrom(this.filePickBox.value.trimRight(), this.currentFolder);
        const currentPath = this.pathFromUri(this.currentFolder);
        if (equalsIgnoreCase(this.filePickBox.value, currentPath)) {
            return this.currentFolder;
        }
        const currentDisplayUri = this.remoteUriFrom(currentPath, this.currentFolder);
        const relativePath = resources.relativePath(currentDisplayUri, directUri);
        const isSameRoot = this.filePickBox.value.length > 1 && currentPath.length > 1
            ? equalsIgnoreCase(this.filePickBox.value.substr(0, 2), currentPath.substr(0, 2))
            : false;
        if (relativePath && isSameRoot) {
            let path = resources.joinPath(this.currentFolder, relativePath);
            const directBasename = resources.basename(directUri);
            if (directBasename === '.' || directBasename === '..') {
                path = this.remoteUriFrom(this.pathAppend(path, directBasename), this.currentFolder);
            }
            return resources.hasTrailingPathSeparator(directUri)
                ? resources.addTrailingPathSeparator(path)
                : path;
        }
        else {
            return directUri;
        }
    }
    async onDidAccept() {
        this.busy = true;
        if (!this.updatingPromise && this.filePickBox.activeItems.length === 1) {
            const item = this.filePickBox.selectedItems[0];
            if (item.isFolder) {
                if (this.trailing) {
                    await this.updateItems(item.uri, true, this.trailing);
                }
                else {
                    // When possible, cause the update to happen by modifying the input box.
                    // This allows all input box updates to happen first, and uses the same code path as the user typing.
                    const newPath = this.pathFromUri(item.uri);
                    if (startsWithIgnoreCase(newPath, this.filePickBox.value) &&
                        equalsIgnoreCase(item.label, resources.basename(item.uri))) {
                        this.filePickBox.valueSelection = [
                            this.pathFromUri(this.currentFolder).length,
                            this.filePickBox.value.length,
                        ];
                        this.insertText(newPath, this.basenameWithTrailingSlash(item.uri));
                    }
                    else if (item.label === '..' && startsWithIgnoreCase(this.filePickBox.value, newPath)) {
                        this.filePickBox.valueSelection = [newPath.length, this.filePickBox.value.length];
                        this.insertText(newPath, '');
                    }
                    else {
                        await this.updateItems(item.uri, true);
                    }
                }
                this.filePickBox.busy = false;
                return;
            }
        }
        else if (!this.updatingPromise) {
            // If the items have updated, don't try to resolve
            if ((await this.tryUpdateItems(this.filePickBox.value, this.filePickBoxValue())) !==
                UpdateResult.NotUpdated) {
                this.filePickBox.busy = false;
                return;
            }
        }
        let resolveValue;
        // Find resolve value
        if (this.filePickBox.activeItems.length === 0) {
            resolveValue = this.filePickBoxValue();
        }
        else if (this.filePickBox.activeItems.length === 1) {
            resolveValue = this.filePickBox.selectedItems[0].uri;
        }
        if (resolveValue) {
            resolveValue = this.addPostfix(resolveValue);
        }
        if (await this.validate(resolveValue)) {
            this.busy = false;
            return resolveValue;
        }
        this.busy = false;
        return undefined;
    }
    root(value) {
        let lastDir = value;
        let dir = resources.dirname(value);
        while (!resources.isEqual(lastDir, dir)) {
            lastDir = dir;
            dir = resources.dirname(dir);
        }
        return dir;
    }
    canTildaEscapeHatch(value) {
        return !!(value.endsWith('~') && this.isBadSubpath(value));
    }
    tildaReplace(value) {
        const home = this.trueHome;
        if (value.length > 0 && value[0] === '~') {
            return resources.joinPath(home, value.substring(1));
        }
        else if (this.canTildaEscapeHatch(value)) {
            return home;
        }
        return this.remoteUriFrom(value);
    }
    tryAddTrailingSeparatorToDirectory(uri, stat) {
        if (stat.isDirectory) {
            // At this point we know it's a directory and can add the trailing path separator
            if (!this.endsWithSlash(uri.path)) {
                return resources.addTrailingPathSeparator(uri);
            }
        }
        return uri;
    }
    async tryUpdateItems(value, valueUri, reset = false) {
        if (value.length > 0 && (value[0] === '~' || this.canTildaEscapeHatch(value))) {
            const newDir = this.tildaReplace(value);
            return (await this.updateItems(newDir, true))
                ? UpdateResult.UpdatedWithTrailing
                : UpdateResult.Updated;
        }
        else if (value === '\\') {
            valueUri = this.root(this.currentFolder);
            value = this.pathFromUri(valueUri);
            return (await this.updateItems(valueUri, true))
                ? UpdateResult.UpdatedWithTrailing
                : UpdateResult.Updated;
        }
        else {
            const newFolderIsOldFolder = resources.extUriIgnorePathCase.isEqual(this.currentFolder, valueUri);
            const newFolderIsSubFolder = resources.extUriIgnorePathCase.isEqual(this.currentFolder, resources.dirname(valueUri));
            const newFolderIsParent = resources.extUriIgnorePathCase.isEqualOrParent(this.currentFolder, resources.dirname(valueUri));
            const newFolderIsUnrelated = !newFolderIsParent && !newFolderIsSubFolder;
            if ((!newFolderIsOldFolder &&
                (this.endsWithSlash(value) || newFolderIsParent || newFolderIsUnrelated)) ||
                reset) {
                let stat;
                try {
                    stat = await this.fileService.stat(valueUri);
                }
                catch (e) {
                    // do nothing
                }
                if (stat &&
                    stat.isDirectory &&
                    resources.basename(valueUri) !== '.' &&
                    this.endsWithSlash(value)) {
                    valueUri = this.tryAddTrailingSeparatorToDirectory(valueUri, stat);
                    return (await this.updateItems(valueUri))
                        ? UpdateResult.UpdatedWithTrailing
                        : UpdateResult.Updated;
                }
                else if (this.endsWithSlash(value)) {
                    // The input box contains a path that doesn't exist on the system.
                    this.filePickBox.validationMessage = nls.localize('remoteFileDialog.badPath', 'The path does not exist. Use ~ to go to your home directory.');
                    // Save this bad path. It can take too long to a stat on every user entered character, but once a user enters a bad path they are likely
                    // to keep typing more bad path. We can compare against this bad path and see if the user entered path starts with it.
                    this.badPath = value;
                    return UpdateResult.InvalidPath;
                }
                else {
                    let inputUriDirname = resources.dirname(valueUri);
                    const currentFolderWithoutSep = resources.removeTrailingPathSeparator(resources.addTrailingPathSeparator(this.currentFolder));
                    const inputUriDirnameWithoutSep = resources.removeTrailingPathSeparator(resources.addTrailingPathSeparator(inputUriDirname));
                    if (!resources.extUriIgnorePathCase.isEqual(currentFolderWithoutSep, inputUriDirnameWithoutSep) &&
                        (!/^[a-zA-Z]:$/.test(this.filePickBox.value) ||
                            !equalsIgnoreCase(this.pathFromUri(this.currentFolder).substring(0, this.filePickBox.value.length), this.filePickBox.value))) {
                        let statWithoutTrailing;
                        try {
                            statWithoutTrailing = await this.fileService.stat(inputUriDirname);
                        }
                        catch (e) {
                            // do nothing
                        }
                        if (statWithoutTrailing && statWithoutTrailing.isDirectory) {
                            this.badPath = undefined;
                            inputUriDirname = this.tryAddTrailingSeparatorToDirectory(inputUriDirname, statWithoutTrailing);
                            return (await this.updateItems(inputUriDirname, false, resources.basename(valueUri)))
                                ? UpdateResult.UpdatedWithTrailing
                                : UpdateResult.Updated;
                        }
                    }
                }
            }
        }
        this.badPath = undefined;
        return UpdateResult.NotUpdated;
    }
    tryUpdateTrailing(value) {
        const ext = resources.extname(value);
        if (this.trailing && ext) {
            this.trailing = resources.basename(value);
        }
    }
    setActiveItems(value) {
        value = this.pathFromUri(this.tildaReplace(value));
        const asUri = this.remoteUriFrom(value);
        const inputBasename = resources.basename(asUri);
        const userPath = this.constructFullUserPath();
        // Make sure that the folder whose children we are currently viewing matches the path in the input
        const pathsEqual = equalsIgnoreCase(userPath, value.substring(0, userPath.length)) ||
            equalsIgnoreCase(value, userPath.substring(0, value.length));
        if (pathsEqual) {
            let hasMatch = false;
            for (let i = 0; i < this.filePickBox.items.length; i++) {
                const item = this.filePickBox.items[i];
                if (this.setAutoComplete(value, inputBasename, item)) {
                    hasMatch = true;
                    break;
                }
            }
            if (!hasMatch) {
                const userBasename = inputBasename.length >= 2
                    ? userPath.substring(userPath.length - inputBasename.length + 2)
                    : '';
                this.userEnteredPathSegment = userBasename === inputBasename ? inputBasename : '';
                this.autoCompletePathSegment = '';
                this.filePickBox.activeItems = [];
                this.tryUpdateTrailing(asUri);
            }
        }
        else {
            this.userEnteredPathSegment = inputBasename;
            this.autoCompletePathSegment = '';
            this.filePickBox.activeItems = [];
            this.tryUpdateTrailing(asUri);
        }
    }
    setAutoComplete(startingValue, startingBasename, quickPickItem, force = false) {
        if (this.busy) {
            // We're in the middle of something else. Doing an auto complete now can result jumbled or incorrect autocompletes.
            this.userEnteredPathSegment = startingBasename;
            this.autoCompletePathSegment = '';
            return false;
        }
        const itemBasename = quickPickItem.label;
        // Either force the autocomplete, or the old value should be one smaller than the new value and match the new value.
        if (itemBasename === '..') {
            // Don't match on the up directory item ever.
            this.userEnteredPathSegment = '';
            this.autoCompletePathSegment = '';
            this.activeItem = quickPickItem;
            if (force) {
                // clear any selected text
                getActiveDocument().execCommand('insertText', false, '');
            }
            return false;
        }
        else if (!force &&
            itemBasename.length >= startingBasename.length &&
            equalsIgnoreCase(itemBasename.substr(0, startingBasename.length), startingBasename)) {
            this.userEnteredPathSegment = startingBasename;
            this.activeItem = quickPickItem;
            // Changing the active items will trigger the onDidActiveItemsChanged. Clear the autocomplete first, then set it after.
            this.autoCompletePathSegment = '';
            if (quickPickItem.isFolder || !this.trailing) {
                this.filePickBox.activeItems = [quickPickItem];
            }
            else {
                this.filePickBox.activeItems = [];
            }
            return true;
        }
        else if (force &&
            !equalsIgnoreCase(this.basenameWithTrailingSlash(quickPickItem.uri), this.userEnteredPathSegment + this.autoCompletePathSegment)) {
            this.userEnteredPathSegment = '';
            if (!this.accessibilityService.isScreenReaderOptimized()) {
                this.autoCompletePathSegment = this.trimTrailingSlash(itemBasename);
            }
            this.activeItem = quickPickItem;
            if (!this.accessibilityService.isScreenReaderOptimized()) {
                this.filePickBox.valueSelection = [
                    this.pathFromUri(this.currentFolder, true).length,
                    this.filePickBox.value.length,
                ];
                // use insert text to preserve undo buffer
                this.insertText(this.pathAppend(this.currentFolder, this.autoCompletePathSegment), this.autoCompletePathSegment);
                this.filePickBox.valueSelection = [
                    this.filePickBox.value.length - this.autoCompletePathSegment.length,
                    this.filePickBox.value.length,
                ];
            }
            return true;
        }
        else {
            this.userEnteredPathSegment = startingBasename;
            this.autoCompletePathSegment = '';
            return false;
        }
    }
    insertText(wholeValue, insertText) {
        if (this.filePickBox.inputHasFocus()) {
            getActiveDocument().execCommand('insertText', false, insertText);
            if (this.filePickBox.value !== wholeValue) {
                this.filePickBox.value = wholeValue;
                this.handleValueChange(wholeValue);
            }
        }
        else {
            this.filePickBox.value = wholeValue;
            this.handleValueChange(wholeValue);
        }
    }
    addPostfix(uri) {
        let result = uri;
        if (this.requiresTrailing &&
            this.options.filters &&
            this.options.filters.length > 0 &&
            !resources.hasTrailingPathSeparator(uri)) {
            // Make sure that the suffix is added. If the user deleted it, we automatically add it here
            let hasExt = false;
            const currentExt = resources.extname(uri).substr(1);
            for (let i = 0; i < this.options.filters.length; i++) {
                for (let j = 0; j < this.options.filters[i].extensions.length; j++) {
                    if (this.options.filters[i].extensions[j] === '*' ||
                        this.options.filters[i].extensions[j] === currentExt) {
                        hasExt = true;
                        break;
                    }
                }
                if (hasExt) {
                    break;
                }
            }
            if (!hasExt) {
                result = resources.joinPath(resources.dirname(uri), resources.basename(uri) + '.' + this.options.filters[0].extensions[0]);
            }
        }
        return result;
    }
    trimTrailingSlash(path) {
        return path.length > 1 && this.endsWithSlash(path) ? path.substr(0, path.length - 1) : path;
    }
    yesNoPrompt(uri, message) {
        const disposableStore = new DisposableStore();
        const prompt = disposableStore.add(this.quickInputService.createQuickPick());
        prompt.title = message;
        prompt.ignoreFocusOut = true;
        prompt.ok = true;
        prompt.customButton = true;
        prompt.customLabel = nls.localize('remoteFileDialog.cancel', 'Cancel');
        prompt.value = this.pathFromUri(uri);
        let isResolving = false;
        return new Promise((resolve) => {
            disposableStore.add(prompt.onDidAccept(() => {
                isResolving = true;
                prompt.hide();
                resolve(true);
            }));
            disposableStore.add(prompt.onDidHide(() => {
                if (!isResolving) {
                    resolve(false);
                }
                this.filePickBox.show();
                this.hidden = false;
                disposableStore.dispose();
            }));
            disposableStore.add(prompt.onDidChangeValue(() => {
                prompt.hide();
            }));
            disposableStore.add(prompt.onDidCustom(() => {
                prompt.hide();
            }));
            prompt.show();
        });
    }
    async validate(uri) {
        if (uri === undefined) {
            this.filePickBox.validationMessage = nls.localize('remoteFileDialog.invalidPath', 'Please enter a valid path.');
            return Promise.resolve(false);
        }
        let stat;
        let statDirname;
        try {
            statDirname = await this.fileService.stat(resources.dirname(uri));
            stat = await this.fileService.stat(uri);
        }
        catch (e) {
            // do nothing
        }
        if (this.requiresTrailing) {
            // save
            if (stat && stat.isDirectory) {
                // Can't do this
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateFolder', 'The folder already exists. Please use a new file name.');
                return Promise.resolve(false);
            }
            else if (stat) {
                // Replacing a file.
                // Show a yes/no prompt
                const message = nls.localize('remoteFileDialog.validateExisting', '{0} already exists. Are you sure you want to overwrite it?', resources.basename(uri));
                return this.yesNoPrompt(uri, message);
            }
            else if (!isValidBasename(resources.basename(uri), this.isWindows)) {
                // Filename not allowed
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateBadFilename', 'Please enter a valid file name.');
                return Promise.resolve(false);
            }
            else if (!statDirname) {
                // Folder to save in doesn't exist
                const message = nls.localize('remoteFileDialog.validateCreateDirectory', 'The folder {0} does not exist. Would you like to create it?', resources.basename(resources.dirname(uri)));
                return this.yesNoPrompt(uri, message);
            }
            else if (!statDirname.isDirectory) {
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateNonexistentDir', 'Please enter a path that exists.');
                return Promise.resolve(false);
            }
            else if (statDirname.readonly) {
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateReadonlyFolder', 'This folder cannot be used as a save destination. Please choose another folder');
                return Promise.resolve(false);
            }
        }
        else {
            // open
            if (!stat) {
                // File or folder doesn't exist
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateNonexistentDir', 'Please enter a path that exists.');
                return Promise.resolve(false);
            }
            else if (uri.path === '/' && this.isWindows) {
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.windowsDriveLetter', 'Please start the path with a drive letter.');
                return Promise.resolve(false);
            }
            else if (stat.isDirectory && !this.allowFolderSelection) {
                // Folder selected when folder selection not permitted
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateFileOnly', 'Please select a file.');
                return Promise.resolve(false);
            }
            else if (!stat.isDirectory && !this.allowFileSelection) {
                // File selected when file selection not permitted
                this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateFolderOnly', 'Please select a folder.');
                return Promise.resolve(false);
            }
        }
        return Promise.resolve(true);
    }
    // Returns true if there is a file at the end of the URI.
    async updateItems(newFolder, force = false, trailing) {
        this.busy = true;
        this.autoCompletePathSegment = '';
        const wasDotDot = trailing === '..';
        trailing = wasDotDot ? undefined : trailing;
        const isSave = !!trailing;
        let result = false;
        const updatingPromise = createCancelablePromise(async (token) => {
            let folderStat;
            try {
                folderStat = await this.fileService.resolve(newFolder);
                if (!folderStat.isDirectory) {
                    trailing = resources.basename(newFolder);
                    newFolder = resources.dirname(newFolder);
                    folderStat = undefined;
                    result = true;
                }
            }
            catch (e) {
                // The file/directory doesn't exist
            }
            const newValue = trailing
                ? this.pathAppend(newFolder, trailing)
                : this.pathFromUri(newFolder, true);
            this.currentFolder = this.endsWithSlash(newFolder.path)
                ? newFolder
                : resources.addTrailingPathSeparator(newFolder, this.separator);
            this.userEnteredPathSegment = trailing ? trailing : '';
            return this.createItems(folderStat, this.currentFolder, token).then((items) => {
                if (token.isCancellationRequested) {
                    this.busy = false;
                    return false;
                }
                this.filePickBox.itemActivation = ItemActivation.NONE;
                this.filePickBox.items = items;
                // the user might have continued typing while we were updating. Only update the input box if it doesn't match the directory.
                if (!equalsIgnoreCase(this.filePickBox.value, newValue) && (force || wasDotDot)) {
                    this.filePickBox.valueSelection = [0, this.filePickBox.value.length];
                    this.insertText(newValue, newValue);
                }
                if (force && trailing && isSave) {
                    // Keep the cursor position in front of the save as name.
                    this.filePickBox.valueSelection = [
                        this.filePickBox.value.length - trailing.length,
                        this.filePickBox.value.length - trailing.length,
                    ];
                }
                else if (!trailing) {
                    // If there is trailing, we don't move the cursor. If there is no trailing, cursor goes at the end.
                    this.filePickBox.valueSelection = [
                        this.filePickBox.value.length,
                        this.filePickBox.value.length,
                    ];
                }
                this.busy = false;
                this.updatingPromise = undefined;
                return result;
            });
        });
        if (this.updatingPromise !== undefined) {
            this.updatingPromise.cancel();
        }
        this.updatingPromise = updatingPromise;
        return updatingPromise;
    }
    pathFromUri(uri, endWithSeparator = false) {
        let result = normalizeDriveLetter(uri.fsPath, this.isWindows).replace(/\n/g, '');
        if (this.separator === '/') {
            result = result.replace(/\\/g, this.separator);
        }
        else {
            result = result.replace(/\//g, this.separator);
        }
        if (endWithSeparator && !this.endsWithSlash(result)) {
            result = result + this.separator;
        }
        return result;
    }
    pathAppend(uri, additional) {
        if (additional === '..' || additional === '.') {
            const basePath = this.pathFromUri(uri, true);
            return basePath + additional;
        }
        else {
            return this.pathFromUri(resources.joinPath(uri, additional));
        }
    }
    async checkIsWindowsOS() {
        let isWindowsOS = isWindows;
        const env = await this.getRemoteAgentEnvironment();
        if (env) {
            isWindowsOS = env.os === 1 /* OperatingSystem.Windows */;
        }
        return isWindowsOS;
    }
    endsWithSlash(s) {
        return /[\/\\]$/.test(s);
    }
    basenameWithTrailingSlash(fullPath) {
        const child = this.pathFromUri(fullPath, true);
        const parent = this.pathFromUri(resources.dirname(fullPath), true);
        return child.substring(parent.length);
    }
    async createBackItem(currFolder) {
        const fileRepresentationCurr = this.currentFolder.with({ scheme: Schemas.file, authority: '' });
        const fileRepresentationParent = resources.dirname(fileRepresentationCurr);
        if (!resources.isEqual(fileRepresentationCurr, fileRepresentationParent)) {
            const parentFolder = resources.dirname(currFolder);
            if (await this.fileService.exists(parentFolder)) {
                return {
                    label: '..',
                    uri: resources.addTrailingPathSeparator(parentFolder, this.separator),
                    isFolder: true,
                };
            }
        }
        return undefined;
    }
    async createItems(folder, currentFolder, token) {
        const result = [];
        const backDir = await this.createBackItem(currentFolder);
        try {
            if (!folder) {
                folder = await this.fileService.resolve(currentFolder);
            }
            const filteredChildren = this._showDotFiles
                ? folder.children
                : folder.children?.filter((child) => !child.name.startsWith('.'));
            const items = filteredChildren
                ? await Promise.all(filteredChildren.map((child) => this.createItem(child, currentFolder, token)))
                : [];
            for (const item of items) {
                if (item) {
                    result.push(item);
                }
            }
        }
        catch (e) {
            // ignore
            console.log(e);
        }
        if (token.isCancellationRequested) {
            return [];
        }
        const sorted = result.sort((i1, i2) => {
            if (i1.isFolder !== i2.isFolder) {
                return i1.isFolder ? -1 : 1;
            }
            const trimmed1 = this.endsWithSlash(i1.label)
                ? i1.label.substr(0, i1.label.length - 1)
                : i1.label;
            const trimmed2 = this.endsWithSlash(i2.label)
                ? i2.label.substr(0, i2.label.length - 1)
                : i2.label;
            return trimmed1.localeCompare(trimmed2);
        });
        if (backDir) {
            sorted.unshift(backDir);
        }
        return sorted;
    }
    filterFile(file) {
        if (this.options.filters) {
            for (let i = 0; i < this.options.filters.length; i++) {
                for (let j = 0; j < this.options.filters[i].extensions.length; j++) {
                    const testExt = this.options.filters[i].extensions[j];
                    if (testExt === '*' || file.path.endsWith('.' + testExt)) {
                        return true;
                    }
                }
            }
            return false;
        }
        return true;
    }
    async createItem(stat, parent, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        let fullPath = resources.joinPath(parent, stat.name);
        if (stat.isDirectory) {
            const filename = resources.basename(fullPath);
            fullPath = resources.addTrailingPathSeparator(fullPath, this.separator);
            return {
                label: filename,
                uri: fullPath,
                isFolder: true,
                iconClasses: getIconClasses(this.modelService, this.languageService, fullPath || undefined, FileKind.FOLDER),
            };
        }
        else if (!stat.isDirectory && this.allowFileSelection && this.filterFile(fullPath)) {
            return {
                label: stat.name,
                uri: fullPath,
                isFolder: false,
                iconClasses: getIconClasses(this.modelService, this.languageService, fullPath || undefined),
            };
        }
        return undefined;
    }
};
SimpleFileDialog = __decorate([
    __param(0, IFileService),
    __param(1, IQuickInputService),
    __param(2, ILabelService),
    __param(3, IWorkspaceContextService),
    __param(4, INotificationService),
    __param(5, IFileDialogService),
    __param(6, IModelService),
    __param(7, ILanguageService),
    __param(8, IWorkbenchEnvironmentService),
    __param(9, IRemoteAgentService),
    __param(10, IPathService),
    __param(11, IKeybindingService),
    __param(12, IContextKeyService),
    __param(13, IAccessibilityService),
    __param(14, IStorageService)
], SimpleFileDialog);
export { SimpleFileDialog };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRmlsZURpYWxvZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL2Jyb3dzZXIvc2ltcGxlRmlsZURpYWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sWUFBWSxFQUVaLFFBQVEsR0FFUixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDaEYsT0FBTyxFQUdOLGtCQUFrQixHQUNsQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUs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