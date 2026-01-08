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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvY29tbW9uL3Rlcm1pbmFsU3VnZ2VzdENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBSWhELE1BQU0sQ0FBTixJQUFrQix3QkFXakI7QUFYRCxXQUFrQix3QkFBd0I7SUFDekMsMkVBQStDLENBQUE7SUFDL0MsNkZBQWlFLENBQUE7SUFDakUsaUhBQXFGLENBQUE7SUFDckYsaUZBQXFELENBQUE7SUFDckQsbUhBQXVGLENBQUE7SUFDdkYsK0VBQW1ELENBQUE7SUFDbkQsdUZBQTJELENBQUE7SUFDM0QseUVBQTZDLENBQUE7SUFDN0MsNkZBQWlFLENBQUE7SUFDakUsMkdBQStFLENBQUE7QUFDaEYsQ0FBQyxFQVhpQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBV3pDO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQWE7SUFDM0QsS0FBSyxFQUFFLGtCQUFrQjtJQUN6QixLQUFLLEVBQUUsYUFBYTtJQUNwQixLQUFLLEVBQUUsaUJBQWlCO0lBQ3hCLEtBQUssRUFBRSxlQUFlO0lBRXRCLEtBQUssRUFBRSw0QkFBNEI7SUFFbkMsS0FBSyxFQUFFLG9CQUFvQjtJQUUzQixLQUFLLEVBQUUsZ0JBQWdCO0lBQ3ZCLElBQUksRUFBRSxlQUFlO0lBQ3JCLEtBQUssRUFBRSx1Q0FBdUM7SUFDOUMsSUFBSSxFQUFFLDhDQUE4QztJQUNwRCxJQUFJLEVBQUUsMENBQTBDO0lBQ2hELElBQUksRUFBRSwwQ0FBMEM7SUFDaEQsSUFBSSxFQUFFLDhDQUE4QztDQUNwRCxD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