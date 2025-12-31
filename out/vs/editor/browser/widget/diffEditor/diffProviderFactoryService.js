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
var WorkerBasedDocumentDiffProvider_1;
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { LineRange } from '../../../common/core/lineRange.js';
import { DetailedLineRangeMapping, RangeMapping } from '../../../common/diff/rangeMapping.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
export const IDiffProviderFactoryService = createDecorator('diffProviderFactoryService');
let WorkerBasedDiffProviderFactoryService = class WorkerBasedDiffProviderFactoryService {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    createDiffProvider(options) {
        return this.instantiationService.createInstance(WorkerBasedDocumentDiffProvider, options);
    }
};
WorkerBasedDiffProviderFactoryService = __decorate([
    __param(0, IInstantiationService)
], WorkerBasedDiffProviderFactoryService);
export { WorkerBasedDiffProviderFactoryService };
registerSingleton(IDiffProviderFactoryService, WorkerBasedDiffProviderFactoryService, 1 /* InstantiationType.Delayed */);
let WorkerBasedDocumentDiffProvider = class WorkerBasedDocumentDiffProvider {
    static { WorkerBasedDocumentDiffProvider_1 = this; }
    static { this.diffCache = new Map(); }
    constructor(options, editorWorkerService, telemetryService) {
        this.editorWorkerService = editorWorkerService;
        this.telemetryService = telemetryService;
        this.onDidChangeEventEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEventEmitter.event;
        this.diffAlgorithm = 'advanced';
        this.diffAlgorithmOnDidChangeSubscription = undefined;
        this.setOptions(options);
    }
    dispose() {
        this.diffAlgorithmOnDidChangeSubscription?.dispose();
    }
    async computeDiff(original, modified, options, cancellationToken) {
        if (typeof this.diffAlgorithm !== 'string') {
            return this.diffAlgorithm.computeDiff(original, modified, options, cancellationToken);
        }
        if (original.isDisposed() || modified.isDisposed()) {
            // TODO@hediet
            return {
                changes: [],
                identical: true,
                quitEarly: false,
                moves: [],
            };
        }
        // This significantly speeds up the case when the original file is empty
        if (original.getLineCount() === 1 && original.getLineMaxColumn(1) === 1) {
            if (modified.getLineCount() === 1 && modified.getLineMaxColumn(1) === 1) {
                return {
                    changes: [],
                    identical: true,
                    quitEarly: false,
                    moves: [],
                };
            }
            return {
                changes: [
                    new DetailedLineRangeMapping(new LineRange(1, 2), new LineRange(1, modified.getLineCount() + 1), [new RangeMapping(original.getFullModelRange(), modified.getFullModelRange())]),
                ],
                identical: false,
                quitEarly: false,
                moves: [],
            };
        }
        const uriKey = JSON.stringify([original.uri.toString(), modified.uri.toString()]);
        const context = JSON.stringify([
            original.id,
            modified.id,
            original.getAlternativeVersionId(),
            modified.getAlternativeVersionId(),
            JSON.stringify(options),
        ]);
        const c = WorkerBasedDocumentDiffProvider_1.diffCache.get(uriKey);
        if (c && c.context === context) {
            return c.result;
        }
        const sw = StopWatch.create();
        const result = await this.editorWorkerService.computeDiff(original.uri, modified.uri, options, this.diffAlgorithm);
        const timeMs = sw.elapsed();
        this.telemetryService.publicLog2('diffEditor.computeDiff', {
            timeMs,
            timedOut: result?.quitEarly ?? true,
            detectedMoves: options.computeMoves ? (result?.moves.length ?? 0) : -1,
        });
        if (cancellationToken.isCancellationRequested) {
            // Text models might be disposed!
            return {
                changes: [],
                identical: false,
                quitEarly: true,
                moves: [],
            };
        }
        if (!result) {
            throw new Error('no diff result available');
        }
        // max 10 items in cache
        if (WorkerBasedDocumentDiffProvider_1.diffCache.size > 10) {
            WorkerBasedDocumentDiffProvider_1.diffCache.delete(WorkerBasedDocumentDiffProvider_1.diffCache.keys().next().value);
        }
        WorkerBasedDocumentDiffProvider_1.diffCache.set(uriKey, { result, context });
        return result;
    }
    setOptions(newOptions) {
        let didChange = false;
        if (newOptions.diffAlgorithm) {
            if (this.diffAlgorithm !== newOptions.diffAlgorithm) {
                this.diffAlgorithmOnDidChangeSubscription?.dispose();
                this.diffAlgorithmOnDidChangeSubscription = undefined;
                this.diffAlgorithm = newOptions.diffAlgorithm;
                if (typeof newOptions.diffAlgorithm !== 'string') {
                    this.diffAlgorithmOnDidChangeSubscription = newOptions.diffAlgorithm.onDidChange(() => this.onDidChangeEventEmitter.fire());
                }
                didChange = true;
            }
        }
        if (didChange) {
            this.onDidChangeEventEmitter.fire();
        }
    }
};
WorkerBasedDocumentDiffProvider = WorkerBasedDocumentDiffProvider_1 = __decorate([
    __param(1, IEditorWorkerService),
    __param(2, ITelemetryService)
], WorkerBasedDocumentDiffProvider);
export { WorkerBasedDocumentDiffProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZlByb3ZpZGVyRmFjdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9kaWZmUHJvdmlkZXJGYWN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsZUFBZSxHQUNmLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFNN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTdGLE9BQU8sRUFBcUIsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUV0RixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQ3pELDRCQUE0QixDQUM1QixDQUFBO0FBV00sSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7SUFHakQsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDakYsQ0FBQztJQUVKLGtCQUFrQixDQUFDLE9BQW9DO1FBQ3RELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMxRixDQUFDO0NBQ0QsQ0FBQTtBQVZZLHFDQUFx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