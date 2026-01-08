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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUXVpY2twaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsUHJvZmlsZVF1aWNrcGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixrQkFBa0IsR0FNbEIsTUFBTSxzREFBc0QsQ0FBQTtBQVE3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2pFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFHMUQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFDcEMsWUFDMkMsdUJBQWdELEVBRXpFLCtCQUFnRSxFQUN6QyxxQkFBNEMsRUFDL0Msa0JBQXNDLEVBQzNDLGFBQTRCLEVBQ3JCLG9CQUEwQztRQU52Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQXlCO1FBRXpFLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBaUM7UUFDekMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUMvQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQzNDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3JCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7SUFDL0UsQ0FBQztJQUVKLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDckIsSUFBcUM7UUFFckMsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdkUsTUFBTSxXQUFXLEdBQUcsdUVBQWlDLFdBQVcsQ0FBQTtRQUNoRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLGdGQUFvQyxHQUFHLFdBQVcsRUFBRSxDQUFBO1FBQ2pGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDM0IsSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNqQyxPQUFNLENBQUMsc0JBQXNCO1lBQzlCLENBQUM7aUJBQU0sSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQyxnQ0FBZ0M7Z0JBQ2hDLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FDM0MsaUJBQWlCLEVBQ2pCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxtQ0FFcEIsQ0FBQTtnQkFDRCxPQUFPO29CQUNOLE1BQU0sRUFBRTt3QkFDUCxtQkFBbUIsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLG1CQUFtQjt3QkFDdkQsRUFBRSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTt3QkFDckIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSzt3QkFDM0IsT0FBTyxFQUFFOzRCQUNSLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUs7NEJBQzNCLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUk7eUJBQ3pCO3FCQUNEO29CQUNELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztpQkFDdkIsQ0FBQTtZQUNGLENBQUM7WUFFRCwyQ0FBMkM7WUFDM0MsSUFBSSxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDN0UsSUFBSSxPQUFPLGNBQWMsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDeEMsTUFBTSxVQUFVLEdBQTJCO3dCQUMxQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJO3FCQUN6QixDQUFBO29CQUNELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDekIsVUFBVSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtvQkFDdEMsQ0FBQztvQkFDRCxDQUFDO29CQUFDLGNBQTRELENBQzdELE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUMxQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ2hELE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FDM0MsV0FBVyxFQUNYLGNBQWMsbUNBRWQsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELDBCQUEwQjtZQUMxQixNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQzNDLGlCQUFpQixFQUNqQixNQUFNLENBQUMsV0FBVyxtQ0FFbEIsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksS0FBSyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RDLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDNUIsT0FBTztvQkFDTixNQUFNLEVBQUU7d0JBQ1AsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUI7d0JBQ3ZELEVBQUUsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3JCLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUs7d0JBQzNCLE9BQU8sRUFBRTs0QkFDUixJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJOzRCQUN6QixLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLO3lCQUMzQjtxQkFDRDtvQkFDRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87aUJBQ3ZCLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDM0QsQ0FBQztRQUNGLENBQUM7UUFDRCxZQUFZO1FBQ1osT0FBTyxhQUFhLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO0lBQzNGLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUMzQixJQUFxQztRQUVyQyxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN2RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLENBQUE7UUFDL0QsTUFBTSxXQUFXLEdBQUcsdUVBQWlDLFdBQVcsQ0FBQTtRQUNoRSxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBQy9FLElBQUksT0FBNkIsQ0FBQTtRQUNqQyxNQUFNLE9BQU8sR0FBd0M7WUFDcEQsV0FBVyxFQUNWLElBQUksS0FBSyxnQkFBZ0I7Z0JBQ3hCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNaLDJDQUEyQyxFQUMzQyx1Q0FBdUMsQ0FDdkM7Z0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQ1osMENBQTBDLEVBQzFDLHNDQUFzQyxDQUN0QztZQUNKLHNCQUFzQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDekMsc0VBQXNFO2dCQUN0RSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3hELE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxJQUFJLFNBQVMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN2QyxPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbEMsT0FBTTtnQkFDUCxDQUFDO2dCQUNELE1BQU0sY0FBYyxHQUEyQixJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUNqRix1RUFBaUMsV0FBVyxDQUM1QyxDQUFBO2dCQUNELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO2dCQUM1RSxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7b0JBQ2hELE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDZCQUE2QixDQUFDO29CQUMvRSxLQUFLLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztvQkFDdkMsYUFBYSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTt3QkFDOUIsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzs0QkFDdEMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUNsQiw4QkFBOEIsRUFDOUIsa0RBQWtELENBQ2xELENBQUE7d0JBQ0YsQ0FBQzt3QkFDRCxPQUFPLFNBQVMsQ0FBQTtvQkFDakIsQ0FBQztpQkFDRCxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxNQUFNLGNBQWMsR0FBMkM7b0JBQzlELEdBQUcsY0FBYztvQkFDakIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7aUJBQzFELENBQUE7Z0JBQ0QsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUMzQyxXQUFXLEVBQ1gsY0FBYyxtQ0FFZCxDQUFBO1lBQ0YsQ0FBQztZQUNELFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1NBQ3JDLENBQUE7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSxjQUFjLEdBQW9ELEVBQUUsQ0FBQTtRQUMxRSxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNoRSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVyRSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0IsY0FBYyxDQUFDLElBQUksQ0FBQztnQkFDbkIsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQzthQUNuRCxDQUFDLENBQUE7WUFDRixjQUFjLENBQUMsSUFBSSxDQUNsQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FDakMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzlELGtCQUFtQixDQUNuQixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNuQixJQUFJLEVBQUUsV0FBVztZQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxhQUFhLENBQUM7U0FDOUUsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxtQkFBbUIsR0FBNEIsRUFBRSxDQUFBO1FBQ3ZELEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDNUUsSUFBSSxJQUEyQixDQUFBO1lBQy9CLElBQUksT0FBTyxXQUFXLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ3ZDLElBQUksR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDOUMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDMUMsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQzdELENBQUM7WUFDRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzVGLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUM3QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUE7WUFDdEIsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFBO1lBQ2hDLENBQUM7WUFDRCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzdCLENBQUM7WUFDRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hCLEtBQUssRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLEtBQUssRUFBRTtnQkFDM0MsT0FBTyxFQUFFO29CQUNSLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxtQkFBbUI7b0JBQ3BELEtBQUssRUFBRSxXQUFXLENBQUMsS0FBSztvQkFDeEIsSUFBSSxFQUFFLFdBQVcsQ0FBQyxJQUFJO29CQUN0QixFQUFFLEVBQUUsV0FBVyxDQUFDLEVBQUU7b0JBQ2xCLEtBQUssRUFBRSxXQUFXLENBQUMsS0FBSztpQkFDeEI7Z0JBQ0QsV0FBVyxFQUFFLFdBQVcsQ0FBQyxLQUFLO2dCQUM5QixXQUFXO2FBQ1gsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksbUJBQW1CLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BDLGNBQWMsQ0FBQyxJQUFJLENBQ2xCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixFQUFFLGtCQUFtQixDQUFDLENBQzVFLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDckMsY0FBYyxDQUFDLElBQUksQ0FBQztnQkFDbkIsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLFVBQVUsQ0FBQzthQUM1RCxDQUFDLENBQUE7WUFDRixjQUFjLENBQUMsSUFBSSxDQUNsQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FDakMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEUsa0JBQW1CLENBQ25CLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLG9CQUFvQixHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUV4RixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzFFLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzlCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3pCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxPQUF5QjtRQUN4RCxNQUFNLE1BQU0sR0FBd0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzFELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUMzQixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDakIsTUFBTSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFBO1FBQ3pCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUMzQixPQUFxRDtRQUVyRCxNQUFNLFlBQVksR0FBRyxjQUFjLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFDdEUsTUFBTSxrQkFBa0IsR0FBRyxvQkFBb0IsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFBO1FBQ3hGLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzFDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELHNFQUFzRTtRQUN0RSxPQUFPLE1BQU0sSUFBSSxPQUFPLENBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUE7WUFDdEIsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDL0IsQ0FBQztZQUNELElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQkFDeEIsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7WUFDRCxtRkFBbUY7WUFDbkYsMERBQTBEO1lBQzFELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQzlDLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsbUJBQW1CLEVBQ25CLGtJQUFrSSxFQUNsSSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FDNUIsRUFDRDtnQkFDQztvQkFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDO29CQUNqQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztpQkFDbEI7Z0JBQ0Q7b0JBQ0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztvQkFDdkMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7aUJBQ25CO2FBQ0QsQ0FDRCxDQUFBO1lBQ0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTywyQkFBMkIsQ0FBQyxPQUF5QjtRQUM1RCxNQUFNLE9BQU8sR0FBd0I7WUFDcEM7Z0JBQ0MsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsNEJBQTRCLENBQUM7Z0JBQzlELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDO2FBQy9FO1NBQ0QsQ0FBQTtRQUNELE1BQU0sSUFBSSxHQUNULE9BQU8sQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFDdEYsTUFBTSxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNwRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQy9FLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDdEIsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQixJQUFJLE9BQU8sT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsT0FBTztvQkFDTixLQUFLO29CQUNMLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtvQkFDOUMsT0FBTztvQkFDUCxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7b0JBQ2hDLE9BQU87b0JBQ1AsV0FBVztpQkFDWCxDQUFBO1lBQ0YsQ0FBQztZQUNELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJO2lCQUM3QixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDckIsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUEsQ0FBQyw2R0FBNkc7Z0JBQ25KLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDLENBQUM7aUJBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ1gsT0FBTztnQkFDTixLQUFLO2dCQUNMLFdBQVcsRUFBRSxHQUFHLFlBQVksSUFBSSxVQUFVLEVBQUU7Z0JBQzVDLE9BQU87Z0JBQ1AsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO2dCQUNoQyxPQUFPO2dCQUNQLFdBQVc7YUFDWCxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU87WUFDTixLQUFLO1lBQ0wsV0FBVyxFQUFFLFlBQVk7WUFDekIsT0FBTztZQUNQLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztZQUNoQyxPQUFPO1lBQ1AsV0FBVztTQUNYLENBQUE7SUFDRixDQUFDO0lBRU8sMEJBQTBCLENBQUMsS0FBOEIsRUFBRSxrQkFBMEI7UUFDNUYsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFCLElBQUksQ0FBQyxDQUFDLFdBQVcsS0FBSyxrQkFBa0IsRUFBRSxDQUFDO2dCQUMxQyxPQUFPLENBQUMsQ0FBQTtZQUNULENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxXQUFXLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztnQkFDMUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUNWLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNsRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBL1dZLHdCQUF3QjtJQUVsQyxXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsK0JBQStCLENBQUE7SUFFL0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxvQkFBb0IsQ0FBQTtHQVJWLHdCQUF3QixDQStXcEMifQ==