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
import * as fs from 'fs';
import { app, BrowserWindow, shell } from 'electron';
import { addUNCHostToAllowlist } from '../../../base/node/unc.js';
import { hostname, release, arch } from 'os';
import { coalesce, distinct } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { isWindowsDriveLetter, parseLineAndColumnAware, sanitizeFilePath, toSlashes, } from '../../../base/common/extpath.js';
import { getPathLabel } from '../../../base/common/labels.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, join, normalize, posix } from '../../../base/common/path.js';
import { getMarks, mark } from '../../../base/common/performance.js';
import { isMacintosh, isWindows, OS } from '../../../base/common/platform.js';
import { cwd } from '../../../base/common/process.js';
import { extUriBiasedIgnorePathCase, isEqualAuthority, normalizePath, originalFSPath, removeTrailingPathSeparator, } from '../../../base/common/resources.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { getNLSLanguage, getNLSMessages, localize } from '../../../nls.js';
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { FileType, IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import product from '../../product/common/product.js';
import { IProtocolMainService } from '../../protocol/electron-main/protocol.js';
import { getRemoteAuthority } from '../../remote/common/remoteHosts.js';
import { IStateService } from '../../state/node/state.js';
import { isFileToOpen, isFolderToOpen, isWorkspaceToOpen, } from '../../window/common/window.js';
import { CodeWindow } from './windowImpl.js';
import { getLastFocused, } from './windows.js';
import { findWindowOnExtensionDevelopmentPath, findWindowOnFile, findWindowOnWorkspaceOrFolder, } from './windowsFinder.js';
import { WindowsStateHandler } from './windowsStateHandler.js';
import { hasWorkspaceFileExtension, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier, } from '../../workspace/common/workspace.js';
import { createEmptyWorkspaceIdentifier, getSingleFolderWorkspaceIdentifier, getWorkspaceIdentifier, } from '../../workspaces/node/workspaces.js';
import { IWorkspacesHistoryMainService } from '../../workspaces/electron-main/workspacesHistoryMainService.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { ILoggerMainService } from '../../log/electron-main/loggerService.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { ICSSDevelopmentService } from '../../cssDev/node/cssDevService.js';
import { ResourceSet } from '../../../base/common/map.js';
const EMPTY_WINDOW = Object.create(null);
function isWorkspacePathToOpen(path) {
    return isWorkspaceIdentifier(path?.workspace);
}
function isSingleFolderWorkspacePathToOpen(path) {
    return isSingleFolderWorkspaceIdentifier(path?.workspace);
}
//#endregion
let WindowsMainService = class WindowsMainService extends Disposable {
    constructor(machineId, sqmId, devDeviceId, initialUserEnv, logService, loggerService, stateService, policyService, environmentMainService, userDataProfilesMainService, lifecycleMainService, backupMainService, configurationService, workspacesHistoryMainService, workspacesManagementMainService, instantiationService, dialogMainService, fileService, protocolMainService, themeMainService, auxiliaryWindowsMainService, cssDevelopmentService) {
        super();
        this.machineId = machineId;
        this.sqmId = sqmId;
        this.devDeviceId = devDeviceId;
        this.initialUserEnv = initialUserEnv;
        this.logService = logService;
        this.loggerService = loggerService;
        this.policyService = policyService;
        this.environmentMainService = environmentMainService;
        this.userDataProfilesMainService = userDataProfilesMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.backupMainService = backupMainService;
        this.configurationService = configurationService;
        this.workspacesHistoryMainService = workspacesHistoryMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.instantiationService = instantiationService;
        this.dialogMainService = dialogMainService;
        this.fileService = fileService;
        this.protocolMainService = protocolMainService;
        this.themeMainService = themeMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.cssDevelopmentService = cssDevelopmentService;
        this._onDidOpenWindow = this._register(new Emitter());
        this.onDidOpenWindow = this._onDidOpenWindow.event;
        this._onDidSignalReadyWindow = this._register(new Emitter());
        this.onDidSignalReadyWindow = this._onDidSignalReadyWindow.event;
        this._onDidDestroyWindow = this._register(new Emitter());
        this.onDidDestroyWindow = this._onDidDestroyWindow.event;
        this._onDidChangeWindowsCount = this._register(new Emitter());
        this.onDidChangeWindowsCount = this._onDidChangeWindowsCount.event;
        this._onDidMaximizeWindow = this._register(new Emitter());
        this.onDidMaximizeWindow = this._onDidMaximizeWindow.event;
        this._onDidUnmaximizeWindow = this._register(new Emitter());
        this.onDidUnmaximizeWindow = this._onDidUnmaximizeWindow.event;
        this._onDidChangeFullScreen = this._register(new Emitter());
        this.onDidChangeFullScreen = this._onDidChangeFullScreen.event;
        this._onDidTriggerSystemContextMenu = this._register(new Emitter());
        this.onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;
        this.windows = new Map();
        this.windowsStateHandler = this._register(new WindowsStateHandler(this, stateService, this.lifecycleMainService, this.logService, this.configurationService));
        this.registerListeners();
    }
    registerListeners() {
        // Signal a window is ready after having entered a workspace
        this._register(this.workspacesManagementMainService.onDidEnterWorkspace((event) => this._onDidSignalReadyWindow.fire(event.window)));
        // Update valid roots in protocol service for extension dev windows
        this._register(this.onDidSignalReadyWindow((window) => {
            if (window.config?.extensionDevelopmentPath || window.config?.extensionTestsPath) {
                const disposables = new DisposableStore();
                disposables.add(Event.any(window.onDidClose, window.onDidDestroy)(() => disposables.dispose()));
                // Allow access to extension development path
                if (window.config.extensionDevelopmentPath) {
                    for (const extensionDevelopmentPath of window.config.extensionDevelopmentPath) {
                        disposables.add(this.protocolMainService.addValidFileRoot(extensionDevelopmentPath));
                    }
                }
                // Allow access to extension tests path
                if (window.config.extensionTestsPath) {
                    disposables.add(this.protocolMainService.addValidFileRoot(window.config.extensionTestsPath));
                }
            }
        }));
    }
    openEmptyWindow(openConfig, options) {
        const cli = this.environmentMainService.args;
        const remoteAuthority = options?.remoteAuthority || undefined;
        const forceEmpty = true;
        const forceReuseWindow = options?.forceReuseWindow;
        const forceNewWindow = !forceReuseWindow;
        return this.open({
            ...openConfig,
            cli,
            forceEmpty,
            forceNewWindow,
            forceReuseWindow,
            remoteAuthority,
            forceTempProfile: options?.forceTempProfile,
            forceProfile: options?.forceProfile,
        });
    }
    openExistingWindow(window, openConfig) {
        // Bring window to front
        window.focus();
        // Handle --wait
        this.handleWaitMarkerFile(openConfig, [window]);
    }
    async open(openConfig) {
        this.logService.trace('windowsManager#open');
        // Make sure addMode/removeMode is only enabled if we have an active window
        if ((openConfig.addMode || openConfig.removeMode) &&
            (openConfig.initialStartup || !this.getLastActiveWindow())) {
            openConfig.addMode = false;
            openConfig.removeMode = false;
        }
        const foldersToAdd = [];
        const foldersToRemove = [];
        const foldersToOpen = [];
        const workspacesToOpen = [];
        const untitledWorkspacesToRestore = [];
        const emptyWindowsWithBackupsToRestore = [];
        let filesToOpen;
        let maybeOpenEmptyWindow = false;
        // Identify things to open from open config
        const pathsToOpen = await this.getPathsToOpen(openConfig);
        this.logService.trace('windowsManager#open pathsToOpen', pathsToOpen);
        for (const path of pathsToOpen) {
            if (isSingleFolderWorkspacePathToOpen(path)) {
                if (openConfig.addMode) {
                    // When run with --add, take the folders that are to be opened as
                    // folders that should be added to the currently active window.
                    foldersToAdd.push(path);
                }
                else if (openConfig.removeMode) {
                    // When run with --remove, take the folders that are to be opened as
                    // folders that should be removed from the currently active window.
                    foldersToRemove.push(path);
                }
                else {
                    foldersToOpen.push(path);
                }
            }
            else if (isWorkspacePathToOpen(path)) {
                workspacesToOpen.push(path);
            }
            else if (path.fileUri) {
                if (!filesToOpen) {
                    filesToOpen = {
                        filesToOpenOrCreate: [],
                        filesToDiff: [],
                        filesToMerge: [],
                        remoteAuthority: path.remoteAuthority,
                    };
                }
                filesToOpen.filesToOpenOrCreate.push(path);
            }
            else if (path.backupPath) {
                emptyWindowsWithBackupsToRestore.push({
                    backupFolder: basename(path.backupPath),
                    remoteAuthority: path.remoteAuthority,
                });
            }
            else {
                maybeOpenEmptyWindow = true; // depends on other parameters such as `forceEmpty` and how many windows have opened already
            }
        }
        // When run with --diff, take the first 2 files to open as files to diff
        if (openConfig.diffMode && filesToOpen && filesToOpen.filesToOpenOrCreate.length >= 2) {
            filesToOpen.filesToDiff = filesToOpen.filesToOpenOrCreate.slice(0, 2);
            filesToOpen.filesToOpenOrCreate = [];
        }
        // When run with --merge, take the first 4 files to open as files to merge
        if (openConfig.mergeMode && filesToOpen && filesToOpen.filesToOpenOrCreate.length === 4) {
            filesToOpen.filesToMerge = filesToOpen.filesToOpenOrCreate.slice(0, 4);
            filesToOpen.filesToOpenOrCreate = [];
            filesToOpen.filesToDiff = [];
        }
        // When run with --wait, make sure we keep the paths to wait for
        if (filesToOpen && openConfig.waitMarkerFileURI) {
            filesToOpen.filesToWait = {
                paths: coalesce([
                    ...filesToOpen.filesToDiff,
                    filesToOpen.filesToMerge[3] /* [3] is the resulting merge file */,
                    ...filesToOpen.filesToOpenOrCreate,
                ]),
                waitMarkerFileUri: openConfig.waitMarkerFileURI,
            };
        }
        // These are windows to restore because of hot-exit or from previous session (only performed once on startup!)
        if (openConfig.initialStartup) {
            // Untitled workspaces are always restored
            untitledWorkspacesToRestore.push(...this.workspacesManagementMainService.getUntitledWorkspaces());
            workspacesToOpen.push(...untitledWorkspacesToRestore);
            // Empty windows with backups are always restored
            emptyWindowsWithBackupsToRestore.push(...this.backupMainService.getEmptyWindowBackups());
        }
        else {
            emptyWindowsWithBackupsToRestore.length = 0;
        }
        // Open based on config
        const { windows: usedWindows, filesOpenedInWindow } = await this.doOpen(openConfig, workspacesToOpen, foldersToOpen, emptyWindowsWithBackupsToRestore, maybeOpenEmptyWindow, filesToOpen, foldersToAdd, foldersToRemove);
        this.logService.trace(`windowsManager#open used window count ${usedWindows.length} (workspacesToOpen: ${workspacesToOpen.length}, foldersToOpen: ${foldersToOpen.length}, emptyToRestore: ${emptyWindowsWithBackupsToRestore.length}, maybeOpenEmptyWindow: ${maybeOpenEmptyWindow})`);
        // Make sure to pass focus to the most relevant of the windows if we open multiple
        if (usedWindows.length > 1) {
            // 1.) focus window we opened files in always with highest priority
            if (filesOpenedInWindow) {
                filesOpenedInWindow.focus();
            }
            // Otherwise, find a good window based on open params
            else {
                const focusLastActive = this.windowsStateHandler.state.lastActiveWindow &&
                    !openConfig.forceEmpty &&
                    !openConfig.cli._.length &&
                    !openConfig.cli['file-uri'] &&
                    !openConfig.cli['folder-uri'] &&
                    !(openConfig.urisToOpen && openConfig.urisToOpen.length);
                let focusLastOpened = true;
                let focusLastWindow = true;
                // 2.) focus last active window if we are not instructed to open any paths
                if (focusLastActive) {
                    const lastActiveWindow = usedWindows.filter((window) => this.windowsStateHandler.state.lastActiveWindow &&
                        window.backupPath === this.windowsStateHandler.state.lastActiveWindow.backupPath);
                    if (lastActiveWindow.length) {
                        lastActiveWindow[0].focus();
                        focusLastOpened = false;
                        focusLastWindow = false;
                    }
                }
                // 3.) if instructed to open paths, focus last window which is not restored
                if (focusLastOpened) {
                    for (let i = usedWindows.length - 1; i >= 0; i--) {
                        const usedWindow = usedWindows[i];
                        if ((usedWindow.openedWorkspace &&
                            untitledWorkspacesToRestore.some((workspace) => usedWindow.openedWorkspace &&
                                workspace.workspace.id === usedWindow.openedWorkspace.id)) || // skip over restored workspace
                            (usedWindow.backupPath &&
                                emptyWindowsWithBackupsToRestore.some((empty) => usedWindow.backupPath && empty.backupFolder === basename(usedWindow.backupPath))) // skip over restored empty window
                        ) {
                            continue;
                        }
                        usedWindow.focus();
                        focusLastWindow = false;
                        break;
                    }
                }
                // 4.) finally, always ensure to have at least last used window focused
                if (focusLastWindow) {
                    usedWindows[usedWindows.length - 1].focus();
                }
            }
        }
        // Remember in recent document list (unless this opens for extension development)
        // Also do not add paths when files are opened for diffing or merging, only if opened individually
        const isDiff = filesToOpen && filesToOpen.filesToDiff.length > 0;
        const isMerge = filesToOpen && filesToOpen.filesToMerge.length > 0;
        if (!usedWindows.some((window) => window.isExtensionDevelopmentHost) &&
            !isDiff &&
            !isMerge &&
            !openConfig.noRecentEntry) {
            const recents = [];
            for (const pathToOpen of pathsToOpen) {
                if (isWorkspacePathToOpen(pathToOpen) &&
                    !pathToOpen.transient /* never add transient workspaces to history */) {
                    recents.push({
                        label: pathToOpen.label,
                        workspace: pathToOpen.workspace,
                        remoteAuthority: pathToOpen.remoteAuthority,
                    });
                }
                else if (isSingleFolderWorkspacePathToOpen(pathToOpen)) {
                    recents.push({
                        label: pathToOpen.label,
                        folderUri: pathToOpen.workspace.uri,
                        remoteAuthority: pathToOpen.remoteAuthority,
                    });
                }
                else if (pathToOpen.fileUri) {
                    recents.push({
                        label: pathToOpen.label,
                        fileUri: pathToOpen.fileUri,
                        remoteAuthority: pathToOpen.remoteAuthority,
                    });
                }
            }
            this.workspacesHistoryMainService.addRecentlyOpened(recents);
        }
        // Handle --wait
        this.handleWaitMarkerFile(openConfig, usedWindows);
        return usedWindows;
    }
    handleWaitMarkerFile(openConfig, usedWindows) {
        // If we got started with --wait from the CLI, we need to signal to the outside when the window
        // used for the edit operation is closed or loaded to a different folder so that the waiting
        // process can continue. We do this by deleting the waitMarkerFilePath.
        const waitMarkerFileURI = openConfig.waitMarkerFileURI;
        if (openConfig.context === 0 /* OpenContext.CLI */ &&
            waitMarkerFileURI &&
            usedWindows.length === 1 &&
            usedWindows[0]) {
            ;
            (async () => {
                await usedWindows[0].whenClosedOrLoaded;
                try {
                    await this.fileService.del(waitMarkerFileURI);
                }
                catch (error) {
                    // ignore - could have been deleted from the window already
                }
            })();
        }
    }
    async doOpen(openConfig, workspacesToOpen, foldersToOpen, emptyToRestore, maybeOpenEmptyWindow, filesToOpen, foldersToAdd, foldersToRemove) {
        // Keep track of used windows and remember
        // if files have been opened in one of them
        const usedWindows = [];
        let filesOpenedInWindow = undefined;
        function addUsedWindow(window, openedFiles) {
            usedWindows.push(window);
            if (openedFiles) {
                filesOpenedInWindow = window;
                filesToOpen = undefined; // reset `filesToOpen` since files have been opened
            }
        }
        // Settings can decide if files/folders open in new window or not
        let { openFolderInNewWindow, openFilesInNewWindow } = this.shouldOpenNewWindow(openConfig);
        // Handle folders to add/remove by looking for the last active workspace (not on initial startup)
        if (!openConfig.initialStartup && (foldersToAdd.length > 0 || foldersToRemove.length > 0)) {
            const authority = foldersToAdd.at(0)?.remoteAuthority ?? foldersToRemove.at(0)?.remoteAuthority;
            const lastActiveWindow = this.getLastActiveWindowForAuthority(authority);
            if (lastActiveWindow) {
                addUsedWindow(this.doAddRemoveFoldersInExistingWindow(lastActiveWindow, foldersToAdd.map((folderToAdd) => folderToAdd.workspace.uri), foldersToRemove.map((folderToRemove) => folderToRemove.workspace.uri)));
            }
        }
        // Handle files to open/diff/merge or to create when we dont open a folder and we do not restore any
        // folder/untitled from hot-exit by trying to open them in the window that fits best
        const potentialNewWindowsCount = foldersToOpen.length + workspacesToOpen.length + emptyToRestore.length;
        if (filesToOpen && potentialNewWindowsCount === 0) {
            // Find suitable window or folder path to open files in
            const fileToCheck = filesToOpen.filesToOpenOrCreate[0] ||
                filesToOpen.filesToDiff[0] ||
                filesToOpen.filesToMerge[3]; /* [3] is the resulting merge file */
            // only look at the windows with correct authority
            const windows = this.getWindows().filter((window) => filesToOpen && isEqualAuthority(window.remoteAuthority, filesToOpen.remoteAuthority));
            // figure out a good window to open the files in if any
            // with a fallback to the last active window.
            //
            // in case `openFilesInNewWindow` is enforced, we skip
            // this step.
            let windowToUseForFiles = undefined;
            if (fileToCheck?.fileUri && !openFilesInNewWindow) {
                if (openConfig.context === 4 /* OpenContext.DESKTOP */ ||
                    openConfig.context === 0 /* OpenContext.CLI */ ||
                    openConfig.context === 1 /* OpenContext.DOCK */ ||
                    openConfig.context === 6 /* OpenContext.LINK */) {
                    windowToUseForFiles = await findWindowOnFile(windows, fileToCheck.fileUri, async (workspace) => workspace.configPath.scheme === Schemas.file
                        ? this.workspacesManagementMainService.resolveLocalWorkspace(workspace.configPath)
                        : undefined);
                }
                if (!windowToUseForFiles) {
                    windowToUseForFiles = this.doGetLastActiveWindow(windows);
                }
            }
            // We found a window to open the files in
            if (windowToUseForFiles) {
                // Window is workspace
                if (isWorkspaceIdentifier(windowToUseForFiles.openedWorkspace)) {
                    workspacesToOpen.push({
                        workspace: windowToUseForFiles.openedWorkspace,
                        remoteAuthority: windowToUseForFiles.remoteAuthority,
                    });
                }
                // Window is single folder
                else if (isSingleFolderWorkspaceIdentifier(windowToUseForFiles.openedWorkspace)) {
                    foldersToOpen.push({
                        workspace: windowToUseForFiles.openedWorkspace,
                        remoteAuthority: windowToUseForFiles.remoteAuthority,
                    });
                }
                // Window is empty
                else {
                    addUsedWindow(this.doOpenFilesInExistingWindow(openConfig, windowToUseForFiles, filesToOpen), true);
                }
            }
            // Finally, if no window or folder is found, just open the files in an empty window
            else {
                addUsedWindow(await this.openInBrowserWindow({
                    userEnv: openConfig.userEnv,
                    cli: openConfig.cli,
                    initialStartup: openConfig.initialStartup,
                    filesToOpen,
                    forceNewWindow: true,
                    remoteAuthority: filesToOpen.remoteAuthority,
                    forceNewTabbedWindow: openConfig.forceNewTabbedWindow,
                    forceProfile: openConfig.forceProfile,
                    forceTempProfile: openConfig.forceTempProfile,
                }), true);
            }
        }
        // Handle workspaces to open (instructed and to restore)
        const allWorkspacesToOpen = distinct(workspacesToOpen, (workspace) => workspace.workspace.id); // prevent duplicates
        if (allWorkspacesToOpen.length > 0) {
            // Check for existing instances
            const windowsOnWorkspace = coalesce(allWorkspacesToOpen.map((workspaceToOpen) => findWindowOnWorkspaceOrFolder(this.getWindows(), workspaceToOpen.workspace.configPath)));
            if (windowsOnWorkspace.length > 0) {
                const windowOnWorkspace = windowsOnWorkspace[0];
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, windowOnWorkspace.remoteAuthority)
                    ? filesToOpen
                    : undefined;
                // Do open files
                addUsedWindow(this.doOpenFilesInExistingWindow(openConfig, windowOnWorkspace, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
            // Open remaining ones
            for (const workspaceToOpen of allWorkspacesToOpen) {
                if (windowsOnWorkspace.some((window) => window.openedWorkspace && window.openedWorkspace.id === workspaceToOpen.workspace.id)) {
                    continue; // ignore folders that are already open
                }
                const remoteAuthority = workspaceToOpen.remoteAuthority;
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, remoteAuthority)
                    ? filesToOpen
                    : undefined;
                // Do open folder
                addUsedWindow(await this.doOpenFolderOrWorkspace(openConfig, workspaceToOpen, openFolderInNewWindow, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
        }
        // Handle folders to open (instructed and to restore)
        const allFoldersToOpen = distinct(foldersToOpen, (folder) => extUriBiasedIgnorePathCase.getComparisonKey(folder.workspace.uri)); // prevent duplicates
        if (allFoldersToOpen.length > 0) {
            // Check for existing instances
            const windowsOnFolderPath = coalesce(allFoldersToOpen.map((folderToOpen) => findWindowOnWorkspaceOrFolder(this.getWindows(), folderToOpen.workspace.uri)));
            if (windowsOnFolderPath.length > 0) {
                const windowOnFolderPath = windowsOnFolderPath[0];
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, windowOnFolderPath.remoteAuthority)
                    ? filesToOpen
                    : undefined;
                // Do open files
                addUsedWindow(this.doOpenFilesInExistingWindow(openConfig, windowOnFolderPath, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
            // Open remaining ones
            for (const folderToOpen of allFoldersToOpen) {
                if (windowsOnFolderPath.some((window) => isSingleFolderWorkspaceIdentifier(window.openedWorkspace) &&
                    extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.uri, folderToOpen.workspace.uri))) {
                    continue; // ignore folders that are already open
                }
                const remoteAuthority = folderToOpen.remoteAuthority;
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, remoteAuthority)
                    ? filesToOpen
                    : undefined;
                // Do open folder
                addUsedWindow(await this.doOpenFolderOrWorkspace(openConfig, folderToOpen, openFolderInNewWindow, filesToOpenInWindow), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
        }
        // Handle empty to restore
        const allEmptyToRestore = distinct(emptyToRestore, (info) => info.backupFolder); // prevent duplicates
        if (allEmptyToRestore.length > 0) {
            for (const emptyWindowBackupInfo of allEmptyToRestore) {
                const remoteAuthority = emptyWindowBackupInfo.remoteAuthority;
                const filesToOpenInWindow = isEqualAuthority(filesToOpen?.remoteAuthority, remoteAuthority)
                    ? filesToOpen
                    : undefined;
                addUsedWindow(await this.doOpenEmpty(openConfig, true, remoteAuthority, filesToOpenInWindow, emptyWindowBackupInfo), !!filesToOpenInWindow);
                openFolderInNewWindow = true; // any other folders to open must open in new window then
            }
        }
        // Finally, open an empty window if
        // - we still have files to open
        // - user forces an empty window (e.g. via command line)
        // - no window has opened yet
        if (filesToOpen ||
            (maybeOpenEmptyWindow && (openConfig.forceEmpty || usedWindows.length === 0))) {
            const remoteAuthority = filesToOpen ? filesToOpen.remoteAuthority : openConfig.remoteAuthority;
            addUsedWindow(await this.doOpenEmpty(openConfig, openFolderInNewWindow, remoteAuthority, filesToOpen), !!filesToOpen);
        }
        return { windows: distinct(usedWindows), filesOpenedInWindow };
    }
    doOpenFilesInExistingWindow(configuration, window, filesToOpen) {
        this.logService.trace('windowsManager#doOpenFilesInExistingWindow', { filesToOpen });
        this.focusMainOrChildWindow(window); // make sure window or any of the children has focus
        const params = {
            filesToOpenOrCreate: filesToOpen?.filesToOpenOrCreate,
            filesToDiff: filesToOpen?.filesToDiff,
            filesToMerge: filesToOpen?.filesToMerge,
            filesToWait: filesToOpen?.filesToWait,
            termProgram: configuration?.userEnv?.['TERM_PROGRAM'],
        };
        window.sendWhenReady('vscode:openFiles', CancellationToken.None, params);
        return window;
    }
    focusMainOrChildWindow(mainWindow) {
        let windowToFocus = mainWindow;
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow && focusedWindow.id !== mainWindow.id) {
            const auxiliaryWindowCandidate = this.auxiliaryWindowsMainService.getWindowByWebContents(focusedWindow.webContents);
            if (auxiliaryWindowCandidate && auxiliaryWindowCandidate.parentId === mainWindow.id) {
                windowToFocus = auxiliaryWindowCandidate;
            }
        }
        windowToFocus.focus();
    }
    doAddRemoveFoldersInExistingWindow(window, foldersToAdd, foldersToRemove) {
        this.logService.trace('windowsManager#doAddRemoveFoldersToExistingWindow', {
            foldersToAdd,
            foldersToRemove,
        });
        window.focus(); // make sure window has focus
        const request = { foldersToAdd, foldersToRemove };
        window.sendWhenReady('vscode:addRemoveFolders', CancellationToken.None, request);
        return window;
    }
    doOpenEmpty(openConfig, forceNewWindow, remoteAuthority, filesToOpen, emptyWindowBackupInfo) {
        this.logService.trace('windowsManager#doOpenEmpty', {
            restore: !!emptyWindowBackupInfo,
            remoteAuthority,
            filesToOpen,
            forceNewWindow,
        });
        let windowToUse;
        if (!forceNewWindow && typeof openConfig.contextWindowId === 'number') {
            windowToUse = this.getWindowById(openConfig.contextWindowId); // fix for https://github.com/microsoft/vscode/issues/97172
        }
        return this.openInBrowserWindow({
            userEnv: openConfig.userEnv,
            cli: openConfig.cli,
            initialStartup: openConfig.initialStartup,
            remoteAuthority,
            forceNewWindow,
            forceNewTabbedWindow: openConfig.forceNewTabbedWindow,
            filesToOpen,
            windowToUse,
            emptyWindowBackupInfo,
            forceProfile: openConfig.forceProfile,
            forceTempProfile: openConfig.forceTempProfile,
        });
    }
    doOpenFolderOrWorkspace(openConfig, folderOrWorkspace, forceNewWindow, filesToOpen, windowToUse) {
        this.logService.trace('windowsManager#doOpenFolderOrWorkspace', {
            folderOrWorkspace,
            filesToOpen,
        });
        if (!forceNewWindow && !windowToUse && typeof openConfig.contextWindowId === 'number') {
            windowToUse = this.getWindowById(openConfig.contextWindowId); // fix for https://github.com/microsoft/vscode/issues/49587
        }
        return this.openInBrowserWindow({
            workspace: folderOrWorkspace.workspace,
            userEnv: openConfig.userEnv,
            cli: openConfig.cli,
            initialStartup: openConfig.initialStartup,
            remoteAuthority: folderOrWorkspace.remoteAuthority,
            forceNewWindow,
            forceNewTabbedWindow: openConfig.forceNewTabbedWindow,
            filesToOpen,
            windowToUse,
            forceProfile: openConfig.forceProfile,
            forceTempProfile: openConfig.forceTempProfile,
        });
    }
    async getPathsToOpen(openConfig) {
        let pathsToOpen;
        let isCommandLineOrAPICall = false;
        let isRestoringPaths = false;
        // Extract paths: from API
        if (openConfig.urisToOpen && openConfig.urisToOpen.length > 0) {
            pathsToOpen = await this.doExtractPathsFromAPI(openConfig);
            isCommandLineOrAPICall = true;
        }
        // Check for force empty
        else if (openConfig.forceEmpty) {
            pathsToOpen = [EMPTY_WINDOW];
        }
        // Extract paths: from CLI
        else if (openConfig.cli._.length ||
            openConfig.cli['folder-uri'] ||
            openConfig.cli['file-uri']) {
            pathsToOpen = await this.doExtractPathsFromCLI(openConfig.cli);
            if (pathsToOpen.length === 0) {
                pathsToOpen.push(EMPTY_WINDOW); // add an empty window if we did not have windows to open from command line
            }
            isCommandLineOrAPICall = true;
        }
        // Extract paths: from previous session
        else {
            pathsToOpen = await this.doGetPathsFromLastSession();
            if (pathsToOpen.length === 0) {
                pathsToOpen.push(EMPTY_WINDOW); // add an empty window if we did not have windows to restore
            }
            isRestoringPaths = true;
        }
        // Handle the case of multiple folders being opened from CLI while we are
        // not in `--add` or `--remove` mode by creating an untitled workspace, only if:
        // - they all share the same remote authority
        // - there is no existing workspace to open that matches these folders
        if (!openConfig.addMode && !openConfig.removeMode && isCommandLineOrAPICall) {
            const foldersToOpen = pathsToOpen.filter((path) => isSingleFolderWorkspacePathToOpen(path));
            if (foldersToOpen.length > 1) {
                const remoteAuthority = foldersToOpen[0].remoteAuthority;
                if (foldersToOpen.every((folderToOpen) => isEqualAuthority(folderToOpen.remoteAuthority, remoteAuthority))) {
                    let workspace;
                    const lastSessionWorkspaceMatchingFolders = await this.doGetWorkspaceMatchingFoldersFromLastSession(remoteAuthority, foldersToOpen);
                    if (lastSessionWorkspaceMatchingFolders) {
                        workspace = lastSessionWorkspaceMatchingFolders;
                    }
                    else {
                        workspace = await this.workspacesManagementMainService.createUntitledWorkspace(foldersToOpen.map((folder) => ({ uri: folder.workspace.uri })));
                    }
                    // Add workspace and remove folders thereby
                    pathsToOpen.push({ workspace, remoteAuthority });
                    pathsToOpen = pathsToOpen.filter((path) => !isSingleFolderWorkspacePathToOpen(path));
                }
            }
        }
        // Check for `window.restoreWindows` setting to include all windows
        // from the previous session if this is the initial startup and we have
        // not restored windows already otherwise.
        // Use `unshift` to ensure any new window to open comes last for proper
        // focus treatment.
        if (openConfig.initialStartup &&
            !isRestoringPaths &&
            this.configurationService.getValue('window')?.restoreWindows ===
                'preserve') {
            const lastSessionPaths = await this.doGetPathsFromLastSession();
            pathsToOpen.unshift(...lastSessionPaths.filter((path) => isWorkspacePathToOpen(path) ||
                isSingleFolderWorkspacePathToOpen(path) ||
                path.backupPath));
        }
        return pathsToOpen;
    }
    async doExtractPathsFromAPI(openConfig) {
        const pathResolveOptions = {
            gotoLineMode: openConfig.gotoLineMode,
            remoteAuthority: openConfig.remoteAuthority,
        };
        const pathsToOpen = await Promise.all(coalesce(openConfig.urisToOpen || []).map(async (pathToOpen) => {
            const path = await this.resolveOpenable(pathToOpen, pathResolveOptions);
            // Path exists
            if (path) {
                path.label = pathToOpen.label;
                return path;
            }
            // Path does not exist: show a warning box
            const uri = this.resourceFromOpenable(pathToOpen);
            this.dialogMainService.showMessageBox({
                type: 'info',
                buttons: [localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK')],
                message: uri.scheme === Schemas.file
                    ? localize('pathNotExistTitle', 'Path does not exist')
                    : localize('uriInvalidTitle', 'URI can not be opened'),
                detail: uri.scheme === Schemas.file
                    ? localize('pathNotExistDetail', "The path '{0}' does not exist on this computer.", getPathLabel(uri, { os: OS, tildify: this.environmentMainService }))
                    : localize('uriInvalidDetail', "The URI '{0}' is not valid and can not be opened.", uri.toString(true)),
            }, BrowserWindow.getFocusedWindow() ?? undefined);
            return undefined;
        }));
        return coalesce(pathsToOpen);
    }
    async doExtractPathsFromCLI(cli) {
        const pathsToOpen = [];
        const pathResolveOptions = {
            ignoreFileNotFound: true,
            gotoLineMode: cli.goto,
            remoteAuthority: cli.remote || undefined,
            forceOpenWorkspaceAsFile: 
            // special case diff / merge mode to force open
            // workspace as file
            // https://github.com/microsoft/vscode/issues/149731
            (cli.diff && cli._.length === 2) || (cli.merge && cli._.length === 4),
        };
        // folder uris
        const folderUris = cli['folder-uri'];
        if (folderUris) {
            const resolvedFolderUris = await Promise.all(folderUris.map((rawFolderUri) => {
                const folderUri = this.cliArgToUri(rawFolderUri);
                if (!folderUri) {
                    return undefined;
                }
                return this.resolveOpenable({ folderUri }, pathResolveOptions);
            }));
            pathsToOpen.push(...coalesce(resolvedFolderUris));
        }
        // file uris
        const fileUris = cli['file-uri'];
        if (fileUris) {
            const resolvedFileUris = await Promise.all(fileUris.map((rawFileUri) => {
                const fileUri = this.cliArgToUri(rawFileUri);
                if (!fileUri) {
                    return undefined;
                }
                return this.resolveOpenable(hasWorkspaceFileExtension(rawFileUri) ? { workspaceUri: fileUri } : { fileUri }, pathResolveOptions);
            }));
            pathsToOpen.push(...coalesce(resolvedFileUris));
        }
        // folder or file paths
        const resolvedCliPaths = await Promise.all(cli._.map((cliPath) => {
            return pathResolveOptions.remoteAuthority
                ? this.doResolveRemotePath(cliPath, pathResolveOptions)
                : this.doResolveFilePath(cliPath, pathResolveOptions);
        }));
        pathsToOpen.push(...coalesce(resolvedCliPaths));
        return pathsToOpen;
    }
    cliArgToUri(arg) {
        try {
            const uri = URI.parse(arg);
            if (!uri.scheme) {
                this.logService.error(`Invalid URI input string, scheme missing: ${arg}`);
                return undefined;
            }
            if (!uri.path) {
                return uri.with({ path: '/' });
            }
            return uri;
        }
        catch (e) {
            this.logService.error(`Invalid URI input string: ${arg}, ${e.message}`);
        }
        return undefined;
    }
    async doGetPathsFromLastSession() {
        const restoreWindowsSetting = this.getRestoreWindowsSetting();
        switch (restoreWindowsSetting) {
            // none: no window to restore
            case 'none':
                return [];
            // one: restore last opened workspace/folder or empty window
            // all: restore all windows
            // folders: restore last opened folders only
            case 'one':
            case 'all':
            case 'preserve':
            case 'folders': {
                // Collect previously opened windows
                const lastSessionWindows = [];
                if (restoreWindowsSetting !== 'one') {
                    lastSessionWindows.push(...this.windowsStateHandler.state.openedWindows);
                }
                if (this.windowsStateHandler.state.lastActiveWindow) {
                    lastSessionWindows.push(this.windowsStateHandler.state.lastActiveWindow);
                }
                const pathsToOpen = await Promise.all(lastSessionWindows.map(async (lastSessionWindow) => {
                    // Workspaces
                    if (lastSessionWindow.workspace) {
                        const pathToOpen = await this.resolveOpenable({ workspaceUri: lastSessionWindow.workspace.configPath }, {
                            remoteAuthority: lastSessionWindow.remoteAuthority,
                            rejectTransientWorkspaces: true /* https://github.com/microsoft/vscode/issues/119695 */,
                        });
                        if (isWorkspacePathToOpen(pathToOpen)) {
                            return pathToOpen;
                        }
                    }
                    // Folders
                    else if (lastSessionWindow.folderUri) {
                        const pathToOpen = await this.resolveOpenable({ folderUri: lastSessionWindow.folderUri }, { remoteAuthority: lastSessionWindow.remoteAuthority });
                        if (isSingleFolderWorkspacePathToOpen(pathToOpen)) {
                            return pathToOpen;
                        }
                    }
                    // Empty window, potentially editors open to be restored
                    else if (restoreWindowsSetting !== 'folders' && lastSessionWindow.backupPath) {
                        return {
                            backupPath: lastSessionWindow.backupPath,
                            remoteAuthority: lastSessionWindow.remoteAuthority,
                        };
                    }
                    return undefined;
                }));
                return coalesce(pathsToOpen);
            }
        }
    }
    getRestoreWindowsSetting() {
        let restoreWindows;
        if (this.lifecycleMainService.wasRestarted) {
            restoreWindows = 'all'; // always reopen all windows when an update was applied
        }
        else {
            const windowConfig = this.configurationService.getValue('window');
            restoreWindows = windowConfig?.restoreWindows || 'all'; // by default restore all windows
            if (!['preserve', 'all', 'folders', 'one', 'none'].includes(restoreWindows)) {
                restoreWindows = 'all'; // by default restore all windows
            }
        }
        return restoreWindows;
    }
    async doGetWorkspaceMatchingFoldersFromLastSession(remoteAuthority, folders) {
        const workspaces = (await this.doGetPathsFromLastSession()).filter((path) => isWorkspacePathToOpen(path));
        const folderUris = folders.map((folder) => folder.workspace.uri);
        for (const { workspace } of workspaces) {
            const resolvedWorkspace = await this.workspacesManagementMainService.resolveLocalWorkspace(workspace.configPath);
            if (!resolvedWorkspace ||
                resolvedWorkspace.remoteAuthority !== remoteAuthority ||
                resolvedWorkspace.transient ||
                resolvedWorkspace.folders.length !== folders.length) {
                continue;
            }
            const folderSet = new ResourceSet(folderUris, (uri) => extUriBiasedIgnorePathCase.getComparisonKey(uri));
            if (resolvedWorkspace.folders.every((folder) => folderSet.has(folder.uri))) {
                return resolvedWorkspace;
            }
        }
        return undefined;
    }
    async resolveOpenable(openable, options = Object.create(null)) {
        // handle file:// openables with some extra validation
        const uri = this.resourceFromOpenable(openable);
        if (uri.scheme === Schemas.file) {
            if (isFileToOpen(openable)) {
                options = { ...options, forceOpenWorkspaceAsFile: true };
            }
            return this.doResolveFilePath(uri.fsPath, options);
        }
        // handle non file:// openables
        return this.doResolveRemoteOpenable(openable, options);
    }
    doResolveRemoteOpenable(openable, options) {
        let uri = this.resourceFromOpenable(openable);
        // use remote authority from vscode
        const remoteAuthority = getRemoteAuthority(uri) || options.remoteAuthority;
        // normalize URI
        uri = removeTrailingPathSeparator(normalizePath(uri));
        // File
        if (isFileToOpen(openable)) {
            if (options.gotoLineMode) {
                const { path, line, column } = parseLineAndColumnAware(uri.path);
                return {
                    fileUri: uri.with({ path }),
                    options: {
                        selection: line ? { startLineNumber: line, startColumn: column || 1 } : undefined,
                    },
                    remoteAuthority,
                };
            }
            return { fileUri: uri, remoteAuthority };
        }
        // Workspace
        else if (isWorkspaceToOpen(openable)) {
            return { workspace: getWorkspaceIdentifier(uri), remoteAuthority };
        }
        // Folder
        return { workspace: getSingleFolderWorkspaceIdentifier(uri), remoteAuthority };
    }
    resourceFromOpenable(openable) {
        if (isWorkspaceToOpen(openable)) {
            return openable.workspaceUri;
        }
        if (isFolderToOpen(openable)) {
            return openable.folderUri;
        }
        return openable.fileUri;
    }
    async doResolveFilePath(path, options, skipHandleUNCError) {
        // Extract line/col information from path
        let lineNumber;
        let columnNumber;
        if (options.gotoLineMode) {
            ;
            ({ path, line: lineNumber, column: columnNumber } = parseLineAndColumnAware(path));
        }
        // Ensure the path is normalized and absolute
        path = sanitizeFilePath(normalize(path), cwd());
        try {
            const pathStat = await fs.promises.stat(path);
            // File
            if (pathStat.isFile()) {
                // Workspace (unless disabled via flag)
                if (!options.forceOpenWorkspaceAsFile) {
                    const workspace = await this.workspacesManagementMainService.resolveLocalWorkspace(URI.file(path));
                    if (workspace) {
                        // If the workspace is transient and we are to ignore
                        // transient workspaces, reject it.
                        if (workspace.transient && options.rejectTransientWorkspaces) {
                            return undefined;
                        }
                        return {
                            workspace: { id: workspace.id, configPath: workspace.configPath },
                            type: FileType.File,
                            exists: true,
                            remoteAuthority: workspace.remoteAuthority,
                            transient: workspace.transient,
                        };
                    }
                }
                return {
                    fileUri: URI.file(path),
                    type: FileType.File,
                    exists: true,
                    options: {
                        selection: lineNumber
                            ? { startLineNumber: lineNumber, startColumn: columnNumber || 1 }
                            : undefined,
                    },
                };
            }
            // Folder
            else if (pathStat.isDirectory()) {
                return {
                    workspace: getSingleFolderWorkspaceIdentifier(URI.file(path), pathStat),
                    type: FileType.Directory,
                    exists: true,
                };
            }
            // Special device: in POSIX environments, we may get /dev/null passed
            // in (for example git uses it to signal one side of a diff does not
            // exist). In that special case, treat it like a file to support this
            // scenario ()
            else if (!isWindows && path === '/dev/null') {
                return {
                    fileUri: URI.file(path),
                    type: FileType.File,
                    exists: true,
                };
            }
        }
        catch (error) {
            if (error.code === 'ERR_UNC_HOST_NOT_ALLOWED' && !skipHandleUNCError) {
                return this.onUNCHostNotAllowed(path, options);
            }
            const fileUri = URI.file(path);
            // since file does not seem to exist anymore, remove from recent
            this.workspacesHistoryMainService.removeRecentlyOpened([fileUri]);
            // assume this is a file that does not yet exist
            if (options.ignoreFileNotFound && error.code === 'ENOENT') {
                return {
                    fileUri,
                    type: FileType.File,
                    exists: false,
                };
            }
            this.logService.error(`Invalid path provided: ${path}, ${error.message}`);
        }
        return undefined;
    }
    async onUNCHostNotAllowed(path, options) {
        const uri = URI.file(path);
        const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
            type: 'warning',
            buttons: [
                localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, '&&Allow'),
                localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, '&&Cancel'),
                localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, '&&Learn More'),
            ],
            message: localize('confirmOpenMessage', "The host '{0}' was not found in the list of allowed hosts. Do you want to allow it anyway?", uri.authority),
            detail: localize('confirmOpenDetail', "The path '{0}' uses a host that is not allowed. Unless you trust the host, you should press 'Cancel'", getPathLabel(uri, { os: OS, tildify: this.environmentMainService })),
            checkboxLabel: localize('doNotAskAgain', "Permanently allow host '{0}'", uri.authority),
            cancelId: 1,
        });
        if (response === 0) {
            addUNCHostToAllowlist(uri.authority);
            if (checkboxChecked) {
                // Due to https://github.com/microsoft/vscode/issues/195436, we can only
                // update settings from within a window. But we do not know if a window
                // is about to open or can already handle the request, so we have to send
                // to any current window and any newly opening window.
                const request = { channel: 'vscode:configureAllowedUNCHost', args: uri.authority };
                this.sendToFocused(request.channel, request.args);
                this.sendToOpeningWindow(request.channel, request.args);
            }
            return this.doResolveFilePath(path, options, true /* do not handle UNC error again */);
        }
        if (response === 2) {
            shell.openExternal('https://aka.ms/vscode-windows-unc');
            return this.onUNCHostNotAllowed(path, options); // keep showing the dialog until decision (https://github.com/microsoft/vscode/issues/181956)
        }
        return undefined;
    }
    doResolveRemotePath(path, options) {
        const first = path.charCodeAt(0);
        const remoteAuthority = options.remoteAuthority;
        // Extract line/col information from path
        let lineNumber;
        let columnNumber;
        if (options.gotoLineMode) {
            ;
            ({ path, line: lineNumber, column: columnNumber } = parseLineAndColumnAware(path));
        }
        // make absolute
        if (first !== 47 /* CharCode.Slash */) {
            if (isWindowsDriveLetter(first) && path.charCodeAt(path.charCodeAt(1)) === 58 /* CharCode.Colon */) {
                path = toSlashes(path);
            }
            path = `/${path}`;
        }
        const uri = URI.from({ scheme: Schemas.vscodeRemote, authority: remoteAuthority, path: path });
        // guess the file type:
        // - if it ends with a slash it's a folder
        // - if in goto line mode or if it has a file extension, it's a file or a workspace
        // - by defaults it's a folder
        if (path.charCodeAt(path.length - 1) !== 47 /* CharCode.Slash */) {
            // file name ends with .code-workspace
            if (hasWorkspaceFileExtension(path)) {
                if (options.forceOpenWorkspaceAsFile) {
                    return {
                        fileUri: uri,
                        options: {
                            selection: lineNumber
                                ? { startLineNumber: lineNumber, startColumn: columnNumber || 1 }
                                : undefined,
                        },
                        remoteAuthority: options.remoteAuthority,
                    };
                }
                return { workspace: getWorkspaceIdentifier(uri), remoteAuthority };
            }
            // file name starts with a dot or has an file extension
            else if (options.gotoLineMode || posix.basename(path).indexOf('.') !== -1) {
                return {
                    fileUri: uri,
                    options: {
                        selection: lineNumber
                            ? { startLineNumber: lineNumber, startColumn: columnNumber || 1 }
                            : undefined,
                    },
                    remoteAuthority,
                };
            }
        }
        return { workspace: getSingleFolderWorkspaceIdentifier(uri), remoteAuthority };
    }
    shouldOpenNewWindow(openConfig) {
        // let the user settings override how folders are open in a new window or same window unless we are forced
        const windowConfig = this.configurationService.getValue('window');
        const openFolderInNewWindowConfig = windowConfig?.openFoldersInNewWindow || 'default'; /* default */
        const openFilesInNewWindowConfig = windowConfig?.openFilesInNewWindow || 'off'; /* default */
        let openFolderInNewWindow = (openConfig.preferNewWindow || openConfig.forceNewWindow) && !openConfig.forceReuseWindow;
        if (!openConfig.forceNewWindow &&
            !openConfig.forceReuseWindow &&
            (openFolderInNewWindowConfig === 'on' || openFolderInNewWindowConfig === 'off')) {
            openFolderInNewWindow = openFolderInNewWindowConfig === 'on';
        }
        // let the user settings override how files are open in a new window or same window unless we are forced (not for extension development though)
        let openFilesInNewWindow = false;
        if (openConfig.forceNewWindow || openConfig.forceReuseWindow) {
            openFilesInNewWindow = !!openConfig.forceNewWindow && !openConfig.forceReuseWindow;
        }
        else {
            // macOS: by default we open files in a new window if this is triggered via DOCK context
            if (isMacintosh) {
                if (openConfig.context === 1 /* OpenContext.DOCK */) {
                    openFilesInNewWindow = true;
                }
            }
            // Linux/Windows: by default we open files in the new window unless triggered via DIALOG / MENU context
            // or from the integrated terminal where we assume the user prefers to open in the current window
            else {
                if (openConfig.context !== 3 /* OpenContext.DIALOG */ &&
                    openConfig.context !== 2 /* OpenContext.MENU */ &&
                    !(openConfig.userEnv && openConfig.userEnv['TERM_PROGRAM'] === 'vscode')) {
                    openFilesInNewWindow = true;
                }
            }
            // finally check for overrides of default
            if (!openConfig.cli.extensionDevelopmentPath &&
                (openFilesInNewWindowConfig === 'on' || openFilesInNewWindowConfig === 'off')) {
                openFilesInNewWindow = openFilesInNewWindowConfig === 'on';
            }
        }
        return { openFolderInNewWindow: !!openFolderInNewWindow, openFilesInNewWindow };
    }
    async openExtensionDevelopmentHostWindow(extensionDevelopmentPaths, openConfig) {
        // Reload an existing extension development host window on the same path
        // We currently do not allow more than one extension development window
        // on the same extension path.
        const existingWindow = findWindowOnExtensionDevelopmentPath(this.getWindows(), extensionDevelopmentPaths);
        if (existingWindow) {
            this.lifecycleMainService.reload(existingWindow, openConfig.cli);
            existingWindow.focus(); // make sure it gets focus and is restored
            return [existingWindow];
        }
        let folderUris = openConfig.cli['folder-uri'] || [];
        let fileUris = openConfig.cli['file-uri'] || [];
        let cliArgs = openConfig.cli._;
        // Fill in previously opened workspace unless an explicit path is provided and we are not unit testing
        if (!cliArgs.length &&
            !folderUris.length &&
            !fileUris.length &&
            !openConfig.cli.extensionTestsPath) {
            const extensionDevelopmentWindowState = this.windowsStateHandler.state.lastPluginDevelopmentHostWindow;
            const workspaceToOpen = extensionDevelopmentWindowState?.workspace ?? extensionDevelopmentWindowState?.folderUri;
            if (workspaceToOpen) {
                if (URI.isUri(workspaceToOpen)) {
                    if (workspaceToOpen.scheme === Schemas.file) {
                        cliArgs = [workspaceToOpen.fsPath];
                    }
                    else {
                        folderUris = [workspaceToOpen.toString()];
                    }
                }
                else {
                    if (workspaceToOpen.configPath.scheme === Schemas.file) {
                        cliArgs = [originalFSPath(workspaceToOpen.configPath)];
                    }
                    else {
                        fileUris = [workspaceToOpen.configPath.toString()];
                    }
                }
            }
        }
        let remoteAuthority = openConfig.remoteAuthority;
        for (const extensionDevelopmentPath of extensionDevelopmentPaths) {
            if (extensionDevelopmentPath.match(/^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/)) {
                const url = URI.parse(extensionDevelopmentPath);
                const extensionDevelopmentPathRemoteAuthority = getRemoteAuthority(url);
                if (extensionDevelopmentPathRemoteAuthority) {
                    if (remoteAuthority) {
                        if (!isEqualAuthority(extensionDevelopmentPathRemoteAuthority, remoteAuthority)) {
                            this.logService.error('more than one extension development path authority');
                        }
                    }
                    else {
                        remoteAuthority = extensionDevelopmentPathRemoteAuthority;
                    }
                }
            }
        }
        // Make sure that we do not try to open:
        // - a workspace or folder that is already opened
        // - a workspace or file that has a different authority as the extension development.
        cliArgs = cliArgs.filter((path) => {
            const uri = URI.file(path);
            if (!!findWindowOnWorkspaceOrFolder(this.getWindows(), uri)) {
                return false;
            }
            return isEqualAuthority(getRemoteAuthority(uri), remoteAuthority);
        });
        folderUris = folderUris.filter((folderUriStr) => {
            const folderUri = this.cliArgToUri(folderUriStr);
            if (folderUri && !!findWindowOnWorkspaceOrFolder(this.getWindows(), folderUri)) {
                return false;
            }
            return folderUri ? isEqualAuthority(getRemoteAuthority(folderUri), remoteAuthority) : false;
        });
        fileUris = fileUris.filter((fileUriStr) => {
            const fileUri = this.cliArgToUri(fileUriStr);
            if (fileUri && !!findWindowOnWorkspaceOrFolder(this.getWindows(), fileUri)) {
                return false;
            }
            return fileUri ? isEqualAuthority(getRemoteAuthority(fileUri), remoteAuthority) : false;
        });
        openConfig.cli._ = cliArgs;
        openConfig.cli['folder-uri'] = folderUris;
        openConfig.cli['file-uri'] = fileUris;
        // Open it
        const openArgs = {
            context: openConfig.context,
            cli: openConfig.cli,
            forceNewWindow: true,
            forceEmpty: !cliArgs.length && !folderUris.length && !fileUris.length,
            userEnv: openConfig.userEnv,
            noRecentEntry: true,
            waitMarkerFileURI: openConfig.waitMarkerFileURI,
            remoteAuthority,
            forceProfile: openConfig.forceProfile,
            forceTempProfile: openConfig.forceTempProfile,
        };
        return this.open(openArgs);
    }
    async openInBrowserWindow(options) {
        const windowConfig = this.configurationService.getValue('window');
        const lastActiveWindow = this.getLastActiveWindow();
        const newWindowProfile = windowConfig?.newWindowProfile
            ? this.userDataProfilesMainService.profiles.find((profile) => profile.name === windowConfig.newWindowProfile)
            : undefined;
        const defaultProfile = newWindowProfile ??
            lastActiveWindow?.profile ??
            this.userDataProfilesMainService.defaultProfile;
        let window;
        if (!options.forceNewWindow && !options.forceNewTabbedWindow) {
            window = options.windowToUse || lastActiveWindow;
            if (window) {
                window.focus();
            }
        }
        // Build up the window configuration from provided options, config and environment
        const configuration = {
            // Inherit CLI arguments from environment and/or
            // the specific properties from this launch if provided
            ...this.environmentMainService.args,
            ...options.cli,
            machineId: this.machineId,
            sqmId: this.sqmId,
            devDeviceId: this.devDeviceId,
            windowId: -1, // Will be filled in by the window once loaded later
            mainPid: process.pid,
            appRoot: this.environmentMainService.appRoot,
            execPath: process.execPath,
            codeCachePath: this.environmentMainService.codeCachePath,
            // If we know the backup folder upfront (for empty windows to restore), we can set it
            // directly here which helps for restoring UI state associated with that window.
            // For all other cases we first call into registerEmptyWindowBackup() to set it before
            // loading the window.
            backupPath: options.emptyWindowBackupInfo
                ? join(this.environmentMainService.backupHome, options.emptyWindowBackupInfo.backupFolder)
                : undefined,
            profiles: {
                home: this.userDataProfilesMainService.profilesHome,
                all: this.userDataProfilesMainService.profiles,
                // Set to default profile first and resolve and update the profile
                // only after the workspace-backup is registered.
                // Because, workspace identifier of an empty window is known only then.
                profile: defaultProfile,
            },
            homeDir: this.environmentMainService.userHome.with({ scheme: Schemas.file }).fsPath,
            tmpDir: this.environmentMainService.tmpDir.with({ scheme: Schemas.file }).fsPath,
            userDataDir: this.environmentMainService.userDataPath,
            remoteAuthority: options.remoteAuthority,
            workspace: options.workspace,
            userEnv: { ...this.initialUserEnv, ...options.userEnv },
            nls: {
                messages: getNLSMessages(),
                language: getNLSLanguage(),
            },
            filesToOpenOrCreate: options.filesToOpen?.filesToOpenOrCreate,
            filesToDiff: options.filesToOpen?.filesToDiff,
            filesToMerge: options.filesToOpen?.filesToMerge,
            filesToWait: options.filesToOpen?.filesToWait,
            logLevel: this.loggerService.getLogLevel(),
            loggers: this.loggerService.getGlobalLoggers(),
            logsPath: this.environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath,
            product,
            isInitialStartup: options.initialStartup,
            perfMarks: getMarks(),
            os: { release: release(), hostname: hostname(), arch: arch() },
            autoDetectHighContrast: windowConfig?.autoDetectHighContrast ?? true,
            autoDetectColorScheme: windowConfig?.autoDetectColorScheme ?? false,
            accessibilitySupport: app.accessibilitySupportEnabled,
            colorScheme: this.themeMainService.getColorScheme(),
            policiesData: this.policyService.serialize(),
            continueOn: this.environmentMainService.continueOn,
            cssModules: this.cssDevelopmentService.isEnabled
                ? await this.cssDevelopmentService.getCssModules()
                : undefined,
        };
        // New window
        if (!window) {
            const state = this.windowsStateHandler.getNewWindowState(configuration);
            // Create the window
            mark('code/willCreateCodeWindow');
            const createdWindow = (window = this.instantiationService.createInstance(CodeWindow, {
                state,
                extensionDevelopmentPath: configuration.extensionDevelopmentPath,
                isExtensionTestHost: !!configuration.extensionTestsPath,
            }));
            mark('code/didCreateCodeWindow');
            // Add as window tab if configured (macOS only)
            if (options.forceNewTabbedWindow) {
                const activeWindow = this.getLastActiveWindow();
                activeWindow?.addTabbedWindow(createdWindow);
            }
            // Add to our list of windows
            this.windows.set(createdWindow.id, createdWindow);
            // Indicate new window via event
            this._onDidOpenWindow.fire(createdWindow);
            // Indicate number change via event
            this._onDidChangeWindowsCount.fire({
                oldCount: this.getWindowCount() - 1,
                newCount: this.getWindowCount(),
            });
            // Window Events
            const disposables = new DisposableStore();
            disposables.add(createdWindow.onDidSignalReady(() => this._onDidSignalReadyWindow.fire(createdWindow)));
            disposables.add(Event.once(createdWindow.onDidClose)(() => this.onWindowClosed(createdWindow, disposables)));
            disposables.add(Event.once(createdWindow.onDidDestroy)(() => this.onWindowDestroyed(createdWindow)));
            disposables.add(createdWindow.onDidMaximize(() => this._onDidMaximizeWindow.fire(createdWindow)));
            disposables.add(createdWindow.onDidUnmaximize(() => this._onDidUnmaximizeWindow.fire(createdWindow)));
            disposables.add(createdWindow.onDidEnterFullScreen(() => this._onDidChangeFullScreen.fire({ window: createdWindow, fullscreen: true })));
            disposables.add(createdWindow.onDidLeaveFullScreen(() => this._onDidChangeFullScreen.fire({ window: createdWindow, fullscreen: false })));
            disposables.add(createdWindow.onDidTriggerSystemContextMenu(({ x, y }) => this._onDidTriggerSystemContextMenu.fire({ window: createdWindow, x, y })));
            const webContents = assertIsDefined(createdWindow.win?.webContents);
            webContents.removeAllListeners('devtools-reload-page'); // remove built in listener so we can handle this on our own
            disposables.add(Event.fromNodeEventEmitter(webContents, 'devtools-reload-page')(() => this.lifecycleMainService.reload(createdWindow)));
            // Lifecycle
            this.lifecycleMainService.registerWindow(createdWindow);
        }
        // Existing window
        else {
            // Some configuration things get inherited if the window is being reused and we are
            // in extension development host mode. These options are all development related.
            const currentWindowConfig = window.config;
            if (!configuration.extensionDevelopmentPath &&
                currentWindowConfig?.extensionDevelopmentPath) {
                configuration.extensionDevelopmentPath = currentWindowConfig.extensionDevelopmentPath;
                configuration.extensionDevelopmentKind = currentWindowConfig.extensionDevelopmentKind;
                configuration['enable-proposed-api'] = currentWindowConfig['enable-proposed-api'];
                configuration.verbose = currentWindowConfig.verbose;
                configuration['inspect-extensions'] = currentWindowConfig['inspect-extensions'];
                configuration['inspect-brk-extensions'] = currentWindowConfig['inspect-brk-extensions'];
                configuration.debugId = currentWindowConfig.debugId;
                configuration.extensionEnvironment = currentWindowConfig.extensionEnvironment;
                configuration['extensions-dir'] = currentWindowConfig['extensions-dir'];
                configuration['disable-extensions'] = currentWindowConfig['disable-extensions'];
                configuration['disable-extension'] = currentWindowConfig['disable-extension'];
            }
            configuration.loggers = configuration.loggers;
        }
        // Update window identifier and session now
        // that we have the window object in hand.
        configuration.windowId = window.id;
        // If the window was already loaded, make sure to unload it
        // first and only load the new configuration if that was
        // not vetoed
        if (window.isReady) {
            this.lifecycleMainService.unload(window, 4 /* UnloadReason.LOAD */).then(async (veto) => {
                if (!veto) {
                    await this.doOpenInBrowserWindow(window, configuration, options, defaultProfile);
                }
            });
        }
        else {
            await this.doOpenInBrowserWindow(window, configuration, options, defaultProfile);
        }
        return window;
    }
    async doOpenInBrowserWindow(window, configuration, options, defaultProfile) {
        // Register window for backups unless the window
        // is for extension development, where we do not
        // keep any backups.
        if (!configuration.extensionDevelopmentPath) {
            if (isWorkspaceIdentifier(configuration.workspace)) {
                configuration.backupPath = this.backupMainService.registerWorkspaceBackup({
                    workspace: configuration.workspace,
                    remoteAuthority: configuration.remoteAuthority,
                });
            }
            else if (isSingleFolderWorkspaceIdentifier(configuration.workspace)) {
                configuration.backupPath = this.backupMainService.registerFolderBackup({
                    folderUri: configuration.workspace.uri,
                    remoteAuthority: configuration.remoteAuthority,
                });
            }
            else {
                // Empty windows are special in that they provide no workspace on
                // their configuration. To properly register them with the backup
                // service, we either use the provided associated `backupFolder`
                // in case we restore a previously opened empty window or we have
                // to generate a new empty window workspace identifier to be used
                // as `backupFolder`.
                configuration.backupPath = this.backupMainService.registerEmptyWindowBackup({
                    backupFolder: options.emptyWindowBackupInfo?.backupFolder ?? createEmptyWorkspaceIdentifier().id,
                    remoteAuthority: configuration.remoteAuthority,
                });
            }
        }
        const workspace = configuration.workspace ?? toWorkspaceIdentifier(configuration.backupPath, false);
        const profilePromise = this.resolveProfileForBrowserWindow(options, workspace, defaultProfile);
        const profile = profilePromise instanceof Promise ? await profilePromise : profilePromise;
        configuration.profiles.profile = profile;
        if (!configuration.extensionDevelopmentPath) {
            // Associate the configured profile to the workspace
            // unless the window is for extension development,
            // where we do not persist the associations
            await this.userDataProfilesMainService.setProfileForWorkspace(workspace, profile);
        }
        // Load it
        window.load(configuration);
    }
    resolveProfileForBrowserWindow(options, workspace, defaultProfile) {
        if (options.forceProfile) {
            return (this.userDataProfilesMainService.profiles.find((p) => p.name === options.forceProfile) ??
                this.userDataProfilesMainService.createNamedProfile(options.forceProfile));
        }
        if (options.forceTempProfile) {
            return this.userDataProfilesMainService.createTransientProfile();
        }
        return this.userDataProfilesMainService.getProfileForWorkspace(workspace) ?? defaultProfile;
    }
    onWindowClosed(window, disposables) {
        // Remove from our list so that Electron can clean it up
        this.windows.delete(window.id);
        // Emit
        this._onDidChangeWindowsCount.fire({
            oldCount: this.getWindowCount() + 1,
            newCount: this.getWindowCount(),
        });
        // Clean up
        disposables.dispose();
    }
    onWindowDestroyed(window) {
        // Remove from our list so that Electron can clean it up
        this.windows.delete(window.id);
        // Emit
        this._onDidDestroyWindow.fire(window);
    }
    getFocusedWindow() {
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
            return this.getWindowById(window.id);
        }
        return undefined;
    }
    getLastActiveWindow() {
        return this.doGetLastActiveWindow(this.getWindows());
    }
    getLastActiveWindowForAuthority(remoteAuthority) {
        return this.doGetLastActiveWindow(this.getWindows().filter((window) => isEqualAuthority(window.remoteAuthority, remoteAuthority)));
    }
    doGetLastActiveWindow(windows) {
        return getLastFocused(windows);
    }
    sendToFocused(channel, ...args) {
        const focusedWindow = this.getFocusedWindow() || this.getLastActiveWindow();
        focusedWindow?.sendWhenReady(channel, CancellationToken.None, ...args);
    }
    sendToOpeningWindow(channel, ...args) {
        this._register(Event.once(this.onDidSignalReadyWindow)((window) => {
            window.sendWhenReady(channel, CancellationToken.None, ...args);
        }));
    }
    sendToAll(channel, payload, windowIdsToIgnore) {
        for (const window of this.getWindows()) {
            if (windowIdsToIgnore && windowIdsToIgnore.indexOf(window.id) >= 0) {
                continue; // do not send if we are instructed to ignore it
            }
            window.sendWhenReady(channel, CancellationToken.None, payload);
        }
    }
    getWindows() {
        return Array.from(this.windows.values());
    }
    getWindowCount() {
        return this.windows.size;
    }
    getWindowById(windowId) {
        return this.windows.get(windowId);
    }
    getWindowByWebContents(webContents) {
        const browserWindow = BrowserWindow.fromWebContents(webContents);
        if (!browserWindow) {
            return undefined;
        }
        const window = this.getWindowById(browserWindow.id);
        return window?.matches(webContents) ? window : undefined;
    }
};
WindowsMainService = __decorate([
    __param(4, ILogService),
    __param(5, ILoggerMainService),
    __param(6, IStateService),
    __param(7, IPolicyService),
    __param(8, IEnvironmentMainService),
    __param(9, IUserDataProfilesMainService),
    __param(10, ILifecycleMainService),
    __param(11, IBackupMainService),
    __param(12, IConfigurationService),
    __param(13, IWorkspacesHistoryMainService),
    __param(14, IWorkspacesManagementMainService),
    __param(15, IInstantiationService),
    __param(16, IDialogMainService),
    __param(17, IFileService),
    __param(18, IProtocolMainService),
    __param(19, IThemeMainService),
    __param(20, IAuxiliaryWindowsMainService),
    __param(21, ICSSDevelopmentService)
], WindowsMainService);
export { WindowsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy9lbGVjdHJvbi1tYWluL3dpbmRvd3NNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBZSxLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzVDLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLHVCQUF1QixFQUN2QixnQkFBZ0IsRUFDaEIsU0FBUyxHQUNULE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUks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