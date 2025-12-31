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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFByb2ZpbGVSZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDdkgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBd0MsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUYsT0FBTyxFQUVOLG1CQUFtQixHQUluQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLG1EQUFtRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXND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