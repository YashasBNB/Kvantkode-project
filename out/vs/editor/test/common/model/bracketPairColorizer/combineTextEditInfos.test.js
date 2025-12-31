/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { TextEditInfo } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { combineTextEditInfos } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/combineTextEditInfos.js';
import { lengthAdd, lengthToObj, lengthToPosition, positionToLength, toLength, } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
import { Random } from '../../core/random.js';
import { createTextModel } from '../../testTextModel.js';
suite('combineTextEditInfos', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    for (let seed = 0; seed < 50; seed++) {
        test('test' + seed, () => {
            runTest(seed);
        });
    }
});
function runTest(seed) {
    const rng = Random.create(seed);
    const str = 'abcde\nfghij\nklmno\npqrst\n';
    const textModelS0 = createTextModel(str);
    const edits1 = getRandomEditInfos(textModelS0, rng.nextIntRange(1, 4), rng);
    const textModelS1 = createTextModel(textModelS0.getValue());
    textModelS1.applyEdits(edits1.map((e) => toEdit(e)));
    const edits2 = getRandomEditInfos(textModelS1, rng.nextIntRange(1, 4), rng);
    const textModelS2 = createTextModel(textModelS1.getValue());
    textModelS2.applyEdits(edits2.map((e) => toEdit(e)));
    const combinedEdits = combineTextEditInfos(edits1, edits2);
    for (const edit of combinedEdits) {
        const range = Range.fromPositions(lengthToPosition(edit.startOffset), lengthToPosition(lengthAdd(edit.startOffset, edit.newLength)));
        const value = textModelS2.getValueInRange(range);
        if (!value.match(/^(L|C|\n)*$/)) {
            throw new Error('Invalid edit: ' + value);
        }
        textModelS2.applyEdits([
            {
                range,
                text: textModelS0.getValueInRange(Range.fromPositions(lengthToPosition(edit.startOffset), lengthToPosition(edit.endOffset))),
            },
        ]);
    }
    assert.deepStrictEqual(textModelS2.getValue(), textModelS0.getValue());
    textModelS0.dispose();
    textModelS1.dispose();
    textModelS2.dispose();
}
export function getRandomEditInfos(textModel, count, rng, disjoint = false) {
    const edits = [];
    let i = 0;
    for (let j = 0; j < count; j++) {
        edits.push(getRandomEdit(textModel, i, rng));
        i = textModel.getOffsetAt(lengthToPosition(edits[j].endOffset)) + (disjoint ? 1 : 0);
    }
    return edits;
}
function getRandomEdit(textModel, rangeOffsetStart, rng) {
    const textModelLength = textModel.getValueLength();
    const offsetStart = rng.nextIntRange(rangeOffsetStart, textModelLength);
    const offsetEnd = rng.nextIntRange(offsetStart, textModelLength);
    const lineCount = rng.nextIntRange(0, 3);
    const columnCount = rng.nextIntRange(0, 5);
    return new TextEditInfo(positionToLength(textModel.getPositionAt(offsetStart)), positionToLength(textModel.getPositionAt(offsetEnd)), toLength(lineCount, columnCount));
}
function toEdit(editInfo) {
    const l = lengthToObj(editInfo.newLength);
    let text = '';
    for (let i = 0; i < l.lineCount; i++) {
        text += 'LLL\n';
    }
    for (let i = 0; i < l.columnCount; i++) {
        text += 'C';
    }
    return new SingleTextEdit(Range.fromPositions(lengthToPosition(editInfo.startOffset), lengthToPosition(editInfo.endOffset)), text);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tYmluZVRleHRFZGl0SW5mb3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9icmFja2V0UGFpckNvbG9yaXplci9jb21iaW5lVGV4dEVkaXRJbmZvcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpR0FBaUcsQ0FBQTtBQUM5SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2RkFBNkYsQ0FBQTtBQUNsSSxPQUFPLEVBQ04sU0FBUyxFQUNULFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLFFBQVEsR0FDUixNQUFNLCtFQUErRSxDQUFBO0FBRXRGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFeEQsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxHQUFHLEVBQUU7WUFDeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7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