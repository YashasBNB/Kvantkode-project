/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LineSequence {
    constructor(trimmedHash, lines) {
        this.trimmedHash = trimmedHash;
        this.lines = lines;
    }
    getElement(offset) {
        return this.trimmedHash[offset];
    }
    get length() {
        return this.trimmedHash.length;
    }
    getBoundaryScore(length) {
        const indentationBefore = length === 0 ? 0 : getIndentation(this.lines[length - 1]);
        const indentationAfter = length === this.lines.length ? 0 : getIndentation(this.lines[length]);
        return 1000 - (indentationBefore + indentationAfter);
    }
    getText(range) {
        return this.lines.slice(range.start, range.endExclusive).join('\n');
    }
    isStronglyEqual(offset1, offset2) {
        return this.lines[offset1] === this.lines[offset2];
    }
}
function getIndentation(str) {
    let i = 0;
    while (i < str.length &&
        (str.charCodeAt(i) === 32 /* CharCode.Space */ || str.charCodeAt(i) === 9 /* CharCode.Tab */)) {
        i++;
    }
    return i;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVNlcXVlbmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci9saW5lU2VxdWVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxPQUFPLFlBQVk7SUFDeEIsWUFDa0IsV0FBcUIsRUFDckIsS0FBZTtRQURmLGdCQUFXLEdBQVgsV0FBVyxDQUFVO1FBQ3JCLFVBQUssR0FBTCxLQUFLLENBQVU7SUFDOUIsQ0FBQztJQUVKLFVBQVUsQ0FBQyxNQUFjO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQTtJQUMvQixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsTUFBYztRQUM5QixNQUFNLGlCQUFpQixHQUFHLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkYsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM5RixPQUFPLElBQUksR0FBRyxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELE9BQU8sQ0FBQyxLQUFrQjtRQUN6QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsZUFBZSxDQUFDLE9BQWUsRUFBRSxPQUFlO1FBQy9DLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ25ELENBQUM7Q0FDRDtBQUVELFNBQVMsY0FBYyxDQUFDLEdBQVc7SUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1QsT0FDQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU07UUFDZCxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLDRCQUFtQixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHlCQUFpQixDQUFDLEVBQzNFLENBQUM7UUFDRixDQUFDLEVBQUUsQ0FBQTtJQUNKLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQTtBQUNULENBQUMifQ==