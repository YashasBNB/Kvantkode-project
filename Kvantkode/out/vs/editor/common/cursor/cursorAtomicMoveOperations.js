/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CursorColumns } from '../core/cursorColumns.js';
export var Direction;
(function (Direction) {
    Direction[Direction["Left"] = 0] = "Left";
    Direction[Direction["Right"] = 1] = "Right";
    Direction[Direction["Nearest"] = 2] = "Nearest";
})(Direction || (Direction = {}));
export class AtomicTabMoveOperations {
    /**
     * Get the visible column at the position. If we get to a non-whitespace character first
     * or past the end of string then return -1.
     *
     * **Note** `position` and the return value are 0-based.
     */
    static whitespaceVisibleColumn(lineContent, position, tabSize) {
        const lineLength = lineContent.length;
        let visibleColumn = 0;
        let prevTabStopPosition = -1;
        let prevTabStopVisibleColumn = -1;
        for (let i = 0; i < lineLength; i++) {
            if (i === position) {
                return [prevTabStopPosition, prevTabStopVisibleColumn, visibleColumn];
            }
            if (visibleColumn % tabSize === 0) {
                prevTabStopPosition = i;
                prevTabStopVisibleColumn = visibleColumn;
            }
            const chCode = lineContent.charCodeAt(i);
            switch (chCode) {
                case 32 /* CharCode.Space */:
                    visibleColumn += 1;
                    break;
                case 9 /* CharCode.Tab */:
                    // Skip to the next multiple of tabSize.
                    visibleColumn = CursorColumns.nextRenderTabStop(visibleColumn, tabSize);
                    break;
                default:
                    return [-1, -1, -1];
            }
        }
        if (position === lineLength) {
            return [prevTabStopPosition, prevTabStopVisibleColumn, visibleColumn];
        }
        return [-1, -1, -1];
    }
    /**
     * Return the position that should result from a move left, right or to the
     * nearest tab, if atomic tabs are enabled. Left and right are used for the
     * arrow key movements, nearest is used for mouse selection. It returns
     * -1 if atomic tabs are not relevant and you should fall back to normal
     * behaviour.
     *
     * **Note**: `position` and the return value are 0-based.
     */
    static atomicPosition(lineContent, position, tabSize, direction) {
        const lineLength = lineContent.length;
        // Get the 0-based visible column corresponding to the position, or return
        // -1 if it is not in the initial whitespace.
        const [prevTabStopPosition, prevTabStopVisibleColumn, visibleColumn] = AtomicTabMoveOperations.whitespaceVisibleColumn(lineContent, position, tabSize);
        if (visibleColumn === -1) {
            return -1;
        }
        // Is the output left or right of the current position. The case for nearest
        // where it is the same as the current position is handled in the switch.
        let left;
        switch (direction) {
            case 0 /* Direction.Left */:
                left = true;
                break;
            case 1 /* Direction.Right */:
                left = false;
                break;
            case 2 /* Direction.Nearest */:
                // The code below assumes the output position is either left or right
                // of the input position. If it is the same, return immediately.
                if (visibleColumn % tabSize === 0) {
                    return position;
                }
                // Go to the nearest indentation.
                left = visibleColumn % tabSize <= tabSize / 2;
                break;
        }
        // If going left, we can just use the info about the last tab stop position and
        // last tab stop visible column that we computed in the first walk over the whitespace.
        if (left) {
            if (prevTabStopPosition === -1) {
                return -1;
            }
            // If the direction is left, we need to keep scanning right to ensure
            // that targetVisibleColumn + tabSize is before non-whitespace.
            // This is so that when we press left at the end of a partial
            // indentation it only goes one character. For example '      foo' with
            // tabSize 4, should jump from position 6 to position 5, not 4.
            let currentVisibleColumn = prevTabStopVisibleColumn;
            for (let i = prevTabStopPosition; i < lineLength; ++i) {
                if (currentVisibleColumn === prevTabStopVisibleColumn + tabSize) {
                    // It is a full indentation.
                    return prevTabStopPosition;
                }
                const chCode = lineContent.charCodeAt(i);
                switch (chCode) {
                    case 32 /* CharCode.Space */:
                        currentVisibleColumn += 1;
                        break;
                    case 9 /* CharCode.Tab */:
                        currentVisibleColumn = CursorColumns.nextRenderTabStop(currentVisibleColumn, tabSize);
                        break;
                    default:
                        return -1;
                }
            }
            if (currentVisibleColumn === prevTabStopVisibleColumn + tabSize) {
                return prevTabStopPosition;
            }
            // It must have been a partial indentation.
            return -1;
        }
        // We are going right.
        const targetVisibleColumn = CursorColumns.nextRenderTabStop(visibleColumn, tabSize);
        // We can just continue from where whitespaceVisibleColumn got to.
        let currentVisibleColumn = visibleColumn;
        for (let i = position; i < lineLength; i++) {
            if (currentVisibleColumn === targetVisibleColumn) {
                return i;
            }
            const chCode = lineContent.charCodeAt(i);
            switch (chCode) {
                case 32 /* CharCode.Space */:
                    currentVisibleColumn += 1;
                    break;
                case 9 /* CharCode.Tab */:
                    currentVisibleColumn = CursorColumns.nextRenderTabStop(currentVisibleColumn, tabSize);
                    break;
                default:
                    return -1;
            }
        }
        // This condition handles when the target column is at the end of the line.
        if (currentVisibleColumn === targetVisibleColumn) {
            return lineLength;
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQXRvbWljTW92ZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvckF0b21pY01vdmVPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV4RCxNQUFNLENBQU4sSUFBa0IsU0FJakI7QUFKRCxXQUFrQixTQUFTO0lBQzFCLHlDQUFJLENBQUE7SUFDSiwyQ0FBSyxDQUFBO0lBQ0wsK0NBQU8sQ0FBQTtBQUNSLENBQUMsRUFKaUIsU0FBUyxLQUFULFNBQVMsUUFJMUI7QUFFRCxNQUFNLE9BQU8sdUJBQXVCO0lBQ25DOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLHVCQUF1QixDQUNwQyxXQUFtQixFQUNuQixRQUFnQixFQUNoQixPQUFlO1FBRWYsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQTtRQUNyQyxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDckIsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM1QixJQUFJLHdCQUF3QixHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3RFLENBQUM7WUFDRCxJQUFJLGFBQWEsR0FBRyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtnQkFDdkIsd0JB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