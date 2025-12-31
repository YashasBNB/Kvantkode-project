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
var UserDataSyncResourceProviderService_1;
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService } from '../../storage/common/storage.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncStoreService, UserDataSyncError, USER_DATA_SYNC_SCHEME, CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM, } from './userDataSync.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { isSyncData } from './abstractSynchronizer.js';
import { parseSnippets } from './snippetsSync.js';
import { parseSettingsSyncContent } from './settingsSync.js';
import { getKeybindingsContentFromSyncContent } from './keybindingsSync.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { getTasksContentFromSyncContent } from './tasksSync.js';
import { LocalExtensionsProvider, parseExtensions, stringify as stringifyExtensions, } from './extensionsSync.js';
import { LocalGlobalStateProvider, stringify as stringifyGlobalState } from './globalStateSync.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { parseUserDataProfilesManifest, stringifyLocalProfiles, } from './userDataProfilesManifestSync.js';
import { toFormattedString } from '../../../base/common/jsonFormatter.js';
import { trim } from '../../../base/common/strings.js';
import { parsePrompts } from './promptsSync/promptsSync.js';
let UserDataSyncResourceProviderService = class UserDataSyncResourceProviderService {
    static { UserDataSyncResourceProviderService_1 = this; }
    static { this.NOT_EXISTING_RESOURCE = 'not-existing-resource'; }
    static { this.REMOTE_BACKUP_AUTHORITY = 'remote-backup'; }
    static { this.LOCAL_BACKUP_AUTHORITY = 'local-backup'; }
    constructor(userDataSyncStoreService, userDataSyncLocalStoreService, logService, uriIdentityService, environmentService, storageService, fileService, userDataProfilesService, configurationService, instantiationService) {
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncLocalStoreService = userDataSyncLocalStoreService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.fileService = fileService;
        this.userDataProfilesService = userDataProfilesService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.extUri = uriIdentityService.extUri;
    }
    async getRemoteSyncedProfiles() {
        const userData = await this.userDataSyncStoreService.readResource("profiles" /* SyncResource.Profiles */, null, undefined);
        if (userData.content) {
            const syncData = this.parseSyncData(userData.content, "profiles" /* SyncResource.Profiles */);
            return parseUserDataProfilesManifest(syncData);
        }
        return [];
    }
    async getLocalSyncedProfiles(location) {
        const refs = await this.userDataSyncLocalStoreService.getAllResourceRefs("profiles" /* SyncResource.Profiles */, undefined, location);
        if (refs.length) {
            const content = await this.userDataSyncLocalStoreService.resolveResourceContent("profiles" /* SyncResource.Profiles */, refs[0].ref, undefined, location);
            if (content) {
                const syncData = this.parseSyncData(content, "profiles" /* SyncResource.Profiles */);
                return parseUserDataProfilesManifest(syncData);
            }
        }
        return [];
    }
    async getLocalSyncedMachines(location) {
        const refs = await this.userDataSyncLocalStoreService.getAllResourceRefs('machines', undefined, location);
        if (refs.length) {
            const content = await this.userDataSyncLocalStoreService.resolveResourceContent('machines', refs[0].ref, undefined, location);
            if (content) {
                const machinesData = JSON.parse(content);
                return machinesData.machines.map((m) => ({ ...m, isCurrent: false }));
            }
        }
        return [];
    }
    async getRemoteSyncResourceHandles(syncResource, profile) {
        const handles = await this.userDataSyncStoreService.getAllResourceRefs(syncResource, profile?.collection);
        return handles.map(({ created, ref }) => ({
            created,
            uri: this.toUri({
                remote: true,
                syncResource,
                profile: profile?.id ?? this.userDataProfilesService.defaultProfile.id,
                location: undefined,
                collection: profile?.collection,
                ref,
                node: undefined,
            }),
        }));
    }
    async getLocalSyncResourceHandles(syncResource, profile, location) {
        const handles = await this.userDataSyncLocalStoreService.getAllResourceRefs(syncResource, profile?.collection, location);
        return handles.map(({ created, ref }) => ({
            created,
            uri: this.toUri({
                remote: false,
                syncResource,
                profile: profile?.id ?? this.userDataProfilesService.defaultProfile.id,
                collection: profile?.collection,
                ref,
                node: undefined,
                location,
            }),
        }));
    }
    resolveUserDataSyncResource({ uri }) {
        const resolved = this.resolveUri(uri);
        const profile = resolved
            ? this.userDataProfilesService.profiles.find((p) => p.id === resolved.profile)
            : undefined;
        return resolved && profile ? { profile, syncResource: resolved?.syncResource } : undefined;
    }
    async getAssociatedResources({ uri, }) {
        const resolved = this.resolveUri(uri);
        if (!resolved) {
            return [];
        }
        const profile = this.userDataProfilesService.profiles.find((p) => p.id === resolved.profile);
        switch (resolved.syncResource) {
            case "settings" /* SyncResource.Settings */:
                return this.getSettingsAssociatedResources(uri, profile);
            case "keybindings" /* SyncResource.Keybindings */:
                return this.getKeybindingsAssociatedResources(uri, profile);
            case "tasks" /* SyncResource.Tasks */:
                return this.getTasksAssociatedResources(uri, profile);
            case "snippets" /* SyncResource.Snippets */:
                return this.getSnippetsAssociatedResources(uri, profile);
            case "prompts" /* SyncResource.Prompts */:
                return this.getPromptsAssociatedResources(uri, profile);
            case "globalState" /* SyncResource.GlobalState */:
                return this.getGlobalStateAssociatedResources(uri, profile);
            case "extensions" /* SyncResource.Extensions */:
                return this.getExtensionsAssociatedResources(uri, profile);
            case "profiles" /* SyncResource.Profiles */:
                return this.getProfilesAssociatedResources(uri, profile);
            case "workspaceState" /* SyncResource.WorkspaceState */:
                return [];
        }
    }
    async getMachineId({ uri }) {
        const resolved = this.resolveUri(uri);
        if (!resolved) {
            return undefined;
        }
        if (resolved.remote) {
            if (resolved.ref) {
                const { content } = await this.getUserData(resolved.syncResource, resolved.ref, resolved.collection);
                if (content) {
                    const syncData = this.parseSyncData(content, resolved.syncResource);
                    return syncData?.machineId;
                }
            }
            return undefined;
        }
        if (resolved.location) {
            if (resolved.ref) {
                const content = await this.userDataSyncLocalStoreService.resolveResourceContent(resolved.syncResource, resolved.ref, resolved.collection, resolved.location);
                if (content) {
                    const syncData = this.parseSyncData(content, resolved.syncResource);
                    return syncData?.machineId;
                }
            }
            return undefined;
        }
        return getServiceMachineId(this.environmentService, this.fileService, this.storageService);
    }
    async resolveContent(uri) {
        const resolved = this.resolveUri(uri);
        if (!resolved) {
            return null;
        }
        if (resolved.node === UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE) {
            return null;
        }
        if (resolved.ref) {
            const content = await this.getContentFromStore(resolved.remote, resolved.syncResource, resolved.collection, resolved.ref, resolved.location);
            if (resolved.node && content) {
                return this.resolveNodeContent(resolved.syncResource, content, resolved.node);
            }
            return content;
        }
        if (!resolved.remote && !resolved.node) {
            return this.resolveLatestContent(resolved.syncResource, resolved.profile);
        }
        return null;
    }
    async getContentFromStore(remote, syncResource, collection, ref, location) {
        if (remote) {
            const { content } = await this.getUserData(syncResource, ref, collection);
            return content;
        }
        return this.userDataSyncLocalStoreService.resolveResourceContent(syncResource, ref, collection, location);
    }
    resolveNodeContent(syncResource, content, node) {
        const syncData = this.parseSyncData(content, syncResource);
        switch (syncResource) {
            case "settings" /* SyncResource.Settings */:
                return this.resolveSettingsNodeContent(syncData, node);
            case "keybindings" /* SyncResource.Keybindings */:
                return this.resolveKeybindingsNodeContent(syncData, node);
            case "tasks" /* SyncResource.Tasks */:
                return this.resolveTasksNodeContent(syncData, node);
            case "snippets" /* SyncResource.Snippets */:
                return this.resolveSnippetsNodeContent(syncData, node);
            case "prompts" /* SyncResource.Prompts */:
                return this.resolvePromptsNodeContent(syncData, node);
            case "globalState" /* SyncResource.GlobalState */:
                return this.resolveGlobalStateNodeContent(syncData, node);
            case "extensions" /* SyncResource.Extensions */:
                return this.resolveExtensionsNodeContent(syncData, node);
            case "profiles" /* SyncResource.Profiles */:
                return this.resolveProfileNodeContent(syncData, node);
            case "workspaceState" /* SyncResource.WorkspaceState */:
                return null;
        }
    }
    async resolveLatestContent(syncResource, profileId) {
        const profile = this.userDataProfilesService.profiles.find((p) => p.id === profileId);
        if (!profile) {
            return null;
        }
        switch (syncResource) {
            case "globalState" /* SyncResource.GlobalState */:
                return this.resolveLatestGlobalStateContent(profile);
            case "extensions" /* SyncResource.Extensions */:
                return this.resolveLatestExtensionsContent(profile);
            case "profiles" /* SyncResource.Profiles */:
                return this.resolveLatestProfilesContent(profile);
            case "settings" /* SyncResource.Settings */:
                return null;
            case "keybindings" /* SyncResource.Keybindings */:
                return null;
            case "tasks" /* SyncResource.Tasks */:
                return null;
            case "snippets" /* SyncResource.Snippets */:
                return null;
            case "prompts" /* SyncResource.Prompts */:
                return null;
            case "workspaceState" /* SyncResource.WorkspaceState */:
                return null;
        }
    }
    getSettingsAssociatedResources(uri, profile) {
        const resource = this.extUri.joinPath(uri, 'settings.json');
        const comparableResource = profile
            ? profile.settingsResource
            : this.extUri.joinPath(uri, UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE);
        return [{ resource, comparableResource }];
    }
    resolveSettingsNodeContent(syncData, node) {
        switch (node) {
            case 'settings.json':
                return parseSettingsSyncContent(syncData.content).settings;
        }
        return null;
    }
    getKeybindingsAssociatedResources(uri, profile) {
        const resource = this.extUri.joinPath(uri, 'keybindings.json');
        const comparableResource = profile
            ? profile.keybindingsResource
            : this.extUri.joinPath(uri, UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE);
        return [{ resource, comparableResource }];
    }
    resolveKeybindingsNodeContent(syncData, node) {
        switch (node) {
            case 'keybindings.json':
                return getKeybindingsContentFromSyncContent(syncData.content, !!this.configurationService.getValue(CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM), this.logService);
        }
        return null;
    }
    getTasksAssociatedResources(uri, profile) {
        const resource = this.extUri.joinPath(uri, 'tasks.json');
        const comparableResource = profile
            ? profile.tasksResource
            : this.extUri.joinPath(uri, UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE);
        return [{ resource, comparableResource }];
    }
    resolveTasksNodeContent(syncData, node) {
        switch (node) {
            case 'tasks.json':
                return getTasksContentFromSyncContent(syncData.content, this.logService);
        }
        return null;
    }
    async getSnippetsAssociatedResources(uri, profile) {
        const content = await this.resolveContent(uri);
        if (content) {
            const syncData = this.parseSyncData(content, "snippets" /* SyncResource.Snippets */);
            if (syncData) {
                const snippets = parseSnippets(syncData);
                const result = [];
                for (const snippet of Object.keys(snippets)) {
                    const resource = this.extUri.joinPath(uri, snippet);
                    const comparableResource = profile
                        ? this.extUri.joinPath(profile.snippetsHome, snippet)
                        : this.extUri.joinPath(uri, UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE);
                    result.push({ resource, comparableResource });
                }
                return result;
            }
        }
        return [];
    }
    resolveSnippetsNodeContent(syncData, node) {
        return parseSnippets(syncData)[node] || null;
    }
    async getPromptsAssociatedResources(uri, profile) {
        const content = await this.resolveContent(uri);
        if (content) {
            const syncData = this.parseSyncData(content, "prompts" /* SyncResource.Prompts */);
            if (syncData) {
                const prompts = parsePrompts(syncData);
                const result = [];
                for (const prompt of Object.keys(prompts)) {
                    const resource = this.extUri.joinPath(uri, prompt);
                    const comparableResource = profile
                        ? this.extUri.joinPath(profile.promptsHome, prompt)
                        : this.extUri.joinPath(uri, UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE);
                    result.push({ resource, comparableResource });
                }
                return result;
            }
        }
        return [];
    }
    resolvePromptsNodeContent(syncData, node) {
        return parsePrompts(syncData)[node] || null;
    }
    getExtensionsAssociatedResources(uri, profile) {
        const resource = this.extUri.joinPath(uri, 'extensions.json');
        const comparableResource = profile
            ? this.toUri({
                remote: false,
                syncResource: "extensions" /* SyncResource.Extensions */,
                profile: profile.id,
                location: undefined,
                collection: undefined,
                ref: undefined,
                node: undefined,
            })
            : this.extUri.joinPath(uri, UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE);
        return [{ resource, comparableResource }];
    }
    resolveExtensionsNodeContent(syncData, node) {
        switch (node) {
            case 'extensions.json':
                return stringifyExtensions(parseExtensions(syncData), true);
        }
        return null;
    }
    async resolveLatestExtensionsContent(profile) {
        const { localExtensions } = await this.instantiationService
            .createInstance(LocalExtensionsProvider)
            .getLocalExtensions(profile);
        return stringifyExtensions(localExtensions, true);
    }
    getGlobalStateAssociatedResources(uri, profile) {
        const resource = this.extUri.joinPath(uri, 'globalState.json');
        const comparableResource = profile
            ? this.toUri({
                remote: false,
                syncResource: "globalState" /* SyncResource.GlobalState */,
                profile: profile.id,
                location: undefined,
                collection: undefined,
                ref: undefined,
                node: undefined,
            })
            : this.extUri.joinPath(uri, UserDataSyncResourceProviderService_1.NOT_EXISTING_RESOURCE);
        return [{ resource, comparableResource }];
    }
    resolveGlobalStateNodeContent(syncData, node) {
        switch (node) {
            case 'globalState.json':
                return stringifyGlobalState(JSON.parse(syncData.content), true);
        }
        return null;
    }
    async resolveLatestGlobalStateContent(profile) {
        const localGlobalState = await this.instantiationService
            .createInstance(LocalGlobalStateProvider)
            .getLocalGlobalState(profile);
        return stringifyGlobalState(localGlobalState, true);
    }
    getProfilesAssociatedResources(uri, profile) {
        const resource = this.extUri.joinPath(uri, 'profiles.json');
        const comparableResource = this.toUri({
            remote: false,
            syncResource: "profiles" /* SyncResource.Profiles */,
            profile: this.userDataProfilesService.defaultProfile.id,
            location: undefined,
            collection: undefined,
            ref: undefined,
            node: undefined,
        });
        return [{ resource, comparableResource }];
    }
    resolveProfileNodeContent(syncData, node) {
        switch (node) {
            case 'profiles.json':
                return toFormattedString(JSON.parse(syncData.content), {});
        }
        return null;
    }
    async resolveLatestProfilesContent(profile) {
        return stringifyLocalProfiles(this.userDataProfilesService.profiles.filter((p) => !p.isDefault && !p.isTransient), true);
    }
    toUri(syncResourceUriInfo) {
        const authority = syncResourceUriInfo.remote
            ? UserDataSyncResourceProviderService_1.REMOTE_BACKUP_AUTHORITY
            : UserDataSyncResourceProviderService_1.LOCAL_BACKUP_AUTHORITY;
        const paths = [];
        if (syncResourceUriInfo.location) {
            paths.push(`scheme:${syncResourceUriInfo.location.scheme}`);
            paths.push(`authority:${syncResourceUriInfo.location.authority}`);
            paths.push(trim(syncResourceUriInfo.location.path, '/'));
        }
        paths.push(`syncResource:${syncResourceUriInfo.syncResource}`);
        paths.push(`profile:${syncResourceUriInfo.profile}`);
        if (syncResourceUriInfo.collection) {
            paths.push(`collection:${syncResourceUriInfo.collection}`);
        }
        if (syncResourceUriInfo.ref) {
            paths.push(`ref:${syncResourceUriInfo.ref}`);
        }
        if (syncResourceUriInfo.node) {
            paths.push(syncResourceUriInfo.node);
        }
        return this.extUri.joinPath(URI.from({
            scheme: USER_DATA_SYNC_SCHEME,
            authority,
            path: `/`,
            query: syncResourceUriInfo.location?.query,
            fragment: syncResourceUriInfo.location?.fragment,
        }), ...paths);
    }
    resolveUri(uri) {
        if (uri.scheme !== USER_DATA_SYNC_SCHEME) {
            return undefined;
        }
        const paths = [];
        while (uri.path !== '/') {
            paths.unshift(this.extUri.basename(uri));
            uri = this.extUri.dirname(uri);
        }
        if (paths.length < 2) {
            return undefined;
        }
        const remote = uri.authority === UserDataSyncResourceProviderService_1.REMOTE_BACKUP_AUTHORITY;
        let scheme;
        let authority;
        const locationPaths = [];
        let syncResource;
        let profile;
        let collection;
        let ref;
        let node;
        while (paths.length) {
            const path = paths.shift();
            if (path.startsWith('scheme:')) {
                scheme = path.substring('scheme:'.length);
            }
            else if (path.startsWith('authority:')) {
                authority = path.substring('authority:'.length);
            }
            else if (path.startsWith('syncResource:')) {
                syncResource = path.substring('syncResource:'.length);
            }
            else if (path.startsWith('profile:')) {
                profile = path.substring('profile:'.length);
            }
            else if (path.startsWith('collection:')) {
                collection = path.substring('collection:'.length);
            }
            else if (path.startsWith('ref:')) {
                ref = path.substring('ref:'.length);
            }
            else if (!syncResource) {
                locationPaths.push(path);
            }
            else {
                node = path;
            }
        }
        return {
            remote,
            syncResource: syncResource,
            profile: profile,
            collection,
            ref,
            node,
            location: scheme && authority !== undefined
                ? this.extUri.joinPath(URI.from({ scheme, authority, query: uri.query, fragment: uri.fragment, path: '/' }), ...locationPaths)
                : undefined,
        };
    }
    parseSyncData(content, syncResource) {
        try {
            const syncData = JSON.parse(content);
            if (isSyncData(syncData)) {
                return syncData;
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        throw new UserDataSyncError(localize('incompatible sync data', 'Cannot parse sync data as it is not compatible with the current version.'), "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */, syncResource);
    }
    async getUserData(syncResource, ref, collection) {
        const content = await this.userDataSyncStoreService.resolveResourceContent(syncResource, ref, collection);
        return { ref, content };
    }
};
UserDataSyncResourceProviderService = UserDataSyncResourceProviderService_1 = __decorate([
    __param(0, IUserDataSyncStoreService),
    __param(1, IUserDataSyncLocalStoreService),
    __param(2, IUserDataSyncLogService),
    __param(3, IUriIdentityService),
    __param(4, IEnvironmentService),
    __param(5, IStorageService),
    __param(6, IFileService),
    __param(7, IUserDataProfilesService),
    __param(8, IConfigurationService),
    __param(9, IInstantiationService)
], UserDataSyncResourceProviderService);
export { UserDataSyncResourceProviderService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jUmVzb3VyY2VQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jUmVzb3VyY2VQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFJTiw4QkFBOEIsRUFDOUIsdUJBQXVCLEVBQ3ZCLHlCQUF5QixFQUV6QixpQkFBaUIsRUFFakIscUJBQXFCLEVBR3JCLG9DQUFvQyxHQUVwQyxNQUFNLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzVELE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFB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