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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbFBsYXRmb3JtQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUE2QixnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBRU4sVUFBVSxHQUdWLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWhFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFnQjtJQUMvQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO0lBQ3hCLElBQUksRUFBRTtRQUNMLG9CQUFvQjtRQUNwQixrQkFBa0I7UUFDbEIsb0JBQW9CO1FBQ3BCLHFCQUFxQjtRQUNyQixtQkFBbUI7UUFDbkIsc0JBQXNCO1FBQ3RCLG1CQUFtQjtRQUNuQixvQkFBb0I7S0FDcEI7SUFDRCxPQUFPLEVBQUUsSUFBSTtDQUNiLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBZ0I7SUFDOUMsSUFBSSxFQUFFLFFBQVE7SUFDZCxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNyRCx3QkFBd0IsRUFBRSxLQUFLLENB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