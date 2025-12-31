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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb2xvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnQ29sb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixhQUFhLEVBQ2IsVUFBVSxFQUNWLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsZUFBZSxFQUNmLGVBQWUsRUFDZixlQUFlLEVBQ2YsMEJBQTBCLEVBQzFCLGNBQWMsRUFDZCxXQUFXLEVBQ1gsc0JBQXNCLEdBQ3RCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxLQUFLLEtBQUssTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFM0UsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsYUFBYSxDQUNsRCx5QkFBeUIsRUFDekI7SUFDQyxJQUFJLEVBQUUsU0FBUztJQUNmLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQ0QsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGlDQUFpQyxDQUFDLENBQ3JFLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQzlDLHFCQUFxQixFQUNyQixJQUFJLEVBQ0osUUFBUSxDQUFDLG9CQUFvQixFQUFFLDZCQUE2QixDQUFDLENBQzdELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxhQUFhLENBQ3BELDJCQUEyQixFQUMzQjtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFDRCxRQUFRLENBQUMsMkJBQTJCLEVBQUUseUNBQXlDLENBQUMsQ0FDaEYsQ0FBQTtBQUVELE1BQU0sVUFBVSxjQUFjO0lBQzdCLE1BQU0sd0JBQXdCLEdBQUcsYUFBYSxDQUM3QywyQkFBMkIsRUFDM0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEVBQzlFLGtHQUFrRyxDQUNsRyxDQUFBO0lBQ0QsTUFBTSx3QkFBd0IsR0FBRyxhQUFhLENBQzdDLDJCQUEyQixFQUMzQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFDOUUsa0dBQWtHLENBQ2xHLENBQUE7SUFDRCxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FDOUMsNEJBQTRCLEVBQzVCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUNsRixtR0FBbUcsQ0FDbkcsQ0FBQTtJQUNELE1BQU0sMEJBQTBCLEdBQUcsYUFBYSxDQUMvQyw2QkFBNkIsRUFDN0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQzVFLG9GQUFvRixDQUNwRixDQUFBO0lBQ0QsTUFBTSwyQkFBMkIsR0FBRyxhQUFhLENBQ2hELDhCQUE4QixFQUM5QixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFDNUUscUZBQXFGLENBQ3JGLENBQUE7SUFDRCxNQUFNLDBCQUEwQixHQUFHLGFBQWEsQ0FDL0MsNkJBQTZCLEVBQzdCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUM1RSxvRkFBb0YsQ0FDcEYsQ0FBQTtJQUNELE1BQU0seUJBQXlCLEdBQUcsYUFBYSxDQUM5Qyw0QkFBNEIsRUFDNUIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQzVFLDRJQUE0SSxDQUM1SSxDQUFBO0lBRUQsTUFBTSxpQ0FBaUMsR0FBRyxhQUFhLENBQ3RELG9DQUFvQyxFQUNwQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFDNUUscUdBQXFHLENBQ3JHLENBQUE7SUFDRCxNQUFNLGlDQUFpQyxHQUFHLGFBQWEsQ0FDdEQsb0NBQW9DLEVBQ3BDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUM1RSxxR0FBcUcsQ0FDckcsQ0FBQTtJQUNELE1BQU0sNkJBQTZCLEdBQUcsYUFBYSxDQUNsRCxnQ0FBZ0MsRUFDaEMsVUFBVSxFQUNWLHNHQUFzRyxDQUN0RyxDQUFBO0lBQ0QsTUFBTSw2QkFBNkIsR0FBRyxhQUFhLENBQ2xELGdDQUFnQyxFQUNoQyxXQUFXLEVBQ1gsc0dBQXNHLENBQ3RHLENBQUE7SUFDRCxNQUFNLDhCQUE4QixHQUFHLGFBQWEsQ0FDbkQsaUNBQWlDLEVBQ2pDLFNBQVMsRUFDVCx1RkFBdUYsQ0FDdkYsQ0FBQTtJQUVELE1BQU0sMEJBQTBCLEdBQUcsYUFBYSxDQUMvQyw2QkFBNkIsRUFDN0I7UUFDQyxJQUFJLEVBQUUsb0JBQW9CO1FBQzFCLEtBQUssRUFBRSxvQkFBb0I7UUFDM0IsTUFBTSxFQUFFLFVBQVU7UUFDbEIsT0FBTyxFQUFFLFVBQVU7S0FDbkIsRUFDRCwyREFBMkQsQ0FDM0QsQ0FBQTtJQUNELE1BQU0sNkJBQTZCLEdBQUcsYUFBYSxDQUNsRCxnQ0FBZ0MsRUFDaEM7UUFDQyxJQUFJLEVBQUUsdUJBQXVCO1FBQzdCLEtBQUssRUFBRSx1QkFBdUI7UUFDOUIsTUFBTSxFQUFFLFNBQVM7UUFDakIsT0FBTyxFQUFFLHVCQUF1QjtLQUNoQyxFQUNELDhEQUE4RCxDQUM5RCxDQUFBO0lBQ0QsTUFBTSwyQkFBMkIsR0FBRyxhQUFhLENBQ2hELDhCQUE4QixFQUM5QixlQUFlLEVBQ2YsNERBQTRELENBQzVELENBQUE7SUFDRCxNQUFNLDRCQUE0QixHQUFHLGFBQWEsQ0FDakQsK0JBQStCLEVBQy9CLFVBQVUsRUFDViw4REFBOEQsQ0FDOUQsQ0FBQTtJQUNELE1BQU0sK0JBQStCLEdBQUcsYUFBYSxDQUNwRCxrQ0FBa0MsRUFDbEMsVUFBVSxFQUNWLHVEQUF1RCxDQUN2RCxDQUFBO0lBRUQsTUFBTSx3QkFBd0IsR0FBRyxhQUFhLENBQzdDLDJCQUEyQixFQUMzQjtRQUNDLElBQUksRUFBRSxTQUFTO1FBQ2YsS0FBSyxFQUFFLFNBQVM7UUFDaEIsTUFBTSxFQUFFLFNBQVM7UUFDakIsT0FBTyxFQUFFLFNBQVM7S0FDbEIsRUFDRCxRQUFRLENBQUMsMkJBQTJCLEVBQUUsK0JBQStCLENBQUMsQ0FDdEUsQ0FBQTtJQUVELE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUM1QywwQkFBMEIsRUFDMUI7UUFDQyxJQUFJLEVBQUUsU0FBUztRQUNmLEtBQUssRUFBRSxTQUFTO1FBQ2hCLE1BQU0sRUFBRSxTQUFTO1FBQ2pCLE9BQU8sRUFBRSxTQUFTO0tBQ2xCLEVBQ0QsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDhCQUE4QixDQUFDLENBQ3BFLENBQUE7SUFFRCxNQUFNLDZCQUE2QixHQUFHLGFBQWEsQ0FDbEQsZ0NBQWdDLEVBQ2hDO1FBQ0MsSUFBSSxFQUFFLFNBQVM7UUFDZixLQUFLLEVBQUUsU0FBUztRQUNoQixNQUFNLEVBQUUsU0FBUztRQUNqQixPQUFPLEVBQUUsU0FBUztLQUNsQixFQUNELFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxvQ0FBb0MsQ0FBQyxDQUNoRixDQUFBO0lBRUQsTUFBTSwwQkFBMEIsR0FBRyxhQUFhLENBQy9DLDZCQUE2QixFQUM3QjtRQUNDLElBQUksRUFBRSxTQUFTO1FBQ2YsS0FBSyxFQUFFLFNBQVM7UUFDaEIsTUFBTSxFQUFFLFNBQVM7UUFDakIsT0FBTyxFQUFFLFNBQVM7S0FDbEIsRUFDRCxRQUFRLENBQUMsNkJBQTZCLEVBQUUsaUNBQWlDLENBQUMsQ0FDMUUsQ0FBQTtJQUVELE1BQU0sMkJBQTJCLEdBQUcsYUFBYSxDQUNoRCw4QkFBOEIsRUFDOUI7UUFDQyxJQUFJLEVBQUUsU0FBUztRQUNmLEtBQUssRUFBRSxTQUFTO1FBQ2hCLE1BQU0sRUFBRSxTQUFTO1FBQ2pCLE9BQU8sRUFBRSxTQUFTO0tBQ2xCLEVBQ0QsUUFBUSxDQUFDLDhCQUE4QixFQUFFLG1DQUFtQyxDQUFDLENBQzdFLENBQUE7SUFFRCxNQUFNLDJCQUEyQixHQUFHLGFBQWEsQ0FDaEQsOEJBQThCLEVBQzlCO1FBQ0MsSUFBSSxFQUFFLFNBQVM7UUFDZixLQUFLLEVBQUUsU0FBUztRQUNoQixNQUFNLEVBQUUsU0FBUztRQUNqQixPQUFPLEVBQUUsU0FBUztLQUNsQixFQUNELFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxtQ0FBbUMsQ0FBQyxDQUM3RSxDQUFBO0lBRUQsTUFBTSwwQkFBMEIsR0FBRyxhQUFhLENBQy9DLDZCQUE2QixFQUM3QjtRQUNDLElBQUksRUFBRSxTQUFTO1FBQ2YsS0FBSyxFQUFFLFNBQVM7UUFDaEIsTUFBTSxFQUFFLFNBQVM7UUFDakIsT0FBTyxFQUFFLFNBQVM7S0FDbEIsRUFDRCxRQUFRLENBQUMsNkJBQTZCLEVBQUUsbUNBQW1DLENBQUMsQ0FDNUUsQ0FBQTtJQUVELE1BQU0sMkJBQTJCLEdBQUcsYUFBYSxDQUNoRCw4QkFBOEIsRUFDOUI7UUFDQyxJQUFJLEVBQUUsU0FBUztRQUNmLEtBQUssRUFBRSxTQUFTO1FBQ2hCLE1BQU0sRUFBRSxTQUFTO1FBQ2pCLE9BQU8sRUFBRSxTQUFTO0tBQ2xCLEVBQ0QsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGtDQUFrQyxDQUFDLENBQzVFLENBQUE7SUFFRCxNQUFNLDJCQUEyQixHQUFHLGFBQWEsQ0FDaEQsOEJBQThCLEVBQzlCO1FBQ0MsSUFBSSxFQUFFLFNBQVM7UUFDZixLQUFLLEVBQUUsU0FBUztRQUNoQixNQUFNLEVBQUUsU0FBUztRQUNqQixPQUFPLEVBQUUsU0FBUztLQUNsQixFQUNELFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxtQ0FBbUMsQ0FBQyxDQUM3RSxDQUFBO0lBRUQsMEJBQTBCLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDL0MsMkZBQTJGO1FBQzNGLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUUsQ0FBQTtRQUM3RCxNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFFLENBQUE7UUFDN0QsTUFBTSwrQkFBK0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFFLENBQUE7UUFDbkYsTUFBTSxzQ0FBc0MsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUM1RCxpQ0FBaUMsQ0FDaEMsQ0FBQTtRQUNGLE1BQU0sc0NBQXNDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FDNUQsaUNBQWlDLENBQ2hDLENBQUE7UUFDRixNQUFNLGtDQUFrQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUUsQ0FBQTtRQUN6RixNQUFNLGtDQUFrQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUUsQ0FBQTtRQUN6RixNQUFNLG1DQUFtQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsOEJBQThCLENBQUUsQ0FBQTtRQUMzRixNQUFNLDJCQUEyQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUUxRSxTQUFTLENBQUMsT0FBTyxDQUFDOzs7YUFHUCwrQkFBK0I7Ozs7O3dCQUtwQixvQkFBb0I7YUFDL0Isb0JBQW9COzs7Ozt3QkFLVCxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO2FBQ2hELG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7Ozs7Ozs7O3dCQVExQixrQ0FBa0M7YUFDN0Msa0NBQWtDOzs7Ozs7Ozs7d0JBU3ZCLHNDQUFzQzthQUNqRCxzQ0FBc0M7Ozs7O3dCQUszQixzQ0FBc0M7YUFDakQsc0NBQXNDOzs7OzsrQkFLcEIsbUNBQW1DLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzsrQkFDbEQsbUNBQW1DLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQzsrQkFDcEQsbUNBQW1DLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQzs7Ozt3QkFJM0QsbUNBQW1DLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQzs7Ozs7Ozt3QkFPcEQsMkJBQTJCOztHQUVoRCxDQUFDLENBQUE7UUFFRixNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFMUQsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLFNBQVMsQ0FBQyxPQUFPLENBQUM7O3dCQUVHLG1CQUFtQjs7SUFFdkMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELGlEQUFpRDtRQUNqRCxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxTQUFTLENBQUMsT0FBTyxDQUFDOzt3QkFFRyxvQkFBb0I7YUFDL0Isb0JBQW9CO0tBQzVCLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFFLENBQUE7UUFDaEUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBRSxDQUFBO1FBQ2hFLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUUsQ0FBQTtRQUNsRSxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsMEJBQTBCLENBQUUsQ0FBQTtRQUNwRSxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUUsQ0FBQTtRQUN0RSxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFFLENBQUE7UUFDbEUsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFFLENBQUE7UUFFcEUsU0FBUyxDQUFDLE9BQU8sQ0FBQzs7YUFFUCxjQUFjOzs7O2FBSWQsY0FBYzs7Ozs7YUFLZCxlQUFlOzs7OzthQUtmLGdCQUFnQjs7Ozs7YUFLaEIsaUJBQWlCOzs7Ozs7YUFNakIsZUFBZTs7Ozs7YUFLZixnQkFBZ0I7O0dBRTFCLENBQUMsQ0FBQTtRQUVGLE1BQU0sNEJBQTRCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sK0JBQStCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBRSxDQUFBO1FBQ25GLE1BQU0sa0NBQWtDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBRSxDQUFBO1FBQ3pGLE1BQU0sZ0NBQWdDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBRSxDQUFBO1FBQ3JGLE1BQU0saUNBQWlDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBRSxDQUFBO1FBQ3ZGLE1BQU0sb0NBQW9DLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsQ0FBRSxDQUFBO1FBRTdGLFNBQVMsQ0FBQyxPQUFPLENBQUM7OzRCQUVRLDRCQUE0Qjs7OzthQUkzQywrQkFBK0I7Ozs7YUFJL0Isa0NBQWtDOzs7O2FBSWxDLGdDQUFnQzs7OzthQUloQyxpQ0FBaUM7Ozs7YUFJakMsb0NBQW9DOztHQUU5QyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLENBQUM7WUFDckQsU0FBUyxDQUFDLE9BQU8sQ0FBQzs7Ozs7Ozs7Ozs7OztJQWFqQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDcEUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLFNBQVMsQ0FBQyxPQUFPLENBQ2hCLHFCQUFxQixTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxtQkFBbUIsS0FBSyxDQUNuRyxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3BFLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixTQUFTLENBQUMsT0FBTyxDQUNoQixrRUFBa0UsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLHVCQUF1QixTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxtQkFBbUIsS0FBSyxDQUNoTixDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ2xFLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixTQUFTLENBQUMsT0FBTyxDQUNoQixrRUFBa0UsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHNCQUFzQixTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxrQkFBa0IsS0FBSyxDQUM1TSxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sd0JBQXdCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBQzlFLElBQUksd0JBQXdCLEVBQUUsQ0FBQztZQUM5QixTQUFTLENBQUMsT0FBTyxDQUNoQixrRUFBa0UsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLDBDQUEwQyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsc0NBQXNDLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyw4Q0FBOEMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLGFBQWEsd0JBQXdCLEtBQUssQ0FDbGEsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtRQUN4RSxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDM0IsU0FBUyxDQUFDLE9BQU8sQ0FDaEIscUJBQXFCLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsb0VBQW9FLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxvRUFBb0UsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsYUFBYSxxQkFBcUIsS0FBSyxDQUNqWixDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQzFFLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUM1QixTQUFTLENBQUMsT0FBTyxDQUNoQixrRUFBa0UsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHVCQUF1QixTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxzQkFBc0IsS0FBSyxDQUN6TixDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQzFFLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUM1QixTQUFTLENBQUMsT0FBTyxDQUNoQixrRUFBa0UsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLG9FQUFvRSxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsdUJBQXVCLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLHNCQUFzQixLQUFLLENBQ3pVLENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDeEUsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzNCLFNBQVMsQ0FBQyxPQUFPLENBQ2hCLGtFQUFrRSxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsb0VBQW9FLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEscUJBQXFCLEtBQUssQ0FDclUsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUMxRSxJQUFJLHNCQUFzQixFQUFFLENBQUM7WUFDNUIsU0FBUyxDQUFDLE9BQU8sQ0FDaEIsa0VBQWtFLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLG9FQUFvRSxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsYUFBYSxzQkFBc0IsS0FBSyxDQUMxWixDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQzFFLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUM1QixTQUFTLENBQUMsT0FBTyxDQUNoQixrRUFBa0UsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHVCQUF1QixTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxzQkFBc0IsS0FBSyxDQUN6TixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9