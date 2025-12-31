/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Returns:
 *  - -1 => the line consists of whitespace
 *  - otherwise => the indent level is returned value
 */
export function computeIndentLevel(line, tabSize) {
    let indent = 0;
    let i = 0;
    const len = line.length;
    while (i < len) {
        const chCode = line.charCodeAt(i);
        if (chCode === 32 /* CharCode.Space */) {
            indent++;
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            indent = indent - (indent % tabSize) + tabSize;
        }
        else {
            break;
        }
        i++;
    }
    if (i === len) {
        return -1; // line only consists of whitespace
    }
    return indent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsSUFBWSxFQUFFLE9BQWU7SUFDL0QsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUV2QixPQUFPLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNoQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLElBQUksTUFBTSw0QkFBbUIsRUFBRSxDQUFDO1lBQy9CLE1BQU0sRUFBRSxDQUFBO1FBQ1QsQ0FBQzthQUFNLElBQUksTUFBTSx5QkFBaUIsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFBO1FBQy9DLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBSztRQUNOLENBQUM7UUFDRCxDQUFDLEVBQUUsQ0FBQTtJQUNKLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxDQUFDLENBQUEsQ0FBQyxtQ0FBbUM7SUFDOUMsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyJ9