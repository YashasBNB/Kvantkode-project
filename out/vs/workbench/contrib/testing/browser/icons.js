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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvaWNvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLHNCQUFzQixFQUN0Qiw2QkFBNkIsR0FDN0IsTUFBTSxZQUFZLENBQUE7QUFHbkIsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FDMUMsZ0JBQWdCLEVBQ2hCLE9BQU8sQ0FBQyxNQUFNLEVBQ2QsUUFBUSxDQUFDLGNBQWMsRUFBRSw2QkFBNkIsQ0FBQyxDQUN2RCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUM3QyxtQkFBbUIsRUFDbkIsT0FBTyxDQUFDLFNBQVMsRUFDakIsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHlCQUF5QixDQUFDLENBQ3pELENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUN6QyxrQkFBa0IsRUFDbEIsT0FBTyxDQUFDLEdBQUcsRUFDWCxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsZ0NBQWdDLENBQUMsQ0FDNUQsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FDM0Msb0JBQW9CLEVBQ3BC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