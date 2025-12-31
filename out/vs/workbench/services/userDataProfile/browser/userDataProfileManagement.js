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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGVNYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFHTix3QkFBd0IsR0FFeEIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHdCQUF3QixFQUN4QixxQkFBcUIsR0FDckIsTUFBTSxvREFBb0QsQ0FB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