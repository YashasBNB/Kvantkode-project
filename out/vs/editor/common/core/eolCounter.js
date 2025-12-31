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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW9sQ291bnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9lb2xDb3VudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sQ0FBTixJQUFrQixTQUtqQjtBQUxELFdBQWtCLFNBQVM7SUFDMUIsK0NBQVcsQ0FBQTtJQUNYLCtDQUFXLENBQUE7SUFDWCxxQ0FBTSxDQUFBO0lBQ04seUNBQVEsQ0FBQTtBQUNULENBQUMsRUFMaUIsU0FBUyxLQUFULFNBQVMsUUFLMUI7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFDLElBQVk7SUFDcEMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFBO0lBQ2hCLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQTtJQUN2QixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUE7SUFDckIsSUFBSSxHQUFHLDRCQUErQixDQUFBO0lBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNqRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlCLElBQUksR0FBRyxxQ0FBNEIsRUFBRSxDQUFDO1lBQ3JDLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQixlQUFlLEdBQUcsQ0FBQyxDQUFBO1lBQ3BCLENBQUM7WUFDRCxRQUFRLEVBQUUsQ0FBQTtZQUNWLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLCtCQUFzQixFQUFFLENBQUM7Z0JBQ2pFLGVBQWU7Z0JBQ2YsR0FBRywwQkFBa0IsQ0FBQTtnQkFDckIsQ0FBQyxFQUFFLENBQUEsQ0FBQyxVQUFVO1lBQ2YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGFBQWE7Z0JBQ2IsR0FBRyw2QkFBcUIsQ0FBQTtZQUN6QixDQUFDO1lBQ0QsYUFBYSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEIsQ0FBQzthQUFNLElBQUksR0FBRywrQkFBc0IsRUFBRSxDQUFDO1lBQ3RDLGFBQWE7WUFDYixHQUFHLHdCQUFnQixDQUFBO1lBQ25CLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQixlQUFlLEdBQUcsQ0FBQyxDQUFBO1lBQ3BCLENBQUM7WUFDRCxRQUFRLEVBQUUsQ0FBQTtZQUNWLGFBQWEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBQ0QsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDcEIsZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDOUIsQ0FBQztJQUNELE9BQU8sQ0FBQyxRQUFRLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ3JFLENBQUMifQ==