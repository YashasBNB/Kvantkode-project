/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalSuggestSettingId;
(function (TerminalSuggestSettingId) {
    TerminalSuggestSettingId["Enabled"] = "terminal.integrated.suggest.enabled";
    TerminalSuggestSettingId["QuickSuggestions"] = "terminal.integrated.suggest.quickSuggestions";
    TerminalSuggestSettingId["SuggestOnTriggerCharacters"] = "terminal.integrated.suggest.suggestOnTriggerCharacters";
    TerminalSuggestSettingId["RunOnEnter"] = "terminal.integrated.suggest.runOnEnter";
    TerminalSuggestSettingId["WindowsExecutableExtensions"] = "terminal.integrated.suggest.windowsExecutableExtensions";
    TerminalSuggestSettingId["Providers"] = "terminal.integrated.suggest.providers";
    TerminalSuggestSettingId["ShowStatusBar"] = "terminal.integrated.suggest.showStatusBar";
    TerminalSuggestSettingId["CdPath"] = "terminal.integrated.suggest.cdPath";
    TerminalSuggestSettingId["InlineSuggestion"] = "terminal.integrated.suggest.inlineSuggestion";
    TerminalSuggestSettingId["UpArrowNavigatesHistory"] = "terminal.integrated.suggest.upArrowNavigatesHistory";
})(TerminalSuggestSettingId || (TerminalSuggestSettingId = {}));
export const windowsDefaultExecutableExtensions = [
    'exe', // Executable file
    'bat', // Batch file
    'cmd', // Command script
    'com', // Command file
    'msi', // Windows Installer package
    'ps1', // PowerShell script
    'vbs', // VBScript file
    'js', // JScript file
    'jar', // Java Archive (requires Java runtime)
    'py', // Python script (requires Python interpreter)
    'rb', // Ruby script (requires Ruby interpreter)
    'pl', // Perl script (requires Perl interpreter)
    'sh', // Shell script (via WSL or third-party tools)
];
export const terminalSuggestConfigSection = 'terminal.integrated.suggest';
export const terminalSuggestConfiguration = {
    ["terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize('suggest.enabled', 'Enables terminal intellisense suggestions (preview) for supported shells ({0}) when {1} is set to {2}.\n\nIf shell integration is installed manually, {3} needs to be set to {4} before calling the shell integration script.', 'PowerShell v7+, zsh, bash, fish', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``, '`true`', '`VSCODE_SUGGEST`', '`1`'),
        type: 'boolean',
        default: false,
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
        restricted: true,
        markdownDescription: localize('suggest.providers', 'Providers are enabled by default. Omit them by setting the id of the provider to `false`.'),
        type: 'object',
        properties: {},
        default: {
            'terminal-suggest': true,
            'pwsh-shell-integration': true,
        },
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */]: {
        restricted: true,
        markdownDescription: localize('suggest.quickSuggestions', 'Controls whether suggestions should automatically show up while typing. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.', `\`#${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}#\``),
        type: 'object',
        properties: {
            commands: {
                description: localize('suggest.quickSuggestions.commands', 'Enable quick suggestions for commands, the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            arguments: {
                description: localize('suggest.quickSuggestions.arguments', 'Enable quick suggestions for arguments, anything after the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            unknown: {
                description: localize('suggest.quickSuggestions.unknown', "Enable quick suggestions when it's unclear what the best suggestion is, if this is on files and folders will be suggested as a fallback."),
                type: 'string',
                enum: ['off', 'on'],
            },
        },
        default: {
            commands: 'on',
            arguments: 'on',
            unknown: 'off',
        },
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */]: {
        restricted: true,
        markdownDescription: localize('suggest.suggestOnTriggerCharacters', 'Controls whether suggestions should automatically show up when typing trigger characters.'),
        type: 'boolean',
        default: true,
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */]: {
        restricted: true,
        markdownDescription: localize('suggest.runOnEnter', 'Controls whether suggestions should run immediately when `Enter` (not `Tab`) is used to accept the result.'),
        enum: ['ignore', 'never', 'exactMatch', 'exactMatchIgnoreExtension', 'always'],
        markdownEnumDescriptions: [
            localize('runOnEnter.ignore', 'Ignore suggestions and send the enter directly to the shell without completing. This is used as the default value so the suggest widget is as unobtrusive as possible.'),
            localize('runOnEnter.never', 'Never run on `Enter`.'),
            localize('runOnEnter.exactMatch', 'Run on `Enter` when the suggestion is typed in its entirety.'),
            localize('runOnEnter.exactMatchIgnoreExtension', 'Run on `Enter` when the suggestion is typed in its entirety or when a file is typed without its extension included.'),
            localize('runOnEnter.always', 'Always run on `Enter`.'),
        ],
        default: 'ignore',
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.windowsExecutableExtensions" /* TerminalSuggestSettingId.WindowsExecutableExtensions */]: {
        restricted: true,
        markdownDescription: localize('terminalWindowsExecutableSuggestionSetting', 'A set of windows command executable extensions that will be included as suggestions in the terminal.\n\nMany executables are included by default, listed below:\n\n{0}.\n\nTo exclude an extension, set it to `false`\n\n. To include one not in the list, add it and set it to `true`.', windowsDefaultExecutableExtensions
            .sort()
            .map((extension) => `- ${extension}`)
            .join('\n')),
        type: 'object',
        default: {},
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */]: {
        restricted: true,
        markdownDescription: localize('suggest.showStatusBar', 'Controls whether the terminal suggestions status bar should be shown.'),
        type: 'boolean',
        default: true,
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */]: {
        restricted: true,
        markdownDescription: localize('suggest.cdPath', 'Controls whether to enable $CDPATH support which exposes children of the folders in the $CDPATH variable regardless of the current working directory. $CDPATH is expected to be semi colon-separated on Windows and colon-separated on other platforms.'),
        type: 'string',
        enum: ['off', 'relative', 'absolute'],
        markdownEnumDescriptions: [
            localize('suggest.cdPath.off', 'Disable the feature.'),
            localize('suggest.cdPath.relative', 'Enable the feature and use relative paths.'),
            localize('suggest.cdPath.absolute', "Enable the feature and use absolute paths. This is useful when the shell doesn't natively support `$CDPATH`."),
        ],
        default: 'absolute',
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */]: {
        restricted: true,
        markdownDescription: localize('suggest.inlineSuggestion', "Controls whether the shell's inline suggestion should be detected and how it is scored."),
        type: 'string',
        enum: ['off', 'alwaysOnTopExceptExactMatch', 'alwaysOnTop'],
        markdownEnumDescriptions: [
            localize('suggest.inlineSuggestion.off', 'Disable the feature.'),
            localize('suggest.inlineSuggestion.alwaysOnTopExceptExactMatch', 'Enable the feature and sort the inline suggestion without forcing it to be on top. This means that exact matches will be will be above the inline suggestion.'),
            localize('suggest.inlineSuggestion.alwaysOnTop', 'Enable the feature and always put the inline suggestion on top.'),
        ],
        default: 'alwaysOnTop',
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */]: {
        restricted: true,
        markdownDescription: localize('suggest.upArrowNavigatesHistory', 'Determines whether the up arrow key navigates the command history when focus is on the first suggestion and navigation has not yet occurred. When set to false, the up arrow will move focus to the last suggestion instead.'),
        type: 'boolean',
        default: true,
        tags: ['preview'],
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2NvbW1vbi90ZXJtaW5hbFN1Z2dlc3RDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUloRCxNQUFNLENBQU4sSUFBa0Isd0JBV2pCO0FBWEQsV0FBa0Isd0JBQXdCO0lBQ3pDLDJFQUErQyxDQUFBO0lBQy9DLDZGQUFpRSxDQUFBO0lBQ2pFLGlIQUFxRixDQUFBO0lBQ3JGLGlGQUFxRCxDQUFBO0lBQ3JELG1IQUF1RixDQUFBO0lBQ3ZGLCtFQUFtRCxDQUFBO0lBQ25ELHVGQUEyRCxDQUFBO0lBQzNELHlFQUE2QyxDQUFBO0lBQzdDLDZGQUFpRSxDQUFBO0lBQ2pFLDJHQUErRSxDQUFBO0FBQ2hGLENBQUMsRUFYaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQVd6QztBQUVELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFhO0lBQzNELEtBQUssRUFBRSxrQkFBa0I7SUFDekIsS0FBSyxFQUFFLGFBQWE7SUFDcEIsS0FBSyxFQUFFLGlCQUFpQjtJQUN4QixLQUFLLEVBQUUsZUFBZTtJQUV0QixLQUFLLEVBQUUsNEJBQTRCO0lBRW5DLEtBQUssRUFBRSxvQkFBb0I7SUFFM0IsS0FBSyxFQUFFLGdCQUFnQjtJQUN2QixJQUFJLEVBQUUsZUFBZTtJQUNyQixLQUFLLEVBQUUsdUNBQXVDO0lBQzlDLElBQUksRUFBRSw4Q0FBOEM7SUFDcEQsSUFBSSxFQUFFLDBDQUEwQztJQUNoRCxJQUFJLEVBQUUsMENBQTBDO0lBQ2hELElBQUksRUFBRSw4Q0FBOEM7Q0FDcEQsQ0FBQTtB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