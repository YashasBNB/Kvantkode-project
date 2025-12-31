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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IRemoteAuthorityResolverService, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { getRemoteAuthority } from '../../../../platform/remote/common/remoteHosts.js';
import { isVirtualResource } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { isSavedWorkspace, isSingleFolderWorkspaceIdentifier, isTemporaryWorkspace, IWorkspaceContextService, toWorkspaceIdentifier, } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, IWorkspaceTrustEnablementService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { Memento } from '../../../common/memento.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isEqualAuthority } from '../../../../base/common/resources.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
export const WORKSPACE_TRUST_ENABLED = 'security.workspace.trust.enabled';
export const WORKSPACE_TRUST_STARTUP_PROMPT = 'security.workspace.trust.startupPrompt';
export const WORKSPACE_TRUST_BANNER = 'security.workspace.trust.banner';
export const WORKSPACE_TRUST_UNTRUSTED_FILES = 'security.workspace.trust.untrustedFiles';
export const WORKSPACE_TRUST_EMPTY_WINDOW = 'security.workspace.trust.emptyWindow';
export const WORKSPACE_TRUST_EXTENSION_SUPPORT = 'extensions.supportUntrustedWorkspaces';
export const WORKSPACE_TRUST_STORAGE_KEY = 'content.trust.model.key';
export class CanonicalWorkspace {
    constructor(originalWorkspace, canonicalFolderUris, canonicalConfiguration) {
        this.originalWorkspace = originalWorkspace;
        this.canonicalFolderUris = canonicalFolderUris;
        this.canonicalConfiguration = canonicalConfiguration;
    }
    get folders() {
        return this.originalWorkspace.folders.map((folder, index) => {
            return {
                index: folder.index,
                name: folder.name,
                toResource: folder.toResource,
                uri: this.canonicalFolderUris[index],
            };
        });
    }
    get transient() {
        return this.originalWorkspace.transient;
    }
    get configuration() {
        return this.canonicalConfiguration ?? this.originalWorkspace.configuration;
    }
    get id() {
        return this.originalWorkspace.id;
    }
}
let WorkspaceTrustEnablementService = class WorkspaceTrustEnablementService extends Disposable {
    constructor(configurationService, environmentService) {
        super();
        this.configurationService = configurationService;
        this.environmentService = environmentService;
    }
    isWorkspaceTrustEnabled() {
        if (this.environmentService.disableWorkspaceTrust) {
            return false;
        }
        return !!this.configurationService.getValue(WORKSPACE_TRUST_ENABLED);
    }
};
WorkspaceTrustEnablementService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkbenchEnvironmentService)
], WorkspaceTrustEnablementService);
export { WorkspaceTrustEnablementService };
let WorkspaceTrustManagementService = class WorkspaceTrustManagementService extends Disposable {
    constructor(configurationService, remoteAuthorityResolverService, storageService, uriIdentityService, environmentService, workspaceService, workspaceTrustEnablementService, fileService) {
        super();
        this.configurationService = configurationService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this.environmentService = environmentService;
        this.workspaceService = workspaceService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.fileService = fileService;
        this.storageKey = WORKSPACE_TRUST_STORAGE_KEY;
        this._onDidChangeTrust = this._register(new Emitter());
        this.onDidChangeTrust = this._onDidChangeTrust.event;
        this._onDidChangeTrustedFolders = this._register(new Emitter());
        this.onDidChangeTrustedFolders = this._onDidChangeTrustedFolders.event;
        this._canonicalStartupFiles = [];
        this._canonicalUrisResolved = false;
        this._canonicalWorkspace = this.workspaceService.getWorkspace();
        ({ promise: this._workspaceResolvedPromise, resolve: this._workspaceResolvedPromiseResolve } =
            promiseWithResolvers());
        ({
            promise: this._workspaceTrustInitializedPromise,
            resolve: this._workspaceTrustInitializedPromiseResolve,
        } = promiseWithResolvers());
        this._storedTrustState = new WorkspaceTrustMemento(isWeb && this.isEmptyWorkspace() ? undefined : this.storageService);
        this._trustTransitionManager = this._register(new WorkspaceTrustTransitionManager());
        this._trustStateInfo = this.loadTrustInfo();
        this._isTrusted = this.calculateWorkspaceTrust();
        this.initializeWorkspaceTrust();
        this.registerListeners();
    }
    //#region initialize
    initializeWorkspaceTrust() {
        // Resolve canonical Uris
        this.resolveCanonicalUris()
            .then(async () => {
            this._canonicalUrisResolved = true;
            await this.updateWorkspaceTrust();
        })
            .finally(() => {
            this._workspaceResolvedPromiseResolve();
            if (!this.environmentService.remoteAuthority) {
                this._workspaceTrustInitializedPromiseResolve();
            }
        });
        // Remote - resolve remote authority
        if (this.environmentService.remoteAuthority) {
            this.remoteAuthorityResolverService
                .resolveAuthority(this.environmentService.remoteAuthority)
                .then(async (result) => {
                this._remoteAuthority = result;
                await this.fileService.activateProvider(Schemas.vscodeRemote);
                await this.updateWorkspaceTrust();
            })
                .finally(() => {
                this._workspaceTrustInitializedPromiseResolve();
            });
        }
        // Empty workspace - save initial state to memento
        if (this.isEmptyWorkspace()) {
            this._workspaceTrustInitializedPromise.then(() => {
                if (this._storedTrustState.isEmptyWorkspaceTrusted === undefined) {
                    this._storedTrustState.isEmptyWorkspaceTrusted = this.isWorkspaceTrusted();
                }
            });
        }
    }
    //#endregion
    //#region private interface
    registerListeners() {
        this._register(this.workspaceService.onDidChangeWorkspaceFolders(async () => await this.updateWorkspaceTrust()));
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, this.storageKey, this._store)(async () => {
            /* This will only execute if storage was changed by a user action in a separate window */
            if (JSON.stringify(this._trustStateInfo) !== JSON.stringify(this.loadTrustInfo())) {
                this._trustStateInfo = this.loadTrustInfo();
                this._onDidChangeTrustedFolders.fire();
                await this.updateWorkspaceTrust();
            }
        }));
    }
    async getCanonicalUri(uri) {
        let canonicalUri = uri;
        if (this.environmentService.remoteAuthority && uri.scheme === Schemas.vscodeRemote) {
            canonicalUri = await this.remoteAuthorityResolverService.getCanonicalURI(uri);
        }
        else if (uri.scheme === 'vscode-vfs') {
            const index = uri.authority.indexOf('+');
            if (index !== -1) {
                canonicalUri = uri.with({ authority: uri.authority.substr(0, index) });
            }
        }
        // ignore query and fragent section of uris always
        return canonicalUri.with({ query: null, fragment: null });
    }
    async resolveCanonicalUris() {
        // Open editors
        const filesToOpen = [];
        if (this.environmentService.filesToOpenOrCreate) {
            filesToOpen.push(...this.environmentService.filesToOpenOrCreate);
        }
        if (this.environmentService.filesToDiff) {
            filesToOpen.push(...this.environmentService.filesToDiff);
        }
        if (this.environmentService.filesToMerge) {
            filesToOpen.push(...this.environmentService.filesToMerge);
        }
        if (filesToOpen.length) {
            const filesToOpenOrCreateUris = filesToOpen.filter((f) => !!f.fileUri).map((f) => f.fileUri);
            const canonicalFilesToOpen = await Promise.all(filesToOpenOrCreateUris.map((uri) => this.getCanonicalUri(uri)));
            this._canonicalStartupFiles.push(...canonicalFilesToOpen.filter((uri) => this._canonicalStartupFiles.every((u) => !this.uriIdentityService.extUri.isEqual(uri, u))));
        }
        // Workspace
        const workspaceUris = this.workspaceService.getWorkspace().folders.map((f) => f.uri);
        const canonicalWorkspaceFolders = await Promise.all(workspaceUris.map((uri) => this.getCanonicalUri(uri)));
        let canonicalWorkspaceConfiguration = this.workspaceService.getWorkspace().configuration;
        if (canonicalWorkspaceConfiguration &&
            isSavedWorkspace(canonicalWorkspaceConfiguration, this.environmentService)) {
            canonicalWorkspaceConfiguration = await this.getCanonicalUri(canonicalWorkspaceConfiguration);
        }
        this._canonicalWorkspace = new CanonicalWorkspace(this.workspaceService.getWorkspace(), canonicalWorkspaceFolders, canonicalWorkspaceConfiguration);
    }
    loadTrustInfo() {
        const infoAsString = this.storageService.get(this.storageKey, -1 /* StorageScope.APPLICATION */);
        let result;
        try {
            if (infoAsString) {
                result = JSON.parse(infoAsString);
            }
        }
        catch { }
        if (!result) {
            result = {
                uriTrustInfo: [],
            };
        }
        if (!result.uriTrustInfo) {
            result.uriTrustInfo = [];
        }
        result.uriTrustInfo = result.uriTrustInfo.map((info) => {
            return { uri: URI.revive(info.uri), trusted: info.trusted };
        });
        result.uriTrustInfo = result.uriTrustInfo.filter((info) => info.trusted);
        return result;
    }
    async saveTrustInfo() {
        this.storageService.store(this.storageKey, JSON.stringify(this._trustStateInfo), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._onDidChangeTrustedFolders.fire();
        await this.updateWorkspaceTrust();
    }
    getWorkspaceUris() {
        const workspaceUris = this._canonicalWorkspace.folders.map((f) => f.uri);
        const workspaceConfiguration = this._canonicalWorkspace.configuration;
        if (workspaceConfiguration &&
            isSavedWorkspace(workspaceConfiguration, this.environmentService)) {
            workspaceUris.push(workspaceConfiguration);
        }
        return workspaceUris;
    }
    calculateWorkspaceTrust() {
        // Feature is disabled
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            return true;
        }
        // Canonical Uris not yet resolved
        if (!this._canonicalUrisResolved) {
            return false;
        }
        // Remote - resolver explicitly sets workspace trust to TRUE
        if (this.environmentService.remoteAuthority && this._remoteAuthority?.options?.isTrusted) {
            return this._remoteAuthority.options.isTrusted;
        }
        // Empty workspace - use memento, open ediors, or user setting
        if (this.isEmptyWorkspace()) {
            // Use memento if present
            if (this._storedTrustState.isEmptyWorkspaceTrusted !== undefined) {
                return this._storedTrustState.isEmptyWorkspaceTrusted;
            }
            // Startup files
            if (this._canonicalStartupFiles.length) {
                return this.getUrisTrust(this._canonicalStartupFiles);
            }
            // User setting
            return !!this.configurationService.getValue(WORKSPACE_TRUST_EMPTY_WINDOW);
        }
        return this.getUrisTrust(this.getWorkspaceUris());
    }
    async updateWorkspaceTrust(trusted) {
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            return;
        }
        if (trusted === undefined) {
            await this.resolveCanonicalUris();
            trusted = this.calculateWorkspaceTrust();
        }
        if (this.isWorkspaceTrusted() === trusted) {
            return;
        }
        // Update workspace trust
        this.isTrusted = trusted;
        // Run workspace trust transition participants
        await this._trustTransitionManager.participate(trusted);
        // Fire workspace trust change event
        this._onDidChangeTrust.fire(trusted);
    }
    getUrisTrust(uris) {
        let state = true;
        for (const uri of uris) {
            const { trusted } = this.doGetUriTrustInfo(uri);
            if (!trusted) {
                state = trusted;
                return state;
            }
        }
        return state;
    }
    doGetUriTrustInfo(uri) {
        // Return trusted when workspace trust is disabled
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            return { trusted: true, uri };
        }
        if (this.isTrustedVirtualResource(uri)) {
            return { trusted: true, uri };
        }
        if (this.isTrustedByRemote(uri)) {
            return { trusted: true, uri };
        }
        let resultState = false;
        let maxLength = -1;
        let resultUri = uri;
        for (const trustInfo of this._trustStateInfo.uriTrustInfo) {
            if (this.uriIdentityService.extUri.isEqualOrParent(uri, trustInfo.uri)) {
                const fsPath = trustInfo.uri.fsPath;
                if (fsPath.length > maxLength) {
                    maxLength = fsPath.length;
                    resultState = trustInfo.trusted;
                    resultUri = trustInfo.uri;
                }
            }
        }
        return { trusted: resultState, uri: resultUri };
    }
    async doSetUrisTrust(uris, trusted) {
        let changed = false;
        for (const uri of uris) {
            if (trusted) {
                if (this.isTrustedVirtualResource(uri)) {
                    continue;
                }
                if (this.isTrustedByRemote(uri)) {
                    continue;
                }
                const foundItem = this._trustStateInfo.uriTrustInfo.find((trustInfo) => this.uriIdentityService.extUri.isEqual(trustInfo.uri, uri));
                if (!foundItem) {
                    this._trustStateInfo.uriTrustInfo.push({ uri, trusted: true });
                    changed = true;
                }
            }
            else {
                const previousLength = this._trustStateInfo.uriTrustInfo.length;
                this._trustStateInfo.uriTrustInfo = this._trustStateInfo.uriTrustInfo.filter((trustInfo) => !this.uriIdentityService.extUri.isEqual(trustInfo.uri, uri));
                if (previousLength !== this._trustStateInfo.uriTrustInfo.length) {
                    changed = true;
                }
            }
        }
        if (changed) {
            await this.saveTrustInfo();
        }
    }
    isEmptyWorkspace() {
        if (this.workspaceService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return true;
        }
        const workspace = this.workspaceService.getWorkspace();
        if (workspace) {
            return (isTemporaryWorkspace(this.workspaceService.getWorkspace()) && workspace.folders.length === 0);
        }
        return false;
    }
    isTrustedVirtualResource(uri) {
        return isVirtualResource(uri) && uri.scheme !== 'vscode-vfs';
    }
    isTrustedByRemote(uri) {
        if (!this.environmentService.remoteAuthority) {
            return false;
        }
        if (!this._remoteAuthority) {
            return false;
        }
        return (isEqualAuthority(getRemoteAuthority(uri), this._remoteAuthority.authority.authority) &&
            !!this._remoteAuthority.options?.isTrusted);
    }
    set isTrusted(value) {
        this._isTrusted = value;
        // Reset acceptsOutOfWorkspaceFiles
        if (!value) {
            this._storedTrustState.acceptsOutOfWorkspaceFiles = false;
        }
        // Empty workspace - save memento
        if (this.isEmptyWorkspace()) {
            this._storedTrustState.isEmptyWorkspaceTrusted = value;
        }
    }
    //#endregion
    //#region public interface
    get workspaceResolved() {
        return this._workspaceResolvedPromise;
    }
    get workspaceTrustInitialized() {
        return this._workspaceTrustInitializedPromise;
    }
    get acceptsOutOfWorkspaceFiles() {
        return this._storedTrustState.acceptsOutOfWorkspaceFiles;
    }
    set acceptsOutOfWorkspaceFiles(value) {
        this._storedTrustState.acceptsOutOfWorkspaceFiles = value;
    }
    isWorkspaceTrusted() {
        return this._isTrusted;
    }
    isWorkspaceTrustForced() {
        // Remote - remote authority explicitly sets workspace trust
        if (this.environmentService.remoteAuthority &&
            this._remoteAuthority &&
            this._remoteAuthority.options?.isTrusted !== undefined) {
            return true;
        }
        // All workspace uris are trusted automatically
        const workspaceUris = this.getWorkspaceUris().filter((uri) => !this.isTrustedVirtualResource(uri));
        if (workspaceUris.length === 0) {
            return true;
        }
        return false;
    }
    canSetParentFolderTrust() {
        const workspaceIdentifier = toWorkspaceIdentifier(this._canonicalWorkspace);
        if (!isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
            return false;
        }
        if (workspaceIdentifier.uri.scheme !== Schemas.file &&
            workspaceIdentifier.uri.scheme !== Schemas.vscodeRemote) {
            return false;
        }
        const parentFolder = this.uriIdentityService.extUri.dirname(workspaceIdentifier.uri);
        if (this.uriIdentityService.extUri.isEqual(workspaceIdentifier.uri, parentFolder)) {
            return false;
        }
        return true;
    }
    async setParentFolderTrust(trusted) {
        if (this.canSetParentFolderTrust()) {
            const workspaceUri = toWorkspaceIdentifier(this._canonicalWorkspace).uri;
            const parentFolder = this.uriIdentityService.extUri.dirname(workspaceUri);
            await this.setUrisTrust([parentFolder], trusted);
        }
    }
    canSetWorkspaceTrust() {
        // Remote - remote authority not yet resolved, or remote authority explicitly sets workspace trust
        if (this.environmentService.remoteAuthority &&
            (!this._remoteAuthority || this._remoteAuthority.options?.isTrusted !== undefined)) {
            return false;
        }
        // Empty workspace
        if (this.isEmptyWorkspace()) {
            return true;
        }
        // All workspace uris are trusted automatically
        const workspaceUris = this.getWorkspaceUris().filter((uri) => !this.isTrustedVirtualResource(uri));
        if (workspaceUris.length === 0) {
            return false;
        }
        // Untrusted workspace
        if (!this.isWorkspaceTrusted()) {
            return true;
        }
        // Trusted workspaces
        // Can only untrusted in the single folder scenario
        const workspaceIdentifier = toWorkspaceIdentifier(this._canonicalWorkspace);
        if (!isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
            return false;
        }
        // Can only be untrusted in certain schemes
        if (workspaceIdentifier.uri.scheme !== Schemas.file &&
            workspaceIdentifier.uri.scheme !== 'vscode-vfs') {
            return false;
        }
        // If the current folder isn't trusted directly, return false
        const trustInfo = this.doGetUriTrustInfo(workspaceIdentifier.uri);
        if (!trustInfo.trusted ||
            !this.uriIdentityService.extUri.isEqual(workspaceIdentifier.uri, trustInfo.uri)) {
            return false;
        }
        // Check if the parent is also trusted
        if (this.canSetParentFolderTrust()) {
            const parentFolder = this.uriIdentityService.extUri.dirname(workspaceIdentifier.uri);
            const parentPathTrustInfo = this.doGetUriTrustInfo(parentFolder);
            if (parentPathTrustInfo.trusted) {
                return false;
            }
        }
        return true;
    }
    async setWorkspaceTrust(trusted) {
        // Empty workspace
        if (this.isEmptyWorkspace()) {
            await this.updateWorkspaceTrust(trusted);
            return;
        }
        const workspaceFolders = this.getWorkspaceUris();
        await this.setUrisTrust(workspaceFolders, trusted);
    }
    async getUriTrustInfo(uri) {
        // Return trusted when workspace trust is disabled
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            return { trusted: true, uri };
        }
        // Uri is trusted automatically by the remote
        if (this.isTrustedByRemote(uri)) {
            return { trusted: true, uri };
        }
        return this.doGetUriTrustInfo(await this.getCanonicalUri(uri));
    }
    async setUrisTrust(uris, trusted) {
        this.doSetUrisTrust(await Promise.all(uris.map((uri) => this.getCanonicalUri(uri))), trusted);
    }
    getTrustedUris() {
        return this._trustStateInfo.uriTrustInfo.map((info) => info.uri);
    }
    async setTrustedUris(uris) {
        this._trustStateInfo.uriTrustInfo = [];
        for (const uri of uris) {
            const canonicalUri = await this.getCanonicalUri(uri);
            const cleanUri = this.uriIdentityService.extUri.removeTrailingPathSeparator(canonicalUri);
            let added = false;
            for (const addedUri of this._trustStateInfo.uriTrustInfo) {
                if (this.uriIdentityService.extUri.isEqual(addedUri.uri, cleanUri)) {
                    added = true;
                    break;
                }
            }
            if (added) {
                continue;
            }
            this._trustStateInfo.uriTrustInfo.push({
                trusted: true,
                uri: cleanUri,
            });
        }
        await this.saveTrustInfo();
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        return this._trustTransitionManager.addWorkspaceTrustTransitionParticipant(participant);
    }
};
WorkspaceTrustManagementService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IRemoteAuthorityResolverService),
    __param(2, IStorageService),
    __param(3, IUriIdentityService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IWorkspaceContextService),
    __param(6, IWorkspaceTrustEnablementService),
    __param(7, IFileService)
], WorkspaceTrustManagementService);
export { WorkspaceTrustManagementService };
let WorkspaceTrustRequestService = class WorkspaceTrustRequestService extends Disposable {
    constructor(configurationService, workspaceTrustManagementService) {
        super();
        this.configurationService = configurationService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this._onDidInitiateOpenFilesTrustRequest = this._register(new Emitter());
        this.onDidInitiateOpenFilesTrustRequest = this._onDidInitiateOpenFilesTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequest = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequest = this._onDidInitiateWorkspaceTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequestOnStartup = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequestOnStartup = this._onDidInitiateWorkspaceTrustRequestOnStartup.event;
    }
    //#region Open file(s) trust request
    get untrustedFilesSetting() {
        return this.configurationService.getValue(WORKSPACE_TRUST_UNTRUSTED_FILES);
    }
    set untrustedFilesSetting(value) {
        this.configurationService.updateValue(WORKSPACE_TRUST_UNTRUSTED_FILES, value);
    }
    async completeOpenFilesTrustRequest(result, saveResponse) {
        if (!this._openFilesTrustRequestResolver) {
            return;
        }
        // Set acceptsOutOfWorkspaceFiles
        if (result === 1 /* WorkspaceTrustUriResponse.Open */) {
            this.workspaceTrustManagementService.acceptsOutOfWorkspaceFiles = true;
        }
        // Save response
        if (saveResponse) {
            if (result === 1 /* WorkspaceTrustUriResponse.Open */) {
                this.untrustedFilesSetting = 'open';
            }
            if (result === 2 /* WorkspaceTrustUriResponse.OpenInNewWindow */) {
                this.untrustedFilesSetting = 'newWindow';
            }
        }
        // Resolve promise
        this._openFilesTrustRequestResolver(result);
        this._openFilesTrustRequestResolver = undefined;
        this._openFilesTrustRequestPromise = undefined;
    }
    async requestOpenFilesTrust(uris) {
        // If workspace is untrusted, there is no conflict
        if (!this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            return 1 /* WorkspaceTrustUriResponse.Open */;
        }
        const openFilesTrustInfo = await Promise.all(uris.map((uri) => this.workspaceTrustManagementService.getUriTrustInfo(uri)));
        // If all uris are trusted, there is no conflict
        if (openFilesTrustInfo.map((info) => info.trusted).every((trusted) => trusted)) {
            return 1 /* WorkspaceTrustUriResponse.Open */;
        }
        // If user has setting, don't need to ask
        if (this.untrustedFilesSetting !== 'prompt') {
            if (this.untrustedFilesSetting === 'newWindow') {
                return 2 /* WorkspaceTrustUriResponse.OpenInNewWindow */;
            }
            if (this.untrustedFilesSetting === 'open') {
                return 1 /* WorkspaceTrustUriResponse.Open */;
            }
        }
        // If we already asked the user, don't need to ask again
        if (this.workspaceTrustManagementService.acceptsOutOfWorkspaceFiles) {
            return 1 /* WorkspaceTrustUriResponse.Open */;
        }
        // Create/return a promise
        if (!this._openFilesTrustRequestPromise) {
            this._openFilesTrustRequestPromise = new Promise((resolve) => {
                this._openFilesTrustRequestResolver = resolve;
            });
        }
        else {
            return this._openFilesTrustRequestPromise;
        }
        this._onDidInitiateOpenFilesTrustRequest.fire();
        return this._openFilesTrustRequestPromise;
    }
    //#endregion
    //#region Workspace trust request
    resolveWorkspaceTrustRequest(trusted) {
        if (this._workspaceTrustRequestResolver) {
            this._workspaceTrustRequestResolver(trusted ?? this.workspaceTrustManagementService.isWorkspaceTrusted());
            this._workspaceTrustRequestResolver = undefined;
            this._workspaceTrustRequestPromise = undefined;
        }
    }
    cancelWorkspaceTrustRequest() {
        if (this._workspaceTrustRequestResolver) {
            this._workspaceTrustRequestResolver(undefined);
            this._workspaceTrustRequestResolver = undefined;
            this._workspaceTrustRequestPromise = undefined;
        }
    }
    async completeWorkspaceTrustRequest(trusted) {
        if (trusted === undefined ||
            trusted === this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            this.resolveWorkspaceTrustRequest(trusted);
            return;
        }
        // Register one-time event handler to resolve the promise when workspace trust changed
        Event.once(this.workspaceTrustManagementService.onDidChangeTrust)((trusted) => this.resolveWorkspaceTrustRequest(trusted));
        // Update storage, transition workspace state
        await this.workspaceTrustManagementService.setWorkspaceTrust(trusted);
    }
    async requestWorkspaceTrust(options) {
        // Trusted workspace
        if (this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            return this.workspaceTrustManagementService.isWorkspaceTrusted();
        }
        // Modal request
        if (!this._workspaceTrustRequestPromise) {
            // Create promise
            this._workspaceTrustRequestPromise = new Promise((resolve) => {
                this._workspaceTrustRequestResolver = resolve;
            });
        }
        else {
            // Return existing promise
            return this._workspaceTrustRequestPromise;
        }
        this._onDidInitiateWorkspaceTrustRequest.fire(options);
        return this._workspaceTrustRequestPromise;
    }
    requestWorkspaceTrustOnStartup() {
        if (!this._workspaceTrustRequestPromise) {
            // Create promise
            this._workspaceTrustRequestPromise = new Promise((resolve) => {
                this._workspaceTrustRequestResolver = resolve;
            });
        }
        this._onDidInitiateWorkspaceTrustRequestOnStartup.fire();
    }
};
WorkspaceTrustRequestService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceTrustManagementService)
], WorkspaceTrustRequestService);
export { WorkspaceTrustRequestService };
class WorkspaceTrustTransitionManager extends Disposable {
    constructor() {
        super(...arguments);
        this.participants = new LinkedList();
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        const remove = this.participants.push(participant);
        return toDisposable(() => remove());
    }
    async participate(trusted) {
        for (const participant of this.participants) {
            await participant.participate(trusted);
        }
    }
    dispose() {
        this.participants.clear();
        super.dispose();
    }
}
class WorkspaceTrustMemento {
    constructor(storageService) {
        this._acceptsOutOfWorkspaceFilesKey = 'acceptsOutOfWorkspaceFiles';
        this._isEmptyWorkspaceTrustedKey = 'isEmptyWorkspaceTrusted';
        if (storageService) {
            this._memento = new Memento('workspaceTrust', storageService);
            this._mementoObject = this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this._mementoObject = {};
        }
    }
    get acceptsOutOfWorkspaceFiles() {
        return this._mementoObject[this._acceptsOutOfWorkspaceFilesKey] ?? false;
    }
    set acceptsOutOfWorkspaceFiles(value) {
        this._mementoObject[this._acceptsOutOfWorkspaceFilesKey] = value;
        this._memento?.saveMemento();
    }
    get isEmptyWorkspaceTrusted() {
        return this._mementoObject[this._isEmptyWorkspaceTrustedKey];
    }
    set isEmptyWorkspaceTrusted(value) {
        this._mementoObject[this._isEmptyWorkspaceTrustedKey] = value;
        this._memento?.saveMemento();
    }
}
registerSingleton(IWorkspaceTrustRequestService, WorkspaceTrustRequestService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9jb21tb24vd29ya3NwYWNlVHJ1c3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sK0JBQStCLEdBRS9CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsaUNBQWlDLEVBQ2pDLG9CQUFvQixFQUVwQix3QkFBd0IsRUFFeEIscUJBQXFCLEdBRXJCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUVOLGdDQUFnQyxFQUdoQyw2QkFBNkIsRUFHN0IsZ0NBQWdDLEdBQ2hDLE1BQU0seURBQXlELENBQUE7QUFDaEUs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