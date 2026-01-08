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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tYmluZVRleHRFZGl0SW5mb3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyQ29sb3JpemVyL2NvbWJpbmVUZXh0RWRpdEluZm9zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlHQUFpRyxDQUFBO0FBQzlILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZGQUE2RixDQUFBO0FBQ2xJLE9BQU8sRUFDTixTQUFTLEVBQ1QsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsUUFBUSxHQUNSLE1BQU0sK0VBQStFLENBQUE7QUFFdEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUV4RCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDZCxDQUFDLENBQUMs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