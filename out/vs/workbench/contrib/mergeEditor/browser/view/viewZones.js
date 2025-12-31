/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../../../../base/browser/dom.js';
import { CompareResult } from '../../../../../base/common/arrays.js';
import { LineRange } from '../model/lineRange.js';
import { join } from '../utils.js';
import { ActionsSource, ConflictActionsFactory } from './conflictActions.js';
import { getAlignments } from './lineAlignment.js';
export class ViewZoneComputer {
    constructor(input1Editor, input2Editor, resultEditor) {
        this.input1Editor = input1Editor;
        this.input2Editor = input2Editor;
        this.resultEditor = resultEditor;
        this.conflictActionsFactoryInput1 = new ConflictActionsFactory(this.input1Editor);
        this.conflictActionsFactoryInput2 = new ConflictActionsFactory(this.input2Editor);
        this.conflictActionsFactoryResult = new ConflictActionsFactory(this.resultEditor);
    }
    computeViewZones(reader, viewModel, options) {
        let input1LinesAdded = 0;
        let input2LinesAdded = 0;
        let baseLinesAdded = 0;
        let resultLinesAdded = 0;
        const input1ViewZones = [];
        const input2ViewZones = [];
        const baseViewZones = [];
        const resultViewZones = [];
        const model = viewModel.model;
        const resultDiffs = model.baseResultDiffs.read(reader);
        const baseRangeWithStoreAndTouchingDiffs = join(model.modifiedBaseRanges.read(reader), resultDiffs, (baseRange, diff) => baseRange.baseRange.touches(diff.inputRange)
            ? CompareResult.neitherLessOrGreaterThan
            : LineRange.compareByStart(baseRange.baseRange, diff.inputRange));
        const shouldShowCodeLenses = options.codeLensesVisible;
        const showNonConflictingChanges = options.showNonConflictingChanges;
        let lastModifiedBaseRange = undefined;
        let lastBaseResultDiff = undefined;
        for (const m of baseRangeWithStoreAndTouchingDiffs) {
            if (shouldShowCodeLenses &&
                m.left &&
                (m.left.isConflicting || showNonConflictingChanges || !model.isHandled(m.left).read(reader))) {
                const actions = new ActionsSource(viewModel, m.left);
                if (options.shouldAlignResult || !actions.inputIsEmpty.read(reader)) {
                    input1ViewZones.push(new CommandViewZone(this.conflictActionsFactoryInput1, m.left.input1Range.startLineNumber - 1, actions.itemsInput1));
                    input2ViewZones.push(new CommandViewZone(this.conflictActionsFactoryInput2, m.left.input2Range.startLineNumber - 1, actions.itemsInput2));
                    if (options.shouldAlignBase) {
                        baseViewZones.push(new Placeholder(m.left.baseRange.startLineNumber - 1, 16));
                    }
                }
                const afterLineNumber = m.left.baseRange.startLineNumber +
                    (lastBaseResultDiff?.resultingDeltaFromOriginalToModified ?? 0) -
                    1;
                resultViewZones.push(new CommandViewZone(this.conflictActionsFactoryResult, afterLineNumber, actions.resultItems));
            }
            const lastResultDiff = m.rights.at(-1);
            if (lastResultDiff) {
                lastBaseResultDiff = lastResultDiff;
            }
            let alignedLines;
            if (m.left) {
                alignedLines = getAlignments(m.left).map((a) => ({
                    input1Line: a[0],
                    baseLine: a[1],
                    input2Line: a[2],
                    resultLine: undefined,
                }));
                lastModifiedBaseRange = m.left;
                // This is a total hack.
                alignedLines[alignedLines.length - 1].resultLine =
                    m.left.baseRange.endLineNumberExclusive +
                        (lastBaseResultDiff ? lastBaseResultDiff.resultingDeltaFromOriginalToModified : 0);
            }
            else {
                alignedLines = [
                    {
                        baseLine: lastResultDiff.inputRange.endLineNumberExclusive,
                        input1Line: lastResultDiff.inputRange.endLineNumberExclusive +
                            (lastModifiedBaseRange
                                ? lastModifiedBaseRange.input1Range.endLineNumberExclusive -
                                    lastModifiedBaseRange.baseRange.endLineNumberExclusive
                                : 0),
                        input2Line: lastResultDiff.inputRange.endLineNumberExclusive +
                            (lastModifiedBaseRange
                                ? lastModifiedBaseRange.input2Range.endLineNumberExclusive -
                                    lastModifiedBaseRange.baseRange.endLineNumberExclusive
                                : 0),
                        resultLine: lastResultDiff.outputRange.endLineNumberExclusive,
                    },
                ];
            }
            for (const { input1Line, baseLine, input2Line, resultLine } of alignedLines) {
                if (!options.shouldAlignBase && (input1Line === undefined || input2Line === undefined)) {
                    continue;
                }
                const input1Line_ = input1Line !== undefined ? input1Line + input1LinesAdded : -1;
                const input2Line_ = input2Line !== undefined ? input2Line + input2LinesAdded : -1;
                const baseLine_ = baseLine + baseLinesAdded;
                const resultLine_ = resultLine !== undefined ? resultLine + resultLinesAdded : -1;
                const max = Math.max(options.shouldAlignBase ? baseLine_ : 0, input1Line_, input2Line_, options.shouldAlignResult ? resultLine_ : 0);
                if (input1Line !== undefined) {
                    const diffInput1 = max - input1Line_;
                    if (diffInput1 > 0) {
                        input1ViewZones.push(new Spacer(input1Line - 1, diffInput1));
                        input1LinesAdded += diffInput1;
                    }
                }
                if (input2Line !== undefined) {
                    const diffInput2 = max - input2Line_;
                    if (diffInput2 > 0) {
                        input2ViewZones.push(new Spacer(input2Line - 1, diffInput2));
                        input2LinesAdded += diffInput2;
                    }
                }
                if (options.shouldAlignBase) {
                    const diffBase = max - baseLine_;
                    if (diffBase > 0) {
                        baseViewZones.push(new Spacer(baseLine - 1, diffBase));
                        baseLinesAdded += diffBase;
                    }
                }
                if (options.shouldAlignResult && resultLine !== undefined) {
                    const diffResult = max - resultLine_;
                    if (diffResult > 0) {
                        resultViewZones.push(new Spacer(resultLine - 1, diffResult));
                        resultLinesAdded += diffResult;
                    }
                }
            }
        }
        return new MergeEditorViewZones(input1ViewZones, input2ViewZones, baseViewZones, resultViewZones);
    }
}
export class MergeEditorViewZones {
    constructor(input1ViewZones, input2ViewZones, baseViewZones, resultViewZones) {
        this.input1ViewZones = input1ViewZones;
        this.input2ViewZones = input2ViewZones;
        this.baseViewZones = baseViewZones;
        this.resultViewZones = resultViewZones;
    }
}
/**
 * This is an abstract class to create various editor view zones.
 */
export class MergeEditorViewZone {
}
class Spacer extends MergeEditorViewZone {
    constructor(afterLineNumber, heightInLines) {
        super();
        this.afterLineNumber = afterLineNumber;
        this.heightInLines = heightInLines;
    }
    create(viewZoneChangeAccessor, viewZoneIdsToCleanUp, disposableStore) {
        viewZoneIdsToCleanUp.push(viewZoneChangeAccessor.addZone({
            afterLineNumber: this.afterLineNumber,
            heightInLines: this.heightInLines,
            domNode: $('div.diagonal-fill'),
        }));
    }
}
class Placeholder extends MergeEditorViewZone {
    constructor(afterLineNumber, heightPx) {
        super();
        this.afterLineNumber = afterLineNumber;
        this.heightPx = heightPx;
    }
    create(viewZoneChangeAccessor, viewZoneIdsToCleanUp, disposableStore) {
        viewZoneIdsToCleanUp.push(viewZoneChangeAccessor.addZone({
            afterLineNumber: this.afterLineNumber,
            heightInPx: this.heightPx,
            domNode: $('div.conflict-actions-placeholder'),
        }));
    }
}
class CommandViewZone extends MergeEditorViewZone {
    constructor(conflictActionsFactory, lineNumber, items) {
        super();
        this.conflictActionsFactory = conflictActionsFactory;
        this.lineNumber = lineNumber;
        this.items = items;
    }
    create(viewZoneChangeAccessor, viewZoneIdsToCleanUp, disposableStore) {
        disposableStore.add(this.conflictActionsFactory.createWidget(viewZoneChangeAccessor, this.lineNumber, this.items, viewZoneIdsToCleanUp));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1pvbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L3ZpZXdab25lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBT3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUdqRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ2xDLE9BQU8sRUFBRSxhQUFhLEVBQUUsc0JBQXNCLEVBQXdCLE1BQU0sc0JBQXNCLENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBR2xELE1BQU0sT0FBTyxnQkFBZ0I7SUFLNUIsWUFDa0IsWUFBeUIsRUFDekIsWUFBeUIsRUFDekIsWUFBeUI7UUFGekIsaUJBQVksR0FBWixZQUFZLENBQWE7UUFDekIsaUJBQVksR0FBWixZQUFZLENBQWE7UUFDekIsaUJBQVksR0FBWixZQUFZLENBQWE7UUFQMUIsaUNBQTRCLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDNUUsaUNBQTRCLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDNUUsaUNBQTRCLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFNMUYsQ0FBQztJQUVHLGdCQUFnQixDQUN0QixNQUFlLEVBQ2YsU0FBK0IsRUFDL0IsT0FLQztRQUVELElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBO1FBQ3hCLElBQUks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