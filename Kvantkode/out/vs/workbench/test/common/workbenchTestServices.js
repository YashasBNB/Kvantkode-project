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
import { join } from '../../../base/common/path.js';
import { basename, isEqual, isEqualOrParent } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestWorkspace } from '../../../platform/workspace/test/common/testWorkspace.js';
import { isLinux, isMacintosh } from '../../../base/common/platform.js';
import { InMemoryStorageService, } from '../../../platform/storage/common/storage.js';
import { NullExtensionService } from '../../services/extensions/common/extensions.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import product from '../../../platform/product/common/product.js';
import { AbstractLoggerService, LogLevel, NullLogger, } from '../../../platform/log/common/log.js';
export class TestLoggerService extends AbstractLoggerService {
    constructor(logsHome) {
        super(LogLevel.Info, logsHome ?? URI.file('tests').with({ scheme: 'vscode-tests' }));
    }
    doCreateLogger() {
        return new NullLogger();
    }
}
let TestTextResourcePropertiesService = class TestTextResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', {
            overrideIdentifier: language,
            resource,
        });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return isLinux || isMacintosh ? '\n' : '\r\n';
    }
};
TestTextResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], TestTextResourcePropertiesService);
export { TestTextResourcePropertiesService };
export class TestContextService {
    get onDidChangeWorkspaceName() {
        return this._onDidChangeWorkspaceName.event;
    }
    get onWillChangeWorkspaceFolders() {
        return this._onWillChangeWorkspaceFolders.event;
    }
    get onDidChangeWorkspaceFolders() {
        return this._onDidChangeWorkspaceFolders.event;
    }
    get onDidChangeWorkbenchState() {
        return this._onDidChangeWorkbenchState.event;
    }
    constructor(workspace = TestWorkspace, options = null) {
        this.workspace = workspace;
        this.options = options || Object.create(null);
        this._onDidChangeWorkspaceName = new Emitter();
        this._onWillChangeWorkspaceFolders = new Emitter();
        this._onDidChangeWorkspaceFolders = new Emitter();
        this._onDidChangeWorkbenchState = new Emitter();
    }
    getFolders() {
        return this.workspace ? this.workspace.folders : [];
    }
    getWorkbenchState() {
        if (this.workspace.configuration) {
            return 3 /* WorkbenchState.WORKSPACE */;
        }
        if (this.workspace.folders.length) {
            return 2 /* WorkbenchState.FOLDER */;
        }
        return 1 /* WorkbenchState.EMPTY */;
    }
    getCompleteWorkspace() {
        return Promise.resolve(this.getWorkspace());
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkspaceFolder(resource) {
        return this.workspace.getFolder(resource);
    }
    setWorkspace(workspace) {
        this.workspace = workspace;
    }
    getOptions() {
        return this.options;
    }
    updateOptions() { }
    isInsideWorkspace(resource) {
        if (resource && this.workspace) {
            return isEqualOrParent(resource, this.workspace.folders[0].uri);
        }
        return false;
    }
    toResource(workspaceRelativePath) {
        return URI.file(join('C:\\', workspaceRelativePath));
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        return (URI.isUri(workspaceIdOrFolder) && isEqual(this.workspace.folders[0].uri, workspaceIdOrFolder));
    }
}
export class TestStorageService extends InMemoryStorageService {
    testEmitWillSaveState(reason) {
        super.emitWillSaveState(reason);
    }
}
export class TestHistoryService {
    constructor(root) {
        this.root = root;
    }
    async reopenLastClosedEditor() { }
    async goForward() { }
    async goBack() { }
    async goPrevious() { }
    async goLast() { }
    removeFromHistory(_input) { }
    clear() { }
    clearRecentlyOpened() { }
    getHistory() {
        return [];
    }
    async openNextRecentlyUsedEditor(group) { }
    async openPreviouslyUsedEditor(group) { }
    getLastActiveWorkspaceRoot(_schemeFilter) {
        return this.root;
    }
    getLastActiveFile(_schemeFilter) {
        return undefined;
    }
}
export class TestWorkingCopy extends Disposable {
    constructor(resource, isDirty = false, typeId = 'testWorkingCopyType') {
        super();
        this.resource = resource;
        this.typeId = typeId;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this.capabilities = 0 /* WorkingCopyCapabilities.None */;
        this.dirty = false;
        this.name = basename(this.resource);
        this.dirty = isDirty;
    }
    setDirty(dirty) {
        if (this.dirty !== dirty) {
            this.dirty = dirty;
            this._onDidChangeDirty.fire();
        }
    }
    setContent(content) {
        this._onDidChangeContent.fire();
    }
    isDirty() {
        return this.dirty;
    }
    isModified() {
        return this.isDirty();
    }
    async save(options, stat) {
        this._onDidSave.fire({
            reason: options?.reason ?? 1 /* SaveReason.EXPLICIT */,
            stat: stat ?? createFileStat(this.resource),
            source: options?.source,
        });
        return true;
    }
    async revert(options) {
        this.setDirty(false);
    }
    async backup(token) {
        return {};
    }
}
export function createFileStat(resource, readonly = false, isFile, isDirectory, children) {
    return {
        resource,
        etag: Date.now().toString(),
        mtime: Date.now(),
        ctime: Date.now(),
        size: 42,
        isFile: isFile ?? true,
        isDirectory: isDirectory ?? false,
        isSymbolicLink: false,
        readonly,
        locked: false,
        name: basename(resource),
        children: children?.map((c) => createFileStat(c.resource, false, c.isFile, c.isDirectory)),
    };
}
export class TestWorkingCopyFileService {
    constructor() {
        this.onWillRunWorkingCopyFileOperation = Event.None;
        this.onDidFailWorkingCopyFileOperation = Event.None;
        this.onDidRunWorkingCopyFileOperation = Event.None;
        this.hasSaveParticipants = false;
    }
    addFileOperationParticipant(participant) {
        return Disposable.None;
    }
    addSaveParticipant(participant) {
        return Disposable.None;
    }
    async runSaveParticipants(workingCopy, context, progress, token) { }
    async delete(operations, token, undoInfo) { }
    registerWorkingCopyProvider(provider) {
        return Disposable.None;
    }
    getDirty(resource) {
        return [];
    }
    create(operations, token, undoInfo) {
        throw new Error('Method not implemented.');
    }
    createFolder(operations, token, undoInfo) {
        throw new Error('Method not implemented.');
    }
    move(operations, token, undoInfo) {
        throw new Error('Method not implemented.');
    }
    copy(operations, token, undoInfo) {
        throw new Error('Method not implemented.');
    }
}
export function mock() {
    return function () { };
}
export class TestExtensionService extends NullExtensionService {
}
export const TestProductService = { _serviceBrand: undefined, ...product };
export class TestActivityService {
    constructor() {
        this.onDidChangeActivity = Event.None;
    }
    getViewContainerActivities(viewContainerId) {
        return [];
    }
    getActivity(id) {
        return [];
    }
    showViewContainerActivity(viewContainerId, badge) {
        return this;
    }
    showViewActivity(viewId, badge) {
        return this;
    }
    showAccountsActivity(activity) {
        return this;
    }
    showGlobalActivity(activity) {
        return this;
    }
    dispose() { }
}
export const NullFilesConfigurationService = new (class {
    constructor() {
        this.onDidChangeAutoSaveConfiguration = Event.None;
        this.onDidChangeAutoSaveDisabled = Event.None;
        this.onDidChangeReadonly = Event.None;
        this.onDidChangeFilesAssociation = Event.None;
        this.isHotExitEnabled = false;
        this.hotExitConfiguration = undefined;
    }
    getAutoSaveConfiguration() {
        throw new Error('Method not implemented.');
    }
    getAutoSaveMode() {
        throw new Error('Method not implemented.');
    }
    hasShortAutoSaveDelay() {
        throw new Error('Method not implemented.');
    }
    toggleAutoSave() {
        throw new Error('Method not implemented.');
    }
    enableAutoSaveAfterShortDelay(resourceOrEditor) {
        throw new Error('Method not implemented.');
    }
    disableAutoSave(resourceOrEditor) {
        throw new Error('Method not implemented.');
    }
    isReadonly(resource, stat) {
        return false;
    }
    async updateReadonly(resource, readonly) { }
    preventSaveConflicts(resource, language) {
        throw new Error('Method not implemented.');
    }
})();
export class TestWorkspaceTrustEnablementService {
    constructor(isEnabled = true) {
        this.isEnabled = isEnabled;
    }
    isWorkspaceTrustEnabled() {
        return this.isEnabled;
    }
}
export class TestWorkspaceTrustManagementService extends Disposable {
    constructor(trusted = true) {
        super();
        this.trusted = trusted;
        this._onDidChangeTrust = this._register(new Emitter());
        this.onDidChangeTrust = this._onDidChangeTrust.event;
        this._onDidChangeTrustedFolders = this._register(new Emitter());
        this.onDidChangeTrustedFolders = this._onDidChangeTrustedFolders.event;
        this._onDidInitiateWorkspaceTrustRequestOnStartup = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequestOnStartup = this._onDidInitiateWorkspaceTrustRequestOnStartup.event;
    }
    get acceptsOutOfWorkspaceFiles() {
        throw new Error('Method not implemented.');
    }
    set acceptsOutOfWorkspaceFiles(value) {
        throw new Error('Method not implemented.');
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        throw new Error('Method not implemented.');
    }
    getTrustedUris() {
        throw new Error('Method not implemented.');
    }
    setParentFolderTrust(trusted) {
        throw new Error('Method not implemented.');
    }
    getUriTrustInfo(uri) {
        throw new Error('Method not implemented.');
    }
    async setTrustedUris(folders) {
        throw new Error('Method not implemented.');
    }
    async setUrisTrust(uris, trusted) {
        throw new Error('Method not implemented.');
    }
    canSetParentFolderTrust() {
        throw new Error('Method not implemented.');
    }
    canSetWorkspaceTrust() {
        throw new Error('Method not implemented.');
    }
    isWorkspaceTrusted() {
        return this.trusted;
    }
    isWorkspaceTrustForced() {
        return false;
    }
    get workspaceTrustInitialized() {
        return Promise.resolve();
    }
    get workspaceResolved() {
        return Promise.resolve();
    }
    async setWorkspaceTrust(trusted) {
        if (this.trusted !== trusted) {
            this.trusted = trusted;
            this._onDidChangeTrust.fire(this.trusted);
        }
    }
}
export class TestWorkspaceTrustRequestService extends Disposable {
    constructor(_trusted) {
        super();
        this._trusted = _trusted;
        this._onDidInitiateOpenFilesTrustRequest = this._register(new Emitter());
        this.onDidInitiateOpenFilesTrustRequest = this._onDidInitiateOpenFilesTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequest = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequest = this._onDidInitiateWorkspaceTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequestOnStartup = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequestOnStartup = this._onDidInitiateWorkspaceTrustRequestOnStartup.event;
        this.requestOpenUrisHandler = async (uris) => {
            return 1 /* WorkspaceTrustUriResponse.Open */;
        };
    }
    requestOpenFilesTrust(uris) {
        return this.requestOpenUrisHandler(uris);
    }
    async completeOpenFilesTrustRequest(result, saveResponse) {
        throw new Error('Method not implemented.');
    }
    cancelWorkspaceTrustRequest() {
        throw new Error('Method not implemented.');
    }
    async completeWorkspaceTrustRequest(trusted) {
        throw new Error('Method not implemented.');
    }
    async requestWorkspaceTrust(options) {
        return this._trusted;
    }
    requestWorkspaceTrustOnStartup() {
        throw new Error('Method not implemented.');
    }
}
export class TestMarkerService {
    constructor() {
        this.onMarkerChanged = Event.None;
    }
    getStatistics() {
        throw new Error('Method not implemented.');
    }
    changeOne(owner, resource, markers) { }
    changeAll(owner, data) { }
    remove(owner, resources) { }
    read(filter) {
        return [];
    }
    installResourceFilter(resource, reason) {
        return {
            dispose: () => {
                /* TODO: Implement cleanup logic */
            },
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9jb21tb24vd29ya2JlbmNoVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQVkvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sNkNBQTZDLENBQUE7QUFNcEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFjckYsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSTNFLE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFBO0FBR2pFLE9BQU8sRUFDTixxQkFBcUIsRUFFckIsUUFBUSxFQUNSLFVBQVUsR0FDVixNQUFNLHFDQUFxQyxDQUFBO0FBMkI1QyxNQUFNLE9BQU8saUJBQWtCLFNBQVEscUJBQXFCO0lBQzNELFlBQVksUUFBYztRQUN6QixLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFDUyxjQUFjO1FBQ3ZCLE9BQU8sSUFBSSxVQUFVLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0NBQ0Q7QUFFTSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFpQztJQUc3QyxZQUN5QyxvQkFBMkM7UUFBM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUNqRixDQUFDO0lBRUosTUFBTSxDQUFDLFFBQWEsRUFBRSxRQUFpQjtRQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRTtZQUMzRCxrQkFBa0IsRUFBRSxRQUFRO1lBQzVCLFFBQVE7U0FDUixDQUFDLENBQUE7UUFDRixJQUFJLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksR0FBRyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3RELE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQztRQUNELE9BQU8sT0FBTyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDOUMsQ0FBQztDQUNELENBQUE7QUFqQlksaUNBQWlDO0lBSTNDLFdBQUEscUJBQXFCLENBQUE7R0FKWCxpQ0FBaUMsQ0FpQjdDOztBQUVELE1BQU0sT0FBTyxrQkFBa0I7SUFPOUIsSUFBSSx3QkFBd0I7UUFDM0IsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO0lBQzVDLENBQUM7SUFHRCxJQUFJLDRCQUE0QjtRQUMvQixPQUFPLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUE7SUFDaEQsQ0FBQztJQUdELElBQUksMkJBQTJCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQTtJQUMvQyxDQUFDO0lBR0QsSUFBSSx5QkFBeUI7UUFDNUIsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO0lBQzdDLENBQUM7SUFFRCxZQUFZLFNBQVMsR0FBRyxhQUFhLEVBQUUsT0FBTyxHQUFHLElBQUk7UUFDcEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDMUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUNwRCxJQUFJLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxPQUFPLEVBQW9DLENBQUE7UUFDcEYsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksT0FBTyxFQUFnQyxDQUFBO1FBQy9FLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBa0IsQ0FBQTtJQUNoRSxDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNsQyx3Q0FBK0I7UUFDaEMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkMscUNBQTRCO1FBQzdCLENBQUM7UUFFRCxvQ0FBMkI7SUFDNUIsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVELGtCQUFrQixDQUFDLFFBQWE7UUFDL0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsWUFBWSxDQUFDLFNBQWM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7SUFDM0IsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELGFBQWEsS0FBSSxDQUFDO0lBRWxCLGlCQUFpQixDQUFDLFFBQWE7UUFDOUIsSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sZUFBZSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoRSxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsVUFBVSxDQUFDLHFCQUE2QjtRQUN2QyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELGtCQUFrQixDQUNqQixtQkFBa0Y7UUFFbEYsT0FBTyxDQUNOLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLENBQzdGLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsc0JBQXNCO0lBQzdELHFCQUFxQixDQUFDLE1BQTJCO1FBQ2hELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBRzlCLFlBQW9CLElBQVU7UUFBVixTQUFJLEdBQUosSUFBSSxDQUFNO0lBQUcsQ0FBQztJQUVsQyxLQUFLLENBQUMsc0JBQXNCLEtBQW1CLENBQUM7SUFDaEQsS0FBSyxDQUFDLFNBQVMsS0FBbUIsQ0FBQztJQUNuQyxLQUFLLENBQUMsTUFBTSxLQUFtQixDQUFDO0lBQ2hDLEtBQUssQ0FBQyxVQUFVLEtBQW1CLENBQUM7SUFDcEMsS0FBSyxDQUFDLE1BQU0sS0FBbUIsQ0FBQztJQUNoQyxpQkFBaUIsQ0FBQyxNQUEwQyxJQUFTLENBQUM7SUFDdEUsS0FBSyxLQUFVLENBQUM7SUFDaEIsbUJBQW1CLEtBQVUsQ0FBQztJQUM5QixVQUFVO1FBQ1QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsS0FBSyxDQUFDLDBCQUEwQixDQUFDLEtBQXVCLElBQWtCLENBQUM7SUFDM0UsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEtBQXVCLElBQWtCLENBQUM7SUFDekUsMEJBQTBCLENBQUMsYUFBcUI7UUFDL0MsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFDRCxpQkFBaUIsQ0FBQyxhQUFxQjtRQUN0QyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO0lBZ0I5QyxZQUNVLFFBQWEsRUFDdEIsT0FBTyxHQUFHLEtBQUssRUFDTixTQUFTLHFCQUFxQjtRQUV2QyxLQUFLLEVBQUUsQ0FBQTtRQUpFLGFBQVEsR0FBUixRQUFRLENBQUs7UUFFYixXQUFNLEdBQU4sTUFBTSxDQUF3QjtRQWxCdkIsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDL0QscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUV2Qyx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNqRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBRTNDLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFtQyxDQUFDLENBQUE7UUFDbkYsY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBRWpDLGlCQUFZLHdDQUErQjtRQUk1QyxVQUFLLEdBQUcsS0FBSyxDQUFBO1FBU3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQTtJQUNyQixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQWM7UUFDdEIsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ2xCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFlO1FBQ3pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNsQixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQXNCLEVBQUUsSUFBNEI7UUFDOUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDcEIsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUF1QjtZQUM5QyxJQUFJLEVBQUUsSUFBSSxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzNDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTTtTQUN2QixDQUFDLENBQUE7UUFFRixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQXdCO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckIsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBd0I7UUFDcEMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUM3QixRQUFhLEVBQ2IsUUFBUSxHQUFHLEtBQUssRUFDaEIsTUFBZ0IsRUFDaEIsV0FBcUIsRUFDckIsUUFBbUY7SUFFbkYsT0FBTztRQUNOLFFBQVE7UUFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUMzQixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNqQixJQUFJLEVBQUUsRUFBRTtRQUNSLE1BQU0sRUFBRSxNQUFNLElBQUksSUFBSTtRQUN0QixXQUFXLEVBQUUsV0FBVyxJQUFJLEtBQUs7UUFDakMsY0FBYyxFQUFFLEtBQUs7UUFDckIsUUFBUTtRQUNSLE1BQU0sRUFBRSxLQUFLO1FBQ2IsSUFBSSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFDeEIsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUMxRixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFBdkM7UUFHQyxzQ0FBaUMsR0FBZ0MsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUMzRSxzQ0FBaUMsR0FBZ0MsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUMzRSxxQ0FBZ0MsR0FBZ0MsS0FBSyxDQUFDLElBQUksQ0FBQTtRQU1qRSx3QkFBbUIsR0FBRyxLQUFLLENBQUE7SUF1RHJDLENBQUM7SUEzREEsMkJBQTJCLENBQUMsV0FBaUQ7UUFDNUUsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFHRCxrQkFBa0IsQ0FBQyxXQUFrRDtRQUNwRSxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUNELEtBQUssQ0FBQyxtQkFBbUIsQ0FDeEIsV0FBeUIsRUFDekIsT0FBcUQsRUFDckQsUUFBa0MsRUFDbEMsS0FBd0IsSUFDUCxDQUFDO0lBRW5CLEtBQUssQ0FBQyxNQUFNLENBQ1gsVUFBOEIsRUFDOUIsS0FBd0IsRUFDeEIsUUFBcUMsSUFDcEIsQ0FBQztJQUVuQiwyQkFBMkIsQ0FBQyxRQUFtRDtRQUM5RSxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUVELFFBQVEsQ0FBQyxRQUFhO1FBQ3JCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELE1BQU0sQ0FDTCxVQUFrQyxFQUNsQyxLQUF3QixFQUN4QixRQUFxQztRQUVyQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELFlBQVksQ0FDWCxVQUE4QixFQUM5QixLQUF3QixFQUN4QixRQUFxQztRQUVyQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksQ0FDSCxVQUE0QixFQUM1QixLQUF3QixFQUN4QixRQUFxQztRQUVyQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksQ0FDSCxVQUE0QixFQUM1QixLQUF3QixFQUN4QixRQUFxQztRQUVyQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLElBQUk7SUFDbkIsT0FBTyxjQUFhLENBQVEsQ0FBQTtBQUM3QixDQUFDO0FBTUQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLG9CQUFvQjtDQUFHO0FBRWpFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxHQUFHLE9BQU8sRUFBRSxDQUFBO0FBRTFFLE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUFFQyx3QkFBbUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBcUJqQyxDQUFDO0lBcEJBLDBCQUEwQixDQUFDLGVBQXVCO1FBQ2pELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELFdBQVcsQ0FBQyxFQUFVO1FBQ3JCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELHlCQUF5QixDQUFDLGVBQXVCLEVBQUUsS0FBZ0I7UUFDbEUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsTUFBYyxFQUFFLEtBQWdCO1FBQ2hELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELG9CQUFvQixDQUFDLFFBQW1CO1FBQ3ZDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELGtCQUFrQixDQUFDLFFBQW1CO1FBQ3JDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sS0FBSSxDQUFDO0NBQ1o7QUFFRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLENBQUM7SUFBQTtRQUd4QyxxQ0FBZ0MsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzdDLGdDQUEyQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDeEMsd0JBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNoQyxnQ0FBMkIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBRXhDLHFCQUFnQixHQUFHLEtBQUssQ0FBQTtRQUN4Qix5QkFBb0IsR0FBRyxTQUFTLENBQUE7SUEyQjFDLENBQUM7SUF6QkEsd0JBQXdCO1FBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsZUFBZTtRQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QscUJBQXFCO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsY0FBYztRQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsNkJBQTZCLENBQUMsZ0JBQW1DO1FBQ2hFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsZUFBZSxDQUFDLGdCQUFtQztRQUNsRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELFVBQVUsQ0FBQyxRQUFhLEVBQUUsSUFBZ0M7UUFDekQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFhLEVBQUUsUUFBc0MsSUFBa0IsQ0FBQztJQUM3RixvQkFBb0IsQ0FBQyxRQUFhLEVBQUUsUUFBNkI7UUFDaEUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRCxDQUFDLEVBQUUsQ0FBQTtBQUVKLE1BQU0sT0FBTyxtQ0FBbUM7SUFHL0MsWUFBb0IsWUFBcUIsSUFBSTtRQUF6QixjQUFTLEdBQVQsU0FBUyxDQUFnQjtJQUFHLENBQUM7SUFFakQsdUJBQXVCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUNBQ1osU0FBUSxVQUFVO0lBZWxCLFlBQW9CLFVBQW1CLElBQUk7UUFDMUMsS0FBSyxFQUFFLENBQUE7UUFEWSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQVZuQyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUNsRSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBRXZDLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3hFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFFekQsaURBQTRDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDMUYsZ0RBQTJDLEdBQzFDLElBQUksQ0FBQyw0Q0FBNEMsQ0FBQyxLQUFLLENBQUE7SUFJeEQsQ0FBQztJQUVELElBQUksMEJBQTBCO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSwwQkFBMEIsQ0FBQyxLQUFjO1FBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsc0NBQXNDLENBQ3JDLFdBQWlEO1FBRWpELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsY0FBYztRQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsT0FBZ0I7UUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxlQUFlLENBQUMsR0FBUTtRQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBYztRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBVyxFQUFFLE9BQWdCO1FBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsdUJBQXVCO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRUQsc0JBQXNCO1FBQ3JCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUkseUJBQXlCO1FBQzVCLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BQWdCO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtZQUN0QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxQyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdDQUNaLFNBQVEsVUFBVTtJQW1CbEIsWUFBNkIsUUFBaUI7UUFDN0MsS0FBSyxFQUFFLENBQUE7UUFEcUIsYUFBUSxHQUFSLFFBQVEsQ0FBUztRQWQ3Qix3Q0FBbUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNqRix1Q0FBa0MsR0FBRyxJQUFJLENBQUMsbUNBQW1DLENBQUMsS0FBSyxDQUFBO1FBRTNFLHdDQUFtQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3BFLElBQUksT0FBTyxFQUFnQyxDQUMzQyxDQUFBO1FBQ1EsdUNBQWtDLEdBQUcsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQTtRQUUzRSxpREFBNEMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3RSxJQUFJLE9BQU8sRUFBUSxDQUNuQixDQUFBO1FBQ1EsZ0RBQTJDLEdBQ25ELElBQUksQ0FBQyw0Q0FBNEMsQ0FBQyxLQUFLLENBQUE7UUFNeEQsMkJBQXNCLEdBQUcsS0FBSyxFQUFFLElBQVcsRUFBRSxFQUFFO1lBQzlDLDhDQUFxQztRQUN0QyxDQUFDLENBQUE7SUFKRCxDQUFDO0lBTUQscUJBQXFCLENBQUMsSUFBVztRQUNoQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsS0FBSyxDQUFDLDZCQUE2QixDQUNsQyxNQUFpQyxFQUNqQyxZQUFxQjtRQUVyQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELDJCQUEyQjtRQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxPQUFpQjtRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUFzQztRQUNqRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELDhCQUE4QjtRQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGlCQUFpQjtJQUE5QjtRQUdDLG9CQUFlLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQTJCN0IsQ0FBQztJQXpCQSxhQUFhO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxTQUFTLENBQUMsS0FBYSxFQUFFLFFBQWEsRUFBRSxPQUFzQixJQUFTLENBQUM7SUFDeEUsU0FBUyxDQUFDLEtBQWEsRUFBRSxJQUF1QixJQUFTLENBQUM7SUFDMUQsTUFBTSxDQUFDLEtBQWEsRUFBRSxTQUFnQixJQUFTLENBQUM7SUFDaEQsSUFBSSxDQUNILE1BT1k7UUFFWixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxxQkFBcUIsQ0FBQyxRQUFhLEVBQUUsTUFBYztRQUNsRCxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixtQ0FBbUM7WUFDcEMsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO0NBQ0QifQ==