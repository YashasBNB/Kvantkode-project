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
import { Schemas } from '../../../../base/common/network.js';
import { env } from '../../../../base/common/process.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { OS } from '../../../../base/common/platform.js';
import { ITerminalLogService, } from '../../../../platform/terminal/common/terminal.js';
import { ITerminalProfileService, } from '../common/terminal.js';
import * as path from '../../../../base/common/path.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { debounce } from '../../../../base/common/decorators.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isUriComponents } from '../../../../platform/terminal/common/terminalProfiles.js';
import { ITerminalInstanceService } from './terminal.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
const generatedProfileName = 'Generated';
/*
 * Resolves terminal shell launch config and terminal profiles for the given operating system,
 * environment, and user configuration.
 */
export class BaseTerminalProfileResolverService extends Disposable {
    get defaultProfileName() {
        return this._defaultProfileName;
    }
    constructor(_context, _configurationService, _configurationResolverService, _historyService, _logService, _terminalProfileService, _workspaceContextService, _remoteAgentService) {
        super();
        this._context = _context;
        this._configurationService = _configurationService;
        this._configurationResolverService = _configurationResolverService;
        this._historyService = _historyService;
        this._logService = _logService;
        this._terminalProfileService = _terminalProfileService;
        this._workspaceContextService = _workspaceContextService;
        this._remoteAgentService = _remoteAgentService;
        this._iconRegistry = getIconRegistry();
        if (this._remoteAgentService.getConnection()) {
            this._remoteAgentService
                .getEnvironment()
                .then((env) => (this._primaryBackendOs = env?.os || OS));
        }
        else {
            this._primaryBackendOs = OS;
        }
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.defaultProfile.windows" /* TerminalSettingId.DefaultProfileWindows */) ||
                e.affectsConfiguration("terminal.integrated.defaultProfile.osx" /* TerminalSettingId.DefaultProfileMacOs */) ||
                e.affectsConfiguration("terminal.integrated.defaultProfile.linux" /* TerminalSettingId.DefaultProfileLinux */)) {
                this._refreshDefaultProfileName();
            }
        }));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles(() => this._refreshDefaultProfileName()));
    }
    async _refreshDefaultProfileName() {
        if (this._primaryBackendOs) {
            this._defaultProfileName = (await this.getDefaultProfile({
                remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority,
                os: this._primaryBackendOs,
            }))?.profileName;
        }
    }
    resolveIcon(shellLaunchConfig, os) {
        if (shellLaunchConfig.icon) {
            shellLaunchConfig.icon = this._getCustomIcon(shellLaunchConfig.icon) || this.getDefaultIcon();
            return;
        }
        if (shellLaunchConfig.customPtyImplementation) {
            shellLaunchConfig.icon = this.getDefaultIcon();
            return;
        }
        if (shellLaunchConfig.executable) {
            return;
        }
        const defaultProfile = this._getUnresolvedRealDefaultProfile(os);
        if (defaultProfile) {
            shellLaunchConfig.icon = defaultProfile.icon;
        }
        if (!shellLaunchConfig.icon) {
            shellLaunchConfig.icon = this.getDefaultIcon();
        }
    }
    getDefaultIcon(resource) {
        return (this._iconRegistry.getIcon(this._configurationService.getValue("terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */, { resource })) || Codicon.terminal);
    }
    async resolveShellLaunchConfig(shellLaunchConfig, options) {
        // Resolve the shell and shell args
        let resolvedProfile;
        if (shellLaunchConfig.executable) {
            resolvedProfile = await this._resolveProfile({
                path: shellLaunchConfig.executable,
                args: shellLaunchConfig.args,
                profileName: generatedProfileName,
                isDefault: false,
            }, options);
        }
        else {
            resolvedProfile = await this.getDefaultProfile(options);
        }
        shellLaunchConfig.executable = resolvedProfile.path;
        shellLaunchConfig.args = resolvedProfile.args;
        if (resolvedProfile.env) {
            if (shellLaunchConfig.env) {
                shellLaunchConfig.env = { ...shellLaunchConfig.env, ...resolvedProfile.env };
            }
            else {
                shellLaunchConfig.env = resolvedProfile.env;
            }
        }
        // Verify the icon is valid, and fallback correctly to the generic terminal id if there is
        // an issue
        const resource = shellLaunchConfig === undefined || typeof shellLaunchConfig.cwd === 'string'
            ? undefined
            : shellLaunchConfig.cwd;
        shellLaunchConfig.icon =
            this._getCustomIcon(shellLaunchConfig.icon) ||
                this._getCustomIcon(resolvedProfile.icon) ||
                this.getDefaultIcon(resource);
        // Override the name if specified
        if (resolvedProfile.overrideName) {
            shellLaunchConfig.name = resolvedProfile.profileName;
        }
        // Apply the color
        shellLaunchConfig.color =
            shellLaunchConfig.color ||
                resolvedProfile.color ||
                this._configurationService.getValue("terminal.integrated.tabs.defaultColor" /* TerminalSettingId.TabsDefaultColor */, { resource });
        // Resolve useShellEnvironment based on the setting if it's not set
        if (shellLaunchConfig.useShellEnvironment === undefined) {
            shellLaunchConfig.useShellEnvironment = this._configurationService.getValue("terminal.integrated.inheritEnv" /* TerminalSettingId.InheritEnv */);
        }
    }
    async getDefaultShell(options) {
        return (await this.getDefaultProfile(options)).path;
    }
    async getDefaultShellArgs(options) {
        return (await this.getDefaultProfile(options)).args || [];
    }
    async getDefaultProfile(options) {
        return this._resolveProfile(await this._getUnresolvedDefaultProfile(options), options);
    }
    getEnvironment(remoteAuthority) {
        return this._context.getEnvironment(remoteAuthority);
    }
    _getCustomIcon(icon) {
        if (!icon) {
            return undefined;
        }
        if (typeof icon === 'string') {
            return ThemeIcon.fromId(icon);
        }
        if (ThemeIcon.isThemeIcon(icon)) {
            return icon;
        }
        if (URI.isUri(icon) || isUriComponents(icon)) {
            return URI.revive(icon);
        }
        if (typeof icon === 'object' && 'light' in icon && 'dark' in icon) {
            const castedIcon = icon;
            if ((URI.isUri(castedIcon.light) || isUriComponents(castedIcon.light)) &&
                (URI.isUri(castedIcon.dark) || isUriComponents(castedIcon.dark))) {
                return { light: URI.revive(castedIcon.light), dark: URI.revive(castedIcon.dark) };
            }
        }
        return undefined;
    }
    async _getUnresolvedDefaultProfile(options) {
        // If automation shell is allowed, prefer that
        if (options.allowAutomationShell) {
            const automationShellProfile = this._getUnresolvedAutomationShellProfile(options);
            if (automationShellProfile) {
                return automationShellProfile;
            }
        }
        // Return the real default profile if it exists and is valid, wait for profiles to be ready
        // if the window just opened
        await this._terminalProfileService.profilesReady;
        const defaultProfile = this._getUnresolvedRealDefaultProfile(options.os);
        if (defaultProfile) {
            return this._setIconForAutomation(options, defaultProfile);
        }
        // If there is no real default profile, create a fallback default profile based on the shell
        // and shellArgs settings in addition to the current environment.
        return this._setIconForAutomation(options, await this._getUnresolvedFallbackDefaultProfile(options));
    }
    _setIconForAutomation(options, profile) {
        if (options.allowAutomationShell) {
            const profileClone = deepClone(profile);
            profileClone.icon = Codicon.tools;
            return profileClone;
        }
        return profile;
    }
    _getUnresolvedRealDefaultProfile(os) {
        return this._terminalProfileService.getDefaultProfile(os);
    }
    async _getUnresolvedFallbackDefaultProfile(options) {
        const executable = await this._context.getDefaultSystemShell(options.remoteAuthority, options.os);
        // Try select an existing profile to fallback to, based on the default system shell, only do
        // this when it is NOT a local terminal in a remote window where the front and back end OS
        // differs (eg. Windows -> WSL, Mac -> Linux)
        if (options.os === OS) {
            let existingProfile = this._terminalProfileService.availableProfiles.find((e) => path.parse(e.path).name === path.parse(executable).name);
            if (existingProfile) {
                if (options.allowAutomationShell) {
                    existingProfile = deepClone(existingProfile);
                    existingProfile.icon = Codicon.tools;
                }
                return existingProfile;
            }
        }
        // Finally fallback to a generated profile
        let args;
        if (options.os === 2 /* OperatingSystem.Macintosh */ &&
            path.parse(executable).name.match(/(zsh|bash)/)) {
            // macOS should launch a login shell by default
            args = ['--login'];
        }
        else {
            // Resolve undefined to []
            args = [];
        }
        const icon = this._guessProfileIcon(executable);
        return {
            profileName: generatedProfileName,
            path: executable,
            args,
            icon,
            isDefault: false,
        };
    }
    _getUnresolvedAutomationShellProfile(options) {
        const automationProfile = this._configurationService.getValue(`terminal.integrated.automationProfile.${this._getOsKey(options.os)}`);
        if (this._isValidAutomationProfile(automationProfile, options.os)) {
            automationProfile.icon = this._getCustomIcon(automationProfile.icon) || Codicon.tools;
            return automationProfile;
        }
        return undefined;
    }
    async _resolveProfile(profile, options) {
        const env = await this._context.getEnvironment(options.remoteAuthority);
        if (options.os === 1 /* OperatingSystem.Windows */) {
            // Change Sysnative to System32 if the OS is Windows but NOT WoW64. It's
            // safe to assume that this was used by accident as Sysnative does not
            // exist and will break the terminal in non-WoW64 environments.
            const isWoW64 = !!env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
            const windir = env.windir;
            if (!isWoW64 && windir) {
                const sysnativePath = path.join(windir, 'Sysnative').replace(/\//g, '\\').toLowerCase();
                if (profile.path && profile.path.toLowerCase().indexOf(sysnativePath) === 0) {
                    profile.path = path.join(windir, 'System32', profile.path.substr(sysnativePath.length + 1));
                }
            }
            // Convert / to \ on Windows for convenience
            if (profile.path) {
                profile.path = profile.path.replace(/\//g, '\\');
            }
        }
        // Resolve path variables
        const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot(options.remoteAuthority ? Schemas.vscodeRemote : Schemas.file);
        const lastActiveWorkspace = activeWorkspaceRootUri
            ? (this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined)
            : undefined;
        profile.path = await this._resolveVariables(profile.path, env, lastActiveWorkspace);
        // Resolve args variables
        if (profile.args) {
            if (typeof profile.args === 'string') {
                profile.args = await this._resolveVariables(profile.args, env, lastActiveWorkspace);
            }
            else {
                profile.args = await Promise.all(profile.args.map((arg) => this._resolveVariables(arg, env, lastActiveWorkspace)));
            }
        }
        return profile;
    }
    async _resolveVariables(value, env, lastActiveWorkspace) {
        try {
            value = await this._configurationResolverService.resolveWithEnvironment(env, lastActiveWorkspace, value);
        }
        catch (e) {
            this._logService.error(`Could not resolve shell`, e);
        }
        return value;
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
    _guessProfileIcon(shell) {
        const file = path.parse(shell).name;
        switch (file) {
            case 'bash':
                return Codicon.terminalBash;
            case 'pwsh':
            case 'powershell':
                return Codicon.terminalPowershell;
            case 'tmux':
                return Codicon.terminalTmux;
            case 'cmd':
                return Codicon.terminalCmd;
            default:
                return undefined;
        }
    }
    _isValidAutomationProfile(profile, os) {
        if (profile === null || profile === undefined || typeof profile !== 'object') {
            return false;
        }
        if ('path' in profile && typeof profile.path === 'string') {
            return true;
        }
        return false;
    }
}
__decorate([
    debounce(200)
], BaseTerminalProfileResolverService.prototype, "_refreshDefaultProfileName", null);
let BrowserTerminalProfileResolverService = class BrowserTerminalProfileResolverService extends BaseTerminalProfileResolverService {
    constructor(configurationResolverService, configurationService, historyService, logService, terminalInstanceService, terminalProfileService, workspaceContextService, remoteAgentService) {
        super({
            getDefaultSystemShell: async (remoteAuthority, os) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!remoteAuthority || !backend) {
                    // Just return basic values, this is only for serverless web and wouldn't be used
                    return os === 1 /* OperatingSystem.Windows */ ? 'pwsh' : 'bash';
                }
                return backend.getDefaultSystemShell(os);
            },
            getEnvironment: async (remoteAuthority) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!remoteAuthority || !backend) {
                    return env;
                }
                return backend.getEnvironment();
            },
        }, configurationService, configurationResolverService, historyService, logService, terminalProfileService, workspaceContextService, remoteAgentService);
    }
};
BrowserTerminalProfileResolverService = __decorate([
    __param(0, IConfigurationResolverService),
    __param(1, IConfigurationService),
    __param(2, IHistoryService),
    __param(3, ITerminalLogService),
    __param(4, ITerminalInstanceService),
    __param(5, ITerminalProfileService),
    __param(6, IWorkspaceContextService),
    __param(7, IRemoteAgentService)
], BrowserTerminalProfileResolverService);
export { BrowserTerminalProfileResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsUHJvZmlsZVJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUF3QyxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RixPQUFPLEVBRU4sbUJBQW1CLEdBSW5CLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUdOLHVCQUF1QixHQUN2QixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQWlCLE1BQU0sbURBQW1ELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBT2pFLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFBO0FBRXhDOzs7R0FHRztBQUNILE1BQU0sT0FBZ0Isa0NBQ3JCLFNBQVEsVUFBVTtJQVVsQixJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsWUFDa0IsUUFBaUMsRUFDakMscUJBQTRDLEVBQzVDLDZCQUE0RCxFQUM1RCxlQUFnQyxFQUNoQyxXQUFnQyxFQUNoQyx1QkFBZ0QsRUFDaEQsd0JBQWtELEVBQ2xELG1CQUF3QztRQUV6RCxLQUFLLEVBQUUsQ0FBQTtRQVRVLGFBQVEsR0FBUixRQUFRLENBQXlCO1FBQ2pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUErQjtRQUM1RCxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDaEMsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBQ2hDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBeUI7UUFDaEQsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQUNsRCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBZnpDLGtCQUFhLEdBQWtCLGVBQWUsRUFBRSxDQUFBO1FBbUJoRSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxtQkFBbUI7aUJBQ3RCLGNBQWMsRUFBRTtpQkFDaEIsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFBO1FBQzVCLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pELElBQ0MsQ0FBQyxDQUFDLG9CQUFvQiw0RkFBeUM7Z0JBQy9ELENBQUMsQ0FBQyxvQkFBb0Isc0ZBQXVDO2dCQUM3RCxDQUFDLENBQUMsb0JBQW9CLHdGQUF1QyxFQUM1RCxDQUFDO2dCQUNGLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsdUJBQXVCLENBQUMsNEJBQTRCLENBQUMsR0FBRyxFQUFFLENBQzlELElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUNqQyxDQUNELENBQUE7SUFDRixDQUFDO0lBR2EsQUFBTixLQUFLLENBQUMsMEJBQTBCO1FBQ3ZDLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQzFCLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDO2dCQUM1QixlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxFQUFFLGVBQWU7Z0JBQzFFLEVBQUUsRUFBRSxJQUFJLENBQUMsaUJBQWlCO2FBQzFCLENBQUMsQ0FDRixFQUFFLFdBQVcsQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLGlCQUFxQyxFQUFFLEVBQW1CO1FBQ3JFLElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUIsaUJBQWlCLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQzdGLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQy9DLGlCQUFpQixDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDOUMsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsaUJBQWlCLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUE7UUFDN0MsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixpQkFBaUIsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQWM7UUFDNUIsT0FBTyxDQUNOLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUN6QixJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxpRkFBb0MsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUNwRixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQ3JCLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLHdCQUF3QixDQUM3QixpQkFBcUMsRUFDckMsT0FBeUM7UUFFekMsbUNBQW1DO1FBQ25DLElBQUksZUFBaUMsQ0FBQTtRQUNyQyxJQUFJLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQzNDO2dCQUNDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO2dCQUNsQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtnQkFDNUIsV0FBVyxFQUFFLG9CQUFvQjtnQkFDakMsU0FBUyxFQUFFLEtBQUs7YUFDaEIsRUFDRCxPQUFPLENBQ1AsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFDRCxpQkFBaUIsQ0FBQyxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQTtRQUNuRCxpQkFBaUIsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQTtRQUM3QyxJQUFJLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN6QixJQUFJLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUMzQixpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUM3RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaUJBQWlCLENBQUMsR0FBRyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFFRCwwRkFBMEY7UUFDMUYsV0FBVztRQUNYLE1BQU0sUUFBUSxHQUNiLGlCQUFpQixLQUFLLFNBQVMsSUFBSSxPQUFPLGlCQUFpQixDQUFDLEdBQUcsS0FBSyxRQUFRO1lBQzNFLENBQUMsQ0FBQyxTQUFTO1lBQ1gsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQTtRQUN6QixpQkFBaUIsQ0FBQyxJQUFJO1lBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFOUIsaUNBQWlDO1FBQ2pDLElBQUksZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2xDLGlCQUFpQixDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFBO1FBQ3JELENBQUM7UUFFRCxrQkFBa0I7UUFDbEIsaUJBQWlCLENBQUMsS0FBSztZQUN0QixpQkFBaUIsQ0FBQyxLQUFLO2dCQUN2QixlQUFlLENBQUMsS0FBSztnQkFDckIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsbUZBQXFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUV0RixtRUFBbUU7UUFDbkUsSUFBSSxpQkFBaUIsQ0FBQyxtQkFBbUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6RCxpQkFBaUIsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxxRUFFMUUsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUF5QztRQUM5RCxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDcEQsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxPQUF5QztRQUNsRSxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFBO0lBQzFELENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBeUM7UUFDaEUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFRCxjQUFjLENBQUMsZUFBbUM7UUFDakQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRU8sY0FBYyxDQUFDLElBQWM7UUFDcEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hCLENBQUM7UUFDRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksSUFBSSxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNuRSxNQUFNLFVBQVUsR0FBRyxJQUF5QyxDQUFBO1lBQzVELElBQ0MsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDL0QsQ0FBQztnQkFDRixPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFBO1lBQ2xGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLEtBQUssQ0FBQyw0QkFBNEIsQ0FDekMsT0FBeUM7UUFFekMsOENBQThDO1FBQzlDLElBQUksT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsb0NBQW9DLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDakYsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO2dCQUM1QixPQUFPLHNCQUFzQixDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBRUQsMkZBQTJGO1FBQzNGLDRCQUE0QjtRQUM1QixNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUE7UUFDaEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN4RSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBRUQsNEZBQTRGO1FBQzVGLGlFQUFpRTtRQUNqRSxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FDaEMsT0FBTyxFQUNQLE1BQU0sSUFBSSxDQUFDLG9DQUFvQyxDQUFDLE9BQU8sQ0FBQyxDQUN4RCxDQUFBO0lBQ0YsQ0FBQztJQUVPLHFCQUFxQixDQUM1QixPQUF5QyxFQUN6QyxPQUF5QjtRQUV6QixJQUFJLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN2QyxZQUFZLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7WUFDakMsT0FBTyxZQUFZLENBQUE7UUFDcEIsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLGdDQUFnQyxDQUFDLEVBQW1CO1FBQzNELE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFTyxLQUFLLENBQUMsb0NBQW9DLENBQ2pELE9BQXlDO1FBRXpDLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FDM0QsT0FBTyxDQUFDLGVBQWUsRUFDdkIsT0FBTyxDQUFDLEVBQUUsQ0FDVixDQUFBO1FBRUQsNEZBQTRGO1FBQzVGLDBGQUEwRjtRQUMxRiw2Q0FBNkM7UUFDN0MsSUFBSSxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3ZCLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQ3hFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQzlELENBQUE7WUFDRCxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixJQUFJLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29CQUNsQyxlQUFlLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO29CQUM1QyxlQUFlLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7Z0JBQ3JDLENBQUM7Z0JBQ0QsT0FBTyxlQUFlLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUM7UUFFRCwwQ0FBMEM7UUFDMUMsSUFBSSxJQUFtQyxDQUFBO1FBQ3ZDLElBQ0MsT0FBTyxDQUFDLEVBQUUsc0NBQThCO1lBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDOUMsQ0FBQztZQUNGLCtDQUErQztZQUMvQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuQixDQUFDO2FBQU0sQ0FBQztZQUNQLDBCQUEwQjtZQUMxQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUUvQyxPQUFPO1lBQ04sV0FBVyxFQUFFLG9CQUFvQjtZQUNqQyxJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJO1lBQ0osSUFBSTtZQUNKLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUE7SUFDRixDQUFDO0lBRU8sb0NBQW9DLENBQzNDLE9BQXlDO1FBRXpDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FDNUQseUNBQXlDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQ3JFLENBQUE7UUFDRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNuRSxpQkFBaUIsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFBO1lBQ3JGLE9BQU8saUJBQWlCLENBQUE7UUFDekIsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxLQUFLLENBQUMsZUFBZSxDQUM1QixPQUF5QixFQUN6QixPQUF5QztRQUV6QyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUV2RSxJQUFJLE9BQU8sQ0FBQyxFQUFFLG9DQUE0QixFQUFFLENBQUM7WUFDNUMsd0VBQXdFO1lBQ3hFLHNFQUFzRTtZQUN0RSwrREFBK0Q7WUFDL0QsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtZQUM5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1lBQ3pCLElBQUksQ0FBQyxPQUFPLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ3ZGLElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDN0UsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUN2QixNQUFNLEVBQ04sVUFBVSxFQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQzdDLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCw0Q0FBNEM7WUFDNUMsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2pELENBQUM7UUFDRixDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsQ0FDN0UsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDN0QsQ0FBQTtRQUNELE1BQU0sbUJBQW1CLEdBQUcsc0JBQXNCO1lBQ2pELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLFNBQVMsQ0FBQztZQUN6RixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osT0FBTyxDQUFDLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRW5GLHlCQUF5QjtRQUN6QixJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQixJQUFJLE9BQU8sT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxDQUFDLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQ3BGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDL0IsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FDaEYsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUM5QixLQUFhLEVBQ2IsR0FBd0IsRUFDeEIsbUJBQWlEO1FBRWpELElBQUksQ0FBQztZQUNKLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxzQkFBc0IsQ0FDdEUsR0FBRyxFQUNILG1CQUFtQixFQUNuQixLQUFLLENBQ0wsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLFNBQVMsQ0FBQyxFQUFtQjtRQUNwQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ1o7Z0JBQ0MsT0FBTyxPQUFPLENBQUE7WUFDZjtnQkFDQyxPQUFPLEtBQUssQ0FBQTtZQUNiO2dCQUNDLE9BQU8sU0FBUyxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQUMsS0FBYTtRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUNuQyxRQUFRLElBQUksRUFBRSxDQUFDO1lBQ2QsS0FBSyxNQUFNO2dCQUNWLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQTtZQUM1QixLQUFLLE1BQU0sQ0FBQztZQUNaLEtBQUssWUFBWTtnQkFDaEIsT0FBTyxPQUFPLENBQUMsa0JBQWtCLENBQUE7WUFDbEMsS0FBSyxNQUFNO2dCQUNWLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQTtZQUM1QixLQUFLLEtBQUs7Z0JBQ1QsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFBO1lBQzNCO2dCQUNDLE9BQU8sU0FBUyxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRU8seUJBQXlCLENBQ2hDLE9BQWdCLEVBQ2hCLEVBQW1CO1FBRW5CLElBQUksT0FBTyxLQUFLLElBQUksSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlFLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksTUFBTSxJQUFJLE9BQU8sSUFBSSxPQUFRLE9BQTZCLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztDQUNEO0FBbFdjO0lBRGIsUUFBUSxDQUFDLEdBQUcsQ0FBQztvRkFVYjtBQTJWSyxJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFzQyxTQUFRLGtDQUFrQztJQUM1RixZQUNnQyw0QkFBMkQsRUFDbkUsb0JBQTJDLEVBQ2pELGNBQStCLEVBQzNCLFVBQStCLEVBQzFCLHVCQUFpRCxFQUNsRCxzQkFBK0MsRUFDOUMsdUJBQWlELEVBQ3RELGtCQUF1QztRQUU1RCxLQUFLLENBQ0o7WUFDQyxxQkFBcUIsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUNwRCxNQUFNLE9BQU8sR0FBRyxNQUFNLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDekUsSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNsQyxpRkFBaUY7b0JBQ2pGLE9BQU8sRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7Z0JBQ3hELENBQUM7Z0JBQ0QsT0FBTyxPQUFPLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDekMsQ0FBQztZQUNELGNBQWMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0sT0FBTyxHQUFHLE1BQU0sdUJBQXVCLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUN6RSxJQUFJLENBQUMsZUFBZSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2xDLE9BQU8sR0FBRyxDQUFBO2dCQUNYLENBQUM7Z0JBQ0QsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDaEMsQ0FBQztTQUNELEVBQ0Qsb0JBQW9CLEVBQ3BCLDRCQUE0QixFQUM1QixjQUFjLEVBQ2QsVUFBVSxFQUNWLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLENBQ2xCLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXRDWSxxQ0FBcUM7SUFFL0MsV0FBQSw2QkFBNkIsQ0FBQTtJQUM3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG1CQUFtQixDQUFBO0dBVFQscUNBQXFDLENBc0NqRCJ9