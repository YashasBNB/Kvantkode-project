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
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../base/common/lifecycle.js';
import { observableValue, transaction, } from '../../../base/common/observable.js';
import { WellDefinedPrefixTree } from '../../../base/common/prefixTree.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { TestCoverage } from '../../contrib/testing/common/testCoverage.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { ITestProfileService } from '../../contrib/testing/common/testProfileService.js';
import { LiveTestResult } from '../../contrib/testing/common/testResult.js';
import { ITestResultService } from '../../contrib/testing/common/testResultService.js';
import { ITestService, } from '../../contrib/testing/common/testService.js';
import { CoverageDetails, IFileCoverage, ITestItem, ITestMessage, TestsDiffOp, } from '../../contrib/testing/common/testTypes.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
let MainThreadTesting = class MainThreadTesting extends Disposable {
    constructor(extHostContext, uriIdentityService, testService, testProfiles, resultService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.testService = testService;
        this.testProfiles = testProfiles;
        this.resultService = resultService;
        this.diffListener = this._register(new MutableDisposable());
        this.testProviderRegistrations = new Map();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostTesting);
        this._register(this.testService.registerExtHost({
            provideTestFollowups: (req, token) => this.proxy.$provideTestFollowups(req, token),
            executeTestFollowup: (id) => this.proxy.$executeTestFollowup(id),
            disposeTestFollowups: (ids) => this.proxy.$disposeTestFollowups(ids),
            getTestsRelatedToCode: (uri, position, token) => this.proxy.$getTestsRelatedToCode(uri, position, token),
        }));
        this._register(this.testService.onDidCancelTestRun(({ runId, taskId }) => {
            this.proxy.$cancelExtensionTestRun(runId, taskId);
        }));
        this._register(Event.debounce(testProfiles.onDidChange, (_last, e) => e)(() => {
            const obj = {};
            for (const group of [
                2 /* TestRunProfileBitset.Run */,
                4 /* TestRunProfileBitset.Debug */,
                8 /* TestRunProfileBitset.Coverage */,
            ]) {
                for (const profile of this.testProfiles.getGroupDefaultProfiles(group)) {
                    obj[profile.controllerId] ??= [];
                    obj[profile.controllerId].push(profile.profileId);
                }
            }
            this.proxy.$setDefaultRunProfiles(obj);
        }));
        this._register(resultService.onResultsChanged((evt) => {
            if ('completed' in evt) {
                const serialized = evt.completed.toJSONWithMessages();
                if (serialized) {
                    this.proxy.$publishTestResults([serialized]);
                }
            }
            else if ('removed' in evt) {
                evt.removed.forEach((r) => {
                    if (r instanceof LiveTestResult) {
                        this.proxy.$disposeRun(r.id);
                    }
                });
            }
        }));
    }
    /**
     * @inheritdoc
     */
    $markTestRetired(testIds) {
        let tree;
        if (testIds) {
            tree = new WellDefinedPrefixTree();
            for (const id of testIds) {
                tree.insert(TestId.fromString(id).path, undefined);
            }
        }
        for (const result of this.resultService.results) {
            // all non-live results are already entirely outdated
            if (result instanceof LiveTestResult) {
                result.markRetired(tree);
            }
        }
    }
    /**
     * @inheritdoc
     */
    $publishTestRunProfile(profile) {
        const controller = this.testProviderRegistrations.get(profile.controllerId);
        if (controller) {
            this.testProfiles.addProfile(controller.instance, profile);
        }
    }
    /**
     * @inheritdoc
     */
    $updateTestRunConfig(controllerId, profileId, update) {
        this.testProfiles.updateProfile(controllerId, profileId, update);
    }
    /**
     * @inheritdoc
     */
    $removeTestProfile(controllerId, profileId) {
        this.testProfiles.removeProfile(controllerId, profileId);
    }
    /**
     * @inheritdoc
     */
    $addTestsToRun(controllerId, runId, tests) {
        this.withLiveRun(runId, (r) => r.addTestChainToRun(controllerId, tests.map((t) => ITestItem.deserialize(this.uriIdentityService, t))));
    }
    /**
     * @inheritdoc
     */
    $appendCoverage(runId, taskId, coverage) {
        this.withLiveRun(runId, (run) => {
            const task = run.tasks.find((t) => t.id === taskId);
            if (!task) {
                return;
            }
            const deserialized = IFileCoverage.deserialize(this.uriIdentityService, coverage);
            transaction((tx) => {
                let value = task.coverage.read(undefined);
                if (!value) {
                    value = new TestCoverage(run, taskId, this.uriIdentityService, {
                        getCoverageDetails: (id, testId, token) => this.proxy
                            .$getCoverageDetails(id, testId, token)
                            .then((r) => r.map(CoverageDetails.deserialize)),
                    });
                    value.append(deserialized, tx);
                    task.coverage.set(value, tx);
                }
                else {
                    value.append(deserialized, tx);
                }
            });
        });
    }
    /**
     * @inheritdoc
     */
    $startedExtensionTestRun(req) {
        this.resultService.createLiveResult(req);
    }
    /**
     * @inheritdoc
     */
    $startedTestRunTask(runId, task) {
        this.withLiveRun(runId, (r) => r.addTask(task));
    }
    /**
     * @inheritdoc
     */
    $finishedTestRunTask(runId, taskId) {
        this.withLiveRun(runId, (r) => r.markTaskComplete(taskId));
    }
    /**
     * @inheritdoc
     */
    $finishedExtensionTestRun(runId) {
        this.withLiveRun(runId, (r) => r.markComplete());
    }
    /**
     * @inheritdoc
     */
    $updateTestStateInRun(runId, taskId, testId, state, duration) {
        this.withLiveRun(runId, (r) => r.updateState(testId, taskId, state, duration));
    }
    /**
     * @inheritdoc
     */
    $appendOutputToRun(runId, taskId, output, locationDto, testId) {
        const location = locationDto && {
            uri: URI.revive(locationDto.uri),
            range: Range.lift(locationDto.range),
        };
        this.withLiveRun(runId, (r) => r.appendOutput(output, taskId, location, testId));
    }
    /**
     * @inheritdoc
     */
    $appendTestMessagesInRun(runId, taskId, testId, messages) {
        const r = this.resultService.getResult(runId);
        if (r && r instanceof LiveTestResult) {
            for (const message of messages) {
                r.appendMessage(testId, taskId, ITestMessage.deserialize(this.uriIdentityService, message));
            }
        }
    }
    /**
     * @inheritdoc
     */
    $registerTestController(controllerId, _label, _capabilities) {
        const disposable = new DisposableStore();
        const label = observableValue(`${controllerId}.label`, _label);
        const capabilities = observableValue(`${controllerId}.cap`, _capabilities);
        const controller = {
            id: controllerId,
            label,
            capabilities,
            syncTests: () => this.proxy.$syncTests(),
            refreshTests: (token) => this.proxy.$refreshTests(controllerId, token),
            configureRunProfile: (id) => this.proxy.$configureRunProfile(controllerId, id),
            runTests: (reqs, token) => this.proxy.$runControllerTests(reqs, token),
            startContinuousRun: (reqs, token) => this.proxy.$startContinuousRun(reqs, token),
            expandTest: (testId, levels) => this.proxy.$expandTest(testId, isFinite(levels) ? levels : -1),
            getRelatedCode: (testId, token) => this.proxy.$getCodeRelatedToTest(testId, token).then((locations) => locations.map((l) => ({
                uri: URI.revive(l.uri),
                range: Range.lift(l.range),
            }))),
        };
        disposable.add(toDisposable(() => this.testProfiles.removeProfile(controllerId)));
        disposable.add(this.testService.registerTestController(controllerId, controller));
        this.testProviderRegistrations.set(controllerId, {
            instance: controller,
            label,
            capabilities,
            disposable,
        });
    }
    /**
     * @inheritdoc
     */
    $updateController(controllerId, patch) {
        const controller = this.testProviderRegistrations.get(controllerId);
        if (!controller) {
            return;
        }
        transaction((tx) => {
            if (patch.label !== undefined) {
                controller.label.set(patch.label, tx);
            }
            if (patch.capabilities !== undefined) {
                controller.capabilities.set(patch.capabilities, tx);
            }
        });
    }
    /**
     * @inheritdoc
     */
    $unregisterTestController(controllerId) {
        this.testProviderRegistrations.get(controllerId)?.disposable.dispose();
        this.testProviderRegistrations.delete(controllerId);
    }
    /**
     * @inheritdoc
     */
    $subscribeToDiffs() {
        this.proxy.$acceptDiff(this.testService.collection.getReviverDiff().map(TestsDiffOp.serialize));
        this.diffListener.value = this.testService.onDidProcessDiff(this.proxy.$acceptDiff, this.proxy);
    }
    /**
     * @inheritdoc
     */
    $unsubscribeFromDiffs() {
        this.diffListener.clear();
    }
    /**
     * @inheritdoc
     */
    $publishDiff(controllerId, diff) {
        this.testService.publishDiff(controllerId, diff.map((d) => TestsDiffOp.deserialize(this.uriIdentityService, d)));
    }
    /**
     * @inheritdoc
     */
    async $runTests(req, token) {
        const result = await this.testService.runResolvedTests(req, token);
        return result.id;
    }
    /**
     * @inheritdoc
     */
    async $getCoverageDetails(resultId, taskIndex, uri, token) {
        const details = await this.resultService
            .getResult(resultId)
            ?.tasks[taskIndex]?.coverage.get()
            ?.getUri(URI.from(uri))
            ?.details(token);
        // Return empty if nothing. Some failure is always possible here because
        // results might be cleared in the meantime.
        return details || [];
    }
    dispose() {
        super.dispose();
        for (const subscription of this.testProviderRegistrations.values()) {
            subscription.disposable.dispose();
        }
        this.testProviderRegistrations.clear();
    }
    withLiveRun(runId, fn) {
        const r = this.resultService.getResult(runId);
        return r && r instanceof LiveTestResult ? fn(r) : undefined;
    }
};
MainThreadTesting = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTesting),
    __param(1, IUriIdentityService),
    __param(2, ITestService),
    __param(3, ITestProfileService),
    __param(4, ITestResultService)
], MainThreadTesting);
export { MainThreadTesting };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFRlc3RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBRU4sZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3RGLE9BQU8sRUFFTixZQUFZLEdBQ1osTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sZUFBZSxFQUVmLGFBQWEsRUFDYixTQUFTLEVBQ1QsWUFBWSxFQU9aLFdBQVcsR0FDWCxNQUFNLDJDQUEyQyxD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