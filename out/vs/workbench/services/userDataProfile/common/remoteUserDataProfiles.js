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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVXNlckRhdGFQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvY29tbW9uL3JlbW90ZVVzZXJEYXRhUHJvZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUdOLHdCQUF3QixHQUN4QixNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQy9FLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQzNHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXBFLE1BQU0sMkJBQTJCLEdBQUcsMEJBQTBCLENBQUE7QUFFOUQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUM1RCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtBQU9ELElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJB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