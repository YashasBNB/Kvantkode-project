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
import { Codicon } from '../../../../base/common/codicons.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { getUriClasses, getColorClass, createColorStyleElement } from './terminalIcon.js';
import { configureTerminalProfileIcon } from './terminalIcons.js';
import * as nls from '../../../../nls.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITerminalProfileResolverService, ITerminalProfileService } from '../common/terminal.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { basename } from '../../../../base/common/path.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
let TerminalProfileQuickpick = class TerminalProfileQuickpick {
    constructor(_terminalProfileService, _terminalProfileResolverService, _configurationService, _quickInputService, _themeService, _notificationService) {
        this._terminalProfileService = _terminalProfileService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._themeService = _themeService;
        this._notificationService = _notificationService;
    }
    async showAndGetResult(type) {
        const platformKey = await this._terminalProfileService.getPlatformKey();
        const profilesKey = "terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey;
        const result = await this._createAndShow(type);
        const defaultProfileKey = `${"terminal.integrated.defaultProfile." /* TerminalSettingPrefix.DefaultProfile */}${platformKey}`;
        if (!result) {
            return;
        }
        if (type === 'setDefault') {
            if ('command' in result.profile) {
                return; // Should never happen
            }
            else if ('id' in result.profile) {
                // extension contributed profile
                await this._configurationService.updateValue(defaultProfileKey, result.profile.title, 2 /* ConfigurationTarget.USER */);
                return {
                    config: {
                        extensionIdentifier: result.profile.extensionIdentifier,
                        id: result.profile.id,
                        title: result.profile.title,
                        options: {
                            color: result.profile.color,
                            icon: result.profile.icon,
                        },
                    },
                    keyMods: result.keyMods,
                };
            }
            // Add the profile to settings if necessary
            if ('isAutoDetected' in result.profile) {
                const profilesConfig = await this._configurationService.getValue(profilesKey);
                if (typeof profilesConfig === 'object') {
                    const newProfile = {
                        path: result.profile.path,
                    };
                    if (result.profile.args) {
                        newProfile.args = result.profile.args;
                    }
                    ;
                    profilesConfig[result.profile.profileName] = this._createNewProfileConfig(result.profile);
                    await this._configurationService.updateValue(profilesKey, profilesConfig, 2 /* ConfigurationTarget.USER */);
                }
            }
            // Set the default profile
            await this._configurationService.updateValue(defaultProfileKey, result.profileName, 2 /* ConfigurationTarget.USER */);
        }
        else if (type === 'createInstance') {
            if ('id' in result.profile) {
                return {
                    config: {
                        extensionIdentifier: result.profile.extensionIdentifier,
                        id: result.profile.id,
                        title: result.profile.title,
                        options: {
                            icon: result.profile.icon,
                            color: result.profile.color,
                        },
                    },
                    keyMods: result.keyMods,
                };
            }
            else {
                return { config: result.profile, keyMods: result.keyMods };
            }
        }
        // for tests
        return 'profileName' in result.profile ? result.profile.profileName : result.profile.title;
    }
    async _createAndShow(type) {
        const platformKey = await this._terminalProfileService.getPlatformKey();
        const profiles = this._terminalProfileService.availableProfiles;
        const profilesKey = "terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey;
        const defaultProfileName = this._terminalProfileService.getDefaultProfileName();
        let keyMods;
        const options = {
            placeHolder: type === 'createInstance'
                ? nls.localize('terminal.integrated.selectProfileToCreate', 'Select the terminal profile to create')
                : nls.localize('terminal.integrated.chooseDefaultProfile', 'Select your default terminal profile'),
            onDidTriggerItemButton: async (context) => {
                // Get the user's explicit permission to use a potentially unsafe path
                if (!(await this._isProfileSafe(context.item.profile))) {
                    return;
                }
                if ('command' in context.item.profile) {
                    return;
                }
                if ('id' in context.item.profile) {
                    return;
                }
                const configProfiles = this._configurationService.getValue("terminal.integrated.profiles." /* TerminalSettingPrefix.Profiles */ + platformKey);
                const existingProfiles = !!configProfiles ? Object.keys(configProfiles) : [];
                const name = await this._quickInputService.input({
                    prompt: nls.localize('enterTerminalProfileName', 'Enter terminal profile name'),
                    value: context.item.profile.profileName,
                    validateInput: async (input) => {
                        if (existingProfiles.includes(input)) {
                            return nls.localize('terminalProfileAlreadyExists', 'A terminal profile already exists with that name');
                        }
                        return undefined;
                    },
                });
                if (!name) {
                    return;
                }
                const newConfigValue = {
                    ...configProfiles,
                    [name]: this._createNewProfileConfig(context.item.profile),
                };
                await this._configurationService.updateValue(profilesKey, newConfigValue, 2 /* ConfigurationTarget.USER */);
            },
            onKeyMods: (mods) => (keyMods = mods),
        };
        // Build quick pick items
        const quickPickItems = [];
        const configProfiles = profiles.filter((e) => !e.isAutoDetected);
        const autoDetectedProfiles = profiles.filter((e) => e.isAutoDetected);
        if (configProfiles.length > 0) {
            quickPickItems.push({
                type: 'separator',
                label: nls.localize('terminalProfiles', 'profiles'),
            });
            quickPickItems.push(...this._sortProfileQuickPickItems(configProfiles.map((e) => this._createProfileQuickPickItem(e)), defaultProfileName));
        }
        quickPickItems.push({
            type: 'separator',
            label: nls.localize('ICreateContributedTerminalProfileOptions', 'contributed'),
        });
        const contributedProfiles = [];
        for (const contributed of this._terminalProfileService.contributedProfiles) {
            let icon;
            if (typeof contributed.icon === 'string') {
                if (contributed.icon.startsWith('$(')) {
                    icon = ThemeIcon.fromString(contributed.icon);
                }
                else {
                    icon = ThemeIcon.fromId(contributed.icon);
                }
            }
            if (!icon || !getIconRegistry().getIcon(icon.id)) {
                icon = this._terminalProfileResolverService.getDefaultIcon();
            }
            const uriClasses = getUriClasses(contributed, this._themeService.getColorTheme().type, true);
            const colorClass = getColorClass(contributed);
            const iconClasses = [];
            if (uriClasses) {
                iconClasses.push(...uriClasses);
            }
            if (colorClass) {
                iconClasses.push(colorClass);
            }
            contributedProfiles.push({
                label: `$(${icon.id}) ${contributed.title}`,
                profile: {
                    extensionIdentifier: contributed.extensionIdentifier,
                    title: contributed.title,
                    icon: contributed.icon,
                    id: contributed.id,
                    color: contributed.color,
                },
                profileName: contributed.title,
                iconClasses,
            });
        }
        if (contributedProfiles.length > 0) {
            quickPickItems.push(...this._sortProfileQuickPickItems(contributedProfiles, defaultProfileName));
        }
        if (autoDetectedProfiles.length > 0) {
            quickPickItems.push({
                type: 'separator',
                label: nls.localize('terminalProfiles.detected', 'detected'),
            });
            quickPickItems.push(...this._sortProfileQuickPickItems(autoDetectedProfiles.map((e) => this._createProfileQuickPickItem(e)), defaultProfileName));
        }
        const colorStyleDisposable = createColorStyleElement(this._themeService.getColorTheme());
        const result = await this._quickInputService.pick(quickPickItems, options);
        colorStyleDisposable.dispose();
        if (!result) {
            return undefined;
        }
        if (!(await this._isProfileSafe(result.profile))) {
            return undefined;
        }
        if (keyMods) {
            result.keyMods = keyMods;
        }
        return result;
    }
    _createNewProfileConfig(profile) {
        const result = { path: profile.path };
        if (profile.args) {
            result.args = profile.args;
        }
        if (profile.env) {
            result.env = profile.env;
        }
        return result;
    }
    async _isProfileSafe(profile) {
        const isUnsafePath = 'isUnsafePath' in profile && profile.isUnsafePath;
        const requiresUnsafePath = 'requiresUnsafePath' in profile && profile.requiresUnsafePath;
        if (!isUnsafePath && !requiresUnsafePath) {
            return true;
        }
        // Get the user's explicit permission to use a potentially unsafe path
        return await new Promise((r) => {
            const unsafePaths = [];
            if (isUnsafePath) {
                unsafePaths.push(profile.path);
            }
            if (requiresUnsafePath) {
                unsafePaths.push(requiresUnsafePath);
            }
            // Notify about unsafe path(s). At the time of writing, multiple unsafe paths isn't
            // possible so the message is optimized for a single path.
            const handle = this._notificationService.prompt(Severity.Warning, nls.localize('unsafePathWarning', 'This terminal profile uses a potentially unsafe path that can be modified by another user: {0}. Are you sure you want to use it?', `"${unsafePaths.join(',')}"`), [
                {
                    label: nls.localize('yes', 'Yes'),
                    run: () => r(true),
                },
                {
                    label: nls.localize('cancel', 'Cancel'),
                    run: () => r(false),
                },
            ]);
            handle.onDidClose(() => r(false));
        });
    }
    _createProfileQuickPickItem(profile) {
        const buttons = [
            {
                iconClass: ThemeIcon.asClassName(configureTerminalProfileIcon),
                tooltip: nls.localize('createQuickLaunchProfile', 'Configure Terminal Profile'),
            },
        ];
        const icon = profile.icon && ThemeIcon.isThemeIcon(profile.icon) ? profile.icon : Codicon.terminal;
        const label = `$(${icon.id}) ${profile.profileName}`;
        const friendlyPath = profile.isFromPath ? basename(profile.path) : profile.path;
        const colorClass = getColorClass(profile);
        const iconClasses = [];
        if (colorClass) {
            iconClasses.push(colorClass);
        }
        if (profile.args) {
            if (typeof profile.args === 'string') {
                return {
                    label,
                    description: `${profile.path} ${profile.args}`,
                    profile,
                    profileName: profile.profileName,
                    buttons,
                    iconClasses,
                };
            }
            const argsString = profile.args
                .map((e) => {
                if (e.includes(' ')) {
                    return `"${e.replace(/"/g, '\\"')}"`; // CodeQL [SM02383] js/incomplete-sanitization This is only used as a label on the UI so this isn't a problem
                }
                return e;
            })
                .join(' ');
            return {
                label,
                description: `${friendlyPath} ${argsString}`,
                profile,
                profileName: profile.profileName,
                buttons,
                iconClasses,
            };
        }
        return {
            label,
            description: friendlyPath,
            profile,
            profileName: profile.profileName,
            buttons,
            iconClasses,
        };
    }
    _sortProfileQuickPickItems(items, defaultProfileName) {
        return items.sort((a, b) => {
            if (b.profileName === defaultProfileName) {
                return 1;
            }
            if (a.profileName === defaultProfileName) {
                return -1;
            }
            return a.profileName.localeCompare(b.profileName);
        });
    }
};
TerminalProfileQuickpick = __decorate([
    __param(0, ITerminalProfileService),
    __param(1, ITerminalProfileResolverService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, IThemeService),
    __param(5, INotificationService)
], TerminalProfileQuickpick);
export { TerminalProfileQuickpick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUXVpY2twaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFByb2ZpbGVRdWlja3BpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sa0JBQWtCLEdBTWxCLE1BQU0sc0RBQXNELENBQUE7QUFRN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN6RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNqRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLCtCQUErQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBRzFELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCO0lBQ3BDLFlBQzJDLHVCQUFnRCxFQUV6RSwrQkFBZ0UsRUFDekMscUJBQTRDLEVBQy9DLGtCQUFzQyxFQUMzQyxhQUE0QixFQUNyQixvQkFBMEM7UUFOdkMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUF5QjtRQUV6RSxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWlDO1FBQ3pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDL0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUMzQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUNyQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO0lBQy9FLENBQUM7SUFFSixLQUFLLENBQUMsZ0JBQWdCLENBQ3JCLElBQXFDO1FBRXJDLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3ZFLE1BQU0sV0FBVyxHQUFHLHVFQUFpQyxXQUFXLENBQUE7UUFDaEUsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxnRkFBb0MsR0FBRyxXQUFXLEVBQUUsQ0FBQTtRQUNqRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBSSxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQzNCLElBQUksU0FBUyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDakMsT0FBTSxDQUFDLHNCQUFzQjtZQUM5QixDQUFDO2lCQUFNLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkMsZ0NBQWdDO2dCQUNoQyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQzNDLGlCQUFpQixFQUNqQixNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssbUNBRXBCLENBQUE7Z0JBQ0QsT0FBTztvQkFDTixNQUFNLEVBQUU7d0JBQ1AsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUI7d0JBQ3ZELEVBQUUsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3JCLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUs7d0JBQzNCLE9BQU8sRUFBRTs0QkFDUixLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLOzRCQUMzQixJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJO3lCQUN6QjtxQkFDRDtvQkFDRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87aUJBQ3ZCLENBQUE7WUFDRixDQUFDO1lBRUQsMkNBQTJDO1lBQzNDLElBQUksZ0JBQWdCLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN4QyxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQzdFLElBQUksT0FBTyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3hDLE1BQU0sVUFBVSxHQUEyQjt3QkFDMUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSTtxQkFDekIsQ0FBQTtvQkFDRCxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQ3pCLFVBQVUsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7b0JBQ3RDLENBQUM7b0JBQ0QsQ0FBQztvQkFBQyxjQUE0RCxDQUM3RCxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FDMUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUNoRCxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQzNDLFdBQVcsRUFDWCxjQUFjLG1DQUVkLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCwwQkFBMEI7WUFDMUIsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUMzQyxpQkFBaUIsRUFDakIsTUFBTSxDQUFDLFdBQVcsbUNBRWxCLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QyxJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzVCLE9BQU87b0JBQ04sTUFBTSxFQUFFO3dCQUNQLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsbUJBQW1CO3dCQUN2RCxFQUFFLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNyQixLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLO3dCQUMzQixPQUFPLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSTs0QkFDekIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSzt5QkFDM0I7cUJBQ0Q7b0JBQ0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2lCQUN2QixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQzNELENBQUM7UUFDRixDQUFDO1FBQ0QsWUFBWTtRQUNaLE9BQU8sYUFBYSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtJQUMzRixDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FDM0IsSUFBcUM7UUFFckMsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdkUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGlCQUFpQixDQUFBO1FBQy9ELE1BQU0sV0FBVyxHQUFHLHVFQUFpQyxXQUFXLENBQUE7UUFDaEUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUMvRSxJQUFJLE9BQTZCLENBQUE7UUFDakMsTUFBTSxPQUFPLEdBQXdDO1lBQ3BELFdBQVcsRUFDVixJQUFJLEtBQUssZ0JBQWdCO2dCQUN4QixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FDWiwyQ0FBMkMsRUFDM0MsdUNBQXVDLENBQ3ZDO2dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNaLDBDQUEwQyxFQUMxQyxzQ0FBc0MsQ0FDdEM7WUFDSixzQkFBc0IsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7Z0JBQ3pDLHNFQUFzRTtnQkFDdEUsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN4RCxPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsSUFBSSxTQUFTLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDdkMsT0FBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2xDLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxNQUFNLGNBQWMsR0FBMkIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FDakYsdUVBQWlDLFdBQVcsQ0FDNUMsQ0FBQTtnQkFDRCxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtnQkFDNUUsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO29CQUNoRCxNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSw2QkFBNkIsQ0FBQztvQkFDL0UsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVc7b0JBQ3ZDLGFBQWEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7d0JBQzlCLElBQUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ3RDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FDbEIsOEJBQThCLEVBQzlCLGtEQUFrRCxDQUNsRCxDQUFBO3dCQUNGLENBQUM7d0JBQ0QsT0FBTyxTQUFTLENBQUE7b0JBQ2pCLENBQUM7aUJBQ0QsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDWCxPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsTUFBTSxjQUFjLEdBQTJDO29CQUM5RCxHQUFHLGNBQWM7b0JBQ2pCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO2lCQUMxRCxDQUFBO2dCQUNELE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FDM0MsV0FBVyxFQUNYLGNBQWMsbUNBRWQsQ0FBQTtZQUNGLENBQUM7WUFDRCxTQUFTLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztTQUNyQyxDQUFBO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sY0FBYyxHQUFvRCxFQUFFLENBQUE7UUFDMUUsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDaEUsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFckUsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQy9CLGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLElBQUksRUFBRSxXQUFXO2dCQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUM7YUFDbkQsQ0FBQyxDQUFBO1lBQ0YsY0FBYyxDQUFDLElBQUksQ0FDbEIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQ2pDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUM5RCxrQkFBbUIsQ0FDbkIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbkIsSUFBSSxFQUFFLFdBQVc7WUFDakIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMENBQTBDLEVBQUUsYUFBYSxDQUFDO1NBQzlFLENBQUMsQ0FBQTtRQUNGLE1BQU0sbUJBQW1CLEdBQTRCLEVBQUUsQ0FBQTtRQUN2RCxLQUFLLE1BQU0sV0FBVyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzVFLElBQUksSUFBMkIsQ0FBQTtZQUMvQixJQUFJLE9BQU8sV0FBVyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN2QyxJQUFJLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzlDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzFDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUM3RCxDQUFDO1lBQ0QsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1RixNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDN0MsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO1lBQ3RCLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQTtZQUNoQyxDQUFDO1lBQ0QsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsbUJBQW1CLENBQUMsSUFBSSxDQUFDO2dCQUN4QixLQUFLLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxLQUFLLEVBQUU7Z0JBQzNDLE9BQU8sRUFBRTtvQkFDUixtQkFBbUIsRUFBRSxXQUFXLENBQUMsbUJBQW1CO29CQUNwRCxLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUs7b0JBQ3hCLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTtvQkFDdEIsRUFBRSxFQUFFLFdBQVcsQ0FBQyxFQUFFO29CQUNsQixLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUs7aUJBQ3hCO2dCQUNELFdBQVcsRUFBRSxXQUFXLENBQUMsS0FBSztnQkFDOUIsV0FBVzthQUNYLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxjQUFjLENBQUMsSUFBSSxDQUNsQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBbUIsQ0FBQyxDQUM1RSxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLElBQUksRUFBRSxXQUFXO2dCQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxVQUFVLENBQUM7YUFDNUQsQ0FBQyxDQUFBO1lBQ0YsY0FBYyxDQUFDLElBQUksQ0FDbEIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQ2pDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3BFLGtCQUFtQixDQUNuQixDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsTUFBTSxvQkFBb0IsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFFeEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMxRSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM5QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEQsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN6QixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sdUJBQXVCLENBQUMsT0FBeUI7UUFDeEQsTUFBTSxNQUFNLEdBQXdCLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUMxRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQixNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQTtRQUN6QixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FDM0IsT0FBcUQ7UUFFckQsTUFBTSxZQUFZLEdBQUcsY0FBYyxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFBO1FBQ3RFLE1BQU0sa0JBQWtCLEdBQUcsb0JBQW9CLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQTtRQUN4RixJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxzRUFBc0U7UUFDdEUsT0FBTyxNQUFNLElBQUksT0FBTyxDQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdkMsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO1lBQ3RCLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9CLENBQUM7WUFDRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3hCLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUNyQyxDQUFDO1lBQ0QsbUZBQW1GO1lBQ25GLDBEQUEwRDtZQUMxRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUM5QyxRQUFRLENBQUMsT0FBTyxFQUNoQixHQUFHLENBQUMsUUFBUSxDQUNYLG1CQUFtQixFQUNuQixrSUFBa0ksRUFDbEksSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQzVCLEVBQ0Q7Z0JBQ0M7b0JBQ0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztvQkFDakMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7aUJBQ2xCO2dCQUNEO29CQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ3ZDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2lCQUNuQjthQUNELENBQ0QsQ0FBQTtZQUNELE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sMkJBQTJCLENBQUMsT0FBeUI7UUFDNUQsTUFBTSxPQUFPLEdBQXdCO1lBQ3BDO2dCQUNDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLDRCQUE0QixDQUFDO2dCQUM5RCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSw0QkFBNEIsQ0FBQzthQUMvRTtTQUNELENBQUE7UUFDRCxNQUFNLElBQUksR0FDVCxPQUFPLENBQUMsSUFBSSxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ3RGLE1BQU0sS0FBSyxHQUFHLEtBQUssSUFBSSxDQUFDLEVBQUUsS0FBSyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDcEQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUMvRSxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDekMsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFBO1FBQ3RCLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbEIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3RDLE9BQU87b0JBQ04sS0FBSztvQkFDTCxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7b0JBQzlDLE9BQU87b0JBQ1AsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO29CQUNoQyxPQUFPO29CQUNQLFdBQVc7aUJBQ1gsQ0FBQTtZQUNGLENBQUM7WUFDRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsSUFBSTtpQkFDN0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3JCLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFBLENBQUMsNkdBQTZHO2dCQUNuSixDQUFDO2dCQUNELE9BQU8sQ0FBQyxDQUFBO1lBQ1QsQ0FBQyxDQUFDO2lCQUNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNYLE9BQU87Z0JBQ04sS0FBSztnQkFDTCxXQUFXLEVBQUUsR0FBRyxZQUFZLElBQUksVUFBVSxFQUFFO2dCQUM1QyxPQUFPO2dCQUNQLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztnQkFDaEMsT0FBTztnQkFDUCxXQUFXO2FBQ1gsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPO1lBQ04sS0FBSztZQUNMLFdBQVcsRUFBRSxZQUFZO1lBQ3pCLE9BQU87WUFDUCxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsT0FBTztZQUNQLFdBQVc7U0FDWCxDQUFBO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQixDQUFDLEtBQThCLEVBQUUsa0JBQTBCO1FBQzVGLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixJQUFJLENBQUMsQ0FBQyxXQUFXLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztnQkFDMUMsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsV0FBVyxLQUFLLGtCQUFrQixFQUFFLENBQUM7Z0JBQzFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDVixDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQS9XWSx3QkFBd0I7SUFFbEMsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLCtCQUErQixDQUFBO0lBRS9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsb0JBQW9CLENBQUE7R0FSVix3QkFBd0IsQ0ErV3BDIn0=