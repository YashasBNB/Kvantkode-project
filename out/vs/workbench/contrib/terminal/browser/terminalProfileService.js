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
import * as arrays from '../../../../base/common/arrays.js';
import * as objects from '../../../../base/common/objects.js';
import { AutoOpenBarrier } from '../../../../base/common/async.js';
import { throttle } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb, isWindows, OS, } from '../../../../base/common/platform.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { registerTerminalDefaultProfileConfiguration } from '../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { terminalIconsEqual, terminalProfileArgsMatch, } from '../../../../platform/terminal/common/terminalProfiles.js';
import { ITerminalInstanceService } from './terminal.js';
import { refreshTerminalActions } from './terminalActions.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { ITerminalContributionService } from '../common/terminalExtensionPoints.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
/*
 * Links TerminalService with TerminalProfileResolverService
 * and keeps the available terminal profiles updated
 */
let TerminalProfileService = class TerminalProfileService extends Disposable {
    get onDidChangeAvailableProfiles() {
        return this._onDidChangeAvailableProfiles.event;
    }
    get profilesReady() {
        return this._profilesReadyPromise;
    }
    get availableProfiles() {
        if (!this._platformConfigJustRefreshed) {
            this.refreshAvailableProfiles();
        }
        return this._availableProfiles || [];
    }
    get contributedProfiles() {
        const userConfiguredProfileNames = this._availableProfiles?.map((p) => p.profileName) || [];
        // Allow a user defined profile to override an extension contributed profile with the same name
        return (this._contributedProfiles?.filter((p) => !userConfiguredProfileNames.includes(p.title)) || []);
    }
    constructor(_contextKeyService, _configurationService, _terminalContributionService, _extensionService, _remoteAgentService, _environmentService, _terminalInstanceService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._terminalContributionService = _terminalContributionService;
        this._extensionService = _extensionService;
        this._remoteAgentService = _remoteAgentService;
        this._environmentService = _environmentService;
        this._terminalInstanceService = _terminalInstanceService;
        this._contributedProfiles = [];
        this._platformConfigJustRefreshed = false;
        this._refreshTerminalActionsDisposable = this._register(new MutableDisposable());
        this._profileProviders = new Map();
        this._onDidChangeAvailableProfiles = this._register(new Emitter());
        // in web, we don't want to show the dropdown unless there's a web extension
        // that contributes a profile
        this._register(this._extensionService.onDidChangeExtensions(() => this.refreshAvailableProfiles()));
        this._webExtensionContributedProfileContextKey =
            TerminalContextKeys.webExtensionContributedProfile.bindTo(this._contextKeyService);
        this._updateWebContextKey();
        this._profilesReadyPromise = this._remoteAgentService.getEnvironment().then(() => {
            // Wait up to 20 seconds for profiles to be ready so it's assured that we know the actual
            // default terminal before launching the first terminal. This isn't expected to ever take
            // this long.
            this._profilesReadyBarrier = new AutoOpenBarrier(20000);
            return this._profilesReadyBarrier.wait().then(() => { });
        });
        this.refreshAvailableProfiles();
        this._setupConfigListener();
    }
    async _setupConfigListener() {
        const platformKey = await this.getPlatformKey();
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("terminal.integrated.automationProfile." /* TerminalSettingPrefix.AutomationProfile */ + platformKey) ||
                e.affectsConfiguration("terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */ + platformKey) ||
                e.affectsConfiguration("terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey) ||
                e.affectsConfiguration("terminal.integrated.useWslProfiles" /* TerminalSettingId.UseWslProfiles */)) {
                if (e.source !== 7 /* ConfigurationTarget.DEFAULT */) {
                    // when _refreshPlatformConfig is called within refreshAvailableProfiles
                    // on did change configuration is fired. this can lead to an infinite recursion
                    this.refreshAvailableProfiles();
                    this._platformConfigJustRefreshed = false;
                }
                else {
                    this._platformConfigJustRefreshed = true;
                }
            }
        }));
    }
    getDefaultProfileName() {
        return this._defaultProfileName;
    }
    getDefaultProfile(os) {
        let defaultProfileName;
        if (os) {
            defaultProfileName = this._configurationService.getValue(`${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${this._getOsKey(os)}`);
            if (!defaultProfileName || typeof defaultProfileName !== 'string') {
                return undefined;
            }
        }
        else {
            defaultProfileName = this._defaultProfileName;
        }
        if (!defaultProfileName) {
            return undefined;
        }
        // IMPORTANT: Only allow the default profile name to find non-auto detected profiles as
        // to avoid unsafe path profiles being picked up.
        return this.availableProfiles.find((e) => e.profileName === defaultProfileName && !e.isAutoDetected);
    }
    _getOsKey(os) {
        switch (os) {
            case 3 /* OperatingSystem.Linux */:
                return 'linux';
            case 2 /* OperatingSystem.Macintosh */:
                return 'osx';
            case 1 /* OperatingSystem.Windows */:
                return 'windows';
        }
    }
    refreshAvailableProfiles() {
        this._refreshAvailableProfilesNow();
    }
    async _refreshAvailableProfilesNow() {
        // Profiles
        const profiles = await this._detectProfiles(true);
        const profilesChanged = !arrays.equals(profiles, this._availableProfiles, profilesEqual);
        // Contributed profiles
        const contributedProfilesChanged = await this._updateContributedProfiles();
        // Automation profiles
        const platform = await this.getPlatformKey();
        const automationProfile = this._configurationService.getValue(`${"terminal.integrated.automationProfile." /* TerminalSettingPrefix.AutomationProfile */}${platform}`);
        const automationProfileChanged = !objects.equals(automationProfile, this._automationProfile);
        // Update
        if (profilesChanged || contributedProfilesChanged || automationProfileChanged) {
            this._availableProfiles = profiles;
            this._automationProfile = automationProfile;
            this._onDidChangeAvailableProfiles.fire(this._availableProfiles);
            this._profilesReadyBarrier.open();
            this._updateWebContextKey();
            await this._refreshPlatformConfig(this._availableProfiles);
        }
    }
    async _updateContributedProfiles() {
        const platformKey = await this.getPlatformKey();
        const excludedContributedProfiles = [];
        const configProfiles = this._configurationService.getValue("terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey);
        for (const [profileName, value] of Object.entries(configProfiles)) {
            if (value === null) {
                excludedContributedProfiles.push(profileName);
            }
        }
        const filteredContributedProfiles = Array.from(this._terminalContributionService.terminalProfiles.filter((p) => !excludedContributedProfiles.includes(p.title)));
        const contributedProfilesChanged = !arrays.equals(filteredContributedProfiles, this._contributedProfiles, contributedProfilesEqual);
        this._contributedProfiles = filteredContributedProfiles;
        return contributedProfilesChanged;
    }
    getContributedProfileProvider(extensionIdentifier, id) {
        const extMap = this._profileProviders.get(extensionIdentifier);
        return extMap?.get(id);
    }
    async _detectProfiles(includeDetectedProfiles) {
        const primaryBackend = await this._terminalInstanceService.getBackend(this._environmentService.remoteAuthority);
        if (!primaryBackend) {
            return this._availableProfiles || [];
        }
        const platform = await this.getPlatformKey();
        this._defaultProfileName =
            this._configurationService.getValue(`${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${platform}`) ??
                undefined;
        return primaryBackend.getProfiles(this._configurationService.getValue(`${"terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */}${platform}`), this._defaultProfileName, includeDetectedProfiles);
    }
    _updateWebContextKey() {
        this._webExtensionContributedProfileContextKey.set(isWeb && this._contributedProfiles.length > 0);
    }
    async _refreshPlatformConfig(profiles) {
        const env = await this._remoteAgentService.getEnvironment();
        registerTerminalDefaultProfileConfiguration({ os: env?.os || OS, profiles }, this._contributedProfiles);
        this._refreshTerminalActionsDisposable.value = refreshTerminalActions(profiles);
    }
    async getPlatformKey() {
        const env = await this._remoteAgentService.getEnvironment();
        if (env) {
            return env.os === 1 /* OperatingSystem.Windows */
                ? 'windows'
                : env.os === 2 /* OperatingSystem.Macintosh */
                    ? 'osx'
                    : 'linux';
        }
        return isWindows ? 'windows' : isMacintosh ? 'osx' : 'linux';
    }
    registerTerminalProfileProvider(extensionIdentifier, id, profileProvider) {
        let extMap = this._profileProviders.get(extensionIdentifier);
        if (!extMap) {
            extMap = new Map();
            this._profileProviders.set(extensionIdentifier, extMap);
        }
        extMap.set(id, profileProvider);
        return toDisposable(() => this._profileProviders.delete(id));
    }
    async registerContributedProfile(args) {
        const platformKey = await this.getPlatformKey();
        const profilesConfig = await this._configurationService.getValue(`${"terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */}${platformKey}`);
        if (typeof profilesConfig === 'object') {
            const newProfile = {
                extensionIdentifier: args.extensionIdentifier,
                icon: args.options.icon,
                id: args.id,
                title: args.title,
                color: args.options.color,
            };
            profilesConfig[args.title] = newProfile;
        }
        await this._configurationService.updateValue(`${"terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */}${platformKey}`, profilesConfig, 2 /* ConfigurationTarget.USER */);
        return;
    }
    async getContributedDefaultProfile(shellLaunchConfig) {
        // prevents recursion with the MainThreadTerminalService call to create terminal
        // and defers to the provided launch config when an executable is provided
        if (shellLaunchConfig &&
            !shellLaunchConfig.extHostTerminalId &&
            !('executable' in shellLaunchConfig)) {
            const key = await this.getPlatformKey();
            const defaultProfileName = this._configurationService.getValue(`${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${key}`);
            const contributedDefaultProfile = this.contributedProfiles.find((p) => p.title === defaultProfileName);
            return contributedDefaultProfile;
        }
        return undefined;
    }
};
__decorate([
    throttle(2000)
], TerminalProfileService.prototype, "refreshAvailableProfiles", null);
TerminalProfileService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService),
    __param(2, ITerminalContributionService),
    __param(3, IExtensionService),
    __param(4, IRemoteAgentService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, ITerminalInstanceService)
], TerminalProfileService);
export { TerminalProfileService };
function profilesEqual(one, other) {
    return (one.profileName === other.profileName &&
        terminalProfileArgsMatch(one.args, other.args) &&
        one.color === other.color &&
        terminalIconsEqual(one.icon, other.icon) &&
        one.isAutoDetected === other.isAutoDetected &&
        one.isDefault === other.isDefault &&
        one.overrideName === other.overrideName &&
        one.path === other.path);
}
function contributedProfilesEqual(one, other) {
    return (one.extensionIdentifier === other.extensionIdentifier &&
        one.color === other.color &&
        one.icon === other.icon &&
        one.id === other.id &&
        one.title === other.title);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxQcm9maWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFFVixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLFdBQVcsRUFDWCxLQUFLLEVBQ0wsU0FBUyxFQUVULEVBQUUsR0FDRixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFVN0QsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDbkksT0FBTyxFQUNOLGtCQUFrQixFQUNsQix3QkFBd0IsR0FDeEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDeEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFNN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlD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