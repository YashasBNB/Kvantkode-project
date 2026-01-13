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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRXb3Jrc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBeUIsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDcEcsT0FBTyxFQUVOLGdDQUFnQyxFQUNoQyw2QkFBNkIsR0FDN0IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sd0JBQXdCLEVBRXhCLG1CQUFtQixHQUVuQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUs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