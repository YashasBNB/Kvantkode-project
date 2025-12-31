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
import { findFirstIdxMonotonousOrArrLen } from '../../../../base/common/arraysFind.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { ITestProfileService } from './testProfileService.js';
import { LiveTestResult, } from './testResult.js';
import { ITestResultStorage, RETAIN_MAX_RESULTS } from './testResultStorage.js';
const isRunningTests = (service) => service.results.length > 0 && service.results[0].completedAt === undefined;
export const ITestResultService = createDecorator('testResultService');
let TestResultService = class TestResultService extends Disposable {
    /**
     * @inheritdoc
     */
    get results() {
        this.loadResults();
        return this._results;
    }
    constructor(contextKeyService, storage, testProfiles, telemetryService) {
        super();
        this.storage = storage;
        this.testProfiles = testProfiles;
        this.telemetryService = telemetryService;
        this.changeResultEmitter = this._register(new Emitter());
        this._results = [];
        this._resultsDisposables = [];
        this.testChangeEmitter = this._register(new Emitter());
        this.insertOrderCounter = 0;
        /**
         * @inheritdoc
         */
        this.onResultsChanged = this.changeResultEmitter.event;
        /**
         * @inheritdoc
         */
        this.onTestChanged = this.testChangeEmitter.event;
        this.loadResults = createSingleCallFunction(() => this.storage.read().then((loaded) => {
            for (let i = loaded.length - 1; i >= 0; i--) {
                this.push(loaded[i]);
            }
        }));
        this.persistScheduler = new RunOnceScheduler(() => this.persistImmediately(), 500);
        this._register(toDisposable(() => dispose(this._resultsDisposables)));
        this.isRunning = TestingContextKeys.isRunning.bindTo(contextKeyService);
        this.hasAnyResults = TestingContextKeys.hasAnyResults.bindTo(contextKeyService);
    }
    /**
     * @inheritdoc
     */
    getStateById(extId) {
        for (const result of this.results) {
            const lookup = result.getStateById(extId);
            if (lookup && lookup.computedState !== 0 /* TestResultState.Unset */) {
                return [result, lookup];
            }
        }
        return undefined;
    }
    /**
     * @inheritdoc
     */
    createLiveResult(req) {
        if ('targets' in req) {
            const id = generateUuid();
            return this.push(new LiveTestResult(id, true, req, this.insertOrderCounter++, this.telemetryService));
        }
        let profile;
        if (req.profile) {
            const profiles = this.testProfiles.getControllerProfiles(req.controllerId);
            profile = profiles.find((c) => c.profileId === req.profile.id);
        }
        const resolved = {
            preserveFocus: req.preserveFocus,
            targets: [],
            exclude: req.exclude,
            continuous: req.continuous,
            group: profile?.group ?? 2 /* TestRunProfileBitset.Run */,
        };
        if (profile) {
            resolved.targets.push({
                profileId: profile.profileId,
                controllerId: req.controllerId,
                testIds: req.include,
            });
        }
        return this.push(new LiveTestResult(req.id, req.persist, resolved, this.insertOrderCounter++, this.telemetryService));
    }
    /**
     * @inheritdoc
     */
    push(result) {
        if (result.completedAt === undefined) {
            this.results.unshift(result);
        }
        else {
            const index = findFirstIdxMonotonousOrArrLen(this.results, (r) => r.completedAt !== undefined && r.completedAt <= result.completedAt);
            this.results.splice(index, 0, result);
            this.persistScheduler.schedule();
        }
        this.hasAnyResults.set(true);
        if (this.results.length > RETAIN_MAX_RESULTS) {
            this.results.pop();
            this._resultsDisposables.pop()?.dispose();
        }
        const ds = new DisposableStore();
        this._resultsDisposables.push(ds);
        if (result instanceof LiveTestResult) {
            ds.add(result);
            ds.add(result.onComplete(() => this.onComplete(result)));
            ds.add(result.onChange(this.testChangeEmitter.fire, this.testChangeEmitter));
            this.isRunning.set(true);
            this.changeResultEmitter.fire({ started: result });
        }
        else {
            this.changeResultEmitter.fire({ inserted: result });
            // If this is not a new result, go through each of its tests. For each
            // test for which the new result is the most recently inserted, fir
            // a change event so that UI updates.
            for (const item of result.tests) {
                for (const otherResult of this.results) {
                    if (otherResult === result) {
                        this.testChangeEmitter.fire({
                            item,
                            result,
                            reason: 0 /* TestResultItemChangeReason.ComputedStateChange */,
                        });
                        break;
                    }
                    else if (otherResult.getStateById(item.item.extId) !== undefined) {
                        break;
                    }
                }
            }
        }
        return result;
    }
    /**
     * @inheritdoc
     */
    getResult(id) {
        return this.results.find((r) => r.id === id);
    }
    /**
     * @inheritdoc
     */
    clear() {
        const keep = [];
        const removed = [];
        for (const result of this.results) {
            if (result.completedAt !== undefined) {
                removed.push(result);
            }
            else {
                keep.push(result);
            }
        }
        this._results = keep;
        this.persistScheduler.schedule();
        if (keep.length === 0) {
            this.hasAnyResults.set(false);
        }
        this.changeResultEmitter.fire({ removed });
    }
    onComplete(result) {
        this.resort();
        this.updateIsRunning();
        this.persistScheduler.schedule();
        this.changeResultEmitter.fire({ completed: result });
    }
    resort() {
        this.results.sort((a, b) => {
            // Running tests should always be sorted higher:
            if (!!a.completedAt !== !!b.completedAt) {
                return a.completedAt === undefined ? -1 : 1;
            }
            // Otherwise sort by insertion order, hydrated tests are always last:
            const aComp = a instanceof LiveTestResult ? a.insertOrder : -1;
            const bComp = b instanceof LiveTestResult ? b.insertOrder : -1;
            return bComp - aComp;
        });
    }
    updateIsRunning() {
        this.isRunning.set(isRunningTests(this));
    }
    async persistImmediately() {
        // ensure results are loaded before persisting to avoid deleting once
        // that we don't have yet.
        await this.loadResults();
        this.storage.persist(this.results);
    }
};
TestResultService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ITestResultStorage),
    __param(2, ITestProfileService),
    __param(3, ITelemetryService)
], TestResultService);
export { TestResultService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0UmVzdWx0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUNQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzdELE9BQU8sRUFFTixjQUFjLEdBR2QsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQTJEL0UsTUFBTSxjQUFjLEdBQUcsQ0FBQyxPQUEyQixFQUFFLEVBQUUsQ0FDdEQsT0FBTyxDQUFDLE9B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