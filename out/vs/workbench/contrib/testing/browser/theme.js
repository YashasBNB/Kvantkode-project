/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { activityErrorBadgeBackground, activityErrorBadgeForeground, badgeBackground, badgeForeground, chartsGreen, chartsRed, contrastBorder, diffInserted, diffRemoved, editorBackground, editorErrorForeground, editorForeground, editorInfoForeground, opaque, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
export const testingColorIconFailed = registerColor('testing.iconFailed', {
    dark: '#f14c4c',
    light: '#f14c4c',
    hcDark: '#f14c4c',
    hcLight: '#B5200D',
}, localize('testing.iconFailed', "Color for the 'failed' icon in the test explorer."));
export const testingColorIconErrored = registerColor('testing.iconErrored', {
    dark: '#f14c4c',
    light: '#f14c4c',
    hcDark: '#f14c4c',
    hcLight: '#B5200D',
}, localize('testing.iconErrored', "Color for the 'Errored' icon in the test explorer."));
export const testingColorIconPassed = registerColor('testing.iconPassed', {
    dark: '#73c991',
    light: '#73c991',
    hcDark: '#73c991',
    hcLight: '#007100',
}, localize('testing.iconPassed', "Color for the 'passed' icon in the test explorer."));
export const testingColorRunAction = registerColor('testing.runAction', testingColorIconPassed, localize('testing.runAction', "Color for 'run' icons in the editor."));
export const testingColorIconQueued = registerColor('testing.iconQueued', '#cca700', localize('testing.iconQueued', "Color for the 'Queued' icon in the test explorer."));
export const testingColorIconUnset = registerColor('testing.iconUnset', '#848484', localize('testing.iconUnset', "Color for the 'Unset' icon in the test explorer."));
export const testingColorIconSkipped = registerColor('testing.iconSkipped', '#848484', localize('testing.iconSkipped', "Color for the 'Skipped' icon in the test explorer."));
export const testingPeekBorder = registerColor('testing.peekBorder', {
    dark: editorErrorForeground,
    light: editorErrorForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('testing.peekBorder', 'Color of the peek view borders and arrow.'));
export const testingMessagePeekBorder = registerColor('testing.messagePeekBorder', {
    dark: editorInfoForeground,
    light: editorInfoForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('testing.messagePeekBorder', 'Color of the peek view borders and arrow when peeking a logged message.'));
export const testingPeekHeaderBackground = registerColor('testing.peekHeaderBackground', {
    dark: transparent(editorErrorForeground, 0.1),
    light: transparent(editorErrorForeground, 0.1),
    hcDark: null,
    hcLight: null,
}, localize('testing.peekBorder', 'Color of the peek view borders and arrow.'));
export const testingPeekMessageHeaderBackground = registerColor('testing.messagePeekHeaderBackground', {
    dark: transparent(editorInfoForeground, 0.1),
    light: transparent(editorInfoForeground, 0.1),
    hcDark: null,
    hcLight: null,
}, localize('testing.messagePeekHeaderBackground', 'Color of the peek view borders and arrow when peeking a logged message.'));
export const testingCoveredBackground = registerColor('testing.coveredBackground', {
    dark: diffInserted,
    light: diffInserted,
    hcDark: null,
    hcLight: null,
}, localize('testing.coveredBackground', 'Background color of text that was covered.'));
export const testingCoveredBorder = registerColor('testing.coveredBorder', {
    dark: transparent(testingCoveredBackground, 0.75),
    light: transparent(testingCoveredBackground, 0.75),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('testing.coveredBorder', 'Border color of text that was covered.'));
export const testingCoveredGutterBackground = registerColor('testing.coveredGutterBackground', {
    dark: transparent(diffInserted, 0.6),
    light: transparent(diffInserted, 0.6),
    hcDark: chartsGreen,
    hcLight: chartsGreen,
}, localize('testing.coveredGutterBackground', 'Gutter color of regions where code was covered.'));
export const testingUncoveredBranchBackground = registerColor('testing.uncoveredBranchBackground', {
    dark: opaque(transparent(diffRemoved, 2), editorBackground),
    light: opaque(transparent(diffRemoved, 2), editorBackground),
    hcDark: null,
    hcLight: null,
}, localize('testing.uncoveredBranchBackground', 'Background of the widget shown for an uncovered branch.'));
export const testingUncoveredBackground = registerColor('testing.uncoveredBackground', {
    dark: diffRemoved,
    light: diffRemoved,
    hcDark: null,
    hcLight: null,
}, localize('testing.uncoveredBackground', 'Background color of text that was not covered.'));
export const testingUncoveredBorder = registerColor('testing.uncoveredBorder', {
    dark: transparent(testingUncoveredBackground, 0.75),
    light: transparent(testingUncoveredBackground, 0.75),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('testing.uncoveredBorder', 'Border color of text that was not covered.'));
export const testingUncoveredGutterBackground = registerColor('testing.uncoveredGutterBackground', {
    dark: transparent(diffRemoved, 1.5),
    light: transparent(diffRemoved, 1.5),
    hcDark: chartsRed,
    hcLight: chartsRed,
}, localize('testing.uncoveredGutterBackground', 'Gutter color of regions where code not covered.'));
export const testingCoverCountBadgeBackground = registerColor('testing.coverCountBadgeBackground', badgeBackground, localize('testing.coverCountBadgeBackground', 'Background for the badge indicating execution count'));
export const testingCoverCountBadgeForeground = registerColor('testing.coverCountBadgeForeground', badgeForeground, localize('testing.coverCountBadgeForeground', 'Foreground for the badge indicating execution count'));
const messageBadgeBackground = registerColor('testing.message.error.badgeBackground', activityErrorBadgeBackground, localize('testing.message.error.badgeBackground', 'Background color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.badgeBorder', messageBadgeBackground, localize('testing.message.error.badgeBorder', 'Border color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.badgeForeground', activityErrorBadgeForeground, localize('testing.message.error.badgeForeground', 'Text color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.lineBackground', null, localize('testing.message.error.marginBackground', 'Margin color beside error messages shown inline in the editor.'));
registerColor('testing.message.info.decorationForeground', transparent(editorForeground, 0.5), localize('testing.message.info.decorationForeground', 'Text color of test info messages shown inline in the editor.'));
registerColor('testing.message.info.lineBackground', null, localize('testing.message.info.marginBackground', 'Margin color beside info messages shown inline in the editor.'));
export const testStatesToIconColors = {
    [6 /* TestResultState.Errored */]: testingColorIconErrored,
    [4 /* TestResultState.Failed */]: testingColorIconFailed,
    [3 /* TestResultState.Passed */]: testingColorIconPassed,
    [1 /* TestResultState.Queued */]: testingColorIconQueued,
    [0 /* TestResultState.Unset */]: testingColorIconUnset,
    [5 /* TestResultState.Skipped */]: testingColorIconSkipped,
};
export const testingRetiredColorIconErrored = registerColor('testing.iconErrored.retired', transparent(testingColorIconErrored, 0.7), localize('testing.iconErrored.retired', "Retired color for the 'Errored' icon in the test explorer."));
export const testingRetiredColorIconFailed = registerColor('testing.iconFailed.retired', transparent(testingColorIconFailed, 0.7), localize('testing.iconFailed.retired', "Retired color for the 'failed' icon in the test explorer."));
export const testingRetiredColorIconPassed = registerColor('testing.iconPassed.retired', transparent(testingColorIconPassed, 0.7), localize('testing.iconPassed.retired', "Retired color for the 'passed' icon in the test explorer."));
export const testingRetiredColorIconQueued = registerColor('testing.iconQueued.retired', transparent(testingColorIconQueued, 0.7), localize('testing.iconQueued.retired', "Retired color for the 'Queued' icon in the test explorer."));
export const testingRetiredColorIconUnset = registerColor('testing.iconUnset.retired', transparent(testingColorIconUnset, 0.7), localize('testing.iconUnset.retired', "Retired color for the 'Unset' icon in the test explorer."));
export const testingRetiredColorIconSkipped = registerColor('testing.iconSkipped.retired', transparent(testingColorIconSkipped, 0.7), localize('testing.iconSkipped.retired', "Retired color for the 'Skipped' icon in the test explorer."));
export const testStatesToRetiredIconColors = {
    [6 /* TestResultState.Errored */]: testingRetiredColorIconErrored,
    [4 /* TestResultState.Failed */]: testingRetiredColorIconFailed,
    [3 /* TestResultState.Passed */]: testingRetiredColorIconPassed,
    [1 /* TestResultState.Queued */]: testingRetiredColorIconQueued,
    [0 /* TestResultState.Unset */]: testingRetiredColorIconUnset,
    [5 /* TestResultState.Skipped */]: testingRetiredColorIconSkipped,
};
registerThemingParticipant((theme, collector) => {
    const editorBg = theme.getColor(editorBackground);
    collector.addRule(`
	.coverage-deco-inline.coverage-deco-hit.coverage-deco-hovered {
		background: ${theme.getColor(testingCoveredBackground)?.transparent(1.3)};
		outline-color: ${theme.getColor(testingCoveredBorder)?.transparent(2)};
	}
	.coverage-deco-inline.coverage-deco-miss.coverage-deco-hovered {
		background: ${theme.getColor(testingUncoveredBackground)?.transparent(1.3)};
		outline-color: ${theme.getColor(testingUncoveredBorder)?.transparent(2)};
	}
		`);
    if (editorBg) {
        const missBadgeBackground = theme
            .getColor(testingUncoveredBackground)
            ?.transparent(2)
            .makeOpaque(editorBg);
        const errorBadgeBackground = theme.getColor(messageBadgeBackground)?.makeOpaque(editorBg);
        collector.addRule(`
			.coverage-deco-branch-miss-indicator::before {
				border-color: ${missBadgeBackground?.transparent(1.3)};
				background-color: ${missBadgeBackground};
			}
			.monaco-workbench .test-error-content-widget .inner{
				background: ${errorBadgeBackground};
			}
			.monaco-workbench .test-error-content-widget .inner .arrow svg {
				fill: ${errorBadgeBackground};
			}
		`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGhlbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsNEJBQTRCLEVBQzVCLGVBQWUsRUFDZixlQUFlLEVBQ2YsV0FBVyxFQUNYLFNBQVMsRUFDVCxjQUFjLEVBQ2QsWUFBWSxFQUNaLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLGdCQUFnQixFQUNoQixvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLGFBQWEsRUFDYixXQUFXLEdBQ1gsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUc5RixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxhQUFhLENBQ2xELG9CQUFvQixFQUNwQjtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFDRCxRQUFRLENBQUMsb0JBQW9CLEVBQUUsbURBQW1ELENBQUMsQ0FDbkYsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FDbkQscUJBQXFCLEVBQ3JCO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixLQUFLLEVBQUUsU0FBUztJQUNoQixNQUFNLEVBQUUsU0FBUztJQUNqQixPQUFPLEVBQUUsU0FBUztDQUNsQixFQUNELFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxvREFBb0QsQ0FBQyxDQUNyRixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sc0JB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