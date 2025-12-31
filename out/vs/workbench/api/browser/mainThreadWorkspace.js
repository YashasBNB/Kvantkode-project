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
import { isCancellationError } from '../../../base/common/errors.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isNative } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IRequestService } from '../../../platform/request/common/request.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, } from '../../../platform/workspace/common/workspaceTrust.js';
import { IWorkspaceContextService, isUntitledWorkspace, } from '../../../platform/workspace/common/workspace.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { checkGlobFileExists } from '../../services/extensions/common/workspaceContains.js';
import { QueryBuilder, } from '../../services/search/common/queryBuilder.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ISearchService, } from '../../services/search/common/search.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IEditSessionIdentityService } from '../../../platform/workspace/common/editSessions.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../common/editor.js';
import { coalesce } from '../../../base/common/arrays.js';
import { ICanonicalUriService } from '../../../platform/workspace/common/canonicalUri.js';
import { revive } from '../../../base/common/marshalling.js';
import { bufferToStream, readableToBuffer, VSBuffer } from '../../../base/common/buffer.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { consumeStream } from '../../../base/common/stream.js';
let MainThreadWorkspace = class MainThreadWorkspace {
    constructor(extHostContext, _searchService, _contextService, _editSessionIdentityService, _canonicalUriService, _editorService, _workspaceEditingService, _notificationService, _requestService, _instantiationService, _labelService, _environmentService, fileService, _workspaceTrustManagementService, _workspaceTrustRequestService, _textFileService) {
        this._searchService = _searchService;
        this._contextService = _contextService;
        this._editSessionIdentityService = _editSessionIdentityService;
        this._canonicalUriService = _canonicalUriService;
        this._editorService = _editorService;
        this._workspaceEditingService = _workspaceEditingService;
        this._notificationService = _notificationService;
        this._requestService = _requestService;
        this._instantiationService = _instantiationService;
        this._labelService = _labelService;
        this._environmentService = _environmentService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._textFileService = _textFileService;
        this._toDispose = new DisposableStore();
        this._activeCancelTokens = Object.create(null);
        // --- edit sessions ---
        this.registeredEditSessionProviders = new Map();
        // --- canonical uri identities ---
        this.registeredCanonicalUriProviders = new Map();
        this._queryBuilder = this._instantiationService.createInstance(QueryBuilder);
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostWorkspace);
        const workspace = this._contextService.getWorkspace();
        // The workspace file is provided be a unknown file system provider. It might come
        // from the extension host. So initialize now knowing that `rootPath` is undefined.
        if (workspace.configuration && !isNative && !fileService.hasProvider(workspace.configuration)) {
            this._proxy.$initializeWorkspace(this.getWorkspaceData(workspace), this.isWorkspaceTrusted());
        }
        else {
            this._contextService
                .getCompleteWorkspace()
                .then((workspace) => this._proxy.$initializeWorkspace(this.getWorkspaceData(workspace), this.isWorkspaceTrusted()));
        }
        this._contextService.onDidChangeWorkspaceFolders(this._onDidChangeWorkspace, this, this._toDispose);
        this._contextService.onDidChangeWorkbenchState(this._onDidChangeWorkspace, this, this._toDispose);
        this._workspaceTrustManagementService.onDidChangeTrust(this._onDidGrantWorkspaceTrust, this, this._toDispose);
    }
    dispose() {
        this._toDispose.dispose();
        for (const requestId in this._activeCancelTokens) {
            const tokenSource = this._activeCancelTokens[requestId];
            tokenSource.cancel();
        }
    }
    // --- workspace ---
    $updateWorkspaceFolders(extensionName, index, deleteCount, foldersToAdd) {
        const workspaceFoldersToAdd = foldersToAdd.map((f) => ({
            uri: URI.revive(f.uri),
            name: f.name,
        }));
        // Indicate in status message
        this._notificationService.status(this.getStatusMessage(extensionName, workspaceFoldersToAdd.length, deleteCount), { hideAfter: 10 * 1000 /* 10s */ });
        return this._workspaceEditingService.updateFolders(index, deleteCount, workspaceFoldersToAdd, true);
    }
    getStatusMessage(extensionName, addCount, removeCount) {
        let message;
        const wantsToAdd = addCount > 0;
        const wantsToDelete = removeCount > 0;
        // Add Folders
        if (wantsToAdd && !wantsToDelete) {
            if (addCount === 1) {
                message = localize('folderStatusMessageAddSingleFolder', "Extension '{0}' added 1 folder to the workspace", extensionName);
            }
            else {
                message = localize('folderStatusMessageAddMultipleFolders', "Extension '{0}' added {1} folders to the workspace", extensionName, addCount);
            }
        }
        // Delete Folders
        else if (wantsToDelete && !wantsToAdd) {
            if (removeCount === 1) {
                message = localize('folderStatusMessageRemoveSingleFolder', "Extension '{0}' removed 1 folder from the workspace", extensionName);
            }
            else {
                message = localize('folderStatusMessageRemoveMultipleFolders', "Extension '{0}' removed {1} folders from the workspace", extensionName, removeCount);
            }
        }
        // Change Folders
        else {
            message = localize('folderStatusChangeFolder', "Extension '{0}' changed folders of the workspace", extensionName);
        }
        return message;
    }
    _onDidChangeWorkspace() {
        this._proxy.$acceptWorkspaceData(this.getWorkspaceData(this._contextService.getWorkspace()));
    }
    getWorkspaceData(workspace) {
        if (this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return null;
        }
        return {
            configuration: workspace.configuration || undefined,
            isUntitled: workspace.configuration
                ? isUntitledWorkspace(workspace.configuration, this._environmentService)
                : false,
            folders: workspace.folders,
            id: workspace.id,
            name: this._labelService.getWorkspaceLabel(workspace),
            transient: workspace.transient,
        };
    }
    // --- search ---
    $startFileSearch(_includeFolder, options, token) {
        const includeFolder = URI.revive(_includeFolder);
        const workspace = this._contextService.getWorkspace();
        const query = this._queryBuilder.file(includeFolder ? [includeFolder] : workspace.folders, revive(options));
        return this._searchService.fileSearch(query, token).then((result) => {
            return result.results.map((m) => m.resource);
        }, (err) => {
            if (!isCancellationError(err)) {
                return Promise.reject(err);
            }
            return null;
        });
    }
    $startTextSearch(pattern, _folder, options, requestId, token) {
        const folder = URI.revive(_folder);
        const workspace = this._contextService.getWorkspace();
        const folders = folder ? [folder] : workspace.folders.map((folder) => folder.uri);
        const query = this._queryBuilder.text(pattern, folders, revive(options));
        query._reason = 'startTextSearch';
        const onProgress = (p) => {
            if (p.results) {
                this._proxy.$handleTextSearchResult(p, requestId);
            }
        };
        const search = this._searchService.textSearch(query, token, onProgress).then((result) => {
            return { limitHit: result.limitHit };
        }, (err) => {
            if (!isCancellationError(err)) {
                return Promise.reject(err);
            }
            return null;
        });
        return search;
    }
    $checkExists(folders, includes, token) {
        return this._instantiationService.invokeFunction((accessor) => checkGlobFileExists(accessor, folders, includes, token));
    }
    // --- save & edit resources ---
    async $save(uriComponents, options) {
        const uri = URI.revive(uriComponents);
        const editors = [
            ...this._editorService.findEditors(uri, { supportSideBySide: SideBySideEditor.PRIMARY }),
        ];
        const result = await this._editorService.save(editors, {
            reason: 1 /* SaveReason.EXPLICIT */,
            saveAs: options.saveAs,
            force: !options.saveAs,
        });
        return this._saveResultToUris(result).at(0);
    }
    _saveResultToUris(result) {
        if (!result.success) {
            return [];
        }
        return coalesce(result.editors.map((editor) => EditorResourceAccessor.getCanonicalUri(editor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })));
    }
    $saveAll(includeUntitled) {
        return this._editorService.saveAll({ includeUntitled }).then((res) => res.success);
    }
    $resolveProxy(url) {
        return this._requestService.resolveProxy(url);
    }
    $lookupAuthorization(authInfo) {
        return this._requestService.lookupAuthorization(authInfo);
    }
    $lookupKerberosAuthorization(url) {
        return this._requestService.lookupKerberosAuthorization(url);
    }
    $loadCertificates() {
        return this._requestService.loadCertificates();
    }
    // --- trust ---
    $requestWorkspaceTrust(options) {
        return this._workspaceTrustRequestService.requestWorkspaceTrust(options);
    }
    isWorkspaceTrusted() {
        return this._workspaceTrustManagementService.isWorkspaceTrusted();
    }
    _onDidGrantWorkspaceTrust() {
        this._proxy.$onDidGrantWorkspaceTrust();
    }
    $registerEditSessionIdentityProvider(handle, scheme) {
        const disposable = this._editSessionIdentityService.registerEditSessionIdentityProvider({
            scheme: scheme,
            getEditSessionIdentifier: async (workspaceFolder, token) => {
                return this._proxy.$getEditSessionIdentifier(workspaceFolder.uri, token);
            },
            provideEditSessionIdentityMatch: async (workspaceFolder, identity1, identity2, token) => {
                return this._proxy.$provideEditSessionIdentityMatch(workspaceFolder.uri, identity1, identity2, token);
            },
        });
        this.registeredEditSessionProviders.set(handle, disposable);
        this._toDispose.add(disposable);
    }
    $unregisterEditSessionIdentityProvider(handle) {
        const disposable = this.registeredEditSessionProviders.get(handle);
        disposable?.dispose();
        this.registeredEditSessionProviders.delete(handle);
    }
    $registerCanonicalUriProvider(handle, scheme) {
        const disposable = this._canonicalUriService.registerCanonicalUriProvider({
            scheme: scheme,
            provideCanonicalUri: async (uri, targetScheme, token) => {
                const result = await this._proxy.$provideCanonicalUri(uri, targetScheme, token);
                if (result) {
                    return URI.revive(result);
                }
                return result;
            },
        });
        this.registeredCanonicalUriProviders.set(handle, disposable);
        this._toDispose.add(disposable);
    }
    $unregisterCanonicalUriProvider(handle) {
        const disposable = this.registeredCanonicalUriProviders.get(handle);
        disposable?.dispose();
        this.registeredCanonicalUriProviders.delete(handle);
    }
    // --- encodings
    async $decode(content, resource, options) {
        const stream = await this._textFileService.getDecodedStream(URI.revive(resource) ?? undefined, bufferToStream(content), { acceptTextOnly: true, encoding: options?.encoding });
        return consumeStream(stream, (chunks) => chunks.join());
    }
    async $encode(content, resource, options) {
        const res = await this._textFileService.getEncodedReadable(URI.revive(resource) ?? undefined, content, { encoding: options?.encoding });
        return res instanceof VSBuffer ? res : readableToBuffer(res);
    }
};
MainThreadWorkspace = __decorate([
    extHostNamedCustomer(MainContext.MainThreadWorkspace),
    __param(1, ISearchService),
    __param(2, IWorkspaceContextService),
    __param(3, IEditSessionIdentityService),
    __param(4, ICanonicalUriService),
    __param(5, IEditorService),
    __param(6, IWorkspaceEditingService),
    __param(7, INotificationService),
    __param(8, IRequestService),
    __param(9, IInstantiationService),
    __param(10, ILabelService),
    __param(11, IEnvironmentService),
    __param(12, IFileService),
    __param(13, IWorkspaceTrustManagementService),
    __param(14, IWorkspaceTrustRequestService),
    __param(15, ITextFileService)
], MainThreadWorkspace);
export { MainThreadWorkspace };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkV29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM1RixPQUFPLEVBQXlCLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3BHLE9BQU8sRUFFTixnQ0FBZ0MsRUFDaEMsNkJBQTZCLEdBQzdCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLHdCQUF3QixFQUV4QixtQkFBbUIsR0FFbkIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVE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