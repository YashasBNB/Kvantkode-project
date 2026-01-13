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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { observableValue, transaction, } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { bindContextKey, observableConfigValue, } from '../../../../platform/observable/common/platformObservableUtils.js';
import { ITestResultService } from './testResultService.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
export const ITestCoverageService = createDecorator('testCoverageService');
let TestCoverageService = class TestCoverageService extends Disposable {
    constructor(contextKeyService, resultService, configService, viewsService) {
        super();
        this.viewsService = viewsService;
        this.lastOpenCts = this._register(new MutableDisposable());
        this.selected = observableValue('testCoverage', undefined);
        this.filterToTest = observableValue('filterToTest', undefined);
        this.showInline = observableValue('inlineCoverage', false);
        const toolbarConfig = observableConfigValue("testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */, true, configService);
        this._register(bindContextKey(TestingContextKeys.coverageToolbarEnabled, contextKeyService, (reader) => toolbarConfig.read(reader)));
        this._register(bindContextKey(TestingContextKeys.inlineCoverageEnabled, contextKeyService, (reader) => this.showInline.read(reader)));
        this._register(bindContextKey(TestingContextKeys.isTestCoverageOpen, contextKeyService, (reader) => !!this.selected.read(reader)));
        this._register(bindContextKey(TestingContextKeys.hasPerTestCoverage, contextKeyService, (reader) => !Iterable.isEmpty(this.selected.read(reader)?.allPerTestIDs())));
        this._register(bindContextKey(TestingContextKeys.isCoverageFilteredToTest, contextKeyService, (reader) => !!this.filterToTest.read(reader)));
        this._register(resultService.onResultsChanged((evt) => {
            if ('completed' in evt) {
                const coverage = evt.completed.tasks.find((t) => t.coverage.get());
                if (coverage) {
                    this.openCoverage(coverage, false);
                }
                else {
                    this.closeCoverage();
                }
            }
            else if ('removed' in evt && this.selected.get()) {
                const taskId = this.selected.get()?.fromTaskId;
                if (evt.removed.some((e) => e.tasks.some((t) => t.id === taskId))) {
                    this.closeCoverage();
                }
            }
        }));
    }
    /** @inheritdoc */
    async openCoverage(task, focus = true) {
        this.lastOpenCts.value?.cancel();
        const cts = (this.lastOpenCts.value = new CancellationTokenSource());
        const coverage = task.coverage.get();
        if (!coverage) {
            return;
        }
        transaction((tx) => {
            // todo: may want to preserve this if coverage for that test in the new run?
            this.filterToTest.set(undefined, tx);
            this.selected.set(coverage, tx);
        });
        if (focus && !cts.token.isCancellationRequested) {
            this.viewsService.openView("workbench.view.testCoverage" /* Testing.CoverageViewId */, true);
        }
    }
    /** @inheritdoc */
    closeCoverage() {
        this.selected.set(undefined, undefined);
    }
};
TestCoverageService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ITestResultService),
    __param(2, IConfigurationService),
    __param(3, IViewsService)
], TestCoverageService);
export { TestCoverageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdENvdmVyYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFHTixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixjQUFjLEVBQ2QscUJBQXFCLEdBQ3JCLE1BQU0sbUVBQW1FLENBQUE7QUFNMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQTtBQWdDekYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBUWxELFlBQ3FCLGlCQUFxQyxFQUNyQyxh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