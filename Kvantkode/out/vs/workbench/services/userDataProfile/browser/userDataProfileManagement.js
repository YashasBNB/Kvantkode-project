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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/objects.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { isEmptyWorkspaceIdentifier, IWorkspaceContextService, toWorkspaceIdentifier, } from '../../../../platform/workspace/common/workspace.js';
import { CONFIG_NEW_WINDOW_PROFILE } from '../../../common/configuration.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IHostService } from '../../host/browser/host.js';
import { IUserDataProfileManagementService, IUserDataProfileService, } from '../common/userDataProfile.js';
let UserDataProfileManagementService = class UserDataProfileManagementService extends Disposable {
    constructor(userDataProfilesService, userDataProfileService, hostService, dialogService, workspaceContextService, extensionService, environmentService, productService, requestService, configurationService, uriIdentityService, logService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileService = userDataProfileService;
        this.hostService = hostService;
        this.dialogService = dialogService;
        this.workspaceContextService = workspaceContextService;
        this.extensionService = extensionService;
        this.environmentService = environmentService;
        this.productService = productService;
        this.requestService = requestService;
        this.configurationService = configurationService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._register(userDataProfileService.onDidChangeCurrentProfile((e) => this.onDidChangeCurrentProfile(e)));
        this._register(userDataProfilesService.onDidChangeProfiles((e) => {
            if (e.removed.some((profile) => profile.id === this.userDataProfileService.currentProfile.id)) {
                const profileToUse = this.getProfileToUseForCurrentWorkspace();
                this.switchProfile(profileToUse);
                this.changeCurrentProfile(profileToUse, localize('reload message when removed', 'The current profile has been removed. Please reload to switch back to default profile'));
                return;
            }
            const updatedCurrentProfile = e.updated.find((p) => this.userDataProfileService.currentProfile.id === p.id);
            if (updatedCurrentProfile) {
                const profileToUse = this.getProfileToUseForCurrentWorkspace();
                if (profileToUse?.id !== updatedCurrentProfile.id) {
                    this.switchProfile(profileToUse);
                    this.changeCurrentProfile(profileToUse, localize('reload message when switched', 'The current workspace has been removed from the current profile. Please reload to switch back to the updated profile'));
                }
                else {
                    this.changeCurrentProfile(updatedCurrentProfile, localize('reload message when updated', 'The current profile has been updated. Please reload to switch back to the updated profile'));
                }
            }
        }));
    }
    async onDidChangeCurrentProfile(e) {
        if (e.previous.isTransient) {
            await this.userDataProfilesService.cleanUpTransientProfiles();
        }
    }
    getWorkspaceUri() {
        const workspace = this.workspaceContextService.getWorkspace();
        return workspace.configuration ?? workspace.folders[0]?.uri;
    }
    getProfileToUseForCurrentWorkspace() {
        const workspaceUri = this.getWorkspaceUri();
        if (workspaceUri) {
            const profileForWorkspace = this.userDataProfilesService.profiles.find((profile) => profile.workspaces?.some((ws) => this.uriIdentityService.extUri.isEqual(ws, workspaceUri)));
            if (profileForWorkspace) {
                return profileForWorkspace;
            }
        }
        else {
            // If no workspace is open, use the current profile
            const currentProfile = this.userDataProfilesService.profiles.find((profile) => profile.id === this.userDataProfileService.currentProfile.id);
            if (currentProfile) {
                return currentProfile;
            }
        }
        return this.getDefaultProfileToUse();
    }
    getDefaultProfileToUse() {
        const newWindowProfileConfigValue = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE);
        if (newWindowProfileConfigValue) {
            const newWindowProfile = this.userDataProfilesService.profiles.find((profile) => profile.name === newWindowProfileConfigValue);
            if (newWindowProfile) {
                return newWindowProfile;
            }
        }
        return this.userDataProfilesService.defaultProfile;
    }
    async createProfile(name, options) {
        return this.userDataProfilesService.createNamedProfile(name, options);
    }
    async createAndEnterProfile(name, options) {
        const profile = await this.userDataProfilesService.createNamedProfile(name, options, toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
        await this.changeCurrentProfile(profile);
        return profile;
    }
    async createAndEnterTransientProfile() {
        const profile = await this.userDataProfilesService.createTransientProfile(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
        await this.changeCurrentProfile(profile);
        return profile;
    }
    async updateProfile(profile, updateOptions) {
        if (!this.userDataProfilesService.profiles.some((p) => p.id === profile.id)) {
            throw new Error(`Profile ${profile.name} does not exist`);
        }
        if (profile.isDefault) {
            throw new Error(localize('cannotRenameDefaultProfile', 'Cannot rename the default profile'));
        }
        const updatedProfile = await this.userDataProfilesService.updateProfile(profile, updateOptions);
        return updatedProfile;
    }
    async removeProfile(profile) {
        if (!this.userDataProfilesService.profiles.some((p) => p.id === profile.id)) {
            throw new Error(`Profile ${profile.name} does not exist`);
        }
        if (profile.isDefault) {
            throw new Error(localize('cannotDeleteDefaultProfile', 'Cannot delete the default profile'));
        }
        await this.userDataProfilesService.removeProfile(profile);
    }
    async switchProfile(profile) {
        if (!this.userDataProfilesService.profiles.some((p) => p.id === profile.id)) {
            throw new Error(`Profile ${profile.name} does not exist`);
        }
        if (this.userDataProfileService.currentProfile.id === profile.id) {
            return;
        }
        const workspaceUri = this.getWorkspaceUri();
        if (workspaceUri &&
            profile.workspaces?.some((ws) => this.uriIdentityService.extUri.isEqual(ws, workspaceUri))) {
            return;
        }
        const workspaceIdentifier = toWorkspaceIdentifier(this.workspaceContextService.getWorkspace());
        await this.userDataProfilesService.setProfileForWorkspace(workspaceIdentifier, profile);
        if (isEmptyWorkspaceIdentifier(workspaceIdentifier)) {
            await this.changeCurrentProfile(profile);
        }
    }
    async getBuiltinProfileTemplates() {
        if (this.productService.profileTemplatesUrl) {
            try {
                const context = await this.requestService.request({ type: 'GET', url: this.productService.profileTemplatesUrl }, CancellationToken.None);
                if (context.res.statusCode === 200) {
                    return (await asJson(context)) || [];
                }
                else {
                    this.logService.error('Could not get profile templates.', context.res.statusCode);
                }
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return [];
    }
    async changeCurrentProfile(profile, reloadMessage) {
        const isRemoteWindow = !!this.environmentService.remoteAuthority;
        const shouldRestartExtensionHosts = this.userDataProfileService.currentProfile.id !== profile.id ||
            !equals(this.userDataProfileService.currentProfile.useDefaultFlags, profile.useDefaultFlags);
        if (shouldRestartExtensionHosts) {
            if (!isRemoteWindow) {
                if (!(await this.extensionService.stopExtensionHosts(localize('switch profile', 'Switching to a profile')))) {
                    // If extension host did not stop, do not switch profile
                    if (this.userDataProfilesService.profiles.some((p) => p.id === this.userDataProfileService.currentProfile.id)) {
                        await this.userDataProfilesService.setProfileForWorkspace(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()), this.userDataProfileService.currentProfile);
                    }
                    throw new CancellationError();
                }
            }
        }
        // In a remote window update current profile before reloading so that data is preserved from current profile if asked to preserve
        await this.userDataProfileService.updateCurrentProfile(profile);
        if (shouldRestartExtensionHosts) {
            if (isRemoteWindow) {
                const { confirmed } = await this.dialogService.confirm({
                    message: reloadMessage ??
                        localize('reload message', 'Switching a profile requires reloading VS Code.'),
                    primaryButton: localize('reload button', '&&Reload'),
                });
                if (confirmed) {
                    await this.hostService.reload();
                }
            }
            else {
                await this.extensionService.startExtensionHosts();
            }
        }
    }
};
UserDataProfileManagementService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IUserDataProfileService),
    __param(2, IHostService),
    __param(3, IDialogService),
    __param(4, IWorkspaceContextService),
    __param(5, IExtensionService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, IProductService),
    __param(8, IRequestService),
    __param(9, IConfigurationService),
    __param(10, IUriIdentityService),
    __param(11, ILogService)
], UserDataProfileManagementService);
export { UserDataProfileManagementService };
registerSingleton(IUserDataProfileManagementService, UserDataProfileManagementService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZU1hbmFnZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUdOLHdCQUF3QixHQUV4QixNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsd0JBQXdCLEVBQ3hCLHFCQUFxQixHQUNyQixNQUFNLG9EQUFv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