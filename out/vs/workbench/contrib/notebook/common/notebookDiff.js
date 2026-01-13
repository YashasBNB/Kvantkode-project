/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// interface INotebookDiffResult {
// 	cellsDiff: IDiffResult;
// 	metadataChanged: boolean;
// }
export function computeDiff(originalModel, modifiedModel, diffResult) {
    const cellChanges = diffResult.cellsDiff.changes;
    const cellDiffInfo = [];
    let originalCellIndex = 0;
    let modifiedCellIndex = 0;
    let firstChangeIndex = -1;
    for (let i = 0; i < cellChanges.length; i++) {
        const change = cellChanges[i];
        // common cells
        for (let j = 0; j < change.originalStart - originalCellIndex; j++) {
            const originalCell = originalModel.cells[originalCellIndex + j];
            const modifiedCell = modifiedModel.cells[modifiedCellIndex + j];
            if (originalCell.getHashValue() === modifiedCell.getHashValue()) {
                cellDiffInfo.push({
                    originalCellIndex: originalCellIndex + j,
                    modifiedCellIndex: modifiedCellIndex + j,
                    type: 'unchanged',
                });
            }
            else {
                if (firstChangeIndex === -1) {
                    firstChangeIndex = cellDiffInfo.length;
                }
                cellDiffInfo.push({
                    originalCellIndex: originalCellIndex + j,
                    modifiedCellIndex: modifiedCellIndex + j,
                    type: 'modified',
                });
            }
        }
        const modifiedLCS = computeModifiedLCS(change, originalModel, modifiedModel);
        if (modifiedLCS.length && firstChangeIndex === -1) {
            firstChangeIndex = cellDiffInfo.length;
        }
        cellDiffInfo.push(...modifiedLCS);
        originalCellIndex = change.originalStart + change.originalLength;
        modifiedCellIndex = change.modifiedStart + change.modifiedLength;
    }
    for (let i = originalCellIndex; i < originalModel.cells.length; i++) {
        cellDiffInfo.push({
            originalCellIndex: i,
            modifiedCellIndex: i - originalCellIndex + modifiedCellIndex,
            type: 'unchanged',
        });
    }
    return {
        cellDiffInfo,
        firstChangeIndex,
    };
}
function computeModifiedLCS(change, originalModel, modifiedModel) {
    const result = [];
    // modified cells
    const modifiedLen = Math.min(change.originalLength, change.modifiedLength);
    for (let j = 0; j < modifiedLen; j++) {
        const originalCell = originalModel.cells[change.originalStart + j];
        const modifiedCell = modifiedModel.cells[change.modifiedStart + j];
        if (originalCell.cellKind !== modifiedCell.cellKind) {
            result.push({
                originalCellIndex: change.originalStart + j,
                type: 'delete',
            });
            result.push({
                modifiedCellIndex: change.modifiedStart + j,
                type: 'insert',
            });
        }
        else {
            const isTheSame = originalCell.equal(modifiedCell);
            result.push({
                originalCellIndex: change.originalStart + j,
                modifiedCellIndex: change.modifiedStart + j,
                type: isTheSame ? 'unchanged' : 'modified',
            });
        }
    }
    for (let j = modifiedLen; j < change.originalLength; j++) {
        // deletion
        result.push({
            originalCellIndex: change.originalStart + j,
            type: 'delete',
        });
    }
    for (let j = modifiedLen; j < change.modifiedLength; j++) {
        result.push({
            modifiedCellIndex: change.modifiedStart + j,
            type: 'insert',
        });
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tEaWZmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBeUJoRyxrQ0FBa0M7QUFDbEMsMkJBQTJCO0FBQzNCLDZCQUE2QjtBQUM3QixJQUFJO0FBRUosTUFBTSxVQUFVLFdBQVcsQ0FDMUIsYUFBbUQsRUFDbkQsYUFBbUQsRUFDbkQsVUFBK0I7SUFFL0IsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUE7SUFDaEQsTUFBTSxZQUFZLEdBQW1CLEVBQUUsQ0FBQTtJQUN2QyxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtJQUN6QixJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtJQUV6QixJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFBO0lBRXpCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0MsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdCLGVBQWU7UUFFZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLGFBQWEsR0FBRyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25FLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDL0QsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMv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