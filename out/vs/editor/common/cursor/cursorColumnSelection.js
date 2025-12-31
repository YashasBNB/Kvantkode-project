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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29sdW1uU2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yQ29sdW1uU2VsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFHTixpQkFBaUIsR0FHakIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXhDLE1BQU0sT0FBTyxlQUFlO0lBQ3BCLE1BQU0sQ0FBQyxZQUFZLENBQ3pCLE1BQTJCLEVBQzNCLEtBQXlCLEVBQ3pCLGNBQXNCLEVBQ3RCLGlCQUF5QixFQUN6QixZQUFvQixFQUNwQixlQUF1QjtRQUV2QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDN0QsTUFBTSxRQUFRLEdBQUcsY0FBYyxHQUFHLFlBQVksQ0FBQTtRQUM5QyxNQUFNLEtBQUssR0FBRyxpQkFBaUIsR0FBRyxlQUFlLENBQUE7UUFDakQsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLEdBQUcsZUFBZSxDQUFBO1FBRWpELE1BQU0sTUFBTSxHQUF3QixFQUFFLENBQUE7UUFFdEMsK0ZBQStGO1FBRS9GLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwQyxNQUFNLFVBQVUsR0FBRyxjQUFjLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV2RCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1lBQ3hGLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQ3BGLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLHVCQUF1QixDQUN4RCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUNyQyxDQUFBO1lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsdUJBQXVCLENBQ3RELEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQ25DLENBQUE7WUFFRCw4SEFBOEg7WUFFOUgsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLGtCQUFrQixHQUFHLGVBQWUsRUFBRSxDQUFDO29CQUMxQyxTQUFRO2dCQUNULENBQUM7Z0JBQ0QsSUFBSSxnQkFBZ0IsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO29CQUMxQyxTQUFRO2dCQUNULENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLGdCQUFnQixHQUFHLGlCQUFpQixFQUFFLENBQUM7b0JBQzFDLFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxJQUFJLGtCQUFrQixHQUFHLGVBQWUsRUFBRSxDQUFDO29CQUMxQyxTQUFRO2dCQUNULENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FDVixJQUFJLGlCQUFpQixDQUNwQixJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMscUNBRTNELENBQUMsRUFDRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQ25DLENBQUMsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLG9FQUFvRTtZQUNwRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sVUFBVSxHQUFHLGNBQWMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2RCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBRXBELE1BQU0sQ0FBQyxJQUFJLENBQ1YsSUFBSSxpQkFBaUIsQ0FDcEIsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLHFDQUV2RCxDQUFDLEVBQ0QsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxFQUNuQyxDQUFDLENBQ0QsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPO1lBQ04sVUFBVSxFQUFFLE1BQU07WUFDbEIsUUFBUSxFQUFFLFFBQVE7WUFDbEIsY0FBYyxFQUFFLGNBQWM7WUFDOUIsZ0JBQWdCLEVBQUUsaUJBQWlCO1lBQ25DLFlBQVksRUFBRSxZQUFZO1lBQzFCLGNBQWMsRUFBRSxlQUFlO1NBQy9CLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGdCQUFnQixDQUM3QixNQUEyQixFQUMzQixLQUF5QixFQUN6QixvQkFBdUM7UUFFdkMsSUFBSSxrQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQTtRQUNoRSxJQUFJLGtCQUFrQixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVCLGtCQUFrQixFQUFFLENBQUE7UUFDckIsQ0FBQztRQUVELE9BQU8sZUFBZSxDQUFDLFlBQVksQ0FDbEMsTUFBTSxFQUNOLEtBQUssRUFDTCxvQkFBb0IsQ0FBQyxrQkFBa0IsRUFDdkMsb0JBQW9CLENBQUMsb0JBQW9CLEVBQ3pDLG9CQUFvQixDQUFDLGdCQUFnQixFQUNyQyxrQkFBa0IsQ0FDbEIsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsaUJBQWlCLENBQzlCLE1BQTJCLEVBQzNCLEtBQXlCLEVBQ3pCLG9CQUF1QztRQUV2QyxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtRQUMzQixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQ2pDLG9CQUFvQixDQUFDLGtCQUFrQixFQUN2QyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FDckMsQ0FBQTtRQUNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDakMsb0JBQW9CLENBQUMsa0JBQWtCLEVBQ3ZDLG9CQUFvQixDQUFDLGdCQUFnQixDQUNyQyxDQUFBO1FBQ0QsS0FBSyxJQUFJLFVBQVUsR0FBRyxpQkFBaUIsRUFBRSxVQUFVLElBQUksaUJBQWlCLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN4RixNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM1RCxNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyx1QkFBdUIsQ0FDN0QsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUMzQyxDQUFBO1lBQ0QsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQzdFLENBQUM7UUFFRCxJQUFJLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDLGtCQUFrQixDQUFBO1FBQ2hFLElBQUksa0JBQWtCLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QyxrQkFBa0IsRUFBRSxDQUFBO1FBQ3JCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQ3ZCLE1BQU0sRUFDTixLQUFLLEVBQ0wsb0JBQW9CLENBQUMsa0JBQWtCLEVBQ3ZDLG9CQUFvQixDQUFDLG9CQUFvQixFQUN6QyxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFDckMsa0JBQWtCLENBQ2xCLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGNBQWMsQ0FDM0IsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsb0JBQXVDLEVBQ3ZDLE9BQWdCO1FBRWhCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLENBQUE7UUFDeEYsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUN2QixNQUFNLEVBQ04sS0FBSyxFQUNMLG9CQUFvQixDQUFDLGtCQUFrQixFQUN2QyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFDekMsZ0JBQWdCLEVBQ2hCLG9CQUFvQixDQUFDLGtCQUFrQixDQUN2QyxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDN0IsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsb0JBQXVDLEVBQ3ZDLE9BQWdCO1FBRWhCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDaEMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUNwQixvQkFBb0IsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQ2xELENBQUE7UUFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQ3ZCLE1BQU0sRUFDTixLQUFLLEVBQ0wsb0JBQW9CLENBQUMsa0JBQWtCLEVBQ3ZDLG9CQUFvQixDQUFDLG9CQUFvQixFQUN6QyxnQkFBZ0IsRUFDaEIsb0JBQW9CLENBQUMsa0JBQWtCLENBQ3ZDLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==