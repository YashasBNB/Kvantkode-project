/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { setProperty } from '../../../base/common/jsonEdit.js';
export function edit(content, originalPath, value, formattingOptions) {
    const edit = setProperty(content, originalPath, value, formattingOptions)[0];
    if (edit) {
        content =
            content.substring(0, edit.offset) +
                edit.content +
                content.substring(edit.offset + edit.length);
    }
    return content;
}
export function getLineStartOffset(content, eol, atOffset) {
    let lineStartingOffset = atOffset;
    while (lineStartingOffset >= 0) {
        if (content.charAt(lineStartingOffset) === eol.charAt(eol.length - 1)) {
            if (eol.length === 1) {
                return lineStartingOffset + 1;
            }
        }
        lineStartingOffset--;
        if (eol.length === 2) {
            if (lineStartingOffset >= 0 && content.charAt(lineStartingOffset) === eol.charAt(0)) {
                return lineStartingOffset + 2;
            }
        }
    }
    return 0;
}
export function getLineEndOffset(content, eol, atOffset) {
    let lineEndOffset = atOffset;
    while (lineEndOffset >= 0) {
        if (content.charAt(lineEndOffset) === eol.charAt(eol.length - 1)) {
            if (eol.length === 1) {
                return lineEndOffset;
            }
        }
        lineEndOffset++;
        if (eol.length === 2) {
            if (lineEndOffset >= 0 && content.charAt(lineEndOffset) === eol.charAt(1)) {
                return lineEndOffset;
            }
        }
    }
    return content.length - 1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vY29udGVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHOUQsTUFBTSxVQUFVLElBQUksQ0FDbkIsT0FBZSxFQUNmLFlBQXNCLEVBQ3RCLEtBQVUsRUFDVixpQkFBb0M7SUFFcEMsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUUsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNWLE9BQU87WUFDTixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsT0FBTztnQkFDWixPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsT0FBZSxFQUFFLEdBQVcsRUFBRSxRQUFnQjtJQUNoRixJQUFJLGtCQUFrQixHQUFHLFFBQVEsQ0FBQTtJQUNqQyxPQUFPLGtCQUFrQixJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2hDLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsT0FBTyxrQkFBa0IsR0FBRyxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFDRCxrQkFBa0IsRUFBRSxDQUFBO1FBQ3BCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QixJQUFJLGtCQUFrQixJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNyRixPQUFPLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQTtBQUNULENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsT0FBZSxFQUFFLEdBQVcsRUFBRSxRQUFnQjtJQUM5RSxJQUFJLGFBQWEsR0FBRyxRQUFRLENBQUE7SUFDNUIsT0FBTyxhQUFhLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDM0IsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xFLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsT0FBTyxhQUFhLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUM7UUFDRCxhQUFhLEVBQUUsQ0FBQTtRQUNmLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QixJQUFJLGFBQWEsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzNFLE9BQU8sYUFBYSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDMUIsQ0FBQyJ9