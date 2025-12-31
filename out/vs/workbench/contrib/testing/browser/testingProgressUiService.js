/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExplorerTestCoverageBars } from './testCoverageBars.js';
import { getTestingConfiguration, } from '../common/configuration.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { isFailedState } from '../common/testingStates.js';
import { ITestResultService } from '../common/testResultService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
/** Workbench contribution that triggers updates in the TestingProgressUi service */
let TestingProgressTrigger = class TestingProgressTrigger extends Disposable {
    constructor(resultService, testCoverageService, configurationService, viewsService) {
        super();
        this.configurationService = configurationService;
        this.viewsService = viewsService;
        this._register(resultService.onResultsChanged((e) => {
            if ('started' in e) {
                this.attachAutoOpenForNewResults(e.started);
            }
        }));
        const barContributionRegistration = autorun((reader) => {
            const hasCoverage = !!testCoverageService.selected.read(reader);
            if (!hasCoverage) {
                return;
            }
            barContributionRegistration.dispose();
            ExplorerTestCoverageBars.register();
        });
        this._register(barContributionRegistration);
    }
    attachAutoOpenForNewResults(result) {
        if (result.request.preserveFocus === true) {
            return;
        }
        const cfg = getTestingConfiguration(this.configurationService, "testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */);
        if (cfg === "neverOpen" /* AutoOpenTesting.NeverOpen */) {
            return;
        }
        if (cfg === "openExplorerOnTestStart" /* AutoOpenTesting.OpenExplorerOnTestStart */) {
            return this.openExplorerView();
        }
        if (cfg === "openOnTestStart" /* AutoOpenTesting.OpenOnTestStart */) {
            return this.openResultsView();
        }
        // open on failure
        const disposable = new DisposableStore();
        disposable.add(result.onComplete(() => disposable.dispose()));
        disposable.add(result.onChange((e) => {
            if (e.reason === 1 /* TestResultItemChangeReason.OwnStateChange */ &&
                isFailedState(e.item.ownComputedState)) {
                this.openResultsView();
                disposable.dispose();
            }
        }));
    }
    openExplorerView() {
        this.viewsService.openView("workbench.view.testing" /* Testing.ExplorerViewId */, false);
    }
    openResultsView() {
        this.viewsService.openView("workbench.panel.testResults.view" /* Testing.ResultsViewId */, false);
    }
};
TestingProgressTrigger = __decorate([
    __param(0, ITestResultService),
    __param(1, ITestCoverageService),
    __param(2, IConfigurationService),
    __param(3, IViewsService)
], TestingProgressTrigger);
export { TestingProgressTrigger };
export const collectTestStateCounts = (isRunning, results) => {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let running = 0;
    let queued = 0;
    for (const result of results) {
        const count = result.counts;
        failed += count[6 /* TestResultState.Errored */] + count[4 /* TestResultState.Failed */];
        passed += count[3 /* TestResultState.Passed */];
        skipped += count[5 /* TestResultState.Skipped */];
        running += count[2 /* TestResultState.Running */];
        queued += count[1 /* TestResultState.Queued */];
    }
    return {
        isRunning,
        passed,
        failed,
        runSoFar: passed + failed,
        totalWillBeRun: passed + failed + queued + running,
        skipped,
    };
};
export const getTestProgressText = ({ isRunning, passed, runSoFar, totalWillBeRun, skipped, failed, }) => {
    let percent = (passed / runSoFar) * 100;
    if (failed > 0) {
        // fix: prevent from rounding to 100 if there's any failed test
        percent = Math.min(percent, 99.9);
    }
    else if (runSoFar === 0) {
        percent = 0;
    }
    if (isRunning) {
        if (runSoFar === 0) {
            return localize('testProgress.runningInitial', 'Running tests...');
        }
        else if (skipped === 0) {
            return localize('testProgress.running', 'Running tests, {0}/{1} passed ({2}%)', passed, totalWillBeRun, percent.toPrecision(3));
        }
        else {
            return localize('testProgressWithSkip.running', 'Running tests, {0}/{1} tests passed ({2}%, {3} skipped)', passed, totalWillBeRun, percent.toPrecision(3), skipped);
        }
    }
    else {
        if (skipped === 0) {
            return localize('testProgress.completed', '{0}/{1} tests passed ({2}%)', passed, runSoFar, percent.toPrecision(3));
        }
        else {
            return localize('testProgressWithSkip.completed', '{0}/{1} tests passed ({2}%, {3} skipped)', passed, runSoFar, percent.toPrecision(3), skipped);
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1Byb2dyZXNzVWlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RpbmdQcm9ncmVzc1VpU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEUsT0FBTyxFQUVOLHVCQUF1QixHQUV2QixNQUFNLDRCQUE0QixDQUFBO0FBRW5DLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsb0ZBQW9GO0FBQzdFLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQUNyRCxZQUNxQixhQUFpQyxFQUMvQixtQkFBeUMsRUFDdkIsb0JBQTJDLEVBQ25ELFlBQTJCO1FBRTNELEtBQUssRUFBRSxDQUFBO1FBSGlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFJM0QsSUFBSSxDQUFDLFNB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