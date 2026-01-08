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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3dvcmtiZW5jaFRlc3RTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUNOLDZCQUE2QixJQUFJLG9DQUFvQyxFQUVyRSxrQkFBa0IsRUFDbEIsc0JBQXNCLEVBSXRCLG9CQUFvQixHQUVwQixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFDTixrQkFBa0IsR0FJbEIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUE0QyxNQUFNLGdDQUFnQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVoRixPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sNkNBQTZDLENBQUE7QUFhcEQsT0FBTyxFQUVOLHlCQUF5QixHQUN6QixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFHOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDekgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDakgsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDM0ksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFv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