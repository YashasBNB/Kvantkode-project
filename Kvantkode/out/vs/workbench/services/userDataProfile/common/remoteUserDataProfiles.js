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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfilesService, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUserDataProfileService } from './userDataProfile.js';
import { distinct } from '../../../../base/common/arrays.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { UserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfileIpc.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
const associatedRemoteProfilesKey = 'associatedRemoteProfiles';
export const IRemoteUserDataProfilesService = createDecorator('IRemoteUserDataProfilesService');
let RemoteUserDataProfilesService = class RemoteUserDataProfilesService extends Disposable {
    constructor(environmentService, remoteAgentService, userDataProfilesService, userDataProfileService, storageService, logService) {
        super();
        this.environmentService = environmentService;
        this.remoteAgentService = remoteAgentService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileService = userDataProfileService;
        this.storageService = storageService;
        this.logService = logService;
        this.initPromise = this.init();
    }
    async init() {
        const connection = this.remoteAgentService.getConnection();
        if (!connection) {
            return;
        }
        const environment = await this.remoteAgentService.getEnvironment();
        if (!environment) {
            return;
        }
        this.remoteUserDataProfilesService = new UserDataProfilesService(environment.profiles.all, environment.profiles.home, connection.getChannel('userDataProfiles'));
        this._register(this.userDataProfilesService.onDidChangeProfiles((e) => this.onDidChangeLocalProfiles(e)));
        // Associate current local profile with remote profile
        const remoteProfile = await this.getAssociatedRemoteProfile(this.userDataProfileService.currentProfile, this.remoteUserDataProfilesService);
        if (!remoteProfile.isDefault) {
            this.setAssociatedRemoteProfiles([...this.getAssociatedRemoteProfiles(), remoteProfile.id]);
        }
        this.cleanUp();
    }
    async onDidChangeLocalProfiles(e) {
        for (const profile of e.removed) {
            const remoteProfile = this.remoteUserDataProfilesService?.profiles.find((p) => p.id === profile.id);
            if (remoteProfile) {
                await this.remoteUserDataProfilesService?.removeProfile(remoteProfile);
            }
        }
    }
    async getRemoteProfiles() {
        await this.initPromise;
        if (!this.remoteUserDataProfilesService) {
            throw new ErrorNoTelemetry('Remote profiles service not available in the current window');
        }
        return this.remoteUserDataProfilesService.profiles;
    }
    async getRemoteProfile(localProfile) {
        await this.initPromise;
        if (!this.remoteUserDataProfilesService) {
            throw new ErrorNoTelemetry('Remote profiles service not available in the current window');
        }
        return this.getAssociatedRemoteProfile(localProfile, this.remoteUserDataProfilesService);
    }
    async getAssociatedRemoteProfile(localProfile, remoteUserDataProfilesService) {
        // If the local profile is the default profile, return the remote default profile
        if (localProfile.isDefault) {
            return remoteUserDataProfilesService.defaultProfile;
        }
        let profile = remoteUserDataProfilesService.profiles.find((p) => p.id === localProfile.id);
        if (!profile) {
            profile = await remoteUserDataProfilesService.createProfile(localProfile.id, localProfile.name, {
                transient: localProfile.isTransient,
                useDefaultFlags: localProfile.useDefaultFlags,
            });
            this.setAssociatedRemoteProfiles([
                ...this.getAssociatedRemoteProfiles(),
                this.userDataProfileService.currentProfile.id,
            ]);
        }
        return profile;
    }
    getAssociatedRemoteProfiles() {
        if (this.environmentService.remoteAuthority) {
            const remotes = this.parseAssociatedRemoteProfiles();
            return remotes[this.environmentService.remoteAuthority] ?? [];
        }
        return [];
    }
    setAssociatedRemoteProfiles(profiles) {
        if (this.environmentService.remoteAuthority) {
            const remotes = this.parseAssociatedRemoteProfiles();
            profiles = distinct(profiles);
            if (profiles.length) {
                remotes[this.environmentService.remoteAuthority] = profiles;
            }
            else {
                delete remotes[this.environmentService.remoteAuthority];
            }
            if (Object.keys(remotes).length) {
                this.storageService.store(associatedRemoteProfilesKey, JSON.stringify(remotes), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                this.storageService.remove(associatedRemoteProfilesKey, -1 /* StorageScope.APPLICATION */);
            }
        }
    }
    parseAssociatedRemoteProfiles() {
        if (this.environmentService.remoteAuthority) {
            const value = this.storageService.get(associatedRemoteProfilesKey, -1 /* StorageScope.APPLICATION */);
            try {
                return value ? JSON.parse(value) : {};
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return {};
    }
    async cleanUp() {
        const associatedRemoteProfiles = [];
        for (const profileId of this.getAssociatedRemoteProfiles()) {
            const remoteProfile = this.remoteUserDataProfilesService?.profiles.find((p) => p.id === profileId);
            if (!remoteProfile) {
                continue;
            }
            const localProfile = this.userDataProfilesService.profiles.find((p) => p.id === profileId);
            if (localProfile) {
                if (localProfile.name !== remoteProfile.name) {
                    await this.remoteUserDataProfilesService?.updateProfile(remoteProfile, {
                        name: localProfile.name,
                    });
                }
                associatedRemoteProfiles.push(profileId);
                continue;
            }
            if (remoteProfile) {
                // Cleanup remote profiles those are not available locally
                await this.remoteUserDataProfilesService?.removeProfile(remoteProfile);
            }
        }
        this.setAssociatedRemoteProfiles(associatedRemoteProfiles);
    }
};
RemoteUserDataProfilesService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IRemoteAgentService),
    __param(2, IUserDataProfilesService),
    __param(3, IUserDataProfileService),
    __param(4, IStorageService),
    __param(5, ILogService)
], RemoteUserDataProfilesService);
registerSingleton(IRemoteUserDataProfilesService, RemoteUserDataProfilesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVXNlckRhdGFQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9jb21tb24vcmVtb3RlVXNlckRhdGFQcm9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBR04sd0JBQXdCLEdBQ3hCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0UsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDM0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFcEUsTUFBTSwyQkFBMkIsR0FBRywwQkFBMEIsQ0FBQTtBQUU5RCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxlQUFlLENBQzVELGdDQUFnQyxDQUNoQyxDQUFBO0FBT0QsSUFBTSw2QkFBNkIsR0FBbkMsTUFB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