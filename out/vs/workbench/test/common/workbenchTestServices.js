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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvY29tbW9uL3dvcmtiZW5jaFRlc3RTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFZL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXhGLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUNOLHNCQUFzQixHQUV0QixNQUFNLDZDQUE2QyxDQUFBO0FBTXBELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBY3JGLE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUkzRSxPQUFPLE9BQU8sTUFBTSw2Q0FBNkMsQ0FBQTtBQUdqRSxPQUFPLEVBQ04scUJBQXFCLEVBRXJCLFFBQVEsRUFDUixVQUFVLEdBQ1YsTUFBTSxxQ0FBcUMsQ0FBQTtBQTJCNUMsTUFBTSxPQUFPLGlCQUFrQixTQUFRLHFCQUFxQjtJQUMzRCxZQUFZLFFBQWM7UUFDekIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBQ1MsY0FBYztRQUN2QixPQUFPLElBQUksVUFBVSxFQUFFLENBQUE7SUFDeEIsQ0FBQztDQUNEO0FBRU0sSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBaUM7SUFHN0MsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDakYsQ0FBQztJQUVKLE1BQU0sQ0FBQyxRQUFhLEVBQUUsUUFBaUI7UUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUU7WUFDM0Qsa0JBQWtCLEVBQUUsUUFBUTtZQUM1QixRQUFRO1NBQ1IsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7UUFDRCxPQUFPLE9BQU8sSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0lBQzlDLENBQUM7Q0FDRCxDQUFBO0FBakJZLGlDQUFpQztJQUkzQyxXQUFBLHFCQUFxQixDQUFBO0dBSlgsaUNBQWlDLENBaUI3Qzs7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBTzlCLElBQUksd0JBQXdCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtJQUM1QyxDQUFDO0lBR0QsSUFBSSw0QkFBNEI7UUFDL0IsT0FBTyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFBO0lBQ2hELENBQUM7SUFHRCxJQUFJLDJCQUEyQjtRQUM5QixPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUE7SUFDL0MsQ0FBQztJQUdELElBQUkseUJBQXlCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtJQUM3QyxDQUFDO0lBRUQsWUFBWSxTQUFTLEdBQUcsYUFBYSxFQUFFLE9BQU8sR0FBRyxJQUFJO1FBQ3BELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzFCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDcEQsSUFBSSxDQUFDLDZCQUE2QixHQUFHLElBQUksT0FBTyxFQUFvQyxDQUFBO1FBQ3BGLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLE9BQU8sRUFBZ0MsQ0FBQTtRQUMvRSxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUE7SUFDaEUsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDcEQsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbEMsd0NBQStCO1FBQ2hDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25DLHFDQUE0QjtRQUM3QixDQUFDO1FBRUQsb0NBQTJCO0lBQzVCLENBQUM7SUFFRCxvQkFBb0I7UUFDbkIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxRQUFhO1FBQy9CLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELFlBQVksQ0FBQyxTQUFjO1FBQzFCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO0lBQzNCLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxhQUFhLEtBQUksQ0FBQztJQUVsQixpQkFBaUIsQ0FBQyxRQUFhO1FBQzlCLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQyxPQUFPLGVBQWUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELFVBQVUsQ0FBQyxxQkFBNkI7UUFDdkMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxrQkFBa0IsQ0FDakIsbUJBQWtGO1FBRWxGLE9BQU8sQ0FDTixHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxtQkFBbUIsQ0FBQyxDQUM3RixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLHNCQUFzQjtJQUM3RCxxQkFBcUIsQ0FBQyxNQUEyQjtRQUNoRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtCQUFrQjtJQUc5QixZQUFvQixJQUFVO1FBQVYsU0FBSSxHQUFKLElBQUksQ0FBTTtJQUFHLENBQUM7SUFFbEMsS0FBSyxDQUFDLHNCQUFzQixLQUFtQixDQUFDO0lBQ2hELEtBQUssQ0FBQyxTQUFTLEtBQW1CLENBQUM7SUFDbkMsS0FBSyxDQUFDLE1BQU0sS0FBbUIsQ0FBQztJQUNoQyxLQUFLLENBQUMsVUFBVSxLQUFtQixDQUFDO0lBQ3BDLEtBQUssQ0FBQyxNQUFNLEtBQW1CLENBQUM7SUFDaEMsaUJBQWlCLENBQUMsTUFBMEMsSUFBUyxDQUFDO0lBQ3RFLEtBQUssS0FBVSxDQUFDO0lBQ2hCLG1CQUFtQixLQUFVLENBQUM7SUFDOUIsVUFBVTtRQUNULE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxLQUF1QixJQUFrQixDQUFDO0lBQzNFLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxLQUF1QixJQUFrQixDQUFDO0lBQ3pFLDBCQUEwQixDQUFDLGFBQXFCO1FBQy9DLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBQ0QsaUJBQWlCLENBQUMsYUFBcUI7UUFDdEMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsVUFBVTtJQWdCOUMsWUFDVSxRQUFhLEVBQ3RCLE9BQU8sR0FBRyxLQUFLLEVBQ04sU0FBUyxxQkFBcUI7UUFFdkMsS0FBSyxFQUFFLENBQUE7UUFKRSxhQUFRLEdBQVIsUUFBUSxDQUFLO1FBRWIsV0FBTSxHQUFOLE1BQU0sQ0FBd0I7UUFsQnZCLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQy9ELHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFdkMsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDakUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUUzQyxlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBbUMsQ0FBQyxDQUFBO1FBQ25GLGNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQTtRQUVqQyxpQkFBWSx3Q0FBK0I7UUFJNUMsVUFBSyxHQUFHLEtBQUssQ0FBQTtRQVNwQixJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUE7SUFDckIsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFjO1FBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtZQUNsQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsT0FBZTtRQUN6QixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFzQixFQUFFLElBQTRCO1FBQzlELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3BCLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBdUI7WUFDOUMsSUFBSSxFQUFFLElBQUksSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUMzQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU07U0FDdkIsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUF3QjtRQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQXdCO1FBQ3BDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FDN0IsUUFBYSxFQUNiLFFBQVEsR0FBRyxLQUFLLEVBQ2hCLE1BQWdCLEVBQ2hCLFdBQXFCLEVBQ3JCLFFBQW1GO0lBRW5GLE9BQU87UUFDTixRQUFRO1FBQ1IsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUU7UUFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDakIsSUFBSSxFQUFFLEVBQUU7UUFDUixNQUFNLEVBQUUsTUFBTSxJQUFJLElBQUk7UUFDdEIsV0FBVyxFQUFFLFdBQVcsSUFBSSxLQUFLO1FBQ2pDLGNBQWMsRUFBRSxLQUFLO1FBQ3JCLFFBQVE7UUFDUixNQUFNLEVBQUUsS0FBSztRQUNiLElBQUksRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQ3hCLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDMUYsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBR0Msc0NBQWlDLEdBQWdDLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDM0Usc0NBQWlDLEdBQWdDLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDM0UscUNBQWdDLEdBQWdDLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFNakUsd0JBQW1CLEdBQUcsS0FBSyxDQUFBO0lBdURyQyxDQUFDO0lBM0RBLDJCQUEyQixDQUFDLFdBQWlEO1FBQzVFLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBR0Qsa0JBQWtCLENBQUMsV0FBa0Q7UUFDcEUsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxLQUFLLENBQUMsbUJBQW1CLENBQ3hCLFdBQXlCLEVBQ3pCLE9BQXFELEVBQ3JELFFBQWtDLEVBQ2xDLEtBQXdCLElBQ1AsQ0FBQztJQUVuQixLQUFLLENBQUMsTUFBTSxDQUNYLFVBQThCLEVBQzlCLEtBQXdCLEVBQ3hCLFFBQXFDLElBQ3BCLENBQUM7SUFFbkIsMkJBQTJCLENBQUMsUUFBbUQ7UUFDOUUsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBYTtRQUNyQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxNQUFNLENBQ0wsVUFBa0MsRUFDbEMsS0FBd0IsRUFDeEIsUUFBcUM7UUFFckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxZQUFZLENBQ1gsVUFBOEIsRUFDOUIsS0FBd0IsRUFDeEIsUUFBcUM7UUFFckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQ0gsVUFBNEIsRUFDNUIsS0FBd0IsRUFDeEIsUUFBcUM7UUFFckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQ0gsVUFBNEIsRUFDNUIsS0FBd0IsRUFDeEIsUUFBcUM7UUFFckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxJQUFJO0lBQ25CLE9BQU8sY0FBYSxDQUFRLENBQUE7QUFDN0IsQ0FBQztBQU1ELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxvQkFBb0I7Q0FBRztBQUVqRSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQTtBQUUxRSxNQUFNLE9BQU8sbUJBQW1CO0lBQWhDO1FBRUMsd0JBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQXFCakMsQ0FBQztJQXBCQSwwQkFBMEIsQ0FBQyxlQUF1QjtRQUNqRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxXQUFXLENBQUMsRUFBVTtRQUNyQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCx5QkFBeUIsQ0FBQyxlQUF1QixFQUFFLEtBQWdCO1FBQ2xFLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELGdCQUFnQixDQUFDLE1BQWMsRUFBRSxLQUFnQjtRQUNoRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxvQkFBb0IsQ0FBQyxRQUFtQjtRQUN2QyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxrQkFBa0IsQ0FBQyxRQUFtQjtRQUNyQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxPQUFPLEtBQUksQ0FBQztDQUNaO0FBRUQsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxDQUFDO0lBQUE7UUFHeEMscUNBQWdDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM3QyxnQ0FBMkIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3hDLHdCQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDaEMsZ0NBQTJCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUV4QyxxQkFBZ0IsR0FBRyxLQUFLLENBQUE7UUFDeEIseUJBQW9CLEdBQUcsU0FBUyxDQUFBO0lBMkIxQyxDQUFDO0lBekJBLHdCQUF3QjtRQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELGVBQWU7UUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELHFCQUFxQjtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELGNBQWM7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELDZCQUE2QixDQUFDLGdCQUFtQztRQUNoRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELGVBQWUsQ0FBQyxnQkFBbUM7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxVQUFVLENBQUMsUUFBYSxFQUFFLElBQWdDO1FBQ3pELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBYSxFQUFFLFFBQXNDLElBQWtCLENBQUM7SUFDN0Ysb0JBQW9CLENBQUMsUUFBYSxFQUFFLFFBQTZCO1FBQ2hFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0NBQ0QsQ0FBQyxFQUFFLENBQUE7QUFFSixNQUFNLE9BQU8sbUNBQW1DO0lBRy9DLFlBQW9CLFlBQXFCLElBQUk7UUFBekIsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7SUFBRyxDQUFDO0lBRWpELHVCQUF1QjtRQUN0QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG1DQUNaLFNBQVEsVUFBVTtJQWVsQixZQUFvQixVQUFtQixJQUFJO1FBQzFDLEtBQUssRUFBRSxDQUFBO1FBRFksWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFWbkMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDbEUscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUV2QywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN4RSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBRXpELGlEQUE0QyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzFGLGdEQUEyQyxHQUMxQyxJQUFJLENBQUMsNENBQTRDLENBQUMsS0FBSyxDQUFBO0lBSXhELENBQUM7SUFFRCxJQUFJLDBCQUEwQjtRQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELElBQUksMEJBQTBCLENBQUMsS0FBYztRQUM1QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELHNDQUFzQyxDQUNyQyxXQUFpRDtRQUVqRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELGNBQWM7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELG9CQUFvQixDQUFDLE9BQWdCO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsZUFBZSxDQUFDLEdBQVE7UUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQWM7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLElBQVcsRUFBRSxPQUFnQjtRQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELHVCQUF1QjtRQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELHNCQUFzQjtRQUNyQixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFJLHlCQUF5QjtRQUM1QixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBSSxpQkFBaUI7UUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFnQjtRQUN2QyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDMUMsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQ0FDWixTQUFRLFVBQVU7SUFtQmxCLFlBQTZCLFFBQWlCO1FBQzdDLEtBQUssRUFBRSxDQUFBO1FBRHFCLGFBQVEsR0FBUixRQUFRLENBQVM7UUFkN0Isd0NBQW1DLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDakYsdUNBQWtDLEdBQUcsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQTtRQUUzRSx3Q0FBbUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNwRSxJQUFJLE9BQU8sRUFBZ0MsQ0FDM0MsQ0FBQTtRQUNRLHVDQUFrQyxHQUFHLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxLQUFLLENBQUE7UUFFM0UsaURBQTRDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDN0UsSUFBSSxPQUFPLEVBQVEsQ0FDbkIsQ0FBQTtRQUNRLGdEQUEyQyxHQUNuRCxJQUFJLENBQUMsNENBQTRDLENBQUMsS0FBSyxDQUFBO1FBTXhELDJCQUFzQixHQUFHLEtBQUssRUFBRSxJQUFXLEVBQUUsRUFBRTtZQUM5Qyw4Q0FBcUM7UUFDdEMsQ0FBQyxDQUFBO0lBSkQsQ0FBQztJQU1ELHFCQUFxQixDQUFDLElBQVc7UUFDaEMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELEtBQUssQ0FBQyw2QkFBNkIsQ0FDbEMsTUFBaUMsRUFDakMsWUFBcUI7UUFFckIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCwyQkFBMkI7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsNkJBQTZCLENBQUMsT0FBaUI7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCLENBQUMsT0FBc0M7UUFDakUsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCw4QkFBOEI7UUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFBOUI7UUFHQyxvQkFBZSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUEyQjdCLENBQUM7SUF6QkEsYUFBYTtRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsU0FBUyxDQUFDLEtBQWEsRUFBRSxRQUFhLEVBQUUsT0FBc0IsSUFBUyxDQUFDO0lBQ3hFLFNBQVMsQ0FBQyxLQUFhLEVBQUUsSUFBdUIsSUFBUyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxLQUFhLEVBQUUsU0FBZ0IsSUFBUyxDQUFDO0lBQ2hELElBQUksQ0FDSCxNQU9ZO1FBRVosT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QscUJBQXFCLENBQUMsUUFBYSxFQUFFLE1BQWM7UUFDbEQsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsbUNBQW1DO1lBQ3BDLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=