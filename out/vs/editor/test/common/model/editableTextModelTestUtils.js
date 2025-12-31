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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGFibGVUZXh0TW9kZWxUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvZWRpdGFibGVUZXh0TW9kZWxUZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXJELE1BQU0sVUFBVSw4QkFBOEIsQ0FDN0MsUUFBa0IsRUFDbEIsS0FBNkIsRUFDN0IsUUFBa0IsRUFDbEIsdUJBQWdDLEtBQUs7SUFFckMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXZDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxFQUFFO1FBQzdELHNDQUFzQztRQUN0QyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVsRCx3Q0FBd0M7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUUzRSxrQkFBa0IsRUFBRSxDQUFBO1FBRXBCLDBCQUEwQjtRQUMxQixNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhF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