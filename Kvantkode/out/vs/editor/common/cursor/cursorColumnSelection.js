/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SingleCursorState, } from '../cursorCommon.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
export class ColumnSelection {
    static columnSelect(config, model, fromLineNumber, fromVisibleColumn, toLineNumber, toVisibleColumn) {
        const lineCount = Math.abs(toLineNumber - fromLineNumber) + 1;
        const reversed = fromLineNumber > toLineNumber;
        const isRTL = fromVisibleColumn > toVisibleColumn;
        const isLTR = fromVisibleColumn < toVisibleColumn;
        const result = [];
        // console.log(`fromVisibleColumn: ${fromVisibleColumn}, toVisibleColumn: ${toVisibleColumn}`);
        for (let i = 0; i < lineCount; i++) {
            const lineNumber = fromLineNumber + (reversed ? -i : i);
            const startColumn = config.columnFromVisibleColumn(model, lineNumber, fromVisibleColumn);
            const endColumn = config.columnFromVisibleColumn(model, lineNumber, toVisibleColumn);
            const visibleStartColumn = config.visibleColumnFromColumn(model, new Position(lineNumber, startColumn));
            const visibleEndColumn = config.visibleColumnFromColumn(model, new Position(lineNumber, endColumn));
            // console.log(`lineNumber: ${lineNumber}: visibleStartColumn: ${visibleStartColumn}, visibleEndColumn: ${visibleEndColumn}`);
            if (isLTR) {
                if (visibleStartColumn > toVisibleColumn) {
                    continue;
                }
                if (visibleEndColumn < fromVisibleColumn) {
                    continue;
                }
            }
            if (isRTL) {
                if (visibleEndColumn > fromVisibleColumn) {
                    continue;
                }
                if (visibleStartColumn < toVisibleColumn) {
                    continue;
                }
            }
            result.push(new SingleCursorState(new Range(lineNumber, startColumn, lineNumber, startColumn), 0 /* SelectionStartKind.Simple */, 0, new Position(lineNumber, endColumn), 0));
        }
        if (result.length === 0) {
            // We are after all the lines, so add cursor at the end of each line
            for (let i = 0; i < lineCount; i++) {
                const lineNumber = fromLineNumber + (reversed ? -i : i);
                const maxColumn = model.getLineMaxColumn(lineNumber);
                result.push(new SingleCursorState(new Range(lineNumber, maxColumn, lineNumber, maxColumn), 0 /* SelectionStartKind.Simple */, 0, new Position(lineNumber, maxColumn), 0));
            }
        }
        return {
            viewStates: result,
            reversed: reversed,
            fromLineNumber: fromLineNumber,
            fromVisualColumn: fromVisibleColumn,
            toLineNumber: toLineNumber,
            toVisualColumn: toVisibleColumn,
        };
    }
    static columnSelectLeft(config, model, prevColumnSelectData) {
        let toViewVisualColumn = prevColumnSelectData.toViewVisualColumn;
        if (toViewVisualColumn > 0) {
            toViewVisualColumn--;
        }
        return ColumnSelection.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, prevColumnSelectData.toViewLineNumber, toViewVisualColumn);
    }
    static columnSelectRight(config, model, prevColumnSelectData) {
        let maxVisualViewColumn = 0;
        const minViewLineNumber = Math.min(prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.toViewLineNumber);
        const maxViewLineNumber = Math.max(prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.toViewLineNumber);
        for (let lineNumber = minViewLineNumber; lineNumber <= maxViewLineNumber; lineNumber++) {
            const lineMaxViewColumn = model.getLineMaxColumn(lineNumber);
            const lineMaxVisualViewColumn = config.visibleColumnFromColumn(model, new Position(lineNumber, lineMaxViewColumn));
            maxVisualViewColumn = Math.max(maxVisualViewColumn, lineMaxVisualViewColumn);
        }
        let toViewVisualColumn = prevColumnSelectData.toViewVisualColumn;
        if (toViewVisualColumn < maxVisualViewColumn) {
            toViewVisualColumn++;
        }
        return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, prevColumnSelectData.toViewLineNumber, toViewVisualColumn);
    }
    static columnSelectUp(config, model, prevColumnSelectData, isPaged) {
        const linesCount = isPaged ? config.pageSize : 1;
        const toViewLineNumber = Math.max(1, prevColumnSelectData.toViewLineNumber - linesCount);
        return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, toViewLineNumber, prevColumnSelectData.toViewVisualColumn);
    }
    static columnSelectDown(config, model, prevColumnSelectData, isPaged) {
        const linesCount = isPaged ? config.pageSize : 1;
        const toViewLineNumber = Math.min(model.getLineCount(), prevColumnSelectData.toViewLineNumber + linesCount);
        return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, toViewLineNumber, prevColumnSelectData.toViewVisualColumn);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29sdW1uU2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JDb2x1bW5TZWxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLGlCQUFpQixHQUdqQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFeEMsTUFBTSxPQUFPLGVBQWU7SUFDcEIsTUFBTSxDQUFDLFlBQVksQ0FDekIsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsY0FBc0IsRUFDdEIsaUJBQXlCLEVBQ3pCLFlBQW9CLEVBQ3BCLGVBQXVCO1FBRXZCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3RCxNQUFNLFFBQVEsR0FBRyxjQUFjLEdBQUcsWUFBWSxDQUFBO1FBQzlDLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixHQUFHLGVBQWUsQ0FBQTtRQUNqRCxNQUFNLEtBQUssR0FBRyxpQkFBaUIsR0FBRyxlQUFlLENBQUE7UUFFakQsTUFBTSxNQUFNLEdBQXdCLEVBQUUsQ0FBQTtRQUV0QywrRkFBK0Y7UUFFL0YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLGNBQWMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lB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