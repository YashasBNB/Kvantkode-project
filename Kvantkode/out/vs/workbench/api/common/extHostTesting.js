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
import { RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { isDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { InvalidTestItemError } from '../../contrib/testing/common/testItemCollection.js';
import { AbstractIncrementalTestCollection, TestsDiffOp, isStartControllerTests, } from '../../contrib/testing/common/testTypes.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostCommands } from './extHostCommands.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostTestItemCollection, TestItemImpl, TestItemRootImpl, toItemFromContext, } from './extHostTestItem.js';
import * as Convert from './extHostTypeConverters.js';
import { FileCoverage, TestRunProfileBase, TestRunRequest } from './extHostTypes.js';
let followupCounter = 0;
const testResultInternalIDs = new WeakMap();
export const IExtHostTesting = createDecorator('IExtHostTesting');
let ExtHostTesting = class ExtHostTesting extends Disposable {
    constructor(rpc, logService, commands, editors) {
        super();
        this.logService = logService;
        this.commands = commands;
        this.editors = editors;
        this.resultsChangedEmitter = this._register(new Emitter());
        this.controllers = new Map();
        this.defaultProfilesChangedEmitter = this._register(new Emitter());
        this.followupProviders = new Set();
        this.testFollowups = new Map();
        this.onResultsChanged = this.resultsChangedEmitter.event;
        this.results = [];
        this.proxy = rpc.getProxy(MainContext.MainThreadTesting);
        this.observer = new TestObservers(this.proxy);
        this.runTracker = new TestRunCoordinator(this.proxy, logService);
        commands.registerArgumentProcessor({
            processArgument: (arg) => {
                switch (arg?.$mid) {
                    case 16 /* MarshalledId.TestItemContext */: {
                        const cast = arg;
                        const targetTest = cast.tests[cast.tests.length - 1].item.extId;
                        const controller = this.controllers.get(TestId.root(targetTest));
                        return controller?.collection.tree.get(targetTest)?.actual ?? toItemFromContext(arg);
                    }
                    case 18 /* MarshalledId.TestMessageMenuArgs */: {
                        const { test, message } = arg;
                        const extId = test.item.extId;
                        return {
                            test: this.controllers.get(TestId.root(extId))?.collection.tree.get(extId)?.actual ??
                                toItemFromContext({ $mid: 16 /* MarshalledId.TestItemContext */, tests: [test] }),
                            message: Convert.TestMessage.to(message),
                        };
                    }
                    default:
                        return arg;
                }
            },
        });
        commands.registerCommand(false, 'testing.getExplorerSelection', async () => {
            const inner = await commands.executeCommand("_testing.getExplorerSelection" /* TestCommandId.GetExplorerSelection */);
            const lookup = (i) => {
                const controller = this.controllers.get(TestId.root(i));
                if (!controller) {
                    return undefined;
                }
                return TestId.isRoot(i) ? controller.controller : controller.collection.tree.get(i)?.actual;
            };
            return {
                include: inner?.include.map(lookup).filter(isDefined) || [],
                exclude: inner?.exclude.map(lookup).filter(isDefined) || [],
            };
        });
    }
    //#region public API
    /**
     * Implements vscode.test.registerTestProvider
     */
    createTestController(extension, controllerId, label, refreshHandler) {
        if (this.controllers.has(controllerId)) {
            throw new Error(`Attempt to insert a duplicate controller with ID "${controllerId}"`);
        }
        const disposable = new DisposableStore();
        const collection = disposable.add(new ExtHostTestItemCollection(controllerId, label, this.editors));
        collection.root.label = label;
        const profiles = new Map();
        const activeProfiles = new Set();
        const proxy = this.proxy;
        const getCapability = () => {
            let cap = 0;
            if (refreshHandler) {
                cap |= 2 /* TestControllerCapability.Refresh */;
            }
            const rcp = info.relatedCodeProvider;
            if (rcp) {
                if (rcp?.provideRelatedTests) {
                    cap |= 8 /* TestControllerCapability.TestRelatedToCode */;
                }
                if (rcp?.provideRelatedCode) {
                    cap |= 4 /* TestControllerCapability.CodeRelatedToTest */;
                }
            }
            return cap;
        };
        const controller = {
            items: collection.root.children,
            get label() {
                return label;
            },
            set label(value) {
                label = value;
                collection.root.label = value;
                proxy.$updateController(controllerId, { label });
            },
            get refreshHandler() {
                return refreshHandler;
            },
            set refreshHandler(value) {
                refreshHandler = value;
                proxy.$updateController(controllerId, { capabilities: getCapability() });
            },
            get id() {
                return controllerId;
            },
            get relatedCodeProvider() {
                return info.relatedCodeProvider;
            },
            set relatedCodeProvider(value) {
                checkProposedApiEnabled(extension, 'testRelatedCode');
                info.relatedCodeProvider = value;
                proxy.$updateController(controllerId, { capabilities: getCapability() });
            },
            createRunProfile: (label, group, runHandler, isDefault, tag, supportsContinuousRun) => {
                // Derive the profile ID from a hash so that the same profile will tend
                // to have the same hashes, allowing re-run requests to work across reloads.
                let profileId = hash(label);
                while (profiles.has(profileId)) {
                    profileId++;
                }
                return new TestRunProfileImpl(this.proxy, profiles, activeProfiles, this.defaultProfilesChangedEmitter.event, controllerId, profileId, label, group, runHandler, isDefault, tag, supportsContinuousRun);
            },
            createTestItem(id, label, uri) {
                return new TestItemImpl(controllerId, id, label, uri);
            },
            createTestRun: (request, name, persist = true) => {
                return this.runTracker.createTestRun(extension, controllerId, collection, request, name, persist);
            },
            invalidateTestResults: (items) => {
                if (items === undefined) {
                    this.proxy.$markTestRetired(undefined);
                }
                else {
                    const itemsArr = items instanceof Array ? items : [items];
                    this.proxy.$markTestRetired(itemsArr.map((i) => TestId.fromExtHostTestItem(i, controllerId).toString()));
                }
            },
            set resolveHandler(fn) {
                collection.resolveHandler = fn;
            },
            get resolveHandler() {
                return collection.resolveHandler;
            },
            dispose: () => {
                disposable.dispose();
            },
        };
        const info = { controller, collection, profiles, extension, activeProfiles };
        proxy.$registerTestController(controllerId, label, getCapability());
        disposable.add(toDisposable(() => proxy.$unregisterTestController(controllerId)));
        this.controllers.set(controllerId, info);
        disposable.add(toDisposable(() => this.controllers.delete(controllerId)));
        disposable.add(collection.onDidGenerateDiff((diff) => proxy.$publishDiff(controllerId, diff.map(TestsDiffOp.serialize))));
        return controller;
    }
    /**
     * Implements vscode.test.createTestObserver
     */
    createTestObserver() {
        return this.observer.checkout();
    }
    /**
     * Implements vscode.test.runTests
     */
    async runTests(req, token = CancellationToken.None) {
        const profile = tryGetProfileFromTestRunReq(req);
        if (!profile) {
            throw new Error('The request passed to `vscode.test.runTests` must include a profile');
        }
        const controller = this.controllers.get(profile.controllerId);
        if (!controller) {
            throw new Error('Controller not found');
        }
        await this.proxy.$runTests({
            preserveFocus: req.preserveFocus ?? true,
            group: Convert.TestRunProfileKind.from(profile.kind),
            targets: [
                {
                    testIds: req.include?.map((t) => TestId.fromExtHostTestItem(t, controller.collection.root.id).toString()) ?? [controller.collection.root.id],
                    profileId: profile.profileId,
                    controllerId: profile.controllerId,
                },
            ],
            exclude: req.exclude?.map((t) => t.id),
        }, token);
    }
    /**
     * Implements vscode.test.registerTestFollowupProvider
     */
    registerTestFollowupProvider(provider) {
        this.followupProviders.add(provider);
        return {
            dispose: () => {
                this.followupProviders.delete(provider);
            },
        };
    }
    //#endregion
    //#region RPC methods
    /**
     * @inheritdoc
     */
    async $getTestsRelatedToCode(uri, _position, token) {
        const doc = this.editors.getDocument(URI.revive(uri));
        if (!doc) {
            return [];
        }
        const position = Convert.Position.to(_position);
        const related = [];
        await Promise.all([...this.controllers.values()].map(async (c) => {
            let tests;
            try {
                tests = await c.relatedCodeProvider?.provideRelatedTests?.(doc.document, position, token);
            }
            catch (e) {
                if (!token.isCancellationRequested) {
                    this.logService.warn(`Error thrown while providing related tests for ${c.controller.label}`, e);
                }
            }
            if (tests) {
                for (const test of tests) {
                    related.push(TestId.fromExtHostTestItem(test, c.controller.id).toString());
                }
                c.collection.flushDiff();
            }
        }));
        return related;
    }
    /**
     * @inheritdoc
     */
    async $getCodeRelatedToTest(testId, token) {
        const controller = this.controllers.get(TestId.root(testId));
        if (!controller) {
            return [];
        }
        const test = controller.collection.tree.get(testId);
        if (!test) {
            return [];
        }
        const locations = await controller.relatedCodeProvider?.provideRelatedCode?.(test.actual, token);
        return locations?.map(Convert.location.from) ?? [];
    }
    /**
     * @inheritdoc
     */
    $syncTests() {
        for (const { collection } of this.controllers.values()) {
            collection.flushDiff();
        }
        return Promise.resolve();
    }
    /**
     * @inheritdoc
     */
    async $getCoverageDetails(coverageId, testId, token) {
        const details = await this.runTracker.getCoverageDetails(coverageId, testId, token);
        return details?.map(Convert.TestCoverage.fromDetails);
    }
    /**
     * @inheritdoc
     */
    async $disposeRun(runId) {
        this.runTracker.disposeTestRun(runId);
    }
    /** @inheritdoc */
    $configureRunProfile(controllerId, profileId) {
        this.controllers.get(controllerId)?.profiles.get(profileId)?.configureHandler?.();
    }
    /** @inheritdoc */
    $setDefaultRunProfiles(profiles) {
        const evt = new Map();
        for (const [controllerId, profileIds] of Object.entries(profiles)) {
            const ctrl = this.controllers.get(controllerId);
            if (!ctrl) {
                continue;
            }
            const changes = new Map();
            const added = profileIds.filter((id) => !ctrl.activeProfiles.has(id));
            const removed = [...ctrl.activeProfiles].filter((id) => !profileIds.includes(id));
            for (const id of added) {
                changes.set(id, true);
                ctrl.activeProfiles.add(id);
            }
            for (const id of removed) {
                changes.set(id, false);
                ctrl.activeProfiles.delete(id);
            }
            if (changes.size) {
                evt.set(controllerId, changes);
            }
        }
        this.defaultProfilesChangedEmitter.fire(evt);
    }
    /** @inheritdoc */
    async $refreshTests(controllerId, token) {
        await this.controllers.get(controllerId)?.controller.refreshHandler?.(token);
    }
    /**
     * Updates test results shown to extensions.
     * @override
     */
    $publishTestResults(results) {
        this.results = Object.freeze(results
            .map((r) => {
            const o = Convert.TestResults.to(r);
            const taskWithCoverage = r.tasks.findIndex((t) => t.hasCoverage);
            if (taskWithCoverage !== -1) {
                o.getDetailedCoverage = (uri, token = CancellationToken.None) => this.proxy
                    .$getCoverageDetails(r.id, taskWithCoverage, uri, token)
                    .then((r) => r.map(Convert.TestCoverage.to));
            }
            testResultInternalIDs.set(o, r.id);
            return o;
        })
            .concat(this.results)
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, 32));
        this.resultsChangedEmitter.fire();
    }
    /**
     * Expands the nodes in the test tree. If levels is less than zero, it will
     * be treated as infinite.
     */
    async $expandTest(testId, levels) {
        const collection = this.controllers.get(TestId.fromString(testId).controllerId)?.collection;
        if (collection) {
            await collection.expand(testId, levels < 0 ? Infinity : levels);
            collection.flushDiff();
        }
    }
    /**
     * Receives a test update from the main thread. Called (eventually) whenever
     * tests change.
     */
    $acceptDiff(diff) {
        this.observer.applyDiff(diff.map((d) => TestsDiffOp.deserialize({ asCanonicalUri: (u) => u }, d)));
    }
    /**
     * Runs tests with the given set of IDs. Allows for test from multiple
     * providers to be run.
     * @inheritdoc
     */
    async $runControllerTests(reqs, token) {
        return Promise.all(reqs.map((req) => this.runControllerTestRequest(req, false, token)));
    }
    /**
     * Starts continuous test runs with the given set of IDs. Allows for test from
     * multiple providers to be run.
     * @inheritdoc
     */
    async $startContinuousRun(reqs, token) {
        const cts = new CancellationTokenSource(token);
        const res = await Promise.all(reqs.map((req) => this.runControllerTestRequest(req, true, cts.token)));
        // avoid returning until cancellation is requested, otherwise ipc disposes of the token
        if (!token.isCancellationRequested && !res.some((r) => r.error)) {
            await new Promise((r) => token.onCancellationRequested(r));
        }
        cts.dispose(true);
        return res;
    }
    /** @inheritdoc */
    async $provideTestFollowups(req, token) {
        const results = this.results.find((r) => testResultInternalIDs.get(r) === req.resultId);
        const test = results && findTestInResultSnapshot(TestId.fromString(req.extId), results?.results);
        if (!test) {
            return [];
        }
        let followups = [];
        await Promise.all([...this.followupProviders].map(async (provider) => {
            try {
                const r = await provider.provideFollowup(results, test, req.taskIndex, req.messageIndex, token);
                if (r) {
                    followups = followups.concat(r);
                }
            }
            catch (e) {
                this.logService.error(`Error thrown while providing followup for test message`, e);
            }
        }));
        if (token.isCancellationRequested) {
            return [];
        }
        return followups.map((command) => {
            const id = followupCounter++;
            this.testFollowups.set(id, command);
            return { title: command.title, id };
        });
    }
    $disposeTestFollowups(id) {
        for (const i of id) {
            this.testFollowups.delete(i);
        }
    }
    $executeTestFollowup(id) {
        const command = this.testFollowups.get(id);
        if (!command) {
            return Promise.resolve();
        }
        return this.commands.executeCommand(command.command, ...(command.arguments || []));
    }
    /**
     * Cancels an ongoing test run.
     */
    $cancelExtensionTestRun(runId, taskId) {
        if (runId === undefined) {
            this.runTracker.cancelAllRuns();
        }
        else {
            this.runTracker.cancelRunById(runId, taskId);
        }
    }
    //#endregion
    getMetadataForRun(run) {
        for (const tracker of this.runTracker.trackers) {
            const taskId = tracker.getTaskIdForRun(run);
            if (taskId) {
                return { taskId, runId: tracker.id };
            }
        }
        return undefined;
    }
    async runControllerTestRequest(req, isContinuous, token) {
        const lookup = this.controllers.get(req.controllerId);
        if (!lookup) {
            return {};
        }
        const { collection, profiles, extension } = lookup;
        const profile = profiles.get(req.profileId);
        if (!profile) {
            return {};
        }
        const includeTests = req.testIds.map((testId) => collection.tree.get(testId)).filter(isDefined);
        const excludeTests = req.excludeExtIds
            .map((id) => lookup.collection.tree.get(id))
            .filter(isDefined)
            .filter((exclude) => includeTests.some((include) => include.fullId.compare(exclude.fullId) === 2 /* TestPosition.IsChild */));
        if (!includeTests.length) {
            return {};
        }
        const publicReq = new TestRunRequest(includeTests.some((i) => i.actual instanceof TestItemRootImpl)
            ? undefined
            : includeTests.map((t) => t.actual), excludeTests.map((t) => t.actual), profile, isContinuous);
        const tracker = isStartControllerTests(req) &&
            this.runTracker.prepareForMainThreadTestRun(extension, publicReq, TestRunDto.fromInternal(req, lookup.collection), profile, token);
        try {
            await profile.runHandler(publicReq, token);
            return {};
        }
        catch (e) {
            return { error: String(e) };
        }
        finally {
            if (tracker) {
                if (tracker.hasRunningTasks && !token.isCancellationRequested) {
                    await Event.toPromise(tracker.onEnd);
                }
            }
        }
    }
};
ExtHostTesting = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostCommands),
    __param(3, IExtHostDocumentsAndEditors)
], ExtHostTesting);
export { ExtHostTesting };
// Deadline after being requested by a user that a test run is forcibly cancelled.
const RUN_CANCEL_DEADLINE = 10_000;
var TestRunTrackerState;
(function (TestRunTrackerState) {
    // Default state
    TestRunTrackerState[TestRunTrackerState["Running"] = 0] = "Running";
    // Cancellation is requested, but the run is still going.
    TestRunTrackerState[TestRunTrackerState["Cancelling"] = 1] = "Cancelling";
    // All tasks have ended
    TestRunTrackerState[TestRunTrackerState["Ended"] = 2] = "Ended";
})(TestRunTrackerState || (TestRunTrackerState = {}));
class TestRunTracker extends Disposable {
    /**
     * Gets whether there are any tests running.
     */
    get hasRunningTasks() {
        return this.running > 0;
    }
    /**
     * Gets the run ID.
     */
    get id() {
        return this.dto.id;
    }
    constructor(dto, proxy, logService, profile, extension, parentToken) {
        super();
        this.dto = dto;
        this.proxy = proxy;
        this.logService = logService;
        this.profile = profile;
        this.extension = extension;
        this.state = 0 /* TestRunTrackerState.Running */;
        this.running = 0;
        this.tasks = new Map();
        this.sharedTestIds = new Set();
        this.endEmitter = this._register(new Emitter());
        this.publishedCoverage = new Map();
        /**
         * Fires when a test ends, and no more tests are left running.
         */
        this.onEnd = this.endEmitter.event;
        this.cts = this._register(new CancellationTokenSource(parentToken));
        const forciblyEnd = this._register(new RunOnceScheduler(() => this.forciblyEndTasks(), RUN_CANCEL_DEADLINE));
        this._register(this.cts.token.onCancellationRequested(() => forciblyEnd.schedule()));
        const didDisposeEmitter = new Emitter();
        this.onDidDispose = didDisposeEmitter.event;
        this._register(toDisposable(() => {
            didDisposeEmitter.fire();
            didDisposeEmitter.dispose();
        }));
    }
    /** Gets the task ID from a test run object. */
    getTaskIdForRun(run) {
        for (const [taskId, { run: r }] of this.tasks) {
            if (r === run) {
                return taskId;
            }
        }
        return undefined;
    }
    /** Requests cancellation of the run. On the second call, forces cancellation. */
    cancel(taskId) {
        if (taskId) {
            this.tasks.get(taskId)?.cts.cancel();
        }
        else if (this.state === 0 /* TestRunTrackerState.Running */) {
            this.cts.cancel();
            this.state = 1 /* TestRunTrackerState.Cancelling */;
        }
        else if (this.state === 1 /* TestRunTrackerState.Cancelling */) {
            this.forciblyEndTasks();
        }
    }
    /** Gets details for a previously-emitted coverage object. */
    async getCoverageDetails(id, testId, token) {
        const [, taskId] = TestId.fromString(id).path; /** runId, taskId, URI */
        const coverage = this.publishedCoverage.get(id);
        if (!coverage) {
            return [];
        }
        const { report, extIds } = coverage;
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('unreachable: run task was not found');
        }
        let testItem;
        if (testId && report instanceof FileCoverage) {
            const index = extIds.indexOf(testId);
            if (index === -1) {
                return []; // ??
            }
            testItem = report.includesTests[index];
        }
        const details = testItem
            ? this.profile?.loadDetailedCoverageForTest?.(task.run, report, testItem, token)
            : this.profile?.loadDetailedCoverage?.(task.run, report, token);
        return (await details) ?? [];
    }
    /** Creates the public test run interface to give to extensions. */
    createRun(name) {
        const runId = this.dto.id;
        const ctrlId = this.dto.controllerId;
        const taskId = generateUuid();
        const guardTestMutation = (fn) => (test, ...args) => {
            if (ended) {
                this.logService.warn(`Setting the state of test "${test.id}" is a no-op after the run ends.`);
                return;
            }
            this.ensureTestIsKnown(test);
            fn(test, ...args);
        };
        const appendMessages = (test, messages) => {
            const converted = messages instanceof Array
                ? messages.map(Convert.TestMessage.from)
                : [Convert.TestMessage.from(messages)];
            if (test.uri && test.range) {
                const defaultLocation = {
                    range: Convert.Range.from(test.range),
                    uri: test.uri,
                };
                for (const message of converted) {
                    message.location = message.location || defaultLocation;
                }
            }
            this.proxy.$appendTestMessagesInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), converted);
        };
        let ended = false;
        // tasks are alive for as long as the tracker is alive, so simple this._register is fine:
        const cts = this._register(new CancellationTokenSource(this.cts.token));
        // one-off map used to associate test items with incrementing IDs in `addCoverage`.
        // There's no need to include their entire ID, we just want to make sure they're
        // stable and unique. Normal map is okay since TestRun lifetimes are limited.
        const run = {
            isPersisted: this.dto.isPersisted,
            token: cts.token,
            name,
            onDidDispose: this.onDidDispose,
            addCoverage: (coverage) => {
                if (ended) {
                    return;
                }
                const includesTests = coverage instanceof FileCoverage ? coverage.includesTests : [];
                if (includesTests.length) {
                    for (const test of includesTests) {
                        this.ensureTestIsKnown(test);
                    }
                }
                const uriStr = coverage.uri.toString();
                const id = new TestId([runId, taskId, uriStr]).toString();
                // it's a lil funky, but it's possible for a test item's ID to change after
                // it's been reported if it's rehomed under a different parent. Record its
                // ID at the time when the coverage report is generated so we can reference
                // it later if needeed.
                this.publishedCoverage.set(id, {
                    report: coverage,
                    extIds: includesTests.map((t) => TestId.fromExtHostTestItem(t, ctrlId).toString()),
                });
                this.proxy.$appendCoverage(runId, taskId, Convert.TestCoverage.fromFile(ctrlId, id, coverage));
            },
            //#region state mutation
            enqueued: guardTestMutation((test) => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 1 /* TestResultState.Queued */);
            }),
            skipped: guardTestMutation((test) => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 5 /* TestResultState.Skipped */);
            }),
            started: guardTestMutation((test) => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 2 /* TestResultState.Running */);
            }),
            errored: guardTestMutation((test, messages, duration) => {
                appendMessages(test, messages);
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 6 /* TestResultState.Errored */, duration);
            }),
            failed: guardTestMutation((test, messages, duration) => {
                appendMessages(test, messages);
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), 4 /* TestResultState.Failed */, duration);
            }),
            passed: guardTestMutation((test, duration) => {
                this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, this.dto.controllerId).toString(), 3 /* TestResultState.Passed */, duration);
            }),
            //#endregion
            appendOutput: (output, location, test) => {
                if (ended) {
                    return;
                }
                if (test) {
                    this.ensureTestIsKnown(test);
                }
                this.proxy.$appendOutputToRun(runId, taskId, VSBuffer.fromString(output), location && Convert.location.from(location), test && TestId.fromExtHostTestItem(test, ctrlId).toString());
            },
            end: () => {
                if (ended) {
                    return;
                }
                ended = true;
                this.proxy.$finishedTestRunTask(runId, taskId);
                if (!--this.running) {
                    this.markEnded();
                }
            },
        };
        this.running++;
        this.tasks.set(taskId, { run, cts });
        this.proxy.$startedTestRunTask(runId, {
            id: taskId,
            ctrlId: this.dto.controllerId,
            name: name || this.extension.displayName || this.extension.identifier.value,
            running: true,
        });
        return run;
    }
    forciblyEndTasks() {
        for (const { run } of this.tasks.values()) {
            run.end();
        }
    }
    markEnded() {
        if (this.state !== 2 /* TestRunTrackerState.Ended */) {
            this.state = 2 /* TestRunTrackerState.Ended */;
            this.endEmitter.fire();
        }
    }
    ensureTestIsKnown(test) {
        if (!(test instanceof TestItemImpl)) {
            throw new InvalidTestItemError(test.id);
        }
        if (this.sharedTestIds.has(TestId.fromExtHostTestItem(test, this.dto.controllerId).toString())) {
            return;
        }
        const chain = [];
        const root = this.dto.colllection.root;
        while (true) {
            const converted = Convert.TestItem.from(test);
            chain.unshift(converted);
            if (this.sharedTestIds.has(converted.extId)) {
                break;
            }
            this.sharedTestIds.add(converted.extId);
            if (test === root) {
                break;
            }
            test = test.parent || root;
        }
        this.proxy.$addTestsToRun(this.dto.controllerId, this.dto.id, chain);
    }
    dispose() {
        this.markEnded();
        super.dispose();
    }
}
/**
 * Queues runs for a single extension and provides the currently-executing
 * run so that `createTestRun` can be properly correlated.
 */
export class TestRunCoordinator {
    get trackers() {
        return this.tracked.values();
    }
    constructor(proxy, logService) {
        this.proxy = proxy;
        this.logService = logService;
        this.tracked = new Map();
        this.trackedById = new Map();
    }
    /**
     * Gets a coverage report for a given run and task ID.
     */
    getCoverageDetails(id, testId, token) {
        const runId = TestId.root(id);
        return this.trackedById.get(runId)?.getCoverageDetails(id, testId, token) || [];
    }
    /**
     * Disposes the test run, called when the main thread is no longer interested
     * in associated data.
     */
    disposeTestRun(runId) {
        this.trackedById.get(runId)?.dispose();
        this.trackedById.delete(runId);
        for (const [req, { id }] of this.tracked) {
            if (id === runId) {
                this.tracked.delete(req);
            }
        }
    }
    /**
     * Registers a request as being invoked by the main thread, so
     * `$startedExtensionTestRun` is not invoked. The run must eventually
     * be cancelled manually.
     */
    prepareForMainThreadTestRun(extension, req, dto, profile, token) {
        return this.getTracker(req, dto, profile, extension, token);
    }
    /**
     * Cancels an existing test run via its cancellation token.
     */
    cancelRunById(runId, taskId) {
        this.trackedById.get(runId)?.cancel(taskId);
    }
    /**
     * Cancels an existing test run via its cancellation token.
     */
    cancelAllRuns() {
        for (const tracker of this.tracked.values()) {
            tracker.cancel();
        }
    }
    /**
     * Implements the public `createTestRun` API.
     */
    createTestRun(extension, controllerId, collection, request, name, persist) {
        const existing = this.tracked.get(request);
        if (existing) {
            return existing.createRun(name);
        }
        // If there is not an existing tracked extension for the request, start
        // a new, detached session.
        const dto = TestRunDto.fromPublic(controllerId, collection, request, persist);
        const profile = tryGetProfileFromTestRunReq(request);
        this.proxy.$startedExtensionTestRun({
            controllerId,
            continuous: !!request.continuous,
            profile: profile && {
                group: Convert.TestRunProfileKind.from(profile.kind),
                id: profile.profileId,
            },
            exclude: request.exclude?.map((t) => TestId.fromExtHostTestItem(t, collection.root.id).toString()) ??
                [],
            id: dto.id,
            include: request.include?.map((t) => TestId.fromExtHostTestItem(t, collection.root.id).toString()) ?? [collection.root.id],
            preserveFocus: request.preserveFocus ?? true,
            persist,
        });
        const tracker = this.getTracker(request, dto, request.profile, extension);
        Event.once(tracker.onEnd)(() => {
            this.proxy.$finishedExtensionTestRun(dto.id);
        });
        return tracker.createRun(name);
    }
    getTracker(req, dto, profile, extension, token) {
        const tracker = new TestRunTracker(dto, this.proxy, this.logService, profile, extension, token);
        this.tracked.set(req, tracker);
        this.trackedById.set(tracker.id, tracker);
        return tracker;
    }
}
const tryGetProfileFromTestRunReq = (request) => {
    if (!request.profile) {
        return undefined;
    }
    if (!(request.profile instanceof TestRunProfileImpl)) {
        throw new Error(`TestRunRequest.profile is not an instance created from TestController.createRunProfile`);
    }
    return request.profile;
};
export class TestRunDto {
    static fromPublic(controllerId, collection, request, persist) {
        return new TestRunDto(controllerId, generateUuid(), persist, collection);
    }
    static fromInternal(request, collection) {
        return new TestRunDto(request.controllerId, request.runId, true, collection);
    }
    constructor(controllerId, id, isPersisted, colllection) {
        this.controllerId = controllerId;
        this.id = id;
        this.isPersisted = isPersisted;
        this.colllection = colllection;
    }
}
class MirroredChangeCollector {
    get isEmpty() {
        return this.added.size === 0 && this.removed.size === 0 && this.updated.size === 0;
    }
    constructor(emitter) {
        this.emitter = emitter;
        this.added = new Set();
        this.updated = new Set();
        this.removed = new Set();
        this.alreadyRemoved = new Set();
    }
    /**
     * @inheritdoc
     */
    add(node) {
        this.added.add(node);
    }
    /**
     * @inheritdoc
     */
    update(node) {
        Object.assign(node.revived, Convert.TestItem.toPlain(node.item));
        if (!this.added.has(node)) {
            this.updated.add(node);
        }
    }
    /**
     * @inheritdoc
     */
    remove(node) {
        if (this.added.has(node)) {
            this.added.delete(node);
            return;
        }
        this.updated.delete(node);
        const parentId = TestId.parentId(node.item.extId);
        if (parentId && this.alreadyRemoved.has(parentId.toString())) {
            this.alreadyRemoved.add(node.item.extId);
            return;
        }
        this.removed.add(node);
    }
    /**
     * @inheritdoc
     */
    getChangeEvent() {
        const { added, updated, removed } = this;
        return {
            get added() {
                return [...added].map((n) => n.revived);
            },
            get updated() {
                return [...updated].map((n) => n.revived);
            },
            get removed() {
                return [...removed].map((n) => n.revived);
            },
        };
    }
    complete() {
        if (!this.isEmpty) {
            this.emitter.fire(this.getChangeEvent());
        }
    }
}
/**
 * Maintains tests in this extension host sent from the main thread.
 * @private
 */
class MirroredTestCollection extends AbstractIncrementalTestCollection {
    constructor() {
        super(...arguments);
        this.changeEmitter = new Emitter();
        /**
         * Change emitter that fires with the same semantics as `TestObserver.onDidChangeTests`.
         */
        this.onDidChangeTests = this.changeEmitter.event;
    }
    /**
     * Gets a list of root test items.
     */
    get rootTests() {
        return this.roots;
    }
    /**
     *
     * If the test ID exists, returns its underlying ID.
     */
    getMirroredTestDataById(itemId) {
        return this.items.get(itemId);
    }
    /**
     * If the test item is a mirrored test item, returns its underlying ID.
     */
    getMirroredTestDataByReference(item) {
        return this.items.get(item.id);
    }
    /**
     * @override
     */
    createItem(item, parent) {
        return {
            ...item,
            // todo@connor4312: make this work well again with children
            revived: Convert.TestItem.toPlain(item.item),
            depth: parent ? parent.depth + 1 : 0,
            children: new Set(),
        };
    }
    /**
     * @override
     */
    createChangeCollector() {
        return new MirroredChangeCollector(this.changeEmitter);
    }
}
class TestObservers {
    constructor(proxy) {
        this.proxy = proxy;
    }
    checkout() {
        if (!this.current) {
            this.current = this.createObserverData();
        }
        const current = this.current;
        current.observers++;
        return {
            onDidChangeTest: current.tests.onDidChangeTests,
            get tests() {
                return [...current.tests.rootTests].map((t) => t.revived);
            },
            dispose: createSingleCallFunction(() => {
                if (--current.observers === 0) {
                    this.proxy.$unsubscribeFromDiffs();
                    this.current = undefined;
                }
            }),
        };
    }
    /**
     * Gets the internal test data by its reference.
     */
    getMirroredTestDataByReference(ref) {
        return this.current?.tests.getMirroredTestDataByReference(ref);
    }
    /**
     * Applies test diffs to the current set of observed tests.
     */
    applyDiff(diff) {
        this.current?.tests.apply(diff);
    }
    createObserverData() {
        const tests = new MirroredTestCollection({ asCanonicalUri: (u) => u });
        this.proxy.$subscribeToDiffs();
        return { observers: 0, tests };
    }
}
const updateProfile = (impl, proxy, initial, update) => {
    if (initial) {
        Object.assign(initial, update);
    }
    else {
        proxy.$updateTestRunConfig(impl.controllerId, impl.profileId, update);
    }
};
export class TestRunProfileImpl extends TestRunProfileBase {
    #proxy;
    #activeProfiles;
    #onDidChangeDefaultProfiles;
    #initialPublish;
    #profiles;
    get label() {
        return this._label;
    }
    set label(label) {
        if (label !== this._label) {
            this._label = label;
            updateProfile(this, this.#proxy, this.#initialPublish, { label });
        }
    }
    get supportsContinuousRun() {
        return this._supportsContinuousRun;
    }
    set supportsContinuousRun(supports) {
        if (supports !== this._supportsContinuousRun) {
            this._supportsContinuousRun = supports;
            updateProfile(this, this.#proxy, this.#initialPublish, { supportsContinuousRun: supports });
        }
    }
    get isDefault() {
        return this.#activeProfiles.has(this.profileId);
    }
    set isDefault(isDefault) {
        if (isDefault !== this.isDefault) {
            // #activeProfiles is synced from the main thread, so we can make
            // provisional changes here that will get confirmed momentarily
            if (isDefault) {
                this.#activeProfiles.add(this.profileId);
            }
            else {
                this.#activeProfiles.delete(this.profileId);
            }
            updateProfile(this, this.#proxy, this.#initialPublish, { isDefault });
        }
    }
    get tag() {
        return this._tag;
    }
    set tag(tag) {
        if (tag?.id !== this._tag?.id) {
            this._tag = tag;
            updateProfile(this, this.#proxy, this.#initialPublish, {
                tag: tag ? Convert.TestTag.namespace(this.controllerId, tag.id) : null,
            });
        }
    }
    get configureHandler() {
        return this._configureHandler;
    }
    set configureHandler(handler) {
        if (handler !== this._configureHandler) {
            this._configureHandler = handler;
            updateProfile(this, this.#proxy, this.#initialPublish, { hasConfigurationHandler: !!handler });
        }
    }
    get onDidChangeDefault() {
        return Event.chain(this.#onDidChangeDefaultProfiles, ($) => $.map((ev) => ev.get(this.controllerId)?.get(this.profileId)).filter(isDefined));
    }
    constructor(proxy, profiles, activeProfiles, onDidChangeActiveProfiles, controllerId, profileId, _label, kind, runHandler, _isDefault = false, _tag = undefined, _supportsContinuousRun = false) {
        super(controllerId, profileId, kind);
        this._label = _label;
        this.runHandler = runHandler;
        this._tag = _tag;
        this._supportsContinuousRun = _supportsContinuousRun;
        this.#proxy = proxy;
        this.#profiles = profiles;
        this.#activeProfiles = activeProfiles;
        this.#onDidChangeDefaultProfiles = onDidChangeActiveProfiles;
        profiles.set(profileId, this);
        const groupBitset = Convert.TestRunProfileKind.from(kind);
        if (_isDefault) {
            activeProfiles.add(profileId);
        }
        this.#initialPublish = {
            profileId: profileId,
            controllerId,
            tag: _tag ? Convert.TestTag.namespace(this.controllerId, _tag.id) : null,
            label: _label,
            group: groupBitset,
            isDefault: _isDefault,
            hasConfigurationHandler: false,
            supportsContinuousRun: _supportsContinuousRun,
        };
        // we send the initial profile publish out on the next microtask so that
        // initially setting the isDefault value doesn't overwrite a user-configured value
        queueMicrotask(() => {
            if (this.#initialPublish) {
                this.#proxy.$publishTestRunProfile(this.#initialPublish);
                this.#initialPublish = undefined;
            }
        });
    }
    dispose() {
        if (this.#profiles?.delete(this.profileId)) {
            this.#profiles = undefined;
            this.#proxy.$removeTestProfile(this.controllerId, this.profileId);
        }
        this.#initialPublish = undefined;
    }
}
function findTestInResultSnapshot(extId, snapshot) {
    for (let i = 0; i < extId.path.length; i++) {
        const item = snapshot.find((s) => s.id === extId.path[i]);
        if (!item) {
            return undefined;
        }
        if (i === extId.path.length - 1) {
            return item;
        }
        snapshot = item.children;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXN0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsTUFBTSxFQUFnQixNQUFNLHdDQUF3QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixpQ0FB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