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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3dzL2VsZWN0cm9uLW1haW4vd2luZG93c01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFlLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDNUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsdUJBQXVCLEVBQ3ZCLGdCQUFnQixFQUNoQixTQUFTLEdBQ1QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUF1QixXQUFXLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IsY0FBYyxFQUNkLDJCQUEyQixHQUMzQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDckQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3pELE9BQU8sRUFPTixZQUFZLEVBQ1osY0FBYyxFQUNkLGlCQUFpQixHQUdqQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1QyxPQUFPLEVBTU4sY0FBYyxHQUNkLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMsZ0JBQWdCLEVBQ2hCLDZCQUE2QixHQUM3QixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBZ0IsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUU1RSxPQUFPLEVBQ04seUJBQXlCLEVBR3pCLGlDQUFpQyxFQUNqQyxxQkFBcUIsRUFFckIscUJBQXFCLEdBQ3JCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixrQ0FBa0MsRUFDbEMsc0JBQXNCLEdBQ3RCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDOUcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFFcEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFHakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRXRHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQXFHekQsTUFBTSxZQUFZLEdBQWdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7QUFVckQsU0FBUyxxQkFBcUIsQ0FBQyxJQUE2QjtJQUMzRCxPQUFPLHFCQUFxQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUM5QyxDQUFDO0FBRUQsU0FBUyxpQ0FBaUMsQ0FDekMsSUFBNkI7SUFFN0IsT0FBTyxpQ0FBaUMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7QUFDMUQsQ0FBQztBQUVELFlBQVk7QUFFTCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFxQ2pELFlBQ2tCLFNBQWlCLEVBQ2pCLEtBQWEsRUFDYixXQUFtQixFQUNuQixjQUFtQyxFQUN2QyxVQUF3QyxFQUNqQyxhQUFrRCxFQUN2RCxZQUEyQixFQUMxQixhQUE4QyxFQUNyQyxzQkFBZ0UsRUFFekYsMkJBQTBFLEVBQ25ELG9CQUE0RCxFQUMvRCxpQkFBc0QsRUFDbkQsb0JBQTRELEVBRW5GLDRCQUE0RSxFQUU1RSwrQkFBa0YsRUFDM0Qsb0JBQTRELEVBQy9ELGlCQUFzRCxFQUM1RCxXQUEwQyxFQUNsQyxtQkFBMEQsRUFDN0QsZ0JBQW9ELEVBRXZFLDJCQUEwRSxFQUNsRCxxQkFBOEQ7UUFFdEYsS0FBSyxFQUFFLENBQUE7UUEzQlUsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsbUJBQWMsR0FBZCxjQUFjLENBQXFCO1FBQ3RCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDaEIsa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBRXJDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNwQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBRXhFLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBOEI7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2xDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFbEUsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUUzRCxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO1FBQzFDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDOUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUMzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNqQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQzVDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFFdEQsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE4QjtRQUNqQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBNUR0RSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQTtRQUNyRSxvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7UUFFckMsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZSxDQUFDLENBQUE7UUFDNUUsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQTtRQUVuRCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQTtRQUN4RSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBRTNDLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3pELElBQUksT0FBTyxFQUE2QixDQUN4QyxDQUFBO1FBQ1EsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQTtRQUVyRCx5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQTtRQUN6RSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRTdDLDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWUsQ0FBQyxDQUFBO1FBQzNFLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFakQsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkQsSUFBSSxPQUFPLEVBQWdELENBQzNELENBQUE7UUFDUSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBRWpELG1DQUE4QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQy9ELElBQUksT0FBTyxFQUFpRCxDQUM1RCxDQUFBO1FBQ1Esa0NBQTZCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEtBQUssQ0FBQTtRQUVqRSxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUE7UUFrQ3hELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN4QyxJQUFJLG1CQUFtQixDQUN0QixJQUFJLEVBQ0osWUFBWSxFQUNaLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsb0JBQW9CLENBQ3pCLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsNERBQTREO1FBQzVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLCtCQUErQixDQUFDLG1CQUFtQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDbEUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQy9DLENBQ0QsQ0FBQTtRQUVELG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3RDLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSx3QkFBd0IsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2xGLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7Z0JBQ3pDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FDOUUsQ0FBQTtnQkFFRCw2Q0FBNkM7Z0JBQzdDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO29CQUM1QyxLQUFLLE1BQU0sd0JBQXdCLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO3dCQUMvRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7b0JBQ3JGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCx1Q0FBdUM7Z0JBQ3ZDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUN0QyxXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQzNFLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELGVBQWUsQ0FDZCxVQUFtQyxFQUNuQyxPQUFpQztRQUVqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFBO1FBQzVDLE1BQU0sZUFBZSxHQUFHLE9BQU8sRUFBRSxlQUFlLElBQUksU0FBUyxDQUFBO1FBQzdELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQTtRQUN2QixNQUFNLGdCQUFnQixHQUFHLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQTtRQUNsRCxNQUFNLGNBQWMsR0FBRyxDQUFDLGdCQUFnQixDQUFBO1FBRXhDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztZQUNoQixHQUFHLFVBQVU7WUFDYixHQUFHO1lBQ0gsVUFBVTtZQUNWLGNBQWM7WUFDZCxnQkFBZ0I7WUFDaEIsZUFBZTtZQUNmLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxnQkFBZ0I7WUFDM0MsWUFBWSxFQUFFLE9BQU8sRUFBRSxZQUFZO1NBQ25DLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxNQUFtQixFQUFFLFVBQThCO1FBQ3JFLHdCQUF3QjtRQUN4QixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFZCxnQkFBZ0I7UUFDaEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBOEI7UUFDeEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUU1QywyRUFBMkU7UUFDM0UsSUFDQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUM3QyxDQUFDLFVBQVUsQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUN6RCxDQUFDO1lBQ0YsVUFBVSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7WUFDMUIsVUFBVSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7UUFDOUIsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUF1QyxFQUFFLENBQUE7UUFDM0QsTUFBTSxlQUFlLEdBQXVDLEVBQUUsQ0FBQTtRQUU5RCxNQUFNLGFBQWEsR0FBdUMsRUFBRSxDQUFBO1FBRTVELE1BQU0sZ0JBQWdCLEdBQTJCLEVBQUUsQ0FBQTtRQUNuRCxNQUFNLDJCQUEyQixHQUEyQixFQUFFLENBQUE7UUFFOUQsTUFBTSxnQ0FBZ0MsR0FBNkIsRUFBRSxDQUFBO1FBRXJFLElBQUksV0FBcUMsQ0FBQTtRQUN6QyxJQUFJLG9CQUFvQixHQUFHLEtBQUssQ0FBQTtRQUVoQywyQ0FBMkM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3pELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3JFLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFLENBQUM7WUFDaEMsSUFBSSxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDeEIsaUVBQWlFO29CQUNqRSwrREFBK0Q7b0JBQy9ELFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3hCLENBQUM7cUJBQU0sSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2xDLG9FQUFvRTtvQkFDcEUsbUVBQW1FO29CQUNuRSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMzQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDekIsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsQixXQUFXLEdBQUc7d0JBQ2IsbUJBQW1CLEVBQUUsRUFBRTt3QkFDdkIsV0FBVyxFQUFFLEVBQUU7d0JBQ2YsWUFBWSxFQUFFLEVBQUU7d0JBQ2hCLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtxQkFDckMsQ0FBQTtnQkFDRixDQUFDO2dCQUNELFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDM0MsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDNUIsZ0NBQWdDLENBQUMsSUFBSSxDQUFDO29CQUNyQyxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7b0JBQ3ZDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtpQkFDckMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG9CQUFvQixHQUFHLElBQUksQ0FBQSxDQUFDLDRGQUE0RjtZQUN6SCxDQUFDO1FBQ0YsQ0FBQztRQUVELHdFQUF3RTtRQUN4RSxJQUFJLFVBQVUsQ0FBQyxRQUFRLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdkYsV0FBVyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyRSxXQUFXLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFBO1FBQ3JDLENBQUM7UUFFRCwwRUFBMEU7UUFDMUUsSUFBSSxVQUFVLENBQUMsU0FBUyxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsbUJBQW1CLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pGLFdBQVcsQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdEUsV0FBVyxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtZQUNwQyxXQUFXLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQTtRQUM3QixDQUFDO1FBRUQsZ0VBQWdFO1FBQ2hFLElBQUksV0FBVyxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2pELFdBQVcsQ0FBQyxXQUFXLEdBQUc7Z0JBQ3pCLEtBQUssRUFBRSxRQUFRLENBQUM7b0JBQ2YsR0FBRyxXQUFXLENBQUMsV0FBVztvQkFDMUIsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUM7b0JBQ2pFLEdBQUcsV0FBVyxDQUFDLG1CQUFtQjtpQkFDbEMsQ0FBQztnQkFDRixpQkFBaUIsRUFBRSxVQUFVLENBQUMsaUJBQWlCO2FBQy9DLENBQUE7UUFDRixDQUFDO1FBRUQsOEdBQThHO1FBQzlHLElBQUksVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQy9CLDBDQUEwQztZQUMxQywyQkFBMkIsQ0FBQyxJQUFJLENBQy9CLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLHFCQUFxQixFQUFFLENBQy9ELENBQUE7WUFDRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRywyQkFBMkIsQ0FBQyxDQUFBO1lBRXJELGlEQUFpRDtZQUNqRCxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7YUFBTSxDQUFDO1lBQ1AsZ0NBQWdDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUN0RSxVQUFVLEVBQ1YsZ0JBQWdCLEVBQ2hCLGFBQWEsRUFDYixnQ0FBZ0MsRUFDaEMsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxZQUFZLEVBQ1osZUFBZSxDQUNmLENBQUE7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIseUNBQXlDLFdBQVcsQ0FBQyxNQUFNLHVCQUF1QixnQkFBZ0IsQ0FBQyxNQUFNLG9CQUFvQixhQUFhLENBQUMsTUFBTSxxQkFBcUIsZ0NBQWdDLENBQUMsTUFBTSwyQkFBMkIsb0JBQW9CLEdBQUcsQ0FDL1AsQ0FBQTtRQUVELGtGQUFrRjtRQUNsRixJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsbUVBQW1FO1lBQ25FLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFDekIsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDNUIsQ0FBQztZQUVELHFEQUFxRDtpQkFDaEQsQ0FBQztnQkFDTCxNQUFNLGVBQWUsR0FDcEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0I7b0JBQy9DLENBQUMsVUFBVSxDQUFDLFVBQVU7b0JBQ3RCLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTTtvQkFDeEIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztvQkFDM0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztvQkFDN0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDekQsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFBO2dCQUMxQixJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUE7Z0JBRTFCLDBFQUEwRTtnQkFDMUUsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDckIsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUMxQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ1YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0I7d0JBQy9DLE1BQU0sQ0FBQyxVQUFVLEtBQUssSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQ2pGLENBQUE7b0JBQ0QsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDN0IsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUE7d0JBQzNCLGVBQWUsR0FBRyxLQUFLLENBQUE7d0JBQ3ZCLGVBQWUsR0FBRyxLQUFLLENBQUE7b0JBQ3hCLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCwyRUFBMkU7Z0JBQzNFLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3JCLEtBQUssSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUNsRCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQ2pDLElBQ0MsQ0FBQyxVQUFVLENBQUMsZUFBZTs0QkFDMUIsMkJBQTJCLENBQUMsSUFBSSxDQUMvQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQ2IsVUFBVSxDQUFDLGVBQWU7Z0NBQzFCLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUN6RCxDQUFDLElBQUksK0JBQStCOzRCQUN0QyxDQUFDLFVBQVUsQ0FBQyxVQUFVO2dDQUNyQixnQ0FBZ0MsQ0FBQyxJQUFJLENBQ3BDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDVCxVQUFVLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxZQUFZLEtBQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FDaEYsQ0FBQyxDQUFDLGtDQUFrQzswQkFDckMsQ0FBQzs0QkFDRixTQUFRO3dCQUNULENBQUM7d0JBRUQsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO3dCQUNsQixlQUFlLEdBQUcsS0FBSyxDQUFBO3dCQUN2QixNQUFLO29CQUNOLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCx1RUFBdUU7Z0JBQ3ZFLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3JCLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUM1QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxpRkFBaUY7UUFDakYsa0dBQWtHO1FBQ2xHLE1BQU0sTUFBTSxHQUFHLFdBQVcsSUFBSSxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDaEUsTUFBTSxPQUFPLEdBQUcsV0FBVyxJQUFJLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNsRSxJQUNDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDO1lBQ2hFLENBQUMsTUFBTTtZQUNQLENBQUMsT0FBTztZQUNSLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFDeEIsQ0FBQztZQUNGLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTtZQUM3QixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUN0QyxJQUNDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQztvQkFDakMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLCtDQUErQyxFQUNwRSxDQUFDO29CQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUM7d0JBQ1osS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLO3dCQUN2QixTQUFTLEVBQUUsVUFBVSxDQUFDLFNBQVM7d0JBQy9CLGVBQWUsRUFBRSxVQUFVLENBQUMsZUFBZTtxQkFDM0MsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sSUFBSSxpQ0FBaUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO29CQUMxRCxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNaLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSzt3QkFDdkIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRzt3QkFDbkMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxlQUFlO3FCQUMzQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztxQkFBTSxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDWixLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7d0JBQ3ZCLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTzt3QkFDM0IsZUFBZSxFQUFFLFVBQVUsQ0FBQyxlQUFlO3FCQUMzQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUVELGdCQUFnQjtRQUNoQixJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRWxELE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxVQUE4QixFQUFFLFdBQTBCO1FBQ3RGLCtGQUErRjtRQUMvRiw0RkFBNEY7UUFDNUYsdUVBQXVFO1FBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFBO1FBQ3RELElBQ0MsVUFBVSxDQUFDLE9BQU8sNEJBQW9CO1lBQ3RDLGlCQUFpQjtZQUNqQixXQUFXLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDeEIsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUNiLENBQUM7WUFDRixDQUFDO1lBQUEsQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDWixNQUFNLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQTtnQkFFdkMsSUFBSSxDQUFDO29CQUNKLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtnQkFDOUMsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQiwyREFBMkQ7Z0JBQzVELENBQUM7WUFDRixDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ0wsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTSxDQUNuQixVQUE4QixFQUM5QixnQkFBd0MsRUFDeEMsYUFBaUQsRUFDakQsY0FBd0MsRUFDeEMsb0JBQTZCLEVBQzdCLFdBQXFDLEVBQ3JDLFlBQWdELEVBQ2hELGVBQW1EO1FBRW5ELDBDQUEwQztRQUMxQywyQ0FBMkM7UUFDM0MsTUFBTSxXQUFXLEdBQWtCLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLG1CQUFtQixHQUE0QixTQUFTLENBQUE7UUFDNUQsU0FBUyxhQUFhLENBQUMsTUFBbUIsRUFBRSxXQUFxQjtZQUNoRSxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXhCLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLG1CQUFtQixHQUFHLE1BQU0sQ0FBQTtnQkFDNUIsV0FBVyxHQUFHLFNBQVMsQ0FBQSxDQUFDLG1EQUFtRDtZQUM1RSxDQUFDO1FBQ0YsQ0FBQztRQUVELGlFQUFpRTtRQUNqRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFMUYsaUdBQWlHO1FBQ2pHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNGLE1BQU0sU0FBUyxHQUNkLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxJQUFJLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFBO1lBQzlFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3hFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdEIsYUFBYSxDQUNaLElBQUksQ0FBQyxrQ0FBa0MsQ0FDdEMsZ0JBQWdCLEVBQ2hCLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQzVELGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQ3JFLENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsb0dBQW9HO1FBQ3BHLG9GQUFvRjtRQUNwRixNQUFNLHdCQUF3QixHQUM3QixhQUFhLENBQUMsTUFBTSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFBO1FBQ3ZFLElBQUksV0FBVyxJQUFJLHdCQUF3QixLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25ELHVEQUF1RDtZQUN2RCxNQUFNLFdBQVcsR0FDaEIsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztnQkFDbEMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyxxQ0FBcUM7WUFFbEUsa0RBQWtEO1lBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxNQUFNLENBQ3ZDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDVixXQUFXLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsZUFBZSxDQUFDLENBQ3JGLENBQUE7WUFFRCx1REFBdUQ7WUFDdkQsNkNBQTZDO1lBQzdDLEVBQUU7WUFDRixzREFBc0Q7WUFDdEQsYUFBYTtZQUNiLElBQUksbUJBQW1CLEdBQTRCLFNBQVMsQ0FBQTtZQUM1RCxJQUFJLFdBQVcsRUFBRSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUNuRCxJQUNDLFVBQVUsQ0FBQyxPQUFPLGdDQUF3QjtvQkFDMUMsVUFBVSxDQUFDLE9BQU8sNEJBQW9CO29CQUN0QyxVQUFVLENBQUMsT0FBTyw2QkFBcUI7b0JBQ3ZDLFVBQVUsQ0FBQyxPQUFPLDZCQUFxQixFQUN0QyxDQUFDO29CQUNGLG1CQUFtQixHQUFHLE1BQU0sZ0JBQWdCLENBQzNDLE9BQU8sRUFDUCxXQUFXLENBQUMsT0FBTyxFQUNuQixLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FDbkIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUk7d0JBQzNDLENBQUMsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQzt3QkFDbEYsQ0FBQyxDQUFDLFNBQVMsQ0FDYixDQUFBO2dCQUNGLENBQUM7Z0JBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7b0JBQzFCLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDMUQsQ0FBQztZQUNGLENBQUM7WUFFRCx5Q0FBeUM7WUFDekMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixzQkFBc0I7Z0JBQ3RCLElBQUkscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDaEUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO3dCQUNyQixTQUFTLEVBQUUsbUJBQW1CLENBQUMsZUFBZTt3QkFDOUMsZUFBZSxFQUFFLG1CQUFtQixDQUFDLGVBQWU7cUJBQ3BELENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELDBCQUEwQjtxQkFDckIsSUFBSSxpQ0FBaUMsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO29CQUNqRixhQUFhLENBQUMsSUFBSSxDQUFDO3dCQUNsQixTQUFTLEVBQUUsbUJBQW1CLENBQUMsZUFBZTt3QkFDOUMsZUFBZSxFQUFFLG1CQUFtQixDQUFDLGVBQWU7cUJBQ3BELENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELGtCQUFrQjtxQkFDYixDQUFDO29CQUNMLGFBQWEsQ0FDWixJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxFQUM5RSxJQUFJLENBQ0osQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELG1GQUFtRjtpQkFDOUUsQ0FBQztnQkFDTCxhQUFhLENBQ1osTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUM7b0JBQzlCLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTztvQkFDM0IsR0FBRyxFQUFFLFVBQVUsQ0FBQyxHQUFHO29CQUNuQixjQUFjLEVBQUUsVUFBVSxDQUFDLGNBQWM7b0JBQ3pDLFdBQVc7b0JBQ1gsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLGVBQWUsRUFBRSxXQUFXLENBQUMsZUFBZTtvQkFDNUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQjtvQkFDckQsWUFBWSxFQUFFLFVBQVUsQ0FBQyxZQUFZO29CQUNyQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCO2lCQUM3QyxDQUFDLEVBQ0YsSUFBSSxDQUNKLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELHdEQUF3RDtRQUN4RCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxDQUFDLHFCQUFxQjtRQUNuSCxJQUFJLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQywrQkFBK0I7WUFDL0IsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQ2xDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQzNDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxlQUFlLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUN0RixDQUNELENBQUE7WUFDRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDL0MsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FDM0MsV0FBVyxFQUFFLGVBQWUsRUFDNUIsaUJBQWlCLENBQUMsZUFBZSxDQUNqQztvQkFDQSxDQUFDLENBQUMsV0FBVztvQkFDYixDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUVaLGdCQUFnQjtnQkFDaEIsYUFBYSxDQUNaLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsRUFDcEYsQ0FBQyxDQUFDLG1CQUFtQixDQUNyQixDQUFBO2dCQUVELHFCQUFxQixHQUFHLElBQUksQ0FBQSxDQUFDLHlEQUF5RDtZQUN2RixDQUFDO1lBRUQsc0JBQXNCO1lBQ3RCLEtBQUssTUFBTSxlQUFlLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFDbkQsSUFDQyxrQkFBa0IsQ0FBQyxJQUFJLENBQ3RCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDVixNQUFNLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRSxLQUFLLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUNyRixFQUNBLENBQUM7b0JBQ0YsU0FBUSxDQUFDLHVDQUF1QztnQkFDakQsQ0FBQztnQkFFRCxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsZUFBZSxDQUFBO2dCQUN2RCxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsZUFBZSxDQUFDO29CQUMxRixDQUFDLENBQUMsV0FBVztvQkFDYixDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUVaLGlCQUFpQjtnQkFDakIsYUFBYSxDQUNaLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUNqQyxVQUFVLEVBQ1YsZUFBZSxFQUNmLHFCQUFxQixFQUNyQixtQkFBbUIsQ0FDbkIsRUFDRCxDQUFDLENBQUMsbUJBQW1CLENBQ3JCLENBQUE7Z0JBRUQscUJBQXFCLEdBQUcsSUFBSSxDQUFBLENBQUMseURBQXlEO1lBQ3ZGLENBQUM7UUFDRixDQUFDO1FBRUQscURBQXFEO1FBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzNELDBCQUEwQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQ2pFLENBQUEsQ0FBQyxxQkFBcUI7UUFDdkIsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakMsK0JBQStCO1lBQy9CLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUNuQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUNyQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FDNUUsQ0FDRCxDQUFBO1lBQ0QsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sa0JBQWtCLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pELE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQzNDLFdBQVcsRUFBRSxlQUFlLEVBQzVCLGtCQUFrQixDQUFDLGVBQWUsQ0FDbEM7b0JBQ0EsQ0FBQyxDQUFDLFdBQVc7b0JBQ2IsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFFWixnQkFBZ0I7Z0JBQ2hCLGFBQWEsQ0FDWixJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixDQUFDLEVBQ3JGLENBQUMsQ0FBQyxtQkFBbUIsQ0FDckIsQ0FBQTtnQkFFRCxxQkFBcUIsR0FBRyxJQUFJLENBQUEsQ0FBQyx5REFBeUQ7WUFDdkYsQ0FBQztZQUVELHNCQUFzQjtZQUN0QixLQUFLLE1BQU0sWUFBWSxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQzdDLElBQ0MsbUJBQW1CLENBQUMsSUFBSSxDQUN2QixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ1YsaUNBQWlDLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztvQkFDekQsMEJBQTBCLENBQUMsT0FBTyxDQUNqQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFDMUIsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQzFCLENBQ0YsRUFDQSxDQUFDO29CQUNGLFNBQVEsQ0FBQyx1Q0FBdUM7Z0JBQ2pELENBQUM7Z0JBRUQsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQTtnQkFDcEQsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQztvQkFDMUYsQ0FBQyxDQUFDLFdBQVc7b0JBQ2IsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFFWixpQkFBaUI7Z0JBQ2pCLGFBQWEsQ0FDWixNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FDakMsVUFBVSxFQUNWLFlBQVksRUFDWixxQkFBcUIsRUFDckIsbUJBQW1CLENBQ25CLEVBQ0QsQ0FBQyxDQUFDLG1CQUFtQixDQUNyQixDQUFBO2dCQUVELHFCQUFxQixHQUFHLElBQUksQ0FBQSxDQUFDLHlEQUF5RDtZQUN2RixDQUFDO1FBQ0YsQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQSxDQUFDLHFCQUFxQjtRQUNyRyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxLQUFLLE1BQU0scUJBQXFCLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkQsTUFBTSxlQUFlLEdBQUcscUJBQXFCLENBQUMsZUFBZSxDQUFBO2dCQUM3RCxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsZUFBZSxDQUFDO29CQUMxRixDQUFDLENBQUMsV0FBVztvQkFDYixDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUVaLGFBQWEsQ0FDWixNQUFNLElBQUksQ0FBQyxXQUFXLENBQ3JCLFVBQVUsRUFDVixJQUFJLEVBQ0osZUFBZSxFQUNmLG1CQUFtQixFQUNuQixxQkFBcUIsQ0FDckIsRUFDRCxDQUFDLENBQUMsbUJBQW1CLENBQ3JCLENBQUE7Z0JBRUQscUJBQXFCLEdBQUcsSUFBSSxDQUFBLENBQUMseURBQXlEO1lBQ3ZGLENBQUM7UUFDRixDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLGdDQUFnQztRQUNoQyx3REFBd0Q7UUFDeEQsNkJBQTZCO1FBQzdCLElBQ0MsV0FBVztZQUNYLENBQUMsb0JBQW9CLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFDNUUsQ0FBQztZQUNGLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQTtZQUU5RixhQUFhLENBQ1osTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxDQUFDLEVBQ3ZGLENBQUMsQ0FBQyxXQUFXLENBQ2IsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxDQUFBO0lBQy9ELENBQUM7SUFFTywyQkFBMkIsQ0FDbEMsYUFBaUMsRUFDakMsTUFBbUIsRUFDbkIsV0FBMEI7UUFFMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNENBQTRDLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBRXBGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQSxDQUFDLG9EQUFvRDtRQUV4RixNQUFNLE1BQU0sR0FBMkI7WUFDdEMsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLG1CQUFtQjtZQUNyRCxXQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVc7WUFDckMsWUFBWSxFQUFFLFdBQVcsRUFBRSxZQUFZO1lBQ3ZDLFdBQVcsRUFBRSxXQUFXLEVBQUUsV0FBVztZQUNyQyxXQUFXLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQztTQUNyRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFeEUsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sc0JBQXNCLENBQUMsVUFBdUI7UUFDckQsSUFBSSxhQUFhLEdBQW1DLFVBQVUsQ0FBQTtRQUU5RCxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUN0RCxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsRUFBRSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6RCxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxzQkFBc0IsQ0FDdkYsYUFBYSxDQUFDLFdBQVcsQ0FDekIsQ0FBQTtZQUNELElBQUksd0JBQXdCLElBQUksd0JBQXdCLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDckYsYUFBYSxHQUFHLHdCQUF3QixDQUFBO1lBQ3pDLENBQUM7UUFDRixDQUFDO1FBRUQsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTyxrQ0FBa0MsQ0FDekMsTUFBbUIsRUFDbkIsWUFBbUIsRUFDbkIsZUFBc0I7UUFFdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsbURBQW1ELEVBQUU7WUFDMUUsWUFBWTtZQUNaLGVBQWU7U0FDZixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUEsQ0FBQyw2QkFBNkI7UUFFNUMsTUFBTSxPQUFPLEdBQTZCLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxhQUFhLENBQUMseUJBQXlCLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRWhGLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLFdBQVcsQ0FDbEIsVUFBOEIsRUFDOUIsY0FBdUIsRUFDdkIsZUFBbUMsRUFDbkMsV0FBcUMsRUFDckMscUJBQThDO1FBRTlDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFO1lBQ25ELE9BQU8sRUFBRSxDQUFDLENBQUMscUJBQXFCO1lBQ2hDLGVBQWU7WUFDZixXQUFXO1lBQ1gsY0FBYztTQUNkLENBQUMsQ0FBQTtRQUVGLElBQUksV0FBb0MsQ0FBQTtRQUN4QyxJQUFJLENBQUMsY0FBYyxJQUFJLE9BQU8sVUFBVSxDQUFDLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN2RSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUEsQ0FBQywyREFBMkQ7UUFDekgsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDO1lBQy9CLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTztZQUMzQixHQUFHLEVBQUUsVUFBVSxDQUFDLEdBQUc7WUFDbkIsY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjO1lBQ3pDLGVBQWU7WUFDZixjQUFjO1lBQ2Qsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQjtZQUNyRCxXQUFXO1lBQ1gsV0FBVztZQUNYLHFCQUFxQjtZQUNyQixZQUFZLEVBQUUsVUFBVSxDQUFDLFlBQVk7WUFDckMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQjtTQUM3QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sdUJBQXVCLENBQzlCLFVBQThCLEVBQzlCLGlCQUEwRSxFQUMxRSxjQUF1QixFQUN2QixXQUFxQyxFQUNyQyxXQUF5QjtRQUV6QixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRTtZQUMvRCxpQkFBaUI7WUFDakIsV0FBVztTQUNYLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxXQUFXLElBQUksT0FBTyxVQUFVLENBQUMsZUFBZSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3ZGLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQSxDQUFDLDJEQUEyRDtRQUN6SCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUM7WUFDL0IsU0FBUyxFQUFFLGlCQUFpQixDQUFDLFNBQVM7WUFDdEMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO1lBQzNCLEdBQUcsRUFBRSxVQUFVLENBQUMsR0FBRztZQUNuQixjQUFjLEVBQUUsVUFBVSxDQUFDLGNBQWM7WUFDekMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLGVBQWU7WUFDbEQsY0FBYztZQUNkLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0I7WUFDckQsV0FBVztZQUNYLFdBQVc7WUFDWCxZQUFZLEVBQUUsVUFBVSxDQUFDLFlBQVk7WUFDckMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQjtTQUM3QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUE4QjtRQUMxRCxJQUFJLFdBQTBCLENBQUE7UUFDOUIsSUFBSSxzQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFDbEMsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7UUFFNUIsMEJBQTBCO1FBQzFCLElBQUksVUFBVSxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvRCxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDMUQsc0JBQXNCLEdBQUcsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFFRCx3QkFBd0I7YUFDbkIsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEMsV0FBVyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELDBCQUEwQjthQUNyQixJQUNKLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU07WUFDdkIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFDNUIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFDekIsQ0FBQztZQUNGLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDOUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM5QixXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBLENBQUMsMkVBQTJFO1lBQzNHLENBQUM7WUFFRCxzQkFBc0IsR0FBRyxJQUFJLENBQUE7UUFDOUIsQ0FBQztRQUVELHVDQUF1QzthQUNsQyxDQUFDO1lBQ0wsV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7WUFDcEQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM5QixXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBLENBQUMsNERBQTREO1lBQzVGLENBQUM7WUFFRCxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7UUFDeEIsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxnRkFBZ0Y7UUFDaEYsNkNBQTZDO1FBQzdDLHNFQUFzRTtRQUN0RSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUM3RSxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQzNGLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxlQUFlLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQTtnQkFDeEQsSUFDQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FDcEMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FDL0QsRUFDQSxDQUFDO29CQUNGLElBQUksU0FBMkMsQ0FBQTtvQkFFL0MsTUFBTSxtQ0FBbUMsR0FDeEMsTUFBTSxJQUFJLENBQUMsNENBQTRDLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFBO29CQUN4RixJQUFJLG1DQUFtQyxFQUFFLENBQUM7d0JBQ3pDLFNBQVMsR0FBRyxtQ0FBbUMsQ0FBQTtvQkFDaEQsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQywrQkFBK0IsQ0FBQyx1QkFBdUIsQ0FDN0UsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FDOUQsQ0FBQTtvQkFDRixDQUFDO29CQUVELDJDQUEyQztvQkFDM0MsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFBO29CQUNoRCxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUNyRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxtRUFBbUU7UUFDbkUsdUVBQXVFO1FBQ3ZFLDBDQUEwQztRQUMxQyx1RUFBdUU7UUFDdkUsbUJBQW1CO1FBQ25CLElBQ0MsVUFBVSxDQUFDLGNBQWM7WUFDekIsQ0FBQyxnQkFBZ0I7WUFDakIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBOEIsUUFBUSxDQUFDLEVBQUUsY0FBYztnQkFDeEYsVUFBVSxFQUNWLENBQUM7WUFDRixNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7WUFDL0QsV0FBVyxDQUFDLE9BQU8sQ0FDbEIsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQ3pCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDUixxQkFBcUIsQ0FBQyxJQUFJLENBQUM7Z0JBQzNCLGlDQUFpQyxDQUFDLElBQUksQ0FBQztnQkFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FDaEIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCLENBQUMsVUFBOEI7UUFDakUsTUFBTSxrQkFBa0IsR0FBd0I7WUFDL0MsWUFBWSxFQUFFLFVBQVUsQ0FBQyxZQUFZO1lBQ3JDLGVBQWUsRUFBRSxVQUFVLENBQUMsZUFBZTtTQUMzQyxDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNwQyxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFO1lBQzlELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtZQUV2RSxjQUFjO1lBQ2QsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUE7Z0JBRTdCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUVELDBDQUEwQztZQUMxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7WUFFakQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FDcEM7Z0JBQ0MsSUFBSSxFQUFFLE1BQU07Z0JBQ1osT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzlFLE9BQU8sRUFDTixHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO29CQUMxQixDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHFCQUFxQixDQUFDO29CQUN0RCxDQUFDLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHVCQUF1QixDQUFDO2dCQUN4RCxNQUFNLEVBQ0wsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSTtvQkFDMUIsQ0FBQyxDQUFDLFFBQVEsQ0FDUixvQkFBb0IsRUFDcEIsaURBQWlELEVBQ2pELFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUNuRTtvQkFDRixDQUFDLENBQUMsUUFBUSxDQUNSLGtCQUFrQixFQUNsQixtREFBbUQsRUFDbkQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDbEI7YUFDSixFQUNELGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLFNBQVMsQ0FDN0MsQ0FBQTtZQUVELE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLEdBQXFCO1FBQ3hELE1BQU0sV0FBVyxHQUFrQixFQUFFLENBQUE7UUFDckMsTUFBTSxrQkFBa0IsR0FBd0I7WUFDL0Msa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixZQUFZLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDdEIsZUFBZSxFQUFFLEdBQUcsQ0FBQyxNQUFNLElBQUksU0FBUztZQUN4Qyx3QkFBd0I7WUFDdkIsK0NBQStDO1lBQy9DLG9CQUFvQjtZQUNwQixvREFBb0Q7WUFDcEQsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7U0FDdEUsQ0FBQTtRQUVELGNBQWM7UUFDZCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDcEMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLGtCQUFrQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDM0MsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFO2dCQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUNoRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hCLE9BQU8sU0FBUyxDQUFBO2dCQUNqQixDQUFDO2dCQUVELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUE7WUFDL0QsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxZQUFZO1FBQ1osTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDekMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO2dCQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUM1QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2QsT0FBTyxTQUFTLENBQUE7Z0JBQ2pCLENBQUM7Z0JBRUQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUMxQix5QkFBeUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQy9FLGtCQUFrQixDQUNsQixDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ3pDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDckIsT0FBTyxrQkFBa0IsQ0FBQyxlQUFlO2dCQUN4QyxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQztnQkFDdkQsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUN2RCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFFL0MsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLFdBQVcsQ0FBQyxHQUFXO1FBQzlCLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDMUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEdBQUcsRUFBRSxDQUFDLENBQUE7Z0JBRXpFLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNmLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLENBQUM7WUFFRCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEdBQUcsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUN4RSxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUI7UUFDdEMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUU3RCxRQUFRLHFCQUFxQixFQUFFLENBQUM7WUFDL0IsNkJBQTZCO1lBQzdCLEtBQUssTUFBTTtnQkFDVixPQUFPLEVBQUUsQ0FBQTtZQUVWLDREQUE0RDtZQUM1RCwyQkFBMkI7WUFDM0IsNENBQTRDO1lBQzVDLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxLQUFLLENBQUM7WUFDWCxLQUFLLFVBQVUsQ0FBQztZQUNoQixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLG9DQUFvQztnQkFDcEMsTUFBTSxrQkFBa0IsR0FBbUIsRUFBRSxDQUFBO2dCQUM3QyxJQUFJLHFCQUFxQixLQUFLLEtBQUssRUFBRSxDQUFDO29CQUNyQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUN6RSxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO29CQUNyRCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUN6RSxDQUFDO2dCQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDcEMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxFQUFFO29CQUNsRCxhQUFhO29CQUNiLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2pDLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FDNUMsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUN4RDs0QkFDQyxlQUFlLEVBQUUsaUJBQWlCLENBQUMsZUFBZTs0QkFDbEQseUJBQXlCLEVBQUUsSUFBSSxDQUFDLHVEQUF1RDt5QkFDdkYsQ0FDRCxDQUFBO3dCQUNELElBQUkscUJBQXFCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQzs0QkFDdkMsT0FBTyxVQUFVLENBQUE7d0JBQ2xCLENBQUM7b0JBQ0YsQ0FBQztvQkFFRCxVQUFVO3lCQUNMLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ3RDLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FDNUMsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQzFDLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUN0RCxDQUFBO3dCQUNELElBQUksaUNBQWlDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQzs0QkFDbkQsT0FBTyxVQUFVLENBQUE7d0JBQ2xCLENBQUM7b0JBQ0YsQ0FBQztvQkFFRCx3REFBd0Q7eUJBQ25ELElBQUkscUJBQXFCLEtBQUssU0FBUyxJQUFJLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUM5RSxPQUFPOzRCQUNOLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVOzRCQUN4QyxlQUFlLEVBQUUsaUJBQWlCLENBQUMsZUFBZTt5QkFDbEQsQ0FBQTtvQkFDRixDQUFDO29CQUVELE9BQU8sU0FBUyxDQUFBO2dCQUNqQixDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUVELE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLHdCQUF3QjtRQUMvQixJQUFJLGNBQXFDLENBQUE7UUFDekMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUMsY0FBYyxHQUFHLEtBQUssQ0FBQSxDQUFDLHVEQUF1RDtRQUMvRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQThCLFFBQVEsQ0FBQyxDQUFBO1lBQzlGLGNBQWMsR0FBRyxZQUFZLEVBQUUsY0FBYyxJQUFJLEtBQUssQ0FBQSxDQUFDLGlDQUFpQztZQUV4RixJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQzdFLGNBQWMsR0FBRyxLQUFLLENBQUEsQ0FBQyxpQ0FBaUM7WUFDekQsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGNBQWMsQ0FBQTtJQUN0QixDQUFDO0lBRU8sS0FBSyxDQUFDLDRDQUE0QyxDQUN6RCxlQUFtQyxFQUNuQyxPQUEyQztRQUUzQyxNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUMzRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FDM0IsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFaEUsS0FBSyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksVUFBVSxFQUFFLENBQUM7WUFDeEMsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxxQkFBcUIsQ0FDekYsU0FBUyxDQUFDLFVBQVUsQ0FDcEIsQ0FBQTtZQUNELElBQ0MsQ0FBQyxpQkFBaUI7Z0JBQ2xCLGlCQUFpQixDQUFDLGVBQWUsS0FBSyxlQUFlO2dCQUNyRCxpQkFBaUIsQ0FBQyxTQUFTO2dCQUMzQixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxNQUFNLEVBQ2xELENBQUM7Z0JBQ0YsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUNyRCwwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FDaEQsQ0FBQTtZQUNELElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM1RSxPQUFPLGlCQUFpQixDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlLENBQzVCLFFBQXlCLEVBQ3pCLFVBQStCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBRWxELHNEQUFzRDtRQUN0RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM1QixPQUFPLEdBQUcsRUFBRSxHQUFHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsQ0FBQTtZQUN6RCxDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRU8sdUJBQXVCLENBQzlCLFFBQXlCLEVBQ3pCLE9BQTRCO1FBRTVCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU3QyxtQ0FBbUM7UUFDbkMsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQTtRQUUxRSxnQkFBZ0I7UUFDaEIsR0FBRyxHQUFHLDJCQUEyQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRXJELE9BQU87UUFDUCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVCLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUMxQixNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBRWhFLE9BQU87b0JBQ04sT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFDM0IsT0FBTyxFQUFFO3dCQUNSLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO3FCQUNqRjtvQkFDRCxlQUFlO2lCQUNmLENBQUE7WUFDRixDQUFDO1lBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLENBQUE7UUFDekMsQ0FBQztRQUVELFlBQVk7YUFDUCxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQTtRQUNuRSxDQUFDO1FBRUQsU0FBUztRQUNULE9BQU8sRUFBRSxTQUFTLEVBQUUsa0NBQWtDLENBQUMsR0FBRyxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUE7SUFDL0UsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFFBQXlCO1FBQ3JELElBQUksaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLFFBQVEsQ0FBQyxZQUFZLENBQUE7UUFDN0IsQ0FBQztRQUVELElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDOUIsT0FBTyxRQUFRLENBQUMsU0FBUyxDQUFBO1FBQzFCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUE7SUFDeEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FDOUIsSUFBWSxFQUNaLE9BQTRCLEVBQzVCLGtCQUE0QjtRQUU1Qix5Q0FBeUM7UUFDekMsSUFBSSxVQUE4QixDQUFBO1FBQ2xDLElBQUksWUFBZ0MsQ0FBQTtRQUNwQyxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMxQixDQUFDO1lBQUEsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLENBQUM7UUFFRCw2Q0FBNkM7UUFDN0MsSUFBSSxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBRS9DLElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFN0MsT0FBTztZQUNQLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQ3ZCLHVDQUF1QztnQkFDdkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO29CQUN2QyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxxQkFBcUIsQ0FDakYsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDZCxDQUFBO29CQUNELElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ2YscURBQXFEO3dCQUNyRCxtQ0FBbUM7d0JBQ25DLElBQUksU0FBUyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMseUJBQXlCLEVBQUUsQ0FBQzs0QkFDOUQsT0FBTyxTQUFTLENBQUE7d0JBQ2pCLENBQUM7d0JBRUQsT0FBTzs0QkFDTixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRTs0QkFDakUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJOzRCQUNuQixNQUFNLEVBQUUsSUFBSTs0QkFDWixlQUFlLEVBQUUsU0FBUyxDQUFDLGVBQWU7NEJBQzFDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUzt5QkFDOUIsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsT0FBTztvQkFDTixPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ3ZCLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtvQkFDbkIsTUFBTSxFQUFFLElBQUk7b0JBQ1osT0FBTyxFQUFFO3dCQUNSLFNBQVMsRUFBRSxVQUFVOzRCQUNwQixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLElBQUksQ0FBQyxFQUFFOzRCQUNqRSxDQUFDLENBQUMsU0FBUztxQkFDWjtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELFNBQVM7aUJBQ0osSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztnQkFDakMsT0FBTztvQkFDTixTQUFTLEVBQUUsa0NBQWtDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUM7b0JBQ3ZFLElBQUksRUFBRSxRQUFRLENBQUMsU0FBUztvQkFDeEIsTUFBTSxFQUFFLElBQUk7aUJBQ1osQ0FBQTtZQUNGLENBQUM7WUFFRCxxRUFBcUU7WUFDckUsb0VBQW9FO1lBQ3BFLHFFQUFxRTtZQUNyRSxjQUFjO2lCQUNULElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUM3QyxPQUFPO29CQUNOLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDdkIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO29CQUNuQixNQUFNLEVBQUUsSUFBSTtpQkFDWixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSywwQkFBMEIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3RFLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUU5QixnRUFBZ0U7WUFDaEUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUVqRSxnREFBZ0Q7WUFDaEQsSUFBSSxPQUFPLENBQUMsa0JBQWtCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDM0QsT0FBTztvQkFDTixPQUFPO29CQUNQLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtvQkFDbkIsTUFBTSxFQUFFLEtBQUs7aUJBQ2IsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsSUFBSSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUNoQyxJQUFZLEVBQ1osT0FBNEI7UUFFNUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUUxQixNQUFNLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztZQUNqRixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRTtnQkFDUixRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUM7Z0JBQ3pFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQztnQkFDM0UsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDO2FBQ2xGO1lBQ0QsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsb0JBQW9CLEVBQ3BCLDRGQUE0RixFQUM1RixHQUFHLENBQUMsU0FBUyxDQUNiO1lBQ0QsTUFBTSxFQUFFLFFBQVEsQ0FDZixtQkFBbUIsRUFDbkIsc0dBQXNHLEVBQ3RHLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUNuRTtZQUNELGFBQWEsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLDhCQUE4QixFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDdkYsUUFBUSxFQUFFLENBQUM7U0FDWCxDQUFDLENBQUE7UUFFRixJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQixxQkFBcUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFcEMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDckIsd0VBQXdFO2dCQUN4RSx1RUFBdUU7Z0JBQ3ZFLHlFQUF5RTtnQkFDekUsc0RBQXNEO2dCQUN0RCxNQUFNLE9BQU8sR0FBRyxFQUFFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBO2dCQUNsRixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDeEQsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUE7UUFDdkYsQ0FBQztRQUVELElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BCLEtBQUssQ0FBQyxZQUFZLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtZQUV2RCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUEsQ0FBQyw2RkFBNkY7UUFDN0ksQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxtQkFBbUIsQ0FDMUIsSUFBWSxFQUNaLE9BQTRCO1FBRTVCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQTtRQUUvQyx5Q0FBeUM7UUFDekMsSUFBSSxVQUE4QixDQUFBO1FBQ2xDLElBQUksWUFBZ0MsQ0FBQTtRQUVwQyxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMxQixDQUFDO1lBQUEsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLENBQUM7UUFFRCxnQkFBZ0I7UUFDaEIsSUFBSSxLQUFLLDRCQUFtQixFQUFFLENBQUM7WUFDOUIsSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsNEJBQW1CLEVBQUUsQ0FBQztnQkFDM0YsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2QixDQUFDO1lBRUQsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7UUFDbEIsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRTlGLHVCQUF1QjtRQUN2QiwwQ0FBMEM7UUFDMUMsbUZBQW1GO1FBQ25GLDhCQUE4QjtRQUM5QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsNEJBQW1CLEVBQUUsQ0FBQztZQUN6RCxzQ0FBc0M7WUFDdEMsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxJQUFJLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO29CQUN0QyxPQUFPO3dCQUNOLE9BQU8sRUFBRSxHQUFHO3dCQUNaLE9BQU8sRUFBRTs0QkFDUixTQUFTLEVBQUUsVUFBVTtnQ0FDcEIsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsWUFBWSxJQUFJLENBQUMsRUFBRTtnQ0FDakUsQ0FBQyxDQUFDLFNBQVM7eUJBQ1o7d0JBQ0QsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO3FCQUN4QyxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQTtZQUNuRSxDQUFDO1lBRUQsdURBQXVEO2lCQUNsRCxJQUFJLE9BQU8sQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0UsT0FBTztvQkFDTixPQUFPLEVBQUUsR0FBRztvQkFDWixPQUFPLEVBQUU7d0JBQ1IsU0FBUyxFQUFFLFVBQVU7NEJBQ3BCLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFlBQVksSUFBSSxDQUFDLEVBQUU7NEJBQ2pFLENBQUMsQ0FBQyxTQUFTO3FCQUNaO29CQUNELGVBQWU7aUJBQ2YsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQTtJQUMvRSxDQUFDO0lBRU8sbUJBQW1CLENBQUMsVUFBOEI7UUFJekQsMEdBQTBHO1FBQzFHLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQThCLFFBQVEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sMkJBQTJCLEdBQ2hDLFlBQVksRUFBRSxzQkFBc0IsSUFBSSxTQUFTLENBQUEsQ0FBQyxhQUFhO1FBQ2hFLE1BQU0sMEJBQTBCLEdBQUcsWUFBWSxFQUFFLG9CQUFvQixJQUFJLEtBQUssQ0FBQSxDQUFDLGFBQWE7UUFFNUYsSUFBSSxxQkFBcUIsR0FDeEIsQ0FBQyxVQUFVLENBQUMsZUFBZSxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUMxRixJQUNDLENBQUMsVUFBVSxDQUFDLGNBQWM7WUFDMUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO1lBQzVCLENBQUMsMkJBQTJCLEtBQUssSUFBSSxJQUFJLDJCQUEyQixLQUFLLEtBQUssQ0FBQyxFQUM5RSxDQUFDO1lBQ0YscUJBQXFCLEdBQUcsMkJBQTJCLEtBQUssSUFBSSxDQUFBO1FBQzdELENBQUM7UUFFRCwrSUFBK0k7UUFDL0ksSUFBSSxvQkFBb0IsR0FBWSxLQUFLLENBQUE7UUFDekMsSUFBSSxVQUFVLENBQUMsY0FBYyxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlELG9CQUFvQixHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsY0FBYyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFBO1FBQ25GLENBQUM7YUFBTSxDQUFDO1lBQ1Asd0ZBQXdGO1lBQ3hGLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLElBQUksVUFBVSxDQUFDLE9BQU8sNkJBQXFCLEVBQUUsQ0FBQztvQkFDN0Msb0JBQW9CLEdBQUcsSUFBSSxDQUFBO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztZQUVELHVHQUF1RztZQUN2RyxpR0FBaUc7aUJBQzVGLENBQUM7Z0JBQ0wsSUFDQyxVQUFVLENBQUMsT0FBTywrQkFBdUI7b0JBQ3pDLFVBQVUsQ0FBQyxPQUFPLDZCQUFxQjtvQkFDdkMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsS0FBSyxRQUFRLENBQUMsRUFDdkUsQ0FBQztvQkFDRixvQkFBb0IsR0FBRyxJQUFJLENBQUE7Z0JBQzVCLENBQUM7WUFDRixDQUFDO1lBRUQseUNBQXlDO1lBQ3pDLElBQ0MsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLHdCQUF3QjtnQkFDeEMsQ0FBQywwQkFBMEIsS0FBSyxJQUFJLElBQUksMEJBQTBCLEtBQUssS0FBSyxDQUFDLEVBQzVFLENBQUM7Z0JBQ0Ysb0JBQW9CLEdBQUcsMEJBQTBCLEtBQUssSUFBSSxDQUFBO1lBQzNELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxDQUFBO0lBQ2hGLENBQUM7SUFFRCxLQUFLLENBQUMsa0NBQWtDLENBQ3ZDLHlCQUFtQyxFQUNuQyxVQUE4QjtRQUU5Qix3RUFBd0U7UUFDeEUsdUVBQXVFO1FBQ3ZFLDhCQUE4QjtRQUM5QixNQUFNLGNBQWMsR0FBRyxvQ0FBb0MsQ0FDMUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUNqQix5QkFBeUIsQ0FDekIsQ0FBQTtRQUNELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQSxDQUFDLDBDQUEwQztZQUVqRSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDeEIsQ0FBQztRQUVELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ25ELElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQy9DLElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTlCLHNHQUFzRztRQUN0RyxJQUNDLENBQUMsT0FBTyxDQUFDLE1BQU07WUFDZixDQUFDLFVBQVUsQ0FBQyxNQUFNO1lBQ2xCLENBQUMsUUFBUSxDQUFDLE1BQU07WUFDaEIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUNqQyxDQUFDO1lBQ0YsTUFBTSwrQkFBK0IsR0FDcEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQTtZQUMvRCxNQUFNLGVBQWUsR0FDcEIsK0JBQStCLEVBQUUsU0FBUyxJQUFJLCtCQUErQixFQUFFLFNBQVMsQ0FBQTtZQUN6RixJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDaEMsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDN0MsT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNuQyxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsVUFBVSxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQzFDLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksZUFBZSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUN4RCxPQUFPLEdBQUcsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7b0JBQ3ZELENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxRQUFRLEdBQUcsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQ25ELENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxlQUFlLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQTtRQUNoRCxLQUFLLE1BQU0sd0JBQXdCLElBQUkseUJBQXlCLEVBQUUsQ0FBQztZQUNsRSxJQUFJLHdCQUF3QixDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtnQkFDL0MsTUFBTSx1Q0FBdUMsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDdkUsSUFBSSx1Q0FBdUMsRUFBRSxDQUFDO29CQUM3QyxJQUFJLGVBQWUsRUFBRSxDQUFDO3dCQUNyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsdUNBQXVDLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQzs0QkFDakYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQTt3QkFDNUUsQ0FBQztvQkFDRixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsZUFBZSxHQUFHLHVDQUF1QyxDQUFBO29CQUMxRCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELHdDQUF3QztRQUN4QyxpREFBaUQ7UUFDakQscUZBQXFGO1FBRXJGLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMxQixJQUFJLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDN0QsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsT0FBTyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNsRSxDQUFDLENBQUMsQ0FBQTtRQUVGLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUU7WUFDL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNoRCxJQUFJLFNBQVMsSUFBSSxDQUFDLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hGLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUVELE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQzVGLENBQUMsQ0FBQyxDQUFBO1FBRUYsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzVDLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDNUUsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDeEYsQ0FBQyxDQUFDLENBQUE7UUFFRixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUE7UUFDMUIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxVQUFVLENBQUE7UUFDekMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxRQUFRLENBQUE7UUFFckMsVUFBVTtRQUNWLE1BQU0sUUFBUSxHQUF1QjtZQUNwQyxPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU87WUFDM0IsR0FBRyxFQUFFLFVBQVUsQ0FBQyxHQUFHO1lBQ25CLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07WUFDckUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO1lBQzNCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxpQkFBaUI7WUFDL0MsZUFBZTtZQUNmLFlBQVksRUFBRSxVQUFVLENBQUMsWUFBWTtZQUNyQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCO1NBQzdDLENBQUE7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxPQUFrQztRQUNuRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUE4QixRQUFRLENBQUMsQ0FBQTtRQUU5RixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ25ELE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxFQUFFLGdCQUFnQjtZQUN0RCxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQzlDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDM0Q7WUFDRixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osTUFBTSxjQUFjLEdBQ25CLGdCQUFnQjtZQUNoQixnQkFBZ0IsRUFBRSxPQUFPO1lBQ3pCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLENBQUE7UUFFaEQsSUFBSSxNQUErQixDQUFBO1FBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDOUQsTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLElBQUksZ0JBQWdCLENBQUE7WUFDaEQsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQztRQUVELGtGQUFrRjtRQUNsRixNQUFNLGFBQWEsR0FBK0I7WUFDakQsZ0RBQWdEO1lBQ2hELHVEQUF1RDtZQUN2RCxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJO1lBQ25DLEdBQUcsT0FBTyxDQUFDLEdBQUc7WUFFZCxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUU3QixRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsb0RBQW9EO1lBRWxFLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRztZQUVwQixPQUFPLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU87WUFDNUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzFCLGFBQWEsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsYUFBYTtZQUN4RCxxRkFBcUY7WUFDckYsZ0ZBQWdGO1lBQ2hGLHNGQUFzRjtZQUN0RixzQkFBc0I7WUFDdEIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxxQkFBcUI7Z0JBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDO2dCQUMxRixDQUFDLENBQUMsU0FBUztZQUVaLFFBQVEsRUFBRTtnQkFDVCxJQUFJLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFlBQVk7Z0JBQ25ELEdBQUcsRUFBRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUTtnQkFDOUMsa0VBQWtFO2dCQUNsRSxpREFBaUQ7Z0JBQ2pELHVFQUF1RTtnQkFDdkUsT0FBTyxFQUFFLGNBQWM7YUFDdkI7WUFFRCxPQUFPLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTTtZQUNuRixNQUFNLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTTtZQUNoRixXQUFXLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVk7WUFFckQsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO1lBQ3hDLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztZQUM1QixPQUFPLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBRXZELEdBQUcsRUFBRTtnQkFDSixRQUFRLEVBQUUsY0FBYyxFQUFFO2dCQUMxQixRQUFRLEVBQUUsY0FBYyxFQUFFO2FBQzFCO1lBRUQsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLFdBQVcsRUFBRSxtQkFBbUI7WUFDN0QsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsV0FBVztZQUM3QyxZQUFZLEVBQUUsT0FBTyxDQUFDLFdBQVcsRUFBRSxZQUFZO1lBQy9DLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFLFdBQVc7WUFFN0MsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFO1lBQzFDLE9BQU8sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFO1lBQzlDLFFBQVEsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNO1lBRXBGLE9BQU87WUFDUCxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsY0FBYztZQUN4QyxTQUFTLEVBQUUsUUFBUSxFQUFFO1lBQ3JCLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO1lBRTlELHNCQUFzQixFQUFFLFlBQVksRUFBRSxzQkFBc0IsSUFBSSxJQUFJO1lBQ3BFLHFCQUFxQixFQUFFLFlBQVksRUFBRSxxQkFBcUIsSUFBSSxLQUFLO1lBQ25FLG9CQUFvQixFQUFFLEdBQUcsQ0FBQywyQkFBMkI7WUFDckQsV0FBVyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUU7WUFDbkQsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFO1lBQzVDLFVBQVUsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVTtZQUVsRCxVQUFVLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVM7Z0JBQy9DLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUU7Z0JBQ2xELENBQUMsQ0FBQyxTQUFTO1NBQ1osQ0FBQTtRQUVELGFBQWE7UUFDYixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUE7WUFFdkUsb0JBQW9CO1lBQ3BCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQ2pDLE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFO2dCQUNwRixLQUFLO2dCQUNMLHdCQUF3QixFQUFFLGFBQWEsQ0FBQyx3QkFBd0I7Z0JBQ2hFLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsa0JBQWtCO2FBQ3ZELENBQUMsQ0FBQyxDQUFBO1lBQ0gsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUE7WUFFaEMsK0NBQStDO1lBQy9DLElBQUksT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2xDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO2dCQUMvQyxZQUFZLEVBQUUsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQzdDLENBQUM7WUFFRCw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUVqRCxnQ0FBZ0M7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUV6QyxtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQztnQkFDbEMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDO2dCQUNuQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRTthQUMvQixDQUFDLENBQUE7WUFFRixnQkFBZ0I7WUFDaEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUN6QyxXQUFXLENBQUMsR0FBRyxDQUNkLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQ3RGLENBQUE7WUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQzNGLENBQUE7WUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUNuRixDQUFBO1lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxhQUFhLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FDaEYsQ0FBQTtZQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsYUFBYSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQ3BGLENBQUE7WUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsQ0FDdkMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQzdFLENBQ0QsQ0FBQTtZQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsYUFBYSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxDQUN2QyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDOUUsQ0FDRCxDQUFBO1lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxhQUFhLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ3hELElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUN6RSxDQUNELENBQUE7WUFFRCxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUNuRSxXQUFXLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQSxDQUFDLDREQUE0RDtZQUNuSCxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyxvQkFBb0IsQ0FDekIsV0FBVyxFQUNYLHNCQUFzQixDQUN0QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FDeEQsQ0FBQTtZQUVELFlBQVk7WUFDWixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFFRCxrQkFBa0I7YUFDYixDQUFDO1lBQ0wsbUZBQW1GO1lBQ25GLGlGQUFpRjtZQUNqRixNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7WUFDekMsSUFDQyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0I7Z0JBQ3ZDLG1CQUFtQixFQUFFLHdCQUF3QixFQUM1QyxDQUFDO2dCQUNGLGFBQWEsQ0FBQyx3QkFBd0IsR0FBRyxtQkFBbUIsQ0FBQyx3QkFBd0IsQ0FBQTtnQkFDckYsYUFBYSxDQUFDLHdCQUF3QixHQUFHLG1CQUFtQixDQUFDLHdCQUF3QixDQUFBO2dCQUNyRixhQUFhLENBQUMscUJBQXFCLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNqRixhQUFhLENBQUMsT0FBTyxHQUFHLG1CQUFtQixDQUFDLE9BQU8sQ0FBQTtnQkFDbkQsYUFBYSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtnQkFDL0UsYUFBYSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsbUJBQW1CLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtnQkFDdkYsYUFBYSxDQUFDLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUE7Z0JBQ25ELGFBQWEsQ0FBQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQTtnQkFDN0UsYUFBYSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDdkUsYUFBYSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtnQkFDL0UsYUFBYSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1lBQ0QsYUFBYSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQzlDLENBQUM7UUFFRCwyQ0FBMkM7UUFDM0MsMENBQTBDO1FBQzFDLGFBQWEsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUVsQywyREFBMkQ7UUFDM0Qsd0RBQXdEO1FBQ3hELGFBQWE7UUFDYixJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE1BQU0sNEJBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDL0UsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFBO2dCQUNqRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCLENBQ2xDLE1BQW1CLEVBQ25CLGFBQXlDLEVBQ3pDLE9BQWtDLEVBQ2xDLGNBQWdDO1FBRWhDLGdEQUFnRDtRQUNoRCxnREFBZ0Q7UUFDaEQsb0JBQW9CO1FBRXBCLElBQUksQ0FBQyxhQUFhLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUM3QyxJQUFJLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNwRCxhQUFhLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQztvQkFDekUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxTQUFTO29CQUNsQyxlQUFlLEVBQUUsYUFBYSxDQUFDLGVBQWU7aUJBQzlDLENBQUMsQ0FBQTtZQUNILENBQUM7aUJBQU0sSUFBSSxpQ0FBaUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDdkUsYUFBYSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUM7b0JBQ3RFLFNBQVMsRUFBRSxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUc7b0JBQ3RDLGVBQWUsRUFBRSxhQUFhLENBQUMsZUFBZTtpQkFDOUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGlFQUFpRTtnQkFDakUsaUVBQWlFO2dCQUNqRSxnRUFBZ0U7Z0JBQ2hFLGlFQUFpRTtnQkFDakUsaUVBQWlFO2dCQUNqRSxxQkFBcUI7Z0JBRXJCLGFBQWEsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHlCQUF5QixDQUFDO29CQUMzRSxZQUFZLEVBQ1gsT0FBTyxDQUFDLHFCQUFxQixFQUFFLFlBQVksSUFBSSw4QkFBOEIsRUFBRSxDQUFDLEVBQUU7b0JBQ25GLGVBQWUsRUFBRSxhQUFhLENBQUMsZUFBZTtpQkFDOUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FDZCxhQUFhLENBQUMsU0FBUyxJQUFJLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEYsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDOUYsTUFBTSxPQUFPLEdBQUcsY0FBYyxZQUFZLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQTtRQUN6RixhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFFeEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQzdDLG9EQUFvRDtZQUNwRCxrREFBa0Q7WUFDbEQsMkNBQTJDO1lBQzNDLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNsRixDQUFDO1FBRUQsVUFBVTtRQUNWLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVPLDhCQUE4QixDQUNyQyxPQUFrQyxFQUNsQyxTQUFrQyxFQUNsQyxjQUFnQztRQUVoQyxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMxQixPQUFPLENBQ04sSUFBSSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLFlBQVksQ0FBQztnQkFDdEYsSUFBSSxDQUFDLDJCQUEyQixDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FDekUsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDakUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQTtJQUM1RixDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQW1CLEVBQUUsV0FBd0I7UUFDbkUsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUU5QixPQUFPO1FBQ1AsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQztZQUNsQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUM7WUFDbkMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUU7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsV0FBVztRQUNYLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRU8saUJBQWlCLENBQUMsTUFBbUI7UUFDNUMsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUU5QixPQUFPO1FBQ1AsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2YsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDL0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVPLCtCQUErQixDQUN0QyxlQUFtQztRQUVuQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FDaEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ25DLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQ3pELENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxPQUFzQjtRQUNuRCxPQUFPLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDNUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFM0UsYUFBYSxFQUFFLGFBQWEsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVELG1CQUFtQixDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbEQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDL0QsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLENBQUMsT0FBZSxFQUFFLE9BQWEsRUFBRSxpQkFBNEI7UUFDckUsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN4QyxJQUFJLGlCQUFpQixJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLFNBQVEsQ0FBQyxnREFBZ0Q7WUFDMUQsQ0FBQztZQUVELE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMvRCxDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtJQUN6QixDQUFDO0lBRUQsYUFBYSxDQUFDLFFBQWdCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELHNCQUFzQixDQUFDLFdBQXdCO1FBQzlDLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDaEUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVuRCxPQUFPLE1BQU0sRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ3pELENBQUM7Q0FDRCxDQUFBO0FBeDlEWSxrQkFBa0I7SUEwQzVCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLDRCQUE0QixDQUFBO0lBRTVCLFlBQUEscUJBQXFCLENBQUE7SUFDckIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsNkJBQTZCLENBQUE7SUFFN0IsWUFBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSw0QkFBNEIsQ0FBQTtJQUU1QixZQUFBLHNCQUFzQixDQUFBO0dBL0RaLGtCQUFrQixDQXc5RDlCIn0=