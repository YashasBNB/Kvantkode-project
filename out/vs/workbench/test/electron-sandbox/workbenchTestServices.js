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
import { Event } from '../../../base/common/event.js';
import { workbenchInstantiationService as browserWorkbenchInstantiationService, TestEncodingOracle, TestEnvironmentService, TestLifecycleService, } from '../browser/workbenchTestServices.js';
import { INativeHostService, } from '../../../platform/native/common/native.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IFileDialogService, } from '../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService, } from '../../../platform/environment/common/environment.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { AbstractNativeExtensionTipsService } from '../../../platform/extensionManagement/common/extensionTipsService.js';
import { IExtensionManagementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { NativeTextFileService } from '../../services/textfile/electron-sandbox/nativeTextFileService.js';
import { insert } from '../../../base/common/arrays.js';
import { Schemas } from '../../../base/common/network.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../platform/log/common/log.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { NativeWorkingCopyBackupService } from '../../services/workingCopy/electron-sandbox/workingCopyBackupService.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
export class TestSharedProcessService {
    createRawConnection() {
        throw new Error('Not Implemented');
    }
    getChannel(channelName) {
        return undefined;
    }
    registerChannel(channelName, channel) { }
    notifyRestored() { }
}
export class TestNativeHostService {
    constructor() {
        this.windowId = -1;
        this.onDidOpenMainWindow = Event.None;
        this.onDidMaximizeWindow = Event.None;
        this.onDidUnmaximizeWindow = Event.None;
        this.onDidFocusMainWindow = Event.None;
        this.onDidBlurMainWindow = Event.None;
        this.onDidFocusMainOrAuxiliaryWindow = Event.None;
        this.onDidBlurMainOrAuxiliaryWindow = Event.None;
        this.onDidResumeOS = Event.None;
        this.onDidChangeColorScheme = Event.None;
        this.onDidChangePassword = Event.None;
        this.onDidTriggerWindowSystemContextMenu = Event.None;
        this.onDidChangeWindowFullScreen = Event.None;
        this.onDidChangeDisplay = Event.None;
        this.windowCount = Promise.resolve(1);
    }
    getWindowCount() {
        return this.windowCount;
    }
    async getWindows() {
        return [];
    }
    async getActiveWindowId() {
        return undefined;
    }
    async getActiveWindowPosition() {
        return undefined;
    }
    async getNativeWindowHandle(windowId) {
        return undefined;
    }
    openWindow(arg1, arg2) {
        throw new Error('Method not implemented.');
    }
    async toggleFullScreen() { }
    async isMaximized() {
        return true;
    }
    async isFullScreen() {
        return true;
    }
    async maximizeWindow() { }
    async unmaximizeWindow() { }
    async minimizeWindow() { }
    async moveWindowTop(options) { }
    getCursorScreenPoint() {
        throw new Error('Method not implemented.');
    }
    async positionWindow(position, options) { }
    async updateWindowControls(options) { }
    async setMinimumSize(width, height) { }
    async saveWindowSplash(value) { }
    async focusWindow(options) { }
    async showMessageBox(options) {
        throw new Error('Method not implemented.');
    }
    async showSaveDialog(options) {
        throw new Error('Method not implemented.');
    }
    async showOpenDialog(options) {
        throw new Error('Method not implemented.');
    }
    async pickFileFolderAndOpen(options) { }
    async pickFileAndOpen(options) { }
    async pickFolderAndOpen(options) { }
    async pickWorkspaceAndOpen(options) { }
    async showItemInFolder(path) { }
    async setRepresentedFilename(path) { }
    async isAdmin() {
        return false;
    }
    async writeElevated(source, target) { }
    async isRunningUnderARM64Translation() {
        return false;
    }
    async getOSProperties() {
        return Object.create(null);
    }
    async getOSStatistics() {
        return Object.create(null);
    }
    async getOSVirtualMachineHint() {
        return 0;
    }
    async getOSColorScheme() {
        return { dark: true, highContrast: false };
    }
    async hasWSLFeatureInstalled() {
        return false;
    }
    async getProcessId() {
        throw new Error('Method not implemented.');
    }
    async killProcess() { }
    async setDocumentEdited(edited) { }
    async openExternal(url, defaultApplication) {
        return false;
    }
    async updateTouchBar() { }
    async moveItemToTrash() { }
    async newWindowTab() { }
    async showPreviousWindowTab() { }
    async showNextWindowTab() { }
    async moveWindowTabToNewWindow() { }
    async mergeAllWindowTabs() { }
    async toggleWindowTabsBar() { }
    async installShellCommand() { }
    async uninstallShellCommand() { }
    async notifyReady() { }
    async relaunch(options) { }
    async reload() { }
    async closeWindow() { }
    async quit() { }
    async exit(code) { }
    async openDevTools(options) { }
    async toggleDevTools() { }
    async openGPUInfoWindow() { }
    async resolveProxy(url) {
        return undefined;
    }
    async lookupAuthorization(authInfo) {
        return undefined;
    }
    async lookupKerberosAuthorization(url) {
        return undefined;
    }
    async loadCertificates() {
        return [];
    }
    async findFreePort(startPort, giveUpAfter, timeout, stride) {
        return -1;
    }
    async readClipboardText(type) {
        return '';
    }
    async writeClipboardText(text, type) { }
    async readClipboardFindText() {
        return '';
    }
    async writeClipboardFindText(text) { }
    async writeClipboardBuffer(format, buffer, type) { }
    async readImage() {
        return Uint8Array.from([]);
    }
    async readClipboardBuffer(format) {
        return VSBuffer.wrap(Uint8Array.from([]));
    }
    async hasClipboard(format, type) {
        return false;
    }
    async windowsGetStringRegKey(hive, path, name) {
        return undefined;
    }
    async profileRenderer() {
        throw new Error();
    }
    async getScreenshot() {
        return undefined;
    }
}
let TestExtensionTipsService = class TestExtensionTipsService extends AbstractNativeExtensionTipsService {
    constructor(environmentService, telemetryService, extensionManagementService, storageService, nativeHostService, extensionRecommendationNotificationService, fileService, productService) {
        super(environmentService.userHome, nativeHostService, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService);
    }
};
TestExtensionTipsService = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ITelemetryService),
    __param(2, IExtensionManagementService),
    __param(3, IStorageService),
    __param(4, INativeHostService),
    __param(5, IExtensionRecommendationNotificationService),
    __param(6, IFileService),
    __param(7, IProductService)
], TestExtensionTipsService);
export { TestExtensionTipsService };
export function workbenchInstantiationService(overrides, disposables = new DisposableStore()) {
    const instantiationService = browserWorkbenchInstantiationService({
        workingCopyBackupService: () => disposables.add(new TestNativeWorkingCopyBackupService()),
        ...overrides,
    }, disposables);
    instantiationService.stub(INativeHostService, new TestNativeHostService());
    return instantiationService;
}
let TestServiceAccessor = class TestServiceAccessor {
    constructor(lifecycleService, textFileService, filesConfigurationService, contextService, modelService, fileService, nativeHostService, fileDialogService, workingCopyBackupService, workingCopyService, editorService) {
        this.lifecycleService = lifecycleService;
        this.textFileService = textFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.contextService = contextService;
        this.modelService = modelService;
        this.fileService = fileService;
        this.nativeHostService = nativeHostService;
        this.fileDialogService = fileDialogService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.workingCopyService = workingCopyService;
        this.editorService = editorService;
    }
};
TestServiceAccessor = __decorate([
    __param(0, ILifecycleService),
    __param(1, ITextFileService),
    __param(2, IFilesConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IModelService),
    __param(5, IFileService),
    __param(6, INativeHostService),
    __param(7, IFileDialogService),
    __param(8, IWorkingCopyBackupService),
    __param(9, IWorkingCopyService),
    __param(10, IEditorService)
], TestServiceAccessor);
export { TestServiceAccessor };
export class TestNativeTextFileServiceWithEncodingOverrides extends NativeTextFileService {
    get encoding() {
        if (!this._testEncoding) {
            this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
        }
        return this._testEncoding;
    }
}
export class TestNativeWorkingCopyBackupService extends NativeWorkingCopyBackupService {
    constructor() {
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        const lifecycleService = new TestLifecycleService();
        super(environmentService, fileService, logService, lifecycleService);
        const inMemoryFileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(fileService.registerProvider(Schemas.inMemory, inMemoryFileSystemProvider));
        const uriIdentityService = this._register(new UriIdentityService(fileService));
        const userDataProfilesService = this._register(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        this._register(fileService.registerProvider(Schemas.vscodeUserData, this._register(new FileUserDataProvider(Schemas.file, inMemoryFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService))));
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this.pendingBackupsArr = [];
        this.discardedAllBackups = false;
        this._register(fileService);
        this._register(lifecycleService);
    }
    testGetFileService() {
        return this.fileService;
    }
    async waitForAllBackups() {
        await Promise.all(this.pendingBackupsArr);
    }
    joinBackupResource() {
        return new Promise((resolve) => this.backupResourceJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        const p = super.backup(identifier, content, versionId, meta, token);
        const removeFromPendingBackups = insert(this.pendingBackupsArr, p.then(undefined, undefined));
        try {
            await p;
        }
        finally {
            removeFromPendingBackups();
        }
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    joinDiscardBackup() {
        return new Promise((resolve) => this.discardBackupJoiners.push(resolve));
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async discardBackups(filter) {
        this.discardedAllBackups = true;
        return super.discardBackups(filter);
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC93b3JrYmVuY2hUZXN0U2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTiw2QkFBNkIsSUFBSSxvQ0FBb0MsRUFFckUsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUl0QixvQkFBb0IsR0FFcEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQ04sa0JBQWtCLEdBSWxCLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBNEMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFFaEYsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLDZDQUE2QyxDQUFBO0FBYXBELE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3pILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ2pILE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQzNJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FB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