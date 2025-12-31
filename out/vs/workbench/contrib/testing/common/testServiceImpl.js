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
import { groupBy } from '../../../../base/common/arrays.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { getTestingConfiguration } from './configuration.js';
import { MainThreadTestCollection } from './mainThreadTestCollection.js';
import { MutableObservableValue } from './observableValue.js';
import { StoredValue } from './storedValue.js';
import { TestExclusions } from './testExclusions.js';
import { TestId } from './testId.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { canUseProfileWithTest, ITestProfileService } from './testProfileService.js';
import { ITestResultService } from './testResultService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let TestService = class TestService extends Disposable {
    constructor(contextKeyService, instantiationService, uriIdentityService, storage, editorService, testProfiles, notificationService, configurationService, testResults, workspaceTrustRequestService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.storage = storage;
        this.editorService = editorService;
        this.testProfiles = testProfiles;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.testResults = testResults;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.testControllers = observableValue('testControllers', new Map());
        this.testExtHosts = new Set();
        this.cancelExtensionTestRunEmitter = new Emitter();
        this.willProcessDiffEmitter = new Emitter();
        this.didProcessDiffEmitter = new Emitter();
        this.testRefreshCancellations = new Set();
        /**
         * Cancellation for runs requested by the user being managed by the UI.
         * Test runs initiated by extensions are not included here.
         */
        this.uiRunningTests = new Map();
        /**
         * @inheritdoc
         */
        this.onWillProcessDiff = this.willProcessDiffEmitter.event;
        /**
         * @inheritdoc
         */
        this.onDidProcessDiff = this.didProcessDiffEmitter.event;
        /**
         * @inheritdoc
         */
        this.onDidCancelTestRun = this.cancelExtensionTestRunEmitter.event;
        /**
         * @inheritdoc
         */
        this.collection = new MainThreadTestCollection(this.uriIdentityService, this.expandTest.bind(this));
        /**
         * @inheritdoc
         */
        this.showInlineOutput = this._register(MutableObservableValue.stored(new StoredValue({
            key: 'inlineTestOutputVisible',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 0 /* StorageTarget.USER */,
        }, this.storage), true));
        this.excluded = instantiationService.createInstance(TestExclusions);
        this.isRefreshingTests = TestingContextKeys.isRefreshingTests.bindTo(contextKeyService);
        this.activeEditorHasTests = TestingContextKeys.activeEditorHasTests.bindTo(contextKeyService);
        this._register(bindContextKey(TestingContextKeys.providerCount, contextKeyService, (reader) => this.testControllers.read(reader).size));
        const bindCapability = (key, capability) => this._register(bindContextKey(key, contextKeyService, (reader) => Iterable.some(this.testControllers.read(reader).values(), (ctrl) => !!(ctrl.capabilities.read(reader) & capability))));
        bindCapability(TestingContextKeys.canRefreshTests, 2 /* TestControllerCapability.Refresh */);
        bindCapability(TestingContextKeys.canGoToRelatedCode, 4 /* TestControllerCapability.CodeRelatedToTest */);
        bindCapability(TestingContextKeys.canGoToRelatedTest, 8 /* TestControllerCapability.TestRelatedToCode */);
        this._register(editorService.onDidActiveEditorChange(() => this.updateEditorContextKeys()));
    }
    /**
     * @inheritdoc
     */
    async expandTest(id, levels) {
        await this.testControllers.get().get(TestId.fromString(id).controllerId)?.expandTest(id, levels);
    }
    /**
     * @inheritdoc
     */
    cancelTestRun(runId, taskId) {
        this.cancelExtensionTestRunEmitter.fire({ runId, taskId });
        if (runId === undefined) {
            for (const runCts of this.uiRunningTests.values()) {
                runCts.cancel();
            }
        }
        else if (!taskId) {
            this.uiRunningTests.get(runId)?.cancel();
        }
    }
    /**
     * @inheritdoc
     */
    async runTests(req, token = CancellationToken.None) {
        // We try to ensure that all tests in the request will be run, preferring
        // to use default profiles for each controller when possible.
        const byProfile = [];
        for (const test of req.tests) {
            const existing = byProfile.find((p) => canUseProfileWithTest(p.profile, test));
            if (existing) {
                existing.tests.push(test);
                continue;
            }
            const bestProfile = this.testProfiles.getDefaultProfileForTest(req.group, test);
            if (!bestProfile) {
                continue;
            }
            byProfile.push({ profile: bestProfile, tests: [test] });
        }
        const resolved = {
            targets: byProfile.map(({ profile, tests }) => ({
                profileId: profile.profileId,
                controllerId: tests[0].controllerId,
                testIds: tests.map((t) => t.item.extId),
            })),
            group: req.group,
            exclude: req.exclude?.map((t) => t.item.extId),
            continuous: req.continuous,
        };
        // If no tests are covered by the defaults, just use whatever the defaults
        // for their controller are. This can happen if the user chose specific
        // profiles for the run button, but then asked to run a single test from the
        // explorer or decoration. We shouldn't no-op.
        if (resolved.targets.length === 0) {
            for (const byController of groupBy(req.tests, (a, b) => a.controllerId === b.controllerId ? 0 : 1)) {
                const profiles = this.testProfiles.getControllerProfiles(byController[0].controllerId);
                const withControllers = byController.map((test) => ({
                    profile: profiles.find((p) => p.group === req.group && canUseProfileWithTest(p, test)),
                    test,
                }));
                for (const byProfile of groupBy(withControllers, (a, b) => a.profile === b.profile ? 0 : 1)) {
                    const profile = byProfile[0].profile;
                    if (profile) {
                        resolved.targets.push({
                            testIds: byProfile.map((t) => t.test.item.extId),
                            profileId: profile.profileId,
                            controllerId: profile.controllerId,
                        });
                    }
                }
            }
        }
        return this.runResolvedTests(resolved, token);
    }
    /** @inheritdoc */
    async startContinuousRun(req, token) {
        if (!req.exclude) {
            req.exclude = [...this.excluded.all];
        }
        const trust = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('testTrust', 'Running tests may execute code in your workspace.'),
        });
        if (!trust) {
            return;
        }
        const byController = groupBy(req.targets, (a, b) => a.controllerId.localeCompare(b.controllerId));
        const requests = byController.map((group) => this.getTestController(group[0].controllerId)
            ?.startContinuousRun(group.map((controlReq) => ({
            excludeExtIds: req.exclude.filter((t) => !controlReq.testIds.includes(t)),
            profileId: controlReq.profileId,
            controllerId: controlReq.controllerId,
            testIds: controlReq.testIds,
        })), token)
            .then((result) => {
            const errs = result.map((r) => r.error).filter(isDefined);
            if (errs.length) {
                this.notificationService.error(localize('testError', 'An error occurred attempting to run tests: {0}', errs.join(' ')));
            }
        }));
        await Promise.all(requests);
    }
    /**
     * @inheritdoc
     */
    async runResolvedTests(req, token = CancellationToken.None) {
        if (!req.exclude) {
            req.exclude = [...this.excluded.all];
        }
        const result = this.testResults.createLiveResult(req);
        const trust = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('testTrust', 'Running tests may execute code in your workspace.'),
        });
        if (!trust) {
            result.markComplete();
            return result;
        }
        try {
            const cancelSource = new CancellationTokenSource(token);
            this.uiRunningTests.set(result.id, cancelSource);
            const byController = groupBy(req.targets, (a, b) => a.controllerId.localeCompare(b.controllerId));
            const requests = byController.map((group) => this.getTestController(group[0].controllerId)
                ?.runTests(group.map((controlReq) => ({
                runId: result.id,
                excludeExtIds: req.exclude.filter((t) => !controlReq.testIds.includes(t)),
                profileId: controlReq.profileId,
                controllerId: controlReq.controllerId,
                testIds: controlReq.testIds,
            })), cancelSource.token)
                .then((result) => {
                const errs = result.map((r) => r.error).filter(isDefined);
                if (errs.length) {
                    this.notificationService.error(localize('testError', 'An error occurred attempting to run tests: {0}', errs.join(' ')));
                }
            }));
            await this.saveAllBeforeTest(req);
            await Promise.all(requests);
            return result;
        }
        finally {
            this.uiRunningTests.delete(result.id);
            result.markComplete();
        }
    }
    /**
     * @inheritdoc
     */
    async provideTestFollowups(req, token) {
        const reqs = await Promise.all([...this.testExtHosts].map(async (ctrl) => ({
            ctrl,
            followups: await ctrl.provideTestFollowups(req, token),
        })));
        const followups = {
            followups: reqs.flatMap(({ ctrl, followups }) => followups.map((f) => ({
                message: f.title,
                execute: () => ctrl.executeTestFollowup(f.id),
            }))),
            dispose: () => {
                for (const { ctrl, followups } of reqs) {
                    ctrl.disposeTestFollowups(followups.map((f) => f.id));
                }
            },
        };
        if (token.isCancellationRequested) {
            followups.dispose();
        }
        return followups;
    }
    /**
     * @inheritdoc
     */
    publishDiff(_controllerId, diff) {
        this.willProcessDiffEmitter.fire(diff);
        this.collection.apply(diff);
        this.updateEditorContextKeys();
        this.didProcessDiffEmitter.fire(diff);
    }
    /**
     * @inheritdoc
     */
    getTestController(id) {
        return this.testControllers.get().get(id);
    }
    /**
     * @inheritdoc
     */
    async syncTests() {
        const cts = new CancellationTokenSource();
        try {
            await Promise.all([...this.testControllers.get().values()].map((c) => c.syncTests(cts.token)));
        }
        finally {
            cts.dispose(true);
        }
    }
    /**
     * @inheritdoc
     */
    async refreshTests(controllerId) {
        const cts = new CancellationTokenSource();
        this.testRefreshCancellations.add(cts);
        this.isRefreshingTests.set(true);
        try {
            if (controllerId) {
                await this.getTestController(controllerId)?.refreshTests(cts.token);
            }
            else {
                await Promise.all([...this.testControllers.get().values()].map((c) => c.refreshTests(cts.token)));
            }
        }
        finally {
            this.testRefreshCancellations.delete(cts);
            this.isRefreshingTests.set(this.testRefreshCancellations.size > 0);
            cts.dispose(true);
        }
    }
    /**
     * @inheritdoc
     */
    cancelRefreshTests() {
        for (const cts of this.testRefreshCancellations) {
            cts.cancel();
        }
        this.testRefreshCancellations.clear();
        this.isRefreshingTests.set(false);
    }
    /**
     * @inheritdoc
     */
    registerExtHost(controller) {
        this.testExtHosts.add(controller);
        return toDisposable(() => this.testExtHosts.delete(controller));
    }
    /**
     * @inheritdoc
     */
    async getTestsRelatedToCode(uri, position, token = CancellationToken.None) {
        const testIds = await Promise.all([...this.testExtHosts.values()].map((v) => v.getTestsRelatedToCode(uri, position, token)));
        // ext host will flush diffs before returning, so we should have everything here:
        return testIds
            .flatMap((ids) => ids.map((id) => this.collection.getNodeById(id)))
            .filter(isDefined);
    }
    /**
     * @inheritdoc
     */
    registerTestController(id, controller) {
        this.testControllers.set(new Map(this.testControllers.get()).set(id, controller), undefined);
        return toDisposable(() => {
            const diff = [];
            for (const root of this.collection.rootItems) {
                if (root.controllerId === id) {
                    diff.push({ op: 3 /* TestDiffOpType.Remove */, itemId: root.item.extId });
                }
            }
            this.publishDiff(id, diff);
            const next = new Map(this.testControllers.get());
            next.delete(id);
            this.testControllers.set(next, undefined);
        });
    }
    /**
     * @inheritdoc
     */
    async getCodeRelatedToTest(test, token = CancellationToken.None) {
        return ((await this.testControllers
            .get()
            .get(test.controllerId)
            ?.getRelatedCode(test.item.extId, token)) || []);
    }
    updateEditorContextKeys() {
        const uri = this.editorService.activeEditor?.resource;
        if (uri) {
            this.activeEditorHasTests.set(!Iterable.isEmpty(this.collection.getNodeByUrl(uri)));
        }
        else {
            this.activeEditorHasTests.set(false);
        }
    }
    async saveAllBeforeTest(req, configurationService = this.configurationService, editorService = this.editorService) {
        if (req.preserveFocus === true) {
            return;
        }
        const saveBeforeTest = getTestingConfiguration(this.configurationService, "testing.saveBeforeTest" /* TestingConfigKeys.SaveBeforeTest */);
        if (saveBeforeTest) {
            await editorService.saveAll();
        }
        return;
    }
};
TestService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IStorageService),
    __param(4, IEditorService),
    __param(5, ITestProfileService),
    __param(6, INotificationService),
    __param(7, IConfigurationService),
    __param(8, ITestResultService),
    __param(9, IWorkspaceTrustRequestService)
], TestService);
export { TestService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdFNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUk1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFD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