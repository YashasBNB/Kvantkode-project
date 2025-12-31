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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGVzdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFakUsT0FBTyxFQUFFLE1BQU0sRUFBZ0IsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04saUNBQWlDLEVBbUJqQyxXQUFXLEVBQ1gsc0JB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