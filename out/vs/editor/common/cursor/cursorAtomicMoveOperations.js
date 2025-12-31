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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQXRvbWljTW92ZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JBdG9taWNNb3ZlT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFeEQsTUFBTSxDQUFOLElBQWtCLFNBSWpCO0FBSkQsV0FBa0IsU0FBUztJQUMxQix5Q0FBSSxDQUFBO0lBQ0osMkNBQUssQ0FBQTtJQUNMLCtDQUFPLENBQUE7QUFDUixDQUFDLEVBSmlCLFNBQVMsS0FBVCxTQUFTLFFBSTFCO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUNuQzs7Ozs7T0FLRztJQUNJLE1BQU0sQ0FBQyx1QkFBdUIsQ0FDcEMsV0FBbUIsRUFDbkIsUUFBZ0IsRUFDaEIsT0FBZTtRQUVmLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUE7UUFDckMsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDNUIsSUFBSSx3QkFBd0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUN0RSxDQUFDO1lBQ0QsSUFBSSxhQUFhLEdBQUcsT0FBTyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxtQkFBbUIsR0FBRyxDQUFDLENBQUE7Z0JBQ3ZCLHdCQUF3QixH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