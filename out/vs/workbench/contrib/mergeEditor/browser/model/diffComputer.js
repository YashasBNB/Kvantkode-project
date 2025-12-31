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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC9kaWZmQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSW5GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBZXJHLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBTzdCLFlBQ3VCLG1CQUEwRCxFQUN6RCxvQkFBNEQ7UUFENUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN4Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBUm5FLG1CQUFjLEdBQUcscUJBQXFCLENBRXJELDJCQUEyQixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMvRSxDQUFDLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNoRSxDQUFBO0lBS0UsQ0FBQztJQUVKLEtBQUssQ0FBQyxXQUFX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