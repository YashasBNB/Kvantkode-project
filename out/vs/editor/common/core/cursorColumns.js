/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
/**
 * A column in a position is the gap between two adjacent characters. The methods here
 * work with a concept called "visible column". A visible column is a very rough approximation
 * of the horizontal screen position of a column. For example, using a tab size of 4:
 * ```txt
 * |<TAB>|<TAB>|T|ext
 * |     |     | \---- column = 4, visible column = 9
 * |     |     \------ column = 3, visible column = 8
 * |     \------------ column = 2, visible column = 4
 * \------------------ column = 1, visible column = 0
 * ```
 *
 * **NOTE**: Visual columns do not work well for RTL text or variable-width fonts or characters.
 *
 * **NOTE**: These methods work and make sense both on the model and on the view model.
 */
export class CursorColumns {
    static _nextVisibleColumn(codePoint, visibleColumn, tabSize) {
        if (codePoint === 9 /* CharCode.Tab */) {
            return CursorColumns.nextRenderTabStop(visibleColumn, tabSize);
        }
        if (strings.isFullWidthCharacter(codePoint) || strings.isEmojiImprecise(codePoint)) {
            return visibleColumn + 2;
        }
        return visibleColumn + 1;
    }
    /**
     * Returns a visible column from a column.
     * @see {@link CursorColumns}
     */
    static visibleColumnFromColumn(lineContent, column, tabSize) {
        const textLen = Math.min(column - 1, lineContent.length);
        const text = lineContent.substring(0, textLen);
        const iterator = new strings.GraphemeIterator(text);
        let result = 0;
        while (!iterator.eol()) {
            const codePoint = strings.getNextCodePoint(text, textLen, iterator.offset);
            iterator.nextGraphemeLength();
            result = this._nextVisibleColumn(codePoint, result, tabSize);
        }
        return result;
    }
    /**
     * Returns the value to display as "Col" in the status bar.
     * @see {@link CursorColumns}
     */
    static toStatusbarColumn(lineContent, column, tabSize) {
        const text = lineContent.substring(0, Math.min(column - 1, lineContent.length));
        const iterator = new strings.CodePointIterator(text);
        let result = 0;
        while (!iterator.eol()) {
            const codePoint = iterator.nextCodePoint();
            if (codePoint === 9 /* CharCode.Tab */) {
                result = CursorColumns.nextRenderTabStop(result, tabSize);
            }
            else {
                result = result + 1;
            }
        }
        return result + 1;
    }
    /**
     * Returns a column from a visible column.
     * @see {@link CursorColumns}
     */
    static columnFromVisibleColumn(lineContent, visibleColumn, tabSize) {
        if (visibleColumn <= 0) {
            return 1;
        }
        const lineContentLength = lineContent.length;
        const iterator = new strings.GraphemeIterator(lineContent);
        let beforeVisibleColumn = 0;
        let beforeColumn = 1;
        while (!iterator.eol()) {
            const codePoint = strings.getNextCodePoint(lineContent, lineContentLength, iterator.offset);
            iterator.nextGraphemeLength();
            const afterVisibleColumn = this._nextVisibleColumn(codePoint, beforeVisibleColumn, tabSize);
            const afterColumn = iterator.offset + 1;
            if (afterVisibleColumn >= visibleColumn) {
                const beforeDelta = visibleColumn - beforeVisibleColumn;
                const afterDelta = afterVisibleColumn - visibleColumn;
                if (afterDelta < beforeDelta) {
                    return afterColumn;
                }
                else {
                    return beforeColumn;
                }
            }
            beforeVisibleColumn = afterVisibleColumn;
            beforeColumn = afterColumn;
        }
        // walked the entire string
        return lineContentLength + 1;
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static nextRenderTabStop(visibleColumn, tabSize) {
        return visibleColumn + tabSize - (visibleColumn % tabSize);
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static nextIndentTabStop(visibleColumn, indentSize) {
        return CursorColumns.nextRenderTabStop(visibleColumn, indentSize);
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static prevRenderTabStop(column, tabSize) {
        return Math.max(0, column - 1 - ((column - 1) % tabSize));
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static prevIndentTabStop(column, indentSize) {
        return CursorColumns.prevRenderTabStop(column, indentSize);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29sdW1ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9jdXJzb3JDb2x1bW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFFMUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFDakIsTUFBTSxDQUFDLGtCQUFrQixDQUNoQyxTQUFpQixFQUNqQixhQUFxQixFQUNyQixPQUFlO1FBRWYsSUFBSSxTQUFTLHlCQUFpQixFQUFFLENBQUM7WUFDaEMsT0FBTyxhQUFhLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNwRixPQUFPLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDekIsQ0FBQztRQUNELE9BQU8sYUFBYSxHQUFHLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLHVCQUF1QixDQUNwQyxXQUFtQixFQUNuQixNQUFjLEVBQ2QsT0FBZTtRQUVmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFbkQsSUFBSSxNQUFN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