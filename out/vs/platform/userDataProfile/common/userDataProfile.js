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
import { hash } from '../../../base/common/hash.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { basename, joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService, toFileOperationResult, } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, } from '../../workspace/common/workspace.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { Promises } from '../../../base/common/async.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { isString } from '../../../base/common/types.js';
export var ProfileResourceType;
(function (ProfileResourceType) {
    ProfileResourceType["Settings"] = "settings";
    ProfileResourceType["Keybindings"] = "keybindings";
    ProfileResourceType["Snippets"] = "snippets";
    ProfileResourceType["Prompts"] = "prompts";
    ProfileResourceType["Tasks"] = "tasks";
    ProfileResourceType["Extensions"] = "extensions";
    ProfileResourceType["GlobalState"] = "globalState";
})(ProfileResourceType || (ProfileResourceType = {}));
export function isUserDataProfile(thing) {
    const candidate = thing;
    return !!(candidate &&
        typeof candidate === 'object' &&
        typeof candidate.id === 'string' &&
        typeof candidate.isDefault === 'boolean' &&
        typeof candidate.name === 'string' &&
        URI.isUri(candidate.location) &&
        URI.isUri(candidate.globalStorageHome) &&
        URI.isUri(candidate.settingsResource) &&
        URI.isUri(candidate.keybindingsResource) &&
        URI.isUri(candidate.tasksResource) &&
        URI.isUri(candidate.snippetsHome) &&
        URI.isUri(candidate.promptsHome) &&
        URI.isUri(candidate.extensionsResource));
}
export const IUserDataProfilesService = createDecorator('IUserDataProfilesService');
export function reviveProfile(profile, scheme) {
    return {
        id: profile.id,
        isDefault: profile.isDefault,
        name: profile.name,
        icon: profile.icon,
        location: URI.revive(profile.location).with({ scheme }),
        globalStorageHome: URI.revive(profile.globalStorageHome).with({ scheme }),
        settingsResource: URI.revive(profile.settingsResource).with({ scheme }),
        keybindingsResource: URI.revive(profile.keybindingsResource).with({ scheme }),
        tasksResource: URI.revive(profile.tasksResource).with({ scheme }),
        snippetsHome: URI.revive(profile.snippetsHome).with({ scheme }),
        promptsHome: URI.revive(profile.promptsHome).with({ scheme }),
        extensionsResource: URI.revive(profile.extensionsResource).with({ scheme }),
        cacheHome: URI.revive(profile.cacheHome).with({ scheme }),
        useDefaultFlags: profile.useDefaultFlags,
        isTransient: profile.isTransient,
        workspaces: profile.workspaces?.map((w) => URI.revive(w)),
    };
}
export function toUserDataProfile(id, name, location, profilesCacheHome, options, defaultProfile) {
    return {
        id,
        name,
        location,
        isDefault: false,
        icon: options?.icon,
        globalStorageHome: defaultProfile && options?.useDefaultFlags?.globalState
            ? defaultProfile.globalStorageHome
            : joinPath(location, 'globalStorage'),
        settingsResource: defaultProfile && options?.useDefaultFlags?.settings
            ? defaultProfile.settingsResource
            : joinPath(location, 'settings.json'),
        keybindingsResource: defaultProfile && options?.useDefaultFlags?.keybindings
            ? defaultProfile.keybindingsResource
            : joinPath(location, 'keybindings.json'),
        tasksResource: defaultProfile && options?.useDefaultFlags?.tasks
            ? defaultProfile.tasksResource
            : joinPath(location, 'tasks.json'),
        snippetsHome: defaultProfile && options?.useDefaultFlags?.snippets
            ? defaultProfile.snippetsHome
            : joinPath(location, 'snippets'),
        promptsHome: defaultProfile && options?.useDefaultFlags?.prompts
            ? defaultProfile.promptsHome
            : joinPath(location, 'prompts'),
        extensionsResource: defaultProfile && options?.useDefaultFlags?.extensions
            ? defaultProfile.extensionsResource
            : joinPath(location, 'extensions.json'),
        cacheHome: joinPath(profilesCacheHome, id),
        useDefaultFlags: options?.useDefaultFlags,
        isTransient: options?.transient,
        workspaces: options?.workspaces,
    };
}
let UserDataProfilesService = class UserDataProfilesService extends Disposable {
    static { this.PROFILES_KEY = 'userDataProfiles'; }
    static { this.PROFILE_ASSOCIATIONS_KEY = 'profileAssociations'; }
    get defaultProfile() {
        return this.profiles[0];
    }
    get profiles() {
        return [...this.profilesObject.profiles, ...this.transientProfilesObject.profiles];
    }
    constructor(environmentService, fileService, uriIdentityService, logService) {
        super();
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._onDidChangeProfiles = this._register(new Emitter());
        this.onDidChangeProfiles = this._onDidChangeProfiles.event;
        this._onWillCreateProfile = this._register(new Emitter());
        this.onWillCreateProfile = this._onWillCreateProfile.event;
        this._onWillRemoveProfile = this._register(new Emitter());
        this.onWillRemoveProfile = this._onWillRemoveProfile.event;
        this._onDidResetWorkspaces = this._register(new Emitter());
        this.onDidResetWorkspaces = this._onDidResetWorkspaces.event;
        this.profileCreationPromises = new Map();
        this.transientProfilesObject = {
            profiles: [],
            emptyWindows: new Map(),
        };
        this.profilesHome = joinPath(this.environmentService.userRoamingDataHome, 'profiles');
        this.profilesCacheHome = joinPath(this.environmentService.cacheHome, 'CachedProfilesData');
    }
    init() {
        this._profilesObject = undefined;
    }
    get profilesObject() {
        if (!this._profilesObject) {
            const defaultProfile = this.createDefaultProfile();
            const profiles = [defaultProfile];
            try {
                for (const storedProfile of this.getStoredProfiles()) {
                    if (!storedProfile.name || !isString(storedProfile.name) || !storedProfile.location) {
                        this.logService.warn('Skipping the invalid stored profile', storedProfile.location || storedProfile.name);
                        continue;
                    }
                    profiles.push(toUserDataProfile(basename(storedProfile.location), storedProfile.name, storedProfile.location, this.profilesCacheHome, { icon: storedProfile.icon, useDefaultFlags: storedProfile.useDefaultFlags }, defaultProfile));
                }
            }
            catch (error) {
                this.logService.error(error);
            }
            const emptyWindows = new Map();
            if (profiles.length) {
                try {
                    const profileAssociaitions = this.getStoredProfileAssociations();
                    if (profileAssociaitions.workspaces) {
                        for (const [workspacePath, profileId] of Object.entries(profileAssociaitions.workspaces)) {
                            const workspace = URI.parse(workspacePath);
                            const profile = profiles.find((p) => p.id === profileId);
                            if (profile) {
                                const workspaces = profile.workspaces ? profile.workspaces.slice(0) : [];
                                workspaces.push(workspace);
                                profile.workspaces = workspaces;
                            }
                        }
                    }
                    if (profileAssociaitions.emptyWindows) {
                        for (const [windowId, profileId] of Object.entries(profileAssociaitions.emptyWindows)) {
                            const profile = profiles.find((p) => p.id === profileId);
                            if (profile) {
                                emptyWindows.set(windowId, profile);
                            }
                        }
                    }
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
            this._profilesObject = { profiles, emptyWindows };
        }
        return this._profilesObject;
    }
    createDefaultProfile() {
        const defaultProfile = toUserDataProfile('__default__profile__', localize('defaultProfile', 'Default'), this.environmentService.userRoamingDataHome, this.profilesCacheHome);
        return {
            ...defaultProfile,
            extensionsResource: this.getDefaultProfileExtensionsLocation() ?? defaultProfile.extensionsResource,
            isDefault: true,
        };
    }
    async createTransientProfile(workspaceIdentifier) {
        const namePrefix = `Temp`;
        const nameRegEx = new RegExp(`${escapeRegExpCharacters(namePrefix)}\\s(\\d+)`);
        let nameIndex = 0;
        for (const profile of this.profiles) {
            const matches = nameRegEx.exec(profile.name);
            const index = matches ? parseInt(matches[1]) : 0;
            nameIndex = index > nameIndex ? index : nameIndex;
        }
        const name = `${namePrefix} ${nameIndex + 1}`;
        return this.createProfile(hash(generateUuid()).toString(16), name, { transient: true }, workspaceIdentifier);
    }
    async createNamedProfile(name, options, workspaceIdentifier) {
        return this.createProfile(hash(generateUuid()).toString(16), name, options, workspaceIdentifier);
    }
    async createProfile(id, name, options, workspaceIdentifier) {
        const profile = await this.doCreateProfile(id, name, options, workspaceIdentifier);
        return profile;
    }
    async doCreateProfile(id, name, options, workspaceIdentifier) {
        if (!isString(name) || !name) {
            throw new Error('Name of the profile is mandatory and must be of type `string`');
        }
        let profileCreationPromise = this.profileCreationPromises.get(name);
        if (!profileCreationPromise) {
            profileCreationPromise = (async () => {
                try {
                    const existing = this.profiles.find((p) => p.id === id || (!p.isTransient && !options?.transient && p.name === name));
                    if (existing) {
                        throw new Error(`Profile with ${name} name already exists`);
                    }
                    const workspace = workspaceIdentifier ? this.getWorkspace(workspaceIdentifier) : undefined;
                    if (URI.isUri(workspace)) {
                        options = { ...options, workspaces: [workspace] };
                    }
                    const profile = toUserDataProfile(id, name, joinPath(this.profilesHome, id), this.profilesCacheHome, options, this.defaultProfile);
                    await this.fileService.createFolder(profile.location);
                    const joiners = [];
                    this._onWillCreateProfile.fire({
                        profile,
                        join(promise) {
                            joiners.push(promise);
                        },
                    });
                    await Promises.settled(joiners);
                    if (workspace && !URI.isUri(workspace)) {
                        this.updateEmptyWindowAssociation(workspace, profile, !!profile.isTransient);
                    }
                    this.updateProfiles([profile], [], []);
                    return profile;
                }
                finally {
                    this.profileCreationPromises.delete(name);
                }
            })();
            this.profileCreationPromises.set(name, profileCreationPromise);
        }
        return profileCreationPromise;
    }
    async updateProfile(profile, options) {
        const profilesToUpdate = [];
        for (const existing of this.profiles) {
            let profileToUpdate;
            if (profile.id === existing.id) {
                if (!existing.isDefault) {
                    profileToUpdate = toUserDataProfile(existing.id, options.name ?? existing.name, existing.location, this.profilesCacheHome, {
                        icon: options.icon === null ? undefined : (options.icon ?? existing.icon),
                        transient: options.transient ?? existing.isTransient,
                        useDefaultFlags: options.useDefaultFlags ?? existing.useDefaultFlags,
                        workspaces: options.workspaces ?? existing.workspaces,
                    }, this.defaultProfile);
                }
                else if (options.workspaces) {
                    profileToUpdate = existing;
                    profileToUpdate.workspaces = options.workspaces;
                }
            }
            else if (options.workspaces) {
                const workspaces = existing.workspaces?.filter((w1) => !options.workspaces?.some((w2) => this.uriIdentityService.extUri.isEqual(w1, w2)));
                if (existing.workspaces?.length !== workspaces?.length) {
                    profileToUpdate = existing;
                    profileToUpdate.workspaces = workspaces;
                }
            }
            if (profileToUpdate) {
                profilesToUpdate.push(profileToUpdate);
            }
        }
        if (!profilesToUpdate.length) {
            if (profile.isDefault) {
                throw new Error('Cannot update default profile');
            }
            throw new Error(`Profile '${profile.name}' does not exist`);
        }
        this.updateProfiles([], [], profilesToUpdate);
        const updatedProfile = this.profiles.find((p) => p.id === profile.id);
        if (!updatedProfile) {
            throw new Error(`Profile '${profile.name}' was not updated`);
        }
        return updatedProfile;
    }
    async removeProfile(profileToRemove) {
        if (profileToRemove.isDefault) {
            throw new Error('Cannot remove default profile');
        }
        const profile = this.profiles.find((p) => p.id === profileToRemove.id);
        if (!profile) {
            throw new Error(`Profile '${profileToRemove.name}' does not exist`);
        }
        const joiners = [];
        this._onWillRemoveProfile.fire({
            profile,
            join(promise) {
                joiners.push(promise);
            },
        });
        try {
            await Promise.allSettled(joiners);
        }
        catch (error) {
            this.logService.error(error);
        }
        this.updateProfiles([], [profile], []);
        try {
            await this.fileService.del(profile.cacheHome, { recursive: true });
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
    async setProfileForWorkspace(workspaceIdentifier, profileToSet) {
        const profile = this.profiles.find((p) => p.id === profileToSet.id);
        if (!profile) {
            throw new Error(`Profile '${profileToSet.name}' does not exist`);
        }
        const workspace = this.getWorkspace(workspaceIdentifier);
        if (URI.isUri(workspace)) {
            const workspaces = profile.workspaces ? [...profile.workspaces] : [];
            if (!workspaces.some((w) => this.uriIdentityService.extUri.isEqual(w, workspace))) {
                workspaces.push(workspace);
                await this.updateProfile(profile, { workspaces });
            }
        }
        else {
            this.updateEmptyWindowAssociation(workspace, profile, false);
            this.updateStoredProfiles(this.profiles);
        }
    }
    unsetWorkspace(workspaceIdentifier, transient = false) {
        const workspace = this.getWorkspace(workspaceIdentifier);
        if (URI.isUri(workspace)) {
            const currentlyAssociatedProfile = this.getProfileForWorkspace(workspaceIdentifier);
            if (currentlyAssociatedProfile) {
                this.updateProfile(currentlyAssociatedProfile, {
                    workspaces: currentlyAssociatedProfile.workspaces?.filter((w) => !this.uriIdentityService.extUri.isEqual(w, workspace)),
                });
            }
        }
        else {
            this.updateEmptyWindowAssociation(workspace, undefined, transient);
            this.updateStoredProfiles(this.profiles);
        }
    }
    async resetWorkspaces() {
        this.transientProfilesObject.emptyWindows.clear();
        this.profilesObject.emptyWindows.clear();
        for (const profile of this.profiles) {
            ;
            profile.workspaces = undefined;
        }
        this.updateProfiles([], [], this.profiles);
        this._onDidResetWorkspaces.fire();
    }
    async cleanUp() {
        if (await this.fileService.exists(this.profilesHome)) {
            const stat = await this.fileService.resolve(this.profilesHome);
            await Promise.all((stat.children || [])
                .filter((child) => child.isDirectory &&
                this.profiles.every((p) => !this.uriIdentityService.extUri.isEqual(p.location, child.resource)))
                .map((child) => this.fileService.del(child.resource, { recursive: true })));
        }
    }
    async cleanUpTransientProfiles() {
        const unAssociatedTransientProfiles = this.transientProfilesObject.profiles.filter((p) => !this.isProfileAssociatedToWorkspace(p));
        await Promise.allSettled(unAssociatedTransientProfiles.map((p) => this.removeProfile(p)));
    }
    getProfileForWorkspace(workspaceIdentifier) {
        const workspace = this.getWorkspace(workspaceIdentifier);
        return URI.isUri(workspace)
            ? this.profiles.find((p) => p.workspaces?.some((w) => this.uriIdentityService.extUri.isEqual(w, workspace)))
            : (this.profilesObject.emptyWindows.get(workspace) ??
                this.transientProfilesObject.emptyWindows.get(workspace));
    }
    getWorkspace(workspaceIdentifier) {
        if (isSingleFolderWorkspaceIdentifier(workspaceIdentifier)) {
            return workspaceIdentifier.uri;
        }
        if (isWorkspaceIdentifier(workspaceIdentifier)) {
            return workspaceIdentifier.configPath;
        }
        return workspaceIdentifier.id;
    }
    isProfileAssociatedToWorkspace(profile) {
        if (profile.workspaces?.length) {
            return true;
        }
        if ([...this.profilesObject.emptyWindows.values()].some((windowProfile) => this.uriIdentityService.extUri.isEqual(windowProfile.location, profile.location))) {
            return true;
        }
        if ([...this.transientProfilesObject.emptyWindows.values()].some((windowProfile) => this.uriIdentityService.extUri.isEqual(windowProfile.location, profile.location))) {
            return true;
        }
        return false;
    }
    updateProfiles(added, removed, updated) {
        const allProfiles = [...this.profiles, ...added];
        const transientProfiles = this.transientProfilesObject.profiles;
        this.transientProfilesObject.profiles = [];
        const profiles = [];
        for (let profile of allProfiles) {
            // removed
            if (removed.some((p) => profile.id === p.id)) {
                for (const windowId of [...this.profilesObject.emptyWindows.keys()]) {
                    if (profile.id === this.profilesObject.emptyWindows.get(windowId)?.id) {
                        this.profilesObject.emptyWindows.delete(windowId);
                    }
                }
                continue;
            }
            if (!profile.isDefault) {
                profile = updated.find((p) => profile.id === p.id) ?? profile;
                const transientProfile = transientProfiles.find((p) => profile.id === p.id);
                if (profile.isTransient) {
                    this.transientProfilesObject.profiles.push(profile);
                }
                else {
                    if (transientProfile) {
                        // Move the empty window associations from the transient profile to the persisted profile
                        for (const [windowId, p] of this.transientProfilesObject.emptyWindows.entries()) {
                            if (profile.id === p.id) {
                                this.transientProfilesObject.emptyWindows.delete(windowId);
                                this.profilesObject.emptyWindows.set(windowId, profile);
                                break;
                            }
                        }
                    }
                }
            }
            if (profile.workspaces?.length === 0) {
                profile.workspaces = undefined;
            }
            profiles.push(profile);
        }
        this.updateStoredProfiles(profiles);
        this.triggerProfilesChanges(added, removed, updated);
    }
    triggerProfilesChanges(added, removed, updated) {
        this._onDidChangeProfiles.fire({ added, removed, updated, all: this.profiles });
    }
    updateEmptyWindowAssociation(windowId, newProfile, transient) {
        // Force transient if the new profile to associate is transient
        transient = newProfile?.isTransient ? true : transient;
        if (transient) {
            if (newProfile) {
                this.transientProfilesObject.emptyWindows.set(windowId, newProfile);
            }
            else {
                this.transientProfilesObject.emptyWindows.delete(windowId);
            }
        }
        else {
            // Unset the transiet association if any
            this.transientProfilesObject.emptyWindows.delete(windowId);
            if (newProfile) {
                this.profilesObject.emptyWindows.set(windowId, newProfile);
            }
            else {
                this.profilesObject.emptyWindows.delete(windowId);
            }
        }
    }
    updateStoredProfiles(profiles) {
        const storedProfiles = [];
        const workspaces = {};
        const emptyWindows = {};
        for (const profile of profiles) {
            if (profile.isTransient) {
                continue;
            }
            if (!profile.isDefault) {
                storedProfiles.push({
                    location: profile.location,
                    name: profile.name,
                    icon: profile.icon,
                    useDefaultFlags: profile.useDefaultFlags,
                });
            }
            if (profile.workspaces) {
                for (const workspace of profile.workspaces) {
                    workspaces[workspace.toString()] = profile.id;
                }
            }
        }
        for (const [windowId, profile] of this.profilesObject.emptyWindows.entries()) {
            emptyWindows[windowId.toString()] = profile.id;
        }
        this.saveStoredProfileAssociations({ workspaces, emptyWindows });
        this.saveStoredProfiles(storedProfiles);
        this._profilesObject = undefined;
    }
    getStoredProfiles() {
        return [];
    }
    saveStoredProfiles(storedProfiles) {
        throw new Error('not implemented');
    }
    getStoredProfileAssociations() {
        return {};
    }
    saveStoredProfileAssociations(storedProfileAssociations) {
        throw new Error('not implemented');
    }
    getDefaultProfileExtensionsLocation() {
        return undefined;
    }
};
UserDataProfilesService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], UserDataProfilesService);
export { UserDataProfilesService };
export class InMemoryUserDataProfilesService extends UserDataProfilesService {
    constructor() {
        super(...arguments);
        this.storedProfiles = [];
        this.storedProfileAssociations = {};
    }
    getStoredProfiles() {
        return this.storedProfiles;
    }
    saveStoredProfiles(storedProfiles) {
        this.storedProfiles = storedProfiles;
    }
    getStoredProfileAssociations() {
        return this.storedProfileAssociations;
    }
    saveStoredProfileAssociations(storedProfileAssociations) {
        this.storedProfileAssociations = storedProfileAssociations;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL2NvbW1vbi91c2VyRGF0YVByb2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsR0FBRyxFQUFVLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFFTixZQUFZLEVBQ1oscUJBQXFCLEdBQ3JCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBRU4saUNBQWlDLEVBQ2pDLHFCQUFxQixHQUNyQixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlD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