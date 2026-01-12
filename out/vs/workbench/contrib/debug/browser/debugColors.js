/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerColor, foreground, editorInfoForeground, editorWarningForeground, errorForeground, badgeBackground, badgeForeground, listDeemphasizedForeground, contrastBorder, inputBorder, toolbarHoverBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Color } from '../../../../base/common/color.js';
import { localize } from '../../../../nls.js';
import * as icons from './debugIcons.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
export const debugToolBarBackground = registerColor('debugToolBar.background', {
    dark: '#333333',
    light: '#F3F3F3',
    hcDark: '#000000',
    hcLight: '#FFFFFF',
}, localize('debugToolBarBackground', 'Debug toolbar background color.'));
export const debugToolBarBorder = registerColor('debugToolBar.border', null, localize('debugToolBarBorder', 'Debug toolbar border color.'));
export const debugIconStartForeground = registerColor('debugIcon.startForeground', {
    dark: '#89D185',
    light: '#388A34',
    hcDark: '#89D185',
    hcLight: '#388A34',
}, localize('debugIcon.startForeground', 'Debug toolbar icon for start debugging.'));
export function registerColors() {
    const debugTokenExpressionName = registerColor('debugTokenExpression.name', { dark: '#c586c0', light: '#9b46b0', hcDark: foreground, hcLight: foreground }, 'Foreground color for the token names shown in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionType = registerColor('debugTokenExpression.type', { dark: '#4A90E2', light: '#4A90E2', hcDark: foreground, hcLight: foreground }, 'Foreground color for the token types shown in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionValue = registerColor('debugTokenExpression.value', { dark: '#cccccc99', light: '#6c6c6ccc', hcDark: foreground, hcLight: foreground }, 'Foreground color for the token values shown in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionString = registerColor('debugTokenExpression.string', { dark: '#ce9178', light: '#a31515', hcDark: '#f48771', hcLight: '#a31515' }, 'Foreground color for strings in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionBoolean = registerColor('debugTokenExpression.boolean', { dark: '#4e94ce', light: '#0000ff', hcDark: '#75bdfe', hcLight: '#0000ff' }, 'Foreground color for booleans in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionNumber = registerColor('debugTokenExpression.number', { dark: '#b5cea8', light: '#098658', hcDark: '#89d185', hcLight: '#098658' }, 'Foreground color for numbers in the debug views (ie. the Variables or Watch view).');
    const debugTokenExpressionError = registerColor('debugTokenExpression.error', { dark: '#f48771', light: '#e51400', hcDark: '#f48771', hcLight: '#e51400' }, 'Foreground color for expression errors in the debug views (ie. the Variables or Watch view) and for error logs shown in the debug console.');
    const debugViewExceptionLabelForeground = registerColor('debugView.exceptionLabelForeground', { dark: foreground, light: '#FFF', hcDark: foreground, hcLight: foreground }, 'Foreground color for a label shown in the CALL STACK view when the debugger breaks on an exception.');
    const debugViewExceptionLabelBackground = registerColor('debugView.exceptionLabelBackground', { dark: '#6C2022', light: '#A31515', hcDark: '#6C2022', hcLight: '#A31515' }, 'Background color for a label shown in the CALL STACK view when the debugger breaks on an exception.');
    const debugViewStateLabelForeground = registerColor('debugView.stateLabelForeground', foreground, "Foreground color for a label in the CALL STACK view showing the current session's or thread's state.");
    const debugViewStateLabelBackground = registerColor('debugView.stateLabelBackground', '#88888844', "Background color for a label in the CALL STACK view showing the current session's or thread's state.");
    const debugViewValueChangedHighlight = registerColor('debugView.valueChangedHighlight', '#569CD6', 'Color used to highlight value changes in the debug views (ie. in the Variables view).');
    const debugConsoleInfoForeground = registerColor('debugConsole.infoForeground', {
        dark: editorInfoForeground,
        light: editorInfoForeground,
        hcDark: foreground,
        hcLight: foreground,
    }, 'Foreground color for info messages in debug REPL console.');
    const debugConsoleWarningForeground = registerColor('debugConsole.warningForeground', {
        dark: editorWarningForeground,
        light: editorWarningForeground,
        hcDark: '#008000',
        hcLight: editorWarningForeground,
    }, 'Foreground color for warning messages in debug REPL console.');
    const debugConsoleErrorForeground = registerColor('debugConsole.errorForeground', errorForeground, 'Foreground color for error messages in debug REPL console.');
    const debugConsoleSourceForeground = registerColor('debugConsole.sourceForeground', foreground, 'Foreground color for source filenames in debug REPL console.');
    const debugConsoleInputIconForeground = registerColor('debugConsoleInputIcon.foreground', foreground, 'Foreground color for debug console input marker icon.');
    const debugIconPauseForeground = registerColor('debugIcon.pauseForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC',
    }, localize('debugIcon.pauseForeground', 'Debug toolbar icon for pause.'));
    const debugIconStopForeground = registerColor('debugIcon.stopForeground', {
        dark: '#F48771',
        light: '#A1260D',
        hcDark: '#F48771',
        hcLight: '#A1260D',
    }, localize('debugIcon.stopForeground', 'Debug toolbar icon for stop.'));
    const debugIconDisconnectForeground = registerColor('debugIcon.disconnectForeground', {
        dark: '#F48771',
        light: '#A1260D',
        hcDark: '#F48771',
        hcLight: '#A1260D',
    }, localize('debugIcon.disconnectForeground', 'Debug toolbar icon for disconnect.'));
    const debugIconRestartForeground = registerColor('debugIcon.restartForeground', {
        dark: '#89D185',
        light: '#388A34',
        hcDark: '#89D185',
        hcLight: '#388A34',
    }, localize('debugIcon.restartForeground', 'Debug toolbar icon for restart.'));
    const debugIconStepOverForeground = registerColor('debugIcon.stepOverForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC',
    }, localize('debugIcon.stepOverForeground', 'Debug toolbar icon for step over.'));
    const debugIconStepIntoForeground = registerColor('debugIcon.stepIntoForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC',
    }, localize('debugIcon.stepIntoForeground', 'Debug toolbar icon for step into.'));
    const debugIconStepOutForeground = registerColor('debugIcon.stepOutForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC',
    }, localize('debugIcon.stepOutForeground', 'Debug toolbar icon for step over.'));
    const debugIconContinueForeground = registerColor('debugIcon.continueForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC',
    }, localize('debugIcon.continueForeground', 'Debug toolbar icon for continue.'));
    const debugIconStepBackForeground = registerColor('debugIcon.stepBackForeground', {
        dark: '#75BEFF',
        light: '#007ACC',
        hcDark: '#75BEFF',
        hcLight: '#007ACC',
    }, localize('debugIcon.stepBackForeground', 'Debug toolbar icon for step back.'));
    registerThemingParticipant((theme, collector) => {
        // All these colours provide a default value so they will never be undefined, hence the `!`
        const badgeBackgroundColor = theme.getColor(badgeBackground);
        const badgeForegroundColor = theme.getColor(badgeForeground);
        const listDeemphasizedForegroundColor = theme.getColor(listDeemphasizedForeground);
        const debugViewExceptionLabelForegroundColor = theme.getColor(debugViewExceptionLabelForeground);
        const debugViewExceptionLabelBackgroundColor = theme.getColor(debugViewExceptionLabelBackground);
        const debugViewStateLabelForegroundColor = theme.getColor(debugViewStateLabelForeground);
        const debugViewStateLabelBackgroundColor = theme.getColor(debugViewStateLabelBackground);
        const debugViewValueChangedHighlightColor = theme.getColor(debugViewValueChangedHighlight);
        const toolbarHoverBackgroundColor = theme.getColor(toolbarHoverBackground);
        collector.addRule(`
			/* Text colour of the call stack row's filename */
			.debug-pane .debug-call-stack .monaco-list-row:not(.selected) .stack-frame > .file .file-name {
				color: ${listDeemphasizedForegroundColor}
			}

			/* Line & column number "badge" for selected call stack row */
			.debug-pane .monaco-list-row.selected .line-number {
				background-color: ${badgeBackgroundColor};
				color: ${badgeForegroundColor};
			}

			/* Line & column number "badge" for unselected call stack row (basically all other rows) */
			.debug-pane .line-number {
				background-color: ${badgeBackgroundColor.transparent(0.6)};
				color: ${badgeForegroundColor.transparent(0.6)};
			}

			/* State "badge" displaying the active session's current state.
			* Only visible when there are more active debug sessions/threads running.
			*/
			.debug-pane .debug-call-stack .thread > .state.label,
			.debug-pane .debug-call-stack .session > .state.label {
				background-color: ${debugViewStateLabelBackgroundColor};
				color: ${debugViewStateLabelForegroundColor};
			}

			/* State "badge" displaying the active session's current state.
			* Only visible when there are more active debug sessions/threads running
			* and thread paused due to a thrown exception.
			*/
			.debug-pane .debug-call-stack .thread > .state.label.exception,
			.debug-pane .debug-call-stack .session > .state.label.exception {
				background-color: ${debugViewExceptionLabelBackgroundColor};
				color: ${debugViewExceptionLabelForegroundColor};
			}

			/* Info "badge" shown when the debugger pauses due to a thrown exception. */
			.debug-pane .call-stack-state-message > .label.exception {
				background-color: ${debugViewExceptionLabelBackgroundColor};
				color: ${debugViewExceptionLabelForegroundColor};
			}

			/* Animation of changed values in Debug viewlet */
			@keyframes debugViewletValueChanged {
				0%   { background-color: ${debugViewValueChangedHighlightColor.transparent(0)} }
				5%   { background-color: ${debugViewValueChangedHighlightColor.transparent(0.9)} }
				100% { background-color: ${debugViewValueChangedHighlightColor.transparent(0.3)} }
			}

			.debug-pane .monaco-list-row .expression .value.changed {
				background-color: ${debugViewValueChangedHighlightColor.transparent(0.3)};
				animation-name: debugViewletValueChanged;
				animation-duration: 1s;
				animation-fill-mode: forwards;
			}

			.monaco-list-row .expression .lazy-button:hover {
				background-color: ${toolbarHoverBackgroundColor}
			}
		`);
        const contrastBorderColor = theme.getColor(contrastBorder);
        if (contrastBorderColor) {
            collector.addRule(`
			.debug-pane .line-number {
				border: 1px solid ${contrastBorderColor};
			}
			`);
        }
        // Use fully-opaque colors for line-number badges
        if (isHighContrast(theme.type)) {
            collector.addRule(`
			.debug-pane .line-number {
				background-color: ${badgeBackgroundColor};
				color: ${badgeForegroundColor};
			}`);
        }
        const tokenNameColor = theme.getColor(debugTokenExpressionName);
        const tokenTypeColor = theme.getColor(debugTokenExpressionType);
        const tokenValueColor = theme.getColor(debugTokenExpressionValue);
        const tokenStringColor = theme.getColor(debugTokenExpressionString);
        const tokenBooleanColor = theme.getColor(debugTokenExpressionBoolean);
        const tokenErrorColor = theme.getColor(debugTokenExpressionError);
        const tokenNumberColor = theme.getColor(debugTokenExpressionNumber);
        collector.addRule(`
			.monaco-workbench .monaco-list-row .expression .name {
				color: ${tokenNameColor};
			}

			.monaco-workbench .monaco-list-row .expression .type {
				color: ${tokenTypeColor};
			}

			.monaco-workbench .monaco-list-row .expression .value,
			.monaco-workbench .debug-hover-widget .value {
				color: ${tokenValueColor};
			}

			.monaco-workbench .monaco-list-row .expression .value.string,
			.monaco-workbench .debug-hover-widget .value.string {
				color: ${tokenStringColor};
			}

			.monaco-workbench .monaco-list-row .expression .value.boolean,
			.monaco-workbench .debug-hover-widget .value.boolean {
				color: ${tokenBooleanColor};
			}

			.monaco-workbench .monaco-list-row .expression .error,
			.monaco-workbench .debug-hover-widget .error,
			.monaco-workbench .debug-pane .debug-variables .scope .error {
				color: ${tokenErrorColor};
			}

			.monaco-workbench .monaco-list-row .expression .value.number,
			.monaco-workbench .debug-hover-widget .value.number {
				color: ${tokenNumberColor};
			}
		`);
        const debugConsoleInputBorderColor = theme.getColor(inputBorder) || Color.fromHex('#80808060');
        const debugConsoleInfoForegroundColor = theme.getColor(debugConsoleInfoForeground);
        const debugConsoleWarningForegroundColor = theme.getColor(debugConsoleWarningForeground);
        const debugConsoleErrorForegroundColor = theme.getColor(debugConsoleErrorForeground);
        const debugConsoleSourceForegroundColor = theme.getColor(debugConsoleSourceForeground);
        const debugConsoleInputIconForegroundColor = theme.getColor(debugConsoleInputIconForeground);
        collector.addRule(`
			.repl .repl-input-wrapper {
				border-top: 1px solid ${debugConsoleInputBorderColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .value.info {
				color: ${debugConsoleInfoForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .value.warn {
				color: ${debugConsoleWarningForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .value.error {
				color: ${debugConsoleErrorForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .output .expression .source {
				color: ${debugConsoleSourceForegroundColor};
			}

			.monaco-workbench .repl .repl-tree .monaco-tl-contents .arrow {
				color: ${debugConsoleInputIconForegroundColor};
			}
		`);
        if (!theme.defines(debugConsoleInputIconForeground)) {
            collector.addRule(`
				.monaco-workbench.vs .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 0.25;
				}

				.monaco-workbench.vs-dark .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 0.4;
				}

				.monaco-workbench.hc-black .repl .repl-tree .monaco-tl-contents .arrow,
				.monaco-workbench.hc-light .repl .repl-tree .monaco-tl-contents .arrow {
					opacity: 1;
				}
			`);
        }
        const debugIconStartColor = theme.getColor(debugIconStartForeground);
        if (debugIconStartColor) {
            collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStart)} { color: ${debugIconStartColor}; }`);
        }
        const debugIconPauseColor = theme.getColor(debugIconPauseForeground);
        if (debugIconPauseColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugPause)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugPause)} { color: ${debugIconPauseColor}; }`);
        }
        const debugIconStopColor = theme.getColor(debugIconStopForeground);
        if (debugIconStopColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStop)},.monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStop)} { color: ${debugIconStopColor}; }`);
        }
        const debugIconDisconnectColor = theme.getColor(debugIconDisconnectForeground);
        if (debugIconDisconnectColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugDisconnect)},.monaco-workbench .debug-view-content ${ThemeIcon.asCSSSelector(icons.debugDisconnect)}, .monaco-workbench .debug-toolbar ${ThemeIcon.asCSSSelector(icons.debugDisconnect)}, .monaco-workbench .command-center-center ${ThemeIcon.asCSSSelector(icons.debugDisconnect)} { color: ${debugIconDisconnectColor}; }`);
        }
        const debugIconRestartColor = theme.getColor(debugIconRestartForeground);
        if (debugIconRestartColor) {
            collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugRestart)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugRestartFrame)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugRestart)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugRestartFrame)} { color: ${debugIconRestartColor}; }`);
        }
        const debugIconStepOverColor = theme.getColor(debugIconStepOverForeground);
        if (debugIconStepOverColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepOver)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepOver)} { color: ${debugIconStepOverColor}; }`);
        }
        const debugIconStepIntoColor = theme.getColor(debugIconStepIntoForeground);
        if (debugIconStepIntoColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepInto)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepInto)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepInto)} { color: ${debugIconStepIntoColor}; }`);
        }
        const debugIconStepOutColor = theme.getColor(debugIconStepOutForeground);
        if (debugIconStepOutColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepOut)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepOut)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepOut)} { color: ${debugIconStepOutColor}; }`);
        }
        const debugIconContinueColor = theme.getColor(debugIconContinueForeground);
        if (debugIconContinueColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugContinue)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugContinue)}, .monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugReverseContinue)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugReverseContinue)} { color: ${debugIconContinueColor}; }`);
        }
        const debugIconStepBackColor = theme.getColor(debugIconStepBackForeground);
        if (debugIconStepBackColor) {
            collector.addRule(`.monaco-workbench .part > .title > .title-actions .action-label${ThemeIcon.asCSSSelector(icons.debugStepBack)}, .monaco-workbench ${ThemeIcon.asCSSSelector(icons.debugStepBack)} { color: ${debugIconStepBackColor}; }`);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb2xvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdDb2xvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGFBQWEsRUFDYixVQUFVLEVBQ1Ysb0JBQW9CLEVBQ3BCLHVCQUF1QixFQUN2QixlQUFlLEVBQ2YsZUFBZSxFQUNmLGVBQWUsRUFDZiwwQkFBMEIsRUFDMUIsY0FBYyxFQUNkLFdBQVcsRUFDWCxzQkFBc0IsR0FDdEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEtBQUssS0FBSyxNQUFNLGlCQUFpQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUzRSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxhQUFhLENBQ2xELHlCQUF5QixFQUN6QjtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFDRCxRQUFRLENBQUMsd0JBQXdCLEVBQUUsaUNBQWlDLENBQUMsQ0FDckUsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGFBQWEsQ0FDOUMscUJBQXFCLEVBQ3JCLElBQUksRUFDSixRQUFRLENBQUMsb0JBQW9CLEVBQUUsNkJB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