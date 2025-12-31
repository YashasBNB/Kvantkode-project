/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from './cursorColumns.js';
function _normalizeIndentationFromWhitespace(str, indentSize, insertSpaces) {
    let spacesCnt = 0;
    for (let i = 0; i < str.length; i++) {
        if (str.charAt(i) === '\t') {
            spacesCnt = CursorColumns.nextIndentTabStop(spacesCnt, indentSize);
        }
        else {
            spacesCnt++;
        }
    }
    let result = '';
    if (!insertSpaces) {
        const tabsCnt = Math.floor(spacesCnt / indentSize);
        spacesCnt = spacesCnt % indentSize;
        for (let i = 0; i < tabsCnt; i++) {
            result += '\t';
        }
    }
    for (let i = 0; i < spacesCnt; i++) {
        result += ' ';
    }
    return result;
}
export function normalizeIndentation(str, indentSize, insertSpaces) {
    let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(str);
    if (firstNonWhitespaceIndex === -1) {
        firstNonWhitespaceIndex = str.length;
    }
    return (_normalizeIndentationFromWhitespace(str.substring(0, firstNonWhitespaceIndex), indentSize, insertSpaces) + str.substring(firstNonWhitespaceIndex));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvaW5kZW50YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFbEQsU0FBUyxtQ0FBbUMsQ0FDM0MsR0FBVyxFQUNYLFVBQWtCLEVBQ2xCLFlBQXFCO0lBRXJCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3JDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM1QixTQUFTLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNuRSxDQUFDO2FBQU0sQ0FBQztZQUNQLFNBQVMsRUFBRSxDQUFBO1FBQ1osQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7SUFDZixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUE7UUFDbEQsU0FBUyxHQUFHLFNBQVMsR0FBRyxVQUFVLENBQUE7UUFDbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxJQUFJLENBQUE7UUFDZixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNwQyxNQUFNLElBQUksR0FBRyxDQUFBO0lBQ2QsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsR0FBVyxFQUNYLFVBQWtCLEVBQ2xCLFlBQXFCO0lBRXJCLElBQUksdUJBQXVCLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2xFLElBQUksdUJBQXVCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNwQyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO0lBQ3JDLENBQUM7SUFDRCxPQUFPLENBQ04sbUNBQW1DLENBQ2xDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLEVBQ3pDLFVBQVUsRUFDVixZQUFZLENBQ1osR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQzFDLENBQUE7QUFDRixDQUFDIn0=