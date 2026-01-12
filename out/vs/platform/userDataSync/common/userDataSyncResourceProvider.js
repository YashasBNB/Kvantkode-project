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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jUmVzb3VyY2VQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNSZXNvdXJjZVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUlOLDhCQUE4QixFQUM5Qix1QkFBdUIsRUFDdkIseUJBQXlCLEVBRXpCLGlCQUFpQixFQUVqQixxQkFBcUIsRUFHckIsb0NBQW9DLEdBRXBDLE1BQU0sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDakQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDNUQsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDM0UsT0FBTyxFQUFF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