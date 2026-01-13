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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1pvbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvdmlld1pvbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFPcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBR2pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDbEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxzQkFBc0IsRUFBd0IsTUFBTSxzQkFBc0IsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHbEQsTUFBTSxPQUFPLGdCQUFnQjtJQUs1QixZQUNrQixZQUF5QixFQUN6QixZQUF5QixFQUN6QixZQUF5QjtRQUZ6QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUN6QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUN6QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQVAxQixpQ0FBNEIsR0FBRyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM1RSxpQ0FBNEIsR0FBRyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM1RSxpQ0FBNEIsR0FBRyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQU0xRixDQUFDO0lBRUcsZ0JBQWdCLENBQ3RCLE1BQWUsRUFDZixTQUErQixFQUMvQixPQUtDO1FBRUQsSUFBSSxnQkFBZ0IsR0FB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