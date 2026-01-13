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
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { LineRange } from './lineRange.js';
import { DetailedLineRangeMapping, RangeMapping } from './mapping.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
let MergeDiffComputer = class MergeDiffComputer {
    constructor(editorWorkerService, configurationService) {
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
        this.mergeAlgorithm = observableConfigValue('mergeEditor.diffAlgorithm', 'advanced', this.configurationService).map((v) => v === 'smart' ? 'legacy' : v === 'experimental' ? 'advanced' : v);
    }
    async computeDiff(textModel1, textModel2, reader) {
        const diffAlgorithm = this.mergeAlgorithm.read(reader);
        const inputVersion = textModel1.getVersionId();
        const outputVersion = textModel2.getVersionId();
        const result = await this.editorWorkerService.computeDiff(textModel1.uri, textModel2.uri, {
            ignoreTrimWhitespace: false,
            maxComputationTimeMs: 0,
            computeMoves: false,
        }, diffAlgorithm);
        if (!result) {
            throw new Error('Diff computation failed');
        }
        if (textModel1.isDisposed() || textModel2.isDisposed()) {
            return { diffs: null };
        }
        const changes = result.changes.map((c) => new DetailedLineRangeMapping(toLineRange(c.original), textModel1, toLineRange(c.modified), textModel2, c.innerChanges?.map((ic) => toRangeMapping(ic))));
        const newInputVersion = textModel1.getVersionId();
        const newOutputVersion = textModel2.getVersionId();
        if (inputVersion !== newInputVersion || outputVersion !== newOutputVersion) {
            return { diffs: null };
        }
        assertFn(() => {
            for (const c of changes) {
                const inputRange = c.inputRange;
                const outputRange = c.outputRange;
                const inputTextModel = c.inputTextModel;
                const outputTextModel = c.outputTextModel;
                for (const map of c.rangeMappings) {
                    let inputRangesValid = inputRange.startLineNumber - 1 <= map.inputRange.startLineNumber &&
                        map.inputRange.endLineNumber <= inputRange.endLineNumberExclusive;
                    if (inputRangesValid &&
                        map.inputRange.startLineNumber === inputRange.startLineNumber - 1) {
                        inputRangesValid =
                            map.inputRange.endColumn >=
                                inputTextModel.getLineMaxColumn(map.inputRange.startLineNumber);
                    }
                    if (inputRangesValid &&
                        map.inputRange.endLineNumber === inputRange.endLineNumberExclusive) {
                        inputRangesValid = map.inputRange.endColumn === 1;
                    }
                    let outputRangesValid = outputRange.startLineNumber - 1 <= map.outputRange.startLineNumber &&
                        map.outputRange.endLineNumber <= outputRange.endLineNumberExclusive;
                    if (outputRangesValid &&
                        map.outputRange.startLineNumber === outputRange.startLineNumber - 1) {
                        outputRangesValid =
                            map.outputRange.endColumn >=
                                outputTextModel.getLineMaxColumn(map.outputRange.endLineNumber);
                    }
                    if (outputRangesValid &&
                        map.outputRange.endLineNumber === outputRange.endLineNumberExclusive) {
                        outputRangesValid = map.outputRange.endColumn === 1;
                    }
                    if (!inputRangesValid || !outputRangesValid) {
                        return false;
                    }
                }
            }
            return (changes.length === 0 ||
                (changes[0].inputRange.startLineNumber === changes[0].outputRange.startLineNumber &&
                    checkAdjacentItems(changes, (m1, m2) => m2.inputRange.startLineNumber - m1.inputRange.endLineNumberExclusive ===
                        m2.outputRange.startLineNumber - m1.outputRange.endLineNumberExclusive &&
                        // There has to be an unchanged line in between (otherwise both diffs should have been joined)
                        m1.inputRange.endLineNumberExclusive < m2.inputRange.startLineNumber &&
                        m1.outputRange.endLineNumberExclusive < m2.outputRange.startLineNumber)));
        });
        return {
            diffs: changes,
        };
    }
};
MergeDiffComputer = __decorate([
    __param(0, IEditorWorkerService),
    __param(1, IConfigurationService)
], MergeDiffComputer);
export { MergeDiffComputer };
export function toLineRange(range) {
    return new LineRange(range.startLineNumber, range.length);
}
export function toRangeMapping(mapping) {
    return new RangeMapping(mapping.originalRange, mapping.modifiedRange);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL2RpZmZDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFJbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzFDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFlckcsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFPN0IsWUFDdUIsbUJBQTBELEVBQ3pELG9CQUE0RDtRQUQ1Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ3hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFSbkUsbUJBQWMsR0FBRyxxQkFBcUIsQ0FFckQsMkJBQTJCLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQy9FLENBQUMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ2hFLENBQUE7SUFLRSxD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