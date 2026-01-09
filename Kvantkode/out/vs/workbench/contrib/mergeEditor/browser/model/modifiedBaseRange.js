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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kaWZpZWRCYXNlUmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbW9kZWwvbW9kaWZpZWRCYXNlUmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLFNBQVMsRUFDVCxNQUFNLEVBQ04sZ0JBQWdCLEVBQ2hCLG1CQUFtQixHQUNuQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRXZELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRTFDOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDdEIsTUFBTSxDQUFDLFNBQVMsQ0FDdEIsTUFBMkMsRUFDM0MsTUFBMkMsRUFDM0MsYUFBeUIsRUFDekIsZUFBMkIsRUFDM0IsZUFBMkI7UUFFM0IsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzRCxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQ3BCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxJQUFJLGlCQUFp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