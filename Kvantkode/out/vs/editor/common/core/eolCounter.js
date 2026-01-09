/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var StringEOL;
(function (StringEOL) {
    StringEOL[StringEOL["Unknown"] = 0] = "Unknown";
    StringEOL[StringEOL["Invalid"] = 3] = "Invalid";
    StringEOL[StringEOL["LF"] = 1] = "LF";
    StringEOL[StringEOL["CRLF"] = 2] = "CRLF";
})(StringEOL || (StringEOL = {}));
export function countEOL(text) {
    let eolCount = 0;
    let firstLineLength = 0;
    let lastLineStart = 0;
    let eol = 0 /* StringEOL.Unknown */;
    for (let i = 0, len = text.length; i < len; i++) {
        const chr = text.charCodeAt(i);
        if (chr === 13 /* CharCode.CarriageReturn */) {
            if (eolCount === 0) {
                firstLineLength = i;
            }
            eolCount++;
            if (i + 1 < len && text.charCodeAt(i + 1) === 10 /* CharCode.LineFeed */) {
                // \r\n... case
                eol |= 2 /* StringEOL.CRLF */;
                i++; // skip \n
            }
            else {
                // \r... case
                eol |= 3 /* StringEOL.Invalid */;
            }
            lastLineStart = i + 1;
        }
        else if (chr === 10 /* CharCode.LineFeed */) {
            // \n... case
            eol |= 1 /* StringEOL.LF */;
            if (eolCount === 0) {
                firstLineLength = i;
            }
            eolCount++;
            lastLineStart = i + 1;
        }
    }
    if (eolCount === 0) {
        firstLineLength = text.length;
    }
    return [eolCount, firstLineLength, text.length - lastLineStart, eol];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW9sQ291bnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL2VvbENvdW50ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxDQUFOLElBQWtCLFNBS2pCO0FBTEQsV0FBa0IsU0FBUztJQUMxQiwrQ0FBVyxDQUFBO0lBQ1gsK0NBQVcsQ0FBQTtJQUNYLHFDQUFNLENBQUE7SUFDTix5Q0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQUxpQixTQUFTLEtBQVQsU0FBUyxRQUsxQjtBQUVELE1BQU0sVUFBVSxRQUFRLENBQUMsSUFBWTtJQUNwQyxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7SUFDaEIsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFBO0lBQ3ZCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtJQUNyQixJQUFJLEdBQUcsNEJBQStCLENBQUE7SUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ2pELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUIsSUFBSSxHQUFHLHFDQUE0QixFQUFFLENBQUM7WUFDckMsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BCLGVBQWUsR0FBRyxDQUFDLENBQUE7WUFDcEIsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFBO1lBQ1YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsK0JBQXNCLEVBQUUsQ0FBQztnQkFDakUsZUFBZTtnQkFDZixHQUFHLDBCQUFrQixDQUFBO2dCQUNyQixDQUFDLEVBQUUsQ0FBQSxDQUFDLFVBQVU7WUFDZixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsYUFBYTtnQkFDYixHQUFHLDZCQUFxQixDQUFBO1lBQ3pCLENBQUM7WUFDRCxhQUFhLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QixDQUFDO2FBQU0sSUFBSSxHQUFHLCtCQUFzQixFQUFFLENBQUM7WUFDdEMsYUFBYTtZQUNiLEdBQUcsd0JBQWdCLENBQUE7WUFDbkIsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BCLGVBQWUsR0FBRyxDQUFDLENBQUE7WUFDcEIsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFBO1lBQ1YsYUFBYSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNwQixlQUFlLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUM5QixDQUFDO0lBQ0QsT0FBTyxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDckUsQ0FBQyJ9