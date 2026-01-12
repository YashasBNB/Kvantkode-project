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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvY29tbW9uL3VzZXJEYXRhUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQVUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUVOLFlBQVksRUFDWixxQkFBcUIsR0FDckIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFFTixpQ0FBaUMsRUFDakMscUJBQXFCLEdBQ3JCLE1BQU0scUNBQXFDLENBQUE7QUFFNUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFXLE1BQU0sK0JBQStCLENBQUE7QUFFakUsTUFBTSxDQUFOLElBQWtCLG1CQVFqQjtBQVJELFdBQWtCLG1CQUFtQjtJQUNwQyw0Q0FBcUIsQ0FBQTtJQUNyQixrREFBMkIsQ0FBQTtJQUMzQiw0Q0FBcUIsQ0FBQTtJQUNyQiwwQ0FBbUIsQ0FBQTtJQUNuQixzQ0FBZSxDQUFBO0lBQ2YsZ0RBQXlCLENBQUE7SUFDekIsa0RBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQVJpQixtQkFBbUIsS0FBbkIsbUJBQW1CLFFBUXBDO0FBMkJELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxLQUFjO0lBQy9DLE1BQU0sU0FBUyxHQUFHLEtBQXFDLENBQUE7SUFFdkQsT0FBTyxDQUFDLENBQUMsQ0FDUixTQUFTO1FBQ1QsT0FBTyxTQUFTLEtBQUssUUFBUTtRQUM3QixPQUFPLFNBQVMsQ0FBQyxFQUFFLEtBQUssUUFBUTtRQUNoQyxPQUFPLFNBQVMsQ0FBQyxTQUFTLEtBQUssU0FBUztRQUN4QyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUTtRQUNsQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7UUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUM7UUFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUM7UUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUM7UUFDeEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDO1FBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQztRQUNqQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDaEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FDdkMsQ0FBQTtBQUNGLENBQUM7QUErQkQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUN0RCwwQkFBMEIsQ0FDMUIsQ0FBQTtBQXdDRCxNQUFNLFVBQVUsYUFBYSxDQUFDLE9BQWlDLEVBQUUsTUFBYztJQUM5RSxPQUFPO1FBQ04sRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQ2QsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1FBQzVCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtRQUNsQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7UUFDbEIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ3ZELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDekUsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUN2RSxtQkFBbUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQzdFLGFBQWEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNqRSxZQUFZLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDL0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQzdELGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDM0UsU0FBUyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ3pELGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZTtRQUN4QyxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7UUFDaEMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxFQUFVLEVBQ1YsSUFBWSxFQUNaLFFBQWEsRUFDYixpQkFBc0IsRUFDdEIsT0FBaUMsRUFDakMsY0FBaUM7SUFFakMsT0FBTztRQUNOLEVBQUU7UUFDRixJQUFJO1FBQ0osUUFBUTtRQUNSLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSTtRQUNuQixpQkFBaUIsRUFDaEIsY0FBYyxJQUFJLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVztZQUN0RCxDQUFDLENBQUMsY0FBYyxDQUFDLGlCQUFpQjtZQUNsQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUM7UUFDdkMsZ0JBQWdCLEVBQ2YsY0FBYyxJQUFJLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUTtZQUNuRCxDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQjtZQUNqQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUM7UUFDdkMsbUJBQW1CLEVBQ2xCLGNBQWMsSUFBSSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVc7WUFDdEQsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUI7WUFDcEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLENBQUM7UUFDMUMsYUFBYSxFQUNaLGNBQWMsSUFBSSxPQUFPLEVBQUUsZUFBZSxFQUFFLEtBQUs7WUFDaEQsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxhQUFhO1lBQzlCLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQztRQUNwQyxZQUFZLEVBQ1gsY0FBYyxJQUFJLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUTtZQUNuRCxDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVk7WUFDN0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDO1FBQ2xDLFdBQVcsRUFDVixjQUFjLElBQUksT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPO1lBQ2xELENBQUMsQ0FBQyxjQUFjLENBQUMsV0FBVztZQUM1QixDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUM7UUFDakMsa0JBQWtCLEVBQ2pCLGNBQWMsSUFBSSxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVU7WUFDckQsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0I7WUFDbkMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUM7UUFDekMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7UUFDMUMsZUFBZSxFQUFFLE9BQU8sRUFBRSxlQUFlO1FBQ3pDLFdBQVcsRUFBRSxPQUFPLEVBQUUsU0FBUztRQUMvQixVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVU7S0FDL0IsQ0FBQTtBQUNGLENBQUM7QUFtQk0sSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO2FBQzVCLGlCQUFZLEdBQUcsa0JBQWtCLEFBQXJCLENBQXFCO2FBQ2pDLDZCQUF3QixHQUFHLHFCQUFxQixBQUF4QixDQUF3QjtJQU8xRSxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFDRCxJQUFJLFFBQVE7UUFDWCxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBcUJELFlBQ3NCLGtCQUEwRCxFQUNqRSxXQUE0QyxFQUNyQyxrQkFBMEQsRUFDbEUsVUFBMEM7UUFFdkQsS0FBSyxFQUFFLENBQUE7UUFMaUMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNsQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQy9DLGVBQVUsR0FBVixVQUFVLENBQWE7UUF2QnJDLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUN0Rix3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRTNDLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUN0Rix3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRTNDLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUN0Rix3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRTdDLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ25FLHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFFeEQsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQXFDLENBQUE7UUFFM0QsNEJBQXVCLEdBQTJCO1lBQ3BFLFFBQVEsRUFBRSxFQUFFO1lBQ1osWUFBWSxFQUFFLElBQUksR0FBRyxFQUFFO1NBQ3ZCLENBQUE7UUFTQSxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDckYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQTtJQUNqQyxDQUFDO0lBR0QsSUFBYyxjQUFjO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7WUFDbEQsTUFBTSxRQUFRLEdBQXFDLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbkUsSUFBSSxDQUFDO2dCQUNKLEtBQUssTUFBTSxhQUFhLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztvQkFDdEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNyRixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIscUNBQXFDLEVBQ3JDLGFBQWEsQ0FBQyxRQUFRLElBQUksYUFBYSxDQUFDLElBQUksQ0FDNUMsQ0FBQTt3QkFDRCxTQUFRO29CQUNULENBQUM7b0JBQ0QsUUFBUSxDQUFDLElBQUksQ0FDWixpQkFBaUIsQ0FDaEIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDaEMsYUFBYSxDQUFDLElBQUksRUFDbEIsYUFBYSxDQUFDLFFBQVEsRUFDdEIsSUFBSSxDQUFDLGlCQUFpQixFQUN0QixFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxhQUFhLENBQUMsZUFBZSxFQUFFLEVBQzVFLGNBQWMsQ0FDZCxDQUNELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUE7WUFDeEQsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQztvQkFDSixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO29CQUNoRSxJQUFJLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUNyQyxLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FDdEQsb0JBQW9CLENBQUMsVUFBVSxDQUMvQixFQUFFLENBQUM7NEJBQ0gsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTs0QkFDMUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxTQUFTLENBQUMsQ0FBQTs0QkFDeEQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQ0FDYixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO2dDQUN4RSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dDQUMxQixPQUFPLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTs0QkFDaEMsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7b0JBQ0QsSUFBSSxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQzt3QkFDdkMsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQzs0QkFDdkYsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxTQUFTLENBQUMsQ0FBQTs0QkFDeEQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQ0FDYixZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTs0QkFDcEMsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDN0IsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQ2xELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FDdkMsc0JBQXNCLEVBQ3RCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsRUFDckMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixFQUMzQyxJQUFJLENBQUMsaUJBQWlCLENBQ3RCLENBQUE7UUFDRCxPQUFPO1lBQ04sR0FBRyxjQUFjO1lBQ2pCLGtCQUFrQixFQUNqQixJQUFJLENBQUMsbUNBQW1DLEVBQUUsSUFBSSxjQUFjLENBQUMsa0JBQWtCO1lBQ2hGLFNBQVMsRUFBRSxJQUFJO1NBQ2YsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQzNCLG1CQUE2QztRQUU3QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUE7UUFDekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDOUUsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEQsU0FBUyxHQUFHLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ2xELENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxHQUFHLFVBQVUsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUE7UUFDN0MsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUN4QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQ2pDLElBQUksRUFDSixFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFDbkIsbUJBQW1CLENBQ25CLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGtCQUFrQixDQUN2QixJQUFZLEVBQ1osT0FBaUMsRUFDakMsbUJBQTZDO1FBRTdDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO0lBQ2pHLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUNsQixFQUFVLEVBQ1YsSUFBWSxFQUNaLE9BQWlDLEVBQ2pDLG1CQUE2QztRQUU3QyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUVsRixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxLQUFLLENBQUMsZUFBZSxDQUM1QixFQUFVLEVBQ1YsSUFBWSxFQUNaLE9BQWlDLEVBQ2pDLG1CQUE2QztRQUU3QyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQywrREFBK0QsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFFRCxJQUFJLHNCQUFzQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0Isc0JBQXNCLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDcEMsSUFBSSxDQUFDO29CQUNKLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUNsQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQ2hGLENBQUE7b0JBQ0QsSUFBSSxRQUFRLEVBQUUsQ0FBQzt3QkFDZCxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixJQUFJLHNCQUFzQixDQUFDLENBQUE7b0JBQzVELENBQUM7b0JBRUQsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO29CQUMxRixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQzt3QkFDMUIsT0FBTyxHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQTtvQkFDbEQsQ0FBQztvQkFDRCxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FDaEMsRUFBRSxFQUNGLElBQUksRUFDSixRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsRUFDL0IsSUFBSSxDQUFDLGlCQUFpQixFQUN0QixPQUFPLEVBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FDbkIsQ0FBQTtvQkFDRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFFckQsTUFBTSxPQUFPLEdBQW9CLEVBQUUsQ0FBQTtvQkFDbkMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQzt3QkFDOUIsT0FBTzt3QkFDUCxJQUFJLENBQUMsT0FBTzs0QkFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO3dCQUN0QixDQUFDO3FCQUNELENBQUMsQ0FBQTtvQkFDRixNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBRS9CLElBQUksU0FBUyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO3dCQUN4QyxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO29CQUM3RSxDQUFDO29CQUNELElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7b0JBQ3RDLE9BQU8sT0FBTyxDQUFBO2dCQUNmLENBQUM7d0JBQVMsQ0FBQztvQkFDVixJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUNKLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELE9BQU8sc0JBQXNCLENBQUE7SUFDOUIsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQ2xCLE9BQXlCLEVBQ3pCLE9BQXNDO1FBRXRDLE1BQU0sZ0JBQWdCLEdBQXVCLEVBQUUsQ0FBQTtRQUMvQyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QyxJQUFJLGVBQXNELENBQUE7WUFFMUQsSUFBSSxPQUFPLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDekIsZUFBZSxHQUFHLGlCQUFpQixDQUNsQyxRQUFRLENBQUMsRUFBRSxFQUNYLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLElBQUksRUFDN0IsUUFBUSxDQUFDLFFBQVEsRUFDakIsSUFBSSxDQUFDLGlCQUFpQixFQUN0Qjt3QkFDQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUM7d0JBQ3pFLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxXQUFXO3dCQUNwRCxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUMsZUFBZTt3QkFDcEUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLFVBQVU7cUJBQ3JELEVBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FDbkIsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUMvQixlQUFlLEdBQUcsUUFBUSxDQUFBO29CQUMxQixlQUFlLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUE7Z0JBQ2hELENBQUM7WUFDRixDQUFDO2lCQUFNLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMvQixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FDN0MsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUN6RixDQUFBO2dCQUNELElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLEtBQUssVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFDO29CQUN4RCxlQUFlLEdBQUcsUUFBUSxDQUFBO29CQUMxQixlQUFlLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtnQkFDeEMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUIsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQTtZQUNqRCxDQUFDO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLE9BQU8sQ0FBQyxJQUFJLGtCQUFrQixDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBRTdDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLE9BQU8sQ0FBQyxJQUFJLG1CQUFtQixDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUVELE9BQU8sY0FBYyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLGVBQWlDO1FBQ3BELElBQUksZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQTtRQUNqRCxDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxlQUFlLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3BFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBb0IsRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7WUFDOUIsT0FBTztZQUNQLElBQUksQ0FBQyxPQUFPO2dCQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdEIsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV0QyxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLHFCQUFxQixDQUFDLEtBQUssQ0FBQywrQ0FBdUMsRUFBRSxDQUFDO2dCQUN6RSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQzNCLG1CQUE0QyxFQUM1QyxZQUE4QjtRQUU5QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLFlBQVksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLENBQUE7UUFDakUsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN4RCxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDcEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25GLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQzFCLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1lBQ2xELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjLENBQUMsbUJBQTRDLEVBQUUsWUFBcUIsS0FBSztRQUN0RixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDeEQsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUNuRixJQUFJLDBCQUEwQixFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxhQUFhLENBQUMsMEJBQTBCLEVBQUU7b0JBQzlDLFVBQVUsRUFBRSwwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUN4RCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQzVEO2lCQUNELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZTtRQUNwQixJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2pELElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3hDLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLENBQUM7WUFBNEIsT0FBUSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDN0QsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTztRQUNaLElBQUksTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUN0RCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUM5RCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7aUJBQ25CLE1BQU0sQ0FDTixDQUFDLEtBQUssRUFBRSxFQUFFLENBQ1QsS0FBSyxDQUFDLFdBQVc7Z0JBQ2pCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUNsQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FDMUUsQ0FDRjtpQkFDQSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUMzRSxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsd0JBQXdCO1FBQzdCLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQ2pGLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsQ0FDOUMsQ0FBQTtRQUNELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFGLENBQUM7SUFFRCxzQkFBc0IsQ0FDckIsbUJBQTRDO1FBRTVDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN4RCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1lBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3pCLENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FDL0U7WUFDRixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO2dCQUNoRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFUyxZQUFZLENBQUMsbUJBQTRDO1FBQ2xFLElBQUksaUNBQWlDLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDO1lBQzVELE9BQU8sbUJBQW1CLENBQUMsR0FBRyxDQUFBO1FBQy9CLENBQUM7UUFDRCxJQUFJLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUNoRCxPQUFPLG1CQUFtQixDQUFDLFVBQVUsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsT0FBTyxtQkFBbUIsQ0FBQyxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVPLDhCQUE4QixDQUFDLE9BQXlCO1FBQy9ELElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUNDLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQ3JFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUNoRixFQUNBLENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUNDLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FDOUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQ2hGLEVBQ0EsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLGNBQWMsQ0FDckIsS0FBeUIsRUFDekIsT0FBMkIsRUFDM0IsT0FBMkI7UUFFM0IsTUFBTSxXQUFXLEdBQWdDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFFN0UsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFBO1FBQy9ELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFBO1FBRTFDLE1BQU0sUUFBUSxHQUF1QixFQUFFLENBQUE7UUFFdkMsS0FBSyxJQUFJLE9BQU8sSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQyxVQUFVO1lBQ1YsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxLQUFLLE1BQU0sUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQ3JFLElBQUksT0FBTyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7d0JBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDbEQsQ0FBQztnQkFDRixDQUFDO2dCQUNELFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQTtnQkFDN0QsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUMzRSxJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDekIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ3BELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLGdCQUFnQixFQUFFLENBQUM7d0JBQ3RCLHlGQUF5Rjt3QkFDekYsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQzs0QkFDakYsSUFBSSxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQ0FDekIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7Z0NBQzFELElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0NBQ3ZELE1BQUs7NEJBQ04sQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtZQUMvQixDQUFDO1lBRUQsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QixDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFUyxzQkFBc0IsQ0FDL0IsS0FBeUIsRUFDekIsT0FBMkIsRUFDM0IsT0FBMkI7UUFFM0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUNoRixDQUFDO0lBRU8sNEJBQTRCLENBQ25DLFFBQWdCLEVBQ2hCLFVBQXdDLEVBQ3hDLFNBQWtCO1FBRWxCLCtEQUErRDtRQUMvRCxTQUFTLEdBQUcsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFFdEQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNwRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDM0QsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1Asd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzFELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDM0QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUE0QjtRQUN4RCxNQUFNLGNBQWMsR0FBNEIsRUFBRSxDQUFBO1FBQ2xELE1BQU0sVUFBVSxHQUE4QixFQUFFLENBQUE7UUFDaEQsTUFBTSxZQUFZLEdBQThCLEVBQUUsQ0FBQTtRQUVsRCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QixTQUFRO1lBQ1QsQ0FBQztZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLGNBQWMsQ0FBQyxJQUFJLENBQUM7b0JBQ25CLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtvQkFDMUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO29CQUNsQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7b0JBQ2xCLGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZTtpQkFDeEMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN4QixLQUFLLE1BQU0sU0FBUyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDNUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUE7Z0JBQzlDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzlFLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFBO1FBQy9DLENBQUM7UUFFRCxJQUFJLENBQUMsNkJBQTZCLENBQUMsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUNoRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7SUFDakMsQ0FBQztJQUVTLGlCQUFpQjtRQUMxQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDUyxrQkFBa0IsQ0FBQyxjQUF1QztRQUNuRSxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVTLDRCQUE0QjtRQUNyQyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDUyw2QkFBNkIsQ0FDdEMseUJBQW9EO1FBRXBELE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBQ1MsbUNBQW1DO1FBQzVDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7O0FBempCVyx1QkFBdUI7SUFvQ2pDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsV0FBVyxDQUFBO0dBdkNELHVCQUF1QixDQTBqQm5DOztBQUVELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSx1QkFBdUI7SUFBNUU7O1FBQ1MsbUJBQWMsR0FBNEIsRUFBRSxDQUFBO1FBUTVDLDhCQUF5QixHQUE4QixFQUFFLENBQUE7SUFTbEUsQ0FBQztJQWhCbUIsaUJBQWlCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBQ2tCLGtCQUFrQixDQUFDLGNBQXVDO1FBQzVFLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO0lBQ3JDLENBQUM7SUFHa0IsNEJBQTRCO1FBQzlDLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFBO0lBQ3RDLENBQUM7SUFDa0IsNkJBQTZCLENBQy9DLHlCQUFvRDtRQUVwRCxJQUFJLENBQUMseUJBQXlCLEdBQUcseUJBQXlCLENBQUE7SUFDM0QsQ0FBQztDQUNEIn0=