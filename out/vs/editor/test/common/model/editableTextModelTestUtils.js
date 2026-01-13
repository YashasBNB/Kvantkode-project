/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Position } from '../../../common/core/position.js';
import { MirrorTextModel } from '../../../common/model/mirrorTextModel.js';
import { createTextModel } from '../testTextModel.js';
export function testApplyEditsWithSyncedModels(original, edits, expected, inputEditsAreInvalid = false) {
    const originalStr = original.join('\n');
    const expectedStr = expected.join('\n');
    assertSyncedModels(originalStr, (model, assertMirrorModels) => {
        // Apply edits & collect inverse edits
        const inverseEdits = model.applyEdits(edits, true);
        // Assert edits produced expected result
        assert.deepStrictEqual(model.getValue(1 /* EndOfLinePreference.LF */), expectedStr);
        assertMirrorModels();
        // Apply the inverse edits
        const inverseInverseEdits = model.applyEdits(inverseEdits, true);
        // Assert the inverse edits brought back model to original state
        assert.deepStrictEqual(model.getValue(1 /* EndOfLinePreference.LF */), originalStr);
        if (!inputEditsAreInvalid) {
            const simplifyEdit = (edit) => {
                return {
                    range: edit.range,
                    text: edit.text,
                    forceMoveMarkers: edit.forceMoveMarkers || false,
                };
            };
            // Assert the inverse of the inverse edits are the original edits
            assert.deepStrictEqual(inverseInverseEdits.map(simplifyEdit), edits.map(simplifyEdit));
        }
        assertMirrorModels();
    });
}
var AssertDocumentLineMappingDirection;
(function (AssertDocumentLineMappingDirection) {
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["OffsetToPosition"] = 0] = "OffsetToPosition";
    AssertDocumentLineMappingDirection[AssertDocumentLineMappingDirection["PositionToOffset"] = 1] = "PositionToOffset";
})(AssertDocumentLineMappingDirection || (AssertDocumentLineMappingDirection = {}));
function assertOneDirectionLineMapping(model, direction, msg) {
    const allText = model.getValue();
    let line = 1, column = 1, previousIsCarriageReturn = false;
    for (let offset = 0; offset <= allText.length; offset++) {
        // The position coordinate system cannot express the position between \r and \n
        const position = new Position(line, column + (previousIsCarriageReturn ? -1 : 0));
        if (direction === 0 /* AssertDocumentLineMappingDirection.OffsetToPosition */) {
            const actualPosition = model.getPositionAt(offset);
            assert.strictEqual(actualPosition.toString(), position.toString(), msg + ' - getPositionAt mismatch for offset ' + offset);
        }
        else {
            // The position coordinate system cannot express the position between \r and \n
            const expectedOffset = offset + (previousIsCarriageReturn ? -1 : 0);
            const actualOffset = model.getOffsetAt(position);
            assert.strictEqual(actualOffset, expectedOffset, msg + ' - getOffsetAt mismatch for position ' + position.toString());
        }
        if (allText.charAt(offset) === '\n') {
            line++;
            column = 1;
        }
        else {
            column++;
        }
        previousIsCarriageReturn = allText.charAt(offset) === '\r';
    }
}
function assertLineMapping(model, msg) {
    assertOneDirectionLineMapping(model, 1 /* AssertDocumentLineMappingDirection.PositionToOffset */, msg);
    assertOneDirectionLineMapping(model, 0 /* AssertDocumentLineMappingDirection.OffsetToPosition */, msg);
}
export function assertSyncedModels(text, callback, setup = null) {
    const model = createTextModel(text);
    model.setEOL(0 /* EndOfLineSequence.LF */);
    assertLineMapping(model, 'model');
    if (setup) {
        setup(model);
        assertLineMapping(model, 'model');
    }
    const mirrorModel2 = new MirrorTextModel(null, model.getLinesContent(), model.getEOL(), model.getVersionId());
    let mirrorModel2PrevVersionId = model.getVersionId();
    const disposable = model.onDidChangeContent((e) => {
        const versionId = e.versionId;
        if (versionId < mirrorModel2PrevVersionId) {
            console.warn('Model version id did not advance between edits (2)');
        }
        mirrorModel2PrevVersionId = versionId;
        mirrorModel2.onEvents(e);
    });
    const assertMirrorModels = () => {
        assertLineMapping(model, 'model');
        assert.strictEqual(mirrorModel2.getText(), model.getValue(), 'mirror model 2 text OK');
        assert.strictEqual(mirrorModel2.version, model.getVersionId(), 'mirror model 2 version OK');
    };
    callback(model, assertMirrorModels);
    disposable.dispose();
    model.dispose();
    mirrorModel2.dispose();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWxUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9lZGl0YWJsZVRleHRNb2RlbFRlc3RVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUcxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFckQsTUFBTSxVQUFVLDhCQUE4QixDQUM3QyxRQUFrQixFQUNsQixLQUE2QixFQUM3QixRQUFrQixFQUNsQix1QkFBZ0MsS0FBSztJQUVyQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFdkMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEVBQUU7UUFDN0Qsc0NBQXNDO1FBQ3RDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWxELHdDQUF3QztRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRTNFLGtCQUFrQixFQUFFLENBQUE7UUFFcEIsMEJBQTBCO1FBQzFCLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVB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