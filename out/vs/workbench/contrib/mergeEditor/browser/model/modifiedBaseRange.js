/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, equals, numberComparator, tieBreakComparators, } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { splitLines } from '../../../../../base/common/strings.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { LineRangeEdit, RangeEdit } from './editing.js';
import { DetailedLineRangeMapping, MappingAlignment } from './mapping.js';
import { concatArrays } from '../utils.js';
/**
 * Describes modifications in input 1 and input 2 for a specific range in base.
 *
 * The UI offers a mechanism to either apply all changes from input 1 or input 2 or both.
 *
 * Immutable.
 */
export class ModifiedBaseRange {
    static fromDiffs(diffs1, diffs2, baseTextModel, input1TextModel, input2TextModel) {
        const alignments = MappingAlignment.compute(diffs1, diffs2);
        return alignments.map((a) => new ModifiedBaseRange(a.inputRange, baseTextModel, a.output1Range, input1TextModel, a.output1LineMappings, a.output2Range, input2TextModel, a.output2LineMappings));
    }
    constructor(baseRange, baseTextModel, input1Range, input1TextModel, 
    /**
     * From base to input1
     */
    input1Diffs, input2Range, input2TextModel, 
    /**
     * From base to input2
     */
    input2Diffs) {
        this.baseRange = baseRange;
        this.baseTextModel = baseTextModel;
        this.input1Range = input1Range;
        this.input1TextModel = input1TextModel;
        this.input1Diffs = input1Diffs;
        this.input2Range = input2Range;
        this.input2TextModel = input2TextModel;
        this.input2Diffs = input2Diffs;
        this.input1CombinedDiff = DetailedLineRangeMapping.join(this.input1Diffs);
        this.input2CombinedDiff = DetailedLineRangeMapping.join(this.input2Diffs);
        this.isEqualChange = equals(this.input1Diffs, this.input2Diffs, (a, b) => a.getLineEdit().equals(b.getLineEdit()));
        this.smartInput1LineRangeEdit = null;
        this.smartInput2LineRangeEdit = null;
        this.dumbInput1LineRangeEdit = null;
        this.dumbInput2LineRangeEdit = null;
        if (this.input1Diffs.length === 0 && this.input2Diffs.length === 0) {
            throw new BugIndicatingError('must have at least one diff');
        }
    }
    getInputRange(inputNumber) {
        return inputNumber === 1 ? this.input1Range : this.input2Range;
    }
    getInputCombinedDiff(inputNumber) {
        return inputNumber === 1 ? this.input1CombinedDiff : this.input2CombinedDiff;
    }
    getInputDiffs(inputNumber) {
        return inputNumber === 1 ? this.input1Diffs : this.input2Diffs;
    }
    get isConflicting() {
        return this.input1Diffs.length > 0 && this.input2Diffs.length > 0;
    }
    get canBeCombined() {
        return this.smartCombineInputs(1) !== undefined;
    }
    get isOrderRelevant() {
        const input1 = this.smartCombineInputs(1);
        const input2 = this.smartCombineInputs(2);
        if (!input1 || !input2) {
            return false;
        }
        return !input1.equals(input2);
    }
    getEditForBase(state) {
        const diffs = [];
        if (state.includesInput1 && this.input1CombinedDiff) {
            diffs.push({ diff: this.input1CombinedDiff, inputNumber: 1 });
        }
        if (state.includesInput2 && this.input2CombinedDiff) {
            diffs.push({ diff: this.input2CombinedDiff, inputNumber: 2 });
        }
        if (diffs.length === 0) {
            return { edit: undefined, effectiveState: ModifiedBaseRangeState.base };
        }
        if (diffs.length === 1) {
            return {
                edit: diffs[0].diff.getLineEdit(),
                effectiveState: ModifiedBaseRangeState.base.withInputValue(diffs[0].inputNumber, true, false),
            };
        }
        if (state.kind !== ModifiedBaseRangeStateKind.both) {
            throw new BugIndicatingError();
        }
        const smartCombinedEdit = state.smartCombination
            ? this.smartCombineInputs(state.firstInput)
            : this.dumbCombineInputs(state.firstInput);
        if (smartCombinedEdit) {
            return { edit: smartCombinedEdit, effectiveState: state };
        }
        return {
            edit: diffs[getOtherInputNumber(state.firstInput) - 1].diff.getLineEdit(),
            effectiveState: ModifiedBaseRangeState.base.withInputValue(getOtherInputNumber(state.firstInput), true, false),
        };
    }
    smartCombineInputs(firstInput) {
        if (firstInput === 1 && this.smartInput1LineRangeEdit !== null) {
            return this.smartInput1LineRangeEdit;
        }
        else if (firstInput === 2 && this.smartInput2LineRangeEdit !== null) {
            return this.smartInput2LineRangeEdit;
        }
        const combinedDiffs = concatArrays(this.input1Diffs.flatMap((diffs) => diffs.rangeMappings.map((diff) => ({ diff, input: 1 }))), this.input2Diffs.flatMap((diffs) => diffs.rangeMappings.map((diff) => ({ diff, input: 2 })))).sort(tieBreakComparators(compareBy((d) => d.diff.inputRange, Range.compareRangesUsingStarts), compareBy((d) => (d.input === firstInput ? 1 : 2), numberComparator)));
        const sortedEdits = combinedDiffs.map((d) => {
            const sourceTextModel = d.input === 1 ? this.input1TextModel : this.input2TextModel;
            return new RangeEdit(d.diff.inputRange, sourceTextModel.getValueInRange(d.diff.outputRange));
        });
        const result = editsToLineRangeEdit(this.baseRange, sortedEdits, this.baseTextModel);
        if (firstInput === 1) {
            this.smartInput1LineRangeEdit = result;
        }
        else {
            this.smartInput2LineRangeEdit = result;
        }
        return result;
    }
    dumbCombineInputs(firstInput) {
        if (firstInput === 1 && this.dumbInput1LineRangeEdit !== null) {
            return this.dumbInput1LineRangeEdit;
        }
        else if (firstInput === 2 && this.dumbInput2LineRangeEdit !== null) {
            return this.dumbInput2LineRangeEdit;
        }
        let input1Lines = this.input1Range.getLines(this.input1TextModel);
        let input2Lines = this.input2Range.getLines(this.input2TextModel);
        if (firstInput === 2) {
            ;
            [input1Lines, input2Lines] = [input2Lines, input1Lines];
        }
        const result = new LineRangeEdit(this.baseRange, input1Lines.concat(input2Lines));
        if (firstInput === 1) {
            this.dumbInput1LineRangeEdit = result;
        }
        else {
            this.dumbInput2LineRangeEdit = result;
        }
        return result;
    }
}
function editsToLineRangeEdit(range, sortedEdits, textModel) {
    let text = '';
    const startsLineBefore = range.startLineNumber > 1;
    let currentPosition = startsLineBefore
        ? new Position(range.startLineNumber - 1, textModel.getLineMaxColumn(range.startLineNumber - 1))
        : new Position(range.startLineNumber, 1);
    for (const edit of sortedEdits) {
        const diffStart = edit.range.getStartPosition();
        if (!currentPosition.isBeforeOrEqual(diffStart)) {
            return undefined;
        }
        let originalText = textModel.getValueInRange(Range.fromPositions(currentPosition, diffStart));
        if (diffStart.lineNumber > textModel.getLineCount()) {
            // assert diffStart.lineNumber === textModel.getLineCount() + 1
            // getValueInRange doesn't include this virtual line break, as the document ends the line before.
            // endsLineAfter will be false.
            originalText += '\n';
        }
        text += originalText;
        text += edit.newText;
        currentPosition = edit.range.getEndPosition();
    }
    const endsLineAfter = range.endLineNumberExclusive <= textModel.getLineCount();
    const end = endsLineAfter
        ? new Position(range.endLineNumberExclusive, 1)
        : new Position(range.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    const originalText = textModel.getValueInRange(Range.fromPositions(currentPosition, end));
    text += originalText;
    const lines = splitLines(text);
    if (startsLineBefore) {
        if (lines[0] !== '') {
            return undefined;
        }
        lines.shift();
    }
    if (endsLineAfter) {
        if (lines[lines.length - 1] !== '') {
            return undefined;
        }
        lines.pop();
    }
    return new LineRangeEdit(range, lines);
}
export var ModifiedBaseRangeStateKind;
(function (ModifiedBaseRangeStateKind) {
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["base"] = 0] = "base";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["input1"] = 1] = "input1";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["input2"] = 2] = "input2";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["both"] = 3] = "both";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["unrecognized"] = 4] = "unrecognized";
})(ModifiedBaseRangeStateKind || (ModifiedBaseRangeStateKind = {}));
export function getOtherInputNumber(inputNumber) {
    return inputNumber === 1 ? 2 : 1;
}
export class AbstractModifiedBaseRangeState {
    constructor() { }
    get includesInput1() {
        return false;
    }
    get includesInput2() {
        return false;
    }
    includesInput(inputNumber) {
        return inputNumber === 1 ? this.includesInput1 : this.includesInput2;
    }
    isInputIncluded(inputNumber) {
        return inputNumber === 1 ? this.includesInput1 : this.includesInput2;
    }
    toggle(inputNumber) {
        return this.withInputValue(inputNumber, !this.includesInput(inputNumber), true);
    }
    getInput(inputNumber) {
        if (!this.isInputIncluded(inputNumber)) {
            return 0 /* InputState.excluded */;
        }
        return 1 /* InputState.first */;
    }
}
export class ModifiedBaseRangeStateBase extends AbstractModifiedBaseRangeState {
    get kind() {
        return ModifiedBaseRangeStateKind.base;
    }
    toString() {
        return 'base';
    }
    swap() {
        return this;
    }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (inputNumber === 1) {
            return value ? new ModifiedBaseRangeStateInput1() : this;
        }
        else {
            return value ? new ModifiedBaseRangeStateInput2() : this;
        }
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.base;
    }
}
export class ModifiedBaseRangeStateInput1 extends AbstractModifiedBaseRangeState {
    get kind() {
        return ModifiedBaseRangeStateKind.input1;
    }
    get includesInput1() {
        return true;
    }
    toString() {
        return '1✓';
    }
    swap() {
        return new ModifiedBaseRangeStateInput2();
    }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (inputNumber === 1) {
            return value ? this : new ModifiedBaseRangeStateBase();
        }
        else {
            return value
                ? new ModifiedBaseRangeStateBoth(1, smartCombination)
                : new ModifiedBaseRangeStateInput2();
        }
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.input1;
    }
}
export class ModifiedBaseRangeStateInput2 extends AbstractModifiedBaseRangeState {
    get kind() {
        return ModifiedBaseRangeStateKind.input2;
    }
    get includesInput2() {
        return true;
    }
    toString() {
        return '2✓';
    }
    swap() {
        return new ModifiedBaseRangeStateInput1();
    }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (inputNumber === 2) {
            return value ? this : new ModifiedBaseRangeStateBase();
        }
        else {
            return value
                ? new ModifiedBaseRangeStateBoth(2, smartCombination)
                : new ModifiedBaseRangeStateInput2();
        }
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.input2;
    }
}
export class ModifiedBaseRangeStateBoth extends AbstractModifiedBaseRangeState {
    constructor(firstInput, smartCombination) {
        super();
        this.firstInput = firstInput;
        this.smartCombination = smartCombination;
    }
    get kind() {
        return ModifiedBaseRangeStateKind.both;
    }
    get includesInput1() {
        return true;
    }
    get includesInput2() {
        return true;
    }
    toString() {
        return '2✓';
    }
    swap() {
        return new ModifiedBaseRangeStateBoth(getOtherInputNumber(this.firstInput), this.smartCombination);
    }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (value) {
            return this;
        }
        return inputNumber === 1
            ? new ModifiedBaseRangeStateInput2()
            : new ModifiedBaseRangeStateInput1();
    }
    equals(other) {
        return (other.kind === ModifiedBaseRangeStateKind.both &&
            this.firstInput === other.firstInput &&
            this.smartCombination === other.smartCombination);
    }
    getInput(inputNumber) {
        return inputNumber === this.firstInput ? 1 /* InputState.first */ : 2 /* InputState.second */;
    }
}
export class ModifiedBaseRangeStateUnrecognized extends AbstractModifiedBaseRangeState {
    get kind() {
        return ModifiedBaseRangeStateKind.unrecognized;
    }
    toString() {
        return 'unrecognized';
    }
    swap() {
        return this;
    }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (!value) {
            return this;
        }
        return inputNumber === 1
            ? new ModifiedBaseRangeStateInput1()
            : new ModifiedBaseRangeStateInput2();
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.unrecognized;
    }
}
export var ModifiedBaseRangeState;
(function (ModifiedBaseRangeState) {
    ModifiedBaseRangeState.base = new ModifiedBaseRangeStateBase();
    ModifiedBaseRangeState.unrecognized = new ModifiedBaseRangeStateUnrecognized();
})(ModifiedBaseRangeState || (ModifiedBaseRangeState = {}));
export var InputState;
(function (InputState) {
    InputState[InputState["excluded"] = 0] = "excluded";
    InputState[InputState["first"] = 1] = "first";
    InputState[InputState["second"] = 2] = "second";
    InputState[InputState["unrecognized"] = 3] = "unrecognized";
})(InputState || (InputState = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kaWZpZWRCYXNlUmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL21vZGlmaWVkQmFzZVJhbmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixTQUFTLEVBQ1QsTUFBTSxFQUNOLGdCQUFnQixFQUNoQixtQkFBbUIsR0FDbkIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUUxQzs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBQ3RCLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLE1BQTJDLEVBQzNDLE1BQTJDLEVBQzNDLGFBQXlCLEVBQ3pCLGVBQTJCLEVBQzNCLGVBQTJCO1FBRTNCLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDM0QsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUNwQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsSUFBSSxpQkFBaUIsQ0FDcEIsQ0FBQyxDQUFDLFVBQVUs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