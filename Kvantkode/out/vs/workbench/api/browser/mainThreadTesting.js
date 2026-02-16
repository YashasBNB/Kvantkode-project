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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVGVzdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFFTixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdEYsT0FBTyxFQUVOLFlBQVksR0FDWixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFDTixlQUFlLEVBRWYsYUFBYSxFQUNiLFNBQVMsRUFDVCxZQUFZLEVBT1os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