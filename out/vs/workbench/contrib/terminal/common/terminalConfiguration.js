/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import product from '../../../../platform/product/common/product.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { terminalColorSchema, terminalIconSchema, } from '../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/configuration.js';
import { terminalContribConfiguration, } from '../terminalContribExports.js';
import { DEFAULT_COMMANDS_TO_SKIP_SHELL, DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, MAXIMUM_FONT_WEIGHT, MINIMUM_FONT_WEIGHT, SUGGESTIONS_FONT_WEIGHT, } from './terminal.js';
const terminalDescriptors = '\n- ' +
    [
        '`\${cwd}`: ' + localize('cwd', "the terminal's current working directory."),
        '`\${cwdFolder}`: ' +
            localize('cwdFolder', "the terminal's current working directory, displayed for multi-root workspaces or in a single root workspace when the value differs from the initial working directory. On Windows, this will only be displayed when shell integration is enabled."),
        '`\${workspaceFolder}`: ' +
            localize('workspaceFolder', 'the workspace in which the terminal was launched.'),
        '`\${workspaceFolderName}`: ' +
            localize('workspaceFolderName', 'the `name` of the workspace in which the terminal was launched.'),
        '`\${local}`: ' + localize('local', 'indicates a local terminal in a remote workspace.'),
        '`\${process}`: ' + localize('process', 'the name of the terminal process.'),
        '`\${progress}`: ' +
            localize('progress', 'the progress state as reported by the `OSC 9;4` sequence.'),
        '`\${separator}`: ' +
            localize('separator', "a conditional separator {0} that only shows when it's surrounded by variables with values or static text.", '(` - `)'),
        '`\${sequence}`: ' + localize('sequence', 'the name provided to the terminal by the process.'),
        '`\${task}`: ' + localize('task', 'indicates this terminal is associated with a task.'),
        '`\${shellType}`: ' + localize('shellType', 'the detected shell type.'),
        '`\${shellCommand}`: ' +
            localize('shellCommand', 'the command being executed according to shell integration. This also requires high confidence in the detected command line, which may not work in some prompt frameworks.'),
        '`\${shellPromptInput}`: ' +
            localize('shellPromptInput', "the shell's full prompt input according to shell integration."),
    ].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
let terminalTitle = localize('terminalTitle', 'Controls the terminal title. Variables are substituted based on the context:');
terminalTitle += terminalDescriptors;
let terminalDescription = localize('terminalDescription', 'Controls the terminal description, which appears to the right of the title. Variables are substituted based on the context:');
terminalDescription += terminalDescriptors;
export const defaultTerminalFontSize = isMacintosh ? 12 : 14;
const terminalConfiguration = {
    id: 'terminal',
    order: 100,
    title: localize('terminalIntegratedConfigurationTitle', 'Integrated Terminal'),
    type: 'object',
    properties: {
        ["terminal.integrated.sendKeybindingsToShell" /* TerminalSettingId.SendKeybindingsToShell */]: {
            markdownDescription: localize('terminal.integrated.sendKeybindingsToShell', 'Dispatches most keybindings to the terminal instead of the workbench, overriding {0}, which can be used alternatively for fine tuning.', '`#terminal.integrated.commandsToSkipShell#`'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.tabs.defaultColor" /* TerminalSettingId.TabsDefaultColor */]: {
            description: localize('terminal.integrated.tabs.defaultColor', 'A theme color ID to associate with terminal icons by default.'),
            ...terminalColorSchema,
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        ["terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */]: {
            description: localize('terminal.integrated.tabs.defaultIcon', 'A codicon ID to associate with terminal icons by default.'),
            ...terminalIconSchema,
            default: Codicon.terminal.id,
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        ["terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */]: {
            description: localize('terminal.integrated.tabs.enabled', 'Controls whether terminal tabs display as a list to the side of the terminal. When this is disabled a dropdown will display instead.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.tabs.enableAnimation" /* TerminalSettingId.TabsEnableAnimation */]: {
            description: localize('terminal.integrated.tabs.enableAnimation', 'Controls whether terminal tab statuses support animation (eg. in progress tasks).'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */]: {
            description: localize('terminal.integrated.tabs.hideCondition', 'Controls whether the terminal tabs view will hide under certain conditions.'),
            type: 'string',
            enum: ['never', 'singleTerminal', 'singleGroup'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.hideCondition.never', 'Never hide the terminal tabs view'),
                localize('terminal.integrated.tabs.hideCondition.singleTerminal', 'Hide the terminal tabs view when there is only a single terminal opened'),
                localize('terminal.integrated.tabs.hideCondition.singleGroup', 'Hide the terminal tabs view when there is only a single terminal group opened'),
            ],
            default: 'singleTerminal',
        },
        ["terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */]: {
            description: localize('terminal.integrated.tabs.showActiveTerminal', "Shows the active terminal information in the view. This is particularly useful when the title within the tabs aren't visible."),
            type: 'string',
            enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.showActiveTerminal.always', 'Always show the active terminal'),
                localize('terminal.integrated.tabs.showActiveTerminal.singleTerminal', 'Show the active terminal when it is the only terminal opened'),
                localize('terminal.integrated.tabs.showActiveTerminal.singleTerminalOrNarrow', 'Show the active terminal when it is the only terminal opened or when the tabs view is in its narrow textless state'),
                localize('terminal.integrated.tabs.showActiveTerminal.never', 'Never show the active terminal'),
            ],
            default: 'singleTerminalOrNarrow',
        },
        ["terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */]: {
            description: localize('terminal.integrated.tabs.showActions', 'Controls whether terminal split and kill buttons are displays next to the new terminal button.'),
            type: 'string',
            enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.showActions.always', 'Always show the actions'),
                localize('terminal.integrated.tabs.showActions.singleTerminal', 'Show the actions when it is the only terminal opened'),
                localize('terminal.integrated.tabs.showActions.singleTerminalOrNarrow', 'Show the actions when it is the only terminal opened or when the tabs view is in its narrow textless state'),
                localize('terminal.integrated.tabs.showActions.never', 'Never show the actions'),
            ],
            default: 'singleTerminalOrNarrow',
        },
        ["terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */]: {
            type: 'string',
            enum: ['left', 'right'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.location.left', 'Show the terminal tabs view to the left of the terminal'),
                localize('terminal.integrated.tabs.location.right', 'Show the terminal tabs view to the right of the terminal'),
            ],
            default: 'right',
            description: localize('terminal.integrated.tabs.location', 'Controls the location of the terminal tabs, either to the left or right of the actual terminal(s).'),
        },
        ["terminal.integrated.defaultLocation" /* TerminalSettingId.DefaultLocation */]: {
            type: 'string',
            enum: ["editor" /* TerminalLocationString.Editor */, "view" /* TerminalLocationString.TerminalView */],
            enumDescriptions: [
                localize('terminal.integrated.defaultLocation.editor', 'Create terminals in the editor'),
                localize('terminal.integrated.defaultLocation.view', 'Create terminals in the terminal view'),
            ],
            default: 'view',
            description: localize('terminal.integrated.defaultLocation', 'Controls where newly created terminals will appear.'),
        },
        ["terminal.integrated.tabs.focusMode" /* TerminalSettingId.TabsFocusMode */]: {
            type: 'string',
            enum: ['singleClick', 'doubleClick'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.focusMode.singleClick', 'Focus the terminal when clicking a terminal tab'),
                localize('terminal.integrated.tabs.focusMode.doubleClick', 'Focus the terminal when double-clicking a terminal tab'),
            ],
            default: 'doubleClick',
            description: localize('terminal.integrated.tabs.focusMode', 'Controls whether focusing the terminal of a tab happens on double or single click.'),
        },
        ["terminal.integrated.macOptionIsMeta" /* TerminalSettingId.MacOptionIsMeta */]: {
            description: localize('terminal.integrated.macOptionIsMeta', 'Controls whether to treat the option key as the meta key in the terminal on macOS.'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.macOptionClickForcesSelection" /* TerminalSettingId.MacOptionClickForcesSelection */]: {
            description: localize('terminal.integrated.macOptionClickForcesSelection', 'Controls whether to force selection when using Option+click on macOS. This will force a regular (line) selection and disallow the use of column selection mode. This enables copying and pasting using the regular terminal selection, for example, when mouse mode is enabled in tmux.'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.altClickMovesCursor" /* TerminalSettingId.AltClickMovesCursor */]: {
            markdownDescription: localize('terminal.integrated.altClickMovesCursor', 'If enabled, alt/option + click will reposition the prompt cursor to underneath the mouse when {0} is set to {1} (the default value). This may not work reliably depending on your shell.', '`#editor.multiCursorModifier#`', "`'alt'`"),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.copyOnSelection" /* TerminalSettingId.CopyOnSelection */]: {
            description: localize('terminal.integrated.copyOnSelection', 'Controls whether text selected in the terminal will be copied to the clipboard.'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: {
            markdownDescription: localize('terminal.integrated.enableMultiLinePasteWarning', 'Controls whether to show a warning dialog when pasting multiple lines into the terminal.'),
            type: 'string',
            enum: ['auto', 'always', 'never'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.enableMultiLinePasteWarning.auto', "Enable the warning but do not show it when:\n\n- Bracketed paste mode is enabled (the shell supports multi-line paste natively)\n- The paste is handled by the shell's readline (in the case of pwsh)"),
                localize('terminal.integrated.enableMultiLinePasteWarning.always', 'Always show the warning if the text contains a new line.'),
                localize('terminal.integrated.enableMultiLinePasteWarning.never', 'Never show the warning.'),
            ],
            default: 'auto',
        },
        ["terminal.integrated.drawBoldTextInBrightColors" /* TerminalSettingId.DrawBoldTextInBrightColors */]: {
            description: localize('terminal.integrated.drawBoldTextInBrightColors', 'Controls whether bold text in the terminal will always use the "bright" ANSI color variant.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */]: {
            markdownDescription: localize('terminal.integrated.fontFamily', "Controls the font family of the terminal. Defaults to {0}'s value.", '`#editor.fontFamily#`'),
            type: 'string',
        },
        ["terminal.integrated.fontLigatures.enabled" /* TerminalSettingId.FontLigaturesEnabled */]: {
            markdownDescription: localize('terminal.integrated.fontLigatures.enabled', 'Controls whether font ligatures are enabled in the terminal. Ligatures will only work if the configured {0} supports them.', `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.fontLigatures.featureSettings" /* TerminalSettingId.FontLigaturesFeatureSettings */]: {
            markdownDescription: localize('terminal.integrated.fontLigatures.featureSettings', 'Controls what font feature settings are used when ligatures are enabled, in the format of the `font-feature-settings` CSS property. Some examples which may be valid depending on the font:') +
                '\n\n- ' +
                [`\`"calt" off, "ss03"\``, `\`"liga" on\``, `\`"calt" off, "dlig" on\``].join('\n- '),
            type: 'string',
            default: '"calt" on',
        },
        ["terminal.integrated.fontLigatures.fallbackLigatures" /* TerminalSettingId.FontLigaturesFallbackLigatures */]: {
            markdownDescription: localize('terminal.integrated.fontLigatures.fallbackLigatures', "When {0} is enabled and the particular {1} cannot be parsed, this is the set of character sequences that will always be drawn together. This allows the use of a fixed set of ligatures even when the font isn't supported.", `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
            type: 'array',
            items: [{ type: 'string' }],
            default: [
                '<--',
                '<---',
                '<<-',
                '<-',
                '->',
                '->>',
                '-->',
                '--->',
                '<==',
                '<===',
                '<<=',
                '<=',
                '=>',
                '=>>',
                '==>',
                '===>',
                '>=',
                '>>=',
                '<->',
                '<-->',
                '<--->',
                '<---->',
                '<=>',
                '<==>',
                '<===>',
                '<====>',
                '::',
                ':::',
                '<~~',
                '</',
                '</>',
                '/>',
                '~~>',
                '==',
                '!=',
                '/=',
                '~=',
                '<>',
                '===',
                '!==',
                '!===',
                '<:',
                ':=',
                '*=',
                '*+',
                '<*',
                '<*>',
                '*>',
                '<|',
                '<|>',
                '|>',
                '+*',
                '=*',
                '=:',
                ':>',
                '/*',
                '*/',
                '+++',
                '<!--',
                '<!---',
            ],
        },
        ["terminal.integrated.fontSize" /* TerminalSettingId.FontSize */]: {
            description: localize('terminal.integrated.fontSize', 'Controls the font size in pixels of the terminal.'),
            type: 'number',
            default: defaultTerminalFontSize,
            minimum: 6,
            maximum: 100,
        },
        ["terminal.integrated.letterSpacing" /* TerminalSettingId.LetterSpacing */]: {
            description: localize('terminal.integrated.letterSpacing', 'Controls the letter spacing of the terminal. This is an integer value which represents the number of additional pixels to add between characters.'),
            type: 'number',
            default: DEFAULT_LETTER_SPACING,
        },
        ["terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */]: {
            description: localize('terminal.integrated.lineHeight', 'Controls the line height of the terminal. This number is multiplied by the terminal font size to get the actual line-height in pixels.'),
            type: 'number',
            default: DEFAULT_LINE_HEIGHT,
        },
        ["terminal.integrated.minimumContrastRatio" /* TerminalSettingId.MinimumContrastRatio */]: {
            markdownDescription: localize('terminal.integrated.minimumContrastRatio', 'When set, the foreground color of each cell will change to try meet the contrast ratio specified. Note that this will not apply to `powerline` characters per #146406. Example values:\n\n- 1: Do nothing and use the standard theme colors.\n- 4.5: [WCAG AA compliance (minimum)](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html) (default).\n- 7: [WCAG AAA compliance (enhanced)](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast7.html).\n- 21: White on black or black on white.'),
            type: 'number',
            default: 4.5,
            tags: ['accessibility'],
        },
        ["terminal.integrated.tabStopWidth" /* TerminalSettingId.TabStopWidth */]: {
            markdownDescription: localize('terminal.integrated.tabStopWidth', 'The number of cells in a tab stop.'),
            type: 'number',
            minimum: 1,
            default: 8,
        },
        ["terminal.integrated.fastScrollSensitivity" /* TerminalSettingId.FastScrollSensitivity */]: {
            markdownDescription: localize('terminal.integrated.fastScrollSensitivity', 'Scrolling speed multiplier when pressing `Alt`.'),
            type: 'number',
            default: 5,
        },
        ["terminal.integrated.mouseWheelScrollSensitivity" /* TerminalSettingId.MouseWheelScrollSensitivity */]: {
            markdownDescription: localize('terminal.integrated.mouseWheelScrollSensitivity', 'A multiplier to be used on the `deltaY` of mouse wheel scroll events.'),
            type: 'number',
            default: 1,
        },
        ["terminal.integrated.bellDuration" /* TerminalSettingId.BellDuration */]: {
            markdownDescription: localize('terminal.integrated.bellDuration', 'The number of milliseconds to show the bell within a terminal tab when triggered.'),
            type: 'number',
            default: 1000,
        },
        ["terminal.integrated.fontWeight" /* TerminalSettingId.FontWeight */]: {
            anyOf: [
                {
                    type: 'number',
                    minimum: MINIMUM_FONT_WEIGHT,
                    maximum: MAXIMUM_FONT_WEIGHT,
                    errorMessage: localize('terminal.integrated.fontWeightError', 'Only "normal" and "bold" keywords or numbers between 1 and 1000 are allowed.'),
                },
                {
                    type: 'string',
                    pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$',
                },
                {
                    enum: SUGGESTIONS_FONT_WEIGHT,
                },
            ],
            description: localize('terminal.integrated.fontWeight', 'The font weight to use within the terminal for non-bold text. Accepts "normal" and "bold" keywords or numbers between 1 and 1000.'),
            default: 'normal',
        },
        ["terminal.integrated.fontWeightBold" /* TerminalSettingId.FontWeightBold */]: {
            anyOf: [
                {
                    type: 'number',
                    minimum: MINIMUM_FONT_WEIGHT,
                    maximum: MAXIMUM_FONT_WEIGHT,
                    errorMessage: localize('terminal.integrated.fontWeightError', 'Only "normal" and "bold" keywords or numbers between 1 and 1000 are allowed.'),
                },
                {
                    type: 'string',
                    pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$',
                },
                {
                    enum: SUGGESTIONS_FONT_WEIGHT,
                },
            ],
            description: localize('terminal.integrated.fontWeightBold', 'The font weight to use within the terminal for bold text. Accepts "normal" and "bold" keywords or numbers between 1 and 1000.'),
            default: 'bold',
        },
        ["terminal.integrated.cursorBlinking" /* TerminalSettingId.CursorBlinking */]: {
            description: localize('terminal.integrated.cursorBlinking', 'Controls whether the terminal cursor blinks.'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.cursorStyle" /* TerminalSettingId.CursorStyle */]: {
            description: localize('terminal.integrated.cursorStyle', 'Controls the style of terminal cursor when the terminal is focused.'),
            enum: ['block', 'line', 'underline'],
            default: 'block',
        },
        ["terminal.integrated.cursorStyleInactive" /* TerminalSettingId.CursorStyleInactive */]: {
            description: localize('terminal.integrated.cursorStyleInactive', 'Controls the style of terminal cursor when the terminal is not focused.'),
            enum: ['outline', 'block', 'line', 'underline', 'none'],
            default: 'outline',
        },
        ["terminal.integrated.cursorWidth" /* TerminalSettingId.CursorWidth */]: {
            markdownDescription: localize('terminal.integrated.cursorWidth', 'Controls the width of the cursor when {0} is set to {1}.', '`#terminal.integrated.cursorStyle#`', '`line`'),
            type: 'number',
            default: 1,
        },
        ["terminal.integrated.scrollback" /* TerminalSettingId.Scrollback */]: {
            description: localize('terminal.integrated.scrollback', 'Controls the maximum number of lines the terminal keeps in its buffer. We pre-allocate memory based on this value in order to ensure a smooth experience. As such, as the value increases, so will the amount of memory.'),
            type: 'number',
            default: 1000,
        },
        ["terminal.integrated.detectLocale" /* TerminalSettingId.DetectLocale */]: {
            markdownDescription: localize('terminal.integrated.detectLocale', "Controls whether to detect and set the `$LANG` environment variable to a UTF-8 compliant option since VS Code's terminal only supports UTF-8 encoded data coming from the shell."),
            type: 'string',
            enum: ['auto', 'off', 'on'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.detectLocale.auto', "Set the `$LANG` environment variable if the existing variable does not exist or it does not end in `'.UTF-8'`."),
                localize('terminal.integrated.detectLocale.off', 'Do not set the `$LANG` environment variable.'),
                localize('terminal.integrated.detectLocale.on', 'Always set the `$LANG` environment variable.'),
            ],
            default: 'auto',
        },
        ["terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */]: {
            type: 'string',
            enum: ['auto', 'on', 'off'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.gpuAcceleration.auto', 'Let VS Code detect which renderer will give the best experience.'),
                localize('terminal.integrated.gpuAcceleration.on', 'Enable GPU acceleration within the terminal.'),
                localize('terminal.integrated.gpuAcceleration.off', 'Disable GPU acceleration within the terminal. The terminal will render much slower when GPU acceleration is off but it should reliably work on all systems.'),
            ],
            default: 'auto',
            description: localize('terminal.integrated.gpuAcceleration', 'Controls whether the terminal will leverage the GPU to do its rendering.'),
        },
        ["terminal.integrated.tabs.separator" /* TerminalSettingId.TerminalTitleSeparator */]: {
            type: 'string',
            default: ' - ',
            markdownDescription: localize('terminal.integrated.tabs.separator', 'Separator used by {0} and {1}.', `\`#${"terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */}#\``, `\`#${"terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */}#\``),
        },
        ["terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */]: {
            type: 'string',
            default: '${process}',
            markdownDescription: terminalTitle,
        },
        ["terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */]: {
            type: 'string',
            default: '${task}${separator}${local}${separator}${cwdFolder}',
            markdownDescription: terminalDescription,
        },
        ["terminal.integrated.rightClickBehavior" /* TerminalSettingId.RightClickBehavior */]: {
            type: 'string',
            enum: ['default', 'copyPaste', 'paste', 'selectWord', 'nothing'],
            enumDescriptions: [
                localize('terminal.integrated.rightClickBehavior.default', 'Show the context menu.'),
                localize('terminal.integrated.rightClickBehavior.copyPaste', 'Copy when there is a selection, otherwise paste.'),
                localize('terminal.integrated.rightClickBehavior.paste', 'Paste on right click.'),
                localize('terminal.integrated.rightClickBehavior.selectWord', 'Select the word under the cursor and show the context menu.'),
                localize('terminal.integrated.rightClickBehavior.nothing', 'Do nothing and pass event to terminal.'),
            ],
            default: isMacintosh ? 'selectWord' : isWindows ? 'copyPaste' : 'default',
            description: localize('terminal.integrated.rightClickBehavior', 'Controls how terminal reacts to right click.'),
        },
        ["terminal.integrated.middleClickBehavior" /* TerminalSettingId.MiddleClickBehavior */]: {
            type: 'string',
            enum: ['default', 'paste'],
            enumDescriptions: [
                localize('terminal.integrated.middleClickBehavior.default', 'The platform default to focus the terminal. On Linux this will also paste the selection.'),
                localize('terminal.integrated.middleClickBehavior.paste', 'Paste on middle click.'),
            ],
            default: 'default',
            description: localize('terminal.integrated.middleClickBehavior', 'Controls how terminal reacts to middle click.'),
        },
        ["terminal.integrated.cwd" /* TerminalSettingId.Cwd */]: {
            restricted: true,
            description: localize('terminal.integrated.cwd', 'An explicit start path where the terminal will be launched, this is used as the current working directory (cwd) for the shell process. This may be particularly useful in workspace settings if the root directory is not a convenient cwd.'),
            type: 'string',
            default: undefined,
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        ["terminal.integrated.confirmOnExit" /* TerminalSettingId.ConfirmOnExit */]: {
            description: localize('terminal.integrated.confirmOnExit', 'Controls whether to confirm when the window closes if there are active terminal sessions. Background terminals like those launched by some extensions will not trigger the confirmation.'),
            type: 'string',
            enum: ['never', 'always', 'hasChildProcesses'],
            enumDescriptions: [
                localize('terminal.integrated.confirmOnExit.never', 'Never confirm.'),
                localize('terminal.integrated.confirmOnExit.always', 'Always confirm if there are terminals.'),
                localize('terminal.integrated.confirmOnExit.hasChildProcesses', 'Confirm if there are any terminals that have child processes.'),
            ],
            default: 'never',
        },
        ["terminal.integrated.confirmOnKill" /* TerminalSettingId.ConfirmOnKill */]: {
            description: localize('terminal.integrated.confirmOnKill', "Controls whether to confirm killing terminals when they have child processes. When set to editor, terminals in the editor area will be marked as changed when they have child processes. Note that child process detection may not work well for shells like Git Bash which don't run their processes as child processes of the shell. Background terminals like those launched by some extensions will not trigger the confirmation."),
            type: 'string',
            enum: ['never', 'editor', 'panel', 'always'],
            enumDescriptions: [
                localize('terminal.integrated.confirmOnKill.never', 'Never confirm.'),
                localize('terminal.integrated.confirmOnKill.editor', 'Confirm if the terminal is in the editor.'),
                localize('terminal.integrated.confirmOnKill.panel', 'Confirm if the terminal is in the panel.'),
                localize('terminal.integrated.confirmOnKill.always', 'Confirm if the terminal is either in the editor or panel.'),
            ],
            default: 'editor',
        },
        ["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */]: {
            markdownDeprecationMessage: localize('terminal.integrated.enableBell', 'This is now deprecated. Instead use the `terminal.integrated.enableVisualBell` and `accessibility.signals.terminalBell` settings.'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */]: {
            description: localize('terminal.integrated.enableVisualBell', "Controls whether the visual terminal bell is enabled. This shows up next to the terminal's name."),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.commandsToSkipShell" /* TerminalSettingId.CommandsToSkipShell */]: {
            markdownDescription: localize('terminal.integrated.commandsToSkipShell', "A set of command IDs whose keybindings will not be sent to the shell but instead always be handled by VS Code. This allows keybindings that would normally be consumed by the shell to act instead the same as when the terminal is not focused, for example `Ctrl+P` to launch Quick Open.\n\n&nbsp;\n\nMany commands are skipped by default. To override a default and pass that command's keybinding to the shell instead, add the command prefixed with the `-` character. For example add `-workbench.action.quickOpen` to allow `Ctrl+P` to reach the shell.\n\n&nbsp;\n\nThe following list of default skipped commands is truncated when viewed in Settings Editor. To see the full list, {1} and search for the first command from the list below.\n\n&nbsp;\n\nDefault Skipped Commands:\n\n{0}", DEFAULT_COMMANDS_TO_SKIP_SHELL.sort()
                .map((command) => `- ${command}`)
                .join('\n'), `[${localize('openDefaultSettingsJson', 'open the default settings JSON')}](command:workbench.action.openRawDefaultSettings '${localize('openDefaultSettingsJson.capitalized', 'Open Default Settings (JSON)')}')`),
            type: 'array',
            items: {
                type: 'string',
            },
            default: [],
        },
        ["terminal.integrated.allowChords" /* TerminalSettingId.AllowChords */]: {
            markdownDescription: localize('terminal.integrated.allowChords', 'Whether or not to allow chord keybindings in the terminal. Note that when this is true and the keystroke results in a chord it will bypass {0}, setting this to false is particularly useful when you want ctrl+k to go to your shell (not VS Code).', '`#terminal.integrated.commandsToSkipShell#`'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.allowMnemonics" /* TerminalSettingId.AllowMnemonics */]: {
            markdownDescription: localize('terminal.integrated.allowMnemonics', 'Whether to allow menubar mnemonics (for example Alt+F) to trigger the open of the menubar. Note that this will cause all alt keystrokes to skip the shell when true. This does nothing on macOS.'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.env.osx" /* TerminalSettingId.EnvMacOs */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.env.osx', 'Object with environment variables that will be added to the VS Code process to be used by the terminal on macOS. Set to `null` to delete the environment variable.'),
            type: 'object',
            additionalProperties: {
                type: ['string', 'null'],
            },
            default: {},
        },
        ["terminal.integrated.env.linux" /* TerminalSettingId.EnvLinux */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.env.linux', 'Object with environment variables that will be added to the VS Code process to be used by the terminal on Linux. Set to `null` to delete the environment variable.'),
            type: 'object',
            additionalProperties: {
                type: ['string', 'null'],
            },
            default: {},
        },
        ["terminal.integrated.env.windows" /* TerminalSettingId.EnvWindows */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.env.windows', 'Object with environment variables that will be added to the VS Code process to be used by the terminal on Windows. Set to `null` to delete the environment variable.'),
            type: 'object',
            additionalProperties: {
                type: ['string', 'null'],
            },
            default: {},
        },
        ["terminal.integrated.environmentChangesIndicator" /* TerminalSettingId.EnvironmentChangesIndicator */]: {
            markdownDescription: localize('terminal.integrated.environmentChangesIndicator', "Whether to display the environment changes indicator on each terminal which explains whether extensions have made, or want to make changes to the terminal's environment."),
            type: 'string',
            enum: ['off', 'on', 'warnonly'],
            enumDescriptions: [
                localize('terminal.integrated.environmentChangesIndicator.off', 'Disable the indicator.'),
                localize('terminal.integrated.environmentChangesIndicator.on', 'Enable the indicator.'),
                localize('terminal.integrated.environmentChangesIndicator.warnonly', "Only show the warning indicator when a terminal's environment is 'stale', not the information indicator that shows a terminal has had its environment modified by an extension."),
            ],
            default: 'warnonly',
        },
        ["terminal.integrated.environmentChangesRelaunch" /* TerminalSettingId.EnvironmentChangesRelaunch */]: {
            markdownDescription: localize('terminal.integrated.environmentChangesRelaunch', 'Whether to relaunch terminals automatically if extensions want to contribute to their environment and have not been interacted with yet.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.showExitAlert" /* TerminalSettingId.ShowExitAlert */]: {
            description: localize('terminal.integrated.showExitAlert', 'Controls whether to show the alert "The terminal process terminated with exit code" when exit code is non-zero.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */]: {
            markdownDescription: localize('terminal.integrated.windowsUseConptyDll', 'Whether to use the experimental conpty.dll (v1.22.250204002) shipped with VS Code, instead of the one bundled with Windows.'),
            type: 'boolean',
            tags: ['preview'],
            default: product.quality !== 'stable',
        },
        ["terminal.integrated.splitCwd" /* TerminalSettingId.SplitCwd */]: {
            description: localize('terminal.integrated.splitCwd', 'Controls the working directory a split terminal starts with.'),
            type: 'string',
            enum: ['workspaceRoot', 'initial', 'inherited'],
            enumDescriptions: [
                localize('terminal.integrated.splitCwd.workspaceRoot', 'A new split terminal will use the workspace root as the working directory. In a multi-root workspace a choice for which root folder to use is offered.'),
                localize('terminal.integrated.splitCwd.initial', 'A new split terminal will use the working directory that the parent terminal started with.'),
                localize('terminal.integrated.splitCwd.inherited', 'On macOS and Linux, a new split terminal will use the working directory of the parent terminal. On Windows, this behaves the same as initial.'),
            ],
            default: 'inherited',
        },
        ["terminal.integrated.windowsEnableConpty" /* TerminalSettingId.WindowsEnableConpty */]: {
            description: localize('terminal.integrated.windowsEnableConpty', 'Whether to use ConPTY for Windows terminal process communication (requires Windows 10 build number 18309+). Winpty will be used if this is false.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.wordSeparators" /* TerminalSettingId.WordSeparators */]: {
            markdownDescription: localize('terminal.integrated.wordSeparators', "A string containing all characters to be considered word separators when double-clicking to select word and in the fallback 'word' link detection. Since this is used for link detection, including characters such as `:` that are used when detecting links will cause the line and column part of links like `file:10:5` to be ignored."),
            type: 'string',
            // allow-any-unicode-next-line
            default: ' ()[]{}\',"`─‘’“”|',
        },
        ["terminal.integrated.enableFileLinks" /* TerminalSettingId.EnableFileLinks */]: {
            description: localize('terminal.integrated.enableFileLinks', 'Whether to enable file links in terminals. Links can be slow when working on a network drive in particular because each file link is verified against the file system. Changing this will take effect only in new terminals.'),
            type: 'string',
            enum: ['off', 'on', 'notRemote'],
            enumDescriptions: [
                localize('enableFileLinks.off', 'Always off.'),
                localize('enableFileLinks.on', 'Always on.'),
                localize('enableFileLinks.notRemote', 'Enable only when not in a remote workspace.'),
            ],
            default: 'on',
        },
        ["terminal.integrated.allowedLinkSchemes" /* TerminalSettingId.AllowedLinkSchemes */]: {
            description: localize('terminal.integrated.allowedLinkSchemes', 'An array of strings containing the URI schemes that the terminal is allowed to open links for. By default, only a small subset of possible schemes are allowed for security reasons.'),
            type: 'array',
            items: {
                type: 'string',
            },
            default: ['file', 'http', 'https', 'mailto', 'vscode', 'vscode-insiders'],
        },
        ["terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */]: {
            type: 'string',
            enum: ['6', '11'],
            enumDescriptions: [
                localize('terminal.integrated.unicodeVersion.six', 'Version 6 of Unicode. This is an older version which should work better on older systems.'),
                localize('terminal.integrated.unicodeVersion.eleven', 'Version 11 of Unicode. This version provides better support on modern systems that use modern versions of Unicode.'),
            ],
            default: '11',
            description: localize('terminal.integrated.unicodeVersion', 'Controls what version of Unicode to use when evaluating the width of characters in the terminal. If you experience emoji or other wide characters not taking up the right amount of space or backspace either deleting too much or too little then you may want to try tweaking this setting.'),
        },
        ["terminal.integrated.enablePersistentSessions" /* TerminalSettingId.EnablePersistentSessions */]: {
            description: localize('terminal.integrated.enablePersistentSessions', 'Persist terminal sessions/history for the workspace across window reloads.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.persistentSessionReviveProcess" /* TerminalSettingId.PersistentSessionReviveProcess */]: {
            markdownDescription: localize('terminal.integrated.persistentSessionReviveProcess', 'When the terminal process must be shut down (for example on window or application close), this determines when the previous terminal session contents/history should be restored and processes be recreated when the workspace is next opened.\n\nCaveats:\n\n- Restoring of the process current working directory depends on whether it is supported by the shell.\n- Time to persist the session during shutdown is limited, so it may be aborted when using high-latency remote connections.'),
            type: 'string',
            enum: ['onExit', 'onExitAndWindowClose', 'never'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.persistentSessionReviveProcess.onExit', 'Revive the processes after the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu).'),
                localize('terminal.integrated.persistentSessionReviveProcess.onExitAndWindowClose', 'Revive the processes after the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu), or when the window is closed.'),
                localize('terminal.integrated.persistentSessionReviveProcess.never', 'Never restore the terminal buffers or recreate the process.'),
            ],
            default: 'onExit',
        },
        ["terminal.integrated.hideOnStartup" /* TerminalSettingId.HideOnStartup */]: {
            description: localize('terminal.integrated.hideOnStartup', 'Whether to hide the terminal view on startup, avoiding creating a terminal when there are no persistent sessions.'),
            type: 'string',
            enum: ['never', 'whenEmpty', 'always'],
            markdownEnumDescriptions: [
                localize('hideOnStartup.never', 'Never hide the terminal view on startup.'),
                localize('hideOnStartup.whenEmpty', 'Only hide the terminal when there are no persistent sessions restored.'),
                localize('hideOnStartup.always', 'Always hide the terminal, even when there are persistent sessions restored.'),
            ],
            default: 'never',
        },
        ["terminal.integrated.hideOnLastClosed" /* TerminalSettingId.HideOnLastClosed */]: {
            description: localize('terminal.integrated.hideOnLastClosed', 'Whether to hide the terminal view when the last terminal is closed. This will only happen when the terminal is the only visible view in the view container.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.customGlyphs" /* TerminalSettingId.CustomGlyphs */]: {
            markdownDescription: localize('terminal.integrated.customGlyphs', "Whether to draw custom glyphs for block element and box drawing characters instead of using the font, which typically yields better rendering with continuous lines. Note that this doesn't work when {0} is disabled.", `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.rescaleOverlappingGlyphs" /* TerminalSettingId.RescaleOverlappingGlyphs */]: {
            markdownDescription: localize('terminal.integrated.rescaleOverlappingGlyphs', "Whether to rescale glyphs horizontally that are a single cell wide but have glyphs that would overlap following cell(s). This typically happens for ambiguous width characters (eg. the roman numeral characters U+2160+) which aren't featured in monospace fonts. Emoji glyphs are never rescaled."),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.shellIntegration.enabled', 'Determines whether or not shell integration is auto-injected to support features like enhanced command tracking and current working directory detection. \n\nShell integration works by injecting the shell with a startup script. The script gives VS Code insight into what is happening within the terminal.\n\nSupported shells:\n\n- Linux/macOS: bash, fish, pwsh, zsh\n - Windows: pwsh, git bash\n\nThis setting applies only when terminals are created, so you will need to restart your terminals for it to take effect.\n\n Note that the script injection may not work if you have custom arguments defined in the terminal profile, have enabled {1}, have a [complex bash `PROMPT_COMMAND`](https://code.visualstudio.com/docs/editor/integrated-terminal#_complex-bash-promptcommand), or other unsupported setup. To disable decorations, see {0}', '`#terminal.integrated.shellIntegration.decorationsEnabled#`', '`#editor.accessibilitySupport#`'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.shellIntegration.decorationsEnabled', 'When shell integration is enabled, adds a decoration for each command.'),
            type: 'string',
            enum: ['both', 'gutter', 'overviewRuler', 'never'],
            enumDescriptions: [
                localize('terminal.integrated.shellIntegration.decorationsEnabled.both', 'Show decorations in the gutter (left) and overview ruler (right)'),
                localize('terminal.integrated.shellIntegration.decorationsEnabled.gutter', 'Show gutter decorations to the left of the terminal'),
                localize('terminal.integrated.shellIntegration.decorationsEnabled.overviewRuler', 'Show overview ruler decorations to the right of the terminal'),
                localize('terminal.integrated.shellIntegration.decorationsEnabled.never', 'Do not show decorations'),
            ],
            default: 'both',
        },
        ["terminal.integrated.shellIntegration.environmentReporting" /* TerminalSettingId.ShellIntegrationEnvironmentReporting */]: {
            markdownDescription: localize('terminal.integrated.shellIntegration.environmentReporting', "Controls whether to report the shell environment, enabling its use in features such as {0}. This may cause a slowdown when printing your shell's prompt.", `\`#${"terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */}#\``),
            type: 'boolean',
            default: product.quality !== 'stable',
        },
        ["terminal.integrated.smoothScrolling" /* TerminalSettingId.SmoothScrolling */]: {
            markdownDescription: localize('terminal.integrated.smoothScrolling', 'Controls whether the terminal will scroll using an animation.'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.ignoreBracketedPasteMode" /* TerminalSettingId.IgnoreBracketedPasteMode */]: {
            markdownDescription: localize('terminal.integrated.ignoreBracketedPasteMode', 'Controls whether the terminal will ignore bracketed paste mode even if the terminal was put into the mode, omitting the {0} and {1} sequences when pasting. This is useful when the shell is not respecting the mode which can happen in sub-shells for example.', '`\\x1b[200~`', '`\\x1b[201~`'),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.enableImages" /* TerminalSettingId.EnableImages */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.enableImages', "Enables image support in the terminal, this will only work when {0} is enabled. Both sixel and iTerm's inline image protocol are supported on Linux and macOS. This will only work on Windows for versions of ConPTY >= v2 which is shipped with Windows itself, see also {1}. Images will currently not be restored between window reloads/reconnects.", `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */}#\``),
            type: 'boolean',
            default: false,
        },
        ["terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */]: {
            markdownDescription: localize('terminal.integrated.focusAfterRun', 'Controls whether the terminal, accessible buffer, or neither will be focused after `Terminal: Run Selected Text In Active Terminal` has been run.'),
            enum: ['terminal', 'accessible-buffer', 'none'],
            default: 'none',
            tags: ['accessibility'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.focusAfterRun.terminal', 'Always focus the terminal.'),
                localize('terminal.integrated.focusAfterRun.accessible-buffer', 'Always focus the accessible buffer.'),
                localize('terminal.integrated.focusAfterRun.none', 'Do nothing.'),
            ],
        },
        ...terminalContribConfiguration,
    },
};
export async function registerTerminalConfiguration(getFontSnippets) {
    const configurationRegistry = Registry.as(Extensions.Configuration);
    configurationRegistry.registerConfiguration(terminalConfiguration);
    const fontsSnippets = await getFontSnippets();
    if (terminalConfiguration.properties) {
        terminalConfiguration.properties["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */].defaultSnippets = fontsSnippets;
    }
}
Registry.as(WorkbenchExtensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: "terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */,
        migrateFn: (enableBell, accessor) => {
            const configurationKeyValuePairs = [];
            let announcement = accessor('accessibility.signals.terminalBell')?.announcement ??
                accessor('accessibility.alert.terminalBell');
            if (announcement !== undefined && typeof announcement !== 'string') {
                announcement = announcement ? 'auto' : 'off';
            }
            configurationKeyValuePairs.push([
                'accessibility.signals.terminalBell',
                { value: { sound: enableBell ? 'on' : 'off', announcement } },
            ]);
            configurationKeyValuePairs.push(["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */, { value: undefined }]);
            configurationKeyValuePairs.push(["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */, { value: enableBell }]);
            return configurationKeyValuePairs;
        },
    },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLFVBQVUsR0FHVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUszRSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGtCQUFrQixHQUNsQixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUNOLDRCQUE0QixHQUU1QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsc0JBQXNCLEVBQ3RCLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLHVCQUF1QixHQUN2QixNQUFNLGVBQWUsQ0FBQTtBQUV0QixNQUFNLG1CQUFtQixHQUN4QixNQUFNO0lBQ047UUFDQyxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSwyQ0FBMkMsQ0FBQztRQUM1RSxtQkFBbUI7WUFDbEIsUUFBUSxDQUNQLFdBQVcsRUFDWCxtUEFBbVAsQ0FDblA7UUFDRix5QkFBeUI7WUFDeEIsUUFBUSxDQUFDLGlCQUFpQixFQUFFLG1EQUFtRCxDQUFDO1FBQ2pGLDZCQUE2QjtZQUM1QixRQUFRLENBQ1AscUJBQXFCLEVBQ3JCLGlFQUFpRSxDQUNqRTtRQUNGLGVBQWUsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLG1EQUFtRCxDQUFDO1FBQ3hGLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsbUNBQW1DLENBQUM7UUFDNUUsa0JBQWtCO1lBQ2pCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsMkRBQTJELENBQUM7UUFDbEYsbUJBQW1CO1lBQ2xCLFFBQVEsQ0FDUCxXQUFXLEVBQ1gsMkdBQTJHLEVBQzNHLFNBQVMsQ0FDVDtRQUNGLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsbURBQW1ELENBQUM7UUFDOUYsY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsb0RBQW9ELENBQUM7UUFDdkYsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSwwQkFBMEIsQ0FBQztRQUN2RSxzQkFBc0I7WUFDckIsUUFBUSxDQUNQLGNBQWMsRUFDZCwyS0FBMkssQ0FDM0s7UUFDRiwwQkFBMEI7WUFDekIsUUFBUSxDQUFDLGtCQUFrQixFQUFFLCtEQUErRCxDQUFDO0tBQzlGLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBLENBQUMsdUZBQXVGO0FBRXZHLElBQUksYUFBYSxHQUFHLFFBQVEsQ0FDM0IsZUFBZSxFQUNmLDhFQUE4RSxDQUM5RSxDQUFBO0FBQ0QsYUFBYSxJQUFJLG1CQUFtQixDQUFBO0FBRXBDLElBQUksbUJBQW1CLEdBQUcsUUFBUSxDQUNqQyxxQkFBcUIsRUFDckIsNkhBQTZILENBQzdILENBQUE7QUFDRCxtQkFBbUIsSUFBSSxtQkFBbUIsQ0FBQTtBQUUxQyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO0FBRTVELE1BQU0scUJBQXFCLEdBQXVCO0lBQ2pELEVBQUUsRUFBRSxVQUFVO0lBQ2QsS0FBSyxFQUFFLEdBQUc7SUFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLHFCQUFxQixDQUFDO0lBQzlFLElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsNkZBQTBDLEVBQUU7WUFDM0MsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qiw0Q0FBNEMsRUFDNUMsd0lBQXdJLEVBQ3hJLDZDQUE2QyxDQUM3QztZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELGtGQUFvQyxFQUFFO1lBQ3JDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHVDQUF1QyxFQUN2QywrREFBK0QsQ0FDL0Q7WUFDRCxHQUFHLG1CQUFtQjtZQUN0QixLQUFLLHFDQUE2QjtTQUNsQztRQUNELGdGQUFtQyxFQUFFO1lBQ3BDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHNDQUFzQyxFQUN0QywyREFBMkQsQ0FDM0Q7WUFDRCxHQUFHLGtCQUFrQjtZQUNyQixPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzVCLEtBQUsscUNBQTZCO1NBQ2xDO1FBQ0Qsd0VBQStCLEVBQUU7WUFDaEMsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsa0NBQWtDLEVBQ2xDLHNJQUFzSSxDQUN0STtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELHdGQUF1QyxFQUFFO1lBQ3hDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDBDQUEwQyxFQUMxQyxtRkFBbUYsQ0FDbkY7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxvRkFBcUMsRUFBRTtZQUN0QyxXQUFXLEVBQUUsUUFBUSxDQUNwQix3Q0FBd0MsRUFDeEMsNkVBQTZFLENBQzdFO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDO1lBQ2hELGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQ1AsOENBQThDLEVBQzlDLG1DQUFtQyxDQUNuQztnQkFDRCxRQUFRLENBQ1AsdURBQXVELEVBQ3ZELHlFQUF5RSxDQUN6RTtnQkFDRCxRQUFRLENBQ1Asb0RBQW9ELEVBQ3BELCtFQUErRSxDQUMvRTthQUNEO1lBQ0QsT0FBTyxFQUFFLGdCQUFnQjtTQUN6QjtRQUNELDhGQUEwQyxFQUFFO1lBQzNDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDZDQUE2QyxFQUM3QywrSEFBK0gsQ0FDL0g7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSx3QkFBd0IsRUFBRSxPQUFPLENBQUM7WUFDckUsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FDUCxvREFBb0QsRUFDcEQsaUNBQWlDLENBQ2pDO2dCQUNELFFBQVEsQ0FDUCw0REFBNEQsRUFDNUQsOERBQThELENBQzlEO2dCQUNELFFBQVEsQ0FDUCxvRUFBb0UsRUFDcEUsb0hBQW9ILENBQ3BIO2dCQUNELFFBQVEsQ0FDUCxtREFBbUQsRUFDbkQsZ0NBQWdDLENBQ2hDO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsd0JBQXdCO1NBQ2pDO1FBQ0QsZ0ZBQW1DLEVBQUU7WUFDcEMsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsc0NBQXNDLEVBQ3RDLGdHQUFnRyxDQUNoRztZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFFLHdCQUF3QixFQUFFLE9BQU8sQ0FBQztZQUNyRSxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUFDLDZDQUE2QyxFQUFFLHlCQUF5QixDQUFDO2dCQUNsRixRQUFRLENBQ1AscURBQXFELEVBQ3JELHNEQUFzRCxDQUN0RDtnQkFDRCxRQUFRLENBQ1AsNkRBQTZELEVBQzdELDRHQUE0RyxDQUM1RztnQkFDRCxRQUFRLENBQUMsNENBQTRDLEVBQUUsd0JBQXdCLENBQUM7YUFDaEY7WUFDRCxPQUFPLEVBQUUsd0JBQXdCO1NBQ2pDO1FBQ0QsMEVBQWdDLEVBQUU7WUFDakMsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO1lBQ3ZCLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQ1Asd0NBQXdDLEVBQ3hDLHlEQUF5RCxDQUN6RDtnQkFDRCxRQUFRLENBQ1AseUNBQXlDLEVBQ3pDLDBEQUEwRCxDQUMxRDthQUNEO1lBQ0QsT0FBTyxFQUFFLE9BQU87WUFDaEIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsbUNBQW1DLEVBQ25DLG9HQUFvRyxDQUNwRztTQUNEO1FBQ0QsK0VBQW1DLEVBQUU7WUFDcEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsZ0dBQW9FO1lBQzFFLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsNENBQTRDLEVBQUUsZ0NBQWdDLENBQUM7Z0JBQ3hGLFFBQVEsQ0FDUCwwQ0FBMEMsRUFDMUMsdUNBQXVDLENBQ3ZDO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsTUFBTTtZQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHFDQUFxQyxFQUNyQyxxREFBcUQsQ0FDckQ7U0FDRDtRQUNELDRFQUFpQyxFQUFFO1lBQ2xDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztZQUNwQyxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUNQLGdEQUFnRCxFQUNoRCxpREFBaUQsQ0FDakQ7Z0JBQ0QsUUFBUSxDQUNQLGdEQUFnRCxFQUNoRCx3REFBd0QsQ0FDeEQ7YUFDRDtZQUNELE9BQU8sRUFBRSxhQUFhO1lBQ3RCLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG9DQUFvQyxFQUNwQyxvRkFBb0YsQ0FDcEY7U0FDRDtRQUNELCtFQUFtQyxFQUFFO1lBQ3BDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHFDQUFxQyxFQUNyQyxvRkFBb0YsQ0FDcEY7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCwyR0FBaUQsRUFBRTtZQUNsRCxXQUFXLEVBQUUsUUFBUSxDQUNwQixtREFBbUQsRUFDbkQseVJBQXlSLENBQ3pSO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsdUZBQXVDLEVBQUU7WUFDeEMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix5Q0FBeUMsRUFDekMsMExBQTBMLEVBQzFMLGdDQUFnQyxFQUNoQyxTQUFTLENBQ1Q7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCwrRUFBbUMsRUFBRTtZQUNwQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixxQ0FBcUMsRUFDckMsaUZBQWlGLENBQ2pGO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsdUdBQStDLEVBQUU7WUFDaEQsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixpREFBaUQsRUFDakQsMEZBQTBGLENBQzFGO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQztZQUNqQyx3QkFBd0IsRUFBRTtnQkFDekIsUUFBUSxDQUNQLHNEQUFzRCxFQUN0RCx1TUFBdU0sQ0FDdk07Z0JBQ0QsUUFBUSxDQUNQLHdEQUF3RCxFQUN4RCwwREFBMEQsQ0FDMUQ7Z0JBQ0QsUUFBUSxDQUNQLHVEQUF1RCxFQUN2RCx5QkFBeUIsQ0FDekI7YUFDRDtZQUNELE9BQU8sRUFBRSxNQUFNO1NBQ2Y7UUFDRCxxR0FBOEMsRUFBRTtZQUMvQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixnREFBZ0QsRUFDaEQsNkZBQTZGLENBQzdGO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0QscUVBQThCLEVBQUU7WUFDL0IsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixnQ0FBZ0MsRUFDaEMsb0VBQW9FLEVBQ3BFLHVCQUF1QixDQUN2QjtZQUNELElBQUksRUFBRSxRQUFRO1NBQ2Q7UUFDRCwwRkFBd0MsRUFBRTtZQUN6QyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLDJDQUEyQyxFQUMzQyw0SEFBNEgsRUFDNUgsTUFBTSxtRUFBNEIsS0FBSyxDQUN2QztZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELDBHQUFnRCxFQUFFO1lBQ2pELG1CQUFtQixFQUNsQixRQUFRLENBQ1AsbURBQW1ELEVBQ25ELDZMQUE2TCxDQUM3TDtnQkFDRCxRQUFRO2dCQUNSLENBQUMsd0JBQXdCLEVBQUUsZUFBZSxFQUFFLDJCQUEyQixDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUN0RixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxXQUFXO1NBQ3BCO1FBQ0QsOEdBQWtELEVBQUU7WUFDbkQsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixxREFBcUQsRUFDckQsNk5BQTZOLEVBQzdOLE1BQU0sNkVBQWlDLEtBQUssRUFDNUMsTUFBTSxtRUFBNEIsS0FBSyxDQUN2QztZQUNELElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDM0IsT0FBTyxFQUFFO2dCQUNSLEtBQUs7Z0JBQ0wsTUFBTTtnQkFDTixLQUFLO2dCQUNMLElBQUk7Z0JBQ0osSUFBSTtnQkFDSixLQUFLO2dCQUNMLEtBQUs7Z0JBQ0wsTUFBTTtnQkFDTixLQUFLO2dCQUNMLE1BQU07Z0JBQ04sS0FBSztnQkFDTCxJQUFJO2dCQUNKLElBQUk7Z0JBQ0osS0FBSztnQkFDTCxLQUFLO2dCQUNMLE1BQU07Z0JBQ04sSUFBSTtnQkFDSixLQUFLO2dCQUNMLEtBQUs7Z0JBQ0wsTUFBTTtnQkFDTixPQUFPO2dCQUNQLFFBQVE7Z0JBQ1IsS0FBSztnQkFDTCxNQUFNO2dCQUNOLE9BQU87Z0JBQ1AsUUFBUTtnQkFDUixJQUFJO2dCQUNKLEtBQUs7Z0JBQ0wsS0FBSztnQkFDTCxJQUFJO2dCQUNKLEtBQUs7Z0JBQ0wsSUFBSTtnQkFDSixLQUFLO2dCQUNMLElBQUk7Z0JBQ0osSUFBSTtnQkFDSixJQUFJO2dCQUNKLElBQUk7Z0JBQ0osSUFBSTtnQkFDSixLQUFLO2dCQUNMLEtBQUs7Z0JBQ0wsTUFBTTtnQkFDTixJQUFJO2dCQUNKLElBQUk7Z0JBQ0osSUFBSTtnQkFDSixJQUFJO2dCQUNKLElBQUk7Z0JBQ0osS0FBSztnQkFDTCxJQUFJO2dCQUNKLElBQUk7Z0JBQ0osS0FBSztnQkFDTCxJQUFJO2dCQUNKLElBQUk7Z0JBQ0osSUFBSTtnQkFDSixJQUFJO2dCQUNKLElBQUk7Z0JBQ0osSUFBSTtnQkFDSixJQUFJO2dCQUNKLEtBQUs7Z0JBQ0wsTUFBTTtnQkFDTixPQUFPO2FBQ1A7U0FDRDtRQUNELGlFQUE0QixFQUFFO1lBQzdCLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDhCQUE4QixFQUM5QixtREFBbUQsQ0FDbkQ7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSx1QkFBdUI7WUFDaEMsT0FBTyxFQUFFLENBQUM7WUFDVixPQUFPLEVBQUUsR0FBRztTQUNaO1FBQ0QsMkVBQWlDLEVBQUU7WUFDbEMsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsbUNBQW1DLEVBQ25DLG1KQUFtSixDQUNuSjtZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLHNCQUFzQjtTQUMvQjtRQUNELHFFQUE4QixFQUFFO1lBQy9CLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGdDQUFnQyxFQUNoQyx3SUFBd0ksQ0FDeEk7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxtQkFBbUI7U0FDNUI7UUFDRCx5RkFBd0MsRUFBRTtZQUN6QyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLDBDQUEwQyxFQUMxQyx5Z0JBQXlnQixDQUN6Z0I7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxHQUFHO1lBQ1osSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDO1NBQ3ZCO1FBQ0QseUVBQWdDLEVBQUU7WUFDakMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixrQ0FBa0MsRUFDbEMsb0NBQW9DLENBQ3BDO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQztZQUNWLE9BQU8sRUFBRSxDQUFDO1NBQ1Y7UUFDRCwyRkFBeUMsRUFBRTtZQUMxQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLDJDQUEyQyxFQUMzQyxpREFBaUQsQ0FDakQ7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1NBQ1Y7UUFDRCx1R0FBK0MsRUFBRTtZQUNoRCxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGlEQUFpRCxFQUNqRCx1RUFBdUUsQ0FDdkU7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1NBQ1Y7UUFDRCx5RUFBZ0MsRUFBRTtZQUNqQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGtDQUFrQyxFQUNsQyxtRkFBbUYsQ0FDbkY7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxxRUFBOEIsRUFBRTtZQUMvQixLQUFLLEVBQUU7Z0JBQ047b0JBQ0MsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLG1CQUFtQjtvQkFDNUIsT0FBTyxFQUFFLG1CQUFtQjtvQkFDNUIsWUFBWSxFQUFFLFFBQVEsQ0FDckIscUNBQXFDLEVBQ3JDLDhFQUE4RSxDQUM5RTtpQkFDRDtnQkFDRDtvQkFDQyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsc0NBQXNDO2lCQUMvQztnQkFDRDtvQkFDQyxJQUFJLEVBQUUsdUJBQXVCO2lCQUM3QjthQUNEO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsZ0NBQWdDLEVBQ2hDLG1JQUFtSSxDQUNuSTtZQUNELE9BQU8sRUFBRSxRQUFRO1NBQ2pCO1FBQ0QsNkVBQWtDLEVBQUU7WUFDbkMsS0FBSyxFQUFFO2dCQUNOO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxtQkFBbUI7b0JBQzVCLE9BQU8sRUFBRSxtQkFBbUI7b0JBQzVCLFlBQVksRUFBRSxRQUFRLENBQ3JCLHFDQUFxQyxFQUNyQyw4RUFBOEUsQ0FDOUU7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLHNDQUFzQztpQkFDL0M7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFLHVCQUF1QjtpQkFDN0I7YUFDRDtZQUNELFdBQVcsRUFBRSxRQUFRLENBQ3BCLG9DQUFvQyxFQUNwQywrSEFBK0gsQ0FDL0g7WUFDRCxPQUFPLEVBQUUsTUFBTTtTQUNmO1FBQ0QsNkVBQWtDLEVBQUU7WUFDbkMsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsb0NBQW9DLEVBQ3BDLDhDQUE4QyxDQUM5QztZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELHVFQUErQixFQUFFO1lBQ2hDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGlDQUFpQyxFQUNqQyxxRUFBcUUsQ0FDckU7WUFDRCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQztZQUNwQyxPQUFPLEVBQUUsT0FBTztTQUNoQjtRQUNELHVGQUF1QyxFQUFFO1lBQ3hDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHlDQUF5QyxFQUN6Qyx5RUFBeUUsQ0FDekU7WUFDRCxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDO1lBQ3ZELE9BQU8sRUFBRSxTQUFTO1NBQ2xCO1FBQ0QsdUVBQStCLEVBQUU7WUFDaEMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixpQ0FBaUMsRUFDakMsMERBQTBELEVBQzFELHFDQUFxQyxFQUNyQyxRQUFRLENBQ1I7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1NBQ1Y7UUFDRCxxRUFBOEIsRUFBRTtZQUMvQixXQUFXLEVBQUUsUUFBUSxDQUNwQixnQ0FBZ0MsRUFDaEMsME5BQTBOLENBQzFOO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0QseUVBQWdDLEVBQUU7WUFDakMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixrQ0FBa0MsRUFDbEMsa0xBQWtMLENBQ2xMO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQztZQUMzQix3QkFBd0IsRUFBRTtnQkFDekIsUUFBUSxDQUNQLHVDQUF1QyxFQUN2QyxnSEFBZ0gsQ0FDaEg7Z0JBQ0QsUUFBUSxDQUNQLHNDQUFzQyxFQUN0Qyw4Q0FBOEMsQ0FDOUM7Z0JBQ0QsUUFBUSxDQUNQLHFDQUFxQyxFQUNyQyw4Q0FBOEMsQ0FDOUM7YUFDRDtZQUNELE9BQU8sRUFBRSxNQUFNO1NBQ2Y7UUFDRCwrRUFBbUMsRUFBRTtZQUNwQyxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDO1lBQzNCLHdCQUF3QixFQUFFO2dCQUN6QixRQUFRLENBQ1AsMENBQTBDLEVBQzFDLGtFQUFrRSxDQUNsRTtnQkFDRCxRQUFRLENBQ1Asd0NBQXdDLEVBQ3hDLDhDQUE4QyxDQUM5QztnQkFDRCxRQUFRLENBQ1AseUNBQXlDLEVBQ3pDLDZKQUE2SixDQUM3SjthQUNEO1lBQ0QsT0FBTyxFQUFFLE1BQU07WUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixxQ0FBcUMsRUFDckMsMEVBQTBFLENBQzFFO1NBQ0Q7UUFDRCxxRkFBMEMsRUFBRTtZQUMzQyxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxLQUFLO1lBQ2QsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixvQ0FBb0MsRUFDcEMsZ0NBQWdDLEVBQ2hDLE1BQU0sc0VBQStCLEtBQUssRUFDMUMsTUFBTSxrRkFBcUMsS0FBSyxDQUNoRDtTQUNEO1FBQ0Qsd0VBQWlDLEVBQUU7WUFDbEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsWUFBWTtZQUNyQixtQkFBbUIsRUFBRSxhQUFhO1NBQ2xDO1FBQ0Qsb0ZBQXVDLEVBQUU7WUFDeEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUscURBQXFEO1lBQzlELG1CQUFtQixFQUFFLG1CQUFtQjtTQUN4QztRQUNELHFGQUFzQyxFQUFFO1lBQ3ZDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFNBQVMsQ0FBQztZQUNoRSxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUFDLGdEQUFnRCxFQUFFLHdCQUF3QixDQUFDO2dCQUNwRixRQUFRLENBQ1Asa0RBQWtELEVBQ2xELGtEQUFrRCxDQUNsRDtnQkFDRCxRQUFRLENBQUMsOENBQThDLEVBQUUsdUJBQXVCLENBQUM7Z0JBQ2pGLFFBQVEsQ0FDUCxtREFBbUQsRUFDbkQsNkRBQTZELENBQzdEO2dCQUNELFFBQVEsQ0FDUCxnREFBZ0QsRUFDaEQsd0NBQXdDLENBQ3hDO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3pFLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHdDQUF3QyxFQUN4Qyw4Q0FBOEMsQ0FDOUM7U0FDRDtRQUNELHVGQUF1QyxFQUFFO1lBQ3hDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQztZQUMxQixnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUNQLGlEQUFpRCxFQUNqRCwwRkFBMEYsQ0FDMUY7Z0JBQ0QsUUFBUSxDQUFDLCtDQUErQyxFQUFFLHdCQUF3QixDQUFDO2FBQ25GO1lBQ0QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIseUNBQXlDLEVBQ3pDLCtDQUErQyxDQUMvQztTQUNEO1FBQ0QsdURBQXVCLEVBQUU7WUFDeEIsVUFBVSxFQUFFLElBQUk7WUFDaEIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIseUJBQXlCLEVBQ3pCLDZPQUE2TyxDQUM3TztZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsS0FBSyxxQ0FBNkI7U0FDbEM7UUFDRCwyRUFBaUMsRUFBRTtZQUNsQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixtQ0FBbUMsRUFDbkMsMExBQTBMLENBQzFMO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixDQUFDO1lBQzlDLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMseUNBQXlDLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ3JFLFFBQVEsQ0FDUCwwQ0FBMEMsRUFDMUMsd0NBQXdDLENBQ3hDO2dCQUNELFFBQVEsQ0FDUCxxREFBcUQsRUFDckQsK0RBQStELENBQy9EO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsT0FBTztTQUNoQjtRQUNELDJFQUFpQyxFQUFFO1lBQ2xDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG1DQUFtQyxFQUNuQyx1YUFBdWEsQ0FDdmE7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQztZQUM1QyxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLGdCQUFnQixDQUFDO2dCQUNyRSxRQUFRLENBQ1AsMENBQTBDLEVBQzFDLDJDQUEyQyxDQUMzQztnQkFDRCxRQUFRLENBQ1AseUNBQXlDLEVBQ3pDLDBDQUEwQyxDQUMxQztnQkFDRCxRQUFRLENBQ1AsMENBQTBDLEVBQzFDLDJEQUEyRCxDQUMzRDthQUNEO1lBQ0QsT0FBTyxFQUFFLFFBQVE7U0FDakI7UUFDRCxxRUFBOEIsRUFBRTtZQUMvQiwwQkFBMEIsRUFBRSxRQUFRLENBQ25DLGdDQUFnQyxFQUNoQyxtSUFBbUksQ0FDbkk7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxpRkFBb0MsRUFBRTtZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixzQ0FBc0MsRUFDdEMsa0dBQWtHLENBQ2xHO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsdUZBQXVDLEVBQUU7WUFDeEMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix5Q0FBeUMsRUFDekMsMndCQUEyd0IsRUFDM3dCLDhCQUE4QixDQUFDLElBQUksRUFBRTtpQkFDbkMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxLQUFLLE9BQU8sRUFBRSxDQUFDO2lCQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ1osSUFBSSxRQUFRLENBQUMseUJBQXlCLEVBQUUsZ0NBQWdDLENBQUMsc0RBQXNELFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSw4QkFBOEIsQ0FBQyxJQUFJLENBQ2xOO1lBQ0QsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFFBQVE7YUFDZDtZQUNELE9BQU8sRUFBRSxFQUFFO1NBQ1g7UUFDRCx1RUFBK0IsRUFBRTtZQUNoQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGlDQUFpQyxFQUNqQyxzUEFBc1AsRUFDdFAsNkNBQTZDLENBQzdDO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0QsNkVBQWtDLEVBQUU7WUFDbkMsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixvQ0FBb0MsRUFDcEMsa01BQWtNLENBQ2xNO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsZ0VBQTRCLEVBQUU7WUFDN0IsVUFBVSxFQUFFLElBQUk7WUFDaEIsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qiw2QkFBNkIsRUFDN0Isb0tBQW9LLENBQ3BLO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQzthQUN4QjtZQUNELE9BQU8sRUFBRSxFQUFFO1NBQ1g7UUFDRCxrRUFBNEIsRUFBRTtZQUM3QixVQUFVLEVBQUUsSUFBSTtZQUNoQixtQkFBbUIsRUFBRSxRQUFRLENBQzVCLCtCQUErQixFQUMvQixvS0FBb0ssQ0FDcEs7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO2FBQ3hCO1lBQ0QsT0FBTyxFQUFFLEVBQUU7U0FDWDtRQUNELHNFQUE4QixFQUFFO1lBQy9CLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsaUNBQWlDLEVBQ2pDLHNLQUFzSyxDQUN0SztZQUNELElBQUksRUFBRSxRQUFRO1lBQ2Qsb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7YUFDeEI7WUFDRCxPQUFPLEVBQUUsRUFBRTtTQUNYO1FBQ0QsdUdBQStDLEVBQUU7WUFDaEQsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixpREFBaUQsRUFDakQsMktBQTJLLENBQzNLO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQztZQUMvQixnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUFDLHFEQUFxRCxFQUFFLHdCQUF3QixDQUFDO2dCQUN6RixRQUFRLENBQUMsb0RBQW9ELEVBQUUsdUJBQXVCLENBQUM7Z0JBQ3ZGLFFBQVEsQ0FDUCwwREFBMEQsRUFDMUQsaUxBQWlMLENBQ2pMO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsVUFBVTtTQUNuQjtRQUNELHFHQUE4QyxFQUFFO1lBQy9DLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsZ0RBQWdELEVBQ2hELDBJQUEwSSxDQUMxSTtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELDJFQUFpQyxFQUFFO1lBQ2xDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG1DQUFtQyxFQUNuQyxpSEFBaUgsQ0FDakg7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCx1RkFBdUMsRUFBRTtZQUN4QyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLHlDQUF5QyxFQUN6Qyw2SEFBNkgsQ0FDN0g7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztZQUNqQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU8sS0FBSyxRQUFRO1NBQ3JDO1FBQ0QsaUVBQTRCLEVBQUU7WUFDN0IsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsOEJBQThCLEVBQzlCLDhEQUE4RCxDQUM5RDtZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUM7WUFDL0MsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FDUCw0Q0FBNEMsRUFDNUMsd0pBQXdKLENBQ3hKO2dCQUNELFFBQVEsQ0FDUCxzQ0FBc0MsRUFDdEMsNEZBQTRGLENBQzVGO2dCQUNELFFBQVEsQ0FDUCx3Q0FBd0MsRUFDeEMsK0lBQStJLENBQy9JO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsV0FBVztTQUNwQjtRQUNELHVGQUF1QyxFQUFFO1lBQ3hDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHlDQUF5QyxFQUN6QyxtSkFBbUosQ0FDbko7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCw2RUFBa0MsRUFBRTtZQUNuQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLG9DQUFvQyxFQUNwQyw0VUFBNFUsQ0FDNVU7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLDhCQUE4QjtZQUM5QixPQUFPLEVBQUUsb0JBQW9CO1NBQzdCO1FBQ0QsK0VBQW1DLEVBQUU7WUFDcEMsV0FBVyxFQUFFLFFBQVEsQ0FDcEIscUNBQXFDLEVBQ3JDLDhOQUE4TixDQUM5TjtZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUM7WUFDaEMsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxhQUFhLENBQUM7Z0JBQzlDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLENBQUM7Z0JBQzVDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSw2Q0FBNkMsQ0FBQzthQUNwRjtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxxRkFBc0MsRUFBRTtZQUN2QyxXQUFXLEVBQUUsUUFBUSxDQUNwQix3Q0FBd0MsRUFDeEMsc0xBQXNMLENBQ3RMO1lBQ0QsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFFBQVE7YUFDZDtZQUNELE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUM7U0FDekU7UUFDRCw2RUFBa0MsRUFBRTtZQUNuQyxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7WUFDakIsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FDUCx3Q0FBd0MsRUFDeEMsMkZBQTJGLENBQzNGO2dCQUNELFFBQVEsQ0FDUCwyQ0FBMkMsRUFDM0Msb0hBQW9ILENBQ3BIO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsSUFBSTtZQUNiLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG9DQUFvQyxFQUNwQywrUkFBK1IsQ0FDL1I7U0FDRDtRQUNELGlHQUE0QyxFQUFFO1lBQzdDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDhDQUE4QyxFQUM5Qyw0RUFBNEUsQ0FDNUU7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCw2R0FBa0QsRUFBRTtZQUNuRCxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLG9EQUFvRCxFQUNwRCxpZUFBaWUsQ0FDamU7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLENBQUM7WUFDakQsd0JBQXdCLEVBQUU7Z0JBQ3pCLFFBQVEsQ0FDUCwyREFBMkQsRUFDM0QscUtBQXFLLENBQ3JLO2dCQUNELFFBQVEsQ0FDUCx5RUFBeUUsRUFDekUsbU1BQW1NLENBQ25NO2dCQUNELFFBQVEsQ0FDUCwwREFBMEQsRUFDMUQsNkRBQTZELENBQzdEO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsUUFBUTtTQUNqQjtRQUNELDJFQUFpQyxFQUFFO1lBQ2xDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG1DQUFtQyxFQUNuQyxtSEFBbUgsQ0FDbkg7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDO1lBQ3RDLHdCQUF3QixFQUFFO2dCQUN6QixRQUFRLENBQUMscUJBQXFCLEVBQUUsMENBQTBDLENBQUM7Z0JBQzNFLFFBQVEsQ0FDUCx5QkFBeUIsRUFDekIsd0VBQXdFLENBQ3hFO2dCQUNELFFBQVEsQ0FDUCxzQkFBc0IsRUFDdEIsNkVBQTZFLENBQzdFO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsT0FBTztTQUNoQjtRQUNELGlGQUFvQyxFQUFFO1lBQ3JDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHNDQUFzQyxFQUN0Qyw2SkFBNkosQ0FDN0o7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCx5RUFBZ0MsRUFBRTtZQUNqQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGtDQUFrQyxFQUNsQyx3TkFBd04sRUFDeE4sTUFBTSw2RUFBaUMsS0FBSyxDQUM1QztZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELGlHQUE0QyxFQUFFO1lBQzdDLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsOENBQThDLEVBQzlDLHNTQUFzUyxDQUN0UztZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELGdHQUEyQyxFQUFFO1lBQzVDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsOENBQThDLEVBQzlDLG8wQkFBbzBCLEVBQ3AwQiw2REFBNkQsRUFDN0QsaUNBQWlDLENBQ2pDO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0Qsc0hBQXNELEVBQUU7WUFDdkQsVUFBVSxFQUFFLElBQUk7WUFDaEIsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix5REFBeUQsRUFDekQsd0VBQXdFLENBQ3hFO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUM7WUFDbEQsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FDUCw4REFBOEQsRUFDOUQsa0VBQWtFLENBQ2xFO2dCQUNELFFBQVEsQ0FDUCxnRUFBZ0UsRUFDaEUscURBQXFELENBQ3JEO2dCQUNELFFBQVEsQ0FDUCx1RUFBdUUsRUFDdkUsOERBQThELENBQzlEO2dCQUNELFFBQVEsQ0FDUCwrREFBK0QsRUFDL0QseUJBQXlCLENBQ3pCO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsTUFBTTtTQUNmO1FBQ0QsMEhBQXdELEVBQUU7WUFDekQsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QiwyREFBMkQsRUFDM0QsMEpBQTBKLEVBQzFKLE1BQU0sbUZBQXVDLEtBQUssQ0FDbEQ7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVE7U0FDckM7UUFDRCwrRUFBbUMsRUFBRTtZQUNwQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLHFDQUFxQyxFQUNyQywrREFBK0QsQ0FDL0Q7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxpR0FBNEMsRUFBRTtZQUM3QyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLDhDQUE4QyxFQUM5QyxrUUFBa1EsRUFDbFEsY0FBYyxFQUNkLGNBQWMsQ0FDZDtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELHlFQUFnQyxFQUFFO1lBQ2pDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsa0NBQWtDLEVBQ2xDLHlWQUF5VixFQUN6VixNQUFNLDZFQUFpQyxLQUFLLEVBQzVDLE1BQU0scUZBQXFDLEtBQUssQ0FDaEQ7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCwyRUFBaUMsRUFBRTtZQUNsQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLG1DQUFtQyxFQUNuQyxtSkFBbUosQ0FDbko7WUFDRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxDQUFDO1lBQy9DLE9BQU8sRUFBRSxNQUFNO1lBQ2YsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDO1lBQ3ZCLHdCQUF3QixFQUFFO2dCQUN6QixRQUFRLENBQUMsNENBQTRDLEVBQUUsNEJBQTRCLENBQUM7Z0JBQ3BGLFFBQVEsQ0FDUCxxREFBcUQsRUFDckQscUNBQXFDLENBQ3JDO2dCQUNELFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxhQUFhLENBQUM7YUFDakU7U0FDRDtRQUNELEdBQUcsNEJBQTRCO0tBQy9CO0NBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsNkJBQTZCLENBQ2xELGVBQW9EO0lBRXBELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQzNGLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLENBQUE7SUFDbEUsTUFBTSxhQUFhLEdBQUcsTUFBTSxlQUFlLEVBQUUsQ0FBQTtJQUM3QyxJQUFJLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3RDLHFCQUFxQixDQUFDLFVBQVUscUVBQThCLENBQUMsZUFBZSxHQUFHLGFBQWEsQ0FBQTtJQUMvRixDQUFDO0FBQ0YsQ0FBQztBQUVELFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsc0JBQXNCLENBQzFDLENBQUMsK0JBQStCLENBQUM7SUFDakM7UUFDQyxHQUFHLHFFQUE4QjtRQUNqQyxTQUFTLEVBQUUsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDbkMsTUFBTSwwQkFBMEIsR0FBK0IsRUFBRSxDQUFBO1lBQ2pFLElBQUksWUFBWSxHQUNmLFFBQVEsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLFlBQVk7Z0JBQzVELFFBQVEsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO1lBQzdDLElBQUksWUFBWSxLQUFLLFNBQVMsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEUsWUFBWSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDN0MsQ0FBQztZQUNELDBCQUEwQixDQUFDLElBQUksQ0FBQztnQkFDL0Isb0NBQW9DO2dCQUNwQyxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxFQUFFO2FBQzdELENBQUMsQ0FBQTtZQUNGLDBCQUEwQixDQUFDLElBQUksQ0FBQyxzRUFBK0IsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JGLDBCQUEwQixDQUFDLElBQUksQ0FBQyxrRkFBcUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVGLE9BQU8sMEJBQTBCLENBQUE7UUFDbEMsQ0FBQztLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=