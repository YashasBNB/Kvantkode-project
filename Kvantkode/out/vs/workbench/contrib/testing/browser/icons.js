/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon, spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { testingColorRunAction, testStatesToIconColors, testStatesToRetiredIconColors, } from './theme.js';
export const testingViewIcon = registerIcon('test-view-icon', Codicon.beaker, localize('testViewIcon', 'View icon of the test view.'));
export const testingResultsIcon = registerIcon('test-results-icon', Codicon.checklist, localize('testingResultsIcon', 'Icons for test results.'));
export const testingRunIcon = registerIcon('testing-run-icon', Codicon.run, localize('testingRunIcon', 'Icon of the "run test" action.'));
export const testingRerunIcon = registerIcon('testing-rerun-icon', Codicon.debugRerun, localize('testingRerunIcon', 'Icon of the "rerun tests" action.'));
export const testingRunAllIcon = registerIcon('testing-run-all-icon', Codicon.runAll, localize('testingRunAllIcon', 'Icon of the "run all tests" action.'));
// todo: https://github.com/microsoft/vscode-codicons/issues/72
export const testingDebugAllIcon = registerIcon('testing-debug-all-icon', Codicon.debugAltSmall, localize('testingDebugAllIcon', 'Icon of the "debug all tests" action.'));
export const testingDebugIcon = registerIcon('testing-debug-icon', Codicon.debugAltSmall, localize('testingDebugIcon', 'Icon of the "debug test" action.'));
export const testingCoverageIcon = registerIcon('testing-coverage-icon', Codicon.runCoverage, localize('testingCoverageIcon', 'Icon of the "run test with coverage" action.'));
export const testingCoverageAllIcon = registerIcon('testing-coverage-all-icon', Codicon.runAllCoverage, localize('testingRunAllWithCoverageIcon', 'Icon of the "run all tests with coverage" action.'));
export const testingCancelIcon = registerIcon('testing-cancel-icon', Codicon.debugStop, localize('testingCancelIcon', 'Icon to cancel ongoing test runs.'));
export const testingFilterIcon = registerIcon('testing-filter', Codicon.filter, localize('filterIcon', "Icon for the 'Filter' action in the testing view."));
export const testingHiddenIcon = registerIcon('testing-hidden', Codicon.eyeClosed, localize('hiddenIcon', "Icon shown beside hidden tests, when they've been shown."));
export const testingShowAsList = registerIcon('testing-show-as-list-icon', Codicon.listTree, localize('testingShowAsList', 'Icon shown when the test explorer is disabled as a tree.'));
export const testingShowAsTree = registerIcon('testing-show-as-list-icon', Codicon.listFlat, localize('testingShowAsTree', 'Icon shown when the test explorer is disabled as a list.'));
export const testingUpdateProfiles = registerIcon('testing-update-profiles', Codicon.gear, localize('testingUpdateProfiles', 'Icon shown to update test profiles.'));
export const testingRefreshTests = registerIcon('testing-refresh-tests', Codicon.refresh, localize('testingRefreshTests', 'Icon on the button to refresh tests.'));
export const testingTurnContinuousRunOn = registerIcon('testing-turn-continuous-run-on', Codicon.eye, localize('testingTurnContinuousRunOn', 'Icon to turn continuous test runs on.'));
export const testingTurnContinuousRunOff = registerIcon('testing-turn-continuous-run-off', Codicon.eyeClosed, localize('testingTurnContinuousRunOff', 'Icon to turn continuous test runs off.'));
export const testingContinuousIsOn = registerIcon('testing-continuous-is-on', Codicon.eye, localize('testingTurnContinuousRunIsOn', 'Icon when continuous run is on for a test ite,.'));
export const testingCancelRefreshTests = registerIcon('testing-cancel-refresh-tests', Codicon.stop, localize('testingCancelRefreshTests', 'Icon on the button to cancel refreshing tests.'));
export const testingCoverageReport = registerIcon('testing-coverage', Codicon.coverage, localize('testingCoverage', 'Icon representing test coverage'));
export const testingWasCovered = registerIcon('testing-was-covered', Codicon.check, localize('testingWasCovered', 'Icon representing that an element was covered'));
export const testingCoverageMissingBranch = registerIcon('testing-missing-branch', Codicon.question, localize('testingMissingBranch', 'Icon representing a uncovered block without a range'));
export const testingStatesToIcons = new Map([
    [
        6 /* TestResultState.Errored */,
        registerIcon('testing-error-icon', Codicon.issues, localize('testingErrorIcon', 'Icon shown for tests that have an error.')),
    ],
    [
        4 /* TestResultState.Failed */,
        registerIcon('testing-failed-icon', Codicon.error, localize('testingFailedIcon', 'Icon shown for tests that failed.')),
    ],
    [
        3 /* TestResultState.Passed */,
        registerIcon('testing-passed-icon', Codicon.pass, localize('testingPassedIcon', 'Icon shown for tests that passed.')),
    ],
    [
        1 /* TestResultState.Queued */,
        registerIcon('testing-queued-icon', Codicon.history, localize('testingQueuedIcon', 'Icon shown for tests that are queued.')),
    ],
    [2 /* TestResultState.Running */, spinningLoading],
    [
        5 /* TestResultState.Skipped */,
        registerIcon('testing-skipped-icon', Codicon.debugStepOver, localize('testingSkippedIcon', 'Icon shown for tests that are skipped.')),
    ],
    [
        0 /* TestResultState.Unset */,
        registerIcon('testing-unset-icon', Codicon.circleOutline, localize('testingUnsetIcon', 'Icon shown for tests that are in an unset state.')),
    ],
]);
registerThemingParticipant((theme, collector) => {
    for (const [state, icon] of testingStatesToIcons.entries()) {
        const color = testStatesToIconColors[state];
        const retiredColor = testStatesToRetiredIconColors[state];
        if (!color) {
            continue;
        }
        collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icon)} {
			color: ${theme.getColor(color)} !important;
		}`);
        if (!retiredColor) {
            continue;
        }
        collector.addRule(`
			.test-explorer .computed-state.retired${ThemeIcon.asCSSSelector(icon)},
			.testing-run-glyph.retired${ThemeIcon.asCSSSelector(icon)}{
				color: ${theme.getColor(retiredColor)} !important;
			}
		`);
    }
    collector.addRule(`
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunAllIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugAllIcon)} {
			color: ${theme.getColor(testingColorRunAction)};
		}
	`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9pY29ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsc0JBQXNCLEVBQ3RCLDZCQUE2QixHQUM3QixNQUFNLFlBQVksQ0FBQTtBQUduQixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUMxQyxnQkFBZ0IsRUFDaEIsT0FBTyxDQUFDLE1BQU0sRUFDZCxRQUFRLENBQUMsY0FBYyxFQUFFLDZCQUE2QixDQUFDLENBQ3ZELENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQzdDLG1CQUFtQixFQUNuQixPQUFPLENBQUMsU0FBUyxFQUNqQixRQUFRLENBQUMsb0JBQW9CLEVBQUUseUJBQXlCLENBQUMsQ0FDekQsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQ3pDLGtCQUFrQixFQUNsQixPQUFPLENBQUMsR0FBRyxFQUNYLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUM1RCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUMzQyxvQkFBb0Is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