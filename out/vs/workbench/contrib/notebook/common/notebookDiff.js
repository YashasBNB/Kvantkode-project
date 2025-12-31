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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL25vdGVib29rRGlmZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXlCaEcsa0NBQWtDO0FBQ2xDLDJCQUEyQjtBQUMzQiw2QkFBNkI7QUFDN0IsSUFBSTtBQUVKLE1BQU0sVUFBVSxXQUFXLENBQzFCLGFBQW1ELEVBQ25ELGFBQW1ELEVBQ25ELFVBQStCO0lBRS9CLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFBO0lBQ2hELE1BQU0sWUFBWSxHQUFtQixFQUFFLENBQUE7SUFDdkMsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUE7SUFDekIsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUE7SUFFekIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUV6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3QixlQUFlO1FBRWYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQy9ELE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDL0QsSUFBSSxZQUFZLENBQUMsWUFBWSxF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