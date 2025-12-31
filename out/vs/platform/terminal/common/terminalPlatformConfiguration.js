/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getAllCodicons } from '../../../base/common/codicons.js';
import { PlatformToString } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { Extensions, } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
import { createProfileSchemaEnums } from './terminalProfiles.js';
export const terminalColorSchema = {
    type: ['string', 'null'],
    enum: [
        'terminal.ansiBlack',
        'terminal.ansiRed',
        'terminal.ansiGreen',
        'terminal.ansiYellow',
        'terminal.ansiBlue',
        'terminal.ansiMagenta',
        'terminal.ansiCyan',
        'terminal.ansiWhite',
    ],
    default: null,
};
export const terminalIconSchema = {
    type: 'string',
    enum: Array.from(getAllCodicons(), (icon) => icon.id),
    markdownEnumDescriptions: Array.from(getAllCodicons(), (icon) => `$(${icon.id})`),
};
const terminalProfileBaseProperties = {
    args: {
        description: localize('terminalProfile.args', 'An optional set of arguments to run the shell executable with.'),
        type: 'array',
        items: {
            type: 'string',
        },
    },
    overrideName: {
        description: localize('terminalProfile.overrideName', 'Whether or not to replace the dynamic terminal title that detects what program is running with the static profile name.'),
        type: 'boolean',
    },
    icon: {
        description: localize('terminalProfile.icon', 'A codicon ID to associate with the terminal icon.'),
        ...terminalIconSchema,
    },
    color: {
        description: localize('terminalProfile.color', 'A theme color ID to associate with the terminal icon.'),
        ...terminalColorSchema,
    },
    env: {
        markdownDescription: localize('terminalProfile.env', 'An object with environment variables that will be added to the terminal profile process. Set to `null` to delete environment variables from the base environment.'),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null'],
        },
        default: {},
    },
};
const terminalProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize('terminalProfile.path', 'A single path to a shell executable or an array of paths that will be used as fallbacks when one fails.'),
            type: ['string', 'array'],
            items: {
                type: 'string',
            },
        },
        ...terminalProfileBaseProperties,
    },
};
const terminalAutomationProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize('terminalAutomationProfile.path', 'A single path to a shell executable.'),
            type: ['string'],
            items: {
                type: 'string',
            },
        },
        ...terminalProfileBaseProperties,
    },
};
function createTerminalProfileMarkdownDescription(platform) {
    const key = platform === 2 /* Platform.Linux */ ? 'linux' : platform === 1 /* Platform.Mac */ ? 'osx' : 'windows';
    return localize({
        key: 'terminal.integrated.profile',
        comment: ['{0} is the platform, {1} is a code block, {2} and {3} are a link start and end'],
    }, 'A set of terminal profile customizations for {0} which allows adding, removing or changing how terminals are launched. Profiles are made up of a mandatory path, optional arguments and other presentation options.\n\nTo override an existing profile use its profile name as the key, for example:\n\n{1}\n\n{2}Read more about configuring profiles{3}.', PlatformToString(platform), '```json\n"terminal.integrated.profile.' + key + '": {\n  "bash": null\n}\n```', '[', '](https://code.visualstudio.com/docs/terminal/profiles)');
}
const terminalPlatformConfiguration = {
    id: 'terminal',
    order: 100,
    title: localize('terminalIntegratedConfigurationTitle', 'Integrated Terminal'),
    type: 'object',
    properties: {
        ["terminal.integrated.automationProfile.linux" /* TerminalSettingId.AutomationProfileLinux */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.linux', 'The terminal profile to use on Linux for automation-related terminal usage like tasks and debug.'),
            type: ['object', 'null'],
            default: null,
            anyOf: [{ type: 'null' }, terminalAutomationProfileSchema],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}',
                    },
                },
            ],
        },
        ["terminal.integrated.automationProfile.osx" /* TerminalSettingId.AutomationProfileMacOs */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.osx', 'The terminal profile to use on macOS for automation-related terminal usage like tasks and debug.'),
            type: ['object', 'null'],
            default: null,
            anyOf: [{ type: 'null' }, terminalAutomationProfileSchema],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}',
                    },
                },
            ],
        },
        ["terminal.integrated.automationProfile.windows" /* TerminalSettingId.AutomationProfileWindows */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.windows', 'The terminal profile to use for automation-related terminal usage like tasks and debug. This setting will currently be ignored if {0} (now deprecated) is set.', '`terminal.integrated.automationShell.windows`'),
            type: ['object', 'null'],
            default: null,
            anyOf: [{ type: 'null' }, terminalAutomationProfileSchema],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}',
                    },
                },
            ],
        },
        ["terminal.integrated.profiles.windows" /* TerminalSettingId.ProfilesWindows */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(3 /* Platform.Windows */),
            type: 'object',
            default: {
                PowerShell: {
                    source: 'PowerShell',
                    icon: 'terminal-powershell',
                },
                'Command Prompt': {
                    path: ['${env:windir}\\Sysnative\\cmd.exe', '${env:windir}\\System32\\cmd.exe'],
                    args: [],
                    icon: 'terminal-cmd',
                },
                'Git Bash': {
                    source: 'Git Bash',
                },
            },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'object',
                        required: ['source'],
                        properties: {
                            source: {
                                description: localize('terminalProfile.windowsSource', 'A profile source that will auto detect the paths to the shell. Note that non-standard executable locations are not supported and must be created manually in a new profile.'),
                                enum: ['PowerShell', 'Git Bash'],
                            },
                            ...terminalProfileBaseProperties,
                        },
                    },
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.windowsExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string',
                            },
                            id: {
                                description: localize('terminalProfile.windowsExtensionId', 'The id of the extension terminal'),
                                type: 'string',
                            },
                            title: {
                                description: localize('terminalProfile.windowsExtensionTitle', 'The name of the extension terminal'),
                                type: 'string',
                            },
                            ...terminalProfileBaseProperties,
                        },
                    },
                    { type: 'null' },
                    terminalProfileSchema,
                ],
            },
        },
        ["terminal.integrated.profiles.osx" /* TerminalSettingId.ProfilesMacOs */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(1 /* Platform.Mac */),
            type: 'object',
            default: {
                bash: {
                    path: 'bash',
                    args: ['-l'],
                    icon: 'terminal-bash',
                },
                zsh: {
                    path: 'zsh',
                    args: ['-l'],
                },
                fish: {
                    path: 'fish',
                    args: ['-l'],
                },
                tmux: {
                    path: 'tmux',
                    icon: 'terminal-tmux',
                },
                pwsh: {
                    path: 'pwsh',
                    icon: 'terminal-powershell',
                },
            },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.osxExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string',
                            },
                            id: {
                                description: localize('terminalProfile.osxExtensionId', 'The id of the extension terminal'),
                                type: 'string',
                            },
                            title: {
                                description: localize('terminalProfile.osxExtensionTitle', 'The name of the extension terminal'),
                                type: 'string',
                            },
                            ...terminalProfileBaseProperties,
                        },
                    },
                    { type: 'null' },
                    terminalProfileSchema,
                ],
            },
        },
        ["terminal.integrated.profiles.linux" /* TerminalSettingId.ProfilesLinux */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(2 /* Platform.Linux */),
            type: 'object',
            default: {
                bash: {
                    path: 'bash',
                    icon: 'terminal-bash',
                },
                zsh: {
                    path: 'zsh',
                },
                fish: {
                    path: 'fish',
                },
                tmux: {
                    path: 'tmux',
                    icon: 'terminal-tmux',
                },
                pwsh: {
                    path: 'pwsh',
                    icon: 'terminal-powershell',
                },
            },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.linuxExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string',
                            },
                            id: {
                                description: localize('terminalProfile.linuxExtensionId', 'The id of the extension terminal'),
                                type: 'string',
                            },
                            title: {
                                description: localize('terminalProfile.linuxExtensionTitle', 'The name of the extension terminal'),
                                type: 'string',
                            },
                            ...terminalProfileBaseProperties,
                        },
                    },
                    { type: 'null' },
                    terminalProfileSchema,
                ],
            },
        },
        ["terminal.integrated.useWslProfiles" /* TerminalSettingId.UseWslProfiles */]: {
            description: localize('terminal.integrated.useWslProfiles', 'Controls whether or not WSL distros are shown in the terminal dropdown'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.inheritEnv" /* TerminalSettingId.InheritEnv */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('terminal.integrated.inheritEnv', 'Whether new shells should inherit their environment from VS Code, which may source a login shell to ensure $PATH and other development variables are initialized. This has no effect on Windows.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: localize('terminal.integrated.persistentSessionScrollback', 'Controls the maximum amount of lines that will be restored when reconnecting to a persistent terminal session. Increasing this will restore more lines of scrollback at the cost of more memory and increase the time it takes to connect to terminals on start up. This setting requires a restart to take effect and should be set to a value less than or equal to `#terminal.integrated.scrollback#`.'),
            type: 'number',
            default: 100,
        },
        ["terminal.integrated.showLinkHover" /* TerminalSettingId.ShowLinkHover */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('terminal.integrated.showLinkHover', 'Whether to show hovers for links in the terminal output.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.ignoreProcessNames" /* TerminalSettingId.IgnoreProcessNames */]: {
            markdownDescription: localize('terminal.integrated.confirmIgnoreProcesses', 'A set of process names to ignore when using the {0} setting.', '`#terminal.integrated.confirmOnKill#`'),
            type: 'array',
            items: {
                type: 'string',
                uniqueItems: true,
            },
            default: [
                // Popular prompt programs, these should not count as child processes
                'starship',
                'oh-my-posh',
                // Git bash may runs a subprocess of itself (bin\bash.exe -> usr\bin\bash.exe)
                'bash',
                'zsh',
            ],
        },
    },
};
/**
 * Registers terminal configurations required by shared process and remote server.
 */
export function registerTerminalPlatformConfiguration() {
    Registry.as(Extensions.Configuration).registerConfiguration(terminalPlatformConfiguration);
    registerTerminalDefaultProfileConfiguration();
}
let defaultProfilesConfiguration;
export function registerTerminalDefaultProfileConfiguration(detectedProfiles, extensionContributedProfiles) {
    const registry = Registry.as(Extensions.Configuration);
    let profileEnum;
    if (detectedProfiles) {
        profileEnum = createProfileSchemaEnums(detectedProfiles?.profiles, extensionContributedProfiles);
    }
    const oldDefaultProfilesConfiguration = defaultProfilesConfiguration;
    defaultProfilesConfiguration = {
        id: 'terminal',
        order: 100,
        title: localize('terminalIntegratedConfigurationTitle', 'Integrated Terminal'),
        type: 'object',
        properties: {
            ["terminal.integrated.defaultProfile.linux" /* TerminalSettingId.DefaultProfileLinux */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.linux', 'The default terminal profile on Linux.'),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 3 /* OperatingSystem.Linux */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 3 /* OperatingSystem.Linux */
                    ? profileEnum?.markdownDescriptions
                    : undefined,
            },
            ["terminal.integrated.defaultProfile.osx" /* TerminalSettingId.DefaultProfileMacOs */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.osx', 'The default terminal profile on macOS.'),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 2 /* OperatingSystem.Macintosh */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 2 /* OperatingSystem.Macintosh */
                    ? profileEnum?.markdownDescriptions
                    : undefined,
            },
            ["terminal.integrated.defaultProfile.windows" /* TerminalSettingId.DefaultProfileWindows */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.windows', 'The default terminal profile on Windows.'),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 1 /* OperatingSystem.Windows */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 1 /* OperatingSystem.Windows */
                    ? profileEnum?.markdownDescriptions
                    : undefined,
            },
        },
    };
    registry.updateConfigurations({
        add: [defaultProfilesConfiguration],
        remove: oldDefaultProfilesConfiguration ? [oldDefaultProfilesConfiguration] : [],
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBNkIsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUVOLFVBQVUsR0FHVixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBZ0I7SUFDL0MsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztJQUN4QixJQUFJLEVBQUU7UUFDTCxvQkFBb0I7UUFDcEIsa0JBQWtCO1FBQ2xCLG9CQUFvQjtRQUNwQixxQkFBcUI7UUFDckIsbUJBQW1CO1FBQ25CLHNCQUFzQjtRQUN0QixtQkFBbUI7UUFDbkIsb0JBQW9CO0tBQ3BCO0lBQ0QsT0FBTyxFQUFFLElBQUk7Q0FDYixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQWdCO0lBQzlDLElBQUksRUFBRSxRQUFRO0lBQ2QsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDckQsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLElB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