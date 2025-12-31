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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RDb3ZlcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBR04sZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sY0FBYyxFQUNkLHFCQUFxQixHQUNyQixNQUFNLG1FQUFtRSxDQUFBO0FBTTFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUE7QUFnQ3pGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQVFsRCxZQUNxQixpQkFBcUMsRUFDckMsYUFBaUMsRUFDOUIsYUFBb0MsRUFDNUMs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