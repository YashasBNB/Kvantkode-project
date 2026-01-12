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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RSZXN1bHRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUVOLGNBQWMsR0FHZCxNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBMkQvRSxNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQTJCLEVBQUUsRUFBRSxDQUN0RCxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFBO0FBRTNFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQTtBQUVuRixJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFRaEQ7O09BRUc7SUFDSCxJQUFXLE9BQU87UUFDakIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBd0JELFlBQ3FCLGlCQUFxQyxFQUNyQyxPQUE0QyxFQUMzQyxZQUFrRCxFQUNwRCxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUE7UUFKOEIsWUFBTyxHQUFQLE9BQU8sQ0FBb0I7UUFDMUIsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBQ25DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUF4Q2hFLHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXFCLENBQUMsQ0FBQTtRQUN0RSxhQUFRLEdBQWtCLEVBQUUsQ0FBQTtRQUNuQix3QkFBbUIsR0FBc0IsRUFBRSxDQUFBO1FBQ3BELHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXdCLENBQUMsQ0FBQTtRQUN2RSx1QkFBa0IsR0FBRyxDQUFDLENBQUE7UUFVOUI7O1dBRUc7UUFDYSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBRWpFOztXQUVHO1FBQ2Esa0JBQWEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBSTNDLGdCQUFXLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxFQUFFLENBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFa0IscUJBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQVMvRixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxhQUFhLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ2hGLENBQUM7SUFFRDs7T0FFRztJQUNJLFlBQVksQ0FBQyxLQUFhO1FBQ2hDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekMsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLGFBQWEsa0NBQTBCLEVBQUUsQ0FBQztnQkFDOUQsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRDs7T0FFRztJQUNJLGdCQUFnQixDQUFDLEdBQXNEO1FBQzdFLElBQUksU0FBUyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sRUFBRSxHQUFHLFlBQVksRUFBRSxDQUFBO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FDZixJQUFJLGNBQWMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FDbkYsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLE9BQW9DLENBQUE7UUFDeEMsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDMUUsT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssR0FBRyxDQUFDLE9BQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNoRSxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQTJCO1lBQ3hDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYTtZQUNoQyxPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTztZQUNwQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVU7WUFDMUIsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLG9DQUE0QjtTQUNqRCxDQUFBO1FBRUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNyQixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7Z0JBQzVCLFlBQVksRUFBRSxHQUFHLENBQUMsWUFBWTtnQkFDOUIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO2FBQ3BCLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQ2YsSUFBSSxjQUFjLENBQ2pCLEdBQUcsQ0FBQyxFQUFFLEVBQ04sR0FBRyxDQUFDLE9BQU8sRUFDWCxRQUFRLEVBQ1IsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FDckIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksSUFBSSxDQUF3QixNQUFTO1FBQzNDLElBQUksTUFBTSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sS0FBSyxHQUFHLDhCQUE4QixDQUMzQyxJQUFJLENBQUMsT0FBTyxFQUNaLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxXQUFZLENBQzFFLENBQUE7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDbEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQzFDLENBQUM7UUFFRCxNQUFNLEVBQUUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFakMsSUFBSSxNQUFNLFlBQVksY0FBYyxFQUFFLENBQUM7WUFDdEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNkLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4RCxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1lBQzVFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3hCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNuRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtZQUNuRCxzRUFBc0U7WUFDdEUsbUVBQW1FO1lBQ25FLHFDQUFxQztZQUNyQyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDakMsS0FBSyxNQUFNLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ3hDLElBQUksV0FBVyxLQUFLLE1BQU0sRUFBRSxDQUFDO3dCQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDOzRCQUMzQixJQUFJOzRCQUNKLE1BQU07NEJBQ04sTUFBTSx3REFBZ0Q7eUJBQ3RELENBQUMsQ0FBQTt3QkFDRixNQUFLO29CQUNOLENBQUM7eUJBQU0sSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQ3BFLE1BQUs7b0JBQ04sQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRDs7T0FFRztJQUNJLFNBQVMsQ0FBQyxFQUFVO1FBQzFCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSztRQUNYLE1BQU0sSUFBSSxHQUFrQixFQUFFLENBQUE7UUFDOUIsTUFBTSxPQUFPLEdBQWtCLEVBQUUsQ0FBQTtRQUNqQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDckIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbEIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUNwQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQXNCO1FBQ3hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUIsZ0RBQWdEO1lBQ2hELElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDekMsT0FBTyxDQUFDLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBRUQscUVBQXFFO1lBQ3JFLE1BQU0sS0FBSyxHQUFHLENBQUMsWUFBWSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlELE1BQU0sS0FBSyxHQUFHLENBQUMsWUFBWSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlELE9BQU8sS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNyQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxlQUFlO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFUyxLQUFLLENBQUMsa0JBQWtCO1FBQ2pDLHFFQUFxRTtRQUNyRSwwQkFBMEI7UUFDMUIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ25DLENBQUM7Q0FDRCxDQUFBO0FBOU5ZLGlCQUFpQjtJQXVDM0IsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxpQkFBaUIsQ0FBQTtHQTFDUCxpQkFBaUIsQ0E4TjdCIn0=